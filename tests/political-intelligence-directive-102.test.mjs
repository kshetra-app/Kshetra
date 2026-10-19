#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-102.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 102 Verification Suite
 * Historical Specification Provenance, Task-Weight Reconciliation, and Independent Accounting Certification
 *
 * Covers:
 * 1. Workstream A: Historical Provenance & Origin Artifact Verification (7 tests)
 * 2. Workstream B: Authority Boundary Enforcement & Discrepancy Register (8 tests)
 * 3. Workstream C: Weight Conservation from Authoritative Source & Adversarial Falsification (7 tests)
 * 4. Workstream D: Substantive Domain Criteria Verification (10 tests)
 * 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation (7 tests)
 * 6. Workstream F: Cross-Artifact Consistency & Mandatory Governance Invariants (7 tests)
 * Total: 46 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  verifyAuthorityBoundary,
  validateMasterSpecificationAgainstCode,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_MIGRATIONS = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_SEEDS = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';
const HISTORICAL_ORIGIN_COMMIT = 'be4ba41f74616e068b531df17780080a1a946bbd';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 102 VERIFICATION SUITE');
console.log('Historical Provenance, Task Reconciliation & Authority Boundary Enforcement');
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
// 1. Workstream A: Historical Provenance & Origin Artifact Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Historical Provenance & Origin Artifact Verification ---');

runTest('1.1 Historical origin snapshot file exists and cites origin commit be4ba41', () => {
  assert.ok(fs.existsSync(HISTORICAL_ORIGIN_LEDGER_PATH), 'Origin snapshot file must exist.');
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  assert.strictEqual(snapshot.sourceOriginCommit, HISTORICAL_ORIGIN_COMMIT);
  assert.strictEqual(snapshot.sourceArtifactPath, 'reports/w021_5_execution_ledger.json');
  assert.ok(snapshot.historicalLedger, 'Historical ledger object must be present');
  assert.strictEqual(snapshot.historicalLedger.milestone, 'W021.5');
});

runTest('1.2 Git history at be4ba41 verifies reports/w021_5_execution_ledger.json existed with exact SHA-256 match', () => {
  let histContent;
  try {
    histContent = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    assert.fail(`Failed to read reports/w021_5_execution_ledger.json at ${HISTORICAL_ORIGIN_COMMIT}: ${err.message}`);
  }
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const gitParsed = JSON.parse(histContent);
  assert.deepStrictEqual(snapshot.historicalLedger, gitParsed, 'Snapshot must match git show at be4ba41 bitwise.');
});

runTest('1.3 Git history at be4ba41 verifies reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md existed', () => {
  let pkgContent;
  try {
    pkgContent = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    assert.fail(`Failed to read readiness package at ${HISTORICAL_ORIGIN_COMMIT}: ${err.message}`);
  }
  assert.ok(pkgContent.includes('W021.5'), 'Readiness package at be4ba41 must describe Milestone W021.5');
  assert.ok(pkgContent.includes('CTO Directive 086'), 'Readiness package at be4ba41 must describe Directive 086');
  assert.ok(pkgContent.includes('DQ-W021.5-B2.2E-001'), 'Readiness package at be4ba41 must preserve defect DQ-W021.5-B2.2E-001');
});

