# W013 — CANONICAL GEOGRAPHY MODEL
## Architectural Design & Implementation Proposal (Reconciled)

**Document ID**: `PROP-W013-CANONICAL-MODEL-002`  
**Revision**: `2.0 (Post-CTO Review Reconciliation)`  
**Date**: September 22, 2026  
**Status**: **`W013_FINAL_DESIGN_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`**  
**Target Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Target**: **STRICTLY UNTOUCHED / OUT OF SCOPE**  
**Implementation Authorization**: **NOT GRANTED / PROPOSAL ONLY**  
**Migration 040 Status**: **NOT CREATED / NOT EXECUTED**

---

## 1. Executive Summary & Core Design Principles

The Political Geography Graph is the architectural spine of Kshetra / PANIN. This proposal establishes the reconciled design for **Job W013: Canonical Geography Model**, addressing all architectural, data-integrity, and enum semantic requirements specified by the CTO.

### Core Architectural Principles:
1. **Immutable Internal Identity**: Every canonical geography entity is identified by an immutable internal UUID (`gen_random_uuid()`), completely decoupling internal entity lifecycle from political renamings, state splits, or boundary revisions.
2. **Tripartite Identity Semantics**:
   - `id VARCHAR(20)`: Existing compatibility identifier (legacy primary key on `public.constituencies` to preserve domain foreign keys).
   - `internal_id UUID`: Canonical immutable internal identity (NOT NULL, UNIQUE, immutable, generated exactly once).
   - `canonical_code VARCHAR(30)`: Canonical human-readable code (e.g., `TS-AC-001`, `TS-PC-01`, `TS-DIST-501`; NOT NULL, UNIQUE, immutable within W013).
3. **Decoupled Dual Hierarchies**: Administrative geography (State $\rightarrow$ District $\rightarrow$ Mandal $\rightarrow$ Village) and Electoral geography (State $\rightarrow$ PC $\rightarrow$ AC $\rightarrow$ Polling Booth) are modeled as parallel relational hierarchies. The M:N intersection between administrative mandals and electoral assembly constituencies is maintained via `mandal_constituency_map`.
4. **Regime-Bounded Delimitation (No Timeless Invariants)**: Total seat counts (e.g., 4,120 or 4,123 ACs) are not universal constants. Seat counts depend on applicable statutory Delimitation Orders. National bulk ingestion is prohibited for W013; only verified, source-evidenced pilot datasets will be ingested.
5. **Strict W012 Data Governance Alignment**: All source authorities, data statuses, and provenance linkages conform 100% to Migration 039 enum types and table definitions (`source_authority_enum`, `data_status_enum`, `data_sources`, `datasets`, `dataset_versions`, `evidence_records`, `provenance_records`, `record_provenance_linkages`).
6. **Strict Separation of W013 from W014–W017**: Temporal validity, delimitation regimes, spatial traversal graph algorithms, geometry ingestion, and spatial quality engines are strictly excluded from W013.

---

## 2. W012 Enum Semantics & Provenance Architecture Alignment

### 2.1 Reconciling Source Authority vs. Data Status vs. Evidence State
The design strictly respects the separation enforced by Migration 039:

$$\text{SOURCE AUTHORITY} \neq \text{DATA STATUS} \neq \text{EVIDENCE / VERIFICATION STATE}$$

#### A. Source Authority (`source_authority_enum` in Migration 039)
Represents the institutional standing and statutory mandate of the data publisher. Stored in `data_sources.authority_level`:
- `'constitutional'`: Entities established directly by the Constitution of India (e.g., Election Commission of India under Article 324).
- `'statutory'`: Entities established by legislative statute or executive notification (e.g., Ministry of Home Affairs, Delimitation Commission, Ministry of Panchayati Raj / LGD, Government of Telangana Revenue Department).
- `'academic'`: University research datasets and peer-reviewed census studies.
- `'media_ngo'`: Civil society or media-compiled data (e.g., ADR / National Election Watch).
- `'crowdsourced'`: Community-submitted corrections.
- `'synthetic_model'`: Projections or algorithmic simulations.

