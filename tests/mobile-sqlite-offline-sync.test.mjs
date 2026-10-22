/**
 * Mobile SQLite Offline Sync Engine Behavioral Test Battery
 * Validates CRIT-I01-01 / REQ-SYS-001 (Task W021.5-I-01)
 * Validates persistent disk SQLite, schema evolution, restart durability,
 * fail-closed dispatch, interruption recovery, and conflict resolution.
 * Master Execution Framework Amendment v1.6 / Rule IV-001 / CTO Directive 138
 */

import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

if (!process.env.TSX_BOOTSTRAPPED) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_BOOTSTRAPPED: '1' }
  });
  process.exit(result.status ?? 0);
}

const { describe, it, before, after } = await import('node:test');
const assert = (await import('node:assert')).default;

const { BetterSqliteAdapter } = await import('../apps/mobile/lib/database/betterSqliteAdapter.ts');
const { MigrationRunner } = await import('../apps/mobile/lib/database/migrations.ts');
const { MutationQueue } = await import('../apps/mobile/lib/sync/mutationQueue.ts');
const { ConflictResolver } = await import('../apps/mobile/lib/sync/conflictResolver.ts');
const { SyncEngine } = await import('../apps/mobile/lib/sync/syncEngine.ts');

const TEST_DB_PATH = path.resolve(process.cwd(), 'tests', '.tmp_test_offline_sync.db');

