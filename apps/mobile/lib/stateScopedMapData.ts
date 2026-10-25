/**
 * Versioned, state-scoped map metadata.
 *
 * This module contains no runtime imports from national seed files. It loads
 * only the selected state's metadata from the API, verifies the content
 * revision, and keeps a strictly bounded local cache for offline use.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './api';
import type { UnifiedConstituency } from './stateDataAdapter';
import type { TriviaItem } from '../../../data/seed/telangana-trivia';
import type { ConstituencyHistoryEntry } from './stateDataDispatcher';
import type { ConstituencyDemographics } from '../../../data/seed/telangana-demographics';
import type { MLAProfile } from '../../../data/seed/telangana-mla-profiles';

export const STATE_MAP_DATA_SCHEMA_VERSION = 1 as const;
export const MAX_CACHED_STATES = 3;
export const MAX_SINGLE_STATE_CACHE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_STATE_CACHE_BYTES = 6 * 1024 * 1024;

export type StateMapDataStatus = 'loading' | 'loaded' | 'cached' | 'offline' | 'unavailable' | 'error';

export interface StateMapConstituency extends UnifiedConstituency {
  /** Stable public ID; never synthesized from display name. */
  id: string;
}

export interface StateMapData {
  schemaVersion: typeof STATE_MAP_DATA_SCHEMA_VERSION;
  stateCode: string;
  revision: string;
  dataStatus: 'full' | 'stub' | 'planned';
  constituencies: StateMapConstituency[];
  availableYears: number[];
  trivia: TriviaItem[];
  triviaByAcNo: Record<string, TriviaItem[]>;
  historyByAcNo: Record<string, ConstituencyHistoryEntry[]>;
  demographicsByAcNo: Record<string, ConstituencyDemographics>;
  mlaProfilesByAcNo: Record<string, MLAProfile>;
  strongholdByAcNo: Record<string, boolean>;
  hasLocalBodyData: boolean;
  seatProjection: StateMapSeatProjection | null;
  censusDistricts: StateMapCensusDistrict[];
  hierarchyByAcNo: Record<string, StateMapHierarchyAvailability>;
}

export interface StateMapCensusDistrict {
  districtName: string;
  totalPopulation: number;
}

export interface StateMapSeatProjection {
  stateCode: string;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  population: number;
  popPerSeat: number;
  idealPopulationPerSeat?: number;
  outputClassification?: 'PANIN_SCENARIO';
  officialDelimitationOrder?: false;

}

export interface StateMapHierarchyAvailability {
  status: 'verified' | 'data_pending';
  hasHierarchyData: boolean;
  hasBoothData: boolean;
}

export interface StateMapDataSnapshot {
  status: StateMapDataStatus;
  data: StateMapData | null;
  error: string | null;
  updatedAt: number | null;
}

type CacheRecord = { fileName: string; revision: string; savedAt: number; bytes: number };
type CacheIndex = Record<string, CacheRecord>;
type Listener = (stateCode: string, snapshot: StateMapDataSnapshot) => void;

const memory = new Map<string, StateMapDataSnapshot>();
const inflight = new Map<string, Promise<StateMapDataSnapshot>>();
const listeners = new Set<Listener>();
const CACHE_ROOT = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}state-map-data/`
  : FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}state-map-data/`
    : null;
const INDEX_FILE = CACHE_ROOT ? `${CACHE_ROOT}index.json` : null;

function notify(code: string, snapshot: StateMapDataSnapshot): void {
  const key = code.toUpperCase();
  memory.delete(key);
  memory.set(key, snapshot);
  while (memory.size > MAX_CACHED_STATES) memory.delete(memory.keys().next().value!);
  for (const listener of listeners) listener(key, snapshot);
}

export function subscribeToStateMapData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedStateMapData(stateCode: string): StateMapDataSnapshot | null {
  return memory.get(stateCode.toUpperCase()) ?? null;
}

