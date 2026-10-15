import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseSourceProfile } from './verify_financial_remediation.mjs';
import {
  validateCrosswalk,
  validateSqlChunks,
  evaluateDimensionEligibility
} from './adjudication_validators.mjs';

const REPO_ROOT = process.cwd();

console.log('=== GENERATING DIRECTIVE 074 ADJUDICATION MANIFEST ===');

// 1. Load Authoritative Affidavit Manifest
const manifestPath = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!manifest.affidavits || manifest.affidavits.length !== 4523) {
  throw new Error(`Expected 4523 affidavits in manifest, got ${manifest.affidavits ? manifest.affidavits.length : 0}`);
}

// 2. Validate Crosswalk with Production Validator
const crosswalkPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_048_4523_manifest_to_target_crosswalk.json');
if (!fs.existsSync(crosswalkPath)) {
  throw new Error(`MISSING_CROSSWALK_FILE: Crosswalk file not found at ${crosswalkPath}`);
}
const crosswalkList = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
const { crosswalkMap, crosswalkTargetUuidSet } = validateCrosswalk(crosswalkList, 4523);
console.log(`Validated bijective crosswalk: 4523 entries`);

// 3. Load Component Ledger
const ledgerPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_047_1120_component_ledger.json');
const ledgerList = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerMap = new Map();
for (const l of ledgerList) {
  if (ledgerMap.has(l.manifestId)) {
    throw new Error(`DUPLICATE_LEDGER_MANIFEST_ID: ${l.manifestId}`);
  }
  ledgerMap.set(l.manifestId, l);
}
console.log(`Loaded ${ledgerMap.size} component ledger entries`);

// 4. Load Reconciled Inventory (Missing Disclosures)
const inventoryPath = path.join(REPO_ROOT, 'scratch/directive_032_scratch/reconciled_package_a2_full_inventory.json');
const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const missingAssetMap = new Map(inventoryData.assetCorrections.map(a => [a.affidavitId, a]));
const missingLiabilityMap = new Map(inventoryData.liabilityCorrections.map(l => [l.affidavitId, l]));

if (missingAssetMap.size !== 72) {
  throw new Error(`Expected 72 missing assets in inventory, got ${missingAssetMap.size}`);
}
if (missingLiabilityMap.size !== 893) {
  throw new Error(`Expected 893 missing liabilities in inventory, got ${missingLiabilityMap.size}`);
}

// 5. Precompute Source File Hashes
const sourceFileHashes = {};
for (const aff of manifest.affidavits) {
  if (!sourceFileHashes[aff.source_file]) {
    const fullPath = path.join(REPO_ROOT, aff.source_file);
    if (fs.existsSync(fullPath)) {
      sourceFileHashes[aff.source_file] = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    } else {
      sourceFileHashes[aff.source_file] = 'FILE_NOT_FOUND';
    }
  }
}

// 6. Validate Raw SQL Chunks with Production Validator
const chunkFiles = [
  { file: '066_b2_2e_chunk_02_affidavits_part1.sql', chunkName: 'Chunk 02', expectedTuples: 1196 },
  { file: '066_b2_2e_chunk_03_affidavits_part2.sql', chunkName: 'Chunk 03', expectedTuples: 1272 },
  { file: '066_b2_2e_chunk_04_affidavits_part3.sql', chunkName: 'Chunk 04', expectedTuples: 1150 },
  { file: '066_b2_2e_chunk_05_affidavits_part4.sql', chunkName: 'Chunk 05', expectedTuples: 905 }
];

const { sqlMap, totalRawTuplesParsed } = validateSqlChunks(chunkFiles, crosswalkTargetUuidSet, REPO_ROOT, { assertFullCoverage: true });
console.log(`Validated ${totalRawTuplesParsed} raw SQL tuples across 4 chunks`);

// 7. Process all 4,523 records with Production Dimension Gate
const records = [];

const groupCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const assetEligibilityCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
const liabilityEligibilityCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };

const assetRejectionReasons = {};
const liabilityRejectionReasons = {};
const unresolvedConflicts = [];

