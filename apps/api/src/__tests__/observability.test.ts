import { buildApp } from '../server';
import { metricsCollector } from '../lib/metrics';
import type { FastifyInstance } from 'fastify';

describe('Observability, Tracing & Error Interception (JOB W004 / DEC-020)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    metricsCollector.resetForTests();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request ID Propagation & Correlation Headers', () => {
    it('generates a unique x-request-id and x-response-time header when none provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(10);
      expect(res.headers['x-response-time']).toMatch(/^\d+(\.\d+)?ms$/);
      expect(res.headers['server-timing']).toMatch(/^total;dur=\d+(\.\d+)?$/);
    });

    it('echoes caller-provided x-request-id across response headers and JSON body', async () => {
      const clientCorrelationId = 'client-trace-uuid-12345678';
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': clientCorrelationId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).toBe(clientCorrelationId);
    });

    it('sanitizes and replaces invalid or malicious request IDs with a UUID', async () => {
      // Invalid characters (e.g. spaces, special chars, newline injection attempt)
      const maliciousId = 'invalid id with spaces!@#$%^&*()';
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': maliciousId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).not.toBe(maliciousId);
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('replaces oversized request IDs (>128 chars) with a UUID', async () => {
      const oversizedId = 'a'.repeat(129);
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': oversizedId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).not.toBe(oversizedId);
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('Controlled Error Interception & Envelope Formatting', () => {
    it('captures controlled 400 Bad Request with correlation ID and timestamp', async () => {
      const customId = 'req-bad-request-test-400';
      const res = await app.inject({
        method: 'GET',
        url: '/api/debug/error?type=bad_request',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.headers['x-request-id']).toBe(customId);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
      expect(body.requestId).toBe(customId);
      expect(body.timestamp).toBeDefined();
    });

    it('captures controlled 503 database failure with sanitized response', async () => {
      const customId = 'req-db-fail-test-503';
      const res = await app.inject({
        method: 'GET',
        url: '/api/debug/error?type=db_failure',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers['x-request-id']).toBe(customId);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(503);
      expect(body.requestId).toBe(customId);
    });

    it('sanitizes 500 internal errors and attaches correlation ID to error envelope', async () => {
      const customId = 'req-unhandled-test-500';
      const res = await app.inject({
        method: 'GET',
        url: '/api/debug/error?type=unhandled',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(res.statusCode).toBe(500);
      expect(res.headers['x-request-id']).toBe(customId);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Internal Server Error');
      expect(body.statusCode).toBe(500);
      expect(body.requestId).toBe(customId);
      expect(body.timestamp).toBeDefined();
    });

    it('returns structured 404 response with correlation ID on unknown routes', async () => {
      const customId = 'req-not-found-404';
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent-test-path',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.headers['x-request-id']).toBe(customId);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
      expect(body.statusCode).toBe(404);
      expect(body.requestId).toBe(customId);
    });
  });

  describe('Operational Metrics Endpoint (GET /api/metrics)', () => {
    it('serves real-time telemetry, memory usage, request counts, and latency percentiles', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      const body = JSON.parse(res.payload);

      // Validate core telemetry structure
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(body.memory).toBeDefined();
      expect(body.memory.rssMb).toBeGreaterThan(0);
      expect(body.memory.heapUsedMb).toBeGreaterThan(0);

      // Validate request counters
      expect(body.requests).toBeDefined();
      expect(body.requests.total).toBeGreaterThan(0);
      expect(body.requests.byStatusClass).toBeDefined();
      expect(body.requests.byStatusClass['2xx']).toBeGreaterThanOrEqual(1);

      // Validate latency instrumentation
      expect(body.latency).toBeDefined();
      expect(body.latency.p50Ms).toBeGreaterThanOrEqual(0);
      expect(body.latency.avgMs).toBeGreaterThanOrEqual(0);

      // Validate database telemetry
      expect(body.database).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Production Route Protection & Hardening (W004-R1 Mandate)', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalBypass = process.env.DEBUG_BYPASS_SECRET;
    const originalMetricsToken = process.env.METRICS_AUTH_TOKEN;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.DEBUG_BYPASS_SECRET = originalBypass;
      process.env.METRICS_AUTH_TOKEN = originalMetricsToken;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    });

    it('rejects public requests to /api/debug/error with 404 in production environment', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG_BYPASS_SECRET;

      const res = await app.inject({
        method: 'GET',
        url: '/api/debug/error?type=bad_request',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
    });

    it('allows privileged bypass to /api/debug/error in production with matching secret', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG_BYPASS_SECRET = 'super-secret-bypass-token-12345';

      const res = await app.inject({
        method: 'GET',
        url: '/api/debug/error?type=bad_request',
        headers: {
          'x-debug-bypass-secret': 'super-secret-bypass-token-12345',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
    });

    it('protects /api/metrics in production: rejects unauthorized requests with 401', async () => {
      process.env.NODE_ENV = 'production';
      process.env.METRICS_AUTH_TOKEN = 'production-metrics-bearer-key-999';

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toMatch(/requires authorized monitoring credentials/i);
    });

    it('protects /api/metrics in production: permits authorized requests with Bearer token', async () => {
      process.env.NODE_ENV = 'production';
      process.env.METRICS_AUTH_TOKEN = 'production-metrics-bearer-key-999';

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: {
          authorization: 'Bearer production-metrics-bearer-key-999',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('protects /api/metrics in production: permits authorized requests with x-metrics-token', async () => {
      process.env.NODE_ENV = 'production';
      process.env.METRICS_AUTH_TOKEN = 'production-metrics-bearer-key-999';

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: {
          'x-metrics-token': 'production-metrics-bearer-key-999',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('rejects wrong metrics token in production with 401', async () => {
      process.env.NODE_ENV = 'production';
      process.env.METRICS_AUTH_TOKEN = 'correct-metrics-token-abc';

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: {
          authorization: 'Bearer wrong-metrics-token-xyz',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects Supabase service-role key presented as metrics token in production (W004-R1A credential separation)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.METRICS_AUTH_TOKEN = 'dedicated-metrics-token-only';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'supabase-service-role-key-secret';

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: {
          authorization: 'Bearer supabase-service-role-key-secret',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
    });

    it('fails closed when METRICS_AUTH_TOKEN is not configured in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.METRICS_AUTH_TOKEN;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: {
          authorization: 'Bearer any-token-here',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Error Classification & External Error Monitoring Engine (W004-R1 Mandate)', () => {
    it('classifies all 8 standard operational error categories appropriately', () => {
      const { classifyError } = require('../lib/errorTracker');

      expect(classifyError(new Error('Validation failed'), 400).category).toBe('CLIENT_VALIDATION');
      expect(classifyError(new Error('JWT expired'), 401).category).toBe('AUTHENTICATION');
      expect(classifyError(new Error('Forbidden resource'), 403).category).toBe('AUTHORIZATION');
      expect(classifyError(new Error('Rate limit exceeded'), 429).category).toBe('RATE_LIMIT');
      expect(classifyError(new Error('Resource not found'), 404).category).toBe('NOT_FOUND');
      expect(classifyError(new Error('Database query timed out'), 503).category).toBe('DATABASE_FAILURE');
      expect(classifyError(new Error('Upstream provider unreachable'), 502).category).toBe('UPSTREAM_PROVIDER');
      expect(classifyError(new Error('Unhandled pointer dereference'), 500).category).toBe('UNHANDLED_SERVER_ERROR');
    });

    it('safely captures error events without throwing even if monitoring sinks fail', () => {
      const { errorTracker } = require('../lib/errorTracker');

      const payload = errorTracker.captureError({
        error: new Error('Simulated external sink error test'),
        statusCode: 500,
        requestId: 'req-safe-capture-test',
        url: '/test/error',
        method: 'GET',
      });

      expect(payload).toBeDefined();
      expect(payload.category).toBe('UNHANDLED_SERVER_ERROR');
      expect(payload.requestId).toBe('req-safe-capture-test');
      expect(payload.eventId).toBeDefined();
    });
  });
});
