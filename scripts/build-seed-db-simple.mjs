#!/usr/bin/env node

/**
 * Build Seed Data SQLite Database (Simplified)
 *
 * Converts seed .ts files into a prebuilt SQLite database.
 * Uses a simpler approach: reads TS files and extracts data via regex.
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

function extractConstituenciesFromTS(filePath, stateCode, year) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract the array content between [ and ]
    const arrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!arrayMatch) {
      console.warn(`  ⚠ No array found in ${filePath}`);
      return [];
    }

    const arrayStr = arrayMatch[0];
    
    // Parse each object in the array
    const objectMatches = arrayStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
    const constituencies = [];

    for (const objStr of objectMatches) {
      try {
        // Extract key-value pairs
        const obj = {};
        
        // acNo
        const acNoMatch = objStr.match(/acNo:\s*(\d+)/);
        if (acNoMatch) obj.acNo = parseInt(acNoMatch[1]);
        
        // name
        const nameMatch = objStr.match(/name:\s*['"`]([^'"`]+)['"`]/);
        if (nameMatch) obj.name = nameMatch[1];
        
        // district
        const districtMatch = objStr.match(/district:\s*['"`]([^'"`]+)['"`]/);
        if (districtMatch) obj.district = districtMatch[1];
        
        // type
        const typeMatch = objStr.match(/type:\s*['"`](GEN|SC|ST)['"`]/);
        if (typeMatch) obj.type = typeMatch[1];
        
        // winner fields
        const winnerKey = `winner${year}`;
        const winnerNameKey = `winnerName${year}`;
        const winnerVotesKey = `winnerVotes${year}`;
        const runnerUpKey = `runnerUp${year}`;
        const marginKey = `margin${year}`;
        
        const winnerMatch = objStr.match(new RegExp(`${winnerKey}:\\s*['"\`]([^'"\`]+)['"\`]`));
        if (winnerMatch) obj.winner = winnerMatch[1];
        
        const winnerNameMatch = objStr.match(new RegExp(`${winnerNameKey}:\\s*['"\`]([^'"\`]+)['"\`]`));
        if (winnerNameMatch) obj.winnerName = winnerNameMatch[1];
        
        const winnerVotesMatch = objStr.match(new RegExp(`${winnerVotesKey}:\\s*(\\d+)`));
        if (winnerVotesMatch) obj.winnerVotes = parseInt(winnerVotesMatch[1]);
        
        const runnerUpMatch = objStr.match(new RegExp(`${runnerUpKey}:\\s*['"\`]([^'"\`]+)['"\`]`));
        if (runnerUpMatch) obj.runnerUp = runnerUpMatch[1];
        
        const marginMatch = objStr.match(new RegExp(`${marginKey}:\\s*(\\d+)`));
        if (marginMatch) obj.margin = parseInt(marginMatch[1]);
        
        // currentParty
        const currentPartyMatch = objStr.match(/currentParty:\s*['"`]([^'"`]+)['"`]/);
        if (currentPartyMatch) obj.currentParty = currentPartyMatch[1];
        
        if (obj.acNo && obj.name) {
          constituencies.push(obj);
        }
      } catch (e) {
        // Skip malformed objects
      }
    }

    return constituencies;
  } catch (err) {
    console.warn(`  ⚠ Error reading ${filePath}:`, err.message);
    return [];
  }
}

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
  const insertConst = db.prepare(`
    INSERT OR REPLACE INTO constituencies
    (id, state_code, ac_no, name, district, type, winner_party, winner_name, winner_votes, runner_up, margin, current_party, election_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const { code, year } of stateConfigs) {
    console.log(`\n[${code}] Importing seed data...`);
    
    const stateManifest = {
      state_code: code,
      version: '',
      has_constituencies: 0,
      constituency_count: 0,
      last_updated: new Date().toISOString(),
    };

    try {
      // Import constituencies
      const constPath = path.resolve(rootDir, `data/seed/${code.toLowerCase()}-constituencies.ts`);
      if (fs.existsSync(constPath)) {
        const constituencies = extractConstituenciesFromTS(constPath, code, year);
        
        for (const c of constituencies) {
          insertConst.run(
            `${code}-AC-${c.acNo}`,
            code,
            c.acNo,
            c.name,
            c.district || '',
            c.type || 'GEN',
            c.winner || '',
            c.winnerName || '',
            c.winnerVotes || 0,
            c.runnerUp || '',
            c.margin || 0,
            c.currentParty || c.winner || '',
            year,
          );
        }

        stateManifest.has_constituencies = constituencies.length > 0 ? 1 : 0;
        stateManifest.constituency_count = constituencies.length;
        
        if (constituencies.length > 0) {
          console.log(`  ✓ Constituencies: ${constituencies.length}`);
        }
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
