/**
 * useSupabaseQuery
 *
 * Generic hook for fetching data from Supabase with seed data fallback.
 * Implements stale-while-revalidate: shows cached/seed data instantly,
 * fetches fresh data in background when online.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseConfigured } from './supabase';
import { isOnline } from './networkStatus';
import { captureException } from './errorReporting';

interface QueryResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** True if data came from network, false if seed/cached */
  isLive: boolean;
  refetch: () => Promise<void>;
}

/**
 * Fetches data from Supabase when available, otherwise returns fallback seed data.
 *
 * @param fetcher - Async function that returns data from Supabase (or null on failure)
 * @param seedData - Local seed data to use as fallback
 * @param deps - Dependency array to trigger refetch
 */
export function useSupabaseQuery<T>(
  fetcher: () => Promise<T | null>,
  seedData: T,
  deps: unknown[] = [],
): QueryResult<T> {
  const [data, setData] = useState<T>(seedData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured || !isOnline()) {
      setData(seedData);
      setIsLive(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (!mountedRef.current) return;

      if (result !== null) {
        setData(result);
        setIsLive(true);
      } else {
        setData(seedData);
        setIsLive(false);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      captureException(err as Error, { hook: 'useSupabaseQuery' });
      setError((err as Error).message);
      setData(seedData);
      setIsLive(false);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher, seedData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [...deps, fetchData]);

  return { data, loading, error, isLive, refetch: fetchData };
}
