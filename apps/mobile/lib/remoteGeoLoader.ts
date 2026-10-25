/**
 * Remote boundary GeoJSON loader.
 *
 * Geometry is downloaded one state at a time. Verified, version-addressed
 * copies are kept in the durable document directory (not the OS-evictable
 * cache directory); the runtime cache is bounded and de-duplicates requests.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getManifestEntry } from './geoManifest';
import { API_BASE_URL } from './constants';
import { sanitizeGeoJSON } from './geoLoader';

const memCache = new Map<string, GeoJSON.FeatureCollection>();
const inFlight = new Map<string, Promise<GeoJSON.FeatureCollection | null>>();
const MAX_MEMORY_STATES = 2;
const MAX_PERSISTED_GEOMETRY_STATES = 3;
const CACHE_ROOT = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
if (!CACHE_ROOT) {
  throw new Error('No writable file-system directory is available for geography cache.');
}
const CACHE_DIR = `${CACHE_ROOT}geo/`;

export function getGeoBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_GEO_BASE_URL;
  if (override) return override.replace(/\/+$/, '');
  return API_BASE_URL.replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/, '');
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

async function trimPersistedGeometry(): Promise<void> {
  try {
    const names = (await FileSystem.readDirectoryAsync(CACHE_DIR))
      .filter((name) => /^[A-Z]{2}\.(?:[a-f0-9]{12,40}|unversioned)\.json$/i.test(name));
    const files = await Promise.all(names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(CACHE_DIR + name);
      return {
        name,
        stateCode: name.split('.')[0],
        modifiedAt: info.exists && typeof info.modificationTime === 'number' ? info.modificationTime : 0,
      };
    }));
    files.sort((a, b) => b.modifiedAt - a.modifiedAt);
    const keepStates = new Set<string>();
    for (const file of files) {
      if (keepStates.has(file.stateCode)) {
        await FileSystem.deleteAsync(CACHE_DIR + file.name, { idempotent: true });
        continue;
      }
      if (keepStates.size >= MAX_PERSISTED_GEOMETRY_STATES) {
        await FileSystem.deleteAsync(CACHE_DIR + file.name, { idempotent: true });
        continue;
      }
      keepStates.add(file.stateCode);
    }
  } catch {
    // A cache trim failure must never invalidate the already verified payload.
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

async function hashTextSha1Prefix(text: string, length: number): Promise<string> {
  // Small, dependency-free SHA-1 implementation for React Native. Geography
  // payloads are verified once at download and again on cache reuse.
  const bytes = Array.from(new TextEncoder().encode(text));
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (const n of [high, low]) {
    bytes.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  }
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const rol = (v: number, n: number) => ((v << n) | (v >>> (32 - n))) >>> 0;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0);
    }
    for (let i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rol(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rol(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map(v => v.toString(16).padStart(8, '0')).join('').slice(0, length);
}

async function readVerified(localPath: string, code: string, expectedHash: string): Promise<GeoJSON.FeatureCollection> {
  const text = await FileSystem.readAsStringAsync(localPath);
  if (expectedHash) {
    // The immutable version in the API manifest is checked by exact expected
    // content when the cache is first written. Reuse validation also checks
    // valid GeoJSON structure below; do not import Node crypto into React Native.
    const actualHash = await hashTextSha1Prefix(text, expectedHash.length);
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
    await purgeOldVersions(code, localFile);
    await trimPersistedGeometry();
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
