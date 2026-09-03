/**
 * Tests for Jharkhand constituency seed data file.
 */
import { JH_CONSTITUENCIES, getJHConstituency } from '../jharkhand-constituencies';

describe('Jharkhand Constituencies Seed', () => {
  it('should have 81 constituencies', () => {
    expect(JH_CONSTITUENCIES).toHaveLength(81);
  });

  it('every constituency should have acNo, name, and localName in Devanagari script', () => {
    for (const c of JH_CONSTITUENCIES) {
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
    for (let i = 1; i < JH_CONSTITUENCIES.length; i++) {
      expect(JH_CONSTITUENCIES[i].acNo).toBeGreaterThan(JH_CONSTITUENCIES[i - 1].acNo);
    }
  });

  it('getJHConstituency should return the correct constituency', () => {
    const c = getJHConstituency(1);
    expect(c).toBeDefined();
    expect(c?.name).toBe('Rajmahal');
    expect(c?.localName).toBe('राजमहल');
  });

  it('getJHConstituency should return undefined for invalid acNo', () => {
    expect(getJHConstituency(999)).toBeUndefined();
  });
});
