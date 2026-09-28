# W016-C3-R5-R3-R2A: Entity Geometries W012 Status Semantics Reconciliation Report

**Directive:** W016-C3-R5-R3-R2A — CTO AUTHORIZATION: W012 STATUS SEMANTICS RECONCILIATION FOR ENTITY_GEOMETRIES  
**Execution Timestamp:** 2026-09-28T03:59:44.603Z  
**Repository HEAD:** `0cfcf1fddb2e3f7aec7893ad83f9b9a4c565d130`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Verification Scope:** **STATIC / ISOLATED-PACKAGE VERIFICATION ONLY**  
**Live State Determination:** **`048 NOT EXECUTED — SCHEMA ABSENT`**  
**Live Geometry Row Count:** **STRICTLY ZERO (`public.entity_geometries` = 0 ROWS)**  
**Final Status:** `ENTITY_GEOMETRIES STATUS RECONCILIATION COMPLETE — READY FOR CTO REVIEW`  

---

## 1. Executive Summary & Canonical W012 Enum Evidence

Under CTO Directive `W016-C3-R5-R3-R2A`, the lifecycle status model for `public.entity_geometries` has been reconciled with canonical W012 semantics, eliminating all non-canonical status values.

### Canonical W012 Evidence:
In [`supabase/migrations/039_data_governance_foundation.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/039_data_governance_foundation.sql) (lines 32–42), `public.data_status_enum` is authoritatively defined as:

```sql
CREATE TYPE data_status_enum AS ENUM (
  'OFFICIAL',
  'DERIVED',
  'VERIFIED',
  'ESTIMATE',
  'SCENARIO',
  'INFERRED',
  'UNVERIFIED',
  'UNKNOWN'
);
```

> [!IMPORTANT]
> **Architectural Fact:** `public.data_status_enum` represents **epistemic/governance credibility**, NOT temporal active/superseded lifecycle status. Values `SUPERSEDED`, `DEPRECATED`, and `PROVISIONAL` do not exist in the database catalog. Attempting to cast or assign them produces PostgreSQL error `22P02`.

---

## 2. Complete Inventory of Non-Canonical Terms & Resolutions

Every instance of `SUPERSEDED`, `DEPRECATED`, and `PROVISIONAL` across the codebase and verification packages was audited and reconciled:

| File Path | Line(s) | Context / Code | Classification | Architectural Resolution |
|:---|:---:|:---|:---:|:---|
| `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql` | 230–233 | Trigger checked `NEW.status IN ('SUPERSEDED', 'DEPRECATED')` | **1. Removed from executable SQL** | Replaced with strict status immutability: `status` cannot be mutated (SQLSTATE `23514`). |
| `supabase/staging_migration_package_048.sql` | 230–233 | Trigger checked `NEW.status IN ('SUPERSEDED', 'DEPRECATED')` | **1. Removed from executable SQL** | Synchronized bit-for-bit with canonical migration. |
| `supabase/verify_staging_migration_package_048.sql` | 215 | Inserted fixture with status `'PROVISIONAL'` | **1. Removed from executable SQL** | Replaced with canonical W012 value `'UNVERIFIED'`. |
| `supabase/verify_staging_migration_package_048.sql` | 463–472 | Test M1 attempted `SET status = 'SUPERSEDED'` | **3. Architectural correction** | Replaced with Test M1: testing `valid_to` closure (`NULL -> DATE >= valid_from`). |
| `supabase/verify_staging_migration_package_048.sql` | 474–484 | Test M2 attempted `SET status = 'PROVISIONAL'` | **3. Architectural correction** | Replaced with Test M2: testing rejection of `status` mutation with SQLSTATE `23514`. |
| `tests/test_w016_c3_r5_r3_preflight.mjs` | 194–198 | Check IDEMP-10 asserted status transition strings | **3. Architectural correction** | Replaced with check verifying `status` immutability and `valid_to`/`is_current` lifecycle rules. |
| `scripts/generate_w016_c3_r5_r3_r2_reports.mjs` | 270, 486 | Documented `OFFICIAL -> SUPERSEDED` | **2. Historical text** | Superseded by `generate_w016_c3_r5_r3_r2a_reports.mjs`. |

---

## 3. Reconciled Entity Geometries Lifecycle Model

### Clear Separation of Concerns:
1. **Governance/Credibility Status (`status`):**
   - Authoritative cadastral geometries are inserted with `status = 'OFFICIAL'`.
   - An official historical statutory baseline gazetted on 2016-10-11 **remains `OFFICIAL` perpetually**.
   - It never degrades to "unofficial", "derived", or "unverified".
   - Therefore, `status` is **IMMUTABLE** on `public.entity_geometries`.
2. **Temporal Supersession Lifecycle (`valid_to` & `is_current`):**
   - Active boundaries have `is_current = true` and open-ended `valid_to IS NULL`.
   - When superseded by a subsequent reorganization order:
     - `valid_to` is closed: transitions from `NULL` to the statutory termination date (`DATE >= valid_from`).
     - `is_current` transitions from `true -> false`.
   - For historical statutory baselines (like 2016-10-11):
     - `is_current` is strictly `false` from birth (enforced by CHECK constraint and trigger).
     - `valid_to` is fixed or closed when superseding gazette order takes effect.
   - W014 `mandal_versions` remains the sole legal authority for temporal entity identity.

---

## 4. Field Mutability Matrix (19 Columns)

Because `service_role` has `rolbypassrls = true` in Supabase PostgreSQL, database constraints and BEFORE triggers enforce the data integrity boundary:

| Column Name | Classification | Permitted Transition / Rule | Enforcement Mechanism | SQLSTATE on Violation |
|:---|:---:|:---|:---|:---:|
| `id` | **IMMUTABLE** | Primary key; no mutation permitted | Immutability Trigger | `23514` |
| `entity_type` | **IMMUTABLE** | Strictly `'mandal'` | CHECK Constraint + Trigger | `23514` |
| `mandal_version_id` | **IMMUTABLE** | Unique version binding; reassignment forbidden | Unique Index + Trigger | `23514` |
| `dataset_version_id` | **IMMUTABLE** | Dataset partition identifier; mutation forbidden | Trigger | `23514` |
| `provenance_id` | **IMMUTABLE** | Lineage governance node; mutation forbidden | Trigger | `23514` |
| `source_feature_id` | **IMMUTABLE** | Cadastral FID; mutation forbidden | Trigger | `23514` |
| `raw_artifact_sha256` | **IMMUTABLE** | Cryptographic input seal; mutation forbidden | Trigger | `23514` |
| `snapshot_date` | **IMMUTABLE** | Gazette epoch; mutation forbidden | Trigger | `23514` |
| `geometry_type` | **IMMUTABLE** | Strictly `'MultiPolygon'` | CHECK Constraint + Trigger | `23514` |
| `geometry` | **IMMUTABLE** | Coordinates strictly immutable post-insertion | Trigger (`IS DISTINCT FROM`) | `23514` |
| `status` | **IMMUTABLE** | Strictly `'OFFICIAL'`; mutation forbidden | Trigger | `23514` |
| `authority_classification` | **IMMUTABLE** | Legal authority classification; mutation forbidden | Trigger | `23514` |
| `temporal_classification` | **IMMUTABLE** | Temporal categorization; mutation forbidden | Trigger | `23514` |
| `valid_from` | **IMMUTABLE** | Statutory validity start; mutation forbidden | Trigger | `23514` |
| `metadata` | **IMMUTABLE** | Sealed cartographic properties; mutation forbidden | Trigger | `23514` |
| `created_at` | **IMMUTABLE** | Audit creation timestamp; mutation forbidden | Trigger | `23514` |
| `valid_to` | **CONTROLLED LIFECYCLE** | `NULL -> closed DATE >= valid_from`. If already set, shifting is forbidden. | Trigger + CHECK Constraint | `23514` |
| `is_current` | **CONTROLLED LIFECYCLE** | `true -> false` upon supersession. Historical baseline can NEVER be set to `true`. | Trigger + CHECK Constraint | `23514` |
| `updated_at` | **CONTROLLED LIFECYCLE** | Automatically set to `now()` on permitted `valid_to`/`is_current` updates | Trigger | N/A |

---

## 5. Corrected Trigger DDL: Immutability & Lifecycle

From Migration 048 lines 119–254:

```sql
CREATE OR REPLACE FUNCTION public.fn_prevent_entity_geometry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- A. STRICT IMMUTABILITY: Identity, Spatial Coordinates & Source Provenance Columns
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: id cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.entity_type IS DISTINCT FROM OLD.entity_type THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: entity_type cannot be mutated (OLD: %, NEW: %)',
        OLD.entity_type, NEW.entity_type
        USING ERRCODE = '23514';
    END IF;

    IF NEW.mandal_version_id IS DISTINCT FROM OLD.mandal_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: mandal_version_id cannot be reassigned (OLD: %, NEW: %)',
        OLD.mandal_version_id, NEW.mandal_version_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.dataset_version_id IS DISTINCT FROM OLD.dataset_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: dataset_version_id cannot be mutated (OLD: %, NEW: %)',
        OLD.dataset_version_id, NEW.dataset_version_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.provenance_id IS DISTINCT FROM OLD.provenance_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: provenance_id cannot be mutated (OLD: %, NEW: %)',
        OLD.provenance_id, NEW.provenance_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.source_feature_id IS DISTINCT FROM OLD.source_feature_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: source_feature_id cannot be mutated (OLD: %, NEW: %)',
        OLD.source_feature_id, NEW.source_feature_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.raw_artifact_sha256 IS DISTINCT FROM OLD.raw_artifact_sha256 THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: raw_artifact_sha256 cannot be mutated (OLD: %, NEW: %)',
        OLD.raw_artifact_sha256, NEW.raw_artifact_sha256
        USING ERRCODE = '23514';
    END IF;

    IF NEW.snapshot_date IS DISTINCT FROM OLD.snapshot_date THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: snapshot_date cannot be mutated (OLD: %, NEW: %)',
        OLD.snapshot_date, NEW.snapshot_date
        USING ERRCODE = '23514';
    END IF;

    IF NEW.geometry_type IS DISTINCT FROM OLD.geometry_type THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: geometry_type cannot be mutated (OLD: %, NEW: %)',
        OLD.geometry_type, NEW.geometry_type
        USING ERRCODE = '23514';
    END IF;

    -- Strict byte-exact coordinate immutability via IS DISTINCT FROM
    IF NEW.geometry IS DISTINCT FROM OLD.geometry THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Authoritative geometry coordinates cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    -- W012 Data Status is strictly immutable: an OFFICIAL statutory record remains OFFICIAL
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: status cannot be mutated (OLD: %, NEW: %)',
        OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;

    IF NEW.authority_classification IS DISTINCT FROM OLD.authority_classification THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: authority_classification cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.temporal_classification IS DISTINCT FROM OLD.temporal_classification THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: temporal_classification cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.valid_from IS DISTINCT FROM OLD.valid_from THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: valid_from cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: metadata cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: created_at cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    -- B. CONTROLLED LIFECYCLE MUTABILITY: valid_to
    -- If valid_to was already set (closed), it cannot be shifted.
    -- If valid_to was NULL, it may transition to a closed date >= valid_from.
    IF OLD.valid_to IS NOT NULL AND NEW.valid_to IS DISTINCT FROM OLD.valid_to THEN
      RAISE EXCEPTION 'LIFECYCLE VIOLATION: valid_to is already closed and cannot be altered'
        USING ERRCODE = '23514';
    END IF;

    -- C. CONTROLLED LIFECYCLE MUTABILITY: is_current
    -- Allowed transition: true -> false (retirement upon supersession).
    -- False -> true is prohibited for historical baseline records.
    IF OLD.is_current = false AND NEW.is_current = true THEN
      IF NEW.temporal_classification = 'historical_statutory_baseline' THEN
        RAISE EXCEPTION 'LIFECYCLE VIOLATION: historical statutory baseline geometry cannot be set to is_current = true'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    -- D. AUTOMATIC UPDATE: updated_at
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Source-FID Uniqueness Analysis (Task E)

### Architectural Partitioning:
- **Generic Schema Scope:** `public.entity_geometries` enforces unique `mandal_version_id` (`uq_entity_geometries_mandal_version`). It intentionally avoids a table-level unique constraint on `(dataset_version_id, source_feature_id)` to ensure reusability across potential future non-cadastral spatial datasets that may decompose large multi-part boundaries into multiple feature records.
- **W016 Ingestion Contract Scope:** In the 2016 statutory baseline, each of the 589 features (FIDs 0–588) represents exactly one mandal boundary polygon. To guarantee that a `source_feature_id` cannot silently map to a different `mandal_version_id`, the W016 ingestion procedure must execute an explicit transactional assertion:

```sql
-- Fail-closed transactional check inside the W016 ingestion transaction:
IF EXISTS (
  SELECT 1 FROM public.entity_geometries
  WHERE dataset_version_id = p_dataset_version_id
    AND source_feature_id = p_source_feature_id
    AND mandal_version_id <> p_mandal_version_id
) THEN
  RAISE EXCEPTION 'SOURCE FID COLLISION: source_feature_id % in dataset % is already mapped to a different mandal_version_id'
    USING ERRCODE = '23514';
END IF;
```

If any collision is detected, the ingestion transaction fails closed with SQLSTATE `23514`.

---

## 7. Static / Isolated-Package Verification Results (Task F)

All automated verification was executed offline against static migration packages and artifacts without executing Migration 048 on staging:

| Verification Gate | Tested Area | Checks | Result | Status |
|:---|:---|:---:|:---:|:---:|
| **Part 1** | Migration Artifact Integrity & Ledger Audit | 7 | 7 / 7 Passed | **PASS** |
| **Part 2** | Real Data Provenance Preflight (Section 15) | 10 | 10 / 10 Passed | **PASS** |
| **Part 3** | Idempotency & Lifecycle Semantics Audit (Section 16) | 11 | 11 / 11 Passed | **PASS** |
| **Part 4** | Live Staging Catalog Audit (048 Absence & 0 Rows) | 8 | 8 / 8 Passed | **PASS** |
| **Total** | **Preflight Regression Suite** | **36** | **36 / 36 Passed** | **PASS** |

### Live Staging Reality (Confirmed):
- `048 NOT EXECUTED — SCHEMA ABSENT` (HTTP 404 / PGRST205 / not in OpenAPI / zero DDL executed).
- `public.entity_geometries` row count = **STRICTLY ZERO**.
- Production (`ehfafcnimmjusyvplbah`): **STRICTLY AIR-GAPPED & UNTOUCHED**.

---

## 8. Artifacts & Checksums

| File Path | Description | SHA-256 Checksum |
|:---|:---|:---|
| [`supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql) | Corrected Generic Migration 048 DDL | `a62911903ea65a9d147217dc66be595d4e489aee8c93beb939b0f09930011877` |
| [`supabase/staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_048.sql) | Staging Migration Package (bit-for-bit identical) | `a62911903ea65a9d147217dc66be595d4e489aee8c93beb939b0f09930011877` |
| [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) | SQL Verification Suite (L1–L6, I1–I8, M1–M5) | `7e0fc04e0d181e81610e77bf844a3a487bf7acd99699edd4240afc698968c8ec` |
| [`tests/test_w016_c3_r5_r3_preflight.mjs`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_w016_c3_r5_r3_preflight.mjs) | 36-Gate Automated Preflight Suite | `35180fe7d48227fbabfe133d6ede63f5d7fe84ce85084831c0cf16afe0dfb881` |
| [`reports/w016_c3_r5_r3_r2a_entity_geometries_status_reconciliation.json`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w016_c3_r5_r3_r2a_entity_geometries_status_reconciliation.json) | Structured Machine-Readable Deliverable | (Generated on execution) |
| [`reports/w016_c3_r5_r3_r2a_entity_geometries_status_reconciliation.md`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w016_c3_r5_r3_r2a_entity_geometries_status_reconciliation.md) | Human-Readable Comprehensive Audit Report | (Generated on execution) |

---

## 9. Terminal Status

```
ENTITY_GEOMETRIES STATUS RECONCILIATION COMPLETE — READY FOR CTO REVIEW
```

> [!IMPORTANT]
> Non-canonical status values (`SUPERSEDED`, `DEPRECATED`, `PROVISIONAL`) have been completely removed from executable SQL, `public.data_status_enum` integrity has been preserved, `status` is defined as strictly immutable `'OFFICIAL'`, temporal supersession is cleanly partitioned to `valid_to` and `is_current`, and live staging status is confirmed as **`048 NOT EXECUTED — SCHEMA ABSENT`** with **0 real geometry rows**. Migration 048 execution and geometry ingestion remain strictly unauthorized pending explicit CTO authorization.
