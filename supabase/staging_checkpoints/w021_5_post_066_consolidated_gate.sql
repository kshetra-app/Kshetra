-- ==============================================================================
-- W021.5: Post-066 Consolidated Gate Verification Suite
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Datasets, Versions & Attributes Completeness ───────────────────
check_1_data AS (
  SELECT
    -- 3 Datasets match
    (SELECT count(*) FROM public.datasets
     WHERE (id, name, domain, source_id) IN (
       ('myneta_candidate_disclosures', 'National Election Watch / MyNeta Candidate Affidavits (Form 26)', 'political_profiles', 'myneta'),
       ('eci_constituency_lineage_regimes', 'ECI Delimitation & Statutory Reorganisation Lineage Registry', 'geography', 'eci'),
       ('eci_constituency_demographics_turnout', 'ECI & Census Assembly Constituency Demographics and Turnout Registry', 'demographics', 'eci')
     )) AS ds_match,
    -- 3 Dataset Versions match
    (SELECT count(*) FROM public.dataset_versions
     WHERE (id, dataset_id, version_tag, default_status) IN (
       ('myneta_candidate_disclosures_2024_v1', 'myneta_candidate_disclosures', '2024-MYNETA-AFFIDAVITS-V1', 'OFFICIAL'),
       ('eci_constituency_lineage_regimes_2024_v1', 'eci_constituency_lineage_regimes', '2024-DELIM-LINEAGE-V1', 'VERIFIED'),
       ('eci_constituency_demographics_turnout_2024_v1', 'eci_constituency_demographics_turnout', '2024-AC-DEMOGRAPHICS-TURNOUT-V1', 'ESTIMATE')
     )) AS ver_match
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    '3 datasets and 3 dataset versions registered with valid attributes' AS check_name,
    'datasets: ' || ds_match || '/3, versions: ' || ver_match || '/3' AS actual_value,
    'datasets: 3/3, versions: 3/3' AS expected_value,
    CASE WHEN ds_match = 3 AND ver_match = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Authoritative downstream civic datasets and version snapshots verified in catalog' AS details
  FROM check_1_data
),

-- ─── CHECK 2: Batch Provenance Anchor Record Presence & FK Linkage ───────────
check_2_data AS (
  SELECT
    (SELECT count(*) FROM public.provenance_records pr
     JOIN public.dataset_versions dv ON dv.id = pr.dataset_version_id
     WHERE pr.id = '0215b22e-0000-0000-0000-000000000001'::uuid
       AND pr.status = 'OFFICIAL'
       AND pr.transformation_type = 'canonical_ingest'
       AND pr.dataset_version_id IS NOT NULL) AS prov_anchor_match
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'batch provenance anchor 0215b22e presence and dataset version FK validity' AS check_name,
    'anchor_match: ' || prov_anchor_match AS actual_value,
    'anchor_match: 1' AS expected_value,
    CASE WHEN prov_anchor_match = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Batch provenance anchor 0215b22e-0000-0000-0000-000000000001 registered with valid dataset_version_id' AS details
  FROM check_2_data
),

