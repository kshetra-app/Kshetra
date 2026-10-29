-- ==============================================================================
-- Production Prerequisite: Geography, Governance & Versioning Foundation
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- Scope:
--   1. Extensions: uuid-ossp, postgis, btree_gist
--   2. Enums: source_authority_enum, data_status_enum
--   3. Data Governance: data_sources, datasets, dataset_versions, provenance_records,
--      evidence_records, record_provenance_linkages
--   4. Delimitation Regimes: delimitation_regimes table & 2008 regime
--   5. States & State Versions: internal_id, current_version_id, TS-STATE-2014
--   6. Districts & District Versions: districts, district_versions
--   7. Parliamentary Constituencies & Versions: parliamentary_constituencies, versions
--   8. Constituencies & Versions: internal_id, canonical_code, constituency_versions
--   9. RLS & Public Read Policies
-- ==============================================================================

BEGIN;

-- ─── 1. CORE EXTENSIONS ────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 2. ENUM DEFINITIONS ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.source_authority_enum AS ENUM (
    'constitutional',
    'statutory',
    'academic',
    'media_ngo',
    'crowdsourced',
    'synthetic_model'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'ESTIMATE',
    'SCENARIO',
    'INFERRED',
    'UNVERIFIED',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 3. DATA GOVERNANCE FOUNDATION (W012 / MIGRATION 039) ──────────────────────

CREATE TABLE IF NOT EXISTS public.data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  authority_level public.source_authority_enum NOT NULL DEFAULT 'statutory',
  canonical_url TEXT,
  license TEXT,
  retrieval_method TEXT NOT NULL DEFAULT 'manual_ingest',
  refresh_frequency TEXT NOT NULL DEFAULT 'static',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  source_id TEXT REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  license TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES public.datasets(id) ON DELETE RESTRICT,
  version_tag TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  default_status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  record_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dataset_version UNIQUE (dataset_id, version_tag)
);

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  artifact_name TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  verification_authority TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  source_record_id TEXT,
  parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  transform_version TEXT,
  operator TEXT NOT NULL DEFAULT 'system',
  verified_by TEXT,
  verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure public.provenance_records has all columns even if pre-created by 050
ALTER TABLE public.provenance_records
  ADD COLUMN IF NOT EXISTS dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_record_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  ADD COLUMN IF NOT EXISTS transform_version TEXT,
  ADD COLUMN IF NOT EXISTS operator TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.record_provenance_linkages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_table TEXT NOT NULL,
  domain_record_id TEXT NOT NULL,
  provenance_id UUID NOT NULL REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  is_canonical BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_record_provenance UNIQUE (domain_table, domain_record_id, provenance_id)
);

-- ─── 4. SEED CORE DATA SOURCES & DATASETS ─────────────────────────────────────

INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license)
VALUES
  ('eci', 'Election Commission of India', 'Election Commission of India', 'constitutional', 'https://eci.gov.in', 'Government Open Data'),
  ('mha', 'Ministry of Home Affairs', 'Ministry of Home Affairs, Government of India', 'constitutional', 'https://mha.gov.in', 'Government Open Data'),
  ('mopr_lgd', 'Ministry of Panchayati Raj / Local Government Directory', 'Ministry of Panchayati Raj, Government of India', 'statutory', 'https://lgdirectory.gov.in', 'Government Open Data (NDSAP)'),
  ('survey_of_india', 'Survey of India', 'Survey of India / DST', 'statutory', 'https://surveyofindia.gov.in', 'Government Open Data')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url;

INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  ('mha_state_reorganisation', 'MHA State Reorganisation Acts & Orders', 'geography', 'Statutory state reorganisation acts establishing State and UT boundaries and allocations.', 'mha', 'Official Gazette'),
  ('eci_delimitation_order_2008', 'ECI Delimitation of Parliamentary and Assembly Constituencies Order, 2008', 'geography', 'Delimitation Commission order establishing 543 Parliamentary Constituencies and 4,123 Assembly Constituencies across India.', 'eci', 'Official Constitutional Order'),
  ('eci_delimitation_orders', 'ECI Delimitation Commission Orders', 'geography', 'Delimitation Commission orders establishing Assembly and Parliamentary constituencies across constitutional cycles.', 'eci', 'Official Constitutional Order')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description;

-- ─── 5. DELIMITATION REGIMES TABLE (MIGRATION 040 / 041) ──────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_regimes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_status TEXT NOT NULL DEFAULT 'HISTORICAL_REGIME',
  authority TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  notified_at DATE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  dataset_version_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.delimitation_regimes (id, name, legal_status, authority, legal_basis, effective_from, is_active)
