# W016-C3: Geometry Ingestion Preflight — Provenance, Temporal Attachment & Candidate-Status Quarantine (Final Surgical Revision)

**Authority:** Independent CTO / Co-founder Directive W016-C3 Final Surgical Correction Round  
**Status:** SUBMITTED FOR CTO REVIEW  
**Scope:** Architecture & Technical Preflight Design Only (Zero DDL Execution / Zero DB Mutations / Production Untouched)  
**Baseline Commit:** `670bedbb93b50cb8e7a497650d0dda5672d59a68`  
**Date:** September 2026  

---

## 1. Executive Summary & Authoritative Coordinates

In accordance with the **W016-C3 CTO Final Surgical Correction Round Directive**, this document provides the final, hardened preflight specification for ingesting candidate vector geometries into PANIN/Kshetra.

### Authoritative State Matrix

| Component | Status | Governance Authority |
|---|---|---|
| **W015 (Geography Relationship Engine)** | `ACCEPTED_COMPLETE` | Commit `4d99dd3` |
| **W015-B1 (Preflight Inspection)** | `ACCEPTED_COMPLETE` | Commit `4d99dd3` |
| **W015-B2 (Source Reconciliation)** | `ACCEPTED_COMPLETE` | Commit `4d99dd3` |
| **W016-A1 (Preflight Correction)** | `ACCEPTED` | Commit `1f8bde8` |
| **W016-B1 (Source Preflight)** | `ACCEPTED` | Commit `e240fc3` |
| **W016-B2 (Technical Spatial Rehearsal)** | `ACCEPTED_COMPLETE` | Commit `4beb9a7` |
| **W016-C1 (Candidate Acquisition)** | `ACCEPTED_COMPLETE` | Commit `46d4bcb` |
| **W016-C2 (Reconciliation Package)** | `ACCEPTED` | Commit `3d30640` |
| **W016-C3 (Surgical Preflight Revision)** | `SUBMITTED_FOR_CTO_REVIEW` | This Document |
| **Migration 044 Execution** | `STRICTLY_NOT_AUTHORIZED` | Design Only |
| **Database Mutations / Ingestion** | `STRICTLY_NOT_AUTHORIZED` | Frozen |
| **Production Environment** | `STRICTLY_UNTOUCHED` | Air-Gapped |

---

## 2. Actual Schema Dependency Reconciliation

Prior to finalizing the design of Migration 044 and the `OFFICIAL` promotion guards, an exhaustive schema audit was conducted against all migrations in `supabase/migrations/` (`039_data_governance_foundation.sql` through `043_w015_b2_source_reconciliation.sql`).

### 2.1 Audit Findings for Trigger & Governance Dependencies

| Referenced Field | Migration & Line Number | Actual Data Type | Constraint / Semantics | Verification Verdict |
|---|---|---|---|---|
| `dataset_versions.verification_evidence_id` | `039` Line 104 | `UUID` | `REFERENCES evidence_records(id) ON DELETE RESTRICT` | **VERIFIED / EXISTS** |
| `provenance_records.verification_evidence_id` | `039` Line 152 | `UUID` | `REFERENCES evidence_records(id) ON DELETE RESTRICT` | **VERIFIED / EXISTS** |
| `provenance_records.status` | `039` Line 147 | `data_status_enum` | Defaults to `'UNKNOWN'` | **VERIFIED / EXISTS** |
| `delimitation_regimes.legal_status` | `041` Line 113 | `VARCHAR(50)` | `CHECK (legal_status IN ('HISTORICAL_LEGAL_REGIME', 'CURRENT_LEGAL_REGIME', 'FUTURE_ANTICIPATED_REGIME', 'SCENARIO_PROPOSED_REGIME'))` | **VERIFIED / EXISTS** |
| `data_sources.authority_level` | `039` Line 53 | `source_authority_enum` | Enums: `'constitutional'`, `'statutory'`, `'academic'`, etc. | **VERIFIED / EXISTS** |

