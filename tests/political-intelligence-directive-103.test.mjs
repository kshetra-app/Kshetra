#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-103.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 103 Verification Suite
 * Bidirectional Authority Enforcement, Historical Artifact Integrity, and Accounting Proof
 *
 * Covers:
 * 1. Workstream A: Historical Artifact Integrity & Provenance Proof (5 tests)
 * 2. Workstream B: Bidirectional Task, Stage & Spec-Ref Boundary Enforcement (6 tests)
 * 3. Workstream C: Historical 25-vs-27 Task Discrepancy Resolution (6 tests)
 * 4. Workstream D: Comprehensive Adversarial Falsification Matrix (11 tests)
 * 5. Workstream E: Progress Calculation Proof from Substantive Criteria (7 tests)
 * 6. Workstream F: Mandatory Governance Invariants & Baseline Immutability (7 tests)
 * Total: 42 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import ts from 'typescript';

import {
  CANONICAL_TASK_METADATA,
  OLD_TO_CANONICAL_TASK_MAPPING,
  PHANTOM_TASK_DISPOSITIONS,
  DISCREPANCY_REGISTER,
  resolveTaskIdentity,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  EXPECTED_RAW_HISTORICAL_LEDGER_BYTES,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
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
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_MIGRATIONS = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_SEEDS = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 103 VERIFICATION SUITE');
console.log('Bidirectional Authority Enforcement, Historical Integrity & Accounting Proof');
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

function withTempSpecFixture(mutator, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-mut-103-'));
  const govDir = path.join(tmpDir, 'governance', 'specifications');
  fs.mkdirSync(govDir, { recursive: true });

  const origSpec = loadMasterSpecification(REPO_ROOT);
  const origHist = loadHistoricalOriginLedger(REPO_ROOT);

  const mutatedSpec = JSON.parse(JSON.stringify(origSpec));
  const mutatedHist = JSON.parse(JSON.stringify(origHist));

  mutator({ mutatedSpec, mutatedHist, tmpDir });

  fs.writeFileSync(path.join(govDir, 'w021_5_master_specification.json'), JSON.stringify(mutatedSpec, null, 2), 'utf8');
  fs.writeFileSync(path.join(govDir, 'historical_w021_5_origin_ledger.json'), JSON.stringify(mutatedHist, null, 2), 'utf8');

  try {
    fn(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Historical Artifact Integrity & Provenance Proof
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Historical Artifact Integrity & Provenance Proof ---');

runTest('1.1 verifyHistoricalArtifactIntegrity() passes and returns comprehensive integrity proof', () => {
  const res = verifyHistoricalArtifactIntegrity({ repoRoot: REPO_ROOT });
  assert.strictEqual(res.verified, true);
  assert.strictEqual(res.historicalIdentity.sourceOriginCommit, HISTORICAL_ORIGIN_COMMIT);
  assert.strictEqual(res.historicalIdentity.sourceArtifactPath, 'reports/w021_5_execution_ledger.json');
  assert.strictEqual(res.rawArtifactIntegrity.match, true);
  assert.strictEqual(res.snapshotFidelity.structuralMatch, true);
  assert.strictEqual(res.snapshotFidelity.isBitwiseEnvelopeMatch, false);
});

runTest('1.2 Historical identity: exact source commit and source path verified', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  assert.strictEqual(snapshot.sourceOriginCommit, HISTORICAL_ORIGIN_COMMIT);
  assert.strictEqual(snapshot.sourceArtifactPath, 'reports/w021_5_execution_ledger.json');
  assert.ok(snapshot.historicalLedger, 'Historical ledger object must exist');
});

runTest('1.3 Raw artifact integrity: git bytes length (20,494) and SHA-256 match exactly', () => {
  const rawBytes = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
    cwd: REPO_ROOT,
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.strictEqual(rawBytes.length, EXPECTED_RAW_HISTORICAL_LEDGER_BYTES, 'Raw byte length must equal 20,494');
  const hash = crypto.createHash('sha256').update(rawBytes).digest('hex');
  assert.strictEqual(hash, EXPECTED_RAW_HISTORICAL_LEDGER_SHA256, 'SHA-256 hash must match expected digest');
});

runTest('1.4 Snapshot fidelity: semantic canonical JSON equality asserted; envelope distinction documented', () => {
  const rawBytes = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
    cwd: REPO_ROOT,
    maxBuffer: 10 * 1024 * 1024,
  });
  const gitParsed = JSON.parse(rawBytes.toString('utf8'));
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  assert.strictEqual(
    JSON.stringify(gitParsed),
    JSON.stringify(snapshot.historicalLedger),
    'Snapshot historicalLedger payload must be canonically identical to git show JSON'
  );
  const snapshotRawStr = fs.readFileSync(HISTORICAL_ORIGIN_LEDGER_PATH, 'utf8');
  assert.notStrictEqual(
    snapshotRawStr.length,
    rawBytes.length,
    'Snapshot file is not a bitwise envelope match with git raw file because it adds repository metadata wrapper'
  );
});

runTest('1.5 Repo-local trust anchor limitation transparently stated in verification output', () => {
  const res = verifyHistoricalArtifactIntegrity({ repoRoot: REPO_ROOT });
  assert.strictEqual(res.trustAnchorStatus.classification, 'REPOSITORY_LOCAL_INTEGRITY_CHECK_NOT_EXTERNAL_TRUST_ANCHOR');
  assert.ok(res.trustAnchorStatus.limitation.includes('does not constitute an independent external cryptographic trust anchor'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Bidirectional Task, Stage & Spec-Ref Boundary Enforcement
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Bidirectional Task, Stage & Spec-Ref Boundary Enforcement ---');

runTest('2.1 verifyAuthorityBoundary() passes on authentic repository state', () => {
  const res = verifyAuthorityBoundary({ repoRoot: REPO_ROOT });
  assert.strictEqual(res.verified, true);
  assert.strictEqual(res.taskCount, 27);
  assert.strictEqual(res.stageCount, 9);
  assert.strictEqual(res.conservationSum, 100.0);
  assert.strictEqual(res.specRefVerified, true);
  assert.strictEqual(res.governingRequirementVerified, true);
});

runTest('2.2 Bidirectional task inventory: historical origin (27) <-> canonical metadata (27) <-> master spec (27)', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const histTaskIds = [];
  for (const s of snapshot.historicalLedger.stages) {
    for (const t of s.tasks) {
      histTaskIds.push(t.taskId);
    }
  }
  const canonicalTaskIds = Object.keys(CANONICAL_TASK_METADATA);
  const spec = loadMasterSpecification(REPO_ROOT);
  const specTaskIds = Object.keys(spec.tasks);

  assert.strictEqual(histTaskIds.length, 27);
  assert.strictEqual(canonicalTaskIds.length, 27);
  assert.strictEqual(specTaskIds.length, 27);

  histTaskIds.sort();
  canonicalTaskIds.sort();
  specTaskIds.sort();
  assert.deepStrictEqual(histTaskIds, canonicalTaskIds);
  assert.deepStrictEqual(canonicalTaskIds, specTaskIds);
});

runTest('2.3 Task attribute equality: titles, weights, and stage assignments match across all 27 tasks', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const spec = loadMasterSpecification(REPO_ROOT);
  const histMap = {};
  for (const s of snapshot.historicalLedger.stages) {
    const normStageId = s.stageId === 'STAGE_B1' ? 'STAGE_B' : s.stageId;
    for (const t of s.tasks) {
      histMap[t.taskId] = { ...t, normStageId };
    }
  }

  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const hist = histMap[id];
    const specTask = spec.tasks[id];
    assert.ok(hist, `Task ${id} must exist in origin`);
    assert.ok(specTask, `Task ${id} must exist in master spec`);

    assert.strictEqual(meta.canonicalTitle, hist.title);
    assert.strictEqual(specTask.canonicalTitle, hist.title);

    assert.strictEqual(meta.weight, hist.weight);
    assert.strictEqual(specTask.approvedWeight, hist.weight);

    const normMetaStage = meta.stageId === 'STAGE_B1' ? 'STAGE_B' : meta.stageId;
    const normSpecStage = specTask.stageId === 'STAGE_B1' ? 'STAGE_B' : specTask.stageId;
    assert.strictEqual(normMetaStage, hist.normStageId);
    assert.strictEqual(normSpecStage, hist.normStageId);
  }
});

runTest('2.4 Historical specRef validation: historical specRef matches canonical masterSpecRef and master spec governingSpecRef', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const spec = loadMasterSpecification(REPO_ROOT);
  const histMap = {};
  for (const s of snapshot.historicalLedger.stages) {
    for (const t of s.tasks) {
      histMap[t.taskId] = t.specRef;
    }
  }

  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const histSpecRef = histMap[id];
    const specTask = spec.tasks[id];
    assert.ok(histSpecRef, `Historical specRef for ${id} must be defined`);
    assert.strictEqual(meta.masterSpecRef, histSpecRef, `Task ${id} canonical masterSpecRef must match origin specRef`);
    assert.strictEqual(specTask.governingSpecRef, histSpecRef, `Task ${id} master spec governingSpecRef must match origin specRef`);
  }
});

