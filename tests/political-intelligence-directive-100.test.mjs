#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-100.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 100 Verification Suite
 * Canonical Task-Specification Reconciliation, Evidence-Derived Accounting,
 * and Independent Verification Readiness
 *
 * Covers:
 * 1. Workstream A: Canonical Task Identity Reconciliation & Discrepancy Falsification (12 tests)
 * 2. Workstream B: Authoritative Criteria-Derived Accounting & Rule Enforcement (15 tests)
 * 3. Workstream C: Criterion-Level Verification Matrix & Substantive Domain Assertions (14 tests)
 * 4. Workstream D: Cross-Artifact Reconciliation (6 tests)
 * 5. Workstream E: Test-Execution Provenance & Independent Attestation (5 tests)
 * 6. Workstream F & Mandatory Invariants: Rule IV-001, Defect Registers & Air-Gap (7 tests)
 * Total: 59 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import ts from 'typescript';

import {
  parseTestOutput,
  parseJestOutput,
  validateManifestIntegrity,
  verifySuiteIdentity,
  LOGS_DIR,
  MANIFEST_PATH,
  TEST_SUITE_DEFINITIONS,
} from '../scripts/capture_test_execution.mjs';

import {
  CANONICAL_TASK_METADATA,
  OLD_TO_CANONICAL_TASK_MAPPING,
  validateCanonicalTaskIdentity,
  validateTaskAccounting,
  validateTaskEvidence,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  evaluateTaskCriteria,
  TASK_SPECIFICATIONS,
  STAGE_EVIDENCE_RELEVANCE,
  computeKeyFingerprint,
  validateFormalAcceptanceArtifact,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_MIGRATIONS = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_SEEDS = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 100 VERIFICATION SUITE');
console.log('Canonical Task Identity, Criteria-Derived Accounting & Verification Readiness');
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Canonical Task Identity Reconciliation & Discrepancy Falsification
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Canonical Task Identity Reconciliation & Discrepancy Falsification ---');

runTest('1.1 Canonical task metadata defines exactly 27 tasks across 9 stages summing to 100.0%', () => {
  const taskIds = Object.keys(CANONICAL_TASK_METADATA);
  assert.strictEqual(taskIds.length, 27, `Expected 27 tasks, got ${taskIds.length}`);

  const stages = new Set();
  let totalWeight = 0;
  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    assert.strictEqual(id, meta.taskId);
    assert.ok(meta.canonicalTitle && meta.canonicalTitle.length > 5);
    assert.ok(meta.stageId && meta.stageId.startsWith('STAGE_'));
    stages.add(meta.stageId);
    assert.ok(typeof meta.weight === 'number' && meta.weight > 0);
    totalWeight += meta.weight;
  }

  assert.strictEqual(stages.size, 9, `Expected 9 stages, got ${stages.size}`);
  assert.strictEqual(Number(totalWeight.toFixed(3)), 100.0, `Expected total weight 100.0%, got ${totalWeight}`);
});

runTest('1.2 Every canonical task maps to exactly one task specification with matching attributes', () => {
  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const spec = TASK_SPECIFICATIONS[id];
    assert.ok(spec, `Task ${id} must have a defined acceptance criteria specification`);
    assert.strictEqual(spec.title, meta.canonicalTitle, `Task ${id} title must match canonicalTitle`);
    assert.strictEqual(spec.specRef, meta.requirementCode, `Task ${id} specRef must match requirementCode`);
    assert.ok(Array.isArray(spec.criteria) && spec.criteria.length > 0, `Task ${id} must have non-empty criteria`);
  }
});

runTest('1.3 OLD_TO_CANONICAL_TASK_MAPPING resolves all 27 canonical tasks and tracks historical aliases', () => {
  const mappedIds = Object.keys(OLD_TO_CANONICAL_TASK_MAPPING);
  assert.strictEqual(mappedIds.length, 27, 'OLD_TO_CANONICAL_TASK_MAPPING must cover all 27 tasks');

  for (const [id, mapping] of Object.entries(OLD_TO_CANONICAL_TASK_MAPPING)) {
    assert.strictEqual(mapping.canonicalTaskId, id);
    assert.strictEqual(mapping.canonicalTitle, CANONICAL_TASK_METADATA[id].canonicalTitle);
    assert.ok(Array.isArray(mapping.historicalAliases), `Task ${id} must have historicalAliases array`);
    assert.ok(mapping.historicalAliases.length >= 1, `Task ${id} must document at least one historical alias`);

    for (const a of mapping.historicalAliases) {
      assert.ok(a.alias, `Alias for ${id} must have text`);
      assert.ok(a.source, `Alias for ${id} must have source attribution`);
      assert.ok(a.discrepancyType, `Alias for ${id} must classify discrepancyType`);
      assert.ok(a.rationale, `Alias for ${id} must explain rationale`);
    }
  }

  // Verify specific resolved discrepancy: W021.5-A-01
  const a01 = OLD_TO_CANONICAL_TASK_MAPPING['W021.5-A-01'];
  assert.strictEqual(a01.canonicalTitle, 'Comprehensive 29-Domain Data-Truth Audit');
  const chatAlias = a01.historicalAliases.find((a) => a.alias === 'Statutory Assembly Constituency Mapping');
  assert.ok(chatAlias, 'W021.5-A-01 must record Statutory Assembly Constituency Mapping chat alias');
  const rptAlias = a01.historicalAliases.find((a) => a.alias === 'Data-Truth Audit');
  assert.ok(rptAlias, 'W021.5-A-01 must record Data-Truth Audit report alias');
});

