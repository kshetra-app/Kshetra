import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface ActiveStateStore {
  stateCode: string;
  setStateCode: (code: string) => void;
}

export const useActiveStateStore = create<ActiveStateStore>()(
  persist(
    (set) => ({
      stateCode: 'TS',
      setStateCode: (code) => set({ stateCode: code }),
    }),
    {
      name: 'kshetra-active-state',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
