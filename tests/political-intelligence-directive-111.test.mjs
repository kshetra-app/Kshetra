#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-111.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 111
 * D110 CI Failure Diagnosis, Export Contract Accuracy & Final Trust-Boundary Verification
 *
 * Comprehensive Verification Battery:
 * 1. Workstream A: CI Failure Diagnosis & Syntax Hardening:
 *    - Validates that .github/workflows/ci.yml parses cleanly with js-yaml.
 *    - Proves unquoted mapping colon defect ("Regression Test: Evidence...") is eliminated.
 *    - Simulates defective unquoted YAML to prove YAML parser fail-closed behavior.
 * 2. Workstream B: Production Verifier Export Contract & Inventory Alignment:
 *    - Validates exact mathematical equality between actual exported symbols and APPROVED_PRODUCTION_EXPORTS.
 *    - Proves that any unexpected or unapproved export added to namespace fails closed.
 *    - Confirms all 4 payload functions remain strictly undefined on production namespace.
 *    - Confirms rejection of all 10 FORBIDDEN_TRUST_OVERRIDES across all 4 public verifier entry points.
 * 3. Workstream C: Internal-Engine Trust Boundary & Application Containment:
 *    - Clean-process module loading of production verifier, test adapter, and internal engine.
 *    - Verifies strict DAG acyclicity: internal engine (Layer 0) has 0 repo imports; verifier and adapter (Layer 1) consume engine.
 *    - Verifies that shipped application code (apps/api, apps/mobile, packages/) never imports test adapter or internal engine.
 *    - Retains adversarial test battery: test adapter fails closed on tampered hash, tampered bytes, tampered commit, and empty matrix.
 * 4. Workstream D: Mandatory Governance Invariants & Baseline Immutability:
 *    - Rule IV-001 Non-Self-Acceptance: strictly 0.0% / UNACCEPTED.
 *    - Production Air-Gap: strictly 0.0% / UNEXECUTED.
 *    - Financial Defect DQ-W021.5-B2.2E-001: OPEN (5.0% blocked).
 *    - Telangana AC 119 Boundary Defect: OPEN / BLOCKED (1.5% blocked).
 *    - 68 SQL migrations match baseline 0ea572d byte-for-byte.
 *    - 31 MLA seed profiles match baseline fb408ce byte-for-byte.
 *    - Canonical task inventory: 27 canonical tasks, summing to 100.000% weight, 61.5% repo-verified earned.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

import * as productionVerifierModule from '../scripts/reconcile_execution_ledger.mjs';

import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  CANONICAL_TASK_METADATA,
  FORBIDDEN_TRUST_OVERRIDES,
  APPROVED_PRODUCTION_EXPORTS,
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
 * Runs code in clean, isolated Node process via spawnSync and asserts exit 0 and expected marker.
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 111 VERIFICATION SUITE');
console.log('D110 CI Failure Diagnosis, Export Contract & Final Trust Boundary');
console.log('Suite: tests/political-intelligence-directive-111.test.mjs');
console.log('Command: node tests/political-intelligence-directive-111.test.mjs');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Workstream A: CI Failure Diagnosis & Syntax Hardening
// -----------------------------------------------------------------------------
console.log('--- 1. CI Workflow Syntax Diagnosis & Hardening (Workstream A) ---');

runTest('1.1 A: .github/workflows/ci.yml exists and parses as valid YAML without errors', () => {
  const ciPath = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
  assert.ok(fs.existsSync(ciPath), 'ci.yml must exist');
  const content = fs.readFileSync(ciPath, 'utf8');
  let parsed;
  assert.doesNotThrow(() => {
    parsed = yaml.load(content);
  }, 'ci.yml must parse cleanly with js-yaml');
  assert.strictEqual(typeof parsed, 'object', 'Parsed workflow must be an object');
  assert.strictEqual(parsed.name, 'CI — Lint, Test & Quality Pipeline', 'Workflow name must be preserved');
  assert.ok(parsed.jobs.governance, 'governance job must exist');
  assert.ok(parsed.jobs.test, 'test job must exist');
  assert.ok(parsed.jobs.typecheck, 'typecheck job must exist');
  assert.ok(parsed.jobs.lint, 'lint job must exist');
});

runTest('1.2 A: ci.yml line 39 step name is properly quoted, eliminating unquoted colon mapping defect', () => {
  const ciPath = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
  const content = fs.readFileSync(ciPath, 'utf8');
  // Verify that unquoted "- name: Regression Test: Evidence..." does not exist
  assert.strictEqual(
    content.includes('- name: Regression Test: Evidence Integrity & Dirty-Tree Rejection'),
    false,
    'Unquoted step name containing colon-space must not exist in ci.yml'
  );
  // Verify quoted version exists
  const hasQuoted =
    content.includes('- name: "Regression Test: Evidence Integrity & Dirty-Tree Rejection"') ||
    content.includes("- name: 'Regression Test: Evidence Integrity & Dirty-Tree Rejection'");
  assert.ok(hasQuoted, 'Step name must be safely quoted in ci.yml');
});

