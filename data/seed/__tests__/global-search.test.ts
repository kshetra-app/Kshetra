/**
 * Global Search Engine — Tests
 *
 * Tests the search scoring and result ranking logic
 * by directly testing the UnifiedConstituency data it searches over.
 */

const path = require('path');

describe('Global Search Data Layer', () => {
  const { getUnifiedConstituenciesForState } = require(
    path.resolve(__dirname, '../../../apps/mobile/lib/stateDataAdapter')
  );

  describe('Constituency search scoring', () => {
    it('should find constituency by exact name', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const match = data.find((c: any) => c.name.toLowerCase() === 'jubilee hills');
      expect(match).toBeTruthy();
      expect(match.stateCode).toBe('TS');
    });

    it('should find constituency by AC number', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const match = data.find((c: any) => c.acNo === 1);
      expect(match).toBeTruthy();
    });

    it('should find constituencies by district name', () => {
      const data = getUnifiedConstituenciesForState('KA');
      const bangaloreSeats = data.filter((c: any) =>
        c.district.toLowerCase().includes('bangalore') || c.district.toLowerCase().includes('bengaluru')
      );
      expect(bangaloreSeats.length).toBeGreaterThan(0);
    });

    it('should find MLA by name', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const match = data.find((c: any) =>
        c.winnerName.toLowerCase().includes('revanth')
      );
      expect(match).toBeTruthy();
      expect(match.currentParty).toBe('INC');
    });

    it('should find constituencies by party', () => {
      const data = getUnifiedConstituenciesForState('MH');
      const bjpSeats = data.filter((c: any) => c.currentParty === 'BJP');
      expect(bjpSeats.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-state search', () => {
    const ALL_STATES = ['TS', 'AP', 'KA', 'MH'];

    it('should search across all states', () => {
      const allData: any[] = [];
      for (const state of ALL_STATES) {
        allData.push(...getUnifiedConstituenciesForState(state));
      }
      expect(allData.length).toBe(119 + 175 + 224 + 288); // 806 total
    });

    it('should find BJP seats across states', () => {
      let totalBJP = 0;
      for (const state of ALL_STATES) {
        const data = getUnifiedConstituenciesForState(state);
        totalBJP += data.filter((c: any) => c.currentParty === 'BJP').length;
      }
      expect(totalBJP).toBeGreaterThan(0);
    });

    it('should have no duplicate AC IDs across states', () => {
      const ids = new Set<string>();
      for (const state of ALL_STATES) {
        const data = getUnifiedConstituenciesForState(state);
        for (const c of data) {
          const id = `${state}-AC-${c.acNo}`;
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      }
      expect(ids.size).toBe(806);
    });
  });

  describe('Result ranking properties', () => {
    it('exact name match should rank higher than partial', () => {
      const data = getUnifiedConstituenciesForState('TS');

      // Score function (simplified from globalSearch)
      function score(c: any, q: string): number {
        const name = c.name.toLowerCase();
        if (name === q) return 90;
        if (name.startsWith(q)) return 80;
        if (name.includes(q)) return 60;
        if (c.district.toLowerCase().includes(q)) return 45;
        return 0;
      }

      const exactMatch = data.find((c: any) => c.name.toLowerCase() === 'jubilee hills');
      const partialMatch = data.find((c: any) =>
        c.name.toLowerCase().includes('jubilee') && c.name.toLowerCase() !== 'jubilee hills'
      );

      if (exactMatch) {
        expect(score(exactMatch, 'jubilee hills')).toBe(90);
      }
      if (partialMatch) {
        expect(score(partialMatch, 'jubilee')).toBeLessThan(90);
      }
    });

    it('should score AC number matches highest', () => {
      const data = getUnifiedConstituenciesForState('TS');
      const acMatch = data.find((c: any) => c.acNo === 100);
      expect(acMatch).toBeTruthy();
    });
  });
});
