-- =============================================================================
-- Migration 053: ECI-sourced candidate-level election results
-- =============================================================================
-- Scope: complete candidate results for the two bounded 2023 Telangana Assembly
-- contests created by migration 052: Kodangal AC 72 and Gajwel AC 42.
-- Evidence and source hashes are registered in migration 052.
-- No candidate pools, inferred candidate names, or synthesized vote totals.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _w019_eci_2023_parties (
  eci_party_code TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  party_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  recognition_level TEXT NOT NULL CHECK (recognition_level IN ('national', 'state', 'unrecognized')),
  headquarters_state TEXT
) ON COMMIT DROP;

INSERT INTO _w019_eci_2023_parties
  (eci_party_code, organization_id, party_name, short_name, recognition_level, headquarters_state)
VALUES
  ('ABDP', 'ORG-PARTY-ABDP', 'Aabaad Party', 'ABDP', 'unrecognized', NULL),
  ('AINHCP', 'ORG-PARTY-AINHCP', 'All India Hindustan Congress Party', 'AINHCP', 'unrecognized', NULL),
  ('BCYP', 'ORG-PARTY-BCYP', 'Bharatha Chaitanya Yuvajana Party', 'BCYP', 'unrecognized', NULL),
  ('BHRS', 'ORG-PARTY-BRS', 'Bharat Rashtra Samithi', 'BRS', 'state', NULL),
  ('BJP', 'ORG-PARTY-BJP', 'Bharatiya Janata Party', 'BJP', 'national', NULL),
  ('BLIP', 'ORG-PARTY-BLIP', 'Blue India Party', 'BLIP', 'unrecognized', NULL),
  ('BMUP', 'ORG-PARTY-BMUP', 'Bahujan Mukti Party', 'BMUP', 'unrecognized', NULL),
  ('BSP', 'ORG-PARTY-BSP', 'Bahujan Samaj Party', 'BSP', 'national', NULL),
  ('DHRMSMJP', 'ORG-PARTY-DHRMSMJP', 'Dharma Samaj Party', 'DHRMSMJP', 'unrecognized', NULL),
  ('GNASURKP', 'ORG-PARTY-GNASURKP', 'Gana Suraksha Party', 'GNASURKP', 'unrecognized', NULL),
  ('INC', 'ORG-PARTY-INC', 'Indian National Congress', 'INC', 'national', NULL),
  ('IPBP', 'ORG-PARTY-IPBP', 'India Praja Bandhu Party', 'IPBP', 'unrecognized', NULL),
  ('JSKHP', 'ORG-PARTY-JSKHP', 'Jana Shankhaaraavam Party', 'JSKHP', 'unrecognized', NULL),
  ('MTRSP', 'ORG-PARTY-MTRSP', 'Mana Telangana Rashtra Samaikya Party', 'MTRSP', 'unrecognized', NULL),
  ('NNKP', 'ORG-PARTY-NNKP', 'National Nava Kranthi Party', 'NNKP', 'unrecognized', NULL),
  ('NRCP', 'ORG-PARTY-NRCP', 'Navarang Congress Party', 'NRCP', 'unrecognized', NULL),
  ('PEOPRTCP', 'ORG-PARTY-PEOPRTCP', 'People Protection Party', 'PEOPRTCP', 'unrecognized', NULL),
  ('SP(I)', 'ORG-PARTY-SPI', 'Socialist Party (india)', 'SPI', 'unrecognized', NULL),
  ('sps', 'ORG-PARTY-SPS', 'Samaikyandhra Parirakshana Samithi', 'sps', 'unrecognized', NULL),
  ('TLGNARJYS', 'ORG-PARTY-TLGNARJYS', 'Telangana Rajya Samithi', 'TLGNARJYS', 'unrecognized', NULL),
  ('VTRP', 'ORG-PARTY-VTRP', 'Vidhyarthula Rajakiya Party', 'VTRP', 'unrecognized', NULL),
  ('YGATLSIP', 'ORG-PARTY-YGATLSIP', 'Yuga Thulasi Party', 'YGATLSIP', 'unrecognized', NULL),
  ('YVTRP', 'ORG-PARTY-YVTRP', 'Yuva Taram Party', 'YVTRP', 'unrecognized', NULL);

