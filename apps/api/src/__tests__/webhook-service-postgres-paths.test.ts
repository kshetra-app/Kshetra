import * as egress from '../modules/webhooks/antiSsrfGuard';
import * as dispatcher from '../modules/webhooks/webhookDispatcher';
import { WebhookService } from '../modules/webhooks/webhookService';

jest.mock('../modules/webhooks/antiSsrfGuard', () => ({
  validateAndPinEgressTarget: jest.fn().mockResolvedValue({ hostname: 'example.test', pinnedIp: '8.8.8.8' }),
}));
jest.mock('../modules/webhooks/webhookDispatcher', () => ({
  dispatchWebhook: jest.fn().mockResolvedValue({
    success: true, httpStatus: 204, executionDurationMs: 2, requestHeaders: {}, responseHeaders: {},
    responseBodySample: '', errorMessage: undefined,
  }),
}));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-db-1',
  tenant_id: 'tenant-1',
  application_id: 'app-1',
  endpoint_url: 'https://example.test/hooks',
  secret_hint: 'secret123',
  secret_hash: 'hash',
  subscribed_events: ['test.ping'],
  status: 'active',
  consecutive_failure_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function makeService(results: any[] = [], terminalError?: unknown) {
  const resultQueue = [...results];
  const provider = {
    enqueueEvent: jest.fn().mockResolvedValue({ eventId: 'event-db-1', deduplicated: false, enqueuedDeliveries: 3 }),
    claimBatch: jest.fn().mockResolvedValue([]),
    completeDelivery: jest.fn().mockResolvedValue({ updated: true }),
    recoverExpiredLeases: jest.fn().mockResolvedValue(0),
    purgeExpiredData: jest.fn().mockResolvedValue({ purgedDeliveries: 0, purgedEvents: 0 }),
  };
  const client: any = {
    from: jest.fn(() => {
      const builder: any = {};
      const chain = jest.fn(() => builder);
      builder.insert = chain;
      builder.update = chain;
      builder.select = chain;
      builder.eq = chain;
      builder.order = jest.fn(() => Promise.resolve(resultQueue.shift() ?? { data: [], error: null }));
      builder.single = jest.fn(() => Promise.resolve(resultQueue.shift() ?? { data: null, error: null }));
      builder.maybeSingle = jest.fn(() => Promise.resolve(resultQueue.shift() ?? { data: null, error: null }));
      builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ data: null, error: terminalError }).then(resolve, reject);
      return builder;
    }),
    rpc: jest.fn(),
  };
  return {
    service: new WebhookService(client, provider as any),
    client,
    provider,
  };
}

