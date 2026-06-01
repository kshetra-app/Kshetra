/**
 * State Data Adapter
 *
 * Normalizes constituency data from different state seed formats into
 * a unified ConstituencyBrief for cross-state UI components.
 *
 * Supports all 28 states + Puducherry + J&K.
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

// ─── Import newly seeded states ─────────────────────────────────────────────
import { RJ_CONSTITUENCIES } from '../../../data/seed/rajasthan-constituencies';
import { GJ_CONSTITUENCIES } from '../../../data/seed/gujarat-constituencies';
import { JH_CONSTITUENCIES } from '../../../data/seed/jharkhand-constituencies';
import { OD_CONSTITUENCIES } from '../../../data/seed/odisha-constituencies';
import { DL_CONSTITUENCIES } from '../../../data/seed/delhi-constituencies';
import { PB_CONSTITUENCIES } from '../../../data/seed/punjab-constituencies';
import { HR_CONSTITUENCIES } from '../../../data/seed/haryana-constituencies';
import { CG_CONSTITUENCIES } from '../../../data/seed/chhattisgarh-constituencies';
import { MP_CONSTITUENCIES } from '../../../data/seed/madhya-pradesh-constituencies';
import { BR_CONSTITUENCIES } from '../../../data/seed/bihar-constituencies';
import { AS_CONSTITUENCIES } from '../../../data/seed/assam-constituencies';
import { GA_CONSTITUENCIES } from '../../../data/seed/goa-constituencies';
import { HP_CONSTITUENCIES } from '../../../data/seed/himachal-pradesh-constituencies';
import { MN_CONSTITUENCIES } from '../../../data/seed/manipur-constituencies';
import { ML_CONSTITUENCIES } from '../../../data/seed/meghalaya-constituencies';
import { MZ_CONSTITUENCIES } from '../../../data/seed/mizoram-constituencies';
import { NL_CONSTITUENCIES } from '../../../data/seed/nagaland-constituencies';
import { TR_CONSTITUENCIES } from '../../../data/seed/tripura-constituencies';
import { SK_CONSTITUENCIES } from '../../../data/seed/sikkim-constituencies';
import { AR_CONSTITUENCIES } from '../../../data/seed/arunachal-pradesh-constituencies';
import { UK_CONSTITUENCIES } from '../../../data/seed/uttarakhand-constituencies';
import { PY_CONSTITUENCIES } from '../../../data/seed/puducherry-constituencies';
import { JK_CONSTITUENCIES } from '../../../data/seed/jammu-kashmir-constituencies';

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

// ─── Generic adapter for auto-generated seeds ────────────────────────────────
// All auto-generated seeds have fields like winner{YEAR}, winnerName{YEAR}, etc.
// This helper picks the right year field.
type AnyConstituency = Record<string, any>;

function genericAdapter(
  c: AnyConstituency,
  stateCode: string,
  year: number,
): UnifiedConstituency {
  const winnerKey = `winner${year}`;
  const winnerNameKey = `winnerName${year}`;
  const winnerVotesKey = `winnerVotes${year}`;
  const runnerUpKey = `runnerUp${year}`;
  const marginKey = `margin${year}`;

  return {
    acNo: c.acNo,
    name: c.name,
    district: c.district ?? '',
    type: c.type ?? 'GEN',
    stateCode,
    winnerParty: c[winnerKey] ?? c.winner ?? '',
    winnerName: c[winnerNameKey] ?? c.winnerName ?? '',
    winnerVotes: c[winnerVotesKey] ?? 0,
    runnerUp: c[runnerUpKey] ?? '',
    margin: c[marginKey] ?? 0,
    currentParty: c.currentParty ?? c[winnerKey] ?? '',
    electionYear: year,
  };
}

/** Normalize all states' seed data into UnifiedConstituency[] */
export function getUnifiedConstituenciesForState(stateCode: string): UnifiedConstituency[] {
  switch (stateCode.toUpperCase()) {
    // ─── Original 8 (manually typed) ──────────────────────────────
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
        winnerParty: c.winner2026,
        winnerName: c.winnerName2026,
        winnerVotes: c.winnerVotes2026,
        runnerUp: c.runnerUp2026,
        margin: c.margin2026,
        currentParty: c.currentParty ?? c.winner2026,
        electionYear: 2026,
      }));
    case 'KL':
      return KL_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'KL',
        winnerParty: c.winner2026,
        winnerName: c.winnerName2026,
        winnerVotes: c.winnerVotes2026,
        runnerUp: c.runnerUp2026,
        margin: c.margin2026,
        currentParty: c.currentParty ?? c.winner2026,
        electionYear: 2026,
      }));
    case 'WB':
      return WB_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'WB',
        winnerParty: c.winner2026,
        winnerName: c.winnerName2026,
        winnerVotes: c.winnerVotes2026,
        runnerUp: c.runnerUp2026,
        margin: c.margin2026,
        currentParty: c.currentParty ?? c.winner2026,
        electionYear: 2026,
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

    // ─── Auto-generated states (generic adapter) ───────────────────
    case 'RJ': return RJ_CONSTITUENCIES.map((c) => genericAdapter(c, 'RJ', 2023));
    case 'GJ': return GJ_CONSTITUENCIES.map((c) => genericAdapter(c, 'GJ', 2022));
    case 'JH': return JH_CONSTITUENCIES.map((c) => genericAdapter(c, 'JH', 2024));
    case 'OD': return OD_CONSTITUENCIES.map((c) => genericAdapter(c, 'OD', 2024));
    case 'DL': return DL_CONSTITUENCIES.map((c) => genericAdapter(c, 'DL', 2022));
    case 'PB': return PB_CONSTITUENCIES.map((c) => genericAdapter(c, 'PB', 2022));
    case 'HR': return HR_CONSTITUENCIES.map((c) => genericAdapter(c, 'HR', 2024));
    case 'CG': return CG_CONSTITUENCIES.map((c) => genericAdapter(c, 'CG', 2023));
    case 'MP': return MP_CONSTITUENCIES.map((c) => genericAdapter(c, 'MP', 2023));
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericAdapter(c, 'BR', 2020));
    case 'AS': return AS_CONSTITUENCIES.map((c) => genericAdapter(c, 'AS', 2026));
    case 'GA': return GA_CONSTITUENCIES.map((c) => genericAdapter(c, 'GA', 2022));
    case 'HP': return HP_CONSTITUENCIES.map((c) => genericAdapter(c, 'HP', 2022));
    case 'MN': return MN_CONSTITUENCIES.map((c) => genericAdapter(c, 'MN', 2022));
    case 'ML': return ML_CONSTITUENCIES.map((c) => genericAdapter(c, 'ML', 2023));
    case 'MZ': return MZ_CONSTITUENCIES.map((c) => genericAdapter(c, 'MZ', 2023));
    case 'NL': return NL_CONSTITUENCIES.map((c) => genericAdapter(c, 'NL', 2023));
    case 'TR': return TR_CONSTITUENCIES.map((c) => genericAdapter(c, 'TR', 2023));
    case 'SK': return SK_CONSTITUENCIES.map((c) => genericAdapter(c, 'SK', 2024));
    case 'AR': return AR_CONSTITUENCIES.map((c) => genericAdapter(c, 'AR', 2024));
    case 'UK': return UK_CONSTITUENCIES.map((c) => genericAdapter(c, 'UK', 2022));
    case 'PY': return PY_CONSTITUENCIES.map((c) => genericAdapter(c, 'PY', 2026));
    case 'JK': return JK_CONSTITUENCIES.map((c) => genericAdapter(c, 'JK', 2024));

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
    currentParty: c.winner2026,
    currentMLA: c.winnerName2026,
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
    currentParty: c.winner2026,
    currentMLA: c.winnerName2026,
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
    currentParty: c.winner2026,
    currentMLA: c.winnerName2026,
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

