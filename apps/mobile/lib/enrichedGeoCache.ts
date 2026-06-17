import { enrichGeoJSON, enrichGeoJSONForState } from '@/lib/enrichGeoJSON';
import { getStateGeoJSON } from '@/lib/geoLoader';

/**
 * Universal enriched GeoJSON cache — keyed by state code.
 * Each state's GeoJSON is enriched once (constituency + party data merged)
 * and then cached for the lifetime of the app. This gives:
 *   1. Stable object references (no unnecessary MapLibre re-renders)
 *   2. Instant re-display when switching back to a previously viewed state
 *   3. TS uses the richer demographics-aware enrichGeoJSON(); others use enrichGeoJSONForState()
 *
 * Extracted verbatim from app/(tabs)/index.tsx — behaviour unchanged.
 */
const _enrichedGeoCache = new Map<string, GeoJSON.FeatureCollection>();

export function getEnrichedGeoForState(code: string): GeoJSON.FeatureCollection | null {
  const cached = _enrichedGeoCache.get(code);
  if (cached) return cached;

  const raw = getStateGeoJSON(code);
  if (!raw) {
    console.warn(`[enrichedGeoCache] No GeoJSON for state "${code}" — map will be empty.`);
    return null;
  }

  try {
    const enriched = code === 'TS'
      ? enrichGeoJSON(raw)
      : enrichGeoJSONForState(raw, code);

    console.log(
      `[enrichedGeoCache] "${code}" raw=${raw.features?.length ?? 0} enriched=${enriched.features?.length ?? 0}`,
    );

    _enrichedGeoCache.set(code, enriched);
    return enriched;
  } catch (err) {
    console.error(`[enrichedGeoCache] Enrichment FAILED for state "${code}":`, err);
    return raw; // fall back to un-enriched polygons so the map still renders
  }
}
