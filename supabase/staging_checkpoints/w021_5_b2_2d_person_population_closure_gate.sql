-- ==============================================================================
-- W021.5-B2.2-D Canonical Person Population — Consolidated Closure Gate
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Directive: W021.5-CTO-NEXT-005
-- Scope: Full Canonical Person Spectrum (Persons 0001 through 9083, Cumulative 9,083)
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes, ZERO DML)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- ==============================================================================

WITH
-- ─── CHECK 01: Exact Population Count ─────────────────────────────────────────
check_01_data AS (
  SELECT
    (SELECT count(*) FROM public.canonical_persons 
     WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS b2_2d_persons,
    (SELECT count(*) FROM public.canonical_persons) AS total_persons
),
check_01_cte AS (
  SELECT
    'check_01' AS check_id,
    'Exact population count (b2_2d_persons = 9,083, total_canonical_persons = 9,083)' AS check_name,
    'b2_2d: ' || b2_2d_persons || ', total: ' || total_persons AS actual_value,
    'b2_2d: 9083, total: 9083' AS expected_value,
    CASE WHEN b2_2d_persons = 9083 AND total_persons = 9083 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Exact 9,083 canonical persons registered under B2.2-D batch provenance' AS details
  FROM check_01_data
),

-- ─── CHECK 02: Namespace Integrity ───────────────────────────────────────────
check_02_data AS (
  SELECT
    count(*) AS total_persons,
    count(*) FILTER (WHERE id::text LIKE '0215b22d-0001-0000-0000-%') AS namespace_persons,
    count(*) FILTER (WHERE id::text NOT LIKE '0215b22d-0001-0000-0000-%') AS non_namespace_persons
  FROM public.canonical_persons
),
check_02_cte AS (
  SELECT
    'check_02' AS check_id,
    'Namespace integrity (all 9,083 IDs conform to 0215b22d-0001- namespace)' AS check_name,
    'namespace: ' || namespace_persons || ', non_namespace: ' || non_namespace_persons AS actual_value,
    'namespace: 9083, non_namespace: 0' AS expected_value,
    CASE WHEN namespace_persons = 9083 AND non_namespace_persons = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Zero non-namespace UUIDs present in canonical_persons' AS details
  FROM check_02_data
),

-- ─── CHECK 03: Duplicate Identity Integrity ───────────────────────────────────
check_03_data AS (
  SELECT
    count(*) AS duplicate_ids_count
  FROM (
    SELECT id FROM public.canonical_persons GROUP BY id HAVING count(*) > 1
  ) d
),
check_03_cte AS (
  SELECT
    'check_03' AS check_id,
    'Duplicate identity integrity (zero duplicate primary-key identities)' AS check_name,
    'duplicates: ' || duplicate_ids_count AS actual_value,
    'duplicates: 0' AS expected_value,
    CASE WHEN duplicate_ids_count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Primary key uniqueness strictly maintained with 0 collisions' AS details
  FROM check_03_data
),

-- ─── CHECK 04: Boundary Integrity ─────────────────────────────────────────────
check_04_data AS (
  SELECT
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000000001'::uuid)) AS p0001,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000002300'::uuid)) AS p2300,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000002301'::uuid)) AS p2301,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000003450'::uuid)) AS p3450,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000003451'::uuid)) AS p3451,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000004600'::uuid)) AS p4600,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000004601'::uuid)) AS p4601,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000005750'::uuid)) AS p5750,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000005751'::uuid)) AS p5751,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000006900'::uuid)) AS p6900,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000006901'::uuid)) AS p6901,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000008000'::uuid)) AS p8000,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000008001'::uuid)) AS p8001,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000009083'::uuid)) AS p9083,
    (SELECT EXISTS(SELECT 1 FROM public.canonical_persons WHERE id = '0215b22d-0001-0000-0000-000000009084'::uuid)) AS p9084
),
check_04_cte AS (
  SELECT
    'check_04' AS check_id,
    'Boundary integrity across all subchunk boundaries (0001 through 9083 present, 9084 absent)' AS check_name,
    '0001:' || p0001 || ', 2300:' || p2300 || ', 2301:' || p2301 || ', 3450:' || p3450 || ', 3451:' || p3451 ||
    ', 4600:' || p4600 || ', 4601:' || p4601 || ', 5750:' || p5750 || ', 5751:' || p5751 ||
    ', 6900:' || p6900 || ', 6901:' || p6901 || ', 8000:' || p8000 || ', 8001:' || p8001 ||
    ', 9083:' || p9083 || ', 9084:' || p9084 AS actual_value,
    'All chunk boundaries (0001..9083) true, 9084 false' AS expected_value,
    CASE WHEN p0001 AND p2300 AND p2301 AND p3450 AND p3451 AND p4600 AND p4601 AND
              p5750 AND p5751 AND p6900 AND p6901 AND p8000 AND p8001 AND p9083 AND NOT p9084
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 14 chunk-junction boundary milestones present and terminal boundary 9084 strictly absent' AS details
  FROM check_04_data
),

