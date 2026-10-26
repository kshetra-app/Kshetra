import Fastify, { type FastifyInstance } from 'fastify';
import { webhookRoutes } from '../modules/webhooks/routes';
import { webhookService } from '../modules/webhooks/webhookService';

const webhookId = '123e4567-e89b-12d3-a456-426614174000';
const subscription = {
  id: webhookId,
  tenantId: 'tenant-1',
  applicationId: 'app-1',
  endpointUrl: 'https://example.test/hooks',
  secretHint: 'whsec_…1234',
  secretHash: 'hash',
  subscribedEvents: ['test.ping'],
  status: 'active',
  consecutiveFailureCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Webhook SaaS REST routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.addHook('preHandler', async (request) => {
      if (request.headers['x-test-no-auth'] !== 'true') {
        (request as any).saasAuth = { tenantId: 'tenant-1', applicationId: 'app-1' };
      }
    });
    await app.register(webhookRoutes, { prefix: '/api/vsaas/v1/webhooks' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('requires SaaS context for all route families', async () => {
    const requests = [
      { method: 'GET', url: '/api/vsaas/v1/webhooks' },
      { method: 'GET', url: `/api/vsaas/v1/webhooks/${webhookId}` },
      { method: 'POST', url: '/api/vsaas/v1/webhooks', payload: { endpointUrl: 'https://example.test/hooks' } },
      { method: 'PATCH', url: `/api/vsaas/v1/webhooks/${webhookId}`, payload: { status: 'paused' } },
      { method: 'POST', url: `/api/vsaas/v1/webhooks/${webhookId}/disable` },
      { method: 'POST', url: '/api/vsaas/v1/webhooks/events', payload: { eventType: 'test.ping', payload: {} } },
    ] as const;
    for (const request of requests) {
      const response = await app.inject({
        ...request,
        headers: { 'x-test-no-auth': 'true' },
      } as any);
      expect(response.statusCode).toBe(401);
    }
  });

  it('creates a subscription and maps SSRF versus generic creation errors', async () => {
    jest.spyOn(webhookService, 'createSubscription').mockResolvedValueOnce({
      subscription: subscription as any,
      secret: 'one-time-secret',
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      payload: { endpointUrl: 'https://example.test/hooks', subscribedEvents: ['test.ping'] },
    });
    expect(created.statusCode).toBe(201);
    expect(JSON.parse(created.payload).data.secret).toBe('one-time-secret');

    jest.spyOn(webhookService, 'createSubscription').mockRejectedValueOnce(new Error('BLOCKED_PRIVATE_IP_ADDRESS'));
    const ssrfRejected = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      payload: { endpointUrl: 'https://example.test/hooks' },
    });
    expect(ssrfRejected.statusCode).toBe(400);
    expect(JSON.parse(ssrfRejected.payload).code).toBe('SSRF_VALIDATION_FAILED');

    jest.spyOn(webhookService, 'createSubscription').mockRejectedValueOnce(new Error('database unavailable'));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      payload: { endpointUrl: 'https://example.test/hooks' },
    });
    expect(failed.statusCode).toBe(400);
    expect(JSON.parse(failed.payload).code).toBe('WEBHOOK_CREATION_FAILED');
  });

  it('lists subscriptions and handles query failure', async () => {
    jest.spyOn(webhookService, 'listSubscriptions').mockResolvedValueOnce([subscription] as any);
    const response = await app.inject({ method: 'GET', url: '/api/vsaas/v1/webhooks' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data).toMatchObject({ total: 1 });

    jest.spyOn(webhookService, 'listSubscriptions').mockRejectedValueOnce(new Error('query unavailable'));
    const failed = await app.inject({ method: 'GET', url: '/api/vsaas/v1/webhooks' });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe('QUERY_FAILED');
  });

  it('gets a subscription, handles not-found, and maps service exceptions', async () => {
    jest.spyOn(webhookService, 'getSubscription').mockResolvedValueOnce(subscription as any);
    const found = await app.inject({ method: 'GET', url: `/api/vsaas/v1/webhooks/${webhookId}` });
    expect(found.statusCode).toBe(200);

    jest.spyOn(webhookService, 'getSubscription').mockResolvedValueOnce(null as any);
    const missing = await app.inject({ method: 'GET', url: `/api/vsaas/v1/webhooks/${webhookId}` });
    expect(missing.statusCode).toBe(404);

    jest.spyOn(webhookService, 'getSubscription').mockRejectedValueOnce(new Error('read failed'));
    const failed = await app.inject({ method: 'GET', url: `/api/vsaas/v1/webhooks/${webhookId}` });
    expect(failed.statusCode).toBe(500);
  });

  it('updates subscriptions and handles missing records and validation errors', async () => {
    jest.spyOn(webhookService, 'updateSubscription').mockResolvedValueOnce({ ...subscription, status: 'paused' } as any);
    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/vsaas/v1/webhooks/${webhookId}`,
      payload: { status: 'paused' },
    });
    expect(updated.statusCode).toBe(200);

    jest.spyOn(webhookService, 'updateSubscription').mockResolvedValueOnce(null as any);
    const missing = await app.inject({
      method: 'PATCH',
      url: `/api/vsaas/v1/webhooks/${webhookId}`,
      payload: { status: 'paused' },
    });
    expect(missing.statusCode).toBe(404);

    jest.spyOn(webhookService, 'updateSubscription').mockRejectedValueOnce(new Error('invalid endpoint'));
    const failed = await app.inject({
      method: 'PATCH',
      url: `/api/vsaas/v1/webhooks/${webhookId}`,
      payload: { status: 'paused' },
    });
    expect(failed.statusCode).toBe(400);
    expect(JSON.parse(failed.payload).code).toBe('UPDATE_FAILED');
  });

  it.each([
    ['disableSubscription', 'POST', `/api/vsaas/v1/webhooks/${webhookId}/disable`, 'DISABLE_FAILED'],
    ['rotateSecret', 'POST', `/api/vsaas/v1/webhooks/${webhookId}/rotate-secret`, 'ROTATION_FAILED'],
  ] as const)('handles success, not-found and exception paths for %s', async (method, httpMethod, url, errorCode) => {
    const spy = jest.spyOn(webhookService, method as any);
    spy.mockResolvedValueOnce(subscription as any);
    expect((await app.inject({ method: httpMethod, url })).statusCode).toBe(200);

    spy.mockResolvedValueOnce(null as any);
    expect((await app.inject({ method: httpMethod, url })).statusCode).toBe(404);

    spy.mockRejectedValueOnce(new Error('service failure'));
    const failed = await app.inject({ method: httpMethod, url });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe(errorCode);
  });

  it('tests synchronous delivery success, not-found and failure', async () => {
    jest.spyOn(webhookService, 'testDelivery').mockResolvedValueOnce({ status: 'delivered' } as any);
    expect((await app.inject({ method: 'POST', url: `/api/vsaas/v1/webhooks/${webhookId}/test` })).statusCode).toBe(200);

    jest.spyOn(webhookService, 'testDelivery').mockResolvedValueOnce(null as any);
    expect((await app.inject({ method: 'POST', url: `/api/vsaas/v1/webhooks/${webhookId}/test` })).statusCode).toBe(404);

    jest.spyOn(webhookService, 'testDelivery').mockRejectedValueOnce(new Error('delivery failed'));
    const failed = await app.inject({ method: 'POST', url: `/api/vsaas/v1/webhooks/${webhookId}/test` });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe('TEST_DELIVERY_FAILED');
  });

  it('validates event body, returns 201/200 for new/deduplicated events, and classifies errors', async () => {
    const missing = await app.inject({ method: 'POST', url: '/api/vsaas/v1/webhooks/events', payload: {} });
    expect(missing.statusCode).toBe(400);
    expect(JSON.parse(missing.payload).code).toBe('INVALID_EVENT_BODY');

    jest.spyOn(webhookService, 'publishEvent').mockResolvedValueOnce({ deduplicated: false, eventId: 'event-1' } as any);
    const created = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks/events',
      payload: { eventType: 'test.ping', payload: { message: 'hello' } },
    });
    expect(created.statusCode).toBe(201);

    jest.spyOn(webhookService, 'publishEvent').mockResolvedValueOnce({ deduplicated: true, eventId: 'event-1' } as any);
    const deduplicated = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks/events',
      payload: { eventType: 'test.ping', payload: { message: 'hello' } },
    });
    expect(deduplicated.statusCode).toBe(200);

    jest.spyOn(webhookService, 'publishEvent').mockRejectedValueOnce(new Error('VALIDATION_ERROR: missing field'));
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks/events',
      payload: { eventType: 'test.ping', payload: { message: 'hello' } },
    });
    expect(invalid.statusCode).toBe(422);
    expect(JSON.parse(invalid.payload).code).toBe('PAYLOAD_VALIDATION_FAILED');

    jest.spyOn(webhookService, 'publishEvent').mockRejectedValueOnce(new Error('database failure'));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks/events',
      payload: { eventType: 'test.ping', payload: { message: 'hello' } },
    });
    expect(failed.statusCode).toBe(400);
    expect(JSON.parse(failed.payload).code).toBe('EVENT_PUBLISH_FAILED');
  });
});
