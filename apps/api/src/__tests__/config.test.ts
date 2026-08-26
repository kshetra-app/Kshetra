import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Config & Feature Flags Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/config/flags returns default feature flags', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/config/flags',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.flags).toBeDefined();
    expect(body.flags.enableMap).toBe(true);
    expect(body.flags.enableExploreSearch).toBe(true);
    expect(body.flags.enableLiveTab).toBe(true);
  });

  it('PATCH /api/v1/config/flags updates active feature flags', async () => {
    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/flags',
      payload: {
        enableShortsTab: false,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.payload);
    expect(updateBody.status).toBe('updated');
    expect(updateBody.flags.enableShortsTab).toBe(false);

    // Verify GET reflects the patch
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/config/flags',
    });
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.flags.enableShortsTab).toBe(false);

    // Restore for other tests
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/config/flags',
      payload: {
        enableShortsTab: true,
      },
    });
  });
});
