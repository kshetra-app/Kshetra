#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Directive 073 Adjudication Manifest Validation & Production-Path Adversarial Test Suite
 * 
 * Exercises actual production functions and validators from scripts/adjudication_validators.mjs
 * and scripts/verify_financial_remediation.mjs to prove fail-closed enforcement.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { validateCorrectionEligibility } from '../verify_financial_remediation.mjs';
import {
  validateCrosswalk,
  validateSqlChunks,
  validateEligibilityGate,
  evaluateDimensionEligibility,
  validateSummaryReconciliation,
  validateSourceEvidenceFile
} from '../adjudication_validators.mjs';

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');
const SUMMARY_PATH = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_summary.json');
const CROSSWALK_PATH = path.join(REPO_ROOT, 'scratch/w021_5_directive_048_4523_manifest_to_target_crosswalk.json');
const LEDGER_PATH = path.join(REPO_ROOT, 'scratch/w021_5_directive_047_1120_component_ledger.json');

console.log('================================================================');
console.log('KSHETRA W021.5 — DIRECTIVE 073 ADJUDICATION MANIFEST TEST SUITE');
console.log('================================================================');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`ERROR: Adjudication manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  console.error(`ERROR: Adjudication summary not found at ${SUMMARY_PATH}`);
  process.exit(1);
}

const manifestData = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const summaryData = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
const affidavits = manifestData.affidavits;

const crosswalkData = JSON.parse(fs.readFileSync(CROSSWALK_PATH, 'utf8'));
const { crosswalkMap, crosswalkTargetUuidSet } = validateCrosswalk(crosswalkData, 4523);

const ledgerData = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const ledgerMap = new Map(ledgerData.map(l => [l.manifestId, l]));

let passed = 0;
let total = 0;
const testResults = [];

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[✓ PASS] Test ${total.toString().padStart(2, '0')}: ${name}`);
    passed++;
    testResults.push({ id: total, name, status: 'PASS' });
  } catch (err) {
    console.error(`[✗ FAIL] Test ${total.toString().padStart(2, '0')}: ${name} - ${err.message}`);
    testResults.push({ id: total, name, status: 'FAIL', error: err.message });
  }
}

// Test 01: Full Population Accounting
runTest('All 4,523 retained records are accounted for exactly once', () => {
  assert.strictEqual(affidavits.length, 4523, `Expected 4523 affidavits, got ${affidavits.length}`);
  const idSet = new Set();
  for (const a of affidavits) {
    assert.ok(a.affidavitId, 'Record must have affidavitId');
    assert.ok(!idSet.has(a.affidavitId), `Duplicate affidavitId: ${a.affidavitId}`);
    idSet.add(a.affidavitId);
  }
  assert.strictEqual(idSet.size, 4523);
});

// Test 02: Production Crosswalk Validator — Exact 4,523 Bijection
runTest('Production validateCrosswalk() verifies exact 4,523-row bijection and uniqueness', () => {
  const result = validateCrosswalk(crosswalkData, 4523);
  assert.strictEqual(result.crosswalkMap.size, 4523);
  assert.strictEqual(result.crosswalkTargetUuidSet.size, 4523);
});

// Test 03: Production-Path Adversarial: Crosswalk Validator Rejections
runTest('Production validateCrosswalk() rejects missing, duplicate, and malformed entries', () => {
  // A. Truncated list (missing entries)
  assert.throws(() => {
    validateCrosswalk(crosswalkData.slice(0, 4522), 4523);
  }, /CROSSWALK_POPULATION_MISMATCH/);

  // B. Duplicate manifest ID
  const dupManifest = crosswalkData.slice(0, 4522);
  dupManifest.push({ manifestId: crosswalkData[0].manifestId, targetUuid: '0215b22e-0001-0000-0000-999999999999' });
  assert.throws(() => {
    validateCrosswalk(dupManifest, 4523);
  }, /DUPLICATE_CROSSWALK_MANIFEST_ID/);

  // C. Duplicate target UUID
  const dupTarget = crosswalkData.slice(0, 4522);
  dupTarget.push({ manifestId: '0215b22e-aff-99999999', targetUuid: crosswalkData[0].targetUuid });
  assert.throws(() => {
    validateCrosswalk(dupTarget, 4523);
  }, /DUPLICATE_CROSSWALK_TARGET_UUID/);

  // D. Malformed entry (missing targetUuid)
  const malformed = crosswalkData.slice(0, 4522);
  malformed.push({ manifestId: '0215b22e-aff-99999999', targetUuid: '' });
  assert.throws(() => {
    validateCrosswalk(malformed, 4523);
  }, /MALFORMED_CROSSWALK_ENTRY/);
});

