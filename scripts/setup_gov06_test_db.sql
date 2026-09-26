-- Setup script for isolated PostgreSQL testing of Migration 046
-- Job: W016-C3-R4-GOV-06

-- 1. Prerequisites (Extensions & Types)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. States, Districts, Mandals
CREATE TABLE IF NOT EXISTS public.states (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO public.states (code, name) VALUES ('TS', 'Telangana') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.states(code)
);
INSERT INTO public.districts (id, code, name, state_code) VALUES
  ('fad43018-7df9-4fac-bb3e-fd9e6ed45bb8', 'TS-DST-MANCHERIAL', 'Mancherial', 'TS'),
  ('208bc4a0-97e2-4cd9-9907-4ec586d52d69', 'TS-DST-ASIFABAD', 'Kumuram Bheem Asifabad', 'TS')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.mandals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  local_name TEXT,
  state_code TEXT NOT NULL REFERENCES public.states(code),
  district TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'mandal',
  district_id UUID,
  lgd_code INTEGER,
  headquarters TEXT,
  area_sq_km NUMERIC(10,2),
  population_2011 INTEGER,
  centroid GEOMETRY(Point, 4326),
  current_version_id UUID,
  valid_from DATE DEFAULT '2016-10-11',
  valid_to DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mandal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandal_id TEXT NOT NULL REFERENCES public.mandals(id),
  district_id UUID,
  version_code VARCHAR(100),
  name TEXT NOT NULL,
  local_name TEXT,
  headquarters TEXT,
  lgd_code INTEGER,
  census_code_2011 VARCHAR(50),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Circular FK for mandals.current_version_id
DO $$ BEGIN
  ALTER TABLE public.mandals
    ADD CONSTRAINT fk_mandals_current_version
    FOREIGN KEY (current_version_id) REFERENCES public.mandal_versions(id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Geography Entity Lineage
CREATE TABLE IF NOT EXISTS public.geography_entity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('state', 'district', 'parliamentary_constituency', 'constituency', 'mandal')),
  predecessor_internal_id UUID NOT NULL,
  successor_internal_id UUID NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('rename', 'split', 'merge', 'abolition', 'creation')),
  effective_date DATE NOT NULL,
  statutory_order TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_geography_lineage UNIQUE (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date)
);

-- Data Sources & Datasets
INSERT INTO public.data_sources (id, name, publisher, authority_level)
VALUES ('mopr_lgd', 'Ministry of Panchayati Raj / Local Government Directory', 'Ministry of Panchayati Raj, Government of India', 'statutory')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.datasets (id, name, domain, source_id)
VALUES ('ts_lgd_mandals', 'Telangana LGD Mandals', 'geography', 'mopr_lgd')
ON CONFLICT (id) DO NOTHING;

-- Dataset versions
INSERT INTO public.dataset_versions (id, dataset_id, version_tag, default_status)
VALUES
  ('ts_lgd_mandals_2023_v1', 'ts_lgd_mandals', '2023_v1', 'OFFICIAL'),
  ('ts_lgd_mandals_2026_v1', 'ts_lgd_mandals', '2026_v1', 'OFFICIAL')
ON CONFLICT (id) DO NOTHING;

-- Seed 621 mandals and versions (including the 12 canonical mandals)
DO $$
DECLARE
  v_i INTEGER;
  v_m_id TEXT;
  v_v1_id UUID;
  v_v2_id UUID;
BEGIN
  -- Canonical 12
  FOR v_m_id, v_v1_id, v_v2_id IN VALUES
    ('TS-MDL-4315', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4318', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4329', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4333', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4319', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4353', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4354', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4348', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4356', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4350', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-4351', gen_random_uuid(), gen_random_uuid()),
    ('TS-MDL-6227', gen_random_uuid(), gen_random_uuid())
  LOOP
    INSERT INTO public.mandals (id, name, state_code, district)
    VALUES (v_m_id, 'Canonical ' || v_m_id, 'TS', 'Mancherial')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.mandal_versions (id, mandal_id, name, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_v1_id, v_m_id, 'V1 ' || v_m_id, '2016-10-11', '2022-09-26', false, 'ts_lgd_mandals_2026_v1');

    INSERT INTO public.mandal_versions (id, mandal_id, name, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_v2_id, v_m_id, 'V2 ' || v_m_id, '2022-09-26', null, true, 'ts_lgd_mandals_2026_v1');

    UPDATE public.mandals SET current_version_id = v_v2_id WHERE id = v_m_id;
  END LOOP;

  -- Remaining 609 mandals to reach 621 total
  -- 577 have 2 versions (1 historical + 1 current), 32 have 1 current version (newly created mandals).
  -- Total current = 621, Total historical = 589 (12 + 577 = 589). Total versions = 1210.
  FOR v_i IN 13..621 LOOP
    v_m_id := 'TS-MDL-STAT-' || lpad(v_i::text, 4, '0');
    v_v2_id := gen_random_uuid();

    INSERT INTO public.mandals (id, name, state_code, district)
    VALUES (v_m_id, 'Mandal ' || v_i, 'TS', 'Mancherial');

    IF v_i <= 589 THEN
      v_v1_id := gen_random_uuid();
      INSERT INTO public.mandal_versions (id, mandal_id, name, valid_from, valid_to, is_current, primary_dataset_version_id)
      VALUES (v_v1_id, v_m_id, 'V1 ' || v_m_id, '2016-10-11', '2022-09-26', false, 'ts_lgd_mandals_2026_v1');
    END IF;

    INSERT INTO public.mandal_versions (id, mandal_id, name, valid_from, valid_to, is_current, primary_dataset_version_id)
    VALUES (v_v2_id, v_m_id, 'V2 ' || v_m_id, '2022-09-26', null, true, 'ts_lgd_mandals_2026_v1');

    UPDATE public.mandals SET current_version_id = v_v2_id WHERE id = v_m_id;
  END LOOP;
