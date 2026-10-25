#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const dataDir = path.resolve(root, 'apps/mobile/data');
const dbPath = path.join(dataDir, 'seed-data.db');
const manifestPath = path.join(dataDir, 'seed-manifest.json');
const expectedStates = [
  'TS', 'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP', 'RJ', 'GJ', 'JH', 'OD',
  'DL', 'PB', 'HR', 'CG', 'MP', 'BR', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ',
  'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK',
];

function fail(message) {
  console.error(`SEED_DATA_VALIDATION_FAILED: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(dbPath)) {
  fail(`SQLite seed database is missing: ${dbPath}`);
  process.exit(1);
}
if (!fs.existsSync(manifestPath)) {
  fail(`Seed manifest is missing: ${manifestPath}`);
  process.exit(1);
}

const bytes = fs.statSync(dbPath).size;
if (bytes <= 10_000_000) {
  fail(`SQLite seed database is ${bytes} bytes; the mobile loader requires a hydrated database larger than 10,000,000 bytes.`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Seed manifest is invalid JSON: ${error.message}`);
  process.exit(1);
}

const actualStates = Object.keys(manifest).sort();
const expectedSorted = [...expectedStates].sort();
if (JSON.stringify(actualStates) !== JSON.stringify(expectedSorted)) {
  fail(`Manifest state set mismatch. Expected ${expectedSorted.length} states, received ${actualStates.length}.`);
}

let db;
try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const integrity = db.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') fail(`SQLite integrity_check returned: ${String(integrity)}`);

  const repCount = db.prepare('SELECT count(*) AS count FROM representatives').get().count;
  if (repCount <= 0) fail(`The representatives table is empty; found ${repCount} rows.`);

  const manifestRows = new Map(
    db.prepare('SELECT state_code, version, has_mla_profiles, has_demographics, has_historical_results, has_political_timeline, has_election_history, constituency_count FROM seed_manifest')
      .all()
      .map(row => [row.state_code, row])
  );

  const countFor = (table, stateCode) =>
    db.prepare(`SELECT count(*) AS count FROM ${table} WHERE state_code = ?`).get(stateCode).count;

  for (const stateCode of expectedStates) {
    const item = manifest[stateCode];
    const row = manifestRows.get(stateCode);
    if (!item || !row) {
      fail(`Missing manifest row for ${stateCode}.`);
      continue;
    }
    if (!/^[a-f0-9]{12}$/.test(item.version ?? '')) {
      fail(`${stateCode} has an empty or invalid content version.`);
    }
    if (item.version !== row.version) {
      fail(`${stateCode} JSON/SQLite manifest versions differ.`);
    }

    const constituencyCount = countFor('constituencies', stateCode);
    if (constituencyCount <= 0) fail(`${stateCode} has no constituency records.`);
    if (item.constituency_count !== constituencyCount || row.constituency_count !== constituencyCount) {
      fail(`${stateCode} constituency count mismatch: JSON=${item.constituency_count}, SQLite manifest=${row.constituency_count}, table=${constituencyCount}.`);
    }

    for (const [table, flag] of [
      ['mla_profiles', 'has_mla_profiles'],
      ['demographics', 'has_demographics'],
      ['historical_results', 'has_historical_results'],
      ['political_timeline', 'has_political_timeline'],
      ['election_history', 'has_election_history'],
    ]) {
      const expectedFlag = countFor(table, stateCode) > 0 ? 1 : 0;
      if (item[flag] !== expectedFlag || row[flag] !== expectedFlag) {
        fail(`${stateCode} manifest flag ${flag} disagrees with ${table} contents.`);
      }
    }
  }
} catch (error) {
  fail(`Could not verify SQLite seed database: ${error.message}`);
} finally {
  db?.close();
}

if (process.exitCode === 1) process.exit(1);
console.log(`SEED_DATA_VALIDATION_PASS: ${expectedStates.length} states, SQLite integrity OK, manifest reconciled, database ${bytes} bytes.`);
