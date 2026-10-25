/**
 * tests/webhooks-api-endpoints.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Fastify REST API Routes & Multi-Tenant Isolation Suite
 *
 * Mandatory Verification Invariants:
 * 1. Authentication requirement: 401 UNAUTHORIZED_SAAS_KEY when SaaS auth is absent.
 * 2. Subscription creation: 201 Created with single-exposure plaintext signing secret.
 * 3. Secret non-leakage: GET/LIST endpoints never return plaintext secret, only hints/hashes.
 * 4. Multi-tenant isolation: Tenant B receives 404 Not Found when querying Tenant A's subscription.
 * 5. Cross-app isolation: App B receives 404 Not Found when querying App A's subscription under same tenant.
 * 6. Subscription lifecycle: PATCH update, POST disable, and POST rotate-secret.
 * 7. SSRF prevention at API ingress: Reject private IPs or non-HTTPS URLs on creation/update.
 */

import assert from 'node:assert';
import Fastify from 'fastify';
import { webhookRoutes } from '../apps/api/src/modules/webhooks/routes.ts';
import { webhookService } from '../apps/api/src/modules/webhooks/webhookService.ts';
import { InMemoryQueueProvider } from '../apps/api/src/modules/webhooks/queueProvider.ts';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY =
  process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

console.log('================================================================');
console.log('W022: FASTIFY REST API & MULTI-TENANT ISOLATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

async function runCheck(id: string, description: string, fn: () => Promise<void> | void) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function runAll() {
  // Ensure isolated in-memory queue provider is active for unit tests
  webhookService.setQueueProvider(new InMemoryQueueProvider());

  const app = Fastify({ logger: false });

  // Mock SaaS Auth Context Hook from request headers
  app.addHook('onRequest', async (req) => {
    const tenantId = req.headers['x-test-tenant-id'] as string;
    const applicationId = req.headers['x-test-application-id'] as string;
    if (tenantId && applicationId) {
      (req as any).saasAuth = { tenantId, applicationId };
    }
  });

  await app.register(webhookRoutes, { prefix: '/api/vsaas/v1/webhooks' });
  await app.ready();

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  const appA = 'app-alpha';
  const appB = 'app-beta';

  let subscriptionAId: string;
  let createdSecretA: string;

  // ─── 1. Authentication Invariants ───
  await runCheck('API-01', 'Reject request without SaaS auth context with 401 UNAUTHORIZED_SAAS_KEY', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vsaas/v1/webhooks',
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'UNAUTHORIZED_SAAS_KEY');
  });

  // ─── 2. Subscription Creation Invariants ───
  await runCheck('API-02', 'Create webhook subscription returns 201 with single-exposure plaintext secret', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
      payload: {
        endpointUrl: 'https://webhook.site/panin-test-hook',
        subscribedEvents: ['election.results.published', 'candidate.nomination.updated'],
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.subscription?.id);
    assert.ok(body.data.secret);
    assert.ok(body.data.secret.startsWith('whsec_'));

    subscriptionAId = body.data.subscription.id;
    createdSecretA = body.data.secret;
  });

  await runCheck('API-03', 'Reject subscription creation targeting private IP address (SSRF guard)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
      payload: {
        endpointUrl: 'https://192.168.1.1/internal-hook',
        subscribedEvents: ['test.ping'],
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'SSRF_VALIDATION_FAILED');
  });

  await runCheck('API-04', 'Reject subscription creation with non-HTTPS scheme (Fastify schema validation)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vsaas/v1/webhooks',
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
      payload: {
        endpointUrl: 'http://plain-http.example.com/hook',
        subscribedEvents: ['test.ping'],
      },
    });

    assert.strictEqual(res.statusCode, 400);
  });

  // ─── 3. Detail & Secret Non-Leakage Invariants ───
  await runCheck('API-05', 'GET /:id returns subscription details without exposing plaintext secret', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}`,
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    const sub = body.data.subscription;
    assert.strictEqual(sub.id, subscriptionAId);
    assert.strictEqual(sub.endpointUrl, 'https://webhook.site/panin-test-hook');
    assert.ok(sub.secretHint);
    assert.ok(sub.secretHash);
    // Plaintext secret must NEVER be returned in GET queries
    assert.strictEqual(sub.secret, undefined);
    assert.strictEqual(sub._encryptedSecret, undefined);
  });

  // ─── 4. List Subscriptions Invariant ───
  await runCheck('API-06', 'GET / lists all subscriptions belonging to authenticated tenant and application', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vsaas/v1/webhooks',
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.total, 1);
    assert.strictEqual(body.data.subscriptions[0].id, subscriptionAId);
  });

  // ─── 5. Multi-Tenant Negative Access Control Invariants ───
  await runCheck('API-07', 'Tenant B cannot view Tenant A subscription (404 WEBHOOK_NOT_FOUND)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}`,
      headers: {
        'x-test-tenant-id': tenantB, // Different tenant
        'x-test-application-id': appA,
      },
    });

    assert.strictEqual(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'WEBHOOK_NOT_FOUND');
  });

  await runCheck('API-08', 'Same tenant App B cannot view App A subscription (404 WEBHOOK_NOT_FOUND)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}`,
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appB, // Different application under same tenant
      },
    });

    assert.strictEqual(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'WEBHOOK_NOT_FOUND');
  });

  // ─── 6. Subscription Update Invariant ───
  await runCheck('API-09', 'PATCH /:id successfully updates subscribedEvents and status', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}`,
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
      payload: {
        subscribedEvents: ['boundary.delimitation.updated'],
        status: 'paused',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.subscription.status, 'paused');
    assert.deepStrictEqual(body.data.subscription.subscribedEvents, ['boundary.delimitation.updated']);
  });

  // ─── 7. Subscription Disable Invariant ───
  await runCheck('API-10', 'POST /:id/disable soft-disables the subscription', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}/disable`,
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.subscription.status, 'disabled');
  });

  // ─── 8. Secret Rotation Invariant ───
  await runCheck('API-11', 'POST /:id/rotate-secret generates new primary secret and updates hint', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vsaas/v1/webhooks/${subscriptionAId}/rotate-secret`,
      headers: {
        'x-test-tenant-id': tenantA,
        'x-test-application-id': appA,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.newSecret);
    assert.notStrictEqual(body.data.newSecret, createdSecretA);
    assert.ok(body.data.newSecret.startsWith('whsec_'));
    assert.ok(body.data.secretHint);
    assert.ok(body.data.gracePeriodExpiresAt);
  });

  // ─── Summary ───
  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');
  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled API test suite failure:', err);
  process.exit(1);
});
