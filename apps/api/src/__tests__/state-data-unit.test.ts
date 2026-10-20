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
      expect(ts?.hasGeoJSON).toBe(true);

      const tsLower = getStateInfo('ts');
      expect(tsLower).toEqual(ts);

      const ap = getStateInfo('AP');
      expect(ap?.name).toBe('Andhra Pradesh');
      expect(ap?.totalSeats).toBe(175);
    });

    it('returns null for non-existent or unsupported state codes', () => {
      expect(getStateInfo('ZZ')).toBeNull();
      expect(getStateInfo('')).toBeNull();
      expect(getStateInfo('UNKNOWN')).toBeNull();
    });

    it('returns all 31 supported states with full metadata', () => {
      const all = getAllStatesInfo();
      expect(all.length).toBe(31);
      for (const info of all) {
        expect(info.code).toBeDefined();
        expect(info.name).toBeDefined();
        expect(info.totalSeats).toBeGreaterThan(0);
        expect(info.loadedCount).toBeGreaterThan(0);
        expect(['full', 'stub']).toContain(info.dataStatus);
      }
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

    it('computes marginPercent accurately when votes and margin exist', () => {
      const ts1 = getConstituencyElectionData('TS', 1);
      if (ts1?.recentElection.winnerVotes && ts1.recentElection.margin) {
        const expected = parseFloat(((ts1.recentElection.margin / ts1.recentElection.winnerVotes) * 100).toFixed(1));
        expect(ts1.recentElection.marginPercent).toBe(expected);
      }
    });
  });
});
