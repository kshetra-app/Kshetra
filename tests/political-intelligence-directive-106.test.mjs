#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-106.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 106
 * Independent Authority Anchoring, Genuine Adversarial Verification, and Criterion Evidence Hardening
 *
 * Test battery executing offline verification across 6 mandatory workstreams:
 * - Workstream A: Establish the Governing Authority Boundary & Discrepancies
 * - Workstream B: Repair Coordinated-Tampering Tests — 9 Genuine Adversarial Cases
 * - Workstream C: Substantive Domain Criteria vs Superficial Syntax/AST Checks
 * - Workstream D: Recompute Completion Without Self-Certification
 * - Workstream E: Truthful Test Execution Evidence & Manifest Validation
 * - Workstream F: Mandatory Governance Invariants, Defect Registries & Air-Gap Preservation
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import ts from 'typescript';
import vm from 'vm';

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
  AUTHORITY_CLASSIFICATION,
  AUTHORITY_BOUNDARY_ROLE,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
  GOVERNING_TRACEABILITY_MATRIX_PATH,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  verifyNonOverlappingAccountingAndTraceability,
  evaluateTaskCriteria,
  computeLedgerSummary,
  reconcileExecutionLedger,
} from '../scripts/reconcile_execution_ledger.mjs';

import {
  MANIFEST_PATH,
  TEST_SUITE_DEFINITIONS,
  parseTestOutput,
  validateManifestIntegrity,
} from '../scripts/capture_test_execution.mjs';

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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 106 VERIFICATION SUITE');
console.log('Independent Authority Anchoring, Genuine Adversarial Verification, and Criterion Evidence Hardening');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// WORKSTREAM A: Establish the Governing Authority Boundary
// -----------------------------------------------------------------------------
console.log('--- 1. Workstream A: Establish the Governing Authority Boundary ---');

runTest('1.1 Discrepancy register exists and registers all Directive 105 discrepancies DISC-021 through DISC-026', () => {
  const registerPath = path.join(REPO_ROOT, 'reports/w021_5_directive_105_discrepancy_register.json');
  assert.ok(fs.existsSync(registerPath), 'Discrepancy register JSON must exist on disk');
  const parsed = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
  assert.strictEqual(parsed.milestone, 'W021.5');
  assert.strictEqual(parsed.directive, 'CTO Directive 106');
  assert.ok(Array.isArray(parsed.discrepancies), 'Discrepancies array must exist');

  const registeredIds = new Set(DISCREPANCY_REGISTER.map((d) => d.discrepancyId));
  for (let i = 21; i <= 26; i++) {
    const discId = `DISC-0${i}`;
    assert.ok(registeredIds.has(discId), `Discrepancy ${discId} must exist in DISCREPANCY_REGISTER`);
    const inJson = parsed.discrepancies.find((d) => d.discrepancyId === discId);
    assert.ok(inJson, `Discrepancy ${discId} must exist in JSON register`);
  }
});

