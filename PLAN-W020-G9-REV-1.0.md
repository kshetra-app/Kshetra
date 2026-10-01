# PLAN-W020-G9: AUTOMATED REGRESSION HARNESS HARDENING, CROSS-DOMAIN AUDIT SYNTHESIS & END-TO-END VERIFICATION GATE

**Document Identifier:** `PLAN-W020-G9-REV-1.0`  
**Milestone:** W020-G9 (Delimitation Engine Foundation — Verification Harness Hardening, Cross-Domain Audit Synthesis & Final Milestone Gate)  
**Parent Milestone:** W020 (Delimitation Engine Foundation)  
**Authority Directive:** `CTO AUTHORIZATION — NEXT MILESTONE: W020-G9 PLANNING ONLY` (2026-10-01)  
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
- W020-G8: Delimitation Engine Foundation & Canonical Integration — `ACCEPTED / COMPLETE / CLOSED` (Commit `f7fd1fa`)

---

```text
================================================================================
GOVERNANCE & ENVIRONMENT ENCLOSURE — MILESTONE W020-G9 REV-1.0
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
CODE MUTATIONS AUTHORIZED:            ZERO (0 product code modifications)
MANDATORY STOP STATE:                 HALT AFTER PLAN SUBMISSION AWAITING CTO REVIEW
================================================================================
```

---

## 1. Current Accepted Architecture

