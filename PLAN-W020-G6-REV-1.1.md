# PLAN-W020-G6-REV-1.1: Historical Delimitation Evidence Ingestion & Canonical Bridge Population

**Milestone:** W020-G6 (Historical Delimitation Evidence Ingestion & Canonical Bridge Population)  
**Parent Job:** W020 (Delimitation Engine Foundation & Canonical Bridge)  
**Authority:** CTO DIRECTIVE — PLAN-W020-G6 REVISION REQUIRED (2026-09-30)  
**Status:** `PROPOSED PLAN / AWAITING CTO RATIFICATION`  
**Implementation Authorization:** `STRICTLY NOT AUTHORIZED` (Planning Submission Only)  
**Revision:** `REV-1.1` (Evidence-Gated Constituency Mapping & Provenance Separation)  
**Timestamp:** 2026-09-30T10:00:00Z  
**Canonical Branch:** `master`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Mobile Status:** `apps/mobile/**` (STRICTLY FROZEN, 0 CHANGES)  
**PostGIS Baseline:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary & Revision Rationale

### 1.1 Context
Following the formal CTO technical acceptance of **W020-G5** (Delimitation Engine Foundation, DEC-091), the initial submission of `PLAN-W020-G6` was reviewed and returned with directive: **PLAN-W020-G6 REVISION REQUIRED**.

### 1.2 Core Revisions in REV-1.1
1. **Constituency Mapping Evidence Gate:**
   - Evaluated the Khammam territorial transfers enacted under G.S.R. 311(E) (23 April 2015) and documented in ECI Notification No. 282/AP/2018(DEL) (22 September 2018).
   - Determined that ECI Notification No. 282/AP/2018(DEL) explicitly amended the territorial extents of **Andhra Pradesh** constituencies under Schedule II (specifically **53-Rampachodavaram (ST)** and **67-Polavaram (ST)**).
   - Proved that NO statutory order or ECI notification dissolved or recreated Telangana constituencies under Schedule XXXI. The continuing Telangana constituencies (**110-Pinapaka**, **118-Aswaraopeta**, **119-Bhadrachalam**) continued with their remaining extents under their original identities and numbers.
   - Enforced the non-negotiable rule: **`ADMINISTRATIVE_TRANSFER_ONLY != PREDECESSOR_SUCCESSOR`**.
   - Prohibited creating speculative `constituency_mapping` rows where authoritative evidence establishes only an administrative revenue transfer.
   - Consequently, `public.constituency_mapping` remains **UNPOPULATED (0 rows)** in G6, preserving the administrative transfer as pure provenance/evidence in `public.provenance_records` and classifying unresolved constituency predecessor/successor lineage as `UNKNOWN`.
2. **2008 Delimitation Baseline Authority:**
   - Established Delimitation Order 2008 (Schedule II composite AP / Schedule XXXI Telangana) as the definitive source of original extents.
   - Enforced the principle that a continuing AC number is NOT by itself proof of a new version or predecessor/successor relationship.
3. **Rigorous Provenance Separation:**
   - Explicitly partitioned the evidentiary role of every source:
     - 2008 ECI Order → Original constituency extent.
     - AP Reorganisation Act 2014 → Successor-state territorial division.
     - G.S.R. 311(E), 23 April 2015 → Specified administrative territorial transfer.
     - ECI 282/AP/2018(DEL), 22 September 2018 → Documented AP constituency extent amendments.
     - Census 2011 PCA → Demographic input totals.
     - PANIN simulation specification → PANIN computational methodology.
4. **Orthogonal Proposal Bridge:**
   - Separated Proposal 1 (Statutory Baseline: 119 / 19 SC / 12 ST / 88 General, `status: 'final'`, `dataStatus: 'OFFICIAL'`, `legalStatus: 'CURRENT_LEGAL_REGIME'`) from Proposal 2 (PANIN Mathematical Derivation: 119 / 18 SC / 10 ST / 91 General, `status: 'draft'`, `dataStatus: 'DERIVED'`, `legalStatus: 'SCENARIO_PROPOSED_REGIME'`).
   - Proposal status is strictly distinct from W012 `data_status` and W014 `legal_status`.
