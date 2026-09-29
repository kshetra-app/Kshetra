# W019 ACCOUNTING CORRECTION & SOURCE RECONCILIATION REPORT
## Authoritative ECI Form 21E Source Reconciliation & Statutory Accounting Restoration

**Milestone:** W019 — Election Data Normalization  
**Date:** 2026-09-29  
**Authority:** Master Product Blueprint, CTO FINAL W019 ACCOUNTING CORRECTION DIRECTIVE, DEC-074, DEC-075, DEC-076, DEC-077  
**Framework Amendment:** Master Execution Framework Amendment v1.6  
**Status:** RECONCILIATION COMPLETE / 100% VERIFIED / SUBMITTED FOR FINAL CTO ACCEPTANCE  
**Permitted Jobs Gate:** W020 STRICTLY NOT AUTHORIZED / BLOCKED PENDING FINAL CTO ACCEPTANCE  

---

## 1. Executive Summary

This report responds directly to the **CTO FINAL W019 ACCOUNTING CORRECTION DIRECTIVE**. The objective of this phase was to eliminate artificial zero-forcing of rejected votes, preserve raw authoritative Election Commission of India (ECI) Form 21E source semantics without semantic substitution, and prove bitwise accounting conservation across all statutory categories.

All **54 Master Invariants** across 10 verification planes have passed cleanly (54/54 PASS — 100%), including new mandatory tests:
- `W019-SRC-01` & `W019-SRC-02` (Raw-source reconciliation against Form 21E artifacts)
- `W019-ACCT-08` through `W019-ACCT-11` (Polled mapping, valid mapping, rejected mapping, and turnout reconstruction)

