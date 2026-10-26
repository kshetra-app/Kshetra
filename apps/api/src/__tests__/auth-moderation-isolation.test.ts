import Fastify from 'fastify';
import { moderationRoutes } from '../routes/moderation';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';
import { resolveAuthenticatedUser } from '../lib/userAuth';

describe('Authentication and moderation test-harness isolation', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalHarnessFlag = process.env.TEST_HARNESS_ACTIVE;
  let app: ReturnType<typeof Fastify>;

  afterEach(async () => {
    if (app) await app.close();
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(false);
    process.env.NODE_ENV = originalNodeEnv;
    if (originalHarnessFlag === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarnessFlag;
  });

  it('permits fixture identity only when NODE_ENV=test and TEST_HARNESS_ACTIVE=true', async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    app = Fastify();
    app.get('/identity', async (request, reply) => {
      const user = await resolveAuthenticatedUser(request, reply);
      return user ? { userId: user.userId, role: user.role } : undefined;
    });
    await app.ready();

    const accepted = await app.inject({
      method: 'GET',
      url: '/identity',
      headers: { 'x-user-id': 'fixture-user', 'x-test-role': 'moderator' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual({ userId: 'fixture-user', role: 'moderator' });

    process.env.NODE_ENV = 'development';
    const rejectedOutsideTest = await app.inject({
      method: 'GET',
      url: '/identity',
      headers: { 'x-user-id': 'spoofed-user', 'x-test-role': 'admin' },
    });
    expect(rejectedOutsideTest.statusCode).toBe(401);

    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'false';
    const rejectedWithoutHarness = await app.inject({
      method: 'GET',
      url: '/identity',
      headers: { 'x-user-id': 'spoofed-user', 'x-test-role': 'admin' },
    });
    expect(rejectedWithoutHarness.statusCode).toBe(401);
  });

  it('does not let x-test-role override the database-verified role outside the test harness', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'citizen-1', app_metadata: { role: 'citizen' } } },
      error: null,
    } as any);
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation((() => chain) as any);

    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/action',
      headers: {
        authorization: 'Bearer valid-test-token',
        'x-test-role': 'admin',
      },
      payload: { moderatorId: 'citizen-1', actionType: 'warn', reason: 'isolation regression test' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('fails closed when the authoritative moderator-role lookup errors outside the test harness', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'citizen-1', app_metadata: { role: 'citizen' } } },
      error: null,
    } as any);
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'fixture database unavailable' } }),
    };
    jest.spyOn(supabase, 'from').mockImplementation((() => chain) as any);

    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/action',
      headers: {
        authorization: 'Bearer valid-test-token',
        'x-test-role': 'admin',
        'x-user-role': 'admin',
      },
      payload: { moderatorId: 'citizen-1', actionType: 'warn', reason: 'isolation regression test' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
  });

  it('does not report a moderation mutation as successful when persistence fails in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: { role: 'admin' } } },
      error: null,
    } as any);
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        update: jest.fn(() => chain),
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        then: (resolve: (value: any) => any) => resolve({
          data: null,
          error: table === 'posts' ? { message: 'fixture persistence outage' } : null,
        }),
      };
      return chain;
    }) as any);

    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/action',
      headers: { authorization: 'Bearer valid-test-token', 'x-test-role': 'admin' },
      payload: {
        moderatorId: 'admin-1',
        actionType: 'delete_content',
        targetPostId: 'post-1',
        reason: 'isolation regression test',
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('PERSISTENCE_ERROR');
  });

  it('does not serve a successful mock moderation queue when the database fails in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'moderator-1', app_metadata: { role: 'moderator' } } },
      error: null,
    } as any);
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        then: (resolve: (value: any) => any) => resolve({
          data: null,
          error: table === 'reports' ? { message: 'fixture database outage' } : null,
        }),
      };
      return chain;
    }) as any);

    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/queue',
      headers: { authorization: 'Bearer valid-test-token', 'x-test-role': 'moderator' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
  });

});
