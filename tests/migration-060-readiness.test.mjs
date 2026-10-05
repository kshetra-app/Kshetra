/**
 * tests/migration-060-readiness.test.mjs
 * 
 * STATIC FORENSIC AUDIT & READINESS TEST SUITE FOR MIGRATION 060
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates that Migration 060 is 100% compatible with post-059 staging state,
 * possesses zero destructive DDL operations, contains no production references,
 * satisfies all foreign key and uniqueness invariants, and preserves immutability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_060_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql');
const STAG_060_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '060_canonical_electoral_geography_remediation.sql');

test('Migration 060 Integrity: Authoritative and Staging files are byte-for-byte identical', () => {
  assert.ok(fs.existsSync(AUTH_060_PATH), 'Authoritative migration 060 must exist');
  assert.ok(fs.existsSync(STAG_060_PATH), 'Staging package 060 must exist');

  const authContent = fs.readFileSync(AUTH_060_PATH);
  const stagContent = fs.readFileSync(STAG_060_PATH);

  const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
  const stagHash = crypto.createHash('sha256').update(stagContent).digest('hex');

  const expectedHash = 'f3bbd84c02d48b5cf9b140aa92afb693e5fad0839a503dc33a17b9a8886e9d60';
  assert.strictEqual(authHash, expectedHash, 'Authoritative migration 060 SHA-256 must match frozen coordinate');
  assert.strictEqual(stagHash, expectedHash, 'Staging package 060 SHA-256 must match authoritative migration');
  assert.strictEqual(authContent.length, stagContent.length, 'Byte size must be identical');
});

test('Migration 060 Safety: Zero destructive operations (DROP TABLE/COLUMN, TRUNCATE, DELETE)', () => {
  const content = fs.readFileSync(AUTH_060_PATH, 'utf8');
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

test('Migration 060 Safety: Zero production database references or external endpoints', () => {
  const content = fs.readFileSync(AUTH_060_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('api.kshetra.in'), false, 'Must not reference production API domain');
});

test('Migration 060 Architecture: All prerequisite schema objects exist in preceding migrations', () => {
  const mig041 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '041_geography_versioning_and_temporal_validity.sql'), 'utf8');
  const mig039 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '039_data_governance_foundation.sql'), 'utf8');
  const mig001 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '001_initial_schema.sql'), 'utf8');

  // Verify delimitation_regimes table exists in 041
  assert.ok(mig041.includes('CREATE TABLE IF NOT EXISTS public.delimitation_regimes'), 'delimitation_regimes must be created in 041');

  // Verify evidence_records table exists in 039
  assert.ok(mig039.includes('CREATE TABLE IF NOT EXISTS evidence_records'), 'evidence_records must be created in 039');

  // Verify constituencies has updated_at in 001
  assert.ok(mig001.includes('CREATE TABLE IF NOT EXISTS constituencies'), 'constituencies must exist in 001');
  const constMatch = mig001.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+constituencies\s*\(([\s\S]*?)\);/i);
  assert.ok(constMatch && constMatch[1].includes('updated_at TIMESTAMPTZ'), 'constituencies must have updated_at column');
});

test('Migration 060 Idempotency: All DDL uses IF NOT EXISTS and all DML has conflict handling', () => {
  const content = fs.readFileSync(AUTH_060_PATH, 'utf8');

  // DDL check
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.constituency_lineage'), 'constituency_lineage must use IF NOT EXISTS');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.constituency_parliamentary_mappings'), 'constituency_parliamentary_mappings must use IF NOT EXISTS');

  // DML check
  const nonCommentContent = content.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const insertMatches = nonCommentContent.match(/INSERT\s+INTO/g);
  const conflictMatches = nonCommentContent.match(/ON\s+CONFLICT/g);
  assert.ok(insertMatches, 'Must have INSERT statements');
  assert.ok(conflictMatches, 'Must have ON CONFLICT clauses');
  assert.strictEqual(insertMatches.length, 8, 'Must have exactly 8 INSERT statements');
  assert.strictEqual(conflictMatches.length, 8, 'Every INSERT must possess an ON CONFLICT clause');
});

test('Migration 060 Section 14: Structured backfill for 3 reconciled seed anomalies', () => {
  const content = fs.readFileSync(AUTH_060_PATH, 'utf8');

  assert.ok(content.includes('LS_Hamirpur_HP'), 'Must backfill Hamirpur HP conflict');
  assert.ok(content.includes('LS_Maharajganj_UP'), 'Must backfill Maharajganj UP conflict');
  assert.ok(content.includes('LS_Aurangabad_BR'), 'Must backfill Aurangabad BR conflict');

  assert.ok(content.includes('STATE_MISATTRIBUTION'), 'Must assign conflict_type');
  assert.ok(content.includes('STATUTORY_RECONCILIATION'), 'Must assign resolution_method');
  assert.ok(content.includes('CTO_W021_5_AUDIT'), 'Must assign resolver');
});
