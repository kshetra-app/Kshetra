/**
 * tests/migration-immutability.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 090 (Workstream E)
 * Bitwise & Content-Level Migration Immutability Test Battery
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  verifyMigrationImmutability,
  STARTING_COMMIT,
  EXPECTED_MIGRATION_COUNT,
} from '../scripts/verify-migration-immutability.mjs';

test('Directive 090 - Migration Immutability Battery', async (t) => {
  await t.test('Invariant 1: All 68 migrations match starting commit bitwise', () => {
    const report = verifyMigrationImmutability(STARTING_COMMIT);
    assert.strictEqual(report.isImmutabilityPreserved, true);
    assert.strictEqual(report.totalFilesAudited, EXPECTED_MIGRATION_COUNT);
    assert.strictEqual(report.bitwiseMatchCount, EXPECTED_MIGRATION_COUNT);
    assert.strictEqual(report.mismatchCount, 0);
    assert.strictEqual(report.startingCommit, STARTING_COMMIT);

    for (const r of report.results) {
      assert.strictEqual(r.status, 'BITWISE_IDENTICAL');
      assert.strictEqual(r.localSha256, r.startingSha256);
      assert.ok(typeof r.gitBlobSha === 'string' && r.gitBlobSha.length === 40);
    }
  });

  await t.test('Invariant 2: Starting commit reference is immutable constant', () => {
    assert.strictEqual(STARTING_COMMIT, '0ea572d860aa064766042f6b418b157fd8e2098f');
    assert.strictEqual(EXPECTED_MIGRATION_COUNT, 68);
  });
});
