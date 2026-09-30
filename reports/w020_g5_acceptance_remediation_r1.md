# Milestone W020-G5 Acceptance Remediation R1 Report

**Target Milestone:** W020-G5 (Delimitation Engine Foundation)  
**Directive:** CTO DIRECTIVE — W020-G5 ACCEPTANCE REMEDIATION R1  
**Timestamp:** 2026-09-30T08:30:00Z  
**Canonical Branch:** `master`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Mobile Status:** `apps/mobile/**` (STRICTLY FROZEN, 0 CHANGES)  
**PostGIS Baseline:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary

In accordance with the CTO Directive for **W020-G5 Acceptance Remediation R1**, independent forensic audits and mathematical reconciliations were performed to address the two blocking items:
1. **Remediation 1 (National Scope / Route Scope):** Clarified the boundary between generic reusable multi-jurisdiction algorithms and governed jurisdiction factual coverage. Removed over-claims in invariant test definitions and API documentation; verified that no unauthorized national factual dataset or GIS boundary data was ingested; and ensured all unsupported jurisdictions fail closed with structured `404 UNSUPPORTED_GEOGRAPHY`.
2. **Remediation 2 (Article 332 Semantic Integrity):** Reconciled the distinction between Telangana's official **statutory baseline** (119 total, 19 SC, 12 ST, 88 General; `STATUTORY_FACT`, `OFFICIAL`, Census 2001) under the 2008 Delimitation Order read with APRA 2014, and the PANIN **Census 2011 mathematical derivation** (119 total, 18 SC, 10 ST, 91 General; `DETERMINISTIC_DERIVED`, `DERIVED`, Census 2011).

All 32 master invariants, 27 Fastify route integration tests, 53 W018 tests, 93 W019 tests, 23 W020-G4 preflight tests, 9/9 API contract checks, and TypeScript compilations passed with 100% parity.

---

## 2. Remediation 1: National Scope & Route Forensic Audit

A comprehensive forensic audit of all 14 routes and calculation functions was conducted to classify them into Category A (Generic Algorithm Only) vs Category B (Governed Jurisdiction Data):

| Route / Function | File | Category | Dataset / Input Nature | Production Accessible | Authorized by PLAN-W020-G5-REV-1.2 |
|---|---|---|---|---|---|
| `GET /projections`<br>`getProjections()` | `apps/api/src/services/delimitationService.ts` | **A** | Generic demographic quotient ($Pop/Divisor$) across benchmark demographic records (`india-district-population-2011.ts`). Zero GIS dependency. | Yes | Yes (Generic reusable engine) |
| `GET /projections/:stateCode`<br>`getStateProjection()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed for Telangana (`TS`, 119 seats). Unregistered states fail closed with `404 UNSUPPORTED_GEOGRAPHY`. | Yes | Yes (Telangana baseline) |
| `GET /timeline`<br>`getTimeline()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed 5-stage legal chain: 2008 Order, APRA 2014, G.S.R. 311(E), Notification 282/AP/2018(DEL). | Yes | Yes |
| `GET /status`<br>`getStatus()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed constitutional freeze status (Arts. 82 & 170) and Census 2027 tracking. | Yes | Yes |
| `GET /gainers-losers`<br>`getGainersLosers()` | `apps/api/src/services/delimitationService.ts` | **A** | Pure mathematical differential sorting ($Projected - Current$). | Yes | Yes |
| `POST /monitor-webhook`<br>`processMonitorWebhook()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed security hardening; fail-closed Bearer auth. | Yes | Yes |
| `GET /impact/:pinCode`<br>`getCitizenImpact()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed Telangana constituency mapping + spatial heuristic centroid caveat. | Yes | Yes |
| `GET /simulate/:stateCode`<br>`simulateBoundaries()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed Telangana district population baselines (`TS_DISTRICTS`); Hamilton largest-remainder apportionment. | Yes | Yes |
| `GET /reservation`<br>`getNationalReservations()` | `apps/api/src/services/delimitationService.ts` | **A** | Generic multi-state Article 332 Hamilton quota simulation; explicit disclaimer; no statutory claim. | Yes | Yes |
| `GET /reservation/:stateCode`<br>`getStateReservationDetail()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed Telangana statutory baseline (19 SC, 12 ST; `STATUTORY_FACT`) vs Census 2011 derivation (18 SC, 10 ST; `DETERMINISTIC_DERIVED`). | Yes | Yes |
| `GET /compare`<br>`compareStates()` | `apps/api/src/services/delimitationService.ts` | **A** | Generic comparative simulation across queried state codes. | Yes | Yes |
| `GET /mla-impact/:stateCode`<br>`getMlaImpact()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed Telangana MLA incumbent profiles + `POLITICAL_HEURISTIC` provenance. | Yes | Yes |
| `GET /party-projections/:stateCode`<br>`getPartyProjections()` | `apps/api/src/services/delimitationService.ts` | **B** | Governed Telangana 2018/2023 election history seat shares + `STATISTICAL_PROJECTION` provenance. | Yes | Yes |
| `GET /methodology`<br>`getMethodology()` | `apps/api/src/services/delimitationService.ts` | **A** | Constitutional framework disclosure and `MAX_SAFE_REQUESTED_SEATS` computational safety policy. | Yes | Yes |

