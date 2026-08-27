import type { StateStorage } from 'zustand/middleware';

/**
 * Storage layer with graceful fallback.
 * Prefers react-native-mmkv (30× faster) when available (dev builds).
 * Falls back to an in-memory Map when running in Expo Go or web.
 */

let mmkvInstance: any = null;
let usingMMKV = false;

try {
  const { MMKV } = require('react-native-mmkv');
  mmkvInstance = new MMKV({ id: 'kshetra-storage' });
  usingMMKV = true;
} catch {
  // Native MMKV not available (Expo Go / web) — fallback below
}

/** In-memory fallback when MMKV isn't available */
const memoryStore = new Map<string, string>();

/** Single storage instance — MMKV when available, Map otherwise */
export const mmkv = mmkvInstance;
export const isMMKVAvailable = usingMMKV;

/**
 * Zustand-compatible StateStorage adapter.
 * Uses MMKV on dev builds, in-memory Map on Expo Go / web.
 */
export const mmkvStorage: StateStorage = {
  getItem: (name: string) => {
    try {
      if (usingMMKV && mmkvInstance) {
        const value = mmkvInstance.getString(name);
        return value ?? null;
      }
    } catch {}
    return memoryStore.get(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    try {
      if (usingMMKV && mmkvInstance) {
        mmkvInstance.set(name, value);
        return;
      }
    } catch {}
    memoryStore.set(name, value);
  },
  removeItem: (name: string) => {
    try {
      if (usingMMKV && mmkvInstance) {
        mmkvInstance.delete(name);
        return;
      }
    } catch {}
    memoryStore.delete(name);
  },
};
