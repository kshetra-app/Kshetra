-- =============================================================================
-- Migration 052: W019 Persistence Semantics Remediation
-- =============================================================================
-- Target: local, staging or production Supabase databases through a reviewed
-- migration workflow. This file does not deploy itself to any hosted project.
-- Mode: nullable rejection semantics plus a bounded, source-backed 2023 seed.
--
-- Objective:
-- 1. Support UNKNOWN semantics for total_rejected_votes via nullable INTEGER NULL.
--    NULL = UNKNOWN / not independently established by authoritative evidence (NOT zero).
--    Prohibit magic numeric sentinels or representing UNKNOWN as 0.
-- 2. Modify conservation constraint check_contest_votes_conservation to:
--    IF total_rejected_votes IS NOT NULL THEN
--      total_votes_polled = total_valid_votes + total_rejected_votes
--    OTHERWISE conservation is UNRESOLVED / UNKNOWN (does not fail check, but not PASS).
-- 3. Update fn_validate_contest_totals and fn_refresh_contest_metrics to honor NULL.
-- 4. Register the ECI source evidence and exact, complete candidate-level
--    results for Kodangal AC 72 and Gajwel AC 42 (candidate rows are in 053).
-- =============================================================================

-- 1. Schema modification: public.election_contests.total_rejected_votes NULLABLE
ALTER TABLE public.election_contests ALTER COLUMN total_rejected_votes DROP NOT NULL;
ALTER TABLE public.election_contests ALTER COLUMN total_rejected_votes DROP DEFAULT;
ALTER TABLE public.election_contests ALTER COLUMN total_rejected_votes SET DEFAULT NULL;

COMMENT ON COLUMN public.election_contests.total_rejected_votes IS
  'Count of rejected ballots. NULL indicates UNKNOWN / not independently established by authoritative evidence (NOT zero).';

-- 2. Check constraint: election_contests_total_rejected_votes_check permits NULL
ALTER TABLE public.election_contests DROP CONSTRAINT IF EXISTS election_contests_total_rejected_votes_check;
ALTER TABLE public.election_contests ADD CONSTRAINT election_contests_total_rejected_votes_check
  CHECK (total_rejected_votes IS NULL OR total_rejected_votes >= 0);

-- Preserve the EVM/general and postal split for NOTA where the source publishes it.
ALTER TABLE public.ballot_choices
  ADD COLUMN IF NOT EXISTS evm_votes INTEGER CHECK (evm_votes IS NULL OR evm_votes >= 0),
  ADD COLUMN IF NOT EXISTS postal_votes INTEGER CHECK (postal_votes IS NULL OR postal_votes >= 0);

ALTER TABLE public.ballot_choices
  DROP CONSTRAINT IF EXISTS chk_ballot_choice_votes_split;
ALTER TABLE public.ballot_choices
  ADD CONSTRAINT chk_ballot_choice_votes_split CHECK (
    (evm_votes IS NULL AND postal_votes IS NULL)
    OR (
      evm_votes IS NOT NULL
      AND postal_votes IS NOT NULL
      AND votes_received = evm_votes + postal_votes
    )
  );

-- 3. Check constraint: check_contest_votes_conservation
-- If total_rejected_votes IS NULL, conservation is UNRESOLVED and condition succeeds.
ALTER TABLE public.election_contests DROP CONSTRAINT IF EXISTS check_contest_votes_conservation;
ALTER TABLE public.election_contests ADD CONSTRAINT check_contest_votes_conservation
  CHECK (status <> 'completed'::text OR total_rejected_votes IS NULL OR total_votes_polled = (total_valid_votes + total_rejected_votes) OR total_votes_polled = 0);

