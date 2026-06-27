import { enrichGeoJSON, enrichGeoJSONForState, enrichIndiaGeoJSON } from '@/lib/enrichGeoJSON';
import { getStateGeoJSON, isBundledGeoJSON } from '@/lib/geoLoader';
import { fetchStateGeoJSON, getGeoBaseUrl } from '@/lib/remoteGeoLoader';
import { getManifestEntry } from '@/lib/geoManifest';

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
let remoteManifestPromise: Promise<Record<string, any> | null> | null = null;

async function fetchRemoteManifest(): Promise<Record<string, any> | null> {
  if (remoteManifestPromise) return remoteManifestPromise;

  remoteManifestPromise = (async () => {
    try {
      const geoBaseUrl = getGeoBaseUrl();
      const response = await fetch(`${geoBaseUrl}/geo/geo-manifest.json`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.warn('[enrichedGeoCache] Failed to fetch remote geo-manifest:', err);
      return null;
    }
  })();

  return remoteManifestPromise;
}

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
      const remoteManifest = await fetchRemoteManifest();
      const remoteEntry = remoteManifest ? remoteManifest[key] : null;
      const localEntry = getManifestEntry(key);

      if (remoteEntry && remoteEntry.version && remoteEntry.version !== localEntry?.version) {
        // A newer version is available remotely! Fetch and enrich it
        const updatedRaw = await fetchStateGeoJSON(key, remoteEntry.version);
        if (updatedRaw) {
          enrichRaw(key, updatedRaw);
        }
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

  // Not bundled, not cached: fetch using the remote manifest (or local entry fallback)
  try {
    const remoteManifest = await fetchRemoteManifest();
    const remoteEntry = remoteManifest ? remoteManifest[key] : null;
    const version = remoteEntry?.version ?? getManifestEntry(key)?.version ?? '';
    const remoteRaw = await fetchStateGeoJSON(key, version);
    if (remoteRaw) {
      return enrichRaw(key, remoteRaw);
    }
  } catch (err) {
    console.warn(`[enrichedGeoCache] Synchronous remote load failed for ${key}:`, err);
  }

  // Fallback to fetchStateGeoJSON default
  const fallback = await fetchStateGeoJSON(key);
  if (fallback) {
    return enrichRaw(key, fallback);
  }

  return null;
}
