# W020 PLAN REVISION RECONCILIATION: REV-1.2 → REV-1.3
**Milestone:** W020 (Delimitation Engine Foundation)  
**Date:** 2026-09-30  
**Authority:** CTO Directive — W020 Final Legal Source Correction  
**Reference Document:** [PLAN-W020-MASTER-REV-1.3.md](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/PLAN-W020-MASTER-REV-1.3.md)  
**Status:** DRAFT / SUBMITTED FOR CTO RATIFICATION (GATED)  
**Implementation Authorization:** **STRICTLY NOT AUTHORIZED (PLANNING & PREFLIGHT SPECIFICATION ONLY)**  

---

## 1. Executive Summary of Revisions

In response to the **CTO DIRECTIVE — W020 FINAL LEGAL SOURCE CORRECTION**, Master Plan REV-1.2 has been amended to correct a material authoritative-source identification defect and date conflation regarding the 2015 Removal of Difficulties Order.

This reconciliation document enumerates every statutory identifier, legal provision, date disambiguation, evidence schema definition, and test-suite addition incorporated into **Revision 1.3**.

```text
================================================================================
REVISION SUMMARY MATRIX: REV-1.2 → REV-1.3
================================================================================
#  AREA                       REV-1.2 DEFICIENCY                  REV-1.3 RECONCILIATION
--------------------------------------------------------------------------------
1  2015 Statutory Identifier  Mislabeled as S.O. 1416(E)          G.S.R. 311(E) (S.O. 1416(E) strictly purged)
2  2015 Order & Promulgation  Mislabeled as 28 May 2015           23 April 2015 (New Delhi)
3  2015 Commencement Date    Mislabeled as deemed 29 May 2014    "comes into force at once" (23 April 2015)
4  Date Disambiguation        Conflated Ordinance 4 of 2014       29 May 2014 isolated as Ordinance 4 of 2014
5  Enabling Provision         Generic Section 108 of APRA         Section 108(3) of APRA 2014 (Act No. 6 of 2014)
6  2015 Legal Effect          Polavaram territory transfer        Amends Second Schedule to APRA 2014; preserves
                                                                  exact mandals, village exceptions & AC extents
7  2018 Statutory Instrument  Notification 282/AP/2018(DEL)       Preserved verbatim (ECI, 22 September 2018)
8  Evidence-Graph Schema      Partially normalized table          Fully normalized 10-field separation
9  Semantic Test Suite        24 tests                            28 tests (added LEGAL-08, 09, 10, 11)
10 Implementation Gate        G0–G3 ratified; G4 not authorized   G0–G3 ratified subject to REV-1.3; G4 STRICTLY GATED
================================================================================
```

---

## 2. Detailed Item-by-Item Reconciliation

### Correction 1: Authoritative Identifier for 2015 Removal of Difficulties Order
* **REV-1.2 Finding:** REV-1.2 erroneously identified the instrument as `S.O. 1416(E)`.
* **REV-1.3 Correction (Sections 3, 9, 10):**
  * The erroneous identifier `S.O. 1416(E)` is **completely eliminated and barred** from the canonical legal chain.
  * Corrected to the authoritative statutory instrument:
    $$\textbf{Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015}$$
    $$\textbf{Statutory Identifier: G.S.R. 311(E)}$$
  * Promulgated by the Ministry of Home Affairs, Government of India (by order of the President of India) at New Delhi.
* **Evidence:** Gazette of India, Extraordinary, Part II, Section 3, Sub-section (i), No. 228, dated 23 April 2015.

### Correction 2: Disambiguation of Date Semantics
* **REV-1.2 Finding:** REV-1.2 assigned `2015-05-28` as publication date and `2014-05-29 (deemed)` as effective date.
* **REV-1.3 Correction (Sections 3.1, 9.1, 10):**
  * **Order / Publication Date:** **23 April 2015** (`2015-04-23`).
  * **Commencement Semantics:** Paragraph 1(2) of the Order explicitly states:
    $$\text{"It shall come into force at once."}$$
    Therefore, the statutory commencement date is **23 April 2015** (`2015-04-23`).
  * **Date Disambiguation:** `29 May 2014` is the historical promulgation date of the *Andhra Pradesh Reorganisation (Amendment) Ordinance, 2014 (Ordinance No. 4 of 2014)*, which was subsequently enacted by Parliament as Act No. 19 of 2014 on 17 July 2014. The platform strictly prohibits assigning `29 May 2014` as the publication, order, or commencement date of G.S.R. 311(E).

