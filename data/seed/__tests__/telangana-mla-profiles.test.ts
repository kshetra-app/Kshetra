import {
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
  getMLAsByParty,
  getDefectedMLAs,
  getCurrentMLAProfiles,
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
  it('every MLA profile should link to a known constituency', () => {
    TELANGANA_MLA_PROFILES.forEach((profile) => {
      const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
      expect(constituency).toBeDefined();
      expect(profile.name).toBeTruthy();
    });
  });

  it('every current MLA profile party should match the sitting constituency data', () => {
    getCurrentMLAProfiles().forEach((profile) => {
      const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
      expect(constituency).toBeDefined();
      const expectedParty = constituency!.currentParty ?? constituency!.winner2023;
      expect(profile.party).toBe(expectedParty);
    });
  });

  it('official election names should match ECI names where provided for 2023 candidates', () => {
    TELANGANA_MLA_PROFILES.filter((profile) => profile.officialElectionName && !profile.isBypoll)
      .forEach((profile) => {
        const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === profile.acNo);
        expect(profile.officialElectionName).toBe(constituency!.winnerName2023);
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
  it('should reflect current seated MLA party counts and exclude the vacant Khairatabad seat', () => {
    const tally: Record<string, number> = {};
    getCurrentMLAProfiles().forEach((p) => {
      tally[p.party] = (tally[p.party] ?? 0) + 1;
    });
    // INC: 64 elected, 10 reported party changes, and two subsequent by-election results,
    // less the Khairatabad member who was disqualified and whose seat is vacant.
    expect(tally['INC']).toBe(75);
    // BRS: 39 elected less ten reported party changes and two by-election seat changes.
    expect(tally['BRS']).toBe(27);
    // BJP: 8
    expect(tally['BJP']).toBe(8);
    // AIMIM: 7
    expect(tally['AIMIM']).toBe(7);
    // CPI: 1
    expect(tally['CPI']).toBe(1);
    // One of 119 seats is vacant.
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    expect(total).toBe(118);
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

  it('getMLAsByParty should return seated members only', () => {
    expect(getMLAsByParty('INC').length).toBe(75);
    expect(getMLAsByParty('BRS').length).toBe(27);
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

  it('should not expose the disqualified Khairatabad MLA as a sitting member', () => {
    const khairatabad = getMLAProfile(60);
    expect(khairatabad?.isCurrentMember).toBe(false);
    expect(getCurrentMLAProfiles().some((profile) => profile.acNo === 60)).toBe(false);
  });

  it('getFemaleMLAs should return known female MLAs', () => {
    const females = getFemaleMLAs();
    expect(females.length).toBeGreaterThanOrEqual(7);
    const names = females.map((f) => f.name);
    expect(names).toContain('Kova Laxmi');
    expect(names).toContain('Seethakka');
    expect(names).toContain('Konda Surekha');
    expect(names).toContain('Sabitha Indra Reddy');
    expect(names).toContain('Chittem Parnika Reddy');
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
