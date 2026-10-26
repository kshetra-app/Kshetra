import { PostgresQueueProvider } from '../modules/webhooks/queueProvider';

const validClaimRow = (overrides: Record<string, unknown> = {}) => ({
  delivery_id: 'delivery-1',
  tenant_id: 'tenant-1',
  subscription_id: 'subscription-1',
  event_id: 'event-1',
  lease_token: 'lease-1',
  attempt_count: 2,
  leased_until: '2026-10-26T00:00:00.000Z',
  application_id: 'app-1',
  endpoint_url: 'https://example.test/hook',
  secret_ciphertext: '\\x0102',
  secret_iv: '0a0b',
  secret_tag: Buffer.from([3, 4]),
  secret_key_version: 1,
  previous_secret_ciphertext: null,
  previous_secret_iv: null,
  previous_secret_tag: null,
  previous_secret_expires_at: null,
  event_type: 'record.created',
  payload_raw: '{"id":"record-1"}',
  payload_sha256: 'digest',
  ...overrides,
});

const dispatchResult = (success: boolean) => ({
  success,
  httpStatus: success ? 204 : 503,
  executionDurationMs: 10,
  requestHeaders: {},
  responseHeaders: {},
  responseBodySample: '',
  errorMessage: success ? undefined : 'provider unavailable',
});

const chain = (final: unknown) => {
  const q: any = {};
  q.select = jest.fn(() => q);
  q.eq = jest.fn(() => q);
  q.lt = jest.fn(() => q);
  q.update = jest.fn(() => q);
  q.maybeSingle = jest.fn(async () => final);
  q.single = jest.fn(async () => final);
  q.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(final).then(resolve, reject);
  return q;
};

