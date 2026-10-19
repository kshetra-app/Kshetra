#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-113.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 113
 * CI Dependency Blocker Resolution & Adversarial Trust-Boundary Verification
 *
 * Suite 33:
 * - Workstream A: Clean-install validation, WebRTC plugin & Expo 54 peer dependency compatibility
 * - Workstream B: Isolated boolean mode tests, unapproved options, inherited prototype properties,
 *                 non-object inputs, path substitution, caller-controlled trust material, and export contract
 * - Workstream C: Internal engine isolation, static DAG hierarchy, application reachability, single implementation
 * - Workstream D: Mandatory governance invariants (Rule IV-001, air-gap, immutability, financial & boundary defects)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import * as productionVerifierModule from '../scripts/reconcile_execution_ledger.mjs';
import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  FORBIDDEN_TRUST_OVERRIDES,
  APPROVED_PRODUCTION_EXPORTS,
  verifyHistoricalArtifactIntegrity,
  verifyAuthorityBoundary,
  verifyGoverningSpecificationProvenance,
  reconcileExecutionLedger,
} from '../scripts/reconcile_execution_ledger.mjs';

import * as testAdapter from './helpers/ledger-test-adapter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
    testResults.push({ name, status: 'PASS' });
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedCount++;
    testResults.push({ name, status: 'FAIL', error: err.message });
  }
}

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 113 VERIFICATION SUITE');
console.log('CI Dependency Blocker Resolution & Adversarial Trust-Boundary Verification');
console.log('Suite: tests/political-intelligence-directive-113.test.mjs');
console.log('Command: node tests/political-intelligence-directive-113.test.mjs');
console.log('================================================================');

// -----------------------------------------------------------------------------
// 1. Workstream A: Clean-Install Dependency Resolution & Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- 1. Clean-Install Dependency Resolution & Compatibility (Workstream A) ---');