### Correction 3: Exact Statutory Function & Territorial Impact of G.S.R. 311(E)
* **REV-1.2 Finding:** Described as a generic transfer of mandals under Section 108.
* **REV-1.3 Correction (Section 3.1):** Formally details the enabling provision and exact territorial modification:
  * **Enabling Statutory Provision:** **Section 108(3) of the Andhra Pradesh Reorganisation Act, 2014** (Act No. 6 of 2014).
  * **Statutory Operation:** Formally amends the **Second Schedule** to the Andhra Pradesh Reorganisation Act, 2014.
  * **Exact Territorial Distribution:**
    1. **Kukunoor Mandal:** Entire revenue mandal transferred from Khammam (TS) to West Godavari (AP).
    2. **Velairpadu Mandal:** Entire revenue mandal transferred from Khammam (TS) to West Godavari (AP).
    3. **Bhurgampadu Mandal:** All revenue villages **EXCEPT 12 specified revenue villages** (Seethampeta, Dammapeta, etc., retained in Telangana) transferred to East Godavari (AP).
    4. **Chintoor Mandal:** Entire revenue mandal transferred from Khammam (TS) to East Godavari (AP).
    5. **Kunavaram Mandal:** Entire revenue mandal transferred from Khammam (TS) to East Godavari (AP).
    6. **Vararamachandrapuram (VR Puram) Mandal:** Entire revenue mandal transferred from Khammam (TS) to East Godavari (AP).
    7. **Bhadrachalam Mandal:** All revenue villages **EXCEPT Bhadrachalam revenue village / town itself** (retained in Telangana) transferred to East Godavari (AP).
  * **Affected Assembly Constituencies:**
    - Telangana: Bhadrachalam ST (AC-119), Aswaraopeta ST (AC-118), Pinapaka ST (AC-110).
    - Andhra Pradesh: Rampachodavaram ST (AC-53), Polavaram ST (AC-66).

### Correction 4: Preservation of 2018 Statutory Instrument
* **REV-1.3 Status (Section 3.1, 9.1):** Preserved verbatim as ratified in REV-1.2:
  * **Title:** *Commission's Notification No. 282/AP/2018(DEL)*
  * **Promulgation Date:** **22 September 2018** (`2018-09-22`)
  * **Issuing Authority:** Election Commission of India (ECI)
  * **Enabling Statutory Powers:** Section 9(1)(b) of the Delimitation Act, 2002 read with Section 15 and Section 26 of the Andhra Pradesh Reorganisation Act, 2014.
  * **Statutory Operation:** Formally amended the Delimitation of Parliamentary and Assembly Constituencies Order, 2008 in respect of the State of Andhra Pradesh (Schedule II) and the State of Telangana (Schedule XXXI), updating constituency extents to align with G.S.R. 311(E).

### Correction 5: Evidence-Graph Field-Separated Schema
* **REV-1.3 Enhancement (Section 9.1):**
  To prevent string-conflation of legal instruments, any future delimitation / legal lineage table or metadata schema will enforce the following normalized field separation:
  1. `title`: Full statutory title (e.g., "Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015").
  2. `statutory_identifier`: Gazette/order number (e.g., "G.S.R. 311(E)", "282/AP/2018(DEL)").
  3. `issuing_authority`: Enacting constitutional/statutory body (e.g., "President of India / Ministry of Home Affairs", "Election Commission of India").
  4. `publication_date`: ISO 8601 date of official gazetting (`2015-04-23`).
  5. `commencement_date`: ISO 8601 date of legal force (`2015-04-23`).
  6. `enabling_provision`: Statutory section providing jurisdiction (e.g., "Section 108(3), APRA 2014").
  7. `territorial_effect`: Granular summary of boundary, mandal, or village modifications.
  8. `source_artifact_path`: Repository path to authoritative source text or dossier.
  9. `retrieval_date`: ISO 8601 verification date.
  10. `content_sha256`: Cryptographic digest of the underlying evidence file.

### Correction 6: Semantic Test Suite Expansion (24 → 28 Tests)
* **REV-1.3 Additions (Section 10, Plane 1):**
  Four new mandatory invariant tests added to `tests/delimitation-invariants.test.mjs`:
  * `W020-LEGAL-08`: Canonical 2015 Removal of Difficulties Order identifier is asserted byte-exact as `G.S.R. 311(E)` and `S.O. 1416(E)` is strictly asserted as absent / rejected.
  * `W020-LEGAL-09`: 2015 Order date is asserted as `2015-04-23` and commencement semantics verified as "comes into force at once" (`2015-04-23`).
  * `W020-LEGAL-10`: 29 May 2014 date is asserted as strictly barred from being assigned as publication, order, or commencement date of G.S.R. 311(E).
  * `W020-LEGAL-11`: Legal sequence assertion: Verifies statutory ordering:
    $$\text{Delimitation Order 2008} \longrightarrow \text{APRA 2014} \longrightarrow \text{G.S.R. 311(E) (2015)} \longrightarrow \text{282/AP/2018(DEL)} \longrightarrow \text{Current Versions}$$

---

## 3. Repository-Wide Source-Integrity Search Results

A repository-wide AST, source code, migration, test, and document search was conducted across the Kshetra repository for the terms: `S.O. 1416`, `1416(E)`, `28 May 2015`, and `29 May 2014`.

