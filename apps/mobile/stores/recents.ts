import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

const MAX_RECENTS = 20;

interface RecentItem {
  acNo: number;
  name: string;
  district: string;
  party: string;
  viewedAt: number; // epoch ms
}

interface RecentsState {
  recents: RecentItem[];

  addRecent: (item: Omit<RecentItem, 'viewedAt'>) => void;
  clearRecents: () => void;
}

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      recents: [],

      addRecent: (item) =>
        set((state) => {
          // Remove duplicate if exists, then prepend
          const filtered = state.recents.filter((r) => r.acNo !== item.acNo);
          const entry: RecentItem = { ...item, viewedAt: Date.now() };
          return {
            recents: [entry, ...filtered].slice(0, MAX_RECENTS),
          };
        }),

      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'kshetra-recents',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
