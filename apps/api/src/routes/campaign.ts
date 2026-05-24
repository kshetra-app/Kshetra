import type { FastifyInstance } from 'fastify';

export async function campaignRoutes(app: FastifyInstance) {
  /** GET /api/v1/campaign/campaigns — list campaigns */
  app.get('/api/v1/campaign/campaigns', async (request) => {
    const { status, state, politicianId } = request.query as { status?: string; state?: string; politicianId?: string };
    return {
      campaigns: [],
      total: 0,
      filters: { status, state, politicianId },
    };
  });

  /** POST /api/v1/campaign/campaigns — create campaign */
  app.post('/api/v1/campaign/campaigns', async (request) => {
    const body = request.body as Record<string, unknown>;
    return { success: true, id: `camp_${Date.now()}`, message: 'Campaign created', data: body };
  });

  /** GET /api/v1/campaign/campaigns/:id — single campaign */
  app.get('/api/v1/campaign/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.code(404).send({ error: `Campaign ${id} not found` });
  });

  /** GET /api/v1/campaign/ads — list ads */
  app.get('/api/v1/campaign/ads', async (request) => {
    const { campaignId, status, format } = request.query as { campaignId?: string; status?: string; format?: string };
    return {
      ads: [],
      total: 0,
      filters: { campaignId, status, format },
    };
  });

  /** POST /api/v1/campaign/ads — create ad */
  app.post('/api/v1/campaign/ads', async (request) => {
    const body = request.body as Record<string, unknown>;
    return { success: true, id: `ad_${Date.now()}`, message: 'Ad created — pending review', data: body };
  });

  /** PATCH /api/v1/campaign/ads/:id/pause — pause ad */
  app.patch('/api/v1/campaign/ads/:id/pause', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, adId: id, status: 'paused', message: 'Ad paused' };
  });

  /** PATCH /api/v1/campaign/ads/:id/resume — resume ad */
  app.patch('/api/v1/campaign/ads/:id/resume', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, adId: id, status: 'active', message: 'Ad resumed' };
  });

  /** GET /api/v1/campaign/revenue — revenue dashboard data */
  app.get('/api/v1/campaign/revenue', async () => {
    return {
      totalRevenue: 0,
      mrr: 0,
      activeCampaigns: 0,
      message: 'Revenue endpoint — connect to Supabase for live data',
    };
  });

  /** GET /api/v1/campaign/booths — booth strategy data */
  app.get('/api/v1/campaign/booths', async (request) => {
    const { campaignId, priority } = request.query as { campaignId?: string; priority?: string };
    return {
      booths: [],
      total: 0,
      filters: { campaignId, priority },
    };
  });

  /** GET /api/v1/campaign/volunteers — volunteer list */
  app.get('/api/v1/campaign/volunteers', async (request) => {
    const { campaignId, role, status } = request.query as { campaignId?: string; role?: string; status?: string };
    return {
      volunteers: [],
      total: 0,
      filters: { campaignId, role, status },
    };
  });

  /** GET /api/v1/campaign/ab-tests — A/B test results */
  app.get('/api/v1/campaign/ab-tests', async (request) => {
    const { campaignId, status } = request.query as { campaignId?: string; status?: string };
    return {
      abTests: [],
      total: 0,
      filters: { campaignId, status },
    };
  });
}
