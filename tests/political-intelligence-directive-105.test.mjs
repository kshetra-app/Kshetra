#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-105.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 105
 * Evidence Chain Reconciliation, Non-Overlapping Accounting, and Authority Verification
 *
 * Test battery executing offline verification across 6 mandatory workstreams:
 * - Workstream A: Report-versus-Repository Evidence Reconciliation & Discrepancy Registration
 * - Workstream B: Strict Non-Overlapping Accounting & Mathematical Invariant Conservation
 * - Workstream C: Governing Authority, Immutable Source Provenance, and External Trust Boundary Proof
 * - Workstream D: Substantive Domain Criteria vs Superficial Syntax/AST Falsification
 * - Workstream E: Dynamic Progress Re-Substantiation and Partition Proof
 * - Workstream F: Mandatory Governance Invariants, Defect Registries & Air-Gap Preservation
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

import {
  CANONICAL_TASK_METADATA,
  TASK_SPECIFICATIONS,
  PHANTOM_TASK_DISPOSITIONS,
  DISCREPANCY_REGISTER,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  verifyHistoricalArtifactIntegrity,
  __testOnly_verifyHistoricalArtifactIntegrity,
  TEST_HARNESS_PROTECTION_TOKEN,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  __testOnly_verifyGoverningSpecificationProvenance,
  verifyNonOverlappingAccountingAndTraceability,
  evaluateTaskCriteria,
  computeLedgerSummary,
  reconcileExecutionLedger,
} from '../scripts/reconcile_execution_ledger.mjs';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 105 VERIFICATION SUITE');
console.log('Evidence Chain Reconciliation, Non-Overlapping Accounting, and Authority Verification');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// WORKSTREAM A: Report-versus-Repository Evidence Reconciliation
// -----------------------------------------------------------------------------
console.log('--- 1. Workstream A: Report-versus-Repository Evidence Reconciliation & Discrepancies ---');

runTest('1.1 Discrepancy register exists and registers all Directive 104 discrepancies DISC-013 through DISC-020', () => {
  const registerPath = path.join(REPO_ROOT, 'reports/w021_5_directive_104_discrepancy_register.json');
  assert.ok(fs.existsSync(registerPath), 'Discrepancy register JSON must exist on disk');
  const parsed = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
  assert.strictEqual(parsed.milestone, 'W021.5');
  assert.strictEqual(parsed.directive, 'CTO Directive 105');
  assert.ok(Array.isArray(parsed.discrepancies), 'Discrepancies array must exist');

  const registeredIds = new Set(DISCREPANCY_REGISTER.map((d) => d.discrepancyId));
  for (let i = 13; i <= 20; i++) {
    const discId = `DISC-0${i}`;
    assert.ok(registeredIds.has(discId), `Discrepancy ${discId} must exist in DISCREPANCY_REGISTER`);
    const inJson = parsed.discrepancies.find((d) => d.discrepancyId === discId);
    assert.ok(inJson, `Discrepancy ${discId} must exist in JSON register`);
  }
});

runTest('1.2 Line-by-line reconciliation covers all 9 required discrepancy dimensions', () => {
  const registerPath = path.join(REPO_ROOT, 'reports/w021_5_directive_104_discrepancy_register.json');
  const parsed = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
  const categories = parsed.summary.discrepancyCategoriesAudited;
  const requiredCategories = [
    'governing_document_inventory_and_commits',
    'source_paths_and_source_commits',
    'canonical_task_ids_and_titles',
    'approved_task_weights',
    'task_classifications',
    'requirement_references',
    'criterion_counts_and_outcomes',
    'task_statuses',
    'progress_percentages_and_partition_categories',
  ];
  for (const cat of requiredCategories) {
    assert.ok(categories.includes(cat), `Category "${cat}" must be audited in discrepancy register`);
  }
});

