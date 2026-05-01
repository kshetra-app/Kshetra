/**
 * State Data Adapter
 *
 * Normalizes constituency data from different state seed formats into
 * a unified ConstituencyBrief for cross-state UI components.
 */
import type { ConstituencyBrief } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
  AP_CONSTITUENCIES,
  type APConstituencySeed,
  KA_CONSTITUENCIES,
  type KAConstituencySeed,
  MH_CONSTITUENCIES,
  type MHConstituencySeed,
  TN_CONSTITUENCIES,
  type TNConstituencySeed,
  KL_CONSTITUENCIES,
  type KLConstituencySeed,
  WB_CONSTITUENCIES,
  type WBConstituencySeed,
  UP_CONSTITUENCIES,
  type UPConstituencySeed,
} from './data';

// ─── Unified Constituency ─────────────────────────────────────────────────

/** State-agnostic constituency shape used by Explore, Map, and Search UIs */
export interface UnifiedConstituency {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  stateCode: string;
  /** Winning party in the most recent election */
  winnerParty: string;
  winnerName: string;
  winnerVotes: number;
  runnerUp: string;
  margin: number;
  /** Current party (may differ from winnerParty due to defections) */
  currentParty: string;
  /** Year of the election result data */
  electionYear: number;
}

/** Normalize all 8 states' seed data into UnifiedConstituency[] */
export function getUnifiedConstituenciesForState(stateCode: string): UnifiedConstituency[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return TELANGANA_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'TS',
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUp: c.runnerUp2023,
        margin: c.margin2023,
        currentParty: c.currentParty ?? c.winner2023,
        electionYear: 2023,
      }));
    case 'AP':
      return AP_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'AP',
        winnerParty: c.winner2024,
        winnerName: c.winnerName2024,
        winnerVotes: c.winnerVotes2024,
        runnerUp: c.runnerUp2024,
        margin: c.margin2024,
        currentParty: c.currentParty ?? c.winner2024,
        electionYear: 2024,
      }));
    case 'KA':
      return KA_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'KA',
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUp: c.runnerUp2023,
        margin: c.margin2023,
        currentParty: c.currentParty ?? c.winner2023,
        electionYear: 2023,
      }));
    case 'MH':
      return MH_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'MH',
        winnerParty: c.winner2024,
        winnerName: c.winnerName2024,
        winnerVotes: c.winnerVotes2024,
        runnerUp: c.runnerUp2024,
        margin: c.margin2024,
        currentParty: c.currentParty ?? c.winner2024,
        electionYear: 2024,
      }));
    case 'TN':
      return TN_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'TN',
        winnerParty: c.winner2021,
        winnerName: c.winnerName2021,
        winnerVotes: c.winnerVotes2021,
        runnerUp: c.runnerUp2021,
        margin: c.margin2021,
        currentParty: c.currentParty ?? c.winner2021,
        electionYear: 2021,
      }));
    case 'KL':
      return KL_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'KL',
        winnerParty: c.winner2021,
        winnerName: c.winnerName2021,
        winnerVotes: c.winnerVotes2021,
        runnerUp: c.runnerUp2021,
        margin: c.margin2021,
        currentParty: c.currentParty ?? c.winner2021,
        electionYear: 2021,
      }));
    case 'WB':
      return WB_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'WB',
        winnerParty: c.winner2021,
        winnerName: c.winnerName2021,
        winnerVotes: c.winnerVotes2021,
        runnerUp: c.runnerUp2021,
        margin: c.margin2021,
        currentParty: c.currentParty ?? c.winner2021,
        electionYear: 2021,
      }));
    case 'UP':
      return UP_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'UP',
        winnerParty: c.winner2022,
        winnerName: c.winnerName2022,
        winnerVotes: c.winnerVotes2022,
        runnerUp: c.runnerUp2022,
        margin: c.margin2022,
        currentParty: c.currentParty ?? c.winner2022,
        electionYear: 2022,
      }));
    default:
      return [];
  }
}

