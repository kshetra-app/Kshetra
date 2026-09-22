-- ==============================================================================
-- W013: POST-MIGRATION 040 VERIFICATION SQL SUITE
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Authoritative Architecture: reports/w013_canonical_model_proposal.md
-- Mandate: CTO Implementation Authorization (W013)
-- Checks:
--   1. Canonical tables existence (districts, parliamentary_constituencies)
--   2. Additive columns on states and constituencies
--   3. Primary key and uniqueness constraints preservation
--   4. Foreign key integrity and RESTRICT delete rules
--   5. Index catalog verification for geography tables
--   6. Row Level Security verification across canonical geography tables
--   7. W012 data sources and datasets catalog registration
--   8. W012 dataset versions and UNVERIFIED data status verification
--   9. Pilot entity row counts (1 State, 33 Districts, 17 PCs, 119 ACs)
--  10. W012 record provenance linkages resolution
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Canonical Geography Tables Existence
-- ------------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('districts', 'parliamentary_constituencies', 'constituencies', 'states')
ORDER BY table_name;
-- EXPECTED: Exactly 4 rows: constituencies, districts, parliamentary_constituencies, states

-- ------------------------------------------------------------------------------
-- CHECK 2: Additive Columns on states and constituencies
-- ------------------------------------------------------------------------------
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'states' AND column_name IN ('internal_id', 'lgd_code', 'census_code_2011', 'primary_dataset_version_id')) OR
    (table_name = 'constituencies' AND column_name IN ('internal_id', 'canonical_code', 'entity_type', 'eci_ac_code', 'parliamentary_constituency_id', 'district_id', 'name_te', 'primary_dataset_version_id'))
  )
ORDER BY table_name, column_name;
-- EXPECTED:
-- states: census_code_2011, internal_id (NO), lgd_code, primary_dataset_version_id
-- constituencies: canonical_code, district_id, eci_ac_code, entity_type, internal_id (NO), name_te, parliamentary_constituency_id, primary_dataset_version_id

-- ------------------------------------------------------------------------------
-- CHECK 3: Primary Key and Uniqueness Constraints Preservation
-- ------------------------------------------------------------------------------
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('districts', 'parliamentary_constituencies', 'constituencies')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
-- EXPECTED:
-- constituencies: constituencies_pkey on id (PRIMARY KEY preserved)
-- constituencies: uq_constituencies_internal_id on internal_id (UNIQUE)
-- constituencies: uq_constituencies_canonical_code on canonical_code (UNIQUE)
-- districts: districts_pkey on id (PRIMARY KEY)
-- districts: districts_code_key on code (UNIQUE)
-- districts: uq_districts_state_name on state_code, name (UNIQUE)
-- parliamentary_constituencies: parliamentary_constituencies_pkey on id (PRIMARY KEY)
-- parliamentary_constituencies: parliamentary_constituencies_code_key on code (UNIQUE)
-- parliamentary_constituencies: uq_pc_state_number on state_code, pc_number (UNIQUE)

-- ------------------------------------------------------------------------------
-- CHECK 4: Foreign Key Integrity & RESTRICT Rules
-- ------------------------------------------------------------------------------
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
  AND rc.unique_constraint_schema = ccu.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('districts', 'parliamentary_constituencies', 'constituencies', 'states')
  AND kcu.column_name IN ('state_code', 'parliamentary_constituency_id', 'district_id', 'primary_dataset_version_id')
ORDER BY tc.table_name, kcu.column_name;
-- EXPECTED: All delete_rule = 'RESTRICT' (Zero cascading deletions)

-- ------------------------------------------------------------------------------
-- CHECK 5: Index Catalog Verification
-- ------------------------------------------------------------------------------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('districts', 'parliamentary_constituencies', 'constituencies', 'states')
  AND indexname LIKE '%primary_version%'
ORDER BY tablename, indexname;
-- EXPECTED:
-- constituencies: idx_constituencies_primary_version
-- districts: idx_districts_primary_version
-- parliamentary_constituencies: idx_pcs_primary_version
-- states: idx_states_primary_version

-- ------------------------------------------------------------------------------
-- CHECK 6: Row Level Security Configuration
-- ------------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  p.polname AS policy_name,
  p.polcmd AS command,
  p.polroles::regrole[] AS roles
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('districts', 'parliamentary_constituencies')
ORDER BY c.relname, p.polname;
-- EXPECTED:
-- districts: rls_enabled = true; Public read districts (anon, authenticated); Service role full access on districts (service_role)
-- parliamentary_constituencies: rls_enabled = true; Public read parliamentary_constituencies (anon, authenticated); Service role full access on parliamentary_constituencies (service_role)

