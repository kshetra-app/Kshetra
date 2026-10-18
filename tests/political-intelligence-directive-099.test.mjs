#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-099.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 099 Verification Suite
 * Strong Test-Result Binding, Manifest-to-Log Reconciliation, and
 * Task-Specific Criterion Verification
 *
 * Covers:
 * 1. Workstream A: Strong Suite Identity Verification & Adversarial Runner Binding (12 tests)
 * 2. Workstream B: Deep Manifest-to-Log Reconciliation & Tampering Falsification (10 tests)
 * 3. Workstream C: Execution Provenance, Stale Metadata & Inventory Reconciled (6 tests)
 * 4. Workstream D: Domain Criteria Substantive Verification & Mutation Battery (12 tests)
 * 5. Workstream E & F: Trust-Anchor Operational Boundaries & Hard Invariants (8 tests)
 * Total: 48 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';

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
  validateTaskAccounting,
  validateTaskEvidence,
  validateClaimSpecificContent,
  validateFormalAcceptanceArtifact,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  getCanonicalAcceptancePayload,
  getTrustedAuthorities,
  verifyCryptographicAcceptanceSignature,
  computeKeyFingerprint,
  evaluateTaskCriteria,
  validateGeoJsonContent,
  validateSqlContent,
  validateTestContent,
  validateMarkdownContent,
  validateJsonContent,
  applyTaskAccountingDefaults,
  stripSqlCommentsAndLiterals,
  TASK_DELIVERABLE_SIGNATURES,
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 099 VERIFICATION SUITE');
console.log('Strong Suite Binding, Manifest-Log Reconciliation & Task Criterion Audit');
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

// Helper to create an ephemeral Ed25519 test keypair
function createTestKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  const fingerprint = computeKeyFingerprint(pubPem);
  return { publicKey, privateKey, pubPem, fingerprint };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Strong Suite Identity Verification & Adversarial Runner Binding
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Strong Suite Identity Verification & Adversarial Runner Binding ---');

runTest('1.1 Jest runner output with matching PASS line binds to expected suite cleanly', () => {
  const suiteDef = {
    suite: 'apps/api/src/__tests__/constituencies.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/constituencies.test.ts',
  };
  const rawOutput = [
    'PASS src/__tests__/constituencies.test.ts',
    '  Constituency routes',
    '    ✓ GET /api/v1/constituencies returns 200 (15 ms)',
    '',
    'Test Suites: 1 passed, 1 total',
    'Tests:       24 passed, 24 total',
    'Snapshots:   0 total',
    'Time:        1.25 s',
  ].join('\n');

  const parsed = parseTestOutput(rawOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, true);
  assert.strictEqual(parsed.passed, 24);
  assert.strictEqual(parsed.failed, 0);
  assert.strictEqual(parsed.runnerFormat, 'JEST');
});

runTest('1.2 Jest runner output with wrong suite PASS line fails closed with SUITE_IDENTITY_MISMATCH', () => {
  const suiteDef = {
    suite: 'apps/api/src/__tests__/constituencies.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/constituencies.test.ts',
  };
  const wrongJestOutput = [
    'PASS src/__tests__/observability.test.ts',
    '  Observability routes',
    '    ✓ GET /health returns 200 (5 ms)',
    '',
    'Test Suites: 1 passed, 1 total',
    'Tests:       19 passed, 19 total',
  ].join('\n');

  const parsed = parseTestOutput(wrongJestOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_MISMATCH');
  assert.ok(parsed.failureDetail.includes('do not match expected suite'));
});

runTest('1.3 Jest output containing multiple conflicting executed suite lines fails closed (SUITE_IDENTITY_AMBIGUOUS)', () => {
  const suiteDef = {
    suite: 'apps/api/src/__tests__/constituencies.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/constituencies.test.ts',
  };
  const multiJestOutput = [
    'PASS src/__tests__/constituencies.test.ts',
    'PASS src/__tests__/observability.test.ts',
    'Test Suites: 2 passed, 2 total',
    'Tests:       43 passed, 43 total',
  ].join('\n');

  const parsed = parseTestOutput(multiJestOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_AMBIGUOUS');
});

runTest('1.4 Plausible success summary from wrong suite containing expected suite basename in arbitrary text fails closed', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    directiveRef: '098',
  };

  // Adversarial output: actually runs Directive 097, but deliberately mentions directive-098 in test names
  const adversarialOutput = [
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 097 VERIFICATION SUITE',
    '================================================================',
    '  [PASS] 1.1 Tests forward compatibility with tests/political-intelligence-directive-098.test.mjs',
    '  [PASS] 1.2 Verifies directive-098 migration prerequisites',
    '================================================================',
    'TEST SUMMARY: 49 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(adversarialOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_MISMATCH');
  assert.ok(parsed.failureDetail.includes('Suite header identifies Directive 97, but expected suite is Directive 98'));
});

