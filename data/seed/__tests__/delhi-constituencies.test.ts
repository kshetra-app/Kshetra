/**
 * Tests for Delhi constituency seed data file.
 */
import { DL_CONSTITUENCIES, getDLConstituency } from '../delhi-constituencies';

describe('Delhi Assembly Constituencies Seed', () => {
  it('should have 70 constituencies', () => {
    expect(DL_CONSTITUENCIES).toHaveLength(70);
  });

  it('every constituency should have acNo, name, and localName in Devanagari script', () => {
    for (const c of DL_CONSTITUENCIES) {
      expect(c.acNo).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.localName).toBeDefined();
      expect(c.localName?.length).toBeGreaterThan(0);
      // Ensure it contains Devanagari characters
      expect(c.localName).toMatch(/[\u0900-\u097F]/);
      expect(c.district.length).toBeGreaterThan(0);
      expect(['GEN', 'SC', 'ST']).toContain(c.type);
    }
  });

  it('acNo should be unique and sorted in ascending order', () => {
    for (let i = 1; i < DL_CONSTITUENCIES.length; i++) {
      expect(DL_CONSTITUENCIES[i].acNo).toBeGreaterThan(DL_CONSTITUENCIES[i - 1].acNo);
    }
  });

  it('getDLConstituency should return the correct constituency', () => {
    const c = getDLConstituency(1);
    expect(c).toBeDefined();
    expect(c?.name).toBe('Narela');
    expect(c?.localName).toBe('नरेला');
  });

  it('getDLConstituency should return undefined for invalid acNo', () => {
    expect(getDLConstituency(999)).toBeUndefined();
  });
});
