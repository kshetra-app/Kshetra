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
import { buildRepsFromKYR, slug } from './lib/kyr-transform.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(rootDir, 'apps/mobile/data');
const dbPath = path.resolve(dataDir, 'seed-data.db');
const localBodyDir = path.resolve(rootDir, 'scrapers/output/local-body');

const NO_MANDAL = '__no_mandal__';

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
      constituency_name TEXT,
      year INTEGER NOT NULL,
      delimitation_id TEXT,
      total_valid_votes INTEGER,
      winner TEXT,
      party TEXT,
      winner_name TEXT,
      winner_party TEXT,
      winner_votes INTEGER,
      winner_vote_share REAL,
      winner_education TEXT,
      winner_profession TEXT,
      winner_criminal_cases INTEGER,
      winner_total_assets REAL,
      winner_total_liabilities REAL,
      first_runner_up_name TEXT,
      first_runner_up_party TEXT,
      first_runner_up_votes INTEGER,
      first_runner_up_vote_share REAL,
      margin_winner_to_runner_up_1 INTEGER,
      first_runner_up_education TEXT,
      first_runner_up_profession TEXT,
      first_runner_up_criminal_cases INTEGER,
      first_runner_up_total_assets REAL,
      first_runner_up_total_liabilities REAL,
      second_runner_up_name TEXT,
      second_runner_up_party TEXT,
      second_runner_up_votes INTEGER,
      second_runner_up_vote_share REAL,
      margin_winner_to_runner_up_2 INTEGER,
      margin_runner_up_1_to_runner_up_2 INTEGER,
      second_runner_up_education TEXT,
      second_runner_up_profession TEXT,
      second_runner_up_criminal_cases INTEGER,
      second_runner_up_total_assets REAL,
      second_runner_up_total_liabilities REAL,
      localized_names_json TEXT,
      localized_parties_json TEXT,
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

    -- Unified local-body office-holders (migration 023 mirror; verified winners only).
    -- Precomputed slug/key columns let the mobile app query the browse hierarchy
    -- (district → mandal → GP → ward) without in-memory slugging of 200k+ rows.
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

// ═════════════════════════════════════════════════════════════════════════
// ── National Historical Podium Results (1999–2026) ──────────────────────
// ═════════════════════════════════════════════════════════════════════════

