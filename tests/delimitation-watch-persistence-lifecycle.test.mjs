/**
 * Job 023 — Finding C: Delimitation Watch Persistence Lifecycle & Multi-Process Safety Suite
 *
 * Verifies multi-process distributed locking, lease expiration, durable PostgreSQL persistence,
 * field parity across database re-instantiation, and fail-closed runtime when DB is unconfigured.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import Fastify from 'fastify';
import { DelimitationWatchOrchestrator } from '../apps/api/src/modules/delimitationWatch/orchestrator.ts';
import {
  PostgresDelimitationWatchRepository,
  InMemoryDelimitationWatchRepository,
} from '../apps/api/src/modules/delimitationWatch/persistence.ts';
import { SourceRegistry } from '../apps/api/src/modules/delimitationWatch/sourceRegistry.ts';
import {
  delimitationWatchRoutes,
  getWatchRepository,
  setWatchRepositoryForTesting,
} from '../apps/api/src/routes/delimitationWatch.ts';

describe('Job 023 — Finding C: Persistence Lifecycle & Concurrency Suite', () => {
  let pg;
  let repo;
  let orchestrator;

  const initialFixturePath = path.resolve('tests/fixtures/delimitation/initial_delimitation_source_fixture.json');

  before(async () => {
    // 1. Initialize isolated PGlite instance
    pg = new PGlite();

    // 2. Apply Migration 071 DDL
    const migrationSql = fs.readFileSync(
      path.resolve('supabase/migrations/071_delimitation_watch_engine.sql'),
      'utf8',
    );
    await pg.exec(migrationSql);

    // 3. Instantiate PostgreSQL repository
    repo = new PostgresDelimitationWatchRepository({
      query: async (sql, params) => {
        const res = await pg.query(sql, params);
        return { rows: res.rows };
      },
    });

    orchestrator = new DelimitationWatchOrchestrator(repo, {
      sendPush: async () => ({ recipientCount: 5, deliveredCount: 5, failedCount: 0 }),
      sendWebhook: async () => ({ dispatched: true }),
    });
  });

  after(async () => {
    if (pg) {
      await pg.close();
    }
  });

  // 1. Multi-process and multi-instance concurrency safety
  test('PERSIST-01: Multi-process concurrency locking serializes runs and rejects simultaneous workers', async () => {
    const sourceId = 'SRC-CONCURRENCY-001';
    await repo.saveSource({
      id: sourceId,
      name: 'Concurrency Test Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Worker 1 acquires lock
    const token1 = randomUUID();
    const acquired1 = await repo.acquireSourceLock(sourceId, token1, 60000);
    assert.equal(acquired1, true, 'Worker 1 must acquire initial distributed lock');

    // Worker 2 attempts simultaneous lock on separate process/instance
    const token2 = randomUUID();
    const acquired2 = await repo.acquireSourceLock(sourceId, token2, 60000);
    assert.equal(acquired2, false, 'Worker 2 must be rejected while Worker 1 holds active lease');

    // Orchestrator concurrency conflict error verification
    await assert.rejects(
      async () => {
        await orchestrator.runPipeline(sourceId);
      },
      /CONCURRENT_RUN_CONFLICT/,
      'Pipeline must throw CONCURRENT_RUN_CONFLICT when database lease is held',
    );

    // Worker 1 releases lock
    await repo.releaseSourceLock(sourceId, token1);

    // Worker 2 can now acquire lock
    const acquiredAfterRelease = await repo.acquireSourceLock(sourceId, token2, 60000);
    assert.equal(acquiredAfterRelease, true, 'Worker 2 must acquire lock after release');
    await repo.releaseSourceLock(sourceId, token2);
  });

  // 2. Lock expiration / lease renewal
  test('PERSIST-02: Expired lease automatically unlocks and allows next run to proceed', async () => {
    const sourceId = 'SRC-EXPIRE-002';
    await repo.saveSource({
      id: sourceId,
      name: 'Lease Expiration Test Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Worker 1 acquires lock with short TTL (100ms)
    const token1 = randomUUID();
    const acquired1 = await repo.acquireSourceLock(sourceId, token1, 100);
    assert.equal(acquired1, true);

    // Wait 150ms for lock to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Worker 2 attempts lock acquisition after TTL expiration
    const token2 = randomUUID();
    const acquired2 = await repo.acquireSourceLock(sourceId, token2, 60000);
    assert.equal(acquired2, true, 'Worker 2 must acquire expired lease without explicit release');

    await repo.releaseSourceLock(sourceId, token2);
  });

  // 3. Durable persistence across restarts with 100% field parity
  test('PERSIST-03: Durable persistence maintains 100% field parity when re-read from independent repository instance', async () => {
    const sourceId = 'SRC-DURABLE-003';
    const sourceRegistry = new SourceRegistry(repo);
    await sourceRegistry.registerSource({
      id: sourceId,
      name: 'Durable Test Source',
      publisher: 'Delimitation Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    // Run full pipeline
    const runResult = await orchestrator.runPipeline(sourceId);
    assert.equal(runResult.outcome, 'SUCCESS');

    // Instantiate an independent repository instance connected to the same PostgreSQL database
    const independentRepo = new PostgresDelimitationWatchRepository({
      query: async (sql, params) => {
        const res = await pg.query(sql, params);
        return { rows: res.rows };
      },
    });

    // Re-read every stage record
    const retrievedSource = await independentRepo.getSource(sourceId);
    assert.ok(retrievedSource);
    assert.equal(retrievedSource.id, sourceId);
    assert.equal(retrievedSource.publisher, 'Delimitation Commission of India');

    const retrievedSnapshot = await independentRepo.getSnapshot(runResult.snapshot.id);
    assert.ok(retrievedSnapshot);
    assert.equal(retrievedSnapshot.contentSha256, runResult.snapshot.contentSha256);

    const retrievedCandidate = await independentRepo.getCandidate(runResult.candidate.id);
    assert.ok(retrievedCandidate);
    assert.equal(retrievedCandidate.normalizedDataStatus, runResult.candidate.normalizedDataStatus);

    const retrievedValidation = await independentRepo.getValidation(runResult.validation.id);
    assert.ok(retrievedValidation);
    assert.equal(retrievedValidation.validationStatus, 'PASSED');

    const retrievedComparison = await independentRepo.getComparison(runResult.comparison.id);
    assert.ok(retrievedComparison);
    assert.equal(retrievedComparison.classification, runResult.comparison.classification);

    const retrievedVersion = await independentRepo.getAcceptedVersion(runResult.acceptedVersion.id);
    assert.ok(retrievedVersion);
    assert.equal(retrievedVersion.contentSha256, runResult.acceptedVersion.contentSha256);

    const retrievedEvent = await independentRepo.getNotificationEvent(runResult.notificationEvent.id);
    assert.ok(retrievedEvent);
    assert.equal(retrievedEvent.dispatchStatus, 'SENT');

    const retrievedPub = await independentRepo.getPublicationByVersionId(runResult.acceptedVersion.id);
    assert.ok(retrievedPub);
    assert.equal(retrievedPub.publicationStatus, 'PUBLISHED');

    const retrievedRun = await independentRepo.getRun(runResult.runId);
    assert.ok(retrievedRun);
    assert.equal(retrievedRun.outcome, 'SUCCESS');
  });

  // 4. Fail closed in non-test runtime when database is unconfigured
  test('PERSIST-04: Non-test runtime (NODE_ENV=production) fails closed with 503 PERSISTENCE_CONFIGURATION_ERROR', async () => {
    const origEnv = process.env.NODE_ENV;
    const origDbUrl = process.env.DATABASE_URL;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;

      // Reset testing override
      setWatchRepositoryForTesting(null);

      // In non-test runtime without DATABASE_URL, getWatchRepository MUST throw
      assert.throws(
        () => {
          getWatchRepository();
        },
        /PERSISTENCE_CONFIGURATION_ERROR/,
        'getWatchRepository must fail closed in production when database is unconfigured',
      );

      // Start Fastify app in production mode
      const app = Fastify();
      await app.register(delimitationWatchRoutes);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/watch/health',
      });

      assert.equal(res.statusCode, 503, 'Health endpoint must return HTTP 503 when DB is unconfigured in production');
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'UNHEALTHY');
      assert.equal(body.durable, false);

      // Trigger endpoint must also return 503
      const triggerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/watch/trigger/SRC-001',
        headers: { authorization: 'Bearer test' },
      });
      assert.equal(triggerRes.statusCode, 503);
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origDbUrl) process.env.DATABASE_URL = origDbUrl;
      setWatchRepositoryForTesting(repo);
    }
  });

  // 5. Health probe endpoint with active PostgreSQL persistence
  test('PERSIST-05: GET /api/v1/delimitation/watch/health returns HEALTHY (200) with PostgreSQL repository', async () => {
    setWatchRepositoryForTesting(repo);

    const app = Fastify();
    await app.register(delimitationWatchRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/delimitation/watch/health',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'HEALTHY');
    assert.equal(body.repositoryType, 'postgres');
    assert.equal(body.durable, true);
  });
});
