import {
  InMemoryQueueProvider,
  parseBytea,
  calculateBackoffDelaySeconds,
  calculateNextRetryAt,
  RETRY_INTERVALS_SECONDS,
  MAX_DELIVERY_ATTEMPTS,
} from '../modules/webhooks/queueProvider';
import type { EnqueueEventParams } from '../modules/webhooks/queueProvider';
import type { WebhookSubscriptionModel } from '../modules/webhooks/schemas';
import type { DispatchResult } from '../modules/webhooks/webhookDispatcher';

const baseParams: EnqueueEventParams = {
  tenantId: 'tenant-1', applicationId: 'app-1', eventType: 'test.ping', idempotencyKey: 'key-1',
  payload: { message: 'hello' }, payloadRaw: '{"message":"hello"}', payloadSha256: 'digest',
};

function subscription(overrides: Partial<WebhookSubscriptionModel> = {}): WebhookSubscriptionModel {
  return {
    id: 'sub-1', tenantId: 'tenant-1', applicationId: 'app-1', endpointUrl: 'https://example.test',
    secretHint: '12345678', secretHash: 'hash', subscribedEvents: ['*'], status: 'active',
    consecutiveFailureCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
const success: DispatchResult = {
  success: true, httpStatus: 204, executionDurationMs: 5, requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
};
const failure: DispatchResult = {
  success: false, httpStatus: 503, executionDurationMs: 5, requestHeaders: {}, responseHeaders: {},
  responseBodySample: '', errorMessage: 'HTTP_STATUS_503',
};

describe('webhook queue provider helpers', () => {
  it('parses buffers, typed arrays, prefixed hex and plain hex bytea', () => {
    const bytes = Buffer.from('cafe', 'hex');
    expect(parseBytea(bytes)).toBe(bytes);
    expect(parseBytea(new Uint8Array([1, 2]))).toEqual(Buffer.from([1, 2]));
    expect(parseBytea('\\\\xcafe')).toEqual(bytes);
    expect(parseBytea('0xcafe')).toEqual(bytes);
    expect(parseBytea('cafe')).toEqual(bytes);
  });

  it('rejects unsupported bytea values', () => {
    expect(() => parseBytea(12)).toThrow('INVALID_BYTEA');
    expect(() => parseBytea(null)).toThrow('INVALID_BYTEA');
  });

  it('calculates bounded exponential retry intervals and terminal attempt behavior', () => {
    expect(RETRY_INTERVALS_SECONDS).toEqual([30, 300, 1800, 7200]);
    expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
    expect(calculateBackoffDelaySeconds(1)).toBe(30);
    expect(calculateBackoffDelaySeconds(2)).toBe(300);
    expect(calculateBackoffDelaySeconds(4)).toBe(7200);
    expect(calculateBackoffDelaySeconds(5)).toBe(7200);
    expect(calculateBackoffDelaySeconds(0)).toBe(7200);
    const base = new Date('2026-01-01T00:00:00.000Z');
    expect(calculateNextRetryAt(1, base)?.toISOString()).toBe('2026-01-01T00:00:30.000Z');
    expect(calculateNextRetryAt(4, base)?.toISOString()).toBe('2026-01-01T02:00:00.000Z');
    expect(calculateNextRetryAt(5, base)).toBeNull();
  });
});

describe('in-memory webhook queue state machine', () => {
  let queue: InMemoryQueueProvider;
  beforeEach(() => {
    queue = new InMemoryQueueProvider();
    queue.subscriptions.set('sub-1', subscription());
  });

  it('fans out only to matching active subscriptions in the same tenant/application', async () => {
    queue.subscriptions.set('sub-paused', subscription({ id: 'sub-paused', status: 'paused' }));
    queue.subscriptions.set('sub-other-tenant', subscription({ id: 'sub-other-tenant', tenantId: 'tenant-2' }));
    queue.subscriptions.set('sub-other-app', subscription({ id: 'sub-other-app', applicationId: 'app-2' }));
    queue.subscriptions.set('sub-other-event', subscription({ id: 'sub-other-event', subscribedEvents: ['election.results.published'] }));
    queue.subscriptions.set('sub-exact', subscription({ id: 'sub-exact', subscribedEvents: ['test.ping'] }));
    const result = await queue.enqueueEvent(baseParams);
    expect(result).toMatchObject({ deduplicated: false, enqueuedDeliveries: 2 });
    expect(queue.events.get(result.eventId)).toMatchObject({ tenantId: 'tenant-1', eventType: 'test.ping', payloadSha256: 'digest' });
    expect([...queue.deliveries.values()].map((delivery) => delivery.subscriptionId).sort()).toEqual(['sub-1', 'sub-exact']);
  });

  it('deduplicates idempotency keys within tenant and application scope', async () => {
    const first = await queue.enqueueEvent(baseParams);
    const second = await queue.enqueueEvent(baseParams);
    expect(second).toEqual({ eventId: first.eventId, deduplicated: true, enqueuedDeliveries: 1 });
    const otherTenant = await queue.enqueueEvent({ ...baseParams, tenantId: 'tenant-2' });
    expect(otherTenant.deduplicated).toBe(false);
  });

  it('claims queued deliveries with a unique lease and obeys batch bounds', async () => {
    await queue.enqueueEvent(baseParams);
    await queue.enqueueEvent({ ...baseParams, idempotencyKey: 'key-2' });
    const claimed = await queue.claimBatch(1);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].delivery.status).toBe('leased');
    expect(claimed[0].leaseToken).toBeTruthy();
    expect(await queue.claimBatch(10)).toHaveLength(1);
  });

  it('does not claim deliveries whose related subscription or event is missing', async () => {
    await queue.enqueueEvent(baseParams);
    const delivery = [...queue.deliveries.values()][0];
    queue.subscriptions.delete(delivery.subscriptionId);
    expect(await queue.claimBatch(10)).toEqual([]);
  });

  it('completes successful deliveries and resets subscription failures', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    queue.subscriptions.get('sub-1')!.consecutiveFailureCount = 4;
    expect(await queue.completeDelivery(job.delivery.id, job.leaseToken, success)).toEqual({ updated: true, terminalStatus: 'delivered' });
    expect(queue.deliveries.get(job.delivery.id)).toMatchObject({ status: 'delivered', httpStatus: 204 });
    expect(queue.subscriptions.get('sub-1')!.consecutiveFailureCount).toBe(0);
  });

  it('rejects stale lease tokens and unknown delivery IDs', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    expect(await queue.completeDelivery(job.delivery.id, 'stale-token', success)).toEqual({ updated: false });
    expect(await queue.completeDelivery('missing', job.leaseToken, success)).toEqual({ updated: false });
  });

  it('schedules retries and increments consecutive failure count', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    const result = await queue.completeDelivery(job.delivery.id, job.leaseToken, failure);
    expect(result).toEqual({ updated: true, terminalStatus: 'retrying' });
    expect(queue.deliveries.get(job.delivery.id)).toMatchObject({ status: 'retrying', attemptCount: 2 });
    expect(queue.subscriptions.get('sub-1')!.consecutiveFailureCount).toBe(1);
  });

  it('dead-letters exhausted deliveries and trips the subscription failure threshold', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    const delivery = queue.deliveries.get(job.delivery.id)!;
    delivery.attemptCount = MAX_DELIVERY_ATTEMPTS;
    queue.subscriptions.get('sub-1')!.consecutiveFailureCount = 19;
    expect(await queue.completeDelivery(job.delivery.id, job.leaseToken, failure)).toEqual({ updated: true, terminalStatus: 'dead_letter' });
    expect(delivery.status).toBe('dead_letter');
    expect(queue.subscriptions.get('sub-1')!.status).toBe('failed');
  });

  it('recovers expired leases and clears lease fencing metadata', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    const delivery = queue.deliveries.get(job.delivery.id)!;
    delivery.leasedUntil = new Date(Date.now() - 1000);
    expect(await queue.recoverExpiredLeases()).toBe(1);
    expect(delivery.status).toBe('queued');
    expect(delivery.leaseToken).toBeUndefined();
    expect(delivery.leasedUntil).toBeUndefined();
  });

  it('purges old terminal deliveries first and only then orphaned expired events within batch bounds', async () => {
    await queue.enqueueEvent(baseParams);
    const [job] = await queue.claimBatch(1);
    const delivery = queue.deliveries.get(job.delivery.id)!;
    delivery.status = 'delivered';
    delivery.completedAt = new Date(Date.now() - 40 * 86400000).toISOString();
    const event = queue.events.get(job.event.id)!;
    event.createdAt = new Date(Date.now() - 40 * 86400000).toISOString();
    expect(await queue.purgeExpiredData(30, 10)).toEqual({ purgedDeliveries: 1, purgedEvents: 1 });
    expect(queue.deliveries.size).toBe(0);
    expect(queue.events.size).toBe(0);
  });

  it('does not purge an old event while a non-terminal delivery still references it', async () => {
    await queue.enqueueEvent(baseParams);
    const event = [...queue.events.values()][0];
    event.createdAt = new Date(Date.now() - 40 * 86400000).toISOString();
    expect(await queue.purgeExpiredData(30, 10)).toEqual({ purgedDeliveries: 0, purgedEvents: 0 });
  });
});
