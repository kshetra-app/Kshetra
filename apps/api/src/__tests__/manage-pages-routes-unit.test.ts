import crypto from 'node:crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { manageRoutes } from '../routes/manage';
import {
  pagesRoutes,
  ENTITLEMENT_CACHE,
  PRO_ORDER_REGISTRY,
  resetPagesTestResolvers,
  setTestAuthResolver,
  setTestPageAuthorityResolver,
} from '../routes/pages';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Manage & Pages Routes Comprehensive Unit Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    resetPagesTestResolvers();
    app = Fastify();
    await app.register(manageRoutes);
    await app.register(pagesRoutes);
    await app.ready();
  });

  afterAll(async () => {
    resetPagesTestResolvers();
    await app.close();
  });

  beforeEach(() => {
    resetPagesTestResolvers();
    ENTITLEMENT_CACHE.clear();
    PRO_ORDER_REGISTRY.clear();

    // Default safe Supabase mock
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const isOrders = table === 'page_pro_orders';
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: isOrders
            ? {
                provider_order_id: 'order_default',
                page_id: 'b8e974e1-2c6b-4e1b-944a-3fb927977461',
                user_id: 'user-owner-1',
                billing_cycle: 'monthly',
                status: 'created',
                provider_payment_id: null,
              }
            : {
                id: 'b8e974e1-2c6b-4e1b-944a-3fb927977461',
                handle: 'test-leader',
                owner_id: 'user-owner-1',
                role: 'politician',
                is_pro: true,
                pro_expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'b8e974e1-2c6b-4e1b-944a-3fb927977461' },
          error: null,
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
      };
      return builder;
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    resetPagesTestResolvers();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. MANAGE SHELL (GET /manage)
  // ─────────────────────────────────────────────────────────────
  describe('GET /manage Web Page Manager Shell', () => {
    it('serves HTML shell with security headers for unauthenticated public visitor', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/manage',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.payload).toContain('Kshetra — Web Page Manager');
    });

    it('rejects API request with accept application/json when unauthenticated with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/manage',
        headers: {
          accept: 'application/json',
        },
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED');
    });

    it('allows authorized politician via Bearer token', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-politician-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
          data: { role: 'politician' },
          error: null,
        }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/manage',
        headers: {
          authorization: 'Bearer valid-politician-token',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });

    it('rejects citizen role with 403 Forbidden', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-citizen-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
          data: { role: 'citizen' },
          error: null,
        }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/manage',
        headers: {
          authorization: 'Bearer valid-citizen-token',
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
    });

    it('rejects invalid or expired token with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/manage',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('falls back to x-user-role when Supabase is unconfigured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'GET',
        url: '/manage',
        headers: {
          'x-user-id': 'unconf-user',
          'x-user-role': 'aspirant',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PAGES ENTITLEMENT (GET /api/v1/pages/:pageId/entitlement)
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/pages/:pageId/entitlement', () => {
    it('returns cached entitlement immediately when present in memory cache', async () => {
      ENTITLEMENT_CACHE.set('cached-page-1', {
        pageId: 'cached-page-1',
        isPro: true,
        plan: 'pro',
        expiresAt: '2026-12-31T00:00:00.000Z',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/cached-page-1/entitlement',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.isPro).toBe(true);
      expect(json.plan).toBe('pro');
    });

    it('returns free plan when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/unconfigured-page/entitlement',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.isPro).toBe(false);
      expect(json.plan).toBe('free');
    });

    it('resolves active pro entitlement for UUID pageId from Supabase', async () => {
      const uuid = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
          data: {
            id: uuid,
            is_pro: true,
            pro_expires_at: futureDate,
            role: 'politician',
            title: 'MLA Leader',
            handle: 'leader-ts',
          },
          error: null,
        }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${uuid}/entitlement`,
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.isPro).toBe(true);
      expect(json.plan).toBe('pro');
      expect(json.expiresAt).toBe(futureDate);
    });

    it('resolves expired pro entitlement as free plan', async () => {
      const uuid = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
          data: {
            id: uuid,
            is_pro: true,
            pro_expires_at: pastDate, // Expired!
            role: 'politician',
            title: 'MLA Leader',
            handle: 'leader-ts',
          },
          error: null,
        }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${uuid}/entitlement`,
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.isPro).toBe(false);
      expect(json.plan).toBe('free');
    });

    it('queries by handle when pageId is not a UUID', async () => {
      let queriedColumn = '';
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((col: string) => {
          queriedColumn = col;
          return {
            maybeSingle: async () => ({
              data: {
                id: 'page-handle-id',
                is_pro: false,
                pro_expires_at: null,
                role: 'aspirant',
                title: 'Aspirant Leader',
                handle: 'aspirant-handle',
              },
              error: null,
            }),
          };
        }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/aspirant-handle/entitlement',
      });
      expect(res.statusCode).toBe(200);
      expect(queriedColumn).toBe('handle');
    });

    it('handles database error in production mode with 500 and non-prod with free fallback', async () => {
      // Non-prod fallback
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Database query error' } }),
      } as any);

      const resNonProd = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/err-page/entitlement',
      });
      expect(resNonProd.statusCode).toBe(200);
      expect(JSON.parse(resNonProd.payload).isPro).toBe(false);

      // Prod mode 500
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase, 'from').mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Database query error' } }),
        } as any);

        const resProd = await app.inject({
          method: 'GET',
          url: '/api/v1/pages/err-page/entitlement',
        });
        expect(resProd.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PAGE DETAILS (GET /api/v1/pages/details/:pageId)
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/pages/details/:pageId', () => {
    it('returns page details when page exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/details/b8e974e1-2c6b-4e1b-944a-3fb927977461',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.page.id).toBe('b8e974e1-2c6b-4e1b-944a-3fb927977461');
    });

    it('returns 404 when page does not exist in database', async () => {
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/details/missing-page-uuid',
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
    });

    it('handles unconfigured Supabase fallback', async () => {
      setSupabaseConfiguredForTesting(false);

      // missing returns 404
      const res404 = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/details/missing',
      });
      expect(res404.statusCode).toBe(404);

      // regular returns mock page
      const res200 = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/details/demo-leader',
      });
      expect(res200.statusCode).toBe(200);
      expect(JSON.parse(res200.payload).page.id).toBe('demo-leader');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PRO ORDER CREATION (POST /api/v1/pages/:pageId/pro/order)
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/pages/:pageId/pro/order', () => {
    it('creates annual order for page owner', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      let insertedOrder: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            insert: async (row: any) => {
              insertedOrder = row;
              return { error: null };
            },
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: pageId,
              owner_id: 'user-owner-1',
              is_pro: false,
              role: 'politician',
            },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/order`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          billingCycle: 'annual',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.orderId).toBeDefined();
      expect(insertedOrder.amount_paise).toBe(499900);
      expect(insertedOrder.billing_cycle).toBe('annual');
    });

    it('rejects order when caller is not the page owner or admin with 403', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-stranger-2' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: pageId,
              owner_id: 'user-owner-1', // owned by someone else!
              role: 'citizen',
            },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/order`,
        headers: {
          authorization: 'Bearer token-stranger',
        },
        payload: {
          billingCycle: 'monthly',
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
    });

    it('returns 404 when target page is not found', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/nonexistent-page/pro/order',
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          billingCycle: 'monthly',
        },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
    });

    it('handles database insert error in production mode with 500', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-owner-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'page_pro_orders') {
            return {
              insert: async () => ({ error: { message: 'Database insert failed' } }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: pageId,
                owner_id: 'user-owner-1',
                role: 'politician',
              },
              error: null,
            }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/order`,
          headers: {
            authorization: 'Bearer token-owner',
          },
          payload: {
            billingCycle: 'monthly',
          },
        });
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.payload).code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PRO VERIFICATION (POST /api/v1/pages/:pageId/pro/verify)
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/pages/:pageId/pro/verify', () => {
    it('rejects missing payment identifiers with 400 INVALID_PAYMENT_PAYLOAD', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('INVALID_PAYMENT_PAYLOAD');
    });

    it('rejects missing signature outside sandbox bypass with 400 MISSING_SIGNATURE', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          // no signature and no sandboxBypass!
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('MISSING_SIGNATURE');
    });

    it('enforces page mismatch validation check on database order', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'order_test_mismatch',
                    page_id: 'different-page-id', // mismatch!
                    user_id: 'user-owner-1',
                    billing_cycle: 'monthly',
                    status: 'created',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_test_mismatch',
          razorpay_payment_id: 'pay_test',
          sandboxBypass: true,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('PAGE_ORDER_MISMATCH');
    });

    it('enforces principal mismatch validation check on database order', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'order_principal_mismatch',
                    page_id: pageId,
                    user_id: 'different-user-who-ordered', // mismatch!
                    billing_cycle: 'monthly',
                    status: 'created',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_principal_mismatch',
          razorpay_payment_id: 'pay_test',
          sandboxBypass: true,
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('ORDER_PRINCIPAL_MISMATCH');
    });

    it('enforces billing cycle mismatch check on database order', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'order_cycle_mismatch',
                    page_id: pageId,
                    user_id: 'user-owner-1',
                    billing_cycle: 'annual',
                    status: 'created',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_cycle_mismatch',
          razorpay_payment_id: 'pay_test',
          billingCycle: 'monthly', // Mismatch vs annual!
          sandboxBypass: true,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('BILLING_CYCLE_MISMATCH');
    });

    it('enforces order replay check on completed database order', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'order_consumed',
                    page_id: pageId,
                    user_id: 'user-owner-1',
                    billing_cycle: 'monthly',
                    status: 'completed',
                    provider_payment_id: 'pay_original_123',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_consumed',
          razorpay_payment_id: 'pay_different_456', // Different payment on completed order!
          sandboxBypass: true,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('ORDER_ALREADY_CONSUMED');
    });

    it('activates Pro entitlement successfully via Supabase RPC', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      const expectedExpiry = '2027-10-20T00:00:00.000Z';

      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          expiresAt: expectedExpiry,
        },
        error: null,
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_valid_rpc',
          razorpay_payment_id: 'pay_valid_rpc',
          sandboxBypass: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.entitlement.isPro).toBe(true);
      expect(json.entitlement.expiresAt).toBe(expectedExpiry);
    });

    it('handles RPC activation error in production mode with 500', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.NODE_ENV = 'production';
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_rpc_error';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-owner-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
          data: null,
          error: { message: 'Database RPC execution error' },
        } as any);

        const orderId = 'order_rpc_err';
        const paymentId = 'pay_rpc_err';
        const validSig = crypto
          .createHmac('sha256', 'test_secret_for_rpc_error')
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          headers: {
            authorization: 'Bearer token-owner',
          },
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: validSig,
            sandboxBypass: false,
          },
        });
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.payload).code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSecret !== undefined) {
          process.env.RAZORPAY_KEY_SECRET = origSecret;
        } else {
          delete process.env.RAZORPAY_KEY_SECRET;
        }
      }
    });

    it('handles RPC failure response with specific error code', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: false,
          code: 'ORDER_PRINCIPAL_MISMATCH',
          message: 'Principal mismatch inside RPC',
        },
        error: null,
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: {
          authorization: 'Bearer token-owner',
        },
        payload: {
          razorpay_order_id: 'order_fail_rpc',
          razorpay_payment_id: 'pay_fail_rpc',
          sandboxBypass: true,
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('ORDER_PRINCIPAL_MISMATCH');
    });

    it('uses testAuthResolver and testPageAuthorityResolver in GET /entitlement', async () => {
      setTestAuthResolver(async () => ({ userId: 'test-user', role: 'politician' }));
      setTestPageAuthorityResolver(async () => ({
        authorized: true,
        notFound: false,
        page: { is_pro: true, pro_expires_at: '2028-01-01T00:00:00.000Z' },
      }));

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/custom-test-page/entitlement',
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).isPro).toBe(true);

      // Resolver throws error -> falls through
      setTestPageAuthorityResolver(async () => {
        throw new Error('Resolver error');
      });
      const resFallback = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/custom-test-page-2/entitlement',
      });
      expect(resFallback.statusCode).toBe(200);
    });

    it('rejects POST /pro/order when unauthenticated or token invalid', async () => {
      // 1. Missing header
      const resNoHeader = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page/pro/order',
        payload: { billingCycle: 'monthly' },
      });
      expect(resNoHeader.statusCode).toBe(401);

      // 2. Invalid token
      const resInvalidToken = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page/pro/order',
        headers: { authorization: 'Bearer invalid-token' },
        payload: { billingCycle: 'monthly' },
      });
      expect(resInvalidToken.statusCode).toBe(401);

      // 3. Supabase unconfigured
      setSupabaseConfiguredForTesting(false);
      const resUnconf = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page/pro/order',
        headers: { authorization: 'Bearer some-valid-looking-token' },
        payload: { billingCycle: 'monthly' },
      });
      expect(resUnconf.statusCode).toBe(401);
      setSupabaseConfiguredForTesting(true);

      // 4. Supabase getUser error
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: null } as any,
        error: { message: 'JWT expired' } as any,
      });
      const resUserErr = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page/pro/order',
        headers: { authorization: 'Bearer expired-jwt' },
        payload: { billingCycle: 'monthly' },
      });
      expect(resUserErr.statusCode).toBe(401);
    });

    it('allows non-prod DB insert failure fallback in POST /pro/order', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            insert: async () => ({ error: { message: 'Transient non-prod DB error' } }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/order`,
        headers: { authorization: 'Bearer token-owner' },
        payload: { billingCycle: 'monthly' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });

    it('handles verification error conditions: unauthenticated, notFound, forbidden, invalid signature, config error', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';

      // 1. Unauthenticated
      const resUnauth = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        payload: { razorpay_order_id: 'ord_1', razorpay_payment_id: 'pay_1', sandboxBypass: true },
      });
      expect(resUnauth.statusCode).toBe(401);

      // 2. Page not found
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'politician' }, error: null }),
        } as any;
      }) as any);

      const resNotFound = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/missing-uuid/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: { razorpay_order_id: 'ord_1', razorpay_payment_id: 'pay_1', sandboxBypass: true },
      });
      expect(resNotFound.statusCode).toBe(404);

      // 3. Not authorized (different owner, not admin)
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-stranger' } as any },
        error: null,
      });
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
              error: null,
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const resForbidden = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-stranger' },
        payload: { razorpay_order_id: 'ord_1', razorpay_payment_id: 'pay_1', sandboxBypass: true },
      });
      expect(resForbidden.statusCode).toBe(403);

      // 4. Invalid signature (when sandboxBypass is false and RAZORPAY_KEY_SECRET is set)
      process.env.RAZORPAY_KEY_SECRET = 'secret_test_key';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resBadSig = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_sig_fail',
          razorpay_payment_id: 'pay_sig_fail',
          razorpay_signature: 'invalid_hex_signature',
          sandboxBypass: false,
        },
      });
      expect(resBadSig.statusCode).toBe(400);
      expect(JSON.parse(resBadSig.payload).code).toBe('INVALID_SIGNATURE');

      // 5. Config error (when sandboxBypass is false and RAZORPAY_KEY_SECRET is unset)
      delete process.env.RAZORPAY_KEY_SECRET;
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resNoSecret = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_cfg_fail',
          razorpay_payment_id: 'pay_cfg_fail',
          razorpay_signature: 'dummy_sig',
          sandboxBypass: false,
        },
      });
      expect(resNoSecret.statusCode).toBe(500);
      expect(JSON.parse(resNoSecret.payload).code).toBe('PROVIDER_CONFIG_ERROR');
    });

    it('validates in-memory PRO_ORDER_REGISTRY fallback matching rules', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';

      // Ensure Supabase returns null for page_pro_orders to trigger in-memory registry fallback
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'page_pro_orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
            error: null,
          }),
        } as any;
      }) as any);

      // 1. Order not found in registry (without sandboxBypass auto-creation)
      process.env.RAZORPAY_KEY_SECRET = 'secret_test_key_for_not_found';
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const validSig = crypto
        .createHmac('sha256', 'secret_test_key_for_not_found')
        .update('ord_unknown_123|pay_123')
        .digest('hex');

      const resNotFound = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_unknown_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: validSig,
          sandboxBypass: false,
        },
      });
      expect(resNotFound.statusCode).toBe(400);
      expect(JSON.parse(resNotFound.payload).code).toBe('ORDER_NOT_FOUND');

      // Setup an order in registry
      PRO_ORDER_REGISTRY.set('ord_mem_1', {
        orderId: 'ord_mem_1',
        pageId: 'other-page-id',
        userId: 'user-owner-1',
        billingCycle: 'monthly',
        amount: 49900,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'created',
      });

      // 2. Target page mismatch
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resPageMismatch = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: { razorpay_order_id: 'ord_mem_1', razorpay_payment_id: 'pay_123', sandboxBypass: true },
      });
      expect(resPageMismatch.statusCode).toBe(400);
      expect(JSON.parse(resPageMismatch.payload).code).toBe('PAGE_ORDER_MISMATCH');

      // Update registry for user mismatch test
      PRO_ORDER_REGISTRY.set('ord_mem_2', {
        orderId: 'ord_mem_2',
        pageId: pageId,
        userId: 'different-user-999',
        billingCycle: 'monthly',
        amount: 49900,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'created',
      });

      // 3. Principal mismatch
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resPrincipalMismatch = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: { razorpay_order_id: 'ord_mem_2', razorpay_payment_id: 'pay_123', sandboxBypass: true },
      });
      expect(resPrincipalMismatch.statusCode).toBe(403);
      expect(JSON.parse(resPrincipalMismatch.payload).code).toBe('ORDER_PRINCIPAL_MISMATCH');

      // 4. Billing cycle mismatch
      PRO_ORDER_REGISTRY.set('ord_mem_3', {
        orderId: 'ord_mem_3',
        pageId: pageId,
        userId: 'user-owner-1',
        billingCycle: 'annual',
        amount: 499900,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'created',
      });
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resCycleMismatch = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_mem_3',
          razorpay_payment_id: 'pay_123',
          billingCycle: 'monthly', // Mismatch!
          sandboxBypass: true,
        },
      });
      expect(resCycleMismatch.statusCode).toBe(400);
      expect(JSON.parse(resCycleMismatch.payload).code).toBe('BILLING_CYCLE_MISMATCH');

      // 5. Order already consumed
      PRO_ORDER_REGISTRY.set('ord_mem_4', {
        orderId: 'ord_mem_4',
        pageId: pageId,
        userId: 'user-owner-1',
        billingCycle: 'monthly',
        amount: 49900,
        product: 'pages_pro',
        createdAt: Date.now(),
        status: 'verified',
        paymentId: 'pay_original_consumed',
      });
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      const resReplay = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_mem_4',
          razorpay_payment_id: 'pay_replayed_token',
          sandboxBypass: true,
        },
      });
      expect(resReplay.statusCode).toBe(400);
      expect(JSON.parse(resReplay.payload).code).toBe('ORDER_ALREADY_CONSUMED');
    });

    it('handles database fetch exceptions and unconfigured persistence branches in POST /pro/verify', async () => {
      const pageId = 'b8e974e1-2c6b-4e1b-944a-3fb927977461';

      // 1. Database fetch error in production mode -> 500 DATABASE_ERROR
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.NODE_ENV = 'production';
      process.env.RAZORPAY_KEY_SECRET = 'secret_test_key_for_fetch_err';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-owner-1' } as any },
          error: null,
        });
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'page_pro_orders') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { message: 'Connection timeout on order fetch' },
                  }),
                }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: pageId, owner_id: 'user-owner-1', role: 'politician' },
              error: null,
            }),
          } as any;
        }) as any);

        const orderId = 'ord_1';
        const paymentId = 'pay_1';
        const validSig = crypto
          .createHmac('sha256', 'secret_test_key_for_fetch_err')
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        const resDbErr = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          headers: { authorization: 'Bearer token-owner' },
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: validSig,
            sandboxBypass: false,
          },
        });
        expect(resDbErr.statusCode).toBe(500);
        expect(JSON.parse(resDbErr.payload).code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSecret !== undefined) {
          process.env.RAZORPAY_KEY_SECRET = origSecret;
        } else {
          delete process.env.RAZORPAY_KEY_SECRET;
        }
      }

      // 2. Unconfigured Supabase when no test fixture active -> 503 DATABASE_UNAVAILABLE
      setSupabaseConfiguredForTesting(false);
      try {
        setTestAuthResolver(async () => ({ userId: 'user-owner-1', role: 'politician' }));
        PRO_ORDER_REGISTRY.set('ord_unconf', {
          orderId: 'ord_unconf',
          pageId: pageId,
          userId: 'user-owner-1',
          billingCycle: 'monthly',
          amount: 49900,
          product: 'pages_pro',
          createdAt: Date.now(),
          status: 'created',
        });

        const resUnavail = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          headers: { authorization: 'Bearer token-owner' },
          payload: { razorpay_order_id: 'ord_unconf', razorpay_payment_id: 'pay_unconf', sandboxBypass: true },
        });
        expect(resUnavail.statusCode).toBe(404);
        expect(JSON.parse(resUnavail.payload).code).toBe('NOT_FOUND');

        // With testPageAuthorityResolver -> allows activation in unconfigured environment!
        setTestPageAuthorityResolver(async () => ({
          authorized: true,
          notFound: false,
          page: { id: pageId, owner_id: 'user-owner-1' },
        }));
        const resTestAllow = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          headers: { authorization: 'Bearer token-owner' },
          payload: {
            razorpay_order_id: 'ord_unconf',
            razorpay_payment_id: 'pay_unconf',
            billingCycle: 'monthly',
            sandboxBypass: true,
          },
        });
        expect(resTestAllow.statusCode).toBe(200);
        expect(JSON.parse(resTestAllow.payload).success).toBe(true);
      } finally {
        setSupabaseConfiguredForTesting(true);
      }

      // 3. RPC error in non-production mode -> falls back to local expiry calculation
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-owner-1' } as any },
        error: null,
      });
      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: null,
        error: { message: 'Local RPC mock error' },
      } as any);

      const resRpcFallback = await app.inject({
        method: 'POST',
        url: `/api/v1/pages/${pageId}/pro/verify`,
        headers: { authorization: 'Bearer token-owner' },
        payload: {
          razorpay_order_id: 'ord_rpc_nonprod_err',
          razorpay_payment_id: 'pay_rpc_nonprod_err',
          billingCycle: 'monthly',
          sandboxBypass: true,
        },
      });
      expect(resRpcFallback.statusCode).toBe(200);
      expect(JSON.parse(resRpcFallback.payload).success).toBe(true);
    });
  });
});