function importHistoricalPodiumResults(db, manifest) {
  const historicalDir = path.resolve(rootDir, 'data/historical');
  if (!fs.existsSync(historicalDir)) {
    console.log('  (no data/historical directory — skipping historical podium results)');
    return { total: 0 };
  }

  const files = fs.readdirSync(historicalDir).filter((f) => f.endsWith('-podium-results.json'));
  if (files.length === 0) return { total: 0 };

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO historical_results (
      id, state_code, ac_no, constituency_name, year, delimitation_id, total_valid_votes,
      winner, party,
      winner_name, winner_party, winner_votes, winner_vote_share,
      winner_education, winner_profession, winner_criminal_cases, winner_total_assets, winner_total_liabilities,
      first_runner_up_name, first_runner_up_party, first_runner_up_votes, first_runner_up_vote_share,
      margin_winner_to_runner_up_1, first_runner_up_education, first_runner_up_profession,
      first_runner_up_criminal_cases, first_runner_up_total_assets, first_runner_up_total_liabilities,
      second_runner_up_name, second_runner_up_party, second_runner_up_votes, second_runner_up_vote_share,
      margin_winner_to_runner_up_2, margin_runner_up_1_to_runner_up_2,
      second_runner_up_education, second_runner_up_profession, second_runner_up_criminal_cases,
      second_runner_up_total_assets, second_runner_up_total_liabilities,
      localized_names_json, localized_parties_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?
    )
  `);

  let totalContests = 0;
  const insertMany = db.transaction((contests) => {
    for (const c of contests) {
      const w = c.winner || {};
      const ru1 = c.firstRunnerUp || {};
      const ru2 = c.secondRunnerUp || {};

      const locNames = JSON.stringify({
        winner: w.localizedNames || null,
        ru1: ru1.localizedNames || null,
        ru2: ru2.localizedNames || null,
      });

      const locParties = JSON.stringify({
        winner: w.localizedParties || null,
        ru1: ru1.localizedParties || null,
        ru2: ru2.localizedParties || null,
      });

      insertStmt.run(
        c.id,
        (c.stateCode || (c.id?.startsWith('IN-') ? 'IN' : 'IN')),
        (c.acNo ?? c.pcNo ?? 0),
        c.constituencyName || '',
        c.electionYear,
        c.delimitationId || (c.electionYear >= 2008 ? '4' : '3'),
        c.validVotes || 0,
        w.name || '',
        w.party || '',
        w.name || '',
        w.party || '',
        w.votes || 0,
        w.voteShare || 0,
        w.education || null,
        w.profession || null,
        w.criminalCases ?? null,
        w.totalAssets ?? null,
        w.totalLiabilities ?? null,
        ru1.name || null,
        ru1.party || null,
        ru1.votes || 0,
        ru1.voteShare || 0,
        c.marginWinnerToRunnerUp1 ?? null,
        ru1.education || null,
        ru1.profession || null,
        ru1.criminalCases ?? null,
        ru1.totalAssets ?? null,
        ru1.totalLiabilities ?? null,
        ru2.name || null,
        ru2.party || null,
        ru2.votes || 0,
        ru2.voteShare || 0,
        c.marginWinnerToRunnerUp2 ?? null,
        c.marginRunnerUp1ToRunnerUp2 ?? null,
        ru2.education || null,
        ru2.profession || null,
        ru2.criminalCases ?? null,
        ru2.totalAssets ?? null,
        ru2.totalLiabilities ?? null,
        locNames,
        locParties
      );
      totalContests++;
    }
  });

  for (const file of files) {
    try {
      const contests = JSON.parse(fs.readFileSync(path.join(historicalDir, file), 'utf8'));
      if (Array.isArray(contests) && contests.length > 0) {
        insertMany(contests);
        const state = contests[0].stateCode;
        if (manifest && manifest[state]) {
          manifest[state].has_historical_results = 1;
        }
      }
    } catch (e) {
      console.error(`  ✗ Error loading ${file}:`, e.message);
    }
  }

  console.log(`  ✓ Ingested ${totalContests} historical podium contests across ${files.length} states/UTs`);
  return { total: totalContests };
}

// ── Local-body representatives (SEC KYR → representatives table) ───────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Ingest every hardened SEC scraper file (scrapers/output/local-body/*-kyr.json)
 * into the `representatives` table. Uses the SAME transform (buildRepsFromKYR)
 * as the Supabase importer so offline and server data stay identical.
 *
 * GP-tier grouping: the district-level Sarpanch report omits mandal, while ward
 * rows carry it. We resolve each GP's mandal from any row that has one (wards
 * preferred) and backfill it onto mandal-less rows so a GP's sarpanch and wards
 * share one mandal bucket + one gp_key.
 */
function importRepresentatives(db) {
  if (!fs.existsSync(localBodyDir)) {
    console.log('  (no scrapers/output/local-body dir — skipping representatives)');
    return { total: 0, byState: {} };
  }
  const files = fs.readdirSync(localBodyDir).filter((f) => f.endsWith('-kyr.json'));
  if (files.length === 0) {
    console.log('  (no *-kyr.json files — skipping representatives)');
    return { total: 0, byState: {} };
  }

  const all = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(localBodyDir, file), 'utf8'));
      const reps = buildRepsFromKYR(data);
      for (const rep of reps) all.push(rep); // loop, not spread (142k+ overflows arg stack)
      console.log(`  ${file}: ${reps.length} winners`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  // ── Ward-derived mandal pool per (state, district, GP name) ──────────────
  // Some states' Sarpanch report omits the mandal (Telangana), while the Ward
  // report always carries it. We build an ordered, de-duplicated list of the
  // mandals each (district, GP-name) appears in across the ward rows. This lets
  // us (a) backfill a concrete mandal onto mandal-less sarpanch and — crucially —
  // (b) split N same-named GPs sitting in different mandals into N DISTINCT GP
  // nodes (one sarpanch each) instead of collapsing them into a single node.
  const poolKey = (st, dS, gS) => `${st}::${dS}::${gS}`;
  const wardMandalPool = new Map(); // poolKey -> [{ mSlug, mandal }]
  for (const r of all) {
    if (r.officeType !== 'gp_ward_member' || !r.gramPanchayat || !r.mandal) continue;
    const k = poolKey(r.stateCode, slug(r.district), slug(r.gramPanchayat));
    let arr = wardMandalPool.get(k);
    if (!arr) { arr = []; wardMandalPool.set(k, arr); }
    const mS = slug(r.mandal);
    if (!arr.some((e) => e.mSlug === mS)) arr.push({ mSlug: mS, mandal: r.mandal });
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO representatives (
      id, office_type, jurisdiction_type, jurisdiction_id, state_code,
      district, district_slug, mandal, mandal_slug, gram_panchayat, gp_key,
      ward_no, constituency, name, party, party_official, elected_party,
      gender, reservation, votes, election_year, is_current, source_type,
      source_url, data_status
    ) VALUES (
      @id, @office_type, @jurisdiction_type, @jurisdiction_id, @state_code,
      @district, @district_slug, @mandal, @mandal_slug, @gram_panchayat, @gp_key,
      @ward_no, @constituency, @name, @party, @party_official, @elected_party,
      @gender, @reservation, @votes, @election_year, @is_current, @source_type,
      @source_url, @data_status
    )
  `);

  const byState = {};
  const poolPtr = new Map();    // poolKey -> next unconsumed mandal index
  const gpKeySeen = new Set();  // guarantees one GP node per sarpanch (no collapse)
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      const dSlug = slug(r.district);
      let mandal = r.mandal ?? null;
      let mSlug;
      let gpKey = null;
      if (r.officeType === 'gp_ward_member') {
        // Wards always carry mandal → deterministic node key.
        mSlug = mandal ? slug(mandal) : NO_MANDAL;
        gpKey = `${dSlug}::${mSlug}::${slug(r.gramPanchayat)}`;
      } else if (r.officeType === 'sarpanch') {
        const gS = slug(r.gramPanchayat);
        if (mandal) {
          // State already provides the mandal (e.g. AP) → trust it verbatim.
          mSlug = slug(mandal);
        } else {
          // Telangana: consume one mandal from the ward pool per sarpanch so
          // same-named GPs in different mandals become distinct nodes.
          const k = poolKey(r.stateCode, dSlug, gS);
          const pool = wardMandalPool.get(k);
          const ptr = poolPtr.get(k) ?? 0;
          if (pool && ptr < pool.length) {
            mandal = pool[ptr].mandal;
            mSlug = pool[ptr].mSlug;
            poolPtr.set(k, ptr + 1);
          } else {
            mSlug = NO_MANDAL; // mandal genuinely unknown from either report
          }
        }
        gpKey = `${dSlug}::${mSlug}::${gS}`;
        // Safety net: never let two distinct sarpanch collapse into one node.
        if (gpKeySeen.has(gpKey)) {
          let i = 2;
          while (gpKeySeen.has(`${gpKey}::${i}`)) i++;
          gpKey = `${gpKey}::${i}`;
        }
        gpKeySeen.add(gpKey);
      } else {
        // MPTC / ZPTC — territorial mandal/constituency, no GP node.
        mSlug = mandal ? slug(mandal) : NO_MANDAL;
      }
      insert.run({
        id: r.id,
        office_type: r.officeType,
        jurisdiction_type: r.jurisdictionType ?? null,
        jurisdiction_id: r.jurisdictionId ?? null,
        state_code: r.stateCode,
        district: r.district ?? null,
        district_slug: dSlug,
        mandal,
        mandal_slug: mSlug,
        gram_panchayat: r.gramPanchayat ?? null,
        gp_key: gpKey,
        ward_no: r.wardNo ?? null,
        constituency: r.constituency ?? null,
        name: r.name,
        party: r.party ?? null,
        party_official: r.partyOfficial ? 1 : 0,
        elected_party: r.party ?? null,
        gender: r.gender ?? null,
        reservation: r.reservation ?? null,
        votes: r.votes ?? null,
        election_year: r.electionYear ?? null,
        is_current: 1,
        source_type: 'sec',
        source_url: r.sourceUrl ?? null,
        data_status: 'verified',
      });
      byState[r.stateCode] = (byState[r.stateCode] ?? 0) + 1;
    }
  });
  tx(all);

  const total = Object.values(byState).reduce((s, n) => s + n, 0);
  return { total, byState };
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

    // Import local-body representatives (SEC KYR → representatives table)
    console.log('\n📥 Importing local-body representatives...');
    const reps = importRepresentatives(db);
    if (reps.total > 0) {
      console.log(`  ✓ Representatives: ${reps.total} (` +
        Object.entries(reps.byState).map(([s, n]) => `${s}:${n}`).join(', ') + ')');
    }

    // Import National Historical Podium Results (1999–2026)
    console.log('\n🏆 Importing national historical podium results...');
    const podiumStats = importHistoricalPodiumResults(db, manifest);

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

    // Collapse the WAL into the main file and switch to a rollback journal so the
    // shipped artifact is a single self-contained .db (no -wal/-shm dependency).
    // This is required because the app bundles the .db as a read-only asset.
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.pragma('journal_mode = DELETE');
    console.log('✅ WAL checkpointed & journal set to DELETE (single-file artifact)');
  } finally {
    db.close();
  }

  // Write an auto-derived version file from the final DB's content hash. The app
  // imports this JSON and re-copies the bundled DB whenever the hash changes, so
  // there is no manual version bump to remember after a rebuild.
  const hash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex').slice(0, 16);
  const versionPath = path.resolve(dataDir, 'seed-db-version.json');
  fs.writeFileSync(versionPath, JSON.stringify({ version: hash, builtAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`✅ Version file written: ${versionPath} (${hash})`);

  // Synchronize to data/archive/mobile-bundled-assets/db/seed-data.db
  const archiveDbDir = path.resolve(rootDir, 'data/archive/mobile-bundled-assets/db');
  if (fs.existsSync(archiveDbDir)) {
    fs.copyFileSync(dbPath, path.resolve(archiveDbDir, 'seed-data.db'));
    fs.copyFileSync(versionPath, path.resolve(archiveDbDir, 'seed-db-version.json'));
    console.log(`✅ Synchronized seed-data.db to archive directory: ${archiveDbDir}`);
  }
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