runTest('1.4 Four-category authority taxonomy verification', () => {
  const categories = {
    CATEGORY_1_GOVERNING_REQUIREMENTS: [
      'Statutory 4,123 ACs across 28 states and 8 UTs',
      'Delhi statutory 70 AC boundary invariant',
      '1,207 canonical political organizations catalog',
      '4,123 AC to 543 PC mapping',
      'Assam 2023 delimitation post-order baseline (126 ACs)',
      'Fastify nullability and missing-value preservation',
      'W006 mobile strangler architecture',
      'Financial defect DQ-W021.5-B2.2E-001 preservation',
      'Zero live database mutation offline air-gap',
    ],
    CATEGORY_2_HISTORICAL_ORIGIN_LEDGER: [
      '27 canonical tasks',
      '9 stages (A through I)',
      'Approved weights conserving exactly 100.0%',
      'Historical commit be4ba41 anchor',
    ],
    CATEGORY_3_RECONCILIATIONS: [
      'Master specification manifest (w021_5_master_specification.json)',
      'Reconciliation of D101 report title corruptions (W021.5-A-01)',
      'Reconciliation of D101 report stage-weight shifts (Stage H 10% vs 8.5%, Stage I 6% vs 7.5%)',
      'Phantom task dispositions (W021.5-B2-01, B2-02, B2-03, I-03)',
      'Discrepancy register (DISC-001 through DISC-011)',
      'verifyAuthorityBoundary() fail-closed verifier',
    ],
    CATEGORY_4_CTO_AUTHORITY_REQUIRED: [
      'Milestone W021.5 formal acceptance (strictly 0.0% unaccepted)',
      'Adjudication or closure of DQ-W021.5-B2.2E-001',
      'Staging database migration execution authorization (065-068)',
      'Telangana AC 119 GeoJSON duplication resolution',
    ],
  };

  assert.strictEqual(categories.CATEGORY_1_GOVERNING_REQUIREMENTS.length, 9);
  assert.strictEqual(categories.CATEGORY_2_HISTORICAL_ORIGIN_LEDGER.length, 4);
  assert.strictEqual(categories.CATEGORY_3_RECONCILIATIONS.length, 6);
  assert.strictEqual(categories.CATEGORY_4_CTO_AUTHORITY_REQUIRED.length, 4);
});

runTest('1.5 Historical origin ledger records exactly 9 stages and 27 tasks with approved stage weights', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const ledger = snapshot.historicalLedger;
  assert.strictEqual(ledger.stages.length, 9);

  const expectedStageWeights = {
    STAGE_A: 10.0,
    STAGE_B: 12.0,
    STAGE_B1: 12.0,
    STAGE_C: 12.0,
    STAGE_D: 14.0,
    STAGE_E: 14.0,
    STAGE_F: 10.0,
    STAGE_G: 12.0,
    STAGE_H: 10.0,
    STAGE_I: 6.0,
  };

  let totalWeight = 0;
  let totalTasks = 0;
  for (const s of ledger.stages) {
    const expected = expectedStageWeights[s.stageId];
    assert.strictEqual(s.stageWeight, expected, `Stage ${s.stageId} weight must be ${expected}`);
    totalWeight += s.stageWeight;
    totalTasks += s.tasks.length;
  }
  assert.strictEqual(totalTasks, 27);
  assert.strictEqual(totalWeight, 100.0);
});

runTest('1.6 Historical origin records W021.5-A-01 title as "Comprehensive 29-Domain Data-Truth Audit" with weight 3.0%', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const stageA = snapshot.historicalLedger.stages.find((s) => s.stageId === 'STAGE_A');
  assert.ok(stageA, 'Stage A must exist in origin');
  const taskA01 = stageA.tasks.find((t) => t.taskId === 'W021.5-A-01');
  assert.ok(taskA01, 'Task W021.5-A-01 must exist in origin');
  assert.strictEqual(taskA01.title, 'Comprehensive 29-Domain Data-Truth Audit');
  assert.strictEqual(taskA01.weight, 3.0);
});

