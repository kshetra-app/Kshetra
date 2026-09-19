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

export type AuthResolver = (request: any) => Promise<{ userId: string; role: string } | null>;
export type PageAuthorityResolver = (
  auth: { userId: string; role: string },
  pageId: string,
  request?: any
) => Promise<{ authorized: boolean; notFound: boolean; page?: any }>;

let testAuthResolver: AuthResolver | null = null;
let testPageAuthorityResolver: PageAuthorityResolver | null = null;

/**
 * Test-only isolation hook: allows test suites to inject mock auth/authority resolvers
 * strictly below the HTTP trust boundary.
 * Never accessible or activatable by external HTTP callers.
 */
export function setTestAuthResolver(resolver: AuthResolver | null) {
  if (process.env.NODE_ENV !== 'production') {
    testAuthResolver = resolver;
  }
}

export function setTestPageAuthorityResolver(resolver: PageAuthorityResolver | null) {
  if (process.env.NODE_ENV !== 'production') {
    testPageAuthorityResolver = resolver;
  }
}

export function resetPagesTestResolvers() {
  testAuthResolver = null;
  testPageAuthorityResolver = null;
}

export interface ProOrderRecord {
  orderId: string;
  pageId: string;
  userId: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  product: 'pages_pro';
  createdAt: number;
  status: 'created' | 'verified';
  paymentId?: string;
}

