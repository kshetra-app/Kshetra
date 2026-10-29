-- ==============================================================================
-- Migration 072: Canonical Sub-Constituency Hierarchy Extension (JOB 013)
-- Target: Staging Supabase / Local PostgreSQL / Production
-- Authoritative Architecture: docs/HIERARCHY_FRAMEWORK.md & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
-- Mandate: JOB 013 — Canonical Geography Model Sub-Constituency Integration
-- Scope:
--   1. Enhance urban_local_bodies with canonical internal_id, district_id, constituency_internal_id, and W012 governance
--   2. Enhance gram_panchayats with canonical internal_id, district_id, constituency_internal_id, and W012 governance
--   3. Enhance ulb_wards with canonical internal_id, ulb_internal_id, constituency_internal_id, and W012 governance
--   4. Enhance gp_wards with canonical internal_id, panchayat_internal_id, constituency_internal_id, and W012 governance
--   5. Enhance polling_booths with canonical internal_id, 1:1 AC binding check constraint, ward linkages, and W012 governance
--   6. Enforce Row Level Security (RLS) with public read and service_role administrative policies
--   7. Register W012 governance data sources, datasets, and dataset versions
--   8. Seed canonical sub-constituency pilot hierarchy for Telangana ACs (Kodangal, Gajwel, Mancherial)
-- ==============================================================================

BEGIN;

-- ─── 1. EXTENSIONS & PREREQUISITES CONFIRMATION ────────────────────────────────

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- ─── 2. W012 GOVERNANCE CATALOG REGISTRATION ───────────────────────────────────

INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  (
    'src_tsec_local_bodies',
    'Telangana State Election Commission — Local Body Directory',
    'Telangana State Election Commission (TSEC)',
    'statutory',
    'https://tsec.gov.in',
    'Official Statutory Election Roll',
    'api_and_gazette',
    'quarterly',
    true
  ),
  (
    'src_mopr_panchayat',
    'Ministry of Panchayati Raj — National Panchayat Directory',
    'Ministry of Panchayati Raj, Government of India',
    'statutory',
    'https://panchayat.gov.in',
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

INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES
  (
    'ds_sub_constituency_hierarchy',
    'Sub-Constituency Local Bodies, Wards and Polling Stations',
    'geography',
    'Canonical 6-tier administrative and electoral hierarchy linking local bodies, wards, and polling booths to assembly constituencies.',
    'src_tsec_local_bodies',
    'Official Statutory Election Roll'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  source_id = EXCLUDED.source_id,
  updated_at = now();

INSERT INTO public.dataset_versions (id, dataset_id, version_tag, effective_from, default_status, record_count, metadata)
VALUES
  (
    'ver_sub_constituency_2024_v1',
    'ds_sub_constituency_hierarchy',
    '2024_canonical_hierarchy',
    '2024-01-01',
    'UNVERIFIED',
    50,
    '{"statutory_reference": "TSEC Local Body Gazette & ECI Polling Station Directory 2023-2024", "authority": "statutory", "tier": "sub_constituency"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  dataset_id = EXCLUDED.dataset_id,
  version_tag = EXCLUDED.version_tag,
  effective_from = EXCLUDED.effective_from,
  default_status = EXCLUDED.default_status,
  record_count = EXCLUDED.record_count,
  metadata = EXCLUDED.metadata,
  retrieved_at = now();

-- ─── 3. ENHANCE URBAN_LOCAL_BODIES TABLE ───────────────────────────────────────

ALTER TABLE public.urban_local_bodies
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED';

UPDATE public.urban_local_bodies
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.urban_local_bodies
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.urban_local_bodies ADD CONSTRAINT uq_ulb_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill constituency_internal_id from primary_constituency_id
UPDATE public.urban_local_bodies u
SET constituency_internal_id = c.internal_id
FROM public.constituencies c
WHERE u.primary_constituency_id = c.id
  AND u.constituency_internal_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ulb_internal_id ON public.urban_local_bodies(internal_id);
CREATE INDEX IF NOT EXISTS idx_ulb_district_id ON public.urban_local_bodies(district_id);
CREATE INDEX IF NOT EXISTS idx_ulb_constituency_internal ON public.urban_local_bodies(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_ulb_primary_version ON public.urban_local_bodies(primary_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_ulb_data_status ON public.urban_local_bodies(data_status);

COMMENT ON COLUMN public.urban_local_bodies.internal_id IS 'Canonical immutable internal UUID for the urban local body.';
COMMENT ON COLUMN public.urban_local_bodies.constituency_internal_id IS 'Canonical immutable UUID referencing public.constituencies(internal_id).';

-- ─── 4. ENHANCE GRAM_PANCHAYATS TABLE ──────────────────────────────────────────

ALTER TABLE public.gram_panchayats
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED';

UPDATE public.gram_panchayats
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.gram_panchayats
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.gram_panchayats ADD CONSTRAINT uq_gp_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill district_id from mandals
UPDATE public.gram_panchayats gp
SET district_id = m.district_id
FROM public.mandals m
WHERE gp.mandal_id = m.id
  AND gp.district_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_gp_internal_id ON public.gram_panchayats(internal_id);
CREATE INDEX IF NOT EXISTS idx_gp_district_id ON public.gram_panchayats(district_id);
CREATE INDEX IF NOT EXISTS idx_gp_constituency_internal ON public.gram_panchayats(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_gp_primary_version ON public.gram_panchayats(primary_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_gp_data_status ON public.gram_panchayats(data_status);

COMMENT ON COLUMN public.gram_panchayats.internal_id IS 'Canonical immutable internal UUID for the gram panchayat.';
COMMENT ON COLUMN public.gram_panchayats.constituency_internal_id IS 'Canonical immutable UUID referencing public.constituencies(internal_id).';

-- ─── 5. ENHANCE ULB_WARDS TABLE ────────────────────────────────────────────────

ALTER TABLE public.ulb_wards
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS ulb_internal_id UUID REFERENCES public.urban_local_bodies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED';

UPDATE public.ulb_wards
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.ulb_wards
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.ulb_wards ADD CONSTRAINT uq_ulb_wards_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill ulb_internal_id and constituency_internal_id
UPDATE public.ulb_wards w
SET ulb_internal_id = u.internal_id
FROM public.urban_local_bodies u
WHERE w.ulb_id = u.id
  AND w.ulb_internal_id IS NULL;

UPDATE public.ulb_wards w
SET constituency_internal_id = c.internal_id
FROM public.constituencies c
WHERE w.constituency_id = c.id
  AND w.constituency_internal_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ulb_wards_internal_id ON public.ulb_wards(internal_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_ulb_internal ON public.ulb_wards(ulb_internal_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_constituency_internal ON public.ulb_wards(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_primary_version ON public.ulb_wards(primary_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_data_status ON public.ulb_wards(data_status);

COMMENT ON COLUMN public.ulb_wards.internal_id IS 'Canonical immutable internal UUID for the urban local body ward.';

-- ─── 6. ENHANCE GP_WARDS TABLE ─────────────────────────────────────────────────

ALTER TABLE public.gp_wards
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS panchayat_internal_id UUID REFERENCES public.gram_panchayats(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED';

UPDATE public.gp_wards
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.gp_wards
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.gp_wards ADD CONSTRAINT uq_gp_wards_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill panchayat_internal_id
UPDATE public.gp_wards w
SET panchayat_internal_id = gp.internal_id
FROM public.gram_panchayats gp
WHERE w.panchayat_id = gp.id
  AND w.panchayat_internal_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_gp_wards_internal_id ON public.gp_wards(internal_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_panchayat_internal ON public.gp_wards(panchayat_internal_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_constituency_internal ON public.gp_wards(constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_primary_version ON public.gp_wards(primary_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_data_status ON public.gp_wards(data_status);

COMMENT ON COLUMN public.gp_wards.internal_id IS 'Canonical immutable internal UUID for the gram panchayat ward.';

-- ─── 7. ENHANCE POLLING_BOOTHS TABLE & STRICT 1:1 AC BINDING ───────────────────

ALTER TABLE public.polling_booths
  ADD COLUMN IF NOT EXISTS internal_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS panchayat_internal_id UUID REFERENCES public.gram_panchayats(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS ulb_ward_internal_id UUID REFERENCES public.ulb_wards(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS gp_ward_internal_id UUID REFERENCES public.gp_wards(internal_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS primary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS data_status public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED';

UPDATE public.polling_booths
SET internal_id = gen_random_uuid()
WHERE internal_id IS NULL;

ALTER TABLE public.polling_booths
  ALTER COLUMN internal_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.polling_booths ADD CONSTRAINT uq_polling_booths_internal_id UNIQUE (internal_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill constituency_internal_id from constituencies
UPDATE public.polling_booths b
SET constituency_internal_id = c.internal_id
FROM public.constituencies c
WHERE b.constituency_id = c.id
  AND b.constituency_internal_id IS NULL;

-- Backfill panchayat_internal_id from gram_panchayats
UPDATE public.polling_booths b
SET panchayat_internal_id = gp.internal_id
FROM public.gram_panchayats gp
WHERE b.panchayat_id = gp.id
  AND b.panchayat_internal_id IS NULL;

-- Strictly enforce 1:1 binding to Assembly Constituencies (booths can NEVER be orphaned from AC)
DO $$ BEGIN
  ALTER TABLE public.polling_booths
    ADD CONSTRAINT chk_booth_constituency_binding
    CHECK (constituency_internal_id IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_polling_booths_internal_id ON public.polling_booths(internal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_panchayat_internal ON public.polling_booths(panchayat_internal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_ulb_ward_internal ON public.polling_booths(ulb_ward_internal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_gp_ward_internal ON public.polling_booths(gp_ward_internal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_data_status ON public.polling_booths(data_status);

COMMENT ON COLUMN public.polling_booths.internal_id IS 'Canonical immutable internal UUID for the ECI polling station.';
COMMENT ON CONSTRAINT chk_booth_constituency_binding ON public.polling_booths IS 'Constitutional invariant: Every booth must be strictly bound 1:1 to an Assembly Constituency.';

-- ─── 8. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────

ALTER TABLE public.urban_local_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gram_panchayats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ulb_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_booths ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "Public read urban_local_bodies" ON public.urban_local_bodies;
CREATE POLICY "Public read urban_local_bodies" ON public.urban_local_bodies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read gram_panchayats" ON public.gram_panchayats;
CREATE POLICY "Public read gram_panchayats" ON public.gram_panchayats FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read ulb_wards" ON public.ulb_wards;
CREATE POLICY "Public read ulb_wards" ON public.ulb_wards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read gp_wards" ON public.gp_wards;
CREATE POLICY "Public read gp_wards" ON public.gp_wards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read polling_booths" ON public.polling_booths;
CREATE POLICY "Public read polling_booths" ON public.polling_booths FOR SELECT TO anon, authenticated USING (true);

-- Service role full access policies
DROP POLICY IF EXISTS "Service role full access on urban_local_bodies" ON public.urban_local_bodies;
CREATE POLICY "Service role full access on urban_local_bodies" ON public.urban_local_bodies FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on gram_panchayats" ON public.gram_panchayats;
CREATE POLICY "Service role full access on gram_panchayats" ON public.gram_panchayats FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ulb_wards" ON public.ulb_wards;
CREATE POLICY "Service role full access on ulb_wards" ON public.ulb_wards FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on gp_wards" ON public.gp_wards;
CREATE POLICY "Service role full access on gp_wards" ON public.gp_wards FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on polling_booths" ON public.polling_booths;
CREATE POLICY "Service role full access on polling_booths" ON public.polling_booths FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 9. PILOT SUB-CONSTITUENCY POPULATION ──────────────────────────────────────
-- Seed representative sub-constituency data for pilot ACs (Kodangal AC 30, Gajwel AC 33, Mancherial AC 4)
DO $$
DECLARE
  v_ac_kodangal UUID;
  v_ac_gajwel UUID;
  v_ac_mancherial UUID;
  v_dist_vikarabad UUID;
  v_dist_siddipet UUID;
  v_dist_mancherial UUID;
  v_mdl_kodangal TEXT;
  v_mdl_gajwel TEXT;
  v_mdl_mancherial TEXT;
  v_gp_kodangal UUID;
  v_ulb_mancherial UUID;
  v_ward_mancherial UUID;
  v_gp_ward_kodangal UUID;
BEGIN
  SELECT internal_id INTO v_ac_kodangal FROM public.constituencies WHERE ac_no = 72 AND state_code = 'TS';
  SELECT internal_id INTO v_ac_gajwel FROM public.constituencies WHERE ac_no = 33 AND state_code = 'TS';
  SELECT internal_id INTO v_ac_mancherial FROM public.constituencies WHERE ac_no = 4 AND state_code = 'TS';

  SELECT id INTO v_dist_vikarabad FROM public.districts WHERE code = 'TS-DIST-VIKARABAD';
  SELECT id INTO v_dist_siddipet FROM public.districts WHERE code = 'TS-DIST-SIDDIPET';
  SELECT id INTO v_dist_mancherial FROM public.districts WHERE code = 'TS-DIST-MANCHERIAL';

  -- Pilot Gram Panchayat in Kodangal
  IF v_ac_kodangal IS NOT NULL THEN
    INSERT INTO public.gram_panchayats (id, name, local_name, mandal_id, state_code, district_id, constituency_internal_id, lgd_code, type, primary_dataset_version_id, data_status)
    VALUES ('TS-GP-210001', 'Hasnabad', 'హస్నాబాద్', 'TS-MDL-7105', 'TS', v_dist_vikarabad, v_ac_kodangal, 210001, 'gram_panchayat', 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      district_id = EXCLUDED.district_id,
      constituency_internal_id = EXCLUDED.constituency_internal_id
    RETURNING internal_id INTO v_gp_kodangal;

    -- Pilot GP Ward
    IF v_gp_kodangal IS NOT NULL THEN
      INSERT INTO public.gp_wards (id, panchayat_id, state_code, ward_no, name, reservation, panchayat_internal_id, constituency_internal_id, primary_dataset_version_id, data_status)
      VALUES ('TS-GP-210001-W01', 'TS-GP-210001', 'TS', 1, 'Hasnabad Ward 1', 'GEN', v_gp_kodangal, v_ac_kodangal, 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        panchayat_internal_id = EXCLUDED.panchayat_internal_id,
        constituency_internal_id = EXCLUDED.constituency_internal_id
      RETURNING internal_id INTO v_gp_ward_kodangal;

      -- Pilot Polling Booth bound 1:1 to Kodangal AC
      INSERT INTO public.polling_booths (id, booth_number, booth_name, polling_station_name, constituency_id, constituency_internal_id, panchayat_id, panchayat_internal_id, gp_ward_internal_id, state_code, total_voters, primary_dataset_version_id, data_status)
      VALUES ('TS-AC72-B001', 1, 'MPPS Hasnabad Room 1', 'Mandal Parishad Primary School', 'TS-AC-072', v_ac_kodangal, 'TS-GP-210001', v_gp_kodangal, v_gp_ward_kodangal, 'TS', 850, 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
      ON CONFLICT (id) DO UPDATE SET
        booth_name = EXCLUDED.booth_name,
        constituency_internal_id = EXCLUDED.constituency_internal_id,
        panchayat_internal_id = EXCLUDED.panchayat_internal_id,
        gp_ward_internal_id = EXCLUDED.gp_ward_internal_id;
    END IF;
  END IF;

  -- Pilot Urban Local Body in Mancherial
  IF v_ac_mancherial IS NOT NULL THEN
    INSERT INTO public.urban_local_bodies (id, name, local_name, state_code, district, district_id, constituency_internal_id, lgd_code, type, head_office_type, primary_constituency_id, total_wards, primary_dataset_version_id, data_status)
    VALUES ('TS-ULB-803420', 'Mancherial Municipality', 'మంచిర్యాల మున్సిపాలిటీ', 'TS', 'Mancherial', v_dist_mancherial, v_ac_mancherial, 803420, 'municipality', 'chairperson', 'TS-AC-004', 36, 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      district_id = EXCLUDED.district_id,
      constituency_internal_id = EXCLUDED.constituency_internal_id
    RETURNING internal_id INTO v_ulb_mancherial;

    -- Pilot ULB Ward
    IF v_ulb_mancherial IS NOT NULL THEN
      INSERT INTO public.ulb_wards (id, ulb_id, state_code, ward_no, name, reservation, ulb_internal_id, constituency_internal_id, primary_dataset_version_id, data_status)
      VALUES ('TS-ULB-803420-W01', 'TS-ULB-803420', 'TS', 1, 'Mancherial Ward 1 (Old Town)', 'GEN', v_ulb_mancherial, v_ac_mancherial, 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        ulb_internal_id = EXCLUDED.ulb_internal_id,
        constituency_internal_id = EXCLUDED.constituency_internal_id
      RETURNING internal_id INTO v_ward_mancherial;

      -- Pilot Urban Polling Booth bound 1:1 to Mancherial AC
      INSERT INTO public.polling_booths (id, booth_number, booth_name, polling_station_name, constituency_id, constituency_internal_id, ulb_ward_internal_id, state_code, total_voters, primary_dataset_version_id, data_status)
      VALUES ('TS-AC04-B001', 1, 'Govt High School Mancherial Room 1', 'Government High School for Boys', 'TS-AC-004', v_ac_mancherial, v_ward_mancherial, 'TS', 1042, 'ver_sub_constituency_2024_v1', 'UNVERIFIED')
      ON CONFLICT (id) DO UPDATE SET
        booth_name = EXCLUDED.booth_name,
        constituency_internal_id = EXCLUDED.constituency_internal_id,
        ulb_ward_internal_id = EXCLUDED.ulb_ward_internal_id;
    END IF;
  END IF;

END $$;

COMMIT;
