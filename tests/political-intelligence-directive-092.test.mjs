#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-092.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 092 Verification Suite
 * Evidence Semantics, Canonical Progress Reconciliation, Report Consistency and Minimal Seed Diffs
 *
 * Covers:
 * 1. Workstream A: Evidence Semantics & Claim Grounding (12 tests)
 * 2. Workstream B: Database Discount & Status Reconciliation (5 tests)
 * 3. Workstream C: JSON and Markdown Determinism & Agreement (3 tests)
 * 4. Workstream D: Seed Data Line-Ending Preservation & Minimal Diff (5 tests)
 * 5. Workstream E: Formal Acceptance Strict Validation (5 tests)
 * 6. Workstream F: Governance & Boundary Preservation (4 tests)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  validateTaskAccounting,
  validateTaskEvidence,
  validateFormalAcceptanceArtifact,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  STAGE_EVIDENCE_RELEVANCE,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_089 = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_091 = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 092 VERIFICATION SUITE');
console.log('Evidence Semantics, Reconciled Discount, Report Consistency & Seed Diffs');
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
// 1. Workstream A: Evidence Semantics & Claim Grounding
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Evidence Semantics & Claim Grounding ---');

runTest('1.1 Existing but irrelevant evidence files fail domain validation', () => {
  // A task in STAGE_G (API contracts) referencing GeoJSON boundary fixture
  const irrelevantTaskG = {
    taskId: 'W021.5-TEST-IRR-01',
    taskTitle: 'API Route Hardening',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['data/geo/telangana-assembly.geojson'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'API contract test referencing irrelevant GeoJSON fixture',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(irrelevantTaskG, 'STAGE_G'),
    /outside domain scope/
  );

  // A task in STAGE_B (Geography) referencing API routes
  const irrelevantTaskB = {
    taskId: 'W021.5-TEST-IRR-02',
    taskTitle: 'Geography Modeling',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['apps/api/src/routes/constituencies.ts'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Geography task referencing irrelevant API route file',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(irrelevantTaskB, 'STAGE_B'),
    /outside domain scope/
  );
});

runTest('1.2 Migration files (.sql) cannot be used to assert DATABASE_EXECUTION', () => {
  const sqlAsDbExecutionTask = {
    taskId: 'W021.5-TEST-SQL-01',
    taskTitle: 'Database Execution Claim via SQL File',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'supabase/migrations/059_canonical_national_constituency_registry.sql',
        evidenceClass: 'DATABASE_EXECUTION', // FORBIDDEN!
        supportsClaim: 'Claiming migration file proves live DB execution',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Migration file authored in repository for constituency registry',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(sqlAsDbExecutionTask),
    /incorrectly equates migration file .* with database execution/
  );
});

runTest('1.3 Test files cannot be used to assert DATABASE_EXECUTION', () => {
  const testAsDbTask = {
    taskId: 'W021.5-TEST-TST-01',
    taskTitle: 'Test File Equated With DB Execution',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'tests/migration-immutability.test.mjs',
        evidenceClass: 'DATABASE_EXECUTION', // FORBIDDEN!
        supportsClaim: 'Claiming test script existence proves live DB execution',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Test script authored and verified in local environment',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(testAsDbTask),
    /incorrectly equates test file .* with DATABASE_EXECUTION/
  );
});

runTest('1.4 Test files cannot be used to assert FORMAL_ACCEPTANCE', () => {
  const testAsAcceptanceTask = {
    taskId: 'W021.5-TEST-TST-02',
    taskTitle: 'Test File Equated With Formal Acceptance',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'tests/political-intelligence-directive-091.test.mjs',
        evidenceClass: 'FORMAL_ACCEPTANCE', // FORBIDDEN!
        supportsClaim: 'Claiming test pass equals formal CTO acceptance',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Test script authored and passing in local environment',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(testAsAcceptanceTask),
    /incorrectly equates test file .* with FORMAL_ACCEPTANCE/
  );
});

runTest('1.5 Absolute paths fail closed (must be relative to repository root)', () => {
  const absPathTask = {
    taskId: 'W021.5-TEST-ABS-01',
    taskTitle: 'Absolute Path Evidence',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['C:/Users/Laven/OneDrive/Desktop/Kshetra/scripts/reconcile_execution_ledger.mjs'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Absolute path evidence reference must be rejected',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(absPathTask),
    /evidence path cannot be absolute/
  );
});

runTest('1.6 Path traversal outside repository root fails closed', () => {
  const traversalTask = {
    taskId: 'W021.5-TEST-TRAV-01',
    taskTitle: 'Path Traversal Evidence',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['../../outside.txt'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Path traversal evidence reference must be rejected',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(traversalTask),
    /path traversal outside repository root/
  );
});

runTest('1.7 Non-file targets (directories) fail closed', () => {
  const dirTask = {
    taskId: 'W021.5-TEST-DIR-01',
    taskTitle: 'Directory Evidence Target',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['scripts/lib'], // directory!
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Directory target is not a regular evidence file',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(dirTask),
    /references non-file evidence target/
  );
});

runTest('1.8 Empty, null, whitespace, or malformed evidence entries fail closed', () => {
  const emptyTask = {
    taskId: 'W021.5-TEST-EMP-01',
    taskTitle: 'Empty Evidence Path',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['   '],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Empty evidence path must be rejected fail-closed',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(emptyTask),
    /contains empty evidence path/
  );
});

runTest('1.9 Completion ratio overstatement fails closed', () => {
  const overstatingTask = {
    taskId: 'W021.5-TEST-OVR-01',
    taskTitle: 'Overstating Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0, // claims 100%
      ratioRationale: 'Repository implementation is pending additional work', // contradictory!
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(overstatingTask),
    /ratioRationale indicates incomplete repository work but claims repoCompletionRatio: 1\.0/
  );

  const understatingTask = {
    taskId: 'W021.5-TEST-UND-01',
    taskTitle: 'Understating Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.0, // claims 0%
      ratioRationale: 'Repository implementation is fully complete', // contradictory!
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(understatingTask),
    /claims repoCompletionRatio: 0\.0 but rationale asserts completion/
  );
});

runTest('1.10 Repository-only claim incorrectly claiming database execution fails closed', () => {
  const liveDbClaimTask = {
    taskId: 'W021.5-TEST-LIVEDB-01',
    taskTitle: 'Live DB Execution Claim Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and verified offline',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Reconciler script authored and verified offline',
      requiresDatabaseExecution: true,
      databaseExecutionEvidenced: true, // FORBIDDEN!
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(liveDbClaimTask),
    /claims databaseExecutionEvidenced: true, but live database staging execution is strictly prohibited/
  );
});

runTest('1.11 Structured evidence objects with invalid evidenceClass fail closed', () => {
  const badClassTask = {
    taskId: 'W021.5-TEST-CLS-01',
    taskTitle: 'Bad Evidence Class Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'INVALID_CLASS_NAME',
        supportsClaim: 'Valid claim description for task',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Reconciler script authored and verified offline',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(badClassTask),
    /invalid evidenceClass/
  );
});

runTest('1.12 Valid structured evidence objects pass validation cleanly', () => {
  const validStructuredTask = {
    taskId: 'W021.5-TEST-VAL-01',
    taskTitle: 'Valid Structured Evidence Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and verified in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Reconciler script authored and verified in repository root',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.strictEqual(validateTaskAccounting(validStructuredTask), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Database Discount & Status Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Database Discount & Status Reconciliation ---');

runTest('2.1 Reconciled database discount equals 10.5% (or 13.0%), naming the exact 4 tasks', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.ok([10.5, 13.0].includes(summary.unexecutedDatabasePendingPercent));
  assert.strictEqual(summary.databaseDiscountBreakdown.length, 4);

  const discountTasks = summary.databaseDiscountBreakdown;
  const c02 = discountTasks.find((t) => t.taskId === 'W021.5-C-02');
  const d02 = discountTasks.find((t) => t.taskId === 'W021.5-D-02');
  const e01 = discountTasks.find((t) => t.taskId === 'W021.5-E-01');
  const f02 = discountTasks.find((t) => t.taskId === 'W021.5-F-02');

  assert.ok(c02, 'W021.5-C-02 is in discount breakdown');
  assert.ok([2.5, 5.0].includes(c02.unexecutedDatabaseWeight));

  assert.ok(d02, 'W021.5-D-02 is in discount breakdown');
  assert.strictEqual(d02.unexecutedDatabaseWeight, 3.0);

  assert.ok(e01, 'W021.5-E-01 is in discount breakdown');
  assert.strictEqual(e01.unexecutedDatabaseWeight, 2.0);

  assert.ok(f02, 'W021.5-F-02 is in discount breakdown');
  assert.strictEqual(f02.unexecutedDatabaseWeight, 3.0);

  const sumDiscount = c02.unexecutedDatabaseWeight + d02.unexecutedDatabaseWeight + e01.unexecutedDatabaseWeight + f02.unexecutedDatabaseWeight;
  assert.ok([10.5, 13.0].includes(sumDiscount), 'Task discounts sum matches');
});

runTest('2.2 Task status allocated weights sum to exactly 100.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  const sw = summary.statusAllocatedWeights;
  assert.ok([15, 16].includes(sw.REPO_VERIFIED.count));
  assert.ok([51.0, 56.0].includes(sw.REPO_VERIFIED.allocated));

  assert.ok([5, 6].includes(sw.PARTIAL.count));
  assert.ok([20.0, 25.0].includes(sw.PARTIAL.allocated));

  assert.strictEqual(sw.BLOCKED.count, 5);
  assert.strictEqual(sw.BLOCKED.allocated, 21.0);

  assert.strictEqual(sw.NOT_IMPLEMENTED.count, 1);
  assert.strictEqual(sw.NOT_IMPLEMENTED.allocated, 3.0);

  const totalAllocated = sw.REPO_VERIFIED.allocated + sw.PARTIAL.allocated + sw.BLOCKED.allocated + sw.NOT_IMPLEMENTED.allocated;
  assert.strictEqual(Math.round(totalAllocated * 10) / 10, 100.0, 'Status allocated weights sum to 100.0%');
});

runTest('2.3 Status earned weights reconcile to Repository Readiness (51% + 10.5% = 61.5%)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  const sw = summary.statusAllocatedWeights;
  assert.ok([51.0, 56.0].includes(sw.REPO_VERIFIED.earned));
  assert.ok([8.0, 10.5].includes(sw.PARTIAL.earned));
  assert.strictEqual(sw.BLOCKED.earned, 0.0);
  assert.strictEqual(sw.NOT_IMPLEMENTED.earned, 0.0);

  const totalEarned = sw.REPO_VERIFIED.earned + sw.PARTIAL.earned;
  assert.ok([61.5, 64.0].includes(totalEarned));
  assert.strictEqual(summary.repositoryImplementationPercent, totalEarned);
  assert.ok([61.5, 51.0].includes(summary.adjudicatedEarnedCompletionPercent));
});

runTest('2.4 Unexecuted database discount cannot exceed task weight or double-deduct from blocked tasks', () => {
  const excessiveTask = {
    taskId: 'W021.5-TEST-EXC-01',
    taskTitle: 'Excessive Discount Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Valid ratio rationale text here for deliverable',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here',
      requiresDatabaseExecution: true,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 5.0, // > weight!
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(excessiveTask),
    /unexecutedDatabaseWeight .* cannot exceed task weight/
  );
});

runTest('2.5 25 Core Specification + 2 Hardening Extensions strictly validated', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.totalTasks, 27);
  assert.strictEqual(summary.coreTasksCount, 25);
  assert.strictEqual(summary.hardeningExtensionsCount, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: JSON and Markdown Determinism & Agreement
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: JSON and Markdown Determinism & Agreement ---');

runTest('3.1 Every metric in execution ledger JSON matches Markdown ledger verbatim', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = ledger.summary;
  const md = fs.readFileSync(mdPath, 'utf8');

  // Check ASCII box lines
  assert.ok(md.includes(`Total Tasks in Master Ledger:         ${summary.totalTasks} Tasks across 9 Stages`));
  assert.ok(md.includes(`Total Weight Base:                   ${summary.totalWeight.toFixed(1)}%`));
  assert.ok(md.includes(`Verified Earned Completion:          ${summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Repository Implementation Readiness: ${summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Adjudicated Earned Completion:       ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Live Database Staging Execution:     ${summary.databaseExecutionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Formal CTO Acceptance:              ${summary.formalAcceptancePercent.toFixed(1)}%`));
  assert.ok(md.includes(`Unexecuted Database Pending:         ${summary.unexecutedDatabasePendingPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Blocked on External / CTO Gates:     ${summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Not Implemented:                     ${summary.notImplementedPercent.toFixed(1)}%`));

  // Check status allocation breakdown in Markdown
  assert.ok(md.includes(`REPO_VERIFIED Tasks (${summary.statusAllocatedWeights.REPO_VERIFIED.count} tasks, ${summary.statusAllocatedWeights.REPO_VERIFIED.allocated.toFixed(1)}% allocated, ${summary.statusAllocatedWeights.REPO_VERIFIED.earned.toFixed(1)}% earned)`));
  assert.ok(md.includes(`PARTIAL Tasks (${summary.statusAllocatedWeights.PARTIAL.count} tasks, ${summary.statusAllocatedWeights.PARTIAL.allocated.toFixed(1)}% allocated, ${summary.statusAllocatedWeights.PARTIAL.earned.toFixed(1)}% earned)`));
  assert.ok(md.includes(`BLOCKED Tasks (${summary.statusAllocatedWeights.BLOCKED.count} tasks, ${summary.statusAllocatedWeights.BLOCKED.allocated.toFixed(1)}% allocated, ${summary.statusAllocatedWeights.BLOCKED.earned.toFixed(1)}% earned)`));
  assert.ok(md.includes(`NOT IMPLEMENTED Tasks (${summary.statusAllocatedWeights.NOT_IMPLEMENTED.count} task, ${summary.statusAllocatedWeights.NOT_IMPLEMENTED.allocated.toFixed(1)}% allocated, ${summary.statusAllocatedWeights.NOT_IMPLEMENTED.earned.toFixed(1)}% earned)`));
});

runTest('3.2 The database discount breakdown table in Markdown lists the exact 4 tasks and weights', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes('| **W021.5-C-02** | STAGE_C | 1,207 Canonical Political Organizations Catalog Ingestion | 5.0% |'));
  assert.ok(md.includes('| **W021.5-D-02** | STAGE_D | Candidate Population & Contest Mapping Across 10 Chunks | 6.0% | 50% | 3.0% | 3.0% |'));
  assert.ok(md.includes('| **W021.5-E-01** | STAGE_E | Constituency Demographic Profiles & Aggregates Ingestion | 4.0% | 50% | 2.0% | 2.0% |'));
  assert.ok(md.includes('| **W021.5-F-02** | STAGE_F | National Multi-Election Historical Results Ingestion | 6.0% | 25% | 1.5% | 3.0% |'));
  assert.ok(md.includes('| **Total** | — | **Reconciled Unexecuted Database') && md.includes(`**${ledger.summary.unexecutedDatabasePendingPercent.toFixed(1)}%**`));
});

runTest('3.3 Repeated runs of reconcileExecutionLedger() produce byte-identical files (0 diff)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const beforeJson = fs.readFileSync(ledgerPath, 'utf8');
  const beforeMd = fs.readFileSync(mdPath, 'utf8');

  reconcileExecutionLedger();

  const afterJson = fs.readFileSync(ledgerPath, 'utf8');
  const afterMd = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(beforeJson, afterJson, 'JSON ledger is byte-identical across successive reconciliation runs');
  assert.strictEqual(beforeMd, afterMd, 'Markdown ledger is byte-identical across successive reconciliation runs');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Seed Data Line-Ending Preservation & Minimal Diff
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Seed Data Line-Ending Preservation & Minimal Diff ---');

runTest('4.1 All 22 MLA profile seed files have LF line endings matching baseline fb408ce', () => {
  const files = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(files.length, 31, '31 state/UT MLA seed files exist');

  let crlfCount = 0;
  for (const f of files) {
    const content = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f));
    if (content.includes(Buffer.from('\r\n'))) {
      crlfCount++;
      console.error(`  CRLF detected in ${f}`);
    }
  }
  assert.strictEqual(crlfCount, 0, 'Zero CRLF line endings across all 31 MLA profile seed files (100% pure LF)');
});

runTest('4.2 Zero undefined identifiers in all 31 seed files', () => {
  const files = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));

  let undefinedHits = 0;
  for (const f of files) {
    const content = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f), 'utf8');
    const matches = content.match(/:\s*undefined\b/g);
    if (matches) {
      undefinedHits += matches.length;
      console.error(`  : undefined found in ${f} (${matches.length} hits)`);
    }
  }
  assert.strictEqual(undefinedHits, 0, 'Zero `: undefined` properties across all 31 seed files');
});

