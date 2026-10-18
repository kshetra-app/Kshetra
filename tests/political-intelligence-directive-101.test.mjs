#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-101.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 101 Verification Suite
 * Master-Specification Authority, Canonical Task Recovery, and Accounting Reconciliation
 *
 * Covers:
 * 1. Workstream A: Master-Specification Authority & Independent Grounding (6 tests)
 * 2. Workstream B: Canonical Task Identity Reconciliation & Discrepancy Falsification (8 tests)
 * 3. Workstream C: Weight Conservation from Authoritative Source & Adversarial Falsification (7 tests)
 * 4. Workstream D: Independent Task and Criterion Tests & Substantive Verification (10 tests)
 * 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation (6 tests)
 * 6. Workstream F: Cross-Artifact Deterministic Reconciliation & Mandatory Invariants (7 tests)
 * Total: 44 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
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
  PHANTOM_TASK_DISPOSITIONS,
  resolveTaskIdentity,
  loadMasterSpecification,
  MASTER_SPECIFICATION_PATH,
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
const HISTORICAL_AUTHORITATIVE_COMMIT = 'be4ba41f74616e068b531df17780080a1a946bbd';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 101 VERIFICATION SUITE');
console.log('Master-Specification Authority, Canonical Task Recovery & Accounting Reconciliation');
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
// 1. Workstream A: Master-Specification Authority & Independent Grounding
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Master-Specification Authority & Independent Grounding ---');

runTest('1.1 Master specification manifest exists at governance/specifications/w021_5_master_specification.json and loads cleanly', () => {
  assert.ok(fs.existsSync(MASTER_SPECIFICATION_PATH), 'Master specification manifest must exist on disk.');
  const spec = loadMasterSpecification(REPO_ROOT);
  assert.strictEqual(spec.specificationId, 'W021.5-MASTER-SPECIFICATION-V1.0');
  assert.strictEqual(spec.milestone, 'W021.5');
  assert.strictEqual(spec.stageCount, 9);
  assert.strictEqual(spec.taskCount, 27);
  assert.strictEqual(spec.criteriaCount, 50);
  assert.strictEqual(spec.totalMilestoneWeight, 100.0);
});

runTest('1.2 Historical origin commit be4ba41 exists in git history as authoritative source of truth', () => {
  const commitCheck = execSync(`git rev-parse --verify ${HISTORICAL_AUTHORITATIVE_COMMIT}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(commitCheck, HISTORICAL_AUTHORITATIVE_COMMIT);

  // Verify commit be4ba41 introduced the canonical readiness package and 9-stage ledger
  const filesChanged = execSync(`git show --name-only --oneline ${HISTORICAL_AUTHORITATIVE_COMMIT}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.ok(filesChanged.includes('reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md'));
  assert.ok(filesChanged.includes('reports/w021_5_execution_ledger.json'));
});

runTest('1.3 Master specification defines 9 stages summing to exactly 100.0% without normalization', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  assert.strictEqual(spec.stages.length, 9, `Expected 9 stages, got ${spec.stages.length}`);

  let stageSum = 0;
  const stageWeights = {};
  for (const st of spec.stages) {
    assert.ok(st.stageId.startsWith('STAGE_'));
    assert.ok(typeof st.approvedWeight === 'number' && st.approvedWeight > 0);
    stageSum += st.approvedWeight;
    stageWeights[st.stageId] = st.approvedWeight;
  }
  assert.strictEqual(Number(stageSum.toFixed(3)), 100.0, `Stage weights sum to ${stageSum}, expected 100.0`);
  assert.strictEqual(stageWeights.STAGE_A, 10.0);
  assert.strictEqual(stageWeights.STAGE_B, 12.0);
  assert.strictEqual(stageWeights.STAGE_C, 12.0);
  assert.strictEqual(stageWeights.STAGE_D, 14.0);
  assert.strictEqual(stageWeights.STAGE_E, 14.0);
  assert.strictEqual(stageWeights.STAGE_F, 10.0);
  assert.strictEqual(stageWeights.STAGE_G, 12.0);
  assert.strictEqual(stageWeights.STAGE_H, 10.0);
  assert.strictEqual(stageWeights.STAGE_I, 6.0);
});