### 2.2 Critical Schema Gap: `mandal_versions` Table
An explicit inspection of Migration 041 (`041_geography_versioning_and_temporal_validity.sql`) reveals that while temporal version tables were created for:
1. `public.state_versions` (Line 208)
2. `public.district_versions` (Line 230)
3. `public.parliamentary_constituency_versions` (Line 262)
4. `public.constituency_versions` (Line 291)

No `public.mandal_versions` table was created in Migration 041. Mandals currently exist solely as canonical anchors in `public.mandals` (enhanced in Migration 042 with `district_id` and `primary_dataset_version_id`).

**Architectural Consequence:**  
In accordance with Blocker 1, `public.entity_geometries` must target `mandal_version_id REFERENCES public.mandal_versions(id)`. Therefore, the creation of canonical `public.mandal_versions` (or an authoritative W014 mandal versioning extension) is an **explicit prerequisite dependency** before any mandal geometry rows can be physically inserted. This dependency is formally registered in this preflight.

---

## 3. Relational Integrity Architecture — Mandal W014 Version Target

### 3.1 Elimination of Stable Anchor Substitution
The prior draft utilized `mandal_id TEXT REFERENCES public.mandals(id)`. This was rejected by CTO directive because stable entity identity cannot substitute for W014 temporal version identity.

Under the corrected architecture, the exact-one geometry target spans the full five-tier hierarchy exclusively through W014 temporal version foreign keys:
- `constituency_version_id`
- `district_version_id`
- `state_version_id`
- `pc_version_id`
- `mandal_version_id`

### 3.2 Canonical Mandal Relational Chain
The 589 historical TGRAC mandal geometries must resolve to the exact historical `mandal_versions` rows:

```text
entity_geometries.mandal_version_id
  │
  ▼ [FK: ON DELETE RESTRICT]
public.mandal_versions.id
  │ (holds valid_from: '2016-10-11', valid_to: '2022-09-01', is_current: false)
  ▼ [FK: ON DELETE RESTRICT]
public.mandals.id [STABLE STATUTORY IDENTITY]
```

### 3.3 Exact-One Target & Alignment CHECK Constraints
```sql
CONSTRAINT chk_entity_geometries_exact_one_target 
  CHECK (num_nonnulls(constituency_version_id, district_version_id, state_version_id, pc_version_id, mandal_version_id) = 1),

CONSTRAINT chk_entity_geometries_type_alignment CHECK (
  (entity_type = 'assembly_constituency' AND constituency_version_id IS NOT NULL) OR
  (entity_type = 'district' AND district_version_id IS NOT NULL) OR
  (entity_type = 'state' AND state_version_id IS NOT NULL) OR
  (entity_type = 'parliamentary_constituency' AND pc_version_id IS NOT NULL) OR
  (entity_type = 'mandal' AND mandal_version_id IS NOT NULL)
)
```

---

## 4. Current Semantics & Invariants (Removal of `CURRENT_DATE`)

### 4.1 Resolution of Semantic Contradiction & Calendar Independence
In accordance with Blocker 2 and Blocker 4:
1. `CURRENT_DATE`, `now()`, or dynamic clock expressions are **strictly forbidden** from all PostgreSQL `CHECK` constraints. Calendar changes must never invalidate or mutate table check semantics.
2. The semantic contradiction between `valid_to > CURRENT_DATE` and `valid_to IS NULL` is completely eliminated.

### 4.2 The Uncompromising Current-Legal Invariant
A geometry record is current if and only if it represents an official, current legal boundary with unbounded statutory validity:

$$\text{is\_current} = \text{true} \iff \begin{cases} \text{status} = \text{'OFFICIAL'} \\ \text{temporal\_classification} = \text{'CURRENT\_LEGAL'} \\ \text{authority\_classification} \in \{\text{'OFFICIAL\_CONSTITUTIONAL\_GEOMETRY'}, \text{'OFFICIAL\_STATUTORY\_GEOMETRY'}\} \\ \text{valid\_to IS NULL} \end{cases}$$

Machine-verifiable database check constraint:
```sql
CONSTRAINT chk_geometry_current_invariants CHECK (
  (is_current = false) OR (
    is_current = true AND
    status = 'OFFICIAL' AND
    temporal_classification = 'CURRENT_LEGAL' AND
    authority_classification IN ('OFFICIAL_CONSTITUTIONAL_GEOMETRY', 'OFFICIAL_STATUTORY_GEOMETRY') AND
    valid_to IS NULL
  )
)
```

