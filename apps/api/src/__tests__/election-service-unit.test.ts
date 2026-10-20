import Fastify, { FastifyInstance } from 'fastify';
import { ElectionService, electionService } from '../services/electionService';
import { electionRoutes } from '../routes/elections';
import { supabase } from '../lib/supabase';

describe('ElectionService & Routes Unit Tests (W019)', () => {
  let app: FastifyInstance;

  const mockElectionEvent = {
    id: '01900000-0000-0000-0000-000000000001',
    election_code: 'TS_LA_2023',
    state_code: 'TS',
    election_type: 'assembly',
    election_year: 2023,
    title: 'Telangana Legislative Assembly General Election 2023',
    notification_date: '2023-11-03',
    polling_date: '2023-11-30',
    counting_date: '2023-12-03',
    status: 'COMPLETED',
    total_constituencies: 119,
    total_electors: 32602799,
    total_votes_polled: 23605000,
    turnout_percentage: 72.4,
    data_status: 'OFFICIAL',
    provenance_id: 'ECI-TS-2023-001',
    metadata: { term: 3 },
    created_at: '2023-12-04T00:00:00Z',
    updated_at: '2023-12-04T00:00:00Z',
  };

  const mockContest = {
    id: '01900000-0000-0000-0000-000000000065',
    election_id: '01900000-0000-0000-0000-000000000001',
    contest_code: 'TS_LA_2023_GEN_TS-AC-065',
    constituency_id: 'TS-AC-065',
    constituency_version_id: 'CV-065',
    constituency_name: 'Kodangal',
    reservation_status: 'GEN',
    status: 'DECLARED',
    is_uncontested: false,
    countermanded_contest_id: null,
    total_electors: 240000,
    total_votes_polled: 195000,
    total_valid_votes: 194000,
    total_rejected_votes: 100,
    total_nota_votes: 900,
    turnout_percentage: 81.25,
    victory_margin: 32532,
    winning_candidacy_id: 'CAND-065-01',
    runner_up_candidacy_id: 'CAND-065-02',
    data_status: 'OFFICIAL',
    provenance_id: 'ECI-FORM21E-065',
    metadata: {},
    created_at: '2023-12-04T00:00:00Z',
    updated_at: '2023-12-04T00:00:00Z',
  };

  const mockCandidateRows = [
    {
      id: 'CAND-065-01',
      contest_id: '01900000-0000-0000-0000-000000000065',
      person_id: '01900000-0000-0000-0000-000000000011',
      election_year: 2023,
      election_type: 'assembly',
      constituency_type: 'assembly',
      constituency_id: 'TS-AC-065',
      party_id: 'ORG-PARTY-INC',
      is_independent: false,
      result: 'WON',
      votes_received: 107429,
      evm_votes: 106500,
      postal_votes: 929,
      vote_share: 55.35,
      rank: 1,
      affidavit_id: 'AFF-001',
      data_status: 'OFFICIAL',
      created_at: '2023-12-04T00:00:00Z',
      updated_at: '2023-12-04T00:00:00Z',
      canonical_persons: {
        id: '01900000-0000-0000-0000-000000000011',
        canonical_name: 'Anumula Revanth Reddy',
        aliases: ['ARR'],
        data_status: 'VERIFIED',
        photo_url: 'https://example.com/revanth.jpg',
        dob_estimated: false,
        metadata: {},
        created_at: '2023-12-04T00:00:00Z',
        updated_at: '2023-12-04T00:00:00Z',
      },
      political_organizations: {
        id: 'ORG-PARTY-INC',
        org_type: 'political_party',
        name: 'Indian National Congress',
        short_name: 'INC',
        symbol_url: 'https://example.com/inc.png',
        brand_colors: {},
        data_status: 'OFFICIAL',
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2020-01-01T00:00:00Z',
      },
    },
    {
      id: 'CAND-065-02',
      contest_id: '01900000-0000-0000-0000-000000000065',
      person_id: '01900000-0000-0000-0000-000000000012',
      election_year: 2023,
      election_type: 'assembly',
      constituency_type: 'assembly',
      constituency_id: 'TS-AC-065',
      party_id: 'ORG-PARTY-BRS',
      is_independent: false,
      result: 'LOST',
      votes_received: 74897,
      evm_votes: 74200,
      postal_votes: 697,
      vote_share: 38.6,
      rank: 2,
      affidavit_id: 'AFF-002',
      data_status: 'OFFICIAL',
      created_at: '2023-12-04T00:00:00Z',
      updated_at: '2023-12-04T00:00:00Z',
      canonical_persons: {
        id: '01900000-0000-0000-0000-000000000012',
        canonical_name: 'Patnam Narender Reddy',
        aliases: [],
        data_status: 'VERIFIED',
        photo_url: null,
        dob_estimated: false,
        metadata: {},
        created_at: '2023-12-04T00:00:00Z',
        updated_at: '2023-12-04T00:00:00Z',
      },
      political_organizations: {
        id: 'ORG-PARTY-BRS',
        org_type: 'political_party',
        name: 'Bharat Rashtra Samithi',
        short_name: 'BRS',
        symbol_url: null,
        brand_colors: {},
        data_status: 'OFFICIAL',
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2020-01-01T00:00:00Z',
      },
    },
  ];

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

  describe('listElectionEvents', () => {
    it('lists election events with state, year, and type filters', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        expect(table).toBe('election_events');
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [mockElectionEvent],
            count: 1,
            error: null,
          }),
        };
      }) as any);

      const res = await electionService.listElectionEvents({
        state: 'TS',
        year: 2023,
        type: 'assembly',
        limit: 10,
        offset: 0,
      });

      expect(res.total).toBe(1);
      expect(res.events[0].electionCode).toBe('TS_LA_2023');
      expect(res.events[0].totalConstituencies).toBe(119);
    });

    it('throws error when database query fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          count: null,
          error: { message: 'Database timeout' },
        }),
      })) as any);

      await expect(electionService.listElectionEvents()).rejects.toThrow(
        'Failed to list election events: Database timeout'
      );
    });
  });

  describe('getElectionEventById', () => {
    it('resolves by UUID', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockElectionEvent, error: null }),
      })) as any);

      const res = await electionService.getElectionEventById('01900000-0000-0000-0000-000000000001');
      expect(res?.electionCode).toBe('TS_LA_2023');
    });

    it('resolves by election code', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockElectionEvent, error: null }),
      })) as any);

      const res = await electionService.getElectionEventById('TS_LA_2023');
      expect(res?.id).toBe('01900000-0000-0000-0000-000000000001');
    });

    it('returns null when event not found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      const res = await electionService.getElectionEventById('NONEXISTENT');
      expect(res).toBeNull();
    });

    it('throws error on database failure', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'Connection reset' } }),
      })) as any);

      await expect(electionService.getElectionEventById('TS_LA_2023')).rejects.toThrow(
        'Failed to get election event: Connection reset'
      );
    });
  });

  describe('listElectionContests', () => {
    it('returns empty when election event not found', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(null);

      const res = await electionService.listElectionContests('MISSING_ELECTION');
      expect(res.total).toBe(0);
      expect(res.contests).toEqual([]);
    });

    it('lists contests matching search query', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockContest],
          count: 1,
          error: null,
        }),
      })) as any);

      const res = await electionService.listElectionContests('TS_LA_2023', { search: 'Kodangal' });
      expect(res.total).toBe(1);
      expect(res.contests[0].constituencyName).toBe('Kodangal');
    });

    it('throws error when contest query fails', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          count: null,
          error: { message: 'Contests query error' },
        }),
      })) as any);

      await expect(electionService.listElectionContests('TS_LA_2023')).rejects.toThrow(
        'Failed to list election contests: Contests query error'
      );
    });
  });

  describe('getContestDetail', () => {
    it('returns full contest detail with candidates, winner, and ballot choices', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockContest, error: null }),
          };
        }
        if (table === 'candidacies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockCandidateRows, error: null }),
          };
        }
        if (table === 'ballot_choices') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'BC-01',
                  contest_id: mockContest.id,
                  choice_type: 'NOTA',
                  is_valid_vote: true,
                  votes_received: 900,
                  vote_share: 0.46,
                  created_at: '2023-12-04T00:00:00Z',
                },
              ],
              error: null,
            }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await electionService.getContestDetail('TS_LA_2023', 'TS-AC-065');
      expect(res).not.toBeNull();
      expect(res?.constituencyName).toBe('Kodangal');
      expect(res?.candidates.length).toBe(2);
      expect(res?.winner?.person?.canonicalName).toBe('Anumula Revanth Reddy');
      expect(res?.runnerUp?.person?.canonicalName).toBe('Patnam Narender Reddy');
      expect(res?.ballotChoices[0].choiceType).toBe('NOTA');
    });

    it('returns null if election event or contest does not exist', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(null);
      const res1 = await electionService.getContestDetail('NONEXISTENT', 'TS-AC-001');
      expect(res1).toBeNull();

      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      const res2 = await electionService.getContestDetail('TS_LA_2023', 'MISSING_AC');
      expect(res2).toBeNull();
    });

    it('handles database errors in subqueries gracefully', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockContest, error: null }),
          };
        }
        if (table === 'candidacies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Candidacies failed' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(electionService.getContestDetail('TS_LA_2023', 'TS-AC-065')).rejects.toThrow(
        'Failed to get contest candidates: Candidacies failed'
      );
    });
  });

  describe('getPersonElections', () => {
    it('returns candidate contest history for person', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCandidateRows, error: null }),
      })) as any);

      const res = await electionService.getPersonElections('01900000-0000-0000-0000-000000000011');
      expect(res.length).toBe(2);
      expect(res[0].result).toBe('WON');
      expect(res[0].votesReceived).toBe(107429);
    });

    it('throws error when candidacies query fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query aborted' } }),
      })) as any);

      await expect(electionService.getPersonElections('01900000-0000-0000-0000-000000000011')).rejects.toThrow(
        'Failed to get person elections: Query aborted'
      );
    });
  });

  describe('Election Fastify HTTP Routes', () => {
    it('GET /api/v1/elections lists election events', async () => {
      jest.spyOn(electionService, 'listElectionEvents').mockResolvedValue({
        events: [{
          id: mockElectionEvent.id,
          electionCode: mockElectionEvent.election_code,
          stateCode: mockElectionEvent.state_code,
          electionType: mockElectionEvent.election_type,
          electionYear: mockElectionEvent.election_year,
          title: mockElectionEvent.title,
          notificationDate: mockElectionEvent.notification_date,
          pollingDate: mockElectionEvent.polling_date,
          countingDate: mockElectionEvent.counting_date,
          status: mockElectionEvent.status,
          totalConstituencies: mockElectionEvent.total_constituencies,
          totalElectors: mockElectionEvent.total_electors,
          totalVotesPolled: mockElectionEvent.total_votes_polled,
          turnoutPercentage: mockElectionEvent.turnout_percentage,
          dataStatus: mockElectionEvent.data_status,
          provenanceId: mockElectionEvent.provenance_id,
          metadata: mockElectionEvent.metadata,
          createdAt: mockElectionEvent.created_at,
          updatedAt: mockElectionEvent.updated_at,
        } as any],
        total: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections?state=TS&year=2023&type=assembly',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.metadata.total).toBe(1);
      expect(body.data[0].electionCode).toBe('TS_LA_2023');
    });

    it('GET /api/v1/elections/:id returns election event', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue({
        id: mockElectionEvent.id,
        electionCode: mockElectionEvent.election_code,
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections/TS_LA_2023',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.id).toBe(mockElectionEvent.id);
    });

    it('GET /api/v1/elections/:id returns 404 when not found', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections/NONEXISTENT',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('NOT_FOUND');
    });

    it('GET /api/v1/elections/:id/contests lists contests', async () => {
      jest.spyOn(electionService, 'listElectionContests').mockResolvedValue({
        contests: [{
          id: mockContest.id,
          constituencyName: 'Kodangal',
        } as any],
        total: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections/TS_LA_2023/contests?search=Kodangal',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.metadata.total).toBe(1);
      expect(body.data[0].constituencyName).toBe('Kodangal');
    });

    it('GET /api/v1/elections/:id/contests/:constituencyId returns contest return', async () => {
      jest.spyOn(electionService, 'getContestDetail').mockResolvedValue({
        id: mockContest.id,
        electionId: mockContest.election_id,
        contestCode: mockContest.contest_code,
        constituencyId: mockContest.constituency_id,
        constituencyVersionId: mockContest.constituency_version_id,
        constituencyName: 'Kodangal',
        reservationStatus: 'GEN',
        status: 'completed',
        isUncontested: false,
        countermandedContestId: null,
        totalElectors: 240000,
        totalVotesPolled: 195000,
        totalValidVotes: 194000,
        totalRejectedVotes: 100,
        totalNotaVotes: 900,
        turnoutPercentage: 81.25,
        victoryMargin: 32532,
        winningCandidacyId: 'CAND-065-01',
        runnerUpCandidacyId: 'CAND-065-02',
        dataStatus: 'OFFICIAL',
        provenanceId: 'ECI-FORM21E-065',
        metadata: {},
        createdAt: '2023-12-04T00:00:00Z',
        updatedAt: '2023-12-04T00:00:00Z',
        election: mockElectionEvent as any,
        candidates: mockCandidateRows as any,
        ballotChoices: [],
        winner: null,
        runnerUp: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections/TS_LA_2023/contests/TS-AC-065',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.constituencyName).toBe('Kodangal');
    });

    it('GET /api/v1/elections/persons/:personId returns candidacies', async () => {
      jest.spyOn(electionService, 'getPersonElections').mockResolvedValue(mockCandidateRows as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/elections/persons/01900000-0000-0000-0000-000000000011',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.length).toBe(2);
      expect(body.metadata.total).toBe(2);
    });
  });

  describe('Exhaustive Branch Coverage & Edge Case Hardening', () => {
    it('covers all clamp boundaries and null fallbacks in listElectionEvents', async () => {
      // limit > 50, limit < 1, offset < 0, data null, count null
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, count: null, error: null }),
      })) as any);

      const resCapped = await electionService.listElectionEvents({ limit: 100, offset: -5 });
      expect(resCapped.events).toEqual([]);
      expect(resCapped.total).toBe(0);

      const resMin = await electionService.listElectionEvents({ limit: -10 });
      expect(resMin.events).toEqual([]);
      expect(resMin.total).toBe(0);
    });

    it('covers all clamp boundaries and null fallbacks in listElectionContests', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, count: null, error: null }),
      })) as any);

      const resCapped = await electionService.listElectionContests('TS_LA_2023', { limit: 200, offset: -10 });
      expect(resCapped.contests).toEqual([]);
      expect(resCapped.total).toBe(0);

      const resMin = await electionService.listElectionContests('TS_LA_2023', { limit: -5 });
      expect(resMin.contests).toEqual([]);
      expect(resMin.total).toBe(0);
    });

    it('throws when election_contests query errors in getContestDetail (line 219)', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'Contest table failure' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(electionService.getContestDetail('TS_LA_2023', 'TS-AC-065')).rejects.toThrow(
        'Failed to get contest: Contest table failure'
      );
    });

    it('throws when ballot_choices query errors in getContestDetail (line 248)', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockContest, error: null }),
          };
        }
        if (table === 'candidacies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'ballot_choices') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Ballot table failure' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(electionService.getContestDetail('TS_LA_2023', 'TS-AC-065')).rejects.toThrow(
        'Failed to get ballot choices: Ballot table failure'
      );
    });

    it('covers all mapper branches with nullish and sparse rows', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue({
        id: 'sparse-election',
        election_code: 'SPARSE',
        state_code: 'TS',
        election_type: 'assembly',
        election_year: 2023,
        title: 'Sparse',
        notification_date: null,
        polling_date: '2023-11-30',
        counting_date: null,
        status: 'SCHEDULED',
        total_constituencies: null,
        total_electors: null,
        total_votes_polled: null,
        turnout_percentage: null,
        data_status: 'PROVISIONAL',
        provenance_id: null,
        metadata: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      } as any);

      const sparseContest = {
        id: 'sparse-contest',
        election_id: 'sparse-election',
        contest_code: 'SPARSE_C',
        constituency_id: 'AC-1',
        constituency_version_id: null,
        constituency_name: 'Sparse AC',
        reservation_status: 'GEN',
        status: 'UPCOMING',
        is_uncontested: 0,
        countermanded_contest_id: null,
        total_electors: null,
        total_votes_polled: null,
        total_valid_votes: null,
        total_rejected_votes: undefined,
        total_nota_votes: null,
        turnout_percentage: null,
        victory_margin: null,
        winning_candidacy_id: null,
        runner_up_candidacy_id: null,
        data_status: 'PROVISIONAL',
        provenance_id: null,
        metadata: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      const sparseCandidates = [
        {
          id: 'cand-no-person',
          contest_id: 'sparse-contest',
          person_id: 'p-1',
          election_year: 2023,
          election_type: 'assembly',
          constituency_type: 'assembly',
          constituency_id: 'AC-1',
          party_id: null,
          is_independent: false,
          result: 'LOST',
          votes_received: null,
          evm_votes: null,
          postal_votes: undefined,
          vote_share: null,
          rank: null,
          affidavit_id: null,
          data_status: 'PROVISIONAL',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          canonical_persons: null,
          political_organizations: null,
        },
      ];

      const sparseBallot = [
        {
          id: 'bc-nulls',
          contest_id: 'sparse-contest',
          choice_type: 'REJECTED',
          is_valid_vote: null,
          votes_received: null,
          vote_share: null,
          created_at: '2023-01-01',
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: sparseContest, error: null }),
          };
        }
        if (table === 'candidacies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: sparseCandidates, error: null }),
          };
        }
        if (table === 'ballot_choices') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: sparseBallot, error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await electionService.getContestDetail('SPARSE', 'AC-1');
      expect(res).not.toBeNull();
      expect(res?.totalElectors).toBe(0);
      expect(res?.totalRejectedVotes).toBeNull();
      expect(res?.winner).toBeNull();
      expect(res?.runnerUp).toBeNull();
      expect(res?.candidates[0].person).toBeNull();
      expect(res?.candidates[0].party).toBeNull();
      expect(res?.candidates[0].votesReceived).toBe(0);
      expect(res?.candidates[0].evmVotes).toBeNull();
      expect(res?.candidates[0].postalVotes).toBeNull();
      expect(res?.ballotChoices[0].isValidVote).toBe(true);
      expect(res?.ballotChoices[0].votesReceived).toBe(0);
    });

    it('handles empty candidates array in getContestDetail and null in getPersonElections', async () => {
      jest.spyOn(electionService, 'getElectionEventById').mockResolvedValue(mockElectionEvent as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'election_contests') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockContest, error: null }),
          };
        }
        if (table === 'candidacies') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'ballot_choices') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await electionService.getContestDetail('TS_LA_2023', 'TS-AC-065');
      expect(res).not.toBeNull();
      expect(res?.candidates).toEqual([]);
      expect(res?.winner).toBeNull();
      expect(res?.runnerUp).toBeNull();
      expect(res?.ballotChoices).toEqual([]);

      // getPersonElections with data null
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      const personRes = await electionService.getPersonElections('p-none');
      expect(personRes).toEqual([]);
    });
  });
});
