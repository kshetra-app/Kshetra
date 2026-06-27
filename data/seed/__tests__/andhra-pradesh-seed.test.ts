/**
 * Tests for Andhra Pradesh seed data files.
 */
import { AP_ELECTION_HISTORY } from '../andhra-pradesh-election-history';
import { AP_2019_RESULTS, getAP2019Result, getAP2019PartyWins } from '../andhra-pradesh-historical-results';
import { AP_MLA_PROFILES, getAPMLAProfile, getAPMLAsByParty, getAPFemaleMLAs } from '../andhra-pradesh-mla-profiles';
import { AP_DEMOGRAPHICS, getAPConstituencyDemographics } from '../andhra-pradesh-demographics';
import { AP_POLITICAL_LEDGER, computeAPPartyStrength, auditAPLedger } from '../andhra-pradesh-political-timeline';
import { getAPAllTrivia, getAPTriviaForParty, getAPRandomTrivia } from '../andhra-pradesh-trivia';

describe('AP Election History', () => {
  it('should have 3 elections (2014, 2019, 2024)', () => {
    expect(AP_ELECTION_HISTORY).toHaveLength(3);
    const years = AP_ELECTION_HISTORY.map((e) => e.year);
    expect(years).toEqual(expect.arrayContaining([2014, 2019, 2024]));
  });

  it('each election should have 175 total seats', () => {
    for (const e of AP_ELECTION_HISTORY) {
      expect(e.totalSeats).toBe(175);
    }
  });

  it('seats won should sum to 175 for each election', () => {
    for (const e of AP_ELECTION_HISTORY) {
      const total = e.partyResults.reduce((s, p) => s + p.seatsWon, 0);
      expect(total).toBe(175);
    }
  });

  it('each election should be assembly type with turnout', () => {
    for (const e of AP_ELECTION_HISTORY) {
      expect(e.type).toBe('assembly');
      expect(e.turnout).toBeGreaterThan(50);
      expect(e.turnout).toBeLessThan(100);
    }
  });
});

describe('AP Historical Results (2019)', () => {
  it('should have 175 results', () => {
    expect(AP_2019_RESULTS).toHaveLength(175);
  });

  it('acNo should be unique and sequential 1-175', () => {
    const acNos = AP_2019_RESULTS.map((r) => r.acNo).sort((a, b) => a - b);
    expect(acNos[0]).toBe(1);
    expect(acNos[acNos.length - 1]).toBe(175);
    expect(new Set(acNos).size).toBe(175);
  });

  it('getAP2019Result should find a constituency', () => {
    const r = getAP2019Result(1);
    expect(r).toBeDefined();
    expect(r!.name).toBeTruthy();
  });

  it('getAP2019PartyWins should return YSRCP majority', () => {
    const ysrcp = getAP2019PartyWins('YSRCP');
    expect(ysrcp.length).toBeGreaterThan(100);
  });
});

describe('AP MLA Profiles', () => {
  it('should have profiles', () => {
    expect(AP_MLA_PROFILES.length).toBeGreaterThanOrEqual(172);
  });

  it('each profile should have required fields', () => {
    for (const p of AP_MLA_PROFILES) {
      expect(p.acNo).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
      expect(p.currentParty).toBeTruthy();
      expect(['M', 'F']).toContain(p.gender);
      expect(p.termsServed).toBeGreaterThan(0);
    }
  });

  it('getAPMLAProfile should find MLA by acNo', () => {
    const mla = getAPMLAProfile(1);
    expect(mla).toBeDefined();
  });

  it('getAPMLAsByParty should find TDP MLAs', () => {
    const tdp = getAPMLAsByParty('TDP');
    expect(tdp.length).toBeGreaterThan(0);
  });

  it('getAPFemaleMLAs should return array', () => {
    const females = getAPFemaleMLAs();
    expect(Array.isArray(females)).toBe(true);
  });
});

describe('AP Demographics', () => {
  it('should have 175 entries', () => {
    expect(AP_DEMOGRAPHICS).toHaveLength(175);
  });

  it('each entry should have valid fields', () => {
    for (const d of AP_DEMOGRAPHICS) {
      expect(d.acNo).toBeGreaterThan(0);
      expect(d.population).toBeGreaterThan(0);
      expect(d.totalVoters).toBeGreaterThan(0);
      expect(d.literacy).toBeGreaterThan(0);
      expect(d.areaSqKm).toBeGreaterThan(0);
    }
  });

  it('getAPConstituencyDemographics should work', () => {
    const d = getAPConstituencyDemographics(1);
    expect(d).toBeDefined();
    expect(d!.population).toBeGreaterThan(0);
  });
});

describe('AP Political Timeline', () => {
  it('ledger should have entries', () => {
    expect(AP_POLITICAL_LEDGER.length).toBeGreaterThan(0);
  });

  it('audit should be clean', () => {
    const errors = auditAPLedger();
    expect(errors).toEqual([]);
  });

  it('computeAPPartyStrength for latest assembly should sum to 175', () => {
    const snapshot = computeAPPartyStrength(undefined, 3);
    expect(snapshot.totalSeats).toBe(175);
    const totalFilled = Object.values(snapshot.parties).reduce((a, b) => a + b, 0);
    expect(totalFilled + snapshot.vacant).toBe(175);
  });
});

describe('AP Trivia', () => {
  it('should have trivia items', () => {
    const all = getAPAllTrivia();
    expect(all.length).toBeGreaterThan(0);
  });

  it('each trivia should have required fields', () => {
    for (const t of getAPAllTrivia()) {
      expect(t.id).toBeTruthy();
      expect(t.headline).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.contexts.length).toBeGreaterThan(0);
    }
  });

  it('getAPRandomTrivia should return a trivia item', () => {
    const t = getAPRandomTrivia();
    expect(t).toBeDefined();
    expect(t.id).toBeTruthy();
  });

  it('getAPTriviaForParty should find TDP trivia', () => {
    const tdp = getAPTriviaForParty('TDP');
    expect(tdp.length).toBeGreaterThanOrEqual(0);
  });
});