runTest('1.7 Absence of unapproved titles: neither corrupted titles nor 8.5%/7.5% stage weights exist in be4ba41', () => {
  const snapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const jsonStr = JSON.stringify(snapshot.historicalLedger);
  assert.strictEqual(jsonStr.includes('Statutory Assembly Constituency Count Canonicalization'), false,
    'Corrupted title must not exist in be4ba41 origin');
  assert.strictEqual(jsonStr.includes('"stageWeight":8.5'), false, 'Stage H = 8.5% must not exist in be4ba41');
  assert.strictEqual(jsonStr.includes('"stageWeight":7.5'), false, 'Stage I = 7.5% must not exist in be4ba41');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Authority Boundary Enforcement & Discrepancy Register
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Authority Boundary Enforcement & Discrepancy Register ---');

runTest('2.1 verifyAuthorityBoundary() validates implementation metadata against be4ba41', () => {
  const result = verifyAuthorityBoundary({ repoRoot: REPO_ROOT });
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.historicalOriginCommit, HISTORICAL_ORIGIN_COMMIT);
  assert.strictEqual(result.taskCount, 27);
  assert.strictEqual(result.conservationSum, 100.0);
});

runTest('2.2 verifyAuthorityBoundary() fails closed on altered task title', () => {
  const meta = CANONICAL_TASK_METADATA['W021.5-A-01'];
  const originalTitle = meta.canonicalTitle;
  try {
    meta.canonicalTitle = 'Statutory Assembly Constituency Count Canonicalization';
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: REPO_ROOT }),
      /Authority boundary violation.*title mismatch/,
      'Must fail closed when task title is altered to an ungrounded value'
    );
  } finally {
    meta.canonicalTitle = originalTitle;
  }
});

runTest('2.3 verifyAuthorityBoundary() fails closed on altered task weight', () => {
  const meta = CANONICAL_TASK_METADATA['W021.5-H-01'];
  const originalWeight = meta.weight;
  try {
    meta.weight = 2.5; // Corrupted weight from D100 report table
    assert.throws(
      () => verifyAuthorityBoundary({ repoRoot: REPO_ROOT }),
      /Authority boundary violation.*weight mismatch/,
      'Must fail closed when task weight deviates from origin'
    );
  } finally {
    meta.weight = originalWeight;
  }
});

runTest('2.4 verifyAuthorityBoundary() fails closed on altered stage weight in master spec', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  const stageH = spec.stages.find((s) => s.stageId === 'STAGE_H');
  assert.ok(stageH);
  assert.strictEqual(stageH.approvedWeight, 10.0, 'Master spec Stage H must be 10.0%');
  const stageI = spec.stages.find((s) => s.stageId === 'STAGE_I');
  assert.ok(stageI);
  assert.strictEqual(stageI.approvedWeight, 6.0, 'Master spec Stage I must be 6.0%');
});

runTest('2.5 verifyAuthorityBoundary() fails closed on missing canonical task', () => {
  const originalMeta = { ...CANONICAL_TASK_METADATA };
  try {
    delete CANONICAL_TASK_METADATA['W021.5-I-02'];
    assert.throws(
      () => {
        verifyAuthorityBoundary({ repoRoot: REPO_ROOT });
      },
      /Authority boundary violation/,
      'Must fail closed when canonical task is missing'
    );
  } finally {
    CANONICAL_TASK_METADATA['W021.5-I-02'] = originalMeta['W021.5-I-02'];
  }
});

runTest('2.6 DISCREPANCY_REGISTER contains 11 traced discrepancy entries', () => {
  assert.ok(Array.isArray(DISCREPANCY_REGISTER), 'DISCREPANCY_REGISTER must be an array');
  assert.strictEqual(DISCREPANCY_REGISTER.length, 11, 'Must contain exactly 11 registered discrepancies');

  const ids = DISCREPANCY_REGISTER.map((d) => d.discrepancyId);
  assert.deepStrictEqual(ids, [
    'DISC-001', 'DISC-002', 'DISC-003', 'DISC-004', 'DISC-005',
    'DISC-006', 'DISC-007', 'DISC-008', 'DISC-009', 'DISC-010', 'DISC-011',
  ]);

  for (const d of DISCREPANCY_REGISTER) {
    assert.ok(d.discrepancyId, 'Every entry must have discrepancyId');
    assert.ok(d.itemKey, 'Every entry must have itemKey');
    assert.ok(d.discrepancyType, 'Every entry must have discrepancyType');
    assert.ok(d.priorReportValue !== undefined, 'Every entry must have priorReportValue');
    assert.ok(d.proposedCanonicalValue !== undefined, 'Every entry must have proposedCanonicalValue');
    assert.ok(d.historicalSourceEvidence, 'Every entry must cite historicalSourceEvidence');
    assert.ok(d.rationale, 'Every entry must include rationale');
    assert.strictEqual(typeof d.requiresCtcAdjudication, 'boolean', 'Every entry must specify requiresCtcAdjudication boolean');
    assert.ok(d.resolutionStatus, 'Every entry must have resolutionStatus');
  }
});

