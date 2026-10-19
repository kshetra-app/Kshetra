#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-107.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 107
 * Safe-by-Default Trust Verification, Evidence Parser Corrections, and Canonical Inventory Reconciliation
 *
 * Test battery executing offline verification across 6 mandatory workstreams:
 * - Workstream A: Make Trust Override Protection Safe by Default
 * - Workstream B: Repair Manifest Validation Adversarial Coverage (8 Genuine Negative Tests)
 * - Workstream C: Correct Skipped-Test Semantics & Runner Output Parsing
 * - Workstream D: Reconcile the Canonical Task Inventory (Programmatic Equality Across 7 Sources)
 * - Workstream E: Requalify Criterion Evidence & Completion Without Self-Certification
 * - Workstream F: Mandatory Governance Invariants, Baseline Immutability & Clean Verification
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 107 VERIFICATION SUITE');
console.log('Safe-by-Default Trust Verification, Evidence Parser Corrections, and Canonical Inventory Reconciliation');
console.log('Suite: tests/political-intelligence-directive-107.test.mjs');
console.log('Command: node tests/political-intelligence-directive-107.test.mjs');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// WORKSTREAM A: Make Trust Override Protection Safe by Default
// -----------------------------------------------------------------------------
console.log('--- 1. Workstream A: Make Trust Override Protection Safe by Default ---');

