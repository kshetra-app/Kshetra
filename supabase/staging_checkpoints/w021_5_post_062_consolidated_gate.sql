-- ==============================================================================
-- W021.5: Post-062 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Dataset version and statutory evidence registration ──────────────
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'dataset version and evidence record registration' AS check_name,
    'dataset: ' || count(DISTINCT dv.id) || ', evidence: ' || count(DISTINCT er.id) AS actual_value,
    'dataset: 1, evidence: 1' AS expected_value,
    CASE 
      WHEN count(DISTINCT dv.id) = 1 AND count(DISTINCT er.id) = 1 THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Dataset version eci_national_ac_2023_as_v1 and evidence record a55a0023-0000-4000-8000-000000000001 active' AS details
  FROM public.dataset_versions dv
  FULL OUTER JOIN public.evidence_records er ON er.id = 'a55a0023-0000-4000-8000-000000000001'::uuid
  WHERE dv.id = 'eci_national_ac_2023_as_v1'
),

-- ─── CHECK 2: Assam parliamentary constituencies regime and version alignment ──
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'Assam PC statutory regime and 2023 version alignment' AS check_name,
    'pcs_aligned: ' || count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2023_as' AND valid_from = '2023-08-16'::date) || '/14' ||
    ', versions_linked: ' || count(*) FILTER (WHERE current_version_id IS NOT NULL) || '/14' AS actual_value,
    'pcs_aligned: 14/14, versions_linked: 14/14' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2023_as' AND valid_from = '2023-08-16'::date) = 14
       AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 14
       AND count(*) = 14
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'All 14 Assam PCs aligned to eci_delimitation_2023_as with valid_from 2023-08-16' AS details
  FROM public.parliamentary_constituencies
  WHERE state_code = 'AS'
),

-- ─── CHECK 3: Assam PC version history archiving and current versions ─────────
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'Assam PC version history (2008 archived, 2023 current)' AS check_name,
    'current_2023: ' || count(*) FILTER (WHERE version_code LIKE '%-2023' AND is_current = true AND valid_to IS NULL) || '/14' ||
    ', archived_2008: ' || count(*) FILTER (WHERE version_code LIKE '%-2008' AND is_current = false AND valid_to = '2023-08-16'::date) || '/14' AS actual_value,
    'current_2023: 14/14, archived_2008: 14/14' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE version_code LIKE '%-2023' AND is_current = true AND valid_to IS NULL) = 14
       AND count(*) FILTER (WHERE version_code LIKE '%-2008' AND is_current = false AND valid_to = '2023-08-16'::date) = 14
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    '14 current 2023 PC versions active; 14 historical 2008 PC versions archived with valid_to 2023-08-16' AS details
  FROM public.parliamentary_constituency_versions
  WHERE pc_id IN (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'AS')
),

-- ─── CHECK 4: Assam assembly constituencies regime and version alignment ──────
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'Assam AC statutory regime and 2023 version alignment' AS check_name,
    'acs_aligned: ' || count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2023_as' AND valid_from = '2023-08-16'::date) || '/126' ||
    ', versions_linked: ' || count(*) FILTER (WHERE current_version_id IS NOT NULL) || '/126' AS actual_value,
    'acs_aligned: 126/126, versions_linked: 126/126' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2023_as' AND valid_from = '2023-08-16'::date) = 126
       AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 126
       AND count(*) = 126
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'All 126 Assam ACs aligned to eci_delimitation_2023_as with 2023 current version linkages' AS details
  FROM public.constituencies
  WHERE state_code = 'AS'
),

-- ─── CHECK 5: Assam AC version history archiving and current versions ─────────
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'Assam AC version history (2008 archived, 2023 current)' AS check_name,
    'current_2023: ' || count(*) FILTER (WHERE version_code LIKE '%-2023' AND is_current = true AND valid_to IS NULL) || '/126' ||
    ', archived_2008: ' || count(*) FILTER (WHERE version_code LIKE '%-2008' AND is_current = false AND valid_to = '2023-08-16'::date) || '/126' AS actual_value,
    'current_2023: 126/126, archived_2008: 126/126' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE version_code LIKE '%-2023' AND is_current = true AND valid_to IS NULL) = 126
       AND count(*) FILTER (WHERE version_code LIKE '%-2008' AND is_current = false AND valid_to = '2023-08-16'::date) = 126
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    '126 current 2023 AC versions active; 126 historical 2008 AC versions archived with valid_to 2023-08-16' AS details
  FROM public.constituency_versions
  WHERE constituency_internal_id IN (SELECT internal_id FROM public.constituencies WHERE state_code = 'AS')
),

