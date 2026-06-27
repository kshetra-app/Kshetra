#!/usr/bin/env node

/**
 * Build Seed Data SQLite Database (Final)
 *
 * Converts seed .ts files into a prebuilt SQLite database.
 * Uses vm.runInThisContext to safely evaluate TypeScript object literals.
 *
 * Output: apps/mobile/data/seed-data.db
 * Manifest: apps/mobile/data/seed-manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { runInThisContext } from 'vm';

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
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove TypeScript type annotations and comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    content = content.replace(/\/\/.*$/gm, ''); // Remove line comments
    content = content.replace(/:\s*[A-Za-z<>|&\[\]'"`]+/g, ''); // Remove type annotations
    content = content.replace(/export\s+(const|interface)/g, '$1'); // Simplify exports
    
    // Extract the array assignment
    const arrayMatch = content.match(/const\s+\w+\s*=\s*\[([\s\S]*?)\]\s*;/);
    if (!arrayMatch) {
      return [];
    }

    const arrayContent = arrayMatch[1];
    
    // Wrap in a function to evaluate
    const code = `(function() { return [${arrayContent}]; })()`;
    
    try {
      const constituencies = runInThisContext(code);
      return Array.isArray(constituencies) ? constituencies : [];
    } catch (e) {
      console.warn(`  ⚠ Could not parse array in ${filePath}:`, e.message);
      return [];
    }
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
    console.log(`[${code}] Importing...`);
    
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

        stateManifest.has_constituencies = constituencies.length > 0 ? 1 : 0;
        stateManifest.constituency_count = constituencies.length;
        
        if (constituencies.length > 0) {
          console.log(`  ✓ ${constituencies.length} constituencies`);
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
    const totalConstituencies = Object.values(manifest).reduce((sum, m) => sum + m.constituency_count, 0);
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
