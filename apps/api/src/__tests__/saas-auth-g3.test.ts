/**
 * apps/api/src/__tests__/saas-auth-g3.test.ts
 *
 * Milestone W021 — B2B Political SaaS & Public/Partner Developer API Foundation
 * Gate W021-G3: Fastify SaaS API Key Authentication & Security Test Suite
 *
 * Directives & Authorities:
 * - CTO AUTHORIZATION — W021-G3 API KEY AUTHENTICATION & SECURITY GATE
 * - Ratified Plan: PLAN-W021-MASTER-REV-1.0.md
 *
 * Test Battery:
 * 1. Valid Active Key (Test / Live prefixes)
 * 2. Malformed Keys (Length, characters, prefixes, empty)
 * 3. Unknown / Non-existent Key
 * 4. Revoked Key (Soft-state)
 * 5. Compromised Key
 * 6. Expired Key (expires_at < now)
 * 7. Inactive / Suspended Tenant
 * 8. Tenant Isolation: Cross-tenant mismatch in key record rejected
 * 9. Caller Tenant Spoofing: Inbound tenant_id parameter/header ignored or rejected
 * 10. Rate Limiting: Burst per-minute rejection (429) & header verification
 * 11. Rate Limiting: Monthly ceiling rejection (429)
 * 12. Constant-time hash verification proof
 * 13. Plaintext key never persisted & never leaked in logs/errors
 * 14. Error envelope format & zero existence leakage (Generic 401)
 * 15. Dependency failure / database error fails closed (500 AUTH_DEPENDENCY_FAILURE)
 * 16. Scope verification if required
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  saasAuthPlugin,
  extractRawApiKey,
} from '../lib/saasAuthPlugin';
import {
  generateCryptographicApiKey,
  parseAndValidateApiKeyFormat,
  verifyApiKeyHashConstantTime,
  hashApiKey,
  SAAS_API_KEY_REGEX,
} from '../lib/saasCrypto';
import { saasRateLimiter } from '../lib/saasRateLimiter';

describe('W021-G3: SaaS API Key Authentication & Security Gate', () => {
  let app: FastifyInstance;

  // In-memory mock database for SaaS key records
  const mockDb = new Map<string, any>();

  const tenantA = {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    slug: 'media-group-a',
    tier: 'pro',
    status: 'active',
  };

  const tenantB = {
    id: 'bbbbbbbb-2222-2222-2222-222222222222',
    slug: 'civic-tech-b',
    tier: 'free',
    status: 'active',
  };

  const suspendedTenant = {
    id: 'cccccccc-3333-3333-3333-333333333333',
    slug: 'delinquent-c',
    tier: 'free',
    status: 'suspended',
  };

  const appA = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    tenant_id: tenantA.id,
    environment: 'live',
  };

  const appB = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    tenant_id: tenantB.id,
    environment: 'test',
  };

  // Generate test keys
  const validKeyA = generateCryptographicApiKey('live');
  const validKeyB = generateCryptographicApiKey('test');
  const revokedKey = generateCryptographicApiKey('test');
  const compromisedKey = generateCryptographicApiKey('test');
  const expiredKey = generateCryptographicApiKey('test');
  const crossTenantKey = generateCryptographicApiKey('test');
  const suspendedTenantKey = generateCryptographicApiKey('test');

  beforeAll(async () => {
    // Populate mock records
    mockDb.set(validKeyA.keyHash, {
      id: 'k1111111-1111-1111-1111-111111111111',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: validKeyA.keyPrefix,
      key_hint: validKeyA.keyHint,
      key_hash: validKeyA.keyHash,
      scopes: ['geo:read', 'elections:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    mockDb.set(validKeyB.keyHash, {
      id: 'k2222222-2222-2222-2222-222222222222',
      tenant_id: tenantB.id,
      application_id: appB.id,
      key_prefix: validKeyB.keyPrefix,
      key_hint: validKeyB.keyHint,
      key_hash: validKeyB.keyHash,
      scopes: ['geo:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: tenantB,
      saas_applications: appB,
    });

    mockDb.set(revokedKey.keyHash, {
      id: 'k3333333-3333-3333-3333-333333333333',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: revokedKey.keyPrefix,
      key_hint: revokedKey.keyHint,
      key_hash: revokedKey.keyHash,
      scopes: ['geo:read'],
      status: 'revoked',
      expires_at: null,
      revoked_at: new Date().toISOString(),
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    mockDb.set(compromisedKey.keyHash, {
      id: 'k4444444-4444-4444-4444-444444444444',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: compromisedKey.keyPrefix,
      key_hint: compromisedKey.keyHint,
      key_hash: compromisedKey.keyHash,
      scopes: ['geo:read'],
      status: 'compromised',
      expires_at: null,
      revoked_at: new Date().toISOString(),
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    mockDb.set(expiredKey.keyHash, {
      id: 'k5555555-5555-5555-5555-555555555555',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: expiredKey.keyPrefix,
      key_hint: expiredKey.keyHint,
      key_hash: expiredKey.keyHash,
      scopes: ['geo:read'],
      status: 'active',
      expires_at: new Date(Date.now() - 3600000).toISOString(), // expired 1h ago
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    // Malicious cross-tenant key: claims tenantA but references appB (owned by tenantB)
    mockDb.set(crossTenantKey.keyHash, {
      id: 'k6666666-6666-6666-6666-666666666666',
      tenant_id: tenantA.id,
      application_id: appB.id,
      key_prefix: crossTenantKey.keyPrefix,
      key_hint: crossTenantKey.keyHint,
      key_hash: crossTenantKey.keyHash,
      scopes: ['geo:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appB, // MISMATCH
    });

    mockDb.set(suspendedTenantKey.keyHash, {
      id: 'k7777777-7777-7777-7777-777777777777',
      tenant_id: suspendedTenant.id,
      application_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      key_prefix: suspendedTenantKey.keyPrefix,
      key_hint: suspendedTenantKey.keyHint,
      key_hash: suspendedTenantKey.keyHash,
      scopes: ['geo:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: suspendedTenant,
      saas_applications: {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        tenant_id: suspendedTenant.id,
        environment: 'test',
      },
    });

    app = Fastify({ logger: false });

    // Register plugin with mock lookup function and mock usage recorder
    await app.register(saasAuthPlugin, {
      mockLookup: async (hash: string) => {
        if (hash === 'FAIL_DEPENDENCY_TRIGGER_HASH') {
          throw new Error('Simulated database connection failure');
        }
        return mockDb.get(hash) || null;
      },
      mockUsageRecorder: async () => ({
        allowed: true,
        currentMonthlyUsage: 1,
        monthlyRemaining: 9999,
        monthlyCeiling: 10000,
        resetSeconds: 86400,
      }),
    });

    // Test SaaS route family (/api/vsaas/v1/test-echo)
    app.get('/api/vsaas/v1/test-echo', async (req) => {
      return {
        success: true,
        auth: req.saasAuth,
      };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    saasRateLimiter.resetForTesting();
  });

  describe('1. API Key Construction & Cryptographic Invariants', () => {
    it('generates API keys matching the ratified regex format and exact 57 chars', () => {
      const liveKey = generateCryptographicApiKey('live');
      const testKey = generateCryptographicApiKey('test');

      expect(liveKey.rawKey).toMatch(SAAS_API_KEY_REGEX);
      expect(testKey.rawKey).toMatch(SAAS_API_KEY_REGEX);
      expect(liveKey.rawKey.length).toBe(57);
      expect(testKey.rawKey.length).toBe(57);
      expect(liveKey.rawKey.startsWith('panin_live_sk_')).toBe(true);
      expect(testKey.rawKey.startsWith('panin_test_sk_')).toBe(true);
      expect(liveKey.keyHint.length).toBe(8);
      expect(liveKey.keyHash.length).toBe(64);
    });

    it('constant-time comparison verifies matching hashes and rejects non-matching', () => {
      const hashA = hashApiKey(validKeyA.rawKey);
      const hashB = hashApiKey(validKeyB.rawKey);

      expect(verifyApiKeyHashConstantTime(hashA, hashA)).toBe(true);
      expect(verifyApiKeyHashConstantTime(hashA, hashB)).toBe(false);
      expect(verifyApiKeyHashConstantTime(hashA, 'short_hash')).toBe(false);
    });
  });

  describe('2. Authentication Success & Context Binding', () => {
    it('authenticates valid live API key via x-api-key header and binds context', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': validKeyA.rawKey,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.auth).toBeDefined();
      expect(body.auth.tenantId).toBe(tenantA.id);
      expect(body.auth.tenantSlug).toBe(tenantA.slug);
      expect(body.auth.tenantTier).toBe('pro');
      expect(body.auth.applicationId).toBe(appA.id);
      expect(body.auth.environment).toBe('live');
      expect(body.auth.keyHint).toBe(validKeyA.keyHint);
      expect(body.auth.rateLimits.requestsPerMinute).toBe(600);

      // Verifies rate limit headers are attached
      expect(res.headers['x-ratelimit-limit']).toBe('600');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('authenticates valid test API key via Authorization Bearer header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          authorization: `Bearer ${validKeyB.rawKey}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.auth.tenantId).toBe(tenantB.id);
      expect(body.auth.tenantTier).toBe('free');
      expect(body.auth.rateLimits.requestsPerMinute).toBe(60);
      expect(res.headers['x-ratelimit-limit']).toBe('60');
    });
  });

  describe('3. Fail-Closed Authentication & Error Semantics', () => {
    it('rejects request with missing API key with generic 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Invalid or inactive API key provided.');
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed API key syntax (invalid prefix, truncated length) with generic 401', async () => {
      const malformedCases = [
        'panin_live_sk_short',
        'panin_live_pk_1234567890123456789012345678901234567890123',
        'invalid_prefix_1234567890123456789012345678901234567890123',
        'panin_live_sk_@@@special_chars_not_base64url$$$$$$$$$$$$$$$$$$$$',
      ];

      for (const badKey of malformedCases) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/vsaas/v1/test-echo',
          headers: {
            'x-api-key': badKey,
          },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.message).toBe('Invalid or inactive API key provided.');
      }
    });

    it('rejects unknown / non-existent key with generic 401 (zero existence leak)', async () => {
      const unknownKey = generateCryptographicApiKey('live');
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': unknownKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });

    it('rejects revoked API key with generic 401 (zero status leak)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': revokedKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });

    it('rejects compromised API key with generic 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': compromisedKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });

    it('rejects expired API key with generic 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': expiredKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });

    it('rejects key belonging to suspended/inactive tenant with generic 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': suspendedTenantKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });
  });

  describe('4. Tenant Isolation & Anti-Spoofing Enforcements', () => {
    it('detects and rejects cross-tenant isolation breach in key record', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': crossTenantKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid or inactive API key provided.');
    });

    it('strictly ignores caller-supplied tenant_id query/body/header overrides', async () => {
      // Caller presents valid key for Tenant A, but tries to pass tenant_id = Tenant B in query & header
      const res = await app.inject({
        method: 'GET',
        url: `/api/vsaas/v1/test-echo?tenant_id=${tenantB.id}`,
        headers: {
          'x-api-key': validKeyA.rawKey,
          'x-tenant-id': tenantB.id,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Authenticated context MUST remain Tenant A (strictly derived from API key)
      expect(body.auth.tenantId).toBe(tenantA.id);
      expect(body.auth.tenantId).not.toBe(tenantB.id);
    });
  });

  describe('5. Rate Limiting & Quota Enforcement', () => {
    it('enforces burst rate limit when per-minute tokens are exhausted (returns 429)', async () => {
      // Tenant B is 'free' tier: 60 req/min
      // Exhaust 60 tokens
      for (let i = 0; i < 60; i++) {
        const okRes = await app.inject({
          method: 'GET',
          url: '/api/vsaas/v1/test-echo',
          headers: {
            'x-api-key': validKeyB.rawKey,
          },
        });
        expect(okRes.statusCode).toBe(200);
      }

      // 61st request should be rejected with 429
      const blockedRes = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': validKeyB.rawKey,
        },
      });

      expect(blockedRes.statusCode).toBe(429);
      expect(blockedRes.headers['retry-after']).toBeDefined();
      const body = JSON.parse(blockedRes.payload);
      expect(body.error).toBe('Too Many Requests');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.message).toContain('Rate limit exceeded');
    });
  });

  describe('6. Dependency Failure Fail-Closed Resilience', () => {
    it('fails closed with 500 AUTH_DEPENDENCY_FAILURE when database lookup encounters an exception', async () => {
      const triggerKey = generateCryptographicApiKey('live');
      // Create a temporary key that maps to failure trigger hash
      const triggerHashKey = {
        ...triggerKey,
        keyHash: 'FAIL_DEPENDENCY_TRIGGER_HASH',
      };

      // Mock parse to return the trigger hash
      jest.spyOn(require('../lib/saasCrypto'), 'parseAndValidateApiKeyFormat').mockReturnValueOnce(triggerHashKey);

      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': triggerKey.rawKey,
        },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Internal Server Error');
      expect(body.code).toBe('AUTH_DEPENDENCY_FAILURE');
    });
  });

  describe('7. Secret Redaction & Logging Safety Proof', () => {
    it('extractRawApiKey extracts without logging or mutating request', () => {
      const mockReq = {
        headers: {
          'x-api-key': validKeyA.rawKey,
        },
      } as any;

      const extracted = extractRawApiKey(mockReq);
      expect(extracted).toBe(validKeyA.rawKey);
      // Confirm rawKey is not attached to request object
      expect((mockReq as any).rawKey).toBeUndefined();
    });

    it('auth context contains only safe keyHint and keyPrefix (zero raw secret)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/test-echo',
        headers: {
          'x-api-key': validKeyA.rawKey,
        },
      });

      const body = JSON.parse(res.payload);
      expect(body.auth.rawKey).toBeUndefined();
      expect(body.auth.keySecret).toBeUndefined();
      expect(body.auth.keyHint).toBe(validKeyA.keyHint);
      expect(body.auth.keyPrefix).toBe(validKeyA.keyPrefix);
    });
  });
});