function validatePayload(value: unknown, requestedCode: string): StateMapData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid map-data response: expected an object');
  const item = value as Record<string, unknown>;
  if (item.schemaVersion !== STATE_MAP_DATA_SCHEMA_VERSION) throw new Error('Unsupported state map-data schema version');
  if (item.stateCode !== requestedCode) throw new Error('State map-data response code does not match the requested state');
  if (typeof item.revision !== 'string' || !/^[a-f0-9]{40}$/i.test(item.revision)) throw new Error('Map-data revision is missing or invalid');
  if (!['full', 'stub', 'planned'].includes(String(item.dataStatus))) throw new Error('Map-data status is invalid');
  if (!Array.isArray(item.constituencies) || !Array.isArray(item.availableYears) || !Array.isArray(item.trivia)) {
    throw new Error('Map-data response is missing required arrays');
  }
  if (!item.triviaByAcNo || typeof item.triviaByAcNo !== 'object' || Array.isArray(item.triviaByAcNo)) {
    throw new Error('Map-data trivia index is invalid');
  }
  if (!item.historyByAcNo || typeof item.historyByAcNo !== 'object' || Array.isArray(item.historyByAcNo)) {
    throw new Error('Map-data history index is invalid');
  }
  if (!item.demographicsByAcNo || typeof item.demographicsByAcNo !== 'object' || Array.isArray(item.demographicsByAcNo)) {
    throw new Error('Map-data demographics index is invalid');
  }
  if (!item.mlaProfilesByAcNo || typeof item.mlaProfilesByAcNo !== 'object' || Array.isArray(item.mlaProfilesByAcNo)) {
    throw new Error('Map-data MLA profile index is invalid');
  }
  if (!item.strongholdByAcNo || typeof item.strongholdByAcNo !== 'object' || Array.isArray(item.strongholdByAcNo)) {
    throw new Error('Map-data stronghold index is invalid');
  }
  if (typeof item.hasLocalBodyData !== 'boolean') throw new Error('Map-data local-body availability flag is invalid');
  if (!Array.isArray(item.censusDistricts)) throw new Error('Map-data Census district list is invalid');
  const censusDistricts = item.censusDistricts.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Invalid Census district row ${index}`);
    const row = entry as Record<string, unknown>;
    if (typeof row.districtName !== 'string' || !row.districtName.trim()
      || typeof row.totalPopulation !== 'number' || !Number.isFinite(row.totalPopulation) || row.totalPopulation <= 0) {
      throw new Error(`Invalid Census district values at row ${index}`);
    }
    return { districtName: row.districtName, totalPopulation: row.totalPopulation };
  });
  let seatProjection: StateMapSeatProjection | null = null;
  if (item.seatProjection != null) {
    if (typeof item.seatProjection !== 'object' || Array.isArray(item.seatProjection)) throw new Error('Map-data seat projection is invalid');
    const projection = item.seatProjection as Record<string, unknown>;
    if (projection.stateCode !== requestedCode
      || !Number.isInteger(projection.currentSeats) || !Number.isInteger(projection.projectedSeats)
      || !Number.isInteger(projection.seatChange) || typeof projection.population !== 'number'
      || typeof projection.popPerSeat !== 'number') {
      throw new Error('Map-data seat projection does not match the requested state or has invalid metrics');
    }
    seatProjection = projection as unknown as StateMapSeatProjection;
  }
  if (!item.hierarchyByAcNo || typeof item.hierarchyByAcNo !== 'object' || Array.isArray(item.hierarchyByAcNo)) {
    throw new Error('Map-data hierarchy availability index is invalid');
  }
  const hierarchyByAcNo: Record<string, StateMapHierarchyAvailability> = {};
  for (const [acKey, value] of Object.entries(item.hierarchyByAcNo)) {
    if (!/^\\d+$/.test(acKey) || !value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Map-data hierarchy index contains an invalid AC key');
    }
    const entry = value as Record<string, unknown>;
    if (!['verified', 'data_pending'].includes(String(entry.status))
      || typeof entry.hasHierarchyData !== 'boolean' || typeof entry.hasBoothData !== 'boolean') {
      throw new Error(`Map-data hierarchy availability is invalid for AC ${acKey}`);
    }
    hierarchyByAcNo[acKey] = {
      status: entry.status as StateMapHierarchyAvailability['status'],
      hasHierarchyData: entry.hasHierarchyData,
      hasBoothData: entry.hasBoothData,
    };
  }

  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();
  const constituencies = item.constituencies.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid constituency row ${index}`);
    const row = value as Record<string, unknown>;
    if (typeof row.acNo !== 'number' || !Number.isInteger(row.acNo) || row.acNo < 1) throw new Error(`Invalid canonical AC number at row ${index}`);
    const expectedId = `${requestedCode}-AC-${row.acNo}`;
    if (row.id !== expectedId) throw new Error(`Canonical constituency ID mismatch at row ${index}; expected ${expectedId}`);
    if (row.stateCode !== requestedCode) throw new Error(`State code mismatch in constituency ${expectedId}`);
    if (typeof row.name !== 'string' || !row.name.trim()) throw new Error(`Constituency name missing for ${expectedId}`);
    if (seenIds.has(expectedId) || seenNumbers.has(row.acNo)) throw new Error(`Duplicate canonical constituency ID ${expectedId}`);
    seenIds.add(expectedId);
    seenNumbers.add(row.acNo);
    return row as unknown as StateMapConstituency;
  });

  const data = {
    schemaVersion: STATE_MAP_DATA_SCHEMA_VERSION,
    stateCode: requestedCode,
    revision: item.revision,
    dataStatus: item.dataStatus as StateMapData['dataStatus'],
    constituencies,
    availableYears: item.availableYears.filter((year): year is number => typeof year === 'number' && Number.isInteger(year)).sort((a, b) => a - b),
    trivia: item.trivia as TriviaItem[],
    triviaByAcNo: item.triviaByAcNo as Record<string, TriviaItem[]>,
    historyByAcNo: item.historyByAcNo as Record<string, ConstituencyHistoryEntry[]>,
    demographicsByAcNo: item.demographicsByAcNo as Record<string, ConstituencyDemographics>,
    mlaProfilesByAcNo: item.mlaProfilesByAcNo as Record<string, MLAProfile>,
    strongholdByAcNo: item.strongholdByAcNo as Record<string, boolean>,
    hasLocalBodyData: item.hasLocalBodyData,
    seatProjection,
    censusDistricts,
    hierarchyByAcNo,
  };
  return data;
}

