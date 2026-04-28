import {
  getAllTrivia,
  getTriviaForConstituency,
  getTriviaForParty,
  getTriviaForMLA,
  getTriviaForElection,
  getRandomTrivia,
  getRandomTriviaSet,
  getTriviaByCategory,
} from '../telangana-trivia';

describe('Telangana Trivia Engine', () => {
  // ── BASIC INTEGRITY ──

  it('should have at least 20 trivia items (curated + derived)', () => {
    const all = getAllTrivia();
    expect(all.length).toBeGreaterThanOrEqual(20);
  });

  it('should have unique IDs for every trivia item', () => {
    const all = getAllTrivia();
    const ids = all.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have non-empty headline and body for every item', () => {
    getAllTrivia().forEach((t) => {
      expect(t.headline.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
    });
  });

  it('should have at least one context for every item', () => {
    getAllTrivia().forEach((t) => {
      expect(t.contexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should have a source citation for every item', () => {
    getAllTrivia().forEach((t) => {
      expect(t.source.length).toBeGreaterThan(0);
    });
  });

  // ── CONTEXT QUERIES ──

  it('should return trivia for Rajendranagar (AC 51) including the 4-party man', () => {
    const trivia = getTriviaForConstituency(51);
    expect(trivia.some((t) => t.headline.includes('4-Party Man'))).toBe(true);
  });

  it('should return trivia for AIMIM including the unbreakable fortress', () => {
    const trivia = getTriviaForParty('AIMIM');
    expect(trivia.some((t) => t.headline.includes('Unbreakable Fortress'))).toBe(true);
  });

  it('should return trivia for Revanth Reddy', () => {
    const trivia = getTriviaForMLA('Revanth Reddy');
    expect(trivia.some((t) => t.headline.includes('MLA to CM'))).toBe(true);
  });

  it('should return trivia for 2023 election', () => {
    const trivia = getTriviaForElection(2023);
    expect(trivia.some((t) => t.headline.includes('Greatest Comeback'))).toBe(true);
  });

  it('should return trivia for BRS including multiple items', () => {
    const trivia = getTriviaForParty('BRS');
    expect(trivia.length).toBeGreaterThanOrEqual(3);
  });

  // ── CATEGORY QUERIES ──

  it('should return defection trivia', () => {
    const trivia = getTriviaByCategory('DEFECTION');
    expect(trivia.length).toBeGreaterThanOrEqual(3);
  });

  it('should return record trivia', () => {
    const trivia = getTriviaByCategory('RECORD');
    expect(trivia.length).toBeGreaterThanOrEqual(2);
  });

  it('should return legal trivia', () => {
    const trivia = getTriviaByCategory('LEGAL');
    expect(trivia.length).toBeGreaterThanOrEqual(1);
  });

  // ── RANDOM ──

  it('should return a single random trivia item', () => {
    const item = getRandomTrivia();
    expect(item).toBeDefined();
    expect(item.headline.length).toBeGreaterThan(0);
  });

  it('should return N non-repeating random items', () => {
    const items = getRandomTriviaSet(5);
    expect(items.length).toBe(5);
    const ids = items.map((t) => t.id);
    expect(new Set(ids).size).toBe(5);
  });

  // ── DERIVED TRIVIA ──

  it('should include derived trivia from the ledger', () => {
    const all = getAllTrivia();
    const derived = all.filter((t) => t.derived);
    expect(derived.length).toBeGreaterThanOrEqual(3);
  });

  it('should include total defections derived stat', () => {
    const all = getAllTrivia();
    expect(all.some((t) => t.id === 'TRV-DRV-TOTAL-DEF')).toBe(true);
  });

  it('should include current strength derived stat', () => {
    const all = getAllTrivia();
    expect(all.some((t) => t.id === 'TRV-DRV-CURRENT-STRENGTH')).toBe(true);
  });
});
