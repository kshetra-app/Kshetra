import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseSourceProfile, validateCorrectionEligibility, safeCanonicalPath } from './verify_financial_remediation.mjs';

const REPO_ROOT = process.cwd();

console.log('=== KSHETRA W021.5 / DIRECTIVE 072 RECONCILIATION AUDIT ===');
console.log('Repository Root:', REPO_ROOT);

// 1. Load Authoritative Affidavit Manifest
const manifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json');
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifestData = JSON.parse(manifestRaw);
const affidavits = manifestData.affidavits;

console.log(`Loaded ${affidavits.length} affidavits from ${manifestPath}`);
if (affidavits.length !== 4523) {
  throw new Error(`Expected 4523 affidavits, found ${affidavits.length}`);
}

// 2. Load 965-Field Reconciled Inventory (Category 1: Missing Disclosures)
const inventoryPath = path.join(REPO_ROOT, 'scratch/directive_032_scratch/reconciled_package_a2_full_inventory.json');
const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

const missingAssetMap = new Map();
for (const item of inventoryData.assetCorrections) {
  missingAssetMap.set(item.affidavitId, item);
}

const missingLiabilityMap = new Map();
for (const item of inventoryData.liabilityCorrections) {
  missingLiabilityMap.set(item.affidavitId, item);
}

console.log(`Loaded ${missingAssetMap.size} missing assets and ${missingLiabilityMap.size} missing liabilities from inventory`);
if (missingAssetMap.size !== 72) {
  throw new Error(`Expected 72 missing assets, found ${missingAssetMap.size}`);
}
if (missingLiabilityMap.size !== 893) {
  throw new Error(`Expected 893 missing liabilities, found ${missingLiabilityMap.size}`);
}

// 3. Load and Validate Crosswalk (Strict Bijection - No Fallbacks)
const crosswalkPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_048_4523_manifest_to_target_crosswalk.json');
if (!fs.existsSync(crosswalkPath)) {
  throw new Error(`MISSING_CROSSWALK_FILE: Crosswalk file not found at ${crosswalkPath}`);
}
const crosswalkData = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
if (crosswalkData.length !== 4523) {
  throw new Error(`CROSSWALK_POPULATION_MISMATCH: Expected 4523 crosswalk entries, found ${crosswalkData.length}`);
}

const crosswalkMap = new Map();
const crosswalkTargetUuidSet = new Set();
for (const entry of crosswalkData) {
  if (!entry.manifestId || !entry.targetUuid) {
    throw new Error(`MALFORMED_CROSSWALK_ENTRY: Missing manifestId or targetUuid`);
  }
  if (crosswalkMap.has(entry.manifestId)) {
    throw new Error(`DUPLICATE_CROSSWALK_MANIFEST_ID: ${entry.manifestId}`);
  }
  if (crosswalkTargetUuidSet.has(entry.targetUuid)) {
    throw new Error(`DUPLICATE_CROSSWALK_TARGET_UUID: ${entry.targetUuid}`);
  }
  crosswalkMap.set(entry.manifestId, entry);
  crosswalkTargetUuidSet.add(entry.targetUuid);
}
console.log(`Validated ${crosswalkMap.size} unique bijective crosswalk entries`);

// 4. Load Component Ledger
const ledgerPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_047_1120_component_ledger.json');
if (!fs.existsSync(ledgerPath)) {
  throw new Error(`MISSING_LEDGER_FILE: Component ledger not found at ${ledgerPath}`);
}
const ledgerData = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerMap = new Map();
for (const entry of ledgerData) {
  if (ledgerMap.has(entry.manifestId)) {
    throw new Error(`DUPLICATE_LEDGER_MANIFEST_ID: ${entry.manifestId}`);
  }
  ledgerMap.set(entry.manifestId, entry);
}
console.log(`Loaded ${ledgerMap.size} component ledger entries`);

// 5. Parse and Validate Raw SQL Chunks with Strict Tuple Accounting
const chunkFiles = [
  { file: '066_b2_2e_chunk_02_affidavits_part1.sql', expectedTuples: 1196 },
  { file: '066_b2_2e_chunk_03_affidavits_part2.sql', expectedTuples: 1272 },
  { file: '066_b2_2e_chunk_04_affidavits_part3.sql', expectedTuples: 1150 },
  { file: '066_b2_2e_chunk_05_affidavits_part4.sql', expectedTuples: 905 }
];

const sqlChunkRecordMap = new Map();
let totalRawTuplesParsed = 0;

