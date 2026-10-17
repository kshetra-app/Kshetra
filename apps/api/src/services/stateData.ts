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

// Generic Mapper
function genericToBrief(stateCode: string, c: any): ConstituencyBrief {
  const code = stateCode.toUpperCase();
  let currentParty = c.winner2025 ?? c.winner2024 ?? c.winner2023 ?? c.winner2022 ?? c.winner2021 ?? c.winner ?? '';
  let currentMLA = c.winnerName2025 ?? c.winnerName2024 ?? c.winnerName2023 ?? c.winnerName2022 ?? c.winnerName2021 ?? c.winnerName ?? '';

  // By-election overrides for confirmed October 2026 by-elections
  if (code === 'TN' && c.acNo === 35) {
    currentParty = 'TVK';
    currentMLA = 'K. Maragatham Kumaravel';
  } else if (code === 'TN' && c.acNo === 101) {
    currentParty = 'TVK';
    currentMLA = 'P. Sathyabama';
  } else if (code === 'WB' && c.acNo === 210) {
    currentParty = 'BJP';
    currentMLA = 'Hasi Rani Rath';
  } else if (code === 'WB' && c.acNo === 70) {
    currentParty = 'BJP';
    currentMLA = 'Shankharavh Sarkar';
  } else if (code === 'PY' && (c.acNo === 9 || c.name === 'Thattanchavady')) {
    currentParty = 'AINRC';
    currentMLA = 'Ashok Anand';
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

export interface ConstituencyElectionSummary {
  electionYear: number;
  electionType: 'GENERAL' | 'BYPOLL';
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
 * Preserves actual election years (e.g. 2025 for DL, 2024 for AP/MH, 2023 for TS/KA, 2022 for UP, etc.)
 * Preserves null for missing vote totals or margins without zero coercion.
 */
export function getConstituencyElectionData(stateCode: string, acNo: number): ConstituencyElectionData | null {
  const code = stateCode.toUpperCase();
  const raw = getRawConstituency(code, acNo);
  const brief = getConstituency(code, acNo);
  if (!raw && !brief) return null;

  // Determine actual election year and results
  let year = 2024;
  let winner = '';
  let winnerName = '';
  let winnerVotes: number | null = null;
  let runnerUp = '';
  let margin: number | null = null;

  if (raw) {
    if (raw.winner2025 !== undefined) {
      year = 2025;
      winner = raw.winner2025;
      winnerName = raw.winnerName2025 ?? '';
      winnerVotes = typeof raw.winnerVotes2025 === 'number' ? raw.winnerVotes2025 : null;
      runnerUp = raw.runnerUp2025 ?? '';
      margin = typeof raw.margin2025 === 'number' ? raw.margin2025 : null;
    } else if (raw.winner2024 !== undefined) {
      year = 2024;
      winner = raw.winner2024;
      winnerName = raw.winnerName2024 ?? '';
      winnerVotes = typeof raw.winnerVotes2024 === 'number' ? raw.winnerVotes2024 : null;
      runnerUp = raw.runnerUp2024 ?? '';
      margin = typeof raw.margin2024 === 'number' ? raw.margin2024 : null;
    } else if (raw.winner2023 !== undefined) {
      year = 2023;
      winner = raw.winner2023;
      winnerName = raw.winnerName2023 ?? '';
      winnerVotes = typeof raw.winnerVotes2023 === 'number' ? raw.winnerVotes2023 : null;
      runnerUp = raw.runnerUp2023 ?? '';
      margin = typeof raw.margin2023 === 'number' ? raw.margin2023 : null;
    } else if (raw.winner2022 !== undefined) {
      year = 2022;
      winner = raw.winner2022;
      winnerName = raw.winnerName2022 ?? '';
      winnerVotes = typeof raw.winnerVotes2022 === 'number' ? raw.winnerVotes2022 : null;
      runnerUp = raw.runnerUp2022 ?? '';
      margin = typeof raw.margin2022 === 'number' ? raw.margin2022 : null;
    } else if (raw.winner2021 !== undefined) {
      year = 2021;
      winner = raw.winner2021;
      winnerName = raw.winnerName2021 ?? '';
      winnerVotes = typeof raw.winnerVotes2021 === 'number' ? raw.winnerVotes2021 : null;
      runnerUp = raw.runnerUp2021 ?? '';
      margin = typeof raw.margin2021 === 'number' ? raw.margin2021 : null;
    } else {
      winner = raw.winner ?? brief?.currentParty ?? '';
      winnerName = raw.winnerName ?? brief?.currentMLA ?? '';
      winnerVotes = typeof raw.winnerVotes === 'number' ? raw.winnerVotes : null;
      runnerUp = raw.runnerUp ?? '';
      margin = typeof raw.margin === 'number' ? raw.margin : null;
      if (['BR'].includes(code)) year = 2020;
      else if (['TS', 'KA', 'MP', 'RJ', 'CG', 'MZ', 'NL', 'TR', 'ML'].includes(code)) year = 2023;
      else if (['UP', 'PB', 'GJ', 'GA', 'HP', 'MN', 'UK'].includes(code)) year = 2022;
      else if (['TN', 'KL', 'WB', 'AS', 'PY'].includes(code)) year = 2021;
      else year = 2024;
    }
  } else if (brief) {
    winner = brief.currentParty;
    winnerName = brief.currentMLA;
  }

  const marginPercent =
    winnerVotes && winnerVotes > 0 && margin != null
      ? parseFloat(((margin / winnerVotes) * 100).toFixed(1))
      : null;

  const recentElection: ConstituencyElectionSummary = {
    electionYear: year,
    electionType: 'GENERAL',
    winner,
    winnerName,
    winnerVotes,
    runnerUp,
    margin,
    marginPercent,
  };

  const elections: ConstituencyElectionSummary[] = [recentElection];

  // Attach verified historical per-constituency election records
  if (code === 'TS') {
    const h2018 = TELANGANA_2018_RESULTS.find((r) => r.acNo === acNo);
    if (h2018) {
      elections.push({
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
      elections.push({
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
  } else if (code === 'AP') {
    const h2019 = AP_2019_RESULTS.find((r) => r.acNo === acNo);
    if (h2019) {
      elections.push({
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
  } else if (code === 'KA') {
    const h2018 = getKA2018Result(acNo);
    if (h2018) {
      elections.push({
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
  } else if (code === 'MH') {
    const h2019 = getMH2019Result(acNo);
    if (h2019) {
      elections.push({
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
  } else if (code === 'TN') {
    const h2016 = getTN2016Result(acNo);
    if (h2016) {
      elections.push({
        electionYear: 2016,
        electionType: 'GENERAL',
        winner: h2016.party,
        winnerName: h2016.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
  } else if (code === 'KL') {
    const h2016 = getKL2016Result(acNo);
    if (h2016) {
      elections.push({
        electionYear: 2016,
        electionType: 'GENERAL',
        winner: h2016.party,
        winnerName: h2016.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
  } else if (code === 'WB') {
    const h2016 = getWB2016Result(acNo);
    if (h2016) {
      elections.push({
        electionYear: 2016,
        electionType: 'GENERAL',
        winner: h2016.party,
        winnerName: h2016.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
  } else if (code === 'UP') {
    const h2017 = getUP2017Result(acNo);
    if (h2017) {
      elections.push({
        electionYear: 2017,
        electionType: 'GENERAL',
        winner: h2017.party,
        winnerName: h2017.winner,
        winnerVotes: null,
        runnerUp: '',
        margin: null,
        marginPercent: null,
      });
    }
  }

  return {
    recentElection,
    elections,
  };
}
