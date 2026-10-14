#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Financial Remediation & Evidence Verification Harness
 * 
 * Fulfills CTO Directive 059 requirements:
 * - Deterministic, syntax-aware lexical source parser stripping comments and respecting quotes
 * - Strict realpath boundary containment preventing path traversal and symlink escapes
 * - Pre-map duplicate ID detection across manifest, crosswalk, ledger, and inventory
 * - Strict row-level correction eligibility validation before in-memory application
 * - Exact mathematical set membership proof (missing assets ⊆ missing liabilities)
 * - Safe integer validation before arithmetic
 * - Centralized fail-closed verdict accumulator
 * - CLI orchestration with non-zero exit codes on any failure or exception
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

// ============================================================================
// 1. Centralized Fail-Closed Verdict Accumulator
// ============================================================================

export class VerdictAccumulator {
  constructor() {
    this.checks = [];
    this.requiredCheckIds = new Set();
  }

  registerExpectedMandatoryChecks(checkIds) {
    for (const id of checkIds) {
      this.requiredCheckIds.add(id);
    }
  }

  addCheck({ id, name, status, mandatory = true, details = '' }) {
    const validStatuses = ['PASS', 'FAIL', 'INCOMPLETE', 'NOT_VERIFIED', 'NOT_APPLICABLE'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid check status: ${status}`);
    }
    this.checks.push({
      id,
      name,
      status,
      mandatory,
      details,
      timestamp: new Date().toISOString()
    });
  }

  recordPass(id, name, details = '') {
    this.addCheck({ id, name, status: 'PASS', mandatory: true, details });
  }

  recordFail(id, name, details = '') {
    this.addCheck({ id, name, status: 'FAIL', mandatory: true, details });
  }

  recordNotVerified(id, name, details = '') {
    this.addCheck({ id, name, status: 'NOT_VERIFIED', mandatory: true, details });
  }

  recordIncomplete(id, name, details = '') {
    this.addCheck({ id, name, status: 'INCOMPLETE', mandatory: true, details });
  }

  recordNotApplicable(id, name, details = '') {
    this.addCheck({ id, name, status: 'NOT_APPLICABLE', mandatory: false, details });
  }

  evaluateOverallVerdict() {
    const executedCheckMap = new Map();
    for (const check of this.checks) {
      executedCheckMap.set(check.id, check);
    }

    const failedChecks = [];
    const notVerifiedChecks = [];
    const incompleteChecks = [];
    const omittedMandatoryChecks = [];

    // 1. Check all registered mandatory checks were executed
    for (const reqId of this.requiredCheckIds) {
      if (!executedCheckMap.has(reqId)) {
        omittedMandatoryChecks.push(reqId);
      }
    }

    // 2. Evaluate all executed checks
    let passedCount = 0;
    let totalMandatory = 0;

    for (const check of this.checks) {
      if (check.mandatory) {
        totalMandatory++;
        if (check.status === 'PASS') {
          passedCount++;
        } else if (check.status === 'FAIL') {
          failedChecks.push(check);
        } else if (check.status === 'NOT_VERIFIED') {
          notVerifiedChecks.push(check);
        } else if (check.status === 'INCOMPLETE') {
          incompleteChecks.push(check);
        }
      }
    }

    const isPass = (
      omittedMandatoryChecks.length === 0 &&
      failedChecks.length === 0 &&
      notVerifiedChecks.length === 0 &&
      incompleteChecks.length === 0 &&
      totalMandatory > 0 &&
      passedCount === totalMandatory
    );

    return {
      verdict: isPass ? 'PASS' : 'FAIL',
      isPass,
      totalMandatory,
      passedCount,
      failedChecks,
      notVerifiedChecks,
      incompleteChecks,
      omittedMandatoryChecks,
      totalChecks: this.checks.length,
      allChecks: this.checks
    };
  }
}

// ============================================================================
// 2. Safe Path Containment and Canonicalization
// ============================================================================

export function safeCanonicalPath(filePath, repoRoot) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('INVALID_PATH: Path must be a non-empty string');
  }
  if (!repoRoot || typeof repoRoot !== 'string') {
    throw new Error('INVALID_REPO_ROOT: Repository root must be a non-empty string');
  }

  // Reject UNC paths (starts with // or \\)
  if (filePath.startsWith('\\\\') || filePath.startsWith('//')) {
    throw new Error(`PATH_OUTSIDE_REPO_ROOT: UNC paths are forbidden ('${filePath}')`);
  }

  let realRepoRoot;
  try {
    realRepoRoot = fs.realpathSync(path.resolve(repoRoot));
  } catch (err) {
    throw new Error(`CANNOT_RESOLVE_REPO_ROOT: ${err.message}`);
  }

  // If filePath has a drive root, check drive match on Windows
  const parsedFile = path.parse(filePath);
  const parsedRepo = path.parse(realRepoRoot);
  if (parsedFile.root && parsedRepo.root) {
    const fileDrive = parsedFile.root.replace(/[\\\/]/g, '').toUpperCase();
    const repoDrive = parsedRepo.root.replace(/[\\\/]/g, '').toUpperCase();
    if (fileDrive && repoDrive && fileDrive !== repoDrive) {
      throw new Error(`PATH_OUTSIDE_REPO_ROOT: Path '${filePath}' attempts drive hopping outside '${realRepoRoot}'`);
    }
  }

  const resolvedTarget = path.resolve(realRepoRoot, filePath);
  const normalized = path.normalize(resolvedTarget);

  // Check normalized path before symlink resolution
  if (!normalized.startsWith(realRepoRoot + path.sep) && normalized !== realRepoRoot) {
    throw new Error(`PATH_OUTSIDE_REPO_ROOT: Path '${filePath}' resolves outside repository root '${realRepoRoot}'`);
  }

  let realTarget;
  try {
    realTarget = fs.realpathSync(resolvedTarget);
  } catch (err) {
    throw new Error(`FILE_NOT_FOUND: ${err.message}`);
  }

  if (!realTarget.startsWith(realRepoRoot + path.sep) && realTarget !== realRepoRoot) {
    throw new Error(`PATH_OUTSIDE_REPO_ROOT: Path '${filePath}' resolves outside repository root '${realRepoRoot}'`);
  }

  return realTarget;
}

// ============================================================================
// 3. Syntax-Aware Lexical Object Parser
// ============================================================================

export function extractObjectLiteralAtLine(content, startLine) {
  const lines = content.split('\n');
  if (startLine < 1 || startLine > lines.length) {
    throw new Error(`LINE_OUT_OF_BOUNDS: Start line ${startLine} is outside file line count ${lines.length}`);
  }

  let charOffset = 0;
  for (let i = 0; i < startLine - 1; i++) {
    charOffset += lines[i].length + 1; // +1 for \n
  }

  const lineText = lines[startLine - 1];
  const braceCol = lineText.indexOf('{');
  if (braceCol === -1) {
    throw new Error(`NO_OPENING_BRACE_AT_COORDINATE: Line ${startLine} does not contain opening brace '{'`);
  }

  let idx = charOffset + braceCol;
  let braceDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inSingleComment = false;
  let inMultiComment = false;
  let escaped = false;
  let cleaned = '';

  while (idx < content.length) {
    const ch = content[idx];
    const nextCh = idx + 1 < content.length ? content[idx + 1] : '';

    if (inSingleComment) {
      if (ch === '\n') {
        inSingleComment = false;
        cleaned += '\n';
      }
    } else if (inMultiComment) {
      if (ch === '*' && nextCh === '/') {
        inMultiComment = false;
        idx++; // skip '/'
      }
    } else if (inSingle) {
      cleaned += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '\'') {
        inSingle = false;
      }
    } else if (inDouble) {
      cleaned += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDouble = false;
      }
    } else if (inTemplate) {
      cleaned += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '`') {
        inTemplate = false;
      }
    } else {
      if (ch === '/' && nextCh === '/') {
        inSingleComment = true;
        idx++;
      } else if (ch === '/' && nextCh === '*') {
        inMultiComment = true;
        idx++;
      } else if (ch === '\'') {
        inSingle = true;
        escaped = false;
        cleaned += ch;
      } else if (ch === '"') {
        inDouble = true;
        escaped = false;
        cleaned += ch;
      } else if (ch === '`') {
        inTemplate = true;
        escaped = false;
        cleaned += ch;
      } else {
        cleaned += ch;
        if (ch === '{') {
          braceDepth++;
        } else if (ch === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            break;
          }
        }
      }
    }
    idx++;
  }

  if (braceDepth !== 0) {
    throw new Error(`UNTERMINATED_OBJECT: Failed to find closing brace '}' for object starting at line ${startLine}`);
  }

  return cleaned;
}

