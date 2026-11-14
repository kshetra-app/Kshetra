import { getCivicMetricsEmptyState, getConfirmedMetricTotal } from '../lib/civicMetricsDisplay';

describe('civic metrics empty states', () => {
  it('keeps initial and in-progress requests in a loading state', () => {
    expect(getCivicMetricsEmptyState('idle')).toBe('loading');
    expect(getCivicMetricsEmptyState('loading')).toBe('loading');
  });

  it('distinguishes confirmed empty results from request failures', () => {
    expect(getCivicMetricsEmptyState('loaded')).toBe('empty');
    expect(getCivicMetricsEmptyState('error')).toBe('unavailable');
  });

  it('shows zero only when a successful response confirms that there are no records', () => {
    expect(getConfirmedMetricTotal('loaded', 0)).toBe(0);
    expect(getConfirmedMetricTotal('loaded', 12)).toBe(12);
    expect(getConfirmedMetricTotal('idle', 0)).toBeNull();
    expect(getConfirmedMetricTotal('loading', 0)).toBeNull();
    expect(getConfirmedMetricTotal('error', 0)).toBeNull();
    expect(getConfirmedMetricTotal('loaded', -1)).toBeNull();
    expect(getConfirmedMetricTotal('loaded', Number.POSITIVE_INFINITY)).toBeNull();
  });
});
