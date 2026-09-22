# W014 — GEOGRAPHY VERSIONING / TEMPORAL VALIDITY
## PRE-IMPLEMENTATION PREFLIGHT & SOURCE-TRUTH INSPECTION REPORT

- **Job**: W014 — Geography Versioning / Temporal Validity
- **Phase**: PREFLIGHT ONLY
- **Status**: `W014_PREFLIGHT_INSPECTION_COMPLETE — AWAITING CTO REVIEW`
- **Implementation Authorization**: NOT GRANTED
- **Database Modification**: PROHIBITED
- **Production Access / Mutation**: STRICTLY PROHIBITED (0 bytes, 0 requests)
- **Staging Mutation**: PROHIBITED
- **Current Canonical Branch**: `master`
- **Current HEAD Commit**: `d0f3fcd5188eb70d0f5b9d157888a7b247bd572f`
- **W013 Accepted Commit**: `d0f3fcd5188eb70d0f5b9d157888a7b247bd572f`
- **Target Staging Database**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Inspection Date**: 2026-09-22

---

## 1. Source-of-Truth Reconciliation

### 1.1 Git Coordinates & Repository Lineage
- **Current HEAD**: `d0f3fcd5188eb70d0f5b9d157888a7b247bd572f`
- **Remote `origin/master`**: `d0f3fcd5188eb70d0f5b9d157888a7b247bd572f` (100% in sync)
- **Working Tree**: Completely CLEAN (0 unstaged, 0 untracked changes)
- **W013 Acceptance Lineage**:
  - `284f7ca` — docs(w013): correct N:1 cardinality and telangana evidence wording
  - `29cbe0c` — feat(w013): implement canonical geography model and bounded telangana pilot (migration 040)
  - `d6f423d` — fix(w013): widen canonical geography code and entity_type columns to VARCHAR(50) for Migration 040
  - `53e1647` — docs(w013): record live staging runtime verification evidence (13/13 PASS)
  - `d0f3fcd` — test(w013): harden runtime test semantic integrity for relational, lineage, and provenance checks
- **Evidence Ancestry Integrity**: Verified via `node scripts/check-repo-evidence-integrity.mjs` (32/32 referenced commits verified in git ancestry).

### 1.2 Current Migration Inventory
There are 40 canonical migration files in `supabase/migrations/`:
- `001_initial_schema.sql` through `037_page_pro_orders.sql` (Legacy & Platform foundation)
- `038_security_baseline_and_rls_hardening.sql` (W010 Security & RLS baseline)
- `039_data_governance_foundation.sql` (W012 Governance catalog & provenance)
- `040_canonical_geography_model.sql` (W013 Canonical geography entities & Telangana pilot)
- Execution packages:
  - `supabase/staging_migration_package_038.sql` (W010 staging package)
  - `supabase/staging_migration_package_040.sql` (W013 staging package, executed on `panIN-staging`)

### 1.3 Geography Application Code Inventory
- **Fastify API Routes & Services**:
  - `apps/api/src/routes/constituencies.ts`: Static mapping and detail routes for assembly constituencies.
  - `apps/api/src/services/stateData.ts`: In-memory seed loader covering 31 states and union territories.
  - `apps/api/src/routes/delimitation.ts`: Proposals, events, and ward population endpoints.
- **Mobile Client Layers**:
  - `apps/mobile/lib/hierarchyData.ts`: Reads TS & AP hierarchy seed data (`data/seed/telangana-hierarchy.ts`).
  - `apps/mobile/lib/delimitationTypes.ts`: Domain models for boundary changes, proposals, and events.
  - `apps/mobile/stores/delimitation.ts`: Zustand store for delimitation simulations.
  - `apps/mobile/app/hierarchy/[id].tsx`: UI breadcrumb rendering for administrative hierarchy.
  - `apps/mobile/data/geo-manifest.json`: Checksum registry for bundled and streamed GeoJSON boundary files.
- **Static Seeds**:
  - `data/seed/telangana-constituencies.ts`, `data/seed/telangana-hierarchy.ts`, `data/seed/*-constituencies.ts`.

### 1.4 Identified Divergences & Historical Debt
1. **Flat Static Assumption vs. Dynamic Reality**: API and mobile code assume an Assembly Constituency has a single, timeless `district` string name. In reality, Telangana administrative districts were reorganized from 10 to 31 in 2016 and expanded to 33 in 2019, while AC boundaries remained frozen under the 2008 Delimitation Order.
2. **Partial State Versioning in Database**: Staging `states` table contains 20 rows. Only `TS` has `primary_dataset_version_id = 'mha_ts_2014_v1'`. The other 19 states carry over from bootstrap migrations `001` and `003` with `primary_dataset_version_id = NULL`.
3. **Empty Administrative DDL on Staging**: Migration `022_administrative_hierarchy.sql` defined tables `mandals`, `gram_panchayats`, `revenue_villages`, `polling_booths`, and `mandal_constituency_map`. However, all 5 tables have 0 rows in staging. Mobile consumes this data directly from TypeScript seed files.
4. **Empty Delimitation Tables on Staging**: Migration `011_delimitation.sql` defined `delimitation_proposals`, `proposed_constituencies`, `constituency_mapping`, and `citizen_impact`, which currently contain 0 rows.

