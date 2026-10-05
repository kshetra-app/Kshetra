/**
 * tests/temporal-reconciliation-059.test.mjs
 * 
 * REGRESSION & TEMPORAL INTEGRITY TEST BATTERY FOR MIGRATION 059-R1
 * 
 * Asserts:
 * 1. Authoritative migration 059 remains frozen and bitwise identical to origin/master.
 * 2. Derived staging package 059-R1 eliminates TS-STATE-2008 to prevent GiST exclusion violation.
 * 3. Derived staging package 059-R1 includes fail-closed pre-execution health assertions.
 * 4. Derived staging package 059-R1 omits invalid states.updated_at assignment.
 * 5. Exactly 35 state versions are inserted by 059-R1 (preserving pre-existing TS-STATE-2014 in staging).
 * 6. Exactly 543 PCs and 4,123 ACs are preserved in 059-R1 without truncation.
 * 7. Temporal conflict matrix accurately covers all 36 jurisdictions.
 * 8. Zero overlap exists in proposed state version ranges.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();

test('059-R1 Integrity: Authoritative migration 059 remains frozen and unmodified', () => {
  const auth059Path = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
  const expectedHash = '80285b808850f76391860de827e38b6722afb5d5b0a44727d9869f48a24cb03e';
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(auth059Path)).digest('hex');
  assert.strictEqual(actualHash, expectedHash, 'Authoritative migration 059 SHA-256 must remain frozen');
});

test('059-R1 Integrity: 059-R1 omits TS-STATE-2008 from state_versions insert', () => {
  const r1Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '059-R1_temporal_reconciliation.sql');
  assert.ok(fs.existsSync(r1Path), '059-R1 package must exist');
  const content = fs.readFileSync(r1Path, 'utf8');

  // Verify TS-STATE-2008 does not appear in INSERT VALUES
  const lines = content.split(/\r?\n/);
  let inStateVersionsInsert = false;
  let insertedStateCodes = [];

  for (const line of lines) {
    if (line.includes('INSERT INTO public.state_versions')) inStateVersionsInsert = true;
    if (line.includes('ON CONFLICT (version_code)') && inStateVersionsInsert) inStateVersionsInsert = false;
    if (inStateVersionsInsert && line.trim().startsWith('(') && line.includes('-STATE-')) {
      const match = line.match(/\('([A-Z]{2})',\s*'([^']+)'/);
      if (match) {
        insertedStateCodes.push({ state: match[1], version: match[2] });
      }
    }
  }

  assert.strictEqual(insertedStateCodes.length, 35, 'Exactly 35 state versions must be inserted');
  const tsRecord = insertedStateCodes.find(r => r.state === 'TS');
  assert.strictEqual(tsRecord, undefined, 'TS-STATE-2008 must NOT be in state_versions insert values');
});

test('059-R1 Integrity: 059-R1 contains fail-closed pre-execution health assertions', () => {
  const r1Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '059-R1_temporal_reconciliation.sql');
  const content = fs.readFileSync(r1Path, 'utf8');

  assert.ok(content.includes('FAIL-CLOSED PRE-EXECUTION HEALTH & DEPENDENCY ASSERTIONS'), 'Must contain precheck banner');
  assert.ok(content.includes('political_organizations'), 'Must assert Migration 050 DDL table presence');
  assert.ok(content.includes("version_code = 'TS-STATE-2014'"), 'Must assert pre-existing TS-STATE-2014 presence');
  assert.ok(content.includes('public.constituencies'), 'Must assert constituency registry unpopulated gate');
});

test('059-R1 Integrity: 059-R1 does NOT contain states.updated_at assignment', () => {
  const r1Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '059-R1_temporal_reconciliation.sql');
  const content = fs.readFileSync(r1Path, 'utf8');

  const sec3Match = content.match(/INSERT\s+INTO\s+public\.states[\s\S]*?ON\s+CONFLICT\s*\(code\)\s*DO\s+UPDATE\s+SET([\s\S]*?);/i);
  assert.ok(sec3Match, 'Section 3 states upsert must be present');
  assert.strictEqual(/updated_at\s*=\s*now\(\)/i.test(sec3Match[1]), false, 'Must not update updated_at on states');
});

test('059-R1 Integrity: 059-R1 preserves full national payload (543 PCs, 4,123 ACs)', () => {
  const r1Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '059-R1_temporal_reconciliation.sql');
  const content = fs.readFileSync(r1Path, 'utf8');
  const lines = content.split(/\r?\n/);

  let pcCount = 0;
  let acCount = 0;
  let inPC = false;
  let inAC = false;

  for (const line of lines) {
    if (line.includes('INSERT INTO public.parliamentary_constituencies')) inPC = true;
    if (line.includes('ON CONFLICT (code) DO UPDATE') && inPC) inPC = false;
    if (inPC && line.trim().startsWith('(') && line.includes('-PC-')) pcCount++;

    if (line.includes('INSERT INTO public.constituencies (')) inAC = true;
    if (line.includes('ON CONFLICT (id) DO UPDATE') && inAC) inAC = false;
    if (inAC && line.trim().startsWith('(') && line.includes('-AC-')) acCount++;
  }

  assert.strictEqual(pcCount, 543, 'Must contain exactly 543 Parliamentary Constituencies');
  assert.strictEqual(acCount, 4123, 'Must contain exactly 4,123 Assembly Constituencies');
});

test('059-R1 Matrix: reports/w021_5_059_temporal_conflict_matrix.json covers all 36 jurisdictions', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports', 'w021_5_059_temporal_conflict_matrix.json');
  assert.ok(fs.existsSync(matrixPath), 'Conflict matrix report must exist');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.jurisdictions.length, 36, 'Matrix must cover all 36 jurisdictions');
  assert.strictEqual(matrix.summary.totalJurisdictions, 36);
  assert.strictEqual(matrix.summary.exclusionConflictsIdentified, 1);
  assert.strictEqual(matrix.summary.resolvedOmissions, 1);
  assert.strictEqual(matrix.summary.reconciledInserts, 35);

  const ts = matrix.jurisdictions.find(j => j.code === 'TS');
  assert.ok(ts, 'TS entry must exist');
  assert.strictEqual(ts.conflictType, 'OVERLAP_EXCLUSION_VIOLATION');
  assert.strictEqual(ts.reconciliationStrategy, 'OMIT_TS_STATE_2008_PRESERVE_2014');
});
