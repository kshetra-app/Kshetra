/**
 * tests/states-schema-regression.test.mjs
 * 
 * REGRESSION TEST: PREVENT INVALID states.updated_at REFERENCE IN MIGRATION & APPLICATION PACKAGES
 * 
 * Verifies that:
 * 1. public.states table definition across migrations (001, 003, 040, 041, 050) does not contain updated_at.
 * 2. No staging package attempts to update or assign updated_at on public.states.
 * 3. The derived staging package for 059 does not contain updated_at = now() for public.states.
 * 4. Authoritative migrations in supabase/migrations/ remain unmodified and preserve their declared hashes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();

test('Regression: public.states schema does not possess updated_at column in base DDL', () => {
  const mig001 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '001_initial_schema.sql'), 'utf8');
  const statesMatch = mig001.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?states\s*\(([\s\S]*?)\);/i);
  assert.ok(statesMatch, 'states table definition must be found in 001_initial_schema.sql');
  const ddlBody = statesMatch[1];
  assert.strictEqual(
    /updated_at/i.test(ddlBody),
    false,
    'public.states definition in 001_initial_schema.sql must not define updated_at column'
  );
});

test('Regression: supabase/staging_packages/059_canonical_national_constituency_registry.sql does NOT contain states.updated_at assignment', () => {
  const staging059 = fs.readFileSync(
    path.join(REPO_ROOT, 'supabase', 'staging_packages', '059_canonical_national_constituency_registry.sql'),
    'utf8'
  );
  
  // Extract Section 3: INSERT INTO public.states (...) ON CONFLICT (code) DO UPDATE SET ...
  const section3Match = staging059.match(/INSERT\s+INTO\s+public\.states[\s\S]*?ON\s+CONFLICT\s*\(code\)\s*DO\s+UPDATE\s+SET([\s\S]*?);/i);
  assert.ok(section3Match, 'Section 3 states upsert must be present in staging 059 package');
  const updateClause = section3Match[1];
  
  assert.strictEqual(
    /updated_at\s*=\s*now\(\)/i.test(updateClause),
    false,
    'Staging 059 package must NOT assign updated_at on public.states'
  );
});

test('Regression: Derived staging package 059 differs from authoritative source ONLY by the removed updated_at line', () => {
  const auth059Path = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
  const staging059Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '059_canonical_national_constituency_registry.sql');
  
  const authLines = fs.readFileSync(auth059Path, 'utf8').split(/\r?\n/);
  const stagingLines = fs.readFileSync(staging059Path, 'utf8').split(/\r?\n/);
  
  // Filter out the single line: updated_at = now();
  const filteredAuth = authLines.filter(l => !l.trim().startsWith('updated_at = now();')).map(l => l.replace(/,\s*$/, ';'));
  
  // Both line counts should differ by exactly 1 line
  assert.strictEqual(authLines.length - stagingLines.length, 1, 'Derived package must differ by exactly 1 line');
});

test('Regression: Authoritative migrations in supabase/migrations/ preserve their frozen SHA-256 hashes', () => {
  const expectedHashes = {
    '050_political_entity_model.sql': 'd89442ff98217b67b3d1d89e657c9c956eb3d3b1447d2fb075b40dd322c00e5b',
    '059_canonical_national_constituency_registry.sql': '80285b808850f76391860de827e38b6722afb5d5b0a44727d9869f48a24cb03e',
    '060_canonical_electoral_geography_remediation.sql': 'f3bbd84c02d48b5cf9b140aa92afb693e5fad0839a503dc33a17b9a8886e9d60',
    '061_canonical_national_ac_pc_mappings.sql': '4d8eafa4c0c6d88854bd815227fbf81529ee9d2911c9ed9f44cc799f519726e9',
    '062_canonical_assam_2023_delimitation.sql': 'b5747944360c44db20d3276119b3820e6e935df7896678c893f2140609670208',
    '063_canonical_political_identity_foundation.sql': 'f99ceb6d98a762784cc251eb4e6ea355be6e08c97949e084e1d61449b5129368',
    '064_political_organization_governance_remediation.sql': '71683a4aab0c6e329bf5739cc0bfdb3c04ac7769e1f26b7142532348c05da072',
    '065_canonical_political_organization_registry.sql': '78ec752a92702bcc32e4aba6a0115d55c2a024c0165af8418f7cc41c598100e1',
    '066_downstream_civic_extensions.sql': '74fbcd9a6303946eb2d6b9895a085ce0c6b8fcf6a405a65118fea6fdb24353a3'
  };

  for (const [file, expectedHash] of Object.entries(expectedHashes)) {
    const fullPath = path.join(REPO_ROOT, 'supabase', 'migrations', file);
    assert.ok(fs.existsSync(fullPath), `Migration ${file} must exist`);
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    assert.strictEqual(actualHash, expectedHash, `Migration ${file} SHA-256 must remain frozen and unchanged`);
  }
});