*W013 will NOT create parallel authority enums. All sources map strictly to `source_authority_enum`.*

#### B. Data Status (`data_status_enum` in Migration 039)
Represents the factual confidence level of specific dataset versions and provenance nodes:
- `'OFFICIAL'`: Fully verified against primary gazette/constitutional order with cryptographic evidence attached.
- `'DERIVED'`: Programmatically computed or aggregated from official records.
- `'VERIFIED'`: Cross-checked against secondary authoritative publications.
- `'ESTIMATE'`: Statistical approximation.
- `'SCENARIO'`: Delimitation projection or hypothetical model.
- `'INFERRED'`: Deductive assignment.
- `'UNVERIFIED'`: Extracted from reputable source but lacking cryptographic verification evidence.
- `'UNKNOWN'`: Default status where verification or source lineage is incomplete.

*Under Migration 039 rules, records strictly default to `'UNKNOWN'` and cannot transition to `'OFFICIAL'` without an associated `verification_evidence_id`.*

#### C. Evidence State (`evidence_records` in Migration 039)
Represents cryptographically auditable proof artifacts:
- Stored in `evidence_records` with immutable SHA-256 hashes (`artifact_sha256`), verification authority (`verification_authority`), verifier (`verified_by`), and timestamp (`verified_at`).
- Status elevation to `'OFFICIAL'` is enforced at the database trigger level via `prevent_unverified_official_elevation()` in Migration 039.

---

### 2.2 Reconciling `primary_dataset_version_id` with W012 Provenance Linkages

The proposed foreign key on canonical geography tables is explicitly defined as:
```sql
primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id)
```
*(Note: `dataset_versions.id` in Migration 039 is `TEXT PRIMARY KEY`, not UUID).*

#### Explicit Semantics & Cardinality:
`primary_dataset_version_id` identifies the primary dataset version from which the canonical geography record was seeded or instantiated. It is not the complete provenance of the record.

```text
Many canonical geography entities
        ↓
One primary_dataset_version
```

Therefore, `canonical geography entity → primary_dataset_version_id` is an **N:1 relationship** from canonical geography entities to `dataset_versions`.

