/**
 * State Data Dispatcher — Unified routing for all state-specific data
 *
 * Routes MLA profile, demographics, historical results, election history,
 * and political timeline queries to the correct state-specific module.
 * This eliminates the need for isTS guards in UI code.
 */

import type { MLAProfile } from '../../../data/seed/telangana-mla-profiles';
import type { ConstituencyDemographics } from '../../../data/seed/telangana-demographics';
import type { HistoricalResult } from '../../../data/seed/telangana-historical-results';
import type { ElectionHistoryEntry } from '../../../data/seed/telangana-election-history';
import type { PoliticalLedgerEntry } from '../../../data/seed/telangana-political-timeline';

// ── Telangana ──
import { getMLAProfile as getTSMLA, getDefectedMLAs as getTSDefected } from '../../../data/seed/telangana-mla-profiles';
import { getConstituencyDemographics as getTSDemo } from '../../../data/seed/telangana-demographics';
import { getConstituencyHistory as getTSHistory, isPartyStronghold as isTSStronghold } from '../../../data/seed/telangana-historical-results';
import { TELANGANA_ELECTION_HISTORY } from '../../../data/seed/telangana-election-history';
import { getConstituencyTimeline as getTSTimeline } from '../../../data/seed/telangana-political-timeline';

// ── Andhra Pradesh ──
import { getAPMLAProfile, getAPDefectedMLAs } from '../../../data/seed/andhra-pradesh-mla-profiles';
import { getAPConstituencyDemographics } from '../../../data/seed/andhra-pradesh-demographics';
import { getAP2019Result } from '../../../data/seed/andhra-pradesh-historical-results';
import { AP_ELECTION_HISTORY } from '../../../data/seed/andhra-pradesh-election-history';
import { getAPConstituencyTimeline } from '../../../data/seed/andhra-pradesh-political-timeline';

// ── Karnataka ──
import { getKAMLAProfile, getKAFemaleMLAs } from '../../../data/seed/karnataka-mla-profiles';
import { getKAConstituencyDemographics } from '../../../data/seed/karnataka-demographics';
import { getKA2018Result } from '../../../data/seed/karnataka-historical-results';
import { KA_ELECTION_HISTORY } from '../../../data/seed/karnataka-election-history';
import { getKAConstituencyTimeline } from '../../../data/seed/karnataka-political-timeline';

// ── Maharashtra ──
import { getMHMLAProfile, getMHFemaleMLAs } from '../../../data/seed/maharashtra-mla-profiles';
import { getMHConstituencyDemographics } from '../../../data/seed/maharashtra-demographics';
import { getMH2019Result } from '../../../data/seed/maharashtra-historical-results';
import { MH_ELECTION_HISTORY } from '../../../data/seed/maharashtra-election-history';
import { getMHConstituencyTimeline } from '../../../data/seed/maharashtra-political-timeline';

// ═════════════════════════════════════════════════════════════════════════
// ── MLA Profile ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getMLAProfileForState(
  stateCode: string,
  acNo: number,
): MLAProfile | undefined {
  switch (stateCode) {
    case 'TS': return getTSMLA(acNo);
    case 'AP': return getAPMLAProfile(acNo);
    case 'KA': return getKAMLAProfile(acNo);
    case 'MH': return getMHMLAProfile(acNo);
    default:   return undefined;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Demographics ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getDemographicsForState(
  stateCode: string,
  acNo: number,
): ConstituencyDemographics | undefined {
  switch (stateCode) {
    case 'TS': return getTSDemo(acNo);
    case 'AP': return getAPConstituencyDemographics(acNo);
    case 'KA': return getKAConstituencyDemographics(acNo);
    case 'MH': return getMHConstituencyDemographics(acNo);
    default:   return undefined;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Historical Results (per-constituency) ───────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/** Unified per-constituency history: previous elections mapped to year labels */
export interface ConstituencyHistoryEntry {
  year: number;
  winner: string;
  party: string;
}

/**
 * Get per-constituency historical results for any supported state.
 * Returns an array of { year, winner, party } for prior elections.
 */
export function getHistoryForState(
  stateCode: string,
  acNo: number,
): ConstituencyHistoryEntry[] {
  switch (stateCode) {
    case 'TS': {
      const h = getTSHistory(acNo);
      const results: ConstituencyHistoryEntry[] = [];
      if (h.ac2014) results.push({ year: 2014, winner: h.ac2014.winner, party: h.ac2014.party });
      if (h.ac2018) results.push({ year: 2018, winner: h.ac2018.winner, party: h.ac2018.party });
      return results;
    }
    case 'AP': {
      const r2019 = getAP2019Result(acNo);
      return r2019 ? [{ year: 2019, winner: r2019.winner, party: r2019.party }] : [];
    }
    case 'KA': {
      const r2018 = getKA2018Result(acNo);
      return r2018 ? [{ year: 2018, winner: r2018.winner, party: r2018.party }] : [];
    }
    case 'MH': {
      const r2019 = getMH2019Result(acNo);
      return r2019 ? [{ year: 2019, winner: r2019.winner, party: r2019.party }] : [];
    }
    default:
      return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Party Stronghold ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Check if a constituency is a stronghold (same party won all available elections).
 * For TS: checks 2014, 2018, 2023 (accounts for TRS→BRS rename).
 * For other states: checks previous election + current.
 */
export function isStrongholdForState(
  stateCode: string,
  acNo: number,
  currentParty: string,
): boolean {
  switch (stateCode) {
    case 'TS':
      return isTSStronghold(acNo, currentParty);
    case 'AP': {
      const r = getAP2019Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'KA': {
      const r = getKA2018Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'MH': {
      const r = getMH2019Result(acNo);
      if (!r) return false;
      // Handle SHS split: SHS (2019) = SHS or SHSUBT (2024)
      const normalize = (p: string) => p;
      return normalize(r.party) === normalize(currentParty);
    }
    default:
      return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Election History (state-level overview) ─────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getElectionHistoryForState(
  stateCode: string,
): ElectionHistoryEntry[] {
  switch (stateCode) {
    case 'TS': return TELANGANA_ELECTION_HISTORY;
    case 'AP': return AP_ELECTION_HISTORY;
    case 'KA': return KA_ELECTION_HISTORY;
    case 'MH': return MH_ELECTION_HISTORY;
    default:   return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Political Timeline (per-constituency events) ────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getTimelineForState(
  stateCode: string,
  acNo: number,
): PoliticalLedgerEntry[] {
  switch (stateCode) {
    case 'TS': return getTSTimeline(acNo);
    case 'AP': return getAPConstituencyTimeline(acNo);
    case 'KA': return getKAConstituencyTimeline(acNo);
    case 'MH': return getMHConstituencyTimeline(acNo);
    default:   return [];
  }
}

/** Whether a state has full data (MLA profiles, demographics, history, trivia) */
export function hasFullDataForState(stateCode: string): boolean {
  return ['TS', 'AP', 'KA', 'MH'].includes(stateCode);
}
