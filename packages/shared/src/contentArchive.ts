/**
 * Shared age based archive boundary for durable community content.
 * The current RSS news feed is intentionally excluded from this policy.
 */
export const CONTENT_ARCHIVE_AGE_DAYS = 30;
export const CONTENT_PAGE_SIZE = 50;
export const NEWS_MAX_AGE_DAYS = 7;
export const NEWS_MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60_000;

export type ContentPeriod = 'recent' | 'archive';

export function getContentArchiveCutoff(now = Date.now()): string {
  return new Date(now - CONTENT_ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function isInContentPeriod(
  createdAt: string | null | undefined,
  period: ContentPeriod,
  now = Date.now(),
): boolean {
  const timestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) return period === 'recent';

  const cutoff = now - CONTENT_ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000;
  return period === 'archive' ? timestamp < cutoff : timestamp >= cutoff;
}

export function isFreshNewsTimestamp(
  publishedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!publishedAt) return false;
  const timestamp = Date.parse(publishedAt);
  return (
    Number.isFinite(timestamp) &&
    timestamp >= now - NEWS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000 &&
    timestamp <= now + NEWS_MAX_FUTURE_CLOCK_SKEW_MS
  );
}
