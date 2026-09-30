# PLAN-W020-G7: DELIMITATION CANONICAL QUERY SURFACE & TYPED REGIME SELECTION

**Document Identifier:** `PLAN-W020-G7-REV-1.1`  
**Milestone:** W020-G7 (Delimitation Canonical Query Surface & Typed Regime Selection Integration)  
**Parent Job:** W020 (Delimitation Engine Foundation & Canonical Bridge)  
**Authority Directive:** `CTO PLAN REMEDIATION DIRECTIVE — W020-G7 REV-1.1` (2026-09-30)  
**Status:** `DRAFT / SUBMITTED FOR CTO RATIFICATION`  
**Implementation Authorization:** `STRICTLY NOT AUTHORIZED (NO)`  
**Accepted Prerequisite Milestones:**
- W020-G4: Delimitation Canonical Bridge Preflight (Migration 055) — `ACCEPTED / COMPLETE` (Commit `46d9558`)
- W020-G5: Delimitation Engine Foundation (Read APIs & Core Logic) — `ACCEPTED / COMPLETE` (Commit `32a0ed7`)
- W020-G6: Historical Delimitation Evidence Ingestion & Canonical Bridge — `ACCEPTED / COMPLETE` (Commit `ef32321`)

---

```text
================================================================================
GOVERNANCE & ENVIRONMENT ENCLOSURE — MILESTONE W020-G7
================================================================================
PLAN STATUS:                          DRAFT / SUBMITTED FOR CTO RATIFICATION
IMPLEMENTATION AUTHORIZATION:         STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                 MASTER PLANNING ONLY
TARGET DATABASE:                      STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
LOCAL TEST HARNESS:                   DOCKER POSTGRESQL 17 (w020_g7_pg_verify)
PRODUCTION DATABASE:                  STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
MOBILE CODEBASE:                      STRICTLY FROZEN (apps/mobile/**, ZERO MODIFICATIONS)
POSTGIS GEOMETRY BASELINE:            READ-ONLY & FROZEN (589 rows, exact SHA-256 match)
MIGRATIONS / DDL PLANNED:             ZERO (0 new tables, 0 new columns, 0 DDL)
CODE / DATABASE MUTATIONS AUTHORIZED: ZERO (0)
MANDATORY STOP STATE:                 HALT AFTER PLAN SUBMISSION AWAITING CTO REVIEW
================================================================================
```

---

## 1. Precise Objective & Boundaries

### 1.1 Core Objective
The objective of Milestone W020-G7 is to bridge the accepted in-memory calculation engine from W020-G5 with the accepted database-backed canonical delimitation tables populated in W020-G6. Specifically, W020-G7 will:
1. Implement a **Canonical Query Service** that queries `public.delimitation_proposals`, `public.delimitation_regimes`, `public.provenance_records`, `public.evidence_records`, and `public.constituency_mapping` on `panIN-staging` (`fkpigozcqnmcvofuksar`).
2. Provide **Typed Regime Resolution** supporting five distinct selection modes (`current`, `as_of`, `explicit version`, `future anticipated`, and `scenario`) with fail-closed error handling.
3. Enforce **Quadruple-Plane Orthogonal Taxonomy** across all query responses: proposal `status`, `outputClassification`, `dataStatus`, and `legalStatus`.
4. Enforce **Derived-Only Scenario Semantics**, where `isScenario === (legalStatus === 'SCENARIO_PROPOSED_REGIME')` and client override attempts are rejected fail-closed with `400 SCENARIO_INPUT_FORBIDDEN`.
5. Maintain strict preservation of the **Evidence-Gated Constituency Mapping Invariant**, ensuring `constituency_mapping` remains at 0 rows and lineage for Telangana ACs 110, 118, and 119 remains `UNKNOWN`.

