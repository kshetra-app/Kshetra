import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface FavoritesState {
  /** Set of AC numbers the user has favourited */
  favoriteIds: number[];

  isFavorite: (acNo: number) => boolean;
  toggleFavorite: (acNo: number) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      isFavorite: (acNo) => get().favoriteIds.includes(acNo),

      toggleFavorite: (acNo) =>
        set((state) => {
          const exists = state.favoriteIds.includes(acNo);
          return {
            favoriteIds: exists
              ? state.favoriteIds.filter((id) => id !== acNo)
              : [...state.favoriteIds, acNo],
          };
        }),

      clearFavorites: () => set({ favoriteIds: [] }),
    }),
    {
      name: 'kshetra-favorites',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
