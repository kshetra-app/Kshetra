# W013 — CANONICAL GEOGRAPHY MODEL
## Architectural Design & Implementation Proposal

**Document ID**: `PROP-W013-CANONICAL-MODEL-001`  
**Revision**: `1.0`  
**Date**: September 22, 2026  
**Status**: **`W013_PREFLIGHT_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`**  
**Target Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Target**: **STRICTLY UNTOUCHED / OUT OF SCOPE**  
**Implementation Authorization**: **NOT GRANTED / PROPOSAL ONLY**

---

## 1. Executive Summary & Design Principles

The Political Geography Graph is the architectural spine of Kshetra / PANIN. This proposal establishes the design for **Job W013: Canonical Geography Model**, reconciling prior preflight findings with authoritative CTO directives.

### Core Architectural Principles:
1. **Immutable Internal Identity**: Every canonical entity is keyed by an internal UUID primary key, insulating the system from political renamings, state splits, or boundary reorganizations.
2. **Canonical Codes vs. Source Identifiers**: Human-readable compound codes (e.g., `TS-AC-001`, `TS-PC-01`, `TS-DIST-501`) serve as unique alternate keys. Official source codes (ECI numbers, LGD codes, Census codes) are maintained as typed, independently indexed attributes.
3. **Decoupled Dual Hierarchies**: Administrative geography (State $\rightarrow$ District $\rightarrow$ Mandal $\rightarrow$ Village) and Electoral geography (State $\rightarrow$ PC $\rightarrow$ AC $\rightarrow$ Polling Booth) are modeled as distinct relational hierarchies, interconnected via explicit relationship tables (e.g., `mandal_constituency_map`) rather than forced into an artificial single-tree hierarchy.
4. **Regime-Bounded Delimitation (No Timeless Counts)**: Total seat counts are not universal constants. AC and PC populations are strictly bounded to specific statutory datasets and gazette orders.
5. **Zero-Downtime Backward Compatibility**: Existing table `public.constituencies` and its primary key `id VARCHAR(20)` are preserved, ensuring zero breakage for domain foreign keys (`user_profiles`, `posts`, `civic_issues`, `campaigns`, `projects`).
6. **Strict Separation of W013 from W014–W017**: Temporal validity, versioning, spatial graph traversal, map rendering, and geometry quality engines are explicitly deferred to future dedicated jobs.

---

## 2. Entity Model Specification

### 2.1 Entity Type Catalog
The canonical model defines five primary entities in W013:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CANONICAL ENTITY CATALOG (W013 SCOPE)                                   │
├──────────────────────────────┬──────────────────────────────────────────┤
│ Entity Type                  │ Description                              │
├──────────────────────────────┼──────────────────────────────────────────┤
│ state                        │ Indian State or Union Territory (36)     │
│ district                     │ Administrative District (LGD anchor)     │
│ parliamentary_constituency   │ Lok Sabha Electoral Division (ECI)       │
│ assembly_constituency        │ Vidhan Sabha Electoral Division (ECI)    │
│ mandal                       │ Sub-District Administrative Division     │
└──────────────────────────────┴──────────────────────────────────────────┘
```

---

### 2.2 DDL Specifications

#### A. Table: `public.states` (Existing Table Enhanced)
```sql
-- Existing primary key: id VARCHAR(10) (e.g. 'TS', 'AP')
-- Additive columns to support canonical identity & W012 governance
ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS lgd_code INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS census_code_2011 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS dataset_version_id UUID REFERENCES public.dataset_versions(id);
```

#### B. Table: `public.districts` (New Canonical Table)
```sql
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,                       -- e.g. 'TS-DIST-501'
  state_id VARCHAR(10) NOT NULL REFERENCES public.states(id),
  entity_type VARCHAR(30) NOT NULL DEFAULT 'district',
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER UNIQUE,                                -- Official MoPR LGD Code
  census_code_2011 VARCHAR(20),                           -- Census 2011 District Code
  dataset_version_id UUID REFERENCES public.dataset_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_districts_state_name UNIQUE (state_id, name)
);

CREATE INDEX idx_districts_state_id ON public.districts(state_id);
CREATE INDEX idx_districts_lgd_code ON public.districts(lgd_code);
CREATE INDEX idx_districts_code ON public.districts(code);
```

#### C. Table: `public.parliamentary_constituencies` (New Canonical Table)
```sql
CREATE TABLE public.parliamentary_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,                       -- e.g. 'TS-PC-01'
  state_id VARCHAR(10) NOT NULL REFERENCES public.states(id),
  entity_type VARCHAR(30) NOT NULL DEFAULT 'parliamentary_constituency',
  pc_number INTEGER NOT NULL,                             -- Official ECI PC Number
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st')),
  eci_pc_code VARCHAR(20),                                -- ECI Alphanumeric Code
  dataset_version_id UUID REFERENCES public.dataset_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pc_state_number UNIQUE (state_id, pc_number)
);

