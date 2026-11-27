import Fastify, { FastifyInstance } from 'fastify';
import { constituencyRoutes } from '../routes/constituencies';
import * as stateData from '../services/stateData';
import * as mlaProfiles from '../../../../data/seed/telangana-mla-profiles';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Constituencies Routes Unit Tests (Exhaustive Branch Coverage)', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    originalConfigured = isSupabaseConfigured;
    setSupabaseConfiguredForTesting(false);
    app = Fastify({ logger: false });
    await app.register(constituencyRoutes);
    await app.ready();
  });

  afterAll(async () => {
    setSupabaseConfiguredForTesting(originalConfigured);
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves dated Explore history and corrected Sirpur votes from the same archive', async () => {
    const [summary, detail] = await Promise.all([
      app.inject('/states/TS/podium-summary'),
      app.inject('/states/TS/constituencies/1/podium'),
    ]);
    expect(summary.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(summary.json().data.find((seat: { acNo: number }) => seat.acNo === 1)).toMatchObject({
      year: 2023,
      winnerParty: 'BJP',
      history: expect.arrayContaining([
        expect.objectContaining({
          year: 2023,
          constituencyName: 'Sirpur',
          winnerName: 'Palvai Harish Babu',
          winnerParty: 'BJP',
          margin: 3088,
        }),
        expect.objectContaining({ year: 2018, winnerName: 'Koneru Konappa' }),
      ]),
    });
    expect(detail.json().find((contest: { year: number }) => contest.year === 2023)).toMatchObject({
      totalValidVotes: 186880,
      winner: { votes: 63702, voteShare: 34.09 },
      firstRunnerUp: { votes: 60614, voteShare: 32.43 },
      secondRunnerUp: { votes: 44646, voteShare: 23.89 },
    });
  });

  it('uses the corrected ECI Karnataka result in both the detailed and summary routes', async () => {
    const [detail, summary] = await Promise.all([
      app.inject('/states/KA/constituencies/30/podium'),
      app.inject('/states/KA/podium-summary'),
    ]);
    expect(detail.statusCode).toBe(200);
    expect(summary.statusCode).toBe(200);
    const contest = detail.json().find((row: { year: number }) => row.year === 2023);
    expect(contest).toMatchObject({
      electionType: 'GENERAL',
      totalValidVotes: 183047,
      winner: { votes: 94201, voteShare: 51.46 },
      secondRunnerUp: { name: 'Bandenawaz Husenasab Mahabari', votes: 459, party: 'JD(S)' },
    });
    expect(contest.resultSourceUrl).toContain('www.eci.gov.in');
    const seats = summary.json().data;
    expect(seats).toHaveLength(224);
    expect(seats.find((seat: { acNo: number }) => seat.acNo === 30).history).toContainEqual(
      expect.objectContaining({
        year: 2023,
        margin: contest.winner.votes - contest.firstRunnerUp.votes,
        resultSourceUrl: contest.resultSourceUrl,
      }),
    );
  });

  it('keeps disclosures, portraits and citations attached to the individual podium candidate', async () => {
    const response = await app.inject('/states/TS/constituencies/1/podium');
    expect(response.statusCode).toBe(200);
    const contest = response.json().find((row: { year: number }) => row.year === 2023);
    expect(contest.resultSourceUrl).toContain('eci.gov.in');
    expect(contest.winner).toMatchObject({ name: 'Palvai Harish Babu', criminalCases: 9 });
    expect(contest.firstRunnerUp).toMatchObject({
      name: 'Koneru Konappa',
      criminalCases: 0,
      totalAssets: 20193242,
      photoVerified: true,
      affidavitUrl: expect.stringContaining('candidate_id=310'),
    });
    expect(contest.secondRunnerUp).toMatchObject({
      name: 'R. S. Praveen Kumar',
      criminalCases: 2,
      totalAssets: 12600644,
      photoVerified: true,
      affidavitUrl: expect.stringContaining('candidate_id=1144'),
    });
    expect(contest.secondRunnerUp.photoUrl).not.toBe(contest.firstRunnerUp.photoUrl);
    expect(contest.secondRunnerUp.caseDetails).toHaveLength(2);
  });

  it.each([
    [5, 'Kotnaka Vijay Kumar'],
    [47, 'Parameshwar Reddy Mandumula'],
    [47, 'N. V. S. S. Prabhakar'],
    [61, 'Mohammed Azharuddin'],
    [61, 'Lankala Deepak Reddy'],
    [72, 'Patnam Narender Reddy'],
    [103, 'Kambhampati Prathap'],
  ])('publishes the original 2023 ECI filing in seat %i for %s', async (acNo, name) => {
    const response = await app.inject(`/states/TS/constituencies/${acNo}/podium`);
    expect(response.statusCode).toBe(200);
    const contest = response.json().find((row: { year: number }) => row.year === 2023);
    const candidates = [contest.winner, contest.firstRunnerUp, contest.secondRunnerUp];
    expect(candidates.find((candidate) => candidate?.name === name)).toMatchObject({
      affidavitDocumentUrl: expect.stringMatching(/^https:\/\/affidavit\.eci\.gov\.in\//),
      photoVerified: true,
    });
  });

  it('shows the official constituency and candidate names for the results before delimitation', async () => {
    const response = await app.inject('/states/TS/constituencies/61/podium');
    expect(response.statusCode).toBe(200);
    const contest = response.json().find((row: { year: number }) => row.year === 2004);
    expect(contest).toMatchObject({
      constituencyName: 'Secunderabad',
      historicalConstituencyNumber: 209,
      winner: { name: 'T.Padma Rao', votes: 56997, party: 'TRS' },
      resultSourceUrl: 'https://ceotelangana.nic.in/GE_2004/Statistical_Report_2004.pdf',
    });
  });

  it('serves independently verified historical portraits and recovered filing amounts', async () => {
    const sirpur = await app.inject('/states/TS/constituencies/1/podium');
    expect(sirpur.statusCode).toBe(200);
    const older = sirpur.json().find((row: { year: number }) => row.year === 2018);
    expect(older.winner).toMatchObject({
      name: 'Koneru Konappa',
      photoVerified: true,
      photoSourceUrl: 'https://prsindia.org/mlatrack/koneru-konappa',
    });
    const jangaon = await app.inject('/states/TS/constituencies/98/podium');
    expect(jangaon.statusCode).toBe(200);
    expect(jangaon.json()[0].winner).toMatchObject({
      name: 'Palla Rajeshwar Reddy',
      totalAssets: 224396786,
      totalLiabilities: 50068732,
    });
  });

  it('keeps each recovered Adilabad filing attached to its own election', async () => {
    const response = await app.inject('/states/TS/constituencies/7/podium');
    expect(response.statusCode).toBe(200);
    const profile = (year: number) =>
      response.json().find((row: { year: number }) => row.year === year).firstRunnerUp;
    expect(profile(2014)).toMatchObject({
      name: 'Payal Shanker',
      affidavitUrl: 'https://www.myneta.info/telangana2014/candidate.php?candidate_id=22',
      totalAssets: 20875649,
    });
    expect(profile(2018)).toMatchObject({
      name: 'Payal Shanker',
      affidavitUrl: 'https://www.myneta.info/telangana2018/candidate.php?candidate_id=4706',
      totalAssets: 43374112,
    });
  });

  it('serves a source and verified financial and case summaries for every 2023 Telangana podium slot', async () => {
    const response = await app.inject('/states/TS/podium');
    expect(response.statusCode).toBe(200);
    const archive = response.json() as Record<
      string,
      Array<{ year: number } & Record<string, any>>
    >;
    expect(Object.keys(archive)).toHaveLength(119);
    for (const contests of Object.values(archive)) {
      const election = contests.find((row) => row.year === 2023);
      for (const rank of ['winner', 'firstRunnerUp', 'secondRunnerUp']) {
        const candidate = election?.[rank];
        expect(candidate?.affidavitDocumentUrl || candidate?.affidavitUrl).toMatch(/^https:\/\//);
        expect(Number.isFinite(candidate?.totalAssets)).toBe(true);
        expect(Number.isFinite(candidate?.totalLiabilities)).toBe(true);
        expect(Number.isInteger(candidate?.criminalCases)).toBe(true);
      }
    }
    const uppal = archive['47'].find((row) => row.year === 2023);
    expect(uppal?.firstRunnerUp).toMatchObject({
      name: 'Parameshwar Reddy Mandumula',
      totalAssets: 49960181.71,
      totalLiabilities: 1207071,
      criminalCases: 1,
      affidavitDocumentUrl: expect.stringContaining('/affidavit-pdf-download/'),
    });
    const palakurthi = archive['100'].find((row) => row.year === 2023);
    expect(palakurthi?.secondRunnerUp).toMatchObject({
      name: 'Madavapeddi Venkat Reddy',
      affidavitUrl: expect.stringContaining('candidate_id=1031'),
    });
    expect(palakurthi?.secondRunnerUp.affidavitDocumentUrl).toBeUndefined();
  });

  it.each([
    [61, 2025, 'Naveen Yadav V', 98988, 24729],
    [71, 2024, 'Sri Ganesh Narayanan', 53651, 13206],
  ])(
    'serves the official bye-election archive for Telangana AC %s',
    async (seat, year, name, votes, margin) => {
      const response = await app.inject(`/states/TS/constituencies/${seat}/podium`);
      expect(response.statusCode).toBe(200);
      expect(response.json()[0]).toMatchObject({
        year,
        electionType: 'BYPOLL',
        winner: { name, votes, party: 'INC' },
        marginWinnerToRunnerUp1: margin,
        resultSourceUrl: expect.stringContaining('eci.gov.in'),
      });
    },
  );

  it('serves the filed Jubilee Hills disclosures separately from the election results', async () => {
    const response = await app.inject('/states/TS/constituencies/61/podium');
    expect(response.statusCode).toBe(200);
    const contest = response.json()[0];
    expect(contest.winner).toMatchObject({
      name: 'Naveen Yadav V',
      criminalCases: 7,
      totalAssets: 387475216,
    });
    expect(contest.firstRunnerUp).toMatchObject({
      criminalCases: 1,
      selfImmovableAssets: 61137500,
    });
    expect(contest.firstRunnerUp.totalAssets).toBeUndefined();
    expect(contest.secondRunnerUp).toMatchObject({ criminalCases: 5, totalAssets: 86663578 });
    const candidates = [contest.winner, contest.firstRunnerUp, contest.secondRunnerUp];
    for (const candidate of candidates) {
      expect(candidate.affidavitDocumentUrl).toMatch(/^https:\/\/affidavit\.eci\.gov\.in\//);
      expect(candidate.photoVerified).toBe(true);
      expect(candidate.photoUrl).toMatch(/^https:\/\/suvidha\.eci\.gov\.in\//);
    }
    expect(new Set(candidates.map((candidate) => candidate.photoUrl)).size).toBe(3);
  });

  describe('1. GET /states/:stateCode/constituencies', () => {
    it('returns 200 with list of constituencies for TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.state).toBe('TS');
      expect(json.count).toBeGreaterThan(0);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('returns 404 when state has no constituency data', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/ZZ/constituencies',
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('NOT_FOUND');
    });

    it('does not return bundled constituency records in production when the live source has none', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      const originalConfigured = isSupabaseConfigured;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(stateData.canonicalGeographyService, 'getConstituencies').mockResolvedValue([]);
      jest.spyOn(stateData.canonicalGeographyService, 'getConstituency').mockResolvedValue(null);

      try {
        const list = await app.inject({ method: 'GET', url: '/states/TS/constituencies' });
        expect(list.statusCode).toBe(404);

        const search = await app.inject({
          method: 'GET',
          url: '/states/TS/constituencies/search?q=Sirpur',
        });
        expect(search.statusCode).toBe(200);
        expect(JSON.parse(search.payload).data).toEqual([]);

        const detail = await app.inject({
          method: 'GET',
          url: '/states/TS/constituencies/1',
        });
        expect(detail.statusCode).toBe(404);
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
        setSupabaseConfiguredForTesting(originalConfigured);
      }
    });
  });

  describe('2. GET /states/:stateCode/constituencies/:constituencyId', () => {
    it('resolves constituency by numeric id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/1',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.acNo).toBe(1);
    });

    it('resolves constituency by TS-AC-X format (split branch)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/TS-AC-66',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.acNo).toBe(66);
    });

    it('resolves constituency by id field lowercase', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/ts-ac-10',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.acNo).toBe(10);
    });

    it('resolves constituency by name lowercase', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/charminar',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.name).toBe('Charminar');
    });

    it('returns 404 when constituency is not found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/non-existent-999',
      });
      expect(res.statusCode).toBe(404);
    });

    it('preserves missing election data without manufacturing winner or result metrics', async () => {
      jest.spyOn(stateData, 'getConstituencyElectionData').mockReturnValue(null as any);
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/1',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.recentElection).toBeNull();
      expect(json.election2023.winner).toBe('');
      expect(json.election2023.winnerName).toBe('');
      expect(json.election2023.winnerVotes).toBeNull();
      expect(json.election2023.margin).toBeNull();
      expect(json.election2023.marginPercent).toBeNull();
      expect(json.elections).toEqual([]);
    });

    it('handles election data where elections array is null', async () => {
      jest.spyOn(stateData, 'getConstituencyElectionData').mockReturnValue({
        recentElection: {
          electionYear: 2023,
          electionType: 'GENERAL',
          winner: 'INC',
          winnerName: 'Test Winner',
          winnerVotes: 50000,
          runnerUp: 'BRS',
          margin: 1000,
          marginPercent: 1.2,
        },
        elections: null as any,
      } as any);
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/1',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.elections).toHaveLength(1);
      expect(json.election2023.winnerVotes).toBe(50000);
    });
  });

  describe('3. GET /states/:stateCode/constituencies/search', () => {
    it('returns empty array when state has no constituencies', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/ZZ/constituencies/search',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.count).toBe(0);
      expect(json.data).toEqual([]);
    });

    it('filters by query q matching district, currentMLA, id, or acNo', async () => {
      // Query matching district
      const resDistrict = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?q=hyderabad',
      });
      expect(resDistrict.statusCode).toBe(200);
      const jsonDist = JSON.parse(resDistrict.payload);
      expect(jsonDist.count).toBeGreaterThan(0);

      // Query matching MLA
      const resMLA = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?q=revanth',
      });
      expect(resMLA.statusCode).toBe(200);

      // Query matching id
      const resId = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?q=TS-AC-1',
      });
      expect(resId.statusCode).toBe(200);

      // Query matching acNo as string
      const resAcNo = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?q=119',
      });
      expect(resAcNo.statusCode).toBe(200);
    });

    it('filters by party, district, and type (GEN/SC/ST)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?party=bjp&district=Adilabad&type=GEN',
      });
      expect(res.statusCode).toBe(200);
    });

    it('filters by minMargin only and maxMargin only', async () => {
      const resMin = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?minMargin=20000',
      });
      expect(resMin.statusCode).toBe(200);

      const resMax = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?maxMargin=5000',
      });
      expect(resMax.statusCode).toBe(200);
    });

    it('exercises margin fallbacks cascade across margin2025, 2024, 2022, 2021, and margin', async () => {
      let callCount = 0;
      jest.spyOn(stateData, 'getRawConstituency').mockImplementation((_code, _acNo) => {
        callCount++;
        if (callCount % 6 === 1) return { margin2025: 12000 } as any;
        if (callCount % 6 === 2) return { margin2024: 15000 } as any;
        if (callCount % 6 === 3) return { margin2022: 18000 } as any;
        if (callCount % 6 === 4) return { margin2021: 22000 } as any;
        if (callCount % 6 === 5) return { margin: 25000 } as any;
        return null as any;
      });

      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?minMargin=10000&maxMargin=30000',
      });
      expect(res.statusCode).toBe(200);
    });

    it('sorts by sort=margin_desc, sort=margin_asc, sort=name, and default acNo', async () => {
      const resDesc = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?sort=margin_desc',
      });
      expect(resDesc.statusCode).toBe(200);

      const resAsc = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?sort=margin_asc',
      });
      expect(resAsc.statusCode).toBe(200);

      const resName = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?sort=name',
      });
      expect(resName.statusCode).toBe(200);

      const resDefault = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search',
      });
      expect(resDefault.statusCode).toBe(200);
    });

    it('sorts with margin_desc and margin_asc when raw records have diverse margin year fallbacks', async () => {
      jest.spyOn(stateData, 'getRawConstituency').mockImplementation((_code, acNo) => {
        if (acNo === 1) return { margin2024: 5000 } as any;
        if (acNo === 2) return { margin2022: 15000 } as any;
        if (acNo === 3) return { margin: 25000 } as any;
        return undefined as any;
      });

      const resDesc = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?sort=margin_desc',
      });
      expect(resDesc.statusCode).toBe(200);

      const resAsc = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/search?sort=margin_asc',
      });
      expect(resAsc.statusCode).toBe(200);
    });
  });

  describe('4. GET /states/:stateCode/analytics', () => {
    it('returns 200 with election analytics for TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/analytics',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.state).toBe('TS');
      expect(json.totalConstituencies).toBe(119);
    });

    it('returns 404 for non-TS state analytics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/AP/analytics',
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('NOT_FOUND');
    });
  });

  describe('5. GET /states/:stateCode/mla/:acNo', () => {
    it('returns 200 with MLA profile for valid acNo in TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/mla/1',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.acNo).toBe(1);
      expect(json.profile).toBeDefined();
    });

    it('returns 404 for an unknown state', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/ZZ/mla/1',
      });
      expect(res.statusCode).toBe(404);
    });

    it('reads both profile routes for Karnataka from the same canonical lookup', async () => {
      const roster = jest.spyOn(stateData, 'getCanonicalMLAProfile').mockResolvedValue({
        acNo: 224,
        name: 'Example Representative',
        party: 'INC',
        stateCode: 'KA',
      });
      const [summary, detail] = await Promise.all([
        app.inject('/states/KA/mla/224'),
        app.inject('/states/KA/constituencies/224/mla'),
      ]);
      expect(summary.statusCode).toBe(200);
      expect(detail.statusCode).toBe(200);
      expect(summary.json()).toEqual({ state: 'KA', acNo: 224, profile: detail.json() });
      expect(roster.mock.calls).toEqual([
        ['KA', 224],
        ['KA', 224],
      ]);
      const invalid = await app.inject('/states/KA/mla/225');
      expect(invalid.statusCode).toBe(400);
    });

    it('returns 400 when acNo is out of range (< 1 or > 119)', async () => {
      const resLow = await app.inject({
        method: 'GET',
        url: '/states/TS/mla/0',
      });
      expect(resLow.statusCode).toBe(400);

      const resHigh = await app.inject({
        method: 'GET',
        url: '/states/TS/mla/125',
      });
      expect(resHigh.statusCode).toBe(400);
    });

    it('returns 404 when MLA profile is missing for a valid acNo', async () => {
      jest.spyOn(mlaProfiles, 'getMLAProfile').mockReturnValue(undefined as any);
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/mla/50',
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('NOT_FOUND');
    });
  });

  describe('6. GET /states/:stateCode/mla', () => {
    it('returns 200 with list of MLA profiles for TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/mla',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.state).toBe('TS');
      expect(json.count).toBeGreaterThan(0);
      expect(Array.isArray(json.profiles)).toBe(true);
    });

    it('returns the available MLA profiles for a supported non-TS state', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/UP/mla',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.state).toBe('UP');
      expect(json.count).toBeGreaterThan(0);
      expect(Array.isArray(json.profiles)).toBe(true);
    });
  });

  describe('7. GET /states/:stateCode/elections', () => {
    it('returns 200 with election history for TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/elections',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.state).toBe('TS');
      expect(json.count).toBeGreaterThan(0);
      expect(Array.isArray(json.elections)).toBe(true);
    });

    it('returns 404 when state is not TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/TN/elections',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /states/:stateCode/podium-summary', () => {
    it('derives a compact summary from the existing historical podium records', async () => {
      const summaryResponse = await app.inject({
        method: 'GET',
        url: '/states/TS/podium-summary',
      });
      expect(summaryResponse.statusCode).toBe(200);

      const summary = JSON.parse(summaryResponse.payload);
      expect(summary.state).toBe('TS');
      expect(summary.count).toBeGreaterThan(0);
      expect(Array.isArray(summary.data)).toBe(true);
      expect(
        summary.data.every(
          (row: any) =>
            Number.isInteger(row.acNo) &&
            Number.isInteger(row.year) &&
            typeof row.winnerParty === 'string' &&
            row.winnerParty.length > 0,
        ),
      ).toBe(true);

      const podiumResponse = await app.inject({
        method: 'GET',
        url: '/states/TS/podium',
      });
      expect(podiumResponse.statusCode).toBe(200);
      const podium = JSON.parse(podiumResponse.payload);
      const firstRow = summary.data[0];
      const contests = podium[String(firstRow.acNo)];
      const expected = contests
        .filter((contest: any) => Number.isInteger(contest?.year) && contest?.winner?.party?.trim())
        .sort((left: any, right: any) => right.year - left.year)[0];

      expect(firstRow).toMatchObject({
        acNo: firstRow.acNo,
        year: expected.year,
        winnerParty: expected.winner.party.trim(),
      });
    });

    it('returns not found when the historical source has no matching state file', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/states/ZZ/podium-summary',
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload).code).toBe('NOT_FOUND');
    });
  });

  describe('8. GET /constituencies/locate', () => {
    it('returns 400 when lat or lng is not a valid number', async () => {
      const resLat = await app.inject({
        method: 'GET',
        url: '/constituencies/locate?lat=invalid&lng=78.47',
      });
      expect(resLat.statusCode).toBe(400);

      const resLng = await app.inject({
        method: 'GET',
        url: '/constituencies/locate?lat=17.36&lng=invalid',
      });
      expect(resLng.statusCode).toBe(400);
    });

    it('returns 200 with located constituency when point falls within boundary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/constituencies/locate?lat=17.3616&lng=78.4747',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.constituency).not.toBeNull();
      expect(json.message).toBe('Constituency located');
    });

    it('returns null constituency when point is outside state bounds', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/constituencies/locate?lat=28.6139&lng=77.2090',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.constituency).toBeNull();
      expect(json.message).toBe('No constituency found at this location');
    });
  });
});