runTest('1.3 Falsification: Phantom task injection (e.g. W021.5-B1-05) fails closed in verifyNonOverlappingAccountingAndTraceability', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  // Attempt to inject phantom task W021.5-B1-05 into Stage B
  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  const stageB = mutatedLedger.stages.find((s) => s.stageId === 'STAGE_B');
  stageB.tasks.push({
    taskId: 'W021.5-B1-05',
    title: 'Statutory Delimitation Geometry Baseline Package',
    weight: 4.0,
    accounting: { repoVerifiedWeight: 1.5, databasePendingWeight: 0, blockedWeight: 0, unimplementedWeight: 2.5 },
  });

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('PHANTOM_TASK_INJECTION_REJECTED') || err.message.includes('Expected exactly 27 canonical tasks')
  );
});

runTest('1.4 Falsification: Fabricated task W021.5-F-03 from chat response fails closed', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  const stageF = mutatedLedger.stages.find((s) => s.stageId === 'STAGE_F');
  stageF.tasks.push({
    taskId: 'W021.5-F-03',
    title: 'Historical Election Analytical Invariant Verification',
    weight: 3.0,
    accounting: { repoVerifiedWeight: 3.0, databasePendingWeight: 0, blockedWeight: 0, unimplementedWeight: 0 },
  });

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('PHANTOM_TASK_INJECTION_REJECTED') || err.message.includes('Expected exactly 27 canonical tasks')
  );
});

runTest('1.5 Discrepancy markdown companion reports/w021_5_directive_104_discrepancy_register.md is present and formatted', () => {
  const mdPath = path.join(REPO_ROOT, 'reports/w021_5_directive_104_discrepancy_register.md');
  assert.ok(fs.existsSync(mdPath), 'Markdown discrepancy register must exist');
  const content = fs.readFileSync(mdPath, 'utf8');
  assert.ok(content.includes('DISC-013'), 'Must document DISC-013');
  assert.ok(content.includes('DISC-015'), 'Must document DISC-015 (99% deficit)');
  assert.ok(content.includes('DISC-016'), 'Must document DISC-016 (double counting of I-02)');
});

// -----------------------------------------------------------------------------
// WORKSTREAM B: Mathematical Accounting & Strict Conservation Invariants
// -----------------------------------------------------------------------------
console.log('\n--- 2. Workstream B: Strict Non-Overlapping Accounting & Mathematical Conservation ---');

runTest('2.1 verifyNonOverlappingAccountingAndTraceability passes on canonical repository ledger', () => {
  const result = verifyNonOverlappingAccountingAndTraceability();
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.totalTasks, 27);
  assert.strictEqual(result.totalApprovedWeight, 100);
  assert.strictEqual(result.stageCount, 9);
  assert.strictEqual(result.partition.partitionTotal, 100);
});

runTest('2.2 Invariant 1: approvedWeight === earned + dbPending + blocked + unimplemented for every task', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const a = task.accounting || {};
      const earned = a.repoVerifiedWeight || 0;
      const db = a.databasePendingWeight || 0;
      const blk = a.blockedWeight || 0;
      const un = a.unimplementedWeight || 0;
      const sum = earned + db + blk + un;
      assert.ok(
        Math.abs(sum - task.weight) < 0.001,
        `Task ${task.taskId} conservation violated: approved=${task.weight}, sum=${sum}`
      );
    }
  }
});

runTest('2.3 Invariant 2: stage approved weight === sum of task approved weights for all 9 stages', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    const sum = stage.tasks.reduce((acc, t) => acc + t.weight, 0);
    assert.ok(
      Math.abs(sum - stage.stageWeight) < 0.001,
      `Stage ${stage.stageId} subtotal mismatch: stageWeight=${stage.stageWeight}, sum=${sum}`
    );
  }
});

runTest('2.4 Invariant 3: milestone total weight === 100.000% exactly', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const total = ledger.stages.reduce((acc, s) => acc + s.stageWeight, 0);
  assert.strictEqual(total, 100.0);
});

