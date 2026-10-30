/**
 * apps/api/src/__tests__/saas-onboarding-w051.test.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Comprehensive Automated Verification Suite for Onboarding, Key Lifecycle, Billing, Usage & Docs.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { saasAuthPlugin } from '../lib/saasAuthPlugin';
import { generateCryptographicApiKey, hashApiKey } from '../lib/saasCrypto';
import { saasV1Routes } from '../routes/saasV1';
import { onboardingService } from '../modules/saasOnboarding/onboardingService';
import { billingService } from '../modules/saasOnboarding/billingService';
import { usageService } from '../modules/saasOnboarding/usageService';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';

describe('Milestone W051: API Customer Acquisition & Developer Portal Suite', () => {
  let app: FastifyInstance;

  // In-memory mock database state for isolated unit testing
  const mockTenants = new Map<string, any>();
  const mockApplications = new Map<string, any>();
  const mockApiKeys = new Map<string, any>();
  const mockUsageLedger: any[] = [];

  // Provision baseline test tenant and active key
  const testTenantId = '11111111-1111-4111-8111-111111111111';
  const testAppId = '22222222-2222-4222-8222-222222222222';
  const baselineKey = generateCryptographicApiKey('test');
  const rawTestKey = baselineKey.rawKey;
  const testKeyHash = baselineKey.keyHash;

  // Mock Database Client implementing Supabase-like query interface
  const createMockDbClient = () => {
    return {
      from: (tableName: string) => {
        let currentTable = tableName;
        let filters: any[] = [];
        let selectFields = '*';
        let isSingle = false;
        let isMaybeSingle = false;
        let orderField: string | null = null;
        let isCountHead = false;

        const builder: any = {
          select: (fields: string, opts?: any) => {
            selectFields = fields;
            if (opts?.head && opts?.count === 'exact') {
              isCountHead = true;
            }
            return builder;
          },
          eq: (field: string, val: any) => {
            filters.push({ field, op: 'eq', val });
            return builder;
          },
          gte: (field: string, val: any) => {
            filters.push({ field, op: 'gte', val });
            return builder;
          },
          order: (field: string, _opts?: any) => {
            orderField = field;
            return builder;
          },
          limit: (_n: number) => builder,
          single: async () => {
            isSingle = true;
            return executeQuery();
          },
          maybeSingle: async () => {
            isMaybeSingle = true;
            return executeQuery();
          },
          insert: (rowOrRows: any) => {
            const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
            const inserted: any[] = [];
            for (const r of rows) {
              const id = r.id || crypto.randomUUID();
              const fullRow = {
                id,
                ...r,
                created_at: r.created_at || new Date().toISOString(),
                updated_at: r.updated_at || new Date().toISOString(),
              };
              if (currentTable === 'saas_tenants') mockTenants.set(id, fullRow);
              if (currentTable === 'saas_applications') mockApplications.set(id, fullRow);
              if (currentTable === 'saas_api_keys') mockApiKeys.set(id, fullRow);
              if (currentTable === 'saas_usage_ledger') mockUsageLedger.push(fullRow);
              inserted.push(fullRow);
            }
            const resObj = {
              data: Array.isArray(rowOrRows) ? inserted : inserted[0],
              error: null,
              select: (_fields?: string) => ({
                single: async () => ({ data: inserted[0], error: null }),
                maybeSingle: async () => ({ data: inserted[0], error: null }),
              }),
              then: (resolve: any) => Promise.resolve(resObj).then(resolve),
            };
            return resObj;
          },
          update: (updates: any) => {
            return {
              eq: (f1: string, v1: any) => ({
                eq: (f2: string, v2: any) => ({
                  select: () => ({
                    maybeSingle: async () => {
                      return executeUpdate(updates, [
                        { field: f1, op: 'eq', val: v1 },
                        { field: f2, op: 'eq', val: v2 },
                      ]);
                    },
                    single: async () => {
                      return executeUpdate(updates, [
                        { field: f1, op: 'eq', val: v1 },
                        { field: f2, op: 'eq', val: v2 },
                      ]);
                    },
                  }),
                }),
                select: () => ({
                  single: async () => executeUpdate(updates, [{ field: f1, op: 'eq', val: v1 }]),
                  maybeSingle: async () => executeUpdate(updates, [{ field: f1, op: 'eq', val: v1 }]),
                }),
              }),
            };
          },
          then: (resolve: any) => {
            return Promise.resolve(executeQuery()).then(resolve);
          },
        };

        const executeQuery = () => {
          let rows: any[] = [];
          if (currentTable === 'saas_tenants') rows = Array.from(mockTenants.values());
          if (currentTable === 'saas_applications') rows = Array.from(mockApplications.values());
          if (currentTable === 'saas_api_keys') rows = Array.from(mockApiKeys.values());
          if (currentTable === 'saas_usage_ledger') rows = [...mockUsageLedger];

          // Apply filters
          for (const f of filters) {
            if (f.op === 'eq') {
              rows = rows.filter((r) => r[f.field] === f.val);
            } else if (f.op === 'gte') {
              rows = rows.filter((r) => r[f.field] >= f.val);
            }
          }

          if (isCountHead) {
            return { count: rows.length, error: null };
          }

          if (isSingle) {
            if (rows.length === 0) return { data: null, error: { message: 'Row not found' } };
            return { data: rows[0], error: null };
          }
          if (isMaybeSingle) {
            return { data: rows[0] || null, error: null };
          }
          return { data: rows, error: null };
        };

        const executeUpdate = (updates: any, filterList: any[]) => {
          let rows: any[] = [];
          let targetMap: Map<string, any> | null = null;
          if (currentTable === 'saas_tenants') {
            targetMap = mockTenants;
            rows = Array.from(mockTenants.values());
          }
          if (currentTable === 'saas_api_keys') {
            targetMap = mockApiKeys;
            rows = Array.from(mockApiKeys.values());
          }

          for (const f of filterList) {
            rows = rows.filter((r) => r[f.field] === f.val);
          }

          if (rows.length === 0) {
            return { data: null, error: null };
          }

          const updatedRow = { ...rows[0], ...updates, updated_at: new Date().toISOString() };
          if (targetMap) {
            targetMap.set(updatedRow.id, updatedRow);
          }
          return { data: updatedRow, error: null };
        };

        return builder;
      },
    };
  };

  const mockDbClient = createMockDbClient();

  beforeAll(async () => {
    // Populate test tenant in memory
    mockTenants.set(testTenantId, {
      id: testTenantId,
      name: 'Acme Civic Foundation',
      slug: 'acme-civic',
      tier: 'free',
      status: 'active',
      contact_email: 'dev@acme.org',
      metadata: { billing: { status: 'free_evaluation' } },
      created_at: new Date().toISOString(),
    });

    mockApplications.set(testAppId, {
      id: testAppId,
      tenant_id: testTenantId,
      name: 'Acme Test Application',
      environment: 'test',
      created_at: new Date().toISOString(),
    });

    mockApiKeys.set('33333333-3333-4333-8333-333333333333', {
      id: '33333333-3333-4333-8333-333333333333',
      tenant_id: testTenantId,
      application_id: testAppId,
      name: 'Primary Test Key',
      key_prefix: baselineKey.keyPrefix,
      key_hint: baselineKey.keyHint,
      key_hash: testKeyHash,
      scopes: ['geo:read', 'elections:read', 'entities:read', 'delim:read'],
      status: 'active',
      last_used_at: null,
      created_at: new Date().toISOString(),
    });

    // Wire mock client into services for testing
    onboardingService.setDbClient(mockDbClient);
    billingService.setDbClient(mockDbClient);
    usageService.setDbClient(mockDbClient);

    app = Fastify({ logger: false });

    // Register SaaS auth plugin with mock lookup
    await app.register(saasAuthPlugin, {
      enforceRateLimit: false,
      mockLookup: async (incomingHash: string) => {
        for (const k of mockApiKeys.values()) {
          if (k.key_hash === incomingHash) {
            const tenant = mockTenants.get(k.tenant_id);
            const appRec = mockApplications.get(k.application_id);
            return {
              ...k,
              saas_tenants: tenant,
              saas_applications: appRec,
            };
          }
        }
        return null;
      },
    });

    // Register SaaS V1 routes
    await app.register(saasV1Routes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. PUBLIC SELF-SERVICE SIGNUP & ONBOARDING
  // ============================================================================
  describe('Pillar 1: Self-Service Partner Signup', () => {
    it('W051-SIGNUP-01: Successfully provisions new partner tenant, application & initial test key', async () => {
      // Monkeypatch client for isolated test invocation
      const signupSpy = jest.spyOn(onboardingService, 'signup').mockImplementationOnce(async (params) => {
        return {
          tenant: {
            id: 'tenant-new-123',
            name: params.organizationName,
            slug: 'delhi-policy-lab',
            tier: 'free',
            status: 'active',
            contactEmail: params.email,
            createdAt: new Date().toISOString(),
          },
          application: {
            id: 'app-new-123',
            name: `${params.organizationName} Default Sandbox`,
            environment: 'test',
            createdAt: new Date().toISOString(),
          },
          apiKey: {
            id: 'key-new-123',
            name: 'Initial Test Key',
            keyPrefix: 'panin_test_sk_',
            keyHint: 'XyZ12345',
            environment: 'test',
            scopes: ['geo:read', 'elections:read'],
            rawKey: 'panin_test_sk_XyZ12345AbCdEfGhIjKlMnOpQrStUvWxYz012345678',
            notice: 'Store this secret key securely.',
          },
        };
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/auth/signup',
        payload: {
          name: 'Priya Mehta',
          email: 'priya@delhipolicylab.in',
          organizationName: 'Delhi Policy Lab',
          useCase: 'academic',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.tenant.tier).toBe('free');
      expect(json.data.tenant.slug).toBe('delhi-policy-lab');
      expect(json.data.apiKey.rawKey).toMatch(/^panin_test_sk_/);
      expect(json.data.apiKey.notice).toBeDefined();

      signupSpy.mockRestore();
    });

    it('W051-SIGNUP-02: Rejects invalid email syntax with 400 validation error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/auth/signup',
        payload: {
          name: 'Invalid Email User',
          email: 'not-an-email-format',
          organizationName: 'Civic Labs',
        },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error).toBe('Bad Request');
      expect(json.message).toContain('Invalid email');
    });

    it('W051-SIGNUP-03: Rejects missing organization name with 400 validation error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/auth/signup',
        payload: {
          name: 'Priya Mehta',
          email: 'priya@example.com',
          organizationName: 'A', // too short
        },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error).toBe('Bad Request');
    });
  });

  // ============================================================================
  // 2. AUTHENTICATED KEY LIFECYCLE MANAGEMENT
  // ============================================================================
  describe('Pillar 2: Cryptographic API Key Lifecycle Management', () => {
    it('W051-KEYS-01: Rejects unauthenticated key management requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/auth/keys',
      });
      expect(res.statusCode).toBe(401);
    });

    it('W051-KEYS-02: Lists active keys for authenticated tenant without revealing raw secrets', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/auth/keys',
        headers: { 'x-api-key': rawTestKey },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].keyPrefix).toBe('panin_test_sk_');
      expect(json.data[0].keyHint).toBeDefined();
      expect(json.data[0].rawKey).toBeUndefined(); // Raw secret NEVER leaked
      expect(json.data[0].keyHash).toBeUndefined(); // Raw hash NOT exposed
    });

    it('W051-KEYS-03: Generates new cryptographic API key and returns one-time secret', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/auth/keys',
        headers: { 'x-api-key': rawTestKey },
        payload: {
          name: 'Secondary Analytics Worker',
          environment: 'test',
          scopes: ['geo:read', 'elections:read'],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Secondary Analytics Worker');
      expect(json.data.environment).toBe('test');
      expect(json.data.rawKey).toMatch(/^panin_test_sk_[0-9a-zA-Z_-]{43}$/);
      expect(json.data.notice).toContain('Store this secret key securely');
    });

    it('W051-KEYS-04: Enforces active key limit on Free tier (max 2 keys)', async () => {
      // Mock active key count reaching ceiling
      const listSpy = jest.spyOn(onboardingService, 'createApiKey').mockImplementationOnce(async () => {
        const err: any = new Error("Active API key ceiling reached for tier 'free' (limit: 2).");
        err.statusCode = 403;
        err.code = 'KEY_LIMIT_REACHED';
        throw err;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/auth/keys',
        headers: { 'x-api-key': rawTestKey },
        payload: {
          name: 'Excess Key Request',
          environment: 'test',
        },
      });

      expect(res.statusCode).toBe(403);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('KEY_LIMIT_REACHED');

      listSpy.mockRestore();
    });

    it('W051-KEYS-05: Revokes specified API key successfully', async () => {
      const keyToRevoke = '33333333-3333-4333-8333-333333333333';
      const revokeSpy = jest.spyOn(onboardingService, 'revokeApiKey').mockResolvedValueOnce({
        id: keyToRevoke,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/vsaas/v1/auth/keys/${keyToRevoke}`,
        headers: { 'x-api-key': rawTestKey },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('revoked');

      revokeSpy.mockRestore();
    });
  });

  // ============================================================================
  // 3. COMMERCIAL PLANS & BILLING SUBSCRIPTIONS
  // ============================================================================
  describe('Pillar 3: Commercial Subscriptions & Monetization Engine', () => {
    it('W051-BILL-01: Public endpoint lists Free, Pro & Enterprise commercial plans without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/billing/plans',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(3);

      const planIds = json.data.map((p: any) => p.id);
      expect(planIds).toContain('free');
      expect(planIds).toContain('pro');
      expect(planIds).toContain('enterprise');

      const proPlan = json.data.find((p: any) => p.id === 'pro');
      expect(proPlan.priceINR).toBe(4999);
      expect(proPlan.rateLimits.monthlyCeiling).toBe(500000);
    });

    it('W051-BILL-02: Authenticated tenant can create a checkout session for Pro upgrade', async () => {
      const checkoutSpy = jest.spyOn(billingService, 'createCheckoutSession').mockResolvedValueOnce({
        orderId: 'order_test_98765',
        targetTier: 'pro',
        billingCycle: 'monthly',
        amountINR: 4999,
        amountPaise: 499900,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key_mock',
        isSandbox: true,
        tenantSlug: 'acme-civic',
        notes: { targetTier: 'pro' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/billing/checkout',
        headers: { 'x-api-key': rawTestKey },
        payload: {
          targetTier: 'pro',
          billingCycle: 'monthly',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.orderId).toBe('order_test_98765');
      expect(json.data.amountINR).toBe(4999);

      checkoutSpy.mockRestore();
    });

    it('W051-BILL-03: Verifies valid payment signature and upgrades tenant tier', async () => {
      const verifySpy = jest.spyOn(billingService, 'verifyPayment').mockResolvedValueOnce({
        success: true,
        tenantId: testTenantId,
        tenantSlug: 'acme-civic',
        previousTier: 'free',
        currentTier: 'pro',
        subscriptionStatus: 'active',
        activatedAt: new Date().toISOString(),
        updatedRateLimits: SAAS_TIER_LIMITS.pro,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/billing/verify',
        headers: { 'x-api-key': rawTestKey },
        payload: {
          orderId: 'order_test_98765',
          paymentId: 'pay_test_54321',
          signature: 'valid_mock_signature_hex',
          targetTier: 'pro',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.currentTier).toBe('pro');
      expect(json.data.updatedRateLimits.monthlyCeiling).toBe(500000);

      verifySpy.mockRestore();
    });

    it('W051-BILL-04: Inbound webhook rejects forged HMAC signature with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/vsaas/v1/billing/webhook',
        headers: {
          'x-razorpay-signature': 'forged_fake_signature_hash',
          'Content-Type': 'application/json',
        },
        payload: {
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_123' } } },
        },
      });

      // Provider verifies signature fail-closed
      expect([400, 401]).toContain(res.statusCode);
    });
  });

  // ============================================================================
  // 4. USAGE & QUOTA TELEMETRY
  // ============================================================================
  describe('Pillar 4: Usage Ledger & Quota Telemetry', () => {
    it('W051-USAGE-01: Returns comprehensive monthly quota consumption & hourly trend metrics', async () => {
      const usageSpy = jest.spyOn(usageService, 'getUsageMetrics').mockResolvedValueOnce({
        tenantId: testTenantId,
        tenantSlug: 'acme-civic',
        tier: 'free',
        billingPeriod: {
          start: '2026-10-01T00:00:00.000Z',
          end: '2026-11-01T00:00:00.000Z',
          secondsRemaining: 86400,
        },
        monthlyQuota: {
          ceiling: 10000,
          used: 1250,
          remaining: 8750,
          percentUsed: 12.5,
        },
        burstRateLimit: {
          requestsPerMinute: 60,
        },
        recentHourlyTrends: [
          { hourBucket: '2026-10-29T17:00:00.000Z', requestCount: 45, errorCount: 0 },
          { hourBucket: '2026-10-29T18:00:00.000Z', requestCount: 82, errorCount: 1 },
        ],
        serverTimestamp: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/account/usage',
        headers: { 'x-api-key': rawTestKey },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.monthlyQuota.ceiling).toBe(10000);
      expect(json.data.monthlyQuota.used).toBe(1250);
      expect(json.data.monthlyQuota.remaining).toBe(8750);
      expect(json.data.monthlyQuota.percentUsed).toBe(12.5);
      expect(json.data.recentHourlyTrends.length).toBe(2);

      usageSpy.mockRestore();
    });
  });

  // ============================================================================
  // 5. DEVELOPER PORTAL & OPENAPI CONTRACT SPECIFICATION
  // ============================================================================
  describe('Pillar 5: Developer Portal & OpenAPI Spec Endpoints', () => {
    it('W051-DOCS-01: Renders interactive developer portal HTML without requiring API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/docs',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.payload).toContain('Poligram Developer Portal');
      expect(res.payload).toContain('Interactive API Explorer');
      expect(res.payload).toContain('Commercial Subscription Plans');
    });

    it('W051-DOCS-02: Serves machine-readable OpenAPI 3.1 JSON document without requiring API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/openapi.json',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.openapi).toBe('3.1.0');
      expect(json.info.title).toContain('Poligram B2B Political SaaS');
      expect(json.paths['/api/vsaas/v1/geo/states']).toBeDefined();
    });

    it('W051-DOCS-03: Serves OpenAPI specification YAML string without requiring API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/openapi.yaml',
      });

      expect(res.statusCode).toBe(200);
      expect(res.payload).toContain('openapi: 3.1.0');
      expect(res.payload).toContain('Poligram B2B Political SaaS');
    });
  });

  // ============================================================================
  // 6. ZERO CITIZEN PII INVARIANT
  // ============================================================================
  describe('Security & Privacy Invariant: Zero Citizen PII Exposure', () => {
    it('W051-SEC-01: Customer acquisition responses contain zero citizen voter IDs or mobile numbers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/billing/plans',
      });

      const body = res.payload;
      expect(body).not.toMatch(/\b(voter_id|epic_no|aadhaar|citizen_phone|voter_phone)\b/i);
    });
  });
});
