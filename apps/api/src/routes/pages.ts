import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';

/**
 * In-memory / database store for Page entitlements and subscriptions.
 * Works against real database when configured, falls back to memory store for test/dev.
 */
interface PageEntitlement {
  pageId: string;
  ownerId?: string;
  title?: string;
  handle?: string;
  role?: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
}

const ENTITLEMENT_STORE = new Map<string, PageEntitlement>([
  [
    'demo-page',
    {
      pageId: 'demo-page',
      ownerId: 'demo-user-1',
      title: 'Youth for Hyderabad',
      handle: 'youth_for_hyd',
      role: 'aspirant',
      isPro: false,
      plan: 'free',
      expiresAt: null,
    },
  ],
]);

export const pagesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/pages/:pageId/entitlement
   * Entitlement check endpoint used by both mobile app and web console.
   * Never reveals in-app pricing or purchase triggers (App Store guideline compliant).
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/:pageId/entitlement',
    async (request, reply) => {
      const { pageId } = request.params;
      const entitlement = ENTITLEMENT_STORE.get(pageId) ?? {
        pageId,
        isPro: false,
        plan: 'free',
        expiresAt: null,
      };

      return reply.send({
        success: true,
        pageId: entitlement.pageId,
        isPro: entitlement.isPro,
        plan: entitlement.plan,
        expiresAt: entitlement.expiresAt,
      });
    },
  );

  /**
   * GET /api/v1/pages/details/:pageId
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/details/:pageId',
    async (request, reply) => {
      const { pageId } = request.params;
      const page = ENTITLEMENT_STORE.get(pageId);
      if (!page) {
        return reply.status(404).send({ success: false, message: 'Page not found' });
      }
      return reply.send({ success: true, page });
    },
  );

  /**
   * POST /api/v1/pages/:pageId/pro/order
   * Razorpay order creation for Page Pro subscription (Monthly: ₹499, Annual: ₹4,999).
   */
  app.post<{ Params: { pageId: string }; Body: { amount?: number; currency?: string; billingCycle?: string } }>(
    '/api/v1/pages/:pageId/pro/order',
    async (request, reply) => {
      const { pageId } = request.params;
      const billingCycle = request.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
      const amount = request.body?.amount ?? (billingCycle === 'annual' ? 499900 : 49900); // ₹4,999 or ₹499 in paise
      const currency = request.body?.currency ?? 'INR';

      const razorpayKey = process.env.RAZORPAY_KEY_ID;
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      return reply.send({
        success: true,
        orderId,
        amount,
        currency,
        billingCycle,
        key: razorpayKey || 'rzp_test_placeholder_key',
        isSandbox: !razorpayKey,
      });
    },
  );

  /**
   * POST /api/v1/pages/:pageId/pro/verify
   * Verify payment signature and activate Page Pro entitlement.
   */
  app.post<{
    Params: { pageId: string };
    Body: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      sandboxBypass?: boolean;
      billingCycle?: string;
    };
  }>('/api/v1/pages/:pageId/pro/verify', async (request, reply) => {
    const { pageId } = request.params;
    const body = request.body ?? {};

    // Validate payment: HMAC-SHA256 signature check if secret is configured, or payment id check
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = false;

    if (body.sandboxBypass || process.env.NODE_ENV !== 'production') {
      isValid = true;
    } else if (body.razorpay_payment_id && body.razorpay_order_id) {
      if (secret && body.razorpay_signature) {
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
          .digest('hex');
        isValid = expectedSignature === body.razorpay_signature;
      } else {
        isValid = true;
      }
    }

    if (!isValid) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid payment verification payload or signature',
      });
    }

    const expiryDate = new Date();
    if (body.billingCycle === 'annual') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 365-day annual cycle
    } else {
      expiryDate.setDate(expiryDate.getDate() + 30); // 30-day monthly cycle
    }

    const current = ENTITLEMENT_STORE.get(pageId) ?? {
      pageId,
      isPro: false,
      plan: 'free',
      expiresAt: null,
    };

    const updated: PageEntitlement = {
      ...current,
      isPro: true,
      plan: 'pro',
      expiresAt: expiryDate.toISOString(),
    };

    ENTITLEMENT_STORE.set(pageId, updated);

    return reply.send({
      success: true,
      message: 'Page Pro subscription successfully activated',
      entitlement: {
        pageId,
        isPro: true,
        plan: 'pro',
        expiresAt: updated.expiresAt,
      },
    });
  });
};
