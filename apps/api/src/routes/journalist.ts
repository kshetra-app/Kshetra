import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';

// ─── AJV SCHEMAS FOR JOURNALIST ROUTES ───

const articlesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      beat: { type: 'string', maxLength: 50 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      page: { type: 'integer', minimum: 1, default: 1 },
    },
  },
};

const articleIdParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
};

const factChecksQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      verdict: { type: 'string', maxLength: 50 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
};

const profilesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      tier: { type: 'string', maxLength: 50 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const vouchSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
};

const flagSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
  body: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
};

const tipSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
  body: {
    type: 'object',
    required: ['amountINR'],
    properties: {
      amountINR: { type: 'number', minimum: 1, maximum: 100000 },
    },
  },
};

export async function journalistRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/journalist/articles — list published articles */
  app.get<{
    Querystring: { state?: string; beat?: string; limit?: number; page?: number };
  }>('/api/v1/journalist/articles', { schema: articlesQuerySchema }, async (request) => {
    const { state, beat, limit = 20, page = 1 } = request.query;
    return {
      articles: [],
      total: 0,
      page,
      message: 'Journalist articles endpoint — connect to Supabase for live data',
      filters: { state, beat, limit },
    };
  });

  /** 2. GET /api/v1/journalist/articles/:id — single article */
  app.get<{ Params: { id: string } }>(
    '/api/v1/journalist/articles/:id',
    { schema: articleIdParamSchema },
    async (request, reply) => {
      const { id } = request.params;
      return sendApiError(reply, request, 404, 'Not Found', `Article ${id} not found — connect to Supabase`, {
        code: 'NOT_FOUND',
      });
    }
  );

  /** 3. GET /api/v1/journalist/fact-checks — list fact checks */
  app.get<{
    Querystring: { verdict?: string; limit?: number };
  }>('/api/v1/journalist/fact-checks', { schema: factChecksQuerySchema }, async (request) => {
    const { verdict, limit = 20 } = request.query;
    return {
      factChecks: [],
      total: 0,
      message: 'Fact-check endpoint — connect to Supabase for live data',
      filters: { verdict, limit },
    };
  });

  /** 4. GET /api/v1/journalist/breaking — active breaking news */
  app.get('/api/v1/journalist/breaking', async () => {
    return {
      breakingNews: [],
      message: 'Breaking news endpoint — connect to Supabase for live data',
    };
  });

  /** 5. GET /api/v1/journalist/profiles — journalist profiles */
  app.get<{
    Querystring: { tier?: string; state?: string };
  }>('/api/v1/journalist/profiles', { schema: profilesQuerySchema }, async (request) => {
    const { tier, state } = request.query;
    return {
      journalists: [],
      total: 0,
      filters: { tier, state },
    };
  });

  /** 6. POST /api/v1/journalist/articles/:id/vouch — vouch for an article */
  app.post<{ Params: { id: string } }>(
    '/api/v1/journalist/articles/:id/vouch',
    { schema: vouchSchema },
    async (request) => {
      const { id } = request.params;
      return { success: true, articleId: id, message: 'Article vouched' };
    }
  );

  /** 7. POST /api/v1/journalist/articles/:id/flag — flag an article */
  app.post<{
    Params: { id: string };
    Body: { reason: string };
  }>('/api/v1/journalist/articles/:id/flag', { schema: flagSchema }, async (request) => {
    const { id } = request.params;
    const { reason } = request.body;
    return { success: true, articleId: id, reason, message: 'Article flagged for review' };
  });

  /** 8. POST /api/v1/journalist/articles/:id/tip — tip a journalist */
  app.post<{
    Params: { id: string };
    Body: { amountINR: number };
  }>('/api/v1/journalist/articles/:id/tip', { schema: tipSchema }, async (request) => {
    const { id } = request.params;
    const { amountINR } = request.body;
    return { success: true, articleId: id, amountINR, message: 'Tip recorded — payment integration pending' };
  });
}