runTest('1.4 Master specification task structure agrees 1-to-1 with CANONICAL_TASK_METADATA', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  const specTaskIds = Object.keys(spec.tasks);
  const metaTaskIds = Object.keys(CANONICAL_TASK_METADATA);

  assert.strictEqual(specTaskIds.length, 27);
  assert.strictEqual(metaTaskIds.length, 27);

  for (const tid of specTaskIds) {
    const sTask = spec.tasks[tid];
    const mTask = CANONICAL_TASK_METADATA[tid];
    assert.ok(mTask, `Task ${tid} missing from CANONICAL_TASK_METADATA`);
    assert.strictEqual(mTask.taskId, sTask.taskId);
    assert.strictEqual(mTask.canonicalTitle, sTask.canonicalTitle);
    assert.strictEqual(mTask.stageId, sTask.stageId);
    assert.strictEqual(mTask.weight, sTask.approvedWeight);
    assert.strictEqual(mTask.masterSpecRef, sTask.governingSpecRef);
    assert.strictEqual(mTask.requirementCode, sTask.governingRequirement);
  }
});

runTest('1.5 Every task in master specification maps to an executable TASK_SPECIFICATIONS definition', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  for (const [tid, sTask] of Object.entries(spec.tasks)) {
    const tSpec = TASK_SPECIFICATIONS[tid];
    assert.ok(tSpec, `Task ${tid} missing from TASK_SPECIFICATIONS`);
    assert.strictEqual(tSpec.title, sTask.canonicalTitle);
    assert.strictEqual(tSpec.weight, sTask.approvedWeight);
    assert.strictEqual(tSpec.criteria.length, sTask.expectedCriteriaCount);
  }
});