-- ------------------------------------------------------------------------------
-- CHECK 7: W012 Data Sources and Datasets Registration
-- ------------------------------------------------------------------------------
SELECT ds.id AS source_id, ds.authority_level, d.id AS dataset_id, d.domain
FROM public.data_sources ds
JOIN public.datasets d ON d.source_id = ds.id
WHERE d.domain = 'geography'
ORDER BY ds.id, d.id;
-- EXPECTED:
-- eci | constitutional | eci_delimitation_order_2008 | geography
-- mha_india | statutory | mha_state_reorganisation | geography
-- telangana_revenue_dept | statutory | ts_revenue_districts | geography

-- ------------------------------------------------------------------------------
-- CHECK 8: W012 Dataset Versions and Initial UNVERIFIED Status
-- ------------------------------------------------------------------------------
SELECT id, dataset_id, version_tag, effective_from, default_status, record_count
FROM public.dataset_versions
WHERE dataset_id IN ('mha_state_reorganisation', 'ts_revenue_districts', 'eci_delimitation_order_2008')
ORDER BY id;
-- EXPECTED:
-- eci_ts_ac_2008_v1 | eci_delimitation_order_2008 | 2008_delimitation_ac | 2008-02-19 | UNVERIFIED | 119
-- eci_ts_pc_2008_v1 | eci_delimitation_order_2008 | 2008_delimitation_pc | 2008-02-19 | UNVERIFIED | 17
-- mha_ts_2014_v1 | mha_state_reorganisation | 2014_act | 2014-06-02 | UNVERIFIED | 1
-- ts_districts_2016_v1 | ts_revenue_districts | 2016_reorganisation | 2016-10-11 | UNVERIFIED | 31
-- ts_districts_2019_additions_v1 | ts_revenue_districts | 2019_additions | 2019-02-16 | UNVERIFIED | 2
-- ts_districts_2019_composite_v1 | ts_revenue_districts | 2019_composite | 2019-02-16 | UNVERIFIED | 33
-- All default_status MUST be UNVERIFIED.

-- ------------------------------------------------------------------------------
-- CHECK 9: Pilot Entity Row Counts & FK Resolution
-- ------------------------------------------------------------------------------
SELECT
  'states_ts' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.states
WHERE code = 'TS'
UNION ALL
SELECT
  'districts_ts' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.districts
WHERE state_code = 'TS'
UNION ALL
SELECT
  'districts_2016_base' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.districts
WHERE state_code = 'TS' AND primary_dataset_version_id = 'ts_districts_2016_v1'
UNION ALL
SELECT
  'districts_2019_additions' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.districts
WHERE state_code = 'TS' AND primary_dataset_version_id = 'ts_districts_2019_additions_v1'
UNION ALL
SELECT
  'pcs_ts' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.parliamentary_constituencies
WHERE state_code = 'TS'
UNION ALL
SELECT
  'acs_ts' AS entity,
  COUNT(*) AS total_count,
  COUNT(primary_dataset_version_id) AS with_version_fk
FROM public.constituencies
WHERE state_code = 'TS'
UNION ALL
SELECT
  'acs_with_pc_and_district' AS entity,
  COUNT(*) AS total_count,
  COUNT(*) AS with_version_fk
FROM public.constituencies
WHERE state_code = 'TS'
  AND district_id IS NOT NULL
  AND parliamentary_constituency_id IS NOT NULL;
-- EXPECTED:
-- states_ts: 1, 1
-- districts_ts: 33, 33
-- districts_2016_base: 31, 31
-- districts_2019_additions: 2, 2
-- pcs_ts: 17, 17
-- acs_ts: 119, 119
-- acs_with_pc_and_district: 119, 119

-- ------------------------------------------------------------------------------
-- CHECK 10: W012 Record Provenance Linkages Resolution
-- ------------------------------------------------------------------------------
SELECT
  rpl.domain_table,
  pr.status,
  pr.dataset_version_id,
  COUNT(*) AS linkage_count
FROM public.record_provenance_linkages rpl
JOIN public.provenance_records pr ON pr.id = rpl.provenance_id
WHERE pr.dataset_version_id IN (
  'mha_ts_2014_v1',
  'ts_districts_2016_v1',
  'ts_districts_2019_additions_v1',
  'eci_ts_pc_2008_v1',
  'eci_ts_ac_2008_v1'
)
GROUP BY rpl.domain_table, pr.status, pr.dataset_version_id
ORDER BY rpl.domain_table, pr.dataset_version_id;
-- EXPECTED:
-- constituencies | UNVERIFIED | eci_ts_ac_2008_v1 | 119
-- districts | UNVERIFIED | ts_districts_2016_v1 | 31
-- districts | UNVERIFIED | ts_districts_2019_additions_v1 | 2
-- parliamentary_constituencies | UNVERIFIED | eci_ts_pc_2008_v1 | 17
-- states | UNVERIFIED | mha_ts_2014_v1 | 1
