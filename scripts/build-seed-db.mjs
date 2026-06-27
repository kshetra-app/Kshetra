#!/usr/bin/env node

/**
 * Build Seed Data SQLite Database
 *
 * Converts 7.45 MB of bundled seed .ts files into a prebuilt SQLite database.
 * Lazy-loads per state to avoid bundling all data in memory.
 *
 * Output: apps/mobile/data/seed-data.db
 * Manifest: apps/mobile/data/seed-manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(rootDir, 'apps/mobile/data');
const dbPath = path.resolve(dataDir, 'seed-data.db');

// ═════════════════════════════════════════════════════════════════════════
// ── Schema ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

function initSchema(db) {
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

    CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
    CREATE INDEX IF NOT EXISTS idx_mla_profiles_state ON mla_profiles(state_code);
    CREATE INDEX IF NOT EXISTS idx_demographics_state ON demographics(state_code);
    CREATE INDEX IF NOT EXISTS idx_historical_results_state_year ON historical_results(state_code, year);
    CREATE INDEX IF NOT EXISTS idx_political_timeline_state_ac ON political_timeline(state_code, ac_no);
    CREATE INDEX IF NOT EXISTS idx_election_history_state ON election_history(state_code);
  `);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Data Import ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

async function importSeedData(db) {
  const stateConfigs = [
    { code: 'TS', year: 2023 },
    { code: 'AP', year: 2024 },
    { code: 'KA', year: 2023 },
    { code: 'MH', year: 2024 },
    { code: 'TN', year: 2026 },
    { code: 'KL', year: 2026 },
    { code: 'WB', year: 2026 },
    { code: 'UP', year: 2022 },
    { code: 'RJ', year: 2023 },
    { code: 'GJ', year: 2022 },
    { code: 'JH', year: 2024 },
    { code: 'OD', year: 2024 },
    { code: 'DL', year: 2022 },
    { code: 'PB', year: 2022 },
    { code: 'HR', year: 2024 },
    { code: 'CG', year: 2023 },
    { code: 'MP', year: 2023 },
    { code: 'BR', year: 2020 },
    { code: 'AS', year: 2026 },
    { code: 'GA', year: 2022 },
    { code: 'HP', year: 2022 },
    { code: 'MN', year: 2022 },
    { code: 'ML', year: 2023 },
    { code: 'MZ', year: 2023 },
    { code: 'NL', year: 2023 },
    { code: 'TR', year: 2023 },
    { code: 'SK', year: 2024 },
    { code: 'AR', year: 2024 },
    { code: 'UK', year: 2022 },
    { code: 'PY', year: 2026 },
    { code: 'JK', year: 2024 },
  ];

  const manifest = {};

  for (const { code, year } of stateConfigs) {
    console.log(`\n[${code}] Importing seed data...`);
    const stateManifest = {
      state_code: code,
      version: '',
      has_mla_profiles: 0,
      has_demographics: 0,
      has_historical_results: 0,
      has_political_timeline: 0,
      has_election_history: 0,
      constituency_count: 0,
      last_updated: new Date().toISOString(),
    };

    try {
      // Import constituencies
      const constPath = path.resolve(rootDir, `data/seed/${code.toLowerCase()}-constituencies.ts`);
      if (fs.existsSync(constPath)) {
        try {
          const mod = await import(`file://${constPath}`);
          const constKey = Object.keys(mod).find(k => k.includes('CONSTITUENCIES'));
          if (constKey && mod[constKey]) {
            const constituencies = mod[constKey];
            const insertConst = db.prepare(`
              INSERT OR REPLACE INTO constituencies
              (id, state_code, ac_no, name, district, type, winner_party, winner_name, winner_votes, runner_up, margin, current_party, election_year)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let count = 0;
            for (const c of constituencies) {
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
                count++;
              } catch (e) {
                // Skip malformed constituencies
              }
            }

            stateManifest.constituency_count = count;
            if (count > 0) {
              console.log(`  ✓ Constituencies: ${count}`);
            }
          }
        } catch (e) {
          console.warn(`  ⚠ Could not import constituencies for ${code}:`, e.message);
        }
      }

      // Import MLA profiles
      const mlaPath = path.resolve(rootDir, `data/seed/${code.toLowerCase()}-mla-profiles.ts`);
      if (fs.existsSync(mlaPath)) {
        const mod = await import(`file://${mlaPath}`);
        const mlaKey = Object.keys(mod).find(k => k.includes('MLA') || k.includes('PROFILE'));
        if (mlaKey) {
          const profiles = mod[mlaKey];
          const insertMLA = db.prepare(`
            INSERT OR REPLACE INTO mla_profiles
            (id, state_code, ac_no, name, party, gender, terms_served, age, dob, dob_estimated, education, profession, criminal_cases, total_assets, total_liabilities, marital_status, photo_url, constituency_name, district, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          let count = 0;
          for (const p of profiles) {
            try {
              insertMLA.run(
                `${code}-MLA-${p.acNo || count}`,
                code,
                p.acNo || count,
                p.name || '',
                p.party || p.currentParty || '',
                p.gender || '',
                p.terms || p.termsServed || 0,
                p.age || 0,
                p.dob || '',
                p.dobEstimated ? 1 : 0,
                p.education || '',
                p.profession || '',
                p.criminalCases || 0,
                p.totalAssets || 0,
                p.totalLiabilities || 0,
                p.maritalStatus || '',
                p.photoUrl || '',
                p.constituencyName || '',
                p.district || '',
                p.sourceUrl || p.mynetaUrl || '',
              );
              count++;
            } catch (e) {
              // Skip malformed profiles
            }
          }

          stateManifest.has_mla_profiles = 1;
          console.log(`  ✓ MLA Profiles: ${count}`);
        }
      }

      // Import demographics
      const demoPath = path.resolve(rootDir, `data/seed/${code.toLowerCase()}-demographics.ts`);
      if (fs.existsSync(demoPath)) {
        const mod = await import(`file://${demoPath}`);
        const demoKey = Object.keys(mod).find(k => k.includes('DEMO'));
        if (demoKey) {
          const demos = mod[demoKey];
          const insertDemo = db.prepare(`
            INSERT OR REPLACE INTO demographics
            (id, state_code, ac_no, population, total_voters, turnout_2023, male_voters, female_voters, literacy, urban_percent, sc_percent, st_percent, area_sq_km)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          let count = 0;
          for (const d of demos) {
            try {
              insertDemo.run(
                `${code}-DEMO-${d.acNo || count}`,
                code,
                d.acNo || count,
                d.population || 0,
                d.totalVoters || d.totalElectors || 0,
                d.turnout || d.turnout2023 || 0,
                d.maleVoters || d.maleElectors || 0,
                d.femaleVoters || d.femaleElectors || 0,
                d.literacy || 0,
                d.urbanPercent || 0,
                d.scPercent || d.scPopulation || 0,
                d.stPercent || d.stPopulation || 0,
                d.areaSqKm || 0,
              );
              count++;
            } catch (e) {
              // Skip malformed demographics
            }
          }

          stateManifest.has_demographics = 1;
          console.log(`  ✓ Demographics: ${count}`);
        }
      }

      // Import election history
      const elecPath = path.resolve(rootDir, `data/seed/${code.toLowerCase()}-election-history.ts`);
      if (fs.existsSync(elecPath)) {
        const mod = await import(`file://${elecPath}`);
        const elecKey = Object.keys(mod).find(k => k.includes('ELECTION'));
        if (elecKey) {
          const elections = mod[elecKey];
          const insertElec = db.prepare(`
            INSERT OR REPLACE INTO election_history
            (id, state_code, year, type, total_seats, ruling_party, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          const insertElecResult = db.prepare(`
            INSERT OR REPLACE INTO election_history_results
            (id, election_id, party, seats_won, seats_contested)
            VALUES (?, ?, ?, ?, ?)
          `);

          let count = 0;
          for (const e of elections) {
            try {
              const elecId = `${code}-ELEC-${e.year}`;
              insertElec.run(
                elecId,
                code,
                e.year,
                'assembly',
                e.totalSeats || 0,
                e.rulingParty || '',
                e.notes || '',
              );

              // Handle both Record-based and array-based party results
              const partyResults = e.partyResults || {};
              const entries = Array.isArray(partyResults)
                ? partyResults
                : Object.entries(partyResults).map(([party, seats]) => ({ party, seatsWon: seats, seatContested: seats }));

              for (const pr of entries) {
                insertElecResult.run(
                  `${elecId}-${pr.party || ''}`,
                  elecId,
                  pr.party || '',
                  pr.seatsWon || 0,
                  pr.seatContested || 0,
                );
              }

              count++;
            } catch (e) {
              // Skip malformed elections
            }
          }

          stateManifest.has_election_history = 1;
          console.log(`  ✓ Election History: ${count}`);
        }
      }

      // Insert state manifest
      const insertManifest = db.prepare(`
        INSERT OR REPLACE INTO seed_manifest
        (state_code, version, has_mla_profiles, has_demographics, has_historical_results, has_political_timeline, has_election_history, constituency_count, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertManifest.run(
        stateManifest.state_code,
        crypto.createHash('sha256').update(JSON.stringify(stateManifest)).digest('hex').slice(0, 12),
        stateManifest.has_mla_profiles,
        stateManifest.has_demographics,
        stateManifest.has_historical_results,
        stateManifest.has_political_timeline,
        stateManifest.has_election_history,
        stateManifest.constituency_count,
        stateManifest.last_updated,
      );

      manifest[code] = stateManifest;
    } catch (err) {
      console.error(`  ✗ Error importing ${code}:`, err.message);
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
    console.log('📥 Importing seed data...');
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
    console.log(`   States: ${Object.keys(manifest).length}`);
    console.log(`   Total constituencies: ${Object.values(manifest).reduce((sum, m) => sum + m.constituency_count, 0)}`);
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