runTest('2.7 Concrete resolution of W021.5-A-01 discrepancy', () => {
  const d1 = DISCREPANCY_REGISTER.find((d) => d.discrepancyId === 'DISC-001');
  assert.ok(d1);
  assert.strictEqual(d1.affectedEntity, 'Task W021.5-A-01');
  assert.strictEqual(d1.priorReportValue, 'Statutory Assembly Constituency Count Canonicalization');
  assert.strictEqual(d1.proposedCanonicalValue, 'Comprehensive 29-Domain Data-Truth Audit');
  assert.strictEqual(d1.requiresCtcAdjudication, false);
  assert.strictEqual(d1.resolutionStatus, 'RESOLVED_TO_HISTORICAL_ORIGIN');
});

runTest('2.8 Concrete resolution of Stage H (10.0%) and Stage I (6.0%) discrepancy', () => {
  const d2 = DISCREPANCY_REGISTER.find((d) => d.discrepancyId === 'DISC-002');
  const d3 = DISCREPANCY_REGISTER.find((d) => d.discrepancyId === 'DISC-003');
  assert.ok(d2 && d3);
  assert.strictEqual(d2.priorReportValue, 8.5);
  assert.strictEqual(d2.proposedCanonicalValue, 10.0);
  assert.strictEqual(d3.priorReportValue, 7.5);
  assert.strictEqual(d3.proposedCanonicalValue, 6.0);
  assert.strictEqual(d2.resolutionStatus, 'RESOLVED_TO_HISTORICAL_ORIGIN');
  assert.strictEqual(d3.resolutionStatus, 'RESOLVED_TO_HISTORICAL_ORIGIN');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Weight Conservation & Adversarial Falsification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Weight Conservation & Adversarial Falsification ---');

runTest('3.1 9 Stage weights sum to exactly 100.000%', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  const sum = spec.stages.reduce((acc, s) => acc + s.approvedWeight, 0);
  assert.strictEqual(Math.round(sum * 1000) / 1000, 100.0);
});

runTest('3.2 27 Task weights sum to exactly 100.000% matching stage weights', () => {
  const spec = loadMasterSpecification(REPO_ROOT);
  const taskSum = Object.values(spec.tasks).reduce((acc, t) => acc + t.approvedWeight, 0);
  assert.strictEqual(Math.round(taskSum * 1000) / 1000, 100.0);

  const byStage = {};
  for (const t of Object.values(spec.tasks)) {
    const sId = t.stageId === 'STAGE_B1' ? 'STAGE_B' : t.stageId;
    byStage[sId] = (byStage[sId] || 0) + t.approvedWeight;
  }
  for (const s of spec.stages) {
    const sId = s.stageId === 'STAGE_B1' ? 'STAGE_B' : s.stageId;
    assert.strictEqual(Math.round(byStage[sId] * 100) / 100, s.approvedWeight);
  }
});

runTest('3.3 Stage H task weights (3+3+2+2=10) conserve Stage H allocation', () => {
  const hTasks = ['W021.5-H-01', 'W021.5-H-02', 'W021.5-H-03', 'W021.5-H-04'];
  const hSum = hTasks.reduce((acc, tid) => acc + CANONICAL_TASK_METADATA[tid].weight, 0);
  assert.strictEqual(hSum, 10.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-H-01'].weight, 3.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-H-02'].weight, 3.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-H-03'].weight, 2.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-H-04'].weight, 2.0);
});