CREATE TEMP TABLE _w019_eci_2023_candidates (
  contest_code TEXT NOT NULL CHECK (contest_code IN (
    'TS-ASM-2023-AC-072-KODANGAL',
    'TS-ASM-2023-AC-042-GAJWEL'
  )),
  eci_ballot_number INTEGER NOT NULL,
  candidate_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  eci_party_code TEXT NOT NULL,
  votes_received INTEGER NOT NULL CHECK (votes_received >= 0),
  evm_votes INTEGER NOT NULL CHECK (evm_votes >= 0),
  postal_votes INTEGER NOT NULL CHECK (postal_votes >= 0),
  PRIMARY KEY (contest_code, eci_ballot_number),
  CHECK (votes_received = evm_votes + postal_votes)
) ON COMMIT DROP;

-- ECI Detailed Results, Kodangal AC 72. NOTA (source ballot no. 6) is stored
-- separately in ballot_choices below, so candidate ballot numbers retain ECI's
-- original numbering and candidate ranks are calculated without ranking NOTA.
INSERT INTO _w019_eci_2023_candidates VALUES
  ('TS-ASM-2023-AC-072-KODANGAL', 1, 'Anumula Revanth Reddy', 'male', 'INC', 107429, 106558, 871),
  ('TS-ASM-2023-AC-072-KODANGAL', 2, 'Patnam Narender Reddy', 'male', 'BHRS', 74897, 74709, 188),
  ('TS-ASM-2023-AC-072-KODANGAL', 3, 'Bantu Ramesh', 'male', 'BJP', 3988, 3928, 60),
  ('TS-ASM-2023-AC-072-KODANGAL', 4, 'M.madhusudhan Reddy', 'male', 'IND', 2173, 2173, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 5, 'Kurva Narmada Kistappa', 'female', 'BSP', 2133, 2114, 19),
  ('TS-ASM-2023-AC-072-KODANGAL', 7, 'Prabhakar Mudiraj', 'male', 'IND', 770, 770, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 8, 'Venkat Ramulu Kandedi', 'male', 'IND', 463, 463, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 9, 'Pyata Narender Reddy', 'male', 'IND', 380, 380, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 10, 'Gottimukkala Anjilaiah', 'male', 'IND', 273, 273, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 11, 'Krishna Naik', 'male', 'DHRMSMJP', 215, 213, 2),
  ('TS-ASM-2023-AC-072-KODANGAL', 12, 'Rathod Surya Naik', 'male', 'BMUP', 161, 161, 0),
  ('TS-ASM-2023-AC-072-KODANGAL', 13, 'Kotike Ramu Mudhiraj', 'male', 'TLGNARJYS', 152, 149, 3),
  ('TS-ASM-2023-AC-072-KODANGAL', 14, 'Kura Venkataiah', 'male', 'IND', 127, 127, 0);