function commitProperty(rawKey, rawVal, result) {
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith('\'') && key.endsWith('\''))) {
    key = key.slice(1, -1);
  }

  let val = rawVal.trim();
  if (val.endsWith(';') || val.endsWith(',')) {
    val = val.slice(0, -1).trim();
  }

  result.rawProperties[key] = val;

  // 1. String literal
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
    const unquoted = val.slice(1, -1)
      .replace(/\\'/g, '\'')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    if (key === 'candidateName' || key === 'name') result.candidateName = unquoted;
    if (key === 'constituencyName') result.constituencyName = unquoted;
    if (key === 'party') result.party = unquoted;
    return;
  }

  // 2. null / undefined
  if (val === 'null') {
    if (key === 'totalAssets') result.totalAssets = null;
    if (key === 'totalLiabilities') result.totalLiabilities = null;
    return;
  }
  if (val === 'undefined') {
    return;
  }

  // 3. Numeric values with optional underscore separators
  const cleanVal = val.replace(/_/g, '');
  const num = Number(cleanVal);
  if (!isNaN(num) && cleanVal !== '' && !cleanVal.includes('{') && !cleanVal.includes('[')) {
    if (!Number.isSafeInteger(num) || num < 0) {
      throw new Error(`INVALID_NUMERIC_VALUE: Property '${key}' has invalid or unsafe integer value '${val}'`);
    }
    if (key === 'totalAssets') result.totalAssets = num;
    if (key === 'totalLiabilities') result.totalLiabilities = num;
    if (key === 'acNo') result.acNo = num;
    if (key === 'selfMovableAssets') result.selfMovableAssets = num;
    if (key === 'selfImmovableAssets') result.selfImmovableAssets = num;
    if (key === 'spouseMovableAssets') result.spouseMovableAssets = num;
    if (key === 'spouseImmovableAssets') result.spouseImmovableAssets = num;
  }
}

