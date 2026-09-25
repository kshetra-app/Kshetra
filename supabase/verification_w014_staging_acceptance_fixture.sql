-- ==============================================================================
-- W014: DETERMINISTIC 18-CHECK STAGING ACCEPTANCE FIXTURE VERIFIER
-- Repository Path: supabase/verification_w014_staging_acceptance_fixture.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Mode: Strictly READ-ONLY (Single top-level SELECT statement)
-- Result Set: Exactly 19 rows (18 condition checks + 1 suite summary)
-- Columns: check_id, check_name, expected, observed, verdict
-- ==============================================================================

WITH checks (check_id, check_name, expected) AS (
    VALUES
        (1,  'Evidence Record Row Identity', 'evidence_records row e0140000-0000-0000-0000-000000000041 exists'),
        (2,  'Evidence Record Exact Artifact Name', 'mopr_lgd_subdistrict_directory_ts.json'),
        (3,  'Evidence Record Exact Artifact SHA-256', '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62'),
        (4,  'Evidence Record Exact Verification Authority', 'Ministry of Panchayati Raj, Government of India'),
        (5,  'Evidence Record Exact Verified By', 'LGD Subdistrict Directory Ingest Engine'),
        (6,  'Dataset Version Row Identity', 'dataset_versions row ts_lgd_mandals_staging_official_v1 exists'),
        (7,  'Dataset Version Exact Dataset ID', 'ts_lgd_mandals'),
        (8,  'Dataset Version Exact Version Tag', 'staging_acceptance_official_v1'),
        (9,  'Dataset Version Exact Effective From', '2023-01-01'),
        (10, 'Dataset Version Exact Record Count', '589'),
        (11, 'Dataset Version Exact Checksum SHA-256', '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62'),
        (12, 'Dataset Version Exact Default Status', 'OFFICIAL'),
        (13, 'Dataset Version Exact Verification Evidence ID', 'e0140000-0000-0000-0000-000000000041'),
        (14, 'Dataset Version Exact Metadata Flags', 'immutable=true, environment=staging_only, infrastructure_purpose=w014_acceptance_verification'),
        (15, 'Reciprocal Evidence Linkage Integrity', 'dv.verification_evidence_id matches ev.id (e0140000-0000-0000-0000-000000000041)'),
        (16, 'W012 Immutability Triggers Active', 'trg_prevent_evidence_mutation (enabled=O) AND trg_prevent_dataset_version_mutation (enabled=O)'),
        (17, 'Baseline Dataset Versions Untouched', 'ts_districts_2014_v1=UNVERIFIED, ts_lgd_mandals_2023_v1=UNVERIFIED'),
        (18, 'Fixture Singleton Cardinality & Catalog Scope', 'Exactly 1 evidence_records row, exactly 1 dataset_versions fixture row')
),
ev AS (
    SELECT 
        id,
        artifact_name,
        artifact_sha256,
        verification_authority,
        verified_by,
        verification_notes,
        verified_at,
        created_at
    FROM public.evidence_records
    WHERE id = 'e0140000-0000-0000-0000-000000000041'::uuid
    LIMIT 1
),
dv AS (
    SELECT 
        id,
        dataset_id,
        version_tag,
        effective_from,
        effective_to,
        retrieved_at,
        record_count,
        checksum_sha256,
        storage_path,
        default_status,
        verification_evidence_id,
        metadata,
        created_at
    FROM public.dataset_versions
    WHERE id = 'ts_lgd_mandals_staging_official_v1'
    LIMIT 1
),
trg AS (
    SELECT 
        (SELECT tgenabled::text 
         FROM pg_catalog.pg_trigger 
         WHERE tgrelid = 'public.evidence_records'::regclass 
           AND tgname = 'trg_prevent_evidence_mutation' 
           AND NOT tgisinternal) AS ev_trg_enabled,
        (SELECT tgenabled::text 
         FROM pg_catalog.pg_trigger 
         WHERE tgrelid = 'public.dataset_versions'::regclass 
           AND tgname = 'trg_prevent_dataset_version_mutation' 
           AND NOT tgisinternal) AS dv_trg_enabled
),
bl AS (
    SELECT 
        (SELECT default_status::text FROM public.dataset_versions WHERE id = 'ts_districts_2014_v1') AS dist_status,
        (SELECT default_status::text FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_2023_v1') AS lgd_status
),
card AS (
    SELECT 
        (SELECT count(*)::int FROM public.evidence_records WHERE id = 'e0140000-0000-0000-0000-000000000041'::uuid) AS ev_count,
        (SELECT count(*)::int FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_staging_official_v1') AS dv_count
),
individual_checks AS (
    SELECT 
        c.check_id,
        c.check_name,
        c.expected,
        CASE 
            WHEN c.check_id = 1 THEN 
                'id = ' || COALESCE(ev.id::text, 'NULL')
            WHEN c.check_id = 2 THEN 
                COALESCE(ev.artifact_name, 'NULL')
            WHEN c.check_id = 3 THEN 
                COALESCE(ev.artifact_sha256, 'NULL')
            WHEN c.check_id = 4 THEN 
                COALESCE(ev.verification_authority, 'NULL')
            WHEN c.check_id = 5 THEN 
                COALESCE(ev.verified_by, 'NULL')
            WHEN c.check_id = 6 THEN 
                'id = ' || COALESCE(dv.id, 'NULL')
            WHEN c.check_id = 7 THEN 
                COALESCE(dv.dataset_id, 'NULL')
            WHEN c.check_id = 8 THEN 
                COALESCE(dv.version_tag, 'NULL')
            WHEN c.check_id = 9 THEN 
                COALESCE(dv.effective_from::text, 'NULL')
            WHEN c.check_id = 10 THEN 
                COALESCE(dv.record_count::text, 'NULL')
            WHEN c.check_id = 11 THEN 
                COALESCE(dv.checksum_sha256, 'NULL')
            WHEN c.check_id = 12 THEN 
                COALESCE(dv.default_status::text, 'NULL')
            WHEN c.check_id = 13 THEN 
                COALESCE(dv.verification_evidence_id::text, 'NULL')
            WHEN c.check_id = 14 THEN 
                'immutable=' || COALESCE(dv.metadata->>'immutable', 'NULL') || 
                ', environment=' || COALESCE(dv.metadata->>'environment', 'NULL') || 
                ', infrastructure_purpose=' || COALESCE(dv.metadata->>'infrastructure_purpose', 'NULL')
            WHEN c.check_id = 15 THEN 
                'dv.verification_evidence_id=' || COALESCE(dv.verification_evidence_id::text, 'NULL') || 
                ', ev.id=' || COALESCE(ev.id::text, 'NULL') || 
                ', match=' || COALESCE((dv.verification_evidence_id = ev.id)::text, 'false')
            WHEN c.check_id = 16 THEN 
                'evidence_trg=' || COALESCE(trg.ev_trg_enabled, 'MISSING') || 
                ', dataset_version_trg=' || COALESCE(trg.dv_trg_enabled, 'MISSING')
            WHEN c.check_id = 17 THEN 
                'ts_districts_2014_v1=' || COALESCE(bl.dist_status, 'MISSING') || 
                ', ts_lgd_mandals_2023_v1=' || COALESCE(bl.lgd_status, 'MISSING')
            WHEN c.check_id = 18 THEN 
                'evidence_count=' || card.ev_count::text || 
                ', dataset_version_count=' || card.dv_count::text || 
                ', current_database=' || current_database()
        END AS observed,
        CASE 
            WHEN c.check_id = 1 THEN 
                CASE WHEN ev.id = 'e0140000-0000-0000-0000-000000000041'::uuid THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 2 THEN 
                CASE WHEN ev.artifact_name = 'mopr_lgd_subdistrict_directory_ts.json' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 3 THEN 
                CASE WHEN ev.artifact_sha256 = '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 4 THEN 
                CASE WHEN ev.verification_authority = 'Ministry of Panchayati Raj, Government of India' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 5 THEN 
                CASE WHEN ev.verified_by = 'LGD Subdistrict Directory Ingest Engine' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 6 THEN 
                CASE WHEN dv.id = 'ts_lgd_mandals_staging_official_v1' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 7 THEN 
                CASE WHEN dv.dataset_id = 'ts_lgd_mandals' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 8 THEN 
                CASE WHEN dv.version_tag = 'staging_acceptance_official_v1' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 9 THEN 
                CASE WHEN dv.effective_from = '2023-01-01'::date THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 10 THEN 
                CASE WHEN dv.record_count = 589 THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 11 THEN 
                CASE WHEN dv.checksum_sha256 = '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 12 THEN 
                CASE WHEN dv.default_status = 'OFFICIAL' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 13 THEN 
                CASE WHEN dv.verification_evidence_id = 'e0140000-0000-0000-0000-000000000041'::uuid THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 14 THEN 
                CASE WHEN (dv.metadata->>'immutable')::boolean = true 
                      AND dv.metadata->>'environment' = 'staging_only' 
                      AND dv.metadata->>'infrastructure_purpose' = 'w014_acceptance_verification' 
                     THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 15 THEN 
                CASE WHEN dv.verification_evidence_id = ev.id AND ev.id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 16 THEN 
                CASE WHEN trg.ev_trg_enabled = 'O' AND trg.dv_trg_enabled = 'O' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 17 THEN 
                CASE WHEN bl.dist_status = 'UNVERIFIED' AND bl.lgd_status = 'UNVERIFIED' THEN 'PASS' ELSE 'FAIL' END
            WHEN c.check_id = 18 THEN 
                CASE WHEN card.ev_count = 1 AND card.dv_count = 1 THEN 'PASS' ELSE 'FAIL' END
        END AS verdict
    FROM checks c
    LEFT JOIN ev ON true
    LEFT JOIN dv ON true
    CROSS JOIN trg
    CROSS JOIN bl
    CROSS JOIN card
)
SELECT 
    check_id,
    check_name,
    expected,
    observed,
    verdict
FROM individual_checks

UNION ALL

SELECT 
    19 AS check_id,
    'W014 Staging Acceptance Fixture Suite Summary' AS check_name,
    'All 18 checks PASS' AS expected,
    count(*) FILTER (WHERE verdict = 'PASS') || '/18 checks passed' AS observed,
    CASE 
        WHEN count(*) = 18 AND count(*) FILTER (WHERE verdict = 'PASS') = 18 THEN 'PASS' 
        ELSE 'FAIL' 
    END AS verdict
FROM individual_checks

ORDER BY check_id;