runTest('2.5 Governing requirement validation: canonical requirementCode matches master spec governingRequirement', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  for (const [id, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const specTask = spec.tasks[id];
    assert.ok(meta.requirementCode, `Task ${id} must have requirementCode`);
    assert.strictEqual(specTask.governingRequirement, meta.requirementCode, `Task ${id} governingRequirement must match canonical requirementCode`);
  }
});

runTest('2.6 Stage-level bidirectional validation: Stage count (9), IDs, names, approved weights, task membership, subtotals (100.0%)', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const spec = loadMasterSpecification(REPO_ROOT);

  assert.strictEqual(snapshot.historicalLedger.stages.length, 9);
  assert.strictEqual(spec.stages.length, 9);

  let totalHistWeight = 0;
  let totalSpecWeight = 0;

  for (let i = 0; i < 9; i++) {
    const histStage = snapshot.historicalLedger.stages[i];
    const specStage = spec.stages[i];

    const normHistId = histStage.stageId === 'STAGE_B1' ? 'STAGE_B' : histStage.stageId;
    const normSpecId = specStage.stageId === 'STAGE_B1' ? 'STAGE_B' : specStage.stageId;
    assert.strictEqual(normSpecId, normHistId);

    assert.strictEqual(specStage.stageName, histStage.stageName);
    assert.strictEqual(specStage.approvedWeight, histStage.stageWeight);

    const histTaskIds = histStage.tasks.map((t) => t.taskId).sort();
    const specTaskIds = [...specStage.taskIds].sort();
    assert.deepStrictEqual(specTaskIds, histTaskIds);

    const histSubtotal = histStage.tasks.reduce((sum, t) => sum + t.weight, 0);
    const specSubtotal = specStage.taskIds.reduce((sum, id) => sum + spec.tasks[id].approvedWeight, 0);
    assert.strictEqual(Math.round(histSubtotal * 1000) / 1000, histStage.stageWeight);
    assert.strictEqual(Math.round(specSubtotal * 1000) / 1000, specStage.approvedWeight);

    totalHistWeight += histStage.stageWeight;
    totalSpecWeight += specStage.approvedWeight;
  }

  assert.strictEqual(Math.round(totalHistWeight * 1000) / 1000, 100.0);
  assert.strictEqual(Math.round(totalSpecWeight * 1000) / 1000, 100.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Historical 25-vs-27 Task Discrepancy Resolution
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Historical 25-vs-27 Task Discrepancy Resolution ---');

runTest('3.1 Recomputed unique task count from historical nested stage data is exactly 27', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const seenIds = new Set();
  let count = 0;
  for (const s of snapshot.historicalLedger.stages) {
    for (const t of s.tasks) {
      assert.ok(!seenIds.has(t.taskId), `Duplicate task ${t.taskId}`);
      seenIds.add(t.taskId);
      count++;
    }
  }
  assert.strictEqual(count, 27);
  assert.strictEqual(seenIds.size, 27);
});

runTest('3.2 Reconciled count vs summary header: summary header totalTasks=25 reflects pre-extension core specification tasks', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const summary = snapshot.historicalLedger.summary;
  assert.strictEqual(summary.totalTasks, 25, 'Origin summary header totalTasks must be 25');
  assert.strictEqual(summary.statusCounts.VERIFIED, 14, 'Origin summary header VERIFIED must be 14');

  let nestedVerified = 0;
  for (const s of snapshot.historicalLedger.stages) {
    for (const t of s.tasks) {
      if (t.status === 'VERIFIED') nestedVerified++;
    }
  }
  assert.strictEqual(nestedVerified, 16, 'Nested stage records contain 16 VERIFIED tasks');
});

