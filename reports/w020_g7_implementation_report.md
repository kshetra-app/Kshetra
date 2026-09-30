# W020-G7 IMPLEMENTATION & INVARIANT VERIFICATION REPORT

**Milestone:** W020-G7 (Delimitation Canonical Query Surface & Typed Regime Selection Integration)  
**Parent Job:** W020 (Delimitation Engine Foundation & Canonical Bridge)  
**Specification:** `PLAN-W020-G7-REV-1.1.md`  
**Authority Directive:** `CTO FORMAL RATIFICATION — W020-G7 REV-1.1` (2026-09-30)  
**Date:** 2026-09-30  
**Status:** `IMPLEMENTED / TESTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE`  

---

## 1. Executive Summary

Milestone **W020-G7** has been implemented, tested, and verified strictly in accordance with `PLAN-W020-G7-REV-1.1`. The read-only query surface bridging the in-memory calculation engine from W020-G5 with the database-backed canonical delimitation tables populated in W020-G6 has been established and verified across 297 comprehensive regression and invariant checks with a **100.0% pass rate (297/297)**.

All non-negotiable architectural boundaries and constitutional standards have been rigorously enforced:
- **ZERO Database Migrations / DDL / DML:** Staging database `panIN-staging` (`fkpigozcqnmcvofuksar`) queried read-only.
- **Production Air-Gap:** Production database `ehfafcnimmjusyvplbah` remains 100% untouched and air-gapped (0 connections, 0 credentials, 0 mutations).
- **Mobile Codebase Frozen:** Directory `apps/mobile/**` verified 100% frozen (0 file modifications).
- **PostGIS 589 Geometry Baseline:** 589 rows preserved byte-for-byte, matching canonical SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
- **Evidence-Gated Constituency Mapping:** `public.constituency_mapping` remains strictly at 0 rows. Lineage for Telangana AC-110 (*Pinapaka*), AC-118 (*Aswaraopeta*), and AC-119 (*Bhadrachalam*) is strictly preserved as `UNKNOWN`.
- **Statutory Territorial Transfer Terminology:** G.S.R. 311(E) is cited exclusively as *"statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015"*.
- **Derived-Only Scenario Semantics:** `isScenario` is derived exclusively from `(legalStatus === 'SCENARIO_PROPOSED_REGIME')`. Client override flags (`isScenario`, `is_scenario`, `simulation`) fail closed with HTTP 400 `SCENARIO_INPUT_FORBIDDEN`.
- **Scenario Selector Identity:** Scenario selection is bounded strictly to canonical proposal ID (`public.delimitation_proposals.id`, UUID) or canonical W014 scenario regime ID (`public.delimitation_regimes.id`). Undefined "scenario keys" are completely absent.

---

## 2. Implementation Artifacts

| Component | Path | Description |
| :--- | :--- | :--- |
| **Shared Contracts** | `packages/shared/src/contracts/delimitation.ts` | Added `TypedRegimeSelectionMode`, `ScenarioSelector`, `RegimeSelectionQuery`, `DelimitationRegimeRecord`, `DelimitationProposalRecord`, `ConstituencyMappingRecord`, `ConstituencyLineageClaim`, `ProvenanceDetailRecord`, and `ResolvedRegimeResult`. |
| **Canonical Query Service** | `apps/api/src/services/delimitationQueryService.ts` | Authoritative read-only query service implementing the 5 W014 selection modes, fail-closed regime resolution, and statutory claim registers. |
| **Fastify Route Integration** | `apps/api/src/routes/delimitation.ts` | 6 new query endpoints: `GET /regimes`, `GET /regimes/resolve`, `GET /proposals`, `GET /proposals/:id`, `GET /mapping`, and `GET /lineage/:acCode`. |
| **Master Test Battery** | `tests/delimitation-g7-query-surface.test.mjs` | 25 non-tautological invariant checks across 5 planes verifying typed regime resolution, orthogonal taxonomy, evidence gates, route integration, and isolation. |

---

## 3. Five-Plane W020-G7 Invariant Battery Results

