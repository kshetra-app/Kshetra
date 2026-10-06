/**
 * tests/temporal-reconciliation-062.test.mjs
 * 
 * REGRESSION & SCHEMA INTEGRITY TEST BATTERY FOR MIGRATION 062-R1
 * 
 * Asserts:
 * 1. Authoritative migration 062 remains frozen and bitwise immutable.
 * 2. Derived staging package 062-R1 exists with certified SHA-256 hash.
 * 3. 062-R1 remediates dataset_versions column alignment (uses dataset_id, record_count, metadata).
 * 4. 062-R1 remediates evidence_records column alignment (uses artifact_name, artifact_sha256, etc.).
 * 5. 062-R1 creates provenance anchor node to satisfy record_provenance_linkages foreign key constraint.
 * 6. 062-R1 maintains exactly 126 AC updates and 126 AC->PC mappings across all 14 Assam PCs.
 * 7. 062-R1 preserves temporal archiving semantics (2008 versions valid_to = 2023-08-16, is_current = false).
 * 8. Zero destructive operations or production references exist in 062-R1.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const AUTH_062_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');
const R1_062_PATH = path.join(REPO_ROOT, 'supabase', 'staging_packages', '062-R1_canonical_assam_2023_delimitation.sql');

const EXPECTED_AUTH_HASH = 'b5747944360c44db20d3276119b3820e6e935df7896678c893f2140609670208';
const EXPECTED_R1_HASH = '2e19a10d286513c27c1d138104c369a1c7c22e317084319b036d8a0c6b1ef1e1';

test('062-R1 Integrity: Authoritative migration 062 remains frozen and unmodified', () => {
  assert.ok(fs.existsSync(AUTH_062_PATH), 'Authoritative migration 062 must exist');
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(AUTH_062_PATH)).digest('hex');
  assert.strictEqual(actualHash, EXPECTED_AUTH_HASH, 'Authoritative migration 062 SHA-256 must match frozen coordinate');
});

test('062-R1 Integrity: Derived staging package 062-R1 exists with certified hash', () => {
  assert.ok(fs.existsSync(R1_062_PATH), '062-R1 staging package must exist');
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(R1_062_PATH)).digest('hex');
  assert.strictEqual(actualHash, EXPECTED_R1_HASH, '062-R1 staging package SHA-256 must match expected hash');
});

test('062-R1 Schema Alignment: Corrects dataset_versions columns to live catalog', () => {
  const content = fs.readFileSync(R1_062_PATH, 'utf8');

  // Must NOT contain invalid columns
  assert.strictEqual(content.includes('dataset_name'), false, 'Must not reference non-existent dataset_name column');
  assert.strictEqual(content.includes('effective_date = EXCLUDED'), false, 'Must not reference non-existent effective_date column in DO UPDATE');
  assert.strictEqual(content.includes('effective_date,'), false, 'Must not reference non-existent effective_date column in column list');

  // Must contain valid columns
  assert.ok(content.includes('dataset_id'), 'Must reference dataset_id column');
  assert.ok(content.includes('effective_from'), 'Must reference effective_from column');
  assert.ok(content.includes('default_status'), 'Must reference default_status column');
  assert.ok(content.includes('record_count'), 'Must reference record_count column');
  assert.ok(content.includes('eci_delimitation_order_2023_as'), 'Must register/reference eci_delimitation_order_2023_as dataset');
});

test('062-R1 Schema Alignment: Corrects evidence_records columns to live catalog', () => {
  const content = fs.readFileSync(R1_062_PATH, 'utf8');

  // Must NOT contain non-existent columns from draft spec
  assert.strictEqual(content.includes('evidence_type,'), false, 'Must not reference non-existent evidence_type column');
  assert.strictEqual(content.includes('collected_at'), false, 'Must not reference non-existent collected_at column');

  // Must contain valid columns
  assert.ok(content.includes('artifact_name'), 'Must reference artifact_name column');
  assert.ok(content.includes('artifact_sha256'), 'Must reference artifact_sha256 column');
  assert.ok(content.includes('verification_authority'), 'Must reference verification_authority column');
  assert.ok(content.includes('verified_by'), 'Must reference verified_by column');
});

test('062-R1 Provenance Integrity: Establishes provenance anchor node for statutory linkage', () => {
  const content = fs.readFileSync(R1_062_PATH, 'utf8');
  assert.ok(content.includes('INSERT INTO public.provenance_records'), 'Must register provenance anchor record');
  assert.ok(content.includes("'a55a0023-0000-4000-8000-000000000001'::uuid"), 'Must use statutory UUID coordinate');
});

test('062-R1 Payload & Temporal Integrity: Preserves 126 AC updates, 126 mappings, and version archiving', () => {
  const content = fs.readFileSync(R1_062_PATH, 'utf8');

  const acMatches = [...content.matchAll(/\('AS-AC-\d{3}',\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'(GEN|SC|ST)'\)/g)];
  assert.strictEqual(acMatches.length, 126, 'Must update exactly 126 ACs');

  const mapMatches = [...content.matchAll(/\('AS-AC-\d{3}',\s*(\d+),\s*'([^']+)',\s*'(AS-PC-\d{2})',\s*'([^']+)'\)/g)];
  assert.strictEqual(mapMatches.length, 126, 'Must establish exactly 126 AC->PC mappings');

  const pcSet = new Set(mapMatches.map(m => m[0].match(/AS-PC-\d{2}/)[0]));
  assert.strictEqual(pcSet.size, 14, 'Must map across all 14 Assam PCs');

  assert.ok(content.includes("valid_to = '2023-08-16'::date"), 'Must set valid_to to 2023-08-16 on archived versions');
  assert.ok(content.includes("is_current = false"), 'Must set is_current to false on archived versions');
});

test('062-R1 Safety: Zero destructive operations or production references', () => {
  const content = fs.readFileSync(R1_062_PATH, 'utf8');
  assert.strictEqual(content.includes('ehfafcnimmjusyvplbah'), false, 'Must not reference production database ID');
  assert.strictEqual(content.includes('DROP TABLE'), false, 'Must not drop tables');
  assert.strictEqual(content.includes('TRUNCATE'), false, 'Must not truncate tables');
  assert.strictEqual(content.includes('DELETE FROM'), false, 'Must not delete rows');
});
