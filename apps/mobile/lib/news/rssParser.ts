/**
 * Minimal, dependency-free RSS 2.0 / Atom parser (on-device).
 *
 * Ported from the backend scraper so the mobile app can aggregate news
 * directly when no hosted API is configured. Extracts only the fields we
 * display (title, link, summary, date, thumbnail) with resilient regexes and
 * fails soft on malformed feeds. No XML library is pulled in.
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
        // A browser-ish UA reduces 403s from CDNs that reject bots/empty UAs.
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 PoligramNews/1.0',
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
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

function unwrapCdata(input: string): string {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
}

const NAMED_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&sbquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&bdquo;': '"',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&bull;': '•',
  '&prime;': "'",
  '&Prime;': '"',
  '&trade;': '™',
  '&copy;': '©',
  '&reg;': '®',
  '&middot;': '·',
  '&lsaquo;': '‹',
  '&rsaquo;': '›',
  '&laquo;': '«',
  '&raquo;': '»',
  '&cent;': '¢',
  '&pound;': '£',
  '&yen;': '¥',
  '&euro;': '€',
  '&sect;': '§',
  '&deg;': '°',
  '&plusmn;': '±',
};

function decodeEntitiesOnce(input: string): string {
  let str = input;

  for (const [entity, replacement] of Object.entries(NAMED_ENTITIES)) {
    if (str.includes(entity)) {
      str = str.split(entity).join(replacement);
    }
  }

  // Decimal character references: &#8216; or &#038;
  str = str.replace(/&#(\d+);/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
    } catch {
      return '';
    }
  });

  // Hexadecimal character references: &#x2018; or &#x1F600;
  str = str.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
    } catch {
      return '';
    }
  });

  return str;
}

export function decodeEntities(input: string): string {
  if (!input) return '';
  let str = unwrapCdata(input);
  str = decodeEntitiesOnce(str);
  // Second pass in case there was double escaping (e.g. &amp;#8217; or &amp;quot;)
  if (str.includes('&')) {
    str = decodeEntitiesOnce(str);
  }
  return str.trim();
}

function stripHtml(input: string): string {
  if (!input) return '';
  // 1. Unwrap CDATA first so tags inside CDATA are preserved or stripped properly
  let str = unwrapCdata(input);
  // 2. Strip scripts and styles
  str = str.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // 3. Strip HTML tags
  str = str.replace(/<[^>]+>/g, ' ');
  // 4. Decode HTML entities and character references
  str = decodeEntities(str);
  // 5. Normalize fancy/curly quotes and dashes so all Android fonts render cleanly without missing glyphs
  str = str
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
  // 6. Clean invisible zero-width chars and normalize whitespace
  return str.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
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
