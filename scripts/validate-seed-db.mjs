#!/usr/bin/env node

/**
 * Release preflight for the generated mobile seed SQLite database.
 * Never accepts a Git LFS pointer, a stale version, an invalid SQLite schema,
 * an out-of-sync manifest, or missing required offline representative data.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const root = process.cwd();
const dataDir = path.join(root, 'apps/mobile/data');
const dbPath = path.join(dataDir, 'seed-data.db');
const manifestPath = path.join(dataDir, 'seed-manifest.json');
const versionPath = path.join(dataDir, 'seed-db-version.json');
const MIN_BYTES = 10_000_000;
const MIN_REPRESENTATIVES = Number(process.env.SEED_MIN_REPRESENTATIVES || 100_000);
const EXPECTED_STATES = [
  'TS','AP','KA','MH','TN','KL','WB','UP','RJ','GJ','JH','OD','DL','PB','HR','CG',
  'MP','BR','AS','GA','HP','MN','ML','MZ','NL','TR','SK','AR','UK','PY','JK',
];
const REQUIRED_TABLES = [
  'constituencies','mla_profiles','demographics','historical_results',
  'political_timeline','election_history','election_history_results',
  'seed_manifest','representatives',
];
const TABLE_FLAGS = [
  ['mla_profiles','has_mla_profiles'],
  ['demographics','has_demographics'],
  ['historical_results','has_historical_results'],
  ['political_timeline','has_political_timeline'],
  ['election_history','has_election_history'],
];
const TABLE_COUNTS = [
  ['mla_profiles','mla_profile_count'],
  ['demographics','demographics_count'],
  ['historical_results','historical_results_count'],
  ['political_timeline','political_timeline_count'],
  ['election_history','election_history_count'],
];

function fail(message) {
  console.error(`[seed-db-preflight] FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(dbPath)) fail('generated database is missing; run npm run build:seed-db first');
const stat = fs.statSync(dbPath);
if (stat.size <= MIN_BYTES) {
  const prefix = fs.readFileSync(dbPath, { encoding: 'utf8', flag: 'r' }).slice(0, 80);
  fail(`database is ${stat.size} bytes, expected > ${MIN_BYTES}; it may be a Git LFS pointer (${JSON.stringify(prefix)})`);
}
const bytes = fs.readFileSync(dbPath);
if (bytes.subarray(0, 16).toString('ascii') !== 'SQLite format 3\0') {
  fail('database does not have the SQLite file signature');
}
const fullSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
if (!/^[a-f0-9]{64}$/.test(version.sha256 || '') || version.sha256 !== fullSha256) {
  fail('seed-db-version.json SHA-256 does not match generated database bytes');
}
if (version.sizeBytes !== stat.size) fail('seed-db-version.json sizeBytes does not match database size');
if (version.version !== fullSha256.slice(0, 16)) fail('seed-db-version.json version prefix does not match database SHA-256');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  const integrity = db.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') fail(`SQLite integrity_check returned ${integrity}`);
  for (const table of REQUIRED_TABLES) {
    const found = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!found) fail(`required table missing: ${table}`);
  }

  const dbManifestRows = db.prepare('SELECT * FROM seed_manifest ORDER BY state_code').all();
  const dbManifest = Object.fromEntries(dbManifestRows.map(row => [row.state_code, row]));
  const actualCodes = Object.keys(manifest).sort();
  if (JSON.stringify(actualCodes) !== JSON.stringify([...EXPECTED_STATES].sort())) {
    fail('seed-manifest.json must contain exactly the 31 supported state/UT codes');
  }
  if (dbManifestRows.length !== EXPECTED_STATES.length) fail('SQLite seed_manifest must contain all 31 states/UTs');

  for (const code of EXPECTED_STATES) {
    const declared = manifest[code];
    const stored = dbManifest[code];
    if (!declared || !stored) fail(`manifest entry missing for ${code}`);
    for (const key of ['has_mla_profiles','has_demographics','has_historical_results','has_political_timeline','has_election_history','constituency_count',...TABLE_COUNTS.map(([,key])=>key)]) {
      if (Number(declared[key]) !== Number(stored[key])) fail(`${code} ${key} differs between JSON and SQLite`);
    }
    if (!declared.version || declared.version !== stored.version) fail(`${code} manifest version missing or inconsistent`);
    const actualConstituencies = db.prepare('SELECT count(*) AS n FROM constituencies WHERE state_code=?').get(code).n;
    if (actualConstituencies <= 0) fail(`${code} has zero constituencies; every supported jurisdiction needs real seed rows`);
    if (Number(declared.constituency_count) !== actualConstituencies) fail(`${code} constituency count does not match database (${declared.constituency_count} vs ${actualConstituencies})`);
    for (const [table, flag] of TABLE_FLAGS) {
      const count = db.prepare(`SELECT count(*) AS n FROM ${table} WHERE state_code=?`).get(code).n;
      if (Number(declared[flag]) !== (count > 0 ? 1 : 0)) fail(`${code} ${flag} does not reflect actual ${table} rows (${count})`);
    }
    for (const [table, key] of TABLE_COUNTS) {
      const count = db.prepare(`SELECT count(*) AS n FROM ${table} WHERE state_code=?`).get(code).n;
      if (Number(declared[key]) !== count) fail(`${code} ${key} differs from actual ${table} rows (${declared[key]} vs ${count})`);
      if (declared[key] < 0) fail(`${code} ${key} cannot be negative`);
    }
  }

  const totals = Object.fromEntries(
    ['constituencies','mla_profiles','demographics','historical_results','political_timeline','election_history','election_history_results','representatives']
      .map(table => [table, db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n])
  );
  if (totals.constituencies <= 0) fail('constituencies table is empty');
  if (totals.representatives < MIN_REPRESENTATIVES) {
    fail(`representatives has ${totals.representatives} rows; minimum expected by runtime loader is ${MIN_REPRESENTATIVES}`);
  }
  if (totals.mla_profiles <= 0 || totals.demographics <= 0 || totals.election_history <= 0) {
    fail('required seed datasets are empty (MLA profiles, demographics, and election history must be populated)');
  }
  // Match the production loader's representative query, not just file size.
  const smoke = db.prepare('SELECT id, state_code, office_type, name FROM representatives ORDER BY state_code LIMIT 1').get();
  if (!smoke?.id || !smoke?.state_code || !smoke?.office_type || !smoke?.name) {
    fail('representatives runtime-open/query smoke test failed');
  }

  console.log(JSON.stringify({
    status:'PASS',
    database:{sizeBytes:stat.size,sha256:fullSha256,version:version.version},
    states:dbManifestRows.length,
    totals,
    runtimeSmokeTest:smoke,
  }, null, 2));
} finally {
  db.close();
}
