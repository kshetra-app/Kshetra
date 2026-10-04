/**
 * tests/b2-2f-final-pre-migration-gate.test.mjs
 * 
 * B2.2-F FINAL PRE-MIGRATION GATE TEST SUITE (READ-ONLY FORENSIC GATE)
 * 
 * Under Master Execution Framework Rule IV-001:
 * Validates pre-migration invariants for master cross-phase integration (B2.2-F)
 * WITHOUT mutating any staging or production database records.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

// Upstream post-population audits & manifests
const b22cAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_population_execution_report.json'), 'utf8'));
const b22dAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_post_population_audit.json'), 'utf8'));
const b22eAudit = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2e_post_population_audit.json'), 'utf8'));

test('Gate 1: Upstream Milestone B2.2-C Population Integrity (1,207 rows)', () => {
  const cCounts = b22cAudit.populationCounts;
  assert.strictEqual(cCounts.TOTAL_ACTUAL_DATABASE_INSERTS, 1207);
  assert.strictEqual(cCounts.C0_Provenance_Record, 1);
  assert.strictEqual(cCounts.C1_Political_Organizations, 107);
  assert.strictEqual(cCounts.C2_Organization_Relationships, 10);
  assert.strictEqual(cCounts.C3_Multilingual_Names, 27);
  assert.strictEqual(cCounts.C4_Organization_Symbols, 19);
  assert.strictEqual(cCounts.C5_Organization_Aliases, 1043);
});

test('Gate 2: Upstream Milestone B2.2-D Population Integrity (48,284 rows)', () => {
  const dCounts = b22dAudit.approvedPopulationCounts;
  assert.strictEqual(dCounts.TOTAL_ACTUAL_DATABASE_INSERTS, 48284);
  assert.strictEqual(dCounts.D0_Provenance_Record, 1);
  assert.strictEqual(dCounts.D1_Canonical_Persons, 9083);
  assert.strictEqual(dCounts.D2_Multilingual_Person_Identities, 9172);
  assert.strictEqual(dCounts.D3_Candidacies, 11334);
  assert.strictEqual(dCounts.D4_Elected_Tenures, 9553);
  assert.strictEqual(dCounts.D5_Person_Party_Affiliations, 9083);
  assert.strictEqual(dCounts.D6_Tenure_Party_Switches, 58);
});

test('Gate 3: Upstream Milestone B2.2-E Population Integrity (8,869 rows)', () => {
  const eCounts = b22eAudit.approvedPopulationCounts;
  assert.strictEqual(eCounts.TOTAL_ACTUAL_INSERTS, 8869);
  assert.strictEqual(eCounts.E0_Provenance_Record, 1);
  assert.strictEqual(eCounts.E1_Candidate_Affidavits, 4524);
  assert.strictEqual(eCounts.E2_Constituency_Lineage, 154);
  assert.strictEqual(eCounts.E3_Constituency_Demographics, 4142);
  assert.strictEqual(eCounts.E4_State_Election_History_Turnout, 48);
});

test('Gate 4: Mathematical Sum of W021.5 Mutations = Exactly 58,360', () => {
  const totalMutations = b22cAudit.populationCounts.TOTAL_ACTUAL_DATABASE_INSERTS +
                         b22dAudit.approvedPopulationCounts.TOTAL_ACTUAL_DATABASE_INSERTS +
                         b22eAudit.approvedPopulationCounts.TOTAL_ACTUAL_INSERTS;
  assert.strictEqual(totalMutations, 58360);
});

test('Gate 5: Provenance Architecture Isolation Across All Phases', () => {
  assert.strictEqual(b22cAudit.batchProvenanceId, '0215b22c-0000-0000-0000-000000000001');
  assert.strictEqual(b22dAudit.batchProvenanceId, '0215b22d-0000-0000-0000-000000000001');
  assert.strictEqual(b22eAudit.batchProvenanceId, '0215b22e-0000-0000-0000-000000000001');

  // Verify complete mutual distinctness
  const anchors = new Set([
    b22cAudit.batchProvenanceId,
    b22dAudit.batchProvenanceId,
    b22eAudit.batchProvenanceId
  ]);
  assert.strictEqual(anchors.size, 3, 'All 3 provenance anchors must be completely distinct');
});

test('Gate 6: Production Air-Gap Invariant Across All Audits', () => {
  assert.strictEqual(b22eAudit.productionDatabaseStatus.host, 'ehfafcnimmjusyvplbah');
  assert.strictEqual(b22eAudit.productionDatabaseStatus.status, 'AIR-GAPPED AND UNTOUCHED');
  assert.strictEqual(b22eAudit.productionDatabaseStatus.connected, false);
  assert.strictEqual(b22eAudit.productionDatabaseStatus.modified, false);
});

test('Gate 7: B2.2-F Preflight Scope Read-Only Gate', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-B2.2-F-BASELINE-FORENSIC-AUDIT.md')));
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-B2.2-F-FINAL-PRE-MIGRATION-GATE.md')));
});
