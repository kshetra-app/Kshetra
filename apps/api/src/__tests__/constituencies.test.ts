import { buildApp } from '../server';

describe('Constituency Routes', () => {
  it('GET /api/v1/states/:code/constituencies should return a list', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.state).toBe('TS');
    expect(body.count).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);

    await app.close();
  });

  it('GET /api/v1/states/:code/constituencies/:id should return 404 for unknown', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/unknown-id',
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Not Found');

    await app.close();
  });

  it('GET /api/v1/constituencies/locate should require lat and lng', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/constituencies/locate',
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Bad Request');

    await app.close();
  });

  it('GET /api/v1/constituencies/locate should accept valid coordinates', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/constituencies/locate?lat=17.385&lng=78.486',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.latitude).toBeCloseTo(17.385);
    expect(body.longitude).toBeCloseTo(78.486);

    await app.close();
  });
});
