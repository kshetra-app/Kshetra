import crypto from 'node:crypto';
import {
  canonicalizeJson, computePayloadSha256, decodePostgrestBytea, decryptSecret,
  encodePostgrestBytea, encryptSecret,
} from '../modules/webhooks/crypto';
import { isBlockedIp } from '../modules/webhooks/antiSsrfGuard';
import { PostgresQueueProvider } from '../modules/webhooks/queueProvider';
import { createWebhookWorkerFetch, createWebhookWorkerJwt } from '../modules/webhooks/webhookWorkerAuth';

describe('W022 runtime contract corrections', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  test('PostgREST bytea encoding round-trips exact bytes and rejects invalid formats', () => {
    const bytes = Buffer.from([0, 1, 15, 16, 127, 128, 255]);
    expect(encodePostgrestBytea(bytes)).toBe('\\x00010f107f80ff');
    expect(decodePostgrestBytea(encodePostgrestBytea(bytes))).toEqual(bytes);
    expect(() => decodePostgrestBytea('not-bytea')).toThrow('POSTGREST_BYTEA_INVALID_FORMAT');
    expect(() => decodePostgrestBytea('\\x0z')).toThrow('POSTGREST_BYTEA_INVALID_HEX');
  });

  test('IPv6 parser catches expanded mapped private IPs and special-purpose ranges', () => {
    expect(isBlockedIp('0000:0000:0000:0000:0000:ffff:7f00:0001').blocked).toBe(true);
    expect(isBlockedIp('0:0:0:0:0:ffff:a9fe:a9fe').blocked).toBe(true);
    expect(isBlockedIp('2001:0db8:0000:0000:0000:0000:0000:0001').blocked).toBe(true);
    expect(isBlockedIp('2606:4700:4700::1111').blocked).toBe(false);
  });

  test('worker JWT is role-scoped, promptly expires, and has valid HMAC', () => {
    const secret = 'test-jwt-signing-secret-that-is-at-least-32-bytes';
    const token = createWebhookWorkerJwt(secret, 1_800_000_000);
    const [headerPart, payloadPart, signaturePart] = token.split('.');
    expect(JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'))).toEqual({ alg: 'HS256', typ: 'JWT' });
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    expect(payload.role).toBe('webhook_worker');
    expect(payload.exp - payload.iat).toBe(60);
    expect(signaturePart).toBe(crypto.createHmac('sha256', secret).update(headerPart + '.' + payloadPart).digest('base64url'));
  });

  test('worker fetch attaches a signed worker JWT without exposing signing secret', async () => {
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('ok', { status: 200 })) as unknown as typeof fetch;
    const workerFetch = createWebhookWorkerFetch('test-jwt-signing-secret-that-is-at-least-32-bytes', fetchImpl);
    const response = await workerFetch('https://example.invalid/rest/v1/rpc/fn_claim_webhook_batch', {
      method: 'POST', headers: { apikey: 'public-test-key' },
    });
    expect(response.status).toBe(200);
    const init = (fetchImpl as jest.Mock).mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    const bearer = String(headers.get('authorization'));
    expect(bearer.startsWith('Bearer ')).toBe(true);
    expect(headers.get('apikey')).toBe('public-test-key');
    expect(bearer).not.toContain('test-jwt-signing-secret');
    expect(JSON.parse(Buffer.from(bearer.slice(7).split('.')[1], 'base64url').toString('utf8')).role).toBe('webhook_worker');
  });

  test('event enqueue uses one atomic RPC and maps its result', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ event_id: '66666666-6666-4666-8666-666666666666', deduplicated: false, enqueued_deliveries: 2 }],
      error: null,
    });
    const workerRpc = jest.fn();
    const provider = new PostgresQueueProvider({ rpc } as any, () => ({ rpc: workerRpc } as any));
    const payload = { event_id: '11111111-1111-4111-8111-111111111111', message: 'ping', timestamp: '2026-10-25T00:00:00.000Z' };
    const raw = canonicalizeJson(payload);
    const result = await provider.enqueueEvent({
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', eventType: 'test.ping',
      idempotencyKey: 'key-1', payload, payloadRaw: raw, payloadSha256: computePayloadSha256(raw),
    });
    expect(result).toEqual({ eventId: '66666666-6666-4666-8666-666666666666', deduplicated: false, enqueuedDeliveries: 2 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('fn_enqueue_webhook_event', expect.objectContaining({ p_event_type: 'test.ping' }));
  });

  test('flattened claim rows become usable jobs and encrypted signing bytes are decoded', async () => {
    const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const subscriptionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const eventId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const secret = 'whsec_' + 'ab'.repeat(32);
    const encrypted = encryptSecret(secret, tenantId, subscriptionId);
    const payload = { event_id: eventId, timestamp: '2026-10-25T00:00:00.000Z', message: 'ping' };
    const raw = canonicalizeJson(payload);
    const row = {
      delivery_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', tenant_id: tenantId,
      application_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', subscription_id: subscriptionId, event_id: eventId,
      attempt_count: 1, lease_token: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      leased_until: '2026-10-25T00:01:00.000Z', delivery_created_at: '2026-10-25T00:00:00.000Z',
      http_status: null, execution_duration_ms: null, error_message: null, next_retry_at: null, completed_at: null,
      endpoint_url: 'https://hooks.example.invalid/events',
      secret_ciphertext: encodePostgrestBytea(encrypted.ciphertext), secret_iv: encodePostgrestBytea(encrypted.iv),
      secret_tag: encodePostgrestBytea(encrypted.tag), secret_key_version: encrypted.version,
      secret_hash: encrypted.hash, secret_hint: encrypted.hint, subscribed_events: ['test.ping'],
      subscription_status: 'active', consecutive_failure_count: 0,
      subscription_created_at: '2026-10-24T00:00:00.000Z', subscription_updated_at: '2026-10-24T00:00:00.000Z',
      previous_secret_ciphertext: null, previous_secret_iv: null, previous_secret_tag: null, previous_secret_expires_at: null,
      event_type: 'test.ping', idempotency_key: 'key-1', payload, payload_raw: raw,
      payload_sha256: computePayloadSha256(raw), event_created_at: '2026-10-25T00:00:00.000Z',
    };
    const workerRpc = jest.fn().mockResolvedValue({ data: [row], error: null });
    const provider = new PostgresQueueProvider({ rpc: jest.fn() } as any, () => ({ rpc: workerRpc } as any));
    const jobs = await provider.claimBatch(1);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].delivery.id).toBe(row.delivery_id);
    expect(jobs[0].subscription.endpointUrl).toBe(row.endpoint_url);
    expect(jobs[0].event.payloadRaw).toBe(raw);
    expect(jobs[0].secret).toBe(secret);
    expect(decryptSecret({ ciphertext: encrypted.ciphertext, iv: encrypted.iv, tag: encrypted.tag }, tenantId, subscriptionId)).toBe(secret);
  });

  test('fenced completion returns stale-token result and propagates RPC failures', async () => {
    const workerRpc = jest.fn().mockResolvedValue({ data: [{ updated: false, terminal_status: null }], error: null });
    const provider = new PostgresQueueProvider({ rpc: jest.fn() } as any, () => ({ rpc: workerRpc } as any));
    const stale = await provider.completeDelivery('delivery-id', 'stale-token', {
      success: true, httpStatus: 200, executionDurationMs: 1, requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
    });
    expect(stale.updated).toBe(false);
    workerRpc.mockResolvedValueOnce({ data: null, error: { message: 'worker role denied' } });
    await expect(provider.claimBatch(1)).rejects.toThrow('DATABASE_CLAIM_ERROR');
  });
});