export function parsePropertiesFromCleanedObject(cleaned) {
  const result = {
    rawProperties: {},
    candidateName: undefined,
    acNo: undefined,
    constituencyName: undefined,
    party: undefined,
    totalAssets: undefined,
    totalLiabilities: undefined,
    selfMovableAssets: undefined,
    selfImmovableAssets: undefined,
    spouseMovableAssets: undefined,
    spouseImmovableAssets: undefined
  };

  if (!cleaned || typeof cleaned !== 'string') {
    return result;
  }

  let idx = 0;
  while (idx < cleaned.length && cleaned[idx] !== '{') idx++;
  if (idx >= cleaned.length || cleaned[idx] !== '{') {
    throw new Error('NO_OPENING_BRACE: Cleaned object does not begin with \'{\'');
  }
  idx++; // move past opening '{'

  let depth = 1;
  let bracketDepth = 0;
  let parenDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  let currentKey = '';
  let currentValue = '';
  let parsingKey = true;

  while (idx < cleaned.length) {
    const ch = cleaned[idx];

    if (inSingle) {
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '\'') inSingle = false;
      idx++;
      continue;
    }
    if (inDouble) {
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inDouble = false;
      idx++;
      continue;
    }
    if (inTemplate) {
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '`') inTemplate = false;
      idx++;
      continue;
    }

    if (ch === '\'') {
      inSingle = true;
      escaped = false;
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      idx++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      escaped = false;
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      idx++;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      escaped = false;
      if (parsingKey) currentKey += ch;
      else currentValue += ch;
      idx++;
      continue;
    }

    if (ch === '{') {
      depth++;
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        if (currentKey.trim() && currentValue.trim()) {
          commitProperty(currentKey.trim(), currentValue.trim(), result);
        }
        break;
      }
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }

    if (ch === '[') {
      bracketDepth++;
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }
    if (ch === ']') {
      bracketDepth--;
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }
    if (ch === ')') {
      parenDepth--;
      if (!parsingKey) currentValue += ch;
      idx++;
      continue;
    }

    if (depth === 1 && bracketDepth === 0 && parenDepth === 0) {
      if (parsingKey && ch === ':') {
        parsingKey = false;
        currentValue = '';
        idx++;
        continue;
      }
      if (!parsingKey && ch === ',') {
        commitProperty(currentKey.trim(), currentValue.trim(), result);
        currentKey = '';
        currentValue = '';
        parsingKey = true;
        idx++;
        continue;
      }
    }

    if (parsingKey) {
      currentKey += ch;
    } else {
      currentValue += ch;
    }
    idx++;
  }

  return result;
}

export function parseSourceProfile(sourceFilePath, sourceLine, expectedCandidateName, expectedAcNo, repoRoot) {
  const realFile = safeCanonicalPath(sourceFilePath, repoRoot);
  const content = fs.readFileSync(realFile, 'utf8');

  const cleaned = extractObjectLiteralAtLine(content, sourceLine);
  const parsed = parsePropertiesFromCleanedObject(cleaned);

  if (expectedCandidateName) {
    const candName = parsed.candidateName;
    if (!candName) {
      throw new Error(`MISSING_REQUIRED_IDENTITY_FIELD: Candidate name property missing in source object at line ${sourceLine}`);
    }
    const normParsed = candName.replace(/\s+/g, ' ').trim();
    const normExpected = expectedCandidateName.replace(/\s+/g, ' ').trim();
    if (normParsed !== normExpected) {
      throw new Error(`SOURCE_COORDINATE_MISMATCH: Candidate name at line ${sourceLine} is '${candName}', expected '${expectedCandidateName}'`);
    }
  }

  if (expectedAcNo !== undefined) {
    if (parsed.acNo === undefined) {
      throw new Error(`MISSING_REQUIRED_IDENTITY_FIELD: Constituency number (acNo) missing in source object at line ${sourceLine}`);
    }
    if (parsed.acNo !== expectedAcNo) {
      throw new Error(`SOURCE_COORDINATE_MISMATCH: acNo at line ${sourceLine} is ${parsed.acNo}, expected ${expectedAcNo}`);
    }
  }

  return parsed;
}

// ============================================================================
// 4. Exact Set Membership & Integrity Checks
// ============================================================================