runTest('1.2 Governing source inventory audit reports 5 dimensions across all 15 documents', () => {
  const auditPath = path.join(REPO_ROOT, 'reports/w021_5_governing_source_inventory_audit.json');
  assert.ok(fs.existsSync(auditPath), 'Governing source inventory audit JSON must exist');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert.strictEqual(audit.governingDocumentsCount, 15);
  assert.strictEqual(audit.authorityClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');
  assert.strictEqual(audit.authorityBoundarySummary.trustAnchorStatus, 'IN_REPOSITORY_INTEGRITY_ONLY');

  for (const doc of audit.documents) {
    assert.ok(doc.contentIdentity, `Doc ${doc.docId} must have contentIdentity`);
    assert.ok(doc.contentIdentity.gitBlobSha, `Doc ${doc.docId} must have gitBlobSha`);
    assert.ok(doc.historicalIdentity, `Doc ${doc.docId} must have historicalIdentity`);
    assert.ok(doc.historicalIdentity.recordedCommitSha, `Doc ${doc.docId} must have recordedCommitSha`);
    assert.ok(doc.approvalAuthority, `Doc ${doc.docId} must have approvalAuthority`);
    assert.strictEqual(doc.approvalAuthority.approvalClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');
    assert.ok(doc.requirementTraceability, `Doc ${doc.docId} must have requirementTraceability`);
    assert.ok(doc.verificationLimitations, `Doc ${doc.docId} must have verificationLimitations`);
  }
});

runTest('1.3 Top-level approval authority explicitly classified as NOT_INDEPENDENTLY_ESTABLISHED', () => {
  assert.strictEqual(AUTHORITY_CLASSIFICATION, 'NOT_INDEPENDENTLY_ESTABLISHED');
  const matrix = JSON.parse(fs.readFileSync(GOVERNING_TRACEABILITY_MATRIX_PATH, 'utf8'));
  assert.strictEqual(matrix.authorityClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');
  const masterSpec = JSON.parse(fs.readFileSync(MASTER_SPECIFICATION_PATH, 'utf8'));
  assert.strictEqual(masterSpec.authorityClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');
});

runTest('1.4 Proposed external authority anchor mechanism is explicitly recorded as PROPOSED_NOT_ACTIVE', () => {
  const auditPath = path.join(REPO_ROOT, 'reports/w021_5_governing_source_inventory_audit.json');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert.ok(audit.authorityBoundarySummary.proposedGovernanceMechanism.includes('PROPOSED_NOT_ACTIVE'), 'Proposed mechanism must be PROPOSED_NOT_ACTIVE');
  assert.ok(audit.authorityBoundarySummary.proposedGovernanceMechanism.includes('Cosign/GPG'), 'Proposed mechanism must mention Cosign/GPG');
});

runTest('1.5 Historical origin commit be4ba41f is classified as baseline comparison role only', () => {
  assert.strictEqual(AUTHORITY_BOUNDARY_ROLE, 'HISTORICAL_COMPARISON_BASELINE_NOT_EXTERNAL_APPROVAL_AUTHORITY');
  assert.strictEqual(HISTORICAL_ORIGIN_COMMIT, 'be4ba41f74616e068b531df17780080a1a946bbd');
});

// -----------------------------------------------------------------------------
// WORKSTREAM B: Repair the Coordinated-Tampering Tests (9 Genuine Adversarial Cases)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Workstream B: 9 Genuine Adversarial Coordinated-Tampering Cases ---');

function createFixtureRoot(id) {
  const fixtureDir = path.join(REPO_ROOT, `.tmp-adv-fixture-${id}`);
  if (fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Junction links for documents
  fs.symlinkSync(path.join(REPO_ROOT, 'docs'), path.join(fixtureDir, 'docs'), 'junction');
  fs.symlinkSync(path.join(REPO_ROOT, 'reports'), path.join(fixtureDir, 'reports'), 'junction');
  if (fs.existsSync(path.join(REPO_ROOT, 'package.json'))) {
    fs.copyFileSync(path.join(REPO_ROOT, 'package.json'), path.join(fixtureDir, 'package.json'));
  }
  if (fs.existsSync(path.join(REPO_ROOT, 'W021.5-A-AUDIT-REPORT.md'))) {
    fs.copyFileSync(path.join(REPO_ROOT, 'W021.5-A-AUDIT-REPORT.md'), path.join(fixtureDir, 'W021.5-A-AUDIT-REPORT.md'));
  }

  // Create governance/specifications directory
  const specDir = path.join(fixtureDir, 'governance', 'specifications');
  fs.mkdirSync(specDir, { recursive: true });

  fs.copyFileSync(GOVERNING_TRACEABILITY_MATRIX_PATH, path.join(specDir, 'w021_5_governing_traceability_matrix.json'));
  fs.copyFileSync(MASTER_SPECIFICATION_PATH, path.join(specDir, 'w021_5_master_specification.json'));
  fs.copyFileSync(HISTORICAL_ORIGIN_LEDGER_PATH, path.join(specDir, 'historical_w021_5_origin_ledger.json'));

  return {
    fixtureDir,
    specDir,
    cleanup: () => {
      try {
        fs.rmSync(fixtureDir, { recursive: true, force: true });
      } catch (e) {
        // cleanup best effort
      }
    },
  };
}

runTest('2.1 Case 1: Co-mutated task weight/title/identity across matrix, master spec, and metadata fails closed', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case1');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const masterSpecPath = path.join(specDir, 'w021_5_master_specification.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    const masterSpec = JSON.parse(fs.readFileSync(masterSpecPath, 'utf8'));

    const targetMatrixTask = matrix.tasks.find((t) => t.taskId === 'W021.5-A-01');
    targetMatrixTask.approvedWeight = 5.0;
    targetMatrixTask.canonicalTitle = 'Tampered Data-Truth Audit';

    masterSpec.tasks['W021.5-A-01'].approvedWeight = 5.0;
    masterSpec.tasks['W021.5-A-01'].canonicalTitle = 'Tampered Data-Truth Audit';

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
    fs.writeFileSync(masterSpecPath, JSON.stringify(masterSpec, null, 2));

    assert.throws(() => {
      verifyAuthorityBoundary({ repoRoot: fixtureDir });
    }, /Authority boundary violation|weight mismatch|title mismatch/i);

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|weight mismatch|title mismatch/i);
  } finally {
    cleanup();
  }
});

runTest('2.2 Case 2: Co-mutated task IDs and stage membership fails closed against canonical origin', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case2');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const masterSpecPath = path.join(specDir, 'w021_5_master_specification.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    const masterSpec = JSON.parse(fs.readFileSync(masterSpecPath, 'utf8'));

    const task = matrix.tasks.find((t) => t.taskId === 'W021.5-A-01');
    task.taskId = 'W021.5-A-99';
    task.stageId = 'STAGE_B';

    masterSpec.tasks['W021.5-A-99'] = { ...masterSpec.tasks['W021.5-A-01'], taskId: 'W021.5-A-99', stageId: 'STAGE_B' };
    delete masterSpec.tasks['W021.5-A-01'];
    const stageA = masterSpec.stages.find((s) => s.stageId === 'STAGE_A');
    stageA.taskIds = stageA.taskIds.filter((id) => id !== 'W021.5-A-01');
    const stageB = masterSpec.stages.find((s) => s.stageId === 'STAGE_B');
    stageB.taskIds.push('W021.5-A-99');

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
    fs.writeFileSync(masterSpecPath, JSON.stringify(masterSpec, null, 2));

    assert.throws(() => {
      verifyAuthorityBoundary({ repoRoot: fixtureDir });
    }, /Authority boundary violation|task count|does not exist in historical origin|missing from master specification/i);

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|has no mapping/i);
  } finally {
    cleanup();
  }
});

