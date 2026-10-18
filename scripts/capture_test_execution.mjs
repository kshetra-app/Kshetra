#!/usr/bin/env node

/**
 * scripts/capture_test_execution.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 097
 * Traceable & Truthful Test Execution Capture Harness
 *
 * Runs offline verification commands directly, captures raw UTF-8 execution
 * logs, computes cryptographic SHA-256 digests, and generates an auditable
 * test execution manifest linking every claim to immutable on-disk evidence.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const LOGS_DIR = path.join(REPO_ROOT, 'reports', 'evidence', 'test_execution_logs');
const MANIFEST_PATH = path.join(REPO_ROOT, 'reports', 'w021_5_test_execution_manifest.json');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export const TEST_SUITE_DEFINITIONS = [
  {
    suite: 'apps/api/src/__tests__/election-truth-contracts.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/election-truth-contracts.test.ts',
    logFilename: 'api-election-truth-contracts.log',
    shell: true,
  },
  {
    suite: 'apps/api/src/__tests__/constituencies.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/constituencies.test.ts',
    logFilename: 'api-constituencies.log',
    shell: true,
  },
  {
    suite: 'apps/api/src/__tests__/observability.test.ts',
    command: 'npm test --prefix apps/api -- src/__tests__/observability.test.ts',
    logFilename: 'api-observability.log',
    shell: true,
  },
  {
    suite: 'apps/mobile/__tests__/political-intelligence-journey.test.ts',
    command: 'npm test --prefix apps/mobile -- __tests__/political-intelligence-journey.test.ts',
    logFilename: 'mobile-political-intelligence-journey.log',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-096.test.mjs',
    command: 'node tests/political-intelligence-directive-096.test.mjs',
    logFilename: 'directive-096.log',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-097.test.mjs',
    command: 'node tests/political-intelligence-directive-097.test.mjs',
    logFilename: 'directive-097.log',
    shell: true,
  },
];

export function parseJestOutput(rawOutput) {
  let passed = 0;
  let failed = 0;
  let suitesPassed = 0;

  // Match: Tests:       24 passed, 24 total
  const testsMatch = rawOutput.match(/Tests:\s+([0-9]+)\s+passed(?:,\s+([0-9]+)\s+failed)?/i);
  if (testsMatch) {
    passed = parseInt(testsMatch[1], 10);
    failed = testsMatch[2] ? parseInt(testsMatch[2], 10) : 0;
  }

  // Match: Test Suites: 1 passed, 1 total
  const suitesMatch = rawOutput.match(/Test Suites:\s+([0-9]+)\s+passed/i);
  if (suitesMatch) {
    suitesPassed = parseInt(suitesMatch[1], 10);
  }

  // Fallback for custom runners (e.g. Directive tests): VERIFICATION SUMMARY: 59 PASSED, 0 FAILED
  const customMatch = rawOutput.match(/VERIFICATION SUMMARY:\s+([0-9]+)\s+PASSED,\s+([0-9]+)\s+FAILED/i);
  if (customMatch) {
    passed = parseInt(customMatch[1], 10);
    failed = parseInt(customMatch[2], 10);
    suitesPassed = failed === 0 ? 1 : 0;
  }

  return { passed, failed, suitesPassed };
}

export function runSuiteAndCapture(suiteDef) {
  console.log(`Executing: ${suiteDef.command}`);
  const startTime = Date.now();

  const result = spawnSync(suiteDef.command, {
    cwd: REPO_ROOT,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
    maxBuffer: 20 * 1024 * 1024,
  });

  const durationMs = Date.now() - startTime;
  const exitCode = result.status ?? 1;
  const combinedOutput = (result.stdout || '') + (result.stderr || '');

  const logPath = path.join(LOGS_DIR, suiteDef.logFilename);
  fs.writeFileSync(logPath, combinedOutput, 'utf8');

  const sha256 = crypto.createHash('sha256').update(combinedOutput, 'utf8').digest('hex');
  const { passed, failed, suitesPassed } = parseJestOutput(combinedOutput);

  const relLogPath = path.relative(REPO_ROOT, logPath).replace(/\\/g, '/');

  return {
    suite: suiteDef.suite,
    command: suiteDef.command,
    exitCode: exitCode,
    status: exitCode === 0 && failed === 0 ? 'PASS' : 'FAIL',
    suitesPassed: suitesPassed,
    testsPassed: passed,
    testsFailed: failed,
    durationMs: durationMs,
    evidenceClass: 'REPOSITORY_IMPLEMENTATION',
    executedInCurrentDelivery: true,
    evidenceType: 'DIRECT_EXECUTION_CAPTURE',
    outputLogPath: relLogPath,
    outputLogSha256: sha256,
  };
}

export function captureAllSuites(additionalSuites = []) {
  const suites = [...TEST_SUITE_DEFINITIONS, ...additionalSuites];

  let manifest = {
    milestone: 'W021.5',
    generatedAt: new Date().toISOString(),
    manifestSchema: 'https://kshetra.dev/schemas/test-execution-manifest.v2.json',
    verifierRole: 'CTO Directive 097 Test Execution Verifier',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      offlineRepositoryOnly: true,
    },
    testSuites: [],
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

  for (const suiteDef of suites) {
    const res = runSuiteAndCapture(suiteDef);
    console.log(`  -> ${res.suite}: ${res.status} (Passed: ${res.testsPassed}, Failed: ${res.testsFailed}, Exit: ${res.exitCode})`);

    const existingIdx = manifest.testSuites.findIndex((s) => s.suite === res.suite);
    if (existingIdx >= 0) {
      manifest.testSuites[existingIdx] = res;
    } else {
      manifest.testSuites.push(res);
    }
    manifest.generatedAt = new Date().toISOString();
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  console.log(`\nManifest written to: ${MANIFEST_PATH}`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  captureAllSuites();
}