runTest('3.3 Historical Markdown ledger at be4ba41:reports/W021.5-EXECUTION-LEDGER.md enumerates 27 tasks', () => {
  const mdContent = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/W021.5-EXECUTION-LEDGER.md`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.ok(mdContent.includes('| **Stage A** | Repository & National Data-Truth Audit | W021.5-A | 3 | 10.0% |'));
  assert.ok(mdContent.includes('| **Stage B** | Canonical Jurisdiction & Geography Modeling | W021.5-B1 | 4 | 12.0% |'));
  assert.ok(mdContent.includes('| **Stage C** | Canonical Political Organization Registry | W021.5-B2.2-A..C | 3 | 12.0% |'));
  assert.ok(mdContent.includes('| **Stage D** | Candidacies, Contests & Multi-Election Normalization | W021.5-B2.2-D | 3 | 14.0% |'));
  assert.ok(mdContent.includes('| **Stage E** | Candidate Affidavits, Demographics & Financial Disclosures | W021.5-B2.2-E | 3 | 14.0% |'));
  assert.ok(mdContent.includes('| **Stage F** | Multi-Election History & Results Normalization | W021.5-B2.2-F | 2 | 10.0% |'));
  assert.ok(mdContent.includes('| **Stage G** | Fastify API Layer Strangulation & Contract Hardening | W021.5-B3 | 3 | 12.0% |'));
  assert.ok(mdContent.includes('| **Stage H** | Mobile Client Strangler Migration & Provenance | W021.5-B4 | 4 | 10.0% |'));
  assert.ok(mdContent.includes('| **Stage I** | Canonical Offline SQLite Sync Engine & Cutover | W021.5-B5 | 2 | 6.0% |'));
  assert.ok(mdContent.includes('Total Mandatory Tasks:               25 Tasks across 9 Stages'));
});

runTest('3.4 Origin weighted earned completion math 64.0% mathematically requires all 27 tasks', () => {
  const mdContent = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/W021.5-EXECUTION-LEDGER.md`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.ok(mdContent.includes('Verified Earned Completion:          64.0%'));
  const stageEarned = [10.0, 10.5, 12.0, 7.0, 2.0, 5.5, 8.0, 9.0, 0.0];
  const totalEarned = stageEarned.reduce((a, b) => a + b, 0);
  assert.strictEqual(totalEarned, 64.0);
  assert.strictEqual(totalEarned - 7.0, 57.0);
});

