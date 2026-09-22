-- ==============================================================================
-- Migration 040: Canonical Geography Model Foundation (W013)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Authoritative Design: reports/w013_canonical_model_proposal.md
-- Mandate: CTO Implementation Authorization (W013)
-- Scope:
--   1. Enhance states with canonical columns and W012 lineage
--   2. Create canonical districts table with LGD/Census support
--   3. Create canonical parliamentary_constituencies table with ECI PC support
--   4. Enhance constituencies table with canonical columns, preserving legacy PK
--   5. Configure RLS with public read and service_role mutation
--   6. Register W012 data sources, datasets, dataset versions (UNVERIFIED)
--   7. Seed bounded Telangana pilot: 1 State, 33 Districts, 17 PCs, 119 ACs
--   8. Create W012 record_provenance_linkages for all pilot records
-- ==============================================================================

BEGIN;

-- ─── 1. EXTENSIONS & DEPENDENCY CONFIRMATION ───────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 2. ENHANCE STATES TABLE ───────────────────────────────────────────────────

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS lgd_code INTEGER,
  ADD COLUMN IF NOT EXISTS census_code_2011 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

-- Ensure internal_id is populated for all existing states before adding constraints
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

DO $$ BEGIN
  ALTER TABLE public.states ADD CONSTRAINT uq_states_lgd_code UNIQUE (lgd_code);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_states_internal_id ON public.states(internal_id);
CREATE INDEX IF NOT EXISTS idx_states_primary_version ON public.states(primary_dataset_version_id);

COMMENT ON COLUMN public.states.internal_id IS 'Canonical immutable internal UUID.';
COMMENT ON COLUMN public.states.primary_dataset_version_id IS 'W012 primary dataset version from which the state record was seeded (N:1).';

-- ─── 3. CREATE CANONICAL DISTRICTS TABLE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  entity_type VARCHAR(30) NOT NULL DEFAULT 'district',
  name TEXT NOT NULL,
  name_te TEXT,
  headquarters TEXT,
  lgd_code INTEGER UNIQUE,
  census_code_2011 VARCHAR(20),
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_districts_state_name UNIQUE (state_code, name)
);

CREATE INDEX IF NOT EXISTS idx_districts_state_code ON public.districts(state_code);
CREATE INDEX IF NOT EXISTS idx_districts_lgd_code ON public.districts(lgd_code);
CREATE INDEX IF NOT EXISTS idx_districts_code ON public.districts(code);
CREATE INDEX IF NOT EXISTS idx_districts_primary_version ON public.districts(primary_dataset_version_id);

COMMENT ON TABLE public.districts IS 'Canonical administrative district entities anchored to LGD codes.';
COMMENT ON COLUMN public.districts.primary_dataset_version_id IS 'W012 primary dataset version from which the district was seeded (N:1).';

-- ─── 4. CREATE CANONICAL PARLIAMENTARY CONSTITUENCIES TABLE ───────────────────

CREATE TABLE IF NOT EXISTS public.parliamentary_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
  entity_type VARCHAR(30) NOT NULL DEFAULT 'parliamentary_constituency',
  pc_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_te TEXT,
  reservation VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (reservation IN ('general', 'sc', 'st')),
  eci_pc_code VARCHAR(20),
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pc_state_number UNIQUE (state_code, pc_number)
);

CREATE INDEX IF NOT EXISTS idx_pcs_state_code ON public.parliamentary_constituencies(state_code);
CREATE INDEX IF NOT EXISTS idx_pcs_code ON public.parliamentary_constituencies(code);
CREATE INDEX IF NOT EXISTS idx_pcs_number ON public.parliamentary_constituencies(state_code, pc_number);
CREATE INDEX IF NOT EXISTS idx_pcs_primary_version ON public.parliamentary_constituencies(primary_dataset_version_id);

COMMENT ON TABLE public.parliamentary_constituencies IS 'Canonical Lok Sabha parliamentary constituencies under ECI Delimitation Orders.';
COMMENT ON COLUMN public.parliamentary_constituencies.primary_dataset_version_id IS 'W012 primary dataset version from which the PC was seeded (N:1).';

-- ─── 5. ENHANCE CONSTITUENCIES TABLE (ASSEMBLY CONSTITUENCIES) ─────────────────

-- Preserves existing id PRIMARY KEY (e.g. 'TS-AC-1') to protect domain foreign keys
ALTER TABLE public.constituencies
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS canonical_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) DEFAULT 'assembly_constituency',
  ADD COLUMN IF NOT EXISTS eci_ac_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parliamentary_constituency_id UUID REFERENCES public.parliamentary_constituencies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS name_te TEXT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

-- Ensure internal_id is populated for all existing rows before adding constraints
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

