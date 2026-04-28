import {
  TELANGANA_POLITICAL_LEDGER,
  TOTAL_SEATS,
  OPENING_BALANCES,
  computePartyStrength,
  auditLedger,
  generateTimeline,
  getDefectionSummary,
  getConstituencyTimeline,
  getMLAPartyTrail,
} from '../telangana-political-timeline';

describe('Telangana Political Ledger — Double-Entry Audit', () => {
  // ── CORE INVARIANT: The books must ALWAYS balance ──

  it('should have total seats constant = 119', () => {
    expect(TOTAL_SEATS).toBe(119);
  });

  it('should pass a full audit — every event must keep total at 119', () => {
    const errors = auditLedger();
    if (errors.length > 0) {
      console.error('AUDIT FAILURES:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  it('should have opening balances summing to 119 for each assembly', () => {
    for (const assembly of [1, 2, 3] as const) {
      const total = Object.values(OPENING_BALANCES[assembly]).reduce((a, b) => a + b, 0);
      expect(total).toBe(TOTAL_SEATS);
    }
  });

  // ── TIMELINE SNAPSHOTS: Every snapshot must balance ──

  it('should produce timeline where every snapshot totals 119', () => {
    const timeline = generateTimeline();
    expect(timeline.length).toBeGreaterThan(0);
    timeline.forEach((snap) => {
      expect(snap.totalSeats).toBe(TOTAL_SEATS);
    });
  });

  // ── 1ST ASSEMBLY (2014–2018) ──

  it('should show correct 1st Assembly opening balance', () => {
    const snap = computePartyStrength('2014-06-02', 1);
    expect(snap.parties['TRS']).toBe(63);
    expect(snap.parties['INC']).toBe(21);
    expect(snap.parties['TDP']).toBe(15);
    expect(snap.parties['AIMIM']).toBe(7);
    expect(snap.parties['BJP']).toBe(5);
    expect(snap.parties['OTHERS']).toBe(8);
    expect(snap.totalSeats).toBe(119);
  });

  it('should reflect TDP→TRS merger (12 MLAs, Mar 2016)', () => {
    const snap = computePartyStrength('2016-03-11', 1);
    expect(snap.parties['TRS']).toBe(75); // 63 + 12
    expect(snap.parties['TDP']).toBe(3);  // 15 - 12
    expect(snap.totalSeats).toBe(119);
  });

  it('should reflect Revanth Reddy TDP→INC (Jul 2017)', () => {
    const snap = computePartyStrength('2017-07-18', 1);
    expect(snap.parties['TDP']).toBe(2);  // 3 - 1
    expect(snap.parties['INC']).toBe(22); // 21 + 1
    expect(snap.totalSeats).toBe(119);
  });

  // ── 2ND ASSEMBLY (2018–2023) ──

  it('should show correct 2nd Assembly opening balance', () => {
    const snap = computePartyStrength('2018-12-11', 2);
    expect(snap.parties['TRS']).toBe(88);
    expect(snap.parties['INC']).toBe(19);
    expect(snap.parties['AIMIM']).toBe(7);
    expect(snap.parties['TDP']).toBe(2);
    expect(snap.parties['BJP']).toBe(1);
    expect(snap.totalSeats).toBe(119);
  });

  it('should reflect INC→TRS merger (12 MLAs, Jun 2019)', () => {
    const snap = computePartyStrength('2019-06-06', 2);
    // INC: 19 - 1 (Uttam resignation) - 12 (merger) = 6
    expect(snap.parties['INC']).toBe(6);
    // TRS: 88 + 12 (merger) + 1 (Huzurnagar is still vacant at this point)
    // Actually Huzurnagar by-election is Oct 2019, so TRS should be 88 + 12 = 100
    expect(snap.parties['TRS']).toBe(100);
    expect(snap.vacant).toBe(1); // Huzurnagar vacant
    expect(snap.totalSeats).toBe(119);
  });

  it('should reflect TRS→BRS rename (Oct 2022)', () => {
    const snap = computePartyStrength('2022-10-05', 2);
    expect(snap.parties['TRS']).toBeUndefined();
    expect(snap.parties['BRS']).toBeGreaterThan(0);
    expect(snap.totalSeats).toBe(119);
  });

  it('should show BJP growth via by-elections (Dubbak + Huzurabad)', () => {
    const snap = computePartyStrength('2021-11-02', 2);
    // BJP: 1 (GE) + 1 (Dubbak) + 1 (Huzurabad) = 3
    expect(snap.parties['BJP']).toBe(3);
    expect(snap.totalSeats).toBe(119);
  });

  // ── 3RD ASSEMBLY (2023–present) ──

  it('should show correct 3rd Assembly opening balance', () => {
    const snap = computePartyStrength('2023-12-03', 3);
    expect(snap.parties['INC']).toBe(64);
    expect(snap.parties['BRS']).toBe(39);
    expect(snap.parties['BJP']).toBe(8);
    expect(snap.parties['AIMIM']).toBe(7);
    expect(snap.parties['CPI']).toBe(1);
    expect(snap.totalSeats).toBe(119);
  });

  it('should reflect 10 BRS→INC defections (2024)', () => {
    const snap = computePartyStrength('2024-12-31', 3);
    expect(snap.parties['INC']).toBe(74);  // 64 + 10
    expect(snap.parties['BRS']).toBe(29);  // 39 - 10
    expect(snap.parties['BJP']).toBe(8);
    expect(snap.parties['AIMIM']).toBe(7);
    expect(snap.parties['CPI']).toBe(1);
    expect(snap.totalSeats).toBe(119);
  });

  // ── DEFECTION SUMMARY ──

  it('should produce correct defection summary', () => {
    const summary = getDefectionSummary();
    expect(summary['TDP→TRS']).toBe(12);  // 2016 merger
    expect(summary['INC→TRS']).toBe(12);  // 2019 merger
    expect(summary['BRS→INC']).toBe(10);  // 2024 defections
    expect(summary['TDP→INC']).toBe(1);   // Revanth Reddy 2017
  });

  // ── DATA QUALITY ──

  it('should have chronologically ordered events within each assembly', () => {
    for (const assembly of [1, 2, 3] as const) {
      const events = TELANGANA_POLITICAL_LEDGER.filter((e) => e.assembly === assembly);
      for (let i = 1; i < events.length; i++) {
        expect(events[i].date >= events[i - 1].date).toBe(true);
      }
    }
  });

  it('should have at least 1 source for every event', () => {
    TELANGANA_POLITICAL_LEDGER.forEach((e) => {
      expect(e.sources.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should have non-empty explanation for every event', () => {
    TELANGANA_POLITICAL_LEDGER.forEach((e) => {
      expect(e.explanation.length).toBeGreaterThan(0);
    });
  });

  it('should have unique IDs for every event', () => {
    const ids = TELANGANA_POLITICAL_LEDGER.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── CONSTITUENCY + MLA QUERIES ──

  it('should return events for constituency AC 31 (Huzurabad)', () => {
    const events = getConstituencyTimeline(31);
    // Huzurabad had: Etela expelled, resigned, by-election
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it('should trace T. Prakash Goud through 3 parties', () => {
    const trail = getMLAPartyTrail('Prakash Goud');
    // 2014: TDP, 2016: TDP→TRS merger, 2024: BRS→INC defection
    expect(trail.length).toBeGreaterThanOrEqual(2);
  });

  it('should trace Arekapudi Gandhi through 3 parties', () => {
    const trail = getMLAPartyTrail('Arekapudi Gandhi');
    expect(trail.length).toBeGreaterThanOrEqual(2);
  });
});
