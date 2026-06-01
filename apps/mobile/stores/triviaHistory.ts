import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface TriviaHistoryState {
  /** Map of trivia ID → timestamp when it was last shown */
  seenIds: Record<string, number>;
  /** Record that a trivia item was shown to the user */
  markSeen: (id: string) => void;
  /** Mark multiple items as seen */
  markBatchSeen: (ids: string[]) => void;
  /** Get IDs that have been seen */
  getSeenIds: () => Set<string>;
  /** Clear all history (for testing or user preference) */
  clearHistory: () => void;
  /** Get count of total unique trivia items seen */
  totalSeen: () => number;
}

export const useTriviaHistoryStore = create<TriviaHistoryState>()(
  persist(
    (set, get) => ({
      seenIds: {},
      markSeen: (id) =>
        set((state) => ({
          seenIds: { ...state.seenIds, [id]: Date.now() },
        })),
      markBatchSeen: (ids) =>
        set((state) => {
          const now = Date.now();
          const updated = { ...state.seenIds };
          ids.forEach((id) => {
            updated[id] = now;
          });
          return { seenIds: updated };
        }),
      getSeenIds: () => new Set(Object.keys(get().seenIds)),
      clearHistory: () => set({ seenIds: {} }),
      totalSeen: () => Object.keys(get().seenIds).length,
    }),
    {
      name: 'kshetra-trivia-history',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