### 4.3 Historical Validity Evaluation
Historical validity is purely date-range based and evaluated at query time via static parameters:
```sql
-- Historical Point-in-Time Query Pattern (e.g. for requested_date)
SELECT * FROM public.entity_geometries
WHERE valid_from <= :requested_date 
  AND (valid_to IS NULL OR :requested_date < valid_to);
```
If an official boundary is superseded by a future delimitation order or gazette, the transition from current to historical is an **explicit authorized state transition** executed via administrative transaction (setting `is_current = false` and assigning statutory `valid_to`), never an automatic clock-dependent trigger.

---

## 5. Single-Current Uniqueness Across All Five Geography Classes

In accordance with Blocker 3, single-current uniqueness is enforced across all five supported classes using PostgreSQL partial unique indexes.

### 5.1 PostgreSQL Partial Unique Index NULL Semantics
In PostgreSQL, standard unique constraints treat `NULL` values as distinct, which could lead to multiple rows if not bounded. By constructing partial unique indexes with explicit predicates `WHERE is_current = true AND <column> IS NOT NULL`, PostgreSQL indexes ONLY rows where `is_current = true` and the specific target version column is populated.

Since `chk_entity_geometries_exact_one_target` guarantees that exactly one version column is non-NULL per row, each partial index strictly enforces that **at most one current geometry** can exist per version record:

```sql
-- 1. Assembly Constituency Current Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_constituency_geometries_single_current 
  ON public.entity_geometries (constituency_version_id) 
  WHERE is_current = true AND constituency_version_id IS NOT NULL;

-- 2. Revenue District Current Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_district_geometries_single_current 
  ON public.entity_geometries (district_version_id) 
  WHERE is_current = true AND district_version_id IS NOT NULL;

-- 3. State Current Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_state_geometries_single_current 
  ON public.entity_geometries (state_version_id) 
  WHERE is_current = true AND state_version_id IS NOT NULL;

-- 4. Parliamentary Constituency Current Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_geometries_single_current 
  ON public.entity_geometries (pc_version_id) 
  WHERE is_current = true AND pc_version_id IS NOT NULL;

-- 5. Sub-District Mandal Current Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_mandal_geometries_single_current 
  ON public.entity_geometries (mandal_version_id) 
  WHERE is_current = true AND mandal_version_id IS NOT NULL;
```

---

## 6. Database-Level Quarantine & Row Level Security (RLS)

Public access cannot bypass quarantine by selecting directly from the base table. RLS enforces isolation at the storage layer:

```sql
ALTER TABLE public.entity_geometries ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policy (anon, authenticated)
-- Public users may ONLY read approved, official, current legal geometry.
-- UNVERIFIED candidates, SCENARIOS, and HISTORICAL geometries return 0 rows.
DROP POLICY IF EXISTS "Public read official current geometries only" ON public.entity_geometries;
CREATE POLICY "Public read official current geometries only"
  ON public.entity_geometries
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'OFFICIAL' 
    AND is_current = true 
    AND temporal_classification = 'CURRENT_LEGAL'
  );

-- 2. Administrative Role Policy (service_role)
-- Full access for administrative ingestion, evidence audits, and internal research.
DROP POLICY IF EXISTS "Service role full access on entity_geometries" ON public.entity_geometries;
CREATE POLICY "Service role full access on entity_geometries"
  ON public.entity_geometries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 7. Official Promotion Guards & Verified Trigger Logic

A geometry record cannot be elevated to `status = 'OFFICIAL'` without an unbroken chain of verified dependencies:

```sql
-- DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
CREATE OR REPLACE FUNCTION public.fn_guard_geometry_official_promotion()
RETURNS TRIGGER AS $$
DECLARE
  v_source_authority public.source_authority_enum;
  v_dataset_evidence UUID;
  v_provenance_evidence UUID;
  v_provenance_status public.data_status_enum;
  v_regime_status VARCHAR(50);
