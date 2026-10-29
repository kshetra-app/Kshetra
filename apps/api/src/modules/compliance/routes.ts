/**
 * apps/api/src/modules/compliance/routes.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Fastify routes for privacy notices, data principal rights, retention, and grievances.
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { sendApiError } from '../../lib/replyHelper';
import { privacyLocaleService } from './privacyLocales';
import { inventoryService } from './inventory';
import { dataFlowService } from './dataFlow';
import { retentionService } from './retentionService';
import { rightsService } from './rightsService';
import { sdfService } from './sdfService';
import { breachService } from './breachService';
import {
  privacyNoticeQuerySchema,
  dataAccessRequestSchema,
  dataCorrectionRequestSchema,
  dataErasureRequestSchema,
  grievanceSubmissionSchema,
  breachIncidentReportSchema,
} from './schemas';

function sendComplianceSuccess<T>(
  reply: FastifyReply,
  request: FastifyRequest,
  data: T,
  statusCode: number = 200,
) {
  return reply.status(statusCode).send({
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
}

export const complianceRoutes: FastifyPluginAsync = async (app) => {
  // ─── 1. STATUTORY PRIVACY NOTICES & 13-LANGUAGE PARITY ───
  app.get('/api/v1/compliance/privacy-notice', async (request, reply) => {
    const parseResult = privacyNoticeQuerySchema.safeParse(request.query);
    const locale = parseResult.success ? parseResult.data.locale : 'en';
    const notice = privacyLocaleService.getNotice(locale);
    return sendComplianceSuccess(reply, request, notice);
  });

  app.get('/api/v1/compliance/locales', async (request, reply) => {
    const locales = privacyLocaleService.getSupportedLocales();
    return sendComplianceSuccess(reply, request, {
      total: locales.length,
      locales,
      completeParity: true,
    });
  });

  // ─── 2. DATA INVENTORY & DATA FLOW MAP ───
  app.get('/api/v1/compliance/inventory', async (request, reply) => {
    const inventory = inventoryService.getInventory();
    const stats = inventoryService.getErasureEligibilitySummary();
    return sendComplianceSuccess(reply, request, {
      totalItems: inventory.length,
      items: inventory,
      summary: stats,
    });
  });

  app.get('/api/v1/compliance/data-flow', async (request, reply) => {
    const flowMap = dataFlowService.getDataFlowMap();
    const subprocessors = dataFlowService.getSubprocessorRegister();
    const sovereignty = dataFlowService.verifySovereigntyAndLocationAnchor();
    return sendComplianceSuccess(reply, request, {
      flowMap,
      subprocessors,
      sovereigntyStatus: sovereignty,
    });
  });

  // ─── 3. RETENTION POLICY MATRIX ───
  app.get('/api/v1/compliance/retention-matrix', async (request, reply) => {
    const matrix = retentionService.getRetentionMatrix();
    return sendComplianceSuccess(reply, request, {
      totalPolicies: matrix.length,
      policies: matrix,
    });
  });

  // ─── 4. DATA PRINCIPAL RIGHTS WORKFLOWS ───
  app.post('/api/v1/compliance/rights/access', async (request, reply) => {
    // Resolve user ID from auth context or header fallback
    const userId = (request as any).user?.id || (request.headers['x-user-id'] as string);
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authenticated citizen session required', {
        code: 'AUTH_REQUIRED',
      });
    }

    const parseResult = dataAccessRequestSchema.safeParse(request.body || {});
    const input = parseResult.success ? parseResult.data : { format: 'json' as const, includeActivityHistory: true };

    try {
      const archive = await rightsService.processAccessRequest(userId, input);
      return sendComplianceSuccess(reply, request, archive, 200);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error processing data access request');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to generate data export archive');
    }
  });

  app.post('/api/v1/compliance/rights/correction', async (request, reply) => {
    const userId = (request as any).user?.id || (request.headers['x-user-id'] as string);
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authenticated citizen session required', {
        code: 'AUTH_REQUIRED',
      });
    }

    const parseResult = dataCorrectionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid correction parameters',
        { code: 'VALIDATION_ERROR' },
      );
    }

    try {
      const result = await rightsService.processCorrectionRequest(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, result, 200);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error processing data correction request');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to process correction');
    }
  });

  app.post('/api/v1/compliance/rights/erasure', async (request, reply) => {
    const userId = (request as any).user?.id || (request.headers['x-user-id'] as string);
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authenticated citizen session required', {
        code: 'AUTH_REQUIRED',
      });
    }

    const parseResult = dataErasureRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Explicit confirmation phrase required for account erasure',
        { code: 'INVALID_CONFIRMATION' },
      );
    }

    try {
      const result = await rightsService.processErasureRequest(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, result, 200);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error executing account erasure');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to execute account erasure');
    }
  });

  // ─── 5. GRIEVANCE REDRESSAL MECHANISM (DPO) ───
  app.post('/api/v1/compliance/grievance', async (request, reply) => {
    const userId = (request as any).user?.id || (request.headers['x-user-id'] as string) || 'guest_citizen';
    const parseResult = grievanceSubmissionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid grievance parameters',
        { code: 'VALIDATION_ERROR' },
      );
    }

    try {
      const ticket = await rightsService.submitGrievance(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, ticket, 201);
    } catch (err: any) {
      request.log.error({ err }, 'Error lodging citizen grievance');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to register grievance ticket');
    }
  });

  app.get('/api/v1/compliance/grievance/:ticketId', async (request, reply) => {
    const { ticketId } = request.params as { ticketId: string };
    const ticket = rightsService.getGrievance(ticketId);
    if (!ticket) {
      return sendApiError(reply, request, 404, 'Not Found', `Grievance ticket '${ticketId}' not found`, {
        code: 'TICKET_NOT_FOUND',
      });
    }
    return sendComplianceSuccess(reply, request, ticket);
  });

  // ─── 6. SIGNIFICANT DATA FIDUCIARY (SDF) EVALUATION ───
  app.get('/api/v1/compliance/sdf-assessment', async (request, reply) => {
    const assessment = sdfService.getAssessment();
    return sendComplianceSuccess(reply, request, assessment);
  });

  // ─── 7. BREACH INCIDENT LOGGING & SLA TRACKING ───
  app.post('/api/v1/compliance/breach', async (request, reply) => {
    const parseResult = breachIncidentReportSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid incident parameters',
      );
    }

    const incident = breachService.recordIncident(parseResult.data);
    return sendComplianceSuccess(reply, request, incident, 201);
  });
};
