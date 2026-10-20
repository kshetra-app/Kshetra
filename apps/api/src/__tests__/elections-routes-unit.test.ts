import Fastify, { FastifyInstance } from 'fastify';
import { electionRoutes } from '../routes/elections';
import { electionService } from '../services/electionService';

describe('Election Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  const mockElectionEvent = {
    id: 'elec-tg-2023',
    state: 'TG',
    year: 2023,
    type: 'assembly',
    title: 'Telangana Legislative Assembly Election 2023',
    electionDate: '2023-11-30',
  };

  const mockContest = {
    id: 'contest-tg-65',
    electionId: 'elec-tg-2023',
    constituencyId: 'ac-65',
    constituencyName: 'Kodangal',
    totalElectors: 245000,
    totalPolled: 210000,
  };

  const mockContestDetail = {
    ...mockContest,
    candidates: [
      { id: 'cand-1', name: 'Revanth Reddy', party: 'INC', votes: 107429, rank: 1, result: 'WON' },
      { id: 'cand-2', name: 'Patnam Narender Reddy', party: 'BRS', votes: 74897, rank: 2, result: 'LOST' },
    ],
    winner: { candidateId: 'cand-1', name: 'Revanth Reddy' },
    runnerUp: { candidateId: 'cand-2', name: 'Patnam Narender Reddy' },
  };

  const mockCandidacy = {
    personId: 'p-revanth',
    electionId: 'elec-tg-2023',
    constituencyId: 'ac-65',
    party: 'INC',
    votes: 107429,
    result: 'WON',
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(electionRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. GET /api/v1/elections
  it('GET /api/v1/elections returns 200 with list and default metadata', async () => {
    jest.spyOn(electionService, 'listElectionEvents').mockResolvedValue({
      events: [mockElectionEvent as any],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.metadata.total).toBe(1);
    expect(body.metadata.limit).toBe(20);
    expect(body.metadata.offset).toBe(0);
  });

  it('GET /api/v1/elections forwards query parameters properly', async () => {
    const listSpy = jest.spyOn(electionService, 'listElectionEvents').mockResolvedValue({
      events: [mockElectionEvent as any],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections?state=TG&year=2023&type=assembly&limit=10&offset=5',
    });

    expect(res.statusCode).toBe(200);
    expect(listSpy).toHaveBeenCalledWith({
      state: 'TG',
      year: 2023,
      type: 'assembly',
      limit: 10,
      offset: 5,
    });
    const body = JSON.parse(res.payload);
    expect(body.metadata.limit).toBe(10);
    expect(body.metadata.offset).toBe(5);
  });

  it('GET /api/v1/elections returns 500 when electionService fails', async () => {
    jest.spyOn(electionService, 'listElectionEvents').mockRejectedValue(new Error('PostgreSQL timeout'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toContain('PostgreSQL timeout');
  });

  it('GET /api/v1/elections returns 500 with default message when error lacks message', async () => {
    jest.spyOn(electionService, 'listElectionEvents').mockRejectedValue({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Failed to list elections');
  });

  // 2. GET /api/v1/elections/:id
  it('GET /api/v1/elections/:id returns 200 when event exists', async () => {
    jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('elec-tg-2023');
  });

  it('GET /api/v1/elections/:id returns 404 when event not found', async () => {
    jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-nonexistent',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('GET /api/v1/elections/:id returns 500 when service throws', async () => {
    jest.spyOn(electionService, 'getElectionEventById').mockRejectedValue(new Error('Database offline'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
  });

  it('GET /api/v1/elections/:id returns 500 when service throws error without message', async () => {
    jest.spyOn(electionService, 'getElectionEventById').mockRejectedValue({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Failed to get election event');
  });

  // 3. GET /api/v1/elections/:id/contests
  it('GET /api/v1/elections/:id/contests returns 200 with default metadata when query params omitted', async () => {
    jest.spyOn(electionService, 'listElectionContests').mockResolvedValue({
      contests: [mockContest as any],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.metadata.limit).toBe(20);
    expect(body.metadata.offset).toBe(0);
  });

  it('GET /api/v1/elections/:id/contests returns 200 with contests list and filters', async () => {
    const listContestsSpy = jest.spyOn(electionService, 'listElectionContests').mockResolvedValue({
      contests: [mockContest as any],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests?search=Kodangal&party=INC&limit=15&offset=2',
    });

    expect(res.statusCode).toBe(200);
    expect(listContestsSpy).toHaveBeenCalledWith('elec-tg-2023', {
      search: 'Kodangal',
      party: 'INC',
      limit: 15,
      offset: 2,
    });
    const body = JSON.parse(res.payload);
    expect(body.data.length).toBe(1);
    expect(body.metadata.limit).toBe(15);
    expect(body.metadata.offset).toBe(2);
  });

  it('GET /api/v1/elections/:id/contests returns 500 when service throws', async () => {
    jest.spyOn(electionService, 'listElectionContests').mockRejectedValue(new Error('Contest query failed'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
  });

  it('GET /api/v1/elections/:id/contests returns 500 when service throws error without message', async () => {
    jest.spyOn(electionService, 'listElectionContests').mockRejectedValue({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Failed to list contests');
  });

  // 4. GET /api/v1/elections/:id/contests/:constituencyId
  it('GET /api/v1/elections/:id/contests/:constituencyId returns 200 with contest detail', async () => {
    jest.spyOn(electionService, 'getContestDetail').mockResolvedValue(mockContestDetail as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests/ac-65',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.candidates.length).toBe(2);
  });

  it('GET /api/v1/elections/:id/contests/:constituencyId returns 404 when contest not found', async () => {
    jest.spyOn(electionService, 'getContestDetail').mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests/ac-999',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('GET /api/v1/elections/:id/contests/:constituencyId returns 500 when service throws', async () => {
    jest.spyOn(electionService, 'getContestDetail').mockRejectedValue(new Error('Detail fetch error'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests/ac-65',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
  });

  it('GET /api/v1/elections/:id/contests/:constituencyId returns 500 when service throws without message', async () => {
    jest.spyOn(electionService, 'getContestDetail').mockRejectedValue({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/elec-tg-2023/contests/ac-65',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Failed to get contest detail');
  });

  // 5. GET /api/v1/elections/persons/:personId
  it('GET /api/v1/elections/persons/:personId returns 200 with candidacies list', async () => {
    jest.spyOn(electionService, 'getPersonElections').mockResolvedValue([mockCandidacy as any]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/persons/p-revanth',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.metadata.total).toBe(1);
  });

  it('GET /api/v1/elections/persons/:personId returns 500 when service throws without message', async () => {
    jest.spyOn(electionService, 'getPersonElections').mockRejectedValue({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/elections/persons/p-revanth',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Failed to get person elections');
  });
});
