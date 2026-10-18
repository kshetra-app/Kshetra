#!/usr/bin/env node

/**
 * scripts/capture_test_execution.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 098
 * Fail-Closed, Traceable & Truthful Test Execution Capture Harness
 *
 * Executes offline verification commands directly, captures structured stdout/stderr,
 * verifies positive execution and suite identity, computes cryptographic SHA-256 digests,
 * and generates an auditable test execution manifest linking every claim to immutable evidence.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const LOGS_DIR = path.join(REPO_ROOT, 'reports', 'evidence', 'test_execution_logs');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'reports', 'w021_5_test_execution_manifest.json');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export const TEST_SUITE_DEFINITIONS = [
  // 4 Core Component Test Suites
  {
    suite: 'apps/api/src/__tests__/election-truth-contracts.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/election-truth-contracts.test.ts',
    logFilename: 'api-election-truth-contracts.log',
    suiteType: 'CORE_SYSTEM_TEST',
    directiveRef: null,
    shell: true,
  },
  {
    suite: 'apps/api/src/__tests__/constituencies.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/constituencies.test.ts',
    logFilename: 'api-constituencies.log',
    suiteType: 'CORE_SYSTEM_TEST',
    directiveRef: null,
    shell: true,
  },
  {
    suite: 'apps/api/src/__tests__/observability.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/observability.test.ts',
    logFilename: 'api-observability.log',
    suiteType: 'CORE_SYSTEM_TEST',
    directiveRef: null,
    shell: true,
  },
  {
    suite: 'apps/mobile/__tests__/political-intelligence-journey.test.ts',
    command: 'npm test --prefix apps/mobile -- __tests__/political-intelligence-journey.test.ts',
    logFilename: 'mobile-political-intelligence-journey.log',
    suiteType: 'CORE_SYSTEM_TEST',
    directiveRef: null,
    shell: true,
  },
  // 15 Directive Regression & Verification Suites (Directives 084 through 098)
  {
    suite: 'tests/political-intelligence-directive-084.test.mjs',
    command: 'node tests/political-intelligence-directive-084.test.mjs',
    logFilename: 'directive-084.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '084',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-085.test.mjs',
    command: 'node tests/political-intelligence-directive-085.test.mjs',
    logFilename: 'directive-085.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '085',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-086.test.mjs',
    command: 'node tests/political-intelligence-directive-086.test.mjs',
    logFilename: 'directive-086.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '086',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-087.test.mjs',
    command: 'node tests/political-intelligence-directive-087.test.mjs',
    logFilename: 'directive-087.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '087',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-088.test.mjs',
    command: 'node tests/political-intelligence-directive-088.test.mjs',
    logFilename: 'directive-088.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '088',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-089.test.mjs',
    command: 'node tests/political-intelligence-directive-089.test.mjs',
    logFilename: 'directive-089.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '089',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-090.test.mjs',
    command: 'node tests/political-intelligence-directive-090.test.mjs',
    logFilename: 'directive-090.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '090',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-091.test.mjs',
    command: 'node tests/political-intelligence-directive-091.test.mjs',
    logFilename: 'directive-091.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '091',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-092.test.mjs',
    command: 'node tests/political-intelligence-directive-092.test.mjs',
    logFilename: 'directive-092.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '092',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-093.test.mjs',
    command: 'node tests/political-intelligence-directive-093.test.mjs',
    logFilename: 'directive-093.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '093',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-094.test.mjs',
    command: 'node tests/political-intelligence-directive-094.test.mjs',
    logFilename: 'directive-094.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '094',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-095.test.mjs',
    command: 'node tests/political-intelligence-directive-095.test.mjs',
    logFilename: 'directive-095.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '095',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-096.test.mjs',
    command: 'node tests/political-intelligence-directive-096.test.mjs',
    logFilename: 'directive-096.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '096',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-097.test.mjs',
    command: 'node tests/political-intelligence-directive-097.test.mjs',
    logFilename: 'directive-097.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '097',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-098.test.mjs',
    command: 'node tests/political-intelligence-directive-098.test.mjs',
    logFilename: 'directive-098.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '098',
    shell: true,
  },
];

/**
 * Fail-Closed Test Output Parser
 *
 * Evaluates raw process output against known test runner patterns.
 * Distinguishes:
 * - tests passed / tests failed
 * - empty output (EMPTY_OUTPUT)
 * - no tests discovered (NO_TESTS_DISCOVERED)
 * - unrecognized format (UNPARSED_OUTPUT_FORMAT)
 * - zero tests passed (ZERO_TESTS_PASSED)
 * - suite identity mismatch (SUITE_IDENTITY_MISMATCH)
 */