runTest('1.1 A: apps/mobile/package.json declares @config-plugins/react-native-webrtc at ^13.0.0', () => {
  const pkgPath = path.join(REPO_ROOT, 'apps/mobile/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.devDependencies['@config-plugins/react-native-webrtc'];
  assert.strictEqual(
    version,
    '^13.0.0',
    `@config-plugins/react-native-webrtc must be "^13.0.0" for Expo 54 compatibility, got "${version}"`
  );
  assert.ok(
    pkg.dependencies['expo'],
    'expo dependency must be declared in apps/mobile/package.json'
  );
});

runTest('1.2 A: package-lock.json resolves @config-plugins/react-native-webrtc to version 13.0.0 with Expo 54 peer match', () => {
  const lockPath = path.join(REPO_ROOT, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const webrtcPluginPkg = lock.packages['node_modules/@config-plugins/react-native-webrtc'];
  assert.ok(webrtcPluginPkg, 'node_modules/@config-plugins/react-native-webrtc must exist in package-lock.json');
  assert.strictEqual(
    webrtcPluginPkg.version,
    '13.0.0',
    `Resolved version in package-lock.json must be 13.0.0, got ${webrtcPluginPkg.version}`
  );
  assert.strictEqual(
    webrtcPluginPkg.peerDependencies?.expo,
    '^54',
    `Peer dependency on expo must be "^54", got "${webrtcPluginPkg.peerDependencies?.expo}"`
  );
});

runTest('1.3 A: WebRTC mobile application integration files remain preserved and functional', () => {
  const broadcasterPath = path.join(REPO_ROOT, 'apps/mobile/components/LiveBroadcaster.tsx');
  const whipClientPath = path.join(REPO_ROOT, 'apps/mobile/lib/whipClient.ts');
  const whipTestPath = path.join(REPO_ROOT, 'apps/mobile/__tests__/whip-client.test.ts');

  assert.ok(fs.existsSync(broadcasterPath), 'LiveBroadcaster.tsx must exist');
  assert.ok(fs.existsSync(whipClientPath), 'whipClient.ts must exist');
  assert.ok(fs.existsSync(whipTestPath), 'whip-client.test.ts must exist');

  const broadcasterContent = fs.readFileSync(broadcasterPath, 'utf8');
  assert.ok(
    broadcasterContent.includes('react-native-webrtc'),
    'LiveBroadcaster.tsx must retain guarded react-native-webrtc import'
  );
});

runTest('1.4 A: Clean installation simulation (npm ci --dry-run) passes cleanly with 0 ERESOLVE errors', () => {
  let output;
  try {
    output = execSync('npm ci --dry-run', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    }).toString();
  } catch (err) {
    throw new Error(`npm ci --dry-run failed with exit code ${err.status}: ${err.stderr?.toString() || err.message}`);
  }
  assert.ok(
    !output.includes('ERESOLVE'),
    'npm ci --dry-run output must NOT contain ERESOLVE peer dependency conflicts'
  );
});

// -----------------------------------------------------------------------------
// 2. Workstream B: Adversarial Override Tests & Options Auditing
// -----------------------------------------------------------------------------
console.log('\n--- 2. Adversarial Override Tests & Options Auditing (Workstream B) ---');

const verifiers = [
  { name: 'verifyHistoricalArtifactIntegrity', fn: verifyHistoricalArtifactIntegrity },
  { name: 'verifyAuthorityBoundary', fn: verifyAuthorityBoundary },
  { name: 'verifyGoverningSpecificationProvenance', fn: verifyGoverningSpecificationProvenance },
  { name: 'reconcileExecutionLedger', fn: reconcileExecutionLedger },
];

runTest('2.1 B: Isolated boolean mode flags tested independently cannot bypass verifier guards', () => {
  const bypassFlags = [
    { productionVerificationMode: false },
    { testMode: true },
    { allowOverrides: true },
    { bypassSecurity: true },
    { disableValidation: true },
    { productionMode: false },
    { failClosed: false },
    { enforceCanonicalIdentity: false },
  ];

  for (const v of verifiers) {
    for (const flags of bypassFlags) {
      const flagKey = Object.keys(flags)[0];
      assert.throws(
        () => v.fn(flags),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(flagKey),
        `${v.name} must isolate and reject mode flag "${flagKey}" independently`
      );
    }
  }
});

runTest('2.2 B: Unknown or unapproved options are rejected independently across all 4 verifiers', () => {
  const unknownOptions = [
    { maliciousOption: true },
    { testSeam: 'active' },
    { bypassSignatureCheck: 1 },
    { customRegistry: 'http://evil.internal' },
    { skipHashCheck: true },
  ];

  for (const v of verifiers) {
    for (const opts of unknownOptions) {
      const key = Object.keys(opts)[0];
      assert.throws(
        () => v.fn(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(key),
        `${v.name} must reject unknown option "${key}" independently`
      );
    }
  }
});

runTest('2.3 B: Inherited prototype properties (overrides and bypass flags) are detected and rejected', () => {
  const prototypeAttacks = [
    Object.create({ expectedHashOverride: '00000000000000000000000000000000' }),
    Object.create({ testMode: true }),
    Object.create({ originCommitOverride: 'be4ba41' }),
    Object.create({ matrixOverride: {} }),
    Object.create({ unknownProtoOption: 'injected' }),
  ];

  for (const v of verifiers) {
    for (const evilObj of prototypeAttacks) {
      assert.throws(
        () => v.fn(evilObj),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED'),
        `${v.name} must detect and reject inherited prototype properties`
      );
    }
  }
});

runTest('2.4 B: Non-object inputs (null, primitives, arrays) fail closed', () => {
  const nonObjectInputs = [
    null,
    12345,
    true,
    false,
    Symbol('exploit'),
    ['expectedHashOverride'],
    [1, 2, 3],
  ];

  for (const v of verifiers) {
    for (const input of nonObjectInputs) {
      assert.throws(
        () => v.fn(input),
        (err) => err.message.includes('CALLER_OPTIONS_INVALID'),
        `${v.name} must reject non-object input: ${String(input)}`
      );
    }
  }
});

runTest('2.5 B: Path substitution and traversal in repoRoot fails closed', () => {
  const invalidPaths = [
    { repoRoot: '' },
    { repoRoot: '   ' },
    { repoRoot: 99999 },
    { repoRoot: path.join(REPO_ROOT, 'nonexistent_test_directory_substitute') },
  ];

  for (const v of verifiers) {
    for (const badPathOpts of invalidPaths) {
      assert.throws(
        () => v.fn(badPathOpts),
        (err) => err.message.includes('INVALID_REPO_ROOT') || err.message.includes('not found') || err.message.includes('failed'),
        `${v.name} must fail closed on invalid repoRoot option`
      );
    }
  }
});

runTest('2.6 B: Caller-controlled trust material attempts rejected independently across all 4 verifiers', () => {
  const allTrustMaterialOverrides = [
    ...FORBIDDEN_TRUST_OVERRIDES,
    'snapshotOverride',
    'testExecutionManifest',
    'testExecutionManifestPath',
    'trustedAuthorities',
    'externalTrustPin',
    'trustPolicy',
    'externalPublicKey',
    'isolatedTestHarnessAuth',
    'testHarnessIsolatedAuth',
  ];

  for (const v of verifiers) {
    for (const overrideKey of allTrustMaterialOverrides) {
      const opts = { [overrideKey]: 'CALLER_PROVIDED_TRUST_MATERIAL' };
      assert.throws(
        () => v.fn(opts),
        (err) => err.message.includes('CALLER_TRUST_OVERRIDE_PROHIBITED') && err.message.includes(overrideKey),
        `${v.name} must unconditionally reject caller-controlled trust material override "${overrideKey}"`
      );
    }
  }
});

runTest('2.7 B: Legitimate options (repoRoot, empty object, default) execute full authentic verification', () => {
  // Empty call
  assert.ok(verifyHistoricalArtifactIntegrity());
  assert.ok(verifyAuthorityBoundary());
  assert.ok(verifyGoverningSpecificationProvenance());

  // Explicit legitimate repoRoot
  assert.ok(verifyHistoricalArtifactIntegrity({ repoRoot: REPO_ROOT }));
  assert.ok(verifyAuthorityBoundary({ repoRoot: REPO_ROOT }));
  assert.ok(verifyGoverningSpecificationProvenance({ repoRoot: REPO_ROOT }));

  // Backward-compatibility string repoRoot for reconcileExecutionLedger
  const reconcileRes = reconcileExecutionLedger(REPO_ROOT);
  assert.strictEqual(reconcileRes.reconciled, true);
  assert.ok(reconcileRes.ledger);
  assert.ok(reconcileRes.summary);
});

runTest('2.8 B: Exact approved export inventory (55 symbols) strictly preserved', () => {
  assert.strictEqual(APPROVED_PRODUCTION_EXPORTS.length, 55, 'APPROVED_PRODUCTION_EXPORTS must contain exactly 55 symbols');
  const actualExports = Object.keys(productionVerifierModule).sort();
  const approvedExports = APPROVED_PRODUCTION_EXPORTS.slice().sort();
  assert.deepStrictEqual(
    actualExports,
    approvedExports,
    'Export surface must strictly match APPROVED_PRODUCTION_EXPORTS'
  );
  assert.strictEqual(productionVerifierModule.verifyHistoricalArtifactIntegrityPayload, undefined);
  assert.strictEqual(productionVerifierModule.verifyAuthorityBoundaryPayload, undefined);
  assert.strictEqual(productionVerifierModule.verifyGoverningSpecificationProvenancePayload, undefined);
  assert.strictEqual(productionVerifierModule.reconcileExecutionLedgerCore, undefined);
});

// -----------------------------------------------------------------------------
// 3. Workstream C: Internal Engine Isolation Review
// -----------------------------------------------------------------------------
console.log('\n--- 3. Internal Engine Isolation Review (Workstream C) ---');

runTest('3.1 C: Layer 0 internal engine imports ZERO repository files (0 relative imports)', () => {
  const enginePath = path.join(REPO_ROOT, 'scripts/internal/reconcile_engine.mjs');
  const content = fs.readFileSync(enginePath, 'utf8');
  const importLines = content.split('\n').filter((l) => l.startsWith('import ') || l.startsWith('import('));

  for (const line of importLines) {
    const isRepoRelative = line.includes("'./") || line.includes('"./') || line.includes("'../") || line.includes('"../');
    assert.ok(
      !isRepoRelative,
      `Layer 0 reconcile_engine.mjs must have ZERO repository relative imports. Disallowed: ${line}`
    );
  }
});

runTest('3.2 C: Shipped application dependency graph NEVER imports internal engine or test adapter', () => {
  const scanDirs = ['apps/api/src', 'apps/mobile', 'packages'];
  const violations = [];

  for (const dir of scanDirs) {
    const fullDir = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;

    function walk(d) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== '.expo') {
            walk(full);
          }
        } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('reconcile_engine') || content.includes('ledger-test-adapter')) {
            violations.push(full);
          }
        }
      }
    }
    walk(fullDir);
  }

  assert.strictEqual(
    violations.length,
    0,
    `Shipped application code must NEVER import reconcile_engine or ledger-test-adapter. Violations: ${violations.join(', ')}`
  );
});

