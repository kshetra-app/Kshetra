import {
  CONTENT_ARCHIVE_AGE_DAYS,
  NEWS_MAX_AGE_DAYS,
  getContentArchiveCutoff,
  isFreshNewsTimestamp,
  isInContentPeriod,
} from '../contentArchive';

describe('shared content freshness and archive policy', () => {
  const now = Date.parse('2026-11-17T12:00:00.000Z');

  it('splits durable content at one shared 30-day cutoff', () => {
    const cutoff = Date.parse(getContentArchiveCutoff(now));
    expect(CONTENT_ARCHIVE_AGE_DAYS).toBe(30);
    expect(isInContentPeriod(new Date(cutoff).toISOString(), 'recent', now)).toBe(true);
    expect(isInContentPeriod(new Date(cutoff - 1).toISOString(), 'archive', now)).toBe(true);
    expect(isInContentPeriod(new Date(cutoff - 1).toISOString(), 'recent', now)).toBe(false);
    expect(isInContentPeriod('not-a-date', 'archive', now)).toBe(false);
  });

  it('keeps only dated news from the configured seven-day freshness window', () => {
    const fresh = new Date(now - 60 * 60 * 1000).toISOString();
    const stale = new Date(now - (NEWS_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    const tooFarInFuture = new Date(now + 10 * 60 * 1000).toISOString();

    expect(isFreshNewsTimestamp(fresh, now)).toBe(true);
    expect(isFreshNewsTimestamp(stale, now)).toBe(false);
    expect(isFreshNewsTimestamp(undefined, now)).toBe(false);
    expect(isFreshNewsTimestamp('not-a-date', now)).toBe(false);
    expect(isFreshNewsTimestamp(tooFarInFuture, now)).toBe(false);
  });
});