-- ─── CHECK 6: Assam AC <-> PC mappings archiving and 2023 deployment ──────────
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'Assam AC-PC mappings transition (2008 archived, 2023 current)' AS check_name,
    'current_2023_mappings: ' || count(*) FILTER (WHERE cpm.delimitation_regime_id = 'eci_delimitation_2023_as' AND cpm.is_current = true AND cpm.effective_from = '2023-08-16'::date AND cpm.effective_to IS NULL) || '/126' ||
    ', archived_2008_mappings: ' || count(*) FILTER (WHERE cpm.delimitation_regime_id = 'eci_delimitation_2008' AND cpm.is_current = false AND cpm.effective_to = '2023-08-16'::date) || '/126' AS actual_value,
    'current_2023_mappings: 126/126, archived_2008_mappings: 126/126' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE cpm.delimitation_regime_id = 'eci_delimitation_2023_as' AND cpm.is_current = true AND cpm.effective_from = '2023-08-16'::date AND cpm.effective_to IS NULL) = 126
       AND count(*) FILTER (WHERE cpm.delimitation_regime_id = 'eci_delimitation_2008' AND cpm.is_current = false AND cpm.effective_to = '2023-08-16'::date) = 126
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    '126 new 2023 mappings active under eci_delimitation_2023_as; 126 historical 2008 mappings archived with effective_to 2023-08-16' AS details
  FROM public.constituency_parliamentary_mappings cpm
  JOIN public.constituency_versions cv ON cpm.assembly_constituency_version_id = cv.id
  JOIN public.constituencies c ON cv.constituency_internal_id = c.internal_id
  WHERE c.state_code = 'AS'
),

-- ─── CHECK 7: Single current PC mapping per current AC version nationally ─────
check_7_violations AS (
  SELECT cv.id, count(cpm.id) AS mapping_count
  FROM public.constituency_versions cv
  LEFT JOIN public.constituency_parliamentary_mappings cpm 
    ON cv.id = cpm.assembly_constituency_version_id AND cpm.is_current = true
  WHERE cv.is_current = true
  GROUP BY cv.id
  HAVING count(cpm.id) <> 1
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'single current PC mapping per current AC version invariant' AS check_name,
    'violations: ' || count(*)::text AS actual_value,
    'violations: 0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Every current AC version nationally maps to strictly one current PC (4,123 / 4,123 with 0 violations)'
      ELSE 'FAIL: ' || count(*) || ' current AC versions violate the single-current-PC mapping invariant'
    END AS details
  FROM check_7_violations
),

-- ─── CHECK 8: National AC <-> PC mappings total count (4,123 current + 126 archived = 4,249) ──
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'national AC-PC mappings total and current counts' AS check_name,
    'current: ' || count(*) FILTER (WHERE is_current = true) ||
    ', archived: ' || count(*) FILTER (WHERE is_current = false) ||
    ', total: ' || count(*) AS actual_value,
    'current: 4123, archived: 126, total: 4249' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE is_current = true) = 4123
       AND count(*) FILTER (WHERE is_current = false) = 126
       AND count(*) = 4249
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'Exactly 4,123 current national mappings preserved; exactly 126 historical 2008 Assam mappings archived (4,249 total)' AS details
  FROM public.constituency_parliamentary_mappings
),

-- ─── CHECK 9: Statutory provenance linkage for Assam 2023 entities ────────────
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'statutory provenance linkages for Assam 2023 entities' AS check_name,
    'acs_linked: ' || count(*) FILTER (WHERE domain_table = 'constituencies') || '/126' ||
    ', pcs_linked: ' || count(*) FILTER (WHERE domain_table = 'parliamentary_constituencies') || '/14' AS actual_value,
    'acs_linked: 126/126, pcs_linked: 14/14' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE domain_table = 'constituencies') = 126
       AND count(*) FILTER (WHERE domain_table = 'parliamentary_constituencies') = 14
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'All 126 Assam ACs and 14 Assam PCs linked to statutory evidence record a55a0023-0000-4000-8000-000000000001' AS details
  FROM public.record_provenance_linkages
  WHERE provenance_id = 'a55a0023-0000-4000-8000-000000000001'::uuid
),

-- ─── CHECK 10: Preserved national baselines (states, PCs, ACs) ────────────────
check_10_counts AS (
  SELECT 'states' AS entity, count(*) AS actual, 36 AS expected FROM public.states
  UNION ALL
  SELECT 'state_versions', count(*), 36 FROM public.state_versions
  UNION ALL
  SELECT 'parliamentary_constituencies', count(*), 543 FROM public.parliamentary_constituencies
  UNION ALL
  SELECT 'constituencies', count(*), 4123 FROM public.constituencies
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'preserved national geography baselines' AS check_name,
    'states: ' || max(CASE WHEN entity = 'states' THEN actual END) ||
    ', state_versions: ' || max(CASE WHEN entity = 'state_versions' THEN actual END) ||
    ', pcs: ' || max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) ||
    ', acs: ' || max(CASE WHEN entity = 'constituencies' THEN actual END) AS actual_value,
    'states: 36, state_versions: 36, pcs: 543, acs: 4123' AS expected_value,
    CASE 
      WHEN max(CASE WHEN entity = 'states' THEN actual END) = 36
       AND max(CASE WHEN entity = 'state_versions' THEN actual END) = 36
       AND max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) = 543
       AND max(CASE WHEN entity = 'constituencies' THEN actual END) = 4123
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'National geography baselines intact: 36 states, 36 versions, 543 PCs, 4,123 ACs' AS details
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