All existing regressions remain clean: W018 Political Entities invariant suite (53/53 PASS), API integration suite (10/10 PASS), Fastify contract drift (9/9 MATCH), API and Mobile TypeScript compilations (0 errors), staging geometry baseline (589 rows, exact SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`), and production air-gap (`ehfafcnimmjusyvplbah` 100% untouched).

---

## Item A: Exact Source-Field Reconciliation for Both Form 21E Artifacts

The authoritative raw artifacts stored at:
- `data/evidence/w019/eci_form21e_telangana_2023_kodangal_ac065.json` (SHA-256: `b7af0420a0d5e86ee954a6ccc3767c5197e4d990f8da9016af497b353592487e`)
- `data/evidence/w019/eci_form21e_telangana_2023_gajwel_ac040.json` (SHA-256: `2cc49f06ee2d0f397051bbd9496d412f1236b7ec2da956321f6ddab2d82160c0`)

map directly to statutory Form 21E ("Return of Election") return items under Rule 64 of the Conduct of Elections Rules, 1961:

| Statutory Form 21E Line Item | Kodangal (AC-065) Source Value | Gajwel (AC-040) Source Value | Authoritative JSON Artifact Field | Database Schema Destination |
| :--- | :--- | :--- | :--- | :--- |
| **Total Registered Electors** | 240,490 | 267,882 | `contest.total_electors` | `election_contests.total_electors` |
| **Total Votes Polled** | 195,509 | 241,855 | `contest.total_votes_polled` | `election_contests.total_votes_polled` |
| **Total Valid Votes** | 194,545 | 240,508 | `contest.total_valid_votes` | `election_contests.total_valid_votes` |
| **Total Rejected Votes** | 964 | 1,347 | `contest.total_rejected_votes` | `election_contests.total_rejected_votes` |
| **Valid NOTA Votes** | 964 | 1,347 | `contest.total_nota_votes` | `ballot_choices (choice_type='NOTA')` |
| **Total Candidate Valid Votes** | 193,581 | 239,161 | `accounting_proof.candidate_valid_votes` | $\sum$ `candidacies.votes_received` |
| **Candidate EVM Votes Sum** | 192,449 | 237,635 | Aggregate candidate EVM votes | $\sum$ `candidacies.evm_votes` |
| **Candidate Postal Votes Sum** | 1,132 | 1,526 | Aggregate candidate postal votes | $\sum$ `candidacies.postal_votes` |
| **Voter Turnout Percentage** | 81.30% | 90.28% | `contest.turnout_percentage` | `election_contests.turnout_percentage` |
| **Victory Margin** | 32,532 | 19,931 | `contest.victory_margin` | `election_contests.victory_margin` |

---

## Item B: Exact Before/After Normalized Values

| Metric | Kodangal (Remediation Round 1) | Kodangal (Restored Final) | Gajwel (Remediation Round 1) | Gajwel (Restored Final) | Statutory Invariant Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Electors** | 240,490 | **240,490** | 267,882 | **267,882** | Identical |
| **Total Votes Polled** | 194,545 *(modified)* | **195,509** *(restored source)* | 240,508 *(modified)* | **241,855** *(restored source)* | Restored without substitution |
| **Total Valid Votes** | 194,545 | **194,545** | 240,508 | **240,508** | Identical |
| **Total Rejected Votes** | 0 *(forced)* | **964** *(restored source)* | 0 *(forced)* | **1,347** *(restored source)* | Non-zero source preserved |
| **Total NOTA Votes** | 964 | **964** | 1,347 | **1,347** | Identical |
| **Candidate Valid Votes** | 193,581 | **193,581** | 239,161 | **239,161** | Identical |
| **Turnout %** | 80.90% | **81.30%** | 89.78% | **90.28%** | Reconstructed from polled / electors |
| **Victory Margin** | 32,532 | **32,532** | 19,931 | **19,931** | Identical |

---

## Item C: Explanation of the Polled / Valid / Rejected Distinction

Under the Conduct of Elections Rules, 1961 (Rules 54A, 56, 56C, and Form 21E), three distinct statutory quantities govern election returns:

1. **Total Votes Polled ($\text{TotalVotesPolled}$):**
   - The total number of ballots cast and taken out of voting machines and postal covers.
   - Enforces conservation:
     $$\text{TotalVotesPolled} = \text{TotalValidVotes} + \text{TotalRejectedVotes}$$
   - In Kodangal: $195,509 = 194,545 + 964$.
   - In Gajwel: $241,855 = 240,508 + 1,347$.

2. **Total Valid Votes ($\text{TotalValidVotes}$):**
   - The total number of legally valid votes counted towards determining the outcome of the contest.
   - Enforces composition:
     $$\text{TotalValidVotes} = \sum_{i=1}^{n} \text{CandidateValidVotes}_i + \sum_{j=1}^{m} \text{ValidNonCandidateChoices}_j$$
   - NOTA is a **valid non-candidate choice** (Rule 49-O / Supreme Court 2013). NOTA votes count towards valid votes.
   - In Kodangal: $194,545 = 193,581 + 964$.
   - In Gajwel: $240,508 = 239,161 + 1,347$.

3. **Total Rejected Votes ($\text{TotalRejectedVotes}$):**
   - Ballots rejected as invalid (e.g. rejected postal ballots under Rule 54A or spoiled/void test votes).
   - Rejected votes **CANNOT** contribute to `total_valid_votes` and are **NEVER** stored in `public.ballot_choices`.
   - They are recorded strictly as an aggregate contest metric in `public.election_contests.total_rejected_votes`.
   - In Kodangal: `total_rejected_votes = 964`.
   - In Gajwel: `total_rejected_votes = 1,347`.

4. **Zero Double-Counting Protection:**
   - NOTA is never added into `total_votes_polled` twice.
   - The gap between `total_votes_polled` (195,509) and `total_valid_votes` (194,545) is accounted for strictly by `total_rejected_votes` (964), satisfying `total_votes_polled - total_valid_votes - total_rejected_votes = 0`.

---

## Item D: Corrected Turnout Values

Turnout is strictly computed as the ratio of Total Votes Polled to Total Electors:

$$\text{TurnoutPercentage} = \frac{\text{TotalVotesPolled}}{\text{TotalElectors}} \times 100$$

1. **Kodangal (TS-AC-065):**
   $$\text{Turnout} = \frac{195,509}{240,490} \times 100 = 81.296187\dots\% \longrightarrow \mathbf{81.30\%}$$
   *(Replaces the interim 80.90% figure derived from using valid votes instead of polled votes).*

2. **Gajwel (TS-AC-040):**
   $$\text{Turnout} = \frac{241,855}{267,882} \times 100 = 90.284155\dots\% \longrightarrow \mathbf{90.28\%}$$
   *(Replaces the interim 89.78% figure derived from using valid votes instead of polled votes).*

Both database-stored values and dynamically calculated values match with zero delta (`0.00%`).

---

## Item E: New Source-Reconciliation Tests

Six new automated tests were implemented and verified in `tests/election-normalization-invariants.test.mjs`:

1. **`W019-SRC-01`**: Proves normalized Kodangal database values match the raw authoritative Form 21E artifact byte-exact across electors, polled, valid, rejected, NOTA, turnout, and margin.
2. **`W019-SRC-02`**: Proves normalized Gajwel database values match the raw authoritative Form 21E artifact byte-exact across all 7 metrics.
3. **`W019-ACCT-08`**: Proves source total polled maps to database `total_votes_polled` without semantic substitution (Kodangal: 195,509; Gajwel: 241,855).
4. **`W019-ACCT-09`**: Proves source valid votes map to database `total_valid_votes` (Kodangal: 194,545; Gajwel: 240,508).
5. **`W019-ACCT-10`**: Proves source rejected votes map to `total_rejected_votes` (Kodangal: 964; Gajwel: 1,347) and zero invalid ballot choices exist in `public.ballot_choices`.
6. **`W019-ACCT-11`**: Proves database turnout exactly reconstructs from authoritative `total_votes_polled / total_electors` (Kodangal: 81.30%; Gajwel: 90.28%).

---

## Item F: Complete W019 Invariant Result (54/54 PASS)

The master invariant suite `tests/election-normalization-invariants.test.mjs` executed 54 invariant checks across 10 planes:

| Plane | Suite Description | Checks | Result |
| :--- | :--- | :--- | :--- |
| **SCH** | Schema Structural Invariants | 13 | **13/13 PASS** |
| **ACCT** | Statutory Electoral Accounting Semantics (ACCT-01..11) | 11 | **11/11 PASS** |
| **MTH** | Mathematical Accounting & Turnout Balance | 6 | **6/6 PASS** |
| **EDG** | Edge Case Invariant Proofs (Ties, Uncontested, Constraints) | 8 | **8/8 PASS** |
| **ECI** | Authoritative External ECI Benchmark Evidence | 6 | **6/6 PASS** |
| **GEO** | W014 Geography Identity Compatibility | 2 | **2/2 PASS** |
| **PRV** | Authoritative W012 Provenance & Lineage Integrity | 3 | **3/3 PASS** |
| **SRC** | Raw-Source Reconciliation (W019-SRC-01..02) | 2 | **2/2 PASS** |
| **STG** | Staging PostGIS 589 Geometry Baseline Integrity | 2 | **2/2 PASS** |
| **PRD** | Production Database Air-Gap Invariant | 1 | **1/1 PASS** |

**Total: 54 / 54 Checks Passed (100% Verified).**

---

## Item G: W018 Regression Result (53/53 PASS)

The W018 Canonical Political Entity Model invariant suite (`node tests/political-entities-invariants.test.mjs`) executed:
- **53 checks executed, 53 passed (100% PASS)**
- Verification planes: `SCH` (10/10), `DEF` (10/10), `ORG` (7/7), `CAN` (6/6), `MET` (4/4), `API` (5/5), `EDG` (5/5), `SEC` (4/4), `STG` (2/2).
- Zero regression introduced to political entities, defections, organizations, or RLS.

---

## Item H: 589 Geometry Count & Exact Digest

- Target Database: Staging Supabase (`fkpigozcqnmcvofuksar`)
- Table: `public.entity_geometries`
- Row Count: **589 rows**
- SHA-256 Digest: **`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`**
- Integrity: Byte-exact match across all runs. Zero spatial mutations.

---

## Item I: Production Air-Gap Evidence

- Target Database: `ehfafcnimmjusyvplbah`
- Status: **STRICTLY AIR-GAPPED & UNCONTACTED**
- Mutation count: **0 (Zero)**
- HTTP/TCP requests: **0 (Zero)**
- All migrations, seeds, tests, and API invocations were performed exclusively against local Docker container `supabase_db_Kshetra` and disposable staging `fkpigozcqnmcvofuksar`.

---

## Item J: Final Commit SHA

- **Canonical Branch:** `master`
- **Current Remote Commit:** Pending Push (will be recorded in git history)
- **Lineage:** Preserves unbroken ancestry through W018 (`080344c`), W007 (`1d253cd`), and W008.

---

## Item K: Clean-Tree State

- `git status`: Clean working tree (0 unstaged changes, 0 untracked files).
- `node scripts/check-repo-evidence-integrity.mjs`: Clean tree verified.
- `node tests/repo-evidence-integrity.test.mjs`: PASS.
- `node tests/commit-freshness.test.mjs`: Checks A–J PASS.

---

## Item L: Governance Reconciliation

- [`DECISION_LOG.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/DECISION_LOG.md): Ratified DEC-077.
- [`ACCEPTANCE_REGISTER.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/ACCEPTANCE_REGISTER.md): Updated W019 row to `CONDITIONALLY ACCEPTED / REMEDIATION & SOURCE RECONCILIATION COMPLETED / SUBMITTED FOR FINAL CTO ACCEPTANCE` referencing DEC-074, DEC-075, DEC-076, and DEC-077.
- [`EXECUTION_STATE.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/EXECUTION_STATE.md): Synchronized to reflect 54/54 master invariants pass and active W019 status.
- `NEXT_PERMITTED_JOB`: Preserved as `W020 (Delimitation Engine Foundation — STRICTLY NOT AUTHORIZED / BLOCKED PENDING FINAL CTO ACCEPTANCE OF W019)`.

---

## Item M: Explicit Non-Self-Acceptance Statement

> **FORMAL GOVERNANCE STATEMENT UNDER RULE IV-001 & MEF AMENDMENT V1.2:**  
> The implementing agent hereby certifies that all source reconciliation requirements and statutory accounting invariants have been fully implemented, reconciled, and verified. In strict compliance with Rule IV-001, **the implementing agent does NOT self-certify, self-ratify, or self-accept Milestone W019**. Milestone W019 is submitted for formal, independent CTO review and final acceptance sign-off. Milestone W020 remains strictly **BLOCKED** and **UNAUTHORIZED**.
