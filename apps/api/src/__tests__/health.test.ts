import { buildApp } from '../server';

describe('Health Route', () => {
  it('GET /api/health should return status ok', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('kshetra-api');
    expect(body.version).toBe('0.1.0');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });
});
