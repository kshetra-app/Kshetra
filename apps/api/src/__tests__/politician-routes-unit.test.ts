import Fastify, { FastifyInstance } from 'fastify';
import { politicianRoutes } from '../routes/politician';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

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
  it('GET /api/v1/politician/profiles returns 200 with empty list and filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/profiles?state=TG&tier=state&party=INC',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.politicians).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.filters.state).toBe('TG');
    expect(body.filters.tier).toBe('state');
    expect(body.filters.party).toBe('INC');
  });

  // 2. GET /api/v1/politician/profiles/:id
  it('GET /api/v1/politician/profiles/:id returns 404 NOT_FOUND', async () => {
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
  it('GET /api/v1/politician/events returns 200 with events list and filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/events?state=TG&type=rally&upcoming=true',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.events).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.filters.state).toBe('TG');
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
        headers: { 'x-user-id': 'usr-1' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('POST /api/v1/politician/events/:id/rsvp returns mock success on DB error in test environment', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Temporary DB error' } }),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/politician/events/evt-1/rsvp',
      headers: { 'x-user-id': 'usr-1' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.message).toBe('RSVP recorded');
  });

  // 5. GET /api/v1/politician/manifestos
  it('GET /api/v1/politician/manifestos returns 200 with manifestos list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/manifestos?politicianId=p-1&state=TG',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.manifestos).toEqual([]);
    expect(body.filters.politicianId).toBe('p-1');
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
  it('GET /api/v1/politician/surveys returns 200 with surveys list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/politician/surveys?state=TG&status=active',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.surveys).toEqual([]);
    expect(body.filters.status).toBe('active');
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
        headers: { 'x-user-id': 'usr-1' },
        payload: { answers: { q1: 'yes' } },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('POST /api/v1/politician/surveys/:id/respond returns mock success on DB error in test environment', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'Temporary error' } }),
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
    expect(body.message).toBe('Response submitted');
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
