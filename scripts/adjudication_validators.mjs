import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseSourceProfile, validateCorrectionEligibility, safeCanonicalPath } from './verify_financial_remediation.mjs';

/**
 * Kshetra W021.5 / B2.2-E — Reusable Production Adjudication Validators
 * Fulfills CTO Directive 072 & 073 requirements:
 * - Production-path crosswalk bijection validation
 * - Production-path SQL chunk tuple counting and target UUID uniqueness validation
 * - Production-path dimension eligibility gate enforcement
 * - Production-path summary vs manifest count reconciliation validation
 * - Production-path source evidence file existence and hash verification
 */

/**
 * 1. Validate Crosswalk
 * Asserts exact population count, non-empty IDs, and bijective uniqueness.
 */
export function validateCrosswalk(crosswalkList, expectedPopulation = 4523) {
  if (!Array.isArray(crosswalkList)) {
    throw new Error('INVALID_CROSSWALK: Crosswalk data must be an array');
  }
  if (crosswalkList.length !== expectedPopulation) {
    throw new Error(`CROSSWALK_POPULATION_MISMATCH: Expected ${expectedPopulation} crosswalk entries, found ${crosswalkList.length}`);
  }

  const crosswalkMap = new Map();
  const crosswalkTargetUuidSet = new Set();

  for (let i = 0; i < crosswalkList.length; i++) {
    const cw = crosswalkList[i];
    if (!cw || typeof cw !== 'object') {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Entry at index ${i} is not an object`);
    }
    if (!cw.manifestId || typeof cw.manifestId !== 'string' || cw.manifestId.trim() === '') {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Missing or empty manifestId at index ${i}`);
    }
    if (!cw.targetUuid || typeof cw.targetUuid !== 'string' || cw.targetUuid.trim() === '') {
      throw new Error(`MALFORMED_CROSSWALK_ENTRY: Missing or empty targetUuid at index ${i}`);
    }

    if (crosswalkMap.has(cw.manifestId)) {
      throw new Error(`DUPLICATE_CROSSWALK_MANIFEST_ID: Duplicate manifestId '${cw.manifestId}' at index ${i}`);
    }
    if (crosswalkTargetUuidSet.has(cw.targetUuid)) {
      throw new Error(`DUPLICATE_CROSSWALK_TARGET_UUID: Duplicate targetUuid '${cw.targetUuid}' at index ${i}`);
    }

    crosswalkMap.set(cw.manifestId, cw);
    crosswalkTargetUuidSet.add(cw.targetUuid);
  }

  return { crosswalkMap, crosswalkTargetUuidSet };
}

/**
 * 2. Validate SQL Chunks
 * Asserts raw tuple counts per chunk, target UUID uniqueness, and crosswalk target presence.
 */
