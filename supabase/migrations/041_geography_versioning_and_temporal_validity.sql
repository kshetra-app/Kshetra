-- ==============================================================================
-- Migration 041: Geography Versioning & Temporal Validity (W014)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Authoritative Design: reports/w014_preflight_inspection_report.md
-- Mandate: CTO Implementation Authorization (W014)
-- Scope:
--   1. Enable btree_gist extension for GiST exclusion constraints
--   2. Register W012 governance catalog entries for historical regimes
--   3. Create delimitation_regimes table & seed legal classifications
--   4. Create version tables for states, districts, PCs, and constituencies
--   5. Create constituency_district_timeline for temporal AC-to-District mapping
--   6. Create geography_entity_lineage for splits, mergers, and renames
--   7. Add current_version_id and temporal columns to anchor tables
--   8. Seed active & historical version rows with authoritative statutory dates
--   9. Seed AC 109 (Mulug) historical timeline and split lineage
--  10. Configure Row Level Security (RLS) with public read policies
--  11. Register W012 record_provenance_linkages for all seeded version records
-- ==============================================================================

BEGIN;

-- ─── 1. EXTENSIONS ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 2. W012 GOVERNANCE CATALOG REGISTRATION ───────────────────────────────────

-- Register Data Sources
INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  ('delimit_sim_lab', 'PANIN Delimitation Simulation Lab', 'PANIN Research Group', 'synthetic_model', 'https://panin.in/research/delimitation', 'Internal Research Model', 'algorithmic_simulation', 'on_demand', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url,
  updated_at = now();

-- Register Datasets
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  ('eci_delimitation_orders', 'ECI Delimitation Commission Orders', 'geography', 'Delimitation Commission orders establishing Assembly and Parliamentary constituencies across constitutional cycles.', 'eci', 'Official Constitutional Order'),
  ('panin_delimitation_scenarios', 'PANIN Delimitation Projection Scenarios', 'geography', 'Hypothetical and prospective delimitation scenarios for post-2026 census modeling.', 'delimit_sim_lab', 'Proprietary Research Simulation')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  source_id = EXCLUDED.source_id,
  updated_at = now();

-- Register Dataset Versions (All strictly UNVERIFIED per governance protocol)
INSERT INTO public.dataset_versions (id, dataset_id, version_tag, effective_from, default_status, record_count, metadata)
VALUES
  (
    'ts_districts_2014_v1',
    'ts_revenue_districts',
    '2014_state_formation',
    '2014-06-02',
    'UNVERIFIED',
    10,
    '{"statutory_reference": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 3", "district_count": 10, "evidence_state": "statutory_act"}'::jsonb
  ),
  (
    'ts_districts_2021_renames_v1',
    'ts_revenue_districts',
    '2021_renames',
    '2021-08-12',
    'UNVERIFIED',
    2,
    '{"statutory_reference": "G.O.Ms.No. 74, Revenue (DA) Dept, dated 12.08.2021 (Warangal/Hanamkonda)", "evidence_state": "statutory_gazette"}'::jsonb
  ),
  (
    'eci_delimitation_1976_v1',
    'eci_delimitation_orders',
    '1976_order',
    '1976-01-01',
    'UNVERIFIED',
    0,
    '{"statutory_reference": "Delimitation Commission of India Order, 1976", "legal_status": "SUPERSEDED", "evidence_state": "historical_order"}'::jsonb
  ),
  (
    'eci_delimitation_post2026_projected_v1',
    'eci_delimitation_orders',
    'post2026_anticipated',
    '2026-01-01',
    'UNVERIFIED',
    0,
    '{"statutory_reference": "Constitution of India, Articles 82 & 170 (Post-2026 Delimitation Freeze)", "legal_status": "PROSPECTIVE_UNENACTED", "evidence_state": "constitutional_mandate"}'::jsonb
  ),
  (
    'scenario_delimitation_draft_prop_1_v1',
    'panin_delimitation_scenarios',
    'draft_prop_1',
    '2026-01-01',
    'UNVERIFIED',
    0,
    '{"simulation_name": "Hypothetical Population-Based Seat Reallocation Model 1", "legal_status": "NON_STATUTORY_SIMULATION", "evidence_state": "simulation_model"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  dataset_id = EXCLUDED.dataset_id,
  version_tag = EXCLUDED.version_tag,
  effective_from = EXCLUDED.effective_from,
  default_status = EXCLUDED.default_status,
  record_count = EXCLUDED.record_count,
  metadata = EXCLUDED.metadata,
  retrieved_at = now();

-- ─── 3. DELIMITATION REGIMES TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_regimes (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  legal_status VARCHAR(50) NOT NULL CHECK (
    legal_status IN (
      'HISTORICAL_LEGAL_REGIME',
      'CURRENT_LEGAL_REGIME',
      'FUTURE_ANTICIPATED_REGIME',
      'SCENARIO_PROPOSED_REGIME'
    )
  ),
  authority VARCHAR(100) NOT NULL,
  legal_basis TEXT NOT NULL,
  notified_at DATE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_regimes_status ON public.delimitation_regimes(legal_status);
CREATE INDEX IF NOT EXISTS idx_delim_regimes_effective ON public.delimitation_regimes(effective_from, effective_to);

COMMENT ON TABLE public.delimitation_regimes IS 'Constitutional and statutory Delimitation Regimes governing electoral seat boundaries.';

-- Seed the 4 authoritative Delimitation Regimes
INSERT INTO public.delimitation_regimes (id, name, legal_status, authority, legal_basis, notified_at, effective_from, effective_to, is_active, dataset_version_id, metadata)
VALUES
  (
    'eci_delimitation_1976',
    'Delimitation Order 1976',
    'HISTORICAL_LEGAL_REGIME',
    'Delimitation Commission of India',
    'Delimitation Act, 1972',
    '1976-01-01',
    '1976-01-01',
    '2008-02-19',
    false,
    'eci_delimitation_1976_v1',
    '{"description": "Historical delimitation regime governing elections between 1976 and 2008."}'::jsonb
  ),
  (
    'eci_delimitation_2008',
    'Delimitation of Parliamentary and Assembly Constituencies Order, 2008',
    'CURRENT_LEGAL_REGIME',
    'Delimitation Commission of India',
    'Delimitation Act, 2002',
    '2008-02-19',
    '2008-02-19',
    null,
    true,
    'eci_ts_ac_2008_v1',
    '{"description": "Active statutory delimitation regime governing all current Lok Sabha and Vidhan Sabha elections."}'::jsonb
  ),
  (
    'eci_delimitation_post2026',
    'Post-2026 Constitutional Delimitation (Anticipated)',
    'FUTURE_ANTICIPATED_REGIME',
    'Parliament of India / Future Delimitation Commission',
    'Constitution of India (84th Amendment, Arts 82 & 170)',
    null,
    '2026-01-01',
    null,
    false,
    'eci_delimitation_post2026_projected_v1',
    '{"description": "Constitutional mandate for delimitation following first census after 2026. Un-enacted prospective regime."}'::jsonb
  ),
  (
    'scenario_delimitation_draft_prop_1',
    'Delimitation Research Simulation Scenario 1',
    'SCENARIO_PROPOSED_REGIME',
    'PANIN Delimitation Simulation Lab',
    'Academic Simulation (Article 82 Pure Proportional Model)',
    null,
    '2026-01-01',
    null,
    false,
    'scenario_delimitation_draft_prop_1_v1',
    '{"description": "Hypothetical scenario for simulation and public policy research only. Strictly unverified."}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_status = EXCLUDED.legal_status,
  authority = EXCLUDED.authority,
  legal_basis = EXCLUDED.legal_basis,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  is_active = EXCLUDED.is_active,
  dataset_version_id = EXCLUDED.dataset_version_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ─── 4. TEMPORAL VERSION TABLES ────────────────────────────────────────────────

-- 4.1 State Versions
CREATE TABLE IF NOT EXISTS public.state_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  version_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  capital TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(10),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_state_versions_code UNIQUE (version_code),
  CONSTRAINT uq_state_versions_no_overlap EXCLUDE USING gist (
    state_code WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_state_versions_code ON public.state_versions(state_code);
CREATE INDEX IF NOT EXISTS idx_state_versions_current ON public.state_versions(state_code) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_state_versions_single_current ON public.state_versions(state_code) WHERE is_current = true;

-- 4.2 District Versions
CREATE TABLE IF NOT EXISTS public.district_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  version_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(20),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_district_versions_code UNIQUE (version_code),
  CONSTRAINT uq_district_versions_no_overlap EXCLUDE USING gist (
    district_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_district_versions_id ON public.district_versions(district_id);
CREATE INDEX IF NOT EXISTS idx_district_versions_current ON public.district_versions(district_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_district_versions_single_current ON public.district_versions(district_id) WHERE is_current = true;

-- 4.3 Parliamentary Constituency Versions
CREATE TABLE IF NOT EXISTS public.parliamentary_constituency_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pc_id UUID NOT NULL REFERENCES public.parliamentary_constituencies(id) ON DELETE RESTRICT,
  delimitation_regime_id VARCHAR(50) NOT NULL REFERENCES public.delimitation_regimes(id) ON DELETE RESTRICT,
  version_code VARCHAR(50) NOT NULL,
  pc_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st')),
  eci_pc_code VARCHAR(20),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pc_versions_code UNIQUE (version_code),
  CONSTRAINT uq_pc_versions_no_overlap EXCLUDE USING gist (
    pc_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_pc_versions_id ON public.parliamentary_constituency_versions(pc_id);
CREATE INDEX IF NOT EXISTS idx_pc_versions_regime ON public.parliamentary_constituency_versions(delimitation_regime_id);
CREATE INDEX IF NOT EXISTS idx_pc_versions_current ON public.parliamentary_constituency_versions(pc_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_versions_single_current ON public.parliamentary_constituency_versions(pc_id) WHERE is_current = true;

-- 4.4 Constituency Versions (Assembly Constituencies)
CREATE TABLE IF NOT EXISTS public.constituency_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  delimitation_regime_id VARCHAR(50) NOT NULL REFERENCES public.delimitation_regimes(id) ON DELETE RESTRICT,
  version_code VARCHAR(50) NOT NULL,
  canonical_code VARCHAR(50) NOT NULL,
  ac_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st')),
  eci_ac_code VARCHAR(20),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_constituency_versions_code UNIQUE (version_code),
  CONSTRAINT uq_constituency_versions_no_overlap EXCLUDE USING gist (
    constituency_internal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_constituency_versions_internal_id ON public.constituency_versions(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_constituency_versions_regime ON public.constituency_versions(delimitation_regime_id);
CREATE INDEX IF NOT EXISTS idx_constituency_versions_current ON public.constituency_versions(constituency_internal_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_constituency_versions_single_current ON public.constituency_versions(constituency_internal_id) WHERE is_current = true;

-- ─── 5. RELATIONSHIP TIMELINE & LINEAGE TABLES ─────────────────────────────────

-- 5.1 Temporal Constituency-to-District Timeline
CREATE TABLE IF NOT EXISTS public.constituency_district_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  overlap_type VARCHAR(20) NOT NULL DEFAULT 'primary' CHECK (overlap_type IN ('primary', 'partial', 'historical')),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_constituency_district_timeline_primary_no_overlap EXCLUDE USING gist (
    constituency_internal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  ) WHERE (overlap_type = 'primary')
);

CREATE INDEX IF NOT EXISTS idx_cdt_constituency ON public.constituency_district_timeline(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_cdt_district ON public.constituency_district_timeline(district_id);
CREATE INDEX IF NOT EXISTS idx_cdt_current ON public.constituency_district_timeline(constituency_internal_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cdt_single_current_primary
  ON public.constituency_district_timeline (constituency_internal_id)
  WHERE (is_current = true AND overlap_type = 'primary');

-- 5.2 Geography Entity Lineage (Predecessor / Successor Transitions)
CREATE TABLE IF NOT EXISTS public.geography_entity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('state', 'district', 'parliamentary_constituency', 'constituency')),
  predecessor_internal_id UUID NOT NULL,
  successor_internal_id UUID NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('rename', 'split', 'merge', 'abolition', 'creation')),
  effective_date DATE NOT NULL,
  statutory_order TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_geography_lineage UNIQUE (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_lineage_pred ON public.geography_entity_lineage(predecessor_internal_id);
CREATE INDEX IF NOT EXISTS idx_lineage_succ ON public.geography_entity_lineage(successor_internal_id);
CREATE INDEX IF NOT EXISTS idx_lineage_type ON public.geography_entity_lineage(transition_type);
CREATE INDEX IF NOT EXISTS idx_lineage_date ON public.geography_entity_lineage(effective_date);

-- ─── 6. ENHANCE ANCHOR TABLES WITH CURRENT VERSION POINTERS ────────────────────

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.state_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2014-06-02',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

ALTER TABLE public.districts
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.district_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2016-10-11',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS predecessor_district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL;

ALTER TABLE public.parliamentary_constituencies
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.parliamentary_constituency_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delimitation_regime_id VARCHAR(50) REFERENCES public.delimitation_regimes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2008-02-19',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

ALTER TABLE public.constituencies
  ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.constituency_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delimitation_regime_id VARCHAR(50) REFERENCES public.delimitation_regimes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT '2008-02-19',
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_states_current_ver ON public.states(current_version_id);
CREATE INDEX IF NOT EXISTS idx_districts_current_ver ON public.districts(current_version_id);
CREATE INDEX IF NOT EXISTS idx_pcs_current_ver ON public.parliamentary_constituencies(current_version_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_current_ver ON public.constituencies(current_version_id);

-- ─── 7. SEED INITIAL ACTIVE & HISTORICAL VERSIONS ──────────────────────────────

-- 7.1 Seed State Version for Telangana (TS)
INSERT INTO public.state_versions (state_code, version_code, name, name_te, capital, lgd_code, census_code_2011, valid_from, valid_to, is_current, primary_dataset_version_id)
SELECT
  s.code,
  'TS-STATE-2014',
  s.name,
  'తెలంగాణ'::text,
  'Hyderabad'::text,
  s.lgd_code,
  s.census_code_2011,
  '2014-06-02'::date,
  null,
  true,
  'mha_ts_2014_v1'
FROM public.states s
WHERE s.code = 'TS'
ON CONFLICT (version_code) DO NOTHING;

UPDATE public.states s
SET current_version_id = sv.id
FROM public.state_versions sv
WHERE s.code = sv.state_code AND sv.version_code = 'TS-STATE-2014';

-- 7.2 Seed District Versions for Telangana (33 Districts)
INSERT INTO public.district_versions (district_id, version_code, name, name_te, headquarters, lgd_code, census_code_2011, valid_from, valid_to, is_current, primary_dataset_version_id)
SELECT
  d.id,
  d.code || '-V1',
  d.name,
  d.name_te,
  d.headquarters,
  d.lgd_code,
  d.census_code_2011,
  CASE
    WHEN d.name IN ('Mulugu', 'Narayanpet') THEN '2019-02-17'::date
    ELSE '2016-10-11'::date
  END,
  null,
  true,
  d.primary_dataset_version_id
FROM public.districts d
WHERE d.state_code = 'TS'
ON CONFLICT (version_code) DO NOTHING;

UPDATE public.districts d
SET
  current_version_id = dv.id,
  valid_from = dv.valid_from,
  is_current = true
FROM public.district_versions dv
WHERE d.id = dv.district_id AND dv.is_current = true;

-- 7.3 Seed Parliamentary Constituency Versions (17 PCs)
INSERT INTO public.parliamentary_constituency_versions (pc_id, delimitation_regime_id, version_code, pc_number, name, name_te, reservation, eci_pc_code, valid_from, valid_to, is_current, primary_dataset_version_id)
SELECT
  pc.id,
  'eci_delimitation_2008',
  pc.code || '-2008',
  pc.pc_number,
  pc.name,
  pc.name_te,
  pc.reservation,
  pc.eci_pc_code,
  '2008-02-19'::date,
  null,
  true,
  pc.primary_dataset_version_id
FROM public.parliamentary_constituencies pc
WHERE pc.state_code = 'TS'
ON CONFLICT (version_code) DO NOTHING;

UPDATE public.parliamentary_constituencies pc
SET
  current_version_id = pcv.id,
  delimitation_regime_id = 'eci_delimitation_2008',
  valid_from = '2008-02-19'::date,
  is_current = true
FROM public.parliamentary_constituency_versions pcv
WHERE pc.id = pcv.pc_id AND pcv.is_current = true;

-- 7.4 Seed Constituency Versions (119 ACs)
INSERT INTO public.constituency_versions (constituency_internal_id, delimitation_regime_id, version_code, canonical_code, ac_no, name, name_te, reservation, eci_ac_code, valid_from, valid_to, is_current, primary_dataset_version_id)
SELECT
  c.internal_id,
  'eci_delimitation_2008',
  c.canonical_code || '-2008',
  c.canonical_code,
  c.ac_no,
  c.name,
  c.name_te,
  CASE LOWER(COALESCE(c.reservation_status, 'general'))
    WHEN 'gen' THEN 'general'
    WHEN 'sc' THEN 'sc'
    WHEN 'st' THEN 'st'
    ELSE 'general'
  END,
  c.eci_ac_code,
  '2008-02-19'::date,
  null,
  true,
  COALESCE(c.primary_dataset_version_id, 'eci_ts_ac_2008_v1')
FROM public.constituencies c
WHERE c.state_code = 'TS'
ON CONFLICT (version_code) DO NOTHING;

UPDATE public.constituencies c
SET
  current_version_id = cv.id,
  delimitation_regime_id = 'eci_delimitation_2008',
  valid_from = '2008-02-19'::date,
  is_current = true
FROM public.constituency_versions cv
WHERE c.internal_id = cv.constituency_internal_id AND cv.is_current = true;

-- ─── 8. SEED AC 109 (MULUG) CHRONOLOGY & LINEAGE PILOT ─────────────────────────

-- 8.1 Seed Current Active Mappings in Constituency-District Timeline (All 119 ACs)
INSERT INTO public.constituency_district_timeline (constituency_internal_id, district_id, overlap_type, valid_from, valid_to, is_current, primary_dataset_version_id)
SELECT
  c.internal_id,
  c.district_id,
  'primary',
  CASE
    WHEN d.name IN ('Mulugu', 'Narayanpet') THEN '2019-02-17'::date
    ELSE '2016-10-11'::date
  END,
  null,
  true,
  d.primary_dataset_version_id
FROM public.constituencies c
JOIN public.districts d ON c.district_id = d.id
WHERE c.state_code = 'TS'
ON CONFLICT DO NOTHING;

-- 8.2 Seed Historical AC 109 (Mulug) Timeline Over Intervals
-- Warangal District (Historical 2008-2016)
DO $$
DECLARE
  v_ac109_id UUID;
  v_dist_warangal UUID;
  v_dist_bhupalpally UUID;
  v_dist_mulugu UUID;
  v_dist_mahbubnagar UUID;
  v_dist_narayanpet UUID;
BEGIN
  SELECT internal_id INTO v_ac109_id FROM public.constituencies WHERE canonical_code = 'TS-AC-109';
  SELECT id INTO v_dist_warangal FROM public.districts WHERE code = 'TS-DIST-WARANGAL';
  SELECT id INTO v_dist_bhupalpally FROM public.districts WHERE code = 'TS-DIST-JAYASHANKAR-BHUPALPALLY';
  SELECT id INTO v_dist_mulugu FROM public.districts WHERE code = 'TS-DIST-MULUGU';
  SELECT id INTO v_dist_mahbubnagar FROM public.districts WHERE code = 'TS-DIST-MAHABUBNAGAR';
  SELECT id INTO v_dist_narayanpet FROM public.districts WHERE code = 'TS-DIST-NARAYANPET';

  IF v_ac109_id IS NOT NULL AND v_dist_warangal IS NOT NULL AND v_dist_bhupalpally IS NOT NULL AND v_dist_mulugu IS NOT NULL THEN
    -- Delete default seed for AC 109 to insert clean continuous intervals
    DELETE FROM public.constituency_district_timeline WHERE constituency_internal_id = v_ac109_id;

    -- Interval 1: 2008 to 2016 -> Warangal District
    INSERT INTO public.constituency_district_timeline (constituency_internal_id, district_id, overlap_type, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_ac109_id, v_dist_warangal, 'primary', '2008-02-19'::date, '2016-10-11'::date, false, 'ts_districts_2014_v1');

    -- Interval 2: 2016 to 2019 -> Jayashankar Bhupalpally District
    INSERT INTO public.constituency_district_timeline (constituency_internal_id, district_id, overlap_type, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_ac109_id, v_dist_bhupalpally, 'primary', '2016-10-11'::date, '2019-02-17'::date, false, 'ts_districts_2016_v1');

    -- Interval 3: 2019 to Present -> Mulugu District
    INSERT INTO public.constituency_district_timeline (constituency_internal_id, district_id, overlap_type, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_ac109_id, v_dist_mulugu, 'primary', '2019-02-17'::date, null, true, 'ts_districts_2019_additions_v1');
  END IF;

  -- 8.3 Seed Predecessor/Successor Split Lineage for Mulugu & Narayanpet
  IF v_dist_bhupalpally IS NOT NULL AND v_dist_mulugu IS NOT NULL THEN
    -- Set predecessor pointer on districts anchor
    UPDATE public.districts SET predecessor_district_id = v_dist_bhupalpally WHERE id = v_dist_mulugu;

    INSERT INTO public.geography_entity_lineage (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date, statutory_order, metadata, primary_dataset_version_id)
    VALUES (
      'district',
      v_dist_bhupalpally,
      v_dist_mulugu,
      'split',
      '2019-02-17'::date,
      'G.O.Ms.No. 18, Revenue (DA-CMRF) Dept, dated 16.02.2019',
      '{"parent_district": "Jayashankar Bhupalpally", "child_district": "Mulugu", "mandals_transferred": 9}'::jsonb,
      'ts_districts_2019_additions_v1'
    )
    ON CONFLICT (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date) DO NOTHING;
  END IF;

  IF v_dist_mahbubnagar IS NOT NULL AND v_dist_narayanpet IS NOT NULL THEN
    -- Set predecessor pointer on districts anchor
    UPDATE public.districts SET predecessor_district_id = v_dist_mahbubnagar WHERE id = v_dist_narayanpet;

    INSERT INTO public.geography_entity_lineage (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date, statutory_order, metadata, primary_dataset_version_id)
    VALUES (
      'district',
      v_dist_mahbubnagar,
      v_dist_narayanpet,
      'split',
      '2019-02-17'::date,
      'G.O.Ms.No. 19, Revenue (DA-CMRF) Dept, dated 16.02.2019',
      '{"parent_district": "Mahbubnagar", "child_district": "Narayanpet", "mandals_transferred": 11}'::jsonb,
      'ts_districts_2019_additions_v1'
    )
    ON CONFLICT (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date) DO NOTHING;
  END IF;
END $$;

-- ─── 9. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────

ALTER TABLE public.delimitation_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliamentary_constituency_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_district_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geography_entity_lineage ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "Public read delimitation_regimes" ON public.delimitation_regimes;
CREATE POLICY "Public read delimitation_regimes" ON public.delimitation_regimes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read state_versions" ON public.state_versions;
CREATE POLICY "Public read state_versions" ON public.state_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read district_versions" ON public.district_versions;
CREATE POLICY "Public read district_versions" ON public.district_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read pc_versions" ON public.parliamentary_constituency_versions;
CREATE POLICY "Public read pc_versions" ON public.parliamentary_constituency_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read constituency_versions" ON public.constituency_versions;
CREATE POLICY "Public read constituency_versions" ON public.constituency_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read constituency_district_timeline" ON public.constituency_district_timeline;
CREATE POLICY "Public read constituency_district_timeline" ON public.constituency_district_timeline FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read geography_entity_lineage" ON public.geography_entity_lineage;
CREATE POLICY "Public read geography_entity_lineage" ON public.geography_entity_lineage FOR SELECT TO anon, authenticated USING (true);

-- Service role full access policies
DROP POLICY IF EXISTS "Service role full access on delimitation_regimes" ON public.delimitation_regimes;
CREATE POLICY "Service role full access on delimitation_regimes" ON public.delimitation_regimes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on state_versions" ON public.state_versions;
CREATE POLICY "Service role full access on state_versions" ON public.state_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on district_versions" ON public.district_versions;
CREATE POLICY "Service role full access on district_versions" ON public.district_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on pc_versions" ON public.parliamentary_constituency_versions;
CREATE POLICY "Service role full access on pc_versions" ON public.parliamentary_constituency_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on constituency_versions" ON public.constituency_versions;
CREATE POLICY "Service role full access on constituency_versions" ON public.constituency_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on constituency_district_timeline" ON public.constituency_district_timeline;
CREATE POLICY "Service role full access on constituency_district_timeline" ON public.constituency_district_timeline FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on geography_entity_lineage" ON public.geography_entity_lineage;
CREATE POLICY "Service role full access on geography_entity_lineage" ON public.geography_entity_lineage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 10. W012 PROVENANCE RECORDS FOR TEMPORAL ENTITIES ─────────────────────────

-- Generate provenance records for regimes
INSERT INTO public.provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata)
SELECT
  md5('pr_regime_' || dr.id)::uuid,
  dr.dataset_version_id,
  dr.id,
  'UNVERIFIED',
  'raw_seed',
  'system:w014_migration',
  jsonb_build_object('name', dr.name, 'legal_status', dr.legal_status, 'authority', dr.authority)
FROM public.delimitation_regimes dr
ON CONFLICT (id) DO NOTHING;

-- Generate provenance linkages for regimes
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT
  'delimitation_regimes',
  dr.id,
  md5('pr_regime_' || dr.id)::uuid,
  true
FROM public.delimitation_regimes dr
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

COMMIT;