export function parseTestOutput(rawOutput, suiteDef = null) {
  if (!rawOutput || typeof rawOutput !== 'string' || rawOutput.trim().length === 0) {
    return {
      isParsed: false,
      failureReason: 'EMPTY_OUTPUT',
      passed: 0,
      failed: 0,
      suitesPassed: 0,
      totalTests: 0,
      runnerFormat: null,
    };
  }

  // 1. Detect explicit runner-level "no tests discovered" or "no tests found"
  if (/^(?:No tests found|No test files found|Zero tests executed|No tests discovered|Ran 0 test suites)\b/im.test(rawOutput) ||
      /(?:Jest:\s*No tests found|npm ERR!.*no tests)/i.test(rawOutput)) {
    return {
      isParsed: false,
      failureReason: 'NO_TESTS_DISCOVERED',
      passed: 0,
      failed: 0,
      suitesPassed: 0,
      totalTests: 0,
      runnerFormat: 'EMPTY_RUN',
    };
  }

  let passed = 0;
  let failed = 0;
  let suitesPassed = 0;
  let runnerFormat = null;
  let matched = false;

  // 2. Try Jest format: Tests: 24 passed, 24 total
  const jestTestsMatch = rawOutput.match(/Tests:\s+([0-9]+)\s+passed(?:,\s+([0-9]+)\s+failed)?/i);
  const jestSuitesMatch = rawOutput.match(/Test Suites:\s+([0-9]+)\s+passed/i);
  if (jestTestsMatch) {
    passed = parseInt(jestTestsMatch[1], 10);
    failed = jestTestsMatch[2] ? parseInt(jestTestsMatch[2], 10) : 0;
    suitesPassed = jestSuitesMatch ? parseInt(jestSuitesMatch[1], 10) : (failed === 0 && passed > 0 ? 1 : 0);
    runnerFormat = 'JEST';
    matched = true;
  }

  // 3. Try custom summary format: VERIFICATION SUMMARY: X PASSED, Y FAILED or TEST SUMMARY: X PASSED, Y FAILED
  if (!matched) {
    const customMatch = rawOutput.match(/(?:VERIFICATION|TEST)\s+SUMMARY:\s+([0-9]+)\s+PASSED,\s+([0-9]+)\s+FAILED/i);
    if (customMatch) {
      passed = parseInt(customMatch[1], 10);
      failed = parseInt(customMatch[2], 10);
      suitesPassed = failed === 0 && passed > 0 ? 1 : 0;
      runnerFormat = 'CUSTOM_SUMMARY';
      matched = true;
    }
  }

  // 4. If neither format matched, fail closed with UNPARSED_OUTPUT_FORMAT
  if (!matched) {
    return {
      isParsed: false,
      failureReason: 'UNPARSED_OUTPUT_FORMAT',
      passed: 0,
      failed: 0,
      suitesPassed: 0,
      totalTests: 0,
      runnerFormat: null,
    };
  }

  const totalTests = passed + failed;

  // 5. Zero tests passed is a failure
  if (passed === 0) {
    return {
      isParsed: false,
      failureReason: failed > 0 ? 'TESTS_FAILED' : 'ZERO_TESTS_PASSED',
      passed,
      failed,
      suitesPassed,
      totalTests,
      runnerFormat,
    };
  }

  // 6. Positive evidence that the intended test suite actually ran
  if (suiteDef && suiteDef.suite) {
    const suiteBasename = path.basename(suiteDef.suite);
    const suiteNameWithoutExt = suiteBasename.replace(/\.(test|spec)\.(ts|js|mjs)$/, '');
    let identityMatched = rawOutput.includes(suiteBasename) || rawOutput.includes(suiteNameWithoutExt);

    if (!identityMatched && suiteDef.directiveRef) {
      const directiveNum = parseInt(suiteDef.directiveRef, 10);
      const directiveRegex = new RegExp(`DIRECTIVE\\s+0*${directiveNum}\\b`, 'i');
      if (directiveRegex.test(rawOutput)) {
        identityMatched = true;
      }
    } else if (!identityMatched) {
      const m = suiteDef.suite.match(/directive-0?(\d+)/i);
      if (m) {
        const directiveNum = parseInt(m[1], 10);
        const directiveRegex = new RegExp(`DIRECTIVE\\s+0*${directiveNum}\\b`, 'i');
        if (directiveRegex.test(rawOutput)) {
          identityMatched = true;
        }
      }
    }

    if (!identityMatched) {
      return {
        isParsed: false,
        failureReason: 'SUITE_IDENTITY_MISMATCH',
        passed,
        failed,
        suitesPassed,
        totalTests,
        runnerFormat,
      };
    }
  }

  return {
    isParsed: true,
    failureReason: null,
    passed,
    failed,
    suitesPassed,
    totalTests,
    runnerFormat,
  };
}

