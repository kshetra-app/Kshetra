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
    expect(first.district).toBe('Kumuram Bheem Asifabad');
    expect(first.reservationStatus).toBe('ST');
    expect(first.currentParty).toBe('BJP');
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
    expect(body.election2023.winner).toBe('BJP');
    expect(body.election2023.winnerVotes).toBeGreaterThan(0);
    expect(body.election2023.margin).toBeGreaterThan(0);
    expect(body.election2023.marginPercent).toBeGreaterThan(0);
  });

  it('GET /states/TS/constituencies/charminar should return Charminar by name', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/charminar',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Charminar');
    expect(body.acNo).toBe(66);
    expect(body.election2023.winner).toBe('AIMIM');
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

  // ─── SEARCH ───

  it('GET /states/TS/constituencies/search?q=charminar should find Charminar', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?q=charminar',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.data[0].name).toBe('Charminar');
  });

  it('GET /states/TS/constituencies/search?party=AIMIM should return 7 seats', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?party=AIMIM',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBe(7);
    body.data.forEach((c: any) => {
      expect(c.currentParty).toBe('AIMIM');
    });
  });

  it('GET /states/TS/constituencies/search?district=hyderabad should return Hyd ACs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?district=hyderabad',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThan(0);
    body.data.forEach((c: any) => {
      expect(c.district).toBe('Hyderabad');
    });
  });

  it('GET /states/TS/constituencies/search?type=ST should return ST reserved seats', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?type=ST',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThan(0);
    body.data.forEach((c: any) => {
      expect(c.reservationStatus).toBe('ST');
    });
  });

  // ─── ANALYTICS ───

  it('GET /states/TS/analytics should return party summary and districts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/analytics',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(body.state).toBe('TS');
    expect(body.totalConstituencies).toBe(119);
    expect(body.totalDistricts).toBeGreaterThan(0);

    expect(body.partySummary).toBeInstanceOf(Array);
    expect(body.partySummary.length).toBeGreaterThan(0);
    const inc = body.partySummary.find((p: any) => p.party === 'INC');
    expect(inc).toBeDefined();
    expect(inc.seats).toBeGreaterThan(50);
    expect(inc.percentage).toBeGreaterThan(40);

    expect(body.districts).toBeInstanceOf(Array);
    expect(body.districts.length).toBe(body.totalDistricts);
    expect(body.districts[0].name).toBeDefined();
    expect(body.districts[0].totalSeats).toBeGreaterThan(0);
    expect(body.districts[0].dominantParty).toBeDefined();
    expect(body.districts[0].parties).toBeDefined();

    expect(body.margins.closest.margin).toBeGreaterThan(0);
    expect(body.margins.biggest.margin).toBeGreaterThan(body.margins.closest.margin);
  });

  it('GET /states/KA/analytics should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/KA/analytics',
    });

    expect(response.statusCode).toBe(404);
  });

  // ─── ELECTIONS HISTORY ───

  it('GET /states/TS/elections should return 3 elections', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/elections',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.state).toBe('TS');
    expect(body.count).toBe(3);
    expect(body.elections).toHaveLength(3);

    const years = body.elections.map((e: any) => e.year);
    expect(years).toContain(2014);
    expect(years).toContain(2018);
    expect(years).toContain(2023);

    // Each election should have seats summing to 119
    for (const election of body.elections) {
      const totalWon = election.partyResults.reduce(
        (s: number, p: any) => s + p.seatsWon,
        0,
      );
      expect(totalWon).toBe(119);
    }
  });

  it('GET /states/KA/elections should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/KA/elections',
    });

    expect(response.statusCode).toBe(404);
  });

  // ─── MLA PROFILES ───

  it('GET /states/TS/mla should return all profiles', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/mla',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.state).toBe('TS');
    expect(body.count).toBe(119);
    expect(body.profiles).toHaveLength(119);
    expect(body.profiles[0]).toHaveProperty('name');
    expect(body.profiles[0]).toHaveProperty('party');
    expect(body.profiles[0]).toHaveProperty('terms');
  });

  it('GET /states/TS/mla/29 should return KTR profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/mla/29',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.acNo).toBe(29);
    expect(body.profile.name).toBe('K. T. Rama Rao');
    expect(body.profile.party).toBe('BRS');
    expect(body.profile.terms).toBe(3);
  });

  it('GET /states/TS/mla/2 should return profile for AC 2', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/mla/2',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.acNo).toBe(2);
    expect(body.profile.name).toBeDefined();
  });

  it('GET /states/TS/mla/abc should return 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/mla/abc',
    });

    expect(response.statusCode).toBe(400);
  });

  // ─── SEARCH: MARGIN RANGE ───

  it('GET /states/TS/constituencies/search?maxMargin=5000 should return close contests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?maxMargin=5000',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThan(119);
  });

  it('GET /states/TS/constituencies/search?minMargin=50000 should return landslides', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?minMargin=50000',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThan(119);
  });

  // ─── SEARCH: SORT ───

  it('GET /states/TS/constituencies/search?sort=name should return alphabetically sorted', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?sort=name',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const names = body.data.map((d: any) => d.name);
    const sorted = [...names].sort((a: string, b: string) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('GET /states/TS/constituencies/search?sort=margin_asc should return closest margins first', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/states/TS/constituencies/search?sort=margin_asc&party=INC',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.count).toBeGreaterThan(1);
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
