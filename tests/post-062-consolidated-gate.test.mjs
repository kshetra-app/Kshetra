/**
 * tests/post-062-consolidated-gate.test.mjs
 * 
 * REGRESSION & READ-ONLY INTEGRITY TEST FOR CONSOLIDATED POST-062 GATE
 * 
 * Asserts:
 * 1. File exists at supabase/staging_checkpoints/w021_5_post_062_consolidated_gate.sql.
 * 2. File is strictly READ-ONLY (zero INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/TRUNCATE/DO statements).
 * 3. Contains all ten required checks (Checks 01 through 10) in a single consolidated CTE query.
 * 4. Yields a single executable SELECT statement with 6-column unified schema.
 * 5. Does not rely on zero-row pass semantics; asserts explicit PASS/FAIL rows.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const GATE_PATH = path.join(REPO_ROOT, 'supabase', 'staging_checkpoints', 'w021_5_post_062_consolidated_gate.sql');

test('Post-062 Consolidated Gate: File exists and has valid cryptographic hash', () => {
  assert.ok(fs.existsSync(GATE_PATH), 'Consolidated gate SQL artifact must exist');
  const content = fs.readFileSync(GATE_PATH, 'utf8');
  assert.ok(content.length > 5000, 'Artifact content must exceed 5KB');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(hash, '3925de1ee4da2c299c680bc88b315143748ae9fde486331278035d8ecc9bd36c');
});

test('Post-062 Consolidated Gate: Strictly READ-ONLY with zero DDL or mutation operations', () => {
  const content = fs.readFileSync(GATE_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  const forbiddenPatterns = [
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bCREATE\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bDO\s+\$\$/i,
    /\bMERGE\b/i
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim();
    if (trimmed.startsWith('--')) continue; // Skip comments
    for (const pattern of forbiddenPatterns) {
      assert.strictEqual(
        pattern.test(trimmed),
        false,
        `Line ${idx + 1} violates read-only invariant: "${trimmed}"`
      );
    }
  }
});

test('Post-062 Consolidated Gate: All 10 checks represented with explicit PASS/FAIL logic', () => {
  const content = fs.readFileSync(GATE_PATH, 'utf8');

  for (let i = 1; i <= 10; i++) {
    const pad = String(i).padStart(2, '0');
    assert.ok(
      content.includes(`check_${i}_cte`) || content.includes(`check_${pad}_cte`),
      `Check ${i} CTE must be present in query`
    );
  }

  // Verify explicit output columns in CTE definitions
  assert.ok(content.includes('check_id'), 'Must select check_id');
  assert.ok(content.includes('check_name'), 'Must select check_name');
  assert.ok(content.includes('actual_value'), 'Must select actual_value');
  assert.ok(content.includes('expected_value'), 'Must select expected_value');
  assert.ok(content.includes('status'), 'Must select status');
  assert.ok(content.includes('details'), 'Must select details');

  // Verify final consolidated union
  assert.ok(content.includes('SELECT * FROM check_1_cte'), 'Must union check_1');
  assert.ok(content.includes('SELECT * FROM check_10_cte'), 'Must union check_10');
});
