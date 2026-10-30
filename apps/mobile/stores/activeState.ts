import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface ActiveStateStore {
  stateCode: string;
  setStateCode: (code: string) => void;
  mapOnlyMode: boolean;
  setMapOnlyMode: (val: boolean) => void;
  isScreenImmersive: boolean;
  setIsScreenImmersive: (val: boolean) => void;
}

export const useActiveStateStore = create<ActiveStateStore>()(
  persist(
    (set) => ({
      stateCode: 'IN',
      setStateCode: (code) => set({ stateCode: code }),
      mapOnlyMode: false,
      setMapOnlyMode: (val) => set({ mapOnlyMode: val }),
      isScreenImmersive: false,
      setIsScreenImmersive: (val) => set({ isScreenImmersive: val }),
    }),
    {
      name: 'kshetra-active-state',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        stateCode: state.stateCode,
        mapOnlyMode: state.mapOnlyMode,
      }),
    },
  ),
);
