import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

export interface MyConstituencyInfo {
  stateCode?: string;
  acNo: number;
  name: string;
  district: string;
  party: string;
}

export type ConstituencyIdentity = Pick<MyConstituencyInfo, 'acNo' | 'name' | 'district'>;

export interface ConstituencySelection {
  id: string;
  name: string;
}

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

/**
 * Resolve the compose audience to a canonical constituency in the active state.
 * A saved home or feed selection from another state must never be combined with
 * the active state's code to create a false constituency ID.
 */
export function resolveConstituencyForState(
  stateCode: string,
  selected: ConstituencySelection | null | undefined,
  home: MyConstituencyInfo | null | undefined,
  constituencies: readonly ConstituencyIdentity[],
): Pick<MyConstituencyInfo, 'acNo' | 'name'> | null {
  const normalizedStateCode = stateCode.trim().toUpperCase();
  if (!normalizedStateCode || normalizedStateCode === 'IN') return null;

  const selectionMatch = selected?.id.match(/^([A-Z]{2})-AC-(\d+)$/i);
  if (selectionMatch?.[1].toUpperCase() === normalizedStateCode) {
    const acNo = Number(selectionMatch[2]);
    const canonicalSelection = constituencies.find((item) => item.acNo === acNo);
    if (canonicalSelection) {
      return { acNo: canonicalSelection.acNo, name: canonicalSelection.name };
    }
  }

  if (!home || !homeConstituencyBelongsToState(home, normalizedStateCode, constituencies)) return null;
  const canonicalHome = constituencies.find((item) => item.acNo === home.acNo);
  return canonicalHome ? { acNo: canonicalHome.acNo, name: canonicalHome.name } : null;
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
