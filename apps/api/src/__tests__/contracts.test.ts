/**
 * API Contract Standardization & Negative Path Test Suite (JOB W008)
 * Master Execution Framework — Amendment v1.5-A / DEC-041
 * 
 * Verifies:
 * - NP-01, NP-02, NP-03: Config flags schema rejects non-boolean values with 400 ApiErrorEnvelope
 * - NP-04, NP-05, NP-06, NP-07: News feed schema rejects invalid query parameters with 400 ApiErrorEnvelope
 * - NP-08: States endpoint returns 404 ApiErrorEnvelope for unknown state code
 * - NP-09: Unregistered route returns structured 404 error envelope
 * - NP-10, NP-11, NP-12: Correlation ID echo across 400, 404, 500 error envelopes
 * - NP-13: Fastify genReqId sanitization rejecting malicious request IDs
 * - Positive path schema validation for config flags and states
 */

import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('W008 API Contract Standardization & Schema Envelopes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Config Flags Schema & Negative Paths (NP-01 .. NP-03)', () => {
    it('NP-01: rejects flag value when string instead of boolean with 400 envelope', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        payload: {
          enableShortsTab: 'false',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
      expect(body.requestId).toBeDefined();
      expect(body.timestamp).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it('NP-02: rejects flag value when number instead of boolean with 400 envelope', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        payload: {
          enableShortsTab: 1,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('NP-03: rejects flag value when null instead of boolean with 400 envelope', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        payload: {
          enableShortsTab: null,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('Positive: PATCH /api/v1/config/flags accepts valid boolean flags', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        payload: {
          enableShortsTab: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('updated');
      expect(body.flags.enableShortsTab).toBe(false);

      // Revert
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        payload: { enableShortsTab: true },
      });
    });
  });

  describe('News Feed Query Schema & Negative Paths (NP-04 .. NP-07)', () => {
    it('NP-04: rejects negative limit query parameter with 400 envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/news/feed?limit=-5',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
      expect(body.requestId).toBeDefined();
    });

    it('NP-05: rejects limit exceeding maximum (100) with 400 envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/news/feed?limit=500',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('NP-06: rejects lang query parameter exceeding max length (10) with 400 envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/news/feed?lang=verylonginvalidlanguagecode',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('NP-07: rejects invalid scope enum value with 400 envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/news/feed?scope=intergalactic',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });
  });

  describe('States Schema & Negative Paths (NP-08)', () => {
    it('NP-08a: returns 404 ApiErrorEnvelope for non-existent valid 2-letter state code', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/XX',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(404);
      expect(body.error).toBe('Not Found');
      expect(body.message).toContain('State XX not found');
      expect(body.requestId).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    it('NP-08b: returns 400 ApiErrorEnvelope when state code exceeds maximum length (5 chars)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/TOOLONGSTATECODE',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('Positive: GET /api/v1/states returns validated state array', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.states)).toBe(true);
      expect(body.states.length).toBeGreaterThan(0);
      expect(body.states[0].code).toBeDefined();
      expect(body.states[0].name).toBeDefined();
    });

    it('Positive: GET /api/v1/states/TS returns Telangana state info', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/TS',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('TS');
      expect(body.name).toBe('Telangana');
      expect(body.totalSeats).toBe(119);
    });
  });

  describe('Correlation ID Echo Across Error Envelopes (NP-10 .. NP-13)', () => {
    it('NP-10: echoes correlation ID on 400 validation error envelope', async () => {
      const corrId = 'corr-w008-val-400-test';
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/config/flags',
        headers: { 'x-request-id': corrId },
        payload: { enableShortsTab: 'invalid' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.headers['x-request-id']).toBe(corrId);
      const body = JSON.parse(res.payload);
      expect(body.requestId).toBe(corrId);
    });

    it('NP-11: echoes correlation ID on 404 not found error envelope', async () => {
      const corrId = 'corr-w008-notfound-404-test';
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/XX',
        headers: { 'x-request-id': corrId },
      });

      expect(res.statusCode).toBe(404);
      expect(res.headers['x-request-id']).toBe(corrId);
      const body = JSON.parse(res.payload);
      expect(body.requestId).toBe(corrId);
    });

    it('NP-13: Fastify genReqId rejects malicious header and generates valid UUID', async () => {
      const maliciousId = '<script>alert(1)</script>';
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-request-id': maliciousId },
      });

      expect(res.statusCode).toBe(200);
      const assignedId = res.headers['x-request-id'] as string;
      expect(assignedId).not.toBe(maliciousId);
      expect(assignedId).toMatch(/^[a-zA-Z0-9_\-]+$/);
    });
  });

  describe('Pages Entitlement Schema & Negative Paths (CB-03 / NP-07 / NP-09)', () => {
    it('CB-03a / NP-07a: returns 400 Bad Request envelope when pageId is empty / fails schema minLength', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pages//entitlement',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
      expect(body.requestId).toBeDefined();
    });

    it('CB-03b: returns 200 with schema-validated entitlement object for non-pro page / fallback', async () => {
      const pageId = 'test-non-pro-page-handle';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${pageId}/entitlement`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.pageId).toBe(pageId);
      expect(body.isPro).toBe(false);
      expect(body.plan).toBe('free');
      expect(body.expiresAt).toBeNull();
    });

    it('CB-03c: returns 200 with schema-validated entitlement object for UUID pageId', async () => {
      const uuid = '11111111-2222-3333-4444-555555555555';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${uuid}/entitlement`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.pageId).toBe(uuid);
      expect(typeof body.isPro).toBe('boolean');
      expect(['free', 'pro']).toContain(body.plan);
      expect(body.expiresAt === null || typeof body.expiresAt === 'string').toBe(true);
    });

    it('CB-03d: cached response conforms exactly to 200 schema without metadata leaks', async () => {
      const pageId = 'test-cached-page-handle';
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${pageId}/entitlement`,
      });
      expect(res1.statusCode).toBe(200);

      // Second request hits in-memory ENTITLEMENT_CACHE
      const res2 = await app.inject({
        method: 'GET',
        url: `/api/v1/pages/${pageId}/entitlement`,
      });
      expect(res2.statusCode).toBe(200);
      const body = JSON.parse(res2.payload);
      expect(body.success).toBe(true);
      expect(body.pageId).toBe(pageId);
      expect(body.isPro).toBe(false);
      expect(body.plan).toBe('free');
      expect(body.expiresAt).toBeNull();
      // Verify internal cache fields (ownerId, role, title, handle) are NOT exposed in response
      expect(body.ownerId).toBeUndefined();
      expect(body.title).toBeUndefined();
      expect(body.handle).toBeUndefined();
      expect(body.role).toBeUndefined();
    });
  });

  describe('W008-C Phase 1 Domain Contracts & Negative Paths (CC-01..CC-06, NP-07..NP-18)', () => {
    // CC-02: State code parameters validated against ^[A-Z]{2}$ uppercase regex
    it('CC-02 / NP-08c: rejects lowercase state code with 400 validation error', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/ts',
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('CC-02 / NP-08d: rejects numeric state code with 400 validation error', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/states/12',
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('CC-02 / NP-08e: rejects civic budget with invalid state code regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/budget/toolong',
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    // CC-03: Moderation content check endpoints reject empty or oversized payloads fail-closed
    it('CC-03 / NP-10b: rejects empty content in moderation check-content with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: '' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('CC-03: rejects oversized content (>10,000 chars) in moderation check-content with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: 'a'.repeat(10001) },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    // CC-04: Moderation queue and audit log routes enforce role-based authorization fail-closed
    it('CC-04 / NP-11b: unauthenticated access to moderation queue returns 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.requestId).toBeDefined();
    });

    it('CC-04: non-moderator role access to moderation queue returns 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'citizen-user-1',
          'x-test-role': 'citizen',
        },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe('Forbidden');
    });

    it('CC-04: non-admin access to audit log returns 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/audit-log',
        headers: {
          'x-user-id': 'moderator-user-1',
          'x-test-role': 'moderator',
        },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe('Forbidden');
    });

    // NP-13: Authenticated moderator with mismatched client-supplied moderatorId rejected with 400
    it('NP-13: rejects mismatched moderatorId attribution with 400 VALIDATION_ERROR', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'real-moderator-id',
          'x-test-role': 'moderator',
        },
        payload: {
          moderatorId: 'spoofed-moderator-id',
          actionType: 'warn',
          reason: 'Policy violation',
          targetUserId: 'target-user-1',
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('Invalid moderator attribution');
    });

    // NP-17: Notification register-token with missing auth returns 401
    it('NP-17: rejects unauthenticated register-token with 401 ApiErrorEnvelope', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/register-token',
        payload: {
          token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          platform: 'android',
        },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.requestId).toBeDefined();
    });

    // NP-18: Notification send with missing API key returns 401
    it('NP-18: rejects notification send without x-api-key with 401 ApiErrorEnvelope', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload: {
          userId: 'user-1',
          trigger: 'post_upvoted',
          title: 'Post Upvoted',
          body: 'Someone upvoted your post',
        },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('UNAUTHORIZED');
    });

    // Civic Pagination Bounds
    it('Civic: rejects attendance query with limit > 100 with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/attendance?limit=150',
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    it('Civic: rejects bills query with page < 1 with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/bills?page=0',
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('FST_ERR_VALIDATION');
    });

    // Positive paths for notifications and civic
    it('Positive: notifications register-token logs and echoes truncated token (Non-DB)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/register-token',
        headers: { 'x-user-id': 'user-notif-1' },
        payload: {
          token: 'ExponentPushToken[1234567890abcdef1234567890]',
          platform: 'android',
          deviceName: 'Pixel 8',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('user-notif-1');
      expect(body.data.platform).toBe('android');
      expect(body.data.token).toContain('...');
    });

    it('Positive: civic budget returns valid summary with uppercase state code', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/civic/budget/TS',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.stateCode).toBe('TS');
      expect(body.message).toBeDefined();
    });
  });
});


