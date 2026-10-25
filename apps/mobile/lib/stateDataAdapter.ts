/**
 * State Data Adapter
 *
 * Normalizes constituency data from different state seed formats into
 * a unified ConstituencyBrief for cross-state UI components.
 *
 * Supports all 28 states + Puducherry + J&K.
 */
import type { ConstituencyBrief, DataTruthStatus } from '@kshetra/shared';
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

/** Provenance and epistemic status for facts carried through the mobile adapter.
 * Freshness (dataStatus) is intentionally separate from whether the fact is
 * official/verified. Missing source/date/version stays null; it is never inferred.
 */
export interface DataTruthMetadata {
  status: DataTruthStatus;
  source: {
    kind: 'official_source' | 'repository_seed' | 'unknown';
    artifactPath: string | null;
    url: string | null;
    publisher: string | null;
  };
  retrievalDate: string | null;
  effectiveDate: string | null;
  version: string | null;
  transformationHistory: string[];
  note?: string;
}

/** Explicit metadata contract for simulated projections (never returned as actual results) */
export interface SimulationProjection {
  isSimulation: true;
  electionYear: number;
  projectedParty: string | null;
  projectedWinnerName: string | null;
  projectedVotes: number | null;
  projectedRunnerUp: string | null;
  projectedMargin: number | null;
  dataTruth: DataTruthMetadata;
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
  winnerVotes?: number;
  runnerUpName?: string;
  runnerUpParty?: string;
  runnerUpVotes?: number;
  dataTruth?: DataTruthMetadata;
}

/** State-agnostic constituency shape used by Explore, Map, and Search UIs */
export interface UnifiedConstituency {
  acNo: number;
  name: string;
  district: string | null;
  type: 'GEN' | 'SC' | 'ST' | null;
  stateCode: string;
  /** Winning party in the most recent verified general election */
  winnerParty: string | null;
  winnerName: string | null;
  winnerVotes: number | null;
  runnerUp: string | null;
  margin: number | null;
  /** Current verified party of sitting representative */
  currentParty: string | null;
  /** Current sitting representative name */
  currentMLA?: string | null;
  /** Year of the verified general election result data */
  electionYear: number;
  /** By-election metadata if a subsequent by-election changed or confirmed the seat */
  byElection?: ByElectionRecord;
  /** Current officeholder / tenure status */
  officeholderStatus?: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED';
  /** Name in native language script */
  localName?: string;
  /** Optional simulation projection metadata (strictly segregated from actual results) */
  projection?: SimulationProjection;
  /** Data status flag indicating whether the data is current, stale, or by-election updated */
  dataStatus?: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED';
  /** Boolean flag indicating stale data awaiting election result ingestion */
  isStale?: boolean;
  /** Explanatory term status string */
  termStatus?: string;
  /** Fact-level epistemic provenance; unknown source fields are explicit nulls. */
  dataTruth: DataTruthMetadata;
  /** Provenance for a by-election update that may supersede historical results. */
  currentOfficeholderDataTruth?: DataTruthMetadata;
}

// ─── Generic adapter for auto-generated seeds ────────────────────────────────
// All auto-generated seeds have fields like winner{YEAR}, winnerName{YEAR}, etc.
// This helper picks the right year field.
type AnyConstituency = Record<string, any>;

const STATE_SEED_SLUGS: Record<string, string> = {
  TS: 'telangana', AP: 'andhra-pradesh', KA: 'karnataka', MH: 'maharashtra',
  TN: 'tamil-nadu', KL: 'kerala', WB: 'west-bengal', UP: 'uttar-pradesh',
  RJ: 'rajasthan', GJ: 'gujarat', JH: 'jharkhand', OD: 'odisha', DL: 'delhi',
  PB: 'punjab', HR: 'haryana', CG: 'chhattisgarh', MP: 'madhya-pradesh',
  BR: 'bihar', AS: 'assam', GA: 'goa', HP: 'himachal-pradesh', MN: 'manipur',
  ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland', TR: 'tripura', SK: 'sikkim',
  AR: 'arunachal-pradesh', UK: 'uttarakhand', PY: 'puducherry', JK: 'jammu-kashmir',
};

