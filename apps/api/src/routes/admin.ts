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
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAYLOAD',
        'targetUserId and action are required.',
      );
    }

    const result = await adminService.executeUserAction(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 2. Moderation Decision
  app.post('/api/v1/admin/moderation/decide', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.targetContentId || !body.decision) {
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAYLOAD',
        'targetContentId and decision are required.',
      );
    }

    const result = await adminService.decideModeration(actor, body);
    return reply.send({ success: true, data: result });
  });

  // 3. Verification Action
  app.post('/api/v1/admin/verification/candidate', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.candidateId || !body.kycStatus) {
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAYLOAD',
        'candidateId and kycStatus are required.',
      );
    }

    const result = await adminService.verifyCandidate(actor, body);
    return reply.send({ success: true, data: result });
  });

  // Contributor identity evidence is more sensitive than ordinary moderation data.
  // Restrict its review to administrators and compliance officers.
  app.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/api/v1/admin/contributor-verifications', async (request, reply) => {
    const actor = request.adminActor!;
    if (!['admin', 'super_admin', 'compliance_officer'].includes(actor.role)) {
      return sendApiError(
        reply,
        request,
        403,
        'INSUFFICIENT_PERMISSIONS',
        'A compliance reviewer role is required.',
      );
    }
    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'SERVICE_UNAVAILABLE',
        'Contributor review storage is unavailable.',
      );
    }

    const limit = Number(request.query.limit ?? 20);
    const offset = Number(request.query.offset ?? 0);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAGINATION',
        'Use a limit from 1 to 50 and a non-negative offset.',
      );
    }

    const { data, error } = await supabase
      .from('creator_kyc_records')
      .select('id,user_id,full_legal_name,phone_number,phone_verified,selfie_url,status,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit);

    if (error) {
      app.log.error(
        { err: error.message, reviewerId: actor.id },
        'Failed to load contributor verification queue',
      );
      return sendApiError(
        reply,
        request,
        503,
        'SERVICE_UNAVAILABLE',
        'Contributor verification queue is unavailable.',
      );
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    let records: Array<Record<string, unknown>>;
    try {
      records = await Promise.all(
        page.map(async (record) => {
          const path = typeof record.selfie_url === 'string' ? record.selfie_url : '';
          const belongsToApplicant = path.startsWith(`${record.user_id}/`) && !path.includes('..');
          if (!belongsToApplicant) {
            return {
              id: record.id,
              userId: record.user_id,
              fullLegalName: record.full_legal_name,
              phoneNumber: record.phone_number,
              phoneVerified: record.phone_verified,
              createdAt: record.created_at,
              selfieSignedUrl: null,
              evidenceAvailable: false,
            };
          }

          const { data: signed, error: signingError } = await supabase.storage
            .from('kyc-selfies')
            .createSignedUrl(path, 600);
          if (signingError || !signed?.signedUrl) {
            throw signingError ?? new Error('Could not create a time-limited selfie review link');
          }

          return {
            id: record.id,
            userId: record.user_id,
            fullLegalName: record.full_legal_name,
            phoneNumber: record.phone_number,
            phoneVerified: record.phone_verified,
            createdAt: record.created_at,
            selfieSignedUrl: signed.signedUrl,
            evidenceAvailable: true,
          };
        }),
      );
    } catch (err: any) {
      app.log.error(
        { err: err?.message, reviewerId: actor.id },
        'Failed to sign contributor verification evidence',
      );
      return sendApiError(
        reply,
        request,
        503,
        'SERVICE_UNAVAILABLE',
        'Contributor evidence could not be securely loaded.',
      );
    }

    return reply.send({
      success: true,
      data: {
        records,
        hasMore,
        limit,
        offset,
        signedUrlExpiresInSeconds: 600,
      },
    });
  });

  app.post<{
    Params: { id: string };
    Body: { decision: 'verified' | 'rejected'; rejectionReason?: string };
  }>(
    '/api/v1/admin/contributor-verifications/:id/review',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['decision'],
          properties: {
            decision: { type: 'string', enum: ['verified', 'rejected'] },
            rejectionReason: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = request.adminActor!;
      if (!['admin', 'super_admin', 'compliance_officer'].includes(actor.role)) {
        return sendApiError(
          reply,
          request,
          403,
          'INSUFFICIENT_PERMISSIONS',
          'A compliance reviewer role is required.',
        );
      }
      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'Contributor review storage is unavailable.',
        );
      }

      const decision = request.body.decision;
      const rejectionReason = request.body.rejectionReason?.trim() || null;
      if (decision === 'rejected' && (!rejectionReason || rejectionReason.length < 10)) {
        return sendApiError(
          reply,
          request,
          400,
          'INVALID_REJECTION_REASON',
          'A rejection reason of at least 10 characters is required.',
        );
      }

      const { data, error } = await supabase.rpc('review_creator_kyc_record', {
        p_record_id: request.params.id,
        p_reviewer_user_id: actor.id,
        p_decision: decision,
        p_rejection_reason: decision === 'rejected' ? rejectionReason : null,
      });

      if (error) {
        if (error.code === 'P0002') {
          return sendApiError(
            reply,
            request,
            409,
            'REVIEW_CONFLICT',
            'This record is no longer pending review. Refresh the queue.',
          );
        }
        app.log.error(
          { err: error.message, reviewerId: actor.id },
          'Failed to record contributor verification decision',
        );
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'The review decision was not saved.',
        );
      }

      const reviewed = Array.isArray(data) ? data[0] : data;
      if (!reviewed?.id || reviewed.status !== decision) {
        return sendApiError(
          reply,
          request,
          503,
          'SERVICE_UNAVAILABLE',
          'The database did not confirm the review decision.',
        );
      }

      await adminService.recordAudit(
        actor,
        'verification',
        `contributor_kyc_${decision}`,
        'creator_kyc_records',
        reviewed.id,
        { status: 'pending' },
        { status: decision, rejectionReason: decision === 'rejected' ? rejectionReason : null },
      );

      return reply.send({
        success: true,
        data: {
          id: reviewed.id,
          userId: reviewed.user_id,
          status: reviewed.status,
          verifiedAt: reviewed.verified_at,
          rejectionReason: reviewed.rejection_reason,
          updatedAt: reviewed.updated_at,
        },
      });
    },
  );

  // 4. Data Correction
  app.post('/api/v1/admin/data-correction', async (request, reply) => {
    const actor = request.adminActor!;
    const body = request.body as any;

    if (!body || !body.entityType || !body.entityId || !body.field) {
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAYLOAD',
        'entityType, entityId, and field are required.',
      );
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
      return sendApiError(
        reply,
        request,
        400,
        'INVALID_PAYLOAD',
        'Feature flag value must be provided.',
      );
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
