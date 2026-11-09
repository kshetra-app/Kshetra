import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from '../services/adminService';
import { sendApiError } from '../lib/replyHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolveAdminActor, type AdminActor } from '../lib/adminAuthorization';

declare module 'fastify' {
  interface FastifyRequest {
    adminActor?: AdminActor;
  }
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Pre-handler RBAC guard for all /api/v1/admin/* routes.
   * Fail-closed: non-admins receive HTTP 403 Forbidden with canonical ApiErrorEnvelope.
   */
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const actor = await resolveAdminActor(request, reply);
    if (!actor) return;
    request.adminActor = actor;
  });

  // 1. Users Action
  app.post('/api/v1/admin/users/action', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.targetUserId || !body.action) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'targetUserId and action are required.');
    }

    const result = await adminService.executeUserAction(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 2. Moderation Decision
  app.post('/api/v1/admin/moderation/decide', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.targetContentId || !body.decision) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'targetContentId and decision are required.');
    }

    const result = await adminService.decideModeration(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 3. Verification Action
  app.post('/api/v1/admin/verification/candidate', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.candidateId || !body.kycStatus) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'candidateId and kycStatus are required.');
    }

    const result = await adminService.verifyCandidate(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 4. Data Correction
  app.post('/api/v1/admin/data-correction', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.entityType || !body.entityId || !body.field) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'entityType, entityId, and field are required.');
    }

    const result = await adminService.executeDataCorrection(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 8. Feature Flags (Get & Set)
  app.get('/api/v1/admin/feature-flags', async (request, reply) => {
    const flags = await adminService.getFeatureFlags();
    return reply.send({ success: true, data: flags });
  });

  app.put('/api/v1/admin/feature-flags/:key', async (request, reply) => {
    const actor = request.adminActor!;
    const { key } = request.params as { key: string };
    const body = request.body as { value: unknown; description?: string };

    if (body === undefined || body.value === undefined) {
      return sendApiError(reply, request, 400, 'INVALID_PAYLOAD', 'Feature flag value must be provided.');
    }

    const updated = await adminService.setFeatureFlag(actor, key, body.value, body.description);
    return reply.send({ success: true, data: updated });
  });

  // 9. Audit Logs Query
  app.get('/api/v1/admin/audit-logs', async (request, reply) => {
    const query = request.query as any;
    const filter = {
      actorId: query.actorId,
      domain: query.domain,
      targetEntityType: query.targetEntityType,
      targetEntityId: query.targetEntityId,
      limit: query.limit ? Number.parseInt(query.limit, 10) : 50,
      offset: query.offset ? Number.parseInt(query.offset, 10) : 0,
    };

    const logs = await adminService.queryAuditLogs(filter);
    return reply.send({ success: true, data: logs });
  });
};
