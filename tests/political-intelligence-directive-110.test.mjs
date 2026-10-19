#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-110.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 110
 * Remove Unprotected Payload Exports from Production Verifier & Close Direct-Invocation Bypass
 *
 * Test battery verifying:
 * 1. Workstream A: Production verifier export surface audit:
 *    - All 4 payload functions (verifyHistoricalArtifactIntegrityPayload, verifyAuthorityBoundaryPayload,
 *      verifyGoverningSpecificationProvenancePayload, reconcileExecutionLedgerCore) are strictly NOT exported.
 *    - No alternate or underscore-prefixed bypass functions or test tokens are exported.
 *    - Only the 4 guarded public verifier entry points are exposed.
 * 2. Workstream B: Complete 40-check override rejection matrix across all 4 public verifiers and 10 forbidden keys.
 *    - Mode flag bypass resistance ({ productionVerificationMode: false, testMode: true }).
 *    - Symbol forgery defense (Symbol.for cannot bypass verifier guards).
 * 3. Workstream B: Test adapter exercises shared verification logic against tampered fixtures and fails closed.
 *    - Tampered expected hash, tampered raw bytes, tampered origin commit, empty matrix.
 *    - Implementation parity between public verifiers and test adapter on standard inputs.
 *    - Proof that the direct-invocation bypass is closed.
 * 4. Workstream B: Clean-process module loading via spawnSync:
 *    - Clean-process import of production verifier, test adapter, and internal engine succeeds with exit code 0.
 *    - Module dependency graph is strictly acyclic (DAG Layer 0 engine, Layer 1 verifier and adapter).
 *    - Clean-process test runner fails closed on non-zero child exit or missing marker.
 * 5. Path containment & Codebase reachability:
 *    - Path containment rejects absolute paths, drive-anchored paths, and lexical traversal escaping root.
 *    - Symlink/junction adversarial escape fixture fails closed.
 *    - Audit verifies that shipped application code (apps/api, apps/mobile, packages/) never imports test adapter or reconcile engine.
 * 6. Governance invariants & baseline immutability:
 *    - Rule IV-001 Non-Self-Acceptance: strictly 0.0% / UNACCEPTED.
 *    - Production Air-Gap: strictly 0.0% / UNEXECUTED.
 *    - Financial Defect DQ-W021.5-B2.2E-001 remains strictly OPEN (0.0% earned, 5.0% blocked).
 *    - Telangana AC 119 Boundary Defect remains strictly OPEN / BLOCKED (1.5% blocked).
 *    - 68 SQL migrations match baseline 0ea572d byte-for-byte.
 *    - 31 MLA seed profiles match baseline fb408ce byte-for-byte.
 *    - Canonical task inventory: exactly 27 canonical tasks, summing to 100.000% weight, 61.5% repo-verified earned.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

import * as productionVerifierModule from '../scripts/reconcile_execution_ledger.mjs';

import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  CANONICAL_TASK_METADATA,
  FORBIDDEN_TRUST_OVERRIDES,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  reconcileExecutionLedger,
  assertNoCallerTrustOverrides,
} from '../scripts/reconcile_execution_ledger.mjs';

import {
  testVerifyHistoricalArtifactIntegrity,
  testVerifyAuthorityBoundary,
  testVerifyGoverningSpecificationProvenance,
  testReconcileExecutionLedger,
} from './helpers/ledger-test-adapter.mjs';

import {
  validateManifestIntegrity,
  assertPathContainedInRoot,
} from '../scripts/capture_test_execution.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    testsFailed++;
  }
}

/**
 * Helper to run Node commands in clean, process-isolated environments via spawnSync.
 * Fails closed if exit code is non-zero, stderr is emitted, or expected success marker is missing.
 */
function runCleanProcess(codeString, expectedMarker) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', codeString], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });

  if (result.error) {
    throw new Error(`Process spawn error: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Process exited with non-zero code ${result.status}. Stderr: ${result.stderr.trim()}`);
  }
  if (!result.stdout.includes(expectedMarker)) {
    throw new Error(`Missing expected success marker "${expectedMarker}". Output: ${result.stdout.trim()}`);
  }
  return result;
}

/**
 * Creates an isolated temporary directory fixture with a valid manifest and execution log
 * for testing manifest path containment and symlink escape defenses.
 */
function createIsolatedManifestFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-manifest-fixture-110-'));
  const logDir = path.join(tmpDir, 'reports', 'evidence', 'test_execution_logs');
  fs.mkdirSync(logDir, { recursive: true });

  const logContent = [
    '================================================================',
    'KSHETRA TEST SUITE LOG',
    'Suite: tests/sample-adversarial.test.mjs',
    '================================================================',
    '  [PASS] sample test 1',
    '  [PASS] sample test 2',
    '================================================================',
    'TEST SUMMARY: 2 PASSED, 0 FAILED, 0 SKIPPED',
    '================================================================',
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
    verifierRole: 'CTO Directive 110 Test Execution Verifier',
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
        directiveRef: '110',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        executedInCurrentDelivery: true,
        evidenceType: 'DIRECT_EXECUTION_CAPTURE',
        executionEpoch: 'DIRECTIVE_110',
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
      directiveCycle: 'CTO_DIRECTIVE_110',
    },
  };

  return { tmpDir, manifest, logRelPath, logAbsPath, logContent, logSha256 };
}

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 110 VERIFICATION SUITE');
console.log('Remove Unprotected Payload Exports & Close Direct-Invocation Bypass');
console.log('Suite: tests/political-intelligence-directive-110.test.mjs');
console.log('Command: node tests/political-intelligence-directive-110.test.mjs');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Workstream A: Production Verifier Export Surface Audit (B1)
// -----------------------------------------------------------------------------
console.log('--- 1. Production Verifier Export Surface Audit (B1) ---');

runTest('1.1 B1: verifyHistoricalArtifactIntegrityPayload is NOT exported from production verifier', () => {
  assert.strictEqual(
    productionVerifierModule.verifyHistoricalArtifactIntegrityPayload,
    undefined,
    'verifyHistoricalArtifactIntegrityPayload must NOT be exported from scripts/reconcile_execution_ledger.mjs'
  );
});

runTest('1.2 B1: verifyAuthorityBoundaryPayload is NOT exported from production verifier', () => {
  assert.strictEqual(
    productionVerifierModule.verifyAuthorityBoundaryPayload,
    undefined,
    'verifyAuthorityBoundaryPayload must NOT be exported from scripts/reconcile_execution_ledger.mjs'
  );
});

runTest('1.3 B1: verifyGoverningSpecificationProvenancePayload is NOT exported from production verifier', () => {
  assert.strictEqual(
    productionVerifierModule.verifyGoverningSpecificationProvenancePayload,
    undefined,
    'verifyGoverningSpecificationProvenancePayload must NOT be exported from scripts/reconcile_execution_ledger.mjs'
  );
});

runTest('1.4 B1: reconcileExecutionLedgerCore is NOT exported from production verifier', () => {
  assert.strictEqual(
    productionVerifierModule.reconcileExecutionLedgerCore,
    undefined,
    'reconcileExecutionLedgerCore must NOT be exported from scripts/reconcile_execution_ledger.mjs'
  );
});

runTest('1.5 B1: No alternate payload aliases, internal prefixes, or test tokens are exported', () => {
  assert.strictEqual(productionVerifierModule.TEST_HARNESS_PROTECTION_TOKEN, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyHistoricalArtifactIntegrity, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyAuthorityBoundary, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_verifyGoverningSpecificationProvenance, undefined);
  assert.strictEqual(productionVerifierModule.__testOnly_reconcileExecutionLedger, undefined);
  assert.strictEqual(productionVerifierModule._verifyHistoricalArtifactIntegrityInternal, undefined);
  assert.strictEqual(productionVerifierModule._verifyAuthorityBoundaryInternal, undefined);
  assert.strictEqual(productionVerifierModule._verifyGoverningSpecificationProvenanceInternal, undefined);
  assert.strictEqual(productionVerifierModule._reconcileExecutionLedgerInternal, undefined);
});

runTest('1.6 B1: Production verifier exports exactly 4 guarded public verifier entry points alongside approved auxiliary inventory', () => {
  assert.strictEqual(typeof productionVerifierModule.verifyHistoricalArtifactIntegrity, 'function');
  assert.strictEqual(typeof productionVerifierModule.verifyAuthorityBoundary, 'function');
  assert.strictEqual(typeof productionVerifierModule.verifyGoverningSpecificationProvenance, 'function');
  assert.strictEqual(typeof productionVerifierModule.reconcileExecutionLedger, 'function');

  // Verify that the actual exported namespace strictly matches APPROVED_PRODUCTION_EXPORTS
  assert.ok(Array.isArray(productionVerifierModule.APPROVED_PRODUCTION_EXPORTS), 'APPROVED_PRODUCTION_EXPORTS must be an array');
  const actualExports = Object.keys(productionVerifierModule).sort();
  const approvedExports = productionVerifierModule.APPROVED_PRODUCTION_EXPORTS.slice().sort();
  assert.deepStrictEqual(actualExports, approvedExports, 'Actual exports must strictly match approved inventory');

  // Prove that adding an unexpected symbol fails the inventory check
  const simulatedTamperedNamespace = [...actualExports, 'UNAPPROVED_MALICIOUS_EXPORT'].sort();
  assert.throws(
    () => assert.deepStrictEqual(simulatedTamperedNamespace, approvedExports),
    (err) => err.name === 'AssertionError',
    'Namespace comparison must fail closed when an unapproved export is added'
  );
});