### Invariant Test Revision
`W020-G5-API-02` was updated from claiming "dynamically computes seat projections across all 36 Census 2011 states" to explicitly asserting:
> "Route 1 (/projections) executes generic multi-jurisdiction apportionment algorithm across Census 2011 benchmark records without claiming national statutory coverage."

---

## 3. Remediation 2: Article 332 Semantic Integrity & Telangana Reconciled Baseline

### The Discrepancy Explained
- Official ECI/APRA statutory baseline for Telangana Assembly: **119 Total, 19 SC, 12 ST, 88 General**.
- Previous un-reconciled report stated: **119 Total, 18 SC, 10 ST, 91 General**.
- **Reason:** The 18/10/91 result is a pure PANIN mathematical derivation applying Article 332 to **Census 2011** demographics. The statutory baseline of 19 SC and 12 ST was established under the **2008 Delimitation Order** based on **Census 2001** demographics (frozen by the 84th Constitutional Amendment).

### Field-Level Mathematical Provenance Record (Census 2011 Derivation)
1. **Source Dataset Version:** `census_2011_pca_v1.0` (`data/census/india-district-population-2011.ts`, `TS_DISTRICTS`)
2. **Census Year:** `2011`
3. **SC Numerator:** `5,260,976`
4. **ST Numerator:** `3,018,710`
5. **Total Population Denominator:** `34,591,425`
6. **Eligible Population Definition:** Total Enumerated Resident Population (Census 2011 Primary Census Abstract)
7. **Exact Quota Formula:** $Q_c = S \times \frac{Pop_c}{Pop_{Total}}$
8. **Base Allocation:**
   - $Base(SC) = \lfloor 18.0986 \rfloor = 18$
   - $Base(ST) = \lfloor 10.3848 \rfloor = 10$
9. **Remainder Allocation:**
   - $Rem(SC) = 0.0986$, $Rem(ST) = 0.3848$
   - Target reserved: $R_{\text{target}} = \lfloor 28.4834 + 0.5 \rfloor = 28$
   - Surplus seats to distribute: $K = 28 - (18 + 10) = 0$
10. **Tie-Break Sequence:** Population magnitude, then lexicographical ('SC' before 'ST'). Not invoked because $K = 0$.
11. **Final Result:** SC: 18, ST: 10, General: 91, Total: 119
12. **Output Classification:** `DETERMINISTIC_DERIVED`
13. **W012 Data Status:** `DERIVED`
14. **Legal Status:** `SIMULATION_PROPOSED` (NOT `STATUTORY_ENACTED_REGIME`)
15. **Scenario Status:** `isScenario = false` (or `true` in user simulation)
16. **Conservation Verification:** $18 + 10 + 91 = 119$ (Exact bitwise match)