END $$;

-- 5. Seed the 12 legacy historical provenance records and linkages
DO $$
DECLARE
  v_leg_id TEXT;
  v_pr_id UUID;
BEGIN
  FOR v_leg_id, v_pr_id IN VALUES
    ('TS-MDL-7101', '251ef2cf-4a5d-b010-ba96-a74a4ec9241b'::uuid),
    ('TS-MDL-7102', '07d06766-c729-dc17-a00f-317fac6f800f'::uuid),
    ('TS-MDL-7103', 'f0d1157e-fa94-560d-2220-8f61540f13cc'::uuid),
    ('TS-MDL-7104', '07ecfa1b-7ef1-120f-35cc-d8b2f95c8c17'::uuid),
    ('TS-MDL-7105', '8328a0db-a5a7-645d-f161-c5cfbc274a48'::uuid),
    ('TS-MDL-5320', '2f1771fb-51b4-861f-8c68-622bdb7cdc65'::uuid),
    ('TS-MDL-5321', '3040f578-fd6e-ea04-a3ab-0cbc6403cc1e'::uuid),
    ('TS-MDL-5322', 'd9ca1e4e-4913-673b-efa1-1fdb0c74a17a'::uuid),
    ('TS-MDL-5323', 'f5660741-308b-314c-b59b-5ae404000c91'::uuid),
    ('TS-MDL-5324', '2785156c-5b34-50e8-1e9a-7d21ec78a842'::uuid),
    ('TS-MDL-5328', '1df7c30c-208c-6cfe-ed50-719dc914701b'::uuid),
    ('TS-MDL-5329', '23806a9a-5532-3613-e8ce-cebe1800467e'::uuid)
  LOOP
    INSERT INTO public.provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata)
    VALUES (v_pr_id, 'ts_lgd_mandals_2023_v1', 'LGD-PILOT-' || v_leg_id, 'OFFICIAL', 'raw_ingest', 'system', jsonb_build_object('pilot_id', v_leg_id))
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
    VALUES ('mandals', v_leg_id, v_pr_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 6. Seed geography_entity_lineage row 68e465c2-...
INSERT INTO public.geography_entity_lineage (
  id,
  entity_type,
  predecessor_internal_id,
  successor_internal_id,
  transition_type,
  effective_date,
  statutory_order,
  metadata,
  primary_dataset_version_id
) VALUES (
  '68e465c2-a00b-478d-8082-e0cf1f3bbe67'::uuid,
  'mandal',
  md5('mandals:TS-MDL-5321')::uuid,
  md5('mandals:TS-MDL-5329')::uuid,
  'split',
  '2016-10-11'::date,
  'G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016',
  jsonb_build_object(
    'parent_district', 'Mancherial',
    'predecessor_mandal_id', 'TS-MDL-5321',
    'predecessor_mandal_name', 'Mancherial',
    'successor_mandal_id', 'TS-MDL-5329',
    'successor_mandal_name', 'Hajipur',
    'lgd_code', 5949,
    'description', 'Hajipur Mandal carved out of Mancherial Mandal upon district reorganisation on 11.10.2016'
  ),
  'ts_lgd_mandals_2023_v1'
) ON CONFLICT (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date) DO NOTHING;

-- 7. Seed provenance_records row 8c350901-...
INSERT INTO public.provenance_records (
  id,
  dataset_version_id,
  source_record_id,
  status,
  transformation_type,
  operator,
  metadata
) VALUES (
  '8c350901-a5d8-fe3d-c5b2-6ffe37601908'::uuid,
  'ts_lgd_mandals_2023_v1',
  'TG-GAZETTE-2016:GOMS222:MANCHERIAL-HAJIPUR-SPLIT',
  'OFFICIAL',
  'authoritative_gazette_lineage',
  'system:w015_b2_reconciliation',
  jsonb_build_object(
    'source_authority', 'Government of Telangana, Revenue (DA-CMRF) Department',
    'source_document', 'Telangana Gazette Extraordinary, Part I (G.O.Ms.No. 222)',
    'effective_date', '2016-10-11',
    'predecessor', 'TS-MDL-5321',
    'successor', 'TS-MDL-5329'
  )
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.record_provenance_linkages (
  domain_table,
  domain_record_id,
  provenance_id,
  is_canonical
) VALUES (
  'geography_entity_lineage',
  '68e465c2-a00b-478d-8082-e0cf1f3bbe67',
  '8c350901-a5d8-fe3d-c5b2-6ffe37601908'::uuid,
  true
) ON CONFLICT DO NOTHING;
