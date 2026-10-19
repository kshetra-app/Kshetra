/**
 * tests/helpers/ledger-test-adapter.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 108
 * Isolated Test Seam Adapter for Verification Fixtures
 *
 * Provides a dedicated, structurally isolated test adapter for test suites
 * that need to execute the shared verification logic against controlled fixtures
 * (such as adversarial tampering tests).
 *
 * This harness is isolated in tests/helpers/ and is NOT exposed on the public interface
 * of the production verifier (scripts/reconcile_execution_ledger.mjs). It does NOT
 * rely on caller-reproducible tokens, Symbol.for(...), string secrets, or mode flags.
 */

import {
  _verifyHistoricalArtifactIntegrityInternal,
  _verifyAuthorityBoundaryInternal,
  _verifyGoverningSpecificationProvenanceInternal,
  _reconcileExecutionLedgerInternal,
} from '../../scripts/internal/reconcile_engine.mjs';

/**
 * Executes historical artifact integrity verification within controlled test fixtures.
 */
export function testVerifyHistoricalArtifactIntegrity(options = {}) {
  return _verifyHistoricalArtifactIntegrityInternal(options);
}

/**
 * Executes authority boundary verification within controlled test fixtures.
 */
export function testVerifyAuthorityBoundary(options = {}) {
  return _verifyAuthorityBoundaryInternal(options);
}

/**
 * Executes governing specification provenance verification within controlled test fixtures.
 */
export function testVerifyGoverningSpecificationProvenance(options = {}) {
  return _verifyGoverningSpecificationProvenanceInternal(options);
}

/**
 * Executes ledger reconciliation within controlled test fixtures.
 */
export function testReconcileExecutionLedger(options = {}) {
  return _reconcileExecutionLedgerInternal(options);
}