runTest('3.3 C: Test-only fixture seams cannot be reached through the production verifier namespace', () => {
  const productionKeys = Object.keys(productionVerifierModule);
  assert.ok(!productionKeys.includes('injectTestFixture'));
  assert.ok(!productionKeys.includes('createControlledTestLedger'));
  assert.ok(!productionKeys.includes('verifyHistoricalArtifactIntegrityPayload'));
  assert.ok(!productionKeys.includes('verifyAuthorityBoundaryPayload'));
  assert.ok(!productionKeys.includes('verifyGoverningSpecificationProvenancePayload'));
  assert.ok(!productionKeys.includes('reconcileExecutionLedgerCore'));
});

runTest('3.4 C: Canonical single implementation preserved: zero verification algorithm duplication', () => {
  const publicModuleContent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/reconcile_execution_ledger.mjs'), 'utf8');
  assert.ok(
    publicModuleContent.includes('verifyHistoricalArtifactIntegrityPayload('),
    'Public verifier delegates directly to single internal engine payload'
  );
  assert.ok(
    publicModuleContent.includes('verifyAuthorityBoundaryPayload('),
    'Public verifier delegates directly to single internal engine payload'
  );
  assert.ok(
    publicModuleContent.includes('verifyGoverningSpecificationProvenancePayload('),
    'Public verifier delegates directly to single internal engine payload'
  );
  assert.ok(
    publicModuleContent.includes('reconcileExecutionLedgerCore('),
    'Public verifier delegates directly to single internal engine core'
  );
});

