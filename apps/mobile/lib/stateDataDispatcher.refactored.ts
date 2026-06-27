/**
 * State Data Dispatcher (Refactored) — Unified routing for all state-specific data
 *
 * Routes MLA profile, demographics, historical results, election history,
 * and political timeline queries to SQLite instead of bundled seed files.
 * This eliminates the need for isTS guards in UI code.
 *
 * All APIs remain synchronous (transparent to UI code).
 * Seed data must be pre-loaded via seedDataLoader.loadAllSeedDataForState().
 */

import type { MLAProfile } from '../../../data/seed/telangana-mla-profiles';
import type { ConstituencyDemographics } from '../../../data/seed/telangana-demographics';
import type { HistoricalResult } from '../../../data/seed/telangana-historical-results';
import type { ElectionHistoryEntry } from '../../../data/seed/telangana-election-history';
import type { PoliticalLedgerEntry } from '../../../data/seed/telangana-political-timeline';
import { getUnifiedConstituenciesForState } from './stateDataAdapter';
import {
  getMLAProfile as getMLAFromDB,
  getDemographics as getDemoFromDB,
  getHistoricalResults as getHistoryFromDB,
  getPoliticalTimeline as getTimelineFromDB,
  getElectionHistory as getElecFromDB,
  isSeedDataLoadedForState,
} from './seedDataLoader';

// ═════════════════════════════════════════════════════════════════════════
// ── MLA Profile ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt SQLite row → MLAProfile (codebase standard)
 */
function adaptMLAProfileFromDB(row: any): MLAProfile | undefined {
  if (!row) return undefined;
  return {
    acNo: row.ac_no,
    name: row.name,
    party: row.party,
    gender: row.gender,
    terms: row.terms_served,
    age: row.age,
    dob: row.dob,
    dobEstimated: row.dob_estimated === 1,
    education: row.education,
    profession: row.profession,
    criminalCases: row.criminal_cases,
    totalAssets: row.total_assets,
    totalLiabilities: row.total_liabilities,
    maritalStatus: row.marital_status,
    photoUrl: row.photo_url,
    constituencyName: row.constituency_name,
    district: row.district,
    sourceUrl: row.source_url,
  };
}

/** Normalize name for fuzzy comparison */
function normalizeForCompare(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Check if two names refer to the same person (partial match) */
function namesMatch(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  const aParts = na.split(' ').filter(p => p.length > 2);
  const bParts = nb.split(' ').filter(p => p.length > 2);
  return aParts.some(p => bParts.some(q => q.includes(p) || p.includes(q)));
}

/**
 * Get MLA profile with seed-data reconciliation.
 * If the profile name doesn't match the seed winner, override with seed winner name.
 */
export function getMLAProfileForState(
  stateCode: string,
  acNo: number,
): MLAProfile | undefined {
  if (!isSeedDataLoadedForState(stateCode)) {
    console.warn(`[stateDataDispatcher] Seed data not loaded for ${stateCode}; call seedDataLoader.loadAllSeedDataForState() first`);
    return undefined;
  }

  const rawProfile = getMLAFromDB(stateCode, acNo);
  if (!rawProfile) return undefined;

  const adapted = adaptMLAProfileFromDB(rawProfile);
  if (!adapted) return undefined;

  // Cross-reference with seed's winner name for consistency
  const constituency = getUnifiedConstituenciesForState(stateCode).find(c => c.acNo === acNo);
  if (!constituency) return adapted;

  // If names already match, return as-is
  if (namesMatch(adapted.name, constituency.winnerName)) return adapted;

  // Override profile name with seed's winnerName to prevent "two MLAs" display
  return { ...adapted, name: constituency.winnerName };
}

// ═════════════════════════════════════════════════════════════════════════
// ── Demographics ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt SQLite row → ConstituencyDemographics
 */
function adaptDemographicsFromDB(row: any): ConstituencyDemographics | undefined {
  if (!row) return undefined;
  return {
    acNo: row.ac_no,
    population: row.population,
    totalVoters: row.total_voters,
    turnout2023: row.turnout_2023,
    maleVoters: row.male_voters,
    femaleVoters: row.female_voters,
    literacy: row.literacy,
    urbanPercent: row.urban_percent,
    scPercent: row.sc_percent,
    stPercent: row.st_percent,
    areaSqKm: row.area_sq_km,
  };
}

export function getDemographicsForState(
  stateCode: string,
  acNo: number,
): ConstituencyDemographics | undefined {
  if (!isSeedDataLoadedForState(stateCode)) {
    console.warn(`[stateDataDispatcher] Seed data not loaded for ${stateCode}`);
    return undefined;
  }

  const row = getDemoFromDB(stateCode, acNo);
  return adaptDemographicsFromDB(row);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Historical Results (per-constituency) ───────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

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
  if (!isSeedDataLoadedForState(stateCode)) {
    console.warn(`[stateDataDispatcher] Seed data not loaded for ${stateCode}`);
    return [];
  }

  const rows = getHistoryFromDB(stateCode, acNo);
  return rows.map(r => ({
    year: r.year,
    winner: r.winner,
    party: r.party,
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// ── Party Stronghold ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Check if a constituency is a stronghold (same party won all available elections).
 */
export function isStrongholdForState(
  stateCode: string,
  acNo: number,
  currentParty: string,
): boolean {
  const history = getHistoryForState(stateCode, acNo);
  if (history.length === 0) return false;

  // All historical elections must have same party
  return history.every(h => h.party === currentParty);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Election History (state-level overview) ─────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getElectionHistoryForState(
  stateCode: string,
): ElectionHistoryEntry[] {
  if (!isSeedDataLoadedForState(stateCode)) {
    console.warn(`[stateDataDispatcher] Seed data not loaded for ${stateCode}`);
    return [];
  }

  const rows = getElecFromDB(stateCode);
  return rows.map(r => ({
    year: r.year,
    type: 'assembly' as const,
    totalSeats: r.total_seats,
    partyResults: [], // TODO: fetch from election_history_results table
    notes: r.notes,
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// ── Political Timeline (per-constituency events) ────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt SQLite row → PoliticalLedgerEntry
 */
function adaptTimelineFromDB(row: any): PoliticalLedgerEntry {
  return {
    id: row.id,
    date: row.date,
    assembly: row.assembly as 1,
    eventType: row.event_type as any,
    acNos: row.ac_no ? [row.ac_no] : [],
    memberNames: row.member_names ? JSON.parse(row.member_names) : [],
    debitParty: row.debit_party,
    creditParty: row.credit_party,
    seats: row.seats,
    explanation: row.explanation,
    details: row.details,
    legalStatus: row.legal_status as any,
    sources: [],
    verified: row.verified === 1,
  };
}

export function getTimelineForState(
  stateCode: string,
  acNo: number,
): PoliticalLedgerEntry[] {
  if (!isSeedDataLoadedForState(stateCode)) {
    console.warn(`[stateDataDispatcher] Seed data not loaded for ${stateCode}`);
    return [];
  }

  const rows = getTimelineFromDB(stateCode, acNo);
  return rows.map(adaptTimelineFromDB);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Full Data Check ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Whether a state has full data (MLA profiles, demographics, history, timeline)
 */
export function hasFullDataForState(stateCode: string): boolean {
  return [
    'TS', 'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP',
    'RJ', 'GJ', 'JH', 'OD', 'DL', 'PB', 'HR', 'CG',
    'MP', 'BR', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ',
    'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK',
  ].includes(stateCode);
}