runTest('1.1 B1: verifyHistoricalArtifactIntegrity rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => {
        verifyHistoricalArtifactIntegrity({ [overrideKey]: 'attacker_controlled_value' });
      },
      (err) => {
        return (
          err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') &&
          err.message.includes(overrideKey)
        );
      },
      `verifyHistoricalArtifactIntegrity must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('1.2 B1: verifyAuthorityBoundary rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => {
        verifyAuthorityBoundary({ [overrideKey]: 'attacker_controlled_value' });
      },
      (err) => {
        return (
          err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') &&
          err.message.includes(overrideKey)
        );
      },
      `verifyAuthorityBoundary must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('1.3 B1: verifyGoverningSpecificationProvenance rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => {
        verifyGoverningSpecificationProvenance({ [overrideKey]: 'attacker_controlled_value' });
      },
      (err) => {
        return (
          err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') &&
          err.message.includes(overrideKey)
        );
      },
      `verifyGoverningSpecificationProvenance must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('1.4 B1: reconcileExecutionLedger rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    assert.throws(
      () => {
        reconcileExecutionLedger({ [overrideKey]: 'attacker_controlled_value' });
      },
      (err) => {
        return (
          err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') &&
          err.message.includes(overrideKey)
        );
      },
      `reconcileExecutionLedger must reject ${overrideKey} unconditionally`
    );
  }
});

runTest('1.5 B2: Caller-supplied Booleans and mode flags CANNOT bypass trust rejection across all 4 public verifiers', () => {
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

runTest('1.6 B3: Production verifier exports neither token nor __testOnly_* functions; Symbol.for cannot bypass overrides', () => {
  // 1. Assert production verifier does NOT export TEST_HARNESS_PROTECTION_TOKEN
  assert.strictEqual(
    productionVerifierModule.TEST_HARNESS_PROTECTION_TOKEN,
    undefined,
    'TEST_HARNESS_PROTECTION_TOKEN must NOT be exported from production verifier'
  );

  // 2. Assert production verifier does NOT export __testOnly_* interfaces
  assert.strictEqual(productionVerifierModule.__testOnly_verifyHistoricalArtifactIntegrity, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyAuthorityBoundary, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyGoverningSpecificationProvenance, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_reconcileExecutionLedger, undefined);

  // 3. Assert that recreating the former Symbol token cannot bypass any public verifier entry point
  const forgedToken = Symbol.for('KSHETRA_TEST_ONLY_HARNESS_PROTECTION_TOKEN');
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  for (const { name, fn } of verifiers) {
    assert.throws(
      () => fn({ protectionToken: forgedToken, expectedHashOverride: 'attacker_hash' }),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
      `${name} must reject forged Symbol.for token bypass attempt`
    );
  }
});

runTest('1.7 B4: Shared verification implementation exercised via isolated test adapter seam', () => {
  // Test adapter functions exist in isolated tests/helpers/
  assert.strictEqual(typeof testVerifyHistoricalArtifactIntegrity, 'function');
  assert.strictEqual(typeof testVerifyAuthorityBoundary, 'function');
  assert.strictEqual(typeof testVerifyGoverningSpecificationProvenance, 'function');
  assert.strictEqual(typeof testReconcileExecutionLedger, 'function');

  // Verify that test adapter exercises authentic verification logic
  const resHist = testVerifyHistoricalArtifactIntegrity({});
  assert.strictEqual(resHist.verified, true);

  const resAuth = testVerifyAuthorityBoundary({});
  assert.strictEqual(resAuth.verified, true);

  const resGov = testVerifyGoverningSpecificationProvenance({});
  assert.strictEqual(resGov.verified, true);

  // Verify that test adapter shares fail-closed logic when tampered
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
});

runTest('1.8 FORBIDDEN_TRUST_OVERRIDES contains comprehensive list of 10 override parameter names', () => {
  assert.ok(Array.isArray(FORBIDDEN_TRUST_OVERRIDES));
  assert.strictEqual(FORBIDDEN_TRUST_OVERRIDES.length, 10);
  const expected = [
    'expectedHashOverride',
    'rawBytesOverride',
    'referenceCommitOverride',
    'originCommitOverride',
    'historicalOriginCommitOverride',
    'expectedDocHashes',
    'taskSectionOverrides',
    'matrixOverride',
    'masterSpecOverride',
    'ledgerOverride',
  ];
  for (const k of expected) {
    assert.ok(FORBIDDEN_TRUST_OVERRIDES.includes(k), `FORBIDDEN_TRUST_OVERRIDES must include ${k}`);
  }
});

// -----------------------------------------------------------------------------
// WORKSTREAM B: Repair Manifest Validation Adversarial Coverage (8 Genuine Negative Tests)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Workstream B: Manifest Validation Adversarial Negative Test Battery ---');

/**
 * Helper to construct an isolated fixture for testing validateManifestIntegrity
 */
function createIsolatedManifestFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-manifest-test-'));
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
    verifierRole: 'CTO Directive 107 Test Execution Verifier',
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
        directiveRef: '107',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        executedInCurrentDelivery: true,
        evidenceType: 'DIRECT_EXECUTION_CAPTURE',
        executionEpoch: 'DIRECTIVE_107',
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
      directiveCycle: 'CTO_DIRECTIVE_107',
    },
  };

  return { tmpDir, manifest, logRelPath, logAbsPath, logContent, logSha256 };
}

runTest('2.1 Adversarial Case 1: Changed test result with unchanged log is rejected (testsPassed mismatch)', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].testsPassed = 10;
    fixture.manifest.summary.totalTestsPassed = 10;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return err.message.includes('re-parsed passed count (2) does not match manifest testsPassed (10)');
      },
      'validateManifestIntegrity must reject changed test result with unchanged log'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.2 Adversarial Case 2: Changed log with recomputed manifest digest is rejected (failure in log)', () => {
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
      (err) => {
        return (
          err.message.includes('declared PASS but log contains 1 test failure(s)') ||
          err.message.includes('re-parsed log output failed')
        );
      },
      'validateManifestIntegrity must reject log with failures even if digest is recomputed'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.3 Adversarial Case 3: Symlink resolving outside repository root is rejected (symlink escape attack)', () => {
  const fixture = createIsolatedManifestFixture();
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-external-log-dir-'));
  try {
    // 1. Move the valid authentic log file to the external directory
    const extLogPath = path.join(extDir, 'sample-adversarial.log');
    fs.writeFileSync(extLogPath, fixture.logContent, 'utf8');

    // 2. Remove the original inside log directory and replace it with a symlink/junction pointing outside
    const originalLogDir = path.dirname(fixture.logAbsPath);
    fs.rmSync(originalLogDir, { recursive: true, force: true });
    fs.symlinkSync(extDir, originalLogDir, 'junction');

    // 3. Confirm target exists and log matches perfectly on disk
    assert.strictEqual(fs.existsSync(fixture.logAbsPath), true, 'Log file must exist via symlink');

    // 4. validateManifestIntegrity must detect that canonical path escapes repository root
    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return (
          err.message.includes('resolves through symlink outside repository root') ||
          err.message.includes('Canonical target')
        );
      },
      'validateManifestIntegrity must reject symlink resolving outside repo root'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
    fs.rmSync(extDir, { recursive: true, force: true });
  }
});

runTest('2.3b Adversarial Case 3b: Lexical path traversal escaping repository root is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].outputLogPath = '../../../../etc/passwd';

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return err.message.includes('traverses outside repository root');
      },
      'validateManifestIntegrity must reject log path escaping repo root'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.4 Adversarial Case 4: Duplicate suite entries are rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const duplicateEntry = { ...fixture.manifest.testSuites[0] };
    fixture.manifest.testSuites.push(duplicateEntry);
    fixture.manifest.summary.totalSuites = 2;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return err.message.includes('Duplicate suite entry detected');
      },
      'validateManifestIntegrity must reject duplicate suite entries'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.5 Adversarial Case 5: Inconsistent exit codes and status fields are rejected (exitCode 1 with status PASS)', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].exitCode = 1;
    fixture.manifest.testSuites[0].status = 'PASS';

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return err.message.includes('has exitCode 1 but declares status PASS');
      },
      'validateManifestIntegrity must reject exitCode !== 0 with status PASS'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.6 Adversarial Case 6: Incorrect total tests count mismatch is rejected', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    fixture.manifest.testSuites[0].totalTests = 50;

    assert.throws(
      () => validateManifestIntegrity(fixture.manifest, fixture.tmpDir),
      (err) => {
        return err.message.includes('re-parsed totalTests (2) does not match manifest totalTests (50)');
      },
      'validateManifestIntegrity must reject incorrect totalTests'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

runTest('2.7 Adversarial Case 7: Contradictory skipped-state is rejected (claims zeroSkippedEvidenced on unevidenced log)', () => {
  const fixture = createIsolatedManifestFixture();
  try {
    const logWithoutSkipped = fixture.logContent.replace(
      'TEST SUMMARY: 2 PASSED, 0 FAILED, 0 SKIPPED',
      'TEST SUMMARY: 2 PASSED, 0 FAILED'
    );
    fs.writeFileSync(fixture.logAbsPath, logWithoutSkipped, 'utf8');
    const newDigest = crypto.createHash('sha256').update(logWithoutSkipped, 'utf8').digest('hex');
    fixture.manifest.testSuites[0].outputLogSha256 = newDigest;

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

runTest('2.8 Adversarial Case 8: Suite identity mismatch in log header is rejected', () => {
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
      (err) => {
        return err.message.includes('suite identity mismatch in log header');
      },
      'validateManifestIntegrity must reject log header suite mismatch'
    );
  } finally {
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// WORKSTREAM C: Correct Skipped-Test Semantics & Runner Output Parsing
// -----------------------------------------------------------------------------
console.log('\n--- 3. Workstream C: Skipped-Test Semantics & Output Parsing ---');

runTest('3.1 SKIPPED_COUNT_NOT_REPORTED: Runner output omitting skipped count sets zeroSkippedEvidenced: false', () => {
  const suiteDef = { suite: 'tests/dummy.test.mjs', command: 'node tests/dummy.test.mjs' };
  const rawOutput = [
    '================================================================',
    'Suite: tests/dummy.test.mjs',
    'Command: node tests/dummy.test.mjs',
    '================================================================',
    '  [PASS] Dummy test 1',
    'TEST SUMMARY: 10 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, true);
  assert.strictEqual(res.passed, 10);
  assert.strictEqual(res.failed, 0);
  assert.strictEqual(res.skipped, 0);
  assert.strictEqual(res.skippedState, 'SKIPPED_COUNT_NOT_REPORTED');
  assert.strictEqual(res.zeroSkippedEvidenced, false);
});

runTest('3.2 EXPLICIT_ZERO_SKIPPED: Custom runner reporting "0 SKIPPED" sets zeroSkippedEvidenced: true', () => {
  const suiteDef = { suite: 'tests/dummy.test.mjs', command: 'node tests/dummy.test.mjs' };
  const rawOutput = [
    '================================================================',
    'Suite: tests/dummy.test.mjs',
    'Command: node tests/dummy.test.mjs',
    '================================================================',
    '  [PASS] Dummy test 1',
    'TEST SUMMARY: 10 PASSED, 0 FAILED, 0 SKIPPED',
    '================================================================',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, true);
  assert.strictEqual(res.passed, 10);
  assert.strictEqual(res.failed, 0);
  assert.strictEqual(res.skipped, 0);
  assert.strictEqual(res.skippedState, 'EXPLICIT_ZERO_SKIPPED');
  assert.strictEqual(res.zeroSkippedEvidenced, true);
});

runTest('3.3 SKIPPED_COUNT_REPORTED_NONZERO: Custom runner reporting ">0 SKIPPED" records non-zero skipped', () => {
  const suiteDef = { suite: 'tests/dummy.test.mjs', command: 'node tests/dummy.test.mjs' };
  const rawOutput = [
    '================================================================',
    'Suite: tests/dummy.test.mjs',
    'Command: node tests/dummy.test.mjs',
    '================================================================',
    '  [PASS] Dummy test 1',
    'TEST SUMMARY: 10 PASSED, 0 FAILED, 4 SKIPPED',
    '================================================================',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, true);
  assert.strictEqual(res.passed, 10);
  assert.strictEqual(res.failed, 0);
  assert.strictEqual(res.skipped, 4);
  assert.strictEqual(res.skippedState, 'SKIPPED_COUNT_REPORTED_NONZERO');
  assert.strictEqual(res.zeroSkippedEvidenced, false);
});

runTest('3.4 Jest Runner Contract: Total equals passed + failed independently evidences zero skipped', () => {
  const suiteDef = {
    suite: 'apps/api/src/__tests__/sample.test.ts',
    command: 'npm test -- apps/api/src/__tests__/sample.test.ts',
  };
  const rawOutput = [
    'PASS apps/api/src/__tests__/sample.test.ts',
    'Test Suites: 1 passed, 1 total',
    'Tests:       15 passed, 15 total',
    'Snapshots:   0 total',
    'Time:        1.234 s',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, true);
  assert.strictEqual(res.passed, 15);
  assert.strictEqual(res.failed, 0);
  assert.strictEqual(res.skipped, 0);
  assert.strictEqual(res.skippedState, 'EXPLICIT_ZERO_SKIPPED');
  assert.strictEqual(res.zeroSkippedEvidenced, true);
});

runTest('3.5 Jest Runner with explicit skipped: Records non-zero skipped correctly', () => {
  const suiteDef = {
    suite: 'apps/api/src/__tests__/sample.test.ts',
    command: 'npm test -- apps/api/src/__tests__/sample.test.ts',
  };
  const rawOutput = [
    'PASS apps/api/src/__tests__/sample.test.ts',
    'Test Suites: 1 passed, 1 total',
    'Tests:       2 skipped, 13 passed, 15 total',
    'Snapshots:   0 total',
    'Time:        1.234 s',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, true);
  assert.strictEqual(res.passed, 13);
  assert.strictEqual(res.failed, 0);
  assert.strictEqual(res.skipped, 2);
  assert.strictEqual(res.skippedState, 'SKIPPED_COUNT_REPORTED_NONZERO');
  assert.strictEqual(res.zeroSkippedEvidenced, false);
});

runTest('3.6 Rejects internally inconsistent totals (INTERNALLY_INCONSISTENT_TOTALS)', () => {
  const suiteDef = { suite: 'tests/dummy.test.mjs', command: 'node tests/dummy.test.mjs' };
  const rawOutput = [
    '================================================================',
    'Suite: tests/dummy.test.mjs',
    'Command: node tests/dummy.test.mjs',
    '================================================================',
    'TEST SUMMARY: 10 PASSED, 0 FAILED, 25 TOTAL',
    '================================================================',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, false);
  assert.strictEqual(res.failureReason, 'INTERNALLY_INCONSISTENT_TOTALS');
});

runTest('3.7 Rejects multiple conflicting test summaries (CONFLICTING_TEST_SUMMARIES)', () => {
  const suiteDef = { suite: 'tests/dummy.test.mjs', command: 'node tests/dummy.test.mjs' };
  const rawOutput = [
    '================================================================',
    'Suite: tests/dummy.test.mjs',
    'Command: node tests/dummy.test.mjs',
    '================================================================',
    'TEST SUMMARY: 10 PASSED, 0 FAILED, 0 SKIPPED',
    'some intermediate output',
    'TEST SUMMARY: 8 PASSED, 2 FAILED, 0 SKIPPED',
    '================================================================',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, false);
  assert.strictEqual(res.failureReason, 'CONFLICTING_TEST_SUMMARIES');
});

runTest('3.8 Rejects fake summary text without authentic runner suite identity evidence', () => {
  const suiteDef = { suite: 'tests/authentic.test.mjs', command: 'node tests/authentic.test.mjs' };
  const rawOutput = [
    'Some random text mentioning tests/authentic.test.mjs inside description',
    'TEST SUMMARY: 10 PASSED, 0 FAILED',
  ].join('\n');

  const res = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(res.isParsed, false);
  assert.ok(
    res.failureReason === 'SUITE_IDENTITY_MISSING' ||
    res.failureReason === 'RUNNER_OUTPUT_MISSING'
  );
});

// -----------------------------------------------------------------------------
// WORKSTREAM D: Reconcile the Canonical Task Inventory
// -----------------------------------------------------------------------------
console.log('\n--- 4. Workstream D: Reconcile the Canonical Task Inventory ---');

runTest('4.1 Programmatic equality across 7 sources (exactly 27 canonical tasks, 100.000% weight sum)', () => {
  const masterSpec = JSON.parse(fs.readFileSync(MASTER_SPECIFICATION_PATH, 'utf8'));
  const matrix = JSON.parse(fs.readFileSync(GOVERNING_TRACEABILITY_MATRIX_PATH, 'utf8'));
  const originLedger = JSON.parse(fs.readFileSync(HISTORICAL_ORIGIN_LEDGER_PATH, 'utf8'));
  const currentLedger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const discRegister = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_directive_106_discrepancy_register.json'), 'utf8'));

  // 1. Exact count of tasks is 27 across all machine-readable governance sources
  const masterTaskIds = Object.keys(masterSpec.tasks).sort();
  assert.strictEqual(masterTaskIds.length, 27, 'masterSpec must contain exactly 27 tasks');
  assert.strictEqual(matrix.tasks.length, 27, 'traceability matrix must contain exactly 27 tasks');
  assert.strictEqual(Object.keys(CANONICAL_TASK_METADATA).length, 27, 'CANONICAL_TASK_METADATA must contain exactly 27 tasks');
  assert.strictEqual(Object.keys(TASK_SPECIFICATIONS).length, 27, 'TASK_SPECIFICATIONS must contain exactly 27 tasks');

  const originStages = originLedger.historicalLedger ? originLedger.historicalLedger.stages : originLedger.stages;
  let originLedgerTaskCount = 0;
  for (const s of originStages) originLedgerTaskCount += s.tasks.length;
  assert.strictEqual(originLedgerTaskCount, 27, 'historical origin ledger must contain exactly 27 tasks');

  let currentLedgerTaskCount = 0;
  for (const s of currentLedger.stages) currentLedgerTaskCount += s.tasks.length;
  assert.strictEqual(currentLedgerTaskCount, 27, 'current execution ledger must contain exactly 27 tasks');

  // 2. Programmatic set equality of task IDs
  const canonicalTaskIds = Object.keys(CANONICAL_TASK_METADATA).sort();
  const matrixTaskIds = matrix.tasks.map((t) => t.taskId).sort();
  const specTaskIds = Object.keys(TASK_SPECIFICATIONS).sort();

  assert.deepStrictEqual(masterTaskIds, canonicalTaskIds, 'Master spec task IDs must match canonical metadata');
  assert.deepStrictEqual(matrixTaskIds, canonicalTaskIds, 'Matrix task IDs must match canonical metadata');
  assert.deepStrictEqual(specTaskIds, canonicalTaskIds, 'Task specifications must match canonical metadata');

  // 3. Weight sum is exactly 100.000%
  let sumWeight = 0;
  for (const id of canonicalTaskIds) {
    const metaWeight = CANONICAL_TASK_METADATA[id].weight;
    const masterTask = masterSpec.tasks[id];
    const matrixTask = matrix.tasks.find((t) => t.taskId === id);

    const masterWeight = masterTask.approvedWeight !== undefined ? masterTask.approvedWeight : masterTask.weight;
    const matrixWeight = matrixTask.approvedWeight !== undefined ? matrixTask.approvedWeight : matrixTask.weight;
    assert.strictEqual(masterWeight, metaWeight, `Task ${id} weight mismatch in master spec`);
    assert.strictEqual(matrixWeight, metaWeight, `Task ${id} weight mismatch in matrix`);
    sumWeight += metaWeight;
  }
  assert.strictEqual(Math.round(sumWeight * 1000) / 1000, 100.0, 'Total canonical task weight must be exactly 100.000%');

  // 4. Discrepancy DISC-027 explicitly records resolution of Directive 106 report mismatch
  const disc027 = discRegister.discrepancies.find((d) => d.discrepancyId === 'DISC-027');
  assert.ok(disc027, 'DISC-027 must be recorded in discrepancy register');
  assert.strictEqual(disc027.resolutionStatus, 'RESOLVED_INVENTORY_RECONCILED');
});

runTest('4.2 Rejection and isolation of 5 phantom tasks (W021.5-B2-01, B2-02, I-03, EXT-01, EXT-02)', () => {
  const phantomIds = ['W021.5-B2-01', 'W021.5-B2-02', 'W021.5-I-03', 'W021.5-EXT-01', 'W021.5-EXT-02'];
  const masterSpec = JSON.parse(fs.readFileSync(MASTER_SPECIFICATION_PATH, 'utf8'));

  for (const pId of phantomIds) {
    assert.strictEqual(CANONICAL_TASK_METADATA[pId], undefined, `Phantom task ${pId} must NOT exist in CANONICAL_TASK_METADATA`);
    assert.strictEqual(TASK_SPECIFICATIONS[pId], undefined, `Phantom task ${pId} must NOT exist in TASK_SPECIFICATIONS`);
    assert.strictEqual(masterSpec.tasks[pId], undefined, `Phantom task ${pId} must NOT exist in master specification`);
  }
});

runTest('4.3 Criteria membership equality: All 50 criteria map strictly to canonical 27 tasks', () => {
  let criteriaCount = 0;
  for (const [taskId, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    assert.ok(spec.criteria && spec.criteria.length > 0, `Task ${taskId} must have criteria`);
    criteriaCount += spec.criteria.length;
    for (const crit of spec.criteria) {
      assert.ok(crit.criterionId.startsWith('CRIT-'), `Criterion ID ${crit.criterionId} must be formatted`);
      assert.ok(crit.evidenceClass, `Criterion ${crit.criterionId} must declare evidenceClass`);
    }
  }
  assert.strictEqual(criteriaCount, 50, 'Exactly 50 criteria must exist across the 27 canonical tasks');
});

runTest('4.4 Governing specifications provenance and authority boundary remain explicitly NOT_INDEPENDENTLY_ESTABLISHED', () => {
  const authRes = verifyAuthorityBoundary();
  assert.strictEqual(authRes.verified, true);
  assert.strictEqual(AUTHORITY_CLASSIFICATION, 'NOT_INDEPENDENTLY_ESTABLISHED');
  assert.strictEqual(AUTHORITY_BOUNDARY_ROLE, 'HISTORICAL_COMPARISON_BASELINE_NOT_EXTERNAL_APPROVAL_AUTHORITY');

  const masterSpec = JSON.parse(fs.readFileSync(MASTER_SPECIFICATION_PATH, 'utf8'));
  assert.strictEqual(masterSpec.authorityClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');

  const matrix = JSON.parse(fs.readFileSync(GOVERNING_TRACEABILITY_MATRIX_PATH, 'utf8'));
  assert.strictEqual(matrix.authorityClassification, 'NOT_INDEPENDENTLY_ESTABLISHED');

  const provRes = verifyGoverningSpecificationProvenance();
  assert.strictEqual(provRes.verified, true);
});

// -----------------------------------------------------------------------------
// WORKSTREAM E: Requalify Criterion Evidence
// -----------------------------------------------------------------------------
console.log('\n--- 5. Workstream E: Requalify Criterion Evidence & Completion ---');

runTest('5.1 50 criteria classified across 5 standard evidence classes', () => {
  const classCounts = {
    STATIC_SEMANTIC_VERIFICATION: 0,
    ARTIFACT_PRESENCE_ONLY: 0,
    EXECUTABLE_BEHAVIOR_VERIFICATION: 0,
    DATABASE_STAGING_VERIFICATION: 0,
    EXTERNAL_AUTHORITY_VERIFICATION: 0,
  };

  for (const spec of Object.values(TASK_SPECIFICATIONS)) {
    for (const c of spec.criteria) {
      assert.ok(classCounts[c.evidenceClass] !== undefined, `Unknown evidenceClass: ${c.evidenceClass}`);
      classCounts[c.evidenceClass]++;
    }
  }

  assert.strictEqual(classCounts.STATIC_SEMANTIC_VERIFICATION, 32);
  assert.strictEqual(classCounts.ARTIFACT_PRESENCE_ONLY, 5);
  assert.strictEqual(classCounts.EXECUTABLE_BEHAVIOR_VERIFICATION, 3);
  assert.strictEqual(classCounts.DATABASE_STAGING_VERIFICATION, 5);
  assert.strictEqual(classCounts.EXTERNAL_AUTHORITY_VERIFICATION, 5);
  assert.strictEqual(
    Object.values(classCounts).reduce((a, b) => a + b, 0),
    50
  );
});

runTest('5.2 Recomputed completion: strictly 61.500% earned, 38.500% blocked, summing to 100.000%', () => {
  const currentLedger = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  const summary = computeLedgerSummary(currentLedger);

  assert.strictEqual(summary.repoVerifiedEarnedPercent, 61.5, 'Repo verified percent must be strictly 61.500%');
  assert.strictEqual(summary.blockedPercent, 22.5, 'Blocked on external CTC percent must be 22.500%');
  assert.strictEqual(summary.databasePendingPercent, 10.5, 'Database pending percent must be 10.500%');
  assert.strictEqual(summary.notImplementedPercent, 5.5, 'Not implemented percent must be 5.500%');

  const total = summary.repoVerifiedEarnedPercent + summary.blockedPercent + summary.databasePendingPercent + summary.notImplementedPercent;
  assert.strictEqual(Math.round(total * 10) / 10, 100.0, 'Total progress components must sum to 100.000%');
});

runTest('5.3 Preservation of Telangana AC 119 duplicate boundary feature (strictly blocked at 1.5%)', () => {
  const geojsonPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geojsonPath), 'GeoJSON must exist');
  const raw = fs.readFileSync(geojsonPath, 'utf8');
  const data = JSON.parse(raw);

  assert.strictEqual(data.type, 'FeatureCollection');
  assert.strictEqual(data.features.length, 120, 'Telangana GeoJSON must contain exactly 120 features for 119 statutory seats');

  const b04Spec = TASK_SPECIFICATIONS['W021.5-B1-04'];
  assert.ok(b04Spec, 'Task W021.5-B1-04 must exist');
  const verifyRes = b04Spec.criteria[0].verify(REPO_ROOT);
  assert.strictEqual(verifyRes.passed, true);
  assert.ok(verifyRes.message.includes('AC 119 duplicate claim defect detected'));
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

runTest('6.7 Repository manifest integrity validation', () => {
  assert.ok(fs.existsSync(MANIFEST_PATH), 'Manifest file must exist');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.summary && (manifest.summary.directiveCycle === 'CTO_DIRECTIVE_107' || manifest.summary.directiveCycle === 'CTO_DIRECTIVE_108')) {
    const res = validateManifestIntegrity(manifest, REPO_ROOT);
    assert.strictEqual(res, true);
    assert.strictEqual(manifest.executionQualification, 'REPOSITORY_RECORDED_EXECUTION');
  } else {
    // Under prior cycle (Directive 106), confirm that validateManifestIntegrity
    // catches the unevidenced zero-skipped claim from the legacy manifest
    assert.throws(
      () => validateManifestIntegrity(manifest, REPO_ROOT),
      (err) => err.message.includes('claims zeroSkippedEvidenced but log parser did not evidence explicit zero skipped')
    );
  }
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED, 0 SKIPPED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
