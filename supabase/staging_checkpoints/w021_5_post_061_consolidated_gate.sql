-- ==============================================================================
-- W021.5: Post-061 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Extension btree_gist installed ──────────────────────────────────
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'extension btree_gist installed' AS check_name,
    'installed: ' || count(*)::text AS actual_value,
    'installed: 1' AS expected_value,
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Extension btree_gist is active in database' AS details
  FROM pg_extension
  WHERE extname = 'btree_gist'
),

-- ─── CHECK 2: Temporal exclusion and check constraints on mappings ────────────
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'cpm temporal constraints (uq_cpm_no_temporal_overlap, chk_cpm_dates)' AS check_name,
    'chk_cpm_dates: ' || count(*) FILTER (WHERE conname = 'chk_cpm_dates') ||
    ', uq_cpm_no_temporal_overlap: ' || count(*) FILTER (WHERE conname = 'uq_cpm_no_temporal_overlap') AS actual_value,
    'chk_cpm_dates: 1, uq_cpm_no_temporal_overlap: 1' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE conname = 'chk_cpm_dates') = 1
       AND count(*) FILTER (WHERE conname = 'uq_cpm_no_temporal_overlap') = 1
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'Both chronological check constraint and GIST temporal exclusion constraint active on public.constituency_parliamentary_mappings' AS details
  FROM pg_constraint
  WHERE conrelid = 'public.constituency_parliamentary_mappings'::regclass
),

-- ─── CHECK 3: Total AC <-> PC mappings count (exactly 4,123) ──────────────────
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'national AC-PC mapping count completeness' AS check_name,
    count(*)::text AS actual_value,
    '4123' AS expected_value,
    CASE WHEN count(*) = 4123 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Total 4,123 AC-to-PC mappings established across all legislative assembly constituencies' AS details
  FROM public.constituency_parliamentary_mappings
),

-- ─── CHECK 4: Single current PC mapping per current AC version ────────────────
check_4_violations AS (
  SELECT cv.id, count(cpm.id) AS mapping_count
  FROM public.constituency_versions cv
  LEFT JOIN public.constituency_parliamentary_mappings cpm 
    ON cv.id = cpm.assembly_constituency_version_id AND cpm.is_current = true
  WHERE cv.is_current = true
  GROUP BY cv.id
  HAVING count(cpm.id) <> 1
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'single current PC mapping per current AC version invariant' AS check_name,
    'violations: ' || count(*)::text AS actual_value,
    'violations: 0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Every current AC version maps to exactly one current PC (4,123 / 4,123 with 0 violations)'
      ELSE 'FAIL: ' || count(*) || ' current AC versions violate the single-current-PC mapping invariant'
    END AS details
  FROM check_4_violations
),

-- ─── CHECK 5: Legislative assembly jurisdiction coverage (31 / 31) ───────────
check_5_jurisdictions AS (
  SELECT
    c.state_code,
    count(DISTINCT cpm.assembly_constituency_version_id) AS mapped_ac_count,
    count(DISTINCT c.internal_id) AS total_ac_count
  FROM public.constituencies c
  JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
  LEFT JOIN public.constituency_parliamentary_mappings cpm ON cv.id = cpm.assembly_constituency_version_id AND cpm.is_current = true
  GROUP BY c.state_code
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'jurisdictional coverage across 31 assembly states/UTs' AS check_name,
    'fully_mapped_states: ' || count(*) FILTER (WHERE mapped_ac_count = total_ac_count) || '/31' AS actual_value,
    'fully_mapped_states: 31/31' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE mapped_ac_count = total_ac_count) = 31 
       AND count(*) = 31
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'All 31 States and UTs with Legislative Assemblies have 100% of their ACs mapped to PCs' AS details
  FROM check_5_jurisdictions
),

-- ─── CHECK 6: Non-assembly UT catalog verification (5 UTs, 0 ACs) ─────────────
check_6_non_assembly AS (
  SELECT s.code, count(c.id) AS ac_count
  FROM public.states s
  LEFT JOIN public.constituencies c ON s.code = c.state_code
  WHERE s.code IN ('AN', 'CH', 'DH', 'LA', 'LD')
  GROUP BY s.code
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'non-assembly Union Territories verification (5 UTs, 0 ACs)' AS check_name,
    'non_assembly_with_0_acs: ' || count(*) FILTER (WHERE ac_count = 0) || '/5' AS actual_value,
    'non_assembly_with_0_acs: 5/5' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE ac_count = 0) = 5 
       AND count(*) = 5
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'All 5 non-assembly UTs (AN, CH, DH, LA, LD) correctly have 0 assembly constituencies' AS details
  FROM check_6_non_assembly
),

-- ─── CHECK 7: Statutory delimitation regime attribution in mappings ───────────
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'delimitation regime distribution in AC-PC mappings' AS check_name,
    'ap_ts_2014: ' || count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2014_ap_ts') ||
    ', jk_2022: ' || count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2022_jk') ||
    ', eci_2008: ' || count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2008') AS actual_value,
    'ap_ts_2014: 294, jk_2022: 90, eci_2008: 3739' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2014_ap_ts') = 294
       AND count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2022_jk') = 90
       AND count(*) FILTER (WHERE delimitation_regime_id = 'eci_delimitation_2008') = 3739
       AND count(*) = 4123
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'Mappings precisely partitioned across statutory regimes: 294 AP/TS (2014), 90 JK (2022), 3,739 National (2008)' AS details
  FROM public.constituency_parliamentary_mappings
),

-- ─── CHECK 8: Provenance and data status completeness ─────────────────────────
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'mappings data status and dataset version provenance' AS check_name,
    'status_verified_or_reconciled: ' || count(*) FILTER (WHERE data_status IN ('VERIFIED', 'RECONCILED')) ||
    ', valid_source_dataset: ' || count(*) FILTER (WHERE source_dataset_version_id = 'eci_national_ac_2008_v1') AS actual_value,
    'status_verified_or_reconciled: 4123, valid_source_dataset: 4123' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE data_status IN ('VERIFIED', 'RECONCILED')) = 4123
       AND count(*) FILTER (WHERE source_dataset_version_id = 'eci_national_ac_2008_v1') = 4123
       AND count(*) = 4123
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'All 4,123 mappings have data_status IN (VERIFIED, RECONCILED) and source_dataset_version_id = eci_national_ac_2008_v1' AS details
  FROM public.constituency_parliamentary_mappings
),

-- ─── CHECK 9: Foreign key integrity to AC and PC versions ────────────────────
check_9_invalid_fks AS (
  SELECT cpm.id
  FROM public.constituency_parliamentary_mappings cpm
  LEFT JOIN public.constituency_versions cv ON cpm.assembly_constituency_version_id = cv.id
  LEFT JOIN public.parliamentary_constituency_versions pcv ON cpm.parliamentary_constituency_version_id = pcv.id
  WHERE cv.id IS NULL OR pcv.id IS NULL
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'foreign key integrity to AC and PC versions' AS check_name,
    'dangling_fks: ' || count(*)::text AS actual_value,
    'dangling_fks: 0' AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    '100% of mappings successfully link to valid constituency_versions and parliamentary_constituency_versions' AS details
  FROM check_9_invalid_fks
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
    'All baseline geography counts remain preserved and untouched' AS details
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
