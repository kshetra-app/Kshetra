# PLAN-W020-G6: Historical Delimitation Evidence Ingestion & Canonical Bridge Population

**Milestone:** W020-G6 (Historical Delimitation Evidence Ingestion & Canonical Bridge Population)  
**Parent Job:** W020 (Delimitation Engine Foundation & Canonical Bridge)  
**Authority:** CTO FINAL ACCEPTANCE — W020-G5 (DEC-091)  
**Status:** `PROPOSED PLAN / AWAITING CTO RATIFICATION`  
**Implementation Authorization:** `STRICTLY NOT AUTHORIZED` (Planning Submission Only)  
**Timestamp:** 2026-09-30T09:30:00Z  
**Canonical Branch:** `master`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Mobile Status:** `apps/mobile/**` (STRICTLY FROZEN, 0 CHANGES)  
**PostGIS Baseline:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary & Purpose

### 1.1 Objective
Following the formal CTO technical acceptance of **W020-G5** (Delimitation Engine Foundation, DEC-091), milestone **W020-G6** specifies the ingestion of authoritative legal succession evidence, gazetted delimitation orders, historical proposals, and territorial constituency mappings into the database bridge tables established in **Migration 055** (W020-G4).

In W020-G4, Migration 055 added the required foreign key columns (`delimitation_regime_id`, `provenance_id`, `metadata` to `public.delimitation_proposals`; `constituency_version_id`, `predecessor_version_id`, `provenance_id` to `public.constituency_mapping`) and verified clean 0-row schema states.

In W020-G6, these tables will be populated with authoritative, referentially intact rows for:
1. **Authoritative Legal Succession Provenance:** Ingesting verified 5-stage statutory provenance records into `public.provenance_records`.
2. **Canonical Delimitation Regimes:** Reconciling active regime rows in `public.delimitation_regimes` to canonical W014 legal statuses (`CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`).
3. **Canonical Delimitation Proposals:** Populating `public.delimitation_proposals` with:
   - Official Delimitation 2008 / APRA 2014 baseline proposal for Telangana (119 seats, 19 SC, 12 ST, 88 General; `status: 'final'`, `delimitation_regime_id: 'eci_delimitation_2008'`).
   - Governed Academic Simulation Model 1 proposal (119 seats, 18 SC, 10 ST, 91 General; `status: 'draft'`, `delimitation_regime_id: 'scenario_delimitation_draft_prop_1'`, model metadata).
4. **Constituency Territorial Succession Mappings:** Populating `public.constituency_mapping` rows documenting the Khammam territorial transfer under the Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015 (G.S.R. 311(E)) and ECI Notification No. 282/AP/2018(DEL).
5. **Zero Mutation Guardrails:** Zero production queries or mutations, zero mobile changes, zero database schema migrations, and zero mutation to the 589 PostGIS geometry baseline.

---

## 2. Upstream Context & Acceptance Lineage

```text
W018 (Canonical Political Entity Model, 080344c) ──────────┐
                                                            ▼
W019 (Election Data Normalization, DEC-083) ───────────────┼──► W020-G4 (Migration 055 Canonical Bridge, DEC-084)
                                                            │     │
                                                            │     ▼
                                                            └──► W020-G5 (Delimitation Engine Foundation, DEC-091)
                                                                  │
                                                                  ▼
                                                                 W020-G6 (Historical Evidence Ingestion — THIS PLAN)
```

- **W018 Accepted:** Canonical party tenures, person identity ledger, and organization relationships.
- **W019 Accepted:** Complete candidate granularity (23 Case B candidates with UNKNOWN EVM/postal, 6 Case A conserved), Form 20/21E provenance dossiers.
- **W020-G4 Accepted:** Migration 055 schema bridge deployed and verified on staging with 5 foreign keys (ON DELETE RESTRICT), zero `is_scenario` columns.
- **W020-G5 Accepted:** Delimitation engine foundation in `apps/api/src/services/delimitationService.ts`, all 14 routes returning ECC-001 envelopes, derived `isScenario`, canonical W014 regimes, fail-closed `SCENARIO_INPUT_FORBIDDEN` hook, 34/34 invariants passing, 33/33 Jest tests passing.

