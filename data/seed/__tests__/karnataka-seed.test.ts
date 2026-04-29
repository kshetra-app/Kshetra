/**
 * Tests for Karnataka seed data files.
 */
import { KA_ELECTION_HISTORY, getKAElectionByYear, getKAPartyTrend } from '../karnataka-election-history';
import { KARNATAKA_2018_RESULTS, getKA2018Result, getKA2018ResultsByParty } from '../karnataka-historical-results';
import { KA_MLA_PROFILES, getKAMLAProfile, getKAMLAsByParty, getKAFemaleMLAs } from '../karnataka-mla-profiles';
import { KA_DEMOGRAPHICS, getKAConstituencyDemographics } from '../karnataka-demographics';
import { KA_POLITICAL_LEDGER, computeKAPartyStrength, auditKALedger } from '../karnataka-political-timeline';
import { getKAAllTrivia, getKATriviaForParty, getKARandomTrivia, getKATriviaForElection } from '../karnataka-trivia';

describe('KA Election History', () => {
  it('should have 4 elections (2008, 2013, 2018, 2023)', () => {
    expect(KA_ELECTION_HISTORY).toHaveLength(4);
    const years = KA_ELECTION_HISTORY.map((e) => e.year);
    expect(years).toEqual(expect.arrayContaining([2008, 2013, 2018, 2023]));
  });

  it('each election should have 224 total seats', () => {
    for (const e of KA_ELECTION_HISTORY) {
      expect(e.totalSeats).toBe(224);
    }
  });

  it('seats won should sum to 224 for each election', () => {
    for (const e of KA_ELECTION_HISTORY) {
      const total = e.partyResults.reduce((s, p) => s + p.seatsWon, 0);
      expect(total).toBe(224);
    }
  });

  it('2023: INC should have won 135 seats', () => {
    const e2023 = getKAElectionByYear(2023)!;
    const inc = e2023.partyResults.find((p) => p.party === 'INC')!;
    expect(inc.seatsWon).toBe(135);
  });

  it('2018: BJP should have won 104 seats', () => {
    const e2018 = getKAElectionByYear(2018)!;
    const bjp = e2018.partyResults.find((p) => p.party === 'BJP')!;
    expect(bjp.seatsWon).toBe(104);
  });

  it('getKAPartyTrend should track BJP across elections', () => {
    const trend = getKAPartyTrend('BJP');
    expect(trend).toHaveLength(4);
    expect(trend[0].year).toBe(2008);
  });

  it('each election should have valid turnout', () => {
    for (const e of KA_ELECTION_HISTORY) {
      expect(e.turnout).toBeGreaterThan(50);
      expect(e.turnout).toBeLessThan(100);
    }
  });
});

describe('KA Historical Results (2018)', () => {
  it('should have 224 results', () => {
    expect(KARNATAKA_2018_RESULTS).toHaveLength(224);
  });

  it('acNo should be unique and sequential 1-224', () => {
    const acNos = KARNATAKA_2018_RESULTS.map((r) => r.acNo).sort((a, b) => a - b);
    expect(acNos[0]).toBe(1);
    expect(acNos[acNos.length - 1]).toBe(224);
    expect(new Set(acNos).size).toBe(224);
  });

  it('getKA2018Result should find a constituency', () => {
    const r = getKA2018Result(1);
    expect(r).toBeDefined();
    expect(r!.name).toBeTruthy();
  });

  it('getKA2018ResultsByParty should return BJP seats', () => {
    const bjp = getKA2018ResultsByParty('BJP');
    expect(bjp.length).toBeGreaterThan(50);
  });
});

describe('KA MLA Profiles', () => {
  it('should have 224 profiles', () => {
    expect(KA_MLA_PROFILES).toHaveLength(224);
  });

  it('each profile should have required fields', () => {
    for (const p of KA_MLA_PROFILES) {
      expect(p.acNo).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
      expect(p.party).toBeTruthy();
      expect(['M', 'F']).toContain(p.gender);
      expect(p.terms).toBeGreaterThan(0);
    }
  });

  it('getKAMLAProfile should find MLA by acNo', () => {
    const mla = getKAMLAProfile(1);
    expect(mla).toBeDefined();
  });

  it('getKAMLAsByParty should find INC MLAs', () => {
    const inc = getKAMLAsByParty('INC');
    expect(inc.length).toBeGreaterThan(0);
  });

  it('getKAFemaleMLAs should return array', () => {
    const females = getKAFemaleMLAs();
    expect(Array.isArray(females)).toBe(true);
  });
});

describe('KA Demographics', () => {
  it('should have 224 entries', () => {
    expect(KA_DEMOGRAPHICS).toHaveLength(224);
  });

  it('each entry should have valid fields', () => {
    for (const d of KA_DEMOGRAPHICS) {
      expect(d.acNo).toBeGreaterThan(0);
      expect(d.population).toBeGreaterThan(0);
      expect(d.totalVoters).toBeGreaterThan(0);
      expect(d.literacy).toBeGreaterThan(0);
      expect(d.areaSqKm).toBeGreaterThan(0);
    }
  });

  it('getKAConstituencyDemographics should work', () => {
    const d = getKAConstituencyDemographics(1);
    expect(d).toBeDefined();
    expect(d!.population).toBeGreaterThan(0);
  });
});

describe('KA Political Timeline', () => {
  it('ledger should have entries', () => {
    expect(KA_POLITICAL_LEDGER.length).toBeGreaterThan(0);
  });

  it('audit should be clean', () => {
    const errors = auditKALedger();
    expect(errors).toEqual([]);
  });

  it('computeKAPartyStrength for latest assembly should sum to 224', () => {
    const snapshot = computeKAPartyStrength(undefined, 2);
    expect(snapshot.totalSeats).toBe(224);
    const totalFilled = Object.values(snapshot.parties).reduce((a, b) => a + b, 0);
    expect(totalFilled + snapshot.vacant).toBe(224);
  });
});

describe('KA Trivia', () => {
  it('should have trivia items (curated + derived)', () => {
    const all = getKAAllTrivia();
    expect(all.length).toBeGreaterThan(10);
  });

  it('each trivia should have required fields', () => {
    for (const t of getKAAllTrivia()) {
      expect(t.id).toBeTruthy();
      expect(t.headline).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.contexts.length).toBeGreaterThan(0);
    }
  });

  it('getKARandomTrivia should return a trivia item', () => {
    const t = getKARandomTrivia();
    expect(t).toBeDefined();
    expect(t.id).toBeTruthy();
  });

  it('getKATriviaForParty should find BJP trivia', () => {
    const bjp = getKATriviaForParty('BJP');
    expect(bjp.length).toBeGreaterThan(0);
  });

  it('getKATriviaForElection(2023) should find items', () => {
    const e2023 = getKATriviaForElection(2023);
    expect(e2023.length).toBeGreaterThan(0);
  });
});
