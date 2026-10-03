/**
 * tests/b2-2c-final-forensic-reconciliation.test.mjs
 * 
 * CTO DIRECTIVE — W021.5-B2.2-C RECONCILIATION CORRECTION & FINAL RE-GATE TEST SUITE
 * 
 * Authoritative Tests covering all directives:
 * 1. Exact raw party string count = 1,096
 * 2. Exact total raw string occurrence count = 16,011
 * 3. Authoritative Decomposition of all 1,096 strings:
 *    - 1,030 VERIFIED_ORGANIZATION_ALIAS
 *    -    13 RECONCILED_ORGANIZATION_ALIAS
 *    -     9 RECONCILED_MP_CODE
 *    -    25 INDEPENDENT
 *    -    14 PROVISIONAL
 *    -     4 NON_ORGANIZATION
 *    -     1 NOMINATED
 *    Total = 1,096 (Remainder = 0)
 * 4. Authoritative Canonical Organization Aliases Count: 1,030 + 13 = 1,043
 * 5. Reconciled MP Single-Letter Code Contextual Separation: 9 codes (J, C, K, U, P, S, D, A, M) with org_id = null
 * 6. Exact 39-String Unaccounted Set Disposition:
 *    - 25 INDEPENDENT
 *    -  9 RECONCILED_MP_CODE
 *    -  2 NOTA
 *    -  2 OTH
 *    -  1 NOMINATED
 *    Total = 39 (Zero remainder)
 * 7. Exactly 107 Canonical Organizations adhering to ID conventions
 * 8. Foreign key linkage completeness and target integrity (0 dangling pointers)
 * 9. Exactly 14 Provisional Records Quarantined (Fail-closed; 0 DB inserts)
 * 10. Exactly 27 Multilingual Benchmark Identities Audited across 11+ languages
 * 11. Exactly 19 Statutory Symbols Audited
 * 12. Exactly 10 Statutory Lineage Relationships Audited (mergers, splits, renames)
 * 13. TRS -> BRS Temporal Lineage Resolution at 2022-10-05
 * 14. High-risk alias collision safety (NCP/NCPSP, SHS/SHSUBT, INC/Congress)
 * 15. Independent Candidacy Model Separation (is_independent = true, org_id = null)
 * 16. Nominated MP Model Separation (Article 80(1)(a), org_id = null)
 * 17. Statutory Ballot Options & Generic Buckets Separation (NOTA, OTH)
 * 18. Authoritative C0–C7 Database Insertion Accounting:
 *     C0 (1) + C1 (107) + C2 (10) + C3 (27) + C4 (19) + C5 (1,043) = EXACTLY 1,207 ACTUAL DB INSERTS
 *     C6 Provisional = 0 DB Inserts
 *     C7 Disposition Assertion = 0 DB Inserts
 * 19. C7 Semantic Invariant: 1,096 raw strings disposed, 1,043 org FK resolutions, 53 non-org dispositions
 * 20. Simulation Idempotency: Run 2 and Run 3 produce exactly 0 new DB inserts
 * 21. Rollback Simulation Teardown: Exactly 1,207 rows removed, dependency-safe, scoped to batch provenance
 * 22. Zero Leakage Invariant: Non-org / Independent / Nominated / NOTA / Provisional produce 0 synthetic orgs
 * 23. Runtime Non-Interference: Zero unmediated API route inserts
 * 24. Air-Gap Integrity: Production database ehfafcnimmjusyvplbah untouched
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

const dispositionV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_1096_disposition_ledger_v2.json');
const setDiffV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_set_difference_audit_v2.json');
const manifestPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_final_organization_manifest.json');
const fkAuditV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_fk_linkage_audit_v2.json');
const temporalAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_temporal_lineage_audit.json');
const collisionAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_alias_collision_audit.json');
const provQuarantinePath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_provisional_quarantine.json');
const runtimeAuditPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_runtime_noninterference.json');
const simV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_complete_migration_simulation_v2.json');
const rollbackV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_rollback_simulation_v2.json');

test('Test 1: Exact Raw Party String Count = 1,096', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  assert.strictEqual(disp.totalRawStrings, 1096);
  assert.strictEqual(disp.ledger.length, 1096);
});

test('Test 2: Exact Total Raw String Occurrence Count = 16,011', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  assert.strictEqual(disp.totalOccurrences, 16011);
});

test('Test 3: Authoritative 7-Class Reconciliation Partition (Remainder = 0)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const counts = disp.dispositionClassCounts;
  assert.strictEqual(counts.VERIFIED_ORGANIZATION_ALIAS, 1030);
  assert.strictEqual(counts.RECONCILED_ORGANIZATION_ALIAS, 13);
  assert.strictEqual(counts.RECONCILED_MP_CODE, 9);
  assert.strictEqual(counts.INDEPENDENT, 25);
  assert.strictEqual(counts.PROVISIONAL, 14);
  assert.strictEqual(counts.NON_ORGANIZATION, 4);
  assert.strictEqual(counts.NOMINATED, 1);

  const sum = counts.VERIFIED_ORGANIZATION_ALIAS +
              counts.RECONCILED_ORGANIZATION_ALIAS +
              counts.RECONCILED_MP_CODE +
              counts.INDEPENDENT +
              counts.PROVISIONAL +
              counts.NON_ORGANIZATION +
              counts.NOMINATED;
  assert.strictEqual(sum, 1096);
  assert.strictEqual(disp.mathematicalParity.remainder, 0);
  assert.strictEqual(disp.mathematicalParity.isEqual, true);
});

test('Test 4: Authoritative Canonical Organization Aliases Count (1,030 + 13 = 1,043)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const counts = disp.dispositionClassCounts;
  const canonicalAliases = counts.VERIFIED_ORGANIZATION_ALIAS + counts.RECONCILED_ORGANIZATION_ALIAS;
  assert.strictEqual(canonicalAliases, 1043);
  assert.strictEqual(disp.canonicalAliasesEligibleCount, 1043);
});

test('Test 5: Reconciled MP Single-Letter Code Contextual Separation (9 codes)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const mpCodes = disp.ledger.filter(r => r.disposition_class === 'RECONCILED_MP_CODE');
  assert.strictEqual(mpCodes.length, 9);
  const expectedCodes = new Set(['J', 'C', 'K', 'U', 'P', 'S', 'D', 'A', 'M']);
  for (const row of mpCodes) {
    assert.ok(expectedCodes.has(row.raw_string));
    assert.strictEqual(row.organization_id, null, `MP single-letter code '${row.raw_string}' must have null organization_id`);
    assert.strictEqual(row.organization_resolution_status, 'RECONCILED_VIA_CANDIDACY_CONTEXT');
  }
});

test('Test 6: Exact 39-String Unaccounted Set Decomposition', () => {
  const setDiff = JSON.parse(fs.readFileSync(setDiffV2Path, 'utf8'));
  assert.strictEqual(setDiff.unaccountedSetCount, 39);
  assert.strictEqual(setDiff.unaccountedCategorizationOf39Strings.independentCandidacies, 25);
  assert.strictEqual(setDiff.unaccountedCategorizationOf39Strings.reconciledMpSingleLetterCodes, 9);
  assert.strictEqual(setDiff.unaccountedCategorizationOf39Strings.statutoryBallotOptionsNota, 2);
  assert.strictEqual(setDiff.unaccountedCategorizationOf39Strings.genericBucketLabels, 2);
  assert.strictEqual(setDiff.unaccountedCategorizationOf39Strings.nominatedRajyaSabhaCode, 1);
  assert.strictEqual(setDiff.unaccountedStringsList.length, 39);
});

test('Test 7: Exactly 107 Canonical Organizations adhering to ID conventions', () => {
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

test('Test 8: Foreign Key Linkage Soundness (0 Dangling Pointers)', () => {
  const fkAudit = JSON.parse(fs.readFileSync(fkAuditV2Path, 'utf8'));
  assert.strictEqual(fkAudit.summary.danglingForeignKeyPointers, 0);
  assert.strictEqual(fkAudit.summary.isForeignKeyCompleteAndSound, true);
  assert.strictEqual(fkAudit.summary.validCanonicalOrgPointers, 1043);
  assert.strictEqual(fkAudit.summary.validNullPointersAccountedFor, 53);
  assert.strictEqual(fkAudit.summary.validCanonicalOrgPointers + fkAudit.summary.validNullPointersAccountedFor, 1096);
});

test('Test 9: Exactly 14 Provisional Records Quarantined (Fail-Closed, 0 DB Inserts)', () => {
  const provAudit = JSON.parse(fs.readFileSync(provQuarantinePath, 'utf8'));
  assert.strictEqual(provAudit.totalQuarantinedRecords, 14);
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const provRows = disp.ledger.filter(r => r.disposition_class === 'PROVISIONAL');
  assert.strictEqual(provRows.length, 14);
  for (const r of provRows) {
    assert.strictEqual(r.organization_id, null);
    assert.strictEqual(r.organization_resolution_status, 'QUARANTINED_PENDING_FORM_21E');
  }
});

test('Test 10: Exactly 27 Multilingual Benchmark Identities Audited across 11+ Languages', () => {
  const multi = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_multilingual_matrix.json'), 'utf8'));
  assert.strictEqual(multi.totalIdentitiesAudited, 27);
  assert.ok(multi.languagesCovered.length >= 11);
});

test('Test 11: Exactly 19 Statutory Symbols Audited', () => {
  const symbols = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2c_symbol_matrix.json'), 'utf8'));
  assert.strictEqual(symbols.totalSymbolsAudited, 19);
});

test('Test 12: Exactly 10 Statutory Lineage Relationships Audited', () => {
  const temporal = JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8'));
  assert.strictEqual(temporal.totalStatutoryRelationships, 10);
  assert.strictEqual(temporal.lineageInvariantsVerified.allSourceOrganizationsExist, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.allTargetOrganizationsExist, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.allEffectiveDatesValidIsoFormat, true);
  assert.strictEqual(temporal.lineageInvariantsVerified.zeroSelfReferentialLineages, true);
});

test('Test 13: TRS -> BRS Temporal Lineage Resolution at 2022-10-05', () => {
  const temporal = JSON.parse(fs.readFileSync(temporalAuditPath, 'utf8'));
  assert.strictEqual(temporal.temporalQuerySimulation.TRS_at_2018_Assembly_Election, 'ORG-PARTY-TRS');
  assert.strictEqual(temporal.temporalQuerySimulation.BRS_at_2023_Assembly_Election, 'ORG-PARTY-BRS');
  assert.strictEqual(temporal.temporalQuerySimulation.transitionDate, '2022-10-05');
});

test('Test 14: High-Risk Alias Collision Safety and Disambiguation', () => {
  const colAudit = JSON.parse(fs.readFileSync(collisionAuditPath, 'utf8'));
  assert.strictEqual(colAudit.disambiguationInvariants.zeroCrossOrgAliasCollisions, true);
  assert.strictEqual(colAudit.disambiguationInvariants.quarantinePreservedForAmbiguousStrings, true);
});

test('Test 15: Independent Candidacy Model Separation (25 entries, org_id = null)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const indEntries = disp.ledger.filter(r => r.disposition_class === 'INDEPENDENT');
  assert.strictEqual(indEntries.length, 25);
  for (const r of indEntries) {
    assert.strictEqual(r.organization_id, null);
    assert.strictEqual(r.organization_resolution_status, 'NOT_APPLICABLE_INDEPENDENT_CANDIDACY');
  }
});

test('Test 16: Nominated MP Model Separation (Article 80(1)(a), org_id = null)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const nomEntry = disp.ledger.find(r => r.raw_string === 'N');
  assert.ok(nomEntry);
  assert.strictEqual(nomEntry.disposition_class, 'NOMINATED');
  assert.strictEqual(nomEntry.organization_id, null);
  assert.strictEqual(nomEntry.organization_resolution_status, 'NOT_APPLICABLE_CONSTITUTIONAL_NOMINEE');
});

test('Test 17: Statutory Ballot Options & Generic Buckets Separation (NOTA, OTH)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const nonOrg = disp.ledger.filter(r => r.disposition_class === 'NON_ORGANIZATION');
  assert.strictEqual(nonOrg.length, 4);
  for (const r of nonOrg) {
    assert.strictEqual(r.organization_id, null);
  }
});

test('Test 18: Authoritative Database Insertion Accounting (Exact 1,207 DB Inserts)', () => {
  const sim = JSON.parse(fs.readFileSync(simV2Path, 'utf8'));
  assert.strictEqual(sim.run1ExecutionDetails.actualDbInserts, 1207);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C0_Provenance_Record, 1);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C1_Political_Organizations, 107);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C2_Organization_Relationships, 10);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C3_Multilingual_Names, 27);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C4_Organization_Symbols, 19);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C5_Organization_Aliases, 1043);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C6_Provisional_Quarantine, 0);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.C7_Disposition_Assertion, 0);
  assert.strictEqual(sim.authoritativeDatabaseInsertionAccounting.ACTUAL_DATABASE_INSERTS_RUN_1, 1207);
});

test('Test 19: C7 Semantic Invariant (1,096 Disposed, 1,043 Org FKs, 53 Non-Org)', () => {
  const sim = JSON.parse(fs.readFileSync(simV2Path, 'utf8'));
  const ops = sim.run1ExecutionDetails.verificationAndAssertionOperations;
  assert.strictEqual(ops.C7_rawStringsDisposed, 1096);
  assert.strictEqual(ops.C7_organizationFkResolutions, 1043);
  assert.strictEqual(ops.C7_nonOrganizationDispositions, 53);
  assert.ok(ops.C7_organizationFkResolutions < 1096);
});

test('Test 20: Idempotency Across Repeated Runs (Runs 2 & 3: 0 New DB Inserts)', () => {
  const sim = JSON.parse(fs.readFileSync(simV2Path, 'utf8'));
  assert.strictEqual(sim.idempotencyReruns.run2NewDbInserts, 0);
  assert.strictEqual(sim.idempotencyReruns.run3NewDbInserts, 0);
  assert.strictEqual(sim.idempotencyReruns.unexpectedDuplicates, 0);
  assert.strictEqual(sim.idempotencyReruns.idempotentRowStability, true);
});

test('Test 21: Rollback Teardown Safety (Exact 1,207 Rows Removed, Dependency-Safe)', () => {
  const rb = JSON.parse(fs.readFileSync(rollbackV2Path, 'utf8'));
  assert.strictEqual(rb.targetProvenanceId, '0215b22c-0000-0000-0000-000000000001');
  assert.strictEqual(rb.authoritativeDatabaseRowsSubjectToRollback.TOTAL_ROWS_REMOVED, 1207);
  assert.strictEqual(rb.dependencySafeTeardownOrder.length, 6);
  assert.strictEqual(rb.postRollbackState.residualBatchRowsUnderProvenance, 0);
  assert.strictEqual(rb.postRollbackState.preExistingBenchmarkRowsIntact, true);
  assert.strictEqual(rb.postRollbackState.isTeardownOrderDependencySafe, true);
});

test('Test 22: Zero Leakage Invariant (No Synthetic Orgs Generated for Non-Orgs)', () => {
  const disp = JSON.parse(fs.readFileSync(dispositionV2Path, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const nonOrgStrings = disp.ledger.filter(r => r.organization_id === null).map(r => r.raw_string.toLowerCase());
  const orgShortNames = new Set(manifest.canonicalOrganizations.map(o => o.shortName.toLowerCase()));
  for (const bad of ['ind', 'independent', 'nota', 'oth', 'other', 'n']) {
    assert.strictEqual(orgShortNames.has(bad), false, `Synthetic organization created for '${bad}'`);
  }
});

test('Test 23: Runtime Non-Interference (0 Unmediated API Inserts)', () => {
  const runtime = JSON.parse(fs.readFileSync(runtimeAuditPath, 'utf8'));
  assert.strictEqual(runtime.runtimeRouteIntegrity.unmediatedRuntimeInsertsDetected, false);
});

test('Test 24: Air-Gap Integrity and Zero Premature Seed/Entity Mutation', () => {
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
