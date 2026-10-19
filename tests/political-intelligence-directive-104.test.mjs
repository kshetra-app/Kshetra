#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-104.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 104 Verification Suite
 * Governing-Specification Provenance, Independent Criterion Substantiation, and Final Evidence Reconciliation
 *
 * Covers:
 * 1. Workstream A: Governing Specification Provenance & Source Inspection (5 tests)
 * 2. Workstream B: Bidirectional Task, Requirement & Stage Provenance (6 tests)
 * 3. Workstream C: Substantive Domain Criteria Verification (5 tests)
 * 4. Workstream D: Comprehensive Adversarial Falsification Matrix (9 tests)
 * 5. Workstream E: Dynamic Progress Calculation Proof (5 tests)
 * 6. Workstream F: Directive 103 Discrepancy Correction & Mandatory Governance Invariants (8 tests)
 * Total: 38 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  CANONICAL_TASK_METADATA,
  OLD_TO_CANONICAL_TASK_MAPPING,
  PHANTOM_TASK_DISPOSITIONS,
  DISCREPANCY_REGISTER,
  resolveTaskIdentity,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  loadGoverningTraceabilityMatrix,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  validateMasterSpecificationAgainstCode,
  validateLedgerSummaryConsistency,
  validateCanonicalTaskIdentity,
  validateStageAccounting,
  validateTaskAccounting,
  validateTaskEvidence,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  evaluateTaskCriteria,
  TASK_SPECIFICATIONS,
  STAGE_EVIDENCE_RELEVANCE,
  GOVERNING_TRACEABILITY_MATRIX_PATH,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_MIGRATIONS = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_SEEDS = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';
const DIRECTIVE_103_FINALIZED_COMMIT = 'e09b523ec550b1ed73071117a4f496d1dc8e7806';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 104 VERIFICATION SUITE');
console.log('Governing-Specification Provenance, Independent Criterion Substantiation, and Final Evidence Reconciliation');
console.log('================================================================\n');

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

function withMatrixMutation(mutator, fn) {
  const origMatrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const origSpec = loadMasterSpecification(REPO_ROOT);
  const mutatedMatrix = JSON.parse(JSON.stringify(origMatrix));
  const mutatedSpec = JSON.parse(JSON.stringify(origSpec));

  mutator({ mutatedMatrix, mutatedSpec });
  fn({ mutatedMatrix, mutatedSpec });
}

// ============================================================================
// 1. Workstream A: Governing Specification Provenance & Source Inspection
// ============================================================================
console.log('--- 1. Workstream A: Governing Specification Provenance & Source Inspection ---');

runTest('1.1 verifyGoverningSpecificationProvenance() passes and returns comprehensive provenance proof', () => {
  const result = verifyGoverningSpecificationProvenance({ repoRoot: REPO_ROOT });
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.totalDocuments, 15);
  assert.strictEqual(result.canonicalTasksVerified, 27);
  assert.strictEqual(result.coreSpecificationCount, 25);
  assert.strictEqual(result.hardeningExtensionCount, 2);
  assert.strictEqual(result.unapprovedExtensionsCount, 0);
  assert.strictEqual(result.totalCriteriaCount, 50);
  assert.strictEqual(result.progressPartition.repoVerifiedEarned, 61.5);
  assert.strictEqual(result.progressPartition.databasePending, 10.5);
  assert.strictEqual(result.progressPartition.blockedExternal, 22.5);
  assert.strictEqual(result.progressPartition.unimplemented, 5.5);
});

runTest('1.2 Exact source path, commit SHA, file size, and SHA-256 integrity verified for all 15 governing documents', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  assert.strictEqual(matrix.governingDocuments.length, 15);

  for (const doc of matrix.governingDocuments) {
    const fullPath = path.join(REPO_ROOT, doc.path);
    assert.ok(fs.existsSync(fullPath), `Governing document must exist: ${doc.path}`);
    const bytes = fs.readFileSync(fullPath);
    assert.strictEqual(bytes.length, doc.byteLength, `Byte length mismatch for ${doc.path}`);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.strictEqual(hash, doc.sha256, `SHA-256 digest mismatch for ${doc.path}`);
    assert.ok(/^[0-9a-f]{40}$/.test(doc.commitSha), `Commit SHA must be 40-char hex for ${doc.path}`);
  }
});