for (const aff of manifest.affidavits) {
  const cw = crosswalkMap.get(aff.id);
  const targetUuid = cw.targetUuid;
  const sqlRec = sqlMap.get(targetUuid);
  const ledgerRec = ledgerMap.get(aff.id);
  
  const isMissingAsset = missingAssetMap.has(aff.id);
  const isMissingLiability = missingLiabilityMap.has(aff.id);
  
  // Safely parse source profile for metadata comparison
  let parsedProfile = null;
  try {
    parsedProfile = parseSourceProfile(aff.source_file, aff.source_line, aff.candidate_name, aff.ac_no, REPO_ROOT);
  } catch (err) {
    // Expected for Lok Sabha and conflicts
  }
  
  // 1. Group Classification
  let group;
  let groupClassification;
  if (aff.total_assets > 0 && aff.total_liabilities > 0) {
    group = 1;
    groupClassification = 'POSITIVE_ASSETS_POSITIVE_LIABILITIES';
    groupCounts[1]++;
  } else if (aff.total_assets > 0 && aff.total_liabilities === 0 && !isMissingLiability) {
    group = 2;
    groupClassification = 'POSITIVE_ASSETS_GENUINE_ZERO_LIABILITIES';
    groupCounts[2]++;
  } else if (aff.total_assets > 0 && isMissingLiability) {
    group = 3;
    groupClassification = 'POSITIVE_ASSETS_MISSING_LIABILITIES';
    groupCounts[3]++;
  } else if (isMissingAsset && isMissingLiability) {
    group = 4;
    groupClassification = 'MISSING_ASSETS_MISSING_LIABILITIES';
    groupCounts[4]++;
  } else if (aff.total_assets === 0 && aff.total_liabilities === 0 && !isMissingAsset && !isMissingLiability) {
    group = 5;
    groupClassification = 'GENUINE_ZERO_ASSETS_GENUINE_ZERO_LIABILITIES';
    groupCounts[5]++;
  } else {
    throw new Error(`Affidavit ${aff.id} fell outside 5 established groups`);
  }
  
  // 2. Evaluate Asset Dimension
  let assetProposedValue;
  let assetProposedClassification;
  
  if (group === 4) {
    assetProposedValue = null;
    assetProposedClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
  } else if (group === 5) {
    assetProposedValue = 0;
    assetProposedClassification = 'VERIFIED_GENUINE_ZERO';
  } else {
    assetProposedValue = aff.total_assets;
    assetProposedClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
  }
  
  const hasSourceConflict = (aff.id === '0215b22e-aff-00001430');
  let assetConflict = null;
  if (hasSourceConflict) {
    assetConflict = "SOURCE_COORDINATE_MISMATCH: Candidate name at line 1156 is 'G. Janardhan Reddy', expected 'B C Janardhan Reddy'";
    unresolvedConflicts.push({ id: aff.id, field: 'ASSET', reason: assetConflict });
  }

  // Production Gate for Asset
  const assetEval = evaluateDimensionEligibility({
    affidavitRecord: aff,
    fieldType: 'ASSET',
    manifestBaselineValue: aff.total_assets,
    expectedDatabaseValue: sqlRec.currentDbAssets, // 0 (Schema expectation)
    proposedValue: assetProposedValue,
    proposedClassification: assetProposedClassification,
    sourceFile: aff.source_file,
    sourceLine: aff.source_line,
    hasSourceConflict,
    crosswalkMap,
    ledgerMap,
    repoRoot: REPO_ROOT
  });

  assetEligibilityCounts[assetEval.eligibility]++;
  if (assetEval.verifierRejectionReason) {
    const reasonKey = assetEval.verifierRejectionReason.split(':')[0].trim();
    assetRejectionReasons[reasonKey] = (assetRejectionReasons[reasonKey] || 0) + 1;
  }

  // 3. Evaluate Liability Dimension
  let liabilityProposedValue;
  let liabilityProposedClassification;
  
  if (group === 3 || group === 4) {
    liabilityProposedValue = null;
    liabilityProposedClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
  } else if (group === 2 || group === 5) {
    liabilityProposedValue = 0;
    liabilityProposedClassification = 'VERIFIED_GENUINE_ZERO';
  } else {
    liabilityProposedValue = aff.total_liabilities;
    liabilityProposedClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
  }

  let liabilityConflict = null;
  if (hasSourceConflict) {
    liabilityConflict = "SOURCE_COORDINATE_MISMATCH: Candidate name at line 1156 is 'G. Janardhan Reddy', expected 'B C Janardhan Reddy'";
  }

  // Production Gate for Liability
  const liabilityEval = evaluateDimensionEligibility({
    affidavitRecord: aff,
    fieldType: 'LIABILITY',
    manifestBaselineValue: aff.total_liabilities,
    expectedDatabaseValue: sqlRec.currentDbLiabilities, // column 12 tuple value (SQL expectation)
    proposedValue: liabilityProposedValue,
    proposedClassification: liabilityProposedClassification,
    sourceFile: aff.source_file,
    sourceLine: aff.source_line,
    hasSourceConflict,
    crosswalkMap,
    ledgerMap,
    repoRoot: REPO_ROOT
  });

  liabilityEligibilityCounts[liabilityEval.eligibility]++;
  if (liabilityEval.verifierRejectionReason) {
    const reasonKey = liabilityEval.verifierRejectionReason.split(':')[0].trim();
    liabilityRejectionReasons[reasonKey] = (liabilityRejectionReasons[reasonKey] || 0) + 1;
  }

  records.push({
    affidavitId: aff.id,
    candidacyId: aff.candidacy_id,
    personId: aff.person_id,
    candidateName: aff.candidate_name,
    acNo: aff.ac_no,
    constituencyName: aff.constituency_name,
    stateCode: aff.state_code,
    party: aff.party,
    electionYear: aff.election_year,
    group,
    groupClassification,
    sourceCoordinates: {
      file: aff.source_file,
      line: aff.source_line,
      locator: `${aff.source_file}:${aff.source_line}`,
      fileSha256: sourceFileHashes[aff.source_file] || 'UNKNOWN'
    },
    crosswalk: {
      manifestId: aff.id,
      targetUuid,
      sqlChunk: sqlRec.chunkName,
      sqlLine: sqlRec.sqlLine
    },
    ledger: {
      hasComponentLedgerEntry: !!ledgerRec,
      ledgerReference: ledgerRec ? `scratch/w021_5_directive_047_1120_component_ledger.json:${aff.id}` : 'ABSENT_NO_LEDGER_ENTRY',
      targetTreatment: ledgerRec ? ledgerRec.targetTreatment : null
    },
    dimensions: {
      asset: {
        dimension: 'ASSET',
        manifestBaselineValue: aff.total_assets,
        expectedDatabaseValue: sqlRec.currentDbAssets,
        currentRepresentedValue: sqlRec.currentDbAssets,
        evidenceBasis: 'SCHEMA_DERIVED_EXPECTATION',
        evidenceBasisDetails: 'Offline expectation derived from PostgreSQL schema: total_assets GENERATED ALWAYS AS (self_movable + self_immovable + spouse_movable + spouse_immovable) STORED. Chunks 02-05 omitted component columns during ingestion, defaulting to 0 (0+0+0+0=0). Live Supabase not accessed.',
        currentDisclosureClassification: 'COERCED_SCHEMA_DEFAULT_ZERO',
        proposedValue: assetProposedValue,
        proposedDisclosureClassification: assetProposedClassification,
        sourceRawValue: parsedProfile ? parsedProfile.totalAssets : 'UNAVAILABLE_OR_NESTED',
        passesExistingOfflineVerifier: assetEval.passesExistingOfflineVerifier,
        verifierRejectionReason: assetEval.verifierRejectionReason,
        sourceConflictOrAmbiguity: assetConflict,
        eligibility: assetEval.eligibility,
        eligibilityReason: assetEval.eligibilityReason
      },
      liability: {
        dimension: 'LIABILITY',
        manifestBaselineValue: aff.total_liabilities,
        expectedDatabaseValue: sqlRec.currentDbLiabilities,
        currentRepresentedValue: sqlRec.currentDbLiabilities,
        evidenceBasis: 'SQL_SOURCE_DERIVED_EXPECTATION',
        evidenceBasisDetails: 'Offline expectation derived from static source inspection of column 12 tuple values in accepted SQL files: supabase/staging_packages/066_b2_2e_chunked/066_b2_2e_chunk_02..05. Live Supabase not accessed.',
        currentDisclosureClassification: sqlRec.currentDbLiabilities === null ? 'MISSING_DISCLOSURE' : sqlRec.currentDbLiabilities === 0 ? (isMissingLiability ? 'COERCED_ZERO' : 'GENUINE_ZERO') : 'POSITIVE',
        proposedValue: liabilityProposedValue,
        proposedDisclosureClassification: liabilityProposedClassification,
        sourceRawValue: parsedProfile ? parsedProfile.totalLiabilities : 'UNAVAILABLE_OR_NESTED',
        passesExistingOfflineVerifier: liabilityEval.passesExistingOfflineVerifier,
        verifierRejectionReason: liabilityEval.verifierRejectionReason,
        sourceConflictOrAmbiguity: liabilityConflict,
        eligibility: liabilityEval.eligibility,
        eligibilityReason: liabilityEval.eligibilityReason
      }
    }
  });
}