BEGIN
  IF NEW.status = 'OFFICIAL' THEN
    -- 1. Topological Validity
    IF NOT ST_IsValid(NEW.geometry) THEN
      RAISE EXCEPTION 'OFFICIAL promotion rejected: Geometry is topologically invalid (ST_IsValid = false)';
    END IF;

    -- 2. Inspect Dataset Version & Source Authority (Verified columns in Migration 039)
    SELECT ds.authority_level, dv.verification_evidence_id
    INTO v_source_authority, v_dataset_evidence
    FROM public.dataset_versions dv
    JOIN public.datasets d ON dv.dataset_id = d.id
    JOIN public.data_sources ds ON d.source_id = ds.id
    WHERE dv.id = NEW.dataset_version_id;

    IF v_dataset_evidence IS NULL THEN
      RAISE EXCEPTION 'OFFICIAL promotion rejected: Dataset version % has no verification_evidence_id', NEW.dataset_version_id;
    END IF;

    IF v_source_authority NOT IN ('constitutional', 'statutory') THEN
      RAISE EXCEPTION 'OFFICIAL promotion rejected: Data source authority % is not constitutional or statutory', v_source_authority;
    END IF;

    -- 3. Inspect Provenance Record Lineage (Verified columns in Migration 039)
    SELECT pr.verification_evidence_id, pr.status
    INTO v_provenance_evidence, v_provenance_status
    FROM public.provenance_records pr
    WHERE pr.id = NEW.provenance_id;

    IF v_provenance_evidence IS NULL OR v_provenance_status NOT IN ('OFFICIAL', 'VERIFIED') THEN
      RAISE EXCEPTION 'OFFICIAL promotion rejected: Provenance node % is not verified/official', NEW.provenance_id;
    END IF;

    -- 4. Prevent Scenario Contamination on Assembly Constituencies (Verified columns in Migration 041)
    IF NEW.constituency_version_id IS NOT NULL THEN
      SELECT dr.legal_status
      INTO v_regime_status
      FROM public.constituency_versions cv
      JOIN public.delimitation_regimes dr ON cv.delimitation_regime_id = dr.id
      WHERE cv.id = NEW.constituency_version_id;

      IF v_regime_status != 'CURRENT_LEGAL_REGIME' THEN
        RAISE EXCEPTION 'OFFICIAL promotion rejected: Target delimitation regime % is not CURRENT_LEGAL_REGIME', v_regime_status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8. Authoritative Replacement Lifecycle

> [!IMPORTANT]
> **Spatial comparison is evidence only. Spatial similarity/difference MUST NOT automatically confer authority.**

A geometric match provides technical data for human and legal review; sovereign legal authority originates exclusively from statutory enactments and constitutional orders.

### The 7-Stage Authoritative Lifecycle
1. **Candidate Acquisition:** Raw vector layer ingested and quarantined as `UNVERIFIED` / `is_current = false`.
2. **Certified Source Acquisition:** Official constitutional/statutory boundary artifact obtained.
3. **Coexistence:** Certified geometry ingested under a new `dataset_versions` record without modifying candidate records.
4. **Spatial Audit:** Automated spatial comparison (`ST_Difference`, Hausdorff distance) run as observational evidence.
5. **Evidence Review:** Independent CTO / Legal audit verifies statutory Gazette / Delimitation Order lineage and creates an `evidence_records` entry.
6. **Authorized Promotion:** Explicit governance decision elevates certified row to `status = 'OFFICIAL'`, `is_current = true`.
7. **Official Current Geometry:** Row becomes active and visible through Public RLS.

---

## 9. Safe Migration Rollback Architecture

