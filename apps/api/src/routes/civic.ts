import type { FastifyInstance } from 'fastify';

export async function civicRoutes(app: FastifyInstance) {
  /** GET /api/v1/civic/budget/:stateCode — state budget summary */
  app.get('/api/v1/civic/budget/:stateCode', async (request) => {
    const { stateCode } = request.params as { stateCode: string };
    return {
      stateCode,
      message: 'Budget endpoint — connect to Supabase for live data',
    };
  });

  /** GET /api/v1/civic/attendance — legislator attendance */
  app.get('/api/v1/civic/attendance', async (request) => {
    const { state, sessionYear } = request.query as { state?: string; sessionYear?: string };
    return {
      attendance: [],
      total: 0,
      filters: { state, sessionYear },
    };
  });

  /** GET /api/v1/civic/bills — bills and legislation */
  app.get('/api/v1/civic/bills', async (request) => {
    const { state, status, type } = request.query as { state?: string; status?: string; type?: string };
    return {
      bills: [],
      total: 0,
      filters: { state, status, type },
    };
  });

  /** POST /api/v1/civic/bills/:id/opinion — support/oppose a bill */
  app.post('/api/v1/civic/bills/:id/opinion', async (request) => {
    const { id } = request.params as { id: string };
    const { support } = request.body as { support: boolean };
    return { success: true, billId: id, support, message: 'Opinion recorded' };
  });

  /** GET /api/v1/civic/schemes — government schemes */
  app.get('/api/v1/civic/schemes', async (request) => {
    const { state, category, level } = request.query as { state?: string; category?: string; level?: string };
    return {
      schemes: [],
      total: 0,
      filters: { state, category, level },
    };
  });

  /** GET /api/v1/civic/projects — development projects */
  app.get('/api/v1/civic/projects', async (request) => {
    const { state, phase, category, constituency } = request.query as {
      state?: string;
      phase?: string;
      category?: string;
      constituency?: string;
    };
    return {
      projects: [],
      total: 0,
      filters: { state, phase, category, constituency },
    };
  });

  /** GET /api/v1/civic/rti — public RTI requests */
  app.get('/api/v1/civic/rti', async (request) => {
    const { state, status, department } = request.query as { state?: string; status?: string; department?: string };
    return {
      rtiRequests: [],
      total: 0,
      filters: { state, status, department },
    };
  });

  /** POST /api/v1/civic/rti — file new RTI request */
  app.post('/api/v1/civic/rti', async (request) => {
    const body = request.body as Record<string, unknown>;
    return { success: true, id: `rti_${Date.now()}`, message: 'RTI request filed', data: body };
  });

  /** POST /api/v1/civic/rti/:id/upvote — upvote a public RTI */
  app.post('/api/v1/civic/rti/:id/upvote', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, rtiId: id, message: 'Upvote recorded' };
  });

  /** GET /api/v1/civic/hearings — public hearings */
  app.get('/api/v1/civic/hearings', async (request) => {
    const { state, type, upcoming } = request.query as { state?: string; type?: string; upcoming?: string };
    return {
      hearings: [],
      total: 0,
      filters: { state, type, upcoming },
    };
  });

  /** GET /api/v1/civic/cdi/:constituencyId — constituency development index */
  app.get('/api/v1/civic/cdi/:constituencyId', async (request) => {
    const { constituencyId } = request.params as { constituencyId: string };
    return {
      constituencyId,
      message: 'CDI endpoint — connect to Supabase for live data',
    };
  });
}
