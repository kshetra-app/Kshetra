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
    const validParties = ['INC', 'BRS', 'BJP', 'AIMIM', 'TDP', 'CPI', 'CPM', 'IND', 'AIFB', 'MBT'];
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(validParties).toContain(c.winner2023);
      expect(validParties).toContain(c.runnerUp2023);
    });
  });

  it('should have non-negative vote counts and margins', () => {
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(c.winnerVotes2023).toBeGreaterThanOrEqual(0);
      expect(c.margin2023).toBeGreaterThanOrEqual(0);
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

  it('should match verified 2023 party tally (INC:64, BRS:39, BJP:8, AIMIM:7, CPI:1)', () => {
    const tally = (party: string) =>
      TELANGANA_CONSTITUENCIES.filter((c) => c.winner2023 === party).length;
    expect(tally('INC')).toBe(64);
    expect(tally('BRS')).toBe(39);
    expect(tally('BJP')).toBe(8);
    expect(tally('AIMIM')).toBe(7);
    expect(tally('CPI')).toBe(1);
  });

  it('should contain AIMIM wins in Hyderabad Old City', () => {
    const aimimSeats = TELANGANA_CONSTITUENCIES.filter(
      (c) => c.winner2023 === 'AIMIM',
    );
    expect(aimimSeats.length).toBe(7);
    aimimSeats.forEach((c) => {
      expect(c.district).toBe('Hyderabad');
    });
  });

  it('should track ten reported BRS→INC affiliations separately from by-elections', () => {
    const defections = TELANGANA_CONSTITUENCIES.filter(
      (c) => c.currentParty && c.currentParty !== c.winner2023 && !c.byElection,
    );
    expect(defections.length).toBe(10);
    defections.forEach((c) => {
      expect(c.winner2023).toBe('BRS');
      expect(c.currentParty).toBe('INC');
    });
  });

  it('should distinguish by-election winners and the Khairatabad vacancy from 2023 results', () => {
    const khairatabad = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === 60)!;
    const jubileeHills = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === 61)!;
    const secunderabadCantt = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === 71)!;

    expect(khairatabad.winnerName2023).toBe('Danam Nagender');
    expect(khairatabad.officeholderStatus).toBe('VACANT');
    expect(jubileeHills.winnerName2023).toBe('Maganti Gopinath');
    expect(jubileeHills.currentMemberName).toBe('Naveen Yadav V');
    expect(jubileeHills.byElection?.year).toBe(2025);
    expect(secunderabadCantt.winnerName2023).toBe('G. Lasya Nanditha');
    expect(secunderabadCantt.currentMemberName).toBe('Sri Ganesh Narayanan');
    expect(secunderabadCantt.byElection?.year).toBe(2024);
  });

  it('should match ECI-verified Narayanpet winner and runner-up results', () => {
    const narayanpet = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === 73)!;
    expect(narayanpet.winnerName2023).toBe('Chittem Parnika Reddy');
    expect(narayanpet.winnerVotes2023).toBe(84708);
    expect(narayanpet.runnerUpName2023).toBe('S. Rajender Reddy');
    expect(narayanpet.margin2023).toBe(7951);
  });

  it('should have a valid localName in Telugu script for all constituencies', () => {
    TELANGANA_CONSTITUENCIES.forEach((c) => {
      expect(c.localName).toBeDefined();
      expect(c.localName?.length).toBeGreaterThan(0);
      expect(c.localName).toMatch(/^[\u0c00-\u0c7f\s.]+$/);
    });
  });
});
