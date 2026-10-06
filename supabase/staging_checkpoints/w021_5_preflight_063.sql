-- ==============================================================================
-- W021.5: Preflight Diagnostic Suite for Migration 063 (Strictly READ-ONLY)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- ==============================================================================

-- 1. elected_tenures population & status breakdown
SELECT
  'elected_tenures_population' AS diagnostic,
  count(*) AS total_rows,
  count(*) FILTER (WHERE is_current = true) AS is_current_true,
  count(*) FILTER (WHERE is_current = false) AS is_current_false,
  count(*) FILTER (WHERE is_current IS NULL) AS is_current_null,
  count(*) FILTER (WHERE term_start IS NULL) AS term_start_null,
  count(*) FILTER (WHERE term_end IS NULL) AS term_end_null,
  count(*) FILTER (WHERE is_current = true AND term_end < CURRENT_DATE) AS current_with_past_term_end,
  count(*) FILTER (WHERE is_current = false AND (term_end >= CURRENT_DATE OR term_end IS NULL)) AS completed_with_future_or_null_term_end,
  count(*) FILTER (WHERE term_end < term_start) AS chronological_violations
FROM public.elected_tenures;

-- 2. elected_tenures distinct jurisdiction_type breakdown
SELECT
  jurisdiction_type,
  count(*) AS row_count
FROM public.elected_tenures
GROUP BY jurisdiction_type
ORDER BY jurisdiction_type;

-- 3. tenure_vacancies existing table check
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'tenure_vacancies';

-- 4. National geography baselines pre-063
SELECT 'states' AS entity, count(*) AS count FROM public.states
UNION ALL
SELECT 'state_versions', count(*) FROM public.state_versions
UNION ALL
SELECT 'parliamentary_constituencies', count(*) FROM public.parliamentary_constituencies
UNION ALL
SELECT 'constituencies', count(*) FROM public.constituencies
UNION ALL
SELECT 'current_mappings', count(*) FROM public.constituency_parliamentary_mappings WHERE is_current = true
UNION ALL
SELECT 'total_mappings', count(*) FROM public.constituency_parliamentary_mappings;