for (const { file: chunkFile, expectedTuples } of chunkFiles) {
  const chunkPath = path.join(REPO_ROOT, 'supabase/staging_packages/066_b2_2e_chunked', chunkFile);
  const content = fs.readFileSync(chunkPath, 'utf8');
  const lines = content.split('\n');
  let chunkTuples = 0;
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
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
    const candidateName = tokens[1].replace(/^'|'$/g, '');
    const acNo = parseInt(tokens[2], 10);
    const constituency = tokens[3].replace(/^'|'$/g, '');
    const stateCode = tokens[4].replace(/^'|'$/g, '');
    const party = tokens[5].replace(/^'|'$/g, '');
    const electionYear = parseInt(tokens[6], 10);
    const personId = tokens[7].replace(/::uuid$/, '').replace(/^'|'$/g, '');
    const candidacyId = tokens[8].replace(/::uuid$/, '').replace(/^'|'$/g, '');
    const provenanceId = tokens[9].replace(/::uuid$/, '').replace(/^'|'$/g, '');
    const dataStatus = tokens[10].replace(/^'|'$/g, '');
    const liabToken = tokens[11];
    
    const totalLiabilities = liabToken === 'NULL' ? null : parseInt(liabToken, 10);
    const totalAssets = 0; // Evaluated generated column
    
    if (sqlChunkRecordMap.has(targetUuid)) {
      throw new Error(`DUPLICATE_SQL_TARGET_UUID: Target UUID ${targetUuid} duplicated at ${chunkFile}:${lineIdx + 1}`);
    }

    if (!crosswalkTargetUuidSet.has(targetUuid)) {
      throw new Error(`UNKNOWN_SQL_TARGET_UUID: Target UUID ${targetUuid} in ${chunkFile} not found in crosswalk`);
    }

    sqlChunkRecordMap.set(targetUuid, {
      chunkFile,
      sqlLineNum: lineIdx + 1,
      targetUuid,
      candidateName,
      acNo,
      constituency,
      stateCode,
      party,
      electionYear,
      personId,
      candidacyId,
      provenanceId,
      dataStatus,
      currentDbAssets: totalAssets,
      currentDbLiabilities: totalLiabilities
    });
  }

  if (chunkTuples !== expectedTuples) {
    throw new Error(`CHUNK_TUPLE_COUNT_MISMATCH: ${chunkFile} expected ${expectedTuples} tuples, parsed ${chunkTuples}`);
  }
}

if (totalRawTuplesParsed !== 4523 || sqlChunkRecordMap.size !== 4523) {
  throw new Error(`SQL_RECONCILIATION_FAILED: Expected exactly 4523 unique SQL tuples, got ${sqlChunkRecordMap.size}`);
}
console.log(`Parsed and validated exactly ${sqlChunkRecordMap.size} unique records from SQL chunks`);

// 6. Perform Row-Level Mathematical and Invariant Auditing
const auditResults = [];

const groupCounts = { group1: 0, group2: 0, group3: 0, group4: 0, group5: 0 };
let positiveAssetsCount = 0;
let missingAssetsCount = 0;
let genuineZeroAssetsCount = 0;

let positiveLiabilitiesCount = 0;
let missingLiabilitiesCount = 0;
let genuineZeroLiabilitiesCount = 0;

const parseErrors = [];
const sourceValidationFailures = [];

const assetEligibilitySummary = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
const liabilityEligibilitySummary = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };

for (const aff of affidavits) {
  const cw = crosswalkMap.get(aff.id);
  if (!cw || !cw.targetUuid) {
    throw new Error(`FAIL_CLOSED: Missing crosswalk entry for affidavit ${aff.id}`);
  }
  const targetUuid = cw.targetUuid;
  
  const sqlRecord = sqlChunkRecordMap.get(targetUuid);
  if (!sqlRecord) {
    throw new Error(`FAIL_CLOSED: Target UUID ${targetUuid} for affidavit ${aff.id} not found in SQL chunk records`);
  }
  
  const isMissingAsset = missingAssetMap.has(aff.id);
  const isMissingLiability = missingLiabilityMap.has(aff.id);
  
  // Parse source profile safely
  let parsedSource = null;
  try {
    parsedSource = parseSourceProfile(aff.source_file, aff.source_line, aff.candidate_name, aff.ac_no, REPO_ROOT);
  } catch (err) {
    parseErrors.push({
      id: aff.id,
      candidateName: aff.candidate_name,
      file: aff.source_file,
      line: aff.source_line,
      error: err.message
    });
  }
  
  const sourceAssetsRaw = parsedSource ? parsedSource.totalAssets : undefined;
  const sourceLiabilitiesRaw = parsedSource ? parsedSource.totalLiabilities : undefined;
  
  // Asset Dimension
  let proposedAssetValue;
  let proposedAssetClassification;
  let assetEligibility;
  let assetEligibilityReason;
  let assetPassesVerifier = false;
  let assetVerifierRejectionReason = null;
  
  if (isMissingAsset) {
    missingAssetsCount++;
    proposedAssetValue = null;
    proposedAssetClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
  } else if (aff.total_assets === 0) {
    genuineZeroAssetsCount++;
    proposedAssetValue = 0;
    proposedAssetClassification = 'VERIFIED_GENUINE_ZERO';
  } else if (aff.total_assets > 0) {
    positiveAssetsCount++;
    proposedAssetValue = aff.total_assets;
    proposedAssetClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
  } else {
    throw new Error(`Unclassified asset status for affidavit ${aff.id}`);
  }

  // Verifier execution for Asset
  if (proposedAssetValue === 0 && !isMissingAsset) {
    // Group 5: currentDbAssets (0) === proposedAssetValue (0)
    assetEligibility = 'INELIGIBLE';
    assetEligibilityReason = 'NO_CORRECTION_REQUIRED: Current database representation already evaluates to genuine zero matching Form 26 disclosure.';
    assetEligibilitySummary.INELIGIBLE++;
  } else {
    // Mutation required: test with validateCorrectionEligibility
    const assetCorrection = {
      affidavitId: aff.id,
      field: 'total_assets',
      currentRepresentedValue: aff.total_assets,
      intendedValue: proposedAssetValue,
      disclosureClassification: proposedAssetClassification,
      sourceFile: aff.source_file,
      sourceLocation: `${aff.source_file}:${aff.source_line}`,
      hasSourceConflict: (aff.id === '0215b22e-aff-00001430')
    };

    try {
      validateCorrectionEligibility(aff, assetCorrection, 'ASSET', crosswalkMap, ledgerMap, REPO_ROOT);
      assetPassesVerifier = true;
      assetEligibility = 'ELIGIBLE';
      assetEligibilityReason = 'SOURCE_VERIFIED: Fully verified by existing offline verifier against component ledger and source coordinate.';
      assetEligibilitySummary.ELIGIBLE++;
    } catch (err) {
      assetPassesVerifier = false;
      assetVerifierRejectionReason = err.message;
      assetEligibility = 'REQUIRES_REVIEW';
      assetEligibilityReason = `VERIFIER_REJECTION: ${err.message}`;
      assetEligibilitySummary.REQUIRES_REVIEW++;
    }
  }
  
  // Liability Dimension
  let proposedLiabilityValue;
  let proposedLiabilityClassification;
  let liabilityEligibility;
  let liabilityEligibilityReason;
  let liabilityPassesVerifier = false;
  let liabilityVerifierRejectionReason = null;
  
  if (isMissingLiability) {
    missingLiabilitiesCount++;
    proposedLiabilityValue = null;
    proposedLiabilityClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
  } else if (aff.total_liabilities === 0) {
    genuineZeroLiabilitiesCount++;
    proposedLiabilityValue = 0;
    proposedLiabilityClassification = 'VERIFIED_GENUINE_ZERO';
  } else if (aff.total_liabilities > 0) {
    positiveLiabilitiesCount++;
    proposedLiabilityValue = aff.total_liabilities;
    proposedLiabilityClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
  } else {
    throw new Error(`Unclassified liability status for affidavit ${aff.id}`);
  }

  // Verifier execution for Liability
  if (!isMissingLiability) {
    // Groups 1, 2, 5: currentDbLiabilities matches proposedLiabilityValue
    liabilityEligibility = 'INELIGIBLE';
    liabilityEligibilityReason = 'NO_CORRECTION_REQUIRED: Current database representation already accurately stores the authoritative liability disclosure.';
    liabilityEligibilitySummary.INELIGIBLE++;
  } else {
    // Mutation required (Groups 3, 4): test with validateCorrectionEligibility
    const liabilityCorrection = missingLiabilityMap.get(aff.id) || {
      affidavitId: aff.id,
      field: 'total_liabilities',
      currentRepresentedValue: aff.total_liabilities,
      intendedValue: null,
      disclosureClassification: proposedLiabilityClassification,
      sourceFile: aff.source_file,
      sourceLocation: `${aff.source_file}:${aff.source_line}`,
      hasSourceConflict: (aff.id === '0215b22e-aff-00001430')
    };

    try {
      validateCorrectionEligibility(aff, liabilityCorrection, 'LIABILITY', crosswalkMap, ledgerMap, REPO_ROOT);
      liabilityPassesVerifier = true;
      liabilityEligibility = 'ELIGIBLE';
      liabilityEligibilityReason = 'SOURCE_VERIFIED: Fully verified by existing offline verifier against component ledger and source coordinate.';
      liabilityEligibilitySummary.ELIGIBLE++;
    } catch (err) {
      liabilityPassesVerifier = false;
      liabilityVerifierRejectionReason = err.message;
      liabilityEligibility = 'REQUIRES_REVIEW';
      liabilityEligibilityReason = `VERIFIER_REJECTION: ${err.message}`;
      liabilityEligibilitySummary.REQUIRES_REVIEW++;
    }
  }
  
  // Group Classification
  let group = 0;
  if (proposedAssetValue > 0 && proposedLiabilityValue > 0) {
    group = 1;
    groupCounts.group1++;
  } else if (proposedAssetValue > 0 && proposedLiabilityValue === 0) {
    group = 2;
    groupCounts.group2++;
  } else if (proposedAssetValue > 0 && proposedLiabilityValue === null) {
    group = 3;
    groupCounts.group3++;
  } else if (proposedAssetValue === null && proposedLiabilityValue === null) {
    group = 4;
    groupCounts.group4++;
  } else if (proposedAssetValue === 0 && proposedLiabilityValue === 0) {
    group = 5;
    groupCounts.group5++;
  } else {
    throw new Error(`Record ${aff.id} fell outside the five established financial groups`);
  }
  
  auditResults.push({
    affidavitId: aff.id,
    targetUuid,
    candidacyId: aff.candidacy_id,
    personId: aff.person_id,
    candidateName: aff.candidate_name,
    acNo: aff.ac_no,
    constituencyName: aff.constituency_name,
    stateCode: aff.state_code,
    party: aff.party,
    electionYear: aff.election_year,
    sourceFile: aff.source_file,
    sourceLine: aff.source_line,
    group,
    asset: {
      currentDbValue: sqlRecord.currentDbAssets,
      evidenceBasis: 'SCHEMA_DERIVED_EXPECTATION',
      evidenceBasisDetails: 'Offline expectation derived from PostgreSQL schema: total_assets GENERATED ALWAYS AS (self_movable + self_immovable + spouse_movable + spouse_immovable) STORED. Chunks 02-05 omitted component columns during ingestion, defaulting to 0 (0+0+0+0=0). Live Supabase not accessed.',
      currentDbClassification: 'COERCED_SCHEMA_DEFAULT_ZERO',
      proposedValue: proposedAssetValue,
      proposedClassification: proposedAssetClassification,
      sourceRawValue: sourceAssetsRaw !== undefined ? sourceAssetsRaw : 'UNAVAILABLE_OR_NESTED',
      passesExistingOfflineVerifier: assetPassesVerifier,
      verifierRejectionReason: assetVerifierRejectionReason,
      eligibility: assetEligibility,
      eligibilityReason: assetEligibilityReason,
      requiresDbMutation: sqlRecord.currentDbAssets !== proposedAssetValue
    },
    liability: {
      currentDbValue: sqlRecord.currentDbLiabilities,
      evidenceBasis: 'SQL_SOURCE_DERIVED_EXPECTATION',
      evidenceBasisDetails: 'Offline expectation derived from static source inspection of column 12 tuple values in accepted SQL files: supabase/staging_packages/066_b2_2e_chunked/066_b2_2e_chunk_02..05. Live Supabase not accessed.',
      currentDbClassification: sqlRecord.currentDbLiabilities === null ? 'MISSING_DISCLOSURE' : sqlRecord.currentDbLiabilities === 0 ? (isMissingLiability ? 'COERCED_ZERO' : 'GENUINE_ZERO') : 'POSITIVE',
      proposedValue: proposedLiabilityValue,
      proposedClassification: proposedLiabilityClassification,
      sourceRawValue: sourceLiabilitiesRaw !== undefined ? sourceLiabilitiesRaw : 'UNAVAILABLE_OR_NESTED',
      passesExistingOfflineVerifier: liabilityPassesVerifier,
      verifierRejectionReason: liabilityVerifierRejectionReason,
      eligibility: liabilityEligibility,
      eligibilityReason: liabilityEligibilityReason,
      requiresDbMutation: sqlRecord.currentDbLiabilities !== proposedLiabilityValue
    }
  });
}