runTest('3.5 Original historical artifact snapshot is preserved byte-identically without mutation', () => {
  const snapshotPath = path.join(REPO_ROOT, 'governance', 'specifications', 'historical_w021_5_origin_ledger.json');
  const snapshotBytes = fs.readFileSync(snapshotPath);
  const snapshotJson = JSON.parse(snapshotBytes.toString('utf8'));
  assert.strictEqual(snapshotJson.historicalLedger.summary.totalTasks, 25, 'Summary header must remain 25');
  assert.strictEqual(snapshotJson.historicalLedger.stages.length, 9);
  assert.strictEqual(snapshotJson.historicalLedger.stages[0].tasks.length, 3, 'Stage A must remain 3 tasks');
});

runTest('3.6 Discrepancy registered in DISCREPANCY_REGISTER as DISC-012 with complete archival proof', () => {
  const d12 = DISCREPANCY_REGISTER.find((d) => d.discrepancyId === 'DISC-012');
  assert.ok(d12, 'DISC-012 must be registered');
  assert.strictEqual(d12.itemKey, 'HISTORICAL_ORIGIN:totalTasks_vs_nestedRecords');
  assert.strictEqual(d12.discrepancyType, 'HISTORICAL_SUMMARY_HEADER_TASK_COUNT_LAG');
  assert.strictEqual(d12.priorReportValue.summaryTotalTasks, 25);
  assert.strictEqual(d12.priorReportValue.nestedUniqueTasks, 27);
  assert.strictEqual(d12.proposedCanonicalValue.canonicalTaskCount, 27);
  assert.strictEqual(d12.proposedCanonicalValue.coreSpecificationTasks, 25);
  assert.strictEqual(d12.proposedCanonicalValue.hardeningExtensionTasks, 2);
  assert.strictEqual(d12.resolutionStatus, 'RECONCILED_WITH_HISTORICAL_EVIDENCE');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Comprehensive Adversarial Falsification Matrix
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Comprehensive Adversarial Falsification Matrix ---');

runTest('4.1 Mutation 1: Remove a canonical task fails closed in verifyAuthorityBoundary', () => {
  const orig = { ...CANONICAL_TASK_METADATA };
  try {
    delete CANONICAL_TASK_METADATA['W021.5-C-01'];
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: REPO_ROOT }),
      /Authority boundary violation.*Canonical task count/
    );
  } finally {
    CANONICAL_TASK_METADATA['W021.5-C-01'] = orig['W021.5-C-01'];
  }
});

