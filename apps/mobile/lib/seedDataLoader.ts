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
  total_assets: number | null;
  total_liabilities: number | null;
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

/**
 * Bundled prebuilt database. `openDatabaseAsync(DB_NAME)` reads from the app's
 * SQLite directory, so the bundled asset must be copied there on first launch.
 * The version is auto-derived from the DB content hash (see below), so no manual
 * bookkeeping is needed when the .db is rebuilt.
 */
const DB_NAME = 'seed-data.db';
// Auto-derived version tracking
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DB_ASSET_VERSION: string = require('../data/seed-db-version.json').version;

/**
 * Initialize local database tables and indexes if not already present.
 * Decoupled from static APK bundle weight (0 MB bundle footprint).
 */
async function initLocalSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS constituencies (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      ac_no INTEGER NOT NULL,
      name TEXT NOT NULL,
      district TEXT,
      type TEXT,
      winner_party TEXT,
      winner_name TEXT,
      winner_votes INTEGER,
      runner_up TEXT,
      margin INTEGER,
      current_party TEXT,
      election_year INTEGER,
      UNIQUE(state_code, ac_no)
    );

    CREATE TABLE IF NOT EXISTS mla_profiles (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      ac_no INTEGER NOT NULL,
      name TEXT,
      party TEXT,
      gender TEXT,
      terms_served INTEGER,
      age INTEGER,
      dob TEXT,
      dob_estimated INTEGER,
      education TEXT,
      profession TEXT,
      criminal_cases INTEGER,
      total_assets REAL,
      total_liabilities REAL,
      marital_status TEXT,
      photo_url TEXT,
      constituency_name TEXT,
      district TEXT,
      source_url TEXT,
      UNIQUE(state_code, ac_no)
    );

    CREATE TABLE IF NOT EXISTS demographics (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      ac_no INTEGER NOT NULL,
      population INTEGER,
      total_voters INTEGER,
      turnout_2023 REAL,
      male_voters INTEGER,
      female_voters INTEGER,
      literacy REAL,
      urban_percent REAL,
      sc_percent REAL,
      st_percent REAL,
      area_sq_km REAL,
      UNIQUE(state_code, ac_no)
    );

    CREATE TABLE IF NOT EXISTS historical_results (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      ac_no INTEGER NOT NULL,
      year INTEGER NOT NULL,
      winner TEXT,
      party TEXT,
      UNIQUE(state_code, ac_no, year)
    );

    CREATE TABLE IF NOT EXISTS political_timeline (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      ac_no INTEGER,
      date TEXT,
      assembly INTEGER,
      event_type TEXT,
      member_names TEXT,
      debit_party TEXT,
      credit_party TEXT,
      seats INTEGER,
      explanation TEXT,
      details TEXT,
      legal_status TEXT,
      verified INTEGER
    );

    CREATE TABLE IF NOT EXISTS election_history (
      id TEXT PRIMARY KEY,
      state_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT,
      total_seats INTEGER,
      ruling_party TEXT,
      notes TEXT,
      UNIQUE(state_code, year)
    );

    CREATE TABLE IF NOT EXISTS election_history_results (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      party TEXT NOT NULL,
      seats_won INTEGER,
      seats_contested INTEGER,
      FOREIGN KEY(election_id) REFERENCES election_history(id)
    );

    CREATE TABLE IF NOT EXISTS seed_manifest (
      state_code TEXT PRIMARY KEY,
      version TEXT,
      has_mla_profiles INTEGER,
      has_demographics INTEGER,
      has_historical_results INTEGER,
      has_political_timeline INTEGER,
      has_election_history INTEGER,
      constituency_count INTEGER,
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS representatives (
      id TEXT PRIMARY KEY,
      office_type TEXT NOT NULL,
      jurisdiction_type TEXT,
      jurisdiction_id TEXT,
      state_code TEXT NOT NULL,
      district TEXT,
      district_slug TEXT,
      mandal TEXT,
      mandal_slug TEXT,
      gram_panchayat TEXT,
      gp_key TEXT,
      ward_no TEXT,
      constituency TEXT,
      name TEXT NOT NULL,
      party TEXT,
      party_official INTEGER,
      elected_party TEXT,
      gender TEXT,
      reservation TEXT,
      votes INTEGER,
      election_year INTEGER,
      is_current INTEGER,
      source_type TEXT,
      source_url TEXT,
      data_status TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
    CREATE INDEX IF NOT EXISTS idx_mla_profiles_state ON mla_profiles(state_code);
    CREATE INDEX IF NOT EXISTS idx_demographics_state ON demographics(state_code);
    CREATE INDEX IF NOT EXISTS idx_historical_results_state_year ON historical_results(state_code, year);
    CREATE INDEX IF NOT EXISTS idx_political_timeline_state_ac ON political_timeline(state_code, ac_no);
    CREATE INDEX IF NOT EXISTS idx_election_history_state ON election_history(state_code);
    CREATE INDEX IF NOT EXISTS idx_reps_state_office ON representatives(state_code, office_type);
    CREATE INDEX IF NOT EXISTS idx_reps_state_district ON representatives(state_code, district_slug);
    CREATE INDEX IF NOT EXISTS idx_reps_state_mandal ON representatives(state_code, district_slug, mandal_slug);
    CREATE INDEX IF NOT EXISTS idx_reps_gpkey ON representatives(state_code, gp_key);
    CREATE INDEX IF NOT EXISTS idx_reps_jurisdiction ON representatives(jurisdiction_type, jurisdiction_id);
  `);
}

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
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await initLocalSchema(db);
      dbInstance = db;
      console.log('[seedDataLoader] Local SQLite database initialized with decoupled schema (version:', DB_ASSET_VERSION, ')');
      return db;
    } catch (err) {
      console.error('[seedDataLoader] Failed to initialize local SQLite database:', err);
      dbInitPromise = null;
      throw err;
    }
  })();

  return dbInitPromise;
}

async function ensureDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance!;
}

/**
 * Shared handle to the bundled `seed-data.db` for other modules (e.g.
 * representativesData) so the whole app uses a single connection + init path.
 */
export async function getSeedDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureDB();
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
