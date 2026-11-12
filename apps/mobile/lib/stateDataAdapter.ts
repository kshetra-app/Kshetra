/**
 * State Data Adapter
 *
 * Normalizes constituency data from different state seed formats into
 * a unified ConstituencyBrief for cross-state UI components.
 *
 * Supports all 28 states + Puducherry + J&K.
 */
import type { ConstituencyBrief } from '@kshetra/shared';
import { IS_LIVE_ENVIRONMENT } from './environment';
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

/** Explicit metadata contract for simulated projections (never returned as actual results) */
export interface SimulationProjection {
  isSimulation: true;
  electionYear: number | null;
  projectedParty: string;
  projectedWinnerName: string;
  projectedVotes: number;
  projectedRunnerUp: string;
  projectedMargin: number;
  disclaimer: string;
}

/** By-election metadata if a subsequent by-election changed or confirmed the seat */
export interface ByElectionRecord {
  year: number;
  month: string;
  winnerName: string;
  winnerParty: string;
  margin?: number;
  defeatedCandidateOrParty?: string;
}

/** State-agnostic constituency shape used by Explore, Map, and Search UIs */
export interface UnifiedConstituency {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  stateCode: string;
  /** Winning party in the most recent verified general election */
  winnerParty: string;
  winnerName: string;
  winnerVotes: number | null;
  runnerUp: string;
  runnerUpName?: string;
  runnerUpVotes?: number;
  margin: number | null;
  /** Current verified party of sitting representative */
  currentParty: string;
  /** Current sitting representative name */
  currentMLA?: string;
  /** Year of the verified general election result data */
  electionYear: number | null;
  /** By-election metadata if a subsequent by-election changed or confirmed the seat */
  byElection?: ByElectionRecord;
  /** Current officeholder / tenure status */
  officeholderStatus?: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED';
  /** Name in native language script */
  localName?: string;
  /** Optional simulation projection metadata (strictly segregated from actual results) */
  projection?: SimulationProjection;
  /** Data status flag indicating whether the data is current, stale, or by-election updated */
  dataStatus?: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED' | 'DATABASE_RECORDED' | 'UNAVAILABLE';
  /** Boolean flag indicating stale data awaiting election result ingestion */
  isStale?: boolean;
  /** Explanatory term status string */
  termStatus?: string;
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

  // For Assam, actual 2021 election returns were mistakenly keyed as 2026 in seed
  const isAssam2021Fallback = stateCode === 'AS' && year === 2021;
  const isBihar2025Fallback = stateCode === 'BR' && year === 2025;
  const rawWinner = c[winnerKey] ?? (isBihar2025Fallback ? (c.winner2025 ?? c.winner2020 ?? c.currentParty) : isAssam2021Fallback ? c.winner2026 : (c.winner ?? ''));
  const rawWinnerName = c[winnerNameKey] ?? (isBihar2025Fallback ? (c.winnerName2025 ?? c.winnerName2020) : isAssam2021Fallback ? c.winnerName2026 : (c.winnerName ?? ''));
  const rawWinnerVotes = c[winnerVotesKey] ?? (isBihar2025Fallback ? (c.winnerVotes2025 ?? c.winnerVotes2020) : isAssam2021Fallback ? c.winnerVotes2026 : null);
  const rawRunnerUp = c[runnerUpKey] ?? (isBihar2025Fallback ? (c.runnerUp2025 ?? c.runnerUp2020) : isAssam2021Fallback ? c.runnerUp2026 : '');
  const rawMargin = c[marginKey] ?? (isBihar2025Fallback ? (c.margin2025 ?? c.margin2020) : isAssam2021Fallback ? c.margin2026 : null);

  // If a future simulation field exists, preserve it in projection metadata only
  const hasFutureSimulation = c.winner2026 && year < 2026 && stateCode !== 'AS';
  const projection: SimulationProjection | undefined = hasFutureSimulation
    ? {
        isSimulation: true,
        electionYear: 2026,
        projectedParty: c.winner2026,
        projectedWinnerName: c.winnerName2026 ?? '',
        projectedVotes: c.winnerVotes2026 ?? 0,
        projectedRunnerUp: c.runnerUp2026 ?? '',
        projectedMargin: c.margin2026 ?? 0,
        disclaimer: 'Simulated Projection — Not an Official Result',
      }
    : undefined;

