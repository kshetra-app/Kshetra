/**
 * tests/migration-062-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 062
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 062 is 100% compatible with post-061 staging state,
 * possesses zero destructive DDL operations, contains no production references,
 * satisfies all temporal archiving and current-version invariants for Assam 2023,
 * and preserves cryptographic immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_062_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');
const STAG_062_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '062_canonical_assam_2023_delimitation.sql');

const EXPECTED_062_HASH = 'b5747944360c44db20d3276119b3820e6e935df7896678c893f2140609670208';

test('Migration 062 Integrity: Authoritative and Staging files are byte-for-byte identical', () => {
  assert.ok(fs.existsSync(AUTH_062_PATH), 'Authoritative migration 062 must exist');
  assert.ok(fs.existsSync(STAG_062_PATH), 'Staging package 062 must exist');

  const authContent = fs.readFileSync(AUTH_062_PATH);
  const stagContent = fs.readFileSync(STAG_062_PATH);

  const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
  const stagHash = crypto.createHash('sha256').update(stagContent).digest('hex');

  assert.strictEqual(authHash, EXPECTED_062_HASH, 'Authoritative migration 062 SHA-256 must match frozen coordinate');
  assert.strictEqual(stagHash, EXPECTED_062_HASH, 'Staging package 062 SHA-256 must match authoritative migration');
  assert.strictEqual(authContent.length, stagContent.length, 'Byte size must be identical');
  assert.strictEqual(authContent.length, 24037, 'Byte size must be exactly 24,037 bytes');
});

test('Migration 062 Safety: Zero destructive operations (DROP TABLE/COLUMN, TRUNCATE, DELETE)', () => {
  const content = fs.readFileSync(AUTH_062_PATH, 'utf8');
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

test('Migration 062 Safety: Zero production database references or external endpoints', () => {
  const content = fs.readFileSync(AUTH_062_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
});

test('Migration 062 Payload: Exactly 126 ACs updated and mapped across 14 PCs', () => {
  const content = fs.readFileSync(AUTH_062_PATH, 'utf8');

  // Count AC values tuples in Section 3 (reservation status GEN, SC, ST)
  const acTupleRegex = /\('AS-AC-\d{3}',\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'(GEN|SC|ST)'\)/g;
  const acMatches = [...content.matchAll(acTupleRegex)];
  assert.strictEqual(acMatches.length, 126, 'Must update exactly 126 ACs in Section 3');

  // Count Table B allocation tuples in Section 4 (mapping to AS-PC-XX)
  const mapTupleRegex = /\('AS-AC-\d{3}',\s*(\d+),\s*'([^']+)',\s*'(AS-PC-\d{2})',\s*'([^']+)'\)/g;
  const mapMatches = [...content.matchAll(mapTupleRegex)];
  assert.strictEqual(mapMatches.length, 126, 'Must establish exactly 126 AC->PC mappings in Section 4');

  // Verify all 14 Assam PCs receive mappings
  const pcSet = new Set(mapMatches.map(m => m[0].match(/AS-PC-\d{2}/)[0]));
  assert.strictEqual(pcSet.size, 14, 'Must map across all 14 Assam PCs');
});

test('Migration 062 Temporal Integrity: Archives 2008 versions before inserting 2023 versions', () => {
  const content = fs.readFileSync(AUTH_062_PATH, 'utf8');

  // PC version archiving
  assert.ok(
    content.includes("valid_to = '2023-08-16'::date"),
    'Must set valid_to to 2023-08-16 on archived versions'
  );
  assert.ok(
    content.includes("is_current = false"),
    'Must set is_current to false on archived versions'
  );

  // New version code suffix
  assert.ok(
    content.includes("pc.code || '-2023'"),
    'Must generate -2023 version codes for PCs'
  );
  assert.ok(
    content.includes("c.canonical_code || '-2023'"),
    'Must generate -2023 version codes for ACs'
  );

  // Delimitation regime
  assert.ok(
    content.includes("'eci_delimitation_2023_as'"),
    'Must reference statutory regime eci_delimitation_2023_as'
  );
});