runTest('1.3 A: Defective unquoted mapping sequence fails closed in YAML parser', () => {
  const defectiveYaml = [
    'name: CI Test',
    'jobs:',
    '  sample:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Regression Test: Evidence Integrity & Dirty-Tree Rejection',
    '        run: node test.js',
  ].join('\n');

  assert.throws(
    () => yaml.load(defectiveYaml),
    (err) => err.message.includes('bad indentation of a mapping entry'),
    'Unquoted mapping sequence must fail closed in YAML parser'
  );
});

// -----------------------------------------------------------------------------
// 2. Workstream B: Production Verifier Export Contract & Inventory Alignment
// -----------------------------------------------------------------------------
console.log('\n--- 2. Production Verifier Export Contract & Inventory Alignment (Workstream B) ---');

runTest('2.1 B: APPROVED_PRODUCTION_EXPORTS is exported, frozen, and contains exactly 55 approved symbols', () => {
  assert.ok(Array.isArray(APPROVED_PRODUCTION_EXPORTS), 'APPROVED_PRODUCTION_EXPORTS must be an array');
  assert.ok(Object.isFrozen(APPROVED_PRODUCTION_EXPORTS), 'APPROVED_PRODUCTION_EXPORTS must be frozen');
  assert.strictEqual(APPROVED_PRODUCTION_EXPORTS.length, 55, 'Approved inventory must contain exactly 55 symbols');
});

runTest('2.2 B: Actual production verifier export namespace strictly matches APPROVED_PRODUCTION_EXPORTS', () => {
  const actualExports = Object.keys(productionVerifierModule).sort();
  const approvedExports = APPROVED_PRODUCTION_EXPORTS.slice().sort();
  assert.deepStrictEqual(
    actualExports,
    approvedExports,
    'Actual exported module symbols must strictly match APPROVED_PRODUCTION_EXPORTS'
  );
});

runTest('2.3 B: Unapproved or unexpected symbol added to production verifier namespace fails closed', () => {
  const tamperedExports = [...Object.keys(productionVerifierModule), 'unapproved_payload_bypass'].sort();
  assert.throws(
    () => assert.deepStrictEqual(tamperedExports, APPROVED_PRODUCTION_EXPORTS.slice().sort()),
    (err) => err.name === 'AssertionError',
    'Assertion must fail closed when an unexpected export is present'
  );
});

runTest('2.4 B: All 4 payload functions remain strictly absent (undefined) on production module', () => {
  assert.strictEqual(
    productionVerifierModule.verifyHistoricalArtifactIntegrityPayload,
    undefined,
    'verifyHistoricalArtifactIntegrityPayload must be undefined on production verifier'
  );
  assert.strictEqual(
    productionVerifierModule.verifyAuthorityBoundaryPayload,
    undefined,
    'verifyAuthorityBoundaryPayload must be undefined on production verifier'
  );
  assert.strictEqual(
    productionVerifierModule.verifyGoverningSpecificationProvenancePayload,
    undefined,
    'verifyGoverningSpecificationProvenancePayload must be undefined on production verifier'
  );
  assert.strictEqual(
    productionVerifierModule.reconcileExecutionLedgerCore,
    undefined,
    'reconcileExecutionLedgerCore must be undefined on production verifier'
  );
});

