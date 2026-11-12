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

    it('does not substitute bundled geography, election, or MLA seed records in production', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      delete process.env.EXPO_PUBLIC_APP_ENV;
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(canonicalGeographyService, 'getConstituencies').mockResolvedValue([]);
      jest.spyOn(canonicalGeographyService, 'getConstituency').mockResolvedValue(null);
      jest.spyOn(canonicalGeographyService, 'getConstituencyElectionData').mockResolvedValue(null);
      jest.spyOn(canonicalGeographyService, 'getConstituencyMLA').mockResolvedValue(null);
      jest.spyOn(canonicalGeographyService, 'getConstituencyMLAs').mockResolvedValue([]);

      try {
        expect(await stateData.getCanonicalConstituencies('TS')).toEqual([]);
        expect(await stateData.getCanonicalConstituency('TS', 1)).toBeNull();
        expect(await stateData.getCanonicalConstituencyElectionData('TS', 1)).toBeNull();
        expect(await stateData.getCanonicalMLAProfile('TS', 1)).toBeNull();
        expect(await stateData.getCanonicalMLAProfiles('TS')).toEqual([]);
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
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
          internal_id: 'TN-AC-35-INTERNAL',
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
      expect(single?.internalId).toBe('TN-AC-35-INTERNAL');
    });

    it('uses the canonical elected tenure in production instead of deprecated constituency officeholder fields', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const mockRows = [
        {
          id: 'TN-AC-35',
          internal_id: 'TN-AC-35-INTERNAL',
          ac_no: 35,
          name: 'Madurantakam',
          state_code: 'TN',
          district: 'Chengalpattu',
          reservation_status: 'SC',
          current_party: 'LIVE_PARTY',
          current_mla: 'Stale legacy officeholder',
        },
      ];
      const tenureRows = [
        {
          jurisdiction_id: 'TN-AC-35',
          current_party: 'ORG-TVK',
          canonical_persons: { canonical_name: 'Canonical current officeholder', gender: 'female' },
          party: { ec_party_code: 'TVK', short_name: 'TVK' },
        },
      ];
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockRows, error: null }),
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockRows[0], error: null }),
          }),
        }),
      });
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'constituencies') return { select: selectMock } as any;
        if (table === 'elected_tenures') {
          const tenureQuery = {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: tenureRows, error: null }),
          };
          return {
            select: jest.fn().mockReturnValue(tenureQuery),
          } as any;
        }
        return {} as any;
      }) as any);

      try {
        const list = await canonicalGeographyService.getConstituencies('TN');
        const single = await canonicalGeographyService.getConstituency('TN', 35);
        const profile = await canonicalGeographyService.getConstituencyMLA('TN', 35);
        const profiles = await canonicalGeographyService.getConstituencyMLAs('TN');
        expect(list[0].currentParty).toBe('TVK');
        expect(list[0].currentMLA).toBe('Canonical current officeholder');
        expect(single?.currentParty).toBe('TVK');
        expect(single?.currentMLA).toBe('Canonical current officeholder');
        expect(profile).toMatchObject({
          name: 'Canonical current officeholder',
          party: 'TVK',
          gender: 'F',
        });
        expect(profile).not.toHaveProperty('terms');
        expect(profiles).toHaveLength(1);
        expect(profiles[0]).toMatchObject({
          name: 'Canonical current officeholder',
          party: 'TVK',
          gender: 'F',
        });
        expect(profiles[0]).not.toHaveProperty('terms');
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
    });

    it('does not fall back to a legacy officeholder or arbitrary row when current tenures are missing or ambiguous', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const row = {
        id: 'TN-AC-35',
        internal_id: 'TN-AC-35-INTERNAL',
        ac_no: 35,
        name: 'Madurantakam',
        state_code: 'TN',
        district: 'Chengalpattu',
        reservation_status: 'SC',
        current_party: 'LEGACY_PARTY',
        current_mla: 'Stale legacy officeholder',
      };
      const constituencyQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [row], error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
      };
      const selectMock = jest.fn().mockReturnValue(constituencyQuery);
      let tenureRows: any[] = [];
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'constituencies') return { select: selectMock } as any;
        if (table === 'elected_tenures') {
          const tenureQuery = {
            eq: jest.fn().mockReturnThis(),
            in: jest
              .fn()
              .mockImplementation(() => Promise.resolve({ data: tenureRows, error: null })),
          };
          return { select: jest.fn().mockReturnValue(tenureQuery) } as any;
        }
        return {} as any;
      }) as any);

      try {
        const missing = await canonicalGeographyService.getConstituency('TN', 35);
        expect(missing?.currentMLA).toBe('');
        expect(await canonicalGeographyService.getConstituencyMLA('TN', 35)).toBeNull();
        expect(await canonicalGeographyService.getConstituencyMLAs('TN')).toEqual([]);

        tenureRows = [
          {
            jurisdiction_id: 'TN-AC-35',
            canonical_persons: { canonical_name: 'First current person', gender: 'male' },
            party: { ec_party_code: 'AAA' },
          },
          {
            jurisdiction_id: 'TN-AC-35',
            canonical_persons: { canonical_name: 'Second current person', gender: 'female' },
            party: { ec_party_code: 'BBB' },
          },
        ];
        const ambiguous = await canonicalGeographyService.getConstituency('TN', 35);
        expect(ambiguous?.currentMLA).toBe('');
        expect(await canonicalGeographyService.getConstituencyMLA('TN', 35)).toBeNull();
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
    });

    it('resolves production point lookups from database boundaries and the canonical tenure registry', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const rpcSpy = jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [
          {
            id: 'TS-AC-72',
            internal_id: '00000000-0000-0000-0000-000000000072',
            ac_no: 72,
            name: 'Kodangal',
            state_code: 'TS',
            district: 'Vikarabad',
            reservation_status: 'GEN',
          },
        ],
        error: null,
      } as any);
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'elected_tenures') {
          const tenureQuery = {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  jurisdiction_id: 'TS-AC-72',
                  canonical_persons: { canonical_name: 'Verified Current MLA', gender: 'male' },
                  party: { ec_party_code: 'INC', short_name: 'INC' },
                },
              ],
              error: null,
            }),
          };
          return { select: jest.fn().mockReturnValue(tenureQuery) } as any;
        }
        return {} as any;
      }) as any);

      try {
        const result = await canonicalGeographyService.locatePoint({ lat: 17.1, lng: 77.6 });
        expect(rpcSpy).toHaveBeenCalledWith('locate_constituency_point_truthful', {
          p_lat: 17.1,
          p_lng: 77.6,
        });
        expect(result.constituency).toMatchObject({
          id: 'TS-AC-72',
          internalId: '00000000-0000-0000-0000-000000000072',
          currentMLA: 'Verified Current MLA',
          currentParty: 'INC',
          officeholderStatus: 'INCUMBENT_ACTIVE',
        });
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
    });

    it('fails closed in production when spatial lookup is unavailable or ambiguous', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const rpcSpy = jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: new Error('RPC unavailable'),
      } as any);

      try {
        const unavailable = await canonicalGeographyService.locatePoint({ lat: 17.1, lng: 77.6 });
        expect(unavailable.constituency).toBeNull();
        expect(unavailable.source).toBe('unavailable');

        rpcSpy.mockResolvedValue({
          data: [
            { id: 'TS-AC-71', ac_no: 71, name: 'First', state_code: 'TS' },
            { id: 'TS-AC-72', ac_no: 72, name: 'Second', state_code: 'TS' },
          ],
          error: null,
        } as any);
        const ambiguous = await canonicalGeographyService.locatePoint({ lat: 17.1, lng: 77.6 });
        expect(ambiguous.constituency).toBeNull();
        expect(ambiguous.message).toMatch(/more than one/i);
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
    });

    it('does not promote provisional PIN hints into exact matches or invented probability weights', async () => {
      const originalAppEnv = process.env.APP_ENV;
      const originalExpoEnv = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.APP_ENV = 'production';
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);

      const canonicalConstituency = {
        id: 'TS-AC-66',
        internal_id: '00000000-0000-0000-0000-000000000066',
        ac_no: 66,
        name: 'Database Charminar',
        state_code: 'TS',
        district: 'Hyderabad',
        reservation_status: 'GEN',
        current_party: null,
        current_mla: 'Deprecated name must not be used',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'constituencies') {
          let requestedAcNo: number | undefined;
          let query: any;
          query = {
            eq: jest.fn((column: string, value: unknown) => {
              if (column === 'ac_no') requestedAcNo = value as number;
              return query;
            }),
            maybeSingle: jest.fn().mockImplementation(async () => ({
              data: requestedAcNo === 66 ? canonicalConstituency : null,
              error: null,
            })),
          };
          return { select: jest.fn().mockReturnValue(query) } as any;
        }
        if (table === 'elected_tenures') {
          const query = {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
          return { select: jest.fn().mockReturnValue(query) } as any;
        }
        return {} as any;
      }) as any);

      try {
        const result = await canonicalGeographyService.locateByPinCode('500002');
        expect(result.verificationStatus).toBe('PROVISIONAL_APPROXIMATION');
        expect(result.singleMatch).toBe(false);
        expect(result.primaryConstituency).toBeNull();
        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0].constituency.name).toBe('Database Charminar');
        expect(result.candidates[0].constituency.currentMLA).toBe('');
        expect(result.candidates[0].overlapWeight).toBeNull();
        expect(result.source).toBe('curated_provisional_directory');
      } finally {
        if (originalAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = originalAppEnv;
        if (originalExpoEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
        else process.env.EXPO_PUBLIC_APP_ENV = originalExpoEnv;
      }
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

    it('preserves missing booth voter counts as unavailable', async () => {
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(canonicalGeographyService, 'getConstituency').mockResolvedValue({
        id: 'TS-AC-1',
        internalId: 'TS-AC-1-INTERNAL',
        acNo: 1,
        name: 'Sirpur',
        stateCode: 'TS',
        district: 'Kumuram Bheem Asifabad',
        reservationStatus: 'ST',
        currentParty: '',
        currentMLA: '',
      });

      const rowsByTable: Record<string, unknown[]> = {
        urban_local_bodies: [],
        polling_booths: [
          {
            id: 'booth-empty-count',
            internal_id: 'booth-empty-count',
            booth_number: 1,
            booth_name: 'Polling station 1',
            polling_station_name: null,
            total_voters: 0,
          },
          {
            id: 'booth-recorded-count',
            internal_id: 'booth-recorded-count',
            booth_number: 2,
            booth_name: 'Polling station 2',
            polling_station_name: null,
            total_voters: 950,
            panchayat_id: 'TS-GP-501',
            gp_ward_internal_id: 'gpw-internal-1',
          },
        ],
        ulb_wards: [],
        gp_wards: [
          {
            id: 'gpw-1',
            internal_id: 'gpw-internal-1',
            panchayat_id: 'TS-GP-501',
            ward_no: 1,
            name: 'Ward 1',
            reservation: 'GEN',
          },
        ],
        gram_panchayats: [
          {
            id: 'TS-GP-501',
            internal_id: 'gp-internal-1',
            name: 'Panchayat 1',
            local_name: null,
            mandal_id: 'TS-MDL-50',
            lgd_code: 501,
          },
        ],
      };
      const queryCalls: Record<string, Array<{ eq: jest.Mock; in: jest.Mock }>> = {};
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        const eq = jest.fn().mockResolvedValue({ data: rowsByTable[table] ?? [], error: null });
        const inFilter = jest
          .fn()
          .mockResolvedValue({ data: rowsByTable[table] ?? [], error: null });
        queryCalls[table] ??= [];
        queryCalls[table].push({ eq, in: inFilter });
        return { select: jest.fn(() => ({ eq, in: inFilter })) } as any;
      }) as any);

      const hierarchy = await canonicalGeographyService.getSubConstituencyHierarchy('TS', 1);

      expect(hierarchy?.pollingBooths.map((booth) => booth.totalVoters)).toEqual([null, 950]);
      expect(hierarchy?.constituency.internalId).toBe('TS-AC-1-INTERNAL');
      expect(queryCalls.polling_booths[0].eq).toHaveBeenCalledWith('constituency_id', 'TS-AC-1');
      expect(queryCalls.gp_wards[0].in).toHaveBeenCalledWith('internal_id', ['gpw-internal-1']);
      expect(queryCalls.gram_panchayats[0].in).toHaveBeenCalledWith('id', ['TS-GP-501']);
      expect(queryCalls.gp_wards[1].in).toHaveBeenCalledWith('panchayat_id', ['TS-GP-501']);
      expect(hierarchy?.gramPanchayats[0].wards).toEqual([
        expect.objectContaining({ id: 'gpw-1', wardNo: 1, name: 'Ward 1' }),
      ]);
    });

    it('surfaces live hierarchy query failures instead of returning an empty success', async () => {
      const previousAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(canonicalGeographyService, 'getConstituency').mockResolvedValue({
        id: 'TS-AC-1',
        internalId: 'TS-AC-1-INTERNAL',
        acNo: 1,
        name: 'Sirpur',
        stateCode: 'TS',
        district: 'Kumuram Bheem Asifabad',
        reservationStatus: 'ST',
        currentParty: '',
        currentMLA: '',
      });
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn(() => ({
          eq: jest
            .fn()
            .mockResolvedValue({ data: null, error: new Error('hierarchy table unavailable') }),
        })),
      })) as any);

      try {
        await expect(
          canonicalGeographyService.getSubConstituencyHierarchy('TS', 1),
        ).rejects.toThrow('hierarchy table unavailable');
      } finally {
        if (previousAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = previousAppEnv;
      }
    });

    it('does not return a live empty success when the canonical datastore is not configured', async () => {
      const previousAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'production';
      setSupabaseConfiguredForTesting(false);

      try {
        await expect(
          canonicalGeographyService.getSubConstituencyHierarchy('TS', 1),
        ).rejects.toThrow('Canonical geography datastore is not configured');
      } finally {
        if (previousAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = previousAppEnv;
      }
    });

    it('does not use a local seed constituency as live hierarchy data', async () => {
      const previousAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(canonicalGeographyService, 'getConstituency').mockResolvedValue(null);

      try {
        await expect(
          canonicalGeographyService.getSubConstituencyHierarchy('TS', 1),
        ).rejects.toThrow('Canonical constituency record could not be resolved');
      } finally {
        if (previousAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = previousAppEnv;
      }
    });

    it('does not label the public constituency ID as a canonical internal ID', async () => {
      const previousAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'production';
      setSupabaseConfiguredForTesting(true);
      jest.spyOn(canonicalGeographyService, 'getConstituency').mockResolvedValue({
        id: 'TS-AC-1',
        acNo: 1,
        name: 'Sirpur',
        stateCode: 'TS',
        district: 'Kumuram Bheem Asifabad',
        reservationStatus: 'ST',
        currentParty: '',
        currentMLA: '',
      });
      try {
        await expect(
          canonicalGeographyService.getSubConstituencyHierarchy('TS', 1),
        ).rejects.toThrow('Canonical constituency internal ID is unavailable');
      } finally {
        if (previousAppEnv === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = previousAppEnv;
      }
    });
  });
});