// -----------------------------------------------------------------------------
// 2. Workstream B: Exhaustive 40-Check Override Rejection Matrix & Defense (B2)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Public Trust Override Rejection Matrix & Defense (B2) ---');

runTest('2.1 B2: verifyHistoricalArtifactIntegrity rejects ALL 10 forbidden overrides unconditionally', () => {
  assert.strictEqual(FORBIDDEN_TRUST_OVERRIDES.length, 10);
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyHistoricalArtifactIntegrity(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyHistoricalArtifactIntegrity must reject "${overrideKey}"`
    );
  }
});

runTest('2.2 B2: verifyAuthorityBoundary rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyAuthorityBoundary(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyAuthorityBoundary must reject "${overrideKey}"`
    );
  }
});

runTest('2.3 B2: verifyGoverningSpecificationProvenance rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyGoverningSpecificationProvenance(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyGoverningSpecificationProvenance must reject "${overrideKey}"`
    );
  }
});

runTest('2.4 B2: reconcileExecutionLedger rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => reconcileExecutionLedger(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `reconcileExecutionLedger must reject "${overrideKey}"`
    );
  }
});

runTest('2.5 B2: Caller-supplied Booleans and mode flags CANNOT bypass trust rejection across verifiers', () => {
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  const deceptiveOptions = [
    { productionVerificationMode: false, expectedHashOverride: '000000' },
    { testMode: true, expectedHashOverride: '000000' },
    { allowOverrides: true, expectedHashOverride: '000000' },
    { bypass: true, expectedHashOverride: '000000' },
    { force: true, expectedHashOverride: '000000' },
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

runTest('2.6 B2: Symbol.for token forge cannot bypass public verifiers or authorize overrides in clean process', () => {
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

// -----------------------------------------------------------------------------
// 3. Workstream B: Test Adapter Seam & Shared Implementation Parity (B3 & B4)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Test Adapter Seam & Shared Implementation Parity (B3 & B4) ---');

runTest('3.1 B3: Test adapter exercises shared verification logic against tampered hash fixture and fails closed', () => {
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
});

runTest('3.2 B3: Test adapter exercises shared verification logic against tampered raw bytes and fails closed', () => {
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ rawBytesOverride: Buffer.from('TAMPERED_CONTENT_CORRUPTED_LEDGER') }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/
  );
});

runTest('3.3 B3: Test adapter exercises shared verification logic against tampered origin commit and fails closed', () => {
  assert.throws(
    () => testVerifyAuthorityBoundary({ originCommitOverride: '0000000000000000000000000000000000000000' }),
    /Authority boundary violation: Origin snapshot commit .* does not match required origin commit/
  );
});

runTest('3.4 B3: Test adapter exercises shared verification logic against empty matrix and fails closed', () => {
  assert.throws(
    () => testVerifyGoverningSpecificationProvenance({ matrixOverride: { governingDocuments: [] } }),
    /Governing provenance violation: Traceability matrix has missing or empty governingDocuments/
  );
});

runTest('3.5 B4: Implementation parity proof: Production verifiers and test adapter produce identical results under standard inputs', () => {
  const prodHist = verifyHistoricalArtifactIntegrity();
  const testHist = testVerifyHistoricalArtifactIntegrity();
  assert.strictEqual(prodHist.verified, true);
  assert.strictEqual(testHist.verified, true);
  assert.strictEqual(prodHist.rawArtifactIntegrity.actualSha256, testHist.rawArtifactIntegrity.actualSha256);
  assert.strictEqual(prodHist.historicalIdentity.sourceOriginCommit, testHist.historicalIdentity.sourceOriginCommit);

  const prodAuth = verifyAuthorityBoundary();
  const testAuth = testVerifyAuthorityBoundary();
  assert.strictEqual(prodAuth.verified, true);
  assert.strictEqual(testAuth.verified, true);
  assert.strictEqual(prodAuth.taskCount, testAuth.taskCount);
  assert.strictEqual(prodAuth.conservationSum, testAuth.conservationSum);

  const prodGov = verifyGoverningSpecificationProvenance();
  const testGov = testVerifyGoverningSpecificationProvenance();
  assert.strictEqual(prodGov.verified, true);
  assert.strictEqual(testGov.verified, true);
  assert.strictEqual(prodGov.canonicalTasksVerified, testGov.canonicalTasksVerified);
});

runTest('3.6 B4: Direct invocation bypass closure proof: Production verifier cannot be called with payload arguments', () => {
  // In Directive 109, a caller could import verifyHistoricalArtifactIntegrityPayload directly.
  // In Directive 110, verifyHistoricalArtifactIntegrityPayload is undefined on production module.
  assert.strictEqual(productionVerifierModule.verifyHistoricalArtifactIntegrityPayload, undefined);
  assert.strictEqual(productionVerifierModule.verifyAuthorityBoundaryPayload, undefined);
  assert.strictEqual(productionVerifierModule.verifyGoverningSpecificationProvenancePayload, undefined);
  assert.strictEqual(productionVerifierModule.reconcileExecutionLedgerCore, undefined);

  // Calling the public verifier with override arguments unconditionally throws CALLER_TRUST_OVERRIDE_PROHIBITED
  assert.throws(
    () => productionVerifierModule.verifyHistoricalArtifactIntegrity({ expectedHashOverride: '000000' }),
    /CALLER_TRUST_OVERRIDE_PROHIBITED/
  );
  assert.throws(
    () => productionVerifierModule.verifyAuthorityBoundary({ originCommitOverride: '000000' }),
    /CALLER_TRUST_OVERRIDE_PROHIBITED/
  );
  assert.throws(
    () => productionVerifierModule.verifyGoverningSpecificationProvenance({ matrixOverride: {} }),
    /CALLER_TRUST_OVERRIDE_PROHIBITED/
  );
  assert.throws(
    () => productionVerifierModule.reconcileExecutionLedger({ ledgerOverride: {} }),
    /CALLER_TRUST_OVERRIDE_PROHIBITED/
  );
});

// -----------------------------------------------------------------------------
// 4. Workstream B: Clean-Process Module Loading & Dependency Acyclicity (B5 & B6)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Clean-Process Module Loading & Dependency Acyclicity (B5 & B6) ---');

runTest('4.1 B5: Clean-process import of scripts/reconcile_execution_ledger.mjs succeeds without module-initialization errors', () => {
  const code = `
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    if (typeof verifier.verifyHistoricalArtifactIntegrity !== 'function') throw new Error('verifyHistoricalArtifactIntegrity missing');
    if (typeof verifier.verifyAuthorityBoundary !== 'function') throw new Error('verifyAuthorityBoundary missing');
    if (typeof verifier.verifyGoverningSpecificationProvenance !== 'function') throw new Error('verifyGoverningSpecificationProvenance missing');
    if (typeof verifier.reconcileExecutionLedger !== 'function') throw new Error('reconcileExecutionLedger missing');
    if (verifier.verifyHistoricalArtifactIntegrityPayload !== undefined) throw new Error('verifyHistoricalArtifactIntegrityPayload must be undefined');
    if (verifier.reconcileExecutionLedgerCore !== undefined) throw new Error('reconcileExecutionLedgerCore must be undefined');
    console.log('SUCCESS:PRODUCTION_VERIFIER_LOADED');
  `;
  const res = runCleanProcess(code, 'SUCCESS:PRODUCTION_VERIFIER_LOADED');
  assert.strictEqual(res.status, 0);
});

runTest('4.2 B5: Clean-process import of tests/helpers/ledger-test-adapter.mjs succeeds without module-initialization errors', () => {
  const code = `
    import * as adapter from './tests/helpers/ledger-test-adapter.mjs';
    if (typeof adapter.testVerifyHistoricalArtifactIntegrity !== 'function') throw new Error('testVerifyHistoricalArtifactIntegrity missing');
    if (typeof adapter.testVerifyAuthorityBoundary !== 'function') throw new Error('testVerifyAuthorityBoundary missing');
    if (typeof adapter.testVerifyGoverningSpecificationProvenance !== 'function') throw new Error('testVerifyGoverningSpecificationProvenance missing');
    if (typeof adapter.testReconcileExecutionLedger !== 'function') throw new Error('testReconcileExecutionLedger missing');
    console.log('SUCCESS:TEST_ADAPTER_LOADED');
  `;
  const res = runCleanProcess(code, 'SUCCESS:TEST_ADAPTER_LOADED');
  assert.strictEqual(res.status, 0);
});

runTest('4.3 B5: Clean-process import of scripts/internal/reconcile_engine.mjs succeeds without module-initialization errors', () => {
  const code = `
    import * as engine from './scripts/internal/reconcile_engine.mjs';
    if (typeof engine.verifyHistoricalArtifactIntegrityPayload !== 'function') throw new Error('verifyHistoricalArtifactIntegrityPayload missing');
    if (typeof engine.verifyAuthorityBoundaryPayload !== 'function') throw new Error('verifyAuthorityBoundaryPayload missing');
    if (typeof engine.verifyGoverningSpecificationProvenancePayload !== 'function') throw new Error('verifyGoverningSpecificationProvenancePayload missing');
    if (typeof engine.reconcileExecutionLedgerCore !== 'function') throw new Error('reconcileExecutionLedgerCore missing');
    console.log('SUCCESS:INTERNAL_ENGINE_LOADED');
  `;
  const res = runCleanProcess(code, 'SUCCESS:INTERNAL_ENGINE_LOADED');
  assert.strictEqual(res.status, 0);
});

runTest('4.4 B6: Clean-process simultaneous import of all three modules confirms acyclic module graph', () => {
  const code = `
    import * as engine from './scripts/internal/reconcile_engine.mjs';
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    import * as adapter from './tests/helpers/ledger-test-adapter.mjs';
    if (!engine || !verifier || !adapter) throw new Error('Failed to import all three modules');
    console.log('SUCCESS:ALL_THREE_MODULES_LOADED_CLEANLY');
  `;
  const res = runCleanProcess(code, 'SUCCESS:ALL_THREE_MODULES_LOADED_CLEANLY');
  assert.strictEqual(res.status, 0);
});

runTest('4.5 B6: Static AST/code analysis confirms strict DAG architecture (zero circular imports)', () => {
  // 1. Production verifier does NOT import test adapter
  const verifierContent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/reconcile_execution_ledger.mjs'), 'utf8');
  assert.strictEqual(
    /from\s+['"][^'"]*ledger-test-adapter/.test(verifierContent),
    false,
    'Production verifier must NOT import test adapter'
  );

  // 2. Internal engine does NOT import production verifier or test adapter
  const engineContent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/internal/reconcile_engine.mjs'), 'utf8');
  assert.strictEqual(
    /from\s+['"][^'"]*(reconcile_execution_ledger|ledger-test-adapter)/.test(engineContent),
    false,
    'Internal engine must NOT import production verifier or test adapter'
  );

  // 3. Test adapter does NOT import production verifier
  const adapterContent = fs.readFileSync(path.join(REPO_ROOT, 'tests/helpers/ledger-test-adapter.mjs'), 'utf8');
  assert.strictEqual(
    /from\s+['"][^'"]*reconcile_execution_ledger/.test(adapterContent),
    false,
    'Test adapter must NOT import production verifier'
  );
});

runTest('4.6 B5: Clean-process test runner fails closed on non-zero child exit or missing marker', () => {
  let threwExpected = false;
  try {
    const failingCode = `console.log('SOME_OTHER_OUTPUT'); process.exit(1);`;
    runCleanProcess(failingCode, 'SUCCESS:EXPECTED_MARKER');
  } catch (err) {
    threwExpected = true;
    assert(err.message.includes('non-zero code 1') || err.message.includes('Missing expected success marker'));
  }
  assert.strictEqual(threwExpected, true, 'Clean-process test runner must fail closed on nonzero child exit');
});

// -----------------------------------------------------------------------------
// 5. Workstream B: Path Containment & Codebase Reachability (B7 & B8)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Path Containment & Codebase Reachability (B7 & B8) ---');

runTest('5.1 B7: assertPathContainedInRoot rejects absolute paths and drive-anchored paths', () => {
  assert.throws(
    () => assertPathContainedInRoot('C:\\Windows\\System32\\calc.exe', REPO_ROOT),
    /Path containment violation.*must be a relative repository path/
  );
  assert.throws(
    () => assertPathContainedInRoot('/etc/passwd', REPO_ROOT),
    /Path containment violation.*must be a relative repository path/
  );
});

runTest('5.2 B7: assertPathContainedInRoot rejects lexical path traversal outside root', () => {
  assert.throws(
    () => assertPathContainedInRoot('../outside-repo.log', REPO_ROOT),
    (err) => err.message.includes('traverses outside repository root')
  );
  assert.throws(
    () => assertPathContainedInRoot('reports/../../outside-repo.log', REPO_ROOT),
    (err) => err.message.includes('traverses outside repository root')
  );
});

runTest('5.3 B7: Genuine symlink/junction adversarial escape fixture in validateManifestIntegrity fails closed', () => {
  const fixture = createIsolatedManifestFixture();
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-ext-logs-110-'));
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
      'validateManifestIntegrity must reject symlinks/junctions pointing outside repository root'
    );
  } finally {
    try { fs.rmSync(fixture.tmpDir, { recursive: true, force: true }); } catch (_) {}
    try { fs.rmSync(extDir, { recursive: true, force: true }); } catch (_) {}
  }
});

runTest('5.4 B8: Codebase reachability audit: Test adapter and internal engine are NOT imported by shipped application code', () => {
  const searchDirs = [
    path.join(REPO_ROOT, 'apps/api/src'),
    path.join(REPO_ROOT, 'apps/mobile'),
    path.join(REPO_ROOT, 'packages'),
  ];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== 'dist' && ent.name !== 'build' && ent.name !== '.cxx') {
          files = files.concat(scanDir(full));
        }
      } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
        files.push(full);
      }
    }
    return files;
  }

  const appFiles = searchDirs.flatMap(scanDir);
  assert(appFiles.length > 50, `Expected at least 50 application files to scan, found ${appFiles.length}`);

  for (const f of appFiles) {
    const content = fs.readFileSync(f, 'utf8');
    assert.strictEqual(
      !content.includes('ledger-test-adapter') && !content.includes('reconcile_engine'),
      true,
      `Shipped application code file "${f}" must NOT import ledger-test-adapter or reconcile_engine`
    );
  }
});

