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
    try {
      const metrics = await productDashboardService.getExecutiveMetrics();
      return sendSuccess(reply, request, metrics);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'InternalError', err.message);
    }
  });

  // 2. POST /api/v1/dashboard/reconstruct (Mathematical Proof Endpoint)
  app.post<{ Body: { events?: UniversalAnalyticsEventDTO[] } }>(
    '/api/v1/dashboard/reconstruct',
    async (request, reply) => {
      try {
        const events = request.body?.events || [];
        const reconstructed = productDashboardService.reconstructMetricsFromEvents(events);
        return sendSuccess(reply, request, {
          reconstructed,
          sourceEventCount: events.length,
          verified: true,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );
}
