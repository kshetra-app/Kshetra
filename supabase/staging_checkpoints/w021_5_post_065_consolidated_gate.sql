-- ==============================================================================
-- W021.5: Post-065 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Provenance Record Anchor Completeness ───────────────────────────
check_1_data AS (
  SELECT count(*) AS prov_count
  FROM public.provenance_records
  WHERE id = '0215b22c-0000-0000-0000-000000000001'::uuid
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'provenance_records anchor presence for W021.5-B2.2-C batch' AS check_name,
    'anchor_count: ' || prov_count || '/1' AS actual_value,
    'anchor_count: 1/1' AS expected_value,
    CASE WHEN prov_count = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Batch provenance anchor 0215b22c-0000-0000-0000-000000000001 verified' AS details
  FROM check_1_data
),

-- ─── CHECK 2: Canonical Political Organizations Row Count ────────────────────
check_2_data AS (
  SELECT 
    count(*) AS total_orgs,
    count(*) FILTER (WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_orgs
  FROM public.political_organizations
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'political_organizations canonical registry row count' AS check_name,
    'batch_orgs: ' || batch_orgs || ', total_orgs: ' || total_orgs AS actual_value,
    'batch_orgs: 107, total_orgs: >=107' AS expected_value,
    CASE WHEN batch_orgs = 107 AND total_orgs >= 107 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 107 canonical organizations registered under batch provenance' AS details
  FROM check_2_data
),

-- ─── CHECK 3: Organization Relationships Row Count & Types ────────────────────
check_3_data AS (
  SELECT 
    count(*) AS total_rels,
    count(*) FILTER (WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_rels,
    count(DISTINCT relationship_type) AS rel_types
  FROM public.organization_relationships
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'organization_relationships lineage row count and taxonomy' AS check_name,
    'batch_rels: ' || batch_rels || ', rel_types: ' || rel_types AS actual_value,
    'batch_rels: 10, rel_types: >=3' AS expected_value,
    CASE WHEN batch_rels = 10 AND rel_types >= 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 10 lineage relationships registered (splits, renamings, mergers)' AS details
  FROM check_3_data
),

-- ─── CHECK 4: Organization Multilingual Names Row Count & Languages ───────────
check_4_data AS (
  SELECT 
    count(*) AS total_multi,
    count(*) FILTER (WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_multi,
    count(DISTINCT language_code) AS lang_count
  FROM public.organization_multilingual_names
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'organization_multilingual_names row count and language breadth' AS check_name,
    'batch_multi: ' || batch_multi || ', lang_count: ' || lang_count AS actual_value,
    'batch_multi: 27, lang_count: >=9' AS expected_value,
    CASE WHEN batch_multi = 27 AND lang_count >= 9 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 27 multilingual identities populated across major Indian languages' AS details
  FROM check_4_data
),

-- ─── CHECK 5: Organization Symbols Row Count & Active Exclusivity ─────────────
check_5_data AS (
  SELECT 
    count(*) AS total_syms,
    count(*) FILTER (WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_syms,
    count(*) FILTER (WHERE is_current = true) AS active_syms
  FROM public.organization_symbols
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'organization_symbols statutory symbols row count and status' AS check_name,
    'batch_syms: ' || batch_syms || ', active_syms: ' || active_syms AS actual_value,
    'batch_syms: 19, active_syms: 16' AS expected_value,
    CASE WHEN batch_syms = 19 AND active_syms = 16 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 19 statutory symbols registered with 16 active and 3 historical symbols' AS details
  FROM check_5_data
),

-- ─── CHECK 6: Organization Aliases Row Count & Completeness ───────────────────
check_6_data AS (
  SELECT 
    count(*) AS total_aliases,
    count(*) FILTER (WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_aliases,
    count(DISTINCT organization_id) AS distinct_orgs
  FROM public.organization_aliases
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'organization_aliases deterministic alias registry row count' AS check_name,
    'batch_aliases: ' || batch_aliases || ', distinct_orgs: ' || distinct_orgs AS actual_value,
    'batch_aliases: 1043, distinct_orgs: 107' AS expected_value,
    CASE WHEN batch_aliases = 1043 AND distinct_orgs = 107 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 1,043 aliases registered covering all 107 canonical organizations' AS details
  FROM check_6_data
),

-- ─── CHECK 7: Batch Total Registry Rows Inserted (Exactly 1,207) ───────────────
check_7_data AS (
  SELECT
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22c-0000-0000-0000-000000000001'::uuid) +
    (SELECT count(*) FROM public.political_organizations WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) +
    (SELECT count(*) FROM public.organization_relationships WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) +
    (SELECT count(*) FROM public.organization_multilingual_names WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) +
    (SELECT count(*) FROM public.organization_symbols WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) +
    (SELECT count(*) FROM public.organization_aliases WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS total_batch_rows
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'total database records under W021.5-B2.2-C batch provenance (1,207 rows)' AS check_name,
    'total_batch_rows: ' || total_batch_rows || '/1207' AS actual_value,
    'total_batch_rows: 1207/1207' AS expected_value,
    CASE WHEN total_batch_rows = 1207 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exact 1,207 authoritative records verified: C0(1) + C1(107) + C2(10) + C3(27) + C4(19) + C5(1043)' AS details
  FROM check_7_data
),

-- ─── CHECK 8: Zero Synthetic Independent Leakage in Canonical Tables ──────────
check_8_data AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations WHERE id ILIKE '%indep%' OR name ILIKE '%indep%' OR (ec_party_code IS NOT NULL AND ec_party_code ILIKE '%indep%')) AS synth_orgs,
    (SELECT count(*) FROM public.organization_aliases WHERE organization_id ILIKE '%indep%') AS synth_aliases
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'complete prohibition of synthetic independent entities across registries' AS check_name,
    'synth_orgs: ' || synth_orgs || ', synth_aliases: ' || synth_aliases AS actual_value,
    'synth_orgs: 0, synth_aliases: 0' AS expected_value,
    CASE WHEN synth_orgs = 0 AND synth_aliases = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Zero synthetic independent entries in political_organizations or organization_aliases' AS details
  FROM check_8_data
),

-- ─── CHECK 9: Row-Level Security Enabled on Populated Child Tables ───────────
check_9_data AS (
  SELECT count(*) AS rls_enabled_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('organization_multilingual_names', 'organization_symbols', 'organization_aliases')
    AND c.relrowsecurity = true
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'row level security enabled on political organization registry child tables' AS check_name,
    'rls_enabled_tables: ' || rls_enabled_tables || '/3' AS actual_value,
    'rls_enabled_tables: 3/3' AS expected_value,
    CASE WHEN rls_enabled_tables = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    'RLS actively enabled on organization_multilingual_names, organization_symbols, and organization_aliases' AS details
  FROM check_9_data
),

-- ─── CHECK 10: Consolidated Aggregate Verdict ─────────────────────────────────
check_1_to_9_union AS (
  SELECT status FROM check_1_cte
  UNION ALL SELECT status FROM check_2_cte
  UNION ALL SELECT status FROM check_3_cte
  UNION ALL SELECT status FROM check_4_cte
  UNION ALL SELECT status FROM check_5_cte
  UNION ALL SELECT status FROM check_6_cte
  UNION ALL SELECT status FROM check_7_cte
  UNION ALL SELECT status FROM check_8_cte
  UNION ALL SELECT status FROM check_9_cte
),
check_10_aggregate AS (
  SELECT
    count(*) AS total_checks,
    count(*) FILTER (WHERE status = 'PASS') AS passed_checks,
    count(*) FILTER (WHERE status <> 'PASS') AS failed_checks
  FROM check_1_to_9_union
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'post-065 consolidated gate aggregate verdict (checks 01-09 all pass)' AS check_name,
    'passed: ' || passed_checks || '/' || total_checks || ' (failed: ' || failed_checks || ')' AS actual_value,
    'passed: 9/9 (failed: 0)' AS expected_value,
    CASE 
      WHEN passed_checks = 9 AND failed_checks = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    CASE 
      WHEN passed_checks = 9 AND failed_checks = 0 
      THEN 'POST_065_PASS: All 9 canonical organization registry and child integrity gates PASSED' 
      ELSE 'POST_065_FAIL: One or more checks failed verification' 
    END AS details
  FROM check_10_aggregate
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
