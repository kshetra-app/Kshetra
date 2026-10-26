/**
 * Fastify Route Integration Tests: Delimitation Watch API (Job 023)
 */

import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import * as path from 'path';
import { setWatchRepositoryForTesting } from '../routes/delimitationWatch';
import { DelimitationWatchOrchestrator, InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch';

describe('Delimitation Watch HTTP Routes (/api/v1/delimitation/watch/*)', () => {
  let app: FastifyInstance;
  let testRepo: InMemoryDelimitationWatchRepository;
  const fixturePath = path.resolve(__dirname, '../../../../tests/fixtures/delimitation/initial_delimitation_source_fixture.json');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeAll(async () => {
    testRepo = new InMemoryDelimitationWatchRepository();
    setWatchRepositoryForTesting(testRepo);
    process.env.KSHETRA_MONITOR_SECRET = 'test-delim-secret-8f29';

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.KSHETRA_MONITOR_SECRET;
  });

  test('POST /api/v1/delimitation/watch/sources rejects unauthorized callers (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/sources',
      headers: { authorization: 'Bearer invalid-token' },
      payload: {
        id: 'SRC-AUTH-TEST',
        name: 'Unauthorized Source',
        publisher: 'Test',
        sourceType: 'gazette_extraordinary',
        canonicalUrl: fixturePath,
        geographicScope: 'IN-TG',
        subjectScope: 'delimitation_order',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });

  test('POST /api/v1/delimitation/watch/sources registers source with valid bearer token (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/sources',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
      payload: {
        id: 'SRC-ROUTE-001',
        name: 'Route Test Source',
        publisher: 'ECI Test',
        sourceType: 'gazette_extraordinary',
        canonicalUrl: fixturePath,
        geographicScope: 'IN-TG',
        subjectScope: 'delimitation_order',
        authorityClassification: 'statutory',
        retrievalMethod: 'file_fixture',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.source.id).toBe('SRC-ROUTE-001');
  });

  test('GET /api/v1/delimitation/watch/sources lists registered sources (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/delimitation/watch/sources',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.sources.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/v1/delimitation/watch/trigger/:sourceId executes the pipeline (200)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/trigger/SRC-ROUTE-001',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.result.outcome).toBe('SUCCESS');
    expect(body.data.result.acceptedVersion).toBeDefined();
    expect(body.data.result.publication).toBeDefined();
  });

  test('GET /api/v1/delimitation/watch/runs/:sourceId returns execution run history (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/delimitation/watch/runs/SRC-ROUTE-001',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.runs.length).toBe(1);
    expect(body.data.runs[0].outcome).toBe('SUCCESS');
  });

  test('GET /api/v1/delimitation/watch/versions/:sourceId returns accepted versions history (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/delimitation/watch/versions/SRC-ROUTE-001',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.versions.length).toBe(1);
    expect(body.data.versions[0].dataStatus).toBe('UNVERIFIED');
  });

  test('GET /api/v1/delimitation/watch/health returns health and durability status (200)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/delimitation/watch/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('HEALTHY');
    expect(body.repositoryType).toBe('in_memory');
    expect(body.durable).toBe(false);
  });

  test('health reports unhealthy repositories and disallows ephemeral runtime outside tests', async () => {
    jest.spyOn(testRepo, 'checkHealth').mockResolvedValueOnce({ healthy: false, details: 'fixture database down' } as any);
    const unhealthy = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/health' });
    expect(unhealthy.statusCode).toBe(503);
    expect(JSON.parse(unhealthy.body)).toMatchObject({ status: 'UNHEALTHY', details: 'fixture database down' });

    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const ephemeral = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/health' });
      expect(ephemeral.statusCode).toBe(503);
      expect(JSON.parse(ephemeral.body).error).toContain('Ephemeral in-memory repository not permitted');
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  test('returns persistence configuration errors when repository cannot be resolved', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldDatabaseUrl = process.env.DATABASE_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    setWatchRepositoryForTesting(null);
    try {
      const response = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/sources' });
      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body).error.code).toBe('PERSISTENCE_CONFIGURATION_ERROR');
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = oldDatabaseUrl;
      setWatchRepositoryForTesting(testRepo);
    }
  });

  test('maps source persistence failures to database and validation errors', async () => {
    jest.spyOn(testRepo, 'listSources').mockRejectedValueOnce(new Error('source query failed'));
    const listFailure = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/sources' });
    expect(listFailure.statusCode).toBe(500);

    jest.spyOn(testRepo, 'saveSource').mockRejectedValueOnce(new Error('source validation failed'));
    const registerFailure = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/sources',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
      payload: {
        id: 'SRC-INVALID',
        name: 'Invalid source',
        publisher: 'Test',
        sourceType: 'gazette_extraordinary',
        canonicalUrl: 'https://example.test/notice',
        geographicScope: 'IN-TG',
        subjectScope: 'delimitation_order',
      },
    });
    expect(registerFailure.statusCode).toBe(400);
  });

  test('covers trigger and replay authorization, conflict, generic error, and replay success paths', async () => {
    const unauthorizedTrigger = await app.inject({
      method: 'POST', url: '/api/v1/delimitation/watch/trigger/SRC-ROUTE-001',
    });
    expect(unauthorizedTrigger.statusCode).toBe(401);

    jest.spyOn(DelimitationWatchOrchestrator.prototype, 'runPipeline')
      .mockRejectedValueOnce(new Error('CONCURRENT_RUN_CONFLICT: pipeline active'));
    const conflict = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/trigger/SRC-ROUTE-001',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
    });
    expect(conflict.statusCode).toBe(409);

    jest.spyOn(DelimitationWatchOrchestrator.prototype, 'runPipeline')
      .mockRejectedValueOnce(new Error('unexpected pipeline failure'));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/trigger/SRC-ROUTE-001',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
    });
    expect(failed.statusCode).toBe(500);

    const unauthorizedReplay = await app.inject({
      method: 'POST', url: '/api/v1/delimitation/watch/replay/snapshot-1',
    });
    expect(unauthorizedReplay.statusCode).toBe(401);

    jest.spyOn(DelimitationWatchOrchestrator.prototype, 'replaySnapshot')
      .mockRejectedValueOnce(new Error('CONCURRENT_RUN_IN_PROGRESS: replay active'));
    const replayConflict = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/replay/snapshot-1',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
    });
    expect(replayConflict.statusCode).toBe(409);

    jest.spyOn(DelimitationWatchOrchestrator.prototype, 'replaySnapshot')
      .mockResolvedValueOnce({ outcome: 'REPLAYED' } as any);
    const replayed = await app.inject({
      method: 'POST',
      url: '/api/v1/delimitation/watch/replay/snapshot-1',
      headers: { authorization: 'Bearer test-delim-secret-8f29' },
    });
    expect(replayed.statusCode).toBe(200);
    expect(JSON.parse(replayed.body).data.result.outcome).toBe('REPLAYED');
  });

  test('maps run and accepted-version query exceptions to database errors', async () => {
    jest.spyOn(testRepo, 'listRunsForSource').mockRejectedValueOnce(new Error('run query failed'));
    const runs = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/runs/SRC-ROUTE-001' });
    expect(runs.statusCode).toBe(500);

    jest.spyOn(testRepo, 'listAcceptedVersionsForSource').mockRejectedValueOnce(new Error('version query failed'));
    const versions = await app.inject({ method: 'GET', url: '/api/v1/delimitation/watch/versions/SRC-ROUTE-001' });
    expect(versions.statusCode).toBe(500);
  });


  test('all endpoints fail closed when deployed persistence is unconfigured', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldDatabaseUrl = process.env.DATABASE_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    setWatchRepositoryForTesting(null);
    try {
      const requests = [
        { method: 'GET', url: '/api/v1/delimitation/watch/health' },
        { method: 'GET', url: '/api/v1/delimitation/watch/sources' },
        { method: 'POST', url: '/api/v1/delimitation/watch/sources', payload: { id: 'x' } },
        { method: 'POST', url: '/api/v1/delimitation/watch/trigger/source-1' },
        { method: 'POST', url: '/api/v1/delimitation/watch/replay/snapshot-1' },
        { method: 'GET', url: '/api/v1/delimitation/watch/runs/source-1' },
        { method: 'GET', url: '/api/v1/delimitation/watch/versions/source-1' },
      ] as const;
      for (const request of requests) {
        const response = await app.inject({ ...request, headers: { authorization: 'Bearer test-delim-secret-8f29' } } as any);
        expect(response.statusCode).toBe(503);
        expect(response.body).toContain('PERSISTENCE_CONFIGURATION_ERROR');
      }
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = oldDatabaseUrl;
      setWatchRepositoryForTesting(testRepo);
    }
  });

  test('supports each documented monitor-secret fallback and denies access when no secret is configured', async () => {
    const oldKshetra = process.env.KSHETRA_MONITOR_SECRET;
    const oldMonitor = process.env.MONITOR_WEBHOOK_SECRET;
    const oldDelimitation = process.env.DELIMITATION_WATCH_SECRET;
    try {
      delete process.env.KSHETRA_MONITOR_SECRET;
      process.env.MONITOR_WEBHOOK_SECRET = 'monitor-fallback-secret';
      delete process.env.DELIMITATION_WATCH_SECRET;
      const monitorFallback = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/watch/sources',
        headers: { authorization: 'Bearer monitor-fallback-secret' },
        payload: {
          id: 'SRC-MONITOR-FALLBACK', name: 'Monitor fallback', publisher: 'Test',
          sourceType: 'gazette_extraordinary', canonicalUrl: fixturePath,
          geographicScope: 'IN-TG', subjectScope: 'delimitation_order',
        },
      });
      expect(monitorFallback.statusCode).toBe(201);

      delete process.env.MONITOR_WEBHOOK_SECRET;
      process.env.DELIMITATION_WATCH_SECRET = 'delimitation-fallback-secret';
      const delimitationFallback = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/watch/sources',
        headers: { authorization: 'Bearer delimitation-fallback-secret' },
        payload: {
          id: 'SRC-DELIM-FALLBACK', name: 'Delimitation fallback', publisher: 'Test',
          sourceType: 'gazette_extraordinary', canonicalUrl: fixturePath,
          geographicScope: 'IN-TG', subjectScope: 'delimitation_order',
        },
      });
      expect(delimitationFallback.statusCode).toBe(201);

      delete process.env.DELIMITATION_WATCH_SECRET;
      const denied = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/watch/sources',
        payload: {
          id: 'SRC-NO-SECRET', name: 'No secret', publisher: 'Test',
          sourceType: 'gazette_extraordinary', canonicalUrl: fixturePath,
          geographicScope: 'IN-TG', subjectScope: 'delimitation_order',
        },
      });
      expect(denied.statusCode).toBe(401);
    } finally {
      if (oldKshetra === undefined) delete process.env.KSHETRA_MONITOR_SECRET;
      else process.env.KSHETRA_MONITOR_SECRET = oldKshetra;
      if (oldMonitor === undefined) delete process.env.MONITOR_WEBHOOK_SECRET;
      else process.env.MONITOR_WEBHOOK_SECRET = oldMonitor;
      if (oldDelimitation === undefined) delete process.env.DELIMITATION_WATCH_SECRET;
      else process.env.DELIMITATION_WATCH_SECRET = oldDelimitation;
    }
  });

});
