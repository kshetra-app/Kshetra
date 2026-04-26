import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/** Single MMKV instance for the entire app */
export const mmkv = new MMKV({ id: 'kshetra-storage' });

/**
 * Zustand-compatible StateStorage adapter for MMKV.
 * Enables automatic persistence of Zustand stores to disk.
 */
export const mmkvStorage: StateStorage = {
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    mmkv.set(name, value);
  },
  removeItem: (name: string) => {
    mmkv.delete(name);
  },
};