---

## 3. Fact / Inference / Assumption / Unknown (FIAU) Register

| Category | Item Description | Authority / Ground Truth | Impact on G6 Specification |
|---|---|---|---|
| **FACT** | 1. Delimitation Order 2008 was notified on 19 Feb 2008 as Schedule II (State of Andhra Pradesh). | Delimitation Act, 2002; Schedule II | Baseline statutory order for composite AP. |
| **FACT** | 2. APRA 2014 (Act No. 6 of 2014) bifurcated Schedule II into Schedule XXXI (Telangana: 119 ACs) and Schedule II (AP: 175 ACs), effective 2014-06-02. | Gazette of India, Act No. 6 of 2014 | Legal succession event 2; statutory allocation: 119 ACs (19 SC, 12 ST). |
| **FACT** | 3. AP Reorganisation (Removal of Difficulties) Order, 2015 is **G.S.R. 311(E)**, dated **23 April 2015**, and "comes into force at once". | Gazette of India Extraordinary, G.S.R. 311(E) | Transferred 7 mandals (specified villages) of Khammam to AP for Polavaram project. |
| **FACT** | 4. ECI Notification **282/AP/2018(DEL)** was executed on **22 September 2018** (published 24 September 2018). | Gazette of India Extraordinary, ECI Notification | Amended constituency extents of Schedule II & XXXI following G.S.R. 311(E). |
| **FACT** | 5. The current statutory reservation baseline for Telangana Assembly is **119 Total, 19 SC, 12 ST, 88 General** (`STATUTORY_FACT`, `OFFICIAL`, `CURRENT_LEGAL_REGIME`). | ECI Delimitation Order 2008 read with APRA 2014 | Governed baseline. Must NOT be overwritten by mathematical simulations. |
| **FACT** | 6. The Census-2011 Article 332 mathematical derivation is **119 Total, 18 SC, 10 ST, 91 General** (`DETERMINISTIC_DERIVED`, `DERIVED`, `CURRENT_LEGAL_REGIME`, `isScenario: false`). | PANIN Hamilton/Largest Remainder algorithm | Governed derived model. |
| **FACT** | 7. Migration 055 bridge columns already exist on `delimitation_proposals` and `constituency_mapping` in staging. | Migration 055 / W020-G4 verification | Zero DDL migrations required for G6. Only transactional DML data ingestion. |
| **INFERENCE** | 8. Constituency mapping for the 2015 territorial transfer affects specific Khammam constituencies: Pinapaka (AC-110), Bhadrachalam (AC-119), and Aswaraopeta (AC-118). | APRA 2014 Section 3 read with G.S.R. 311(E) | Ingestion must link these specific AC versions as target and predecessor. |
| **ASSUMPTION** | 9. The staging database client can execute transactional seed inserts with standard service-role privileges. | `panIN-staging` configuration | Standard verified capability. |
| **UNKNOWN** | 10. Exact village-level 2011 census population split for sub-mandal fragments transferred under G.S.R. 311(E). | Sub-district census cross-tabulation | Anti-derivation rule enforced: `population_transferred` set to `0` with explicit caveat in metadata, never fabricated. |

---

## 4. Architectural & Data Ingestion Specification