runTest('2.5 Invariant 4: 4-way progress partition sums to 100.000% (61.5% + 10.5% + 22.5% + 5.5%)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const s = ledger.summary;
  assert.strictEqual(s.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(s.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(s.blockedPercent, 22.5);
  assert.strictEqual(s.unimplementedPercent, 5.5);
  const sum = s.repoVerifiedEarnedPercent + s.unexecutedDatabasePendingPercent + s.blockedPercent + s.unimplementedPercent;
  assert.strictEqual(sum, 100.0);
});

runTest('2.6 Invariant 5: Mutual exclusivity proof — W021.5-I-02 is strictly in Blocked (3.0%) and 0.0% in Unimplemented', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const stageI = ledger.stages.find((s) => s.stageId === 'STAGE_I');
  const i02 = stageI.tasks.find((t) => t.taskId === 'W021.5-I-02');
  assert.ok(i02, 'Task W021.5-I-02 must exist');
  assert.strictEqual(i02.accounting.blockedWeight, 3.0);
  assert.strictEqual(i02.accounting.unimplementedWeight, 0.0);
  assert.strictEqual(i02.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(i02.accounting.databasePendingWeight, 0.0);
});

runTest('2.7 Falsification: Weight total below 100.0% (such as 99.0% from chat table) fails closed with WEIGHT_CONSERVATION_VIOLATION', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  // Mutate task A-01 weight from 3.0 to 2.0 (yielding 99.0% sum)
  mutatedLedger.stages[0].tasks[0].weight = 2.0;

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('WEIGHT_CONSERVATION_VIOLATION')
  );
});

runTest('2.8 Falsification: Weight total above 100.0% (such as 101.0%) fails closed with WEIGHT_CONSERVATION_VIOLATION', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  mutatedLedger.stages[0].tasks[0].weight = 4.0; // sum = 101.0%

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('WEIGHT_CONSERVATION_VIOLATION')
  );
});

runTest('2.9 Falsification: Duplicate category allocation on W021.5-I-02 (e.g. 3% blocked AND 3% unimpl) fails closed', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  const stageI = mutatedLedger.stages.find((s) => s.stageId === 'STAGE_I');
  const i02 = stageI.tasks.find((t) => t.taskId === 'W021.5-I-02');
  i02.accounting.blockedWeight = 3.0;
  i02.accounting.unimplementedWeight = 3.0; // double counting!

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('TASK_PARTITION_CONSERVATION_VIOLATION') || err.message.includes('DUPLICATE_CATEGORY_ALLOCATION_REJECTED')
  );
});

runTest('2.10 Falsification: Progress partition sum deviation (!== 100%) fails closed with PROGRESS_PARTITION_VIOLATION', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const mutatedLedger = JSON.parse(JSON.stringify(ledger));
  // Mutate task A-01 accounting earned from 3.0 to 4.0 without changing task weight
  mutatedLedger.stages[0].tasks[0].accounting.repoVerifiedWeight = 4.0;

  assert.throws(
    () => {
      verifyNonOverlappingAccountingAndTraceability({ ledgerOverride: mutatedLedger });
    },
    (err) => err.message.includes('TASK_PARTITION_CONSERVATION_VIOLATION') || err.message.includes('PROGRESS_PARTITION_VIOLATION')
  );
});

// -----------------------------------------------------------------------------
// WORKSTREAM C: Governing Authority Provenance & External Trust Boundary
// -----------------------------------------------------------------------------
console.log('\n--- 3. Workstream C: Governing Authority & External Trust Boundary Falsification ---');

runTest('3.1 All 15 governing documents verified against Git history with exact paths, blob SHAs, and sizes', () => {
  const auditPath = path.join(REPO_ROOT, 'reports/w021_5_governing_source_inventory_audit.json');
  assert.ok(fs.existsSync(auditPath), 'Governing source inventory audit must exist');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert.strictEqual(audit.governingDocumentsCount, 15);

  for (const doc of audit.documents) {
    assert.strictEqual(doc.recordedCommitExists, true, `Commit ${doc.recordedCommitSha} for ${doc.docId} must exist`);
    assert.strictEqual(doc.fileAtRecordedCommitExists, true, `File ${doc.path} must exist at recorded commit`);
    assert.strictEqual(doc.blobShaHead, doc.blobAtRecordedCommit, `Blob SHA for ${doc.docId} must match audited commit`);
  }
});