export function validateExactMembership(manifestData, crosswalkData, ledgerData, inventoryData, isSynthetic, accumulator) {
  // Constant phantom affidavit that must never exist
  const PHANTOM_AFFIDAVIT_ID = '0215b22e-aff-00001571';

  // 1. Pre-map duplicate ID check for Manifest
  const manifestIdSet = new Set();
  const manifestAffidavits = Array.isArray(manifestData.affidavits) ? manifestData.affidavits : [];
  for (const aff of manifestAffidavits) {
    if (!aff.id) {
      accumulator.recordFail('MANIFEST_ID_PRESENCE', 'Manifest record missing ID', `Record index: ${manifestAffidavits.indexOf(aff)}`);
      return false;
    }
    if (manifestIdSet.has(aff.id)) {
      accumulator.recordFail('DUPLICATE_MANIFEST_ID', `Duplicate manifest ID detected: ${aff.id}`, `ID: ${aff.id}`);
      return false;
    }
    manifestIdSet.add(aff.id);
  }
  accumulator.recordPass('MANIFEST_ID_UNIQUENESS', `All ${manifestIdSet.size} manifest IDs are unique`);

  // Phantom check on manifest
  if (manifestIdSet.has(PHANTOM_AFFIDAVIT_ID)) {
    accumulator.recordFail('PHANTOM_AFFIDAVIT_DETECTED', `Phantom affidavit ${PHANTOM_AFFIDAVIT_ID} found in manifest`);
    return false;
  }
  accumulator.recordPass('PHANTOM_AFFIDAVIT_ABSENCE_MANIFEST', 'Phantom affidavit correctly absent from manifest');

  // Expected count check
  const expectedManifestCount = isSynthetic ? 5 : 4523;
  if (manifestIdSet.size !== expectedManifestCount) {
    accumulator.recordFail('MANIFEST_POPULATION_COUNT', `Manifest count is ${manifestIdSet.size}, expected ${expectedManifestCount}`);
    return false;
  }
  accumulator.recordPass('MANIFEST_POPULATION_COUNT', `Manifest population count matches expected: ${expectedManifestCount}`);

  // 2. Pre-map duplicate ID check for Crosswalk
  const crosswalkList = Array.isArray(crosswalkData) ? crosswalkData : [];
  const crosswalkManifestIdSet = new Set();
  const crosswalkTargetUuidSet = new Set();

  for (const cw of crosswalkList) {
    if (!cw.manifestId || !cw.targetUuid) {
      accumulator.recordFail('CROSSWALK_ENTRY_FORMAT', 'Crosswalk entry missing manifestId or targetUuid');
      return false;
    }
    if (crosswalkManifestIdSet.has(cw.manifestId)) {
      accumulator.recordFail('DUPLICATE_CROSSWALK_ENTRY', `Duplicate crosswalk manifestId detected: ${cw.manifestId}`);
      return false;
    }
    if (crosswalkTargetUuidSet.has(cw.targetUuid)) {
      accumulator.recordFail('DUPLICATE_CROSSWALK_TARGET_UUID', `Duplicate crosswalk targetUuid detected: ${cw.targetUuid}`);
      return false;
    }
    crosswalkManifestIdSet.add(cw.manifestId);
    crosswalkTargetUuidSet.add(cw.targetUuid);
  }
  accumulator.recordPass('CROSSWALK_UNIQUENESS', `All ${crosswalkList.length} crosswalk entries are unique by manifestId and targetUuid`);

  // Phantom check on crosswalk
  if (crosswalkManifestIdSet.has(PHANTOM_AFFIDAVIT_ID)) {
    accumulator.recordFail('PHANTOM_AFFIDAVIT_DETECTED', `Phantom affidavit ${PHANTOM_AFFIDAVIT_ID} found in crosswalk`);
    return false;
  }
  accumulator.recordPass('PHANTOM_AFFIDAVIT_ABSENCE_CROSSWALK', 'Phantom affidavit correctly absent from crosswalk');

  // Exact Bijection Check: Manifest vs Crosswalk
  for (const mId of manifestIdSet) {
    if (!crosswalkManifestIdSet.has(mId)) {
      accumulator.recordFail('MISSING_CROSSWALK_ENTRY', `Manifest ID ${mId} missing from crosswalk`);
      return false;
    }
  }
  for (const cwId of crosswalkManifestIdSet) {
    if (!manifestIdSet.has(cwId)) {
      accumulator.recordFail('UNEXPECTED_CROSSWALK_ENTRY', `Crosswalk entry ${cwId} does not exist in manifest`);
      return false;
    }
  }
  accumulator.recordPass('CROSSWALK_BIJECTION', 'Exact bidirectional bijection between manifest and crosswalk proven');

  // 3. Ledger Checks
  const ledgerList = Array.isArray(ledgerData) ? ledgerData : [];
  const ledgerIdSet = new Set();
  for (const led of ledgerList) {
    if (ledgerIdSet.has(led.manifestId)) {
      accumulator.recordFail('DUPLICATE_LEDGER_ENTRY', `Duplicate ledger manifestId: ${led.manifestId}`);
      return false;
    }
    ledgerIdSet.add(led.manifestId);

    // Ledger ID must be in manifest
    if (!manifestIdSet.has(led.manifestId)) {
      accumulator.recordFail('LEDGER_ID_NOT_IN_MANIFEST', `Ledger manifestId ${led.manifestId} not present in manifest`);
      return false;
    }
  }
  accumulator.recordPass('LEDGER_MEMBERSHIP_INTEGRITY', `All ${ledgerList.length} ledger entries are unique and present in manifest`);

  // Phantom check on ledger
  if (ledgerIdSet.has(PHANTOM_AFFIDAVIT_ID)) {
    accumulator.recordFail('PHANTOM_AFFIDAVIT_DETECTED', `Phantom affidavit ${PHANTOM_AFFIDAVIT_ID} found in ledger`);
    return false;
  }
  accumulator.recordPass('PHANTOM_AFFIDAVIT_ABSENCE_LEDGER', 'Phantom affidavit correctly absent from ledger');

  // 4. Inventory Checks
  const assetCorrections = Array.isArray(inventoryData.assetCorrections) ? inventoryData.assetCorrections : [];
  const liabilityCorrections = Array.isArray(inventoryData.liabilityCorrections) ? inventoryData.liabilityCorrections : [];

  const assetCorrectionIds = new Set();
  for (const ac of assetCorrections) {
    if (assetCorrectionIds.has(ac.affidavitId)) {
      accumulator.recordFail('DUPLICATE_ASSET_CORRECTION', `Duplicate asset correction affidavitId: ${ac.affidavitId}`);
      return false;
    }
    assetCorrectionIds.add(ac.affidavitId);

    if (!manifestIdSet.has(ac.affidavitId)) {
      accumulator.recordFail('CORRECTION_ID_NOT_IN_MANIFEST', `Asset correction affidavitId ${ac.affidavitId} not in manifest`);
      return false;
    }
  }

  const liabilityCorrectionIds = new Set();
  for (const lc of liabilityCorrections) {
    if (liabilityCorrectionIds.has(lc.affidavitId)) {
      accumulator.recordFail('DUPLICATE_LIABILITY_CORRECTION', `Duplicate liability correction affidavitId: ${lc.affidavitId}`);
      return false;
    }
    liabilityCorrectionIds.add(lc.affidavitId);

    if (!manifestIdSet.has(lc.affidavitId)) {
      accumulator.recordFail('CORRECTION_ID_NOT_IN_MANIFEST', `Liability correction affidavitId ${lc.affidavitId} not in manifest`);
      return false;
    }
  }

  // Phantom check on inventory
  if (assetCorrectionIds.has(PHANTOM_AFFIDAVIT_ID) || liabilityCorrectionIds.has(PHANTOM_AFFIDAVIT_ID)) {
    accumulator.recordFail('PHANTOM_AFFIDAVIT_DETECTED', `Phantom affidavit ${PHANTOM_AFFIDAVIT_ID} found in inventory`);
    return false;
  }
  accumulator.recordPass('PHANTOM_AFFIDAVIT_ABSENCE_INVENTORY', 'Phantom affidavit correctly absent from inventory');

  // Exact Subset Proof: missing asset IDs ⊆ missing liability IDs
  const diff = [];
  for (const id of assetCorrectionIds) {
    if (!liabilityCorrectionIds.has(id)) {
      diff.push(id);
    }
  }

  if (diff.length > 0) {
    accumulator.recordFail('CORRECTION_SET_SUBSET_VIOLATION', `Asset correction IDs are not a subset of liability correction IDs. Discrepancies: ${diff.join(', ')}`);
    return false;
  }
  accumulator.recordPass('CORRECTION_SET_SUBSET_PROOF', `Exact set containment proven: assetCorrections (${assetCorrectionIds.size}) ⊆ liabilityCorrections (${liabilityCorrectionIds.size})`);

  // Expected correction counts
  const expectedAssetCount = isSynthetic ? 1 : 72;
  const expectedLiabilityCount = isSynthetic ? 2 : 893;

  if (assetCorrectionIds.size !== expectedAssetCount) {
    accumulator.recordFail('ASSET_CORRECTION_COUNT_MISMATCH', `Asset correction count ${assetCorrectionIds.size} != expected ${expectedAssetCount}`);
    return false;
  }
  if (liabilityCorrectionIds.size !== expectedLiabilityCount) {
    accumulator.recordFail('LIABILITY_CORRECTION_COUNT_MISMATCH', `Liability correction count ${liabilityCorrectionIds.size} != expected ${expectedLiabilityCount}`);
    return false;
  }
  accumulator.recordPass('CORRECTION_COUNTS_VERIFIED', `Expected counts verified: ${expectedAssetCount} asset, ${expectedLiabilityCount} liability`);

  return true;
}