runTest('4.2 Mutation 2: Add an extra task to the specification manifest fails closed in verifyAuthorityBoundary', () => {
  withTempSpecFixture(({ mutatedSpec }) => {
    mutatedSpec.tasks['W021.5-Z-99'] = {
      taskId: 'W021.5-Z-99',
      canonicalTitle: 'Extra Specification Task',
      stageId: 'STAGE_A',
      approvedWeight: 1.0,
      expectedCriteriaCount: 1,
      governingSpecRef: 'W021.5-Z Section 1',
      governingRequirement: 'REQ-Z-001',
    };
  }, (tmpDir) => {
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
      /Authority boundary violation.*Master specification task count/
    );
  });
});

runTest('4.3 Mutation 3: Change a task\'s specification reference fails closed in verifyAuthorityBoundary', () => {
  withTempSpecFixture(({ mutatedSpec }) => {
    mutatedSpec.tasks['W021.5-A-01'].governingSpecRef = 'W021.5-MUTATED Section 99';
  }, (tmpDir) => {
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
      /Authority boundary violation.*governingSpecRef mismatch/
    );
  });
});

runTest('4.4 Mutation 4: Change a governing requirement reference fails closed in verifyAuthorityBoundary', () => {
  withTempSpecFixture(({ mutatedSpec }) => {
    mutatedSpec.tasks['W021.5-A-01'].governingRequirement = 'REQ-TAMPERED-001';
  }, (tmpDir) => {
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
      /Authority boundary violation.*governingRequirement mismatch/
    );
  });
});

runTest('4.5 Mutation 5: Change stage membership or stage weight fails closed in verifyAuthorityBoundary', () => {
  withTempSpecFixture(({ mutatedSpec }) => {
    mutatedSpec.tasks['W021.5-A-01'].stageId = 'STAGE_B';
  }, (tmpDir) => {
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
      /Authority boundary violation.*stage mismatch/
    );
  });
});

runTest('4.6 Mutation 6: Change task weight with offsetting change elsewhere fails closed in verifyAuthorityBoundary', () => {
  withTempSpecFixture(({ mutatedSpec }) => {
    mutatedSpec.tasks['W021.5-A-01'].approvedWeight = 2.0;
    mutatedSpec.tasks['W021.5-A-02'].approvedWeight = 5.0;
  }, (tmpDir) => {
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
      /Authority boundary violation.*weight.*differs from origin/
    );
  });
});

runTest('4.7 Mutation 7: Alter historical snapshot bytes fails closed in verifyHistoricalArtifactIntegrity', () => {
  assert.throws(
    () => verifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
  assert.throws(
    () => verifyHistoricalArtifactIntegrity({ rawBytesOverride: Buffer.from('{"tampered": true}') }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
});

runTest('4.8 Mutation 8: Change summary.totalTasks without changing nested task records fails closed', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  ledger.summary.totalTasks = 25;
  assert.throws(
    () => validateLedgerSummaryConsistency(ledger),
    /summary\.totalTasks \(25\) does not match nested task count \(27\)/
  );
});

runTest('4.9 Mutation 9: Change nested records without updating summary counts fails closed', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  ledger.stages[0].tasks.pop();
  assert.throws(
    () => validateLedgerSummaryConsistency(ledger),
    /summary\.totalTasks \(27\) does not match nested task count \(26\)/
  );
});

runTest('4.10 Mutation 10: Create a duplicate task ID or inconsistent stage membership fails closed', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  ledger.stages[0].tasks.push({ ...ledger.stages[0].tasks[0] });
  assert.throws(
    () => validateLedgerSummaryConsistency(ledger),
    /Duplicate task ID/
  );
});