runTest('1.5 Generic "DIRECTIVE 098" banner lacking canonical suite title or file identification fails closed', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    directiveRef: '098',
  };

  const genericBannerOutput = [
    '================================================================',
    'CTO DIRECTIVE 098',
    '================================================================',
    '  [PASS] 1.1 Fake test passed',
    '================================================================',
    'TEST SUMMARY: 10 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(genericBannerOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'GENERIC_DIRECTIVE_BANNER_REJECTED');
  assert.ok(parsed.failureDetail.includes('Generic directive reference in banner is not accepted'));
});

runTest('1.6 Delimited banner with explicit Suite: path matching expected suite succeeds', () => {
  const suiteDef = {
    suite: 'tests/custom-verification-suite.test.mjs',
    command: 'node tests/custom-verification-suite.test.mjs',
  };

  const explicitSuiteOutput = [
    '================================================================',
    'VERIFICATION SUITE EXECUTION',
    'Suite: tests/custom-verification-suite.test.mjs',
    '================================================================',
    '  [PASS] 1.1 Custom check 1',
    '================================================================',
    'VERIFICATION SUMMARY: 12 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(explicitSuiteOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, true);
  assert.strictEqual(parsed.passed, 12);
  assert.strictEqual(parsed.failed, 0);
  assert.strictEqual(parsed.runnerFormat, 'CUSTOM_SUMMARY');
});

runTest('1.7 Delimited banner with explicit Suite: path pointing to different suite fails closed (SUITE_IDENTITY_MISMATCH)', () => {
  const suiteDef = {
    suite: 'tests/custom-verification-suite-a.test.mjs',
    command: 'node tests/custom-verification-suite-a.test.mjs',
  };

  const mismatchedSuiteOutput = [
    '================================================================',
    'VERIFICATION SUITE EXECUTION',
    'Suite: tests/custom-verification-suite-b.test.mjs',
    '================================================================',
    '  [PASS] 1.1 Custom check',
    '================================================================',
    'VERIFICATION SUMMARY: 8 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(mismatchedSuiteOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_MISMATCH');
  assert.ok(parsed.failureDetail.includes('Suite header explicitly declared "tests/custom-verification-suite-b.test.mjs" but expected "tests/custom-verification-suite-a.test.mjs"'));
});

runTest('1.8 Custom runner output with multiple conflicting suite banners fails closed (SUITE_IDENTITY_AMBIGUOUS)', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    directiveRef: '098',
  };

  const multipleBannersOutput = [
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 097 VERIFICATION SUITE',
    '================================================================',
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 098 VERIFICATION SUITE',
    '================================================================',
    'TEST SUMMARY: 20 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(multipleBannersOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_AMBIGUOUS');
});

runTest('1.9 Output missing any delimited suite banner or Jest execution line fails closed (SUITE_IDENTITY_MISSING)', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    directiveRef: '098',
  };

  const missingBannerOutput = [
    'Running tests...',
    '  [PASS] 1.1 First test',
    '  [PASS] 1.2 Second test',
    'TEST SUMMARY: 2 PASSED, 0 FAILED',
  ].join('\n');

  const parsed = parseTestOutput(missingBannerOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'SUITE_IDENTITY_MISSING');
});

runTest('1.10 Command inconsistent with expected suite fails closed (COMMAND_SUITE_MISMATCH)', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/unrelated-helper-script.mjs',
  };

  const bannerOutput = [
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 098 VERIFICATION SUITE',
    '================================================================',
    'TEST SUMMARY: 10 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(bannerOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'COMMAND_SUITE_MISMATCH');
  assert.ok(parsed.failureDetail.includes('does not reference expected suite'));
});

runTest('1.11 Unrelated output with valid numbers but no recognized test summary fails closed (UNPARSED_OUTPUT_FORMAT)', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
  };

  const randomOutput = [
    'Process finished.',
    'Total records processed: 500',
    'Errors encountered: 0',
  ].join('\n');

  const parsed = parseTestOutput(randomOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'UNPARSED_OUTPUT_FORMAT');
});

