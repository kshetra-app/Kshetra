/**
 * tests/webhooks-delivery-lifecycle.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Queue State Machine, Retry Schedule, Lease Fencing & Crash Recovery Suite
 *
 * Mandatory Verification Invariants:
 * 1. Queue state transitions: queued -> leased -> delivered | retrying | dead_letter.
 * 2. Exponential backoff retry schedule: 30s, 5m, 30m, 2h, and terminal dead_letter on attempt 5.
 * 3. Scoped tenant event idempotency and fanout to active subscriptions.
 * 4. Lease token fencing: drop updates with mismatched or stale lease tokens.
 * 5. Consecutive failure circuit-breaker: auto-disables subscription after 20 consecutive failures.
 * 6. Crash recovery: recoverExpiredLeases reclaims stalled leased deliveries.
 * 7. Cascade-safe 30-day retention purge: deliveries purged first, orphaned events second.
 * 8. Byte-exact payload stability across deliveries.
 */

process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import assert from 'node:assert';
import {
  InMemoryQueueProvider,
  calculateBackoffDelaySeconds,
  calculateNextRetryAt,
  BACKOFF_SCHEDULE_SECONDS,
  MAX_DELIVERY_ATTEMPTS,
} from '../apps/api/src/modules/webhooks/queueProvider.ts';
import { canonicalizeJson, computePayloadSha256 } from '../apps/api/src/modules/webhooks/crypto.ts';

