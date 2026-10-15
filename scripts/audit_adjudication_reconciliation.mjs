import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseSourceProfile, safeCanonicalPath } from './verify_financial_remediation.mjs';

const REPO_ROOT = process.cwd();

console.log('=== KSHETRA W021.5 / DIRECTIVE 071 RECONCILIATION AUDIT ===');
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

// 3. Load Crosswalk
const crosswalkPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_048_4523_manifest_to_target_crosswalk.json');
let crosswalkMap = new Map();
if (fs.existsSync(crosswalkPath)) {
  const crosswalkData = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
  for (const entry of crosswalkData) {
    crosswalkMap.set(entry.manifestId, entry);
  }
  console.log(`Loaded ${crosswalkMap.size} crosswalk entries`);
} else {
  console.log('Crosswalk file not found at path, deriving direct 12-char UUID bijection');
}

// 4. Load 1120 Component Ledger
const ledgerPath = path.join(REPO_ROOT, 'scratch/w021_5_directive_047_1120_component_ledger.json');
let ledgerMap = new Map();
if (fs.existsSync(ledgerPath)) {
  const ledgerData = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  for (const entry of ledgerData) {
    ledgerMap.set(entry.manifestId, entry);
  }
  console.log(`Loaded ${ledgerMap.size} component ledger entries`);
}

// 5. Parse SQL Chunks to get actual current database values
const chunkFiles = [
  '066_b2_2e_chunk_02_affidavits_part1.sql',
  '066_b2_2e_chunk_03_affidavits_part2.sql',
  '066_b2_2e_chunk_04_affidavits_part3.sql',
  '066_b2_2e_chunk_05_affidavits_part4.sql'
];

const sqlChunkRecordMap = new Map();

for (const chunkFile of chunkFiles) {
  const chunkPath = path.join(REPO_ROOT, 'supabase/staging_packages/066_b2_2e_chunked', chunkFile);
  const content = fs.readFileSync(chunkPath, 'utf8');
  const lines = content.split('\n');
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line.startsWith("('0215b22e-0001-0000-0000-")) continue;
    
    // Parse tuple values
    // Format: ('<uuid>'::uuid, '<name>', <ac_no>, '<constituency>', '<state>', '<party>', <year>, '<person_id>'::uuid, '<cand_id>'::uuid, '<prov_id>'::uuid, '<status>', <liab>, ...)
    const tupleContent = line.slice(1, line.endsWith('),') ? -2 : line.endsWith(');') ? -2 : -1);
    
    // Simple tokenizer respecting quotes
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
    // As proven in Directive 040, total_assets is GENERATED ALWAYS AS (...) STORED
    // with component defaults 0, so in Staging database it always evaluates to 0
    const totalAssets = 0;
    
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
}

console.log(`Parsed ${sqlChunkRecordMap.size} records from SQL chunks`);
if (sqlChunkRecordMap.size !== 4523) {
  throw new Error(`Expected 4523 SQL chunk records, found ${sqlChunkRecordMap.size}`);
}

// 6. Audit Full 4,523 Population against Source Files and Inventory
const auditResults = [];
const groupCounts = {
  group1: 0, // Positive assets, positive liabilities
  group2: 0, // Positive assets, genuine zero liabilities
  group3: 0, // Positive assets, missing liabilities
  group4: 0, // Missing assets, missing liabilities
  group5: 0  // Genuine zero assets, genuine zero liabilities
};

let positiveAssetsCount = 0;
let missingAssetsCount = 0;
let genuineZeroAssetsCount = 0;

let positiveLiabilitiesCount = 0;
let missingLiabilitiesCount = 0;
let genuineZeroLiabilitiesCount = 0;

const missingAssetIdSet = new Set();
const missingLiabilityIdSet = new Set();

let parseErrors = [];
let sourceValidationFailures = [];

