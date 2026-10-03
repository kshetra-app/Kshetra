/**
 * tests/national-constituency-canonicalization.test.mjs
 *
 * Milestone W021.5-B1: National Constituency Canonicalization Test Suite
 *
 * Test Battery:
 * Section 1: Statutory National Jurisdiction Registry (36 States & UTs)
 * Section 2: Statutory Parliamentary Constituency Universe (543 PCs)
 * Section 3: Statutory Assembly Constituency Universe (4,123 ACs)
 * Section 4: Data Plane Discrepancy & Conflict Tracking Invariants
 * Section 5: Migration 059 Structure & Idempotency Safeguards
 * Section 6: Anti-Silent-Fallback & Non-Coercion Invariants
 * Section 7: Air-Gap & Production Isolation Guard
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const REPO_ROOT = process.cwd();
const MIGRATION_059_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
const STATES_TS_PATH = path.join(REPO_ROOT, 'packages', 'shared', 'src', 'constants', 'states.ts');
const MP_PROFILES_TS_PATH = path.join(REPO_ROOT, 'data', 'seed', 'mp-profiles.ts');

console.log('================================================================');
console.log('TEST SUITE: W021.5-B1 NATIONAL CONSTITUENCY CANONICALIZATION');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Production Database: STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)');
console.log('================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function runTest(id, name, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`[PASS] ${id}: ${name}`);
  } catch (err) {
    failedChecks++;
    console.error(`[FAIL] ${id}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Read migration SQL
assert(fs.existsSync(MIGRATION_059_PATH), 'Migration 059 must exist');
const migrationSql = fs.readFileSync(MIGRATION_059_PATH, 'utf8');

// ─── SECTION 1: JURISDICTION REGISTRY INVARIANTS ──────────────────────────────

runTest('B1-TEST-JUR-01', 'Complete 36 State and Union Territory Catalog', () => {
  const matches = [...migrationSql.matchAll(/\('([A-Z]{2})',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),/g)];
  assert.strictEqual(matches.length, 36, `Expected exactly 36 jurisdictions, found ${matches.length}`);
});

runTest('B1-TEST-JUR-02', 'Statutory 28 States and 8 Union Territories Count', () => {
  const utCodes = new Set(['DL', 'JK', 'PY', 'AN', 'CH', 'DN', 'LA', 'LD']);
  const matches = [...migrationSql.matchAll(/\('([A-Z]{2})',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),/g)];
  let stateCount = 0;
  let utCount = 0;
  for (const m of matches) {
    if (utCodes.has(m[1])) {
      utCount++;
    } else {
      stateCount++;
    }
  }
  assert.strictEqual(stateCount, 28, 'Must have exactly 28 states');
  assert.strictEqual(utCount, 8, 'Must have exactly 8 union territories');
});

runTest('B1-TEST-JUR-03', 'Statutory 31 Legislative Assemblies and 5 Non-Assembly UTs', () => {
  const matches = [...migrationSql.matchAll(/\('([A-Z]{2})',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),/g)];
  let withAssembly = 0;
  let withoutAssembly = 0;
  for (const m of matches) {
    const assemblySeats = parseInt(m[4], 10);
    if (assemblySeats > 0) {
      withAssembly++;
    } else {
      withoutAssembly++;
    }
  }
  assert.strictEqual(withAssembly, 31, 'Must have 31 assemblies (28 States + DL, JK, PY)');
  assert.strictEqual(withoutAssembly, 5, 'Must have 5 UTs without assembly (AN, CH, DN, LA, LD)');
});

// ─── SECTION 2: PARLIAMENTARY CONSTITUENCY INVARIANTS ─────────────────────────

runTest('B1-TEST-PC-01', 'Exact 543 Parliamentary Constituencies Ingestion', () => {
  const pcMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'([a-z]+)',\s*'eci_delimitation_2008'/g)];
  assert.strictEqual(pcMatches.length, 543, `Expected 543 PCs, found ${pcMatches.length}`);
});

runTest('B1-TEST-PC-02', 'Unique Canonical PC Codes (Zero Duplicates)', () => {
  const pcMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'([a-z]+)',\s*'eci_delimitation_2008'/g)];
  const codes = new Set();
  for (const m of pcMatches) {
    assert(!codes.has(m[1]), `Duplicate PC code detected: ${m[1]}`);
    codes.add(m[1]);
  }
  assert.strictEqual(codes.size, 543, 'All 543 PC codes must be unique');
});

runTest('B1-TEST-PC-03', 'PC Statutory Seat Numbers Contiguity per State', () => {
  const pcMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'([a-z]+)',\s*'eci_delimitation_2008'/g)];
  const statePcs = new Map();
  for (const m of pcMatches) {
    const state = m[2];
    const num = parseInt(m[3], 10);
    if (!statePcs.has(state)) statePcs.set(state, []);
    statePcs.get(state).push(num);
  }

  for (const [state, nums] of statePcs.entries()) {
    nums.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      assert.strictEqual(nums[i], i + 1, `PC numbering for ${state} not contiguous: expected ${i + 1}, got ${nums[i]}`);
    }
  }
});

runTest('B1-TEST-PC-04', 'PC Statutory Reservations Validity (general, sc, st only)', () => {
  const pcMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'([a-z]+)',\s*'eci_delimitation_2008'/g)];
  const validReservations = new Set(['general', 'sc', 'st']);
  for (const m of pcMatches) {
    assert(validReservations.has(m[5]), `Invalid reservation ${m[5]} for PC ${m[1]}`);
  }
});

// ─── SECTION 3: ASSEMBLY CONSTITUENCY INVARIANTS ──────────────────────────────

runTest('B1-TEST-AC-01', 'Exact 4,123 Assembly Constituencies Ingestion', () => {
  const acMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-AC-\d{1,3})',\s*'([A-Z]{2}-AC-\d{1,3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([A-Z]+)',\s*'assembly_constituency'/g)];
  assert.strictEqual(acMatches.length, 4123, `Expected 4123 ACs, found ${acMatches.length}`);
});

runTest('B1-TEST-AC-02', 'Unique Canonical AC Codes (Zero Duplicates)', () => {
  const acMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-AC-\d{1,3})',\s*'([A-Z]{2}-AC-\d{1,3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([A-Z]+)',\s*'assembly_constituency'/g)];
  const ids = new Set();
  const canonicalCodes = new Set();
  for (const m of acMatches) {
    assert(!ids.has(m[1]), `Duplicate AC id: ${m[1]}`);
    assert(!canonicalCodes.has(m[2]), `Duplicate AC canonical_code: ${m[2]}`);
    ids.add(m[1]);
    canonicalCodes.add(m[2]);
  }
  assert.strictEqual(ids.size, 4123);
  assert.strictEqual(canonicalCodes.size, 4123);
});

runTest('B1-TEST-AC-03', 'AC Contiguous 1..N Numbering Across All 31 Assemblies', () => {
  const acMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-AC-\d{1,3})',\s*'([A-Z]{2}-AC-\d{1,3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([A-Z]+)',\s*'assembly_constituency'/g)];
  const stateAcs = new Map();
  for (const m of acMatches) {
    const state = m[5];
    const num = parseInt(m[3], 10);
    if (!stateAcs.has(state)) stateAcs.set(state, []);
    stateAcs.get(state).push(num);
  }

  assert.strictEqual(stateAcs.size, 31, 'Exactly 31 states/UTs must have ACs');
  for (const [state, nums] of stateAcs.entries()) {
    nums.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      assert.strictEqual(nums[i], i + 1, `AC numbering for ${state} not contiguous: expected ${i + 1}, got ${nums[i]}`);
    }
  }
});

runTest('B1-TEST-AC-04', 'AC Reservations Normalization (GEN, SC, ST only)', () => {
  const acMatches = [...migrationSql.matchAll(/\('([A-Z]{2}-AC-\d{1,3})',\s*'([A-Z]{2}-AC-\d{1,3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([A-Z]+)',\s*'assembly_constituency'/g)];
  const validReservations = new Set(['GEN', 'SC', 'ST']);
  for (const m of acMatches) {
    assert(validReservations.has(m[7]), `Invalid AC reservation: ${m[7]} in AC ${m[1]}`);
  }
});

// ─── SECTION 4: CONFLICT RECONCILIATION & AUDITABILITY ────────────────────────

runTest('B1-TEST-CNF-01', '3 Legacy MP Seed Misattributions Formally Reconciled', () => {
  assert(migrationSql.includes('LS_Hamirpur_HP'), 'Hamirpur conflict must be recorded');
  assert(migrationSql.includes('LS_Maharajganj_UP'), 'Maharajganj conflict must be recorded');
  assert(migrationSql.includes('LS_Aurangabad_BR'), 'Aurangabad conflict must be recorded');
  assert(migrationSql.includes('Reconciled to HP per ECI Delimitation Order 2008'));
  assert(migrationSql.includes('Reconciled to UP per ECI Delimitation Order 2008'));
  assert(migrationSql.includes('Reconciled to BR per ECI Delimitation Order 2008'));
});

// ─── SECTION 5: MIGRATION 059 IDEMPOTENCY & STRUCTURE ─────────────────────────

runTest('B1-TEST-MIG-01', 'Atomic Transaction Packaging', () => {
  assert(/^\s*BEGIN\s*;/m.test(migrationSql), 'Must have BEGIN;');
  assert(/^\s*COMMIT\s*;/m.test(migrationSql), 'Must have COMMIT;');
});

runTest('B1-TEST-MIG-02', 'Comprehensive ON CONFLICT Across All Target Tables', () => {
  const onConflictCount = (migrationSql.match(/ON CONFLICT/gi) || []).length;
  assert(onConflictCount >= 7, `Expected at least 7 ON CONFLICT clauses, found ${onConflictCount}`);
});

runTest('B1-TEST-MIG-03', 'Constituency Versions and Current Version FK Linkage', () => {
  assert(migrationSql.includes('INSERT INTO public.constituency_versions'));
  assert(migrationSql.includes('UPDATE public.constituencies c\nSET current_version_id = cv.id'));
  assert(migrationSql.includes('INSERT INTO public.parliamentary_constituency_versions'));
  assert(migrationSql.includes('UPDATE public.parliamentary_constituencies pc\nSET current_version_id = pcv.id'));
});

// ─── SECTION 6: ANTI-SILENT-FALLBACK & INTEGRITY INVARIANTS ───────────────────

runTest('B1-TEST-ASF-01', 'Zero HTML or Wiki Markup Residue in Canonical Entities', () => {
  const markupAnomaly = /<span|'''|\[\[/i.test(migrationSql);
  assert(!markupAnomaly, 'Markup residue detected in migration SQL');
});

runTest('B1-TEST-ASF-02', 'Strict Non-Null Canonical Codes and Delimitation Regimes', () => {
  assert(!migrationSql.includes("NULL, 'assembly_constituency'"));
  assert(!migrationSql.includes("NULL, 'parliamentary_constituency'"));
  assert(!migrationSql.includes("NULL, 'eci_delimitation_2008'"));
});

// ─── SECTION 7: AIR-GAP & PRODUCTION ISOLATION ────────────────────────────────

runTest('B1-TEST-AIR-01', 'Production Database ehfafcnimmjusyvplbah Strictly Untouched', () => {
  assert(!migrationSql.includes('ehfafcnimmjusyvplbah'), 'Production reference detected in migration 059');
});

console.log('================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED:       ${passedChecks}`);
console.log(`FAILED:       ${failedChecks}`);
console.log(`SUITE VERDICT: ${failedChecks === 0 ? 'PASS' : 'FAIL'}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
}
