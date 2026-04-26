import { STATES, INDIA_CENTER, INDIA_ZOOM, SUPPORTED_STATES } from '../constants/states';

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
});