VALUES
  ('eci_delimitation_2008', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008', 'CURRENT_LEGAL_REGIME', 'Delimitation Commission of India / ECI', 'Delimitation Act, 2002', '2008-02-19'::date, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_status = EXCLUDED.legal_status,
  is_active = EXCLUDED.is_active;

-- ─── 6. STATES & STATE VERSIONS (MIGRATION 040 / 041) ─────────────────────────

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS lgd_code INTEGER,
  ADD COLUMN IF NOT EXISTS census_code_2011 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT,
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2008-02-19',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_version_id UUID;

UPDATE public.states
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.states
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.states ADD CONSTRAINT uq_states_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.state_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  version_code VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  capital TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(10),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_state_versions_no_overlap EXCLUDE USING gist (
    state_code WITH =,
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[)') WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_state_versions_code ON public.state_versions(state_code);
CREATE INDEX IF NOT EXISTS idx_state_versions_current ON public.state_versions(is_current);

-- Seed Telangana (TS) baseline State and TS-STATE-2014 state version
INSERT INTO public.states (code, name, total_seats, ruling_party, centroid_lat, centroid_lng, valid_from, is_current)
VALUES ('TS', 'Telangana', 119, 'INC', 17.3850, 78.4867, '2014-06-02'::date, true)
ON CONFLICT (code) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  is_current = EXCLUDED.is_current;

INSERT INTO public.state_versions (
  state_code, version_code, name, capital, valid_from, valid_to, is_current
)
VALUES
  ('TS', 'TS-STATE-2014', 'Telangana', 'Hyderabad', '2014-06-02'::date, NULL, true)
ON CONFLICT (version_code) DO UPDATE SET
  is_current = EXCLUDED.is_current;

UPDATE public.states s
SET current_version_id = sv.id
FROM public.state_versions sv
WHERE s.code = sv.state_code AND sv.version_code = 'TS-STATE-2014';

-- ─── 7. DISTRICTS & DISTRICT VERSIONS (MIGRATION 040 / 041) ───────────────────

CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'district',
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER UNIQUE,
  census_code_2011 VARCHAR(20),
  primary_dataset_version_id TEXT,
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_districts_state_name UNIQUE (state_code, name)
);

CREATE TABLE IF NOT EXISTS public.district_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  version_code VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(20),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 8. PARLIAMENTARY CONSTITUENCIES & VERSIONS (MIGRATION 040 / 041) ─────────

CREATE TABLE IF NOT EXISTS public.parliamentary_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'parliamentary_constituency',
  pc_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st', 'GEN', 'SC', 'ST')),
  eci_pc_code VARCHAR(20),
  delimitation_regime_id TEXT REFERENCES public.delimitation_regimes(id),
  valid_from DATE DEFAULT '2008-02-19',
  valid_to DATE,
  is_current BOOLEAN DEFAULT true,
  current_version_id UUID,
  primary_dataset_version_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pc_state_number UNIQUE (state_code, pc_number)
);

CREATE TABLE IF NOT EXISTS public.parliamentary_constituency_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pc_id UUID NOT NULL REFERENCES public.parliamentary_constituencies(id) ON DELETE RESTRICT,
  delimitation_regime_id TEXT REFERENCES public.delimitation_regimes(id),
  version_code VARCHAR(50) UNIQUE NOT NULL,
  pc_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general',
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pc_versions_code UNIQUE (version_code),
  CONSTRAINT uq_pc_versions_no_overlap EXCLUDE USING gist (
    pc_id WITH =,
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[)') WITH &&
  )
);

-- ─── 9. CONSTITUENCIES & CONSTITUENCY VERSIONS (MIGRATION 040 / 041) ──────────

ALTER TABLE public.constituencies
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS canonical_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) DEFAULT 'assembly_constituency',
  ADD COLUMN IF NOT EXISTS eci_ac_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parliamentary_constituency_id UUID REFERENCES public.parliamentary_constituencies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS name_te TEXT,
  ADD COLUMN IF NOT EXISTS delimitation_regime_id TEXT REFERENCES public.delimitation_regimes(id),
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2008-02-19',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_version_id UUID,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT;

UPDATE public.constituencies
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.constituencies
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.constituencies ADD CONSTRAINT uq_constituencies_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.constituency_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  delimitation_regime_id TEXT REFERENCES public.delimitation_regimes(id),
  version_code VARCHAR(50) UNIQUE NOT NULL,
  canonical_code VARCHAR(50),
  ac_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general',
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_constituency_versions_code UNIQUE (version_code),
  CONSTRAINT uq_constituency_versions_no_overlap EXCLUDE USING gist (
    constituency_internal_id WITH =,
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[)') WITH &&
  )
);

CREATE TABLE IF NOT EXISTS public.constituency_district_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geography_entity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  source_internal_id UUID NOT NULL,
  target_internal_id UUID NOT NULL,
  transition_type TEXT NOT NULL CHECK (transition_type IN ('split', 'merger', 'rename', 'boundary_revision', 'successor')),
  effective_date DATE NOT NULL,
  statutory_order_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 10. ROW LEVEL SECURITY & PUBLIC READ POLICIES ─────────────────────────────

ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliamentary_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliamentary_constituency_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_provenance_linkages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read states" ON public.states FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read state_versions" ON public.state_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read parliamentary_constituencies" ON public.parliamentary_constituencies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read parliamentary_constituency_versions" ON public.parliamentary_constituency_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read constituencies" ON public.constituencies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read constituency_versions" ON public.constituency_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read delimitation_regimes" ON public.delimitation_regimes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read datasets" ON public.datasets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read dataset_versions" ON public.dataset_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read provenance_records" ON public.provenance_records FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read evidence_records" ON public.evidence_records FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read record_provenance_linkages" ON public.record_provenance_linkages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

COMMIT;