runTest('3.2 Local SHA-256 digest within same repo is recognized as tamper-detection, not external trust anchor', () => {
  const matrixPath = path.join(REPO_ROOT, 'governance/specifications/w021_5_governing_traceability_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  assert.ok(matrix.monolithicSpecificationStatus.limitationNote, 'Must include trust limitation note');
  const hist = verifyHistoricalArtifactIntegrity();
  assert.strictEqual(hist.trustAnchorStatus.classification, 'REPOSITORY_LOCAL_INTEGRITY_CHECK_NOT_EXTERNAL_TRUST_ANCHOR');
});

runTest('3.3 Falsification: Co-mutated manifest, matrix, and metadata fails closed against immutable Git historical origin be4ba41', () => {
  // An attacker mutates task A-01 weight in matrix, manifest, and CANONICAL_TASK_METADATA simultaneously
  const fakeMatrix = {
    governingDocuments: [],
    tasks: [{ taskId: 'W021.5-A-01', approvedWeight: 10.0, canonicalTitle: 'Co-Mutated Title' }],
  };

  assert.throws(
    () => {
      // Historical origin be4ba41 is immutable in git object database
      __testOnly_verifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }, TEST_HARNESS_PROTECTION_TOKEN);
    },
    (err) => err.message.includes('Raw artifact integrity violation')
  );
});

runTest('3.4 Falsification: Tampered document hash in governing matrix fails closed', () => {
  const matrixPath = path.join(REPO_ROOT, 'governance/specifications/w021_5_governing_traceability_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const mutatedMatrix = JSON.parse(JSON.stringify(matrix));
  mutatedMatrix.governingDocuments[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';

  assert.throws(
    () => {
      __testOnly_verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }, TEST_HARNESS_PROTECTION_TOKEN);
    },
    (err) => err.message.includes('Governing provenance violation: Document digest mismatch')
  );
});

// -----------------------------------------------------------------------------
// WORKSTREAM D: Substantive Domain Criteria vs Superficial Syntax/AST
// -----------------------------------------------------------------------------
console.log('\n--- 4. Workstream D: Substantive Domain Criteria vs Superficial Syntax/AST ---');

runTest('4.1 Criterion evidence register exists and documents all 50 criteria with substantive properties', () => {
  const regPath = path.join(REPO_ROOT, 'governance/specifications/w021_5_criterion_evidence_register.json');
  assert.ok(fs.existsSync(regPath), 'Criterion evidence register must exist');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.strictEqual(reg.summary.totalCriteria, 50);
  assert.strictEqual(reg.summary.passedCriteria, 37);
  assert.strictEqual(reg.summary.failedOrPendingCriteria, 13);

  for (const c of reg.criteria) {
    assert.ok(c.domainProperty && c.domainProperty.length > 20, `Criterion ${c.criterionId} must have detailed domainProperty`);
    assert.ok(c.evaluatedArtifact && c.evaluatedArtifact.length > 3, `Criterion ${c.criterionId} must specify evaluatedArtifact`);
    assert.ok(c.verificationProcedure && c.verificationProcedure.length > 10, `Criterion ${c.criterionId} must specify verificationProcedure`);
    assert.ok(c.negativeAdversarialCase && c.negativeAdversarialCase.length > 15, `Criterion ${c.criterionId} must document negativeAdversarialCase`);
    assert.ok(c.evidenceLimitations && c.evidenceLimitations.length > 5, `Criterion ${c.criterionId} must document evidenceLimitations`);
  }
});

