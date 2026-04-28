import {
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
  getMLAsByParty,
  getDefectedMLAs,
  getFemaleMLAs,
  getVeteranMLAs,
} from '../telangana-mla-profiles';
import { TELANGANA_CONSTITUENCIES } from '../telangana-constituencies';

describe('MLA Profiles — Coverage', () => {
  it('should have exactly 119 profiles', () => {
    expect(TELANGANA_MLA_PROFILES.length).toBe(119);
  });

  it('should have unique AC numbers 1–119', () => {
    const acNos = TELANGANA_MLA_PROFILES.map((p) => p.acNo).sort((a, b) => a - b);
    expect(acNos).toEqual(Array.from({ length: 119 }, (_, i) => i + 1));
  });

  it('should have non-empty name and party for every profile', () => {
    TELANGANA_MLA_PROFILES.forEach((p) => {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.party.length).toBeGreaterThan(0);
      expect(['M', 'F']).toContain(p.gender);
      expect(p.terms).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('MLA Profiles — Consistency with Constituencies', () => {
  it('every MLA name should match the constituency winner name', () => {
    TELANGANA_MLA_PROFILES.forEach((profile) => {
      const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
      expect(constituency).toBeDefined();
      expect(profile.name).toBe(constituency!.winnerName2023);
    });
  });

  it('every MLA current party should match constituency data', () => {
    TELANGANA_MLA_PROFILES.forEach((profile) => {
      const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
      expect(constituency).toBeDefined();
      const expectedParty = constituency!.currentParty ?? constituency!.winner2023;
      expect(profile.party).toBe(expectedParty);
    });
  });

  it('defected MLAs should have electedParty matching constituency winner2023', () => {
    const defected = getDefectedMLAs();
    defected.forEach((profile) => {
      const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
      expect(constituency).toBeDefined();
      expect(profile.electedParty).toBe(constituency!.winner2023);
      expect(constituency!.currentParty).toBeDefined();
      expect(profile.party).toBe(constituency!.currentParty);
    });
  });
});

describe('MLA Profiles — Party tallies', () => {
  it('should match 2023 post-defection party strengths', () => {
    const tally: Record<string, number> = {};
    TELANGANA_MLA_PROFILES.forEach((p) => {
      tally[p.party] = (tally[p.party] ?? 0) + 1;
    });
    // INC: 64 elected + 10 defections = 74
    expect(tally['INC']).toBe(74);
    // BRS: 39 elected - 10 defections = 29
    expect(tally['BRS']).toBe(29);
    // BJP: 8
    expect(tally['BJP']).toBe(8);
    // AIMIM: 7
    expect(tally['AIMIM']).toBe(7);
    // CPI: 1
    expect(tally['CPI']).toBe(1);
    // Total: 119
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    expect(total).toBe(119);
  });
});

describe('MLA Profiles — Utility functions', () => {
  it('getMLAProfile should return correct MLA by AC number', () => {
    const kcr = getMLAProfile(42);
    expect(kcr).toBeDefined();
    expect(kcr!.name).toBe('K. Chandrashekar Rao');
    expect(kcr!.party).toBe('BRS');
    expect(kcr!.terms).toBe(3);
  });

  it('getMLAProfile should return undefined for invalid AC number', () => {
    expect(getMLAProfile(0)).toBeUndefined();
    expect(getMLAProfile(120)).toBeUndefined();
  });

  it('getMLAsByParty should return correct counts', () => {
    expect(getMLAsByParty('INC').length).toBe(74);
    expect(getMLAsByParty('BRS').length).toBe(29);
    expect(getMLAsByParty('BJP').length).toBe(8);
    expect(getMLAsByParty('AIMIM').length).toBe(7);
    expect(getMLAsByParty('CPI').length).toBe(1);
  });

  it('getDefectedMLAs should return 10 BRS→INC defectors', () => {
    const defected = getDefectedMLAs();
    expect(defected.length).toBe(10);
    defected.forEach((p) => {
      expect(p.electedParty).toBe('BRS');
      expect(p.party).toBe('INC');
    });
  });

  it('getFemaleMLAs should return known female MLAs', () => {
    const females = getFemaleMLAs();
    expect(females.length).toBeGreaterThanOrEqual(8);
    const names = females.map((f) => f.name);
    expect(names).toContain('Kova Laxmi');
    expect(names).toContain('Seethakka');
    expect(names).toContain('Konda Surekha');
    expect(names).toContain('Sabitha Indra Reddy');
    expect(names).toContain('Chittem Parnika Reddy');
    expect(names).toContain('G. Lasya Nanditha');
  });

  it('getVeteranMLAs should include KCR, KTR, Harish Rao', () => {
    const veterans = getVeteranMLAs();
    expect(veterans.length).toBeGreaterThanOrEqual(3);
    const names = veterans.map((v) => v.name);
    expect(names).toContain('K. Chandrashekar Rao');
    expect(names).toContain('K. T. Rama Rao');
    expect(names).toContain('Thanneeru Harish Rao');
  });
});

describe('MLA Profiles — Key figures', () => {
  it('Revanth Reddy (CM) at AC 72', () => {
    const cm = getMLAProfile(72);
    expect(cm!.name).toBe('Anumula Revanth Reddy');
    expect(cm!.party).toBe('INC');
    expect(cm!.terms).toBe(2);
  });

  it('Bhatti Vikramarka (Deputy CM) at AC 114', () => {
    const dcm = getMLAProfile(114);
    expect(dcm!.name).toBe('Mallu Bhatti Vikramarka');
    expect(dcm!.party).toBe('INC');
    expect(dcm!.terms).toBe(3);
  });

  it('KTR at AC 29 Sircilla', () => {
    const ktr = getMLAProfile(29);
    expect(ktr!.name).toBe('K. T. Rama Rao');
    expect(ktr!.party).toBe('BRS');
    expect(ktr!.terms).toBe(3);
  });

  it('Akbaruddin Owaisi at AC 67', () => {
    const owaisi = getMLAProfile(67);
    expect(owaisi!.name).toBe('Akbaruddin Owaisi');
    expect(owaisi!.party).toBe('AIMIM');
    expect(owaisi!.terms).toBe(3);
  });

  it('T. Raja Singh (BJP) at AC 65 Goshamahal', () => {
    const raja = getMLAProfile(65);
    expect(raja!.name).toBe('T. Raja Singh');
    expect(raja!.party).toBe('BJP');
    expect(raja!.terms).toBe(2);
  });
});
