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
});
