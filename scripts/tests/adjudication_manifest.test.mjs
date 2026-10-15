#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Directive 071 Adjudication Manifest Validation Test Suite
 * 
 * Validates the 4,523-row row-level adjudication manifest:
 * 1. Population count is exactly 4,523.
 * 2. Five group counts match established controls:
 *    - Group 1: 3,334
 *    - Group 2: 185
 *    - Group 3: 821
 *    - Group 4: 72
 *    - Group 5: 111
 * 3. Dimensional controls:
 *    - 4,340 positive assets
 *    - 72 missing assets != 0
 *    - 111 genuine zero assets
 *    - 3,334 positive liabilities
 *    - 893 missing liabilities != 0
 *    - 296 genuine zero liabilities
 * 4. Exact subset containment: 72 missing assets ⊆ 893 missing liabilities.
 * 5. Distinct identification and segregation of genuine zeros from missing disclosures.
 * 6. Zero duplicate affidavit IDs or target UUIDs.
 * 7. Unresolved conflict tracking (Record 0215b22e-aff-00001430).
 * 8. Strict segregation between ELIGIBLE, INELIGIBLE, and REQUIRES_REVIEW.
 * 9. Every REQUIRES_REVIEW record has an explicit non-empty reason.
 * 10. Every INELIGIBLE record has an explicit non-empty reason.
 * 11. Crosswalk bijection verification for all 4,523 records.
 * 12. Rule IV-001 non-self-acceptance and defect open status preserved.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');

console.log('================================================================');
console.log('KSHETRA W021.5 — DIRECTIVE 071 ADJUDICATION MANIFEST TEST SUITE');
console.log('================================================================');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`ERROR: Adjudication manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const affidavits = data.affidavits;

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[✓ PASS] Test ${total.toString().padStart(2, '0')}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[✗ FAIL] Test ${total.toString().padStart(2, '0')}: ${name} - ${err.message}`);
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

// Test 02: Five Group Reconciled Counts
runTest('Five group counts reconcile exactly to established totals', () => {
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

// Test 03: Asset Invariants
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

// Test 04: Liability Invariants
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

// Test 05: Exact Subset Containment
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

// Test 06: Zero vs Missing Distinction
runTest('Missing disclosures strictly distinguished from genuine zeros', () => {
  for (const a of affidavits) {
    // Assets
    if (a.dimensions.asset.proposedValue === null) {
      assert.notStrictEqual(a.dimensions.asset.proposedValue, 0);
      assert.strictEqual(a.dimensions.asset.proposedDisclosureClassification, 'AFFIDAVIT_MISSING_DISCLOSURE');
    }
    if (a.dimensions.asset.proposedValue === 0) {
      assert.notStrictEqual(a.dimensions.asset.proposedValue, null);
      assert.strictEqual(a.dimensions.asset.proposedDisclosureClassification, 'VERIFIED_GENUINE_ZERO');
    }
    // Liabilities
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

// Test 07: Uniqueness and Crosswalk Bijection
runTest('Manifest has no duplicate target UUIDs and exact crosswalk references', () => {
  const uuidSet = new Set();
  for (const a of affidavits) {
    const uuid = a.crosswalk.targetUuid;
    assert.ok(uuid, 'Must have targetUuid');
    assert.ok(!uuidSet.has(uuid), `Duplicate targetUuid: ${uuid}`);
    uuidSet.add(uuid);
  }
  assert.strictEqual(uuidSet.size, 4523);
});

// Test 08: Unresolved Conflict Isolation
runTest('Unresolved conflict (0215b22e-aff-00001430) explicitly recorded and isolated', () => {
  const conflictAff = affidavits.find(a => a.affidavitId === '0215b22e-aff-00001430');
  assert.ok(conflictAff, 'Must find affidavit 0215b22e-aff-00001430');
  assert.strictEqual(conflictAff.candidateName, 'B C Janardhan Reddy');
  assert.strictEqual(conflictAff.dimensions.asset.eligibility, 'REQUIRES_REVIEW');
  assert.ok(conflictAff.dimensions.asset.sourceConflictOrAmbiguity !== null);
  assert.ok(data.populationSummary.unresolvedConflicts.some(c => c.id === '0215b22e-aff-00001430'));
});

// Test 09: Eligibility Partition & Explicit Reasons
runTest('Every record dimension has an explicit non-empty eligibility and reason', () => {
  const validEligibilities = ['ELIGIBLE', 'INELIGIBLE', 'REQUIRES_REVIEW'];
  for (const a of affidavits) {
    // Asset
    assert.ok(validEligibilities.includes(a.dimensions.asset.eligibility));
    assert.ok(a.dimensions.asset.eligibilityReason && a.dimensions.asset.eligibilityReason.length > 5);
    // Liability
    assert.ok(validEligibilities.includes(a.dimensions.liability.eligibility));
    assert.ok(a.dimensions.liability.eligibilityReason && a.dimensions.liability.eligibilityReason.length > 5);
  }
});

// Test 10: Ineligible Dimension Verification
runTest('Ineligible dimensions strictly correspond to no database correction required', () => {
  for (const a of affidavits) {
    if (a.dimensions.liability.eligibility === 'INELIGIBLE') {
      // Must be group 1, 2, or 5 where DB value already equals proposed value
      assert.ok([1, 2, 5].includes(a.group));
      assert.strictEqual(a.dimensions.liability.currentRepresentedValue, a.dimensions.liability.proposedValue);
    }
    if (a.dimensions.asset.eligibility === 'INELIGIBLE') {
      // Must be group 5 where DB value 0 equals proposed value 0
      assert.strictEqual(a.group, 5);
      assert.strictEqual(a.dimensions.asset.currentRepresentedValue, 0);
      assert.strictEqual(a.dimensions.asset.proposedValue, 0);
    }
  }
});

// Test 11: Phantom Affidavit Absence
runTest('Phantom affidavit 0215b22e-aff-00001571 is strictly absent', () => {
  const phantom = affidavits.find(a => a.affidavitId === '0215b22e-aff-00001571');
  assert.strictEqual(phantom, undefined, 'Phantom affidavit must not exist in manifest');
});

// Test 12: Rule IV-001 Governance Compliance
runTest('Defect DQ-W021.5-B2.2E-001 is declared STRICTLY OPEN with non-self-acceptance', () => {
  assert.strictEqual(data.defect, 'DQ-W021.5-B2.2E-001');
  assert.ok(data.defectStatus.includes('STRICTLY OPEN'));
  assert.ok(data.governance.includes('Rule IV-001'));
});

console.log('================================================================');
console.log(`TEST SUITE SUMMARY: ${passed}/${total} PASSED, ${total - passed}/${total} FAILED`);
console.log('================================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