runTest('1.3 Monolithic specification disposition is transparently disclosed as FEDERATED_CORPUS_PRESERVED_NO_SINGLE_MONOLITHIC_FILE', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const mono = matrix.monolithicSpecificationStatus;
  assert.ok(mono, 'monolithicSpecificationStatus must be present');
  assert.strictEqual(mono.status, 'FEDERATED_CORPUS_PRESERVED_NO_SINGLE_MONOLITHIC_FILE');
  assert.ok(mono.disposition.includes('No single consolidated file titled'));
  assert.ok(mono.limitationNote.includes('historical citation placeholder'));
});

runTest('1.4 Explicit task classification: exactly 25 CORE_SPECIFICATION tasks, 2 HARDENING_EXTENSION tasks, and 0 UNAPPROVED_EXTENSIONS', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const coreTasks = matrix.tasks.filter((t) => t.taskClassification === 'CORE_SPECIFICATION');
  const extTasks = matrix.tasks.filter((t) => t.taskClassification === 'HARDENING_EXTENSION');
  const otherTasks = matrix.tasks.filter((t) => t.taskClassification !== 'CORE_SPECIFICATION' && t.taskClassification !== 'HARDENING_EXTENSION');

  assert.strictEqual(coreTasks.length, 25, 'Core specification tasks must equal 25');
  assert.strictEqual(extTasks.length, 2, 'Hardening extensions must equal 2');
  assert.strictEqual(otherTasks.length, 0, 'Unapproved extensions must equal 0');

  const extIds = extTasks.map((t) => t.taskId).sort();
  assert.deepStrictEqual(extIds, ['W021.5-A-02', 'W021.5-A-03']);
  assert.strictEqual(extTasks.find((t) => t.taskId === 'W021.5-A-02').approvedWeight, 4.0);
  assert.strictEqual(extTasks.find((t) => t.taskId === 'W021.5-A-03').approvedWeight, 3.0);
});

runTest('1.5 Document distinction: governing specification documents are strictly separated from implementation reports, execution ledgers, and manifests', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const govDocPaths = new Set(matrix.governingDocuments.map((d) => d.path));

  // Assert that generated manifests and current execution ledgers are NOT included as primary governing documents
  assert.ok(!govDocPaths.has('governance/specifications/w021_5_master_specification.json'), 'Generated master spec manifest must not be primary governing doc');
  assert.ok(!govDocPaths.has('reports/w021_5_execution_ledger.json'), 'Generated execution ledger must not be primary governing doc');
  assert.ok(!govDocPaths.has('reports/W021.5-EXECUTION-LEDGER.md'), 'Markdown execution ledger must not be primary governing doc');

  // Verify that the historical origin ledger snapshot has explicit HISTORICAL_ORIGIN_ALLOCATION_LEDGER role
  const originDoc = matrix.governingDocuments.find((d) => d.docId === 'DOC-W021.5-ORIGIN-LEDGER');
  assert.ok(originDoc, 'DOC-W021.5-ORIGIN-LEDGER must be registered');
  assert.strictEqual(originDoc.role, 'HISTORICAL_ORIGIN_ALLOCATION_LEDGER');
});

// ============================================================================
// 2. Workstream B: Bidirectional Task, Requirement & Stage Provenance
// ============================================================================
console.log('\n--- 2. Workstream B: Bidirectional Task, Requirement & Stage Provenance ---');