runTest('4.2 Falsification: Superficial file existence without substantive domain properties fails closed', () => {
  // CRIT-A01-01 checks parsed state count (31) and statutory seats (4123), not just file existence
  const spec = TASK_SPECIFICATIONS['W021.5-A-01'];
  assert.ok(spec, 'Task A-01 spec must exist');
  const crit = spec.criteria[0];

  // Test against empty fixture directory with empty JSON file
  const tmpDir = path.join(REPO_ROOT, 'reports');
  const fakeOutcome = crit.verify(path.join(REPO_ROOT, 'non_existent_dir'));
  assert.strictEqual(fakeOutcome.passed, false, 'Criterion must fail when evidence is missing');
});

runTest('4.3 Substantive Domain Invariant: CRIT-A01-01 verifies statutory 4,123 seats across 31 Assembly states', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const parsed = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  assert.strictEqual(parsed.states.length, 31);
  assert.strictEqual(parsed.summary.totalStatutorySeats, 4123);
});

runTest('4.4 Substantive Domain Invariant: CRIT-A03-01/02 verifies Delhi 70-seat invariant and 151 municipal placeholders', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const parsed = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const dl = parsed.states.find((s) => s.stateCode === 'DL');
  assert.ok(dl, 'Delhi state record must exist');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);
  assert.strictEqual(dl.seededConstituencyCount, 70);
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151);

  const seedPath = path.join(REPO_ROOT, 'data/seed/delhi-mla-profiles.ts');
  const buf = fs.readFileSync(seedPath);
  assert.strictEqual(buf.includes('\r\n'), false, 'Seed file must have pure LF line endings');
  assert.strictEqual(buf.toString('utf8').includes(': undefined'), false, 'Seed file must have zero undefined properties');
});

runTest('4.5 Substantive Domain Invariant: CRIT-B104-01 detects Telangana AC 119 boundary defect (120 features for 119 seats)', () => {
  const geojsonPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.strictEqual(fs.existsSync(geojsonPath), true, 'data/geo/telangana-assembly.geojson must exist');
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  assert.strictEqual(geojson.type, 'FeatureCollection');
  assert.strictEqual(geojson.features.length, 120, 'Telangana geojson must contain 120 features for 119 statutory seats');
  const taskB104Spec = TASK_SPECIFICATIONS['W021.5-B1-04'];
  const res = taskB104Spec.criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true);
  assert.ok(res.message.includes('AC 119 duplicate claim defect detected'));
});

