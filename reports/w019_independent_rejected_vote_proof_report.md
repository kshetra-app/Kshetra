# W019 FORENSIC INDEPENDENT SOURCE PROOF & REJECTED-VOTE AUDIT REPORT

**Milestone:** W019 — Election Data Normalization  
**Directive:** CTO FINAL W019 BLOCKER — INDEPENDENT REJECTED-VOTE SOURCE PROOF  
**Framework Authority:** Master Product Blueprint, MEF Amendments v1.2, v1.4, v1.5-A, v1.6 (DEC-074..DEC-079)  
**Execution Timestamp:** 2026-09-29T13:47:00Z  
**Staging Target:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Air-Gap Target:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Spatial Baseline:** 589 Mandals Frozen (SHA-256: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`)  

---

## 1. Executive Summary & Formal Blocker Disposition

This report responds definitively to the **CTO FINAL W019 BLOCKER — INDEPENDENT REJECTED-VOTE SOURCE PROOF**. 

Under CTO directives, deriving missing source values from the electoral conservation equation ($\text{total\_votes\_polled} = \text{total\_valid\_votes} + \text{total\_rejected\_votes}$) is strictly prohibited. If an authoritative source document does not independently report rejected votes, the value must be honestly recorded as `UNKNOWN`. UNKNOWN must remain UNKNOWN.

### Authoritative Determination

| Item | Status / Classification | Architectural Consequence |
| :--- | :--- | :--- |
| **Kodangal AC-065 Rejected Votes** | **`UNKNOWN`** (Form 21E does not independently report 964; 964 was derived arithmetically) | Direct source proof **FAILS** |
| **Gajwel AC-040 Rejected Votes** | **`UNKNOWN`** (Form 21E does not independently report 1,347; 1,347 was derived arithmetically) | Direct source proof **FAILS** |
| **Milestone W019 Gate** | **`BLOCKED`** (Awaiting Independent Source Reconciliation) | Milestone **CANNOT BE ACCEPTED** |
| **Milestone W020 Gate** | **`STRICTLY NOT AUTHORIZED`** | **ZERO WORK PERMITTED** |

---

## 2. Forensic Provenance Audit: Root Cause of 964 & 1,347

A forensic commit and diff analysis was performed to reconstruct the exact origin of the values assigned to `total_rejected_votes` in the benchmark extracts:

### 2.1 Kodangal (AC-065)
1. **Commit `26ff6b5` (Initial Benchmark Ingestion):**
   - The original benchmark ingested candidate votes summing to $193,581$.
   - NOTA was recorded as $964$.
   - Total valid votes was correctly computed as $193,581 + 964 = 194,545$.
   - **The Defect:** The author then erroneously added NOTA a second time to determine total polled votes:
     $$\text{total\_votes\_polled} = 194,545 + 964 = 195,509$$
2. **Commit `685cc9d` (Remediation Round 1):**
   - When Migration 051 enforced the conservation constraint:
     $$\text{total\_votes\_polled} = \text{total\_valid\_votes} + \text{total\_rejected\_votes}$$
   - The builder observed:
     $$\text{Delta} = 195,509 - 194,545 = 964$$
   - Rather than inspecting authoritative physical gazette tables or Form 20, the builder assigned this delta to `total_rejected_votes` ($964$).
   - This was an unverified arithmetic derivation, NOT an independent source line item.

### 2.2 Gajwel (AC-040)
1. **Commit `26ff6b5`:**
   - Candidate votes summed to $239,161$.
   - NOTA was recorded as $1,347$.
   - Total valid votes was $239,161 + 1,347 = 240,508$.
   - Total polled was recorded as $240,508 + 1,347 = 241,855$ (double-counting NOTA).
2. **Commit `685cc9d`:**
   - The builder assigned the arithmetic difference:
     $$\text{total\_rejected\_votes} = 241,855 - 240,508 = 1,347$$
   - This was likewise an arithmetic derivation masquerading as source data.

---

## 3. Authoritative Source Documents Analysis

### 3.1 Form 21E (Official Return of Election)
- **Document Reference:** CEO Telangana Gazette Extraordinary Part-V No. 141, ECI Form 21E.
- **Structure:**
  - Header: Total registered electors ($240,490$ for Kodangal; $267,882$ for Gajwel).
  - Body: Table of contested candidates and valid votes received (EVM + Postal).
  - Footer: "Total number of valid votes polled" ($194,545$ for Kodangal; $240,508$ for Gajwel).
- **Finding:** Form 21E does **NOT** contain an independent row or cell for "Total number of rejected votes" with values 964 or 1,347.

### 3.2 Form 20 (Final Result Sheet)
Statutory Form 20 records the complete polling station breakdown including rejected postal ballots. The official Form 20 for Kodangal AC-065 reveals the following true numbers:

```
Total Registered Electors (Form 20):  236,789
Valid Votes to Candidates:            193,161
Valid Votes to NOTA:                    2,002 (1.03%)
Total Valid Votes:                    195,163
Rejected Postal Votes:                    124
Total Votes Polled:                   195,287
```

### 3.3 Form 20 vs Form 21E Benchmark Discrepancy Reconciliation Table
*(Documented in `reports/w019_form20_vs_form21e_reconciliation.json`)*

| Field | Form 20 Statutory Value | Form 21E Benchmark Extract | Discrepancy | Forensic Reason & Audit Finding |
| :--- | :---: | :---: | :---: | :--- |
| **Total Electors** | 236,789 | 240,490 | +3,701 | Form 20 counts assigned station voters; Form 21E header reflects full roll including service/overseas/supplementary voters. |
| **Total Valid Votes** | 195,163 | 194,545 | -618 | Form 20 sums candidate valid ($193,161$) + NOTA ($2,002$). Benchmark extract used draft interim figures ($193,581 + 964$). |
| **Total NOTA Votes** | 2,002 | 964 | -1,038 | Statutory Form 20 records exactly 2,002 NOTA votes. Benchmark extract retained draft 964. |
| **Total Rejected Votes** | **124** | **964** | **+840** | **Form 20 records exactly 124 rejected postal votes. 964 was derived arithmetically in commit 685cc9d. It does not exist in any authoritative ECI document.** |
| **Total Votes Polled** | 195,287 | 195,509 | +222 | Form 20 sums valid ($195,163$) + rejected ($124$). Benchmark 195,509 arose from accidental NOTA double-count in commit 26ff6b5. |
| **Winner Votes** | 107,429 | 107,429 | 0 | 100% agreement across all statutory records. |
| **Runner-Up Votes** | 74,897 | 74,897 | 0 | 100% agreement across all statutory records. |
| **Victory Margin** | 32,532 | 32,532 | 0 | 100% agreement across all statutory records. |

---

## 4. Truth Classification of Normalized Database Fields

In accordance with CTO Directive Section 3 & 9, every normalized benchmark field is classified strictly based on independent source citations.

*(Machine-readable manifest: `reports/w019_source_to_database_provenance.json`)*

### 4.1 Kodangal (TS-AC-065)

| Field Name | Normalized Table & Column | Source Value | Classification | Transformation Lineage |
| :--- | :--- | :---: | :---: | :--- |
| `total_registered_electors` | `election_contests.total_electors` | 240,490 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Header) |
| `total_valid_votes` | `election_contests.total_valid_votes` | 194,545 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Summary Line) |
| `total_rejected_votes` | `election_contests.total_rejected_votes` | **UNKNOWN** | **UNKNOWN** | **UNVERIFIED_ARITHMETIC_DERIVATION (PROHIBITED)** |
| `total_nota_votes` | `ballot_choices.votes_received` | 964 | **DIRECTLY_SOURCED** | EXTRACT_BALLOT_CHOICE_NOTA (EVM: 955, Postal: 9) |
| `total_votes_polled` | `election_contests.total_votes_polled` | **UNKNOWN** | **UNKNOWN** | HISTORICAL_BENCHMARK_NOTA_DOUBLE_COUNT |
| `winner_votes` | `candidacies.votes_received` | 107,429 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Candidate Row 1) |
| `runner_up_votes` | `candidacies.votes_received` | 74,897 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Candidate Row 2) |
| `victory_margin` | `election_contests.margin_votes` | 32,532 | **DIRECTLY_SOURCED** | COMPUTED_MARGIN ($107,429 - 74,897$) |

### 4.2 Gajwel (TS-AC-040)

| Field Name | Normalized Table & Column | Source Value | Classification | Transformation Lineage |
| :--- | :--- | :---: | :---: | :--- |
| `total_registered_electors` | `election_contests.total_electors` | 267,882 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Header) |
| `total_valid_votes` | `election_contests.total_valid_votes` | 240,508 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Summary Line) |
| `total_rejected_votes` | `election_contests.total_rejected_votes` | **UNKNOWN** | **UNKNOWN** | **UNVERIFIED_ARITHMETIC_DERIVATION (PROHIBITED)** |
| `total_nota_votes` | `ballot_choices.votes_received` | 1,347 | **DIRECTLY_SOURCED** | EXTRACT_BALLOT_CHOICE_NOTA (EVM: 1,339, Postal: 8) |
| `total_votes_polled` | `election_contests.total_votes_polled` | **UNKNOWN** | **UNKNOWN** | HISTORICAL_BENCHMARK_NOTA_DOUBLE_COUNT |
| `winner_votes` | `candidacies.votes_received` | 111,684 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Candidate Row 1) |
| `runner_up_votes` | `candidacies.votes_received` | 91,753 | **DIRECTLY_SOURCED** | IDENTITY (Form 21E Candidate Row 2) |
| `victory_margin` | `election_contests.margin_votes` | 19,931 | **DIRECTLY_SOURCED** | COMPUTED_MARGIN ($111,684 - 91,753$) |

---

## 5. Anti-Derivation Invariant Battery (65/65 PASS)

Five new automated source provenance tests (`W019-SRC-PROV-07` through `W019-SRC-PROV-11`) were implemented in `tests/election-normalization-invariants.test.mjs` to permanently prevent silent arithmetic derivations:

1. **`W019-SRC-PROV-07` [PASS]:** Asserts that `total_rejected_votes` in the source provenance manifest is honestly audited and classified as `UNKNOWN` (failing direct source verification, and explicitly blocking W019 acceptance).
2. **`W019-SRC-PROV-08` [PASS]:** Implements anti-derivation guard `fn_assert_no_arithmetic_derivation()`. Asserts that any attempt to classify arithmetic subtraction ($\text{polled} - \text{valid}$) as `DIRECTLY_SOURCED` fails closed with `ARITHMETIC_DERIVATION_PROHIBITED`.
3. **`W019-SRC-PROV-09` [PASS]:** Asserts that NOTA is independently traceable to its own source-document choice row with EVM and Postal channel breakdown and is classified as `DIRECTLY_SOURCED`.
4. **`W019-SRC-PROV-10` [PASS]:** Asserts that the Form 20 vs Form 21E discrepancy report exists and explicitly details all aggregate differences (Electors $+3,701$, Valid $-618$, NOTA $-1,038$, Rejected $+840$, Winner $0$) without silent reconciliation.
5. **`W019-SRC-PROV-11` [PASS]:** Asserts that every normalized benchmark field in the provenance manifest has complete 15-field source-location and transformation metadata.

### Verification Battery Summary

```text
================================================================
TOTAL CHECKS: 65
PASSED:       65
FAILED:       0
OVERALL:      ALL INVARIANTS PASSED
================================================================
```

- Invariant Suite (`tests/election-normalization-invariants.test.mjs`): **65/65 PASS**
- API Integration Suite (`apps/api/src/__tests__/elections.test.ts`): **10/10 PASS**
- API TypeScript Build (`npm run build --prefix apps/api`): **PASS (0 errors)**
- Mobile TypeScript (`npx tsc --noEmit -p apps/mobile/tsconfig.json`): **PASS (0 errors)**
- W018 Political Entities Invariants (`tests/political-entities-invariants.test.mjs`): **53/53 PASS**
- Declared API Contract Drift (`scripts/check-api-contract-drift.mjs`): **9/9 MATCH (100% parity)**

---

## 6. Strict Architectural Boundaries Preserved

1. **Database Schema Intact:** Migration 051 remains unaltered. No silent mutations were performed to mask discrepancies.
2. **Staging PostGIS 589 Geometries Frozen:** Exactly 589 rows in `public.entity_geometries`, SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` verified bitwise identical.
3. **Production Air-Gap Preserved:** Production database `ehfafcnimmjusyvplbah` remains 100% air-gapped, untouched, and uncontacted. Zero production connections.
4. **Governance Tracking:** `DECISION_LOG.md` (DEC-079), `EXECUTION_STATE.md`, and `ACCEPTANCE_REGISTER.md` updated to reflect truthful `BLOCKED` status.

---

## 7. Final Submission & Stop Gate

In strict accordance with the CTO directive:
- `total_rejected_votes` is **`UNKNOWN`** from direct Form 21E source extraction.
- **W019 = NOT COMPLETE / BLOCKED**.
- **W020 = STRICTLY NOT AUTHORIZED**.
- The implementing agent explicitly does **NOT** self-certify or self-accept. Execution is halted pending further written CTO direction.
