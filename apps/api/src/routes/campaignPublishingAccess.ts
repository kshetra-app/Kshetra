import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { supabase } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { RazorpayProvider } from '../providers/razorpayProvider';
import { getFacebookStagingConfig } from '../providers/facebookStagingProvider';

const orders = 'campaign_publishing_orders';
const path = '/api/v1/campaign/campaigns/:campaignId/facebook/access';
const checkout = '/api/v1/campaign/facebook/checkout/:session';
const checkoutLifetimeMs = 30 * 60_000;
type CampaignParams = { Params: { campaignId: string } };
type CheckoutParams = { Params: { session: string } };
type Actor = { userId: string };
type ResolveOwner = (
  request: FastifyRequest<CampaignParams>,
  reply: FastifyReply,
) => Promise<Actor | null>;
type CheckOwner = (campaignId: string, userId: string) => Promise<boolean>;
type Payment = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

const params = {
  type: 'object',
  required: ['campaignId'],
  properties: { campaignId: { type: 'string', format: 'uuid' } },
};
const sessionParams = {
  type: 'object',
  required: ['session'],
  properties: { session: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' } },
};

function reference(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function config() {
  const facebook = getFacebookStagingConfig();
  const id = process.env.CAMPAIGN_PUBLISHING_RAZORPAY_KEY_ID ?? '';
  const secret = process.env.CAMPAIGN_PUBLISHING_RAZORPAY_KEY_SECRET;
  const price = Number(process.env.CAMPAIGN_PUBLISHING_PRICE_PAISE);
  const days = Number(process.env.CAMPAIGN_PUBLISHING_ACCESS_DAYS);
  if (
    !facebook ||
    !id.startsWith('rzp_test_') ||
    !secret ||
    !Number.isInteger(price) ||
    price < 100 ||
    price > 100_000_000 ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 366
  )
    return null;
  return {
    provider: new RazorpayProvider(id, secret),
    price,
    days,
    origin: new URL(facebook.redirectUri).origin,
  };
}

function failure(reply: FastifyReply, request: FastifyRequest, status: number, message: string) {
  return sendApiError(reply, request, status, 'CAMPAIGN_PUBLISHING_ACCESS', message);
}

export async function publishingAccessExpiry(campaignId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(orders)
    .select('access_until')
    .eq('campaign_id', campaignId)
    .not('access_until', 'is', null)
    .order('access_until', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Could not load publishing access.');
  return data?.access_until ?? null;
}

export async function publicationCovered(campaignId: string, at: number) {
  if (process.env.CAMPAIGN_PUBLISHING_REQUIRE_PAID_ACCESS !== 'true') return true;
  const until = await publishingAccessExpiry(campaignId);
  return until !== null && Date.parse(until) > at;
}

async function loadSession(session: string) {
  const { data, error } = await supabase
    .from(orders)
    .select(
      'campaign_id,submitted_by,provider_order_id,amount_paise,access_days,checkout_expires_at,access_until,provider_payment_id',
    )
    .eq('checkout_hash', reference(session))
    .maybeSingle();
  if (error) throw new Error('Could not load checkout.');
  return data;
}

function checkoutPage(
  key: string,
  order: string,
  paise: number,
  accessDays: number,
  nonce: string,
) {
  const options = JSON.stringify({
    key,
    order_id: order,
    amount: paise,
    currency: 'INR',
    name: 'Poligram',
    description: accessDays + ' days of Campaign Publishing access',
  }).replace(/</g, '\\u003c');
  const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    paise / 100,
  );
  return `<!doctype html><html lang="en"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Poligram Campaign Publishing</title>
    <style>body{font:1rem system-ui;margin:48px auto;padding:0 20px;max-width:480px;color:#172019}h1{font-size:1.6rem}button{min-height:44px;padding:8px 20px;background:#163d2c;color:white;border:0;border-radius:8px;font:inherit}</style>
    <main><h1>Campaign Publishing</h1><p>${price} for ${accessDays} days of access.</p>
    <p>Razorpay Test Mode. Use test payment details.</p>
    <button id="pay" type="button">Open Razorpay test checkout</button>
    <p id="result" role="status"></p></main>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script nonce="${nonce}">
      const pay = document.getElementById('pay');
      const result = document.getElementById('result');
      let confirmation;
      pay.onclick = async () => {
        if (confirmation) {
          pay.disabled = true;
          try {
            const verified = await fetch(location.pathname + '/confirm', {
              method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(confirmation)
            });
            if (!verified.ok) throw new Error();
            result.textContent = 'Test payment verified. Return to Poligram and refresh publishing access.';
            pay.hidden = true;
          } catch {
            result.textContent = 'Payment verification is pending. Retry verification here.';
            pay.disabled = false;
          }
          return;
        }
        if (!window.Razorpay) { result.textContent = 'Could not load Razorpay. Refresh to try again.'; return; }
        const instance = new window.Razorpay({
          ...${options},
          handler: response => {
            confirmation = {razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature};
            pay.textContent = 'Verify payment';
            pay.onclick();
          }
        });
        instance.open();
      };
    </script></html>`;
}

export function registerCampaignPublishingAccess(
  app: FastifyInstance,
  owner: ResolveOwner,
  isOwner: CheckOwner,
) {
  app.get<CampaignParams>(path, { schema: { params } }, async (request, reply) => {
    if (!(await owner(request, reply))) return;
    const settings = config();
    if (!settings) return { available: false };
    try {
      return {
        available: true,
        testMode: true,
        amountPaise: settings.price,
        accessDays: settings.days,
        accessUntil: await publishingAccessExpiry(request.params.campaignId),
      };
    } catch {
      return failure(reply, request, 503, 'Could not load publishing access.');
    }
  });

  app.post<CampaignParams>(
    path + '/orders',
    {
      schema: { params },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const actor = await owner(request, reply);
      if (!actor) return;
      const settings = config();
      if (!settings) return failure(reply, request, 503, 'Razorpay test checkout is unavailable.');
      const { campaignId } = request.params;
      const session = randomBytes(32).toString('base64url');
      try {
        const created = await settings.provider.createOrder({
          amountINR: settings.price / 100,
          currency: 'INR',
          receipt: randomUUID(),
          notes: { product: 'campaign_publishing', campaign: campaignId },
        });
        const saved = await supabase.from(orders).insert({
          provider_order_id: created.orderId,
          campaign_id: campaignId,
          submitted_by: actor.userId,
          amount_paise: settings.price,
          access_days: settings.days,
          checkout_hash: reference(session),
          checkout_expires_at: new Date(Date.now() + checkoutLifetimeMs).toISOString(),
        });
        if (saved.error) return failure(reply, request, 503, 'Could not save the checkout order.');
        return { checkoutUrl: settings.origin + checkout.replace(':session', session) };
      } catch {
        return failure(reply, request, 503, 'Razorpay could not create the checkout order.');
      }
    },
  );

  app.get<CheckoutParams>(
    checkout,
    { logLevel: 'silent', schema: { params: sessionParams } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
      const settings = config();
      if (!settings) return failure(reply, request, 503, 'Razorpay test checkout is unavailable.');
      try {
        const order = await loadSession(request.params.session);
        if (
          !order?.campaign_id ||
          !order.submitted_by ||
          !(await isOwner(order.campaign_id, order.submitted_by))
        ) {
          return failure(reply, request, 404, 'Checkout is unavailable.');
        }
        if (order.access_until)
          return reply.type('text/plain').send('Test payment verified. Return to Poligram.');
        if (Date.parse(order.checkout_expires_at) <= Date.now())
          return failure(reply, request, 410, 'Checkout expired.');
        const nonce = randomBytes(18).toString('base64');
      // Razorpay's bank authorization popup must be able to return its result to Checkout.
      reply.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        reply.header(
          'Content-Security-Policy',
          "default-src 'none'; script-src 'nonce-" +
            nonce +
            "' https://checkout.razorpay.com; " +
            "style-src 'unsafe-inline'; frame-src https://*.razorpay.com; connect-src 'self' https://*.razorpay.com; " +
            "img-src data: https://*.razorpay.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        );
        return reply
          .type('text/html; charset=utf-8')
          .send(
            checkoutPage(
              settings.provider.getPublicKey(),
              order.provider_order_id,
              order.amount_paise,
              order.access_days,
              nonce,
            ),
          );
      } catch {
        return failure(reply, request, 503, 'Could not load checkout.');
      }
    },
  );

  app.post<CheckoutParams & { Body: Payment }>(
    checkout + '/confirm',
    {
      logLevel: 'silent',
      schema: {
        params: sessionParams,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
          properties: {
            razorpay_order_id: { type: 'string', pattern: '^order_[A-Za-z0-9]{1,50}$' },
            razorpay_payment_id: { type: 'string', pattern: '^pay_[A-Za-z0-9]{1,50}$' },
            razorpay_signature: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
      const settings = config();
      if (!settings) return failure(reply, request, 503, 'Payment verification is unavailable.');
      try {
        const order = await loadSession(request.params.session);
        if (
          !order?.campaign_id ||
          !order.submitted_by ||
          !(await isOwner(order.campaign_id, order.submitted_by)) ||
          order.provider_order_id !== request.body.razorpay_order_id
        ) {
          return failure(reply, request, 404, 'Checkout order does not match.');
        }
        const verified = await settings.provider.verifyPaymentSignature({
          orderId: order.provider_order_id,
          paymentId: request.body.razorpay_payment_id,
          signature: request.body.razorpay_signature,
          expectedAmountPaise: order.amount_paise,
          expectedCurrency: 'INR',
        });
        if (!verified.valid)
          return failure(reply, request, 422, 'Razorpay has not confirmed this payment.');
        const activated = await supabase.rpc('activate_campaign_publishing_access', {
          p_campaign_id: order.campaign_id,
          p_provider_order_id: order.provider_order_id,
          p_provider_payment_id: request.body.razorpay_payment_id,
          p_amount_paise: order.amount_paise,
        });
        if (activated.error || !activated.data)
          return failure(reply, request, 503, 'Could not activate publishing access.');
        return { accessUntil: activated.data };
      } catch {
        return failure(reply, request, 503, 'Could not verify the payment yet.');
      }
    },
  );
}