// Dependency-free SHA-1 so native payload verification doesn't add a crypto library to the mobile app.
export function sha1Hex(text: string): string {
  const bytes = Array.from(unescape(encodeURIComponent(text)), (character) => character.charCodeAt(0));
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (const n of [high, low]) bytes.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const rol = (v: number, n: number) => ((v << n) | (v >>> (32 - n))) >>> 0;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(80);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      words[i] = (((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0);
    }
    for (let i = 16; i < 80; i++) words[i] = rol(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rol(a, 5) + f + e + k + words[i]) >>> 0;
      e = d; d = c; c = rol(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((part) => part.toString(16).padStart(8, '0')).join('');
}

function verifyRevision(data: StateMapData): void {
  const { revision, ...content } = data;
  if (sha1Hex(JSON.stringify(content)) !== revision.toLowerCase()) {
    throw new Error(`State map-data integrity check failed for ${data.stateCode}`);
  }
}

async function readIndex(): Promise<CacheIndex> {
  if (!INDEX_FILE) return {};
  try {
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (!info.exists) return {};
    const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(INDEX_FILE));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as CacheIndex;
  } catch {
    return {};
  }
}

async function ensureCacheDirectory(): Promise<void> {
  if (!CACHE_ROOT) throw new Error('No writable local directory is available for offline map metadata');
  const info = await FileSystem.getInfoAsync(CACHE_ROOT);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_ROOT, { intermediates: true });
}

async function readDiskCache(code: string): Promise<{ data: StateMapData; updatedAt: number } | null> {
  if (!CACHE_ROOT) return null;
  const index = await readIndex();
  const record = index[code];
  if (!record || !record.fileName || !/^[A-Z]{2}\.[a-f0-9]{40}\.json$/.test(record.fileName)) return null;
  try {
    const text = await FileSystem.readAsStringAsync(CACHE_ROOT + record.fileName);
    const data = validatePayload(JSON.parse(text), code);
    verifyRevision(data);
    return { data, updatedAt: record.savedAt };
  } catch {
    return null;
  }
}

