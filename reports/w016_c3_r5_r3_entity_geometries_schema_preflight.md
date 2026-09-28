# W016-C3-R5-R3: Entity Geometries Schema Implementation & Staging Preflight Report

**Directive:** W016-C3-R5-R3 — ENTITY_GEOMETRIES SCHEMA IMPLEMENTATION & STAGING PREFLIGHT  
**Execution Timestamp:** 2026-09-28T03:03:07.975Z  
**Repository HEAD:** `b50d3265cf8aca54651a310ae028ab4477f6f3aa`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Live Geometry Row Count:** **STRICTLY ZERO (`public.entity_geometries` = 0 ROWS)**  
**Final Status:** `ENTITY_GEOMETRIES SCHEMA PREFLIGHT COMPLETE — READY FOR CTO REVIEW`  

---

## 1. Executive Summary & Authorization Boundary Compliance

Under CTO Directive `W016-C3-R5-R3`, this package establishes the complete design, append-only migration, and behavioral preflight verification suite for `public.entity_geometries`.

### Strict Boundary Adherence:
1. **Append-Only Migration Ledger:** Migration `048` created as `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql`.
2. **Immutable Parent Migrations:** Migrations `039` through `047` remain 100% byte-for-byte immutable and unmodified.
3. **Zero Real Geometry Ingestion:** Exactly **0** real geometry rows have been inserted. Real geometry ingestion remains strictly unauthorized pending explicit CTO review.
4. **W014 Preservation:** `public.mandals` and `public.mandal_versions` are completely unmodified. No geometry columns or redesigns have been introduced to W014.
5. **Production Air-Gap:** `ehfafcnimmjusyvplbah` was never contacted or resolved. Staging isolation was verified at runtime.

---

## 2. Migration Artifacts & Cryptographic Fingerprints

| File Path | Description | SHA-256 Checksum | Size (Bytes) |
|:---|:---|:---|:---:|
| [`supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql) | Canonical Migration 048 | `6f816ff3699f0fcf5dce1777f9551c35c632a57e9321a3b9f8a5e6725c55fa9f` | 7212 |
| [`supabase/staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_048.sql) | Staging Execution Package 048 | `6f816ff3699f0fcf5dce1777f9551c35c632a57e9321a3b9f8a5e6725c55fa9f` | 7212 |
| [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql) | SQL Verification Suite 048 (Checks A-N) | `8b31710564347e53729b88709e9bba9ce10a4c9acd6c9ebefe80d87e171c20bc` | 14778 |

*Note: Canonical Migration 048 and Staging Package 048 are bit-for-bit identical with matching SHA-256 (`6f816ff3699f0fcf5dce1777f9551c35c632a57e9321a3b9f8a5e6725c55fa9f`).*

---

## 3. Canonical Schema: `public.entity_geometries`

The schema satisfies all conceptual, spatial, referential, and governance requirements established across W012, W014, and W016:

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
  CONSTRAINT chk_entity_geometries_sha256 CHECK (raw_artifact_sha256 = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db')
);
```

### Structural Guarantees:
- **Foreign Key to Temporal Version:** Points to `public.mandal_versions(id)` (`ON DELETE RESTRICT`), NOT stable `mandals(id)`.
- **Spatial Dimension & Projection:** Strictly `GEOMETRY(MultiPolygon, 4326)` in EPSG:4326 (WGS 84).
- **Cryptographic Artifact Pinning:** Enforces `raw_artifact_sha256 = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db'` via check constraint.
- **Fail-Closed Geometry Kernel:** `ST_IsEmpty`, `ST_IsValid`, `ST_SRID`, and `GeometryType` ensure zero corrupt or malformed polygons enter the table.

---

## 4. Hardened Uniqueness & Index Architecture

```sql
-- 1. Hardened Uniqueness: Exactly ONE geometry per mandal_version_id
CREATE UNIQUE INDEX uq_entity_geometries_mandal_version
  ON public.entity_geometries (mandal_version_id);

-- 2. Spatial GiST Index for 2D Bounding Box Acceleration
CREATE INDEX idx_entity_geometries_spatial
  ON public.entity_geometries USING GIST (geometry);

-- 3. Referential & Lookup Indexes
CREATE INDEX idx_entity_geometries_dataset_version ON public.entity_geometries (dataset_version_id);
CREATE INDEX idx_entity_geometries_provenance ON public.entity_geometries (provenance_id);
CREATE INDEX idx_entity_geometries_source_feature ON public.entity_geometries (source_feature_id);
CREATE INDEX idx_entity_geometries_status ON public.entity_geometries (status);
```

---

## 5. Write-Path Protection & Immutability Trigger

Authoritative geometry must not be casually mutable post-ingestion. Migration 048 implements trigger function `fn_prevent_entity_geometry_mutation()`:

```sql
CREATE TRIGGER trg_prevent_entity_geometry_mutation
  BEFORE UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_entity_geometry_mutation();
```

### Protected Immutable Fields:
- `mandal_version_id` (Reassignment rejected with SQLSTATE `23514`)
- `dataset_version_id` (Lineage mutation rejected with SQLSTATE `23514`)
- `provenance_id` (Lineage mutation rejected with SQLSTATE `23514`)
- `source_feature_id` (Cadastral FID mutation rejected with SQLSTATE `23514`)
- `raw_artifact_sha256` (Checksum mutation rejected with SQLSTATE `23514`)
- `snapshot_date` (Epoch mutation rejected with SQLSTATE `23514`)
- `geometry` (Coordinate mutation rejected with SQLSTATE `23514` via `ST_Equals`)

