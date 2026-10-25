/**
 * Delimitation Watch API Routes (Job 023)
 *
 * Exposes endpoints for managing sources, triggering runs, querying run status,
 * replaying snapshots, and retrieving accepted version history.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import {
  DelimitationWatchOrchestrator,
  InMemoryDelimitationWatchRepository,
  PostgresDelimitationWatchRepository,
  type IDelimitationWatchRepository,
} from '../modules/delimitationWatch';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Shared repository singleton (or memory fallback in non-configured test runs)
let watchRepository: IDelimitationWatchRepository;

export function getWatchRepository(): IDelimitationWatchRepository {
  if (!watchRepository) {
    if (isSupabaseConfigured && supabase) {
      // Postgres-backed repository
      watchRepository = new PostgresDelimitationWatchRepository({
        query: async (sql: string, params?: any[]) => {
          // Wrap Supabase RPC or raw query
          const { data, error } = await (supabase as any).rpc('pg_raw_exec', { query: sql, params });
          if (error) throw error;
          return { rows: data || [] };
        },
      });
    } else {
      watchRepository = new InMemoryDelimitationWatchRepository();
    }
  }
  return watchRepository;
}

export function setWatchRepositoryForTesting(repo: IDelimitationWatchRepository): void {
  watchRepository = repo;
}

function verifyWatchAdminAuthorization(request: FastifyRequest): boolean {
  const authHeader = request.headers.authorization;
  const expectedSecret = process.env.KSHETRA_MONITOR_SECRET || process.env.MONITOR_WEBHOOK_SECRET || process.env.DELIMITATION_WATCH_SECRET;

  if (expectedSecret) {
    return authHeader === `Bearer ${expectedSecret}`;
  }
  return false;
}

export async function delimitationWatchRoutes(app: FastifyInstance) {
  const repo = getWatchRepository();
  const orchestrator = new DelimitationWatchOrchestrator(repo);

  // 1. GET /api/v1/delimitation/watch/sources — List registered sources
  app.get('/api/v1/delimitation/watch/sources', async (request: FastifyRequest, reply: FastifyReply) => {
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
    if (!verifyWatchAdminAuthorization(request)) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Admin or monitor token required to trigger pipeline');
    }

    const { sourceId } = request.params;
    try {
      const result = await orchestrator.runPipeline(sourceId, {
        correlationId: request.id,
      });

      return reply.status(200).send({
        success: true,
        data: { result },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'PipelineExecutionError', err.message);
    }
  });

  // 4. POST /api/v1/delimitation/watch/replay/:snapshotId — Replay existing snapshot
  app.post('/api/v1/delimitation/watch/replay/:snapshotId', async (request: FastifyRequest<{ Params: { snapshotId: string } }>, reply: FastifyReply) => {
    if (!verifyWatchAdminAuthorization(request)) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Admin or monitor token required to replay snapshots');
    }

    const { snapshotId } = request.params;
    try {
      const result = await orchestrator.replaySnapshot(snapshotId, {
        correlationId: request.id,
      });

      return reply.status(200).send({
        success: true,
        data: { result },
      });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'ReplayExecutionError', err.message);
    }
  });

  // 5. GET /api/v1/delimitation/watch/runs/:sourceId — Query run history for source
  app.get('/api/v1/delimitation/watch/runs/:sourceId', async (request: FastifyRequest<{ Params: { sourceId: string } }>, reply: FastifyReply) => {
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