Complete provenance remains represented through W012:
```text
domain record
    ↓
record_provenance_linkages
    ↓
provenance_records
    ↓
dataset_versions / evidence_records
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PROVENANCE CARDINALITY MODEL                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Canonical Entities → primary_dataset_version_id:                     │
│    - Many-to-One (N:1 foreign key from entities to dataset_versions).   │
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

## 3. Reconciled Telangana District Dataset Architecture

The historical and legal chronology of Telangana districts is formally separated into distinct statutory events:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TELANGANA DISTRICT REORGANISATION CHRONOLOGY                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Event 1: Andhra Pradesh Reorganisation Act, 2014 (Effective 02-06-2014) │
│ - Erstwhile State created with 10 districts.                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Event 2: GoTS 2016 District Reorganisation (G.O.Ms.Nos 219–249,         │
│          Revenue (DA-CMRF) Dept, dated 11-10-2016)                      │
│ - 10 erstwhile districts reorganized into 31 districts.                 │
│ - Dataset: 'ts_revenue_districts'                                       │
│ - Version: 'ts_districts_2016_v1' (31 districts)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Event 3: GoTS 2019 District Additions (G.O.Ms.Nos 18 & 19,              │
│          Revenue (DA) Dept, dated 16-02-2019)                           │
│ - Mulugu carved out of Jayashankar Bhupalpally (G.O.Ms.No. 18).         │
│ - Narayanpet carved out of Mahabubnagar (G.O.Ms.No. 19).                │
│ - Dataset: 'ts_revenue_districts'                                       │
│ - Version: 'ts_districts_2019_additions_v1' (2 districts)               │
├─────────────────────────────────────────────────────────────────────────┤
│ Current Composite Result: 33 Districts                                  │
│ - Dataset: 'ts_revenue_districts'                                       │
│ - Version: 'ts_districts_2019_composite_v1' (33 districts)              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Status & Evidence Rules for Pilot:
> **Statutory source material has been identified, but the dataset remains UNVERIFIED until the corresponding immutable evidence artifact has been captured and verified.**

The intended initial state is:
```text
source authority = statutory / constitutional as appropriate
data status = UNVERIFIED
evidence state = identified but not yet cryptographically verified
```

Do not elevate any geography dataset or record to `OFFICIAL` merely because the publisher is an authoritative institution. W012's evidence-gated status model remains authoritative.

---

## 4. Entity Model & DDL Specification (Package 040 Proposal)

### 4.1 Table: `public.states` (Additive Enhancement)
```sql
-- Existing table: public.states (id VARCHAR(10) PRIMARY KEY)
ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  ADD COLUMN IF NOT EXISTS lgd_code INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS census_code_2011 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.states.internal_id IS 'Canonical immutable internal UUID.';
COMMENT ON COLUMN public.states.primary_dataset_version_id IS 'W012 primary dataset version from which the state record was seeded.';
```

### 4.2 Table: `public.districts` (New Canonical Table)
```sql
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,                        -- e.g. 'TS-DIST-501'
  state_id VARCHAR(10) NOT NULL REFERENCES public.states(id) ON DELETE RESTRICT,
  entity_type VARCHAR(30) NOT NULL DEFAULT 'district',
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER UNIQUE,                                 -- MoPR LGD Code
  census_code_2011 VARCHAR(20),                            -- Census 2011 District Code
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_districts_state_name UNIQUE (state_id, name)
);

CREATE INDEX idx_districts_state_id ON public.districts(state_id);
CREATE INDEX idx_districts_lgd_code ON public.districts(lgd_code);
CREATE INDEX idx_districts_code ON public.districts(code);
CREATE INDEX idx_districts_primary_version ON public.districts(primary_dataset_version_id);

COMMENT ON TABLE public.districts IS 'Canonical administrative district entities anchored to LGD codes.';
```

### 4.3 Table: `public.parliamentary_constituencies` (New Canonical Table)
```sql
CREATE TABLE public.parliamentary_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,                        -- e.g. 'TS-PC-01'
  state_id VARCHAR(10) NOT NULL REFERENCES public.states(id) ON DELETE RESTRICT,
  entity_type VARCHAR(30) NOT NULL DEFAULT 'parliamentary_constituency',
  pc_number INTEGER NOT NULL,                              -- Official ECI PC Number
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st')),
  eci_pc_code VARCHAR(20),                                 -- ECI Alphanumeric Code
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pc_state_number UNIQUE (state_id, pc_number)
);

CREATE INDEX idx_pcs_state_id ON public.parliamentary_constituencies(state_id);
CREATE INDEX idx_pcs_code ON public.parliamentary_constituencies(code);
CREATE INDEX idx_pcs_number ON public.parliamentary_constituencies(state_id, pc_number);
CREATE INDEX idx_pcs_primary_version ON public.parliamentary_constituencies(primary_dataset_version_id);

COMMENT ON TABLE public.parliamentary_constituencies IS 'Canonical Lok Sabha parliamentary constituencies under ECI Delimitation Orders.';
```

### 4.4 Table: `public.constituencies` (Reconciled Assembly Constituencies)
```sql
-- Existing table: public.constituencies (id VARCHAR(20) PRIMARY KEY)
-- Preserves existing id PK ('TS-AC-1') to protect foreign keys on domain tables
ALTER TABLE public.constituencies
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  ADD COLUMN IF NOT EXISTS canonical_code VARCHAR(30) UNIQUE, -- Padded code e.g. 'TS-AC-001'
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) DEFAULT 'assembly_constituency',
  ADD COLUMN IF NOT EXISTS ac_number INTEGER,                  -- Official ECI AC Number
  ADD COLUMN IF NOT EXISTS eci_ac_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parliamentary_constituency_id UUID REFERENCES public.parliamentary_constituencies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS name_te TEXT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