5. **Expanded 24-Invariant Battery:**
   - Designed 24 non-tautological invariant checks across 5 planes including `MAP-01` through `MAP-10`.

---

## 2. Fact / Inference / Assumption / Unknown (FIAU) Register

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FACT / INFERENCE / ASSUMPTION / UNKNOWN REGISTER                │
├─────────┬──────────────────────────────────────────────────────────────────────────────┤
│ FACT    │ 1. Delimitation Order 2008 promulgated on 19 Feb 2008 under Delimitation     │
│         │    Act, 2002 as Schedule II (State of Andhra Pradesh: 294 ACs).             │
│         │ 2. APRA 2014 (Act No. 6 of 2014) partitioned Schedule II into               │
│         │    Schedule XXXI (Telangana: 119 ACs) and Schedule II (AP: 175 ACs).         │
│         │ 3. AP Reorganisation (Removal of Difficulties) Order, 2015 is G.S.R. 311(E), │
│         │    dated 23 April 2015, and "comes into force at once".                      │
│         │ 4. ECI Notification No. 282/AP/2018(DEL), dated 22 September 2018,           │
│         │    explicitly amended Schedule II (Andhra Pradesh) for:                      │
│         │    - 53-Rampachodavaram (ST)                                                 │
│         │    - 67-Polavaram (ST)                                                       │
│         │ 5. Migration 055 bridge columns already exist on delimitation_proposals and  │
│         │    constituency_mapping with 0 rows on panIN-staging (fkpigozcqnmcvofuksar). │
│         │ 6. Current statutory reservation baseline: 119 Total, 19 SC, 12 ST, 88 Gen   │
│         │    (STATUTORY_FACT, OFFICIAL, CURRENT_LEGAL_REGIME).                         │
│         │ 7. Census-2011 mathematical derivation: 119 Total, 18 SC, 10 ST, 91 Gen      │
│         │    (DETERMINISTIC_DERIVED, DERIVED, CURRENT_LEGAL_REGIME, isScenario: false).│
├─────────┼──────────────────────────────────────────────────────────────────────────────┤
│ INFER-  │ 8. G.S.R. 311(E) transfer reduced administrative revenue extent of Khammam   │
│ ENCE    │    mandals, but did not dissolve or re-enact Telangana assembly              │
│         │    constituencies under Schedule XXXI.                                       │
├─────────┼──────────────────────────────────────────────────────────────────────────────┤
│ ASSUMP- │ 9. Database-side service role client can insert seed rows transactionally    │
│ TION    │    into provenance_records, delimitation_regimes, and delimitation_proposals. │
├─────────┼──────────────────────────────────────────────────────────────────────────────┤
│ UNKNOWN │ 10. Constituency predecessor/successor version replacement for Telangana     │
│         │     ACs 110, 118, 119 remains UNKNOWN (no new versions legally enacted).     │
│         │ 11. Exact village-level 2011 census population split for sub-mandal          │
│         │     fragments transferred under G.S.R. 311(E) remains UNKNOWN (anti-         │
│         │     derivation rule strictly enforced: population_transferred set to 0).     │
└─────────┴──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Legal-Evidence Matrix & Provenance Separation

Every proposed legal source is strictly partitioned by its authoritative scope. No source is used as evidence for claims it does not establish.