### Reconciled Statutory Baseline (APRA 2014 Schedule XXXI)
- **Total Seats:** 119
- **SC Reserved:** 19
- **ST Reserved:** 12
- **General:** 88
- **Output Classification:** `STATUTORY_FACT`
- **W012 Data Status:** `OFFICIAL`
- **Legal Status:** `STATUTORY_ENACTED_REGIME`
- **Census Basis:** `Census 2001 (Frozen by 84th Constitutional Amendment Articles 82 & 170)`
- **Statutory Authority:** Delimitation of Parliamentary and Assembly Constituencies Order, 2008 read with Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI).

### Architectural Contract Hardening
`packages/shared/src/contracts/delimitation.ts` and `apps/api/src/services/delimitationService.ts` were hardened so `StateReservationDetailDTO` provides separate, strictly typed objects:
- `current`: `StatutoryReservationBaseline` (`STATUTORY_FACT`, `OFFICIAL`, 19 SC, 12 ST, 88 General)
- `census2011MathematicalDerivation`: `Article332DerivationDetail` (`DETERMINISTIC_DERIVED`, `DERIVED`, 18 SC, 10 ST, 91 General)
- Unregistered jurisdictions fail closed with `404 UNSUPPORTED_GEOGRAPHY`.

---

## 4. Test & Invariant Verification Matrix

| Suite | File / Command | Checks / Tests | Result | Status |
|---|---|---|---|---|
| **W020-G5 Invariants** | `tests/delimitation-g5-invariants.test.mjs` | 32 / 32 | 32 PASS, 0 FAIL | **PASS** |
| **Delimitation Route Integration** | `apps/api/src/__tests__/delimitation.test.ts` | 27 / 27 | 27 PASS, 0 FAIL | **PASS** |
| **W018 Political Entities Invariants** | `tests/political-entities-invariants.test.mjs` | 53 / 53 | 53 PASS, 0 FAIL | **PASS** |
| **W019 Election Normalization Invariants** | `tests/election-normalization-invariants.test.mjs` | 93 / 93 | 93 PASS, 0 FAIL | **PASS** |
| **W020-G4 Preflight Invariants** | `tests/delimitation-migration-055-preflight.test.mjs` | 23 / 23 | 23 PASS, 0 FAIL | **PASS** |
| **API Contract Parity** | `scripts/check-api-contract-drift.mjs` | 9 / 9 | 9 MATCH (100%) | **PASS** |
| **Shared Package Build** | `npm run build --prefix packages/shared` | `tsc` | Exit 0 | **PASS** |
| **API Package Build** | `npm run build --prefix apps/api` | `tsc --noEmit` | Exit 0 | **PASS** |
| **Mobile TypeScript Check** | `npx tsc --noEmit -p apps/mobile/tsconfig.json` | `tsc --noEmit` | Exit 0 | **PASS** |
| **PostGIS Geometry Baseline** | Staging `entity_geometries` (589 rows) | SHA-256 Digest | `f839fa02...` match | **PASS** |
| **Production Air-Gap** | `ehfafcnimmjusyvplbah` | Zero touch / Zero traffic | Verified air-gapped | **PASS** |

---

## 5. Compliance & Gate Status

- **Rule IV-001 (Zero Self-Acceptance):** Respected. Milestone W020-G5 is submitted for CTO Technical Acceptance Review.
- **Rule IV-002 (Production Air-Gap):** Strictly maintained.
- **Rule IV-003 (589 Geometry Freeze):** Unbroken (`f839fa02...`).
- **Rule IV-004 (Mobile Freeze):** 0 files touched under `apps/mobile/**`.
- **Gate:** `W020-G5 SUBMITTED FOR CTO ACCEPTANCE; W020-G6+ STRICTLY BLOCKED`.
