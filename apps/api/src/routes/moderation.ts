import type { FastifyInstance } from 'fastify';
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

/**
 * Moderation API Routes
 *
 * POST /moderation/action              — Perform a moderation action
 * POST /moderation/check-content       — Check content for policy violations
 * GET  /moderation/queue               — Get pending reports (moderator+)
 * GET  /moderation/actions              — List available moderation actions
 * GET  /moderation/audit-log            — View audit log (admin only)
 * POST /moderation/verify-request       — Submit verification request
 * PUT  /moderation/verify/:id           — Review verification request (admin)
 * POST /moderation/block                — Block a user
 * DELETE /moderation/block/:userId      — Unblock a user
 * GET  /moderation/reputation-rules     — Get reputation scoring rules
 */
export async function moderationRoutes(app: FastifyInstance) {

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
    const moderatorRole = request.headers['x-user-role'] as UserRole;
    if (!canModerate(moderatorRole)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const payload = request.body;
    if (!canPerformAction(moderatorRole, payload.actionType)) {
      return reply.status(403).send({ error: `Action '${payload.actionType}' requires admin role` });
    }

    // In production: insert into moderation_actions, update target entity, create audit_log entry
    app.log.info(
      { moderator: payload.moderatorId, action: payload.actionType, target: payload.targetUserId },
      'Moderation action executed',
    );

    return reply.send({
      success: true,
      data: {
        actionType: payload.actionType,
        reason: payload.reason,
        moderatorId: payload.moderatorId,
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
    const moderatorRole = request.headers['x-user-role'] as UserRole;
    if (!canModerate(moderatorRole)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    // In production: fetch from reports table WHERE status = 'pending'
    return reply.send({
      success: true,
      data: {
        queue: [],
        totalPending: 0,
        message: 'Report queue will be populated when Supabase is connected',
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
    const role = request.headers['x-user-role'] as UserRole;
    if (role !== 'admin') {
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
