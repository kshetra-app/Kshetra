# KSHETRA W021.5 — CTO DIRECTIVE 109 DISCREPANCY REGISTER

**Milestone:** W021.5  
**Directive Reference:** CTO Directive 110  
**Generated At:** 2026-10-19T12:15:00.000Z  
**Governance:** Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)  
**Schema:** `https://kshetra.dev/schemas/discrepancy-register.v1.json`  

---

## 1. Executive Summary

This discrepancy register records the forensic analysis, lineage tracking, and engineering remediation for all defects and architectural boundary discrepancies identified during the independent review of **CTO Directive 109**.

Across all audited areas, **3 total discrepancies** (`DISC-038` through `DISC-040`) were identified, cataloged, and resolved.

| Register ID | Discrepancies Audited | Discrepancies Resolved | Open / Blocked | Audit Status |
| :--- | :---: | :---: | :---: | :--- |
| `W021.5-DIRECTIVE-109-DISCREPANCY-REGISTER-V1.0` | **3** | **3** | **0** | `ALL_DISCREPANCIES_FORENSICALLY_ANALYZED_AND_RECONCILED` |

---

## 2. Discrepancy Reconciliation Matrix

| ID | Item Key / Name | Category | Prior Defect State (Directive 109) | Canonical Remediated State (Directive 110) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`DISC-038`** | `VERIFIER_ENGINE:directInvocationPayloadBypass`<br>*(Direct-Invocation Bypass)* | `unprotected_payload_exports` | `scripts/reconcile_execution_ledger.mjs` exported `verifyHistoricalArtifactIntegrityPayload`, `verifyAuthorityBoundaryPayload`, `verifyGoverningSpecificationProvenancePayload`, and `reconcileExecutionLedgerCore` directly without `assertNoCallerTrustOverrides` guards, enabling direct invocation override bypasses. | All 4 payload functions completely removed from the production verifier's export surface (`undefined` on module namespace). Implementation moved to `scripts/internal/reconcile_engine.mjs`. Public verifiers strictly guard inputs and reject all overrides. | **RESOLVED** |
| **`DISC-039`** | `MODULE_ARCHITECTURE:sharedEngineDAGSeparation`<br>*(Inverted Module Dependency)* | `dependency_graph_acyclicity` | `scripts/internal/reconcile_engine.mjs` was treated as an ad-hoc backward-compatibility forwarder importing from `tests/helpers/ledger-test-adapter.mjs`, inverting the architectural dependency hierarchy. | Strict top-down Directed Acyclic Graph (DAG) established: `scripts/internal/reconcile_engine.mjs` is Layer 0 shared base engine (0 repo imports); `reconcile_execution_ledger.mjs` and `ledger-test-adapter.mjs` are Layer 1 consumers. | **RESOLVED** |
| **`DISC-040`** | `TEST_SUITE:suite30AcyclicityCheckRefinement`<br>*(Heuristic Acyclicity False Positive)* | `test_harness_precision` | Suite 30 Test 1.3 checked for circularity using string search asserting `scripts/reconcile_execution_ledger.mjs` must not contain `"from './internal/reconcile_engine.mjs'"`, conflating importing an internal engine with a circular dependency. | Test 1.3 updated to perform true AST/regex import analysis: asserting production verifier does not import test adapter, internal engine does not import production verifier or adapter, and test adapter does not import production verifier. | **RESOLVED** |

---

## 3. Forensic Details

### DISC-038: Direct-Invocation Bypass via Unprotected Payload Exports
- **Category:** `unprotected_payload_exports`
- **Affected Entity:** `scripts/reconcile_execution_ledger.mjs`
- **Root Cause:** In Directive 109, to eliminate circular dependency between `reconcile_execution_ledger.mjs` and `reconcile_engine.mjs`, the root payload functions were moved to `reconcile_execution_ledger.mjs` and exported so that `tests/helpers/ledger-test-adapter.mjs` could import them. Exporting them made them accessible to any in-process caller importing `scripts/reconcile_execution_ledger.mjs`, bypassing the `assertNoCallerTrustOverrides` guards enforced by the public verifier wrappers.
- **Remediation Action:**
  1. Removed `export` from all 4 payload functions in `scripts/reconcile_execution_ledger.mjs`.
  2. Moved payload algorithms into `scripts/internal/reconcile_engine.mjs`.
  3. Production verifier exports ONLY the 4 guarded entry points (`verifyHistoricalArtifactIntegrity`, `verifyAuthorityBoundary`, `verifyGoverningSpecificationProvenance`, `reconcileExecutionLedger`).
  4. Verified in Suite 31 Tests 1.1–1.6 and Test 3.6 that all 4 payload functions are `undefined` on the production module and that direct invocation bypass is impossible.

### DISC-039: Inverted Module Dependency Structure
- **Category:** `dependency_graph_acyclicity`
- **Affected Entity:** `scripts/internal/reconcile_engine.mjs`, `scripts/reconcile_execution_ledger.mjs`, `tests/helpers/ledger-test-adapter.mjs`
- **Root Cause:** In Directive 109, `reconcile_engine.mjs` re-exported test functions from `tests/helpers/ledger-test-adapter.mjs`. This inverted the dependency direction, making a production script folder dependent on a test helper file.
- **Remediation Action:**
  1. Re-established canonical DAG hierarchy: `scripts/internal/reconcile_engine.mjs` (Layer 0, zero internal imports) $\leftarrow$ `scripts/reconcile_execution_ledger.mjs` (Layer 1) & `tests/helpers/ledger-test-adapter.mjs` (Layer 1).
  2. Tested clean process loading of all three modules individually and simultaneously in Suite 31 Tests 4.1–4.4.
  3. Verified static acyclicity in Suite 31 Test 4.5.

### DISC-040: Heuristic Acyclicity Check False Positive in Suite 30 Test 1.3
- **Category:** `test_harness_precision`
- **Affected Entity:** `tests/political-intelligence-directive-109.test.mjs` (Test 1.3)
- **Root Cause:** Test 1.3 in Suite 30 contained a hardcoded check asserting `!fileContent.includes("from './internal/reconcile_engine.mjs'")`. This naive check assumed that any import of `reconcile_engine.mjs` was circular, which was only true when `reconcile_engine.mjs` was re-exporting from `ledger-test-adapter.mjs`.
- **Remediation Action:**
  1. Refined Test 1.3 to check for actual circular imports via regex statement analysis.
  2. Verified that all 30 tests in Suite 30 pass cleanly alongside all 35 tests in Suite 31.

---

## 4. Architectural Certification & Governance Invariants

Under Master Execution Framework Amendment v1.2 / Rule IV-001:
1. **Rule IV-001 Non-Self-Acceptance:** Formal milestone acceptance is strictly **0.0% (`UNACCEPTED`)**.
2. **Production Air-Gap:** Live database execution is strictly **0.0% (`AIR_GAPPED_UNEXECUTED`)**.
3. **Repository Earned Completion:** Strictly **61.500% repo-verified earned**, 38.500% unearned/blocked (Total: 100.000%).
4. **Baseline Immutability:** 68 SQL migrations (`0ea572d`) and 31 MLA seed profiles (`fb408ce`) preserved byte-for-byte.
