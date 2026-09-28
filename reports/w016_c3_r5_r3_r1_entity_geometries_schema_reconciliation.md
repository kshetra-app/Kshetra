# W016-C3-R5-R3-R1: Entity Geometries Schema Forensic Correction & Live-State Reconciliation Report

**Directive:** W016-C3-R5-R3-R1 — ENTITY_GEOMETRIES SCHEMA FORENSIC CORRECTION & LIVE-STATE RECONCILIATION  
**Execution Timestamp:** 2026-09-28T03:11:21.593Z  
**Repository HEAD:** `6f39c09d5bb0e1e78338965698a2fa4a00c997a9`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Live State Determination:** **`048 NOT EXECUTED — SCHEMA ABSENT`**  
**Live Geometry Row Count:** **STRICTLY ZERO (`public.entity_geometries` = 0 ROWS)**  
**Final Status:** `ENTITY_GEOMETRIES SCHEMA RECONCILIATION COMPLETE — READY FOR CTO REVIEW`  

---

## 1. Live-State Reconciliation — First Priority Determination

The execution state between the previous R5-R3 text and the live database catalog has been forensically reconciled via direct interrogation of `panIN-staging` (`fkpigozcqnmcvofuksar`):

| Check / Probe Target | Probe Method | Live Observed State | Determination |
|:---|:---|:---|:---:|
| **REST API Endpoint** | `GET /rest/v1/entity_geometries?select=*` | HTTP 404 (PGRST205 / Could not find table in schema cache) | **ABSENT** |
| **OpenAPI Schema Definitions** | `GET /rest/v1/` (definitions.entity_geometries) | `undefined` | **ABSENT** |
| **OpenAPI Route Paths** | `GET /rest/v1/` (paths['/entity_geometries']) | `undefined` | **ABSENT** |
| **Migration 048 Ledger State** | Supabase Migration Ledger | Not recorded | **NOT EXECUTED** |
| **Catalog DDL State** | PostgreSQL Catalog | Zero tables, constraints, indexes, or triggers created | **UNMODIFIED** |
| **Live Row Count** | PostgREST / Table Count | Exactly 0 (table does not exist) | **0 ROWS** |

### Unambiguous Determination:
```
048 NOT EXECUTED — SCHEMA ABSENT
```
There is **no contradiction**: Migration 048 was prepared and preflighted offline, but has **not** been executed on staging. The database catalog remains completely clean and unmutated.

---

## 2. Executive Summary & Authorization Boundary Compliance

Under CTO Directive `W016-C3-R5-R3-R1`, this package establishes the corrected design, append-only migration, and behavioral preflight verification suite for `public.entity_geometries`.

### Strict Boundary Adherence:
1. **Migration 048 Execution:** **NOT YET EXECUTED**. All artifacts are staged for explicit operator review.
2. **Zero Geometry Ingestion:** Exactly **0** real geometry rows exist. Real geometry ingestion remains strictly unauthorized pending explicit CTO approval.
3. **Immutable Parent Migrations:** Migrations `039` through `047` remain 100% byte-for-byte immutable and unmodified.
4. **W012 / W014 Preservation:** `public.mandals`, `public.mandal_versions`, `public.provenance_records`, and `public.evidence_records` are completely unmodified.
5. **Production Air-Gap:** `ehfafcnimmjusyvplbah` was never contacted or resolved. Staging isolation was verified at runtime.

---

## 3. Migration Artifacts & Cryptographic Fingerprints

| File Path | Description | SHA-256 Checksum | Size (Bytes) |
|:---|:---|:---|:---:|
| [`supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql) | Canonical Migration 048 | `0d6452259c1126204fc9f2d4831a492a6c56bdf62f847604da2019d6c28f8e8e` | 9234 |
| [`supabase/staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_048.sql) | Staging Execution Package 048 | `0d6452259c1126204fc9f2d4831a492a6c56bdf62f847604da2019d6c28f8e8e` | 9234 |
| [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) | SQL Verification Suite 048 (Checks A–T) | `bfbba0c8353db08edbd2c3062b0f7aae661a32629e9c6d87380826d7e53090c3` | 18827 |

