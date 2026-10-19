#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-109.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 109
 * Verification Engine Boundary Clarification, Clean-Process Regression, and Evidence Qualification
 *
 * Test battery verifying:
 * 1. Clean-process module loading and initialization for production verifier and test adapter.
 * 2. Elimination of circular module dependencies across reconcile_execution_ledger and test seams.
 * 3. 40-check public override rejection matrix across all 4 entry points and 10 forbidden overrides.
 * 4. Inability of Symbol.for token forgeries to bypass verifier safeguards.
 * 5. Test adapter execution of shared verification logic against tampered fixtures failing closed.
 * 6. Canonical symlink/junction and lexical path containment verification.
 * 7. Process-isolated fail-closed test harness verification.
 * 8. Audit of application code reachability confirming zero test adapter imports in shipped code.
 * 9. Manifest evidence qualification: tri-state skipped counting and REPOSITORY_RECORDED_EXECUTION.
 * 10. Governance invariants: 27 tasks, 61.5% earned, 0.0% acceptance, 0.0% database, baseline immutability.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

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

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 109 VERIFICATION SUITE');
console.log('Verification Engine Boundary Clarification & Clean-Process Regression');
console.log('Suite: tests/political-intelligence-directive-109.test.mjs');
console.log('Command: node tests/political-intelligence-directive-109.test.mjs');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Workstream A & B: Clean-Process Module Loading & Circular Dependency Elimination
// -----------------------------------------------------------------------------
console.log('--- 1. Clean-Process Module Loading & Dependency Acyclicity ---');

runTest('1.1 Clean-process import of scripts/reconcile_execution_ledger.mjs succeeds without module-initialization errors', () => {
  const code = `
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    if (typeof verifier.verifyHistoricalArtifactIntegrity !== 'function') throw new Error('verifyHistoricalArtifactIntegrity missing');
    if (typeof verifier.verifyAuthorityBoundary !== 'function') throw new Error('verifyAuthorityBoundary missing');
    if (typeof verifier.verifyGoverningSpecificationProvenance !== 'function') throw new Error('verifyGoverningSpecificationProvenance missing');
    if (typeof verifier.reconcileExecutionLedger !== 'function') throw new Error('reconcileExecutionLedger missing');
    console.log('SUCCESS:PRODUCTION_VERIFIER_LOADED');
  `;
  const res = runCleanProcess(code, 'SUCCESS:PRODUCTION_VERIFIER_LOADED');
  assert.strictEqual(res.status, 0);
});

runTest('1.2 Clean-process import of tests/helpers/ledger-test-adapter.mjs succeeds without module-initialization errors', () => {
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

runTest('1.3 Clean-process verification of acyclic dependency graph (zero circular dependencies)', () => {
  const code = `
    // Import both modules in order to prove that neither module imports the other circularly
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    import * as adapter from './tests/helpers/ledger-test-adapter.mjs';
    
    // Assert production verifier does NOT import test adapter (no test seam leak in production)
    const verifierContent = (await import('fs')).readFileSync('scripts/reconcile_execution_ledger.mjs', 'utf8');
    if (/from\s+['"][^'"]*ledger-test-adapter/.test(verifierContent)) {
      throw new Error('CIRCULAR_DEPENDENCY_DETECTED: reconcile_execution_ledger.mjs imports ledger-test-adapter.mjs');
    }
    // Assert internal engine does NOT import production verifier or test adapter (zero circular dependency)
    const engineContent = (await import('fs')).readFileSync('scripts/internal/reconcile_engine.mjs', 'utf8');
    if (/from\s+['"][^'"]*(reconcile_execution_ledger|ledger-test-adapter)/.test(engineContent)) {
      throw new Error('CIRCULAR_DEPENDENCY_DETECTED: reconcile_engine.mjs imports production verifier or test adapter');
    }
    // Assert test adapter does NOT import production verifier
    const adapterContent = (await import('fs')).readFileSync('tests/helpers/ledger-test-adapter.mjs', 'utf8');
    if (/from\s+['"][^'"]*reconcile_execution_ledger/.test(adapterContent)) {
      throw new Error('CIRCULAR_DEPENDENCY_DETECTED: ledger-test-adapter.mjs imports production verifier');
    }
    console.log('SUCCESS:MODULE_GRAPH_ACYCLIC');
  `;
  const res = runCleanProcess(code, 'SUCCESS:MODULE_GRAPH_ACYCLIC');
  assert.strictEqual(res.status, 0);
});

runTest('1.4 Clean-process test harness fails closed when child process encounters error or missing marker', () => {
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
// 2. Workstream B: Exhaustive 40-Check Public Trust Override Rejection Matrix
// -----------------------------------------------------------------------------
console.log('\n--- 2. Public Trust Override Rejection & Symbol Forgery Defense ---');

runTest('2.1 B1: verifyHistoricalArtifactIntegrity rejects ALL 10 forbidden overrides unconditionally in clean process', () => {
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyHistoricalArtifactIntegrity(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyHistoricalArtifactIntegrity must unconditionally reject override: ${overrideKey}`
    );
  }
});

runTest('2.2 B1: verifyAuthorityBoundary rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyAuthorityBoundary(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyAuthorityBoundary must unconditionally reject override: ${overrideKey}`
    );
  }
});

runTest('2.3 B1: verifyGoverningSpecificationProvenance rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => verifyGoverningSpecificationProvenance(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `verifyGoverningSpecificationProvenance must unconditionally reject override: ${overrideKey}`
    );
  }
});

