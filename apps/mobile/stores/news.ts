import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import { SEED_NEWS_FEED } from '../data/newsSeed';
import { API_BASE_URL } from '../lib/constants';
import type { NewsItem, NewsCategory, NewsLanguageCode } from '../lib/newsTypes';

/**
 * News store.
 *
 * `refresh()` pulls the hourly RSS-aggregated `NewsFeed` from the backend and
 * falls back to the bundled seed feed if the API is unreachable or empty
 * (e.g. offline, or the API isn't running in dev).
 */
export const NEWS_FEED_URL = `${API_BASE_URL}/api/v1/news/feed`;

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

async function loadFeed() {
  try {
    const res = await fetch(NEWS_FEED_URL);
    if (res.ok) {
      const feed = (await res.json()) as typeof SEED_NEWS_FEED;
      // Only use the live feed if it actually returned stories.
      if (feed?.items?.length) return feed;
    }
  } catch {
    // fall through to seed on any network error
  }
  return { ...SEED_NEWS_FEED, generatedAt: new Date().toISOString() };
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

      setLanguage: (language) => set({ language }),
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
        try {
          const feed = await loadFeed();
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
