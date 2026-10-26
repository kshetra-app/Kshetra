import { WebhookWorker, type WebhookWorkerOptions } from '../workers/webhookWorker';
import type { LeasedDeliveryJob, WebhookQueueProvider } from '../modules/webhooks/queueProvider';
import type { DispatchResult } from '../modules/webhooks/webhookDispatcher';
import { decryptSecret, getMasterEncryptionKey } from '../modules/webhooks/crypto';
import { dispatchWebhook } from '../modules/webhooks/webhookDispatcher';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../modules/webhooks/crypto', () => ({
  decryptSecret: jest.fn(),
  getMasterEncryptionKey: jest.fn(() => Buffer.alloc(32)),
}));
jest.mock('../modules/webhooks/webhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));

const successfulDispatch: DispatchResult = {
  success: true,
  httpStatus: 204,
  executionDurationMs: 4,
  requestHeaders: { 'x-pan-in-signature': 't=1,v1=abc' },
  responseHeaders: {},
  responseBodySample: '',
};

const makeJob = (overrides: Record<string, any> = {}): LeasedDeliveryJob => ({
  delivery: { id: 'delivery-1', tenantId: 'tenant-1', subscriptionId: 'sub-1' } as any,
  subscription: {
    id: 'sub-1',
    tenantId: 'tenant-1',
    endpointUrl: 'https://hooks.example.test/events',
    rawSecret: 'test-secret',
  } as any,
  event: { id: 'event-1', payloadRaw: '{"ok":true}', payloadSha256: 'abc123' } as any,
  leaseToken: 'lease-1',
  ...overrides,
});

const makeProvider = (overrides: Record<string, any> = {}): WebhookQueueProvider =>
  ({
    recoverExpiredLeases: jest.fn().mockResolvedValue(0),
    claimBatch: jest.fn().mockResolvedValue([]),
    completeDelivery: jest.fn().mockResolvedValue({ updated: true }),
    enqueueEvent: jest.fn(),
    purgeExpiredData: jest.fn(),
    ...overrides,
  }) as unknown as WebhookQueueProvider;

describe('WebhookWorker branch and lifecycle coverage', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
    (dispatchWebhook as jest.Mock).mockResolvedValue(successfulDispatch);
    (decryptSecret as jest.Mock).mockReturnValue('decrypted-secret');
    (getMasterEncryptionKey as jest.Mock).mockReturnValue(Buffer.alloc(32));
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('uses the in-memory provider in test mode and applies default options', () => {
    const worker = new WebhookWorker();
    expect(worker.getQueueProvider()).toBeDefined();
    expect(worker.isActive()).toBe(false);
    expect(worker.getActiveJobCount()).toBe(0);
  });

  it('requires a database URL outside test mode and validates the encryption key when configured', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    expect(() => new WebhookWorker()).toThrow('CONFIG_ERROR: DATABASE_URL must be configured');

    process.env.DATABASE_URL = 'postgres://example.invalid/db';
    (getMasterEncryptionKey as jest.Mock).mockImplementation(() => {
      throw new Error('CONFIG_ERROR: invalid encryption key');
    });
    expect(() => new WebhookWorker()).toThrow('CONFIG_ERROR: invalid encryption key');
    expect(getMasterEncryptionKey).toHaveBeenCalled();
  });

  it('recovers expired leases, logs positive recovery, and returns zero for an empty batch', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider({
      recoverExpiredLeases: jest.fn().mockResolvedValue(2),
      claimBatch: jest.fn().mockResolvedValue([]),
    });
    const worker = new WebhookWorker({ queueProvider: provider });
    await expect(worker.tick()).resolves.toBe(0);
    expect(provider.recoverExpiredLeases).toHaveBeenCalledTimes(1);
    expect(provider.claimBatch).toHaveBeenCalledWith(10);
    expect(log).toHaveBeenCalledWith('[WebhookWorker] Recovered 2 expired leases.');
    log.mockRestore();
  });

  it('continues after lease-recovery failure and reports a batch-claim failure as zero work', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider = makeProvider({
      recoverExpiredLeases: jest.fn().mockRejectedValue(new Error('recovery offline')),
      claimBatch: jest.fn().mockRejectedValue(new Error('claim offline')),
    });
    const worker = new WebhookWorker({ queueProvider: provider });
    await expect(worker.tick()).resolves.toBe(0);
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Lease recovery failed:', 'recovery offline');
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Batch claim failed:', 'claim offline');
    error.mockRestore();
  });

  it('processes batches in bounded concurrency chunks and tracks active promises', async () => {
    const jobs = [makeJob(), makeJob({ leaseToken: 'lease-2' }), makeJob({ leaseToken: 'lease-3' })];
    const provider = makeProvider({ claimBatch: jest.fn().mockResolvedValue(jobs) });
    const worker = new WebhookWorker({ queueProvider: provider, concurrency: 2 });
    const process = jest.spyOn(worker, 'processDeliveryJob').mockImplementation(async () => successfulDispatch);
    await expect(worker.tick()).resolves.toBe(3);
    expect(process).toHaveBeenCalledTimes(3);
    expect(worker.getActiveJobCount()).toBe(0);
    process.mockRestore();
  });

  it('stops before processing a claimed batch when shutdown was requested', async () => {
    const provider = makeProvider({ claimBatch: jest.fn().mockResolvedValue([makeJob()]) });
    const worker = new WebhookWorker({ queueProvider: provider });
    (worker as any).stopRequested = true;
    const process = jest.spyOn(worker, 'processDeliveryJob');
    await expect(worker.tick()).resolves.toBe(1);
    expect(process).not.toHaveBeenCalled();
    process.mockRestore();
  });

  it('decrypts an encrypted primary secret, accepts a valid previous secret, and completes delivery', async () => {
    const job = makeJob({
      subscription: {
        id: 'sub-1',
        endpointUrl: 'https://hooks.example.test/events',
        secretCiphertext: Buffer.from('cipher'),
        secretIv: Buffer.from('iv'),
        secretTag: Buffer.from('tag'),
        previousSecretCiphertext: Buffer.from('old-cipher'),
        previousSecretIv: Buffer.from('old-iv'),
        previousSecretTag: Buffer.from('old-tag'),
        previousSecretExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const provider = makeProvider();
    const callback = jest.fn();
    const worker = new WebhookWorker({ queueProvider: provider, onJobProcessed: callback });
    await expect(worker.processDeliveryJob(job)).resolves.toEqual(successfulDispatch);
    expect(decryptSecret).toHaveBeenCalledTimes(2);
    expect(dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({
      secret: 'decrypted-secret',
      previousSecret: 'decrypted-secret',
      eventId: 'event-1',
      deliveryId: 'delivery-1',
    }));
    expect(provider.completeDelivery).toHaveBeenCalledWith('delivery-1', 'lease-1', successfulDispatch);
    expect(callback).toHaveBeenCalledWith(job, successfulDispatch);
  });

  it('does not decrypt an expired previous secret and warns when lease fencing rejects completion', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const job = makeJob({
      subscription: {
        id: 'sub-1',
        endpointUrl: 'https://hooks.example.test/events',
        rawSecret: 'primary-secret',
        previousSecretCiphertext: Buffer.from('old-cipher'),
        previousSecretIv: Buffer.from('old-iv'),
        previousSecretTag: Buffer.from('old-tag'),
        previousSecretExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    const provider = makeProvider({ completeDelivery: jest.fn().mockResolvedValue({ updated: false }) });
    const worker = new WebhookWorker({ queueProvider: provider });
    await worker.processDeliveryJob(job);
    expect(decryptSecret).not.toHaveBeenCalled();
    expect(dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'primary-secret', previousSecret: null }));
    expect(warn).toHaveBeenCalledWith('[WebhookWorker] Lease token fencing dropped stale completion for delivery delivery-1');
    warn.mockRestore();
  });

  it('warns but still dispatches when decrypting the previous secret fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (decryptSecret as jest.Mock).mockReturnValueOnce('primary-secret').mockImplementationOnce(() => {
      throw new Error('old secret corrupt');
    });
    const job = makeJob({
      subscription: {
        id: 'sub-1',
        endpointUrl: 'https://hooks.example.test/events',
        secretCiphertext: Buffer.from('cipher'),
        secretIv: Buffer.from('iv'),
        secretTag: Buffer.from('tag'),
        previousSecretCiphertext: Buffer.from('old-cipher'),
        previousSecretIv: Buffer.from('old-iv'),
        previousSecretTag: Buffer.from('old-tag'),
        previousSecretExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const worker = new WebhookWorker({ queueProvider: makeProvider() });
    await worker.processDeliveryJob(job);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Failed to decrypt previous secret'));
    expect(dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({ secret: 'primary-secret', previousSecret: null }));
    warn.mockRestore();
  });

  it('fails closed when neither encrypted nor raw signing secret is present', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider = makeProvider();
    const callback = jest.fn();
    const worker = new WebhookWorker({ queueProvider: provider, onJobProcessed: callback });
    const job = makeJob({ subscription: { id: 'sub-1', endpointUrl: 'https://hooks.example.test/events' } });
    const result = await worker.processDeliveryJob(job);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('MISSING_SECRET_CIPHERTEXT');
    expect(dispatchWebhook).not.toHaveBeenCalled();
    expect(provider.completeDelivery).toHaveBeenCalledWith('delivery-1', 'lease-1', expect.objectContaining({ success: false }));
    expect(callback).toHaveBeenCalledWith(job, result);
    error.mockRestore();
  });

  it('records dispatch/completion exceptions as a failed result and survives a failed error-state write', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (dispatchWebhook as jest.Mock).mockRejectedValueOnce(new Error('dispatcher crashed'));
    const provider = makeProvider({ completeDelivery: jest.fn().mockRejectedValue(new Error('database unavailable')) });
    const worker = new WebhookWorker({ queueProvider: provider });
    const result = await worker.processDeliveryJob(makeJob());
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('dispatcher crashed');
    expect(provider.completeDelivery).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Unhandled error processing delivery delivery-1:', 'dispatcher crashed');
    expect(error).toHaveBeenCalledWith('[WebhookWorker] Failed to record error state for delivery delivery-1:', 'database unavailable');
    error.mockRestore();
  });

  it('makes start idempotent and supports a graceful empty-queue shutdown', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = makeProvider({ claimBatch: jest.fn().mockResolvedValue([]) });
    const worker = new WebhookWorker({ queueProvider: provider, pollIntervalMs: 1 });
    await worker.stop();
    await worker.start();
    await worker.start();
    expect(worker.isActive()).toBe(true);
    await worker.stop(100);
    expect(worker.isActive()).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Started background worker'));
    expect(log).toHaveBeenCalledWith('[WebhookWorker] Shutdown complete.');
    log.mockRestore();
  });
});
