/**
 * On-device news scraper.
 *
 * Fetches official RSS feeds directly from the app and assembles a `NewsFeed`
 * without needing a hosted backend. It is LANGUAGE-AWARE: when the user picks a
 * language we scrape that language's feeds for depth; on the "All languages"
 * view we scrape one image-rich primary feed per language so every language is
 * represented.
 *
 * Legal posture matches the backend: we only keep the headline, summary,
 * thumbnail, publisher and a canonical link back — never article bodies.
 */
import type { NewsFeed, NewsItem, NewsLanguageCode } from '../newsTypes';
import { fetchFeedXml, parseFeed } from './rssParser';
import {
  FEED_SOURCES,
  primarySources,
  sourcesForLanguage,
  type FeedSource,
} from './sources';

const REFRESH_INTERVAL_MIN = 60;
const MAX_ITEMS = 200;
const PER_SOURCE_CAP = 15;

/** Cheap, stable id from the canonical link (djb2) — no node:crypto on RN. */
function hashId(link: string): string {
  let h = 5381;
  for (let i = 0; i < link.length; i++) h = ((h << 5) + h + link.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function detectYouTube(link: string): { provider: 'youtube'; embedId: string } | undefined {
  const m = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i);
  return m ? { provider: 'youtube', embedId: m[1] } : undefined;
}

async function scrapeSource(src: FeedSource): Promise<NewsItem[]> {
  const xml = await fetchFeedXml(src.rssUrl);
  if (!xml) return [];
  const parsed = parseFeed(xml).slice(0, PER_SOURCE_CAP);
  return parsed.map((p) => {
    const video = detectYouTube(p.link);
    return {
      id: hashId(p.link),
      title: p.title,
      summary: p.summary,
      imageUrl: p.imageUrl,
      sourceUrl: p.link,
      source: {
        id: src.sourceId,
        name: src.sourceName,
        domain: src.domain,
        language: src.language,
        accent: src.accent,
        verified: src.verified,
      },
      language: src.language,
      category: video ? 'video' : src.category,
      scope: src.scope,
      stateCode: src.stateCode,
      publishedAt: p.publishedAt ?? new Date().toISOString(),
      video,
    } satisfies NewsItem;
  });
}

/**
 * Scrape news for a chosen language (or a multi-language default when null).
 * Returns null if every source failed (caller then falls back to cache/seed).
 */
export async function scrapeNewsOnDevice(
  lang: NewsLanguageCode | null,
): Promise<NewsFeed | null> {
  const targets: FeedSource[] = lang ? sourcesForLanguage(lang) : primarySources();
  // Safety net: if a language somehow has no configured feed, fall back to primaries.
  const sources = targets.length ? targets : primarySources();

  const results = await Promise.allSettled(sources.map(scrapeSource));
  const all: NewsItem[] = [];
  for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);
  if (all.length === 0) return null;

  // Dedupe by canonical link (id), keep first occurrence.
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  deduped.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const items = deduped.slice(0, MAX_ITEMS);

  const sourceMap = new Map<string, NewsItem['source']>();
  for (const it of items) if (!sourceMap.has(it.source.id)) sourceMap.set(it.source.id, it.source);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    refreshIntervalMin: REFRESH_INTERVAL_MIN,
    sources: [...sourceMap.values()],
    items,
  };
}

/** Total configured feed count — handy for diagnostics/tests. */
export const FEED_COUNT = FEED_SOURCES.length;
