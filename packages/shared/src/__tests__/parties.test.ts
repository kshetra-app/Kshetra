import { PARTY_CONFIG, getPartyColor, getPartyName } from '../constants/parties';
import type { PartyCode } from '../types/constituency';

describe('Party Configuration', () => {
  describe('PARTY_CONFIG', () => {
    it('should have entries for all defined party codes', () => {
      const expectedParties: PartyCode[] = [
        'BJP', 'INC', 'BRS', 'TDP', 'AIMIM', 'YSRCP', 'AAP', 'DMK', 'AITC',
        'CPI', 'CPIM', 'NCP', 'SHS', 'JDU', 'RJD', 'BSP', 'SP',
        'NOTA', 'IND', 'OTH',
      ];
      expectedParties.forEach((code) => {
        expect(PARTY_CONFIG[code]).toBeDefined();
      });
    });

    it('should have valid color hex codes for every party', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(PARTY_CONFIG).forEach((party) => {
        expect(party.color).toMatch(hexColorRegex);
        expect(party.secondaryColor).toMatch(hexColorRegex);
      });
    });

    it('should have non-empty name and shortName for every party', () => {
      Object.values(PARTY_CONFIG).forEach((party) => {
        expect(party.name.length).toBeGreaterThan(0);
        expect(party.shortName.length).toBeGreaterThan(0);
        expect(party.code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPartyColor', () => {
    it('should return correct color for known parties', () => {
      expect(getPartyColor('BJP')).toBe('#FF6B00');
      expect(getPartyColor('INC')).toBe('#19AAED');
      expect(getPartyColor('BRS')).toBe('#E91E7B');
    });

    it('should return fallback color for unknown party codes', () => {
      expect(getPartyColor('UNKNOWN' as PartyCode)).toBe('#666666');
    });
  });

  describe('getPartyName', () => {
    it('should return short name for known parties', () => {
      expect(getPartyName('BJP')).toBe('BJP');
      expect(getPartyName('INC')).toBe('Congress');
      expect(getPartyName('AITC')).toBe('TMC');
    });

    it('should return the code itself for unknown party codes', () => {
      expect(getPartyName('UNKNOWN' as PartyCode)).toBe('UNKNOWN');
    });
  });
});
