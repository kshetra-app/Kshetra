import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ConstituencyBrief } from '@kshetra/shared';
import { apiClient } from './api';
import { IS_LIVE_ENVIRONMENT } from './environment';
import {
  getUnifiedConstituenciesForState,
  toGeographyOnlyConstituency,
  type UnifiedConstituency,
} from './stateDataAdapter';

const DIRECTORY_TTL_MS = 5 * 60 * 1000;
const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

export type ConstituencyDirectoryStatus =
  | 'LOCAL_REFERENCE'
  | 'LOADING'
  | 'DATABASE_RECORDS'
  | 'STALE_DATABASE_RECORDS'
  | 'DATABASE_EMPTY'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE';

interface DirectoryCacheEntry {
  records: ConstituencyBrief[];
  fetchedAt: number;
}

interface DirectorySnapshot {
  stateCode: string;
  records?: ConstituencyBrief[];
  status: ConstituencyDirectoryStatus;
  error?: string;
}

const directoryCache = new Map<string, DirectoryCacheEntry>();
const directoryRequests = new Map<string, Promise<DirectoryCacheEntry>>();

export function validateConstituencyDirectoryResponse(stateCode: string, response: {
  state: string;
  count: number;
  data: ConstituencyBrief[];
}): ConstituencyBrief[] {
  if (response.state.toUpperCase() !== stateCode) {
    throw new Error(`Constituency response state mismatch for ${stateCode}`);
  }
  if (response.count !== response.data.length) {
    throw new Error(`Constituency response count mismatch for ${stateCode}`);
  }

  const seenAcNumbers = new Set<number>();
  for (const record of response.data) {
    if (record.stateCode.toUpperCase() !== stateCode || !Number.isInteger(record.acNo) || record.acNo <= 0) {
      throw new Error(`Invalid constituency identity in ${stateCode} response`);
    }
    if (seenAcNumbers.has(record.acNo)) {
      throw new Error(`Duplicate constituency number ${record.acNo} in ${stateCode} response`);
    }
    seenAcNumbers.add(record.acNo);
  }
  return response.data;
}

function loadDirectory(stateCode: string, force: boolean): Promise<DirectoryCacheEntry> {
  const cached = directoryCache.get(stateCode);
  if (!force && cached && Date.now() - cached.fetchedAt < DIRECTORY_TTL_MS) {
    return Promise.resolve(cached);
  }

  const pending = directoryRequests.get(stateCode);
  if (pending) return pending;

  const request = apiClient.constituencies.listConstituencies(stateCode)
    .then((response) => {
      const entry = {
        records: validateConstituencyDirectoryResponse(stateCode, response),
        fetchedAt: Date.now(),
      };
      directoryCache.set(stateCode, entry);
      return entry;
    })
    .finally(() => {
      directoryRequests.delete(stateCode);
    });

  directoryRequests.set(stateCode, request);
  return request;
}

/**
 * Overlay only canonical database officeholder fields on the bundled seat geography.
 * Election history and results remain unavailable unless a separate sourced API supplies them.
 */
export function mergeCanonicalConstituencies(
  geography: UnifiedConstituency[],
  records: ConstituencyBrief[],
): UnifiedConstituency[] {
  const recordsByAcNo = new Map(records.map((record) => [record.acNo, record]));
  const merged = geography.map((item) => {
    const geographyOnly = toGeographyOnlyConstituency(item);
    const record = recordsByAcNo.get(item.acNo);
    if (!record) return geographyOnly;

    return {
      ...geographyOnly,
      name: record.name || geographyOnly.name,
      district: record.district || geographyOnly.district,
      type: record.reservationStatus,
      winnerParty: '',
      winnerName: '',
      winnerVotes: null,
      runnerUp: '',
      runnerUpName: undefined,
      runnerUpVotes: undefined,
      margin: null,
      currentParty: record.currentParty.trim(),
      currentMLA: record.currentMLA.trim() || undefined,
      electionYear: null,
      byElection: undefined,
      officeholderStatus: 'UNRESOLVED' as const,
      projection: undefined,
      dataStatus: 'DATABASE_RECORDED' as const,
      isStale: false,
      termStatus: undefined,
    };
  });

  const knownAcNumbers = new Set(geography.map((item) => item.acNo));
  for (const record of records) {
    if (knownAcNumbers.has(record.acNo)) continue;
    merged.push({
      acNo: record.acNo,
      name: record.name,
      district: record.district,
      type: record.reservationStatus,
      stateCode: record.stateCode,
      winnerParty: '',
      winnerName: '',
      winnerVotes: null,
      runnerUp: '',
      runnerUpName: undefined,
      runnerUpVotes: undefined,
      margin: null,
      currentParty: record.currentParty.trim(),
      currentMLA: record.currentMLA.trim() || undefined,
      electionYear: null,
      byElection: undefined,
      officeholderStatus: 'UNRESOLVED',
      projection: undefined,
      dataStatus: 'DATABASE_RECORDED',
      isStale: false,
      termStatus: undefined,
    });
  }

  return merged.sort((a, b) => a.acNo - b.acNo);
}