-- ECI Detailed Results, Gajwel AC 42. NOTA (source ballot no. 12) is stored
-- separately in ballot_choices below.
INSERT INTO _w019_eci_2023_candidates VALUES
  ('TS-ASM-2023-AC-042-GAJWEL', 1, 'Kalvakuntla Chandrashekar Rao', 'male', 'BHRS', 111684, 111244, 440),
  ('TS-ASM-2023-AC-042-GAJWEL', 2, 'Eatala Rajender', 'male', 'BJP', 66653, 65961, 692),
  ('TS-ASM-2023-AC-042-GAJWEL', 3, 'Thoomkunta Narsa Reddy', 'male', 'INC', 32568, 32322, 246),
  ('TS-ASM-2023-AC-042-GAJWEL', 4, 'Jakkani Sanjay Kumar', 'male', 'BSP', 2743, 2710, 33),
  ('TS-ASM-2023-AC-042-GAJWEL', 5, 'Mekala Raghuma Reddy', 'male', 'YGATLSIP', 2232, 2230, 2),
  ('TS-ASM-2023-AC-042-GAJWEL', 6, 'Kinnera Yadaiah', 'male', 'IND', 1998, 1995, 3),
  ('TS-ASM-2023-AC-042-GAJWEL', 7, 'Nirudi Swamy', 'male', 'IND', 1400, 1399, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 8, 'R. Nikhil', 'male', 'IND', 1371, 1371, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 9, 'Poreddy Venugopal', 'male', 'ABDP', 1281, 1279, 2),
  ('TS-ASM-2023-AC-042-GAJWEL', 10, 'V. Sadananda Reddy', 'male', 'PEOPRTCP', 1049, 1049, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 11, 'Rangannagari Jyothi', 'female', 'IPBP', 967, 967, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 13, 'Racha Subhadra Reddy', 'female', 'SP(I)', 721, 721, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 14, 'Ashok Pothu', 'male', 'MTRSP', 647, 643, 4),
  ('TS-ASM-2023-AC-042-GAJWEL', 15, 'Navnanandi Limbareddy', 'male', 'IND', 553, 553, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 16, 'Vollala Praveen Kumar Rao', 'male', 'sps', 508, 508, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 17, 'Pagidipala Rama Raju', 'male', 'YVTRP', 495, 491, 4),
  ('TS-ASM-2023-AC-042-GAJWEL', 18, 'Ragula Nagaraju', 'male', 'BCYP', 474, 474, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 19, 'Dasari Haribabu', 'male', 'IND', 319, 319, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 20, 'Dasari Chendramohan', 'male', 'IND', 275, 275, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 21, 'Mukkera Krishna', 'male', 'IND', 262, 261, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 22, 'Siliveri Indragoud', 'male', 'NNKP', 259, 258, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 23, 'Sapavat Suman', 'male', 'IND', 237, 237, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 24, 'Ahemad', 'male', 'JSKHP', 232, 231, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 25, 'Palleturu Prasad', 'male', 'IND', 213, 213, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 26, 'Raju Boggula', 'male', 'IND', 207, 206, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 27, 'Bhanuchander Dasari', 'male', 'IND', 186, 186, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 28, 'Bakka Sadesh', 'male', 'IND', 176, 176, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 29, 'Gaddam Ashok', 'male', 'AINHCP', 175, 172, 3),
  ('TS-ASM-2023-AC-042-GAJWEL', 30, 'Nelapati Nagaraju', 'male', 'VTRP', 161, 160, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 31, 'Karunkar Reddy Adiyala', 'male', 'IND', 158, 156, 2),
  ('TS-ASM-2023-AC-042-GAJWEL', 32, 'Datrika Santosh', 'male', 'NRCP', 144, 143, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 33, 'N. Prasad', 'male', 'BLIP', 132, 129, 3),
  ('TS-ASM-2023-AC-042-GAJWEL', 34, 'Gaddam Anitha', 'female', 'GNASURKP', 129, 129, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 35, 'Dubbaka Buggaraju', 'male', 'DHRMSMJP', 127, 127, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 36, 'Mekala Saritha Reddy', 'female', 'IND', 124, 124, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 37, 'Kiran Rathod', 'male', 'IND', 114, 114, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 38, 'Loggari Ramesh Patel', 'male', 'IND', 107, 107, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 39, 'Gurrapu Ramulu', 'male', 'IND', 101, 100, 1),
  ('TS-ASM-2023-AC-042-GAJWEL', 40, 'Ranaveni Laxman (rl Rao Gp)', 'male', 'IND', 94, 94, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 41, 'Gabbula Nagender', 'male', 'IND', 79, 79, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 42, 'D. Ellam', 'male', 'IND', 77, 77, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 43, 'Jeedipally Srinivas', 'male', 'IND', 64, 64, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 44, 'Baddam Srinivas Reddy', 'male', 'IND', 50, 50, 0),
  ('TS-ASM-2023-AC-042-GAJWEL', 45, 'Mamidi Narayanareddy', 'male', 'IND', 39, 39, 0);

DO $$
BEGIN
  IF (SELECT count(*) FROM _w019_eci_2023_candidates WHERE contest_code = 'TS-ASM-2023-AC-072-KODANGAL') <> 13 THEN
    RAISE EXCEPTION 'ECI_SOURCE_ROW_COUNT_MISMATCH: Kodangal must contain 13 candidate rows.';
  END IF;
  IF (SELECT count(*) FROM _w019_eci_2023_candidates WHERE contest_code = 'TS-ASM-2023-AC-042-GAJWEL') <> 44 THEN
    RAISE EXCEPTION 'ECI_SOURCE_ROW_COUNT_MISMATCH: Gajwel must contain 44 candidate rows.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM _w019_eci_2023_candidates c
    LEFT JOIN _w019_eci_2023_parties p ON p.eci_party_code = c.eci_party_code
    WHERE c.eci_party_code <> 'IND'
      AND p.eci_party_code IS NULL
  ) THEN
    RAISE EXCEPTION 'ECI_SOURCE_PARTY_MAPPING_MISSING: Every non-independent source code must map to the ECI party registry.';
  END IF;
