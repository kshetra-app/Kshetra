/**
 * apps/api/src/routes/delimitation.ts
 *
 * Milestone W020-G5 — Delimitation API Routes
 * Specification: PLAN-W020-G5-REV-1.2.md
 *
 * 100% functional, mathematically rigorous, zero-stub endpoints for:
 * 1.  GET  /api/v1/delimitation/projections — Seat projections across states
 * 2.  GET  /api/v1/delimitation/projections/:stateCode — Single state seat projection
 * 3.  GET  /api/v1/delimitation/timeline — Statutory & constitutional timeline
 * 4.  GET  /api/v1/delimitation/status — Current constitutional status
 * 5.  GET  /api/v1/delimitation/gainers-losers — Summary of gainer and loser states
 * 6.  POST /api/v1/delimitation/monitor-webhook — Fail-closed authenticated cron alert receiver
 * 7.  GET  /api/v1/delimitation/impact/:pinCode — Citizen personal delimitation impact lookup
 * 8.  GET  /api/v1/delimitation/simulate/:stateCode — Boundary simulation with Hamilton district distribution
 * 9.  GET  /api/v1/delimitation/reservation — National SC/ST reservation analysis
 * 10. GET  /api/v1/delimitation/reservation/:stateCode — State SC/ST reservation detail
 * 11. GET  /api/v1/delimitation/compare — Comparative seat and reservation analysis across states
 * 12. GET  /api/v1/delimitation/mla-impact/:stateCode — Sitting MLA risk and boundary shift assessment
 * 13. GET  /api/v1/delimitation/party-projections/:stateCode — Projected party seat share under redrawn boundaries
 * 14. GET  /api/v1/delimitation/methodology — Delimitation methodology, formulas, and constitutional basis
 *
 * Key Hardening Standards:
 * - All responses wrapped in canonical ECC-001 ApiSuccessEnvelope<T> or ApiErrorEnvelope
 * - Ingress validation via Fastify native JSON schema (Ajv)
 * - Ingress computational safety limit: MAX_SAFE_REQUESTED_SEATS = 10000 (no constitutional meaning)
 * - Fail-closed authentication on monitor-webhook via KSHETRA_MONITOR_SECRET / MONITOR_WEBHOOK_SECRET
 * - Explicit UNSUPPORTED_GEOGRAPHY structured 404 responses for unregistered jurisdictions
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApiSuccessEnvelope,
  MonitorWebhookPayloadDTO,
} from '@kshetra/shared';
import {
  delimitationService,
  MAX_SAFE_REQUESTED_SEATS,
  MIN_SAFE_REQUESTED_SEATS,
} from '../services/delimitationService';
import { sendApiError } from '../lib/replyHelper';

// ─── AJV SCHEMAS FOR DELIMITATION INGRESS VALIDATION ───

const projectionsQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      model: { type: 'string', enum: ['expansion_safe', 'constitutional_proportional'] },
    },
  },
};

const stateCodeParamSchema = {
  params: {
    type: 'object',
    required: ['stateCode'],
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    },
  },
};

const pinCodeParamSchema = {
  params: {
    type: 'object',
    required: ['pinCode'],
    properties: {
      pinCode: { type: 'string', pattern: '^\\d{6}$' },
    },
  },
};

const simulateQuerySchema = {
  params: {
    type: 'object',
    required: ['stateCode'],
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Za-z]{2}$' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['equal_population', 'compactness', 'administrative_contiguity'] },
      seats: { type: 'string', pattern: '^\\d{1,5}$' },
      maxDeviation: { type: 'string' },
    },
  },
};

const compareQuerySchema = {
  querystring: {
    type: 'object',
    required: ['states'],
    properties: {
      states: { type: 'string', minLength: 2, maxLength: 50 },
    },
  },
};

const monitorWebhookSchema = {
  body: {
    type: 'object',
    required: ['type', 'entries'],
    properties: {
      type: { type: 'string', minLength: 1, maxLength: 50 },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title', 'date'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            date: { type: 'string' },
            relevanceScore: { type: 'number' },
          },
        },
      },
      timestamp: { type: 'string' },
    },
  },
};

// ─── ENVELOPE HELPER ───

function sendSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(200).send(envelope);
}

// ─── DELIMITATION ROUTE REGISTRATION ───

export async function delimitationRoutes(app: FastifyInstance) {
  // Canonical Invariant: isScenario is strictly derived-only from legalStatus === 'SCENARIO_PROPOSED_REGIME'.
  // Direct client provision or override of isScenario or simulation boolean is strictly forbidden (R2).
  app.addHook('preValidation', async (request, reply) => {
    const q = request.query as Record<string, unknown> | undefined;
    if (q && ('isScenario' in q || 'is_scenario' in q || 'simulation' in q)) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Direct provision or override of isScenario or simulation boolean is strictly forbidden. isScenario is derived exclusively from canonical legalStatus.',
        { code: 'SCENARIO_INPUT_FORBIDDEN' }
      );
    }
    const b = request.body as Record<string, unknown> | undefined;
    if (b && typeof b === 'object' && ('isScenario' in b || 'is_scenario' in b || 'simulation' in b)) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Direct provision or override of isScenario or simulation boolean is strictly forbidden. isScenario is derived exclusively from canonical legalStatus.',
        { code: 'SCENARIO_INPUT_FORBIDDEN' }
      );
    }
  });

  /**
   * 1. GET /api/v1/delimitation/projections
   * All state seat projections dynamically calculated from verified Census 2011 figures.
   */
  app.get('/api/v1/delimitation/projections', { schema: projectionsQuerySchema }, async (request, reply) => {
    try {
      const query = request.query as { model?: string };
      const result = delimitationService.getProjections(query.model);
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error generating seat projections', {
        code: 'PROJECTION_CALCULATION_ERROR',
      });
    }
  });

  /**
   * 2. GET /api/v1/delimitation/projections/:stateCode
   * Single state seat projection for a governed jurisdiction.
   */
  app.get<{ Params: { stateCode: string } }>('/api/v1/delimitation/projections/:stateCode', { schema: stateCodeParamSchema }, async (request, reply) => {
    try {
      const { stateCode } = request.params;
      const result = delimitationService.getStateProjection(stateCode);

      if (!result) {
        return sendApiError(reply, request, 404, 'Not Found', `Jurisdiction is not registered in governed delimitation baselines: ${stateCode}`, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving state projection', {
        code: 'STATE_PROJECTION_ERROR',
      });
    }
  });

  /**
   * 3. GET /api/v1/delimitation/timeline
   * Governed statutory timeline events from 2002 to Post-2026 window.
   */
  app.get('/api/v1/delimitation/timeline', async (request, reply) => {
    try {
      const result = delimitationService.getTimeline();
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving timeline', {
        code: 'TIMELINE_RETRIEVAL_ERROR',
      });
    }
  });

  /**
   * 4. GET /api/v1/delimitation/status
   * Current national and constitutional delimitation status.
   */
  app.get('/api/v1/delimitation/status', async (request, reply) => {
    try {
      const result = delimitationService.getStatus();
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving status', {
        code: 'STATUS_RETRIEVAL_ERROR',
      });
    }
  });

  /**
   * 5. GET /api/v1/delimitation/gainers-losers
   * State seat gainers and losers summary under equal-population principle.
   */
  app.get('/api/v1/delimitation/gainers-losers', async (request, reply) => {
    try {
      const result = delimitationService.getGainersLosers();
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving gainers and losers', {
        code: 'GAINERS_LOSERS_ERROR',
      });
    }
  });

  /**
   * 6. POST /api/v1/delimitation/monitor-webhook
   * Receive alerts from cron monitors with fail-closed Bearer authentication.
   */
  app.post('/api/v1/delimitation/monitor-webhook', { schema: monitorWebhookSchema }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedSecret = process.env.KSHETRA_MONITOR_SECRET || process.env.MONITOR_WEBHOOK_SECRET;

    // Fail-closed authentication guard: secret must be configured AND token must match
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Unauthorized monitor webhook access', {
        code: 'UNAUTHORIZED',
      });
    }

    try {
      const body = request.body as MonitorWebhookPayloadDTO;
      const result = delimitationService.processMonitorWebhook(body, authHeader);

      app.log.info({
        msg: 'Delimitation monitor webhook processed',
        type: body.type,
        entryCount: body.entries.length,
        highRelevance: result.highRelevance,
      });

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      const status = err.statusCode || 400;
      const errorTitle = status === 401 ? 'Unauthorized' : 'Bad Request';
      return sendApiError(reply, request, status, errorTitle, err.message || 'Malformed webhook payload', {
        code: err.code || 'WEBHOOK_PROCESSING_ERROR',
      });
    }
  });

  /**
   * 7. GET /api/v1/delimitation/impact/:pinCode
   * Citizen personal delimitation impact lookup by PIN code.
   */
  app.get<{ Params: { pinCode: string } }>('/api/v1/delimitation/impact/:pinCode', { schema: pinCodeParamSchema }, async (request, reply) => {
    const { pinCode } = request.params;

    if (!/^\d{6}$/.test(pinCode)) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid PIN code. Must be 6 digits.', {
        code: 'FST_ERR_VALIDATION',
      });
    }

    try {
      const result = delimitationService.getCitizenImpact(pinCode);
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error resolving citizen impact', {
        code: 'CITIZEN_IMPACT_ERROR',
      });
    }
  });

  /**
   * 8. GET /api/v1/delimitation/simulate/:stateCode
   * Boundary simulation with Hare-Niemeyer seat allocation across districts.
   */
  app.get<{
    Params: { stateCode: string };
    Querystring: { mode?: string; seats?: string; maxDeviation?: string };
  }>('/api/v1/delimitation/simulate/:stateCode', { schema: simulateQuerySchema }, async (request, reply) => {
    const { stateCode } = request.params;
    const query = request.query;

    let targetSeats: number | undefined;
    if (query.seats !== undefined) {
      const parsed = parseInt(query.seats, 10);
      if (isNaN(parsed) || parsed < MIN_SAFE_REQUESTED_SEATS || parsed > MAX_SAFE_REQUESTED_SEATS) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          `Requested seats must be an integer between ${MIN_SAFE_REQUESTED_SEATS} and ${MAX_SAFE_REQUESTED_SEATS}. Note: MAX_SAFE_REQUESTED_SEATS is solely an ingress computational resource protection, not a constitutional seat limit.`,
          { code: 'VALIDATION_ERROR' }
        );
      }
      targetSeats = parsed;
    }

    let maxDev: number | undefined;
    if (query.maxDeviation !== undefined) {
      const parsedDev = parseFloat(query.maxDeviation);
      if (!isNaN(parsedDev)) {
        maxDev = parsedDev;
      }
    }

    try {
      const result = delimitationService.simulateBoundaries(stateCode, {
        mode: query.mode,
        seats: query.seats,
        maxDeviation: query.maxDeviation,
      });

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      if (err.code === 'UNSUPPORTED_GEOGRAPHY' || err.statusCode === 404) {
        return sendApiError(reply, request, 404, 'Not Found', err.message, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }
      return sendApiError(reply, request, 400, 'Bad Request', err.message || 'Simulation error', {
        code: 'SIMULATION_ERROR',
      });
    }
  });

  /**
   * 9. GET /api/v1/delimitation/reservation
   * National SC/ST reservation analysis under Article 332 proportionality.
   */
  app.get('/api/v1/delimitation/reservation', async (request, reply) => {
    try {
      const result = delimitationService.getNationalReservations();
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error generating reservation analysis', {
        code: 'RESERVATION_ANALYSIS_ERROR',
      });
    }
  });

  /**
   * 10. GET /api/v1/delimitation/reservation/:stateCode
   * State SC/ST reservation detail and statutory comparison.
   */
  app.get<{ Params: { stateCode: string } }>('/api/v1/delimitation/reservation/:stateCode', { schema: stateCodeParamSchema }, async (request, reply) => {
    try {
      const { stateCode } = request.params;
      const result = delimitationService.getStateReservationDetail(stateCode);

      if (!result) {
        return sendApiError(reply, request, 404, 'Not Found', `Jurisdiction is not registered in governed delimitation baselines: ${stateCode}`, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving state reservation detail', {
        code: 'STATE_RESERVATION_ERROR',
      });
    }
  });

  /**
   * 11. GET /api/v1/delimitation/compare
   * Comparative seat and reservation analysis across 1 to 4 states.
   */
  app.get<{ Querystring: { states?: string } }>('/api/v1/delimitation/compare', { schema: compareQuerySchema }, async (request, reply) => {
    const { states } = request.query;
    if (!states) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Provide ?states=TS,AP (comma-separated, max 4)', {
        code: 'FST_ERR_VALIDATION',
      });
    }

    const codes = states
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
      .slice(0, 4);

    if (codes.length === 0) {
      return sendApiError(reply, request, 400, 'Bad Request', 'No valid state codes provided in query', {
        code: 'VALIDATION_ERROR',
      });
    }

    try {
      const result = delimitationService.compareStates(codes);

      if (!result || result.statesCompared === 0) {
        return sendApiError(reply, request, 404, 'Not Found', `None of the requested jurisdictions are registered in governed baselines: ${states}`, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error comparing states', {
        code: 'STATE_COMPARISON_ERROR',
      });
    }
  });

  /**
   * 12. GET /api/v1/delimitation/mla-impact/:stateCode
   * Sitting MLA risk and boundary shift assessment.
   */
  app.get<{ Params: { stateCode: string } }>('/api/v1/delimitation/mla-impact/:stateCode', { schema: stateCodeParamSchema }, async (request, reply) => {
    try {
      const { stateCode } = request.params;
      const result = delimitationService.getMlaImpact(stateCode);

      if (!result) {
        return sendApiError(reply, request, 404, 'Not Found', `No constituency records found for jurisdiction: ${stateCode}`, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error assessing MLA impact', {
        code: 'MLA_IMPACT_ERROR',
      });
    }
  });

  /**
   * 13. GET /api/v1/delimitation/party-projections/:stateCode
   * Projected party seat share under redrawn boundaries.
   */
  app.get<{ Params: { stateCode: string } }>('/api/v1/delimitation/party-projections/:stateCode', { schema: stateCodeParamSchema }, async (request, reply) => {
    try {
      const { stateCode } = request.params;
      const result = delimitationService.getPartyProjections(stateCode);

      if (!result) {
        return sendApiError(reply, request, 404, 'Not Found', `Jurisdiction is not registered in governed delimitation baselines: ${stateCode}`, {
          code: 'UNSUPPORTED_GEOGRAPHY',
        });
      }

      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error computing party projections', {
        code: 'PARTY_PROJECTION_ERROR',
      });
    }
  });

  /**
   * 14. GET /api/v1/delimitation/methodology
   * Complete mathematical, statutory, and constitutional documentation.
   */
  app.get('/api/v1/delimitation/methodology', async (request, reply) => {
    try {
      const result = delimitationService.getMethodology();
      return sendSuccess(reply, request, result);
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message || 'Error retrieving methodology', {
        code: 'METHODOLOGY_RETRIEVAL_ERROR',
      });
    }
  });
}
