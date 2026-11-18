import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

interface MyConstituencyInfo {
  stateCode?: string;
  acNo: number;
  name: string;
  district: string;
  party: string;
}

type ConstituencyIdentity = Pick<MyConstituencyInfo, 'acNo' | 'name' | 'district'>;

/**
 * Resolve a persisted home constituency against the selected state's directory.
 * New records use their saved state code; older records need an exact identity
 * match because assembly numbers are reused between states.
 */
export function homeConstituencyBelongsToState(
  home: MyConstituencyInfo | null | undefined,
  stateCode: string,
  constituencies: readonly ConstituencyIdentity[],
): boolean {
  if (!home || stateCode.toUpperCase() === 'IN') return false;
  if (home.stateCode) return home.stateCode.toUpperCase() === stateCode.toUpperCase();

  const normalize = (value: string) => value.trim().toLocaleLowerCase('en');
  return constituencies.some(
    (constituency) =>
      constituency.acNo === home.acNo &&
      normalize(constituency.name) === normalize(home.name) &&
      normalize(constituency.district) === normalize(home.district),
  );
}

interface MyConstituencyState {
  /** The user's home constituency */
  home: MyConstituencyInfo | null;

  /** Set the user's home constituency */
  setHome: (info: MyConstituencyInfo) => void;

  /** Clear the home constituency */
  clearHome: () => void;

  /** Check if a given AC is the home constituency */
  isHome: (stateCode: string, acNo: number) => boolean;
}

export const useMyConstituencyStore = create<MyConstituencyState>()(
  persist(
    (set, get) => ({
      home: null,

      setHome: (info) => set({ home: info }),

      clearHome: () => set({ home: null }),

      isHome: (stateCode, acNo) =>
        get().home?.stateCode === stateCode && get().home?.acNo === acNo,
    }),
    {
      name: 'kshetra-my-constituency',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
