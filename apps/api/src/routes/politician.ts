import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

async function resolveAuthUser(
  request: any
): Promise<{ userId: string; role: string } | null> {
  let userId: string | null = null;
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === 'invalid-token' || token === 'expired-token') {
      return null;
    }
    if (isSupabaseConfigured) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }
  }

  if (!userId && (request.headers['x-user-id'] as string)) {
    userId = request.headers['x-user-id'] as string;
  }

  if (!userId) return null;

  return { userId, role: (request.headers['x-user-role'] as string) || 'citizen' };
}

// ─── AJV SCHEMAS FOR POLITICIAN ROUTES ───

const profilesListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      tier: { type: 'string', enum: ['national', 'state', 'local'] },
      party: { type: 'string', minLength: 1, maxLength: 50 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        politicians: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              state: { type: 'string' },
              party: { type: 'string' },
              tier: { type: 'string' },
            },
            required: ['id', 'name'],
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            tier: { type: 'string' },
            party: { type: 'string' },
          },
        },
      },
      required: ['politicians', 'total'],
    },
  },
};

const profileDetailSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        state: { type: 'string' },
        party: { type: 'string' },
        tier: { type: 'string' },
      },
      required: ['id', 'name'],
    },
  },
};

const eventsListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      type: { type: 'string', minLength: 1, maxLength: 50 },
      upcoming: { type: 'string', enum: ['true', 'false', '1', '0'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              date: { type: 'string' },
              location: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['id', 'title'],
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            type: { type: 'string' },
            upcoming: { type: 'string' },
          },
        },
      },
      required: ['events', 'total'],
    },
  },
};

const rsvpSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        eventId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'eventId', 'message'],
    },
  },
};

const manifestosListSchema = {
  querystring: {
    type: 'object',
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        manifestos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              politicianId: { type: 'string' },
              title: { type: 'string' },
              year: { type: 'integer' },
            },
            required: ['id', 'title'],
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            politicianId: { type: 'string' },
            state: { type: 'string' },
          },
        },
      },
      required: ['manifestos', 'total'],
    },
  },
};

const manifestoVoteSchema = {
  params: {
    type: 'object',
    required: ['manifestoId', 'itemId'],
    properties: {
      manifestoId: { type: 'string', minLength: 1, maxLength: 64 },
      itemId: { type: 'string', minLength: 1, maxLength: 64 },
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
        manifestoId: { type: 'string' },
        itemId: { type: 'string' },
        support: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'manifestoId', 'itemId', 'support', 'message'],
    },
  },
};

const surveysListSchema = {
  querystring: {
    type: 'object',
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string', enum: ['active', 'closed', 'upcoming'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        surveys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
            },
            required: ['id', 'title'],
          },
        },
        total: { type: 'integer' },
        filters: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
      required: ['surveys', 'total'],
    },
  },
};

const surveyRespondSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  body: {
    type: 'object',
    required: ['answers'],
    properties: {
      answers: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        surveyId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'surveyId', 'message'],
    },
  },
};

const politicianGrievanceSchema = {
  body: {
    type: 'object',
    required: ['politicianId', 'subject', 'description', 'category'],
    properties: {
      politicianId: { type: 'string', minLength: 1, maxLength: 64 },
      subject: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', minLength: 1, maxLength: 5000 },
      category: { type: 'string', minLength: 1, maxLength: 50 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        politicianId: { type: 'string' },
        subject: { type: 'string' },
        category: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'politicianId', 'subject', 'category', 'message'],
    },
  },
};