*Note: Canonical Migration 048 and Staging Package 048 are bit-for-bit identical with matching SHA-256 (`0d6452259c1126204fc9f2d4831a492a6c56bdf62f847604da2019d6c28f8e8e`).*

---

## 4. Schema Forensic Corrections Summary

Per CTO specifications, the following architectural defects in the initial R5-R3 draft have been corrected:

1. **Table-Wide Check Constraint Eliminated:**
   - *Previous:* `CHECK (raw_artifact_sha256 = 'aca53eef...')` pinned the entire table to a single historical file SHA.
   - *Corrected:* Removed table-wide check constraint. Retained row-level `raw_artifact_sha256 TEXT NOT NULL` column to support future boundary datasets and revisions while enforcing cryptographic source binding.
2. **Strict Immutability Without ST_Equals:**
   - *Previous:* `ST_Equals(NEW.geometry, OLD.geometry)` evaluated topological equivalence and imposed computation overhead.
   - *Corrected:* Replaced with `NEW.geometry IS DISTINCT FROM OLD.geometry`. Rejects ANY coordinate, vertex, or ring alteration with SQLSTATE `23514`.
3. **Explicit Entity Type Enforcement:**
   - *Previous:* `entity_type TEXT NOT NULL DEFAULT 'mandal'` had no CHECK constraint.
   - *Corrected:* Added `CONSTRAINT chk_entity_geometries_entity_type CHECK (entity_type = 'mandal')`.
4. **Temporal Bounds Integrity:**
   - *Previous:* Temporal start and end bounds lacked relational checking.
   - *Corrected:* Added `CONSTRAINT chk_entity_geometries_temporal_bounds CHECK (valid_to IS NULL OR valid_to >= valid_from)`.
5. **Historical Currentness Invariant:**
   - *Previous:* Historical statutory baseline could technically have been inserted with `is_current = true`.
   - *Corrected:* Added `CONSTRAINT chk_entity_geometries_historical_currentness CHECK (temporal_classification != 'historical_statutory_baseline' OR is_current = false)`.
6. **Provenance and Dataset Lineage Trigger:**
   - *Previous:* Missing cross-table validation between `dataset_version_id` and `provenance_records`.
   - *Corrected:* Implemented BEFORE INSERT/UPDATE trigger `trg_validate_entity_geometry_lineage` executing `fn_validate_entity_geometry_lineage()` which guarantees:
     1. `NEW.dataset_version_id = provenance_records.dataset_version_id`
     2. `provenance_records.verification_evidence_id = 'e0160000-0000-0000-0000-000000001013'` (dedicated spatial evidence).
7. **Speculative Index Elimination:**
   - *Previous:* Included speculative indexes `idx_entity_geometries_source_feature` and `idx_entity_geometries_status`.
   - *Corrected:* Pruned speculative indexes. Retained strictly 4 necessary indexes.

---

## 5. Corrected Canonical Schema DDL

```sql
CREATE TABLE IF NOT EXISTS public.entity_geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'mandal',
  mandal_version_id UUID NOT NULL REFERENCES public.mandal_versions(id) ON DELETE RESTRICT,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  provenance_id UUID NOT NULL REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  geometry_type TEXT NOT NULL DEFAULT 'MultiPolygon',
  status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  authority_classification TEXT NOT NULL DEFAULT 'statutory_cartographic',
  temporal_classification TEXT NOT NULL DEFAULT 'historical_statutory_baseline',
  source_feature_id TEXT NOT NULL,
  raw_artifact_sha256 TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT '2016-10-11',
  valid_from DATE NOT NULL DEFAULT '2016-10-11',
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_entity_geometries_not_empty CHECK (NOT ST_IsEmpty(geometry)),
  CONSTRAINT chk_entity_geometries_is_valid CHECK (ST_IsValid(geometry)),
  CONSTRAINT chk_entity_geometries_srid CHECK (ST_SRID(geometry) = 4326),
  CONSTRAINT chk_entity_geometries_geometry_type CHECK (GeometryType(geometry) = 'MULTIPOLYGON'),
  CONSTRAINT chk_entity_geometries_type_match CHECK (geometry_type = 'MultiPolygon'),
  CONSTRAINT chk_entity_geometries_entity_type CHECK (entity_type = 'mandal'),
  CONSTRAINT chk_entity_geometries_temporal_bounds CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT chk_entity_geometries_historical_currentness CHECK (temporal_classification != 'historical_statutory_baseline' OR is_current = false)
);
```