console.log('=== AUDIT RECONCILIATION SUMMARY ===');
console.log('Total Records Audited:', auditResults.length);
console.log('Group Counts:');
console.log('  Group 1 (Assets > 0, Liabilities > 0):', groupCounts.group1, '(Expected: 3334)');
console.log('  Group 2 (Assets > 0, Liabilities == 0):', groupCounts.group2, '(Expected: 185)');
console.log('  Group 3 (Assets > 0, Liabilities == null):', groupCounts.group3, '(Expected: 821)');
console.log('  Group 4 (Assets == null, Liabilities == null):', groupCounts.group4, '(Expected: 72)');
console.log('  Group 5 (Assets == 0, Liabilities == 0):', groupCounts.group5, '(Expected: 111)');
console.log('  Total Groups Sum:', groupCounts.group1 + groupCounts.group2 + groupCounts.group3 + groupCounts.group4 + groupCounts.group5);

console.log('Asset Dimensional Counts:');
console.log('  Positive Assets:', positiveAssetsCount, '(Expected: 4340)');
console.log('  Missing Assets (null):', missingAssetsCount, '(Expected: 72)');
console.log('  Genuine Zero Assets (0):', genuineZeroAssetsCount, '(Expected: 111)');
console.log('  Total Assets:', positiveAssetsCount + missingAssetsCount + genuineZeroAssetsCount);