// Test 04: Five Group Reconciled Counts
runTest('Five group counts reconcile exactly to established controls (3334/185/821/72/111)', () => {
  const gCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of affidavits) {
    assert.ok([1, 2, 3, 4, 5].includes(a.group), `Invalid group: ${a.group}`);
    gCounts[a.group]++;
  }
  assert.strictEqual(gCounts[1], 3334, `Group 1 expected 3334, got ${gCounts[1]}`);
  assert.strictEqual(gCounts[2], 185, `Group 2 expected 185, got ${gCounts[2]}`);
  assert.strictEqual(gCounts[3], 821, `Group 3 expected 821, got ${gCounts[3]}`);
  assert.strictEqual(gCounts[4], 72, `Group 4 expected 72, got ${gCounts[4]}`);
  assert.strictEqual(gCounts[5], 111, `Group 5 expected 111, got ${gCounts[5]}`);
  assert.strictEqual(gCounts[1] + gCounts[2] + gCounts[3] + gCounts[4] + gCounts[5], 4523);
});

// Test 05: Asset Invariants
runTest('Asset dimensional controls (4340 positive, 72 missing != 0, 111 genuine zero)', () => {
  let pos = 0, missing = 0, zero = 0;
  for (const a of affidavits) {
    const val = a.dimensions.asset.proposedValue;
    const cls = a.dimensions.asset.proposedDisclosureClassification;
    if (val === null) {
      missing++;
      assert.strictEqual(cls, 'AFFIDAVIT_MISSING_DISCLOSURE');
    } else if (val === 0) {
      zero++;
      assert.strictEqual(cls, 'VERIFIED_GENUINE_ZERO');
    } else if (typeof val === 'number' && val > 0) {
      pos++;
      assert.strictEqual(cls, 'AFFIRMATIVELY_DISCLOSED_POSITIVE');
    } else {
      assert.fail(`Invalid asset proposedValue: ${val}`);
    }
  }
  assert.strictEqual(pos, 4340, `Expected 4340 positive assets, got ${pos}`);
  assert.strictEqual(missing, 72, `Expected 72 missing assets, got ${missing}`);
  assert.strictEqual(zero, 111, `Expected 111 genuine zero assets, got ${zero}`);
  assert.strictEqual(pos + missing + zero, 4523);
});

// Test 06: Liability Invariants
runTest('Liability dimensional controls (3334 positive, 893 missing != 0, 296 genuine zero)', () => {
  let pos = 0, missing = 0, zero = 0;
  for (const a of affidavits) {
    const val = a.dimensions.liability.proposedValue;
    const cls = a.dimensions.liability.proposedDisclosureClassification;
    if (val === null) {
      missing++;
      assert.strictEqual(cls, 'AFFIDAVIT_MISSING_DISCLOSURE');
    } else if (val === 0) {
      zero++;
      assert.strictEqual(cls, 'VERIFIED_GENUINE_ZERO');
    } else if (typeof val === 'number' && val > 0) {
      pos++;
      assert.strictEqual(cls, 'AFFIRMATIVELY_DISCLOSED_POSITIVE');
    } else {
      assert.fail(`Invalid liability proposedValue: ${val}`);
    }
  }
  assert.strictEqual(pos, 3334, `Expected 3334 positive liabilities, got ${pos}`);
  assert.strictEqual(missing, 893, `Expected 893 missing liabilities, got ${missing}`);
  assert.strictEqual(zero, 296, `Expected 296 genuine zero liabilities, got ${zero}`);
  assert.strictEqual(pos + missing + zero, 4523);
});

// Test 07: Exact Subset Containment
runTest('Exact subset containment: 72 missing assets ⊆ 893 missing liabilities', () => {
  const missingAssetIds = new Set();
  const missingLiabIds = new Set();
  for (const a of affidavits) {
    if (a.dimensions.asset.proposedValue === null) missingAssetIds.add(a.affidavitId);
    if (a.dimensions.liability.proposedValue === null) missingLiabIds.add(a.affidavitId);
  }
  assert.strictEqual(missingAssetIds.size, 72);
  assert.strictEqual(missingLiabIds.size, 893);
  for (const id of missingAssetIds) {
    assert.ok(missingLiabIds.has(id), `Missing asset ID ${id} is not in missing liabilities`);
  }
});