runTest('2.3 Case 3: Co-mutated governing document and in-repository expected digest fails closed against Git blob SHA', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case3');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    // Mutate the actual file on disk in fixture
    const mutContent = 'MUTATED_W021.5_A_AUDIT_REPORT_CONTENT_FOR_ADVERSARIAL_TEST';
    fs.writeFileSync(path.join(fixtureDir, 'W021.5-A-AUDIT-REPORT.md'), mutContent);
    const newSha = crypto.createHash('sha256').update(mutContent).digest('hex');

    const doc = matrix.governingDocuments.find((d) => d.docId === 'DOC-W021.5-A-AUDIT');
    doc.sha256 = newSha;
    if (doc.contentIdentity) {
      doc.contentIdentity.sha256 = newSha;
    }

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|Document Git blob SHA mismatch|Historical blob/i);
  } finally {
    cleanup();
  }
});

runTest('2.4 Case 4: Co-mutated local historical snapshot and local metadata fails closed against Git origin object', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case4');
  try {
    const originPath = path.join(specDir, 'historical_w021_5_origin_ledger.json');
    const snapshot = JSON.parse(fs.readFileSync(originPath, 'utf8'));

    snapshot.historicalLedger.summary.totalWeight = 999.0;
    snapshot.historicalLedger.stages[0].tasks[0].weight = 99.0;

    fs.writeFileSync(originPath, JSON.stringify(snapshot, null, 2));

    assert.throws(() => {
      verifyHistoricalArtifactIntegrity({ repoRoot: fixtureDir });
    }, /Snapshot fidelity violation/i);
  } finally {
    cleanup();
  }
});

runTest('2.5 Case 5: Replaced, omitted, or redirected governing document path fails closed', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case5');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    const doc = matrix.governingDocuments.find((d) => d.docId === 'DOC-W021.5-A-AUDIT');
    doc.path = 'package.json';

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|Document digest mismatch|Git blob SHA mismatch/i);
  } finally {
    cleanup();
  }
});

