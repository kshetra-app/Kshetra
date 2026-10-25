import assert from 'node:assert/strict';
import {
  WebhookWorker,
  normalizeWebhookWorkerConnectionString,
  type ClaimedWebhookRow,
  type WorkerDatabase,
  type WorkerQueryResult,
} from '../apps/api/src/modules/webhooks/webhookWorker.ts';
import { encryptSecret } from '../apps/api/src/modules/webhooks/crypto.ts';
import type { DispatchResult } from '../apps/api/src/modules/webhooks/webhookDispatcher.ts';

process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY =
  process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const tenantId = '11111111-1111-1111-1111-111111111111';
const subscriptionId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const encrypted = encryptSecret('whsec_worker_test_secret', tenantId, subscriptionId);
const claim: ClaimedWebhookRow = {
  delivery_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  tenant_id: tenantId,
  subscription_id: subscriptionId,
  application_id: 'app-test',
  event_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  attempt_count: 1,
  lease_token: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  leased_until: '2026-10-25T10:00:00.000Z',
  endpoint_url: 'https://hooks.example.com/events',
  secret_ciphertext: encrypted.ciphertext,
  secret_iv: encrypted.iv,
  secret_tag: encrypted.tag,
  previous_secret_ciphertext: null,
  previous_secret_iv: null,
  previous_secret_tag: null,
  previous_secret_expires_at: null,
  event_type: 'test.ping',
  event_payload: { ping: true },
  payload_raw: '{"ping":true}',
  payload_sha256: 'a'.repeat(64),
};

class FakeDatabase implements WorkerDatabase {
  calls: Array<{ sql: string; values?: unknown[] }> = [];
  constructor(private readonly claimRows: ClaimedWebhookRow[]) {}
  async query<Row = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<WorkerQueryResult<Row>> {
    this.calls.push({ sql, values });
    if (sql.includes('panin_webhook_worker.claim_webhook_batch')) return { rows: this.claimRows as unknown as Row[] };
    if (sql.includes('panin_webhook_worker.complete_webhook_delivery')) return { rows: [{ updated: true, terminal_status: 'delivered' } as Row] };
    throw new Error('Unexpected SQL path: ' + sql);
  }
  async end(): Promise<void> {}
}

async function main() {
  assert.throws(
    () => normalizeWebhookWorkerConnectionString('postgres://service_role:password@db.example.com:5432/postgres'),
    /must authenticate as webhook_worker/
  );
  const normalized = normalizeWebhookWorkerConnectionString(
    'postgres://webhook_worker:password@db.example.com:5432/postgres?sslmode=disable'
  );
  assert.ok(!normalized.includes('sslmode=disable'));

  const database = new FakeDatabase([claim]);
  let dispatchedSecret = '';
  let dispatchedBody = '';
  const result: DispatchResult = {
    success: true, httpStatus: 204, executionDurationMs: 8,
    requestHeaders: {}, responseHeaders: { 'content-type': 'application/json', 'set-cookie': 'secret' },
    responseBodySample: '',
  };
  const worker = new WebhookWorker(database, {
    batchSize: 1, leaseSeconds: 60, concurrency: 1,
    dispatch: async (params) => {
      dispatchedSecret = params.secret;
      dispatchedBody = params.payloadRaw;
      return result;
    },
    now: () => Date.parse('2026-10-25T09:00:00.000Z'),
  });
  const claimed = await worker.runOnce();
  assert.strictEqual(claimed, 1);
  assert.strictEqual(dispatchedSecret, 'whsec_worker_test_secret');
  assert.strictEqual(dispatchedBody, '{"ping":true}');
  assert.strictEqual(database.calls.length, 2);
  assert.ok(database.calls[0].sql.includes('panin_webhook_worker.claim_webhook_batch'));
  assert.ok(database.calls[1].sql.includes('panin_webhook_worker.complete_webhook_delivery'));
  assert.strictEqual(database.calls[1].values?.[1], claim.lease_token);
  assert.deepStrictEqual(JSON.parse(String(database.calls[1].values?.[5])), { 'content-type': 'application/json' });
  console.log('Webhook worker runtime contract: 5 checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