DO $$ BEGIN
  ALTER TABLE public.constituencies ADD CONSTRAINT uq_constituencies_canonical_code UNIQUE (canonical_code);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_constituencies_internal_id ON public.constituencies(internal_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_canonical_code ON public.constituencies(canonical_code);
CREATE INDEX IF NOT EXISTS idx_constituencies_pc_id ON public.constituencies(parliamentary_constituency_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_district_id ON public.constituencies(district_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_primary_version ON public.constituencies(primary_dataset_version_id);

COMMENT ON COLUMN public.constituencies.id IS 'Legacy primary key preserved for domain foreign key compatibility.';
COMMENT ON COLUMN public.constituencies.internal_id IS 'Canonical immutable internal UUID (generated once, immutable).';
COMMENT ON COLUMN public.constituencies.canonical_code IS 'Human-readable canonical identifier (padded, e.g. TS-AC-001).';
COMMENT ON COLUMN public.constituencies.primary_dataset_version_id IS 'W012 primary dataset version from which the AC was seeded (N:1).';

-- ─── 6. RLS & SECURITY CONFIGURATION ───────────────────────────────────────────

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliamentary_constituencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read districts" ON public.districts;
CREATE POLICY "Public read districts"
  ON public.districts FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access on districts" ON public.districts;
CREATE POLICY "Service role full access on districts"
  ON public.districts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read parliamentary_constituencies" ON public.parliamentary_constituencies;
CREATE POLICY "Public read parliamentary_constituencies"
  ON public.parliamentary_constituencies FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access on parliamentary_constituencies" ON public.parliamentary_constituencies;
CREATE POLICY "Service role full access on parliamentary_constituencies"
  ON public.parliamentary_constituencies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 7. W012 GOVERNANCE CATALOG REGISTRATION ───────────────────────────────────

-- Register Data Sources
INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  ('mha_india', 'Ministry of Home Affairs', 'Government of India', 'statutory', 'https://www.mha.gov.in', 'Government Open Data', 'gazette_archive', 'as_amended', true),
  ('telangana_revenue_dept', 'Revenue (DA) Department', 'Government of Telangana', 'statutory', 'https://revenue.telangana.gov.in', 'Official Gazette Notification', 'gazette_archive', 'as_amended', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url,
  license = EXCLUDED.license,
  retrieval_method = EXCLUDED.retrieval_method,
  refresh_frequency = EXCLUDED.refresh_frequency,
  updated_at = now();

-- Register Datasets
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  ('mha_state_reorganisation', 'State Reorganisation Acts', 'geography', 'Statutory reorganisation acts enacted by Parliament defining State and Union Territory territories.', 'mha_india', 'Statutory Public Domain'),
  ('ts_revenue_districts', 'Telangana Revenue Districts Reorganisation', 'geography', 'Statutory district reorganisation notifications published in the Telangana Gazette.', 'telangana_revenue_dept', 'Government Gazette Notification'),
  ('eci_delimitation_order_2008', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008', 'geography', 'Delimitation Commission of India Order specifying territorial extents of Parliamentary and Assembly Constituencies.', 'eci', 'Official Constitutional Order')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  source_id = EXCLUDED.source_id,
  license = EXCLUDED.license,
  updated_at = now();

-- Register Dataset Versions (All strictly UNVERIFIED per W013 mandate)
INSERT INTO public.dataset_versions (id, dataset_id, version_tag, effective_from, default_status, record_count, metadata)
VALUES
  (
    'mha_ts_2014_v1',
    'mha_state_reorganisation',
    '2014_act',
    '2014-06-02',
    'UNVERIFIED',
    1,
    '{"statutory_reference": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)", "jurisdiction": "Telangana State", "evidence_state": "identified_unverified"}'::jsonb
  ),
  (
    'ts_districts_2016_v1',
    'ts_revenue_districts',
    '2016_reorganisation',
    '2016-10-11',
    'UNVERIFIED',
    31,
    '{"statutory_reference": "G.O.Ms.Nos 219-249, Revenue (DA-CMRF) Dept, dated 11.10.2016", "district_count": 31, "evidence_state": "identified_unverified"}'::jsonb
  ),
  (
    'ts_districts_2019_additions_v1',
    'ts_revenue_districts',
    '2019_additions',
    '2019-02-16',
    'UNVERIFIED',
    2,
    '{"statutory_reference": "G.O.Ms.Nos 18 & 19, Revenue (DA) Dept, dated 16.02.2019 (Mulugu & Narayanpet)", "district_count": 2, "evidence_state": "identified_unverified"}'::jsonb
  ),
  (
    'ts_districts_2019_composite_v1',
    'ts_revenue_districts',
    '2019_composite',
    '2019-02-16',
    'UNVERIFIED',
    33,
    '{"statutory_reference": "Composite catalog of 31 districts (2016) and 2 addition districts (2019)", "district_count": 33, "evidence_state": "identified_unverified"}'::jsonb
  ),
  (
    'eci_ts_pc_2008_v1',
    'eci_delimitation_order_2008',
    '2008_delimitation_pc',
    '2008-02-19',
    'UNVERIFIED',
    17,
    '{"statutory_reference": "ECI Delimitation Order 2008, Table 1 / AP Reorganisation Act 2014 First Schedule", "pc_count": 17, "evidence_state": "identified_unverified"}'::jsonb
  ),
  (
    'eci_ts_ac_2008_v1',
    'eci_delimitation_order_2008',
    '2008_delimitation_ac',
    '2008-02-19',
    'UNVERIFIED',
    119,
    '{"statutory_reference": "ECI Delimitation Order 2008, Table 2 / AP Reorganisation Act 2014 Second Schedule", "ac_count": 119, "evidence_state": "identified_unverified"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  version_tag = EXCLUDED.version_tag,
  effective_from = EXCLUDED.effective_from,
  default_status = EXCLUDED.default_status,
  record_count = EXCLUDED.record_count,
  metadata = EXCLUDED.metadata;

-- Register Append-Only Provenance Records for Seed Ingestions
INSERT INTO public.provenance_records (id, dataset_version_id, status, transformation_type, operator, metadata)
VALUES
  (
    '00000000-0000-0000-0013-000000000001'::uuid,
    'mha_ts_2014_v1',
    'UNVERIFIED',
    'raw_seed',
    'system:w013_migration',
    '{"description": "Seed instantiation of Telangana State under AP Reorganisation Act 2014"}'::jsonb
  ),
  (
    '00000000-0000-0000-0013-000000000002'::uuid,
    'ts_districts_2016_v1',
    'UNVERIFIED',
    'raw_seed',
    'system:w013_migration',
    '{"description": "Seed instantiation of 31 base Telangana districts under 2016 Reorganisation Gazette"}'::jsonb
  ),
  (
    '00000000-0000-0000-0013-000000000003'::uuid,
    'ts_districts_2019_additions_v1',
    'UNVERIFIED',
    'raw_seed',
    'system:w013_migration',
    '{"description": "Seed instantiation of 2 addition Telangana districts (Mulugu & Narayanpet) under 2019 Gazette"}'::jsonb
  ),
  (
    '00000000-0000-0000-0013-000000000004'::uuid,
    'eci_ts_pc_2008_v1',
    'UNVERIFIED',
    'raw_seed',
    'system:w013_migration',
    '{"description": "Seed instantiation of 17 Telangana Parliamentary Constituencies under ECI Delimitation Order 2008"}'::jsonb
  ),
  (
    '00000000-0000-0000-0013-000000000005'::uuid,
    'eci_ts_ac_2008_v1',
    'UNVERIFIED',
    'raw_seed',
    'system:w013_migration',
    '{"description": "Seed instantiation of 119 Telangana Assembly Constituencies under ECI Delimitation Order 2008"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 8. PILOT SEED INGESTION: TELANGANA STATE ──────────────────────────────────

-- Update existing 'TS' record with canonical attributes and primary version lineage
UPDATE public.states
SET
  primary_dataset_version_id = 'mha_ts_2014_v1'
WHERE code = 'TS';

-- Link State to Provenance
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
VALUES ('states', 'TS', '00000000-0000-0000-0013-000000000001'::uuid, true)
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- ─── 9. PILOT SEED INGESTION: TELANGANA DISTRICTS (33) ─────────────────────────

INSERT INTO public.districts (code, state_code, entity_type, name, primary_dataset_version_id)
VALUES
  ('TS-DIST-ADILABAD', 'TS', 'district', 'Adilabad', 'ts_districts_2016_v1'),
  ('TS-DIST-BHADRADRI-KOTHAGUDEM', 'TS', 'district', 'Bhadradri Kothagudem', 'ts_districts_2016_v1'),
  ('TS-DIST-HANAMKONDA', 'TS', 'district', 'Hanamkonda', 'ts_districts_2016_v1'),
  ('TS-DIST-HYDERABAD', 'TS', 'district', 'Hyderabad', 'ts_districts_2016_v1'),
  ('TS-DIST-JAGTIAL', 'TS', 'district', 'Jagtial', 'ts_districts_2016_v1'),
  ('TS-DIST-JANGAON', 'TS', 'district', 'Jangaon', 'ts_districts_2016_v1'),
  ('TS-DIST-JAYASHANKAR-BHUPALPALLY', 'TS', 'district', 'Jayashankar Bhupalpally', 'ts_districts_2016_v1'),
  ('TS-DIST-JOGULAMBA-GADWAL', 'TS', 'district', 'Jogulamba Gadwal', 'ts_districts_2016_v1'),
  ('TS-DIST-KAMAREDDY', 'TS', 'district', 'Kamareddy', 'ts_districts_2016_v1'),
  ('TS-DIST-KARIMNAGAR', 'TS', 'district', 'Karimnagar', 'ts_districts_2016_v1'),
  ('TS-DIST-KHAMMAM', 'TS', 'district', 'Khammam', 'ts_districts_2016_v1'),
  ('TS-DIST-KUMURAM-BHEEM-ASIFABAD', 'TS', 'district', 'Kumuram Bheem Asifabad', 'ts_districts_2016_v1'),
  ('TS-DIST-MAHABUBABAD', 'TS', 'district', 'Mahabubabad', 'ts_districts_2016_v1'),
  ('TS-DIST-MAHABUBNAGAR', 'TS', 'district', 'Mahabubnagar', 'ts_districts_2016_v1'),
  ('TS-DIST-MANCHERIAL', 'TS', 'district', 'Mancherial', 'ts_districts_2016_v1'),
  ('TS-DIST-MEDAK', 'TS', 'district', 'Medak', 'ts_districts_2016_v1'),
  ('TS-DIST-MEDCHAL-MALKAJGIRI', 'TS', 'district', 'Medchal-Malkajgiri', 'ts_districts_2016_v1'),
  ('TS-DIST-MULUGU', 'TS', 'district', 'Mulugu', 'ts_districts_2019_additions_v1'),
  ('TS-DIST-NAGARKURNOOL', 'TS', 'district', 'Nagarkurnool', 'ts_districts_2016_v1'),
  ('TS-DIST-NALGONDA', 'TS', 'district', 'Nalgonda', 'ts_districts_2016_v1'),
  ('TS-DIST-NARAYANPET', 'TS', 'district', 'Narayanpet', 'ts_districts_2019_additions_v1'),
  ('TS-DIST-NIRMAL', 'TS', 'district', 'Nirmal', 'ts_districts_2016_v1'),
  ('TS-DIST-NIZAMABAD', 'TS', 'district', 'Nizamabad', 'ts_districts_2016_v1'),
  ('TS-DIST-PEDDAPALLI', 'TS', 'district', 'Peddapalli', 'ts_districts_2016_v1'),
  ('TS-DIST-RAJANNA-SIRCILLA', 'TS', 'district', 'Rajanna Sircilla', 'ts_districts_2016_v1'),
  ('TS-DIST-RANGAREDDY', 'TS', 'district', 'Rangareddy', 'ts_districts_2016_v1'),
  ('TS-DIST-SANGAREDDY', 'TS', 'district', 'Sangareddy', 'ts_districts_2016_v1'),
  ('TS-DIST-SIDDIPET', 'TS', 'district', 'Siddipet', 'ts_districts_2016_v1'),
  ('TS-DIST-SURYAPET', 'TS', 'district', 'Suryapet', 'ts_districts_2016_v1'),
  ('TS-DIST-VIKARABAD', 'TS', 'district', 'Vikarabad', 'ts_districts_2016_v1'),
  ('TS-DIST-WANAPARTHY', 'TS', 'district', 'Wanaparthy', 'ts_districts_2016_v1'),
  ('TS-DIST-WARANGAL', 'TS', 'district', 'Warangal', 'ts_districts_2016_v1'),
  ('TS-DIST-YADADRI-BHUVANAGIRI', 'TS', 'district', 'Yadadri Bhuvanagiri', 'ts_districts_2016_v1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  state_code = EXCLUDED.state_code,
  primary_dataset_version_id = EXCLUDED.primary_dataset_version_id,
  updated_at = now();

-- Link 31 Base Districts to Provenance
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'districts', d.code, '00000000-0000-0000-0013-000000000002'::uuid, true
FROM public.districts d
WHERE d.primary_dataset_version_id = 'ts_districts_2016_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- Link 2 Addition Districts (Mulugu, Narayanpet) to Provenance
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'districts', d.code, '00000000-0000-0000-0013-000000000003'::uuid, true
FROM public.districts d
WHERE d.primary_dataset_version_id = 'ts_districts_2019_additions_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- ─── 10. PILOT SEED INGESTION: PARLIAMENTARY CONSTITUENCIES (17) ───────────────

INSERT INTO public.parliamentary_constituencies (code, state_code, entity_type, pc_number, name, reservation, primary_dataset_version_id)
VALUES
  ('TS-PC-01', 'TS', 'parliamentary_constituency', 1, 'Adilabad', 'st', 'eci_ts_pc_2008_v1'),
  ('TS-PC-02', 'TS', 'parliamentary_constituency', 2, 'Peddapalle', 'sc', 'eci_ts_pc_2008_v1'),
  ('TS-PC-03', 'TS', 'parliamentary_constituency', 3, 'Karimnagar', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-04', 'TS', 'parliamentary_constituency', 4, 'Nizamabad', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-05', 'TS', 'parliamentary_constituency', 5, 'Zahirabad', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-06', 'TS', 'parliamentary_constituency', 6, 'Medak', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-07', 'TS', 'parliamentary_constituency', 7, 'Malkajgiri', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-08', 'TS', 'parliamentary_constituency', 8, 'Secunderabad', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-09', 'TS', 'parliamentary_constituency', 9, 'Hyderabad', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-10', 'TS', 'parliamentary_constituency', 10, 'Chevella', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-11', 'TS', 'parliamentary_constituency', 11, 'Mahbubnagar', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-12', 'TS', 'parliamentary_constituency', 12, 'Nagarkurnool', 'sc', 'eci_ts_pc_2008_v1'),
  ('TS-PC-13', 'TS', 'parliamentary_constituency', 13, 'Nalgonda', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-14', 'TS', 'parliamentary_constituency', 14, 'Bhongir', 'general', 'eci_ts_pc_2008_v1'),
  ('TS-PC-15', 'TS', 'parliamentary_constituency', 15, 'Warangal', 'sc', 'eci_ts_pc_2008_v1'),
  ('TS-PC-16', 'TS', 'parliamentary_constituency', 16, 'Mahabubabad', 'st', 'eci_ts_pc_2008_v1'),
  ('TS-PC-17', 'TS', 'parliamentary_constituency', 17, 'Khammam', 'general', 'eci_ts_pc_2008_v1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  pc_number = EXCLUDED.pc_number,
  reservation = EXCLUDED.reservation,
  primary_dataset_version_id = EXCLUDED.primary_dataset_version_id,
  updated_at = now();

-- Link 17 PCs to Provenance
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'parliamentary_constituencies', pc.code, '00000000-0000-0000-0013-000000000004'::uuid, true
FROM public.parliamentary_constituencies pc
WHERE pc.primary_dataset_version_id = 'eci_ts_pc_2008_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- ─── 11. PILOT SEED INGESTION: ASSEMBLY CONSTITUENCIES (119) ───────────────────

INSERT INTO public.constituencies (
  id,
  ac_no,
  name,
  name_te,
  canonical_code,
  entity_type,
  state_code,
  district,
  district_id,
  parliamentary_constituency_id,
  reservation_status,
  primary_dataset_version_id
)
VALUES
  (
    'TS-AC-1',
    1,
    'Sirpur',
    'సిర్పూర్',
    'TS-AC-001',
    'assembly_constituency',
    'TS',
    'Kumuram Bheem Asifabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Kumuram Bheem Asifabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-2',
    2,
    'Chennur',
    'చెన్నూరు',
    'TS-AC-002',
    'assembly_constituency',
    'TS',
    'Mancherial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mancherial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-3',
    3,
    'Bellampalli',
    'బెల్లంపల్లి',
    'TS-AC-003',
    'assembly_constituency',
    'TS',
    'Mancherial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mancherial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-4',
    4,
    'Mancherial',
    'మంచిర్యాల',
    'TS-AC-004',
    'assembly_constituency',
    'TS',
    'Mancherial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mancherial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-5',
    5,
    'Asifabad',
    'ఆసిఫాబాద్',
    'TS-AC-005',
    'assembly_constituency',
    'TS',
    'Kumuram Bheem Asifabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Kumuram Bheem Asifabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-6',
    6,
    'Khanapur',
    'ఖానాపూర్',
    'TS-AC-006',
    'assembly_constituency',
    'TS',
    'Adilabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Adilabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-7',
    7,
    'Adilabad',
    'ఆదిలాబాద్',
    'TS-AC-007',
    'assembly_constituency',
    'TS',
    'Adilabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Adilabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-8',
    8,
    'Boath',
    'బోథ్',
    'TS-AC-008',
    'assembly_constituency',
    'TS',
    'Adilabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Adilabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-9',
    9,
    'Nirmal',
    'నిర్మల్',
    'TS-AC-009',
    'assembly_constituency',
    'TS',
    'Nirmal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nirmal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-10',
    10,
    'Mudhole',
    'ముధోల్',
    'TS-AC-010',
    'assembly_constituency',
    'TS',
    'Nirmal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nirmal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 1),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-11',
    11,
    'Armur',
    'ఆర్మూర్',
    'TS-AC-011',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-12',
    12,
    'Bodhan',
    'బోధన్',
    'TS-AC-012',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-13',
    13,
    'Jukkal',
    'జుక్కల్',
    'TS-AC-013',
    'assembly_constituency',
    'TS',
    'Kamareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Kamareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-14',
    14,
    'Banswada',
    'బాన్సువాడ',
    'TS-AC-014',
    'assembly_constituency',
    'TS',
    'Kamareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Kamareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-15',
    15,
    'Yellareddy',
    'ఎల్లారెడ్డి',
    'TS-AC-015',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-16',
    16,
    'Kamareddy',
    'కామారెడ్డి',
    'TS-AC-016',
    'assembly_constituency',
    'TS',
    'Kamareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Kamareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-17',
    17,
    'Nizamabad Urban',
    'నిజామాబాద్ అర్బన్',
    'TS-AC-017',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-18',
    18,
    'Nizamabad Rural',
    'నిజామాబాద్ రూరల్',
    'TS-AC-018',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-19',
    19,
    'Balkonda',
    'బాల్కొండ',
    'TS-AC-019',
    'assembly_constituency',
    'TS',
    'Nizamabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nizamabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-20',
    20,
    'Koratla',
    'కోరుట్ల',
    'TS-AC-020',
    'assembly_constituency',
    'TS',
    'Jagtial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jagtial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-21',
    21,
    'Jagtial',
    'జగిత్యాల',
    'TS-AC-021',
    'assembly_constituency',
    'TS',
    'Jagtial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jagtial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 4),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-22',
    22,
    'Dharmapuri',
    'ధర్మపురి',
    'TS-AC-022',
    'assembly_constituency',
    'TS',
    'Jagtial',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jagtial'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-23',
    23,
    'Ramagundam',
    'రామగుండం',
    'TS-AC-023',
    'assembly_constituency',
    'TS',
    'Peddapalli',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Peddapalli'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-24',
    24,
    'Manthani',
    'మంథని',
    'TS-AC-024',
    'assembly_constituency',
    'TS',
    'Peddapalli',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Peddapalli'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-25',
    25,
    'Peddapalle',
    'పెద్దపల్లి',
    'TS-AC-025',
    'assembly_constituency',
    'TS',
    'Peddapalli',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Peddapalli'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 2),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-26',
    26,
    'Karimnagar',
    'కరీంనగర్',
    'TS-AC-026',
    'assembly_constituency',
    'TS',
    'Karimnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Karimnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-27',
    27,
    'Choppadandi',
    'చొప్పదండి',
    'TS-AC-027',
    'assembly_constituency',
    'TS',
    'Karimnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Karimnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-28',
    28,
    'Vemulawada',
    'వేములవాడ',
    'TS-AC-028',
    'assembly_constituency',
    'TS',
    'Rajanna Sircilla',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rajanna Sircilla'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-29',
    29,
    'Sircilla',
    'సిరిసిల్ల',
    'TS-AC-029',
    'assembly_constituency',
    'TS',
    'Rajanna Sircilla',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rajanna Sircilla'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-30',
    30,
    'Manakondur',
    'మానకొండూరు',
    'TS-AC-030',
    'assembly_constituency',
    'TS',
    'Karimnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Karimnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-31',
    31,
    'Huzurabad',
    'హుజూరాబాద్',
    'TS-AC-031',
    'assembly_constituency',
    'TS',
    'Karimnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Karimnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-32',
    32,
    'Husnabad',
    'హుస్నాబాద్',
    'TS-AC-032',
    'assembly_constituency',
    'TS',
    'Siddipet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Siddipet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 3),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-33',
    33,
    'Siddipet',
    'సిద్దిపేట',
    'TS-AC-033',
    'assembly_constituency',
    'TS',
    'Siddipet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Siddipet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-34',
    34,
    'Medak',
    'మెదక్',
    'TS-AC-034',
    'assembly_constituency',
    'TS',
    'Medak',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medak'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-35',
    35,
    'Narayankhed',
    'నారాయణ్ఖేడ్',
    'TS-AC-035',
    'assembly_constituency',
    'TS',
    'Sangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Sangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-36',
    36,
    'Andole',
    'ఆందోల్',
    'TS-AC-036',
    'assembly_constituency',
    'TS',
    'Sangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Sangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-37',
    37,
    'Narsapur',
    'నర్సాపూర్',
    'TS-AC-037',
    'assembly_constituency',
    'TS',
    'Medak',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medak'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-38',
    38,
    'Zahirabad',
    'జహీరాబాద్',
    'TS-AC-038',
    'assembly_constituency',
    'TS',
    'Sangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Sangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 5),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-39',
    39,
    'Sangareddy',
    'సంగారెడ్డి',
    'TS-AC-039',
    'assembly_constituency',
    'TS',
    'Sangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Sangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-40',
    40,
    'Patancheru',
    'పటాన్చెరు',
    'TS-AC-040',
    'assembly_constituency',
    'TS',
    'Sangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Sangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-41',
    41,
    'Dubbak',
    'దుబ్బాక',
    'TS-AC-041',
    'assembly_constituency',
    'TS',
    'Siddipet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Siddipet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-42',
    42,
    'Gajwel',
    'గజ్వేల్',
    'TS-AC-042',
    'assembly_constituency',
    'TS',
    'Siddipet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Siddipet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 6),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-43',
    43,
    'Medchal',
    'మేడ్చల్',
    'TS-AC-043',
    'assembly_constituency',
    'TS',
    'Medchal-Malkajgiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medchal-Malkajgiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-44',
    44,
    'Malkajgiri',
    'మల్కాజ్గిరి',
    'TS-AC-044',
    'assembly_constituency',
    'TS',
    'Medchal-Malkajgiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medchal-Malkajgiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-45',
    45,
    'Quthbullapur',
    'కుత్బుల్లాపూర్',
    'TS-AC-045',
    'assembly_constituency',
    'TS',
    'Medchal-Malkajgiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medchal-Malkajgiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-46',
    46,
    'Kukatpally',
    'కూకట్పల్లి',
    'TS-AC-046',
    'assembly_constituency',
    'TS',
    'Medchal-Malkajgiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medchal-Malkajgiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-47',
    47,
    'Uppal',
    'ఉప్పల్',
    'TS-AC-047',
    'assembly_constituency',
    'TS',
    'Medchal-Malkajgiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Medchal-Malkajgiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-48',
    48,
    'Ibrahimpatnam',
    'ఇబ్రహీంపట్నం',
    'TS-AC-048',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-49',
    49,
    'L. B. Nagar',
    'ఎల్బీ నగర్',
    'TS-AC-049',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-50',
    50,
    'Maheshwaram',
    'మహేశ్వరం',
    'TS-AC-050',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-51',
    51,
    'Rajendranagar',
    'రాజేంద్రనగర్',
    'TS-AC-051',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-52',
    52,
    'Serilingampally',
    'శేరిలింగంపల్లి',
    'TS-AC-052',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-53',
    53,
    'Chevella',
    'చేవెళ్ల',
    'TS-AC-053',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-54',
    54,
    'Pargi',
    'పరిగి',
    'TS-AC-054',
    'assembly_constituency',
    'TS',
    'Vikarabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Vikarabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-55',
    55,
    'Vicarabad',
    'వికారాబాద్',
    'TS-AC-055',
    'assembly_constituency',
    'TS',
    'Vikarabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Vikarabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-56',
    56,
    'Tandur',
    'తాండూరు',
    'TS-AC-056',
    'assembly_constituency',
    'TS',
    'Vikarabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Vikarabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 10),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-57',
    57,
    'Musheerabad',
    'ముషీరాబాద్',
    'TS-AC-057',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-58',
    58,
    'Malakpet',
    'మలక్పేట',
    'TS-AC-058',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-59',
    59,
    'Amberpet',
    'అంబర్పేట',
    'TS-AC-059',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-60',
    60,
    'Khairatabad',
    'ఖైరతాబాద్',
    'TS-AC-060',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-61',
    61,
    'Jubilee Hills',
    'జూబ్లీహిల్స్',
    'TS-AC-061',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-62',
    62,
    'Sanathnagar',
    'సనత్నగర్',
    'TS-AC-062',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-63',
    63,
    'Nampally',
    'నాంపల్లి',
    'TS-AC-063',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-64',
    64,
    'Karwan',
    'కార్వాన్',
    'TS-AC-064',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-65',
    65,
    'Goshamahal',
    'గోషామహల్',
    'TS-AC-065',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-66',
    66,
    'Charminar',
    'చార్మినార్',
    'TS-AC-066',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-67',
    67,
    'Chandrayangutta',
    'చంద్రాయణగుట్ట',
    'TS-AC-067',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-68',
    68,
    'Yakutpura',
    'యాకుత్పురా',
    'TS-AC-068',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-69',
    69,
    'Bahadurpura',
    'బహదూర్పురా',
    'TS-AC-069',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 9),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-70',
    70,
    'Secunderabad',
    'సికింద్రాబాద్',
    'TS-AC-070',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 8),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-71',
    71,
    'Secunderabad Cantonment',
    'సికింద్రాబాద్ కంటోన్మెంట్',
    'TS-AC-071',
    'assembly_constituency',
    'TS',
    'Hyderabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hyderabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 7),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-72',
    72,
    'Kodangal',
    'కొడంగల్',
    'TS-AC-072',
    'assembly_constituency',
    'TS',
    'Vikarabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Vikarabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-73',
    73,
    'Narayanpet',
    'నారాయణపేట',
    'TS-AC-073',
    'assembly_constituency',
    'TS',
    'Narayanpet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Narayanpet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-74',
    74,
    'Mahbubnagar',
    'మహబూబ్నగర్',
    'TS-AC-074',
    'assembly_constituency',
    'TS',
    'Mahabubnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mahabubnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-75',
    75,
    'Jadcherla',
    'జడ్చర్ల',
    'TS-AC-075',
    'assembly_constituency',
    'TS',
    'Mahabubnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mahabubnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-76',
    76,
    'Devarkadra',
    'దేవరకద్ర',
    'TS-AC-076',
    'assembly_constituency',
    'TS',
    'Mahabubnagar',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mahabubnagar'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-77',
    77,
    'Makthal',
    'మక్తల్',
    'TS-AC-077',
    'assembly_constituency',
    'TS',
    'Narayanpet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Narayanpet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-78',
    78,
    'Wanaparthy',
    'వనపర్తి',
    'TS-AC-078',
    'assembly_constituency',
    'TS',
    'Wanaparthy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Wanaparthy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-79',
    79,
    'Gadwal',
    'గద్వాల్',
    'TS-AC-079',
    'assembly_constituency',
    'TS',
    'Jogulamba Gadwal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jogulamba Gadwal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-80',
    80,
    'Alampur',
    'ఆలంపూర్',
    'TS-AC-080',
    'assembly_constituency',
    'TS',
    'Jogulamba Gadwal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jogulamba Gadwal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-81',
    81,
    'Nagarkurnool',
    'నాగర్కర్నూల్',
    'TS-AC-081',
    'assembly_constituency',
    'TS',
    'Nagarkurnool',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nagarkurnool'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-82',
    82,
    'Achampet',
    'అచ్చంపేట్',
    'TS-AC-082',
    'assembly_constituency',
    'TS',
    'Nagarkurnool',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nagarkurnool'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-83',
    83,
    'Kalwakurthy',
    'కల్వకుర్తి',
    'TS-AC-083',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-84',
    84,
    'Shadnagar',
    'షాద్నగర్',
    'TS-AC-084',
    'assembly_constituency',
    'TS',
    'Rangareddy',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Rangareddy'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 11),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-85',
    85,
    'Kollapur',
    'కొల్లాపూర్',
    'TS-AC-085',
    'assembly_constituency',
    'TS',
    'Nagarkurnool',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nagarkurnool'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 12),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-86',
    86,
    'Devarakonda',
    'దేవరకొండ',
    'TS-AC-086',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-87',
    87,
    'Nagarjuna Sagar',
    'నాగార్జున సాగర్',
    'TS-AC-087',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-88',
    88,
    'Miryalaguda',
    'మిర్యాలగూడ',
    'TS-AC-088',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-89',
    89,
    'Huzurnagar',
    'హుజూర్నగర్',
    'TS-AC-089',
    'assembly_constituency',
    'TS',
    'Suryapet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Suryapet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-90',
    90,
    'Kodad',
    'కోదాడ',
    'TS-AC-090',
    'assembly_constituency',
    'TS',
    'Suryapet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Suryapet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-91',
    91,
    'Suryapet',
    'సూర్యాపేట',
    'TS-AC-091',
    'assembly_constituency',
    'TS',
    'Suryapet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Suryapet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-92',
    92,
    'Nalgonda',
    'నల్గొండ',
    'TS-AC-092',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 13),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-93',
    93,
    'Munugode',
    'మునుగోడు',
    'TS-AC-093',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-94',
    94,
    'Bhongir',
    'భోంగీర్',
    'TS-AC-094',
    'assembly_constituency',
    'TS',
    'Yadadri Bhuvanagiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Yadadri Bhuvanagiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-95',
    95,
    'Nakrekal',
    'నకిరేకల్',
    'TS-AC-095',
    'assembly_constituency',
    'TS',
    'Nalgonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Nalgonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-96',
    96,
    'Thungathurthi',
    'తుంగతుర్తి',
    'TS-AC-096',
    'assembly_constituency',
    'TS',
    'Suryapet',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Suryapet'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-97',
    97,
    'Alair',
    'ఆలేరు',
    'TS-AC-097',
    'assembly_constituency',
    'TS',
    'Yadadri Bhuvanagiri',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Yadadri Bhuvanagiri'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-98',
    98,
    'Jangaon',
    'జనగామ',
    'TS-AC-098',
    'assembly_constituency',
    'TS',
    'Jangaon',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jangaon'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 14),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-99',
    99,
    'Ghanpur Station',
    'స్టేషన్ ఘన్పూర్',
    'TS-AC-099',
    'assembly_constituency',
    'TS',
    'Jangaon',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jangaon'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-100',
    100,
    'Palakurthi',
    'పాలకుర్తి',
    'TS-AC-100',
    'assembly_constituency',
    'TS',
    'Jangaon',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jangaon'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-101',
    101,
    'Dornakal',
    'డోర్నకల్',
    'TS-AC-101',
    'assembly_constituency',
    'TS',
    'Mahabubabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mahabubabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-102',
    102,
    'Mahabubabad',
    'మహబూబాబాద్',
    'TS-AC-102',
    'assembly_constituency',
    'TS',
    'Mahabubabad',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mahabubabad'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-103',
    103,
    'Narsampet',
    'నర్సంపేట',
    'TS-AC-103',
    'assembly_constituency',
    'TS',
    'Warangal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Warangal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-104',
    104,
    'Parkal',
    'పరకాల',
    'TS-AC-104',
    'assembly_constituency',
    'TS',
    'Warangal',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Warangal'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-105',
    105,
    'Warangal West',
    'వరంగల్ పశ్చిమ',
    'TS-AC-105',
    'assembly_constituency',
    'TS',
    'Hanamkonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hanamkonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-106',
    106,
    'Warangal East',
    'వరంగల్ తూర్పు',
    'TS-AC-106',
    'assembly_constituency',
    'TS',
    'Hanamkonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hanamkonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-107',
    107,
    'Wardhannapet',
    'వర్ధన్నపేట',
    'TS-AC-107',
    'assembly_constituency',
    'TS',
    'Hanamkonda',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Hanamkonda'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-108',
    108,
    'Bhupalpalle',
    'భూపాలపల్లి',
    'TS-AC-108',
    'assembly_constituency',
    'TS',
    'Jayashankar Bhupalpally',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Jayashankar Bhupalpally'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 15),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-109',
    109,
    'Mulug',
    'ములుగు',
    'TS-AC-109',
    'assembly_constituency',
    'TS',
    'Mulugu',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Mulugu'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-110',
    110,
    'Pinapaka',
    'పినపాక',
    'TS-AC-110',
    'assembly_constituency',
    'TS',
    'Bhadradri Kothagudem',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Bhadradri Kothagudem'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-111',
    111,
    'Yellandu',
    'ఇల్లందు',
    'TS-AC-111',
    'assembly_constituency',
    'TS',
    'Bhadradri Kothagudem',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Bhadradri Kothagudem'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-112',
    112,
    'Khammam',
    'ఖమ్మం',
    'TS-AC-112',
    'assembly_constituency',
    'TS',
    'Khammam',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Khammam'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-113',
    113,
    'Palair',
    'పాలేరు',
    'TS-AC-113',
    'assembly_constituency',
    'TS',
    'Khammam',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Khammam'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-114',
    114,
    'Madhira',
    'మధిర',
    'TS-AC-114',
    'assembly_constituency',
    'TS',
    'Khammam',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Khammam'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-115',
    115,
    'Wyra',
    'వైరా',
    'TS-AC-115',
    'assembly_constituency',
    'TS',
    'Khammam',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Khammam'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-116',
    116,
    'Sathupalli',
    'సత్తుపల్లి',
    'TS-AC-116',
    'assembly_constituency',
    'TS',
    'Khammam',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Khammam'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'SC',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-117',
    117,
    'Kothagudem',
    'కొత్తగూడెం',
    'TS-AC-117',
    'assembly_constituency',
    'TS',
    'Bhadradri Kothagudem',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Bhadradri Kothagudem'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'GEN',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-118',
    118,
    'Aswaraopeta',
    'అశ్వారావుపేట',
    'TS-AC-118',
    'assembly_constituency',
    'TS',
    'Bhadradri Kothagudem',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Bhadradri Kothagudem'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 17),
    'ST',
    'eci_ts_ac_2008_v1'
  ),
  (
    'TS-AC-119',
    119,
    'Bhadrachalam',
    'భద్రాచలం',
    'TS-AC-119',
    'assembly_constituency',
    'TS',
    'Bhadradri Kothagudem',
    (SELECT id FROM public.districts WHERE state_code = 'TS' AND name = 'Bhadradri Kothagudem'),
    (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'TS' AND pc_number = 16),
    'ST',
    'eci_ts_ac_2008_v1'
  )
ON CONFLICT (id) DO UPDATE SET
  ac_no = EXCLUDED.ac_no,
  name = EXCLUDED.name,
  name_te = EXCLUDED.name_te,
  canonical_code = EXCLUDED.canonical_code,
  entity_type = EXCLUDED.entity_type,
  state_code = EXCLUDED.state_code,
  district = EXCLUDED.district,
  district_id = EXCLUDED.district_id,
  parliamentary_constituency_id = EXCLUDED.parliamentary_constituency_id,
  reservation_status = EXCLUDED.reservation_status,
  primary_dataset_version_id = EXCLUDED.primary_dataset_version_id,
  updated_at = now();

-- Link 119 ACs to Provenance
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'constituencies', c.id, '00000000-0000-0000-0013-000000000005'::uuid, true
FROM public.constituencies c
WHERE c.primary_dataset_version_id = 'eci_ts_ac_2008_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

COMMIT;