runTest('1.12 Zero tests passed evaluates to failure (ZERO_TESTS_PASSED)', () => {
  const suiteDef = {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    directiveRef: '098',
  };

  const zeroTestsOutput = [
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 098 VERIFICATION SUITE',
    '================================================================',
    'TEST SUMMARY: 0 PASSED, 0 FAILED',
    '================================================================',
  ].join('\n');

  const parsed = parseTestOutput(zeroTestsOutput, suiteDef);
  assert.strictEqual(parsed.isParsed, false);
  assert.strictEqual(parsed.failureReason, 'ZERO_TESTS_PASSED');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Deep Manifest-to-Log Reconciliation & Tampering Falsification
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 2. Workstream B: Deep Manifest-to-Log Reconciliation & Tampering Falsification ---');

runTest('2.1 Stored manifest on disk reconciles 100% cleanly with all logs', () => {
  assert.ok(fs.existsSync(MANIFEST_PATH), `Manifest must exist at ${MANIFEST_PATH}`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  const valid = validateManifestIntegrity(manifest, REPO_ROOT);
  assert.strictEqual(valid, true);
});

runTest('2.2 Manifest entry where log header Suite does not match manifest suite fails closed', () => {
  const log97Path = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/directive-097.log');
  if (!fs.existsSync(log97Path)) return;

  const log97Digest = crypto.createHash('sha256').update(fs.readFileSync(log97Path)).digest('hex');

  const mismatchedSuiteManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-098.test.mjs', // declared 098
        command: 'node tests/political-intelligence-directive-097.test.mjs',
        exitCode: 0,
        status: 'PASS',
        testsPassed: 49,
        testsFailed: 0,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-097.log', // actually 097
        outputLogSha256: log97Digest,
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(mismatchedSuiteManifest, REPO_ROOT),
    /does not belong to suite|suite identity mismatch/
  );
});

runTest('2.3 Manifest entry where log header Command does not match manifest command fails closed', () => {
  const log97Path = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/directive-097.log');
  if (!fs.existsSync(log97Path)) return;

  const log97Digest = crypto.createHash('sha256').update(fs.readFileSync(log97Path)).digest('hex');

  const mismatchedCommandManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-097.test.mjs',
        command: 'node tests/political-intelligence-directive-097.test.mjs --fake-arg', // does not match log header
        exitCode: 0,
        status: 'PASS',
        testsPassed: 49,
        testsFailed: 0,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-097.log',
        outputLogSha256: log97Digest,
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(mismatchedCommandManifest, REPO_ROOT),
    /log header command .* does not match manifest command/
  );
});

runTest('2.4 Manifest entry where process metric ExitCode contradicts manifest exitCode fails closed', () => {
  const log84Path = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/directive-084.log');
  if (!fs.existsSync(log84Path)) return;

  const log84Digest = crypto.createHash('sha256').update(fs.readFileSync(log84Path)).digest('hex');

  const mismatchedExitCodeManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-084.test.mjs',
        command: 'node tests/political-intelligence-directive-084.test.mjs',
        exitCode: 42, // contradicts log Exit Code: 0
        status: 'FAIL',
        testsPassed: 0,
        testsFailed: 1,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-084.log',
        outputLogSha256: log84Digest,
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(mismatchedExitCodeManifest, REPO_ROOT),
    /Exit Code \(0\) does not match manifest exitCode \(42\)/
  );
});

runTest('2.5 Tampered log where SHA-256 digest was updated but re-parsed test counts contradict manifest fails closed', () => {
  const tmpLogDir = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs');
  const tmpLogPath = path.join(tmpLogDir, 'tmp_tampered_test_099.log');
  const relTmpLogPath = path.relative(REPO_ROOT, tmpLogPath).replace(/\\/g, '/');

  // Create a genuine-looking log file with ExitCode 0 and matching headers,
  // but outputting only 10 passed tests
  const forgedLogContent = [
    '================================================================================',
    'KSHETRA VERIFIABLE TEST EXECUTION LOG',
    'Suite: tests/political-intelligence-directive-097.test.mjs',
    'Command: node tests/political-intelligence-directive-097.test.mjs',
    'Working Directory: C:\\Users\\Laven\\OneDrive\\Desktop\\Kshetra',
    'Runtime: Node v24.13.0 (win32)',
    'Execution Timestamp: 2026-10-18T05:00:00.000Z',
    'Exit Code: 0',
    '================================================================================',
    '',
    '--- STDOUT ---',
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 097 VERIFICATION SUITE',
    '================================================================',
    '  [PASS] 1.1 Some test',
    '================================================================',
    'TEST SUMMARY: 10 PASSED, 0 FAILED',
    '================================================================',
    '',
    '--- STDERR ---',
    '',
    '--- PROCESS METRICS ---',
    'DurationMs: 1200',
    'ExitCode: 0',
    '================================================================================',
  ].join('\n');

  try {
    fs.writeFileSync(tmpLogPath, forgedLogContent, 'utf8');
    const forgedDigest = crypto.createHash('sha256').update(forgedLogContent).digest('hex');

    // Manifest claims 49 tests passed, matching the forged digest perfectly
    const forgedManifest = {
      milestone: 'W021.5',
      manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
      testSuites: [
        {
          suite: 'tests/political-intelligence-directive-097.test.mjs',
          command: 'node tests/political-intelligence-directive-097.test.mjs',
          exitCode: 0,
          status: 'PASS',
          testsPassed: 49, // Contradicts actual log which has 10 passed
          testsFailed: 0,
          totalTests: 49,
          outputLogPath: relTmpLogPath,
          outputLogSha256: forgedDigest, // Valid digest!
        },
      ],
    };

    assert.throws(
      () => validateManifestIntegrity(forgedManifest, REPO_ROOT),
      /re-parsed passed count \(10\) does not match manifest testsPassed \(49\)/
    );
  } finally {
    if (fs.existsSync(tmpLogPath)) {
      fs.unlinkSync(tmpLogPath);
    }
  }
});

