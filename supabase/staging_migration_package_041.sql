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
ON CONFLICT (id) DO NOTHING;

-- Deterministic Post-Registration Reconciliation Assertion for W014 Dataset Versions
-- Authoritative W012 Immutable Fields Reconciled:
--   1. dataset_id (TEXT NOT NULL)
--   2. version_tag (TEXT NOT NULL)
--   3. effective_from (DATE NULLABLE)
--   4. effective_to (DATE NULLABLE)
--   5. record_count (INTEGER NOT NULL)
--   6. checksum_sha256 (TEXT NULLABLE)
--   7. storage_path (TEXT NULLABLE)
--   8. default_status (data_status_enum NOT NULL)
--   9. verification_evidence_id (UUID NULLABLE)
--  10. metadata (JSONB NOT NULL)
-- Classification of retrieved_at: W012 acquisition timestamp; immutable on existing snapshots, never compared to NOW().
-- Failure behavior: FAIL CLOSED if any field differs; NEVER mutate existing snapshots.
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- =========================================================================
  -- 1. ts_districts_2014_v1
  -- =========================================================================
  SELECT * INTO v_rec FROM public.dataset_versions WHERE id = 'ts_districts_2014_v1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % not found', 'ts_districts_2014_v1';
  END IF;

  IF v_rec.dataset_id IS DISTINCT FROM 'ts_revenue_districts' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "dataset_id" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.dataset_id, 'ts_revenue_districts';
  END IF;
  IF v_rec.version_tag IS DISTINCT FROM '2014_state_formation' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "version_tag" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.version_tag, '2014_state_formation';
  END IF;
  IF v_rec.effective_from IS DISTINCT FROM '2014-06-02'::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_from" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.effective_from, '2014-06-02';
  END IF;
  IF v_rec.effective_to IS DISTINCT FROM NULL::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_to" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.effective_to, 'NULL';
  END IF;
  IF v_rec.record_count IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "record_count" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.record_count, '10';
  END IF;
  IF v_rec.checksum_sha256 IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "checksum_sha256" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.checksum_sha256, 'NULL';
  END IF;
  IF v_rec.storage_path IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "storage_path" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.storage_path, 'NULL';
  END IF;
  IF v_rec.default_status IS DISTINCT FROM 'UNVERIFIED'::data_status_enum THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "default_status" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.default_status, 'UNVERIFIED';
  END IF;
  IF v_rec.verification_evidence_id IS DISTINCT FROM NULL::uuid THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "verification_evidence_id" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.verification_evidence_id, 'NULL';
  END IF;
  IF v_rec.metadata IS DISTINCT FROM '{"statutory_reference": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 3", "district_count": 10, "evidence_state": "statutory_act"}'::jsonb THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "metadata" mismatch: existing="%", expected="%"',
      'ts_districts_2014_v1', v_rec.metadata, '{"statutory_reference": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 3", "district_count": 10, "evidence_state": "statutory_act"}';
  END IF;

  -- =========================================================================
  -- 2. ts_districts_2021_renames_v1
  -- =========================================================================
  SELECT * INTO v_rec FROM public.dataset_versions WHERE id = 'ts_districts_2021_renames_v1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % not found', 'ts_districts_2021_renames_v1';
  END IF;

  IF v_rec.dataset_id IS DISTINCT FROM 'ts_revenue_districts' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "dataset_id" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.dataset_id, 'ts_revenue_districts';
  END IF;
  IF v_rec.version_tag IS DISTINCT FROM '2021_renames' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "version_tag" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.version_tag, '2021_renames';
  END IF;
  IF v_rec.effective_from IS DISTINCT FROM '2021-08-12'::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_from" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.effective_from, '2021-08-12';
  END IF;
  IF v_rec.effective_to IS DISTINCT FROM NULL::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_to" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.effective_to, 'NULL';
  END IF;
  IF v_rec.record_count IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "record_count" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.record_count, '2';
  END IF;
  IF v_rec.checksum_sha256 IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "checksum_sha256" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.checksum_sha256, 'NULL';
  END IF;
  IF v_rec.storage_path IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "storage_path" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.storage_path, 'NULL';
  END IF;
  IF v_rec.default_status IS DISTINCT FROM 'UNVERIFIED'::data_status_enum THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "default_status" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.default_status, 'UNVERIFIED';
  END IF;
  IF v_rec.verification_evidence_id IS DISTINCT FROM NULL::uuid THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "verification_evidence_id" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.verification_evidence_id, 'NULL';
  END IF;
  IF v_rec.metadata IS DISTINCT FROM '{"statutory_reference": "G.O.Ms.No. 74, Revenue (DA) Dept, dated 12.08.2021 (Warangal/Hanamkonda)", "evidence_state": "statutory_gazette"}'::jsonb THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "metadata" mismatch: existing="%", expected="%"',
      'ts_districts_2021_renames_v1', v_rec.metadata, '{"statutory_reference": "G.O.Ms.No. 74, Revenue (DA) Dept, dated 12.08.2021 (Warangal/Hanamkonda)", "evidence_state": "statutory_gazette"}';
  END IF;

  -- =========================================================================
  -- 3. eci_delimitation_1976_v1
  -- =========================================================================
  SELECT * INTO v_rec FROM public.dataset_versions WHERE id = 'eci_delimitation_1976_v1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % not found', 'eci_delimitation_1976_v1';
  END IF;

  IF v_rec.dataset_id IS DISTINCT FROM 'eci_delimitation_orders' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "dataset_id" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.dataset_id, 'eci_delimitation_orders';
  END IF;
  IF v_rec.version_tag IS DISTINCT FROM '1976_order' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "version_tag" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.version_tag, '1976_order';
  END IF;
  IF v_rec.effective_from IS DISTINCT FROM '1976-01-01'::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_from" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.effective_from, '1976-01-01';
  END IF;
  IF v_rec.effective_to IS DISTINCT FROM NULL::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_to" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.effective_to, 'NULL';
  END IF;
  IF v_rec.record_count IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "record_count" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.record_count, '0';
  END IF;
  IF v_rec.checksum_sha256 IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "checksum_sha256" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.checksum_sha256, 'NULL';
  END IF;
  IF v_rec.storage_path IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "storage_path" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.storage_path, 'NULL';
  END IF;
  IF v_rec.default_status IS DISTINCT FROM 'UNVERIFIED'::data_status_enum THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "default_status" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.default_status, 'UNVERIFIED';
  END IF;
  IF v_rec.verification_evidence_id IS DISTINCT FROM NULL::uuid THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "verification_evidence_id" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.verification_evidence_id, 'NULL';
  END IF;
  IF v_rec.metadata IS DISTINCT FROM '{"statutory_reference": "Delimitation Commission of India Order, 1976", "legal_status": "SUPERSEDED", "evidence_state": "historical_order"}'::jsonb THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "metadata" mismatch: existing="%", expected="%"',
      'eci_delimitation_1976_v1', v_rec.metadata, '{"statutory_reference": "Delimitation Commission of India Order, 1976", "legal_status": "SUPERSEDED", "evidence_state": "historical_order"}';
  END IF;

  -- =========================================================================
  -- 4. eci_delimitation_post2026_projected_v1
  -- =========================================================================
  SELECT * INTO v_rec FROM public.dataset_versions WHERE id = 'eci_delimitation_post2026_projected_v1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % not found', 'eci_delimitation_post2026_projected_v1';
  END IF;

  IF v_rec.dataset_id IS DISTINCT FROM 'eci_delimitation_orders' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "dataset_id" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.dataset_id, 'eci_delimitation_orders';
  END IF;
  IF v_rec.version_tag IS DISTINCT FROM 'post2026_anticipated' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "version_tag" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.version_tag, 'post2026_anticipated';
  END IF;
  IF v_rec.effective_from IS DISTINCT FROM '2026-01-01'::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_from" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.effective_from, '2026-01-01';
  END IF;
  IF v_rec.effective_to IS DISTINCT FROM NULL::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_to" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.effective_to, 'NULL';
  END IF;
  IF v_rec.record_count IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "record_count" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.record_count, '0';
  END IF;
  IF v_rec.checksum_sha256 IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "checksum_sha256" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.checksum_sha256, 'NULL';
  END IF;
  IF v_rec.storage_path IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "storage_path" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.storage_path, 'NULL';
  END IF;
  IF v_rec.default_status IS DISTINCT FROM 'UNVERIFIED'::data_status_enum THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "default_status" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.default_status, 'UNVERIFIED';
  END IF;
  IF v_rec.verification_evidence_id IS DISTINCT FROM NULL::uuid THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "verification_evidence_id" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.verification_evidence_id, 'NULL';
  END IF;
  IF v_rec.metadata IS DISTINCT FROM '{"statutory_reference": "Constitution of India, Articles 82 & 170 (Post-2026 Delimitation Freeze)", "legal_status": "PROSPECTIVE_UNENACTED", "evidence_state": "constitutional_mandate"}'::jsonb THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "metadata" mismatch: existing="%", expected="%"',
      'eci_delimitation_post2026_projected_v1', v_rec.metadata, '{"statutory_reference": "Constitution of India, Articles 82 & 170 (Post-2026 Delimitation Freeze)", "legal_status": "PROSPECTIVE_UNENACTED", "evidence_state": "constitutional_mandate"}';
  END IF;

  -- =========================================================================
  -- 5. scenario_delimitation_draft_prop_1_v1
  -- =========================================================================
  SELECT * INTO v_rec FROM public.dataset_versions WHERE id = 'scenario_delimitation_draft_prop_1_v1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % not found', 'scenario_delimitation_draft_prop_1_v1';
  END IF;

  IF v_rec.dataset_id IS DISTINCT FROM 'panin_delimitation_scenarios' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "dataset_id" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.dataset_id, 'panin_delimitation_scenarios';
  END IF;
  IF v_rec.version_tag IS DISTINCT FROM 'draft_prop_1' THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "version_tag" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.version_tag, 'draft_prop_1';
  END IF;
  IF v_rec.effective_from IS DISTINCT FROM '2026-01-01'::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_from" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.effective_from, '2026-01-01';
  END IF;
  IF v_rec.effective_to IS DISTINCT FROM NULL::date THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "effective_to" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.effective_to, 'NULL';
  END IF;
  IF v_rec.record_count IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "record_count" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.record_count, '0';
  END IF;
  IF v_rec.checksum_sha256 IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "checksum_sha256" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.checksum_sha256, 'NULL';
  END IF;
  IF v_rec.storage_path IS DISTINCT FROM NULL::text THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "storage_path" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.storage_path, 'NULL';
  END IF;
  IF v_rec.default_status IS DISTINCT FROM 'UNVERIFIED'::data_status_enum THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "default_status" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.default_status, 'UNVERIFIED';
  END IF;
  IF v_rec.verification_evidence_id IS DISTINCT FROM NULL::uuid THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "verification_evidence_id" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.verification_evidence_id, 'NULL';
  END IF;
  IF v_rec.metadata IS DISTINCT FROM '{"simulation_name": "Hypothetical Population-Based Seat Reallocation Model 1", "legal_status": "NON_STATUTORY_SIMULATION", "evidence_state": "simulation_model"}'::jsonb THEN
    RAISE EXCEPTION 'RECONCILIATION FAILURE: dataset_version % field "metadata" mismatch: existing="%", expected="%"',
      'scenario_delimitation_draft_prop_1_v1', v_rec.metadata, '{"simulation_name": "Hypothetical Population-Based Seat Reallocation Model 1", "legal_status": "NON_STATUTORY_SIMULATION", "evidence_state": "simulation_model"}';
  END IF;
