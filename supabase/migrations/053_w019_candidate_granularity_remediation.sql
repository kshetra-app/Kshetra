-- =============================================================================
-- Migration 053: W019 Complete Candidate Granularity Remediation
-- =============================================================================
-- Directive: CTO FINAL W019 CANDIDATE-GRANULARITY REMEDIATION
-- Milestone: W019 — Election Data Normalization
--
-- Mandate:
-- 1. Eliminate candidate pools ("Independent Candidates Pool (10)" and "(13)").
-- 2. Expand every authoritative candidate into an individual canonical candidacy row.
-- 3. Connect every candidate to public.canonical_persons.
-- 4. Preserve exact source spelling and known name variants.
-- 5. Guarantee complete candidate ranking:
--    Rank 1 = Winner, Rank 2 = Runner-up, Rank 3 = Third-place candidate,
--    Rank 4+ = Fourth-place candidate ... through the final candidate.
-- 6. Maintain NOTA as a separate ballot choice without candidate rank.
-- =============================================================================

DO $$
DECLARE
  v_provenance_id UUID := '01900000-0000-0000-0000-000000000001'::uuid;
  v_election_id UUID := '01900000-0000-0000-0000-000000000002'::uuid;
  v_kodangal_contest_id UUID := '01900000-0000-0000-0000-000000000003'::uuid;
  v_gajwel_contest_id UUID := '01900000-0000-0000-0000-000000000004'::uuid;
