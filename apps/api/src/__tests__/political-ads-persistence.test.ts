import Fastify, { type FastifyInstance } from 'fastify';
import { politicalAdsRoutes } from '../routes/politicalAds';
import { publicSupabase } from '../lib/supabase';

type QueryResult = {
  data: Array<Record<string, unknown>> | null;
  error: Error | null;
  count: number | null;
};

function createQuery(result: QueryResult) {
  const query: any = {};
  for (const method of ['select', 'in', 'eq', 'ilike', 'order']) {
    query[method] = jest.fn(() => query);
  }
  query.range = jest.fn().mockResolvedValue(result);
  return query;
}

describe('political ad public reads use persisted, public records in production', () => {
  let app: FastifyInstance;
  const originalEnv = {
    nodeEnv: process.env.NODE_ENV,
    appEnv: process.env.APP_ENV,
    publicLibraryEnabled: process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED,
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(politicalAdsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENV = 'production';
    process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.nodeEnv;
    if (originalEnv.appEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalEnv.appEnv;
    if (originalEnv.publicLibraryEnabled === undefined) {
      delete process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED;
    } else {
      process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED = originalEnv.publicLibraryEnabled;
    }
  });

  const pageId = '9d87a7f4-44f2-4d04-9072-e64b01cf41a7';
  const persistedAd = {
    id: '9d87a7f4-44f2-4d04-9072-e64b01cf41a7',
    page_id: pageId,
    post_id: 'post-public-1',
    mcmc_certificate_id: 'MCMC-TS-2026-0042',
    status: 'active',
    amount_paid: 1200,
    target_scope: 'state',
    target_value: 'TS',
    impressions: 321,
    created_at: '2026-10-01T10:00:00.000Z',
    reviewed_at: '2026-10-02T10:00:00.000Z',
  };

  it('returns actual active and ended library rows with server-side pagination and filters', async () => {
    const query = createQuery({ data: [persistedAd], error: null, count: 1 });
    const fromSpy = jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/political-ads/library?page=2&limit=10&state=TS&search=MCMC-TS-2026-0042',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      ads: [persistedAd],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(fromSpy).toHaveBeenCalledWith('political_ads');
    expect(query.in).toHaveBeenCalledWith('status', ['active', 'ended']);
    expect(query.eq).toHaveBeenCalledWith('target_scope', 'state');
    expect(query.eq).toHaveBeenCalledWith('target_value', 'TS');
    expect(query.ilike).toHaveBeenCalledWith('mcmc_certificate_id', '%MCMC-TS-2026-0042%');
    expect(query.range).toHaveBeenCalledWith(10, 19);
  });

  it('returns only active records from the serving-list endpoint and applies constituency scope', async () => {
    const query = createQuery({ data: [persistedAd], error: null, count: 1 });
    jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/political-ads/active?constituency=TS-AC-63&limit=5',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ ads: [persistedAd] });
    expect(query.in).toHaveBeenCalledWith('status', ['active']);
    expect(query.eq).toHaveBeenCalledWith('target_scope', 'constituency');
    expect(query.eq).toHaveBeenCalledWith('target_value', 'TS-AC-63');
    expect(query.range).toHaveBeenCalledWith(0, 4);
  });

  it('uses exact matching for UUID page searches instead of applying text matching to a UUID column', async () => {
    const query = createQuery({ data: [persistedAd], error: null, count: 1 });
    jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/political-ads/library?search=${pageId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('page_id', pageId);
    expect(query.ilike).not.toHaveBeenCalled();
  });

  it('fails closed with a stable service error when the database read fails', async () => {
    const query = createQuery({
      data: null,
      error: new Error('private connection detail'),
      count: null,
    });
    jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({ method: 'GET', url: '/api/v1/political-ads/library' });
    const payload = JSON.parse(response.payload);

    expect(response.statusCode).toBe(503);
    expect(payload.code).toBe('POLITICAL_AD_STORAGE_UNAVAILABLE');
    expect(response.payload).not.toContain('private connection detail');
  });

  it('renders persisted values safely in the public HTML library', async () => {
    const query = createQuery({
      data: [{ ...persistedAd, mcmc_certificate_id: '<script>alert(1)</script>' }],
      error: null,
      count: 1,
    });
    jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({ method: 'GET', url: '/political-ads/library/view' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.payload).toContain('₹1,200');
    expect(response.payload).toContain('321');
    expect(response.payload).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(response.payload).not.toContain('<script>alert(1)</script>');
  });

  it('supports bounded pagination in the HTML library', async () => {
    const query = createQuery({ data: [persistedAd], error: null, count: 21 });
    jest.spyOn(publicSupabase, 'from').mockReturnValue(query);

    const response = await app.inject({
      method: 'GET',
      url: '/political-ads/library/view?page=2&limit=10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain('Showing 11–11');
    expect(response.payload).toContain('href="?page=1&amp;limit=10"');
    expect(response.payload).toContain('href="?page=3&amp;limit=10"');
    expect(query.range).toHaveBeenCalledWith(10, 19);
  });

  it('keeps in-memory transparency and write endpoints blocked in production', async () => {
    const transparency = await app.inject({
      method: 'GET',
      url: '/api/v1/political-ads/transparency',
    });
    const mutation = await app.inject({
      method: 'POST',
      url: '/api/v1/political-ads',
      payload: {},
    });

    expect(transparency.statusCode).toBe(503);
    expect(JSON.parse(transparency.payload).code).toBe('POLITICAL_AD_SERVICE_UNAVAILABLE');
    expect(mutation.statusCode).toBe(503);
    expect(JSON.parse(mutation.payload).code).toBe('POLITICAL_AD_SERVICE_UNAVAILABLE');
  });
});