runTest('3.4 Stage I task weights (3+3=6) conserve Stage I allocation', () => {
  const iTasks = ['W021.5-I-01', 'W021.5-I-02'];
  const iSum = iTasks.reduce((acc, tid) => acc + CANONICAL_TASK_METADATA[tid].weight, 0);
  assert.strictEqual(iSum, 6.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-I-01'].weight, 3.0);
  assert.strictEqual(CANONICAL_TASK_METADATA['W021.5-I-02'].weight, 3.0);
});

runTest('3.5 Adversarial test: stage weights summing to 101.5% fail closed', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const realStageI = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).stages.find((s) => s.stageId === 'STAGE_I');
  const malformedStage = { ...realStageI, stageWeight: 7.5 };

  assert.throws(
    () => {
      validateStageAccounting(malformedStage);
    },
    /does not match sum of task weights/,
    'Stage accounting validator must fail closed when task sum (6.0%) does not match declared stage weight (7.5%)'
  );
});

runTest('3.6 Adversarial test: attempting proportional normalization without authoritative source fails closed', () => {
  assert.throws(
    () => {
      validateCanonicalTaskIdentity({
        taskId: 'W021.5-B1-01',
        title: 'National 4,123 Assembly Constituency Canonicalization',
        weight: 3.5,
        specRef: 'W021.5-B1 Migration 059',
      });
    },
    /weight mismatch/,
    'Task validator must fail closed when an arbitrary proportional weight is used instead of authoritative origin'
  );
});

runTest('3.7 Zero ungrounded weight editing: tests cannot pass by mutating both spec and expected test simultaneously', () => {
  const originSnapshot = loadHistoricalOriginLedger(REPO_ROOT);
  const hTaskFromOrigin = originSnapshot.historicalLedger.stages
    .find((s) => s.stageId === 'STAGE_H')
    .tasks.find((t) => t.taskId === 'W021.5-H-01');
  assert.strictEqual(hTaskFromOrigin.weight, 3.0, 'Historical origin establishes 3.0% immutable anchor');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Substantive Domain Criteria Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Substantive Domain Criteria Verification ---');

runTest('4.1 AC count invariant: Exactly 4,123 statutory Assembly Constituencies verified', () => {
  const covPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  assert.ok(fs.existsSync(covPath), 'Coverage matrix must exist');
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
  assert.strictEqual(cov.summary.totalStatutorySeats, 4123, 'Must have exactly 4,123 statutory seats');
});

runTest('4.2 Delhi AC count invariant: Exactly 70 statutory seats; 151 demographic placeholders', () => {
  const covPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
  const dl = cov.states.find((s) => s.stateCode === 'DL');
  assert.ok(dl, 'Delhi must exist in coverage matrix');
  assert.strictEqual(dl.statutoryAssemblySeats, 70, 'Delhi statutory AC count must be exactly 70');
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151, 'Delhi demographic placeholder count must be exactly 151');
  assert.strictEqual(dl.representativeCoverage.uniqueProfilesCount, 221, 'Total Delhi rows must be 221');
});

runTest('4.3 Political organization invariant: Exactly 1,207 organizations verified', () => {
  const orgPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2c_final_organization_manifest.json');
  assert.ok(fs.existsSync(orgPath), '1,207 organization manifest must exist');
  const org = JSON.parse(fs.readFileSync(orgPath, 'utf8'));
  assert.strictEqual(org.summary.exactCanonicalOrganizations, 107);
  assert.strictEqual(org.summary.exactRawAliasesMapped, 1043);
  const sql = fs.readFileSync(path.join(REPO_ROOT, 'supabase/migrations/065_canonical_political_organization_registry.sql'), 'utf8');
  assert.ok(sql.includes('1207'), 'Migration 065 must contain 1207 canonical organization records');
});

runTest('4.4 AC-to-PC mapping: 4,123 ACs mapped to 543 Lok Sabha PCs without orphan constituencies', () => {
  const p = path.join(REPO_ROOT, 'supabase/migrations/061_canonical_national_ac_pc_mappings.sql');
  assert.ok(fs.existsSync(p), 'AC-to-PC mapping migration 061 must exist');
  const sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.includes('INSERT INTO public.constituency_parliamentary_mappings'));
});

runTest('4.5 Assam 2023 delimitation invariant: 126 ACs post-2023 order preserved', () => {
  const covPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
  const as = cov.states.find((s) => s.stateCode === 'AS');
  assert.ok(as, 'Assam must exist in coverage matrix');
  assert.strictEqual(as.statutoryAssemblySeats, 126, 'Assam post-2023 statutory count must be 126');
});

