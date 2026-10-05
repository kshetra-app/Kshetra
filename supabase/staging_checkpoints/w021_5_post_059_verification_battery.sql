-- ==============================================================================
-- W021.5: Post-059-R1 Comprehensive Staging Verification Battery
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

-- ─── CHECK 1: PUBLIC.STATES DDL INTEGRITY (UPDATED_AT REMEDIATION) ───────────
SELECT 
  'check_1_states_columns' AS check_name,
  column_name,
  data_type,
  CASE WHEN column_name = 'updated_at' THEN 'FAIL: updated_at exists' ELSE 'PASS' END AS status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'states'
  AND column_name = 'updated_at';
-- Expected: 0 rows returned (proves updated_at column does not exist on public.states)

-- ─── CHECK 2: CORE RELATION ROW COUNTS ────────────────────────────────────────
SELECT 'check_2_row_counts' AS check_name, table_name, actual_count, expected_count,
       CASE WHEN actual_count = expected_count THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
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
  SELECT 'dataset_versions', count(*), 3 FROM public.dataset_versions WHERE id IN ('mha_national_jurisdictions_2024_v1', 'eci_national_pc_2008_v1', 'eci_national_ac_2008_v1')
) counts;

-- ─── CHECK 3: TELANGANA TEMPORAL RECONCILIATION & ISOLATION ───────────────────
SELECT 
  'check_3_telangana_versions' AS check_name,
  version_code,
  state_code,
  valid_from,
  valid_to,
  is_current,
  primary_dataset_version_id,
  CASE 
    WHEN version_code = 'TS-STATE-2014' AND valid_from = '2014-06-02'::date AND valid_to IS NULL AND is_current = true THEN 'PASS: Pre-existing TS-STATE-2014 Preserved'
    WHEN version_code = 'TS-STATE-2008' THEN 'FAIL: Fabricated TS-STATE-2008 must not exist'
    ELSE 'UNEXPECTED'
  END AS status
FROM public.state_versions
WHERE state_code = 'TS';

-- ─── CHECK 4: GIST EXCLUSION OVERLAP VERIFICATION (uq_state_versions_no_overlap)
SELECT 
  'check_4_temporal_overlaps' AS check_name,
  sv1.state_code,
  sv1.version_code AS version_1,
  sv2.version_code AS version_2,
  daterange(sv1.valid_from, sv1.valid_to, '[)') AS range_1,
  daterange(sv2.valid_from, sv2.valid_to, '[)') AS range_2,
  'FAIL: Overlap detected' AS status
FROM public.state_versions sv1
JOIN public.state_versions sv2 
  ON sv1.state_code = sv2.state_code 
 AND sv1.id <> sv2.id
 AND daterange(sv1.valid_from, sv1.valid_to, '[)') && daterange(sv2.valid_from, sv2.valid_to, '[)');
-- Expected: 0 rows returned (proves zero temporal overlaps across all 36 jurisdictions)

-- ─── CHECK 5: SINGLE CURRENT VERSION PER JURISDICTION INVARIANT ───────────────
SELECT 
  'check_5_single_current_version' AS check_name,
  state_code,
  count(*) AS current_count,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL: Multiple current versions' END AS status
FROM public.state_versions
WHERE is_current = true
GROUP BY state_code
HAVING count(*) <> 1;
-- Expected: 0 rows returned (proves all 36 jurisdictions have strictly one is_current = true)

-- ─── CHECK 6: ALL 36 JURISDICTIONS CURRENT_VERSION_ID LINKAGE ─────────────────
SELECT 
  'check_6_unlinked_current_versions' AS check_name,
  s.code AS state_code,
  s.name,
  s.current_version_id,
  'FAIL: Missing current_version_id' AS status
FROM public.states s
WHERE s.current_version_id IS NULL;
-- Expected: 0 rows returned (proves all 36 states have foreign key linked to state_versions.id)

-- ─── CHECK 7: NATIONAL PARLIAMENTARY CONSTITUENCIES AUDIT (543 PCS) ───────────
SELECT 
  'check_7_pc_summary' AS check_name,
  count(*) AS total_pcs,
  count(DISTINCT code) AS unique_pc_codes,
  count(DISTINCT state_code) AS states_covered,
  count(*) FILTER (WHERE current_version_id IS NOT NULL) AS linked_current_versions,
  CASE 
    WHEN count(*) = 543 AND count(DISTINCT code) = 543 AND count(DISTINCT state_code) = 36 AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 543 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status
FROM public.parliamentary_constituencies;

-- ─── CHECK 8: NATIONAL ASSEMBLY CONSTITUENCIES AUDIT (4,123 ACS) ──────────────
SELECT 
  'check_8_ac_summary' AS check_name,
  count(*) AS total_acs,
  count(DISTINCT id) AS unique_ac_ids,
  count(DISTINCT canonical_code) AS unique_canonical_codes,
  count(DISTINCT state_code) AS states_covered,
  count(*) FILTER (WHERE current_version_id IS NOT NULL) AS linked_current_versions,
  CASE 
    WHEN count(*) = 4123 AND count(DISTINCT id) = 4123 AND count(DISTINCT state_code) = 31 AND count(*) FILTER (WHERE current_version_id IS NOT NULL) = 4123 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status
FROM public.constituencies;

-- ─── CHECK 9: STATUTORY PROVENANCE LINKAGES AUDIT ─────────────────────────────
SELECT 
  'check_9_provenance_linkages' AS check_name,
  domain_table,
  count(*) AS linkage_count,
  CASE 
    WHEN domain_table = 'states' AND count(*) = 36 THEN 'PASS'
    WHEN domain_table = 'parliamentary_constituencies' AND count(*) = 543 THEN 'PASS'
    WHEN domain_table = 'constituencies' AND count(*) = 4123 THEN 'PASS'
    ELSE 'REVIEW'
  END AS status
FROM public.record_provenance_linkages
WHERE provenance_id IN (
  '00000000-0000-0000-0013-000000000001'::uuid,
  '00000000-0000-0000-0013-000000000004'::uuid,
  '00000000-0000-0000-0013-000000000005'::uuid
)
GROUP BY domain_table;

-- ─── CHECK 10: AUDIT LOG (MIGRATION CONFLICTS) RECORD VERIFICATION ────────────
SELECT 
  'check_10_conflict_records' AS check_name,
  source_record_id,
  entity_type,
  status,
  resolution
FROM public.migration_conflicts
ORDER BY source_record_id;