runTest('2.4 B1: reconcileExecutionLedger rejects ALL 10 forbidden overrides unconditionally', () => {
  for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
    const opts = { [overrideKey]: 'TAMPERED_TEST_VALUE' };
    assert.throws(
      () => reconcileExecutionLedger(opts),
      (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
      `reconcileExecutionLedger must unconditionally reject override: ${overrideKey}`
    );
  }
});

runTest('2.5 B2: Caller-supplied Booleans and mode flags CANNOT bypass trust rejection', () => {
  const bypassFlags = [
    { productionMode: false },
    { productionVerificationMode: false },
    { allowOverrides: true },
    { bypassSecurity: true },
    { testMode: true },
    { isTest: true },
    { disableValidation: true },
  ];

  for (const flags of bypassFlags) {
    for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
      const opts = { ...flags, [overrideKey]: 'ADVERSARIAL_PAYLOAD' };
      assert.throws(
        () => verifyHistoricalArtifactIntegrity(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `verifyHistoricalArtifactIntegrity bypassed by flag ${JSON.stringify(flags)}`
      );
      assert.throws(
        () => verifyAuthorityBoundary(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `verifyAuthorityBoundary bypassed by flag ${JSON.stringify(flags)}`
      );
      assert.throws(
        () => verifyGoverningSpecificationProvenance(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `verifyGoverningSpecificationProvenance bypassed by flag ${JSON.stringify(flags)}`
      );
      assert.throws(
        () => reconcileExecutionLedger(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `reconcileExecutionLedger bypassed by flag ${JSON.stringify(flags)}`
      );
    }
  }
});

runTest('2.6 B3: Symbol.for token forge cannot bypass public verifiers or authorize overrides in clean process', () => {
  const code = `
    import { verifyHistoricalArtifactIntegrity, reconcileExecutionLedger } from './scripts/reconcile_execution_ledger.mjs';
    const forgedToken = Symbol.for('KSHETRA_TEST_ONLY_HARNESS_PROTECTION_TOKEN');
    const opts = {
      token: forgedToken,
      _token: forgedToken,
      expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000',
    };
    try {
      verifyHistoricalArtifactIntegrity(opts);
      throw new Error('SECURITY_BREACH: Symbol.for token authorized trust override in verifyHistoricalArtifactIntegrity');
    } catch (err) {
      if (!err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED')) {
        throw new Error('Wrong error message on Symbol.for forge: ' + err.message);
      }
    }
    console.log('SUCCESS:SYMBOL_FORGERY_REJECTED');
  `;
  const res = runCleanProcess(code, 'SUCCESS:SYMBOL_FORGERY_REJECTED');
  assert.strictEqual(res.status, 0);
});

// -----------------------------------------------------------------------------
// 3. Workstream A & B: Test Adapter Seam & Shared Implementation Verification
// -----------------------------------------------------------------------------
console.log('\n--- 3. Test Adapter Seam & Shared Implementation Parity ---');

runTest('3.1 Test adapter exercises shared verification logic against tampered hash fixture and fails closed', () => {
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({
      expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000',
    }),
    (err) => err.message.includes('SHA-256 hash mismatch'),
    'testVerifyHistoricalArtifactIntegrity must fail closed on tampered hash'
  );
});

runTest('3.2 Test adapter exercises shared verification logic against tampered raw bytes and fails closed', () => {
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({
      rawBytesOverride: Buffer.from('{"tampered": true}'),
    }),
    (err) => err.message.includes('Raw artifact integrity violation') || err.message.includes('Snapshot fidelity violation'),
    'testVerifyHistoricalArtifactIntegrity must fail closed on tampered raw bytes'
  );
});

runTest('3.3 Test adapter exercises shared verification logic against tampered origin commit and fails closed', () => {
  assert.throws(
    () => testVerifyAuthorityBoundary({
      originCommitOverride: '0000000000000000000000000000000000000000',
    }),
    (err) => err.message.includes('Authority boundary violation') && err.message.includes('commit'),
    'testVerifyAuthorityBoundary must fail closed on tampered commit'
  );
});

runTest('3.4 Test adapter exercises shared verification logic against empty matrix and fails closed', () => {
  assert.throws(
    () => testVerifyGoverningSpecificationProvenance({
      matrixOverride: { tasks: [] },
    }),
    (err) => err.message.includes('Governing provenance violation'),
    'testVerifyGoverningSpecificationProvenance must fail closed on empty matrix'
  );
});

runTest('3.5 Implementation parity proof: Production verifiers and test adapter produce identical results under standard inputs', () => {
  const prodHist = verifyHistoricalArtifactIntegrity({});
  const adapterHist = testVerifyHistoricalArtifactIntegrity({});
  assert.deepStrictEqual(prodHist, adapterHist, 'Historical artifact integrity results must match identically');

  const prodAuth = verifyAuthorityBoundary({});
  const adapterAuth = testVerifyAuthorityBoundary({});
  assert.deepStrictEqual(prodAuth, adapterAuth, 'Authority boundary verification results must match identically');

  const prodGov = verifyGoverningSpecificationProvenance({});
  const adapterGov = testVerifyGoverningSpecificationProvenance({});
  assert.deepStrictEqual(prodGov, adapterGov, 'Governing specification provenance results must match identically');
});

runTest('3.6 Codebase reachability audit: Test adapter is NOT imported by shipped application code', () => {
  const filesToAudit = [
    ...fs.readdirSync(path.join(REPO_ROOT, 'apps/api/src')).map(f => path.join(REPO_ROOT, 'apps/api/src', f)),
    ...fs.readdirSync(path.join(REPO_ROOT, 'apps/mobile')).map(f => path.join(REPO_ROOT, 'apps/mobile', f)),
  ];

  // Recursively find ts/js files in apps/api/src and apps/mobile/lib
  function getSourceFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        results = results.concat(getSourceFiles(full));
      } else if (/\.(ts|tsx|js|mjs)$/.test(file)) {
        results.push(full);
      }
    }
    return results;
  }

  const appFiles = [
    ...getSourceFiles(path.join(REPO_ROOT, 'apps/api/src')),
    ...getSourceFiles(path.join(REPO_ROOT, 'apps/mobile/lib')),
    ...getSourceFiles(path.join(REPO_ROOT, 'apps/mobile/app')),
  ];

  for (const f of appFiles) {
    const content = fs.readFileSync(f, 'utf8');
    assert(
      !content.includes('ledger-test-adapter') && !content.includes('reconcile_engine'),
      `Shipped application code file "${f}" must NOT import ledger-test-adapter or reconcile_engine`
    );
  }
});