  // Handle by-elections in generic states
  let byElection: ByElectionRecord | undefined = undefined;
  let officeholderStatus: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED' = 'INCUMBENT_ACTIVE';
  let effectiveCurrentParty = rawWinner ?? '';
  let effectiveCurrentMLA = rawWinnerName ?? '';

  if (stateCode === 'PY' && (c.acNo === 9 || c.name === 'Thattanchavady')) { // Thattanchavady (AC 9) by-election Oct 2026
    effectiveCurrentParty = 'AINRC';
    effectiveCurrentMLA = 'Ashok Anand';
    officeholderStatus = 'BY_ELECTION_SEATED';
    byElection = {
      year: 2026,
      month: 'October',
      winnerName: 'Ashok Anand',
      winnerParty: 'AINRC',
      defeatedCandidateOrParty: 'SPA',
    };
  }

  if (stateCode === 'TS' && (c.acNo === 71 || c.name === 'Secunderabad Cantonment')) { // Secunderabad Cantonment (AC 71) by-election June 2024
    effectiveCurrentParty = 'INC';
    effectiveCurrentMLA = 'Sri Ganesh Narayanan';
    officeholderStatus = 'BY_ELECTION_SEATED';
    byElection = {
      year: 2024,
      month: 'June',
      winnerName: 'Sri Ganesh Narayanan',
      winnerParty: 'INC',
      defeatedCandidateOrParty: 'BJP / BRS',
    };
  }

  const isStalePending = false;
  const isBiharPending = false;
  const dataStatus: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED' = 
    byElection ? 'BY_ELECTION_UPDATED' : 'CURRENT';
  const isStale = false;
  const termStatus = byElection ? 'BY_ELECTION_OCTOBER_2026_SEATED' : 'ACTIVE';

  let cleanRunnerUp = rawRunnerUp ?? '';
  let cleanRunnerUpName = (c as any)[`runnerUpName${year}`] ?? (c as any).runnerUpName ?? '';
  if (!cleanRunnerUpName && cleanRunnerUp.includes(' - ')) {
    const parts = cleanRunnerUp.split(' - ');
    cleanRunnerUp = parts[0].trim();
    cleanRunnerUpName = parts.slice(1).join(' - ').trim();
  }

  return {
    acNo: c.acNo,
    name: c.name,
    district: c.district ?? '',
    type: c.type ?? 'GEN',
    stateCode,
    winnerParty: rawWinner ?? '',
    winnerName: rawWinnerName ?? '',
    winnerVotes: typeof rawWinnerVotes === 'number' && Number.isFinite(rawWinnerVotes) ? rawWinnerVotes : null,
    runnerUp: cleanRunnerUp,
    runnerUpName: cleanRunnerUpName,
    margin: typeof rawMargin === 'number' && Number.isFinite(rawMargin) ? rawMargin : null,
    currentParty: effectiveCurrentParty,
    currentMLA: effectiveCurrentMLA,
    electionYear: year,
    byElection,
    officeholderStatus,
    localName: c.localName || c.local_name || c.nameTe || c.nameHi || c.nameMr,
    projection,
    dataStatus,
    isStale,
    termStatus,
  };
}

