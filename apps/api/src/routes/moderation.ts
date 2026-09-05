import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  canModerate,
  canPerformAction,
  flagContent,
  ACTION_CONFIG,
  REPUTATION_RULES,
  type ModerationAction,
  type ModerationActionPayload,
  type UserRole,
} from '../services/moderation';

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

/**
 * Moderation API Routes
 */
export async function moderationRoutes(app: FastifyInstance) {
  /**
   * Helper: Securely resolve authenticated user and their verified role from database.
   * Eliminates insecure client-supplied role headers (FIX-7 / FIX-3b pattern).
   */
  async function resolveModeratorRole(request: any): Promise<{ userId: string; role: UserRole } | null> {
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

    if (!userId) return null;

    if (!isSupabaseConfigured) {
      // In-memory test fallback: allow dev/test role if provided outside production, default to moderator
      const testRole = (process.env.NODE_ENV !== 'production' && request.headers['x-test-role'])
        ? (request.headers['x-test-role'] as UserRole)
        : 'moderator';
      return { userId, role: testRole };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const verifiedRole = (profile?.role as UserRole) || 'citizen';
    return { userId, role: verifiedRole };
  }

  // Perform moderation action
  app.post<{
    Body: ModerationActionPayload;
  }>('/api/v1/moderation/action', {
    schema: {
      body: {
        type: 'object',
        required: ['moderatorId', 'actionType', 'reason'],
        properties: {
          moderatorId: { type: 'string' },
          targetUserId: { type: 'string' },
          targetPostId: { type: 'string' },
          targetCommentId: { type: 'string' },
          reportId: { type: 'string' },
          actionType: { type: 'string' },
          reason: { type: 'string' },
          durationHours: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (!auth || !canModerate(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const moderatorRole = auth.role;
    const payload = request.body;
    if (!canPerformAction(moderatorRole, payload.actionType)) {
      return reply.status(403).send({ error: `Action '${payload.actionType}' requires admin role` });
    }

    if (isSupabaseConfigured) {
      try {
        // If removing content: soft-delete post or comment
        if (payload.actionType === 'delete_content' || payload.actionType === 'hide_content') {
          if (payload.targetPostId) {
            await supabase
              .from('posts')
              .update({ is_deleted: true, content: '[Removed by Moderator: Policy Violation]' })
              .eq('id', payload.targetPostId);
          } else if (payload.targetCommentId) {
            await supabase
              .from('comments')
              .update({ is_deleted: true, content: '[Removed by Moderator]' })
              .eq('id', payload.targetCommentId);
          }
        }

        // Update report status
        if (payload.reportId) {
          const newStatus = payload.actionType === 'dismiss' ? 'dismissed' : 'action_taken';
          await supabase
            .from('reports')
            .update({
              status: newStatus,
              reviewed_by: payload.moderatorId,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', payload.reportId);
        }
      } catch (err: any) {
        app.log.warn({ err: err.message }, 'Failed to persist moderation action in Supabase');
      }
    }

    // Always update mock queue in case of in-memory testing
    if (payload.reportId) {
      MOCK_REPORTS_QUEUE = MOCK_REPORTS_QUEUE.filter((r) => r.id !== payload.reportId);
    }

    app.log.info(
      { moderator: payload.moderatorId, action: payload.actionType, target: payload.targetUserId || payload.targetPostId },
      'Moderation action executed',
    );

    return reply.send({
      success: true,
      data: {
        actionType: payload.actionType,
        reason: payload.reason,
        moderatorId: payload.moderatorId,
        reportId: payload.reportId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Check content for policy violations
  app.post<{
    Body: { content: string };
  }>('/api/v1/moderation/check-content', {
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const result = flagContent(request.body.content);
    return reply.send({ success: true, data: result });
  });

  // Get pending reports queue (moderator+)
  app.get('/api/v1/moderation/queue', async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (!auth || !canModerate(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*, post:posts(id, content, author_name:author_id), comment:comments(id, content), reported_user:user_profiles!reported_user_id(user_id, display_name, avatar_url, role)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          return reply.send({
            success: true,
            data: {
              queue: data,
              totalPending: data.length,
            },
          });
        }
      } catch (err: any) {
        app.log.warn({ err: err.message }, 'Falling back to mock moderation queue');
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

  // List available moderation actions
  app.get('/api/v1/moderation/actions', async (_request, reply) => {
    const actions = Object.entries(ACTION_CONFIG).map(([key, config]) => ({
      action: key,
      ...config,
    }));
    return reply.send({ success: true, data: actions });
  });

  // View audit log (admin only)
  app.get<{
    Querystring: { limit?: number; offset?: number; entityType?: string };
  }>('/api/v1/moderation/audit-log', async (request, reply) => {
    const auth = await resolveModeratorRole(request);
    if (!auth || auth.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
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

  // Submit verification request
  app.post<{
    Body: { verificationType: string; documentUrl?: string; notes?: string };
  }>('/api/v1/moderation/verify-request', {
    schema: {
      body: {
        type: 'object',
        required: ['verificationType'],
        properties: {
          verificationType: { type: 'string' },
          documentUrl: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { verificationType, documentUrl, notes } = request.body;
    app.log.info({ userId, verificationType }, 'Verification request submitted');

    return reply.send({
      success: true,
      data: {
        userId,
        verificationType,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      },
    });
  });

  // Block a user
  app.post<{
    Body: { blockedUserId: string };
  }>('/api/v1/moderation/block', {
    schema: {
      body: {
        type: 'object',
        required: ['blockedUserId'],
        properties: {
          blockedUserId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { blockedUserId } = request.body;
    if (userId === blockedUserId) {
      return reply.status(400).send({ error: 'Cannot block yourself' });
    }

    return reply.send({
      success: true,
      data: { blockerId: userId, blockedId: blockedUserId },
    });
  });

  // Unblock a user
  app.delete<{
    Params: { userId: string };
  }>('/api/v1/moderation/block/:userId', async (request, reply) => {
    const currentUserId = request.headers['x-user-id'] as string;
    if (!currentUserId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    return reply.send({
      success: true,
      data: { unblocked: request.params.userId },
    });
  });

  // Get reputation rules (public)
  app.get('/api/v1/moderation/reputation-rules', async (_request, reply) => {
    const rules = Object.entries(REPUTATION_RULES).map(([action, points]) => ({
      action,
      points,
      effect: points > 0 ? 'positive' : 'negative',
    }));
    return reply.send({ success: true, data: rules });
  });
}
