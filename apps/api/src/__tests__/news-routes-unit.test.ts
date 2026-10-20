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
    expect(res.headers['cache-control']).toBe('public, max-age=300, s-maxage=300');
    const body = JSON.parse(res.payload);
    expect(body.version).toBe(1);
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe('Election Commission announces schedule');
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
      category: 'elections',
      limit: 10,
    });
  });

  it('POST /api/v1/news/refresh returns 200 with refreshed statistics on success', async () => {
    jest.spyOn(newsService, 'refreshNews').mockResolvedValue(mockFeed);

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
    jest.spyOn(newsService, 'refreshNews').mockRejectedValue(new Error('RSS feed parse failure'));

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
    jest.spyOn(newsService, 'refreshNews').mockRejectedValue('network-timeout-string');

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