/** Normalize all states' seed data into UnifiedConstituency[] */
function getSeedUnifiedConstituenciesForState(stateCode: string): UnifiedConstituency[] {
  switch (stateCode.toUpperCase()) {
    // ─── Original 8 (manually typed) ──────────────────────────────
    case 'TS':
      return TELANGANA_CONSTITUENCIES.map((c) => {
        const isVacant = c.officeholderStatus === 'VACANT';
        const byElection: ByElectionRecord | undefined = c.byElection
          ? {
              year: c.byElection.year,
              month: c.byElection.month,
              winnerName: c.byElection.winnerName,
              winnerParty: c.byElection.winnerParty,
            }
          : undefined;
        const officeholderStatus = isVacant
          ? 'VACANT' as const
          : byElection
            ? 'BY_ELECTION_SEATED' as const
            : 'INCUMBENT_ACTIVE' as const;
        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'TS',
          winnerParty: c.winner2023,
          winnerName: c.winnerName2023,
          winnerVotes: c.winnerVotes2023,
          runnerUp: c.runnerUp2023,
          runnerUpName: c.runnerUpName2023 ?? '',
          margin: c.margin2023,
          currentParty: isVacant ? '' : c.currentParty ?? c.winner2023,
          currentMLA: isVacant ? undefined : c.currentMemberName ?? c.winnerName2023,
          electionYear: 2023,
          byElection,
          officeholderStatus,
          localName: c.localName,
          dataStatus: byElection ? 'BY_ELECTION_UPDATED' as const : 'CURRENT' as const,
          isStale: false,
          termStatus: isVacant ? 'VACANT' : byElection ? 'BY_ELECTION_SEATED' : 'ACTIVE',
        };
      });
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
        runnerUpName: (c as any).runnerUpName2024 || '',
        runnerUpVotes: (c as any).runnerUpVotes2024 ?? undefined,
        margin: c.margin2024,
        currentParty: c.currentParty ?? c.winner2024,
        electionYear: 2024,
        localName: c.localName,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
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
        runnerUpName: (c as any).runnerUpName2023 || '',
        runnerUpVotes: (c as any).runnerUpVotes2023 ?? undefined,
        margin: c.margin2023,
        currentParty: c.currentParty ?? c.winner2023,
        electionYear: 2023,
        localName: (c as any).localName,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
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
        runnerUpName: (c as any).runnerUpName2024 || '',
        runnerUpVotes: (c as any).runnerUpVotes2024 ?? undefined,
        margin: c.margin2024,
        currentParty: c.currentParty ?? c.winner2024,
        electionYear: 2024,
        localName: (c as any).localName || (c as any).local_name || (c as any).nameMr,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
      }));
    case 'TN':
      return TN_CONSTITUENCIES.map((c) => {
        const has2026Result = Boolean(c.winner2026 || c.winnerName2026 || c.winnerVotes2026 != null);
        const winnerParty = (has2026Result ? c.winner2026 : null) ?? c.winner2021 ?? '';
        const winnerName = (has2026Result ? c.winnerName2026 : null) ?? c.winnerName2021 ?? '';
        const winnerVotes = (has2026Result ? c.winnerVotes2026 : null) ?? c.winnerVotes2021 ?? null;
        const runnerUp = c.runnerUp2026 ?? c.runnerUp2021 ?? '';
        const margin = (has2026Result ? c.margin2026 : null) ?? c.margin2021 ?? null;
        const currentParty = c.currentParty ?? winnerParty;
        const currentMLA = winnerName;

        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'TN',
          winnerParty,
          winnerName,
          winnerVotes,
          runnerUp,
          runnerUpName: (c as any).runnerUpName2026 ?? '',
          margin,
          currentParty,
          currentMLA,
          electionYear: has2026Result ? 2026 : 2021,
          officeholderStatus: 'INCUMBENT_ACTIVE' as const,
          localName: c.localName,
          dataStatus: 'CURRENT' as const,
          isStale: false,
          termStatus: 'ACTIVE',
        };
      });
    case 'KL':
      return KL_CONSTITUENCIES.map((c) => {
        const has2026Result = Boolean(c.winner2026 || c.winnerName2026 || c.winnerVotes2026 != null);
        const winnerParty = (has2026Result ? c.winner2026 : null) ?? c.winner2021 ?? '';
        const winnerName = (has2026Result ? c.winnerName2026 : null) ?? c.winnerName2021 ?? '';
        const winnerVotes = (has2026Result ? c.winnerVotes2026 : null) ?? c.winnerVotes2021 ?? null;
        const runnerUp = c.runnerUp2026 ?? c.runnerUp2021 ?? '';
        const margin = (has2026Result ? c.margin2026 : null) ?? c.margin2021 ?? null;
        const currentParty = c.currentParty ?? winnerParty;
        const currentMLA = winnerName;

        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'KL',
          winnerParty,
          winnerName,
          winnerVotes,
          runnerUp,
          runnerUpName: (c as any).runnerUpName2026 ?? '',
          margin,
          currentParty,
          currentMLA,
          electionYear: has2026Result ? 2026 : 2021,
          officeholderStatus: 'INCUMBENT_ACTIVE' as const,
          localName: c.localName,
          dataStatus: 'CURRENT' as const,
          isStale: false,
          termStatus: 'ACTIVE',
        };
      });
    case 'WB':
      return WB_CONSTITUENCIES.map((c) => {
        const has2026Result = Boolean(c.winner2026 || c.winnerName2026 || c.winnerVotes2026 != null);
        const winnerParty = (has2026Result ? c.winner2026 : null) ?? c.winner2021 ?? '';
        const winnerName = (has2026Result ? c.winnerName2026 : null) ?? c.winnerName2021 ?? '';
        const winnerVotes = (has2026Result ? c.winnerVotes2026 : null) ?? c.winnerVotes2021 ?? null;
        const runnerUp = c.runnerUp2026 ?? c.runnerUp2021 ?? '';
        const margin = (has2026Result ? c.margin2026 : null) ?? c.margin2021 ?? null;
        const currentParty = c.currentParty ?? winnerParty;
        const currentMLA = winnerName;

        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'WB',
          winnerParty,
          winnerName,
          winnerVotes,
          runnerUp,
          runnerUpName: (c as any).runnerUpName2026 ?? '',
          margin,
          currentParty,
          currentMLA,
          electionYear: has2026Result ? 2026 : 2021,
          officeholderStatus: 'INCUMBENT_ACTIVE' as const,
          localName: c.localName,
          dataStatus: 'CURRENT' as const,
          isStale: false,
          termStatus: 'ACTIVE',
        };
      });
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
        localName: (c as any).localName || (c as any).local_name || (c as any).nameHi,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
      }));

    // ─── Auto-generated states (generic adapter) ───────────────────
    case 'RJ': return RJ_CONSTITUENCIES.map((c) => genericAdapter(c, 'RJ', 2023));
    case 'GJ': return GJ_CONSTITUENCIES.map((c) => genericAdapter(c, 'GJ', 2022));
    case 'JH': return JH_CONSTITUENCIES.map((c) => genericAdapter(c, 'JH', 2024));
    case 'OD': return OD_CONSTITUENCIES.map((c) => genericAdapter(c, 'OD', 2024));
    case 'DL': return DL_CONSTITUENCIES.map((c) => genericAdapter(c, 'DL', 2025));
    case 'PB': return PB_CONSTITUENCIES.map((c) => genericAdapter(c, 'PB', 2022));
    case 'HR': return HR_CONSTITUENCIES.map((c) => genericAdapter(c, 'HR', 2024));
    case 'CG': return CG_CONSTITUENCIES.map((c) => genericAdapter(c, 'CG', 2023));
    case 'MP': return MP_CONSTITUENCIES.map((c) => genericAdapter(c, 'MP', 2023));
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericAdapter(c, 'BR', 2025));
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