// ============================================================================
// 5. Row-Level Correction Eligibility & Three-Way Binding
// ============================================================================

export function validateCorrectionEligibility(manifestRecord, correction, fieldType, crosswalkMap, ledgerMap, repoRoot) {
  // Pre-condition 1: correction refers to exact manifest record
  if (!manifestRecord || !correction) {
    throw new Error('INVALID_ARGUMENTS: Both manifestRecord and correction are required');
  }
  if (manifestRecord.id !== correction.affidavitId) {
    throw new Error(`CORRECTION_RECORD_MISMATCH: Record ID ${manifestRecord.id} does not match correction ID ${correction.affidavitId}`);
  }

  // Pre-condition 2: crosswalk identity exists
  const crosswalkEntry = crosswalkMap.get(manifestRecord.id);
  if (!crosswalkEntry) {
    throw new Error(`MISSING_CROSSWALK_ENTRY: No crosswalk entry for affidavit ${manifestRecord.id}`);
  }

  // Pre-condition 3: ledger entry consistency if present
  const ledgerEntry = ledgerMap ? ledgerMap.get(manifestRecord.id) : null;
  if (ledgerEntry) {
    if (ledgerEntry.targetUuid !== crosswalkEntry.targetUuid) {
      throw new Error(`CROSSWALK_LEDGER_UUID_MISMATCH: Crosswalk UUID ${crosswalkEntry.targetUuid} != Ledger UUID ${ledgerEntry.targetUuid}`);
    }
  }

  // Pre-condition 4: Original manifest field value matches correction declared currentRepresentedValue
  const manifestCurrentVal = fieldType === 'ASSET' ? manifestRecord.total_assets : manifestRecord.total_liabilities;
  if (manifestCurrentVal !== correction.currentRepresentedValue) {
    throw new Error(`CORRECTION_DECLARED_VALUE_MISMATCH: Manifest has ${manifestCurrentVal}, correction declared ${correction.currentRepresentedValue}`);
  }

  // Pre-condition 5: Missing disclosure correction requires manifest represented baseline to be 0
  if (correction.intendedValue === null) {
    if (correction.currentRepresentedValue !== 0) {
      throw new Error(`INELIGIBLE_CORRECTION_ORIGINAL_VALUE: Field value is ${correction.currentRepresentedValue} > 0; cannot nullify non-zero disclosure`);
    }
  }

  // Pre-condition 6: Unresolved source conflict check
  if (correction.hasSourceConflict === true) {
    throw new Error(`UNRESOLVED_SOURCE_CONFLICT: Correction for ${manifestRecord.id} has unresolved source conflict`);
  }

  // Pre-condition 7: Mandatory source coordinate existence and verification (§2 Req 8)
  if (!correction.sourceFile || !correction.sourceLocation) {
    throw new Error(`MISSING_SOURCE_COORDINATE: Correction for ${manifestRecord.id} lacks required sourceFile or sourceLocation`);
  }
  if (!repoRoot) {
    throw new Error(`MISSING_REPO_ROOT: Repository root required for authoritative source coordinate verification`);
  }

  const parts = correction.sourceLocation.split(':');
  const lineNum = parseInt(parts[parts.length - 1], 10);
  if (isNaN(lineNum) || lineNum < 1) {
    throw new Error(`INVALID_SOURCE_COORDINATE: Invalid line number in sourceLocation: ${correction.sourceLocation}`);
  }

  const parsedProfile = parseSourceProfile(
    correction.sourceFile,
    lineNum,
    manifestRecord.candidate_name,
    manifestRecord.ac_no,
    repoRoot
  );

  const sourceVal = fieldType === 'ASSET' ? parsedProfile.totalAssets : parsedProfile.totalLiabilities;

  // Positive restoration verification (§2 Req 5):
  if (correction.intendedValue !== null && correction.intendedValue > 0) {
    if (sourceVal === undefined || sourceVal === null) {
      throw new Error(`SOURCE_VALUE_UNAVAILABLE: Intended positive value ${correction.intendedValue} has no positive source disclosure`);
    }
    if (sourceVal !== correction.intendedValue) {
      throw new Error(`SOURCE_RESTORED_VALUE_MISMATCH: Source value ${sourceVal} does not match intended restored value ${correction.intendedValue}`);
    }
    if (ledgerEntry) {
      const ledgerAuthoritativeVal = fieldType === 'ASSET' ? ledgerEntry.authoritativeTotalAssets : ledgerEntry.authoritativeTotalLiabilities;
      if (ledgerAuthoritativeVal !== undefined && ledgerAuthoritativeVal !== null && ledgerAuthoritativeVal !== correction.intendedValue) {
        throw new Error(`LEDGER_RESTORED_VALUE_MISMATCH: Ledger authoritative value ${ledgerAuthoritativeVal} does not match intended value ${correction.intendedValue}`);
      }
    }
  }

  // Missing disclosure verification (§2 Req 6 & 7):
  if (correction.intendedValue === null) {
    if (sourceVal !== undefined && sourceVal !== null && sourceVal > 0) {
      throw new Error(`POSITIVE_TOTAL_MUTATION_FORBIDDEN: Source has positive ${fieldType.toLowerCase()} ${sourceVal}; cannot nullify`);
    }
    if (sourceVal === 0) {
      throw new Error(`GENUINE_ZERO_COERCION_FORBIDDEN: Source explicitly has 0 ${fieldType.toLowerCase()}; cannot coerce genuine zero to null`);
    }
    if (sourceVal !== undefined && sourceVal !== null) {
      throw new Error(`SOURCE_EVIDENCE_INSUFFICIENT: Source does not provide affirmative evidence of missing disclosure for ${fieldType.toLowerCase()}`);
    }
  }

  return true;
}

