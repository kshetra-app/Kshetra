/**
 * Remote boundary GeoJSON loader.
 *
 * Geometry is downloaded one state at a time. Verified, version-addressed
 * copies are kept in the durable document directory (not the OS-evictable
 * cache directory); the runtime cache is bounded and de-duplicates requests.
 */
import { createHash } from 'crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from './constants';
import { getManifestEntry } from './geoManifest';
import { sanitizeGeoJSON } from './geoLoader';

const memCache = new Map<string, GeoJSON.FeatureCollection>();
const inFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();
const MAX_MEMORY_STATES = 2;
const CACHE_ROOT = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
if (!CACHE_ROOT) {
  throw new Error('No writable file-system directory is available for geography cache.');
}
const CACHE_DIR = `${CACHE_ROOT}geo/`;

export function getGeoBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_GEO_BASE_URL;
  if (override) return override.replace(/\\/+$/, '');
  return API_BASE_URL.replace(/\\/+$/, '').replace(/\\/api(\\/v\\d+)?$/, '');
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
}

async function purgeOldVersions(code: string, keepFile: string): Promise<void> {
  try {
    const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
    await Promise.all(entries
      .filter((name) => name.startsWith(`${code}.`) && name !== keepFile)
      .map((name) => FileSystem.deleteAsync(CACHE_DIR + name, { idempotent: true })));
  } catch {
    // Cache cleanup is best-effort; load success must not depend on cleanup.
  }
}

function assertFeatureCollection(value: unknown, code: string): asserts value is GeoJSON.FeatureCollection {
  if (!value || typeof value !== 'object') throw new Error(`Invalid geometry payload for ${code}: not an object`);
  const candidate = value as Partial<GeoJSON.FeatureCollection>;
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    throw new Error(`Invalid geometry payload for ${code}: expected FeatureCollection`);
  }
  for (const feature of candidate.features) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry || !feature.properties) {
      throw new Error(`Invalid geometry payload for ${code}: malformed feature`);
    }
    const props = feature.properties as Record<string, unknown>;
    const featureCode = props.STATE_CODE;
    if (featureCode && String(featureCode).toUpperCase() !== code && code !== 'IN') {
      throw new Error(`Invalid geometry payload for ${code}: feature state ID mismatch`);
    }
  }
}

async function readVerified(localPath: string, code: string, expectedHash: string): Promise<GeoJSON.FeatureCollection> {
  const text = await FileSystem.readAsStringAsync(localPath);
  if (expectedHash) {
    const actualHash = createHash('sha1').update(text).digest('hex').slice(0, expectedHash.length);
    if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      throw new Error(`Geometry integrity check failed for ${code} (expected version ${expectedHash})`);
    }
  }
  const parsed: unknown = JSON.parse(text);
  assertFeatureCollection(parsed, code);
  if (parsed.features.length === 0) throw new Error(`Geometry dataset for ${code} is empty`);
  return sanitizeGeoJSON(parsed);
}

async function loadFromNetwork(code: string, version: string): Promise<GeoJSON.FeatureCollection | null> {
  const entry = getManifestEntry(code);
  if (!entry) return null;
  if (!entry.hasPolygons || entry.status === 'placeholder') {
    throw new Error(`Verified polygon geometry is unavailable for ${code}; no placeholder geometry will be rendered.`);
  }
  await ensureDir();
  const localFile = `${code}.${version || 'unversioned'}.json`;
  const localPath = CACHE_DIR + localFile;
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    try {
      return await readVerified(localPath, code, version);
    } catch {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
  }

  const url = `${getGeoBaseUrl()}/geo/${entry.file}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
  const tempPath = `${localPath}.part`;
  await FileSystem.deleteAsync(tempPath, { idempotent: true });
  const response = await FileSystem.downloadAsync(url, tempPath);
  if (response.status !== 200) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    throw new Error(`Geometry download failed for ${code}: HTTP ${response.status}`);
  }
  try {
    const checked = await readVerified(tempPath, code, version);
    await FileSystem.moveAsync({ from: tempPath, to: localPath });
    void purgeOldVersions(code, localFile);
    return checked;
  } catch (error) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    throw error;
  }
}

/** Fetch a state boundary or return a verified cached copy; null means no manifest entry. */
export async function fetchStateGeoJSON(code: string, versionOverride?: string): Promise<GeoJSON.FeatureCollection | null> {
  const key = code.toUpperCase();
  const entry = getManifestEntry(key);
  if (!entry) return null;
  if (!entry.hasPolygons || entry.status === 'placeholder') {
    throw new Error(`Verified polygon geometry is unavailable for ${key}; the app will not fabricate boundaries.`);
  }
  const version = versionOverride ?? entry.version ?? '';
  const cacheKey = `${key}_${version}`;
  const cached = memCache.get(cacheKey);
  if (cached) {
    // Touch insertion order for LRU.
    memCache.delete(cacheKey);
    memCache.set(cacheKey, cached);
    return cached;
  }
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = loadFromNetwork(key, version).then((fc) => {
    if (fc) {
      memCache.set(cacheKey, fc);
      while (memCache.size > MAX_MEMORY_STATES) {
        const oldest = memCache.keys().next().value;
        if (oldest === undefined) break;
        memCache.delete(oldest);
      }
    }
    return fc;
  }).finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, promise);
  return promise;
}