CREATE INDEX idx_constituencies_internal_id ON public.constituencies(internal_id);
CREATE INDEX idx_constituencies_canonical_code ON public.constituencies(canonical_code);
CREATE INDEX idx_constituencies_pc_id ON public.constituencies(parliamentary_constituency_id);
CREATE INDEX idx_constituencies_district_id ON public.constituencies(district_id);
CREATE INDEX idx_constituencies_state_ac ON public.constituencies(state_id, ac_number);
CREATE INDEX idx_constituencies_primary_version ON public.constituencies(primary_dataset_version_id);

COMMENT ON COLUMN public.constituencies.id IS 'Legacy primary key preserved for domain foreign key compatibility.';
COMMENT ON COLUMN public.constituencies.internal_id IS 'Canonical immutable internal UUID (generated once, immutable).';
COMMENT ON COLUMN public.constituencies.canonical_code IS 'Human-readable canonical identifier (padded, e.g. TS-AC-001).';
```

---

## 5. Reconciled Source Authority & Bounded Pilot Dataset

| Tier | Entity Scope | Count | Statutory Publisher | `authority_level` (`source_authority_enum`) | Dataset Identifier | Version Tag (`dataset_versions.id`) | `default_status` (`data_status_enum`) | Evidence Requirement |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **State** | Telangana (`TS`) | 1 | Ministry of Home Affairs / Parliament of India | `statutory` | `mha_state_reorganisation` | `mha_ts_2014_v1` | `UNVERIFIED` | Gazette PDF pending SHA-256 |
| **Districts (Base)** | 31 Base Districts | 31 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2016_v1` | `UNVERIFIED` | Gazette 2016 pending SHA-256 |
| **Districts (Additions)** | Mulugu & Narayanpet | 2 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2019_additions_v1` | `UNVERIFIED` | Gazette 2019 pending SHA-256 |
| **Districts (Composite)**| Current 33 Districts | 33 | Government of Telangana (Revenue Dept) | `statutory` | `ts_revenue_districts` | `ts_districts_2019_composite_v1` | `UNVERIFIED` | Composite Catalog pending SHA-256 |
| **PCs** | Telangana Lok Sabha | 17 | Election Commission of India | `constitutional` | `eci_delimitation_order_2008` | `eci_ts_pc_2008_v1` | `UNVERIFIED` | ECI Order 2008 pending SHA-256 |
| **ACs** | Telangana Vidhan Sabha | 119 | Election Commission of India | `constitutional` | `eci_delimitation_order_2008` | `eci_ts_ac_2008_v1` | `UNVERIFIED` | ECI Order 2008 pending SHA-256 |

*Rule*: Statutory source material has been identified, but the dataset remains UNVERIFIED until the corresponding immutable evidence artifact has been captured and verified. Do not elevate any geography dataset or record to OFFICIAL merely because the publisher is an authoritative institution. Elevation to OFFICIAL will occur strictly when cryptographically verified evidence_records are registered under W012 governance protocols.

---

## 6. Backward Compatibility & Client Integration Strategy

1. **`acNo` Preservation**: Fastify API services will continue returning `acNo` for mobile and web clients while adding `canonicalCode` and `internalId` in API responses.
2. **`stateCode` Pairing**: To resolve cross-state collisions in client stores (`apps/mobile/stores/myConstituency.ts`), client queries will transition to compound lookup `(stateCode, acNo)` or canonical code (`TS-AC-001`).
3. **Foreign Key Integrity**: `public.constituencies.id VARCHAR(20)` is retained. Existing domain tables (`user_profiles`, `posts`, `civic_issues`, `campaigns`, `projects`) require zero DDL alterations.
4. **Mobile SQLite Isolation**: `apps/mobile/data/seed-data.db` remains 100% untouched.
5. **Fastify Seed Fallback**: Seed TypeScript modules in `data/seed/` remain in place during W013 to support legacy routes until database-backed routes are independently verified.

---

## 7. Migration & Rollback Strategy

### 7.1 Forward Migration Strategy (Migration 040)
- **Phase 1: DDL Execution**: Create `districts`, `parliamentary_constituencies`, and enhance `constituencies` and `states` with additive columns.
- **Phase 2: RLS Configuration**: Apply public read RLS policies (`FOR SELECT USING (true)`) and restrict write operations to `service_role`.
- **Phase 3: W012 Catalog Registration**: Insert data sources and dataset versions with `authority_level` and `default_status = 'UNVERIFIED'`.
- **Phase 4: Pilot Seed Insertion**: Insert 1 State, 33 Districts, 17 PCs, and 119 ACs linked via `primary_dataset_version_id`.
- **Phase 5: Record Provenance Linkages**: Create `record_provenance_linkages` entries linking each seeded entity to its corresponding `provenance_records`.

### 7.2 Idempotent Rollback Script (Down Migration)
```sql
-- MIGRATION 040 DOWN / ROLLBACK SCRIPT
BEGIN;