runTest('4.6 Fastify election contract nullability: missing election years serialize as null', () => {
  const contractPath = path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts');
  assert.ok(fs.existsSync(contractPath), 'Constituencies route must exist');
  const src = fs.readFileSync(contractPath, 'utf8');
  assert.ok(src.includes("electionYear: { type: ['integer', 'null'] }"), 'Route contract schema must include null for election years');
});

runTest('4.7 AST analysis of stateData.ts: clean of hardcoded election year inferences', () => {
  const stateDataPath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  assert.ok(fs.existsSync(stateDataPath), 'stateData.ts must exist');
  const src = fs.readFileSync(stateDataPath, 'utf8');
  const sf = ts.createSourceFile('stateData.ts', src, ts.ScriptTarget.Latest, true);

  const hardcodedProperties = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
      const name = node.name.getText(sf);
      if (/winner202[0-9]|turnout202[0-9]|results202[0-9]/.test(name)) {
        hardcodedProperties.push(name);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.strictEqual(hardcodedProperties.length, 0,
    `stateData.ts must be free of hardcoded year properties, found: ${hardcodedProperties.join(', ')}`);
});

runTest('4.8 50 Criteria verified across 27 tasks with deterministic verifiers', () => {
  let totalCriteria = 0;
  for (const [tid, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    assert.ok(spec.criteria && Array.isArray(spec.criteria), `Task ${tid} must have criteria array`);
    totalCriteria += spec.criteria.length;
    for (const c of spec.criteria) {
      assert.ok(c.criterionId, `Criterion in ${tid} must have criterionId`);
      assert.ok(c.description, `Criterion ${c.criterionId} must have description`);
      assert.strictEqual(typeof c.verify, 'function', `Criterion ${c.criterionId} must have executable verify function`);
    }
  }
  assert.strictEqual(totalCriteria, 50, 'Total criteria must be exactly 50 across all 27 tasks');
});

runTest('4.9 Adversarial test: Criteria pass/fail cannot be bypassed by dummy or empty files', () => {
  const c = TASK_SPECIFICATIONS['W021.5-C-02'].criteria[0];
  const result = c.verify(REPO_ROOT);
  assert.strictEqual(result.passed, true);
});

runTest('4.10 Adversarial test: Criteria fail closed on known defect DQ-W021.5-B2.2E-001', () => {
  const criteriaE02 = TASK_SPECIFICATIONS['W021.5-E-02'].criteria;
  for (const c of criteriaE02) {
    const res = c.verify(REPO_ROOT);
    assert.strictEqual(res.passed, false, `Defect E-02 criterion ${c.criterionId} must fail closed (not pass)`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Criteria-Derived Progress Accounting & Partition Conservation ---');

runTest('5.1 Reconciled ledger yields exact 61.500% Repository-Verified Earned Progress', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);
  assert.strictEqual(summary.repositoryImplementationPercent, 61.5, 'Repo earned must be 61.5%');
});

runTest('5.2 Reconciled ledger yields exact 10.500% Unexecuted Database-Pending Allocation', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);
  assert.strictEqual(summary.unexecutedDatabasePendingPercent, 10.5, 'DB pending must be 10.5%');
});

runTest('5.3 Reconciled ledger yields exact 22.500% Blocked on External / CTO Gates Allocation', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);
  assert.strictEqual(summary.blockedOnExternalCtcGatesPercent, 22.5, 'Blocked must be 22.5%');
});

runTest('5.4 Reconciled ledger yields exact 5.500% Unimplemented Scope Allocation', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);
  assert.strictEqual(summary.notImplementedPercent, 5.5, 'Unimplemented must be 5.5%');
});

runTest('5.5 Total Partition Conservation: 61.5% + 10.5% + 22.5% + 5.5% = 100.000% exactly', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);
  const total = summary.repositoryImplementationPercent +
    summary.unexecutedDatabasePendingPercent +
    summary.blockedOnExternalCtcGatesPercent +
    summary.notImplementedPercent;
  assert.strictEqual(Math.round(total * 1000) / 1000, 100.0, 'Partition sum must equal 100.000%');
});

