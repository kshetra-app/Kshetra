import {
  STATES,
  INDIA_CENTER,
  INDIA_ZOOM,
  SUPPORTED_STATES,
  CANONICAL_NATIONAL_JURISDICTIONS,
  ALL_NATIONAL_JURISDICTION_CODES,
} from '../constants/states';

describe('State Configuration', () => {
  describe('STATES', () => {
    it('should have Telangana configured', () => {
      const ts = STATES.TS;
      expect(ts).toBeDefined();
      expect(ts.name).toBe('Telangana');
      expect(ts.assemblySeats).toBe(119);
      expect(ts.parliamentarySeats).toBe(17);
    });

    it('should have Andhra Pradesh configured', () => {
      const ap = STATES.AP;
      expect(ap).toBeDefined();
      expect(ap.name).toBe('Andhra Pradesh');
      expect(ap.assemblySeats).toBe(175);
      expect(ap.parliamentarySeats).toBe(25);
    });

    it('should have Karnataka configured', () => {
      const ka = STATES.KA;
      expect(ka).toBeDefined();
      expect(ka.name).toBe('Karnataka');
      expect(ka.assemblySeats).toBe(224);
      expect(ka.parliamentarySeats).toBe(28);
    });

    it('should have Maharashtra configured', () => {
      const mh = STATES.MH;
      expect(mh).toBeDefined();
      expect(mh.name).toBe('Maharashtra');
      expect(mh.assemblySeats).toBe(288);
      expect(mh.parliamentarySeats).toBe(48);
    });

    it('should have at least 4 states configured', () => {
      expect(Object.keys(STATES).length).toBeGreaterThanOrEqual(4);
    });

    it('should have valid centroid coordinates for all states', () => {
      Object.values(STATES).forEach((state) => {
        expect(state.centroid.latitude).toBeGreaterThanOrEqual(-90);
        expect(state.centroid.latitude).toBeLessThanOrEqual(90);
        expect(state.centroid.longitude).toBeGreaterThanOrEqual(-180);
        expect(state.centroid.longitude).toBeLessThanOrEqual(180);
      });
    });

    it('should have positive zoom values for all states', () => {
      Object.values(STATES).forEach((state) => {
        expect(state.zoom).toBeGreaterThan(0);
        expect(state.zoom).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('SUPPORTED_STATES', () => {
    it('should include TS', () => {
      expect(SUPPORTED_STATES).toContain('TS');
    });

    it('should only list states present in STATES', () => {
      for (const code of SUPPORTED_STATES) {
        expect(STATES[code]).toBeDefined();
      }
    });
  });

  describe('India defaults', () => {
    it('should have a valid India center coordinate', () => {
      expect(INDIA_CENTER.latitude).toBeCloseTo(22.59, 1);
      expect(INDIA_CENTER.longitude).toBeCloseTo(78.96, 1);
    });

    it('should have a reasonable India zoom level', () => {
      expect(INDIA_ZOOM).toBe(4);
    });
  });

  describe('CANONICAL_NATIONAL_JURISDICTIONS (W021.5-B1 National Jurisdiction Registry)', () => {
    it('should cover exactly 36 States and Union Territories', () => {
      const keys = Object.keys(CANONICAL_NATIONAL_JURISDICTIONS);
      expect(keys.length).toBe(36);
      expect(ALL_NATIONAL_JURISDICTION_CODES.length).toBe(36);
    });

    it('should classify exactly 28 States and 8 Union Territories', () => {
      const jurisdictions = Object.values(CANONICAL_NATIONAL_JURISDICTIONS);
      const states = jurisdictions.filter((j) => j.type === 'STATE');
      const uts = jurisdictions.filter((j) => j.type === 'UNION_TERRITORY');
      expect(states.length).toBe(28);
      expect(uts.length).toBe(8);
    });

    it('should identify exactly 31 jurisdictions with Legislative Assemblies and 5 without', () => {
      const jurisdictions = Object.values(CANONICAL_NATIONAL_JURISDICTIONS);
      const withAssembly = jurisdictions.filter((j) => j.hasAssembly);
      const withoutAssembly = jurisdictions.filter((j) => !j.hasAssembly);
      expect(withAssembly.length).toBe(31);
      expect(withoutAssembly.length).toBe(5);

      const noAssemblyCodes = withoutAssembly.map((j) => j.code).sort();
      expect(noAssemblyCodes).toEqual(['AN', 'CH', 'DN', 'LA', 'LD'].sort());
      for (const j of withoutAssembly) {
        expect(j.assemblySeats).toBe(0);
      }
    });

    it('should total exactly 4,123 Assembly Constituencies across India', () => {
      const totalAssemblySeats = Object.values(CANONICAL_NATIONAL_JURISDICTIONS).reduce(
        (acc, j) => acc + j.assemblySeats,
        0,
      );
      expect(totalAssemblySeats).toBe(4123);
    });

    it('should total exactly 543 Parliamentary Constituencies across India', () => {
      const totalParliamentarySeats = Object.values(CANONICAL_NATIONAL_JURISDICTIONS).reduce(
        (acc, j) => acc + j.parliamentarySeats,
        0,
      );
      expect(totalParliamentarySeats).toBe(543);
    });

    it('should enforce statutory completeness for every jurisdiction', () => {
      for (const j of Object.values(CANONICAL_NATIONAL_JURISDICTIONS)) {
        expect(j.code).toMatch(/^[A-Z]{2}$/);
        expect(j.name.length).toBeGreaterThan(0);
        expect(j.capital.length).toBeGreaterThan(0);
        expect(j.lgdCode).toBeGreaterThan(0);
        expect(j.censusCode2011).toMatch(/^[0-9]{2}$/);
        expect(j.status).toBe('ACTIVE');
        expect(j.source).toBe('ECI_DELIMITATION_ORDER_2008');
        expect(j.verificationStatus).toBe('VERIFIED');
      }
    });
  });
});