/** Remove bundled political assertions from live builds while retaining the seat geography. */
export function toGeographyOnlyConstituency(item: UnifiedConstituency): UnifiedConstituency {
  return {
    ...item,
    winnerParty: '',
    winnerName: '',
    winnerVotes: null,
    runnerUp: '',
    runnerUpName: undefined,
    runnerUpVotes: undefined,
    margin: null,
    currentParty: '',
    currentMLA: undefined,
    electionYear: null,
    byElection: undefined,
    officeholderStatus: 'UNRESOLVED',
    projection: undefined,
    dataStatus: 'UNAVAILABLE',
    isStale: false,
    termStatus: undefined,
  };
}

/** Seed elections are local reference data only; live builds must use the API-backed directory. */
export function getUnifiedConstituenciesForState(stateCode: string): UnifiedConstituency[] {
  const items = getSeedUnifiedConstituenciesForState(stateCode);
  return IS_LIVE_ENVIRONMENT ? items.map(toGeographyOnlyConstituency) : items;
}

// ─── ConstituencyBrief adapters (for shared types) ───────────────────────

/** Adapt Telangana seed → ConstituencyBrief */
function tsAdapter(c: ConstituencySeed): ConstituencyBrief {
  const isVacant = c.officeholderStatus === 'VACANT';
  return {
    id: `TS-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'TS',
    district: c.district,
    reservationStatus: c.type,
    currentParty: isVacant ? '' : c.currentParty ?? c.winner2023,
    currentMLA: isVacant ? '' : c.currentMemberName ?? c.winnerName2023,
    officeholderStatus: isVacant ? 'VACANT' : c.byElection ? 'BY_ELECTION_SEATED' : 'INCUMBENT_ACTIVE',
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
  const currentParty = c.currentParty ?? c.winner2026 ?? c.winner2021 ?? '';
  const currentMLA = c.winnerName2026 ?? c.winnerName2021 ?? '';
  return {
    id: `TN-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'TN',
    district: c.district,
    reservationStatus: c.type,
    currentParty,
    currentMLA,
  };
}