As of commit `f7fd1fa`, the repository possesses an accepted, operational architectural foundation spanning W014 through W020-G8:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      ACCEPTED KSHETRA / PANIN ARCHITECTURAL STACK                      │
├────────────────────────┬───────────────────────────────────────────────────────────────┤
│ W014 Temporal Core     │ Canonical half-open interval model [valid_from, valid_to).     │
│                        │ valid_from is inclusive, valid_to is exclusive. NULL is       │
│                        │ open-ended (valid across all subsequent epochs).              │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W016 Spatial Moat      │ Read-only frozen PostGIS baseline of 589 mandal geometries.   │
│                        │ SHA-256 digest: f839fa02980318a8f35f932ebe72fa1d3ad6325dc86...│
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W018 Political Model   │ Migration 050 schema: canonical_persons, political_parties,   │
│                        │ elected_tenures, party affiliations & defection audit logs.   │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W019 Election Baseline │ Migrations 051–054: normalized election contests, candidate-  │
│                        │ level EVM vs postal vote channels, fail-closed vote balance.  │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W020-G4 Bridge Schema  │ Migration 055: delimitation_proposals and constituency_mapping │
│                        │ foreign keys to regimes, evidence_records, and versions.      │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W020-G5 Engine Core    │ Pure mathematical demographic apportionment, Hare-Niemeyer / │
│                        │ Largest Remainder algorithm, Article 170 / 332 quota rules.   │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W020-G6 Ingestion      │ Authoritative historical evidence, canonical regime records,  │
│                        │ Proposals 1 & 2 populated on panIN-staging (fkpigozcqnmcv...).│
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W020-G7 Query Surface  │ Read-only typed Fastify query routes with fail-closed W014    │
│                        │ regime resolution across 5 selection modes.                   │
├────────────────────────┼───────────────────────────────────────────────────────────────┤
│ W020-G8 Integration &  │ Dynamic Six-Coordinate Legal Applicability Resolver:          │
│ Legal Applicability    │ (1. Entity Type, 2. Legal Regime, 3. Constitutional Provision,│
│                        │  4. Statutory Provision, 5. Temporal Validity, 6. Provenance). │
│                        │ Successor boundary continuity: T6-A..T6-H verified.           │
│                        │ Master battery: 352/352 tests passing (100.0%).               │
└────────────────────────┴───────────────────────────────────────────────────────────────┘
```

The six orthogonal semantic planes established and proven in W020-G8 remain non-negotiable architectural axioms:
1. **Constitutional Plane:** General principles (Art 170(1) 60–500; Art 371-I min 30 for Goa; Art 330/332 SC/ST quotas).
2. **Statutory Plane:** Enabling legislation and reorganisation acts (e.g. APRA 2014 Sec 17 & Sched XXXI; Goa Reorg Act 1987 Sec 12; UT Act 1963 Sec 3).
3. **Territorial / Jurisdictional Plane:** State existence boundaries (Telangana valid strictly from 2014-06-02 appointed day; historical composite AP terminates 2014-06-02 exclusive).
4. **Factual Assembly Plane:** Real historical seats (Telangana: 119; AP composite: 294; AP residuary: 175; Goa: 40; Puducherry: 30).
5. **System / Engineering Plane:** Memory allocation safety limits (`MAX_SAFE_REQUESTED_SEATS = 10000`).
6. **W014 Legal Regime Plane:** Temporal version binding (`CURRENT_LEGAL_REGIME`, `HISTORICAL_STATUTORY_REGIME`, `SCENARIO_PROPOSED_REGIME`, `FUTURE_ANTICIPATED_REGIME`).

---

## 2. Exact G9 Objective

Milestone **W020-G9** is designated as the **Automated Verification Harness Hardening, Cross-Domain Audit Synthesis & Final Milestone Gate** for the Delimitation domain.

Its precise objectives are:
1. **Unified Test Harness Consolidation:** Unify the fragmented test executions (which currently require invoking 7 separate test scripts and Jest suites across different directories) into a single deterministic, tamper-proof, executable master runner (`scripts/run-w020-master-battery.mjs`).
2. **End-to-End Cross-Domain Verification:** Formulate comprehensive end-to-end integration assertions verifying that delimitation simulations and queries correctly consume live data across all four upstream domains (W014 geography versions, W016 PostGIS entities, W018 elected tenures, and W019 normalized candidate election results) under strict concurrency and edge-case loads without state leak or cross-talk.
3. **Formal Verification of Non-Functional Constraints:** Validate query latency budgets, memory heap ceiling constraints under repeated scenario generation, fail-closed error envelope compliance (`ECC-001`), and contract drift invariance across all 19 Fastify delimitation routes.
4. **Audit Synthesis & Technical Dossier Generation:** Synthesize a single authoritative, mathematically verifiable audit dossier (`reports/w020_master_audit_dossier.json` and `.md`) compiling the entire cryptographic evidence chain (from 1976 Delimitation Order through Census 2011 to APRA 2014 and 2018 ECI notification), proving that zero mock placeholders, zero undocumented constants, and zero unverified temporal intervals remain in the engine.
5. **Formal Sealing of Milestone W020:** Provide the required empirical proof package enabling the CTO to declare Milestone W020 (Delimitation Engine Foundation) fully completed and sealed, unblocking downstream mobile presentation consumption in W021/W023.

---

## 3. Why G9 is Required

Although W020-G8 achieved 352/352 passing tests and resolved all legal applicability defects, several operational and architectural risks persist if W020 were closed without G9:

1. **Fragmented Test Invocation Risk:** Currently, validating the complete delimitation engine requires running:
   - `node tests/delimitation-migration-055-preflight.test.mjs` (23 tests)
   - `node tests/delimitation-g5-invariants.test.mjs` (34 tests)
   - `npm test --prefix apps/api -- delimitation.test.ts` (33 tests)
   - `node tests/delimitation-g6-ingestion.test.mjs` (27 tests)
   - `node tests/delimitation-g7-query-surface.test.mjs` (25 tests)
   - `node tests/delimitation-g8-integration.test.mjs` (25 tests)
   - `node tests/delimitation-legal-applicability.test.mjs` (30 tests)
   - Plus upstream domain suites: `political-entities-invariants.test.mjs` (53 tests) and `election-normalization-invariants.test.mjs` (93 tests).
   A developer or CI runner omitting even one runner could mask critical regressions. A unified master harness is essential.
2. **Concurrency & Memory Leak Uncertainty:** The Hare-Niemeyer seat allocation and district simulation engine performs in-memory quota calculations and largest-remainder sorting. Under concurrent HTTP requests, memory stability and execution deadlines have not been empirically benchmarked.
3. **Cross-Domain Pipeline Integrity:** G8 verified individual endpoint responses, but G9 must verify multi-step workflows: e.g. querying an MLA's vulnerability score, looking up their canonical election margin from W019, cross-referencing their tenure in W018, and testing whether temporal regime shifting alters their seat boundary risk deterministically.
4. **Audit Trail Sealing:** Downstream milestones (especially mobile presentation in W021 and public release in W023) require a single, immutable certification document attesting that every delimitation formula, citation, and boundary complies with constitutional jurisprudence.

---

## 4. Existing Capability Inventory

| Component | File Path | Current Capabilities |
| :--- | :--- | :--- |
| **Delimitation Algorithmic Service** | `apps/api/src/services/delimitationService.ts` | Hare-Niemeyer seat distribution, Article 170 bounds enforcement, Article 332 SC/ST quota derivation, ideal population divisor calculations, simulation metadata wrapping. |
| **Delimitation Query Service** | `apps/api/src/services/delimitationQueryService.ts` | Read-only PostgREST querying of `delimitation_regimes`, `delimitation_proposals`, `constituency_mapping`, and `evidence_records`. Dynamic 6-coordinate Legal Applicability Resolver (`resolveLegalApplicability`). Canonical W014 selection modes. |
| **Fastify Delimitation Routes** | `apps/api/src/routes/delimitation.ts` | 19 HTTP endpoints: 14 baseline simulation/projection routes + 5 G7 canonical regime/proposal routes. ECC-001 compliant error handling. |
| **Shared Contracts & Schemas** | `packages/shared/src/contracts/delimitation.ts` | Strict TypeScript types: `OutputClassification`, `PoliticalEntityType`, `GovernedLegalRule`, `LegalApplicabilityContext`, `ResolvedLegalApplicability`, `DelimitationSelectionMode`, `DelimitationRegimeRecord`, `DelimitationProposalRecord`. |
| **Authoritative Evidence Dossiers** | `data/evidence/w020/authoritative/` | Statutory text and JSON dossiers: 2008 Delimitation Order (Sched II/XXXI), APRA 2014, G.S.R. 311(E) 2015, ECI Notification 282/AP/2018(DEL). |
| **Staging Database Schema** | `panIN-staging` (`fkpigozcqnmcvofuksar`) | Migration 055 schema: `delimitation_proposals` (2 rows), `constituency_mapping` (0 rows), `delimitation_regimes` (4 rows), `evidence_records` (5 rows). |
| **PostGIS Geometry Baseline** | `panIN-staging` (`fkpigozcqnmcvofuksar`) | 589 rows in `entity_geometries` (SHA-256: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`). |

