/**
 * Remote boundary GeoJSON loader (Performance Phase 3).
 *
 * Streams per-state constituency polygons from the API (served gzipped) and
 * caches them on-device. After the first view of a state, the file is read
 * straight from disk — no network, instant display. Cache keys embed the
 * content `version` from the manifest, so a new build automatically supersedes
 * stale copies.
 *
 * Bundled states (e.g. "IN") are served by geoLoader directly and never reach
 * this module.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from './constants';
import { getManifestEntry, isVerifiedRemoteStateGeoJSON } from './geoManifest';
import { sanitizeGeoJSON } from './geoLoader';

/** In-memory cache so repeated reads in one session never touch disk. */
const memCache = new Map<string, GeoJSON.FeatureCollection>();
/** De-dupe concurrent loads of the same state. */
const inFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();

const CACHE_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}geo/`;
const MAX_CACHE_BYTES = 20 * 1024 * 1024;
const MAX_CACHE_FILES = 3;
const MAX_SINGLE_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Resolve the host that serves /geo/* assets. The geo route lives at the
 * server root (not under /api/v1), so strip any API path suffix. An explicit
 * EXPO_PUBLIC_GEO_BASE_URL always wins.
 */
export function getGeoBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_GEO_BASE_URL;
  if (override) return override.replace(/\/+$/, '');
  return API_BASE_URL.replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/, '');
}

async function ensureDir(): Promise<void> {
  if (!FileSystem.cacheDirectory && !FileSystem.documentDirectory) {
    throw new Error('GEO_CACHE_UNAVAILABLE: No local cache or document directory is available.');
  }
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/** Best-effort removal of stale-version copies for a state. */
async function purgeOldVersions(code: string, keepFile: string): Promise<void> {
  try {
    const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const prefix = `${code}.`;
    await Promise.all(
      entries
        .filter((name) => name.startsWith(prefix) && name !== keepFile)
        .map((name) => FileSystem.deleteAsync(CACHE_DIR + name, { idempotent: true })),
    );
  } catch {
    /* Cache cleanup is best-effort; it must not reclassify source truth. */
  }
  await enforceCacheBudget(keepFile);
}

/** Bound offline geography to at most three state files / 20 MiB total. */
async function enforceCacheBudget(keepFile: string): Promise<void> {
  try {
    const names = (await FileSystem.readDirectoryAsync(CACHE_DIR)).filter((name) => name.endsWith('.json'));
    const records = await Promise.all(names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(CACHE_DIR + name);
      return {
        name,
        size: info.exists && 'size' in info ? Number(info.size ?? 0) : 0,
        modified: info.exists && 'modificationTime' in info ? Number(info.modificationTime ?? 0) : 0,
      };
    }));
    let totalBytes = records.reduce((sum, item) => sum + item.size, 0);
    let fileCount = records.length;
    const candidates = records.filter((item) => item.name !== keepFile).sort((a, b) => a.modified - b.modified);
    for (const item of candidates) {
      if (fileCount <= MAX_CACHE_FILES && totalBytes <= MAX_CACHE_BYTES) break;
      await FileSystem.deleteAsync(CACHE_DIR + item.name, { idempotent: true });
      fileCount -= 1;
      totalBytes -= item.size;
    }
  } catch {
    /* Storage pressure is observable elsewhere; cache cleanup remains non-fatal. */
  }
}

async function loadFromNetwork(
  code: string,
  fileName: string,
  version: string,
): Promise<GeoJSON.FeatureCollection | null> {
  const entry = getManifestEntry(code);
  if (!entry) return null;
  if (!entry.bundled && !isVerifiedRemoteStateGeoJSON(code)) {
    throw new Error(`GEOMETRY_UNAVAILABLE: ${code} lacks accepted source provenance; placeholder geometry is forbidden.`);
  }

  await ensureDir();
  const localFile = `${code}.${version}.json`;
  const localPath = CACHE_DIR + localFile;

  // Disk hit?
  const info = await FileSystem.getInfoAsync(localPath);
  if (!info.exists) {
    const v = version ? `?v=${version}` : '';
    const url = `${getGeoBaseUrl()}/geo/${entry.file}${v}`;
    const res = await FileSystem.downloadAsync(url, localPath);
    if (res.status !== 200) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      throw new Error(`Boundary download failed for ${code}: HTTP ${res.status}`);
    }
    const downloaded = await FileSystem.getInfoAsync(localPath);
    const downloadedBytes = downloaded.exists && 'size' in downloaded ? Number(downloaded.size ?? 0) : 0;
    if (downloadedBytes <= 0 || downloadedBytes > MAX_SINGLE_FILE_BYTES) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      throw new Error(`GEO_CACHE_BUDGET_EXCEEDED: ${code} geometry size ${downloadedBytes} exceeds the per-state limit.`);
    }
    await purgeOldVersions(code, localFile);
  }

  const text = await FileSystem.readAsStringAsync(localPath);
  const parsed = JSON.parse(text) as GeoJSON.FeatureCollection;
  return sanitizeGeoJSON(parsed);
}

/**
 * Fetch (or read from cache) the raw boundary GeoJSON for a streamed state.
 * Returns null when no manifest entry exists. Throws on network failure so the
 * caller can surface a retry affordance.
 */
export async function fetchStateGeoJSON(
  code: string,
  versionOverride?: string,
): Promise<GeoJSON.FeatureCollection | null> {
  const key = code.toUpperCase();
  const entry = getManifestEntry(key);
  if (!entry) return null;
  if (!entry.bundled && !isVerifiedRemoteStateGeoJSON(key)) {
    // Unverified or placeholder source assets are never fetched/cached.
    return null;
  }

  const version = versionOverride ?? entry.version ?? '';
  const cacheKey = `${key}_${version}`;

  const cached = memCache.get(cacheKey);
  if (cached) return cached;

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = loadFromNetwork(key, entry.file, version)
    .then((fc) => {
      if (fc) memCache.set(cacheKey, fc);
      return fc;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, promise);
  return promise;
}
