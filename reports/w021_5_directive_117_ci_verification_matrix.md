# KSHETRA W021.5 — CTO DIRECTIVE 117
## Remote CI Verification Matrix & Coverage Assessment

**Starting Baseline Commit:** `fd8c21495594c822ad6eaf2fc2edb52f68818501` (Run ID: `39379946735`)  
**Delivered Verification Commit:** `77d6f4ca687878cf3e41a45f255a3fc0d5230bbe` (Run ID: `39386736474`)  
**Branch:** `master`  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Date:** 2026-10-20  

---

## 1. Executive Summary

In compliance with CTO Directive 117 Workstream A, GitHub Actions runs `39379946735` (baseline) and `39386736474` (delivered verification commit) were retrieved, audited, and reconciled.

### Delivered Verification Commit (`77d6f4ca687878cf3e41a45f255a3fc0d5230bbe` / Run `39386736474`):
- **Lint:** **SUCCESS** (4m 33s)
- **Typecheck:** **SUCCESS** (44s)
- **Governance & Drift Integrity:** **SUCCESS** (45s)
- **Test (Node 20):** 
  - **Suites:** 27 passed, 0 failed, 4 skipped (31 total)
  - **Tests:** **361 passed, 0 failed**, 52 skipped (413 total)
  - **Unit Assertion Pass Rate:** **100.0%** (361/361 unit tests passed)
  - **Coverage Gate:** FAILED (Statements 50.12% vs 90%, Branches 29.24% vs 82%, Lines 50.43% vs 90%, Functions 60.41% vs 90%)
- **Overall CI Status:** **FAILED** (exit code 1 strictly due to global Jest coverage thresholds).

Per Directive 117 Section 2 Rule 6, the overall CI gate is **not** claimed as green. Per Rule 8, coverage thresholds have not been lowered or diluted.

---

## 2. Job Execution Matrix Comparison

| Job Name | Baseline (`fd8c214` / `39379946735`) | Delivered Commit (`77d6f4c` / `39386736474`) | Notes |
| :--- | :---: | :---: | :--- |
| `lint` | SUCCESS (45s) | **SUCCESS** (273s) | ESLint & Prettier clean |
| `typecheck` | SUCCESS (43s) | **SUCCESS** (44s) | `tsc --noEmit` clean across all workspaces |
| `governance` | SUCCESS (58s) | **SUCCESS** (45s) | Evidence integrity & commit freshness verified |
| `test (20)` | FAILURE (132s) | **FAILURE** (118s) | 361 unit assertions passed, 0 failed; coverage threshold gate failed |

---

## 3. Test & Coverage Breakdown (Delivered Commit `77d6f4c`)

### A. Test Execution Totals
- **Test Suites:** 27 passed, 0 failed, 4 skipped, 31 total
- **Tests:** 361 passed, 0 failed, 52 skipped, 413 total
- **Unit Assertion Pass Rate:** **100.0%** (361/361 executed tests passed)
- **Zero Failures:** All 361 assertions passed. The new 5-case regression suite `apps/api/src/__tests__/dm-unread-count.test.ts` passed 5/5.

### B. Configured Coverage Thresholds vs Observed Actuals

| Metric | Observed Actual | Configured Threshold | Gate Status |
| :--- | :---: | :---: | :---: |
| **Statements** | 50.12% | 90.00% | **FAIL** |
| **Branches** | 29.24% | 82.00% | **FAIL** |
| **Lines** | 50.43% | 90.00% | **FAIL** |
| **Functions** | 60.41% | 90.00% | **FAIL** |

### C. Root Cause & Non-Dilution Invariant
The failure of the `test (20)` job was caused solely by Jest exiting with status code 1 after evaluating coverage thresholds against unit tests while 4 database integration suites remained skipped. In strict adherence to Directive 117 Rule 8 ("No reduction of configured coverage thresholds"), thresholds remain at 90/82/90/90.

---

## 4. Verification Coordinates

- **Remote Commit SHA:** `77d6f4ca687878cf3e41a45f255a3fc0d5230bbe`
- **Workflow Run ID:** `39386736474`
- **Workflow Run URL:** `https://github.com/kshetra-app/Kshetra/actions/runs/39386736474`
- **Overall Verdict:** `CI_GATE_FAILED_ON_COVERAGE` (Unit assertions 361/361 PASS, Coverage gate FAIL).
