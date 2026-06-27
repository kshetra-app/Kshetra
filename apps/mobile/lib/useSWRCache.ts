/**
 * useSWRCache — Stale-While-Revalidate caching for async data
 *
 * Returns cached data immediately while revalidating in the background.
 * Improves perceived performance by showing stale data while fresh data loads.
 *
 * Phase 4b: SWR caching optimization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  revalidating: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Use SWR-style caching for async data.
 * Returns cached data immediately, then revalidates in the background.
 *
 * @param key - Cache key (e.g., "geo-TS", "seed-AP")
 * @param fetcher - Async function to fetch data
 * @param options - Cache options (ttl in ms, revalidateOnFocus, etc.)
 */
export function useSWRCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number; // Time-to-live in ms (default: 5 minutes)
    revalidateOnFocus?: boolean; // Revalidate when window regains focus
    dedupingInterval?: number; // Dedupe requests within this interval (default: 2 seconds)
  },
) {
  const { ttl = 5 * 60 * 1000, revalidateOnFocus = true, dedupingInterval = 2000 } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef(0);
  const revalidatingRef = useRef(false);

  const revalidate = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = cache.get(key);
    const isStale = !cached || now - cached.timestamp > ttl;

    // Skip if already revalidating or within dedup interval
    if (revalidatingRef.current || (!force && now - lastFetchRef.current < dedupingInterval)) {
      return;
    }

    // Return cached data immediately if available
    if (cached && !isStale && !force) {
      setData(cached.data);
      return;
    }

    // Revalidate in the background
    revalidatingRef.current = true;
    lastFetchRef.current = now;

    try {
      const freshData = await fetcher();
      cache.set(key, {
        data: freshData,
        timestamp: Date.now(),
        revalidating: false,
      });
      setData(freshData);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      // Keep stale data if available
      if (cached) {
        setData(cached.data);
      }
    } finally {
      revalidatingRef.current = false;
    }
  }, [key, fetcher, ttl, dedupingInterval]);

  // Initial load
  useEffect(() => {
    const cached = cache.get(key);
    if (cached) {
      // Return cached data immediately
      setData(cached.data);
      setLoading(false);

      // Revalidate if stale
      const isStale = Date.now() - cached.timestamp > ttl;
      if (isStale) {
        revalidate();
      }
    } else {
      // No cache, load immediately
      setLoading(true);
      revalidate();
    }
  }, [key, ttl, revalidate]);

  // Revalidate on focus (if enabled)
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp > ttl) {
        revalidate(true);
      }
    };

    // Note: In React Native, we'd use AppState instead of window focus
    // For now, this is a placeholder for web/future use
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [key, ttl, revalidateOnFocus, revalidate]);

  return {
    data,
    loading,
    error,
    revalidate,
  };
}

/**
 * Clear the entire SWR cache.
 * Useful for logout or app reset.
 */
export function clearSWRCache() {
  cache.clear();
}

/**
 * Clear a specific cache entry.
 */
export function clearSWRCacheEntry(key: string) {
  cache.delete(key);
}

/**
 * Preload data into the SWR cache.
 * Useful for prefetching.
 */
export async function preloadSWRCache<T>(
  key: string,
  fetcher: () => Promise<T>,
) {
  try {
    const data = await fetcher();
    cache.set(key, {
      data,
      timestamp: Date.now(),
      revalidating: false,
    });
  } catch (err) {
    console.warn(`[useSWRCache] Preload failed for ${key}:`, err);
  }
}