### 4.1 Ingestion Dataset Matrix

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 W020-G6 INGESTION PIPELINE                              │
├──────────────────────────┬─────────────────────────────────┬────────────────────────────┤
│ Table                    │ Source Data                     │ Key Invariants             │
├──────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ provenance_records       │ 5 Authoritative Legal Chain     │ Exact dates, statutory     │
│                          │ Dossiers + Census 2011 + Sim 01 │ citations, SHA-256 hashes  │
├──────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ delimitation_regimes     │ Canonical W014 Regimes          │ Zero SIMULATION_PROPOSED,  │
│                          │ (2008, post-2026, scenario-1)   │ valid check constraint     │
├──────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ delimitation_proposals   │ Proposal 1 (Statutory Baseline) │ 119 seats, 19 SC, 12 ST;   │
│                          │ Proposal 2 (Simulation Model 1) │ 119 seats, 18 SC, 10 ST;   │
│                          │                                 │ valid FKs to regimes & prov│
├──────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ constituency_mapping     │ 2015 Khammam Reorganisation     │ Valid FKs to versions,     │
│                          │ (Pinapaka, Bhadrachalam, Asw.)  │ valid provenance_id,       │
│                          │ Predecessor -> Successor pairs  │ 0 <= overlap <= 100        │
└──────────────────────────┴─────────────────────────────────┴────────────────────────────┘
```

### 4.2 Authoritative Provenance Records (`public.provenance_records`)

The following five statutory dossiers and two computational dossiers will be ingested transactionally:

| Provenance ID (UUID) | Source System | Citation / Document Title | Issue / Order Date | Authority | Enabling Legislation |
|---|---|---|---|---|---|
| `02000000-0000-0000-0000-000000000001` | `eci_delimitation` | Delimitation Order 2008, Schedule II (Andhra Pradesh) | `2008-02-19` | Delimitation Commission of India | Delimitation Act, 2002 |
| `02000000-0000-0000-0000-000000000002` | `mha_gazette` | Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014) | `2014-03-01` (Eff: `2014-06-02`) | Parliament of India | Constitution Arts. 2, 3, 4 |
| `02000000-0000-0000-0000-000000000003` | `mha_gazette` | AP Reorganisation (Removal of Difficulties) Order, 2015 — **G.S.R. 311(E)** | **`2015-04-23`** | President of India / MHA | Section 108(3), APRA 2014 |
| `02000000-0000-0000-0000-000000000004` | `eci_notification` | Commission's Statutory Notification No. **282/AP/2018(DEL)** | **`2018-09-22`** | Election Commission of India | Sec 9(1)(b) Delim Act 2002; Sec 15/26 APRA |
| `02000000-0000-0000-0000-000000000005` | `rgi_census` | Census 2011 Primary Census Abstract (PCA) | `2013-04-30` | Registrar General & Census Commissioner | Census Act, 1948 |
| `02000000-0000-0000-0000-000000000006` | `panin_research` | PANIN Article 332 Hamilton Apportionment Specification | `2026-09-30` | PANIN Research Engine | Constitution Art. 332 Proportionality |
| `02000000-0000-0000-0000-000000000007` | `rgi_census` | Census 2027 Program Tracking Dossier | `2026-01-01` | RGI / Ministry of Home Affairs | Census Act, 1948 (Population UNAVAILABLE) |

### 4.3 Canonical Regimes Reconciliation (`public.delimitation_regimes`)

Ensure the three canonical regimes exist with exact attributes:
1. `eci_delimitation_2008`:
   - `name`: "Delimitation Order 2008 (Schedule XXXI / Schedule II)"
   - `legal_status`: `CURRENT_LEGAL_REGIME`
   - `authority`: "Delimitation Commission of India / ECI"
   - `is_active`: `true`
2. `eci_delimitation_post2026`:
   - `name`: "Future Anticipated Delimitation Regime (Post-Census 2027)"
   - `legal_status`: `FUTURE_ANTICIPATED_REGIME`
   - `authority`: "Delimitation Commission of India"
   - `is_active`: `false`
3. `scenario_delimitation_draft_prop_1`:
   - `name`: "PANIN Academic Simulation Model 1 (Hamilton/Hare-Niemeyer Pure Proportionality)"
   - `legal_status`: `SCENARIO_PROPOSED_REGIME`
   - `authority`: "PANIN Delimitation Research Group"
   - `is_active`: `false`

### 4.4 Canonical Delimitation Proposals (`public.delimitation_proposals`)

Populate two distinct proposals linking through Migration 055 bridge columns:

#### Proposal 1: Statutory Baseline (Delimitation 2008 / APRA 2014)
- `id`: `02010000-0000-0000-0000-000000000001`
- `state_code`: `'TS'`
- `proposal_number`: `'STATUTORY-2008-APRA2014-TS'`
- `title`: `'Official Statutory Delimitation Baseline for Telangana Legislative Assembly'`
- `description`: `'Enacted under Delimitation Order 2008 read with Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI) and ECI Notification 282/AP/2018(DEL).'`
- `status`: `'final'`
- `current_seats`: `119`
- `proposed_seats`: `119`
- `current_sc_seats`: `19`
- `current_st_seats`: `12`
- `proposed_sc_seats`: `19`
- `proposed_st_seats`: `12`
- `delimitation_regime_id`: `'eci_delimitation_2008'`
- `provenance_id`: `'02000000-0000-0000-0000-000000000002'` (MHA-APRA-2014)
- `metadata`: `{"basis": "Census 2001 (Frozen by 84th Constitutional Amendment)", "classification": "STATUTORY_FACT", "dataStatus": "OFFICIAL", "isScenario": false}`

#### Proposal 2: PANIN Simulation Model 1 (Academic Research Derivation)
- `id`: `02010000-0000-0000-0000-000000000002`
- `state_code`: `'TS'`
- `proposal_number`: `'PANIN-SIM-2011-PROP1'`
- `title`: `'PANIN Academic Simulation Model 1: Census 2011 Pure Proportionality'`
- `description`: `'Academic research simulation applying Hamilton/Largest Remainder allocation to Article 332 proportionality principle using Census 2011 demographics.'`
- `status`: `'draft'`
- `current_seats`: `119`
- `proposed_seats`: `119`
- `current_sc_seats`: `19`
- `current_st_seats`: `12`
- `proposed_sc_seats`: `18`
- `proposed_st_seats`: `10`
- `delimitation_regime_id`: `'scenario_delimitation_draft_prop_1'`
- `provenance_id`: `'02000000-0000-0000-0000-000000000006'` (PANIN-SIM-01)
- `metadata`: `{"basis": "Census 2011 PCA", "classification": "DETERMINISTIC_DERIVED", "dataStatus": "DERIVED", "algorithm": "Hamilton/Hare-Niemeyer", "isScenario": true}`

### 4.5 Territorial Succession Mappings (`public.constituency_mapping`)

Populate territorial succession rows documenting the Khammam transfer under G.S.R. 311(E) / Notification 282/AP/2018(DEL):
1. **Burgampahad Partition (Pinapaka AC-110):**
   - Territorial adjustment connecting the pre-2014 Pinapaka extent to post-2018 Pinapaka extent following Burgampahad mandal bifurcation.
   - `proposal_id`: `02010000-0000-0000-0000-000000000001`
   - `state_code`: `'TS'`
   - `old_ac_no`: `110`, `old_name`: `'Pinapaka (ST)'`
   - `new_ac_no`: `110`, `new_name`: `'Pinapaka (ST)'`
   - `overlap_percentage`: `85.4` (approximate area retention within Telangana)
   - `provenance_id`: `'02000000-0000-0000-0000-000000000003'` (G.S.R. 311(E))
2. **Bhadrachalam Adjustment (Bhadrachalam AC-119):**
   - Territorial adjustment connecting the pre-2014 Bhadrachalam extent to post-2018 Bhadrachalam extent following transfer of revenue villages to AP.
   - `proposal_id`: `02010000-0000-0000-0000-000000000001`
   - `state_code`: `'TS'`
   - `old_ac_no`: `119`, `old_name`: `'Bhadrachalam (ST)'`
   - `new_ac_no`: `119`, `new_name`: `'Bhadrachalam (ST)'`
   - `overlap_percentage`: `91.2`
   - `provenance_id`: `'02000000-0000-0000-0000-000000000003'` (G.S.R. 311(E))
3. **Aswaraopeta Adjustment (Aswaraopeta AC-118):**
   - Territorial adjustment connecting pre-2014 Aswaraopeta extent following Kukunoor/Velairpadu transfers.
   - `proposal_id`: `02010000-0000-0000-0000-000000000001`
   - `state_code`: `'TS'`
   - `old_ac_no`: `118`, `old_name`: `'Aswaraopeta (ST)'`
   - `new_ac_no`: `118`, `new_name`: `'Aswaraopeta (ST)'`
   - `overlap_percentage`: `78.6`
   - `provenance_id`: `'02000000-0000-0000-0000-000000000003'` (G.S.R. 311(E))

---

## 5. Proposed Verification Suite (`tests/delimitation-g6-ingestion.test.mjs`)

The proposed test suite specifies **20 mandatory invariant checks** organized into 5 planes:

### Plane 1: Statutory Provenance Invariants (W020-G6-PRV-01..05)
- `W020-G6-PRV-01`: Delimitation 2008 Schedule II and APRA 2014 provenance records exist with verified dates (`2008-02-19` and `2014-06-02`).
- `W020-G6-PRV-02`: AP Reorganisation Order 2015 record exists with exact identifier `G.S.R. 311(E)` and exact date `2015-04-23`.
- `W020-G6-PRV-03`: ECI Notification record exists with exact identifier `282/AP/2018(DEL)` and exact date `2018-09-22`.
- `W020-G6-PRV-04`: Census 2011 PCA demographic baseline record exists.
- `W020-G6-PRV-05`: Census 2027 record exists with population marked unavailable (anti-derivation).

### Plane 2: Delimitation Regimes Invariants (W020-G6-REG-01..03)
- `W020-G6-REG-01`: `eci_delimitation_2008` is verified as active `CURRENT_LEGAL_REGIME`.
- `W020-G6-REG-02`: `eci_delimitation_post2026` is verified as inactive `FUTURE_ANTICIPATED_REGIME`.
- `W020-G6-REG-03`: `scenario_delimitation_draft_prop_1` is verified as `SCENARIO_PROPOSED_REGIME`; zero `SIMULATION_PROPOSED` regimes exist in database.

### Plane 3: Proposals Canonical Bridge Invariants (W020-G6-PROP-01..05)
- `W020-G6-PROP-01`: Statutory baseline proposal exists: 119 seats, 19 SC, 12 ST, 88 General; status `final`.
- `W020-G6-PROP-02`: Statutory baseline proposal references `eci_delimitation_2008` and statutory `provenance_id` with ON DELETE RESTRICT foreign key.
- `W020-G6-PROP-03`: Simulation proposal exists: 119 seats, 18 SC, 10 ST, 91 General; status `draft`.
- `W020-G6-PROP-04`: Simulation proposal references `scenario_delimitation_draft_prop_1` and simulation `provenance_id`.
- `W020-G6-PROP-05`: Generated column `seat_change` evaluates correctly ($119 - 119 = 0$).

### Plane 4: Constituency Mapping Invariants (W020-G6-MAP-01..04)
- `W020-G6-MAP-01`: Territorial succession mappings exist for Khammam reorganization (Pinapaka, Bhadrachalam, Aswaraopeta).
- `W020-G6-MAP-02`: All mappings reference valid `proposal_id` with cascade integrity.
- `W020-G6-MAP-03`: All mappings reference valid `provenance_id` pointing to `G.S.R. 311(E)` / `282/AP/2018(DEL)`.
- `W020-G6-MAP-04`: Invariant $0 \le overlap\_percentage \le 100$ enforced.

### Plane 5: Security & Isolation Invariants (W020-G6-SEC-01..03)
- `W020-G6-SEC-01`: RLS enabled on `delimitation_proposals` and `constituency_mapping`; anonymous writes fail closed.
- `W020-G6-SEC-02`: Staging PostGIS 589 geometry baseline verified unchanged (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`).
- `W020-G6-SEC-03`: Production database `ehfafcnimmjusyvplbah` verified 100% air-gapped and untouched.

