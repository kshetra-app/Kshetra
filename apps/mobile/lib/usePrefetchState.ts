/**
 * Prefetch the selected state's versioned map contract and boundary.
 *
 * Deliberately avoids the bundled national seed SQLite database: the map
 * requests only this state's server snapshot and immutable geometry asset.
 */
import { useCallback, useRef } from 'react';
import { loadStateScopedMapData } from './stateScopedMapData';
import { loadEnrichedGeoForState } from './enrichedGeoCache';

export function usePrefetchState() {
  const prefetchingRef = useRef(new Set<string>());
  const prefetch = useCallback(async (stateCode: string) => {
    const code = stateCode.toUpperCase();
    if (prefetchingRef.current.has(code)) return;
    prefetchingRef.current.add(code);
    try {
      await Promise.all([
        loadStateScopedMapData(code),
        loadEnrichedGeoForState(code),
      ]);
    } catch (error) {
      console.debug(`[usePrefetchState] State-scoped prefetch failed for ${code}:`, error);
    } finally {
      prefetchingRef.current.delete(code);
    }
  }, []);
  return { prefetch };
}