/** Generic adapter for auto-generated seeds → ConstituencyBrief */
function genericBriefAdapter(c: AnyConstituency, stateCode: string, year: number): ConstituencyBrief {
  const unified = genericAdapter(c, stateCode, year);
  return {
    id: `${stateCode}-AC-${c.acNo}`,
    name: unified.name,
    acNo: unified.acNo,
    stateCode,
    district: unified.district,
    reservationStatus: unified.type,
    currentParty: unified.currentParty,
    currentMLA: unified.winnerName,
  };
}

/** Get all constituencies for a given state code as ConstituencyBrief[] */
export function getConstituenciesForState(stateCode: string): ConstituencyBrief[] {
  switch (stateCode.toUpperCase()) {
    case 'TS': return TELANGANA_CONSTITUENCIES.map(tsAdapter);
    case 'AP': return AP_CONSTITUENCIES.map(apAdapter);
    case 'KA': return KA_CONSTITUENCIES.map(kaAdapter);
    case 'MH': return MH_CONSTITUENCIES.map(mhAdapter);
    case 'TN': return TN_CONSTITUENCIES.map(tnAdapter);
    case 'KL': return KL_CONSTITUENCIES.map(klAdapter);
    case 'WB': return WB_CONSTITUENCIES.map(wbAdapter);
    case 'UP': return UP_CONSTITUENCIES.map(upAdapter);
    // Auto-generated states
    case 'RJ': return RJ_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'RJ', 2023));
    case 'GJ': return GJ_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'GJ', 2022));
    case 'JH': return JH_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'JH', 2024));
    case 'OD': return OD_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'OD', 2024));
    case 'DL': return DL_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'DL', 2022));
    case 'PB': return PB_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'PB', 2022));
    case 'HR': return HR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'HR', 2024));
    case 'CG': return CG_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'CG', 2023));
    case 'MP': return MP_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'MP', 2023));
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'BR', 2020));
    case 'AS': return AS_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'AS', 2026));
    case 'GA': return GA_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'GA', 2022));
    case 'HP': return HP_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'HP', 2022));
    case 'MN': return MN_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'MN', 2022));
    case 'ML': return ML_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'ML', 2023));
    case 'MZ': return MZ_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'MZ', 2023));
    case 'NL': return NL_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'NL', 2023));
    case 'TR': return TR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'TR', 2023));
    case 'SK': return SK_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'SK', 2024));
    case 'AR': return AR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'AR', 2024));
    case 'UK': return UK_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'UK', 2022));
    case 'PY': return PY_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'PY', 2026));
    case 'JK': return JK_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'JK', 2024));
    default: return [];
  }
}

/** Get a single constituency brief by state + acNo */
export function getConstituencyBrief(stateCode: string, acNo: number): ConstituencyBrief | null {
  const all = getConstituenciesForState(stateCode);
  return all.find((c) => c.acNo === acNo) ?? null;
}

/** Get total constituency count for a state's loaded data */
export function getLoadedConstituencyCount(stateCode: string): number {
  return getUnifiedConstituenciesForState(stateCode).length;
}

/** Check if a state has full data (all constituencies) vs stub (partial) */
export function hasFullData(stateCode: string): boolean {
  const loaded = getLoadedConstituencyCount(stateCode);
  // States with full assembly scrape
  const FULL_STATES = new Set([
    'TS', 'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP',
    'RJ', 'GJ', 'JH', 'OD', 'DL', 'PB', 'HR', 'CG',
    'MP', 'BR', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ',
    'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK',
  ]);
  return FULL_STATES.has(stateCode.toUpperCase()) && loaded > 0;
}

/** Get all loaded state codes */
export function getAvailableStates(): string[] {
  return [
    'TS', 'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP',
    'RJ', 'GJ', 'JH', 'OD', 'DL', 'PB', 'HR', 'CG',
    'MP', 'BR', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ',
    'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK',
  ];
}