END $$;


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

-- ─── 11. MANDAL TEMPORAL VERSIONING & CANONICAL GOVERNANCE ARCHITECTURE ────────

-- A. Dedicated Boundary Roles & Initialization
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'panin_boundary_definer') THEN
    CREATE ROLE panin_boundary_definer WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'panin_boundary_admin') THEN
    CREATE ROLE panin_boundary_admin WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- B. Grant Schema Usage
GRANT USAGE ON SCHEMA public TO panin_boundary_definer;

-- C. Create Mandal Versions Table
CREATE TABLE IF NOT EXISTS public.mandal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandal_id TEXT NOT NULL REFERENCES public.mandals(id) ON DELETE RESTRICT,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  version_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(20),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT false, -- Fail-closed default
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique version code
  CONSTRAINT uq_mandal_versions_code UNIQUE (version_code),

  -- Composite unique key to support composite FK from mandals
  CONSTRAINT uq_mandal_versions_id_mandal UNIQUE (id, mandal_id),

  -- Temporal non-overlapping interval exclusion
  CONSTRAINT uq_mandal_versions_no_overlap EXCLUDE USING gist (
    mandal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  ),

  -- Calendar-independent currentness check: is_current = true <=> valid_to IS NULL
  CONSTRAINT chk_mandal_versions_current_invariants CHECK (
    (is_current = false) OR (is_current = true AND valid_to IS NULL)
  )
);

