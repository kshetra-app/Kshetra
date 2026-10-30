/**
 * Universal Analytics Platform Routes (JOB 065)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - High-Throughput Event Ingestion (Single & Batch up to 100) adhering to the Canonical 10-Field Schema
 * - DPDP 2023 Compliant Client IP Salt-Hashing (Zero Raw PII Persistence)
 * - Multi-Dimensional Analytical Queries by Event Name, Constituency, and Temporal Windows
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApiSuccessEnvelope,
  UniversalAnalyticsEventDTO,
  BatchAnalyticsEventsRequest,
} from '@kshetra/shared';
import { universalAnalyticsService } from '../services/universalAnalyticsService';
import { sendApiError } from '../lib/replyHelper';

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

        const clientIp = request.ip || (request.headers['x-forwarded-for'] as string) || undefined;
        const result = await universalAnalyticsService.ingestBatch({ events }, clientIp);

        const statusCode = result.success ? 201 : 400;
        return sendSuccess(reply, request, result, statusCode);
      } catch (err: any) {
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
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );
}
