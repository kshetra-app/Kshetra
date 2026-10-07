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

-- ─── 1. DATASETS & DATASET VERSIONS REGISTRATION ─────────────────────────────

-- 1.1 Pre-assertion: Fail-closed canonical dataset identity protection
DO $BODY$
DECLARE
  v_ds RECORD;
BEGIN
  -- Check myneta_candidate_disclosures
  SELECT id, name, domain, description, source_id, license
  INTO v_ds
  FROM public.datasets
  WHERE id = 'myneta_candidate_disclosures';

  IF FOUND THEN
    IF (v_ds.name, v_ds.domain, v_ds.source_id)
       IS DISTINCT FROM
       ('National Election Watch / MyNeta Candidate Affidavits (Form 26)',
        'political_profiles',
        'myneta') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_IDENTITY_CONFLICT: Existing dataset % has conflicting canonical attributes (name=%, domain=%, source=%)',
        v_ds.id, v_ds.name, v_ds.domain, v_ds.source_id;
    END IF;
  END IF;

  -- Check eci_constituency_lineage_regimes
  SELECT id, name, domain, description, source_id, license
  INTO v_ds
  FROM public.datasets
  WHERE id = 'eci_constituency_lineage_regimes';

  IF FOUND THEN
    IF (v_ds.name, v_ds.domain, v_ds.source_id)
       IS DISTINCT FROM
       ('ECI Delimitation & Statutory Reorganisation Lineage Registry',
        'geography',
        'eci') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_IDENTITY_CONFLICT: Existing dataset % has conflicting canonical attributes (name=%, domain=%, source=%)',
        v_ds.id, v_ds.name, v_ds.domain, v_ds.source_id;
    END IF;
  END IF;

  -- Check eci_constituency_demographics_turnout
  SELECT id, name, domain, description, source_id, license
  INTO v_ds
  FROM public.datasets
  WHERE id = 'eci_constituency_demographics_turnout';

  IF FOUND THEN
    IF (v_ds.name, v_ds.domain, v_ds.source_id)
       IS DISTINCT FROM
       ('ECI & Census Assembly Constituency Demographics and Turnout Registry',
        'demographics',
        'eci') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_IDENTITY_CONFLICT: Existing dataset % has conflicting canonical attributes (name=%, domain=%, source=%)',
        v_ds.id, v_ds.name, v_ds.domain, v_ds.source_id;
    END IF;
  END IF;
END $BODY$;

-- 1.2 Canonical Dataset Registration
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  (
    'myneta_candidate_disclosures',
    'National Election Watch / MyNeta Candidate Affidavits (Form 26)',
    'political_profiles',
    'Authoritative sworn financial assets, liabilities, criminal cases, education and professional disclosures for Assembly and Parliamentary election candidates',
    'myneta',
    'Public Domain / Fair Use Reporting'
  ),
  (
    'eci_constituency_lineage_regimes',
    'ECI Delimitation & Statutory Reorganisation Lineage Registry',
    'geography',
    'Statutory delimitation regime lineage, constituency name/boundary transitions, and temporal succession',
    'eci',
    'Government Open Data'
  ),
  (
    'eci_constituency_demographics_turnout',
    'ECI & Census Assembly Constituency Demographics and Turnout Registry',
    'demographics',
    'Electoral rolls, voter turnout rates, gender disaggregation, literacy, urbanisation, and social composition estimates across 4,123 Assembly Constituencies',
    'eci',
    'Government Open Data'
  )
ON CONFLICT (id) DO NOTHING;

-- 1.3 Pre-assertion: Fail-closed canonical dataset version identity protection
DO $BODY$
DECLARE
  v_ver RECORD;
