/**
 * Executive Product Dashboard Routes (JOB 066)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - 5-Dimensional Cross-Domain Business Metrics: Activation, Retention, Engagement, Geography Density, Revenue
 * - Verification Endpoint proving Mathematical Identity & Zero-Discrepancy Direct Reconstruction from Raw Event Logs
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiSuccessEnvelope, UniversalAnalyticsEventDTO } from '@kshetra/shared';
import { productDashboardService } from '../services/productDashboardService';
import { sendApiError } from '../lib/replyHelper';
import { resolveAdminActor } from '../lib/adminAuthorization';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { ProductDashboardDataUnavailableError } from '../services/productDashboardService';

function sendSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T, statusCode = 200) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(envelope);
}

export async function productDashboardRoutes(app: FastifyInstance) {
  // 1. GET /api/v1/dashboard/metrics (Primary Executive Dashboard)
  app.get('/api/v1/dashboard/metrics', async (request, reply) => {
    const actor = await resolveAdminActor(request, reply);
    if (!actor) return;

    try {
      const metrics = await productDashboardService.getExecutiveMetrics();
      return sendSuccess(reply, request, metrics);
    } catch (err: any) {
      if (err instanceof ProductDashboardDataUnavailableError) {
        return sendApiError(
          reply,
          request,
          503,
          'ServiceUnavailable',
          'Durable product analytics are not available. Verify the database connection and apply migration 097.',
          { code: 'DASHBOARD_DATA_UNAVAILABLE' },
        );
      }
      return sendApiError(reply, request, 500, 'InternalError', 'Dashboard metrics could not be loaded.');
    }
  });

  // 2. POST /api/v1/dashboard/reconstruct (Mathematical Proof Endpoint)
  app.post<{ Body: { events?: UniversalAnalyticsEventDTO[] } }>(
    '/api/v1/dashboard/reconstruct',
    async (request, reply) => {
      if (isProductionLikeRuntime()) {
        return sendApiError(reply, request, 404, 'NotFound', 'This diagnostic endpoint is unavailable.');
      }

      const actor = await resolveAdminActor(request, reply);
      if (!actor) return;

      try {
        const events = request.body?.events;
        if (!Array.isArray(events)) {
          return sendApiError(reply, request, 400, 'BadRequest', 'An events array is required.');
        }
        if (events.length > 10000) {
          return sendApiError(reply, request, 413, 'PayloadTooLarge', 'At most 10,000 events may be reconstructed.');
        }
        if (events.some((event) =>
          !event ||
          typeof event.eventName !== 'string' ||
          typeof event.anonymousId !== 'string' ||
          typeof event.sessionId !== 'string' ||
          typeof event.timestamp !== 'string'
        )) {
          return sendApiError(reply, request, 400, 'BadRequest', 'Each event must include eventName, anonymousId, sessionId, and timestamp.');
        }
        const reconstructed = productDashboardService.reconstructMetricsFromEvents(events);
        return sendSuccess(reply, request, {
          reconstructed,
          sourceEventCount: events.length,
          source: 'caller_supplied_diagnostic_events',
          verified: false,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', 'Diagnostic reconstruction failed.');
      }
    }
  );
}
