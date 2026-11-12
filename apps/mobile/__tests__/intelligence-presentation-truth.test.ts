import { formatIntelligenceDirectoryCount } from '../lib/intelligencePresentation';

describe('intelligence live count presentation', () => {
  it.each(['LOADING', 'UNAVAILABLE', 'NOT_APPLICABLE'] as const)(
    'does not present a failed or pending lookup as a real zero (%s)',
    (status) => {
      expect(formatIntelligenceDirectoryCount(0, status, true)).toBe('—');
    },
  );

  it('shows zero after the live directory confirms it has no records', () => {
    expect(formatIntelligenceDirectoryCount(0, 'DATABASE_EMPTY', true)).toBe('0');
  });

  it('shows confirmed counts and preserves the stale-data warning state', () => {
    expect(formatIntelligenceDirectoryCount(4, 'DATABASE_RECORDS', true)).toBe('4');
    expect(formatIntelligenceDirectoryCount(4, 'STALE_DATABASE_RECORDS', true)).toBe('4');
  });

  it('keeps local reference counts available outside live mode', () => {
    expect(formatIntelligenceDirectoryCount(4, 'LOCAL_REFERENCE', false)).toBe('4');
  });
});
