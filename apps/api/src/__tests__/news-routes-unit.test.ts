import Fastify, { FastifyInstance } from 'fastify';
import { newsRoutes } from '../routes/news';
import * as newsService from '../services/news/newsService';

describe('News Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  const mockFeed: newsService.NewsFeed = {
    version: 1,
    generatedAt: '2026-10-20T12:00:00.000Z',
    refreshIntervalMin: 60,
    sources: [
      {
        id: 'the-hindu',
        name: 'The Hindu',
        domain: 'thehindu.com',
        language: 'en',
        accent: '#c00',
        verified: true,
      },
    ],
    items: [
      {
        id: 'news-1',
        title: 'Election Commission announces schedule',
        summary: 'Brief overview of election phases',
        imageUrl: 'https://example.com/img1.jpg',
        sourceUrl: 'https://thehindu.com/article1',
        source: {
          id: 'the-hindu',
          name: 'The Hindu',
          domain: 'thehindu.com',
          language: 'en',
        },
        language: 'en',
        category: 'elections',
        scope: 'national',
        stateCode: 'TG',
        constituencyId: 'ac-1',
        publishedAt: '2026-10-20T11:00:00.000Z',
      },
    ],
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(newsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /api/v1/news/feed returns 200 with cached feed and default Cache-Control', async () => {
    jest.spyOn(newsService, 'getFeed').mockReturnValue(mockFeed);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/news/feed',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=30, s-maxage=30');
    const body = JSON.parse(res.payload);
    expect(body.version).toBe(1);
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('Election Commission announces schedule');
    expect(body.items[0].source).toEqual(mockFeed.items[0].source);
  });

  it('GET /api/v1/news/feed passes query filters to getFeed', async () => {
    const getFeedSpy = jest.spyOn(newsService, 'getFeed').mockReturnValue(mockFeed);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/news/feed?lang=en&scope=national&state=TG&category=elections&limit=10',
    });

    expect(res.statusCode).toBe(200);
    expect(getFeedSpy).toHaveBeenCalledWith({
      lang: 'en',
      scope: 'national',
      state: 'TG',
      constituencyId: undefined,
      category: 'elections',
      limit: 10,
    });
  });

  it('waits for manual revalidation and returns the updated filtered snapshot', async () => {
    const updated = { ...mockFeed, generatedAt: '2026-10-20T12:15:00.000Z' };
    const getFeed = jest
      .spyOn(newsService, 'getFeed')
      .mockReturnValueOnce(mockFeed)
      .mockReturnValue(updated);
    const refresh = jest.spyOn(newsService, 'ensureFreshNews').mockResolvedValue(undefined);
    const res = await app.inject(
      '/api/v1/news/feed?refresh=true&scope=state&state=TS&lang=te&category=breaking',
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json().generatedAt).toBe(updated.generatedAt);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'state',
        state: 'TS',
        lang: 'te',
        category: 'breaking',
      }),
    );
  });

  it('accepts the same explicit state and constituency filters used by the mobile feed', async () => {
    const getFeedSpy = jest.spyOn(newsService, 'getFeed').mockReturnValue(mockFeed);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/news/feed?scope=constituency&state=TS&constituencyId=TS-AC-65',
    });

    expect(res.statusCode).toBe(200);
    expect(getFeedSpy).toHaveBeenCalledWith({
      scope: 'constituency',
      state: 'TS',
      constituencyId: 'TS-AC-65',
      lang: undefined,
      category: undefined,
      limit: undefined,
    });
  });

  it('POST /api/v1/news/refresh returns 200 with refreshed statistics on success', async () => {
    jest.spyOn(newsService, 'ensureFreshNews').mockResolvedValue(undefined);
    jest.spyOn(newsService, 'getFeed').mockReturnValue(mockFeed);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/news/refresh',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
    expect(body.items).toBe(1);
    expect(body.sources).toBe(1);
  });

  it('POST /api/v1/news/refresh returns 500 when refreshNews throws an Error instance', async () => {
    jest
      .spyOn(newsService, 'ensureFreshNews')
      .mockRejectedValue(new Error('RSS feed parse failure'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/news/refresh',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('NEWS_REFRESH_ERROR');
    expect(body.message).toContain('RSS feed parse failure');
  });

  it('POST /api/v1/news/refresh returns 500 with default message when non-Error thrown', async () => {
    jest.spyOn(newsService, 'ensureFreshNews').mockRejectedValue('network-timeout-string');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/news/refresh',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('NEWS_REFRESH_ERROR');
    expect(body.message).toBe('Internal news refresh error');
  });
});