// ─── ConstituencyBrief adapters (for shared types) ───────────────────────

/** Adapt Telangana seed → ConstituencyBrief */
function tsAdapter(c: ConstituencySeed): ConstituencyBrief {
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

/** Adapt AP seed → ConstituencyBrief */
function apAdapter(c: APConstituencySeed): ConstituencyBrief {
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

/** Adapt KA seed → ConstituencyBrief */
function kaAdapter(c: KAConstituencySeed): ConstituencyBrief {
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

/** Adapt MH seed → ConstituencyBrief */
function mhAdapter(c: MHConstituencySeed): ConstituencyBrief {
  return {
    id: `MH-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'MH',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2024,
    currentMLA: c.winnerName2024,
  };
}

/** Adapt TN seed → ConstituencyBrief */
function tnAdapter(c: TNConstituencySeed): ConstituencyBrief {
  return {
    id: `TN-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'TN',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2021,
    currentMLA: c.winnerName2021,
  };
}

/** Adapt KL seed → ConstituencyBrief */
function klAdapter(c: KLConstituencySeed): ConstituencyBrief {
  return {
    id: `KL-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'KL',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2021,
    currentMLA: c.winnerName2021,
  };
}

/** Adapt WB seed → ConstituencyBrief */
function wbAdapter(c: WBConstituencySeed): ConstituencyBrief {
  return {
    id: `WB-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'WB',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2021,
    currentMLA: c.winnerName2021,
  };
}

/** Adapt UP seed → ConstituencyBrief */
function upAdapter(c: UPConstituencySeed): ConstituencyBrief {
  return {
    id: `UP-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'UP',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2022,
    currentMLA: c.winnerName2022,
  };
}

/** Get all constituencies for a given state code as ConstituencyBrief[] */
export function getConstituenciesForState(stateCode: string): ConstituencyBrief[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return TELANGANA_CONSTITUENCIES.map(tsAdapter);
    case 'AP':
      return AP_CONSTITUENCIES.map(apAdapter);
    case 'KA':
      return KA_CONSTITUENCIES.map(kaAdapter);
    case 'MH':
      return MH_CONSTITUENCIES.map(mhAdapter);
    case 'TN':
      return TN_CONSTITUENCIES.map(tnAdapter);
    case 'KL':
      return KL_CONSTITUENCIES.map(klAdapter);
    case 'WB':
      return WB_CONSTITUENCIES.map(wbAdapter);
    case 'UP':
      return UP_CONSTITUENCIES.map(upAdapter);
    default:
      return [];
  }
}

/** Get a single constituency brief by state + acNo */
export function getConstituencyBrief(stateCode: string, acNo: number): ConstituencyBrief | null {
  const all = getConstituenciesForState(stateCode);
  return all.find((c) => c.acNo === acNo) ?? null;
}

/** Get total constituency count for a state's loaded data */
export function getLoadedConstituencyCount(stateCode: string): number {
  switch (stateCode.toUpperCase()) {
    case 'TS': return TELANGANA_CONSTITUENCIES.length;
    case 'AP': return AP_CONSTITUENCIES.length;
    case 'KA': return KA_CONSTITUENCIES.length;
    case 'MH': return MH_CONSTITUENCIES.length;
    case 'TN': return TN_CONSTITUENCIES.length;
    case 'KL': return KL_CONSTITUENCIES.length;
    case 'WB': return WB_CONSTITUENCIES.length;
    case 'UP': return UP_CONSTITUENCIES.length;
    default: return 0;
  }
}

/** Check if a state has full data (all constituencies) vs stub (partial) */
export function hasFullData(stateCode: string): boolean {
  switch (stateCode.toUpperCase()) {
    case 'TS': return true;   // 119/119
    case 'AP': return true;   // 175/175
    case 'KA': return true;   // 224/224
    case 'MH': return true;   // 288/288
    case 'TN': return true;   // 234/234
    case 'KL': return true;   // 140/140
    case 'WB': return true;   // 293/294
    case 'UP': return true;   // 401/403
    default: return false;
  }
}