---

## 2. Current Geography Model

### 2.1 Entity Architectural Matrix
The current database schema establishes two completely distinct branches of Indian political geography that must NOT be unified into a single naive hierarchy:

```
                  ┌─────────────────────────────────────┐
                  │            public.states            │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│   ADMINISTRATIVE GEOGRAPHY   │              │     ELECTORAL GEOGRAPHY      │
├──────────────────────────────┤              ├──────────────────────────────┤
│ public.districts             │              │ public.parliamentary_        │
│ (33 rows in TS pilot)        │              │        constituencies        │
│                              │              │ (17 rows in TS pilot)        │
│ public.mandals               │              │                              │
│ (0 rows in DB; TS/AP seeds)  │              │ public.constituencies (ACs)  │
│                              │              │ (119 rows in TS pilot)       │
│ public.gram_panchayats       │              │                              │
│ (0 rows in DB; TS/AP seeds)  │              │ public.polling_booths        │
│                              │              │ (0 rows in DB; TS/AP seeds)  │
│ public.revenue_villages      │              │                              │
│ (0 rows in DB)               │              │                              │
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │                                             │
               └──────────────► public.mandal_ ◄─────────────┘
                                constituency_map
                              (M:N Cross-Cut Table)
```

### 2.2 Table-by-Table Schema Inspection

| Table Name | Primary Key | Canonical Code | External Identifiers | Parent FKs | Governance (W012) | Existing Temporal Fields | Staging Rows |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`states`** | `code TEXT` (`'TS'`) | `internal_id UUID` | `lgd_code`, `census_code_2011` | None | `primary_dataset_version_id` | None (`created_at`, `updated_at` only) | 20 |
| **`districts`** | `id UUID` | `code VARCHAR(50)` | `lgd_code`, `census_code_2011` | `state_code` | `primary_dataset_version_id` | None (`created_at`, `updated_at` only) | 33 |
| **`parliamentary_constituencies`** | `id UUID` | `code VARCHAR(50)` | `pc_number`, `eci_pc_code` | `state_code` | `primary_dataset_version_id` | None (`created_at`, `updated_at` only) | 17 |
| **`constituencies`** | `id TEXT` (`'TS-AC-1'`) | `internal_id UUID`, `canonical_code VARCHAR(50)` | `ac_no`, `eci_ac_code` | `state_code`, `district_id`, `parliamentary_constituency_id` | `primary_dataset_version_id` | None (`created_at`, `updated_at` only) | 119 |
| **`mandals`** | `id TEXT` (`'TS-MDL-501'`) | None | `lgd_code` | `state_code` (district is denormalized string) | None | None (`created_at`, `updated_at` only) | 0 |
| **`gram_panchayats`** | `id TEXT` (`'TS-GP-50101'`) | None | `lgd_code` | `mandal_id`, `state_code` | None | None (`created_at`, `updated_at` only) | 0 |
| **`revenue_villages`** | `id TEXT` (`'TS-RV-581452'`) | None | `census_code`, `lgd_code` | `panchayat_id`, `mandal_id`, `state_code` | None | None (`created_at` only) | 0 |
| **`polling_booths`** | `id TEXT` (`'TS-AC1-B001'`) | None | `booth_number` | `constituency_id`, `panchayat_id`, `mandal_id`, `state_code` | None | None (`created_at`, `updated_at` only) | 0 |
| **`mandal_constituency_map`** | `id SERIAL` | None | None | `mandal_id`, `constituency_id` | None | None (static junction) | 0 |
| **`delimitation_proposals`** | `id UUID` | None | `proposal_number` | `state_code` | None | `published_at`, `objections_deadline` | 0 |
| **`proposed_constituencies`** | `id UUID` | None | `new_ac_no` | `proposal_id`, `state_code` | None | None | 0 |
| **`constituency_mapping`** | `id UUID` | None | `old_ac_no`, `new_ac_no` | `proposal_id`, `state_code` | None | None | 0 |

---

## 3. Temporal-Versioning Gap Analysis

The current schema is completely flat and timeless. The following matrix details the precise capabilities missing from the current repository truth:

| Gap ID | Concept | Current Source Truth | Required W014 Capability | Source Evidence | Architectural Risk if Not Addressed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-14-01** | **Entity Historical Versions** | Each entity exists as exactly one row. Updating an attribute (e.g. name, boundary, headquarters) permanently destroys previous state. | Schema must support multiple temporal versions of the same geographic entity across statutory regimes. | `districts` has `UNIQUE(code)` and `UNIQUE(state_code, name)`; `constituencies` has `UNIQUE(internal_id)`. | **HIGH**: Past election outcomes cannot be analyzed under the boundaries that existed at election time. |
| **GAP-14-02** | **Statutory Validity Intervals** | Entities only possess system timestamps (`created_at`, `updated_at`). | Entities must define statutory lifespan via `valid_from DATE NOT NULL` and `valid_to DATE` (NULL indicating currently active). | Zero calendar date columns exist in `districts`, `parliamentary_constituencies`, or `constituencies`. | **CRITICAL**: Point-in-time queries ("What was District X on 2015-05-01?") are mathematically impossible. |
| **GAP-14-03** | **Predecessor & Successor Lineage** | Entities have zero lineage pointers to track entity evolution (splits, mergers, renames, abolitions). | Explicit lineage relationships (`predecessor_entity_id`, `successor_entity_id`, or a dedicated `entity_lineage` junction). | No lineage foreign keys or self-referential columns exist in any geography table. | **HIGH**: Inability to trace split histories (e.g. *Mulugu* split from *Jayashankar Bhupalpally* in 2019). |
| **GAP-14-04** | **Relationship Temporality** | Relationships are static scalar FKs on child rows (e.g. `constituencies.district_id`). | Relationships must be temporal or version-anchored. When administrative districts reorganize, AC boundaries remain unchanged, but their parent district changes over time. | `constituencies.district_id` is a single static UUID foreign key. | **CRITICAL**: District re-assignments force destructive updates to existing constituency rows, destroying historical alignment. |
| **GAP-14-05** | **Delimitation Regime Binding** | Electoral entities do not state which Delimitation Order created them (1951, 1976, 2008, post-2026). | Electoral entities must be formally bound to a Delimitation Regime with statutory effective dates. | Seed count invariants (119 ACs) exist without an explicit Delimitation Regime entity. | **HIGH**: Introduction of past or future delimitation datasets will collide with the current 2008 ECI order. |
| **GAP-14-06** | **Scenario Contamination Isolation** | `delimitation_proposals` exists without W012 governance or schema-level isolation from canonical tables. | Strict boundary enforcing that scenario/simulation entities cannot be marked `OFFICIAL` or pollute canonical lookups. | `011_delimitation.sql` proposed constituencies use plain integers without canonical UUID isolation. | **HIGH**: Accidental promotion of draft or hypothetical delimitation proposals into official public feeds. |

---

## 4. Distinguishing Temporal Validity from Data Governance

A common architectural trap in geographic data systems is conflating **Dataset Versioning** with **Entity Versioning** and **Effective Validity**. W014 must maintain clean ontological separation from W012:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         W012: DATA GOVERNANCE LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • public.data_sources: Who published the data (e.g. ECI, MHA, Survey)       │
│ • public.datasets: Catalog of data series (e.g. eci_delimitation_order_2008)│
│ • public.dataset_versions: Specific ingestion release (e.g. eci_ts_ac_2008_v1)│
│ • public.provenance_records & linkages: Ingestion audit & data_status      │
│   (UNVERIFIED -> OFFICIAL -> DEPRECATED -> REVOKED)                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (N:1 Reference)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    W014: GEOGRAPHY TEMPORAL VALIDITY LAYER                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Statutory Regimes: Legal order defining the boundaries                    │
│ • Entity Identity (internal_id): Constant through time                      │
│ • Entity Version (version_id): Specific boundary & attributes               │
│ • Temporal Interval: [valid_from, valid_to) calendar dates                  │
│ • Predecessor / Successor Lineage: Splits, mergers, renames, abolitions     │
│ • Relationship Temporality: AC-to-District mapping valid for specific dates  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Strict Ontological Separation

1. **`dataset_version` (W012)**: Represents an **artifact of ingestion**. It has an `ingested_at` timestamp, an ingestion agent, and a governance status (`UNVERIFIED`, `OFFICIAL`).
2. **`geographic_entity_version` (W014)**: Represents a **real-world legal entity state**. It has a statutory `valid_from` and `valid_to` date (e.g. G.O.Ms. notification date).
3. **Cardinality**: N:1 or N:M.
   - A single `dataset_version` (e.g. `eci_ts_ac_2008_v1`) provides data for 119 `geographic_entity_versions`.
   - A `geographic_entity_version` whose boundaries did not change between 2008 and 2023 remains the *same entity version*, even though newer `dataset_versions` (e.g. CEO 2023 voter rolls) provide updated voter population metrics.

