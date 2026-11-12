describe('staging API identity guard', () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalNodeEnv = process.env.NODE_ENV;
  let app: any;
  let supabase: any;

  beforeAll(async () => {
    process.env.APP_ENV = 'staging';
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const Fastify = require('fastify');
    const { userRoutes } = require('../routes/users');
    ({ supabase } = require('../lib/supabase'));
    app = Fastify();
    await app.register(userRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('rejects the development x-user-id shortcut and never queries user data', async () => {
    const from = jest.spyOn(supabase, 'from');
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/following',
      headers: { 'x-user-id': 'spoofed-user' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(from).not.toHaveBeenCalled();
  });

  it('blocks in-memory mock payment providers in staging', () => {
    const { MockPaymentProvider } = require('../providers/mockProvider');
    expect(() => new MockPaymentProvider()).toThrow('SECURITY_VIOLATION');
  });
});