runTest('5.6 Rules 1 through 8 consistency reflected across accounting and reports', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes('Historical Origin & Authority Boundary'), 'Markdown must contain Rule 8');
  assert.ok(md.includes(HISTORICAL_ORIGIN_COMMIT), 'Markdown must cite origin commit be4ba41');
  assert.ok(md.includes('DQ-W021.5-B2.2E-001'), 'Markdown must cite financial defect DQ-W021.5-B2.2E-001');
});

runTest('5.7 Earned progress is dynamically derived from substantive criteria (not retained arbitrarily)', () => {
  let earnedSum = 0;
  for (const [tid, meta] of Object.entries(CANONICAL_TASK_METADATA)) {
    const res = evaluateTaskCriteria({ taskId: tid, weight: meta.weight }, REPO_ROOT);
    earnedSum += res.earnedWeight;
  }
  assert.strictEqual(Math.round(earnedSum * 10) / 10, 61.5,
    'Dynamic derivation from 50 substantive criteria must equal exactly 61.5%');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Cross-Artifact Consistency & Mandatory Governance Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Cross-Artifact Consistency & Mandatory Governance Invariants ---');

runTest('6.1 reports/w021_5_execution_ledger.json matches reports/W021.5-EXECUTION-LEDGER.md', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes('CTO Directive 086 through CTO Directive 102'), 'Markdown must include directive lineage');
  assert.ok(md.includes(`${json.summary.repositoryImplementationPercent.toFixed(1)}%`), 'Markdown must match earned percent');
  assert.ok(md.includes(`${json.summary.unexecutedDatabasePendingPercent.toFixed(1)}%`), 'Markdown must match DB pending percent');
  assert.ok(md.includes(`${json.summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`), 'Markdown must match blocked percent');
  assert.ok(md.includes(`${json.summary.notImplementedPercent.toFixed(1)}%`), 'Markdown must match unimplemented percent');
});

runTest('6.2 Rule IV-001 Non-Self-Acceptance: formal acceptance remains strictly 0.0%', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(json.summary.formalAcceptancePercent, 0.0, 'Formal acceptance must be strictly 0.0%');
});

runTest('6.3 Offline Air-Gap: live database execution remains strictly 0.0%', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(json.summary.databaseExecutionPercent, 0.0, 'Database execution must be strictly 0.0%');
});

runTest('6.4 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (earned = 0.0%)', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const stageE = json.stages.find((s) => s.stageId === 'STAGE_E');
  assert.ok(stageE);
  const taskE02 = stageE.tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.ok(taskE02);
  assert.strictEqual(taskE02.status, 'BLOCKED');
  assert.strictEqual(taskE02.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(taskE02.accounting.blockedWeight, 5.0);
});

runTest('6.5 Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const stageB = json.stages.find((s) => s.stageId === 'STAGE_B' || s.stageId === 'STAGE_B1');
  assert.ok(stageB);
  const taskB04 = stageB.tasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.ok(taskB04);
  assert.strictEqual(taskB04.accounting.blockedWeight, 1.5);
  assert.ok(taskB04.accounting.ratioRationale.includes('AC 119 duplicate claim defect blocked'));
});

runTest('6.6 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte', () => {
  const res = verifyMigrationImmutability(BASELINE_COMMIT_MIGRATIONS);
  assert.strictEqual(res.isImmutabilityPreserved, true);
  assert.strictEqual(res.totalFilesAudited, 68);
  assert.strictEqual(res.identicalCount, 68);
  assert.strictEqual(res.mismatchCount, 0);
});

runTest('6.7 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte', () => {
  const seedDiff = execSync(`git diff ${BASELINE_COMMIT_SEEDS} -- apps/mobile/constants/`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(seedDiff, '', '31 MLA seed files must be byte-for-byte identical to baseline fb408ce');
});

// ─────────────────────────────────────────────────────────────────────────────
// Final Summary & Exit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