// ============================================================================
// 6. Complete Verification Orchestrator
// ============================================================================

export async function verifyFinancialRemediation(options = {}) {
  const {
    manifestPath,
    crosswalkPath,
    ledgerPath,
    inventoryPath,
    repoRoot = process.cwd(),
    mode = 'authoritative',
    verbose = false
  } = options;

  const accumulator = new VerdictAccumulator();
  const isSynthetic = mode === 'synthetic';

  // Register all mandatory check IDs
  const MANDATORY_CHECKS = [
    'ARTIFACT_PRESENCE_MANIFEST',
    'ARTIFACT_PRESENCE_CROSSWALK',
    'ARTIFACT_PRESENCE_LEDGER',
    'ARTIFACT_PRESENCE_INVENTORY',
    'MANIFEST_ID_UNIQUENESS',
    'PHANTOM_AFFIDAVIT_ABSENCE_MANIFEST',
    'MANIFEST_POPULATION_COUNT',
    'CROSSWALK_UNIQUENESS',
    'PHANTOM_AFFIDAVIT_ABSENCE_CROSSWALK',
    'CROSSWALK_BIJECTION',
    'LEDGER_MEMBERSHIP_INTEGRITY',
    'PHANTOM_AFFIDAVIT_ABSENCE_LEDGER',
    'PHANTOM_AFFIDAVIT_ABSENCE_INVENTORY',
    'CORRECTION_SET_SUBSET_PROOF',
    'CORRECTION_COUNTS_VERIFIED',
    'ROW_LEVEL_ELIGIBILITY_AND_ISOLATION',
    'POST_CORRECTION_POPULATION_INVARIANTS',
    'AGGREGATE_FINANCIAL_RECONCILIATION'
  ];
  accumulator.registerExpectedMandatoryChecks(MANDATORY_CHECKS);

  // 1. Verify existence and load artifacts
  let manifestData, crosswalkData, ledgerData, inventoryData;

  try {
    const realManifestPath = safeCanonicalPath(manifestPath, repoRoot);
    manifestData = JSON.parse(fs.readFileSync(realManifestPath, 'utf8'));
    accumulator.recordPass('ARTIFACT_PRESENCE_MANIFEST', `Loaded manifest from ${manifestPath}`);
  } catch (err) {
    accumulator.recordFail('ARTIFACT_PRESENCE_MANIFEST', `Failed to load manifest: ${err.message}`);
    return { verdict: 'FAIL', accumulator, summary: { error: err.message } };
  }

  try {
    const realCrosswalkPath = safeCanonicalPath(crosswalkPath, repoRoot);
    crosswalkData = JSON.parse(fs.readFileSync(realCrosswalkPath, 'utf8'));
    accumulator.recordPass('ARTIFACT_PRESENCE_CROSSWALK', `Loaded crosswalk from ${crosswalkPath}`);
  } catch (err) {
    accumulator.recordFail('ARTIFACT_PRESENCE_CROSSWALK', `Failed to load crosswalk: ${err.message}`);
    return { verdict: 'FAIL', accumulator, summary: { error: err.message } };
  }

  try {
    const realLedgerPath = safeCanonicalPath(ledgerPath, repoRoot);
    ledgerData = JSON.parse(fs.readFileSync(realLedgerPath, 'utf8'));
    accumulator.recordPass('ARTIFACT_PRESENCE_LEDGER', `Loaded ledger from ${ledgerPath}`);
  } catch (err) {
    accumulator.recordFail('ARTIFACT_PRESENCE_LEDGER', `Failed to load ledger: ${err.message}`);
    return { verdict: 'FAIL', accumulator, summary: { error: err.message } };
  }

  try {
    const realInventoryPath = safeCanonicalPath(inventoryPath, repoRoot);
    inventoryData = JSON.parse(fs.readFileSync(realInventoryPath, 'utf8'));
    accumulator.recordPass('ARTIFACT_PRESENCE_INVENTORY', `Loaded inventory from ${inventoryPath}`);
  } catch (err) {
    accumulator.recordFail('ARTIFACT_PRESENCE_INVENTORY', `Failed to load inventory: ${err.message}`);
    return { verdict: 'FAIL', accumulator, summary: { error: err.message } };
  }

  // 2. Validate Exact Membership
  const membershipValid = validateExactMembership(
    manifestData,
    crosswalkData,
    ledgerData,
    inventoryData,
    isSynthetic,
    accumulator
  );

  if (!membershipValid) {
    const evaluation = accumulator.evaluateOverallVerdict();
    return { verdict: 'FAIL', accumulator, evaluation };
  }

  // Build lookup maps for row-level evaluation
  const crosswalkMap = new Map();
  for (const cw of crosswalkData) {
    crosswalkMap.set(cw.manifestId, cw);
  }

  const ledgerMap = new Map();
  for (const led of ledgerData) {
    ledgerMap.set(led.manifestId, led);
  }

  const assetCorrectionMap = new Map();
  for (const ac of inventoryData.assetCorrections) {
    assetCorrectionMap.set(ac.affidavitId, ac);
  }

  const liabilityCorrectionMap = new Map();
  for (const lc of inventoryData.liabilityCorrections) {
    liabilityCorrectionMap.set(lc.affidavitId, lc);
  }

  // 3. Row-level eligibility validation and in-memory corrected model construction
  const correctedAffidavits = [];
  let rowEligibilityError = null;

  for (const aff of manifestData.affidavits) {
    const modelRecord = {
      id: aff.id,
      candidate_name: aff.candidate_name,
      ac_no: aff.ac_no,
      state_code: aff.state_code,
      total_assets: aff.total_assets,
      total_liabilities: aff.total_liabilities,
      asset_corrected: false,
      liability_corrected: false
    };

    // Pre-validation of numeric types
    if (aff.total_assets !== null && (!Number.isSafeInteger(aff.total_assets) || aff.total_assets < 0)) {
      rowEligibilityError = `INVALID_NUMERIC_VALUE: Record ${aff.id} has invalid total_assets: ${aff.total_assets}`;
      break;
    }
    if (aff.total_liabilities !== null && (!Number.isSafeInteger(aff.total_liabilities) || aff.total_liabilities < 0)) {
      rowEligibilityError = `INVALID_NUMERIC_VALUE: Record ${aff.id} has invalid total_liabilities: ${aff.total_liabilities}`;
      break;
    }

    // Evaluate Asset Correction
    if (assetCorrectionMap.has(aff.id)) {
      const ac = assetCorrectionMap.get(aff.id);
      try {
        validateCorrectionEligibility(aff, ac, 'ASSET', crosswalkMap, ledgerMap, repoRoot);
        modelRecord.total_assets = ac.intendedValue;
        modelRecord.asset_corrected = true;
      } catch (err) {
        rowEligibilityError = err.message;
        break;
      }
    }

    // Evaluate Liability Correction
    if (liabilityCorrectionMap.has(aff.id)) {
      const lc = liabilityCorrectionMap.get(aff.id);
      try {
        validateCorrectionEligibility(aff, lc, 'LIABILITY', crosswalkMap, ledgerMap, repoRoot);
        modelRecord.total_liabilities = lc.intendedValue;
        modelRecord.liability_corrected = true;
      } catch (err) {
        rowEligibilityError = err.message;
        break;
      }
    }

    correctedAffidavits.push(modelRecord);
  }

  if (rowEligibilityError) {
    accumulator.recordFail('ROW_LEVEL_ELIGIBILITY_AND_ISOLATION', `Row eligibility validation failed: ${rowEligibilityError}`);
    const evaluation = accumulator.evaluateOverallVerdict();
    return { verdict: 'FAIL', accumulator, evaluation };
  }
  accumulator.recordPass('ROW_LEVEL_ELIGIBILITY_AND_ISOLATION', 'All corrections validated at row level before model application');

  // 4. Post-Correction Population Invariants
  let nullAssets = 0, zeroAssets = 0, positiveAssets = 0;
  let nullLiabilities = 0, zeroLiabilities = 0, positiveLiabilities = 0;
  let sumAssets = 0n;
  let sumLiabilities = 0n;

  for (const rec of correctedAffidavits) {
    if (rec.total_assets === null) {
      nullAssets++;
    } else if (rec.total_assets === 0) {
      zeroAssets++;
    } else {
      positiveAssets++;
      sumAssets += BigInt(rec.total_assets);
    }

    if (rec.total_liabilities === null) {
      nullLiabilities++;
    } else if (rec.total_liabilities === 0) {
      zeroLiabilities++;
    } else {
      positiveLiabilities++;
      sumLiabilities += BigInt(rec.total_liabilities);
    }
  }

  const expectedNullAssets = isSynthetic ? 1 : 72;
  const expectedZeroAssets = isSynthetic ? 1 : 111;
  const expectedPositiveAssets = isSynthetic ? 3 : 4340;

  const expectedNullLiabilities = isSynthetic ? 2 : 893;
  const expectedZeroLiabilities = isSynthetic ? 2 : 296;
  const expectedPositiveLiabilities = isSynthetic ? 1 : 3334;

  let invariantFailures = [];

  if (nullAssets !== expectedNullAssets) {
    invariantFailures.push(`nullAssets: observed ${nullAssets} != expected ${expectedNullAssets}`);
  }
  if (zeroAssets !== expectedZeroAssets) {
    invariantFailures.push(`zeroAssets: observed ${zeroAssets} != expected ${expectedZeroAssets}`);
  }
  if (positiveAssets !== expectedPositiveAssets) {
    invariantFailures.push(`positiveAssets: observed ${positiveAssets} != expected ${expectedPositiveAssets}`);
  }

  if (nullLiabilities !== expectedNullLiabilities) {
    invariantFailures.push(`nullLiabilities: observed ${nullLiabilities} != expected ${expectedNullLiabilities}`);
  }
  if (zeroLiabilities !== expectedZeroLiabilities) {
    invariantFailures.push(`zeroLiabilities: observed ${zeroLiabilities} != expected ${expectedZeroLiabilities}`);
  }
  if (positiveLiabilities !== expectedPositiveLiabilities) {
    invariantFailures.push(`positiveLiabilities: observed ${positiveLiabilities} != expected ${expectedPositiveLiabilities}`);
  }

  // Regression check on known candidate profiles if authoritative
  if (!isSynthetic) {
    const bommaiMla = correctedAffidavits.find(r => r.id === '0215b22e-aff-00001552');
    if (!bommaiMla || bommaiMla.total_assets !== 521356863 || bommaiMla.total_liabilities !== 59420772) {
      invariantFailures.push('Basavaraj Bommai Shiggaon 2023 values do not match expected assets 521356863, liabilities 59420772');
    }

    const bommaiMp = correctedAffidavits.find(r => r.id === '0215b22e-aff-00001646');
    if (!bommaiMp || bommaiMp.total_assets !== 539504552 || bommaiMp.total_liabilities !== 54634074) {
      invariantFailures.push('Basavaraj Bommai Haveri MP 2024 values do not match expected assets 539504552, liabilities 54634074');
    }

    const siddaramaiah = correctedAffidavits.find(r => r.id === '0215b22e-aff-00001570');
    if (!siddaramaiah || siddaramaiah.total_assets !== null) {
      invariantFailures.push('Siddaramaiah Varuna 2023 total_assets must be corrected to null');
    }

    const dks = correctedAffidavits.find(r => r.id === '0215b22e-aff-00001524');
    if (!dks || dks.total_assets !== 14138002408) {
      invariantFailures.push('D.K. Shivakumar total_assets must remain 14138002408');
    }

    // Reference aggregates
    const EXPECTED_REF_ASSETS = 1002348427067n;
    const EXPECTED_REF_LIABILITIES = 170455440078n;
    if (sumAssets !== EXPECTED_REF_ASSETS) {
      invariantFailures.push(`Aggregate assets: observed ${sumAssets} != expected ${EXPECTED_REF_ASSETS}`);
    }
    if (sumLiabilities !== EXPECTED_REF_LIABILITIES) {
      invariantFailures.push(`Aggregate liabilities: observed ${sumLiabilities} != expected ${EXPECTED_REF_LIABILITIES}`);
    }
  } else {
    // Synthetic aggregates check
    const EXPECTED_SYNTH_ASSETS = 2250000n; // 1000000 + 500000 + 750000
    const EXPECTED_SYNTH_LIABILITIES = 200000n; // 200000
    if (sumAssets !== EXPECTED_SYNTH_ASSETS) {
      invariantFailures.push(`Synthetic aggregate assets: observed ${sumAssets} != expected ${EXPECTED_SYNTH_ASSETS}`);
    }
    if (sumLiabilities !== EXPECTED_SYNTH_LIABILITIES) {
      invariantFailures.push(`Synthetic aggregate liabilities: observed ${sumLiabilities} != expected ${EXPECTED_SYNTH_LIABILITIES}`);
    }
  }

  if (invariantFailures.length > 0) {
    accumulator.recordFail('POST_CORRECTION_POPULATION_INVARIANTS', `Invariant failures:\n${invariantFailures.join('\n')}`);
    const evaluation = accumulator.evaluateOverallVerdict();
    return { verdict: 'FAIL', accumulator, evaluation };
  }

  accumulator.recordPass('POST_CORRECTION_POPULATION_INVARIANTS', 'All post-correction population invariants verified');
  accumulator.recordPass('AGGREGATE_FINANCIAL_RECONCILIATION', `Reconciled aggregates: assets ₹${sumAssets.toString()}, liabilities ₹${sumLiabilities.toString()}`);

  const evaluation = accumulator.evaluateOverallVerdict();

  return {
    verdict: evaluation.verdict,
    accumulator,
    evaluation,
    postCorrectionTotals: {
      totalAffidavits: correctedAffidavits.length,
      nullAssets,
      zeroAssets,
      positiveAssets,
      nullLiabilities,
      zeroLiabilities,
      positiveLiabilities,
      sumAssets: sumAssets.toString(),
      sumLiabilities: sumLiabilities.toString()
    }
  };
}

