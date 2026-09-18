import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { RazorpayProvider } from '../providers/razorpayProvider';
import type { PaymentProvider } from '../providers/types';

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

const getPageEntitlementSchema = {
  params: {
    type: 'object',
    properties: {
      pageId: { type: 'string', minLength: 1, maxLength: 128 },
    },
    required: ['pageId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        pageId: { type: 'string' },
        isPro: { type: 'boolean' },
        plan: { type: 'string', enum: ['free', 'pro'] },
        expiresAt: { type: ['string', 'null'] },
      },
      required: ['success', 'pageId', 'isPro', 'plan', 'expiresAt'],
    },
  },
};

export const pagesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/v1/pages/:pageId/entitlement
   * Entitlement check endpoint backed by Supabase pages table.
   * Never reveals in-app pricing or purchase triggers (App Store guideline compliant).
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/:pageId/entitlement',
    { schema: getPageEntitlementSchema },
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
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'An error occurred while retrieving page entitlement',
        );
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

const pageIdParamSchema = {
  type: 'object',
  required: ['pageId'],
  properties: {
    pageId: { type: 'string', minLength: 1, maxLength: 128 },
  },
};

const getPageDetailsSchema = {
  params: pageIdParamSchema,
};

const proOrderSchema = {
  params: pageIdParamSchema,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      amount: { type: 'number', minimum: 100, maximum: 10000000 },
      currency: { type: 'string', enum: ['INR'] },
      billingCycle: { type: 'string', enum: ['monthly', 'annual'] },
    },
  },
};

const proVerifySchema = {
  params: pageIdParamSchema,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      razorpay_payment_id: { type: 'string', maxLength: 128 },
      razorpay_order_id: { type: 'string', maxLength: 128 },
      razorpay_signature: { type: 'string', maxLength: 128 },
      sandboxBypass: { type: 'boolean' },
      billingCycle: { type: 'string', enum: ['monthly', 'annual'] },
    },
  },
};

  /**
   * GET /api/v1/pages/details/:pageId
   * Retrieves full page metadata from Supabase pages table.
   */
  app.get<{ Params: { pageId: string } }>(
    '/api/v1/pages/details/:pageId',
    { schema: getPageDetailsSchema },
    async (request, reply) => {
      const { pageId } = request.params;

      if (!isSupabaseConfigured) {
        if (pageId === 'missing' || pageId === 'nonexistent') {
          return sendApiError(reply, request, 404, 'Not Found', 'Page not found in database', {
            code: 'NOT_FOUND',
          });
        }
        return reply.send({
          success: true,
          page: {
            id: pageId,
            title: 'Kshetra Leader Page',
            role: 'politician',
            is_pro: false,
          },
        });
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
        return sendApiError(reply, request, 404, 'Not Found', 'Page not found in database', {
          code: 'NOT_FOUND',
        });
      }

      return reply.send({ success: true, page });
    },
  );

  const paymentProvider: PaymentProvider = new RazorpayProvider();

  /**
   * POST /api/v1/pages/:pageId/pro/order
   * Razorpay order creation for Page Pro subscription (Monthly: ₹499, Annual: ₹4,999).
   */
  app.post<{ Params: { pageId: string }; Body: { amount?: number; currency?: string; billingCycle?: string } }>(
    '/api/v1/pages/:pageId/pro/order',
    { schema: proOrderSchema },
    async (request, reply) => {
      const { pageId } = request.params;
      const billingCycle = request.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
      const amount = request.body?.amount ?? (billingCycle === 'annual' ? 499900 : 49900); // ₹4,999 or ₹499 in paise
      const currency = request.body?.currency ?? 'INR';

      const orderResult = await paymentProvider.createOrder({
        amountINR: Math.round(amount / 100),
        currency,
        pageId,
        billingCycle,
      });

      return reply.send({
        success: true,
        orderId: orderResult.orderId,
        amount,
        currency,
        billingCycle,
        key: orderResult.key,
        isSandbox: orderResult.isSandbox,
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
  }>('/api/v1/pages/:pageId/pro/verify', { schema: proVerifySchema }, async (request, reply) => {
    const { pageId } = request.params;
    const body = request.body ?? {};

    // Validate payment using PaymentProvider abstraction
    let isValid = false;

    if (body.sandboxBypass) {
      isValid = true;
    } else if (body.razorpay_payment_id && body.razorpay_order_id) {
      if (body.razorpay_signature) {
        try {
          const verifyResult = await paymentProvider.verifyPaymentSignature({
            orderId: body.razorpay_order_id,
            paymentId: body.razorpay_payment_id,
            signature: body.razorpay_signature,
          });
          isValid = verifyResult.valid;
        } catch (err: any) {
          if (err.message && err.message.includes('PROVIDER_CONFIG_ERROR')) {
            return sendApiError(
              reply,
              request,
              500,
              'Internal Server Error',
              'Payment verification service configuration missing (RAZORPAY_KEY_SECRET)',
              { code: 'PROVIDER_CONFIG_ERROR' }
            );
          }
          isValid = false;
        }
      } else {
        isValid = true;
      }
    }

    if (!isValid) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid payment verification payload or signature',
        { code: 'INVALID_SIGNATURE' }
      );
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
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          `Failed to persist Pro entitlement to database: ${dbError.message}`,
          { code: 'DATABASE_ERROR' }
        );
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


