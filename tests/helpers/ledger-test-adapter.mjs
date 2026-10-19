/**
 * tests/helpers/ledger-test-adapter.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 108 & 109
 * Isolated Test Seam Adapter for Verification Fixtures
 *
 * Provides a dedicated, structurally isolated test adapter for test suites
 * that need to execute the shared verification logic against controlled fixtures
 * (such as adversarial tampering tests).
 *
 * This harness is isolated in tests/helpers/ and is NOT exposed on the public interface
 * of the production verifier (scripts/reconcile_execution_ledger.mjs). It does NOT
 * rely on caller-reproducible tokens, Symbol.for(...), string secrets, or mode flags.
 * Fixture injection is implemented in test-only code without exposing an override-capable
 * callable interface in production, while reusing the shared verification logic.
 */

import { execSync } from 'child_process';
import {
  REPO_ROOT,
  HISTORICAL_ORIGIN_COMMIT,
  EXPECTED_RAW_HISTORICAL_LEDGER_SHA256,
  CANONICAL_TASK_METADATA,
  loadGoverningTraceabilityMatrix,
  loadMasterSpecification,
  loadHistoricalOriginLedger,
  verifyHistoricalArtifactIntegrityPayload,
  verifyAuthorityBoundaryPayload,
  verifyGoverningSpecificationProvenancePayload,
  reconcileExecutionLedgerCore,
} from '../../scripts/reconcile_execution_ledger.mjs';

/**
 * Executes historical artifact integrity verification within controlled test fixtures.
 */
export function testVerifyHistoricalArtifactIntegrity(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = options.snapshotOverride || loadHistoricalOriginLedger(repoRoot);
  let rawBytes;
  if (options.rawBytesOverride !== undefined) {
    rawBytes = options.rawBytesOverride;
  } else {
    try {
      rawBytes = execSync(`git show ${HISTORICAL_ORIGIN_COMMIT}:reports/w021_5_execution_ledger.json`, {
        cwd: repoRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err) {
      throw new Error(`Raw artifact retrieval failed for ${HISTORICAL_ORIGIN_COMMIT}: ${err.message}`);
    }
  }
  const expectedHash = options.expectedHashOverride || EXPECTED_RAW_HISTORICAL_LEDGER_SHA256;
  const expectedCommit = options.originCommitOverride || options.referenceCommitOverride || HISTORICAL_ORIGIN_COMMIT;
  return verifyHistoricalArtifactIntegrityPayload({ snapshot, rawBytes, expectedHash, expectedCommit });
}

/**
 * Executes authority boundary verification within controlled test fixtures.
 */
export function testVerifyAuthorityBoundary(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const snapshot = options.snapshotOverride || loadHistoricalOriginLedger(repoRoot);
  const masterSpec = options.masterSpecOverride || loadMasterSpecification(repoRoot);
  const expectedCommit = options.originCommitOverride || options.referenceCommitOverride || HISTORICAL_ORIGIN_COMMIT;
  return verifyAuthorityBoundaryPayload({
    snapshot,
    masterSpec,
    canonicalMetadata: CANONICAL_TASK_METADATA,
    expectedCommit,
    repoRoot,
    taskSectionOverrides: options.taskSectionOverrides,
  });
}

/**
 * Executes governing specification provenance verification within controlled test fixtures.
 */
export function testVerifyGoverningSpecificationProvenance(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const matrix = options.matrixOverride || loadGoverningTraceabilityMatrix(repoRoot);
  const masterSpec = options.masterSpecOverride || loadMasterSpecification(repoRoot);
  return verifyGoverningSpecificationProvenancePayload({
    matrix,
    masterSpec,
    canonicalMetadata: CANONICAL_TASK_METADATA,
    repoRoot,
    expectedDocHashes: options.expectedDocHashes,
    taskSectionOverrides: options.taskSectionOverrides,
  });
}

/**
 * Executes ledger reconciliation within controlled test fixtures.
 */
export function testReconcileExecutionLedger(options = {}) {
  return reconcileExecutionLedgerCore(options);
}
