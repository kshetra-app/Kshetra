import Fastify, { FastifyInstance } from 'fastify';
import { politicianRoutes } from '../routes/politician';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

const mockProductionAuth = (userId: string) => {
  setSupabaseConfiguredForTesting(true);
  jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
    data: { user: { id: userId } as any },
    error: null,
  });
  return { authorization: `Bearer test-user-${userId}` };
};

function mockListQuery(result: { data: unknown; error: unknown }) {
  const query: any = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'gt', 'lte', 'lt', 'order']) {
    query[method] = jest.fn(() => query);
  }
  query.limit = jest.fn().mockResolvedValue(result);
  query.maybeSingle = jest.fn().mockResolvedValue(result);
  return query;
}

describe('Politician Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(politicianRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  // 1. GET /api/v1/politician/profiles
  it('GET /api/v1/politician/profiles returns mapped public database records and omits unsupported metrics', async () => {
    const query = mockListQuery({
      data: [
        {
          id: 'profile-1',
          user_id: 'private-user-id',
          display_name: 'Asha Rao',
          tier: 'mla',
          party: 'Civic Party',
          state_code: 'TS',
          district_name: 'Hyderabad',
          bio: 'Public service profile',
          social_links: [{ platform: 'website', url: 'https://example.test' }],
          is_verified: true,
          is_active: true,
          endorsement_count: 3,
          follower_count: 9000,
          response_rate: 95,
        },
      ],
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/profiles?state=TS&tier=mla&party=Civic%20Party',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.politicians).toHaveLength(1);
    expect(body.politicians[0]).toMatchObject({
      id: 'profile-1',
      displayName: 'Asha Rao',
      tier: 'mla',
      stateCode: 'TS',
      endorsementCount: 3,
      followerCount: null,
      responseRate: null,
    });
    expect(body.politicians[0].userId).toBeUndefined();
    expect(body.total).toBe(1);
    expect(body.filters.state).toBe('TS');
    expect(body.filters.tier).toBe('mla');
    expect(body.filters.party).toBe('Civic Party');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.eq).toHaveBeenCalledWith('state_code', 'TS');
  });

  it('GET /api/v1/politician/profiles reports unavailable when the database is not configured', async () => {
    setSupabaseConfiguredForTesting(false);
    const res = await app.inject({ method: 'GET', url: '/api/v1/politician/profiles' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.payload).code).toBe('PORTAL_DATA_UNAVAILABLE');
  });

  it('GET /api/v1/politician/profiles reports missing production tables instead of an empty success', async () => {
    const query = mockListQuery({
      data: null,
      error: { code: 'PGRST205', message: 'table missing' },
    });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);
    const res = await app.inject({ method: 'GET', url: '/api/v1/politician/profiles' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.payload).code).toBe('PORTAL_DATA_UNAVAILABLE');
    expect(res.payload).not.toContain('table missing');
  });

  // 2. GET /api/v1/politician/profiles/:id
  it('GET /api/v1/politician/profiles/:id returns 404 NOT_FOUND', async () => {
    const query = mockListQuery({ data: null, error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/profiles/pol-123',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toContain('pol-123 not found');
  });

  // 3. GET /api/v1/politician/events
  it('GET /api/v1/politician/events returns public database records and RSVP counts', async () => {
    const query = mockListQuery({
      data: [
        {
          id: 'event-1',
          politician_id: 'profile-1',
          type: 'rally',
          status: 'planned',
          title: 'Public town meeting',
          description: '',
          venue: 'City Hall',
          address: '',
          state_code: 'TS',
          start_time: '2026-12-01T10:00:00.000Z',
          end_time: '2026-12-01T12:00:00.000Z',
          is_public: true,
          rsvp_count: 4,
          media_urls: [],
          created_at: '2026-11-01T00:00:00.000Z',
          updated_at: '2026-11-01T00:00:00.000Z',
          politician: { display_name: 'Asha Rao', party: 'Civic Party' },
        },
      ],
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/events?state=TS&type=rally&upcoming=true',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      id: 'event-1',
      politicianName: 'Asha Rao',
      rsvpCount: 4,
      isPublic: true,
    });
    expect(body.total).toBe(1);
    expect(body.filters.state).toBe('TS');
    expect(query.eq).toHaveBeenCalledWith('is_public', true);
    expect(query.gte).toHaveBeenCalledWith('start_time', expect.any(String));
  });

  // 4. POST /api/v1/politician/events/:id/rsvp
  it('POST /api/v1/politician/events/:id/rsvp rejects unauthenticated caller with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/politician/events/:id/rsvp returns 503 when Supabase is not configured', async () => {
    setSupabaseConfiguredForTesting(false);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { 'x-user-id': 'usr-1' },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('POST /api/v1/politician/events/:id/rsvp records RSVP successfully', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { 'x-user-id': 'usr-1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.eventId).toBe('evt-1');
  });

  it('POST /api/v1/politician/events/:id/rsvp handles database error in production mode with 500', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      jest.spyOn(supabase, 'from').mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Unique violation on rsvp' } }),
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/events/evt-1/rsvp',
        headers: mockProductionAuth('usr-1'),
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('POST /api/v1/politician/events/:id/rsvp reports database errors in test environment', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Temporary DB error' } }),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { 'x-user-id': 'usr-1' },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.success).toBeUndefined();
    expect(body.code).toBe('DATABASE_ERROR');
  });

  // 5. GET /api/v1/politician/manifestos
  it('GET /api/v1/politician/manifestos returns published database records without unsupported counts', async () => {
    const query = mockListQuery({
      data: [
        {
          id: 'manifesto-1',
          politician_id: 'profile-1',
          title: 'Public priorities',
          preamble: 'The plan',
          status: 'published',
          items: [
            {
              id: 'item-1',
              category: 'education',
              title: 'Classrooms',
              description: 'Repairs',
              timeline: 'One year',
              priority: 'high',
              supportVotes: 82,
              opposeVotes: 3,
            },
          ],
          target_election: null,
          state_code: 'TS',
          constituency_ac_no: 12,
          published_at: '2026-10-01T00:00:00.000Z',
          created_at: '2026-09-20T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
          politician: { display_name: 'Asha Rao', party: 'Civic Party' },
        },
      ],
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/manifestos?politicianId=p-1&state=TG',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.manifestos).toHaveLength(1);
    expect(body.manifestos[0].views).toBeNull();
    expect(body.manifestos[0].items[0].supportVotes).toBeNull();
    expect(body.manifestos[0].items[0].opposeVotes).toBeNull();
    expect(body.filters.politicianId).toBe('p-1');
    expect(query.eq).toHaveBeenCalledWith('status', 'published');
  });

  // 6. POST /api/v1/politician/manifestos/:manifestoId/items/:itemId/vote
  it('POST /api/v1/politician/manifestos/:manifestoId/items/:itemId/vote returns 501 BLOCKED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/manifestos/man-1/items/item-1/vote',
      payload: { support: true },
    });

    expect(res.statusCode).toBe(501);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('PERSISTENCE_TARGET_UNAVAILABLE');
    expect(body.message).toContain('blocked in W009-B4');
  });

  // 7. GET /api/v1/politician/surveys
  it('GET /api/v1/politician/surveys returns active database surveys with persisted response counts', async () => {
    const query = mockListQuery({
      data: [
        {
          id: 'survey-1',
          politician_id: 'profile-1',
          title: 'Local priorities',
          description: 'Select a priority',
          status: 'active',
          target_scope: 'state',
          target_state_code: 'TS',
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              text: 'Which priority?',
              options: ['Water'],
              isRequired: true,
              order: 0,
            },
          ],
          response_count: 11,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue(query as any);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/surveys?state=TG&status=active',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.surveys).toHaveLength(1);
    expect(body.surveys[0].responseCount).toBe(11);
    expect(body.surveys[0].results).toBeUndefined();
    expect(body.filters.status).toBe('active');
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
  });

  // 8. POST /api/v1/politician/surveys/:id/respond
  it('POST /api/v1/politician/surveys/:id/respond rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/surveys/srv-1/respond',
      payload: { answers: { q1: 'yes' } },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/politician/surveys/:id/respond returns 503 when Supabase not configured', async () => {
    setSupabaseConfiguredForTesting(false);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/surveys/srv-1/respond',
      headers: { 'x-user-id': 'usr-1' },
      payload: { answers: { q1: 'yes' } },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('POST /api/v1/politician/surveys/:id/respond records response successfully', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/surveys/srv-1/respond',
      headers: { 'x-user-id': 'usr-1' },
      payload: { answers: { q1: 'yes' } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.surveyId).toBe('srv-1');
  });

  it('POST /api/v1/politician/surveys/:id/respond handles error in production mode with 500', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      jest.spyOn(supabase, 'from').mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Database lock timeout' } }),
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/surveys/srv-1/respond',
        headers: mockProductionAuth('usr-1'),
        payload: { answers: { q1: 'yes' } },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('POST /api/v1/politician/surveys/:id/respond reports database errors in test environment', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Temporary error' } }),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/surveys/srv-1/respond',
      headers: { 'x-user-id': 'usr-1' },
      payload: { answers: { q1: 'yes' } },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.success).toBeUndefined();
    expect(body.code).toBe('DATABASE_ERROR');
  });

  // 9. POST /api/v1/politician/grievances
  it('POST /api/v1/politician/grievances returns 501 BLOCKED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/grievances',
      payload: {
        politicianId: 'pol-1',
        subject: 'Road infrastructure',
        description: 'Road needs urgent repair',
        category: 'infrastructure',
      },
    });

    expect(res.statusCode).toBe(501);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('PERSISTENCE_TARGET_UNAVAILABLE');
    expect(body.message).toContain('blocked in W009-B4');
  });

  // 10. resolveAuthUser Bearer token permutations
  it('covers resolveAuthUser Bearer token permutations', async () => {
    // 1. Bearer with invalid token literal returns 401
    const resInvalid = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(resInvalid.statusCode).toBe(401);

    // 2. Bearer with expired token literal returns 401
    const resExpired = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { authorization: 'Bearer expired-token' },
    });
    expect(resExpired.statusCode).toBe(401);

    // 3. Bearer with valid Supabase user
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: { user: { id: 'supabase-user-xyz' } } as any,
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as any);

    const resBearerSuccess = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { authorization: 'Bearer valid-jwt-token' },
    });
    expect(resBearerSuccess.statusCode).toBe(200);

    // 4. Bearer with user lookup error
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token expired' } as any,
    });
    const resBearerError = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { authorization: 'Bearer jwt-error-token' },
    });
    expect(resBearerError.statusCode).toBe(401);
  });
});
