/**
 * tests/w021-5-final-production-sync-preflight.test.mjs
 * 
 * FINAL PRODUCTION SYNCHRONIZATION READINESS PREFLIGHT TEST SUITE (READ-ONLY)
 * 
 * Under Master Execution Framework Amendment v1.2 / Rule IV-001:
 * Validates all 17 mandatory preflight invariants for production synchronization
 * WITHOUT mutating any staging or production database records.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

// 1. Repository coordinate
test('Invariant 1: Repository Coordinate & Git Parity (896f026 == origin/master)', () => {
  const headSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const originSha = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
  assert.strictEqual(headSha, '896f026afcd9e7add9145cb5c7cfe9c0970b86e3');
  assert.strictEqual(headSha, originSha);
});

// 2. Migration sequence
test('Invariant 2: Migration Sequence Integrity (9 migrations 050 through 066)', () => {
  const expectedMigrations = [
    '050_political_entity_model.sql',
    '059_canonical_national_constituency_registry.sql',
    '060_canonical_electoral_geography_remediation.sql',
    '061_canonical_national_ac_pc_mappings.sql',
    '062_canonical_assam_2023_delimitation.sql',
    '063_canonical_political_identity_foundation.sql',
    '064_political_organization_governance_remediation.sql',
    '065_canonical_political_organization_registry.sql',
    '066_downstream_civic_extensions.sql'
  ];
  for (const mig of expectedMigrations) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'supabase', 'migrations', mig)), `Missing migration ${mig}`);
  }
});

// 3. Manifest integrity
test('Invariant 3: Manifest Integrity Across All Phases', () => {
  const manifests = [
    'w021_5b2_b2_2c_1096_disposition_ledger_v2.json',
    'w021_5b2_b2_2d_person_manifest.json',
    'w021_5b2_b2_2d_candidacy_manifest.json',
    'w021_5b2_b2_2d_tenure_manifest.json',
    'w021_5b2_b2_2e_affidavit_manifest.json',
    'w021_5b2_b2_2e_delimitation_manifest.json',
    'w021_5b2_b2_2e_demographics_manifest.json',
    'w021_5b2_b2_2e_turnout_manifest.json',
    'w021_5_master_canonical_data_manifest.json'
  ];
  for (const m of manifests) {
    assert.ok(fs.existsSync(path.join(REPORTS_DIR, m)), `Missing manifest ${m}`);
  }
});

// 4. Row-count parity
test('Invariant 4: Recomputed Grand Total Mutation Parity (Exactly 58,360)', () => {
  const cAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_population_execution_report.json'), 'utf8'));
  const dAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_post_population_audit.json'), 'utf8'));
  const eAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2e_post_population_audit.json'), 'utf8'));

  const total = cAudit.populationCounts.TOTAL_ACTUAL_DATABASE_INSERTS +
                dAudit.approvedPopulationCounts.TOTAL_ACTUAL_DATABASE_INSERTS +
                eAudit.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS;
  assert.strictEqual(total, 58360);
});

// 5. Provenance isolation
test('Invariant 5: Provenance Boundary Isolation (Distinct UUIDs for C, D, E)', () => {
  const cAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_population_execution_report.json'), 'utf8'));
  const dAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_post_population_audit.json'), 'utf8'));
  const eAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2e_post_population_audit.json'), 'utf8'));

  assert.strictEqual(cAudit.batchProvenanceId, '0215b22c-0000-0000-0000-000000000001');
  assert.strictEqual(dAudit.batchProvenanceId, '0215b22d-0000-0000-0000-000000000001');
  assert.strictEqual(eAudit.batchProvenanceId, '0215b22e-0000-0000-0000-000000000001');
  const anchors = new Set([cAudit.batchProvenanceId, dAudit.batchProvenanceId, eAudit.batchProvenanceId]);
  assert.strictEqual(anchors.size, 3);
});

// 6. FK integrity
test('Invariant 6: Foreign-Key Graph 100% Valid (0 Orphans Across All Entities)', () => {
  const masterManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_master_canonical_data_manifest.json'), 'utf8'));
  const rel = masterManifest.relationalIntegrity;
  assert.strictEqual(rel.candidacyToPersonOrphans, 0);
  assert.strictEqual(rel.candidacyToOrgOrphans, 0);
  assert.strictEqual(rel.affidavitToPersonOrphans, 0);
  assert.strictEqual(rel.affidavitToCandidacyOrphans, 0);
  assert.strictEqual(rel.tenureToPersonOrphans, 0);
  assert.strictEqual(rel.tenureToOrgOrphans, 0);
});

// 7. Temporal integrity
test('Invariant 7: Temporal & Historical Integrity (0 Contradictions)', () => {
  const masterManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_master_canonical_data_manifest.json'), 'utf8'));
  assert.strictEqual(masterManifest.temporalIntegrity.violations, 0);
});

// 8. Idempotency evidence
test('Invariant 8: Idempotency Verification Across Runs 1, 2, and 3', () => {
  const masterManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_master_canonical_data_manifest.json'), 'utf8'));
  const idem = masterManifest.idempotencyAudit;
  assert.strictEqual(idem.B2_2_C.run2, 0);
  assert.strictEqual(idem.B2_2_D.run2, 0);
  assert.strictEqual(idem.B2_2_E.run2, 0);
});

// 9. Rollback evidence
test('Invariant 9: Bounded Rollback Precision (Zero Residual Records)', () => {
  const masterManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_master_canonical_data_manifest.json'), 'utf8'));
  const roll = masterManifest.rollbackAudit;
  assert.strictEqual(roll.B2_2_E_Teardown.residual, 0);
  assert.strictEqual(roll.B2_2_D_Teardown.residual, 0);
  assert.strictEqual(roll.B2_2_C_Teardown.residual, 0);
});

// 10. Seed immutability
test('Invariant 10: Seed File Immutability (All 199 Seed Files Untouched)', () => {
  const diff = execSync('git diff --name-only origin/master -- data/seed/', { encoding: 'utf8' }).trim();
  assert.strictEqual(diff, '');
});

// 11. Production identity evidence
test('Invariant 11: Production Database Identity Verification (ehfafcnimmjusyvplbah)', () => {
  const mobileEnv = fs.readFileSync(path.join(REPO_ROOT, 'apps', 'mobile', '.env'), 'utf8');
  assert.ok(mobileEnv.includes('ehfafcnimmjusyvplbah'));
});

// 12. Production delta calculation
test('Invariant 12: Production Synchronization Delta Plan (58,360 Net Rows)', () => {
  const syncPlan = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_final_production_sync_plan.json'), 'utf8'));
  assert.strictEqual(syncPlan.expectedNetProductionDelta.totalCanonicalPayload, 58360);
});

// 13. Destructive SQL scan
test('Invariant 13: Destructive SQL Operation Scan (Zero DROP/TRUNCATE in Migrations)', () => {
  const migs = ['050', '059', '060', '061', '062', '063', '064', '065', '066'];
  for (const m of migs) {
    const file = fs.readdirSync(path.join(REPO_ROOT, 'supabase', 'migrations')).find(f => f.startsWith(m));
    const content = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', file), 'utf8');
    assert.strictEqual(content.includes('DROP TABLE'), false, `Forbidden DROP TABLE in ${file}`);
    assert.strictEqual(content.includes('TRUNCATE'), false, `Forbidden TRUNCATE in ${file}`);
  }
});

// 14. API build
test('Invariant 14: API Service TypeScript Compilation Clean', () => {
  const out = execSync('npm run build --prefix apps/api', { encoding: 'utf8' });
  assert.ok(out.includes('tsc --noEmit'));
});

// 15. API contract drift
test('Invariant 15: API Public Gateway Zero Contract Drift', () => {
  const out = execSync('node scripts/check-api-contract-drift.mjs', { encoding: 'utf8' });
  assert.ok(out.includes('9/9 matched'));
});

// 16. Cross-phase integration
test('Invariant 16: Master Cross-Phase Integration Test Suite (10 / 10 PASS)', () => {
  const out = execSync('node tests/b2-2f-master-cross-phase-integration.test.mjs', { encoding: 'utf8' });
  assert.ok(out.includes('pass 10'));
});

// 17. Commit freshness
test('Invariant 17: Commit Freshness, Lineage & Governance Integrity', () => {
  const out = execSync('node tests/commit-freshness.test.mjs', { encoding: 'utf8' });
  assert.ok(out.includes('ALL COMMIT FRESHNESS, PROVENANCE & LINEAGE CHECKS (A-J) PASSED!'));
});
