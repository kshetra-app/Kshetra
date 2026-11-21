import type { FastifyInstance } from 'fastify';
import { ensureFreshNews, getFeed, type FeedFilters } from '../services/news/newsService';
import { sendApiError } from '../lib/replyHelper';

const newsSourceSchema = {
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
} as const;

const newsFeedSchema = {
  querystring: {
    type: 'object',
    properties: {
      lang: { type: 'string', maxLength: 10 },
      scope: { type: 'string', enum: ['all', 'national', 'state', 'constituency'] },
      state: { type: 'string', maxLength: 10 },
      constituencyId: { type: 'string', maxLength: 40 },
      category: { type: 'string', maxLength: 30 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      refresh: { type: 'boolean' },
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
          items: newsSourceSchema,
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
              source: newsSourceSchema,
              language: { type: 'string' },
              category: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
              breaking: { type: 'boolean' },
              video: {
                type: 'object',
                properties: {
                  provider: { type: 'string', enum: ['youtube', 'native'] },
                  embedId: { type: 'string' },
                  durationSec: { type: 'number' },
                },
                required: ['provider', 'embedId'],
              },
              scope: { type: 'string' },
              stateCode: { type: 'string' },
              stateCodes: { type: 'array', items: { type: 'string' } },
              constituencyId: { type: 'string' },
              publishedAt: { type: 'string' },
            },
            required: [
              'id',
              'title',
              'sourceUrl',
              'source',
              'language',
              'category',
              'scope',
              'publishedAt',
            ],
          },
        },
      },
      required: ['version', 'generatedAt', 'refreshIntervalMin', 'sources', 'items'],
    },
  },
};

const newsRefreshSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        generatedAt: { type: 'string' },
        items: { type: 'integer' },
        sources: { type: 'integer' },
      },
      required: ['ok', 'generatedAt', 'items', 'sources'],
    },
  },
};

/**
 * News aggregation endpoints.
 *
 * GET /api/v1/news/feed        → the cached NewsFeed, optionally revalidated.
 *   Query: lang, scope (national|state|constituency), state, constituencyId, category, limit
 * POST /api/v1/news/refresh    → legacy entry point for the same bounded refresh.
 */
export async function newsRoutes(app: FastifyInstance) {
  app.get('/api/v1/news/feed', { schema: newsFeedSchema }, async (request, reply) => {
    const q = request.query as Omit<FeedFilters, 'limit'> & { refresh?: boolean; limit?: number };
    const filters: FeedFilters = {
      lang: q.lang,
      scope: q.scope,
      state: q.state,
      constituencyId: q.constituencyId,
      category: q.category,
      limit: q.limit,
    };
    reply.header('Cache-Control', q.refresh ? 'no-store' : 'public, max-age=30, s-maxage=30');
    try {
      const previous = getFeed(filters);
      if (q.refresh || Date.parse(previous.generatedAt) === 0) {
        await ensureFreshNews();
        return getFeed(filters);
      }
      return previous;
    } catch {
      reply.header('Cache-Control', 'no-store');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'News could not be refreshed. Try again shortly.',
        {
          code: 'NEWS_REFRESH_ERROR',
        },
      );
    }
  });

  app.post('/api/v1/news/refresh', { schema: newsRefreshSchema }, async (request, reply) => {
    try {
      await ensureFreshNews();
      const feed = getFeed();
      return {
        ok: true,
        generatedAt: feed.generatedAt,
        items: feed.items.length,
        sources: feed.sources.length,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal news refresh error';
      return sendApiError(reply, request, 500, 'Internal Server Error', message, {
        code: 'NEWS_REFRESH_ERROR',
      });
    }
  });
}
