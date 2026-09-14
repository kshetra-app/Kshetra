import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import {
  canModerate,
  canPerformAction,
  ACTION_CONFIG,
  REPUTATION_RULES,
  type ModerationAction,
  type ModerationActionPayload,
  type UserRole,
} from '../services/moderation';
import { moderateContent } from '../services/contentModeration';

// In-memory fallback queue for testing or offline mode
let MOCK_REPORTS_QUEUE = [
  {
    id: 'rep-demo-1',
    reporter_id: 'user-reporter-1',
    post_id: 'seed-ts-6',
    comment_id: null,
    reason: 'misinformation',
    description: 'Inaccurate claim regarding water tankers schedule',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    post: {
      id: 'seed-ts-6',
      content: 'Water supply schedule in Old City needs urgent rationalization...',
      author_name: 'Fatima Begum',
    },
  },
];

// Re-usable schema definitions for moderation routes
const moderationActionSchema = {
  body: {
    type: 'object',
    required: ['moderatorId', 'actionType', 'reason'],
    properties: {
      moderatorId: { type: 'string', minLength: 1 },
      targetUserId: { type: 'string' },
      targetPostId: { type: 'string' },
      targetCommentId: { type: 'string' },
      reportId: { type: 'string' },
      actionType: {
        type: 'string',
        enum: [
          'warn',
          'mute',
          'suspend',
          'ban',
          'unsuspend',
          'delete_content',
          'hide_content',
          'restore_content',
          'verify_user',
          'revoke_verification',
          'escalate',
          'dismiss',
        ],
      },
      reason: { type: 'string', minLength: 1 },
      durationHours: { type: 'number' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            actionType: { type: 'string' },
            reason: { type: 'string' },
            moderatorId: { type: 'string' },
            reportId: { type: 'string' },
            timestamp: { type: 'string' },
          },
          required: ['actionType', 'reason', 'moderatorId', 'timestamp'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const checkContentSchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 10000 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            flagged: { type: 'boolean' },
            reasons: { type: 'array', items: { type: 'string' } },
            provider: { type: 'string' },
            confidence: { type: 'number' },
            categories: { type: 'object', additionalProperties: true },
          },
          required: ['flagged', 'reasons', 'provider'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const moderationQueueSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            queue: { type: 'array' },
            totalPending: { type: 'number' },
            message: { type: 'string' },
          },
          required: ['queue', 'totalPending'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const moderationActionsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              requiresReason: { type: 'boolean' },
              requiresDuration: { type: 'boolean' },
            },
            required: ['action', 'label', 'description'],
          },
        },
      },
      required: ['success', 'data'],
    },
  },
};

const auditLogSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      offset: { type: 'integer', minimum: 0 },
      entityType: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            entries: { type: 'array' },
            total: { type: 'number' },
            message: { type: 'string' },
          },
          required: ['entries', 'total'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const verifyRequestSchema = {
  body: {
    type: 'object',
    required: ['verificationType'],
    properties: {
      verificationType: {
        type: 'string',
        enum: ['identity', 'journalist', 'politician', 'government_official', 'organization'],
      },
      documentUrl: { type: 'string' },
      notes: { type: 'string', maxLength: 1000 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            verificationType: { type: 'string' },
            status: { type: 'string' },
            submittedAt: { type: 'string' },
          },
          required: ['userId', 'verificationType', 'status', 'submittedAt'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const blockUserSchema = {
  body: {
    type: 'object',
    required: ['blockedUserId'],
    properties: {
      blockedUserId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            blockerId: { type: 'string' },
            blockedId: { type: 'string' },
          },
          required: ['blockerId', 'blockedId'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const unblockUserSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            unblocked: { type: 'string' },
          },
          required: ['unblocked'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const reputationRulesSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              points: { type: 'number' },
              effect: { type: 'string', enum: ['positive', 'negative'] },
            },
            required: ['action', 'points', 'effect'],
          },
        },
      },
      required: ['success', 'data'],
    },
  },
};

/**
 * Result of resolving moderator identity and verified role
 */
type ResolveModeratorResult =
  | { state: 'UNAUTHENTICATED' }
  | { state: 'DB_ERROR' }
  | { state: 'RESOLVED'; userId: string; role: UserRole };

/**
 * Moderation API Routes
 */
export async function moderationRoutes(app: FastifyInstance) {
  /**
   * Helper: Securely resolve authenticated user and their verified role from database.
   * Eliminates insecure client-supplied role headers (FIX-7 / FIX-3b pattern).
   * 
   * Distinct states:
   * A. Invalid/missing authentication -> state: 'UNAUTHENTICATED'
   * B. Authenticated user + profile lookup failure -> state: 'DB_ERROR' (MUST NOT downgrade to citizen!)
   * C. Authenticated user + verified role -> state: 'RESOLVED'
   */
  async function resolveModeratorRole(request: any): Promise<ResolveModeratorResult> {
    let userId: string | null = null;
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId && process.env.NODE_ENV !== 'production' && (request.headers['x-user-id'] as string)) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) return { state: 'UNAUTHENTICATED' };

    if (!isSupabaseConfigured) {
      // In-memory test fallback: allow dev/test role if provided outside production, default to moderator
      const testRole = (process.env.NODE_ENV !== 'production' && request.headers['x-test-role'])
        ? (request.headers['x-test-role'] as UserRole)
        : 'moderator';
      return { state: 'RESOLVED', userId, role: testRole };
    }

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        app.log.error({ err: error.message, userId }, 'Failed to query user_profiles for role resolution');
        return { state: 'DB_ERROR' };
      }

      const verifiedRole = (profile?.role as UserRole) || 'citizen';
      return { state: 'RESOLVED', userId, role: verifiedRole };
    } catch (err: any) {
      app.log.error({ err: err?.message, userId }, 'Exception querying user_profiles for role resolution');
      return { state: 'DB_ERROR' };
    }
  }

  // 1. Perform moderation action
  app.post<{
    Body: ModerationActionPayload;
  }>('/api/v1/moderation/action', {
    schema: moderationActionSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to verify moderator role', { code: 'DATABASE_ERROR' });
    }

    if (!canModerate(auth.role)) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Insufficient permissions', { code: 'FORBIDDEN' });
    }

    const payload = request.body;

    // Invariant: Authenticated identity MUST be authoritative. Client-supplied moderatorId cannot spoof another moderator.
    if (payload.moderatorId && payload.moderatorId !== auth.userId) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid moderator attribution: moderatorId must match authenticated identity',
        { code: 'VALIDATION_ERROR' },
      );
    }

    const moderatorRole = auth.role;
    if (!canPerformAction(moderatorRole, payload.actionType)) {
      return sendApiError(reply, request, 403, 'Forbidden', `Action '${payload.actionType}' requires admin role`, { code: 'FORBIDDEN' });
    }

    if (isSupabaseConfigured) {
      try {
        // If removing content: soft-delete post or comment
        if (payload.actionType === 'delete_content' || payload.actionType === 'hide_content') {
          if (payload.targetPostId) {
            const { error: postErr } = await supabase
              .from('posts')
              .update({ is_deleted: true, content: '[Removed by Moderator: Policy Violation]' })
              .eq('id', payload.targetPostId);
            if (postErr) {
              app.log.error({ err: postErr.message }, 'Failed to soft-delete post in Supabase');
              return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to persist moderation action', { code: 'PERSISTENCE_ERROR' });
            }
          } else if (payload.targetCommentId) {
            const { error: commentErr } = await supabase
              .from('comments')
              .update({ is_deleted: true, content: '[Removed by Moderator]' })
              .eq('id', payload.targetCommentId);
            if (commentErr) {
              app.log.error({ err: commentErr.message }, 'Failed to soft-delete comment in Supabase');
              return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to persist moderation action', { code: 'PERSISTENCE_ERROR' });
            }
          }
        }

        // Update report status
        if (payload.reportId) {
          const newStatus = payload.actionType === 'dismiss' ? 'dismissed' : 'action_taken';
          const { error: reportErr } = await supabase
            .from('reports')
            .update({
              status: newStatus,
              reviewed_by: auth.userId,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', payload.reportId);
          if (reportErr) {
            app.log.error({ err: reportErr.message }, 'Failed to update report status in Supabase');
            return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to persist moderation action', { code: 'PERSISTENCE_ERROR' });
          }
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Exception persisting moderation action in Supabase');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to persist moderation action', { code: 'PERSISTENCE_ERROR' });
      }
    }

    // Always update mock queue in case of in-memory testing
    if (payload.reportId) {
      MOCK_REPORTS_QUEUE = MOCK_REPORTS_QUEUE.filter((r) => r.id !== payload.reportId);
    }

    app.log.info(
      { moderator: auth.userId, action: payload.actionType, target: payload.targetUserId || payload.targetPostId },
      'Moderation action executed',
    );

    return reply.send({
      success: true,
      data: {
        actionType: payload.actionType,
        reason: payload.reason,
        moderatorId: auth.userId,
        reportId: payload.reportId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 2. Check content for policy violations (automated OpenAI moderation + rule engine fallback)
  app.post<{
    Body: { content: string };
  }>('/api/v1/moderation/check-content', {
    schema: checkContentSchema,
  }, async (request, reply) => {
    const result = await moderateContent(request.body.content);
    return reply.send({ success: true, data: result });
  });

  // 3. Get pending reports queue (moderator+)
  app.get('/api/v1/moderation/queue', {
    schema: moderationQueueSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to verify moderator role', { code: 'DATABASE_ERROR' });
    }

    if (!canModerate(auth.role)) {
      return sendApiError(reply, request, 403, 'Forbidden', 'Insufficient permissions', { code: 'FORBIDDEN' });
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*, post:posts(id, content, author_name:author_id), comment:comments(id, content), reported_user:user_profiles!reported_user_id(user_id, display_name, avatar_url, role)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          app.log.error({ err: error.message }, 'Failed to retrieve moderation queue from Supabase');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve moderation queue', { code: 'DATABASE_ERROR' });
        }

        // Legitimate empty result from database -> MUST NOT return mock reports!
        if (data && data.length === 0) {
          return reply.send({
            success: true,
            data: {
              queue: [],
              totalPending: 0,
            },
          });
        }

        if (data && data.length > 0) {
          return reply.send({
            success: true,
            data: {
              queue: data,
              totalPending: data.length,
            },
          });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Exception querying moderation queue from Supabase');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve moderation queue', { code: 'DATABASE_ERROR' });
      }
    }

    return reply.send({
      success: true,
      data: {
        queue: MOCK_REPORTS_QUEUE,
        totalPending: MOCK_REPORTS_QUEUE.length,
        message: 'Loaded moderation queue',
      },
    });
  });

  // 4. List available moderation actions
  app.get('/api/v1/moderation/actions', {
    schema: moderationActionsSchema,
  }, async (_request, reply) => {
    const actions = Object.entries(ACTION_CONFIG).map(([key, config]) => ({
      action: key,
      ...config,
    }));
    return reply.send({ success: true, data: actions });
  });

  // 5. View audit log (admin only)
  app.get<{
    Querystring: { limit?: number; offset?: number; entityType?: string };
  }>('/api/v1/moderation/audit-log', {
    schema: auditLogSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to verify admin role', { code: 'DATABASE_ERROR' });
    }

    if (auth.role !== 'admin') {
      return sendApiError(reply, request, 403, 'Forbidden', 'Admin access required', { code: 'FORBIDDEN' });
    }

    // In production: fetch from audit_log with pagination
    return reply.send({
      success: true,
      data: {
        entries: [],
        total: 0,
        message: 'Audit log will be populated when Supabase is connected',
      },
    });
  });

  // 6. Submit verification request
  app.post<{
    Body: { verificationType: string; documentUrl?: string; notes?: string };
  }>('/api/v1/moderation/verify-request', {
    schema: verifyRequestSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to resolve user session', { code: 'DATABASE_ERROR' });
    }

    const userId = auth.userId;
    const { verificationType, documentUrl, notes } = request.body;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_verification')
          .upsert({
            user_id: userId,
            verification_type: verificationType,
            status: 'pending',
            document_url: documentUrl || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,verification_type' })
          .select()
          .single();

        if (error) {
          app.log.error({ err: error.message }, 'Failed to persist user verification request');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to record verification request', { code: 'DATABASE_ERROR' });
        }

        app.log.info({ userId, verificationType, id: data.id }, 'Verification request persisted to database');
        return reply.send({
          success: true,
          data: {
            id: data.id,
            userId,
            verificationType: data.verification_type,
            status: data.status,
            submittedAt: data.created_at || new Date().toISOString(),
          },
        });
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Unexpected error in verify-request');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Internal server error processing verification request', { code: 'DATABASE_ERROR' });
      }
    }

    return reply.send({
      success: true,
      data: {
        id: `mock-verif-${Date.now()}`,
        userId,
        verificationType,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      },
    });
  });

  // 7. Block a user
  app.post<{
    Body: { blockedUserId: string };
  }>('/api/v1/moderation/block', {
    schema: blockUserSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to resolve user session', { code: 'DATABASE_ERROR' });
    }

    const userId = auth.userId;
    const { blockedUserId } = request.body;
    if (userId === blockedUserId) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Cannot block yourself', { code: 'VALIDATION_ERROR' });
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('blocked_users')
          .upsert({
            blocker_id: userId,
            blocked_id: blockedUserId,
            created_at: new Date().toISOString(),
          }, { onConflict: 'blocker_id,blocked_id' });

        if (error) {
          app.log.error({ err: error.message }, 'Failed to insert blocked user in Supabase');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to block user', { code: 'DATABASE_ERROR' });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Unexpected error blocking user');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Internal server error blocking user', { code: 'DATABASE_ERROR' });
      }
    }

    return reply.send({
      success: true,
      data: { blockerId: userId, blockedId: blockedUserId },
    });
  });

  // 8. Unblock a user
  app.delete<{
    Params: { userId: string };
  }>('/api/v1/moderation/block/:userId', {
    schema: unblockUserSchema,
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (auth.state === 'UNAUTHENTICATED') {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }
    if (auth.state === 'DB_ERROR') {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to resolve user session', { code: 'DATABASE_ERROR' });
    }

    const currentUserId = auth.userId;
    const targetUserId = request.params.userId;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', currentUserId)
          .eq('blocked_id', targetUserId);

        if (error) {
          app.log.error({ err: error.message }, 'Failed to remove blocked user in Supabase');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to unblock user', { code: 'DATABASE_ERROR' });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Unexpected error unblocking user');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Internal server error unblocking user', { code: 'DATABASE_ERROR' });
      }
    }

    return reply.send({
      success: true,
      data: { unblocked: targetUserId },
    });
  });

  // 9. Get reputation rules (public)
  app.get('/api/v1/moderation/reputation-rules', {
    schema: reputationRulesSchema,
  }, async (_request, reply) => {
    const rules = Object.entries(REPUTATION_RULES).map(([action, points]) => ({
      action,
      points,
      effect: points > 0 ? 'positive' : 'negative',
    }));
    return reply.send({ success: true, data: rules });
  });
}