async function persistBoundedCache(data: StateMapData): Promise<number | null> {
  if (!CACHE_ROOT || !INDEX_FILE) return null;
  const serialized = JSON.stringify(data);
  const bytes = unescape(encodeURIComponent(serialized)).length;
  if (bytes > MAX_SINGLE_STATE_CACHE_BYTES) return null;
  await ensureCacheDirectory();
  const filename = `${data.stateCode}.${data.revision}.json`;
  const finalPath = CACHE_ROOT + filename;
  const tempPath = `${finalPath}.part`;
  await FileSystem.deleteAsync(tempPath, { idempotent: true });
  await FileSystem.writeAsStringAsync(tempPath, serialized);
  await FileSystem.moveAsync({ from: tempPath, to: finalPath });

  const index = await readIndex();
  const now = Date.now();
  // Drop superseded versions of this state's snapshot.
  for (const [code, record] of Object.entries(index)) {
    if (code === data.stateCode && record.fileName !== filename) {
      await FileSystem.deleteAsync(CACHE_ROOT + record.fileName, { idempotent: true });
      delete index[code];
    }
  }
  index[data.stateCode] = { fileName: filename, revision: data.revision, savedAt: now, bytes };
  const ranked = Object.entries(index).sort((a, b) => b[1].savedAt - a[1].savedAt);
  let totalBytes = 0;
  const keep: CacheIndex = {};
  let count = 0;
  for (const [code, record] of ranked) {
    if (count >= MAX_CACHED_STATES || totalBytes + record.bytes > MAX_TOTAL_STATE_CACHE_BYTES) {
      await FileSystem.deleteAsync(CACHE_ROOT + record.fileName, { idempotent: true });
      continue;
    }
    keep[code] = record;
    totalBytes += record.bytes;
    count++;
  }
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(keep));
  return now;
}

function canonicalErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const item = error as Record<string, unknown>;
  if (typeof item.status === 'number') return item.status;
  if (typeof item.statusCode === 'number') return item.statusCode;
  if (typeof item.httpStatus === 'number') return item.httpStatus;
  return null;
}

async function fetchStateMapData(code: string): Promise<StateMapData> {
  const response = await apiClient.get<unknown>(`/api/v1/states/${code}/map-data`, { authPolicy: 'public' });
  const data = validatePayload(response.data, code);
  verifyRevision(data);
  return data;
}

export async function loadStateScopedMapData(stateCode: string): Promise<StateMapDataSnapshot> {
  const code = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'IN') {
    const snapshot: StateMapDataSnapshot = { status: 'unavailable', data: null, error: 'Constituency metadata is not available for this map layer', updatedAt: null };
    notify(code, snapshot);
    return snapshot;
  }
  const existing = inflight.get(code);
  if (existing) return existing;
  const task = (async (): Promise<StateMapDataSnapshot> => {
    let cached = memory.get(code);
    if (!cached?.data) {
      const disk = await readDiskCache(code);
      if (disk) {
        cached = { status: 'cached', data: disk.data, error: null, updatedAt: disk.updatedAt };
        notify(code, cached);
      }
    }
    try {
      const data = await fetchStateMapData(code);
      const updatedAt = await persistBoundedCache(data);
      const fresh: StateMapDataSnapshot = { status: 'loaded', data, error: null, updatedAt };
      notify(code, fresh);
      return fresh;
    } catch (error) {
      if (canonicalErrorStatus(error) === 404) {
        const unavailable: StateMapDataSnapshot = { status: 'unavailable', data: null, error: 'State map data is not available from the API', updatedAt: null };
        notify(code, unavailable);
        return unavailable;
      }
      const oldData = cached?.data ?? null;
      const offline: StateMapDataSnapshot = {
        status: 'offline',
        data: oldData,
        error: error instanceof Error ? error.message : 'Network unavailable',
        updatedAt: cached?.updatedAt ?? null,
      };
      notify(code, offline);
      return offline;
    }
  })().finally(() => inflight.delete(code));
  inflight.set(code, task);
  return task;
}
