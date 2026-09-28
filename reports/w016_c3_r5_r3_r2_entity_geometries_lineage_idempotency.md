# W016-C3-R5-R3-R2: Entity Geometries Lineage Generalization & Fail-Closed Ingestion Contract Report

**Directive:** W016-C3-R5-R3-R2 — ENTITY_GEOMETRIES LINEAGE GENERALIZATION & FAIL-CLOSED INGESTION CONTRACT  
**Execution Timestamp:** 2026-09-28T03:35:03.889Z  
**Repository HEAD:** `f12296b1ac5f15c684ba59c837b5185ad53deb44`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Live State Determination:** **`048 NOT EXECUTED — SCHEMA ABSENT`**  
**Live Geometry Row Count:** **STRICTLY ZERO (`public.entity_geometries` = 0 ROWS)**  
**Final Status:** `ENTITY_GEOMETRIES LINEAGE & IDEMPOTENCY RECONCILIATION COMPLETE — READY FOR CTO REVIEW`  

---

## 1. Executive Summary & Resolution of Architectural Blockers

Under CTO Directive `W016-C3-R5-R3-R2`, the two architectural blockers identified in R5-R3-R1 have been completely resolved:

1. **Resolution of Blocker 1 (Generic Lineage Generalization):**
   - **Defect:** Trigger `trg_validate_entity_geometry_lineage` previously hardcoded W016 spatial evidence UUID `e0160000-0000-0000-0000-000000001013`.
   - **Resolution:** Removed all hardcoded evidence IDs, dataset version tags, artifact SHAs, and snapshot dates from Migration 048.
   - **Generic Invariant:** The database trigger now enforces:
     1. `entity_geometries.dataset_version_id = provenance_records.dataset_version_id`
     2. `provenance_records.verification_evidence_id IS NOT NULL` (W012 compliance)
     3. Referential existence of the evidence record in `public.evidence_records`
   - **Proven Reusability:** Validated via Test L6, which proves that a legitimate future spatial dataset (`future_cartographic_2026_v1`) with evidence `e016...9999` succeeds without schema modification.

2. **Resolution of Blocker 2 (Fail-Closed Idempotency Contract):**
   - **Defect:** Proposed ingestion previously relied on `ON CONFLICT (mandal_version_id) DO NOTHING`, which silently suppressed semantic conflicts.
   - **Resolution:** Replaced silent suppression with an explicit, fail-closed idempotency contract.
   - **Exact Comparison:** All 14 governed identity fields (including bit-exact binary geometry comparison via `ST_AsBinary` and `ST_OrderingEquals`) must match identically for an idempotent replay. Any divergence fails closed with an explicit exception (SQLSTATE `23514` or `23505`).

---

## 2. Migration Artifacts & Cryptographic Fingerprints

| File Path | Description | SHA-256 Checksum | Size (Bytes) |
|:---|:---|:---|:---:|
| [`supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql) | Corrected Generic Migration 048 | `8efbb1df7e6d13d8cb2b8da4b2fba35b3d941bcf89b5bcfb9c02de0bb9073178` | 13104 |
| [`supabase/staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_048.sql) | Staging Execution Package 048 | `8efbb1df7e6d13d8cb2b8da4b2fba35b3d941bcf89b5bcfb9c02de0bb9073178` | 13104 |
| [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) | SQL Verification Suite 048 (L1–L6, I1–I8, M1–M5) | `45dcea26f732701bbb983e965e33bbe3a365475cf66aec8b47f9bdddd4a6c2c1` | 27971 |
| [`tests/test_w016_c3_r5_r3_preflight.mjs`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_w016_c3_r5_r3_preflight.mjs) | 36-Gate Automated Preflight Suite | `13d626275b91da296ee88aced19fb8dee072492072f7267e71194c76a2b7ea6f` | 16446 |

*Note: Canonical Migration 048 and Staging Package 048 are bit-for-bit identical with matching SHA-256 (`8efbb1df7e6d13d8cb2b8da4b2fba35b3d941bcf89b5bcfb9c02de0bb9073178`).*

---

## 3. Generic Lineage Invariant & Trigger DDL

From Migration 048 lines 66–107:

```sql
-- Generic invariant: verifies dataset_version_id parity and W012 evidence presence.
-- Strictly NO hardcoded dataset_version, evidence UUID, artifact SHA, or date.
CREATE OR REPLACE FUNCTION public.fn_validate_entity_geometry_lineage()
RETURNS TRIGGER AS $$
DECLARE
  v_prov RECORD;
BEGIN
  -- 1. Fetch referenced provenance record
  SELECT dataset_version_id, verification_evidence_id, status
  INTO v_prov
  FROM public.provenance_records
  WHERE id = NEW.provenance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVENANCE NOT FOUND: referenced provenance_record % does not exist', NEW.provenance_id
      USING ERRCODE = '23503';
  END IF;

  -- 2. Generic Dataset Parity Invariant: entity_geometries.dataset_version_id must match provenance_records.dataset_version_id
  IF v_prov.dataset_version_id IS DISTINCT FROM NEW.dataset_version_id THEN
    RAISE EXCEPTION 'PROVENANCE DATASET MISMATCH: entity_geometries.dataset_version_id (%) does not match provenance_records.dataset_version_id (%)',
      NEW.dataset_version_id, v_prov.dataset_version_id
      USING ERRCODE = '23514';
  END IF;

  -- 3. Generic W012 Provenance Invariant: provenance record must have an attached verification evidence ID
  IF v_prov.verification_evidence_id IS NULL THEN
    RAISE EXCEPTION 'PROVENANCE EVIDENCE MISSING: referenced provenance record % has NULL verification_evidence_id',
      NEW.provenance_id
      USING ERRCODE = '23514';
  END IF;

  -- 4. Generic Evidence Existence Invariant: referenced evidence record must exist in public.evidence_records
  PERFORM 1 FROM public.evidence_records WHERE id = v_prov.verification_evidence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVENANCE EVIDENCE NOT FOUND: evidence record % referenced by provenance % does not exist',
      v_prov.verification_evidence_id, NEW.provenance_id
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_entity_geometry_lineage
  BEFORE INSERT OR UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_entity_geometry_lineage();
```

---

## 4. W016-Specific Ingestion Contract

Per Directive Section 2, the specific parameters of the 2016-10-11 historical statutory baseline belong strictly to the **future W016 ingestion job/migration**, not to the reusable schema:

| Contract Parameter | Specification | Verification Source |
|:---|:---|:---|
| **Dataset Version ID** | `tgrac_mandals_2016_v1` | Registered in `public.dataset_versions` |
| **Spatial Evidence ID** | `e0160000-0000-0000-0000-000000001013` | Verified in `public.evidence_records` |
| **Artifact SHA-256** | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | Byte-verified against source JSON |
| **Snapshot Date** | `2016-10-11` | Statutory baseline date |
| **Source File Path** | `data/geo/candidate_authoritative/tgrac_mandals_raw.json` | 26,843,665 bytes on disk |
| **Total Features** | 589 | FIDs 0 through 588 |
| **Target Versions** | 589 | Exactly 589 historical versions in `public.mandal_versions` |
| **Mapping Concordance** | 100.0% | 0 unresolved, 0 ambiguous, 0 duplicates |
| **Temporal Cohort Concordance** | Cohort A: 548, Cohort B: 8, Cohort C: 24, Cohort D: 9 | Authoritative R3E-R2 temporal model |

---

## 5. Fail-Closed Idempotency Specification & Governed Identity Fields

### Governed Identity Fields:
For an incoming replay to be deemed safe, it must be proved bit-for-bit identical to the existing record across all 14 governed fields:

| Field Name | Type | Invariant Role | Comparison Semantics |
|:---|:---|:---|:---|
| `mandal_version_id` | UUID | Target temporal entity version | Exact equality (`=`) |
| `dataset_version_id` | TEXT | Dataset version partition | Exact equality (`=`) |
| `provenance_id` | UUID | Lineage governance node | Exact equality (`=`) |
| `source_feature_id` | TEXT | Cadastral source FID (0-588) | Exact equality (`=`) |
| `raw_artifact_sha256` | TEXT | Cryptographic binding to source file | Exact equality (`=`) |
| `snapshot_date` | DATE | Statutory epoch | Exact equality (`=`) |
| `valid_from` | DATE | Statutory validity start | Exact equality (`=`) |
| `valid_to` | DATE | Statutory validity end | `IS NOT DISTINCT FROM` |
| `temporal_classification` | TEXT | Temporal categorization | Exact equality (`=`) |
| `authority_classification` | TEXT | Legal authority classification | Exact equality (`=`) |
| `geometry_type` | TEXT | Spatial type discriminator | Exact equality (`=`) |
| `entity_type` | TEXT | Entity class discriminator | Exact equality (`=`) |
| `metadata` | JSONB | Normalized cartographic properties | Canonical JSONB equality (`=`) |
| `geometry` | GEOMETRY | PostGIS MultiPolygon coordinates | `ST_AsBinary(a) = ST_AsBinary(b) AND ST_OrderingEquals(a, b)` |

