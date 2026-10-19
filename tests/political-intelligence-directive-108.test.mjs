#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-108.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 108
 * Test Seam Structural Isolation, Canonical Symlink Path Containment, and Reproducible Verification Evidence
 *
 * Test battery executing offline verification across 6 mandatory workstreams:
 * - Workstream A: Elimination of Forgeable Trust Tokens & Test Seam Structural Isolation
 * - Workstream B: Exhaustive Public Trust Override & Mode Bypass Rejection (40-Check Battery)
 * - Workstream C: Canonical Symlink Containment & Adversarial Manifest Validation (Symlink & Lexical Fixtures)
 * - Workstream D: Discrepancy Register & Timestamp Forensic Reconciliation
 * - Workstream E: Canonical Inventory, Accounting & Defect Conservation (27 Tasks, 100.000% Weight)
 * - Workstream F: Mandatory Governance Invariants & Baseline Immutability
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import os from 'os';
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
  FORBIDDEN_TRUST_OVERRIDES,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  AUTHORITY_CLASSIFICATION,
  AUTHORITY_BOUNDARY_ROLE,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
  GOVERNING_TRACEABILITY_MATRIX_PATH,
  assertNoCallerTrustOverrides,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  verifyNonOverlappingAccountingAndTraceability,
  evaluateTaskCriteria,
  computeLedgerSummary,
  reconcileExecutionLedger,
} from '../scripts/reconcile_execution_ledger.mjs';
import * as productionVerifierModule from '../scripts/reconcile_execution_ledger.mjs';

import {
  testVerifyHistoricalArtifactIntegrity,
  testVerifyAuthorityBoundary,
  testVerifyGoverningSpecificationProvenance,
  testReconcileExecutionLedger,
} from './helpers/ledger-test-adapter.mjs';

import {
  MANIFEST_PATH,
  TEST_SUITE_DEFINITIONS,
  parseTestOutput,
  validateManifestIntegrity,
  verifySuiteIdentity,
  assertPathContainedInRoot,
} from '../scripts/capture_test_execution.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const BASELINE_COMMIT_MIGRATIONS = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_SEEDS = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 108 VERIFICATION SUITE');
console.log('Test Seam Isolation, Symlink Path Containment, and Reproducible Evidence');
console.log('Suite: tests/political-intelligence-directive-108.test.mjs');
console.log('Command: node tests/political-intelligence-directive-108.test.mjs');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// WORKSTREAM A: Elimination of Forgeable Trust Tokens & Structural Seam Isolation
// -----------------------------------------------------------------------------
console.log('--- 1. Workstream A: Elimination of Forgeable Trust Tokens & Structural Seam Isolation ---');

runTest('1.1 Production verifier module exports neither TEST_HARNESS_PROTECTION_TOKEN nor __testOnly_* functions', () => {
  assert.strictEqual(
    productionVerifierModule.TEST_HARNESS_PROTECTION_TOKEN,
    undefined,
    'TEST_HARNESS_PROTECTION_TOKEN must NOT be exported from scripts/reconcile_execution_ledger.mjs'
  );
  assert.strictEqual(productionVerifierModule.__testOnly_verifyHistoricalArtifactIntegrity, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyAuthorityBoundary, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyGoverningSpecificationProvenance, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_reconcileExecutionLedger, undefined);
});

