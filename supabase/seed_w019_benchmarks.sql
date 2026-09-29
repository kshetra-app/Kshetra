-- =============================================================================
-- Seed Script: W019 Official Historical Election Benchmarks (ECI Form 21E)
-- =============================================================================
-- Milestone: W019 — Election Data Normalization
-- Authoritative Sources:
-- 1. Kodangal (TS-AC-065) — ECI Form 21E / Telangana Gazette No. 2023/AC/141
-- 2. Gajwel (TS-AC-040) — ECI Form 21E / Statistical Report 2023
-- =============================================================================

DO $$
DECLARE
  v_provenance_id UUID := '01900000-0000-0000-0000-000000000001'::uuid;
  v_election_id UUID := '01900000-0000-0000-0000-000000000002'::uuid;
  v_kodangal_contest_id UUID := '01900000-0000-0000-0000-000000000003'::uuid;
  v_gajwel_contest_id UUID := '01900000-0000-0000-0000-000000000004'::uuid;
  
  v_person_revanth UUID := '01900000-0000-0000-0000-000000000011'::uuid;
  v_person_narender UUID := '01900000-0000-0000-0000-000000000012'::uuid;
  v_person_bramesh UUID := '01900000-0000-0000-0000-000000000013'::uuid;
  v_person_kcr UUID := '01900000-0000-0000-0000-000000000014'::uuid;
  v_person_eatala UUID := '01900000-0000-0000-0000-000000000015'::uuid;
  v_person_narsa UUID := '01900000-0000-0000-0000-000000000016'::uuid;

  v_cand_revanth UUID := '01900000-0000-0000-0000-000000000021'::uuid;
  v_cand_narender UUID := '01900000-0000-0000-0000-000000000022'::uuid;
  v_cand_bramesh UUID := '01900000-0000-0000-0000-000000000023'::uuid;
  v_cand_kcr UUID := '01900000-0000-0000-0000-000000000024'::uuid;
  v_cand_eatala UUID := '01900000-0000-0000-0000-000000000025'::uuid;
  v_cand_narsa UUID := '01900000-0000-0000-0000-000000000026'::uuid;
