-- ==============================================================================
-- W021.5: Post-059-R1 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: public.states DDL (updated_at absent) ───────────────────────────
check_1_cte AS (
  SELECT
    'check_1' AS check_id,
    'public.states updated_at column absent' AS check_name,
    count(*)::text AS actual_value,
    '0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Column updated_at is absent from public.states as required by DDL'
      ELSE 'FAIL: updated_at column exists in public.states'
    END AS details
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'states' 
    AND column_name = 'updated_at'
),

-- ─── CHECK 2: Core relation row counts ────────────────────────────────────────
check_2_counts AS (
  SELECT 'states' AS table_name, count(*) AS actual_count, 36 AS expected_count FROM public.states
  UNION ALL
  SELECT 'state_versions', count(*), 36 FROM public.state_versions
  UNION ALL
  SELECT 'parliamentary_constituencies', count(*), 543 FROM public.parliamentary_constituencies
  UNION ALL
  SELECT 'parliamentary_constituency_versions', count(*), 543 FROM public.parliamentary_constituency_versions
  UNION ALL
  SELECT 'constituencies', count(*), 4123 FROM public.constituencies
  UNION ALL
  SELECT 'constituency_versions', count(*), 4123 FROM public.constituency_versions
  UNION ALL
  SELECT 'migration_conflicts', count(*), 3 FROM public.migration_conflicts
  UNION ALL
  SELECT 'dataset_versions (059 registered)', count(*), 3 FROM public.dataset_versions 
  WHERE id IN ('mha_national_jurisdictions_2024_v1', 'eci_national_pc_2008_v1', 'eci_national_ac_2008_v1')
),
check_2_cte AS (
  SELECT
    'check_2.' || row_number() OVER () AS check_id,
    'row count: ' || table_name AS check_name,
    actual_count::text AS actual_value,
    expected_count::text AS expected_value,
    CASE WHEN actual_count = expected_count THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.' || table_name || ' count: actual ' || actual_count || ', expected ' || expected_count AS details
  FROM check_2_counts
),

-- ─── CHECK 3: Telangana temporal reconciliation ──────────────────────────────
check_3_cte AS (
  SELECT
    'check_3' AS check_id,
    'Telangana temporal reconciliation' AS check_name,
    'TS-2014: ' || count(*) FILTER (WHERE version_code = 'TS-STATE-2014' AND valid_from = '2014-06-02'::date AND valid_to IS NULL AND is_current = true) ||
    ', TS-2008: ' || count(*) FILTER (WHERE version_code = 'TS-STATE-2008') AS actual_value,
    'TS-2014: 1, TS-2008: 0' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE version_code = 'TS-STATE-2014' AND valid_from = '2014-06-02'::date AND valid_to IS NULL AND is_current = true) = 1
       AND count(*) FILTER (WHERE version_code = 'TS-STATE-2008') = 0
       AND count(*) = 1
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN count(*) FILTER (WHERE version_code = 'TS-STATE-2014' AND valid_from = '2014-06-02'::date AND valid_to IS NULL AND is_current = true) = 1
       AND count(*) FILTER (WHERE version_code = 'TS-STATE-2008') = 0
       AND count(*) = 1
      THEN 'TS-STATE-2014 preserved [2014-06-02, null) is_current=true; TS-STATE-2008 correctly omitted'
      ELSE 'FAIL: Telangana temporal version state mismatch'
    END AS details
  FROM public.state_versions
  WHERE state_code = 'TS'
),

-- ─── CHECK 4: Temporal overlaps (uq_state_versions_no_overlap) ────────────────
check_4_overlaps AS (
  SELECT sv1.state_code
  FROM public.state_versions sv1
  JOIN public.state_versions sv2 
    ON sv1.state_code = sv2.state_code 
   AND sv1.id <> sv2.id
   AND daterange(sv1.valid_from, sv1.valid_to, '[)') && daterange(sv2.valid_from, sv2.valid_to, '[)')
),
check_4_cte AS (
  SELECT
    'check_4' AS check_id,
    'temporal range overlaps in state_versions' AS check_name,
    count(*)::text AS actual_value,
    '0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Zero overlapping daterange([valid_from, valid_to)) across all jurisdictions'
      ELSE 'FAIL: ' || count(*) || ' overlapping temporal ranges detected in state_versions'
    END AS details
  FROM check_4_overlaps
),

-- ─── CHECK 5: Single current version per jurisdiction ─────────────────────────
check_5_violations AS (
  SELECT s.code, count(sv.id) AS current_count
  FROM public.states s
  LEFT JOIN public.state_versions sv ON s.code = sv.state_code AND sv.is_current = true
  GROUP BY s.code
  HAVING count(sv.id) <> 1
),
check_5_cte AS (
  SELECT
    'check_5' AS check_id,
    'single current version per jurisdiction' AS check_name,
    'violations: ' || count(*)::text AS actual_value,
    'violations: 0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'All 36 jurisdictions have strictly one is_current=true version record'
      ELSE 'FAIL: ' || count(*) || ' jurisdictions violate the single current version invariant'
    END AS details
  FROM check_5_violations
),