| Plane | Checks | Description | Status |
| :--- | :---: | :--- | :---: |
| **Plane 1: Typed Regime Selection Semantics** | 5 | `W020-G7-REG-01..05`: Canonical `current` mode (decoupled from `is_active`), `as_of` temporal evaluation, `scenario` canonical resolution (proposal UUID / regime ID), `future_anticipated` empty population, fail-closed negative paths (400/404). | **PASS (5/5)** |
| **Plane 2: Orthogonal Taxonomy & Provenance** | 5 | `W020-G7-TAX-01..05`: Quadruple-plane orthogonality (`status`, `outputClassification`, `dataStatus`, `legalStatus`), runtime-only `isScenario`, client override denial (`SCENARIO_INPUT_FORBIDDEN`), full provenance resolution, zero `SIMULATION_PROPOSED` values. | **PASS (5/5)** |
| **Plane 3: Evidence Gate & Lineage Semantics** | 5 | `W020-G7-EVI-01..05`: `constituency_mapping = 0 rows`, AC-110/118/119 lineage strictly `UNKNOWN`, canonical G.S.R. 311(E) statutory territorial transfer citation, territorial transfer != lineage separation. | **PASS (5/5)** |
| **Plane 4: Fastify Route Query Integration** | 6 | `W020-G7-API-01..06`: Fastify endpoints `/proposals`, `/proposals/:id` (P1 statutory & P2 simulation), `/regimes`, `/mapping`, `/regimes/resolve`, and `/lineage/:acCode` in standardized ECC-001 envelope. | **PASS (6/6)** |
| **Plane 5: Security, Air-Gap & Isolation** | 4 | `W020-G7-SEC-01..04`: Read-only surface (POST/DELETE rejected 404), PostGIS 589 geometry digest match (`f839fa02...`), production database `ehfafcnimmjusyvplbah` air-gapped, `apps/mobile/**` frozen. | **PASS (4/4)** |
| **Total W020-G7 Invariants** | **25** | **Master Invariant & Verification Battery** | **PASS (25/25)** |

---

## 4. Prerequisite Regression Battery Results (272 Checks)

All 7 prerequisite regression suites ratified by CTO under `PLAN-W020-G7-REV-1.1` were executed and verified passing:

1. **W020-G6 Historical Ingestion & Evidence Gate:** `tests/delimitation-g6-ingestion.test.mjs` — **27 / 27 PASS**
2. **W020-G5 Delimitation Engine Invariants:** `tests/delimitation-g5-invariants.test.mjs` — **34 / 34 PASS**
3. **W020-G5 Fastify Route Integration:** `apps/api/src/__tests__/delimitation.test.ts` — **33 / 33 PASS**
4. **W018 Political Entity Invariants:** `tests/political-entities-invariants.test.mjs` — **53 / 53 PASS**
5. **W019 Election Normalization Invariants:** `tests/election-normalization-invariants.test.mjs` — **93 / 93 PASS**
6. **W020-G4 Migration 055 Preflight:** `tests/delimitation-migration-055-preflight.test.mjs` — **23 / 23 PASS**
7. **Declared API Contract Parity:** `scripts/check-api-contract-drift.mjs` — **9 / 9 MATCH**

**Total Comprehensive Test Battery:**  
$$272 \text{ (Prerequisite)} + 25 \text{ (W020-G7)} = \mathbf{297 \text{ / } 297 \text{ CHECKS PASSED (100.0\%)}}$$

---

## 5. TypeScript Compilation & Workspace Verification

- `npm run build --prefix packages/shared` $\rightarrow$ **Exit 0 (Clean)**
- `npm run build --prefix apps/api` $\rightarrow$ **Exit 0 (Clean)**
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` $\rightarrow$ **Exit 0 (Clean)**

---

## 6. Formal Milestone Gate Submission

In compliance with Master Execution Framework Rule IV-001 (Part 33/34), the implementing agent does not self-certify or self-accept. Milestone W020-G7 is hereby formally submitted for CTO acceptance review.

**Status:** `IMPLEMENTED / TESTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE`  
**Next Permitted Action:** Mandatory governance halt awaiting CTO review and formal acceptance directive. W020-G8+ remains strictly blocked.