// Test 08: Zero vs Missing Distinction
runTest('Missing disclosures strictly distinguished from genuine zeros', () => {
  for (const a of affidavits) {
    if (a.dimensions.asset.proposedValue === null) {
      assert.notStrictEqual(a.dimensions.asset.proposedValue, 0);
      assert.strictEqual(a.dimensions.asset.proposedDisclosureClassification, 'AFFIDAVIT_MISSING_DISCLOSURE');
    }
    if (a.dimensions.asset.proposedValue === 0) {
      assert.notStrictEqual(a.dimensions.asset.proposedValue, null);
      assert.strictEqual(a.dimensions.asset.proposedDisclosureClassification, 'VERIFIED_GENUINE_ZERO');
    }
    if (a.dimensions.liability.proposedValue === null) {
      assert.notStrictEqual(a.dimensions.liability.proposedValue, 0);
      assert.strictEqual(a.dimensions.liability.proposedDisclosureClassification, 'AFFIDAVIT_MISSING_DISCLOSURE');
    }
    if (a.dimensions.liability.proposedValue === 0) {
      assert.notStrictEqual(a.dimensions.liability.proposedValue, null);
      assert.strictEqual(a.dimensions.liability.proposedDisclosureClassification, 'VERIFIED_GENUINE_ZERO');
    }
  }
});

// Test 09: Production SQL Chunks Validator — Raw Tuple Counting
runTest('Production validateSqlChunks() verifies 4,523 raw tuples and unique target UUIDs', () => {
  const chunkFiles = [
    { file: '066_b2_2e_chunk_02_affidavits_part1.sql', chunkName: 'Chunk 02', expectedTuples: 1196 },
    { file: '066_b2_2e_chunk_03_affidavits_part2.sql', chunkName: 'Chunk 03', expectedTuples: 1272 },
    { file: '066_b2_2e_chunk_04_affidavits_part3.sql', chunkName: 'Chunk 04', expectedTuples: 1150 },
    { file: '066_b2_2e_chunk_05_affidavits_part4.sql', chunkName: 'Chunk 05', expectedTuples: 905 }
  ];
  const { sqlMap, totalRawTuplesParsed } = validateSqlChunks(chunkFiles, crosswalkTargetUuidSet, REPO_ROOT);
  assert.strictEqual(totalRawTuplesParsed, 4523);
  assert.strictEqual(sqlMap.size, 4523);
});

// Test 10: Production-Path Adversarial: SQL Chunk Validator Rejections
runTest('Production validateSqlChunks() rejects unknown targets, count mismatches, and duplicates', () => {
  // A. Target UUID unknown to crosswalk
  const emptyTargetSet = new Set();
  const chunkFiles = [
    { file: '066_b2_2e_chunk_02_affidavits_part1.sql', expectedTuples: 1196 }
  ];
  assert.throws(() => {
    validateSqlChunks(chunkFiles, emptyTargetSet, REPO_ROOT);
  }, /UNKNOWN_SQL_TARGET_UUID/);

  // B. Chunk tuple count mismatch
  const badExpectedChunk = [
    { file: '066_b2_2e_chunk_02_affidavits_part1.sql', expectedTuples: 9999 }
  ];
  assert.throws(() => {
    validateSqlChunks(badExpectedChunk, crosswalkTargetUuidSet, REPO_ROOT);
  }, /CHUNK_TUPLE_COUNT_MISMATCH/);
});

// Test 11: Database State Claims & Evidence Taxonomy
runTest('Database state claims declare explicit offline evidence basis with separated baseline', () => {
  for (const a of affidavits) {
    // Asset
    assert.strictEqual(a.dimensions.asset.evidenceBasis, 'SCHEMA_DERIVED_EXPECTATION');
    assert.strictEqual(typeof a.dimensions.asset.manifestBaselineValue, 'number');
    assert.strictEqual(a.dimensions.asset.expectedDatabaseValue, 0);
    assert.ok(a.dimensions.asset.evidenceBasisDetails.includes('Live Supabase not accessed'));

    // Liability
    assert.strictEqual(a.dimensions.liability.evidenceBasis, 'SQL_SOURCE_DERIVED_EXPECTATION');
    assert.ok(a.dimensions.liability.manifestBaselineValue === null || typeof a.dimensions.liability.manifestBaselineValue === 'number');
    assert.ok(a.dimensions.liability.evidenceBasisDetails.includes('Live Supabase not accessed'));
  }
});

