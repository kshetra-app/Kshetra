import { enrichGeoJSON, enrichGeoJSONForState, enrichIndiaGeoJSON } from './enrichGeoJSON';
import { getStateGeoJSON, isBundledGeoJSON } from './geoLoader';
import { fetchStateGeoJSON, getGeoBaseUrl } from './remoteGeoLoader';
import { getManifestEntry, type GeoManifestEntry } from './geoManifest';

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
const REMOTE_MANIFEST_TTL_MS = 60_000;
let remoteManifestCheckedAt = 0;
let remoteManifestCache: Record<string, GeoManifestEntry> | null = null;
let remoteManifestPromise: Promise<Record<string, GeoManifestEntry> | null> | null = null;
const loadedGeoAssets = new Map<string, string>();

function geoAssetKey(entry: GeoManifestEntry | undefined): string {
  return entry ? `${entry.file}:${entry.version ?? ''}` : '';
}

function parseRemoteManifest(value: unknown): Record<string, GeoManifestEntry> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries: Record<string, GeoManifestEntry> = {};
  for (const [rawCode, rawEntry] of Object.entries(value)) {
    if (!/^[A-Z0-9_-]{2,10}$/i.test(rawCode)) continue;
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;

    const entry = rawEntry as Partial<GeoManifestEntry>;
    if (
      typeof entry.file !== 'string' ||
      !/^[a-z0-9-]+\.json$/.test(entry.file) ||
      typeof entry.version !== 'string' ||
      !/^[a-z0-9._-]{1,64}$/i.test(entry.version) ||
      typeof entry.hasPolygons !== 'boolean' ||
      typeof entry.count !== 'number' ||
      !Number.isFinite(entry.count) ||
      entry.count < 0
    ) {
      continue;
    }

    entries[rawCode.toUpperCase()] = entry as GeoManifestEntry;
  }

  return Object.keys(entries).length > 0 ? entries : null;
}

async function fetchRemoteManifest(): Promise<Record<string, GeoManifestEntry> | null> {
  if (remoteManifestPromise) return remoteManifestPromise;
  if (
    remoteManifestCheckedAt > 0 &&
    Date.now() - remoteManifestCheckedAt < REMOTE_MANIFEST_TTL_MS
  ) {
    return remoteManifestCache;
  }

  const request = (async () => {
    try {
      const geoBaseUrl = getGeoBaseUrl();
      const response = await fetch(`${geoBaseUrl}/geo/manifest.json`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return remoteManifestCache;

      const manifest = parseRemoteManifest(await response.json());
      if (manifest) remoteManifestCache = manifest;
      return remoteManifestCache;
    } catch (err) {
      console.warn('[enrichedGeoCache] Failed to fetch remote geo-manifest:', err);
      return remoteManifestCache;
    } finally {
      remoteManifestCheckedAt = Date.now();
      remoteManifestPromise = null;
    }
  })();

  remoteManifestPromise = request;
  return request;
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
      const currentAsset = loadedGeoAssets.get(key) ?? geoAssetKey(localEntry);

      if (remoteEntry && geoAssetKey(remoteEntry) !== currentAsset) {
        // A newer version is available remotely! Fetch and enrich it
        const updatedRaw = await fetchStateGeoJSON(key, remoteEntry.version, remoteEntry.file);
        if (updatedRaw) {
          loadedGeoAssets.set(key, geoAssetKey(remoteEntry));
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
    const bundledEntry = getManifestEntry(key);
    if (bundledEntry) loadedGeoAssets.set(key, geoAssetKey(bundledEntry));
    void triggerBackgroundCheck();
    return baseline;
  }

  // Not bundled, not cached: fetch using the remote manifest (or local entry fallback)
  try {
    const remoteManifest = await fetchRemoteManifest();
    const remoteEntry = remoteManifest ? remoteManifest[key] : null;
    const localEntry = getManifestEntry(key);
    const entry = remoteEntry ?? localEntry;
    const version = entry?.version ?? '';
    const remoteRaw = await fetchStateGeoJSON(key, version, entry?.file);
    if (remoteRaw) {
      if (entry) loadedGeoAssets.set(key, geoAssetKey(entry));
      return enrichRaw(key, remoteRaw);
    }
  } catch (err) {
    console.warn(`[enrichedGeoCache] Synchronous remote load failed for ${key}:`, err);
  }

  // Fallback to fetchStateGeoJSON default
  const fallback = await fetchStateGeoJSON(key);
  if (fallback) {
    const localEntry = getManifestEntry(key);
    if (localEntry) loadedGeoAssets.set(key, geoAssetKey(localEntry));
    return enrichRaw(key, fallback);
  }

  return null;
}