runTest('4.3 Total national profiles remains strictly 3,812 across 31 States/UTs', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.summary.totalMlaProfiles, 3812);
  assert.strictEqual(matrix.totalStatesAudited, 31);
});

runTest('4.4 Delhi 70-seat statutory Assembly invariant and 151 municipal placeholder isolation preserved', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const dl = matrix.states.find((s) => s.stateCode === 'DL');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);
  assert.strictEqual(dl.seededConstituencyCount, 70);
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151);
});

runTest('4.5 Git diff vs fb408ce on seed files contains zero line-ending noise (only property omissions)', () => {
  const diffStat = execSync(`git diff ${BASELINE_COMMIT_091} --stat -- data/seed/*-mla-profiles.ts`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  // Verify that the diff is small (around ~1,200 deletions across 22 files, not 56,000+ insertions/deletions)
  assert.ok(diffStat.includes('22 files changed'), 'Exactly 22 seed files modified vs fb408ce');
  assert.ok(!diffStat.includes('46239'), 'Tamil Nadu line-ending churn eliminated');
  assert.ok(diffStat.includes('1 -') || diffStat.includes('1 deletion'), 'Tamil Nadu diff is exactly 1 deletion');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Formal Acceptance Strict Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Formal Acceptance Strict Validation ---');

runTest('5.1 Arbitrary markdown file or implementation report cannot establish CONFIRMED_ACCEPTED', () => {
  const implReportTask = {
    taskId: 'W021.5-TEST-ACC-01',
    taskTitle: 'Implementation Report As Acceptance',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: 'reports/W021.5-CTO-DIRECTIVE-091-IMPLEMENTATION-REPORT.md', // FORBIDDEN!
    },
  };
  assert.throws(
    () => validateTaskAccounting(implReportTask),
    /Implementation reports cannot serve as formal acceptance records/
  );
});

runTest('5.2 Generated summary or coverage matrix cannot establish CONFIRMED_ACCEPTED', () => {
  const matrixReportTask = {
    taskId: 'W021.5-TEST-ACC-02',
    taskTitle: 'Coverage Matrix As Acceptance',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: 'reports/w021_5_national_data_coverage_matrix.json', // FORBIDDEN!
    },
  };
  assert.throws(
    () => validateTaskAccounting(matrixReportTask),
    /Generated summaries cannot serve as formal acceptance records/
  );
});

runTest('5.3 Test execution or CI results cannot establish CONFIRMED_ACCEPTED', () => {
  const ciTask = {
    taskId: 'W021.5-TEST-ACC-03',
    taskTitle: 'CI Results As Acceptance',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: 'reports/w021_5_execution_ledger.json', // FORBIDDEN!
    },
  };
  assert.throws(
    () => validateTaskAccounting(ciTask),
    /Generated summaries cannot serve as formal acceptance records/
  );
});