---

## 5. Gap Analysis

| Item | Current State | Required G9 State | Severity |
| :--- | :--- | :--- | :--- |
| **Master Harness** | 8 separate scripts and test files invoked individually. | Single unified command `node scripts/run-w020-master-battery.mjs` running all 352+ assertions deterministically with zero race conditions. | HIGH |
| **Concurrency Benchmark** | Tested under sequential execution only. | Multi-client synthetic concurrency test (50 concurrent requests against simulation and query endpoints) proving 0 race conditions, 0 heap leaks, and $P95 < 200\text{ms}$. | MEDIUM |
| **Error Envelope Rigor** | Standard Fastify schema validation active. | Explicit assertion that all error responses conform to `ECC-001` envelope structure (`success: false`, `error: { code, message, details }`, zero stack traces). | HIGH |
| **Master Audit Dossier** | Evidence dispersed across 6 separate reports in `reports/`. | Consolidated `reports/w020_master_audit_dossier.json` and `.md` linking all statutory citations, SHA-256 digests, and invariant passes. | HIGH |
| **Cross-Domain E2E Chains** | Endpoints tested in isolation. | Multi-stage integration tests chaining W014 -> W016 -> W018 -> W019 -> W020 data flows. | MEDIUM |

---

## 6. Dependencies on W014–W020

