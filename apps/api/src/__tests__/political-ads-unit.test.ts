import Fastify, { FastifyInstance } from 'fastify';
import { politicalAdsRoutes } from '../routes/politicalAds';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Political Ads Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(politicalAdsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  beforeEach(() => {
    // Default mock to prevent unmocked Winsock DNS timeouts
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null }),
          }),
          in: () => ({
            order: () => ({ data: [], error: null }),
          }),
        }),
      } as any;
    }) as any);
  });

  describe('1. Unauthenticated Standalone Ad Library Page (/ad-library)', () => {
    it('serves HTML transparency page with 200 and UTF-8 charset', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/ad-library',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.payload).toContain('Public Political Ad Transparency Library');
      expect(res.payload).toContain('ECI / MCMC transparency record');
    });
  });

  describe('2. Public Ad Library API (/api/v1/political-ads/library)', () => {
    it('returns certified and active ads from database', async () => {
      const mockAds = [
        {
          id: 'pad-101',
          page_id: 'page-ts-1',
          post_id: 'post-1',
          mcmc_certificate_id: 'ECI/MCMC/2026/TS/001',
          status: 'active',
          amount_paid: 500000,
          target_scope: 'state',
          target_value: 'TS',
          impressions: 12000,
          created_at: new Date().toISOString(),
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({ data: mockAds, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/library',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ads.length).toBe(1);
      expect(body.ads[0].id).toBe('pad-101');
    });

    it('returns 503 when library persistence fails outside isolated test fixtures', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({ data: null, error: { message: 'DB down' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/library',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('returns 503 when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/library',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('3. Public Active Ads Feed (/api/v1/political-ads/active)', () => {
    it('returns active ads and filters by state and constituency', async () => {
      const mockAds = [
        {
          id: 'pad-state-ts',
          target_scope: 'state',
          target_value: 'TS',
          status: 'active',
        },
        {
          id: 'pad-ac-65',
          target_scope: 'constituency',
          target_value: 'TS-AC-065',
          status: 'active',
        },
        {
          id: 'pad-other-state',
          target_scope: 'state',
          target_value: 'AP',
          status: 'active',
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              eq: async () => ({ data: mockAds, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      // Filter by TS
      const resTS = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/active?state=TS',
      });

      expect(resTS.statusCode).toBe(200);
      const bodyTS = JSON.parse(resTS.payload);
      expect(bodyTS.ads.some((a: any) => a.id === 'pad-state-ts')).toBe(true);
      expect(bodyTS.ads.some((a: any) => a.id === 'pad-other-state')).toBe(false);

      // Filter by Constituency TS-AC-065
      const resAC = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/active?constituency=TS-AC-065',
      });

      expect(resAC.statusCode).toBe(200);
      const bodyAC = JSON.parse(resAC.payload);
      expect(bodyAC.ads.some((a: any) => a.id === 'pad-ac-65')).toBe(true);
    });

    it('returns 503 when active-ad persistence fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              eq: async () => ({ data: null, error: { message: 'DB fail' } }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/active',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('returns 503 when active-ad persistence is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/active',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('4. Submit Political Ad (/api/v1/pages/:pageId/political-ads)', () => {
    it('rejects unauthenticated submissions with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-1/political-ads',
        payload: {
          postId: 'post-1',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/001',
          amountPaid: 250000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects invalid body schema with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-1/political-ads',
        headers: { 'x-user-id': 'user-1', 'x-user-role': 'citizen' },
        payload: {
          postId: 'post-1',
          amountPaid: 1000,
          targetScope: 'invalid_scope',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 in production mode when page is not found in database', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'pages') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            } as any;
          }
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/nonexistent-page/political-ads',
          headers: { authorization: 'Bearer prod-token' },
          payload: {
            postId: 'post-1',
            mcmcCertificateId: 'ECI/MCMC/2026/TS/001',
            amountPaid: 250000,
            targetScope: 'state',
          },
        });

        expect(res.statusCode).toBe(404);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('NOT_FOUND');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('rejects submission from non-owner and non-admin with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'page-ts-1', owner_id: 'real-page-owner' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-ts-1/political-ads',
        headers: {
          'x-user-id': 'imposter-user',
          'x-user-role': 'citizen',
        },
        payload: {
          postId: 'post-1',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/001',
          amountPaid: 250000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('allows page owner to submit ad with status pending_certification in DB', async () => {
      let insertedRecord: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'page-ts-1', owner_id: 'leader-user-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'political_ads') {
          return {
            insert: (record: any) => {
              insertedRecord = record;
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: 'pad-new-1',
                      ...record,
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-ts-1/political-ads',
        headers: {
          'x-user-id': 'leader-user-1',
          'x-user-role': 'politician',
        },
        payload: {
          postId: 'post-election-launch',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0542',
          amountPaid: 750000,
          targetScope: 'constituency',
          targetValue: 'TS-AC-065',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ad.id).toBe('pad-new-1');
      expect(body.ad.status).toBe('pending_certification');
      expect(insertedRecord.status).toBe('pending_certification');
      expect(insertedRecord.amount_paid).toBe(750000);
      expect(insertedRecord.mcmc_certificate_id).toBe('ECI/MCMC/2026/TS/0542');
    });

    it('allows admin role to submit ad for any page', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'page-ts-1', owner_id: 'other-owner' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'political_ads') {
          return {
            insert: (record: any) => ({
              select: () => ({
                single: async () => ({
                  data: { id: 'pad-admin-override', ...record },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-ts-1/political-ads',
        headers: {
          'x-user-id': 'admin-super',
          'x-user-role': 'admin',
        },
        payload: {
          postId: 'post-admin-broadcast',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0999',
          amountPaid: 1000000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ad.id).toBe('pad-admin-override');
    });

    it('returns 500 in production mode on insert failure', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'owner-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'pages') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'page-ts-1', owner_id: 'owner-1' },
                    error: null,
                  }),
                }),
              }),
            } as any;
          }
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { role: 'politician' },
                    error: null,
                  }),
                }),
              }),
            } as any;
          }
          if (table === 'political_ads') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { message: 'Unique constraint on post_id violated' },
                  }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-ts-1/political-ads',
          headers: { authorization: 'Bearer prod-owner-token' },
          payload: {
            postId: 'post-duplicate',
            mcmcCertificateId: 'ECI/MCMC/2026/TS/001',
            amountPaid: 100000,
            targetScope: 'state',
          },
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('falls back to memory ads in test mode when page is not found in database', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/fallback-page-1/political-ads',
        headers: { 'x-user-id': 'user-1', 'x-user-role': 'citizen' },
        payload: {
          postId: 'post-fb-1',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0991',
          amountPaid: 150000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ad.page_id).toBe('fallback-page-1');
    });

    it('falls back to memory ads in test mode when database insert fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'pages') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'page-ts-1', owner_id: 'user-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'political_ads') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'DB down' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-ts-1/political-ads',
        headers: { 'x-user-id': 'user-1', 'x-user-role': 'citizen' },
        payload: {
          postId: 'post-fb-2',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0992',
          amountPaid: 200000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('creates ad via memory fallback when Supabase is not configured in test mode', async () => {
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/page-no-db/political-ads',
        headers: { 'x-user-id': 'user-1', 'x-user-role': 'citizen' },
        payload: {
          postId: 'post-no-db-1',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0998',
          amountPaid: 300000,
          targetScope: 'state',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('returns 503 when Supabase is not configured in production mode for ad creation', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-1' } as any },
          error: null,
        });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-no-db/political-ads',
          headers: {
            authorization: 'Bearer prod-token',
            'x-user-role': 'citizen',
          },
          payload: {
            postId: 'post-no-db-2',
            mcmcCertificateId: 'ECI/MCMC/2026/TS/0999',
            amountPaid: 300000,
            targetScope: 'state',
          },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('5. Compliance Review Queue (/api/v1/admin/political-ads/review-queue)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects citizen role with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'user-regular',
          'x-user-role': 'citizen',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('returns pending ads for moderator role from database', async () => {
      const mockPending = [
        {
          id: 'pad-pending-1',
          page_id: 'page-ts-1',
          status: 'pending_certification',
          mcmc_certificate_id: 'ECI/MCMC/2026/TS/0101',
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({ data: mockPending, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'mod-user-1',
          'x-user-role': 'moderator',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.queue.length).toBe(1);
      expect(body.queue[0].id).toBe('pad-pending-1');
    });

    it('returns 503 when review-queue persistence fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({ data: null, error: { message: 'DB err' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'admin-1',
          'x-user-role': 'admin',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('returns 503 when review queue persistence is not configured', async () => {
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'admin-1',
          'x-user-role': 'admin',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('6. Human Review Certification Action (/api/v1/admin/political-ads/:adId/certify)', () => {
    it('rejects unauthenticated certify action with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-1/certify',
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects non-reviewer role with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-1/certify',
        headers: {
          'x-user-id': 'user-politician',
          'x-user-role': 'politician',
        },
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('rejects invalid action with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-1/certify',
        headers: {
          'x-user-id': 'mod-1',
          'x-user-role': 'moderator',
        },
        payload: { action: 'auto_approve' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('certifies and activates ad when action is certify', async () => {
      let updatedStatus: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            update: (payload: any) => {
              updatedStatus = payload;
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: 'pad-101',
                        status: payload.status,
                        reviewed_by: payload.reviewed_by,
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-101/certify',
        headers: {
          'x-user-id': 'human-certifier-1',
          'x-user-role': 'moderator',
        },
        payload: { action: 'certify', reason: 'MCMC certificate verified on ECI portal' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ad.status).toBe('active');
      expect(updatedStatus.status).toBe('active');
      expect(updatedStatus.reviewed_by).toBe('human-certifier-1');
    });

    it('rejects ad when action is reject', async () => {
      let updatedStatus: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            update: (payload: any) => {
              updatedStatus = payload;
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: 'pad-102',
                        status: payload.status,
                        reviewed_by: payload.reviewed_by,
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-102/certify',
        headers: {
          'x-user-id': 'human-certifier-1',
          'x-user-role': 'admin',
        },
        payload: { action: 'reject', reason: 'Forged certificate number' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.ad.status).toBe('rejected');
      expect(updatedStatus.status).toBe('rejected');
    });

    it('returns 500 in production mode on database update error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'admin-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { role: 'admin' },
                    error: null,
                  }),
                }),
              }),
            } as any;
          }
          if (table === 'political_ads') {
            return {
              update: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: null,
                      error: { message: 'Database lock timeout' },
                    }),
                  }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/political-ads/pad-err/certify',
          headers: {
            authorization: 'Bearer admin-token',
            'x-user-role': 'admin',
          },
          payload: { action: 'certify' },
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('updates memory ads in test mode when database update fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_ads') {
          return {
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: null, error: { message: 'DB down' } }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-demo-2/certify',
        headers: {
          'x-user-id': 'admin-mod-1',
          'x-user-role': 'admin',
        },
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('handles test mode when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);

      // Ad exists in MEMORY_ADS
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-demo-1/certify',
        headers: {
          'x-user-id': 'admin-mod-1',
          'x-user-role': 'moderator',
        },
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      // Ad does not exist in MEMORY_ADS
      const res404 = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/nonexistent-ad-xyz/certify',
        headers: {
          'x-user-id': 'admin-mod-1',
          'x-user-role': 'moderator',
        },
        payload: { action: 'certify' },
      });

      expect(res404.statusCode).toBe(404);
    });

    it('returns 503 when Supabase is not configured in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'admin-1' } as any },
          error: null,
        });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/political-ads/pad-1/certify',
          headers: {
            authorization: 'Bearer admin-token',
            'x-user-role': 'admin',
          },
          payload: { action: 'certify' },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('7. Auth Resolution Edge Cases (resolveAuthUser)', () => {
    it('authenticates via Bearer token with Supabase getUser', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'token-user-123' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'admin' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'political_ads') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          authorization: 'Bearer valid-jwt-token-mod',
        },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
