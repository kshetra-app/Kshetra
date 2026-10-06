-- ==============================================================================
-- W021.5: Post-063 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Table person_multilingual_identities exists ────────────────────
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'person_multilingual_identities table exists' AS check_name,
    'table_exists: ' || count(*) AS actual_value,
    'table_exists: 1' AS expected_value,
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.person_multilingual_identities successfully registered in public schema' AS details
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities'
),

-- ─── CHECK 2: Table tenure_vacancies exists ──────────────────────────────────
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'tenure_vacancies table exists' AS check_name,
    'table_exists: ' || count(*) AS actual_value,
    'table_exists: 1' AS expected_value,
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.tenure_vacancies successfully registered in public schema' AS details
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'tenure_vacancies'
),

-- ─── CHECK 3: person_multilingual_identities column structure & types ─────────
check_3_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'person_multilingual_identities'
    AND column_name IN (
      'id', 'person_id', 'language_code', 'script_code',
      'representation_type', 'representation_value', 'is_preferred',
      'is_official', 'valid_from', 'valid_to', 'source',
      'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'person_multilingual_identities column schema completeness' AS check_name,
    'columns: ' || count(*) || '/15' AS actual_value,
    'columns: 15/15' AS expected_value,
    CASE WHEN count(*) = 15 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 15 expected columns present in person_multilingual_identities' AS details
  FROM check_3_cols
),

-- ─── CHECK 4: tenure_vacancies column structure & types ───────────────────────
check_4_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'tenure_vacancies'
    AND column_name IN (
      'id', 'tenure_id', 'person_id', 'vacancy_reason',
      'effective_date', 'notifying_authority', 'gazette_notification_ref',
      'notes', 'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'tenure_vacancies column schema completeness' AS check_name,
    'columns: ' || count(*) || '/12' AS actual_value,
    'columns: 12/12' AS expected_value,
    CASE WHEN count(*) = 12 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 12 expected columns present in tenure_vacancies' AS details
  FROM check_4_cols
),

-- ─── CHECK 5: elected_tenures tenure_status column added with ACTIVE default ──
check_5_col AS (
  SELECT column_name, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'elected_tenures' 
    AND column_name = 'tenure_status'
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'elected_tenures tenure_status column definition' AS check_name,
    'col_exists: ' || count(*) || ', default_has_active: ' || count(*) FILTER (WHERE column_default LIKE '%ACTIVE%') AS actual_value,
    'col_exists: 1, default_has_active: 1' AS expected_value,
    CASE 
      WHEN count(*) = 1 AND count(*) FILTER (WHERE column_default LIKE '%ACTIVE%') = 1 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Column tenure_status added to public.elected_tenures with default ACTIVE' AS details
  FROM check_5_col
),

-- ─── CHECK 6: elected_tenures jurisdiction_type expanded check constraint ─────
check_6_cc AS (
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.elected_tenures'::regclass
    AND c.conname = 'elected_tenures_jurisdiction_type_check'
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'elected_tenures jurisdiction_type includes state & nominated' AS check_name,
    'has_state: ' || count(*) FILTER (WHERE def LIKE '%''state''%') ||
    ', has_nominated: ' || count(*) FILTER (WHERE def LIKE '%''nominated''%') AS actual_value,
    'has_state: 1, has_nominated: 1' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE def LIKE '%''state''%') = 1 
       AND count(*) FILTER (WHERE def LIKE '%''nominated''%') = 1 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'elected_tenures_jurisdiction_type_check expanded to include state and nominated' AS details
  FROM check_6_cc
),

-- ─── CHECK 7: RLS enabled on both new foundation tables ───────────────────────
check_7_rls AS (
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND relname IN ('person_multilingual_identities', 'tenure_vacancies')
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'Row Level Security enabled on 063 foundation tables' AS check_name,
    'rls_enabled: ' || count(*) FILTER (WHERE relrowsecurity = true) || '/2' AS actual_value,
    'rls_enabled: 2/2' AS expected_value,
    CASE WHEN count(*) FILTER (WHERE relrowsecurity = true) = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    'RLS actively enabled on both person_multilingual_identities and tenure_vacancies' AS details
  FROM check_7_rls
),

