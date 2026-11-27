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
    it('keeps sourced Kannada election videos in Karnataka without including non-state videos', async () => {
      const date = new Date(Date.now() - 3600000).toUTCString();
      const stateVideo = 'https://tv9kannada.com/videos/state-assembly-election.html';
      const otherVideo = 'https://tv9kannada.com/videos/film-announcement.html';
      jest.spyOn(rssParser, 'fetchFeedXml').mockImplementation(async (url) => {
        if (url !== 'https://tv9kannada.com/karnataka/feed') return null;
        return `<rss><channel>
          <item><title>ವಿಧಾನಸಭಾ ಚುನಾವಣೆ</title><link>${stateVideo}</link>
          <category>ಕರ್ನಾಟಕ ಸುದ್ದಿ</category><category>ರಾಜಕೀಯ ಸುದ್ದಿ</category><pubDate>${date}</pubDate></item>
          <item><title>Film announcement</title><link>${otherVideo}</link>
          <category>ಸಿನಿಮಾ ಸುದ್ದಿ</category><pubDate>${date}</pubDate></item>
        </channel></rss>`;
      });
      await refreshNews();
      const scope = { scope: 'state', state: 'KA', lang: 'kn' } as const;
      const expected = expect.objectContaining({
        sourceUrl: stateVideo,
        source: expect.objectContaining({ id: 'tv9-kannada' }),
        video: { provider: 'native', embedId: stateVideo },
      });
      for (const category of ['politics', 'elections', 'video'] as const) {
        expect(getFeed({ ...scope, category }).items).toEqual([expected]);
      }
      expect(getFeed({ ...scope, state: 'TS' }).items).toHaveLength(0);
      expect(getFeed(scope).items.map((item) => item.sourceUrl)).toEqual([stateVideo]);
    });

    it('retains a relevant election story below a busy publisher’s general article limit', async () => {
      const now = Date.now();
      const electionDate = new Date(now - 3600000).toUTCString();
      const headline = 'https://tv9kannada.com/karnataka/assembly-by-election.html';
      const items = Array.from(
        { length: 20 },
        (_, index) => `
        <item><title>State report ${index}</title><link>https://tv9kannada.com/karnataka/report-${index}.html</link>
        <category>ಕರ್ನಾಟಕ ಸುದ್ದಿ</category><pubDate>${new Date(now - index * 60000).toUTCString()}</pubDate></item>`,
      ).join('');
      jest.spyOn(rssParser, 'fetchFeedXml').mockImplementation(async (url) => {
        if (url !== 'https://tv9kannada.com/karnataka/feed') return null;
        return `<rss><channel>${items}
          <item><title>ವಿಧಾನಸಭಾ ಚುನಾವಣೆ</title><link>${headline}</link>
          <category>ಕರ್ನಾಟಕ ಸುದ್ದಿ</category><pubDate>${electionDate}</pubDate></item>
        </channel></rss>`;
      });
      await refreshNews();
      expect(
        getFeed({ scope: 'state', state: 'KA', lang: 'kn', category: 'elections' }).items.map(
          (item) => item.sourceUrl,
        ),
      ).toEqual([headline]);
      expect(getFeed({ scope: 'state', state: 'KA', lang: 'kn' }).items).toHaveLength(16);
    });

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

    it('shares the same pending publisher refresh across concurrent callers', async () => {
      const p1 = refreshNews();
      const p2 = refreshNews();
      expect(p1).toBe(p2);
      await expect(p2).resolves.toMatchObject({ version: 1 });
    });
  });

  describe('getFeed filtering capabilities', () => {
    it('accepts election section articles and excludes sports mixed into that feed', async () => {
      const date = new Date(Date.now() - 60_000).toUTCString();
      jest
        .spyOn(rssParser, 'fetchFeedXml')
        .mockImplementation(async (url) =>
          url === 'https://indianexpress.com/section/elections/feed/'
            ? '<rss><channel>' +
              '<item><title>Panchayat election date announced</title>' +
              '<link>https://indianexpress.com/elections/announcement/</link><pubDate>' +
              date +
              '</pubDate></item>' +
              '<item><title>Cricket score</title>' +
              '<link>https://indianexpress.com/sports/cricket/score/</link><pubDate>' +
              date +
              '</pubDate></item>' +
              '</channel></rss>'
            : null,
        );
      await refreshNews();
      expect(getFeed({ category: 'elections' }).items.map((item) => item.title)).toEqual([
        'Panchayat election date announced',
      ]);
    });

    it('returns Telugu Telangana publisher video and only fresh publisher-marked breaking news', async () => {
      const recent = new Date(Date.now() - 30 * 60 * 1000).toUTCString();
      const older = new Date(Date.now() - 12 * 60 * 60 * 1000).toUTCString();
      jest.spyOn(rssParser, 'fetchFeedXml').mockImplementation(async (url) =>
        url === 'https://tv9telugu.com/telangana/feed'
          ? `
          <rss><channel>
            <item><title>తెలంగాణ తాజా వీడియో</title>
              <link>https://tv9telugu.com/videos/telangana-fixture.html</link>
              <category><![CDATA[Breaking News]]></category><pubDate>${recent}</pubDate></item>
            <item><title>Previous alert</title>
              <link>https://tv9telugu.com/telangana/old-alert.html</link>
              <category>Breaking News</category><pubDate>${older}</pubDate></item>
            <item><title>Regular article</title>
              <link>https://tv9telugu.com/telangana/regular.html</link>
              <pubDate>${recent}</pubDate></item>
          </channel></rss>`
          : null,
      );
      await refreshNews();
      const scope = { scope: 'state', state: 'TS', lang: 'te' };
      expect(getFeed({ ...scope, category: 'breaking' }).items).toHaveLength(1);
      expect(getFeed({ ...scope, category: 'video' }).items[0].video).toMatchObject({
        provider: 'native',
      });
      expect(getFeed({ ...scope, category: 'regional' }).items).toHaveLength(3);
      expect(getFeed({ ...scope, state: 'AP' }).items).toHaveLength(0);
    });

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
