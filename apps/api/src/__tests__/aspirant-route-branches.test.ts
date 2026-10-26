import Fastify, { type FastifyInstance } from 'fastify';
import { aspirantRoutes } from '../routes/aspirant';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Aspirant route authentication and persistence branches', () => {
  let app: FastifyInstance;
  const originalHarness = process.env.TEST_HARNESS_ACTIVE;
  const originalNodeEnv = process.env.NODE_ENV;

  const query = (result: any) => {
    const q: any = {
      update: jest.fn(() => q),
      insert: jest.fn(() => q),
      eq: jest.fn(() => q),
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
  };

  const headers = { 'x-user-id': 'aspirant-user' };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    app = Fastify();
    await app.register(aspirantRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalHarness === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarness;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
  });

  it('covers module completion success, persistence error, exception, and best-effort counter failure', async () => {
    const successQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    jest.spyOn(supabase, 'rpc').mockRejectedValueOnce(new Error('counter unavailable'));
    const success = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/modules/module-1/complete', headers,
      payload: { quizScore: 90 },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toMatchObject({ success: true, moduleId: 'module-1', userId: 'aspirant-user', quizScore: 90 });
    expect(successQuery.update).toHaveBeenCalledWith(expect.objectContaining({ completed: true, quiz_score: 90 }));
    expect(successQuery.eq).toHaveBeenNthCalledWith(1, 'user_id', 'aspirant-user');
    expect(successQuery.eq).toHaveBeenNthCalledWith(2, 'module_id', 'module-1');

    const failedQuery = query({ error: { message: 'write rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(failedQuery as any);
    const failed = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/modules/module-2/complete', headers,
      payload: {},
    });
    expect(failed.statusCode).toBe(500);
    expect(failed.json().code).toBe('DATABASE_ERROR');

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('transport failed'); });
    const thrown = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/modules/module-3/complete', headers,
      payload: {},
    });
    expect(thrown.statusCode).toBe(500);
    expect(thrown.json().code).toBe('DATABASE_ERROR');
  });

  it('covers challenge join success, database error, and thrown persistence failure', async () => {
    const successQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    const success = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/challenges/challenge-1/join', headers,
      payload: {},
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toMatchObject({ success: true, challengeId: 'challenge-1', userId: 'aspirant-user' });
    expect(successQuery.insert).toHaveBeenCalledWith({ user_id: 'aspirant-user', challenge_id: 'challenge-1' });

    const failedQuery = query({ error: { message: 'write rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(failedQuery as any);
    const failed = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/challenges/challenge-2/join', headers,
      payload: {},
    });
    expect(failed.statusCode).toBe(500);

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('transport failed'); });
    const thrown = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/challenges/challenge-3/join', headers,
      payload: {},
    });
    expect(thrown.statusCode).toBe(500);
  });

  it('covers endorsement success, database error, and thrown persistence failure', async () => {
    const successQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    const success = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/candidate-1/endorse', headers,
      payload: { message: 'Community support' },
    });
    expect(success.statusCode).toBe(201);
    expect(success.json()).toMatchObject({ success: true, aspirantId: 'candidate-1', endorserId: 'aspirant-user' });
    expect(successQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      endorser_id: 'aspirant-user', aspirant_id: 'candidate-1', message: 'Community support',
    }));

    const failedQuery = query({ error: { message: 'write rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(failedQuery as any);
    const failed = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/candidate-2/endorse', headers,
      payload: {},
    });
    expect(failed.statusCode).toBe(500);

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('transport failed'); });
    const thrown = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/candidate-3/endorse', headers,
      payload: {},
    });
    expect(thrown.statusCode).toBe(500);
  });

  it('fails closed for missing identity, mismatched acting identity, and unavailable database on all mutations', async () => {
    const routes = [
      { url: '/api/v1/aspirant/modules/module-1/complete', payload: { userId: 'someone-else' } },
      { url: '/api/v1/aspirant/challenges/challenge-1/join', payload: { userId: 'someone-else' } },
      { url: '/api/v1/aspirant/candidate-1/endorse', payload: { endorserId: 'someone-else' } },
    ];

    for (const route of routes) {
      const unauthenticated = await app.inject({ method: 'POST', url: route.url, payload: route.payload });
      expect(unauthenticated.statusCode).toBe(401);

      const spoofed = await app.inject({ method: 'POST', url: route.url, headers, payload: route.payload });
      expect(spoofed.statusCode).toBe(403);
    }

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/modules/module-4/complete', headers,
      payload: {},
    });
    expect(unavailable.statusCode).toBe(503);
    const challengeUnavailable = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/challenges/challenge-4/join', headers,
      payload: {},
    });
    expect(challengeUnavailable.statusCode).toBe(503);
    const endorsementUnavailable = await app.inject({
      method: 'POST', url: '/api/v1/aspirant/candidate-4/endorse', headers,
      payload: {},
    });
    expect(endorsementUnavailable.statusCode).toBe(503);
  });
});