-- ─── CHECK 8: Public SELECT policies deployed on both tables ──────────────────
check_8_policies AS (
  SELECT policyname, tablename
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('person_multilingual_identities', 'tenure_vacancies')
    AND policyname IN ('p_select_person_multilingual_identities', 'p_select_tenure_vacancies')
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'public read RLS policies deployed' AS check_name,
    'policies_present: ' || count(*) || '/2' AS actual_value,
    'policies_present: 2/2' AS expected_value,
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    'p_select_person_multilingual_identities and p_select_tenure_vacancies present' AS details
  FROM check_8_policies
),

-- ─── CHECK 9: Foreign key relationships correctly configured ───────────────────
check_9_fks AS (
  SELECT c.conname
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public'
    AND c.contype = 'f'
    AND c.conrelid IN (
      'public.person_multilingual_identities'::regclass,
      'public.tenure_vacancies'::regclass
    )
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'foreign key constraints on new tables' AS check_name,
    'fk_count: ' || count(*) AS actual_value,
    'fk_count: >= 4' AS expected_value,
    CASE WHEN count(*) >= 4 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Foreign keys to canonical_persons, elected_tenures, and provenance_records active' AS details
  FROM check_9_fks
),

-- ─── CHECK 10: Preserved national baselines (states, PCs, ACs, mappings) ──────
check_10_counts AS (
  SELECT 'states' AS entity, count(*) AS actual, 36 AS expected FROM public.states
  UNION ALL
  SELECT 'state_versions', count(*), 36 FROM public.state_versions
  UNION ALL
  SELECT 'parliamentary_constituencies', count(*), 543 FROM public.parliamentary_constituencies
  UNION ALL
  SELECT 'parliamentary_constituency_versions', count(*), 557 FROM public.parliamentary_constituency_versions
  UNION ALL
  SELECT 'constituencies', count(*), 4123 FROM public.constituencies
  UNION ALL
  SELECT 'constituency_versions', count(*), 4249 FROM public.constituency_versions
  UNION ALL
  SELECT 'constituency_parliamentary_mappings', count(*), 4249 FROM public.constituency_parliamentary_mappings
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'preserved national geography and mapping baselines' AS check_name,
    'states: ' || max(CASE WHEN entity = 'states' THEN actual END) ||
    ', pcs: ' || max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) ||
    ', acs: ' || max(CASE WHEN entity = 'constituencies' THEN actual END) ||
    ', mappings: ' || max(CASE WHEN entity = 'constituency_parliamentary_mappings' THEN actual END) AS actual_value,
    'states: 36, pcs: 543, acs: 4123, mappings: 4249' AS expected_value,
    CASE 
      WHEN max(CASE WHEN entity = 'states' THEN actual END) = 36
       AND max(CASE WHEN entity = 'state_versions' THEN actual END) = 36
       AND max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) = 543
       AND max(CASE WHEN entity = 'parliamentary_constituency_versions' THEN actual END) = 557
       AND max(CASE WHEN entity = 'constituencies' THEN actual END) = 4123
       AND max(CASE WHEN entity = 'constituency_versions' THEN actual END) = 4249
       AND max(CASE WHEN entity = 'constituency_parliamentary_mappings' THEN actual END) = 4249
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'National baselines completely intact: 36 states, 543 PCs (557 versions), 4,123 ACs (4,249 versions), 4,249 mappings' AS details
  FROM check_10_counts
)

-- ─── CONSOLIDATED UNIFIED RESULT SET ──────────────────────────────────────────
SELECT * FROM check_1_cte
UNION ALL
SELECT * FROM check_2_cte
UNION ALL
SELECT * FROM check_3_cte
UNION ALL
SELECT * FROM check_4_cte
UNION ALL
SELECT * FROM check_5_cte
UNION ALL
SELECT * FROM check_6_cte
UNION ALL
SELECT * FROM check_7_cte
UNION ALL
SELECT * FROM check_8_cte
UNION ALL
SELECT * FROM check_9_cte
UNION ALL
SELECT * FROM check_10_cte
ORDER BY check_id;