---

## 5. Historical Geography Requirements

### 5.1 Telangana Ground Truth Case Study
Telangana provides an exact testbed for temporal geography in India:

1. **State Formation (2014-06-02)**:
   - Created under the *Andhra Pradesh Reorganisation Act, 2014*.
   - Inherited **10 districts** from unified Andhra Pradesh (*Adilabad, Nizamabad, Karimnagar, Medak, Ranga Reddy, Hyderabad, Mahbubnagar, Nalgonda, Warangal, Khammam*).
   - Electoral geography: **17 Parliamentary Constituencies** and **119 Assembly Constituencies**, fixed by the *2008 Delimitation Commission Order*.
2. **First Major District Reorganization (2016-10-11)**:
   - Promulgated via G.O.Ms.Nos 219–249, Revenue (DA-CMRF) Dept.
   - The 10 districts were carved into **31 districts**.
   - *Crucial Finding*: Electoral constituencies were **not altered**. As a result, AC boundaries no longer nested cleanly within single districts. For example, several ACs had territory in multiple new administrative revenue districts.
3. **Second District Additions (2019-02-17)**:
   - Two additional districts created: *Mulugu* (carved out of Jayashankar Bhupalpally) and *Narayanpet* (carved out of Mahbubnagar), bringing total to **33 districts**.
4. **Subsequent Renames (2021)**:
   - *Warangal Urban* was renamed *Hanamkonda*; *Warangal Rural* became *Warangal*.
5. **Electoral Geography Status (Frozen)**:
   - Under Articles 82 and 170(3) of the Constitution of India (84th Amendment), parliamentary and assembly boundaries are **frozen until the first census after 2026**.
   - Therefore, while Telangana's administrative map changed from 10 to 31 to 33 districts, its 119 ACs and 17 PCs have remained completely stable in territorial extent since 2008.

### 5.2 Required Modeling Primitives
W014 must be capable of expressing:
- **Entity Creation**: Entity born at date `T1`.
- **Entity Abolition**: Entity ceases at date `T2` (`valid_to = T2`).
- **Entity Rename**: Entity retains `internal_id`, receives new version with updated `name`, `predecessor_version_id`, and `valid_from`.
- **Entity Split**: One entity splits into 2 or more entities. Parent entity either ends (`valid_to`) or enters a new version with reduced boundaries; child entity is born with `predecessor_entity_id`.
- **Entity Merger**: Multiple entities merge into one new or expanded entity.
- **Boundary Modification**: Territorial transfer between existing entities.

---

## 6. Future / Scenario Boundary Analysis

### 6.1 Existing Delimitation Simulation Infrastructure
The repository currently contains extensive delimitation simulation logic in `apps/mobile/lib/delimitationTypes.ts` and `apps/mobile/stores/delimitation.ts`:
- Pre-Census 2026 modeling (projected state seat allocation changes: e.g. UP +11 LS seats, TN -8 LS seats under purely population-based seat reallocation).
- `delimitation_proposals` table (Draft, Final, Superseded, Rejected).
- `proposed_constituencies` table with `change_type IN ('unchanged', 'minor_adjust', 'major_redraw', 'split', 'merged', 'new', 'abolished')`.

### 6.2 Contamination Prevention Architecture
To guarantee that hypothetical or future scenarios NEVER contaminate official public data:
1. **Separation of Namespaces**: Canonical tables (`districts`, `parliamentary_constituencies`, `constituencies`) represent **statutory, gazetted reality only**.
2. **Scenario Entities in Dedicated Tables**: Scenario entities live strictly in `proposed_constituencies` or a dedicated `scenario_features` table, linked to a specific `proposal_id` or `scenario_id`.
3. **W012 Governance Invariant**: W012 `data_status` for any scenario data must NEVER be set to `'OFFICIAL'`. Scenario data is permanently restricted to `'UNVERIFIED'` or a dedicated status `'SCENARIO'`.
4. **Query Isolation**: Public mobile screens (e.g. Feed, My Kshetra, Explore, Profile) query only active canonical records where `is_current = true` and `data_status = 'OFFICIAL'` (or unverified pilot during development). Only the dedicated `/delimitation/simulator` screen queries scenario tables.

---

## 7. Identity and Version Semantics

