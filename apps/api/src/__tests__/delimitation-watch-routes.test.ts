/**
 * Fastify Route Integration Tests: Delimitation Watch API (Job 023)
 */

import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import * as path from 'path';
import { setWatchRepositoryForTesting } from '../routes/delimitationWatch';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch';

describe('Delimitation Watch HTTP Routes (/api/v1/delimitation/watch/*)', () => {
  let app: FastifyInstance;
  let testRepo: InMemoryDelimitationWatchRepository;
  const fixturePath = path.resolve(__dirname, '../../../../tests/fixtures/delimitation/initial_delimitation_source_fixture.json');

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
    expect(body.data.versions[0].dataStatus).toBe('OFFICIAL');
  });
});
