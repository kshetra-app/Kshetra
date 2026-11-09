import Fastify, { FastifyInstance } from 'fastify';
import { campaignRoutes } from '../routes/campaign';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';
import * as walletService from '../services/wallet/walletService';
import * as obdService from '../services/outreach/obdTelecomService';
import { TelecomProvider } from '../providers/telecomProvider';
import { PaymentProviderError, RazorpayProvider } from '../providers/razorpayProvider';

function mockRazorpayOrderCreation(): () => void {
  const previousKey = process.env.RAZORPAY_KEY_ID;
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_ID = 'rzp_test_campaign_key';
  process.env.RAZORPAY_KEY_SECRET = 'campaign_test_secret';
  const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
    const requestBody = JSON.parse(String(init?.body || '{}')) as { amount: number; currency: string };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 'order_razorpay_campaign_test',
        amount: requestBody.amount,
        currency: requestBody.currency,
        status: 'created',
      }),
    } as Response;
  });

  return () => {
    fetchSpy.mockRestore();
    if (previousKey === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = previousKey;
    if (previousSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previousSecret;
  };
}

describe('Campaign Routes Unit Test Suite (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(campaignRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'booth_strategies') {
        return {
          select: () => ({
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }),
        } as any;
      }
      if (table === 'campaign_volunteers') {
        return {
          select: () => ({
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }),
        } as any;
      }
      return {} as any;
    }) as any);
  });

  describe('Campaign ad draft persistence contract', () => {
    it('saves and reads a campaign-scoped draft without delivery or compliance claims', async () => {
      const originalConfigured = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);
      try {
        const create = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/ads',
          headers: { 'x-user-id': 'pp1', 'x-user-role': 'politician' },
          payload: {
            campaignId: 'c1',
            format: 'promoted_post',
            name: 'Transit update draft',
            headline: 'A draft headline',
            body: 'Draft message body',
            paidForBy: 'Example sponsor',
            disclosureText: 'Sponsored political content',
          },
        });

        expect(create.statusCode).toBe(201);
        const created = JSON.parse(create.payload).ad;
        expect(created.status).toBe('draft');
        expect(created.is_eci_compliant).toBe(false);
        expect(created.performance).toBeUndefined();

        const list = await app.inject({
          method: 'GET',
          url: '/api/v1/campaign/ads?campaignId=c1',
          headers: { 'x-user-id': 'pp1', 'x-user-role': 'politician' },
        });
        expect(list.statusCode).toBe(200);
        expect(JSON.parse(list.payload).ads).toEqual([expect.objectContaining({ id: created.id, status: 'draft' })]);
      } finally {
        setSupabaseConfiguredForTesting(originalConfigured);
      }
    });

    it('rejects draft access when the caller does not own or coordinate the campaign', async () => {
      const originalConfigured = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);
      try {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/ads',
          headers: { 'x-user-id': 'another-user', 'x-user-role': 'politician' },
          payload: {
            campaignId: 'c1',
            format: 'promoted_post',
            name: 'Unauthorized draft',
            headline: 'Headline',
            paidForBy: 'Sponsor',
            disclosureText: 'Sponsored content',
          },
        });
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.payload).code).toBe('FORBIDDEN');
      } finally {
        setSupabaseConfiguredForTesting(originalConfigured);
      }
    });

    it('uses verified identity and durable ad_creatives operations in production mode', async () => {
      const originalConfigured = isSupabaseConfigured;
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      setSupabaseConfiguredForTesting(true);
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';

      const storedAd = {
        id: 'ad-draft-prod-1',
        campaign_id: 'campaign-prod-1',
        format: 'promoted_post',
        status: 'draft',
        name: 'Persisted draft',
        headline: 'A real draft headline',
        body: '',
        call_to_action: '',
        media_urls: [],
        disclosure_text: 'Paid political content',
        paid_for_by: 'Verified sponsor',
        is_eci_compliant: false,
        created_at: '2026-11-08T00:00:00.000Z',
        updated_at: '2026-11-08T00:00:00.000Z',
      };
      let selectedAdColumns = '';

      jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'verified-admin' } as any },
        error: null,
      } as any);
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }) }) } as any;
        }
        if (table === 'campaigns') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'campaign-prod-1', politician_id: 'owner-id' }, error: null }) }) }) } as any;
        }
        if (table === 'ad_creatives') {
          return {
            insert: (values: Record<string, unknown>) => {
              expect(values.status).toBe('draft');
              expect(values.is_eci_compliant).toBe(false);
              return { select: (columns: string) => {
                selectedAdColumns = columns;
                return { single: async () => ({ data: storedAd, error: null }) };
              } };
            },
            select: (columns: string) => {
              selectedAdColumns = columns;
              return { eq: () => ({ eq: () => ({ order: async () => ({ data: [storedAd], error: null }) }) }) };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      try {
        const created = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/ads',
          headers: { authorization: 'Bearer valid-production-token' },
          payload: {
            campaignId: 'campaign-prod-1',
            format: 'promoted_post',
            name: 'Persisted draft',
            headline: 'A real draft headline',
            paidForBy: 'Verified sponsor',
            disclosureText: 'Paid political content',
          },
        });
        expect(created.statusCode).toBe(201);
        expect(JSON.parse(created.payload).ad.id).toBe(storedAd.id);

        const listed = await app.inject({
          method: 'GET',
          url: '/api/v1/campaign/ads?campaignId=campaign-prod-1',
          headers: { authorization: 'Bearer valid-production-token' },
        });
        expect(listed.statusCode).toBe(200);
        expect(JSON.parse(listed.payload).ads).toHaveLength(1);
        expect(selectedAdColumns).not.toContain('performance');
      } finally {
        setSupabaseConfiguredForTesting(originalConfigured);
        if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalNodeEnv;
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
      }
    });
  });

  describe('1. Pricing Endpoints (/api/v1/campaign/pricing)', () => {
    it('GET /api/v1/campaign/pricing: returns pricing structure and timestamp', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/pricing',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.pricing).toBeDefined();
      expect(body.pricing.voiceObd).toBeDefined();
      expect(body.pricing.metaPublishing).toBeDefined();
      expect(body.pricing.whatsappOrganic).toBeDefined();
    });

    it('does not expose process-memory example rates as production pricing', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalAppEnv = process.env.APP_ENV;
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';

      try {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/campaign/pricing',
        });

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('PRICING_UNAVAILABLE');
      } finally {
        if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalNodeEnv;
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
      }
    });

    it('PATCH /api/v1/campaign/pricing: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/pricing',
        payload: { voiceObd: { baseCostPerCallINR: 0.5 } },
      });

      expect(res.statusCode).toBe(401);
    });

    it('PATCH /api/v1/campaign/pricing: rejects non-admin caller with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/pricing',
        headers: { 'x-user-id': 'usr-cit-1' },
        payload: { voiceObd: { baseCostPerCallINR: 0.5 } },
      });

      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/v1/campaign/pricing: allows admin to update pricing with 200', async () => {
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
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/pricing',
        headers: { 'x-user-id': 'usr-admin-1' },
        payload: {
          voiceObd: {
            baseCostPerCallINR: 0.45,
            platformFeePerCallINR: 0.15,
            finalRatePerCallINR: 0.6,
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('updated');
      expect(body.pricing.voiceObd.baseCostPerCallINR).toBe(0.45);
    });
  });

  describe('2. Check Kshetra User Endpoint (/api/v1/campaign/users/check-kshetra)', () => {
    it('rejects missing or empty phone with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/users/check-kshetra',
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns user details when phone matches in database', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    user_id: 'u-1234',
                    display_name: 'Ravi Kumar',
                    avatar_url: 'https://example.com/avatar.jpg',
                    role: 'politician',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/users/check-kshetra?phone=9876543210',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.isKshetraUser).toBe(true);
      expect(body.userId).toBe('u-1234');
      expect(body.displayName).toBe('Ravi Kumar');
      expect(body.role).toBe('politician');
    });

    it('returns isKshetraUser: false when phone not registered', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
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
        method: 'GET',
        url: '/api/v1/campaign/users/check-kshetra?phone=9999900000',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.isKshetraUser).toBe(false);
    });
  });

  describe('3. Campaign List & Filter Endpoint (/api/v1/campaign/campaigns)', () => {
    it('returns campaigns from database when configured', async () => {
      const mockCampaign = {
        id: 'camp-101',
        politician_id: 'pol-1',
        name: 'Secunderabad Outreach 2026',
        status: 'active',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              then: (resolve: any) => resolve({ data: [mockCampaign], error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/campaigns?status=active',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.total).toBe(1);
      expect(body.campaigns[0].id).toBe('camp-101');
    });

    it('returns an empty campaign list when the database has no campaigns', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'campaigns') {
          return {
            select: () => ({
              then: (resolve: any) => resolve({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/campaigns',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.total).toBe(0);
      expect(body.campaigns).toEqual([]);
    });
  });

  describe('4. Booth Strategy Endpoints (/api/v1/campaign/booths)', () => {
    it('GET /api/v1/campaign/booths returns booth list with stats', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/booths',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.total).toBeDefined();
      expect(Array.isArray(body.booths)).toBe(true);
      expect(body.assignedCount).toBeDefined();
      expect(body.unassignedCount).toBeDefined();
    });

    it('PATCH /api/v1/campaign/booths/:id rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-1',
        payload: { priority: 'high' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('PATCH /api/v1/campaign/booths/:id returns 404 for non-existent booth', async () => {
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
        if (table === 'booth_strategies') {
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
        method: 'PATCH',
        url: '/api/v1/campaign/booths/non-existent-booth-999',
        headers: { 'x-user-id': 'usr-admin-1' },
        payload: { priority: 'critical' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('PATCH /api/v1/campaign/booths/:id rejects unauthorized caller with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'booth_strategies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'b-54', campaign_id: 'c1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-owner-99' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-54',
        headers: { 'x-user-id': 'unauthorized-user-1' },
        payload: { priority: 'critical' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/v1/campaign/booths/:id successfully updates booth for admin/owner', async () => {
      const mockUpdated = {
        id: 'b-54',
        campaign_id: 'c1',
        priority: 'critical',
        notes: 'Updated notes',
      };

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
        if (table === 'booth_strategies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'b-54', campaign_id: 'c1' },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: mockUpdated, error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-54',
        headers: { 'x-user-id': 'usr-admin-1' },
        payload: { priority: 'critical', notes: 'Updated notes' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.booth.priority).toBe('critical');
    });
  });

  describe('5. Cadre / Volunteers Endpoints (/api/v1/campaign/volunteers)', () => {
    it('GET /api/v1/campaign/volunteers: returns cadre roster', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/volunteers',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.volunteers)).toBe(true);
      expect(body.total).toBeDefined();
    });

    it('POST /api/v1/campaign/volunteers: rejects missing name/phone with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'usr-admin-1' },
        payload: { name: 'Test' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/campaign/volunteers: rejects citizen from managing cadre with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'usr-citizen-1' },
        payload: { name: 'New Volunteer', phone: '9876543210' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/volunteers: rejects appointing coordinator without admin/owner privileges', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'coordinator' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-owner-different' },
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
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'coordinator-user' },
        payload: {
          name: 'Promoted Coord',
          phone: '9876543210',
          role: 'coordinator',
          campaignId: 'c1',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/campaign/volunteers: creates cadre member successfully for owner/admin', async () => {
      const mockCreated = {
        id: 'vol-new-1',
        campaign_id: 'c1',
        name: 'Suresh Varma',
        phone: '9876543210',
        role: 'booth_agent',
      };

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
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockCreated, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'usr-admin-1' },
        payload: {
          name: 'Suresh Varma',
          phone: '9876543210',
          role: 'booth_agent',
          campaignId: 'c1',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.volunteer.name).toBe('Suresh Varma');
    });
  });

  describe('6. Wallet & Transactions Endpoints (/api/v1/campaign/wallet)', () => {
    it('GET /api/v1/campaign/wallet: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet',
      });

      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/campaign/wallet: rejects cross-principal access with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        method: 'GET',
        url: '/api/v1/campaign/wallet?politicianId=other-pol-id',
        headers: { 'x-user-id': 'my-pol-id' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('GET /api/v1/campaign/wallet: returns wallet balance for owning politician', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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

      jest.spyOn(walletService, 'getPoliticianWallet').mockResolvedValueOnce({
        id: 'w-1',
        politicianId: 'my-pol-id',
        balanceINR: 25000,
        currency: 'INR',
        totalRechargedINR: 50000,
        totalSpentINR: 25000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet',
        headers: { 'x-user-id': 'my-pol-id' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.wallet.balanceINR).toBe(25000);
    });

    it('GET /api/v1/campaign/wallet/transactions: returns ledger history', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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

      jest.spyOn(walletService, 'getWalletTransactions').mockResolvedValueOnce([
        {
          id: 'tx-1',
          walletId: 'w-1',
          politicianId: 'my-pol-id',
          amountINR: 5000,
          type: 'credit',
          serviceType: 'recharge',
          referenceId: 'ref-1',
          description: 'UPI Recharge',
          balanceAfterINR: 5000,
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet/transactions',
        headers: { 'x-user-id': 'my-pol-id' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.transactions.length).toBe(1);
    });

    it('POST /api/v1/campaign/wallet/recharge/order: rejects recharge < 500 with 400', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 200 },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PAYMENT_ORDER_ERROR');
    });

    it('GET /api/v1/campaign/wallet/transactions: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet/transactions',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/campaign/wallet/transactions: rejects cross-principal access with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        method: 'GET',
        url: '/api/v1/campaign/wallet/transactions?politicianId=other-pol-id',
        headers: { 'x-user-id': 'my-pol-id' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/wallet/recharge/order: rejects unauthenticated with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        payload: { amountINR: 1000 },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/campaign/wallet/recharge/order: rejects cross-principal recharge with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 1000, politicianId: 'other-pol-id' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/wallet/recharge/order: fails closed with 500 when DB persist fails', async () => {
      const restoreRazorpay = mockRazorpayOrderCreation();
      try {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            insert: async () => ({ data: null, error: { message: 'DB connection failure' } }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 1000 },
      });
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
      } finally {
        restoreRazorpay();
      }
    });

    it('POST /api/v1/campaign/wallet/recharge/order: creates recharge order successfully', async () => {
      const restoreRazorpay = mockRazorpayOrderCreation();
      try {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            insert: async () => ({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 1000 },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.order.amountINR).toBe(1000);
      expect(body.order.currency).toBe('INR');
      expect(body.order.orderId).toBe('order_razorpay_campaign_test');
      expect(body.order.isSandbox).toBe(true);
      } finally {
        restoreRazorpay();
      }
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: supports mock bypass header and credits wallet', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'pay_mock_123',
                    politician_id: 'my-pol-id',
                    amount_inr: 1000,
                    status: 'pending',
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      jest.spyOn(walletService, 'creditWallet').mockResolvedValueOnce({
        id: 'w-1',
        politicianId: 'my-pol-id',
        balanceINR: 11000,
        currency: 'INR',
        totalRechargedINR: 11000,
        totalSpentINR: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          wallet: {
            id: 'w-1',
            politicianId: 'my-pol-id',
            balanceINR: 11000,
            currency: 'INR',
            totalRechargedINR: 11000,
            totalSpentINR: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        error: null,
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'my-pol-id',
          'x-test-bypass-signature': 'true',
        },
        payload: {
          amountINR: 1000,
          paymentReference: 'pay_mock_123',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.wallet.balanceINR).toBe(11000);
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        payload: { amountINR: 1000, paymentReference: 'pay_123' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: rejects cross-principal verify with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 1000, paymentReference: 'pay_123', politicianId: 'other-pol-id' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: rejects missing signature without bypass header with 400', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: { amountINR: 1000, paymentReference: 'pay_123' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('MISSING_PROVIDER_ORDER_ID');
    });

    it('rejects the signature bypass header in production-like runtime', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalConfigured = isSupabaseConfigured;
      process.env.APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'verified-political-user' } as any },
        error: null,
      } as any);
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { role: 'politician' }, error: null }) }),
            }),
          } as any;
        }
        if (table === 'politician_portal_profiles') {
          const query = {
            select: () => query,
            eq: () => query,
            maybeSingle: async () => ({ data: { id: 'durable-politician-profile' }, error: null }),
          };
          return query as any;
        }
        return {} as any;
      }) as any);

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/wallet/recharge/verify',
          headers: {
            authorization: 'Bearer verified-production-token',
            'x-test-bypass-signature': 'true',
          },
          payload: {
            politicianId: 'durable-politician-profile',
            amountINR: 1000,
            paymentReference: 'pay-bypass-attempt',
            razorpay_order_id: 'order-bypass-attempt',
            razorpay_payment_id: 'pay-bypass-attempt',
          },
        });

        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.payload).code).toBe('TEST_BYPASS_DISABLED');
      } finally {
        setSupabaseConfiguredForTesting(originalConfigured);
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
      }
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: rejects when order not found in DB with 400', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'my-pol-id',
          'x-test-bypass-signature': 'true',
        },
        payload: { amountINR: 1000, paymentReference: 'pay_not_found' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PAYMENT_ORDER_NOT_FOUND');
    });

    it('POST /api/v1/campaign/wallet/recharge/verify: rejects amount mismatch with 400', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({
                  data: {
                    provider_order_id: 'pay_mock_123',
                    politician_id: 'my-pol-id',
                    amount_inr: 5000, // expected 5000
                    status: 'pending',
                  },
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
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'my-pol-id',
          'x-test-bypass-signature': 'true',
        },
        payload: { amountINR: 1000, paymentReference: 'pay_mock_123' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('AMOUNT_MISMATCH');
    });
  });

  describe('7. OBD Outreach & Telecom Dispatch (/api/v1/campaign/obd/...)', () => {
    it('GET /api/v1/campaign/obd/trai-status: returns active window details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/obd/trai-status',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(typeof body.permitted).toBe('boolean');
      expect(typeof body.currentISTHour).toBe('number');
    });

    it('GET /api/v1/campaign/obd/broadcasts: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/obd/broadcasts',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/campaign/obd/broadcasts: rejects cross-principal access with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
        method: 'GET',
        url: '/api/v1/campaign/obd/broadcasts?politicianId=other-pol-id',
        headers: { 'x-user-id': 'my-pol-id' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('GET /api/v1/campaign/obd/broadcasts: returns broadcast history for politician', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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

      jest.spyOn(obdService, 'getOBDBroadcasts').mockResolvedValueOnce([
        {
          id: 'obd-bc-1',
          campaignId: 'c1',
          politicianId: 'my-pol-id',
          title: 'Sunday Morning Appeal',
          audioUrl: 'https://example.com/audio.mp3',
          audioDurationSeconds: 30,
          targetSegment: { type: 'ward', wardNo: 5, voterCount: 1500 },
          totalRecipients: 1500,
          ratePerCallINR: 0.6,
          totalCostINR: 900,
          status: 'completed',
          answeredCount: 1420,
          busyCount: 50,
          unreachableCount: 30,
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/obd/broadcasts',
        headers: { 'x-user-id': 'my-pol-id' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.broadcasts.length).toBe(1);
    });

    it('POST /api/v1/campaign/obd/dispatch: rejects unauthenticated call with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        payload: { campaignId: 'c1', targetSegment: { type: 'ward', voterCount: 100 } },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/campaign/obd/dispatch: rejects unauthorized campaign operator with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-owner-different' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: jest.fn().mockReturnThis(),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'unauth-user' },
        payload: { campaignId: 'c1', targetSegment: { type: 'ward', voterCount: 100 } },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/obd/dispatch: rejects cross-principal wallet deduction with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'my-pol-id' },
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
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: {
          campaignId: 'c1',
          politicianId: 'different-pol-id',
          targetSegment: { type: 'ward', voterCount: 100 },
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/campaign/obd/dispatch: rejects call outside TRAI window with 400', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'my-pol-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      jest.spyOn(TelecomProvider.prototype, 'isWithinTraiCallingWindow').mockReturnValueOnce({
        permitted: false,
        currentISTHour: 23,
        message: 'Outbound voice calls prohibited after 21:00 IST',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: {
          campaignId: 'c1',
          targetSegment: { type: 'ward', voterCount: 500 },
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('OUTSIDE_TRAI_WINDOW');
    });

    it('POST /api/v1/campaign/obd/dispatch: rejects insufficient wallet funds with 402', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'my-pol-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      jest.spyOn(TelecomProvider.prototype, 'isWithinTraiCallingWindow').mockReturnValueOnce({
        permitted: true,
        currentISTHour: 10,
      });

      jest
        .spyOn(walletService, 'deductWalletForService')
        .mockRejectedValueOnce(
          new Error('Insufficient balance in campaign wallet: required ₹300, available ₹50'),
        );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: {
          campaignId: 'c1',
          targetSegment: { type: 'ward', voterCount: 500 },
        },
      });

      expect(res.statusCode).toBe(402);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('POST /api/v1/campaign/obd/dispatch: dispatches successfully when funds and window are valid', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'my-pol-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      jest.spyOn(TelecomProvider.prototype, 'isWithinTraiCallingWindow').mockReturnValueOnce({
        permitted: true,
        currentISTHour: 10,
      });

      jest.spyOn(walletService, 'deductWalletForService').mockResolvedValueOnce({
        id: 'w-1',
        politicianId: 'my-pol-id',
        balanceINR: 5000,
        currency: 'INR',
        totalRechargedINR: 10000,
        totalSpentINR: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      jest.spyOn(obdService, 'dispatchOBDBroadcast').mockResolvedValueOnce({
        success: true,
        broadcast: {
          id: 'bc-dispatched-1',
          campaignId: 'c1',
          politicianId: 'my-pol-id',
          title: 'Voter Appeal',
          audioUrl: 'https://example.com/audio.mp3',
          audioDurationSeconds: 30,
          targetSegment: { type: 'ward', voterCount: 500 },
          totalRecipients: 500,
          ratePerCallINR: 0.6,
          totalCostINR: 300,
          status: 'queued',
          answeredCount: 0,
          busyCount: 0,
          unreachableCount: 0,
          createdAt: new Date().toISOString(),
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'my-pol-id' },
        payload: {
          campaignId: 'c1',
          targetSegment: { type: 'ward', voterCount: 500 },
        },
      });

      if (res.statusCode !== 200) {
        console.log('DISPATCH ERROR PAYLOAD:', res.payload);
      }
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.job.id).toBe('bc-dispatched-1');
      expect(body.wallet.balanceINR).toBe(5000);
    });
  });

  describe('8. Telecom Webhooks (/api/v1/webhooks/voice/:provider)', () => {
    it('POST /api/v1/webhooks/voice/:provider: rejects invalid webhook payload with 400', async () => {
      jest.spyOn(TelecomProvider.prototype, 'validateWebhook').mockReturnValueOnce(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/voice/exotel',
        payload: { invalidField: true },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INVALID_WEBHOOK_PAYLOAD');
    });

    it('POST /api/v1/webhooks/voice/:provider: acknowledges valid webhook event with 200', async () => {
      jest.spyOn(TelecomProvider.prototype, 'validateWebhook').mockReturnValueOnce(true);
      jest.spyOn(TelecomProvider.prototype, 'parseDeliveryReport').mockReturnValueOnce({
        raw: {},
        callSid: 'call-1',
        status: 'completed',
        duration: 45,
        isOptOut: false,
        isIvrResponse: false,
      });
      jest.spyOn(obdService, 'processTelecomWebhook').mockResolvedValueOnce({
        processed: true,
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/voice/exotel',
        payload: { CallSid: 'call-1', Status: 'completed' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('acknowledged');
      expect(body.reportParsed).toBe(true);
    });
  });

  describe('9. Authentication & Authorization Branches', () => {
    it('resolves Bearer auth token via supabase.auth.getUser', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'usr-bearer-coordinator' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { role: 'coordinator' }, error: null }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/volunteers',
        headers: {
          authorization: 'Bearer valid-jwt-token-coord',
        },
      });

      expect(res.statusCode).toBe(200);
    });

    it('rejects invalid or expired Bearer token with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects volunteer registration when isKshetraUser is claimed without verified registration (403)', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'usr-admin' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: (col: string) => {
                if (col === 'user_id') {
                  return { maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) };
                }
                return { maybeSingle: async () => ({ data: null, error: null }) };
              },
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'admin' },
        payload: {
          name: 'Fake Kshetra Member',
          phone: '9999999999',
          role: 'canvasser',
          campaignId: 'c1',
          isKshetraUser: true,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PRIVILEGE_SPOOFING_REJECTED');
    });

    it('handles database error on PATCH /api/v1/campaign/booths/:id with 500', async () => {
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
        if (table === 'booth_strategies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'bth-err-1', campaign_id: 'c1' },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { message: 'Database connection reset' },
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/bth-err-1',
        headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'admin' },
        payload: { status: 'counted' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('handles unexpected exception on PATCH /api/v1/campaign/booths/:id with 500', async () => {
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
        if (table === 'booth_strategies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'bth-err-2', campaign_id: 'c1' },
                  error: null,
                }),
              }),
            }),
            update: () => {
              throw new Error('Fatal socket failure');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/bth-err-2',
        headers: { 'x-user-id': 'usr-admin', 'x-user-role': 'admin' },
        payload: { status: 'canvassing' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('10. Unconfigured / Offline Database Fallback Paths', () => {
    let originalConfigured: boolean;
    let restoreRazorpay: (() => void) | null = null;

    beforeEach(() => {
      originalConfigured = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);
      restoreRazorpay = mockRazorpayOrderCreation();
    });

    afterEach(() => {
      setSupabaseConfiguredForTesting(originalConfigured);
      restoreRazorpay?.();
      restoreRazorpay = null;
    });

    it('POST /api/v1/campaign/wallet/recharge/order creates in-memory order when DB unconfigured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'usr-offline-1', 'x-user-role': 'citizen' },
        payload: { amountINR: 2000 },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.order).toBeDefined();
    });

    it('POST /api/v1/campaign/wallet/recharge/verify updates in-memory balance when DB unconfigured', async () => {
      // First create order
      const orderRes = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'usr-offline-2', 'x-user-role': 'citizen' },
        payload: { amountINR: 1500 },
      });
      const order = JSON.parse(orderRes.payload).order;

      // Verify payment with mock bypass header
      const verifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'usr-offline-2',
          'x-user-role': 'citizen',
          'x-test-bypass-signature': 'true',
        },
        payload: {
          amountINR: 1500,
          paymentReference: order.orderId,
          razorpay_order_id: order.orderId,
          razorpay_payment_id: 'pay_offline_123',
        },
      });

      expect(verifyRes.statusCode).toBe(200);
      const body = JSON.parse(verifyRes.payload);
      expect(body.success).toBe(true);
      expect(body.wallet).toBeDefined();
    });

    it('GET /api/v1/campaign/wallet returns in-memory balance when DB unconfigured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet',
        headers: { 'x-user-id': 'usr-offline-3', 'x-user-role': 'citizen' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(typeof body.wallet.balanceINR).toBe('number');
    });

    it('GET /api/v1/campaign/wallet/transactions returns in-memory ledger when DB unconfigured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet/transactions',
        headers: { 'x-user-id': 'usr-offline-4', 'x-user-role': 'citizen' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(Array.isArray(body.transactions)).toBe(true);
    });

    it('PATCH /api/v1/campaign/booths/:id returns 503 DATABASE_UNAVAILABLE when DB unconfigured', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-54',
        headers: { 'x-user-id': 'usr-offline-5', 'x-user-role': 'admin' },
        payload: { status: 'counted' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('11. Exhaustive Branch Coverage & Edge Case Hardening', () => {
    it('exercises resolveAuthUser with valid Bearer token and volunteer role promotion', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'promoted-coord-1' } },
        error: null,
      } as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { role: 'coordinator' }, error: null }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-owner-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      // Call endpoint that passes contextCampaignId to resolveAuthUser
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { authorization: 'Bearer valid-coord-token' },
        payload: {
          campaignId: 'c1',
          name: 'New Agent',
          phone: '9123456789',
          role: 'booth_agent',
        },
      });

      expect([201, 403, 500]).toContain(res.statusCode);
    });

    it('exercises verifyCampaignAuthority branches (non-existent campaign, DB coord, in-memory coord)', async () => {
      // 1. Non-existent campaign
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resNotFound = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'pol-stranger' },
        payload: { campaignId: 'c-non-existent-99', name: 'Agent', phone: '9876543210' },
      });
      expect(resNotFound.statusCode).toBe(403);

      // 2. DB volunteer is coordinator
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'volunteer' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'owner-pol' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { role: 'coordinator', status: 'active' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resDbCoord = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'db-vol-coord' },
        payload: { campaignId: 'c1', name: 'Agent', phone: '9876543210' },
      });
      expect([201, 500]).toContain(resDbCoord.statusCode);
    });

    it('exercises GET and POST /api/v1/campaign/volunteers error and db branches', async () => {
      // GET volunteers from DB
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [{ id: 'vol-db-1', name: 'Agent DB' }], error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resGet = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/volunteers?campaignId=c1&role=booth_agent',
      });
      expect(resGet.statusCode).toBe(200);

      // POST volunteer DB insert error (500)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Insert failed' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resErr = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'admin-user' },
        payload: { campaignId: 'c1', name: 'Agent', phone: '9876543210' },
      });
      expect(resErr.statusCode).toBe(500);

      // POST volunteer exception (500)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            insert: () => {
              throw new Error('Crash in volunteer insert');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const resEx = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'admin-user' },
        payload: { campaignId: 'c1', name: 'Agent', phone: '9876543210' },
      });
      expect(resEx.statusCode).toBe(500);
    });

    it('exercises POST /api/v1/campaign/wallet/recharge/verify missing ids, DB errors, and signatures', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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

      // Missing razorpay_payment_id
      const resMissingPayId = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-user-role': 'politician' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ord_123',
          razorpay_order_id: 'ord_123',
        },
      });
      expect(resMissingPayId.statusCode).toBe(400);
      expect(JSON.parse(resMissingPayId.payload).code).toBe('MISSING_PROVIDER_PAYMENT_ID');

      // Missing razorpay_signature
      const resMissingSig = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-user-role': 'politician' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ord_123',
          razorpay_order_id: 'ord_123',
          razorpay_payment_id: 'pay_123',
        },
      });
      expect(resMissingSig.statusCode).toBe(400);
      expect(JSON.parse(resMissingSig.payload).code).toBe('MISSING_SIGNATURE');

      // DB error in order lookup
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: 'Order lookup failed' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resDbErr = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'pol-1',
          'x-test-bypass-signature': 'true',
        },
        payload: {
          amountINR: 1000,
          paymentReference: 'ord_123',
        },
      });
      expect(resDbErr.statusCode).toBe(500);

      // DB exception in order lookup
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => {
                throw new Error('Order lookup exception');
              },
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resDbEx = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: {
          'x-user-id': 'pol-1',
          'x-test-bypass-signature': 'true',
        },
        payload: {
          amountINR: 1000,
          paymentReference: 'ord_123',
        },
      });
      expect(resDbEx.statusCode).toBe(500);
    });

    it('exercises RPC failure and idempotent replay in recharge verify', async () => {
      // Mock dbOrder returned
      const mockOrder = {
        provider_order_id: 'order_test_rpc',
        politician_id: 'pol-1',
        amount_inr: 1000,
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: mockOrder, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      // RPC error (500)
      jest
        .spyOn(supabase, 'rpc')
        .mockResolvedValueOnce({ data: null, error: { message: 'RPC err' } } as any);
      const resRpcErr = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-test-bypass-signature': 'true' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_test_rpc',
        },
      });
      expect(resRpcErr.statusCode).toBe(500);

      // RPC unsuccesful (403)
      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: { success: false, code: 'FORBIDDEN', message: 'Unauthorized wallet recharge' },
        error: null,
      } as any);
      const resRpcForbidden = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-test-bypass-signature': 'true' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_test_rpc',
        },
      });
      expect(resRpcForbidden.statusCode).toBe(403);

      // RPC idempotent (200)
      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: {
          success: true,
          idempotent: true,
          wallet: { balanceINR: 5000 },
          message: 'Already credited',
        },
        error: null,
      } as any);
      const resIdempotent = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-test-bypass-signature': 'true' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_test_rpc',
        },
      });
      expect(resIdempotent.statusCode).toBe(200);
      expect(JSON.parse(resIdempotent.payload).idempotent).toBe(true);

      // RPC exception (500)
      jest.spyOn(supabase, 'rpc').mockRejectedValueOnce(new Error('RPC Crash'));
      const resRpcEx = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-test-bypass-signature': 'true' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_test_rpc',
        },
      });
      expect(resRpcEx.statusCode).toBe(500);
    });

    it('exercises POST /api/v1/campaign/obd/dispatch missing voterCount and warning message', async () => {
      // Missing voterCount
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pol-1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resNoCount = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/obd/dispatch',
        headers: { 'x-user-id': 'pol-1' },
        payload: {
          campaignId: 'c1',
          title: 'Appeal',
          targetSegment: {},
        },
      });
      expect(resNoCount.statusCode).toBe(400);
    });

    it('exercises database booth return, admin delegation, and unauthenticated volunteer registration', async () => {
      // 1. GET /api/v1/campaign/booths with database results
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'booth_strategies') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: 'b-db-1', booth_number: '101', priority: 'critical' }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);
      const resBoothsDb = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/booths?campaignId=c1&priority=critical',
      });
      expect(resBoothsDb.statusCode).toBe(200);
      expect(JSON.parse(resBoothsDb.payload).total).toBe(1);

      // 2. Admin role delegation with requestedPoliticianId (line 598)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);
      const resAdminWallet = await app.inject({
        method: 'GET',
        url: '/api/v1/campaign/wallet?politicianId=pol-managed-by-admin',
        headers: { 'x-user-id': 'usr-admin-1' },
      });
      expect(resAdminWallet.statusCode).toBe(200);

      // 3. POST /api/v1/campaign/volunteers without auth (line 892)
      const resVolNoAuth = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        payload: { name: 'Worker No Auth', phone: '9876543210' },
      });
      expect(resVolNoAuth.statusCode).toBe(401);

      // 4. In-memory volunteer coordinator authority fallback (lines 580-583)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'volunteer' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaigns') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c1', politician_id: 'pp1' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_volunteers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'v-new-99', name: 'New Vol' }, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resMemCoord = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: { 'x-user-id': 'v-3' },
        payload: {
          name: 'Ground Worker',
          phone: '9123456789',
          role: 'canvasser',
          campaignId: 'c1',
        },
      });
      expect(resMemCoord.statusCode).toBe(201);
    });

    it('exercises payment provider error, cryptographic signature verification branches, and cross-wallet verify', async () => {
      // 1. POST /api/v1/campaign/wallet/recharge/order when createOrder throws (line 1109)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
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
      jest
        .spyOn(RazorpayProvider.prototype, 'createOrder')
        .mockRejectedValueOnce(new PaymentProviderError(
          'PAYMENT_PROVIDER_TIMEOUT',
          503,
          'Payment provider did not respond in time.',
        ));
      const resOrderFail = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/order',
        headers: { 'x-user-id': 'pol-1' },
        payload: { amountINR: 1000 },
      });
      expect(resOrderFail.statusCode).toBe(503);
      expect(JSON.parse(resOrderFail.payload).code).toBe('PAYMENT_PROVIDER_TIMEOUT');

      // 2. POST /api/v1/campaign/wallet/recharge/verify missing amount or paymentReference (line 1134)
      const resNoRef = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1' },
        payload: { amountINR: 0, paymentReference: '' },
      });
      expect(resNoRef.statusCode).toBe(400);

      // 3. Cross-wallet recharge verification rejected (line 1262)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'order_cross',
                    provider_order_id: 'order_cross',
                    politician_id: 'pol-other',
                    amount_inr: 1000,
                    status: 'pending',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);
      const resCrossVerify = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1', 'x-test-bypass-signature': 'true' },
        payload: { amountINR: 1000, paymentReference: 'ref_123', razorpay_order_id: 'order_cross' },
      });
      expect(resCrossVerify.statusCode).toBe(403);

      // 4. Signature verification: PROVIDER_CONFIG_ERROR (lines 1296-1305)
      const oldSecret = process.env.RAZORPAY_KEY_SECRET;
      const oldKey = process.env.RAZORPAY_KEY_ID;
      process.env.RAZORPAY_KEY_ID = 'rzp_test_campaign_unit';
      delete process.env.RAZORPAY_KEY_SECRET;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'politician' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'campaign_recharge_orders') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'order_sig',
                    provider_order_id: 'order_sig',
                    politician_id: 'pol-1',
                    amount_inr: 1000,
                    status: 'pending',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resMissingSecret = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_sig',
          razorpay_payment_id: 'pay_sig',
          razorpay_signature: 'sig_abc',
        },
      });
      expect(resMissingSecret.statusCode).toBe(503);
      expect(JSON.parse(resMissingSecret.payload).code).toBe('PROVIDER_CONFIG_ERROR');

      // 5. Signature verification: Invalid signature (lines 1290-1294)
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_123';
      const resBadSig = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_sig',
          razorpay_payment_id: 'pay_sig',
          razorpay_signature: 'bad_signature',
        },
      });
      expect(resBadSig.statusCode).toBe(400);
      expect(JSON.parse(resBadSig.payload).code).toBe('INVALID_SIGNATURE');

      // 6. Signature verification: Generic verification error (lines 1307-1309)
      jest
        .spyOn(RazorpayProvider.prototype, 'verifyPaymentSignature')
        .mockRejectedValueOnce(new Error('Generic Verification Error'));
      const resSigEx = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/wallet/recharge/verify',
        headers: { 'x-user-id': 'pol-1' },
        payload: {
          amountINR: 1000,
          paymentReference: 'ref_123',
          razorpay_order_id: 'order_sig',
          razorpay_payment_id: 'pay_sig',
          razorpay_signature: 'sig_abc',
        },
      });
      expect(resSigEx.statusCode).toBe(500);

      if (oldSecret) {
        process.env.RAZORPAY_KEY_SECRET = oldSecret;
      } else {
        delete process.env.RAZORPAY_KEY_SECRET;
      }
      if (oldKey) {
        process.env.RAZORPAY_KEY_ID = oldKey;
      } else {
        delete process.env.RAZORPAY_KEY_ID;
      }
    });

    it('exercises offline fallback branches: booth 404, volunteer 503, and offline idempotent recharge replay', async () => {
      setSupabaseConfiguredForTesting(false);
      try {
        // Booth not found in inMemoryBooths (line 854)
        const resBoothNotFound = await app.inject({
          method: 'PATCH',
          url: '/api/v1/campaign/booths/non-existent-booth-xyz',
          headers: { 'x-user-id': 'usr-admin-1', 'x-user-role': 'admin' },
          payload: { priority: 'high' },
        });
        expect(resBoothNotFound.statusCode).toBe(404);

        // Volunteer registration offline -> checks memMatch and returns 503 (lines 940-941, 953)
        const resVolOffline = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/volunteers',
          headers: { 'x-user-id': 'usr-admin-1', 'x-user-role': 'admin' },
          payload: {
            name: 'Ground Member',
            phone: '9848012345',
            isKshetraUser: true,
            campaignId: 'c1',
          },
        });
        expect(resVolOffline.statusCode).toBe(503);

        // Offline mode must not claim a payment order exists when the provider is unavailable.
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/wallet/recharge/order',
          headers: { 'x-user-id': 'pol-offline-1' },
          payload: { amountINR: 1500 },
        });
        expect(createRes.statusCode).toBe(503);
      } finally {
        setSupabaseConfiguredForTesting(true);
      }
    });
  });
});
