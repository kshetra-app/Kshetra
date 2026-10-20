import Fastify, { FastifyInstance } from 'fastify';
import { constituencyRoutes } from '../routes/constituencies';
import * as stateData from '../services/stateData';
import * as mlaProfiles from '../../../../data/seed/telangana-mla-profiles';

describe('Constituencies Routes Unit Tests (Exhaustive Branch Coverage)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(constituencyRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('handles missing election data with fallback defaults', async () => {
      jest.spyOn(stateData, 'getConstituencyElectionData').mockReturnValue(null as any);
      const res = await app.inject({
        method: 'GET',
        url: '/states/TS/constituencies/1',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.recentElection.electionYear).toBeNull();
      expect(json.recentElection.winnerVotes).toBeNull();
      expect(json.election2023.winnerVotes).toBe(0);
      expect(json.election2023.margin).toBe(0);
      expect(json.election2023.marginPercent).toBe(0);
      expect(json.elections).toHaveLength(1);
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

    it('returns 404 when state is not TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/MH/mla/1',
      });
      expect(res.statusCode).toBe(404);
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

    it('returns 404 when state is not TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/states/UP/mla',
      });
      expect(res.statusCode).toBe(404);
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