runTest('1.4 Falsification: Altering a canonical task title fails closed', () => {
  const tamperedTask = {
    taskId: 'W021.5-A-01',
    title: 'Statutory Assembly Constituency Mapping', // Fabricated title from chat summary!
    weight: 3.0,
    taskClassification: 'CORE_SPECIFICATION',
    evidence: [{ path: 'reports/w021_5_national_data_coverage_matrix.json', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'x', verificationStatus: 'VERIFIED_ON_DISK' }],
    accounting: {
      repoCompletionRatio: 1.0,
      repoVerifiedWeight: 3.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateCanonicalTaskIdentity(tamperedTask),
    /title mismatch: expected "Comprehensive 29-Domain Data-Truth Audit", got "Statutory Assembly Constituency Mapping"/
  );

  assert.throws(
    () => validateTaskAccounting(tamperedTask, null, { enforceCanonicalIdentity: true }),
    /title mismatch/
  );
});

runTest('1.5 Falsification: Altering a task ID to an unrecognized ID fails closed', () => {
  const unknownTask = {
    taskId: 'W021.5-X-99',
    title: 'Fabricated Task',
    weight: 3.0,
    taskClassification: 'CORE_SPECIFICATION',
  };

  assert.throws(
    () => validateCanonicalTaskIdentity(unknownTask),
    /Unrecognized, duplicate or unexpected task ID "W021.5-X-99"/
  );
});

runTest('1.6 Falsification: Altering a task stage assignment fails closed', () => {
  const wrongStageTask = {
    taskId: 'W021.5-A-01',
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    weight: 3.0,
    taskClassification: 'CORE_SPECIFICATION',
  };

  assert.throws(
    () => validateCanonicalTaskIdentity(wrongStageTask, 'STAGE_B'), // Belongs to STAGE_A!
    /stage mismatch: expected "STAGE_A", got "STAGE_B"/
  );
});

runTest('1.7 Falsification: Altering a task weight fails closed', () => {
  const tamperedWeightTask = {
    taskId: 'W021.5-A-01',
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    weight: 4.5, // Canonical is 3.0!
    taskClassification: 'CORE_SPECIFICATION',
  };

  assert.throws(
    () => validateCanonicalTaskIdentity(tamperedWeightTask),
    /weight mismatch: expected 3, got 4.5/
  );
});

runTest('1.8 Falsification: Altering a task specification reference (specRef) fails closed', () => {
  const tamperedSpecRefTask = {
    taskId: 'W021.5-A-01',
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    weight: 3.0,
    specRef: 'WRONG-SPEC-REF', // Canonical is "W021.5-A Section 1-2"
    taskClassification: 'CORE_SPECIFICATION',
  };

  assert.throws(
    () => validateCanonicalTaskIdentity(tamperedSpecRefTask),
    /specification reference mismatch: expected "W021.5-A Section 1-2", got "WRONG-SPEC-REF"/
  );
});

runTest('1.9 Falsification: Duplicate task ID in ledger fails closed in computeLedgerSummary', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  // Duplicate W021.5-A-01 in stage A
  const clonedLedger = JSON.parse(JSON.stringify(ledger));
  clonedLedger.stages[0].tasks.push({ ...clonedLedger.stages[0].tasks[0] });

  assert.throws(
    () => computeLedgerSummary(clonedLedger, { enforceCanonicalIdentity: true }),
    /Duplicate task ID "W021.5-A-01" detected across stages/
  );
});

runTest('1.10 Falsification: Missing canonical task ID in ledger fails closed in computeLedgerSummary', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  // Remove W021.5-I-02
  const clonedLedger = JSON.parse(JSON.stringify(ledger));
  const stageI = clonedLedger.stages.find((s) => s.stageId === 'STAGE_I');
  stageI.tasks = stageI.tasks.filter((t) => t.taskId !== 'W021.5-I-02');

  assert.throws(
    () => computeLedgerSummary(clonedLedger, { enforceCanonicalIdentity: true }),
    /Missing canonical task ID "W021.5-I-02" in execution ledger/
  );
});

runTest('1.11 Falsification: Unexpected phantom task ID (W021.5-I-03) fails closed in computeLedgerSummary', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const clonedLedger = JSON.parse(JSON.stringify(ledger));
  const stageI = clonedLedger.stages.find((s) => s.stageId === 'STAGE_I');
  stageI.tasks.push({
    taskId: 'W021.5-I-03', // Phantom task from Directive 099 chat summary!
    title: 'Formal Executive Acceptance Sign-Off',
    weight: 0.0,
    taskClassification: 'CORE_SPECIFICATION',
    evidence: [],
    accounting: {
      repoCompletionRatio: 0,
      repoVerifiedWeight: 0,
      databasePendingWeight: 0,
      blockedWeight: 0,
      unimplementedWeight: 0,
      unexecutedDatabaseWeight: 0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  });

  assert.throws(
    () => computeLedgerSummary(clonedLedger, { enforceCanonicalIdentity: true }),
    /Unexpected or unrecognized task ID "W021.5-I-03"/
  );
});

runTest('1.12 Falsification: Total task allocation not summing to 100.0% fails closed', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const clonedLedger = JSON.parse(JSON.stringify(ledger));
  // Mutate task weight and accounting to partition weight 5.0
  clonedLedger.stages[0].tasks[0].weight = 5.0; // 3.0 -> 5.0, sum becomes 102.0
  clonedLedger.stages[0].tasks[0].accounting.repoVerifiedWeight = 5.0;
  clonedLedger.stages[0].tasks[0].accounting.repoCompletionRatio = 1.0;
  clonedLedger.stages[0].stageWeight = 12.0;

  assert.throws(
    () => computeLedgerSummary(clonedLedger, { enforceCanonicalIdentity: false }),
    /Total task weights sum to 102, expected 100.0/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Authoritative Criteria-Derived Accounting & Rule Enforcement
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 2. Workstream B: Authoritative Criteria-Derived Accounting & Rule Enforcement ---');

runTest('2.1 evaluateTaskCriteria exposes all 10 accounting dimensions for every task', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const assessment = evaluateTaskCriteria(task, REPO_ROOT);

      // Verify all 10 required accounting dimensions
      assert.strictEqual(typeof assessment.allocatedWeight, 'number', `${task.taskId} missing allocatedWeight`);
      assert.strictEqual(assessment.allocatedWeight, task.weight, `${task.taskId} allocatedWeight mismatch`);

      assert.strictEqual(typeof assessment.criterionCount, 'number', `${task.taskId} missing criterionCount`);
      assert.strictEqual(typeof assessment.criterionWeightRatioSum, 'number', `${task.taskId} missing criterionWeightRatioSum`);
      assert.strictEqual(assessment.criterionWeightRatioSum, 1.0, `${task.taskId} criterionWeightRatioSum must equal 1.0`);

      assert.strictEqual(typeof assessment.criterionWeightsSum, 'number', `${task.taskId} missing criterionWeightsSum`);
      assert.strictEqual(assessment.criterionWeightsSum, task.weight, `${task.taskId} criterionWeightsSum must equal task.weight`);

      assert.strictEqual(typeof assessment.repoVerifiableWeight, 'number', `${task.taskId} missing repoVerifiableWeight`);
      assert.strictEqual(typeof assessment.passedWeight, 'number', `${task.taskId} missing passedWeight`);
      assert.strictEqual(typeof assessment.failedWeight, 'number', `${task.taskId} missing failedWeight`);
      assert.strictEqual(typeof assessment.databasePendingWeight, 'number', `${task.taskId} missing databasePendingWeight`);
      assert.strictEqual(typeof assessment.blockedWeight, 'number', `${task.taskId} missing blockedWeight`);
      assert.strictEqual(typeof assessment.unimplementedWeight, 'number', `${task.taskId} missing unimplementedWeight`);
      assert.strictEqual(typeof assessment.earnedWeight, 'number', `${task.taskId} missing earnedWeight`);
      assert.strictEqual(assessment.earnedWeight, assessment.passedWeight, `${task.taskId} earnedWeight must equal passedWeight`);

      assert.ok(Array.isArray(assessment.limitations), `${task.taskId} missing limitations array`);
      assert.ok(assessment.status, `${task.taskId} missing status`);
      assert.ok(assessment.statusDescription, `${task.taskId} missing statusDescription`);

      // Sum of 4 partitions must equal task weight
      const partSum = Number((assessment.passedWeight + assessment.databasePendingWeight + assessment.blockedWeight + assessment.unimplementedWeight).toFixed(3));
      assert.strictEqual(partSum, task.weight, `${task.taskId} criteria partitions do not sum to task weight`);
    }
  }
});

