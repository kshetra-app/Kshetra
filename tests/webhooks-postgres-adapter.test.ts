import assert from 'node:assert/strict';
import { PostgresQueueProvider } from '../apps/api/src/modules/webhooks/queueProvider.ts';
import { encodePostgresBytea, encryptSecret } from '../apps/api/src/modules/webhooks/crypto.ts';

async function main() {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const eventId = '33333333-3333-3333-3333-333333333333';
  const deliveryId = '44444444-4444-4444-4444-444444444444';
  const secret = 'adapter-test-secret';
  const encrypted = encryptSecret(secret, tenantId, subscriptionId);
  const flatClaim = {
    delivery_id: deliveryId, tenant_id: tenantId, subscription_id: subscriptionId, event_id: eventId,
    attempt_count: 1, delivery_status: 'leased', lease_token: '55555555-5555-5555-5555-555555555555',
    leased_until: '2026-10-25T12:00:30.000Z', next_retry_at: null, delivery_created_at: '2026-10-25T11:59:00.000Z',
    completed_at: null, http_status: null, execution_duration_ms: null, error_message: null,
    request_headers: {}, response_headers: {}, response_body_sample: '', application_id: 'app-id',
    endpoint_url: 'https://receiver.example/hook', secret_ciphertext: encodePostgresBytea(encrypted.ciphertext),
    secret_iv: encodePostgresBytea(encrypted.iv), secret_tag: encodePostgresBytea(encrypted.tag),
    secret_key_version: encrypted.version, secret_hash: encrypted.hash, secret_hint: encrypted.hint,
    subscribed_events: ['test.ping'], subscription_status: 'active', consecutive_failure_count: 0,
    subscription_created_at: '2026-10-25T11:58:00.000Z', subscription_updated_at: '2026-10-25T11:58:00.000Z',
    previous_secret_ciphertext: null, previous_secret_iv: null, previous_secret_tag: null,
    previous_secret_expires_at: null, event_type: 'test.ping', idempotency_key: null,
    payload: { event_id: eventId }, payload_raw: '{"event_id":"33333333-3333-3333-3333-333333333333"}',
    payload_sha256: 'a'.repeat(64), event_created_at: '2026-10-25T11:58:00.000Z',
  };
  const rpcCalls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  let failClaim = false;
  const fakeClient = {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === 'fn_enqueue_webhook_event') return { data: [{ event_id: eventId, deduplicated: false, enqueued_deliveries: 2 }], error: null };
      if (name === 'fn_claim_webhook_batch') return failClaim
        ? { data: null, error: { message: 'simulated database unavailable' } }
        : { data: [flatClaim], error: null };
      if (name === 'fn_complete_webhook_delivery') return { data: [{ updated: true, terminal_status: 'delivered' }], error: null };
      if (name === 'fn_recover_expired_webhook_leases') return { data: 2, error: null };
      if (name === 'fn_purge_expired_webhook_data') return { data: [{ purged_deliveries_count: 3, purged_events_count: 1 }], error: null };
      return { data: null, error: { message: `unexpected RPC ${name}` } };
    },
  };
  const provider = new PostgresQueueProvider(fakeClient as any);

  const enqueued = await provider.enqueueEvent({ tenantId, eventType: 'test.ping', payload: { event_id: eventId },
    payloadRaw: flatClaim.payload_raw, payloadSha256: flatClaim.payload_sha256, idempotencyKey: 'idemp-1' });
  assert.deepStrictEqual(enqueued, { eventId, deduplicated: false, enqueuedDeliveries: 2 });
  const jobs = await provider.claimBatch(5);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].delivery.id, deliveryId);
  assert.equal(jobs[0].subscription.endpointUrl, 'https://receiver.example/hook');
  assert.equal(jobs[0].event.eventType, 'test.ping');
  assert.equal(jobs[0].secret, secret);
  assert.equal(jobs[0].secretError, undefined);
  assert.equal(rpcCalls.find(x => x.name === 'fn_claim_webhook_batch')?.args?.p_lease_seconds, 30);

  const completion = await provider.completeDelivery(deliveryId, flatClaim.lease_token, {
    success: true, httpStatus: 204, executionDurationMs: 9, requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
  });
  assert.deepStrictEqual(completion, { updated: true, terminalStatus: 'delivered' });
  assert.equal(await provider.recoverExpiredLeases(), 2);
  assert.deepStrictEqual(await provider.purgeExpiredData(), { purgedDeliveries: 3, purgedEvents: 1 });

  failClaim = true;
  await assert.rejects(() => provider.claimBatch(5), /DATABASE_CLAIM_ERROR: simulated database unavailable/);
  console.log('W022 PostgreSQL adapter: 6 checks passed, 0 failed.');
}
main().catch(error => { console.error(error); process.exit(1); });