function cleanupDbFile() {
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${TEST_DB_PATH}${ext}`;
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

describe('CRIT-I01-01: Mobile SQLite Offline Persistence & Synchronization Engine (CTO Directive 138)', () => {
  before(() => {
    cleanupDbFile();
  });

  after(() => {
    cleanupDbFile();
  });

  it('Test 1: Fresh Installation & Schema Migration Execution on Persistent Disk SQLite', () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const runner = new MigrationRunner(adapter);
    
    const status = runner.migrateToLatest();
    assert.strictEqual(status.currentVersion, 2, 'Must migrate to version 2 on disk');
    assert.strictEqual(status.appliedCount, 2, 'Must apply exactly 2 migrations');
    
    // Verify tables actually exist on disk in SQLite sqlite_master
    const tables = adapter.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );
    const tableNames = tables.map(t => t.name);
    assert(tableNames.includes('sync_mutation_queue'), 'sync_mutation_queue table must exist on disk');
    assert(tableNames.includes('cached_entities'), 'cached_entities table must exist on disk');
    assert(tableNames.includes('_migrations'), '_migrations table must exist on disk');

    // Idempotent rerun
    const status2 = runner.migrateToLatest();
    assert.strictEqual(status2.appliedCount, 0, 'Second run must apply 0 migrations');
    assert.strictEqual(status2.currentVersion, 2, 'Version remains 2');

    adapter.closeSync();
  });

  it('Test 2: Schema Migration from Earlier Version (v1 to v2 Evolution)', async () => {
    const v1DbPath = path.resolve(process.cwd(), 'tests', '.tmp_test_v1_migration.db');
    for (const ext of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(`${v1DbPath}${ext}`); } catch {}
    }
    try {
      const adapter = new BetterSqliteAdapter(v1DbPath);
      // Apply only v1 schema
      const { MIGRATIONS } = await import('../apps/mobile/lib/database/schema.ts');
      for (const ddl of MIGRATIONS[0].up) {
        adapter.execSync(ddl);
      }
      adapter.runSync('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?);', [1, MIGRATIONS[0].name, '2026-10-01T00:00:00Z']);

      const runner = new MigrationRunner(adapter);
      const initialApplied = runner.getAppliedVersions();
      assert.strictEqual(initialApplied.has(1), true, 'Initial version 1 applied');
      assert.strictEqual(initialApplied.has(2), false, 'Version 2 not yet applied');

      // Migrate to latest
      const migrationResult = runner.migrateToLatest();
      assert.strictEqual(migrationResult.appliedCount, 1, 'Must apply exactly 1 pending migration (v2)');
      assert.strictEqual(migrationResult.currentVersion, 2, 'Must reach current version 2');

      adapter.closeSync();
    } finally {
      for (const ext of ['', '-wal', '-shm']) {
        const f = `${v1DbPath}${ext}`;
        if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
      }
    }
  });

  it('Test 3: Durable Mutation Enqueue & Ordering on Disk SQLite', () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const engine = new SyncEngine(adapter);

    const op1 = engine.enqueueMutation({
      id: 'mut_001',
      idempotencyKey: 'idemp_001',
      opType: 'upvote_issue',
      entityType: 'civic_issue',
      entityId: 'issue_123',
      payload: { issueId: 'issue_123', weight: 1 }
    });

    const op2 = engine.enqueueMutation({
      id: 'mut_002',
      idempotencyKey: 'idemp_002',
      opType: 'follow_issue',
      entityType: 'civic_issue',
      entityId: 'issue_123',
      payload: { issueId: 'issue_123', follow: true }
    });

    assert.strictEqual(op1.state, 'PENDING');
    assert.strictEqual(op2.state, 'PENDING');

    const stats = engine.getQueueStats();
    assert.strictEqual(stats.pending, 2, 'Should have 2 pending mutations');
    assert.strictEqual(stats.total, 2);

    adapter.closeSync();
  });

  it('Test 4: Idempotency Key Replay Protection (Disk Enforced)', () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const engine = new SyncEngine(adapter);

    engine.enqueueMutation({
      id: 'mut_unique_1',
      idempotencyKey: 'idemp_dup_check',
      opType: 'react_post',
      entityType: 'feed_post',
      entityId: 'post_abc',
      payload: { reaction: 'LIKE' }
    });

    // Attempting to enqueue duplicate idempotency key must fail closed with SQLite UNIQUE constraint violation
    assert.throws(
      () => {
        engine.enqueueMutation({
          id: 'mut_unique_2',
          idempotencyKey: 'idemp_dup_check',
          opType: 'react_post',
          entityType: 'feed_post',
          entityId: 'post_abc',
          payload: { reaction: 'LOVE' }
        });
      },
      /UNIQUE constraint failed/i,
      'Duplicate idempotency key must be rejected by SQLite table constraint'
    );

    adapter.closeSync();
  });

  it('Test 5: App Restart Persistence Across Actual Process Close & Reopen', () => {
    // Phase A: Open DB, enqueue mutations, write cached entities, then close connection
    {
      const adapterA = new BetterSqliteAdapter(TEST_DB_PATH);
      const engineA = new SyncEngine(adapterA);

      engineA.enqueueMutation({
        id: 'mut_restart_1',
        idempotencyKey: 'idemp_restart_1',
        opType: 'save_bookmark',
        entityType: 'candidate',
        entityId: 'cand_999',
        payload: { note: 'Important candidate for constituency' }
      });

      engineA.setCachedEntity('voter_preferences', 'user_777', { theme: 'dark', language: 'te' }, 1);

      // Verify before close
      assert.strictEqual(engineA.getCachedEntity('voter_preferences', 'user_777')?.data?.theme, 'dark');

      // Literally close database handle
      adapterA.closeSync();
    }

    // Phase B: Open entirely new connection to the file and verify persistence from disk
    {
      const adapterB = new BetterSqliteAdapter(TEST_DB_PATH);
      const engineB = new SyncEngine(adapterB);

      const cached = engineB.getCachedEntity('voter_preferences', 'user_777');
      assert.notStrictEqual(cached, null, 'Cached entity must persist across close and reopen');
      assert.strictEqual(cached?.data?.theme, 'dark');
      assert.strictEqual(cached?.data?.language, 'te');
      assert.strictEqual(cached?.version, 1);

      const stats = engineB.getQueueStats();
      assert(stats.pending >= 3, `Queued mutations must persist across database reopen (found ${stats.pending})`);

      // Verify specific persisted mutation row from disk
      const queueRow = adapterB.getFirstSync(
        "SELECT id, payload FROM sync_mutation_queue WHERE id = 'mut_restart_1';"
      );
      assert.notStrictEqual(queueRow, null, 'Enqueued mutation mut_restart_1 must exist in reopened SQLite file');
      const parsed = JSON.parse(queueRow.payload);
      assert.strictEqual(parsed.note, 'Important candidate for constituency');

      adapterB.closeSync();
    }
  });

  it('Test 6: Interruption Recovery (Restores IN_FLIGHT to PENDING on Boot)', () => {
    // Simulate process termination during mid-sync: write an operation in IN_FLIGHT
    {
      const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
      adapter.runSync(
        `INSERT INTO sync_mutation_queue (
          id, idempotency_key, op_type, entity_type, entity_id, payload,
          state, retry_count, max_retries, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          'mut_interrupted',
          'idemp_interrupted',
          'submit_feedback',
          'feedback',
          'fb_1',
          JSON.stringify({ text: 'Interrupted mutation' }),
          'IN_FLIGHT', // Left in flight due to simulated crash
          0,
          5,
          null,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      adapter.closeSync();
    }

    // Boot a new SyncEngine instance: its constructor must call recoverInFlight()
    {
      const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
      const engine = new SyncEngine(adapter);

      const row = adapter.getFirstSync(
        "SELECT state FROM sync_mutation_queue WHERE id = 'mut_interrupted';"
      );
      assert.strictEqual(row?.state, 'PENDING', 'Interrupted mutation in IN_FLIGHT must be safely recovered to PENDING');

      adapter.closeSync();
    }
  });

  it('Test 7: Unconfigured Dispatch Handler Fails Closed (No False Success)', async () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const engine = new SyncEngine(adapter);

    engine.enqueueMutation({
      id: 'mut_no_dispatch',
      idempotencyKey: 'idemp_no_dispatch',
      opType: 'unfollow_entity',
      entityType: 'politician',
      entityId: 'pol_1',
      payload: { unfollow: true }
    });

    // Do NOT set a dispatch handler
    const result = await engine.syncPendingMutations();

    // Must fail closed: 0 succeeded, error reported
    assert.strictEqual(result.succeeded, 0, 'Must NOT mark operations as synced without dispatch handler');
    assert.strictEqual(result.totalProcessed, 0);
    assert(result.errors.length > 0, 'Must report dispatch handler missing error');
    assert.strictEqual(result.errors[0].id, 'DISPATCH_HANDLER_MISSING');
    assert.strictEqual(engine.getState(), 'ERROR');

    // The mutation must remain PENDING in the SQLite queue
    const op = adapter.getFirstSync(
      "SELECT state FROM sync_mutation_queue WHERE id = 'mut_no_dispatch';"
    );
    assert.strictEqual(op?.state, 'PENDING', 'Operation must remain PENDING in SQLite when dispatch handler is absent');

    adapter.closeSync();
  });

  it('Test 8: Successful Sync Dispatch & State Transitions', async () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const engine = new SyncEngine(adapter);

    engine.enqueueMutation({
      id: 'mut_sync_verified',
      idempotencyKey: 'idemp_sync_verified',
      opType: 'mark_notification_read',
      entityType: 'notification',
      entityId: 'notif_1',
      payload: { id: 'notif_1' }
    });

    const dispatched = [];
    engine.setDispatchHandler(async (op) => {
      dispatched.push(op.id);
      return { success: true };
    });

    const result = await engine.syncPendingMutations();
    assert(result.succeeded >= 1, 'At least 1 operation must succeed');
    assert(dispatched.includes('mut_sync_verified'));

    const row = adapter.getFirstSync(
      "SELECT state FROM sync_mutation_queue WHERE id = 'mut_sync_verified';"
    );
    assert.strictEqual(row?.state, 'SYNCED', 'Successfully dispatched mutation must transition to SYNCED in SQLite');

    adapter.closeSync();
  });

  it('Test 9: Server Rejection & Dead-Letter Transition on Max Retries', async () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    // Use queue with maxRetries: 2 for deterministic dead-letter testing
    const engine = new SyncEngine(adapter, { maxRetries: 2 });

    engine.enqueueMutation({
      id: 'mut_server_fail',
      idempotencyKey: 'idemp_server_fail',
      opType: 'endorse_aspirant',
      entityType: 'aspirant',
      entityId: 'asp_99',
      payload: { aspirantId: 'asp_99' }
    });

    engine.setDispatchHandler(async () => {
      return { success: false, error: 'HTTP 500: Database connection failure' };
    });

    // Attempt 1 -> retry count 1, state PENDING
    const res1 = await engine.syncPendingMutations();
    assert(res1.failed >= 1);
    let row = adapter.getFirstSync(
      "SELECT state, retry_count FROM sync_mutation_queue WHERE id = 'mut_server_fail';"
    );
    assert.strictEqual(row?.state, 'PENDING');
    assert.strictEqual(row?.retry_count, 1);

    // Attempt 2 -> retry count 2 >= maxRetries (2) -> DEAD_LETTER
    const res2 = await engine.syncPendingMutations();
    assert(res2.deadLettered >= 1);
    row = adapter.getFirstSync(
      "SELECT state, retry_count, error_message FROM sync_mutation_queue WHERE id = 'mut_server_fail';"
    );
    assert.strictEqual(row?.state, 'DEAD_LETTER', 'Exceeded retries must transition to DEAD_LETTER');
    assert.strictEqual(row?.retry_count, 2);
    assert(row?.error_message?.includes('HTTP 500'));

    adapter.closeSync();
  });

  it('Test 10: Server Response Validation & Authorization Failure Rejection', async () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const engine = new SyncEngine(adapter, { maxRetries: 3 });

    engine.enqueueMutation({
      id: 'mut_auth_fail',
      idempotencyKey: 'idemp_auth_fail',
      opType: 'delete_account',
      entityType: 'user',
      entityId: 'u_99',
      payload: { confirmed: true }
    });

    // Server returns 401 Unauthorized
    engine.setDispatchHandler(async () => {
      return { success: false, error: 'HTTP 401: Unauthorized - Bearer token expired' };
    });

    const res = await engine.syncPendingMutations();
    assert(res.failed >= 1);
    assert.strictEqual(res.succeeded, 0, '401 response must never be marked as synced');

    const row = adapter.getFirstSync(
      "SELECT state, error_message FROM sync_mutation_queue WHERE id = 'mut_auth_fail';"
    );
    assert.strictEqual(row?.state, 'PENDING');
    assert(row?.error_message?.includes('401: Unauthorized'));

    adapter.closeSync();
  });

  it('Test 11: Conflict Resolution with Tombstone Precedence & LWW', () => {
    const resolver = new ConflictResolver('LAST_WRITE_WINS');

    // Case A: Local Tombstone Precedence (Local Deleted vs Server Live)
    const resA = resolver.resolve(
      { version: 1, updatedAt: '2026-10-22T10:00:00Z', isDeleted: true },
      { version: 2, updatedAt: '2026-10-22T10:05:00Z', isDeleted: false }
    );
    assert.strictEqual(resA.isLocalWinner, true, 'Local deletion must take precedence');
    assert.strictEqual(resA.reason, 'LOCAL_TOMBSTONE_PRECEDENCE');

    // Case B: Server newer timestamp wins
    const resB = resolver.resolve(
      { version: 1, updatedAt: '2026-10-22T10:00:00Z' },
      { version: 1, updatedAt: '2026-10-22T10:10:00Z' }
    );
    assert.strictEqual(resB.isLocalWinner, false, 'Newer server timestamp must win');

    // Case C: Local newer timestamp wins
    const resC = resolver.resolve(
      { version: 1, updatedAt: '2026-10-22T10:15:00Z' },
      { version: 1, updatedAt: '2026-10-22T10:05:00Z' }
    );
    assert.strictEqual(resC.isLocalWinner, true, 'Newer local timestamp must win');
  });

  it('Test 12: Corrupted Persisted Payloads Safe Handling', () => {
    const adapter = new BetterSqliteAdapter(TEST_DB_PATH);
    const queue = new MutationQueue(adapter);

    // Directly insert a corrupted JSON payload into the SQLite table
    adapter.runSync(
      `INSERT INTO sync_mutation_queue (
        id, idempotency_key, op_type, entity_type, entity_id, payload,
        state, retry_count, max_retries, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        'mut_corrupted',
        'idemp_corrupted',
        'update_pref',
        'user_pref',
        'up_1',
        '{ invalid json: syntax error! ',
        'PENDING',
        0,
        5,
        null,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Reading pending operations must not crash with SyntaxError
    const pending = queue.getPending();
    const corruptedOp = pending.find(p => p.id === 'mut_corrupted');
    assert.notStrictEqual(corruptedOp, undefined, 'Corrupted op must be retrievable');
    assert.deepStrictEqual(corruptedOp?.payload, {}, 'Corrupted payload must fall back to empty object safely');

    adapter.closeSync();
  });
});
