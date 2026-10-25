import assert from 'node:assert/strict';
import { PostgresQueueProvider } from '../apps/api/src/modules/webhooks/queueProvider.ts';

const event = {
  tenant_id: '11111111-1111-1111-1111-111111111111',
  event_type: 'test.ping',
  idempotency_key: 'test-key-1',
  payload: { ping: true },
  payload_raw: '{"ping":true}',
  payload_sha256: 'a'.repeat(64),
};
const baseClaim = {
  delivery_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  tenant_id: event.tenant_id,
  subscription_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  application_id: 'app-test',
  event_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  attempt_count: 1,
  lease_token: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  leased_until: '2026-10-25T10:00:00.000Z',
  delivery_created_at: '2026-10-25T09:00:00.000Z',
  endpoint_url: 'https://hooks.example.com/events',
  secret_hint: '••••abcd',
  secret_hash: 'e'.repeat(64),
  secret_ciphertext: '\\x0102',
  secret_iv: '\\x030405060708090a0b0c',
  secret_tag: '\\x' + '0d'.repeat(16),
  secret_key_version: 1,
  previous_secret_ciphertext: null,
  previous_secret_iv: null,
  previous_secret_tag: null,
  previous_secret_expires_at: null,
  subscribed_events: ['*'],
  subscription_status: 'active',
  consecutive_failure_count: 0,
  subscription_created_at: '2026-10-25T08:00:00.000Z',
  subscription_updated_at: '2026-10-25T08:30:00.000Z',
  event_type: 'test.ping',
  event_payload: { ping: true },
  payload_raw: '{"ping":true}',
  payload_sha256: 'a'.repeat(64),
  event_created_at: '2026-10-25T09:00:00.000Z',
};

function clientWith(responses: Array<{ data: unknown; error: unknown }>) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      const result = responses.shift();
      if (!result) throw new Error('Unexpected RPC: ' + name);
      return result;
    },
    from: () => { throw new Error('Direct table access is forbidden by this test contract.'); },
  };
  return { client: client as any, calls };
}

async function main() {
  {
    const mock = clientWith([{ data: [{ event_id: baseClaim.event_id, deduplicated: false, enqueued_deliveries: 2 }], error: null }]);
    const provider = new PostgresQueueProvider(mock.client);
    const result = await provider.enqueueEvent({
      tenantId: event.tenant_id,
      eventType: event.event_type,
      idempotencyKey: event.idempotency_key,
      payload: event.payload,
      payloadRaw: event.payload_raw,
      payloadSha256: event.payload_sha256,
    });
    assert.deepStrictEqual(result, { eventId: baseClaim.event_id, deduplicated: false, enqueuedDeliveries: 2 });
    assert.strictEqual(mock.calls.length, 1);
    assert.strictEqual(mock.calls[0].name, 'fn_enqueue_webhook_event');
    assert.strictEqual(mock.calls[0].args.p_payload_raw, event.payload_raw);
  }

  {
    const mock = clientWith([{ data: [baseClaim], error: null }]);
    const provider = new PostgresQueueProvider(mock.client);
    const result = await provider.claimBatch(4);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].delivery.id, baseClaim.delivery_id);
    assert.strictEqual(result[0].delivery.tenantId, baseClaim.tenant_id);
    assert.strictEqual(result[0].subscription.applicationId, 'app-test');
    assert.strictEqual(result[0].event.payloadRaw, baseClaim.payload_raw);
    assert.strictEqual(result[0].event.payloadSha256, 'a'.repeat(64));
    assert.strictEqual(result[0].leaseToken, baseClaim.lease_token);
    assert.ok(result[0].delivery.id, 'flat SQL columns must not produce undefined nested objects');
    assert.strictEqual(mock.calls[0].args.p_batch_size, 4);
  }

  {
    const mock = clientWith([{ data: [{ updated: false, terminal_status: null }], error: null }]);
    const provider = new PostgresQueueProvider(mock.client);
    const result = await provider.completeDelivery(baseClaim.delivery_id, baseClaim.lease_token, {
      success: false, httpStatus: 503, executionDurationMs: 35,
      requestHeaders: {}, responseHeaders: { 'set-cookie': 's=secret', 'content-type': 'text/plain' },
      responseBodySample: 'retry', errorMessage: 'HTTP_STATUS_503',
    });
    assert.deepStrictEqual(result, { updated: false });
    assert.strictEqual(mock.calls[0].name, 'fn_complete_webhook_delivery');
    assert.deepStrictEqual(mock.calls[0].args.p_response_headers, { 'content-type': 'text/plain' });
    assert.strictEqual(mock.calls[0].args.p_lease_token, baseClaim.lease_token);
  }

  {
    const mock = clientWith([{ data: 3, error: null }]);
    const provider = new PostgresQueueProvider(mock.client);
    assert.strictEqual(await provider.recoverExpiredLeases(), 3);
    assert.strictEqual(mock.calls[0].name, 'fn_recover_expired_webhook_leases');
  }

  {
    const mock = clientWith([{ data: null, error: { message: 'simulated database failure' } }]);
    const provider = new PostgresQueueProvider(mock.client);
    await assert.rejects(
      provider.enqueueEvent({
        tenantId: event.tenant_id, eventType: event.event_type,
        idempotencyKey: event.idempotency_key, payload: event.payload,
        payloadRaw: event.payload_raw, payloadSha256: event.payload_sha256,
      }),
      /DATABASE_ENQUEUE_ERROR/
    );
  }
  console.log('Webhook Postgres queue contract: 5 checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
