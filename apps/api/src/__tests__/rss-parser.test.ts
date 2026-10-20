/**
 * Unit Test Suite for RSS/Atom Parser (apps/api/src/services/news/rssParser.ts)
 * Master Execution Framework — CTO Directive 119
 */

import { parseFeed, fetchFeedXml } from '../services/news/rssParser';

describe('RSS / Atom Parser (rssParser.ts)', () => {
  describe('parseFeed — RSS 2.0 Feeds', () => {
    it('parses standard RSS 2.0 items with titles, links, descriptions, and dates', () => {
      const rss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test News Channel</title>
          <link>https://example.com/news</link>
          <item>
            <title>First Headline &amp; Breaking Story</title>
            <link>https://example.com/news/1</link>
            <description>A quick <b>summary</b> of the event &quot;today&quot;.</description>
            <pubDate>Mon, 20 Oct 2026 10:00:00 GMT</pubDate>
          </item>
          <item>
            <title><![CDATA[Second Headline with CDATA & Special Chars]]></title>
            <link>https://example.com/news/2</link>
            <description>Another summary with &#39;quotes&#39; &amp; &nbsp;spaces.</description>
            <pubDate>Mon, 20 Oct 2026 09:30:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`;

      const items = parseFeed(rss);
      expect(items.length).toBe(2);

      expect(items[0].title).toBe('First Headline & Breaking Story');
      expect(items[0].link).toBe('https://example.com/news/1');
      expect(items[0].summary).toBe('A quick summary of the event "today".');
      expect(items[0].publishedAt).toBe('2026-10-20T10:00:00.000Z');

      expect(items[1].title).toBe('Second Headline with CDATA & Special Chars');
      expect(items[1].link).toBe('https://example.com/news/2');
      expect(items[1].summary).toContain("Another summary with 'quotes'");
    });

    it('extracts thumbnails and images from media:content, media:thumbnail, enclosure, and img tags', () => {
      const rssWithImages = `
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <item>
            <title>Item with Media Content</title>
            <link>https://example.com/item1</link>
            <media:content url="https://example.com/img1.jpg" medium="image" />
          </item>
          <item>
            <title>Item with Media Thumbnail</title>
            <link>https://example.com/item2</link>
            <media:thumbnail url="https://example.com/thumb.jpg" />
          </item>
          <item>
            <title>Item with Enclosure</title>
            <link>https://example.com/item3</link>
            <enclosure url="https://example.com/enc.jpg" type="image/jpeg" />
          </item>
          <item>
            <title>Item with Image in Description</title>
            <link>https://example.com/item4</link>
            <description><img src="https://example.com/inline.png" /> Description text</description>
          </item>
        </channel>
      </rss>`;

      const items = parseFeed(rssWithImages);
      expect(items.length).toBe(4);
      expect(items[0].imageUrl).toBe('https://example.com/img1.jpg');
      expect(items[1].imageUrl).toBe('https://example.com/thumb.jpg');
      expect(items[2].imageUrl).toBe('https://example.com/enc.jpg');
      expect(items[3].imageUrl).toBe('https://example.com/inline.png');
    });

    it('skips items without title or link and handles invalid dates gracefully', () => {
      const malformedRss = `
      <rss version="2.0">
        <channel>
          <item>
            <description>No title here</description>
            <link>https://example.com/no-title</link>
          </item>
          <item>
            <title>No Link Here</title>
            <description>Missing link</description>
          </item>
          <item>
            <title>Invalid Date Item</title>
            <link>https://example.com/valid-item</link>
            <pubDate>not-a-valid-date-string</pubDate>
          </item>
        </channel>
      </rss>`;

      const items = parseFeed(malformedRss);
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Invalid Date Item');
      expect(items[0].link).toBe('https://example.com/valid-item');
      expect(items[0].publishedAt).toBeUndefined();
    });
  });

  describe('parseFeed — Atom Feeds', () => {
    it('parses Atom entries with rel="alternate" and direct href links', () => {
      const atom = `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom Feed Example</title>
        <entry>
          <title>Atom Entry 1</title>
          <link rel="alternate" href="https://example.com/atom/1" />
          <summary>First atom summary</summary>
          <published>2026-10-20T12:00:00Z</published>
        </entry>
        <entry>
          <title>Atom Entry 2</title>
          <link href="https://example.com/atom/2" />
          <content type="html"><p>Second atom content</p></content>
          <updated>2026-10-20T13:00:00Z</updated>
        </entry>
      </feed>`;

      const items = parseFeed(atom);
      expect(items.length).toBe(2);

      expect(items[0].title).toBe('Atom Entry 1');
      expect(items[0].link).toBe('https://example.com/atom/1');
      expect(items[0].summary).toBe('First atom summary');
      expect(items[0].publishedAt).toBe('2026-10-20T12:00:00.000Z');

      expect(items[1].title).toBe('Atom Entry 2');
      expect(items[1].link).toBe('https://example.com/atom/2');
      expect(items[1].summary).toBe('Second atom content');
      expect(items[1].publishedAt).toBe('2026-10-20T13:00:00.000Z');
    });
  });

  describe('fetchFeedXml', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns XML string when HTTP response is 200 OK', async () => {
      const mockXml = '<rss><channel><title>Mock</title></channel></rss>';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockXml,
      } as any);

      const result = await fetchFeedXml('https://example.com/rss.xml');
      expect(result).toBe(mockXml);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/rss.xml',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'KshetraNewsBot/1.0 (+https://kshetra.app)',
          }),
        })
      );
    });

    it('returns null when HTTP response is not ok (e.g. 404 or 500)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const result = await fetchFeedXml('https://example.com/not-found.xml');
      expect(result).toBeNull();
    });

    it('returns null fail-soft when fetch throws a network exception', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await fetchFeedXml('https://example.com/down.xml');
      expect(result).toBeNull();
    });
  });
});