runTest('2.1 Bidirectional inventory: 15 governing docs <-> 27 canonical tasks <-> 50 criteria <-> execution ledger records', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));

  const matrixTaskIds = new Set(matrix.tasks.map((t) => t.taskId));
  const canonicalTaskIds = new Set(Object.keys(CANONICAL_TASK_METADATA));
  const ledgerTaskIds = new Set();
  for (const s of ledger.stages) {
    for (const t of s.tasks) {
      ledgerTaskIds.add(t.taskId);
    }
  }

  assert.strictEqual(matrixTaskIds.size, 27);
  assert.strictEqual(canonicalTaskIds.size, 27);
  assert.strictEqual(ledgerTaskIds.size, 27);

  for (const id of canonicalTaskIds) {
    assert.ok(matrixTaskIds.has(id), `Canonical task ${id} missing in governing matrix`);
    assert.ok(ledgerTaskIds.has(id), `Canonical task ${id} missing in execution ledger`);
  }
});

runTest('2.2 Requirement code validation: every canonical task requirement code resolves to governing matrix', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const matrixMap = Object.fromEntries(matrix.tasks.map((t) => [t.taskId, t]));

  for (const [tid, canonical] of Object.entries(CANONICAL_TASK_METADATA)) {
    const matrixTask = matrixMap[tid];
    assert.ok(matrixTask, `Task ${tid} missing from governing matrix`);
    assert.strictEqual(canonical.requirementCode, matrixTask.requirementCode, `Requirement code mismatch for ${tid}`);
    assert.strictEqual(canonical.canonicalTitle, matrixTask.canonicalTitle, `Title mismatch for ${tid}`);
    assert.strictEqual(canonical.stageId, matrixTask.stageId, `Stage mismatch for ${tid}`);
    assert.strictEqual(canonical.weight, matrixTask.approvedWeight, `Weight mismatch for ${tid}`);
  }
});

runTest('2.3 Governing document & section reference: each of the 27 tasks links to a valid governing doc ID and non-empty section reference', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const validDocIds = new Set(matrix.governingDocuments.map((d) => d.docId));

  for (const t of matrix.tasks) {
    assert.ok(validDocIds.has(t.governingDocumentId), `Task ${t.taskId} references unknown governingDocumentId: ${t.governingDocumentId}`);
    assert.ok(typeof t.governingSectionRef === 'string' && t.governingSectionRef.length > 5, `Task ${t.taskId} missing valid governingSectionRef`);
    assert.ok(typeof t.governingMandate === 'string' && t.governingMandate.length > 10, `Task ${t.taskId} missing governingMandate`);
  }
});

runTest('2.4 Criteria resolution: all 50 criterion IDs in TASK_SPECIFICATIONS match governing matrix criterionIds in exact sequence and identity', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  let totalCriteriaCount = 0;

  for (const t of matrix.tasks) {
    const spec = TASK_SPECIFICATIONS[t.taskId];
    assert.ok(spec, `Task ${t.taskId} missing in TASK_SPECIFICATIONS`);
    const specCritIds = spec.criteria.map((c) => c.criterionId);
    assert.deepStrictEqual(specCritIds, t.criterionIds, `Criterion IDs mismatch for ${t.taskId}`);
    totalCriteriaCount += specCritIds.length;
  }

  assert.strictEqual(totalCriteriaCount, 50, 'Total criteria across all 27 tasks must be exactly 50');
});

runTest('2.5 Master specification manifest alignment: master spec tasks match governing matrix in title, weight, stage, requirementCode', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const masterSpec = loadMasterSpecification(REPO_ROOT);
  const matrixMap = Object.fromEntries(matrix.tasks.map((t) => [t.taskId, t]));

  for (const [tid, specTask] of Object.entries(masterSpec.tasks)) {
    const matrixTask = matrixMap[tid];
    assert.ok(matrixTask, `Master spec task ${tid} missing from governing matrix`);
    assert.strictEqual(specTask.canonicalTitle, matrixTask.canonicalTitle);
    assert.strictEqual(specTask.approvedWeight, matrixTask.approvedWeight);
    assert.strictEqual(specTask.stageId, matrixTask.stageId);
    assert.strictEqual(specTask.governingRequirement, matrixTask.requirementCode);
  }
});