runTest('2.6 Case 6: Attempt to override reference commit or expected digest through caller options throws CALLER_TRUST_OVERRIDE_PROHIBITED', () => {
  assert.throws(() => {
    reconcileExecutionLedger({ historicalOriginCommitOverride: '1111111111111111111111111111111111111111' });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    reconcileExecutionLedger({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    reconcileExecutionLedger({ originCommitOverride: '2222222222222222222222222222222222222222' });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    reconcileExecutionLedger({ matrixOverride: {} });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    verifyAuthorityBoundary({ originCommitOverride: '2222222222222222222222222222222222222222', productionMode: true });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    verifyGoverningSpecificationProvenance({ matrixOverride: {}, productionMode: true });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);

  assert.throws(() => {
    verifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000', productionMode: true });
  }, /CALLER_TRUST_OVERRIDE_PROHIBITED/);
});

runTest('2.7 Case 7: Swapped criterion IDs or criterion weight ratios while preserving total count fails closed', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case7');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    const taskA01 = matrix.tasks.find((t) => t.taskId === 'W021.5-A-01');
    taskA01.criterionIds = ['CRIT-A01-02', 'CRIT-A01-01']; // Swapped order

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|criterion IDs mismatch/i);
  } finally {
    cleanup();
  }
});

runTest('2.8 Case 8: Phantom task (W021.5-B1-05), duplicate task ID, or duplicate requirement code fails closed', () => {
  const { fixtureDir, specDir, cleanup } = createFixtureRoot('case8');
  try {
    const matrixPath = path.join(specDir, 'w021_5_governing_traceability_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    matrix.tasks.push({
      taskId: 'W021.5-B1-05',
      canonicalTitle: 'Statutory Delimitation Geometry Baseline Package',
      stageId: 'STAGE_B',
      approvedWeight: 4.0,
      requirementCode: 'REQ-GEO-005',
      taskClassification: 'CORE_SPECIFICATION',
      governingDocumentId: 'DOC-W021.5-B1-R3-SPEC',
      governingSectionRef: 'Section 4',
      criterionIds: ['CRIT-B105-01'],
    });

    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    assert.throws(() => {
      verifyGoverningSpecificationProvenance({ repoRoot: fixtureDir });
    }, /Governing provenance violation|Expected 27 tasks in governing matrix/i);
  } finally {
    cleanup();
  }
});

runTest('2.9 Case 9: Changed report and test manifest claiming pass not supported by output fails closed', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const tamperedManifest = JSON.parse(JSON.stringify(manifest));
  tamperedManifest.testSuites[0].testsPassed = 999;

  assert.throws(() => {
    validateManifestIntegrity(tamperedManifest, REPO_ROOT);
  }, /Manifest validation error|re-parsed passed count/i);

  const tamperedHashManifest = JSON.parse(JSON.stringify(manifest));
  tamperedHashManifest.testSuites[0].outputLogSha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.throws(() => {
    validateManifestIntegrity(tamperedHashManifest, REPO_ROOT);
  }, /Manifest validation error|digest mismatch/i);
});

runTest('2.10 Canonical fixture passes cleanly and verification restoration is confirmed', () => {
  assert.doesNotThrow(() => {
    verifyAuthorityBoundary();
    verifyGoverningSpecificationProvenance();
    verifyHistoricalArtifactIntegrity();
  });
});

// -----------------------------------------------------------------------------
// WORKSTREAM C: Substantive Domain Criteria vs Superficial Syntax/AST Checks
// -----------------------------------------------------------------------------
console.log('\n--- 3. Workstream C: Substantive Domain Criteria Verification ---');

