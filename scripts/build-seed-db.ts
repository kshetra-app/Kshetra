#!/usr/bin/env tsx

/**
 * Build Seed Data SQLite Database
 *
 * Converts seed .ts files into a prebuilt SQLite database.
 * Uses tsx to handle TypeScript imports natively.
 *
 * Output: apps/mobile/data/seed-data.db
 * Manifest: apps/mobile/data/seed-manifest.json
 *
 * Run: npx tsx scripts/build-seed-db.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

// Import all seed data
import { TELANGANA_CONSTITUENCIES } from '../data/seed/telangana-constituencies';
import { AP_CONSTITUENCIES } from '../data/seed/andhra-pradesh-constituencies';
import { KA_CONSTITUENCIES } from '../data/seed/karnataka-constituencies';
import { MH_CONSTITUENCIES } from '../data/seed/maharashtra-constituencies';
import { TN_CONSTITUENCIES } from '../data/seed/tamil-nadu-constituencies';
import { KL_CONSTITUENCIES } from '../data/seed/kerala-constituencies';
import { WB_CONSTITUENCIES } from '../data/seed/west-bengal-constituencies';
import { UP_CONSTITUENCIES } from '../data/seed/uttar-pradesh-constituencies';
import { RJ_CONSTITUENCIES } from '../data/seed/rajasthan-constituencies';
import { GJ_CONSTITUENCIES } from '../data/seed/gujarat-constituencies';
import { JH_CONSTITUENCIES } from '../data/seed/jharkhand-constituencies';
import { OD_CONSTITUENCIES } from '../data/seed/odisha-constituencies';
import { DL_CONSTITUENCIES } from '../data/seed/delhi-constituencies';
import { PB_CONSTITUENCIES } from '../data/seed/punjab-constituencies';
import { HR_CONSTITUENCIES } from '../data/seed/haryana-constituencies';
import { CG_CONSTITUENCIES } from '../data/seed/chhattisgarh-constituencies';
import { MP_CONSTITUENCIES } from '../data/seed/madhya-pradesh-constituencies';
import { BR_CONSTITUENCIES } from '../data/seed/bihar-constituencies';
import { AS_CONSTITUENCIES } from '../data/seed/assam-constituencies';
import { GA_CONSTITUENCIES } from '../data/seed/goa-constituencies';
import { HP_CONSTITUENCIES } from '../data/seed/himachal-pradesh-constituencies';
import { JK_CONSTITUENCIES } from '../data/seed/jammu-kashmir-constituencies';
import { MN_CONSTITUENCIES } from '../data/seed/manipur-constituencies';
import { ML_CONSTITUENCIES } from '../data/seed/meghalaya-constituencies';
import { MZ_CONSTITUENCIES } from '../data/seed/mizoram-constituencies';
import { NL_CONSTITUENCIES } from '../data/seed/nagaland-constituencies';
import { TR_CONSTITUENCIES } from '../data/seed/tripura-constituencies';
import { SK_CONSTITUENCIES } from '../data/seed/sikkim-constituencies';
import { AR_CONSTITUENCIES } from '../data/seed/arunachal-pradesh-constituencies';
import { UK_CONSTITUENCIES } from '../data/seed/uttarakhand-constituencies';
import { PY_CONSTITUENCIES } from '../data/seed/puducherry-constituencies';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(rootDir, 'apps/mobile/data');
const dbPath = path.resolve(dataDir, 'seed-data.db');

// ═════════════════════════════════════════════════════════════════════════
// ── Schema ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

function initSchema(db: Database.Database) {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS seed_manifest (
      state_code TEXT PRIMARY KEY,
      version TEXT,
      has_constituencies INTEGER,
      constituency_count INTEGER,
      last_updated TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
  `);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Data Import ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

interface StateConfig {
  code: string;
  year: number;
  data: any[];
}

async function importSeedData(db: Database.Database) {
  const stateConfigs: StateConfig[] = [
    { code: 'TS', year: 2023, data: TELANGANA_CONSTITUENCIES },
    { code: 'AP', year: 2024, data: AP_CONSTITUENCIES },
    { code: 'KA', year: 2023, data: KA_CONSTITUENCIES },
    { code: 'MH', year: 2024, data: MH_CONSTITUENCIES },
    { code: 'TN', year: 2026, data: TN_CONSTITUENCIES },
    { code: 'KL', year: 2026, data: KL_CONSTITUENCIES },
    { code: 'WB', year: 2026, data: WB_CONSTITUENCIES },
    { code: 'UP', year: 2022, data: UP_CONSTITUENCIES },
    { code: 'RJ', year: 2023, data: RJ_CONSTITUENCIES },
    { code: 'GJ', year: 2022, data: GJ_CONSTITUENCIES },
    { code: 'JH', year: 2024, data: JH_CONSTITUENCIES },
    { code: 'OD', year: 2024, data: OD_CONSTITUENCIES },
    { code: 'DL', year: 2022, data: DL_CONSTITUENCIES },
    { code: 'PB', year: 2022, data: PB_CONSTITUENCIES },
    { code: 'HR', year: 2024, data: HR_CONSTITUENCIES },
    { code: 'CG', year: 2023, data: CG_CONSTITUENCIES },
    { code: 'MP', year: 2023, data: MP_CONSTITUENCIES },
    { code: 'BR', year: 2020, data: BR_CONSTITUENCIES },
    { code: 'AS', year: 2026, data: AS_CONSTITUENCIES },
    { code: 'GA', year: 2022, data: GA_CONSTITUENCIES },
    { code: 'HP', year: 2022, data: HP_CONSTITUENCIES },
    { code: 'JK', year: 2024, data: JK_CONSTITUENCIES },
    { code: 'MN', year: 2022, data: MN_CONSTITUENCIES },
    { code: 'ML', year: 2023, data: ML_CONSTITUENCIES },
    { code: 'MZ', year: 2023, data: MZ_CONSTITUENCIES },
    { code: 'NL', year: 2023, data: NL_CONSTITUENCIES },
    { code: 'TR', year: 2023, data: TR_CONSTITUENCIES },
    { code: 'SK', year: 2024, data: SK_CONSTITUENCIES },
    { code: 'AR', year: 2024, data: AR_CONSTITUENCIES },
    { code: 'UK', year: 2022, data: UK_CONSTITUENCIES },
    { code: 'PY', year: 2026, data: PY_CONSTITUENCIES },
  ];

  const manifest: Record<string, any> = {};
  const insertConst = db.prepare(`
    INSERT OR REPLACE INTO constituencies
    (id, state_code, ac_no, name, district, type, winner_party, winner_name, winner_votes, runner_up, margin, current_party, election_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const { code, year, data } of stateConfigs) {
    console.log(`[${code}] Importing...`);
    
    const stateManifest = {
      state_code: code,
      version: '',
      has_constituencies: 0,
      constituency_count: 0,
      last_updated: new Date().toISOString(),
    };

    try {
      for (const c of data) {
        try {
          const winnerKey = `winner${year}`;
          const winnerNameKey = `winnerName${year}`;
          const winnerVotesKey = `winnerVotes${year}`;
          const runnerUpKey = `runnerUp${year}`;
          const marginKey = `margin${year}`;

          insertConst.run(
            `${code}-AC-${c.acNo}`,
            code,
            c.acNo,
            c.name,
            c.district || '',
            c.type || 'GEN',
            c[winnerKey] || c.winner || '',
            c[winnerNameKey] || c.winnerName || '',
            c[winnerVotesKey] || 0,
            c[runnerUpKey] || '',
            c[marginKey] || 0,
            c.currentParty || c[winnerKey] || '',
            year,
          );
        } catch (e) {
          // Skip malformed rows
        }
      }

      stateManifest.has_constituencies = data.length > 0 ? 1 : 0;
      stateManifest.constituency_count = data.length;
      
      if (data.length > 0) {
        console.log(`  ✓ ${data.length} constituencies`);
      }

      // Insert state manifest
      const insertManifest = db.prepare(`
        INSERT OR REPLACE INTO seed_manifest
        (state_code, version, has_constituencies, constituency_count, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertManifest.run(
        stateManifest.state_code,
        crypto.createHash('sha256').update(JSON.stringify(stateManifest)).digest('hex').slice(0, 12),
        stateManifest.has_constituencies,
        stateManifest.constituency_count,
        stateManifest.last_updated,
      );

      manifest[code] = stateManifest;
    } catch (err: any) {
      console.error(`  ✗ ${code}:`, err.message);
    }
  }

  return manifest;
}

// ═════════════════════════════════════════════════════════════════════════
// ── Main ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔨 Building seed data SQLite database...\n');

  // Remove old DB
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Create DB
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  try {
    // Initialize schema
    console.log('📋 Initializing schema...');
    initSchema(db);

    // Import data
    console.log('📥 Importing seed data...\n');
    const manifest = await importSeedData(db);

    // Optimize
    console.log('\n⚙️  Optimizing database...');
    db.exec('VACUUM; ANALYZE;');

    // Get stats
    const dbStats = fs.statSync(dbPath);
    const dbSizeMB = (dbStats.size / 1024 / 1024).toFixed(2);

    console.log(`\n✅ Database created: ${dbPath}`);
    console.log(`   Size: ${dbSizeMB} MB`);

    // Write manifest
    const manifestPath = path.resolve(dataDir, 'seed-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Manifest written: ${manifestPath}`);

    console.log('\n📊 Summary:');
    const totalConstituencies = Object.values(manifest).reduce((sum: number, m: any) => sum + m.constituency_count, 0);
    console.log(`   States: ${Object.keys(manifest).length}`);
    console.log(`   Total constituencies: ${totalConstituencies}`);
    console.log(`   Database size: ${dbSizeMB} MB`);
    console.log(`   Estimated gzipped: ${(dbStats.size * 0.3 / 1024 / 1024).toFixed(2)} MB`);
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
