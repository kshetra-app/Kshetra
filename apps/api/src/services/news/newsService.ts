import { createHash } from 'crypto';
import { FEED_SOURCES } from './sources';
import type { FeedSource, NewsCategory, NewsLanguageCode, NewsScope } from './sources';
import { fetchFeedXml, parseFeed } from './rssParser';

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  sourceUrl: string;
  source: { id: string; name: string; domain: string; language: NewsLanguageCode; accent?: string; verified?: boolean };
  language: NewsLanguageCode;
  category: NewsCategory;
  scope: NewsScope;
  stateCode?: string;
  constituencyId?: string;
  publishedAt: string;
  video?: { provider: 'youtube' | 'native'; embedId: string; durationSec?: number };
}

export interface NewsFeed {
  version: number;
  generatedAt: string;
  refreshIntervalMin: number;
  sources: NewsItem['source'][];
  items: NewsItem[];
}

export interface FeedFilters {
  lang?: string;
  scope?: string;
  state?: string;
  category?: string;
  limit?: number;
}

const REFRESH_INTERVAL_MIN = 60;
const MAX_ITEMS = 200;
const PER_SOURCE_CAP = 15;

let cache: NewsFeed = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  refreshIntervalMin: REFRESH_INTERVAL_MIN,
  sources: [],
  items: [],
};
let refreshing = false;
let timer: NodeJS.Timeout | null = null;

function hashId(link: string): string {
  return createHash('sha1').update(link).digest('hex').slice(0, 16);
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

export async function refreshNews(): Promise<NewsFeed> {
  if (refreshing) return cache;
  refreshing = true;
  try {
    const results = await Promise.allSettled(FEED_SOURCES.map(scrapeSource));
    const all: NewsItem[] = [];
    for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);

    // Dedupe by canonical link (id), keep first occurrence.
    const seen = new Set<string>();
    const deduped: NewsItem[] = [];
    for (const item of all) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }

    deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const items = deduped.slice(0, MAX_ITEMS);

    const sourceMap = new Map<string, NewsItem['source']>();
    for (const it of items) if (!sourceMap.has(it.source.id)) sourceMap.set(it.source.id, it.source);

    cache = {
      version: 1,
      generatedAt: new Date().toISOString(),
      refreshIntervalMin: REFRESH_INTERVAL_MIN,
      sources: [...sourceMap.values()],
      items,
    };
    return cache;
  } finally {
    refreshing = false;
  }
}

export function getFeed(filters: FeedFilters = {}): NewsFeed {
  let items = cache.items;
  if (filters.lang) items = items.filter((i) => i.language === filters.lang);
  if (filters.category && filters.category !== 'top') {
    items = filters.category === 'video'
      ? items.filter((i) => !!i.video)
      : items.filter((i) => i.category === filters.category);
  }
  if (filters.scope === 'national') items = items.filter((i) => i.scope === 'national');
  else if (filters.scope === 'state' && filters.state) {
    items = items.filter((i) => i.scope === 'national' || i.stateCode === filters.state);
  }
  if (filters.limit && filters.limit > 0) items = items.slice(0, filters.limit);
  return { ...cache, items };
}

export function startNewsScheduler(log?: { info: (msg: string) => void; error: (e: unknown) => void }) {
  // Initial fetch (non-blocking) + hourly refresh.
  refreshNews()
    .then((f) => log?.info(`News feed primed with ${f.items.length} items from ${f.sources.length} sources`))
    .catch((e) => log?.error(e));
  if (!timer) {
    timer = setInterval(() => {
      refreshNews()
        .then((f) => log?.info(`News feed refreshed: ${f.items.length} items`))
        .catch((e) => log?.error(e));
    }, REFRESH_INTERVAL_MIN * 60_000);
    // Don't keep the event loop alive solely for this timer.
    if (typeof timer.unref === 'function') timer.unref();
  }
}

export function stopNewsScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
