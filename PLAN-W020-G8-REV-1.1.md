# PLAN-W020-G8: DELIMITATION ENGINE FOUNDATION & CANONICAL INTEGRATION

**Document Identifier:** `PLAN-W020-G8-REV-1.1`  
**Milestone:** W020-G8 (Delimitation Engine Foundation & Canonical Cross-Domain Integration)  
**Parent Milestone:** W020 (Delimitation Engine Foundation)  
**Authority Directive:** `CTO PLAN REMEDIATION DIRECTIVE — W020-G8 REV-1.1` (2026-09-30)  
**Status:** `DRAFT / SUBMITTED FOR CTO RATIFICATION`  
**Implementation Authorization:** `STRICTLY NOT AUTHORIZED (NO)`  
**Accepted Prerequisite Milestones:**
- W014: Geography Versioning & Temporal Validity — `ACCEPTED / COMPLETE` (Commit `bb7c6ec`)
- W016: Spatial Topology & 589 PostGIS Geometry Baseline — `ACCEPTED / FROZEN` (Digest `f839fa02...`)
- W018: Canonical Political Entity Model — `ACCEPTED / COMPLETE` (Commit `080344c`)
- W019: Election Data Normalization — `ACCEPTED / COMPLETE` (Commit `9b7cad4`)
- W020-G4: Delimitation Canonical Bridge Preflight (Migration 055) — `ACCEPTED / COMPLETE` (Commit `46d9558`)
- W020-G5: Delimitation Engine Foundation (Read APIs & Core Logic) — `ACCEPTED / COMPLETE` (Commit `32a0ed7`)
- W020-G6: Historical Delimitation Evidence Ingestion & Canonical Bridge — `ACCEPTED / COMPLETE` (Commit `ef32321`)
- W020-G7: Delimitation Canonical Query Surface & Typed Regime Selection — `ACCEPTED / COMPLETE` (Commit `65c32c8`)

---

```text
================================================================================
GOVERNANCE & ENVIRONMENT ENCLOSURE — MILESTONE W020-G8 REV-1.1
================================================================================
PLAN STATUS:                          DRAFT / SUBMITTED FOR CTO RATIFICATION
IMPLEMENTATION AUTHORIZATION:         STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                 MASTER PLANNING ONLY
TARGET DATABASE:                      STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
PRODUCTION DATABASE:                  STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
MOBILE CODEBASE:                      STRICTLY FROZEN (apps/mobile/**, ZERO MODIFICATIONS)
POSTGIS GEOMETRY BASELINE:            READ-ONLY & FROZEN (589 rows, exact SHA-256 match)
MIGRATIONS / DDL PLANNED:             ZERO (0 new tables, 0 new columns, 0 DDL)
DATABASE DML PLANNED:                 ZERO (0 insert/update/delete mutations)
CODE MUTATIONS AUTHORIZED:            ZERO (0)
MANDATORY STOP STATE:                 HALT AFTER PLAN SUBMISSION AWAITING CTO REVIEW
================================================================================
```

---

## 1. Exact Objective & Boundaries