CREATE INDEX idx_pcs_state_id ON public.parliamentary_constituencies(state_id);
CREATE INDEX idx_pcs_code ON public.parliamentary_constituencies(code);
CREATE INDEX idx_pcs_number ON public.parliamentary_constituencies(state_id, pc_number);
```

#### D. Table: `public.constituencies` (Existing Table Reconciled for ACs)
```sql
-- Preserves existing table and id VARCHAR(20) PRIMARY KEY to maintain foreign key integrity
ALTER TABLE public.constituencies
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS canonical_code VARCHAR(30) UNIQUE, -- e.g. 'TS-AC-001'
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) DEFAULT 'assembly_constituency',
  ADD COLUMN IF NOT EXISTS ac_number INTEGER,                 -- Official ECI AC Number
  ADD COLUMN IF NOT EXISTS eci_ac_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parliamentary_constituency_id UUID REFERENCES public.parliamentary_constituencies(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id),
  ADD COLUMN IF NOT EXISTS name_te TEXT,
  ADD COLUMN IF NOT EXISTS dataset_version_id UUID REFERENCES public.dataset_versions(id);

CREATE INDEX idx_constituencies_internal_id ON public.constituencies(internal_id);
CREATE INDEX idx_constituencies_canonical_code ON public.constituencies(canonical_code);
CREATE INDEX idx_constituencies_pc_id ON public.constituencies(parliamentary_constituency_id);
CREATE INDEX idx_constituencies_district_id ON public.constituencies(district_id);
CREATE INDEX idx_constituencies_state_ac ON public.constituencies(state_id, ac_number);
```

---

## 3. Identifier Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ THREE-TIER IDENTIFIER SPECIFICATION                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Immutable Internal Identity (Primary Key)                       │
│ - UUID v4 (gen_random_uuid())                                           │
│ - Preserved across political reorganizations and boundary revisions     │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Canonical Alternate Key (Human-Readable Unique Code)            │
│ - State: ISO Code (e.g. 'TS')                                           │
│ - District: '<state_code>-DIST-<lgd_code>' (e.g. 'TS-DIST-501')         │
│ - Parliamentary Constituency: '<state_code>-PC-<pc_no>' ('TS-PC-01')    │
│ - Assembly Constituency: '<state_code>-AC-<3-digit-padded-ac_no>'       │
│   (e.g. 'TS-AC-001')                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Source-Specific Statutory Identifiers                           │
│ - eci_pc_code / eci_ac_code: Election Commission of India codes         │
│ - lgd_code: Ministry of Panchayati Raj Local Government Directory codes │
│ - census_code_2011: Registrar General of India Census codes             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Relationship Model & Graph Architecture

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

### Relational Linkages:
1. **PC $\rightarrow$ AC (1:N)**: Under the Delimitation Order 2008, each Assembly Constituency lies wholly within a single Parliamentary Constituency within state boundaries. Modeled via foreign key `constituencies.parliamentary_constituency_id REFERENCES parliamentary_constituencies(id)`.
2. **District $\rightarrow$ AC (1:N anchor)**: Each AC has a designated district headquarters/anchor district, modeled via `constituencies.district_id REFERENCES districts(id)`.
3. **Mandal $\leftrightarrow$ AC (M:N Overlap)**: Mandals (administrative revenue divisions) and Assembly Constituencies (electoral boundaries) do not conform to each other. The existing table `mandal_constituency_map` models this intersection:
   - `mandal_id VARCHAR(30) REFERENCES mandals(id)`
   - `constituency_id VARCHAR(20) REFERENCES constituencies(id)`
   - `overlap_type VARCHAR(20) DEFAULT 'full'` (`'full'`, `'partial'`)
   - `description TEXT`

---

## 5. W012 Data Governance & Provenance Integration

The canonical geography model utilizes the accepted W012 data governance infrastructure without creating redundant provenance mechanisms:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ W012 INTEGRATION ARCHITECTURE                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ data_sources (e.g. 'eci_delimitation', 'telangana_revenue_dept')        │
│      │                                                                  │
│      ▼                                                                  │
│ datasets (e.g. 'eci_delimitation_order_2008', 'ts_districts_2016')      │
│      │                                                                  │
│      ▼                                                                  │
│ dataset_versions (version snapshots with SHA-256 hash & effective date) │
│      │                                                                  │
│      ├──────────────────────────────────┐                               │
│      ▼                                  ▼                               │
│ Direct Relational FK:            Granular Record Provenance:            │
│ canonical_entity.dataset_        evidence_records                       │
│ version_id REFERENCES                   │                               │
│ dataset_versions(id)                    ▼                               │
│                                  provenance_records                     │
│                                         │                               │
│                                         ▼                               │
│                                  record_provenance_linkages             │
│                                  (target_table, target_id)              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Source Authority & Bounded Pilot Dataset

In compliance with the CTO mandate, **bulk national ingestion is prohibited**. Only verified records with authenticated statutory evidence will be seeded in W013:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHORIZED W013 PILOT DATASET (TELANGANA STATE)                         │
├───────┬───────┬──────────────────────┬──────────────────────────────────┤
│ Tier  │ Count │ Authority            │ Statutory Source Evidence        │
├───────┼───────┼──────────────────────┼──────────────────────────────────┤
│ State │ 1     │ OFFICIAL_STATUTORY   │ AP Reorganisation Act, 2014      │
│ DIST  │ 33    │ OFFICIAL_GAZETTE     │ GoTS District Reorganisation 2016│
│ PC    │ 17    │ OFFICIAL_CONSTITUTION│ ECI Delimitation Order 2008      │
│ AC    │ 119   │ OFFICIAL_CONSTITUTION│ ECI Delimitation Order 2008      │
└───────┴───────┴──────────────────────┴──────────────────────────────────┘
```