-- ─── CHECK 3: Candidate Affidavits Foreign Keys to Persons & Candidacies ──────
check_3_data AS (
  SELECT
    count(*) AS total_affidavits,
    count(*) FILTER (WHERE person_id IS NULL OR candidacy_id IS NULL OR provenance_id IS NULL) AS orphan_affidavits,
    count(*) FILTER (WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS batch_affidavits
  FROM public.candidate_affidavits
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'candidate_affidavits foreign keys to canonical_persons and candidacies' AS check_name,
    'orphans: ' || orphan_affidavits || ', batch_affidavits: ' || batch_affidavits AS actual_value,
    'orphans: 0, batch_affidavits: 4524' AS expected_value,
    CASE WHEN orphan_affidavits = 0 AND batch_affidavits = 4524 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 4,524 candidate affidavits resolve 100% to canonical persons, candidacies, and provenance' AS details
  FROM check_3_data
),

-- ─── CHECK 4: Constituency Demographics Canonical FK Enforcement ─────────────
check_4_data AS (
  SELECT
    count(*) AS total_demographics,
    count(*) FILTER (WHERE constituency_id IS NULL) AS null_constituency_ids,
    count(DISTINCT constituency_id) AS distinct_constituencies,
    (SELECT count(*) FROM public.constituency_demographics cd
     LEFT JOIN public.constituencies c ON c.internal_id = cd.constituency_id
     WHERE c.internal_id IS NULL) AS dangling_constituency_fks
  FROM public.constituency_demographics
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'constituency_demographics FK to public.constituencies(internal_id)' AS check_name,
    'nulls: ' || null_constituency_ids || ', dangling: ' || dangling_constituency_fks || ', distinct_acs: ' || distinct_constituencies AS actual_value,
    'nulls: 0, dangling: 0, distinct_acs: 4123' AS expected_value,
    CASE WHEN null_constituency_ids = 0 AND dangling_constituency_fks = 0 AND distinct_constituencies = 4123 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Demographics table references valid canonical constituencies via internal_id with 0 orphans' AS details
  FROM check_4_data
),

-- ─── CHECK 5: Canonical 4,123 Assembly Coverage (Zero Ward Pollution) ─────────
check_5_data AS (
  SELECT
    count(*) AS dl_total_acs,
    count(*) FILTER (WHERE ac_no > 70) AS dl_ward_pollution
  FROM public.constituency_demographics
  WHERE state_code = 'DL'
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'delhi assembly constituencies coverage and zero municipal ward pollution' AS check_name,
    'dl_acs: ' || dl_total_acs || ', dl_wards_over_70: ' || dl_ward_pollution AS actual_value,
    'dl_acs: 70, dl_wards_over_70: 0' AS expected_value,
    CASE WHEN dl_total_acs = 70 AND dl_ward_pollution = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Delhi demographics contains exactly 70 Vidhan Sabha constituencies with zero ward contamination' AS details
  FROM check_5_data
),

-- ─── CHECK 6: Candidate Affidavits Row Count & Integrity ──────────────────────
check_6_data AS (
  SELECT
    count(*) AS batch_affidavits,
    count(*) FILTER (WHERE is_winner = true) AS winning_candidates,
    count(*) FILTER (WHERE data_status = 'OFFICIAL') AS official_status_affidavits
  FROM public.candidate_affidavits
  WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'candidate_affidavits batch population count and status integrity' AS check_name,
    'batch_affidavits: ' || batch_affidavits || ', official_status: ' || official_status_affidavits AS actual_value,
    'batch_affidavits: 4524, official_status: 4524' AS expected_value,
    CASE WHEN batch_affidavits = 4524 AND official_status_affidavits = 4524 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exactly 4,524 candidate affidavits populated with OFFICIAL data status' AS details
  FROM check_6_data
),

-- ─── CHECK 7: Constituency Lineage Regime Transitions Count ───────────────────
check_7_data AS (
  SELECT
    count(*) AS total_lineage_records,
    count(*) FILTER (WHERE state_code = 'AS') AS assam_transitions,
    count(*) FILTER (WHERE state_code <> 'AS') AS statutory_transitions
  FROM public.constituency_lineage
  WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'constituency_lineage delimitation succession records count' AS check_name,
    'total: ' || total_lineage_records || ' (assam: ' || assam_transitions || ', statutory: ' || statutory_transitions || ')' AS actual_value,
    'total: 154 (assam: 126, statutory: 28)' AS expected_value,
    CASE WHEN total_lineage_records = 154 AND assam_transitions = 126 AND statutory_transitions = 28 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Delimitation lineage contains 126 Assam 2023 transitions and 28 statutory territorial reorganizations' AS details
  FROM check_7_data
),

-- ─── CHECK 8: State Election History Turnout Cycles Count ─────────────────────
check_8_data AS (
  SELECT
    count(*) AS total_turnout_cycles,
    count(DISTINCT state_code) AS distinct_states
  FROM public.state_election_history_turnout
  WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'state_election_history_turnout general election cycles count' AS check_name,
    'cycles: ' || total_turnout_cycles || ', states: ' || distinct_states AS actual_value,
    'cycles: 48, states: 31' AS expected_value,
    CASE WHEN total_turnout_cycles = 48 AND distinct_states = 31 THEN 'PASS' ELSE 'FAIL' END AS status,
    'State election history turnout registry contains 48 historical election cycles across 31 assemblies' AS details
  FROM check_8_data
),

-- ─── CHECK 9: Zero Synthetic Independent Entity Leakage ───────────────────────
check_9_data AS (
  SELECT
    count(*) AS synthetic_independents
  FROM public.political_organizations
  WHERE (name ILIKE '%Independent%' OR short_name = 'IND')
    AND id NOT IN ('ORG-PARTY-IND', '0215b22c-0000-0000-0000-000000000001')
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'zero synthetic independent organizations leakage' AS check_name,
    'synthetic_independents: ' || synthetic_independents AS actual_value,
    'synthetic_independents: 0' AS expected_value,
    CASE WHEN synthetic_independents = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Zero synthetic independent political organizations created across all migration batches' AS details
  FROM check_9_data
),

-- ─── CHECK 10: RLS Enabled and Security Policies Verified ─────────────────────
check_10_data AS (
  SELECT
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'constituency_demographics') AS demo_rls,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'constituency_demographics') AS demo_policies,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidate_affidavits') AS aff_policies
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'row level security enabled on constituency_demographics with verified policies' AS check_name,
    'rls: ' || demo_rls || ', demo_policies: ' || demo_policies || ', aff_policies: ' || aff_policies AS actual_value,
    'rls: true, demo_policies: >=2, aff_policies: >=2' AS expected_value,
    CASE WHEN demo_rls = true AND demo_policies >= 2 AND aff_policies >= 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    'RLS enabled with public read and service-role write policies verified' AS details
  FROM check_10_data
),

