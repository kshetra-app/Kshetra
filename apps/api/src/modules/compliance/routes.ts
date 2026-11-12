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
import { resolveAuthenticatedUser } from '../../lib/userAuth';
import { RightsPersistenceError } from './rightsService';
import { ErasureExecutionError } from './retentionService';
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

async function resolvePrincipalId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const user = await resolveAuthenticatedUser(request, reply);
  return user?.userId ?? null;
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
    const userId = await resolvePrincipalId(request, reply);
    if (!userId) return reply;

    const parseResult = dataAccessRequestSchema.safeParse(request.body || {});
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.issues[0]?.message || 'Invalid data export parameters',
        { code: 'VALIDATION_ERROR' },
      );
    }

    try {
      const archive = await rightsService.processAccessRequest(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, archive, 200);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error processing data access request');
      return sendApiError(
        reply,
        request,
        err instanceof RightsPersistenceError ? 503 : 500,
        'Data Export Unavailable',
        'A data export could not be durably compiled from the configured user data stores.',
        { code: 'DATA_EXPORT_UNAVAILABLE' },
      );
    }
  });

  app.post('/api/v1/compliance/rights/correction', async (request, reply) => {
    const userId = await resolvePrincipalId(request, reply);
    if (!userId) return reply;

    const parseResult = dataCorrectionRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.issues[0]?.message || 'Invalid correction parameters',
        { code: 'VALIDATION_ERROR' },
      );
    }

    try {
      const result = await rightsService.processCorrectionRequest(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, result, 202);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error processing data correction request');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Correction request storage is unavailable.',
        { code: 'RIGHTS_STORAGE_UNAVAILABLE' },
      );
    }
  });

  app.post('/api/v1/compliance/rights/erasure', async (request, reply) => {
    const userId = await resolvePrincipalId(request, reply);
    if (!userId) return reply;

    const parseResult = dataErasureRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.issues[0]?.message ||
          'Explicit confirmation phrase required for account erasure',
        { code: 'INVALID_CONFIRMATION' },
      );
    }

    try {
      const result = await rightsService.processErasureRequest(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, result, 200);
    } catch (err: any) {
      request.log.error({ err, userId }, 'Error executing account erasure');
      return sendApiError(
        reply,
        request,
        err instanceof ErasureExecutionError ? 503 : 500,
        'Erasure Not Completed',
        'Account erasure and its completion ledger were not both confirmed; no certificate was issued.',
        { code: 'ERASURE_NOT_COMPLETED' },
      );
    }
  });

  // ─── 5. GRIEVANCE REDRESSAL MECHANISM (DPO) ───
  app.post('/api/v1/compliance/grievance', async (request, reply) => {
    const userId = await resolvePrincipalId(request, reply);
    if (!userId) return reply;
    const parseResult = grievanceSubmissionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.issues[0]?.message || 'Invalid grievance parameters',
        { code: 'VALIDATION_ERROR' },
      );
    }

    try {
      const ticket = await rightsService.submitGrievance(userId, parseResult.data);
      return sendComplianceSuccess(reply, request, ticket, 201);
    } catch (err: any) {
      request.log.error({ err }, 'Error lodging citizen grievance');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Grievance storage is unavailable; no ticket was issued.',
        { code: 'GRIEVANCE_STORAGE_UNAVAILABLE' },
      );
    }
  });

  app.get('/api/v1/compliance/grievance/:ticketId', async (request, reply) => {
    const userId = await resolvePrincipalId(request, reply);
    if (!userId) return reply;
    const { ticketId } = request.params as { ticketId: string };
    let ticket;
    try {
      ticket = await rightsService.getGrievance(ticketId, userId);
    } catch (err) {
      request.log.error({ err, userId }, 'Could not retrieve persisted grievance ticket');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Grievance storage is unavailable.',
        { code: 'GRIEVANCE_STORAGE_UNAVAILABLE' },
      );
    }
    if (!ticket) {
      return sendApiError(
        reply,
        request,
        404,
        'Not Found',
        `Grievance ticket '${ticketId}' not found`,
        {
          code: 'TICKET_NOT_FOUND',
        },
      );
    }
    return sendComplianceSuccess(reply, request, ticket);
  });

  // ─── 6. SIGNIFICANT DATA FIDUCIARY (SDF) EVALUATION ───
  app.get('/api/v1/compliance/sdf-assessment', async (request, reply) => {
    try {
      const assessment = sdfService.getAssessment();
      return sendComplianceSuccess(reply, request, assessment);
    } catch (error: any) {
      if (error?.message?.startsWith('SDF_ASSESSMENT_UNAVAILABLE')) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'A current, measured, and reviewed SDF assessment is not available.',
          { code: 'SDF_ASSESSMENT_UNAVAILABLE' },
        );
      }
      throw error;
    }
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
        parseResult.error.issues[0]?.message || 'Invalid incident parameters',
      );
    }

    const incident = breachService.recordIncident(parseResult.data);
    return sendComplianceSuccess(reply, request, incident, 201);
  });
};
