import {
  TELANGANA_ELECTION_HISTORY,
  type ElectionHistoryEntry,
} from '../telangana-election-history';

describe('Telangana Election History', () => {
  it('should have 3 elections (2014, 2018, 2023)', () => {
    expect(TELANGANA_ELECTION_HISTORY).toHaveLength(3);
    const years = TELANGANA_ELECTION_HISTORY.map((e) => e.year);
    expect(years).toContain(2014);
    expect(years).toContain(2018);
    expect(years).toContain(2023);
  });

  it('each election should have 119 total seats', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      expect(election.totalSeats).toBe(119);
    }
  });

  it('seats won should sum to 119 for each election', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      const totalWon = election.partyResults.reduce((s, p) => s + p.seatsWon, 0);
      expect(totalWon).toBe(119);
    }
  });

  it('2023: INC should have won 64 seats', () => {
    const e2023 = TELANGANA_ELECTION_HISTORY.find((e) => e.year === 2023)!;
    const inc = e2023.partyResults.find((p) => p.party === 'INC')!;
    expect(inc.seatsWon).toBe(64);
  });

  it('2018: BRS should have won 88 seats', () => {
    const e2018 = TELANGANA_ELECTION_HISTORY.find((e) => e.year === 2018)!;
    const brs = e2018.partyResults.find((p) => p.party === 'BRS')!;
    expect(brs.seatsWon).toBe(88);
  });

  it('2014: BRS should have won 63 seats (first election)', () => {
    const e2014 = TELANGANA_ELECTION_HISTORY.find((e) => e.year === 2014)!;
    const brs = e2014.partyResults.find((p) => p.party === 'BRS')!;
    expect(brs.seatsWon).toBe(63);
  });

  it('AIMIM should have won 7 seats in every election', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      const aimim = election.partyResults.find((p) => p.party === 'AIMIM');
      expect(aimim).toBeDefined();
      expect(aimim!.seatsWon).toBe(7);
    }
  });

  it('each election should have valid turnout', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      expect(election.turnout).toBeGreaterThan(50);
      expect(election.turnout).toBeLessThan(100);
    }
  });

  it('each election should be assembly type', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      expect(election.type).toBe('assembly');
    }
  });

  it('each election should have notes', () => {
    for (const election of TELANGANA_ELECTION_HISTORY) {
      expect(election.notes).toBeDefined();
      expect(election.notes!.length).toBeGreaterThan(0);
    }
  });
});
