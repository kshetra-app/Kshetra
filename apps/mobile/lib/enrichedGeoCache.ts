import { enrichGeoJSONForState, enrichIndiaGeoJSON } from './enrichGeoJSON';
import { getStateGeoJSON, isBundledGeoJSON } from './geoLoader';
import { fetchStateGeoJSON } from './remoteGeoLoader';
import { getManifestEntry, loadRemoteGeoManifest } from './geoManifest';
import {
  getCachedStateMapData,
  loadStateScopedMapData,
  subscribeToStateMapData,
  type StateMapData,
} from './stateScopedMapData';

const MAX_ENRICHED_GEOMETRY_STATES = 2;
const enrichedCache = new Map<string, GeoJSON.FeatureCollection>();
const enrichedRevision = new Map<string, string>();
const listeners = new Set<(code: string, data: GeoJSON.FeatureCollection) => void>();
const inFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();

export type GeoCacheListener = (code: string, data: GeoJSON.FeatureCollection) => void;

function publish(code: string, data: GeoJSON.FeatureCollection, revision?: string): void {
  const key = code.toUpperCase();
  enrichedCache.delete(key);
  enrichedCache.set(key, data);
  if (revision) enrichedRevision.set(key, revision);
  while (enrichedCache.size > MAX_ENRICHED_GEOMETRY_STATES) {
    const oldest = enrichedCache.keys().next().value as string | undefined;
    if (!oldest) break;
    enrichedCache.delete(oldest);
    enrichedRevision.delete(oldest);
  }
  for (const listener of listeners) listener(key, data);
}

export function subscribeToGeoCache(listener: GeoCacheListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function enrichRaw(
  code: string,
  raw: GeoJSON.FeatureCollection,
  stateData?: StateMapData | null,
): GeoJSON.FeatureCollection {
  const key = code.toUpperCase();
  try {
    const enriched = key === 'IN'
      ? enrichIndiaGeoJSON(raw)
      : enrichGeoJSONForState(raw, key, stateData ?? null);
    publish(key, enriched, stateData?.revision);
    return enriched;
  } catch (error) {
    console.error(`[enrichedGeoCache] Enrichment failed for ${key}; displaying verified raw boundaries:`, error);
    publish(key, raw, stateData?.revision);
    return raw;
  }
}

// Re-enrich an already viewed region when a newer state-scoped metadata
// revision arrives. Geometry is fetched by its own immutable version.
subscribeToStateMapData((code, snapshot) => {
  const key = code.toUpperCase();
  if (key === 'IN' || snapshot.status !== 'loaded' || !snapshot.data) return;
  if (!enrichedCache.has(key) || enrichedRevision.get(key) === snapshot.data.revision) return;
  void (async () => {
    const manifest = await loadRemoteGeoManifest();
    const entry = manifest?.[key] ?? getManifestEntry(key);
    if (!entry?.hasPolygons || entry.status === 'placeholder') return;
    const raw = await fetchStateGeoJSON(key, entry.version);
    if (raw) enrichRaw(key, raw, snapshot.data);
  })().catch((error) => {
    console.warn(`[enrichedGeoCache] Background re-enrichment failed for ${key}:`, error);
  });
});

/** Fast path for geometry that is already in memory or is the bundled India shell. */
export function getCachedEnrichedGeo(code: string): GeoJSON.FeatureCollection | null {
  const key = code.toUpperCase();
  const cached = enrichedCache.get(key);
  if (cached) {
    enrichedCache.delete(key);
    enrichedCache.set(key, cached);
    return cached;
  }
  if (isBundledGeoJSON(key)) {
    const raw = getStateGeoJSON(key);
    if (raw) return enrichRaw(key, raw);
  }
  return null;
}

/** Fetch only the selected state's metadata and geometry. */
export async function loadEnrichedGeoForState(code: string): Promise<GeoJSON.FeatureCollection | null> {
  const key = code.toUpperCase();
  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = (async () => {
    if (key === 'IN') {
      const national = getStateGeoJSON('IN');
      return national ? enrichRaw('IN', national) : null;
    }

    const current = enrichedCache.get(key);
    if (current) {
      // Revalidate selected-state metadata in the background without blocking
      // a cached boundary from painting immediately.
      void loadStateScopedMapData(key);
      void loadRemoteGeoManifest(true).catch(() => null);
      return current;
    }

    const [stateSnapshot, manifest] = await Promise.all([
      loadStateScopedMapData(key),
      loadRemoteGeoManifest(),
    ]);
    const entry = manifest?.[key] ?? getManifestEntry(key);
    if (!entry?.hasPolygons || entry.status === 'placeholder') {
      // The data contract can be available even when authoritative polygons
      // are not. Never create fallback or fabricated geometry.
      return null;
    }
    const raw = await fetchStateGeoJSON(key, entry.version);
    if (!raw) return null;
    return enrichRaw(key, raw, stateSnapshot.data);
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}