/** Adapt KL seed → ConstituencyBrief */
function klAdapter(c: KLConstituencySeed): ConstituencyBrief {
  const currentParty = c.currentParty ?? c.winner2026 ?? c.winner2021 ?? '';
  const currentMLA = c.winnerName2026 ?? c.winnerName2021 ?? '';
  return {
    id: `KL-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'KL',
    district: c.district,
    reservationStatus: c.type,
    currentParty,
    currentMLA,
  };
}

/** Adapt WB seed → ConstituencyBrief */
function wbAdapter(c: WBConstituencySeed): ConstituencyBrief {
  const currentParty = c.currentParty ?? c.winner2026 ?? c.winner2021 ?? '';
  const currentMLA = c.winnerName2026 ?? c.winnerName2021 ?? '';
  return {
    id: `WB-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'WB',
    district: c.district,
    reservationStatus: c.type,
    currentParty,
    currentMLA,
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
    currentMLA: unified.currentMLA || unified.winnerName,
  };
}

/** Get all constituencies for a given state code as ConstituencyBrief[] */
function getSeedConstituenciesForState(stateCode: string): ConstituencyBrief[] {
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
    case 'DL': return DL_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'DL', 2025));
    case 'PB': return PB_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'PB', 2022));
    case 'HR': return HR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'HR', 2024));
    case 'CG': return CG_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'CG', 2023));
    case 'MP': return MP_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'MP', 2023));
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'BR', 2025));
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

/** Keep seed representative fields out of live builds; preserve directory geography for navigation. */
export function getConstituenciesForState(stateCode: string): ConstituencyBrief[] {
  const items = getSeedConstituenciesForState(stateCode);
  if (!IS_LIVE_ENVIRONMENT) return items;
  return items.map((item) => ({ ...item, currentParty: '', currentMLA: '' }));
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

/** Get all available years for timeline slider (historical + current) */
export function getAvailableYearsForState(stateCode: string, includeSimulations: boolean = false): number[] {
  if (IS_LIVE_ENVIRONMENT) return [];
  switch (stateCode.toUpperCase()) {
    case 'TS': return [2014, 2018, 2023];
    case 'AP': return [2019, 2024];
    case 'KA': return [2018, 2023];
    case 'MH': return [2019, 2024];
    case 'TN': return [2016, 2021, 2026];
    case 'KL': return [2016, 2021, 2026];
    case 'WB': return [2016, 2021, 2026];
    case 'UP': return [2017, 2022];
    case 'DL': return [2013, 2015, 2020, 2025];
    case 'HR': return [2014, 2019, 2024];
    case 'JH': return [2014, 2019, 2024];
    case 'OD': return [2014, 2019, 2024];
    case 'AR': return [2014, 2019, 2024];
    case 'SK': return [2014, 2019, 2024];
    case 'JK': return [2008, 2014, 2024];
    case 'RJ': return [2013, 2018, 2023];
    case 'MP': return [2013, 2018, 2023];
    case 'CG': return [2013, 2018, 2023];
    case 'MZ': return [2013, 2018, 2023];
    case 'AS': return [2016, 2021, 2026];
    case 'PY': return [2016, 2021, 2026];
    default: {
      const constituencies = getUnifiedConstituenciesForState(stateCode);
      if (constituencies.length > 0) {
        const electionYear = constituencies[0].electionYear;
        return electionYear == null ? [] : [electionYear];
      }
      return [2024]; // default fallback
    }
  }
}
