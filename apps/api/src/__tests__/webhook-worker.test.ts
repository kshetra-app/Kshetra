import { WebhookWorker } from '../workers/webhookWorker';
import type { WebhookQueueProvider, LeasedDeliveryJob } from '../modules/webhooks/queueProvider';
import type { DispatchResult } from '../modules/webhooks/webhookDispatcher';
import * as dispatcher from '../modules/webhooks/webhookDispatcher';
import * as cryptoModule from '../modules/webhooks/crypto';

jest.mock('../modules/webhooks/webhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));
jest.mock('../modules/webhooks/crypto', () => ({
  decryptSecret: jest.fn(),
  getMasterEncryptionKey: jest.fn(() => Buffer.alloc(32)),
}));

const successResult: DispatchResult = {
  success: true,
  httpStatus: 204,
  executionDurationMs: 12,
  requestHeaders: { 'content-type': 'application/json' },
  responseHeaders: {},
  responseBodySample: '',
  errorMessage: undefined,
};

function makeJob(overrides: Record<string, unknown> = {}): LeasedDeliveryJob {
  return {
    delivery: {
      id: 'delivery-1',
      tenantId: 'tenant-1',
      subscriptionId: 'subscription-1',
      eventId: 'event-1',
      attemptCount: 1,
      status: 'leased',
      createdAt: new Date().toISOString(),
    } as any,
    subscription: {
      id: 'subscription-1',
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      endpointUrl: 'https://example.test/hook',
      subscribedEvents: ['*'],
      status: 'active',
      rawSecret: 'test-signing-secret',
    } as any,
    event: {
      id: 'event-1',
      tenantId: 'tenant-1',
      applicationId: 'app-1',
      eventType: 'record.created',
      payload: { id: 'record-1' },
      payloadRaw: '{"id":"record-1"}',
      payloadSha256: 'digest',
      createdAt: new Date().toISOString(),
    } as any,
    leaseToken: 'lease-1',
    ...overrides,
  } as LeasedDeliveryJob;
}

function makeProvider(overrides: Partial<WebhookQueueProvider> = {}): WebhookQueueProvider {
  return {
    enqueueEvent: jest.fn(),
    claimBatch: jest.fn().mockResolvedValue([]),
    completeDelivery: jest.fn().mockResolvedValue({ updated: true }),
    recoverExpiredLeases: jest.fn().mockResolvedValue(0),
    purgeExpiredData: jest.fn(),
    ...overrides,
  } as unknown as WebhookQueueProvider;
}

describe('WebhookWorker', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (dispatcher.dispatchWebhook as jest.Mock).mockResolvedValue(successResult);
    (cryptoModule.decryptSecret as jest.Mock).mockReturnValue('decrypted-secret');
  });

  afterAll(() => {
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });

  it('requires DATABASE_URL outside test mode when no provider is injected', () => {
    const oldEnv = process.env.NODE_ENV;
    const oldUrl = process.env.DATABASE_URL;
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    try {
      expect(() => new WebhookWorker()).toThrow(/DATABASE_URL must be configured/);
    } finally {
      process.env.NODE_ENV = oldEnv;
      if (oldUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = oldUrl;
    }
  });

  it('reports queue provider and activity state', () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    expect(worker.getQueueProvider()).toBe(provider);
    expect(worker.isActive()).toBe(false);
    expect(worker.getActiveJobCount()).toBe(0);
  });

  it('returns zero when a batch has no jobs', async () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    expect(await worker.tick()).toBe(0);
    expect(provider.recoverExpiredLeases).toHaveBeenCalledTimes(1);
    expect(provider.claimBatch).toHaveBeenCalledWith(10);
  });

  it('fails closed on claim failure and returns zero', async () => {
    const provider = makeProvider({
      claimBatch: jest.fn().mockRejectedValue(new Error('claim unavailable')),
    });
    const worker = new WebhookWorker({ queueProvider: provider });
    expect(await worker.tick()).toBe(0);
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Batch claim failed:', 'claim unavailable');
  });

  it('continues when lease recovery fails and still claims jobs', async () => {
    const provider = makeProvider({
      recoverExpiredLeases: jest.fn().mockRejectedValue(new Error('recovery unavailable')),
    });
    const worker = new WebhookWorker({ queueProvider: provider });
    expect(await worker.tick()).toBe(0);
    expect(provider.claimBatch).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Lease recovery failed:', 'recovery unavailable');
  });

  it('dispatches a raw-secret job and persists the lease-fenced result', async () => {
    const provider = makeProvider();
    const callback = jest.fn();
    const worker = new WebhookWorker({ queueProvider: provider, onJobProcessed: callback, allowLocalhostInTest: true });
    const job = makeJob();
    await expect(worker.processDeliveryJob(job)).resolves.toEqual(successResult);
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({
      endpointUrl: 'https://example.test/hook',
      secret: 'test-signing-secret',
      eventId: 'event-1',
      deliveryId: 'delivery-1',
      allowLocalhostInTest: true,
    }));
    expect(provider.completeDelivery).toHaveBeenCalledWith('delivery-1', 'lease-1', successResult);
    expect(callback).toHaveBeenCalledWith(job, successResult);
  });

  it('decrypts encrypted primary secrets with tenant and subscription context', async () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    const job = makeJob({
      subscription: {
        id: 'subscription-1', tenantId: 'tenant-1', applicationId: 'app-1',
        endpointUrl: 'https://example.test/hook', subscribedEvents: ['*'], status: 'active',
        secretCiphertext: Buffer.from('cipher'), secretIv: Buffer.from('iv'), secretTag: Buffer.from('tag'),
      },
    });
    await worker.processDeliveryJob(job);
    expect(cryptoModule.decryptSecret).toHaveBeenCalledWith({
      ciphertext: Buffer.from('cipher'), iv: Buffer.from('iv'), tag: Buffer.from('tag'),
    }, 'tenant-1', 'subscription-1');
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'decrypted-secret' }));
  });

  it('does not use an expired previous secret', async () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    const job = makeJob({
      subscription: {
        id: 'subscription-1', tenantId: 'tenant-1', applicationId: 'app-1',
        endpointUrl: 'https://example.test/hook', subscribedEvents: ['*'], status: 'active',
        rawSecret: 'primary', previousSecretCiphertext: Buffer.from('old'),
        previousSecretIv: Buffer.from('iv'), previousSecretTag: Buffer.from('tag'),
        previousSecretExpiresAt: '2000-01-01T00:00:00.000Z',
      },
    });
    await worker.processDeliveryJob(job);
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'primary', previousSecret: null }));
  });

  it('uses an unexpired previous secret when decryptable', async () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    const job = makeJob({
      subscription: {
        id: 'subscription-1', tenantId: 'tenant-1', applicationId: 'app-1',
        endpointUrl: 'https://example.test/hook', subscribedEvents: ['*'], status: 'active',
        rawSecret: 'primary', previousSecretCiphertext: Buffer.from('old'),
        previousSecretIv: Buffer.from('iv'), previousSecretTag: Buffer.from('tag'),
        previousSecretExpiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    await worker.processDeliveryJob(job);
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'primary', previousSecret: 'decrypted-secret' }));
  });

  it('continues with primary secret if previous-secret decryption fails', async () => {
    (cryptoModule.decryptSecret as jest.Mock)
      .mockReturnValueOnce('primary')
      .mockImplementationOnce(() => { throw new Error('bad previous secret'); });
    const worker = new WebhookWorker({ queueProvider: makeProvider() });
    const job = makeJob({
      subscription: {
        id: 'subscription-1', tenantId: 'tenant-1', applicationId: 'app-1',
        endpointUrl: 'https://example.test/hook', subscribedEvents: ['*'], status: 'active',
        secretCiphertext: Buffer.from('primary'), secretIv: Buffer.from('iv'), secretTag: Buffer.from('tag'),
        previousSecretCiphertext: Buffer.from('old'), previousSecretIv: Buffer.from('iv'),
        previousSecretTag: Buffer.from('tag'), previousSecretExpiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    await worker.processDeliveryJob(job);
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'primary', previousSecret: null }));
    expect(warn).toHaveBeenCalled();
  });

  it('records a missing-secret error without dispatching', async () => {
    const provider = makeProvider();
    const callback = jest.fn();
    const worker = new WebhookWorker({ queueProvider: provider, onJobProcessed: callback });
    const job = makeJob({ subscription: { id: 'subscription-1', endpointUrl: 'https://example.test/hook' } });
    const result = await worker.processDeliveryJob(job);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/MISSING_SECRET_CIPHERTEXT/);
    expect(dispatcher.dispatchWebhook).not.toHaveBeenCalled();
    expect(provider.completeDelivery).toHaveBeenCalledWith('delivery-1', 'lease-1', result);
    expect(callback).toHaveBeenCalledWith(job, result);
  });

  it('records dispatch failures as failed delivery results', async () => {
    (dispatcher.dispatchWebhook as jest.Mock).mockRejectedValue(new Error('network dispatcher failed'));
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider });
    const result = await worker.processDeliveryJob(makeJob());
    expect(result).toMatchObject({ success: false, errorMessage: 'network dispatcher failed', httpStatus: null });
    expect(provider.completeDelivery).toHaveBeenCalledWith('delivery-1', 'lease-1', result);
  });

  it('handles failure to persist a failed delivery result without throwing', async () => {
    (dispatcher.dispatchWebhook as jest.Mock).mockRejectedValue(new Error('network dispatcher failed'));
    const provider = makeProvider({ completeDelivery: jest.fn().mockRejectedValue(new Error('persistence failed')) });
    const worker = new WebhookWorker({ queueProvider: provider });
    await expect(worker.processDeliveryJob(makeJob())).resolves.toMatchObject({ success: false, errorMessage: 'network dispatcher failed' });
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Failed to record error state for delivery delivery-1:', 'persistence failed');
  });

  it('warns when lease-token fencing rejects a stale completion', async () => {
    const provider = makeProvider({ completeDelivery: jest.fn().mockResolvedValue({ updated: false }) });
    const worker = new WebhookWorker({ queueProvider: provider });
    await worker.processDeliveryJob(makeJob());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Lease token fencing dropped stale completion'));
  });

  it('returns number of claimed jobs after processing them in bounded concurrency chunks', async () => {
    const jobs = [makeJob(), makeJob({ delivery: { id: 'delivery-2', tenantId: 'tenant-1', subscriptionId: 'subscription-1' } as any })];
    const provider = makeProvider({ claimBatch: jest.fn().mockResolvedValue(jobs) });
    const worker = new WebhookWorker({ queueProvider: provider, concurrency: 1 });
    expect(await worker.tick()).toBe(2);
    expect(provider.completeDelivery).toHaveBeenCalledTimes(2);
  });

  it('starts idempotently and stops gracefully', async () => {
    const provider = makeProvider();
    const worker = new WebhookWorker({ queueProvider: provider, pollIntervalMs: 1 });
    await worker.start();
    await worker.start();
    expect(worker.isActive()).toBe(true);
    await worker.stop(50);
    expect(worker.isActive()).toBe(false);
  });

  it('stop is a no-op when the worker is not active', async () => {
    const worker = new WebhookWorker({ queueProvider: makeProvider() });
    await expect(worker.stop()).resolves.toBeUndefined();
    expect(worker.isActive()).toBe(false);
  });
});