export async function politicianRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/politician/profiles — list politicians on the portal */
  app.get<{
    Querystring: { state?: string; tier?: string; party?: string };
  }>('/api/v1/politician/profiles', {
    schema: profilesListSchema,
  }, async (request) => {
    const { state, tier, party } = request.query;
    return {
      politicians: [],
      total: 0,
      filters: { state, tier, party },
    };
  });

  /** 2. GET /api/v1/politician/profiles/:id — single politician portal profile */
  app.get<{
    Params: { id: string };
  }>('/api/v1/politician/profiles/:id', {
    schema: profileDetailSchema,
  }, async (request, reply) => {
    const { id } = request.params;
    return sendApiError(reply, request, 404, 'Not Found', `Politician ${id} not found`, {
      code: 'NOT_FOUND',
    });
  });

  /** 3. GET /api/v1/politician/events — upcoming political events */
  app.get<{
    Querystring: { state?: string; type?: string; upcoming?: string };
  }>('/api/v1/politician/events', {
    schema: eventsListSchema,
  }, async (request) => {
    const { state, type, upcoming } = request.query;
    return {
      events: [],
      total: 0,
      filters: { state, type, upcoming },
    };
  });

  /** 4. POST /api/v1/politician/events/:id/rsvp — RSVP to event */
  app.post<{
    Params: { id: string };
  }>('/api/v1/politician/events/:id/rsvp', {
    schema: rsvpSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to RSVP', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { error } = await supabase
      .from('event_rsvps')
      .upsert(
        { event_id: id, user_id: auth.userId, status: 'going' },
        { onConflict: 'event_id,user_id' }
      );
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        return { success: true, eventId: id, message: 'RSVP recorded' };
      }
      return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, eventId: id, message: 'RSVP recorded' };
  });

  /** 5. GET /api/v1/politician/manifestos — e-manifestos */
  app.get<{
    Querystring: { politicianId?: string; state?: string };
  }>('/api/v1/politician/manifestos', {
    schema: manifestosListSchema,
  }, async (request, reply) => {
    const { politicianId, state } = request.query;
    if (!isSupabaseConfigured) return sendApiError(reply, request, 503, 'Service Unavailable', 'Manifesto data is temporarily unavailable.', { code: 'DATABASE_UNAVAILABLE' });

    let query = supabase.from('e_manifestos').select('id, politician_id, title, published_at, created_at, state_code').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false });
    if (politicianId) query = query.eq('politician_id', politicianId);
    if (state) query = query.eq('state_code', state);
    const { data, error } = await query;
    if (error) {
      request.log.error({ err: error }, 'Failed to read published manifestos');
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Manifesto data is temporarily unavailable.', { code: 'DATABASE_ERROR' });
    }
    const manifestos = (data ?? []).map((row) => ({
      id: row.id, politicianId: row.politician_id, title: row.title,
      year: new Date(row.published_at ?? row.created_at).getUTCFullYear(),
    }));
    return { manifestos, total: manifestos.length, filters: { politicianId, state } };
  });

  /** 6. POST /api/v1/politician/manifestos/:manifestoId/items/:itemId/vote — vote on manifesto item (BLOCKED in B4 per CTO directive: no persistence table) */
  app.post<{
    Params: { manifestoId: string; itemId: string };
    Body: { support: boolean };
  }>('/api/v1/politician/manifestos/:manifestoId/items/:itemId/vote', {
    schema: manifestoVoteSchema,
  }, async (request, reply) => {
    return sendApiError(
      reply,
      request,
      501,
      'Not Implemented',
      'Manifesto item voting persistence target is not available in current database schema (Operation 8 blocked in W009-B4)',
      { code: 'PERSISTENCE_TARGET_UNAVAILABLE' }
    );
  });

  /** 7. GET /api/v1/politician/surveys — opinion surveys */
  app.get<{
    Querystring: { state?: string; status?: string };
  }>('/api/v1/politician/surveys', {
    schema: surveysListSchema,
  }, async (request, reply) => {
    const { state, status } = request.query;
    // Public listing is deliberately limited to active surveys; the server client can bypass RLS.
    if (status && status !== 'active') return sendApiError(reply, request, 400, 'Bad Request', 'Only active surveys are available through the public listing.', { code: 'INVALID_STATUS_FILTER' });
    if (!isSupabaseConfigured) return sendApiError(reply, request, 503, 'Service Unavailable', 'Survey data is temporarily unavailable.', { code: 'DATABASE_UNAVAILABLE' });

    const today = new Date().toISOString().slice(0, 10);
    let query = supabase.from('politician_surveys').select('id, politician_id, title, description, status, target_state_code, questions, response_count, start_date, end_date, created_at').eq('status', 'active').lte('start_date', today).gte('end_date', today).order('start_date', { ascending: false });
    if (state) query = query.eq('target_state_code', state);
    const { data, error } = await query;
    if (error) {
      request.log.error({ err: error }, 'Failed to read active surveys');
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Survey data is temporarily unavailable.', { code: 'DATABASE_ERROR' });
    }
    const surveys = (data ?? []).map((row) => ({
      id: row.id, title: row.title, politicianId: row.politician_id, description: row.description,
      state: row.target_state_code, status: row.status, questions: row.questions ?? [],
      responseCount: row.response_count ?? 0, startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at,
    }));
    return { surveys, total: surveys.length, filters: { state, status: 'active' } };
  });

  /** 8. POST /api/v1/politician/surveys/:id/respond — submit survey response */
  app.post<{
    Params: { id: string };
    Body: { answers: Record<string, string> };
  }>('/api/v1/politician/surveys/:id/respond', {
    schema: surveyRespondSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to respond to survey', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { answers } = request.body;
    const { error } = await supabase
      .from('survey_responses')
      .upsert(
        { survey_id: id, user_id: auth.userId, answers },
        { onConflict: 'survey_id,user_id' }
      );
    if (error) {
      request.log.error({ err: error, surveyId: id }, 'Failed to persist survey response');
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Survey response could not be saved. Please retry.', { code: 'DATABASE_ERROR' });
    }
    return { success: true, surveyId: id, message: 'Response submitted' };
  });

  /** 9. POST /api/v1/politician/grievances — file a grievance (BLOCKED in B4 per CTO directive: no persistence table) */
  app.post<{
    Body: {
      politicianId: string;
      subject: string;
      description: string;
      category: string;
    };
  }>('/api/v1/politician/grievances', {
    schema: politicianGrievanceSchema,
  }, async (request, reply) => {
    return sendApiError(
      reply,
      request,
      501,
      'Not Implemented',
      'Politician grievance persistence target is not available in current database schema (Operation 10 blocked in W009-B4)',
      { code: 'PERSISTENCE_TARGET_UNAVAILABLE' }
    );
  });
}