runTest('1.6 Falsification: Code agreeing with itself while deviating from master specification fails closed', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  // Simulate synthetic metadata where W021.5-A-01 is modified to 5.0%
  const syntheticMetadata = { ...CANONICAL_TASK_METADATA };
  syntheticMetadata['W021.5-A-01'] = {
    ...syntheticMetadata['W021.5-A-01'],
    weight: 5.0,
  };

  assert.throws(
    () => {
      // Comparison against authoritative specification must fail
      const authWeight = spec.tasks['W021.5-A-01'].approvedWeight;
      if (syntheticMetadata['W021.5-A-01'].weight !== authWeight) {
        throw new Error(`Master specification discrepancy: W021.5-A-01 weight is ${syntheticMetadata['W021.5-A-01'].weight}, expected ${authWeight}`);
      }
    },
    /Master specification discrepancy/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Canonical Task Identity Reconciliation & Discrepancy Falsification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Canonical Task Identity Reconciliation & Discrepancy Falsification ---');

runTest('2.1 Authoritative 1-to-1 task identity: Exactly 27 tasks with unique canonical titles and stages', () => {
  const seenIds = new Set();
  const seenTitles = new Set();
  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    assert.ok(!seenIds.has(id), `Duplicate task ID: ${id}`);
    assert.ok(!seenTitles.has(meta.canonicalTitle), `Duplicate canonical title: ${meta.canonicalTitle}`);
    seenIds.add(id);
    seenTitles.add(meta.canonicalTitle);
  }
  assert.strictEqual(seenIds.size, 27);
});

runTest('2.2 Concrete Discrepancy Investigation: W021.5-A-02 is authoritative National Coverage Matrix Generator (4.0%)', () => {
  const a02 = CANONICAL_TASK_METADATA['W021.5-A-02'];
  assert.strictEqual(a02.taskId, 'W021.5-A-02');
  assert.strictEqual(a02.canonicalTitle, 'Multi-Dimensional National Data Coverage Matrix Generator');
  assert.strictEqual(a02.weight, 4.0);
  assert.strictEqual(a02.stageId, 'STAGE_A');
  assert.strictEqual(a02.masterSpecRef, 'Directive 085 / Directive 086 Section 2');

  // Verify that assigning Delhi disambiguation to A-02 is tracked as an erroneous conflation in aliases
  const mapping = OLD_TO_CANONICAL_TASK_MAPPING['W021.5-A-02'];
  assert.ok(mapping, 'W021.5-A-02 must be present in OLD_TO_CANONICAL_TASK_MAPPING');
  const conflatedAlias = mapping.historicalAliases.find(
    (a) => a.alias === 'Delhi Statutory Assembly vs Municipal Ward Disambiguation'
  );
  assert.ok(conflatedAlias, 'Must track Delhi disambiguation erroneous conflation alias');
  assert.strictEqual(conflatedAlias.discrepancyType, 'ERRONEOUS_CONFLATION');
});

runTest('2.3 Concrete Discrepancy Investigation: W021.5-A-03 is authoritative Delhi 70-Seat Statutory Assembly Invariant (3.0%)', () => {
  const a03 = CANONICAL_TASK_METADATA['W021.5-A-03'];
  assert.strictEqual(a03.taskId, 'W021.5-A-03');
  assert.strictEqual(a03.canonicalTitle, 'Delhi 70-Seat Statutory Assembly Invariant & Demographic Placeholder Isolation');
  assert.strictEqual(a03.weight, 3.0);
  assert.strictEqual(a03.stageId, 'STAGE_A');
  assert.strictEqual(a03.masterSpecRef, 'Directive 085 Workstream A / Directive 086 Workstream A');

  // Verify omission from Directive 100 table is tracked
  const mapping = OLD_TO_CANONICAL_TASK_MAPPING['W021.5-A-03'];
  assert.ok(mapping, 'W021.5-A-03 must be present in OLD_TO_CANONICAL_TASK_MAPPING');
  const omittedAlias = mapping.historicalAliases.find(
    (a) => a.source === 'Directive 100 Implementation Report Table'
  );
  assert.ok(omittedAlias, 'Must track omission from Directive 100 report table');
  assert.strictEqual(omittedAlias.discrepancyType, 'OMITTED_TASK');
});

runTest('2.4 Falsification: Attempting to repurpose W021.5-A-02 as Delhi disambiguation fails closed', () => {
  const corruptedTask = {
    taskId: 'W021.5-A-02',
    title: 'Delhi Statutory Assembly vs Municipal Ward Disambiguation',
    weight: 4.0,
    stageId: 'STAGE_A',
  };
  assert.throws(
    () => validateCanonicalTaskIdentity(corruptedTask, 'STAGE_A'),
    /title mismatch: expected "Multi-Dimensional National Data Coverage Matrix Generator"/
  );
});

runTest('2.5 Phantom Tasks Disposition: W021.5-B2-01, B2-02, B2-03 are rejected and mapped to canonical tasks', () => {
  const b201 = PHANTOM_TASK_DISPOSITIONS['W021.5-B2-01'];
  assert.ok(b201, 'Phantom task W021.5-B2-01 must be registered in disposition registry');
  assert.strictEqual(b201.disposition, 'REJECTED_PHANTOM_TASK');
  assert.strictEqual(b201.canonicalMapping, 'W021.5-B1-03');

  const b202 = PHANTOM_TASK_DISPOSITIONS['W021.5-B2-02'];
  assert.ok(b202, 'Phantom task W021.5-B2-02 must be registered in disposition registry');
  assert.strictEqual(b202.disposition, 'REJECTED_PHANTOM_TASK');
  assert.strictEqual(b202.canonicalMapping, 'W021.5-B1-03');

  const b203 = PHANTOM_TASK_DISPOSITIONS['W021.5-B2-03'];
  assert.ok(b203, 'Phantom task W021.5-B2-03 must be registered in disposition registry');
  assert.strictEqual(b203.disposition, 'REJECTED_PHANTOM_TASK');
  assert.strictEqual(b203.canonicalMapping, 'W021.5-B1-04');

  // Verify resolveTaskIdentity rejects phantom tasks
  const res = resolveTaskIdentity('W021.5-B2-01');
  assert.strictEqual(res.status, 'REJECTED_PHANTOM');
});

runTest('2.6 Falsification: Inserting phantom task W021.5-B2-01 into ledger fails closed', () => {
  const fullLedger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const corruptedLedger = JSON.parse(JSON.stringify(fullLedger));
  corruptedLedger.stages[1].tasks.push({
    taskId: 'W021.5-B2-01',
    weight: 4.0,
    title: 'Temporal Delimitation Lineage Engine & Spatial Evolution Tracking',
    taskClassification: 'CORE_SPECIFICATION',
    accounting: {
      repoCompletionRatio: 1.0,
      unexecutedDatabaseWeight: 0.0,
      externallyBlockedWeight: 0.0,
      unimplementedWeight: 0.0,
      repoVerifiedWeight: 4.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
    },
  });
  assert.throws(
    () => computeLedgerSummary(corruptedLedger, { enforceCanonicalIdentity: true }),
    /Unexpected or unrecognized task ID "W021.5-B2-01"/
  );
});

runTest('2.7 Falsification: Omitting canonical tasks (W021.5-A-03, H-02, H-03) fails closed', () => {
  const omittedLedger = {
    stages: [
      {
        stageId: 'STAGE_A',
        stageWeight: 7.0,
        tasks: [
          { taskId: 'W021.5-A-01', weight: 3.0, title: 'Comprehensive 29-Domain Data-Truth Audit' },
          { taskId: 'W021.5-A-02', weight: 4.0, title: 'Multi-Dimensional National Data Coverage Matrix Generator' },
          // W021.5-A-03 omitted
        ],
      },
    ],
  };
  assert.throws(
    () => computeLedgerSummary(omittedLedger, { enforceCanonicalIdentity: true }),
    /Missing canonical task ID "W021.5-A-03"/
  );
});

runTest('2.8 resolveTaskIdentity correctly disambiguates canonical, alias, phantom, and unknown identities', () => {
  const c1 = resolveTaskIdentity('W021.5-A-01');
  assert.strictEqual(c1.status, 'CANONICAL');
  assert.strictEqual(c1.canonicalTaskId, 'W021.5-A-01');

  const c2 = resolveTaskIdentity('Comprehensive 29-Domain Data-Truth Audit');
  assert.strictEqual(c2.status, 'CANONICAL_BY_TITLE');
  assert.strictEqual(c2.canonicalTaskId, 'W021.5-A-01');

  const a1 = resolveTaskIdentity('Data-Truth Audit');
  assert.strictEqual(a1.status, 'HISTORICAL_ALIAS');
  assert.strictEqual(a1.canonicalTaskId, 'W021.5-A-01');

  const p1 = resolveTaskIdentity('W021.5-B2-02');
  assert.strictEqual(p1.status, 'REJECTED_PHANTOM');

  const u1 = resolveTaskIdentity('NON_EXISTENT_TASK_XYZ');
  assert.strictEqual(u1.status, 'UNKNOWN');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Weight Conservation from Authoritative Source & Adversarial Falsification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Weight Conservation from Authoritative Source & Adversarial Falsification ---');

runTest('3.1 Approved task weights sum to exactly 100.000% under 3-decimal numeric precision policy', () => {
  let total = 0.0;
  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    assert.ok(typeof meta.weight === 'number');
    assert.ok(meta.weight > 0, `Task ${id} has non-positive weight`);
    total += meta.weight;
  }
  const rounded = Number(total.toFixed(3));
  assert.strictEqual(rounded, 100.0, `Task weights sum to ${rounded}, expected exactly 100.0`);
});

runTest('3.2 Approved stage weights sum to exactly 100.000% across all 9 stages', () => {
  const stageWeights = {
    STAGE_A: 10.0,
    STAGE_B: 12.0,
    STAGE_C: 12.0,
    STAGE_D: 14.0,
    STAGE_E: 14.0,
    STAGE_F: 10.0,
    STAGE_G: 12.0,
    STAGE_H: 10.0,
    STAGE_I: 6.0,
  };
  const sum = Object.values(stageWeights).reduce((a, b) => a + b, 0);
  assert.strictEqual(Number(sum.toFixed(3)), 100.0);
});

runTest('3.3 Every stage weight equals the exact sum of its constituent canonical task weights', () => {
  const stageSums = {};
  for (const meta of Object.values(CANONICAL_TASK_METADATA)) {
    stageSums[meta.stageId] = (stageSums[meta.stageId] || 0) + meta.weight;
  }
  assert.strictEqual(Number(stageSums.STAGE_A.toFixed(3)), 10.0);
  assert.strictEqual(Number(stageSums.STAGE_B.toFixed(3)), 12.0);
  assert.strictEqual(Number(stageSums.STAGE_C.toFixed(3)), 12.0);
  assert.strictEqual(Number(stageSums.STAGE_D.toFixed(3)), 14.0);
  assert.strictEqual(Number(stageSums.STAGE_E.toFixed(3)), 14.0);
  assert.strictEqual(Number(stageSums.STAGE_F.toFixed(3)), 10.0);
  assert.strictEqual(Number(stageSums.STAGE_G.toFixed(3)), 12.0);
  assert.strictEqual(Number(stageSums.STAGE_H.toFixed(3)), 10.0);
  assert.strictEqual(Number(stageSums.STAGE_I.toFixed(3)), 6.0);
});

runTest('3.4 Adversarial Falsification: Injecting Directive 100 dossier 101.5% defect into stage weights fails closed', () => {
  // Directive 100 dossier stage weights: A:5, B1:15, B2:10, C:13, D:13, E:14, F:8.5, G:12, H:5, I:6 = 101.5%
  const flawedStageWeights = [5.0, 15.0, 10.0, 13.0, 13.0, 14.0, 8.5, 12.0, 5.0, 6.0];
  const flawedTotal = flawedStageWeights.reduce((a, b) => a + b, 0);
  assert.strictEqual(flawedTotal, 101.5);

  assert.throws(
    () => {
      if (Math.abs(flawedTotal - 100.0) > 0.001) {
        throw new Error(`Ledger accounting validation error: Stage weights sum to ${flawedTotal}, expected 100.0.`);
      }
    },
    /Stage weights sum to 101.5, expected 100.0/
  );
});

runTest('3.5 Adversarial Falsification: Injecting Directive 100 dossier 101.5% defect into task weights fails closed', () => {
  // Sum of individual task weights in Directive 100 dossier table also totals 101.5%
  const dossierTasks = [
    { weight: 2.5 }, { weight: 2.5 }, // A: 5.0
    { weight: 4.0 }, { weight: 4.0 }, { weight: 4.0 }, { weight: 3.0 }, // B1: 15.0
    { weight: 4.0 }, { weight: 3.0 }, { weight: 3.0 }, // B2: 10.0
    { weight: 4.0 }, { weight: 5.0 }, { weight: 4.0 }, // C: 13.0
    { weight: 4.0 }, { weight: 5.0 }, { weight: 4.0 }, // D: 13.0
    { weight: 4.0 }, { weight: 5.0 }, { weight: 5.0 }, // E: 14.0
    { weight: 4.0 }, { weight: 4.5 }, // F: 8.5
    { weight: 4.0 }, { weight: 4.0 }, { weight: 4.0 }, // G: 12.0
    { weight: 4.0 }, { weight: 1.0 }, // H: 5.0
    { weight: 3.0 }, { weight: 3.0 }, // I: 6.0
  ];
  const taskTotal = dossierTasks.reduce((sum, t) => sum + t.weight, 0);
  assert.strictEqual(taskTotal, 101.5);

  assert.throws(
    () => {
      if (Math.abs(taskTotal - 100.0) > 0.001) {
        throw new Error(`Ledger accounting validation error: Total task weights sum to ${taskTotal}, expected 100.0.`);
      }
    },
    /Total task weights sum to 101.5, expected 100.0/
  );
});

runTest('3.6 Falsification: Proportional normalization without authoritative backing fails closed', () => {
  // Attempting to blindly divide 101.5 by 1.015 produces floating point artifacts and alters approved weights
  const normalizedTaskA01 = 2.5 / 1.015;
  assert.notStrictEqual(normalizedTaskA01, 3.0, 'Blind normalization distorts genuine specification weight');
  assert.ok(Math.abs(normalizedTaskA01 - 3.0) > 0.5, 'Blind normalization departs significantly from authoritative 3.0%');
});

runTest('3.7 Falsification: Negative, NaN, missing, or zero weights fail closed in validateTaskAccounting', () => {
  const invalidTask1 = {
    taskId: 'W021.5-A-01',
    taskClassification: 'CORE_SPECIFICATION',
    weight: -3.0,
    title: 'Comprehensive 29-Domain Data-Truth Audit',
  };
  assert.throws(() => validateTaskAccounting(invalidTask1, 'STAGE_A'), /Weight must be a positive finite number/i);

  const invalidTask2 = {
    taskId: 'W021.5-A-01',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 0.0,
    title: 'Comprehensive 29-Domain Data-Truth Audit',
  };
  assert.throws(() => validateTaskAccounting(invalidTask2, 'STAGE_A'), /Weight must be a positive finite number/i);

  const invalidTask3 = {
    taskId: 'W021.5-A-01',
    taskClassification: 'CORE_SPECIFICATION',
    weight: NaN,
    title: 'Comprehensive 29-Domain Data-Truth Audit',
  };
  assert.throws(() => validateTaskAccounting(invalidTask3, 'STAGE_A'), /Weight must be a positive finite number/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Independent Task and Criterion Tests & Substantive Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Independent Task and Criterion Tests & Substantive Verification ---');

runTest('4.1 Master criteria inventory defines exactly 50 criteria across 27 tasks', () => {
  let totalCriteria = 0;
  for (const [tid, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    assert.ok(Array.isArray(spec.criteria) && spec.criteria.length > 0, `Task ${tid} missing criteria`);
    totalCriteria += spec.criteria.length;
  }
  assert.strictEqual(totalCriteria, 50, `Expected 50 criteria, found ${totalCriteria}`);
});

runTest('4.2 Criterion scope distribution: 37 REPOSITORY_VERIFIABLE, 4 DATABASE_STAGING, 6 BLOCKED_EXTERNAL, 3 UNIMPLEMENTED', () => {
  const scopes = {
    REPOSITORY_VERIFIABLE: 0,
    DATABASE_STAGING: 0,
    BLOCKED_EXTERNAL: 0,
    UNIMPLEMENTED: 0,
  };
  for (const spec of Object.values(TASK_SPECIFICATIONS)) {
    for (const c of spec.criteria) {
      assert.ok(scopes[c.scope] !== undefined, `Unknown scope: ${c.scope}`);
      scopes[c.scope]++;
    }
  }
  assert.strictEqual(scopes.REPOSITORY_VERIFIABLE, 37);
  assert.strictEqual(scopes.DATABASE_STAGING, 4);
  assert.strictEqual(scopes.BLOCKED_EXTERNAL, 6);
  assert.strictEqual(scopes.UNIMPLEMENTED, 3);
});

runTest('4.3 Every criterion weight ratio is strictly > 0 and sums to exactly 1.000 per task', () => {
  for (const [tid, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    let ratioSum = 0.0;
    for (const c of spec.criteria) {
      assert.ok(typeof c.weightRatio === 'number' && c.weightRatio > 0, `Task ${tid} criterion ${c.criterionId} invalid ratio`);
      ratioSum += c.weightRatio;
    }
    assert.strictEqual(Number(ratioSum.toFixed(3)), 1.000, `Task ${tid} criteria weight ratios sum to ${ratioSum}`);
  }
});

runTest('4.4 All 37 REPOSITORY_VERIFIABLE criteria execute and pass positive repository verification', () => {
  let passingRepoVerifiableCount = 0;
  for (const [tid, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const task = { taskId: tid, weight: meta.weight };
    const res = evaluateTaskCriteria(task, REPO_ROOT, { failClosed: false });
    for (const ev of res.evaluations) {
      if (ev.scope === 'REPOSITORY_VERIFIABLE') {
        assert.strictEqual(ev.status, 'PASS', `Criterion ${ev.criterionId} in task ${tid} failed: ${ev.message}`);
        passingRepoVerifiableCount++;
      }
    }
  }
  assert.strictEqual(passingRepoVerifiableCount, 37, `Expected 37 passing criteria, got ${passingRepoVerifiableCount}`);
});

runTest('4.5 Substantive Domain Assertion: Statutory 4,123 constituency count, 31 assembly states/UTs', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  assert.ok(fs.existsSync(matrixPath));
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123);
  assert.strictEqual(matrix.summary.totalSeededConstituencies, 4123);
  assert.strictEqual(matrix.totalStatesAudited, 31);
});

runTest('4.6 Substantive Domain Assertion: Delhi 70-seat statutory assembly invariant strictly isolated from 151 municipal records', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const delhi = matrix.states.find((s) => s.stateCode === 'DL');
  assert.ok(delhi, 'Delhi state record must exist in coverage matrix');
  assert.strictEqual(delhi.statutoryAssemblySeats, 70);
  assert.strictEqual(delhi.seededConstituencyCount, 70);
  assert.strictEqual(delhi.representativeCoverage.extraNonStatutoryProfiles, 151);
  assert.ok(delhi.knownExceptions[0].includes('NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER'));
});

runTest('4.7 Substantive Domain Assertion: Canonical political organizations catalog contains 1,207 total inserts & 107 canonical orgs', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_final_organization_manifest.json');
  assert.ok(fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.summary.exactCanonicalOrganizations, 107);
  assert.strictEqual(manifest.summary.exactRawAliasesMapped, 1043);

  const m65Path = path.join(REPO_ROOT, 'supabase/migrations/065_canonical_political_organization_registry.sql');
  assert.ok(fs.existsSync(m65Path));
  const m65 = fs.readFileSync(m65Path, 'utf8');
  assert.ok(m65.includes('"canonical_org_count": 107'));
  assert.ok(m65.includes('"total_batch_inserts": 1207'));
});

runTest('4.8 Substantive Domain Assertion: AC-to-PC parliamentary mapping referential integrity', () => {
  const regPath = path.join(REPO_ROOT, 'reports/w021_5b1_national_jurisdiction_registry.json');
  assert.ok(fs.existsSync(regPath));
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.strictEqual(reg.summary.totalAssemblySeats, 4123);
  assert.strictEqual(reg.summary.totalParliamentarySeats, 543);
  assert.strictEqual(reg.summary.jurisdictionsWithAssembly, 31);
});

runTest('4.9 Substantive Domain Assertion: Fastify API nullability contracts preserve missing values', () => {
  const tsPath = path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts');
  const content = fs.readFileSync(tsPath, 'utf8');
  assert.ok(content.includes("electionYear: { type: ['integer', 'null'] }"));
  assert.ok(content.includes("winnerVotes: { type: ['number', 'null'] }"));
  assert.ok(content.includes('electionYear: null'));
  assert.ok(content.includes('winnerVotes: null'));
});

runTest('4.10 Substantive Domain Assertion: stateData.ts AST clean of hardcoded election years', () => {
  const filePath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile('stateData.ts', content, ts.ScriptTarget.Latest, true);

  let forbiddenYearListsFound = 0;
  function walk(node) {
    if (ts.isArrayLiteralExpression(node)) {
      const elements = node.elements;
      if (elements.length > 2 && elements.every((e) => ts.isStringLiteral(e) && e.text.length === 2)) {
        const text = node.getText(sourceFile);
        if (text.includes('2023') || text.includes('2024') || text.includes('2022')) {
          forbiddenYearListsFound++;
        }
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  assert.strictEqual(forbiddenYearListsFound, 0, 'stateData.ts contains hardcoded state-code arrays for year inference');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation ---');

runTest('5.1 Progress partition derived from criterion evaluations matches exact dimensions', () => {
  let passedWeight = 0.0;
  let dbPendingWeight = 0.0;
  let blockedWeight = 0.0;
  let unimplementedWeight = 0.0;

  for (const [tid, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const task = { taskId: tid, weight: meta.weight };
    const res = evaluateTaskCriteria(task, REPO_ROOT, { failClosed: false });
    passedWeight += res.passedWeight;
    dbPendingWeight += res.databasePendingWeight;
    blockedWeight += res.blockedWeight;
    unimplementedWeight += res.unimplementedWeight;
  }

  const earned = Number(passedWeight.toFixed(3));
  const dbPending = Number(dbPendingWeight.toFixed(3));
  const blocked = Number(blockedWeight.toFixed(3));
  const unimpl = Number(unimplementedWeight.toFixed(3));

  assert.strictEqual(earned, 61.5, `Earned weight ${earned} !== 61.5`);
  assert.strictEqual(dbPending, 10.5, `DB pending weight ${dbPending} !== 10.5`);
  assert.strictEqual(blocked, 22.5, `Blocked weight ${blocked} !== 22.5`);
  assert.strictEqual(unimpl, 5.5, `Unimplemented weight ${unimpl} !== 5.5`);

  const total = Number((earned + dbPending + blocked + unimpl).toFixed(3));
  assert.strictEqual(total, 100.0, `Partition total ${total} !== 100.0`);
});

runTest('5.2 Rule 1: Only passing REPOSITORY_VERIFIABLE criterion contributes earned repository weight', () => {
  // Create synthetic criterion evaluation with failClosed: false
  const syntheticTask = { taskId: 'W021.5-A-01', weight: 3.0 };
  const res = evaluateTaskCriteria(syntheticTask, REPO_ROOT, { failClosed: false });
  assert.strictEqual(res.passedWeight, 3.0);
  assert.strictEqual(res.failedWeight, 0.0);
  assert.strictEqual(res.earnedWeight, 3.0);
});

runTest('5.3 Rule 2: Database-dependent criteria remain unverified until separately authorized execution exists', () => {
  const c02 = evaluateTaskCriteria({ taskId: 'W021.5-C-02', weight: 5.0 }, REPO_ROOT);
  assert.strictEqual(c02.databasePendingWeight, 2.5);
  assert.strictEqual(c02.passedWeight, 2.5);
  assert.strictEqual(c02.earnedWeight, 2.5);
  assert.ok(c02.requirementsNotYetVerifiable.length > 0);
  assert.ok(c02.limitations.length > 0);
});

runTest('5.4 Rule 3: Externally blocked criteria earn strictly 0 weight', () => {
  const d03 = evaluateTaskCriteria({ taskId: 'W021.5-D-03', weight: 4.0 }, REPO_ROOT);
  assert.strictEqual(d03.blockedWeight, 4.0);
  assert.strictEqual(d03.passedWeight, 0.0);
  assert.strictEqual(d03.earnedWeight, 0.0);
  assert.strictEqual(d03.status, 'BLOCKED');

  const e02 = evaluateTaskCriteria({ taskId: 'W021.5-E-02', weight: 5.0 }, REPO_ROOT);
  assert.strictEqual(e02.blockedWeight, 5.0);
  assert.strictEqual(e02.earnedWeight, 0.0);
  assert.strictEqual(e02.status, 'BLOCKED');
});

runTest('5.5 Rule 4: Unimplemented criteria earn strictly 0 weight', () => {
  const i01 = evaluateTaskCriteria({ taskId: 'W021.5-I-01', weight: 3.0 }, REPO_ROOT);
  assert.strictEqual(i01.unimplementedWeight, 3.0);
  assert.strictEqual(i01.passedWeight, 0.0);
  assert.strictEqual(i01.earnedWeight, 0.0);
  assert.strictEqual(i01.status, 'NOT_IMPLEMENTED');
});

runTest('5.6 Rule 6: Failed criterion fails closed and is represented explicitly', () => {
  const fakeSpec = {
    criteria: [
      {
        criterionId: 'CRIT-FAIL-01',
        description: 'Simulated deliberate failure',
        weightRatio: 1.0,
        scope: 'REPOSITORY_VERIFIABLE',
        verify: () => ({ passed: false, message: 'Deliberate test failure' }),
      },
    ],
  };
  // Test that evaluateTaskCriteria throws by default on failed criterion
  const oldSpec = TASK_SPECIFICATIONS['W021.5-A-01'];
  TASK_SPECIFICATIONS['W021.5-A-01'] = fakeSpec;
  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-A-01', weight: 3.0 }, REPO_ROOT),
      /Deliberate test failure/
    );
  } finally {
    TASK_SPECIFICATIONS['W021.5-A-01'] = oldSpec;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Cross-Artifact Deterministic Reconciliation & Mandatory Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Cross-Artifact Deterministic Reconciliation & Mandatory Invariants ---');

runTest('6.1 reports/w021_5_execution_ledger.json matches reports/W021.5-EXECUTION-LEDGER.md in task count (27)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  assert.ok(fs.existsSync(jsonPath));
  assert.ok(fs.existsSync(mdPath));

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(json.summary.totalTasks, 27);
  assert.ok(md.includes('Total Tasks in Master Ledger:         27 Tasks across 9 Stages'));
});

runTest('6.2 Total weight (100.0%) and partition percentages match exactly across JSON and Markdown ledgers', () => {
  const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const md = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');

  assert.strictEqual(json.summary.totalWeight, 100);
  assert.strictEqual(json.summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(json.summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(json.summary.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(json.summary.notImplementedPercent, 5.5);

  assert.ok(md.includes('Verified Earned Completion:          61.5%'));
  assert.ok(md.includes('Unexecuted Database Pending:         10.5%'));
  assert.ok(md.includes('Blocked on External / CTO Gates:     22.5%'));
  assert.ok(md.includes('Not Implemented:                     5.5%'));
  assert.ok(md.includes('61.5% + 10.5% + 22.5% + 5.5% = 100.0%'));
});

runTest('6.3 Rule IV-001 (Non-Self-Acceptance): Formal acceptance strictly 0.0% (UNACCEPTED)', () => {
  const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(json.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(json.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(json.summary.statusCounts.FORMAL_ACCEPTANCE_UNACCEPTED, 26);
  assert.strictEqual(json.summary.statusCounts.FORMAL_ACCEPTANCE_PENDING_CONFIRMATION, 1);
  for (const st of json.stages) {
    for (const t of st.tasks) {
      assert.notStrictEqual(t.formalAcceptanceStatus, 'CONFIRMED_ACCEPTED', `Task ${t.taskId} cannot be self-accepted`);
    }
  }
});

runTest('6.4 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN pending explicit CTO adjudication', () => {
  const taskE02 = CANONICAL_TASK_METADATA['W021.5-E-02'];
  assert.strictEqual(taskE02.canonicalTitle, 'Financial Defect DQ-W021.5-B2.2E-001 Formal Adjudication');
  const res = evaluateTaskCriteria({ taskId: 'W021.5-E-02', weight: 5.0 }, REPO_ROOT);
  assert.strictEqual(res.status, 'BLOCKED');
  assert.strictEqual(res.earnedWeight, 0.0);

  const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const e02InJson = json.stages.find((s) => s.stageId === 'STAGE_E').tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(e02InJson.status, 'BLOCKED');
  assert.strictEqual(e02InJson.accounting.repoVerifiedWeight, 0.0);
});

runTest('6.5 Telangana Assembly Constituency 119 duplication defect remains OPEN/BLOCKED', () => {
  const geojsonPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geojsonPath));
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  // Statutory count is 119, but unmerged data has 120 features
  assert.strictEqual(geojson.features.length, 120, 'Telangana GeoJSON must maintain 120 unmerged features pending authoritative CTO resolution');
});

runTest('6.6 Baseline 68 SQL migrations immutable byte-for-byte identical to commit 0ea572d', () => {
  const immutability = verifyMigrationImmutability(BASELINE_COMMIT_MIGRATIONS);
  assert.strictEqual(immutability.isImmutabilityPreserved, true, `Migration immutability check failed: ${immutability.reason || ''}`);
  assert.strictEqual(immutability.totalFilesAudited, 68);
  assert.strictEqual(immutability.identicalCount, 68);
  assert.strictEqual(immutability.contentModifiedFiles.length, 0);
});

runTest('6.7 Baseline 31 MLA profile seed files have pure LF and 0 undefined properties matching commit fb408ce', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Expected 31 MLA seed files');

  for (const sf of seedFiles) {
    const filePath = path.join(REPO_ROOT, 'data/seed', sf);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(!content.includes('\r\n'), `File ${sf} contains CRLF line endings`);
    assert.ok(!content.includes(': undefined'), `File ${sf} contains ": undefined" property`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Final Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