| Source ID | Instrument Title | Statutory Authority | Order / Pub Date | Commencement | What It Authoritatively Establishes | What It Does NOT Establish |
|---|---|---|---|---|---|---|
| `ECI-DELIM-2008-AP` | Delimitation Order 2008, Schedule II | Delimitation Commission of India / Delimitation Act, 2002 | `2008-02-19` | `2008-02-19` | Original territorial extents of all 294 Assembly Constituencies in composite Andhra Pradesh (119 Telangana region, 175 Andhra region). | Post-bifurcation successor states, Polavaram territorial transfers, or Census 2011 adjustments. |
| `MHA-APRA-2014` | Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014) | Parliament of India / Constitution Arts. 2, 3, 4 | `2014-03-01` | `2014-06-02` (Appointed Day) | Successor-state territorial division; enacts Schedule XXXI (Telangana: 119 ACs, 19 SC, 12 ST); retains Schedule II (Residuary AP: 175 ACs). | Subsequent Polavaram project administrative transfers enacted in 2015. |
| `MHA-APORD-2015-GSR311E` | AP Reorganisation (Removal of Difficulties) Order, 2015 — **G.S.R. 311(E)** | President of India / MHA (Sec 108(3), APRA 2014) | **`2015-04-23`** | **`2015-04-23`** ("comes into force at once") | Specified administrative transfer of 7 revenue mandals/villages in Khammam from Telangana to Andhra Pradesh. | Constituency delimitation amendments, creation of new constituency versions, or seat baseline changes. |
| `ECI-NOT-2018-282AP` | Commission's Statutory Notification No. **282/AP/2018(DEL)** | Election Commission of India (Sec 9(1)(b) Delim Act 2002; Sec 15/26 APRA) | **`2018-09-22`** | `2018-09-22` (Pub: 24 Sept 2018) | Documented Andhra Pradesh constituency extent amendments under Schedule II: formally amends extents of **53-Rampachodavaram (ST)** and **67-Polavaram (ST)**. | Dissolution or recreation of Telangana constituencies under Schedule XXXI; new Telangana constituency versions; seat baseline changes. |
| `RGI-CENSUS-2011` | Census 2011 Primary Census Abstract (PCA) | Registrar General & Census Commissioner / Census Act 1948 | `2013-04-30` | `2011-03-01` | Enumerated resident demographic input totals (Telangana: 34,591,425 total, 5,260,976 SC, 3,018,710 ST). | Statutory seat quotas, legal reservation enactments, or boundary delineations. |
| `PANIN-SIM-01` | PANIN Article 332 Apportionment Specification | PANIN Research Group / Article 332 Principle | `2026-09-30` | `2026-09-30` | PANIN computational methodology: Hamilton/Largest Remainder deterministic quota allocation on Census 2011. | Official gazetted delimitation orders or statutory reality. |

---

## 4. Constituency Mapping Evidence Gate & Decision Engine

### 4.1 Allowed Relationship Classifications
The canonical model defines five distinct relationship classifications:
1. **`PREDECESSOR_SUCCESSOR`:** Authoritative legal order explicitly supersedes constituency version A and replaces it with constituency version B.
2. **`TERRITORIAL_EXTENT_UPDATE`:** Authoritative legal order explicitly amends the geographic description of an existing constituency without altering its legal identity.
3. **`CONTINUING_UNCHANGED`:** Constituency continues across legal milestones with its statutory definition unchanged.
4. **`ADMINISTRATIVE_TRANSFER_ONLY`:** Administrative revenue territory (mandals/villages) was transferred, but NO new constituency version was created.
5. **`UNKNOWN`:** The canonical model requires an explicit relationship state, but authoritative statutory evidence is lacking or unverified.

### 4.2 Evidence-Gated Mapping Evaluation Matrix