-- ─── CHECK 05: Range Leakage ──────────────────────────────────────────────────
check_05_data AS (
  SELECT
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id::text > '0215b22d-0001-0000-0000-000000009083') AS above_9083_count,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id::text < '0215b22d-0001-0000-0000-000000000001') AS below_0001_count,
    (SELECT min(id::text) FROM public.canonical_persons) AS min_id,
    (SELECT max(id::text) FROM public.canonical_persons) AS max_id
),
check_05_cte AS (
  SELECT
    'check_05' AS check_id,
    'Range leakage verification (zero IDs above 9083 or below 0001)' AS check_name,
    'above_9083: ' || above_9083_count || ', below_0001: ' || below_0001_count ||
    ', min: ' || min_id || ', max: ' || max_id AS actual_value,
    'above_9083: 0, below_0001: 0, min: ...0001, max: ...9083' AS expected_value,
    CASE WHEN above_9083_count = 0 AND below_0001_count = 0 
              AND min_id = '0215b22d-0001-0000-0000-000000000001'
              AND max_id = '0215b22d-0001-0000-0000-000000009083'
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'Population strictly bounded within [0215b22d-0001-0000-0000-000000000001, 0215b22d-0001-0000-0000-000000009083]' AS details
  FROM check_05_data
),

-- ─── CHECK 06: Canonical-Person Data Integrity ────────────────────────────────
check_06_data AS (
  SELECT
    (SELECT count(*) FROM public.canonical_persons 
     WHERE char_length(canonical_name) < 2 OR char_length(canonical_name) > 150) AS invalid_name_length_count,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE canonical_name = '\' OR canonical_name ~ '\\$') AS backslash_name_count,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE canonical_name IS NULL OR data_status IS NULL OR provenance_id IS NULL) AS null_required_fields_count,
    (SELECT count(*) FROM public.canonical_persons p 
     LEFT JOIN public.provenance_records r ON p.provenance_id = r.id 
     WHERE r.id IS NULL) AS orphan_provenance_persons_count
),
check_06_cte AS (
  SELECT
    'check_06' AS check_id,
    'Canonical-person data integrity (name length, backslash corruption, null fields, orphan prov)' AS check_name,
    'invalid_len: ' || invalid_name_length_count || ', backslash: ' || backslash_name_count ||
    ', nulls: ' || null_required_fields_count || ', orphan_prov: ' || orphan_provenance_persons_count AS actual_value,
    'invalid_len: 0, backslash: 0, nulls: 0, orphan_prov: 0' AS expected_value,
    CASE WHEN invalid_name_length_count = 0 AND backslash_name_count = 0
              AND null_required_fields_count = 0 AND orphan_provenance_persons_count = 0
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'Zero NULL mandatory fields, zero corrupted characters, and 100% provenance linkage' AS details
  FROM check_06_data
),

-- ─── CHECK 07: Dataset / Version Integrity ───────────────────────────────────
check_07_data AS (
  SELECT
    (SELECT count(*) FROM public.datasets 
     WHERE id = 'eci_candidate_disclosures_tenures') AS dataset_count,
    (SELECT count(*) FROM public.dataset_versions 
     WHERE id = 'eci_candidate_disclosures_tenures_2024_v1' 
       AND dataset_id = 'eci_candidate_disclosures_tenures') AS version_count,
    (SELECT default_status FROM public.dataset_versions 
     WHERE id = 'eci_candidate_disclosures_tenures_2024_v1') AS version_status
),
check_07_cte AS (
  SELECT
    'check_07' AS check_id,
    'Dataset and version registry integrity (eci_candidate_disclosures_tenures / 2024_v1)' AS check_name,
    'dataset_count: ' || dataset_count || ', version_count: ' || version_count ||
    ', status: ' || coalesce(version_status::text, 'NULL') AS actual_value,
    'dataset_count: 1, version_count: 1, status: OFFICIAL' AS expected_value,
    CASE WHEN dataset_count = 1 AND version_count = 1 AND version_status = 'OFFICIAL'
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'ECI disclosures dataset and 2024_v1 snapshot registered with OFFICIAL status' AS details
  FROM check_07_data
),