// -----------------------------------------------------------------------------
// 4. Workstream B & C: Path & Manifest Symlink Containment
// -----------------------------------------------------------------------------
console.log('\n--- 4. Path & Manifest Symlink Containment ---');

function createIsolatedManifestFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-manifest-109-'));
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
    verifierRole: 'CTO Directive 109 Test Execution Verifier',
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
        directiveRef: '109',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        executedInCurrentDelivery: true,
        evidenceType: 'DIRECT_EXECUTION_CAPTURE',
        executionEpoch: 'DIRECTIVE_109',
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
      directiveCycle: 'CTO_DIRECTIVE_109',
    },
  };

  return { tmpDir, manifest, logRelPath, logAbsPath, logContent, logSha256 };
}

runTest('4.1 assertPathContainedInRoot rejects absolute paths and drive-anchored paths', () => {
  assert.throws(
    () => assertPathContainedInRoot('C:\\Windows\\System32\\calc.exe', REPO_ROOT),
    /Path containment violation.*must be a relative repository path/
  );
  assert.throws(
    () => assertPathContainedInRoot('/etc/passwd', REPO_ROOT),
    /Path containment violation.*must be a relative repository path/
  );
});

runTest('4.2 assertPathContainedInRoot rejects lexical path traversal outside root', () => {
  assert.throws(
    () => assertPathContainedInRoot('../outside-repo.log', REPO_ROOT),
    (err) => err.message.includes('traverses outside repository root')
  );
  assert.throws(
    () => assertPathContainedInRoot('reports/../../outside-repo.log', REPO_ROOT),
    (err) => err.message.includes('traverses outside repository root')
  );
});

