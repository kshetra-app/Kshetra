import Fastify, { type FastifyInstance } from 'fastify';
import {
  assertActingUserMatch,
  extractAuthoritativeRole,
  isExplicitTestHarnessActive,
  resolveAuthenticatedUser,
  setTestTokenValidator,
} from '../lib/userAuth';
import { setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

describe('userAuth decision branches: explicit harness, bearer validation and fail-closed provider', () => {
  let app: FastifyInstance;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalHarness = process.env.TEST_HARNESS_ACTIVE;

  beforeAll(async () => {
    app = Fastify();
    app.get('/auth-probe', async (request, reply) => {
      const user = await resolveAuthenticatedUser(request, reply);
      return user ? { authenticated: true, ...user } : reply;
    });
    await app.ready();
  });

  afterAll(async () => {
    setTestTokenValidator(null);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalHarness === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarness;
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
  });

  it('accepts header identity only in explicit harness and sanitizes header roles', async () => {
    expect(isExplicitTestHarnessActive()).toBe(true);
    const accepted = await app.inject({
      method: 'GET',
      url: '/auth-probe',
      headers: { 'x-user-id': ' fixture-user ', 'x-test-role': ' ADMIN ' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(JSON.parse(accepted.payload)).toMatchObject({ authenticated: true, userId: 'fixture-user', role: 'admin' });

    const unknownRole = await app.inject({
      method: 'GET',
      url: '/auth-probe',
      headers: { 'x-user-id': 'fixture-user', 'x-user-role': 'owner' },
    });
    expect(JSON.parse(unknownRole.payload).role).toBe('citizen');

    process.env.TEST_HARNESS_ACTIVE = 'false';
    expect(isExplicitTestHarnessActive()).toBe(false);
    const denied = await app.inject({ method: 'GET', url: '/auth-probe', headers: { 'x-user-id': 'spoofed' } });
    expect(denied.statusCode).toBe(401);
  });

  it('rejects malformed and empty bearer credentials before provider lookup', async () => {
    for (const authorization of ['Basic token', 'Bearer ', 'Bearer invalid-token', 'Bearer expired-token']) {
      const response = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization } });
      expect(response.statusCode).toBe(401);
    }
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('validates test tokens, sanitizes roles, rejects null identity and fails closed on validator exceptions', async () => {
    setTestTokenValidator((token) => token === 'good' ? { id: 'validated-user', role: ' MODERATOR ' } : null);
    const good = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer good' } });
    expect(JSON.parse(good.payload)).toMatchObject({ authenticated: true, userId: 'validated-user', role: 'moderator' });

    setTestTokenValidator(() => ({ id: 'no-role', role: 'root' }));
    const sanitized = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer any' } });
    expect(JSON.parse(sanitized.payload).role).toBe('citizen');

    setTestTokenValidator(() => null);
    expect((await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer missing' } })).statusCode).toBe(401);

    setTestTokenValidator(() => { throw new Error('validator crashed'); });
    const failed = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer throws' } });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe('AUTH_ERROR');

    process.env.TEST_HARNESS_ACTIVE = 'false';
    expect(() => setTestTokenValidator(() => ({ id: 'blocked' }))).toThrow(/SECURITY VIOLATION/);
  });

  it('fails closed when provider is unconfigured, rejects invalid users and handles provider exceptions', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer valid-format' } });
    expect(unavailable.statusCode).toBe(503);

    setSupabaseConfiguredForTesting(true);
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } } as any);
    expect((await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer invalid' } })).statusCode).toBe(401);

    jest.spyOn(supabase.auth, 'getUser').mockRejectedValueOnce(new Error('provider down'));
    const failed = await app.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: 'Bearer provider-error' } });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe('AUTH_ERROR');
  });

  it('derives role only from trusted app metadata and handles spoof assertions', async () => {
    expect(extractAuthoritativeRole({ user_metadata: { role: 'admin' } })).toBe('citizen');
    expect(extractAuthoritativeRole({ app_metadata: { role: ' ADMIN ' } })).toBe('admin');
    expect(extractAuthoritativeRole({ app_metadata: { role: 7 } })).toBe('citizen');

    const reply = app.inject; // Keep this assertion focused on the exported pure identity guard.
    expect(typeof reply).toBe('function');
    const fakeReply: any = { code: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
    const fakeRequest: any = { id: 'request-1', log: { error: jest.fn() } };
    expect(assertActingUserMatch(fakeReply, fakeRequest, 'user-1', undefined)).toBe(true);
    expect(assertActingUserMatch(fakeReply, fakeRequest, 'user-1', 'user-1')).toBe(true);
    expect(assertActingUserMatch(fakeReply, fakeRequest, 'user-1', 'user-2', 'followerId')).toBe(false);
    expect(fakeReply.send).toHaveBeenCalled();
  });
});