Milestone W020-G9 has strict, immutable upstream dependencies. None of these components may be reopened or modified:

1. **W014 Temporal Versioning:** The half-open interval model $[valid\_from, valid\_to)$ is frozen. G9 consumes this logic exclusively.
2. **W016 PostGIS Baseline:** 589 mandal geometries on staging are strictly read-only and frozen.
3. **W018 Political Entities:** `canonical_persons`, `political_organizations`, and `elected_tenures` are authoritative sources for sitting MLA data.
4. **W019 Election Contests:** `election_contests` and `ballot_choices` are authoritative sources for party projections and candidate vote distributions.
5. **W020-G4 Database Schema:** Migration 055 foreign key graph (`fk_delim_prop_regime`, `fk_delim_prop_evidence`, `fk_const_map_proposal`, `fk_const_map_version`, `fk_const_map_pred_version`) is locked.
6. **W020-G5 Engine:** Algorithmic calculation formulas (Hare-Niemeyer, Article 170, Article 332) are locked.
7. **W020-G6 Ingested Records:** Proposals 1 & 2, 4 regimes, and 5 evidence records in staging are frozen.
8. **W020-G7 Query Surface:** Fastify route signatures and response contracts in `delimitation.ts` are frozen.
9. **W020-G8 Legal Applicability:** The Six-Coordinate Model and canonical `GOVERNED_LEGAL_RULES` catalog are frozen.

---

## 7. Data & Source Requirements

All data consumed by G9 verification must originate strictly from authoritative, source-controlled artifacts:
- **Census 2011 Primary Census Abstract:** Sourced strictly from `data/census/india-district-population-2011.ts`. Zero speculative population growth rates or extrapolated 2026/2027 population figures may be treated as facts.
- **Statutory Delimitation Orders:**
  - Delimitation Order 2008, Schedule II (Andhra Pradesh)
  - Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 17 & Schedule XXXI
  - Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 — G.S.R. 311(E)
  - Commission's Notification No. 282/AP/2018(DEL), dated 22 September 2018
- **ECI 2023 Telangana Election Results:** Authoritative candidate and contest totals from the ECI 2023 assembly election dataset.
- **Zero Synthetic Mock Data:** No mock candidate arrays, arbitrary seat allocations, or synthetic demographic values may be introduced.

---

## 8. Legal & Data-Governance Implications

1. **Constitutional Jurisprudence (Articles 82 & 170):** The engine must never present hypothetical seat reapportionment scenarios as legally operative delimitations. All scenario outputs must emit mandatory disclaimers and `is_scenario: true` flags.
2. **84th Constitutional Amendment:** The freeze on state-level parliamentary seat reapportionment until the first census post-2026 (Census 2027) must remain explicit across all methodology documentation.
3. **Statutory Territoriality:** The engine must accurately enforce territorial existence dates (e.g. Telangana exists as a State exclusively from 2 June 2014; composite AP terminates 2 June 2014 exclusive).
4. **Zero Legal Ambiguity:** The platform must distinguish between:
   - General constitutional provisions (e.g. Art 170(1))
   - Special constitutional provisions (e.g. Art 371-I for Goa)
   - Enabling statutory provisions (e.g. APRA 2014, Goa Reorg Act 1987)
   - Factual assembly configurations (e.g. 119 seats, 40 seats)
   - W014 legal regimes (e.g. `CURRENT_LEGAL_REGIME`, `HISTORICAL_STATUTORY_REGIME`).

---

## 9. Security Model

