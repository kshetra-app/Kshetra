-- ==============================================================================
-- Migration 069: Candidate Referential Integrity & Constraint Reconciliation
-- Task: W021.5-D-03 / REQ-CND-003 / CTO Directive 149 Section 4
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Forward-only reconciliation of candidacies referential integrity and indexes.
-- Idempotently reconciles environments regardless of whether Migration 067 was
-- applied in its original or modified form.
-- Scope:
--   1. Reconcile contest_id FK:
--      - Drop legacy ON DELETE CASCADE foreign key from Migration 051 (candidacies_contest_id_fkey)
--      - Enforce named constraint fk_candidacies_contest:
--        candidacies(contest_id) -> election_contests(id) ON DELETE RESTRICT
--   2. Reconcile person_id FK:
--      - Drop legacy auto-generated foreign key from Migration 050 (candidacies_person_id_fkey)
--      - Enforce named constraint fk_candidacies_person:
--        candidacies(person_id) -> canonical_persons(id) ON DELETE RESTRICT
--   3. Reconcile party_id FK:
--      - Drop legacy auto-generated foreign key from Migration 050 (candidacies_party_id_fkey)
--      - Enforce named constraint fk_candidacies_party:
--        candidacies(party_id) -> political_organizations(id) ON DELETE RESTRICT
--   4. Deduplicate redundant indexes:
--      - Drop duplicate index definitions (idx_candidacies_contest_fk, idx_candidacies_person_fk, idx_candidacies_party_fk)
--      - Ensure canonical base indexes exist (idx_candidacies_contest_id, idx_candidacies_person, idx_candidacies_party)
-- Note: ON DELETE RESTRICT is strictly enforced to protect historical candidate
--       referential integrity against accidental cascading deletions.
--       Transaction safety is preserved; zero exception swallowing.
-- ==============================================================================

BEGIN;

-- 1. Reconcile contest_id FK: drop legacy CASCADE FK from Migration 051 if present
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_contest_id_fkey;

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

-- 2. Reconcile person_id FK: drop legacy unnamed FK from Migration 050 if present
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_person_id_fkey;

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

-- 3. Reconcile party_id FK: drop legacy unnamed FK from Migration 050 if present
ALTER TABLE public.candidacies DROP CONSTRAINT IF EXISTS candidacies_party_id_fkey;

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

-- 4. Clean up redundant duplicate indexes while ensuring canonical base indexes exist
DROP INDEX IF EXISTS public.idx_candidacies_contest_fk;
DROP INDEX IF EXISTS public.idx_candidacies_person_fk;
DROP INDEX IF EXISTS public.idx_candidacies_party_fk;

CREATE INDEX IF NOT EXISTS idx_candidacies_contest_id ON public.candidacies(contest_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_person ON public.candidacies(person_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_party ON public.candidacies(party_id) WHERE party_id IS NOT NULL;

COMMIT;