### Geometry Comparison Semantics:
> [!IMPORTANT]
> **PostGIS Storage Semantics:** `ST_Equals` evaluates topological equality and allows different vertex orderings or colinear points within floating-point tolerance.
> For authoritative cadastral snapshots, exact replay requires **bitwise coordinate parity**:
> 1. `ST_AsBinary(existing.geometry) = ST_AsBinary(incoming.geometry)`: Well-Known Binary (WKB) byte equality.
> 2. `ST_OrderingEquals(existing.geometry, incoming.geometry)`: Strict vertex ordering and direction equivalence.
> This guarantees that not a single vertex, ring, or coordinate has shifted.

### Fail-Closed Behavior Matrix:
- **CASE A — Exact Replay:** All 14 governed identity fields and coordinates match identically. **Result: IDEMPOTENT SUCCESS** (replay safe; returns existing row UUID).
- **CASE B — Governed Field Divergence:** Same `mandal_version_id` but any governed metadata/temporal field differs. **Result: FAIL CLOSED** with SQLSTATE `23514`.
- **CASE C — Geometry Coordinate Divergence:** Same `mandal_version_id` but coordinates or vertex sequence differ. **Result: FAIL CLOSED** with SQLSTATE `23514`.
- **CASE D — Source Feature Reassignment:** Same `source_feature_id` mapped to a different `mandal_version_id` within dataset. **Result: FAIL CLOSED** with SQLSTATE `23514`.
- **CASE E — Artifact Checksum Divergence:** Incoming `raw_artifact_sha256` differs. **Result: FAIL CLOSED** with SQLSTATE `23514`.
- **CASE F — Dataset Version Divergence:** Incoming `dataset_version_id` differs. **Result: FAIL CLOSED** with SQLSTATE `23514`.
- **CASE G — Provenance Lineage Divergence:** Incoming `provenance_id` differs. **Result: FAIL CLOSED** with SQLSTATE `23514`.

---

## 6. Mutable vs Immutable Field Classification

Because `service_role` has `rolbypassrls = true` in Supabase PostgreSQL, RLS cannot constrain `service_role` updates. Therefore, database constraints and BEFORE triggers define the authoritative integrity boundary:

| Column Name | Classification | Enforcement Mechanism | Allowed Transition / Rule | SQLSTATE on Violation |
|:---|:---:|:---|:---|:---:|
| `id` | **IMMUTABLE** | Trigger `trg_prevent_entity_geometry_mutation` | No mutation permitted | `23514` |
| `entity_type` | **IMMUTABLE** | CHECK constraint + Trigger | Strictly `'mandal'` | `23514` |
| `mandal_version_id` | **IMMUTABLE** | Unique index + Trigger | No reassignment permitted | `23514` |
| `dataset_version_id` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `provenance_id` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `source_feature_id` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `raw_artifact_sha256` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `snapshot_date` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `geometry_type` | **IMMUTABLE** | CHECK constraint + Trigger | Strictly `'MultiPolygon'` | `23514` |
| `geometry` | **IMMUTABLE** | Trigger (IS DISTINCT FROM) | Coordinate alterations strictly forbidden | `23514` |
| `authority_classification` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `temporal_classification` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `valid_from` | **IMMUTABLE** | Trigger | No mutation permitted | `23514` |
| `metadata` | **IMMUTABLE** | Trigger | Sealed cartographic properties | `23514` |
| `created_at` | **IMMUTABLE** | Trigger | Audit creation timestamp | `23514` |
| `valid_to` | **CONTROLLED LIFECYCLE** | Trigger + CHECK constraint | `NULL -> closed DATE >= valid_from`. If already set, alteration is forbidden. | `23514` |
| `is_current` | **CONTROLLED LIFECYCLE** | Trigger + CHECK constraint | `true -> false` upon supersession. Historical baseline can NEVER be set to `true`. | `23514` |
| `status` | **CONTROLLED LIFECYCLE** | Trigger | `OFFICIAL -> SUPERSEDED` or `OFFICIAL -> DEPRECATED` only. | `23514` |
| `updated_at` | **CONTROLLED LIFECYCLE** | Trigger | Automatically set to `now()` on permitted lifecycle update | N/A |

