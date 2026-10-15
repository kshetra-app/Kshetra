import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import {
  validateCrosswalk,
  validateSqlChunks,
  validateEligibilityGate,
  evaluateDimensionEligibility,
  validateSummaryReconciliation,
  validateSourceEvidenceFile,
  CANONICAL_UUID_REGEX,
  CANONICAL_MANIFEST_ID_REGEX
} from '../adjudication_validators.mjs';
import {
  validateCorrectionEligibility
} from '../verify_financial_remediation.mjs';

/**
 * Kshetra W021.5 / B2.2-E — Adjudication Manifest Test Suite
 * Hardened for CTO Directive 074:
 * - Direct production-path adversarial testing
 * - Strict crosswalk validation (canonical UUID, manifest ID, bijective uniqueness)
 * - Strict SQL chunk tuple counting, 18-column schema, target UUID, and bidirectional coverage
 * - Strict eligibility gate invariants and financial value domains
 * - Complete summary reconciliation across all 5 groups, dimensions, and rejection reasons
 * - Source evidence existence, safe pathing, and non-empty SHA-256 verification
 * - Non-self-acceptance under Rule IV-001 (CTO acceptance authority only)
 */

const REPO_ROOT = process.cwd();

console.log('================================================================');
console.log('KSHETRA W021.5 — DIRECTIVE 074 ADJUDICATION MANIFEST TEST SUITE');
console.log('================================================================');

// Load master artifacts
const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');
const summaryPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_summary.json');
const crosswalkPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_048_4523_manifest_to_target_crosswalk.json');
const ledgerPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_047_1120_component_ledger.json');

const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const crosswalkData = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
const ledgerData = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

const affidavits = manifestData.affidavits;

// Build lookup maps
const crosswalkMap = new Map();
const crosswalkTargetUuidSet = new Set();
for (const c of crosswalkData) {
  crosswalkMap.set(c.manifestId, c);
  crosswalkTargetUuidSet.add(c.targetUuid);
}

const ledgerMap = new Map();
for (const l of ledgerData) {
  ledgerMap.set(l.manifestId, l);
}

let passed = 0;
let total = 0;
const testResults = [];

function runTest(name, fn) {
  total++;
  const testId = `Test ${String(total).padStart(2, '0')}`;
  try {
    fn();
    passed++;
    console.log(`[✓ PASS] ${testId}: ${name}`);
    testResults.push({ id: testId, name, status: 'PASS', error: null });
  } catch (err) {
    console.error(`[✗ FAIL] ${testId}: ${name}`);
    console.error(`         Error: ${err.message}`);
    testResults.push({ id: testId, name, status: 'FAIL', error: err.message });
  }
}

// Test 01: Master Population Size Control
runTest('All 4,523 retained records are accounted for exactly once', () => {
  assert.strictEqual(affidavits.length, 4523);
  const seenIds = new Set();
  for (const a of affidavits) {
    assert.ok(a.affidavitId, 'Affidavit missing affidavitId');
    assert.ok(!seenIds.has(a.affidavitId), `Duplicate affidavitId: ${a.affidavitId}`);
    seenIds.add(a.affidavitId);
  }
  assert.strictEqual(seenIds.size, 4523);
});

// Test 02: Production Crosswalk Validator — Exact Bijection and Canonical Formats
runTest('Production validateCrosswalk() verifies exact 4,523-row bijection, uniqueness, and canonical formats', () => {
  const result = validateCrosswalk(crosswalkData, 4523);
  assert.strictEqual(result.crosswalkMap.size, 4523);
  assert.strictEqual(result.crosswalkTargetUuidSet.size, 4523);

  // Validate format of each entry
  for (const [mId, cw] of result.crosswalkMap) {
    assert.ok(CANONICAL_MANIFEST_ID_REGEX.test(mId), `Invalid manifestId: ${mId}`);
    assert.ok(CANONICAL_UUID_REGEX.test(cw.targetUuid), `Invalid targetUuid: ${cw.targetUuid}`);
  }
});

