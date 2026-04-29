import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface MyConstituencyInfo {
  acNo: number;
  name: string;
  district: string;
  party: string;
}

interface MyConstituencyState {
  /** The user's home constituency */
  home: MyConstituencyInfo | null;

  /** Set the user's home constituency */
  setHome: (info: MyConstituencyInfo) => void;

  /** Clear the home constituency */
  clearHome: () => void;

  /** Check if a given AC is the home constituency */
  isHome: (acNo: number) => boolean;
}

export const useMyConstituencyStore = create<MyConstituencyState>()(
  persist(
    (set, get) => ({
      home: null,

      setHome: (info) => set({ home: info }),

      clearHome: () => set({ home: null }),

      isHome: (acNo) => get().home?.acNo === acNo,
    }),
    {
      name: 'kshetra-my-constituency',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