BEGIN
  -- 1. Ensure Provenance Record Exists
  INSERT INTO public.provenance_records (id)
  VALUES (v_provenance_id)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Political Organizations for All Candidates
  INSERT INTO public.political_organizations (
    id, org_type, name, short_name, recognition_level, headquarters_state, provenance_id, data_status
  ) VALUES
    ('ORG-PARTY-INC', 'political_party', 'Indian National Congress', 'INC', 'national', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BRS', 'political_party', 'Bharat Rashtra Samithi', 'BRS', 'state', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BJP', 'political_party', 'Bharatiya Janata Party', 'BJP', 'national', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BSP', 'political_party', 'Bahujan Samaj Party', 'BSP', 'national', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-YTP', 'political_party', 'YSR Telangana Party', 'YTP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-DHSP', 'political_party', 'Dharma Samaj Party', 'DHSP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-BMP', 'political_party', 'Bahujan Mukti Party', 'BMP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-TERS', 'political_party', 'Telangana Rajya Samithi', 'TERS', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-AABAAD', 'political_party', 'All India Backward Classes Rashtra Samithi', 'AABAAD', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-PPP', 'political_party', 'Praja Parirakshana Party', 'PPP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-IPBP', 'political_party', 'Indian Praja Bandhu Party', 'IPBP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-SPI', 'political_party', 'Socialist Party (India)', 'SPI', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-MTRSP', 'political_party', 'Mana Telangana Rashtra Samithi Party', 'MTRSP', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL'),
    ('ORG-PARTY-SAPS', 'political_party', 'Samajika Parivarthana Samithi', 'SAPS', 'unrecognized', 'TS', v_provenance_id, 'OFFICIAL')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name;

  -- 3. Delete Historical Pool Candidacies and Pool Persons
  DELETE FROM public.candidacies
  WHERE id IN (
    '01900000-0000-0000-0000-000000000027'::uuid,
    '01900000-0000-0000-0000-000000000028'::uuid
  );

  DELETE FROM public.canonical_persons
  WHERE id IN (
    '01900000-0000-0000-0000-000000000017'::uuid,
    '01900000-0000-0000-0000-000000000018'::uuid
  );

  -- 4. Update/Insert Canonical Persons (Top 3 in both contests)
  INSERT INTO public.canonical_persons (
    id, canonical_name, aliases, data_status, provenance_id
  ) VALUES
    ('01900000-0000-0000-0000-000000000011'::uuid, 'Anumula Revanth Reddy', ARRAY['A. Revanth Reddy', 'Revanth Reddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000012'::uuid, 'Patnam Narender Reddy', ARRAY['P. Narender Reddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000013'::uuid, 'Bantu Ramesh Kumar', ARRAY['B. Ramesh Kumar', 'Bantu Ramesh'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000014'::uuid, 'Kalvakuntla Chandrashekar Rao', ARRAY['K. Chandrashekar Rao', 'KCR'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000015'::uuid, 'Eatala Rajender', ARRAY['E. Rajender', 'Etela Rajender'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000016'::uuid, 'Tumkunta Narsa Reddy', ARRAY['Thoomkunta Narsa Reddy', 'T. Narsa Reddy'], 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name,
    aliases = EXCLUDED.aliases;

  -- 5. Insert Individual Canonical Persons for Kodangal (Ranks 4 to 13)
  INSERT INTO public.canonical_persons (
    id, canonical_name, aliases, data_status, provenance_id
  ) VALUES
    ('01900000-0000-0000-0001-000000000065'::uuid, 'M. Madhusudhan Reddy', ARRAY['Madhusudhan Reddy M'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0002-000000000065'::uuid, 'Kurva Narmada Kistappa', ARRAY['Kurva Narmada', 'K. Narmada Kistappa'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0003-000000000065'::uuid, 'Prabhakar Mudiraj', ARRAY['P. Mudiraj'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0004-000000000065'::uuid, 'Venkat Ramulu Kandedi', ARRAY['Kandedi Venkat Ramulu', 'K. Venkat Ramulu'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0005-000000000065'::uuid, 'Pyata Narender Reddy', ARRAY['P. Narender Reddy (IND)'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0006-000000000065'::uuid, 'Gottimukkala Anjilaiah', ARRAY['G. Anjilaiah'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0007-000000000065'::uuid, 'Krishna Naik', ARRAY['K. Naik'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0008-000000000065'::uuid, 'Rathod Surya Naik', ARRAY['R. Surya Naik'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0009-000000000065'::uuid, 'Kotike Ramu Mudhiraj', ARRAY['K. Ramu Mudhiraj', 'Kotike Ramu'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0010-000000000065'::uuid, 'Kura Venkataiah', ARRAY['K. Venkataiah'], 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name,
    aliases = EXCLUDED.aliases;

  -- 6. Insert Individual Canonical Persons for Gajwel (Ranks 4 to 16)
  INSERT INTO public.canonical_persons (
    id, canonical_name, aliases, data_status, provenance_id
  ) VALUES
    ('01900000-0000-0000-0001-000000000040'::uuid, 'Jakkani Sanjay Kumar', ARRAY['J. Sanjay Kumar'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0002-000000000040'::uuid, 'Mekala Raghuma Reddy', ARRAY['M. Raghuma Reddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0003-000000000040'::uuid, 'Kinnera Yadaiah', ARRAY['K. Yadaiah'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0004-000000000040'::uuid, 'Nirudi Swamy', ARRAY['N. Swamy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0005-000000000040'::uuid, 'R. Nikhil', ARRAY['Nikhil R'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0006-000000000040'::uuid, 'Poreddy Venugopal', ARRAY['P. Venugopal'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0007-000000000040'::uuid, 'V. Sadananda Reddy', ARRAY['Sadananda Reddy V'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0008-000000000040'::uuid, 'Rangannagari Jyothi', ARRAY['R. Jyothi'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0009-000000000040'::uuid, 'Racha Subhadra Reddy', ARRAY['R. Subhadra Reddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0010-000000000040'::uuid, 'Ashok Pothu', ARRAY['A. Pothu'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0011-000000000040'::uuid, 'Navnanandi Limbareddy', ARRAY['N. Limbareddy'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0012-000000000040'::uuid, 'Vollala Praveen Kumar Rao', ARRAY['V. Praveen Kumar Rao'], 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0013-000000000040'::uuid, 'Pagidipala Rama Raju', ARRAY['P. Rama Raju'], 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name,
    aliases = EXCLUDED.aliases;

  -- 7. Upsert All 13 Candidacies for Kodangal (AC-065)
  INSERT INTO public.candidacies (
    id, contest_id, person_id, election_year, election_type, constituency_type, constituency_id,
    party_id, is_independent, result, votes_received, vote_share, rank,
    evm_votes, postal_votes, data_status, provenance_id
  ) VALUES
    ('01900000-0000-0000-0000-000000000021'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0000-000000000011'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-INC', false, 'won', 107429, 55.05, 1, 106820, 609, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000022'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0000-000000000012'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BRS', false, 'lost', 74897, 38.38, 2, 74431, 466, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000023'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0000-000000000013'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BJP', false, 'lost', 3988, 2.04, 3, 3928, 60, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0101-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0001-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 2173, 1.11, 4, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0102-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0002-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BSP', false, 'lost', 2133, 1.09, 5, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0103-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0003-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 770, 0.39, 6, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0104-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0004-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 463, 0.24, 7, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0105-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0005-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 380, 0.19, 8, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0106-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0006-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 273, 0.14, 9, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0107-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0007-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-DHSP', false, 'lost', 215, 0.11, 10, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0108-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0008-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-BMP', false, 'lost', 161, 0.08, 11, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0109-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0009-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     'ORG-PARTY-TERS', false, 'lost', 152, 0.08, 12, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0110-000000000065'::uuid, v_kodangal_contest_id, '01900000-0000-0000-0010-000000000065'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-065',
     NULL, true, 'lost', 127, 0.07, 13, 0, 0, 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    votes_received = EXCLUDED.votes_received,
    evm_votes = EXCLUDED.evm_votes,
    postal_votes = EXCLUDED.postal_votes,
    vote_share = EXCLUDED.vote_share,
    rank = EXCLUDED.rank;

  -- 8. Upsert All 16 Candidacies for Gajwel (AC-040)
  INSERT INTO public.candidacies (
    id, contest_id, person_id, election_year, election_type, constituency_type, constituency_id,
    party_id, is_independent, result, votes_received, vote_share, rank,
    evm_votes, postal_votes, data_status, provenance_id
  ) VALUES
    ('01900000-0000-0000-0000-000000000024'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0000-000000000014'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-BRS', false, 'won', 111684, 49.05, 1, 110984, 700, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000025'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0000-000000000015'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-BJP', false, 'lost', 66653, 29.27, 2, 65961, 692, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0000-000000000026'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0000-000000000016'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-INC', false, 'lost', 32568, 14.30, 3, 32318, 250, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0101-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0001-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-BSP', false, 'lost', 2743, 1.20, 4, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0102-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0002-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-YTP', false, 'lost', 2232, 0.98, 5, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0103-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0003-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     NULL, true, 'lost', 1998, 0.88, 6, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0104-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0004-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     NULL, true, 'lost', 1400, 0.61, 7, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0105-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0005-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     NULL, true, 'lost', 1371, 0.60, 8, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0106-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0006-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-AABAAD', false, 'lost', 1281, 0.56, 9, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0107-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0007-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-PPP', false, 'lost', 1049, 0.46, 10, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0108-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0008-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-IPBP', false, 'lost', 967, 0.42, 11, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0109-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0009-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-SPI', false, 'lost', 721, 0.32, 12, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0110-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0010-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-MTRSP', false, 'lost', 647, 0.28, 13, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0111-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0011-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     NULL, true, 'lost', 553, 0.24, 14, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0112-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0012-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-SAPS', false, 'lost', 508, 0.22, 15, 0, 0, 'OFFICIAL', v_provenance_id),
    ('01900000-0000-0000-0113-000000000040'::uuid, v_gajwel_contest_id, '01900000-0000-0000-0013-000000000040'::uuid, 2023, 'assembly', 'assembly', 'TS-AC-040',
     'ORG-PARTY-YTP', false, 'lost', 495, 0.22, 16, 0, 0, 'OFFICIAL', v_provenance_id)
  ON CONFLICT (id) DO UPDATE SET
    votes_received = EXCLUDED.votes_received,
    evm_votes = EXCLUDED.evm_votes,
    postal_votes = EXCLUDED.postal_votes,
    vote_share = EXCLUDED.vote_share,
    rank = EXCLUDED.rank;

  -- 9. Refresh Contest Metrics
  PERFORM public.fn_refresh_contest_metrics(v_kodangal_contest_id);
  PERFORM public.fn_refresh_contest_metrics(v_gajwel_contest_id);

  RAISE NOTICE 'SUCCESS: Migration 053 Candidate Granularity Remediation applied cleanly.';
END $$;