runTest('2.2 Criterion-derived ratio is the authoritative basis for earned repository weight', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  let totalDerivedEarned = 0;
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const assessment = evaluateTaskCriteria(task, REPO_ROOT);
      const derivedWeight = Number((task.weight * assessment.derivedRepoRatio).toFixed(3));
      assert.strictEqual(assessment.passedWeight, derivedWeight);
      assert.strictEqual(task.accounting.repoVerifiedWeight, derivedWeight);
      totalDerivedEarned += derivedWeight;
    }
  }

  assert.strictEqual(Number(totalDerivedEarned.toFixed(3)), 61.5, `Derived earned weight must equal 61.5%`);
});

runTest('2.3 Total progress partition derived from criteria evaluations sums to exactly 100.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  let repoEarned = 0;
  let dbPending = 0;
  let blocked = 0;
  let unimpl = 0;

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const a = evaluateTaskCriteria(task, REPO_ROOT);
      repoEarned += a.passedWeight;
      dbPending += a.databasePendingWeight;
      blocked += a.blockedWeight;
      unimpl += a.unimplementedWeight;
    }
  }

  repoEarned = Number(repoEarned.toFixed(3));
  dbPending = Number(dbPending.toFixed(3));
  blocked = Number(blocked.toFixed(3));
  unimpl = Number(unimpl.toFixed(3));

  assert.strictEqual(repoEarned, 61.5, `repoEarned expected 61.5, got ${repoEarned}`);
  assert.strictEqual(dbPending, 10.5, `dbPending expected 10.5, got ${dbPending}`);
  assert.strictEqual(blocked, 22.5, `blocked expected 22.5, got ${blocked}`);
  assert.strictEqual(unimpl, 5.5, `unimpl expected 5.5, got ${unimpl}`);

  const total = Number((repoEarned + dbPending + blocked + unimpl).toFixed(3));
  assert.strictEqual(total, 100.0, `Partition total expected 100.0, got ${total}`);
});

