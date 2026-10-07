/**
 * tests/post-065-consolidated-gate.test.mjs
 * 
 * REGRESSION & READ-ONLY INTEGRITY TEST FOR CONSOLIDATED POST-065 GATE
 * 
 * Asserts:
 * 1. File exists at supabase/staging_checkpoints/w021_5_post_065_consolidated_gate.sql.
 * 2. SHA-256 matches certified hash.
 * 3. Strictly READ-ONLY with zero DDL or mutation operations.
 * 4. Contains exactly 10 checks returning a consolidated result set with check_10 aggregate.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const GATE_PATH = path.join(REPO_ROOT, 'supabase', 'staging_checkpoints', 'w021_5_post_065_consolidated_gate.sql');
const EXPECTED_GATE_HASH = '088cc0c35984b576b5bf35ab6365a4622980f503f2693d04f8f91c86931ffb8e';

test('Post-065 Consolidated Gate: File exists and has valid cryptographic hash', () => {
  assert.ok(fs.existsSync(GATE_PATH), 'Consolidated gate SQL artifact must exist');
  const content = fs.readFileSync(GATE_PATH, 'utf8');
  assert.ok(content.length > 5000, 'Artifact content must exceed 5KB');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(hash, EXPECTED_GATE_HASH);
});

test('Post-065 Consolidated Gate: Strictly READ-ONLY with zero DDL or mutation operations', () => {
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

test('Post-065 Consolidated Gate: All 10 checks represented with explicit PASS/FAIL logic', () => {
  const content = fs.readFileSync(GATE_PATH, 'utf8');

  for (let i = 1; i <= 10; i++) {
    const checkId = i < 10 ? `check_0${i}` : `check_${i}`;
    assert.ok(
      content.includes(`'${checkId}' AS check_id`),
      `Post-065 gate must include ${checkId}`
    );
  }

  assert.ok(content.includes('SELECT * FROM check_1_cte'), 'Must union check_1');
  assert.ok(content.includes('SELECT * FROM check_10_cte'), 'Must union check_10');
  assert.ok(content.includes('ORDER BY check_id;'), 'Must sort by check_id');
});
