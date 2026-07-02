/**
 * Minimal, dependency-free RSS 2.0 / Atom parser.
 *
 * Deliberately avoids adding an XML library: it extracts only the fields we
 * need (title, link, summary, date, thumbnail) with resilient regexes and
 * fails soft on malformed feeds.
 */

export interface ParsedItem {
  title: string;
  link: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
}

const TIMEOUT_MS = 12_000;

export async function fetchFeedXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some CDNs reject empty UAs.
        'User-Agent': 'KshetraNewsBot/1.0 (+https://kshetra.app)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function firstMatch(block: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = block.match(re);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

function extractBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi');
  return xml.match(re) ?? [];
}

function parseImage(block: string): string | undefined {
  const media = firstMatch(block, [
    /<media:content[^>]*url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]*url=["']([^"']+)["']/i,
    /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i,
    /<enclosure[^>]*type=["']image[^>]*url=["']([^"']+)["']/i,
  ]);
  if (media) return media;
  // Fallback: first <img src> inside description/content.
  const img = firstMatch(block, [/<img[^>]*src=["']([^"']+)["']/i]);
  return img;
}

function parseLink(block: string): string {
  // RSS <link>url</link>; Atom <link href="url" />.
  const rss = firstMatch(block, [/<link>\s*([\s\S]*?)\s*<\/link>/i]);
  if (rss && /^https?:/i.test(decodeEntities(rss))) return decodeEntities(rss);
  const atom = firstMatch(block, [
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["']/i,
  ]);
  return atom ? decodeEntities(atom) : '';
}

export function parseFeed(xml: string): ParsedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = isAtom ? extractBlocks(xml, 'entry') : extractBlocks(xml, 'item');
  const items: ParsedItem[] = [];

  for (const block of blocks) {
    const title = firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    if (!title) continue;
    const link = parseLink(block);
    if (!link) continue;

    const rawSummary = firstMatch(block, [
      /<description[^>]*>([\s\S]*?)<\/description>/i,
      /<summary[^>]*>([\s\S]*?)<\/summary>/i,
      /<content[^>]*>([\s\S]*?)<\/content>/i,
    ]);
    const date = firstMatch(block, [
      /<pubDate>([\s\S]*?)<\/pubDate>/i,
      /<published>([\s\S]*?)<\/published>/i,
      /<updated>([\s\S]*?)<\/updated>/i,
      /<dc:date>([\s\S]*?)<\/dc:date>/i,
    ]);
    const image = parseImage(block);

    const summary = rawSummary ? stripHtml(rawSummary).slice(0, 280) : undefined;
    const publishedAt = date ? new Date(decodeEntities(date)).toISOString() : undefined;

    items.push({
      title: stripHtml(title).slice(0, 300),
      link,
      summary,
      imageUrl: image ? decodeEntities(image) : undefined,
      publishedAt: publishedAt && publishedAt !== 'Invalid Date' ? publishedAt : undefined,
    });
  }

  return items;
}
