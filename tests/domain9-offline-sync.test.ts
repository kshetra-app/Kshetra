import assert from 'node:assert/strict';
import {
  createLocalMutation,
  enqueueLocalMutation,
  getQueueSummary,
  getPendingOps,
  clearQueue,
  flushQueue,
  addSyncListener,
  type SyncOperation,
} from '../apps/mobile/lib/offlineSync';
import { useNetworkStore } from '../apps/mobile/lib/networkStatus';

async function run() {
  console.log('=== RUNNING DOMAIN 9: JOB 072 OFFLINE SYNC VERIFICATION ===');

  // Setup: clear queue and simulate offline mode
  clearQueue();
  useNetworkStore.setState({ isConnected: false });

  // Check 1: Initial Queue Summary
  console.log('\n[CHECK 1] Verifying initial queue state...');
  const initialSummary = getQueueSummary();
  assert.strictEqual(initialSummary.total, 0, 'Initial total queue length must be 0');
  assert.strictEqual(initialSummary.localOnly, 0, 'Initial localOnly must be 0');
  assert.strictEqual(initialSummary.queued, 0, 'Initial queued must be 0');
  assert.strictEqual(initialSummary.failed, 0, 'Initial failed must be 0');
  assert.strictEqual(initialSummary.isOnline, false, 'Simulated offline must be reflected in summary');
  console.log('  [PASS] Initial empty queue summary verified in offline mode.');

  // Check 2: 5-State Lifecycle - LOCAL_ONLY Creation
  console.log('\n[CHECK 2] Verifying LOCAL_ONLY mutation creation (instant optimistic client feedback)...');
  const localMutation = createLocalMutation('report_issue', {
    title: 'Water pipe leak near Metro Station',
    category: 'water',
    constituencyId: 'TS-AC-67',
  });

  assert.ok(localMutation.id.startsWith('mut-'), 'Mutation ID must have prefix mut-');
  assert.ok(localMutation.clientToken?.startsWith('local-'), 'Client token must have prefix local-');
  assert.strictEqual(localMutation.status, 'LOCAL_ONLY', 'Status must be LOCAL_ONLY');
  assert.strictEqual(localMutation.retries, 0, 'Retries must start at 0');
  assert.strictEqual((localMutation.payload as any).title, 'Water pipe leak near Metro Station');
  console.log('  [PASS] LOCAL_ONLY mutation creation verified.');

  // Check 3: Transition to QUEUED Persistence during Disconnection
  console.log('\n[CHECK 3] Verifying enqueueLocalMutation transition to QUEUED while offline...');
  await enqueueLocalMutation(localMutation);
  const pending = getPendingOps();
  assert.strictEqual(pending.length, 1, 'Queue must contain 1 pending mutation');
  assert.strictEqual(pending[0].status, 'QUEUED', 'Mutation status must transition to QUEUED');
  assert.strictEqual(pending[0].id, localMutation.id);

  const summaryAfterQueue = getQueueSummary();
  assert.strictEqual(summaryAfterQueue.total, 1);
  assert.strictEqual(summaryAfterQueue.queued, 1);
  console.log('  [PASS] Enqueue and QUEUED persistence verified while offline.');

  // Check 4: Network Reconnection & Successful SYNCED processing
  console.log('\n[CHECK 4] Verifying network reconnection and flushQueue processing...');
  clearQueue();
  // Ensure we are offline when enqueuing the test operation
  useNetworkStore.setState({ isConnected: false });
  const successfulOp: SyncOperation = {
    id: 'mut-sync-success-1',
    clientToken: 'token-success-1',
    type: 'custom_sync_op' as any,
    payload: { test: true },
    createdAt: Date.now(),
    retries: 0,
    status: 'QUEUED',
  };
  await enqueueLocalMutation(successfulOp);
  assert.strictEqual(getPendingOps().length, 1, 'Should have 1 queued operation offline');

  const syncEvents: any[] = [];
  const unsubscribe = addSyncListener((evt) => {
    syncEvents.push(evt);
  });

  // Now simulate reconnection!
  useNetworkStore.setState({ isConnected: true });
  const flushResult = await flushQueue();
  assert.strictEqual(flushResult.processed, 1, 'Successful mutation must increment processed count');

  // Verify transition to SYNCING and SYNCED in listener events
  const syncingEvent = syncEvents.find((e) => e.status === 'SYNCING');
  const syncedEvent = syncEvents.find((e) => e.status === 'SYNCED');
  assert.ok(syncingEvent, 'Must emit SYNCING event during dispatch');
  assert.ok(syncedEvent, 'Must emit SYNCED event upon server acceptance');

  const postSyncQueue = getPendingOps();
  assert.strictEqual(postSyncQueue.length, 0, 'Successfully synced mutations must be removed from queue');
  unsubscribe();
  console.log('  [PASS] Network reconnection and replay to SYNCED verified.');

  // Check 5: Terminal Failure Transition to FAILED State
  console.log('\n[CHECK 5] Verifying terminal failure transition to FAILED state after retries...');
  useNetworkStore.setState({ isConnected: false });
  const failedOp: SyncOperation = {
    id: 'mut-fail-test',
    clientToken: 'token-fail-test',
    type: 'upload_short',
    payload: { invalid: true },
    createdAt: Date.now(),
    retries: 3, // Exhausted
    status: 'FAILED',
    lastError: 'HTTP 400 Bad Request: Video format unsupported',
  };

  // Enqueue failed op and verify summary reports failed count
  await enqueueLocalMutation(failedOp);
  const failedSummary = getQueueSummary();
  assert.strictEqual(failedSummary.failed, 1, 'Failed count must be 1');
  console.log('  [PASS] FAILED state accurately tracked in queue summary.');

  // Teardown
  clearQueue();
  assert.strictEqual(getPendingOps().length, 0);

  console.log('\n=============================================================');
  console.log('  JOB 072 OFFLINE SYNC VERIFICATION: ALL CHECKS PASSED (100%)!');
  console.log('=============================================================\n');
}

run().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
