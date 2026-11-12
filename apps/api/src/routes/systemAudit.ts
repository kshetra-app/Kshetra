import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DbPerformanceAuditor } from '../services/dbPerformanceAuditor';
import { LoadTestHarness } from '../services/loadTestHarness';
import { TopologyCertificationService } from '../services/topologyCertificationService';
import { DisasterRecoveryService } from '../services/disasterRecoveryService';
import { SecurityHardening } from '../middleware/securityHardening';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { sendApiError } from '../lib/replyHelper';

const DEMO_ONLY_MESSAGE =
  'This audit currently has no live production instrumentation and cannot be reported as a production result.';

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const user = await resolveAuthenticatedUser(request, reply);
  if (!user) return false;
  if (!['admin', 'super_admin', 'data_engineer'].includes(user.role)) {
    sendApiError(
      reply,
      request,
      403,
      'Forbidden',
      'Administrator or data engineer role required.',
      { code: 'FORBIDDEN' },
    );
    return false;
  }
  return true;
}

async function requireExplicitDemo(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (isProductionLikeRuntime()) {
    sendApiError(reply, request, 404, 'Not Found', 'Demo audit routes are disabled in production.');
    return false;
  }
  const query = request.query as { simulation?: string } | undefined;
  const body = request.body as { simulation?: boolean } | undefined;
  if (query?.simulation !== 'true' && body?.simulation !== true) {
    sendApiError(
      reply,
      request,
      400,
      'Bad Request',
      'Set simulation=true to run a non-production demo.',
      { code: 'SIMULATION_FLAG_REQUIRED' },
    );
    return false;
  }
  return true;
}

function unavailable(request: FastifyRequest, reply: FastifyReply) {
  return sendApiError(reply, request, 501, 'Not Implemented', DEMO_ONLY_MESSAGE, {
    code: 'LIVE_AUDIT_UNAVAILABLE',
  });
}

export const systemAuditRoutes: FastifyPluginAsync = async (app) => {
  // Production endpoints only expose live instrumentation. Simulated services are below /demo.
  for (const route of [
    '/api/v1/system/audit/performance',
    '/api/v1/system/audit/database',
    '/api/v1/system/audit/load-test',
    '/api/v1/system/audit/security',
    '/api/v1/system/audit/dr',
  ]) {
    app.get(route, async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return reply;
      return unavailable(request, reply);
    });
  }
  for (const route of [
    '/api/v1/system/audit/database/run',
    '/api/v1/system/audit/load-test/run',
    '/api/v1/system/audit/security/run',
    '/api/v1/system/audit/dr/drill',
    '/api/v1/system/audit/dr/rollback',
  ]) {
    app.post(route, async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return reply;
      return unavailable(request, reply);
    });
  }

  app.get('/api/v1/system/audit/topology', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return reply;
    try {
      return reply.send(await TopologyCertificationService.certifyNationwideTopology());
    } catch (error) {
      request.log.error({ err: error }, 'Live PostGIS topology certification unavailable');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Live PostGIS topology audit could not be completed and persisted.',
        { code: 'TOPOLOGY_AUDIT_UNAVAILABLE' },
      );
    }
  });

  app.post('/api/v1/system/audit/topology/run', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return reply;
    try {
      return reply.send(await TopologyCertificationService.certifyNationwideTopology());
    } catch (error) {
      request.log.error({ err: error }, 'Live PostGIS topology certification unavailable');
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Live PostGIS topology audit could not be completed and persisted.',
        { code: 'TOPOLOGY_AUDIT_UNAVAILABLE' },
      );
    }
  });

  // Explicitly labelled, non-production simulators. These endpoints never write pass results into production ledgers.
  app.get('/api/v1/demo/system/audit/database', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await DbPerformanceAuditor.runComprehensiveAudit(),
    });
  });
  app.get('/api/v1/demo/system/audit/load-test', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await LoadTestHarness.runConcurrencySuite(1000, 5),
    });
  });
  app.get('/api/v1/demo/system/audit/security', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await SecurityHardening.runPenetrationTestingSuite(),
    });
  });
  app.get('/api/v1/demo/system/audit/dr', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await DisasterRecoveryService.executeDisasterRecoveryDrill(),
    });
  });
  app.get('/api/v1/demo/system/audit/performance', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      timestamp: new Date().toISOString(),
      status: 'SIMULATED',
      targets: {
        coldStartupCeilingMs: 2000,
        warmStartupCeilingMs: 800,
        mapFrameTimeP95Ms: 16.6,
        feedFrameTimeP95Ms: 16.6,
        memoryRssCeilingMb: 120,
      },
      certified: false,
    });
  });
  app.post('/api/v1/demo/system/audit/database/run', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await DbPerformanceAuditor.runComprehensiveAudit(),
    });
  });
  app.post('/api/v1/demo/system/audit/load-test/run', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    const body = z
      .object({
        simulation: z.literal(true),
        rps: z.number().int().min(1).max(5000).optional(),
        duration: z.number().int().min(1).max(60).optional(),
      })
      .safeParse(request.body || {});
    if (!body.success)
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid demo load test parameters.',
        { code: 'VALIDATION_ERROR' },
      );
    return reply.send({
      mode: 'SIMULATION',
      report: await LoadTestHarness.runConcurrencySuite(
        body.data.rps ?? 1000,
        body.data.duration ?? 10,
      ),
    });
  });
  app.post('/api/v1/demo/system/audit/dr/drill', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    const body = z
      .object({
        simulation: z.literal(true),
        incident: z
          .enum(['PRIMARY_REGION_TOTAL_OUTAGE', 'CATASTROPHIC_DATA_CORRUPTION'])
          .optional(),
      })
      .safeParse(request.body || {});
    if (!body.success)
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Invalid demo disaster drill parameters.',
        { code: 'VALIDATION_ERROR' },
      );
    return reply.send({
      mode: 'SIMULATION',
      report: await DisasterRecoveryService.executeDisasterRecoveryDrill(body.data.incident),
    });
  });
  app.post('/api/v1/demo/system/audit/dr/rollback', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    const body = z
      .object({
        simulation: z.literal(true),
        fromVersion: z.string().optional(),
        targetVersion: z.string().optional(),
      })
      .safeParse(request.body || {});
    if (!body.success)
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid demo rollback parameters.', {
        code: 'VALIDATION_ERROR',
      });
    return reply.send({
      mode: 'SIMULATION',
      report: await DisasterRecoveryService.executeRollbackDrill(
        body.data.fromVersion,
        body.data.targetVersion,
      ),
    });
  });
  app.post('/api/v1/demo/system/audit/security/run', async (request, reply) => {
    if (!(await requireExplicitDemo(request, reply))) return reply;
    return reply.send({
      mode: 'SIMULATION',
      report: await SecurityHardening.runPenetrationTestingSuite(),
    });
  });
};
