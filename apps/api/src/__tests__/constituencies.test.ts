import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Constituency Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── LIST ───

  it('GET /states/TS/constituencies should return 119 constituencies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.state).toBe('TS');
    expect(body.count).toBe(119);
    expect(body.data).toHaveLength(119);

    const first = body.data[0];
    expect(first.id).toBe('TS-AC-1');
    expect(first.name).toBe('Sirpur');
    expect(first.acNo).toBe(1);
    expect(first.stateCode).toBe('TS');
    expect(first.district).toBe('Adilabad');
    expect(first.reservationStatus).toBe('ST');
    expect(first.currentParty).toBe('INC');
    expect(first.currentMLA).toBeDefined();
  });

  it('GET /states/KA/constituencies should return empty for unsupported state', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/KA/constituencies',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.state).toBe('KA');
    expect(body.count).toBe(0);
    expect(body.data).toHaveLength(0);
  });

  // ─── DETAIL ───

  it('GET /states/TS/constituencies/1 should return Sirpur with election data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/1',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Sirpur');
    expect(body.acNo).toBe(1);
    expect(body.election2023).toBeDefined();
    expect(body.election2023.winner).toBe('INC');
    expect(body.election2023.winnerVotes).toBeGreaterThan(0);
    expect(body.election2023.margin).toBeGreaterThan(0);
    expect(body.election2023.marginPercent).toBeGreaterThan(0);
  });

  it('GET /states/TS/constituencies/999 should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/999',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Not Found');
  });

  // ─── LOCATE ───

  it('GET /constituencies/locate should require lat and lng', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/constituencies/locate',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Bad Request');
  });

  it('GET /constituencies/locate should find Goshamahal for Charminar coords', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/constituencies/locate?lat=17.3616&lng=78.4747',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.latitude).toBeCloseTo(17.3616);
    expect(body.longitude).toBeCloseTo(78.4747);
    expect(body.constituency).not.toBeNull();
    expect(body.constituency.name).toBe('Goshamahal');
    expect(body.constituency.currentParty).toBe('BJP');
  });

  it('GET /constituencies/locate should return null for out-of-state coords', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/constituencies/locate?lat=12.97&lng=77.59',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.constituency).toBeNull();
  });
});