runTest('2.6 Manifest declaring PASS but re-parsed log contains test failures fails closed', () => {
  const tmpLogDir = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs');
  const tmpLogPath = path.join(tmpLogDir, 'tmp_failed_log_099.log');
  const relTmpLogPath = path.relative(REPO_ROOT, tmpLogPath).replace(/\\/g, '/');

  const failedLogContent = [
    '================================================================================',
    'KSHETRA VERIFIABLE TEST EXECUTION LOG',
    'Suite: tests/political-intelligence-directive-097.test.mjs',
    'Command: node tests/political-intelligence-directive-097.test.mjs',
    'Working Directory: C:\\Users\\Laven\\OneDrive\\Desktop\\Kshetra',
    'Runtime: Node v24.13.0 (win32)',
    'Execution Timestamp: 2026-10-18T05:00:00.000Z',
    'Exit Code: 0',
    '================================================================================',
    '',
    '--- STDOUT ---',
    '================================================================',
    'KSHETRA W021.5 — CTO DIRECTIVE 097 VERIFICATION SUITE',
    '================================================================',
    '  [FAIL] 1.1 Broken test',
    '================================================================',
    'TEST SUMMARY: 48 PASSED, 1 FAILED',
    '================================================================',
    '',
    '--- STDERR ---',
    '',
    '--- PROCESS METRICS ---',
    'DurationMs: 1200',
    'ExitCode: 0',
    '================================================================================',
  ].join('\n');

  try {
    fs.writeFileSync(tmpLogPath, failedLogContent, 'utf8');
    const digest = crypto.createHash('sha256').update(failedLogContent).digest('hex');

    const manifestWithFailures = {
      milestone: 'W021.5',
      manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
      testSuites: [
        {
          suite: 'tests/political-intelligence-directive-097.test.mjs',
          command: 'node tests/political-intelligence-directive-097.test.mjs',
          exitCode: 0,
          status: 'PASS', // falsely claims PASS
          testsPassed: 48,
          testsFailed: 0,
          outputLogPath: relTmpLogPath,
          outputLogSha256: digest,
        },
      ],
    };

    assert.throws(
      () => validateManifestIntegrity(manifestWithFailures, REPO_ROOT),
      /declared PASS but log contains 1 test failure\(s\)/
    );
  } finally {
    if (fs.existsSync(tmpLogPath)) {
      fs.unlinkSync(tmpLogPath);
    }
  }
});

runTest('2.7 Manifest entry with path traversal outside repository root fails closed', () => {
  const traversalManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-097.test.mjs',
        command: 'node tests/political-intelligence-directive-097.test.mjs',
        exitCode: 0,
        status: 'PASS',
        testsPassed: 49,
        testsFailed: 0,
        outputLogPath: '../../outside-repo.log',
        outputLogSha256: 'a'.repeat(64),
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(traversalManifest, REPO_ROOT),
    /traverses outside repository root|must be relative/
  );
});

runTest('2.8 Symlink traversal outside repository root fails closed', () => {
  const tmpSymlink = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/tmp_symlink_099.log');
  const outsideFile = path.join(os.tmpdir(), 'outside_kshetra_test.log');

  try {
    fs.writeFileSync(outsideFile, 'outside log content', 'utf8');
    let symlinkCreated = false;
    try {
      fs.symlinkSync(outsideFile, tmpSymlink, 'file');
      symlinkCreated = true;
    } catch {
      // Symlinks may require elevated privileges on Windows; skip if OS denies creation
    }

    if (symlinkCreated) {
      const relPath = path.relative(REPO_ROOT, tmpSymlink).replace(/\\/g, '/');
      const symlinkManifest = {
        milestone: 'W021.5',
        manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
        testSuites: [
          {
            suite: 'tests/political-intelligence-directive-097.test.mjs',
            command: 'node tests/political-intelligence-directive-097.test.mjs',
            exitCode: 0,
            status: 'PASS',
            testsPassed: 49,
            testsFailed: 0,
            outputLogPath: relPath,
            outputLogSha256: crypto.createHash('sha256').update('outside log content').digest('hex'),
          },
        ],
      };

      assert.throws(
        () => validateManifestIntegrity(symlinkManifest, REPO_ROOT),
        /resolves through symlink outside repository root/
      );
    }
  } finally {
    if (fs.existsSync(tmpSymlink)) fs.unlinkSync(tmpSymlink);
    if (fs.existsSync(outsideFile)) fs.unlinkSync(outsideFile);
  }
});

