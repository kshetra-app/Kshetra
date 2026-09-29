-- supabase/migrations/054_w019_candidate_channel_unknown_semantics.sql
--
-- Milestone W019 — Candidate Channel Decomposition Unknown Semantics Remediation
-- Authority: CTO FINAL W019 EVIDENCE-SEMANTICS CLOSURE DIRECTIVE (DEC-083)
--
-- Principles Enforced:
-- 1. CASE A: Where EVM and Postal channels are independently evidenced, total = EVM + postal.
-- 2. CASE B: Where candidate total votes are independently evidenced but channel decomposition
--    is unavailable, EVM and Postal MUST remain NULL (UNKNOWN).
-- 3. CASE B MUST NOT be converted into EVM = total, Postal = 0, or any other fabricated split.
-- 4. Magic zeros are strictly barred from representing UNKNOWN channel values.
-- 5. The constraint chk_candidate_votes_sum enforces that (evm_votes IS NULL AND postal_votes IS NULL)
--    OR (evm_votes IS NOT NULL AND postal_votes IS NOT NULL AND votes_received = evm_votes + postal_votes).

BEGIN;

-- 1. Drop 0 defaults from candidacies evm_votes and postal_votes
ALTER TABLE public.candidacies ALTER COLUMN evm_votes DROP DEFAULT;
ALTER TABLE public.candidacies ALTER COLUMN postal_votes DROP DEFAULT;

-- 2. Update existing candidacies where channel decomposition is UNKNOWN (evm=0, postal=0, votes_received > 0)
-- Set evm_votes and postal_votes to NULL (not 0)
UPDATE public.candidacies
SET evm_votes = NULL, postal_votes = NULL
WHERE evm_votes = 0 AND postal_votes = 0 AND votes_received > 0;

-- 3. Update chk_candidate_votes_sum check constraint on public.candidacies
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS chk_candidate_votes_sum;
ALTER TABLE public.candidacies ADD CONSTRAINT chk_candidate_votes_sum
  CHECK (
    (evm_votes IS NULL AND postal_votes IS NULL)
    OR (evm_votes IS NOT NULL AND postal_votes IS NOT NULL AND votes_received = (evm_votes + postal_votes))
  );

-- 4. Update fn_validate_contest_totals to validate candidate channel consistency
CREATE OR REPLACE FUNCTION public.fn_validate_contest_totals(p_contest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- CAND-09A/B: Verify candidate votes EVM/Postal channel breakdown
  -- Candidacies must be either both UNKNOWN (NULL) or both present and conserving votes_received = evm + postal
  IF EXISTS (
    SELECT 1 FROM public.candidacies
    WHERE contest_id = p_contest_id
      AND NOT (
        (evm_votes IS NULL AND postal_votes IS NULL)
        OR (evm_votes IS NOT NULL AND postal_votes IS NOT NULL AND votes_received = (evm_votes + postal_votes))
      )
  ) THEN
    v_errors := array_append(v_errors, 'Candidacy channel breakdown consistency failure: must be either both UNKNOWN/NULL or both present and conserving votes_received = evm + postal');
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
$function$;

COMMIT;