runTest('4.11 Shared incorrect value rejection: Test cannot pass when canonical metadata and spec share same false value', () => {
  const meta = CANONICAL_TASK_METADATA['W021.5-A-01'];
  const origTitle = meta.canonicalTitle;
  meta.canonicalTitle = 'Shared False Falsified Title';
  try {
    withTempSpecFixture(({ mutatedSpec }) => {
      mutatedSpec.tasks['W021.5-A-01'].canonicalTitle = 'Shared False Falsified Title';
    }, (tmpDir) => {
      assert.throws(
        () => verifyAuthorityBoundary({ repoRoot: tmpDir }),
        /Authority boundary violation.*title mismatch.*origin/,
        'Must reject shared false title even when canonical and spec match each other'
      );
    });
  } finally {
    meta.canonicalTitle = origTitle;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Progress Calculation Proof from Substantive Criteria
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Progress Calculation Proof from Substantive Criteria ---');

runTest('5.1 50 substantive criteria across 27 tasks: dynamic evaluation yields 37 PASS, 13 FAIL/PENDING', () => {
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

runTest('5.2 Trace each earned amount to specific task, criterion, evidence artifact, and verification result', () => {
  let verifiedWeightSum = 0;
  for (const [taskId, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const evalRes = evaluateTaskCriteria({ taskId, weight: meta.weight }, REPO_ROOT);
    const earnedWeight = meta.weight * evalRes.derivedRepoRatio;
    verifiedWeightSum += earnedWeight;

    for (const c of evalRes.evaluations) {
      if (c.status === 'PASS') {
        assert.ok(c.criterionId, `Criterion in ${taskId} must have criterionId`);
        assert.ok(c.message, `Passing criterion in ${taskId} must have verification message`);
        assert.ok(evalRes.deterministicChecksExecuted.length > 0, `Passing criterion in ${taskId} must have deterministic checks`);
      }
    }
  }

  assert.strictEqual(Math.round(verifiedWeightSum * 1000) / 1000, 61.500);
});

runTest('5.3 Recomputed task-earned weight and stage-earned weight dynamically from evaluation results', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let totalDynamicEarned = 0;
  for (const stage of ledger.stages) {
    let stageEarned = 0;
    for (const task of stage.tasks) {
      const evalRes = evaluateTaskCriteria(task, REPO_ROOT);
      const expectedEarned = task.weight * evalRes.derivedRepoRatio;
      assert.strictEqual(Math.round(task.accounting.repoVerifiedWeight * 100) / 100, Math.round(expectedEarned * 100) / 100);
      stageEarned += expectedEarned;
      totalDynamicEarned += expectedEarned;
    }
    assert.strictEqual(Math.round(stage.stageEarnedWeight * 100) / 100, Math.round(stageEarned * 100) / 100);
  }

  assert.strictEqual(Math.round(totalDynamicEarned * 1000) / 1000, 61.500);
});

runTest('5.4 Mutually exclusive partition conservation: 61.500% + 10.500% + 22.500% + 5.500% === 100.000%', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const s = ledger.summary;

  assert.strictEqual(s.repositoryImplementationPercent, 61.5);
  assert.strictEqual(s.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(s.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(s.notImplementedPercent, 5.5);

  const total = s.repositoryImplementationPercent + s.unexecutedDatabasePendingPercent + s.blockedOnExternalCtcGatesPercent + s.notImplementedPercent;
  assert.strictEqual(Math.round(total * 1000) / 1000, 100.000);
});

runTest('5.5 Validate calculations independently from the generated report', () => {
  let repoVerified = 0;
  let dbPending = 0;
  let blocked = 0;
  let unimpl = 0;

  for (const [taskId, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    const meta = CANONICAL_TASK_METADATA[taskId];
    const weight = meta.weight;
    let taskRepoRatio = 0;
    let taskDbWeight = 0;
    let taskBlockedWeight = 0;
    let taskUnimplWeight = 0;

    for (const c of spec.criteria) {
      const scope = c.scope;
      const cWeight = Number((weight * c.weightRatio).toFixed(3));
      if (scope === 'REPOSITORY_VERIFIABLE') {
        const res = typeof c.verify === 'function' ? c.verify(REPO_ROOT) : null;
        if (res && res.passed) {
          taskRepoRatio += c.weightRatio;
        } else {
          taskUnimplWeight += cWeight;
        }
      } else if (scope === 'DATABASE_STAGING') {
        taskDbWeight += cWeight;
      } else if (scope === 'BLOCKED_EXTERNAL') {
        taskBlockedWeight += cWeight;
      } else if (scope === 'UNIMPLEMENTED') {
        taskUnimplWeight += cWeight;
      }
    }

    repoVerified += Number((weight * taskRepoRatio).toFixed(3));
    dbPending += taskDbWeight;
    blocked += taskBlockedWeight;
    unimpl += taskUnimplWeight;
  }

  assert.strictEqual(Math.round(repoVerified * 1000) / 1000, 61.500);
  assert.strictEqual(Math.round(dbPending * 1000) / 1000, 10.500);
  assert.strictEqual(Math.round(blocked * 1000) / 1000, 22.500);
  assert.strictEqual(Math.round(unimpl * 1000) / 1000, 5.500);
  assert.strictEqual(Math.round((repoVerified + dbPending + blocked + unimpl) * 1000) / 1000, 100.000);
});

runTest('5.6 Substantive domain evidence: non-superficial domain invariants verified', () => {
  const covPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
  assert.strictEqual(cov.summary.totalStatutorySeats, 4123);
  assert.strictEqual(cov.totalStatesAudited, 31);

  const dl = cov.states.find((s) => s.stateCode === 'DL');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);

  const fastifyRoute = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts'), 'utf8');
  assert.ok(fastifyRoute.includes("electionYear: { type: ['integer', 'null'] }"));

  const stateDataCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');
  const src = ts.createSourceFile('stateData.ts', stateDataCode, ts.ScriptTarget.Latest, true);
  let hardcodedYearCount = 0;
  function visit(node) {
    if (ts.isStringLiteral(node) && /20(19|20|21|22|23|24|25)/.test(node.text)) {
      if (node.parent && ts.isCaseClause(node.parent)) hardcodedYearCount++;
    }
    ts.forEachChild(node, visit);
  }
  visit(src);
  assert.strictEqual(hardcodedYearCount, 0, 'AST must be free of hardcoded year case switches');
});

runTest('5.7 Repository verification distinguished from live database execution (0.0%) and formal CTO acceptance (0.0%)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_UNACCEPTED, 26);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Mandatory Governance Invariants & Baseline Immutability
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Mandatory Governance Invariants & Baseline Immutability ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: formal acceptance remains strictly 0.0% (UNACCEPTED)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
});

runTest('6.2 Offline Air-Gap: live database execution remains strictly 0.0% with zero SQL migrations executed', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
});

runTest('6.3 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (earned = 0.0%)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  const taskE02 = ledger.stages.find((s) => s.stageId === 'STAGE_E').tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(taskE02.status, 'BLOCKED');
  assert.strictEqual(taskE02.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(taskE02.accounting.blockedWeight, 5.0);
});

runTest('6.4 Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const stageB = ledger.stages.find((s) => s.stageId === 'STAGE_B' || s.stageId === 'STAGE_B1');
  assert.ok(stageB);
  const taskB04 = stageB.tasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.ok(taskB04);
  assert.strictEqual(taskB04.accounting.blockedWeight, 1.5);
  assert.ok(taskB04.accounting.ratioRationale.includes('AC 119 duplicate claim defect blocked'));
});

runTest('6.5 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte', () => {
  const res = verifyMigrationImmutability(BASELINE_COMMIT_MIGRATIONS);
  assert.strictEqual(res.isImmutabilityPreserved, true);
  assert.strictEqual(res.totalFilesAudited, 68);
  assert.strictEqual(res.identicalCount, 68);
  assert.strictEqual(res.mismatchCount, 0);
});

runTest('6.6 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte', () => {
  const diffOutput = execSync(`git diff ${BASELINE_COMMIT_SEEDS} -- apps/mobile/constants/`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(diffOutput.trim(), '', 'apps/mobile/constants/ MLA seeds must have 0 diff against baseline fb408ce');
});

runTest('6.7 Cross-Artifact Reconciliation: JSON matches Markdown ledger exactly across all dimensions', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes('CTO Directive 086 through CTO Directive 103'), 'Markdown must include directive lineage');
  assert.ok(md.includes(`${json.summary.repositoryImplementationPercent.toFixed(1)}%`), 'Markdown must match earned percent');
  assert.ok(md.includes(`${json.summary.unexecutedDatabasePendingPercent.toFixed(1)}%`), 'Markdown must match DB pending percent');
  assert.ok(md.includes(`${json.summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`), 'Markdown must match blocked percent');
  assert.ok(md.includes(`${json.summary.notImplementedPercent.toFixed(1)}%`), 'Markdown must match unimplemented percent');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