function dataTruthFor(
  record: AnyConstituency,
  stateCode: string,
  year: number,
  scenario = false,
  byElectionUrl?: string,
): DataTruthMetadata {
  const candidateUrl = byElectionUrl ??
    (typeof record?.sourceUrl === 'string' ? record.sourceUrl : null);
  let safeUrl: string | null = null;
  if (candidateUrl) {
    try {
      const parsed = new URL(candidateUrl);
      if (parsed.protocol === 'https:' && parsed.hostname) safeUrl = parsed.toString();
    } catch {
      safeUrl = null;
    }
  }
  const artifactPath = STATE_SEED_SLUGS[stateCode]
    ? `data/seed/${STATE_SEED_SLUGS[stateCode]}-constituencies.ts`
    : null;
  const hasOfficialSource = Boolean(byElectionUrl && safeUrl);
  return {
    status: scenario ? 'SCENARIO' : hasOfficialSource ? 'UNVERIFIED' : 'UNKNOWN',
    source: {
      kind: hasOfficialSource ? 'official_source' : 'repository_seed',
      artifactPath,
      url: safeUrl,
      publisher: hasOfficialSource ? 'Election Commission of India' : null,
    },
    retrievalDate: hasOfficialSource ? '2026-10-25' : null,
    effectiveDate: hasOfficialSource ? '2026-10-09' : null,
    version: null,
    transformationHistory: [
      artifactPath ? `Read ${artifactPath}` : 'Read repository seed record',
      'Normalize row through apps/mobile/lib/stateDataAdapter.ts',
      ...(hasOfficialSource ? ['Attach provisional ECI by-election result; final Form-20 was not present in the retrieved page'] : []),
    ],
    ...(!scenario && !hasOfficialSource ? { note: `No accepted row-level primary-source provenance for ${stateCode} ${year}; status remains UNKNOWN.` } : {}),
    ...(hasOfficialSource ? { note: 'ECI results page states final constituency data will be shared in Form-20; retain UNVERIFIED until final return is accepted.' } : {}),
  };
}

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

  // Simulation/projection fields must never be substituted into the actual
  // election fields, even when a legacy state seed has mis-keyed them.
  const rawWinner = c[winnerKey] ?? c.winner ?? null;
  const rawWinnerName = c[winnerNameKey] ?? c.winnerName ?? null;
  const rawWinnerVotes = c[winnerVotesKey] ?? null;
  const rawRunnerUp = c[runnerUpKey] ?? null;
  const rawMargin = c[marginKey] ?? null;

  // If a future simulation field exists, preserve it in projection metadata only
  const hasFutureSimulation = Boolean(c.winner2026) && year < 2026;
  const projection: SimulationProjection | undefined = hasFutureSimulation
    ? {
        isSimulation: true,
        electionYear: 2026,
        projectedParty: c.winner2026,
        projectedWinnerName: c.winnerName2026 ?? null,
        projectedVotes: c.winnerVotes2026 ?? null,
        projectedRunnerUp: c.runnerUp2026 ?? null,
        projectedMargin: c.margin2026 ?? null,
        dataTruth: dataTruthFor(c, stateCode, 2026, true),
        disclaimer: 'Simulated Projection — Not an Official Result',
      }
    : undefined;

  // Handle by-elections in generic states
  let byElection: ByElectionRecord | undefined = undefined;
  let officeholderStatus: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED' = 'INCUMBENT_ACTIVE';
  let effectiveCurrentParty: string | null = rawWinner;
  let effectiveCurrentMLA: string | null = rawWinnerName;

  if (stateCode === 'PY' && (c.acNo === 9 || c.name === 'Thattanchavady')) { // Thattanchavady (AC 9) by-election Oct 2026
    effectiveCurrentParty = 'AINRC';
    effectiveCurrentMLA = 'Ashok Anand';
    officeholderStatus = 'BY_ELECTION_SEATED';
    byElection = {
      year: 2026,
      month: 'October',
      winnerName: 'Ashok Anand',
      winnerParty: 'AINRC',
      margin: 8482,
      defeatedCandidateOrParty: 'INC',
      dataTruth: dataTruthFor(c, 'PY', 2026, false, 'https://results.eci.gov.in/ResultAcByeOct2026/ConstituencywiseU079.htm'),
    };
  }

  const isStalePending = ['TN', 'KL', 'WB', 'AS', 'PY'].includes(stateCode);
  const isBiharPending = stateCode === 'BR';
  const dataStatus: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED' = 
    byElection ? 'BY_ELECTION_UPDATED' :
    (isStalePending || isBiharPending ? 'STALE_PENDING_INGESTION' : 'CURRENT');
  const isStale = (isStalePending || isBiharPending) && !byElection;
  const termStatus = byElection ? 'BY_ELECTION_OCTOBER_2026_SEATED' :
    (isStalePending
      ? '2021_TERM_EXPIRED_PENDING_2026_PRIMARY_INGESTION'
      : (isBiharPending ? '2020_TERM_EXPIRED_PENDING_2025_PRIMARY_INGESTION' : 'ACTIVE'));

  return {
    acNo: c.acNo,
    name: c.name,
    district: c.district ?? null,
    type: c.type ?? null,
    stateCode,
    winnerParty: rawWinner,
    winnerName: rawWinnerName,
    winnerVotes: rawWinnerVotes,
    runnerUp: rawRunnerUp,
    margin: rawMargin,
    currentParty: effectiveCurrentParty,
    currentMLA: effectiveCurrentMLA,
    electionYear: year,
    byElection,
    officeholderStatus,
    localName: c.localName ?? c.nameTe ?? c.local_name ?? null,
    projection,
    dataStatus,
    isStale,
    termStatus,
    dataTruth: dataTruthFor(c, stateCode, year),
    ...(byElection?.dataTruth ? { currentOfficeholderDataTruth: byElection.dataTruth } : {}),
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
        dataTruth: dataTruthFor(c, 'TS', 2023),
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUp: c.runnerUp2023,
        margin: c.margin2023,
        currentParty: c.currentParty ?? c.winner2023,
        electionYear: 2023,
        localName: c.localName,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
      }));
    case 'AP':
      return AP_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'AP',
        dataTruth: dataTruthFor(c, 'AP', 2024),
        winnerParty: c.winner2024,
        winnerName: c.winnerName2024,
        winnerVotes: c.winnerVotes2024,
        runnerUp: c.runnerUp2024,
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
        dataTruth: dataTruthFor(c, 'KA', 2023),
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUp: c.runnerUp2023,
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
        dataTruth: dataTruthFor(c, 'MH', 2024),
        winnerParty: c.winner2024,
        winnerName: c.winnerName2024,
        winnerVotes: c.winnerVotes2024,
        runnerUp: c.runnerUp2024,
        margin: c.margin2024,
        currentParty: c.currentParty ?? c.winner2024,
        electionYear: 2024,
        dataStatus: 'CURRENT',
        isStale: false,
        termStatus: 'ACTIVE',
      }));
    case 'TN':
      return TN_CONSTITUENCIES.map((c) => {
        let currentParty: string | null = c.winner2021 ?? null;
        let currentMLA: string | null = c.winnerName2021 ?? null;
        let byElection: ByElectionRecord | undefined = undefined;
        let officeholderStatus: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED' = 'INCUMBENT_ACTIVE';
        let dataStatus: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED' = 'STALE_PENDING_INGESTION';
        let isStale = true;
        let termStatus = '2021_TERM_EXPIRED_PENDING_2026_PRIMARY_INGESTION';

        if (c.acNo === 35) {
          currentParty = 'TVK';
          currentMLA = 'K. Maragatham Kumaravel';
          officeholderStatus = 'BY_ELECTION_SEATED';
          dataStatus = 'BY_ELECTION_UPDATED';
          isStale = false;
          termStatus = 'BY_ELECTION_OCTOBER_2026_SEATED';
          byElection = {
            year: 2026,
            month: 'October',
            winnerName: 'K. Maragatham Kumaravel',
            winnerParty: 'TVK',
            margin: 20040,
            defeatedCandidateOrParty: 'DMK',
            winnerVotes: 74048,
            runnerUpName: 'I. Paranthamen',
            runnerUpParty: 'DMK',
            runnerUpVotes: 54008,
            dataTruth: dataTruthFor(c, 'TN', 2026, false, 'https://results.eci.gov.in/ResultAcByeOct2026/ConstituencywiseS2235.htm'),
          };
        } else if (c.acNo === 101) {
          currentParty = 'TVK';
          currentMLA = 'P. Sathyabama';
          officeholderStatus = 'BY_ELECTION_SEATED';
          dataStatus = 'BY_ELECTION_UPDATED';
          isStale = false;
          termStatus = 'BY_ELECTION_OCTOBER_2026_SEATED';
          byElection = {
            year: 2026,
            month: 'October',
            winnerName: 'P. Sathyabama',
            winnerParty: 'TVK',
            margin: 9471,
            defeatedCandidateOrParty: 'DMK',
            winnerVotes: 66841,
            runnerUpName: 'Suganya S',
            runnerUpParty: 'DMK',
            runnerUpVotes: 57370,
            dataTruth: dataTruthFor(c, 'TN', 2026, false, 'https://results.eci.gov.in/ResultAcByeOct2026/ConstituencywiseS22101.htm'),
          };
        }

        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'TN',
          dataTruth: dataTruthFor(c, 'TN', 2021),
          currentOfficeholderDataTruth: byElection?.dataTruth ?? dataTruthFor(c, 'TN', 2021),
          winnerParty: c.winner2021 ?? null,
          winnerName: c.winnerName2021 ?? null,
          winnerVotes: c.winnerVotes2021 ?? null,
          runnerUp: c.runnerUp2021 ?? null,
          margin: c.margin2021 ?? null,
          currentParty,
          currentMLA,
          electionYear: 2021,
          byElection,
          officeholderStatus,
          localName: c.localName,
          dataStatus,
          isStale,
          termStatus,
          projection: c.winner2026
            ? {
                isSimulation: true,
                electionYear: 2026,
                projectedParty: c.winner2026,
                projectedWinnerName: c.winnerName2026 ?? null,
                projectedVotes: c.winnerVotes2026 ?? null,
                projectedRunnerUp: c.runnerUp2026 ?? null,
                projectedMargin: c.margin2026 ?? null,
                dataTruth: dataTruthFor(c, 'TN', 2026, true),
                disclaimer: 'Simulated Projection — Not an Official Result',
              }
            : undefined,
        };
      });
    case 'KL':
      return KL_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'KL',
        dataTruth: dataTruthFor(c, 'KL', 2021),
        winnerParty: c.winner2021 ?? null,
        winnerName: c.winnerName2021 ?? null,
        winnerVotes: c.winnerVotes2021 ?? null,
        runnerUp: c.runnerUp2021 ?? null,
        margin: c.margin2021 ?? null,
        currentParty: c.winner2021 ?? null,
        currentMLA: c.winnerName2021 ?? null,
        electionYear: 2021,
        officeholderStatus: 'INCUMBENT_ACTIVE' as const,
        localName: c.localName,
        dataStatus: 'STALE_PENDING_INGESTION' as const,
        isStale: true,
        termStatus: '2021_TERM_EXPIRED_PENDING_2026_PRIMARY_INGESTION',
        projection: c.winner2026
          ? {
              isSimulation: true,
              electionYear: 2026,
              projectedParty: c.winner2026,
              projectedWinnerName: c.winnerName2026 ?? null,
              projectedVotes: c.winnerVotes2026 ?? null,
              projectedRunnerUp: c.runnerUp2026 ?? null,
              projectedMargin: c.margin2026 ?? null,
              dataTruth: dataTruthFor(c, 'KL', 2026, true),
              disclaimer: 'Simulated Projection — Not an Official Result',
            }
          : undefined,
      }));
    case 'WB':
      return WB_CONSTITUENCIES.map((c) => {
        let currentParty = c.winner2021 ?? '';
        let currentMLA = c.winnerName2021 ?? '';
        let byElection: ByElectionRecord | undefined = undefined;
        let officeholderStatus: 'INCUMBENT_ACTIVE' | 'BY_ELECTION_SEATED' | 'VACANT' | 'UNRESOLVED' = 'INCUMBENT_ACTIVE';
        let dataStatus: 'CURRENT' | 'STALE_PENDING_INGESTION' | 'BY_ELECTION_UPDATED' = 'STALE_PENDING_INGESTION';
        let isStale = true;
        let termStatus = '2021_TERM_EXPIRED_PENDING_2026_PRIMARY_INGESTION';

        if (c.acNo === 210) {
          currentParty = 'BJP';
          currentMLA = 'Hasi Rani Rath';
          officeholderStatus = 'BY_ELECTION_SEATED';
          dataStatus = 'BY_ELECTION_UPDATED';
          isStale = false;
          termStatus = 'BY_ELECTION_OCTOBER_2026_SEATED';
          byElection = {
            year: 2026,
            month: 'October',
            winnerName: 'Hasi Rani Rath',
            winnerParty: 'BJP',
            margin: 122753,
            defeatedCandidateOrParty: 'INC',
            winnerVotes: 164427,
            runnerUpName: 'Milan Pradhan',
            runnerUpParty: 'INC',
            runnerUpVotes: 41674,
            dataTruth: dataTruthFor(c, 'WB', 2026, false, 'https://results.eci.gov.in/ResultAcByeOct2026/ConstituencywiseS25210.htm'),
          };
        } else if (c.acNo === 70) {
          currentParty = 'BJP';
          currentMLA = 'Shankharavh Sarkar';
          officeholderStatus = 'BY_ELECTION_SEATED';
          dataStatus = 'BY_ELECTION_UPDATED';
          isStale = false;
          termStatus = 'BY_ELECTION_OCTOBER_2026_SEATED';
          byElection = {
            year: 2026,
            month: 'October',
            winnerName: 'Shankharavh Sarkar',
            winnerParty: 'BJP',
            margin: 75816,
            defeatedCandidateOrParty: 'AJUP',
            winnerVotes: 129914,
            runnerUpName: 'Golam Nabi Azad (Robin)',
            runnerUpParty: 'Aam Janata Unnayan Party',
            runnerUpVotes: 54098,
            dataTruth: dataTruthFor(c, 'WB', 2026, false, 'https://results.eci.gov.in/ResultAcByeOct2026/ConstituencywiseS2570.htm'),
          };
        }

        return {
          acNo: c.acNo,
          name: c.name,
          district: c.district,
          type: c.type,
          stateCode: 'WB',
          dataTruth: dataTruthFor(c, 'WB', 2021),
          currentOfficeholderDataTruth: byElection?.dataTruth ?? dataTruthFor(c, 'WB', 2021),
          winnerParty: c.winner2021 ?? null,
          winnerName: c.winnerName2021 ?? null,
          winnerVotes: c.winnerVotes2021 ?? null,
          runnerUp: c.runnerUp2021 ?? null,
          margin: c.margin2021 ?? null,
          currentParty,
          currentMLA,
          electionYear: 2021,
          byElection,
          officeholderStatus,
          localName: c.localName,
          dataStatus,
          isStale,
          termStatus,
          projection: c.winner2026
            ? {
                isSimulation: true,
                electionYear: 2026,
                projectedParty: c.winner2026,
                projectedWinnerName: c.winnerName2026 ?? null,
                projectedVotes: c.winnerVotes2026 ?? null,
                projectedRunnerUp: c.runnerUp2026 ?? null,
                projectedMargin: c.margin2026 ?? null,
                dataTruth: dataTruthFor(c, 'WB', 2026, true),
                disclaimer: 'Simulated Projection — Not an Official Result',
              }
            : undefined,
        };
      });
    case 'UP':
      return UP_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        stateCode: 'UP',
        dataTruth: dataTruthFor(c, 'UP', 2022),
        winnerParty: c.winner2022,
        winnerName: c.winnerName2022,
        winnerVotes: c.winnerVotes2022,
        runnerUp: c.runnerUp2022,
        margin: c.margin2022,
        currentParty: c.currentParty ?? c.winner2022,
        electionYear: 2022,
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
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericAdapter(c, 'BR', 2020));
    case 'AS': return AS_CONSTITUENCIES.map((c) => genericAdapter(c, 'AS', 2021));
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
    case 'PY': return PY_CONSTITUENCIES.map((c) => genericAdapter(c, 'PY', 2021));
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
  let currentParty = c.winner2021 ?? '';
  let currentMLA = c.winnerName2021 ?? '';
  if (c.acNo === 35) {
    currentParty = 'TVK';
    currentMLA = 'K. Maragatham Kumaravel';
  } else if (c.acNo === 101) {
    currentParty = 'TVK';
    currentMLA = 'P. Sathyabama';
  }
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
  return {
    id: `KL-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'KL',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2021 ?? '',
    currentMLA: c.winnerName2021 ?? '',
  };
}

/** Adapt WB seed → ConstituencyBrief */
function wbAdapter(c: WBConstituencySeed): ConstituencyBrief {
  let currentParty = c.winner2021 ?? '';
  let currentMLA = c.winnerName2021 ?? '';
  if (c.acNo === 210) {
    currentParty = 'BJP';
    currentMLA = 'Hasi Rani Rath';
  } else if (c.acNo === 70) {
    currentParty = 'BJP';
    currentMLA = 'Shankharavh Sarkar';
  }
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
    case 'DL': return DL_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'DL', 2025));
    case 'PB': return PB_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'PB', 2022));
    case 'HR': return HR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'HR', 2024));
    case 'CG': return CG_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'CG', 2023));
    case 'MP': return MP_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'MP', 2023));
    case 'BR': return BR_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'BR', 2020));
    case 'AS': return AS_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'AS', 2021));
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
    case 'PY': return PY_CONSTITUENCIES.map((c) => genericBriefAdapter(c, 'PY', 2021));
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

/** Get all available years for timeline slider (historical + current) */
export function getAvailableYearsForState(stateCode: string, includeSimulations: boolean = false): number[] {
  switch (stateCode.toUpperCase()) {
    case 'TS': return [2014, 2018, 2023];
    case 'AP': return [2019, 2024];
    case 'KA': return [2018, 2023];
    case 'MH': return [2019, 2024];
    case 'TN': return includeSimulations ? [2016, 2021, 2026] : [2016, 2021];
    case 'KL': return includeSimulations ? [2016, 2021, 2026] : [2016, 2021];
    case 'WB': return includeSimulations ? [2016, 2021, 2026] : [2016, 2021];
    case 'UP': return [2017, 2022];
    default: {
      const constituencies = getUnifiedConstituenciesForState(stateCode);
      if (constituencies.length > 0) {
        return [constituencies[0].electionYear];
      }
      return [2024]; // default fallback
    }
  }
}
