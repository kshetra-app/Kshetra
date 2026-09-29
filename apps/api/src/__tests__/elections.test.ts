/**
 * apps/api/src/__tests__/elections.test.ts
 *
 * Fastify API integration tests for Milestone W019 Election Data Normalization:
 * - GET /api/v1/elections
 * - GET /api/v1/elections/:id
 * - GET /api/v1/elections/:id/contests
 * - GET /api/v1/elections/:id/contests/:constituencyId
 * - GET /api/v1/elections/persons/:personId
 */
import type { FastifyInstance } from 'fastify';

// Point test execution to the local Supabase container where Migration 051 and seed are deployed
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
process.env.SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

describe('Election Data Normalization API (W019)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import('../server');
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const get = (url: string, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url,
      headers: {
        authorization: 'Bearer test-token',
        'x-test-role': 'service_role',
        ...headers,
      },
    });

  it('1. GET /api/v1/elections returns list of macro election events', async () => {
    const res = await get('/api/v1/elections');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const election = body.data.find((e: any) => e.electionCode === 'TS_LA_2023_GEN');
    expect(election).toBeDefined();
    expect(election.stateCode).toBe('TS');
    expect(election.electionYear).toBe(2023);
    expect(election.electionType).toBe('assembly');
    expect(election.turnoutPercentage).toBe(71.31);
  });

  it('2. GET /api/v1/elections?state=TS&year=2023 filters properly', async () => {
    const res = await get('/api/v1/elections?state=TS&year=2023');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].stateCode).toBe('TS');
    expect(body.data[0].electionYear).toBe(2023);
  });

  it('3. GET /api/v1/elections/:id returns single election event by election_code', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.electionCode).toBe('TS_LA_2023_GEN');
    expect(body.data.title).toContain('Telangana');
  });

  it('4. GET /api/v1/elections/:id with unknown code returns 404 NOT_FOUND', async () => {
    const res = await get('/api/v1/elections/UNKNOWN_ELECTION_CODE');
    expect(res.statusCode).toBe(404);

    const body = JSON.parse(res.payload);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('5. GET /api/v1/elections/:id/contests returns list of contests', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN/contests');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    const codes = body.data.map((c: any) => c.contestCode);
    expect(codes).toContain('TS_LA_2023_GEN_TS-AC-065');
    expect(codes).toContain('TS_LA_2023_GEN_TS-AC-040');
  });

  it('6. GET /api/v1/elections/:id/contests?search=Kodangal filters contests', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN/contests?search=Kodangal');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].constituencyName).toBe('Kodangal');
    expect(body.data[0].constituencyId).toBe('TS-AC-065');
  });

  it('7. GET /api/v1/elections/:id/contests/TS-AC-065 returns full Kodangal contest details', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN/contests/TS-AC-065');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    const detail = body.data;

    expect(detail.contestCode).toBe('TS_LA_2023_GEN_TS-AC-065');
    expect(detail.totalElectors).toBe(240490);
    expect(detail.totalVotesPolled).toBe(195509);
    expect(detail.totalValidVotes).toBe(194545);
    expect(detail.totalNotaVotes).toBe(964);
    expect(detail.turnoutPercentage).toBe(81.29);
    expect(detail.victoryMargin).toBe(32532);

    // Candidates
    expect(Array.isArray(detail.candidates)).toBe(true);
    expect(detail.candidates.length).toBeGreaterThanOrEqual(3);

    // Winner verification
    expect(detail.winner).toBeDefined();
    expect(detail.winner.person.canonicalName).toBe('Anumula Revanth Reddy');
    expect(detail.winner.candidacy.votesReceived).toBe(107429);
    expect(detail.winner.candidacy.voteShare).toBe(55.22);
    expect(detail.winner.party.shortName).toBe('INC');

    // Runner-up verification
    expect(detail.runnerUp).toBeDefined();
    expect(detail.runnerUp.person.canonicalName).toBe('Patnam Narender Reddy');
    expect(detail.runnerUp.candidacy.votesReceived).toBe(74897);
    expect(detail.runnerUp.candidacy.voteShare).toBe(38.50);
    expect(detail.runnerUp.party.shortName).toBe('BRS');

    // Ballot choices (NOTA)
    expect(detail.ballotChoices.length).toBeGreaterThanOrEqual(1);
    const nota = detail.ballotChoices.find((b: any) => b.choiceType === 'NOTA');
    expect(nota).toBeDefined();
    expect(nota.votesReceived).toBe(964);
  });

  it('8. GET /api/v1/elections/:id/contests/TS-AC-040 returns full Gajwel contest details', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN/contests/TS-AC-040');
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    const detail = body.data;

    expect(detail.contestCode).toBe('TS_LA_2023_GEN_TS-AC-040');
    expect(detail.totalElectors).toBe(267882);
    expect(detail.totalVotesPolled).toBe(241855);
    expect(detail.totalValidVotes).toBe(240508);
    expect(detail.turnoutPercentage).toBe(90.28);
    expect(detail.victoryMargin).toBe(19931);

    // Winner verification
    expect(detail.winner.person.canonicalName).toBe('Kalvakuntla Chandrashekar Rao');
    expect(detail.winner.candidacy.votesReceived).toBe(111684);
    expect(detail.winner.party.shortName).toBe('BRS');

    // Runner-up verification
    expect(detail.runnerUp.person.canonicalName).toBe('Eatala Rajender');
    expect(detail.runnerUp.candidacy.votesReceived).toBe(91753);
    expect(detail.runnerUp.party.shortName).toBe('BJP');
  });

  it('9. GET /api/v1/elections/:id/contests/UNKNOWN_AC returns 404 NOT_FOUND', async () => {
    const res = await get('/api/v1/elections/TS_LA_2023_GEN/contests/UNKNOWN-AC');
    expect(res.statusCode).toBe(404);

    const body = JSON.parse(res.payload);
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('10. GET /api/v1/elections/persons/:personId returns contest history', async () => {
    const revanthPersonId = '01900000-0000-0000-0000-000000000011';
    const res = await get(`/api/v1/elections/persons/${revanthPersonId}`);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].personId).toBe(revanthPersonId);
    expect(body.data[0].result).toBe('won');
    expect(body.data[0].votesReceived).toBe(107429);
  });
});
