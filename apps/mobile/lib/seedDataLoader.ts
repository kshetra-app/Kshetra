/**
 * Seed Data Loader — Lazy per-state loading from bundled SQLite
 *
 * Loads seed data (MLA profiles, demographics, history, timeline) from a
 * prebuilt SQLite database. Lazy-loads per state to avoid bundling all data
 * in memory. In-memory cache persists for session lifetime.
 *
 * API: synchronous (transparent to UI code)
 */

import * as SQLite from 'expo-sqlite';
import { useEffect, useRef } from 'react';

// ═════════════════════════════════════════════════════════════════════════
// ── Types ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export interface MLAProfileRow {
  id: string;
  state_code: string;
  ac_no: number;
  name: string;
  party: string;
  gender: string;
  terms_served: number;
  age: number;
  dob: string;
  dob_estimated: number;
  education: string;
  profession: string;
  criminal_cases: number;
  total_assets: number;
  total_liabilities: number;
  marital_status: string;
  photo_url: string;
  constituency_name: string;
  district: string;
  source_url: string;
}

export interface DemographicsRow {
  id: string;
  state_code: string;
  ac_no: number;
  population: number;
  total_voters: number;
  turnout_2023: number;
  male_voters: number;
  female_voters: number;
  literacy: number;
  urban_percent: number;
  sc_percent: number;
  st_percent: number;
  area_sq_km: number;
}

export interface HistoricalResultRow {
  id: string;
  state_code: string;
  ac_no: number;
  year: number;
  winner: string;
  party: string;
}

export interface PoliticalTimelineRow {
  id: string;
  state_code: string;
  ac_no: number;
  date: string;
  assembly: number;
  event_type: string;
  member_names: string;
  debit_party: string;
  credit_party: string;
  seats: number;
  explanation: string;
  details: string;
  legal_status: string;
  verified: number;
}

export interface ElectionHistoryRow {
  id: string;
  state_code: string;
  year: number;
  type: string;
  total_seats: number;
  ruling_party: string;
  notes: string;
}

export interface ElectionHistoryResultRow {
  id: string;
  election_id: string;
  party: string;
  seats_won: number;
  seats_contested: number;
}

// ═════════════════════════════════════════════════════════════════════════
// ── Singleton DB + Cache ───────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const cache = {
  mlaProfiles: new Map<string, Map<number, MLAProfileRow>>(),
  demographics: new Map<string, Map<number, DemographicsRow>>(),
  historicalResults: new Map<string, HistoricalResultRow[]>(),
  politicalTimeline: new Map<string, PoliticalTimelineRow[]>(),
  electionHistory: new Map<string, ElectionHistoryRow[]>(),
};

/**
 * Initialize the SQLite database (singleton).
 * Safe to call multiple times; returns same instance.
 */
async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('seed-data.db');
      dbInstance = db;
      console.log('[seedDataLoader] Database initialized');
      return db;
    } catch (err) {
      console.error('[seedDataLoader] Failed to open database:', err);
      throw err;
    }
  })();

  return dbInitPromise;
}

/**
 * Ensure DB is initialized before querying.
 */
async function ensureDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance!;
}

// ═════════════════════════════════════════════════════════════════════════
// ── MLA Profiles ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export async function loadMLAProfilesForState(stateCode: string): Promise<void> {
  if (cache.mlaProfiles.has(stateCode)) {
    return; // Already cached
  }

  const db = await ensureDB();
  const rows = await db.getAllAsync<MLAProfileRow>(
    'SELECT * FROM mla_profiles WHERE state_code = ?',
    [stateCode],
  );

  const stateCache = new Map<number, MLAProfileRow>();
  for (const row of rows) {
    stateCache.set(row.ac_no, row);
  }

  cache.mlaProfiles.set(stateCode, stateCache);
  console.log(`[seedDataLoader] Loaded ${rows.length} MLA profiles for ${stateCode}`);
}

/**
 * Get MLA profile synchronously (must be pre-loaded).
 * Call loadMLAProfilesForState() first.
 */