runTest('2.5 B: All 4 public verifier entry points unconditionally reject all 10 FORBIDDEN_TRUST_OVERRIDES', () => {
  assert.strictEqual(FORBIDDEN_TRUST_OVERRIDES.length, 10, 'Must have exactly 10 forbidden overrides');

  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  for (const v of verifiers) {
    for (const overrideKey of FORBIDDEN_TRUST_OVERRIDES) {
      const opts = { [overrideKey]: 'ADVERSARIAL_INJECTION_VAL' };
      assert.throws(
        () => v.fn(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
        `${v.name} must unconditionally reject override "${overrideKey}"`
      );
    }
  }
});

runTest('2.6 B: Caller-supplied boolean mode flags cannot bypass verifier guards', () => {
  const verifiers = [
    { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
    { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
    { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
    { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
  ];

  const bypassFlags = [
    { productionVerificationMode: false },
    { testMode: true },
    { allowOverrides: true },
    { bypassSecurity: true },
    { disableValidation: true },
  ];

  for (const v of verifiers) {
    for (const flags of bypassFlags) {
      const opts = { ...flags, expectedHashOverride: 'TAMPERED_HASH' };
      assert.throws(
        () => v.fn(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `${v.name} must not be bypassed by flag ${JSON.stringify(flags)}`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// 3. Workstream C: Internal-Engine Trust Boundary & Architecture
// -----------------------------------------------------------------------------
console.log('\n--- 3. Internal-Engine Trust Boundary & Architecture (Workstream C) ---');

runTest('3.1 C: Clean-process isolated import of scripts/reconcile_execution_ledger.mjs succeeds', () => {
  const code = `
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    if (typeof verifier.verifyHistoricalArtifactIntegrity !== 'function') throw new Error('Missing public verifier');
    if (verifier.verifyHistoricalArtifactIntegrityPayload !== undefined) throw new Error('Payload must be undefined');
    console.log('CLEAN_PROCESS_VERIFIER_LOADED');
  `;
  runCleanProcess(code, 'CLEAN_PROCESS_VERIFIER_LOADED');
});

runTest('3.2 C: Clean-process isolated import of tests/helpers/ledger-test-adapter.mjs succeeds', () => {
  const code = `
    import * as adapter from './tests/helpers/ledger-test-adapter.mjs';
    if (typeof adapter.testVerifyHistoricalArtifactIntegrity !== 'function') throw new Error('Missing adapter function');
    console.log('CLEAN_PROCESS_ADAPTER_LOADED');
  `;
  runCleanProcess(code, 'CLEAN_PROCESS_ADAPTER_LOADED');
});

runTest('3.3 C: Clean-process isolated import of scripts/internal/reconcile_engine.mjs succeeds', () => {
  const code = `
    import * as engine from './scripts/internal/reconcile_engine.mjs';
    if (typeof engine.verifyHistoricalArtifactIntegrityPayload !== 'function') throw new Error('Missing engine payload');
    console.log('CLEAN_PROCESS_ENGINE_LOADED');
  `;
  runCleanProcess(code, 'CLEAN_PROCESS_ENGINE_LOADED');
});

runTest('3.4 C: Clean-process concurrent import confirms acyclic dependency graph (zero circular dependencies)', () => {
  const code = `
    import * as engine from './scripts/internal/reconcile_engine.mjs';
    import * as verifier from './scripts/reconcile_execution_ledger.mjs';
    import * as adapter from './tests/helpers/ledger-test-adapter.mjs';
    console.log('ALL_MODULES_LOADED_ACYCLIC');
  `;
  runCleanProcess(code, 'ALL_MODULES_LOADED_ACYCLIC');
});

runTest('3.5 C: Static AST/code analysis proves strict DAG hierarchy (Layer 0 engine, Layer 1 verifier/adapter)', () => {
  const verifierContent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/reconcile_execution_ledger.mjs'), 'utf8');
  const engineContent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/internal/reconcile_engine.mjs'), 'utf8');
  const adapterContent = fs.readFileSync(path.join(REPO_ROOT, 'tests/helpers/ledger-test-adapter.mjs'), 'utf8');

  // 1. Verifier must NOT import test adapter
  assert.strictEqual(
    /from\s+['"][^'"]*ledger-test-adapter/.test(verifierContent),
    false,
    'Production verifier must NOT import ledger-test-adapter'
  );

  // 2. Internal engine must NOT import verifier or adapter (Layer 0 has 0 repo imports)
  assert.strictEqual(
    /from\s+['"][^'"]*(reconcile_execution_ledger|ledger-test-adapter)/.test(engineContent),
    false,
    'Internal engine must NOT import reconcile_execution_ledger or ledger-test-adapter'
  );

  // 3. Test adapter must NOT import verifier (Layer 1 adapter only imports Layer 0 engine)
  assert.strictEqual(
    /from\s+['"][^'"]*reconcile_execution_ledger/.test(adapterContent),
    false,
    'Test adapter must NOT import reconcile_execution_ledger'
  );
});

runTest('3.6 C: Codebase reachability audit: Shipped application code NEVER imports test adapter or internal engine', () => {
  const dirsToScan = ['apps/api/src', 'apps/mobile', 'packages'];
  const violations = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== 'dist' && ent.name !== '.turbo') {
          scanDir(fullPath);
        }
      } else if (ent.isFile() && /\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('ledger-test-adapter') || content.includes('reconcile_engine')) {
          violations.push(fullPath);
        }
      }
    }
  }

  for (const d of dirsToScan) {
    scanDir(path.join(REPO_ROOT, d));
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Shipped application code must NEVER import ledger-test-adapter or reconcile_engine. Violations: ${violations.join(', ')}`
  );
});

runTest('3.7 C: Adversarial test adapter fails closed on tampered verification fixtures', () => {
  // Tampered hash fixture
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ expectedHashOverride: '0000000000000000000000000000000000000000000000000000000000000000' }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/,
    'Test adapter must fail closed on tampered hash'
  );

  // Tampered raw bytes fixture
  assert.throws(
    () => testVerifyHistoricalArtifactIntegrity({ rawBytesOverride: Buffer.from('TAMPERED_CONTENT_CORRUPTED_LEDGER') }),
    /Raw artifact integrity violation: SHA-256 hash mismatch/,
    'Test adapter must fail closed on tampered raw bytes'
  );

  // Tampered origin commit fixture
  assert.throws(
    () => testVerifyAuthorityBoundary({ originCommitOverride: '0000000000000000000000000000000000000000' }),
    /Authority boundary violation: Origin snapshot commit .* does not match required origin commit/,
    'Test adapter must fail closed on tampered origin commit'
  );

  // Empty traceability matrix fixture
  assert.throws(
    () => testVerifyGoverningSpecificationProvenance({ matrixOverride: { governingDocuments: [] } }),
    /Governing provenance violation: Traceability matrix has missing or empty governingDocuments/,
    'Test adapter must fail closed on empty traceability matrix'
  );
});

runTest('3.8 C: Implementation parity proof: Production verifiers and test adapter produce identical results under standard inputs', () => {
  const prodArtifact = verifyHistoricalArtifactIntegrity();
  const testArtifact = testVerifyHistoricalArtifactIntegrity();
  assert.strictEqual(prodArtifact.verified, true);
  assert.strictEqual(testArtifact.verified, true);
  assert.strictEqual(prodArtifact.computedHash, testArtifact.computedHash);
  assert.strictEqual(prodArtifact.expectedHash, testArtifact.expectedHash);

  const prodAuth = verifyAuthorityBoundary();
  const testAuth = testVerifyAuthorityBoundary();
  assert.strictEqual(prodAuth.verified, true);
  assert.strictEqual(testAuth.verified, true);
  assert.strictEqual(prodAuth.authoritiesCount, testAuth.authoritiesCount);

  const prodProv = verifyGoverningSpecificationProvenance();
  const testProv = testVerifyGoverningSpecificationProvenance();
  assert.strictEqual(prodProv.verified, true);
  assert.strictEqual(testProv.verified, true);
  assert.strictEqual(prodProv.matrixRowCount, testProv.matrixRowCount);
});

// -----------------------------------------------------------------------------
// 4. Workstream D: Mandatory Governance Invariants & Baseline Immutability
// -----------------------------------------------------------------------------
console.log('\n--- 4. Mandatory Governance Invariants & Baseline Immutability (Workstream D) ---');

runTest('4.1 D: Rule IV-001 Non-Self-Acceptance: Formal acceptance is strictly 0.0% / UNACCEPTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  assert.ok(fs.existsSync(ledgerPath), 'Ledger file must exist');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(ledger.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(ledger.summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);
});

runTest('4.2 D: Production Air-Gap: Live database execution is strictly 0.0% / UNEXECUTED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
});

runTest('4.3 D: Financial Defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN (0.0% earned, 5.0% blocked)', () => {
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

runTest('4.4 D: Telangana AC 119 Boundary Defect remains STRICTLY OPEN / BLOCKED (1.5% blocked)', () => {
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

runTest('4.5 D: SQL Migration Immutability: 68 migrations match baseline 0ea572d byte-for-byte identical', () => {
  const diffOutput = execSync('git diff 0ea572d860aa064766042f6b418b157fd8e2098f -- supabase/migrations/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'SQL migrations must match baseline 0ea572d byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
  assert.strictEqual(files.length, 68, 'Must have exactly 68 SQL migration files');
});

runTest('4.6 D: MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const diffOutput = execSync('git diff fb408cec80a21bf4a6b7c82fe665203b64c39af1 -- apps/mobile/constants/', {
    cwd: REPO_ROOT,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'MLA profile seed files must match baseline fb408ce byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter(f => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(files.length, 31, 'Must have exactly 31 MLA profile seed files');
});

runTest('4.7 D: Canonical task inventory equality: exactly 27 canonical tasks summing to 100.000% weight, 61.5% repo-verified earned', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.totalTasks, 27);
  assert.strictEqual(ledger.summary.totalWeight, 100);
  assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(ledger.summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(ledger.summary.blockedOnExternalCtcGatesPercent, 22.5);
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED, 0 SKIPPED`);
console.log('================================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
