#!/usr/bin/env node

/**
 * scripts/internal/reconcile_engine.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 108
 * Core Verification Engine (Shared Implementation)
 *
 * Provides the shared, trust-critical verification implementation used by:
 * 1. The public production verifier (scripts/reconcile_execution_ledger.mjs), which wraps
 *    all entry points with fail-closed trust override assertions (assertNoCallerTrustOverrides).
 * 2. The isolated test adapter (tests/helpers/ledger-test-adapter.mjs), which enables
 *    controlled test fixture execution without exposing bypass tokens or interfaces on the
 *    production verifier's public export surface.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
  GOVERNING_TRACEABILITY_MATRIX_PATH,
  CANONICAL_TASK_METADATA,
  TASK_SPECIFICATIONS,
  OLD_TO_CANONICAL_TASK_MAPPING,
  PHANTOM_TASK_DISPOSITIONS,
  loadGoverningTraceabilityMatrix,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  validateMasterSpecificationAgainstCode,
  validateStageAccounting,
  computeLedgerSummary,
  validateLedgerSummaryConsistency,
  generateLedgerMarkdown,
  verifyNonOverlappingAccountingAndTraceability,
} from '../reconcile_execution_ledger.mjs';

/**
 * Workstream A (CTO Directive 103):
 * Enforces historical artifact integrity, raw SHA-256 validation from git history,
 * snapshot fidelity (semantic/canonical JSON equality), and semantic consistency.
 */
export function _verifyHistoricalArtifactIntegrityInternal(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = loadHistoricalOriginLedger(repoRoot);

  // 1. Historical identity check
  if (snapshot.sourceOriginCommit !== HISTORICAL_ORIGIN_COMMIT) {
    throw new Error(`Historical identity violation: expected commit ${HISTORICAL_ORIGIN_COMMIT}, got ${snapshot.sourceOriginCommit}`);
  }
  if (snapshot.sourceArtifactPath !== 'reports/w021_5_execution_ledger.json') {
    throw new Error(`Historical source path violation: expected "reports/w021_5_execution_ledger.json", got "${snapshot.sourceArtifactPath}"`);
  }

  // 2. Raw artifact integrity from Git history (immutable Git object database)
  let rawBytes;
  try {
    rawBytes = options.rawBytesOverride !== undefined
      ? options.rawBytesOverride
      : execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
          cwd: repoRoot,
          maxBuffer: 10 * 1024 * 1024,
        });
  } catch (err) {
    throw new Error(`Raw artifact retrieval failed for ${HISTORICAL_ORIGIN_COMMIT}: ${err.message}`);
  }

  const rawSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');
  const expectedHash = options.expectedHashOverride || EXPECTED_RAW_HISTORICAL_LEDGER_SHA256;
  if (rawSha256 !== expectedHash) {
    throw new Error(`Raw artifact integrity violation: SHA-256 hash mismatch. Expected ${expectedHash}, got ${rawSha256}`);
  }

  // 3. Snapshot fidelity (structural and canonical parsed JSON equality)
  const gitParsed = JSON.parse(rawBytes.toString('utf8'));
  const canonicalGitStr = JSON.stringify(gitParsed);
  const canonicalSnapshotStr = JSON.stringify(snapshot.historicalLedger);
  if (canonicalGitStr !== canonicalSnapshotStr) {
    throw new Error(`Snapshot fidelity violation: snapshot historicalLedger content does not structurally match git show parsed JSON`);
  }

  // 4. Semantic consistency
  const histLedger = snapshot.historicalLedger;
  let uniqueNestedTaskCount = 0;
  const seenTaskIds = new Set();
  for (const s of histLedger.stages) {
    for (const t of s.tasks) {
      if (seenTaskIds.has(t.taskId)) {
        throw new Error(`Semantic consistency violation: Duplicate task ID "${t.taskId}" in historical origin ledger stages`);
      }
      seenTaskIds.add(t.taskId);
      uniqueNestedTaskCount++;
    }
  }

  return {
    verified: true,
    historicalIdentity: {
      sourceOriginCommit: HISTORICAL_ORIGIN_COMMIT,
      sourceArtifactPath: snapshot.sourceArtifactPath,
    },
    rawArtifactIntegrity: {
      expectedSha256: expectedHash,
      actualSha256: rawSha256,
      rawByteLength: rawBytes.length,
      match: true,
    },
    snapshotFidelity: {
      comparisonMethod: 'SEMANTIC_AND_CANONICAL_SERIALIZED_JSON_EQUALITY',
      snapshotPath: 'governance/specifications/historical_w021_5_origin_ledger.json',
      structuralMatch: true,
      isBitwiseEnvelopeMatch: false,
      fidelityNote: 'Snapshot preserves historicalLedger JSON payload identically; snapshot envelope adds repository metadata wrapper.',
    },
    semanticConsistency: {
      nestedTaskCount: uniqueNestedTaskCount,
      summaryDeclaredTaskCount: histLedger.summary.totalTasks,
      hasSummaryHeaderLag: uniqueNestedTaskCount !== histLedger.summary.totalTasks,
      discrepancyId: 'DISC-012',
      discrepancyClassification: 'HISTORICAL_STALE_SUMMARY_HEADER',
      coreTasksCount: 25,
      hardeningExtensionsCount: 2,
      stageCount: histLedger.stages.length,
      totalWeightSum: histLedger.stages.reduce((sum, s) => sum + s.stageWeight, 0),
    },
    trustAnchorStatus: {
      classification: 'REPOSITORY_LOCAL_INTEGRITY_CHECK_NOT_EXTERNAL_TRUST_ANCHOR',
      limitation: 'A hash recorded within the repository verifies tamper detection against drift within the codebase but does not constitute an independent external cryptographic trust anchor without out-of-band verification.',
    },
  };
}