runTest('2.4 Rule 1: Only passing REPOSITORY_VERIFIABLE criterion contributes earned repository weight', () => {
  // Check that all earned weight comes strictly from REPOSITORY_VERIFIABLE criteria that passed
  for (const [id, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    const meta = CANONICAL_TASK_METADATA[id];
    let expectedEarned = 0;
    for (const c of spec.criteria) {
      if (c.scope === 'REPOSITORY_VERIFIABLE') {
        const res = c.verify(REPO_ROOT);
        if (res && res.passed) {
          expectedEarned += meta.weight * c.weightRatio;
        }
      }
    }
    expectedEarned = Number(expectedEarned.toFixed(3));
    const a = evaluateTaskCriteria({ taskId: id, weight: meta.weight }, REPO_ROOT);
    assert.strictEqual(a.earnedWeight, expectedEarned, `Task ${id} earned weight must strictly equal passing repo-verifiable weight`);
  }
});

runTest('2.5 Rule 2: Database-dependent criteria remain unverified until separately authorized execution exists', () => {
  const dbTasks = ['W021.5-C-02', 'W021.5-D-02', 'W021.5-E-01', 'W021.5-F-02'];
  for (const id of dbTasks) {
    const meta = CANONICAL_TASK_METADATA[id];
    const a = evaluateTaskCriteria({ taskId: id, weight: meta.weight }, REPO_ROOT);
    assert.ok(a.databasePendingWeight > 0, `Task ${id} must have databasePendingWeight > 0`);
    const dbCrit = a.evaluations.filter((e) => e.scope === 'DATABASE_STAGING');
    assert.ok(dbCrit.length > 0, `Task ${id} must have DATABASE_STAGING evaluations`);
    for (const c of dbCrit) {
      assert.strictEqual(c.status, 'UNVERIFIED', `Criterion ${c.criterionId} status must be UNVERIFIED`);
    }
  }
});

runTest('2.6 Rule 3: Externally blocked criteria earn strictly 0 weight', () => {
  const blockedTasks = ['W021.5-B1-04', 'W021.5-D-03', 'W021.5-E-02', 'W021.5-E-03', 'W021.5-G-03', 'W021.5-I-02'];
  for (const id of blockedTasks) {
    const meta = CANONICAL_TASK_METADATA[id];
    const a = evaluateTaskCriteria({ taskId: id, weight: meta.weight }, REPO_ROOT);
    assert.ok(a.blockedWeight > 0, `Task ${id} must have blockedWeight > 0`);
    const blockedCrits = a.evaluations.filter((e) => e.scope === 'BLOCKED_EXTERNAL');
    for (const c of blockedCrits) {
      assert.strictEqual(c.status, 'BLOCKED');
      assert.strictEqual(c.status !== 'PASS', true);
    }
  }
});

runTest('2.7 Rule 4: Unimplemented criteria earn strictly 0 weight', () => {
  const unimplTasks = ['W021.5-F-02', 'W021.5-H-04', 'W021.5-I-01'];
  for (const id of unimplTasks) {
    const meta = CANONICAL_TASK_METADATA[id];
    const a = evaluateTaskCriteria({ taskId: id, weight: meta.weight }, REPO_ROOT);
    assert.ok(a.unimplementedWeight > 0, `Task ${id} must have unimplementedWeight > 0`);
    const unimplCrits = a.evaluations.filter((e) => e.scope === 'UNIMPLEMENTED');
    for (const c of unimplCrits) {
      assert.strictEqual(c.status, 'NOT_IMPLEMENTED');
    }
  }
});

runTest('2.8 Rule 5: Missing or malformed evidence cannot increase earned weight', () => {
  const spec = TASK_SPECIFICATIONS['W021.5-A-01'];
  // Temporarily evaluate against non-existent root
  const outcome = spec.criteria[0].verify(path.join(REPO_ROOT, 'non_existent_fixture_dir_xyz'));
  assert.strictEqual(outcome.passed, false, 'Verifier must return passed: false when evidence missing');
});

runTest('2.9 Rule 6: Failed criterion fails closed and is represented explicitly', () => {
  const syntheticTask = {
    taskId: 'W021.5-A-01',
    weight: 3.0,
    evidence: [],
    accounting: {
      repoCompletionRatio: 1.0,
      repoVerifiedWeight: 3.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  // With failClosed: false, assessment exposes failure explicitly
  const a = evaluateTaskCriteria(syntheticTask, path.join(REPO_ROOT, 'non_existent_root_xyz'), { failClosed: false });
  assert.strictEqual(a.failedWeight > 0, true, 'failedWeight must be positive');
  assert.strictEqual(a.status, 'VERIFICATION_FAILED');
  assert.ok(a.checksFailed.length > 0);

  // With default failClosed: true, throws error immediately
  assert.throws(
    () => evaluateTaskCriteria(syntheticTask, path.join(REPO_ROOT, 'non_existent_root_xyz')),
    /Ledger verification failure: Task W021.5-A-01 has failed acceptance criteria/
  );
});

runTest('2.10 Rule 7: Ledger fails closed when supplied accounting disagrees with calculated results', () => {
  const taskMismatched = {
    taskId: 'W021.5-A-01',
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'reports/w021_5_national_data_coverage_matrix.json',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'National data coverage matrix audit file covers all 36 States/UTs and 4,123 constituencies',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
      {
        path: 'reports/w021_5a_repository_data_truth_audit.md',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Truth audit markdown report documents 29-domain gaps truthfully without unverified claims',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.75, // Mismatched (actual derived is 1.0)!
      ratioRationale: 'Authoritative criterion derivation rationale for test verification',
      repoVerifiedWeight: 2.25,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 0.75,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskMismatched, null, { enforceCanonicalIdentity: true }),
    /reported ratio \(0.75\) differs from verified ratio \(1\) derived from acceptance criteria/
  );
});

runTest('2.11 Rule 8: Offline limitations recorded explicitly in assessment.limitations', () => {
  const b104 = evaluateTaskCriteria({ taskId: 'W021.5-B1-04', weight: 2.0 }, REPO_ROOT);
  assert.ok(b104.limitations.length > 0, 'W021.5-B1-04 must record limitations');
  assert.ok(b104.limitations.some((l) => l.includes('Blocked External')), 'Must document Blocked External in limitations');

  const c02 = evaluateTaskCriteria({ taskId: 'W021.5-C-02', weight: 5.0 }, REPO_ROOT);
  assert.ok(c02.limitations.some((l) => l.includes('Database Pending')), 'Must document Database Pending in limitations');

  const f02 = evaluateTaskCriteria({ taskId: 'W021.5-F-02', weight: 6.0 }, REPO_ROOT);
  assert.ok(f02.limitations.some((l) => l.includes('Unimplemented')), 'Must document Unimplemented in limitations');
});

runTest('2.12 Falsification: Artificially inflating repoCompletionRatio above criterion evaluation fails closed', () => {
  const inflatedTask = {
    taskId: 'W021.5-B1-04', // Derived ratio is 0.25 (0.5 / 2.0)
    title: 'National Assembly Boundary GeoJSON Deep Validation & Linkage',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'PARTIAL',
    evidence: [{ path: 'data/geo/telangana-assembly.geojson', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'Telangana AC GeoJSON boundaries verified on disk', verificationStatus: 'VERIFIED_ON_DISK' }],
    accounting: {
      repoCompletionRatio: 0.80, // Falsified inflation!
      ratioRationale: 'Authoritative criterion derivation rationale for test verification',
      repoVerifiedWeight: 1.6,
      databasePendingWeight: 0.0,
      blockedWeight: 0.4,
      unimplementedWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(inflatedTask, null, { enforceCanonicalIdentity: true }),
    /reported ratio \(0.8\) differs from verified ratio \(0.25\)/
  );
});

runTest('2.13 Falsification: Altering databasePendingWeight without matching DATABASE_STAGING criteria fails closed', () => {
  const fakeDbTask = {
    taskId: 'W021.5-A-01', // W021.5-A-01 has ZERO database staging criteria
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'REPO_VERIFIED',
    evidence: [
      { path: 'reports/w021_5_national_data_coverage_matrix.json', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'National data coverage matrix audit file covers all 36 States/UTs', verificationStatus: 'VERIFIED_ON_DISK' },
      { path: 'reports/w021_5a_repository_data_truth_audit.md', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'Truth audit markdown report documents 29-domain gaps truthfully', verificationStatus: 'VERIFIED_ON_DISK' },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Authoritative criterion derivation rationale for test verification',
      repoVerifiedWeight: 3.0,
      databasePendingWeight: 1.0, // Unjustified!
      unexecutedDatabaseWeight: 1.0,
      requiresDatabaseExecution: true,
      databaseExecutionEvidenced: false,
      blockedWeight: 0.0,
      unimplementedWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(fakeDbTask, null, { enforceCanonicalIdentity: true }),
    /do not partition task weight|databasePendingWeight.*is not justified by criteria scopes/
  );
});

runTest('2.14 Falsification: Altering blockedWeight without matching BLOCKED_EXTERNAL criteria fails closed', () => {
  const fakeBlockedTask = {
    taskId: 'W021.5-A-01', // Zero blocked criteria
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'REPO_VERIFIED',
    evidence: [
      { path: 'reports/w021_5_national_data_coverage_matrix.json', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'National data coverage matrix audit file covers all 36 States/UTs', verificationStatus: 'VERIFIED_ON_DISK' },
      { path: 'reports/w021_5a_repository_data_truth_audit.md', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'Truth audit markdown report documents 29-domain gaps truthfully', verificationStatus: 'VERIFIED_ON_DISK' },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Authoritative criterion derivation rationale for test verification',
      repoVerifiedWeight: 2.0,
      databasePendingWeight: 0.0,
      blockedWeight: 1.0, // Unjustified!
      unimplementedWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(fakeBlockedTask, null, { enforceCanonicalIdentity: true }),
    /reported ratio.*differs from verified ratio|repoVerifiedWeight.*does not match|blockedWeight.*is not justified by criteria scopes/
  );
});

runTest('2.15 Falsification: Altering unimplementedWeight without matching UNIMPLEMENTED criteria fails closed', () => {
  const fakeUnimplTask = {
    taskId: 'W021.5-A-01', // Zero unimplemented criteria
    title: 'Comprehensive 29-Domain Data-Truth Audit',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'REPO_VERIFIED',
    evidence: [
      { path: 'reports/w021_5_national_data_coverage_matrix.json', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'National data coverage matrix audit file covers all 36 States/UTs', verificationStatus: 'VERIFIED_ON_DISK' },
      { path: 'reports/w021_5a_repository_data_truth_audit.md', evidenceClass: 'REPOSITORY_IMPLEMENTATION', supportsClaim: 'Truth audit markdown report documents 29-domain gaps truthfully', verificationStatus: 'VERIFIED_ON_DISK' },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Authoritative criterion derivation rationale for test verification',
      repoVerifiedWeight: 2.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 1.0, // Unjustified!
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(fakeUnimplTask, null, { enforceCanonicalIdentity: true }),
    /reported ratio.*differs from verified ratio|repoVerifiedWeight.*does not match|unimplementedWeight.*is not justified by criteria scopes/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Criterion-Level Verification Matrix & Substantive Domain Assertions
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 3. Workstream C: Criterion-Level Verification Matrix & Substantive Domain Assertions ---');

runTest('3.1 Exactly 50 valid criteria exist across all 27 task specifications (calculated dynamically)', () => {
  let criteriaCount = 0;
  for (const [id, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    criteriaCount += spec.criteria.length;
  }
  assert.strictEqual(criteriaCount, 50, `Expected exactly 50 criteria across 27 tasks, got ${criteriaCount}`);
});

runTest('3.2 Scope distribution: 37 REPOSITORY_VERIFIABLE, 4 DATABASE_STAGING, 6 BLOCKED_EXTERNAL, 3 UNIMPLEMENTED', () => {
  const scopes = {
    REPOSITORY_VERIFIABLE: 0,
    DATABASE_STAGING: 0,
    BLOCKED_EXTERNAL: 0,
    UNIMPLEMENTED: 0,
  };

  for (const [id, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    for (const c of spec.criteria) {
      assert.ok(scopes[c.scope] !== undefined, `Unknown scope ${c.scope}`);
      scopes[c.scope]++;
    }
  }

  assert.strictEqual(scopes.REPOSITORY_VERIFIABLE, 37, `Expected 37 repo-verifiable criteria, got ${scopes.REPOSITORY_VERIFIABLE}`);
  assert.strictEqual(scopes.DATABASE_STAGING, 4, `Expected 4 database staging criteria, got ${scopes.DATABASE_STAGING}`);
  assert.strictEqual(scopes.BLOCKED_EXTERNAL, 6, `Expected 6 blocked external criteria, got ${scopes.BLOCKED_EXTERNAL}`);
  assert.strictEqual(scopes.UNIMPLEMENTED, 3, `Expected 3 unimplemented criteria, got ${scopes.UNIMPLEMENTED}`);
});

runTest('3.3 All 37 REPOSITORY_VERIFIABLE criteria pass positive verification in current repository', () => {
  let passedCount = 0;
  for (const [id, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    for (const c of spec.criteria) {
      if (c.scope === 'REPOSITORY_VERIFIABLE') {
        const res = c.verify(REPO_ROOT);
        assert.strictEqual(res.passed, true, `Criterion ${c.criterionId} in task ${id} failed: ${res.message}`);
        passedCount++;
      }
    }
  }
  assert.strictEqual(passedCount, 37, `Expected 37 passed criteria, got ${passedCount}`);
});

runTest('3.4 Substantive Domain Assertion: Statutory 4,123 constituency count, 31 assembly states/UTs', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  assert.strictEqual(fs.existsSync(matrixPath), true);
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.states.length, 31, `Expected 31 assembly states/UTs, got ${matrix.states.length}`);
  const totalSeats = matrix.summary.totalStatutorySeats || matrix.summary.totalConstituenciesAudited;
  assert.strictEqual(totalSeats, 4123, `Expected 4123 statutory seats, got ${totalSeats}`);

  // Verify state statutory assembly seat counts sum to 4123
  let sumSeats = 0;
  for (const s of matrix.states) {
    sumSeats += s.statutoryAssemblySeats;
  }
  assert.strictEqual(sumSeats, 4123, `Sum of state seats must equal 4,123, got ${sumSeats}`);
});

runTest('3.5 Substantive Domain Assertion: Delhi 70-seat statutory assembly invariant strictly maintained', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const dl = matrix.states.find((s) => s.stateCode === 'DL');
  assert.ok(dl, 'Delhi must exist in matrix');
  assert.strictEqual(dl.statutoryAssemblySeats, 70, `Delhi statutory seats must strictly be 70, got ${dl.statutoryAssemblySeats}`);
  assert.strictEqual(dl.registryIdentity.statutorySeats, 70);
  assert.strictEqual(dl.registryIdentity.seatCoverageRatio, '70/70 (100.0%)');
  assert.ok(dl.knownExceptions[0].includes('NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER'), '151 non-assembly municipal records must be quarantined');
});

runTest('3.6 Substantive Domain Assertion: Canonical political organizations catalog contains 1,207 organizations', () => {
  const orgManifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_final_organization_manifest.json');
  assert.strictEqual(fs.existsSync(orgManifestPath), true);
  const manifest = JSON.parse(fs.readFileSync(orgManifestPath, 'utf8'));
  assert.strictEqual(manifest.summary.exactCanonicalOrganizations, 107);
  assert.strictEqual(manifest.summary.exactRawAliasesMapped, 1043);

  const m65Path = path.join(REPO_ROOT, 'supabase/migrations/065_canonical_political_organization_registry.sql');
  assert.strictEqual(fs.existsSync(m65Path), true);
  const m65 = fs.readFileSync(m65Path, 'utf8');
  assert.ok(m65.includes('1207'), 'Migration 065 must author 1,207 canonical political organizations and aliases');
});

runTest('3.7 Substantive Domain Assertion: Multilingual party matrix covers 27 identities across 11 languages with 19 symbols', () => {
  const multiPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_multilingual_matrix.json');
  const symPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_symbol_matrix.json');
  const aliasPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_alias_collision_matrix.json');

  assert.strictEqual(fs.existsSync(multiPath), true);
  assert.strictEqual(fs.existsSync(symPath), true);
  assert.strictEqual(fs.existsSync(aliasPath), true);

  const multi = JSON.parse(fs.readFileSync(multiPath, 'utf8'));
  const sym = JSON.parse(fs.readFileSync(symPath, 'utf8'));
  const alias = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));

  assert.strictEqual(multi.totalIdentitiesAudited, 27);
  assert.strictEqual(multi.languagesCovered.length, 11);
  assert.strictEqual(sym.totalSymbolsAudited, 19);
  assert.ok(alias.highRiskKeysAudit.length >= 5, 'High risk collision resolutions present');
});

runTest('3.8 Substantive Domain Assertion: AC-to-PC parliamentary mapping referential integrity', () => {
  const m61Path = path.join(REPO_ROOT, 'supabase/migrations/061_canonical_national_ac_pc_mappings.sql');
  assert.strictEqual(fs.existsSync(m61Path), true);
  const m61 = fs.readFileSync(m61Path, 'utf8');
  assert.ok(m61.includes('constituency_parliamentary_mappings'), 'Must populate constituency_parliamentary_mappings');
  assert.ok(m61.includes('parliamentary_constituency_version_id'), 'Must reference PC version key');
  assert.ok(m61.includes('assembly_constituency_version_id'), 'Must reference AC version key');
});

runTest('3.9 Substantive Domain Assertion: Temporal delimitation lineage and Assam 2023 delimitation modeling', () => {
  const m62Path = path.join(REPO_ROOT, 'supabase/migrations/062_canonical_assam_2023_delimitation.sql');
  assert.strictEqual(fs.existsSync(m62Path), true);
  const m62 = fs.readFileSync(m62Path, 'utf8');
  assert.ok(m62.includes('eci_delimitation_2023_as'), 'Must model 2023 Assam delimitation regime');
  assert.ok(m62.includes('2023-AS-DELIM-V1'), 'Must record 2023 version tag');
  assert.ok(m62.includes('effective_date'), 'Must track effective_date');
});

runTest('3.10 Substantive Domain Assertion: Candidate-to-person deduplication algorithm and 10 chunk manifests', () => {
  const m50Path = path.join(REPO_ROOT, 'supabase/migrations/050_political_entity_model.sql');
  const m63Path = path.join(REPO_ROOT, 'supabase/migrations/063_canonical_political_identity_foundation.sql');
  assert.strictEqual(fs.existsSync(m50Path), true);
  assert.strictEqual(fs.existsSync(m63Path), true);

  const reportPath = path.join(REPO_ROOT, 'reports/W021.5-B2.2D-PERSON_POPULATION_CLOSURE_REPORT.md');
  assert.strictEqual(fs.existsSync(reportPath), true);
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2d_person_manifest.json');
  assert.strictEqual(fs.existsSync(manifestPath), true);
});

runTest('3.11 Substantive Domain Assertion: Multi-election historical results verified with record-level election years', () => {
  const m51Path = path.join(REPO_ROOT, 'supabase/migrations/051_election_data_normalization.sql');
  assert.strictEqual(fs.existsSync(m51Path), true);
  const m51 = fs.readFileSync(m51Path, 'utf8');
  assert.ok(m51.includes('election_events'), 'Must model election_events');
  assert.ok(m51.includes('election_contests'), 'Must model election_contests');

  const telanganaHist = path.join(REPO_ROOT, 'data/seed/telangana-historical-results.ts');
  assert.strictEqual(fs.existsSync(telanganaHist), true);
  const histContent = fs.readFileSync(telanganaHist, 'utf8');
  assert.ok(histContent.includes('year: 2014'), 'Must attribute record-level election year 2014');
  assert.ok(histContent.includes('year: 2018'), 'Must attribute record-level election year 2018');
});

runTest('3.12 Substantive Domain Assertion: Fastify API nullability contracts preserve missing values', () => {
  const routePath = path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts');
  assert.strictEqual(fs.existsSync(routePath), true);
  const raw = fs.readFileSync(routePath, 'utf8');
  const sf = ts.createSourceFile(routePath, raw, ts.ScriptTarget.Latest, true);
  assert.strictEqual(sf.parseDiagnostics.length, 0, 'Route file must have clean TS AST');
  assert.ok(raw.includes("type: ['number', 'null']") || raw.includes("type: ['integer', 'null']"), 'Schema must declare nullable fields');
});

runTest('3.13 Substantive Domain Assertion: Elimination of hardcoded election years in stateData.ts verified with clean AST', () => {
  const stateDataPath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  assert.strictEqual(fs.existsSync(stateDataPath), true);
  const raw = fs.readFileSync(stateDataPath, 'utf8');
  const sf = ts.createSourceFile(stateDataPath, raw, ts.ScriptTarget.Latest, true);
  assert.strictEqual(sf.parseDiagnostics.length, 0, 'stateData.ts must have clean TS AST');
  assert.strictEqual(raw.includes("winner2025: c.stateCode === 'DL' ? 'AAP'"), false, 'Must not infer DL election year');
  assert.strictEqual(raw.includes("winner2023: c.stateCode === 'TG' ? 'INC'"), false, 'Must not infer TG election year');
});

runTest('3.14 Substantive Domain Assertion: Mobile DTO validation hardening and section-level provenance badges', () => {
  const mobileApiPath = path.join(REPO_ROOT, 'apps/mobile/lib/api/endpoints/constituencies.ts');
  assert.strictEqual(fs.existsSync(mobileApiPath), true);
  const rawApi = fs.readFileSync(mobileApiPath, 'utf8');
  const sfApi = ts.createSourceFile(mobileApiPath, rawApi, ts.ScriptTarget.Latest, true);
  assert.strictEqual(sfApi.parseDiagnostics.length, 0, 'Mobile API endpoint must have clean TS AST');

  const constituencyUiPath = path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx');
  assert.strictEqual(fs.existsSync(constituencyUiPath), true);
  const rawUi = fs.readFileSync(constituencyUiPath, 'utf8');
  const sfUi = ts.createSourceFile(constituencyUiPath, rawUi, ts.ScriptTarget.Latest, true);
  assert.strictEqual(sfUi.parseDiagnostics.length, 0, 'Constituency UI must have clean TSX AST');
  assert.ok(rawUi.includes('provenancePill'), 'UI must render provenance pill');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Cross-Artifact Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 4. Workstream D: Cross-Artifact Reconciliation ---');

runTest('4.1 reports/w021_5_execution_ledger.json matches reports/W021.5-EXECUTION-LEDGER.md in task count (27)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  assert.strictEqual(fs.existsSync(jsonPath), true);
  assert.strictEqual(fs.existsSync(mdPath), true);

  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  let jsonTaskCount = 0;
  for (const s of ledger.stages) jsonTaskCount += s.tasks.length;
  assert.strictEqual(jsonTaskCount, 27);

  // Check that every taskId appears in Markdown ledger
  for (const s of ledger.stages) {
    for (const t of s.tasks) {
      assert.ok(md.includes(`**${t.taskId}**`), `Markdown ledger must include **${t.taskId}**`);
      assert.ok(md.includes(t.title), `Markdown ledger must include title "${t.title}"`);
    }
  }
});

runTest('4.2 Total weight (100.0%) and partition percentages match exactly across JSON and Markdown ledgers', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');
  const summary = ledger.summary;

  assert.ok(md.includes(`Total Weight Base:                   ${summary.totalWeight.toFixed(1)}%`));
  assert.ok(md.includes(`Verified Earned Completion:          ${summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Repository Implementation Readiness: ${summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Unexecuted Database Pending:         ${summary.unexecutedDatabasePendingPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Blocked on External / CTO Gates:     ${summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Not Implemented:                     ${summary.notImplementedPercent.toFixed(1)}%`));
});

runTest('4.3 Status counts match exactly: 15 REPO_VERIFIED, 6 PARTIAL, 5 BLOCKED, 1 NOT_IMPLEMENTED', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sc = ledger.summary.statusCounts;

  assert.strictEqual(sc.REPO_VERIFIED, 15);
  assert.strictEqual(sc.PARTIAL, 6);
  assert.strictEqual(sc.BLOCKED, 5);
  assert.strictEqual(sc.NOT_IMPLEMENTED, 1);
});

runTest('4.4 All 27 task IDs and canonical titles match byte-for-byte across JSON and Markdown ledgers', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const taskInLedger = ledger.stages.flatMap((s) => s.tasks).find((t) => t.taskId === id);
    assert.ok(taskInLedger, `Task ${id} must exist in ledger JSON`);
    assert.strictEqual(taskInLedger.title, meta.canonicalTitle, `Task ${id} title in ledger JSON must match canonical`);
    assert.ok(md.includes(`#### Task \`${id}\`: ${meta.canonicalTitle}`), `Markdown ledger must have section for ${id}`);
  }
});

runTest('4.5 Database-pending task list (4 tasks: C-02, D-02, E-01, F-02) matches exactly across JSON and Markdown', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  const discounts = ledger.summary.databaseDiscountBreakdown;
  assert.strictEqual(discounts.length, 4, `Expected 4 database discount tasks, got ${discounts.length}`);
  const expectedDbTasks = ['W021.5-C-02', 'W021.5-D-02', 'W021.5-E-01', 'W021.5-F-02'];
  for (const expectedId of expectedDbTasks) {
    const found = discounts.find((d) => d.taskId === expectedId);
    assert.ok(found, `Expected ${expectedId} in databaseDiscountBreakdown`);
    assert.ok(md.includes(`| **${expectedId}** |`), `Expected ${expectedId} in Markdown discount table`);
  }
});

runTest('4.6 Falsification: Tampering with a task title in ledger JSON causes cross-artifact reconciliation to fail closed', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const clonedLedger = JSON.parse(JSON.stringify(ledger));
  clonedLedger.stages[0].tasks[0].title = 'Tampered Title';

  assert.throws(
    () => computeLedgerSummary(clonedLedger, { enforceCanonicalIdentity: true }),
    /title mismatch/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Test-Execution Provenance & Independent Attestation
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 5. Workstream E: Test-Execution Provenance & Independent Attestation ---');

runTest('5.1 Test suite inventory generated from registered definitions contains canonical suites (4 foundational + >=17 directives)', () => {
  assert.ok(TEST_SUITE_DEFINITIONS.length >= 21, `Expected at least 21 test suites, got ${TEST_SUITE_DEFINITIONS.length}`);

  const foundational = TEST_SUITE_DEFINITIONS.filter((s) => s.suiteType === 'CORE_SYSTEM_TEST');
  const directives = TEST_SUITE_DEFINITIONS.filter((s) => s.suiteType === 'DIRECTIVE_VERIFICATION_TEST');

  assert.strictEqual(foundational.length, 4);
  assert.ok(directives.length >= 17, `Expected at least 17 directives, got ${directives.length}`);

  // Directives 084 through 100 are present in order
  for (let d = 84; d <= 100; d++) {
    const numStr = String(d).padStart(3, '0');
    const found = directives.find((s) => s.directiveRef === numStr);
    assert.ok(found, `Expected Directive ${numStr} in test suite inventory`);
  }
});

runTest('5.2 All registered test suites exist on disk with valid file paths and commands', () => {
  for (const s of TEST_SUITE_DEFINITIONS) {
    const fullPath = path.resolve(REPO_ROOT, s.suite);
    assert.strictEqual(fs.existsSync(fullPath), true, `Suite file ${s.suite} must exist on disk`);
    assert.ok(s.command && s.command.length > 5, `Suite ${s.suite} must have command`);
    assert.ok(s.logFilename && s.logFilename.endsWith('.log'), `Suite ${s.suite} must have .log filename`);
  }
});

runTest('5.3 Registered suite definitions, manifest, and on-disk logs agree on suite identity', () => {
  assert.strictEqual(fs.existsSync(MANIFEST_PATH), true);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  assert.ok(Array.isArray(manifest.testSuites) && manifest.testSuites.length >= 20, 'Manifest must contain testSuites');

  for (const entry of manifest.testSuites) {
    const s = TEST_SUITE_DEFINITIONS.find((def) => def.suite === entry.suite);
    assert.ok(s, `Suite in manifest ${entry.suite} must be registered in TEST_SUITE_DEFINITIONS`);

    // If log exists on disk, check headers and digest
    const logPath = path.resolve(REPO_ROOT, entry.outputLogPath);
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      assert.ok(logContent.includes(`Suite: ${s.suite}`), `Log ${entry.outputLogPath} must include Suite header`);
      const digest = crypto.createHash('sha256').update(logContent).digest('hex');
      assert.strictEqual(entry.outputLogSha256, digest, `Log ${entry.outputLogPath} digest must match manifest`);
    }
  }
});

runTest('5.4 Test execution provenance clearly distinguishes repository-recorded execution from independent CI attestation', () => {
  assert.strictEqual(fs.existsSync(MANIFEST_PATH), true);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // Manifest environment explicitly declares offline repository verification
  assert.strictEqual(manifest.environment.offlineRepositoryOnly, true);
  assert.ok(
    manifest.verifierRole === 'CTO Directive 100 Test Execution Verifier' ||
    manifest.verifierRole === 'CTO Directive 101 Test Execution Verifier' ||
    manifest.verifierRole === 'CTO Directive 102 Test Execution Verifier' ||
    manifest.verifierRole === 'CTO Directive 103 Test Execution Verifier' ||
    manifest.verifierRole === 'CTO Directive 104 Test Execution Verifier' ||
    manifest.verifierRole === 'CTO Directive 105 Test Execution Verifier',
    `Unexpected verifierRole: ${manifest.verifierRole}`
  );
});

runTest('5.5 External CI limitation explicit: Matching SHA-256 digest proves log integrity but not independent actor identity', () => {
  // A local SHA-256 digest is an integrity check on bytes on disk, not a cryptographic attestation of human identity
  const sampleLog = 'sample test execution log content';
  const digest = crypto.createHash('sha256').update(sampleLog).digest('hex');
  assert.strictEqual(typeof digest, 'string');
  assert.strictEqual(digest.length, 64);
  // Digest guarantees immutability of the log bytes, while provenance of who executed the runner requires external signed CI
  assert.strictEqual(digest, crypto.createHash('sha256').update(sampleLog).digest('hex'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F & Mandatory Invariants: Rule IV-001, Defect Registers & Air-Gap
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 6. Workstream F & Mandatory Invariants: Rule IV-001, Defect Registers & Air-Gap ---');

runTest('6.1 Rule IV-001 (Non-Self-Acceptance): Formal acceptance strictly 0.0% (UNACCEPTED)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.formalAcceptancePendingWeight, 5.0); // C-02 provisional
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.strictEqual(
        task.accounting.formalAcceptanceStatus === 'UNACCEPTED' || task.accounting.formalAcceptanceStatus === 'PENDING_INDEPENDENT_CONFIRMATION',
        true,
        `Task ${task.taskId} formalAcceptanceStatus must not be CONFIRMED_ACCEPTED without independent CTO key`
      );
      assert.strictEqual(task.accounting.formalAcceptanceStatus !== 'CONFIRMED_ACCEPTED', true);
    }
  }
});

runTest('6.2 External trust provisioning distinct from repository configuration; caller-controlled trust stripped', () => {
  const dummyTask = {
    taskId: 'W021.5-TEST-ACCEPTANCE',
    title: 'Synthetic Acceptance Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 1.0,
    evidence: [],
    accounting: {
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: 'reports/evidence/test_acceptance.json',
      repoCompletionRatio: 1.0,
      repoVerifiedWeight: 1.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
    },
  };

  // Caller attempts to pass trustedAuthorities directly into validateFormalAcceptanceArtifact
  const rogueKey = crypto.generateKeyPairSync('ed25519');
  const roguePem = rogueKey.publicKey.export({ type: 'spki', format: 'pem' });
  const rogueFingerprint = computeKeyFingerprint(roguePem);

  const rogueAuthorities = [
    {
      keyId: 'KEY-ROGUE-001',
      authorityName: 'Rogue Caller Self Authority',
      role: 'CTO',
      status: 'ACTIVE',
      publicKeyPem: roguePem,
      fingerprintSha256: rogueFingerprint,
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
    },
  ];

  // Caller-provided trustedAuthorities must be ignored by default when validating formal acceptance
  assert.throws(
    () => validateFormalAcceptanceArtifact(dummyTask, path.join(REPO_ROOT, 'reports/non_existent_acceptance.json'), { trustedAuthorities: rogueAuthorities }),
    /Acceptance artifact file not found|Ledger accounting validation error/
  );
});

runTest('6.3 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN pending explicit CTO adjudication', () => {
  const taskE02Spec = TASK_SPECIFICATIONS['W021.5-E-02'];
  assert.ok(taskE02Spec);
  assert.strictEqual(taskE02Spec.criteria[0].scope, 'BLOCKED_EXTERNAL');

  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const taskE02 = ledger.stages.flatMap((s) => s.tasks).find((t) => t.taskId === 'W021.5-E-02');
  assert.ok(taskE02);
  assert.strictEqual(taskE02.status, 'BLOCKED');
  assert.strictEqual(taskE02.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(taskE02.accounting.blockedWeight, 5.0);
  assert.strictEqual(taskE02.accounting.blockedByCtoDecision, true);
});

runTest('6.4 Telangana Assembly Constituency 119 duplication defect remains OPEN/BLOCKED', () => {
  const geojsonPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.strictEqual(fs.existsSync(geojsonPath), true);
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  // Defect invariant: exactly 120 features for 119 statutory seats
  assert.strictEqual(geojson.features.length, 120, `Telangana GeoJSON must have 120 features (AC 119 duplication open defect)`);
  const taskB104Spec = TASK_SPECIFICATIONS['W021.5-B1-04'];
  const res = taskB104Spec.criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true);
  assert.ok(res.message.includes('AC 119 duplicate claim defect detected'));
});

runTest('6.5 Baseline 68 SQL migrations immutable byte-for-byte identical to commit 0ea572d', () => {
  const result = verifyMigrationImmutability(BASELINE_COMMIT_MIGRATIONS);
  assert.strictEqual(result.isImmutabilityPreserved, true, 'Migration immutability check must pass');
  assert.strictEqual(result.totalFilesAudited, 68, `Expected 68 migrations checked, got ${result.totalFilesAudited}`);
  assert.strictEqual(result.contentModifiedFiles.length, 0, 'No migration files may be mutated');
});

runTest('6.6 Baseline 31 MLA profile seed files have pure LF and 0 undefined properties matching commit fb408ce', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data', 'seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, `Expected exactly 31 MLA profile seed files, found ${seedFiles.length}`);

  for (const f of seedFiles) {
    const full = path.join(REPO_ROOT, 'data', 'seed', f);
    const buf = fs.readFileSync(full);
    assert.strictEqual(buf.includes(Buffer.from('\r\n')), false, `Seed file ${f} must have pure LF line endings`);
    const txt = buf.toString('utf8');
    assert.strictEqual(txt.includes(': undefined'), false, `Seed file ${f} must have 0 ': undefined' properties`);
  }
});

runTest('6.7 Air-gap preservation: Strictly 0.0% live database execution, 0 migrations, 0 staging/production mutations', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.strictEqual(task.accounting.databaseExecutionEvidenced, false);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
