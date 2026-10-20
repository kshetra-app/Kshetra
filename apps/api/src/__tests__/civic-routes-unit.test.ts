import Fastify, { FastifyInstance } from 'fastify';
import { civicRoutes } from '../routes/civic';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

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
  });

  describe('1. State Budget Summary (/api/v1/civic/budget/:stateCode)', () => {
    it('returns budget placeholder envelope for valid 2-letter uppercase state code', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/budget/TS',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.stateCode).toBe('TS');
      expect(body.message).toContain('Budget endpoint');
    });

    it('rejects invalid state code format with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/budget/invalid_state',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('2. Legislator Attendance (/api/v1/civic/attendance)', () => {
    it('returns attendance listing and echoes query filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/attendance?state=TS&sessionYear=2024&page=1&limit=20',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.attendance)).toBe(true);
      expect(body.total).toBe(0);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.sessionYear).toBe('2024');
    });

    it('rejects limit exceeding 100 with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/attendance?limit=150',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('3. Bills and Legislation (/api/v1/civic/bills)', () => {
    it('returns bills listing with filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/bills?state=TS&status=passed&type=government',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.bills)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.status).toBe('passed');
      expect(body.filters.type).toBe('government');
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

    it('records support opinion successfully in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        let updatePayload: any = null;
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'bills') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { public_opinion: { support: 5, oppose: 2, neutral: 0 } },
                    error: null,
                  }),
                }),
              }),
              update: (payload: any) => {
                updatePayload = payload;
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
          url: '/api/v1/civic/bills/bill-001/opinion',
          headers: { 'x-user-id': 'user-1' },
          payload: { support: true },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.billId).toBe('bill-001');
        expect(body.support).toBe(true);
        expect(updatePayload.public_opinion.support).toBe(6);
        expect(updatePayload.public_opinion.oppose).toBe(2);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('records oppose opinion with null initial opinion in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        let updatePayload: any = null;
        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'bills') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { public_opinion: null },
                    error: null,
                  }),
                }),
              }),
              update: (payload: any) => {
                updatePayload = payload;
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
          url: '/api/v1/civic/bills/bill-001/opinion',
          headers: { 'x-user-id': 'user-1' },
          payload: { support: false },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.support).toBe(false);
        expect(updatePayload.public_opinion.oppose).toBe(1);
        expect(updatePayload.public_opinion.support).toBe(0);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns 404 in production mode if bill does not exist', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
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
          url: '/api/v1/civic/bills/nonexistent-bill/opinion',
          headers: { 'x-user-id': 'user-1' },
          payload: { support: true },
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
          if (table === 'bills') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { message: 'DB connection failure' },
                  }),
                }),
              }),
            } as any;
          }
          return {} as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/civic/bills/bill-err/opinion',
          headers: { 'x-user-id': 'user-1' },
          payload: { support: true },
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
          if (table === 'bills') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { public_opinion: { support: 1, oppose: 0 } },
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
          method: 'POST',
          url: '/api/v1/civic/bills/bill-update-err/opinion',
          headers: { 'x-user-id': 'user-1' },
          payload: { support: true },
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('DATABASE_ERROR');
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
                maybeSingle: async () => ({ data: { public_opinion: { support: 1 } }, error: null }),
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
    it('returns schemes listing and echoes query filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/schemes?state=TS&category=agriculture&level=state',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.schemes)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.category).toBe('agriculture');
      expect(body.filters.level).toBe('state');
    });
  });

  describe('6. Development Projects (/api/v1/civic/projects)', () => {
    it('returns development projects listing with filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/projects?state=TS&phase=under_construction&category=roads&constituency=AC-065',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.projects)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.phase).toBe('under_construction');
      expect(body.filters.category).toBe('roads');
      expect(body.filters.constituency).toBe('AC-065');
    });
  });

  describe('7. Public RTI Requests Listing (/api/v1/civic/rti)', () => {
    it('returns RTI listing and echoes query filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/rti?state=TS&status=replied&department=Irrigation',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.rtiRequests)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.status).toBe('replied');
      expect(body.filters.department).toBe('Irrigation');
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
          headers: { 'x-user-id': 'user-1' },
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
          headers: { 'x-user-id': 'user-1' },
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
          headers: { 'x-user-id': 'user-1' },
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
          headers: { 'x-user-id': 'user-1' },
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
          headers: { 'x-user-id': 'user-1' },
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
          headers: { 'x-user-id': 'user-1' },
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
    it('returns public hearings listing with filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/hearings?state=TS&type=assembly&upcoming=true',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.hearings)).toBe(true);
      expect(body.filters.state).toBe('TS');
      expect(body.filters.type).toBe('assembly');
      expect(body.filters.upcoming).toBe('true');
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
