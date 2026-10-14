-- ==============================================================================
-- W021.5: Read-Only Intermediate Chunk Completion Checkpoint (Hardened Revision)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Purpose: Monitor incremental progress across the 8 execution chunks
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH chunk_status AS (
  SELECT
    -- Chunk 01 Targets (1 Provenance Anchor, 126 Assam Lineage Records)
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS prov_anchor_count,
    (SELECT count(*) FROM public.constituency_lineage WHERE source_dataset_version_id = 'eci_constituency_lineage_regimes_2024_v1') AS lineage_count,
    
    -- Chunks 02-05 Targets (Affidavits by state group)
    (SELECT count(*) FROM public.candidate_affidavits WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('AP', 'AR', 'AS', 'BR', 'CG', 'DL', 'GA', 'GJ')) AS aff_p1_count,
    (SELECT count(*) FROM public.candidate_affidavits WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'MP', 'MH')) AS aff_p2_count,
    (SELECT count(*) FROM public.candidate_affidavits WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('MN', 'ML', 'MZ', 'NL', 'OD', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TS')) AS aff_p3_count,
    (SELECT count(*) FROM public.candidate_affidavits WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('TR', 'UP', 'UK', 'WB', 'AN', 'CH', 'DN', 'DD', 'LA', 'LD')) AS aff_p4_count,
    (SELECT count(*) FROM public.candidate_affidavits WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS aff_total_count,
    
    -- Chunks 06-08 Targets (Demographics by state group)
    (SELECT count(*) FROM public.constituency_demographics WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('AP', 'AR', 'AS', 'BR', 'CG', 'DL', 'GA', 'GJ')) AS demo_p1_count,
    (SELECT count(*) FROM public.constituency_demographics WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'MP', 'MH')) AS demo_p2_count,
    (SELECT count(*) FROM public.constituency_demographics WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid AND state_code IN ('MN', 'ML', 'MZ', 'NL', 'OD', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'WB')) AS demo_p3_count,
    (SELECT count(*) FROM public.constituency_demographics WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS demo_total_count
)
SELECT
  'chunk_01' AS chunk_id,
  'Foundations & Lineage (E0, E2)' AS chunk_name,
  'prov: ' || prov_anchor_count || '/1, lin: ' || lineage_count || '/126' AS actual_progress,
  'prov: 1/1, lin: 126/126' AS expected_complete,
  CASE WHEN prov_anchor_count = 1 AND lineage_count = 126 THEN 'COMPLETE'
       WHEN prov_anchor_count = 0 AND lineage_count = 0 THEN 'PENDING'
       ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_02' AS chunk_id,
  'Candidate Affidavits Part 1 (AP-GJ)' AS chunk_name,
  'affidavits: ' || aff_p1_count || '/1196' AS actual_progress,
  'affidavits: 1196/1196' AS expected_complete,
  CASE WHEN aff_p1_count = 1196 THEN 'COMPLETE' WHEN aff_p1_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_03' AS chunk_id,
  'Candidate Affidavits Part 2 (HR-MH)' AS chunk_name,
  'affidavits: ' || aff_p2_count || '/1273' AS actual_progress,
  'affidavits: 1273/1273' AS expected_complete,
  CASE WHEN aff_p2_count = 1273 THEN 'COMPLETE' WHEN aff_p2_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_04' AS chunk_id,
  'Candidate Affidavits Part 3 (MN-TS)' AS chunk_name,
  'affidavits: ' || aff_p3_count || '/1150' AS actual_progress,
  'affidavits: 1150/1150' AS expected_complete,
  CASE WHEN aff_p3_count = 1150 THEN 'COMPLETE' WHEN aff_p3_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_05' AS chunk_id,
  'Candidate Affidavits Part 4 (TR-LD)' AS chunk_name,
  'affidavits: ' || aff_p4_count || '/905' AS actual_progress,
  'affidavits: 905/905' AS expected_complete,
  CASE WHEN aff_p4_count = 905 THEN 'COMPLETE' WHEN aff_p4_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_06' AS chunk_id,
  'Constituency Demographics Part 1 (AP-GJ)' AS chunk_name,
  'demographics: ' || demo_p1_count || '/986' AS actual_progress,
  'demographics: 986/986' AS expected_complete,
  CASE WHEN demo_p1_count = 986 THEN 'COMPLETE' WHEN demo_p1_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_07' AS chunk_id,
  'Constituency Demographics Part 2 (HR-MH)' AS chunk_name,
  'demographics: ' || demo_p2_count || '/1211' AS actual_progress,
  'demographics: 1211/1211' AS expected_complete,
  CASE WHEN demo_p2_count = 1211 THEN 'COMPLETE' WHEN demo_p2_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'chunk_08' AS chunk_id,
  'Constituency Demographics Part 3 (MN-WB)' AS chunk_name,
  'demographics: ' || demo_p3_count || '/1926' AS actual_progress,
  'demographics: 1926/1926' AS expected_complete,
  CASE WHEN demo_p3_count = 1926 THEN 'COMPLETE' WHEN demo_p3_count = 0 THEN 'PENDING' ELSE 'PARTIAL' END AS status
FROM chunk_status
UNION ALL
SELECT
  'summary' AS chunk_id,
  'Total Authoritative B2.2-E Records Populated' AS chunk_name,
  'total: ' || (prov_anchor_count + lineage_count + aff_total_count + demo_total_count) || '/8774' AS actual_progress,
  'total: 8774/8774' AS expected_complete,
  CASE WHEN (prov_anchor_count + lineage_count + aff_total_count + demo_total_count) = 8774 THEN 'COMPLETE'
       WHEN (prov_anchor_count + lineage_count + aff_total_count + demo_total_count) = 0 THEN 'PENDING'
       ELSE 'IN_PROGRESS' END AS status
FROM chunk_status
ORDER BY chunk_id;
