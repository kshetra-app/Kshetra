#!/usr/bin/env node

/**
 * scripts/internal/reconcile_engine.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 108 & 109
 * Backward-Compatibility Test Engine Forwarder
 *
 * Architectural Note (CTO Directive 109):
 * In ECMAScript/Node.js, underscore prefixes and directory names like 'internal/'
 * are conventions of code organization, not language-level access controls or
 * runtime security boundaries.
 *
 * To avoid circular module dependencies and eliminate override-capable interfaces
 * from production scripts, the core verification logic resides in
 * scripts/reconcile_execution_ledger.mjs, and test fixture injection is
 * implemented in tests/helpers/ledger-test-adapter.mjs.
 *
 * This module forwards test verifiers strictly for backward compatibility.
 */

export {
  testVerifyHistoricalArtifactIntegrity as _verifyHistoricalArtifactIntegrityInternal,
  testVerifyAuthorityBoundary as _verifyAuthorityBoundaryInternal,
  testVerifyGoverningSpecificationProvenance as _verifyGoverningSpecificationProvenanceInternal,
  testReconcileExecutionLedger as _reconcileExecutionLedgerInternal,
} from '../../tests/helpers/ledger-test-adapter.mjs';
