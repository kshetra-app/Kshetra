/**
 * Mobile SQLite Offline Sync Engine Behavioral Test Battery
 * Validates CRIT-I01-01 / REQ-SYS-001 (Task W021.5-I-01)
 * Master Execution Framework Amendment v1.6 / Rule IV-001
 */

import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.env.TSX_BOOTSTRAPPED) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_BOOTSTRAPPED: '1' }
  });
  process.exit(result.status ?? 0);
}

const { describe, it } = await import('node:test');
const assert = (await import('node:assert')).default;

const { MemorySqliteAdapter } = await import('../apps/mobile/lib/database/memoryAdapter.ts');
const { MigrationRunner } = await import('../apps/mobile/lib/database/migrations.ts');
const { MutationQueue } = await import('../apps/mobile/lib/sync/mutationQueue.ts');
const { ConflictResolver } = await import('../apps/mobile/lib/sync/conflictResolver.ts');
const { SyncEngine } = await import('../apps/mobile/lib/sync/syncEngine.ts');

describe('CRIT-I01-01: Mobile SQLite Offline Persistence & Synchronization Engine', () => {
  it('Test 1: Fresh Installation & Schema Migration Execution', () => {
    const adapter = new MemorySqliteAdapter();
    const runner = new MigrationRunner(adapter);
    
    const status = runner.migrateToLatest();
    assert.strictEqual(status.currentVersion, 2, 'Must migrate to version 2');
    assert.strictEqual(status.appliedCount, 2, 'Must apply exactly 2 migrations');
    
    // Idempotent rerun
    const status2 = runner.migrateToLatest();
    assert.strictEqual(status2.appliedCount, 0, 'Second run must apply 0 migrations');
    assert.strictEqual(status2.currentVersion, 2, 'Version remains 2');
  });

  it('Test 2: Durable Mutation Enqueue and Queue Ordering', () => {
    const adapter = new MemorySqliteAdapter();
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
  });

  it('Test 3: Idempotency Key Replay Protection', () => {
    const adapter = new MemorySqliteAdapter();
    const engine = new SyncEngine(adapter);

    engine.enqueueMutation({
      id: 'mut_unique_1',
      idempotencyKey: 'idemp_dup_check',
      opType: 'react_post',
      entityType: 'feed_post',
      entityId: 'post_abc',
      payload: { reaction: 'LIKE' }
    });

    // Attempting to enqueue duplicate idempotency key must fail closed
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
      /UNIQUE constraint failed/,
      'Duplicate idempotency key must be rejected'
    );
  });

  it('Test 4: Successful Sync Dispatch & State Transitions', async () => {
    const adapter = new MemorySqliteAdapter();
    const engine = new SyncEngine(adapter);

    engine.enqueueMutation({
      id: 'mut_sync_1',
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
    assert.strictEqual(result.succeeded, 1);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(dispatched.length, 1);
    assert.strictEqual(dispatched[0], 'mut_sync_1');

    const stats = engine.getQueueStats();
    assert.strictEqual(stats.pending, 0);
    assert.strictEqual(stats.synced, 1);
    assert.strictEqual(engine.getState(), 'SYNCED');
  });

  it('Test 5: Server Rejection & Dead-Letter Transition on Max Retries', async () => {
    const adapter = new MemorySqliteAdapter();
    const engine = new SyncEngine(adapter, { maxRetries: 2 });

    engine.enqueueMutation({
      id: 'mut_fail_1',
      opType: 'endorse_aspirant',
      entityType: 'aspirant',
      entityId: 'asp_99',
      payload: { aspirantId: 'asp_99' }
    });

    engine.setDispatchHandler(async () => {
      return { success: false, error: 'Simulated 500 Server Error' };
    });

    // First attempt -> retry count 1, state still PENDING
    const res1 = await engine.syncPendingMutations();
    assert.strictEqual(res1.failed, 1);
    assert.strictEqual(res1.deadLettered, 0);
    let stats = engine.getQueueStats();
    assert.strictEqual(stats.pending, 1);

    // Second attempt -> retry count 2 >= maxRetries (2) -> DEAD_LETTER
    const res2 = await engine.syncPendingMutations();
    assert.strictEqual(res2.deadLettered, 1);
    stats = engine.getQueueStats();
    assert.strictEqual(stats.pending, 0);
    assert.strictEqual(stats.deadLetter, 1);
  });

  it('Test 6: Conflict Resolution with Tombstone Precedence & LWW', () => {
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

  it('Test 7: Entity Reconcile and Local SQLite Cache Update', () => {
    const adapter = new MemorySqliteAdapter();
    const engine = new SyncEngine(adapter);

    engine.setCachedEntity('user_profile', 'u_101', { name: 'Local Old Name' }, 1);

    // Incoming server entity with newer timestamp
    const serverUpdate = {
      name: 'Server New Name',
      version: 2,
      updatedAt: new Date(Date.now() + 10000).toISOString()
    };

    const recon = engine.reconcileEntity('user_profile', 'u_101', serverUpdate);
    assert.strictEqual(recon.isLocalWinner, false);
    assert.strictEqual(recon.action, 'UPDATED_FROM_SERVER');

    const cached = engine.getCachedEntity('user_profile', 'u_101');
    assert.strictEqual(cached?.data?.name, 'Server New Name');
    assert.strictEqual(cached?.version, 2);
  });

  it('Test 8: App Restart Persistence Simulation', () => {
    const adapter = new MemorySqliteAdapter();
    
    // First session: enqueue 3 items
    const engine1 = new SyncEngine(adapter);
    engine1.enqueueMutation({ opType: 'op1', entityType: 't1', entityId: 'e1', payload: { a: 1 } });
    engine1.enqueueMutation({ opType: 'op2', entityType: 't1', entityId: 'e2', payload: { a: 2 } });
    engine1.enqueueMutation({ opType: 'op3', entityType: 't1', entityId: 'e3', payload: { a: 3 } });

    assert.strictEqual(engine1.getQueueStats().pending, 3);

    // Simulate app restart by instantiating new SyncEngine on the same adapter instance
    const engine2 = new SyncEngine(adapter);
    const stats2 = engine2.getQueueStats();
    assert.strictEqual(stats2.pending, 3, 'All pending operations must survive restart');
  });
});