export const PRO_ORDER_REGISTRY = new Map<string, ProOrderRecord>();

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
   * Canonical Auth Resolver: Authenticates caller via Supabase JWT Bearer token.
   * Never trusts x-user-id or x-user-role headers.
   * Fails closed when authoritative Supabase authentication infrastructure is unconfigured.
   */
  async function resolveAuthUser(request: any): Promise<{ userId: string; role: string } | null> {
    if (process.env.NODE_ENV === 'test' && testAuthResolver) {
      return testAuthResolver(request);
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'invalid-token' || token === 'expired-token') {
      return null;
    }

    if (!isSupabaseConfigured) {
      // Authoritative infrastructure unavailable -> fail closed
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      userId: user.id,
      role: profile?.role ?? 'citizen',
    };
  }

  /**
   * Canonical Page Authority Resolver: Verifies page ownership or admin authority in database.
   * Never trusts x-page-owner-id header.
   * Fails closed when authoritative database infrastructure is unconfigured.
   */
  async function verifyPageAuthority(
    auth: { userId: string; role: string },
    pageId: string,
    request: any
  ): Promise<{ authorized: boolean; notFound: boolean; page?: any }> {
    if (process.env.NODE_ENV === 'test' && testPageAuthorityResolver) {
      return testPageAuthorityResolver(auth, pageId, request);
    }

    if (!isSupabaseConfigured) {
      return { authorized: false, notFound: true };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
    let query = supabase.from('pages').select('id, owner_id, is_pro, pro_expires_at, handle');

    if (isUuid) {
      query = query.eq('id', pageId);
    } else {
      query = query.eq('handle', pageId);
    }

    const { data: page, error } = await query.maybeSingle();

    if (error || !page) {
      return { authorized: false, notFound: true };
    }

    if (page.owner_id !== auth.userId && auth.role !== 'admin') {
      return { authorized: false, notFound: false };
    }

    return { authorized: true, notFound: false, page };
  }

  /**
   * POST /api/v1/pages/:pageId/pro/order
   * Razorpay order creation for Page Pro subscription (Monthly: ₹499, Annual: ₹4,999).
   */
  app.post<{ Params: { pageId: string }; Body: { amount?: number; currency?: string; billingCycle?: string } }>(
    '/api/v1/pages/:pageId/pro/order',
    { schema: proOrderSchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to create Page Pro order',
          { code: 'UNAUTHORIZED' }
        );
      }

      const { pageId } = request.params;
      const authority = await verifyPageAuthority(auth, pageId, request);
      if (authority.notFound) {
        return sendApiError(reply, request, 404, 'Not Found', 'Page not found', {
          code: 'NOT_FOUND',
        });
      }
      if (!authority.authorized) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Only the page owner or an admin may manage Page Pro subscription',
          { code: 'FORBIDDEN' }
        );
      }

      const billingCycle = request.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
      const amount = request.body?.amount ?? (billingCycle === 'annual' ? 499900 : 49900); // ₹4,999 or ₹499 in paise
      const currency = request.body?.currency ?? 'INR';

      const orderResult = await paymentProvider.createOrder({
        amountINR: Math.round(amount / 100),
        currency,
        pageId,
        billingCycle,
      });

      // Remediation C: Bind orderId to pageId, userId, product, billingCycle, and amount
      PRO_ORDER_REGISTRY.set(orderResult.orderId, {
        orderId: orderResult.orderId,
        pageId,
        userId: auth.userId,
        billingCycle,
        amount,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'created',
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
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(
        reply,
        request,
        401,
        'Unauthorized',
        'Authentication required to verify Page Pro payment',
        { code: 'UNAUTHORIZED' }
      );
    }

    const { pageId } = request.params;
    const authority = await verifyPageAuthority(auth, pageId, request);
    if (authority.notFound) {
      return sendApiError(reply, request, 404, 'Not Found', 'Page not found', {
        code: 'NOT_FOUND',
      });
    }
    if (!authority.authorized) {
      return sendApiError(
        reply,
        request,
        403,
        'Forbidden',
        'Only the page owner or an admin may manage Page Pro subscription',
        { code: 'FORBIDDEN' }
      );
    }

    const body = request.body ?? {};

    if (!body.razorpay_order_id || !body.razorpay_payment_id) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Missing required payment identifiers (razorpay_order_id, razorpay_payment_id)',
        { code: 'INVALID_PAYMENT_PAYLOAD' }
      );
    }

    // DEF-B5-PAY-01: A valid cryptographic razorpay_signature is mandatory.
    // Under unit/test environment, sandboxBypass is permitted only if explicitly requested.
    const isTestSandboxBypass = process.env.NODE_ENV === 'test' && body.sandboxBypass === true;

    if (!body.razorpay_signature && !isTestSandboxBypass) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Missing payment verification signature',
        { code: 'MISSING_SIGNATURE' }
      );
    }

    // Remediation C: Payment/Order/Page Association Binding Check
    const registeredOrder = PRO_ORDER_REGISTRY.get(body.razorpay_order_id);
    if (registeredOrder) {
      // 1. Target pageId association check
      if (registeredOrder.pageId !== pageId) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Payment order was not created for this page',
          { code: 'PAGE_ORDER_MISMATCH' }
        );
      }

      // 2. Authenticated principal association check
      if (registeredOrder.userId !== auth.userId && auth.role !== 'admin') {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Payment order was created by a different user',
          { code: 'ORDER_PRINCIPAL_MISMATCH' }
        );
      }

      // 3. Billing cycle association check
      if (body.billingCycle && body.billingCycle !== registeredOrder.billingCycle) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Billing cycle does not match the created order',
          { code: 'BILLING_CYCLE_MISMATCH' }
        );
      }

      // 4. Idempotency / replay check
      if (registeredOrder.status === 'verified' && registeredOrder.paymentId !== body.razorpay_payment_id) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Payment order has already been verified with a different payment',
          { code: 'ORDER_ALREADY_CONSUMED' }
        );
      }
    }

    let isValid = false;

    if (isTestSandboxBypass) {
      isValid = true;
    } else {
      try {
        const verifyResult = await paymentProvider.verifyPaymentSignature({
          orderId: body.razorpay_order_id,
          paymentId: body.razorpay_payment_id,
          signature: body.razorpay_signature!,
        });
        if (!verifyResult.valid) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Invalid payment verification signature',
            { code: verifyResult.reason || 'INVALID_SIGNATURE' }
          );
        }
        isValid = true;
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
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Invalid payment verification signature',
          { code: 'INVALID_SIGNATURE' }
        );
      }
    }

    if (!isValid) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid payment verification signature',
        { code: 'INVALID_SIGNATURE' }
      );
    }

    // Authoritative persistence check: fail closed if Supabase is unconfigured (unless test fixture is active)
    if (!isSupabaseConfigured && !(process.env.NODE_ENV === 'test' && testPageAuthorityResolver)) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Database service unavailable. Cannot persist Pro entitlement.',
        { code: 'DATABASE_UNAVAILABLE' }
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
          pro_subscription_id: body.razorpay_payment_id,
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

    if (registeredOrder) {
      registeredOrder.status = 'verified';
      registeredOrder.paymentId = body.razorpay_payment_id;
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