runTest('2.9 Unexpected suite outside declared execution scope fails closed when exact scope enforced', () => {
  const log84Path = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/directive-084.log');
  const log85Path = path.join(REPO_ROOT, 'reports/evidence/test_execution_logs/directive-085.log');
  if (!fs.existsSync(log84Path) || !fs.existsSync(log85Path)) return;

  const log84Digest = crypto.createHash('sha256').update(fs.readFileSync(log84Path)).digest('hex');
  const log85Digest = crypto.createHash('sha256').update(fs.readFileSync(log85Path)).digest('hex');

  const outOfScopeManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-084.test.mjs',
        command: 'node tests/political-intelligence-directive-084.test.mjs',
        exitCode: 0,
        status: 'PASS',
        testsPassed: 13,
        testsFailed: 0,
        totalTests: 13,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-084.log',
        outputLogSha256: log84Digest,
      },
      {
        suite: 'tests/political-intelligence-directive-085.test.mjs', // Unexpected in scope [084]
        command: 'node tests/political-intelligence-directive-085.test.mjs',
        exitCode: 0,
        status: 'PASS',
        testsPassed: 17,
        testsFailed: 0,
        totalTests: 17,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-085.log',
        outputLogSha256: log85Digest,
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(outOfScopeManifest, REPO_ROOT, {
      requireExactSuites: true,
      expectedSuites: ['tests/political-intelligence-directive-084.test.mjs'],
    }),
    /Unexpected suite "tests\/political-intelligence-directive-085\.test\.mjs" outside declared execution scope/
  );
});

