import { enrichGeoJSON, enrichGeoJSONForState, enrichIndiaGeoJSON } from './enrichGeoJSON';
import { getStateGeoJSON, isBundledGeoJSON } from './geoLoader';
import { fetchStateGeoJSON } from './remoteGeoLoader';
import { getManifestEntry, loadRemoteGeoManifest } from './geoManifest';

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

export type GeoCacheListener = (code: string, data: GeoJSON.FeatureCollection) => void;
const listeners = new Set<GeoCacheListener>();

export function subscribeToGeoCache(listener: GeoCacheListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Merge constituency/party data into raw polygons (per-state strategy). */
function enrichRaw(code: string, raw: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  try {
    const enriched = code === 'IN'
      ? enrichIndiaGeoJSON(raw)
      : code === 'TS'
      ? enrichGeoJSON(raw)
      : enrichGeoJSONForState(raw, code);
    _enrichedGeoCache.set(code, enriched);

    // Notify listeners of updates (critical for background updates)
    for (const listener of listeners) {
      listener(code, enriched);
    }

    return enriched;
  } catch (err) {
    console.error(`[enrichedGeoCache] Enrichment FAILED for state "${code}":`, err);
    return raw; // fall back to un-enriched polygons so the map still renders
  }
}

/**
 * Synchronous fast-path: returns the enriched GeoJSON only if it is already in
 * memory, or if the state is bundled (e.g. "IN") and can be required inline.
 * Returns null for streamed states that haven't been fetched yet — callers
 * should fall back to {@link loadEnrichedGeoForState}.
 */
export function getCachedEnrichedGeo(code: string): GeoJSON.FeatureCollection | null {
  const cached = _enrichedGeoCache.get(code);
  if (cached) return cached;
  if (isBundledGeoJSON(code)) {
    const raw = getStateGeoJSON(code);
    if (raw) return enrichRaw(code, raw);
  }
  return null;
}

/**
 * Full loader: returns enriched GeoJSON for any state, streaming + caching the
 * raw boundary from the API when it isn't bundled. Enrichment runs once per
 * state, then the stable reference is reused on every switch-back.
 */
/**
 * Full loader: returns enriched GeoJSON for any state, streaming + caching the
 * raw boundary from the API when it isn't bundled. Enrichment runs once per
 * state, then the stable reference is reused on every switch-back.
 */
export async function loadEnrichedGeoForState(
  code: string,
): Promise<GeoJSON.FeatureCollection | null> {
  const cached = _enrichedGeoCache.get(code);
  const key = code.toUpperCase();

  // Asynchronously trigger remote manifest & update check in the background
  const triggerBackgroundCheck = async () => {
    try {
      const remoteManifest = await loadRemoteGeoManifest(true);
      const remoteEntry = remoteManifest ? remoteManifest[key] : null;
      const localEntry = getManifestEntry(key);
      if (remoteEntry && remoteEntry.hasPolygons && remoteEntry.version && remoteEntry.version !== localEntry?.version) {
        const updatedRaw = await fetchStateGeoJSON(key, remoteEntry.version);
        if (updatedRaw) enrichRaw(key, updatedRaw);
      }
    } catch (err) {
      console.warn(`[enrichedGeoCache] Background update check failed for ${key}:`, err);
    }
  };

  if (cached) {
    void triggerBackgroundCheck();
    return cached;
  }

  // Baseline load: use bundled if available
  let raw = isBundledGeoJSON(key) ? getStateGeoJSON(key) : null;
  if (raw) {
    const baseline = enrichRaw(key, raw);
    void triggerBackgroundCheck();
    return baseline;
  }

  // Load the manifest from its canonical API route before fetching state geometry.
  // When offline, the streamed state's manifest is unavailable and this returns
  // null; no fabricated or unverified geometry is substituted.
  const remoteManifest = await loadRemoteGeoManifest();
  const remoteEntry = remoteManifest?.[key];
  if (!remoteEntry) return null;
  if (!remoteEntry.hasPolygons || remoteEntry.status === 'placeholder') return null;
  const raw = await fetchStateGeoJSON(key, remoteEntry.version);
  return raw ? enrichRaw(key, raw) : null;
}
