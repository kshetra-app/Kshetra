/**
 * Data Cache Layer — MMKV-backed request/computation cache
 *
 * Provides TTL-based caching for expensive computations and API responses.
 * Falls back to in-memory Map when MMKV is unavailable (Expo Go).
 */

import { mmkv, isMMKVAvailable } from './storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const PREFIX = 'cache:';
const memoryCache = new Map<string, CacheEntry<any>>();

/** Default TTL values in ms */
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,        // 5 minutes
  MEDIUM: 30 * 60 * 1000,      // 30 minutes
  LONG: 2 * 60 * 60 * 1000,    // 2 hours
  DAY: 24 * 60 * 60 * 1000,    // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Get a cached value by key.
 * Returns null if expired or not found.
 */
export function getCached<T>(key: string): T | null {
  const fullKey = PREFIX + key;

  try {
    if (isMMKVAvailable && mmkv) {
      const raw = mmkv.getString(fullKey);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > entry.ttl) {
        mmkv.delete(fullKey);
        return null;
      }
      return entry.data;
    }

    // Memory fallback
    const entry = memoryCache.get(fullKey);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      memoryCache.delete(fullKey);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL.
 */
export function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
  const fullKey = PREFIX + key;
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };

  try {
    if (isMMKVAvailable && mmkv) {
      mmkv.set(fullKey, JSON.stringify(entry));
    } else {
      memoryCache.set(fullKey, entry);
    }
  } catch {
    // Ignore write errors (e.g. data too large)
  }
}

/**
 * Remove a cached value.
 */
export function removeCache(key: string): void {
  const fullKey = PREFIX + key;
  if (isMMKVAvailable && mmkv) {
    mmkv.delete(fullKey);
  } else {
    memoryCache.delete(fullKey);
  }
}

/**
 * Clear all cached values.
 */
export function clearCache(): void {
  if (isMMKVAvailable && mmkv) {
    const keys = mmkv.getAllKeys().filter((k: string) => k.startsWith(PREFIX));
    for (const k of keys) {
      mmkv.delete(k);
    }
  } else {
    memoryCache.clear();
  }
}

/**
 * Get-or-compute pattern: returns cached value or computes and caches it.
 */
export function cachedCompute<T>(key: string, compute: () => T, ttl: number = CACHE_TTL.MEDIUM): T {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;
  const result = compute();
  setCache(key, result, ttl);
  return result;
}

/**
 * Async get-or-fetch pattern: returns cached value or fetches and caches it.
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.MEDIUM): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;
  const result = await fetcher();
  setCache(key, result, ttl);
  return result;
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { entries: number; engine: 'mmkv' | 'memory' } {
  if (isMMKVAvailable && mmkv) {
    const keys = mmkv.getAllKeys().filter((k: string) => k.startsWith(PREFIX));
    return { entries: keys.length, engine: 'mmkv' };
  }
  return { entries: memoryCache.size, engine: 'memory' };
}
