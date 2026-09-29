-- =============================================================================
-- Migration 052: W019 Persistence Semantics Remediation
-- =============================================================================
-- Target: panIN-staging (fkpigozcqnmcvofuksar) / Local Docker (supabase_db_Kshetra)
-- Production remains strictly AIR-GAPPED (ehfafcnimmjusyvplbah).
-- Mode: Append-only, non-destructive schema and benchmark data reconciliation.
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
-- 4. Apply reconciled authoritative Form 20 / ECI Detailed benchmark fixtures:
--    - Gajwel AC-040: Eatala Rajender = 66,653; victory margin = 45,031;
--      total_valid_votes = 227,702; total_votes_polled = 232,417; total_rejected_votes = NULL.
--    - Kodangal AC-065: Bantu Ramesh = 3,988; NOTA = 2,002; total_valid_votes = 195,163;
--      total_rejected_votes = 124 (statutory Form 20 postal); total_votes_polled = 195,287.
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

-- 6. Apply authoritative statutory benchmarks for Kodangal and Gajwel
DO $$
DECLARE
  v_kodangal_contest_id UUID := '01900000-0000-0000-0000-000000000003'::uuid;
  v_gajwel_contest_id UUID := '01900000-0000-0000-0000-000000000004'::uuid;
  v_cand_bramesh UUID := '01900000-0000-0000-0000-000000000023'::uuid;
  v_cand_eatala UUID := '01900000-0000-0000-0000-000000000025'::uuid;
  v_cand_kodangal_pool UUID := '01900000-0000-0000-0000-000000000027'::uuid;
  v_cand_gajwel_pool UUID := '01900000-0000-0000-0000-000000000028'::uuid;
BEGIN
  -- A. Kodangal Candidacies Update:
  -- Bantu Ramesh Kumar (BJP): 3,988 votes (Form 20 / Gazette: EVM 3,928, Postal 60)
  UPDATE public.candidacies
  SET votes_received = 3988, evm_votes = 3928, postal_votes = 60, vote_share = 2.04
  WHERE id = v_cand_bramesh;

  -- Kodangal Independent Pool: 6,847 votes (EVM 6,800, Postal 47)
  UPDATE public.candidacies
  SET votes_received = 6847, evm_votes = 6800, postal_votes = 47, vote_share = 3.51
  WHERE id = v_cand_kodangal_pool;

  -- Kodangal NOTA: 2,002 votes
  UPDATE public.ballot_choices
  SET votes_received = 2002, vote_share = 1.03
  WHERE contest_id = v_kodangal_contest_id AND choice_type = 'NOTA';

  -- Kodangal Contest Update:
  -- total_valid_votes = 195,163 (193,161 candidates + 2,002 NOTA)
  -- total_rejected_votes = 124 (Form 20 independent postal rejected ballots)
  -- total_votes_polled = 195,287 (195,163 valid + 124 rejected postal)
  UPDATE public.election_contests
  SET
    total_electors = 240490,
    total_valid_votes = 195163,
    total_rejected_votes = 124,
    total_votes_polled = 195287,
    total_nota_votes = 2002,
    turnout_percentage = 81.20,
    victory_margin = 32532
  WHERE id = v_kodangal_contest_id;

  -- B. Gajwel Candidacies Update:
  -- Eatala Rajender (BJP): 66,653 votes (ECI Detailed Results: EVM 65,961, Postal 692)
  UPDATE public.candidacies
  SET votes_received = 66653, evm_votes = 65961, postal_votes = 692, vote_share = 29.27
  WHERE id = v_cand_eatala;

  -- Gajwel Independent Pool: 15,965 votes (13 candidates pool: EVM 15,900, Postal 65)
  UPDATE public.candidacies
  SET votes_received = 15965, evm_votes = 15900, postal_votes = 65, vote_share = 7.01
  WHERE id = v_cand_gajwel_pool;

  -- Gajwel NOTA: 832 votes
  UPDATE public.ballot_choices
  SET votes_received = 832, vote_share = 0.37
  WHERE contest_id = v_gajwel_contest_id AND choice_type = 'NOTA';

  -- Gajwel Contest Update:
  -- total_valid_votes = 227,702 (226,870 candidates + 832 NOTA)
  -- total_rejected_votes = NULL (UNKNOWN: anti-derivation rule strictly enforced)
  -- total_votes_polled = 232,417 (ECI turnout)
  -- victory_margin = 45,031 (111,684 - 66,653)
  UPDATE public.election_contests
  SET
    total_electors = 267882,
    total_valid_votes = 227702,
    total_rejected_votes = NULL,
    total_votes_polled = 232417,
    total_nota_votes = 832,
    turnout_percentage = 86.76,
    victory_margin = 45031
  WHERE id = v_gajwel_contest_id;

  -- Refresh contest metrics
  PERFORM public.fn_refresh_contest_metrics(v_kodangal_contest_id);
  PERFORM public.fn_refresh_contest_metrics(v_gajwel_contest_id);

  RAISE NOTICE 'SUCCESS: Migration 052 applied authoritative persistence semantics.';
END $$;
