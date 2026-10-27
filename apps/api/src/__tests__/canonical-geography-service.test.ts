import {
  canonicalGeographyService,
  CONFIRMED_BY_ELECTIONS,
  resolveByElectionOverride,
} from '../services/canonicalGeographyService';
import * as stateData from '../services/stateData';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';

describe('Canonical Geography Service & Decoupled State Data Adapter', () => {
  const originalConfigured = isSupabaseConfigured;

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(originalConfigured);
  });

  describe('By-Election Schedule Registry & Overrides', () => {
    it('contains verified confirmed by-elections across multiple states', () => {
      expect(CONFIRMED_BY_ELECTIONS.length).toBeGreaterThanOrEqual(5);

      // Check TN Madurantakam (AC 35)
      const tn35 = CONFIRMED_BY_ELECTIONS.find((e) => e.stateCode === 'TN' && e.acNo === 35);
      expect(tn35).toBeDefined();
      expect(tn35?.party).toBe('TVK');
      expect(tn35?.mlaName).toBe('K. Maragatham Kumaravel');
      expect(tn35?.status).toBe('CONFIRMED');

      // Check TN Dharapuram (AC 101)
      const tn101 = CONFIRMED_BY_ELECTIONS.find((e) => e.stateCode === 'TN' && e.acNo === 101);
      expect(tn101).toBeDefined();
      expect(tn101?.party).toBe('TVK');
      expect(tn101?.mlaName).toBe('P. Sathyabama');

      // Check WB Nandigram (AC 210)
      const wb210 = CONFIRMED_BY_ELECTIONS.find((e) => e.stateCode === 'WB' && e.acNo === 210);
      expect(wb210).toBeDefined();
      expect(wb210?.party).toBe('BJP');
      expect(wb210?.mlaName).toBe('Hasi Rani Rath');

      // Check WB Swarupnagar (AC 70)
      const wb70 = CONFIRMED_BY_ELECTIONS.find((e) => e.stateCode === 'WB' && e.acNo === 70);
      expect(wb70).toBeDefined();
      expect(wb70?.party).toBe('BJP');
      expect(wb70?.mlaName).toBe('Shankharavh Sarkar');

      // Check PY Thattanchavady (AC 9)
      const py9 = CONFIRMED_BY_ELECTIONS.find((e) => e.stateCode === 'PY' && e.acNo === 9);
      expect(py9).toBeDefined();
      expect(py9?.party).toBe('AINRC');
      expect(py9?.mlaName).toBe('Ashok Anand');
    });

    it('resolves by-election override case-insensitively and by constituency name', () => {
      const tnRes = resolveByElectionOverride('tn', 35);
      expect(tnRes).not.toBeNull();
      expect(tnRes?.currentParty).toBe('TVK');
      expect(tnRes?.currentMLA).toBe('K. Maragatham Kumaravel');

      const pyResByName = resolveByElectionOverride('PY', 99, 'Thattanchavady');
      expect(pyResByName).not.toBeNull();
      expect(pyResByName?.currentParty).toBe('AINRC');
      expect(pyResByName?.currentMLA).toBe('Ashok Anand');

      expect(resolveByElectionOverride('TS', 1)).toBeNull();
      expect(resolveByElectionOverride('', 35)).toBeNull();
    });

    it('filters confirmed by-elections by state code via getConfirmedByElections', () => {
      const all = canonicalGeographyService.getConfirmedByElections();
      expect(all.length).toBe(CONFIRMED_BY_ELECTIONS.length);

      const tnOnly = canonicalGeographyService.getConfirmedByElections('TN');
      expect(tnOnly.length).toBe(2);
      expect(tnOnly.every((e) => e.stateCode === 'TN')).toBe(true);

      const empty = canonicalGeographyService.getConfirmedByElections('ZZ');
      expect(empty).toEqual([]);
    });
  });

  describe('Database Offline / Fallback Behaviors', () => {
    it('returns empty array / null from canonicalGeographyService when database is unavailable', async () => {
      setSupabaseConfiguredForTesting(false);
      expect(canonicalGeographyService.isAvailable()).toBe(false);

      const states = await canonicalGeographyService.getStates();
      expect(states).toEqual([]);

      const state = await canonicalGeographyService.getState('TS');
      expect(state).toBeNull();

      const pcs = await canonicalGeographyService.getParliamentaryConstituencies();
      expect(pcs).toEqual([]);

      const acs = await canonicalGeographyService.getConstituencies('TS');
      expect(acs).toEqual([]);

      const ac = await canonicalGeographyService.getConstituency('TS', 1);
      expect(ac).toBeNull();

      const searchRes = await canonicalGeographyService.searchConstituencies('TS', 'Sirpur');
      expect(searchRes).toEqual([]);

      const electData = await canonicalGeographyService.getConstituencyElectionData('TS', 1);
      expect(electData).toBeNull();
    });

    it('stateData async delegates fall back seamlessly to seed data when DB is unconfigured', async () => {
      setSupabaseConfiguredForTesting(false);

      // Single AC fetch
      const ts1 = await stateData.getCanonicalConstituency('TS', 1);
      expect(ts1).not.toBeNull();
      expect(ts1?.id).toBe('TS-AC-1');
      expect(ts1?.name).toBe('Sirpur');

      // State ACs fetch
      const tsList = await stateData.getCanonicalConstituencies('TS');
      expect(tsList.length).toBe(119);

      // State info fetch
      const tsInfo = await stateData.getCanonicalStateInfo('TS');
      expect(tsInfo?.code).toBe('TS');
      expect(tsInfo?.totalSeats).toBe(119);

      // All states fetch
      const allStates = await stateData.getAllCanonicalStatesInfo();
      expect(allStates.length).toBe(31);

      // Election data fetch
      const tsElection = await stateData.getCanonicalConstituencyElectionData('TS', 1);
      expect(tsElection).not.toBeNull();
      expect(tsElection?.recentElection.electionYear).toBe(2023);
    });
  });

  describe('Database Online / Mocked Execution', () => {
    it('queries states from Supabase when available', async () => {
      setSupabaseConfiguredForTesting(true);

      const mockStates = [
        {
          code: 'TS',
          name: 'Telangana',
          total_seats: 119,
          ruling_party: 'INC',
          centroid_lat: 17.8495919,
          centroid_lng: 79.1151663,
          lgd_code: 36,
          census_code_2011: '28',
          internal_id: '0215b22b-0001-0000-0000-000000000001',
        },
      ];

      const selectMock = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValueOnce({ data: mockStates, error: null }),
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockStates[0], error: null }),
        }),
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'states') {
          return { select: selectMock } as any;
        }
        return {} as any;
      }) as any);

      const states = await canonicalGeographyService.getStates();
      expect(states.length).toBe(1);
      expect(states[0].code).toBe('TS');
      expect(states[0].name).toBe('Telangana');
      expect(states[0].totalSeats).toBe(119);

      const single = await canonicalGeographyService.getState('TS');
      expect(single?.code).toBe('TS');
      expect(single?.rulingParty).toBe('INC');
    });

    it('queries constituencies from Supabase and applies by-election overrides', async () => {
      setSupabaseConfiguredForTesting(true);

      const mockRows = [
        {
          id: 'TN-AC-35',
          ac_no: 35,
          name: 'Madurantakam',
          state_code: 'TN',
          district: 'Chengalpattu',
          reservation_status: 'SC',
          current_party: 'AIADMK',
          current_mla: 'Old MLA',
        },
      ];

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValueOnce({ data: mockRows, error: null }),
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockRows[0], error: null }),
          }),
        }),
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'constituencies') {
          return { select: selectMock } as any;
        }
        return {} as any;
      }) as any);

      // List query
      const list = await canonicalGeographyService.getConstituencies('TN');
      expect(list.length).toBe(1);
      // Confirms by-election override was applied
      expect(list[0].currentParty).toBe('TVK');
      expect(list[0].currentMLA).toBe('K. Maragatham Kumaravel');

      // Single query
      const single = await canonicalGeographyService.getConstituency('TN', 35);
      expect(single?.currentParty).toBe('TVK');
      expect(single?.currentMLA).toBe('K. Maragatham Kumaravel');
    });

    it('queries parliamentary constituencies from Supabase', async () => {
      setSupabaseConfiguredForTesting(true);

      const mockPCs = [
        {
          id: 'pc-uuid-1',
          code: 'TS-PC-01',
          state_code: 'TS',
          pc_number: 1,
          name: 'Adilabad',
          reservation: 'st',
          eci_pc_code: '3601',
        },
      ];

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValueOnce({ data: mockPCs, error: null }),
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockPCs[0], error: null }),
        }),
        order: jest.fn().mockResolvedValueOnce({ data: mockPCs, error: null }),
      });

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'parliamentary_constituencies') {
          return { select: selectMock } as any;
        }
        return {} as any;
      }) as any);

      const pcs = await canonicalGeographyService.getParliamentaryConstituencies('TS');
      expect(pcs.length).toBe(1);
      expect(pcs[0].code).toBe('TS-PC-01');
      expect(pcs[0].name).toBe('Adilabad');

      const singlePC = await canonicalGeographyService.getParliamentaryConstituency('TS-PC-01');
      expect(singlePC?.name).toBe('Adilabad');
    });
  });
});