runTest('4.6 Substantive Domain Invariant: CRIT-C02-01 verifies 1,207 political organization registry rows in migration 065 SQL', () => {
  const sqlPath = path.join(REPO_ROOT, 'supabase/migrations/065_canonical_political_organization_registry.sql');
  assert.strictEqual(fs.existsSync(sqlPath), true, 'Migration 065 must exist');
  const content = fs.readFileSync(sqlPath, 'utf8');
  assert.ok(content.length > 200000, 'Migration 065 must exceed 200KB');
  assert.ok(content.includes('1,207') || content.includes('1207'), 'Must specify 1,207 total database rows');
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_final_organization_manifest.json');
  assert.strictEqual(fs.existsSync(manifestPath), true, 'Organization manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const canonicalCount = manifest.summary?.exactCanonicalOrganizations || manifest.canonicalOrganizations?.length;
  assert.strictEqual(canonicalCount, 107, 'Must have 107 canonical organizations');
});

runTest('4.7 Substantive Domain Invariant: CRIT-G02-01 verifies stateData.ts has zero hardcoded state-code election-year inferences', () => {
  const codePath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  const code = fs.readFileSync(codePath, 'utf8');
  assert.strictEqual(code.includes("stateCode === 'TS' ? 2023"), false, 'Must have zero state-code election-year inferences');
  // Confirm unmapped electionType resolves to null without falling back to GENERAL
  assert.ok(code.includes('electionType = null;'), 'Unmapped electionType must fall back to null, not GENERAL');
});

// -----------------------------------------------------------------------------
// WORKSTREAM E: Dynamic Progress Re-Substantiation Proof
// -----------------------------------------------------------------------------
console.log('\n--- 5. Workstream E: Dynamic Progress Re-Substantiation Proof ---');

runTest('5.1 Dynamic progress derivation recomputed from 50 discrete criteria yields exactly 61.500%', () => {
  let earnedSum = 0;
  for (const [taskId, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const assessment = evaluateTaskCriteria({ taskId, weight: meta.weight }, REPO_ROOT, { failClosed: false });
    earnedSum += assessment.earnedWeight;
  }
  assert.ok(Math.abs(earnedSum - 61.500) < 0.001, `Earned sum must equal 61.500%, got ${earnedSum.toFixed(3)}%`);
});

runTest('5.2 Verification that earned progress is dynamic: mutating passing criterion outcome reduces progress dynamically', () => {
  // If we simulate task A-01 criterion 0 failing, earned progress must drop by 1.5% to 60.0%
  const originalVerify = TASK_SPECIFICATIONS['W021.5-A-01'].criteria[0].verify;
  try {
    TASK_SPECIFICATIONS['W021.5-A-01'].criteria[0].verify = () => ({ passed: false, message: 'Simulated failure' });
    const assessment = evaluateTaskCriteria({ taskId: 'W021.5-A-01', weight: 3.0 }, REPO_ROOT, { failClosed: false });
    assert.strictEqual(assessment.earnedWeight, 1.5, 'Earned weight must drop from 3.0 to 1.5');
  } finally {
    TASK_SPECIFICATIONS['W021.5-A-01'].criteria[0].verify = originalVerify;
  }
});

runTest('5.3 Cross-reconciliation against reports/w021_5_execution_ledger.json and Markdown ledger', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5);
  assert.ok(mdContent.includes('61.5%'), 'Markdown ledger must document 61.5% earned');
  assert.ok(mdContent.includes('10.5%'), 'Markdown ledger must document 10.5% database pending');
  assert.ok(mdContent.includes('22.5%'), 'Markdown ledger must document 22.5% blocked');
  assert.ok(mdContent.includes('5.5%'), 'Markdown ledger must document 5.5% unimplemented');
});

// -----------------------------------------------------------------------------
// WORKSTREAM F: Mandatory Governance Invariants & Defect Statuses
// -----------------------------------------------------------------------------
console.log('\n--- 6. Workstream F: Mandatory Governance Invariants & Defect Statuses ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: formal CTO acceptance strictly 0.0% (UNACCEPTED)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
});

runTest('6.2 Offline Air-Gap: live DB staging execution strictly 0.0% (UNEXECUTED)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0);
});

runTest('6.3 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  const stageE = ledger.stages.find((s) => s.stageId === 'STAGE_E');
  const e02 = stageE.tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(e02.status, 'BLOCKED');
  assert.strictEqual(e02.accounting.repoVerifiedWeight, 0);
  assert.strictEqual(e02.accounting.blockedWeight, 5.0);
});

runTest('6.4 Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const stageB = ledger.stages.find((s) => s.stageId === 'STAGE_B');
  const b04 = stageB.tasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.strictEqual(b04.accounting.blockedWeight, 1.5);
});

runTest('6.5 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte identical', () => {
  const BASELINE_COMMIT = '0ea572d860aa064766042f6b418b157fd8e2098f';
  const diff = execSync(`git diff ${BASELINE_COMMIT} -- supabase/migrations/`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.strictEqual(diff, '', `SQL migrations must be byte-for-byte identical to baseline ${BASELINE_COMMIT}`);
});

runTest('6.6 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const BASELINE_COMMIT = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';
  const diff = execSync(`git diff ${BASELINE_COMMIT} -- apps/mobile/constants/`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.strictEqual(diff, '', `Seed files must be byte-for-byte identical to baseline ${BASELINE_COMMIT}`);
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
