import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { commercialAdRoutes } from '../routes/commercialAds';
import { politicalAdsRoutes } from '../routes/politicalAds';

describe('deployed advertising fails closed until durable delivery exists', () => {
  let app: FastifyInstance;
  const originalAppEnv = process.env.APP_ENV;
  const originalExpoAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const originalPublicLibraryEnabled = process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(politicalAdsRoutes);
    await app.register(commercialAdRoutes, { prefix: '/api/v1/commercial-ads' });
    await app.ready();
  });

  afterEach(() => {
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
    if (originalExpoAppEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = originalExpoAppEnv;
    if (originalPublicLibraryEnabled === undefined) {
      delete process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED;
    } else {
      process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = originalPublicLibraryEnabled;
    }
  });

  beforeEach(() => {
    // A working public Supabase key is not enough: the public ad library must
    // be explicitly enabled only after the deployed schema and RLS are verified.
    process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = 'false';
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not return seeded political ads in isolated test mode', async () => {
    process.env.APP_ENV = 'test';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    const response = await app.inject({ method: 'GET', url: '/api/v1/political-ads/library' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.ads).toEqual([]);
    expect(body.total).toBe(0);
  });

  it.each(['staging', 'production'])(
    '%s political ads return 503 until storage and review are wired',
    async (environment) => {
      process.env.APP_ENV = environment;
      process.env.EXPO_PUBLIC_APP_ENV = environment;
      const response = await app.inject({ method: 'GET', url: '/api/v1/political-ads/active' });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.payload).code).toBe('POLITICAL_AD_SERVICE_UNAVAILABLE');
    },
  );

  it.each(['staging', 'production'])(
    '%s commercial ads return 503 while backed only by process memory',
    async (environment) => {
      process.env.APP_ENV = environment;
      process.env.EXPO_PUBLIC_APP_ENV = environment;
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/commercial-ads/pricing-configurations',
      });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.payload).code).toBe('AD_SERVICE_UNAVAILABLE');
    },
  );
});
