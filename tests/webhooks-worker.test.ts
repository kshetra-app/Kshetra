import assert from 'node:assert/strict';
import { InMemoryQueueProvider } from '../apps/api/src/modules/webhooks/queueProvider.ts';
import { runWebhookWorkerBatch } from '../apps/api/src/modules/webhooks/webhookWorker.ts';

async function main() {
  const provider = new InMemoryQueueProvider();
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const eventId = '33333333-3333-3333-3333-333333333333';
  const subscription: any = { id: subscriptionId, tenantId, applicationId: 'app-1',
    endpointUrl: 'https://receiver.example/hook', secretHint: 'hint', secretHash: 'hash', subscribedEvents: ['test.ping'],
    status: 'active', consecutiveFailureCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    _rawSecret: 'test-only-secret' };
  provider.subscriptions.set(subscriptionId, subscription);
  provider.events.set(eventId, { id: eventId, tenantId, eventType: 'test.ping', idempotencyKey: null,
    payload: { event_id: eventId, timestamp: new Date().toISOString(), message: 'test' },
    payloadRaw: '{"event_id":"33333333-3333-3333-3333-333333333333","message":"test"}',
    payloadSha256: 'a'.repeat(64), createdAt: new Date().toISOString() });
  const deliveryId = '44444444-4444-4444-4444-444444444444';
  provider.deliveries.set(deliveryId, { id: deliveryId, tenantId, subscriptionId, eventId, attemptCount: 1,
    status: 'queued', createdAt: new Date().toISOString() });
  let called = 0;
  const outcomes = await runWebhookWorkerBatch(provider, 10, async params => {
    called++; assert.equal(params.secret, 'test-only-secret'); assert.equal(params.deliveryId, deliveryId);
    assert.equal(params.eventId, eventId); assert.equal(params.payloadRaw, provider.events.get(eventId)?.payloadRaw);
    return { success: true, httpStatus: 204, executionDurationMs: 8, requestHeaders: {}, responseHeaders: {}, responseBodySample: '' };
  });
  assert.equal(called, 1); assert.equal(outcomes.length, 1); assert.equal(outcomes[0].updated, true);
  assert.equal(outcomes[0].terminalStatus, 'delivered'); assert.equal(provider.deliveries.get(deliveryId)?.status, 'delivered');
  const missing = new InMemoryQueueProvider();
  missing.subscriptions.set(subscriptionId, { ...subscription, _rawSecret: undefined });
  missing.events.set(eventId, provider.events.get(eventId)!);
  const missingId = '55555555-5555-5555-5555-555555555555';
  missing.deliveries.set(missingId, { id: missingId, tenantId, subscriptionId, eventId,
    attemptCount: 1, status: 'queued', createdAt: new Date().toISOString() });
  let unexpectedDispatch = false;
  const failed = await runWebhookWorkerBatch(missing, 1, async () => { unexpectedDispatch = true; throw new Error('must not dispatch without a secret'); });
  assert.equal(unexpectedDispatch, false); assert.equal(failed[0].success, false);
  assert.equal(failed[0].errorMessage, 'WEBHOOK_SECRET_UNAVAILABLE');
  assert.equal(missing.deliveries.get(missingId)?.status, 'retrying');
  console.log('W022 worker: 2 checks passed, 0 failed.');
}
main().catch(error => { console.error(error); process.exit(1); });
