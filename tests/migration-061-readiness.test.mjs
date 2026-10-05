/**
 * tests/migration-061-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 061
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 061 is 100% compatible with post-060 staging state,
 * possesses zero destructive DDL operations, contains no production references,
 * satisfies all foreign key and uniqueness invariants, achieves 4,123 / 4,123 AC completeness,
 * and preserves cryptographic immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_061_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql');
const STAG_061_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '061_canonical_national_ac_pc_mappings.sql');

const EXPECTED_061_HASH = '4d8eafa4c0c6d88854bd815227fbf81529ee9d2911c9ed9f44cc799f519726e9';

test('Migration 061 Integrity: Authoritative and Staging files are byte-for-byte identical', () => {
  assert.ok(fs.existsSync(AUTH_061_PATH), 'Authoritative migration 061 must exist');
  assert.ok(fs.existsSync(STAG_061_PATH), 'Staging package 061 must exist');

  const authContent = fs.readFileSync(AUTH_061_PATH);
  const stagContent = fs.readFileSync(STAG_061_PATH);

  const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
  const stagHash = crypto.createHash('sha256').update(stagContent).digest('hex');

  assert.strictEqual(authHash, EXPECTED_061_HASH, 'Authoritative migration 061 SHA-256 must match frozen coordinate');
  assert.strictEqual(stagHash, EXPECTED_061_HASH, 'Staging package 061 SHA-256 must match authoritative migration');
  assert.strictEqual(authContent.length, stagContent.length, 'Byte size must be identical');
  assert.strictEqual(authContent.length, 697065, 'Byte size must be exactly 697,065 bytes');
});

test('Migration 061 Safety: Zero destructive operations (DROP TABLE/COLUMN, TRUNCATE, DELETE)', () => {
  const content = fs.readFileSync(AUTH_061_PATH, 'utf8');
  const lines = content.split(/\r?\n/);

  const forbidden = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('--')) continue;
    for (const re of forbidden) {
      assert.strictEqual(
        re.test(trimmed),
        false,
        `Line ${i + 1} violates non-destructive invariant: "${trimmed}"`
      );
    }
  }
});

test('Migration 061 Safety: Zero production database references or external endpoints', () => {
  const content = fs.readFileSync(AUTH_061_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
});

test('Migration 061 Architecture: Target table and constraints exist in preceding migrations', () => {
  const mig060 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql'), 'utf8');

  // Verify constituency_parliamentary_mappings is created in 060
  assert.ok(
    mig060.includes('CREATE TABLE IF NOT EXISTS public.constituency_parliamentary_mappings'),
    'constituency_parliamentary_mappings must be created in migration 060'
  );
  assert.ok(
    mig060.includes('CONSTRAINT uq_ac_pc_version_mapping UNIQUE'),
    'uq_ac_pc_version_mapping unique constraint must exist in 060'
  );
  assert.ok(
    mig060.includes('uq_cpm_single_current_ac'),
    'uq_cpm_single_current_ac partial index must exist in 060'
  );
});

test('Migration 061 Payload: Exactly 4,123 unique AC mappings across 31 assembly jurisdictions', () => {
  const content = fs.readFileSync(AUTH_061_PATH, 'utf8');

  // Regex to extract AC-PC tuples
  const valueTupleRegex = /\('([A-Z]{2}-AC-\d+)',\s*'([A-Z]{2}-PC-\d+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
  let match;
  let totalTuples = 0;
  const acMap = new Map();
  const stateCounts = new Map();

  while ((match = valueTupleRegex.exec(content)) !== null) {
    totalTuples++;
    const acCode = match[1];
    const pcCode = match[2];
    const stateCode = acCode.split('-')[0];

    assert.strictEqual(acMap.has(acCode), false, `AC ${acCode} mapped multiple times`);
    acMap.set(acCode, pcCode);
    stateCounts.set(stateCode, (stateCounts.get(stateCode) || 0) + 1);
  }

  assert.strictEqual(totalTuples, 4123, 'Must contain exactly 4,123 AC mappings');
  assert.strictEqual(acMap.size, 4123, 'Must contain exactly 4,123 unique AC codes');
  assert.strictEqual(stateCounts.size, 31, 'Must cover exactly 31 legislative assembly jurisdictions');

  // Spot-check key state counts
  assert.strictEqual(stateCounts.get('TS'), 119, 'Telangana must have 119 ACs');
  assert.strictEqual(stateCounts.get('AP'), 175, 'Andhra Pradesh must have 175 ACs');
  assert.strictEqual(stateCounts.get('UP'), 403, 'Uttar Pradesh must have 403 ACs');
  assert.strictEqual(stateCounts.get('WB'), 294, 'West Bengal must have 294 ACs');
  assert.strictEqual(stateCounts.get('MH'), 288, 'Maharashtra must have 288 ACs');
  assert.strictEqual(stateCounts.get('JK'), 90, 'Jammu & Kashmir must have 90 ACs');
  assert.strictEqual(stateCounts.get('SK'), 32, 'Sikkim must have 32 ACs');
  assert.strictEqual(stateCounts.get('PY'), 30, 'Puducherry must have 30 ACs');
  assert.strictEqual(stateCounts.get('GA'), 40, 'Goa must have 40 ACs');
});

test('Migration 061 Idempotency: All 31 INSERT statements possess ON CONFLICT DO UPDATE clauses', () => {
  const content = fs.readFileSync(AUTH_061_PATH, 'utf8');

  const nonCommentContent = content.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const insertMatches = nonCommentContent.match(/INSERT\s+INTO\s+public\.constituency_parliamentary_mappings/g);
  const conflictMatches = nonCommentContent.match(/ON\s+CONFLICT\s*\(assembly_constituency_version_id,\s*parliamentary_constituency_version_id,\s*delimitation_regime_id,\s*effective_from\)\s*DO\s*UPDATE/g);

  assert.ok(insertMatches, 'Must have INSERT statements');
  assert.strictEqual(insertMatches.length, 31, 'Must have exactly 31 INSERT statements (one per state)');
  assert.strictEqual(conflictMatches.length, 31, 'All 31 INSERT statements must have explicit ON CONFLICT DO UPDATE');
});

test('Migration 061 Constraints: Section 1 defines btree_gist, chk_cpm_dates, and uq_cpm_no_temporal_overlap', () => {
  const content = fs.readFileSync(AUTH_061_PATH, 'utf8');

  assert.ok(content.includes('CREATE EXTENSION IF NOT EXISTS btree_gist'), 'Must ensure btree_gist extension exists');
  assert.ok(content.includes('chk_cpm_dates'), 'Must define chronological check constraint chk_cpm_dates');
  assert.ok(content.includes('uq_cpm_no_temporal_overlap'), 'Must define temporal exclusion constraint uq_cpm_no_temporal_overlap');
  assert.ok(content.includes('EXCLUDE USING gist'), 'Must use GIST exclusion index');
});