| Target Constituency | Jurisdiction | Statutory Legal Source | Exact Document Location | Relationship Type | Lineage Status | Action on `public.constituency_mapping` |
|---|---|---|---|---|---|---|
| **53-Rampachodavaram (ST)** | Andhra Pradesh | ECI 282/AP/2018(DEL) | Table B, Entry 53 (East Godavari District) | `TERRITORIAL_EXTENT_UPDATE` | Documented AP Extent Update | **LEAVE UNPOPULATED** (Outside Telangana governed scope; target version not in `constituency_versions`) |
| **67-Polavaram (ST)** | Andhra Pradesh | ECI 282/AP/2018(DEL) | Table B, Entry 67 (West Godavari District) | `TERRITORIAL_EXTENT_UPDATE` | Documented AP Extent Update | **LEAVE UNPOPULATED** (Outside Telangana governed scope; target version not in `constituency_versions`) |
| **110-Pinapaka (ST)** | Telangana | G.S.R. 311(E) | Revenue Transfer Schedule | `ADMINISTRATIVE_TRANSFER_ONLY` | `UNKNOWN` (No new version gazetted) | **LEAVE UNPOPULATED** (`ADMINISTRATIVE_TRANSFER_ONLY != PREDECESSOR_SUCCESSOR`) |
| **119-Bhadrachalam (ST)** | Telangana | G.S.R. 311(E) | Revenue Transfer Schedule | `ADMINISTRATIVE_TRANSFER_ONLY` | `UNKNOWN` (No new version gazetted) | **LEAVE UNPOPULATED** (`ADMINISTRATIVE_TRANSFER_ONLY != PREDECESSOR_SUCCESSOR`) |
| **118-Aswaraopeta (ST)** | Telangana | G.S.R. 311(E) | Revenue Transfer Schedule | `ADMINISTRATIVE_TRANSFER_ONLY` | `UNKNOWN` (No new version gazetted) | **LEAVE UNPOPULATED** (`ADMINISTRATIVE_TRANSFER_ONLY != PREDECESSOR_SUCCESSOR`) |

### 4.3 Mandatory Evidence-Gate Rule
> [!IMPORTANT]
> **RULE IV-020-MAP:** When authoritative evidence proves only an administrative revenue transfer (`ADMINISTRATIVE_TRANSFER_ONLY`) and does NOT prove a gazetted constituency version lineage, `public.constituency_mapping` MUST remain **UNPOPULATED (0 rows)**.
> The administrative transfer is preserved in `public.provenance_records` and raw evidence dossiers. The unresolved constituency lineage is formally represented as `UNKNOWN`.

---

## 5. Proposal / Provenance Matrix & Orthogonal Taxonomy

