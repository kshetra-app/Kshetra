-- =============================================================================
-- Rollback Migration 051: Election Data Normalization
-- =============================================================================
-- Milestone: W019 — Election Data Normalization
-- =============================================================================

DROP VIEW IF EXISTS public.vw_legacy_election_results CASCADE;

DROP FUNCTION IF EXISTS public.fn_refresh_contest_metrics(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_validate_contest_totals(UUID) CASCADE;

ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_independent_party_check;
ALTER TABLE public.candidacies DROP COLUMN IF EXISTS postal_votes;
ALTER TABLE public.candidacies DROP COLUMN IF EXISTS evm_votes;
ALTER TABLE public.candidacies DROP COLUMN IF EXISTS contest_id;

DROP TABLE IF EXISTS public.ballot_choices CASCADE;
DROP TABLE IF EXISTS public.election_contests CASCADE;
DROP TABLE IF EXISTS public.election_events CASCADE;