```text
================================================================================
REPOSITORY-WIDE SOURCE-INTEGRITY AUDIT MATRIX
================================================================================
Directory / Scope        Files Scanned      S.O. 1416 / 1416(E)      28 May 2015      29 May 2014
--------------------------------------------------------------------------------
apps/api/                All (.ts, .json)   0 matches                0 matches        0 matches
apps/mobile/             All (.ts, .tsx)    0 matches                0 matches        0 matches
supabase/migrations/     All 36 (.sql)      0 matches                0 matches        0 matches
scripts/                 All (.mjs, .js)    0 matches                0 matches        0 matches
tests/                   All (.mjs, .ts)    0 matches                0 matches        0 matches
data/                    All (.json, .ts)   0 matches                0 matches        0 matches
reports/                 All (.json, .md)   0 matches                0 matches        0 matches
Root Markdown:
- PLAN-W020-REV-1.2.md   Superseded Plan    4 matches (PURGED)       1 match (PURGED) 1 match (PURGED)
- RECONCILIATION_REV2.md Superseded Recon   3 matches (PURGED)       1 match (PURGED) 1 match (PURGED)
- PLAN-W020-REV-1.3.md   Current Plan       1 match (Disclaimed)*    0 matches        2 matches (Disclaimed)*
================================================================================
* Note: Occurrences in PLAN-W020-MASTER-REV-1.3.md are explicit test assertions:
  - W020-LEGAL-08 asserts G.S.R. 311(E) is present and S.O. 1416(E) is rejected.
  - Section 3.1 & W020-LEGAL-10 assert 29 May 2014 belongs to Ordinance 4 of 2014 and is barred from G.S.R. 311(E).
Zero matches exist in tracked application code, database migrations, tests, or data packages.
================================================================================
```

---

## 4. Authoritative Evidence References

### 1. 2015 Removal of Difficulties Order
* **Full Title:** *Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015*
* **Statutory Identifier:** **G.S.R. 311(E)**
* **Official Gazette:** Gazette of India, Extraordinary, Part II, Section 3, Sub-section (i), No. 228
* **Issuing Authority:** Ministry of Home Affairs, Government of India (by order of the President of India)
* **Date of Promulgation & Order:** **23 April 2015** (`2015-04-23`), New Delhi
* **Commencement:** **Comes into force at once** (`2015-04-23`)
* **Enabling Provision:** Section 108(3) of the Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)
* **Statutory Operation:** Amends the Second Schedule to the Andhra Pradesh Reorganisation Act, 2014 to transfer specified mandals and villages from Khammam District (Telangana) to East Godavari and West Godavari Districts (Andhra Pradesh).

### 2. 2018 Delimitation Amendment Notification
* **Full Title:** *Commission's Notification No. 282/AP/2018(DEL)*
* **Statutory Identifier:** **282/AP/2018(DEL)**
* **Issuing Authority:** Election Commission of India (ECI), Nirvachan Sadan, New Delhi
* **Date of Promulgation:** **22 September 2018** (`2018-09-22`)
* **Commencement:** **22 September 2018** (`2018-09-22`)
* **Enabling Provisions:** Section 9(1)(b) of the Delimitation Act, 2002 read with Section 15 and Section 26 of the Andhra Pradesh Reorganisation Act, 2014.
* **Statutory Operation:** Amends the Delimitation of Parliamentary and Assembly Constituencies Order, 2008 in respect of Andhra Pradesh (Schedule II) and Telangana (Schedule XXXI), formally updating constituency extents following the territorial transfers under G.S.R. 311(E).

---

## 5. Execution Gate Status & Stop Declaration

```text
===============================================================================
W020 EXECUTION GATE STATUS — REVISION 1.3
===============================================================================
GATE W020-G0: PREFLIGHT RESEARCH & CODEBASE AUDIT       --> PASS / RATIFIED
GATE W020-G1: CONSTITUTIONAL & STATUTORY FRAMEWORK       --> PASS / RATIFIED (REV-1.3)
GATE W020-G2: DATA CATALOG & SCHEMA DESIGN SPECIFICATION --> PASS / RATIFIED (REV-1.3)
GATE W020-G3: MATHEMATICAL ACCEPTANCE SPECIFICATION      --> PASS / RATIFIED (REV-1.3)
-------------------------------------------------------------------------------
GATE W020-G4: MIGRATION 055 & SCHEMA DRIFT VERIFICATION  --> STRICTLY NOT AUTHORIZED
GATE W020-G5: SEED DATA & HISTORICAL RECONCILIATION     --> STRICTLY NOT AUTHORIZED
GATE W020-G6: API WRAPPING & SCENARIO ENGINE HARDENING   --> STRICTLY NOT AUTHORIZED
GATE W020-G7: COMPREHENSIVE VERIFICATION & EVIDENCE      --> STRICTLY NOT AUTHORIZED
-------------------------------------------------------------------------------
STOP STATE ACTIVE:
- Migration 055: NOT EXECUTED (0 SQL applied).
- Application Code: NOT MODIFIED (0 commits, 0 lines changed).
- Staging Database (fkpigozcqnmcvofuksar): UNTOUCHED.
- Production Database (ehfafcnimmjusyvplbah): 100% AIR-GAPPED & UNTOUCHED.
- 589 PostGIS Geometries: FROZEN & UNTOUCHED (SHA-256: f839fa02980318...).
- APK Builds: ZERO (0).
- The implementation agent DOES NOT self-certify or self-accept.
- Execution is HALTED awaiting written CTO authorization.
===============================================================================
```