// ============================================================================
// 7. CLI Entrypoint
// ============================================================================

export function parseCliArgs(argv) {
  const args = {
    manifestPath: null,
    crosswalkPath: null,
    ledgerPath: null,
    inventoryPath: null,
    repoRoot: process.cwd(),
    mode: 'authoritative',
    verbose: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--manifest' && i + 1 < argv.length) {
      args.manifestPath = argv[++i];
    } else if (arg === '--crosswalk' && i + 1 < argv.length) {
      args.crosswalkPath = argv[++i];
    } else if (arg === '--ledger' && i + 1 < argv.length) {
      args.ledgerPath = argv[++i];
    } else if (arg === '--inventory' && i + 1 < argv.length) {
      args.inventoryPath = argv[++i];
    } else if (arg === '--repoRoot' && i + 1 < argv.length) {
      args.repoRoot = argv[++i];
    } else if (arg === '--mode' && i + 1 < argv.length) {
      args.mode = argv[++i];
    } else if (arg === '--verbose') {
      args.verbose = true;
    }
  }

  return args;
}

export async function cliMain() {
  try {
    const args = parseCliArgs(process.argv);

    if (!args.manifestPath || !args.crosswalkPath || !args.ledgerPath || !args.inventoryPath) {
      console.error('ERROR: Missing required arguments: --manifest, --crosswalk, --ledger, --inventory');
      process.exit(1);
    }

    const result = await verifyFinancialRemediation(args);

    if (args.verbose) {
      console.log('=== VERIFICATION CHECKS ===');
      for (const ch of result.accumulator.checks) {
        console.log(`[${ch.status}] ${ch.id}: ${ch.name} - ${ch.details}`);
      }
    }

    if (result.verdict === 'PASS') {
      console.log(`VERDICT: PASS (${result.evaluation.passedCount}/${result.evaluation.totalMandatory} mandatory checks passed)`);
      if (result.postCorrectionTotals) {
        console.log('Post-correction totals:', JSON.stringify(result.postCorrectionTotals, null, 2));
      }
      process.exit(0);
    } else {
      console.error(`VERDICT: FAIL`);
      if (result.evaluation.failedChecks && result.evaluation.failedChecks.length > 0) {
        console.error('Failed checks:');
        for (const fc of result.evaluation.failedChecks) {
          console.error(`  - ${fc.id}: ${fc.details}`);
        }
      }
      process.exit(1);
    }
  } catch (err) {
    console.error(`UNCAUGHT_CLI_EXCEPTION: ${err.message}`);
    process.exit(1);
  }
}

// Execute when run as script
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  cliMain();
}
