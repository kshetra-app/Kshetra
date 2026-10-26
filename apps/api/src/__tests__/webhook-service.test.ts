import * as egress from '../modules/webhooks/antiSsrfGuard';
import * as dispatcher from '../modules/webhooks/webhookDispatcher';
import { WebhookService } from '../modules/webhooks/webhookService';
import { InMemoryQueueProvider } from '../modules/webhooks/queueProvider';

jest.mock('../modules/webhooks/antiSsrfGuard', () => ({
  validateAndPinEgressTarget: jest.fn(),
}));
jest.mock('../modules/webhooks/webhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));

describe('WebhookService in-memory subscription and event lifecycle', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldKey = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
  let queue: InMemoryQueueProvider;
  let service: WebhookService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    jest.clearAllMocks();
    (egress.validateAndPinEgressTarget as jest.Mock).mockResolvedValue({
      hostname: 'example.test', pinnedIp: '8.8.8.8',
    });
    (dispatcher.dispatchWebhook as jest.Mock).mockResolvedValue({
      success: true, httpStatus: 204, executionDurationMs: 3, requestHeaders: {}, responseHeaders: {},
      responseBodySample: '',
    });
    queue = new InMemoryQueueProvider();
    service = new WebhookService(undefined as any, queue);
  });

  afterAll(() => {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldKey === undefined) delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    else process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = oldKey;
  });

  it('creates a subscription after SSRF preflight and discloses the secret only in the create result', async () => {
    const result = await service.createSubscription({
      tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/hook',
      subscribedEvents: ['test.ping'],
    });
    expect(egress.validateAndPinEgressTarget).toHaveBeenCalledWith('https://example.test/hook', { allowLocalhostInTest: undefined });
    expect(result.secret).toMatch(/^whsec_[a-f0-9]{64}$/);
    expect(result.subscription).not.toHaveProperty('_rawSecret');
    expect(result.subscription).toMatchObject({ tenantId: 'tenant-a', applicationId: 'app-a', status: 'active', subscribedEvents: ['test.ping'] });
    expect(queue.subscriptions.has(result.subscription.id)).toBe(true);
  });

  it('does not create a subscription if SSRF preflight rejects the endpoint', async () => {
    (egress.validateAndPinEgressTarget as jest.Mock).mockRejectedValueOnce(new Error('BLOCKED_PRIVATE_IP_ADDRESS'));
    await expect(service.createSubscription({
      tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://127.0.0.1/hook',
    })).rejects.toThrow('BLOCKED_PRIVATE_IP_ADDRESS');
    expect(queue.subscriptions.size).toBe(0);
  });

  it('lists only subscriptions matching both tenant and application', async () => {
    const a = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-b', endpointUrl: 'https://example.test/b' });
    await service.createSubscription({ tenantId: 'tenant-b', applicationId: 'app-a', endpointUrl: 'https://example.test/c' });
    expect(await service.listSubscriptions('tenant-a', 'app-a')).toEqual([a.subscription]);
  });

  it('enforces tenant/application ownership on reads and missing subscriptions', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    expect(await service.getSubscription('tenant-a', 'app-a', created.subscription.id)).toEqual(created.subscription);
    expect(await service.getSubscription('tenant-b', 'app-a', created.subscription.id)).toBeNull();
    expect(await service.getSubscription('tenant-a', 'app-b', created.subscription.id)).toBeNull();
    expect(await service.getSubscription('tenant-a', 'app-a', 'missing')).toBeNull();
  });

  it('updates endpoint/events/status and validates replacement endpoint before persistence', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    const updated = await service.updateSubscription({
      tenantId: 'tenant-a', applicationId: 'app-a', subscriptionId: created.subscription.id,
      endpointUrl: 'https://example.test/b', subscribedEvents: ['test.ping'], status: 'paused',
    });
    expect(updated).toMatchObject({ endpointUrl: 'https://example.test/b', subscribedEvents: ['test.ping'], status: 'paused' });
    expect(egress.validateAndPinEgressTarget).toHaveBeenLastCalledWith('https://example.test/b', { allowLocalhostInTest: undefined });
  });

  it('returns null for updates against an unowned subscription', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    expect(await service.updateSubscription({
      tenantId: 'tenant-b', applicationId: 'app-a', subscriptionId: created.subscription.id, status: 'disabled',
    })).toBeNull();
  });

  it('disables a subscription through the normal update path', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    const disabled = await service.disableSubscription('tenant-a', 'app-a', created.subscription.id);
    expect(disabled?.status).toBe('disabled');
  });

  it('rotates the secret, retains only a previous-secret transition internally, and returns grace expiry', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    const oldSecret = (queue.subscriptions.get(created.subscription.id) as any)._rawSecret;
    const rotated = await service.rotateSecret('tenant-a', 'app-a', created.subscription.id);
    expect(rotated?.newSecret).toMatch(/^whsec_[a-f0-9]{64}$/);
    expect(rotated?.newSecret).not.toBe(oldSecret);
    expect(rotated?.gracePeriodExpiresAt).toBeTruthy();
    expect((queue.subscriptions.get(created.subscription.id) as any)._previousSecret).toBe(oldSecret);
    expect(await service.rotateSecret('tenant-b', 'app-a', created.subscription.id)).toBeNull();
  });

  it('test-delivers only to an owned subscription and returns bounded public result fields', async () => {
    const created = await service.createSubscription({ tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a' });
    expect(await service.testDelivery('tenant-b', 'app-a', created.subscription.id)).toBeNull();
    const result = await service.testDelivery('tenant-a', 'app-a', created.subscription.id);
    expect(result).toMatchObject({ endpointUrl: 'https://example.test/a', success: true, httpStatus: 204 });
    expect(dispatcher.dispatchWebhook).toHaveBeenCalledWith(expect.objectContaining({
      endpointUrl: 'https://example.test/a', secret: created.secret,
    }));
  });

  it('publishes only valid allowlisted events and canonicalizes the payload', async () => {
    const subscription = await service.createSubscription({
      tenantId: 'tenant-a', applicationId: 'app-a', endpointUrl: 'https://example.test/a', subscribedEvents: ['test.ping'],
    });
    const payload = {
      event_id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: '2026-10-26T00:00:00.000Z',
      message: 'hello',
    };
    const result = await service.publishEvent({
      tenantId: 'tenant-a', applicationId: 'app-a', eventType: 'test.ping', idempotencyKey: 'ping-1', payload,
    });
    expect(result).toMatchObject({ deduplicated: false, enqueuedDeliveries: 1 });
    expect(queue.events.get(result.eventId)?.payloadRaw).toBe('{"event_id":"123e4567-e89b-12d3-a456-426614174000","message":"hello","timestamp":"2026-10-26T00:00:00.000Z"}');
    await expect(service.publishEvent({
      tenantId: 'tenant-a', applicationId: 'app-a', eventType: 'not.allowed', payload,
    })).rejects.toThrow('UNSUPPORTED_EVENT_TYPE');
    await expect(service.publishEvent({
      tenantId: 'tenant-a', applicationId: '', eventType: 'test.ping', payload,
    })).rejects.toThrow('applicationId is required');
    expect(subscription.subscription.status).toBe('active');
  });

  it('returns the provider and supports replacing it explicitly', () => {
    expect(service.getQueueProvider()).toBe(queue);
    const other = new InMemoryQueueProvider();
    service.setQueueProvider(other);
    expect(service.getQueueProvider()).toBe(other);
  });
});