describe('WebhookService PostgreSQL persistence branches', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (egress.validateAndPinEgressTarget as jest.Mock).mockResolvedValue({
      hostname: 'example.test', pinnedIp: '8.8.8.8',
    });
    (dispatcher.dispatchWebhook as jest.Mock).mockResolvedValue({
      success: true, httpStatus: 204, executionDurationMs: 2, requestHeaders: {}, responseHeaders: {},
      responseBodySample: '',
    });
  });

  it('creates and maps a database-backed subscription and rejects insert failures', async () => {
    const { service, client } = makeService([{ data: row(), error: null }]);
    const created = await service.createSubscription({
      tenantId: 'tenant-1', applicationId: 'app-1', endpointUrl: 'https://example.test/hooks',
      subscribedEvents: ['test.ping'],
    });
    expect(created.subscription).toMatchObject({
      id: 'sub-db-1', tenantId: 'tenant-1', applicationId: 'app-1',
      endpointUrl: 'https://example.test/hooks', status: 'active',
    });
    expect(client.from).toHaveBeenCalledWith('webhook_subscriptions');
    expect(egress.validateAndPinEgressTarget).toHaveBeenCalled();

    const failed = makeService([{ data: null, error: { message: 'insert rejected' } }]);
    await expect(failed.service.createSubscription({
      tenantId: 'tenant-1', applicationId: 'app-1', endpointUrl: 'https://example.test/hooks',
    })).rejects.toThrow('DATABASE_INSERT_ERROR');
  });

  it('maps database list rows, defaults empty results, and surfaces query errors', async () => {
    const { service } = makeService([{ data: [row({ consecutive_failure_count: null })], error: null }]);
    expect(await service.listSubscriptions('tenant-1', 'app-1')).toMatchObject([
      { id: 'sub-db-1', tenantId: 'tenant-1', consecutiveFailureCount: 0 },
    ]);

    const empty = makeService([{ data: null, error: null }]);
    await expect(empty.service.listSubscriptions('tenant-1', 'app-1')).resolves.toEqual([]);

    const failed = makeService([{ data: null, error: { message: 'query failed' } }]);
    await expect(failed.service.listSubscriptions('tenant-1', 'app-1')).rejects.toThrow('DATABASE_QUERY_ERROR');
  });

  it('maps owned database reads and returns null for missing or errored reads', async () => {
    const { service } = makeService([{ data: row(), error: null }]);
    expect(await service.getSubscription('tenant-1', 'app-1', 'sub-db-1')).toMatchObject({
      id: 'sub-db-1', tenantId: 'tenant-1', applicationId: 'app-1',
    });

    const missing = makeService([{ data: null, error: null }]);
    await expect(missing.service.getSubscription('tenant-1', 'app-1', 'missing')).resolves.toBeNull();

    const errored = makeService([{ data: null, error: { message: 'read failed' } }]);
    await expect(errored.service.getSubscription('tenant-1', 'app-1', 'sub-db-1')).resolves.toBeNull();
  });

  it('covers database update success, no-record, and update-error paths', async () => {
    const { service } = makeService([
      { data: row(), error: null },
      { data: row({ endpoint_url: 'https://example.test/new', status: 'paused' }), error: null },
    ]);
    const updated = await service.updateSubscription({
      tenantId: 'tenant-1', applicationId: 'app-1', subscriptionId: 'sub-db-1',
      endpointUrl: 'https://example.test/new', subscribedEvents: ['test.ping'], status: 'paused',
    });
    expect(updated).toMatchObject({ endpointUrl: 'https://example.test/new', status: 'paused' });
    expect(egress.validateAndPinEgressTarget).toHaveBeenCalledWith('https://example.test/new', { allowLocalhostInTest: undefined });

    const missing = makeService([{ data: null, error: null }]);
    await expect(missing.service.updateSubscription({
      tenantId: 'tenant-1', applicationId: 'app-1', subscriptionId: 'missing', status: 'disabled',
    })).resolves.toBeNull();

    const updateError = makeService([
      { data: row(), error: null },
      { data: null, error: { message: 'update rejected' } },
    ]);
    await expect(updateError.service.updateSubscription({
      tenantId: 'tenant-1', applicationId: 'app-1', subscriptionId: 'sub-db-1', status: 'paused',
    })).resolves.toBeNull();
  });

  it('covers database secret rotation success and failure', async () => {
    const successful = makeService([
      { data: row(), error: null },
      { data: { secret_ciphertext: Buffer.from('cipher'), secret_iv: Buffer.from('iv'), secret_tag: Buffer.from('tag') }, error: null },
    ]);
    const rotated = await successful.service.rotateSecret('tenant-1', 'app-1', 'sub-db-1');
    expect(rotated?.newSecret).toMatch(/^whsec_[a-f0-9]{64}$/);
    expect(rotated?.gracePeriodExpiresAt).toBeTruthy();

    const failed = makeService([
      { data: row(), error: null },
      { data: null, error: null },
    ], { message: 'rotation update failed' });
    await expect(failed.service.rotateSecret('tenant-1', 'app-1', 'sub-db-1'))
      .rejects.toThrow('SECRET_ROTATION_FAILED');
  });

  it('test-delivers through database fallback secret when encrypted secret row is absent', async () => {
    const { service } = makeService([
      { data: row(), error: null },
      { data: null, error: null },
    ]);
    const result = await service.testDelivery('tenant-1', 'app-1', 'sub-db-1', { allowLocalhostInTest: true });
    expect(result).toMatchObject({ endpointUrl: 'https://example.test/hooks', success: true, httpStatus: 204 });
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({
      endpointUrl: 'https://example.test/hooks',
      secret: expect.stringMatching(/^whsec_/),
      previousSecret: null,
    }));
  });

  it('publishes validated events through the configured durable queue provider', async () => {
    const { service, provider } = makeService();
    const payload = {
      event_id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: '2026-10-26T00:00:00.000Z',
      message: 'coverage',
    };
    await expect(service.publishEvent({
      tenantId: 'tenant-1', applicationId: 'app-1', eventType: 'test.ping', payload,
    })).resolves.toMatchObject({ eventId: 'event-db-1', enqueuedDeliveries: 3 });
    expect(provider.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1', applicationId: 'app-1', eventType: 'test.ping',
      payloadSha256: expect.any(String), payloadRaw: expect.any(String),
    }));
  });
});