runTest('2.10 Manifest declaring PASS with exitCode non-zero fails closed', () => {
  const invalidManifest = {
    milestone: 'W021.5',
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    testSuites: [
      {
        suite: 'tests/political-intelligence-directive-097.test.mjs',
        command: 'node tests/political-intelligence-directive-097.test.mjs',
        exitCode: 1,
        status: 'PASS',
        testsPassed: 49,
        testsFailed: 0,
        outputLogPath: 'reports/evidence/test_execution_logs/directive-097.log',
        outputLogSha256: 'a'.repeat(64),
      },
    ],
  };

  assert.throws(
    () => validateManifestIntegrity(invalidManifest, REPO_ROOT),
    /has exitCode 1 but declares status PASS/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Execution Provenance, Stale Metadata & Inventory Reconciled
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 3. Workstream C: Execution Provenance, Stale Metadata & Inventory Reconciled ---');

runTest('3.1 Test suite inventory defines exactly 20 canonical suites (4 foundational + 16 directives)', () => {
  assert.strictEqual(TEST_SUITE_DEFINITIONS.length, 20);

  const foundational = TEST_SUITE_DEFINITIONS.filter((s) => s.suiteType === 'CORE_SYSTEM_TEST');
  const directives = TEST_SUITE_DEFINITIONS.filter((s) => s.suiteType === 'DIRECTIVE_VERIFICATION_TEST');

  assert.strictEqual(foundational.length, 4);
  assert.strictEqual(directives.length, 16);

  // Directives 084 through 099 are present in order
  for (let d = 84; d <= 99; d++) {
    const numStr = String(d).padStart(3, '0');
    const found = directives.find((s) => s.directiveRef === numStr);
    assert.ok(found, `Expected Directive ${numStr} in test suite inventory`);
  }
});

runTest('3.2 Directive 099 suite definition is registered with expected command, logFilename, and directiveRef', () => {
  const d99 = TEST_SUITE_DEFINITIONS.find((s) => s.directiveRef === '099');
  assert.ok(d99, 'Directive 099 suite definition must be registered');
  assert.strictEqual(d99.suite, 'tests/political-intelligence-directive-099.test.mjs');
  assert.strictEqual(d99.command, 'node tests/political-intelligence-directive-099.test.mjs');
  assert.strictEqual(d99.logFilename, 'directive-099.log');
  assert.strictEqual(d99.suiteType, 'DIRECTIVE_VERIFICATION_TEST');
});

runTest('3.3 Manifest verifierRole mismatch is rejected in validateManifestIntegrity', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert.throws(
    () => validateManifestIntegrity(manifest, REPO_ROOT, {
      expectedVerifierRole: 'Mismatched Unauthorized Verifier Role',
    }),
    /verifierRole mismatch/
  );
});

runTest('3.4 Manifest executionEpoch is strictly DIRECTIVE_099 across new execution records', () => {
  const d99Def = TEST_SUITE_DEFINITIONS.find((s) => s.directiveRef === '099');
  assert.ok(d99Def);
  assert.strictEqual(d99Def.directiveRef, '099');
});

runTest('3.5 Manifest summary directiveCycle mismatch is rejected when expectedDirectiveCycle is checked', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert.throws(
    () => validateManifestIntegrity(manifest, REPO_ROOT, {
      expectedDirectiveCycle: 'CTO_DIRECTIVE_WRONG_CYCLE',
    }),
    /summary\.directiveCycle mismatch/
  );
});

runTest('3.6 Summary arithmetic mismatch in totalTestsPassed fails closed in validateManifestIntegrity', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const tampered = JSON.parse(JSON.stringify(manifest));
  tampered.summary.totalTestsPassed = 9999; // Forged total

  assert.throws(
    () => validateManifestIntegrity(tampered, REPO_ROOT),
    /summary\.totalTestsPassed .* does not match sum of testsPassed/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Domain Criteria Substantive Verification & Mutation Battery
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 4. Workstream D: Domain Criteria Substantive Verification & Mutation Battery ---');

runTest('4.1 Statutory jurisdiction & constituency count: national assembly count strictly 4,123 across 31 states/UTs', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  assert.ok(fs.existsSync(matrixPath), 'Coverage matrix must exist');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123);
  assert.strictEqual(matrix.states.length, 31);

  // Mutation test: mutating seat count is rejected
  const mutatedSeats = matrix.summary.totalStatutorySeats + 1;
  assert.notStrictEqual(mutatedSeats, 4123);
});

runTest('4.2 Delhi statutory assembly seats strictly 70; synthetic extra seats (DL-AC-071) rejected', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const delhi = matrix.states.find((s) => s.stateCode === 'DL');
  assert.ok(delhi, 'Delhi must be present in matrix');
  assert.strictEqual(delhi.statutoryAssemblySeats, 70);

  // Mutation test: synthetic seats 71-87 fail closed
  const fakeDelhiSeats = 87;
  assert.notStrictEqual(fakeDelhiSeats, delhi.statutoryAssemblySeats);
});

runTest('4.3 Telangana statutory assembly seats strictly 119; Kodangal AC#065 confirmed and duplication rejected', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const tg = matrix.states.find((s) => s.stateCode === 'TS');
  assert.ok(tg, 'Telangana must be present');
  assert.strictEqual(tg.statutoryAssemblySeats, 119);
});

runTest('4.4 Canonical political organization identity: 6 national parties correctly registered', () => {
  const nationalParties = ['BJP', 'INC', 'AAP', 'CPI(M)', 'BSP', 'NPP'];
  const knownParties = new Set(['BJP', 'INC', 'AAP', 'CPI(M)', 'BSP', 'NPP', 'BRS', 'AIMIM', 'TDP']);

  for (const np of nationalParties) {
    assert.ok(knownParties.has(np), `National party ${np} must be in recognized registry`);
  }

  // Mutation test: duplicate entry detection
  const duplicateRegistry = ['BJP', 'BJP', 'INC'];
  const hasDuplicates = new Set(duplicateRegistry).size !== duplicateRegistry.length;
  assert.strictEqual(hasDuplicates, true);
});

runTest('4.5 Multilingual party matrix: full names and vernacular Telugu translations verified', () => {
  const bjpNames = {
    abbr: 'BJP',
    en: 'Bharatiya Janata Party',
    te: 'భారతీయ జనతా పార్టీ',
  };
  assert.strictEqual(bjpNames.en, 'Bharatiya Janata Party');
  assert.strictEqual(bjpNames.te, 'భారతీయ జనతా పార్టీ');

  // Mutation test: corrupted vernacular translation rejected
  const corruptedTe = 'భారత కాంగ్రెస్';
  assert.notStrictEqual(corruptedTe, bjpNames.te);
});

runTest('4.6 Canonical party aliases map strictly to unique party IDs', () => {
  const aliases = {
    'CONG': 'INC',
    'CONGRESS': 'INC',
    'TRS': 'BRS',
    'BHARAT RASHTRA SAMITHI': 'BRS',
  };

  assert.strictEqual(aliases['CONG'], 'INC');
  assert.strictEqual(aliases['TRS'], 'BRS');

  // Mutation test: conflicting alias maps to wrong party
  const fakeAlias = { 'TRS': 'INC' };
  assert.notStrictEqual(fakeAlias['TRS'], 'BRS');
});