W014 requires an unambiguous, multi-layered identity system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. STABLE CANONICAL ENTITY IDENTITY (UUID)                                  │
│    • Stored in constituencies.internal_id, districts.id, etc.               │
│    • IMMUTABLE across all time, renames, splits, and boundary changes.      │
│    • All domain application foreign keys (posts, issues, users) point here. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. TEMPORAL ENTITY VERSION IDENTITY (UUID)                                  │
│    • Unique to a specific statutory/electoral manifestation.                │
│    • References the Stable Entity Identity (N:1).                           │
│    • Carries valid_from, valid_to, name, boundary geometry, and attributes. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. CANONICAL HUMAN CODE (VARCHAR)                                           │
│    • Formatted stable code (e.g. 'TS-AC-001', 'TS-DIST-HYDERABAD').         │
│    • In general, stable across time; versioned code suffixes allowed if     │
│      statutory numbering changes in a new delimitation regime.              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Concrete Behavioral Evaluation

| Scenario | Stable Entity ID (`internal_id`) | Version ID (`version_id`) | Canonical Code | Action in W014 |
| :--- | :--- | :--- | :--- | :--- |
| **District Rename** (*Warangal Urban* -> *Hanamkonda*) | UNCHANGED | NEW VERSION CREATED | Preserved or Aliased | Old version closed (`valid_to = '2021-08-12'`); new version opened with new name. |
| **District Split** (*Jayashankar* -> *Mulugu*) | *Jayashankar* retains ID; *Mulugu* receives NEW ID | Both receive NEW VERSIONS | *Mulugu* receives `TS-DIST-MULUGU` | *Mulugu* version carries `predecessor_entity_id = Jayashankar.id`. |
| **Constituency Boundary Tweak** (Ward transfer) | UNCHANGED | NEW VERSION CREATED | UNCHANGED (`TS-AC-001`) | Old version closed at delimitation effective date; new version created with updated boundary. |
| **Constituency Abolished** (Seat removed) | UNCHANGED | NO NEW VERSION | UNCHANGED | Active version closed (`valid_to = delimitation_date`, `is_current = false`). Entity preserved for historical FK integrity. |
| **Constituency Created** (New seat added) | NEW UUID GENERATED | FIRST VERSION CREATED | NEW CODE (`TS-AC-120`) | Entity and version created with `valid_from = delimitation_date`. |

---

## 8. Relationship Temporality

Parent-child relationships in Indian political geography are **not time-invariant**. They change across administrative reorganizations and delimitation cycles:

```
           2014-2016                     2016-2019                    2019-Present
┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐
│ 10 Districts                ││ 31 Districts                ││ 33 Districts                │
│ (Old Warangal District)     ││ (Jayashankar Bhupalpally)   ││ (Mulugu District)           │
│              ▲              ││              ▲              ││              ▲              │
│              │ (parent)     ││              │ (parent)     ││              │ (parent)     │
│ AC 109 (Mulug)              ││ AC 109 (Mulug)              ││ AC 109 (Mulug)              │
│ (2008 Delimitation Extent)  ││ (2008 Delimitation Extent)  ││ (2008 Delimitation Extent)  │
└─────────────────────────────┘└─────────────────────────────┘└─────────────────────────────┘
```

### Findings on Current Relationship Modeling
- In W013, `constituencies.district_id` was added as a scalar foreign key to `districts(id)`.
- For the Telangana pilot, all 119 ACs were linked to their **current 2019 composite district**.
- If we need to query: *"Which district did AC 109 belong to in 2015?"*, the current schema cannot answer without destroying current data.
- **W014 Requirement**: Relationship mapping must be represented via temporal association (e.g. `constituency_district_mappings` with `(constituency_id, district_id, valid_from, valid_to)`), or child tables must maintain a temporal foreign key table while preserving `district_id` on the main table as a denormalized pointer to the **current active district** for application backwards-compatibility.

---

## 9. Database Design Impact Analysis

| Table | Classification | Existing PK / Constraints | RLS Status | Required W014 Change | Migration Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`states`** | ADDITIVE CHANGE REQUIRED | `code TEXT PK`, `uq_states_internal_id` | RLS Enabled (Public read) | Add `valid_from DATE`, `valid_to DATE`, `is_current BOOLEAN DEFAULT true`. | **LOW**: Non-breaking additive columns. |
| **`districts`** | ADDITIVE CHANGE REQUIRED | `id UUID PK`, `uq_districts_code` | RLS Enabled (Public read) | Option A: Add temporal columns directly. Option B: Create `district_versions` table. | **MEDIUM**: Must ensure `code` uniqueness does not collide if versioned rows are in same table. |
| **`parliamentary_constituencies`** | ADDITIVE CHANGE REQUIRED | `id UUID PK`, `uq_pcs_code` | RLS Enabled (Public read) | Add delimitation regime binding (`delimitation_regime_id`), `valid_from`, `valid_to`. | **LOW**: Minimal application callers. |
| **`constituencies`** | ADDITIVE CHANGE REQUIRED | `id TEXT PK`, `uq_constituencies_internal_id` | RLS Enabled (Public read) | Must preserve `id TEXT PK` and `internal_id UUID UNIQUE`. Add `valid_from`, `valid_to`, `is_current`, or link to version table. | **HIGH**: 12+ domain tables reference `constituencies.id`. Primary key cannot be altered or removed. |
| **`mandals`** | ADDITIVE CHANGE REQUIRED | `id TEXT PK` (`<state>-MDL-<lgd>`) | Unseeded (0 rows) | Add LGD temporal tracking and foreign key to `districts.id` (replacing denormalized string). | **LOW**: 0 rows currently in DB. |
| **`mandal_constituency_map`** | ADDITIVE CHANGE REQUIRED | `id SERIAL PK`, `UNIQUE(mandal_id, constituency_id)` | Unseeded (0 rows) | Add `valid_from DATE`, `valid_to DATE` to represent temporal shifts in overlap percentages. | **LOW**: 0 rows currently in DB. |
| **`delimitation_proposals`** | ADDITIVE CHANGE REQUIRED | `id UUID PK` | RLS Enabled (Public read) | Link to W012 `dataset_versions` and enforce explicit scenario isolation. | **LOW**: 0 rows currently in DB. |

