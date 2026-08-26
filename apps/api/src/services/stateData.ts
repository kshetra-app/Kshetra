/**
 * State Data Service (API)
 *
 * Centralizes multi-state data access for Fastify API routes.
 * Maps state codes to their respective seed data and adapts them
 * into a unified ConstituencyBrief format for all 31 States & UTs.
 */
import type { ConstituencyBrief } from '@kshetra/shared';

// Core Seed Imports
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';
import { AP_CONSTITUENCIES } from '../../../../data/seed/andhra-pradesh-constituencies';
import { KA_CONSTITUENCIES } from '../../../../data/seed/karnataka-constituencies';
import { MH_CONSTITUENCIES } from '../../../../data/seed/maharashtra-constituencies';
import { TN_CONSTITUENCIES } from '../../../../data/seed/tamil-nadu-constituencies';
import { KL_CONSTITUENCIES } from '../../../../data/seed/kerala-constituencies';
import { WB_CONSTITUENCIES } from '../../../../data/seed/west-bengal-constituencies';
import { UP_CONSTITUENCIES } from '../../../../data/seed/uttar-pradesh-constituencies';
import { RJ_CONSTITUENCIES } from '../../../../data/seed/rajasthan-constituencies';
import { GJ_CONSTITUENCIES } from '../../../../data/seed/gujarat-constituencies';
import { JH_CONSTITUENCIES } from '../../../../data/seed/jharkhand-constituencies';
import { OD_CONSTITUENCIES } from '../../../../data/seed/odisha-constituencies';
import { DL_CONSTITUENCIES } from '../../../../data/seed/delhi-constituencies';
import { PB_CONSTITUENCIES } from '../../../../data/seed/punjab-constituencies';
import { HR_CONSTITUENCIES } from '../../../../data/seed/haryana-constituencies';
import { CG_CONSTITUENCIES } from '../../../../data/seed/chhattisgarh-constituencies';
import { MP_CONSTITUENCIES } from '../../../../data/seed/madhya-pradesh-constituencies';
import { BR_CONSTITUENCIES } from '../../../../data/seed/bihar-constituencies';
import { AS_CONSTITUENCIES } from '../../../../data/seed/assam-constituencies';
import { GA_CONSTITUENCIES } from '../../../../data/seed/goa-constituencies';
import { HP_CONSTITUENCIES } from '../../../../data/seed/himachal-pradesh-constituencies';
import { MN_CONSTITUENCIES } from '../../../../data/seed/manipur-constituencies';
import { ML_CONSTITUENCIES } from '../../../../data/seed/meghalaya-constituencies';
import { MZ_CONSTITUENCIES } from '../../../../data/seed/mizoram-constituencies';
import { NL_CONSTITUENCIES } from '../../../../data/seed/nagaland-constituencies';
import { TR_CONSTITUENCIES } from '../../../../data/seed/tripura-constituencies';
import { SK_CONSTITUENCIES } from '../../../../data/seed/sikkim-constituencies';
import { AR_CONSTITUENCIES } from '../../../../data/seed/arunachal-pradesh-constituencies';
import { UK_CONSTITUENCIES } from '../../../../data/seed/uttarakhand-constituencies';
import { PY_CONSTITUENCIES } from '../../../../data/seed/puducherry-constituencies';
import { JK_CONSTITUENCIES } from '../../../../data/seed/jammu-kashmir-constituencies';

import { TELANGANA_ELECTION_HISTORY } from '../../../../data/seed/telangana-election-history';
import { TELANGANA_MLA_PROFILES, getMLAProfile } from '../../../../data/seed/telangana-mla-profiles';

