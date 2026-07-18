import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import { SEED_NEWS_FEED } from '../data/newsSeed';
import { API_BASE_URL, REMOTE_API_URL } from '../lib/constants';
import { scrapeNewsOnDevice } from '../lib/news/scrape';
import type { NewsFeed, NewsItem, NewsCategory, NewsLanguageCode } from '../lib/newsTypes';

/**
 * News store — layered, language-aware feed loader.
 *
 * Source-of-truth order (the on-device and backend paths never clash):
 *   1. Hosted backend feed — ONLY when `EXPO_PUBLIC_API_URL` points at a real
 *      remote host (see `REMOTE_API_URL`). This is the server path kept ready
 *      for when the API is deployed.
 *   2. On-device RSS scrape of the CHOSEN language (or a multi-language default
 *      on the "All languages" view). This is the active path in a shipped APK.
 *   3. Last-good per-language cache (MMKV) so offline still shows real stories.
 *   4. Bundled seed feed (text-only, no dummy images) as the final fallback.
 */
export const NEWS_FEED_URL = `${API_BASE_URL}/api/v1/news/feed`;

const CACHE_PREFIX = 'kshetra-news-cache:';
const cacheKey = (lang: NewsLanguageCode | null) => `${CACHE_PREFIX}${lang ?? 'all'}`;

function readCache(lang: NewsLanguageCode | null): NewsFeed | null {
  try {
    const raw = mmkvStorage.getItem(cacheKey(lang));
    if (typeof raw === 'string' && raw) {
      const feed = JSON.parse(raw) as NewsFeed;
      if (feed?.items?.length) return feed;
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function writeCache(lang: NewsLanguageCode | null, feed: NewsFeed) {
  try {
    mmkvStorage.setItem(cacheKey(lang), JSON.stringify(feed));
  } catch {
    // best-effort
  }
}

/** Backend feed — only attempted when a real remote host is configured. */
async function fetchBackendFeed(lang: NewsLanguageCode | null): Promise<NewsFeed | null> {
  if (!REMOTE_API_URL) return null;
  try {
    const url = new URL(`${REMOTE_API_URL}/api/v1/news/feed`);
    if (lang) url.searchParams.set('lang', lang);
    const res = await fetch(url.toString());
    if (res.ok) {
      const feed = (await res.json()) as NewsFeed;
      if (feed?.items?.length) return feed;
    }
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

async function loadFeed(lang: NewsLanguageCode | null): Promise<NewsFeed> {
  // 1. Hosted backend (server path, if deployed).
  const backend = await fetchBackendFeed(lang);
  if (backend) {
    writeCache(lang, backend);
    return backend;
  }
  // 2. On-device scrape of the chosen language.
  try {
    const scraped = await scrapeNewsOnDevice(lang);
    if (scraped?.items?.length) {
      writeCache(lang, scraped);
      return scraped;
    }
  } catch {
    // fall through to cache/seed
  }
  // 3. Last-good cache for this language.
  const cached = readCache(lang);
  if (cached) return cached;
  // 4. Seed (text-only).
  return seedFeed(lang);
}

interface NewsState {
  items: NewsItem[];
  generatedAt: string;
  refreshIntervalMin: number;
  loading: boolean;

  /** User-chosen consumption language (null = show all languages). */
  language: NewsLanguageCode | null;
  category: NewsCategory;
  bookmarks: string[];

  setLanguage: (lang: NewsLanguageCode | null) => void;
  setCategory: (cat: NewsCategory) => void;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  refresh: () => Promise<void>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      items: SEED_NEWS_FEED.items,
      generatedAt: SEED_NEWS_FEED.generatedAt,
      refreshIntervalMin: SEED_NEWS_FEED.refreshIntervalMin,
      loading: false,

      language: null,
      category: 'top',
      bookmarks: [],

      setLanguage: (language) => {
        set({ language });
        // Re-scrape for the newly chosen language so its content loads.
        void get().refresh();
      },
      setCategory: (category) => set({ category }),

      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),

      isBookmarked: (id) => get().bookmarks.includes(id),

      refresh: async () => {
        set({ loading: true });
        const lang = get().language;
        try {
          const feed = await loadFeed(lang);
          // Ignore a stale response if the user switched language mid-flight.
          if (get().language !== lang) return;
          set({
            items: feed.items,
            generatedAt: feed.generatedAt,
            refreshIntervalMin: feed.refreshIntervalMin,
          });
        } finally {
          set({ loading: false });
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