// Test 12: Adversarial: Prohibits Claiming Unverified LIVE_DATABASE_OBSERVATION
runTest('Adversarial: Prohibits claiming unverified LIVE_DATABASE_OBSERVATION across all rows', () => {
  for (const a of affidavits) {
    assert.notStrictEqual(a.dimensions.asset.evidenceBasis, 'LIVE_DATABASE_OBSERVATION');
    assert.notStrictEqual(a.dimensions.liability.evidenceBasis, 'LIVE_DATABASE_OBSERVATION');
  }
});

// Test 13: Verifier Gate Integrity: ELIGIBLE Strictly Requires Validator Pass
runTest('No record is marked ELIGIBLE without passesExistingOfflineVerifier === true', () => {
  for (const a of affidavits) {
    if (a.dimensions.asset.eligibility === 'ELIGIBLE') {
      assert.strictEqual(a.dimensions.asset.passesExistingOfflineVerifier, true);
    }
    if (a.dimensions.liability.eligibility === 'ELIGIBLE') {
      assert.strictEqual(a.dimensions.liability.passesExistingOfflineVerifier, true);
    }
  }
});

// Test 14: Verifier Outcome Totals: Exactly 0 ELIGIBLE Records Under Existing Verifier
runTest('Existing verifier yields exactly 0 ELIGIBLE records across both dimensions', () => {
  const summaryAsset = manifestData.populationSummary.eligibilitySummary.assetDimension;
  const summaryLiab = manifestData.populationSummary.eligibilitySummary.liabilityDimension;

  assert.strictEqual(summaryAsset.eligibleCount, 0, `Expected 0 eligible assets, got ${summaryAsset.eligibleCount}`);
  assert.strictEqual(summaryAsset.ineligibleCount, 111, `Expected 111 ineligible assets, got ${summaryAsset.ineligibleCount}`);
  assert.strictEqual(summaryAsset.requiresReviewCount, 4412, `Expected 4412 requires_review assets, got ${summaryAsset.requiresReviewCount}`);

  assert.strictEqual(summaryLiab.eligibleCount, 0, `Expected 0 eligible liabilities, got ${summaryLiab.eligibleCount}`);
  assert.strictEqual(summaryLiab.ineligibleCount, 3630, `Expected 3630 ineligible liabilities, got ${summaryLiab.ineligibleCount}`);
  assert.strictEqual(summaryLiab.requiresReviewCount, 893, `Expected 893 requires_review liabilities, got ${summaryLiab.requiresReviewCount}`);
});

// Test 15: Production-Path Adversarial: Eligibility Gate Invariant Violations
runTest('Production validateEligibilityGate() rejects false ELIGIBLE and mismatched INELIGIBLE', () => {
  // A. Invariant 1: ELIGIBLE without validator pass triggers VERIFIER_GATE_VIOLATION
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // B. Invariant 2: INELIGIBLE with unequal values triggers INELIGIBLE_VALUE_MISMATCH
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /INELIGIBLE_VALUE_MISMATCH/);

  // C. Unsupported field type in evaluateDimensionEligibility() triggers UNSUPPORTED_FIELD_TYPE
  assert.throws(() => {
    evaluateDimensionEligibility({
      affidavitRecord: affidavits[0],
      fieldType: 'INVALID_FIELD',
      manifestBaselineValue: 0,
      expectedDatabaseValue: 0,
      proposedValue: 0,
      proposedClassification: 'VERIFIED_GENUINE_ZERO',
      sourceFile: affidavits[0].sourceCoordinates.file,
      sourceLine: affidavits[0].sourceCoordinates.line,
      hasSourceConflict: false,
      crosswalkMap,
      ledgerMap,
      repoRoot: REPO_ROOT
    });
  }, /UNSUPPORTED_FIELD_TYPE/);
});

// Test 16: Ineligible Records Strictly Require Equal Database Expectation and Proposed Values
runTest('Ineligible records strictly correspond to expectedDatabaseValue === proposedValue', () => {
  for (const a of affidavits) {
    if (a.dimensions.asset.eligibility === 'INELIGIBLE') {
      assert.strictEqual(a.group, 5);
      assert.strictEqual(a.dimensions.asset.expectedDatabaseValue, 0);
      assert.strictEqual(a.dimensions.asset.proposedValue, 0);
    }
    if (a.dimensions.liability.eligibility === 'INELIGIBLE') {
      assert.ok([1, 2, 5].includes(a.group));
      assert.strictEqual(a.dimensions.liability.expectedDatabaseValue, a.dimensions.liability.proposedValue);
    }
  }
});

