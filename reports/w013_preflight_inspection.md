# W013 — CANONICAL GEOGRAPHY MODEL
## Pre-Implementation CTO Inspection & Preflight Report (Reconciled)

**Document ID**: `REP-W013-PREFLIGHT-002`  
**Revision**: `2.0 (Post-CTO Review Reconciliation)`  
**Date**: September 22, 2026  
**Status**: **`W013_PREFLIGHT_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`**  
**Execution Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Target**: **STRICTLY UNTOUCHED / OUT OF SCOPE**  
**Implementation Authorization**: **NOT GRANTED / PREFLIGHT ONLY**

---

## 1. Executive Summary & Reconciliation Directives

Following CTO review of the initial W013 preflight findings, this revised document incorporates critical architectural reconciliations prior to requesting implementation authorization. 

The Political Geography Graph is the foundational spine of PANIN / Kshetra. The following core principles now govern the canonical model:
1. **Version- & Source-Bounded AC Counts**: Total Assembly Constituency counts (e.g., 4,120 or 4,123) are explicitly recognized as **not timeless invariants**. AC counts vary across delimitation orders (e.g., 2008 Delimitation Order vs. J&K Reorganisation Act 2019/2022). Bulk national AC ingestion is prohibited for W013; only verified, source-evidenced pilot datasets will be ingested.
2. **Separation of Identity, Canonical Code, and Source Identifiers**: Every canonical entity will possess an immutable internal UUID primary key. Human-readable compound codes (e.g., `TS-AC-001`, `TS-PC-01`, `TS-DIST-501`) serve as unique canonical codes, not immutable internal identities. Source-specific identifiers (ECI numbers, LGD codes, Census 2011 codes) are decoupled into typed attributes. Single-attribute numbers (e.g., bare `ac_no`) are prohibited as keys.
3. **No W014 Scaffolding**: All proposed temporal/versioning columns (`effective_from`, `effective_to`, `is_active`) have been removed from W013 scope. Temporal intervals, boundary regimes, and point-in-time reconstruction are exclusively owned by Job W014.
4. **Dual Divergent Hierarchy**: Administrative geography (State $\rightarrow$ District $\rightarrow$ Mandal $\rightarrow$ Village) and Electoral geography (State $\rightarrow$ PC $\rightarrow$ AC $\rightarrow$ Polling Booth) are formally decoupled. No single tree hierarchy is assumed.
5. **Preservation of `public.constituencies`**: Existing domain tables (`user_profiles`, `posts`, `civic_issues`, `campaigns`, `projects`) reference `public.constituencies(id)`. The table is preserved to guarantee backward compatibility, with additive columns introducing the internal UUID, canonical code, and relational foreign keys.
6. **Integration with W012 Data Governance**: Geography entities integrate directly into W012 via `dataset_versions` references and granular `record_provenance_linkages` backed by verified `evidence_records` and `provenance_records`.

---

## 2. Repository & Working Tree Baseline

| Metric | Source-of-Truth Value | Verification Status |
| :--- | :--- | :--- |
| **Git HEAD Commit** | `e6b6096ea0fc41af79d2a0220e36a76fc22c0a63` | Verified |
| **Working Tree Status** | Clean (`0` unstaged / untracked files prior to this update) | Verified (`git status --porcelain`) |
| **Repo Evidence Integrity** | `32 / 32` referenced commits verified in git ancestry | **PASS** (`scripts/check-repo-evidence-integrity.mjs`) |
| **Branch** | `master` | Canonical repository branch |
| **Target Database** | Supabase `panIN-staging` (`fkpigozcqnmcvofuksar`) | Target verified via REST API |

---

## 3. Database Schema Baseline & Live Staging Inventory

### 3.1 Migration History & Geography DDL
Four migrations historically introduced geography-related structures:
1. `001_initial_schema.sql`: Introduced `states` and `constituencies` tables, foundational enums, and basic B-Tree indexes.
2. `011_delimitation.sql`: Enabled `postgis` extension (`GEOMETRY(MultiPolygon, 4326)`), introduced scenario delimitation tables (`delimitation_proposals`, `proposed_constituencies`, `constituency_mapping`, `ward_population`).
3. `022_panchayat_tier.sql`: Introduced rural local governance (`mandals`, `gram_panchayats`, `revenue_villages`, `polling_booths`, and the `mandal_constituency_map` junction table).
4. `023_local_governance.sql`: Introduced urban local governance and 3-tier Panchayati Raj institutions (`urban_local_bodies`, `ulb_wards`, `zilla_parishads`, `zptc_divisions`, `mandal_parishads`, `mptc_divisions`, `gp_wards`, `representatives`).