-- 4. Update fn_validate_contest_totals(UUID)
CREATE OR REPLACE FUNCTION public.fn_validate_contest_totals(p_contest_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contest RECORD;
  v_candidate_votes INTEGER := 0;
  v_nota_votes INTEGER := 0;
  v_total_valid_counted INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_contest FROM public.election_contests WHERE id = p_contest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contest % not found', p_contest_id;
  END IF;

  -- Sum candidate votes
  SELECT COALESCE(SUM(votes_received), 0) INTO v_candidate_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id;

  -- Sum valid ballot choice votes (NOTA)
  SELECT COALESCE(SUM(votes_received), 0) INTO v_nota_votes
  FROM public.ballot_choices
  WHERE contest_id = p_contest_id AND is_valid_vote = true;

  -- If ballot_choices has 0, fall back to total_nota_votes on contest
  IF v_nota_votes = 0 AND v_contest.total_nota_votes > 0 THEN
    v_nota_votes := COALESCE(v_contest.total_nota_votes, 0);
  END IF;

  v_total_valid_counted := v_candidate_votes + v_nota_votes;

  -- Check candidate sum equals total_valid_votes
  IF v_contest.total_valid_votes > 0 THEN
    IF ABS(v_total_valid_counted - v_contest.total_valid_votes) > 1 THEN
      v_errors := array_append(v_errors, format('Valid votes mismatch: counted (%s) != stored (%s)',
        v_total_valid_counted, v_contest.total_valid_votes));
    END IF;
  END IF;

  -- ACCT-01: Vote conservation check
  -- IF total_rejected_votes IS NOT NULL: total_votes_polled must equal total_valid_votes + total_rejected_votes
  -- IF total_rejected_votes IS NULL: conservation is UNRESOLVED (not a failure, but cannot verify conservation)
  IF v_contest.status = 'completed' AND v_contest.total_votes_polled > 0 THEN
    IF v_contest.total_rejected_votes IS NOT NULL THEN
      IF v_contest.total_votes_polled <> (v_contest.total_valid_votes + v_contest.total_rejected_votes) THEN
        v_errors := array_append(v_errors, format('Vote conservation failure: polled (%s) != valid (%s) + rejected (%s)',
          v_contest.total_votes_polled, v_contest.total_valid_votes, v_contest.total_rejected_votes));
      END IF;
    END IF;
  END IF;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE WARNING 'Contest % validation failures: %', p_contest_id, array_to_string(v_errors, '; ');
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- 5. Update fn_refresh_contest_metrics(UUID)
CREATE OR REPLACE FUNCTION public.fn_refresh_contest_metrics(p_contest_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_valid INTEGER := 0;
  v_total_nota INTEGER := 0;
  v_winner_id UUID;
  v_runner_up_id UUID;
  v_polled INTEGER := 0;
  v_rejected INTEGER := NULL;
  v_electors INTEGER := 0;
  v_turnout NUMERIC(5,2) := 0;
  v_margin INTEGER := 0;
  v_top_votes INTEGER := 0;
  v_second_votes INTEGER := 0;
BEGIN
  -- Extract electors, polled, rejected, nota
  SELECT total_electors, total_votes_polled, total_rejected_votes, total_nota_votes
  INTO v_electors, v_polled, v_rejected, v_total_nota
  FROM public.election_contests
  WHERE id = p_contest_id;

  -- Sum valid candidate votes
  SELECT COALESCE(SUM(votes_received), 0) INTO v_total_valid
  FROM public.candidacies
  WHERE contest_id = p_contest_id;

  -- Sum NOTA votes from ballot_choices if present
  SELECT COALESCE(SUM(votes_received), v_total_nota) INTO v_total_nota
  FROM public.ballot_choices
  WHERE contest_id = p_contest_id AND choice_type = 'NOTA';

  -- Add NOTA to valid votes
  v_total_valid := v_total_valid + COALESCE(v_total_nota, 0);

  -- Only calculate polled from valid + rejected if polled is 0 AND rejected is known (NOT NULL)
  IF v_polled = 0 AND v_rejected IS NOT NULL THEN
    v_polled := v_total_valid + v_rejected;
  END IF;

  -- Turnout calculation
  IF v_electors > 0 AND v_polled > 0 THEN
    v_turnout := ROUND((v_polled::NUMERIC / v_electors::NUMERIC) * 100.0, 2);
  END IF;

  -- Identify winner and runner up
  SELECT id, votes_received INTO v_winner_id, v_top_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id
  ORDER BY votes_received DESC
  LIMIT 1;

  SELECT id, votes_received INTO v_runner_up_id, v_second_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id AND id <> v_winner_id
  ORDER BY votes_received DESC
  LIMIT 1;

  IF v_winner_id IS NOT NULL AND v_runner_up_id IS NOT NULL THEN
    v_margin := v_top_votes - v_second_votes;
  ELSIF v_winner_id IS NOT NULL THEN
    v_margin := v_top_votes;
  END IF;

  -- Update contest record
  UPDATE public.election_contests
  SET
    total_valid_votes = v_total_valid,
    total_votes_polled = CASE WHEN v_polled > 0 THEN v_polled ELSE total_votes_polled END,
    total_nota_votes = COALESCE(v_total_nota, total_nota_votes),
    turnout_percentage = v_turnout,
    victory_margin = v_margin,
    winning_candidacy_id = v_winner_id,
    runner_up_candidacy_id = v_runner_up_id,
    updated_at = NOW()
  WHERE id = p_contest_id;

  -- Recalculate vote shares on candidacies
  IF v_total_valid > 0 THEN
    UPDATE public.candidacies
    SET vote_share = ROUND((votes_received::NUMERIC / v_total_valid::NUMERIC) * 100.0, 2)
    WHERE contest_id = p_contest_id;
  END IF;

  -- Recalculate vote shares on ballot choices
  IF v_total_valid > 0 THEN
    UPDATE public.ballot_choices
    SET vote_share = ROUND((votes_received::NUMERIC / v_total_valid::NUMERIC) * 100.0, 2)
    WHERE contest_id = p_contest_id;
  END IF;
END;
$$;

-- 6. Register the ECI source documents, the 2023 event and two fully sourced
--    constituency contests. This is a bounded two-seat dataset, not a claim
--    that all 119 Assembly constituencies have been loaded here.
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES (
  'telangana_2023_eci_election_results',
  'Telangana 2023 Assembly Election Results (selected constituencies)',
  'election',
  'Official Election Commission of India detailed results and constituency summary records for Kodangal AC 72 and Gajwel AC 42.',
  'eci',
  'Government Open Data'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, effective_from, effective_to, record_count,
  default_status, metadata
)
VALUES (
  'telangana_2023_eci_election_results_v1',
  'telangana_2023_eci_election_results',
  '2023_selected_acs_42_72',
  '2023-11-30',
  '2023-12-03',
  61,
  'UNKNOWN',
  jsonb_build_object(
    'scope', jsonb_build_array('TS-AC-072', 'TS-AC-042'),
    'record_count_definition', '57 candidate results, 2 NOTA results, and 2 contest summaries',
    'source_artifacts', jsonb_build_array(
      jsonb_build_object(
        'name', 'Detailed_Results.pdf',
        'url', 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Detailed_Results.pdf',
        'sha256', '359995af88c95cb93dd8a95c734a13bfa0d64ff78860a3f8df1c502e70937790'
      ),
      jsonb_build_object(
        'name', 'Constituency_Data_Summery_Report.pdf',
        'url', 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Constituency_Data_Summery_Report.pdf',
        'sha256', '2eba61dacb2e0a9f0518d32ad2aa35c80ff19597e80ea313631cc75cfa06835f'
      ),
      jsonb_build_object(
        'name', 'List_Of_Political_Parties_Participated.pdf',
        'url', 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_Of_Political_Parties_Participated.pdf',
        'sha256', 'e22db9a5845cdf025a667473516ad2d0503cb1dbd822b5fc806b56abbb8be3d7'
      )
    ),
    'notes', 'The ECI Detailed Results report lists candidate and NOTA EVM/general and postal votes. The constituency summary provides electors, total voters, valid votes, rejected ballot count and turnout. ECI statutory Form 20 records remain authoritative where a discrepancy arises.'
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evidence_records (
  id, dataset_version_id, artifact_name, artifact_sha256,
  verification_authority, verified_by, verification_notes
)
VALUES
  (
    '01900000-0000-0000-0000-000000000010'::uuid,
    'telangana_2023_eci_election_results_v1',
    'Detailed_Results.pdf',
    '359995af88c95cb93dd8a95c734a13bfa0d64ff78860a3f8df1c502e70937790',
    'Election Commission of India',
    'migration_052_source_reconciliation',
    'Candidate names, party codes, order, EVM/general votes, postal votes, totals and NOTA entries for Kodangal AC 72 and Gajwel AC 42 were checked against the published detailed results report.'
  ),
  (
    '01900000-0000-0000-0000-000000000011'::uuid,
    'telangana_2023_eci_election_results_v1',
    'Constituency_Data_Summery_Report.pdf',
    '2eba61dacb2e0a9f0518d32ad2aa35c80ff19597e80ea313631cc75cfa06835f',
    'Election Commission of India',
    'migration_052_source_reconciliation',
    'Elector, total-voter, valid-vote, rejected-ballot and turnout values for AC 72 and AC 42 were checked against the published constituency summary report.'
  ),
  (
    '01900000-0000-0000-0000-000000000012'::uuid,
    'telangana_2023_eci_election_results_v1',
    'List_Of_Political_Parties_Participated.pdf',
    'e22db9a5845cdf025a667473516ad2d0503cb1dbd822b5fc806b56abbb8be3d7',
    'Election Commission of India',
    'migration_052_source_reconciliation',
    'Political party names and abbreviations used for these candidacies were checked against the published Telangana 2023 participating-parties list.'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.dataset_versions
SET verification_evidence_id = '01900000-0000-0000-0000-000000000010'::uuid,
    default_status = 'OFFICIAL'
WHERE id = 'telangana_2023_eci_election_results_v1';

INSERT INTO public.provenance_records (
  id, dataset_version_id, source_record_id, status, transformation_type,
  transform_version, operator, metadata
)
VALUES (
  '01900000-0000-0000-0000-000000000001'::uuid,
  'telangana_2023_eci_election_results_v1',
  'eci-telangana-2023-ac-42-ac-72',
  'UNKNOWN',
  'official_result_transcription',
  '1.0.0',
  'migration_052_source_reconciliation',
  jsonb_build_object('source', 'Election Commission of India', 'scope', jsonb_build_array('TS-AC-072', 'TS-AC-042'))
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.provenance_records
SET status = 'OFFICIAL',
    verification_evidence_id = '01900000-0000-0000-0000-000000000010'::uuid,
    verified_by = 'migration_052_source_reconciliation'
WHERE id = '01900000-0000-0000-0000-000000000001'::uuid;

INSERT INTO public.election_events (
  id, election_code, state_code, election_type, election_year, title,
  notification_date, polling_date, counting_date, status,
  total_constituencies, total_electors, total_votes_polled, turnout_percentage,
  data_status, provenance_id, metadata
)
VALUES (
  '01900000-0000-0000-0000-000000000002'::uuid,
  'TS-ASM-2023',
  'TS',
  'assembly',
  2023,
  'Telangana Legislative Assembly Election 2023',
  NULL,
  '2023-11-30',
  '2023-12-03',
  'completed',
  119,
  NULL,
  NULL,
  NULL,
  'OFFICIAL',
  '01900000-0000-0000-0000-000000000001'::uuid,
  jsonb_build_object('source', 'Election Commission of India', 'loaded_contest_count', 2, 'event_aggregate_status', 'not_loaded_for_all_constituencies')
)
ON CONFLICT (id) DO UPDATE SET
  election_code = EXCLUDED.election_code,
  state_code = EXCLUDED.state_code,
  election_type = EXCLUDED.election_type,
  election_year = EXCLUDED.election_year,
  title = EXCLUDED.title,
  polling_date = EXCLUDED.polling_date,
  counting_date = EXCLUDED.counting_date,
  status = EXCLUDED.status,
  total_constituencies = EXCLUDED.total_constituencies,
  total_electors = NULL,
  total_votes_polled = NULL,
  turnout_percentage = NULL,
  data_status = EXCLUDED.data_status,
  provenance_id = EXCLUDED.provenance_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.election_contests (
  id, election_id, contest_code, constituency_id, constituency_name,
  reservation_status, status, total_electors, total_votes_polled,
  total_valid_votes, total_rejected_votes, total_nota_votes,
  turnout_percentage, victory_margin, data_status, provenance_id, metadata
)
VALUES
  (
    '01900000-0000-0000-0000-000000000003'::uuid,
    '01900000-0000-0000-0000-000000000002'::uuid,
    'TS-ASM-2023-AC-072-KODANGAL',
    'TS-AC-72',
    'Kodangal',
    'GEN',
    'completed',
    236789,
    195187,
    195163,
    24,
    2002,
    82.43,
    32532,
    'OFFICIAL',
    '01900000-0000-0000-0000-000000000001'::uuid,
    jsonb_build_object('eci_ac_number', 72, 'total_valid_definition', 'valid candidate votes plus NOTA', 'rejected_ballot_count_source', 'Constituency_Data_Summery_Report.pdf')
  ),
  (
    '01900000-0000-0000-0000-000000000004'::uuid,
    '01900000-0000-0000-0000-000000000002'::uuid,
    'TS-ASM-2023-AC-042-GAJWEL',
    'TS-AC-42',
    'Gajwel',
    'GEN',
    'completed',
    274726,
    232456,
    232417,
    39,
    832,
    84.61,
    45031,
    'OFFICIAL',
    '01900000-0000-0000-0000-000000000001'::uuid,
    jsonb_build_object('eci_ac_number', 42, 'total_valid_definition', 'valid candidate votes plus NOTA', 'rejected_ballot_count_source', 'Constituency_Data_Summery_Report.pdf')
  )
ON CONFLICT (id) DO UPDATE SET
  election_id = EXCLUDED.election_id,
  contest_code = EXCLUDED.contest_code,
  constituency_id = EXCLUDED.constituency_id,
  constituency_name = EXCLUDED.constituency_name,
  reservation_status = EXCLUDED.reservation_status,
  status = EXCLUDED.status,
  total_electors = EXCLUDED.total_electors,
  total_votes_polled = EXCLUDED.total_votes_polled,
  total_valid_votes = EXCLUDED.total_valid_votes,
  total_rejected_votes = EXCLUDED.total_rejected_votes,
  total_nota_votes = EXCLUDED.total_nota_votes,
  turnout_percentage = EXCLUDED.turnout_percentage,
  victory_margin = EXCLUDED.victory_margin,
  data_status = EXCLUDED.data_status,
  provenance_id = EXCLUDED.provenance_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();
