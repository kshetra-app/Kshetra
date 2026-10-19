# KSHETRA W021.5 — DIRECTIVE 104 EVIDENCE DISCREPANCY REGISTER
## Forensic Reconciliation of Report-versus-Repository Evidence Inconsistencies

> **Governance Authority:** Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)  
> **Directive Reference:** CTO Directive 105 Section 2  
> **Register ID:** `W021.5-DIRECTIVE-104-DISCREPANCY-REGISTER-V1.0`  
> **Audit Status:** **ALL 8 MAJOR DISCREPANCIES FORENSICALLY ANALYZED AND RECONCILED**  

---

## 1. Executive Summary

During the audit of **CTO Directive 104** deliverables, significant discrepancies were identified between:
1. **The submitted conversational report narrative and task table** (delivered in chat);
2. **The committed implementation report** (`reports/W021.5-CTO-DIRECTIVE-104-IMPLEMENTATION-REPORT.md`); and
3. **The committed machine-readable repository artifacts** (`reports/w021_5_execution_ledger.json`, `governance/specifications/w021_5_master_specification.json`, and historical origin `be4ba41`).

This register provides a line-by-line forensic disclosure of all 8 major discrepancy areas, identifying the exact origin of each discrepancy, explaining why it arose, and documenting the formal correction lineage without silently overwriting historical evidence.

---

## 2. Line-by-Line Discrepancy Matrix

| Discrepancy ID | Item / Entity | Category | Discrepancy Classification | Submitted / Narrative Value | Canonical Repository Value | Resolution Action |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **DISC-013** | Task Inventory (Stage B) | Task IDs & Titles | `PHANTOM_TASK_INJECTION` | Phantom task `W021.5-B1-05` (4.0%) inserted; 28-row table. | Exactly 4 tasks in Stage B; 27 tasks overall. Zero phantom tasks. | Reconciled to canonical 27 tasks; `W021.5-B1-05` rejected fail-closed. |
| **DISC-014** | Tasks B1-02, B1-03, B1-04, C-02, D-01, D-02, F-02 | Task Weights | `UNAPPROVED_TASK_WEIGHT_ALTERATIONS` | Mutated weights (e.g. B1-02: 4%, C-02: 3%, D-02: 4%, F-02: 4%). | Canonical approved weights: B1-02: 3%, C-02: 5%, D-02: 6%, F-02: 6%. | Reconciled all weights to historical origin `be4ba41` and master spec. |
| **DISC-015** | Submitted Chat Response Table | Task Weights | `WEIGHT_SUM_DEFICIT_IN_DELIVERY` | Chat table summed to 99.0% while declaring 100.0%. | Milestone approved total is exactly 100.000%. | Strict 100.000% weight conservation enforced at task, stage, and milestone. |
| **DISC-016** | Task `W021.5-I-02` Partition | Progress Accounting | `DOUBLE_COUNTING_ACROSS_PARTITION_CATEGORIES` | `W021.5-I-02` (3.0%) listed in Blocked AND in Unimplemented (6.0% total). | Non-overlapping: `blockedWeight: 3.0%`, `unimplementedWeight: 0.0%`. | Reconciled narrative to match ledger: `W021.5-I-02` is 100% Blocked. |
| **DISC-017** | Partial Tasks (B1-04, F-02, H-04, etc.) | Progress Accounting | `INCONSISTENT_PARTIAL_TASK_PARTITIONS` | Narrative partition drifted from machine-readable ledger accounting. | Single consistent source of truth in `reports/w021_5_execution_ledger.json`. | Programmatic synchronization enforced between ledger and reports. |
| **DISC-018** | Task Titles across 20+ tasks | Task IDs & Titles | `NON_CANONICAL_REPORT_TITLES` | Abbreviated or informal titles in report table. | Canonical titles from `CANONICAL_TASK_METADATA` and origin `be4ba41`. | Canonical titles restored and enforced across all artifacts. |
| **DISC-019** | Criteria IDs & Counts | Criteria Outcomes | `CRITERION_ENUMERATION_INACCURACY` | Fabricated `CRIT-B105-01/02` and paired placeholders for single-criterion tasks. | Exactly 50 criteria defined in `TASK_SPECIFICATIONS`. | Criteria sequences synchronized to match `TASK_SPECIFICATIONS` exactly. |
| **DISC-020** | Governing Document Coordinates | Source Provenance | `PROVENANCE_COORDINATE_DIMENSION_CONFLATION` | Conflated introduction commits with latest audited commits. | Explicit dual-coordinate binding: Introducing Commit and Latest Commit. | Audited both commits with blob SHAs, byte lengths, and SHA-256 digests. |

---

## 3. Detailed Root-Cause Analysis

### 3.1 Root Cause of Phantom Task DISC-013 & Weight Mutations DISC-014
In early drafting of Stage B documentation, an exploratory proposal was discussed to separate statutory delimitation geometry into its own task (`W021.5-B1-05`). However, this proposal was **never adopted** into the statutory baseline `be4ba41` or the master specification manifest. When compiling the Directive 104 markdown report, the author copied an obsolete draft table containing `W021.5-B1-05` (4.0%) and manually trimmed weights from `C-02` (5% -> 3%), `D-02` (6% -> 4%), and `F-02` (6% -> 4%) to keep the sum at 100%. Meanwhile, the machine-readable ledger (`reports/w021_5_execution_ledger.json`) was generated from code metadata (`CANONICAL_TASK_METADATA`) which correctly contained the 27 approved tasks.

### 3.2 Root Cause of Chat Response 99% Deficit DISC-015
When formatting the conversational response for CTO Directive 104, the assistant constructed a markdown table using an ad-hoc stage distribution:
- Stage A: 12% (3 tasks)
- Stage B: 20% (5 tasks: B-01..05)
- Stage C: 11% (3 tasks)
- Stage D: 11% (3 tasks)
- Stage E: 11% (3 tasks)
- Stage F: 10% (3 tasks: F-01..03)
- Stage G: 10% (3 tasks)
- Stage H: 7% (2 tasks: H-01..02)
- Stage I: 7% (2 tasks)
Sum: $12 + 20 + 11 + 11 + 11 + 10 + 10 + 7 + 7 = 99.0%$.
The assistant failed to perform arithmetic verification on the chat table before submitting, creating an overt 1.0% deficit against the declared 100.0%.

### 3.3 Root Cause of Double-Counting DISC-016
In Section 5.2 of the Directive 104 markdown report, the narrative list of blocked tasks included `W021.5-I-02` (3.0%), and the narrative list of unimplemented tasks *also* included `W021.5-I-02` (3.0%). This arose because the author conflated "blocked on CTO cutover preflight" with "remaining unimplemented work", violating the mutual exclusivity requirement of the 4-way partition. In the ledger JSON, `W021.5-I-02` had `blockedWeight: 3.0%` and `unimplementedWeight: 0.0%`.

---

## 4. Lineage Preservation & Non-Overwriting Policy

In strict accordance with Master Execution Framework Rule IV-001 and Directive 105 Section 2.4:
- Historical evidence files (`reports/W021.5-CTO-DIRECTIVE-104-IMPLEMENTATION-REPORT.md`, `reports/w021_5_execution_ledger.json`) are **preserved in Git history** and annotated with explicit reconciliation headers;
- This discrepancy register (`reports/w021_5_directive_104_discrepancy_register.json` and `.md`) permanently documents the defects, reasons, and corrections;
- The corrected accounting is independently verified by automated adversarial tests in Suite 26 (`tests/political-intelligence-directive-105.test.mjs`).
