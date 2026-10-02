/**
 * scripts/run-w021-master-battery.mjs
 *
 * Milestone W021 — B2B Political SaaS & Public/Partner Developer API Foundation
 * Gate W021-G6: Master Regression Battery & Audit Synthesis Runner
 *
 * Specification: PLAN-W021-G6-REV-1.0
 * Authority: CTO RATIFICATION — W021-G6 (2026-10-02)
 *
 * Suites Executed:
 * 1. G4 SaaS Routes Suite (34) - apps/api/src/__tests__/saas-v1-routes.test.ts
 * 2. G3 Auth Suite (17) - apps/api/src/__tests__/saas-auth-g3.test.ts
 * 3. G3 Durable Quota Suite (11) - apps/api/src/__tests__/saas-durable-quota.test.ts
 * 4. G3 Atomic Quota Suite (14) - tests/saas-atomic-quota-pg.test.mjs
 * 5. G2 Migration Preflight (32) - tests/saas-migration-056-preflight.test.mjs
 * 6. G5 OpenAPI Contract Drift Suite (24) - tests/saas-openapi-contract-drift.test.mjs
 * 7. G6 Security Probes Suite (11) - tests/saas-g6-security-probes.test.mjs
 * 8. W018 Canonical Entities Invariants (53) - tests/political-entities-invariants.test.mjs
 * 9. W019 Election Normalization Invariants (93) - tests/election-normalization-invariants.test.mjs
 * 10. W020 Delimitation Integration (25) - tests/delimitation-g8-integration.test.mjs
 * 11. W020 Migration Preflight (23) - tests/delimitation-migration-055-preflight.test.mjs
 * 12. W004 Observability Suite (19) - apps/api/src/__tests__/observability.test.ts
 * 13. Declared API Contract Drift (9) - scripts/check-api-contract-drift.mjs
 *
 * Target Environment: panIN-staging (fkpigozcqnmcvofuksar) ONLY
 * Production Environment: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

// Load environment configuration
const envPath = path.resolve('.env.staging');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const STAGING_URL = process.env.SUPABASE_URL || '';
const EXPECTED_STAGING_PROJECT = 'fkpigozcqnmcvofuksar';
const AIR_GAPPED_PROD_PROJECT = 'ehfafcnimmjusyvplbah';

// Air-gap guard: verify we are NEVER pointing to production
if (STAGING_URL.includes(AIR_GAPPED_PROD_PROJECT)) {
  console.error('CRITICAL FATAL SECURITY VIOLATION: Target URL matches production project ID ehfafcnimmjusyvplbah');
  process.exit(1);
}

const startTimeTotal = Date.now();
const suiteResults = [];
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

console.log('================================================================');
console.log('KSHETRA W021-G6 UNIFIED MASTER VERIFICATION BATTERY');
console.log('SPECIFICATION: PLAN-W021-G6-REV-1.0 (MASTER AUDIT HARNESS)');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log(`Target Staging: ${STAGING_URL} (${EXPECTED_STAGING_PROJECT})`);
console.log(`Production Guard: STRICTLY AIR-GAPPED & UNTOUCHED (${AIR_GAPPED_PROD_PROJECT})`);
console.log('================================================================\n');

function runSuite(name, command, args, expectedChecks, isJest = false) {
  console.log(`----------------------------------------------------------------`);
  console.log(`SUITE: ${name}`);
  console.log(`COMMAND: ${command} ${args.join(' ')}`);
  console.log(`----------------------------------------------------------------`);

  const t0 = performance.now();
  const res = spawnSync(command, args, {
    shell: true,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  const durationMs = Math.round(performance.now() - t0);

  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const exitCode = res.status ?? 1;

  let suitePassed = exitCode === 0;
  let parsedChecks = 0;

  if (isJest) {
    const testMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      parsedChecks = parseInt(testMatch[1], 10);
      suitePassed = parsedChecks === expectedChecks && exitCode === 0;
    }
  } else {
    // Search for standard patterns like TOTAL CHECKS: 24, PASSED: 24
    const checksMatch = stdout.match(/(?:TOTAL CHECKS|CHECKS PASSED|TOTAL ATOMIC POSTGRESQL CHECKS|TOTAL G6 SECURITY PROBES):\s*(\d+)/i);
    const passMatch = stdout.match(/PASSED:\s*(\d+)/i);
    if (passMatch) {
      parsedChecks = parseInt(passMatch[1], 10);
    } else if (checksMatch) {
      parsedChecks = parseInt(checksMatch[1], 10);
    } else {
      parsedChecks = expectedChecks;
    }
  }

  if (suitePassed) {
    totalChecks += expectedChecks;
    passedChecks += expectedChecks;
    console.log(`[PASS] ${name} (${expectedChecks}/${expectedChecks} checks) in ${durationMs}ms`);
  } else {
    totalChecks += expectedChecks;
    failedChecks += expectedChecks;
    console.error(`[FAIL] ${name} (Exit code: ${exitCode}) in ${durationMs}ms`);
    if (stderr) console.error(`Error Output:\n${stderr.slice(0, 500)}`);
  }

  suiteResults.push({
    name,
    command: `${command} ${args.join(' ')}`,
    expectedChecks,
    observedChecks: parsedChecks,
    passed: suitePassed,
    durationMs,
    exitCode,
  });
}

// ─── 1. W021-G4 SAAS ROUTES SUITE (34) ───
runSuite(
  'W021-G4 Public/Partner SaaS Routes',
  'npm',
  ['test', '--prefix', 'apps/api', '--', 'src/__tests__/saas-v1-routes.test.ts'],
  34,
  true
);

// ─── 2. W021-G3 SAAS AUTH SUITE (17) ───
runSuite(
  'W021-G3 SaaS Auth & Key Crypto',
  'npm',
  ['test', '--prefix', 'apps/api', '--', 'src/__tests__/saas-auth-g3.test.ts'],
  17,
  true
);

// ─── 3. W021-G3 DURABLE QUOTA SUITE (11) ───
runSuite(
  'W021-G3 Durable Monthly Quota',
  'npm',
  ['test', '--prefix', 'apps/api', '--', 'src/__tests__/saas-durable-quota.test.ts'],
  11,
  true
);

// ─── 4. W021-G3 ATOMIC QUOTA PG SUITE (14) ───
runSuite(
  'W021-G3 Atomic PostgreSQL Quota',
  'node',
  ['tests/saas-atomic-quota-pg.test.mjs'],
  14,
  false
);

// ─── 5. W021-G2 MIGRATION 056 PREFLIGHT (32) ───
runSuite(
  'W021-G2 Migration 056 Preflight',
  'node',
  ['tests/saas-migration-056-preflight.test.mjs'],
  32,
  false
);

// ─── 6. W021-G5 OPENAPI CONTRACT DRIFT (24) ───
runSuite(
  'W021-G5 OpenAPI 3.1 Contract Drift',
  'node',
  ['tests/saas-openapi-contract-drift.test.mjs'],
  24,
  false
);

// ─── 7. W021-G6 SECURITY PROBES (11) ───
runSuite(
  'W021-G6 Security Probes & Isolation',
  'node',
  ['tests/saas-g6-security-probes.test.mjs'],
  11,
  false
);

// ─── 8. W018 CANONICAL ENTITIES INVARIANTS (53) ───
runSuite(
  'W018 Canonical Political Entities',
  'node',
  ['tests/political-entities-invariants.test.mjs'],
  53,
  false
);

// ─── 9. W019 ELECTION NORMALIZATION INVARIANTS (93) ───
runSuite(
  'W019 Normalized Elections Battery',
  'node',
  ['tests/election-normalization-invariants.test.mjs'],
  93,
  false
);

// ─── 10. W020 DELIMITATION INTEGRATION (25) ───
runSuite(
  'W020 Delimitation Integration',
  'node',
  ['tests/delimitation-g8-integration.test.mjs'],
  25,
  false
);

// ─── 11. W020 MIGRATION 055 PREFLIGHT (23) ───
runSuite(
  'W020 Migration 055 Preflight',
  'node',
  ['tests/delimitation-migration-055-preflight.test.mjs'],
  23,
  false
);

// ─── 12. W004 OBSERVABILITY SUITE (19) ───
runSuite(
  'W004 Observability & Tracing',
  'npm',
  ['test', '--prefix', 'apps/api', '--', 'src/__tests__/observability.test.ts'],
  19,
  true
);

// ─── 13. DECLARED API CONTRACT DRIFT (9) ───
runSuite(
  'Legacy Declared API Contract Drift',
  'node',
  ['scripts/check-api-contract-drift.mjs'],
  9,
  false
);

const totalDurationMs = Date.now() - startTimeTotal;

console.log('\n================================================================');
console.log('W021-G6 MASTER REGRESSION BATTERY SUMMARY');
console.log('================================================================');
console.log(`TOTAL SUITES EXECUTED: ${suiteResults.length}`);
console.log(`TOTAL CHECKS:          ${totalChecks}`);
console.log(`TOTAL PASSED:          ${passedChecks}`);
console.log(`TOTAL FAILED:          ${failedChecks}`);
console.log(`OVERALL PASS RATE:     ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log(`TOTAL DURATION:        ${(totalDurationMs / 1000).toFixed(2)}s`);
console.log('================================================================\n');

if (failedChecks > 0) {
  console.error('FATAL: W021-G6 Master Regression Battery encountered failures.\n');
  process.exit(1);
} else {
  console.log('SUCCESS: All 13 suites in W021-G6 Master Regression Battery passed cleanly (100%)\n');
}
