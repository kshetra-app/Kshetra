/**
 * State Data Service
 *
 * Centralizes multi-state data access for API routes.
 * Maps state codes to their respective seed data and adapts them
 * into a unified ConstituencyBrief format.
 */
import type { ConstituencyBrief } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../../data/seed/telangana-constituencies';
import {
  AP_CONSTITUENCIES,
  type APConstituencySeed,
} from '../../../../data/seed/andhra-pradesh-constituencies';
import {
  KA_CONSTITUENCIES,
  type KAConstituencySeed,
} from '../../../../data/seed/karnataka-constituencies';
import {
  TELANGANA_ELECTION_HISTORY,
} from '../../../../data/seed/telangana-election-history';
import {
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
} from '../../../../data/seed/telangana-mla-profiles';

// ── Adapters ────────────────────────────────────────────────────────────────

function tsToBrief(c: ConstituencySeed): ConstituencyBrief {
  return {
    id: `TS-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'TS',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2023,
    currentMLA: c.winnerName2023,
  };
}

function apToBrief(c: APConstituencySeed): ConstituencyBrief {
  return {
    id: `AP-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'AP',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2024,
    currentMLA: c.winnerName2024,
  };
}

function kaToBrief(c: KAConstituencySeed): ConstituencyBrief {
  return {
    id: `KA-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'KA',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2023,
    currentMLA: c.winnerName2023,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface StateDataInfo {
  code: string;
  name: string;
  totalSeats: number;
  loadedCount: number;
  dataStatus: 'full' | 'stub' | 'planned';
  hasGeoJSON: boolean;
}

const STATE_INFO: Record<string, StateDataInfo> = {
  TS: { code: 'TS', name: 'Telangana', totalSeats: 119, loadedCount: 119, dataStatus: 'full', hasGeoJSON: true },
  AP: { code: 'AP', name: 'Andhra Pradesh', totalSeats: 175, loadedCount: 25, dataStatus: 'stub', hasGeoJSON: false },
  KA: { code: 'KA', name: 'Karnataka', totalSeats: 224, loadedCount: 25, dataStatus: 'stub', hasGeoJSON: false },
  MH: { code: 'MH', name: 'Maharashtra', totalSeats: 288, loadedCount: 0, dataStatus: 'planned', hasGeoJSON: false },
};

/** Get info about a state's data availability */
export function getStateInfo(stateCode: string): StateDataInfo | null {
  return STATE_INFO[stateCode.toUpperCase()] ?? null;
}

/** Get all states with their data status */
export function getAllStatesInfo(): StateDataInfo[] {
  return Object.values(STATE_INFO);
}

/** Check if a state has any constituency data */
export function isStateSupported(stateCode: string): boolean {
  const info = STATE_INFO[stateCode.toUpperCase()];
  return !!info && info.dataStatus !== 'planned';
}

/** Get constituencies as ConstituencyBrief[] for any supported state */
export function getConstituencies(stateCode: string): ConstituencyBrief[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return TELANGANA_CONSTITUENCIES.map(tsToBrief);
    case 'AP':
      return AP_CONSTITUENCIES.map(apToBrief);
    case 'KA':
      return KA_CONSTITUENCIES.map(kaToBrief);
    default:
      return [];
  }
}

/** Get a single constituency by state + acNo */
export function getConstituency(stateCode: string, acNo: number): ConstituencyBrief | null {
  const all = getConstituencies(stateCode);
  return all.find((c) => c.acNo === acNo) ?? null;
}

/** Search constituencies across a state */
export function searchConstituencies(
  stateCode: string,
  query: string,
): ConstituencyBrief[] {
  const all = getConstituencies(stateCode);
  const q = query.toLowerCase();
  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.currentMLA.toLowerCase().includes(q) ||
      String(c.acNo).includes(q),
  );
}

/** Get raw Telangana seed (for backwards compat with existing routes) */
export function getTSRawSeeds() {
  return TELANGANA_CONSTITUENCIES;
}

export function getTSElectionHistory() {
  return TELANGANA_ELECTION_HISTORY;
}

export function getTSMLAProfiles() {
  return TELANGANA_MLA_PROFILES;
}

export { getMLAProfile } from '../../../../data/seed/telangana-mla-profiles';
