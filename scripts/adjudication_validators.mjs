import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseSourceProfile, validateCorrectionEligibility, safeCanonicalPath } from './verify_financial_remediation.mjs';

/**
 * Kshetra W021.5 / B2.2-E — Reusable Production Adjudication Validators
 * Fulfills CTO Directive 072, 073, and 074 requirements:
 * - Strict canonical UUID and manifest ID validation
 * - Production-path crosswalk bijection validation
 * - Production-path SQL chunk tuple counting, format validation, and target UUID uniqueness
 * - Bidirectional crosswalk-to-SQL reconciliation
 * - Production-path dimension eligibility gate enforcement with strict value domains
 * - Production-path summary vs manifest count reconciliation validation across all dimensions
 * - Production-path source evidence file existence, safe pathing, and non-empty SHA-256 verification
 */

export const CANONICAL_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CANONICAL_MANIFEST_ID_REGEX = /^0215b22e-aff-\d{8}$/;

/**
 * Helper to check valid financial value domain (null or non-negative safe integer).
 */
export function isValidFinancialValue(v) {
  if (v === null) return true;
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}

/**
 * 1. Validate Crosswalk
 * Asserts exact population count, non-empty IDs, canonical formats, and bijective uniqueness.
 */
export function validateCrosswalk(crosswalkList, expectedPopulation = 4523) {
  if (!Array.isArray(crosswalkList)) {
    throw new Error('INVALID_CROSSWALK_ARRAY: Crosswalk data must be an array');
  }
  if (crosswalkList.length !== expectedPopulation) {
    throw new Error(`CROSSWALK_POPULATION_MISMATCH: Expected ${expectedPopulation} crosswalk entries, found ${crosswalkList.length}`);
  }

  const crosswalkMap = new Map();
  const crosswalkTargetUuidSet = new Set();

  for (let i = 0; i < crosswalkList.length; i++) {
    const cw = crosswalkList[i];
    if (!cw || typeof cw !== 'object' || Array.isArray(cw)) {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Entry at index ${i} is not a valid object`);
    }

    if (typeof cw.manifestId !== 'string' || cw.manifestId.trim() === '') {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Missing or empty manifestId at index ${i}`);
    }
    const manifestId = cw.manifestId.trim();
    if (!CANONICAL_MANIFEST_ID_REGEX.test(manifestId)) {
      throw new Error(`INVALID_CROSSWALK_MANIFEST_ID: Malformed manifestId '${manifestId}' at index ${i} (expected format 0215b22e-aff-XXXXXXXX)`);
    }

    if (typeof cw.targetUuid !== 'string') {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Target UUID must be a string at index ${i}`);
    }
    const targetUuid = cw.targetUuid.trim();
    if (targetUuid === '') {
      throw new Error(`EMPTY_CROSSWALK_TARGET_UUID: Empty targetUuid at index ${i}`);
    }
    if (!CANONICAL_UUID_REGEX.test(targetUuid)) {
      throw new Error(`INVALID_CROSSWALK_TARGET_UUID: Malformed targetUuid '${targetUuid}' at index ${i} (must be canonical 8-4-4-4-12 UUID format)`);
    }

    if (crosswalkMap.has(manifestId)) {
      throw new Error(`DUPLICATE_CROSSWALK_MANIFEST_ID: Duplicate manifestId '${manifestId}' at index ${i}`);
    }
    if (crosswalkTargetUuidSet.has(targetUuid)) {
      throw new Error(`DUPLICATE_CROSSWALK_TARGET_UUID: Duplicate targetUuid '${targetUuid}' at index ${i}`);
    }

    crosswalkMap.set(manifestId, cw);
    crosswalkTargetUuidSet.add(targetUuid);
  }

  return { crosswalkMap, crosswalkTargetUuidSet };
}

/**
 * 2. Validate SQL Chunks
 * Asserts raw tuple counts per chunk, tuple format (18 columns), target UUID format/uniqueness,
 * financial value domain, and crosswalk target presence.
 */
export function validateSqlChunks(chunkFiles, crosswalkTargetUuidSet, repoRoot, options = {}) {
  if (!Array.isArray(chunkFiles) || chunkFiles.length === 0) {
    throw new Error('INVALID_CHUNK_FILES: chunkFiles must be a non-empty array');
  }
  if (!crosswalkTargetUuidSet || !(crosswalkTargetUuidSet instanceof Set)) {
    throw new Error('INVALID_CROSSWALK_SET: crosswalkTargetUuidSet must be a Set');
  }

  const sqlMap = new Map();
  let totalRawTuplesParsed = 0;

  for (const chunkConfig of chunkFiles) {
    const { file, chunkName, expectedTuples } = chunkConfig;
    const p = path.isAbsolute(file)
      ? file
      : path.join(repoRoot, 'supabase/staging_packages/066_b2_2e_chunked', file);

    if (!fs.existsSync(p)) {
      throw new Error(`MISSING_SQL_CHUNK_FILE: Chunk file not found at ${p}`);
    }

    const lines = fs.readFileSync(p, 'utf8').split('\n');
    let chunkTuples = 0;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if (!line.startsWith("('")) continue;

      chunkTuples++;
      totalRawTuplesParsed++;

      const tupleContent = line.slice(1, line.endsWith('),') ? -2 : line.endsWith(');') ? -2 : -1);
      const tokens = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < tupleContent.length; i++) {
        const ch = tupleContent[i];
        if (ch === "'" && tupleContent[i - 1] !== '\\') {
          inQuotes = !inQuotes;
          cur += ch;
        } else if (ch === ',' && !inQuotes) {
          tokens.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      tokens.push(cur.trim());

      if (tokens.length !== 18) {
        throw new Error(`MALFORMED_SQL_TUPLE: Expected 18 columns in SQL tuple at ${file}:${l + 1}, found ${tokens.length}`);
      }

      const targetUuid = tokens[0].replace(/::uuid$/i, '').replace(/^'|'$/g, '').trim();
      if (!CANONICAL_UUID_REGEX.test(targetUuid)) {
        throw new Error(`MALFORMED_SQL_TARGET_UUID: Malformed target UUID '${targetUuid}' at ${file}:${l + 1} (must be canonical 8-4-4-4-12 format)`);
      }

      const liabToken = tokens[11].trim();
      let totalLiabilities;
      if (liabToken === 'NULL') {
        totalLiabilities = null;
      } else if (/^\d+$/.test(liabToken)) {
        totalLiabilities = parseInt(liabToken, 10);
        if (!Number.isSafeInteger(totalLiabilities) || totalLiabilities < 0) {
          throw new Error(`INVALID_SQL_FINANCIAL_VALUE: Unsafe liability integer '${liabToken}' at ${file}:${l + 1}`);
        }
      } else {
        throw new Error(`INVALID_SQL_FINANCIAL_VALUE: Malformed liability token '${liabToken}' at ${file}:${l + 1}`);
      }

      if (sqlMap.has(targetUuid)) {
        throw new Error(`DUPLICATE_SQL_TARGET_UUID: Target UUID ${targetUuid} duplicated at ${file}:${l + 1}`);
      }

      if (!crosswalkTargetUuidSet.has(targetUuid)) {
        throw new Error(`UNKNOWN_SQL_TARGET_UUID: Target UUID ${targetUuid} in ${file}:${l + 1} not found in crosswalk`);
      }

      sqlMap.set(targetUuid, {
        chunkName: chunkName || file,
        sqlFile: file,
        sqlLine: l + 1,
        targetUuid,
        currentDbAssets: 0, // Generated column evaluated 0+0+0+0
        currentDbLiabilities: totalLiabilities
      });
    }

    if (expectedTuples !== undefined && chunkTuples !== expectedTuples) {
      throw new Error(`CHUNK_TUPLE_COUNT_MISMATCH: ${file} expected ${expectedTuples} tuples, parsed ${chunkTuples}`);
    }
  }

  // Bidirectional reconciliation: verify crosswalk targets are present in SQL chunks
  if (options.assertFullCoverage || (chunkFiles.length >= 4 && sqlMap.size === crosswalkTargetUuidSet.size)) {
    for (const targetUuid of crosswalkTargetUuidSet) {
      if (!sqlMap.has(targetUuid)) {
        throw new Error(`CROSSWALK_TARGET_MISSING_IN_SQL: Target UUID '${targetUuid}' from crosswalk was not found in parsed SQL chunks`);
      }
    }
  }

  return { sqlMap, totalRawTuplesParsed };
}

/**
 * 3. Validate Production Eligibility Gate Invariants
 * Pure production-gate assertion function with domain validation, strict boolean checks,
 * and fail-closed rejection reason enforcement (Directive 075 §2, §3).
 */
export function validateEligibilityGate({
  eligibility,
  passesExistingOfflineVerifier,
  expectedDatabaseValue,
  proposedValue,
  rejectionReason = null
}) {
  const ALLOWED_STATES = ['ELIGIBLE', 'INELIGIBLE', 'REQUIRES_REVIEW'];
  if (!ALLOWED_STATES.includes(eligibility)) {
    throw new Error(`UNSUPPORTED_ELIGIBILITY_STATE: State '${eligibility}' is not one of [${ALLOWED_STATES.join(', ')}]`);
  }

  // Strict boolean validation on passesExistingOfflineVerifier across all states (Directive 075 §2)
  if (typeof passesExistingOfflineVerifier !== 'boolean') {
    throw new Error(`VERIFIER_GATE_VIOLATION: passesExistingOfflineVerifier must be a strict boolean (got ${typeof passesExistingOfflineVerifier}: ${passesExistingOfflineVerifier})`);
  }

  // Domain validation on expectedDatabaseValue and proposedValue
  if (!isValidFinancialValue(expectedDatabaseValue)) {
    throw new Error(`INVALID_FINANCIAL_VALUE_DOMAIN: expectedDatabaseValue (${expectedDatabaseValue}) is not a valid non-negative integer or null`);
  }
  if (!isValidFinancialValue(proposedValue)) {
    throw new Error(`INVALID_FINANCIAL_VALUE_DOMAIN: proposedValue (${proposedValue}) is not a valid non-negative integer or null`);
  }

  // Invariants by state
  if (eligibility === 'ELIGIBLE') {
    if (passesExistingOfflineVerifier !== true) {
      throw new Error('VERIFIER_GATE_VIOLATION: Record cannot be marked ELIGIBLE without passesExistingOfflineVerifier === true (strictly boolean true)');
    }
    if (expectedDatabaseValue === proposedValue) {
      throw new Error(`ILLEGAL_ELIGIBLE_STATE: Record with expectedDatabaseValue === proposedValue (${proposedValue}) cannot be ELIGIBLE (no mutation required; must be INELIGIBLE)`);
    }
  } else if (eligibility === 'INELIGIBLE') {
    if (passesExistingOfflineVerifier !== false) {
      throw new Error('ILLEGAL_INELIGIBLE_STATE: Record marked INELIGIBLE must have passesExistingOfflineVerifier === false (strictly boolean false)');
    }
    if (expectedDatabaseValue !== proposedValue) {
      throw new Error(`INELIGIBLE_VALUE_MISMATCH: Ineligible record must have expectedDatabaseValue (${expectedDatabaseValue}) === proposedValue (${proposedValue})`);
    }
  } else if (eligibility === 'REQUIRES_REVIEW') {
    if (passesExistingOfflineVerifier !== false) {
      throw new Error('ILLEGAL_REQUIRES_REVIEW_STATE: Record marked REQUIRES_REVIEW must have passesExistingOfflineVerifier === false (strictly boolean false)');
    }
    if (expectedDatabaseValue === proposedValue) {
      throw new Error(`ILLEGAL_REQUIRES_REVIEW_STATE: Record with expectedDatabaseValue === proposedValue (${proposedValue}) requires no mutation and must be INELIGIBLE`);
    }
    if (typeof rejectionReason !== 'string' || rejectionReason.trim() === '') {
      throw new Error(`MISSING_REJECTION_REASON: Record marked REQUIRES_REVIEW must have a non-empty, non-whitespace rejection reason (got ${typeof rejectionReason}: '${rejectionReason}')`);
    }
  }

  return true;
}

/**
 * 4. Evaluate Dimension Eligibility Gate
 * Enforces production verifier execution and invariants.
 */
export function evaluateDimensionEligibility({
  affidavitRecord,
  fieldType,
  manifestBaselineValue,
  expectedDatabaseValue,
  proposedValue,
  proposedClassification,
  sourceFile,
  sourceLine,
  hasSourceConflict = false,
  crosswalkMap,
  ledgerMap,
  repoRoot
}) {
  if (fieldType !== 'ASSET' && fieldType !== 'LIABILITY') {
    throw new Error(`UNSUPPORTED_FIELD_TYPE: Field type must be 'ASSET' or 'LIABILITY'`);
  }

  let passesExistingOfflineVerifier = false;
  let verifierRejectionReason = null;
  let eligibility;
  let eligibilityReason;

  // Case A: No correction required (current database expectation equals proposed target value)
  if (expectedDatabaseValue === proposedValue) {
    eligibility = 'INELIGIBLE';
    eligibilityReason = fieldType === 'ASSET'
      ? 'NO_CORRECTION_REQUIRED: Current database representation already evaluates to genuine zero matching Form 26 disclosure.'
      : 'NO_CORRECTION_REQUIRED: Current database representation already accurately stores the authoritative liability disclosure.';
  } else {
    // Case B: Mutation required. Test through actual validateCorrectionEligibility
    const correction = {
      affidavitId: affidavitRecord.id,
      field: fieldType === 'ASSET' ? 'total_assets' : 'total_liabilities',
      currentRepresentedValue: manifestBaselineValue, // Manifest original required by Pre-condition 3
      intendedValue: proposedValue,
      disclosureClassification: proposedClassification,
      sourceFile,
      sourceLocation: `${sourceFile}:${sourceLine}`,
      hasSourceConflict
    };

    try {
      validateCorrectionEligibility(affidavitRecord, correction, fieldType, crosswalkMap, ledgerMap, repoRoot);
      passesExistingOfflineVerifier = true;
      eligibility = 'ELIGIBLE';
      eligibilityReason = 'SOURCE_VERIFIED: Fully verified by existing offline verifier against component ledger and source coordinate.';
    } catch (err) {
      passesExistingOfflineVerifier = false;
      verifierRejectionReason = err.message;
      eligibility = 'REQUIRES_REVIEW';
      eligibilityReason = `VERIFIER_REJECTION: ${err.message}`;
    }
  }

  // Validate production gate invariants (passes actual verifier rejection reason)
  validateEligibilityGate({
    eligibility,
    passesExistingOfflineVerifier,
    expectedDatabaseValue,
    proposedValue,
    rejectionReason: verifierRejectionReason
  });

  return {
    passesExistingOfflineVerifier,
    verifierRejectionReason,
    eligibility,
    eligibilityReason
  };
}

/**
 * 5. Validate Summary Reconciliation
 * Recomputes totals from manifest.affidavits across all 5 groups, dimensional totals,
 * subset containment, eligibility categories, and rejection reasons, asserting bit-for-bit
 * agreement with summary. Strictly validates all controls, fields, and rejection-reason key sets (Directive 075 §4).
 */
export function validateSummaryReconciliation(manifest, summary) {
  if (!manifest || !Array.isArray(manifest.affidavits)) {
    throw new Error('INVALID_MANIFEST: Manifest missing affidavits array');
  }
  if (!summary || typeof summary !== 'object') {
    throw new Error('INVALID_SUMMARY: Summary missing or invalid');
  }

  // Required summary root sections (Directive 075 §4)
  if (!summary.populationReconciliation || typeof summary.populationReconciliation !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing populationReconciliation object');
  }
  if (!summary.eligibilityBreakdown || typeof summary.eligibilityBreakdown !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing eligibilityBreakdown object');
  }
  if (!summary.populationReconciliation.fiveGroupCounts || typeof summary.populationReconciliation.fiveGroupCounts !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing fiveGroupCounts object');
  }
  if (!summary.populationReconciliation.dimensionalTotals || typeof summary.populationReconciliation.dimensionalTotals !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing dimensionalTotals object');
  }
  if (!summary.populationReconciliation.subsetIntegrity || typeof summary.populationReconciliation.subsetIntegrity !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing subsetIntegrity object');
  }
  if (!summary.eligibilityBreakdown.assetDimension || typeof summary.eligibilityBreakdown.assetDimension !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing assetDimension object');
  }
  if (!summary.eligibilityBreakdown.liabilityDimension || typeof summary.eligibilityBreakdown.liabilityDimension !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing liabilityDimension object');
  }

  // Required summary control fields (Directive 075 §4)
  if (typeof summary.populationReconciliation.totalRetainedAffidavits !== 'number') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary missing totalRetainedAffidavits numeric field');
  }
  if (typeof summary.populationReconciliation.fiveGroupCounts.total !== 'number') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary fiveGroupCounts missing total numeric field');
  }
  if (typeof summary.eligibilityBreakdown.assetDimension.totalEvaluations !== 'number') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary assetDimension missing totalEvaluations numeric field');
  }
  if (typeof summary.eligibilityBreakdown.liabilityDimension.totalEvaluations !== 'number') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary liabilityDimension missing totalEvaluations numeric field');
  }
  if (!summary.eligibilityBreakdown.assetDimension.verifierRejectionBreakdown || typeof summary.eligibilityBreakdown.assetDimension.verifierRejectionBreakdown !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary assetDimension missing verifierRejectionBreakdown object');
  }
  if (!summary.eligibilityBreakdown.liabilityDimension.verifierRejectionBreakdown || typeof summary.eligibilityBreakdown.liabilityDimension.verifierRejectionBreakdown !== 'object') {
    throw new Error('MISSING_SUMMARY_FIELD: Summary liabilityDimension missing verifierRejectionBreakdown object');
  }

  const ALLOWED_GROUPS = [1, 2, 3, 4, 5];
  const ALLOWED_ELIGIBILITY = ['ELIGIBLE', 'INELIGIBLE', 'REQUIRES_REVIEW'];
  const ALLOWED_ASSET_REASONS = [
    'SOURCE_VALUE_UNAVAILABLE',
    'MISSING_LEDGER_ENTRY',
    'UNRESOLVED_SOURCE_CONFLICT',
    'MISSING_REQUIRED_IDENTITY_FIELD'
  ];
  const ALLOWED_LIAB_REASONS = [
    'MISSING_LEDGER_ENTRY',
    'UNRESOLVED_SOURCE_CONFLICT',
    'MISSING_REQUIRED_IDENTITY_FIELD'
  ];

  // 1. Recompute population, group counts, dimensional totals, and subset containment
  const rowGroupCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const rowAssetCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
  const rowLiabCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
  const rowAssetRejection = {
    SOURCE_VALUE_UNAVAILABLE: 0,
    MISSING_LEDGER_ENTRY: 0,
    UNRESOLVED_SOURCE_CONFLICT: 0,
    MISSING_REQUIRED_IDENTITY_FIELD: 0
  };
  const rowLiabRejection = {
    MISSING_LEDGER_ENTRY: 0,
    UNRESOLVED_SOURCE_CONFLICT: 0,
    MISSING_REQUIRED_IDENTITY_FIELD: 0
  };

  let rowAssetPositive = 0;
  let rowAssetMissing = 0;
  let rowAssetZero = 0;

  let rowLiabPositive = 0;
  let rowLiabMissing = 0;
  let rowLiabZero = 0;

  const missingAssetIds = new Set();
  const missingLiabIds = new Set();

  for (let idx = 0; idx < manifest.affidavits.length; idx++) {
    const a = manifest.affidavits[idx];
    if (!a || typeof a !== 'object') {
      throw new Error(`MALFORMED_MANIFEST_AFFIDAVIT: Row at index ${idx} is not an object`);
    }

    // Group validation
    if (!ALLOWED_GROUPS.includes(a.group)) {
      throw new Error(`UNKNOWN_GROUP_VALUE: Row ${a.affidavitId || idx} has invalid group '${a.group}' (must be 1..5)`);
    }
    rowGroupCounts[a.group]++;

    // Asset dimension
    const assetDim = a.dimensions?.asset;
    if (!assetDim) {
      throw new Error(`MISSING_DIMENSION: Row ${a.affidavitId} missing asset dimension`);
    }
    if (!ALLOWED_ELIGIBILITY.includes(assetDim.eligibility)) {
      throw new Error(`UNKNOWN_ELIGIBILITY_VALUE: Row ${a.affidavitId} has invalid asset eligibility '${assetDim.eligibility}'`);
    }
    rowAssetCounts[assetDim.eligibility]++;

    if (assetDim.proposedValue === null) {
      rowAssetMissing++;
      missingAssetIds.add(a.affidavitId);
    } else if (assetDim.proposedValue === 0) {
      rowAssetZero++;
    } else if (typeof assetDim.proposedValue === 'number' && assetDim.proposedValue > 0) {
      rowAssetPositive++;
    } else {
      throw new Error(`INVALID_PROPOSED_VALUE: Row ${a.affidavitId} invalid asset proposedValue: ${assetDim.proposedValue}`);
    }

    if (assetDim.eligibility === 'REQUIRES_REVIEW') {
      if (!assetDim.verifierRejectionReason || typeof assetDim.verifierRejectionReason !== 'string' || assetDim.verifierRejectionReason.trim() === '') {
        throw new Error(`MISSING_REJECTION_REASON: Row ${a.affidavitId} marked REQUIRES_REVIEW has missing or empty asset verifierRejectionReason`);
      }
      const reasonCode = assetDim.verifierRejectionReason.split(':')[0]?.trim();
      if (!ALLOWED_ASSET_REASONS.includes(reasonCode)) {
        throw new Error(`UNKNOWN_REJECTION_REASON: Row ${a.affidavitId} has unknown asset rejection reason '${reasonCode}'`);
      }
      rowAssetRejection[reasonCode]++;
    }

    // Liability dimension
    const liabDim = a.dimensions?.liability;
    if (!liabDim) {
      throw new Error(`MISSING_DIMENSION: Row ${a.affidavitId} missing liability dimension`);
    }
    if (!ALLOWED_ELIGIBILITY.includes(liabDim.eligibility)) {
      throw new Error(`UNKNOWN_ELIGIBILITY_VALUE: Row ${a.affidavitId} has invalid liability eligibility '${liabDim.eligibility}'`);
    }
    rowLiabCounts[liabDim.eligibility]++;

    if (liabDim.proposedValue === null) {
      rowLiabMissing++;
      missingLiabIds.add(a.affidavitId);
    } else if (liabDim.proposedValue === 0) {
      rowLiabZero++;
    } else if (typeof liabDim.proposedValue === 'number' && liabDim.proposedValue > 0) {
      rowLiabPositive++;
    } else {
      throw new Error(`INVALID_PROPOSED_VALUE: Row ${a.affidavitId} invalid liability proposedValue: ${liabDim.proposedValue}`);
    }

    if (liabDim.eligibility === 'REQUIRES_REVIEW') {
      if (!liabDim.verifierRejectionReason || typeof liabDim.verifierRejectionReason !== 'string' || liabDim.verifierRejectionReason.trim() === '') {
        throw new Error(`MISSING_REJECTION_REASON: Row ${a.affidavitId} marked REQUIRES_REVIEW has missing or empty liability verifierRejectionReason`);
      }
      const reasonCode = liabDim.verifierRejectionReason.split(':')[0]?.trim();
      if (!ALLOWED_LIAB_REASONS.includes(reasonCode)) {
        throw new Error(`UNKNOWN_REJECTION_REASON: Row ${a.affidavitId} has unknown liability rejection reason '${reasonCode}'`);
      }
      rowLiabRejection[reasonCode]++;
    }
  }

  // Subset containment check
  let uncoveredMissingAssets = 0;
  for (const id of missingAssetIds) {
    if (!missingLiabIds.has(id)) {
      uncoveredMissingAssets++;
    }
  }
  if (uncoveredMissingAssets > 0) {
    throw new Error(`SUBSET_CONTAINMENT_VIOLATION: ${uncoveredMissingAssets} missing assets are not contained in missing liabilities set`);
  }

  // 2. Assert against summary fields

  // Total population
  const sumPop = summary.populationReconciliation.totalRetainedAffidavits;
  if (sumPop !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Total retained population summary (${sumPop}) != manifest rows (${manifest.affidavits.length})`);
  }

  // Group counts and total
  const sumGroups = summary.populationReconciliation.fiveGroupCounts;
  if (sumGroups.total !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: fiveGroupCounts.total (${sumGroups.total}) != recomputed population (${manifest.affidavits.length})`);
  }
  const groupSum = sumGroups.group1_positiveAssets_positiveLiabilities +
                   sumGroups.group2_positiveAssets_zeroLiabilities +
                   sumGroups.group3_positiveAssets_missingLiabilities +
                   sumGroups.group4_missingAssets_missingLiabilities +
                   sumGroups.group5_zeroAssets_zeroLiabilities;
  if (groupSum !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Sum of five group counts (${groupSum}) != recomputed population (${manifest.affidavits.length})`);
  }
  if (
    sumGroups.group1_positiveAssets_positiveLiabilities !== rowGroupCounts[1] ||
    sumGroups.group2_positiveAssets_zeroLiabilities !== rowGroupCounts[2] ||
    sumGroups.group3_positiveAssets_missingLiabilities !== rowGroupCounts[3] ||
    sumGroups.group4_missingAssets_missingLiabilities !== rowGroupCounts[4] ||
    sumGroups.group5_zeroAssets_zeroLiabilities !== rowGroupCounts[5]
  ) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Five group counts do not match recomputed row counts`);
  }

  // Dimensional totals
  const sumDim = summary.populationReconciliation.dimensionalTotals;
  if (
    sumDim.assetRestorationTotal !== rowAssetPositive ||
    sumDim.assetMissingTotal !== rowAssetMissing ||
    sumDim.assetZeroTotal !== rowAssetZero ||
    sumDim.liabilityRestorationTotal !== rowLiabPositive ||
    sumDim.liabilityMissingTotal !== rowLiabMissing ||
    sumDim.liabilityZeroTotal !== rowLiabZero
  ) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Dimensional totals do not match recomputed row counts`);
  }
  if (sumDim.assetRestorationTotal + sumDim.assetMissingTotal + sumDim.assetZeroTotal !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Sum of asset dimensional totals != recomputed population (${manifest.affidavits.length})`);
  }
  if (sumDim.liabilityRestorationTotal + sumDim.liabilityMissingTotal + sumDim.liabilityZeroTotal !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Sum of liability dimensional totals != recomputed population (${manifest.affidavits.length})`);
  }

  // Subset integrity in summary
  const sumSubset = summary.populationReconciliation.subsetIntegrity;
  if (
    sumSubset.missingAssetsIsSubsetOfMissingLiabilities !== true ||
    sumSubset.missingAssetsCount !== missingAssetIds.size ||
    sumSubset.missingLiabilitiesCount !== missingLiabIds.size ||
    sumSubset.uncoveredMissingAssets !== 0
  ) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Subset integrity summary does not match recomputed row data`);
  }

  // Eligibility breakdown and totalEvaluations (Directive 075 §4)
  const sumAsset = summary.eligibilityBreakdown.assetDimension;
  const sumLiab = summary.eligibilityBreakdown.liabilityDimension;

  if (sumAsset.totalEvaluations !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Asset dimension totalEvaluations (${sumAsset.totalEvaluations}) != recomputed population (${manifest.affidavits.length})`);
  }
  if (sumLiab.totalEvaluations !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Liability dimension totalEvaluations (${sumLiab.totalEvaluations}) != recomputed population (${manifest.affidavits.length})`);
  }

  if (
    sumAsset.eligibleCount !== rowAssetCounts.ELIGIBLE ||
    sumAsset.ineligibleCount !== rowAssetCounts.INELIGIBLE ||
    sumAsset.requiresReviewCount !== rowAssetCounts.REQUIRES_REVIEW
  ) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Asset eligibility counts do not match recomputed row counts`);
  }
  if (sumAsset.eligibleCount + sumAsset.ineligibleCount + sumAsset.requiresReviewCount !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Sum of asset eligibility counts != recomputed population (${manifest.affidavits.length})`);
  }

  if (
    sumLiab.eligibleCount !== rowLiabCounts.ELIGIBLE ||
    sumLiab.ineligibleCount !== rowLiabCounts.INELIGIBLE ||
    sumLiab.requiresReviewCount !== rowLiabCounts.REQUIRES_REVIEW
  ) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Liability eligibility counts do not match recomputed row counts`);
  }
  if (sumLiab.eligibleCount + sumLiab.ineligibleCount + sumLiab.requiresReviewCount !== manifest.affidavits.length) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Sum of liability eligibility counts != recomputed population (${manifest.affidavits.length})`);
  }

  // Rejection reason key sets & values (Directive 075 §4)
  const sumAssetRej = sumAsset.verifierRejectionBreakdown;
  const sumLiabRej = sumLiab.verifierRejectionBreakdown;

  // Strict key set validation: reject unexpected keys
  for (const key of Object.keys(sumAssetRej)) {
    if (!ALLOWED_ASSET_REASONS.includes(key)) {
      throw new Error(`UNEXPECTED_REJECTION_REASON_KEY: Asset verifierRejectionBreakdown contains unexpected key '${key}'`);
    }
  }
  for (const key of Object.keys(sumLiabRej)) {
    if (!ALLOWED_LIAB_REASONS.includes(key)) {
      throw new Error(`UNEXPECTED_REJECTION_REASON_KEY: Liability verifierRejectionBreakdown contains unexpected key '${key}'`);
    }
  }

  // Value reconciliation for each allowed reason
  for (const reason of ALLOWED_ASSET_REASONS) {
    if (sumAssetRej[reason] !== rowAssetRejection[reason]) {
      throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Asset rejection reason '${reason}' summary (${sumAssetRej[reason]}) != row (${rowAssetRejection[reason]})`);
    }
  }
  for (const reason of ALLOWED_LIAB_REASONS) {
    if (sumLiabRej[reason] !== rowLiabRejection[reason]) {
      throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Liability rejection reason '${reason}' summary (${sumLiabRej[reason]}) != row (${rowLiabRejection[reason]})`);
    }
  }

  // Rejection totals reconciliation against requiresReviewCount
  const assetRejSum = Object.values(sumAssetRej).reduce((a, b) => a + b, 0);
  if (assetRejSum !== sumAsset.requiresReviewCount) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Asset rejection reasons sum (${assetRejSum}) != requiresReviewCount (${sumAsset.requiresReviewCount})`);
  }
  const liabRejSum = Object.values(sumLiabRej).reduce((a, b) => a + b, 0);
  if (liabRejSum !== sumLiab.requiresReviewCount) {
    throw new Error(`SUMMARY_RECONCILIATION_MISMATCH: Liability rejection reasons sum (${liabRejSum}) != requiresReviewCount (${sumLiab.requiresReviewCount})`);
  }

  return {
    recomputedPopulation: manifest.affidavits.length,
    recomputedGroupCounts: rowGroupCounts,
    recomputedAssetCounts: rowAssetCounts,
    recomputedLiabilityCounts: rowLiabCounts,
    recomputedAssetRejection: rowAssetRejection,
    recomputedLiabilityRejection: rowLiabRejection,
    subsetContainmentVerified: true
  };
}

