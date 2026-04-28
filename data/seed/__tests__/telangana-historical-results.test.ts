import {
  TELANGANA_2014_RESULTS,
  TELANGANA_2018_RESULTS,
  getConstituencyHistory,
  isPartyStronghold,
  getPartyTally,
  getSwingConstituencies,
} from '../telangana-historical-results';

describe('Telangana Historical Results — 2014', () => {
  it('should have exactly 119 results', () => {
    expect(TELANGANA_2014_RESULTS.length).toBe(119);
  });

  it('should have unique AC numbers 1–119', () => {
    const acNos = TELANGANA_2014_RESULTS.map((r) => r.acNo).sort((a, b) => a - b);
    expect(acNos).toEqual(Array.from({ length: 119 }, (_, i) => i + 1));
  });

  it('should have non-empty winner and party for every entry', () => {
    TELANGANA_2014_RESULTS.forEach((r) => {
      expect(r.winner.length).toBeGreaterThan(0);
      expect(r.party.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    });
  });

  it('should match known party tally: TRS 63, INC 21, TDP 15, AIMIM 7, BJP 5', () => {
    const tally = getPartyTally(2014);
    expect(tally['TRS']).toBe(63);
    expect(tally['INC']).toBe(21);
    expect(tally['TDP']).toBe(15);
    expect(tally['AIMIM']).toBe(7);
    expect(tally['BJP']).toBe(5);
  });

  it('should have BSP 2, YSRCP 3, CPI 1, CPM 1, IND 1', () => {
    const tally = getPartyTally(2014);
    expect(tally['BSP']).toBe(2);
    expect(tally['YSRCP']).toBe(3);
    expect(tally['CPI']).toBe(1);
    expect(tally['CPM']).toBe(1);
    expect(tally['IND']).toBe(1);
  });

  it('total seats should equal 119', () => {
    const tally = getPartyTally(2014);
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    expect(total).toBe(119);
  });

  it('should have KCR winning Gajwel (AC 42)', () => {
    const gajwel = TELANGANA_2014_RESULTS.find((r) => r.acNo === 42);
    expect(gajwel?.winner).toBe('K. Chandrashekar Rao');
    expect(gajwel?.party).toBe('TRS');
  });

  it('should have Revanth Reddy winning Kodangal (AC 72) on TDP', () => {
    const kodangal = TELANGANA_2014_RESULTS.find((r) => r.acNo === 72);
    expect(kodangal?.winner).toContain('Revanth Reddy');
    expect(kodangal?.party).toBe('TDP');
  });

  it('should have Akbaruddin Owaisi winning Chandrayangutta (AC 67)', () => {
    const ac67 = TELANGANA_2014_RESULTS.find((r) => r.acNo === 67);
    expect(ac67?.winner).toBe('Akbaruddin Owaisi');
    expect(ac67?.party).toBe('AIMIM');
  });
});

describe('Telangana Historical Results — 2018', () => {
  it('should have exactly 119 results', () => {
    expect(TELANGANA_2018_RESULTS.length).toBe(119);
  });

  it('should have unique AC numbers 1–119', () => {
    const acNos = TELANGANA_2018_RESULTS.map((r) => r.acNo).sort((a, b) => a - b);
    expect(acNos).toEqual(Array.from({ length: 119 }, (_, i) => i + 1));
  });

  it('should have non-empty winner and party for every entry', () => {
    TELANGANA_2018_RESULTS.forEach((r) => {
      expect(r.winner.length).toBeGreaterThan(0);
      expect(r.party.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    });
  });

  it('should match known party tally: TRS 88, INC 19, AIMIM 7, TDP 2, BJP 1', () => {
    const tally = getPartyTally(2018);
    expect(tally['TRS']).toBe(88);
    expect(tally['INC']).toBe(19);
    expect(tally['AIMIM']).toBe(7);
    expect(tally['TDP']).toBe(2);
    expect(tally['BJP']).toBe(1);
  });

  it('should have AIFB 1, IND 1', () => {
    const tally = getPartyTally(2018);
    expect(tally['AIFB']).toBe(1);
    expect(tally['IND']).toBe(1);
  });

  it('total seats should equal 119', () => {
    const tally = getPartyTally(2018);
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    expect(total).toBe(119);
  });

  it('should have KCR winning Gajwel (AC 42)', () => {
    const gajwel = TELANGANA_2018_RESULTS.find((r) => r.acNo === 42);
    expect(gajwel?.winner).toBe('K. Chandrashekar Rao');
    expect(gajwel?.party).toBe('TRS');
  });

  it('should have TRS winning Kodangal (AC 72) — Revanth lost this time', () => {
    const kodangal = TELANGANA_2018_RESULTS.find((r) => r.acNo === 72);
    expect(kodangal?.party).toBe('TRS');
  });

  it('should have Goshamahal (AC 65) as BJPs only Hyderabad seat', () => {
    const hyd = TELANGANA_2018_RESULTS.filter(
      (r) => r.acNo >= 57 && r.acNo <= 71 && r.party === 'BJP',
    );
    expect(hyd.length).toBe(1);
    expect(hyd[0].acNo).toBe(65);
  });
});

describe('Cross-election utilities', () => {
  it('should return history for a constituency', () => {
    const hist = getConstituencyHistory(42);
    expect(hist.ac2014?.winner).toBe('K. Chandrashekar Rao');
    expect(hist.ac2018?.winner).toBe('K. Chandrashekar Rao');
  });

  it('should identify AIMIM strongholds (all 7 Old City seats)', () => {
    const aimimAcNos = [58, 63, 64, 66, 67, 68, 69];
    aimimAcNos.forEach((acNo) => {
      // AIMIM won in 2014 and 2018, need to check with normalize
      const h2014 = TELANGANA_2014_RESULTS.find((r) => r.acNo === acNo);
      const h2018 = TELANGANA_2018_RESULTS.find((r) => r.acNo === acNo);
      expect(h2014?.party).toBe('AIMIM');
      expect(h2018?.party).toBe('AIMIM');
    });
  });

  it('should detect 2014→2018 swing constituencies', () => {
    const swings = getSwingConstituencies(2014, 2018);
    expect(swings.length).toBeGreaterThan(0);
    // Kodangal swung from TDP to TRS
    const kodangal = swings.find((s) => s.acNo === 72);
    expect(kodangal).toBeDefined();
    expect(kodangal?.fromParty).toBe('TDP');
    expect(kodangal?.toParty).toBe('TRS');
  });

  it('should detect that Sircilla (AC 29) is a TRS/BRS stronghold', () => {
    const h2014 = TELANGANA_2014_RESULTS.find((r) => r.acNo === 29);
    const h2018 = TELANGANA_2018_RESULTS.find((r) => r.acNo === 29);
    expect(h2014?.party).toBe('TRS');
    expect(h2018?.party).toBe('TRS');
    expect(h2014?.winner).toBe('K. T. Rama Rao');
    expect(h2018?.winner).toBe('K. T. Rama Rao');
  });
});