/**
 * Workstream A (CTO Directive 104):
 * Enforces governing specification provenance across the repository.
 * Cryptographically verifies git historical blob SHAs and commits of all 5 governing documents,
 * establishes bidirectional 1:1 mapping between governing matrix tasks and canonical tasks,
 * and proves conservation of the 4-way mutually exclusive progress partitions.
 * Fails closed on any discrepancy, unapproved extension, fabricated requirement,
 * or unapproved extension promotion, even if manifest and metadata are co-mutated.
 */
export function _verifyGoverningSpecificationProvenanceInternal(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const matrix = options.matrixOverride || loadGoverningTraceabilityMatrix(repoRoot);
  const masterSpec = options.masterSpecOverride || loadMasterSpecification(repoRoot);

  if (!matrix || typeof matrix !== 'object') {
    throw new Error('Governing provenance violation: Invalid traceability matrix.');
  }
  if (!Array.isArray(matrix.governingDocuments) || matrix.governingDocuments.length === 0) {
    throw new Error('Governing provenance violation: Traceability matrix has missing or empty governingDocuments.');
  }
  if (!Array.isArray(matrix.tasks) || matrix.tasks.length !== 27) {
    throw new Error(`Governing provenance violation: Expected 27 tasks in governing matrix, got ${matrix.tasks?.length}.`);
  }

  // 1. Verify governing documents integrity, existence, and Git historical blob SHA
  const docMap = {};
  for (const doc of matrix.governingDocuments) {
    docMap[doc.docId] = doc;
    const docFullPath = path.join(repoRoot, doc.path);
    if (!fs.existsSync(docFullPath)) {
      throw new Error(`Governing provenance violation: Governing document missing on disk: ${doc.path} (${doc.docId}).`);
    }
    const fileBytes = fs.readFileSync(docFullPath);
    const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    const expectedHash = (options.expectedDocHashes && options.expectedDocHashes[doc.docId]) || doc.sha256 || doc.contentIdentity?.sha256;
    if (computedHash !== expectedHash) {
      throw new Error(`Governing provenance violation: Document digest mismatch for ${doc.path}. Expected ${expectedHash}, got ${computedHash}.`);
    }

    // Git Blob SHA Verification: Compute blob SHA and verify against Git history
    const header = Buffer.from(`blob ${fileBytes.length}\0`);
    const computedBlobSha = crypto.createHash('sha1').update(Buffer.concat([header, fileBytes])).digest('hex');
    const expectedBlobSha = doc.contentIdentity ? doc.contentIdentity.gitBlobSha : doc.blobShaHead;
    if (computedBlobSha !== expectedBlobSha) {
      throw new Error(`Governing provenance violation: Document Git blob SHA mismatch for ${doc.path}. Expected ${expectedBlobSha}, got ${computedBlobSha}.`);
    }

    // Verify blob presence in Git object database at recorded commit
    const commitSha = doc.historicalIdentity?.recordedCommitSha || doc.recordedCommitSha || doc.commitSha || doc.historicalIdentity?.introducingCommit?.sha || doc.introducingCommit?.sha;
    if (commitSha) {
      try {
        const histBlob = execSync(`git rev-parse ${commitSha}:${doc.path}`, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (histBlob !== expectedBlobSha) {
          throw new Error(`Governing provenance violation: Historical blob SHA mismatch for ${doc.path} at commit ${commitSha}. Expected ${expectedBlobSha}, got ${histBlob}.`);
        }
      } catch (e) {
        if (e.message.includes('Historical blob SHA mismatch')) throw e;
        throw new Error(`Governing provenance violation: Historical blob verification failed for ${doc.path} at commit ${commitSha}: ${e.message}`);
      }
    }
  }

  // 2. Bidirectional Mapping: Governing Matrix Tasks <-> Canonical Metadata <-> Master Spec
  const matrixTaskMap = {};
  const matrixReqCodeMap = {};

  for (const t of matrix.tasks) {
    if (matrixTaskMap[t.taskId]) {
      throw new Error(`Governing provenance violation: Duplicate task ID "${t.taskId}" in governing matrix.`);
    }
    if (matrixReqCodeMap[t.requirementCode]) {
      throw new Error(`Governing provenance violation: Duplicate requirementCode "${t.requirementCode}" in governing matrix.`);
    }
    matrixTaskMap[t.taskId] = t;
    matrixReqCodeMap[t.requirementCode] = t;

    // Check governing document linkage
    if (!docMap[t.governingDocumentId]) {
      throw new Error(`Governing provenance violation: Task ${t.taskId} references unknown governingDocumentId "${t.governingDocumentId}".`);
    }
    if (!t.governingSectionRef || typeof t.governingSectionRef !== 'string') {
      throw new Error(`Governing provenance violation: Task ${t.taskId} has missing or invalid governingSectionRef.`);
    }
  }

  // 3. Reconcile against Canonical Task Metadata
  const canonicalIds = Object.keys(CANONICAL_TASK_METADATA);
  if (canonicalIds.length !== matrix.tasks.length) {
    throw new Error(`Governing provenance violation: Canonical task count (${canonicalIds.length}) does not match governing matrix (${matrix.tasks.length}).`);
  }

  for (const [tid, canonical] of Object.entries(CANONICAL_TASK_METADATA)) {
    const matrixTask = matrixTaskMap[tid];
    if (!matrixTask) {
      throw new Error(`Governing provenance violation: Canonical task "${tid}" has no mapping in governing specification matrix.`);
    }

    // Fabricated requirement check
    if (canonical.requirementCode !== matrixTask.requirementCode) {
      throw new Error(`Governing provenance violation: Task ${tid} requirementCode mismatch: expected "${matrixTask.requirementCode}", got "${canonical.requirementCode}".`);
    }

    // Classification check (prevent unapproved extension promotion)
    if (canonical.taskClassification !== matrixTask.taskClassification) {
      throw new Error(`Governing provenance violation: Task ${tid} classification mismatch: expected "${matrixTask.taskClassification}", got "${canonical.taskClassification}".`);
    }

    // Title, stage, weight check
    if (canonical.canonicalTitle !== matrixTask.canonicalTitle) {
      throw new Error(`Governing provenance violation: Task ${tid} title mismatch vs governing matrix: expected "${matrixTask.canonicalTitle}", got "${canonical.canonicalTitle}".`);
    }
    if (canonical.stageId !== matrixTask.stageId) {
      throw new Error(`Governing provenance violation: Task ${tid} stageId mismatch vs governing matrix: expected "${matrixTask.stageId}", got "${canonical.stageId}".`);
    }
    if (Math.abs(canonical.weight - matrixTask.approvedWeight) > 0.001) {
      throw new Error(`Governing provenance violation: Task ${tid} weight mismatch vs governing matrix: expected ${matrixTask.approvedWeight}%, got ${canonical.weight}%.`);
    }

    // Section ref check if overridden or mutated
    if (options.taskSectionOverrides && options.taskSectionOverrides[tid]) {
      if (options.taskSectionOverrides[tid] !== matrixTask.governingSectionRef) {
        throw new Error(`Governing provenance violation: Task ${tid} mapped to wrong governing section: expected "${matrixTask.governingSectionRef}", got "${options.taskSectionOverrides[tid]}".`);
      }
    }
  }

  // 4. Reconcile against Master Spec Manifest
  for (const [tid, specTask] of Object.entries(masterSpec.tasks)) {
    const matrixTask = matrixTaskMap[tid];
    if (!matrixTask) {
      throw new Error(`Governing provenance violation: Master spec task "${tid}" has no mapping in governing specification matrix.`);
    }
    if (specTask.governingRequirement !== matrixTask.requirementCode) {
      throw new Error(`Governing provenance violation: Master spec task ${tid} governingRequirement mismatch: expected "${matrixTask.requirementCode}", got "${specTask.governingRequirement}".`);
    }
  }

  // 5. Reconcile against Criteria in TASK_SPECIFICATIONS
  for (const [tid, matrixTask] of Object.entries(matrixTaskMap)) {
    const taskSpec = TASK_SPECIFICATIONS[tid];
    if (!taskSpec) {
      throw new Error(`Governing provenance violation: Task ${tid} missing from TASK_SPECIFICATIONS.`);
    }
    const specCritIds = taskSpec.criteria.map((c) => c.criterionId);
    const matrixCritIds = matrixTask.criterionIds;
    if (specCritIds.length !== matrixCritIds.length || !specCritIds.every((id, idx) => id === matrixCritIds[idx])) {
      throw new Error(`Governing provenance violation: Task ${tid} criterion IDs mismatch: spec=[${specCritIds.join(',')}], matrix=[${matrixCritIds.join(',')}].`);
    }
  }

  // 6. Mutually Exclusive Progress Partition Conservation
  const partition = matrix.summary.progressPartition;
  const derivedTotal = partition.repoVerifiedEarned + partition.databasePending + partition.blockedExternal + partition.unimplemented;
  if (Math.abs(derivedTotal - 100.0) > 0.001) {
    throw new Error(`Governing provenance violation: Progress partition does not sum to 100.000%, got ${derivedTotal.toFixed(3)}%.`);
  }

  return {
    verified: true,
    totalDocuments: matrix.governingDocuments.length,
    canonicalTasksVerified: matrix.tasks.length,
    coreSpecificationCount: matrix.summary.coreSpecificationTasks,
    hardeningExtensionCount: matrix.summary.hardeningExtensionTasks,
    unapprovedExtensionsCount: matrix.summary.unapprovedExtensions,
    totalCriteriaCount: matrix.summary.totalCriteria,
    progressPartition: partition,
    monolithicSpecDisposition: matrix.monolithicSpecificationStatus,
  };
}

/**
 * Workstream B (CTO Directive 102 & 103):
 * Enforces bidirectional authority boundary by comparing implementation metadata and master specification
 * against immutable historical origin (be4ba41).
 * Fails closed if any task title, weight, stage, specification reference, governing requirement,
 * stage membership, or subtotal deviates from origin in either direction.
 */
export function _verifyAuthorityBoundaryInternal(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = loadHistoricalOriginLedger(repoRoot);
  const histLedger = snapshot.historicalLedger;
  const masterSpec = loadMasterSpecification(repoRoot);

  // 1. Historical Identity Check
  const expectedCommit = options.originCommitOverride || options.referenceCommitOverride || HISTORICAL_ORIGIN_COMMIT;
  if (snapshot.sourceOriginCommit !== expectedCommit) {
    throw new Error(`Authority boundary violation: Origin snapshot commit (${snapshot.sourceOriginCommit}) does not match required origin commit (${expectedCommit}).`);
  }
  if (snapshot.sourceArtifactPath !== 'reports/w021_5_execution_ledger.json') {
    throw new Error(`Authority boundary violation: Origin artifact path (${snapshot.sourceArtifactPath}) does not match reports/w021_5_execution_ledger.json.`);
  }

  const histTaskMap = {};
  const histStageMap = {};
  const seenHistTaskIds = new Set();

  for (const s of histLedger.stages) {
    const normStageId = s.stageId === 'STAGE_B1' ? 'STAGE_B' : s.stageId;
    if (histStageMap[normStageId]) {
      throw new Error(`Authority boundary violation: Duplicate stage ID "${s.stageId}" in historical origin.`);
    }
    histStageMap[normStageId] = {
      stageId: normStageId,
      originalStageId: s.stageId,
      stageName: s.stageName,
      stageWeight: s.stageWeight,
      tasks: s.tasks,
      taskIds: s.tasks.map((t) => t.taskId),
    };
    for (const t of s.tasks) {
      if (seenHistTaskIds.has(t.taskId)) {
        throw new Error(`Authority boundary violation: Duplicate task ID "${t.taskId}" in historical origin stages.`);
      }
      seenHistTaskIds.add(t.taskId);
      histTaskMap[t.taskId] = {
        taskId: t.taskId,
        title: t.title,
        weight: t.weight,
        stageId: normStageId,
        specRef: t.specRef,
      };
    }
  }

  // 2. Bidirectional Task Inventory Enforcement (Historical <-> Canonical <-> Master Spec)
  const canonicalIds = Object.keys(CANONICAL_TASK_METADATA);
  const histIds = Object.keys(histTaskMap);
  const specIds = Object.keys(masterSpec.tasks);

  // 2a. Canonical vs Historical
  if (canonicalIds.length !== histIds.length) {
    throw new Error(`Authority boundary violation: Canonical task count (${canonicalIds.length}) does not match historical origin (${histIds.length}).`);
  }
  for (const histId of histIds) {
    if (!CANONICAL_TASK_METADATA[histId]) {
      throw new Error(`Authority boundary violation: Task ${histId} present in historical origin is missing from canonical metadata.`);
    }
  }
  for (const canId of canonicalIds) {
    if (!histTaskMap[canId]) {
      throw new Error(`Authority boundary violation: Canonical task ${canId} does not exist in historical origin ledger.`);
    }
  }

  // 2b. Master Spec vs Historical
  if (specIds.length !== histIds.length) {
    throw new Error(`Authority boundary violation: Master specification task count (${specIds.length}) does not match historical origin (${histIds.length}).`);
  }
  for (const histId of histIds) {
    if (!masterSpec.tasks[histId]) {
      throw new Error(`Authority boundary violation: Origin task ${histId} missing from master specification manifest.`);
    }
  }
  for (const specId of specIds) {
    if (!histTaskMap[specId]) {
      throw new Error(`Authority boundary violation: Master spec task ${specId} does not exist in historical origin.`);
    }
  }

  // 2c. Master Spec vs Canonical
  if (specIds.length !== canonicalIds.length) {
    throw new Error(`Authority boundary violation: Master spec task count (${specIds.length}) does not match canonical metadata (${canonicalIds.length}).`);
  }
  for (const canId of canonicalIds) {
    if (!masterSpec.tasks[canId]) {
      throw new Error(`Authority boundary violation: Canonical task ${canId} missing from master specification manifest.`);
    }
  }

  // 3. Task-Level Attribute Equality (Title, Weight, Stage, SpecRef, Governing Requirement)
  for (const [taskId, canonical] of Object.entries(CANONICAL_TASK_METADATA)) {
    const hist = histTaskMap[taskId];
    const specTask = masterSpec.tasks[taskId];

    // Canonical Title check
    if (canonical.canonicalTitle !== hist.title) {
      throw new Error(`Authority boundary violation: Task ${taskId} title mismatch: expected "${hist.title}" from origin, got "${canonical.canonicalTitle}".`);
    }
    if (specTask.canonicalTitle !== hist.title) {
      throw new Error(`Authority boundary violation: Master spec task ${taskId} title "${specTask.canonicalTitle}" differs from origin "${hist.title}".`);
    }

    // Weight check
    if (Math.abs(canonical.weight - hist.weight) > 0.001) {
      throw new Error(`Authority boundary violation: Task ${taskId} weight mismatch: expected ${hist.weight}% from origin, got ${canonical.weight}%.`);
    }
    if (Math.abs(specTask.approvedWeight - hist.weight) > 0.001) {
      throw new Error(`Authority boundary violation: Master spec task ${taskId} weight ${specTask.approvedWeight}% differs from origin ${hist.weight}%.`);
    }

    // Stage check
    const normCanonicalStage = canonical.stageId === 'STAGE_B1' ? 'STAGE_B' : canonical.stageId;
    const normSpecStage = specTask.stageId === 'STAGE_B1' ? 'STAGE_B' : specTask.stageId;
    if (normCanonicalStage !== hist.stageId) {
      throw new Error(`Authority boundary violation: Task ${taskId} stage mismatch: expected ${hist.stageId} from origin, got ${canonical.stageId}.`);
    }
    if (normSpecStage !== hist.stageId) {
      throw new Error(`Authority boundary violation: Master spec task ${taskId} stage mismatch: expected ${hist.stageId} from origin, got ${specTask.stageId}.`);
    }

    // SpecRef check (historical specRef must match both canonical metadata and master spec)
    if (canonical.masterSpecRef !== hist.specRef) {
      throw new Error(`Authority boundary violation: Task ${taskId} specRef mismatch: expected "${hist.specRef}" from origin, got "${canonical.masterSpecRef}".`);
    }
    if (specTask.governingSpecRef !== hist.specRef) {
      throw new Error(`Authority boundary violation: Master spec task ${taskId} governingSpecRef mismatch: expected "${hist.specRef}" from origin, got "${specTask.governingSpecRef}".`);
    }

    // Governing Requirement check
    if (specTask.governingRequirement !== canonical.requirementCode) {
      throw new Error(`Authority boundary violation: Master spec task ${taskId} governingRequirement mismatch: expected "${canonical.requirementCode}", got "${specTask.governingRequirement}".`);
    }
  }

  // 4. Stage-Level Bidirectional Validation (Stage count, IDs, Names, Weights, Task Membership, Subtotals)
  const specStageMap = {};
  for (const s of masterSpec.stages) {
    const normStageId = s.stageId === 'STAGE_B1' ? 'STAGE_B' : s.stageId;
    specStageMap[normStageId] = s;
  }
  const histStageKeys = Object.keys(histStageMap).sort();
  const specStageKeys = Object.keys(specStageMap).sort();

  if (specStageKeys.length !== histStageKeys.length) {
    throw new Error(`Authority boundary violation: Master spec stage count (${specStageKeys.length}) does not match origin (${histStageKeys.length}).`);
  }
  for (const sid of histStageKeys) {
    if (!specStageMap[sid]) {
      throw new Error(`Authority boundary violation: Origin stage ${sid} missing in master specification.`);
    }
  }
  for (const sid of specStageKeys) {
    if (!histStageMap[sid]) {
      throw new Error(`Authority boundary violation: Master spec stage ${sid} does not exist in historical origin.`);
    }
  }

  for (const sid of histStageKeys) {
    const histStage = histStageMap[sid];
    const specStage = specStageMap[sid];

    if (specStage.stageName !== histStage.stageName) {
      throw new Error(`Authority boundary violation: Stage ${sid} name mismatch: expected "${histStage.stageName}", got "${specStage.stageName}".`);
    }
    if (Math.abs(specStage.approvedWeight - histStage.stageWeight) > 0.001) {
      throw new Error(`Authority boundary violation: Master spec stage ${sid} weight ${specStage.approvedWeight}% differs from origin ${histStage.stageWeight}%.`);
    }

    // Task membership equality
    const sortedHistTasks = [...histStage.taskIds].sort();
    const sortedSpecTasks = [...specStage.taskIds].sort();
    if (sortedHistTasks.length !== sortedSpecTasks.length || !sortedHistTasks.every((id, idx) => id === sortedSpecTasks[idx])) {
      throw new Error(`Authority boundary violation: Stage ${sid} task membership mismatch: origin=[${sortedHistTasks.join(',')}], spec=[${sortedSpecTasks.join(',')}].`);
    }

    // Subtotal conservation: sum of task weights must equal stage weight
    const histTaskSum = histStage.tasks.reduce((acc, t) => acc + t.weight, 0);
    if (Math.abs(histTaskSum - histStage.stageWeight) > 0.001) {
      throw new Error(`Authority boundary violation: Stage ${sid} task weight subtotal (${histTaskSum}) does not equal stage weight (${histStage.stageWeight}).`);
    }
    const specTaskSum = specStage.taskIds.reduce((acc, id) => acc + masterSpec.tasks[id].approvedWeight, 0);
    if (Math.abs(specTaskSum - specStage.approvedWeight) > 0.001) {
      throw new Error(`Authority boundary violation: Stage ${sid} master spec task weight subtotal (${specTaskSum}) does not equal stage approvedWeight (${specStage.approvedWeight}).`);
    }
  }

  // 5. Total Milestone Allocation Conservation
  const totalAllocation = masterSpec.stages.reduce((acc, s) => acc + s.approvedWeight, 0);
  if (Math.abs(totalAllocation - 100.0) > 0.001) {
    throw new Error(`Authority boundary violation: Total milestone allocation must equal 100.0%, got ${totalAllocation}%.`);
  }

  // 6. Governing Specification Provenance Verification (Directive 104)
  const governingProvenance = _verifyGoverningSpecificationProvenanceInternal(options);

  return {
    verified: true,
    historicalOriginCommit: snapshot.sourceOriginCommit,
    taskCount: Object.keys(CANONICAL_TASK_METADATA).length,
    stageCount: Object.keys(histStageMap).length,
    conservationSum: 100.0,
    specRefVerified: true,
    governingRequirementVerified: true,
    governingProvenance,
  };
}

/**
 * Main ledger reconciliation workflow.
 */
export function _reconcileExecutionLedgerInternal(options = {}) {
  const jsonPath = path.resolve(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.resolve(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Execution ledger JSON file not found: "${jsonPath}".`);
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  let ledger;
  try {
    ledger = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Execution ledger JSON file is malformed: ${err.message}`);
  }

  // Validate stages
  if (!Array.isArray(ledger.stages) || ledger.stages.length === 0) {
    throw new Error('Ledger accounting validation error: Missing or empty stages array.');
  }

  const opts = { enforceCanonicalIdentity: true, productionVerificationMode: true, ...options };

  // Workstream A (CTO Directive 103): Verify Historical Artifact Integrity (Raw Git SHA-256 & Snapshot Fidelity)
  _verifyHistoricalArtifactIntegrityInternal(opts);

  // Workstream B (CTO Directive 102 & 103): Enforce Authority Boundary against historical origin commit be4ba41
  _verifyAuthorityBoundaryInternal(opts);

  // Validate master specification manifest against code metadata
  validateMasterSpecificationAgainstCode(opts.repoRoot || REPO_ROOT);

  for (const stage of ledger.stages) {
    validateStageAccounting(stage, opts);
  }

  ledger.directive = 'CTO Directive 086 / CTO Directive 087 / CTO Directive 088 / CTO Directive 089 / CTO Directive 090 / CTO Directive 091 / CTO Directive 092 / CTO Directive 093 / CTO Directive 094 / CTO Directive 095 / CTO Directive 096 / CTO Directive 097 / CTO Directive 098 / CTO Directive 099 / CTO Directive 100 / CTO Directive 101 / CTO Directive 102 / CTO Directive 103 / CTO Directive 104 / CTO Directive 105 / CTO Directive 106 / CTO Directive 107 / CTO Directive 108';

  // Compute summary
  const summary = computeLedgerSummary(ledger, opts);
  ledger.summary = summary;
  validateLedgerSummaryConsistency(ledger);

  // Workstream B (CTO Directive 105): Enforce strict non-overlapping accounting and conservation
  verifyNonOverlappingAccountingAndTraceability({ ...opts, ledgerOverride: ledger });

  // Write reconciled JSON
  fs.writeFileSync(jsonPath, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`[PASS] Reconciled JSON ledger written to ${jsonPath}`);

  // Generate and write Markdown ledger
  const mdContent = generateLedgerMarkdown(ledger, summary);
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`[PASS] Reconciled Markdown ledger written to ${mdPath}`);

  return { reconciled: true, ledger, summary };
}
