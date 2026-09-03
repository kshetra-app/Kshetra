/**
 * Tests for Haryana constituency seed data file.
 */
import { HR_CONSTITUENCIES, getHRConstituency } from '../haryana-constituencies';

describe('Haryana Assembly Constituencies Seed', () => {
  it('should have 90 constituencies', () => {
    expect(HR_CONSTITUENCIES).toHaveLength(90);
  });

  it('every constituency should have acNo, name, and localName in Devanagari script', () => {
    for (const c of HR_CONSTITUENCIES) {
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
    for (let i = 1; i < HR_CONSTITUENCIES.length; i++) {
      expect(HR_CONSTITUENCIES[i].acNo).toBeGreaterThan(HR_CONSTITUENCIES[i - 1].acNo);
    }
  });

  it('getHRConstituency should return the correct constituency', () => {
    const c = getHRConstituency(1);
    expect(c).toBeDefined();
    expect(c?.name).toBe('Kalka');
    expect(c?.localName).toBe('कालका');
  });

  it('getHRConstituency should return undefined for invalid acNo', () => {
    expect(getHRConstituency(999)).toBeUndefined();
  });
});