### 9.1 Protection of W012 Governance History
Rollback of Migration 044 is strictly confined to dropping W016 spatial objects:
```sql
-- SAFE ROLLBACK SCRIPT (DESIGN ONLY)
BEGIN;

-- 1. Drop Views
DROP VIEW IF EXISTS public.v_current_assembly_geometries CASCADE;
DROP VIEW IF EXISTS public.v_candidate_assembly_geometries CASCADE;
DROP VIEW IF EXISTS public.v_current_mandal_geometries CASCADE;
DROP VIEW IF EXISTS public.v_historical_2016_mandal_geometries CASCADE;

-- 2. Drop Triggers and Functions
DROP TRIGGER IF EXISTS trg_guard_geometry_official_promotion ON public.entity_geometries;
DROP FUNCTION IF EXISTS public.fn_guard_geometry_official_promotion();

-- 3. Drop Geometry Relation and Associated Indexes
DROP TABLE IF EXISTS public.entity_geometries CASCADE;

-- 4. Dependency-Checked Catalog Retirement (Non-Destructive)
-- Do NOT execute destructive DELETE on W012 governance tables.
UPDATE public.dataset_versions 
SET metadata = metadata || '{"quarantine_status": "ROLLED_BACK"}'::jsonb 
WHERE id IN ('tgrac_ac_2023_candidate_v1', 'tgrac_districts_2023_candidate_v1', 'tgrac_mandals_2016_candidate_v1');

COMMIT;
```

**Irreversible State Acknowledgment:** Once geometry records or provenance linkages have been referenced in verified audit logs or external domain entities, an in-place destructive rollback of W012 governance entities is impossible, and governance history must be preserved.

---

## 10. Mandal Historical Safety (UNK-16-01 Quarantine)

1. **Temporal Snapshot Window:** Strictly bounded to `[2016-10-11, 2022-09-01)`.
2. **Database Constraint:**
   ```sql
   CONSTRAINT chk_mandal_historical_only CHECK (
     entity_type != 'mandal' OR (
       authority_classification = 'UNVERIFIED_STATE_GIS_CANDIDATE' AND
       temporal_classification = 'HISTORICAL_LEGAL' AND
       is_current = false AND
       valid_to = '2022-09-01'
     )
   )
   ```
3. **Current Legal Block:** Because `valid_to` is `'2022-09-01'` (not NULL), `chk_geometry_current_invariants` physically prevents setting `is_current = true`.
4. **Missing 23 Mandals:** Preserved as `UNKNOWN / BLOCKED` (`UNK-16-01`). Their inferred spatial aggregation is strictly documented as technical notes and NEVER encoded into statutory relationship tables (`mandal_constituency_map`).

---

## 11. Preservation of W015 Relational Primacy

- The following remain the sole statutory ground truth for administrative and electoral containment:
  1. `public.mandal_constituency_map`
  2. `public.polling_booths`
  3. W015 verified relationship records
- **4-State Observational Taxonomy:** Spatial evaluations are categorized as `CONFIRM`, `CONTRADICT`, `INCONCLUSIVE`, or `UNAVAILABLE`.
- Under no circumstances does spatial geometry calculation rewrite or update W015 relationships.

---

## 12. Migration 044 Complete DDL Specification (DESIGN ONLY)

> [!CAUTION]
> **DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION.**  
> The following DDL incorporates all CTO corrections. It must NOT be executed or placed in `supabase/migrations/` until authorized by the CTO.

