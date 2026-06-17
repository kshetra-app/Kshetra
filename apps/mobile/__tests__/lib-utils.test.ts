/**
 * Node-safe unit tests for pure mobile lib utilities (no React Native runtime).
 * Component/screen tests require the jest-expo harness (see package.json).
 */
import {
  formatPopulation,
  calculateIdealPopPerSeat,
  projectSeats,
  calculateDeviation,
} from '../lib/delimitationTypes';
import {
  isValidIndianPhone,
  normalizePhone,
  canPerformAction,
  getKYCCompleteness,
  simpleContentHash,
  isHighSeverityAction,
  type CreatorKYCRecord,
  type KYCSubmission,
} from '../lib/contentAccountabilityTypes';

describe('delimitationTypes utilities', () => {
  describe('formatPopulation', () => {
    it('formats crores, lakhs, thousands and units', () => {
      expect(formatPopulation(35_003_674)).toBe('3.50 Cr');
      expect(formatPopulation(2_50_000)).toBe('2.50 L');
      expect(formatPopulation(4_500)).toBe('4.5K');
      expect(formatPopulation(750)).toBe('750');
    });
  });

  describe('seat math', () => {
    it('computes ideal population per seat', () => {
      expect(calculateIdealPopPerSeat(1_000_000, 10)).toBe(100_000);
      expect(calculateIdealPopPerSeat(1_000_000, 0)).toBe(0);
    });

    it('projects seats from population and ideal', () => {
      expect(projectSeats(1_000_000, 100_000)).toBe(10);
      expect(projectSeats(1_000_000, 0)).toBe(0);
    });

    it('computes deviation percentage from the ideal', () => {
      expect(calculateDeviation(110_000, 100_000)).toBeCloseTo(10);
      expect(calculateDeviation(90_000, 100_000)).toBeCloseTo(-10);
      expect(calculateDeviation(100_000, 0)).toBe(0);
    });
  });
});

describe('contentAccountabilityTypes utilities', () => {
  describe('isValidIndianPhone', () => {
    it('accepts valid 10-digit and 91-prefixed numbers', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('+91 98765 43210')).toBe(true);
      expect(isValidIndianPhone('919876543210')).toBe(true);
    });
    it('rejects invalid numbers', () => {
      expect(isValidIndianPhone('1234567890')).toBe(false); // starts < 6
      expect(isValidIndianPhone('98765')).toBe(false);
      expect(isValidIndianPhone('abcdefghij')).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('strips formatting and normalizes the 91 prefix', () => {
      expect(normalizePhone('+91 98765-43210')).toBe('919876543210');
      // 10-digit numbers are normalized to the 91-prefixed canonical form
      expect(normalizePhone('9876543210')).toBe('919876543210');
    });
  });

  describe('canPerformAction', () => {
    const verified = { status: 'verified' } as CreatorKYCRecord;
    it('blocks gated actions without verified KYC', () => {
      expect(canPerformAction(null, 'create_post')).toBe(false);
    });
    it('allows gated actions with verified KYC', () => {
      expect(canPerformAction(verified, 'create_post')).toBe(true);
    });
  });

  describe('getKYCCompleteness', () => {
    it('reports 100% for a complete submission', () => {
      const full = {
        fullLegalName: 'Asha Rao',
        phoneNumber: '9876543210',
        selfieUri: 'file://selfie.jpg',
        termsAccepted: true,
      } as unknown as KYCSubmission;
      expect(getKYCCompleteness(full).percent).toBe(100);
      expect(getKYCCompleteness(full).missing).toHaveLength(0);
    });

    it('lists missing fields for an incomplete submission', () => {
      const partial = {
        fullLegalName: '',
        phoneNumber: 'bad',
        selfieUri: '',
        termsAccepted: false,
      } as unknown as KYCSubmission;
      const result = getKYCCompleteness(partial);
      expect(result.percent).toBeLessThan(100);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('simpleContentHash', () => {
    it('is deterministic and differs for different inputs', () => {
      expect(simpleContentHash('hello')).toBe(simpleContentHash('hello'));
      expect(simpleContentHash('hello')).not.toBe(simpleContentHash('world'));
    });
  });

  describe('isHighSeverityAction', () => {
    it('returns a boolean for a known action', () => {
      expect(typeof isHighSeverityAction('create_post')).toBe('boolean');
    });
  });
});