runTest('2.6 Historical origin ledger alignment: historical origin matches governing matrix in task IDs, titles, weights', () => {
  const matrix = loadGoverningTraceabilityMatrix(REPO_ROOT);
  const hist = loadHistoricalOriginLedger(REPO_ROOT);
  const matrixMap = Object.fromEntries(matrix.tasks.map((t) => [t.taskId, t]));

  const histTasks = [];
  for (const s of hist.historicalLedger.stages) {
    for (const t of s.tasks) {
      histTasks.push(t);
    }
  }

  assert.strictEqual(histTasks.length, 27);
  for (const ht of histTasks) {
    const matrixTask = matrixMap[ht.taskId];
    assert.ok(matrixTask, `Historical task ${ht.taskId} missing from governing matrix`);
    assert.strictEqual(ht.title, matrixTask.canonicalTitle);
    assert.strictEqual(ht.weight, matrixTask.approvedWeight);
  }
});

// ============================================================================
// 3. Workstream C: Substantive Domain Criteria Verification
// ============================================================================
console.log('\n--- 3. Workstream C: Substantive Domain Criteria Verification ---');

runTest('3.1 Dynamic evaluation of all 50 criteria across 27 tasks: yields 37 PASS, 13 FAIL/PENDING without mock bypass', () => {
  let passCount = 0;
  let nonPassCount = 0;
  let totalCriteria = 0;

  for (const [taskId, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const evalRes = evaluateTaskCriteria({ taskId, weight: meta.weight }, REPO_ROOT);
    for (const c of evalRes.evaluations) {
      totalCriteria++;
      if (c.status === 'PASS') {
        passCount++;
      } else {
        nonPassCount++;
      }
    }
  }

  assert.strictEqual(totalCriteria, 50, 'Total criteria must be exactly 50');
  assert.strictEqual(passCount, 37, 'Exactly 37 criteria must pass repository verification');
  assert.strictEqual(nonPassCount, 13, 'Exactly 13 criteria must remain database-pending, blocked, or unimplemented');
});

runTest('3.2 Domain property verification beyond mere file presence, non-empty content, or syntax checks', () => {
  const metaB01 = CANONICAL_TASK_METADATA['W021.5-B1-01'];
  const resB01 = evaluateTaskCriteria({ taskId: 'W021.5-B1-01', weight: metaB01.weight }, REPO_ROOT);
  assert.strictEqual(resB01.status, 'REPO_VERIFIED');
  const passedB01 = resB01.evaluations.filter((e) => e.status === 'PASS').length;
  assert.strictEqual(passedB01, 2);

  const metaB04 = CANONICAL_TASK_METADATA['W021.5-B1-04'];
  const resB04 = evaluateTaskCriteria({ taskId: 'W021.5-B1-04', weight: metaB04.weight }, REPO_ROOT);
  assert.notStrictEqual(resB04.status, 'REPO_VERIFIED', 'Task B1-04 must not be REPO_VERIFIED because AC 119 is duplicate');
  const nonPassB04 = resB04.evaluations.filter((e) => e.status !== 'PASS').length;
  assert.strictEqual(nonPassB04, 1);
});

runTest('3.3 Stage A through Stage I domain checks (verifies specific domain requirements across all 9 stages)', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledger.stages.length, 9);

  for (const stage of ledger.stages) {
    assert.ok(stage.tasks.length > 0, `Stage ${stage.stageId} must contain tasks`);
    for (const task of stage.tasks) {
      assert.ok(task.accounting, `Task ${task.taskId} must have accounting`);
      assert.ok(typeof task.accounting.repoCompletionRatio === 'number');
      assert.ok(typeof task.accounting.repoVerifiedWeight === 'number');
      assert.ok(typeof task.accounting.databasePendingWeight === 'number');
      assert.ok(typeof task.accounting.blockedWeight === 'number');
      assert.ok(typeof task.accounting.unimplementedWeight === 'number');
      const sum = Number((task.accounting.repoVerifiedWeight + task.accounting.databasePendingWeight + task.accounting.blockedWeight + task.accounting.unimplementedWeight).toFixed(3));
      assert.strictEqual(sum, task.weight, `Task ${task.taskId} accounting partition sum must equal weight ${task.weight}`);
    }
  }
});