END $$;

INSERT INTO public.political_organizations (
  id, org_type, name, short_name, ec_party_code, recognition_level,
  headquarters_state, data_status, provenance_id
)
SELECT
  p.organization_id,
  'political_party',
  p.party_name,
  p.short_name,
  p.eci_party_code,
  p.recognition_level,
  p.headquarters_state,
  'OFFICIAL',
  '01900000-0000-0000-0000-000000000001'::uuid
FROM _w019_eci_2023_parties p
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  ec_party_code = EXCLUDED.ec_party_code,
  recognition_level = EXCLUDED.recognition_level,
  headquarters_state = COALESCE(public.political_organizations.headquarters_state, EXCLUDED.headquarters_state),
  data_status = EXCLUDED.data_status,
  provenance_id = COALESCE(public.political_organizations.provenance_id, EXCLUDED.provenance_id),
  updated_at = now();

INSERT INTO public.canonical_persons (
  id, canonical_name, gender, data_status, provenance_id, metadata
)
SELECT
  md5('eci:telangana:2023:person:' || c.contest_code || ':' || c.eci_ballot_number::text)::uuid,
  c.candidate_name,
  c.gender,
  'OFFICIAL',
  '01900000-0000-0000-0000-000000000001'::uuid,
  jsonb_build_object(
    'source', 'Election Commission of India Detailed Results',
    'contest_code', c.contest_code,
    'eci_ballot_number', c.eci_ballot_number,
    'source_name', c.candidate_name
  )
FROM _w019_eci_2023_candidates c
ON CONFLICT (id) DO UPDATE SET
  canonical_name = EXCLUDED.canonical_name,
  gender = EXCLUDED.gender,
  data_status = EXCLUDED.data_status,
  provenance_id = EXCLUDED.provenance_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();

WITH ranked_candidates AS (
  SELECT
    c.*,
    row_number() OVER (
      PARTITION BY c.contest_code
      ORDER BY c.votes_received DESC, c.eci_ballot_number ASC
    )::integer AS candidate_rank
  FROM _w019_eci_2023_candidates c
)
INSERT INTO public.candidacies (
  id, contest_id, person_id, election_year, election_type, constituency_type,
  constituency_id, party_id, is_independent, result, votes_received, vote_share,
  rank, evm_votes, postal_votes, data_status, provenance_id
)
SELECT
  md5('eci:telangana:2023:candidacy:' || c.contest_code || ':' || c.eci_ballot_number::text)::uuid,
  CASE c.contest_code
    WHEN 'TS-ASM-2023-AC-072-KODANGAL' THEN '01900000-0000-0000-0000-000000000003'::uuid
    WHEN 'TS-ASM-2023-AC-042-GAJWEL' THEN '01900000-0000-0000-0000-000000000004'::uuid
  END,
  md5('eci:telangana:2023:person:' || c.contest_code || ':' || c.eci_ballot_number::text)::uuid,
  2023,
  'assembly',
  'assembly',
  CASE c.contest_code
    WHEN 'TS-ASM-2023-AC-072-KODANGAL' THEN 'TS-AC-72'
    WHEN 'TS-ASM-2023-AC-042-GAJWEL' THEN 'TS-AC-42'
  END,
  p.organization_id,
  c.eci_party_code = 'IND',
  CASE WHEN c.candidate_rank = 1 THEN 'won' ELSE 'lost' END,
  c.votes_received,
  round(c.votes_received::numeric * 100 / ec.total_valid_votes::numeric, 2),
  c.candidate_rank,
  c.evm_votes,
  c.postal_votes,
  'OFFICIAL',
  '01900000-0000-0000-0000-000000000001'::uuid
FROM ranked_candidates c
JOIN public.election_contests ec
  ON ec.contest_code = c.contest_code
