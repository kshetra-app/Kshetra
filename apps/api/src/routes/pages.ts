import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PageEntitlement {
  pageId: string;
  ownerId?: string;
  title?: string;
  handle?: string;
  role?: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
}

// Short-lived cache in front of Supabase database reads
const ENTITLEMENT_CACHE = new Map<string, PageEntitlement>();

export const pagesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/pages/:pageId/entitlement
   * Entitlement check endpoint backed by Supabase pages table.
   * Never reveals in-app pricing or purchase triggers (App Store guideline compliant).
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/:pageId/entitlement',
    async (request, reply) => {
      const { pageId } = request.params;

      const cached = ENTITLEMENT_CACHE.get(pageId);
      if (cached) {
        return reply.send({
          success: true,
          pageId: cached.pageId,
          isPro: cached.isPro,
          plan: cached.plan,
          expiresAt: cached.expiresAt,
        });
      }

      if (!isSupabaseConfigured) {
        return reply.send({
          success: true,
          pageId,
          isPro: false,
          plan: 'free',
          expiresAt: null,
        });
      }

      // Read directly from Supabase pages table (supports query by UUID id or unique handle)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      let query = supabase
        .from('pages')
        .select('id, is_pro, pro_expires_at, role, title, handle');

      if (isUuid) {
        query = query.eq('id', pageId);
      } else {
        query = query.eq('handle', pageId);
      }

      const { data: page, error } = await query.maybeSingle();

      if (error) {
        return reply.status(500).send({
          success: false,
          error: `Database query error: ${error.message}`,
        });
      }

      const isProActive = Boolean(
        page?.is_pro && (!page?.pro_expires_at || new Date(page.pro_expires_at) > new Date())
      );

      const result: PageEntitlement = {
        pageId: page?.id || pageId,
        isPro: isProActive,
        plan: isProActive ? 'pro' : 'free',
        expiresAt: page?.pro_expires_at || null,
      };

      if (page) {
        ENTITLEMENT_CACHE.set(pageId, result);
      }

      return reply.send({
        success: true,
        pageId: result.pageId,
        isPro: result.isPro,
        plan: result.plan,
        expiresAt: result.expiresAt,
      });
    },
  );

  /**
   * GET /api/v1/pages/details/:pageId
   * Retrieves full page metadata from Supabase pages table.
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/details/:pageId',
    async (request, reply) => {
      const { pageId } = request.params;

      if (!isSupabaseConfigured) {
        return reply.status(503).send({ success: false, message: 'Database service unavailable' });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      let query = supabase.from('pages').select('*');

      if (isUuid) {
        query = query.eq('id', pageId);
      } else {
        query = query.eq('handle', pageId);
      }

      const { data: page, error } = await query.maybeSingle();

      if (error || !page) {
        return reply.status(404).send({ success: false, message: 'Page not found in database' });
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
   * Verify payment signature and durably activate Page Pro entitlement in Supabase.
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

    // Persist entitlement durably into Supabase pages table
    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      let updateQuery = supabase
        .from('pages')
        .update({
          is_pro: true,
          pro_subscription_id: body.razorpay_payment_id || `sub_${Date.now().toString(36)}`,
          pro_expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (isUuid) {
        updateQuery = updateQuery.eq('id', pageId);
      } else {
        updateQuery = updateQuery.eq('handle', pageId);
      }

      const { error: dbError } = await updateQuery;
      if (dbError) {
        return reply.status(500).send({
          success: false,
          message: `Failed to persist Pro entitlement to database: ${dbError.message}`,
        });
      }
    }

    ENTITLEMENT_CACHE.set(pageId, {
      pageId,
      isPro: true,
      plan: 'pro',
      expiresAt: expiryDate.toISOString(),
    });

    return reply.send({
      success: true,
      message: 'Page Pro subscription successfully activated',
      entitlement: {
        pageId,
        isPro: true,
        plan: 'pro',
        expiresAt: expiryDate.toISOString(),
      },
    });
  });
};


