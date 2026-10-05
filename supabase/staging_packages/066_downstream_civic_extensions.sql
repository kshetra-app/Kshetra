-- ==============================================================================
-- KSHETRA CANONICAL ELECTORAL GEOGRAPHY & CIVIC EXTENSIONS
-- Migration: 066_downstream_civic_extensions.sql
-- Milestone: W021.5-B2.2-E: Downstream Civic & Political Extensions
--
-- Baseline Commit: 40c502d054805fe19ff2d59e835d038c1f80b335 (40c502d)
-- Authorities:
--   1. Candidate Transparency: Association for Democratic Reforms (ADR) / MyNeta
--      Election Commission of India (ECI) Form 26 Sworn Affidavits
--   2. Delimitation Lineage: Delimitation Act, 2002 / J&K Reorganisation Act, 2019 /
--      Assam Delimitation Order 2023 / Delimitation Commission Orders 1976 & 2008
--   3. Voter Demographics & Turnout: ECI General Election Statistical Reports /
--      Census of India / State Election Commissions
--
-- Non-Interference Guarantees:
--   - B2.2-C (1,207 rows) and B2.2-D (48,284 rows) strictly preserved.
--   - Zero modifications to historical seed files (data/seed/**).
--   - Production database (ehfafcnimmjusyvplbah) strictly air-gapped.
-- ==============================================================================

BEGIN;

-- ─── 1. DATASET VERSIONS REGISTRATION ──────────────────────────────────────────

INSERT INTO public.dataset_versions (
  id, dataset_name, version_tag, authority, description, effective_date, checksum
)
VALUES
  (
    'myneta_candidate_disclosures_2024_v1',
    'National Election Watch / MyNeta Candidate Affidavits (Form 26)',
    '2024-MYNETA-AFFIDAVITS-V1',
    'Association for Democratic Reforms (ADR) & Election Commission of India',
    'Authoritative sworn financial assets, liabilities, criminal cases, education and professional disclosures for Assembly and Parliamentary election candidates',
    '2024-06-04'::date,
    'sha256:myneta_adr_eci_form26_candidate_sworn_disclosures_v1'
  ),
  (
    'eci_constituency_lineage_regimes_2024_v1',
    'ECI Delimitation & Statutory Reorganisation Lineage Registry',
    '2024-DELIM-LINEAGE-V1',
    'Election Commission of India & Delimitation Commission of India',
    'Statutory delimitation regime lineage, constituency name/boundary transitions, and temporal succession',
    '2023-08-16'::date,
    'sha256:eci_delimitation_constituency_temporal_lineage_registry_v1'
  ),
  (
    'eci_constituency_demographics_turnout_2024_v1',
    'ECI & Census Assembly Constituency Demographics and Turnout Registry',
    '2024-AC-DEMOGRAPHICS-TURNOUT-V1',
    'Election Commission of India & Office of the Registrar General & Census Commissioner',
    'Electoral rolls, voter turnout rates, gender disaggregation, literacy, urbanisation, and social composition estimates across 4,142 Assembly Constituencies',
    '2024-06-04'::date,
    'sha256:eci_census_assembly_constituency_demographics_turnout_registry_v1'
  )
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  effective_date = EXCLUDED.effective_date;

-- ─── 2. ENHANCE CANDIDATE AFFIDAVITS WITH CANONICAL FOREIGN KEYS ───────────────

-- Ensure candidate_affidavits has explicit relational bridges to canonical persons, candidacies, and provenance
ALTER TABLE public.candidate_affidavits
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS candidacy_id UUID REFERENCES public.candidacies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL';

CREATE INDEX IF NOT EXISTS idx_candidate_affidavits_person ON public.candidate_affidavits(person_id);
CREATE INDEX IF NOT EXISTS idx_candidate_affidavits_candidacy ON public.candidate_affidavits(candidacy_id);
CREATE INDEX IF NOT EXISTS idx_candidate_affidavits_provenance ON public.candidate_affidavits(provenance_id);

-- ─── 3. CANONICAL CONSTITUENCY DEMOGRAPHICS TABLE ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.constituency_demographics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_code       TEXT NOT NULL,
  ac_no                   INTEGER NOT NULL,
  state_code              TEXT NOT NULL,
  constituency_name       TEXT NOT NULL,
  election_year           INTEGER NOT NULL,
  total_population        BIGINT,
  registered_voters       BIGINT,
  total_voters            BIGINT,
  male_voters             BIGINT,
  female_voters           BIGINT,
  turnout_percentage      NUMERIC(5,2),
  literacy_rate           NUMERIC(5,2),
  urban_percentage        NUMERIC(5,2),
  sc_percentage           NUMERIC(5,2),
  st_percentage           NUMERIC(5,2),
  area_sq_km              NUMERIC(10,2),
  polling_stations        INTEGER,
  data_status             public.data_status_enum NOT NULL DEFAULT 'ESTIMATE',
  provenance_id           UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_constituency_demographics UNIQUE(state_code, ac_no, election_year)
);

CREATE INDEX IF NOT EXISTS idx_constituency_demographics_state ON public.constituency_demographics(state_code);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_ac ON public.constituency_demographics(state_code, ac_no);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_year ON public.constituency_demographics(election_year);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_prov ON public.constituency_demographics(provenance_id);

-- Enable RLS on constituency_demographics
ALTER TABLE public.constituency_demographics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read for constituency demographics"
    ON public.constituency_demographics FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role insert and update for constituency demographics"
    ON public.constituency_demographics FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;