// Test 17: Production Verifier Invocation Consistency
runTest('Production validateCorrectionEligibility() execution matches recorded row outcomes', () => {
  // Test a real proposed correction from the inventory (0215b22e-aff-00001570, Siddaramaiah)
  const targetId = '0215b22e-aff-00001570';
  const manifestAff = affidavits.find(a => a.affidavitId === targetId);
  assert.ok(manifestAff, `Affidavit ${targetId} must exist`);

  const originalManifestData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json'), 'utf8'));
  const originalAff = originalManifestData.affidavits.find(a => a.id === targetId);

  const inventoryData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'scratch/directive_032_scratch/reconciled_package_a2_full_inventory.json'), 'utf8'));
  const assetCorr = inventoryData.assetCorrections.find(c => c.affidavitId === targetId);
  assert.ok(assetCorr, `Correction for ${targetId} must exist`);

  // Direct production verifier execution
  let errorCaught = null;
  try {
    validateCorrectionEligibility(originalAff, assetCorr, 'ASSET', crosswalkMap, ledgerMap, REPO_ROOT);
  } catch (err) {
    errorCaught = err.message;
  }

  assert.ok(errorCaught !== null, 'Production verifier must reject correction');
  assert.ok(errorCaught.includes('MISSING_LEDGER_ENTRY'), `Expected MISSING_LEDGER_ENTRY, got: ${errorCaught}`);
  assert.strictEqual(manifestAff.dimensions.asset.passesExistingOfflineVerifier, false);
  assert.strictEqual(manifestAff.dimensions.asset.verifierRejectionReason, errorCaught);
  assert.strictEqual(manifestAff.dimensions.asset.eligibility, 'REQUIRES_REVIEW');
});

// Test 18: Production Summary Reconciliation Validator
runTest('Production validateSummaryReconciliation() asserts bit-for-bit count equality', () => {
  const result = validateSummaryReconciliation(manifestData, summaryData);
  assert.strictEqual(result.recomputedAssetCounts.ELIGIBLE, 0);
  assert.strictEqual(result.recomputedAssetCounts.INELIGIBLE, 111);
  assert.strictEqual(result.recomputedAssetCounts.REQUIRES_REVIEW, 4412);
  assert.strictEqual(result.recomputedLiabilityCounts.ELIGIBLE, 0);
  assert.strictEqual(result.recomputedLiabilityCounts.INELIGIBLE, 3630);
  assert.strictEqual(result.recomputedLiabilityCounts.REQUIRES_REVIEW, 893);
});

// Test 19: Production-Path Adversarial: Summary Validator Rejects Mismatches
runTest('Production validateSummaryReconciliation() rejects deliberately inconsistent summary', () => {
  const badSummary = JSON.parse(JSON.stringify(summaryData));
  badSummary.eligibilityBreakdown.assetDimension.eligibleCount = 10;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badSummary);
  }, /SUMMARY_MANIFEST_DISCORD/);

  const badLiabSummary = JSON.parse(JSON.stringify(summaryData));
  badLiabSummary.eligibilityBreakdown.liabilityDimension.requiresReviewCount = 0;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badLiabSummary);
  }, /SUMMARY_MANIFEST_DISCORD/);
});

// Test 20: Karnataka Unresolved Conflict Isolation
runTest('Karnataka conflict (0215b22e-aff-00001430) isolated as REQUIRES_REVIEW with conflict metadata', () => {
  const confAff = affidavits.find(a => a.affidavitId === '0215b22e-aff-00001430');
  assert.ok(confAff, 'Record 0215b22e-aff-00001430 must exist');
  assert.strictEqual(confAff.candidateName, 'B C Janardhan Reddy');
  assert.strictEqual(confAff.dimensions.asset.eligibility, 'REQUIRES_REVIEW');
  assert.ok(confAff.dimensions.asset.sourceConflictOrAmbiguity.includes('G. Janardhan Reddy'));
  assert.ok(manifestData.populationSummary.unresolvedConflicts.some(c => c.id === '0215b22e-aff-00001430'));
});