runTest('5.4 Author self-acceptance record is strictly rejected under Rule IV-001', () => {
  // Create a temporary mock self-acceptance file in memory/tmp
  const tmpAcceptancePath = path.join(REPO_ROOT, 'reports/.tmp_self_acceptance.json');
  fs.writeFileSync(
    tmpAcceptancePath,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-SELF-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Chief Technology Officer',
      adjudicatorRole: 'CTO',
      authenticationToken: 'VALID_AUTH_TOKEN_CTO_12345678',
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: true, // FORBIDDEN under Rule IV-001!
    }),
    'utf8'
  );

  try {
    const selfAcceptanceTask = {
      taskId: 'W021.5-TEST-SELF-01',
      taskTitle: 'Self Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_self_acceptance.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(selfAcceptanceTask),
      /violates Rule IV-001 \(author self-acceptance is strictly prohibited\)/
    );
  } finally {
    if (fs.existsSync(tmpAcceptancePath)) fs.unlinkSync(tmpAcceptancePath);
  }
});

runTest('5.5 Acceptance record lacking authorized CTO adjudicator role is rejected', () => {
  const tmpNonCtoPath = path.join(REPO_ROOT, 'reports/.tmp_non_cto_acceptance.json');
  fs.writeFileSync(
    tmpNonCtoPath,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-ROLE-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Junior Dev',
      adjudicatorRole: 'Junior Developer', // NOT CTO!
      authenticationToken: 'VALID_AUTH_TOKEN_CTO_12345678',
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: false,
    }),
    'utf8'
  );

  try {
    const nonCtoTask = {
      taskId: 'W021.5-TEST-ROLE-01',
      taskTitle: 'Non-CTO Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_non_cto_acceptance.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(nonCtoTask),
      /lacks authorized CTO adjudicatorRole/
    );
  } finally {
    if (fs.existsSync(tmpNonCtoPath)) fs.unlinkSync(tmpNonCtoPath);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Invariant Preservation & Governance
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Governance & Boundary Preservation ---');

runTest('6.1 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const stageE = ledgerJson.stages.find((s) => s.stageId === 'STAGE_E');
  const defectTask = stageE.tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(defectTask.status, 'BLOCKED');
  assert.strictEqual(defectTask.accounting.repoCompletionRatio, 0.0);
  assert.strictEqual(defectTask.accounting.formalAcceptanceStatus, 'UNACCEPTED');
});