```sql
-- ==============================================================================
-- Migration 044: Entity Geometries & Provenance Quarantine (DESIGN ONLY)
-- Status: DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
-- Target: Staging Supabase
-- ==============================================================================

BEGIN;

-- ─── 1. CREATE ENTITY GEOMETRIES RELATION ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.entity_geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('state', 'district', 'parliamentary_constituency', 'assembly_constituency', 'mandal')),
  
  -- Explicit typed foreign keys resolving exclusively to W014 version tables
  constituency_version_id UUID REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  district_version_id     UUID REFERENCES public.district_versions(id) ON DELETE RESTRICT,
  state_version_id        UUID REFERENCES public.state_versions(id) ON DELETE RESTRICT,
  pc_version_id           UUID REFERENCES public.parliamentary_constituency_versions(id) ON DELETE RESTRICT,
  mandal_version_id       UUID REFERENCES public.mandal_versions(id) ON DELETE RESTRICT,

  -- W012 Governance & Provenance linkages
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  provenance_id      UUID NOT NULL REFERENCES public.provenance_records(id) ON DELETE RESTRICT,

  -- Spatial payload
  geometry      geometry(MultiPolygon, 4326) NOT NULL,
  geometry_type VARCHAR(50) NOT NULL CHECK (geometry_type IN ('Polygon', 'MultiPolygon')),

  -- Status & Authority classifications
  status data_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  authority_classification VARCHAR(50) NOT NULL CHECK (authority_classification IN (
    'UNVERIFIED_STATE_GIS_CANDIDATE',
    'UNVERIFIED_FIXTURE_GEOMETRY',
    'OFFICIAL_CONSTITUTIONAL_GEOMETRY',
    'OFFICIAL_STATUTORY_GEOMETRY',
    'SCENARIO_PROJECTION_GEOMETRY'
  )),
  temporal_classification VARCHAR(50) NOT NULL CHECK (temporal_classification IN (
    'CURRENT_LEGAL',
    'HISTORICAL_LEGAL',
    'UNVERIFIED_CANDIDATE',
    'SCENARIO'
  )),

  source_feature_id   TEXT,
  raw_artifact_sha256 TEXT NOT NULL,
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  is_current          BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Cardinality and alignment constraints
  CONSTRAINT chk_entity_geometries_exact_one_target 
    CHECK (num_nonnulls(constituency_version_id, district_version_id, state_version_id, pc_version_id, mandal_version_id) = 1),
    
  CONSTRAINT chk_entity_geometries_type_alignment CHECK (
    (entity_type = 'assembly_constituency' AND constituency_version_id IS NOT NULL) OR
    (entity_type = 'district' AND district_version_id IS NOT NULL) OR
    (entity_type = 'state' AND state_version_id IS NOT NULL) OR
    (entity_type = 'parliamentary_constituency' AND pc_version_id IS NOT NULL) OR
    (entity_type = 'mandal' AND mandal_version_id IS NOT NULL)
  ),

  -- Current legal invariants (Calendar-independent: zero CURRENT_DATE dependencies)
  CONSTRAINT chk_geometry_current_invariants CHECK (
    (is_current = false) OR (
      is_current = true AND
      status = 'OFFICIAL' AND
      temporal_classification = 'CURRENT_LEGAL' AND
      authority_classification IN ('OFFICIAL_CONSTITUTIONAL_GEOMETRY', 'OFFICIAL_STATUTORY_GEOMETRY') AND
      valid_to IS NULL
    )
  ),

  -- Status consistency
  CONSTRAINT chk_geometry_status_classification_consistency CHECK (
    (status = 'OFFICIAL' AND authority_classification IN ('OFFICIAL_CONSTITUTIONAL_GEOMETRY', 'OFFICIAL_STATUTORY_GEOMETRY') AND temporal_classification IN ('CURRENT_LEGAL', 'HISTORICAL_LEGAL')) OR
    (status = 'UNVERIFIED' AND authority_classification IN ('UNVERIFIED_STATE_GIS_CANDIDATE', 'UNVERIFIED_FIXTURE_GEOMETRY')) OR
    (status = 'SCENARIO' AND authority_classification = 'SCENARIO_PROJECTION_GEOMETRY' AND temporal_classification = 'SCENARIO')
  ),

  -- Mandal historical safety
  CONSTRAINT chk_mandal_historical_only CHECK (
    entity_type != 'mandal' OR (
      authority_classification = 'UNVERIFIED_STATE_GIS_CANDIDATE' AND
      temporal_classification = 'HISTORICAL_LEGAL' AND
      is_current = false AND
      valid_to = '2022-09-01'
    )
  )
);

-- ─── 2. INDEXING & FIVE-TIER SINGLE-CURRENT UNIQUENESS ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_entity_geometries_geom ON public.entity_geometries USING gist (geometry);
CREATE INDEX IF NOT EXISTS idx_entity_geometries_constituency ON public.entity_geometries (constituency_version_id) WHERE constituency_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_geometries_district ON public.entity_geometries (district_version_id) WHERE district_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_geometries_state ON public.entity_geometries (state_version_id) WHERE state_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_geometries_pc ON public.entity_geometries (pc_version_id) WHERE pc_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_geometries_mandal ON public.entity_geometries (mandal_version_id) WHERE mandal_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_geometries_dataset ON public.entity_geometries (dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_entity_geometries_provenance ON public.entity_geometries (provenance_id);

-- Single-current partial unique indexes for all 5 geography classes
CREATE UNIQUE INDEX IF NOT EXISTS uq_constituency_geometries_single_current 
  ON public.entity_geometries (constituency_version_id) 
  WHERE is_current = true AND constituency_version_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_district_geometries_single_current 
  ON public.entity_geometries (district_version_id) 
  WHERE is_current = true AND district_version_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_state_geometries_single_current 
  ON public.entity_geometries (state_version_id) 
  WHERE is_current = true AND state_version_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_geometries_single_current 
  ON public.entity_geometries (pc_version_id) 
  WHERE is_current = true AND pc_version_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mandal_geometries_single_current 
  ON public.entity_geometries (mandal_version_id) 
  WHERE is_current = true AND mandal_version_id IS NOT NULL;

-- ─── 3. ROW LEVEL SECURITY (RLS) ───────────────────────────────────────────────

ALTER TABLE public.entity_geometries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read official current geometries only" ON public.entity_geometries;
CREATE POLICY "Public read official current geometries only"
  ON public.entity_geometries FOR SELECT
  TO anon, authenticated
  USING (status = 'OFFICIAL' AND is_current = true AND temporal_classification = 'CURRENT_LEGAL');

DROP POLICY IF EXISTS "Service role full access on entity_geometries" ON public.entity_geometries;
CREATE POLICY "Service role full access on entity_geometries"
  ON public.entity_geometries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
```

