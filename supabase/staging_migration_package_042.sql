-- ==============================================================================
-- Migration 042: Geography Relationship Engine (W015)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Authoritative Design: reports/w015_preflight_inspection_report.md
-- Mandate: CTO Implementation Authorization (W015)
-- Scope:
--   1. Enhance mandals with district_id FK to districts(id) (DEF-15-01)
--   2. Enhance mandal_constituency_map with constituency_internal_id UUID FK (DEF-15-02)
--   3. Enhance polling_booths with constituency_internal_id UUID FK
--   4. Register W012 governance data sources, datasets, and dataset versions (UNVERIFIED)
--   5. Seed bounded authoritative sample for Mandals, Mandal-AC Overlaps, and Booths
--   6. Enforce Row Level Security (RLS) with public read and service_role mutation
--   7. Register W012 record_provenance_linkages for all seeded relationship records
-- ==============================================================================

BEGIN;

-- ─── 1. W012 GOVERNANCE CATALOG REGISTRATION ───────────────────────────────────

-- Register Data Sources
INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  (
    'mopr_lgd',
    'Ministry of Panchayati Raj / Local Government Directory',
    'Ministry of Panchayati Raj, Government of India',
    'statutory',
    'https://lgdirectory.gov.in',
    'Government Open Data (NDSAP)',
    'api_and_gazette',
    'monthly',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url,
  updated_at = now();

-- Register Datasets
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  (
    'ts_lgd_mandals',
    'Telangana Local Government Directory Mandals',
    'geography',
    'Sub-district administrative mandal directory maintained by Ministry of Panchayati Raj / LGD.',
    'mopr_lgd',
    'Government Open Data (NDSAP)'
  ),
  (
    'ts_mandal_ac_mappings',
    'Telangana Mandal to Assembly Constituency Containment Mappings',
    'geography',
    'Authoritative administrative to electoral containment mappings linking Mandals to Assembly Constituencies.',
    'mopr_lgd',
    'Government Open Data (NDSAP)'
  ),
  (
    'eci_polling_stations',
    'ECI Polling Stations & Booths Directory',
    'election',
    'Authoritative polling station directory established by Election Commission of India / CEO Telangana.',
    'eci',
    'Official Statutory Election Roll'
  )
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
    'ts_lgd_mandals_2023_v1',
    'ts_lgd_mandals',
    '2023_lgd_directory',
    '2023-01-01',
    'UNVERIFIED',
    12,
    '{"statutory_reference": "Local Government Directory (LGD), Ministry of Panchayati Raj, GoI", "authority": "statutory", "evidence_state": "lgd_portal"}'::jsonb
  ),
  (
    'ts_mandal_ac_mappings_2023_v1',
    'ts_mandal_ac_mappings',
    '2023_containment_mappings',
    '2023-01-01',
    'UNVERIFIED',
    9,
    '{"statutory_reference": "Delimitation of Parliamentary and Assembly Constituencies Order, 2008 & TS Gazette", "authority": "statutory", "evidence_state": "electoral_gazette"}'::jsonb
  ),
  (
    'eci_ts_booths_2023_v1',
    'eci_polling_stations',
    '2023_electoral_roll_booths',
    '2023-10-04',
    'UNVERIFIED',
    4,
    '{"statutory_reference": "Chief Electoral Officer (CEO) Telangana, Final Electoral Roll 2023", "authority": "constitutional", "evidence_state": "electoral_roll"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  dataset_id = EXCLUDED.dataset_id,
  version_tag = EXCLUDED.version_tag,
  effective_from = EXCLUDED.effective_from,
  default_status = EXCLUDED.default_status,
  record_count = EXCLUDED.record_count,
  metadata = EXCLUDED.metadata,
  retrieved_at = now();

-- ─── 2. ENHANCE MANDALS TABLE (DEF-15-01 FIX) ──────────────────────────────────

ALTER TABLE public.mandals
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_mandals_district_id ON public.mandals(district_id);
CREATE INDEX IF NOT EXISTS idx_mandals_primary_version ON public.mandals(primary_dataset_version_id);

COMMENT ON COLUMN public.mandals.district_id IS 'Canonical foreign key to public.districts(id) establishing District -> Mandal parentage.';
COMMENT ON COLUMN public.mandals.primary_dataset_version_id IS 'W012 dataset version tracking for mandal governance.';

-- ─── 3. ENHANCE MANDAL_CONSTITUENCY_MAP TABLE (DEF-15-02 FIX) ──────────────────

ALTER TABLE public.mandal_constituency_map
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_mcm_constituency_internal ON public.mandal_constituency_map(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_mcm_primary_version ON public.mandal_constituency_map(primary_dataset_version_id);

DO $$ BEGIN
  ALTER TABLE public.mandal_constituency_map ADD CONSTRAINT uq_mcm_mandal_ac UNIQUE (mandal_id, constituency_internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON COLUMN public.mandal_constituency_map.constituency_internal_id IS 'Canonical immutable UUID referencing public.constituencies(internal_id).';

-- ─── 4. ENHANCE POLLING_BOOTHS TABLE ───────────────────────────────────────────

ALTER TABLE public.polling_booths
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_polling_booths_constituency_internal ON public.polling_booths(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_primary_version ON public.polling_booths(primary_dataset_version_id);

COMMENT ON COLUMN public.polling_booths.constituency_internal_id IS 'Canonical immutable UUID referencing public.constituencies(internal_id).';

-- ─── 5. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────

ALTER TABLE public.mandals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandal_constituency_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_booths ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "Public read mandals" ON public.mandals;
CREATE POLICY "Public read mandals" ON public.mandals FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read mandal_constituency_map" ON public.mandal_constituency_map;
CREATE POLICY "Public read mandal_constituency_map" ON public.mandal_constituency_map FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read polling_booths" ON public.polling_booths;
CREATE POLICY "Public read polling_booths" ON public.polling_booths FOR SELECT TO anon, authenticated USING (true);

-- Service role full access policies
DROP POLICY IF EXISTS "Service role full access on mandals" ON public.mandals;
CREATE POLICY "Service role full access on mandals" ON public.mandals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mandal_constituency_map" ON public.mandal_constituency_map;
CREATE POLICY "Service role full access on mandal_constituency_map" ON public.mandal_constituency_map FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on polling_booths" ON public.polling_booths;
CREATE POLICY "Service role full access on polling_booths" ON public.polling_booths FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. BOUNDED AUTHORITATIVE SEED RECORDS ─────────────────────────────────────

-- 6.1 Seed Authoritative Mandals for Kumuram Bheem Asifabad & Mancherial Districts
DO $$
DECLARE
  v_dist_asifabad UUID;
  v_dist_mancherial UUID;
BEGIN
  SELECT id INTO v_dist_asifabad FROM public.districts WHERE code = 'TS-DIST-KUMURAM-BHEEM-ASIFABAD';
  SELECT id INTO v_dist_mancherial FROM public.districts WHERE code = 'TS-DIST-MANCHERIAL';

  IF v_dist_asifabad IS NOT NULL AND v_dist_mancherial IS NOT NULL THEN
    -- Kumuram Bheem Asifabad Mandals
    INSERT INTO public.mandals (id, name, state_code, district, district_id, lgd_code, type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-7101', 'Sirpur (T)', 'TS', 'Kumuram Bheem Asifabad', v_dist_asifabad, 7101, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-7102', 'Kagaznagar', 'TS', 'Kumuram Bheem Asifabad', v_dist_asifabad, 7102, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-7103', 'Dahegaon', 'TS', 'Kumuram Bheem Asifabad', v_dist_asifabad, 7103, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-7104', 'Tiryani', 'TS', 'Kumuram Bheem Asifabad', v_dist_asifabad, 7104, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-7105', 'Asifabad', 'TS', 'Kumuram Bheem Asifabad', v_dist_asifabad, 7105, 'mandal', 'ts_lgd_mandals_2023_v1')
    ON CONFLICT (id) DO UPDATE SET
      district_id = EXCLUDED.district_id,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- Mancherial District Mandals
    INSERT INTO public.mandals (id, name, state_code, district, district_id, lgd_code, type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-5320', 'Luxettipet', 'TS', 'Mancherial', v_dist_mancherial, 5320, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5321', 'Mancherial', 'TS', 'Mancherial', v_dist_mancherial, 5321, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5322', 'Dandepally', 'TS', 'Mancherial', v_dist_mancherial, 5322, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5323', 'Chennur', 'TS', 'Mancherial', v_dist_mancherial, 5323, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5324', 'Bellampalli', 'TS', 'Mancherial', v_dist_mancherial, 5324, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5328', 'Kotapalli', 'TS', 'Mancherial', v_dist_mancherial, 5328, 'mandal', 'ts_lgd_mandals_2023_v1'),
      ('TS-MDL-5329', 'Hajipur', 'TS', 'Mancherial', v_dist_mancherial, 5329, 'mandal', 'ts_lgd_mandals_2023_v1')
    ON CONFLICT (id) DO UPDATE SET
      district_id = EXCLUDED.district_id,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;
  END IF;
END $$;

-- 6.2 Seed Authoritative Mandal ↔ Constituency Containment Mappings
DO $$
DECLARE
  v_ac1_internal UUID;
  v_ac2_internal UUID;
  v_ac3_internal UUID;
  v_ac4_internal UUID;
  v_ac5_internal UUID;
BEGIN
  SELECT internal_id INTO v_ac1_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-001';
  SELECT internal_id INTO v_ac2_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-002';
  SELECT internal_id INTO v_ac3_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-003';
  SELECT internal_id INTO v_ac4_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-004';
  SELECT internal_id INTO v_ac5_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-005';

  IF v_ac1_internal IS NOT NULL AND v_ac2_internal IS NOT NULL AND v_ac3_internal IS NOT NULL AND v_ac4_internal IS NOT NULL AND v_ac5_internal IS NOT NULL THEN
    -- Sirpur (T) AC 1: full containment
    INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-7101', 'TS-AC-1', v_ac1_internal, 'full', 'ts_mandal_ac_mappings_2023_v1'),
      ('TS-MDL-7102', 'TS-AC-1', v_ac1_internal, 'full', 'ts_mandal_ac_mappings_2023_v1')
    ON CONFLICT (mandal_id, constituency_internal_id) DO UPDATE SET
      overlap_type = EXCLUDED.overlap_type,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- Chennur AC 2: full containment of Chennur, partial of Kotapalli
    INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-5323', 'TS-AC-2', v_ac2_internal, 'full', 'ts_mandal_ac_mappings_2023_v1'),
      ('TS-MDL-5328', 'TS-AC-2', v_ac2_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1')
    ON CONFLICT (mandal_id, constituency_internal_id) DO UPDATE SET
      overlap_type = EXCLUDED.overlap_type,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- Bellampalli AC 3: full containment of Bellampalli, partial of Hajipur
    INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-5324', 'TS-AC-3', v_ac3_internal, 'full', 'ts_mandal_ac_mappings_2023_v1'),
      ('TS-MDL-5329', 'TS-AC-3', v_ac3_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1')
    ON CONFLICT (mandal_id, constituency_internal_id) DO UPDATE SET
      overlap_type = EXCLUDED.overlap_type,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- Mancherial AC 4: full containment of Mancherial, partial of Kotapalli and Hajipur
    INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-5321', 'TS-AC-4', v_ac4_internal, 'full', 'ts_mandal_ac_mappings_2023_v1'),
      ('TS-MDL-5328', 'TS-AC-4', v_ac4_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1'),
      ('TS-MDL-5329', 'TS-AC-4', v_ac4_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1')
    ON CONFLICT (mandal_id, constituency_internal_id) DO UPDATE SET
      overlap_type = EXCLUDED.overlap_type,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- Asifabad AC 5: full containment of Asifabad
    INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
    VALUES
      ('TS-MDL-7105', 'TS-AC-5', v_ac5_internal, 'full', 'ts_mandal_ac_mappings_2023_v1')
    ON CONFLICT (mandal_id, constituency_internal_id) DO UPDATE SET
      overlap_type = EXCLUDED.overlap_type,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;
  END IF;
END $$;

-- 6.3 Seed Authoritative Sample Polling Booths (ECI Rule: Booth belongs to exactly one AC)
DO $$
DECLARE
  v_ac1_internal UUID;
  v_ac2_internal UUID;
BEGIN
  SELECT internal_id INTO v_ac1_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-001';
  SELECT internal_id INTO v_ac2_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-002';

  IF v_ac1_internal IS NOT NULL AND v_ac2_internal IS NOT NULL THEN
    -- AC 1 Booths
    INSERT INTO public.polling_booths (id, booth_number, booth_name, polling_station_name, polling_station_address, constituency_id, constituency_internal_id, mandal_id, state_code, total_voters, primary_dataset_version_id)
    VALUES
      ('TS-AC1-B001', 1, 'MPPS Sirpur (Town)', 'Mandal Parishad Primary School', 'Sirpur (T), Kumuram Bheem Asifabad District', 'TS-AC-1', v_ac1_internal, 'TS-MDL-7101', 'TS', 850, 'eci_ts_booths_2023_v1'),
      ('TS-AC1-B002', 2, 'ZPHS Sirpur (Town)', 'Zilla Parishad High School', 'Sirpur (T), Kumuram Bheem Asifabad District', 'TS-AC-1', v_ac1_internal, 'TS-MDL-7101', 'TS', 920, 'eci_ts_booths_2023_v1')
    ON CONFLICT (constituency_id, booth_number) DO UPDATE SET
      constituency_internal_id = EXCLUDED.constituency_internal_id,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;

    -- AC 2 Booths
    INSERT INTO public.polling_booths (id, booth_number, booth_name, polling_station_name, polling_station_address, constituency_id, constituency_internal_id, mandal_id, state_code, total_voters, primary_dataset_version_id)
    VALUES
      ('TS-AC2-B001', 1, 'MPPS Chennur (North)', 'Mandal Parishad Primary School North Wing', 'Chennur, Mancherial District', 'TS-AC-2', v_ac2_internal, 'TS-MDL-5323', 'TS', 980, 'eci_ts_booths_2023_v1'),
      ('TS-AC2-B002', 2, 'ZPHS Chennur (South)', 'Zilla Parishad High School South Wing', 'Chennur, Mancherial District', 'TS-AC-2', v_ac2_internal, 'TS-MDL-5323', 'TS', 1040, 'eci_ts_booths_2023_v1')
    ON CONFLICT (constituency_id, booth_number) DO UPDATE SET
      constituency_internal_id = EXCLUDED.constituency_internal_id,
      primary_dataset_version_id = EXCLUDED.primary_dataset_version_id;
  END IF;
END $$;

-- ─── 7. W012 PROVENANCE RECORDS FOR RELATIONSHIP ENTITIES ───────────────────────

-- Mandals Provenance Records (Authoritative LGD Sub-District Codes)
INSERT INTO public.provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata)
SELECT
  md5('pr_mandal_' || m.id)::uuid,
  m.primary_dataset_version_id,
  'LGD-MANDAL-' || m.lgd_code::text,
  'UNVERIFIED',
  'source_backed_seed',
  'system:w015_authoritative_sync',
  jsonb_build_object(
    'source_authority', 'Ministry of Panchayati Raj, Government of India',
    'source_registry', 'Local Government Directory (LGD)',
    'source_entity', 'subdistrict_mandal',
    'lgd_code', m.lgd_code,
    'mandal_name', m.name,
    'district_name', m.district,
    'statutory_reference', 'Local Government Directory (LGD), Ministry of Panchayati Raj, GoI',
    'source_url', 'https://lgdirectory.gov.in',
    'effective_date', '2023-01-01'
  )
FROM public.mandals m
WHERE m.primary_dataset_version_id = 'ts_lgd_mandals_2023_v1'
ON CONFLICT (id) DO NOTHING;

-- Mandals Provenance Linkages
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT
  'mandals',
  m.id,
  md5('pr_mandal_' || m.id)::uuid,
  true
FROM public.mandals m
WHERE m.primary_dataset_version_id = 'ts_lgd_mandals_2023_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- Mandal-AC Mappings Provenance Records (ECI Delimitation 2008 Schedule References)
INSERT INTO public.provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata)
SELECT
  md5('pr_mcm_' || mcm.id::text)::uuid,
  mcm.primary_dataset_version_id,
  'ECI-DELIM-2008:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':MDL-' || m.lgd_code::text,
  'UNVERIFIED',
  'source_backed_seed',
  'system:w015_authoritative_sync',
  jsonb_build_object(
    'source_authority', 'Election Commission of India / Delimitation Commission',
    'source_document', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008, Schedule XXXI',
    'delimit_order_year', 2008,
    'constituency_code', c.canonical_code,
    'constituency_name', c.name,
    'mandal_name', m.name,
    'mandal_lgd_code', m.lgd_code,
    'overlap_type', mcm.overlap_type,
    'statutory_reference', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008 & TS Gazette',
    'effective_date', '2008-02-19'
  )
FROM public.mandal_constituency_map mcm
JOIN public.mandals m ON m.id = mcm.mandal_id
JOIN public.constituencies c ON c.internal_id = mcm.constituency_internal_id
WHERE mcm.primary_dataset_version_id = 'ts_mandal_ac_mappings_2023_v1'
ON CONFLICT (id) DO NOTHING;

-- Mandal-AC Mappings Provenance Linkages
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT
  'mandal_constituency_map',
  mcm.id::text,
  md5('pr_mcm_' || mcm.id::text)::uuid,
  true
FROM public.mandal_constituency_map mcm
WHERE mcm.primary_dataset_version_id = 'ts_mandal_ac_mappings_2023_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

-- Polling Booths Provenance Records (CEO Telangana Electoral Roll Station References)
INSERT INTO public.provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata)
SELECT
  md5('pr_booth_' || pb.id)::uuid,
  pb.primary_dataset_version_id,
  'ECI-PS-2023:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':PS-' || lpad(pb.booth_number::text, 3, '0'),
  'UNVERIFIED',
  'source_backed_seed',
  'system:w015_authoritative_sync',
  jsonb_build_object(
    'source_authority', 'Chief Electoral Officer (CEO), Telangana',
    'source_document', 'CEO Telangana Final Polling Station List (Electoral Roll 2023)',
    'electoral_roll_year', 2023,
    'constituency_code', c.canonical_code,
    'constituency_name', c.name,
    'booth_number', pb.booth_number,
    'polling_station_name', pb.polling_station_name,
    'polling_station_address', pb.polling_station_address,
    'statutory_reference', 'Chief Electoral Officer (CEO) Telangana, Final Electoral Roll 2023',
    'source_url', 'https://ceotelangana.nic.in',
    'effective_date', '2023-10-04'
  )
FROM public.polling_booths pb
JOIN public.constituencies c ON c.internal_id = pb.constituency_internal_id
WHERE pb.primary_dataset_version_id = 'eci_ts_booths_2023_v1'
ON CONFLICT (id) DO NOTHING;

-- Polling Booths Provenance Linkages
INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT
  'polling_booths',
  pb.id,
  md5('pr_booth_' || pb.id)::uuid,
  true
FROM public.polling_booths pb
WHERE pb.primary_dataset_version_id = 'eci_ts_booths_2023_v1'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

COMMIT;