-- ─── CHECK 08: Provenance Anchor Integrity ───────────────────────────────────
check_08_data AS (
  SELECT
    (SELECT count(*) FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS anchor_count,
    (SELECT dataset_version_id FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS target_version,
    (SELECT status FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS anchor_status,
    (SELECT transformation_type FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS trans_type
),
check_08_cte AS (
  SELECT
    'check_08' AS check_id,
    'Provenance anchor record integrity (0215b22d-0000-... points to disclosures 2024_v1)' AS check_name,
    'anchor_count: ' || anchor_count || ', target_version: ' || coalesce(target_version, 'NULL') ||
    ', status: ' || coalesce(anchor_status::text, 'NULL') || ', type: ' || coalesce(trans_type, 'NULL') AS actual_value,
    'anchor_count: 1, target_version: eci_candidate_disclosures_tenures_2024_v1, status: OFFICIAL, type: canonical_ingest' AS expected_value,
    CASE WHEN anchor_count = 1 
              AND target_version = 'eci_candidate_disclosures_tenures_2024_v1'
              AND anchor_status = 'OFFICIAL'
              AND trans_type = 'canonical_ingest'
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'Canonical batch provenance anchor record validated with valid foreign key lineage' AS details
  FROM check_08_data
),

-- ─── CHECK 09: Dependency Integrity ──────────────────────────────────────────
check_09_data AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations) AS org_count,
    (SELECT count(*) FROM public.states) AS state_count
),
check_09_cte AS (
  SELECT
    'check_09' AS check_id,
    'Upstream dependency catalogs integrity (political_organizations = 107, states = 36)' AS check_name,
    'orgs: ' || org_count || ', states: ' || state_count AS actual_value,
    'orgs: 107, states: 36' AS expected_value,
    CASE WHEN org_count = 107 AND state_count = 36 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Upstream civic dependencies intact and undisturbed during B2.2-D person population' AS details
  FROM check_09_data
),

-- ─── CHECK 10: Downstream Isolation (Pre-Candidacy Freeze) ───────────────────
check_10_data AS (
  SELECT
    (SELECT count(*) FROM public.canonical_persons) AS person_count,
    (SELECT count(*) FROM public.candidacies) AS cand_count,
    (SELECT count(*) FROM public.candidate_affidavits) AS aff_count
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'Downstream isolation & pre-candidacy freeze (persons = 9,083, candidacies = 0, affidavits = 0)' AS check_name,
    'persons: ' || person_count || ', candidacies: ' || cand_count || ', affidavits: ' || aff_count AS actual_value,
    'persons: 9083, candidacies: 0, affidavits: 0' AS expected_value,
    CASE WHEN person_count = 9083 AND cand_count = 0 AND aff_count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Downstream candidacy and affidavit tables strictly clean; pre-candidacy freeze enforced' AS details
  FROM check_10_data
),

-- ─── CHECK 11: Accepted-Chunk Cumulative Reconciliation ───────────────────────
check_11_data AS (
  SELECT
    -- Cumulative range counts representing physical subchunks
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000001250'::uuid) AS cum_02a,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000002300'::uuid) AS cum_02b,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000003450'::uuid) AS cum_03a,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000004600'::uuid) AS cum_03b,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000005750'::uuid) AS cum_04a,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000006900'::uuid) AS cum_04b,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000008000'::uuid) AS cum_05a,
    (SELECT count(*) FROM public.canonical_persons 
     WHERE id <= '0215b22d-0001-0000-0000-000000009083'::uuid) AS cum_05b
),
check_11_cte AS (
  SELECT
    'check_11' AS check_id,
    'Cumulative chunk reconciliation (02A:1250, 02B:2300, 03A:3450, 03B:4600, 04A:5750, 04B:6900, 05A:8000, 05B:9083)' AS check_name,
    '02A:' || cum_02a || ', 02B:' || cum_02b || ', 03A:' || cum_03a || ', 03B:' || cum_03b ||
    ', 04A:' || cum_04a || ', 04B:' || cum_04b || ', 05A:' || cum_05a || ', 05B:' || cum_05b AS actual_value,
    '02A:1250, 02B:2300, 03A:3450, 03B:4600, 04A:5750, 04B:6900, 05A:8000, 05B:9083' AS expected_value,
    CASE WHEN cum_02a = 1250 AND cum_02b = 2300 AND cum_03a = 3450 AND cum_03b = 4600 AND
              cum_04a = 5750 AND cum_04b = 6900 AND cum_05a = 8000 AND cum_05b = 9083
         THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 8 physical subchunk thresholds verified cumulatively in live database' AS details
  FROM check_11_data
),

