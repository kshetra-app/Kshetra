import { useEffect, useState } from 'react';
import { apiClient } from './api';
import { sha1Hex } from './stateScopedMapData';

export interface StateMapBooth {
  id: string;
  constituencyId: string;
  panchayatId?: string | null;
  boothNumber: number;
  nameEn: string;
  nameTe?: string;
  location?: { latitude: number; longitude: number } | null;
  totalVoters?: number;
  maleVoters?: number | null;
  femaleVoters?: number | null;
  thirdGenderVoters?: number | null;
  isUrban?: boolean;
  wardNumber?: string | number | null;
  historical?: boolean;
  sourceYear?: number | null;
}

export interface StateScopedBoothData {
  schemaVersion: 1;
  stateCode: string;
  acNo: number;
  revision: string;
  dataStatus: 'verified';
  booths: StateMapBooth[];
}

export type StateScopedBoothStatus = 'idle' | 'loading' | 'loaded' | 'cached' | 'offline' | 'unavailable';
export interface StateScopedBoothSnapshot {
  status: StateScopedBoothStatus;
  data: StateScopedBoothData | null;
  error: string | null;
}

const MAX_CACHED_CONSTITUENCIES = 2;
const cache = new Map<string, StateScopedBoothSnapshot>();
const inflight = new Map<string, Promise<StateScopedBoothSnapshot>>();
const listeners = new Set<(key: string, value: StateScopedBoothSnapshot) => void>();

function keyFor(stateCode: string, acNo: number): string {
  return `${stateCode.toUpperCase()}:${acNo}`;
}

function publish(key: string, snapshot: StateScopedBoothSnapshot): void {
  cache.delete(key);
  cache.set(key, snapshot);
  while (cache.size > MAX_CACHED_CONSTITUENCIES) cache.delete(cache.keys().next().value!);
  for (const listener of listeners) listener(key, snapshot);
}

export function subscribeToStateScopedBooths(listener: (key: string, value: StateScopedBoothSnapshot) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedStateScopedBooths(stateCode: string, acNo: number): StateScopedBoothSnapshot | null {
  if (!Number.isSafeInteger(acNo) || acNo < 1) return null;
  return cache.get(keyFor(stateCode, acNo)) ?? null;
}

function validateBoothPayload(value: unknown, requestedCode: string, requestedAcNo: number): StateScopedBoothData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid booth response');
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1 || raw.stateCode !== requestedCode || raw.acNo !== requestedAcNo || raw.dataStatus !== 'verified') {
    throw new Error('Booth response does not match the requested constituency');
  }
  if (typeof raw.revision !== 'string' || !/^[a-f0-9]{40}$/i.test(raw.revision) || !Array.isArray(raw.booths)) {
    throw new Error('Booth response revision or list is invalid');
  }
  const seen = new Set<string>();
  const booths = raw.booths.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid booth at index ${index}`);
    const booth = value as Record<string, unknown>;
    if (typeof booth.id !== 'string' || !booth.id || seen.has(booth.id)
      || booth.constituencyId !== `${requestedCode}-AC-${requestedAcNo}`
      || typeof booth.boothNumber !== 'number' || !Number.isInteger(booth.boothNumber) || booth.boothNumber < 1
      || typeof booth.nameEn !== 'string' || !booth.nameEn.trim()) {
      throw new Error(`Invalid or non-canonical booth at index ${index}`);
    }
    seen.add(booth.id);
    if (booth.location != null) {
      const location = booth.location as Record<string, unknown>;
      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number'
        || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
        || location.latitude < -90 || location.latitude > 90
        || location.longitude < -180 || location.longitude > 180) {
        throw new Error(`Invalid booth coordinates at index ${index}`);
      }
    }
    return booth as unknown as StateMapBooth;
  });
  const core = { schemaVersion: 1 as const, stateCode: requestedCode, acNo: requestedAcNo, dataStatus: 'verified' as const, booths };
  if (sha1Hex(JSON.stringify(core)) !== raw.revision.toLowerCase()) throw new Error('Booth payload integrity check failed');
  return { ...core, revision: raw.revision };
}

function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const item = error as Record<string, unknown>;
  for (const value of [item.status, item.statusCode, item.httpStatus]) if (typeof value === 'number') return value;
  return null;
}

/** Request booths only after a selected constituency has authoritative booth availability. */
export async function loadStateScopedBooths(stateCode: string, acNo: number): Promise<StateScopedBoothSnapshot> {
  const code = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || !Number.isSafeInteger(acNo) || acNo < 1) {
    return { status: 'unavailable', data: null, error: 'Invalid state or constituency identifier' };
  }
  const key = keyFor(code, acNo);
  const cached = cache.get(key);
  if (inflight.has(key)) return inflight.get(key)!;
  const task = (async () => {
    if (cached?.data) publish(key, { status: 'cached', data: cached.data, error: null });
    else publish(key, { status: 'loading', data: null, error: null });
    try {
      const response = await apiClient.get<unknown>(`/api/v1/states/${code}/constituencies/${acNo}/booths`, { authPolicy: 'public' });
      const data = validateBoothPayload(response.data, code, acNo);
      const loaded = { status: 'loaded' as const, data, error: null };
      publish(key, loaded);
      return loaded;
    } catch (error) {
      if (httpStatus(error) === 404) {
        const unavailable = { status: 'unavailable' as const, data: null, error: 'No verified booth data is available for this constituency' };
        publish(key, unavailable);
        return unavailable;
      }
      const snapshot = cache.get(key);
      const offline = {
        status: 'offline' as const,
        data: snapshot?.data ?? cached?.data ?? null,
        error: error instanceof Error ? error.message : 'Network unavailable',
      };
      publish(key, offline);
      return offline;
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}

const idle = (): StateScopedBoothSnapshot => ({ status: 'idle', data: null, error: null });

/** React hook for lazy selected-constituency booth loads with bounded hot cache. */
export function useStateScopedBooths(stateCode: string, acNo: number | null, enabled: boolean): StateScopedBoothSnapshot {
  const code = stateCode.toUpperCase();
  const [snapshot, setSnapshot] = useState<StateScopedBoothSnapshot>(() => acNo ? getCachedStateScopedBooths(code, acNo) ?? idle() : idle());
  useEffect(() => {
    let active = true;
    if (!enabled || acNo == null) {
      setSnapshot(acNo ? getCachedStateScopedBooths(code, acNo) ?? idle() : idle());
      return () => { active = false; };
    }
    const key = keyFor(code, acNo);
    setSnapshot(getCachedStateScopedBooths(code, acNo) ?? { status: 'loading', data: null, error: null });
    const unsubscribe = subscribeToStateScopedBooths((updatedKey, next) => {
      if (active && updatedKey === key) setSnapshot(next);
    });
    void loadStateScopedBooths(code, acNo).then((next) => { if (active) setSnapshot(next); });
    return () => { active = false; unsubscribe(); };
  }, [code, acNo, enabled]);
  return snapshot;
}
