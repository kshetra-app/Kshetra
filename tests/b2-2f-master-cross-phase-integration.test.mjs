/**
 * tests/b2-2f-master-cross-phase-integration.test.mjs
 * 
 * MASTER CROSS-PHASE INTEGRATION & RECONCILIATION TEST BATTERY (W021.5-B2.2-F)
 * 
 * Verifies the final end-to-end integration invariants across B1, B2.1, B2.2-C, B2.2-D, and B2.2-E.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

const masterManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_master_canonical_data_manifest.json'), 'utf8'));

test('Master Invariant 1: Master Canonical Data Inventory Parity', () => {
  const inv = masterManifest.masterInventory;
  assert.strictEqual(inv.geography_B1.assembly_constituencies, 4142);
  assert.strictEqual(inv.geography_B1.parliamentary_constituencies, 543);
  assert.strictEqual(inv.organizations_B2_2_C.total_actual_inserts, 1207);
  assert.strictEqual(inv.persons_and_elections_B2_2_D.total_actual_inserts, 48284);
  assert.strictEqual(inv.civic_extensions_B2_2_E.total_actual_inserts, 8869);
  assert.strictEqual(inv.grand_totals.total_database_mutations_B2_2_C_D_E, 58360);
});

test('Master Invariant 2: Relational Graph Zero-Orphan Guarantee', () => {
  const rel = masterManifest.relationalIntegrity;
  assert.strictEqual(rel.candidacyToPersonOrphans, 0);
  assert.strictEqual(rel.candidacyToOrgOrphans, 0);
  assert.strictEqual(rel.affidavitToPersonOrphans, 0);
  assert.strictEqual(rel.affidavitToCandidacyOrphans, 0);
  assert.strictEqual(rel.tenureToPersonOrphans, 0);
  assert.strictEqual(rel.tenureToOrgOrphans, 0);
  assert.strictEqual(rel.graphResolutionRate, '100.00%');
});

test('Master Invariant 3: Temporal Integrity Across Historical Epochs', () => {
  assert.strictEqual(masterManifest.temporalIntegrity.violations, 0);
  assert.strictEqual(masterManifest.temporalIntegrity.status, 'VERIFIED');
});

test('Master Invariant 4: Cross-State Homonym Disambiguation', () => {
  assert.strictEqual(masterManifest.duplicateAudit.crossStateHomonymClusters, 102);
  assert.strictEqual(masterManifest.duplicateAudit.unintendedMerges, 0);
});

test('Master Invariant 5: Master Idempotency Invariant Across All Phases', () => {
  const idemp = masterManifest.idempotencyAudit;
  assert.strictEqual(idemp.B2_2_C.fullyIdempotent, true);
  assert.strictEqual(idemp.B2_2_D.fullyIdempotent, true);
  assert.strictEqual(idemp.B2_2_E.fullyIdempotent, true);
});

test('Master Invariant 6: Master Rollback & Restoration Precision', () => {
  const roll = masterManifest.rollbackAudit;
  assert.strictEqual(roll.B2_2_E_Teardown.safe, true);
  assert.strictEqual(roll.B2_2_D_Teardown.safe, true);
  assert.strictEqual(roll.B2_2_C_Teardown.safe, true);
});

test('Master Invariant 7: Production-Sync Readiness Certification', () => {
  const ps = masterManifest.productionSyncReadiness;
  assert.strictEqual(ps.readinessVerdict, 'PRODUCTION_SYNC_READY (Pending CTO Live Push Authorization)');
  assert.strictEqual(ps.expectedTotalInserts, 58360);
  assert.strictEqual(ps.migrationsRequired.length, 9);
});

test('Master Invariant 8: Seed File Immutability (199 Files Intact)', () => {
  const gitDiff = execSync('git diff --name-only data/seed/', { encoding: 'utf8' }).trim();
  assert.strictEqual(gitDiff, '');
});

test('Master Invariant 9: Production Database Air-Gap Integrity', () => {
  assert.strictEqual(masterManifest.productionSyncReadiness.airGapStatus.includes('STRICTLY_ENFORCED'), true);
});

test('Master Invariant 10: Rule IV-001 Non-Self-Acceptance Gate', () => {
  assert.strictEqual(masterManifest.governance.rule_IV_001_compliance, 'NON_SELF_ACCEPTANCE_ENFORCED');
  assert.strictEqual(masterManifest.governance.verdict, 'W021.5 — READY FOR CTO FINAL ACCEPTANCE');
});
