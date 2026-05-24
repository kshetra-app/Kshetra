import type { FastifyInstance } from 'fastify';

export async function journalistRoutes(app: FastifyInstance) {
  /** GET /api/v1/journalist/articles — list published articles */
  app.get('/api/v1/journalist/articles', async (request) => {
    const { state, beat, limit } = request.query as { state?: string; beat?: string; limit?: string };
    return {
      articles: [],
      total: 0,
      message: 'Journalist articles endpoint — connect to Supabase for live data',
      filters: { state, beat, limit: limit ? parseInt(limit) : 20 },
    };
  });

  /** GET /api/v1/journalist/articles/:id — single article */
  app.get('/api/v1/journalist/articles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.code(404).send({ error: `Article ${id} not found — connect to Supabase` });
  });

  /** GET /api/v1/journalist/fact-checks — list fact checks */
  app.get('/api/v1/journalist/fact-checks', async (request) => {
    const { verdict, limit } = request.query as { verdict?: string; limit?: string };
    return {
      factChecks: [],
      total: 0,
      message: 'Fact-check endpoint — connect to Supabase for live data',
      filters: { verdict, limit: limit ? parseInt(limit) : 20 },
    };
  });

  /** GET /api/v1/journalist/breaking — active breaking news */
  app.get('/api/v1/journalist/breaking', async () => {
    return {
      breakingNews: [],
      message: 'Breaking news endpoint — connect to Supabase for live data',
    };
  });

  /** GET /api/v1/journalist/profiles — journalist profiles */
  app.get('/api/v1/journalist/profiles', async (request) => {
    const { tier, state } = request.query as { tier?: string; state?: string };
    return {
      journalists: [],
      total: 0,
      filters: { tier, state },
    };
  });

  /** POST /api/v1/journalist/articles/:id/vouch — vouch for an article */
  app.post('/api/v1/journalist/articles/:id/vouch', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { success: true, articleId: id, message: 'Article vouched' };
  });

  /** POST /api/v1/journalist/articles/:id/flag — flag an article */
  app.post('/api/v1/journalist/articles/:id/flag', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    return { success: true, articleId: id, reason, message: 'Article flagged for review' };
  });

  /** POST /api/v1/journalist/articles/:id/tip — tip a journalist */
  app.post('/api/v1/journalist/articles/:id/tip', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amountINR } = request.body as { amountINR?: number };
    return { success: true, articleId: id, amountINR, message: 'Tip recorded — payment integration pending' };
  });
}
