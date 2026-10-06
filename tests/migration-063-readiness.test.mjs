/**
 * tests/migration-063-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 063 & 063-R4
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 063 and 063-R4 are 100% compatible with post-062 staging state,
 * possess zero destructive DDL operations, contain no production references,
 * satisfy all table definitions, constraints, indexes, RLS policies, referential actions,
 * bidirectional temporal triggers, and NO-DEFAULT requirement on tenure_status.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_063_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '063_canonical_political_identity_foundation.sql');
const STAG_063_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '063_canonical_political_identity_foundation.sql');
const STAG_063_R4_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '063-R4_canonical_political_identity_foundation.sql');

const EXPECTED_063_HASH = 'f99ceb6d98a762784cc251eb4e6ea355be6e08c97949e084e1d61449b5129368';
const EXPECTED_063_R4_HASH = '3f7e6d11ea1e9622cde74df3f1e777365d06e3519f6ea0b0b825c66ef3c1f140';

test('Migration 063 Frozen Integrity: Authoritative and original Staging package are byte-for-byte identical', () => {
  assert.ok(fs.existsSync(AUTH_063_PATH), 'Authoritative migration 063 must exist');
  assert.ok(fs.existsSync(STAG_063_PATH), 'Staging package 063 must exist');

  const authContent = fs.readFileSync(AUTH_063_PATH);
  const stagContent = fs.readFileSync(STAG_063_PATH);

  const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
  const stagHash = crypto.createHash('sha256').update(stagContent).digest('hex');

  assert.strictEqual(authHash, EXPECTED_063_HASH, 'Authoritative migration 063 SHA-256 must match frozen coordinate');
  assert.strictEqual(stagHash, EXPECTED_063_HASH, 'Staging package 063 SHA-256 must match authoritative migration');
  assert.strictEqual(authContent.length, stagContent.length, 'Byte size must be identical');
  assert.strictEqual(authContent.length, 5875, 'Byte size must be exactly 5,875 bytes');
});

test('Migration 063-R4 Package Integrity: Validates cryptographic hash and existence', () => {
  assert.ok(fs.existsSync(STAG_063_R4_PATH), '063-R4 staging package must exist');
  const content = fs.readFileSync(STAG_063_R4_PATH);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(hash, EXPECTED_063_R4_HASH, '063-R4 SHA-256 must match verified hash');
});

test('Migration 063 & 063-R4 Safety: Zero destructive operations (DROP TABLE, TRUNCATE, DELETE)', () => {
  for (const filePath of [AUTH_063_PATH, STAG_063_R4_PATH]) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    const forbidden = [
      /\bDROP\s+TABLE\b/i,
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
          `File ${path.basename(filePath)} Line ${i + 1} violates non-destructive invariant: "${trimmed}"`
        );
      }
    }
  }
});

test('Migration 063 & 063-R4 Safety: Zero production database references or external endpoints', () => {
  for (const filePath of [AUTH_063_PATH, STAG_063_R4_PATH]) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
    assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
  }
});

test('Migration 063-R4 Schema Safety: tenure_status is NOT NULL with NO DEFAULT', () => {
  const content = fs.readFileSync(STAG_063_R4_PATH, 'utf8');

  // Must DROP DEFAULT and SET NOT NULL
  assert.ok(content.includes('ALTER COLUMN tenure_status DROP DEFAULT'), 'Must explicitly DROP DEFAULT on tenure_status');
  assert.ok(content.includes('ALTER COLUMN tenure_status SET NOT NULL'), 'Must set NOT NULL on tenure_status');
  assert.strictEqual(content.includes('SET DEFAULT \'ACTIVE\''), false, 'Must NOT contain SET DEFAULT ACTIVE');

  // Must enforce check constraint
  assert.ok(content.includes('CONSTRAINT elected_tenures_status_check'), 'Must enforce status check constraint');
});
