# W013 — CANONICAL GEOGRAPHY MODEL
## Pre-Implementation CTO Inspection & Preflight Report (Final Reconciled)

**Document ID**: `REP-W013-PREFLIGHT-003`  
**Revision**: `3.0 (Final CTO Design Reconciliation)`  
**Date**: September 22, 2026  
**Status**: **`W013_FINAL_DESIGN_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`**  
**Execution Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Target**: **STRICTLY UNTOUCHED / OUT OF SCOPE**  
**Implementation Authorization**: **NOT GRANTED / DESIGN RECONCILIATION ONLY**  
**Migration 040 Status**: **NOT CREATED / NOT EXECUTED**

---

## 1. Executive Summary & Design Reconciliation Directives

Following the CTO's final design review, all three outstanding architectural and data-integrity items have been resolved:

1. **Telangana District Dataset Reorganisation Chronology**:
   - The 2016 reorganisation created **31 districts** (G.O.Ms.Nos 219–249, Revenue (DA-CMRF) Dept, dated 11-10-2016).
   - The 2019 additions created **2 additional districts** (Mulugu and Narayanpet via G.O.Ms.Nos 18 & 19, Revenue (DA) Dept, dated 16-02-2019).
   - The current **33 districts** represent a composite statutory catalog.
   - All district pilot records will enter with `data_status_enum = 'UNVERIFIED'` until raw gazette artifacts and SHA-256 evidence records are ingested under W012.
2. **W012 Enum Semantics Reconciliation**:
   - `data_sources.authority_level` strictly uses Migration 039's `source_authority_enum`: `'constitutional'`, `'statutory'`, `'academic'`, `'media_ngo'`, `'crowdsourced'`, `'synthetic_model'`.
   - Data statuses strictly use Migration 039's `data_status_enum`: `'OFFICIAL'`, `'DERIVED'`, `'VERIFIED'`, `'ESTIMATE'`, `'SCENARIO'`, `'INFERRED'`, `'UNVERIFIED'`, `'UNKNOWN'`.
   - Clear architectural separation is maintained:
     $$\text{SOURCE AUTHORITY} \neq \text{DATA STATUS} \neq \text{EVIDENCE / VERIFICATION STATE}$$
3. **`primary_dataset_version_id` Semantics & Cardinality**:
   - `primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id)` represents **the primary/canonical dataset version from which the entity record was seeded or instantiated**.
   - It is **NOT** the complete provenance of the entity. Complete provenance is tracked through W012's `record_provenance_linkages` (M:N junction connecting domain records to the `provenance_records` DAG and `evidence_records`).
4. **`constituencies` Tripartite Identity Model**:
   - `id VARCHAR(20)`: Legacy/existing compatibility identifier (e.g. `'TS-AC-1'`). Preserved as primary key to protect existing domain foreign keys.
   - `internal_id UUID`: Canonical immutable internal identity (NOT NULL, UNIQUE, immutable, generated exactly once via `gen_random_uuid()`).
   - `canonical_code VARCHAR(30)`: Human-readable canonical identifier (e.g. `'TS-AC-001'`). NOT NULL, UNIQUE, immutable within W013.

---

## 2. Repository & Working Tree Baseline

| Metric | Source-of-Truth Value | Verification Status |
| :--- | :--- | :--- |
| **Git HEAD Commit** | `73f4b272f10b7f8045d614867dae5a9eeadff045` | Verified |
| **Working Tree Status** | Clean prior to this update | Verified (`git status --porcelain`) |
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

**Empirical Finding**: 100% of rows currently present in `user_profiles`, `posts`, and `civic_issues` have `constituency_id = NULL`. Retaining `public.constituencies(id)` guarantees zero broken foreign keys and full backward compatibility.

---

## 4. Reconciled Source Authority & Pilot Dataset Catalog