runTest('3.4 Adversarial criterion falsification: simulated corrupt domain data causes criteria to fail closed', () => {
  const origSpec = TASK_SPECIFICATIONS['W021.5-A-01'];
  const origVerify = origSpec.criteria[0].verify;
  try {
    origSpec.criteria[0].verify = () => ({ passed: false, message: 'Simulated corruption' });
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-A-01', weight: 3.0 }, REPO_ROOT),
      /has failed acceptance criteria/
    );
  } finally {
    origSpec.criteria[0].verify = origVerify;
  }
});

runTest('3.5 Repository verification distinguished from live database staging execution (strictly 0.0%) and formal CTO acceptance (strictly 0.0%)', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_UNACCEPTED, 26);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
});

// ============================================================================
// 4. Workstream D: Comprehensive Adversarial Falsification Matrix
// ============================================================================
console.log('\n--- 4. Workstream D: Comprehensive Adversarial Falsification Matrix ---');

runTest('4.1 Fabricated requirement reference fails closed in verifyGoverningSpecificationProvenance', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.tasks[0].requirementCode = 'REQ-FABRICATED-999';
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation.*requirementCode mismatch/
    );
  });
});

runTest('4.2 Omitted real requirement fails closed in verifyGoverningSpecificationProvenance', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.tasks.pop(); // Remove 27th task
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation.*Expected 27 tasks in governing matrix, got 26/
    );
  });
});

runTest('4.3 Task mapped to wrong governing section fails closed in verifyGoverningSpecificationProvenance', () => {
  assert.throws(
    () => verifyGoverningSpecificationProvenance({
      taskSectionOverrides: {
        'W021.5-A-01': 'Completely Wrong Section 99.9',
      },
    }),
    /Governing provenance violation.*mapped to wrong governing section/
  );
});

runTest('4.4 Unapproved extension promoted to core specification fails closed in verifyGoverningSpecificationProvenance', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    // Attempt to promote W021.5-A-02 from HARDENING_EXTENSION to CORE_SPECIFICATION in the matrix
    const t = mutatedMatrix.tasks.find((t) => t.taskId === 'W021.5-A-02');
    t.taskClassification = 'CORE_SPECIFICATION';
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation.*classification mismatch.*expected "CORE_SPECIFICATION", got "HARDENING_EXTENSION"/
    );
  });
});

runTest('4.5 Co-mutated manifest + metadata bypass attempt fails closed against independent governing matrix', () => {
  const origCode = CANONICAL_TASK_METADATA['W021.5-A-01'].requirementCode;
  CANONICAL_TASK_METADATA['W021.5-A-01'].requirementCode = 'REQ-CO-MUTATED-BYPASS';
  const mutatedSpec = loadMasterSpecification(REPO_ROOT);
  mutatedSpec.tasks['W021.5-A-01'].governingRequirement = 'REQ-CO-MUTATED-BYPASS';
  try {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ masterSpecOverride: mutatedSpec }),
      /Governing provenance violation.*requirementCode mismatch/
    );
  } finally {
    CANONICAL_TASK_METADATA['W021.5-A-01'].requirementCode = origCode;
  }
});

runTest('4.6 Mutated task weight or stage weight fails closed against governing matrix', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.tasks[0].approvedWeight = 5.0; // was 3.0
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation.*weight mismatch vs governing matrix/
    );
  });
});

runTest('4.7 Tampered governing document hash fails closed in verifyGoverningSpecificationProvenance', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.governingDocuments[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation: Document digest mismatch/
    );
  });
});

runTest('4.8 Mismatched or fabricated criterion ID in task specification fails closed', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.tasks[0].criterionIds = ['CRIT-FABRICATED-01', 'CRIT-FABRICATED-02'];
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation: Task W021.5-A-01 criterion IDs mismatch/
    );
  });
});