const adjudicationManifest = {
  manifestVersion: '1.0.0',
  directive: 'W021.5-CTO-DIRECTIVE-074',
  milestone: 'W021.5 / B2.2-E — Candidate Affidavits and Civic Extensions',
  defect: 'DQ-W021.5-B2.2E-001',
  defectStatus: 'STRICTLY OPEN — AWAITING INDEPENDENT CTO ADJUDICATION',
  governance: 'Rule IV-001 — Non-Self-Acceptance',
  generatedAt: new Date().toISOString(),
  gitBaseline: {
    directive073DeliveryCommit: 'e323def374415767df8f5febc7114efc0f68d309',
    directive074BaselineCommit: 'e323def374415767df8f5febc7114efc0f68d309',
    canonicalBranch: 'master',
    remoteRepository: 'https://github.com/kshetra-app/Kshetra.git'
  },
  populationSummary: {
    totalAffidavits: records.length,
    fiveGroupClassification: {
      group1_positiveAssets_positiveLiabilities: groupCounts[1],
      group2_positiveAssets_zeroLiabilities: groupCounts[2],
      group3_positiveAssets_missingLiabilities: groupCounts[3],
      group4_missingAssets_missingLiabilities: groupCounts[4],
      group5_zeroAssets_zeroLiabilities: groupCounts[5],
      total: groupCounts[1] + groupCounts[2] + groupCounts[3] + groupCounts[4] + groupCounts[5]
    },
    totalsByDimension: {
      assetRestorationTotal: groupCounts[1] + groupCounts[2] + groupCounts[3],
      assetMissingTotal: groupCounts[4],
      assetZeroTotal: groupCounts[5],
      liabilityRestorationTotal: groupCounts[1],
      liabilityMissingTotal: groupCounts[3] + groupCounts[4],
      liabilityZeroTotal: groupCounts[2] + groupCounts[5]
    },
    subsetIntegrity: {
      missingAssetsIsSubsetOfMissingLiabilities: true,
      missingAssetsCount: groupCounts[4],
      missingLiabilitiesCount: groupCounts[3] + groupCounts[4],
      uncoveredMissingAssets: 0
    },
    eligibilitySummary: {
      assetDimension: {
        totalEvaluations: records.length,
        eligibleCount: assetEligibilityCounts.ELIGIBLE,
        ineligibleCount: assetEligibilityCounts.INELIGIBLE,
        requiresReviewCount: assetEligibilityCounts.REQUIRES_REVIEW,
        verifierRejectionBreakdown: assetRejectionReasons
      },
      liabilityDimension: {
        totalEvaluations: records.length,
        eligibleCount: liabilityEligibilityCounts.ELIGIBLE,
        ineligibleCount: liabilityEligibilityCounts.INELIGIBLE,
        requiresReviewCount: liabilityEligibilityCounts.REQUIRES_REVIEW,
        verifierRejectionBreakdown: liabilityRejectionReasons
      }
    },
    unresolvedConflictsCount: unresolvedConflicts.length,
    unresolvedConflicts
  },
  affidavits: records
};

const outputPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(adjudicationManifest, null, 2), 'utf8');

console.log(`Successfully generated Directive 074 adjudication manifest at ${outputPath}`);
console.log('Group Counts:', groupCounts);
console.log('Asset Eligibility:', assetEligibilityCounts);
console.log('Asset Rejection Breakdown:', assetRejectionReasons);
console.log('Liability Eligibility:', liabilityEligibilityCounts);
console.log('Liability Rejection Breakdown:', liabilityRejectionReasons);
console.log('Unresolved Conflicts:', unresolvedConflicts.length);