W020-G6 populates two canonical proposal rows in `public.delimitation_proposals` with complete orthogonal metadata:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORTHOGONAL PROPOSAL TAXONOMY                           │
├────────────────────────────┬─────────────────────────────┬──────────────────┤
│ Attribute                  │ Proposal 1 (Statutory)      │ Proposal 2 (Sim) │
├────────────────────────────┼─────────────────────────────┼──────────────────┤
│ Proposal ID                │ 02010000-0000-...-0001      │ 02010000-...-0002│
│ Proposal Status (Schema)   │ 'final'                     │ 'draft'          │
│ Output Classification      │ STATUTORY_FACT              │ DETERMINISTIC_...│
│ W012 Data Status           │ OFFICIAL                    │ DERIVED          │
│ W014 Legal Status          │ CURRENT_LEGAL_REGIME        │ SCENARIO_PROP... │
│ Derived isScenario         │ false                       │ true             │
│ Delimitation Regime ID     │ eci_delimitation_2008       │ scenario_delim...│
│ Provenance Record ID       │ MHA-APRA-2014               │ PANIN-SIM-01     │
│ Total Assembly Seats       │ 119                         │ 119              │
│ SC Reserved Seats          │ 19                          │ 18               │
│ ST Reserved Seats          │ 12                          │ 10               │
│ General Seats              │ 88                          │ 91               │
│ Seat Change (Generated)    │ 0                           │ 0                │
└────────────────────────────┴─────────────────────────────┴──────────────────┘
```

---

## 6. Register of Claims that Remain UNKNOWN

In strict compliance with PANIN Anti-Derivation and Truth-in-Data principles, the following claims are explicitly registered as `UNKNOWN`:

1. **Constituency Predecessor/Successor Version Lineage for Telangana ACs 110, 118, 119:**
   - *Status:* `UNKNOWN`.
   - *Rationale:* G.S.R. 311(E) ordered an administrative transfer of revenue units. ECI Notification 282/AP/2018(DEL) updated Andhra Pradesh extents under Schedule II (AC 53 & 67) but did NOT gazette new constituency versions for Telangana under Schedule XXXI. Continuing AC numbers 110, 118, 119 do not constitute evidence of new versions.
2. **Sub-Mandal Fragment Population Transferred under G.S.R. 311(E):**
   - *Status:* `UNKNOWN`.
   - *Rationale:* The 2011 Primary Census Abstract enumerates populations down to full sub-districts (mandals), not arbitrary post-hoc revenue village boundaries transferred for the Polavaram project. Storing synthetic splits is strictly prohibited; `population_transferred` is held at `0` with explicit caveat metadata.

---

## 7. Planned G6 Invariant Battery (`tests/delimitation-g6-ingestion.test.mjs`)

The proposed verification suite defines **24 non-tautological invariant checks across 5 planes**:

### Plane 1: Statutory Provenance Invariants
- `W020-G6-PRV-01`: 2008 Delimitation Order Schedule II record exists with verified date (`2008-02-19`).
- `W020-G6-PRV-02`: APRA 2014 record exists with verified date (`2014-03-01`) and appointed day (`2014-06-02`).
- `W020-G6-PRV-03`: AP Reorganisation Order 2015 record exists with exact citation `G.S.R. 311(E)` and exact date `2015-04-23`.
- `W020-G6-PRV-04`: ECI Notification record exists with exact citation `282/AP/2018(DEL)` and exact date `2018-09-22`.
- `W020-G6-PRV-05`: Census 2011 PCA demographic baseline record exists.
- `W020-G6-PRV-06`: Census 2027 tracking record exists with final population marked unavailable.

### Plane 2: Delimitation Regimes Invariants
- `W020-G6-REG-01`: `eci_delimitation_2008` is verified as active `CURRENT_LEGAL_REGIME`.
- `W020-G6-REG-02`: `eci_delimitation_post2026` is verified as inactive `FUTURE_ANTICIPATED_REGIME`.
- `W020-G6-REG-03`: `scenario_delimitation_draft_prop_1` is verified as `SCENARIO_PROPOSED_REGIME`.
- `W020-G6-REG-04`: Zero `SIMULATION_PROPOSED` or `SIMULATION_PROPOSED_REGIME` values exist in database.

### Plane 3: Proposals Canonical Bridge Invariants
- `W020-G6-PROP-01`: Proposal 1 represents authoritative statutory baseline (119 seats, 19 SC, 12 ST, 88 General; status `final`).
- `W020-G6-PROP-02`: Proposal 1 references `eci_delimitation_2008` and statutory `provenance_id` under ON DELETE RESTRICT.
- `W020-G6-PROP-03`: Proposal 2 represents academic simulation (119 seats, 18 SC, 10 ST, 91 General; status `draft`).
- `W020-G6-PROP-04`: Proposal 2 references `scenario_delimitation_draft_prop_1` and simulation `provenance_id`.
- `W020-G6-PROP-05`: Proposal status, W012 `data_status`, and W014 `legal_status` are strictly orthogonal.
- `W020-G6-PROP-06`: Generated column `seat_change` evaluates correctly ($119 - 119 = 0$).

### Plane 4: Constituency Mapping Evidence-Gate Invariants
- `W020-G6-MAP-01`: `ADMINISTRATIVE_TRANSFER_ONLY != PREDECESSOR_SUCCESSOR` enforced.
- `W020-G6-MAP-02`: No mapping rows exist without authoritative constituency lineage evidence (`constituency_mapping` row count === 0).
- `W020-G6-MAP-03`: Continuing AC number does not imply a new version.
- `W020-G6-MAP-04`: Original 2008 baseline extents trace to ECI Delimitation Order 2008.
- `W020-G6-MAP-05`: G.S.R. 311(E) transfer is separately represented as administrative transfer evidence.
- `W020-G6-MAP-06`: ECI 282/AP/2018(DEL) AP-side extent updates are separately represented.
- `W020-G6-MAP-07`: `UNKNOWN` status is preserved for unresolved Telangana constituency lineage.
- `W020-G6-MAP-08`: Temporal validity of all evidence records conforms to valid dates.

### Plane 5: Security & Isolation Invariants
- `W020-G6-SEC-01`: RLS enabled on `delimitation_proposals` and `constituency_mapping`; anonymous writes fail closed.
- `W020-G6-SEC-02`: Staging PostGIS 589 geometry baseline verified unchanged (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`).
- `W020-G6-SEC-03`: Production database `ehfafcnimmjusyvplbah` verified 100% air-gapped and untouched.

