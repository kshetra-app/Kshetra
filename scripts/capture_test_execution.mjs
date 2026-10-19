#!/usr/bin/env node

/**
 * scripts/capture_test_execution.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 100
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
  // 17 Directive Regression & Verification Suites (Directives 084 through 100)
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
  {
    suite: 'tests/political-intelligence-directive-099.test.mjs',
    command: 'node tests/political-intelligence-directive-099.test.mjs',
    logFilename: 'directive-099.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '099',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-100.test.mjs',
    command: 'node tests/political-intelligence-directive-100.test.mjs',
    logFilename: 'directive-100.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '100',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-101.test.mjs',
    command: 'node tests/political-intelligence-directive-101.test.mjs',
    logFilename: 'directive-101.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '101',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-102.test.mjs',
    command: 'node tests/political-intelligence-directive-102.test.mjs',
    logFilename: 'directive-102.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '102',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-103.test.mjs',
    command: 'node tests/political-intelligence-directive-103.test.mjs',
    logFilename: 'directive-103.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '103',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-104.test.mjs',
    command: 'node tests/political-intelligence-directive-104.test.mjs',
    logFilename: 'directive-104.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '104',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-105.test.mjs',
    command: 'node tests/political-intelligence-directive-105.test.mjs',
    logFilename: 'directive-105.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '105',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-106.test.mjs',
    command: 'node tests/political-intelligence-directive-106.test.mjs',
    logFilename: 'directive-106.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '106',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-107.test.mjs',
    command: 'node tests/political-intelligence-directive-107.test.mjs',
    logFilename: 'directive-107.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '107',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-108.test.mjs',
    command: 'node tests/political-intelligence-directive-108.test.mjs',
    logFilename: 'directive-108.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '108',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-109.test.mjs',
    command: 'node tests/political-intelligence-directive-109.test.mjs',
    logFilename: 'directive-109.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '109',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-110.test.mjs',
    command: 'node tests/political-intelligence-directive-110.test.mjs',
    logFilename: 'directive-110.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '110',
    shell: true,
  },
  {
    suite: 'tests/political-intelligence-directive-111.test.mjs',
    command: 'node tests/political-intelligence-directive-111.test.mjs',
    logFilename: 'directive-111.log',
    suiteType: 'DIRECTIVE_VERIFICATION_TEST',
    directiveRef: '111',
    shell: true,
  },
];

/**
 * Rigorously verifies that the observed process output binds to the intended test suite.
 * Rejects outputs where the suite name only appears in arbitrary text, comments, or descriptions.
 */