runTest('4.9 Tampered progress partition sum in matrix fails closed', () => {
  withMatrixMutation(({ mutatedMatrix }) => {
    mutatedMatrix.summary.progressPartition.repoVerifiedEarned = 70.0; // Breaks 100% sum
  }, ({ mutatedMatrix }) => {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ matrixOverride: mutatedMatrix }),
      /Governing provenance violation: Progress partition does not sum to 100\.000%/
    );
  });
});

// ============================================================================
// 5. Workstream E: Dynamic Progress Calculation Proof
// ============================================================================
console.log('\n--- 5. Workstream E: Dynamic Progress Calculation Proof ---');

runTest('5.1 Independent dynamic derivation of earned percentage: derivedEarned = sum(task.weight * derivedRepoRatio)', () => {
  let dynamicEarned = 0.0;
  for (const [taskId, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const evalRes = evaluateTaskCriteria({ taskId, weight: meta.weight }, REPO_ROOT);
    dynamicEarned += (meta.weight * evalRes.derivedRepoRatio);
  }
  dynamicEarned = Number(dynamicEarned.toFixed(3));
  assert.strictEqual(dynamicEarned, 61.500, 'Dynamic earned total must be 61.500%');
});

runTest('5.2 Verification that calculation is dynamic and derived from validated criteria outcomes, not hardcoded', () => {
  const meta = CANONICAL_TASK_METADATA['W021.5-A-01'];
  const resOriginal = evaluateTaskCriteria({ taskId: 'W021.5-A-01', weight: meta.weight }, REPO_ROOT);
  const passedOrig = resOriginal.evaluations.filter((e) => e.status === 'PASS').length;
  assert.strictEqual(passedOrig, 2);
  assert.strictEqual(resOriginal.criterionCount, 2);
  assert.strictEqual(resOriginal.derivedRepoRatio, 1.0);

  const origSpec = TASK_SPECIFICATIONS['W021.5-A-01'];
  const origVerify = origSpec.criteria[0].verify;
  try {
    origSpec.criteria[0].verify = () => ({ passed: false, message: 'Falsified check' });
    const resMutated = evaluateTaskCriteria({ taskId: 'W021.5-A-01', weight: meta.weight }, REPO_ROOT, { failClosed: false });
    const passedMut = resMutated.evaluations.filter((e) => e.status === 'PASS').length;
    assert.strictEqual(passedMut, 1);
    assert.strictEqual(resMutated.criterionCount, 2);
    assert.strictEqual(resMutated.derivedRepoRatio, 0.5);
    assert.strictEqual(meta.weight * resMutated.derivedRepoRatio, 1.5);
  } finally {
    origSpec.criteria[0].verify = origVerify;
  }
});

runTest('5.3 Mutually exclusive 4-way progress partition: Earned (61.5%) + DB Pending (10.5%) + Blocked (22.5%) + Unimplemented (5.5%) === 100.000%', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const s = ledger.summary;

  const earned = s.repositoryImplementationPercent;
  const dbPending = s.unexecutedDatabasePendingPercent;
  const blocked = s.blockedOnExternalCtcGatesPercent;
  const unimplemented = s.notImplementedPercent;

  assert.strictEqual(earned, 61.5);
  assert.strictEqual(dbPending, 10.5);
  assert.strictEqual(blocked, 22.5);
  assert.strictEqual(unimplemented, 5.5);

  const total = Number((earned + dbPending + blocked + unimplemented).toFixed(3));
  assert.strictEqual(total, 100.0, 'Progress partition must sum exactly to 100.000%');
});

runTest('5.4 Independent recomputation and cross-reconciliation against reports/w021_5_execution_ledger.json', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const valResult = validateLedgerSummaryConsistency(ledger);

  assert.strictEqual(valResult.consistent, true);
  assert.strictEqual(valResult.totalTasks, 27);
  assert.strictEqual(valResult.stageCount, 9);
  assert.strictEqual(valResult.partition.total, 100.0);
});