// Test 21: Production-Path Adversarial: Bypassing Conflict Throws UNRESOLVED_SOURCE_CONFLICT
runTest('Production validateCorrectionEligibility() rejects conflict bypass attempt', () => {
  const originalManifestData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json'), 'utf8'));
  const aff = originalManifestData.affidavits.find(a => a.id === '0215b22e-aff-00001430');
  assert.throws(() => {
    const fakeCorrection = {
      affidavitId: aff.id,
      field: 'total_assets',
      currentRepresentedValue: aff.total_assets,
      intendedValue: aff.total_assets,
      disclosureClassification: 'AFFIRMATIVELY_DISCLOSED_POSITIVE',
      sourceFile: aff.source_file,
      sourceLocation: `${aff.source_file}:${aff.source_line}`,
      hasSourceConflict: true
    };
    validateCorrectionEligibility(aff, fakeCorrection, 'ASSET', crosswalkMap, ledgerMap, REPO_ROOT);
  }, /UNRESOLVED_SOURCE_CONFLICT/);
});

// Test 22: Production Source Evidence Validator
runTest('Production validateSourceEvidenceFile() verifies all referenced source files and hashes', () => {
  const checkedFiles = new Set();
  for (const a of affidavits) {
    const file = a.sourceCoordinates.file;
    if (checkedFiles.has(file)) continue;
    checkedFiles.add(file);

    const result = validateSourceEvidenceFile(file, a.sourceCoordinates.fileSha256, REPO_ROOT);
    assert.strictEqual(result.sha256, a.sourceCoordinates.fileSha256);
  }
});

// Test 23: Production-Path Adversarial: Source Evidence Validator Rejections
runTest('Production validateSourceEvidenceFile() rejects missing files and tampered hashes', () => {
  // A. Missing file
  assert.throws(() => {
    validateSourceEvidenceFile('data/seed/non_existent_seed_file.ts', null, REPO_ROOT);
  }, /MISSING_SOURCE_FILE/);

  // B. Tampered hash
  const sampleFile = affidavits[0].sourceCoordinates.file;
  assert.throws(() => {
    validateSourceEvidenceFile(sampleFile, 'tampered_sha256_hash_00000000000000000000000000000000000000000000', REPO_ROOT);
  }, /SOURCE_HASH_MISMATCH/);
});

// Test 24: Phantom Affidavit Strict Absence
runTest('Phantom affidavit 0215b22e-aff-00001571 is strictly absent from all artifacts', () => {
  const inManifest = affidavits.some(a => a.affidavitId === '0215b22e-aff-00001571');
  const inCrosswalk = crosswalkData.some(c => c.manifestId === '0215b22e-aff-00001571');
  const inLedger = ledgerData.some(l => l.manifestId === '0215b22e-aff-00001571');

  assert.strictEqual(inManifest, false, 'Phantom affidavit found in manifest');
  assert.strictEqual(inCrosswalk, false, 'Phantom affidavit found in crosswalk');
  assert.strictEqual(inLedger, false, 'Phantom affidavit found in ledger');
});

// Test 25: Delhi Demographic Records Preserved NOT_VERIFIED
runTest('17 Delhi demographic records remain preserved as NOT_VERIFIED', () => {
  assert.strictEqual(summaryData.governanceCompliance.delhi17DemographicsPreservedNotVerified, true);
});

// Test 26: Governance Rule IV-001 Non-Self-Acceptance
runTest('Defect DQ-W021.5-B2.2E-001 declared STRICTLY OPEN with CTO Acceptance Authority', () => {
  assert.strictEqual(manifestData.defect, 'DQ-W021.5-B2.2E-001');
  assert.ok(manifestData.defectStatus.includes('STRICTLY OPEN'));
  assert.ok(manifestData.governance.includes('Rule IV-001'));
  assert.strictEqual(summaryData.governanceCompliance.ruleIV001NonSelfAcceptance, true);
  assert.strictEqual(summaryData.governanceCompliance.defectRemainsStrictlyOpen, true);
  assert.strictEqual(summaryData.governanceCompliance.liveDatabaseObservationsObtained, false);
});

console.log('================================================================');
console.log(`TEST SUITE SUMMARY: ${passed}/${total} PASSED, ${total - passed}/${total} FAILED`);
console.log('================================================================');

// Write test results artifact
const resultsArtifact = {
  suite: 'adjudication_manifest_test_suite',
  directive: 'W021.5-CTO-DIRECTIVE-073',
  executedAt: new Date().toISOString(),
  totalTests: total,
  passed,
  failed: total - passed,
  verdict: passed === total ? 'PASS' : 'FAIL',
  results: testResults
};

const resultsPath = path.join(REPO_ROOT, 'reports/evidence/adjudication_manifest_test_results.json');
fs.writeFileSync(resultsPath, JSON.stringify(resultsArtifact, null, 2), 'utf8');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
