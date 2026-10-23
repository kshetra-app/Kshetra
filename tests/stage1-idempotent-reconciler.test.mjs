/**
 * tests/stage1-idempotent-reconciler.test.mjs
 *
 * Stage 1 Political Organizations Idempotent Reconciler Battery
 * Authority: CTO Directive 148 / CTO Directive 149 Section 5 / Task W021.5-C-02 / Master Execution Framework Amendment v1.6
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  STAGE1_TABLE_SEQUENCE,
  STAGE1_MUTATION_POLICY,
  computeNaturalKey,
  diffRowAttributes,
  reconcileStage1Table,
  reconcileStage1Catalog,
  applyStage1Reconciliation
} from '../scripts/lib/stage1IdempotentReconciler.mjs';
import { reconcilePoliticalOrganizations } from '../scripts/reconcile_database_criteria_identities.mjs';

describe('CTO Directive 149: Stage 1 Political Organizations Idempotent Reconciler Battery', () => {

  test('1. Empty target write generates exact 1,209 inserts and 1,099 child rows across all 8 tables', () => {
    const emptyState = {};
    const plan = reconcileStage1Catalog(emptyState);

    assert.strictEqual(plan.totalSourceRows, 1209, 'Total source rows must be 1,209');
    assert.strictEqual(plan.totalTargetRows, 0, 'Initial target rows must be 0');
    assert.strictEqual(plan.totalInserts, 1209, 'All 1,209 rows must be planned for INSERT');
    assert.strictEqual(plan.totalUpdates, 0, 'Zero updates on empty state');
    assert.strictEqual(plan.totalPreserved, 0, 'Zero preserved on empty state');
    assert.strictEqual(plan.conflictsCount, 0, 'Zero conflicts on empty state');
    assert.strictEqual(plan.childRowsCount, 1099, 'Child rows count must be exactly 1,099 (10 + 27 + 19 + 1043)');

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

  test('3. Reconciles against pre-seeded target with random UUIDs and preserves all 1,099 child target UUIDs', () => {
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

  test('4. Correctly detects business invariant conflicts under STAGE1_MUTATION_POLICY', () => {
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

  test('5. Symbol natural key strictly adheres to database unique constraint uq_org_symbols_timeline (organization_id, symbol_name, valid_from)', () => {
    // Under Migration 064 line 133, uq_org_symbols_timeline is UNIQUE (organization_id, symbol_name, valid_from)
    // jurisdiction_scope is NOT part of this uniqueness constraint.
    const sym1 = { organization_id: 'ORG-INC', symbol_name: 'Hand', jurisdiction_scope: null, valid_from: '1977-01-01' };
    const sym2 = { organization_id: 'ORG-INC', symbol_name: 'Hand', jurisdiction_scope: 'IN', valid_from: '1977-01-01' };

    const key1 = computeNaturalKey('public.organization_symbols', sym1);
    const key2 = computeNaturalKey('public.organization_symbols', sym2);

    assert.strictEqual(key1, 'ORG-INC::Hand::1977-01-01');
    assert.strictEqual(key2, 'ORG-INC::Hand::1977-01-01');
    assert.strictEqual(key1, key2, 'Natural keys must match database constraint (organization_id, symbol_name, valid_from)');

    // When reconciling, a diff on jurisdiction_scope on the same timeline key is caught as a protected attribute conflict:
    const targetSymbol = [{ ...sym1, id: crypto.randomUUID(), jurisdiction_scope: 'IN' }];
    const audit = reconcileStage1Table('public.organization_symbols', [sym1], targetSymbol);
    assert.strictEqual(audit.matchedCount, 1);
    assert.strictEqual(audit.hasConflicts, true);
    assert.ok(audit.conflicts[0].reason.includes('jurisdiction_scope'));
  });

  test('6. Alias cross-organization temporal collision is detected (trigger fn_validate_org_alias_temporal_invariants)', () => {
    // When an incoming alias row has the same raw_lookup_key and scope as an existing target row
    // for a DIFFERENT organization with overlapping validity, it must be flagged as a TEMPORAL_TRIGGER_COLLISION.
    const sourceAlias = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-NEW',
      raw_lookup_key: 'congress',
      jurisdiction_scope: 'IN',
      alias_type: 'informal',
      confidence: 'VERIFIED',
      valid_from: '2020-01-01',
      valid_to: '2025-01-01'
    };

    const targetAlias = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-INC', // DIFFERENT ORGANIZATION
      raw_lookup_key: 'congress',
      jurisdiction_scope: 'IN',
      alias_type: 'informal',
      confidence: 'VERIFIED',
      valid_from: '2019-01-01',
      valid_to: '2026-01-01' // OVERLAPS!
    };

    const audit = reconcileStage1Table('public.organization_aliases', [sourceAlias], [targetAlias]);
    assert.strictEqual(audit.hasConflicts, true);
    assert.strictEqual(audit.conflicts.length, 1);
    assert.ok(audit.conflicts[0].reason.includes('TEMPORAL_TRIGGER_COLLISION'));
    assert.strictEqual(audit.insertCount, 0, 'Must NOT attempt to insert a row that would trigger 23514');
  });

  test('7. Exact arithmetic verification: 1,099 child rows + 107 orgs + 1 provenance = 1,207 catalog records (+ 2 datasets = 1,209 total)', () => {
    const canonical = reconcilePoliticalOrganizations();
    const rows = canonical.rowsByTable;

    const orgs = rows['public.political_organizations'].length;
    const rels = rows['public.organization_relationships'].length;
    const multi = rows['public.organization_multilingual_names'].length;
    const syms = rows['public.organization_symbols'].length;
    const aliases = rows['public.organization_aliases'].length;
    const prov = rows['public.provenance_records'].length;
    const ds = rows['public.datasets'].length;
    const dsv = rows['public.dataset_versions'].length;

    assert.strictEqual(orgs, 107, '107 political organizations');
    assert.strictEqual(rels, 10, '10 relationships');
    assert.strictEqual(multi, 27, '27 multilingual names');
    assert.strictEqual(syms, 19, '19 symbols');
    assert.strictEqual(aliases, 1043, '1,043 aliases');
    assert.strictEqual(prov, 1, '1 provenance record');
    assert.strictEqual(ds, 1, '1 dataset anchor');
    assert.strictEqual(dsv, 1, '1 dataset_version anchor');

    const childRows = rels + multi + syms + aliases;
    assert.strictEqual(childRows, 1099, 'Child rows sum must be exactly 1,099 (NOT 1,100)');

    const catalogTotal = childRows + orgs + prov;
    assert.strictEqual(catalogTotal, 1207, 'Catalog records must be exactly 1,207');

    const grandTotal = catalogTotal + ds + dsv;
    assert.strictEqual(grandTotal, 1209, 'Grand total must be exactly 1,209');
  });

  test('8. Partial-batch restart and recovery simulation preserves written tables and resumes remainder', () => {
    // Simulate a failure midway: datasets, versions, provenance, organizations, and relationships are written
    // but symbols, multilingual names, and aliases were interrupted.
    const canonical = reconcilePoliticalOrganizations();
    const interruptedTargetState = {
      'public.datasets': canonical.rowsByTable['public.datasets'],
      'public.dataset_versions': canonical.rowsByTable['public.dataset_versions'],
      'public.provenance_records': canonical.rowsByTable['public.provenance_records'],
      'public.political_organizations': canonical.rowsByTable['public.political_organizations'],
      'public.organization_relationships': canonical.rowsByTable['public.organization_relationships']
      // multilingual, symbols, aliases are missing (empty in target)
    };

    const recoveryPlan = reconcileStage1Catalog(interruptedTargetState);

    // Target rows already written must be preserved
    assert.strictEqual(recoveryPlan.tableAudits['public.political_organizations'].preserveCount, 107);
    assert.strictEqual(recoveryPlan.tableAudits['public.organization_relationships'].preserveCount, 10);
    assert.strictEqual(recoveryPlan.tableAudits['public.political_organizations'].insertCount, 0);

    // Missing tables must be identified for insert
    assert.strictEqual(recoveryPlan.tableAudits['public.organization_multilingual_names'].insertCount, 27);
    assert.strictEqual(recoveryPlan.tableAudits['public.organization_symbols'].insertCount, 19);
    assert.strictEqual(recoveryPlan.tableAudits['public.organization_aliases'].insertCount, 1043);

    // No conflicts introduced
    assert.strictEqual(recoveryPlan.conflictsCount, 0);
  });

  test('9. Real PostgreSQL constraint error code simulation (23505 unique_violation, 23514 check_violation)', () => {
    // Test that the reconciler identifies operations that would trigger Postgres 23505/23514
    // 23505: duplicate key violates unique constraint uq_org_symbols_timeline
    const existingSymbol = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-PARTY-BJP',
      symbol_name: 'Lotus',
      valid_from: '1980-04-06',
      jurisdiction_scope: 'IN'
    };
    const incomingCollidingSymbol = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-PARTY-BJP',
      symbol_name: 'Lotus',
      valid_from: '1980-04-06',
      jurisdiction_scope: 'STATE_GJ' // different scope, but same (org, symbol, valid_from)
    };
    const audit = reconcileStage1Table('public.organization_symbols', [incomingCollidingSymbol], [existingSymbol]);
    // The reconciler matches the natural key and prevents a duplicate insert that would fail with 23505
    assert.strictEqual(audit.matchedCount, 1);
    assert.strictEqual(audit.insertCount, 0);

    // 23514: check_violation / trigger violation fn_validate_org_alias_temporal_invariants
    const existingAlias = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-PARTY-BJP',
      raw_lookup_key: 'bjp',
      jurisdiction_scope: 'IN',
      valid_from: '1980-01-01',
      valid_to: '2030-01-01'
    };
    const overlappingAliasOtherOrg = {
      id: crypto.randomUUID(),
      organization_id: 'ORG-PARTY-INC',
      raw_lookup_key: 'bjp',
      jurisdiction_scope: 'IN',
      valid_from: '2000-01-01',
      valid_to: '2025-01-01'
    };
    const aliasAudit = reconcileStage1Table('public.organization_aliases', [overlappingAliasOtherOrg], [existingAlias]);
    assert.strictEqual(aliasAudit.hasConflicts, true);
    assert.strictEqual(aliasAudit.insertCount, 0, 'Must not dispatch insert that would trigger 23514 in PostgreSQL');
  });

  test('10. Pre-seeded Migration 065 target reconciliation preserves 100% of target UUIDs without generating duplicate inserts', () => {
    // Generate simulated Migration 065 state where child tables have random UUIDs
    const canonical = reconcilePoliticalOrganizations();
    const childTables = new Set([
      'public.organization_relationships',
      'public.organization_multilingual_names',
      'public.organization_symbols',
      'public.organization_aliases'
    ]);
    const seededTarget = {};
    for (const [table, rows] of Object.entries(canonical.rowsByTable)) {
      if (childTables.has(table)) {
        seededTarget[table] = rows.map(r => ({
          ...r,
          id: crypto.randomUUID() // Different random UUIDs as produced by Migration 065
        }));
      } else {
        seededTarget[table] = rows.map(r => ({ ...r }));
      }
    }

    const plan = reconcileStage1Catalog(seededTarget);
    assert.strictEqual(plan.totalInserts, 0, 'Zero inserts needed against fully seeded target');
    assert.strictEqual(plan.totalPreserved, 1209, 'All 1,209 rows matched and preserved by natural key');
    assert.strictEqual(plan.conflictsCount, 0, 'Zero conflicts against canonical seed');
  });
});
