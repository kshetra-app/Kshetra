-- =============================================================================
-- Migration 051: Election Data Normalization
-- =============================================================================
-- Milestone: W019 — Election Data Normalization
-- Authority: PLAN-W019-MASTER-REV-1.md / DEC-074
-- Specification: Master Product Blueprint & Amendment v1.6
--
-- Core Architecture:
-- 1. election_events: Canonical macro electoral cycle (state, body, year, dates, turnout)
-- 2. election_contests: Seat-level territorial contest binding election to constituency
-- 3. ballot_choices: Non-person ballot choices (NOTA, rejected postal, disputed votes)
-- 4. candidacies extension: Added contest_id FK, evm_votes, postal_votes, independent check
-- 5. Helper functions: fn_validate_contest_totals, fn_refresh_contest_metrics (100% SECURITY INVOKER)
-- 6. RLS: Enabled on all tables; public SELECT; service_role write
-- 7. Legacy view: vw_legacy_election_results
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CANONICAL ELECTION EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.election_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_code TEXT UNIQUE NOT NULL,
  state_code TEXT NOT NULL,
  election_type TEXT NOT NULL CHECK (election_type IN ('assembly', 'parliamentary', 'local_body', 'by_election')),
  election_year INTEGER NOT NULL CHECK (election_year >= 1947),
  title TEXT NOT NULL,
  notification_date DATE,
  polling_date DATE NOT NULL,
  counting_date DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'ongoing', 'counting', 'completed', 'cancelled')),
  total_constituencies INTEGER NOT NULL DEFAULT 0 CHECK (total_constituencies >= 0),
  total_electors BIGINT DEFAULT 0 CHECK (total_electors >= 0),
  total_votes_polled BIGINT DEFAULT 0 CHECK (total_votes_polled >= 0),
  turnout_percentage NUMERIC(5,2) DEFAULT 0.0 CHECK (turnout_percentage >= 0 AND turnout_percentage <= 100),
  data_status data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_election_events_state ON public.election_events(state_code);
CREATE INDEX IF NOT EXISTS idx_election_events_year_type ON public.election_events(election_year, election_type);
CREATE INDEX IF NOT EXISTS idx_election_events_code ON public.election_events(election_code);

-- -----------------------------------------------------------------------------
-- 2. CANONICAL ELECTION CONTESTS (Seat-Level Contests)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.election_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  contest_code TEXT UNIQUE NOT NULL,
  constituency_id TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
  constituency_version_id UUID,
  constituency_name TEXT NOT NULL,
  reservation_status TEXT NOT NULL DEFAULT 'GEN' CHECK (reservation_status IN ('GEN', 'SC', 'ST')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'countermanded', 'cancelled', 're_polled')),
  is_uncontested BOOLEAN NOT NULL DEFAULT false,
  countermanded_contest_id UUID REFERENCES public.election_contests(id) ON DELETE SET NULL,
  total_electors INTEGER NOT NULL DEFAULT 0 CHECK (total_electors >= 0),
  total_votes_polled INTEGER NOT NULL DEFAULT 0 CHECK (total_votes_polled >= 0),
  total_valid_votes INTEGER NOT NULL DEFAULT 0 CHECK (total_valid_votes >= 0),
  total_rejected_votes INTEGER NOT NULL DEFAULT 0 CHECK (total_rejected_votes >= 0),
  total_nota_votes INTEGER NOT NULL DEFAULT 0 CHECK (total_nota_votes >= 0),
  turnout_percentage NUMERIC(5,2) DEFAULT 0.0 CHECK (turnout_percentage >= 0 AND turnout_percentage <= 100),
  victory_margin INTEGER DEFAULT 0 CHECK (victory_margin >= 0),
  winning_candidacy_id UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  runner_up_candidacy_id UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  data_status data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_election_contests_seat UNIQUE (election_id, constituency_id),
  CONSTRAINT check_contest_electors CHECK (total_votes_polled <= total_electors OR total_electors = 0),
  CONSTRAINT check_contest_votes_conservation CHECK (status NOT IN ('completed') OR total_votes_polled = total_valid_votes + total_rejected_votes OR total_votes_polled = 0),
  CONSTRAINT check_contest_distinct_winner_runner_up CHECK (winning_candidacy_id IS NULL OR runner_up_candidacy_id IS NULL OR winning_candidacy_id <> runner_up_candidacy_id)
);

CREATE INDEX IF NOT EXISTS idx_election_contests_election ON public.election_contests(election_id);
CREATE INDEX IF NOT EXISTS idx_election_contests_constituency ON public.election_contests(constituency_id);
CREATE INDEX IF NOT EXISTS idx_election_contests_code ON public.election_contests(contest_code);
CREATE INDEX IF NOT EXISTS idx_election_contests_winning ON public.election_contests(winning_candidacy_id);