### 1.2 Non-Negotiable Scope Boundaries
- **ZERO Mobile Modifications:** Directory `apps/mobile/**` remains 100% frozen. No mobile code, UI screens, hooks, or stores may be touched during W020-G7.
- **ZERO Geometry Mutations:** The canonical 589 PostGIS geometry rows in `public.entity_geometries` remain strictly frozen and read-only. The canonical SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` must match across all test runs.
- **ZERO Production Mutation / Air-Gap Enforced:** Production database `ehfafcnimmjusyvplbah` is completely air-gapped, untouched, and uncontacted. Zero network calls or credentials targeting production are permitted.
- **ZERO Schema Alterations:** W020-G7 requires **NO new database migrations, NO DDL, and NO schema alterations**. The bridge columns added in Migration 055 (G4) and populated in G6 provide complete coverage.
- **ZERO National Ingestion Expansion:** National demographic analysis in G7 is strictly limited to the Census 2011 pure proportional multi-jurisdiction benchmark established in G5/G6. Telangana remains the sole governed statutory state. No expansion to other states' assembly delimitations is authorized.
- **ZERO Device / APK Work:** APK generation, device testing, and client packaging remain deferred to W023.

---

## 2. Current Repository & Database Ground Truth

W020-G7 starts strictly from the verified ground truth of commit `ef3232191d217e6c85182fef34e4b6425738285d`:

### 2.1 Live Staging Database Catalog (`panIN-staging` / `fkpigozcqnmcvofuksar`)
1. **`public.delimitation_regimes` (4 Canonical Regimes Verified):**
   - `eci_delimitation_1976` (`HISTORICAL_LEGAL_REGIME`, `is_active: false`, `effective_from: 1976-01-01`).
   - `eci_delimitation_2008` (`CURRENT_LEGAL_REGIME`, `is_active: true`, `effective_from: 2008-02-19`).
   - `eci_delimitation_post2026` (`FUTURE_ANTICIPATED_REGIME`, `is_active: false`, `effective_from: 2026-01-01`).
   - `scenario_delimitation_draft_prop_1` (`SCENARIO_PROPOSED_REGIME`, `is_active: false`, `effective_from: 2026-01-01`).
   - **Zero** `SIMULATION_PROPOSED` or `SIMULATION_PROPOSED_REGIME` rows.
2. **`public.delimitation_proposals` (2 Canonical Proposals Populated):**
   - **Proposal 1 (`02010000-0000-0000-0000-000000000001`):** Statutory baseline for Telangana Legislative Assembly (119 total / 19 SC / 12 ST / 88 General; `status: 'final'`, `outputClassification: 'STATUTORY_FACT'`, `dataStatus: 'OFFICIAL'`, `legalStatus: 'CURRENT_LEGAL_REGIME'`, `isScenario: false`, `seat_change: 0`). Linked to regime `eci_delimitation_2008` and provenance `02000000-0000-0000-0000-000000000002` under `ON DELETE RESTRICT`.
   - **Proposal 2 (`02010000-0000-0000-0000-000000000002`):** PANIN Article 332 deterministic simulation for Census 2011 pure proportionality (119 total / 18 SC / 10 ST / 91 General; `status: 'draft'`, `outputClassification: 'DETERMINISTIC_DERIVED'`, `dataStatus: 'DERIVED'`, `legalStatus: 'SCENARIO_PROPOSED_REGIME'`, `isScenario: true`, `seat_change: 0`). Linked to regime `scenario_delimitation_draft_prop_1` and provenance `02000000-0000-0000-0000-000000000006` under `ON DELETE RESTRICT`.
3. **`public.constituency_mapping` (Strictly 0 Rows):**
   - Populated with exactly **0 rows**.
   - Lineage for Telangana ACs 110 (Pinapaka), 118 (Aswaraopeta), and 119 (Bhadrachalam) is strictly classified as **`UNKNOWN`**.
4. **`public.provenance_records` & `public.evidence_records`:**
   - 6 distinct provenance records (`02000000-0000-0000-0000-000000000001..0006`) and 5 evidence records (`e0200000-0000-0000-0000-000000000001..0005`) active on staging.
5. **`public.entity_geometries` (589 Rows):**
   - Exactly 589 rows, matching SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.

### 2.2 Accepted Application Engine Truth (`apps/api` & `packages/shared`)
- Fastify routes in `apps/api/src/routes/delimitation.ts` return standardized ECC-001 `ApiSuccessEnvelope<T>`.
- Ingress hook `preValidation` rejects `isScenario`, `is_scenario`, and `simulation` query parameters with HTTP 400 `SCENARIO_INPUT_FORBIDDEN`.
- `delimitationService.ts` implements Article 332 proportionality principle using PANIN deterministic Hamilton / Largest Remainder algorithm with zero floating-point drift.

---

## 3. Typed Regime Selection Semantics (W014 Standard)

W020-G7 implements an explicit typed regime resolution pipeline in `apps/api/src/services/delimitationQueryService.ts`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      W014 TYPED REGIME SELECTION MODES                      │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ 1. Current Regime    │ W014 typed semantic selection mode representing the  │
│    (Default)         │ canonical current legal regime subject to legal and  │
│                      │ temporal validity. Decoupled from is_active boolean. │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 2. As-Of Regime      │ Evaluates temporal bounds: effective_from <= T AND   │
│    (Temporal Query)  │ (effective_to IS NULL OR effective_to > T).          │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 3. Explicit Version  │ Queries by explicit regime ID (e.g.                  │
│    (Historical /     │ eci_delimitation_1976). Returns 404 if ID is         │
│     Specific)        │ unregistered in delimitation_regimes.                │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 4. Future Anticipated│ Queries eci_delimitation_post2026. Population        │
│    (Tracking Mode)   │ explicitly marked UNAVAILABLE. Zero boundaries.      │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 5. Scenario Proposed │ Resolves strictly through canonical proposal ID OR   │
│    (Simulation Mode) │ canonical W014 scenario regime identifier.           │
│                      │ Returns full 10-field scenario enclosure.            │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 3.1 Current Legal Regime Semantics
1. **Semantic Definition:** "current" is a W014 typed semantic selection mode representing the canonical current legal regime subject to its legal and temporal validity under the prevailing constitutional and statutory order.
2. **Decoupling from `is_active`:** `is_active` is an operational implementation-level attribute/column in PostgreSQL, but **MUST NOT** be defined as the semantic meaning of "current".
3. **Statutory and Temporal Validity:** The resolver selects the canonical regime whose `regime_type` is strictly `'CURRENT_LEGAL_REGIME'` and whose temporal validity encompasses the query evaluation instant (`effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`). In the current legal order, this resolves to `eci_delimitation_2008` (enacted under the Delimitation Act, 2002, Schedule II composite AP order as inherited by Telangana Schedule XXXI under the Andhra Pradesh Reorganisation Act, 2014).
4. **Structural Protection Against Errant Promotion:** Future anticipated regimes (`FUTURE_ANTICIPATED_REGIME`), scenario/simulation regimes (`SCENARIO_PROPOSED_REGIME`), and historical regimes (`HISTORICAL_LEGAL_REGIME`) are structurally and semantically prohibited from resolving as "current", even if an `is_active` boolean on their database row were mutated or toggled to `true`.
5. **Fail-Closed Invariant Guard:** If a query resolves any regime where `is_active === true` but `regime_type !== 'CURRENT_LEGAL_REGIME'`, the query engine rejects the state as an invariant violation (`500 INVALID_CURRENT_REGIME_STATE`) rather than erroneously promoting a future or scenario regime to current status.

### 3.2 Scenario Selector Identity & Canonical Resolution
Scenario selection is strictly bounded to the existing canonical W014/W020 identity plane:
1. **Allowed Identifiers:**
   - **Explicit Proposal ID:** `public.delimitation_proposals.id` (UUID, primary key, e.g. `02010000-0000-0000-0000-000000000002` for Proposal 2).
   - **Canonical W014 Scenario Regime Identifier:** `public.delimitation_regimes.id` (VARCHAR(64), primary key, e.g. `scenario_delimitation_draft_prop_1` where `regime_type === 'SCENARIO_PROPOSED_REGIME'`).
2. **Strict Elimination of Undefined "Scenario Key":**
   - No column `scenario_key` exists in the database schema or repository. All references to ad-hoc "scenario keys" are formally removed.
   - ZERO new scenario identity namespaces.
   - ZERO ad-hoc string identities.
   - ZERO duplicate scenario identity fields.
   - ZERO client-controlled scenario flags.
3. **Fail-Closed Resolution:** If an incoming scenario query supplies an identifier that does not match an existing canonical proposal UUID or canonical scenario regime ID, or if the resolved entity does not have `legal_status === 'SCENARIO_PROPOSED_REGIME'`, the resolver fails closed with structured `404 SCENARIO_NOT_FOUND` or `400 INVALID_SCENARIO_SELECTOR`.

### 3.3 Formal Selection Resolution Contract
```typescript
export type ScenarioSelector =
  | { type: 'proposal_id'; proposalId: string }
  | { type: 'regime_id'; regimeId: string };

