import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import { publicSupabase } from '../lib/supabase';

describe('Political advertising production contract', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the public transparency page at the canonical route', async () => {
    const res = await app.inject({ method: 'GET', url: '/political-ads/library/view' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.payload).toContain('Political Ad Library');
  });

  it('returns a truthful empty library when no ads are stored', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/library' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ads).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns storage unavailable in production when the durable public library cannot be read', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalPublicLibraryEnabled = process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED;
    const query: any = {
      select: () => query,
      in: () => query,
      order: () => query,
      range: async () => ({
        data: null,
        error: new Error('test database unavailable'),
        count: null,
      }),
    };
    const fromSpy = jest.spyOn(publicSupabase, 'from').mockReturnValue(query);
    process.env.NODE_ENV = 'production';
    process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = 'true';
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/library' });

      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('POLITICAL_AD_STORAGE_UNAVAILABLE');
    } finally {
      fromSpy.mockRestore();
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalPublicLibraryEnabled === undefined) {
        delete process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED;
      } else {
        process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = originalPublicLibraryEnabled;
      }
    }
  });

  it('keeps commercial-ad pricing unavailable in production while it is still memory-backed', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/commercial-ads/pricing-configurations',
      });

      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('AD_SERVICE_UNAVAILABLE');
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