export function useConstituencyDirectory(stateCode: string) {
  const code = stateCode.toUpperCase();
  const geography = useMemo(() => getUnifiedConstituenciesForState(code), [code]);
  const [revision, setRevision] = useState(0);
  const previousRevision = useRef(0);
  const [snapshot, setSnapshot] = useState<DirectorySnapshot>(() => ({
    stateCode: code,
    status: IS_LIVE_ENVIRONMENT ? (code === 'IN' ? 'NOT_APPLICABLE' : 'LOADING') : 'LOCAL_REFERENCE',
  }));

  useEffect(() => {
    let active = true;

    if (!IS_LIVE_ENVIRONMENT) {
      setSnapshot({ stateCode: code, status: 'LOCAL_REFERENCE' });
      return () => { active = false; };
    }
    if (code === 'IN') {
      setSnapshot({ stateCode: code, status: 'NOT_APPLICABLE' });
      return () => { active = false; };
    }

    const previous = directoryCache.get(code);
    const previousAge = previous ? Date.now() - previous.fetchedAt : Infinity;
    setSnapshot({
      stateCode: code,
      records: previous?.records,
      status: previous && previousAge < DIRECTORY_TTL_MS ?
        previous.records.length > 0 ? 'DATABASE_RECORDS' : 'DATABASE_EMPTY' : 'LOADING',
    });

    const force = revision > previousRevision.current;
    previousRevision.current = revision;
    loadDirectory(code, force)
      .then((entry) => {
        if (!active) return;
        setSnapshot({
          stateCode: code,
          records: entry.records,
          status: entry.records.length > 0 ? 'DATABASE_RECORDS' : 'DATABASE_EMPTY',
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const cached = directoryCache.get(code);
        const isUsableStale = cached && Date.now() - cached.fetchedAt <= MAX_STALE_MS;
        setSnapshot({
          stateCode: code,
          records: isUsableStale ? cached.records : undefined,
          status: isUsableStale ? 'STALE_DATABASE_RECORDS' : 'UNAVAILABLE',
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => { active = false; };
  }, [code, revision]);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    if (!IS_LIVE_ENVIRONMENT || code === 'IN') return;

    let wasActive = AppState.currentState === 'active';
    const subscription = AppState.addEventListener('change', (nextState) => {
      const isActive = nextState === 'active';
      if (isActive && !wasActive) refresh();
      wasActive = isActive;
    });
    const refreshInterval = setInterval(() => {
      const cached = directoryCache.get(code);
      if (
        AppState.currentState === 'active' &&
        (!cached || Date.now() - cached.fetchedAt >= DIRECTORY_TTL_MS)
      ) {
        refresh();
      }
    }, AUTO_REFRESH_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(refreshInterval);
    };
  }, [code, refresh]);

  const currentSnapshot = snapshot.stateCode === code ? snapshot : {
    stateCode: code,
    status: IS_LIVE_ENVIRONMENT ? (code === 'IN' ? 'NOT_APPLICABLE' as const : 'LOADING' as const) : 'LOCAL_REFERENCE' as const,
  };

  const constituencies = useMemo(() => {
    if (!IS_LIVE_ENVIRONMENT || currentSnapshot.status === 'NOT_APPLICABLE') return geography;
    if (!currentSnapshot.records) return geography;
    return mergeCanonicalConstituencies(geography, currentSnapshot.records);
  }, [currentSnapshot.records, currentSnapshot.status, geography]);

  return {
    constituencies,
    status: currentSnapshot.status,
    error: currentSnapshot.error,
    refresh,
  };
}
