import { canCreatePage, canAccessLive } from '../lib/pageGating';

describe('Ticket 0.2: Role System & Gating', () => {
  describe('canCreatePage', () => {
    it('does not allow citizen accounts to create a Page', () => {
      expect(canCreatePage('citizen')).toBe(false);
    });

    it('allows an unverified aspirant to create a Page', () => {
      expect(canCreatePage('aspirant')).toBe(true);
    });

    it('allows politicians, parties, and journalists to create a Page', () => {
      expect(canCreatePage('politician')).toBe(true);
      expect(canCreatePage('party')).toBe(true);
      expect(canCreatePage('journalist')).toBe(true);
    });
  });

  describe('canAccessLive', () => {
    it('denies Live access to citizen accounts even if marked verified', () => {
      const result = canAccessLive('citizen', 'verified');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ineligible_role');
    });

    it('denies Live access to unverified aspirant accounts', () => {
      const result = canAccessLive('aspirant', 'unverified');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unverified');
    });

    it('denies Live access to pending aspirant accounts', () => {
      const result = canAccessLive('aspirant', 'pending');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unverified');
    });

    it('grants Live access to verified aspirants, politicians, parties, and journalists', () => {
      expect(canAccessLive('aspirant', 'verified').allowed).toBe(true);
      expect(canAccessLive('politician', 'verified').allowed).toBe(true);
      expect(canAccessLive('party', 'verified').allowed).toBe(true);
      expect(canAccessLive('journalist', 'verified').allowed).toBe(true);
    });
  });
});