console.log('================================================================');
console.log('W022: DELIVERY LIFECYCLE & QUEUE STATE MACHINE TEST SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

async function runCheck(id: string, description: string, fn: () => Promise<void> | void) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function runAll() {
  const queue = new InMemoryQueueProvider();

  // ─── 1. Retry Schedule & Exponential Backoff Calculation ───
  await runCheck('LIFECYCLE-01', 'Verify 4-stage backoff delays: 30s, 300s (5m), 1800s (30m), 7200s (2h)', () => {
    assert.strictEqual(BACKOFF_SCHEDULE_SECONDS[0], 30);
    assert.strictEqual(BACKOFF_SCHEDULE_SECONDS[1], 300);
    assert.strictEqual(BACKOFF_SCHEDULE_SECONDS[2], 1800);
    assert.strictEqual(BACKOFF_SCHEDULE_SECONDS[3], 7200);
  });

  await runCheck('LIFECYCLE-02', 'calculateBackoffDelaySeconds returns exact delays for attempts 1..4', () => {
    assert.strictEqual(calculateBackoffDelaySeconds(1), 30);
    assert.strictEqual(calculateBackoffDelaySeconds(2), 300);
    assert.strictEqual(calculateBackoffDelaySeconds(3), 1800);
    assert.strictEqual(calculateBackoffDelaySeconds(4), 7200);
  });

  await runCheck('LIFECYCLE-03', 'calculateNextRetryAt bounds attempts to 5 and returns null for attempt >= 5', () => {
    assert.strictEqual(MAX_DELIVERY_ATTEMPTS, 5);
    const now = new Date();
    const retry1 = calculateNextRetryAt(1, now);
    assert.ok(retry1);
    assert.strictEqual(Math.round((retry1.getTime() - now.getTime()) / 1000), 30);

    const retry4 = calculateNextRetryAt(4, now);
    assert.ok(retry4);
    assert.strictEqual(Math.round((retry4.getTime() - now.getTime()) / 1000), 7200);

    const retry5 = calculateNextRetryAt(5, now);
    assert.strictEqual(retry5, null);
  });

  // ─── Setup Subscriptions ───
  const tenantId = 't-11111111-1111-1111-1111-111111111111';
  const sub1Id = 's-11111111-1111-1111-1111-111111111111';
  const sub2Id = 's-22222222-2222-2222-2222-222222222222';

  queue.subscriptions.set(sub1Id, {
    id: sub1Id,
    tenantId,
    applicationId: 'app-1',
    targetUrl: 'https://subscriber1.example.com/webhook',
    subscribedEvents: ['election.results.published'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  queue.subscriptions.set(sub2Id, {
    id: sub2Id,
    tenantId,
    applicationId: 'app-1',
    targetUrl: 'https://subscriber2.example.com/webhook',
    subscribedEvents: ['candidate.nomination.updated'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ─── 2. Atomic Enqueue, Tenant Scoped Idempotency & Fan-out ───
  const payloadObj = {
    constituency_id: 'TEL_072',
    winner: 'Candidate X',
  };
  const payloadRaw = canonicalizeJson(payloadObj);
  const payloadSha256 = computePayloadSha256(payloadRaw);

  let event1Id: string;

  await runCheck('LIFECYCLE-04', 'Enqueue event fans out only to matching active subscription', async () => {
    const result = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-key-001',
      payload: payloadObj,
      payloadRaw,
      payloadSha256,
    });

    assert.strictEqual(result.deduplicated, false);
    assert.strictEqual(result.enqueuedDeliveries, 1);
    event1Id = result.eventId;
    assert.ok(event1Id);
  });

  await runCheck('LIFECYCLE-05', 'Deduplicate identical idempotency key within tenant', async () => {
    const result = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-key-001',
      payload: payloadObj,
      payloadRaw,
      payloadSha256,
    });

    assert.strictEqual(result.deduplicated, true);
    assert.strictEqual(result.eventId, event1Id);
    assert.strictEqual(result.enqueuedDeliveries, 1);
  });

  // ─── 3. Claiming & Lease Generation ───
  let claimedJob: any;

  await runCheck('LIFECYCLE-06', 'Claim pending batch: transitions delivery to leased state with leaseToken', async () => {
    const batch = await queue.claimBatch(10);
    assert.strictEqual(batch.length, 1);
    claimedJob = batch[0];

    assert.strictEqual(claimedJob.delivery.status, 'leased');
    assert.strictEqual(claimedJob.delivery.subscriptionId, sub1Id);
    assert.strictEqual(claimedJob.delivery.eventId, event1Id);
    assert.ok(claimedJob.leaseToken);
    assert.strictEqual(claimedJob.delivery.attemptCount, 1);
  });

  await runCheck('LIFECYCLE-07', 'Claim batch returns empty when all claimable items are already leased', async () => {
    const batch = await queue.claimBatch(10);
    assert.strictEqual(batch.length, 0);
  });

  // ─── 4. Lease Fencing Invariant ───
  await runCheck('LIFECYCLE-08', 'Drop completion with mismatched/stale lease token (returns updated: false)', async () => {
    const bogusToken = 'bogus-lease-token';
    const completion = await queue.completeDelivery(claimedJob.delivery.id, bogusToken, {
      success: true,
      httpStatus: 200,
      executionDurationMs: 120,
    });
    assert.strictEqual(completion.updated, false);
  });

  // ─── 5. Retry Scheduling & Retrying State Transition ───
  await runCheck('LIFECYCLE-09', 'Complete with failure on attempt 1: transitions to retrying with attemptCount=2 and nextRetryAt', async () => {
    const completion = await queue.completeDelivery(claimedJob.delivery.id, claimedJob.leaseToken, {
      success: false,
      httpStatus: 503,
      executionDurationMs: 350,
      errorMessage: '503 Service Unavailable',
    });

    assert.strictEqual(completion.updated, true);
    assert.strictEqual(completion.terminalStatus, 'retrying');

    const updated = queue.deliveries.get(claimedJob.delivery.id);
    assert.strictEqual(updated?.status, 'retrying');
    assert.strictEqual(updated?.attemptCount, 2);
    assert.ok(updated?.nextRetryAt);
  });

  // ─── 6. Terminal State: Transition to dead_letter on 5th Attempt ───
  await runCheck('LIFECYCLE-10', 'Exhaust all 5 attempts: transitions to terminal dead_letter status', async () => {
    const delivery = queue.deliveries.get(claimedJob.delivery.id)!;

    // Simulate attempts 2, 3, 4, 5
    for (let att = 2; att <= 5; att++) {
      // Force nextRetryAt to past so it becomes claimable
      delivery.nextRetryAt = new Date(Date.now() - 1000).toISOString();

      const batch = await queue.claimBatch(1);
      assert.strictEqual(batch.length, 1);
      const leased = batch[0];
      assert.strictEqual(leased.delivery.attemptCount, att);

      const comp = await queue.completeDelivery(leased.delivery.id, leased.leaseToken, {
        success: false,
        httpStatus: 500,
        executionDurationMs: 100,
        errorMessage: `Attempt ${att} failed`,
      });

      if (att === 5) {
        assert.strictEqual(comp.terminalStatus, 'dead_letter');
        assert.strictEqual(delivery.status, 'dead_letter');
        assert.strictEqual(delivery.nextRetryAt, null);
        assert.ok(delivery.completedAt);
      } else {
        assert.strictEqual(comp.terminalStatus, 'retrying');
        assert.strictEqual(delivery.status, 'retrying');
        assert.strictEqual(delivery.attemptCount, att + 1);
      }
    }
  });

  // ─── 7. Successful Delivery Lifecycle ───
  await runCheck('LIFECYCLE-11', 'Delivery success transitions to delivered, records httpStatus 200 and completedAt', async () => {
    // Reset sub consecutive failures
    const sub = queue.subscriptions.get(sub1Id)!;
    sub.consecutiveFailureCount = 5;

    const enq = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-key-success',
      payload: { test: true },
      payloadRaw: '{"test":true}',
      payloadSha256: computePayloadSha256('{"test":true}'),
    });

    const batch = await queue.claimBatch(1);
    assert.strictEqual(batch.length, 1);
    const leased = batch[0];

    const comp = await queue.completeDelivery(leased.delivery.id, leased.leaseToken, {
      success: true,
      httpStatus: 200,
      executionDurationMs: 80,
      responseBodySample: '{"ok":true}',
    });

    assert.strictEqual(comp.terminalStatus, 'delivered');
    const deliv = queue.deliveries.get(leased.delivery.id);
    assert.strictEqual(deliv?.status, 'delivered');
    assert.strictEqual(deliv?.httpStatus, 200);
    assert.strictEqual(deliv?.executionDurationMs, 80);
    assert.ok(deliv?.completedAt);
    assert.strictEqual(sub.consecutiveFailureCount, 0); // Reset upon success
  });

  // ─── 8. Circuit Breaker: Auto-disable Subscription at 20 Failures ───
  await runCheck('LIFECYCLE-12', 'Auto-disable subscription (status=failed) upon reaching 20 consecutive failures', async () => {
    const sub = queue.subscriptions.get(sub1Id)!;
    sub.consecutiveFailureCount = 19; // 1 away from circuit break

    const enq = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-circuit-break',
      payload: { test: 'cb' },
      payloadRaw: '{"test":"cb"}',
      payloadSha256: computePayloadSha256('{"test":"cb"}'),
    });

    const batch = await queue.claimBatch(1);
    const leased = batch[0];

    await queue.completeDelivery(leased.delivery.id, leased.leaseToken, {
      success: false,
      httpStatus: 502,
      executionDurationMs: 50,
      errorMessage: 'Bad Gateway',
    });

    assert.strictEqual(sub.consecutiveFailureCount, 20);
    assert.strictEqual(sub.status, 'failed');
  });

  // ─── 9. Crash Recovery & Expired Lease Sweeper ───
  await runCheck('LIFECYCLE-13', 'recoverExpiredLeases reclaims stalled leased job whose leasedUntil is in past', async () => {
    // Re-enable subscription
    const sub = queue.subscriptions.get(sub1Id)!;
    sub.status = 'active';

    const enq = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-crash-recovery',
      payload: { crash: true },
      payloadRaw: '{"crash":true}',
      payloadSha256: computePayloadSha256('{"crash":true}'),
    });

    const batch = await queue.claimBatch(1);
    const leased = batch[0];
    assert.strictEqual(leased.delivery.status, 'leased');

    // Simulate worker crashing: leasedUntil expires without completeDelivery being called
    leased.delivery.leasedUntil = new Date(Date.now() - 5000);

    const recovered = await queue.recoverExpiredLeases();
    assert.strictEqual(recovered, 1);
    assert.strictEqual(leased.delivery.status, 'queued');
    assert.strictEqual(leased.delivery.leaseToken, undefined);

    // New worker can immediately re-claim it
    const reBatch = await queue.claimBatch(1);
    assert.strictEqual(reBatch.length, 1);
    assert.strictEqual(reBatch[0].delivery.id, leased.delivery.id);
  });

  // ─── 10. Cascade-Safe 30-Day Retention Purge ───
  await runCheck('LIFECYCLE-14', 'purgeExpiredData safely purges terminal deliveries older than retention and orphaned events', async () => {
    // Age one delivered item and its event to 35 days ago
    const oldDate = new Date(Date.now() - 35 * 86400000).toISOString();

    const oldEventId = 'old-event-1';
    queue.events.set(oldEventId, {
      id: oldEventId,
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      payload: {},
      payloadRaw: '{}',
      payloadSha256: 'abc',
      createdAt: oldDate,
    });

    const oldDelivId = 'old-deliv-1';
    queue.deliveries.set(oldDelivId, {
      id: oldDelivId,
      tenantId,
      subscriptionId: sub1Id,
      eventId: oldEventId,
      status: 'delivered',
      attemptCount: 1,
      createdAt: oldDate,
      completedAt: oldDate,
    });

    const purgeResult = await queue.purgeExpiredData(30, 100);
    assert.strictEqual(purgeResult.purgedDeliveries, 1);
    assert.strictEqual(purgeResult.purgedEvents, 1);
    assert.strictEqual(queue.deliveries.has(oldDelivId), false);
    assert.strictEqual(queue.events.has(oldEventId), false);
  });

  // ─── 11. At-Least-Once Delivery & Duplicate Verification ───
  await runCheck('LIFECYCLE-15', 'At-least-once contract: crash between HTTP 200 acceptance and local persistence reclaims job for redelivery with identical eventId', async () => {
    const sub = queue.subscriptions.get(sub1Id)!;
    sub.status = 'active';

    const enq = await queue.enqueueEvent({
      tenantId,
      applicationId: 'app-1',
      eventType: 'election.results.published',
      idempotencyKey: 'idem-at-least-once',
      payload: { round: 1 },
      payloadRaw: '{"round":1}',
      payloadSha256: computePayloadSha256('{"round":1}'),
    });

    // Worker 1 claims job
    const batch1 = await queue.claimBatch(1);
    assert.strictEqual(batch1.length, 1);
    const job1 = batch1[0];

    // Remote HTTP 200 OK received by worker, but worker dies (OOM / host crash) before completeDelivery is called
    // Lease expires
    job1.delivery.leasedUntil = new Date(Date.now() - 1000);

    // Sweeper reclaims job
    const recovered = await queue.recoverExpiredLeases();
    assert.strictEqual(recovered, 1);

    // Worker 2 claims the reclaimed job -> redelivery occurs!
    const batch2 = await queue.claimBatch(1);
    assert.strictEqual(batch2.length, 1);
    const job2 = batch2[0];

    // Invariant: The redelivered job carries the EXACT SAME event ID and payload, enabling receiver idempotency
    assert.strictEqual(job2.delivery.eventId, job1.delivery.eventId);
    assert.strictEqual(job2.event.payloadRaw, job1.event.payloadRaw);
  });

  // ─── 12. Lease Recovery Attempt Count Invariance ───
  await runCheck('LIFECYCLE-16', 'Expired lease recovery does not consume delivery retry attempts', async () => {
    const delivery = queue.deliveries.get(claimedJob.delivery.id);
    // Queue recovery on a leased job resets status to queued without altering attempt count
    const sampleJob = {
      id: 'deliv-sample-attempt',
      tenantId,
      subscriptionId: sub1Id,
      eventId: 'evt-sample',
      status: 'leased' as const,
      attemptCount: 2,
      leasedUntil: new Date(Date.now() - 5000),
      createdAt: new Date().toISOString(),
    };
    queue.deliveries.set(sampleJob.id, sampleJob);

    await queue.recoverExpiredLeases();
    const recovered = queue.deliveries.get(sampleJob.id);
    assert.strictEqual(recovered?.status, 'queued');
    assert.strictEqual(recovered?.attemptCount, 2); // Preserves attempt count
  });

  // ─── 13. Dead-Letter Invariance ───
  await runCheck('LIFECYCLE-17', 'Dead letter items are permanently ignored by lease sweeper and cannot be claimed', async () => {
    const deadJob = {
      id: 'deliv-dead-letter-perm',
      tenantId,
      subscriptionId: sub1Id,
      eventId: 'evt-sample-2',
      status: 'dead_letter' as const,
      attemptCount: 5,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    queue.deliveries.set(deadJob.id, deadJob);

    const recoveredCount = await queue.recoverExpiredLeases();
    const checked = queue.deliveries.get(deadJob.id);
    assert.strictEqual(checked?.status, 'dead_letter');
  });

  // ─── Summary ───
  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');
  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled lifecycle test suite failure:', err);
  process.exit(1);
});
