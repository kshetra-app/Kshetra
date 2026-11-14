export type CivicMetricsLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type CivicMetricsEmptyState = 'loading' | 'unavailable' | 'empty';

/** Keeps a confirmed empty response distinct from a failed data request. */
export function getCivicMetricsEmptyState(
  status: CivicMetricsLoadStatus,
): CivicMetricsEmptyState {
  if (status === 'idle' || status === 'loading') return 'loading';
  if (status === 'error') return 'unavailable';
  return 'empty';
}

/** A zero is a verified total only after the corresponding request succeeds. */
export function getConfirmedMetricTotal(
  status: CivicMetricsLoadStatus,
  total: number,
): number | null {
  if (status !== 'loaded' || !Number.isSafeInteger(total) || total < 0) return null;
  return total;
}