DELETE FROM public.record_provenance_linkages WHERE domain_table IN ('states', 'districts', 'parliamentary_constituencies', 'constituencies');
DELETE FROM public.provenance_records WHERE dataset_version_id IN ('mha_ts_2014_v1', 'ts_districts_2019_composite_v1', 'eci_ts_pc_2008_v1', 'eci_ts_ac_2008_v1');
DELETE FROM public.dataset_versions WHERE dataset_id IN ('mha_state_reorganisation', 'ts_revenue_districts', 'eci_delimitation_order_2008');
DELETE FROM public.datasets WHERE id IN ('mha_state_reorganisation', 'ts_revenue_districts', 'eci_delimitation_order_2008');
DELETE FROM public.data_sources WHERE id IN ('mha_india', 'telangana_revenue_dept', 'eci_india');

ALTER TABLE public.constituencies
  DROP COLUMN IF EXISTS primary_dataset_version_id,
  DROP COLUMN IF EXISTS name_te,
  DROP COLUMN IF EXISTS district_id,
  DROP COLUMN IF EXISTS parliamentary_constituency_id,
  DROP COLUMN IF EXISTS eci_ac_code,
  DROP COLUMN IF EXISTS ac_number,
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS canonical_code,
  DROP COLUMN IF EXISTS internal_id;

DROP TABLE IF EXISTS public.parliamentary_constituencies CASCADE;
DROP TABLE IF EXISTS public.districts CASCADE;

ALTER TABLE public.states
  DROP COLUMN IF EXISTS primary_dataset_version_id,
  DROP COLUMN IF EXISTS census_code_2011,
  DROP COLUMN IF EXISTS lgd_code,
  DROP COLUMN IF EXISTS internal_id;

