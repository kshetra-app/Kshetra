# W013: STAGING MIGRATION APPLICATION PACKAGE (040)
## Canonical Geography Model Foundation & Telangana Bounded Pilot

```
JOB:                     W013 (Canonical Geography Model)
TARGET ENVIRONMENT:      panIN-staging (fkpigozcqnmcvofuksar.supabase.co)
AUTHORITATIVE BASELINE:  284f7ca1952f41c6d3d9203998b63e84323281be
MIGRATION ID:            040_canonical_geography_model
CANONICAL MIGRATION:     supabase/migrations/040_canonical_geography_model.sql
ATOMIC STAGING PACKAGE:  supabase/staging_migration_package_040.sql
VERIFICATION SQL:        supabase/verify_staging_migration_package_040.sql
TEST BATTERY:            tests/verify_w013_canonical_geography.mjs
BOM ENFORCEMENT:         0 U+FEFF characters across all files (100% verified)
EXECUTION STATUS:        READY FOR STAGING APPLICATION
```

---

## 1. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/040_canonical_geography_model.sql` | Canonical Migration 040 | 69,431 | `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628` | 0 |
| `supabase/staging_migration_package_040.sql` | Atomic Staging Application Package | 69,431 | `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628` | 0 |
| `supabase/verify_staging_migration_package_040.sql` | Verification SQL Suite (Checks 1–10) | 11,337 | `146bc71c50cfdcf0af61d38186127acb77de6a773d6ffa1c7eabafaa2618f892` | 0 |
| `tests/verify_w013_canonical_geography.mjs` | Node Test Battery (Tests 13-A–13-L) | 19,673 | `816a0169feed987d0411b89b6c964dbc1d9215e2d96649d122c1b06e637d5fb8` | 0 |
| `reports/w013_staging_verification.json` | Test Execution Evidence Record | 4,461 | `a49e077f829f8f286ac04dcdad7bd9899c8d4caf6df31ea93142cc9f56934a21` | 0 |

---

## 2. Section 15 Pre-Execution Checkpoint

```yaml
checkpoint_timestamp: "2026-09-22T08:16:30Z"
head_sha: "284f7ca1952f41c6d3d9203998b63e84323281be"
working_tree_status: "CLEAN (pre-implementation baseline validated)"
migration_file: "supabase/staging_migration_package_040.sql"
migration_sha256: "b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628"
target_supabase_project: "panIN-staging (fkpigozcqnmcvofuksar)"
production_status: "STRICTLY UNTOUCHED (Zero traffic / Zero mutations)"
expected_objects_created:
  tables:
    - "public.districts"
    - "public.parliamentary_constituencies"
  constraints:
    - "districts_pkey (id UUID PRIMARY KEY)"
    - "districts_code_key (code VARCHAR(30) UNIQUE)"
    - "districts_lgd_code_key (lgd_code INTEGER UNIQUE)"
    - "uq_districts_state_name (state_code, name UNIQUE)"
    - "districts_state_code_fkey (REFERENCES states(code) ON DELETE RESTRICT)"
    - "districts_primary_dataset_version_id_fkey (REFERENCES dataset_versions(id) ON DELETE RESTRICT)"
    - "parliamentary_constituencies_pkey (id UUID PRIMARY KEY)"
    - "parliamentary_constituencies_code_key (code VARCHAR(30) UNIQUE)"
    - "uq_pc_state_number (state_code, pc_number UNIQUE)"
    - "parliamentary_constituencies_state_code_fkey (REFERENCES states(code) ON DELETE RESTRICT)"
    - "parliamentary_constituencies_primary_dataset_version_id_fkey (REFERENCES dataset_versions(id) ON DELETE RESTRICT)"
    - "uq_states_internal_id (internal_id UUID UNIQUE)"
    - "uq_states_lgd_code (lgd_code INTEGER UNIQUE)"
    - "states_primary_dataset_version_id_fkey (REFERENCES dataset_versions(id) ON DELETE RESTRICT)"
    - "uq_constituencies_internal_id (internal_id UUID UNIQUE)"
    - "uq_constituencies_canonical_code (canonical_code VARCHAR(30) UNIQUE)"
    - "constituencies_district_id_fkey (REFERENCES districts(id) ON DELETE RESTRICT)"
    - "constituencies_parliamentary_constituency_id_fkey (REFERENCES parliamentary_constituencies(id) ON DELETE RESTRICT)"
    - "constituencies_primary_dataset_version_id_fkey (REFERENCES dataset_versions(id) ON DELETE RESTRICT)"
  indexes:
    - "idx_states_internal_id"
    - "idx_states_primary_version"
    - "idx_districts_state_code"
    - "idx_districts_lgd_code"
    - "idx_districts_code"
    - "idx_districts_primary_version"
    - "idx_pcs_state_code"
    - "idx_pcs_code"
    - "idx_pcs_number"
    - "idx_pcs_primary_version"
    - "idx_constituencies_internal_id"
    - "idx_constituencies_canonical_code"
    - "idx_constituencies_pc_id"
    - "idx_constituencies_district_id"
    - "idx_constituencies_primary_version"
  rls_policies:
    - "Public read districts (SELECT TO anon, authenticated)"
    - "Service role full access on districts (ALL TO service_role)"
    - "Public read parliamentary_constituencies (SELECT TO anon, authenticated)"
    - "Service role full access on parliamentary_constituencies (ALL TO service_role)"
expected_objects_altered:
  - "public.states: Add columns internal_id (UUID NOT NULL UNIQUE), lgd_code (INT), census_code_2011 (VARCHAR), primary_dataset_version_id (TEXT FK)"
  - "public.constituencies: Add columns internal_id (UUID NOT NULL UNIQUE), canonical_code (VARCHAR UNIQUE), entity_type (VARCHAR), eci_ac_code (VARCHAR), parliamentary_constituency_id (UUID FK), district_id (UUID FK), name_te (TEXT), primary_dataset_version_id (TEXT FK). Preserve existing PK id."
expected_rows_inserted_or_upserted:
  data_sources: 2 ("mha_india", "telangana_revenue_dept")
  datasets: 3 ("mha_state_reorganisation", "ts_revenue_districts", "eci_delimitation_order_2008")
  dataset_versions: 6 ("mha_ts_2014_v1", "ts_districts_2016_v1", "ts_districts_2019_additions_v1", "ts_districts_2019_composite_v1", "eci_ts_pc_2008_v1", "eci_ts_ac_2008_v1")
  provenance_records: 5 (All initial status UNVERIFIED)
  states: 1 updated ("TS" linked to "mha_ts_2014_v1")
  districts: 33 (31 base from 2016, 2 additions from 2019)
  parliamentary_constituencies: 17 (All linked to "eci_ts_pc_2008_v1")
  constituencies: 119 (All linked to "eci_ts_ac_2008_v1", 100% mapped to PC & District)
  record_provenance_linkages: 170 (1 state, 33 districts, 17 PCs, 119 ACs)
expected_destructive_operations: "NONE (0 DROPs, 0 RENAMEs, 0 TRUNCATEs, 0 column drops)"
```

