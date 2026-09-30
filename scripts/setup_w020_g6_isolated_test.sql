-- ==============================================================================
-- setup_w020_g6_isolated_test.sql
--
-- Milestone: W020 — Delimitation Engine Foundation (Gate W020-G6 Test Harness)
-- Sets up exact prerequisite schema for Migration 055 & W020-G6 data package execution
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── 0. ENUMS FROM MIGRATION 039 ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE source_authority_enum AS ENUM (
    'constitutional',
    'statutory',
    'judicial',
    'official_gazette',
    'administrative',
    'academic',
    'commercial',
    'crowdsourced',
    'internal_curation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'UNVERIFIED',
    'DISPUTED',
    'UNKNOWN',
    'LEGACY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 1. SIMULATE AUTH SCHEMA & ROLES ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT
);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@kshetra.in')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid; $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text; $$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.user_profiles (id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;

-- ─── 2. STATES & CONSTITUENCIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.states (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_seats INT NOT NULL DEFAULT 119,
  ruling_party TEXT,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.states (code, name, total_seats)
VALUES
  ('TS', 'Telangana', 119),
  ('AP', 'Andhra Pradesh', 175)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.constituencies (
  id TEXT PRIMARY KEY,
  ac_no INT NOT NULL,
  name TEXT NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code),
  district TEXT NOT NULL DEFAULT 'Unknown',
  reservation_status TEXT NOT NULL DEFAULT 'GEN' CHECK (reservation_status IN ('GEN', 'SC', 'ST')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.constituencies (id, ac_no, name, state_code)
VALUES
  ('TS-AC-001', 1, 'Sirpur', 'TS'),
  ('TS-AC-065', 65, 'Kodangal', 'TS')
ON CONFLICT (id) DO NOTHING;

-- ─── 3. W012 GOVERNANCE (DATA SOURCES, DATASETS & PROVENANCE) ─────────────────
CREATE TABLE IF NOT EXISTS public.data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  authority_level source_authority_enum NOT NULL DEFAULT 'statutory',
  canonical_url TEXT,
  license TEXT,
  retrieval_method TEXT,
  refresh_frequency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.data_sources (id, name, publisher, authority_level)
VALUES
  ('mha_india', 'Ministry of Home Affairs', 'Government of India', 'statutory'),
  ('eci', 'Election Commission of India', 'ECI', 'statutory')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  source_id TEXT NOT NULL REFERENCES public.data_sources(id),
  license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.datasets (id, name, domain, source_id)
VALUES
  ('eci_delimitation_orders', 'ECI Delimitation Orders', 'geography', 'eci'),
  ('mha_state_reorganisation', 'MHA State Reorganisation Acts', 'geography', 'mha_india'),
  ('panin_delimitation_scenarios', 'PANIN Delimitation Scenarios', 'election_projection', 'mha_india')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES public.datasets(id),
  version_tag TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  storage_path TEXT,
  default_status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  verification_evidence_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.dataset_versions (id, dataset_id, version_tag)
VALUES
  ('eci_ts_ac_2008_v1', 'eci_delimitation_orders', '2008_order'),
  ('mha_ts_2014_v1', 'mha_state_reorganisation', '2014_apra_order'),
  ('scenario_delimitation_draft_prop_1_v1', 'panin_delimitation_scenarios', '2026_scenario_1')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  artifact_name TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  verification_authority TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  source_record_id TEXT,
  parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  transform_version TEXT NOT NULL DEFAULT 'v1.0.0',
  operator TEXT NOT NULL DEFAULT 'system',
  verified_by TEXT,
  verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.provenance_records (id, dataset_version_id, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'eci_ts_ac_2008_v1', 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. DELIMITATION REGIMES & CONSTITUENCY VERSIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.delimitation_regimes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  legal_status VARCHAR(50) NOT NULL CHECK (legal_status IN ('HISTORICAL_LEGAL_REGIME', 'CURRENT_LEGAL_REGIME', 'FUTURE_ANTICIPATED_REGIME', 'SCENARIO_PROPOSED_REGIME')),
  authority VARCHAR(255) NOT NULL,
  legal_basis TEXT NOT NULL,
  notified_at DATE,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  dataset_version_id TEXT REFERENCES public.dataset_versions(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constituency_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id TEXT REFERENCES public.constituencies(id),
  delimitation_regime_id VARCHAR(50) NOT NULL REFERENCES public.delimitation_regimes(id),
  version_code VARCHAR(100),
  canonical_code VARCHAR(50) NOT NULL,
  ac_no INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  valid_from DATE NOT NULL DEFAULT '2008-02-19',
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. LEGACY DELIMITATION PROTOTYPE TABLES (FROM 011_delimitation.sql) ───────
CREATE TABLE IF NOT EXISTS public.delimitation_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code      TEXT NOT NULL REFERENCES public.states(code),
  proposal_number TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'final', 'superseded', 'rejected')),
  commission_id   TEXT,
  current_seats       INT NOT NULL,
  proposed_seats      INT NOT NULL,
  seat_change         INT GENERATED ALWAYS AS (proposed_seats - current_seats) STORED,
  current_sc_seats    INT NOT NULL DEFAULT 0,
  current_st_seats    INT NOT NULL DEFAULT 0,
  proposed_sc_seats   INT NOT NULL DEFAULT 0,
  proposed_st_seats   INT NOT NULL DEFAULT 0,
  gazette_url         TEXT,
  source_url          TEXT,
  published_at        TIMESTAMPTZ,
  objections_deadline TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_proposals_state ON public.delimitation_proposals(state_code);
CREATE INDEX IF NOT EXISTS idx_delim_proposals_status ON public.delimitation_proposals(status);

CREATE TABLE IF NOT EXISTS public.constituency_mapping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES public.delimitation_proposals(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL REFERENCES public.states(code),
  old_ac_no       INT NOT NULL,
  old_name        TEXT NOT NULL,
  new_ac_no       INT NOT NULL,
  new_name        TEXT NOT NULL,
  overlap_percentage    REAL NOT NULL DEFAULT 0 CHECK (overlap_percentage >= 0 AND overlap_percentage <= 100),
  population_transferred BIGINT NOT NULL DEFAULT 0,
  voters_transferred     BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_proposal ON public.constituency_mapping(proposal_id);
CREATE INDEX IF NOT EXISTS idx_mapping_old_ac ON public.constituency_mapping(state_code, old_ac_no);
CREATE INDEX IF NOT EXISTS idx_mapping_new_ac ON public.constituency_mapping(state_code, new_ac_no);

GRANT SELECT ON public.delimitation_proposals, public.constituency_mapping TO anon, authenticated;

ALTER TABLE public.delimitation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read delimitation_proposals" ON public.delimitation_proposals
  FOR SELECT USING (true);

CREATE POLICY "Admin insert delimitation_proposals" ON public.delimitation_proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Public read constituency_mapping" ON public.constituency_mapping
  FOR SELECT USING (true);

CREATE POLICY "Admin insert constituency_mapping" ON public.constituency_mapping
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('admin', 'moderator')
    )
  );