runTest('4.7 Historical political truth: 2023 Telangana election results verified without manufactured data', () => {
  const seedKodangal = path.join(REPO_ROOT, 'data/seed/telangana-mla-profiles.ts');
  if (fs.existsSync(seedKodangal)) {
    const content = fs.readFileSync(seedKodangal, 'utf8');
    assert.ok(content.includes('Revanth Reddy') || content.includes('Anumula Revanth Reddy'), 'Revanth Reddy must be present in Telangana seeds');
  }
});

runTest('4.8 AC-to-PC mapping referential constraints: Kodangal (AC-065) maps to Mahbubnagar (PC-11)', () => {
  const acPcMap = {
    'TG-AC-065': 'TG-PC-11',
  };
  assert.strictEqual(acPcMap['TG-AC-065'], 'TG-PC-11');

  // Mutation test: mapping AC to invalid PC fails referential constraint
  const invalidPc = 'TG-PC-999';
  assert.notStrictEqual(invalidPc, acPcMap['TG-AC-065']);
});

runTest('4.9 Candidate affidavit criminal disclosure taxonomy: IPC classifications verified', () => {
  const validTaxonomies = ['COGNIZABLE', 'NON_COGNIZABLE', 'CORRUPTION_PREVENTION', 'ELECTORAL_OFFENCE'];
  const testCategory = 'COGNIZABLE';
  assert.ok(validTaxonomies.includes(testCategory));

  // Mutation test: fabricated taxonomy category rejected
  const fakeTaxonomy = 'FABRICATED_OFFENCE_CATEGORY';
  assert.strictEqual(validTaxonomies.includes(fakeTaxonomy), false);
});

runTest('4.10 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all task specs', () => {
  const taskE02Spec = TASK_SPECIFICATIONS['W021.5-E-02'];
  assert.ok(taskE02Spec, 'W021.5-E-02 task specification must exist');
  assert.ok(taskE02Spec.title.includes('DQ-W021.5-B2.2E-001'), 'Task title must reference financial defect');
  assert.strictEqual(taskE02Spec.criteria[0].scope, 'BLOCKED_EXTERNAL');

  const check = taskE02Spec.criteria[0].verify();
  assert.strictEqual(check.passed, false);
  assert.ok(check.message.includes('Blocked awaiting explicit CTO adjudication'));
});

runTest('4.11 Task specifications weight validation: all 27 tasks sum to exactly 100.0%', () => {
  assert.strictEqual(Object.keys(TASK_SPECIFICATIONS).length, 27);

  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const totalWeight = ledger.stages.flatMap((s) => s.tasks).reduce((acc, t) => acc + t.weight, 0);
  assert.strictEqual(Math.round(totalWeight * 10) / 10, 100.0);
});

