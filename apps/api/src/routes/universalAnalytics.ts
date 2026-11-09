/**
 * Universal Analytics Platform Routes (JOB 065)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - High-Throughput Event Ingestion (Single & Batch up to 100) adhering to the Canonical 10-Field Schema
 * - Optional keyed Client IP pseudonymization; this endpoint alone does not establish legal compliance
 * - Multi-Dimensional Analytical Queries by Event Name, Constituency, and Temporal Windows
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApiSuccessEnvelope,
  UniversalAnalyticsEventDTO,
  BatchAnalyticsEventsRequest,
} from '@kshetra/shared';
import {
  AnalyticsStorageUnavailableError,
  universalAnalyticsService,
} from '../services/universalAnalyticsService';
import { sendApiError } from '../lib/replyHelper';
import { resolveAdminActor } from '../lib/adminAuthorization';
import { isSupabaseAvailable, supabase } from '../lib/supabase';

function sendSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T, statusCode = 200) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(envelope);
}

export async function universalAnalyticsRoutes(app: FastifyInstance) {
  // 1. POST /api/v1/analytics/events (Batch or Single Ingestion)
  app.post<{ Body: BatchAnalyticsEventsRequest | UniversalAnalyticsEventDTO }>(
    '/api/v1/analytics/events',
    async (request, reply) => {
      try {
        const body = request.body as any;
        const events: UniversalAnalyticsEventDTO[] = Array.isArray(body?.events)
          ? body.events
          : body && body.eventName
          ? [body]
          : [];

        if (events.length === 0) {
          return sendApiError(reply, request, 400, 'BadRequest', 'At least one valid event must be provided in events array');
        }

        let authenticatedUserId: string | null = null;
        const authorization = request.headers.authorization;
        if (authorization !== undefined) {
          if (!authorization.startsWith('Bearer ')) {
            return sendApiError(reply, request, 401, 'Unauthorized', 'A valid bearer token is required.');
          }
          if (!isSupabaseAvailable()) {
            return sendApiError(
              reply,
              request,
              503,
              'ServiceUnavailable',
              'Authentication is unavailable; the event was not accepted.',
              { code: 'AUTHENTICATION_UNAVAILABLE' },
            );
          }
          try {
            const { data, error } = await supabase.auth.getUser(authorization.slice(7).trim());
            if (error || !data.user) {
              return sendApiError(reply, request, 401, 'Unauthorized', 'The bearer token is invalid or expired.');
            }
            authenticatedUserId = data.user.id;
          } catch {
            return sendApiError(reply, request, 401, 'Unauthorized', 'The bearer token could not be validated.');
          }
        }

        const clientIp = request.ip || (request.headers['x-forwarded-for'] as string) || undefined;
        const result = await universalAnalyticsService.ingestBatch(
          { events },
          clientIp,
          authenticatedUserId,
        );

        const statusCode = result.success ? 201 : 400;
        return sendSuccess(reply, request, result, statusCode);
      } catch (err: any) {
        if (err instanceof AnalyticsStorageUnavailableError) {
          return sendApiError(
            reply,
            request,
            503,
            'ServiceUnavailable',
            'Analytics storage is unavailable. The events were not accepted.',
            { code: 'ANALYTICS_STORAGE_UNAVAILABLE' },
          );
        }
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 2. GET /api/v1/analytics/events (Multi-Dimensional Query)
  app.get<{
    Querystring: {
      eventName?: string;
      userId?: string;
      acId?: string;
      from?: string;
      to?: string;
      limit?: string;
    };
  }>(
    '/api/v1/analytics/events',
    async (request, reply) => {
      const actor = await resolveAdminActor(request, reply);
      if (!actor) return;

      try {
        const q = request.query;
        const events = await universalAnalyticsService.queryEvents({
          eventName: q.eventName,
          userId: q.userId,
          acId: q.acId,
          from: q.from,
          to: q.to,
          limit: q.limit ? parseInt(q.limit, 10) : 100,
        });

        return sendSuccess(reply, request, {
          total: events.length,
          events,
        });
      } catch (err: any) {
        if (err instanceof AnalyticsStorageUnavailableError) {
          return sendApiError(
            reply,
            request,
            503,
            'ServiceUnavailable',
            'Durable analytics storage is unavailable.',
            { code: 'ANALYTICS_STORAGE_UNAVAILABLE' },
          );
        }
        return sendApiError(reply, request, 500, 'InternalError', 'Analytics events could not be queried.');
      }
    }
  );
}
