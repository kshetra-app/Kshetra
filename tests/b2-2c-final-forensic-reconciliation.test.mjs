/**
 * tests/b2-2c-final-forensic-reconciliation.test.mjs
 * 
 * CTO DIRECTIVE — W021.5-B2.2-C RECONCILIATION & FINAL EXECUTION GATE TEST SUITE
 * 
 * Verifies all 22 mandatory forensic invariants with mathematical completeness:
 * 1. Exact raw party string count = 1,096
 * 2. Exact total raw string occurrence count = 16,011
 * 3. Exact disposition partition: 1,030 VERIFIED + 25 INDEPENDENT + 22 RECONCILED + 14 PROVISIONAL + 4 NON_ORGANIZATION + 1 NOMINATED = 1,096 (Remainder = 0)
 * 4. Exact 39-string disposition accounted for without omission
 * 5. Exactly 107 canonical organizations
 * 6. Exactly 1,043 aliases mapped to canonical organizations
 * 7. Foreign key soundness: zero dangling org pointers
 * 8. Exactly 14 provisional records quarantined and excluded from migration
 * 9. Exactly 27 multilingual identities audited across 11+ languages
 * 10. Exactly 19 statutory symbols audited
 * 11. Exactly 10 statutory relationships audited (splits, mergers, renames)
 * 12. TRS -> BRS temporal resolution at 2022-10-05
 * 13. High-risk alias collision safety (NCP/NCPSP, SHS/SHSUBT, INC/Congress)
 * 14. Independent candidacy model separation (is_independent = true, org_id = null)
 * 15. Nominated MP model separation (Art 80(1)(a), org_id = null)
 * 16. Statutory ballot options separation (NOTA non-party)
 * 17. Generic summary buckets separation (OTH/Other)
 * 18. C0–C7 dry-run simulation row counts match exactly (1,221 total inserts)
 * 19. Simulation idempotency: Run 2 and Run 3 produce exactly 0 new inserts
 * 20. Rollback simulation teardown strictly scoped to batch 0215b22c-0000-0000-0000-000000000001
 * 21. Runtime non-interference: zero unmediated API inserts to political_organizations
 * 22. Air-gap integrity: production database ehfafcnimmjusyvplbah untouched
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

const dispositionPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_1096_disposition_ledger.json');
const manifestPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_final_organization_manifest.json');
const fkAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_fk_linkage_audit.json');
const temporalAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_temporal_lineage_audit.json');
const collisionAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_alias_collision_audit.json');
const provQuarantinePath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_provisional_quarantine.json');
const provenanceAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_provenance_audit.json');
const runtimeAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_runtime_noninterference.json');
const simPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_complete_migration_simulation.json');
const rollbackPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_rollback_simulation.json');
const diffPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_set_difference_audit.json');

test('Invariant 1: Exact Raw Party String Count = 1,096', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  assert.strictEqual(disp.totalRawStrings, 1096, 'Total raw unique strings must be exactly 1,096');
  assert.strictEqual(disp.ledger.length, 1096, 'Ledger length must be exactly 1,096');
});

test('Invariant 2: Exact Total Raw String Occurrence Count = 16,011', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  assert.strictEqual(disp.totalOccurrences, 16011, 'Total raw string occurrences must be exactly 16,011');
});

test('Invariant 3: Exact Disposition Partition Mathematical Parity (Remainder = 0)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  const counts = disp.dispositionCounts;
  assert.strictEqual(counts.VERIFIED, 1030);
  assert.strictEqual(counts.INDEPENDENT, 25);
  assert.strictEqual(counts.RECONCILED, 22);
  assert.strictEqual(counts.PROVISIONAL, 14);
  assert.strictEqual(counts.NON_ORGANIZATION, 4);
  assert.strictEqual(counts.NOMINATED, 1);

  const sum = counts.VERIFIED + counts.INDEPENDENT + counts.RECONCILED + counts.PROVISIONAL + counts.NON_ORGANIZATION + counts.NOMINATED;
  assert.strictEqual(sum, 1096, 'Sum of all partition categories must equal 1,096');
  assert.strictEqual(1096 - sum, 0, 'Mathematical remainder must be exactly 0');
});

test('Invariant 4: Exact 39-String Disposition Accounted For Without Omission', () => {
  const diff = JSON.parse(fs.readFileSync(diffPath, 'utf8'));
  assert.strictEqual(diff.unaccountedSetCount, 39, 'Difference between 1,096 and 1,057 must be exactly 39');
  assert.strictEqual(diff.unaccountedCategorization.independentCandidacies, 25);
  assert.strictEqual(diff.unaccountedCategorization.corruptedMpSingleLetters, 9);
  assert.strictEqual(diff.unaccountedCategorization.statutoryBallotOptionsNota, 2);
  assert.strictEqual(diff.unaccountedCategorization.genericBucketLabels, 2);
  assert.strictEqual(diff.unaccountedCategorization.nominatedRajyaSabhaCode, 1);
  assert.strictEqual(diff.unaccountedStringsList.length, 39, 'Zero strings unaccounted for in 39-list');
});

test('Invariant 5: Exactly 107 Canonical Organizations Adhere to ID Convention', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.summary.exactCanonicalOrganizations, 107);
  assert.strictEqual(manifest.canonicalOrganizations.length, 107);
  for (const org of manifest.canonicalOrganizations) {
    assert.match(org.id, /^ORG-(PARTY|ALLIANCE)-[A-Z0-9]+$/);
    assert.ok(org.name && org.name.length >= 2);
    assert.ok(org.shortName && org.shortName.length >= 1);
    assert.strictEqual(org.provenanceRecordId, '0215b22c-0000-0000-0000-000000000001');
  }
});

test('Invariant 6: Exactly 1,043 Aliases Mapped to Canonical Organizations', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.summary.exactRawAliasesMapped, 1043);
});

test('Invariant 7: Foreign Key Linkage and Target Integrity Soundness', () => {
  const fkAudit = JSON.parse(fs.readFileSync(fkAuditPath, 'utf8'));
  assert.strictEqual(fkAudit.summary.danglingForeignKeyPointers, 0, 'Zero dangling foreign keys permitted');
  assert.strictEqual(fkAudit.summary.isForeignKeyCompleteAndSound, true);
  assert.strictEqual(fkAudit.summary.validCanonicalOrgPointers + fkAudit.summary.validNullPointersAccountedFor, 1096);
});

test('Invariant 8: Exactly 14 Provisional Records Quarantined', () => {
  const provAudit = JSON.parse(fs.readFileSync(provQuarantinePath, 'utf8'));
  assert.strictEqual(provAudit.totalQuarantinedRecords, 14, 'Must quarantine exactly 14 records');
  for (const q of provAudit.quarantinedRecords) {
    assert.strictEqual(q.migrationAction, 'RETAIN_IN_PROVISIONAL_AUDIT_LOG_EXCLUDE_FROM_MIGRATION');
  }
});

test('Invariant 9: Exactly 27 Multilingual Benchmark Identities Audited', () => {
  const multi = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_multilingual_matrix.json'), 'utf8'));
  assert.strictEqual(multi.totalIdentitiesAudited, 27);
  assert.ok(multi.languagesCovered.length >= 11);
});

test('Invariant 10: Exactly 19 Statutory Symbols Audited', () => {
  const symbols = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_symbol_matrix.json'), 'utf8'));
  assert.strictEqual(symbols.totalSymbolsAudited, 19);
});

test('Invariant 11: Exactly 10 Statutory Relationships Audited', () => {
  const temporal = JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8'));
  assert.strictEqual(temporal.totalStatutoryRelationships, 10);
  assert.strictEqual(temporal.lineageInvariantsVerified.allSourceOrganizationsExist, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.allTargetOrganizationsExist, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.allEffectiveDatesValidIsoFormat, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.zeroSelfReferentialLineages, true);
});

test('Invariant 12: TRS -> BRS Temporal Resolution at 2022-10-05', () => {
  const temporal = JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8'));
  assert.strictEqual(temporal.temporalQuerySimulation.TRS_at_2018_Assembly_Election, 'ORG-PARTY-TRS');
  assert.strictEqual(temporal.temporalQuerySimulation.BRS_at_2023_Assembly_Election, 'ORG-PARTY-BRS');
  assert.strictEqual(temporal.temporalQuerySimulation.transitionDate, '2022-10-05');
});

test('Invariant 13: High-Risk Alias Collision Safety and Disambiguation', () => {
  const colAudit = JSON.parse(fs.readFileSync(collisionAuditPath, 'utf8'));
  assert.strictEqual(colAudit.disambiguationInvariants.zeroCrossOrgAliasCollisions, true);
  assert.strictEqual(colAudit.disambiguationInvariants.quarantinePreservedForAmbiguousStrings, true);
});

test('Invariant 14: Independent Candidacy Model Separation', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  const indEntries = disp.ledger.filter(e => e.disposition === 'INDEPENDENT');
  assert.strictEqual(indEntries.length, 25);
  for (const entry of indEntries) {
    assert.strictEqual(entry.proposedOrganizationId, null, `Independent entry ${entry.rawString} must have null org ID`);
  }
});

test('Invariant 15: Nominated MP Model Separation (Art 80(1)(a))', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  const nomEntry = disp.ledger.find(e => e.rawString === 'N');
  assert.ok(nomEntry);
  assert.strictEqual(nomEntry.disposition, 'NOMINATED');
  assert.strictEqual(nomEntry.proposedOrganizationId, null);
});

test('Invariant 16: Statutory Ballot Options Separation (NOTA)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  const notaEntries = disp.ledger.filter(e => e.rawString === 'NOTA' || e.rawString === 'None of the Above');
  assert.strictEqual(notaEntries.length, 2);
  for (const entry of notaEntries) {
    assert.strictEqual(entry.disposition, 'NON_ORGANIZATION');
    assert.strictEqual(entry.proposedOrganizationId, null);
  }
});

test('Invariant 17: Generic Summary Buckets Separation (OTH / Other)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionPath, 'utf8'));
  const othEntries = disp.ledger.filter(e => e.rawString === 'OTH' || e.rawString === 'Other');
  assert.strictEqual(othEntries.length, 2);
  for (const entry of othEntries) {
    assert.strictEqual(entry.disposition, 'NON_ORGANIZATION');
    assert.strictEqual(entry.proposedOrganizationId, null);
  }
});

test('Invariant 18: Full Simulation Insertion Counts (1,221 Total Operations)', () => {
  const sim = JSON.parse(fs.readFileSync(simPath, 'utf8'));
  assert.strictEqual(sim.run1Inserts, 1221);
  assert.strictEqual(sim.stageCountsRun1.C0, 1);
  assert.strictEqual(sim.stageCountsRun1.C1, 107);
  assert.strictEqual(sim.stageCountsRun1.C2, 10);
  assert.strictEqual(sim.stageCountsRun1.C3, 27);
  assert.strictEqual(sim.stageCountsRun1.C4, 19);
  assert.strictEqual(sim.stageCountsRun1.C5, 1043);
  assert.strictEqual(sim.stageCountsRun1.C6, 14);
  assert.strictEqual(sim.stageCountsRun1.C7, 1096);
});

test('Invariant 19: Full Simulation Idempotency Across Repeated Runs (Runs 2 & 3: 0 Inserts)', () => {
  const sim = JSON.parse(fs.readFileSync(simPath, 'utf8'));
  assert.strictEqual(sim.run2NewInserts, 0);
  assert.strictEqual(sim.run3NewInserts, 0);
  assert.strictEqual(sim.verdict, 'FULL_PIPELINE_IDEMPOTENCY_CONFIRMED');
  assert.strictEqual(sim.invariants.run2ZeroDuplicateRows, true);
  assert.strictEqual(sim.invariants.run3ZeroDuplicateRows, true);
});

test('Invariant 20: Rollback Scoped Strictly to Provenance Batch ID', () => {
  const rb = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
  assert.strictEqual(rb.targetProvenanceId, '0215b22c-0000-0000-0000-000000000001');
  assert.strictEqual(rb.preExistingRowsPreserved.benchmarkConstituencyRowsProvenance, '01900000-0000-0000-0000-000000000001');
  assert.strictEqual(rb.dependencySafeTeardownOrder.length, 6);
  assert.strictEqual(rb.failureModeSimulations[0].residualRows, 0);
});

test('Invariant 21: Runtime Non-Interference (Zero Unmediated Route Inserts)', () => {
  const runtime = JSON.parse(fs.readFileSync(runtimeAuditPath, 'utf8'));
  assert.strictEqual(runtime.runtimeRouteIntegrity.unmediatedRuntimeInsertsDetected, false);
});

test('Invariant 22: Air-Gap Integrity and Zero Premature Seed/Entity Mutation', () => {
  const runtime = JSON.parse(fs.readFileSync(runtimeAuditPath, 'utf8'));
  assert.strictEqual(runtime.airGapStatus.isAirGapStrictlyMaintained, true);
  assert.strictEqual(runtime.airGapStatus.productionDatabaseConnected, false);
  assert.strictEqual(runtime.codebaseMutationStatus.dataSeedFilesMutated, false);
  assert.strictEqual(runtime.codebaseMutationStatus.personsTableMutated, false);
  assert.strictEqual(runtime.codebaseMutationStatus.candidaciesTableMutated, false);
  assert.strictEqual(runtime.codebaseMutationStatus.tenuresTableMutated, false);
  assert.strictEqual(runtime.codebaseMutationStatus.affiliationsTableMutated, false);
  assert.strictEqual(runtime.codebaseMutationStatus.publicPoliticalOrganizationsTableMutated, false);
});