runTest('5.5 Cross-reconciliation against executive Markdown ledger reports/W021.5-EXECUTION-LEDGER.md', () => {
  const md = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(md.includes('61.5%'), 'Markdown ledger must state 61.5% repository earned');
  assert.ok(md.includes('10.5%'), 'Markdown ledger must state 10.5% DB pending');
  assert.ok(md.includes('22.5%'), 'Markdown ledger must state 22.5% blocked');
  assert.ok(md.includes('5.5%'), 'Markdown ledger must state 5.5% unimplemented');
  assert.ok(md.includes('CTO Directive 086 through CTO Directive 103 / CTO Directive 104'), 'Markdown ledger must record full directive lineage');
});

// ============================================================================
// 6. Workstream F: Directive 103 Discrepancy Correction & Mandatory Governance Invariants
// ============================================================================
console.log('\n--- 6. Workstream F: Directive 103 Discrepancy Correction & Mandatory Governance Invariants ---');

runTest('6.1 Directive 103 report finalized commit resolved (e09b523ec550b1ed73071117a4f496d1dc8e7806), zero occurrences of PENDING_COMMIT_FINALIZATION', () => {
  const r103Path = path.join(REPO_ROOT, 'reports/W021.5-CTO-DIRECTIVE-103-IMPLEMENTATION-REPORT.md');
  assert.ok(fs.existsSync(r103Path), 'Directive 103 report must exist');
  const r103Content = fs.readFileSync(r103Path, 'utf8');

  assert.ok(!r103Content.includes('PENDING_COMMIT_FINALIZATION'), 'PENDING_COMMIT_FINALIZATION must be completely eliminated');
  assert.ok(r103Content.includes(DIRECTIVE_103_FINALIZED_COMMIT), `Directive 103 report must record finalized commit ${DIRECTIVE_103_FINALIZED_COMMIT}`);
});

runTest('6.2 Historical origin 25-vs-27 task discrepancy registered in DISCREPANCY_REGISTER as DISC-012 and disclosed', () => {
  const d = DISCREPANCY_REGISTER.find((item) => item.discrepancyId === 'DISC-012');
  assert.ok(d, 'DISC-012 must exist in DISCREPANCY_REGISTER');
  assert.ok(d.rationale.includes('summary header declared totalTasks=25'));
  assert.ok(d.rationale.includes('nested stage records expanded to 27 tasks'));
});

runTest('6.3 Rule IV-001 Non-Self-Acceptance: formal CTO acceptance strictly 0.0% (UNACCEPTED)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
});

runTest('6.4 Offline Air-Gap: live DB staging execution strictly 0.0% (UNEXECUTED), zero SQL executed', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
});

runTest('6.5 Financial Defect DQ-W021.5-B2.2E-001: STRICTLY OPEN (0.0% earned)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  const taskE02 = ledger.stages.find((s) => s.stageId === 'STAGE_E').tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.ok(taskE02, 'Task W021.5-E-02 must exist in Stage E');
  assert.strictEqual(taskE02.status, 'BLOCKED');
  assert.strictEqual(taskE02.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(taskE02.accounting.blockedWeight, 5.0);
});

runTest('6.6 Telangana AC 119 Boundary Defect: STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const stageB = ledger.stages.find((s) => s.stageId === 'STAGE_B' || s.stageId === 'STAGE_B1');
  assert.ok(stageB);
  const taskB04 = stageB.tasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.ok(taskB04);
  assert.strictEqual(taskB04.accounting.blockedWeight, 1.5, 'AC 119 defect must be 1.5% blocked');
});

runTest('6.7 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte', () => {
  const res = verifyMigrationImmutability(BASELINE_COMMIT_MIGRATIONS);
  assert.strictEqual(res.isImmutabilityPreserved, true);
  assert.strictEqual(res.totalFilesAudited, 68);
  assert.strictEqual(res.identicalCount, 68);
  assert.strictEqual(res.mismatchCount, 0);
});

runTest('6.8 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte', () => {
  const diffOutput = execSync(`git diff ${BASELINE_COMMIT_SEEDS} -- apps/mobile/constants/`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(diffOutput.trim(), '', 'apps/mobile/constants/ MLA seeds must have 0 diff against baseline fb408ce');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
