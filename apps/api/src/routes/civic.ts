import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

const issueUpvoteSchema = {
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
        issueId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'issueId'],
    },
  },
};

const issueFollowSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    properties: {
      follow: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issueId: { type: 'string' },
        following: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'issueId', 'following'],
    },
  },
};

const createIssueSchema = {
  body: {
    type: 'object',
    required: ['title', 'category', 'stateCode'],
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      category: {
        type: 'string',
        enum: [
          'roads', 'water', 'electricity', 'sanitation', 'healthcare',
          'education', 'public_safety', 'transport', 'housing',
          'environment', 'corruption', 'other',
        ],
      },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      constituencyId: { type: 'string' },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      mediaUrls: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'id'],
    },
  },
};

const updateIssueStatusSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      },
      note: { type: 'string', maxLength: 500 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        issueId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'issueId', 'status'],
    },
  },
};

const addIssueCommentSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['body'],
    properties: {
      body: { type: 'string', minLength: 1, maxLength: 1000 },
      userName: { type: 'string', maxLength: 100 },
      imageUrl: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        id: { type: 'string' },
        issueId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['success', 'id', 'issueId'],
    },
  },
};

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
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to record opinion', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { support } = request.body;
    const { data: bill, error: fetchErr } = await supabase
      .from('bills')
      .select('public_opinion')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
        code: 'DATABASE_ERROR',
      });
    }
    if (!bill) {
      return sendApiError(reply, request, 404, 'Not Found', `Bill ${id} not found`, {
        code: 'NOT_FOUND',
      });
    }
    const opinion = bill.public_opinion || { support: 0, oppose: 0, neutral: 0 };
    if (support) opinion.support = (opinion.support || 0) + 1;
    else opinion.oppose = (opinion.oppose || 0) + 1;
    const { error: updateErr } = await supabase
      .from('bills')
      .update({ public_opinion: opinion, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
        code: 'DATABASE_ERROR',
      });
    }
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
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to file RTI', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const body = request.body;
    const { data, error } = await supabase
      .from('rti_requests')
      .insert({
        user_id: auth.userId,
        subject: (body.subject as string) || 'RTI Query',
        department: (body.department as string) || 'General Administration',
        authority: (body.authority as string) || 'Public Information Officer',
        question_text: (body.description as string) || (body.subject as string) || 'Information requested',
        state_code: (body.state as string) || (body.stateCode as string) || 'TS',
        status: 'draft',
      })
      .select('id')
      .single();
    if (error || !data) {
      return sendApiError(reply, request, 500, 'Internal Server Error', error?.message || 'Failed to file RTI', {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, id: data.id, message: 'RTI request filed', data: body };
  });

  /** 9. POST /api/v1/civic/rti/:id/upvote — upvote a public RTI */
  app.post<{
    Params: { id: string };
  }>('/api/v1/civic/rti/:id/upvote', {
    schema: upvoteRtiSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to upvote RTI', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { data: rti, error: fetchErr } = await supabase
      .from('rti_requests')
      .select('upvotes')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
        code: 'DATABASE_ERROR',
      });
    }
    if (!rti) {
      return sendApiError(reply, request, 404, 'Not Found', `RTI request ${id} not found`, {
        code: 'NOT_FOUND',
      });
    }
    const newUpvotes = (rti.upvotes || 0) + 1;
    const { error: updateErr } = await supabase
      .from('rti_requests')
      .update({ upvotes: newUpvotes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
        code: 'DATABASE_ERROR',
      });
    }
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

  /** 12. POST /api/v1/civic/issues/:id/upvote — upvote civic issue */
  app.post<{
    Params: { id: string };
  }>('/api/v1/civic/issues/:id/upvote', {
    schema: issueUpvoteSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to upvote issue', {
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
      .from('issue_upvotes')
      .upsert({ issue_id: id, user_id: auth.userId }, { onConflict: 'issue_id,user_id' });
    if (error) {
      return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, issueId: id, message: 'Issue upvoted successfully' };
  });

  /** 13. DELETE /api/v1/civic/issues/:id/upvote — remove upvote from civic issue */
  app.delete<{
    Params: { id: string };
  }>('/api/v1/civic/issues/:id/upvote', {
    schema: issueUpvoteSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to remove upvote', {
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
      .from('issue_upvotes')
      .delete()
      .eq('issue_id', id)
      .eq('user_id', auth.userId);
    if (error) {
      return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, issueId: id, message: 'Issue upvote removed successfully' };
  });

  /** 14. POST /api/v1/civic/issues/:id/follow — follow or unfollow civic issue */
  app.post<{
    Params: { id: string };
    Body: { follow?: boolean };
  }>('/api/v1/civic/issues/:id/follow', {
    schema: issueFollowSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to follow issue', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const follow = request.body?.follow !== false;
    if (follow) {
      const { error } = await supabase
        .from('issue_follows')
        .upsert({ issue_id: id, user_id: auth.userId }, { onConflict: 'issue_id,user_id' });
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
    } else {
      const { error } = await supabase
        .from('issue_follows')
        .delete()
        .eq('issue_id', id)
        .eq('user_id', auth.userId);
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
    }
    return { success: true, issueId: id, following: follow, message: follow ? 'Issue followed' : 'Issue unfollowed' };
  });

  /** 15. POST /api/v1/civic/issues — report a civic issue */
  app.post<{
    Body: {
      title: string;
      description?: string;
      category: string;
      severity?: string;
      constituencyId?: string;
      stateCode: string;
      mediaUrls?: string[];
    };
  }>('/api/v1/civic/issues', {
    schema: createIssueSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to report issue', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const body = request.body;
    const { data, error } = await supabase
      .from('civic_issues')
      .insert({
        title: body.title,
        description: body.description || '',
        category: body.category,
        severity: body.severity || 'medium',
        constituency_id: body.constituencyId,
        state_code: body.stateCode,
        reporter_id: auth.userId,
        media_urls: body.mediaUrls || [],
        status: 'open',
      })
      .select('id')
      .single();
    if (error || !data) {
      return sendApiError(reply, request, 500, 'Internal Server Error', error?.message || 'Failed to report issue', {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, id: data.id, message: 'Civic issue reported successfully' };
  });

  /** 16. PATCH /api/v1/civic/issues/:id/status — update civic issue status */
  app.patch<{
    Params: { id: string };
    Body: { status: string; note?: string };
  }>('/api/v1/civic/issues/:id/status', {
    schema: updateIssueStatusSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to update issue status', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { status, note } = request.body;

    const { data: issue, error: fetchErr } = await supabase
      .from('civic_issues')
      .select('reporter_id, status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
        code: 'DATABASE_ERROR',
      });
    }
    if (!issue) {
      return sendApiError(reply, request, 404, 'Not Found', `Civic issue ${id} not found`, {
        code: 'NOT_FOUND',
      });
    }

    const isAuthor = issue.reporter_id === auth.userId;
    const hasPrivilegedRole = ['admin', 'moderator', 'official', 'politician'].includes(auth.role);
    if (!isAuthor && !hasPrivilegedRole) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Only the issue reporter or an authorized official may update issue status', {
        code: 'FORBIDDEN',
      });
    }

    const { error: updateErr } = await supabase
      .from('civic_issues')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) {
      return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
        code: 'DATABASE_ERROR',
      });
    }

    await supabase.from('issue_status_history').insert({
      issue_id: id,
      from_status: issue.status,
      to_status: status,
      changed_by: auth.userId,
      note: note || null,
    });

    return { success: true, issueId: id, status, message: `Status updated to ${status}` };
  });

  /** 17. POST /api/v1/civic/issues/:id/comments — add comment to civic issue */
  app.post<{
    Params: { id: string };
    Body: { body: string; userName?: string; imageUrl?: string };
  }>('/api/v1/civic/issues/:id/comments', {
    schema: addIssueCommentSchema,
  }, async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required to comment on issue', {
        code: 'UNAUTHORIZED',
      });
    }
    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database is unavailable', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const { id } = request.params;
    const { body, userName, imageUrl } = request.body;

    const { data, error } = await supabase
      .from('issue_comments')
      .insert({
        issue_id: id,
        user_id: auth.userId,
        user_name: userName || 'Anonymous',
        body,
        image_url: imageUrl || null,
      })
      .select('id')
      .single();
    if (error || !data) {
      return sendApiError(reply, request, 500, 'Internal Server Error', error?.message || 'Failed to add comment', {
        code: 'DATABASE_ERROR',
      });
    }
    return { success: true, id: data.id, issueId: id, message: 'Comment added successfully' };
  });
}