-- ─── CHECK 6: All 36 states current_version_id FK linkage ─────────────────────
check_6_cte AS (
  SELECT
    'check_6' AS check_id,
    'states current_version_id FK linkages' AS check_name,
    'unlinked: ' || count(*) FILTER (WHERE s.current_version_id IS NULL) ||
    ', invalid: ' || count(*) FILTER (WHERE sv.id IS NULL AND s.current_version_id IS NOT NULL) AS actual_value,
    'unlinked: 0, invalid: 0' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE s.current_version_id IS NULL) = 0
       AND count(*) FILTER (WHERE sv.id IS NULL AND s.current_version_id IS NOT NULL) = 0
       AND count(*) = 36
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN count(*) FILTER (WHERE s.current_version_id IS NULL) = 0
       AND count(*) FILTER (WHERE sv.id IS NULL AND s.current_version_id IS NOT NULL) = 0
       AND count(*) = 36
      THEN 'All 36 states have valid non-null FK linkages to state_versions'
      ELSE 'FAIL: States contain missing or invalid current_version_id linkages'
    END AS details
  FROM public.states s
  LEFT JOIN public.state_versions sv ON s.current_version_id = sv.id
),

-- ─── CHECK 7: National parliamentary constituency summary (543 PCs) ───────────
check_7_cte AS (
  SELECT
    'check_7' AS check_id,
    'parliamentary constituencies national summary' AS check_name,
    'total: ' || count(*) ||
    ', unique_codes: ' || count(DISTINCT code) ||
    ', states: ' || count(DISTINCT state_code) ||
    ', linked: ' || count(*) FILTER (WHERE current_version_id IS NOT NULL) AS actual_value,
    'total: 543, unique_codes: 543, states: 36, linked: 543' AS expected_value,
    CASE 
      WHEN count(*) = 543 
       AND count(DISTINCT code) = 543 
       AND count(DISTINCT state_code) = 36 
       AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 543
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'National PC registry: 543 PCs across 36 States/UTs with 100% version linkages' AS details
  FROM public.parliamentary_constituencies
),

-- ─── CHECK 8: National assembly constituency summary (4,123 ACs) ───────────────
check_8_cte AS (
  SELECT
    'check_8' AS check_id,
    'assembly constituencies national summary' AS check_name,
    'total: ' || count(*) ||
    ', unique_ids: ' || count(DISTINCT id) ||
    ', unique_canonical: ' || count(DISTINCT canonical_code) ||
    ', states: ' || count(DISTINCT state_code) ||
    ', linked: ' || count(*) FILTER (WHERE current_version_id IS NOT NULL) AS actual_value,
    'total: 4123, unique_ids: 4123, unique_canonical: 4123, states: 31, linked: 4123' AS expected_value,
    CASE 
      WHEN count(*) = 4123 
       AND count(DISTINCT id) = 4123 
       AND count(DISTINCT canonical_code) = 4123 
       AND count(DISTINCT state_code) = 31 
       AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 4123
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'National AC registry: 4,123 ACs across 31 States/UTs with assemblies with 100% version linkages' AS details
  FROM public.constituencies
),

-- ─── CHECK 9: Statutory record provenance linkages ───────────────────────────
check_9_cte AS (
  SELECT
    'check_9' AS check_id,
    'statutory provenance linkages' AS check_name,
    'states: ' || count(*) FILTER (WHERE domain_table = 'states') ||
    ', pcs: ' || count(*) FILTER (WHERE domain_table = 'parliamentary_constituencies') ||
    ', acs: ' || count(*) FILTER (WHERE domain_table = 'constituencies') AS actual_value,
    'states: 36, pcs: 543, acs: 4123' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE domain_table = 'states') = 36
       AND count(*) FILTER (WHERE domain_table = 'parliamentary_constituencies') = 543
       AND count(*) FILTER (WHERE domain_table = 'constituencies') = 4123
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'Statutory provenance links: 36 states, 543 PCs, 4,123 ACs mapped to ECI/MHA statutory datasets' AS details
  FROM public.record_provenance_linkages
  WHERE provenance_id IN (
    '00000000-0000-0000-0013-000000000001'::uuid,
    '00000000-0000-0000-0013-000000000004'::uuid,
    '00000000-0000-0000-0013-000000000005'::uuid
  )
),

-- ─── CHECK 10: Migration conflicts resolution audit ───────────────────────────
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'migration conflicts resolved' AS check_name,
    'resolved: ' || count(*) FILTER (WHERE status = 'RESOLVED' AND source_record_id IN ('LS_Aurangabad_BR', 'LS_Hamirpur_HP', 'LS_Maharajganj_UP')) || '/3' AS actual_value,
    'resolved: 3/3' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE status = 'RESOLVED' AND source_record_id IN ('LS_Aurangabad_BR', 'LS_Hamirpur_HP', 'LS_Maharajganj_UP')) = 3
       AND count(*) = 3
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'All 3 World A legacy seed anomalies registered and marked RESOLVED per ECI 2008 order' AS details
  FROM public.migration_conflicts
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
