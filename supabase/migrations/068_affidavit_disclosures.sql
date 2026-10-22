-- ==============================================================================
-- Migration 068: Normalized Candidate Affidavit Disclosure Schema
-- Task: W021.5-E-03 / REQ-FIN-002
-- Authority: DEC-134 6-Rule Sworn Financial Disclosures Standard
-- Scope:
--   1. Create public.candidate_affidavit_disclosures table with disaggregated,
--      strictly nullable BIGINT fields conforming to ECI Form 26.
--   2. Enforce check constraints on non-negative values.
--   3. Foreign key linkages to canonical_persons, candidacies, and constituencies.
--   4. RLS enabled with public read policy.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.candidate_affidavit_disclosures (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id                UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  person_id                   UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  constituency_id             TEXT NOT NULL,
  election_year               INTEGER NOT NULL CHECK (election_year BETWEEN 1947 AND 2030),
  affidavit_date              DATE,
  filing_status               TEXT NOT NULL DEFAULT 'FILED' CHECK (filing_status IN ('FILED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'DISPUTED')),
  
  -- Rule 1 & 2: Disaggregated Asset Classes (Strict Nullability, NO 0 defaults)
  self_movable_assets         BIGINT CHECK (self_movable_assets >= 0),
  spouse_movable_assets       BIGINT CHECK (spouse_movable_assets >= 0),
  dependent_movable_assets    BIGINT CHECK (dependent_movable_assets >= 0),
  total_movable_assets        BIGINT CHECK (total_movable_assets >= 0),
  
  self_immovable_assets       BIGINT CHECK (self_immovable_assets >= 0),
  spouse_immovable_assets     BIGINT CHECK (spouse_immovable_assets >= 0),
  dependent_immovable_assets  BIGINT CHECK (dependent_immovable_assets >= 0),
  total_immovable_assets      BIGINT CHECK (total_immovable_assets >= 0),
  
  total_gross_assets          BIGINT CHECK (total_gross_assets >= 0),
  
  -- Rule 4: Distinct Liabilities (Separated from assets, NO synthetic 0s)
  self_liabilities            BIGINT CHECK (self_liabilities >= 0),
  spouse_liabilities          BIGINT CHECK (spouse_liabilities >= 0),
  dependent_liabilities       BIGINT CHECK (dependent_liabilities >= 0),
  total_liabilities           BIGINT CHECK (total_liabilities >= 0),
  
  -- Criminal Background & Legal Disclosures
  criminal_cases_count        INTEGER NOT NULL DEFAULT 0 CHECK (criminal_cases_count >= 0),
  serious_ipc_count           INTEGER NOT NULL DEFAULT 0 CHECK (serious_ipc_count >= 0),
  convictions_count           INTEGER NOT NULL DEFAULT 0 CHECK (convictions_count >= 0),
  charges_framed_count        INTEGER NOT NULL DEFAULT 0 CHECK (charges_framed_count >= 0),
  
  -- Educational & Professional Background
  highest_education           TEXT,
  education_details           TEXT,
  profession_self             TEXT,
  profession_spouse           TEXT,
  
  -- Source Provenance
  source_affidavit_url        TEXT,
  source_eci_affidavit_id     TEXT,
  source_hash                 TEXT,
  data_status                 public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id               UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Rule 1 & 3: Totals must equal sum of disaggregated parts when parts are evidenced
  CONSTRAINT chk_movable_sum CHECK (
    total_movable_assets IS NULL OR
    (self_movable_assets IS NULL AND spouse_movable_assets IS NULL AND dependent_movable_assets IS NULL) OR
    total_movable_assets = (COALESCE(self_movable_assets, 0) + COALESCE(spouse_movable_assets, 0) + COALESCE(dependent_movable_assets, 0))
  ),
  CONSTRAINT chk_immovable_sum CHECK (
    total_immovable_assets IS NULL OR
    (self_immovable_assets IS NULL AND spouse_immovable_assets IS NULL AND dependent_immovable_assets IS NULL) OR
    total_immovable_assets = (COALESCE(self_immovable_assets, 0) + COALESCE(spouse_immovable_assets, 0) + COALESCE(dependent_immovable_assets, 0))
  ),
  CONSTRAINT chk_gross_assets CHECK (
    total_gross_assets IS NULL OR
    (total_movable_assets IS NULL AND total_immovable_assets IS NULL) OR
    total_gross_assets = (COALESCE(total_movable_assets, 0) + COALESCE(total_immovable_assets, 0))
  ),
  CONSTRAINT chk_liabilities_sum CHECK (
    total_liabilities IS NULL OR
    (self_liabilities IS NULL AND spouse_liabilities IS NULL AND dependent_liabilities IS NULL) OR
    total_liabilities = (COALESCE(self_liabilities, 0) + COALESCE(spouse_liabilities, 0) + COALESCE(dependent_liabilities, 0))
  )
);

CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_person ON public.candidate_affidavit_disclosures(person_id);
CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_candidate ON public.candidate_affidavit_disclosures(candidate_id);
CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_constituency ON public.candidate_affidavit_disclosures(constituency_id, election_year);

ALTER TABLE public.candidate_affidavit_disclosures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_candidate_affidavit_disclosures ON public.candidate_affidavit_disclosures
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;