// Backward-compatibility alias
export const parseJestOutput = parseTestOutput;

/**
 * Executes a test suite command and captures structured, verifiable logs and digests.
 */
export function runSuiteAndCapture(suiteDef) {
  console.log(`Executing: ${suiteDef.command}`);
  const startTime = Date.now();

  let spawnError = null;
  let result = null;
  try {
    result = spawnSync(suiteDef.command, {
      cwd: REPO_ROOT,
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result && result.error) {
      spawnError = result.error;
    }
  } catch (err) {
    spawnError = err;
  }

  const durationMs = Date.now() - startTime;
  const stdout = (result && result.stdout) || '';
  const stderr = (result && result.stderr) || '';
  const exitCode = spawnError ? 1 : (result ? (result.status ?? (result.signal ? 128 : 1)) : 1);

  // Deterministic combined log with explicit section markers
  const logContent = [
    '================================================================================',
    'KSHETRA VERIFIABLE TEST EXECUTION LOG',
    `Suite: ${suiteDef.suite}`,
    `Command: ${suiteDef.command}`,
    `Working Directory: ${REPO_ROOT}`,
    `Runtime: Node ${process.version} (${process.platform})`,
    `Execution Timestamp: ${new Date().toISOString()}`,
    `Exit Code: ${exitCode}`,
    '================================================================================',
    '',
    '--- STDOUT ---',
    stdout,
    '',
    '--- STDERR ---',
    stderr,
    '',
    '--- PROCESS METRICS ---',
    `DurationMs: ${durationMs}`,
    `ExitCode: ${exitCode}`,
    spawnError ? `SpawnError: ${spawnError.message}` : null,
    '================================================================================',
    '',
  ].filter((line) => line !== null).join('\n');

  const logPath = path.join(LOGS_DIR, suiteDef.logFilename);
  fs.writeFileSync(logPath, logContent, 'utf8');

  const sha256 = crypto.createHash('sha256').update(logContent, 'utf8').digest('hex');
  const relLogPath = path.relative(REPO_ROOT, logPath).replace(/\\/g, '/');

  if (spawnError) {
    return {
      suite: suiteDef.suite,
      command: suiteDef.command,
      exitCode: exitCode,
      status: 'FAIL',
      failureReason: `COMMAND_SPAWN_FAILED: ${spawnError.message}`,
      suitesPassed: 0,
      testsPassed: 0,
      testsFailed: 1,
      totalTests: 1,
      durationMs: durationMs,
      runnerFormat: null,
      suiteType: suiteDef.suiteType || 'CORE_SYSTEM_TEST',
      directiveRef: suiteDef.directiveRef || null,
      evidenceClass: 'REPOSITORY_IMPLEMENTATION',
      executedInCurrentDelivery: true,
      evidenceType: 'DIRECT_EXECUTION_CAPTURE',
      executionEpoch: 'DIRECTIVE_098',
      outputLogPath: relLogPath,
      outputLogSha256: sha256,
    };
  }

  const combinedOutputForParsing = stdout + '\n' + stderr;
  const parsed = parseTestOutput(combinedOutputForParsing, suiteDef);

  let status = 'FAIL';
  let failureReason = null;

  if (exitCode !== 0) {
    status = 'FAIL';
    failureReason = parsed.failed > 0 ? 'TESTS_FAILED' : (parsed.failureReason || 'PROCESS_EXIT_NON_ZERO');
  } else if (!parsed.isParsed) {
    status = 'FAIL';
    failureReason = parsed.failureReason;
  } else if (parsed.failed > 0) {
    status = 'FAIL';
    failureReason = 'TESTS_FAILED';
  } else if (parsed.passed === 0) {
    status = 'FAIL';
    failureReason = 'ZERO_TESTS_PASSED';
  } else {
    status = 'PASS';
    failureReason = null;
  }

  return {
    suite: suiteDef.suite,
    command: suiteDef.command,
    exitCode: exitCode,
    status: status,
    failureReason: failureReason,
    suitesPassed: parsed.suitesPassed || (status === 'PASS' ? 1 : 0),
    testsPassed: parsed.passed,
    testsFailed: parsed.failed + (status === 'FAIL' && parsed.failed === 0 ? 1 : 0),
    totalTests: parsed.totalTests,
    durationMs: durationMs,
    runnerFormat: parsed.runnerFormat,
    suiteType: suiteDef.suiteType || 'CORE_SYSTEM_TEST',
    directiveRef: suiteDef.directiveRef || null,
    evidenceClass: 'REPOSITORY_IMPLEMENTATION',
    executedInCurrentDelivery: true,
    evidenceType: 'DIRECT_EXECUTION_CAPTURE',
    executionEpoch: 'DIRECTIVE_098',
    outputLogPath: relLogPath,
    outputLogSha256: sha256,
  };
}

/**
 * Runs all defined test suites, writing manifest and logs incrementally.
 */
export function captureAllSuites(additionalSuites = []) {
  const suites = [...TEST_SUITE_DEFINITIONS, ...additionalSuites];

  let manifest = {
    milestone: 'W021.5',
    generatedAt: new Date().toISOString(),
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    verifierRole: 'CTO Directive 098 Test Execution Verifier',
    executionScope: 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      offlineRepositoryOnly: true,
    },
    testSuites: [],
    summary: {
      totalSuites: 0,
      passedSuites: 0,
      failedSuites: 0,
      totalTestsPassed: 0,
      totalTestsFailed: 0,
      allSuitesPassed: false,
      executionScope: 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY',
      directiveCycle: 'CTO_DIRECTIVE_098',
    },
  };

  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      if (Array.isArray(existing.testSuites)) {
        manifest = existing;
      }
    } catch {
      // ignore
    }
  }

  let totalFailedSuites = 0;

  for (const suiteDef of suites) {
    const res = runSuiteAndCapture(suiteDef);
    console.log(`  -> ${res.suite}: ${res.status} (Passed: ${res.testsPassed}, Failed: ${res.testsFailed}, Exit: ${res.exitCode}${res.failureReason ? ', Reason: ' + res.failureReason : ''})`);

    if (res.status !== 'PASS' || res.exitCode !== 0) {
      totalFailedSuites++;
    }

    const existingIdx = manifest.testSuites.findIndex((s) => s.suite === res.suite);
    if (existingIdx >= 0) {
      manifest.testSuites[existingIdx] = res;
    } else {
      manifest.testSuites.push(res);
    }

    // Recompute manifest summary
    let sumPassed = 0;
    let sumFailed = 0;
    let countPassedSuites = 0;
    let countFailedSuites = 0;
    for (const s of manifest.testSuites) {
      sumPassed += s.testsPassed || 0;
      sumFailed += s.testsFailed || 0;
      if (s.status === 'PASS' && s.exitCode === 0) {
        countPassedSuites++;
      } else {
        countFailedSuites++;
      }
    }

    manifest.generatedAt = new Date().toISOString();
    manifest.summary = {
      totalSuites: manifest.testSuites.length,
      passedSuites: countPassedSuites,
      failedSuites: countFailedSuites,
      totalTestsPassed: sumPassed,
      totalTestsFailed: sumFailed,
      allSuitesPassed: countFailedSuites === 0,
      executionScope: 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY',
      directiveCycle: 'CTO_DIRECTIVE_098',
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  console.log(`\nManifest written to: ${MANIFEST_PATH}`);
  console.log(`Summary: ${manifest.summary.passedSuites}/${manifest.summary.totalSuites} suites passed, ${manifest.summary.totalTestsPassed} total tests passed.`);

  return { manifest, hasFailures: totalFailedSuites > 0 };
}

/**
 * Deterministically validates the integrity of a test execution manifest against disk evidence.
 */
export function validateManifestIntegrity(manifest, repoRoot = REPO_ROOT, options = {}) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest validation error: Manifest is null or not an object.');
  }

  if (manifest.milestone !== 'W021.5') {
    throw new Error(`Manifest validation error: Invalid milestone "${manifest.milestone}". Expected "W021.5".`);
  }

  if (!Array.isArray(manifest.testSuites) || manifest.testSuites.length === 0) {
    throw new Error('Manifest validation error: testSuites is missing or empty.');
  }

  const seenSuites = new Set();
  let calculatedPassedSuites = 0;
  let calculatedFailedSuites = 0;
  let calculatedTestsPassed = 0;
  let calculatedTestsFailed = 0;

  for (let i = 0; i < manifest.testSuites.length; i++) {
    const entry = manifest.testSuites[i];
    if (!entry.suite || typeof entry.suite !== 'string') {
      throw new Error(`Manifest validation error: Entry at index ${i} lacks valid suite identifier.`);
    }

    if (seenSuites.has(entry.suite)) {
      throw new Error(`Manifest validation error: Duplicate suite entry detected: "${entry.suite}".`);
    }
    seenSuites.add(entry.suite);

    if (typeof entry.exitCode !== 'number') {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" lacks numeric exitCode.`);
    }

    if (!['PASS', 'FAIL'].includes(entry.status)) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" has invalid status "${entry.status}".`);
    }

    if (entry.exitCode !== 0 && entry.status === 'PASS') {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" has exitCode ${entry.exitCode} but declares status PASS.`);
    }

    if (entry.status === 'PASS' && (entry.testsPassed <= 0 || entry.testsFailed > 0)) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" declared PASS with testsPassed=${entry.testsPassed}, testsFailed=${entry.testsFailed}.`);
    }

    if (!entry.outputLogPath || typeof entry.outputLogPath !== 'string') {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" lacks outputLogPath.`);
    }

    if (!entry.outputLogSha256 || !/^[0-9a-fA-F]{64}$/.test(entry.outputLogSha256)) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" lacks valid SHA-256 digest.`);
    }

    const absLogPath = path.resolve(repoRoot, entry.outputLogPath);
    if (!fs.existsSync(absLogPath)) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" output log file does not exist on disk: "${entry.outputLogPath}".`);
    }

    const logContent = fs.readFileSync(absLogPath, 'utf8');
    const actualDigest = crypto.createHash('sha256').update(logContent, 'utf8').digest('hex');

    if (actualDigest.toLowerCase() !== entry.outputLogSha256.toLowerCase()) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" output log digest mismatch. Recorded: ${entry.outputLogSha256}, Actual: ${actualDigest}.`);
    }

    // Verify log content binds to this entry (prevents pointing to another suite's log)
    const suiteBasename = path.basename(entry.suite);
    const suiteNameWithoutExt = suiteBasename.replace(/\.(test|spec)\.(ts|js|mjs)$/, '');
    const hasHeaderSuite = new RegExp(`^Suite:\\s+${entry.suite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(logContent);
    const hasBasename = logContent.includes(suiteBasename) || logContent.includes(suiteNameWithoutExt);
    const m = entry.suite.match(/directive-0?(\d+)/i);
    const hasDirectiveMatch = m && new RegExp(`DIRECTIVE\\s+0*${parseInt(m[1], 10)}\\b`, 'i').test(logContent);

    if (!hasHeaderSuite && !hasBasename && !hasDirectiveMatch) {
      throw new Error(`Manifest validation error: Log file "${entry.outputLogPath}" does not belong to suite "${entry.suite}" (suite identity mismatch in log header).`);
    }

    if (entry.status === 'PASS') {
      calculatedPassedSuites++;
    } else {
      calculatedFailedSuites++;
    }

    calculatedTestsPassed += entry.testsPassed || 0;
    calculatedTestsFailed += entry.testsFailed || 0;
  }

  if (options.expectedSuites && Array.isArray(options.expectedSuites)) {
    for (const expected of options.expectedSuites) {
      if (!seenSuites.has(expected)) {
        throw new Error(`Manifest validation error: Expected suite "${expected}" is missing from manifest.`);
      }
    }
  }

  // Verify summary matches arithmetic totals
  if (manifest.summary) {
    if (manifest.summary.totalSuites !== manifest.testSuites.length) {
      throw new Error(`Manifest validation error: summary.totalSuites (${manifest.summary.totalSuites}) does not match testSuites length (${manifest.testSuites.length}).`);
    }
    if (manifest.summary.passedSuites !== calculatedPassedSuites) {
      throw new Error(`Manifest validation error: summary.passedSuites (${manifest.summary.passedSuites}) does not match calculated passed suites (${calculatedPassedSuites}).`);
    }
    if (manifest.summary.failedSuites !== calculatedFailedSuites) {
      throw new Error(`Manifest validation error: summary.failedSuites (${manifest.summary.failedSuites}) does not match calculated failed suites (${calculatedFailedSuites}).`);
    }
    if (manifest.summary.totalTestsPassed !== calculatedTestsPassed) {
      throw new Error(`Manifest validation error: summary.totalTestsPassed (${manifest.summary.totalTestsPassed}) does not match sum of testsPassed (${calculatedTestsPassed}).`);
    }
    if (manifest.summary.totalTestsFailed !== calculatedTestsFailed) {
      throw new Error(`Manifest validation error: summary.totalTestsFailed (${manifest.summary.totalTestsFailed}) does not match sum of testsFailed (${calculatedTestsFailed}).`);
    }
  }

  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { hasFailures } = captureAllSuites();
  if (hasFailures) {
    process.exit(1);
  }
}
