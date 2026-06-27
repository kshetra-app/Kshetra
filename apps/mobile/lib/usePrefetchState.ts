/**
 * usePrefetchState — Prefetch data for a state before navigation
 *
 * Loads GeoJSON and seed data in the background when the user hovers/focuses on a state.
 * Improves perceived performance by having data ready before the screen renders.
 *
 * Phase 4b: Prefetch optimization
 */

import { useCallback, useRef } from 'react';
import { loadAllSeedDataForState } from './seedDataLoader';
import { loadEnrichedGeoForState } from './enrichedGeoCache';

/**
 * Prefetch all data for a state.
 * Safe to call multiple times; uses internal caching to avoid redundant loads.
 */
export function usePrefetchState() {
  const prefetchingRef = useRef(new Set<string>());

  const prefetch = useCallback(async (stateCode: string) => {
    // Avoid duplicate prefetch requests
    if (prefetchingRef.current.has(stateCode)) {
      return;
    }

    prefetchingRef.current.add(stateCode);

    try {
      // Prefetch in parallel
      await Promise.all([
        loadAllSeedDataForState(stateCode).catch(() => {
          // Silently fail; data will load on-demand if prefetch fails
        }),
        loadEnrichedGeoForState(stateCode).catch(() => {
          // Silently fail; GeoJSON will load on-demand if prefetch fails
        }),
      ]);
    } catch (err) {
      // Silently fail; prefetch is best-effort
      console.debug(`[usePrefetchState] Prefetch failed for ${stateCode}:`, err);
    }
  }, []);

  return { prefetch };
}
