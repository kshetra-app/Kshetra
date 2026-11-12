import type { ConstituencyDirectoryStatus } from './useConstituencyDirectory';

const CONFIRMED_DIRECTORY_STATUSES = new Set<ConstituencyDirectoryStatus>([
  'DATABASE_RECORDS',
  'STALE_DATABASE_RECORDS',
  'DATABASE_EMPTY',
]);

/** A zero is meaningful only after the live directory has returned successfully. */
export function formatIntelligenceDirectoryCount(
  count: number,
  status: ConstituencyDirectoryStatus,
  liveMode: boolean,
): string {
  if (liveMode && !CONFIRMED_DIRECTORY_STATUSES.has(status)) return '—';
  return String(count);
}
