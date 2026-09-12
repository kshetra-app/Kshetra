import type { FastifyInstance } from 'fastify';
import { getFeed, refreshNews, type FeedFilters } from '../services/news/newsService';

const newsFeedSchema = {
  querystring: {
    type: 'object',
    properties: {
      lang: { type: 'string', maxLength: 10 },
      scope: { type: 'string', enum: ['all', 'national', 'state'] },
      state: { type: 'string', maxLength: 10 },
      category: { type: 'string', maxLength: 30 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        version: { type: 'number' },
        generatedAt: { type: 'string' },
        refreshIntervalMin: { type: 'number' },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              domain: { type: 'string' },
              language: { type: 'string' },
              accent: { type: 'string' },
              verified: { type: 'boolean' },
            },
            required: ['id', 'name', 'domain', 'language'],
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              imageUrl: { type: 'string' },
              sourceUrl: { type: 'string' },
              source: { type: 'object' },
              language: { type: 'string' },
              category: { type: 'string' },
              scope: { type: 'string' },
              stateCode: { type: 'string' },
              constituencyId: { type: 'string' },
              publishedAt: { type: 'string' },
            },
            required: ['id', 'title', 'sourceUrl', 'source', 'language', 'category', 'scope', 'publishedAt'],
          },
        },
      },
      required: ['version', 'generatedAt', 'refreshIntervalMin', 'sources', 'items'],
    },
  },
};

/**
 * News aggregation endpoints.
 *
 * GET /api/v1/news/feed        → the cached NewsFeed (refreshed hourly).
 *   Query: lang, scope (national|state), state, category, limit
 * POST /api/v1/news/refresh    → force a re-scrape (admin/manual trigger).
 */
export async function newsRoutes(app: FastifyInstance) {
  app.get('/api/v1/news/feed', { schema: newsFeedSchema }, async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const filters: FeedFilters = {
      lang: q.lang,
      scope: q.scope,
      state: q.state,
      category: q.category,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
    };
    const feed = getFeed(filters);
    // Let clients/CDN cache for a few minutes; the scraper runs hourly.
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=300');
    return feed;
  });

  app.post('/api/v1/news/refresh', async () => {
    const feed = await refreshNews();
    return { ok: true, generatedAt: feed.generatedAt, items: feed.items.length, sources: feed.sources.length };
  });
}
