import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

// ─── AJV SCHEMAS FOR LMX ROUTES ───

const lmxLiveQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string', maxLength: 100 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string', enum: ['live', 'ended', 'all'] },
    },
  },
};

const lmxStreamIdParamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

const createLiveEventBodySchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      state_code: { type: 'string', pattern: '^[A-Z]{2}$' },
      issue_category: { type: 'string', maxLength: 100 },
      visibility_mode: { type: 'string', enum: ['public', 'unlisted', 'private'] },
      buffer_state: { type: 'string', enum: ['buffered', 'cleared', 'bypassed', 'rejected'] },
      priority_score: { type: 'integer', minimum: 0, maximum: 100 },
      assembly_constituency_id: { type: 'string', maxLength: 100 },
      parliamentary_constituency_id: { type: 'string', maxLength: 100 },
      stream_url: { type: 'string', maxLength: 1000 },
    },
  },
};

const moderateStreamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    required: ['decision'],
    properties: {
      decision: { type: 'string', enum: ['allow', 'mute', 'cut', 'escalate'] },
      reason: { type: 'string', maxLength: 500 },
      moderatorId: { type: 'string', maxLength: 128 },
    },
  },
};

const endStreamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    properties: {
      content_hash: { type: 'string', maxLength: 128 },
    },
  },
};

const lmxDepartmentsQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      type: { type: 'string', maxLength: 100 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const createDepartmentBodySchema = {
  body: {
    type: 'object',
    required: ['departmentType', 'officeName'],
    properties: {
      departmentType: { type: 'string', minLength: 1, maxLength: 100 },
      officeName: { type: 'string', minLength: 1, maxLength: 200 },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const createAlertBodySchema = {
  body: {
    type: 'object',
    required: ['department_id', 'alert_type', 'message'],
    properties: {
      department_id: { type: 'string', minLength: 1, maxLength: 128 },
      stream_id: { type: 'string', maxLength: 128 },
      alert_type: { type: 'string', minLength: 1, maxLength: 100 },
      message: { type: 'string', minLength: 1, maxLength: 1000 },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    },
  },
};

const acknowledgeAlertSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    required: ['acknowledgment', 'acknowledged_by'],
    properties: {
      acknowledgment: { type: 'string', minLength: 1, maxLength: 1000 },
      acknowledged_by: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

const createDistributionSchema = {
  body: {
    type: 'object',
    required: ['destination_type', 'endpoint_url'],
    properties: {
      stream_id: { type: 'string', maxLength: 128 },
      destination_type: { type: 'string', minLength: 1, maxLength: 50 },
      endpoint_url: { type: 'string', minLength: 1, maxLength: 500 },
      auth_token: { type: 'string', maxLength: 500 },
      status: { type: 'string', enum: ['active', 'inactive', 'failed'] },
    },
  },
};

/**
 * Kshetra Live Media Exchange (LMX) API
 */
export async function lmxRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/lmx/status — exchange + AI availability */
  app.get('/api/v1/lmx/status', async (_request, reply) => {
    return reply.send({
      status: 'operational',
      mediaPlane: 'self_hosted',
      aiService: 'inactive',
      supabase: isSupabaseConfigured ? 'connected' : 'offline',
    });
  });

  /** 2. GET /api/v1/lmx/live — public Live tab feed */
  app.get<{
    Querystring: { category?: string; state?: string; status?: 'live' | 'ended' | 'all' };
  }>('/api/v1/lmx/live', { schema: lmxLiveQuerySchema }, async (request, reply) => {
    if (!isSupabaseConfigured) {
      return reply.send([]);
    }

    try {
      const { category, state, status } = request.query;
      let query = supabase
        .from('live_events')
        .select('*, live_event_ai(*)')
        .in('buffer_state', ['cleared', 'bypassed'])
        .eq('visibility_mode', 'public')
        .order('status', { ascending: true })
        .order('priority_score', { ascending: false })
        .limit(50);

      if (category && category !== 'all') query = query.eq('issue_category', category);
      if (state) query = query.eq('state_code', state);
      if (status && status !== 'all') query = query.eq('status', status === 'live' ? 'live' : 'ended');

      const { data, error } = await query;
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
      return reply.send(data ?? []);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to fetch live events', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /** 3. GET /api/v1/lmx/live/:streamId — single Live Event Object */
  app.get<{ Params: { streamId: string } }>(
    '/api/v1/lmx/live/:streamId',
    { schema: lmxStreamIdParamSchema },
    async (request, reply) => {
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
          code: 'NOT_FOUND',
        });
      }

      try {
        const { streamId } = request.params;
        const { data, error } = await supabase
          .from('live_events')
          .select('*, live_event_ai(*), lmx_department_alerts(*)')
          .eq('id', streamId)
          .single();

        if (error || !data) {
          return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
            code: 'NOT_FOUND',
          });
        }
        return reply.send(data);
      } catch {
        return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
          code: 'NOT_FOUND',
        });
      }
    }
  );

  /** 4. POST /api/v1/lmx/live — create (go-live) Live Event Object with server-side gating */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/live',
    { schema: createLiveEventBodySchema },
    async (request, reply) => {
      const body = request.body || {};

      // 1. Authenticate user from session token or non-prod x-user-id header
      const authHeader = request.headers.authorization;
      let userId: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
          if (!authErr && user) {
            userId = user.id;
          }
        } catch {
          // Auth lookup failed
        }
      }

      // Accept explicit x-user-id header only in non-production environments
      if (!userId && process.env.NODE_ENV !== 'production' && typeof request.headers['x-user-id'] === 'string') {
        userId = request.headers['x-user-id'];
      }

      if (!userId) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Unauthorized: Authentication required to create a live broadcast.', {
          code: 'UNAUTHORIZED',
        });
      }

      // 2. Query user's real profile from Supabase user_profiles table
      let profile: { role?: string; verification_status?: string } | null = null;
      try {
        const { data, error: profileErr } = await supabase
          .from('user_profiles')
          .select('role, verification_status')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileErr || !data) {
          return sendApiError(reply, request, 403, 'Forbidden', 'Forbidden: User profile not found.', {
            code: 'PROFILE_NOT_FOUND',
          });
        }
        profile = data;
      } catch {
        return sendApiError(reply, request, 403, 'Forbidden', 'Forbidden: User profile not found.', {
          code: 'PROFILE_NOT_FOUND',
        });
      }

      // 3. Role & KYC verification gating
      const allowedRoles = ['aspirant', 'politician', 'party', 'journalist', 'admin'];
      if (!profile.role || !allowedRoles.includes(profile.role)) {
        return sendApiError(reply, request, 403, 'Forbidden', 'Forbidden: Live broadcasting is restricted to candidates, parties, and accredited journalists.', {
          code: 'INELIGIBLE_ROLE',
        });
      }

      if (profile.verification_status !== 'verified') {
        return sendApiError(reply, request, 403, 'Forbidden', 'Forbidden: Live broadcasting requires a verified contributor profile (KYC verification).', {
          code: 'UNVERIFIED',
        });
      }

      const { creator_role: _cr, role: _r, verification_status: _vs, ...safeBody } = body;

      try {
        const { data, error } = await supabase
          .from('live_events')
          .insert({
            ...safeBody,
            creator_id: userId,
            creator_role: profile.role,
            buffer_state: body?.buffer_state || 'buffered',
            priority_score: body?.priority_score || 50,
          })
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.status(201).send(data);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to create live event', {
          code: 'DATABASE_ERROR',
        });
      }
    }
  );

  /** 5. POST /api/v1/lmx/live/:streamId/moderate — moderator action (allow/mute/cut/escalate) */
  app.post<{
    Params: { streamId: string };
    Body: { decision: 'allow' | 'mute' | 'cut' | 'escalate'; reason?: string; moderatorId?: string };
  }>('/api/v1/lmx/live/:streamId/moderate', { schema: moderateStreamSchema }, async (request, reply) => {
    const { streamId } = request.params;
    const { decision } = request.body;

    const updates: Record<string, any> = {
      buffer_state: decision === 'cut' ? 'rejected' : decision === 'allow' ? 'cleared' : 'buffered',
      updated_at: new Date().toISOString(),
    };

    if (decision === 'cut') {
      updates.status = 'ended';
      updates.ended_at = new Date().toISOString();
    }

    try {
      const { error } = await supabase
        .from('live_events')
        .update(updates)
        .eq('id', streamId);

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      return reply.send({
        success: true,
        streamId,
        decision,
        message: `Stream buffer decision applied: ${decision}`,
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to apply moderation decision', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /** 6. POST /api/v1/lmx/live/:streamId/end — close out live event */
  app.post<{
    Params: { streamId: string };
    Body: { content_hash?: string };
  }>('/api/v1/lmx/live/:streamId/end', { schema: endStreamSchema }, async (request, reply) => {
    const { streamId } = request.params;
    const { content_hash } = request.body || {};

    try {
      const { error } = await supabase
        .from('live_events')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          content_hash: content_hash ?? null,
          retention_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', streamId);

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      return reply.send({ success: true });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to end stream', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /** 7. GET /api/v1/lmx/departments — subscribed department registry */
  app.get<{
    Querystring: { type?: string; state?: string };
  }>('/api/v1/lmx/departments', { schema: lmxDepartmentsQuerySchema }, async (request) => {
    const { type, state } = request.query;
    return { departments: [], total: 0, filters: { type, state } };
  });

  /** 8. POST /api/v1/lmx/departments — department subscribes (onboarding) */
  app.post<{
    Body: { departmentType: string; officeName: string; stateCode?: string };
  }>('/api/v1/lmx/departments', { schema: createDepartmentBodySchema }, async (_request, reply) => {
    return reply.status(201).send({
      success: true,
      subscriptionStatus: 'pending',
      message: 'Department subscription received — pending verification.',
    });
  });

  /** 9. POST /api/v1/lmx/alerts — dispatch reporter-initiated department alert(s) */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/alerts',
    { schema: createAlertBodySchema },
    async (request, reply) => {
      const body = request.body;
      try {
        const { data, error } = await supabase
          .from('lmx_department_alerts')
          .insert(body)
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.status(201).send(data);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to create department alert', {
          code: 'DATABASE_ERROR',
        });
      }
    }
  );

  /** 10. POST /api/v1/lmx/alerts/:id/acknowledge — dept acknowledges alert */
  app.post<{
    Params: { id: string };
    Body: { acknowledgment: string; acknowledged_by: string };
  }>('/api/v1/lmx/alerts/:id/acknowledge', { schema: acknowledgeAlertSchema }, async (request, reply) => {
    const { id } = request.params;
    const { acknowledgment, acknowledged_by } = request.body;

    try {
      const { error } = await supabase
        .from('lmx_department_alerts')
        .update({
          acknowledgment,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by,
          delivery_status: 'delivered',
        })
        .eq('id', id);

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      return reply.send({ success: true });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to acknowledge alert', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /** 11. POST /api/v1/lmx/distribution — add output branch */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/distribution',
    { schema: createDistributionSchema },
    async (request, reply) => {
      const body = request.body;
      try {
        const { data, error } = await supabase
          .from('lmx_distribution_destinations')
          .insert(body)
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.status(201).send(data);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err?.message || 'Failed to add distribution destination', {
          code: 'DATABASE_ERROR',
        });
      }
    }
  );
}
