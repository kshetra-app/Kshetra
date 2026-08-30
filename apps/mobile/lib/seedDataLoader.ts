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
import { Platform } from 'react-native';

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
/**
 * Install the seed database to dbPath using multiple fallback strategies
 * to ensure 100% reliability across dev, test, and production release APKs.
 */
async function copySeedDbToDestination(dbPath: string): Promise<void> {
  const errors: string[] = [];

  // Strategy 1: Direct Android APK asset (`assets/seed-data.db`)
  if (Platform.OS === 'android') {
    try {
      console.log('[seedDataLoader] Strategy 1: copying from asset://seed-data.db');
      await FileSystem.copyAsync({ from: 'asset://seed-data.db', to: dbPath });
      const stat = await FileSystem.getInfoAsync(dbPath);
      if (stat.exists && (stat as any).size && (stat as any).size > 10_000_000) {
        console.log('[seedDataLoader] Strategy 1 succeeded, size:', (stat as any).size);
        return;
      }
    } catch (e: any) {
      errors.push(`Strategy 1 (asset://): ${e?.message ?? e}`);
    }

    // Strategy 2: Raw resource data_seeddata
    try {
      console.log('[seedDataLoader] Strategy 2: copying from raw data_seeddata');
      await FileSystem.copyAsync({ from: 'data_seeddata', to: dbPath });
      const stat = await FileSystem.getInfoAsync(dbPath);
      if (stat.exists && (stat as any).size && (stat as any).size > 10_000_000) {
        console.log('[seedDataLoader] Strategy 2 succeeded, size:', (stat as any).size);
        return;
      }
    } catch (e: any) {
      errors.push(`Strategy 2 (raw data_seeddata): ${e?.message ?? e}`);
    }

    // Strategy 3: Raw resource apps_mobile_data_seeddata
    try {
      console.log('[seedDataLoader] Strategy 3: copying from raw apps_mobile_data_seeddata');
      await FileSystem.copyAsync({ from: 'apps_mobile_data_seeddata', to: dbPath });
      const stat = await FileSystem.getInfoAsync(dbPath);
      if (stat.exists && (stat as any).size && (stat as any).size > 10_000_000) {
        console.log('[seedDataLoader] Strategy 3 succeeded, size:', (stat as any).size);
        return;
      }
    } catch (e: any) {
      errors.push(`Strategy 3 (raw apps_mobile_data_seeddata): ${e?.message ?? e}`);
    }
  }

  // Strategy 4: Expo Asset resolver
  try {
    console.log('[seedDataLoader] Strategy 4: Asset.fromModule downloadAsync');
    const asset = Asset.fromModule(DB_ASSET_MODULE);
    await asset.downloadAsync();
    const sourceUri = asset.localUri || asset.uri;
    if (sourceUri) {
      await FileSystem.copyAsync({ from: sourceUri, to: dbPath });
      const stat = await FileSystem.getInfoAsync(dbPath);
      if (stat.exists && (stat as any).size && (stat as any).size > 10_000_000) {
        console.log('[seedDataLoader] Strategy 4 succeeded, size:', (stat as any).size);
        return;
      }
    }
  } catch (e: any) {
    errors.push(`Strategy 4 (Asset.fromModule): ${e?.message ?? e}`);
  }

  const finalCheck = await FileSystem.getInfoAsync(dbPath);
  if (!finalCheck.exists || !((finalCheck as any).size && (finalCheck as any).size > 10_000_000)) {
    throw new Error(`[seedDataLoader] All database installation strategies failed:\n${errors.join('\n')}`);
  }
}

/**
 * Copy the bundled seed database into the SQLite directory if missing or stale.
 * Produces a single self-contained file (the build checkpoints its WAL), so we
 * also clear any stray -wal/-shm before copying a fresh version.
 */
async function ensureBundledDbCopied(forceReinstall = false): Promise<void> {
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
  const isValidDbSize = (dbInfo as any).size && (dbInfo as any).size > 10_000_000;
  if (!forceReinstall && dbInfo.exists && isValidDbSize) {
    let installedVersion: string | null = null;
    try {
      installedVersion = await FileSystem.readAsStringAsync(versionPath);
    } catch {
      installedVersion = null;
    }
    if (installedVersion === DB_ASSET_VERSION) return; // up to date and genuine DB size
  }

  // Remove any prior copy (and its journal siblings) before installing fresh.
  await FileSystem.deleteAsync(dbPath, { idempotent: true });
  await FileSystem.deleteAsync(`${dbPath}-wal`, { idempotent: true });
  await FileSystem.deleteAsync(`${dbPath}-shm`, { idempotent: true });

  await copySeedDbToDestination(dbPath);
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
      let db = await SQLite.openDatabaseAsync(DB_NAME);

      // Self-healing validation query: ensure database has tables and records
      let valid = false;
      try {
        const row = await db.getFirstAsync<{ count: number }>('SELECT count(id) as count FROM representatives');
        if (row && row.count > 100000) {
          valid = true;
          console.log('[seedDataLoader] Database integrity verified. Total representatives:', row.count);
        }
      } catch (checkErr) {
        console.warn('[seedDataLoader] Database verification query failed:', checkErr);
        valid = false;
      }

      if (!valid) {
        console.warn('[seedDataLoader] Database is empty or invalid. Forcing reinstall from APK assets...');
        await db.closeAsync().catch(() => {});
        await ensureBundledDbCopied(true);
        db = await SQLite.openDatabaseAsync(DB_NAME);
      }

      dbInstance = db;
      return db;
    } catch (err) {
      console.error('[seedDataLoader] Failed to open database:', err);
      dbInitPromise = null;
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
