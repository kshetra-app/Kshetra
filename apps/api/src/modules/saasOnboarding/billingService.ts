/**
 * apps/api/src/modules/saasOnboarding/billingService.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Commercial plan catalog, payment provider checkout, signature verification, and webhook handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SaasBillingPlan,
  SaasBillingCheckoutResponse,
  SaasBillingVerifyResponse,
  SaasTenantTier,
} from '@kshetra/shared';
import { SAAS_TIER_LIMITS, SAAS_TIER_KEY_LIMITS } from '@kshetra/shared';
import { supabase } from '../../lib/supabase';
import { RazorpayProvider } from '../../providers/razorpayProvider';
import type { CheckoutBody, VerifyPaymentBody } from './schemas';

const SAAS_PLANS: SaasBillingPlan[] = [
  {
    id: 'free',
    name: 'Community / Developer',
    tagline: 'Ideal for civic developers, academic researchers, and prototyping.',
    priceINR: 0,
    priceUSD: 0,
    billingCycles: ['monthly'],
    annualDiscountPercentage: 0,
    rateLimits: SAAS_TIER_LIMITS.free,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.free,
    features: [
      'Read-only access to statutory electoral geography (36 States & UTs)',
      'Canonical political parties & organization profiles (107 parties)',
      'Assembly and Parliamentary constituency statutory seat boundaries',
      'Standard burst rate limiting (60 requests per minute)',
      '10,000 monthly request quota',
      'Community issue tracker & documentation support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional / Media / Civic Tech',
    tagline: 'Built for newsrooms, political analysts, campaign analytics, and active civic platforms.',
    priceINR: 4999,
    priceUSD: 59,
    billingCycles: ['monthly', 'annual'],
    annualDiscountPercentage: 17, // ₹49,990/yr instead of ₹59,988
    rateLimits: SAAS_TIER_LIMITS.pro,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.pro,
    isPopular: true,
    features: [
      'Full national electoral geography (543 PCs, 4,123 ACs, statutory mappings)',
      'Canonical persons (9,083) and candidacies (11,298)',
      'Form 26 candidate affidavits & disclosures (4,523 official records)',
      'Constituency demographics & census statistics across all 4,123 ACs',
      'Assam 2008 -> 2023 statutory delimitation succession lineage',
      'Outbound webhook events dispatching with cryptographic HMAC signing',
      'High-throughput burst capacity (600 requests per minute)',
      '500,000 monthly request quota',
      'Priority email & developer technical support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Institutional / Broadcasters',
    tagline: 'Mission-critical scale for television networks, national think tanks, and large organizations.',
    priceINR: 49999,
    priceUSD: 599,
    billingCycles: ['monthly', 'annual'],
    annualDiscountPercentage: 17, // ₹499,990/yr instead of ₹599,988
    rateLimits: SAAS_TIER_LIMITS.enterprise,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.enterprise,
    features: [
      'Everything included in the Professional plan',
      'Governed Delimitation Simulation Engine (Hare-Niemeyer constitutional models)',
      'Real-time Delimitation Watch Engine 8-stage lifecycle feeds',
      'Ultra high-throughput burst capacity (3,000 requests per minute)',
      '10,000,000 monthly request quota',
      'Up to 20 active cryptographic API keys with granular scope segregation',
      'Custom webhook retry tuning, dedicated delivery pools & IP pinning',
      'Dedicated technical account manager & 99.9% uptime SLA',
    ],
  },
];

export class BillingService {
  private paymentProvider: RazorpayProvider;
  private dbClient: any = supabase;

  constructor(paymentProvider?: RazorpayProvider) {
    this.paymentProvider = paymentProvider || new RazorpayProvider();
  }

  setDbClient(client: any): void {
    this.dbClient = client;
  }

  /**
   * Returns public catalog of available tiers, pricing, and features.
   */
  getPlans(): SaasBillingPlan[] {
    return SAAS_PLANS;
  }

  /**
   * Generates a payment order / checkout session for upgrading to Pro or Enterprise.
   */
  async createCheckoutSession(
    tenantId: string,
    params: CheckoutBody,
    client: any = this.dbClient,
  ): Promise<SaasBillingCheckoutResponse> {
    const { targetTier, billingCycle } = params;

    // 1. Fetch Tenant Context
    const { data: tenant, error } = await client
      .from('saas_tenants')
      .select('id, name, slug, tier, status, contact_email')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error(`Tenant not found: ${error?.message || 'Invalid tenant context'}`);
    }

    if (tenant.status !== 'active') {
      const err: any = new Error('Tenant is not active and cannot start a paid checkout.');
      err.statusCode = 403;
      err.code = 'TENANT_NOT_ACTIVE';
      throw err;
    }

    if (tenant.tier === targetTier) {
      const err: any = new Error(`Tenant organization is already subscribed to the '${targetTier}' tier.`);
      err.statusCode = 400;
      err.code = 'ALREADY_SUBSCRIBED';
      throw err;
    }

    // 2. Compute Amount
    let amountINR = 4999;
    if (targetTier === 'pro') {
      amountINR = billingCycle === 'annual' ? 49990 : 4999;
    } else if (targetTier === 'enterprise') {
      amountINR = billingCycle === 'annual' ? 499990 : 49999;
    }

    const expectedAmountPaise = Math.round(amountINR * 100);
    const { data: pendingOrder, error: pendingOrderError } = await client
      .from('saas_billing_orders')
      .select('provider_order_id, target_tier, billing_cycle, amount_paise, currency, provider_key_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'created')
      .maybeSingle();
    if (pendingOrderError) {
      const err: any = new Error('Could not check for an existing SaaS checkout order.');
      err.statusCode = 503;
      err.code = 'BILLING_ORDER_LOOKUP_FAILED';
      throw err;
    }
    if (pendingOrder) {
      const configuredKeyId = this.paymentProvider.getPublicKey();
      if (
        pendingOrder.target_tier !== targetTier ||
        pendingOrder.billing_cycle !== billingCycle ||
        Number(pendingOrder.amount_paise) !== expectedAmountPaise ||
        String(pendingOrder.currency).toUpperCase() !== 'INR' ||
        pendingOrder.provider_key_id !== configuredKeyId
      ) {
        const err: any = new Error('A different checkout order is already pending for this tenant. Complete or resolve it before starting another plan checkout.');
        err.statusCode = 409;
        err.code = 'PENDING_CHECKOUT_EXISTS';
        throw err;
      }

      return {
        orderId: pendingOrder.provider_order_id,
        targetTier,
        billingCycle,
        amountINR,
        amountPaise: expectedAmountPaise,
        currency: 'INR',
        razorpayKeyId: configuredKeyId,
        isSandbox: configuredKeyId.startsWith('rzp_test_'),
        tenantSlug: tenant.slug,
        notes: { tenantId: tenant.id, targetTier, billingCycle },
      };
    }

    // 3. Create Provider Order
    const receipt = `rcpt_${tenant.slug.slice(0, 16)}_${Date.now()}`;
    const orderResult = await this.paymentProvider.createOrder({
      amountINR,
      currency: 'INR',
      billingCycle,
      receipt,
      notes: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        targetTier,
        billingCycle,
      },
    });

    if (
      orderResult.amountPaise !== expectedAmountPaise ||
      orderResult.currency.toUpperCase() !== 'INR'
    ) {
      const err: any = new Error('Payment provider order did not match the configured SaaS plan price.');
      err.statusCode = 502;
      err.code = 'PAYMENT_ORDER_MISMATCH';
      throw err;
    }

    const { data: persistedOrder, error: persistError } = await client.rpc('create_saas_billing_order', {
      p_provider_order_id: orderResult.orderId,
      p_provider_key_id: orderResult.key,
      p_tenant_id: tenant.id,
      p_target_tier: targetTier,
      p_billing_cycle: billingCycle,
      p_amount_paise: expectedAmountPaise,
      p_currency: 'INR',
    });
    if (persistError) {
      const err: any = new Error('Could not persist the trusted SaaS checkout order.');
      err.statusCode = 503;
      err.code = 'BILLING_ORDER_PERSISTENCE_FAILED';
      throw err;
    }
    if (!persistedOrder?.success) {
      const code = persistedOrder?.code || 'BILLING_ORDER_PERSISTENCE_FAILED';
      const err: any = new Error(`Could not create SaaS billing order: ${code}`);
      err.statusCode = code === 'ALREADY_SUBSCRIBED' ? 400 : code === 'TENANT_NOT_FOUND' ? 404 : 409;
      err.code = code;
      throw err;
    }

    return {
      orderId: orderResult.orderId,
      targetTier,
      billingCycle,
      amountINR: orderResult.amountINR,
      amountPaise: orderResult.amountPaise,
      currency: orderResult.currency,
      razorpayKeyId: orderResult.key,
      isSandbox: orderResult.isSandbox,
      tenantSlug: tenant.slug,
      notes: {
        tenantId: tenant.id,
        targetTier,
        billingCycle,
      },
    };
  }

  /**
   * Verifies a payment against a durable server-created order and atomically activates the bound tier.
   */
  async verifyPayment(
    tenantId: string,
    params: VerifyPaymentBody,
    client: any = this.dbClient,
  ): Promise<SaasBillingVerifyResponse> {
    const { orderId, paymentId, signature } = params;

    const { data: order, error: orderError } = await client
      .from('saas_billing_orders')
      .select('provider_order_id, tenant_id, target_tier, billing_cycle, amount_paise, currency, status, provider_payment_id, provider_key_id')
      .eq('provider_order_id', orderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (orderError) {
      const err: any = new Error('Could not read the trusted SaaS billing order.');
      err.statusCode = 503;
      err.code = 'BILLING_ORDER_LOOKUP_FAILED';
      throw err;
    }
    if (!order) {
      const err: any = new Error('SaaS billing order was not found for this tenant.');
      err.statusCode = 404;
      err.code = 'BILLING_ORDER_NOT_FOUND';
      throw err;
    }

    if (order.provider_key_id !== this.paymentProvider.getPublicKey()) {
      const err: any = new Error('Stored billing order belongs to a different payment provider account configuration.');
      err.statusCode = 503;
      err.code = 'BILLING_PROVIDER_ACCOUNT_MISMATCH';
      throw err;
    }

    const expectedAmountPaise = Number(order.amount_paise);
    const expectedCurrency = String(order.currency || '').toUpperCase();
    if (!Number.isSafeInteger(expectedAmountPaise) || expectedAmountPaise <= 0 || !/^[A-Z]{3}$/.test(expectedCurrency)) {
      const err: any = new Error('Stored SaaS billing order has invalid amount or currency data.');
      err.statusCode = 500;
      err.code = 'BILLING_ORDER_DATA_INVALID';
      throw err;
    }

    const verification = await this.paymentProvider.verifyPaymentSignature({
      orderId: order.provider_order_id,
      paymentId,
      signature,
      expectedAmountPaise,
      expectedCurrency,
    });

    if (!verification.valid) {
      const err: any = new Error('Payment could not be confirmed for the stored SaaS billing order.');
      err.statusCode = 400;
      err.code = verification.reason || 'INVALID_PAYMENT';
      throw err;
    }

    const { data: activation, error: activationError } = await client.rpc(
      'verify_and_activate_saas_billing_order',
      {
        p_provider_order_id: order.provider_order_id,
        p_tenant_id: tenantId,
        p_provider_payment_id: paymentId,
      },
    );
    if (activationError) {
      const err: any = new Error('Could not atomically activate the paid SaaS plan.');
      err.statusCode = 503;
      err.code = 'BILLING_ACTIVATION_FAILED';
      throw err;
    }
    if (!activation?.success) {
      const code = activation?.code || 'BILLING_ACTIVATION_FAILED';
      const err: any = new Error(`SaaS plan activation was rejected: ${code}`);
      err.statusCode = code === 'TENANT_NOT_FOUND' || code === 'ORDER_NOT_FOUND'
        ? 404
        : code === 'ORDER_TENANT_MISMATCH' || code === 'TENANT_NOT_ACTIVE'
          ? 403
          : 409;
      err.code = code;
      throw err;
    }

    const currentTier = activation.currentTier as SaasTenantTier;
    return {
      success: true,
      tenantId: activation.tenantId,
      tenantSlug: activation.tenantSlug,
      previousTier: activation.previousTier as SaasTenantTier,
      currentTier,
      subscriptionStatus: 'active',
      activatedAt: activation.activatedAt,
      updatedRateLimits: SAAS_TIER_LIMITS[currentTier],
    };
  }

  /**
   * Handles a signed Razorpay payment.captured event for a stored SaaS billing order.
   */
  async processInboundWebhook(
    rawBody: string | Buffer,
    signature: string,
    payload: any,
    client: any = this.dbClient,
  ) {
    // 1. Verify HMAC Signature
    const isValid = this.paymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      const err: any = new Error('Inbound billing webhook cryptographic signature verification failed');
      err.statusCode = 401;
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      throw err;
    }

    const event = payload?.event || payload?.type;
    const eventData = payload?.payload?.payment?.entity || payload?.data?.object || {};
    if (event !== 'payment.captured') {
      return { status: 'received_unhandled', event };
    }

    const orderId = eventData?.order_id;
    const paymentId = eventData?.id;
    if (typeof orderId !== 'string' || typeof paymentId !== 'string') {
      return { status: 'ignored', reason: 'Captured payment has no provider order or payment ID.' };
    }

    const { data: order, error: orderError } = await client
      .from('saas_billing_orders')
      .select('provider_order_id, tenant_id, target_tier, amount_paise, currency, status')
      .eq('provider_order_id', orderId)
      .maybeSingle();
    if (orderError) {
      const err: any = new Error('Could not read the trusted SaaS billing order for webhook processing.');
      err.statusCode = 503;
      err.code = 'BILLING_ORDER_LOOKUP_FAILED';
      throw err;
    }
    if (!order) {
      return { status: 'ignored', reason: 'Provider order is not a SaaS billing order.' };
    }

    if (
      eventData.status !== 'captured' ||
      eventData.captured !== true ||
      eventData.amount !== Number(order.amount_paise) ||
      String(eventData.currency || '').toUpperCase() !== String(order.currency).toUpperCase()
    ) {
      const err: any = new Error('Captured payment does not match the stored SaaS billing order.');
      err.statusCode = 400;
      err.code = 'WEBHOOK_PAYMENT_MISMATCH';
      throw err;
    }

    const { data: activation, error: activationError } = await client.rpc(
      'verify_and_activate_saas_billing_order',
      {
        p_provider_order_id: order.provider_order_id,
        p_tenant_id: order.tenant_id,
        p_provider_payment_id: paymentId,
      },
    );
    if (activationError) {
      const err: any = new Error('Could not atomically activate the paid SaaS plan from webhook.');
      err.statusCode = 503;
      err.code = 'BILLING_ACTIVATION_FAILED';
      throw err;
    }
    if (!activation?.success) {
      const code = activation?.code || 'BILLING_ACTIVATION_FAILED';
      const err: any = new Error(`SaaS webhook activation was rejected: ${code}`);
      err.statusCode = 409;
      err.code = code;
      throw err;
    }

    return {
      status: 'processed',
      event,
      tenantId: activation.tenantId,
      tier: activation.currentTier,
    };
  }
}

export const billingService = new BillingService();