1. **Read-Only Access:** The query surface operates strictly in read-only mode (`SELECT` queries only).
2. **Row-Level Security (RLS):** All staging tables (`delimitation_regimes`, `delimitation_proposals`, `constituency_mapping`, `evidence_records`) enforce RLS policies allowing public read of verified/active regimes while protecting sensitive ingestion staging records.
3. **Input Validation & DoS Prevention:**
   - Parameter inputs are bound by Zod / Fastify schemas (`MAX_SAFE_REQUESTED_SEATS = 10000`, strictly bounded strings for state codes).
   - Fastify preValidation hook strictly rejects unauthorized `is_scenario` injections (`400 SCENARIO_INPUT_FORBIDDEN`).
4. **Information Disclosure Prevention:** Fastify error handling prevents internal SQL exception details or Node.js call stacks from leaking to clients (`ECC-001` error envelope).

---

## 10. API & Service Impact

- **Zero Breaking Contract Changes:** All 19 Fastify endpoints maintain their exact TypeScript contracts defined in `packages/shared/src/contracts/delimitation.ts`.
- **Contract Drift Invariance:** The 9 declared contract endpoints in `scripts/check-api-contract-drift.mjs` must maintain 100% synchronization (`D0_IN_SYNC`).
- **Unified Master Test Harness:** A new testing utility `scripts/run-w020-master-battery.mjs` will be created to execute all regression checks non-destructively in a single process.

---

## 11. Mobile Impact

- **Mobile Codebase Frozen:** `apps/mobile/**` remains 100% untouched throughout W020-G9.
- **Zero Mobile Edits:** No React Native files, hooks, services, or screens will be modified.
- **Zero APK Builds:** APK generation remains deferred to W023.

---

## 12. Persistence Requirements

- **ZERO Migrations:** No migration `056_*.sql` will be created.
- **ZERO DDL:** No tables, views, functions, or indexes will be added or altered.
- **ZERO DML:** No rows will be inserted, updated, or deleted on `panIN-staging`.
- **ZERO Production Access:** Production database `ehfafcnimmjusyvplbah` remains strictly air-gapped and untouched.

---

## 13. Performance Implications

1. **In-Memory Apportionment Speed:** Algorithmic calculation of state projections and Hare-Niemeyer seat allocations executes purely in memory ($O(N \log N)$ where $N$ is the number of districts/states; execution duration $< 5\text{ms}$).
2. **Query Latency:** Staging Supabase read operations for regimes and proposals execute with indexed lookups ($P95 < 50\text{ms}$).
3. **Synthetic Concurrency Budget:** Under a simulated load of 50 concurrent requests, total response latency must not exceed $200\text{ms}$ at $P95$, and memory RSS growth must remain $< 50\text{MB}$.

---

## 14. Failure & Degraded Semantics

The platform enforces strict fail-closed degradation across all operational scenarios:

| Failure Mode | HTTP Status | Error Code | Behavior |
| :--- | :--- | :--- | :--- |
| Invalid / Unsupported State Code | 400 | `UNSUPPORTED_GEOGRAPHY` | Fails closed with descriptive error; no fallback to default state. |
| Temporal Validity Mismatch | 400 / 422 | `TEMPORAL_VALIDITY_MISMATCH` | Rejects dates prior to entity creation or after regime expiry. |
| Client-Injected `is_scenario` Flag | 400 | `SCENARIO_INPUT_FORBIDDEN` | Rejects parameter tampering; scenario status derived solely by server. |
| Database Connection Interruption | 503 | `DATABASE_UNAVAILABLE` | Fails closed with `ECC-001` envelope; zero cached stale writes emitted. |
| Excessive Seat Request ($> 10000$) | 400 | `SEAT_BOUNDS_EXCEEDED` | Rejects payload before invoking calculation service. |

---

## 15. Provenance Requirements

Every record, calculation, and response must maintain unbroken provenance:
1. **Statutory Reference:** All official baselines cite their enabling statute (e.g. *Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 17 & Schedule XXXI*).
2. **Gazette & Order References:** Exact statutory identifiers must be preserved byte-for-byte (e.g. `G.S.R. 311(E)` dated `2015-04-23`; `282/AP/2018(DEL)` dated `2018-09-22`).
3. **Mathematical Derivation Disclaimers:** Every demographic projection must explicitly identify the population dataset (`census_2011_pca_v1`) and algorithm (`Hare-Niemeyer / Largest Remainder`).