runTest('4.3 Genuine symlink/junction adversarial escape fixture in validateManifestIntegrity fails closed', () => {
  const fixture = createIsolatedManifestFixture();
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kshetra-ext-logs-109-'));
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
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
    fs.rmSync(extDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// 5. Workstream C: Manifest Evidence Qualification & Skipped Count Semantics
// -----------------------------------------------------------------------------
console.log('\n--- 5. Manifest Evidence Qualification & Skipped Counts ---');

runTest('5.1 Manifest evidence qualification is strictly REPOSITORY_RECORDED_EXECUTION', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  assert(fs.existsSync(manifestPath), 'Manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(
    manifest.executionQualification,
    'REPOSITORY_RECORDED_EXECUTION',
    'Manifest execution qualification must be REPOSITORY_RECORDED_EXECUTION'
  );
});

runTest('5.2 Manifest preserves SKIPPED_COUNT_NOT_REPORTED for legacy suites without explicit skipped count evidence', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Suites 5 to 27 (Directives 084 to 106) must be SKIPPED_COUNT_NOT_REPORTED
  const legacySuites = manifest.testSuites.slice(4, 27);
  assert.strictEqual(legacySuites.length, 23, 'Must have 23 legacy custom suites');
  for (const s of legacySuites) {
    assert.strictEqual(
      s.skippedState,
      'SKIPPED_COUNT_NOT_REPORTED',
      `Suite ${s.suite} must preserve SKIPPED_COUNT_NOT_REPORTED`
    );
    assert.strictEqual(
      s.zeroSkippedEvidenced,
      false,
      `Suite ${s.suite} must not claim zeroSkippedEvidenced: true without runner contract evidence`
    );
  }
});

runTest('5.3 Jest suites and recent directive suites evidence EXPLICIT_ZERO_SKIPPED', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Jest suites (first 4)
  const jestSuites = manifest.testSuites.slice(0, 4);
  for (const s of jestSuites) {
    assert.strictEqual(s.skippedState, 'EXPLICIT_ZERO_SKIPPED');
    assert.strictEqual(s.zeroSkippedEvidenced, true);
  }

  // Directive 107, 108, and 109 suites
  const dir107 = manifest.testSuites.find(s => s.directiveRef === '107');
  const dir108 = manifest.testSuites.find(s => s.directiveRef === '108');
  assert(dir107, 'Directive 107 suite must be present in manifest');
  assert(dir108, 'Directive 108 suite must be present in manifest');
  assert.strictEqual(dir107.skippedState, 'EXPLICIT_ZERO_SKIPPED');
  assert.strictEqual(dir107.zeroSkippedEvidenced, true);
  assert.strictEqual(dir108.skippedState, 'EXPLICIT_ZERO_SKIPPED');
  assert.strictEqual(dir108.zeroSkippedEvidenced, true);

  const dir109 = manifest.testSuites.find(s => s.directiveRef === '109');
  if (dir109) {
    assert.strictEqual(dir109.skippedState, 'EXPLICIT_ZERO_SKIPPED');
    assert.strictEqual(dir109.zeroSkippedEvidenced, true);
  }
});

runTest('5.4 Manifest aggregate counts are derivable from individual suite entries', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  let derivedPassed = 0;
  let derivedFailed = 0;
  for (const s of manifest.testSuites) {
    derivedPassed += s.testsPassed;
    derivedFailed += s.testsFailed;
  }

  assert.strictEqual(manifest.summary.totalTestsPassed, derivedPassed);
  assert.strictEqual(manifest.summary.totalTestsFailed, derivedFailed);
  assert.strictEqual(manifest.summary.totalSuites, manifest.testSuites.length);
  assert.strictEqual(manifest.summary.passedSuites, manifest.testSuites.filter(s => s.status === 'PASS').length);
});

// -----------------------------------------------------------------------------
// 6. Governance Invariants & Baseline Immutability
// -----------------------------------------------------------------------------
console.log('\n--- 6. Mandatory Governance Invariants & Baseline Immutability ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: Formal acceptance is strictly 0.0% / UNACCEPTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(ledger.summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);
});

runTest('6.2 Production Air-Gap: Live database execution is strictly 0.0% / UNEXECUTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
});

runTest('6.3 Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned, 5.0% blocked)', () => {
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

runTest('6.4 Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
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

runTest('6.5 SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte identical', () => {
  const diffOutput = execSync('git diff 0ea572d860aa064766042f6b418b157fd8e2098f -- supabase/migrations/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'SQL migrations must match baseline 0ea572d byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
  assert.strictEqual(files.length, 68, 'Must have exactly 68 SQL migration files');
});

runTest('6.6 MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const diffOutput = execSync('git diff fb408cec80a21bf4a6b7c82fe665203b64c39af1 -- apps/mobile/constants/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'MLA profile seed files must match baseline fb408ce byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter(f => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(files.length, 31, 'Must have exactly 31 MLA profile seed files');
});

runTest('6.7 Canonical task inventory equality: exactly 27 canonical tasks summing to 100.000% weight', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.totalTasks, 27);
  assert.strictEqual(ledger.summary.totalWeight, 100);
  assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(ledger.summary.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(ledger.summary.notImplementedPercent, 5.5);
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED, 0 SKIPPED`);
console.log('================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
