import * as stateData from '../services/stateData';
import {
  getStateInfo,
  getAllStatesInfo,
  isStateSupported,
  getConstituencies,
  getConstituency,
  getRawConstituency,
  searchConstituencies,
  getTSRawSeeds,
  getTSElectionHistory,
  getTSMLAProfiles,
  getMLAProfile,
  getConstituencyElectionData,
} from '../services/stateData';

describe('State Data Service (stateData.ts) Unit Tests', () => {
  describe('getStateInfo and getAllStatesInfo', () => {
    it('returns valid info for supported states case-insensitively', () => {
      const ts = getStateInfo('TS');
      expect(ts).not.toBeNull();
      expect(ts?.code).toBe('TS');
      expect(ts?.name).toBe('Telangana');
      expect(ts?.totalSeats).toBe(119);
      expect(ts?.loadedCount).toBe(119);
      expect(ts?.dataStatus).toBe('full');
      // Directive 121: hasGeoJSON fails closed to false due to DEF-W021-01 (AC 119 duplicate polygon)
      expect(ts?.hasGeoJSON).toBe(false);
      // Granular geographicCapability truth
      expect(ts?.geographicCapability.hasBoundaryAsset).toBe(true);
      expect(ts?.geographicCapability.boundaryStatus).toBe('CONFLICT_PENDING');
      expect(ts?.geographicCapability.isStructurallyValid).toBe(true);
      expect(ts?.geographicCapability.hasCleanConstituencyMapping).toBe(false);
      expect(ts?.geographicCapability.isAuthoritativeAccepted).toBe(false);
      expect(ts?.geographicCapability.activeDefects).toEqual(['DEF-W021-01']);

      const tsLower = getStateInfo('ts');
      expect(tsLower).toEqual(ts);

      const ap = getStateInfo('AP');
      expect(ap?.name).toBe('Andhra Pradesh');
      expect(ap?.totalSeats).toBe(175);
      expect(ap?.hasGeoJSON).toBe(false);
      expect(ap?.geographicCapability.hasBoundaryAsset).toBe(false);
      expect(ap?.geographicCapability.boundaryStatus).toBe('UNAVAILABLE');
      expect(ap?.geographicCapability.activeDefects).toEqual(['DEF-W021-03']);
    });

    it('returns null for non-existent or unsupported state codes', () => {
      expect(getStateInfo('ZZ')).toBeNull();
      expect(getStateInfo('')).toBeNull();
      expect(getStateInfo('UNKNOWN')).toBeNull();
    });

    it('returns all 31 supported states with full metadata and accurate geographic capability', () => {
      const all = getAllStatesInfo();
      expect(all.length).toBe(31);
      const withGeo = all.filter((s) => s.hasGeoJSON);
      const withoutGeo = all.filter((s) => !s.hasGeoJSON);

      // Directive 121: Zero states claim accepted authoritative geometry without statutory clearance
      expect(withGeo.length).toBe(0);
      expect(withoutGeo.length).toBe(31);

      // Telangana possesses a local boundary asset, but is flagged as CONFLICT_PENDING
      const tsInfo = getStateInfo('TS');
      expect(tsInfo?.geographicCapability.hasBoundaryAsset).toBe(true);
      expect(tsInfo?.geographicCapability.boundaryStatus).toBe('CONFLICT_PENDING');

      const OTHER_30_STATES = [
        'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP', 'RJ', 'GJ', 'JH',
        'OD', 'DL', 'PB', 'HR', 'CG', 'MP', 'BR', 'AS', 'GA', 'HP',
        'MN', 'ML', 'MZ', 'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK'
      ];

      for (const code of OTHER_30_STATES) {
        const stateInfo = getStateInfo(code);
        expect(stateInfo).not.toBeNull();
        expect(stateInfo?.hasGeoJSON).toBe(false);
        expect(stateInfo?.geographicCapability.hasBoundaryAsset).toBe(false);
        expect(stateInfo?.geographicCapability.boundaryStatus).toBe('UNAVAILABLE');
        expect(stateInfo?.geographicCapability.activeDefects).toContain('DEF-W021-03');
      }

      for (const info of all) {
        expect(info.code).toBeDefined();
        expect(info.name).toBeDefined();
        expect(info.totalSeats).toBeGreaterThan(0);
        expect(info.loadedCount).toBeGreaterThan(0);
        expect(['full', 'stub']).toContain(info.dataStatus);
      }
    });

    it('verifies exported helper getGeographicCapability and constants', () => {
      expect(stateData.getGeographicCapability('TS').hasBoundaryAsset).toBe(true);
      expect(stateData.getGeographicCapability('ts').boundaryStatus).toBe('CONFLICT_PENDING');
      expect(stateData.getGeographicCapability('AP').hasBoundaryAsset).toBe(false);
      expect(stateData.getGeographicCapability('DL').boundaryStatus).toBe('UNAVAILABLE');
      expect(stateData.VALIDATED_GEOJSON_STATES.size).toBe(0);
      expect(stateData.STATES_WITH_BOUNDARY_ASSETS.has('TS')).toBe(true);
      expect(stateData.STATES_WITH_BOUNDARY_ASSETS.size).toBe(1);
    });
  });

  describe('isStateSupported', () => {
    it('correctly identifies supported and unsupported states', () => {
      expect(isStateSupported('TS')).toBe(true);
      expect(isStateSupported('ts')).toBe(true);
      expect(isStateSupported('UP')).toBe(true);
      expect(isStateSupported('DL')).toBe(true);
      expect(isStateSupported('ZZ')).toBe(false);
      expect(isStateSupported('')).toBe(false);
    });
  });

  describe('getConstituencies and genericToBrief', () => {
    it('returns empty array for invalid state', () => {
      expect(getConstituencies('ZZ')).toEqual([]);
    });

    it('returns all constituencies for TS with correct fields', () => {
      const tsList = getConstituencies('TS');
      expect(tsList.length).toBe(119);
      const first = tsList[0];
      expect(first.id).toBe('TS-AC-1');
      expect(first.acNo).toBe(1);
      expect(first.stateCode).toBe('TS');
      expect(first.name).toBeDefined();
    });

    it('handles October 2026 by-election overrides correctly', () => {
      // TN AC 35
      const tn35 = getConstituencies('TN').find((c) => c.acNo === 35);
      expect(tn35?.currentParty).toBe('TVK');
      expect(tn35?.currentMLA).toBe('K. Maragatham Kumaravel');

      // TN AC 101
      const tn101 = getConstituencies('TN').find((c) => c.acNo === 101);
      expect(tn101?.currentParty).toBe('TVK');
      expect(tn101?.currentMLA).toBe('P. Sathyabama');

      // WB AC 210
      const wb210 = getConstituencies('WB').find((c) => c.acNo === 210);
      expect(wb210?.currentParty).toBe('BJP');
      expect(wb210?.currentMLA).toBe('Hasi Rani Rath');

      // WB AC 70
      const wb70 = getConstituencies('WB').find((c) => c.acNo === 70);
      expect(wb70?.currentParty).toBe('BJP');
      expect(wb70?.currentMLA).toBe('Shankharavh Sarkar');

      // PY AC 9
      const py9 = getConstituencies('PY').find((c) => c.acNo === 9);
      expect(py9?.currentParty).toBe('AINRC');
      expect(py9?.currentMLA).toBe('Ashok Anand');
    });
  });

  describe('getConstituency and getRawConstituency', () => {
    it('retrieves constituency by state and acNo', () => {
      const c = getConstituency('TS', 1);
      expect(c).not.toBeNull();
      expect(c?.acNo).toBe(1);

      const raw = getRawConstituency('TS', 1);
      expect(raw).not.toBeNull();
      expect(raw.acNo).toBe(1);
    });

    it('returns null for missing constituency or invalid state', () => {
      expect(getConstituency('TS', 9999)).toBeNull();
      expect(getConstituency('ZZ', 1)).toBeNull();
      expect(getRawConstituency('TS', 9999)).toBeNull();
      expect(getRawConstituency('ZZ', 1)).toBeNull();
    });
  });

  describe('searchConstituencies', () => {
    it('finds constituencies by name, district, MLA, or acNo', () => {
      const byName = searchConstituencies('TS', 'Sirpur');
      expect(byName.length).toBeGreaterThan(0);
      expect(byName[0].name.toLowerCase()).toContain('sirpur');

      const byAcNo = searchConstituencies('TS', '42');
      expect(byAcNo.length).toBeGreaterThan(0);
      expect(byAcNo.some((c) => c.acNo === 42)).toBe(true);

      const empty = searchConstituencies('TS', 'XYZ_NON_EXISTENT_QUERY_123');
      expect(empty).toEqual([]);
    });
  });

  describe('Raw seed and profile getters', () => {
    it('returns seed arrays and profiles', () => {
      expect(getTSRawSeeds().length).toBe(119);
      expect(getTSElectionHistory().length).toBeGreaterThan(0);
      expect(getTSMLAProfiles().length).toBeGreaterThan(0);
      expect(getMLAProfile(1)).toBeDefined();
      expect(getMLAProfile(9999)).toBeUndefined();
    });
  });

  describe('getConstituencyElectionData edge cases & multi-state coverage', () => {
    it('returns null for invalid inputs', () => {
      const nullStr: any = null;
      const numStr: any = 123;
      const nullNum: any = null;
      expect(getConstituencyElectionData('', 1)).toBeNull();
      expect(getConstituencyElectionData(nullStr, 1)).toBeNull();
      expect(getConstituencyElectionData(numStr, 1)).toBeNull();
      expect(getConstituencyElectionData('TS', nullNum)).toBeNull();
      expect(getConstituencyElectionData('ZZ', 1)).toBeNull();
      expect(getConstituencyElectionData('TS', 9999)).toBeNull();
    });

    it('covers Telangana (2023 winner, 2018 and 2014 historical results)', () => {
      const data = getConstituencyElectionData('TS', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2023);
      expect(data?.recentElection.winner).toBeDefined();
      expect(data?.recentElection.winnerName).toBeDefined();

      // Check historical attached elections
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2023);
      expect(years).toContain(2018);
      expect(years).toContain(2014);

      // Verify descending sort order
      for (let i = 0; i < (data?.elections.length ?? 0) - 1; i++) {
        const curr = data!.elections[i].electionYear ?? 0;
        const next = data!.elections[i + 1].electionYear ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    });

    it('covers Andhra Pradesh (2024 winner and 2019 historical results)', () => {
      const data = getConstituencyElectionData('AP', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2024);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2024);
      expect(years).toContain(2019);
    });

    it('covers Karnataka (2023 winner and 2018 historical results)', () => {
      const data = getConstituencyElectionData('KA', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2023);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2023);
      expect(years).toContain(2018);
    });

    it('covers Maharashtra (2024 winner and 2019 historical results)', () => {
      const data = getConstituencyElectionData('MH', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2024);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2024);
      expect(years).toContain(2019);
    });

    it('covers Tamil Nadu (2021 winner and 2016 historical results)', () => {
      const data = getConstituencyElectionData('TN', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2021);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2021);
      expect(years).toContain(2016);
    });

    it('covers Kerala (2021 winner and 2016 historical results)', () => {
      const data = getConstituencyElectionData('KL', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2021);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2021);
      expect(years).toContain(2016);
    });

    it('covers West Bengal (2021 winner and 2016 historical results)', () => {
      const data = getConstituencyElectionData('WB', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2021);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2021);
      expect(years).toContain(2016);
    });

    it('covers Uttar Pradesh (2022 winner and 2017 historical results)', () => {
      const data = getConstituencyElectionData('UP', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2022);
      const years = data?.elections.map((e) => e.electionYear);
      expect(years).toContain(2022);
      expect(years).toContain(2017);
    });

    it('covers Bihar (2020 winner)', () => {
      const data = getConstituencyElectionData('BR', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2020);
    });

    it('covers Delhi (2025 winner)', () => {
      const data = getConstituencyElectionData('DL', 1);
      expect(data).not.toBeNull();
      expect(data?.recentElection.electionYear).toBe(2025);
    });

    it('covers explicit electionYear and GENERAL electionType in raw record', () => {
      const rawSeeds = getTSRawSeeds() as any[];
      const testAc = {
        acNo: 9991,
        name: 'Mock Explicit AC',
        district: 'Hyderabad',
        type: 'GEN',
        electionYear: 2019,
        electionType: 'GENERAL',
        winner: 'INC',
        winnerName: 'Test Leader',
        winnerVotes: 60000,
        runnerUp: 'BRS',
        margin: 5000,
      };
      rawSeeds.push(testAc);

      try {
        const data = getConstituencyElectionData('TS', 9991);
        expect(data).not.toBeNull();
        expect(data?.recentElection.electionYear).toBe(2019);
        expect(data?.recentElection.electionType).toBe('GENERAL');
        expect(data?.recentElection.winnerVotes).toBe(60000);
        expect(data?.recentElection.margin).toBe(5000);
      } finally {
        const idx = rawSeeds.findIndex((c) => c.acNo === 9991);
        if (idx !== -1) rawSeeds.splice(idx, 1);
      }
    });

    it('covers bypoll electionType and unestablished election year', () => {
      const rawSeeds = getTSRawSeeds() as any[];
      const testAc = {
        acNo: 9992,
        name: 'Mock Bypoll AC',
        district: 'Hyderabad',
        type: 'GEN',
        electionType: 'BYPOLL',
        winner: 'BJP',
        winnerName: 'Bypoll Winner',
        winnerVotes: 40000,
        runnerUp: 'INC',
        margin: 2000,
      };
      rawSeeds.push(testAc);

      try {
        const data = getConstituencyElectionData('TS', 9992);
        expect(data).not.toBeNull();
        expect(data?.recentElection.electionYear).toBeNull();
        expect(data?.recentElection.electionType).toBe('BYPOLL');
        expect(data?.recentElection.winner).toBe('BJP');
        expect(data?.elections.length).toBeGreaterThan(0);
      } finally {
        const idx = rawSeeds.findIndex((c) => c.acNo === 9992);
        if (idx !== -1) rawSeeds.splice(idx, 1);
      }
    });

    it('covers winnerName-only and non-number votes/margins across all historical election years', () => {
      const rawSeeds = getTSRawSeeds() as any[];

      // 2025: winnerName2025 defined, winner2025 undefined, non-number votes
      const ac2025 = {
        acNo: 9994,
        name: 'Mock 2025 AC',
        winnerName2025: 'Name 2025',
        winnerVotes2025: null,
        margin2025: 'invalid',
      };
      // 2024: winnerName2024 defined, winner2024 undefined, non-number votes
      const ac2024 = {
        acNo: 9995,
        name: 'Mock 2024 AC',
        winnerName2024: 'Name 2024',
        winnerVotes2024: null,
        margin2024: null,
      };
      // 2023: winnerName2023 defined, winner2023 undefined, non-number votes
      const ac2023 = {
        acNo: 9996,
        name: 'Mock 2023 AC',
        winnerName2023: 'Name 2023',
        winnerVotes2023: undefined,
        margin2023: undefined,
      };
      // 2022: winnerName2022 defined, winner2022 undefined
      const ac2022 = {
        acNo: 9997,
        name: 'Mock 2022 AC',
        winnerName2022: 'Name 2022',
        winnerVotes2022: null,
        margin2022: null,
      };
      // 2021: winnerName2021 defined, winner2021 undefined
      const ac2021 = {
        acNo: 9998,
        name: 'Mock 2021 AC',
        winnerName2021: 'Name 2021',
        winnerVotes2021: null,
        margin2021: null,
      };
      // 2020: winnerName2020 defined, winner2020 undefined
      const ac2020 = {
        acNo: 9999,
        name: 'Mock 2020 AC',
        winnerName2020: 'Name 2020',
        winnerVotes2020: null,
        margin2020: null,
      };

      rawSeeds.push(ac2025, ac2024, ac2023, ac2022, ac2021, ac2020);

      try {
        const d2025 = getConstituencyElectionData('TS', 9994);
        expect(d2025?.recentElection.electionYear).toBe(2025);
        expect(d2025?.recentElection.winnerVotes).toBeNull();
        expect(d2025?.recentElection.margin).toBeNull();

        const d2024 = getConstituencyElectionData('TS', 9995);
        expect(d2024?.recentElection.electionYear).toBe(2024);

        const d2023 = getConstituencyElectionData('TS', 9996);
        expect(d2023?.recentElection.electionYear).toBe(2023);

        const d2022 = getConstituencyElectionData('TS', 9997);
        expect(d2022?.recentElection.electionYear).toBe(2022);

        const d2021 = getConstituencyElectionData('TS', 9998);
        expect(d2021?.recentElection.electionYear).toBe(2021);

        const d2020 = getConstituencyElectionData('TS', 9999);
        expect(d2020?.recentElection.electionYear).toBe(2020);
      } finally {
        for (const ac of [9994, 9995, 9996, 9997, 9998, 9999]) {
          const idx = rawSeeds.findIndex((c) => c.acNo === ac);
          if (idx !== -1) rawSeeds.splice(idx, 1);
        }
      }
    });

    it('handles states when historical results do not match (h is undefined)', () => {
      // Test high acNo across states where historical data is sparse or missing
      expect(getConstituencyElectionData('AP', 175)).not.toBeNull();
      expect(getConstituencyElectionData('KA', 224)).not.toBeNull();
      expect(getConstituencyElectionData('MH', 288)).not.toBeNull();
      expect(getConstituencyElectionData('TN', 234)).not.toBeNull();
      expect(getConstituencyElectionData('KL', 140)).not.toBeNull();
      expect(getConstituencyElectionData('WB', 294)).not.toBeNull();
      expect(getConstituencyElectionData('UP', 403)).not.toBeNull();
    });

    it('covers all marginPercent false branches (winnerVotes <= 0, margin < 0, nulls)', () => {
      const rawSeeds = getTSRawSeeds() as any[];
      const zeroVotesAc = {
        acNo: 9988,
        name: 'Zero Votes AC',
        winner2023: 'INC',
        winnerVotes2023: 0,
        margin2023: 100,
      };
      const negMarginAc = {
        acNo: 9989,
        name: 'Negative Margin AC',
        winner2023: 'INC',
        winnerVotes2023: 1000,
        margin2023: -10,
      };
      rawSeeds.push(zeroVotesAc, negMarginAc);

      try {
        const dZero = getConstituencyElectionData('TS', 9988);
        expect(dZero?.recentElection.marginPercent).toBeNull();

        const dNeg = getConstituencyElectionData('TS', 9989);
        expect(dNeg?.recentElection.marginPercent).toBeNull();
      } finally {
        for (const ac of [9988, 9989]) {
          const idx = rawSeeds.findIndex((c) => c.acNo === ac);
          if (idx !== -1) rawSeeds.splice(idx, 1);
        }
      }
    });

    it('computes marginPercent accurately when votes and margin exist', () => {
      const ts1 = getConstituencyElectionData('TS', 1);
      if (ts1?.recentElection.winnerVotes && ts1.recentElection.margin) {
        const expected = parseFloat(((ts1.recentElection.margin / ts1.recentElection.winnerVotes) * 100).toFixed(1));
        expect(ts1.recentElection.marginPercent).toBe(expected);
      }
    });
  });
});
