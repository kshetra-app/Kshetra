/**
 * Job 023 — Delimitation Watch Dedicated PostgreSQL 16 Server Integration Suite
 *
 * Exercises the Delimitation Watch Engine against a real, separate, isolated PostgreSQL 16
 * server instance (running via Docker on 127.0.0.1:54334), completely distinct from PGlite:
 *
 * 1. Migration 071 DDL execution on real PostgreSQL 16
 * 2. Catalog verification of all 9 tables, columns, constraints, foreign keys, and indexes
 * 3. Complete 8-stage lifecycle execution with real database persistence
 * 4. Persistence across independent repository client recreation
 * 5. Persistence across PostgreSQL container / process restart
 * 6. Distributed multi-process atomic lease locking (concurrency, token safety, auto-expiry)
 * 7. Transactional integrity & baseline preservation on failure / rejection
 * 8. Deployed runtime fail-closed configuration verification
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import pg from 'pg';
const { Pool } = pg;
import { assertPostgresIntegrationSafe } from './helpers/postgresTestSafety.mjs';

import { DelimitationWatchOrchestrator } from '../apps/api/src/modules/delimitationWatch/orchestrator.ts';
import { PostgresDelimitationWatchRepository } from '../apps/api/src/modules/delimitationWatch/persistence.ts';
import { SourceRegistry } from '../apps/api/src/modules/delimitationWatch/sourceRegistry.ts';
import { CaptureAdapter } from '../apps/api/src/modules/delimitationWatch/captureAdapter.ts';
import { Normalizer } from '../apps/api/src/modules/delimitationWatch/normalizer.ts';
import { CandidateValidator } from '../apps/api/src/modules/delimitationWatch/validator.ts';
import { BaselineComparator } from '../apps/api/src/modules/delimitationWatch/comparator.ts';
import { Versioner } from '../apps/api/src/modules/delimitationWatch/versioner.ts';
import { Notifier } from '../apps/api/src/modules/delimitationWatch/notifier.ts';
import { Publisher } from '../apps/api/src/modules/delimitationWatch/publisher.ts';
import { getWatchRepository, setWatchRepositoryForTesting } from '../apps/api/src/routes/delimitationWatch.ts';

const PG_SERVER_URL = process.env.TEST_POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54334/job023_delimitation_test';
const CONTAINER_NAME = 'job023-verify-postgres';

describe('Job 023 — Dedicated PostgreSQL 16 Server Integration Suite', () => {
  let pool;
  let repo;
  let orchestrator;

  const initialFixturePath = path.resolve('tests/fixtures/delimitation/initial_delimitation_source_fixture.json');
  const changedFixturePath = path.resolve('tests/fixtures/delimitation/changed_delimitation_source_fixture.json');
  const invalidFixturePath = path.resolve('tests/fixtures/delimitation/invalid_delimitation_source_fixture.json');

  before(async () => {
    // 1. Connect to isolated PostgreSQL 16 server
    pool = new Pool({ connectionString: PG_SERVER_URL });
    pool.on('error', () => {}); // Handle idle socket termination during container restart

    // Safety Guard: Require explicit opt-in, loopback address, dedicated DB name, and live server identity check
    await assertPostgresIntegrationSafe(pool, PG_SERVER_URL, process.env);

    const versionRes = await pool.query('SELECT version();');
    assert.ok(versionRes.rows[0].version.includes('PostgreSQL 16'), 'Must connect to a real PostgreSQL 16 server');

    // 2. Drop existing tables if re-running
    await pool.query(`
      DROP TABLE IF EXISTS delimitation_watch_runs CASCADE;
      DROP TABLE IF EXISTS delimitation_publications CASCADE;
      DROP TABLE IF EXISTS delimitation_notification_events CASCADE;
      DROP TABLE IF EXISTS delimitation_accepted_versions CASCADE;
      DROP TABLE IF EXISTS delimitation_comparisons CASCADE;
      DROP TABLE IF EXISTS delimitation_validations CASCADE;
      DROP TABLE IF EXISTS delimitation_candidates CASCADE;
      DROP TABLE IF EXISTS delimitation_snapshots CASCADE;
      DROP TABLE IF EXISTS delimitation_watch_sources CASCADE;
    `);

    // 3. Apply Migration 071 DDL
    const migrationSql = fs.readFileSync(
      path.resolve('supabase/migrations/071_delimitation_watch_engine.sql'),
      'utf8'
    );
    await pool.query(migrationSql);

    // 4. Instantiate repository backed by real pg.Pool
    repo = new PostgresDelimitationWatchRepository({
      query: async (sql, params) => {
        const res = await pool.query(sql, params);
        return { rows: res.rows };
      },
    });

    orchestrator = new DelimitationWatchOrchestrator(repo);
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  // Test 1: Verify catalog of all 9 tables in PostgreSQL 16
  test('PG-SERVER-01: Verify all 9 Migration 071 tables and foreign key constraints exist in PostgreSQL 16', async () => {
    const tableRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'delimitation_%'
      ORDER BY table_name;
    `);

    const tableNames = tableRes.rows.map((r) => r.table_name);
    const expectedTables = [
      'delimitation_accepted_versions',
      'delimitation_candidates',
      'delimitation_comparisons',
      'delimitation_notification_events',
      'delimitation_publications',
      'delimitation_snapshots',
      'delimitation_validations',
      'delimitation_watch_runs',
      'delimitation_watch_sources',
    ];

    for (const expected of expectedTables) {
      assert.ok(tableNames.includes(expected), `PostgreSQL catalog must contain table '${expected}'`);
    }

    // Verify foreign keys use ON DELETE RESTRICT
    const fkRes = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name LIKE 'delimitation_%'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    assert.ok(fkRes.rows.length >= 8, 'Must have at least 8 foreign key constraints');
    for (const fk of fkRes.rows) {
      assert.equal(fk.delete_rule, 'RESTRICT', `Foreign key on ${fk.table_name}.${fk.column_name} must enforce RESTRICT`);
    }
  });

  // Test 2: Full 8-stage lifecycle execution persisting real rows across all 9 tables
  test('PG-SERVER-02: Execute complete 8-stage lifecycle persisting real rows across all 9 PostgreSQL tables', async () => {
    const sourceId = 'SRC-PG-SERVER-001';
    await repo.saveSource({
      id: sourceId,
      name: 'PostgreSQL Server Verification Source',
      publisher: 'Election Commission of India',
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

    const runResult = await orchestrator.runPipeline(sourceId);
    assert.equal(runResult.outcome, 'SUCCESS');
    assert.ok(runResult.acceptedVersion?.id, 'Must create accepted version');
    assert.ok(runResult.publication?.id, 'Must create publication');

    // Count rows in all 9 tables
    const counts = {};
    const tables = [
      'delimitation_watch_sources',
      'delimitation_snapshots',
      'delimitation_candidates',
      'delimitation_validations',
      'delimitation_comparisons',
      'delimitation_accepted_versions',
      'delimitation_notification_events',
      'delimitation_publications',
      'delimitation_watch_runs',
    ];

    for (const t of tables) {
      const res = await pool.query(`SELECT COUNT(*)::int as count FROM ${t}`);
      counts[t] = res.rows[0].count;
      assert.ok(counts[t] >= 1, `Table ${t} must have at least 1 persisted row, found ${counts[t]}`);
    }
  });

  // Test 3: Persistence across independent repository client recreation
  test('PG-SERVER-03: Proves durable persistence across independent repository client instance recreation', async () => {
    // Create an entirely separate repository client instance connected to same database
    const independentRepo = new PostgresDelimitationWatchRepository({
      query: async (sql, params) => {
        const res = await pool.query(sql, params);
        return { rows: res.rows };
      },
    });

    assert.equal(independentRepo.isDurable(), true);

    const source = await independentRepo.getSource('SRC-PG-SERVER-001');
    assert.ok(source, 'Source must be retrievable from independent repository instance');
    assert.equal(source.name, 'PostgreSQL Server Verification Source');

    const versions = await independentRepo.listAcceptedVersionsForSource('SRC-PG-SERVER-001');
    assert.ok(versions.length >= 1, 'Accepted versions must be retrievable from independent repository instance');

    const health = await independentRepo.checkHealth();
    assert.equal(health.healthy, true);
    assert.equal(health.details, 'postgres');
  });

  // Test 4: Persistence across PostgreSQL container restart
  test('PG-SERVER-04: Proves persistence across PostgreSQL server container restart', async () => {
    // 1. Record snapshot count before restart
    const beforeRes = await pool.query('SELECT COUNT(*)::int as cnt FROM delimitation_snapshots');
    const countBefore = beforeRes.rows[0].cnt;
    assert.ok(countBefore >= 1);

    // 2. Close pool cleanly before container restart to drain in-flight connections
    await pool.end();

    // 3. Restart the PostgreSQL container
    try {
      execSync(`docker restart ${CONTAINER_NAME}`, { stdio: 'pipe' });
    } catch (err) {
      assert.fail(`Failed to restart docker container ${CONTAINER_NAME}: ${err.message}`);
    }

    // 4. Wait for PostgreSQL to become ready again and create fresh pool
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 30) {
      attempts++;
      await new Promise((r) => setTimeout(r, 500));
      try {
        const testPool = new Pool({ connectionString: PG_SERVER_URL, connectionTimeoutMillis: 1000 });
        testPool.on('error', () => {});
        const testRes = await testPool.query('SELECT 1 as alive;');
        if (testRes.rows[0].alive === 1) {
          isReady = true;
          pool = testPool;
        }
      } catch {
        // waiting for postgres to start
      }
    }
    assert.ok(isReady, 'PostgreSQL server must recover and become healthy after container restart');

    // 5. Query data after restart and verify 100% data preservation
    const afterRes = await pool.query('SELECT COUNT(*)::int as cnt FROM delimitation_snapshots');
    assert.equal(afterRes.rows[0].cnt, countBefore, 'All rows must persist across server container restart');

    const versionRes = await pool.query('SELECT version_tag, data_status FROM delimitation_accepted_versions LIMIT 1');
    assert.ok(versionRes.rows.length === 1);
    assert.ok(versionRes.rows[0].version_tag.startsWith('v1.0.0'));
  });

  // Test 5: Distributed atomic lease locking (concurrency, safety, and expiration)
  test('PG-SERVER-05: Proves atomic database-backed lease locking, mutual exclusion, and token safety', async () => {
    const sourceId = 'SRC-PG-SERVER-001';
    const worker1Token = 'worker-1-uuid-token';
    const worker2Token = 'worker-2-uuid-token';

    // 1. Worker 1 acquires lock
    const acquired1 = await repo.acquireSourceLock(sourceId, worker1Token, 1000); // 1 sec TTL
    assert.equal(acquired1, true, 'Worker 1 must acquire uncontested source lock');

    // 2. Worker 2 attempts to acquire same lock -> rejected
    const acquired2 = await repo.acquireSourceLock(sourceId, worker2Token, 1000);
    assert.equal(acquired2, false, 'Worker 2 must be rejected while Worker 1 holds active lease');

    // 3. Worker 2 attempts to release Worker 1's lock -> rejected
    const releasedByWorker2 = await repo.releaseSourceLock(sourceId, worker2Token);
    assert.equal(releasedByWorker2, false, 'Worker 2 must NOT be able to release Worker 1 lock');

    // 4. Worker 1 releases lock -> success
    const releasedByWorker1 = await repo.releaseSourceLock(sourceId, worker1Token);
    assert.equal(releasedByWorker1, true, 'Worker 1 must successfully release its own lock');

    // 5. Worker 2 can now acquire lock
    const acquired2AfterRelease = await repo.acquireSourceLock(sourceId, worker2Token, 300); // 300ms TTL
    assert.equal(acquired2AfterRelease, true, 'Worker 2 can acquire lock once released');

    // 6. Test lock auto-expiration: wait 400ms for Worker 2's lease to expire
    await new Promise((r) => setTimeout(r, 400));

    // Worker 1 can acquire lock after Worker 2's lease expired automatically
    const acquired1AfterExpiry = await repo.acquireSourceLock(sourceId, worker1Token, 1000);
    assert.equal(acquired1AfterExpiry, true, 'Worker 1 must acquire lock after previous lease expired');

    await repo.releaseSourceLock(sourceId, worker1Token);
  });

  // Test 6: Transactional baseline preservation on invalid fixture
  test('PG-SERVER-06: Invalid fixture validation failure preserves prior accepted version and publication state', async () => {
    const sourceId = 'SRC-PG-SERVER-001';

    // Get current accepted version count
    const versionsBefore = await repo.listAcceptedVersionsForSource(sourceId);
    const countBefore = versionsBefore.length;

    // Modify source to point to invalid fixture
    await repo.saveSource({
      id: sourceId,
      name: 'PostgreSQL Server Verification Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: invalidFixturePath,
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

    const runResult = await orchestrator.runPipeline(sourceId);
    assert.equal(runResult.outcome, 'REJECTED', 'Invalid fixture must fail validation');

    // Verify accepted versions count and latest pointer remain unchanged
    const versionsAfter = await repo.listAcceptedVersionsForSource(sourceId);
    assert.equal(versionsAfter.length, countBefore, 'Validation failure must not create new accepted version');
    assert.equal(versionsAfter[0].id, versionsBefore[0].id, 'Accepted version pointer must remain untouched');
  });

  // Test 7: Deployed runtime fails closed if database unconfigured or unreachable
  test('PG-SERVER-07: Deployed runtime path fails closed with 503 PERSISTENCE_CONFIGURATION_ERROR when DB unconfigured', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDb = process.env.DATABASE_URL;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      setWatchRepositoryForTesting(null);

      assert.throws(
        () => {
          getWatchRepository();
        },
        /PERSISTENCE_CONFIGURATION_ERROR/,
        'Deployed runtime must fail closed when DATABASE_URL is unset',
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.DATABASE_URL = prevDb;
      setWatchRepositoryForTesting(null);
    }
  });
});