COMMIT;
```

---

## 8. Staging Verification Test Strategy (Test Battery 13)

The independent runtime verification script `tests/verify_w013_canonical_geography.mjs` will assert 10 automated test gates:
- **Gate 13-A: Schema Conformance**: Verifies table existence, column types, and constraints for `districts`, `parliamentary_constituencies`, and modified `constituencies`.
- **Gate 13-B: Tripartite Identity Semantics**: Verifies `internal_id` is NOT NULL and UNIQUE; `canonical_code` is UNIQUE; and `id` preserves legacy keys.
- **Gate 13-C: Foreign Key Integrity**: Validates `districts.state_id`, `pcs.state_id`, `constituencies.pc_id`, and `constituencies.district_id`.
- **Gate 13-D: Pilot Record Counts**: Asserts exactly 1 State (`TS`), 33 Districts, 17 PCs, and 119 ACs in the pilot catalog.
- **Gate 13-E: Electoral Closure**: Asserts 100% of Telangana ACs reference valid Telangana PCs under the Delimitation Order 2008.
- **Gate 13-F: Administrative Closure**: Asserts 100% of Telangana ACs reference valid Telangana Districts.
- **Gate 13-G: W012 Governance Conformance**: Asserts `primary_dataset_version_id` points to valid `dataset_versions` with valid `source_authority_enum` and `data_status_enum`.
- **Gate 13-H: RLS Security Enforcement**: Validates anonymous public read access and rejects anonymous/authenticated mutations.
- **Gate 13-I: Backward Compatibility**: Asserts zero breaking changes on existing domain tables (`user_profiles`, `posts`, `civic_issues`).
- **Gate 13-J: Performance Latency Gate**: Asserts primary and canonical code lookups execute with server-side execution latency p95 $\le$ 5.0 ms.

---

## 9. Scope Boundaries: W013 vs. W014–W017

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STRICT JOB SCOPE DELINEATION                                            │
├──────┬───────────────────────────────┬──────────────────────────────────┤
│ Job  │ Title                         │ Explicit Scope Responsibility    │
├──────┼───────────────────────────────┼──────────────────────────────────┤
│ W013 │ Canonical Geography Model     │ DDL, immutable UUIDs, canonical  │
│      │                               │ codes, dual hierarchies, pilot   │
│      │                               │ Telangana seeds, W012 linkage.   │
├──────┼───────────────────────────────┼──────────────────────────────────┤
│ W014 │ Geography Versioning &        │ Delimitation regimes, temporal   │
│      │ Temporal Bounds               │ intervals (effective_from/to),   │
│      │                               │ point-in-time boundary lineage.  │
├──────┼───────────────────────────────┼──────────────────────────────────┤
│ W015 │ Geography Relationship Engine │ Graph traversal, M:N Mandal-AC   │
│      │                               │ spatial overlap & pop weighting. │
├──────┼───────────────────────────────┼──────────────────────────────────┤
│ W016 │ Real Geographic Mapping       │ PostGIS spatial query tuning,    │
│      │                               │ vector tiles, GeoJSON repairs.   │
├──────┼───────────────────────────────┼──────────────────────────────────┤
│ W017 │ Geography Quality Engine      │ Geometric gap/sliver validation, │
│      │                               │ automated cross-source audit.    │
└──────┴───────────────────────────────┴──────────────────────────────────┘
```

---

## 10. Remaining UNKNOWN Register

| Unknown ID | Description | Classification | Resolution Dependency |
| :--- | :--- | :--- | :--- |
| **`UNK-01`** | National LGD Sub-District to ECI AC cross-reference mapping for all 4,120+ ACs | **Non-blocking for W013** | **W015** (Relationship Engine) & **W017** (Quality Engine) |
| **`UNK-02`** | Authoritative MultiPolygon geometries for 9 placeholder states | **Non-blocking for W013** | **W016** (Real Geographic Mapping) |
| **`UNK-03`** | Exact population split weights for rural mandals bifurcated by AC boundaries | **Non-blocking for W013** | **W015** (Relationship Engine) |
| **`UNK-04`** | National ECI Delimitation Gazette SHA-256 hashes for all 543 PCs | **Blocking for national PCs; Non-blocking for W013 pilot** | Excluded from W013; bounded to Telangana pilot |
| **`UNK-05`** | Historical LGD District codes for dissolved pre-2014 districts | **Non-blocking for W013** | **W014** (Geography Versioning) |

---

## 11. Final Implementation Confirmation Statement

- **Migration 040 has NOT been created or executed.**
- **No database (staging or production) has been modified.**
- **No application code has been modified.**
- **This document represents an architectural proposal submitted for CTO authorization.**

**Submission Status**:  
`W013_FINAL_DESIGN_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`
