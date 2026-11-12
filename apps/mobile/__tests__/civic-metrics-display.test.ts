import { getCivicMetricsEmptyState } from '../lib/civicMetricsDisplay';

describe('civic metrics empty states', () => {
  it('keeps initial and in-progress requests in a loading state', () => {
    expect(getCivicMetricsEmptyState('idle')).toBe('loading');
    expect(getCivicMetricsEmptyState('loading')).toBe('loading');
  });

  it('distinguishes confirmed empty results from request failures', () => {
    expect(getCivicMetricsEmptyState('loaded')).toBe('empty');
    expect(getCivicMetricsEmptyState('error')).toBe('unavailable');
  });
});