BEGIN
  -- 1. Provenance Record
  INSERT INTO public.provenance_records (id)
  VALUES (v_provenance_id)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Political Organizations
  INSERT INTO public.political_organizations (
    id, org_type, name, short_name, recognition_level, headquarters_state, provenance_id, data_status
  ) VALUES
    ('ORG-PARTY-INC', 'political_party', 'Indian National Congress', 'INC', 'national', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BRS', 'political_party', 'Bharat Rashtra Samithi', 'BRS', 'state', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BJP', 'political_party', 'Bharatiya Janata Party', 'BJP', 'national', 'TS', v_provenance_id, 'OFFICIAL')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name;

  -- 3. Canonical Persons
  INSERT INTO public.canonical_persons (
    id, canonical_name, aliases, data_status, provenance_id
  ) VALUES
    (v_person_revanth, 'Anumula Revanth Reddy', ARRAY['A. Revanth Reddy', 'Revanth Reddy'], 'OFFICIAL', v_provenance_id),
    (v_person_narender, 'Patnam Narender Reddy', ARRAY['P. Narender Reddy'], 'OFFICIAL', v_provenance_id),
    (v_person_bramesh, 'Bantu Ramesh Kumar', ARRAY['B. Ramesh Kumar'], 'OFFICIAL', v_provenance_id),
    (v_person_kcr, 'Kalvakuntla Chandrashekar Rao', ARRAY['K. Chandrashekar Rao', 'KCR'], 'OFFICIAL', v_provenance_id),
    (v_person_eatala, 'Eatala Rajender', ARRAY['E. Rajender'], 'OFFICIAL', v_provenance_id),
    (v_person_narsa, 'Tumkunta Narsa Reddy', ARRAY['T. Narsa Reddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000017'::uuid, 'Kodangal Independent Candidates Pool', ARRAY['Other Contestants'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000018'::uuid, 'Gajwel Independent Candidates Pool', ARRAY['Other Contestants'], 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name;

  -- 4. Benchmark Constituencies
  INSERT INTO public.constituencies (
    id, ac_no, name, state_code, district, reservation_status
  ) VALUES
    ('TS-AC-065', 65, 'Kodangal', 'TS', 'Vikarabad', 'GEN'),
    ('TS-AC-040', 40, 'Gajwel', 'TS', 'Siddipet', 'GEN')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    district = EXCLUDED.district;

  -- 5. Election Event: TS_LA_2023_GEN
  INSERT INTO public.election_events (
    id, election_code, state_code, election_type, election_year, title,
    notification_date, polling_date, counting_date, status,
    total_constituencies, total_electors, total_votes_polled, turnout_percentage,
    data_status, provenance_id
  ) VALUES (
    v_election_id,
    'TS_LA_2023_GEN',
    'TS',
    'assembly',
    2023,
    'Telangana Legislative Assembly General Election 2023',
    '2023-11-03',
    '2023-11-30',
    '2023-12-03',
    'completed',
    119,
    32618205,
    23259256,
    71.31,
    'OFFICIAL',
    v_provenance_id
  ) ON CONFLICT (election_code) DO UPDATE SET
    title = EXCLUDED.title,
    turnout_percentage = EXCLUDED.turnout_percentage;

  -- 6. Election Contests
  -- Contest 1: Kodangal (TS-AC-065)
  INSERT INTO public.election_contests (
    id, election_id, contest_code, constituency_id, constituency_name,
    reservation_status, status, is_uncontested,
    total_electors, total_votes_polled, total_valid_votes, total_rejected_votes, total_nota_votes,
    turnout_percentage, victory_margin, data_status, provenance_id
  ) VALUES (
    v_kodangal_contest_id,
    v_election_id,
    'TS_LA_2023_GEN_TS-AC-065',
    'TS-AC-065',
    'Kodangal',
    'GEN',
    'completed',
    false,
    240490,
    195509,
    194545,
    964,
    964,
    81.30,
    32532,
    'OFFICIAL',
    v_provenance_id
  ) ON CONFLICT (contest_code) DO UPDATE SET
    total_electors = EXCLUDED.total_electors,
    total_votes_polled = EXCLUDED.total_votes_polled,
    total_valid_votes = EXCLUDED.total_valid_votes,
    total_rejected_votes = EXCLUDED.total_rejected_votes,
    total_nota_votes = EXCLUDED.total_nota_votes,
    turnout_percentage = EXCLUDED.turnout_percentage,
    victory_margin = EXCLUDED.victory_margin;

  -- Contest 2: Gajwel (TS-AC-040)
  INSERT INTO public.election_contests (
    id, election_id, contest_code, constituency_id, constituency_name,
    reservation_status, status, is_uncontested,
    total_electors, total_votes_polled, total_valid_votes, total_rejected_votes, total_nota_votes,
    turnout_percentage, victory_margin, data_status, provenance_id
  ) VALUES (
    v_gajwel_contest_id,
    v_election_id,
    'TS_LA_2023_GEN_TS-AC-040',
    'TS-AC-040',
    'Gajwel',
    'GEN',
    'completed',
    false,
    267882,
    241855,
    240508,
    1347,
    1347,
    90.28,
    19931,
    'OFFICIAL',
    v_provenance_id
  ) ON CONFLICT (contest_code) DO UPDATE SET
    total_electors = EXCLUDED.total_electors,
    total_votes_polled = EXCLUDED.total_votes_polled,
    total_valid_votes = EXCLUDED.total_valid_votes,
    total_rejected_votes = EXCLUDED.total_rejected_votes,
    total_nota_votes = EXCLUDED.total_nota_votes,
    turnout_percentage = EXCLUDED.turnout_percentage,
    victory_margin = EXCLUDED.victory_margin;

  -- 7. Candidacies
  -- Kodangal Candidates (Top 3 + Other Contestants balancing to total_valid_votes = 194,545)
  INSERT INTO public.candidacies (
    id, contest_id, person_id, election_year, election_type, constituency_type, constituency_id,
    party_id, is_independent, result, votes_received, vote_share, rank,
    evm_votes, postal_votes, data_status, provenance_id
  ) VALUES
    (v_cand_revanth, v_kodangal_contest_id, v_person_revanth, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-INC', false, 'won', 107429, 55.22, 1, 106820, 609, 'OFFICIAL', v_provenance_id),
    (v_cand_narender, v_kodangal_contest_id, v_person_narender, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BRS', false, 'lost', 74897, 38.50, 2, 74431, 466, 'OFFICIAL', v_provenance_id),
    (v_cand_bramesh, v_kodangal_contest_id, v_person_bramesh, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BJP', false, 'lost', 4079, 2.10, 3, 4048, 31, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000027'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0000-000000000017'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 7176, 3.69, 4, 7150, 26, 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    votes_received = EXCLUDED.votes_received,
    evm_votes = EXCLUDED.evm_votes,
    postal_votes = EXCLUDED.postal_votes,
    vote_share = EXCLUDED.vote_share,
    rank = EXCLUDED.rank;

  -- Gajwel Candidates (Top 3 + Other Contestants balancing to total_valid_votes = 240,508)
  INSERT INTO public.candidacies (
    id, contest_id, person_id, election_year, election_type, constituency_type, constituency_id,
    party_id, is_independent, result, votes_received, vote_share, rank,
    evm_votes, postal_votes, data_status, provenance_id
  ) VALUES
    (v_cand_kcr, v_gajwel_contest_id, v_person_kcr, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-BRS', false, 'won', 111684, 46.44, 1, 110984, 700, 'OFFICIAL', v_provenance_id),
    (v_cand_eatala, v_gajwel_contest_id, v_person_eatala, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-BJP', false, 'lost', 91753, 38.15, 2, 91203, 550, 'OFFICIAL', v_provenance_id),
    (v_cand_narsa, v_gajwel_contest_id, v_person_narsa, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-INC', false, 'lost', 32568, 13.54, 3, 32318, 250, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000028'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0000-000000000018'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     NULL, true, 'lost', 3156, 1.31, 4, 3130, 26, 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    votes_received = EXCLUDED.votes_received,
    evm_votes = EXCLUDED.evm_votes,
    postal_votes = EXCLUDED.postal_votes,
    vote_share = EXCLUDED.vote_share,
    rank = EXCLUDED.rank;

  -- 8. Ballot Choices (NOTA - strictly valid non-candidate ballot choice)
  INSERT INTO public.ballot_choices (
    contest_id, choice_type, is_valid_vote, votes_received, vote_share
  ) VALUES
    (v_kodangal_contest_id, 'NOTA', true, 964, 0.50),
    (v_gajwel_contest_id, 'NOTA', true, 1347, 0.56)
  ON CONFLICT (contest_id, choice_type) DO UPDATE SET
    is_valid_vote = EXCLUDED.is_valid_vote,
    votes_received = EXCLUDED.votes_received,
    vote_share = EXCLUDED.vote_share;

  -- 9. Refresh Contest Metrics
  PERFORM public.fn_refresh_contest_metrics(v_kodangal_contest_id);
  PERFORM public.fn_refresh_contest_metrics(v_gajwel_contest_id);

  RAISE NOTICE 'SUCCESS: Seeded W019 ECI Form 21E Benchmarks for Kodangal and Gajwel';
END $$;