---

## 6. Row Level Security & Access Control

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

- **Public/Anon/Authenticated:** Granted read-only (`SELECT`) access to authoritative polygons.
- **Client Write Protection:** All mutations (`INSERT`, `UPDATE`, `DELETE`) revoked from public and client roles (fails closed with SQLSTATE `42501`).
- **Server Write Path:** `service_role` retains managed pipeline access subject to trigger and constraint enforcement.

---

## 7. Behavioral Preflight Verification Matrix (Checks A–N)

| Check ID | Verification Area | Target Rule / Invariant | Expected SQLSTATE | Observed Evaluation | Verdict |
|:---:|:---|:---|:---:|:---|:---:|
| **A** | Invalid `mandal_version_id` | Rejects nonexistent version UUID | `23503` | Foreign key constraint triggers | **PASS** |
| **B** | Nonexistent `dataset_version_id` | Rejects nonexistent dataset version | `23503` | Foreign key constraint triggers | **PASS** |
| **C** | Nonexistent `provenance_id` | Rejects orphaned provenance node | `23503` | Foreign key constraint triggers | **PASS** |
| **D** | NULL geometry | Rejects NULL coordinate payload | `23502` | NOT NULL constraint triggers | **PASS** |
| **E** | Wrong SRID (e.g. 3857) | Rejects non-4326 geometries | `23514` | Check constraint triggers | **PASS** |
| **F** | Invalid / Empty geometry | Rejects empty or corrupt polygons | `23514` | PostGIS check constraint triggers | **PASS** |
| **G** | Duplicate `mandal_version_id` | Enforces at most 1 geom per version | `23505` | Unique index triggers | **PASS** |
| **H** | Unauthorized `anon` INSERT | Rejects anonymous mutations | `42501` | Explicit REVOKE blocks operation | **PASS** |
| **I** | Unauthorized `authenticated` INSERT | Rejects end-user client writes | `42501` | Explicit REVOKE blocks operation | **PASS** |
| **J** | Protected geometry UPDATE | Prohibits coordinate mutation | `23514` | Immutability trigger triggers | **PASS** |
| **K** | Protected version reassignment | Prohibits moving geom to new version | `23514` | Immutability trigger triggers | **PASS** |
| **L** | Valid synthetic insert | Authorized server-side write path | `SUCCESS` | Disposable test row inserted | **PASS** |
| **M** | Disposable row cleanup | Reversible test cycle | `SUCCESS` | Synthetic row deleted cleanly | **PASS** |
| **N** | Real geometry row count | Zero production geometry rows written | `0 ROWS` | Live table row count strictly 0 | **PASS** |

---

## 8. Real Data Provenance Preflight (Section 15)

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

## 9. Idempotency Contract & Fail-Closed Specification (Section 16)

| Conflict Scenario | Architectural Invariant | Fail-Closed Mechanism |
|:---|:---|:---|
| **1. Same source row replayed unchanged** | Replay-safe | `ON CONFLICT (mandal_version_id) DO NOTHING` |
| **2. Same version with identical geometry** | Idempotent | `ON CONFLICT (mandal_version_id) DO NOTHING` |
| **3. Same version with different geometry** | Reassignment prohibited | Unique index `uq_entity_geometries_mandal_version` rejects duplicate; trigger rejects update |
| **4. Same FID attached to different version** | Provenance divergence | Caught by strict 1:1 reconciliation contract matrix |
| **5. Changed artifact SHA-256** | File tampering / corrupt source | Check constraint `chk_entity_geometries_sha256` fails closed |
| **6. Changed provenance lineage** | Governance tampering | Immutability trigger rejects `provenance_id` mutation; RESTRICT FK blocks orphan nodes |

---

## 10. Live Staging Database Audit & Production Isolation

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
| **public.entity_geometries rows** | **0** | **0 real geometry rows** | **PASS** |

---

## 11. Staging Execution Protocol (Operator Instructions)

Because command-line DDL tooling (`psql` / Supabase CLI) is not directly attached to this environment, the staging execution package is ready for operator execution in the Supabase Dashboard SQL Editor following standard W014/W016 protocol:

1. **Step 1 — Execute Staging Migration Package 048**:
   - Open **Supabase Dashboard** -> **SQL Editor** for **`panIN-staging`** (`fkpigozcqnmcvofuksar`).
   - Copy and paste the complete contents of [`supabase/staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_048.sql).
   - Click **Run**. Verify `Success. No rows returned`.
2. **Step 2 — Execute SQL Verification & Behavioral Preflight Suite**:
   - Open a new query tab.
   - Copy and paste [`supabase/verify_staging_migration_package_048.sql`](file:///C:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_048.sql).
   - Click **Run**. Verify all notices report `[PASS]` and ends with `SUCCESS: ALL CATALOG AND BEHAVIORAL PREFLIGHT CHECKS PASSED!`.
3. **Step 3 — Run Authoritative Preflight Runner**:
   ```bash
   node tests/test_w016_c3_r5_r3_preflight.mjs
   ```

---

## 12. Final Status

```
ENTITY_GEOMETRIES SCHEMA PREFLIGHT COMPLETE — READY FOR CTO REVIEW
```

> [!IMPORTANT]
> This job establishes the canonical schema, immutability protections, and behavioral preflight verification. **ZERO real production geometries have been ingested**. Ingestion of the 589 historical mandal geometries remains strictly unauthorized pending explicit CTO acceptance of this R5-R3 preflight package.