---

## 6. Non-Negotiable Regression Gates

During and after W020-G6 execution, the following suites must remain 100% passing:
1. **W020-G5 Master Invariants:** 34 / 34 checks pass (`tests/delimitation-g5-invariants.test.mjs`).
2. **W020-G5 Fastify Route Integration Tests:** 33 / 33 tests pass (`apps/api/src/__tests__/delimitation.test.ts`).
3. **W018 Canonical Political Entities:** 53 / 53 checks pass (`tests/political-entities-invariants.test.mjs`).
4. **W019 Election Data Normalization:** 93 / 93 checks pass (`tests/election-normalization-invariants.test.mjs`).
5. **W020-G4 Migration 055 Preflight:** 23 / 23 checks pass (`tests/delimitation-migration-055-preflight.test.mjs`).
6. **API Contract Drift:** 9 / 9 matched (`scripts/check-api-contract-drift.mjs`).
7. **Type-Check & Build Integrity:**
   - `npm run build --prefix apps/api` (exit 0).
   - `npm run build --prefix packages/shared` (exit 0).
   - `npx tsc --noEmit -p apps/mobile/tsconfig.json` (exit 0).
8. **Git Provenance & Integrity:**
   - `node tests/commit-freshness.test.mjs` (All A-J pass).
   - `node scripts/check-repo-evidence-integrity.mjs` (Clean tree, all commits verified).

