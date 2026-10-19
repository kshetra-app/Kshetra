#!/usr/bin/env node

/**
 * scripts/reconcile_execution_ledger.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 110
 * Public Production Verifier Interface
 *
 * Exposes ONLY guarded, safe-by-default production entry points:
 * - verifyHistoricalArtifactIntegrity
 * - verifyAuthorityBoundary
 * - verifyGoverningSpecificationProvenance
 * - reconcileExecutionLedger
 *
 * All caller-controlled trust overrides are unconditionally rejected.
 * Direct payload functions and test seams are strictly separated into
 * internal and test-only modules (scripts/internal/reconcile_engine.mjs
 * and tests/helpers/ledger-test-adapter.mjs) and are NOT exported here.
 */

import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Import shared engine implementations (internal, NOT re-exported)
import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  CANONICAL_TASK_METADATA,
  loadGoverningTraceabilityMatrix,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  assertNoCallerTrustOverrides,
  verifyHistoricalArtifactIntegrityPayload,
  verifyAuthorityBoundaryPayload,
  verifyGoverningSpecificationProvenancePayload,
  reconcileExecutionLedgerCore,
} from './internal/reconcile_engine.mjs';

/**
 * Approved Production Export Inventory (CTO Directive 111 Workstream B)
 *
 * Defines the complete, approved export surface of the production verifier module.
 * Exposes:
 * - Exactly 4 guarded public verifier entry points.
 * - An approved inventory of safe auxiliary constants, schemas, loaders, and accounting utilities.
 * All 4 payload functions (verifyHistoricalArtifactIntegrityPayload, verifyAuthorityBoundaryPayload,
 * verifyGoverningSpecificationProvenancePayload, reconcileExecutionLedgerCore) and test seams are strictly
 * excluded.
 */
export const APPROVED_PRODUCTION_EXPORTS = Object.freeze([
  // 4 Guarded Public Verifier Entry Points
  'verifyHistoricalArtifactIntegrity',
  'verifyAuthorityBoundary',
  'verifyGoverningSpecificationProvenance',
  'reconcileExecutionLedger',

  // Self-describing Approved Export Inventory
  'APPROVED_PRODUCTION_EXPORTS',

  // Safe Canonical Paths & Identifiers
  'REPO_ROOT',
  'HISTORICAL_ORIGIN_COMMIT',
  'EXPECTED_RAW_HISTORICAL_LEDGER_SHA256',
  'EXPECTED_RAW_HISTORICAL_LEDGER_BYTES',
  'TRUSTED_AUTHORITIES_PATH',
  'MASTER_SPECIFICATION_PATH',
  'HISTORICAL_ORIGIN_LEDGER_PATH',
  'GOVERNING_TRACEABILITY_MATRIX_PATH',

  // Safe Domain Classifications & Schemas
  'AUTHORITY_CLASSIFICATION',
  'AUTHORITY_BOUNDARY_ROLE',
  'STAGE_EVIDENCE_RELEVANCE',
  'TASK_DELIVERABLE_SIGNATURES',
  'VALID_EVIDENCE_CLASSES',
  'VALID_VERIFICATION_STATUSES',
  'CANONICAL_TASK_METADATA',
  'OLD_TO_CANONICAL_TASK_MAPPING',
  'PHANTOM_TASK_DISPOSITIONS',
  'DISCREPANCY_REGISTER',
  'TASK_SPECIFICATIONS',

  // Safe Guard Utilities & Constants
  'FORBIDDEN_TRUST_OVERRIDES',
  'assertNoCallerTrustOverrides',

  // Safe Read-Only Parsers & Loaders
  'loadGoverningTraceabilityMatrix',
  'loadMasterSpecification',
  'loadHistoricalOriginLedger',
  'getTrustedAuthorities',
  'getCanonicalAcceptancePayload',
  'canonicalizeValue',
  'computeKeyFingerprint',
  'stripSqlCommentsAndLiterals',
  'resolveTaskIdentity',

  // Safe Offline Accounting & Validation Utilities
  'applyTaskAccountingDefaults',
  'validateMasterSpecificationAgainstCode',
  'validateCanonicalTaskIdentity',
  'evaluateTaskCriteria',
  'verifyCryptographicAcceptanceSignature',
  'validateFormalAcceptanceArtifact',
  'validateCoordinates',
  'validateGeoJsonContent',
  'validateSqlContent',
  'validateTestContent',
  'validateMarkdownContent',
  'validateJsonContent',
  'validateClaimSpecificContent',
  'validateTaskEvidence',
  'validateTaskAccounting',
  'validateStageAccounting',
  'computeLedgerSummary',
  'validateLedgerSummaryConsistency',
  'generateLedgerMarkdown',
  'verifyNonOverlappingAccountingAndTraceability',
]);

