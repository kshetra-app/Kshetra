/**
 * Delimitation Watch PostgreSQL Integration Test (Job 023)
 *
 * Runs the Delimitation Watch Engine against an isolated PostgreSQL instance (using PGlite),
 * executing migration 071 DDL and verifying real database tables, constraints,
 * foreign keys, indexes, and persistence semantics across all 8 pipeline stages.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
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

describe('Job 023 — PostgreSQL Runtime Integration Suite (Migration 071)', () => {
  let pg;
  let repo;
  let orchestrator;

  const initialFixturePath = path.resolve('tests/fixtures/delimitation/initial_delimitation_source_fixture.json');
  const changedFixturePath = path.resolve('tests/fixtures/delimitation/changed_delimitation_source_fixture.json');

  before(async () => {
    // 1. Initialize isolated PGlite instance
    pg = new PGlite();

    // 2. Apply migration 071
    const migrationSql = fs.readFileSync(
      path.resolve('supabase/migrations/071_delimitation_watch_engine.sql'),
      'utf8',
    );
    await pg.exec(migrationSql);

    // 3. Instantiate PostgresDelimitationWatchRepository
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

  test('DB-01: Verify all 9 Migration 071 tables exist in PostgreSQL catalog', async () => {
    const res = await pg.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'delimitation_%'
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map((r) => r.table_name);
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
      assert.ok(tableNames.includes(expected), `Table ${expected} must exist in PostgreSQL catalog`);
    }
    assert.equal(tableNames.length, 9, 'Exactly 9 Delimitation Watch engine tables must exist');
  });

  test('DB-02: Stage 1 to 8 execution persists real rows in all 9 PostgreSQL tables', async () => {
    const sourceRegistry = new SourceRegistry(repo);
    const source = await sourceRegistry.registerSource({
      id: 'SRC-PG-001',
      name: 'Postgres Delimitation Test Source',
      publisher: 'ECI Official',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const result = await orchestrator.runPipeline('SRC-PG-001');
    assert.equal(result.outcome, 'SUCCESS');

    // Query each table directly from PostgreSQL
    const srcRow = await pg.query(`SELECT * FROM delimitation_watch_sources WHERE id = 'SRC-PG-001'`);
    assert.equal(srcRow.rows.length, 1);
    assert.equal(srcRow.rows[0].consecutive_failures, 0);

    const snapRow = await pg.query(`SELECT * FROM delimitation_snapshots WHERE source_id = 'SRC-PG-001'`);
    assert.equal(snapRow.rows.length, 1);
    assert.equal(snapRow.rows[0].capture_outcome, 'SUCCESS');

    const candRow = await pg.query(`SELECT * FROM delimitation_candidates WHERE source_id = 'SRC-PG-001'`);
    assert.equal(candRow.rows.length, 1);
    assert.equal(candRow.rows[0].normalized_data_status, 'OFFICIAL');

    const valRow = await pg.query(`SELECT * FROM delimitation_validations WHERE candidate_id = $1`, [result.candidate.id]);
    assert.equal(valRow.rows.length, 1);
    assert.equal(valRow.rows[0].validation_status, 'PASSED');

    const compRow = await pg.query(`SELECT * FROM delimitation_comparisons WHERE candidate_id = $1`, [result.candidate.id]);
    assert.equal(compRow.rows.length, 1);
    assert.equal(compRow.rows[0].is_material_change, true);

    const verRow = await pg.query(`SELECT * FROM delimitation_accepted_versions WHERE source_id = 'SRC-PG-001'`);
    assert.equal(verRow.rows.length, 1);
    assert.equal(verRow.rows[0].data_status, 'OFFICIAL');

    const notifRow = await pg.query(`SELECT * FROM delimitation_notification_events WHERE version_id = $1`, [result.acceptedVersion.id]);
    assert.equal(notifRow.rows.length, 1);
    assert.equal(notifRow.rows[0].dispatch_status, 'SENT');

    const pubRow = await pg.query(`SELECT * FROM delimitation_publications WHERE version_id = $1`, [result.acceptedVersion.id]);
    assert.equal(pubRow.rows.length, 1);
    assert.equal(pubRow.rows[0].publication_status, 'PUBLISHED');

    const runRow = await pg.query(`SELECT * FROM delimitation_watch_runs WHERE source_id = 'SRC-PG-001'`);
    assert.equal(runRow.rows.length, 1);
    assert.equal(runRow.rows[0].outcome, 'SUCCESS');
  });

  test('DB-03: Database UNIQUE constraint on (source_id, content_sha256) rejects duplicate version rows', async () => {
    const existing = (await pg.query(`SELECT * FROM delimitation_accepted_versions LIMIT 1`)).rows[0];
    assert.ok(existing);

    // Attempt direct SQL INSERT violating UNIQUE (source_id, content_sha256)
    await assert.rejects(
      async () => {
        await pg.query(`
          INSERT INTO delimitation_accepted_versions (
            id, source_id, version_tag, snapshot_id, candidate_id,
            validation_id, comparison_id, content_sha256, parser_version,
            data_status, accepted_at, accepted_by
          ) VALUES (
            gen_random_uuid(), $1, 'v-duplicate-tag', $2, $3,
            $4, $5, $6, 'v1.0.0', 'OFFICIAL', now(), 'test'
          );
        `, [
          existing.source_id,
          existing.snapshot_id,
          existing.candidate_id,
          existing.validation_id,
          existing.comparison_id,
          existing.content_sha256, // Duplicate hash!
        ]);
      },
      /unique|uq_delim_accepted_versions_hash/i,
      'PostgreSQL must reject duplicate version with matching source_id and content_sha256',
    );
  });

  test('DB-04: Foreign key ON DELETE RESTRICT prevents deleting source when snapshots exist', async () => {
    await assert.rejects(
      async () => {
        await pg.query(`DELETE FROM delimitation_watch_sources WHERE id = 'SRC-PG-001'`);
      },
      /foreign key|violates foreign key constraint/i,
      'PostgreSQL ON DELETE RESTRICT must prevent orphan deletions',
    );
  });

  test('DB-05: Material change pipeline execution establishes foreign key lineage DAG', async () => {
    // Update source to changed fixture
    await pg.query(`
      UPDATE delimitation_watch_sources
      SET canonical_url = $2
      WHERE id = $1
    `, ['SRC-PG-001', changedFixturePath]);

    const result2 = await orchestrator.runPipeline('SRC-PG-001');
    assert.equal(result2.outcome, 'SUCCESS');

    // Verify lineage in PostgreSQL
    const versions = (await pg.query(`
      SELECT id, version_tag, previous_version_id
      FROM delimitation_accepted_versions
      WHERE source_id = 'SRC-PG-001'
      ORDER BY accepted_at DESC;
    `)).rows;

    assert.equal(versions.length, 2, 'Must have 2 accepted versions in PostgreSQL');
    assert.equal(versions[0].previous_version_id, versions[1].id, 'Version 2 must reference Version 1 as previous_version_id');
  });
});