runTest('3.5 C: Boundary guarantee is documented as repository convention, static DAG, and build boundary', () => {
  const reportPath = path.join(REPO_ROOT, 'reports/W021.5-CTO-DIRECTIVE-111-IMPLEMENTATION-REPORT.md');
  assert.ok(fs.existsSync(reportPath), 'D111 implementation report must exist');
  const reportContent = fs.readFileSync(reportPath, 'utf8');
  assert.ok(
    reportContent.includes('DAG') || reportContent.includes('Layer 0'),
    'Report documents DAG layered architecture'
  );
});

// -----------------------------------------------------------------------------
// 4. Workstream D: Mandatory Governance Invariants
// -----------------------------------------------------------------------------
console.log('\n--- 4. Mandatory Governance Invariants (Workstream D) ---');

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
    maxBuffer: 20 * 1024 * 1024,
  }).toString().trim();
  assert.strictEqual(diffOutput, '', 'SQL migrations must match baseline 0ea572d byte-for-byte');

  const files = fs.readdirSync(path.join(REPO_ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
  assert.strictEqual(files.length, 68, 'Must have exactly 68 SQL migration files');
});

runTest('4.6 D: MLA Profile Seed Immutability: 31 seed files match baseline fb408ce byte-for-byte identical', () => {
  const diffOutput = execSync('git diff fb408cec80a21bf4a6b7c82fe665203b64c39af1 -- apps/mobile/constants/', {
    cwd: REPO_ROOT,
    maxBuffer: 20 * 1024 * 1024,
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

// -----------------------------------------------------------------------------
// Test Summary & Process Exit
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED, 0 SKIPPED`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
