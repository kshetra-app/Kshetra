/**
 * Tests for Maharashtra seed data files.
 */
import { MH_ELECTION_HISTORY, getMHElectionByYear, getMHPartyTrend } from '../maharashtra-election-history';
import { MAHARASHTRA_2019_RESULTS, getMH2019Result, getMH2019ResultsByParty } from '../maharashtra-historical-results';
import { MH_MLA_PROFILES, getMHMLAProfile, getMHMLAsByParty, getMHFemaleMLAs } from '../maharashtra-mla-profiles';
import { MH_DEMOGRAPHICS, getMHConstituencyDemographics } from '../maharashtra-demographics';
import { MH_POLITICAL_LEDGER, computeMHPartyStrength, auditMHLedger } from '../maharashtra-political-timeline';
import { getMHAllTrivia, getMHTriviaForParty, getMHRandomTrivia, getMHTriviaForElection } from '../maharashtra-trivia';

describe('MH Election History', () => {
  it('should have 4 elections (2009, 2014, 2019, 2024)', () => {
    expect(MH_ELECTION_HISTORY).toHaveLength(4);
    const years = MH_ELECTION_HISTORY.map((e) => e.year);
    expect(years).toEqual(expect.arrayContaining([2009, 2014, 2019, 2024]));
  });

  it('each election should have 288 total seats', () => {
    for (const e of MH_ELECTION_HISTORY) {
      expect(e.totalSeats).toBe(288);
    }
  });

  it('seats won should sum to 288 for each election', () => {
    for (const e of MH_ELECTION_HISTORY) {
      const total = e.partyResults.reduce((s, p) => s + p.seatsWon, 0);
      expect(total).toBe(288);
    }
  });

  it('2024: BJP should have won 132 seats', () => {
    const e2024 = getMHElectionByYear(2024)!;
    const bjp = e2024.partyResults.find((p) => p.party === 'BJP')!;
    expect(bjp.seatsWon).toBe(132);
  });

  it('getMHPartyTrend should track BJP across elections', () => {
    const trend = getMHPartyTrend('BJP');
    expect(trend).toHaveLength(4);
    expect(trend[0].year).toBe(2009);
  });

  it('each election should have valid turnout', () => {
    for (const e of MH_ELECTION_HISTORY) {
      expect(e.turnout).toBeGreaterThan(50);
      expect(e.turnout).toBeLessThan(100);
    }
  });
});

describe('MH Historical Results (2019)', () => {
  it('should have 288 results', () => {
    expect(MAHARASHTRA_2019_RESULTS).toHaveLength(288);
  });

  it('acNo should be unique 1-288', () => {
    const acNos = MAHARASHTRA_2019_RESULTS.map((r) => r.acNo).sort((a, b) => a - b);
    expect(acNos[0]).toBe(1);
    expect(acNos[acNos.length - 1]).toBe(288);
    expect(new Set(acNos).size).toBe(288);
  });

  it('getMH2019Result should find a constituency', () => {
    const r = getMH2019Result(170);
    expect(r).toBeDefined();
    expect(r!.winner).toContain('Fadnavis');
  });

  it('getMH2019ResultsByParty should return BJP seats', () => {
    const bjp = getMH2019ResultsByParty('BJP');
    expect(bjp.length).toBeGreaterThan(50);
  });
});

describe('MH MLA Profiles', () => {
  it('should have 288 profiles', () => {
    expect(MH_MLA_PROFILES).toHaveLength(288);
  });

  it('each profile should have required fields', () => {
    for (const p of MH_MLA_PROFILES) {
      expect(p.acNo).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
      expect(p.party).toBeTruthy();
      expect(['M', 'F']).toContain(p.gender);
      expect(p.terms).toBeGreaterThan(0);
    }
  });

  it('getMHMLAProfile should find Fadnavis', () => {
    const mla = getMHMLAProfile(170);
    expect(mla).toBeDefined();
    expect(mla!.name).toContain('Fadnavis');
  });

  it('getMHMLAsByParty should find BJP MLAs', () => {
    const bjp = getMHMLAsByParty('BJP');
    expect(bjp.length).toBeGreaterThan(0);
  });

  it('getMHFemaleMLAs should return array', () => {
    const females = getMHFemaleMLAs();
    expect(Array.isArray(females)).toBe(true);
  });
});

describe('MH Demographics', () => {
  it('should have 288 entries', () => {
    expect(MH_DEMOGRAPHICS).toHaveLength(288);
  });

  it('each entry should have valid fields', () => {
    for (const d of MH_DEMOGRAPHICS) {
      expect(d.acNo).toBeGreaterThan(0);
      expect(d.population).toBeGreaterThan(0);
      expect(d.totalVoters).toBeGreaterThan(0);
      expect(d.literacy).toBeGreaterThan(0);
      expect(d.areaSqKm).toBeGreaterThan(0);
    }
  });

  it('getMHConstituencyDemographics should work', () => {
    const d = getMHConstituencyDemographics(1);
    expect(d).toBeDefined();
    expect(d!.population).toBeGreaterThan(0);
  });
});

describe('MH Political Timeline', () => {
  it('ledger should have entries', () => {
    expect(MH_POLITICAL_LEDGER.length).toBeGreaterThan(0);
  });

  it('audit should be clean', () => {
    const errors = auditMHLedger();
    expect(errors).toEqual([]);
  });

  it('computeMHPartyStrength for latest assembly should sum to 288', () => {
    const snapshot = computeMHPartyStrength(undefined, 2);
    expect(snapshot.totalSeats).toBe(288);
    const totalFilled = Object.values(snapshot.parties).reduce((a, b) => a + b, 0);
    expect(totalFilled + snapshot.vacant).toBe(288);
  });
});

describe('MH Trivia', () => {
  it('should have trivia items (curated + derived)', () => {
    const all = getMHAllTrivia();
    expect(all.length).toBeGreaterThan(10);
  });

  it('each trivia should have required fields', () => {
    for (const t of getMHAllTrivia()) {
      expect(t.id).toBeTruthy();
      expect(t.headline).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.contexts.length).toBeGreaterThan(0);
    }
  });

  it('getMHRandomTrivia should return a trivia item', () => {
    const t = getMHRandomTrivia();
    expect(t).toBeDefined();
    expect(t.id).toBeTruthy();
  });

  it('getMHTriviaForParty should find BJP trivia', () => {
    const bjp = getMHTriviaForParty('BJP');
    expect(bjp.length).toBeGreaterThan(0);
  });

  it('getMHTriviaForElection(2024) should find items', () => {
    const e2024 = getMHTriviaForElection(2024);
    expect(e2024.length).toBeGreaterThan(0);
  });
});
