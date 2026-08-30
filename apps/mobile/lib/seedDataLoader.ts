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
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
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

/**
 * Bundled prebuilt database. `openDatabaseAsync(DB_NAME)` reads from the app's
 * SQLite directory, so the bundled asset must be copied there on first launch.
 * The version is auto-derived from the DB content hash (see below), so no manual
 * bookkeeping is needed when the .db is rebuilt.
 */
const DB_NAME = 'seed-data.db';
// Auto-derived from the DB's content hash by scripts/build-seed-db.mjs — no
// manual bump needed. Changes whenever the bundled DB is rebuilt, which forces
// devices to re-copy the fresh file on next launch.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DB_ASSET_VERSION: string = require('../data/seed-db-version.json').version;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DB_ASSET_MODULE = require('../data/seed-data.db');

/**
 * Copy the bundled seed database into the SQLite directory if missing or stale.
 * Produces a single self-contained file (the build checkpoints its WAL), so we
 * also clear any stray -wal/-shm before copying a fresh version.
 */
async function ensureBundledDbCopied(): Promise<void> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    // Web platform or environment without document directory
    return;
  }
  const sqliteDir = `${docDir}SQLite`;
  const dbPath = `${sqliteDir}/${DB_NAME}`;
  const versionPath = `${dbPath}.version`;

  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  // Real seed-data.db is ~137MB. Any file smaller than 10MB is corrupt or a git LFS pointer.
  const isValidDbSize = (dbInfo as any).size && (dbInfo as any).size > 10_000_000;
  if (dbInfo.exists && isValidDbSize) {
    let installedVersion: string | null = null;
    try {
      installedVersion = await FileSystem.readAsStringAsync(versionPath);
    } catch {
      installedVersion = null;
    }
    if (installedVersion === DB_ASSET_VERSION) return; // up to date and genuine DB size
  }

  const asset = Asset.fromModule(DB_ASSET_MODULE);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('[seedDataLoader] bundled seed-data.db asset has no localUri');
  }

  // Remove any prior copy (and its journal siblings) before installing fresh.
  await FileSystem.deleteAsync(dbPath, { idempotent: true });
  await FileSystem.deleteAsync(`${dbPath}-wal`, { idempotent: true });
  await FileSystem.deleteAsync(`${dbPath}-shm`, { idempotent: true });

  await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
  await FileSystem.writeAsStringAsync(versionPath, DB_ASSET_VERSION);
  console.log('[seedDataLoader] Bundled seed-data.db installed into SQLite dir');
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
      await ensureBundledDbCopied();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
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
