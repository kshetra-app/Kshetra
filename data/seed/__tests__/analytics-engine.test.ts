/**
 * Election Analytics Engine — Integration Tests
 */

import * as path from 'path';

// We need to mock the stateDataAdapter imports used by electionAnalytics
// The analytics engine imports from '../stateDataAdapter' (relative to lib/)
// We'll test the core logic by importing the adapter and analytics directly

describe('Election Analytics Engine', () => {
  // Since electionAnalytics.ts imports from the mobile app lib path,
  // we test the underlying data that feeds it instead.

  const { getUnifiedConstituenciesForState } = require(
    path.resolve(__dirname, '../../../apps/mobile/lib/stateDataAdapter')
  );

  describe('State Data Adapter', () => {
    const STATES = ['TS', 'AP', 'KA', 'MH'];
    const EXPECTED_SEATS: Record<string, number> = { TS: 119, AP: 175, KA: 224, MH: 288 };

    for (const state of STATES) {
      it(`should load all ${EXPECTED_SEATS[state]} constituencies for ${state}`, () => {
        const data = getUnifiedConstituenciesForState(state);
        expect(data).toHaveLength(EXPECTED_SEATS[state]);
      });

      it(`should have valid UnifiedConstituency shape for ${state}`, () => {
        const data = getUnifiedConstituenciesForState(state);
        for (const c of data) {
          expect(c.acNo).toBeGreaterThan(0);
          expect(c.name).toBeTruthy();
          expect(c.district).toBeTruthy();
          expect(['GEN', 'SC', 'ST']).toContain(c.type);
          expect(c.stateCode).toBe(state);
          expect(c.winnerParty).toBeTruthy();
          expect(c.winnerName).toBeTruthy();
          expect(c.winnerVotes).toBeGreaterThan(0);
          expect(c.margin).toBeGreaterThanOrEqual(0);
          expect(c.currentParty).toBeTruthy();
          expect(c.electionYear).toBeGreaterThan(2020);
        }
      });

      it(`should have unique AC numbers for ${state}`, () => {
        const data = getUnifiedConstituenciesForState(state);
        const acNos = data.map((c: any) => c.acNo);
        expect(new Set(acNos).size).toBe(acNos.length);
      });
    }

    it('should return empty array for unknown state', () => {
      expect(getUnifiedConstituenciesForState('XX')).toHaveLength(0);
    });
  });

  describe('Analytics Computations', () => {
    it('should compute party strength correctly for TS', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const partyMap = new Map<string, number>();
      for (const c of data) {
        partyMap.set(c.currentParty, (partyMap.get(c.currentParty) ?? 0) + 1);
      }

      // Verify total adds up
      let total = 0;
      for (const [, count] of partyMap) total += count;
      expect(total).toBe(119);

      // INC should have the most seats in TS (post-defection)
      const sorted = [...partyMap.entries()].sort((a, b) => b[1] - a[1]);
      expect(sorted[0][0]).toBe('INC');
    });

    it('should identify swing seats (margin < 8000)', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const swingSeats = data.filter((c: any) => c.margin < 8000);
      expect(swingSeats.length).toBeGreaterThan(0);
      for (const s of swingSeats) {
        expect(s.margin).toBeLessThan(8000);
      }
    });

    it('should compute district breakdown for KA', () => {
      const data = getUnifiedConstituenciesForState('KA');
      const districts = new Map<string, number>();
      for (const c of data) {
        districts.set(c.district, (districts.get(c.district) ?? 0) + 1);
      }

      // KA should have multiple districts
      expect(districts.size).toBeGreaterThan(10);

      // Total seats across districts should equal total
      let total = 0;
      for (const [, count] of districts) total += count;
      expect(total).toBe(224);
    });

    it('should compute reservation breakdown for AP', () => {
      const data = getUnifiedConstituenciesForState('AP');
      const gen = data.filter((c: any) => c.type === 'GEN').length;
      const sc = data.filter((c: any) => c.type === 'SC').length;
      const st = data.filter((c: any) => c.type === 'ST').length;

      expect(gen + sc + st).toBe(175);
      expect(gen).toBeGreaterThan(0);
      expect(sc).toBeGreaterThan(0);
      expect(st).toBeGreaterThan(0);
    });

    it('should detect defections in TS', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const defected = data.filter((c: any) => c.currentParty !== c.winnerParty);
      // We know TS has 10 BRS→INC defections
      expect(defected.length).toBe(10);
    });

    it('should compute cross-state comparison', () => {
      const states = ['TS', 'AP', 'KA', 'MH'];
      const results = states.map((code) => {
        const data = getUnifiedConstituenciesForState(code);
        const partyMap = new Map<string, number>();
        for (const c of data) {
          partyMap.set(c.currentParty, (partyMap.get(c.currentParty) ?? 0) + 1);
        }
        const sorted = [...partyMap.entries()].sort((a, b) => b[1] - a[1]);
        return { code, totalSeats: data.length, topParty: sorted[0][0], topSeats: sorted[0][1] };
      });

      expect(results).toHaveLength(4);
      for (const r of results) {
        expect(r.totalSeats).toBeGreaterThan(0);
        expect(r.topParty).toBeTruthy();
        expect(r.topSeats).toBeGreaterThan(0);
        expect(r.topSeats).toBeLessThanOrEqual(r.totalSeats);
      }
    });
  });
});