---

## 3. Staging Execution Instructions

### Step 1: Execute Migration 040 on Staging
1. Open the **Supabase Dashboard** -> **SQL Editor**.
2. Verify you are connected to **panIN-staging** (Project ID: `fkpigozcqnmcvofuksar`).
3. Copy and paste the entire contents of [`supabase/staging_migration_package_040.sql`](../supabase/staging_migration_package_040.sql).
4. Run the query. It will execute inside a single transactional block (`BEGIN ... COMMIT`).
5. Confirm successful execution with 0 errors.

### Step 2: Execute SQL Inspection Checks
1. Copy and paste the entire contents of [`supabase/verify_staging_migration_package_040.sql`](../supabase/verify_staging_migration_package_040.sql).
2. Run the script in the Supabase SQL Editor.
3. Confirm that all 10 inspection queries produce expected results:
   - Check 1: 4 canonical tables (`constituencies`, `districts`, `parliamentary_constituencies`, `states`).
   - Check 2: Additive columns present on `states` and `constituencies`.
   - Check 3: `constituencies_pkey` preserved on `id`; `internal_id` and `canonical_code` UNIQUE.
   - Check 4: All referential constraints have `delete_rule = 'RESTRICT'`.
   - Check 5: 4 `primary_version` indexes verified.
   - Check 6: RLS enabled on `districts` and `parliamentary_constituencies` with public read policies.
   - Check 7: 3 geography datasets registered under statutory/constitutional sources.
   - Check 8: 6 dataset versions present with `default_status = 'UNVERIFIED'`.
   - Check 9: Row counts: 1 State (`TS`), 33 Districts (31 base, 2 additions), 17 PCs, 119 ACs (100% mapped).
   - Check 10: 170 record provenance linkages registered under `UNVERIFIED` provenance records.

### Step 3: Run Authoritative Staging Verification Battery
Execute the independent Node.js verification battery from repository root:
```bash
node tests/verify_w013_canonical_geography.mjs
```

---

## 4. Rollback & Reversal Procedure

If any error or anomaly occurs during execution, Migration 040 is enclosed in an explicit transaction (`BEGIN ... COMMIT`) and will automatically roll back on any SQL exception.

If explicit manual reversal is required, the following teardown block safely removes Migration 040 additions without cascading into pre-existing domain tables:

```sql
BEGIN;

-- 1. Remove W012 Linkages & Provenance
DELETE FROM public.record_provenance_linkages
WHERE domain_table IN ('districts', 'parliamentary_constituencies')
   OR (domain_table = 'constituencies' AND provenance_id = '00000000-0000-0000-0013-000000000005'::uuid)
   OR (domain_table = 'states' AND provenance_id = '00000000-0000-0000-0013-000000000001'::uuid);

DELETE FROM public.provenance_records
WHERE id IN (
  '00000000-0000-0000-0013-000000000001'::uuid,
  '00000000-0000-0000-0013-000000000002'::uuid,
  '00000000-0000-0000-0013-000000000003'::uuid,
  '00000000-0000-0000-0013-000000000004'::uuid,
  '00000000-0000-0000-0013-000000000005'::uuid
);

-- 2. Clear Additive Columns on Constituencies & States
UPDATE public.constituencies
SET
  parliamentary_constituency_id = NULL,
  district_id = NULL,
  primary_dataset_version_id = NULL
WHERE state_code = 'TS';

UPDATE public.states
SET primary_dataset_version_id = NULL
WHERE code = 'TS';

-- 3. Drop Canonical Entities
DROP TABLE IF EXISTS public.parliamentary_constituencies CASCADE;
DROP TABLE IF EXISTS public.districts CASCADE;

-- 4. Remove Dataset Versions & Datasets
DELETE FROM public.dataset_versions
WHERE id IN (
  'mha_ts_2014_v1',
  'ts_districts_2016_v1',
  'ts_districts_2019_additions_v1',
  'ts_districts_2019_composite_v1',
  'eci_ts_pc_2008_v1',
  'eci_ts_ac_2008_v1'
);

DELETE FROM public.datasets
WHERE id IN ('mha_state_reorganisation', 'ts_revenue_districts');

DELETE FROM public.data_sources
WHERE id IN ('mha_india', 'telangana_revenue_dept');

COMMIT;
```
