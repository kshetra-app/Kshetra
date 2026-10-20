import Fastify, { FastifyInstance } from 'fastify';
import { lmxRoutes } from '../routes/lmx';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';

describe('LMX (Live Media Exchange) Routes Unit Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(lmxRoutes);
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
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { role: 'journalist', verification_status: 'verified' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    }) as any);
  });

  describe('1. LMX Status (/api/v1/lmx/status)', () => {
    it('returns operational status envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/status',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('operational');
      expect(body.mediaPlane).toBe('self_hosted');
      expect(body.supabase).toBeDefined();
    });
  });

  describe('2. Public Live Tab Feed (/api/v1/lmx/live)', () => {
    it('returns filtered live events from database', async () => {
      const mockEvents = [
        {
          id: 'evt-1',
          title: 'Hyderabad Water Crisis Briefing',
          state_code: 'TS',
          issue_category: 'civic',
          status: 'live',
          buffer_state: 'cleared',
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        eq: () => ({
                          eq: () => ({
                            eq: () => ({
                              then: (resolve: any) => resolve({ data: mockEvents, error: null }),
                            }),
                          }),
                        }),
                        then: (resolve: any) => resolve({ data: mockEvents, error: null }),
                      }),
                    }),
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
        url: '/api/v1/lmx/live?state=TS&category=civic&status=live',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
      expect(body[0].id).toBe('evt-1');
    });

    it('returns 500 when database query encounters an error', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  order: () => ({
                    order: () => ({
                      limit: () => ({
                        then: (resolve: any) => resolve({ data: null, error: new Error('DB connection failure') }),
                      }),
                    }),
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
        url: '/api/v1/lmx/live',
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('3. Single Live Event Endpoint (/api/v1/lmx/live/:streamId)', () => {
    it('returns live event details when streamId matches', async () => {
      const mockEvent = {
        id: 'stream-101',
        title: 'Assembly Debate Live',
        status: 'live',
        creator_id: 'usr-journo-1',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: mockEvent, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/live/stream-101',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('stream-101');
      expect(body.title).toBe('Assembly Debate Live');
    });

    it('returns 404 when stream does not exist', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: new Error('Not found') }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/live/non-existent-stream',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('NOT_FOUND');
    });
  });

  describe('4. Create Live Event Endpoint (/api/v1/lmx/live)', () => {
    it('rejects unauthenticated caller with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        payload: { title: 'Test Stream' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects caller whose profile is missing with 403 PROFILE_NOT_FOUND', async () => {
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
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-unknown' },
        payload: { title: 'Test Stream' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('rejects caller with ineligible citizen role with 403 INELIGIBLE_ROLE', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'citizen', verification_status: 'verified' },
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
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-citizen-1' },
        payload: { title: 'Unauthorized Stream' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INELIGIBLE_ROLE');
    });

    it('rejects unverified contributor with 403 UNVERIFIED', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'unverified' },
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
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-unverified-journo' },
        payload: { title: 'Unverified Stream' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNVERIFIED');
    });

    it('creates live event successfully for verified journalist with 201', async () => {
      const mockCreated = {
        id: 'stream-new-1',
        title: 'Press Conference',
        creator_id: 'usr-journo-1',
        creator_role: 'journalist',
        buffer_state: 'buffered',
        priority_score: 50,
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'verified' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'live_events') {
          return {
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
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-journo-1' },
        payload: { title: 'Press Conference' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('stream-new-1');
      expect(body.creator_role).toBe('journalist');
    });
  });

  describe('5. Stream Moderation & Lifecycle Endpoints', () => {
    it('POST /api/v1/lmx/live/:streamId/moderate: applies allow decision', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/stream-101/moderate',
        payload: { decision: 'allow' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.decision).toBe('allow');
    });

    it('POST /api/v1/lmx/live/:streamId/moderate: applies cut decision', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/stream-101/moderate',
        payload: { decision: 'cut', reason: 'policy violation' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.decision).toBe('cut');
    });

    it('POST /api/v1/lmx/live/:streamId/end: ends live event with content hash', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/stream-101/end',
        payload: { content_hash: 'sha256-abc123xyz' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('6. Department Registry & Onboarding Endpoints', () => {
    it('GET /api/v1/lmx/departments: returns department registry listing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/departments?state=TS&type=police',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.departments)).toBe(true);
      expect(body.filters.state).toBe('TS');
    });

    it('POST /api/v1/lmx/departments: creates pending onboarding subscription with 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/departments',
        payload: {
          departmentType: 'municipal_corporation',
          officeName: 'GHMC Central Office',
          stateCode: 'TS',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.subscriptionStatus).toBe('pending');
    });
  });

  describe('7. Department Alerts & Acknowledgment Endpoints', () => {
    it('POST /api/v1/lmx/alerts: creates new department alert with 201', async () => {
      const mockAlert = {
        id: 'alt-1',
        department_id: 'dept-ghmc',
        alert_type: 'road_damage',
        message: 'Severe water logging reported on Road No 36',
        priority: 'high',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockAlert, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts',
        payload: {
          department_id: 'dept-ghmc',
          alert_type: 'road_damage',
          message: 'Severe water logging reported on Road No 36',
          priority: 'high',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('alt-1');
      expect(body.priority).toBe('high');
    });

    it('POST /api/v1/lmx/alerts/:id/acknowledge: acknowledges alert with 200', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts/alt-1/acknowledge',
        payload: {
          acknowledgment: 'Dispatched emergency repair team',
          acknowledged_by: 'officer-ghmc-44',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('8. Distribution Destination Endpoint (/api/v1/lmx/distribution)', () => {
    it('POST /api/v1/lmx/distribution: creates distribution destination with 201', async () => {
      const mockDist = {
        id: 'dst-1',
        destination_type: 'rtmp',
        endpoint_url: 'rtmp://live.youtube.com/app/streamkey',
        status: 'active',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_distribution_destinations') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockDist, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/distribution',
        payload: {
          destination_type: 'rtmp',
          endpoint_url: 'rtmp://live.youtube.com/app/streamkey',
          status: 'active',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('dst-1');
      expect(body.status).toBe('active');
    });
  });

  describe('9. Offline & Error Hardening (Branches & Database Failures)', () => {
    it('handles unconfigured Supabase in GET /api/v1/lmx/live and /live/:streamId', async () => {
      const orig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      const feedRes = await app.inject({ method: 'GET', url: '/api/v1/lmx/live' });
      expect(feedRes.statusCode).toBe(200);
      expect(JSON.parse(feedRes.payload)).toEqual([]);

      const streamRes = await app.inject({ method: 'GET', url: '/api/v1/lmx/live/str-offline' });
      expect(streamRes.statusCode).toBe(404);

      setSupabaseConfiguredForTesting(orig);
    });

    it('resolves Bearer authentication token and handles auth error', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'usr-jwt-1' } as any },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'verified' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'live_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'evt-jwt-1' }, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { authorization: 'Bearer token-jwt-ok' },
        payload: {
          title: 'Live Press Briefing',
          stream_url: 'https://stream.example.com/live.m3u8',
          state_code: 'TS',
          issue_category: 'governance',
        },
      });

      expect(res.statusCode).toBe(201);

      // Bearer token throwing error
      jest.spyOn(supabase.auth, 'getUser').mockRejectedValueOnce(new Error('JWT expired'));
      const failRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { authorization: 'Bearer token-jwt-fail' },
        payload: {
          title: 'Live Press Briefing',
          stream_url: 'https://stream.example.com/live.m3u8',
          state_code: 'TS',
          issue_category: 'governance',
        },
      });
      expect(failRes.statusCode).toBe(401);
    });

    it('handles query exception in GET /api/v1/lmx/live and /live/:streamId', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return {
            select: () => {
              throw new Error('Database connection reset');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const feedRes = await app.inject({ method: 'GET', url: '/api/v1/lmx/live' });
      expect(feedRes.statusCode).toBe(500);

      const streamRes = await app.inject({ method: 'GET', url: '/api/v1/lmx/live/str-err' });
      expect(streamRes.statusCode).toBe(404);
    });

    it('handles profile query exception in POST /api/v1/lmx/live with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => {
              throw new Error('Deadlock on profile read');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-err' },
        payload: {
          title: 'Test Stream',
          stream_url: 'https://stream.example.com/live.m3u8',
          state_code: 'TS',
          issue_category: 'civic',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('handles database error and exception in POST /api/v1/lmx/live', async () => {
      // Error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'verified' },
                }),
              }),
            }),
          } as any;
        }
        if (table === 'live_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Insert duplicate' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-ok' },
        payload: {
          title: 'Test Stream',
          stream_url: 'https://stream.example.com/live.m3u8',
          state_code: 'TS',
          issue_category: 'civic',
        },
      });
      expect(resErr.statusCode).toBe(500);

      // Exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'verified' },
                }),
              }),
            }),
          } as any;
        }
        if (table === 'live_events') {
          return {
            insert: () => {
              throw new Error('Connection crash');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const resEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'usr-ok' },
        payload: {
          title: 'Test Stream',
          stream_url: 'https://stream.example.com/live.m3u8',
          state_code: 'TS',
          issue_category: 'civic',
        },
      });
      expect(resEx.statusCode).toBe(500);
    });

    it('handles database error and exception in POST /api/v1/lmx/live/:streamId/moderate', async () => {
      // Error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return { update: () => ({ eq: async () => ({ error: { message: 'Mod lock error' } }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/moderate',
        payload: { decision: 'mute' },
      });
      expect(resErr.statusCode).toBe(500);

      // Exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return { update: () => ({ eq: () => { throw new Error('Network timeout'); } }) } as any;
        }
        return {} as any;
      }) as any);

      const resEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/moderate',
        payload: { decision: 'cut' },
      });
      expect(resEx.statusCode).toBe(500);
    });

    it('handles database error and exception in POST /api/v1/lmx/live/:streamId/end', async () => {
      // Error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return { update: () => ({ eq: async () => ({ error: { message: 'End fail' } }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/end',
        payload: { content_hash: 'hash-1' },
      });
      expect(resErr.statusCode).toBe(500);

      // Exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return { update: () => ({ eq: () => { throw new Error('End exception'); } }) } as any;
        }
        return {} as any;
      }) as any);

      const resEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/end',
        payload: { content_hash: 'hash-1' },
      });
      expect(resEx.statusCode).toBe(500);
    });

    it('handles database error and exception in POST /api/v1/lmx/alerts and acknowledge', async () => {
      // Alert insert error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return { insert: () => ({ select: () => ({ single: async () => ({ error: { message: 'Alert error' } }) }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resAltErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts',
        payload: { department_id: 'dept-1', alert_type: 'incident', message: 'test alert' },
      });
      expect(resAltErr.statusCode).toBe(500);

      // Alert insert exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return { insert: () => { throw new Error('Insert crash'); } } as any;
        }
        return {} as any;
      }) as any);

      const resAltEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts',
        payload: { department_id: 'dept-1', alert_type: 'incident', message: 'test alert' },
      });
      expect(resAltEx.statusCode).toBe(500);

      // Alert acknowledge error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return { update: () => ({ eq: async () => ({ error: { message: 'Ack error' } }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resAckErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts/alt-1/acknowledge',
        payload: { acknowledgment: 'ack', acknowledged_by: 'officer-1' },
      });
      expect(resAckErr.statusCode).toBe(500);

      // Alert acknowledge exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_department_alerts') {
          return { update: () => { throw new Error('Ack exception'); } } as any;
        }
        return {} as any;
      }) as any);

      const resAckEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/alerts/alt-1/acknowledge',
        payload: { acknowledgment: 'ack', acknowledged_by: 'officer-1' },
      });
      expect(resAckEx.statusCode).toBe(500);
    });

    it('handles database error and exception in POST /api/v1/lmx/distribution', async () => {
      // Distribution insert error
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_distribution_destinations') {
          return { insert: () => ({ select: () => ({ single: async () => ({ error: { message: 'Dist error' } }) }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resErr = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/distribution',
        payload: { destination_type: 'rtmp', endpoint_url: 'rtmp://test.com', status: 'active' },
      });
      expect(resErr.statusCode).toBe(500);

      // Distribution insert exception
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'lmx_distribution_destinations') {
          return { insert: () => { throw new Error('Dist exception'); } } as any;
        }
        return {} as any;
      }) as any);

      const resEx = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/distribution',
        payload: { destination_type: 'rtmp', endpoint_url: 'rtmp://test.com', status: 'active' },
      });
      expect(resEx.statusCode).toBe(500);
    });

    it('exercises all decision branches (mute, escalate) and query filter permutations', async () => {
      // Moderate mute
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          return { update: () => ({ eq: async () => ({ error: null }) }) } as any;
        }
        return {} as any;
      }) as any);

      const resMute = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/moderate',
        payload: { decision: 'mute' },
      });
      expect(resMute.statusCode).toBe(200);

      const resEsc = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/moderate',
        payload: { decision: 'escalate' },
      });
      expect(resEsc.statusCode).toBe(200);

      // End stream with omitted content_hash
      const resEndNoHash = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live/str-1/end',
        payload: {},
      });
      expect(resEndNoHash.statusCode).toBe(200);

      // GET /api/v1/lmx/live query filters (category=all, status=all, status=ended, state=TS)
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'live_events') {
          const q: any = {
            select: () => q,
            in: () => q,
            eq: () => q,
            order: () => q,
            limit: () => q,
            then: (resolve: any) => Promise.resolve({ data: [{ id: 'live-1', status: 'ended' }], error: null }).then(resolve),
          };
          return q;
        }
        return {} as any;
      }) as any);

      const resFilters1 = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/live?category=all&status=all',
      });
      expect(resFilters1.statusCode).toBe(200);

      const resFilters2 = await app.inject({
        method: 'GET',
        url: '/api/v1/lmx/live?category=sanitation&status=ended&state=TS',
      });
      expect(resFilters2.statusCode).toBe(200);

      // POST /api/v1/lmx/live with custom buffer_state and priority_score
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'journalist', verification_status: 'verified' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'live_events') {
          return {
            insert: (data: any) => ({
              select: () => ({
                single: async () => ({ data: { id: 'stream-custom', ...data }, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resCustom = await app.inject({
        method: 'POST',
        url: '/api/v1/lmx/live',
        headers: { 'x-user-id': 'journo-123' },
        payload: {
          title: 'Custom Event',
          buffer_state: 'cleared',
          priority_score: 95,
        },
      });
      expect(resCustom.statusCode).toBe(201);
    });
  });
});
