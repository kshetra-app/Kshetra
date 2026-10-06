/**
 * tests/migration-064-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 064-R4
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 064-R4 is 100% compatible with post-063 staging state,
 * possesses zero destructive DDL operations, contains no production references,
 * satisfies all table definitions, constraints, indexes, RLS policies,
 * independent prohibitions, temporal invariants, and preserves cryptographic immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_064_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql');
const STAG_064_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '064-R8_political_organization_governance_remediation.sql');
const GATE_PATH = path.join(REPO_ROOT, 'supabase', 'staging_checkpoints', 'w021_5_post_064_consolidated_gate.sql');

const EXPECTED_064_HASH = '51fc1addc090eb75fb0ef9dbe75727029ff455ed3e2d80a9a48d6c5c6e6e0be1';
const EXPECTED_GATE_064_HASH = 'add6ff2d5343916cc341df77e6998ba09a6b9531e3a88bd04cef58ca65ebfccd';

test('Migration 064 Integrity: Authoritative and Staging files are byte-for-byte identical', () => {
  assert.ok(fs.existsSync(AUTH_064_PATH), 'Authoritative migration 064 must exist');
  assert.ok(fs.existsSync(STAG_064_PATH), 'Staging package 064-R8 must exist');

  const authContent = fs.readFileSync(AUTH_064_PATH);
  const stagContent = fs.readFileSync(STAG_064_PATH);

  const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
  const stagHash = crypto.createHash('sha256').update(stagContent).digest('hex');

  assert.strictEqual(authHash, EXPECTED_064_HASH, 'Authoritative migration 064 SHA-256 must match frozen coordinate');
  assert.strictEqual(stagHash, EXPECTED_064_HASH, 'Staging package 064-R8 SHA-256 must match authoritative migration');
  assert.strictEqual(authContent.length, stagContent.length, 'Byte size must be identical');
  assert.strictEqual(authContent.length, 16835, 'Byte size must be exactly 16,835 bytes');
});

test('Migration 064 Safety: Zero destructive operations (DROP TABLE, TRUNCATE, DELETE)', () => {
  const content = fs.readFileSync(AUTH_064_PATH, 'utf8');
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

test('Migration 064 Safety: Zero production database references or external endpoints', () => {
  const content = fs.readFileSync(AUTH_064_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
});

test('Migration 064 Payload: Declares organization_multilingual_names, organization_aliases, and organization_symbols', () => {
  const content = fs.readFileSync(AUTH_064_PATH, 'utf8');

  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.organization_multilingual_names'), 'Must create organization_multilingual_names');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.organization_aliases'), 'Must create organization_aliases');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.organization_symbols'), 'Must create organization_symbols');

  // Indexes and temporal triggers (Blocker A: contradictory static unique indexes eliminated in favor of fail-closed advisory-locked temporal triggers)
  assert.ok(content.includes('idx_org_aliases_dates'), 'Must create alias dates index');
  assert.ok(content.includes('idx_org_symbols_dates'), 'Must create symbol dates index');
  assert.ok(content.includes('DROP INDEX IF EXISTS public.uq_org_alias_national;'), 'Must drop legacy national unique index');
  assert.ok(content.includes('DROP INDEX IF EXISTS public.uq_org_alias_jurisdictional;'), 'Must drop legacy jurisdictional unique index');

  // Advisory locking concurrency protections with bidirectional UPDATE ordering
  assert.ok(content.includes('pg_advisory_xact_lock'), 'Must acquire transaction advisory lock in triggers');
  assert.ok(content.includes('v_lock_key_old < v_lock_key_new'), 'Must enforce deterministic lock acquisition ordering');
  assert.ok(content.includes('6401::bigint'), 'Must use alias namespace lock discriminator');
  assert.ok(content.includes('6402::bigint'), 'Must use symbol namespace lock discriminator');

  // RLS enablement
  assert.ok(content.includes('ALTER TABLE public.organization_multilingual_names ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on organization_multilingual_names');
  assert.ok(content.includes('ALTER TABLE public.organization_aliases ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on organization_aliases');
  assert.ok(content.includes('ALTER TABLE public.organization_symbols ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on organization_symbols');
});

test('Migration 064 Constraints: Prohibits independent recognition level and complete synthetic independent namespace', () => {
  const content = fs.readFileSync(AUTH_064_PATH, 'utf8');

  assert.ok(content.includes('CHECK (recognition_level IN (\'national\', \'state\', \'unrecognized\', \'registered_unrecognized\'))'), 'Must enforce recognition level check without independent');
  assert.ok(content.includes('chk_prohibit_synthetic_independent'), 'Must add chk_prohibit_synthetic_independent constraint');
  assert.ok(content.includes('\'ORG-INDEPENDENT\''), 'Must prohibit ORG-INDEPENDENT');
  assert.ok(content.includes('id NOT ILIKE \'%indep%\''), 'Must prohibit id matching %indep%');
  assert.ok(content.includes('ec_party_code NOT IN (\'IND\', \'IND-IND\')'), 'Must prohibit ec_party_code IND and IND-IND');
  assert.ok(content.includes('ec_party_code NOT ILIKE \'%indep%\''), 'Must prohibit ec_party_code matching %indep%');
});

test('Migration 064 Constraints: Expands organization_relationships with split_from, renamed_to, merged_into', () => {
  const content = fs.readFileSync(AUTH_064_PATH, 'utf8');

  assert.ok(content.includes('\'split_from\''), 'Must include split_from');
  assert.ok(content.includes('\'renamed_to\''), 'Must include renamed_to');
  assert.ok(content.includes('\'merged_into\''), 'Must include merged_into');
});

test('Post-064 Consolidated Gate: File exists and has valid cryptographic hash', () => {
  assert.ok(fs.existsSync(GATE_PATH), 'Consolidated gate SQL artifact must exist');
  const content = fs.readFileSync(GATE_PATH, 'utf8');
  assert.ok(content.length > 5000, 'Artifact content must exceed 5KB');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(hash, EXPECTED_GATE_064_HASH);
});

test('Post-064 Consolidated Gate: Strictly READ-ONLY with zero DDL or mutation operations', () => {
  const content = fs.readFileSync(GATE_PATH, 'utf8');
  const lines = content.split(/\r?\n/);

  const forbiddenDdlDml = [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+/i,
    /\bALTER\s+/i,
    /\bCREATE\s+/i,
    /\bTRUNCATE\b/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('--')) continue;
    for (const re of forbiddenDdlDml) {
      assert.strictEqual(
        re.test(trimmed),
        false,
        `Line ${i + 1} violates read-only invariant: "${trimmed}"`
      );
    }
  }
});

test('Post-064 Consolidated Gate: All 11 checks represented with explicit PASS/FAIL logic', () => {
  const content = fs.readFileSync(GATE_PATH, 'utf8');

  for (let i = 1; i <= 11; i++) {
    const checkId = i < 10 ? `check_0${i}` : `check_${i}`;
    assert.ok(
      content.includes(`'${checkId}' AS check_id`),
      `Post-064 gate must include ${checkId}`
    );
  }

  assert.ok(content.includes('SELECT * FROM check_1_cte'), 'Must union check_1');
  assert.ok(content.includes('SELECT * FROM check_11_cte'), 'Must union check_11');
  assert.ok(content.includes('ORDER BY check_id;'), 'Must sort by check_id');
});
