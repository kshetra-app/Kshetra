import Fastify, { FastifyInstance } from 'fastify';
import { civicRoutes } from '../routes/civic';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

const mockProductionAuth = (userId: string) => {
  setSupabaseConfiguredForTesting(true);
  jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
    data: { user: { id: userId } as any },
    error: null,
  });
  return { authorization: `Bearer test-user-${userId}` };
};

describe('Civic Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(civicRoutes);
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
    // Default safe mock to prevent unmocked calls triggering network lookups
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
          }),
        }),
      } as any;
    }) as any);
    jest.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { message: 'RPC not configured for this test' },
    } as any);
  });

  describe('1. State Budget Summary (/api/v1/civic/budget/:stateCode)', () => {
    it('returns the stored budget record or explicit unknown when none is available', async () => {
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'state_budget_summaries') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
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
        url: '/api/v1/civic/budget/TS',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.stateCode).toBe('TS');
      expect(body.message).toBe('No state budget record is available yet.');
      expect(body.budget).toBeNull();
    });

    it('rejects invalid state code format with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/budget/invalid_state',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('3. Bills and Legislation (/api/v1/civic/bills)', () => {
    it('returns stored bills with filters and pagination', async () => {
      const queryCalls: Array<[string, unknown]> = [];
      const query: any = {
        eq: (field: string, value: unknown) => {
          queryCalls.push([field, value]);
          return query;
        },
        order: () => query,
        range: async (from: number, to: number) => ({
          data: [{ id: 'bill-1', state_code: 'TS', status: 'introduced', type: 'ordinary' }],
          count: 1,
          error: null,
          range: [from, to],
        }),
      };
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table !== 'bills') return {} as any;
        return { select: () => query } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/bills?state=TS&status=introduced&type=ordinary&page=2&limit=10',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.bills).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.status).toBe('introduced');
      expect(body.filters.type).toBe('ordinary');
      expect(queryCalls).toEqual([
        ['state_code', 'TS'],
        ['status', 'introduced'],
        ['type', 'ordinary'],
      ]);
    });

    it('replaces legacy opinion JSON with counts derived from unique opinion records', async () => {
      const query: any = {
        eq: () => query,
        order: () => query,
        range: async () => ({
          data: [
            {
              id: 'bill-1',
              state_code: 'TS',
              public_opinion: { support: 999, oppose: 0, neutral: 0 },
            },
          ],
          count: 1,
          error: null,
        }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((table: string) =>
          table === 'bills' ? ({ select: () => query } as any) : ({} as any)) as any);
      const rpc = jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [{ bill_id: 'bill-1', support: 3, oppose: 1, neutral: 0 }],
        error: null,
      } as any);

      const res = await app.inject({ method: 'GET', url: '/api/v1/civic/bills?state=TS' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).bills[0].public_opinion).toEqual({
        support: 3,
        oppose: 1,
        neutral: 0,
      });
      expect(rpc).toHaveBeenCalledWith('get_bill_opinion_counts', { p_bill_ids: ['bill-1'] });
    });

    it('marks opinion counts unknown when the count source is unavailable', async () => {
      const query: any = {
        eq: () => query,
        order: () => query,
        range: async () => ({ data: [{ id: 'bill-1', state_code: 'TS' }], count: 1, error: null }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((table: string) =>
          table === 'bills' ? ({ select: () => query } as any) : ({} as any)) as any);
      jest
        .spyOn(supabase, 'rpc')
        .mockResolvedValue({ data: null, error: { message: 'Missing migration' } } as any);

      const res = await app.inject({ method: 'GET', url: '/api/v1/civic/bills?state=TS' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).bills[0].public_opinion).toEqual({
        support: null,
        oppose: null,
        neutral: null,
      });
    });

    it('returns 503 rather than a false empty list when production storage is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/civic/bills?state=TS' });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('CIVIC_BILLS_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
        setSupabaseConfiguredForTesting(true);
      }
    });
  });

  describe('4. Support/Oppose Bill Opinion (/api/v1/civic/bills/:id/opinion)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-001/opinion',
        payload: { support: true },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 503 when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-001/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: true },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('rejects invalid body payload with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-001/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: 'not-a-boolean' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('records support through the idempotent RPC and returns its authoritative totals', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const rpc = jest.spyOn(supabase, 'rpc').mockResolvedValue({
          data: [{ bill_id: 'bill-001', support: 6, oppose: 2, neutral: 0 }],
          error: null,
        } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/bill-001/opinion',
          headers: mockProductionAuth('user-1'),
          payload: { support: true },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.billId).toBe('bill-001');
        expect(body.support).toBe(true);
        expect(body.publicOpinion).toEqual({ support: 6, oppose: 2, neutral: 0 });
        expect(rpc).toHaveBeenCalledWith('record_bill_opinion', {
          p_bill_id: 'bill-001',
          p_user_id: 'user-1',
          p_support: true,
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns authoritative oppose totals in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'rpc').mockResolvedValue({
          data: [{ bill_id: 'bill-001', support: 0, oppose: 1, neutral: 0 }],
          error: null,
        } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/bill-001/opinion',
          headers: mockProductionAuth('user-1'),
          payload: { support: false },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.support).toBe(false);
        expect(body.publicOpinion).toEqual({ support: 0, oppose: 1, neutral: 0 });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 404 in production mode if bill does not exist', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'rpc').mockResolvedValue({
          data: null,
          error: { code: '23503', message: 'Bill does not exist' },
        } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/nonexistent-bill/opinion',
          headers: mockProductionAuth('user-1'),
          payload: { support: true },
        });

        expect(res.statusCode).toBe(404);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('NOT_FOUND');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 503 in production mode when opinion storage is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'rpc').mockResolvedValue({
          data: null,
          error: { message: 'DB connection failure' },
        } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/bill-err/opinion',
          headers: mockProductionAuth('user-1'),
          payload: { support: true },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('CIVIC_BILL_OPINION_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 503 in production mode when an RPC response has no valid totals', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: [], error: null } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/bill-update-err/opinion',
          headers: mockProductionAuth('user-1'),
          payload: { support: true },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('CIVIC_BILL_OPINION_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns non-production mock fallback when not in production', async () => {
      // In NODE_ENV='test', error/not found falls back gracefully
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'bills') {
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
        url: '/api/v1/civic/bills/bill-fallback/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: true },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.billId).toBe('bill-fallback');
    });

    it('returns non-production fallback on fetch error in test mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'bills') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: { message: 'fetch error' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-err-fb/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: true },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });

    it('returns non-production fallback on update error in test mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'bills') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { public_opinion: { support: 1 } },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: { message: 'update error' } }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-upd-fb/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: true },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });
  });

  describe('5. Government Schemes (/api/v1/civic/schemes)', () => {
    it('applies state, category, and level filters with exact paginated totals', async () => {
      const calls: Array<[string, unknown]> = [];
      const query: any = {
        or: (value: string) => {
          calls.push(['or', value]);
          return query;
        },
        eq: (field: string, value: unknown) => {
          calls.push([field, value]);
          return query;
        },
        order: () => query,
        range: async (from: number, to: number) => ({
          data: [{ id: 'scheme-1', name: 'Test scheme', state_code: 'TS', level: 'state' }],
          count: 31,
          error: null,
          range: [from, to],
        }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((table: string) =>
          table === 'government_schemes' ? ({ select: () => query } as any) : ({} as any)) as any);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/schemes?state=TS&category=agriculture&level=state&page=2&limit=10',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.schemes).toHaveLength(1);
      expect(body.total).toBe(31);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.category).toBe('agriculture');
      expect(body.filters.level).toBe('state');
      expect(calls).toEqual([
        ['or', 'state_code.eq.TS,state_code.is.null'],
        ['category', 'agriculture'],
        ['level', 'state'],
      ]);
    });

    it('returns 503 instead of development fallback when production storage is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/civic/schemes?state=TS' });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('CIVIC_SCHEMES_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
        setSupabaseConfiguredForTesting(true);
      }
    });
  });

  describe('6. Development Projects (/api/v1/civic/projects)', () => {
    it('applies state, phase, category, and AC number filters with exact paginated totals', async () => {
      const calls: Array<[string, unknown]> = [];
      const query: any = {
        eq: (field: string, value: unknown) => {
          calls.push([field, value]);
          return query;
        },
        order: () => query,
        range: async (from: number, to: number) => ({
          data: [
            { id: 'project-1', state_code: 'TS', phase: 'under_construction', category: 'road' },
          ],
          count: 21,
          error: null,
          range: [from, to],
        }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((table: string) =>
          table === 'development_projects'
            ? ({ select: () => query } as any)
            : ({} as any)) as any);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/projects?state=TS&phase=under_construction&category=road&constituency=AC-065&page=2&limit=10',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.projects).toHaveLength(1);
      expect(body.total).toBe(21);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.phase).toBe('under_construction');
      expect(body.filters.category).toBe('road');
      expect(body.filters.constituency).toBe('AC-065');
      expect(calls).toEqual([
        ['state_code', 'TS'],
        ['constituency_ac_no', 65],
        ['category', 'road'],
        ['phase', 'under_construction'],
      ]);
    });

    it('returns 503 instead of development fallback when production storage is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/civic/projects?state=TS' });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('CIVIC_PROJECTS_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
        setSupabaseConfiguredForTesting(true);
      }
    });
  });

  describe('7. Public RTI Requests Listing (/api/v1/civic/rti)', () => {
    it('returns 503 instead of pretending the public listing is empty when production storage is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/civic/rti?state=TS' });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('CIVIC_RTI_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = originalEnv;
        setSupabaseConfiguredForTesting(true);
      }
    });

    it('returns stored public requests, excludes drafts and account identifiers, and echoes query filters', async () => {
      const calls: {
        select?: string;
        filters: Array<[string, unknown]>;
        order?: string;
        range?: [number, number];
      } = {
        filters: [],
      };
      const rows = [
        {
          id: 'rti-public-1',
          status: 'filed',
          subject: 'Road repair expenditure',
          state_code: 'TS',
          upvotes: 2,
        },
      ];
      const query: any = {
        eq: (field: string, value: unknown) => {
          calls.filters.push([field, value]);
          return query;
        },
        neq: (field: string, value: unknown) => {
          calls.filters.push([`not:${field}`, value]);
          return query;
        },
        order: (field: string) => {
          calls.order = field;
          return query;
        },
        range: async (from: number, to: number) => {
          calls.range = [from, to];
          return { data: rows, count: 1, error: null };
        },
      };
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table !== 'rti_requests') return {} as any;
        return {
          select: (columns: string) => {
            calls.select = columns;
            return query;
          },
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/rti?state=TS&status=information_received&department=Irrigation',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.rtiRequests)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.status).toBe('information_received');
      expect(body.filters.department).toBe('Irrigation');
      expect(body.rtiRequests).toEqual(rows);
      expect(calls.filters).toContainEqual(['is_public', true]);
      expect(calls.filters).toContainEqual(['not:status', 'draft']);
      expect(calls.filters).toContainEqual(['state_code', 'TS']);
      expect(calls.filters).toContainEqual(['status', 'information_received']);
      expect(calls.select).not.toContain('user_id');
      expect(calls.range).toEqual([0, 49]);
    });

    it.each([
      ['/api/v1/civic/bills?state=TS', 'bills', 'CIVIC_BILLS_UNAVAILABLE'],
      ['/api/v1/civic/schemes?state=TS', 'government_schemes', 'CIVIC_SCHEMES_UNAVAILABLE'],
      ['/api/v1/civic/projects?state=TS', 'development_projects', 'CIVIC_PROJECTS_UNAVAILABLE'],
      ['/api/v1/civic/rti?state=TS', 'rti_requests', 'CIVIC_RTI_UNAVAILABLE'],
    ])('does not turn a missing exact count into zero for %s', async (url, table, code) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const query: any = {
        eq: () => query,
        neq: () => query,
        or: () => query,
        order: () => query,
        range: async () => ({ data: [], count: null, error: null }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((requestedTable: string) =>
          requestedTable === table ? ({ select: () => query } as any) : ({} as any)) as any);

      try {
        const res = await app.inject({ method: 'GET', url });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe(code);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it.each([
      ['/api/v1/civic/bills?state=TS', 'bills'],
      ['/api/v1/civic/schemes?state=TS', 'government_schemes'],
      ['/api/v1/civic/projects?state=TS', 'development_projects'],
      ['/api/v1/civic/rti?state=TS', 'rti_requests'],
    ])('preserves a confirmed empty result for %s', async (url, table) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const query: any = {
        eq: () => query,
        neq: () => query,
        or: () => query,
        order: () => query,
        range: async () => ({ data: [], count: 0, error: null }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((requestedTable: string) =>
          requestedTable === table ? ({ select: () => query } as any) : ({} as any)) as any);

      try {
        const res = await app.inject({ method: 'GET', url });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).total).toBe(0);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('8. File New RTI Request (/api/v1/civic/rti)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        payload: { subject: 'Road repair funds' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        headers: { 'x-user-id': 'user-1' },
        payload: { subject: 'Road repair funds' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('rejects missing subject with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        headers: { 'x-user-id': 'user-1' },
        payload: { department: 'Transport' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('successfully inserts RTI request in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        let insertedData: any = null;
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
            return {
              insert: (data: any) => {
                insertedData = data;
                return {
                  select: () => ({
                    single: async () => ({
                      data: { id: 'rti-uuid-101' },
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
          url: '/api/v1/civic/rti',
          headers: mockProductionAuth('user-1'),
          payload: {
            subject: 'Road maintenance expenditure',
            department: 'Public Works',
            description: 'Provide breakdown of funds spent in Q3',
            state: 'TS',
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.id).toBe('rti-uuid-101');
        expect(insertedData.subject).toBe('Road maintenance expenditure');
        expect(insertedData.department).toBe('Public Works');
        expect(insertedData.state_code).toBe('TS');
        expect(insertedData.status).toBe('draft');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 500 in production mode on insert failure', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { message: 'Database constraint violation' },
                  }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/rti',
          headers: mockProductionAuth('user-1'),
          payload: { subject: 'Road funds' },
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns non-production fallback on error in test mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'rti_requests') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Fail' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        headers: { 'x-user-id': 'user-1' },
        payload: { subject: 'Road funds fallback' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBe('rti-test-1');
    });
  });

  describe('9. Upvote RTI Request (/api/v1/civic/rti/:id/upvote)', () => {
    it('rejects unauthenticated upvote with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-1/upvote',
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-1/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('successfully increments RTI upvotes in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        let updatedVotes: any = null;
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { upvotes: 14 },
                    error: null,
                  }),
                }),
              }),
              update: (payload: any) => {
                updatedVotes = payload;
                return {
                  eq: async () => ({ error: null }),
                };
              },
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/rti/rti-101/upvote',
          headers: mockProductionAuth('user-1'),
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.rtiId).toBe('rti-101');
        expect(updatedVotes.upvotes).toBe(15);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 404 in production mode if RTI not found', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
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
          url: '/api/v1/civic/rti/nonexistent-rti/upvote',
          headers: mockProductionAuth('user-1'),
        });

        expect(res.statusCode).toBe(404);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('NOT_FOUND');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 500 in production mode on fetch error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: { message: 'Fetch failed' } }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/rti/rti-fetch-err/upvote',
          headers: mockProductionAuth('user-1'),
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 500 in production mode on update error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'rti_requests') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { upvotes: 2 }, error: null }),
                }),
              }),
              update: () => ({
                eq: async () => ({ error: { message: 'Update error' } }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/rti/rti-upd-err/upvote',
          headers: mockProductionAuth('user-1'),
        });

        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns non-production fallbacks on not found and errors in test mode', async () => {
      // 1. Not found fallback
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'rti_requests') {
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

      let res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-fallback-404/upvote',
        headers: { 'x-user-id': 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);

      // 2. Fetch error fallback
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'rti_requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: { message: 'err' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-fallback-fetch-err/upvote',
        headers: { 'x-user-id': 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);

      // 3. Update error fallback
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'rti_requests') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { upvotes: 1 }, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: { message: 'update failed' } }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-fallback-upd-err/upvote',
        headers: { 'x-user-id': 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });
  });

  describe('10. Public Hearings (/api/v1/civic/hearings)', () => {
    it('returns persisted upcoming hearings with validated filters, exact totals, and pagination', async () => {
      const filters: Array<[string, unknown]> = [];
      let selectedColumns = '';
      const query: any = {
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        },
        gte: (column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        },
        order: () => query,
        range: jest.fn(async (from: number, to: number) => ({
          data: [{ id: 'hearing-1', type: 'environment_clearance' }],
          count: 21,
          error: null,
          range: [from, to],
        })),
      };
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table !== 'public_hearings') return {} as any;
        return {
          select: (columns: string) => {
            selectedColumns = columns;
            return query;
          },
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/hearings?state=TS&type=environment_clearance&upcoming=true&page=2&limit=10',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.hearings).toHaveLength(1);
      expect(selectedColumns).not.toContain('attendee_count');
      expect(body.total).toBe(21);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.type).toBe('environment_clearance');
      expect(body.filters.upcoming).toBe('true');
      expect(filters).toEqual([
        ['state_code', 'TS'],
        ['type', 'environment_clearance'],
        ['date', expect.any(String)],
      ]);
      expect(query.range).toHaveBeenCalledWith(10, 19);
    });

    it('returns 503 rather than an empty success when production storage is not configured', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        const res = await app.inject({ method: 'GET', url: '/api/v1/civic/hearings?state=TS' });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('CIVIC_HEARINGS_UNAVAILABLE');
      } finally {
        if (originalEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalEnv;
        setSupabaseConfiguredForTesting(true);
      }
    });

    it('rejects an unsupported hearing type', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/civic/hearings?type=assembly' });
      expect(res.statusCode).toBe(400);
    });

    it('returns 503 when storage cannot provide an exact hearing count', async () => {
      const query: any = {
        eq: () => query,
        order: () => query,
        range: async () => ({ data: [], count: null, error: null }),
      };
      jest
        .spyOn(supabase, 'from')
        .mockImplementation(((table: string) =>
          table === 'public_hearings' ? ({ select: () => query } as any) : ({} as any)) as any);

      const res = await app.inject({ method: 'GET', url: '/api/v1/civic/hearings?state=TS' });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('CIVIC_HEARINGS_UNAVAILABLE');
    });
  });

  describe('11. Constituency Development Index (/api/v1/civic/cdi/:constituencyId)', () => {
    it('returns CDI envelope for valid constituency ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/cdi/AC-065',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.constituencyId).toBe('AC-065');
      expect(body.message).toContain('CDI endpoint');
    });
  });

  describe('12. Upvote Civic Issue (/api/v1/civic/issues/:id/upvote)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('successfully upvotes issue and upserts into issue_upvotes', async () => {
      let upserted: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_upvotes') {
          return {
            upsert: async (record: any) => {
              upserted = record;
              return { error: null };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-123/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.issueId).toBe('iss-123');
      expect(upserted.issue_id).toBe('iss-123');
      expect(upserted.user_id).toBe('user-1');
    });

    it('returns 500 when upvote upsert fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_upvotes') {
          return {
            upsert: async () => ({ error: { message: 'DB deadlock' } }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-err/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('13. Remove Upvote from Civic Issue (DELETE /api/v1/civic/issues/:id/upvote)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/civic/issues/iss-1/upvote',
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/civic/issues/iss-1/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('successfully removes upvote from issue', async () => {
      let deletedWhere: any = {};
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_upvotes') {
          return {
            delete: () => ({
              eq: (col1: string, val1: any) => {
                deletedWhere[col1] = val1;
                return {
                  eq: async (col2: string, val2: any) => {
                    deletedWhere[col2] = val2;
                    return { error: null };
                  },
                };
              },
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/civic/issues/iss-123/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(deletedWhere.issue_id).toBe('iss-123');
      expect(deletedWhere.user_id).toBe('user-1');
    });

    it('returns 500 when delete upvote fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_upvotes') {
          return {
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: { message: 'Delete error' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/civic/issues/iss-err/upvote',
        headers: { 'x-user-id': 'user-1' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('14. Follow / Unfollow Civic Issue (/api/v1/civic/issues/:id/follow)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/follow',
        payload: { follow: true },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/follow',
        headers: { 'x-user-id': 'user-1' },
        payload: { follow: true },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('successfully follows issue (follow: true)', async () => {
      let followedRecord: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_follows') {
          return {
            upsert: async (record: any) => {
              followedRecord = record;
              return { error: null };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-123/follow',
        headers: { 'x-user-id': 'user-1' },
        payload: { follow: true },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.following).toBe(true);
      expect(followedRecord.issue_id).toBe('iss-123');
      expect(followedRecord.user_id).toBe('user-1');
    });

    it('successfully unfollows issue (follow: false)', async () => {
      let deletedWhere: any = {};
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_follows') {
          return {
            delete: () => ({
              eq: (col1: string, val1: any) => {
                deletedWhere[col1] = val1;
                return {
                  eq: async (col2: string, val2: any) => {
                    deletedWhere[col2] = val2;
                    return { error: null };
                  },
                };
              },
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-123/follow',
        headers: { 'x-user-id': 'user-1' },
        payload: { follow: false },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.following).toBe(false);
      expect(deletedWhere.issue_id).toBe('iss-123');
      expect(deletedWhere.user_id).toBe('user-1');
    });

    it('returns 500 when follow upsert fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_follows') {
          return {
            upsert: async () => ({ error: { message: 'Upsert follow error' } }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-err/follow',
        headers: { 'x-user-id': 'user-1' },
        payload: { follow: true },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('returns 500 when unfollow delete fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_follows') {
          return {
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: { message: 'Unfollow error' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-err/follow',
        headers: { 'x-user-id': 'user-1' },
        payload: { follow: false },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('15. Report Civic Issue (POST /api/v1/civic/issues)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        payload: {
          title: 'Damaged water pipeline',
          category: 'water',
          stateCode: 'TS',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-1' },
        payload: {
          title: 'Damaged water pipeline',
          category: 'water',
          stateCode: 'TS',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('rejects missing category or stateCode with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-1' },
        payload: {
          title: 'Pothole on Main Road',
          // missing category and stateCode
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('successfully inserts civic issue', async () => {
      let insertedIssue: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            insert: (record: any) => {
              insertedIssue = record;
              return {
                select: () => ({
                  single: async () => ({
                    data: { id: 'iss-uuid-999' },
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
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-reporter' },
        payload: {
          title: 'Severe waterlogging at Begumpet Flyover',
          description: 'Road blocked due to heavy rains',
          category: 'water',
          severity: 'high',
          constituencyId: 'AC-065',
          stateCode: 'TS',
          mediaUrls: ['https://example.com/photo1.jpg'],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBe('iss-uuid-999');
      expect(insertedIssue.title).toBe('Severe waterlogging at Begumpet Flyover');
      expect(insertedIssue.reporter_id).toBe('user-reporter');
      expect(insertedIssue.severity).toBe('high');
      expect(insertedIssue.status).toBe('open');
    });

    it('returns 500 when civic issue insertion fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'Insert issue failed' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-1' },
        payload: {
          title: 'Broken street lights',
          category: 'electricity',
          stateCode: 'TS',
        },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('16. Update Civic Issue Status (PATCH /api/v1/civic/issues/:id/status)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        payload: { status: 'acknowledged' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: { 'x-user-id': 'user-1' },
        payload: { status: 'acknowledged' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('rejects invalid status enum with 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: { 'x-user-id': 'user-1' },
        payload: { status: 'unknown_status' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when issue is not found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
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
        url: '/api/v1/civic/issues/iss-404/status',
        headers: { 'x-user-id': 'user-1' },
        payload: { status: 'in_progress' },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('returns 500 when fetching issue fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: { message: 'Fetch err' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-err/status',
        headers: { 'x-user-id': 'user-1' },
        payload: { status: 'in_progress' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('rejects status update from unauthorized non-author citizen with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { reporter_id: 'original-reporter', status: 'open' },
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
        url: '/api/v1/civic/issues/iss-1/status',
        headers: {
          'x-user-id': 'stranger-citizen',
          'x-user-role': 'citizen',
        },
        payload: { status: 'resolved' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('allows issue reporter to update status to closed', async () => {
      let updatedStatus: any = null;
      let historyInserted: any = null;

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { reporter_id: 'author-user', status: 'open' },
                  error: null,
                }),
              }),
            }),
            update: (payload: any) => {
              updatedStatus = payload;
              return {
                eq: async () => ({ error: null }),
              };
            },
          } as any;
        }
        if (table === 'issue_status_history') {
          return {
            insert: async (entry: any) => {
              historyInserted = entry;
              return { error: null };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: {
          'x-user-id': 'author-user',
          'x-user-role': 'citizen',
        },
        payload: { status: 'closed', note: 'Issue was resolved by municipal team' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.status).toBe('closed');
      expect(updatedStatus.status).toBe('closed');
      expect(historyInserted.from_status).toBe('open');
      expect(historyInserted.to_status).toBe('closed');
      expect(historyInserted.note).toBe('Issue was resolved by municipal team');
    });

    it('allows privileged roles (official / admin / moderator / politician) to update status', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { reporter_id: 'some-citizen', status: 'open' },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          } as any;
        }
        if (table === 'issue_status_history') {
          return {
            insert: async () => ({ error: null }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: {
          'x-user-id': 'official-1',
          'x-user-role': 'official',
        },
        payload: { status: 'acknowledged' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.status).toBe('acknowledged');
    });

    it('returns 500 when updating civic issue status fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'civic_issues') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { reporter_id: 'author-user', status: 'open' },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: { message: 'Update failed' } }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: {
          'x-user-id': 'author-user',
          'x-user-role': 'citizen',
        },
        payload: { status: 'closed' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('17. Add Comment to Civic Issue (POST /api/v1/civic/issues/:id/comments)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/comments',
        payload: { body: 'We need this fixed urgently!' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 503 when database is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/comments',
        headers: { 'x-user-id': 'user-1' },
        payload: { body: 'Test comment' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('rejects empty comment body with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/comments',
        headers: { 'x-user-id': 'user-1' },
        payload: { body: '' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('successfully adds comment to civic issue', async () => {
      let insertedComment: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_comments') {
          return {
            insert: (record: any) => {
              insertedComment = record;
              return {
                select: () => ({
                  single: async () => ({
                    data: { id: 'comm-uuid-555' },
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
        url: '/api/v1/civic/issues/iss-123/comments',
        headers: { 'x-user-id': 'commenter-1' },
        payload: {
          body: 'Municipal team visited this morning to inspect.',
          userName: 'Ramesh K',
          imageUrl: 'https://example.com/inspection.jpg',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBe('comm-uuid-555');
      expect(body.issueId).toBe('iss-123');
      expect(insertedComment.body).toContain('Municipal team visited');
      expect(insertedComment.user_id).toBe('commenter-1');
      expect(insertedComment.user_name).toBe('Ramesh K');
    });

    it('returns 500 when adding comment fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_comments') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'Comment insertion failure' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-123/comments',
        headers: { 'x-user-id': 'commenter-1' },
        payload: { body: 'Inspection needed' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('18. Auth Resolution Edge Cases (resolveAuthUser)', () => {
    it('returns 401 when invalid Bearer token is provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
        headers: { authorization: 'Bearer invalid-token' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('authenticates successfully with valid Supabase auth token', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'supabase-auth-user-99' } as any },
        error: null,
      });

      let upsertedRecord: any = null;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'issue_upvotes') {
          return {
            upsert: async (record: any) => {
              upsertedRecord = record;
              return { error: null };
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
        headers: { authorization: 'Bearer valid-jwt-token-123' },
      });

      expect(res.statusCode).toBe(200);
      expect(upsertedRecord.user_id).toBe('supabase-auth-user-99');
    });
  });
});