-- ─── CHECK 11: Consolidated Aggregate Verdict ─────────────────────────────────
check_1_to_10_union AS (
  SELECT status FROM check_1_cte
  UNION ALL SELECT status FROM check_2_cte
  UNION ALL SELECT status FROM check_3_cte
  UNION ALL SELECT status FROM check_4_cte
  UNION ALL SELECT status FROM check_5_cte
  UNION ALL SELECT status FROM check_6_cte
  UNION ALL SELECT status FROM check_7_cte
  UNION ALL SELECT status FROM check_8_cte
  UNION ALL SELECT status FROM check_9_cte
  UNION ALL SELECT status FROM check_10_cte
),
check_11_aggregate AS (
  SELECT
    count(*) AS total_checks,
    count(*) FILTER (WHERE status = 'PASS') AS passed_checks,
    count(*) FILTER (WHERE status <> 'PASS') AS failed_checks
  FROM check_1_to_10_union
),
check_11_cte AS (
  SELECT
    'check_11' AS check_id,
    'post-066 consolidated gate aggregate verdict (checks 01-10 all pass)' AS check_name,
    'passed: ' || passed_checks || '/' || total_checks || ' (failed: ' || failed_checks || ')' AS actual_value,
    'passed: 10/10 (failed: 0)' AS expected_value,
    CASE
      WHEN passed_checks = 10 AND failed_checks = 0
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN passed_checks = 10 AND failed_checks = 0
      THEN 'POST_066_PASS: All 10 downstream civic extensions integrity gates PASSED'
      ELSE 'POST_066_FAIL: One or more checks failed verification'
    END AS details
  FROM check_11_aggregate
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
UNION ALL
SELECT * FROM check_11_cte
ORDER BY check_id;