export type RegimeSelectionMode =
  | { mode: 'current' }
  | { mode: 'as_of'; date: string }
  | { mode: 'explicit'; regimeId: string }
  | { mode: 'future_anticipated' }
  | { mode: 'scenario'; selector: ScenarioSelector };

export interface ResolvedRegimeResult {
  regime: DelimitationRegimeRow;
  proposal: DelimitationProposalRow | null;
  provenance: ProvenanceRecordRow;
  evidence: EvidenceRecordRow | null;
  isScenario: boolean; // Derived strictly: (regime.legal_status === 'SCENARIO_PROPOSED_REGIME')
}
```

### 3.4 Fail-Closed Resolution Rules
1. **Invalid Date in `as_of`:** If `as_of` is not a valid ISO 8601 date, reject immediately with `400 INVALID_TEMPORAL_PARAMETER`.
2. **Unmatched Regime:** If no regime satisfies the temporal interval or explicit ID, fail closed with `404 REGIME_NOT_FOUND` (never fallback to default).
3. **Invalid Current Regime State:** If `is_active: true` is attached to a non-`CURRENT_LEGAL_REGIME` row, fail closed with `500 INVALID_CURRENT_REGIME_STATE`.
4. **Client-Supplied Scenario Override:** Any request containing `isScenario`, `is_scenario`, or `simulation` query or body parameters is rejected with `400 SCENARIO_INPUT_FORBIDDEN`.
5. **Forbidden Regimes:** Any request attempting to resolve `SIMULATION_PROPOSED` or `SIMULATION_PROPOSED_REGIME` fails closed with `400 INVALID_REGIME_IDENTIFIER`.
6. **Unresolved Scenario Selector:** Any scenario selection specifying an invalid proposal UUID or non-scenario regime identifier fails closed with `404 SCENARIO_NOT_FOUND`.

---

## 4. Quadruple-Plane Orthogonal Taxonomy (W012 / W014 Standard)

In strict accordance with W012, W014, and Master Plan Rev 1.3, W020-G7 preserves complete orthogonality across all four taxonomic planes:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUADRUPLE-PLANE ORTHOGONAL TAXONOMY                    │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ Plane 1: Lifecycle   │ draft | submitted | under_review | approved |        │
│          Status      │ rejected | final                                     │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ Plane 2: Output      │ STATUTORY_FACT | DETERMINISTIC_DERIVED |             │
│    Classification    │ POLITICAL_HEURISTIC | GEOGRAPHIC_APPROXIMATION |     │
│                      │ UNKNOWN_UNAVAILABLE                                  │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ Plane 3: Data Status │ OFFICIAL | DERIVED | VERIFIED | UNVERIFIED |         │
│          (W012)      │ DISPUTED | UNKNOWN | LEGACY                          │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ Plane 4: Legal Status│ HISTORICAL_LEGAL_REGIME | CURRENT_LEGAL_REGIME |     │
│          (W014)      │ FUTURE_ANTICIPATED_REGIME | SCENARIO_PROPOSED_REGIME │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 4.1 Independence Invariant
- `proposal.status` reflects the **administrative lifecycle** of the proposal document.
- `metadata.outputClassification` reflects the **epistemic category** of the payload.
- `metadata.dataStatus` reflects the **W012 verification tier** of the underlying numbers.
- `metadata.legalStatus` reflects the **W014 constitutional/statutory temporal regime**.
- **No plane may imply, constrain, or mutate any other plane.**
- **`isScenario` derivation:**
  $$\text{isScenario} \equiv (\text{legalStatus} == \text{'SCENARIO\_PROPOSED\_REGIME'})$$

---

## 5. Evidence Constitution & Lineage Preservation

W020-G7 enforces the immutable PANIN Evidence Constitution:
$$\text{Authoritative Source} \longrightarrow \text{PANIN Derivation} \longrightarrow \text{PANIN Verification} \longrightarrow \text{UNKNOWN where unresolved}$$

### 5.1 Six Partitioned Authoritative Sources
1. `ECI-DELIM-2008-AP` (Delimitation Order 2008 Schedule II) $\rightarrow$ Original 2008 composite AP constituency extents.
2. `MHA-APRA-2014` (AP Reorganisation Act 2014) $\rightarrow$ Successor-state territorial division enacting Schedule XXXI (119 ACs for Telangana).
3. `MHA-APORD-2015-GSR311E` (G.S.R. 311(E), 23 April 2015) $\rightarrow$ Statutory territorial transfer of specified mandals/villages under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015.
4. `ECI-NOT-2018-282AP` (ECI Notification No. 282/AP/2018(DEL), 22 Sept 2018) $\rightarrow$ Formal extent amendments for AP Assembly Constituencies 53-Rampachodavaram & 67-Polavaram under Schedule II.
5. `RGI-CENSUS-2011` (Census 2011 Primary Census Abstract) $\rightarrow$ Demographic input baseline totals for Telangana (34,591,425 total, 5,260,976 SC, 3,018,710 ST).
6. `PANIN-SIM-01` (PANIN Article 332 Apportionment Specification) $\rightarrow$ PANIN computational methodology: Hamilton / Largest Remainder deterministic quota allocation applied to Article 332.

### 5.2 Strict Negative Evidence Invariant
- **Rule IV-020-MAP:** A statutory territorial transfer of specified mandals/villages does **NOT** constitute proof of constituency dissolution, reconstitution, or version lineage.
- **Evidence-Bounded Framing:** Within the authoritative sources and legal instruments examined for W020, no constituency-level predecessor/successor evidence was identified for Telangana AC-110 Pinapaka, AC-118 Aswaraopeta, or AC-119 Bhadrachalam.
- **Table Population:** `public.constituency_mapping` remains strictly at **0 rows**.
- **Lineage Classification:** The lineage relation for AC-110, AC-118, and AC-119 is strictly preserved as **`UNKNOWN`**.

---

## 6. Persistent Database Schema Impact Analysis

### 6.1 Schema Mutation Assessment
- **DDL Required:** **NONE (0 DDL statements)**.
- **New Tables:** **NONE (0 new tables)**.
- **New Columns:** **NONE (0 new columns)**.
- **New Functions / Procedures:** **NONE (0 new database procedures)**.

### 6.2 Architectural Justification
Migration 055 (G4) successfully established all required canonical bridge columns on `public.delimitation_proposals` and `public.constituency_mapping`, and established `ON DELETE RESTRICT` foreign keys to `delimitation_regimes` and `provenance_records`. W020-G6 populated these tables with verified canonical data. W020-G7 is strictly a **read and query surface integration milestone** that consumes these tables. No database-level modifications are needed or permitted.

---

## 7. Security, Row Level Security & Privilege Architecture

1. **Row Level Security (RLS) Posture:**
   - `delimitation_proposals`: RLS enabled. Anonymous writes denied fail-closed (SQL 42501). Public SELECT permitted.
   - `delimitation_regimes`: RLS enabled. Anonymous writes denied fail-closed. Public SELECT permitted.
   - `constituency_mapping`: RLS enabled. Anonymous writes denied fail-closed. Public SELECT permitted.
   - `provenance_records`: RLS enabled. Anonymous writes denied fail-closed. Public SELECT permitted.
   - `evidence_records`: RLS enabled. Anonymous writes denied fail-closed. Public SELECT permitted.
2. **Least Privilege Execution:**
   - Fastify read queries execute under authenticated Supabase client or standard role permissions.
   - Zero SQL injection surface: All queries use parameterized statements or typed Supabase PostgREST query builders.
3. **Privilege Revocation Verification:**
   - Confirm anonymous users cannot insert, update, or delete proposals, regimes, mappings, or provenance.

---

## 8. Deterministic Mathematical Invariants

W020-G7 query service verifies mathematical determinism on all returned proposal data:
1. **Seat Conservation Law:**
   $$S_{\text{General}} + S_{\text{SC}} + S_{\text{ST}} = S_{\text{Total}} \equiv 119$$
   - Proposal 1: $88 + 19 + 12 = 119 \equiv 119$
   - Proposal 2: $91 + 18 + 10 = 119 \equiv 119$
2. **Quota Apportionment Formula (Census 2011 PCA Derivation):**
   $$q_{SC} = \frac{5,260,976}{34,591,425} \times 119 \approx 18.09859 \implies \lfloor q_{SC} \rfloor = 18$$
   $$q_{ST} = \frac{3,018,710}{34,591,425} \times 119 \approx 10.38484 \implies \lfloor q_{ST} \rfloor = 10$$
   $$\text{General Seats} = 119 - (18 + 10) = 91$$
3. **Deterministic Tie-Breaking:**
   - Lexicographic priority ($SC > ST$) enforced in cases of equal remainders.
4. **Computational Ingress Bounds:**
   - Floor: $\text{seats} \ge 1$ (`MIN_SAFE_REQUESTED_SEATS`).
   - Ceiling: $\text{seats} \le 10,000$ (`MAX_SAFE_REQUESTED_SEATS`).

---

## 9. Semantic Invariant Test Plan (`tests/delimitation-g7-query-surface.test.mjs`)

W020-G7 will introduce 25 non-tautological semantic invariant checks across 5 planes:

### Plane 1: Typed Regime Selection Semantics
- `W020-G7-REG-01`: Mode `current` resolves canonical `CURRENT_LEGAL_REGIME` (`eci_delimitation_2008`) based on statutory/temporal validity; asserts non-`CURRENT_LEGAL_REGIME` rows cannot become current even if `is_active` is toggled.
- `W020-G7-REG-02`: Mode `as_of(2010-01-01)` resolves `eci_delimitation_2008` based on temporal interval.
- `W020-G7-REG-03`: Mode `scenario` resolves Proposal 2 via either explicit proposal ID (`02010000-0000-0000-0000-000000000002`) or canonical scenario regime ID (`scenario_delimitation_draft_prop_1`); rejects ad-hoc keys or client scenario flags.
- `W020-G7-REG-04`: Mode `future_anticipated` resolves `eci_delimitation_post2026` with population marked `UNAVAILABLE`.
- `W020-G7-REG-05`: Unknown regime ID or unresolvable temporal date fails closed with structured 404 / 400 error.

### Plane 2: Orthogonal Taxonomy & Provenance Resolution
- `W020-G7-TAX-01`: Quadruple-plane taxonomy verified: proposal `status`, `outputClassification`, `dataStatus`, `legalStatus` are mutually independent.
- `W020-G7-TAX-02`: Derived-only `isScenario`: strictly evaluated as `(legalStatus === 'SCENARIO_PROPOSED_REGIME')`.
- `W020-G7-TAX-03`: Client override attempts for `isScenario` / `simulation` fail closed with HTTP 400 `SCENARIO_INPUT_FORBIDDEN`.
- `W020-G7-TAX-04`: Every returned proposal resolves its linked `provenance_record` with complete source citations.
- `W020-G7-TAX-05`: Zero `SIMULATION_PROPOSED` values exist anywhere in queried responses or database.

### Plane 3: Evidence Gate & Lineage Semantics
- `W020-G7-EVI-01`: `constituency_mapping` query returns strictly **0 rows**.
- `W020-G7-EVI-02`: Querying lineage for AC-110 (Pinapaka) returns `UNKNOWN` status with statutory territorial transfer evidence note.
- `W020-G7-EVI-03`: Querying lineage for AC-118 (Aswaraopeta) returns `UNKNOWN` status with statutory territorial transfer evidence note.
- `W020-G7-EVI-04`: Querying lineage for AC-119 (Bhadrachalam) returns `UNKNOWN` status with statutory territorial transfer evidence note.
- `W020-G7-EVI-05`: G.S.R. 311(E) is cited exclusively as statutory territorial transfer under the 2015 Order, never as constituency lineage.

### Plane 4: API Fastify Service Query Integration
- `W020-G7-API-01`: Fastify `/proposals` endpoint queries and returns both canonical proposals wrapped in ECC-001 envelope.
- `W020-G7-API-02`: Fastify `/proposals/:id` returns Proposal 1 (statutory) with linked 2008 provenance.
- `W020-G7-API-03`: Fastify `/proposals/:id` returns Proposal 2 (simulation) with Article 332 simulation provenance.
- `W020-G7-API-04`: Fastify `/regimes` endpoint returns the 4 canonical W014 regimes with active status flags.
- `W020-G7-API-05`: Fastify `/mapping` endpoint returns empty array (`data: []`, `count: 0`) and UNKNOWN claims register.
- `W020-G7-API-06`: Declared contract check maintains 100% parity across all Fastify routes.

### Plane 5: Security, Air-Gap & Isolation
- `W020-G7-SEC-01`: Anonymous write attempts to delimitation query endpoints fail closed.
- `W020-G7-SEC-02`: Staging PostGIS 589 geometry baseline verified strictly unchanged (589 rows, exact SHA-256 match).
- `W020-G7-SEC-03`: Production database `ehfafcnimmjusyvplbah` verified 100% air-gapped and untouched.
- `W020-G7-SEC-04`: Mobile directory `apps/mobile/**` verified 100% frozen (0 file modifications).

---

## 10. Master Regression Gates (272 Total Regression Checks/Tests Required)

Prior to submitting W020-G7 for CTO acceptance, the full regression battery must pass with zero failures:
1. **W020-G6 Historical Delimitation Evidence Ingestion:** 27 / 27 PASS (`tests/delimitation-g6-ingestion.test.mjs`).
2. **W020-G5 Delimitation Engine Invariants:** 34 / 34 PASS (`tests/delimitation-g5-invariants.test.mjs`).
3. **W020-G5 Delimitation Fastify Route Integration:** 33 / 33 PASS (`apps/api/src/__tests__/delimitation.test.ts`).
4. **W018 Canonical Political Entities Invariants:** 53 / 53 PASS (`tests/political-entities-invariants.test.mjs`).
5. **W019 Election Data Normalization Invariants:** 93 / 93 PASS (`tests/election-normalization-invariants.test.mjs`).
6. **W020-G4 Migration 055 Preflight:** 23 / 23 PASS (`tests/delimitation-migration-055-preflight.test.mjs`).
7. **Declared API Contract Drift:** 9 / 9 MATCH (`scripts/check-api-contract-drift.mjs`).

### Required Regression Arithmetic:
$$\begin{aligned}
\text{W018 Canonical Political Entities} &= 53 \\
\text{W019 Election Data Normalization} &= 93 \\
\text{W020-G4 Migration 055 Preflight} &= 23 \\
\text{W020-G5 Delimitation Engine Invariants} &= 34 \\
\text{W020-G5 Fastify Route Integration} &= 33 \\
\text{W020-G6 Evidence Ingestion} &= 27 \\
\text{Declared API Contract Drift} &= 9 \\
\hline
\mathbf{\text{Total Regression Checks/Tests Required}} &= \mathbf{272}
\end{aligned}$$

Therefore:
**"272 total regression checks/tests required"** across all historical and prerequisite suites.

*(Upon W020-G7 implementation, the addition of the 25 new query surface invariant checks in `tests/delimitation-g7-query-surface.test.mjs` yields a combined total of **297 checks** required to pass with zero failures).*

8. **TypeScript Compiler Diagnostic Gates:**
   - `packages/shared`: `tsc` clean (exit 0).
   - `apps/api`: `tsc --noEmit` clean (exit 0).
   - `apps/mobile`: `tsc --noEmit -p apps/mobile/tsconfig.json` clean (exit 0).
9. **Commit Freshness & Repository Integrity:**
   - `tests/commit-freshness.test.mjs`: Checks A–J PASS.
   - `scripts/check-repo-evidence-integrity.mjs`: All commits verified, clean tree.

---

## 11. Staging-Only Execution Boundaries

- All test runs and query integrations target strictly **`panIN-staging`** (`fkpigozcqnmcvofuksar`) or the local Docker PostgreSQL 17 test harness (`w020_g7_pg_verify`).
- Production database `ehfafcnimmjusyvplbah` remains completely disconnected and air-gapped.

---

## 12. Rollback & Non-Destructive Correction Semantics

- Since W020-G7 introduces **zero schema migrations and zero DDL**, rollback of application service changes is strictly non-destructive:
  - If a code regression occurs in `apps/api/src/services/delimitationQueryService.ts`, revert via Git checkout.
  - The underlying staging database remains untouched.
  - In the event of errant proposal reads or cache inconsistencies, stateless API restart resets all in-memory connections.

---

## 13. Acceptance Evidence Requirements

Before W020-G7 can be submitted for CTO acceptance review, the following evidence artifacts must be authored and committed:
1. `reports/w020_g7_implementation_report.md` (Detailed implementation narrative).
2. `reports/w020_g7_implementation_report.json` (Machine-readable invariant results).
3. `reports/w020_g7_plan_review_manifest.json` (Formal evidence cross-tabulation).
4. Full execution logs proving 25/25 G7 invariants pass and 272/272 regression checks pass (297 total checks passing with zero failures).
5. Verification of 589 PostGIS geometry baseline digest match.

---

## 14. Governance Status & Mandatory Stop State

```text
================================================================================
MANDATORY GOVERNANCE STOP STATE — PLAN-W020-G7-REV-1.1 SUBMITTED
================================================================================
W020-G7 STATUS:                        DRAFT / SUBMITTED FOR CTO RATIFICATION
W020-G7 IMPLEMENTATION AUTHORIZATION: STRICTLY NOT AUTHORIZED (NO)

- W020-G6 is formally ACCEPTED / COMPLETE / CLOSED (Accepted Commit: ef32321).
- PLAN-W020-G7-REV-1.1 has been remediated per CTO directive and submitted for ratification.
- Required regression total corrected: 272 regression checks (plus 25 G7 invariants = 297 total).
- "current" regime semantics decoupled from is_active boolean; bound to CURRENT_LEGAL_REGIME validity.
- Scenario identity bounded strictly to canonical proposal ID or canonical W014 scenario regime ID.
- ZERO code, database, migration, API, mobile, or geometry mutations have been executed.
- Production database ehfafcnimmjusyvplbah remains 100% air-gapped and untouched.
- Mobile codebase apps/mobile/** remains 100% frozen.
- PostGIS 589 geometry baseline remains frozen and verified.

STRICT HALT: Execution stops here. No implementation may begin until the CTO
issues formal written ratification of PLAN-W020-G7-REV-1.1.
================================================================================
```
