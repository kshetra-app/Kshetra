# W020-G8 Remediation Report: Blocker G8-LEGAL-001 (Legal Applicability Evidence)

- **Milestone:** W020-G8
- **Blocker Addressed:** G8-LEGAL-001
- **Date:** 2026-10-01
- **Authority:** CTO REMEDIATION DIRECTIVE — W020-G8 LEGAL APPLICABILITY EVIDENCE
- **Execution Boundary:** panIN-staging (`fkpigozcqnmcvofuksar`) ONLY
- **Production Status:** ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)
- **Geometry Baseline:** 589 rows, SHA-256 `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (VERIFIED UNCHANGED)

---

## 1. Executive Summary & Defect Remediation

Under CTO Directive G8-LEGAL-001, the implementation of `resolveLegalApplicability()` in `DelimitationQueryService` was audited. The inspection revealed that while the function outputted governing provisions, its internal resolution utilized hardcoded state-code conditional branches (`normState === 'SK'`, `'MZ'`, `'GA'`) inside the State Legislative Assembly path. Furthermore, the function signature lacked parameters to evaluate temporal validity, evidence provenance, and non-current regime contexts.

### Actions Taken:
1. **Governed Legal Rules Catalog:** Replaced state-code branching with an application-level typed catalog (`GOVERNED_LEGAL_RULES`). Every rule defines all six orthogonal coordinates: Entity Type, Legal Regime applicability, Constitutional Provision, Statutory Provision, Temporal Validity, and Authoritative Provenance.
2. **Context-Driven Dynamic Resolution:** `resolveLegalApplicability(query: LegalApplicabilityQuery)` resolves the applicable rule based on the typed query context. If an uncataloged, invalid, or temporally inapplicable combination is requested, it fails closed with structured error codes (`LEGAL_RULE_NOT_FOUND`, `TEMPORAL_VALIDITY_MISMATCH`, `INVALID_ENTITY_TYPE`).
3. **Plane Separation & Goa Statutory Correction:**
   - Corrected statutory citation for the Goa Assembly from Section 9 to **Section 12 of the Goa, Daman and Diu Reorganisation Act, 1987 (Act No. 18 of 1987)**.
   - Preserved strict separation: Article 371-I sets a constitutional minimum of not less than 30; Section 12 sets the statutory exact seat count of 40; factual seats are 40.
4. **Puducherry UT Decoupling:** Modeled as `UNION_TERRITORY_ASSEMBLY` governed by Section 3 of the Government of Union Territories Act, 1963; strictly decoupled from Article 170.
5. **W019 Terminology Correction:** Updated wording across tests and reports from "W019 certified 2023 election results" to **"ECI-sourced 2023 Telangana election results/statistical data"**.
6. **Dedicated 16-Case Semantic Test Suite:** Created `tests/delimitation-legal-applicability.test.mjs` verifying Cases A through P.

---

## 2. Six-Coordinate Code-to-Plan Reconciliation

| # | Coordinate | Implementation Path | Resolution Logic | Output Evidence |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Entity Type** | `query.entityType` | Validates against permitted political entity types; filters rule catalog. | `res.entityType` (`STATE_LEGISLATIVE_ASSEMBLY`, `UNION_TERRITORY_ASSEMBLY`, etc.) |
| **2** | **Legal Regime** | `query.regimeType` | Resolves `CURRENT_LEGAL_REGIME`, `HISTORICAL_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`. Scenarios return non-statutory outputs (`isScenario: true`, `isStatutoryFact: false`). | `res.regimeType`, `res.isScenario`, `res.isStatutoryFact` |
| **3** | **Constitutional Provision** | Rule catalog match | Binds constitutional article (`Article 170(1)`, `Article 371F(f)`, `Article 371G(b)`, `Article 371-I`, `Article 239A`, `Article 81`). | `res.constitutionalProvision`, `res.constitutionalFloor`, `res.constitutionalCeiling` |
| **4** | **Statutory Provision** | Rule catalog match | Binds enabling parliamentary enactment (`RPA 1950`, `36th Amendment 1975`, `Mizoram Act 1986`, `Goa Reorganisation Act 1987 Sec 12`, `UT Act 1963 Sec 3`). | `res.statutoryProvision`, `res.statutoryExactSeats` |
| **5** | **Temporal Validity** | `query.asOfDate` vs `rule.temporalValidity` | Validates whether `asOfDate` falls within `[validFrom, validTo]`. Mismatch throws `TEMPORAL_VALIDITY_MISMATCH` (400). | `res.temporalValidity` (`validFrom`, `validTo`, `isCurrent`) |
| **6** | **Authoritative Provenance** | `rule.provenance` & `query.evidenceReference` | Validates requested evidence reference against rule citation, authority, and official gazette notice. Mismatch throws `EVIDENCE_PROVENANCE_MISMATCH`. | `res.provenance` (`sourceAuthority`, `citation`, `evidenceReference`, `instrumentTitle`) |

---

## 3. Machine-Verifiable 16-Case Semantic Test Matrix

All 16 test cases in `tests/delimitation-legal-applicability.test.mjs` pass with 100% success rate:

| Case | Target Condition | Expected Resolution | Observed Result | Verdict |
| :---: | :--- | :--- | :--- | :---: |
| **A** | Standard State Assembly (TS) | Article 170(1) evaluated ($60 \le S \le 500$) | `Article 170(1)`, bounds `[60, 500]`, `CONST-IND-ART170` | **PASS** |
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

---

## 4. Test Verification Accounting

```text
================================================================================
BASELINE MASTER REGRESSION:          322 / 322 PASS (100.0%)
ADDITIONAL LEGAL SEMANTIC TESTS:      16 /  16 PASS (100.0%)
--------------------------------------------------------------------------------
COMBINED VERIFIED TEST BATTERY:      338 / 338 PASS (100.0%)
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
10. `tests/delimitation-legal-applicability.test.mjs` (G8-LEGAL-001 Semantic Suite): **16/16 PASS**

---

## 5. Scope Boundary & Governance Confirmation

- **Zero Migrations:** Exactly 0 migrations added.
- **Zero DDL / DML:** Exactly 0 schema modifications or database mutations executed.
- **Production Air-Gap:** Production `ehfafcnimmjusyvplbah` 100% air-gapped and untouched.
- **Mobile Codebase:** `apps/mobile/**` 100% frozen (0 edits).
- **PostGIS Geometries:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
- **Constituency Mapping:** Strictly 0 rows in `public.constituency_mapping`.
- **Constituency Lineage:** AC-110, AC-118, AC-119 strictly preserved as `UNKNOWN`.