export function getMLAProfile(stateCode: string, acNo: number): MLAProfileRow | undefined {
  const stateCache = cache.mlaProfiles.get(stateCode);
  if (!stateCache) {
    console.warn(`[seedDataLoader] MLA profiles not loaded for ${stateCode}; call loadMLAProfilesForState() first`);
    return undefined;
  }
  return stateCache.get(acNo);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Demographics ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export async function loadDemographicsForState(stateCode: string): Promise<void> {
  if (cache.demographics.has(stateCode)) {
    return;
  }

  const db = await ensureDB();
  const rows = await db.getAllAsync<DemographicsRow>(
    'SELECT * FROM demographics WHERE state_code = ?',
    [stateCode],
  );

  const stateCache = new Map<number, DemographicsRow>();
  for (const row of rows) {
    stateCache.set(row.ac_no, row);
  }

  cache.demographics.set(stateCode, stateCache);
  console.log(`[seedDataLoader] Loaded ${rows.length} demographics for ${stateCode}`);
}

export function getDemographics(stateCode: string, acNo: number): DemographicsRow | undefined {
  const stateCache = cache.demographics.get(stateCode);
  if (!stateCache) {
    console.warn(`[seedDataLoader] Demographics not loaded for ${stateCode}`);
    return undefined;
  }
  return stateCache.get(acNo);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Historical Results ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export async function loadHistoricalResultsForState(stateCode: string): Promise<void> {
  if (cache.historicalResults.has(stateCode)) {
    return;
  }

  const db = await ensureDB();
  const rows = await db.getAllAsync<HistoricalResultRow>(
    'SELECT * FROM historical_results WHERE state_code = ? ORDER BY year DESC',
    [stateCode],
  );

  cache.historicalResults.set(stateCode, rows);
  console.log(`[seedDataLoader] Loaded ${rows.length} historical results for ${stateCode}`);
}

export function getHistoricalResults(stateCode: string, acNo: number): HistoricalResultRow[] {
  const rows = cache.historicalResults.get(stateCode);
  if (!rows) {
    console.warn(`[seedDataLoader] Historical results not loaded for ${stateCode}`);
    return [];
  }
  return rows.filter(r => r.ac_no === acNo);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Political Timeline ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export async function loadPoliticalTimelineForState(stateCode: string): Promise<void> {
  if (cache.politicalTimeline.has(stateCode)) {
    return;
  }

  const db = await ensureDB();
  const rows = await db.getAllAsync<PoliticalTimelineRow>(
    'SELECT * FROM political_timeline WHERE state_code = ? ORDER BY date DESC',
    [stateCode],
  );

  cache.politicalTimeline.set(stateCode, rows);
  console.log(`[seedDataLoader] Loaded ${rows.length} timeline events for ${stateCode}`);
}

export function getPoliticalTimeline(stateCode: string, acNo?: number): PoliticalTimelineRow[] {
  const rows = cache.politicalTimeline.get(stateCode);
  if (!rows) {
    console.warn(`[seedDataLoader] Political timeline not loaded for ${stateCode}`);
    return [];
  }
  if (acNo === undefined) {
    return rows;
  }
  return rows.filter(r => r.ac_no === acNo);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Election History ───────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export async function loadElectionHistoryForState(stateCode: string): Promise<void> {
  if (cache.electionHistory.has(stateCode)) {
    return;
  }

  const db = await ensureDB();
  const rows = await db.getAllAsync<ElectionHistoryRow>(
    'SELECT * FROM election_history WHERE state_code = ? ORDER BY year DESC',
    [stateCode],
  );

  cache.electionHistory.set(stateCode, rows);
  console.log(`[seedDataLoader] Loaded ${rows.length} election history entries for ${stateCode}`);
}

export function getElectionHistory(stateCode: string): ElectionHistoryRow[] {
  const rows = cache.electionHistory.get(stateCode);
  if (!rows) {
    console.warn(`[seedDataLoader] Election history not loaded for ${stateCode}`);
    return [];
  }
  return rows;
}

// ═════════════════════════════════════════════════════════════════════════
// ── Bulk Load (convenience) ────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Load all seed data for a state at once.
 * Call this when navigating to a state detail screen.
 */
export async function loadAllSeedDataForState(stateCode: string): Promise<void> {
  console.log(`[seedDataLoader] Loading all seed data for ${stateCode}...`);
  await Promise.all([
    loadMLAProfilesForState(stateCode),
    loadDemographicsForState(stateCode),
    loadHistoricalResultsForState(stateCode),
    loadPoliticalTimelineForState(stateCode),
    loadElectionHistoryForState(stateCode),
  ]);
  console.log(`[seedDataLoader] All seed data loaded for ${stateCode}`);
}

// ═════════════════════════════════════════════════════════════════════════
// ── React Hook ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function useSeedDataLoader(stateCode: string) {
  const loadingRef = useRef(false);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    loadAllSeedDataForState(stateCode).catch(err => {
      console.error(`[useSeedDataLoader] Failed to load seed data for ${stateCode}:`, err);
    });
  }, [stateCode]);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Cache Status ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function isSeedDataLoadedForState(stateCode: string): boolean {
  return (
    cache.mlaProfiles.has(stateCode) &&
    cache.demographics.has(stateCode) &&
    cache.historicalResults.has(stateCode) &&
    cache.politicalTimeline.has(stateCode) &&
    cache.electionHistory.has(stateCode)
  );
}

export function clearCache(): void {
  cache.mlaProfiles.clear();
  cache.demographics.clear();
  cache.historicalResults.clear();
  cache.politicalTimeline.clear();
  cache.electionHistory.clear();
  console.log('[seedDataLoader] Cache cleared');
}
