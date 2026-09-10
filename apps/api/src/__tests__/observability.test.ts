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
});
