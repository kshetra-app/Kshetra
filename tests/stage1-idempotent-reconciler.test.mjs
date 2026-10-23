/**
 * tests/stage1-idempotent-reconciler.test.mjs
 *
 * Stage 1 Political Organizations Idempotent Reconciler Battery
 * Authority: CTO Directive 148 Section 3 / Task W021.5-C-02 / Master Execution Framework Amendment v1.6
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  STAGE1_TABLE_SEQUENCE,
  computeNaturalKey,
  diffRowAttributes,
  reconcileStage1Table,
  reconcileStage1Catalog,
  applyStage1Reconciliation
} from '../scripts/lib/stage1IdempotentReconciler.mjs';
import { reconcilePoliticalOrganizations } from '../scripts/reconcile_database_criteria_identities.mjs';

describe('CTO Directive 148: Stage 1 Political Organizations Idempotent Reconciler Battery', () => {

  test('1. Empty target write generates exact 1,209 inserts across all 8 tables', () => {
    const emptyState = {};
    const plan = reconcileStage1Catalog(emptyState);

    assert.strictEqual(plan.totalSourceRows, 1209, 'Total source rows must be 1,209');
    assert.strictEqual(plan.totalTargetRows, 0, 'Initial target rows must be 0');
    assert.strictEqual(plan.totalInserts, 1209, 'All 1,209 rows must be planned for INSERT');
    assert.strictEqual(plan.totalUpdates, 0, 'Zero updates on empty state');
    assert.strictEqual(plan.totalPreserved, 0, 'Zero preserved on empty state');
    assert.strictEqual(plan.conflictsCount, 0, 'Zero conflicts on empty state');

    // Verify per-table counts
    const audits = plan.tableAudits;
    assert.strictEqual(audits['public.datasets'].insertCount, 1);
    assert.strictEqual(audits['public.dataset_versions'].insertCount, 1);
    assert.strictEqual(audits['public.provenance_records'].insertCount, 1);
    assert.strictEqual(audits['public.political_organizations'].insertCount, 107);
    assert.strictEqual(audits['public.organization_relationships'].insertCount, 10);
    assert.strictEqual(audits['public.organization_multilingual_names'].insertCount, 27);
    assert.strictEqual(audits['public.organization_symbols'].insertCount, 19);
    assert.strictEqual(audits['public.organization_aliases'].insertCount, 1043);
  });

  test('2. Exact repeat write against populated target produces 100% preservation (0 inserts, 0 updates, 0 duplicates)', () => {
    const emptyState = {};
    const plan1 = reconcileStage1Catalog(emptyState);
    const populatedState = applyStage1Reconciliation(emptyState, plan1);

    // Run reconciliation again against the populated state
    const plan2 = reconcileStage1Catalog(populatedState);

    assert.strictEqual(plan2.totalSourceRows, 1209);
    assert.strictEqual(plan2.totalTargetRows, 1209);
    assert.strictEqual(plan2.totalMatched, 1209, 'All 1,209 rows must match existing target');
    assert.strictEqual(plan2.totalPreserved, 1209, 'All 1,209 rows must be preserved without modification');
    assert.strictEqual(plan2.totalInserts, 0, 'Repeat write must generate strictly 0 INSERTs');
    assert.strictEqual(plan2.totalUpdates, 0, 'Repeat write must generate strictly 0 UPDATEs');
    assert.strictEqual(plan2.conflictsCount, 0, 'Repeat write must generate strictly 0 conflicts');
    assert.strictEqual(plan2.isExactMatch, true, 'isExactMatch must be true');
    assert.strictEqual(plan2.isIdempotent, true, 'isIdempotent must be true');
  });

  test('3. Reconciles against pre-seeded target with random UUIDs and preserves target UUIDs without duplicate key errors', () => {
    // Simulate PostgreSQL Migration 065 applied directly where child rows were assigned random UUIDs
    const canonical = reconcilePoliticalOrganizations();
    const preSeededState = {};

    const childTables = new Set([
      'public.organization_relationships',
      'public.organization_multilingual_names',
      'public.organization_symbols',
      'public.organization_aliases'
    ]);

    for (const [tableName, rows] of Object.entries(canonical.rowsByTable)) {
      if (childTables.has(tableName)) {
        // Child tables have random UUIDs in database from Migration 065
        preSeededState[tableName] = rows.map(r => ({
          ...r,
          id: crypto.randomUUID() // completely different random UUID
        }));
      } else {
        // Anchor tables keep their deterministic IDs
        preSeededState[tableName] = rows.map(r => ({ ...r }));
      }
    }

    // Run reconciler
    const plan = reconcileStage1Catalog(preSeededState);

    assert.strictEqual(plan.totalSourceRows, 1209);
    assert.strictEqual(plan.totalMatched, 1209, 'Must match all 1,209 rows by natural keys');
    assert.strictEqual(plan.totalPreserved, 1209, 'Must preserve existing rows by natural key');
    assert.strictEqual(plan.totalInserts, 0, 'Must NOT attempt to insert new UUIDs');
    assert.strictEqual(plan.totalUpdates, 0, 'Must NOT mutate unchanged rows');
    assert.strictEqual(plan.conflictsCount, 0, 'Zero conflicts');

    // Verify that the resulting state preserved the pre-seeded random UUIDs
    const preservedState = applyStage1Reconciliation(preSeededState, plan);
    for (const tableName of STAGE1_TABLE_SEQUENCE) {
      if (!childTables.has(tableName)) continue;
      const targetRows = preSeededState[tableName];
      const resultRows = preservedState[tableName];
      for (let i = 0; i < targetRows.length; i++) {
        assert.strictEqual(
          resultRows[i].id,
          targetRows[i].id,
          `Existing target UUID must be preserved on ${tableName} row ${i}`
        );
      }
    }
  });

  test('4. Correctly detects business invariant conflicts on contradictory attributes', () => {
    const canonical = reconcilePoliticalOrganizations();
    const sourceAliases = canonical.rowsByTable['public.organization_aliases'];

    // Target has alias with same natural key but contradictory confidence status
    const targetAliases = [
      {
        ...sourceAliases[0],
        id: crypto.randomUUID(),
        confidence: 'CONFLICTING' // contradictory!
      }
    ];

    const audit = reconcileStage1Table('public.organization_aliases', [sourceAliases[0]], targetAliases);

    assert.strictEqual(audit.matchedCount, 1, 'Natural key matched');
    assert.strictEqual(audit.hasConflicts, true, 'Must detect business invariant conflict');
    assert.strictEqual(audit.conflicts.length, 1);
    assert.ok(audit.conflicts[0].diffs.confidence, 'Diff must identify contradictory confidence');
  });

  test('5. Natural key generation handles edge cases and null jurisdiction scopes cleanly', () => {
    const sym1 = { organization_id: 'ORG-INC', symbol_name: 'Hand', jurisdiction_scope: null, valid_from: '1977-01-01' };
    const sym2 = { organization_id: 'ORG-INC', symbol_name: 'Hand', jurisdiction_scope: 'IN', valid_from: '1977-01-01' };

    const key1 = computeNaturalKey('public.organization_symbols', sym1);
    const key2 = computeNaturalKey('public.organization_symbols', sym2);

    assert.strictEqual(key1, 'ORG-INC::Hand::NULL::1977-01-01');
    assert.strictEqual(key2, 'ORG-INC::Hand::IN::1977-01-01');
    assert.notStrictEqual(key1, key2, 'Distinct jurisdiction scopes must produce distinct natural keys');
  });
});