---

## 16. Testing Strategy

The G9 testing strategy consolidates all existing test batteries and adds end-to-end multi-domain assertions:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        W020-G9 CONSOLIDATED TEST BATTERY MATRIX                        │
├─────────────────────────┬──────────────────────┬─────────────┬─────────────────────────┤
│ Domain / Test Suite     │ Test File            │ Assertions  │ Focus Area              │
├─────────────────────────┼──────────────────────┼─────────────┼─────────────────────────┤
│ W018 Political Entities │ political-entities   │ 53          │ Persons, tenures, party │
│ W019 Election Baseline  │ election-norm        │ 93          │ Contests, channels, sum │
│ W020-G4 Preflight       │ delim-migration-055  │ 23          │ Migration 055 schema    │
│ W020-G5 Invariants      │ delim-g5-invariants  │ 34          │ Core engine math        │
│ W020-G5 Fastify Routes  │ delimitation.test.ts │ 33          │ Route contracts & errs  │
│ W020-G6 Historical Ingest│ delim-g6-ingestion   │ 27          │ Evidence, regimes, prop │
│ W020-G7 Query Surface   │ delim-g7-query       │ 25          │ 5 typed selection modes │
│ W020-G8 Integration     │ delim-g8-integration │ 25          │ Cross-domain bridge     │
│ W020-G8 Legal Boundary  │ delim-legal-app      │ 30          │ 6-coord & half-open T1-7│
│ API Contract Drift      │ check-api-drift      │ 9           │ Contract drift sync     │
│ W020-G9 Master E2E      │ delim-g9-master-e2e  │ 15 (NEW)    │ Concurrency, ECC-001,   │
│                         │                      │             │ cross-domain workflows  │
├─────────────────────────┼──────────────────────┼─────────────┼─────────────────────────┤
│ TOTAL MASTER BATTERY    │ Unified Runner       │ 367 PASS    │ 100.0% Pass Rate Target │
└─────────────────────────┴──────────────────────┴─────────────┴─────────────────────────┘
```

The 15 new G9-specific end-to-end assertions will verify:
- **E2E-01:** High-concurrency scenario stress test (50 concurrent simulation queries return identical bitwise responses).
- **E2E-02:** Concurrency memory safety (RSS heap remains bounded under repeated simulations).
- **E2E-03:** Strict `ECC-001` error envelope verification across all error pathways (400, 404, 422, 500).
- **E2E-04:** Cross-domain sitting MLA resolution correctly merges W018 person name, tenure dates, and W019 margin.
- **E2E-05:** Cross-domain party projection correctly consumes W019 2023 election results for Telangana.
- **E2E-06:** Temporal boundary queries across 2014-06-01, 2014-06-02, and 2014-06-03 evaluate deterministically under high-throughput request interleaving.
- **E2E-07:** Anti-tamper verification: client-supplied `is_scenario: false` parameter on a simulation proposal strictly yields 400 `SCENARIO_INPUT_FORBIDDEN`.
- **E2E-08:** Anti-tamper verification: client-supplied `requestedSeats = 15000` strictly yields 400 `SEAT_BOUNDS_EXCEEDED`.
- **E2E-09:** Read-only query surface invariance: zero database mutations occur during 100 sequential mixed read/simulation requests.
- **E2E-10:** PostGIS geometry baseline digest verified untouched following full query suite execution.
- **E2E-11:** Canonical W014 half-open interval semantics enforced on all statutory temporal lookups.
- **E2E-12:** Non-statutory scenario disclaimers verified present in 100% of projection responses.
- **E2E-13:** Fastify route registration audit: all 19 endpoints registered with valid schemas.
- **E2E-14:** Shared contracts build verification (`packages/shared` cleanly compiles).
- **E2E-15:** API build verification (`apps/api` cleanly compiles with `tsc --noEmit`).

---

## 17. Evidence Strategy

To satisfy Master Execution Framework Amendment v1.2, v1.4, and v1.5 requirements, G9 will produce the following verifiable evidence artifacts upon implementation authorization:
1. `reports/w020_master_audit_dossier.json`: Comprehensive JSON report compiling all statutory citations, SHA-256 digests, and test outcomes.
2. `reports/w020_master_audit_dossier.md`: Human-readable markdown dossier for technical and legal review.
3. `reports/w020_g9_implementation_report.json`: Machine-verifiable run report from `scripts/run-w020-master-battery.mjs`.
4. Git commit coordinates verifying strict ancestry back to accepted commit `f7fd1fa`.

---

## 18. Rollback & Non-Destructive Strategy

Because Milestone W020-G9 involves:
- ZERO schema migrations,
- ZERO database DDL or DML mutations,
- ZERO persistent storage changes,
- ZERO mobile codebase alterations,

the rollback strategy is **100% non-destructive and instantaneous**:
- Any potential regression or defect discovered during verification can be remediated entirely in userland test scripts or domain service wrappers.
- In the worst-case scenario, reverting to git commit `f7fd1fa` restores the exact accepted W020-G8 state without any data loss, migration unwinding, or database restoration procedures.

---

## 19. Production Deployment Gates

The production environment (`ehfafcnimmjusyvplbah`) is subject to the following inviolable air-gap gates:
1. **Zero Production Access:** No CLI tools, scripts, or connections may target production during G9.
2. **Staging Environment Isolation:** All verification scripts execute strictly against local memory fixtures or `panIN-staging` (`fkpigozcqnmcvofuksar`).
3. **Geometry Digest Match:** The PostGIS 589 geometry baseline must match SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` before and after test runs.
4. **CTO Release Authorization:** Production deployment remains strictly locked under `W014-REL-01` and subsequent milestone gates.