### 1.1 Objective
The objective of Milestone W020-G8 is to complete the architectural, cross-domain integration and final verification of **Milestone W020 (Delimitation Engine Foundation)**. Specifically, W020-G8 will:
1. **Harmonize In-Memory Calculations with Canonical Persistence:** Unify the algorithmic calculation service (`delimitationService.ts`, authored in G5) with the canonical database query surface (`delimitationQueryService.ts`, authored in G7) into a cohesive domain service layer, eliminating disjoint parallel implementations.
2. **Bridge Delimitation to Predecessor Domains (W014/W018/W019):** Upgrade simulation endpoints that currently rely on static mock arrays (`/mla-impact/:stateCode`, `/party-projections/:stateCode`, `/timeline`, `/status`) so they query canonical predecessor tables on `panIN-staging` (`public.canonical_persons`, `public.political_organizations`, `public.elected_tenures`, `public.election_contests`, `public.ballot_choices`, `public.evidence_records`, `public.delimitation_regimes`) while preserving fail-closed fallback semantics.
3. **Enforce Strict Mock Data Replacement Semantics:** Eliminate all mock data and replace existing values only with verified canonical data or deterministic derivations. Where authoritative data is missing, the platform must emit `UNKNOWN` / `NULL` / explicit unavailable semantics. Removing mock data does NOT authorize creating substitute data without evidence.
4. **Enforce Unified Typed Regime Ingress across Simulation Surfaces:** Ensure that analytical simulation routes (`/simulate/:stateCode`, `/projections`) accept the canonical W014 selection query parameter schema (`mode`, `date`, `regimeId`, `proposalId`) and evaluate boundary models strictly against the resolved typed regime, preventing simulations from running detached from legal regimes.
5. **Execute the Definitive 322-Test Master Verification Battery:** Establish a comprehensive, non-tautological semantic integration test battery (`tests/delimitation-g8-integration.test.mjs`) verifying all legal, computational, derived mathematical, and scenario invariants across W018 (53), W019 (93), W020-G4 (23), W020-G5 (67), W020-G6 (27), W020-G7 (25), API drift (9), and W020-G8 (25) for a grand total of **322 passing checks**.