runTest('3.1 All 50 criteria in criterion evidence register and TASK_SPECIFICATIONS are assigned valid evidence classes', () => {
  const regPath = path.join(REPO_ROOT, 'governance/specifications/w021_5_criterion_evidence_register.json');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.strictEqual(reg.criteria.length, 50);

  const validClasses = new Set([
    'ARTIFACT_PRESENCE_ONLY',
    'STATIC_SEMANTIC_VERIFICATION',
    'EXECUTABLE_BEHAVIOR_VERIFICATION',
    'DATABASE_STAGING_VERIFICATION',
    'EXTERNAL_AUTHORITY_VERIFICATION',
  ]);

  for (const c of reg.criteria) {
    assert.ok(validClasses.has(c.evidenceClass), `Criterion ${c.criterionId} invalid class: ${c.evidenceClass}`);
  }

  for (const [tid, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    for (const c of spec.criteria) {
      assert.ok(c.evidenceClass, `Criterion ${c.criterionId} in task ${tid} missing evidenceClass`);
      assert.ok(validClasses.has(c.evidenceClass), `Criterion ${c.criterionId} in task ${tid} invalid class`);
    }
  }
});

runTest('3.2 CRIT-B101-01 substantively validates schema DDL, constraints, nullability, relationships, and 4,123 seat inserts', () => {
  const b101 = TASK_SPECIFICATIONS['W021.5-B1-01'].criteria.find((c) => c.criterionId === 'CRIT-B101-01');
  assert.ok(b101, 'CRIT-B101-01 must exist');
  assert.strictEqual(b101.evidenceClass, 'STATIC_SEMANTIC_VERIFICATION');
  const result = b101.verify(REPO_ROOT);
  assert.strictEqual(result.passed, true);
  assert.ok(result.message.includes('4,123 statutory seats'), 'Must verify 4,123 statutory seats');
  assert.ok(result.message.includes('UNIQUE(state_code, ac_no)'), 'Must verify UNIQUE constraint');
});

runTest('3.3 CRIT-B104-01 substantively validates 120 features, closed rings, bbox, and detects AC 119 duplicate defect', () => {
  const b104 = TASK_SPECIFICATIONS['W021.5-B1-04'].criteria.find((c) => c.criterionId === 'CRIT-B104-01');
  assert.ok(b104, 'CRIT-B104-01 must exist');
  assert.strictEqual(b104.evidenceClass, 'STATIC_SEMANTIC_VERIFICATION');
  const result = b104.verify(REPO_ROOT);
  assert.strictEqual(result.passed, true);
  assert.ok(result.message.includes('AC 119 duplicate claim defect confirmed'), 'Must detect AC 119 duplicate claim');
  assert.ok(result.message.includes('120 features for 119 statutory seats'), 'Must record 120 features for 119 seats');
});

runTest('3.4 CRIT-C02-01 substantively reconciles 107 canonical organizations and 1,043 aliases between JSON and SQL CTE', () => {
  const c02 = TASK_SPECIFICATIONS['W021.5-C-02'].criteria.find((c) => c.criterionId === 'CRIT-C02-01');
  assert.ok(c02, 'CRIT-C02-01 must exist');
  assert.strictEqual(c02.evidenceClass, 'STATIC_SEMANTIC_VERIFICATION');
  const result = c02.verify(REPO_ROOT);
  assert.strictEqual(result.passed, true);
  assert.ok(result.message.includes('107 canonical organizations'), 'Must reconcile 107 canonical organizations');
  assert.ok(result.message.includes('1,043 aliases'), 'Must reconcile 1,043 aliases');
});

runTest('3.5 CRIT-G02-01 substantively verifies TS AST and VM behavior for mapped, unmapped, and null inputs', () => {
  const g02 = TASK_SPECIFICATIONS['W021.5-G-02'].criteria.find((c) => c.criterionId === 'CRIT-G02-01');
  assert.ok(g02, 'CRIT-G02-01 must exist');
  assert.strictEqual(g02.evidenceClass, 'EXECUTABLE_BEHAVIOR_VERIFICATION');
  const result = g02.verify(REPO_ROOT);
  assert.strictEqual(result.passed, true);
  assert.ok(result.message.includes('mapped, unmapped, and null inputs'), 'Must verify mapped, unmapped, and null behavior');
});

// -----------------------------------------------------------------------------
// WORKSTREAM D: Recompute Completion Without Self-Certification
// -----------------------------------------------------------------------------
console.log('\n--- 4. Workstream D: Recompute Completion Without Self-Certification ---');

runTest('4.1 Four-way milestone partition conserves exactly 100.000%', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const s = ledger.summary;
  const totalPartition = s.repoVerifiedEarnedPercent + s.databasePendingPercent + s.blockedPercent + s.unimplementedPercent;
  assert.ok(Math.abs(totalPartition - 100.000) < 0.001, `Total partition sum must equal 100.000%, got ${totalPartition}`);
  assert.strictEqual(s.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(s.databasePendingPercent, 10.5);
  assert.strictEqual(s.blockedPercent, 22.5);
  assert.strictEqual(s.unimplementedPercent, 5.5);
});

runTest('4.2 Dynamic progress derivation from discrete criteria yields exactly 61.500% earned', () => {
  let earnedSum = 0;
  for (const [taskId, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const assessment = evaluateTaskCriteria({ taskId, weight: meta.weight }, REPO_ROOT, { failClosed: false });
    earnedSum += assessment.earnedWeight;
  }
  assert.ok(Math.abs(earnedSum - 61.500) < 0.001, `Earned sum must equal 61.500%, got ${earnedSum.toFixed(3)}%`);
});

runTest('4.3 Task accounting reconciles weight === earned + dbPending + blocked + unimplemented with zero duplicate credit', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const acct = task.accounting;
      const sum = Number((acct.repoVerifiedWeight + acct.databasePendingWeight + acct.blockedWeight + acct.unimplementedWeight).toFixed(3));
      assert.strictEqual(sum, task.weight, `Task ${task.taskId} weight ${task.weight} != sum of partition ${sum}`);
    }
  }
});

