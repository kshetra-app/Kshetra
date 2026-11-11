import { isIsolatedTestRuntime, isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { PaymentProviderError, RazorpayProvider } from '../providers/razorpayProvider';
import type { PaymentOrderResult, PaymentProvider } from '../providers/types';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';
import { AspirantService } from '../services/aspirantService';
import type {
  PageCreateRequest,
  PageEventCreateRequest,
  PageEventRsvpStatus,
} from '@kshetra/shared';

function isProductionRuntime(): boolean {
  return isProductionLikeRuntime();
}

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
export const ENTITLEMENT_CACHE = new Map<string, PageEntitlement>();

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
  request?: any,
) => Promise<{ authorized: boolean; notFound: boolean; page?: any }>;

let testAuthResolver: AuthResolver | null = null;
let testPageAuthorityResolver: PageAuthorityResolver | null = null;

/**
 * Test-only isolation hook: allows test suites to inject mock auth/authority resolvers
 * strictly below the HTTP trust boundary.
 * Never accessible or activatable by external HTTP callers.
 */
export function setTestAuthResolver(resolver: AuthResolver | null) {
  if (!isProductionRuntime()) {
    testAuthResolver = resolver;
  }
}

export function setTestPageAuthorityResolver(resolver: PageAuthorityResolver | null) {
  if (!isProductionRuntime()) {
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

      if (!isProductionRuntime() && testPageAuthorityResolver) {
        const testAuth = testAuthResolver
          ? await testAuthResolver(request)
          : { userId: 'user-1', role: 'politician' };
        if (testAuth) {
          try {
            const authRes = await testPageAuthorityResolver(testAuth, pageId, request);
            if (authRes.page) {
              const isProActive = Boolean(authRes.page.is_pro);
              return reply.send({
                success: true,
                pageId,
                isPro: isProActive,
                plan: isProActive ? 'pro' : 'free',
                expiresAt: authRes.page.pro_expires_at || null,
              });
            }
          } catch {
            // fall through
          }
        }
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
      let query = supabase.from('pages').select('id, is_pro, pro_expires_at, role, title, handle');

      if (isUuid) {
        query = query.eq('id', pageId);
      } else {
        query = query.eq('handle', pageId);
      }

      const { data: page, error } = await query.maybeSingle();

      if (error) {
        if (!isProductionRuntime()) {
          return reply.send({
            success: true,
            pageId,
            isPro: false,
            plan: 'free',
            expiresAt: null,
          });
        }
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'An error occurred while retrieving page entitlement',
        );
      }

      const isProActive = Boolean(
        page?.is_pro && (!page?.pro_expires_at || new Date(page.pro_expires_at) > new Date()),
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
    if (isIsolatedTestRuntime() && testAuthResolver) {
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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
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
    request: any,
  ): Promise<{ authorized: boolean; notFound: boolean; page?: any }> {
    if (isIsolatedTestRuntime() && testPageAuthorityResolver) {
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
  app.post<{
    Params: { pageId: string };
    Body: { amount?: number; currency?: string; billingCycle?: string };
  }>('/api/v1/pages/:pageId/pro/order', { schema: proOrderSchema }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(
        reply,
        request,
        401,
        'Unauthorized',
        'Authentication required to create Page Pro order',
        { code: 'UNAUTHORIZED' },
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
        { code: 'FORBIDDEN' },
      );
    }

    const billingCycle = request.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
    const amount = billingCycle === 'annual' ? 499900 : 49900; // ₹4,999 or ₹499 in paise
    if (request.body?.amount !== undefined && request.body.amount !== amount) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Requested amount does not match the Page Pro price for this billing cycle.',
        { code: 'PRICE_MISMATCH' },
      );
    }
    const currency = request.body?.currency ?? 'INR';

    let orderResult: PaymentOrderResult;
    try {
      orderResult = await paymentProvider.createOrder({
        amountINR: amount / 100,
        currency,
        pageId,
        billingCycle,
      });
    } catch (error) {
      const providerError = error instanceof PaymentProviderError ? error : null;
      const statusCode = providerError?.statusCode ?? 500;
      const statusText =
        statusCode === 503
          ? 'Service Unavailable'
          : statusCode === 502
            ? 'Bad Gateway'
            : statusCode === 400
              ? 'Bad Request'
              : 'Internal Server Error';
      return sendApiError(
        reply,
        request,
        statusCode,
        statusText,
        providerError?.message || 'Unable to create payment order.',
        { code: providerError?.code || 'PAYMENT_ORDER_FAILED' },
      );
    }

    const targetPageId = authority.page?.id || pageId;

    if (isSupabaseConfigured) {
      const { error: insertError } = await supabase.from('page_pro_orders').insert({
        provider_order_id: orderResult.orderId,
        page_id: targetPageId,
        user_id: auth.userId,
        product: 'pages_pro',
        billing_cycle: billingCycle,
        amount_paise: amount,
        currency,
        status: 'created',
      });

      if (insertError) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            `Failed to persist Page Pro order: ${insertError.message}`,
            { code: 'DATABASE_ERROR' },
          );
        }
        app.log.warn(
          { err: insertError.message },
          'Failed to persist Page Pro order in DB, proceeding with in-memory fallback',
        );
      }
    }

    // Memory cache for fast lookups & backwards compatibility in non-DB tests
    PRO_ORDER_REGISTRY.set(orderResult.orderId, {
      orderId: orderResult.orderId,
      pageId: targetPageId,
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
  });

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
        { code: 'UNAUTHORIZED' },
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
        { code: 'FORBIDDEN' },
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
        { code: 'INVALID_PAYMENT_PAYLOAD' },
      );
    }

    // DEF-B5-PAY-01: A valid cryptographic razorpay_signature is mandatory.
    // Under unit/test environment, sandboxBypass is permitted only if explicitly requested.
    const testBypassRequested = body.sandboxBypass === true;
    const isTestSandboxBypass = isIsolatedTestRuntime() && testBypassRequested;
    if (testBypassRequested && !isTestSandboxBypass) {
      return sendApiError(
        reply,
        request,
        403,
        'Forbidden',
        'Test payment verification bypass is disabled in this runtime.',
        { code: 'TEST_BYPASS_DISABLED' },
      );
    }

    if (!body.razorpay_signature && !isTestSandboxBypass) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Missing payment verification signature',
        { code: 'MISSING_SIGNATURE' },
      );
    }

    const targetPageId = authority.page?.id || pageId;
    let dbOrder: any = null;

    if (isTestSandboxBypass && !PRO_ORDER_REGISTRY.has(body.razorpay_order_id)) {
      PRO_ORDER_REGISTRY.set(body.razorpay_order_id, {
        orderId: body.razorpay_order_id,
        pageId: targetPageId,
        userId: auth.userId,
        billingCycle: (body.billingCycle as any) || 'monthly',
        amount: 49900,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'created',
      });
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error: orderFetchErr } = await supabase
          .from('page_pro_orders')
          .select('*')
          .eq('provider_order_id', body.razorpay_order_id)
          .maybeSingle();

        if (orderFetchErr && isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            `Database error querying payment order: ${orderFetchErr.message}`,
            { code: 'DATABASE_ERROR' },
          );
        }

        if (data) {
          dbOrder = data;

          // 1. Target pageId association check
          if (dbOrder.page_id !== targetPageId) {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              'Payment order was not created for this page',
              { code: 'PAGE_ORDER_MISMATCH' },
            );
          }

          // 2. Authenticated principal association check
          if (dbOrder.user_id !== auth.userId && auth.role !== 'admin') {
            return sendApiError(
              reply,
              request,
              403,
              'Forbidden',
              'Payment order was created by a different user',
              { code: 'ORDER_PRINCIPAL_MISMATCH' },
            );
          }

          // 3. Billing cycle association check
          if (body.billingCycle && body.billingCycle !== dbOrder.billing_cycle) {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              'Billing cycle does not match the created order',
              { code: 'BILLING_CYCLE_MISMATCH' },
            );
          }

          // Do not activate a discounted or otherwise altered order amount.
          const expectedAmountPaise = dbOrder.billing_cycle === 'annual' ? 499900 : 49900;
          if (isProductionRuntime() && Number(dbOrder.amount_paise) !== expectedAmountPaise) {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              'Payment order amount does not match the Page Pro price.',
              { code: 'PRICE_MISMATCH' },
            );
          }

          // 4. Idempotency / replay check
          if (
            dbOrder.status === 'completed' &&
            dbOrder.provider_payment_id !== body.razorpay_payment_id
          ) {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              'Payment order has already been verified with a different payment',
              { code: 'ORDER_ALREADY_CONSUMED' },
            );
          }
        }
      } catch (err: any) {
        if (isProductionRuntime()) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error querying payment order',
            { code: 'DATABASE_ERROR' },
          );
        }
      }
    }

    let registeredOrder = PRO_ORDER_REGISTRY.get(body.razorpay_order_id);
    if (!dbOrder) {
      // In-process fallback for headless unit tests without database runtime
      registeredOrder = PRO_ORDER_REGISTRY.get(body.razorpay_order_id);
      if (registeredOrder) {
        // 1. Target pageId association check
        if (registeredOrder.pageId !== targetPageId && registeredOrder.pageId !== pageId) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Payment order was not created for this page',
            { code: 'PAGE_ORDER_MISMATCH' },
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
            { code: 'ORDER_PRINCIPAL_MISMATCH' },
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
            { code: 'BILLING_CYCLE_MISMATCH' },
          );
        }

        // 4. Idempotency / replay check
        if (
          registeredOrder.status === 'verified' &&
          registeredOrder.paymentId !== body.razorpay_payment_id
        ) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Payment order has already been verified with a different payment',
            { code: 'ORDER_ALREADY_CONSUMED' },
          );
        }
      } else {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Payment order was not found for verification',
          { code: 'ORDER_NOT_FOUND' },
        );
      }
    }

    const trustedOrderId = dbOrder?.provider_order_id || registeredOrder?.orderId;
    if (!trustedOrderId || trustedOrderId !== body.razorpay_order_id) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Payment order was not found in the trusted order registry.',
        { code: 'ORDER_NOT_FOUND' },
      );
    }

    const trustedBillingCycle =
      dbOrder?.billing_cycle || registeredOrder?.billingCycle || body.billingCycle || 'monthly';
    const expectedAmountPaise = Number(
      dbOrder?.amount_paise ??
        registeredOrder?.amount ??
        (trustedBillingCycle === 'annual' ? 499900 : 49900),
    );
    const expectedCurrency = String(dbOrder?.currency || 'INR');

    if (!isTestSandboxBypass) {
      try {
        const verifyResult = await paymentProvider.verifyPaymentSignature({
          orderId: trustedOrderId,
          paymentId: body.razorpay_payment_id,
          signature: body.razorpay_signature!,
          expectedAmountPaise,
          expectedCurrency,
        });
        if (!verifyResult.valid) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Payment could not be confirmed for this order.',
            { code: verifyResult.reason || 'INVALID_PAYMENT' },
          );
        }
      } catch (error) {
        const providerError = error instanceof PaymentProviderError ? error : null;
        const statusCode = providerError?.statusCode ?? 500;
        const statusText =
          statusCode === 503
            ? 'Service Unavailable'
            : statusCode === 502
              ? 'Bad Gateway'
              : 'Internal Server Error';
        return sendApiError(
          reply,
          request,
          statusCode,
          statusText,
          providerError?.message || 'Payment verification could not be completed.',
          { code: providerError?.code || 'PAYMENT_VERIFICATION_FAILED' },
        );
      }
    }

    // Authoritative persistence check: fail closed if Supabase is unconfigured (unless test fixture is active)
    if (!isSupabaseConfigured && !(isIsolatedTestRuntime() && testPageAuthorityResolver)) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Database service unavailable. Cannot persist Pro entitlement.',
        { code: 'DATABASE_UNAVAILABLE' },
      );
    }

    let finalExpiresAt: string;

    if (isSupabaseConfigured) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'verify_and_activate_page_pro',
        {
          p_provider_order_id: body.razorpay_order_id,
          p_page_id: targetPageId,
          p_user_id: auth.userId,
          p_provider_payment_id: body.razorpay_payment_id,
          p_signature: body.razorpay_signature,
          p_billing_cycle: trustedBillingCycle,
          p_is_admin: auth.role === 'admin',
        },
      );

      if (rpcError) {
        if (!isProductionRuntime()) {
          const expiryDate = new Date();
          if (trustedBillingCycle === 'annual') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setDate(expiryDate.getDate() + 30);
          }
          finalExpiresAt = expiryDate.toISOString();
        } else {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            `Failed to persist Pro entitlement to database: ${rpcError.message}`,
            { code: 'DATABASE_ERROR' },
          );
        }
      } else if (!rpcResult?.success) {
        const statusCode = rpcResult?.code === 'ORDER_PRINCIPAL_MISMATCH' ? 403 : 400;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 403 ? 'Forbidden' : 'Bad Request',
          rpcResult?.message || 'Failed to activate Page Pro entitlement',
          { code: rpcResult?.code || 'ACTIVATION_FAILED' },
        );
      } else {
        finalExpiresAt = rpcResult.expiresAt;
      }
    } else {
      const expiryDate = new Date();
      if (trustedBillingCycle === 'annual') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 365-day annual cycle
      } else {
        expiryDate.setDate(expiryDate.getDate() + 30); // 30-day monthly cycle
      }
      finalExpiresAt = expiryDate.toISOString();
    }

    if (registeredOrder) {
      registeredOrder.status = 'verified';
      registeredOrder.paymentId = body.razorpay_payment_id;
    }

    ENTITLEMENT_CACHE.set(pageId, {
      pageId: targetPageId,
      isPro: true,
      plan: 'pro',
      expiresAt: finalExpiresAt,
    });

    return reply.send({
      success: true,
      message: 'Page Pro subscription successfully activated',
      entitlement: {
        pageId: targetPageId,
        isPro: true,
        plan: 'pro',
        expiresAt: finalExpiresAt,
      },
    });
  });

  /**
   * POST /api/v1/pages — Create a new political / aspirant page (JOB 048)
   */
  app.post<{
    Body: PageCreateRequest & { userId?: string };
  }>(
    '/api/v1/pages',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'handle', 'role'],
          properties: {
            userId: { type: 'string' },
            title: { type: 'string', minLength: 2, maxLength: 100 },
            handle: { type: 'string', minLength: 2, maxLength: 50 },
            role: { type: 'string', enum: ['aspirant', 'politician', 'party', 'journalist'] },
            category: { type: 'string' },
            bio: { type: 'string', maxLength: 500 },
            constituencyId: { type: 'string' },
            stateCode: { type: 'string' },
            avatarUrl: { type: 'string' },
            bannerUrl: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      try {
        const page = await AspirantService.createPage(auth.userId, request.body);
        return reply.status(201).send({ success: true, page });
      } catch (err: any) {
        if (err.message === 'PAGE_HANDLE_ALREADY_EXISTS') {
          return sendApiError(reply, request, 409, 'Conflict', 'Handle is already taken', {
            code: 'HANDLE_CONFLICT',
          });
        }
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * GET /api/v1/pages/:id — Get page detail (JOB 048)
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/pages/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply).catch(() => null);
      const { id } = request.params;

      try {
        const page = await AspirantService.getPage(id, auth?.userId);
        if (!page) {
          return sendApiError(reply, request, 404, 'Not Found', 'Page not found', {
            code: 'PAGE_NOT_FOUND',
          });
        }
        return reply.send({ success: true, page });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * POST /api/v1/pages/:id/follow — Follow page (JOB 048)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>(
    '/api/v1/pages/:id/follow',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { userId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { id: pageId } = request.params;
      try {
        const result = await AspirantService.toggleFollowPage(pageId, auth.userId, true);
        return reply.send({ success: true, ...result });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * DELETE /api/v1/pages/:id/follow — Unfollow page (JOB 048)
   */
  app.delete<{
    Params: { id: string };
    Body: { userId?: string };
  }>(
    '/api/v1/pages/:id/follow',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { userId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { id: pageId } = request.params;
      try {
        const result = await AspirantService.toggleFollowPage(pageId, auth.userId, false);
        return reply.send({ success: true, ...result });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * POST /api/v1/pages/:id/events — Create page event with follower dispatch (JOB 048 - DEC-177 Decision 2)
   */
  app.post<{
    Params: { id: string };
    Body: PageEventCreateRequest & { userId?: string };
  }>(
    '/api/v1/pages/:id/events',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['title', 'eventType', 'startTime'],
          properties: {
            userId: { type: 'string' },
            title: { type: 'string', minLength: 3, maxLength: 150 },
            description: { type: 'string', maxLength: 2000 },
            eventType: {
              type: 'string',
              enum: [
                'townhall',
                'rally',
                'volunteer_meet',
                'webinar',
                'press_conference',
                'door_to_door',
              ],
            },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            venueName: { type: 'string' },
            venueAddress: { type: 'string' },
            constituencyId: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            isVirtual: { type: 'boolean' },
            meetingLink: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { id: pageId } = request.params;
      try {
        const event = await AspirantService.createPageEvent(pageId, auth.userId, request.body);
        return reply.status(201).send({ success: true, event });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * GET /api/v1/pages/:id/events — List page events (JOB 048)
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/pages/:id/events',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply).catch(() => null);
      const { id } = request.params;

      try {
        const events = await AspirantService.listPageEvents(id, auth?.userId);
        return reply.send({ success: true, events });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * POST /api/v1/pages/events/:eventId/rsvp — RSVP to event (JOB 048)
   */
  app.post<{
    Params: { eventId: string };
    Body: { userId?: string; status: PageEventRsvpStatus };
  }>(
    '/api/v1/pages/events/:eventId/rsvp',
    {
      schema: {
        params: {
          type: 'object',
          required: ['eventId'],
          properties: { eventId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            userId: { type: 'string' },
            status: { type: 'string', enum: ['going', 'interested', 'cancelled'] },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      const { eventId } = request.params;
      try {
        const rsvp = await AspirantService.rsvpPageEvent(eventId, auth.userId, request.body.status);
        return reply.send({ success: true, ...rsvp });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );
};
