import { createHash } from 'crypto';
import { FEED_SOURCES } from './sources';
import type { FeedSource, NewsCategory, NewsLanguageCode, NewsScope } from './sources';
import { fetchFeedXml, parseFeed } from './rssParser';
import { classifyNews } from './classify';
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
  stateCodes?: string[];
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

const REFRESH_INTERVAL_MIN = 10;
const MIN_REFRESH_INTERVAL_MS = 3 * 60_000;
const PER_SOURCE_CAP = 15;
const RETAINED_TOPICS = [
  'politics',
  'elections',
  'governance',
  'economy',
  'breaking',
  'video',
] as const;
const PER_SOURCE_TOPIC_CAP = 5;

let cache: NewsFeed = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  refreshIntervalMin: REFRESH_INTERVAL_MIN,
  sources: [],
  items: [],
};
let pendingRefresh: Promise<NewsFeed> | null = null;
let lastRefreshAttempt = 0;
let lastRefreshFailed = false;
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
      (url.hostname === 'tv9telugu.com' || url.hostname === 'tv9kannada.com') &&
      url.pathname.startsWith('/videos/')
    ) {
      return { provider: 'native', embedId: link };
    }
  } catch {
    return undefined;
  }
}

function canonicalNewsUrl(raw: string): URL | null {
  try {
    const link = new URL(raw);
    if (link.protocol !== 'https:' && link.protocol !== 'http:') return null;
    link.hash = '';
    for (const key of [...link.searchParams.keys()]) {
      if (key.startsWith('utm_')) link.searchParams.delete(key);
    }
    return link;
  } catch {
    return null;
  }
}

async function scrapeSource(
  src: FeedSource,
  response: Promise<string | null>,
): Promise<NewsItem[] | null> {
  const xml = await response;
  if (!xml || !/<(?:rss|feed|rdf:RDF)(?:\s|>)/i.test(xml)) return null;
  const fresh = parseFeed(xml)
    .filter((item) => {
      if (!item.title.trim() || !isFreshNewsTimestamp(item.publishedAt)) return false;
      const link = canonicalNewsUrl(item.link);
      return (
        link &&
        (!src.articlePath || src.articlePath.test(link.pathname)) &&
        (!src.articleTags || item.categories?.some((tag) => src.articleTags!.test(tag)))
      );
    })
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
  const items = fresh.map((p) => {
    const link = canonicalNewsUrl(p.link)!.toString();
    const video = detectVideo(link);
    const { categories, breaking } = classifyNews(src, p.title, p.categories ?? []);
    return {
      id: hashId(link),
      title: p.title,
      summary: p.summary,
      imageUrl: p.imageUrl,
      sourceUrl: link,
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
      categories,
      breaking,
      scope: src.scope,
      stateCode: src.stateCode,
      publishedAt: p.publishedAt!,
      video,
    } satisfies NewsItem;
  });
  const byId = new Map<string, NewsItem>();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const unique = [...byId.values()];
  const retained = new Map(unique.slice(0, PER_SOURCE_CAP).map((item) => [item.id, item]));
  // Keep a small set per topic so a busy edition does not hide matching articles.
  for (const topic of RETAINED_TOPICS) {
    for (const item of unique
      .filter((entry) => matchesNewsCategory(entry, topic))
      .slice(0, PER_SOURCE_TOPIC_CAP)) {
      retained.set(item.id, item);
    }
  }
  return [...retained.values()];
}

export function refreshNews(): Promise<NewsFeed> {
  if (pendingRefresh) return pendingRefresh;
  lastRefreshAttempt = Date.now();
  pendingRefresh = rebuildFeed()
    .then(
      (feed) => {
        lastRefreshFailed = false;
        return feed;
      },
      (error: unknown) => {
        lastRefreshFailed = true;
        throw error;
      },
    )
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

/** Public refreshes share one flight and one cooldown with the scheduler. */
export async function ensureFreshNews(): Promise<void> {
  if (pendingRefresh) {
    await pendingRefresh;
  } else if (Date.now() - lastRefreshAttempt >= MIN_REFRESH_INTERVAL_MS) {
    await refreshNews();
  } else if (lastRefreshFailed || cache.generatedAt === new Date(0).toISOString()) {
    throw new Error('News publishers could not be refreshed yet');
  }
}

async function rebuildFeed(): Promise<NewsFeed> {
  const responses = new Map<string, Promise<string | null>>();
  const results = await Promise.allSettled(
    FEED_SOURCES.map((source) => {
      let response = responses.get(source.rssUrl);
      if (!response) {
        response = fetchFeedXml(source.rssUrl);
        responses.set(source.rssUrl, response);
      }
      return scrapeSource(source, response);
    }),
  );
  const all: NewsItem[] = [];
  let reachableSources = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      reachableSources++;
      all.push(...result.value);
    }
  }
  if (!reachableSources) throw new Error('No configured publisher feed responded');

  // Dedupe by canonical link while retaining every section the publisher put it in.
  const byId = new Map<string, NewsItem>();
  for (const item of all) {
    const existing = byId.get(item.id);
    if (!existing) byId.set(item.id, item);
    else {
      const merged = item.scope === 'state' && existing.scope === 'national' ? item : existing;
      merged.categories = [
        ...new Set([...(existing.categories ?? []), ...(item.categories ?? [])]),
      ];
      merged.breaking = existing.breaking || item.breaking;
      merged.video = existing.video ?? item.video;
      const states = new Set([...(existing.stateCodes ?? []), existing.stateCode, item.stateCode]);
      states.delete(undefined);
      if (states.size > 1)
        merged.stateCodes = [...states].filter((state): state is string => Boolean(state));
      byId.set(item.id, merged);
    }
  }

  const items = [...byId.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

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