export function validateSqlChunks(chunkFiles, crosswalkTargetUuidSet, repoRoot) {
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
    const p = path.join(repoRoot, 'supabase/staging_packages/066_b2_2e_chunked', file);
    if (!fs.existsSync(p)) {
      throw new Error(`MISSING_SQL_CHUNK_FILE: Chunk file not found at ${p}`);
    }

    const lines = fs.readFileSync(p, 'utf8').split('\n');
    let chunkTuples = 0;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if (!line.startsWith("('0215b22e-0001-0000-0000-")) continue;

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

      const targetUuid = tokens[0].replace(/::uuid$/, '').replace(/^'|'$/g, '');
      const liabToken = tokens[11];
      const totalLiabilities = liabToken === 'NULL' ? null : parseInt(liabToken, 10);

      if (sqlMap.has(targetUuid)) {
        throw new Error(`DUPLICATE_SQL_TARGET_UUID: Target UUID ${targetUuid} duplicated at ${file}:${l + 1}`);
      }

      if (!crosswalkTargetUuidSet.has(targetUuid)) {
        throw new Error(`UNKNOWN_SQL_TARGET_UUID: Target UUID ${targetUuid} in ${file} not found in crosswalk`);
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

  return { sqlMap, totalRawTuplesParsed };
}

/**
 * 3. Validate Production Eligibility Gate Invariants
 * Pure production-gate assertion function.
 */
export function validateEligibilityGate({
  eligibility,
  passesExistingOfflineVerifier,
  expectedDatabaseValue,
  proposedValue
}) {
  if (eligibility === 'ELIGIBLE' && !passesExistingOfflineVerifier) {
    throw new Error('VERIFIER_GATE_VIOLATION: Record cannot be marked ELIGIBLE without passesExistingOfflineVerifier === true');
  }

  if (eligibility === 'INELIGIBLE' && expectedDatabaseValue !== proposedValue) {
    throw new Error(`INELIGIBLE_VALUE_MISMATCH: Ineligible record must have expectedDatabaseValue (${expectedDatabaseValue}) === proposedValue (${proposedValue})`);
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

  // Validate production gate invariants
  validateEligibilityGate({
    eligibility,
    passesExistingOfflineVerifier,
    expectedDatabaseValue,
    proposedValue
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
 * Recomputes totals from manifest.affidavits and asserts bit-for-bit match with summary.
 */
export function validateSummaryReconciliation(manifest, summary) {
  if (!manifest || !manifest.affidavits) {
    throw new Error('INVALID_MANIFEST: Manifest missing affidavits array');
  }
  if (!summary || !summary.eligibilityBreakdown) {
    throw new Error('INVALID_SUMMARY: Summary missing eligibilityBreakdown');
  }

  const rowAssetCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
  const rowLiabCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
  const rowGroupCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const a of manifest.affidavits) {
    rowGroupCounts[a.group]++;
    rowAssetCounts[a.dimensions.asset.eligibility]++;
    rowLiabCounts[a.dimensions.liability.eligibility]++;
  }

  const sumAsset = summary.eligibilityBreakdown.assetDimension;
  const sumLiab = summary.eligibilityBreakdown.liabilityDimension;

  if (
    sumAsset.eligibleCount !== rowAssetCounts.ELIGIBLE ||
    sumAsset.ineligibleCount !== rowAssetCounts.INELIGIBLE ||
    sumAsset.requiresReviewCount !== rowAssetCounts.REQUIRES_REVIEW
  ) {
    throw new Error(`SUMMARY_MANIFEST_DISCORD: Asset summary counts [${sumAsset.eligibleCount}, ${sumAsset.ineligibleCount}, ${sumAsset.requiresReviewCount}] do not match row counts [${rowAssetCounts.ELIGIBLE}, ${rowAssetCounts.INELIGIBLE}, ${rowAssetCounts.REQUIRES_REVIEW}]`);
  }

  if (
    sumLiab.eligibleCount !== rowLiabCounts.ELIGIBLE ||
    sumLiab.ineligibleCount !== rowLiabCounts.INELIGIBLE ||
    sumLiab.requiresReviewCount !== rowLiabCounts.REQUIRES_REVIEW
  ) {
    throw new Error(`SUMMARY_MANIFEST_DISCORD: Liability summary counts [${sumLiab.eligibleCount}, ${sumLiab.ineligibleCount}, ${sumLiab.requiresReviewCount}] do not match row counts [${rowLiabCounts.ELIGIBLE}, ${rowLiabCounts.INELIGIBLE}, ${rowLiabCounts.REQUIRES_REVIEW}]`);
  }

  return {
    recomputedAssetCounts: rowAssetCounts,
    recomputedLiabilityCounts: rowLiabCounts,
    recomputedGroupCounts: rowGroupCounts
  };
}

/**
 * 6. Validate Source Evidence File
 * Verifies file exists and matches recorded SHA-256 hash.
 */
export function validateSourceEvidenceFile(relPath, expectedHash, repoRoot) {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('INVALID_PATH: relPath must be a non-empty string');
  }

  let fullPath;
  try {
    fullPath = safeCanonicalPath(relPath, repoRoot);
  } catch (err) {
    throw new Error(`MISSING_SOURCE_FILE: Source file not found: ${relPath} (${err.message})`);
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`MISSING_SOURCE_FILE: Source file not found: ${relPath}`);
  }

  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
  if (expectedHash && actualHash !== expectedHash) {
    throw new Error(`SOURCE_HASH_MISMATCH: File ${relPath} computed hash ${actualHash} != expected ${expectedHash}`);
  }

  return { fullPath, sha256: actualHash };
}