---

## 13. Comprehensive Acceptance Matrix (Assertions A Through R)

| Assertion | Requirement | Design Mechanism | Future Runtime / Database Verification Test |
|---|---|---|---|
| **A** | Exact W014 FK Resolution | Explicit FK columns `constituency_version_id`, `district_version_id`, etc. with `ON DELETE RESTRICT` | `INSERT` geometry referencing non-existent version UUID fails with Foreign Key Violation (`23503`). |
| **B** | No Orphan Geometry Rows | `CHECK (num_nonnulls(...) = 1)` and `chk_entity_geometries_type_alignment` | `INSERT` geometry with all NULL foreign keys fails with Check Constraint Violation (`23514`). |
| **C** | No Candidate Public Exposure | RLS `SELECT` policy restricted to `status = 'OFFICIAL' AND is_current = true` | `SET ROLE anon; SELECT count(*) FROM entity_geometries WHERE status = 'UNVERIFIED';` returns strictly `0`. |
| **D** | No Scenario Public Exposure | RLS `SELECT` policy excludes `status = 'SCENARIO'` | `SET ROLE anon; SELECT count(*) FROM entity_geometries WHERE status = 'SCENARIO';` returns strictly `0`. |
| **E** | No Invalid OFFICIAL Promotion | Trigger `fn_guard_geometry_official_promotion` asserts verified evidence and statutory source | `UPDATE entity_geometries SET status = 'OFFICIAL' WHERE id = <cand_id>` raises Exception (`23514`). |
| **F** | Current/Legal Uniqueness | Partial unique indexes on version IDs `WHERE is_current = true` | Setting `is_current = true` on two geometries for the same version fails with Unique Violation (`23505`). |
| **G** | Historical Temporal Compatibility | Check constraint `chk_geometry_current_invariants` enforces `is_current = false` for historical dates | Setting `is_current = true` on historical geometry fails with Check Constraint Violation (`23514`). |
| **H** | 589 Mandals Cannot Attach to Current | Check constraint `chk_mandal_historical_only` enforces `temporal_classification = 'HISTORICAL_LEGAL'` | `INSERT` mandal geometry with `is_current = true` fails with Check Constraint Violation (`23514`). |
| **I** | Candidate + Official Coexistence | Multiple rows permitted per entity with distinct `dataset_version_id` when `is_current = false` | Coexistence of TGRAC candidate row and official ECI row for same AC verifies without constraint violation. |
| **J** | W012 Provenance Resolution | `NOT NULL` FKs to `dataset_versions(id)` and `provenance_records(id)` with SHA-256 hash | Relational join from geometry record to source publisher and raw artifact checksum resolves 100%. |
| **K** | W015 Relational Primacy | Geometry schema completely decoupled from `mandal_constituency_map`; zero spatial triggers | Executing geometry ingestion leaves `mandal_constituency_map` and booth rows 100% unaltered. |
| **L** | No Destructive W012 Rollback | Rollback script drops spatial tables only; W012 records preserved with dependency validation | Rollback script execution leaves `data_sources`, `datasets`, and `provenance_records` intact. |
| **M** | Performance Remains UNKNOWN | All speculative numbers removed; 7-category PostGIS benchmark suite planned | Benchmarking conducted post-implementation via `EXPLAIN (ANALYZE, BUFFERS)` on staging PostGIS. |
| **N** | Mandal Resolves to `mandal_versions.id` | Explicit FK `mandal_version_id REFERENCES public.mandal_versions(id) ON DELETE RESTRICT` | `INSERT` geometry referencing non-existent `mandal_version_id` fails with Foreign Key Violation (`23503`). |
| **O** | No Time-Dependent CHECK Constraints | Zero occurrences of `CURRENT_DATE`, `now()`, or dynamic clock expressions in table DDL | Querying `pg_get_constraintdef()` across `entity_geometries` confirms zero occurrences of `CURRENT_DATE`. |
| **P** | Single-Current Uniqueness for All 5 Classes | Dedicated partial unique indexes on version IDs `WHERE is_current = true AND <col> IS NOT NULL` | Attempting to insert a second `is_current = true` row across any of the 5 classes fails with `23505`. |
| **Q** | `is_current=true` Requires `valid_to IS NULL` | `chk_geometry_current_invariants` enforces `valid_to IS NULL` whenever `is_current = true` | Setting `is_current = true` on a row where `valid_to` is populated fails with Check Violation (`23514`). |
| **R** | OFFICIAL Trigger Dependencies Exist in Actual Schema | Schema audit verified columns in Migrations 039 and 041 (`verification_evidence_id`, `status`, `legal_status`) | Trigger `fn_guard_geometry_official_promotion` compiles cleanly against schema without error `42703`. |

