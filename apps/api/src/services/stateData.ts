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
import { TELANGANA_2014_RESULTS, TELANGANA_2018_RESULTS } from '../../../../data/seed/telangana-historical-results';
import { AP_2019_RESULTS } from '../../../../data/seed/andhra-pradesh-historical-results';
import { getKA2018Result } from '../../../../data/seed/karnataka-historical-results';
import { getMH2019Result } from '../../../../data/seed/maharashtra-historical-results';
import { getTN2016Result } from '../../../../data/seed/tamil-nadu-historical-results';
import { getKL2016Result } from '../../../../data/seed/kerala-historical-results';
import { getWB2016Result } from '../../../../data/seed/west-bengal-historical-results';
import { getUP2017Result } from '../../../../data/seed/uttar-pradesh-historical-results';
import { getRJ2018Result } from '../../../../data/seed/rajasthan-historical-results';
import { getGJ2017Result } from '../../../../data/seed/gujarat-historical-results';
import { getJH2019Result } from '../../../../data/seed/jharkhand-historical-results';
import { getOD2019Result } from '../../../../data/seed/odisha-historical-results';
import { getDL2015Result } from '../../../../data/seed/delhi-historical-results';
import { getPB2017Result } from '../../../../data/seed/punjab-historical-results';
import { getHR2019Result } from '../../../../data/seed/haryana-historical-results';
import { getCG2018Result } from '../../../../data/seed/chhattisgarh-historical-results';
import { getMP2018Result } from '../../../../data/seed/madhya-pradesh-historical-results';
import { getBR2015Result } from '../../../../data/seed/bihar-historical-results';
import { getAS2016Result } from '../../../../data/seed/assam-historical-results';
import { getGA2017Result } from '../../../../data/seed/goa-historical-results';
import { getMN2017Result } from '../../../../data/seed/manipur-historical-results';
import { getML2018Result } from '../../../../data/seed/meghalaya-historical-results';
import { getMZ2018Result } from '../../../../data/seed/mizoram-historical-results';
import { getNL2018Result } from '../../../../data/seed/nagaland-historical-results';
import { getTR2018Result } from '../../../../data/seed/tripura-historical-results';
import { getSK2019Result } from '../../../../data/seed/sikkim-historical-results';
import { getAR2019Result } from '../../../../data/seed/arunachal-pradesh-historical-results';
import { getUK2017Result } from '../../../../data/seed/uttarakhand-historical-results';
import { getPY2016Result } from '../../../../data/seed/puducherry-historical-results';
import { getHP2017Result } from '../../../../data/seed/himachal-pradesh-historical-results';
import { getJK2014Result } from '../../../../data/seed/jammu-kashmir-historical-results';

const HISTORICAL_GETTERS: Record<string, (acNo: number) => { year?: number; party: string; winner: string; votes?: number; margin?: number; runnerUp?: string } | undefined> = {
  KA: getKA2018Result,
  MH: getMH2019Result,
  TN: getTN2016Result,
  KL: getKL2016Result,
  WB: getWB2016Result,
  UP: getUP2017Result,
  RJ: getRJ2018Result,
  GJ: getGJ2017Result,
  JH: getJH2019Result,
  OD: getOD2019Result,
  DL: getDL2015Result,
  PB: getPB2017Result,
  HR: getHR2019Result,
  CG: getCG2018Result,
  MP: getMP2018Result,
  BR: getBR2015Result,
  AS: getAS2016Result,
  GA: getGA2017Result,
  MN: getMN2017Result,
  ML: getML2018Result,
  MZ: getMZ2018Result,
  NL: getNL2018Result,
  TR: getTR2018Result,
  SK: getSK2019Result,
  AR: getAR2019Result,
  UK: getUK2017Result,
  PY: getPY2016Result,
  HP: getHP2017Result,
  JK: getJK2014Result,
};