// Test 03: Production-Path Adversarial: Crosswalk Validator Rejections
runTest('Production validateCrosswalk() rejects missing, duplicate, and malformed entries', () => {
  // A. Non-array input
  assert.throws(() => {
    validateCrosswalk('not-an-array', 4523);
  }, /INVALID_CROSSWALK_ARRAY/);

  // B. Truncated list (population mismatch)
  assert.throws(() => {
    validateCrosswalk(crosswalkData.slice(0, 4522), 4523);
  }, /CROSSWALK_POPULATION_MISMATCH/);

  // C. Non-object entry
  const nonObjectList = crosswalkData.slice(0, 4522);
  nonObjectList.push('invalid-entry');
  assert.throws(() => {
    validateCrosswalk(nonObjectList, 4523);
  }, /MALFORMED_CROSSWALK_ENTRY/);

  // D. Missing manifestId
  const missingManifest = crosswalkData.slice(0, 4522);
  missingManifest.push({ targetUuid: '0215b22e-0001-0000-0000-999999999999' });
  assert.throws(() => {
    validateCrosswalk(missingManifest, 4523);
  }, /MALFORMED_CROSSWALK_ENTRY/);

  // E. Malformed manifestId format
  const malformedManifest = crosswalkData.slice(0, 4522);
  malformedManifest.push({ manifestId: 'bad-manifest-format', targetUuid: '0215b22e-0001-0000-0000-999999999999' });
  assert.throws(() => {
    validateCrosswalk(malformedManifest, 4523);
  }, /INVALID_CROSSWALK_MANIFEST_ID/);

  // F. Duplicate manifest ID
  const dupManifest = crosswalkData.slice(0, 4522);
  dupManifest.push({ manifestId: crosswalkData[0].manifestId, targetUuid: '0215b22e-0001-0000-0000-999999999999' });
  assert.throws(() => {
    validateCrosswalk(dupManifest, 4523);
  }, /DUPLICATE_CROSSWALK_MANIFEST_ID/);

  // G. Missing targetUuid (non-string)
  const nonStringTarget = crosswalkData.slice(0, 4522);
  nonStringTarget.push({ manifestId: '0215b22e-aff-99999999', targetUuid: 12345 });
  assert.throws(() => {
    validateCrosswalk(nonStringTarget, 4523);
  }, /MALFORMED_CROSSWALK_ENTRY/);

  // H. Empty targetUuid
  const emptyTarget = crosswalkData.slice(0, 4522);
  emptyTarget.push({ manifestId: '0215b22e-aff-99999999', targetUuid: '   ' });
  assert.throws(() => {
    validateCrosswalk(emptyTarget, 4523);
  }, /EMPTY_CROSSWALK_TARGET_UUID/);

  // I. Malformed non-empty target UUID (Directive 074 §2)
  const malformedUuid = crosswalkData.slice(0, 4522);
  malformedUuid.push({ manifestId: '0215b22e-aff-99999999', targetUuid: '0215b22e-0001-0000-0000-zzzzzzzzzzzz' });
  assert.throws(() => {
    validateCrosswalk(malformedUuid, 4523);
  }, /INVALID_CROSSWALK_TARGET_UUID/);

  // J. Duplicate target UUID
  const dupTarget = crosswalkData.slice(0, 4522);
  dupTarget.push({ manifestId: '0215b22e-aff-99999999', targetUuid: crosswalkData[0].targetUuid });
  assert.throws(() => {
    validateCrosswalk(dupTarget, 4523);
  }, /DUPLICATE_CROSSWALK_TARGET_UUID/);
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

// Test 09: Production SQL Chunks Validator — Raw Tuple Counting and Bidirectional Coverage
runTest('Production validateSqlChunks() verifies 4,523 raw tuples, 18-column schema, and bidirectional crosswalk coverage', () => {
  const chunkFiles = [
    { file: '066_b2_2e_chunk_02_affidavits_part1.sql', chunkName: 'Chunk 02', expectedTuples: 1196 },
    { file: '066_b2_2e_chunk_03_affidavits_part2.sql', chunkName: 'Chunk 03', expectedTuples: 1272 },
    { file: '066_b2_2e_chunk_04_affidavits_part3.sql', chunkName: 'Chunk 04', expectedTuples: 1150 },
    { file: '066_b2_2e_chunk_05_affidavits_part4.sql', chunkName: 'Chunk 05', expectedTuples: 905 }
  ];
  const { sqlMap, totalRawTuplesParsed } = validateSqlChunks(chunkFiles, crosswalkTargetUuidSet, REPO_ROOT, { assertFullCoverage: true });
  assert.strictEqual(totalRawTuplesParsed, 4523);
  assert.strictEqual(sqlMap.size, 4523);

  // Verify all crosswalk targets are in SQL chunk map
  for (const uuid of crosswalkTargetUuidSet) {
    assert.ok(sqlMap.has(uuid), `Crosswalk target ${uuid} missing from parsed SQL chunks`);
  }
});

// Test 10: Production-Path Adversarial: SQL Chunk Validator Rejections
runTest('Production validateSqlChunks() rejects duplicates, unknown targets, count mismatches, malformed tuples, and missing coverage', () => {
  const scratchDir = path.join(REPO_ROOT, 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

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

  // C. Real Duplicate Target Injection in SQL Chunk (Directive 074 §4.1)
  const dupSqlFile = path.join(scratchDir, 'test_adv_dup_sql_chunk.sql');
  const validUuid = crosswalkData[0].targetUuid;
  const sampleTuple = `  ('${validUuid}'::uuid, 'Test Candidate', 1, 'AC', 'TS', 'INC', 2024, '0215b22d-0001-0000-0000-000000000001'::uuid, '0215b22d-0002-0000-0000-000000000001'::uuid, '0215b22e-0000-0000-0000-000000000001'::uuid, 'OFFICIAL', 10000, 0, 0, NULL, NULL, 50, true),\n`;
  fs.writeFileSync(dupSqlFile, sampleTuple + sampleTuple, 'utf8');

  try {
    assert.throws(() => {
      validateSqlChunks([{ file: dupSqlFile, expectedTuples: 2 }], crosswalkTargetUuidSet, REPO_ROOT);
    }, /DUPLICATE_SQL_TARGET_UUID/);
  } finally {
    if (fs.existsSync(dupSqlFile)) fs.unlinkSync(dupSqlFile);
  }

  // D. Malformed Target UUID in SQL Chunk (Directive 074 §4.3)
  const malformedSqlFile = path.join(scratchDir, 'test_adv_malformed_uuid_sql_chunk.sql');
  const malformedTuple = `  ('not-a-canonical-uuid'::uuid, 'Test Candidate', 1, 'AC', 'TS', 'INC', 2024, '0215b22d-0001-0000-0000-000000000001'::uuid, '0215b22d-0002-0000-0000-000000000001'::uuid, '0215b22e-0000-0000-0000-000000000001'::uuid, 'OFFICIAL', 10000, 0, 0, NULL, NULL, 50, true),\n`;
  fs.writeFileSync(malformedSqlFile, malformedTuple, 'utf8');

  try {
    assert.throws(() => {
      validateSqlChunks([{ file: malformedSqlFile, expectedTuples: 1 }], crosswalkTargetUuidSet, REPO_ROOT);
    }, /MALFORMED_SQL_TARGET_UUID/);
  } finally {
    if (fs.existsSync(malformedSqlFile)) fs.unlinkSync(malformedSqlFile);
  }

  // E. Invalid Financial Value in SQL Chunk (Directive 074 §4.3)
  const invalidFinSqlFile = path.join(scratchDir, 'test_adv_invalid_fin_sql_chunk.sql');
  const invalidFinTuple = `  ('${validUuid}'::uuid, 'Test Candidate', 1, 'AC', 'TS', 'INC', 2024, '0215b22d-0001-0000-0000-000000000001'::uuid, '0215b22d-0002-0000-0000-000000000001'::uuid, '0215b22e-0000-0000-0000-000000000001'::uuid, 'OFFICIAL', -50000, 0, 0, NULL, NULL, 50, true),\n`;
  fs.writeFileSync(invalidFinSqlFile, invalidFinTuple, 'utf8');

  try {
    assert.throws(() => {
      validateSqlChunks([{ file: invalidFinSqlFile, expectedTuples: 1 }], crosswalkTargetUuidSet, REPO_ROOT);
    }, /INVALID_SQL_FINANCIAL_VALUE/);
  } finally {
    if (fs.existsSync(invalidFinSqlFile)) fs.unlinkSync(invalidFinSqlFile);
  }

  // F. Malformed Tuple Column Count (Directive 074 §4.3)
  const badColumnsSqlFile = path.join(scratchDir, 'test_adv_bad_columns_sql_chunk.sql');
  const badColumnTuple = `  ('${validUuid}'::uuid, 'Test Candidate', 1, 'AC', 'TS', 'INC', 2024),\n`;
  fs.writeFileSync(badColumnsSqlFile, badColumnTuple, 'utf8');

  try {
    assert.throws(() => {
      validateSqlChunks([{ file: badColumnsSqlFile, expectedTuples: 1 }], crosswalkTargetUuidSet, REPO_ROOT);
    }, /MALFORMED_SQL_TUPLE/);
  } finally {
    if (fs.existsSync(badColumnsSqlFile)) fs.unlinkSync(badColumnsSqlFile);
  }

  // G. Bidirectional Coverage: Target in crosswalk absent from SQL chunks (Directive 074 §4.4)
  const augmentedTargetSet = new Set(crosswalkTargetUuidSet);
  augmentedTargetSet.add('0215b22e-ffff-ffff-ffff-ffffffffffff');
  const fullChunkFiles = [
    { file: '066_b2_2e_chunk_02_affidavits_part1.sql', expectedTuples: 1196 },
    { file: '066_b2_2e_chunk_03_affidavits_part2.sql', expectedTuples: 1272 },
    { file: '066_b2_2e_chunk_04_affidavits_part3.sql', expectedTuples: 1150 },
    { file: '066_b2_2e_chunk_05_affidavits_part4.sql', expectedTuples: 905 }
  ];
  assert.throws(() => {
    validateSqlChunks(fullChunkFiles, augmentedTargetSet, REPO_ROOT, { assertFullCoverage: true });
  }, /CROSSWALK_TARGET_MISSING_IN_SQL/);
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

// Test 15: Production-Path Adversarial: Eligibility Gate Invariant Violations (Directive 074 §3)
runTest('Production validateEligibilityGate() rejects boolean false, truthy strings, numbers, invalid domains, and invalid states', () => {
  // A. ELIGIBLE with passesExistingOfflineVerifier = false
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // B. ELIGIBLE with passesExistingOfflineVerifier = undefined
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: undefined,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // C. ELIGIBLE with passesExistingOfflineVerifier = null
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: null,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // D. ELIGIBLE with truthy string 'true' (Directive 074 §3)
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: 'true',
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // E. ELIGIBLE with truthy number 1 (Directive 074 §3)
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'ELIGIBLE',
      passesExistingOfflineVerifier: 1,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /VERIFIER_GATE_VIOLATION/);

  // F. Unsupported eligibility state
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'UNKNOWN_STATE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 0
    });
  }, /UNSUPPORTED_ELIGIBILITY_STATE/);

  // G. Missing / undefined values
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: undefined,
      proposedValue: undefined
    });
  }, /INVALID_FINANCIAL_VALUE_DOMAIN/);

  // H. NaN values
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: NaN,
      proposedValue: NaN
    });
  }, /INVALID_FINANCIAL_VALUE_DOMAIN/);

  // I. Negative value
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: -1,
      proposedValue: -1
    });
  }, /INVALID_FINANCIAL_VALUE_DOMAIN/);

  // J. Fractional number
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 12.34,
      proposedValue: 12.34
    });
  }, /INVALID_FINANCIAL_VALUE_DOMAIN/);

  // K. String numeric value
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: '100',
      proposedValue: '100'
    });
  }, /INVALID_FINANCIAL_VALUE_DOMAIN/);

  // L. INELIGIBLE with mismatched values
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /INELIGIBLE_VALUE_MISMATCH/);

  // M. INELIGIBLE with verifier true
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'INELIGIBLE',
      passesExistingOfflineVerifier: true,
      expectedDatabaseValue: 0,
      proposedValue: 0
    });
  }, /ILLEGAL_INELIGIBLE_STATE/);

  // N. REQUIRES_REVIEW with verifier true
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'REQUIRES_REVIEW',
      passesExistingOfflineVerifier: true,
      expectedDatabaseValue: 0,
      proposedValue: 5000000
    });
  }, /ILLEGAL_REQUIRES_REVIEW_STATE/);

  // O. REQUIRES_REVIEW with equal values (should be INELIGIBLE)
  assert.throws(() => {
    validateEligibilityGate({
      eligibility: 'REQUIRES_REVIEW',
      passesExistingOfflineVerifier: false,
      expectedDatabaseValue: 0,
      proposedValue: 0
    });
  }, /ILLEGAL_REQUIRES_REVIEW_STATE/);

  // P. Valid control cases
  assert.strictEqual(validateEligibilityGate({
    eligibility: 'ELIGIBLE',
    passesExistingOfflineVerifier: true,
    expectedDatabaseValue: 0,
    proposedValue: 5000000
  }), true);

  assert.strictEqual(validateEligibilityGate({
    eligibility: 'INELIGIBLE',
    passesExistingOfflineVerifier: false,
    expectedDatabaseValue: 0,
    proposedValue: 0
  }), true);

  assert.strictEqual(validateEligibilityGate({
    eligibility: 'REQUIRES_REVIEW',
    passesExistingOfflineVerifier: false,
    expectedDatabaseValue: 0,
    proposedValue: 5000000,
    rejectionReason: 'MISSING_LEDGER_ENTRY'
  }), true);
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
  const targetId = '0215b22e-aff-00001570';
  const manifestAff = affidavits.find(a => a.affidavitId === targetId);
  assert.ok(manifestAff, `Affidavit ${targetId} must exist`);

  const originalManifestData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json'), 'utf8'));
  const originalAff = originalManifestData.affidavits.find(a => a.id === targetId);

  const inventoryData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'scratch/directive_032_scratch/reconciled_package_a2_full_inventory.json'), 'utf8'));
  const assetCorr = inventoryData.assetCorrections.find(c => c.affidavitId === targetId);
  assert.ok(assetCorr, `Correction for ${targetId} must exist`);

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
runTest('Production validateSummaryReconciliation() asserts complete bit-for-bit reconciliation across all controls', () => {
  const result = validateSummaryReconciliation(manifestData, summaryData);
  assert.strictEqual(result.recomputedPopulation, 4523);
  assert.strictEqual(result.recomputedAssetCounts.ELIGIBLE, 0);
  assert.strictEqual(result.recomputedAssetCounts.INELIGIBLE, 111);
  assert.strictEqual(result.recomputedAssetCounts.REQUIRES_REVIEW, 4412);
  assert.strictEqual(result.recomputedLiabilityCounts.ELIGIBLE, 0);
  assert.strictEqual(result.recomputedLiabilityCounts.INELIGIBLE, 3630);
  assert.strictEqual(result.recomputedLiabilityCounts.REQUIRES_REVIEW, 893);
  assert.strictEqual(result.subsetContainmentVerified, true);
});