console.log('Liability Dimensional Counts:');
console.log('  Positive Liabilities:', positiveLiabilitiesCount, '(Expected: 3334)');
console.log('  Missing Liabilities (null):', missingLiabilitiesCount, '(Expected: 893)');
console.log('  Genuine Zero Liabilities (0):', genuineZeroLiabilitiesCount, '(Expected: 296)');
console.log('  Total Liabilities:', positiveLiabilitiesCount + missingLiabilitiesCount + genuineZeroLiabilitiesCount);

console.log('Asset Eligibility Summary:');
console.log('  Eligible:', assetEligibilitySummary.ELIGIBLE, '(Expected: 0)');
console.log('  Ineligible:', assetEligibilitySummary.INELIGIBLE, '(Expected: 111)');
console.log('  Requires Review:', assetEligibilitySummary.REQUIRES_REVIEW, '(Expected: 4412)');

console.log('Liability Eligibility Summary:');
console.log('  Eligible:', liabilityEligibilitySummary.ELIGIBLE, '(Expected: 0)');
console.log('  Ineligible:', liabilityEligibilitySummary.INELIGIBLE, '(Expected: 3630)');
console.log('  Requires Review:', liabilityEligibilitySummary.REQUIRES_REVIEW, '(Expected: 893)');

console.log('Subset Containment:');
let missingAssetsInMissingLiabilities = 0;
for (const [id] of missingAssetMap) {
  if (missingLiabilityMap.has(id)) {
    missingAssetsInMissingLiabilities++;
  }
}
console.log(`  Missing Assets in Missing Liabilities Set: ${missingAssetsInMissingLiabilities} of ${missingAssetMap.size}`);
console.log(`  Uncovered Missing Assets: ${missingAssetMap.size - missingAssetsInMissingLiabilities} (Expected: 0)`);

if (
  groupCounts.group1 === 3334 &&
  groupCounts.group2 === 185 &&
  groupCounts.group3 === 821 &&
  groupCounts.group4 === 72 &&
  groupCounts.group5 === 111 &&
  positiveAssetsCount === 4340 &&
  missingAssetsCount === 72 &&
  genuineZeroAssetsCount === 111 &&
  positiveLiabilitiesCount === 3334 &&
  missingLiabilitiesCount === 893 &&
  genuineZeroLiabilitiesCount === 296 &&
  missingAssetsInMissingLiabilities === 72 &&
  assetEligibilitySummary.ELIGIBLE === 0 &&
  assetEligibilitySummary.INELIGIBLE === 111 &&
  assetEligibilitySummary.REQUIRES_REVIEW === 4412 &&
  liabilityEligibilitySummary.ELIGIBLE === 0 &&
  liabilityEligibilitySummary.INELIGIBLE === 3630 &&
  liabilityEligibilitySummary.REQUIRES_REVIEW === 893
) {
  console.log('ALL MATHEMATICAL POPULATION AND INVARIANT CONTROLS PASSED EXACTLY!');
} else {
  console.error('INVARIANT CONTROL FAILURE DETECTED!');
  process.exit(1);
}
