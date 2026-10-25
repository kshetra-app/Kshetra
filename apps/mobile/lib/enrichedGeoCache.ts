import { enrichGeoJSON, enrichGeoJSONForState, enrichIndiaGeoJSON } from './enrichGeoJSON';
import { getStateGeoJSON, isBundledGeoJSON } from './geoLoader';
import { fetchStateGeoJSON } from './remoteGeoLoader';
import { getManifestEntry, isVerifiedRemoteStateGeoJSON } from './geoManifest';

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
    throw new Error(`GEOMETRY_ENRICHMENT_FAILED: ${code} boundary enrichment failed; refusing to show a partially enriched canonical map.`);
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
export async function loadEnrichedGeoForState(
  code: string,
): Promise<GeoJSON.FeatureCollection | null> {
  const key = code.toUpperCase();
  const cached = _enrichedGeoCache.get(key);
  if (cached && (isBundledGeoJSON(key) || isVerifiedRemoteStateGeoJSON(key))) return cached;

  // The national overview is the only always-bundled geometry. Assembly
  // boundaries are streamed only when this app's versioned manifest attests
  // source, effective/retrieved dates, checksum and canonical-count parity.
  if (isBundledGeoJSON(key)) {
    const raw = getStateGeoJSON(key);
    if (raw) return enrichRaw(key, raw);
    throw new Error(`GEOMETRY_UNAVAILABLE: bundled overview geometry for ${key} could not be loaded.`);
  }

  if (!isVerifiedRemoteStateGeoJSON(key)) {
    throw new Error(`GEOMETRY_UNAVAILABLE: ${key} has no accepted authoritative boundary provenance; placeholder geometry is intentionally unavailable.`);
  }

  const entry = getManifestEntry(key);
  if (!entry?.version) {
    throw new Error(`GEOMETRY_UNAVAILABLE: ${key} has no versioned boundary asset.`);
  }

  const raw = await fetchStateGeoJSON(key, entry.version);
  if (!raw) {
    throw new Error(`GEOMETRY_UNAVAILABLE: versioned boundary asset for ${key} is unavailable from the configured data service.`);
  }
  return enrichRaw(key, raw);
}