// Test 19: Production-Path Adversarial: Summary Reconciliation Invariant Rejections (Directive 074 §5)
runTest('Production validateSummaryReconciliation() rejects independent alterations across all summary dimensions', () => {
  // A. Tampered total population
  const badPopSummary = JSON.parse(JSON.stringify(summaryData));
  badPopSummary.populationReconciliation.totalRetainedAffidavits = 9999;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badPopSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // B. Tampered group counts
  const badGroupSummary = JSON.parse(JSON.stringify(summaryData));
  badGroupSummary.populationReconciliation.fiveGroupCounts.group1_positiveAssets_positiveLiabilities = 3335;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badGroupSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // C. Tampered dimensional totals
  const badDimSummary = JSON.parse(JSON.stringify(summaryData));
  badDimSummary.populationReconciliation.dimensionalTotals.assetRestorationTotal = 9999;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badDimSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // D. Tampered subset integrity
  const badSubsetSummary = JSON.parse(JSON.stringify(summaryData));
  badSubsetSummary.populationReconciliation.subsetIntegrity.missingAssetsIsSubsetOfMissingLiabilities = false;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badSubsetSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // E. Tampered asset eligibility count
  const badAssetSummary = JSON.parse(JSON.stringify(summaryData));
  badAssetSummary.eligibilityBreakdown.assetDimension.eligibleCount = 10;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badAssetSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // F. Tampered liability eligibility count
  const badLiabSummary = JSON.parse(JSON.stringify(summaryData));
  badLiabSummary.eligibilityBreakdown.liabilityDimension.requiresReviewCount = 0;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badLiabSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // G. Tampered rejection reason breakdown
  const badRejSummary = JSON.parse(JSON.stringify(summaryData));
  badRejSummary.eligibilityBreakdown.assetDimension.verifierRejectionBreakdown.MISSING_LEDGER_ENTRY = 9999;
  assert.throws(() => {
    validateSummaryReconciliation(manifestData, badRejSummary);
  }, /SUMMARY_RECONCILIATION_MISMATCH/);

  // H. Manifest with invalid group value
  const badManifestGroup = JSON.parse(JSON.stringify(manifestData));
  badManifestGroup.affidavits[0].group = 99;
  assert.throws(() => {
    validateSummaryReconciliation(badManifestGroup, summaryData);
  }, /UNKNOWN_GROUP_VALUE/);

  // I. Manifest with invalid eligibility value
  const badManifestElig = JSON.parse(JSON.stringify(manifestData));
  badManifestElig.affidavits[0].dimensions.asset.eligibility = 'PENDING_APPROVAL';
  assert.throws(() => {
    validateSummaryReconciliation(badManifestElig, summaryData);
  }, /UNKNOWN_ELIGIBILITY_VALUE/);

  // J. Manifest with unknown rejection reason
  const badManifestReason = JSON.parse(JSON.stringify(manifestData));
  badManifestReason.affidavits[0].dimensions.asset.verifierRejectionReason = 'FABRICATED_REASON: Details';
  assert.throws(() => {
    validateSummaryReconciliation(badManifestReason, summaryData);
  }, /UNKNOWN_REJECTION_REASON/);
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

// Test 23: Production-Path Adversarial: Source Evidence Validator Rejections (Directive 074 §6)
runTest('Production validateSourceEvidenceFile() rejects missing files, omitted hashes, malformed hashes, tampered hashes, and path traversal', () => {
  const sampleFile = affidavits[0].sourceCoordinates.file;
  const validHash = affidavits[0].sourceCoordinates.fileSha256;

  // A. Missing file
  assert.throws(() => {
    validateSourceEvidenceFile('data/seed/non_existent_seed_file.ts', validHash, REPO_ROOT);
  }, /MISSING_SOURCE_FILE/);

  // B. Omitted hash (Directive 074 §6.2)
  assert.throws(() => {
    validateSourceEvidenceFile(sampleFile, '', REPO_ROOT);
  }, /INVALID_EXPECTED_HASH/);

  // C. Malformed hash (Directive 074 §6.2)
  assert.throws(() => {
    validateSourceEvidenceFile(sampleFile, 'not-a-valid-64-character-sha256-hash', REPO_ROOT);
  }, /MALFORMED_EXPECTED_HASH/);

  // D. Tampered hash (valid 64-hex string, but wrong hash)
  assert.throws(() => {
    validateSourceEvidenceFile(sampleFile, '0000000000000000000000000000000000000000000000000000000000000000', REPO_ROOT);
  }, /SOURCE_HASH_MISMATCH/);

  // E. Path traversal attempt (Directive 074 §6.3)
  assert.throws(() => {
    validateSourceEvidenceFile('../../outside.ts', validHash, REPO_ROOT);
  }, /(PATH_OUTSIDE_REPO_ROOT|PATH_ESCAPE_DETECTED|INVALID_PATH)/);
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
  directive: 'W021.5-CTO-DIRECTIVE-074',
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
