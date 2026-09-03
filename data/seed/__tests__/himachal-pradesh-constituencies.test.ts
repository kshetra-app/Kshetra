/**
 * Tests for Himachal Pradesh constituency seed data file.
 */
import { HP_CONSTITUENCIES, getHPConstituency } from '../himachal-pradesh-constituencies';

describe('Himachal Pradesh Assembly Constituencies Seed', () => {
  it('should have 68 constituencies', () => {
    expect(HP_CONSTITUENCIES).toHaveLength(68);
  });

  it('every constituency should have acNo, name, and localName in Devanagari script', () => {
    for (const c of HP_CONSTITUENCIES) {
      expect(c.acNo).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.localName).toBeDefined();
      expect(c.localName?.length).toBeGreaterThan(0);
      expect(c.localName).toMatch(/[\u0900-\u097F]/);
      expect(c.district.length).toBeGreaterThan(0);
      expect(['GEN', 'SC', 'ST']).toContain(c.type);
    }
  });

  it('acNo should be unique and sorted in ascending order', () => {
    for (let i = 1; i < HP_CONSTITUENCIES.length; i++) {
      expect(HP_CONSTITUENCIES[i].acNo).toBeGreaterThan(HP_CONSTITUENCIES[i - 1].acNo);
    }
  });

  it('getHPConstituency should return the correct constituency', () => {
    const c = getHPConstituency(1);
    expect(c).toBeDefined();
    expect(c?.name).toBe('Churah');
    expect(c?.localName).toBe('चुराह');
  });

  it('getHPConstituency should return undefined for invalid acNo', () => {
    expect(getHPConstituency(999)).toBeUndefined();
  });
});
