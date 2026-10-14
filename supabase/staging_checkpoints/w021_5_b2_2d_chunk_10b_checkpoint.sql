-- ==============================================================================
-- W021.5-B2.2-D Chunk 10B Post-Execution Acceptance Checkpoint
-- Scope: Candidacies (Part 5B - Rows 10,301 to 11,334, Cumulative 11,298)
-- Accounting: 1,034 raw tuples, 16 conflict skips (Items #21-#36), 1,018 net inserts
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- Directive: W021.5-CTO-CHUNK10A-ACCEPTANCE-001 / Proposed 10B Dispatch
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
     WHERE id::text > '0215b22d-0002-0000-0000-000000011334') AS ids_above_11334_count,

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
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010300'::uuid)) AS id_10300_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010301'::uuid)) AS id_10301_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000011334'::uuid)) AS id_11334_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000011335'::uuid)) AS id_11335_present,

    -- ─── C. 10B CONFLICT SKIPS & RECONCILIATION VERIFICATION (ITEMS #21-#36) ─────
    -- Discarded/Skipped Proposed IDs (All must be absent = false)
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010420'::uuid)) AS id_10420_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010427'::uuid)) AS id_10427_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010431'::uuid)) AS id_10431_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010438'::uuid)) AS id_10438_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010466'::uuid)) AS id_10466_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010480'::uuid)) AS id_10480_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010489'::uuid)) AS id_10489_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010495'::uuid)) AS id_10495_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010516'::uuid)) AS id_10516_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010519'::uuid)) AS id_10519_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010523'::uuid)) AS id_10523_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010526'::uuid)) AS id_10526_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010533'::uuid)) AS id_10533_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010571'::uuid)) AS id_10571_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000010574'::uuid)) AS id_10574_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000011148'::uuid)) AS id_11148_present,

    -- Retained Counterpart IDs (All must be present = true)
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003798'::uuid)) AS id_3798_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003605'::uuid)) AS id_3605_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003755'::uuid)) AS id_3755_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003603'::uuid)) AS id_3603_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003669'::uuid)) AS id_3669_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003748'::uuid)) AS id_3748_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003753'::uuid)) AS id_3753_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003638'::uuid)) AS id_3638_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003610'::uuid)) AS id_3610_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003710'::uuid)) AS id_3710_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003662'::uuid)) AS id_3662_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003634'::uuid)) AS id_3634_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003784'::uuid)) AS id_3784_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003775'::uuid)) AS id_3775_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000003736'::uuid)) AS id_3736_present,
    (SELECT EXISTS(SELECT 1 FROM public.candidacies WHERE id = '0215b22d-0002-0000-0000-000000004524'::uuid)) AS id_4524_present,

    -- ─── D. FOREIGN KEY & REFERENTIAL INTEGRITY ───────────────────────────────────
    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.canonical_persons p ON c.person_id = p.id
     WHERE p.id IS NULL) AS orphan_person_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.political_organizations o ON c.party_id = o.id
     WHERE c.party_id IS NOT NULL AND o.id IS NULL) AS orphan_party_candidacies_count,

    (SELECT count(*) FROM public.candidacies c
     LEFT JOIN public.provenance_records r ON c.provenance_id = r.id
     WHERE r.id IS NULL) AS orphan_provenance_candidacies_count,

    -- ─── E. CONSTRAINT VALIDATIONS ────────────────────────────────────────────────
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

    -- ─── F. SURROUNDING STATE PRESERVATION ────────────────────────────────────────
    (SELECT count(*) FROM public.canonical_persons) AS canonical_persons_count,
    (SELECT count(*) FROM public.political_organizations) AS political_organizations_count,
    (SELECT count(*) FROM public.states) AS states_count,
    (SELECT count(*) FROM public.candidate_affidavits) AS candidate_affidavits_count
)
SELECT
  jsonb_build_object(
    'checkpoint', 'W021.5-B2.2-D_CHUNK_10B_ACCEPTANCE_CHECKPOINT',
    'timestamp', now(),
    'population', jsonb_build_object(
      'b2_2d_candidacies_count', b2_2d_candidacies_count,
      'expected_candidacies_count', 11298,
      'total_candidacies', total_candidacies,
      'non_namespace_candidacies_count', non_namespace_candidacies_count,
      'ids_above_11334_count', ids_above_11334_count,
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
      'id_10300_present', id_10300_present,
      'id_10301_present', id_10301_present,
      'id_11334_present', id_11334_present,
      'id_11335_present', id_11335_present,
      'status', CASE 
        WHEN b2_2d_candidacies_count = 11298 
         AND total_candidacies = 11298 
         AND non_namespace_candidacies_count = 0
         AND ids_above_11334_count = 0
         AND duplicate_ids_count = 0
         AND min_candidacy_id = '0215b22d-0002-0000-0000-000000000001'
         AND max_candidacy_id = '0215b22d-0002-0000-0000-000000011334'
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
         AND id_9201_present = true
         AND id_10300_present = true
         AND id_10301_present = true
         AND id_11334_present = true
         AND id_11335_present = false
        THEN 'PASS' ELSE 'FAIL' END
    ),
    'conflict_reconciliation', jsonb_build_object(
      'items_range', '#21-#36',
      'expected_skips_count', 16,
      'all_16_proposed_ids_absent', (
        NOT id_10420_present AND NOT id_10427_present AND NOT id_10431_present AND NOT id_10438_present AND
        NOT id_10466_present AND NOT id_10480_present AND NOT id_10489_present AND NOT id_10495_present AND
        NOT id_10516_present AND NOT id_10519_present AND NOT id_10523_present AND NOT id_10526_present AND
        NOT id_10533_present AND NOT id_10571_present AND NOT id_10574_present AND NOT id_11148_present
      ),
      'all_16_retained_counterparts_present', (
        id_3798_present AND id_3605_present AND id_3755_present AND id_3603_present AND
        id_3669_present AND id_3748_present AND id_3753_present AND id_3638_present AND
        id_3610_present AND id_3710_present AND id_3662_present AND id_3634_present AND
        id_3784_present AND id_3775_present AND id_3736_present AND id_4524_present
      ),
      'status', CASE 
        WHEN NOT id_10420_present AND NOT id_10427_present AND NOT id_10431_present AND NOT id_10438_present AND
             NOT id_10466_present AND NOT id_10480_present AND NOT id_10489_present AND NOT id_10495_present AND
             NOT id_10516_present AND NOT id_10519_present AND NOT id_10523_present AND NOT id_10526_present AND
             NOT id_10533_present AND NOT id_10571_present AND NOT id_10574_present AND NOT id_11148_present AND
             id_3798_present AND id_3605_present AND id_3755_present AND id_3603_present AND
             id_3669_present AND id_3748_present AND id_3753_present AND id_3638_present AND
             id_3610_present AND id_3710_present AND id_3662_present AND id_3634_present AND
             id_3784_present AND id_3775_present AND id_3736_present AND id_4524_present
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
      WHEN b2_2d_candidacies_count = 11298 
       AND total_candidacies = 11298 
       AND non_namespace_candidacies_count = 0
       AND ids_above_11334_count = 0
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
       AND id_9201_present = true
       AND id_10300_present = true
       AND id_10301_present = true
       AND id_11334_present = true
       AND id_11335_present = false
       AND NOT id_10420_present AND NOT id_10427_present AND NOT id_10431_present AND NOT id_10438_present
       AND NOT id_10466_present AND NOT id_10480_present AND NOT id_10489_present AND NOT id_10495_present
       AND NOT id_10516_present AND NOT id_10519_present AND NOT id_10523_present AND NOT id_10526_present
       AND NOT id_10533_present AND NOT id_10571_present AND NOT id_10574_present AND NOT id_11148_present
       AND id_3798_present AND id_3605_present AND id_3755_present AND id_3603_present
       AND id_3669_present AND id_3748_present AND id_3753_present AND id_3638_present
       AND id_3610_present AND id_3710_present AND id_3662_present AND id_3634_present
       AND id_3784_present AND id_3775_present AND id_3736_present AND id_4524_present
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
      THEN 'CHUNK_10B_ACCEPTANCE_CHECKPOINT_PASS'
      ELSE 'CHUNK_10B_ACCEPTANCE_CHECKPOINT_FAIL'
    END
  ) AS checkpoint_result
FROM checkpoint_metrics;