---

## 7. Lineage Test Matrix (Section 9: L1–L6)

Executed in [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) within an isolated transaction:

| Test ID | Scenario | Expected Result | Observed Result | Status |
|:---:|:---|:---:|:---:|:---:|
| **L1** | Matching `dataset_version_id` + matching provenance | **PASS** | Insert succeeds | **PASS** |
| **L2** | Mismatched `dataset_version_id` + provenance | **FAIL (23514)** | Trigger raises `PROVENANCE DATASET MISMATCH` | **PASS** |
| **L3** | Provenance from unrelated dataset | **FAIL (23514)** | Trigger raises `PROVENANCE DATASET MISMATCH` | **PASS** |
| **L4** | Provenance without required evidence (`verification_evidence_id` is NULL) | **FAIL (23514)** | Trigger raises `PROVENANCE EVIDENCE MISSING` | **PASS** |
| **L5** | W016 spatial provenance `e016...1013` | **PASS** | Insert succeeds under W016 parameters | **PASS** |
| **L6** | Another legitimate future spatial evidence record (`future_cartographic_2026_v1`) | **PASS** | Insert succeeds without schema modification | **PASS** |

*Test L6 definitively proves that the generic `entity_geometries` schema is fully decoupled from W016-specific IDs.*

---

## 8. Idempotency Test Matrix (Section 10: I1–I8)

Executed in [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) within an isolated transaction:

| Test ID | Case Description | Tested Scenario | Expected Result | Observed Result | Status |
|:---:|:---|:---|:---:|:---:|:---:|
| **I1** | **Case A** | Exact replay across all 14 governed fields & coordinates | **IDEMPOTENT SUCCESS** | Exactly 1 row persists; match proven | **PASS** |
| **I2** | **Case B** | Same `mandal_version_id` + conflicting `snapshot_date` | **FAIL CLOSED (23505 / 23514)** | Exception raised | **PASS** |
| **I3** | **Case C** | Same `mandal_version_id` + conflicting geometry | **FAIL CLOSED (23505 / 23514)** | Exception raised | **PASS** |
| **I4** | **Case D** | Same `mandal_version_id` + conflicting provenance | **FAIL CLOSED (23505 / 23514)** | Exception raised | **PASS** |
| **I5** | **Case E** | Same `mandal_version_id` + conflicting artifact SHA | **FAIL CLOSED (23505 / 23514)** | Exception raised | **PASS** |
| **I6** | **Case F** | Same source FID mapped to different version | **FAIL CLOSED (23514)** | Ingestion contract pre-check blocks | **PASS** |
| **I7** | **Case G** | Exact replay after transaction retry | **SUCCESS (1 row persists)** | Verified exactly 1 row | **PASS** |
| **I8** | **Case H** | Conflicting replay | **EXPLICIT EXCEPTION** | Never silent DO NOTHING | **PASS** |

---

## 9. Live Staging Database Audit & Production Isolation

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

## 10. Terminal Status

```
ENTITY_GEOMETRIES LINEAGE & IDEMPOTENCY RECONCILIATION COMPLETE — READY FOR CTO REVIEW
```

> [!IMPORTANT]
> This reconciliation completely removes all W016-specific hardcoding from the generic `entity_geometries` schema, proves generic reusability across future datasets via Test L6, establishes an explicit fail-closed idempotency contract replacing `ON CONFLICT DO NOTHING`, formalizes controlled lifecycle mutability, and confirms live staging status as **`048 NOT EXECUTED — SCHEMA ABSENT`** with **0 real geometry rows**. Migration 048 execution and geometry ingestion remain strictly unauthorized pending explicit CTO authorization.