---

## 20. Explicit Scope Exclusions

In strict compliance with the **Anti-Scope-Expansion Rule**, Milestone W020-G9 explicitly excludes and bars the following activities:
1. **National Election Ingestion:** Ingestion of national Lok Sabha election contests or other state assembly elections (outside the accepted 2023 Telangana baseline) is strictly excluded.
2. **Bulk Geography Ingestion:** Ingestion of national administrative boundaries or non-Telangana spatial polygons is strictly excluded.
3. **Constituency Lineage Completion:** Creating speculative predecessor/successor links for AC-110, AC-118, or AC-119 is strictly prohibited; their lineage remains strictly `UNKNOWN`.
4. **Political Persuasion & Campaign Functionality:** Developing voter persuasion metrics, candidate campaign tools, sentiment analysis, or election outcome predictions is strictly excluded.
5. **Advertising & Monetization Functionality:** Ad serving, sponsor integration, or promotional tracking features are strictly excluded.
6. **Mobile Implementation & Screens:** Modifying `apps/mobile/**`, authoring React Native components, or implementing delimitation UI screens is strictly excluded.
7. **APK Generation:** Native Android build generation and packaging remain deferred to Milestone W023.
8. **Production Database Migration:** Executing any DDL, DML, or data sync against production is strictly prohibited.

---

## 21. Stop State & Governance Declaration

```text
================================================================================
FINAL W020-G9 PLANNING STOP DECLARATION
================================================================================
- PLAN-W020-G9-REV-1.0.md is authored and deposited in the repository root.
- All 20 mandatory CTO plan sections are addressed with technical specificity.
- Status: DRAFT / SUBMITTED FOR CTO RATIFICATION.
- W020-G9 implementation is STRICTLY NOT AUTHORIZED (NO CODE MUTATIONS).
- Production database ehfafcnimmjusyvplbah remains 100% air-gapped and untouched.
- ACCEPTANCE_REGISTER.md is NOT updated with a premature G9 acceptance claim.
- Execution is HALTED awaiting written CTO ratification and direction.
================================================================================
```