export function verifySuiteIdentity(rawOutput, suiteDef) {
  if (!suiteDef || !suiteDef.suite) {
    return { ok: true, runnerFormat: null };
  }

  const expectedSuite = suiteDef.suite;
  const expectedCommand = suiteDef.command || '';
  const suiteBasename = path.basename(expectedSuite);

  // 1. Verify that command (if provided) is consistent with suite identity
  if (expectedCommand) {
    const cmdContainsSuite = expectedCommand.includes(expectedSuite) ||
      expectedCommand.includes(suiteBasename) ||
      expectedCommand.includes(suiteBasename.replace(/\.(test|spec)\.(ts|js|mjs)$/, ''));
    if (!cmdContainsSuite) {
      return {
        ok: false,
        reason: 'COMMAND_SUITE_MISMATCH',
        detail: `Command "${expectedCommand}" does not reference expected suite "${expectedSuite}".`,
      };
    }
  }

  // 2. Identify structured runner execution blocks
  // Case A: Jest Runner Output
  // Jest explicitly outputs "PASS <path>" or "FAIL <path>" on its own line in the test execution section
  const jestSuiteRegex = /(?:^|\n)\s*(?:PASS|FAIL)\s+([^\s\(\)]+\.(?:test|spec)\.(?:ts|js|mjs))\b/g;
  const jestMatches = [...rawOutput.matchAll(jestSuiteRegex)].map((m) => m[1].replace(/\\/g, '/'));

  if (jestMatches.length > 0) {
    const uniqueJestSuites = [...new Set(jestMatches)];
    const matchedJestSuite = uniqueJestSuites.find((js) => expectedSuite.endsWith(js) || js.endsWith(expectedSuite));
    if (!matchedJestSuite) {
      return {
        ok: false,
        reason: 'SUITE_IDENTITY_MISMATCH',
        detail: `Jest executed suite(s) [${uniqueJestSuites.join(', ')}] do not match expected suite "${expectedSuite}".`,
      };
    }
    if (uniqueJestSuites.length > 1) {
      return {
        ok: false,
        reason: 'SUITE_IDENTITY_AMBIGUOUS',
        detail: `Jest output contains multiple executed suites: [${uniqueJestSuites.join(', ')}].`,
      };
    }
    return { ok: true, runnerFormat: 'JEST', matchedSuite: matchedJestSuite };
  }

  // Case B: Delimited Suite Header Banner (Custom Summary / Directive Test Suites)
  // Must be enclosed in top-level delimiter lines `={20,}`
  const bannerBlockRegex = /(?:^|\n)={20,}\r?\n([\s\S]*?)\r?\n={20,}/g;
  const bannerBlocks = [...rawOutput.matchAll(bannerBlockRegex)].map((m) => m[1].trim());

  const suiteHeaderBanners = bannerBlocks.filter((b) => 
    !/^(?:TEST|VERIFICATION)\s+SUMMARY:/i.test(b) &&
    !/^KSHETRA\s+VERIFIABLE\s+TEST\s+EXECUTION\s+LOG/i.test(b) &&
    (/CTO\s+DIRECTIVE/i.test(b) || /Suite:\s*/i.test(b) || /VERIFICATION\s+SUITE/i.test(b) || /INTEGRATION\s+VERIFICATION/i.test(b))
  );

  if (suiteHeaderBanners.length === 0) {
    return {
      ok: false,
      reason: 'SUITE_IDENTITY_MISSING',
      detail: `No recognized test runner suite header or Jest execution line found in output for suite "${expectedSuite}".`,
    };
  }

  if (suiteHeaderBanners.length > 1) {
    return {
      ok: false,
      reason: 'SUITE_IDENTITY_AMBIGUOUS',
      detail: `Multiple conflicting suite header banners detected in output (${suiteHeaderBanners.length} banners).`,
    };
  }

  const headerBanner = suiteHeaderBanners[0];
  const explicitSuiteMatch = headerBanner.match(/\bSuite:\s*([^\s\r\n]+)/i);
  if (explicitSuiteMatch) {
    const declaredSuite = explicitSuiteMatch[1].replace(/\\/g, '/');
    if (!expectedSuite.endsWith(declaredSuite) && !declaredSuite.endsWith(expectedSuite)) {
      return {
        ok: false,
        reason: 'SUITE_IDENTITY_MISMATCH',
        detail: `Suite header explicitly declared "${declaredSuite}" but expected "${expectedSuite}".`,
      };
    }
    return { ok: true, runnerFormat: 'CUSTOM_SUMMARY', matchedSuite: declaredSuite };
  }

  // Check for canonical Kshetra Directive Verification Suite banner
  const canonicalDirectiveRegex = /KSHETRA\s+W021\.5\s+[—–-]\s+CTO\s+DIRECTIVE\s+0*(\d+)\b.*(?:VERIFICATION\s+SUITE|VERIFICATION\s+TEST\s+BATTERY|REGRESSION\s+VERIFICATION\s+SUITE)/i;
  const canonicalMatch = headerBanner.match(canonicalDirectiveRegex);

  if (canonicalMatch) {
    const bannerDirectiveNum = parseInt(canonicalMatch[1], 10);
    let expectedDirectiveNum = null;
    if (suiteDef.directiveRef) {
      expectedDirectiveNum = parseInt(suiteDef.directiveRef, 10);
    } else {
      const m = expectedSuite.match(/directive-0?(\d+)/i);
      if (m) expectedDirectiveNum = parseInt(m[1], 10);
    }

    if (expectedDirectiveNum === null || bannerDirectiveNum !== expectedDirectiveNum) {
      return {
        ok: false,
        reason: 'SUITE_IDENTITY_MISMATCH',
        detail: `Suite header identifies Directive ${bannerDirectiveNum}, but expected suite is ${expectedDirectiveNum !== null ? 'Directive ' + expectedDirectiveNum : '"' + expectedSuite + '"'}.`,
      };
    }
    return { ok: true, runnerFormat: 'CUSTOM_SUMMARY', directiveNum: bannerDirectiveNum };
  }

  // Reject generic directive banners lacking explicit test file identification or canonical suite title
  if (/DIRECTIVE\s+0*(\d+)\b/i.test(headerBanner)) {
    return {
      ok: false,
      reason: 'GENERIC_DIRECTIVE_BANNER_REJECTED',
      detail: `Generic directive reference in banner is not accepted without canonical verification suite header or explicit test file identification ("${expectedSuite}").`,
    };
  }

  return {
    ok: false,
    reason: 'SUITE_IDENTITY_MISMATCH',
    detail: `Suite header banner did not match expected suite identity for "${expectedSuite}".`,
  };
}

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
 * - suite identity mismatch / missing / ambiguous (SUITE_IDENTITY_MISMATCH, SUITE_IDENTITY_MISSING, SUITE_IDENTITY_AMBIGUOUS)
 * - command suite mismatch (COMMAND_SUITE_MISMATCH)
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
  let skipped = 0;
  let skippedState = 'SKIPPED_COUNT_NOT_REPORTED';
  let zeroSkippedEvidenced = false;
  let suitesPassed = 0;
  let runnerFormat = null;
  let matched = false;

  // 2. Try Jest format: Tests: [X failed, ][Y skipped, ][Z passed, ]W total
  const jestLineMatch = rawOutput.match(/(?:^|\n)\s*Tests:\s+([^\r\n]+)/i);
  const jestSuitesMatch = rawOutput.match(/(?:^|\n)\s*Test Suites:\s+([0-9]+)\s+passed/i);

  if (jestLineMatch) {
    const lineText = jestLineMatch[1];
    const passedMatch = lineText.match(/([0-9]+)\s+passed/i);
    const failedMatch = lineText.match(/([0-9]+)\s+failed/i);
    const skippedMatch = lineText.match(/([0-9]+)\s+skipped/i);
    const totalMatch = lineText.match(/([0-9]+)\s+total/i);

    passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const jestReportedSkipped = skippedMatch ? parseInt(skippedMatch[1], 10) : null;
    const jestTotal = totalMatch ? parseInt(totalMatch[1], 10) : null;

    if (jestReportedSkipped !== null) {
      if (jestReportedSkipped === 0) {
        skippedState = 'EXPLICIT_ZERO_SKIPPED';
        skipped = 0;
        zeroSkippedEvidenced = true;
      } else {
        skippedState = 'SKIPPED_COUNT_REPORTED_NONZERO';
        skipped = jestReportedSkipped;
        zeroSkippedEvidenced = false;
      }
    } else if (jestTotal !== null) {
      // Documented runner contract: In Jest, when total equals passed + failed,
      // omission of skipped count independently guarantees zero skipped tests.
      if (jestTotal === passed + failed) {
        skippedState = 'EXPLICIT_ZERO_SKIPPED';
        skipped = 0;
        zeroSkippedEvidenced = true;
      } else {
        return {
          isParsed: false,
          failureReason: 'INTERNALLY_INCONSISTENT_TOTALS',
          failureDetail: `Jest reported total (${jestTotal}) does not equal passed (${passed}) + failed (${failed}).`,
          passed,
          failed,
          skipped: 0,
          skippedState: 'SKIPPED_COUNT_NOT_REPORTED',
          zeroSkippedEvidenced: false,
          suitesPassed: 0,
          totalTests: jestTotal,
          runnerFormat: 'JEST',
        };
      }
    } else {
      skippedState = 'SKIPPED_COUNT_NOT_REPORTED';
      skipped = 0;
      zeroSkippedEvidenced = false;
    }

    if (jestTotal !== null && jestReportedSkipped !== null) {
      if (jestTotal !== passed + failed + jestReportedSkipped) {
        return {
          isParsed: false,
          failureReason: 'INTERNALLY_INCONSISTENT_TOTALS',
          failureDetail: `Jest reported total (${jestTotal}) does not equal passed (${passed}) + failed (${failed}) + skipped (${jestReportedSkipped}).`,
          passed,
          failed,
          skipped,
          skippedState,
          zeroSkippedEvidenced,
          suitesPassed: 0,
          totalTests: jestTotal,
          runnerFormat: 'JEST',
        };
      }
    }

    suitesPassed = jestSuitesMatch ? parseInt(jestSuitesMatch[1], 10) : (failed === 0 && passed > 0 ? 1 : 0);
    runnerFormat = 'JEST';
    matched = true;
  }

  // 3. Try custom summary format: VERIFICATION / TEST SUMMARY: X PASSED, Y FAILED[, Z SKIPPED][, W TOTAL]
  const customSummaryRegex = /(?:^|\n)\s*(?:VERIFICATION|TEST)\s+(?:EXECUTION\s+)?SUMMARY:\s+([^\r\n]+)/gi;
  const allCustomMatches = [...rawOutput.matchAll(customSummaryRegex)];

  if (matched && allCustomMatches.length > 0) {
    const customLine = allCustomMatches[0][1];
    const cPassedMatch = customLine.match(/([0-9]+)\s+PASSED/i);
    const cFailedMatch = customLine.match(/([0-9]+)\s+FAILED/i);
    if (cPassedMatch && parseInt(cPassedMatch[1], 10) !== passed) {
      return {
        isParsed: false,
        failureReason: 'CONFLICTING_TEST_SUMMARIES',
        failureDetail: `Jest passed (${passed}) conflicts with custom summary passed (${cPassedMatch[1]}).`,
        passed: 0,
        failed: 0,
        skipped: 0,
        skippedState: 'SKIPPED_COUNT_NOT_REPORTED',
        zeroSkippedEvidenced: false,
        suitesPassed: 0,
        totalTests: 0,
        runnerFormat: null,
      };
    }
  }

  if (!matched && allCustomMatches.length > 1) {
    const parsedSummaries = allCustomMatches.map((m) => {
      const txt = m[1];
      const p = txt.match(/([0-9]+)\s+PASSED/i);
      const f = txt.match(/([0-9]+)\s+FAILED/i);
      const s = txt.match(/([0-9]+)\s+SKIPPED/i);
      const t = txt.match(/([0-9]+)\s+TOTAL/i);
      return {
        raw: m[0].trim(),
        p: p ? parseInt(p[1], 10) : null,
        f: f ? parseInt(f[1], 10) : null,
        s: s ? parseInt(s[1], 10) : null,
        t: t ? parseInt(t[1], 10) : null,
      };
    });

    const first = parsedSummaries[0];
    const hasConflict = parsedSummaries.some((ps) =>
      ps.p !== first.p || ps.f !== first.f || ps.s !== first.s || ps.t !== first.t
    );

    if (hasConflict) {
      return {
        isParsed: false,
        failureReason: 'CONFLICTING_TEST_SUMMARIES',
        failureDetail: `Multiple conflicting custom test summaries detected: ${parsedSummaries.map((ps) => ps.raw).join(' vs ')}`,
        passed: 0,
        failed: 0,
        skipped: 0,
        skippedState: 'SKIPPED_COUNT_NOT_REPORTED',
        zeroSkippedEvidenced: false,
        suitesPassed: 0,
        totalTests: 0,
        runnerFormat: 'CUSTOM_SUMMARY',
      };
    }
  }

  if (!matched && allCustomMatches.length > 0) {
    const customLine = allCustomMatches[allCustomMatches.length - 1][1];
    const passedMatch = customLine.match(/([0-9]+)\s+PASSED/i);
    const failedMatch = customLine.match(/([0-9]+)\s+FAILED/i);
    const skippedMatch = customLine.match(/([0-9]+)\s+SKIPPED/i);
    const totalMatch = customLine.match(/([0-9]+)\s+TOTAL/i);

    if (passedMatch && failedMatch) {
      passed = parseInt(passedMatch[1], 10);
      failed = parseInt(failedMatch[1], 10);
      const customReportedSkipped = skippedMatch ? parseInt(skippedMatch[1], 10) : null;
      const customTotal = totalMatch ? parseInt(totalMatch[1], 10) : null;

      if (customReportedSkipped !== null) {
        if (customReportedSkipped === 0) {
          skippedState = 'EXPLICIT_ZERO_SKIPPED';
          skipped = 0;
          zeroSkippedEvidenced = true;
        } else {
          skippedState = 'SKIPPED_COUNT_REPORTED_NONZERO';
          skipped = customReportedSkipped;
          zeroSkippedEvidenced = false;
        }
      } else if (customTotal !== null) {
        if (customTotal === passed + failed) {
          skippedState = 'EXPLICIT_ZERO_SKIPPED';
          skipped = 0;
          zeroSkippedEvidenced = true;
        } else {
          return {
            isParsed: false,
            failureReason: 'INTERNALLY_INCONSISTENT_TOTALS',
            failureDetail: `Custom summary reported total (${customTotal}) does not equal passed (${passed}) + failed (${failed}).`,
            passed,
            failed,
            skipped: 0,
            skippedState: 'SKIPPED_COUNT_NOT_REPORTED',
            zeroSkippedEvidenced: false,
            suitesPassed: 0,
            totalTests: customTotal,
            runnerFormat: 'CUSTOM_SUMMARY',
          };
        }
      } else {
        skippedState = 'SKIPPED_COUNT_NOT_REPORTED';
        skipped = 0;
        zeroSkippedEvidenced = false;
      }

      if (customTotal !== null && customReportedSkipped !== null) {
        if (customTotal !== passed + failed + customReportedSkipped) {
          return {
            isParsed: false,
            failureReason: 'INTERNALLY_INCONSISTENT_TOTALS',
            failureDetail: `Custom summary reported total (${customTotal}) does not equal passed (${passed}) + failed (${failed}) + skipped (${customReportedSkipped}).`,
            passed,
            failed,
            skipped,
            skippedState,
            zeroSkippedEvidenced,
            suitesPassed: 0,
            totalTests: customTotal,
            runnerFormat: 'CUSTOM_SUMMARY',
          };
        }
      }

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
      skipped: 0,
      skippedState: 'SKIPPED_COUNT_NOT_REPORTED',
      zeroSkippedEvidenced: false,
      suitesPassed: 0,
      totalTests: 0,
      runnerFormat: null,
    };
  }

  const totalTests = passed + failed + (skipped || 0);

  // 5. Zero tests passed is a failure
  if (passed === 0) {
    return {
      isParsed: false,
      failureReason: failed > 0 ? 'TESTS_FAILED' : 'ZERO_TESTS_PASSED',
      passed,
      failed,
      skipped,
      skippedState,
      zeroSkippedEvidenced,
      suitesPassed,
      totalTests,
      runnerFormat,
    };
  }

  // 6. Strong positive evidence that the intended test suite actually ran in the runner section
  if (suiteDef && suiteDef.suite) {
    const identityRes = verifySuiteIdentity(rawOutput, suiteDef);
    if (!identityRes.ok) {
      return {
        isParsed: false,
        failureReason: identityRes.reason,
        failureDetail: identityRes.detail,
        passed,
        failed,
        skipped,
        skippedState,
        zeroSkippedEvidenced,
        suitesPassed: 0,
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
    skipped,
    skippedState,
    zeroSkippedEvidenced,
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
      executionEpoch: 'DIRECTIVE_111',
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
    testsSkipped: parsed.skipped || 0,
    skippedState: parsed.skippedState || 'SKIPPED_COUNT_NOT_REPORTED',
    zeroSkippedEvidenced: parsed.zeroSkippedEvidenced === true,
    totalTests: parsed.totalTests,
    durationMs: durationMs,
    runnerFormat: parsed.runnerFormat,
    suiteType: suiteDef.suiteType || 'CORE_SYSTEM_TEST',
    directiveRef: suiteDef.directiveRef || null,
    evidenceClass: 'REPOSITORY_IMPLEMENTATION',
    executedInCurrentDelivery: true,
    evidenceType: 'DIRECT_EXECUTION_CAPTURE',
    executionEpoch: 'DIRECTIVE_111',
    executionQualification: 'REPOSITORY_RECORDED_EXECUTION',
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
    executionQualification: 'REPOSITORY_RECORDED_EXECUTION',
    verifierRole: 'CTO Directive 111 Test Execution Verifier',
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
      directiveCycle: 'CTO_DIRECTIVE_111',
    },
  };

  if (additionalSuites.length > 0 && fs.existsSync(MANIFEST_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      if (Array.isArray(existing.testSuites)) {
        manifest = existing;
      }
    } catch {
      // ignore
    }
  }

  // Ensure metadata is consistently synchronized with current directive cycle
  manifest.manifestSchema = 'https://kshetra.dev/schemas/test-execution-manifest.v2.json';
  manifest.executionQualification = 'REPOSITORY_RECORDED_EXECUTION';
  manifest.verifierRole = 'CTO Directive 111 Test Execution Verifier';
  manifest.executionScope = 'FULL_REPOSITORY_REGRESSION_AND_DIRECTIVE_BATTERY';
  manifest.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    offlineRepositoryOnly: true,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

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

    manifest.testSuites.sort((a, b) => {
      const idxA = suites.findIndex((s) => s.suite === a.suite);
      const idxB = suites.findIndex((s) => s.suite === b.suite);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

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
      directiveCycle: 'CTO_DIRECTIVE_111',
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  console.log(`\nManifest written to: ${MANIFEST_PATH}`);
  console.log(`Summary: ${manifest.summary.passedSuites}/${manifest.summary.totalSuites} suites passed, ${manifest.summary.totalTestsPassed} total tests passed.`);

  return { manifest, hasFailures: totalFailedSuites > 0 };
}

/**
 * Asserts that a given relative candidate path strictly resides within repoRoot,
 * verifying lexical containment, existence, and canonical filesystem realpath resolution (symlink protection).
 */
export function assertPathContainedInRoot(relOrAbsPath, repoRoot = REPO_ROOT, context = 'path') {
  if (!relOrAbsPath || typeof relOrAbsPath !== 'string') {
    throw new Error(`Path containment violation: ${context} is missing or not a string.`);
  }

  if (path.isAbsolute(relOrAbsPath) || /^[a-zA-Z]:[/\\]/.test(relOrAbsPath) || relOrAbsPath.startsWith('/') || relOrAbsPath.startsWith('\\')) {
    throw new Error(`Path containment violation: ${context} must be a relative repository path, but got absolute or root-anchored path "${relOrAbsPath}".`);
  }

  const normalizedRoot = path.resolve(repoRoot);
  const resolvedLexical = path.resolve(normalizedRoot, relOrAbsPath);
  const rootWithSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
  if (!resolvedLexical.startsWith(rootWithSep) && resolvedLexical !== normalizedRoot) {
    throw new Error(`Path containment violation: ${context} "${relOrAbsPath}" lexically traverses outside repository root "${normalizedRoot}".`);
  }

  if (!fs.existsSync(resolvedLexical)) {
    throw new Error(`Path containment violation: ${context} file does not exist on disk: "${relOrAbsPath}".`);
  }

  const realRepoRoot = fs.existsSync(normalizedRoot) ? fs.realpathSync(normalizedRoot) : normalizedRoot;
  let realTarget;
  try {
    realTarget = fs.realpathSync(resolvedLexical);
  } catch (err) {
    throw new Error(`Path containment violation: Failed to resolve canonical realpath for ${context} "${relOrAbsPath}": ${err.message}`);
  }

  const canonicalRootWithSep = realRepoRoot.endsWith(path.sep) ? realRepoRoot : realRepoRoot + path.sep;
  if (!realTarget.startsWith(canonicalRootWithSep) && realTarget !== realRepoRoot) {
    throw new Error(`Path containment violation: ${context} "${relOrAbsPath}" resolves through symlink outside repository root. Canonical target: "${realTarget}", canonical root: "${realRepoRoot}".`);
  }

  return {
    lexicalPath: resolvedLexical,
    canonicalPath: realTarget,
  };
}

/**
 * Deterministically validates the integrity of a test execution manifest against disk evidence.
 *
 * NOTE: SHA-256 digests provide bitwise integrity verification against disk corruption or accidental
 * mutation, but do NOT provide cryptographic author authentication. Production acceptance authority
 * requires independent operational environment provisioning (CTO_TRUST_PIN / CTO_TRUST_POLICY).
 */
export function validateManifestIntegrity(manifest, repoRoot = REPO_ROOT, options = {}) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest validation error: Manifest is null or not an object.');
  }

  if (manifest.milestone !== 'W021.5') {
    throw new Error(`Manifest validation error: Invalid milestone "${manifest.milestone}". Expected "W021.5".`);
  }

  const expectedSchema = 'https://kshetra.dev/schemas/test-execution-manifest.v2.json';
  if (options.requireManifestSchema || manifest.manifestSchema !== undefined) {
    if (manifest.manifestSchema !== expectedSchema) {
      throw new Error(`Manifest validation error: Invalid manifestSchema "${manifest.manifestSchema}". Expected "${expectedSchema}".`);
    }
  }

  if (options.expectedVerifierRole && manifest.verifierRole !== options.expectedVerifierRole) {
    throw new Error(`Manifest validation error: verifierRole mismatch. Expected "${options.expectedVerifierRole}", got "${manifest.verifierRole}".`);
  }

  if (options.expectedDirectiveCycle && manifest.summary && manifest.summary.directiveCycle !== options.expectedDirectiveCycle) {
    throw new Error(`Manifest validation error: summary.directiveCycle mismatch. Expected "${options.expectedDirectiveCycle}", got "${manifest.summary.directiveCycle}".`);
  }

  if (!Array.isArray(manifest.testSuites) || manifest.testSuites.length === 0) {
    throw new Error('Manifest validation error: testSuites is missing or empty.');
  }

  const normalizedRoot = path.resolve(repoRoot);
  const realRepoRoot = fs.existsSync(normalizedRoot) ? fs.realpathSync(normalizedRoot) : normalizedRoot;

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

    if (!entry.command || typeof entry.command !== 'string') {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" lacks command.`);
    }

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

    // Path containment and traversal protection (including absolute paths and symlinks)
    if (path.isAbsolute(entry.outputLogPath) || /^[a-zA-Z]:[/\\]/.test(entry.outputLogPath) || entry.outputLogPath.startsWith('/') || entry.outputLogPath.startsWith('\\')) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" outputLogPath must be a relative repository path, but got absolute or root-anchored path: "${entry.outputLogPath}".`);
    }

    const absLogPath = path.resolve(repoRoot, entry.outputLogPath);
    const normalizedRootWithSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
    if (!absLogPath.startsWith(normalizedRootWithSep) && absLogPath !== normalizedRoot) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" outputLogPath traverses outside repository root: "${entry.outputLogPath}".`);
    }

    if (!fs.existsSync(absLogPath)) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" output log file does not exist on disk: "${entry.outputLogPath}".`);
    }

    let realLogPath;
    try {
      realLogPath = fs.realpathSync(absLogPath);
    } catch (err) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" failed to resolve canonical realpath for "${entry.outputLogPath}": ${err.message}`);
    }

    const realRepoRootWithSep = realRepoRoot.endsWith(path.sep) ? realRepoRoot : realRepoRoot + path.sep;
    if (!realLogPath.startsWith(realRepoRootWithSep) && realLogPath !== realRepoRoot) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" outputLogPath resolves through symlink outside repository root: "${entry.outputLogPath}".`);
    }

    const logContent = fs.readFileSync(absLogPath, 'utf8');

    // SHA-256 Digest Verification
    const actualDigest = crypto.createHash('sha256').update(logContent, 'utf8').digest('hex');
    if (actualDigest.toLowerCase() !== entry.outputLogSha256.toLowerCase()) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" output log digest mismatch. Recorded: ${entry.outputLogSha256}, Actual: ${actualDigest}.`);
    }

    // 1. Validate log header's suite, command, and exit code against manifest entry
    const headerSuiteMatch = logContent.match(/^Suite:\s*([^\r\n]+)$/m);
    if (!headerSuiteMatch) {
      throw new Error(`Manifest validation error: Log file "${entry.outputLogPath}" does not belong to suite "${entry.suite}" (suite identity mismatch in log header: missing Suite:).`);
    }
    const logHeaderSuite = headerSuiteMatch[1].trim();
    if (logHeaderSuite !== entry.suite) {
      throw new Error(`Manifest validation error: Log file "${entry.outputLogPath}" does not belong to suite "${entry.suite}" (suite identity mismatch in log header: declared "${logHeaderSuite}", expected "${entry.suite}").`);
    }

    const headerCommandMatch = logContent.match(/^Command:\s*([^\r\n]+)$/m);
    if (!headerCommandMatch) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" log file is missing "Command:" in header.`);
    }
    const logHeaderCommand = headerCommandMatch[1].trim();
    if (logHeaderCommand !== entry.command) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" log header command ("${logHeaderCommand}") does not match manifest command ("${entry.command}").`);
    }

    const headerExitMatch = logContent.match(/^Exit Code:\s*([^\r\n]+)$/m);
    if (headerExitMatch) {
      const logHeaderExit = parseInt(headerExitMatch[1].trim(), 10);
      if (logHeaderExit !== entry.exitCode) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" log header Exit Code (${logHeaderExit}) does not match manifest exitCode (${entry.exitCode}).`);
      }
    }

    // 2. Validate process metrics block
    const metricsExitMatch = logContent.match(/^ExitCode:\s*([0-9]+)$/m);
    if (!metricsExitMatch) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" log file is missing "ExitCode:" in process metrics section.`);
    }
    const metricExitCode = parseInt(metricsExitMatch[1], 10);
    if (metricExitCode !== entry.exitCode) {
      throw new Error(`Manifest validation error: Suite "${entry.suite}" process metric ExitCode (${metricExitCode}) does not match manifest exitCode (${entry.exitCode}).`);
    }

    // 3. Extract and re-parse actual runner output from stdout and stderr sections
    const stdoutMatch = logContent.match(/--- STDOUT ---\r?\n([\s\S]*?)\r?\n--- STDERR ---/);
    const stderrMatch = logContent.match(/--- STDERR ---\r?\n([\s\S]*?)\r?\n--- PROCESS METRICS ---/);
    const stdout = stdoutMatch ? stdoutMatch[1] : '';
    const stderr = stderrMatch ? stderrMatch[1] : '';
    const combinedLogOutput = stdout + '\n' + stderr;

    const reparsed = parseTestOutput(combinedLogOutput, entry);

    if (entry.status === 'PASS') {
      if (!reparsed.isParsed) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" declared PASS but re-parsed log output failed: ${reparsed.failureReason}.`);
      }
      if (reparsed.failed > 0) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" declared PASS but log contains ${reparsed.failed} test failure(s).`);
      }
      if (reparsed.passed !== entry.testsPassed) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" re-parsed passed count (${reparsed.passed}) does not match manifest testsPassed (${entry.testsPassed}).`);
      }
      if (entry.totalTests !== undefined && reparsed.totalTests !== entry.totalTests) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" re-parsed totalTests (${reparsed.totalTests}) does not match manifest totalTests (${entry.totalTests}).`);
      }
      if (entry.runnerFormat && reparsed.runnerFormat !== entry.runnerFormat) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" runnerFormat mismatch: expected ${entry.runnerFormat}, re-parsed ${reparsed.runnerFormat}.`);
      }
      if (entry.testsSkipped !== undefined && reparsed.skipped !== undefined && entry.testsSkipped !== reparsed.skipped) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" re-parsed skipped count (${reparsed.skipped}) does not match manifest testsSkipped (${entry.testsSkipped}).`);
      }
      if (entry.skippedState && reparsed.skippedState && entry.skippedState !== reparsed.skippedState) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" skippedState mismatch: manifest declared "${entry.skippedState}", log parsed "${reparsed.skippedState}".`);
      }
      if (entry.zeroSkippedEvidenced && !reparsed.zeroSkippedEvidenced) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" claims zeroSkippedEvidenced but log parser did not evidence explicit zero skipped (state: ${reparsed.skippedState}).`);
      }
      if (entry.zeroSkippedEvidenced && (reparsed.skipped !== 0)) {
        throw new Error(`Manifest validation error: Suite "${entry.suite}" claims zeroSkippedEvidenced but log contains ${reparsed.skipped} skipped test(s).`);
      }
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

  // Check for unexpected suites outside declared execution scope if requireExactSuites is set
  if (options.requireExactSuites && options.expectedSuites && Array.isArray(options.expectedSuites)) {
    const expectedSet = new Set(options.expectedSuites);
    for (const suite of seenSuites) {
      if (!expectedSet.has(suite)) {
        throw new Error(`Manifest validation error: Unexpected suite "${suite}" outside declared execution scope.`);
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