describe('PostgresQueueProvider branch and error contracts', () => {
  const makeProvider = (rpc = jest.fn(), from = jest.fn()) =>
    new PostgresQueueProvider({ rpc, from } as any);

  it('enqueues event through the atomic RPC and normalizes duplicate/count fields', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ event_id: 'event-1', is_duplicate: true, deliveries_created: '3' }], error: null });
    const provider = makeProvider(rpc);
    await expect(provider.enqueueEvent({
      tenantId: 'tenant-1', applicationId: 'app-1', eventType: 'record.created',
      payload: { id: 1 }, payloadRaw: '{"id":1}', payloadSha256: 'hash',
    })).resolves.toEqual({ eventId: 'event-1', deduplicated: true, enqueuedDeliveries: 3 });
    expect(rpc).toHaveBeenCalledWith('fn_publish_webhook_event', expect.objectContaining({
      p_tenant_id: 'tenant-1', p_application_id: 'app-1', p_idempotency_key: null,
    }));
  });

  it.each([
    [{ data: null, error: { message: 'db offline' } }, 'db offline'],
    [{ data: [], error: null }, 'No rows returned'],
    [{ data: null, error: null }, 'No rows returned'],
  ])('fails closed when event enqueue RPC fails or returns no rows', async (response, expected) => {
    const provider = makeProvider(jest.fn().mockResolvedValue(response));
    await expect(provider.enqueueEvent({
      tenantId: 'tenant-1', applicationId: 'app-1', eventType: 'record.created',
      payload: {}, payloadRaw: '{}', payloadSha256: 'hash',
    })).rejects.toThrow(expected);
  });

  it('returns an empty batch for non-array claim data and wraps claim RPC errors', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: { delivery_id: 'not-an-array' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'claim rpc offline' } });
    const provider = makeProvider(rpc);
    await expect(provider.claimBatch(4)).resolves.toEqual([]);
    await expect(provider.claimBatch(4)).rejects.toThrow('RPC_CLAIM_BATCH_FAILED: claim rpc offline');
  });

  it('maps valid claim rows including bytea, previous-secret and JSON fallback fields', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        validClaimRow(),
        validClaimRow({
          delivery_id: 'delivery-2', event_id: 'event-2', subscription_id: 'subscription-2',
          payload_raw: '{invalid', previous_secret_ciphertext: '\\x0102',
          previous_secret_iv: '0a0b', previous_secret_tag: '0c0d',
          previous_secret_expires_at: '2026-10-27T00:00:00.000Z',
        }),
      ],
      error: null,
    });
    const provider = makeProvider(rpc);
    const jobs = await provider.claimBatch(2);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].subscription.secretCiphertext).toEqual(Buffer.from([1, 2]));
    expect(jobs[0].event.payload).toEqual({ id: 'record-1' });
    expect(jobs[1].event.payload).toEqual({});
    expect(jobs[1].subscription.previousSecretCiphertext).toEqual(Buffer.from([1, 2]));
    expect(jobs[1].subscription.previousSecretExpiresAt).toBe('2026-10-27T00:00:00.000Z');
  });

  it.each(['delivery_id', 'tenant_id', 'subscription_id', 'event_id', 'lease_token'])(
    'rejects claim rows missing required field %s',
    async (field) => {
      const row = validClaimRow({ [field]: '' });
      const provider = makeProvider(jest.fn().mockResolvedValue({ data: [row], error: null }));
      await expect(provider.claimBatch(1)).rejects.toThrow('MALFORMED_CLAIM_BATCH_ROW');
    },
  );

  it('returns unchanged when lease-fenced fetch fails or no delivery matches', async () => {
    const fetchError = chain({ data: null, error: { message: 'read failed' } });
    const providerWithError = makeProvider(jest.fn(), jest.fn().mockReturnValue(fetchError));
    await expect(providerWithError.completeDelivery('delivery-1', 'lease-1', dispatchResult(true))).resolves.toEqual({ updated: false });

    const noMatch = chain({ data: null, error: null });
    const providerNoMatch = makeProvider(jest.fn(), jest.fn().mockReturnValue(noMatch));
    await expect(providerNoMatch.completeDelivery('delivery-1', 'lease-1', dispatchResult(true))).resolves.toEqual({ updated: false });
  });

  it.each([
    [true, 1, 'delivered'],
    [false, 2, 'retrying'],
    [false, 5, 'dead_letter'],
  ])('chooses correct delivery transition for success=%s attempt=%s', async (success, attempts, status) => {
    const fetch = chain({ data: { id: 'delivery-1', attempt_count: attempts, subscription_id: null }, error: null });
    const update = chain({ data: [{ id: 'delivery-1', status }], error: null });
    update.update = jest.fn(() => update);
    update.select = jest.fn(() => Promise.resolve({ data: [{ id: 'delivery-1', status }], error: null }));
    const provider = makeProvider(jest.fn(), jest.fn()
      .mockReturnValueOnce(fetch)
      .mockReturnValueOnce(update));
    const result = await provider.completeDelivery('delivery-1', 'lease-1', dispatchResult(success));
    expect(result).toEqual({ updated: true, terminalStatus: status });
  });

  it('returns unchanged when the lease-fenced update loses a race', async () => {
    const fetch = chain({ data: { id: 'delivery-1', attempt_count: 1, subscription_id: null }, error: null });
    const update = chain({ data: [], error: null });
    update.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const provider = makeProvider(jest.fn(), jest.fn().mockReturnValueOnce(fetch).mockReturnValueOnce(update));
    await expect(provider.completeDelivery('delivery-1', 'lease-1', dispatchResult(true))).resolves.toEqual({ updated: false });
  });

  it('updates subscription failure count and circuit-breaker status on failed deliveries', async () => {
    const fetch = chain({ data: { id: 'delivery-1', attempt_count: 1, subscription_id: 'subscription-1' }, error: null });
    const updateDelivery = chain({ data: [{ id: 'delivery-1', status: 'retrying' }], error: null });
    updateDelivery.select = jest.fn(() => Promise.resolve({ data: [{ id: 'delivery-1', status: 'retrying' }], error: null }));
    const readSub = chain({ data: { consecutive_failure_count: 19 }, error: null });
    const updateSub: any = { update: jest.fn(() => updateSub), eq: jest.fn(() => Promise.resolve({ data: null, error: null })) };
    const from = jest.fn()
      .mockReturnValueOnce(fetch)
      .mockReturnValueOnce(updateDelivery)
      .mockReturnValueOnce(readSub)
      .mockReturnValueOnce(updateSub);
    const provider = makeProvider(jest.fn(), from);
    await expect(provider.completeDelivery('delivery-1', 'lease-1', dispatchResult(false))).resolves.toEqual({ updated: true, terminalStatus: 'retrying' });
    expect(updateSub.update).toHaveBeenCalledWith({ consecutive_failure_count: 20, status: 'failed' });
  });

  it('resets subscription failures after successful delivery', async () => {
    const fetch = chain({ data: { id: 'delivery-1', attempt_count: 1, subscription_id: 'subscription-1' }, error: null });
    const updateDelivery = chain({ data: [{ id: 'delivery-1', status: 'delivered' }], error: null });
    updateDelivery.select = jest.fn(() => Promise.resolve({ data: [{ id: 'delivery-1', status: 'delivered' }], error: null }));
    const updateSub: any = { update: jest.fn(() => updateSub), eq: jest.fn(() => Promise.resolve({ data: null, error: null })) };
    const from = jest.fn()
      .mockReturnValueOnce(fetch)
      .mockReturnValueOnce(updateDelivery)
      .mockReturnValueOnce(updateSub);
    const provider = makeProvider(jest.fn(), from);
    await provider.completeDelivery('delivery-1', 'lease-1', dispatchResult(true));
    expect(updateSub.update).toHaveBeenCalledWith({ consecutive_failure_count: 0 });
  });

  it('recovers expired leases and classifies query errors as zero recovered', async () => {
    const recovered = chain({ data: [{ id: '1' }, { id: '2' }], error: null });
    recovered.select = jest.fn(() => Promise.resolve({ data: [{ id: '1' }, { id: '2' }], error: null }));
    const failed = chain({ data: null, error: { message: 'update failed' } });
    failed.select = jest.fn(() => Promise.resolve({ data: null, error: { message: 'update failed' } }));
    const provider = makeProvider(jest.fn(), jest.fn().mockReturnValueOnce(recovered).mockReturnValueOnce(failed));
    await expect(provider.recoverExpiredLeases()).resolves.toBe(2);
    await expect(provider.recoverExpiredLeases()).resolves.toBe(0);
  });

  it('purges expired data using supplied retention and batch bounds and handles empty/error results', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [{ purged_deliveries_count: 4, purged_events_count: 2 }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'purge failed' } });
    const provider = makeProvider(rpc);
    await expect(provider.purgeExpiredData(14, 50)).resolves.toEqual({ purgedDeliveries: 4, purgedEvents: 2 });
    await expect(provider.purgeExpiredData()).resolves.toEqual({ purgedDeliveries: 0, purgedEvents: 0 });
    await expect(provider.purgeExpiredData()).resolves.toEqual({ purgedDeliveries: 0, purgedEvents: 0 });
    expect(rpc).toHaveBeenCalledWith('fn_purge_expired_webhook_data', { p_retention_days: 14, p_batch_size: 50 });
  });
});
