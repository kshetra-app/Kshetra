-- ==============================================================================
-- W021.5-B2.2-D Chunk 07A Post-Execution Acceptance Checkpoint
-- Scope: Candidacies (Part 2A - Rows 2,301 to 3,450, Cumulative 3,450)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- Directive: W021.5-CTO-AUTH-006B / W021.5-CTO-CHUNK07A-DISPATCH
-- ==============================================================================

WITH checkpoint_metrics AS (
  SELECT
    -- ─── A. CANDIDACY POPULATION METRICS ─────────────────────────────────────────
    (SELECT count(*) FROM public.candidacies 
     WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid) AS b2_2d_candidacies_count,

    (SELECT count(*) FROM public.candidacies) AS total_candidacies,

    (SELECT count(*) FROM public.candidacies 
     WHERE id::text NOT LIKE '0215b22d-0002-0000-0000-%') AS non_namespace_candidacies_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE id::text > '0215b22d-0002-0000-0000-000000003450') AS ids_above_3450_count,

    (SELECT count(*) FROM (
       SELECT id FROM public.candidacies GROUP BY id HAVING count(*) > 1
     ) d) AS duplicate_ids_count,

    (SELECT min(id::text) FROM public.candidacies) AS min_candidacy_id,
    (SELECT max(id::text) FROM public.candidacies) AS max_candidacy_id,

    -- Boundary IDs verification
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000000001'::uuid)) AS id_0001_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000001150'::uuid)) AS id_1150_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000001151'::uuid)) AS id_1151_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002300'::uuid)) AS id_2300_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002301'::uuid)) AS id_2301_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003450'::uuid)) AS id_3450_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003451'::uuid)) AS id_3451_present,

    -- ─── B. FOREIGN KEY & REFERENTIAL INTEGRITY ───────────────────────────────────
    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.canonical_persons p ON c.person_id = p.id
     WHERE p.id IS NULL) AS orphan_person_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.political_organizations o ON c.party_id = o.id
     WHERE c.party_id IS NOT NULL AND o.id IS NULL) AS orphan_party_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.provenance_records r ON c.provenance_id = r.id
     WHERE r.id IS NULL) AS orphan_provenance_candidacies_count,

    -- ─── C. CONSTRAINT VALIDATIONS ────────────────────────────────────────────────
    (SELECT count(*) FROM public.candidacies 
     WHERE election_year < 1947) AS invalid_election_year_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE election_type NOT IN ('parliamentary', 'assembly', 'local_body', 'by_election')) AS invalid_election_type_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE constituency_type NOT IN ('parliamentary', 'assembly', 'local_body_ward', 'panchayat')) AS invalid_constituency_type_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE result NOT IN ('won', 'lost', 'forfeited_deposit', 'withdrawn', 'pending')) AS invalid_result_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE vote_share < 0 OR vote_share > 100) AS invalid_vote_share_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE votes_received < 0) AS invalid_votes_received_count,

    (SELECT count(*) FROM public.candidacies 
     WHERE rank < 0) AS invalid_rank_count,

    -- ─── D. SURROUNDING STATE PRESERVATION ────────────────────────────────────────
    (SELECT count(*) FROM public.canonical_persons) AS canonical_persons_count,
    (SELECT count(*) FROM public.political_organizations) AS political_organizations_count,
    (SELECT count(*) FROM public.states) AS states_count,
    (SELECT count(*) FROM public.candidate_affidavits) AS candidate_affidavits_count
)
SELECT
  jsonb_build_object(
    'checkpoint', 'W021.5-B2.2-D_CHUNK_07A_ACCEPTANCE_CHECKPOINT',
    'timestamp', now(),
    'population', jsonb_build_object(
      'b2_2d_candidacies_count', b2_2d_candidacies_count,
      'expected_candidacies_count', 3450,
      'total_candidacies', total_candidacies,
      'non_namespace_candidacies_count', non_namespace_candidacies_count,
      'ids_above_3450_count', ids_above_3450_count,
      'duplicate_ids_count', duplicate_ids_count,
      'min_candidacy_id', min_candidacy_id,
      'max_candidacy_id', max_candidacy_id,
      'id_0001_present', id_0001_present,
      'id_1150_present', id_1150_present,
      'id_1151_present', id_1151_present,
      'id_2300_present', id_2300_present,
      'id_2301_present', id_2301_present,
      'id_3450_present', id_3450_present,
      'id_3451_present', id_3451_present,
      'status', CASE 
        WHEN b2_2d_candidacies_count = 3450 
         AND total_candidacies = 3450 
         AND non_namespace_candidacies_count = 0
         AND ids_above_3450_count = 0
         AND duplicate_ids_count = 0
         AND min_candidacy_id = '0215b22d-0002-0000-0000-000000000001'
         AND max_candidacy_id = '0215b22d-0002-0000-0000-000000003450'
         AND id_0001_present = true
         AND id_1150_present = true
         AND id_1151_present = true
         AND id_2300_present = true
         AND id_2301_present = true
         AND id_3450_present = true
         AND id_3451_present = false
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'referential_integrity', jsonb_build_object(
      'orphan_person_candidacies_count', orphan_person_candidacies_count,
      'orphan_party_candidacies_count', orphan_party_candidacies_count,
      'orphan_provenance_candidacies_count', orphan_provenance_candidacies_count,
      'status', CASE 
        WHEN orphan_person_candidacies_count = 0 
         AND orphan_party_candidacies_count = 0 
         AND orphan_provenance_candidacies_count = 0
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'data_integrity', jsonb_build_object(
      'invalid_election_year_count', invalid_election_year_count,
      'invalid_election_type_count', invalid_election_type_count,
      'invalid_constituency_type_count', invalid_constituency_type_count,
      'invalid_result_count', invalid_result_count,
      'invalid_vote_share_count', invalid_vote_share_count,
      'invalid_votes_received_count', invalid_votes_received_count,
      'invalid_rank_count', invalid_rank_count,
      'status', CASE 
        WHEN invalid_election_year_count = 0
         AND invalid_election_type_count = 0
         AND invalid_constituency_type_count = 0
         AND invalid_result_count = 0
         AND invalid_vote_share_count = 0
         AND invalid_votes_received_count = 0
         AND invalid_rank_count = 0
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'state_integrity', jsonb_build_object(
      'canonical_persons_count', canonical_persons_count,
      'political_organizations_count', political_organizations_count,
      'states_count', states_count,
      'candidate_affidavits_count', candidate_affidavits_count,
      'status', CASE 
        WHEN canonical_persons_count = 9083 
         AND political_organizations_count = 107
         AND states_count = 36
         AND candidate_affidavits_count = 0
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'overall_verdict', CASE 
      WHEN b2_2d_candidacies_count = 3450 
       AND total_candidacies = 3450 
       AND non_namespace_candidacies_count = 0
       AND ids_above_3450_count = 0
       AND duplicate_ids_count = 0
       AND id_0001_present = true
       AND id_1150_present = true
       AND id_1151_present = true
       AND id_2300_present = true
       AND id_2301_present = true
       AND id_3450_present = true
       AND id_3451_present = false
       AND orphan_person_candidacies_count = 0
       AND orphan_party_candidacies_count = 0
       AND orphan_provenance_candidacies_count = 0
       AND invalid_election_year_count = 0
       AND invalid_election_type_count = 0
       AND invalid_constituency_type_count = 0
       AND invalid_result_count = 0
       AND invalid_vote_share_count = 0
       AND invalid_votes_received_count = 0
       AND invalid_rank_count = 0
       AND canonical_persons_count = 9083 
       AND political_organizations_count = 107
       AND states_count = 36
       AND candidate_affidavits_count = 0
      THEN 'CHUNK_07A_ACCEPTANCE_CHECKPOINT_PASS'
      ELSE 'CHUNK_07A_ACCEPTANCE_CHECKPOINT_FAIL'
    END
  ) AS checkpoint_result
FROM checkpoint_metrics;