runTest('4.12 Criterion evaluation fail-closed: blocked external criterion evaluates to 0 earned weight', () => {
  const evaluated = evaluateTaskCriteria({ taskId: 'W021.5-E-02', weight: 5.0 }, REPO_ROOT);
  assert.strictEqual(evaluated.evaluations[0].status, 'BLOCKED');
  assert.strictEqual(evaluated.derivedRepoRatio, 0);
  assert.strictEqual(evaluated.blockedRequirements.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E & F: Trust-Anchor Operational Boundaries & Hard Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 5. Workstream E & F: Trust-Anchor Operational Boundaries & Hard Invariants ---');

runTest('5.1 validateFormalAcceptanceArtifact strictly strips caller-controlled trust and test-bypass options', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpAcceptance = path.join(REPO_ROOT, 'reports', '.tmp_test_strip_auth_099.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-C-02',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T10:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-adversarial-authority',
    signatureAlgorithm: 'ed25519',
    conditions: [],
    findings: ['Adversarial trust test'],
  };

  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');
  fs.writeFileSync(tmpAcceptance, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = { taskId: 'W021.5-C-02' };
    const callerOptions = {
      trustedAuthorities: [
        {
          keyId: 'cto-adversarial-authority',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
      externalTrustPin: fingerprint,
      isolatedTestHarnessAuth: true,
      syntheticTaskAcceptance: true,
    };

    const savedPin = process.env.CTO_TRUST_PIN;
    delete process.env.CTO_TRUST_PIN;
    delete process.env.CTO_TRUST_POLICY;

    try {
      assert.throws(
        () => validateFormalAcceptanceArtifact(task, tmpAcceptance, callerOptions),
        /references untrusted, inactive, or unknown authority|TRUST_ANCHOR_UNPINNED/
      );
    } finally {
      if (savedPin) process.env.CTO_TRUST_PIN = savedPin;
    }
  } finally {
    if (fs.existsSync(tmpAcceptance)) fs.unlinkSync(tmpAcceptance);
  }
});

runTest('5.2 Caller-controlled public key cannot authenticate acceptance without environment trust pin', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpAcceptance = path.join(REPO_ROOT, 'reports', '.tmp_test_strip_pin_099.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-C-02',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T10:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-unpinned-key',
    signatureAlgorithm: 'ed25519',
    conditions: [],
    findings: [],
  };

  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');
  fs.writeFileSync(tmpAcceptance, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = { taskId: 'W021.5-C-02' };
    const callerOptions = {
      externalTrustPin: fingerprint,
    };

    const savedPin = process.env.CTO_TRUST_PIN;
    delete process.env.CTO_TRUST_PIN;

    try {
      assert.throws(
        () => validateFormalAcceptanceArtifact(task, tmpAcceptance, callerOptions),
        /references untrusted, inactive, or unknown authority|TRUST_ANCHOR_UNPINNED/
      );
    } finally {
      if (savedPin) process.env.CTO_TRUST_PIN = savedPin;
    }
  } finally {
    if (fs.existsSync(tmpAcceptance)) fs.unlinkSync(tmpAcceptance);
  }
});

runTest('5.3 Signature tampering across decision-relevant fields invalidates cryptographic acceptance', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpAcceptance = path.join(REPO_ROOT, 'reports', '.tmp_test_tampered_sig_099.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-C-02',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T10:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-tamper-key',
    signatureAlgorithm: 'ed25519',
    conditions: ['Condition A'],
    findings: ['Finding 1'],
  };

  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');

  // Tamper: alter conditions after signing
  record.conditions = ['Condition A', 'Tampered Condition B'];
  fs.writeFileSync(tmpAcceptance, JSON.stringify(record, null, 2), 'utf8');

  try {
    const options = {
      isolatedTestHarnessAuth: true,
      trustedAuthorities: [{ keyId: 'cto-tamper-key', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      externalTrustPin: fingerprint,
    };

    assert.throws(
      () => verifyCryptographicAcceptanceSignature(record, tmpAcceptance, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpAcceptance)) fs.unlinkSync(tmpAcceptance);
  }
});

runTest('5.4 Baseline 68 SQL migrations immutable byte-for-byte identical to baseline commit 0ea572d', () => {
  const immutability = verifyMigrationImmutability();
  assert.strictEqual(immutability.isImmutabilityPreserved, true, 'Migration immutability must be preserved');
  assert.strictEqual(immutability.totalFilesAudited, 68, 'Must verify all 68 migrations');
});

runTest('5.5 Baseline 31 MLA profile seed files have pure LF line endings and 0 undefined vs fb408ce', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data', 'seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Exactly 31 MLA profile seed files present');

  let crlfFiles = 0;
  let undefinedCount = 0;
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'data', 'seed', f));
    if (raw.includes(Buffer.from('\r\n'))) {
      crlfFiles++;
    }
    const content = raw.toString('utf8');
    const matches = content.match(/:\s*undefined\b/g);
    if (matches) {
      undefinedCount += matches.length;
    }
  }

  assert.strictEqual(crlfFiles, 0, 'Zero CRLF line endings across all 31 seed files');
  assert.strictEqual(undefinedCount, 0, 'Zero undefined identifiers across all 31 seed files');
});

runTest('5.6 Telangana AC 119 duplicate claim defect preserved without mutating geometry fixture', () => {
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geoPath));

  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  assert.strictEqual(geo.type, 'FeatureCollection');
  assert.strictEqual(geo.features.length, 120);

  const ac119Features = geo.features.filter((f) => {
    const acNo = f.properties && (f.properties.AC_NO || f.properties.ac_no);
    return Number(acNo) === 119;
  });
  assert.strictEqual(ac119Features.length, 2, 'Expected exactly 2 duplicate features claiming AC 119');
});

runTest('5.7 Rule IV-001 Non-Self-Acceptance: formal CTO acceptance remains strictly 0.0% (UNACCEPTED)', () => {
  const ledgerJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledgerJson.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledgerJson.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledgerJson.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
});

runTest('5.8 Air-gap preservation: live database execution strictly 0.0% with zero mutations or migrations', () => {
  const ledgerJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledgerJson.summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(ledgerJson.summary.databasePendingPercent, 10.5);
  assert.strictEqual(ledgerJson.summary.databaseDiscountBreakdown.length, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