// -----------------------------------------------------------------------------
// 6. Workstream B: Mandatory Governance Invariants & Baseline Immutability (B9)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Mandatory Governance Invariants & Baseline Immutability (B9) ---');

runTest('6.1 B9: Rule IV-001 Non-Self-Acceptance: Formal acceptance is strictly 0.0% / UNACCEPTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  assert.ok(fs.existsSync(ledgerPath), 'Ledger file must exist');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(ledger.summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);
});

runTest('6.2 B9: Production Air-Gap: Live database execution is strictly 0.0% / UNEXECUTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
});

runTest('6.3 B9: Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned, 5.0% blocked)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  const b22eTask = ledger.stages.flatMap(s => s.tasks).find(t => t.taskId === 'W021.5-E-02');
  assert(b22eTask, 'Task W021.5-E-02 must exist');
  assert.strictEqual(b22eTask.status, 'BLOCKED');
  assert.strictEqual(b22eTask.accounting.repoVerifiedWeight, 0.0);
  assert.strictEqual(b22eTask.accounting.blockedWeight, 5.0);
});

runTest('6.4 B9: Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const b04Task = ledger.stages.flatMap(s => s.tasks).find(t => t.taskId === 'W021.5-B1-04');
  assert(b04Task, 'Task W021.5-B1-04 must exist');
  assert.strictEqual(b04Task.accounting.blockedWeight, 1.5);

  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  if (fs.existsSync(geoPath)) {
    const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
    assert.strictEqual(geo.features.length, 120, 'Telangana assembly GeoJSON must preserve 120 features for 119 seats');
  }
});

runTest('6.5 B9: SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte identical', () => {
  const diffOutput = execSync('git diff 0ea572d860aa064766042f6b418b157fd8e2098f -- supabase/migrations/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'SQL migrations must match baseline 0ea572d byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
  assert.strictEqual(files.length, 68, 'Must have exactly 68 SQL migration files');
});

runTest('6.6 B9: MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const diffOutput = execSync('git diff fb408cec80a21bf4a6b7c82fe665203b64c39af1 -- apps/mobile/constants/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'MLA profile seed files must match baseline fb408ce byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter(f => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(files.length, 31, 'Must have exactly 31 MLA profile seed files');
});

runTest('6.7 B9: Canonical task inventory equality: exactly 27 canonical tasks summing to 100.000% weight', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.totalTasks, 27);
  assert.strictEqual(ledger.summary.totalWeight, 100);
  assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(ledger.summary.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(ledger.summary.notImplementedPercent, 5.5);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED, 0 SKIPPED`);
console.log('================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