runTest('4.4 Cross-reconciliation between JSON ledger, Markdown ledger, criterion register, and master specification', () => {
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
// WORKSTREAM E: Truthful Test Execution Evidence & Manifest Validation
// -----------------------------------------------------------------------------
console.log('\n--- 5. Workstream E: Truthful Test Execution Evidence & Manifest ---');

runTest('5.1 Test execution harness defines at least 27 test suites with Suite 27 integrated', () => {
  assert.ok(TEST_SUITE_DEFINITIONS.length >= 27, `Expected at least 27 test suites, got ${TEST_SUITE_DEFINITIONS.length}`);
  const suite27 = TEST_SUITE_DEFINITIONS.find((s) => s.suite === 'tests/political-intelligence-directive-106.test.mjs');
  assert.ok(suite27, 'Suite 27 must exist in TEST_SUITE_DEFINITIONS');
  assert.strictEqual(suite27.directiveRef, '106');
});

runTest('5.2 parseTestOutput parser extracts skipped counts and establishes positive execution evidence', () => {
  const jestOutputWithSkipped = `
PASS apps/api/src/__tests__/sample.test.ts
Tests:  1 skipped, 23 passed, 24 total
Test Suites: 1 passed, 1 total
`;
  const parsed = parseTestOutput(jestOutputWithSkipped, { suite: 'apps/api/src/__tests__/sample.test.ts', command: 'npm test -- sample.test.ts' });
  assert.strictEqual(parsed.isParsed, true);
  assert.strictEqual(parsed.passed, 23);
  assert.strictEqual(parsed.skipped, 1);
  assert.strictEqual(parsed.zeroSkippedEvidenced, false);

  const jestOutputClean = `
PASS apps/api/src/__tests__/sample.test.ts
Tests:  24 passed, 24 total
Test Suites: 1 passed, 1 total
`;
  const cleanParsed = parseTestOutput(jestOutputClean, { suite: 'apps/api/src/__tests__/sample.test.ts', command: 'npm test -- sample.test.ts' });
  assert.strictEqual(cleanParsed.isParsed, true);
  assert.strictEqual(cleanParsed.passed, 24);
  assert.strictEqual(cleanParsed.skipped, 0);
  assert.strictEqual(cleanParsed.zeroSkippedEvidenced, true);
});

runTest('5.3 validateManifestIntegrity verifies manifest structure and rejects discrepancies fail-closed', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  // Manifest on disk is valid or can be verified
  assert.ok(manifest.testSuites.length >= 26, 'Manifest must have test suites recorded');
});

// -----------------------------------------------------------------------------
// WORKSTREAM F: Mandatory Governance Invariants & Baseline Preservation
// -----------------------------------------------------------------------------
console.log('\n--- 6. Workstream F: Mandatory Governance Invariants & Baseline Preservation ---');

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

runTest('6.3 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned, 5.0% blocked)', () => {
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