-- ─── CHECK 12: No Post-Acceptance Contamination ───────────────────────────────
check_12_data AS (
  SELECT
    (SELECT count(*) FROM public.canonical_persons
     WHERE provenance_id <> '0215b22d-0000-0000-0000-000000000001'::uuid
        OR id::text NOT LIKE '0215b22d-0001-0000-0000-%'
        OR id::text > '0215b22d-0001-0000-0000-000000009083'
        OR id::text < '0215b22d-0001-0000-0000-000000000001') AS contaminated_count
),
check_12_cte AS (
  SELECT
    'check_12' AS check_id,
    'Post-acceptance contamination check (zero records outside authorized B2.2-D population)' AS check_name,
    'contaminated: ' || contaminated_count AS actual_value,
    'contaminated: 0' AS expected_value,
    CASE WHEN contaminated_count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Zero rogue, foreign, or contaminated records detected in canonical_persons' AS details
  FROM check_12_data
),

-- ─── AGGREGATE SUMMARY & CONSOLIDATED VERDICT ─────────────────────────────────
all_checks_union AS (
  SELECT check_id, status FROM check_01_cte
  UNION ALL SELECT check_id, status FROM check_02_cte
  UNION ALL SELECT check_id, status FROM check_03_cte
  UNION ALL SELECT check_id, status FROM check_04_cte
  UNION ALL SELECT check_id, status FROM check_05_cte
  UNION ALL SELECT check_id, status FROM check_06_cte
  UNION ALL SELECT check_id, status FROM check_07_cte
  UNION ALL SELECT check_id, status FROM check_08_cte
  UNION ALL SELECT check_id, status FROM check_09_cte
  UNION ALL SELECT check_id, status FROM check_10_cte
  UNION ALL SELECT check_id, status FROM check_11_cte
  UNION ALL SELECT check_id, status FROM check_12_cte
),
gate_summary AS (
  SELECT
    count(*) AS total_checks,
    count(*) FILTER (WHERE status = 'PASS') AS passed_checks,
    count(*) FILTER (WHERE status = 'FAIL') AS failed_checks
  FROM all_checks_union
),
gate_verdict_cte AS (
  SELECT
    'GATE_VERDICT' AS check_id,
    'B2.2-D CANONICAL PERSON POPULATION CONSOLIDATED CLOSURE GATE' AS check_name,
    'total: ' || total_checks || ', passed: ' || passed_checks || ', failed: ' || failed_checks AS actual_value,
    'total: 12, passed: 12, failed: 0' AS expected_value,
    CASE WHEN total_checks = 12 AND passed_checks = 12 AND failed_checks = 0
         THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN total_checks = 12 AND passed_checks = 12 AND failed_checks = 0
         THEN 'B2_2D_PERSON_POPULATION_GATE_PASS: All 12 integrity checks PASSED; canonical person population closed at 9,083'
         ELSE 'B2_2D_PERSON_POPULATION_GATE_FAIL: One or more checks failed verification'
    END AS details
  FROM gate_summary
)

-- ─── FINAL RESULT SET ─────────────────────────────────────────────────────────
SELECT * FROM check_01_cte
UNION ALL SELECT * FROM check_02_cte
UNION ALL SELECT * FROM check_03_cte
UNION ALL SELECT * FROM check_04_cte
UNION ALL SELECT * FROM check_05_cte
UNION ALL SELECT * FROM check_06_cte
UNION ALL SELECT * FROM check_07_cte
UNION ALL SELECT * FROM check_08_cte
UNION ALL SELECT * FROM check_09_cte
UNION ALL SELECT * FROM check_10_cte
UNION ALL SELECT * FROM check_11_cte
UNION ALL SELECT * FROM check_12_cte
UNION ALL SELECT * FROM gate_verdict_cte
ORDER BY check_id;
