import { useCallback, useEffect, useState } from 'react';
import { getCachedEnrichedGeo, loadEnrichedGeoForState, subscribeToGeoCache } from '@/lib/enrichedGeoCache';

export interface EnrichedGeoState {
  /** Enriched FeatureCollection, or null while loading / on error. */
  data: GeoJSON.FeatureCollection | null;
  /** True while the boundary is being streamed for the first time. */
  loading: boolean;
  /** Set when streaming failed (offline / server error). */
  error: Error | null;
  /** Re-attempt a failed load. */
  retry: () => void;
}

/**
 * Loads the enriched boundary GeoJSON for a state (Performance Phase 3).
 *
 * Bundled / already-cached states resolve synchronously (no flash of empty
 * map). Streamed states show `loading` on first view, then cache on-device so
 * subsequent visits are instant. Failures surface via `error` + `retry`.
 */
export function useEnrichedGeo(stateCode: string): EnrichedGeoState {
  const [state, setState] = useState<Omit<EnrichedGeoState, 'retry'>>(() => {
    const cached = getCachedEnrichedGeo(stateCode);
    return { data: cached, loading: cached === null, error: null };
  });
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    // Load initial cached version immediately if available
    const cached = getCachedEnrichedGeo(stateCode);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
    } else {
      setState({ data: null, loading: true, error: null });
    }

    // Subscribe to cache updates (so background fetches notify this hook to update state)
    const unsubscribe = subscribeToGeoCache((code, data) => {
      if (!cancelled && code.toUpperCase() === stateCode.toUpperCase()) {
        setState({ data, loading: false, error: null });
      }
    });

    loadEnrichedGeoForState(stateCode)
      .then((fc) => {
        if (!cancelled && fc) {
          setState({ data: fc, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !getCachedEnrichedGeo(stateCode)) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [stateCode, nonce]);

  return { ...state, retry };
}