-- Indexing on mandal_versions
CREATE INDEX IF NOT EXISTS idx_mandal_versions_mandal_id ON public.mandal_versions(mandal_id);
CREATE INDEX IF NOT EXISTS idx_mandal_versions_district_id ON public.mandal_versions(district_id);
CREATE INDEX IF NOT EXISTS idx_mandal_versions_dataset ON public.mandal_versions(primary_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_mandal_versions_current ON public.mandal_versions(mandal_id) WHERE is_current = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mandal_versions_single_current 
  ON public.mandal_versions (mandal_id) 
  WHERE is_current = true;

-- D. Enhance Mandals Anchor Table (Integrity Hardened)
ALTER TABLE public.mandals
  ADD COLUMN IF NOT EXISTS current_version_id UUID,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Enforce same-anchor composite FK with RESTRICT on delete
ALTER TABLE public.mandals
  DROP CONSTRAINT IF EXISTS fk_mandals_current_version_same_anchor;

ALTER TABLE public.mandals
  ADD CONSTRAINT fk_mandals_current_version_same_anchor
  FOREIGN KEY (current_version_id, id)
  REFERENCES public.mandal_versions(id, mandal_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_mandals_current_version_id ON public.mandals(current_version_id);

-- E. Exact Least-Privilege Grants to panin_boundary_definer
GRANT SELECT ON TABLE public.dataset_versions TO panin_boundary_definer;
GRANT SELECT ON TABLE public.provenance_records TO panin_boundary_definer;
GRANT SELECT, UPDATE (current_version_id, updated_at) ON TABLE public.mandals TO panin_boundary_definer;
GRANT SELECT, UPDATE (is_current, valid_from, valid_to, updated_at) ON TABLE public.mandal_versions TO panin_boundary_definer;

-- F. Bidirectional Deferred Constraint Triggers
-- Layer 2: Anchor Constraint Trigger with W012 Authority Enforcement
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_current_version()
RETURNS TRIGGER AS $$
DECLARE
  v_dataset_status TEXT;
BEGIN
  IF NEW.current_version_id IS NOT NULL THEN
    SELECT dv.default_status INTO v_dataset_status
    FROM public.mandal_versions mv
    JOIN public.dataset_versions dv ON mv.primary_dataset_version_id = dv.id
    WHERE mv.id = NEW.current_version_id
      AND mv.mandal_id = NEW.id
      AND mv.is_current = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INTEGRITY VIOLATION [ERR-W014-001]: mandals.current_version_id (%) must reference an active version (is_current = true) belonging to mandal %',
        NEW.current_version_id, NEW.id
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    IF v_dataset_status <> 'OFFICIAL' THEN
      RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: mandals.current_version_id (%) references dataset version with status "%". Canonical pointer requires W012 "OFFICIAL" authority.',
        NEW.current_version_id, v_dataset_status
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_mandal_current_version ON public.mandals;
CREATE CONSTRAINT TRIGGER trg_guard_mandal_current_version
  AFTER INSERT OR UPDATE OF current_version_id ON public.mandals
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_mandal_current_version();

-- Layer 3: Reciprocal Version Retirement Guard Trigger
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_version_retirement()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.is_current = true) OR
     (TG_OP = 'UPDATE' AND OLD.is_current = true AND NEW.is_current = false) THEN
    IF EXISTS (
      SELECT 1 FROM public.mandals m
      WHERE m.current_version_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'INTEGRITY VIOLATION [ERR-W014-002]: Cannot deactivate (is_current=false) or delete mandal_version % while it is actively referenced by mandals.current_version_id. Transition mandal to an active successor version or clear current_version_id first via fn_transition_mandal_current_version().',
        OLD.id
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_mandal_version_retirement ON public.mandal_versions;
CREATE CONSTRAINT TRIGGER trg_guard_mandal_version_retirement
  AFTER UPDATE OF is_current OR DELETE ON public.mandal_versions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_mandal_version_retirement();

-- G. Authoritative Atomic Transition Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version(
  p_mandal_id TEXT,
  p_new_version_id UUID,
  p_effective_date DATE,
  p_operator TEXT,
  p_provenance_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_version_id UUID;
  v_new_mandal_id TEXT;
  v_new_valid_to DATE;
  v_dataset_status TEXT;
BEGIN
  -- 1. Narrow Provenance Existence Check: If provided, assert valid provenance record existence
  IF p_provenance_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.provenance_records pr WHERE pr.id = p_provenance_id
    ) THEN
      RAISE EXCEPTION 'PROVENANCE NOT FOUND [ERR-W014-005]: Specified provenance_id % does not exist in public.provenance_records',
        p_provenance_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- 2. Lock the anchor row to serialize concurrent transitions
  SELECT current_version_id INTO v_old_version_id
  FROM public.mandals
  WHERE id = p_mandal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MANDAL_NOT_FOUND: Mandal % does not exist', p_mandal_id
      USING ERRCODE = '23503';
  END IF;

  -- 3. Validate target new version exists, fetch properties and dataset status
  SELECT mv.mandal_id, mv.valid_to, dv.default_status
  INTO v_new_mandal_id, v_new_valid_to, v_dataset_status
  FROM public.mandal_versions mv
  JOIN public.dataset_versions dv ON mv.primary_dataset_version_id = dv.id
  WHERE mv.id = p_new_version_id
  FOR UPDATE OF mv;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_NOT_FOUND: mandal_version % does not exist', p_new_version_id
      USING ERRCODE = '23503';
  END IF;

  -- 4. Assert same-anchor ownership
  IF v_new_mandal_id <> p_mandal_id THEN
    RAISE EXCEPTION 'ANCHOR_MISMATCH [ERR-W014-004]: mandal_version % belongs to mandal %, not %',
      p_new_version_id, v_new_mandal_id, p_mandal_id
      USING ERRCODE = '23503';
  END IF;

  -- 5. Assert target version belongs to an OFFICIAL dataset (W012 Authority Boundary)
  IF v_dataset_status <> 'OFFICIAL' THEN
    RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: Cannot promote mandal_version % to current legal truth. Dataset status is "%", but W014 requires "OFFICIAL".',
      p_new_version_id, v_dataset_status
      USING ERRCODE = '23514';
  END IF;

  -- 6. Assert target version represents an open-ended interval
  IF v_new_valid_to IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_VALIDITY_INTERVAL: Target mandal_version % has valid_to = %. Active current version must be open-ended (valid_to IS NULL).',
      p_new_version_id, v_new_valid_to
      USING ERRCODE = '23514';
  END IF;

  -- 7. No-op short circuit
  IF v_old_version_id = p_new_version_id THEN
    RETURN jsonb_build_object(
      'status', 'NO_OP',
      'mandal_id', p_mandal_id,
      'current_version_id', p_new_version_id,
      'message', 'Version is already current'
    );
  END IF;

  -- 8. Retire currently active version (if present)
  IF v_old_version_id IS NOT NULL THEN
    UPDATE public.mandal_versions
    SET is_current = false,
        valid_to = p_effective_date,
        updated_at = now()
    WHERE id = v_old_version_id;
  END IF;

  -- 9. Activate new version
  UPDATE public.mandal_versions
  SET is_current = true,
      valid_from = COALESCE(p_effective_date, valid_from),
      valid_to = NULL,
      updated_at = now()
  WHERE id = p_new_version_id;

  -- 10. Point anchor to new version
  UPDATE public.mandals
  SET current_version_id = p_new_version_id,
      updated_at = now()
  WHERE id = p_mandal_id;

  -- 11. Return structured audit receipt (SESSION_USER and p_operator recorded strictly as audit metadata)
  RETURN jsonb_build_object(
    'status', 'TRANSITION_COMPLETE',
    'mandal_id', p_mandal_id,
    'previous_version_id', v_old_version_id,
    'current_version_id', p_new_version_id,
    'effective_date', p_effective_date,
    'session_user', SESSION_USER,
    'operator', p_operator,
    'provenance_id', p_provenance_id,
    'timestamp', now()
  );
END;
$$;

-- Set ownership to dedicated non-login boundary owner.
-- In PostgreSQL / managed database environments (such as Supabase SQL Editor executing as 'postgres'),
-- altering function ownership requires:
-- 1. The caller to hold SET ROLE authority on the target role (AlterFunctionOwner_internal: check_can_set_role).
-- 2. The target role to hold CREATE privilege on the function's schema (AlterFunctionOwner_internal: pg_namespace_aclcheck ACL_CREATE).
-- We temporarily grant membership in panin_boundary_definer to CURRENT_USER and temporary CREATE on schema public
-- to panin_boundary_definer to satisfy PostgreSQL kernel invariants during ALTER FUNCTION OWNER.
-- Both temporary privileges are immediately revoked in the same transaction prior to COMMIT.
GRANT panin_boundary_definer TO CURRENT_USER;
GRANT CREATE ON SCHEMA public TO panin_boundary_definer;

ALTER FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) 
  OWNER TO panin_boundary_definer;

REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;
REVOKE panin_boundary_definer FROM CURRENT_USER;

-- Explicit Declarative ACL Configuration
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO panin_boundary_admin;

-- H. Row Level Security for mandal_versions
ALTER TABLE public.mandal_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read mandal_versions" ON public.mandal_versions;
CREATE POLICY "Public read mandal_versions"
  ON public.mandal_versions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role write mandal_versions" ON public.mandal_versions;
CREATE POLICY "Service role write mandal_versions"
  ON public.mandal_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