### 1.2 Inviolable Scope Boundaries
- **ZERO Migrations:** No migration `056_*.sql` is authorized.
- **ZERO DDL / DML:** No `CREATE TABLE`, `ALTER TABLE`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` on the staging database.
- **ZERO Production Access:** Production `ehfafcnimmjusyvplbah` remains air-gapped.
- **ZERO Mobile Modifications:** `apps/mobile/**` remains 100% frozen.
- **ZERO Geometry Changes:** 589 rows in `entity_geometries` remain frozen (`f839fa02...`).
- **ZERO Speculative Mappings:** `constituency_mapping` remains at 0 rows.
- **ZERO Constituency Lineage Inventions:** AC-110, AC-118, AC-119 remain strictly `UNKNOWN`.
- **ZERO Ad-Hoc Scenario Identities:** No "scenario keys" or client-supplied scenario flags.

---

## 2. Exact Problem Remaining After G7

Following the successful completion and CTO acceptance of W020-G7 (Commit `65c32c8`), the repository has established:
- High-precision demographic and constitutional algorithms (G5).
- Clean database schema bridges in Migration 055 (G4).
- Authoritative historical evidence, canonical regimes, and proposals 1 & 2 in PostgreSQL (G6).
- An authoritative read-only query surface with fail-closed typed regime resolution (G7).

However, four specific architectural and operational gaps remain unaddressed:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REMAINING ARCHITECTURAL GAPS                          │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ 1. Dual Service      │ delimitationService (G5) and delimitationQueryService│
│    Disconnection     │ (G7) operate side-by-side. Simulation endpoints in   │
│                      │ routes/delimitation.ts invoke G5 in-memory logic     │
│                      │ without verifying active W014 legal regimes.         │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 2. Mock Data in      │ /mla-impact/:stateCode uses hardcoded TS_MLAS with   │
│    Political Routes  │ synthetic margins rather than W018 canonical persons │
│                      │ and elected_tenures.                                 │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 3. Mock Data in      │ /party-projections/:stateCode uses static seed arrays│
│    Electoral Routes  │ rather than W019 normalized election contests.       │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 4. Unbound Timeline  │ /timeline and /status return hardcoded string arrays │
│    & Status Routes   │ rather than deriving from public.evidence_records and│
│                      │ public.delimitation_regimes.                         │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

Without G8, the delimitation engine would remain an isolated prototype alongside a canonical database, rather than an integrated component of the PANIN Political Geography Graph.

---

## 3. Current Repository & Database Ground Truth

W020-G8 starts strictly from the verified repository state at commit `65c32c8d62a3d5c4a42efe4adb6de5a6e8629fca`:

### 3.1 Live Staging Database (`panIN-staging` / `fkpigozcqnmcvofuksar`)
1. **`public.delimitation_regimes` (4 Canonical Regimes):**
   - `eci_delimitation_1976` (`HISTORICAL_LEGAL_REGIME`, `is_active: false`, `effective_from: 1976-01-01`).
   - `eci_delimitation_2008` (`CURRENT_LEGAL_REGIME`, `is_active: true`, `effective_from: 2008-02-19`).
   - `eci_delimitation_post2026` (`FUTURE_ANTICIPATED_REGIME`, `is_active: false`, `effective_from: 2026-01-01`).
   - `scenario_delimitation_draft_prop_1` (`SCENARIO_PROPOSED_REGIME`, `is_active: false`, `effective_from: 2026-01-01`).
2. **`public.delimitation_proposals` (2 Canonical Proposals):**
   - **Proposal 1 (`02010000-0000-0000-0000-000000000001`):** Statutory baseline (119 total / 19 SC / 12 ST / 88 General; `status: final`, `outputClassification: STATUTORY_FACT`, `dataStatus: OFFICIAL`, `legalStatus: CURRENT_LEGAL_REGIME`, `isScenario: false`).
   - **Proposal 2 (`02010000-0000-0000-0000-000000000002`):** PANIN Article 332 simulation (119 total / 18 SC / 10 ST / 91 General; `status: draft`, `outputClassification: DETERMINISTIC_DERIVED`, `dataStatus: DERIVED`, `legalStatus: SCENARIO_PROPOSED_REGIME`, `isScenario: true`).
3. **`public.constituency_mapping` (Strictly 0 Rows):**
   - Verified 0 rows.
   - AC-110, AC-118, AC-119 lineage claims strictly register `UNKNOWN` with G.S.R. 311(E) statutory transfer citation.
4. **`public.entity_geometries` (589 Rows):**
   - Exactly 589 rows, matching SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
5. **W018 & W019 Tables:**
   - `public.canonical_persons`, `public.political_organizations`, `public.elected_tenures`, `public.election_events`, `public.election_contests`, `public.ballot_choices`, `public.voting_channel_results` active and passing 100% of their invariant test suites.

### 3.2 Application Service & Route State
- `apps/api/src/services/delimitationService.ts` contains 14 calculation methods.
- `apps/api/src/services/delimitationQueryService.ts` contains 6 database-backed query methods.
- `apps/api/src/routes/delimitation.ts` exposes 20 endpoints in ECC-001 format.
- `packages/shared/src/contracts/delimitation.ts` defines all canonical types.

---

## 4. Why This Work Belongs in G8 Rather Than Later

1. **Constitutional Coherence:** W020 is defined as the *Delimitation Engine Foundation*. Leaving endpoints with hardcoded mock arrays violates the Definition of Done (Rule IV-001: "Truth in Engineering: Zero simulated, deceptive, or mock success responses").
2. **Predecessor Coupling Integrity:** W018 (Entities) and W019 (Elections) were explicitly designed to serve as the electoral and human substrate for delimitation impact modeling. Connecting them in G8 proves that the platform's layers compose properly.
3. **Downstream Blocker:** W021 (Electoral Demographic Forecasting) requires a unified delimitation API that accurately calculates seat allocations against real election contests and sitting legislators. If deferred to W021, W021 would be overwhelmed by foundational refactoring.

---

## 5. Existing Tables, Functions, Routes & Components Reused

W020-G8 reuses existing assets exclusively, with **zero new schema entities**:

```text
┌───────────────────────────┬─────────────────────────────────────────────────┐
│ ASSET / COMPONENT         │ REUSE FUNCTION IN W020-G8                       │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ delimitationQueryService  │ Core database retrieval & typed regime resolver.│
├───────────────────────────┼─────────────────────────────────────────────────┤
│ delimitationService       │ Hamilton largest remainder math & quotas.       │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ elected_tenures           │ Sources sitting MLA identity, party, & tenure.  │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ canonical_persons         │ Resolves verified MLA legal names.              │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ political_organizations   │ Resolves verified political party entities.     │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ election_contests         │ Sources total votes, turnout, & winning margins.│
├───────────────────────────┼─────────────────────────────────────────────────┤
│ ballot_choices            │ Sources party vote tallies for seat projections.│
├───────────────────────────┼─────────────────────────────────────────────────┤
│ evidence_records          │ Sources timeline events and legal citations.    │
├───────────────────────────┼─────────────────────────────────────────────────┤
│ delimitation_regimes      │ Governs constitutional status & temporal bounds.│
└───────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 6. What Must NOT Be Changed (Permanent Scope Guards)

- **ZERO Migrations:** No migration `056_*.sql` is authorized.
- **ZERO DDL / DML:** No `CREATE TABLE`, `ALTER TABLE`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` on the staging database.
- **ZERO Production Access:** Production `ehfafcnimmjusyvplbah` remains air-gapped.
- **ZERO Mobile Modifications:** `apps/mobile/**` remains 100% frozen.
- **ZERO Geometry Changes:** 589 rows in `entity_geometries` remain frozen (`f839fa02...`).
- **ZERO Speculative Mappings:** `constituency_mapping` remains at 0 rows.
- **ZERO Constituency Lineage Inventions:** AC-110, AC-118, AC-119 remain strictly `UNKNOWN`.
- **ZERO Ad-Hoc Scenario Identities:** No "scenario keys" or client-supplied scenario flags.

---

## 7. Whether Persistence is Actually Required

**NO PERSISTENCE IS REQUIRED.**  
All necessary tables, columns, foreign keys, indexes, and RLS policies were established in Migration 055 (W020-G4) and populated in W020-G6. W020-G8 is strictly a service-layer and integration-level enhancement within `apps/api`. No new columns or tables are justified or required.

---

## 8. Separation of Semantic Planes & Article 170 Invariant Boundary

### 8.1 Deconstruction of the Six Semantic Planes
Under CTO Directive W020-G8 REV-1.1, delimitation metrics and invariants must never conflate mathematical limits, constitutional rules, historical facts, and simulations into an ad-hoc universal rule. PANIN enforces six strictly separated semantic planes:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE SIX SEMANTIC PLANES OF PANIN                      │
├─────────────────────────────┬───────────────────────────────────────────────┤
│ 1. Constitutional /         │ Statutory and constitutional legal rules.     │
│    Statutory Constraints    │ E.g. Article 170(1) (60 <= S <= 500 for state │
│                             │ assemblies), subject to specific constitutional│
│                             │ exceptions (Sikkim 32, Goa 40, Mizoram 40,   │
│                             │ Puducherry 30). Applicable ONLY where the law │
│                             │ governs the entity.                           │
├─────────────────────────────┼───────────────────────────────────────────────┤
│ 2. Historical Legal Facts   │ Immutable past statutory baselines enacted by │
│                             │ orders of Delimitation Commissions.           │
│                             │ E.g. composite AP 294 ACs under 2008 Order.   │
├─────────────────────────────┼───────────────────────────────────────────────┤
│ 3. Current Legal Facts      │ Enacted statutory baselines governing current │
│                             │ jurisdictions. E.g. APRA 2014 Sec 15 assigning│
│                             │ 119 ACs to Telangana (Schedule XXXI).         │
├─────────────────────────────┼───────────────────────────────────────────────┤
│ 4. PANIN Deterministic      │ Mathematical invariants of the computational  │
│    Computational Constraints│ engine. E.g. Hamilton quota conservation      │
│                             │ (sum(S_alloc) == S_target), non-negativity.   │
├─────────────────────────────┼───────────────────────────────────────────────┤
│ 5. Scenario / Proposed      │ Research simulations and hypothetical models. │
│    Outputs                  │ Always strictly NON-STATUTORY. Must carry     │
│                             │ mandatory scenario metadata & disclaimer.     │
├─────────────────────────────┼───────────────────────────────────────────────┤
│ 6. Resource-Safety / Input  │ Pure ingress validation limits to protect     │
│    Validation Limits        │ server CPU/memory (MAX_SAFE_REQUESTED_SEATS = │
│                             │ 10000). ZERO legal or constitutional meaning. │
└─────────────────────────────┴───────────────────────────────────────────────┘
```

### 8.2 Non-Universality of Article 170 Bounds
1. **Applicability Scope:** Article 170(1) bounds ($60 \le S \le 500$) apply **only** where the selected legal regime and applicable constitutional/statutory rule actually make the constraint legally applicable (namely, standard Indian State Legislative Assemblies governed by Article 170).
2. **Constitutional Exceptions:** Article 170 does NOT apply uniformly to all legislative bodies:
   - State of Sikkim: 32 seats (governed by Article 371F(f)).
   - State of Goa: 40 seats (governed by Article 371I).
   - State of Mizoram: 40 seats (governed by Article 371G).
   - Union Territory of Puducherry: 30 seats (governed by the Government of Union Territories Act, 1963, Section 3).
3. **No Spillover to Other Planes:** Historical regimes, scenario/exploratory models, hypothetical mathematical distributions, or non-state entities **MUST NOT** receive an unconditional Article 170 constraint merely because they involve seat-count arithmetic.
4. **Computational Safety Ceiling:** `MAX_SAFE_REQUESTED_SEATS = 10000` is solely a Denial-of-Service / integer-overflow guard on Fastify route ingress. It is independent of constitutional semantics, carries zero legal force, and must never be represented as statutory truth.

### 8.3 Invariant Classification Taxonomy
All invariant assertions in W020-G8 are classified explicitly into four categories:
- `LEGAL_INVARIANT`: Verifies adherence to an evidenced statutory or constitutional provision.
- `COMPUTATIONAL_INVARIANT`: Verifies mathematical integrity (zero seat loss, exact quotient/remainder balance).
- `DERIVED_MATHEMATICAL_INVARIANT`: Verifies reproducible PANIN algorithmic calculations from source datasets.
- `SCENARIO_INVARIANT`: Verifies isolation, mandatory disclaimers, and derived `isScenario` flags on simulation outputs.

---

## 9. Mock Data Replacement & Fail-Closed Sourcing Semantics

### 9.1 Sourcing Rules
Existing static/mock values in `apps/api/src/routes/delimitation.ts` and `apps/api/src/services/delimitationService.ts` must be replaced **strictly** with actual canonical data or deterministic derivations with valid provenance:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MOCK DATA REPLACEMENT PROTOCOL                         │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ 1. Sitting MLAs      │ Query public.elected_tenures joined to               │
│    (/mla-impact)     │ public.canonical_persons and political_organizations │
│                      │ on panIN-staging.                                    │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 2. Certified Margins │ Query public.election_contests for winning margins   │
│    (/mla-impact)     │ and turnout from verified 2023 election results.     │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 3. Party Vote Share  │ Query public.ballot_choices and election_contests    │
│    (/party-proj)     │ on panIN-staging for certified party vote totals.    │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 4. Timeline Events   │ Query public.evidence_records on panIN-staging for   │
│    (/timeline)       │ verified gazette orders and citations.               │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ 5. Regime Status     │ Query public.delimitation_regimes on panIN-staging   │
│    (/status)         │ for active legal regime validity and freeze status.  │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 9.2 Fail-Closed Behavior When Canonical Data is Absent
1. **Never Fabricate:** If canonical data for an entity, candidate, or jurisdiction is absent from the staging database:
   - The engine must return `UNKNOWN`, `NULL`, or an explicit unavailable response (e.g. HTTP 404 `UNSUPPORTED_GEOGRAPHY`).
   - The engine must NOT invent synthetic candidate names, party affiliations, or vote margins.
   - The engine must NOT infer unsupported political or electoral values from proximity or demographic heuristics.
2. **Never Masquerade:** The engine must NOT silently convert unevidenced mock values into `DERIVED` data.
3. **No License for Invention:** Removing mock data does NOT authorize creating substitute data without evidence. Where authoritative records are absent, `UNKNOWN` must remain `UNKNOWN`.

---

## 10. Security & RLS Implications

- All database queries for W018/W019 entities and delimitation tables will be executed via Supabase client using least-privilege `SELECT`.
- RLS remains active on all 14 queried tables.
- No `SECURITY DEFINER` procedures with mutable `search_path` will be introduced.
- Ingress parameters will be validated using Fastify JSON Schema (Ajv).
- Ingress computational limits (`MAX_SAFE_REQUESTED_SEATS = 10000`) remain enforced to protect server resources.

---

## 11. API Contract Implications

- All 20 existing endpoints in `apps/api/src/routes/delimitation.ts` will maintain **100% backward compatibility**.
- Response payloads will remain wrapped in canonical `ApiSuccessEnvelope<T>`.
- Ingress schemas will optionally accept the standardized `RegimeSelectionQuery` parameters (`mode`, `date`, `regimeId`, `proposalId`).
- Zero drift will occur against declared contracts in `scripts/check-api-contract-drift.mjs`.

---

## 12. Master Domain Invariants Classified by Semantic Plane

| Invariant Class | Identifier | Invariant Statement | Verification Method |
| :--- | :--- | :--- | :--- |
| **COMPUTATIONAL_INVARIANT** | `INV-MTH-01` | $\sum S_{\text{allocated}} \equiv S_{\text{target}}$ (Zero seat loss law). | Seat sum assertion across all remainder distributions. |
| **COMPUTATIONAL_INVARIANT** | `INV-MTH-02` | $S_{\text{SC}} + S_{\text{ST}} + S_{\text{Gen}} \equiv S_{\text{total}}$ (Quota conservation law). | Quota partition balance assertion. |
| **LEGAL_INVARIANT** | `INV-LEG-01` | Standard State Assemblies under Article 170 satisfy $60 \le S \le 500$; constitutional exceptions (Sikkim 32, Goa 40, Mizoram 40, Puducherry 30) respected. | Regime-scoped assembly bound assertion. |
| **LEGAL_INVARIANT** | `INV-LEG-02` | APRA 2014 Sec 15 assigns exactly 119 ACs to Telangana and 175 ACs to residuary AP. | Statutory baseline assertion against Schedule XXXI. |
| **LEGAL_INVARIANT** | `INV-LEG-03` | `public.constituency_mapping = 0 rows`; AC-110, AC-118, AC-119 lineage is `UNKNOWN`. | Negative evidence query assertion. |
| **DERIVED_MATHEMATICAL_INVARIANT**| `INV-DER-01` | Candidate total votes match sum of evidenced channels or remain channel-unknown (W019). | Ballot choices channel sum assertion. |
| **SCENARIO_INVARIANT** | `INV-SCN-01` | `isScenario` is derived strictly from `(legalStatus === 'SCENARIO_PROPOSED_REGIME')`. | Response payload attribute type assertion. |
| **COMPUTATIONAL_INVARIANT** | `INV-SAF-01` | Ingress $S > 10000$ fails closed with 400 (Resource-safety limit only; no legal force). | Input validation boundary probe. |
| **LEGAL_INVARIANT** | `INV-GEO-01` | 589 PostGIS geometry rows match digest `f839fa02...`. | Byte-exact SHA-256 digest assertion. |

---

## 13. Semantic Test Strategy (`tests/delimitation-g8-integration.test.mjs`)

W020-G8 will implement `tests/delimitation-g8-integration.test.mjs` containing **25 non-tautological semantic invariant tests** organized across five verification planes:

- **Plane 1: Cross-Domain Entity Linkage (W018/W019 Integration)**
  - `W020-G8-INT-01` (`LEGAL_INVARIANT`): `/mla-impact/:stateCode` queries `public.elected_tenures` and `canonical_persons` for sitting MLAs on staging.
  - `W020-G8-INT-02` (`LEGAL_INVARIANT`): `/party-projections/:stateCode` binds party seat models to W019 normalized election contest tallies.
  - `W020-G8-INT-03` (`LEGAL_INVARIANT`): Unregistered jurisdictions fail closed with structured 404 `UNSUPPORTED_GEOGRAPHY`.
  - `W020-G8-INT-04` (`LEGAL_INVARIANT`): Missing MLA or candidate records return `UNKNOWN` without fabricating synthetic records.
  - `W020-G8-INT-05` (`LEGAL_INVARIANT`): Winning margins in MLA impact match official W019 certified results.

- **Plane 2: Regime-Gated Simulation & Projection Harmonization**
  - `W020-G8-SIM-01` (`SCENARIO_INVARIANT`): `/simulate/:stateCode` with `mode: 'current'` evaluates against statutory baseline (Proposal 1).
  - `W020-G8-SIM-02` (`SCENARIO_INVARIANT`): `/simulate/:stateCode` with `mode: 'scenario'` evaluates against Proposal 2 simulation.
  - `W020-G8-SIM-03` (`SCENARIO_INVARIANT`): Non-scenario regimes reject simulation overrides fail-closed.
  - `W020-G8-SIM-04` (`COMPUTATIONAL_INVARIANT`): Projected seats strictly conserve total seats ($\sum S_{\text{districts}} \equiv S_{\text{target}}$).
  - `W020-G8-SIM-05` (`LEGAL_INVARIANT`): Article 170 assembly bounds ($60 \le S \le 500$) enforced conditionally only on standard state legislative assembly regimes, not universally on scenarios or exceptions.

- **Plane 3: Evidence-Linked Timeline & Status Derivation**
  - `W020-G8-EVI-01` (`LEGAL_INVARIANT`): `/timeline` derives historical events from `public.evidence_records`.
  - `W020-G8-EVI-02` (`LEGAL_INVARIANT`): Timeline events carry byte-exact statutory identifiers (`G.S.R. 311(E)`, `282/AP/2018(DEL)`).
  - `W020-G8-EVI-03` (`LEGAL_INVARIANT`): `/status` reflects active status flags from `public.delimitation_regimes`.
  - `W020-G8-EVI-04` (`LEGAL_INVARIANT`): 84th Constitutional Amendment freeze post-2026 reflected without treating Census 2027 as concluded.
  - `W020-G8-EVI-05` (`LEGAL_INVARIANT`): Provenance records link to official gazette citations under `ON DELETE RESTRICT`.

- **Plane 4: Negative Path & Fail-Closed Invariants**
  - `W020-G8-NEG-01` (`COMPUTATIONAL_INVARIANT`): Malformed regime selection queries fail closed with structured 400.
  - `W020-G8-NEG-02` (`COMPUTATIONAL_INVARIANT`): Ambiguous scenario selector (both `proposalId` and `regimeId`) fails closed with 400.
  - `W020-G8-NEG-03` (`SCENARIO_INVARIANT`): Client-supplied `isScenario` parameter fails closed with 400 `SCENARIO_INPUT_FORBIDDEN`.
  - `W020-G8-NEG-04` (`COMPUTATIONAL_INVARIANT`): Mutating HTTP methods (POST, PUT, DELETE) to query routes return 404.
  - `W020-G8-NEG-05` (`COMPUTATIONAL_INVARIANT`): Ingress requested seats exceeding `MAX_SAFE_REQUESTED_SEATS` (10000) fail closed with 400 (classified as computational resource-safety limit).

- **Plane 5: Environmental & Baseline Immutability**
  - `W020-G8-ENV-01` (`LEGAL_INVARIANT`): PostGIS 589 geometry digest verified byte-exact against `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
  - `W020-G8-ENV-02` (`LEGAL_INVARIANT`): Production database `ehfafcnimmjusyvplbah` verified 100% air-gapped and untouched.
  - `W020-G8-ENV-03` (`LEGAL_INVARIANT`): Mobile codebase `apps/mobile/**` verified 100% frozen (0 file edits).
  - `W020-G8-ENV-04` (`LEGAL_INVARIANT`): `public.constituency_mapping` verified strictly at 0 rows.
  - `W020-G8-ENV-05` (`LEGAL_INVARIANT`): AC-110, AC-118, AC-119 lineage claims verified strictly `UNKNOWN`.

---

## 14. Full Master Regression Matrix (322 Tests Required)

To guarantee that zero regression occurs across the entire platform, the implementation gate will execute the complete regression battery:

| Test Suite | File / Command | Target Area | Checks |
| :--- | :--- | :--- | :--- |
| **W018 Political Entities** | `node tests/political-entities-invariants.test.mjs` | Political entities, tenures, defections | 53 |
| **W019 Election Normalization** | `node tests/election-normalization-invariants.test.mjs` | Election contests, candidacies, channels | 93 |
| **W020-G4 Bridge Preflight** | `node tests/delimitation-migration-055-preflight.test.mjs` | Migration 055 schema bridge | 23 |
| **W020-G5 Engine Invariants** | `node tests/delimitation-g5-invariants.test.mjs` | Hamilton largest remainder math & quotas | 34 |
| **W020-G5 Route Tests** | `npm test --prefix apps/api -- delimitation.test.ts` | Fastify delimitation route integration | 33 |
| **W020-G6 Ingestion Invariants** | `node tests/delimitation-g6-ingestion.test.mjs` | Historical evidence & proposal population | 27 |
| **W020-G7 Query Surface** | `node tests/delimitation-g7-query-surface.test.mjs` | Read-only typed regime query surface | 25 |
| **API Contract Drift** | `node scripts/check-api-contract-drift.mjs` | Contract synchronization across routes | 9 |
| **W020-G8 Integration Battery**| `node tests/delimitation-g8-integration.test.mjs` | Harmonized cross-domain integration | 25 |
| **TOTAL** | — | — | **322** |

**Requirement:** All **322 / 322 tests** must pass with 100.0% success rate.

---

## 15. Failure & Rollback Semantics

Because W020-G8 executes **zero database mutations**, rollback is purely non-destructive and operational:
1. **Code Reversal:** Any failure during integration testing or verification will be rolled back by discarding or reverting git modifications to `apps/api/src/services/` and `apps/api/src/routes/`.
2. **Database Integrity:** Zero database rollbacks or down-migrations are required. The staging database schema and data remain identical to the accepted G6/G7 baseline.
3. **Fail-Closed Error Handling:** In case of database connectivity interruptions to `panIN-staging`, all routes fail closed with structured 500/503 error envelopes without falling back to unevidenced mock data.

---

## 16. Staging Execution Boundary

- Target Database: `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`).
- Access Mode: Strictly **READ-ONLY** (`SELECT` queries only).
- Zero migrations applied.
- Zero DML rows inserted, updated, or deleted.

---

## 17. Production Boundary

- Target Database: `ehfafcnimmjusyvplbah.supabase.co`.
- Access Policy: **STRICTLY AIR-GAPPED & UNTOUCHED**.
- Zero network traffic permitted. Zero credentials active in environment.

---

## 18. Acceptance Evidence Requirements

Before Milestone W020-G8 may be considered for CTO acceptance review:
1. **Implementation Report:**
   - `reports/w020_g8_implementation_report.md`
   - `reports/w020_g8_implementation_report.json`
2. **Automated Test Results:**
   - 322 / 322 tests passing with verbatim logs.
3. **Workspace Builds:**
   - `npm run build --prefix packages/shared` (Exit 0)
   - `npm run build --prefix apps/api` (Exit 0)
   - `npx tsc --noEmit -p apps/mobile/tsconfig.json` (Exit 0)
4. **Governance Checks:**
   - `node tests/commit-freshness.test.mjs` (Pass)
   - `node scripts/check-repo-evidence-integrity.mjs` (Pass)
5. **Registers Updated:**
   - `ACCEPTANCE_REGISTER.md`
   - `DECISION_LOG.md`
   - `EXECUTION_STATE.md`

---

## 19. Mandatory Governance Halt

```text
================================================================================
MANDATORY GOVERNANCE HALT — MILESTONE W020-G8
================================================================================
PLAN DOCUMENT:                PLAN-W020-G8-REV-1.1.md
DOCUMENT STATUS:              DRAFT / SUBMITTED FOR CTO RATIFICATION
IMPLEMENTATION AUTHORIZATION: STRICTLY NOT AUTHORIZED (NO)
NEXT PERMITTED ACTION:        AWAIT FORMAL CTO REVIEW & RATIFICATION DIRECTIVE
================================================================================
- Zero product code modifications have been made.
- Zero database migrations, DDL, or DML have been executed.
- The mobile codebase remains 100% frozen.
- The production database remains 100% air-gapped.
- The 589 PostGIS geometry baseline remains frozen.
- The implementing agent explicitly does NOT self-certify or self-accept.
- Execution is strictly halted.
================================================================================
```
