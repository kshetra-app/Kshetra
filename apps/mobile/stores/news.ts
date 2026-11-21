import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import { SEED_NEWS_FEED } from '../data/newsSeed';
import { API_BASE_URL, REMOTE_API_URL } from '../lib/constants';
import { apiClient } from '../lib/api';
import { scrapeNewsOnDevice } from '../lib/news/scrape';
import { CURRENT_ENVIRONMENT, IS_LIVE_ENVIRONMENT } from '../lib/environment';
import type { NewsFeed, NewsItem, NewsCategory, NewsLanguageCode, NewsScope } from '../lib/newsTypes';
import { isFreshNewsTimestamp } from '@kshetra/shared';

/**
 * News store — layered, language-aware feed loader.
 *
 * Feed authority order:
 *   1. Hosted backend feed in every live environment.
 *   2. Last-good backend response for that environment and language.
 *   3. Development-only on-device RSS scrape, then development seed data.
 *
 * A shipped build never substitutes its own independently scraped feed when
 * the backend is unavailable; that would make different users see different
 * versions of the same feed.
 */
export const NEWS_FEED_URL = `${API_BASE_URL}/api/v1/news/feed`;

const CACHE_PREFIX = 'poligram-news-cache:';
export interface NewsQuery {
  scope?: NewsScope;
  state?: string;
  constituencyId?: string;
}
export const newsQueryKey = (lang: NewsLanguageCode | null, query: NewsQuery = {}) =>
  [lang ?? 'all', query.scope, query.state, query.constituencyId].filter(Boolean).join(':');
const cacheKey = (lang: NewsLanguageCode | null, query: NewsQuery) =>
  `${CACHE_PREFIX}${CURRENT_ENVIRONMENT}:${newsQueryKey(lang, query)}`;

function readCache(lang: NewsLanguageCode | null, query: NewsQuery): NewsFeed | null {
  try {
    const raw = mmkvStorage.getItem(cacheKey(lang, query));
    if (typeof raw === 'string' && raw) {
      const feed = JSON.parse(raw) as NewsFeed;
      if (Array.isArray(feed?.items)) {
        const freshFeed = { ...feed, items: feed.items.filter((item) => isFreshNewsTimestamp(item.publishedAt)) };
        if (freshFeed.items.length > 0) {
          if (freshFeed.items.length !== feed.items.length) writeCache(lang, query, freshFeed);
          return freshFeed;
        }
        mmkvStorage.removeItem(cacheKey(lang, query));
      }
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function writeCache(lang: NewsLanguageCode | null, query: NewsQuery, feed: NewsFeed) {
  try {
    const key = cacheKey(lang, query);
    if (feed.items.length) mmkvStorage.setItem(key, JSON.stringify(feed));
    else mmkvStorage.removeItem(key);
  } catch {
    // best-effort
  }
}

/** Backend feed — only attempted when a real remote host is configured. */
async function fetchBackendFeed(lang: NewsLanguageCode | null, query: NewsQuery, refresh: boolean): Promise<NewsFeed | null> {
  if (!REMOTE_API_URL) return null;
  try {
    const feed = await apiClient.news.getFeed({ ...query, lang: lang ?? undefined, refresh });
    // An empty response is still authoritative: it means the server currently
    // has no matching stories. Falling back here would resurrect stale/local data.
    if (feed) return feed;
  } catch {
    // fall through
  }
  return null;
}

/** The bundled seed, optionally narrowed to the chosen language. */
function seedFeed(lang: NewsLanguageCode | null): NewsFeed {
  const items = lang
    ? SEED_NEWS_FEED.items.filter((i) => i.language === lang)
    : SEED_NEWS_FEED.items;
  return {
    ...SEED_NEWS_FEED,
    generatedAt: new Date().toISOString(),
    items: items.length ? items : SEED_NEWS_FEED.items,
  };
}

const EMPTY_FEED: NewsFeed = {
  version: 1,
  generatedAt: '',
  refreshIntervalMin: 60,
  sources: [],
  items: [],
};

let newsRefreshSequence = 0;

async function loadFeed(lang: NewsLanguageCode | null, query: NewsQuery, refresh: boolean): Promise<{ feed: NewsFeed; failed: boolean }> {
  // 1. Hosted backend (server path, if deployed).
  const backend = await fetchBackendFeed(lang, query, refresh);
  if (backend) {
    const freshBackend = {
      ...backend,
      items: backend.items.filter((item) => isFreshNewsTimestamp(item.publishedAt)),
    };
    return { feed: freshBackend, failed: false };
  }
  // In staging/production, never replace the backend feed with a device-side
  // scrape. Reuse only a fresh backend snapshot for this environment.
  if (IS_LIVE_ENVIRONMENT) return { feed: readCache(lang, query) ?? EMPTY_FEED, failed: true };

  // 2. On-device scrape of the chosen language.
  try {
    const scraped = await scrapeNewsOnDevice(lang);
    if (scraped?.items?.length) {
      const freshScraped = {
        ...scraped,
        items: scraped.items.filter((item) => isFreshNewsTimestamp(item.publishedAt)),
      };
      if (freshScraped.items.length > 0) {
        return { feed: freshScraped, failed: false };
      }
    }
  } catch {
    // fall through to cache/seed
  }
  // 3. Last-good cache for this development environment and language.
  const cached = readCache(lang, query);
  if (cached) return { feed: cached, failed: true };
  // 4. Development-only seed.
  return { feed: seedFeed(lang), failed: false };
}

interface NewsState {
  items: NewsItem[];
  generatedAt: string;
  refreshIntervalMin: number;
  loading: boolean;
  loaded: boolean;
  queryKey: string;
  refreshFailed: boolean;

  /** User-chosen consumption language (null = show all languages). */
  language: NewsLanguageCode | null;
  category: NewsCategory;
  bookmarks: string[];

  setLanguage: (lang: NewsLanguageCode | null) => void;
  setCategory: (cat: NewsCategory) => void;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  refresh: (query?: NewsQuery, revalidate?: boolean) => Promise<void>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      items: IS_LIVE_ENVIRONMENT ? [] : SEED_NEWS_FEED.items,
      generatedAt: IS_LIVE_ENVIRONMENT ? '' : SEED_NEWS_FEED.generatedAt,
      refreshIntervalMin: SEED_NEWS_FEED.refreshIntervalMin,
      loading: false,
      loaded: false,
      queryKey: '',
      refreshFailed: false,

      language: null,
      category: 'top',
      bookmarks: [],

      setLanguage: (language) => set({ language }),
      setCategory: (category) => set({ category }),

      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),

      isBookmarked: (id) => get().bookmarks.includes(id),

      refresh: async (query = {}, revalidate = false) => {
        const requestSequence = ++newsRefreshSequence;
        set({ loading: true, refreshFailed: false });
        const lang = get().language;
        try {
          const { feed, failed } = await loadFeed(lang, query, revalidate);
          // Ignore out-of-order responses and any result for a previous language.
          if (requestSequence !== newsRefreshSequence || get().language !== lang) return;
          if (!failed) writeCache(lang, query, feed);
          set({
            items: feed.items,
            generatedAt: feed.generatedAt,
            refreshIntervalMin: feed.refreshIntervalMin,
            queryKey: newsQueryKey(lang, query),
            refreshFailed: failed,
          });
        } finally {
          if (requestSequence === newsRefreshSequence) set({ loading: false, loaded: true });
        }
      },
    }),
    {
      name: 'kshetra-news',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user preferences; items always come fresh from the feed.
      partialize: (s) => ({
        language: s.language,
        category: s.category,
        bookmarks: s.bookmarks,
      }),
    },
  ),
);
