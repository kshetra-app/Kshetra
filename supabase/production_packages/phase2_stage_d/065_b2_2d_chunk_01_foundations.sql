-- ==============================================================================
-- W021.5-B2.2-D Chunk 01: Foundations & Dataset Provenance Anchor (D0)
-- Purpose: Register canonical dataset, version, and batch anchor for B2.2-D
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Batch Provenance Anchor: 0215b22d-0000-0000-0000-000000000001
-- Invariants:
--   - DO UPDATE = 0, DELETE = 0, DROP = 0, TRUNCATE = 0, ALTER = 0
--   - Fail-closed dataset and dataset_version identity conflict guards
--   - Idempotent ON CONFLICT (id) DO NOTHING
-- ==============================================================================

BEGIN;

-- ─── 1. FAIL-CLOSED CANONICAL DATASET CONFLICT ASSERTION ─────────────────────
DO $BODY$
DECLARE
  v_ds RECORD;
BEGIN
  SELECT id, name, domain, source_id
  INTO v_ds
  FROM public.datasets
  WHERE id = 'eci_candidate_disclosures_tenures';

  IF FOUND THEN
    IF (v_ds.name, v_ds.domain, v_ds.source_id)
       IS DISTINCT FROM
       ('ECI & State Assemblies Candidate Disclosures & Elected Tenures Registry',
        'political_profiles',
        'eci') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_IDENTITY_CONFLICT: Existing dataset % has conflicting attributes (name=%, domain=%, source=%)',
        v_ds.id, v_ds.name, v_ds.domain, v_ds.source_id;
    END IF;
  END IF;
END $BODY$;

-- ─── 2. CANONICAL DATASET REGISTRATION ────────────────────────────────────────
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES (
  'eci_candidate_disclosures_tenures',
  'ECI & State Assemblies Candidate Disclosures & Elected Tenures Registry',
  'political_profiles',
  'Authoritative longitudinal candidate records, general/assembly candidacies, and elected legislative tenures from official ECI and State Assembly gazettes',
  'eci',
  'Government Open Data'
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. FAIL-CLOSED CANONICAL DATASET VERSION CONFLICT ASSERTION ──────────────
DO $BODY$
DECLARE
  v_ver RECORD;
BEGIN
  SELECT id, dataset_id, version_tag, effective_from, default_status
  INTO v_ver
  FROM public.dataset_versions
  WHERE id = 'eci_candidate_disclosures_tenures_2024_v1';

  IF FOUND THEN
    IF (v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status::text)
       IS DISTINCT FROM
       ('eci_candidate_disclosures_tenures',
        '2024-CANDIDATES-TENURES-V1',
        '2024-06-04'::date,
        'OFFICIAL') THEN
      RAISE EXCEPTION 'CANONICAL_DATASET_VERSION_CONFLICT: Existing dataset version % has conflicting attributes (dataset=%, tag=%, from=%, status=%)',
        v_ver.id, v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.default_status;
    END IF;
  END IF;
END $BODY$;

-- ─── 4. CANONICAL DATASET VERSION SNAPSHOT ────────────────────────────────────
INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, effective_from, default_status, record_count, metadata
)
VALUES (
  'eci_candidate_disclosures_tenures_2024_v1',
  'eci_candidate_disclosures_tenures',
  '2024-CANDIDATES-TENURES-V1',
  '2024-06-04'::date,
  'OFFICIAL',
  20417,
  '{"statutory_authority": "Election Commission of India & State Legislative Assembly Secretariats", "description": "Longitudinal candidate profiles, assembly/parliament candidacies, and tenure history", "milestone": "W021.5-B2.2-D"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. BATCH PROVENANCE RECORD ANCHOR ────────────────────────────────────────
INSERT INTO public.provenance_records (
  id, dataset_version_id, status, transformation_type, operator, metadata, created_at
)
VALUES (
  '0215b22d-0000-0000-0000-000000000001'::uuid,
  'eci_candidate_disclosures_tenures_2024_v1',
  'OFFICIAL',
  'canonical_ingest',
  'system:w021.5_b2.2d_pipeline',
  '{"source": "ECI Statistical Reports / State Legislative Assembly Secretariats / Verified Historical Corpora", "milestone": "W021.5-B2.2-D", "record_count": 20417}'::jsonb,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ─── 6. FAIL-CLOSED POST-ASSERTION ────────────────────────────────────────────
DO $$
DECLARE
  v_prov_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.provenance_records
    WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid
  ) INTO v_prov_exists;

  IF NOT v_prov_exists THEN
    RAISE EXCEPTION 'FAIL-CLOSED: B2.2-D Provenance anchor was not created';
  END IF;
END $$;

COMMIT;