### 3.2 Live Staging Table Row Counts & PostGIS Status
Live inspection against Supabase `panIN-staging`:

| Table Name | DDL Primary Key | Staging Row Count | Schema Notes & Findings |
| :--- | :--- | :---: | :--- |
| `states` | `id VARCHAR(10)` | **20** | `TS` (full), `MH` (planned), 18 stub states. **16 States/UTs missing entirely**. |
| `constituencies` | `id VARCHAR(20)` | **0** | **Completely empty**. Models only Assembly Constituencies. |
| `mandals` | `id VARCHAR(30)` | **0** | **Completely empty**. LGD unique constraint configured. |
| `gram_panchayats` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `revenue_villages` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `polling_booths` | `id VARCHAR(30)` | **0** | **Completely empty**. Unique composite `(constituency_id, booth_number)`. |
| `mandal_constituency_map` | `id SERIAL` | **0** | **Completely empty**. M:N mapping table between mandals and ACs. |
| `urban_local_bodies` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `ulb_wards` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `zilla_parishads` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `zptc_divisions` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `mandal_parishads` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `mptc_divisions` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `gp_wards` | `id VARCHAR(30)` | **0** | **Completely empty**. |
| `representatives` | `id UUID` | **0** | **Completely empty**. Polymorphic entity link. |
| `delimitation_proposals` | `id UUID` | **0** | **Completely empty**. Scenario container. |
| `proposed_constituencies` | `id UUID` | **0** | **Completely empty**. MultiPolygon PostGIS geometry. |
| `constituency_mapping` | `id UUID` | **0** | **Completely empty**. Scenario overlap mapping. |
| `ward_population` | `id UUID` | **0** | **Completely empty**. PostGIS geometry. |
| **`districts`** | *None* | **DOES NOT EXIST** | **Table is completely absent from database schema**. |
| **`parliamentary_constituencies`**| *None* | **DOES NOT EXIST** | **Table is completely absent from database schema**. |

### 3.3 Foreign Key Consumers & Live Null Analysis
The following domain tables declare foreign keys referencing `constituencies(id)`:
- `user_profiles.constituency_id`
- `posts.constituency_id`
- `civic_issues.constituency_id`
- `campaigns.constituency_id`
- `projects.constituency_id`

**Empirical Finding**: 100% of rows currently present in `user_profiles`, `posts`, and `civic_issues` have `constituency_id = NULL`. Because no records exist in `constituencies`, domain tables are entirely decoupled in live data. Preserving `public.constituencies(id)` guarantees zero disruption.

---

## 4. Competing Sources of Truth & Subsystem Fragmentation

