# KSHETRA W021.5 — CTO DIRECTIVE 117
## Marathon Planning Reconciliation & Incremental Target Audit

**Directive:** CTO Directive 117 (Workstream F)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Stage Boundary:** Strictly Planning Only. Stages C–I are **NOT** authorized.  
**Date:** 2026-10-20  

---

## 1. Baseline Accounting & Marathon Target

Per the reconciled canonical execution ledger:
- **Total Milestone Weight:** 100.0%
- **Repository-Verified Earned Baseline:** **61.5%**
- **Unearned Portion:** **38.5%**
- **Marathon Completion Target (25% of unearned):** **9.625 percentage points**

### Zero Double-Counting Rule
Stage B earned weight (10.5%) is **already included** within the 61.5% starting baseline. Progress towards the 9.625 target must come solely from unearned criteria.

---

## 2. Candidate Task Evaluation Matrix

| Candidate Task | Stage | Allocated Weight | Already Earned | Remaining Unearned | Offline Repo Work | DB Pending Work | Blocked Work | Dependencies |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`W021.5-F-02`** | F | 6.0% | 1.5% | **4.5%** | 1.5% | 3.0% | 0.0% | Stage B review, prior stage gates |
| **`W021.5-H-04`** | H | 2.0% | 1.0% | **1.0%** | 1.0% | 0.0% | 0.0% | Fastify strangler routes (Stage G) |
| **`W021.5-C-02`** | C | 5.0% | 2.5% | **2.5%** | 0.0% | 2.5% | 0.0% | Stage B review, Staging DB authorization |
| **`W021.5-D-02`** | D | 6.0% | 3.0% | **3.0%** | 0.0% | 3.0% | 0.0% | Stage C review, Staging DB authorization |
| **`W021.5-D-03`** | D | 4.0% | 0.0% | **4.0%** | 0.0% | 0.0% | 4.0% | Completion of D-02 staging ingestion |
| **`W021.5-E-01`** | E | 4.0% | 2.0% | **2.0%** | 0.0% | 2.0% | 0.0% | Stage D review, Staging DB authorization |
| **TOTALS** | — | **27.0%** | **10.0%** | **17.0%** | **2.5%** | **10.5%** | **4.0%** | — |

---

## 3. Analysis & Marathon Feasibility

1. **Capacity vs Target:** The candidate pool contains **17.0%** of unearned weight, substantially exceeding the required **9.625%** target.
2. **Work Distribution:**
   - **Pure Offline Repository Work:** 2.5% (`F-02` 1.5% + `H-04` 1.0%).
   - **Database Execution Work:** 10.5% (`C-02` 2.5% + `D-02` 3.0% + `E-01` 2.0% + `F-02` 3.0%).
   - **Blocked Work:** 4.0% (`D-03` 4.0%).
3. **Execution Boundary Invariant:** In accordance with Directive 117 Section 7, **this reconciliation is planning only**. Zero execution has been performed on Stages C through I. Execution remains stopped at the Stage B boundary.
