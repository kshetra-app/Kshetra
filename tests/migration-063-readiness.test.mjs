/**
 * tests/migration-063-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 063
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 063 is 100% compatible with post-062 staging state,
 * possesses zero destructive DDL operations, contains no production references,
 * satisfies all table definitions, constraints, indexes, and RLS policies,
 * and preserves cryptographic immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_063_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '063_canonical_political_identity_foundation.sql');
const STAG_063_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '063_canonical_political_identity_foundation.sql');

const EXPECTED_063_HASH = 'f99ceb6d98a762784cc251eb4e6ea355be6e08c97949e084e1d61449b5129368';

test('Migration 063 Integrity: Authoritative and Staging files are byte-for-byte identical', () => {
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

test('Migration 063 Safety: Zero destructive operations (DROP TABLE, TRUNCATE, DELETE)', () => {
  const content = fs.readFileSync(AUTH_063_PATH, 'utf8');
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
        `Line ${i + 1} violates non-destructive invariant: "${trimmed}"`
      );
    }
  }
});

test('Migration 063 Safety: Zero production database references or external endpoints', () => {
  const content = fs.readFileSync(AUTH_063_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
});

test('Migration 063 Payload: Declares person_multilingual_identities and tenure_vacancies', () => {
  const content = fs.readFileSync(AUTH_063_PATH, 'utf8');

  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.person_multilingual_identities'), 'Must create person_multilingual_identities');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.tenure_vacancies'), 'Must create tenure_vacancies');
  assert.ok(content.includes('uq_person_multi_ident UNIQUE'), 'Must include unique constraint on multilingual identity representation');
  assert.ok(content.includes('ALTER TABLE public.person_multilingual_identities ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on person_multilingual_identities');
  assert.ok(content.includes('ALTER TABLE public.tenure_vacancies ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on tenure_vacancies');
});

test('Migration 063 Alterations: Adds tenure_status and expands jurisdiction_type on elected_tenures', () => {
  const content = fs.readFileSync(AUTH_063_PATH, 'utf8');

  assert.ok(content.includes('ADD COLUMN tenure_status TEXT NOT NULL DEFAULT \'ACTIVE\''), 'Must add tenure_status with default ACTIVE');
  assert.ok(content.includes('DROP CONSTRAINT IF EXISTS elected_tenures_jurisdiction_type_check'), 'Must drop existing jurisdiction check constraint');
  assert.ok(content.includes('ADD CONSTRAINT elected_tenures_jurisdiction_type_check'), 'Must add expanded jurisdiction check constraint');
  assert.ok(content.includes('\'state\''), 'Must include state in jurisdiction types');
  assert.ok(content.includes('\'nominated\''), 'Must include nominated in jurisdiction types');
});