---

## 10. API & Mobile Impact Inventory

### 10.1 Application Access Pattern Audit
1. **Direct PostgREST Reads**:
   - Mobile `supabaseDataService.ts` and `pageService.ts` perform `.from('constituencies').select('id, name, state_code, district')`.
   - **Timeless Assumption**: These consumers expect a 1:1 flat list of active constituencies where `id = 'TS-AC-1'`.
   - If multiple historical versions of `TS-AC-1` appear in `public.constituencies`, these queries will return duplicate records and crash mobile list rendering (`KeyExtractor` duplicate key warning).
2. **Fastify API Routes**:
   - `apps/api/src/routes/constituencies.ts`: Exposes `GET /api/v1/states/:stateCode/constituencies`.
   - Uses `data/seed/telangana-constituencies.ts` as source truth.
   - Assumes exactly 119 constituencies for `TS` and single district strings.
3. **Domain Foreign Keys**:
   - `public.civic_issues.constituency_id REFERENCES constituencies(id)`
   - `public.posts.constituency_id REFERENCES constituencies(id)`
   - `public.user_profiles.constituency_id REFERENCES constituencies(id)`
   - `public.candidates.constituency_id REFERENCES constituencies(id)`
   - `public.elections.constituency_id REFERENCES constituencies(id)`
   - All domain tables reference the **timeless primary key** (`constituencies.id`).
4. **Architectural Rule for W014**:
   `public.constituencies` must remain the canonical, timeless view/table of active constituencies (or be backed by a view) to ensure **100% zero-drift backwards compatibility** for all mobile and API callers.

---

## 11. Current Data Quality (Staging Read-Only Audit)

All observations independently verified on `panIN-staging` (`fkpigozcqnmcvofuksar`):

| Finding | Value Observed | Quality Classification | Status |
| :--- | :--- | :--- | :--- |
| **Duplicate Geographic Identities** | 0 duplicates across `districts`, `parliamentary_constituencies`, `constituencies`. | VERIFIED | CLEAN |
| **Duplicate Canonical Codes** | 100% unique (`TS-AC-001` through `TS-AC-119`). | VERIFIED | CLEAN |
| **Orphan Foreign Keys** | 0 orphan FKs from ACs to Districts or PCs (119/119 strictly resolved). | VERIFIED | CLEAN |
| **Null Dataset Version References** | 19 of 20 states have `primary_dataset_version_id = NULL` (legacy bootstrap states). | VERIFIED | DEFICIT (DOCUMENTED) |
| **Telangana Pilot Dataset Versions** | 100% of 170 pilot entities (1 State, 33 Districts, 17 PCs, 119 ACs) resolve to valid W012 dataset versions. | VERIFIED | COMPLETE |
| **Governance Status Distribution** | 100% of pilot lineage is `UNVERIFIED`; 0 records elevated to `OFFICIAL`. | VERIFIED | COMPLETE |
| **Chronological District Partition** | 31 districts on `ts_districts_2016_v1`; 2 addition districts (*Mulugu*, *Narayanpet*) on `ts_districts_2019_additions_v1`. | VERIFIED | ACCURATE |
| **Unseeded Hierarchy Tables** | `mandals`, `gram_panchayats`, `revenue_villages`, `polling_booths` have 0 rows in staging. | VERIFIED | UNSEEDED |

---

## 12. W012 Governance Integration

W014 builds upon the foundation established in W012 and W013:

1. **`dataset_versions` Reference**: Every temporal regime or boundary version must declare the `dataset_version_id` from which its coordinates and gazette orders were extracted.
2. **`record_provenance_linkages`**: Every versioned entity record must have an associated provenance record in `public.provenance_records` and a link in `public.record_provenance_linkages`.
3. **`data_status` Governance**:
   - Newly ingested historical or future version data enters as `UNVERIFIED`.
   - Only formal verification promotes a version to `OFFICIAL`.
   - Historical versions are NOT deprecated merely because they are past; they are `OFFICIAL` representations of historical fact, with `valid_to < CURRENT_DATE`.
   - Flawed or superseded data packages receive `DEPRECATED` or `REVOKED`.

---

## 13. Performance & Hot-Path Precheck

| Query Pattern | Consumer | Current Complexity | Expected Impact with Temporal Predicates | Risk Rating |
| :--- | :--- | :--- | :--- | :--- |
| **Constituency Lookup by ID** (`GET /constituencies/:id`) | Mobile, API | `O(1)` PK Index scan on `constituencies.id` | **Zero Impact** if `constituencies` table retains active rows. | **LOW** |
| **Current State Geography** (List all ACs in State) | Mobile State Switcher, Map | Single index scan on `(state_code)` | If temporal versioning is in the same table, requires `WHERE is_current = true`. Partial index `WHERE is_current = true` maintains `O(log N)`. | **LOW** |
| **Point-in-Time Historical Query** ("AC on 2014-06-02") | Analytics, Delimitation Viewer | Currently unsupported | Requires range predicate `valid_from <= date AND (valid_to IS NULL OR valid_to > date)`. GiST index on `daterange(valid_from, valid_to)` ensures high performance. | **MEDIUM** |
| **Spatial Containment & Intersection** | MapLibre, PostGIS | ST_Contains / ST_Intersects | Spatial queries combined with temporal intervals require compound GiST / B-tree indexing. | **HIGH** (Deferred to W015/W016) |

---

## 14. W014 Scope Boundary

### In-Scope for W014:
- Delimitation Regime catalog (`delimitation_regimes` table: e.g. 1951, 1976, 2008, post-2026).
- Entity temporal validity intervals (`valid_from`, `valid_to`, `is_current`).
- Predecessor and successor lineage model (splits, mergers, renames, abolitions).
- Temporal relationship mapping between Assembly Constituencies and Administrative Districts.
- Architectural boundary isolating hypothetical delimitation scenarios from official geography.
- Full integration with W012 provenance and dataset versioning.
- Backwards-compatibility layer preserving all existing API and mobile queries against `public.constituencies`.

### Strictly Out-of-Scope for W014 (Quarantined to Later Jobs):
- **W015 (Spatial Relationship Engine)**: Point-in-polygon containment graph, H3 hexagonal indexing, multi-cycle boundary traversal algorithms.
- **W016 (Geometry & Topology)**: PostGIS polygon ingestion, boundary simplification, TopoJSON topology construction, sliver ring repair.
- **W017 (Quality & Reconciliation Engine)**: Geometry overlap detection, demographic reconciliation, map gateway rendering.
- **Bulk National Ingestion**: Ingesting all 4,120+ national ACs or 780+ national districts is prohibited.
- **Mobile Migration**: No mobile screen refactoring is permitted in W014.

---

## 15. Preliminary W014 Design Proposal (Non-Authorizing)

The proposed design utilizes a **Dual-Horizon Architecture**:
1. **Canonical Active Plane**: `public.constituencies`, `public.districts`, and `public.parliamentary_constituencies` maintain their current rows with `is_current = true`, preserving 100% compatibility with existing domain FKs and mobile callsites.
2. **Temporal Version Plane**: Versioned tables or additive validity columns store the complete historical continuum.

### Proposed Core Schema Components:

```sql
-- 1. Delimitation Regimes (Constitutional / Statutory Regimes)
CREATE TABLE public.delimitation_regimes (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'eci_delimitation_2008'
  name TEXT NOT NULL,
  authority VARCHAR(50) NOT NULL, -- 'Delimitation Commission of India'
  legal_basis TEXT NOT NULL, -- 'Delimitation Act, 2002'
  notified_at DATE NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id)
);

-- 2. Temporal Validity on Canonical Tables (Additive)
ALTER TABLE public.districts
  ADD COLUMN valid_from DATE,
  ADD COLUMN valid_to DATE,
  ADD COLUMN is_current BOOLEAN DEFAULT true,
  ADD COLUMN predecessor_district_id UUID REFERENCES public.districts(id);

ALTER TABLE public.parliamentary_constituencies
  ADD COLUMN delimitation_regime_id VARCHAR(50) REFERENCES public.delimitation_regimes(id),
  ADD COLUMN valid_from DATE,
  ADD COLUMN valid_to DATE,
  ADD COLUMN is_current BOOLEAN DEFAULT true;

ALTER TABLE public.constituencies
  ADD COLUMN delimitation_regime_id VARCHAR(50) REFERENCES public.delimitation_regimes(id),
  ADD COLUMN valid_from DATE,
  ADD COLUMN valid_to DATE,
  ADD COLUMN is_current BOOLEAN DEFAULT true;

-- 3. Temporal Entity Lineage (Tracking Splits, Mergers, Abolitions)
CREATE TABLE public.geography_entity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  predecessor_internal_id UUID NOT NULL,
  successor_internal_id UUID NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('split', 'merged', 'renamed', 'redrawn', 'abolished')),
  effective_date DATE NOT NULL,
  statutory_order TEXT,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Temporal AC-to-District Mapping
CREATE TABLE public.constituency_district_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id),
  district_id UUID NOT NULL REFERENCES public.districts(id),
  overlap_type VARCHAR(20) NOT NULL DEFAULT 'primary' CHECK (overlap_type IN ('primary', 'partial', 'historical')),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 16. Proposed Acceptance & Test Design for W014

When W014 implementation is eventually authorized by the CTO, the following test gates must be proven:

1. **TEST-14-A (Delimitation Regime Catalog)**: Proves `delimitation_regimes` table exists, contains the 2008 ECI regime, and references valid W012 dataset versions.
2. **TEST-14-B (Additive Temporal Columns)**: Proves `valid_from`, `valid_to`, `is_current` exist on canonical tables with correct defaults.
3. **TEST-14-C (Point-in-Time Resolution)**: Proves query at `2014-06-02` resolves 10 districts for Telangana, query at `2016-10-12` resolves 31 districts, query at `2019-02-18` resolves 33 districts.
4. **TEST-14-D (Temporal AC-to-District Integrity)**: Proves AC 109 (*Mulug*) maps historically to *Warangal* (2014), *Jayashankar* (2016), and *Mulugu* (2019) without mutating the primary AC identity.
5. **TEST-14-E (Zero Temporal Overlap Invariant)**: Proves an entity cannot have overlapping validity intervals for the same active attribute version (`EXCLUDE USING gist`).
6. **TEST-14-F (Predecessor/Successor Lineage)**: Proves *Mulugu* district points to *Jayashankar Bhupalpally* as its split predecessor.
7. **TEST-14-G (Scenario Isolation Proof)**: Proves queries against public/canonical tables return 0 scenario or draft proposal rows.
8. **TEST-14-H (W012 Lineage Chain)**: Proves 100% of temporal timeline and lineage records link to valid W012 `dataset_versions` with status `UNVERIFIED`.
9. **TEST-14-I (Backwards-Compatibility Smoke Test)**: Proves existing mobile and API queries continue to receive identical HTTP 200 responses with zero schema breakage.

---

## 17. Defect Discovery & Disposition Matrix

| Defect ID | Severity | Domain | Current State | W014 Relevance | Recommended Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-006** | **P2** | Database / GIS | Missing versioned geography tables; flat tables used in bootstrap migrations. Quarantined to W013–W017. | Direct Core Focus. W014 designs the temporal validity intervals and version graph schema. | **SCHEDULED FOR RESOLUTION IN W014–W016**. W014 preflight establishes the temporal foundation. |
| **UNK-05** | **P3** | Geography / LGD | Historical LGD district codes for dissolved pre-2014 districts are uncataloged. | Relevant when historical AP 10-district pre-2014 data is ingested. | **DEFERRED TO W015/HISTORICAL INGESTION**. Non-blocking for W014 pilot design. |

---

## 18. Governance Reconciliation

- `EXECUTION_STATE.md`: W013 remains `ACCEPTED / COMPLETE`. W014 is recorded as `PREFLIGHT COMPLETE — IMPLEMENTATION NOT AUTHORIZED`.
- `ACCEPTANCE_REGISTER.md`: W013 recorded with commit `d0f3fcd`.
- `DEFECT_REGISTER.md`: DEF-006 maintained as in-progress / deferred to W013–W017.
- `DECISION_LOG.md`: DEC-058 and DEC-059 intact.
- **Rule IV-001 Attestation**: No self-certification. Implementation authorization has NOT been granted.

---

## 19. Summary & Final Status

- **Database Changes**: ZERO (0 tables created, 0 columns added, 0 mutations executed).
- **Application Changes**: ZERO (0 lines of code modified in `apps/api` or `apps/mobile`).
- **Production Status**: STRICTLY UNTOUCHED (0 bytes, 0 requests).
- **Staging Status**: READ-ONLY INSPECTION ONLY.
- **Machine-Readable Evidence**: [`reports/w014_preflight_inspection_evidence.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w014_preflight_inspection_evidence.json)

**FINAL STATUS:**  
`W014_PREFLIGHT_INSPECTION_COMPLETE — AWAITING CTO REVIEW`