ALTER TABLE public.election_contests DROP CONSTRAINT IF EXISTS check_contest_votes_polled;
ALTER TABLE public.election_contests DROP CONSTRAINT IF EXISTS check_contest_votes_conservation;
ALTER TABLE public.election_contests ADD CONSTRAINT check_contest_votes_conservation
  CHECK (status NOT IN ('completed') OR total_votes_polled = total_valid_votes + total_rejected_votes OR total_votes_polled = 0);

ALTER TABLE public.election_contests DROP CONSTRAINT IF EXISTS check_contest_distinct_winner_runner_up;
ALTER TABLE public.election_contests ADD CONSTRAINT check_contest_distinct_winner_runner_up
  CHECK (winning_candidacy_id IS NULL OR runner_up_candidacy_id IS NULL OR winning_candidacy_id <> runner_up_candidacy_id);

-- -----------------------------------------------------------------------------
-- 3. VALID NON-CANDIDATE BALLOT CHOICES (NOTA)
-- -----------------------------------------------------------------------------
-- Statutory ballot choices placed before the elector (e.g. NOTA under Rule 49-O / ECI Directions).
-- Rejected votes (rejected postal ballots under Rule 54A) and disputed categories are NOT
-- valid ballot choices and are recorded in election_contests.total_rejected_votes or metadata.
CREATE TABLE IF NOT EXISTS public.ballot_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.election_contests(id) ON DELETE CASCADE,
  choice_type TEXT NOT NULL CHECK (choice_type IN ('NOTA')),
  is_valid_vote BOOLEAN NOT NULL DEFAULT true CHECK (is_valid_vote = true),
  votes_received INTEGER NOT NULL DEFAULT 0 CHECK (votes_received >= 0),
  vote_share NUMERIC(5,2) DEFAULT 0.0 CHECK (vote_share >= 0 AND vote_share <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ballot_choice_contest_type UNIQUE (contest_id, choice_type)
);

ALTER TABLE public.ballot_choices
  ADD COLUMN IF NOT EXISTS is_valid_vote BOOLEAN NOT NULL DEFAULT true CHECK (is_valid_vote = true);

ALTER TABLE public.ballot_choices DROP CONSTRAINT IF EXISTS ballot_choices_choice_type_check;
ALTER TABLE public.ballot_choices ADD CONSTRAINT ballot_choices_choice_type_check
  CHECK (choice_type IN ('NOTA'));

CREATE INDEX IF NOT EXISTS idx_ballot_choices_contest ON public.ballot_choices(contest_id);

-- -----------------------------------------------------------------------------
-- 4. EXTEND CANDIDACIES TABLE (W018 Integration)
-- -----------------------------------------------------------------------------
ALTER TABLE public.candidacies
  ADD COLUMN IF NOT EXISTS contest_id UUID REFERENCES public.election_contests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS evm_votes INTEGER DEFAULT 0 CHECK (evm_votes >= 0),
  ADD COLUMN IF NOT EXISTS postal_votes INTEGER DEFAULT 0 CHECK (postal_votes >= 0);

CREATE INDEX IF NOT EXISTS idx_candidacies_contest_id ON public.candidacies(contest_id);

-- Update candidacies_result_check to permit 'won_uncontested'
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_result_check;
ALTER TABLE public.candidacies ADD CONSTRAINT candidacies_result_check
  CHECK (result IN ('won', 'lost', 'forfeited_deposit', 'withdrawn', 'pending', 'won_uncontested'));

-- Enforce independent party check
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_independent_party_check;
ALTER TABLE public.candidacies ADD CONSTRAINT candidacies_independent_party_check
  CHECK ((is_independent = true AND party_id IS NULL) OR (is_independent = false AND party_id IS NOT NULL));

-- Candidacy uniqueness: one person cannot receive duplicate candidacy records in the same contest
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS uq_candidacies_contest_person;
ALTER TABLE public.candidacies ADD CONSTRAINT uq_candidacies_contest_person
  UNIQUE (contest_id, person_id);

-- Candidacy vote breakdown conservation: votes_received = evm_votes + postal_votes
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS chk_candidate_votes_sum;
ALTER TABLE public.candidacies ADD CONSTRAINT chk_candidate_votes_sum
  CHECK (votes_received = evm_votes + postal_votes OR (evm_votes = 0 AND postal_votes = 0));

-- -----------------------------------------------------------------------------
-- 5. STORED PROCEDURES (100% SECURITY INVOKER)
-- -----------------------------------------------------------------------------

-- Procedure A: Validate contest vote totals
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
  v_invalid_candidacies INTEGER := 0;