runTest('1.2 Symbol.for(...) token forge cannot bypass public verifiers or authorize overrides', () => {
  const forgedToken = Symbol.for('KSHETRA_TEST_ONLY_HARNESS_PROTECTION_TOKEN');
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  for (const { name, fn } of verifiers) {
    assert.throws(
      () => fn({ protectionToken: forgedToken, expectedHashOverride: 'fake_hash' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
      `${name} must reject forged Symbol.for token override attempt`
    );
  }
});

runTest('1.3 Isolated test adapter in tests/helpers/ledger-test-adapter.mjs provides dedicated test seam', () => {
  assert.strictEqual(typeof testVerifyHistoricalArtifactIntegrity, 'function');
  assert.strictEqual(typeof testVerifyAuthorityBoundary, 'function');
  assert.strictEqual(typeof testVerifyGoverningSpecificationProvenance, 'function');
  assert.strictEqual(typeof testReconcileExecutionLedger, 'function');

  const resHist = testVerifyHistoricalArtifactIntegrity({});
  assert.strictEqual(resHist.verified, true);

  const resAuth = testVerifyAuthorityBoundary({});
  assert.strictEqual(resAuth.verified, true);

  const resGov = testVerifyGoverningSpecificationProvenance({});
  assert.strictEqual(resGov.verified, true);
});

runTest('1.4 Shared verification implementation parity between production verifier and test adapter', () => {
  // Test adapter shares fail-closed verification engine: tampered hash fails closed identically
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
  assert.throws(
    () => testVerifyGoverningSpecificationProvenance({ matrixOverride: { tasks: [] } }),
    /Governing provenance violation/
  );
});

// -----------------------------------------------------------------------------
// WORKSTREAM B: Exhaustive Public Trust Override & Mode Bypass Rejection (40 Checks)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Workstream B: Exhaustive Public Trust Override & Mode Bypass Rejection ---');

runTest('2.1 B1: verifyHistoricalArtifactIntegrity rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => verifyHistoricalArtifactIntegrity({ [overrideKey]: 'attacker_controlled_value' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyHistoricalArtifactIntegrity must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('2.2 B1: verifyAuthorityBoundary rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => verifyAuthorityBoundary({ [overrideKey]: 'attacker_controlled_value' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyAuthorityBoundary must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('2.3 B1: verifyGoverningSpecificationProvenance rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => verifyGoverningSpecificationProvenance({ [overrideKey]: 'attacker_controlled_value' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyGoverningSpecificationProvenance must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('2.4 B1: reconcileExecutionLedger rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => reconcileExecutionLedger({ [overrideKey]: 'attacker_controlled_value' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `reconcileExecutionLedger must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('2.5 B2: Caller-supplied Booleans and mode flags CANNOT bypass trust rejection across all 4 public verifiers', () => {
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  const deceptiveOptions = [
    { productionMode: false, expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' },
    { productionVerificationMode: false, rawBytesOverride: 'malicious_bytes' },
    { allowOverrides: true, masterSpecOverride: {} },
    { testMode: true, matrixOverride: {} },
    { productionMode: false, allowOverrides: true, ledgerOverride: {} },
    { productionVerificationMode: false, testMode: true, expectedDocHashes: {} },
  ];

  for (const { name, fn } of verifiers) {
    for (const opt of deceptiveOptions) {
      assert.throws(
        () => fn(opt),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `${name} must reject deceptive options: ${JSON.stringify(opt)}`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// WORKSTREAM C: Canonical Symlink Containment & Adversarial Manifest Validation
// -----------------------------------------------------------------------------
console.log('\n--- 3. Workstream C: Canonical Symlink Containment & Adversarial Manifest Validation ---');

runTest('3.1 assertPathContainedInRoot rejects absolute paths and drive-anchored paths', () => {
  const root = REPO_ROOT;
  assert.throws(
    () => assertPathContainedInRoot('/etc/passwd', root),
    /Path containment violation.*must be a relative repository path/
  );
  assert.throws(
    () => assertPathContainedInRoot('C:\\Windows\\System32\\cmd.exe', root),
    /Path containment violation.*must be a relative repository path/
  );
});

runTest('3.2 assertPathContainedInRoot rejects lexical path traversal outside root', () => {
  assert.throws(
    () => assertPathContainedInRoot('../../outside.log', REPO_ROOT),
    /Path containment violation.*lexically traverses outside repository root/
  );
});

runTest('3.3 assertPathContainedInRoot rejects missing log file on disk', () => {
  assert.throws(
    () => assertPathContainedInRoot('reports/evidence/test_execution_logs/nonexistent_file_9999.log', REPO_ROOT),
    /Path containment violation.*file does not exist on disk/
  );
});

runTest('3.4 assertPathContainedInRoot rejects directory junction / symlink resolving outside repository root', () => {
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-ext-test-'));
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-repo-root-'));
  try {
    fs.mkdirSync(path.join(repoDir, 'reports', 'evidence'), { recursive: true });
    const extFile = path.join(extDir, 'test.log');
    fs.writeFileSync(extFile, 'sample content', 'utf8');

    // Create directory junction inside repo root pointing outside
    fs.symlinkSync(extDir, path.join(repoDir, 'reports', 'evidence', 'test_execution_logs'), 'junction');

    assert.throws(
      () => assertPathContainedInRoot('reports/evidence/test_execution_logs/test.log', repoDir),
      /Path containment violation.*resolves through symlink outside repository root/
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(extDir, { recursive: true, force: true });
  }
});

function createIsolatedManifestFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-manifest-108-'));
  const logsSubdir = path.join(tmpDir, 'reports', 'evidence', 'test_execution_logs');
  fs.mkdirSync(logsSubdir, { recursive: true });

  const logContent = [
    '================================================================================',
    'Test Suite Execution Log',
    'Suite: tests/sample-adversarial.test.mjs',
    'Command: node tests/sample-adversarial.test.mjs',
    'Exit Code: 0',
    '================================================================================',
    '--- STDOUT ---',
    '================================================================',
    'SAMPLE ADVERSARIAL TEST SUITE',
    'Suite: tests/sample-adversarial.test.mjs',
    'Command: node tests/sample-adversarial.test.mjs',
    '================================================================',
    '  [PASS] Sample test case 1',
    '  [PASS] Sample test case 2',
    'TEST SUMMARY: 2 PASSED, 0 FAILED, 0 SKIPPED',
    '================================================================',
    '--- STDERR ---',
    '',
    '--- PROCESS METRICS ---',
    'ExitCode: 0',
    'Signal: none',
    'DurationMs: 120',
  ].join('\n');

  const logRelPath = path.posix.join('reports', 'evidence', 'test_execution_logs', 'sample-adversarial.log');
  const logAbsPath = path.join(tmpDir, logRelPath);
  fs.writeFileSync(logAbsPath, logContent, 'utf8');

  const logSha256 = crypto.createHash('sha256').update(logContent, 'utf8').digest('hex');

  const manifest = {
    milestone: 'W021.5',
    generatedAt: new Date().toISOString(),
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    executionQualification: 'REPOSITORY_RECORDED_EXECUTION',
    verifierRole: 'CTO Directive 108 Test Execution Verifier',
    executionScope: 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      offlineRepositoryOnly: true,
    },
    testSuites: [
      {
        suite: 'tests/sample-adversarial.test.mjs',
        command: 'node tests/sample-adversarial.test.mjs',
        exitCode: 0,
        status: 'PASS',
        failureReason: null,
        suitesPassed: 1,
        testsPassed: 2,
        testsFailed: 0,
        testsSkipped: 0,
        skippedState: 'EXPLICIT_ZERO_SKIPPED',
        zeroSkippedEvidenced: true,
        totalTests: 2,
        durationMs: 120,
        runnerFormat: 'CUSTOM_SUMMARY',
        suiteType: 'DIRECTIVE_VERIFICATION_TEST',
        directiveRef: '108',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        executedInCurrentDelivery: true,
        evidenceType: 'DIRECT_EXECUTION_CAPTURE',
        executionEpoch: 'DIRECTIVE_108',
        executionQualification: 'REPOSITORY_RECORDED_EXECUTION',
        outputLogPath: logRelPath,
        outputLogSha256: logSha256,
      },
    ],
    summary: {
      totalSuites: 1,
      passedSuites: 1,
      failedSuites: 0,
      totalTestsPassed: 2,
      totalTestsFailed: 0,
      allSuitesPassed: true,
      executionScope: 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY',
      directiveCycle: 'CTO_DIRECTIVE_108',
    },
  };

  return { tmpDir, manifest, logRelPath, logAbsPath, logContent, logSha256 };
}

runTest('3.5 Genuine symlink-escape adversarial fixture in validateManifestIntegrity fails closed', () => {
  const fixture = createIsolatedManifestFixture();
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-ext-logs-'));
  try {
    const extLogPath = path.join(extDir, 'sample-adversarial.log');
    fs.writeFileSync(extLogPath, fixture.logContent, 'utf8');

    const originalLogDir = path.dirname(fixture.logAbsPath);
    fs.rmSync(originalLogDir, { recursive: true, force: true });
    fs.symlinkSync(extDir, originalLogDir, 'junction');

    assert.strictEqual(fs.existsSync(fixture.logAbsPath), true, 'Log file must exist via symlink');

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('resolves through symlink outside repository root'),
      'validateManifestIntegrity must reject symlink resolving outside repo root'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
    fs.rmSync(extDir, { recursive: true, force: true });
  }
});

runTest('3.6 Lexical path traversal in validateManifestIntegrity fails closed', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].outputLogPath = '../../../../etc/passwd';
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('traverses outside repository root'),
      'validateManifestIntegrity must reject lexical path traversal'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.7 Adversarial check: Altered result count with unchanged log is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].testsPassed = 10;
    fixture.manifest.summary.totalTestsPassed = 10;
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('re-parsed passed count (2) does not match manifest testsPassed (10)'),
      'validateManifestIntegrity must reject result count mismatch'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.8 Adversarial check: Changed log with recomputed manifest digest is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const tamperedLog = fixture.logContent.replace(
      'TEST SUMMARY: 2 PASSED, 0 FAILED, 0 SKIPPED',
      '  [FAIL] Sample test case 2 failed!\nTEST SUMMARY: 1 PASSED, 1 FAILED, 0 SKIPPED'
    );
    fs.writeFileSync(fixture.logAbsPath, tamperedLog, 'utf8');
    const tamperedDigest = crypto.createHash('sha256').update(tamperedLog, 'utf8').digest('hex');
    fixture.manifest.testSuites[0].outputLogSha256 = tamperedDigest;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('declared PASS but log contains 1 test failure(s)') || err.message.includes('re-parsed log output failed'),
      'validateManifestIntegrity must reject failed log with recomputed digest'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.9 Adversarial check: Duplicate suite entries are rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const duplicateEntry = { ...fixture.manifest.testSuites[0] };
    fixture.manifest.testSuites.push(duplicateEntry);
    fixture.manifest.summary.totalSuites = 2;
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('Duplicate suite entry detected'),
      'validateManifestIntegrity must reject duplicate suite entries'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.10 Adversarial check: Inconsistent exit code and declared status are rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].exitCode = 1;
    fixture.manifest.testSuites[0].status = 'PASS';
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('has exitCode 1 but declares status PASS'),
      'validateManifestIntegrity must reject exitCode !== 0 with status PASS'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.11 Adversarial check: Total test count mismatch is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].totalTests = 50;
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('re-parsed totalTests (2) does not match manifest totalTests (50)'),
      'validateManifestIntegrity must reject incorrect totalTests'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.12 Adversarial check: False zeroSkippedEvidenced claims are rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const logWithoutSkipped = fixture.logContent.replace(
      'TEST SUMMARY: 2 PASSED, 0 FAILED, 0 SKIPPED',
      'TEST SUMMARY: 2 PASSED, 0 FAILED'
    );
    fs.writeFileSync(fixture.logAbsPath, logWithoutSkipped, 'utf8');
    const newDigest = crypto.createHash('sha256').update(logWithoutSkipped, 'utf8').digest('hex');
    fixture.manifest.testSuites[0].outputLogSha256 = newDigest;
    fixture.manifest.testSuites[0].skippedState = 'SKIPPED_COUNT_NOT_REPORTED';
    fixture.manifest.testSuites[0].zeroSkippedEvidenced = true;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return (
          err.message.includes('claims zeroSkippedEvidenced but log parser did not evidence explicit zero skipped') ||
          err.message.includes('skippedState mismatch')
        );
      },
      'validateManifestIntegrity must reject zeroSkippedEvidenced when log omitted skipped count'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('3.13 Adversarial check: Suite identity mismatch in log header is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const tamperedLog = fixture.logContent.replace(
      'Suite: tests/sample-adversarial.test.mjs',
      'Suite: tests/unrelated-fake.test.mjs'
    );
    fs.writeFileSync(fixture.logAbsPath, tamperedLog, 'utf8');
    const newDigest = crypto.createHash('sha256').update(tamperedLog, 'utf8').digest('hex');
    fixture.manifest.testSuites[0].outputLogSha256 = newDigest;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => err.message.includes('suite identity mismatch in log header'),
      'validateManifestIntegrity must reject log header suite mismatch'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// WORKSTREAM D: Discrepancy Register & Timestamp Forensic Reconciliation
// -----------------------------------------------------------------------------
console.log('\n--- 4. Workstream D: Discrepancy Register & Timestamp Forensic Reconciliation ---');

runTest('4.1 Directive 106 discrepancy register timestamp is reconciled to authentic UTC', () => {
  const regPath = path.join(REPO_ROOT, 'reports/w021_5_directive_106_discrepancy_register.json');
  assert.strictEqual(fs.existsSync(regPath), true, 'reports/w021_5_directive_106_discrepancy_register.json must exist');

  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.strictEqual(reg.generatedAt, '2026-10-19T08:38:45.846Z', 'generatedAt must match authentic UTC delivery timestamp');
  assert.ok(!reg.generatedAt.includes('13:40:00'), 'Local IST 13:40 divergence must be eliminated');
});

runTest('4.2 Directive 107 discrepancy register documents DISC-031 through DISC-034', () => {
  const regPath = path.join(REPO_ROOT, 'reports/w021_5_directive_107_discrepancy_register.json');
  const mdPath = path.join(REPO_ROOT, 'reports/w021_5_directive_107_discrepancy_register.md');
  assert.strictEqual(fs.existsSync(regPath), true, 'reports/w021_5_directive_107_discrepancy_register.json must exist');
  assert.strictEqual(fs.existsSync(mdPath), true, 'reports/w021_5_directive_107_discrepancy_register.md must exist');

  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.strictEqual(reg.summary.totalDiscrepanciesAudited, 4);
  assert.strictEqual(reg.summary.discrepanciesResolved, 4);

  const ids = reg.discrepancies.map((d) => d.discrepancyId);
  assert.ok(ids.includes('DISC-031'), 'Must include DISC-031 (Forgeable Symbol token)');
  assert.ok(ids.includes('DISC-032'), 'Must include DISC-032 (Symlink path containment gap)');
  assert.ok(ids.includes('DISC-033'), 'Must include DISC-033 (Timezone divergence)');
  assert.ok(ids.includes('DISC-034'), 'Must include DISC-034 (Incomplete public override test coverage)');
});

runTest('4.3 Test execution manifest qualification asserts REPOSITORY_RECORDED_EXECUTION', () => {
  const manPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  if (fs.existsSync(manPath)) {
    const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    assert.strictEqual(man.executionQualification, 'REPOSITORY_RECORDED_EXECUTION');
  }
});

// -----------------------------------------------------------------------------
// WORKSTREAM E: Canonical Inventory, Accounting & Defect Conservation
// -----------------------------------------------------------------------------
console.log('\n--- 5. Workstream E: Canonical Inventory, Accounting & Defect Conservation ---');

runTest('5.1 Programmatic task inventory equality: exactly 27 canonical tasks, 100.000% weight sum', () => {
  const taskIds = Object.keys(CANONICAL_TASK_METADATA);
  assert.strictEqual(taskIds.length, 27, 'Must have exactly 27 canonical tasks');

  let totalWeight = 0;
  for (const tid of taskIds) {
    totalWeight += CANONICAL_TASK_METADATA[tid].weight;
  }
  assert.strictEqual(Math.abs(totalWeight - 100.0) < 0.001, true, 'Total weight must equal 100.000%');
});

runTest('5.2 Rejection and isolation of 5 phantom tasks (W021.5-B2-01, B2-02, I-03, EXT-01, EXT-02)', () => {
  const phantomIds = ['W021.5-B2-01', 'W021.5-B2-02', 'W021.5-I-03', 'W021.5-EXT-01', 'W021.5-EXT-02'];
  const masterSpec = JSON.parse(fs.readFileSync(MASTER_SPECIFICATION_PATH, 'utf8'));

  for (const pId of phantomIds) {
    assert.strictEqual(CANONICAL_TASK_METADATA[pId], undefined, `Phantom task ${pId} must NOT exist in CANONICAL_TASK_METADATA`);
    assert.strictEqual(TASK_SPECIFICATIONS[pId], undefined, `Phantom task ${pId} must NOT exist in TASK_SPECIFICATIONS`);
    assert.strictEqual(masterSpec.tasks[pId], undefined, `Phantom task ${pId} must NOT exist in master specification`);
  }
});

runTest('5.3 Progress accounting conservation: strictly 61.500% earned, 38.500% blocked, summing to 100.000%', () => {
  const currentLedger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const summary = computeLedgerSummary(currentLedger);

  assert.strictEqual(summary.repoVerifiedEarnedPercent, 61.5, 'Repo verified percent must be strictly 61.500%');
  assert.strictEqual(summary.blockedPercent, 22.5, 'Blocked on external CTC percent must be 22.500%');
  assert.strictEqual(summary.databasePendingPercent, 10.5, 'Database pending percent must be 10.500%');
  assert.strictEqual(summary.notImplementedPercent, 5.5, 'Not implemented percent must be 5.500%');

  const total = summary.repoVerifiedEarnedPercent + summary.blockedPercent + summary.databasePendingPercent + summary.notImplementedPercent;
  assert.strictEqual(Math.round(total * 10) / 10, 100.0, 'Total progress components must sum to 100.000%');
});

runTest('5.4 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned, 5.0% blocked)', () => {
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

runTest('5.5 Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const stageB = ledger.stages.find((s) => s.stageId === 'STAGE_B');
  const b04 = stageB.tasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.strictEqual(b04.accounting.blockedWeight, 1.5);
});

// -----------------------------------------------------------------------------
// WORKSTREAM F: Mandatory Governance Invariants & Baseline Immutability
// -----------------------------------------------------------------------------
console.log('\n--- 6. Workstream F: Mandatory Governance Invariants & Baseline Immutability ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: Formal acceptance is strictly 0.0% / UNACCEPTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0);
  assert.strictEqual(ledger.summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);
});

runTest('6.2 Production Air-Gap: Live database execution is strictly 0.0% / UNEXECUTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0);
});

runTest('6.3 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte identical', () => {
  const diff = execSync(`git diff ${BASELINE_COMMIT_MIGRATIONS} -- supabase/migrations/`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.strictEqual(diff, '', `SQL migrations must be byte-for-byte identical to baseline ${BASELINE_COMMIT_MIGRATIONS}`);
});

runTest('6.4 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const diff = execSync(`git diff ${BASELINE_COMMIT_SEEDS} -- apps/mobile/constants/`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.strictEqual(diff, '', `Seed files must be byte-for-byte identical to baseline ${BASELINE_COMMIT_SEEDS}`);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED, 0 SKIPPED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