| Tier | Scope | Count | Publisher | `authority_level` (`source_authority_enum`) | Dataset Identifier | Version (`dataset_versions.id`) | `default_status` (`data_status_enum`) | Evidence / Verification State |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **State** | Telangana (`TS`) | 1 | Ministry of Home Affairs / Parliament | `statutory` | `mha_state_reorganisation` | `mha_ts_2014_v1` | `UNVERIFIED` | AP Reorganisation Act 2014 pending SHA-256 |
| **Districts (Base)** | 31 Base Districts | 31 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2016_v1` | `UNVERIFIED` | G.O.Ms.Nos 219–249 pending SHA-256 |
| **Districts (Additions)** | Mulugu & Narayanpet | 2 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2019_additions_v1` | `UNVERIFIED` | G.O.Ms.Nos 18 & 19 pending SHA-256 |
| **Districts (Composite)**| Current 33 Districts | 33 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2019_composite_v1` | `UNVERIFIED` | Composite Catalog pending SHA-256 |
| **PCs** | Telangana Lok Sabha | 17 | Election Commission of India | `constitutional` | `eci_delimitation_order_2008` | `eci_ts_pc_2008_v1` | `UNVERIFIED` | ECI Delimitation Order 2008 pending SHA-256 |
| **ACs** | Telangana Vidhan Sabha | 119 | Election Commission of India | `constitutional` | `eci_delimitation_order_2008` | `eci_ts_ac_2008_v1` | `UNVERIFIED` | ECI Delimitation Order 2008 pending SHA-256 |

*Rule*: All pilot records enter with `default_status = 'UNVERIFIED'`. Elevation to `'OFFICIAL'` will occur strictly when cryptographically verified `evidence_records` are registered under W012 governance protocols.

---

## 5. Provenance Cardinality Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PROVENANCE CARDINALITY MODEL                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Canonical Entity → primary_dataset_version_id:                       │
│    - Exactly ONE (1:1 direct foreign key for foundational seed lineage).│
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Canonical Entity → record_provenance_linkages:                       │
│    - Zero, One, or MANY (1:N junction via domain_table + domain_record_id│
│      allowing multiple provenance nodes across entity lifecycle).       │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. record_provenance_linkages → provenance_records:                     │
│    - Exactly ONE per linkage (N:1, append-only transformation history). │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. provenance_records → evidence_records:                               │
│    - Zero or ONE (optional link; mandatory for OFFICIAL status).        │
├─────────────────────────────────────────────────────────────────────────┤
│ 5. provenance_records → dataset_versions:                               │
│    - Exactly ONE per provenance node (N:1 via dataset_version_id).      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Classified UNKNOWN Register

| Unknown ID | Description | Classification | Resolution Dependency |
| :--- | :--- | :--- | :--- |
| **`UNK-01`** | National LGD Sub-District to ECI AC cross-reference mapping for all 4,120+ ACs | **Non-blocking for W013** | **W015** (Relationship Engine) & **W017** (Quality Engine) |
| **`UNK-02`** | Authoritative MultiPolygon geometries for 9 placeholder states (PY, TR, ML, MN, NL, UK, SK, AR, MZ) | **Non-blocking for W013** | **W016** (Real Geographic Mapping) |
| **`UNK-03`** | Exact population split weights for rural mandals bifurcated by AC boundaries | **Non-blocking for W013** | **W015** (Relationship Engine) |
| **`UNK-04`** | National ECI Delimitation Gazette SHA-256 hashes for all 543 PCs | **Blocking for national PCs; Non-blocking for W013 pilot** | Excluded from W013; bounded to Telangana pilot |
| **`UNK-05`** | Historical LGD District codes for dissolved pre-2014 districts | **Non-blocking for W013** | **W014** (Geography Versioning) |

---

## 7. Explicit Implementation Confirmation Statement

- **Migration 040 has NOT been created or executed.**
- **No database (staging or production) has been modified.**
- **No application code has been modified.**
- **All activities have been strictly bounded to design reconciliation and documentation.**

**Final Submission Status**:  
`W013_FINAL_DESIGN_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`
