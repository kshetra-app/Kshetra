-- ==============================================================================
-- W021.5-B2.2-D Chunk 02 Post-Execution Acceptance Checkpoint
-- Scope: Canonical Persons (Part 1 of 4 - Rows 1 to 2,500)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- ==============================================================================

WITH checkpoint_metrics AS (
  SELECT
    -- ─── A. PERSON POPULATION ──────────────────────────────────────────────────
    (SELECT count(*) FROM public.canonical_persons 
     WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS b2_2d_persons_count,

    (SELECT count(*) FROM public.canonical_persons) AS total_canonical_persons,

    (SELECT count(*) FROM public.canonical_persons 
     WHERE id::text NOT LIKE '0215b22d-0001-0000-0000-%') AS non_namespace_persons_count,

    (SELECT min(id::text) FROM public.canonical_persons) AS min_person_id,
    (SELECT max(id::text) FROM public.canonical_persons) AS max_person_id,

    -- ─── B & C. STATE INTEGRITY & REFERENTIAL INVARIANTS ───────────────────────
    (SELECT count(*) FROM public.datasets 
     WHERE id = 'eci_candidate_disclosures_tenures') AS b2_2d_dataset_count,

    (SELECT count(*) FROM public.dataset_versions 
     WHERE id = 'eci_candidate_disclosures_tenures_2024_v1') AS b2_2d_version_count,

    (SELECT count(*) FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS b2_2d_anchor_count,

    (SELECT dataset_version_id FROM public.provenance_records 
     WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS anchor_target_version,

    (SELECT count(*) FROM public.candidacies) AS candidacies_count,
    (SELECT count(*) FROM public.candidate_affidavits) AS candidate_affidavits_count,
    (SELECT count(*) FROM public.political_organizations) AS political_organizations_count,
    (SELECT count(*) FROM public.states) AS states_count,

    -- ─── D. PERSON DATA INTEGRITY & CONSTRAINT CHECKS ─────────────────────────
    -- Name length constraint violations (< 2 or > 150)
    (SELECT count(*) FROM public.canonical_persons 
     WHERE char_length(canonical_name) < 2 OR char_length(canonical_name) > 150) AS invalid_name_length_count,

    -- Backslash corruption check (no names equal to '\' or ending with '\')
    (SELECT count(*) FROM public.canonical_persons 
     WHERE canonical_name = '\' OR canonical_name ~ '\\\\$') AS backslash_name_count,

    -- Null constraint check on required fields
    (SELECT count(*) FROM public.canonical_persons 
     WHERE canonical_name IS NULL OR data_status IS NULL OR provenance_id IS NULL) AS null_required_fields_count,

    -- Provenance FK integrity
    (SELECT count(*) FROM public.canonical_persons p 
     LEFT JOIN public.provenance_records r ON p.provenance_id = r.id 
     WHERE r.id IS NULL) AS orphan_provenance_persons_count
)
SELECT
  -- Aggregated Checkpoint Report
  jsonb_build_object(
    'checkpoint', 'W021.5-B2.2-D_CHUNK_02_ACCEPTANCE_CHECKPOINT',
    'timestamp', now(),
    'population', jsonb_build_object(
      'b2_2d_persons_count', b2_2d_persons_count,
      'expected_persons_count', 2500,
      'total_canonical_persons', total_canonical_persons,
      'non_namespace_persons_count', non_namespace_persons_count,
      'min_person_id', min_person_id,
      'max_person_id', max_person_id,
      'status', CASE WHEN b2_2d_persons_count = 2500 AND non_namespace_persons_count = 0 THEN 'PASS' ELSE 'FAIL' END
    ),
    'state_integrity', jsonb_build_object(
      'dataset_count', b2_2d_dataset_count,
      'version_count', b2_2d_version_count,
      'anchor_count', b2_2d_anchor_count,
      'anchor_target_version', anchor_target_version,
      'candidacies_count', candidacies_count,
      'candidate_affidavits_count', candidate_affidavits_count,
      'political_organizations_count', political_organizations_count,
      'states_count', states_count,
      'status', CASE WHEN b2_2d_dataset_count = 1 
                      AND b2_2d_version_count = 1 
                      AND b2_2d_anchor_count = 1 
                      AND anchor_target_version = 'eci_candidate_disclosures_tenures_2024_v1'
                      AND candidacies_count = 0 
                      AND candidate_affidavits_count = 0 
                      AND political_organizations_count = 107 
                      AND states_count = 36 THEN 'PASS' ELSE 'FAIL' END
    ),
    'data_integrity', jsonb_build_object(
      'invalid_name_length_count', invalid_name_length_count,
      'backslash_name_count', backslash_name_count,
      'null_required_fields_count', null_required_fields_count,
      'orphan_provenance_persons_count', orphan_provenance_persons_count,
      'status', CASE WHEN invalid_name_length_count = 0 
                      AND backslash_name_count = 0 
                      AND null_required_fields_count = 0 
                      AND orphan_provenance_persons_count = 0 THEN 'PASS' ELSE 'FAIL' END
    ),
    'overall_verdict', CASE WHEN b2_2d_persons_count = 2500 
                             AND non_namespace_persons_count = 0
                             AND b2_2d_dataset_count = 1 
                             AND b2_2d_version_count = 1 
                             AND b2_2d_anchor_count = 1 
                             AND anchor_target_version = 'eci_candidate_disclosures_tenures_2024_v1'
                             AND candidacies_count = 0 
                             AND candidate_affidavits_count = 0 
                             AND political_organizations_count = 107 
                             AND states_count = 36 
                             AND invalid_name_length_count = 0 
                             AND backslash_name_count = 0 
                             AND null_required_fields_count = 0 
                             AND orphan_provenance_persons_count = 0 
                        THEN 'CHUNK_02_CHECKPOINT_PASS' 
                        ELSE 'CHUNK_02_CHECKPOINT_FAIL' END
  ) AS checkpoint_result
FROM checkpoint_metrics;