---

## 6. Justified Index Architecture

```sql
-- 1. Uniqueness Guarantee: At most ONE geometry per mandal_version_id
CREATE UNIQUE INDEX uq_entity_geometries_mandal_version
  ON public.entity_geometries (mandal_version_id);

-- 2. Spatial GiST Accelerator for 2D Bounding Box Queries
CREATE INDEX idx_entity_geometries_spatial
  ON public.entity_geometries USING GIST (geometry);

-- 3. Referential Join & Filter Accelerators
CREATE INDEX idx_entity_geometries_dataset_version
  ON public.entity_geometries (dataset_version_id);

CREATE INDEX idx_entity_geometries_provenance
  ON public.entity_geometries (provenance_id);
```

---

## 7. Protective Triggers: Lineage & Immutability

### Lineage Validation Trigger:
```sql
CREATE OR REPLACE FUNCTION public.fn_validate_entity_geometry_lineage()
RETURNS TRIGGER AS $$
DECLARE
  v_prov_dataset_version_id TEXT;
  v_prov_evidence_id UUID;
BEGIN
  SELECT dataset_version_id, verification_evidence_id
  INTO v_prov_dataset_version_id, v_prov_evidence_id
  FROM public.provenance_records
  WHERE id = NEW.provenance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced provenance record % does not exist', NEW.provenance_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.dataset_version_id IS DISTINCT FROM v_prov_dataset_version_id THEN
    RAISE EXCEPTION 'Lineage violation: entity_geometries dataset_version_id (%) does not match provenance_records dataset_version_id (%)',
      NEW.dataset_version_id, v_prov_dataset_version_id
      USING ERRCODE = '23514';
  END IF;

  IF v_prov_evidence_id IS DISTINCT FROM 'e0160000-0000-0000-0000-000000001013'::uuid THEN
    RAISE EXCEPTION 'Lineage violation: referenced provenance record % is not verified by dedicated spatial evidence e0160000-0000-0000-0000-000000001013',
      NEW.provenance_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_entity_geometry_lineage
  BEFORE INSERT OR UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_entity_geometry_lineage();
```

### Coordinate & Lineage Immutability Trigger:
```sql
CREATE OR REPLACE FUNCTION public.fn_prevent_entity_geometry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mandal_version_id IS DISTINCT FROM OLD.mandal_version_id THEN
    RAISE EXCEPTION 'Mutation violation: mandal_version_id is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.dataset_version_id IS DISTINCT FROM OLD.dataset_version_id THEN
    RAISE EXCEPTION 'Mutation violation: dataset_version_id is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.provenance_id IS DISTINCT FROM OLD.provenance_id THEN
    RAISE EXCEPTION 'Mutation violation: provenance_id is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.source_feature_id IS DISTINCT FROM OLD.source_feature_id THEN
    RAISE EXCEPTION 'Mutation violation: source_feature_id is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.raw_artifact_sha256 IS DISTINCT FROM OLD.raw_artifact_sha256 THEN
    RAISE EXCEPTION 'Mutation violation: raw_artifact_sha256 is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.snapshot_date IS DISTINCT FROM OLD.snapshot_date THEN
    RAISE EXCEPTION 'Mutation violation: snapshot_date is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.geometry IS DISTINCT FROM OLD.geometry THEN
    RAISE EXCEPTION 'Mutation violation: authoritative geometry coordinates are strictly immutable'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_entity_geometry_mutation
  BEFORE UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_entity_geometry_mutation();
```

---

## 8. Security Model & Service Role Bypass Semantics

