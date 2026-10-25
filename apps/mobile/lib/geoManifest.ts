/**
 * Boundary manifest facade. Only the small national overview geometry is
 * bundled. The full geography manifest is fetched from the API at runtime.
 */
import { API_BASE_URL } from './constants';
import * as FileSystem from 'expo-file-system/legacy';

export interface GeoManifestEntry {
  file: string;
  count: number;
  hasPolygons: boolean;
  status?: string;
  bytes?: number;
  gzipBytes?: number;
  version?: string;
  bundled?: boolean;
}

const manifestCache = new Map<string, GeoManifestEntry>();
let manifestPromise: Promise<Record<string, GeoManifestEntry> | null> | null = null;
const MANIFEST_CACHE_PATH = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}geo-manifest-cache.json`
  : FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}geo-manifest-cache.json`
    : null;
const BUILT_IN_OVERVIEW: GeoManifestEntry = {
  file: 'india-states.json',
  count: 36,
  hasPolygons: true,
  version: '28c41cd89b90',
  bundled: true,
};

function validateEntry(value: unknown): value is GeoManifestEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<GeoManifestEntry>;
  return typeof entry.file === 'string'
    && /^[a-z0-9-]+\.json$/.test(entry.file)
    && typeof entry.count === 'number'
    && Number.isFinite(entry.count)
    && typeof entry.hasPolygons === 'boolean'
    && typeof entry.version === 'string'
    && /^[a-f0-9]{12,40}$/i.test(entry.version)
    && (!entry.status || typeof entry.status === 'string');
}

async function readCachedManifest(): Promise<Record<string, GeoManifestEntry> | null> {
  if (!MANIFEST_CACHE_PATH) return null;
  try {
    const info = await FileSystem.getInfoAsync(MANIFEST_CACHE_PATH);
    if (!info.exists) return null;
    const raw: unknown = JSON.parse(await FileSystem.readAsStringAsync(MANIFEST_CACHE_PATH));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const entries: Record<string, GeoManifestEntry> = {};
    for (const [code, value] of Object.entries(raw)) {
      if (!/^[A-Z]{2}$/.test(code) || !validateEntry(value)) continue;
      entries[code] = value;
      manifestCache.set(code, value);
    }
    return Object.keys(entries).length ? entries : null;
  } catch {
    return null;
  }
}

async function persistManifest(manifest: Record<string, GeoManifestEntry>): Promise<void> {
  if (!MANIFEST_CACHE_PATH) return;
  try {
    const temporary = `${MANIFEST_CACHE_PATH}.part`;
    await FileSystem.deleteAsync(temporary, { idempotent: true });
    await FileSystem.writeAsStringAsync(temporary, JSON.stringify(manifest));
    await FileSystem.moveAsync({ from: temporary, to: MANIFEST_CACHE_PATH });
  } catch {
    // Network data stays usable even if the local cache cannot be written.
  }
}

/** Fetch the canonical API manifest; null means offline/unavailable. */
export async function loadRemoteGeoManifest(
  refresh = false,
): Promise<Record<string, GeoManifestEntry> | null> {
  if (manifestPromise && !refresh) return manifestPromise;
  const pending = (async () => {
    try {
      let base = (process.env.EXPO_PUBLIC_GEO_BASE_URL || API_BASE_URL).trim();
      while (base.endsWith('/')) base = base.slice(0, -1);
      if (base.endsWith('/api')) base = base.slice(0, -4);
      const apiVersion = base.lastIndexOf('/api/v');
      if (apiVersion >= 0) {
        const versionSuffix = base.slice(apiVersion + 6);
        if (versionSuffix.length > 0 && [...versionSuffix].every((char) => char >= '0' && char <= '9')) base = base.slice(0, apiVersion);
      }
      const response = await fetch(base + '/geo/manifest.json', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return await readCachedManifest();
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const result: Record<string, GeoManifestEntry> = {};
      for (const [code, value] of Object.entries(raw)) {
        if (!/^[A-Z]{2}$/.test(code) || !validateEntry(value)) continue;
        result[code] = value;
        manifestCache.set(code, value);
      }
      if (Object.keys(result).length === 0) return await readCachedManifest();
      await persistManifest(result);
      return result;
    } catch {
      return await readCachedManifest();
    }
  })();
  manifestPromise = pending;
  try {
    return await pending;
  } finally {
    if (manifestPromise === pending) manifestPromise = null;
  }
}

/** Synchronous lookup only for the cached manifest and the tiny bundled shell. */
export function getManifestEntry(code: string): GeoManifestEntry | undefined {
  const key = code.toUpperCase();
  return manifestCache.get(key) ?? (key === 'IN' ? BUILT_IN_OVERVIEW : undefined);
}

/** Has a remote manifest entry been received, not merely a local state name? */
export function hasStateGeoJSON(code: string): boolean {
  const key = code.toUpperCase();
  return manifestCache.has(key) || key === 'IN';
}

/** Only the national overview is synchronously bundled. */
export function isBundledState(code: string): boolean {
  return code.toUpperCase() === 'IN';
}

export function getStatesWithGeoJSON(): string[] {
  return [...new Set(['IN', ...manifestCache.keys()])];
}