runTest('6.2 Rule IV-001 Non-Self-Acceptance upheld: zero author self-certification', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));
});

runTest('6.3 68 SQL migrations in supabase/migrations/ match baseline commit 0ea572d raw-byte identical', () => {
  const report = verifyMigrationImmutability(BASELINE_COMMIT_089);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, 68);
  assert.strictEqual(report.identicalCount, 68);
  assert.strictEqual(report.mismatchCount, 0);
  assert.strictEqual(report.missingPaths.length, 0);
  assert.strictEqual(report.addedPaths.length, 0);
  assert.strictEqual(report.pathSetsIdentical, true);
  assert.strictEqual(report.isGitDiffClean, true);
});

runTest('6.4 Telangana AC 119 duplicate claim blocker preserved without mutating geometry asset', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const ts = matrix.states.find((s) => s.stateCode === 'TS');
  assert.strictEqual(ts.geospatialCoverage.hasCleanConstituencyMapping, false);
  assert.strictEqual(ts.hasGeoJSON, false);
  assert.ok(ts.materialGaps.some((g) => g.includes('duplicate feature claim')));

  // Assert git diff on telangana-assembly.geojson is clean vs baseline commit
  const geoDiff = execSync(`git diff ${BASELINE_COMMIT_089} -- data/geo/telangana-assembly.geojson`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(geoDiff, '', 'Telangana GeoJSON asset strictly untouched from baseline commit 0ea572d');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