LEFT JOIN _w019_eci_2023_parties p
  ON p.eci_party_code = c.eci_party_code
ON CONFLICT (id) DO UPDATE SET
  result = EXCLUDED.result,
  votes_received = EXCLUDED.votes_received,
  vote_share = EXCLUDED.vote_share,
  rank = EXCLUDED.rank,
  evm_votes = EXCLUDED.evm_votes,
  postal_votes = EXCLUDED.postal_votes,
  data_status = EXCLUDED.data_status,
  provenance_id = EXCLUDED.provenance_id,
  updated_at = now();

INSERT INTO public.ballot_choices (
  contest_id, choice_type, is_valid_vote, votes_received, vote_share, evm_votes, postal_votes
)
SELECT
  ec.id,
  'NOTA',
  true,
  n.votes_received,
  round(n.votes_received::numeric * 100 / ec.total_valid_votes::numeric, 2),
  n.evm_votes,
  n.postal_votes
FROM (
  VALUES
    ('TS-ASM-2023-AC-072-KODANGAL'::text, 2002, 1999, 3),
    ('TS-ASM-2023-AC-042-GAJWEL'::text, 832, 827, 5)
) AS n(contest_code, votes_received, evm_votes, postal_votes)
JOIN public.election_contests ec ON ec.contest_code = n.contest_code
ON CONFLICT (contest_id, choice_type) DO UPDATE SET
  is_valid_vote = EXCLUDED.is_valid_vote,
  votes_received = EXCLUDED.votes_received,
  vote_share = EXCLUDED.vote_share,
  evm_votes = EXCLUDED.evm_votes,
  postal_votes = EXCLUDED.postal_votes;

SELECT public.fn_refresh_contest_metrics('01900000-0000-0000-0000-000000000003'::uuid);
SELECT public.fn_refresh_contest_metrics('01900000-0000-0000-0000-000000000004'::uuid);

DO $$
DECLARE
  v_kodangal_id UUID := '01900000-0000-0000-0000-000000000003'::uuid;
  v_gajwel_id UUID := '01900000-0000-0000-0000-000000000004'::uuid;
BEGIN
  IF (SELECT count(*) FROM public.candidacies WHERE contest_id = v_kodangal_id) <> 13
     OR (SELECT count(*) FROM public.candidacies WHERE contest_id = v_gajwel_id) <> 44 THEN
    RAISE EXCEPTION 'ECI_POSTCONDITION_FAILED: Candidate counts do not match ECI contest summaries.';
  END IF;

  IF NOT public.fn_validate_contest_totals(v_kodangal_id)
     OR NOT public.fn_validate_contest_totals(v_gajwel_id) THEN
    RAISE EXCEPTION 'ECI_POSTCONDITION_FAILED: Vote split or contest conservation validation failed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.election_contests
    WHERE id = v_kodangal_id
      AND constituency_id = 'TS-AC-72'
      AND total_electors = 236789
      AND total_votes_polled = 195187
      AND total_valid_votes = 195163
      AND total_rejected_votes = 24
      AND total_nota_votes = 2002
      AND turnout_percentage = 82.43
      AND victory_margin = 32532
  ) THEN
    RAISE EXCEPTION 'ECI_POSTCONDITION_FAILED: Kodangal source totals or computed result differ from ECI.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.election_contests
    WHERE id = v_gajwel_id
      AND constituency_id = 'TS-AC-42'
      AND total_electors = 274726
      AND total_votes_polled = 232456
      AND total_valid_votes = 232417
      AND total_rejected_votes = 39
      AND total_nota_votes = 832
      AND turnout_percentage = 84.61
      AND victory_margin = 45031
  ) THEN
    RAISE EXCEPTION 'ECI_POSTCONDITION_FAILED: Gajwel source totals or computed result differ from ECI.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.candidacies c
    JOIN public.canonical_persons p ON p.id = c.person_id
    WHERE c.contest_id IN (v_kodangal_id, v_gajwel_id)
      AND c.is_independent = false
      AND c.party_id IS NULL
  ) THEN
    RAISE EXCEPTION 'ECI_POSTCONDITION_FAILED: Party candidacy is missing its canonical organization.';
  END IF;
END $$;

COMMIT;