// Generic Mapper
function genericToBrief(stateCode: string, c: any): ConstituencyBrief {
  return {
    id: `${stateCode.toUpperCase()}-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: stateCode.toUpperCase(),
    district: c.district ?? '',
    reservationStatus: (c.type as 'GEN' | 'SC' | 'ST') ?? 'GEN',
    currentParty: c.winner2024 ?? c.winner2023 ?? c.winner2022 ?? c.winner2021 ?? c.winner ?? '',
    currentMLA: c.winnerName2024 ?? c.winnerName2023 ?? c.winnerName2022 ?? c.winnerName2021 ?? c.winnerName ?? '',
  };
}

export interface StateDataInfo {
  code: string;
  name: string;
  totalSeats: number;
  loadedCount: number;
  dataStatus: 'full' | 'stub' | 'planned';
  hasGeoJSON: boolean;
}

const STATE_RAW_MAP: Record<string, { name: string; total: number; data: any[] }> = {
  TS: { name: 'Telangana', total: 119, data: TELANGANA_CONSTITUENCIES },
  AP: { name: 'Andhra Pradesh', total: 175, data: AP_CONSTITUENCIES },
  KA: { name: 'Karnataka', total: 224, data: KA_CONSTITUENCIES },
  MH: { name: 'Maharashtra', total: 288, data: MH_CONSTITUENCIES },
  TN: { name: 'Tamil Nadu', total: 234, data: TN_CONSTITUENCIES },
  KL: { name: 'Kerala', total: 140, data: KL_CONSTITUENCIES },
  WB: { name: 'West Bengal', total: 294, data: WB_CONSTITUENCIES },
  UP: { name: 'Uttar Pradesh', total: 403, data: UP_CONSTITUENCIES },
  RJ: { name: 'Rajasthan', total: 200, data: RJ_CONSTITUENCIES },
  GJ: { name: 'Gujarat', total: 182, data: GJ_CONSTITUENCIES },
  JH: { name: 'Jharkhand', total: 81, data: JH_CONSTITUENCIES },
  OD: { name: 'Odisha', total: 147, data: OD_CONSTITUENCIES },
  DL: { name: 'Delhi', total: 70, data: DL_CONSTITUENCIES },
  PB: { name: 'Punjab', total: 117, data: PB_CONSTITUENCIES },
  HR: { name: 'Haryana', total: 90, data: HR_CONSTITUENCIES },
  CG: { name: 'Chhattisgarh', total: 90, data: CG_CONSTITUENCIES },
  MP: { name: 'Madhya Pradesh', total: 230, data: MP_CONSTITUENCIES },
  BR: { name: 'Bihar', total: 243, data: BR_CONSTITUENCIES },
  AS: { name: 'Assam', total: 126, data: AS_CONSTITUENCIES },
  GA: { name: 'Goa', total: 40, data: GA_CONSTITUENCIES },
  HP: { name: 'Himachal Pradesh', total: 68, data: HP_CONSTITUENCIES },
  MN: { name: 'Manipur', total: 60, data: MN_CONSTITUENCIES },
  ML: { name: 'Meghalaya', total: 60, data: ML_CONSTITUENCIES },
  MZ: { name: 'Mizoram', total: 40, data: MZ_CONSTITUENCIES },
  NL: { name: 'Nagaland', total: 60, data: NL_CONSTITUENCIES },
  TR: { name: 'Tripura', total: 60, data: TR_CONSTITUENCIES },
  SK: { name: 'Sikkim', total: 32, data: SK_CONSTITUENCIES },
  AR: { name: 'Arunachal Pradesh', total: 60, data: AR_CONSTITUENCIES },
  UK: { name: 'Uttarakhand', total: 70, data: UK_CONSTITUENCIES },
  PY: { name: 'Puducherry', total: 30, data: PY_CONSTITUENCIES },
  JK: { name: 'Jammu & Kashmir', total: 90, data: JK_CONSTITUENCIES },
};

/** Get info about a state's data availability */
export function getStateInfo(stateCode: string): StateDataInfo | null {
  const code = stateCode.toUpperCase();
  const entry = STATE_RAW_MAP[code];
  if (!entry) return null;
  return {
    code,
    name: entry.name,
    totalSeats: entry.total,
    loadedCount: entry.data.length,
    dataStatus: entry.data.length >= entry.total ? 'full' : 'stub',
    hasGeoJSON: true,
  };
}

/** Get all states with their data status */
export function getAllStatesInfo(): StateDataInfo[] {
  return Object.keys(STATE_RAW_MAP).map((code) => getStateInfo(code)!);
}

/** Check if a state has any constituency data */
export function isStateSupported(stateCode: string): boolean {
  return !!STATE_RAW_MAP[stateCode.toUpperCase()];
}

/** Get constituencies as ConstituencyBrief[] for any state */
export function getConstituencies(stateCode: string): ConstituencyBrief[] {
  const code = stateCode.toUpperCase();
  const entry = STATE_RAW_MAP[code];
  if (!entry) return [];
  return entry.data.map((c) => genericToBrief(code, c));
}

/** Get a single constituency by state + acNo */
export function getConstituency(stateCode: string, acNo: number): ConstituencyBrief | null {
  const all = getConstituencies(stateCode);
  return all.find((c) => c.acNo === acNo) ?? null;
}

/** Get raw constituency record with full election data */
export function getRawConstituency(stateCode: string, acNo: number): any | null {
  const code = stateCode.toUpperCase();
  const entry = STATE_RAW_MAP[code];
  if (!entry) return null;
  return entry.data.find((c) => c.acNo === acNo) ?? null;
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

export function getTSRawSeeds() {
  return TELANGANA_CONSTITUENCIES;
}

export function getTSElectionHistory() {
  return TELANGANA_ELECTION_HISTORY;
}

export function getTSMLAProfiles() {
  return TELANGANA_MLA_PROFILES;
}

export { getMLAProfile };