import * as canonicalGeoModule from './canonicalGeographyService';
import type {
  CanonicalStateRecord,
  CanonicalParliamentaryConstituencyRecord,
  CanonicalConstituencyRecord,
  ByElectionScheduleItem,
} from './canonicalGeographyService';

// ─── DYNAMIC BY-ELECTION SCHEDULE REGISTRY ───

export const CONFIRMED_BY_ELECTIONS: ByElectionScheduleItem[] = [
  {
    stateCode: 'TN',
    acNo: 35,
    constituencyName: 'Madurantakam',
    party: 'TVK',
    mlaName: 'K. Maragatham Kumaravel',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'TN',
    acNo: 101,
    constituencyName: 'Dharapuram',
    party: 'TVK',
    mlaName: 'P. Sathyabama',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'WB',
    acNo: 210,
    constituencyName: 'Nandigram',
    party: 'BJP',
    mlaName: 'Hasi Rani Rath',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'WB',
    acNo: 70,
    constituencyName: 'Swarupnagar',
    party: 'BJP',
    mlaName: 'Shankharavh Sarkar',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
  {
    stateCode: 'PY',
    acNo: 9,
    constituencyName: 'Thattanchavady',
    party: 'AINRC',
    mlaName: 'Ashok Anand',
    status: 'CONFIRMED',
    termYear: 2026,
    gazetteReference: 'ECI By-Election Notification October 2026',
  },
];

export function resolveByElectionOverride(
  stateCode: string,
  acNo: number,
  constituencyName?: string,
): { currentParty: string; currentMLA: string; status: string } | null {
  if (typeof canonicalGeoModule?.resolveByElectionOverride === 'function') {
    return canonicalGeoModule.resolveByElectionOverride(stateCode, acNo, constituencyName);
  }
  if (!stateCode) return null;
  const code = stateCode.toUpperCase();
  const found = CONFIRMED_BY_ELECTIONS.find((e) => {
    if (e.stateCode !== code) return false;
    if (e.acNo === acNo) return true;
    if (constituencyName && e.constituencyName.toLowerCase() === constituencyName.toLowerCase()) return true;
    return false;
  });
  if (!found) return null;
  return {
    currentParty: found.party,
    currentMLA: found.mlaName,
    status: found.status,
  };
}

export const canonicalGeographyService =
  canonicalGeoModule?.canonicalGeographyService ??
  new (class FallbackCanonicalGeographyService {
    isAvailable() { return false; }
    async getStates() { return []; }
    async getState() { return null; }
    async getParliamentaryConstituencies() { return []; }
    async getParliamentaryConstituency() { return null; }
    async getConstituencies() { return []; }
    async getConstituency() { return null; }
    async searchConstituencies() { return []; }
    async getConstituencyElectionData() { return null; }
    getConfirmedByElections() { return CONFIRMED_BY_ELECTIONS; }
  })();

// Generic Mapper
function genericToBrief(stateCode: string, c: any): ConstituencyBrief {
  const code = stateCode.toUpperCase();
  let currentParty = c.winner2025 ?? c.winner2024 ?? c.winner2023 ?? c.winner2022 ?? c.winner2021 ?? c.winner ?? '';
  let currentMLA = c.winnerName2025 ?? c.winnerName2024 ?? c.winnerName2023 ?? c.winnerName2022 ?? c.winnerName2021 ?? c.winnerName ?? '';

  // By-election overrides resolved dynamically via canonicalGeographyService schedule
  const override = resolveByElectionOverride(code, c.acNo, c.name);
  if (override) {
    currentParty = override.currentParty;
    currentMLA = override.currentMLA;
  }

  return {
    id: `${code}-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: code,
    district: c.district ?? '',
    reservationStatus: (c.type as 'GEN' | 'SC' | 'ST') ?? 'GEN',
    currentParty,
    currentMLA,
  };
}

/**
 * 6-Tier Geographic Boundary Status Taxonomy (Directive 121 / MEF Amendment v1.6):
 * - UNAVAILABLE: No boundary file or asset exists in canonical data/geo/
 * - MALFORMED: File exists but JSON is invalid, corrupted, or rings unclosed
 * - STRUCTURALLY_VALID: RFC 7946 valid coordinates and rings, but unlinked or partial
 * - CONFLICT_PENDING: Geometry valid, but has unresolved feature conflicts / duplicates (e.g. TS AC 119)
 * - LINKED_PROVISIONAL: Linked 1:1 to canonical constituencies, but unverified statutory provenance
 * - ACCEPTED_AUTHORITATIVE: Fully accepted authoritative boundary by CEO / ECI / statutory body
 */
export type GeographicBoundaryStatus =
  | 'UNAVAILABLE'
  | 'MALFORMED'
  | 'STRUCTURALLY_VALID'
  | 'CONFLICT_PENDING'
  | 'LINKED_PROVISIONAL'
  | 'ACCEPTED_AUTHORITATIVE';

export interface GeographicCapability {
  hasBoundaryAsset: boolean;
  boundaryStatus: GeographicBoundaryStatus;
  isStructurallyValid: boolean;
  hasCleanConstituencyMapping: boolean;
  isAuthoritativeAccepted: boolean;
  activeDefects: string[];
  notes?: string;
}

export interface StateDataInfo {
  code: string;
  name: string;
  totalSeats: number;
  loadedCount: number;
  dataStatus: 'full' | 'stub' | 'planned';
  /**
   * Fail-closed boolean indicating whether authoritative, conflict-free
   * boundary data is accepted and available for production rendering.
   * Evaluates to false if active defects (such as DEF-W021-01) or unverified provenance exist.
   */
  hasGeoJSON: boolean;
  geographicCapability: GeographicCapability;
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

/**
 * Resolves granular geographic capability for a state.
 * Prevents a single boolean from implying stronger guarantees than the evidence supports.
 */
export function getGeographicCapability(stateCode: string): GeographicCapability {
  const code = stateCode.toUpperCase();
  if (code === 'TS') {
    return {
      hasBoundaryAsset: true,
      boundaryStatus: 'CONFLICT_PENDING',
      isStructurallyValid: true,
      hasCleanConstituencyMapping: false,
      isAuthoritativeAccepted: false,
      activeDefects: ['DEF-W021-01'],
      notes: 'Telangana has local boundary asset data/geo/telangana-assembly.geojson with 120 features for 119 statutory seats. AC 119 contains 2 distinct polygon features (FID 4159 & 4160). Blocked pending official CEO Telangana gazette consolidation.',
    };
  }

  return {
    hasBoundaryAsset: false,
    boundaryStatus: 'UNAVAILABLE',
    isStructurallyValid: false,
    hasCleanConstituencyMapping: false,
    isAuthoritativeAccepted: false,
    activeDefects: ['DEF-W021-03'],
    notes: 'Statutory boundary asset unavailable in canonical data/geo/. Ingestion blocked pending verified survey feeds.',
  };
}

/**
 * Validated state codes with accepted authoritative and conflict-free GeoJSON geometry.
 * Currently EMPTY (Set()) because Telangana is blocked under DEF-W021-01 (AC 119 duplicate polygon)
 * and the remaining 30 States/UTs are blocked under DEF-W021-03 (missing authoritative GIS feeds).
 */
export const VALIDATED_GEOJSON_STATES = new Set<string>([]);

/** State codes that possess local candidate or provisional GeoJSON assets */
export const STATES_WITH_BOUNDARY_ASSETS = new Set<string>(['TS']);

/** Get info about a state's data availability */
export function getStateInfo(stateCode: string): StateDataInfo | null {
  const code = stateCode.toUpperCase();
  const entry = STATE_RAW_MAP[code];
  if (!entry) return null;
  const geographicCapability = getGeographicCapability(code);
  return {
    code,
    name: entry.name,
    totalSeats: entry.total,
    loadedCount: entry.data.length,
    dataStatus: entry.data.length >= entry.total ? 'full' : 'stub',
    hasGeoJSON: geographicCapability.isAuthoritativeAccepted,
    geographicCapability,
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

export interface ConstituencyElectionSummary {
  electionYear: number | null;
  electionType: 'GENERAL' | 'BYPOLL' | null;
  winner: string;
  winnerName: string;
  winnerVotes: number | null;
  runnerUp: string;
  margin: number | null;
  marginPercent: number | null;
}

export interface ConstituencyElectionData {
  recentElection: ConstituencyElectionSummary;
  elections: ConstituencyElectionSummary[];
}

/**
 * Returns temporally correct election summary and historical results for a constituency.
 * Preserves actual election years from explicit record evidence.
 * Preserves null for missing vote totals, margins, or unknown election years without state-code guessing or zero/2024 coercion.
 */
export function getConstituencyElectionData(stateCode: string, acNo: number): ConstituencyElectionData | null {
  if (!stateCode || typeof stateCode !== 'string' || acNo == null) return null;
  const code = stateCode.toUpperCase();
  const raw = getRawConstituency(code, acNo);
  const brief = getConstituency(code, acNo);
  if (!raw && !brief) return null;

  // Determine actual election year and results without state-code guessing or unjustified defaults
  let year: number | null = null;
  let winner = '';
  let winnerName = '';
  let winnerVotes: number | null = null;
  let runnerUp = '';
  let margin: number | null = null;

  if (raw) {
    if (raw.winner2025 !== undefined || raw.winnerName2025 !== undefined) {
      year = 2025;
      winner = raw.winner2025 ?? '';
      winnerName = raw.winnerName2025 ?? '';
      winnerVotes = typeof raw.winnerVotes2025 === 'number' ? raw.winnerVotes2025 : null;
      runnerUp = raw.runnerUp2025 ?? '';
      margin = typeof raw.margin2025 === 'number' ? raw.margin2025 : null;
    } else if (raw.winner2024 !== undefined || raw.winnerName2024 !== undefined) {
      year = 2024;
      winner = raw.winner2024 ?? '';
      winnerName = raw.winnerName2024 ?? '';
      winnerVotes = typeof raw.winnerVotes2024 === 'number' ? raw.winnerVotes2024 : null;
      runnerUp = raw.runnerUp2024 ?? '';
      margin = typeof raw.margin2024 === 'number' ? raw.margin2024 : null;
    } else if (raw.winner2023 !== undefined || raw.winnerName2023 !== undefined) {
      year = 2023;
      winner = raw.winner2023 ?? '';
      winnerName = raw.winnerName2023 ?? '';
      winnerVotes = typeof raw.winnerVotes2023 === 'number' ? raw.winnerVotes2023 : null;
      runnerUp = raw.runnerUp2023 ?? '';
      margin = typeof raw.margin2023 === 'number' ? raw.margin2023 : null;
    } else if (raw.winner2022 !== undefined || raw.winnerName2022 !== undefined) {
      year = 2022;
      winner = raw.winner2022 ?? '';
      winnerName = raw.winnerName2022 ?? '';
      winnerVotes = typeof raw.winnerVotes2022 === 'number' ? raw.winnerVotes2022 : null;
      runnerUp = raw.runnerUp2022 ?? '';
      margin = typeof raw.margin2022 === 'number' ? raw.margin2022 : null;
    } else if (raw.winner2021 !== undefined || raw.winnerName2021 !== undefined) {
      year = 2021;
      winner = raw.winner2021 ?? '';
      winnerName = raw.winnerName2021 ?? '';
      winnerVotes = typeof raw.winnerVotes2021 === 'number' ? raw.winnerVotes2021 : null;
      runnerUp = raw.runnerUp2021 ?? '';
      margin = typeof raw.margin2021 === 'number' ? raw.margin2021 : null;
    } else if (raw.winner2020 !== undefined || raw.winnerName2020 !== undefined) {
      year = 2020;
      winner = raw.winner2020 ?? '';
      winnerName = raw.winnerName2020 ?? '';
      winnerVotes = typeof raw.winnerVotes2020 === 'number' ? raw.winnerVotes2020 : null;
      runnerUp = raw.runnerUp2020 ?? '';
      margin = typeof raw.margin2020 === 'number' ? raw.margin2020 : null;
    } else if (typeof raw.electionYear === 'number') {
      year = raw.electionYear;
      winner = raw.winner ?? '';
      winnerName = raw.winnerName ?? '';
      winnerVotes = typeof raw.winnerVotes === 'number' ? raw.winnerVotes : null;
      runnerUp = raw.runnerUp ?? '';
      margin = typeof raw.margin === 'number' ? raw.margin : null;
    } else {
      // Unestablished election event: strictly preserve null without hard-coded state-code lists
      winner = raw.winner ?? brief?.currentParty ?? '';
      winnerName = raw.winnerName ?? brief?.currentMLA ?? '';
      winnerVotes = typeof raw.winnerVotes === 'number' ? raw.winnerVotes : null;
      runnerUp = raw.runnerUp ?? '';
      margin = typeof raw.margin === 'number' ? raw.margin : null;
      year = null;
    }
  } else if (brief) {
    winner = brief.currentParty;
    winnerName = brief.currentMLA;
  }

  const marginPercent =
    winnerVotes != null && winnerVotes > 0 && margin != null && margin >= 0
      ? parseFloat(((margin / winnerVotes) * 100).toFixed(1))
      : null;

  let electionType: 'GENERAL' | 'BYPOLL' | null = null;
  if (raw?.electionType === 'BYPOLL') {
    electionType = 'BYPOLL';
  } else if (raw?.electionType === 'GENERAL') {
    electionType = 'GENERAL';
  } else {
    electionType = null;
  }

  const recentElection: ConstituencyElectionSummary = {
    electionYear: year,
    electionType,
    winner,
    winnerName,
    winnerVotes,
    runnerUp,
    margin,
    marginPercent,
  };

  const elections: ConstituencyElectionSummary[] = [recentElection];

const MULTI_CYCLE_HISTORICAL_GETTERS: Record<
  string,
  (acNo: number) => ConstituencyElectionSummary[]
> = {
  TS: (acNo: number) => {
    const list: ConstituencyElectionSummary[] = [];
    const h2018 = TELANGANA_2018_RESULTS.find((r) => r.acNo === acNo);
    if (h2018) {
      list.push({
        electionYear: 2018,
        electionType: 'GENERAL',
        winner: h2018.party,
        winnerName: h2018.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
    const h2014 = TELANGANA_2014_RESULTS.find((r) => r.acNo === acNo);
    if (h2014) {
      list.push({
        electionYear: 2014,
        electionType: 'GENERAL',
        winner: h2014.party,
        winnerName: h2014.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
    return list;
  },
  AP: (acNo: number) => {
    const list: ConstituencyElectionSummary[] = [];
    const h2019 = AP_2019_RESULTS.find((r) => r.acNo === acNo);
    if (h2019) {
      list.push({
        electionYear: 2019,
        electionType: 'GENERAL',
        winner: h2019.party,
        winnerName: h2019.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
    return list;
  },
};

  // Attach verified historical per-constituency election records via data-driven registry
  const multiGetter = MULTI_CYCLE_HISTORICAL_GETTERS[code];
  if (multiGetter) {
    elections.push(...multiGetter(acNo));
  } else if (HISTORICAL_GETTERS[code]) {
    const hist = HISTORICAL_GETTERS[code](acNo);
    if (hist && hist.year) {
      elections.push({
        electionYear: hist.year,
        electionType: 'GENERAL',
        winner: hist.party,
        winnerName: hist.winner,
        winnerVotes: hist.votes ?? null,
        runnerUp: hist.runnerUp ?? '',
        margin: hist.margin ?? null,
        marginPercent: null,
      });
    }
  }

  // Ensure elections array is sorted chronologically descending by electionYear without artificial date conversion
  elections.sort((a, b) => {
    if (a.electionYear == null && b.electionYear == null) return 0;
    if (a.electionYear == null) return 1;
    if (b.electionYear == null) return -1;
    return b.electionYear - a.electionYear;
  });

  return {
    recentElection,
    elections,
  };
}

// ─── CANONICAL ASYNC ADAPTER DELEGATES (W021.5) ───

export type {
  CanonicalStateRecord,
  CanonicalParliamentaryConstituencyRecord,
  CanonicalConstituencyRecord,
  ByElectionScheduleItem,
};

/**
 * Asynchronous canonical constituency fetch.
 * Queries PostgreSQL public.constituencies via canonicalGeographyService when database is configured;
 * falls back seamlessly to in-memory seed data when offline.
 */
export async function getCanonicalConstituencies(stateCode: string): Promise<ConstituencyBrief[]> {
  if (canonicalGeographyService.isAvailable()) {
    try {
      const dbResults = await canonicalGeographyService.getConstituencies(stateCode);
      if (dbResults && dbResults.length > 0) return dbResults;
    } catch {
      // Fall back to seed data on database query exception
    }
  }
  return getConstituencies(stateCode);
}

/**
 * Asynchronous canonical single constituency fetch.
 * Queries PostgreSQL public.constituencies via canonicalGeographyService when database is configured;
 * falls back seamlessly to in-memory seed data when offline.
 */
export async function getCanonicalConstituency(stateCode: string, acNo: number): Promise<ConstituencyBrief | null> {
  if (canonicalGeographyService.isAvailable()) {
    try {
      const dbResult = await canonicalGeographyService.getConstituency(stateCode, acNo);
      if (dbResult) return dbResult;
    } catch {
      // Fall back to seed data on database query exception
    }
  }
  return getConstituency(stateCode, acNo);
}

/**
 * Asynchronous canonical state metadata fetch.
 * Queries PostgreSQL public.states via canonicalGeographyService when database is configured;
 * falls back to in-memory seed metadata when offline.
 */
export async function getCanonicalStateInfo(stateCode: string): Promise<StateDataInfo | null> {
  const baseInfo = getStateInfo(stateCode);
  if (!baseInfo) return null;
  if (canonicalGeographyService.isAvailable()) {
    try {
      const dbState = await canonicalGeographyService.getState(stateCode);
      if (dbState && dbState.name) {
        return {
          ...baseInfo,
          name: dbState.name,
          totalSeats: dbState.totalSeats > 0 ? dbState.totalSeats : baseInfo.totalSeats,
        };
      }
    } catch {
      // Fall back to seed info
    }
  }
  return baseInfo;
}

/**
 * Asynchronous canonical multi-state metadata fetch.
 */
export async function getAllCanonicalStatesInfo(): Promise<StateDataInfo[]> {
  const baseList = getAllStatesInfo();
  if (canonicalGeographyService.isAvailable()) {
    try {
      const dbStates = await canonicalGeographyService.getStates();
      if (dbStates && dbStates.length > 0) {
        const dbStateMap = new Map(dbStates.map((s) => [s.code.toUpperCase(), s]));
        return baseList.map((info) => {
          const match = dbStateMap.get(info.code);
          if (match && match.name) {
            return {
              ...info,
              name: match.name,
              totalSeats: match.totalSeats > 0 ? match.totalSeats : info.totalSeats,
            };
          }
          return info;
        });
      }
    } catch {
      // Fall back to seed list
    }
  }
  return baseList;
}

/**
 * Asynchronous canonical election data fetch.
 */
export async function getCanonicalConstituencyElectionData(stateCode: string, acNo: number): Promise<ConstituencyElectionData | null> {
  if (canonicalGeographyService.isAvailable()) {
    try {
      const dbData = await canonicalGeographyService.getConstituencyElectionData(stateCode, acNo);
      if (dbData && dbData.elections.length > 0) return dbData;
    } catch {
      // Fall back to seed
    }
  }
  return getConstituencyElectionData(stateCode, acNo);
}