// Re-export safe constants, loaders, and accounting utilities for external scripts and tests
export {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  EXPECTED_RAW_HISTORICAL_LEDGER_BYTES,
  AUTHORITY_CLASSIFICATION,
  AUTHORITY_BOUNDARY_ROLE,
  TRUSTED_AUTHORITIES_PATH,
  MASTER_SPECIFICATION_PATH,
  HISTORICAL_ORIGIN_LEDGER_PATH,
  GOVERNING_TRACEABILITY_MATRIX_PATH,
  loadGoverningTraceabilityMatrix,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  FORBIDDEN_TRUST_OVERRIDES,
  assertNoCallerTrustOverrides,
  validateMasterSpecificationAgainstCode,
  STAGE_EVIDENCE_RELEVANCE,
  TASK_DELIVERABLE_SIGNATURES,
  VALID_EVIDENCE_CLASSES,
  VALID_VERIFICATION_STATUSES,
  applyTaskAccountingDefaults,
  CANONICAL_TASK_METADATA,
  OLD_TO_CANONICAL_TASK_MAPPING,
  PHANTOM_TASK_DISPOSITIONS,
  DISCREPANCY_REGISTER,
  resolveTaskIdentity,
  validateCanonicalTaskIdentity,
  TASK_SPECIFICATIONS,
  evaluateTaskCriteria,
  computeKeyFingerprint,
  getTrustedAuthorities,
  canonicalizeValue,
  getCanonicalAcceptancePayload,
  verifyCryptographicAcceptanceSignature,
  validateFormalAcceptanceArtifact,
  validateCoordinates,
  validateGeoJsonContent,
  stripSqlCommentsAndLiterals,
  validateSqlContent,
  validateTestContent,
  validateMarkdownContent,
  validateJsonContent,
  validateClaimSpecificContent,
  validateTaskEvidence,
  validateTaskAccounting,
  validateStageAccounting,
  computeLedgerSummary,
  validateLedgerSummaryConsistency,
  generateLedgerMarkdown,
  verifyNonOverlappingAccountingAndTraceability,
} from './internal/reconcile_engine.mjs';

/**
 * Public production verifier: Safe by default, unconditionally rejects caller-controlled trust overrides.
 */
export function verifyHistoricalArtifactIntegrity(options = {}) {
  assertNoCallerTrustOverrides(options, 'verifyHistoricalArtifactIntegrity');
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = loadHistoricalOriginLedger(repoRoot);
  let rawBytes;
  try {
    rawBytes = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(`Raw artifact retrieval failed for ${HISTORICAL_ORIGIN_COMMIT}: ${err.message}`);
  }
  return verifyHistoricalArtifactIntegrityPayload({
    snapshot,
    rawBytes,
    expectedHash: EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
    expectedCommit: HISTORICAL_ORIGIN_COMMIT,
  });
}

/**
 * Public production verifier: Safe by default, unconditionally rejects caller-controlled trust overrides.
 */
export function verifyGoverningSpecificationProvenance(options = {}) {
  assertNoCallerTrustOverrides(options, 'verifyGoverningSpecificationProvenance');
  const repoRoot = options.repoRoot || REPO_ROOT;
  const matrix = loadGoverningTraceabilityMatrix(repoRoot);
  const masterSpec = loadMasterSpecification(repoRoot);
  return verifyGoverningSpecificationProvenancePayload({
    matrix,
    masterSpec,
    canonicalMetadata: CANONICAL_TASK_METADATA,
    repoRoot,
  });
}

/**
 * Public production verifier: Safe by default, unconditionally rejects caller-controlled trust overrides.
 */
export function verifyAuthorityBoundary(options = {}) {
  assertNoCallerTrustOverrides(options, 'verifyAuthorityBoundary');
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = loadHistoricalOriginLedger(repoRoot);
  const masterSpec = loadMasterSpecification(repoRoot);
  return verifyAuthorityBoundaryPayload({
    snapshot,
    masterSpec,
    canonicalMetadata: CANONICAL_TASK_METADATA,
    expectedCommit: HISTORICAL_ORIGIN_COMMIT,
    repoRoot,
  });
}

/**
 * Public production verifier: Safe by default, unconditionally rejects caller-controlled trust overrides.
 */
export function reconcileExecutionLedger(options = {}) {
  assertNoCallerTrustOverrides(options, 'reconcileExecutionLedger');
  return reconcileExecutionLedgerCore(options);
}

// Execute when invoked directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    reconcileExecutionLedger();
    process.exit(0);
  } catch (err) {
    console.error(`[FAIL] Ledger reconciliation error: ${err.message}`);
    process.exit(1);
  }
}
