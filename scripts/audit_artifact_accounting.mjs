#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Artifact Accounting and Provenance Audit
 * 
 * Fulfills CTO Directive 076 requirements:
 * - Mechanically recomputes manifest entry counts and asserts exactness
 * - Verifies zero duplicate paths in the deliverable manifest
 * - Verifies existence, byte length, SHA-256, and Git blob SHA for all deliverables
 * - Verifies authoritative population base manifest separately from deliverables
 * - Reconciles category subtotals against the authoritative artifact list
 * - Verifies git provenance coordinates (baseline, implementation commit, immediate parent)
 * - Fails closed on any discrepancy, missing file, hash mismatch, or categorization drift
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'reports/evidence/financial_remediation_manifest_sha256.json');

console.log('================================================================');
console.log('KSHETRA W021.5 — DIRECTIVE 076 ARTIFACT ACCOUNTING AUDIT');
console.log('================================================================');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`FAIL: Manifest file not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// ----------------------------------------------------------------------------
// 1. Authoritative Population Base Manifest Audit
// ----------------------------------------------------------------------------
console.log('\n--- 1. Authoritative Population Base Manifest Audit ---');
const baseManifestInfo = manifest.authoritativeAffidavitManifest;
if (!baseManifestInfo) {
  console.error('FAIL: Missing authoritativeAffidavitManifest section in checksum manifest');
  process.exit(1);
}

const baseManifestFilePath = path.join(REPO_ROOT, baseManifestInfo.path);
if (!fs.existsSync(baseManifestFilePath)) {
  console.error(`FAIL: Authoritative base manifest not found on disk: ${baseManifestFilePath}`);
  process.exit(1);
}

const baseBuf = fs.readFileSync(baseManifestFilePath);
const baseComputedSha256 = crypto.createHash('sha256').update(baseBuf).digest('hex');
const baseComputedSize = baseBuf.length;
const baseGitBlobSha = execSync(`git hash-object ${baseManifestFilePath}`, { encoding: 'utf8' }).trim();

if (baseComputedSha256 !== baseManifestInfo.expectedSha256 || baseComputedSha256 !== baseManifestInfo.computedSha256) {
  console.error(`FAIL: Authoritative base manifest SHA-256 mismatch: expected ${baseManifestInfo.expectedSha256}, got ${baseComputedSha256}`);
  process.exit(1);
}
if (baseComputedSize !== baseManifestInfo.expectedByteLength || baseComputedSize !== baseManifestInfo.computedByteLength) {
  console.error(`FAIL: Authoritative base manifest size mismatch: expected ${baseManifestInfo.expectedByteLength}, got ${baseComputedSize}`);
  process.exit(1);
}
if (baseGitBlobSha !== baseManifestInfo.gitBlobSha) {
  console.error(`FAIL: Authoritative base manifest git blob SHA mismatch: expected ${baseManifestInfo.gitBlobSha}, got ${baseGitBlobSha}`);
  process.exit(1);
}
console.log(`[PASS] Authoritative base manifest verified: ${baseManifestInfo.path} (${baseComputedSize} bytes, 4,523 population)`);

// ----------------------------------------------------------------------------
// 2. Deliverable Entry Count and Duplicate Path Audit
// ----------------------------------------------------------------------------
console.log('\n--- 2. Deliverable Entry Count and Duplicate Path Audit ---');
const deliverables = manifest.deliverables;
if (!Array.isArray(deliverables)) {
  console.error('FAIL: manifest.deliverables is not an array');
  process.exit(1);
}

const deliverableCount = deliverables.length;
console.log(`Total deliverable entries in manifest: ${deliverableCount}`);

const seenPaths = new Set();
const duplicatePaths = [];

for (const item of deliverables) {
  if (seenPaths.has(item.path)) {
    duplicatePaths.push(item.path);
  }
  seenPaths.add(item.path);
}

if (duplicatePaths.length > 0) {
  console.error(`FAIL: Duplicate paths detected in deliverables: ${duplicatePaths.join(', ')}`);
  process.exit(1);
}
console.log(`[PASS] Zero duplicate paths detected across all ${deliverableCount} deliverables`);

// ----------------------------------------------------------------------------
// 3. Bit-for-Bit Deliverable Verification Audit
// ----------------------------------------------------------------------------
console.log('\n--- 3. Bit-for-Bit Deliverable Verification Audit ---');
let verifiedCount = 0;

for (let i = 0; i < deliverables.length; i++) {
  const item = deliverables[i];
  const fullPath = path.join(REPO_ROOT, item.path);

  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: Deliverable file missing on disk: ${item.path}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(fullPath);
  const computedSha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const computedSize = buf.length;
  const computedBlobSha = execSync(`git hash-object ${fullPath}`, { encoding: 'utf8' }).trim();

  if (computedSha256 !== item.sha256) {
    console.error(`FAIL: SHA-256 mismatch for ${item.path}: manifest=${item.sha256}, disk=${computedSha256}`);
    process.exit(1);
  }

  if (computedSize !== item.byteLength) {
    console.error(`FAIL: Byte length mismatch for ${item.path}: manifest=${item.byteLength}, disk=${computedSize}`);
    process.exit(1);
  }

  if (computedBlobSha !== item.gitBlobSha) {
    console.error(`FAIL: Git blob SHA mismatch for ${item.path}: manifest=${item.gitBlobSha}, git=${computedBlobSha}`);
    process.exit(1);
  }

  verifiedCount++;
}

console.log(`[PASS] All ${verifiedCount} deliverables match 100% bit-for-bit with disk and git blob objects`);

// ----------------------------------------------------------------------------
// 4. Exact Category Breakdown Reconciliation
// ----------------------------------------------------------------------------
console.log('\n--- 4. Category Breakdown Reconciliation ---');

const CATEGORIES = {
  'A_HARNESS': {
    name: 'Baseline Verifier & Core Test Harness',
    expectedCount: 3,
    paths: new Set([
      'scripts/verify_financial_remediation.mjs',
      'scripts/tests/financial_remediation.test.mjs',
      'tests/financial_remediation.test.mjs'
    ])
  },
  'B_FIXTURES': {
    name: 'Synthetic Test Fixtures',
    expectedCount: 5,
    paths: new Set([
      'scripts/tests/fixtures/fixture_manifest.json',
      'scripts/tests/fixtures/fixture_crosswalk.json',
      'scripts/tests/fixtures/fixture_component_ledger.json',
      'scripts/tests/fixtures/fixture_reconciled_inventory.json',
      'scratch/directive_059/fixture_source_profiles.ts'
    ])
  },
  'C_MOBILE': {
    name: 'Mobile Client Integration Contracts & Components',
    expectedCount: 10,
    paths: new Set([
      'apps/mobile/lib/affidavitTypes.ts',
      'apps/mobile/lib/legislatorProfileTypes.ts',
      'apps/mobile/components/AffidavitCard.tsx',
      'apps/mobile/components/legislator/FinancialBreakdownCard.tsx',
      'apps/mobile/__tests__/FinancialBreakdownCard.test.tsx',
      'apps/mobile/components/WealthTimeline.tsx',
      'apps/mobile/stores/affidavits.ts',
      'apps/mobile/stores/legislatorProfiles.ts',
      'apps/mobile/app/legislator/[id].tsx',
      'apps/mobile/app/parliament/index.tsx'
    ])
  },
  'D_DEMOGRAPHICS': {
    name: 'Demographic Reconciliation Ledgers',
    expectedCount: 2,
    paths: new Set([
      'reports/w021_5_demographic_seed_reconciliation_ledger.json',
      'reports/w021_5_demographic_seed_reconciliation_ledger.md'
    ])
  },
  'E_MATRICES': {
    name: 'Requirements & Traceability Matrices',
    expectedCount: 3,
    paths: new Set([
      'reports/w021_5_application_consumer_compatibility_matrix.json',
      'reports/w021_5_financial_remediation_requirements_matrix.json',
      'reports/w021_5_financial_remediation_test_isolation_matrix.json'
    ])
  },
  'F_105_TEST_EVIDENCE': {
    name: '105-Test Battery Evidence',
    expectedCount: 3,
    paths: new Set([
      'reports/evidence/financial_remediation_test_stdout.txt',
      'reports/evidence/financial_remediation_test_stderr.txt',
      'reports/evidence/financial_remediation_test_results.json'
    ])
  },
  'G_HISTORICAL_REPORTS': {
    name: 'Historical Directive Implementation Reports (067, 068, 069, 071)',
    expectedCount: 4,
    paths: new Set([
      'reports/W021.5-CTO-DIRECTIVE-067-IMPLEMENTATION-REPORT.md',
      'reports/W021.5-CTO-DIRECTIVE-068-IMPLEMENTATION-REPORT.md',
      'reports/W021.5-CTO-DIRECTIVE-069-IMPLEMENTATION-REPORT.md',
      'reports/W021.5-CTO-DIRECTIVE-071-IMPLEMENTATION-REPORT.md'
    ])
  },
  'H_ROOT_TEST_DELEGATOR': {
    name: 'Root Test Delegator',
    expectedCount: 1,
    paths: new Set([
      'tests/adjudication_manifest.test.mjs'
    ])
  },
  'I_ADJUDICATION_072_075': {
    name: 'Adjudication Engine, Evidence & Directives 072–075 Deliverables',
    expectedCount: 13,
    paths: new Set([
      'reports/w021_5_financial_remediation_adjudication_manifest.json',
      'reports/w021_5_financial_remediation_adjudication_summary.json',
      'scripts/tests/adjudication_manifest.test.mjs',
      'reports/W021.5-CTO-DIRECTIVE-072-IMPLEMENTATION-REPORT.md',
      'reports/evidence/adjudication_manifest_test_stdout.txt',
      'reports/evidence/adjudication_manifest_test_results.json',
      'scripts/generate_adjudication_manifest.mjs',
      'scripts/audit_adjudication_reconciliation.mjs',
      'scripts/generate_adjudication_summary.mjs',
      'reports/W021.5-CTO-DIRECTIVE-073-IMPLEMENTATION-REPORT.md',
      'scripts/adjudication_validators.mjs',
      'reports/W021.5-CTO-DIRECTIVE-074-IMPLEMENTATION-REPORT.md',
      'reports/W021.5-CTO-DIRECTIVE-075-IMPLEMENTATION-REPORT.md'
    ])
  },
  'J_DIRECTIVE_076': {
    name: 'Directive 076 Provenance & Accounting Deliverables',
    expectedCount: 2,
    paths: new Set([
      'scripts/audit_artifact_accounting.mjs',
      'reports/W021.5-CTO-DIRECTIVE-076-IMPLEMENTATION-REPORT.md'
    ])
  },
    'K_DIRECTIVE_077': {
    name: 'Directive 077 Provenance Closure Deliverables',
    expectedCount: 1,
    paths: new Set([
      'reports/W021.5-CTO-DIRECTIVE-077-IMPLEMENTATION-REPORT.md'
    ])
  },
  'L_DIRECTIVE_078': {
    name: 'Directive 078 Generation-Time & Evidence-Freshness Deliverables',
    expectedCount: 2,
    paths: new Set([
      'scripts/generate_checksum_manifest.mjs',
      'reports/W021.5-CTO-DIRECTIVE-078-IMPLEMENTATION-REPORT.md'
    ])
  }
};

let totalExpectedInCategories = 0;
const categorizedPaths = new Set();

for (const [key, cat] of Object.entries(CATEGORIES)) {
  totalExpectedInCategories += cat.expectedCount;
  if (cat.paths.size !== cat.expectedCount) {
    console.error(`FAIL: Category ${key} expectedCount (${cat.expectedCount}) does not match paths set size (${cat.paths.size})`);
    process.exit(1);
  }
  for (const p of cat.paths) {
    if (categorizedPaths.has(p)) {
      console.error(`FAIL: Overlapping category assignment for path: ${p}`);
      process.exit(1);
    }
    categorizedPaths.add(p);
  }
}

// Check every deliverable is categorized
const uncategorized = [];
for (const item of deliverables) {
  if (!categorizedPaths.has(item.path)) {
    uncategorized.push(item.path);
  }
}

if (uncategorized.length > 0) {
  console.error(`FAIL: Uncategorized deliverables found: ${uncategorized.join(', ')}`);
  process.exit(1);
}

// Check every categorized path is present in deliverables
const missingFromDeliverables = [];
for (const p of categorizedPaths) {
  if (!seenPaths.has(p)) {
    missingFromDeliverables.push(p);
  }
}

if (missingFromDeliverables.length > 0) {
  console.error(`FAIL: Categorized paths missing from deliverables: ${missingFromDeliverables.join(', ')}`);
  process.exit(1);
}

console.log('Category Subtotals:');
for (const [key, cat] of Object.entries(CATEGORIES)) {
  console.log(`  - ${cat.name}: ${cat.expectedCount} files`);
}
console.log(`Sum of Categories: ${totalExpectedInCategories} files`);
console.log(`Manifest Deliverables Total: ${deliverables.length} files`);
console.log(`[PASS] Exact 1-to-1 match between all category subtotals and manifest deliverables (${deliverables.length} files)`);

// ----------------------------------------------------------------------------
// 5. Git Provenance Coordinates Audit
// ----------------------------------------------------------------------------
console.log('\n--- 5. Git Provenance Coordinates Audit ---');
const baseline = manifest.gitBaseline;
if (!baseline) {
  console.error('FAIL: Missing gitBaseline section in checksum manifest');
  process.exit(1);
}

const EXPECTED_COORDINATES = {
  directive074DeliveryCommit: 'accf4b43db814d5440a1c0e913ac76b50b1e98a4',
  directive075BaselineCommit: 'accf4b43db814d5440a1c0e913ac76b50b1e98a4',
  directive075DeliveryCommit: 'bce18bd8509f5d9244dc756c86708395aaa4f8cb',
  directive076BaselineCommit: 'bce18bd8509f5d9244dc756c86708395aaa4f8cb',
  directive076ImplementationCommit: 'bd2d7a93207c88a40406173f1a9663bd7185a2c5',
  directive076ImmediateParent: 'bce18bd8509f5d9244dc756c86708395aaa4f8cb',
  directive076ClosureCommit: '36e202a2dcd7a6470a0327d2f84a6902c546339b',
  directive076ClosureImmediateParent: 'bd2d7a93207c88a40406173f1a9663bd7185a2c5',
  directive077BaselineCommit: '36e202a2dcd7a6470a0327d2f84a6902c546339b',
  directive077DeliveryCommit: 'e3359d35ca47700c0c65093122ab3c4cee2dc342',
  directive077ImmediateParent: '36e202a2dcd7a6470a0327d2f84a6902c546339b',
  directive078BaselineCommit: 'e3359d35ca47700c0c65093122ab3c4cee2dc342'
};

for (const [key, expectedSha] of Object.entries(EXPECTED_COORDINATES)) {
  if (baseline[key] !== expectedSha) {
    console.error(`FAIL: Provenance coordinate ${key} mismatch: expected ${expectedSha}, got ${baseline[key]}`);
    process.exit(1);
  }
}

// Verify commits in Git
try {
  const d075CommitParent = execSync(`git rev-parse ${EXPECTED_COORDINATES.directive075DeliveryCommit}~1`, { encoding: 'utf8' }).trim();
  if (d075CommitParent !== EXPECTED_COORDINATES.directive075BaselineCommit) {
    console.error(`FAIL: Directive 075 delivery commit parent (${d075CommitParent}) does not match baseline (${EXPECTED_COORDINATES.directive075BaselineCommit})`);
    process.exit(1);
  }
  console.log(`[PASS] Directive 075 delivery commit parent confirmed: ${d075CommitParent}`);

  const d076CommitParent = execSync(`git rev-parse ${EXPECTED_COORDINATES.directive076ImplementationCommit}~1`, { encoding: 'utf8' }).trim();
  if (d076CommitParent !== EXPECTED_COORDINATES.directive076BaselineCommit) {
    console.error(`FAIL: Directive 076 implementation commit parent (${d076CommitParent}) does not match baseline (${EXPECTED_COORDINATES.directive076BaselineCommit})`);
    process.exit(1);
  }
  console.log(`[PASS] Directive 076 implementation commit parent confirmed: ${d076CommitParent}`);

  const d076ClosureParent = execSync(`git rev-parse ${EXPECTED_COORDINATES.directive076ClosureCommit}~1`, { encoding: 'utf8' }).trim();
  if (d076ClosureParent !== EXPECTED_COORDINATES.directive076ImplementationCommit) {
    console.error(`FAIL: Directive 076 closure commit parent (${d076ClosureParent}) does not match implementation commit (${EXPECTED_COORDINATES.directive076ImplementationCommit})`);
    process.exit(1);
  }
  console.log(`[PASS] Directive 076 closure commit parent confirmed: ${d076ClosureParent}`);

  const d077CommitParent = execSync(`git rev-parse ${EXPECTED_COORDINATES.directive077DeliveryCommit}~1`, { encoding: 'utf8' }).trim();
  if (d077CommitParent !== EXPECTED_COORDINATES.directive076ClosureCommit) {
    console.error(`FAIL: Directive 077 delivery commit parent (${d077CommitParent}) does not match baseline (${EXPECTED_COORDINATES.directive076ClosureCommit})`);
    process.exit(1);
  }
  console.log(`[PASS] Directive 077 delivery commit parent confirmed: ${d077CommitParent}`);
} catch (err) {
  console.error(`FAIL: Could not verify commit parent via git: ${err.message}`);
  process.exit(1);
}

console.log('[PASS] All git provenance baseline and delivery coordinates verified');

// ----------------------------------------------------------------------------
// 6. Checksum Manifest Generation-Time & Evidence-Freshness Audit
// ----------------------------------------------------------------------------
console.log('\n--- 6. Checksum Manifest Generation-Time & Evidence-Freshness Audit ---');
const generatedAt = manifest.generatedAt;
if (!generatedAt || typeof generatedAt !== 'string') {
  console.error('FAIL: Missing or invalid generatedAt timestamp in checksum manifest');
  process.exit(1);
}

// 1. Validate ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)
const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
if (!iso8601Regex.test(generatedAt)) {
  console.error(`FAIL: manifest.generatedAt is not a valid ISO 8601 UTC timestamp: ${generatedAt}`);
  process.exit(1);
}

const manifestTime = new Date(generatedAt).getTime();
if (isNaN(manifestTime)) {
  console.error(`FAIL: manifest.generatedAt parsed to NaN: ${generatedAt}`);
  process.exit(1);
}
console.log(`[PASS] manifest.generatedAt format valid: ${generatedAt}`);

// 2. Evidence freshness checks against included evidence files
const evidenceFilesToCheck = [
  { path: 'reports/evidence/financial_remediation_test_results.json', dateField: 'executionDate' },
  { path: 'reports/evidence/adjudication_manifest_test_results.json', dateField: 'executedAt' },
  { path: 'reports/w021_5_financial_remediation_adjudication_manifest.json', dateField: 'generatedAt' },
  { path: 'reports/w021_5_financial_remediation_adjudication_summary.json', dateField: 'generatedAt' }
];

for (const evidenceSpec of evidenceFilesToCheck) {
  const fullEvidencePath = path.join(REPO_ROOT, evidenceSpec.path);
  if (!fs.existsSync(fullEvidencePath)) {
    console.error(`FAIL: Evidence file missing for freshness audit: ${evidenceSpec.path}`);
    process.exit(1);
  }

  const evidenceData = JSON.parse(fs.readFileSync(fullEvidencePath, 'utf8'));
  const evidenceDateStr = evidenceData[evidenceSpec.dateField];
  if (!evidenceDateStr) {
    console.error(`FAIL: Missing ${evidenceSpec.dateField} in evidence file: ${evidenceSpec.path}`);
    process.exit(1);
  }

  const evidenceTime = new Date(evidenceDateStr).getTime();
  if (isNaN(evidenceTime)) {
    console.error(`FAIL: Unparseable date in evidence file ${evidenceSpec.path}: ${evidenceDateStr}`);
    process.exit(1);
  }

  if (manifestTime < evidenceTime) {
    console.error(`FAIL: Stale manifest detected! manifest.generatedAt (${generatedAt}) is earlier than ${evidenceSpec.path} ${evidenceSpec.dateField} (${evidenceDateStr})`);
    process.exit(1);
  }

  console.log(`[PASS] Evidence freshness confirmed for ${evidenceSpec.path} (${evidenceSpec.dateField}: ${evidenceDateStr} <= manifest: ${generatedAt})`);
}

console.log('\n================================================================');
console.log('AUDIT RESULT: 100% PASS (All checks and invariants satisfied)');
console.log('================================================================');
process.exit(0);
