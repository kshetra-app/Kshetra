import { buildApp } from '../server';

describe('Broadcast API Routes', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/broadcast/summary should return a summary of states per ruling party', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/broadcast/summary',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.summary).toBeDefined();
    expect(body.states).toBeDefined();
    expect(Array.isArray(body.states)).toBe(true);

    // Verify some values
    expect(body.summary.INC).toBeGreaterThanOrEqual(1);
    expect(body.states.find((s: any) => s.code === 'TS')).toBeDefined();
  });

  it('GET /api/v1/broadcast/state/TS should return party standings and detailed constituency results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/broadcast/state/TS',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.stateCode).toBe('TS');
    expect(body.stateName).toBe('Telangana');
    expect(body.totalSeats).toBe(119);
    expect(body.standings).toBeDefined();
    expect(body.constituencies).toBeDefined();

    // Verify standings
    expect(body.standings.length).toBeGreaterThan(0);
    expect(body.standings[0].party).toBeDefined();
    expect(body.standings[0].won).toBeGreaterThan(0);

    // Verify constituencies
    expect(body.constituencies.length).toBe(119);
    expect(body.constituencies[0].acNo).toBeDefined();
    expect(body.constituencies[0].name).toBeDefined();
    expect(body.constituencies[0].winnerParty).toBeDefined();
    expect(body.constituencies[0].margin).toBeDefined();
  });

  it('GET /api/v1/broadcast/state/TS/constituency/1 should return details for assembly constituency #1', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/broadcast/state/TS/constituency/1',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.acNo).toBe(1);
    expect(body.name).toBeDefined();
    expect(body.district).toBeDefined();
    expect(body.winnerParty).toBeDefined();
    expect(body.margin).toBeDefined();
  });

  it('GET /api/v1/broadcast/state/INVALID should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/broadcast/state/INVALID',
    });

    expect(response.statusCode).toBe(404);
  });

  it('GET /api/v1/broadcast/state/TS/constituency/999 should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/broadcast/state/TS/constituency/999',
    });

    expect(response.statusCode).toBe(404);
  });
});
