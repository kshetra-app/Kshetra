-- ==============================================================================
-- W021.5-B2.2-D Chunk 09B Post-Execution Acceptance Checkpoint
-- Scope: Candidacies (Part 4B - Rows 8,051 to 9,200, Cumulative 9,181)
-- Accounting: 1,150 raw tuples, 18 conflict skips, 1,132 net inserts
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- Directive: W021.5-CTO-CHUNK09B-PRE-DISPATCH-REVIEW-001
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
     WHERE id::text > '0215b22d-0002-0000-0000-000000009200') AS ids_above_9200_count,

    (SELECT count(*) FROM (
       SELECT id FROM public.candidacies GROUP BY id HAVING count(*) > 1
     ) d) AS duplicate_ids_count,

    (SELECT min(id::text) FROM public.candidacies) AS min_candidacy_id,
    (SELECT max(id::text) FROM public.candidacies) AS max_candidacy_id,

    -- ─── B. BOUNDARY & SEQUENCE INTEGRITY ────────────────────────────────────────
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000000001'::uuid)) AS id_0001_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000000823'::uuid)) AS id_0823_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000001150'::uuid)) AS id_1150_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000001151'::uuid)) AS id_1151_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002300'::uuid)) AS id_2300_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003450'::uuid)) AS id_3450_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003451'::uuid)) AS id_3451_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000004600'::uuid)) AS id_4600_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000004601'::uuid)) AS id_4601_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000005750'::uuid)) AS id_5750_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000005751'::uuid)) AS id_5751_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000006795'::uuid)) AS id_6795_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000006796'::uuid)) AS id_6796_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000006797'::uuid)) AS id_6797_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000006900'::uuid)) AS id_6900_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000006901'::uuid)) AS id_6901_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008050'::uuid)) AS id_8050_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008051'::uuid)) AS id_8051_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000009200'::uuid)) AS id_9200_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000009201'::uuid)) AS id_9201_present,

    -- ─── C. 18 PROPOSED 09B DISCARDED IDS (MUST BE ABSENT / FALSE) ──────────────
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008607'::uuid)) AS id_8607_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008613'::uuid)) AS id_8613_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008619'::uuid)) AS id_8619_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008620'::uuid)) AS id_8620_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008633'::uuid)) AS id_8633_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008648'::uuid)) AS id_8648_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008656'::uuid)) AS id_8656_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008659'::uuid)) AS id_8659_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008662'::uuid)) AS id_8662_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008664'::uuid)) AS id_8664_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008684'::uuid)) AS id_8684_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008689'::uuid)) AS id_8689_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008691'::uuid)) AS id_8691_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008693'::uuid)) AS id_8693_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008701'::uuid)) AS id_8701_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008702'::uuid)) AS id_8702_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008704'::uuid)) AS id_8704_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000008709'::uuid)) AS id_8709_present,

    -- ─── D. 18 RETAINED BASELINE COUNTERPARTS (MUST BE PRESENT / TRUE) ───────────
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002343'::uuid)) AS id_2343_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002311'::uuid)) AS id_2311_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002374'::uuid)) AS id_2374_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002312'::uuid)) AS id_2312_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002301'::uuid)) AS id_2301_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002339'::uuid)) AS id_2339_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002355'::uuid)) AS id_2355_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002370'::uuid)) AS id_2370_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002283'::uuid)) AS id_2283_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002359'::uuid)) AS id_2359_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002347'::uuid)) AS id_2347_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002325'::uuid)) AS id_2325_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002316'::uuid)) AS id_2316_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002327'::uuid)) AS id_2327_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002393'::uuid)) AS id_2393_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002286'::uuid)) AS id_2286_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002350'::uuid)) AS id_2350_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000002358'::uuid)) AS id_2358_present,

    -- ─── E. FOREIGN KEY & REFERENTIAL INTEGRITY ───────────────────────────────────
    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.canonical_persons p ON c.person_id = p.id
     WHERE p.id IS NULL) AS orphan_person_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.political_organizations o ON c.party_id = o.id
     WHERE c.party_id IS NOT NULL AND o.id IS NULL) AS orphan_party_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.provenance_records r ON c.provenance_id = r.id
     WHERE r.id IS NULL) AS orphan_provenance_candidacies_count,

    -- ─── F. CONSTRAINT VALIDATIONS ────────────────────────────────────────────────
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

    -- ─── G. SURROUNDING STATE PRESERVATION ────────────────────────────────────────
    (SELECT count(*) FROM public.canonical_persons) AS canonical_persons_count,
    (SELECT count(*) FROM public.political_organizations) AS political_organizations_count,
    (SELECT count(*) FROM public.states) AS states_count,
    (SELECT count(*) FROM public.candidate_affidavits) AS candidate_affidavits_count
)
SELECT
  jsonb_build_object(
    'checkpoint', 'W021.5-B2.2-D_CHUNK_09B_ACCEPTANCE_CHECKPOINT',
    'timestamp', now(),
    'population', jsonb_build_object(
      'b2_2d_candidacies_count', b2_2d_candidacies_count,
      'expected_candidacies_count', 9181,
      'total_candidacies', total_candidacies,
      'non_namespace_candidacies_count', non_namespace_candidacies_count,
      'ids_above_9200_count', ids_above_9200_count,
      'duplicate_ids_count', duplicate_ids_count,
      'min_candidacy_id', min_candidacy_id,
      'max_candidacy_id', max_candidacy_id,
      'id_0001_present', id_0001_present,
      'id_0823_present', id_0823_present,
      'id_1150_present', id_1150_present,
      'id_1151_present', id_1151_present,
      'id_2300_present', id_2300_present,
      'id_3450_present', id_3450_present,
      'id_3451_present', id_3451_present,
      'id_4600_present', id_4600_present,
      'id_4601_present', id_4601_present,
      'id_5750_present', id_5750_present,
      'id_5751_present', id_5751_present,
      'id_6795_present', id_6795_present,
      'id_6796_present', id_6796_present,
      'id_6797_present', id_6797_present,
      'id_6900_present', id_6900_present,
      'id_6901_present', id_6901_present,
      'id_8050_present', id_8050_present,
      'id_8051_present', id_8051_present,
      'id_9200_present', id_9200_present,
      'id_9201_present', id_9201_present,
      'status', CASE 
        WHEN b2_2d_candidacies_count = 9181 
         AND total_candidacies = 9181 
         AND non_namespace_candidacies_count = 0
         AND ids_above_9200_count = 0
         AND duplicate_ids_count = 0
         AND min_candidacy_id = '0215b22d-0002-0000-0000-000000000001'
         AND max_candidacy_id = '0215b22d-0002-0000-0000-000000009200'
         AND id_0001_present = true
         AND id_0823_present = true
         AND id_1150_present = true
         AND id_1151_present = true
         AND id_2300_present = true
         AND id_3450_present = true
         AND id_3451_present = true
         AND id_4600_present = true
         AND id_4601_present = true
         AND id_5750_present = true
         AND id_5751_present = true
         AND id_6795_present = true
         AND id_6796_present = false
         AND id_6797_present = true
         AND id_6900_present = true
         AND id_6901_present = true
         AND id_8050_present = true
         AND id_8051_present = true
         AND id_9200_present = true
         AND id_9201_present = false
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'conflict_reconciliation', jsonb_build_object(
      'expected_skips_count', 18,
      'proposed_09b_ids_absence_verified', (
        NOT id_8607_present AND NOT id_8613_present AND NOT id_8619_present AND
        NOT id_8620_present AND NOT id_8633_present AND NOT id_8648_present AND
        NOT id_8656_present AND NOT id_8659_present AND NOT id_8662_present AND
        NOT id_8664_present AND NOT id_8684_present AND NOT id_8689_present AND
        NOT id_8691_present AND NOT id_8693_present AND NOT id_8701_present AND
        NOT id_8702_present AND NOT id_8704_present AND NOT id_8709_present
      ),
      'retained_counterparts_presence_verified', (
        id_2343_present AND id_2311_present AND id_2374_present AND
        id_2312_present AND id_2301_present AND id_2339_present AND
        id_2355_present AND id_2370_present AND id_2283_present AND
        id_2359_present AND id_2347_present AND id_2325_present AND
        id_2316_present AND id_2327_present AND id_2393_present AND
        id_2286_present AND id_2350_present AND id_2358_present
      ),
      'skipped_proposed_ids', jsonb_build_object(
        'id_8607_absent', NOT id_8607_present,
        'id_8613_absent', NOT id_8613_present,
        'id_8619_absent', NOT id_8619_present,
        'id_8620_absent', NOT id_8620_present,
        'id_8633_absent', NOT id_8633_present,
        'id_8648_absent', NOT id_8648_present,
        'id_8656_absent', NOT id_8656_present,
        'id_8659_absent', NOT id_8659_present,
        'id_8662_absent', NOT id_8662_present,
        'id_8664_absent', NOT id_8664_present,
        'id_8684_absent', NOT id_8684_present,
        'id_8689_absent', NOT id_8689_present,
        'id_8691_absent', NOT id_8691_present,
        'id_8693_absent', NOT id_8693_present,
        'id_8701_absent', NOT id_8701_present,
        'id_8702_absent', NOT id_8702_present,
        'id_8704_absent', NOT id_8704_present,
        'id_8709_absent', NOT id_8709_present
      ),
      'retained_baseline_counterparts', jsonb_build_object(
        'id_2343_present', id_2343_present,
        'id_2311_present', id_2311_present,
        'id_2374_present', id_2374_present,
        'id_2312_present', id_2312_present,
        'id_2301_present', id_2301_present,
        'id_2339_present', id_2339_present,
        'id_2355_present', id_2355_present,
        'id_2370_present', id_2370_present,
        'id_2283_present', id_2283_present,
        'id_2359_present', id_2359_present,
        'id_2347_present', id_2347_present,
        'id_2325_present', id_2325_present,
        'id_2316_present', id_2316_present,
        'id_2327_present', id_2327_present,
        'id_2393_present', id_2393_present,
        'id_2286_present', id_2286_present,
        'id_2350_present', id_2350_present,
        'id_2358_present', id_2358_present
      ),
      'status', CASE 
        WHEN NOT id_8607_present AND NOT id_8613_present AND NOT id_8619_present AND
             NOT id_8620_present AND NOT id_8633_present AND NOT id_8648_present AND
             NOT id_8656_present AND NOT id_8659_present AND NOT id_8662_present AND
             NOT id_8664_present AND NOT id_8684_present AND NOT id_8689_present AND
             NOT id_8691_present AND NOT id_8693_present AND NOT id_8701_present AND
             NOT id_8702_present AND NOT id_8704_present AND NOT id_8709_present AND
             id_2343_present AND id_2311_present AND id_2374_present AND
             id_2312_present AND id_2301_present AND id_2339_present AND
             id_2355_present AND id_2370_present AND id_2283_present AND
             id_2359_present AND id_2347_present AND id_2325_present AND
             id_2316_present AND id_2327_present AND id_2393_present AND
             id_2286_present AND id_2350_present AND id_2358_present
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
      WHEN b2_2d_candidacies_count = 9181 
       AND total_candidacies = 9181 
       AND non_namespace_candidacies_count = 0
       AND ids_above_9200_count = 0
       AND duplicate_ids_count = 0
       AND id_0001_present = true
       AND id_0823_present = true
       AND id_1150_present = true
       AND id_1151_present = true
       AND id_2300_present = true
       AND id_3450_present = true
       AND id_3451_present = true
       AND id_4600_present = true
       AND id_4601_present = true
       AND id_5750_present = true
       AND id_5751_present = true
       AND id_6795_present = true
       AND id_6796_present = false
       AND id_6797_present = true
       AND id_6900_present = true
       AND id_6901_present = true
       AND id_8050_present = true
       AND id_8051_present = true
       AND id_9200_present = true
       AND id_9201_present = false
       AND NOT id_8607_present AND NOT id_8613_present AND NOT id_8619_present
       AND NOT id_8620_present AND NOT id_8633_present AND NOT id_8648_present
       AND NOT id_8656_present AND NOT id_8659_present AND NOT id_8662_present
       AND NOT id_8664_present AND NOT id_8684_present AND NOT id_8689_present
       AND NOT id_8691_present AND NOT id_8693_present AND NOT id_8701_present
       AND NOT id_8702_present AND NOT id_8704_present AND NOT id_8709_present
       AND id_2343_present AND id_2311_present AND id_2374_present
       AND id_2312_present AND id_2301_present AND id_2339_present
       AND id_2355_present AND id_2370_present AND id_2283_present
       AND id_2359_present AND id_2347_present AND id_2325_present
       AND id_2316_present AND id_2327_present AND id_2393_present
       AND id_2286_present AND id_2350_present AND id_2358_present
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
      THEN 'CHUNK_09B_ACCEPTANCE_CHECKPOINT_PASS'
      ELSE 'CHUNK_09B_ACCEPTANCE_CHECKPOINT_FAIL'
    END
  ) AS checkpoint_result
FROM checkpoint_metrics;
