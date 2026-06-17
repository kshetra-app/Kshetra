import { buildApp } from '../server';

/**
 * Contract tests for the public, deterministic route surfaces:
 * states, civic, journalist, politician, campaign and delimitation.
 * These guarantee response shape and status-code stability.
 */
describe('Public route contracts', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string) => app.inject({ method: 'GET', url });
  const post = (url: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url, payload });
  const patch = (url: string) => app.inject({ method: 'PATCH', url });

  // ── States ──────────────────────────────────────────────
  describe('states', () => {
    it('lists all states', async () => {
      const res = await get('/api/v1/states');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(res.payload).states)).toBe(true);
    });

    it('returns a known state', async () => {
      const res = await get('/api/v1/states/TS');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).code).toBe('TS');
    });

    it('404s an unknown state', async () => {
      const res = await get('/api/v1/states/ZZ');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Civic ───────────────────────────────────────────────
  describe('civic', () => {
    it('budget, attendance, bills, schemes, projects, rti, hearings, cdi', async () => {
      for (const url of [
        '/api/v1/civic/budget/TS',
        '/api/v1/civic/attendance?state=TS',
        '/api/v1/civic/bills?state=TS',
        '/api/v1/civic/schemes',
        '/api/v1/civic/projects',
        '/api/v1/civic/rti',
        '/api/v1/civic/hearings',
        '/api/v1/civic/cdi/TS-AC-1',
      ]) {
        const res = await get(url);
        expect(res.statusCode).toBe(200);
      }
    });

    it('records bill opinion, files & upvotes RTI', async () => {
      expect((await post('/api/v1/civic/bills/b1/opinion', { support: true })).statusCode).toBe(200);
      expect((await post('/api/v1/civic/rti', { subject: 'x' })).statusCode).toBe(200);
      expect((await post('/api/v1/civic/rti/r1/upvote', {})).statusCode).toBe(200);
    });
  });

  // ── Journalist ──────────────────────────────────────────
  describe('journalist', () => {
    it('serves list endpoints and 404s a missing article', async () => {
      expect((await get('/api/v1/journalist/articles?limit=5')).statusCode).toBe(200);
      expect((await get('/api/v1/journalist/fact-checks')).statusCode).toBe(200);
      expect((await get('/api/v1/journalist/breaking')).statusCode).toBe(200);
      expect((await get('/api/v1/journalist/profiles')).statusCode).toBe(200);
      expect((await get('/api/v1/journalist/articles/missing')).statusCode).toBe(404);
    });

    it('accepts vouch, flag and tip', async () => {
      expect((await post('/api/v1/journalist/articles/a1/vouch', {})).statusCode).toBe(200);
      expect((await post('/api/v1/journalist/articles/a1/flag', { reason: 'x' })).statusCode).toBe(200);
      expect((await post('/api/v1/journalist/articles/a1/tip', { amountINR: 100 })).statusCode).toBe(200);
    });
  });

  // ── Politician ──────────────────────────────────────────
  describe('politician', () => {
    it('serves list endpoints and 404s a missing profile', async () => {
      expect((await get('/api/v1/politician/profiles')).statusCode).toBe(200);
      expect((await get('/api/v1/politician/events')).statusCode).toBe(200);
      expect((await get('/api/v1/politician/manifestos')).statusCode).toBe(200);
      expect((await get('/api/v1/politician/surveys')).statusCode).toBe(200);
      expect((await get('/api/v1/politician/profiles/missing')).statusCode).toBe(404);
    });

    it('accepts rsvp, manifesto vote, survey response and grievance', async () => {
      expect((await post('/api/v1/politician/events/e1/rsvp', {})).statusCode).toBe(200);
      expect((await post('/api/v1/politician/manifestos/m1/items/i1/vote', { support: true })).statusCode).toBe(200);
      expect((await post('/api/v1/politician/surveys/s1/respond', { answers: {} })).statusCode).toBe(200);
      expect((await post('/api/v1/politician/grievances', { politicianId: 'p1', subject: 's', description: 'd', category: 'c' })).statusCode).toBe(200);
    });
  });

  // ── Campaign ────────────────────────────────────────────
  describe('campaign', () => {
    it('serves list endpoints and 404s a missing campaign', async () => {
      expect((await get('/api/v1/campaign/campaigns')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/ads')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/revenue')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/booths')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/volunteers')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/ab-tests')).statusCode).toBe(200);
      expect((await get('/api/v1/campaign/campaigns/missing')).statusCode).toBe(404);
    });

    it('creates campaign/ad and pauses/resumes ads', async () => {
      expect((await post('/api/v1/campaign/campaigns', { name: 'c' })).statusCode).toBe(200);
      expect((await post('/api/v1/campaign/ads', { name: 'a' })).statusCode).toBe(200);
      expect((await patch('/api/v1/campaign/ads/a1/pause')).statusCode).toBe(200);
      expect((await patch('/api/v1/campaign/ads/a1/resume')).statusCode).toBe(200);
    });
  });

  // ── Delimitation ────────────────────────────────────────
  describe('delimitation', () => {
    it('serves projections, status, timeline, gainers/losers, reservation', async () => {
      expect((await get('/api/v1/delimitation/projections')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/projections/UP')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/projections/ZZ')).statusCode).toBe(404);
      expect((await get('/api/v1/delimitation/status')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/timeline')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/gainers-losers')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/reservation')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/reservation/TS')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/reservation/ZZ')).statusCode).toBe(404);
    });

    it('simulates and compares states', async () => {
      expect((await get('/api/v1/delimitation/simulate/MH?seats=400&mode=equal_population')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/simulate/ZZ')).statusCode).toBe(404);
      expect((await get('/api/v1/delimitation/compare?states=TS,AP')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/compare')).statusCode).toBe(400);
      expect((await get('/api/v1/delimitation/compare?states=ZZ,YY')).statusCode).toBe(404);
    });

    it('validates citizen impact PIN code', async () => {
      expect((await get('/api/v1/delimitation/impact/500001')).statusCode).toBe(200);
      expect((await get('/api/v1/delimitation/impact/abc')).statusCode).toBe(400);
    });

    it('guards and accepts the monitor webhook', async () => {
      const missing = await post('/api/v1/delimitation/monitor-webhook', { type: 'gazette' });
      expect(missing.statusCode).toBe(400);
      const ok = await post('/api/v1/delimitation/monitor-webhook', {
        type: 'gazette',
        entries: [{ id: '1', title: 't', date: '2025-01-01', relevanceScore: 80 }],
      });
      expect(ok.statusCode).toBe(200);
      expect(JSON.parse(ok.payload).processed).toBe(1);
    });
  });
});