BEGIN
  SELECT * INTO v_contest FROM public.election_contests WHERE id = p_contest_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verify candidate votes EVM/Postal channel breakdown
  SELECT COUNT(*) INTO v_invalid_candidacies
  FROM public.candidacies
  WHERE contest_id = p_contest_id
    AND NOT (votes_received = evm_votes + postal_votes OR (evm_votes = 0 AND postal_votes = 0));

  IF v_invalid_candidacies > 0 THEN
    RETURN FALSE;
  END IF;

  -- Sum candidate votes
  SELECT COALESCE(SUM(votes_received), 0) INTO v_candidate_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id;

  -- Sum NOTA votes from ballot_choices (strictly valid non-candidate choices)
  SELECT COALESCE(SUM(votes_received), 0) INTO v_nota_votes
  FROM public.ballot_choices
  WHERE contest_id = p_contest_id AND choice_type = 'NOTA' AND is_valid_vote = true;

  -- If ballot_choices has 0, fall back to total_nota_votes on contest
  IF v_nota_votes = 0 THEN
    v_nota_votes := COALESCE(v_contest.total_nota_votes, 0);
  END IF;

  v_total_valid_counted := v_candidate_votes + v_nota_votes;

  -- ACCT-02: Total valid votes must equal candidate valid votes + valid non-candidate ballot choices
  IF v_contest.total_valid_votes > 0 THEN
    IF ABS(v_total_valid_counted - v_contest.total_valid_votes) > 1 THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- ACCT-01: Total votes polled must equal total_valid_votes + total_rejected_votes
  IF v_contest.status = 'completed' AND v_contest.total_votes_polled > 0 THEN
    IF v_contest.total_votes_polled <> (v_contest.total_valid_votes + v_contest.total_rejected_votes) THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- Procedure B: Refresh contest victory margin, winner and runner-up
