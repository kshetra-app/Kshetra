import Fastify, { type FastifyInstance } from 'fastify';
import { politicalAdsRoutes } from '../routes/politicalAds';

describe('Political advertising routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(politicalAdsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const submission = (overrides: Record<string, unknown> = {}) => ({
    postId: 'post-unit-test',
    mcmcCertificateId: 'certificate-test-only',
    amountPaid: 1000,
    targetScope: 'state',
    targetValue: 'TS',
    ...overrides,
  });

  it('serves the transparency page at its published route', async () => {
    const res = await app.inject({ method: 'GET', url: '/political-ads/library/view' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.payload).toContain('Political Ad Library');
  });

  it('returns an honest empty library without fabricated ad records', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/library' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ads).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it('returns no active ads when there are no approved stored records', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/active?state=TS' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).ads).toEqual([]);
  });

  it('validates library filters', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/active?state=xx' });

    expect(res.statusCode).toBe(400);
  });

  it('requires authentication to submit an ad', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages/page-unit-test/political-ads',
      payload: submission(),
    });

    expect(res.statusCode).toBe(401);
  });

  it('keeps a submitted ad pending until a reviewer certifies it', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/pages/page-unit-test/political-ads',
      headers: { 'x-user-id': 'user-unit-test' },
      payload: submission(),
    });

    expect(created.statusCode).toBe(201);
    const ad = JSON.parse(created.payload);
    expect(ad.status).toBe('pending_certification');
    expect(ad.impressions).toBe(0);

    const rejectedReviewer = await app.inject({
      method: 'POST',
      url: `/api/v1/political-ads/admin/${ad.id}/certify`,
      headers: { 'x-user-id': 'citizen-unit-test', 'x-user-role': 'citizen' },
      payload: { action: 'certify' },
    });
    expect(rejectedReviewer.statusCode).toBe(403);

    const certified = await app.inject({
      method: 'POST',
      url: `/api/v1/political-ads/admin/${ad.id}/certify`,
      headers: { 'x-user-id': 'moderator-unit-test', 'x-user-role': 'moderator' },
      payload: { action: 'certify' },
    });
    expect(certified.statusCode).toBe(200);
    expect(JSON.parse(certified.payload).status).toBe('active');
  });

  it('fails closed in production until political ad storage and delivery exist', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/political-ads/active' });

      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('POLITICAL_AD_SERVICE_UNAVAILABLE');
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
