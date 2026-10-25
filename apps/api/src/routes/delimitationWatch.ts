/**
 * Delimitation Watch API Routes (Job 023)
 *
 * Exposes endpoints for managing sources, triggering runs, querying run status,
 * replaying snapshots, retrieving accepted version history, and checking persistence health.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import {
  DelimitationWatchOrchestrator,
  InMemoryDelimitationWatchRepository,
  PostgresDelimitationWatchRepository,
  type IDelimitationWatchRepository,
} from '../modules/delimitationWatch';

// Shared repository singleton (or memory fallback in non-configured test runs)
let watchRepository: IDelimitationWatchRepository | null = null;

export function getWatchRepository(): IDelimitationWatchRepository {
  if (!watchRepository) {
    if (process.env.DATABASE_URL) {
      if (process.env.DATABASE_URL.startsWith('pglite://')) {
        // Explicit PGlite connection for fast test suites
        try {
          const { PGlite } = require('@electric-sql/pglite');
          const pglite = new PGlite();
          watchRepository = new PostgresDelimitationWatchRepository({
            query: async (sql: string, params?: any[]) => {
              const res = await pglite.query(sql, params);
              return { rows: res.rows };
            },
          });
        } catch (err: any) {
          throw new Error(`PERSISTENCE_CONFIGURATION_ERROR: Failed to initialize PGlite: ${err.message}`);
        }
      } else {
        // Real PostgreSQL server connection via pg.Pool
        try {
          const { Pool } = require('pg');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          pool.on('error', (err: any) => {
            console.error('[DelimitationWatch] Unexpected error on idle database client', err);
          });
          watchRepository = new PostgresDelimitationWatchRepository({
            query: async (sql: string, params?: any[]) => {
              const res = await pool.query(sql, params);
              return { rows: res.rows };
            },
          });
        } catch (err: any) {
          throw new Error(`PERSISTENCE_CONFIGURATION_ERROR: Failed to initialize PostgreSQL pool: ${err.message}`);
        }
      }
    } else if (process.env.NODE_ENV === 'test') {
      watchRepository = new InMemoryDelimitationWatchRepository();
    } else {
      throw new Error(
        'PERSISTENCE_CONFIGURATION_ERROR: Database persistence is unconfigured in deployed runtime (NODE_ENV !== "test"). Set DATABASE_URL to a valid PostgreSQL instance.',
      );
    }
  }
  return watchRepository;
}

export function setWatchRepositoryForTesting(repo: IDelimitationWatchRepository | null): void {
  watchRepository = repo;
}

function resolveRepository(): { repo?: IDelimitationWatchRepository; error?: string } {
  try {
    const repo = getWatchRepository();
    return { repo };
  } catch (err: any) {
    return { error: err.message };
  }
}

function verifyWatchAdminAuthorization(request: FastifyRequest): boolean {
  const authHeader = request.headers.authorization;
  const expectedSecret =
    process.env.KSHETRA_MONITOR_SECRET ||
    process.env.MONITOR_WEBHOOK_SECRET ||
    process.env.DELIMITATION_WATCH_SECRET;

  if (expectedSecret) {
    return authHeader === `Bearer ${expectedSecret}`;
  }
  return false;
}

export async function delimitationWatchRoutes(app: FastifyInstance) {
  // 0. GET /api/v1/delimitation/watch/health — Persistence health and durability probe
  app.get('/api/v1/delimitation/watch/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    const isTest = process.env.NODE_ENV === 'test';

    if (!repo) {
      return reply.status(503).send({
        status: 'UNHEALTHY',
        repositoryType: 'unconfigured',
        durable: false,
        error: error || 'PERSISTENCE_CONFIGURATION_ERROR: Database persistence unconfigured',
      });
    }

    const isDurable = repo.isDurable();
    const health = await repo.checkHealth();

    if (!health.healthy) {
      return reply.status(503).send({
        status: 'UNHEALTHY',
        repositoryType: isDurable ? 'postgres' : 'in_memory',
        durable: isDurable,
        details: health.details,
      });
    }

    if (!isDurable && !isTest) {
      return reply.status(503).send({
        status: 'UNHEALTHY',
        repositoryType: 'in_memory',
        durable: false,
        error: 'PERSISTENCE_CONFIGURATION_ERROR: Ephemeral in-memory repository not permitted in deployed runtime',
      });
    }

    return reply.status(200).send({
      status: 'HEALTHY',
      repositoryType: isDurable ? 'postgres' : 'in_memory',
      durable: isDurable,
      details: health.details,
    });
  });

  // 1. GET /api/v1/delimitation/watch/sources — List registered sources
  app.get('/api/v1/delimitation/watch/sources', async (request: FastifyRequest, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    try {
      const sources = await repo.listSources();
      return reply.status(200).send({
        success: true,
        data: {
          sources,
          count: sources.length,
        },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'DatabaseError', err.message);
    }
  });

  // 2. POST /api/v1/delimitation/watch/sources — Register a new source (Authorized)
  app.post('/api/v1/delimitation/watch/sources', async (request: FastifyRequest, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    if (!verifyWatchAdminAuthorization(request)) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Admin or monitor token required to register sources');
    }

    try {
      const body = request.body as any;
      await repo.saveSource({
        id: body.id,
        name: body.name,
        publisher: body.publisher,
        sourceType: body.sourceType,
        canonicalUrl: body.canonicalUrl,
        geographicScope: body.geographicScope,
        subjectScope: body.subjectScope,
        authorityClassification: body.authorityClassification || 'statutory',
        retrievalMethod: body.retrievalMethod || 'http_get',
        pollingSchedule: body.pollingSchedule,
        isActive: body.isActive ?? true,
        consecutiveFailures: 0,
        metadata: body.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const saved = await repo.getSource(body.id);
      return reply.status(201).send({
        success: true,
        data: { source: saved },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 400, 'ValidationError', err.message);
    }
  });

  // 3. POST /api/v1/delimitation/watch/trigger/:sourceId — Trigger Delimitation Watch run
  app.post('/api/v1/delimitation/watch/trigger/:sourceId', async (request: FastifyRequest<{ Params: { sourceId: string } }>, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    if (!verifyWatchAdminAuthorization(request)) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Admin or monitor token required to trigger pipeline');
    }

    const { sourceId } = request.params;
    try {
      const orchestrator = new DelimitationWatchOrchestrator(repo);
      const result = await orchestrator.runPipeline(sourceId, {
        correlationId: request.id,
      });

      return reply.status(200).send({
        success: true,
        data: { result },
      });
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('CONCURRENT_RUN_CONFLICT') || err.message.includes('CONCURRENT_RUN_IN_PROGRESS'))
      ) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONCURRENT_RUN_IN_PROGRESS',
            message: err.message,
          },
        });
      }
      return sendApiError(reply, request, 500, 'PipelineExecutionError', err.message);
    }
  });

  // 4. POST /api/v1/delimitation/watch/replay/:snapshotId — Replay existing snapshot
  app.post('/api/v1/delimitation/watch/replay/:snapshotId', async (request: FastifyRequest<{ Params: { snapshotId: string } }>, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    if (!verifyWatchAdminAuthorization(request)) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Admin or monitor token required to replay snapshots');
    }

    const { snapshotId } = request.params;
    try {
      const orchestrator = new DelimitationWatchOrchestrator(repo);
      const result = await orchestrator.replaySnapshot(snapshotId, {
        correlationId: request.id,
      });

      return reply.status(200).send({
        success: true,
        data: { result },
      });
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('CONCURRENT_RUN_CONFLICT') || err.message.includes('CONCURRENT_RUN_IN_PROGRESS'))
      ) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONCURRENT_RUN_IN_PROGRESS',
            message: err.message,
          },
        });
      }
      return sendApiError(reply, request, 500, 'ReplayExecutionError', err.message);
    }
  });

  // 5. GET /api/v1/delimitation/watch/runs/:sourceId — Query run history for source
  app.get('/api/v1/delimitation/watch/runs/:sourceId', async (request: FastifyRequest<{ Params: { sourceId: string } }>, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    const { sourceId } = request.params;
    try {
      const runs = await repo.listRunsForSource(sourceId);
      return reply.status(200).send({
        success: true,
        data: {
          sourceId,
          runs,
          count: runs.length,
        },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'DatabaseError', err.message);
    }
  });

  // 6. GET /api/v1/delimitation/watch/versions/:sourceId — Query accepted versions for source
  app.get('/api/v1/delimitation/watch/versions/:sourceId', async (request: FastifyRequest<{ Params: { sourceId: string } }>, reply: FastifyReply) => {
    const { repo, error } = resolveRepository();
    if (!repo) {
      return reply.status(503).send({
        success: false,
        error: { code: 'PERSISTENCE_CONFIGURATION_ERROR', message: error },
      });
    }

    const { sourceId } = request.params;
    try {
      const versions = await repo.listAcceptedVersionsForSource(sourceId);
      return reply.status(200).send({
        success: true,
        data: {
          sourceId,
          versions,
          count: versions.length,
        },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'DatabaseError', err.message);
    }
  });
}