CREATE OR REPLACE FUNCTION public.fn_refresh_contest_metrics(p_contest_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_winner_id UUID;
  v_winner_votes INTEGER := 0;
  v_runner_up_id UUID;
  v_runner_up_votes INTEGER := 0;
  v_margin INTEGER := 0;
  v_total_valid INTEGER := 0;
  v_total_nota INTEGER := 0;
  v_turnout NUMERIC(5,2) := 0.0;
  v_electors INTEGER := 0;
  v_polled INTEGER := 0;
  v_rejected INTEGER := 0;
BEGIN
  -- Top 2 candidates
  SELECT id, votes_received INTO v_winner_id, v_winner_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id
  ORDER BY votes_received DESC, created_at ASC
  LIMIT 1;

  SELECT id, votes_received INTO v_runner_up_id, v_runner_up_votes
  FROM public.candidacies
  WHERE contest_id = p_contest_id AND id <> v_winner_id
  ORDER BY votes_received DESC, created_at ASC
  LIMIT 1;

  IF v_winner_votes > 0 AND v_runner_up_votes >= 0 THEN
    v_margin := v_winner_votes - v_runner_up_votes;
  END IF;

  -- Extract electors, polled, rejected, nota
  SELECT total_electors, total_votes_polled, total_rejected_votes, total_nota_votes
  INTO v_electors, v_polled, v_rejected, v_total_nota
  FROM public.election_contests WHERE id = p_contest_id;

  -- Calculate total valid votes
  SELECT COALESCE(SUM(votes_received), 0) INTO v_total_valid
  FROM public.candidacies
  WHERE contest_id = p_contest_id;

  -- Prefer NOTA from ballot_choices
  SELECT COALESCE(SUM(votes_received), v_total_nota) INTO v_total_nota
  FROM public.ballot_choices
  WHERE contest_id = p_contest_id AND choice_type = 'NOTA' AND is_valid_vote = true;

  v_total_valid := v_total_valid + COALESCE(v_total_nota, 0);

  -- Conserve total_votes_polled = total_valid + total_rejected if polled is unassigned
  IF v_polled = 0 THEN
    v_polled := v_total_valid + COALESCE(v_rejected, 0);
  END IF;

  IF v_electors > 0 AND v_polled > 0 THEN
    v_turnout := ROUND((v_polled::NUMERIC / v_electors::NUMERIC) * 100.0, 2);
  END IF;

  UPDATE public.election_contests
  SET
    winning_candidacy_id = v_winner_id,
    runner_up_candidacy_id = v_runner_up_id,
    victory_margin = v_margin,
    total_valid_votes = v_total_valid,
    total_votes_polled = v_polled,
    total_nota_votes = COALESCE(v_total_nota, total_nota_votes),
    turnout_percentage = CASE WHEN v_turnout > 0 THEN v_turnout ELSE turnout_percentage END,
    updated_at = now()
  WHERE id = p_contest_id;
END;
$$;

-- Procedure C: Winner and runner-up contest integrity trigger
CREATE OR REPLACE FUNCTION public.fn_check_contest_winner_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_w_contest UUID;
  v_r_contest UUID;
BEGIN
  IF NEW.winning_candidacy_id IS NOT NULL THEN
    SELECT contest_id INTO v_w_contest FROM public.candidacies WHERE id = NEW.winning_candidacy_id;
    IF v_w_contest IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'CROSS_CONTEST_CANDIDACY: winning_candidacy_id % belongs to contest %, not %', NEW.winning_candidacy_id, v_w_contest, NEW.id;
    END IF;
  END IF;

  IF NEW.runner_up_candidacy_id IS NOT NULL THEN
    SELECT contest_id INTO v_r_contest FROM public.candidacies WHERE id = NEW.runner_up_candidacy_id;
    IF v_r_contest IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'CROSS_CONTEST_CANDIDACY: runner_up_candidacy_id % belongs to contest %, not %', NEW.runner_up_candidacy_id, v_r_contest, NEW.id;
    END IF;
  END IF;

  IF NEW.winning_candidacy_id IS NOT NULL AND NEW.runner_up_candidacy_id IS NOT NULL AND NEW.winning_candidacy_id = NEW.runner_up_candidacy_id THEN
    RAISE EXCEPTION 'DUPLICATE_WINNER_RUNNER_UP: winning_candidacy_id cannot be identical to runner_up_candidacy_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contest_winner_integrity ON public.election_contests;
CREATE TRIGGER trg_contest_winner_integrity
  BEFORE INSERT OR UPDATE OF winning_candidacy_id, runner_up_candidacy_id, id
  ON public.election_contests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_contest_winner_integrity();

-- -----------------------------------------------------------------------------
-- 6. BACKWARD-COMPATIBLE VIEW (Exposing Legacy election_results Format)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_legacy_election_results AS
SELECT
  ec.id AS contest_id,
  ee.election_code,
  ee.election_year,
  ee.election_type,
  ec.constituency_id,
  ec.constituency_name,
  w_p.canonical_name AS winner_name,
  w_org.symbol_url AS winner_party_symbol,
  w_c.party_id AS winner_party,
  w_c.votes_received AS winner_votes,
  r_p.canonical_name AS runner_up_name,
  r_c.party_id AS runner_up_party,
  r_c.votes_received AS runner_up_votes,
  ec.victory_margin AS margin,
  ec.total_votes_polled AS votes_polled,
  ec.turnout_percentage AS turnout
FROM public.election_contests ec
JOIN public.election_events ee ON ec.election_id = ee.id
LEFT JOIN public.candidacies w_c ON ec.winning_candidacy_id = w_c.id
LEFT JOIN public.canonical_persons w_p ON w_c.person_id = w_p.id
LEFT JOIN public.political_organizations w_org ON w_c.party_id = w_org.id
LEFT JOIN public.candidacies r_c ON ec.runner_up_candidacy_id = r_c.id
LEFT JOIN public.canonical_persons r_p ON r_c.person_id = r_p.id;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) & GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.election_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ballot_choices ENABLE ROW LEVEL SECURITY;

-- Read policies: Open to public (anon, authenticated, service_role)
DROP POLICY IF EXISTS "election_events_select_policy" ON public.election_events;
CREATE POLICY "election_events_select_policy" ON public.election_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "election_contests_select_policy" ON public.election_contests;
CREATE POLICY "election_contests_select_policy" ON public.election_contests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ballot_choices_select_policy" ON public.ballot_choices;
CREATE POLICY "ballot_choices_select_policy" ON public.ballot_choices
  FOR SELECT USING (true);

-- Mutation policies: Strictly service_role
DROP POLICY IF EXISTS "election_events_service_role_all" ON public.election_events;
CREATE POLICY "election_events_service_role_all" ON public.election_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "election_contests_service_role_all" ON public.election_contests;
CREATE POLICY "election_contests_service_role_all" ON public.election_contests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ballot_choices_service_role_all" ON public.ballot_choices;
CREATE POLICY "ballot_choices_service_role_all" ON public.ballot_choices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON public.election_events TO anon, authenticated, service_role;
GRANT SELECT ON public.election_contests TO anon, authenticated, service_role;
GRANT SELECT ON public.ballot_choices TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_legacy_election_results TO anon, authenticated, service_role;

GRANT ALL ON public.election_events TO service_role;
GRANT ALL ON public.election_contests TO service_role;
GRANT ALL ON public.ballot_choices TO service_role;

-- Revoke mutation rights from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON public.election_events FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.election_contests FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.ballot_choices FROM anon, authenticated, public;

-- Function execution: 100% SECURITY INVOKER
GRANT EXECUTE ON FUNCTION public.fn_validate_contest_totals(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_contest_metrics(UUID) TO service_role;
