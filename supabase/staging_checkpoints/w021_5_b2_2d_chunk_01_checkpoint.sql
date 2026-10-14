-- ==============================================================================
-- W021.5-B2.2-D Chunk 01 Post-Execution Acceptance Checkpoint
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- ==============================================================================

SELECT
  -- 1. B2.2-D Dataset Existence
  (SELECT count(*) FROM public.datasets WHERE id = 'eci_candidate_disclosures_tenures') AS b2_2d_dataset_count,
  -- 2. B2.2-D Dataset Version Existence
  (SELECT count(*) FROM public.dataset_versions WHERE id = 'eci_candidate_disclosures_tenures_2024_v1') AS b2_2d_version_count,
  -- 3. B2.2-D Provenance Anchor Existence
  (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS b2_2d_anchor_count,
  -- 4. Provenance Anchor Target Version Linkage
  (SELECT dataset_version_id FROM public.provenance_records WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS anchor_target_version,
  -- 5. Canonical Persons Unpopulated Status
  (SELECT count(*) FROM public.canonical_persons) AS canonical_persons_count,
  -- 6. Candidacies Unpopulated Status
  (SELECT count(*) FROM public.candidacies) AS candidacies_count,
  -- 7. Candidate Affidavits Unpopulated Status
  (SELECT count(*) FROM public.candidate_affidavits) AS candidate_affidavits_count,
  -- 8. Unrelated Political Organizations Preservation (Migration 065)
  (SELECT count(*) FROM public.political_organizations) AS political_organizations_count,
  -- 9. Unrelated States Preservation
  (SELECT count(*) FROM public.states) AS states_count;