---

## 14. Revised Decision Matrix

In accordance with Section 22 of the CTO Directive:

| Hierarchy Layer | Ingestion Gate Classification | Definition & Architectural Meaning |
|---|---|---|
| **AC Geometry** | **READY FOR BOUNDED INGESTION (DESIGN ONLY)** | Technically and relational-design ready for bounded candidate ingestion under Migration 044. Does NOT imply official or constitutional status. |
| **District Geometry** | **READY FOR BOUNDED INGESTION (DESIGN ONLY)** | Technically and relational-design ready for bounded candidate ingestion under Migration 044. Does NOT imply official status. |
| **Mandal Geometry** | **READY FOR HISTORICAL INGESTION (DESIGN ONLY — Awaiting `mandal_versions` DDL)** | Technically and relational-design ready for historical snapshot ingestion [2016–2022] under Migration 044. Strictly BLOCKED for current legal geography queries; requires prior provisioning of `public.mandal_versions`. |

---

## 15. Governance Summary & Final Checklist

- [x] Mandal geometry target replaced with canonical W014 relationship: `mandal_version_id REFERENCES public.mandal_versions(id)`.
- [x] All five geography classes strictly bounded by exact-one target constraint.
- [x] All time-dependent `CURRENT_DATE` expressions removed from check constraints.
- [x] Contradiction between `valid_to > CURRENT_DATE` and `valid_to IS NULL` resolved: `is_current = true -> valid_to IS NULL`.
- [x] Single-current partial unique indexes defined for all five geography classes with verified PostgreSQL NULL semantics.
- [x] Actual schema dependencies verified for all trigger columns (`dataset_versions`, `provenance_records`, `delimitation_regimes`).
- [x] `public.mandal_versions` gap identified and recorded as an unresolved prerequisite dependency.
- [x] Acceptance matrix expanded with assertions N through R.
- [x] Zero application code changes, zero database mutations, zero migrations created.
- [x] Migration 044 remains strictly unauthorized.
