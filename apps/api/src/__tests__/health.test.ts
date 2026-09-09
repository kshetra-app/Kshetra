import { buildApp } from '../server';

describe('Health Route Semantics (Amendment v1.4 Part 18)', () => {
  it('GET /api/health should return LIVENESS status ok without claiming DB connectivity', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.semanticType).toBe('LIVENESS');
    expect(body.service).toBe('kshetra-api');
    expect(body.version).toBe('0.1.0');
    expect(body.uptimeSeconds).toBeDefined();
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it('GET /api/health/db should handle DB readiness probe gracefully', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    // In test environment without real credentials, may return 503 degraded or 200 ok if live
    expect([200, 503]).toContain(response.statusCode);

    const body = JSON.parse(response.payload);
    expect(body.semanticType).toBe('DATABASE CONNECTIVITY');
    expect(body.service).toBe('kshetra-api');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });
});

