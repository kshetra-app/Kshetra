-- ==============================================================================
-- Migration 067: Candidate-to-Contest Foreign Key Constraint Linkage
-- Task: W021.5-D-03 / REQ-CND-003
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Scope:
--   1. Enforce referential integrity on public.candidacies:
--      - fk_candidacies_contest: candidacies(contest_id) -> election_contests(id) ON DELETE RESTRICT
--      - fk_candidacies_person: candidacies(person_id) -> canonical_persons(id) ON DELETE RESTRICT
--      - fk_candidacies_party: candidacies(party_id) -> political_organizations(id) ON DELETE RESTRICT
--   2. Validate indexing on foreign key columns
-- Note: ON DELETE RESTRICT is strictly enforced to protect historical candidate
--       referential integrity against accidental cascading deletions.
--       Exception swallowers removed under CTO Directive 138 (fail-closed DDL execution).
-- ==============================================================================

BEGIN;

-- 1. Ensure foreign key constraints on public.candidacies (fail-closed, no exception suppression)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidacies_contest'
  ) THEN
    ALTER TABLE public.candidacies
      ADD CONSTRAINT fk_candidacies_contest
      FOREIGN KEY (contest_id) REFERENCES public.election_contests(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidacies_person'
  ) THEN
    ALTER TABLE public.candidacies
      ADD CONSTRAINT fk_candidacies_person
      FOREIGN KEY (person_id) REFERENCES public.canonical_persons(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidacies_party'
  ) THEN
    ALTER TABLE public.candidacies
      ADD CONSTRAINT fk_candidacies_party
      FOREIGN KEY (party_id) REFERENCES public.political_organizations(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2. Performance indexes on FKs
CREATE INDEX IF NOT EXISTS idx_candidacies_contest_fk ON public.candidacies(contest_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_person_fk ON public.candidacies(person_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_party_fk ON public.candidacies(party_id) WHERE party_id IS NOT NULL;

COMMIT;
