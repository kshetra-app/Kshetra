# W020-G8 Remediation Report: Blocker G8-LEGAL-001 & G8-LEGAL-002-R2

- **Milestone:** W020-G8
- **Blockers Addressed:**
  - G8-LEGAL-001: Six-Coordinate Legal Applicability Model
  - G8-LEGAL-002: Canonical W014 Half-Open Temporal Validity $[valid\_from, valid\_to)$
  - G8-LEGAL-002-R2: Telangana Historical Origin ($2014-06-02$) & Successor-Boundary Resolution Semantics (T6-A..T6-H)
- **Date:** 2026-10-01
- **Authority:** CTO REMEDIATION DIRECTIVES — W020-G8 LEGAL APPLICABILITY EVIDENCE, W020-G8-LEGAL-002, and W020-G8-LEGAL-002-R2
- **Execution Boundary:** panIN-staging (`fkpigozcqnmcvofuksar`) ONLY
- **Production Status:** ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)
- **Geometry Baseline:** 589 rows, SHA-256 `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (VERIFIED UNCHANGED)

---

## 1. Executive Summary & Defect Remediation

### G8-LEGAL-001 Remediation:
1. **Governed Legal Rules Catalog:** Replaced state-code branching with an application-level typed catalog (`GOVERNED_LEGAL_RULES`). Every rule defines all six orthogonal coordinates: Entity Type, Legal Regime applicability, Constitutional Provision, Statutory Provision, Temporal Validity, and Authoritative Provenance.
2. **Context-Driven Dynamic Resolution:** `resolveLegalApplicability(query: LegalApplicabilityQuery)` resolves the applicable rule based on the typed query context. If an uncataloged, invalid, or temporally inapplicable combination is requested, it fails closed with structured error codes (`LEGAL_RULE_NOT_FOUND`, `TEMPORAL_VALIDITY_MISMATCH`, `INVALID_ENTITY_TYPE`).
3. **Plane Separation & Goa Statutory Correction:**
   - Corrected statutory citation for the Goa Assembly from Section 9 to **Section 12 of the Goa, Daman and Diu Reorganisation Act, 1987 (Act No. 18 of 1987)**.
   - Preserved strict separation: Article 371-I sets a constitutional minimum of not less than 30; Section 12 sets the statutory exact seat count of 40; factual seats are 40.
4. **Puducherry UT Decoupling:** Modeled as `UNION_TERRITORY_ASSEMBLY` governed by Section 3 of the Government of Union Territories Act, 1963; strictly decoupled from Article 170.
5. **W019 Terminology Correction:** Updated wording across tests and reports from "W019 certified 2023 election results" to **"ECI-sourced 2023 Telangana election results/statistical data"**.

### G8-LEGAL-002 Remediation:
1. **Canonical Half-Open Temporal Semantics:** Enforced canonical W014 temporal validity $[valid\_from, valid\_to)$, where:
   - `valid_from` is inclusive: $valid\_from \le asOfDate$
   - `valid_to` is exclusive: $asOfDate < valid\_to$
   - For open-ended rules ($valid\_to = NULL$), $valid\_from \le asOfDate$ applies indefinitely.
2. **Implementation Path Correction:** In `apps/api/src/services/delimitationQueryService.ts`:
   - Updated condition from `queryTime > validToTime` to `queryTime >= validToTime` (rejecting $asOfDate \ge valid\_to$).
   - Synchronized rule catalog entry `RULE-HIST-DELIM-2008-AP` to `validTo: '2014-06-02'` (appointed day under APRA 2014) so that on 2014-06-02 the historical composite rule terminates exclusively.
   - Updated error message text to format $[validFrom, validTo)$.

### G8-LEGAL-002-R2 Remediation:
1. **Telangana Temporal Origin Correction:**
   - Added explicit catalog rule `RULE-CONST-ART170-TS` with `validFrom: '2014-06-02'` (appointed day of Andhra Pradesh Reorganisation Act, 2014, Section 17 read with Schedule XXXI).
   - Added successor rule `RULE-CONST-ART170-AP` with `validFrom: '2014-06-02'` (175 seats).
   - Distinguishes territorial/state existence from general constitutional rules: Telangana Assembly did not exist as a State prior to 2 June 2014. Queries for TS with $asOfDate < 2014-06-02$ (e.g. 1975-08-15) strictly fail closed with `TEMPORAL_VALIDITY_MISMATCH`.
2. **Case T5 Open-Ended Semantic Replacement:**
   - Case T5 tests open-ended validity ($validTo = NULL$) using a legally valid entity: Standard State Assembly under Article 170(1) ($validFrom: 1950-01-26$), proving applicability at $validFrom$ ($1950-01-26$), current day ($2024-01-01$), and far future ($2050-01-01$), while asserting that TS prior to $2014-06-02$ fails closed.
3. **Comprehensive Successor Boundary Verification (T6-A through T6-H):**
   - Implemented and verified the complete 8-part battery proving:
     - **T6-A**: Query at 2014-06-01 selects historical AP composite rule (294 seats).
     - **T6-B**: Query at 2014-06-02 shows historical AP composite rule expired and successor rules (TS: 119 seats, AP: 175 seats) active at the appointed day.
     - **T6-C**: Query at 2014-06-03 confirms successor rules remain active.
     - **T6-D**: Bitwise coordinate equality: `old.validTo === successor.validFrom` (`'2014-06-02' === '2014-06-02'`).
     - **T6-E**: `old.validTo` is strictly exclusive (throws `TEMPORAL_VALIDITY_MISMATCH` at $asOfDate == validTo$).
     - **T6-F**: `successor.validFrom` is strictly inclusive (succeeds at $asOfDate == validFrom$).
     - **T6-G**: Zero overlap (no instant where both historical and successor rules are concurrently active).
     - **T6-H**: Zero temporal gap (unbroken continuous legal chain from 2008-02-19 through present day).

---

## 2. Six-Coordinate Code-to-Plan Reconciliation

| # | Coordinate | Implementation Path | Resolution Logic | Output Evidence |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Entity Type** | `query.entityType` | Validates against permitted political entity types; filters rule catalog. | `res.entityType` (`STATE_LEGISLATIVE_ASSEMBLY`, `UNION_TERRITORY_ASSEMBLY`, etc.) |
| **2** | **Legal Regime** | `query.regimeType` | Resolves `CURRENT_LEGAL_REGIME`, `HISTORICAL_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`. Scenarios return non-statutory outputs (`isScenario: true`, `isStatutoryFact: false`). | `res.regimeType`, `res.isScenario`, `res.isStatutoryFact` |
| **3** | **Constitutional Provision** | Rule catalog match | Binds constitutional article (`Article 170(1)`, `Article 371F(f)`, `Article 371G(b)`, `Article 371-I`, `Article 239A`, `Article 81`). | `res.constitutionalProvision`, `res.constitutionalFloor`, `res.constitutionalCeiling` |
| **4** | **Statutory Provision** | Rule catalog match | Binds enabling parliamentary enactment (`RPA 1950`, `36th Amendment 1975`, `Mizoram Act 1986`, `Goa Reorganisation Act 1987 Sec 12`, `UT Act 1963 Sec 3`, `APRA 2014 Sec 17`). | `res.statutoryProvision`, `res.statutoryExactSeats` |
| **5** | **Temporal Validity** | `query.asOfDate` vs `rule.temporalValidity` | Validates canonical half-open interval $[valid\_from, valid\_to)$: rule applies if and only if $valid\_from \le asOfDate < valid\_to$. Mismatch throws `TEMPORAL_VALIDITY_MISMATCH` (400). | `res.temporalValidity` (`validFrom`, `validTo`, `isCurrent`) |
| **6** | **Authoritative Provenance** | `rule.provenance` & `query.evidenceReference` | Validates requested evidence reference against rule citation, authority, and official gazette notice. Mismatch throws `EVIDENCE_PROVENANCE_MISMATCH`. | `res.provenance` (`sourceAuthority`, `citation`, `evidenceReference`, `instrumentTitle`) |

---

## 3. Machine-Verifiable Semantic & Boundary Test Matrix (30 Checks)

All 30 test cases in `tests/delimitation-legal-applicability.test.mjs` (16 Legal Semantic + 14 Temporal Boundary) pass with 100.0% success rate:

| Case | Target Condition | Expected Resolution | Observed Result | Verdict |
| :---: | :--- | :--- | :--- | :---: |
| **A** | Standard State Assembly | Article 170(1) evaluated ($60 \le S \le 500$) | `Article 170(1)`, bounds `[60, 500]`, `CONST-IND-ART170` | **PASS** |
| **B** | Sikkim Special Regime (SK) | Article 371F(f) floor 30, notwithstanding clause | `Article 371F(f)`, floor 30, factual 32, notwithstanding `true` | **PASS** |
| **C** | Mizoram Special Regime (MZ) | Article 371G(b) floor 40, notwithstanding clause | `Article 371G(b)`, floor 40, factual 40, notwithstanding `true` | **PASS** |
| **D** | Goa Special Regime & Statute (GA) | Art 371-I floor 30, Reorg Act 1987 Sec 12 exact 40 | Floor 30, exact 40 (Sec 12), factual 40, planes distinct | **PASS** |
| **E** | Puducherry / UT Assembly (PY) | UT Act 1963 Section 3 (30 seats), NOT Art 170 | `Article 239A`, UT Act Sec 3, exact 30, no 500 ceiling | **PASS** |
| **F** | Historical Regime (AP 2008) | Past statutory validity (294 seats, `isCurrent: false`) | Historical factual 294, `isCurrent: false`, `ECI-DELIM-2008-AP` | **PASS** |
| **G** | Future Anticipated Regime | Post-2026 tracking (`isStatutoryFact: false`) | Non-statutory, `isCurrent: false`, `ECI-POST-2026-TRACKING` | **PASS** |
| **H** | Scenario Proposed Regime | Non-statutory simulation (`isScenario: true`) | `isScenario: true`, `isStatutoryFact: false`, 0 legal force | **PASS** |
| **I** | Missing Legal Evidence | Fails closed on uncataloged combination | Throws 404 `LEGAL_RULE_NOT_FOUND` (0 synthetic data) | **PASS** |
| **J** | Invalid Entity / Regime | Fails closed on malformed entity type | Throws 400 `INVALID_ENTITY_TYPE` | **PASS** |
| **K** | asOf Date Inside Validity | Date within valid interval succeeds | `asOfDate: 2024-01-01` within Goa `validFrom: 1987-05-30` passes | **PASS** |
| **L** | asOf Date Outside Validity | Date prior to enactment fails closed | `asOfDate: 1980-01-01` throws `TEMPORAL_VALIDITY_MISMATCH` | **PASS** |
| **M** | Provenance Reference Mismatch | Forged/mismatched evidence fails closed | Throws 400 `EVIDENCE_PROVENANCE_MISMATCH` | **PASS** |
| **N** | Scenario Isolation | Cannot masquerade as current statutory fact | Zero statutory provisions, strictly isolated | **PASS** |
| **O** | UT vs State Decoupling | UT Assembly strictly decoupled from Art 170 | PY uses UT Act 1963; TS uses Article 170(1) | **PASS** |
| **P** | Ceiling Separation | Art 170 ceiling (500) != safety ceiling (10000) | Const ceiling 500 strictly distinct from `MAX_SAFE = 10000` | **PASS** |
| **T1** | $asOfDate == validFrom$ | PASS / applicable (inclusive lower bound) | $1987-05-30 == 1987-05-30$, ExactSeats: 40 | **PASS** |
| **T2** | $asOfDate < validTo$ (immediately before) | PASS / applicable (interior of half-open range) | $2014-06-01 < 2014-06-02$, HistSeats: 294 | **PASS** |
| **T3** | $asOfDate == validTo$ | FAIL closed / `TEMPORAL_VALIDITY_MISMATCH` | Throws `TEMPORAL_VALIDITY_MISMATCH` (exclusive upper bound) | **PASS** |
| **T4** | $asOfDate > validTo$ (immediately after) | FAIL closed / `TEMPORAL_VALIDITY_MISMATCH` | $2014-06-03 > 2014-06-02$ throws `TEMPORAL_VALIDITY_MISMATCH` | **PASS** |
| **T5** | Open-Ended $validTo = NULL$ | Applicable for $asOfDate \ge validFrom$; TS pre-existence fails | 1950-01-26 and 2050-01-01 pass; TS < 2014-06-02 rejected | **PASS** |
| **T6-A** | Prior to Boundary ($T_{boundary} - 1d$) | Historical AP composite rule selected | $2014-06-01$: 294 seats, $[2008-02-19, 2014-06-02)$ | **PASS** |
| **T6-B** | Exact Boundary Instant ($T_{boundary}$) | Historical expired; successor TS & AP active | Hist expired; TS 119 seats, AP 175 seats active on 2014-06-02 | **PASS** |
| **T6-C** | Post-Boundary ($T_{boundary} + 1d$) | Successor rules remain active | $2014-06-03$: TS 119 seats, AP 175 seats (statutory: true) | **PASS** |
| **T6-D** | Coordinate Parity | $old.validTo === successor.validFrom$ | $2014-06-02 === 2014-06-02$ byte-exact match | **PASS** |
| **T6-E** | $validTo$ Exclusive Boundary | Throws at $asOfDate == validTo$ | Thrown: `true` (400 `TEMPORAL_VALIDITY_MISMATCH`) | **PASS** |
| **T6-F** | $validFrom$ Inclusive Boundary | Succeeds at $asOfDate == validFrom$ | $2014-06-02 == validFrom$: 119 seats | **PASS** |
| **T6-G** | Mutual Exclusivity (Zero Overlap) | No instant where both rules concurrently active | Prior: Hist=true, Succ=false; Boundary: Hist=false, Succ=true | **PASS** |
| **T6-H** | Temporal Continuity (Zero Gap) | Continuous legal chain across 2008..2026 | $2008 (294s) \to 2014-06-01 (294s) \to 2014-06-02 (119s) \to 2026 (119s)$ | **PASS** |
| **T7** | Future Anticipated Rule Isolation | Does NOT become current statutory fact | `regimeType: FUTURE_ANTICIPATED_REGIME`, `isStatutoryFact: false` | **PASS** |

---

## 4. Test Verification Accounting

```text
================================================================================
BASELINE MASTER REGRESSION:          322 / 322 PASS (100.0%)
ADDITIONAL LEGAL SEMANTIC TESTS:      16 /  16 PASS (100.0%)
ADDITIONAL TEMPORAL BOUNDARY TESTS:   14 /  14 PASS (100.0%)
--------------------------------------------------------------------------------
COMBINED VERIFIED TEST BATTERY:      352 / 352 PASS (100.0%)
================================================================================
```

### Breakdown by Suite:
1. `tests/political-entities-invariants.test.mjs` (W018): **53/53 PASS**
2. `tests/election-normalization-invariants.test.mjs` (W019): **93/93 PASS**
3. `tests/delimitation-migration-055-preflight.test.mjs` (W020-G4): **23/23 PASS**
4. `tests/delimitation-g5-invariants.test.mjs` (W020-G5 Engine): **34/34 PASS**
5. `apps/api/src/__tests__/delimitation.test.ts` (W020-G5 Routes): **33/33 PASS**
6. `tests/delimitation-g6-ingestion.test.mjs` (W020-G6 Ingestion): **27/27 PASS**
7. `tests/delimitation-g7-query-surface.test.mjs` (W020-G7 Query): **25/25 PASS**
8. `scripts/check-api-contract-drift.mjs` (API Drift): **9/9 PASS**
9. `tests/delimitation-g8-integration.test.mjs` (W020-G8 Integration): **25/25 PASS**
10. `tests/delimitation-legal-applicability.test.mjs` (G8-LEGAL-001 & 002-R2 Suite): **30/30 PASS**

---

## 5. Scope Boundary & Governance Confirmation

- **Zero Migrations:** Exactly 0 migrations added.
- **Zero DDL / DML:** Exactly 0 schema modifications or database mutations executed.
- **Production Air-Gap:** Production `ehfafcnimmjusyvplbah` 100% air-gapped and untouched.
- **Mobile Codebase:** `apps/mobile/**` 100% frozen (0 edits).
- **PostGIS Geometries:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
- **Constituency Mapping:** Strictly 0 rows in `public.constituency_mapping`.
- **Constituency Lineage:** AC-110, AC-118, AC-119 strictly preserved as `UNKNOWN`.
