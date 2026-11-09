import { SAAS_TIER_LIMITS } from '@kshetra/shared';
import Fastify from 'fastify';
import { BillingService, billingService } from '../modules/saasOnboarding/billingService';
import { saasOnboardingRoutes } from '../modules/saasOnboarding/routes';

const tenantId = 'a6a7cb93-3354-4e10-8f81-931e063f8aac';
const orderId = 'order_saas_pro_monthly';
const paymentId = 'pay_saas_pro_monthly';

function billingOrder(overrides: Record<string, unknown> = {}) {
  return {
    provider_order_id: orderId,
    provider_key_id: 'rzp_test_key',
    tenant_id: tenantId,
    target_tier: 'pro',
    billing_cycle: 'monthly',
    amount_paise: 499900,
    currency: 'INR',
    status: 'created',
    provider_payment_id: null,
    ...overrides,
  };
}

function makeClient(options: {
  tenant?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
  rpcResult?: Record<string, unknown>;
} = {}) {
  const order = options.order === null ? null : options.order || billingOrder();
  const rpc = jest.fn().mockResolvedValue({
    data: options.rpcResult || {
      success: true,
      tenantId,
      tenantSlug: 'civic-lab',
      previousTier: 'free',
      currentTier: 'pro',
      subscriptionStatus: 'active',
      activatedAt: '2026-11-09T10:00:00.000Z',
    },
    error: null,
  });
  const from = jest.fn((table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: table === 'saas_billing_orders' ? order : null,
            error: null,
          }),
        })),
        maybeSingle: jest.fn().mockResolvedValue({
          data: table === 'saas_billing_orders' ? order : options.tenant ?? null,
          error: null,
        }),
        single: jest.fn().mockResolvedValue({ data: options.tenant ?? null, error: null }),
      })),
    })),
  }));
  return { from, rpc };
}

describe('SaaS billing order binding', () => {
  it('creates the provider order and persists its server-selected tier, cycle, amount, and tenant', async () => {
    const client = makeClient({
      order: null,
      tenant: {
        id: tenantId,
        name: 'Civic Lab',
        slug: 'civic-lab',
        tier: 'free',
        status: 'active',
      },
    });
    const provider = {
      getPublicKey: jest.fn().mockReturnValue('rzp_test_key'),
      createOrder: jest.fn().mockResolvedValue({
        orderId,
        amountINR: 4999,
        amountPaise: 499900,
        currency: 'INR',
        key: 'rzp_test_key',
        isSandbox: true,
      }),
    };
    const service = new BillingService(provider as any);

    const result = await service.createCheckoutSession(
      tenantId,
      { targetTier: 'pro', billingCycle: 'monthly' },
      client,
    );

    expect(result.orderId).toBe(orderId);
    expect(client.rpc).toHaveBeenCalledWith('create_saas_billing_order', {
      p_provider_order_id: orderId,
      p_provider_key_id: 'rzp_test_key',
      p_tenant_id: tenantId,
      p_target_tier: 'pro',
      p_billing_cycle: 'monthly',
      p_amount_paise: 499900,
      p_currency: 'INR',
    });
  });

  it('uses stored order terms and ignores conflicting client plan fields during verification', async () => {
    const client = makeClient();
    const provider = {
      getPublicKey: jest.fn().mockReturnValue('rzp_test_key'),
      verifyPaymentSignature: jest.fn().mockResolvedValue({ valid: true, orderId, paymentId }),
    };
    const service = new BillingService(provider as any);

    const result = await service.verifyPayment(tenantId, {
      orderId,
      paymentId,
      signature: 'verified-signature',
      targetTier: 'enterprise',
      billingCycle: 'annual',
    } as any, client);

    expect(provider.verifyPaymentSignature).toHaveBeenCalledWith({
      orderId,
      paymentId,
      signature: 'verified-signature',
      expectedAmountPaise: 499900,
      expectedCurrency: 'INR',
    });
    expect(client.rpc).toHaveBeenCalledWith('verify_and_activate_saas_billing_order', {
      p_provider_order_id: orderId,
      p_tenant_id: tenantId,
      p_provider_payment_id: paymentId,
    });
    expect(result.currentTier).toBe('pro');
    expect(result.updatedRateLimits).toEqual(SAAS_TIER_LIMITS.pro);
  });

  it('rejects an order that is not durably bound to the authenticated tenant before provider verification', async () => {
    const client = makeClient({ order: null });
    const provider = {
      verifyPaymentSignature: jest.fn(),
    };
    const service = new BillingService(provider as any);

    await expect(service.verifyPayment(tenantId, {
      orderId,
      paymentId,
      signature: 'signature',
    }, client)).rejects.toMatchObject({
      statusCode: 404,
      code: 'BILLING_ORDER_NOT_FOUND',
    });

    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('reuses an exact pending checkout instead of creating a second payable provider order', async () => {
    const client = makeClient({
      tenant: {
        id: tenantId,
        name: 'Civic Lab',
        slug: 'civic-lab',
        tier: 'free',
        status: 'active',
      },
    });
    const provider = {
      getPublicKey: jest.fn().mockReturnValue('rzp_test_key'),
      createOrder: jest.fn(),
    };
    const service = new BillingService(provider as any);

    const result = await service.createCheckoutSession(
      tenantId,
      { targetTier: 'pro', billingCycle: 'monthly' },
      client,
    );

    expect(result.orderId).toBe(orderId);
    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('activates from a signed captured-payment webhook only through the bound-order RPC', async () => {
    const client = makeClient();
    const provider = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    const service = new BillingService(provider as any);

    const result = await service.processInboundWebhook(
      JSON.stringify({ event: 'payment.captured' }),
      'valid-webhook-signature',
      {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: 499900,
              currency: 'INR',
              status: 'captured',
              captured: true,
            },
          },
        },
      },
      client,
    );

    expect(result).toMatchObject({ status: 'processed', tenantId, tier: 'pro' });
    expect(client.rpc).toHaveBeenCalledWith('verify_and_activate_saas_billing_order', {
      p_provider_order_id: orderId,
      p_tenant_id: tenantId,
      p_provider_payment_id: paymentId,
    });
  });

  it('does not activate a plan from an unbound captured-payment webhook', async () => {
    const client = makeClient({ order: null });
    const provider = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    const service = new BillingService(provider as any);

    const result = await service.processInboundWebhook(
      JSON.stringify({ event: 'payment.captured' }),
      'valid-webhook-signature',
      {
        event: 'payment.captured',
        payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 499900, currency: 'INR', status: 'captured', captured: true } } },
      },
      client,
    );

    expect(result.status).toBe('ignored');
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('passes the exact received bytes to webhook signature verification', async () => {
    const app = Fastify();
    await app.register(saasOnboardingRoutes);
    await app.ready();
    const rawPayload = '{  "event" : "payment.captured", "payload" : {} }\r\n';
    const processSpy = jest.spyOn(billingService, 'processInboundWebhook').mockResolvedValueOnce({
      status: 'ignored',
      reason: 'test payload',
    } as any);

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/billing/webhook',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': 'test-signature',
        },
        payload: rawPayload,
      });

      expect(response.statusCode).toBe(200);
      const [receivedRawBody, receivedSignature] = processSpy.mock.calls[0];
      expect(Buffer.isBuffer(receivedRawBody)).toBe(true);
      expect((receivedRawBody as Buffer).toString('utf8')).toBe(rawPayload);
      expect(receivedSignature).toBe('test-signature');
    } finally {
      processSpy.mockRestore();
      await app.close();
    }
  });
});
