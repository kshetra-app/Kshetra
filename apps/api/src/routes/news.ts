import type { FastifyInstance } from 'fastify';
import { getFeed, refreshNews, type FeedFilters } from '../services/news/newsService';

/**
 * News aggregation endpoints.
 *
 * GET /api/v1/news/feed        → the cached NewsFeed (refreshed hourly).
 *   Query: lang, scope (national|state), state, category, limit
 * POST /api/v1/news/refresh    → force a re-scrape (admin/manual trigger).
 */
export async function newsRoutes(app: FastifyInstance) {
  app.get('/api/v1/news/feed', async (request, reply) => {
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