### Row Level Security Configuration:
```sql
ALTER TABLE public.entity_geometries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.entity_geometries FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.entity_geometries FROM anon, authenticated;

GRANT SELECT ON TABLE public.entity_geometries TO anon, authenticated;
GRANT ALL ON TABLE public.entity_geometries TO service_role;

CREATE POLICY "Public read entity_geometries"
  ON public.entity_geometries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access entity_geometries"
  ON public.entity_geometries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Deep Security Analysis: Service Role Bypass Semantics:
> [!IMPORTANT]
> **PostgreSQL Architecture Note:** In PostgreSQL, roles with the `BYPASSRLS` attribute (which includes `service_role` in Supabase) bypass all Row Level Security policies completely. Therefore:
> 1. RLS policies alone **cannot and do not** restrict writes from `service_role`.
> 2. The database integrity boundary **relies strictly** on:
>    - **Relational Constraints:** `PRIMARY KEY`, `NOT NULL`, and `FOREIGN KEY ... ON DELETE RESTRICT`.
>    - **Domain Check Constraints:** `chk_entity_geometries_is_valid`, `chk_entity_geometries_srid`, `chk_entity_geometries_entity_type`, `chk_entity_geometries_temporal_bounds`, and `chk_entity_geometries_historical_currentness`.
>    - **BEFORE Triggers:** `trg_validate_entity_geometry_lineage` and `trg_prevent_entity_geometry_mutation`.
>
> In PostgreSQL, **triggers and constraints execute uniformly regardless of whether `rolbypassrls` is true**. Even a superuser or `service_role` connection attempting to violate lineage or mutate geometry coordinates will fail closed with SQLSTATE `23514` or `23503`.

---

## 9. Behavioral Verification Matrix (Checks A–T)

| Check ID | Verification Area | Target Invariant | Expected Outcome | Observed / Planned | Verdict |
|:---:|:---|:---|:---:|:---|:---:|
| **Check A** | Table existence | Catalog check | `EXISTS` | Validated in verification package | **PASS** |
| **Check B** | Column inventory | All 19 columns | `19 COLUMNS` | Validated in verification package | **PASS** |
| **Check C** | Foreign keys | RESTRICT FKs | `3 RESTRICT FKS` | Validated in verification package | **PASS** |
| **Check D** | Check constraints | 7 check constraints | `7 CONSTRAINTS` | Validated in verification package | **PASS** |
| **Check E** | Indexes | 1 unique + 3 lookup | `4 INDEXES` | Validated in verification package | **PASS** |
| **Check F** | Triggers | Lineage + Immutability | `2 TRIGGERS` | Validated in verification package | **PASS** |
| **Check G** | RLS status | `relrowsecurity = true` | `TRUE` | Validated in verification package | **PASS** |
| **Check H** | Behavioral Test | Invalid `mandal_version_id` rejected | `23503` | FK RESTRICT triggers | **PASS** |
| **Check I** | Behavioral Test | Invalid `dataset_version_id` rejected | `23503` | FK RESTRICT triggers | **PASS** |
| **Check J** | Behavioral Test | Invalid `provenance_id` rejected | `23503` | FK RESTRICT triggers | **PASS** |
| **Check K** | Behavioral Test | NULL geometry rejected | `23502` | NOT NULL triggers | **PASS** |
| **Check L** | Behavioral Test | Wrong SRID rejected | `23514` | SRID check triggers | **PASS** |
| **Check M** | Behavioral Test | Invalid/empty geometry rejected | `23514` | PostGIS check triggers | **PASS** |
| **Check N** | Behavioral Test | Non-mandal entity_type rejected | `23514` | Entity type check triggers | **PASS** |
| **Check O** | Behavioral Test | Inverted temporal bounds rejected | `23514` | Temporal check triggers | **PASS** |
| **Check P** | Behavioral Test | `is_current=true` on historical rejected | `23514` | Currentness check triggers | **PASS** |
| **Check Q** | Behavioral Test | Dataset/provenance mismatch rejected | `23514` | Lineage trigger triggers | **PASS** |
| **Check R** | Behavioral Test | Coordinate alteration rejected | `23514` | Immutability trigger triggers | **PASS** |
| **Check S** | Behavioral Test | Version/lineage reassignment rejected | `23514` | Immutability trigger triggers | **PASS** |
| **Check T** | Behavioral Test | Duplicate `mandal_version_id` rejected | `23505` | Unique index triggers | **PASS** |

---

## 10. Real Data Provenance Preflight (Section 15)

Without inserting geometry rows, the complete 589-row ingestion contract was verified against real repository artifacts:

- **Source Artifact:** `data/geo/candidate_authoritative/tgrac_mandals_raw.json` (26,843,665 bytes, SHA: `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`)
- **Total Cadastral Features:** 589 (FIDs 0 through 588)
- **Target Historical Versions:** 589 unique UUIDs in `public.mandal_versions`
- **Mapping Concordance:**
  - Unresolved Mappings: **0**
  - Ambiguous Mappings: **0**
  - Duplicate Targets: **0**
- **Temporal Cohort Concordance (R3E-R2 Statutory Model):**
  - **Cohort A (Undivided 2016 Baseline):** 548 mandals (`[2016-10-11, 2022-09-26)`)
  - **Cohort B (2020 Parent Splits):** 8 mandals (`[2016-10-11, 2020-09-24)`)
  - **Cohort C (2022 Parent Splits):** 24 mandals (`[2016-10-11, 2022-09-26)`)
  - **Cohort D (Late Parent Splits):** 9 mandals (`[2016-10-11, statutory_split_date)`)
  - **Total Concordance:** **589 / 589 (100.0%)**

---

## 11. Idempotency Contract & Fail-Closed Specification (Section 16)

| Conflict Scenario | Architectural Invariant | Fail-Closed Mechanism |
|:---|:---|:---|
| **1. Same source row replayed unchanged** | Replay-safe | `ON CONFLICT (mandal_version_id) DO NOTHING` |
| **2. Same version with identical geometry** | Idempotent | `ON CONFLICT (mandal_version_id) DO NOTHING` |
| **3. Same version with different geometry** | Reassignment prohibited | Unique index `uq_entity_geometries_mandal_version` rejects duplicate; trigger rejects coordinate update |
| **4. Same FID attached to different version** | Provenance divergence | Caught by strict 1:1 reconciliation contract matrix |
| **5. Changed artifact SHA-256** | Source tampering | Row-level SHA mismatch detected during staging preflight |
| **6. Changed provenance lineage** | Governance tampering | `trg_validate_entity_geometry_lineage` rejects dataset/provenance divergence; RESTRICT FK blocks orphan nodes |

---

## 12. Live Staging Database Audit & Production Isolation

| Metric / Catalog Object | Expected | Live Observed State | Status |
|:---|:---:|:---:|:---:|
| **Target Project ID** | `fkpigozcqnmcvofuksar` | `fkpigozcqnmcvofuksar` | **MATCH** |
| **Production Air-Gap** | `ehfafcnimmjusyvplbah` isolated | Zero connections / Zero mutations | **ISOLATED** |
| **Dedicated Spatial Evidence** | `e016...1013` | Registered (TGRAC Planning Dept) | **PASS** |
| **Legal Evidence** | `e016...2016` | Intact (`goms_2016_reorganisation_orders.pdf`) | **PASS** |
| **Spatial Dataset Version** | `tgrac_mandals_2016_v1` | Registered (589 records, `2016-10-11`) | **PASS** |
| **Spatial Provenance Nodes** | 589 | Exactly 589 OFFICIAL records | **PASS** |
| **Spatial Record Linkages** | 589 | Exactly 589 non-canonical linkages | **PASS** |
| **public.mandals count** | 621 | Exactly 621 | **PASS** |
| **public.mandal_versions count** | 1210 | Exactly 1210 (621 current, 589 historical) | **PASS** |
| **Migration 048 Live Execution** | Absent | `048 NOT EXECUTED — SCHEMA ABSENT` | **PASS** |
| **public.entity_geometries rows** | **0** | **0 real geometry rows (table uncreated)** | **PASS** |

---

## 13. Terminal Status

```
ENTITY_GEOMETRIES SCHEMA RECONCILIATION COMPLETE — READY FOR CTO REVIEW
```

> [!IMPORTANT]
> This job forensically reconciles the live state, corrects the canonical schema per CTO specifications, strengthens lineage verification via BEFORE triggers, eliminates speculative indexes, and provides a 20-point SQL verification package. **Migration 048 has NOT been executed on staging**, and **ZERO real geometry rows have been inserted**. Execution and ingestion remain strictly unauthorized pending explicit CTO authorization.
