# KSHETRA W021.5 — CTO DIRECTIVE 117
## Remote CI Verification Matrix & Coverage Assessment

**Evaluated Commit:** `fd8c21495594c822ad6eaf2fc2edb52f68818501`  
**GitHub Actions Run ID:** `39379946735`  
**Branch:** `master`  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Date:** 2026-10-20  

---

## 1. Executive Summary

In compliance with CTO Directive 117 Workstream A, GitHub Actions run `39379946735` for baseline commit `fd8c21495594c822ad6eaf2fc2edb52f68818501` was retrieved, audited, and reconciled.

- **Lint:** PASS (45s)
- **Typecheck:** PASS (43s)
- **Governance & Drift Integrity:** PASS (58s)
- **Test (Node 20):** 
  - **Suites:** 26 passed, 0 failed, 4 skipped (30 total)
  - **Tests:** 356 passed, 0 failed, 52 skipped (408 total)
  - **Coverage Gate:** FAILED (Statements 49.89% vs 90%, Branches 29.07% vs 82%, Lines 50.21% vs 90%, Functions 60.25% vs 90%)
- **Overall CI Status:** **FAILED** (exit code 1 strictly due to global Jest coverage thresholds).

Per Directive 117 Section 2 Rule 6, the overall CI gate is **not** claimed as green. Per Rule 8, coverage thresholds have not been lowered or diluted.

---

## 2. Job Execution Matrix

| Job Name | Status | Conclusion | Duration | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `lint` | Completed | SUCCESS | 45s | ESLint and Prettier across all packages |
| `typecheck` | Completed | SUCCESS | 43s | `tsc --noEmit` on shared, api, and mobile |
| `governance` | Completed | SUCCESS | 58s | Evidence integrity and commit freshness |
| `test (20)` | Completed | **FAILURE** | 132s | 356 passed assertions, 0 failed assertions, failed coverage gate |

---

## 3. Test & Coverage Breakdown

### A. Test Execution Totals
- **Test Suites:** 26 passed, 0 failed, 4 skipped, 30 total
- **Tests:** 356 passed, 0 failed, 52 skipped, 408 total
- **Unit Assertion Pass Rate:** **100.0%** (356/356 executed tests passed)
- **Zero Failures:** The assertion failure from Directive 115 (`moderation.test.ts:374`) was resolved in commit `fd8c214` and remained 100% passing in CI run `39379946735`.

### B. Configured Coverage Thresholds vs Observed Actuals

| Metric | Observed Actual | Configured Threshold | Gate Status |
| :--- | :---: | :---: | :---: |
| **Statements** | 49.89% | 90.00% | **FAIL** |
| **Branches** | 29.07% | 82.00% | **FAIL** |
| **Lines** | 50.21% | 90.00% | **FAIL** |
| **Functions** | 60.25% | 90.00% | **FAIL** |

### C. Root Cause & Non-Dilution Invariant
The failure of the `test (20)` job was caused solely by Jest exiting with status code 1 after evaluating coverage thresholds against unit tests while 4 database integration suites remained skipped. In strict adherence to Directive 117 Rule 8 ("No reduction of configured coverage thresholds"), thresholds remain at 90/82/90/90.

---

## 4. Verification Coordinates

- **Remote Commit SHA:** `fd8c21495594c822ad6eaf2fc2edb52f68818501`
- **Workflow Run ID:** `39379946735`
- **Workflow Run URL:** `https://github.com/kshetra-app/Kshetra/actions/runs/39379946735`
- **Overall Verdict:** `CI_GATE_FAILED_ON_COVERAGE` (Unit assertions 356/356 PASS, Coverage gate FAIL).