The system currently exhibits multiple disconnected representations of geographic data:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DISCONNECTED SOURCES OF TRUTH IN CURRENT REPOSITORY                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. PostgreSQL DB: 20 states, 0 ACs, 0 mandals, NO districts table       │
│ 2. Seed TS Files: 31 states, 4,120 ACs (data/seed/*-constituencies.ts)  │
│ 3. Mobile SQLite: 137 MB file (apps/mobile/data/seed-data.db)           │
│ 4. GeoJSON Assets: 32 states (apps/api/public/geo/); 9 placeholder      │
│ 5. Shared Types: 36 states/UTs (packages/shared/src/types/geography.ts) │
│ 6. Web Admin Mock: 16 states, synthetic IDs TS-PC-09                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Architectural Reconciliation & Identity Model

### 5.1 Decoupling Identity from Source Identifiers
The canonical geography model enforces a strict three-tier identifier separation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CANONICAL IDENTITY ARCHITECTURE                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Immutable Internal Identity: UUID (Surrogate Key)                    │
│    - Generated at row creation (gen_random_uuid())                      │
│    - Completely immune to political renamings, code changes, splits     │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Canonical Human-Readable Code: Structured Text (Alternate Key)       │
│    - States: ISO 3166-2:IN code (e.g. 'TS', 'AP', 'MH')                 │
│    - Districts: '<state>-DIST-<lgd_code>' (e.g. 'TS-DIST-501')          │
│    - PCs: '<state>-PC-<pc_number>' (e.g. 'TS-PC-01')                    │
│    - ACs: '<state>-AC-<3-digit-padded-ac_no>' (e.g. 'TS-AC-001')        │
│    - Mandals: '<state>-MDL-<lgd_code>' (e.g. 'TS-MDL-501')             │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Source-Specific Identifiers: Typed Attributes                        │
│    - eci_ac_code / eci_pc_code (Election Commission of India)           │
│    - lgd_code (Local Government Directory / MoPR)                       │
│    - census_code_2011 (Registrar General & Census Commissioner)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Reconciling `public.constituencies` (Assembly Constituencies)
To maintain 100% backward compatibility with existing domain tables while establishing canonical integrity:
- **Retain Table Name**: `public.constituencies`.
- **Retain Existing PK**: `id VARCHAR(20) PRIMARY KEY` (stores values like `'TS-AC-1'`).
- **Add Internal Identity**: `internal_id UUID UNIQUE DEFAULT gen_random_uuid()`.
- **Add Canonical Code**: `canonical_code VARCHAR(30) UNIQUE` (stores padded `'TS-AC-001'`).
- **Add Entity Type**: `entity_type VARCHAR(30) DEFAULT 'assembly_constituency'`.
- **Add Explicit ECI Number**: `ac_number INTEGER NOT NULL`.
- **Add Relational Foreign Keys**:
  - `parliamentary_constituency_id UUID REFERENCES parliamentary_constituencies(id)`
  - `district_id UUID REFERENCES districts(id)`
  - `state_id VARCHAR(10) REFERENCES states(id)`
- **Add Source Identifiers**: `eci_ac_code VARCHAR(20)`.
- **Add W012 Provenance FK**: `dataset_version_id UUID REFERENCES dataset_versions(id)`.

### 5.3 Canonical District Entity
The absence of a `districts` entity is resolved by defining the canonical schema:
- **Table Name**: `public.districts`.
- **Primary Key**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Canonical Code**: `code VARCHAR(30) UNIQUE NOT NULL` (e.g., `'TS-DIST-501'`).
- **State FK**: `state_id VARCHAR(10) REFERENCES states(id) NOT NULL`.
- **Entity Type**: `entity_type VARCHAR(30) DEFAULT 'district'`.
- **Names**: `name TEXT NOT NULL`, `name_te TEXT`.
- **Source Identifiers**: `lgd_code INTEGER UNIQUE`, `census_code_2011 VARCHAR(20)`.
- **Headquarters**: `headquarters TEXT`.
- **Provenance Link**: `dataset_version_id UUID REFERENCES dataset_versions(id)`.
- **Uniqueness**: `UNIQUE(state_id, name)` and `UNIQUE(lgd_code)`.

### 5.4 Canonical Parliamentary Constituency Entity
The representation of Lok Sabha constituencies is formalized:
- **Table Name**: `public.parliamentary_constituencies`.
- **Primary Key**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Canonical Code**: `code VARCHAR(30) UNIQUE NOT NULL` (e.g., `'TS-PC-01'`).
- **State FK**: `state_id VARCHAR(10) REFERENCES states(id) NOT NULL`.
- **Entity Type**: `entity_type VARCHAR(30) DEFAULT 'parliamentary_constituency'`.
- **PC Number**: `pc_number INTEGER NOT NULL`.
- **Names**: `name TEXT NOT NULL`, `name_te TEXT`.
- **Reservation**: `reservation VARCHAR(20) DEFAULT 'general'`.
- **Source Identifiers**: `eci_pc_code VARCHAR(20)`.
- **Provenance Link**: `dataset_version_id UUID REFERENCES dataset_versions(id)`.
- **Uniqueness**: `UNIQUE(state_id, pc_number)`.

---

## 6. Political Geography Graph & Dual Hierarchy Separation

Administrative geography and Electoral geography represent distinct operational concerns in the Indian constitutional framework. The canonical model formally separates them into two parallel hierarchies:

```
                      [ Country (IN) ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Administrative Hierarchy ]      [ Electoral Hierarchy ]
            │                                 │
     [ State / UT ]                    [ State / UT ]
            │                                 │
     [ District ]                     [ Parliamentary Constituency (PC) ]
      (LGD Code)                       (Lok Sabha - ECI Order)
            │                                 │
     [ Sub-District / Mandal ]                │
      (Revenue Division / Tehsil)             │
            │                                 │
            ├─────────────────────────┐       │
            ▼                         ▼       ▼
    [ Rural Local Govt ]    [ Urban Local Govt ]     [ Assembly Constituency (AC) ]
    - Zilla Parishad        - Municipal Corp          (Vidhan Sabha - ECI Order)
    - Mandal Parishad       - Municipality                    │
    - Gram Panchayat        - Nagar Panchayat                 │
    - Revenue Village       - ULB Ward                        ▼
                                                     [ Polling Booth (Part) ]
```

### Relational Intersections:
- **PC to AC**: Strict 1:N hierarchy within states under Delimitation Commission orders. Modeled via `constituencies.parliamentary_constituency_id`.
- **District to AC**: Predominantly 1:N, anchored by `constituencies.district_id`.
- **Mandal to AC**: Many-to-Many (M:N) overlap. Administrative mandals frequently straddle electoral assembly boundaries. The existing `mandal_constituency_map` junction table is preserved to capture this relationship without conflating administrative and electoral hierarchies into a single tree.

---

## 7. W012 Data Governance Integration Model

The canonical geography model connects directly to the W012 governance architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ W012 DATA GOVERNANCE LINEAGE FLOW                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. data_sources: Official statutory bodies (ECI, MoPR/LGD, MHA, SoI)    │
│         │                                                               │
│         ▼                                                               │
│ 2. datasets: Published gazettes or orders (e.g. eci_delimitation_2008)  │
│         │                                                               │
│         ▼                                                               │
│ 3. dataset_versions: Specific version snapshot with SHA-256 hash        │
│         │                                                               │
│         ├───────────────────────────────┐                               │
│         ▼                               ▼                               │
│ 4. Direct Foreign Key:             5. Granular Provenance:              │
│    canonical_entity.dataset_          evidence_records                  │
│    version_id REFERENCES                     │                          │
│    dataset_versions(id)                      ▼                          │
│                                       provenance_records                │
│                                              │                          │
│                                              ▼                          │
│                                       record_provenance_linkages        │
│                                       (target_table, target_id)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Source Authority & Bounded Pilot Dataset

In compliance with the CTO mandate, **bulk ingestion of national ACs or 543 PCs is prohibited** during W013. W013 seed data is strictly bounded to the authorized Telangana pilot, where verified statutory and gazette evidence is established:

| Tier | Entity Scope | Count | Official Source | Authority Classification | Dataset Identifier | Dataset Version | Retrieval Date | Evidence State |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **State** | Telangana (`TS`) | 1 | AP Reorganisation Act, 2014 (MHA) | `OFFICIAL_STATUTORY` | `mha_state_reorganisation_2014` | `mha_ts_2014_v1` | 2026-09-22 | `VERIFIED_STATUTE` |
| **Districts** | Telangana Districts | 33 | GoTS Revenue Gazette 2016 (Reorganisation of Districts) | `OFFICIAL_GAZETTE` | `ts_revenue_district_reorganisation_2016` | `ts_districts_2016_v1` | 2026-09-22 | `VERIFIED_GAZETTE` |
| **PCs** | Telangana Lok Sabha | 17 | ECI Delimitation Order 2008 / AP Reorganisation Act 2014 | `OFFICIAL_CONSTITUTIONAL` | `eci_delimitation_order_2008` | `eci_ts_pc_2008_v1` | 2026-09-22 | `VERIFIED_ECI_ORDER` |
| **ACs** | Telangana Vidhan Sabha | 119 | ECI Delimitation Order 2008 / AP Reorganisation Act 2014 | `OFFICIAL_CONSTITUTIONAL` | `eci_delimitation_order_2008` | `eci_ts_ac_2008_v1` | 2026-09-22 | `VERIFIED_ECI_ORDER` |

*All non-pilot states and constituencies remain unpopulated in the database until their source evidence records and gazette versions are formally registered under W012.*

---

## 9. Existing Client & API Compatibility Strategy

| Subsystem / Interface | Current Reality | Compatibility Strategy for W013 |
| :--- | :--- | :--- |
| **`acNo` Attribute** | Mobile client uses integer `acNo` | Backend APIs continue providing `acNo` alongside new `canonicalCode` and `internalId`. |
| **`stateCode` Pairing** | Mobile stores `acNo` without `stateCode` | Enforce explicit `(stateCode, acNo)` compound lookup in client stores to eradicate cross-state collisions. |
| **`constituency_id` FK** | Domain tables have nullable FK to `constituencies(id)` | Retain `constituencies.id VARCHAR(20)` as PK (`TS-AC-1`). Zero FK definitions are broken. |
| **API Response Contracts** | Fastify routes return JSON payloads from seed files | New DB queries match the exact JSON property keys expected by mobile and web-admin. |
| **Mobile SQLite DB** | 137 MB offline database (`seed-data.db`) | **Strictly untouched** during W013. Client migration to server-backed sync is deferred to client roadmap. |
| **Fastify Seed Files** | `data/seed/*-constituencies.ts` loaded in memory | Maintained as runtime fallback during W013. Backend routes will progressively read from PostgreSQL staging once verified. |
| **Shared Types** | `packages/shared/src/types/geography.ts` | Updated to include `canonical_code`, `internal_id`, and explicit `District` and `ParliamentaryConstituency` interfaces. |
| **Web Admin Mock** | Hardcoded mock data in React components | Web admin constituency tables will connect to verified API endpoints. |

---

## 10. Classified UNKNOWN Register

Every identified unknown has been rigorously categorized:

| Unknown ID | Description | Classification | Resolution Dependency |
| :--- | :--- | :--- | :--- |
| **`UNK-01`** | National LGD Sub-District to ECI AC cross-reference mapping for all 4,120+ ACs | **Non-blocking for W013** | **W015** (Relationship Engine) & **W017** (Quality Engine) |
| **`UNK-02`** | Authoritative MultiPolygon geometries for 9 placeholder states (PY, TR, ML, MN, NL, UK, SK, AR, MZ) | **Non-blocking for W013** | **W016** (Real Geographic Mapping) |
| **`UNK-03`** | Exact population split weights for rural mandals bifurcated by AC boundaries | **Non-blocking for W013** | **W015** (Relationship Engine) |
| **`UNK-04`** | National ECI Delimitation Gazette SHA-256 hashes for all 543 Parliamentary Constituencies | **Blocking for national PCs; Non-blocking for W013 pilot** | Excluded from W013; bounded to Telangana pilot |
| **`UNK-05`** | Historical LGD District codes for districts dissolved prior to 2014 | **Non-blocking for W013** | **W014** (Geography Versioning) |

---

## 11. Bounded Scope for Job W013

### 11.1 Authorized W013 Implementation Scope (Pending CTO Approval):
1. **Migration Package 040 (DDL)**:
   - Create `districts` table with internal UUID, canonical code, state FK, and LGD codes.
   - Create `parliamentary_constituencies` table with internal UUID, canonical code, state FK, and ECI PC numbers.
   - Enhance `constituencies` table with internal UUID, canonical code, PC FK, District FK, preserving existing `id VARCHAR(20)` PK.
   - Add `dataset_version_id UUID REFERENCES dataset_versions(id)` to all canonical geography tables.
2. **Seed Migration Package (DML)**:
   - Ingest verified Telangana pilot records: 1 State, 33 Districts, 17 PCs, 119 ACs backed by verified statutory gazettes.
3. **W012 Governance Registration**:
   - Register ECI Delimitation 2008 and Telangana Revenue Gazette 2016 datasets, evidence records, and provenance records.
4. **Runtime Verification Battery**:
   - Deliver automated test suite `tests/verify_w013_canonical_geography.mjs` verifying schema integrity, foreign keys, uniqueness, and public read RLS.

### 11.2 Explicit Exclusions (W014 through W017):
- **PROHIBITED**: Implementing W014 temporal validity columns (`effective_from`, `effective_to`, `is_active`), temporal intervals, or versioning engines.
- **PROHIBITED**: Implementing W015 spatial graph traversal algorithms, M:N overlap calculations, or population split weighting.
- **PROHIBITED**: Implementing W016 PostGIS spatial topology operations, GeoJSON rewrites, or vector tile generation.
- **PROHIBITED**: Implementing W017 automated boundary gap/sliver validation engines or cross-source reconciliation pipelines.
- **PROHIBITED**: Bulk ingestion of national 4,120+ ACs or 543 PCs without verified evidence records.
- **PROHIBITED**: Deleting or rewriting the 137 MB mobile SQLite database.
- **PROHIBITED**: Modifying production database under any circumstances.

---

## 12. CTO Decision Request

The preflight inspection has been fully reconciled to address all CTO architectural directives.

**Required Action**: Review this reconciled preflight report and the companion architectural proposal [`reports/w013_canonical_model_proposal.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w013_canonical_model_proposal.md) to authorize bounded W013 implementation.

**Current Operational Status**:  
`W013_PREFLIGHT_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`
