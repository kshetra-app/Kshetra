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
const STATE_SOURCE_NAMES = {
  TS: 'telangana', AP: 'andhra-pradesh', KA: 'karnataka', MH: 'maharashtra',
  TN: 'tamil-nadu', KL: 'kerala', WB: 'west-bengal', UP: 'uttar-pradesh',
  RJ: 'rajasthan', GJ: 'gujarat', JH: 'jharkhand', OD: 'odisha', DL: 'delhi',
  PB: 'punjab', HR: 'haryana', CG: 'chhattisgarh', MP: 'madhya-pradesh',
  BR: 'bihar', AS: 'assam', GA: 'goa', HP: 'himachal-pradesh',
  MN: 'manipur', ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland',
  TR: 'tripura', SK: 'sikkim', AR: 'arunachal-pradesh', UK: 'uttarakhand',
  PY: 'puducherry', JK: 'jammu-kashmir',
};

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
      // Import constituencies using canonical human-readable source filenames.
      const sourceName = STATE_SOURCE_NAMES[code];
      const constPath = path.resolve(rootDir, `data/seed/${sourceName}-constituencies.ts`);
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
      const mlaPath = path.resolve(rootDir, `data/seed/${sourceName}-mla-profiles.ts`);
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

          stateManifest.has_mla_profiles = count > 0 ? 1 : 0;
          console.log(`  ✓ MLA Profiles: ${count}`);
        }
      }

      // Import demographics
      const demoPath = path.resolve(rootDir, `data/seed/${sourceName}-demographics.ts`);
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

          stateManifest.has_demographics = count > 0 ? 1 : 0;
          console.log(`  ✓ Demographics: ${count}`);
        }
      }

      // Import election history
      const elecPath = path.resolve(rootDir, `data/seed/${sourceName}-election-history.ts`);
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

          stateManifest.has_election_history = count > 0 ? 1 : 0;
          console.log(`  ✓ Election History: ${count}`);
        }
      }

      // Import the canonical per-state historical results.
      const histPath = path.resolve(rootDir, `data/seed/${sourceName}-historical-results.ts`);
      if (fs.existsSync(histPath)) {
        const mod = await import(`file://${histPath}`);
        const key = Object.keys(mod).find(k => /historical|result/i.test(k));
        const rows = key ? mod[key] : null;
        if (Array.isArray(rows)) {
          const insert = db.prepare('INSERT OR REPLACE INTO historical_results (id,state_code,ac_no,year,winner,party) VALUES (?,?,?,?,?,?)');
          for (const row of rows) {
            if (!Number.isInteger(Number(row.acNo)) || !Number.isInteger(Number(row.year))) continue;
            insert.run(`${code}-HIST-${row.acNo}-${row.year}`, code, Number(row.acNo), Number(row.year), row.winner || row.winnerName || '', row.party || row.winnerParty || '');
          }
        }
      }

      // Import the political timeline; empty flags are never assumed from file presence.
      const timelinePath = path.resolve(rootDir, `data/seed/${sourceName}-political-timeline.ts`);
      if (fs.existsSync(timelinePath)) {
        const mod = await import(`file://${timelinePath}`);
        const key = Object.keys(mod).find(k => /timeline/i.test(k));
        const rows = key ? mod[key] : null;
        if (Array.isArray(rows)) {
          const insert = db.prepare(`INSERT OR REPLACE INTO political_timeline
            (id,state_code,ac_no,date,assembly,event_type,member_names,debit_party,credit_party,seats,explanation,details,legal_status,verified)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
          for (const row of rows) {
            const rowHash = crypto.createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 8);
            insert.run(
              row.id || `${code}-TL-${row.acNo || 'NA'}-${row.date || row.year || 'NA'}-${rowHash}`,
              code, row.acNo ?? null, row.date || '', row.assembly ?? row.year ?? null,
              row.eventType || row.type || '', row.memberNames || row.member || '',
              row.debitParty || '', row.creditParty || '', row.seats ?? 0,
              row.explanation || '', row.details || '', row.legalStatus || '', row.verified ? 1 : 0
            );
          }
        }
      }

      const countForState = (table) =>
        db.prepare(`SELECT count(*) AS count FROM ${table} WHERE state_code = ?`).get(code).count;
      stateManifest.constituency_count = countForState('constituencies');
      stateManifest.has_mla_profiles = countForState('mla_profiles') > 0 ? 1 : 0;
      stateManifest.has_demographics = countForState('demographics') > 0 ? 1 : 0;
      stateManifest.has_historical_results = countForState('historical_results') > 0 ? 1 : 0;
      stateManifest.has_political_timeline = countForState('political_timeline') > 0 ? 1 : 0;
      stateManifest.has_election_history = countForState('election_history') > 0 ? 1 : 0;
      stateManifest.version = crypto.createHash('sha256').update(JSON.stringify({
        state_code: code,
        counts: {
          constituencies: stateManifest.constituency_count,
          mla_profiles: countForState('mla_profiles'),
          demographics: countForState('demographics'),
          historical_results: countForState('historical_results'),
          political_timeline: countForState('political_timeline'),
          election_history: countForState('election_history'),
        },
      })).digest('hex').slice(0, 16);

      // Insert state manifest
      const insertManifest = db.prepare(`
        INSERT OR REPLACE INTO seed_manifest
        (state_code, version, has_mla_profiles, has_demographics, has_historical_results, has_political_timeline, has_election_history, constituency_count, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertManifest.run(
        stateManifest.state_code,
        stateManifest.version,
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
      throw new Error(`Seed generation failed for state ${code}: ${err.message}`, { cause: err });
    }
  }

  return manifest;
}

// ═════════════════════════════════════════════════════════════════════════
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

  // Compute hash after closing/checkpointing SQLite so the version is for final bytes.
  const dbBytes = fs.readFileSync(dbPath);
  const fullHash = crypto.createHash('sha256').update(dbBytes).digest('hex');
  const hash = fullHash.slice(0, 16);
  const versionPath = path.resolve(dataDir, 'seed-db-version.json');
  fs.writeFileSync(versionPath, JSON.stringify({
    version: hash,
    sha256: fullHash,
    sizeBytes: dbBytes.length,
    builtAt: new Date().toISOString(),
  }, null, 2) + '\n');

  // Rebuild the sidecar manifest from the actual final SQLite tables, ensuring
  // reported flags/counts are derived from persisted rows, not source-file presence.
  let manifest;
  const verifyDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const count = (table, code) => verifyDb.prepare(`SELECT count(*) AS n FROM ${table} WHERE state_code = ?`).get(code).n;
    manifest = {};
    for (const { code } of [{"code":"TS"},{"code":"AP"},{"code":"KA"},{"code":"MH"},{"code":"TN"},{"code":"KL"},{"code":"WB"},{"code":"UP"},{"code":"RJ"},{"code":"GJ"},{"code":"JH"},{"code":"OD"},{"code":"DL"},{"code":"PB"},{"code":"HR"},{"code":"CG"},{"code":"MP"},{"code":"BR"},{"code":"AS"},{"code":"GA"},{"code":"HP"},{"code":"MN"},{"code":"ML"},{"code":"MZ"},{"code":"NL"},{"code":"TR"},{"code":"SK"},{"code":"AR"},{"code":"UK"},{"code":"PY"},{"code":"JK"}]) {
      const row = {
        state_code: code,
        version: crypto.createHash('sha256').update(JSON.stringify({
          state_code: code,
          counts: {
            constituencies: count('constituencies', code),
            mla_profiles: count('mla_profiles', code),
            demographics: count('demographics', code),
            historical_results: count('historical_results', code),
            political_timeline: count('political_timeline', code),
            election_history: count('election_history', code),
          },
        })).digest('hex').slice(0, 16),
        has_mla_profiles: count('mla_profiles', code) > 0 ? 1 : 0,
        has_demographics: count('demographics', code) > 0 ? 1 : 0,
        has_historical_results: count('historical_results', code) > 0 ? 1 : 0,
        has_political_timeline: count('political_timeline', code) > 0 ? 1 : 0,
        has_election_history: count('election_history', code) > 0 ? 1 : 0,
        constituency_count: count('constituencies', code),
        last_updated: new Date().toISOString(),
      };
      manifest[code] = row;
    }
    verifyDb.close();
    const writableDb = new Database(dbPath);
    try {
      writableDb.exec('BEGIN');
      const updateManifest = writableDb.prepare(`UPDATE seed_manifest SET version=?,has_mla_profiles=?,has_demographics=?,has_historical_results=?,has_political_timeline=?,has_election_history=?,constituency_count=?,last_updated=? WHERE state_code=?`);
      for (const row of Object.values(manifest)) {
        const result = const updated = updateManifest.run(row.version,row.has_mla_profiles,row.has_demographics,row.has_historical_results,row.has_political_timeline,row.has_election_history,row.constituency_count,row.last_updated,row.state_code);
        if (updated.changes !== 1) throw new Error(`SQLite manifest missing row for ${row.state_code}`);
        if (result.changes !== 1) throw new Error(`SQLite seed_manifest row missing for ${row.state_code}`);
      }
      writableDb.exec('COMMIT');
      writableDb.pragma('wal_checkpoint(TRUNCATE)');
      writableDb.pragma('journal_mode = DELETE');
    } catch (error) {
      writableDb.exec('ROLLBACK');
      throw error;
    } finally {
      writableDb.close();
    }
    fs.writeFileSync(path.resolve(dataDir, 'seed-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  } finally {
    try { verifyDb.close(); } catch {}
  }
  // Recompute the identity after the in-database manifest was finalized.
  const finalDbBytes = fs.readFileSync(dbPath);
  const finalSha256 = crypto.createHash('sha256').update(finalDbBytes).digest('hex');
  fs.writeFileSync(versionPath, JSON.stringify({ version: finalSha256.slice(0, 16), sha256: finalSha256, sizeBytes: finalDbBytes.length, builtAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`✅ Version file written: ${versionPath} (${hash})`);

  // If Android assets directory exists, also copy directly so it's baked into APK assets
  const androidAssetsDir = path.resolve(rootDir, 'apps/mobile/android/app/src/main/assets');
  if (fs.existsSync(androidAssetsDir)) {
    const androidDbPath = path.resolve(androidAssetsDir, 'seed-data.db');
    fs.copyFileSync(dbPath, androidDbPath);
    console.log(`✅ Android APK asset synced: ${androidDbPath}`);
  }
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