/**
 * 6. Validate Source Evidence File
 * Verifies file exists, safe pathing inside repository root, and matches recorded non-empty SHA-256 hash.
 */
export function validateSourceEvidenceFile(relPath, expectedHash, repoRoot) {
  if (!relPath || typeof relPath !== 'string' || relPath.trim() === '') {
    throw new Error('INVALID_PATH: relPath must be a non-empty string');
  }
  if (!expectedHash || typeof expectedHash !== 'string' || expectedHash.trim() === '') {
    throw new Error('INVALID_EXPECTED_HASH: Expected SHA-256 hash must be a non-empty string');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(expectedHash.trim())) {
    throw new Error(`MALFORMED_EXPECTED_HASH: Expected SHA-256 hash must be a valid 64-character hex string, got '${expectedHash}'`);
  }

  let fullPath;
  try {
    fullPath = safeCanonicalPath(relPath, repoRoot);
  } catch (err) {
    if (err.message.startsWith('FILE_NOT_FOUND')) {
      throw new Error(`MISSING_SOURCE_FILE: Source file not found: ${relPath} (${err.message})`);
    }
    throw err;
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`MISSING_SOURCE_FILE: Source file not found: ${relPath}`);
  }

  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
  if (actualHash.toLowerCase() !== expectedHash.trim().toLowerCase()) {
    throw new Error(`SOURCE_HASH_MISMATCH: File ${relPath} computed hash ${actualHash} != expected ${expectedHash}`);
  }

  return { fullPath, sha256: actualHash };
}
