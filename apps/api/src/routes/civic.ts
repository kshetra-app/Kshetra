import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';

// Schema definitions for civic endpoints
const budgetSchema = {
  params: {
    type: 'object',
    required: ['stateCode'],
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        stateCode: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['stateCode', 'message'],
    },
  },
};

const attendanceSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      sessionYear: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        attendance: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            sessionYear: { type: 'string' },
          },
        },
      },
      required: ['attendance', 'total'],
    },
  },
};

const billsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string' },
      type: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        bills: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
      required: ['bills', 'total'],
    },
  },
};

const billOpinionSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['support'],
    properties: {
      support: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        billId: { type: 'string' },
        support: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'billId', 'support'],
    },
  },
};

const schemesSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      category: { type: 'string' },
      level: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        schemes: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            category: { type: 'string' },
            level: { type: 'string' },
          },
        },
      },
      required: ['schemes', 'total'],
    },
  },
};

const projectsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      phase: { type: 'string' },
      category: { type: 'string' },
      constituency: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        projects: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            phase: { type: 'string' },
            category: { type: 'string' },
            constituency: { type: 'string' },
          },
        },
      },
      required: ['projects', 'total'],
    },
  },
};

const rtiListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string' },
      department: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        rtiRequests: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
            department: { type: 'string' },
          },
        },
      },
      required: ['rtiRequests', 'total'],
    },
  },
};

const createRtiSchema = {
  body: {
    type: 'object',
    required: ['subject'],
    properties: {
      subject: { type: 'string', minLength: 1 },
      department: { type: 'string' },
      description: { type: 'string' },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'id', 'message'],
    },
  },
};

const upvoteRtiSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        rtiId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'rtiId'],
    },
  },
};

const hearingsSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      type: { type: 'string' },
      upcoming: { type: 'string' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        hearings: { type: 'array' },
        total: { type: 'number' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            type: { type: 'string' },
            upcoming: { type: 'string' },
          },
        },
      },
      required: ['hearings', 'total'],
    },
  },
};

const cdiSchema = {
  params: {
    type: 'object',
    required: ['constituencyId'],
    properties: {
      constituencyId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        constituencyId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['constituencyId', 'message'],
    },
  },
};

export async function civicRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/civic/budget/:stateCode — state budget summary */
  app.get<{ Params: { stateCode: string } }>('/api/v1/civic/budget/:stateCode', {
    schema: budgetSchema,
  }, async (request) => {
    const { stateCode } = request.params;
    return {
      stateCode,
      message: 'Budget endpoint — connect to Supabase for live data',
    };
  });

  /** 2. GET /api/v1/civic/attendance — legislator attendance */
  app.get<{
    Querystring: { state?: string; sessionYear?: string; page?: number; limit?: number };
  }>('/api/v1/civic/attendance', {
    schema: attendanceSchema,
  }, async (request) => {
    const { state, sessionYear } = request.query;
    return {
      attendance: [],
      total: 0,
      filters: { state, sessionYear },
    };
  });

  /** 3. GET /api/v1/civic/bills — bills and legislation */
  app.get<{
    Querystring: { state?: string; status?: string; type?: string; page?: number; limit?: number };
  }>('/api/v1/civic/bills', {
    schema: billsSchema,
  }, async (request) => {
    const { state, status, type } = request.query;
    return {
      bills: [],
      total: 0,
      filters: { state, status, type },
    };
  });

  /** 4. POST /api/v1/civic/bills/:id/opinion — support/oppose a bill */
  app.post<{
    Params: { id: string };
    Body: { support: boolean };
  }>('/api/v1/civic/bills/:id/opinion', {
    schema: billOpinionSchema,
  }, async (request) => {
    const { id } = request.params;
    const { support } = request.body;
    return { success: true, billId: id, support, message: 'Opinion recorded' };
  });

  /** 5. GET /api/v1/civic/schemes — government schemes */
  app.get<{
    Querystring: { state?: string; category?: string; level?: string; page?: number; limit?: number };
  }>('/api/v1/civic/schemes', {
    schema: schemesSchema,
  }, async (request) => {
    const { state, category, level } = request.query;
    return {
      schemes: [],
      total: 0,
      filters: { state, category, level },
    };
  });

  /** 6. GET /api/v1/civic/projects — development projects */
  app.get<{
    Querystring: { state?: string; phase?: string; category?: string; constituency?: string; page?: number; limit?: number };
  }>('/api/v1/civic/projects', {
    schema: projectsSchema,
  }, async (request) => {
    const { state, phase, category, constituency } = request.query;
    return {
      projects: [],
      total: 0,
      filters: { state, phase, category, constituency },
    };
  });

  /** 7. GET /api/v1/civic/rti — public RTI requests */
  app.get<{
    Querystring: { state?: string; status?: string; department?: string; page?: number; limit?: number };
  }>('/api/v1/civic/rti', {
    schema: rtiListSchema,
  }, async (request) => {
    const { state, status, department } = request.query;
    return {
      rtiRequests: [],
      total: 0,
      filters: { state, status, department },
    };
  });

  /** 8. POST /api/v1/civic/rti — file new RTI request */
  app.post<{
    Body: Record<string, unknown>;
  }>('/api/v1/civic/rti', {
    schema: createRtiSchema,
  }, async (request) => {
    const body = request.body;
    return { success: true, id: `rti_${Date.now()}`, message: 'RTI request filed', data: body };
  });

  /** 9. POST /api/v1/civic/rti/:id/upvote — upvote a public RTI */
  app.post<{
    Params: { id: string };
  }>('/api/v1/civic/rti/:id/upvote', {
    schema: upvoteRtiSchema,
  }, async (request) => {
    const { id } = request.params;
    return { success: true, rtiId: id, message: 'Upvote recorded' };
  });

  /** 10. GET /api/v1/civic/hearings — public hearings */
  app.get<{
    Querystring: { state?: string; type?: string; upcoming?: string; page?: number; limit?: number };
  }>('/api/v1/civic/hearings', {
    schema: hearingsSchema,
  }, async (request) => {
    const { state, type, upcoming } = request.query;
    return {
      hearings: [],
      total: 0,
      filters: { state, type, upcoming },
    };
  });

  /** 11. GET /api/v1/civic/cdi/:constituencyId — constituency development index */
  app.get<{ Params: { constituencyId: string } }>('/api/v1/civic/cdi/:constituencyId', {
    schema: cdiSchema,
  }, async (request) => {
    const { constituencyId } = request.params;
    return {
      constituencyId,
      message: 'CDI endpoint — connect to Supabase for live data',
    };
  });
}