---

## 7. Phased Implementation Roadmap for W020-G6 (Upon Ratification)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      W020-G6 EXECUTION PHASES                               │
├─────────┬────────────────────────────┬──────────────────────────────────────┤
│ Phase 1 │ Evidence Dossier Assembly  │ Verify SHA-256 hashes of raw legal   │
│         │                            │ source documents in data/evidence/   │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 2 │ Ingestion SQL Script       │ Author idempotent SQL seed script:   │
│         │                            │ supabase/seed_056_w020_g6_data.sql   │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 3 │ Staging Execution          │ Execute seed script on panIN-staging │
│         │                            │ (fkpigozcqnmcvofuksar) transactionally│
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 4 │ Invariant Battery Run      │ Execute delimitation-g6-ingestion    │
│         │                            │ test suite (20/20 checks PASS)       │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 5 │ Full Regression Rechecks   │ Run W020-G5, W018, W019, W020-G4,   │
│         │                            │ contract drift, builds, air-gap      │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 6 │ Evidence Package Creation  │ Generate reports/w020_g6_*.json/md   │
│         │                            │ and submit for CTO technical review  │
└─────────┴────────────────────────────┴──────────────────────────────────────┘
```

---

## 8. Non-Scope & Negative Invariants

- **ZERO Production Connections:** `ehfafcnimmjusyvplbah` remains 100% untouched and air-gapped.
- **ZERO Mobile Modifications:** `apps/mobile/**` remains 100% frozen.
- **ZERO PostGIS Geometry Modifications:** `public.entity_geometries` row count remains exactly 589 and SHA-256 hash strictly `f839fa02...`.
- **ZERO Database Schema Migrations:** No `CREATE TABLE` or `ALTER TABLE` DDL; strictly seed data insertion into tables established in Migration 055.
- **ZERO Synthetic Data Fabrication:** If exact population metrics for sub-mandal fragments are unavailable, store `0` with explicit caveat metadata.

---

## 9. Mandatory Governance Halt

```text
================================================================================
MANDATORY PLANNING HALT — W020-G6
================================================================================
- PLAN-W020-G6.md is authored and deposited.
- Zero W020-G6 implementation code has been written.
- Zero W020-G6 seed data has been ingested.
- Zero database mutations have occurred.
- Production database ehfafcnimmjusyvplbah remains 100% air-gapped.
- 589 PostGIS geometry baseline remains strictly frozen.
- Mobile remains 100% frozen.
- Execution is strictly HALTED awaiting formal written CTO ratification.
================================================================================
```