---

## 7. Client & API Backward Compatibility Strategy

1. **`acNo` Integer Compatibility**: Backend API responses will continue serializing `acNo` for existing client components while adding `canonicalCode` and `internalId`.
2. **`stateCode` Pairing**: To resolve cross-state collisions in mobile client stores, APIs will require and return explicit `stateCode` context.
3. **`public.constituencies(id)` Preservation**: The primary key `id VARCHAR(20)` (`'TS-AC-1'`) is retained. Existing domain foreign keys (`user_profiles.constituency_id`, `posts.constituency_id`, `civic_issues.constituency_id`) will remain 100% valid.
4. **Mobile SQLite Isolation**: The 137 MB `apps/mobile/data/seed-data.db` remains untouched.
5. **Fastify Seed Fallback**: Existing static seed files in `data/seed/` remain in place during W013 to support legacy routes until API redirection is authorized.

---

## 8. Migration & Rollback Strategy

### 8.1 Migration Sequence (Package 040)
The DDL migration will be implemented as an additive, non-destructive package:
1. `CREATE TABLE public.districts ...`
2. `CREATE TABLE public.parliamentary_constituencies ...`
3. `ALTER TABLE public.constituencies ADD COLUMN ...`
4. `ALTER TABLE public.states ADD COLUMN ...`
5. Configure RLS: Enable RLS on new tables with public read policies (`FOR SELECT USING (true)`).
6. Ingest W012 governance catalog entries (`data_sources`, `datasets`, `dataset_versions`).
7. Ingest Telangana pilot seed records with foreign keys to `dataset_versions`.

### 8.2 Rollback Strategy (Down Migration)
Every statement in Migration 040 will be paired with an exact, idempotent rollback script:
```sql
-- DOWN MIGRATION (Package 040 Rollback)
DELETE FROM public.record_provenance_linkages WHERE target_table IN ('districts', 'parliamentary_constituencies', 'constituencies');
DELETE FROM public.dataset_versions WHERE dataset_id IN (SELECT id FROM public.datasets WHERE code IN ('eci_delimitation_order_2008', 'ts_districts_2016'));
DELETE FROM public.datasets WHERE code IN ('eci_delimitation_order_2008', 'ts_districts_2016');
DELETE FROM public.data_sources WHERE code IN ('eci_delimitation', 'telangana_revenue_dept');

ALTER TABLE public.constituencies
  DROP COLUMN IF EXISTS dataset_version_id,
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
  DROP COLUMN IF EXISTS dataset_version_id,
  DROP COLUMN IF EXISTS census_code_2011,
  DROP COLUMN IF EXISTS lgd_code,
  DROP COLUMN IF EXISTS internal_id;
```

---

## 9. Staging Test Strategy & Acceptance Evidence Plan

The independent verification suite `tests/verify_w013_canonical_geography.mjs` will execute 10 automated test batteries:
- **Test 13-A: Schema Conformance**: Verifies presence of `districts`, `parliamentary_constituencies`, and enhanced `constituencies` columns.
- **Test 13-B: Primary & Unique Key Constraints**: Asserts UUID uniqueness, canonical code uniqueness, and composite key constraints.
- **Test 13-C: Foreign Key Integrity**: Validates `districts.state_id`, `pcs.state_id`, `constituencies.pc_id`, and `constituencies.district_id`.
- **Test 13-D: Pilot Record Counts**: Confirms exactly 1 State (`TS`), 33 Districts, 17 PCs, and 119 ACs in pilot.
- **Test 13-E: ECI PC-to-AC Relational Closure**: Asserts 100% of Telangana ACs reference valid Telangana PCs.
- **Test 13-F: District Anchor Closure**: Asserts 100% of Telangana ACs reference valid Telangana Districts.
- **Test 13-G: W012 Governance Linkage**: Validates that all pilot geography records reference valid `dataset_versions` records.
- **Test 13-H: RLS Enforcement**: Validates public anonymous read access and mutation rejection for non-service roles.
- **Test 13-I: Backward Compatibility**: Asserts existing domain queries on `user_profiles`, `posts`, and `civic_issues` continue functioning without error.
- **Test 13-J: Performance Gate**: Asserts indexed lookups for State, District, PC, and AC execute with server-side p95 $\le$ 5.0 ms.

---

## 10. Scope Boundaries: W013 vs. W014–W017

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

## 11. CTO Decision Request

This architectural proposal resolves all preflight issues raised during review.

**Required Action**: Review this proposal and grant authorization to proceed with bounded W013 implementation.

**Submission Status**:  
`W013_PREFLIGHT_RECONCILIATION_COMPLETE — AWAITING CTO AUTHORIZATION`
