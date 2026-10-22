-- ==============================================================================
-- Migration 067: Candidate-to-Contest Foreign Key Constraint Linkage
-- Task: W021.5-D-03 / REQ-CND-003
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Scope:
--   1. Enforce referential integrity on public.candidacies:
--      - fk_candidacies_contest: candidacies(contest_id) -> election_contests(id)
--      - fk_candidacies_person: candidacies(person_id) -> canonical_persons(id)
--      - fk_candidacies_org: candidacies(political_organization_id) -> canonical_political_organizations(id)
--   2. Validate indexing on foreign key columns
-- ==============================================================================

BEGIN;

-- 1. Ensure foreign key constraints on public.candidacies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidacies_contest'
  ) THEN
    ALTER TABLE public.candidacies
      ADD CONSTRAINT fk_candidacies_contest
      FOREIGN KEY (contest_id) REFERENCES public.election_contests(id)
      ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
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
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidacies_political_org'
  ) THEN
    ALTER TABLE public.candidacies
      ADD CONSTRAINT fk_candidacies_political_org
      FOREIGN KEY (political_organization_id) REFERENCES public.canonical_political_organizations(id)
      ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN undefined_column THEN null;
END $$;

-- 2. Performance indexes on FKs
CREATE INDEX IF NOT EXISTS idx_candidacies_contest_fk ON public.candidacies(contest_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_person_fk ON public.candidacies(person_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_org_fk ON public.candidacies(political_organization_id);

COMMIT;