---

## 8. Non-Negotiable Regression Gates

1. `tests/delimitation-g5-invariants.test.mjs`: **34 / 34 PASS (100%)**
2. `apps/api/src/__tests__/delimitation.test.ts`: **33 / 33 PASS (100%)**
3. `tests/political-entities-invariants.test.mjs`: **53 / 53 PASS (100%)**
4. `tests/election-normalization-invariants.test.mjs`: **93 / 93 PASS (100%)**
5. `tests/delimitation-migration-055-preflight.test.mjs`: **23 / 23 PASS (100%)**
6. `scripts/check-api-contract-drift.mjs`: **9 / 9 MATCH (100%)**
7. `npm run build --prefix apps/api`: **EXIT 0 (Clean)**
8. `npm run build --prefix packages/shared`: **EXIT 0 (Clean)**
9. `npx tsc --noEmit -p apps/mobile/tsconfig.json`: **EXIT 0 (Clean)**
10. `tests/commit-freshness.test.mjs`: **PASS (Checks A–J)**
11. `scripts/check-repo-evidence-integrity.mjs`: **PASS (Clean working tree)**

---

## 9. Phased Execution Roadmap (Post-Ratification Only)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       W020-G6 POST-RATIFICATION PHASES                      │
├─────────┬────────────────────────────┬──────────────────────────────────────┤
│ Phase 1 │ Provenance Dossiers Setup  │ Ingest 6 verified dossiers into      │
│         │                            │ public.provenance_records            │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 2 │ Canonical Regimes Sync     │ Verify/update public.delimitation_   │
│         │                            │ regimes with canonical W014 values   │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 3 │ Proposals Population       │ Insert Proposal 1 (Statutory) and    │
│         │                            │ Proposal 2 (Simulation) with bridges │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 4 │ Mapping Gate Enforcement   │ Verify public.constituency_mapping   │
│         │                            │ remains 0 rows (admin transfer != pl)│
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 5 │ Invariant Battery Run      │ Execute delimitation-g6-ingestion    │
│         │                            │ suite (24/24 PASS)                   │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 6 │ Full Regression Rechecks   │ Run G5, W018, W019, G4, drift, builds│
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Phase 7 │ Evidence Package Creation  │ Generate reports/w020_g6_*.json/md   │
│         │                            │ and submit for CTO technical review  │
└─────────┴────────────────────────────┴──────────────────────────────────────┘
```

---

## 10. Mandatory Governance Stop State

```text
================================================================================
MANDATORY PLANNING HALT — W020-G6 (REV-1.1)
================================================================================
- PLAN-W020-G6-REV-1.1.md is authored and deposited.
- reports/w020_g6_plan_review_manifest.json is authored and deposited.
- Zero W020-G6 implementation code has been written.
- Zero database mutations (DDL or DML) have been executed.
- public.constituency_mapping remains strictly unpopulated (0 rows).
- Production database ehfafcnimmjusyvplbah remains 100% air-gapped.
- 589 PostGIS geometry baseline remains strictly frozen.
- Mobile remains 100% frozen.
- Implementation authorization remains STRICTLY NO pending CTO ratification.
- Execution is strictly HALTED awaiting formal written CTO ratification.
================================================================================
```
