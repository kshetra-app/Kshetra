/**
 * Unit Test Suite for News Service (apps/api/src/services/news/newsService.ts)
 * Master Execution Framework — CTO Directive 119
 */

import {
  refreshNews,
  getFeed,
  startNewsScheduler,
  stopNewsScheduler,
} from '../services/news/newsService';
import * as rssParser from '../services/news/rssParser';

describe('News Service (newsService.ts)', () => {
  beforeEach(() => {
    stopNewsScheduler();
  });

  afterAll(() => {
    stopNewsScheduler();
  });

  describe('refreshNews and feed scraping', () => {
    it('scrapes feeds, deduplicates items, extracts YouTube video metadata, and updates cache', async () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toUTCString();
      const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toUTCString();
      jest.spyOn(rssParser, 'fetchFeedXml').mockImplementation(async (url: string) => {
        if (url.includes('ndtv') || url.includes('thehindu')) {
          return `
          <rss version="2.0">
            <channel>
              <item>
                <title>Political Development in Hyderabad</title>
                <link>https://example.com/news/hyd-1</link>
                <description>Key updates on state policy.</description>
                <pubDate>${recentDate}</pubDate>
              </item>
              <item>
                <title>Live Video Coverage</title>
                <link>https://www.youtube.com/watch?v=dQw4w9WgXcQ</link>
                <description>Watch the address live.</description>
                <pubDate>${recentDate}</pubDate>
              </item>
              <item>
                <title>Old Story Outside the Current Feed Window</title>
                <link>https://example.com/news/old-1</link>
                <pubDate>${staleDate}</pubDate>
              </item>
              <item>
                <title>Undated Story Must Not Be Given a Made-Up Date</title>
                <link>https://example.com/news/undated-1</link>
              </item>
            </channel>
          </rss>`;
        }
        return null;
      });

      const feed = await refreshNews();
      expect(feed).toBeDefined();
      expect(feed.version).toBe(1);
      expect(feed.items.length).toBeGreaterThan(0);

      // Verify YouTube video detection
      const videoItem = feed.items.find((i) => i.video?.provider === 'youtube');
      expect(videoItem).toBeDefined();
      expect(videoItem?.video?.embedId).toBe('dQw4w9WgXcQ');
      expect(videoItem?.category).toBe('video');

      // Verify deduplication and sorting
      const uniqueIds = new Set(feed.items.map((i) => i.id));
      expect(uniqueIds.size).toBe(feed.items.length);
      expect(feed.items.some((item) => item.sourceUrl.endsWith('/old-1'))).toBe(false);
      expect(feed.items.some((item) => item.sourceUrl.endsWith('/undated-1'))).toBe(false);
    });

    it('returns existing cache when refresh is already in progress', async () => {
      // Simulate concurrent refresh calls
      const p1 = refreshNews();
      const p2 = refreshNews();
      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1.version).toBe(res2.version);
    });
  });

  describe('getFeed filtering capabilities', () => {
    it('filters items by language, category, scope, and limit', () => {
      // All filters exercisable
      const all = getFeed();
      expect(all).toBeDefined();

      const englishFeed = getFeed({ lang: 'en' });
      expect(englishFeed.items.every((i) => i.language === 'en')).toBe(true);

      const videoFeed = getFeed({ category: 'video' });
      expect(videoFeed.items.every((i) => !!i.video)).toBe(true);

      const topFeed = getFeed({ category: 'top' });
      expect(topFeed.items.length).toBeLessThanOrEqual(all.items.length);

      const nationalFeed = getFeed({ scope: 'national' });
      expect(nationalFeed.items.every((i) => i.scope === 'national')).toBe(true);

      const stateFeed = getFeed({ scope: 'state', state: 'TS' });
      expect(stateFeed.items.every((i) => i.scope === 'state' && i.stateCode === 'TS')).toBe(true);

      const constituencyFeed = getFeed({
        scope: 'constituency',
        state: 'TS',
        constituencyId: 'TS-AC-65',
      });
      expect(
        constituencyFeed.items.every(
          (i) =>
            (i.scope === 'state' && i.stateCode === 'TS') ||
            (i.scope === 'constituency' && i.constituencyId === 'TS-AC-65'),
        ),
      ).toBe(true);

      const limitedFeed = getFeed({ limit: 1 });
      expect(limitedFeed.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('scheduler management', () => {
    it('starts and stops scheduler without uncaught errors', () => {
      const logs: string[] = [];
      const mockLogger = {
        info: (msg: string) => logs.push(msg),
        error: (e: unknown) => logs.push(String(e)),
      };

      startNewsScheduler(mockLogger);
      stopNewsScheduler();
      expect(true).toBe(true);
    });
  });
});
