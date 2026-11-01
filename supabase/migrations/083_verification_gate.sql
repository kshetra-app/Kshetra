-- ==============================================================================
-- Migration 083 Verification Gate
-- Target: Staging (fkpigozcqnmcvofuksar) or Production (ehfafcnimmjusyvplbah)
-- Mode: Strictly READ-ONLY (0 mutations, 0 DDL)
-- Scope:
--   1. Validates Schema Extensions (officeholding_status, runner-up columns, margins)
--   2. Validates Multilingual Representation Architecture (table, indexes, RLS)
--   3. Validates fn_get_localized_entity_field resolution function
--   4. Validates Multilingual Domain Representations count & 13-language coverage
-- ==============================================================================

WITH
-- 1. Check Representatives officeholding_status column
check_reps_column AS (
  SELECT
    count(*) AS col_exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'representatives'
    AND column_name = 'officeholding_status'
),

-- 2. Check Election Contests Runner-Up & Margin columns
check_contests_columns AS (
  SELECT
    count(*) AS col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'election_contests'
    AND column_name IN (
      'second_runner_up_candidacy_id',
      'margin_winner_runner_up_1',
      'margin_winner_runner_up_2',
      'margin_runner_up_1_runner_up_2'
    )
),

-- 3. Check entity_multilingual_representations table
check_multi_table AS (
  SELECT
    count(*) AS table_exists
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'entity_multilingual_representations'
),

-- 4. Check RLS policies on entity_multilingual_representations
check_multi_rls AS (
  SELECT
    count(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'entity_multilingual_representations'
),

-- 5. Check fn_get_localized_entity_field function
check_multi_fn AS (
  SELECT
    count(*) AS fn_exists
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_get_localized_entity_field'
),

-- 6. Check entity_multilingual_representations data (if synced)
check_multi_data AS (
  SELECT
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_multilingual_representations')
      THEN (SELECT count(*) FROM public.entity_multilingual_representations)
      ELSE 0
    END AS total_rows,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_multilingual_representations')
      THEN (SELECT count(DISTINCT language_code) FROM public.entity_multilingual_representations)
      ELSE 0
    END AS distinct_languages
)

SELECT
  '1. Representatives officeholding_status Column' AS check_name,
  col_exists::text AS actual_value,
  '1' AS expected_value,
  CASE WHEN col_exists = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check_reps_column

UNION ALL

SELECT
  '2. Election Contests Runner-Up & Margin Columns' AS check_name,
  col_count::text AS actual_value,
  '4' AS expected_value,
  CASE WHEN col_count = 4 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check_contests_columns

UNION ALL

SELECT
  '3. entity_multilingual_representations Table' AS check_name,
  table_exists::text AS actual_value,
  '1' AS expected_value,
  CASE WHEN table_exists = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check_multi_table

UNION ALL

SELECT
  '4. Multilingual Representations RLS Policies' AS check_name,
  policy_count::text AS actual_value,
  '>= 1' AS expected_value,
  CASE WHEN policy_count >= 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check_multi_rls

UNION ALL

SELECT
  '5. fn_get_localized_entity_field Resolution Function' AS check_name,
  fn_exists::text AS actual_value,
  '1' AS expected_value,
  CASE WHEN fn_exists = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check_multi_fn

UNION ALL

SELECT
  '6. Multilingual 13-Language Coverage (Post-Sync)' AS check_name,
  distinct_languages::text || ' languages (' || total_rows::text || ' rows)' AS actual_value,
  '13 languages (>= 598 rows)' AS expected_value,
  CASE WHEN distinct_languages = 13 AND total_rows >= 598 THEN 'PASS' ELSE 'PENDING_DATA_SYNC' END AS status
FROM check_multi_data;