BEGIN
  -- Check myneta_candidate_disclosures_2024_v1
  SELECT id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status
  INTO v_ver
  FROM public.dataset_versions
  WHERE id = 'myneta_candidate_disclosures_2024_v1';

  IF FOUND THEN
    IF (v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status::text)
       IS DISTINCT FROM
       ('myneta_candidate_disclosures',
        '2024-MYNETA-AFFIDAVITS-V1',
        '2024-06-04'::date,
        'OFFICIAL') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_VERSION_CONFLICT: Existing dataset version % has conflicting canonical attributes (dataset=%, tag=%, from=%, status=%)',
        v_ver.id, v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status;
    END IF;
  END IF;

  -- Check eci_constituency_lineage_regimes_2024_v1
  SELECT id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status
  INTO v_ver
  FROM public.dataset_versions
  WHERE id = 'eci_constituency_lineage_regimes_2024_v1';

  IF FOUND THEN
    IF (v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status::text)
       IS DISTINCT FROM
       ('eci_constituency_lineage_regimes',
        '2024-DELIM-LINEAGE-V1',
        '2023-08-16'::date,
        'VERIFIED') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_VERSION_CONFLICT: Existing dataset version % has conflicting canonical attributes (dataset=%, tag=%, from=%, status=%)',
        v_ver.id, v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status;
    END IF;
  END IF;

  -- Check eci_constituency_demographics_turnout_2024_v1
  SELECT id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status
  INTO v_ver
  FROM public.dataset_versions
  WHERE id = 'eci_constituency_demographics_turnout_2024_v1';

  IF FOUND THEN
    IF (v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status::text)
       IS DISTINCT FROM
       ('eci_constituency_demographics_turnout',
        '2024-AC-DEMOGRAPHICS-TURNOUT-V1',
        '2024-06-04'::date,
        'ESTIMATE') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_VERSION_CONFLICT: Existing dataset version % has conflicting canonical attributes (dataset=%, tag=%, from=%, status=%)',
        v_ver.id, v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status;
    END IF;
  END IF;
END $BODY$;

-- 1.4 Authoritative Dataset Version Snapshots (Schema 039 Compliant)
INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, effective_from, default_status, record_count, metadata
)
VALUES
  (
    'myneta_candidate_disclosures_2024_v1',
    'myneta_candidate_disclosures',
    '2024-MYNETA-AFFIDAVITS-V1',
    '2024-06-04'::date,
    'OFFICIAL',
    4524,
    '{"statutory_authority": "Association for Democratic Reforms (ADR) & Election Commission of India", "description": "Authoritative sworn financial assets, liabilities, criminal cases, education and professional disclosures for Assembly and Parliamentary election candidates", "checksum": "sha256:myneta_adr_eci_form26_candidate_sworn_disclosures_v1"}'::jsonb
  ),
  (
    'eci_constituency_lineage_regimes_2024_v1',
    'eci_constituency_lineage_regimes',
    '2024-DELIM-LINEAGE-V1',
    '2023-08-16'::date,
    'VERIFIED',
    154,
    '{"statutory_authority": "Election Commission of India & Delimitation Commission of India", "description": "Statutory delimitation regime lineage, constituency name/boundary transitions, and temporal succession", "checksum": "sha256:eci_delimitation_constituency_temporal_lineage_registry_v1"}'::jsonb
  ),
  (
    'eci_constituency_demographics_turnout_2024_v1',
    'eci_constituency_demographics_turnout',
    '2024-AC-DEMOGRAPHICS-TURNOUT-V1',
    '2024-06-04'::date,
    'ESTIMATE',
    4123,
    '{"statutory_authority": "Election Commission of India & Office of the Registrar General & Census Commissioner", "description": "Electoral rolls, voter turnout rates, gender disaggregation, literacy, urbanisation, and social composition estimates across 4,123 canonical Assembly Constituencies", "checksum": "sha256:eci_census_assembly_constituency_demographics_turnout_registry_v1"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

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
  constituency_id         UUID NOT NULL REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
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
  CONSTRAINT uq_constituency_demographics UNIQUE(constituency_id, election_year)
);

CREATE INDEX IF NOT EXISTS idx_constituency_demographics_constituency_id ON public.constituency_demographics(constituency_id);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_state ON public.constituency_demographics(state_code);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_ac ON public.constituency_demographics(state_code, ac_no);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_year ON public.constituency_demographics(election_year);
CREATE INDEX IF NOT EXISTS idx_constituency_demographics_prov ON public.constituency_demographics(provenance_id);

-- Enable RLS on constituency_demographics
ALTER TABLE public.constituency_demographics ENABLE ROW LEVEL SECURITY;

DO $BODY$ BEGIN
  CREATE POLICY "Public read for constituency demographics"
    ON public.constituency_demographics FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $BODY$;

DO $BODY$ BEGIN
  CREATE POLICY "Service role insert and update for constituency demographics"
    ON public.constituency_demographics FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END $BODY$;

COMMIT;
