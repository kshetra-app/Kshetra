/**
 * tests/migration-immutability.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 091 (Workstream C)
 * True Raw-Byte Migration Immutability & Exact Path-Set Verification Battery
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  verifyMigrationImmutability,
  compareMigrationBytes,
  STARTING_COMMIT,
  EXPECTED_MIGRATION_COUNT,
} from '../scripts/verify-migration-immutability.mjs';

test('Directive 091 - Migration Immutability & Raw-Byte Verification Suite', async (t) => {
  await t.test('1. Live Repository Invariant: All 68 migrations match starting commit raw-byte identical', () => {
    const report = verifyMigrationImmutability(STARTING_COMMIT);
    assert.strictEqual(report.isImmutabilityPreserved, true);
    assert.strictEqual(report.totalFilesAudited, EXPECTED_MIGRATION_COUNT);
    assert.strictEqual(report.identicalCount, EXPECTED_MIGRATION_COUNT);
    assert.strictEqual(report.missingPaths.length, 0);
    assert.strictEqual(report.addedPaths.length, 0);
    assert.strictEqual(report.contentModifiedFiles.length, 0);
    assert.strictEqual(report.unresolvedBlobs.length, 0);
    assert.strictEqual(report.pathSetsIdentical, true);
    assert.strictEqual(report.isGitDiffClean, true);
    assert.strictEqual(report.startingCommit, STARTING_COMMIT);

    for (const r of report.results) {
      assert.strictEqual(r.status, 'RAW_BYTES_IDENTICAL');
      assert.strictEqual(r.isMatch, true);
      assert.strictEqual(r.baseSha256, r.currSha256);
      assert.ok(typeof r.baseSha256 === 'string' && r.baseSha256.length === 64);
    }
  });

  await t.test('2. Constants Invariant: starting commit and expected count constants', () => {
    assert.strictEqual(STARTING_COMMIT, '0ea572d860aa064766042f6b418b157fd8e2098f');
    assert.strictEqual(EXPECTED_MIGRATION_COUNT, 68);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Adversarial Unit Tests for Raw-Byte Comparison Logic
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('3. Case A: Identical raw bytes pass with RAW_BYTES_IDENTICAL', () => {
    const baseBuf = Buffer.from('CREATE TABLE test (id INT);', 'utf8');
    const currBuf = Buffer.from('CREATE TABLE test (id INT);', 'utf8');
    const baseMap = new Map([['001_test.sql', baseBuf]]);
    const currMap = new Map([['001_test.sql', currBuf]]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, true);
    assert.strictEqual(res.identicalCount, 1);
    assert.strictEqual(res.contentModifiedFiles.length, 0);
    assert.strictEqual(res.results[0].status, 'RAW_BYTES_IDENTICAL');
  });

  await t.test('4. Case B: CRLF versus LF strictly fails byte-for-byte comparison (no text normalization)', () => {
    const lfBuf = Buffer.from('CREATE TABLE test (\n  id INT\n);\n', 'utf8');
    const crlfBuf = Buffer.from('CREATE TABLE test (\r\n  id INT\r\n);\r\n', 'utf8');
    const baseMap = new Map([['001_test.sql', lfBuf]]);
    const currMap = new Map([['001_test.sql', crlfBuf]]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false, 'CRLF vs LF must strictly fail raw byte equality');
    assert.strictEqual(res.identicalCount, 0);
    assert.deepStrictEqual(res.contentModifiedFiles, ['001_test.sql']);
    assert.strictEqual(res.results[0].status, 'CONTENT_MODIFIED');
    assert.notStrictEqual(res.results[0].baseSha256, res.results[0].currSha256);
  });

  await t.test('5. Case C: A single-byte content change strictly fails immutability', () => {
    const baseBuf = Buffer.from('SELECT 1;', 'utf8');
    const currBuf = Buffer.from('SELECT 2;', 'utf8');
    const baseMap = new Map([['001_test.sql', baseBuf]]);
    const currMap = new Map([['001_test.sql', currBuf]]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false);
    assert.deepStrictEqual(res.contentModifiedFiles, ['001_test.sql']);
    assert.strictEqual(res.results[0].status, 'CONTENT_MODIFIED');
  });

  await t.test('6. Case D: A missing baseline path strictly fails path-set equality', () => {
    const buf = Buffer.from('SELECT 1;', 'utf8');
    const baseMap = new Map([
      ['001_test.sql', buf],
      ['002_missing_in_current.sql', buf],
    ]);
    const currMap = new Map([['001_test.sql', buf]]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false);
    assert.strictEqual(res.pathSetsIdentical, false);
    assert.deepStrictEqual(res.missingPaths, ['002_missing_in_current.sql']);
  });

  await t.test('7. Case E: An additional current path strictly fails path-set equality', () => {
    const buf = Buffer.from('SELECT 1;', 'utf8');
    const baseMap = new Map([['001_test.sql', buf]]);
    const currMap = new Map([
      ['001_test.sql', buf],
      ['069_extra_migration.sql', buf],
    ]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false);
    assert.strictEqual(res.pathSetsIdentical, false);
    assert.deepStrictEqual(res.addedPaths, ['069_extra_migration.sql']);
  });

  await t.test('8. Case F: Same-count rename or substitution fails path-set equality', () => {
    const buf = Buffer.from('SELECT 1;', 'utf8');
    const baseMap = new Map([['001_original.sql', buf]]);
    const currMap = new Map([['001_renamed.sql', buf]]);

    assert.strictEqual(baseMap.size, currMap.size, 'Sizes are identical (1 = 1)');
    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false);
    assert.strictEqual(res.pathSetsIdentical, false);
    assert.deepStrictEqual(res.missingPaths, ['001_original.sql']);
    assert.deepStrictEqual(res.addedPaths, ['001_renamed.sql']);
  });

  await t.test('9. Case G: Unresolved baseline blob strictly fails with BASELINE_BLOB_UNRESOLVED', () => {
    const currBuf = Buffer.from('SELECT 1;', 'utf8');
    const baseMap = new Map([['001_test.sql', null]]); // Unresolvable blob
    const currMap = new Map([['001_test.sql', currBuf]]);

    const res = compareMigrationBytes(baseMap, currMap);
    assert.strictEqual(res.isImmutabilityPreserved, false);
    assert.deepStrictEqual(res.unresolvedBlobs, ['001_test.sql']);
    assert.strictEqual(res.results[0].status, 'BASELINE_BLOB_UNRESOLVED');
  });
});
