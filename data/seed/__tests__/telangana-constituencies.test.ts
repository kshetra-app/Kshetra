import { TELANGANA_CONSTITUENCIES } from '../telangana-constituencies';

describe('Telangana Constituencies Seed Data', () => {
  it('should have exactly 119 constituencies', () => {
    expect(TELANGANA_CONSTITUENCIES).toHaveLength(119);
  });

  it('should have unique AC numbers from 1 to 119', () => {
    const acNumbers = TELANGANA_CONSTITUENCIES.map((c) => c.acNo).sort(
      (a, b) => a - b,
    );
    const expected = Array.from({ length: 119 }, (_, i) => i + 1);
    expect(acNumbers).toEqual(expected);
  });

  it('should have unique constituency names', () => {
    const names = TELANGANA_CONSTITUENCIES.map((c) => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(119);
  });

  it('should have valid constituency types', () => {
    const validTypes = ['GEN', 'SC', 'ST'];
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(validTypes).toContain(c.type);
    });
  });

  it('should have valid party codes for winners and runner-ups', () => {
    const validParties = ['INC', 'BRS', 'BJP', 'AIMIM', 'TDP', 'CPI', 'CPM', 'IND'];
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(validParties).toContain(c.winner2023);
      expect(validParties).toContain(c.runnerUp2023);
    });
  });

  it('should have positive vote counts and margins', () => {
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(c.winnerVotes2023).toBeGreaterThan(0);
      expect(c.margin2023).toBeGreaterThan(0);
    });
  });

  it('should have non-empty winner names', () => {
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(c.winnerName2023.length).toBeGreaterThan(0);
    });
  });

  it('should have non-empty district names', () => {
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(c.district.length).toBeGreaterThan(0);
    });
  });

  it('should contain expected INC-majority results (2023 was INC sweep)', () => {
    const incWins = TELANGANA_CONSTITUENCIES.filter(
      (c) => c.winner2023 === 'INC',
    ).length;
    // INC won ~64 seats in 2023
    expect(incWins).toBeGreaterThan(50);
  });

  it('should contain AIMIM wins in Hyderabad Old City', () => {
    const aimimSeats = TELANGANA_CONSTITUENCIES.filter(
      (c) => c.winner2023 === 'AIMIM',
    );
    expect(aimimSeats.length).toBeGreaterThanOrEqual(7);
    aimimSeats.forEach((c) => {
      expect(c.district).toBe('Hyderabad');
    });
  });
});