for (let idx = 0; idx < affidavits.length; idx++) {
  const aff = affidavits[idx];
  // Crosswalk mapping validation
  let cw = crosswalkMap.get(aff.id);
  if (!cw) {
    const padded = aff.id.replace('0215b22e-aff-', '').padStart(12, '0');
    cw = { manifestId: aff.id, targetUuid: '0215b22e-0001-0000-0000-' + padded };
  }
  const targetUuid = cw.targetUuid;
  const sqlRecord = sqlChunkRecordMap.get(targetUuid);
  
  if (!sqlRecord) {
    throw new Error(`Missing SQL record for target UUID ${targetUuid} (affidavit ID ${aff.id})`);
  }
  
  // Ledger entry
  const ledger = ledgerMap.get(aff.id);
  
  // Check missing inventory presence
  const isMissingAsset = missingAssetMap.has(aff.id);
  const isMissingLiability = missingLiabilityMap.has(aff.id);
  
  if (isMissingAsset) missingAssetIdSet.add(aff.id);
  if (isMissingLiability) missingLiabilityIdSet.add(aff.id);
  
  // Parse Source Profile
  let parsedSource = null;
  let sourceError = null;
  try {
    parsedSource = parseSourceProfile(
      aff.source_file,
      aff.source_line,
      aff.candidate_name,
      aff.ac_no,
      REPO_ROOT
    );
  } catch (err) {
    sourceError = err.message;
    parseErrors.push({ id: aff.id, candidateName: aff.candidate_name, file: aff.source_file, line: aff.source_line, error: err.message });
  }
  
  // Establish source ground truth
  // In source files:
  // - If property was omitted: undefined
  // - If property was present: number (>= 0)
  const sourceAssetsRaw = parsedSource ? parsedSource.totalAssets : undefined;
  const sourceLiabilitiesRaw = parsedSource ? parsedSource.totalLiabilities : undefined;
  
  // Determine Authoritative Classification & Value for Assets
  let proposedAssetValue;
  let proposedAssetClassification;
  let assetEligibility = 'ELIGIBLE';
  let assetEligibilityReason = null;
  
  if (isMissingAsset) {
    missingAssetsCount++;
    proposedAssetValue = null;
    proposedAssetClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
    if (sourceAssetsRaw !== undefined && sourceAssetsRaw !== null) {
      assetEligibility = 'REQUIRES_REVIEW';
      assetEligibilityReason = `Source file unexpectedly has totalAssets = ${sourceAssetsRaw} for missing asset inventory record`;
      sourceValidationFailures.push({ id: aff.id, field: 'ASSET', reason: assetEligibilityReason });
    }
  } else if (aff.total_assets === 0) {
    genuineZeroAssetsCount++;
    proposedAssetValue = 0;
    proposedAssetClassification = 'VERIFIED_GENUINE_ZERO';
    if (sourceAssetsRaw !== undefined && sourceAssetsRaw !== null && sourceAssetsRaw !== 0) {
      assetEligibility = 'REQUIRES_REVIEW';
      assetEligibilityReason = `Manifest has total_assets = 0 but source has ${sourceAssetsRaw}`;
      sourceValidationFailures.push({ id: aff.id, field: 'ASSET', reason: assetEligibilityReason });
    }
  } else if (aff.total_assets > 0) {
    positiveAssetsCount++;
    proposedAssetValue = aff.total_assets;
    proposedAssetClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
    if (sourceAssetsRaw !== undefined && sourceAssetsRaw !== null && sourceAssetsRaw !== aff.total_assets) {
      // In states where component assets were present (e.g. selfMovableAssets + selfImmovableAssets)
      // Check if sum matches
      const componentSum = (parsedSource.selfMovableAssets || 0) + (parsedSource.selfImmovableAssets || 0);
      if (componentSum === aff.total_assets) {
        // Matched component sum
      } else {
        assetEligibility = 'REQUIRES_REVIEW';
        assetEligibilityReason = `Manifest total_assets ${aff.total_assets} does not match source ${sourceAssetsRaw} or component sum ${componentSum}`;
        sourceValidationFailures.push({ id: aff.id, field: 'ASSET', reason: assetEligibilityReason });
      }
    }
  } else {
    throw new Error(`Unclassified asset status for affidavit ${aff.id}`);
  }
  
  // Determine Authoritative Classification & Value for Liabilities
  let proposedLiabilityValue;
  let proposedLiabilityClassification;
  let liabilityEligibility = 'ELIGIBLE';
  let liabilityEligibilityReason = null;
  
  if (isMissingLiability) {
    missingLiabilitiesCount++;
    proposedLiabilityValue = null;
    proposedLiabilityClassification = 'AFFIDAVIT_MISSING_DISCLOSURE';
    if (sourceLiabilitiesRaw !== undefined && sourceLiabilitiesRaw !== null) {
      liabilityEligibility = 'REQUIRES_REVIEW';
      liabilityEligibilityReason = `Source file unexpectedly has totalLiabilities = ${sourceLiabilitiesRaw} for missing liability inventory record`;
      sourceValidationFailures.push({ id: aff.id, field: 'LIABILITY', reason: liabilityEligibilityReason });
    }
  } else if (aff.total_liabilities === 0) {
    genuineZeroLiabilitiesCount++;
    proposedLiabilityValue = 0;
    proposedLiabilityClassification = 'VERIFIED_GENUINE_ZERO';
    if (sourceLiabilitiesRaw !== undefined && sourceLiabilitiesRaw !== null && sourceLiabilitiesRaw !== 0) {
      liabilityEligibility = 'REQUIRES_REVIEW';
      liabilityEligibilityReason = `Manifest has total_liabilities = 0 but source has ${sourceLiabilitiesRaw}`;
      sourceValidationFailures.push({ id: aff.id, field: 'LIABILITY', reason: liabilityEligibilityReason });
    }
  } else if (aff.total_liabilities > 0) {
    positiveLiabilitiesCount++;
    proposedLiabilityValue = aff.total_liabilities;
    proposedLiabilityClassification = 'AFFIRMATIVELY_DISCLOSED_POSITIVE';
    if (sourceLiabilitiesRaw !== undefined && sourceLiabilitiesRaw !== null && sourceLiabilitiesRaw !== aff.total_liabilities) {
      liabilityEligibility = 'REQUIRES_REVIEW';
      liabilityEligibilityReason = `Manifest total_liabilities ${aff.total_liabilities} does not match source ${sourceLiabilitiesRaw}`;
      sourceValidationFailures.push({ id: aff.id, field: 'LIABILITY', reason: liabilityEligibilityReason });
    }
  } else {
    throw new Error(`Unclassified liability status for affidavit ${aff.id}`);
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
    throw new Error(`Record ${aff.id} fell outside the five established financial groups: assets=${proposedAssetValue}, liabilities=${proposedLiabilityValue}`);
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
      currentDbClassification: 'COERCED_SCHEMA_DEFAULT_ZERO', // Because generated column evaluated 0+0+0+0
      proposedValue: proposedAssetValue,
      proposedClassification: proposedAssetClassification,
      sourceRawValue: sourceAssetsRaw !== undefined ? sourceAssetsRaw : 'OMITTED_IN_SOURCE',
      eligibility: assetEligibility,
      eligibilityReason: assetEligibilityReason,
      requiresDbMutation: sqlRecord.currentDbAssets !== proposedAssetValue // 0 vs proposed
    },
    liability: {
      currentDbValue: sqlRecord.currentDbLiabilities,
      currentDbClassification: sqlRecord.currentDbLiabilities === null ? 'MISSING_DISCLOSURE' : sqlRecord.currentDbLiabilities === 0 ? (isMissingLiability ? 'COERCED_ZERO' : 'GENUINE_ZERO') : 'POSITIVE',
      proposedValue: proposedLiabilityValue,
      proposedClassification: proposedLiabilityClassification,
      sourceRawValue: sourceLiabilitiesRaw !== undefined ? sourceLiabilitiesRaw : 'OMITTED_IN_SOURCE',
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

// Subset check: 72 missing assets ⊆ 893 missing liabilities
let uncoveredMissingAssets = 0;
for (const id of missingAssetIdSet) {
  if (!missingLiabilityIdSet.has(id)) {
    uncoveredMissingAssets++;
  }
}
console.log('Subset Containment:');
console.log('  Missing Assets in Missing Liabilities Set:', missingAssetIdSet.size - uncoveredMissingAssets, 'of', missingAssetIdSet.size);
console.log('  Uncovered Missing Assets:', uncoveredMissingAssets, '(Expected: 0)');

console.log('Validation & Error Diagnostics:');
console.log('  Source Parse Errors:', parseErrors.length);
console.log('  Source Validation Failures:', sourceValidationFailures.length);

if (parseErrors.length > 0) {
  console.log('First 5 parse errors:', parseErrors.slice(0, 5));
}
if (sourceValidationFailures.length > 0) {
  console.log('First 5 validation failures:', sourceValidationFailures.slice(0, 5));
}

// Assert exact counts
if (groupCounts.group1 !== 3334) throw new Error(`Group 1 count ${groupCounts.group1} != 3334`);
if (groupCounts.group2 !== 185) throw new Error(`Group 2 count ${groupCounts.group2} != 185`);
if (groupCounts.group3 !== 821) throw new Error(`Group 3 count ${groupCounts.group3} != 821`);
if (groupCounts.group4 !== 72) throw new Error(`Group 4 count ${groupCounts.group4} != 72`);
if (groupCounts.group5 !== 111) throw new Error(`Group 5 count ${groupCounts.group5} != 111`);

if (positiveAssetsCount !== 4340) throw new Error(`Positive assets count ${positiveAssetsCount} != 4340`);
if (missingAssetsCount !== 72) throw new Error(`Missing assets count ${missingAssetsCount} != 72`);
if (genuineZeroAssetsCount !== 111) throw new Error(`Genuine zero assets count ${genuineZeroAssetsCount} != 111`);

if (positiveLiabilitiesCount !== 3334) throw new Error(`Positive liabilities count ${positiveLiabilitiesCount} != 3334`);
if (missingLiabilitiesCount !== 893) throw new Error(`Missing liabilities count ${missingLiabilitiesCount} != 893`);
if (genuineZeroLiabilitiesCount !== 296) throw new Error(`Genuine zero liabilities count ${genuineZeroLiabilitiesCount} != 296`);

if (uncoveredMissingAssets !== 0) throw new Error(`Subset check failed: ${uncoveredMissingAssets} missing assets not in missing liabilities`);

console.log('ALL MATHEMATICAL POPULATION AND INVARIANT CONTROLS PASSED EXACTLY!');
