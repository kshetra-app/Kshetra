import { createHash } from 'crypto';
import { FEED_SOURCES } from './sources';
import type { FeedSource, NewsCategory, NewsLanguageCode, NewsScope } from './sources';
import { fetchFeedXml, parseFeed } from './rssParser';
import {
  filterNewsByScope,
  getYouTubeVideoId,
  isFreshNewsTimestamp,
  matchesNewsCategory,
} from '@kshetra/shared';

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  sourceUrl: string;
  source: {
    id: string;
    name: string;
    domain: string;
    language: NewsLanguageCode;
    accent?: string;
    verified?: boolean;
  };
  language: NewsLanguageCode;
  category: NewsCategory;
  categories?: NewsCategory[];
  breaking?: boolean;
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
  constituencyId?: string;
  category?: string;
  limit?: number;
}

const REFRESH_INTERVAL_MIN = 60;
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

function detectVideo(link: string): NewsItem['video'] {
  const youtube = getYouTubeVideoId(link);
  if (youtube) return { provider: 'youtube', embedId: youtube };
  try {
    const url = new URL(link);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'tv9telugu.com' &&
      url.pathname.startsWith('/videos/')
    ) {
      return { provider: 'native', embedId: link };
    }
  } catch {
    return undefined;
  }
}

async function scrapeSource(src: FeedSource): Promise<NewsItem[]> {
  const xml = await fetchFeedXml(src.rssUrl);
  if (!xml) return [];
  const fresh = parseFeed(xml).filter(
    (item) => item.title.trim() && isFreshNewsTimestamp(item.publishedAt),
  );
  const parsed = fresh.slice(0, PER_SOURCE_CAP);
  const ids = new Set(parsed.map((item) => item.link));
  // A busy text feed should not crowd out its publisher's fresh video stories.
  for (const video of fresh.filter((item) => detectVideo(item.link)).slice(0, 5)) {
    if (!ids.has(video.link)) parsed.push(video);
  }
  return parsed.map((p) => {
    const video = detectVideo(p.link);
    const publisherCategories = (p.categories ?? []).map((category) =>
      category.trim().toLowerCase(),
    );
    const breaking =
      publisherCategories.some((tag) =>
        /^(breaking(?: news)?|బ్రేకింగ్(?: న్యూస్)?|ब्रेकिंग(?: न्यूज़)?)$/iu.test(tag),
      ) || /^(breaking(?: news)?|బ్రేకింగ్(?: న్యూస్)?|ब्रेकिंग(?: न्यूज़)?)\s*[:|–—-]/iu.test(p.title);
    const categories = new Set<NewsCategory>([src.category]);
    if (publisherCategories.some((tag) => /^(politics|పాలిటిక్స్|రాజకీయం)$/iu.test(tag)))
      categories.add('politics');
    if (publisherCategories.some((tag) => /^(elections?|ఎన్నికలు)(?:\s*-?\s*20\d{2})?$/iu.test(tag)))
      categories.add('elections');
    if (
      publisherCategories.some((tag) =>
        /^(governance|public policy|government schemes|ప్రభుత్వ పథకాలు)$/iu.test(tag),
      )
    )
      categories.add('governance');
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
      categories: [...categories],
      breaking,
      scope: src.scope,
      stateCode: src.stateCode,
      publishedAt: p.publishedAt!,
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

    // Dedupe by canonical link while retaining every section the publisher put it in.
    const byId = new Map<string, NewsItem>();
    for (const item of all) {
      const existing = byId.get(item.id);
      if (!existing) byId.set(item.id, item);
      else {
        existing.categories = [
          ...new Set([...(existing.categories ?? []), ...(item.categories ?? [])]),
        ];
        existing.breaking ||= item.breaking;
        existing.video ??= item.video;
      }
    }

    const items = [...byId.values()].sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );

    const sourceMap = new Map<string, NewsItem['source']>();
    for (const it of items)
      if (!sourceMap.has(it.source.id)) sourceMap.set(it.source.id, it.source);

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
  let items = cache.items.filter((item) => isFreshNewsTimestamp(item.publishedAt));
  if (filters.lang) items = items.filter((i) => i.language === filters.lang);
  if (filters.category && filters.category !== 'top') {
    const category = filters.category;
    items = items.filter((item) => matchesNewsCategory(item, category));
  }
  if (
    filters.scope === 'national' ||
    filters.scope === 'state' ||
    filters.scope === 'constituency'
  ) {
    items = filterNewsByScope(items, filters.scope, filters.state, filters.constituencyId);
  }
  if (filters.limit && filters.limit > 0) items = items.slice(0, filters.limit);
  return { ...cache, items };
}

export function startNewsScheduler(log?: {
  info: (msg: string) => void;
  error: (e: unknown) => void;
}) {
  // Initial fetch (non-blocking) + hourly refresh.
  refreshNews()
    .then((f) =>
      log?.info(`News feed primed with ${f.items.length} items from ${f.sources.length} sources`),
    )
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
