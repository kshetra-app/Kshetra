-- Geometry is a property of a canonical version, not an unversioned identity row.
-- Loading is service-role only and requires a source dataset whose digest and authority
-- are backed by an evidence_records row.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.constituency_versions
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326),
  ADD COLUMN IF NOT EXISTS boundary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS boundary_source_feature_id TEXT,
  ADD COLUMN IF NOT EXISTS boundary_source_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS boundary_geometry_sha256 TEXT;

ALTER TABLE public.parliamentary_constituency_versions
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326),
  ADD COLUMN IF NOT EXISTS boundary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS boundary_source_feature_id TEXT,
  ADD COLUMN IF NOT EXISTS boundary_source_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS boundary_geometry_sha256 TEXT;

ALTER TABLE public.district_versions
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326),
  ADD COLUMN IF NOT EXISTS boundary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS boundary_source_feature_id TEXT,
  ADD COLUMN IF NOT EXISTS boundary_source_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS boundary_geometry_sha256 TEXT;

ALTER TABLE public.state_versions
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326),
  ADD COLUMN IF NOT EXISTS boundary_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS boundary_source_feature_id TEXT,
  ADD COLUMN IF NOT EXISTS boundary_source_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS boundary_geometry_sha256 TEXT;

-- New proposed boundaries identify the exact current AC version they were validated against.
-- Legacy revision rows remain NULL because their historical version cannot be inferred safely.
ALTER TABLE public.delimitation_revision_boundaries
  ADD COLUMN IF NOT EXISTS constituency_version_id UUID
    REFERENCES public.constituency_versions(id) ON DELETE RESTRICT;

-- Backfill AC/state geometries only when the existing dataset version has a verified,
-- government-authority source digest. Unverified legacy geometry remains uncovered.
UPDATE public.constituency_versions cv
SET boundary = c.boundary,
    boundary_dataset_version_id = dv.id,
    boundary_source_feature_id = c.id,
    boundary_source_sha256 = dv.checksum_sha256,
    boundary_geometry_sha256 = encode(digest(ST_AsEWKB(c.boundary), 'sha256'), 'hex')
FROM public.constituencies c
JOIN public.dataset_versions dv ON dv.id = c.primary_dataset_version_id
JOIN public.datasets ds ON ds.id = dv.dataset_id
JOIN public.data_sources src ON src.id = ds.source_id
JOIN public.evidence_records ev ON ev.id = dv.verification_evidence_id
  AND ev.dataset_version_id = dv.id AND ev.artifact_sha256 = dv.checksum_sha256
WHERE cv.constituency_internal_id = c.internal_id
  AND cv.is_current = true AND cv.boundary IS NULL AND c.boundary IS NOT NULL
  AND ST_IsValid(c.boundary) AND NOT ST_IsEmpty(c.boundary) AND ST_SRID(c.boundary)=4326
  AND GeometryType(c.boundary)='MULTIPOLYGON'
  AND CASE WHEN ST_IsValid(c.boundary) THEN ST_Area(c.boundary::geography)>=100 ELSE false END
  AND dv.default_status::TEXT IN ('OFFICIAL', 'VERIFIED')
  AND src.authority_level::TEXT IN ('constitutional', 'statutory')
  AND dv.checksum_sha256 ~ '^[0-9a-f]{64}$'
  AND ev.verification_authority <> '' AND ev.verified_by <> '';

UPDATE public.state_versions sv
SET boundary = s.boundary,
    boundary_dataset_version_id = dv.id,
    boundary_source_feature_id = s.code,
    boundary_source_sha256 = dv.checksum_sha256,
    boundary_geometry_sha256 = encode(digest(ST_AsEWKB(s.boundary), 'sha256'), 'hex')
FROM public.states s
JOIN public.dataset_versions dv ON dv.id = s.primary_dataset_version_id
JOIN public.datasets ds ON ds.id = dv.dataset_id
JOIN public.data_sources src ON src.id = ds.source_id
JOIN public.evidence_records ev ON ev.id = dv.verification_evidence_id
  AND ev.dataset_version_id = dv.id AND ev.artifact_sha256 = dv.checksum_sha256
WHERE sv.state_code = s.code AND sv.is_current = true AND sv.boundary IS NULL
  AND s.boundary IS NOT NULL AND ST_IsValid(s.boundary) AND NOT ST_IsEmpty(s.boundary)
  AND ST_SRID(s.boundary)=4326 AND GeometryType(s.boundary)='MULTIPOLYGON'
  AND dv.default_status::TEXT IN ('OFFICIAL', 'VERIFIED')
  AND src.authority_level::TEXT IN ('constitutional', 'statutory')
  AND dv.checksum_sha256 ~ '^[0-9a-f]{64}$'
  AND ev.verification_authority <> '' AND ev.verified_by <> '';

DO $$
DECLARE
  t TEXT;
  c TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'constituency_versions',
    'parliamentary_constituency_versions',
    'district_versions',
    'state_versions'
  ] LOOP
    c := 'ck_' || t || '_boundary_provenance';
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        (boundary IS NULL AND boundary_dataset_version_id IS NULL AND boundary_source_feature_id IS NULL AND boundary_source_sha256 IS NULL AND boundary_geometry_sha256 IS NULL)
        OR
        (boundary IS NOT NULL AND boundary_dataset_version_id IS NOT NULL AND boundary_source_feature_id IS NOT NULL
         AND boundary_source_sha256 ~ ''^[0-9a-f]{64}$'' AND boundary_geometry_sha256 ~ ''^[0-9a-f]{64}$'')
      )', t, c);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'constituency_versions',
    'parliamentary_constituency_versions',
    'district_versions',
    'state_versions'
  ] LOOP
    c := 'ck_' || t || '_boundary_valid';
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        boundary IS NULL OR (NOT ST_IsEmpty(boundary) AND ST_IsValid(boundary)
          AND ST_SRID(boundary) = 4326 AND GeometryType(boundary) = ''MULTIPOLYGON''
          AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography) >= 100 ELSE false END)
      )', t, c);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_ac_versions_boundary_gist
  ON public.constituency_versions USING GIST(boundary) WHERE boundary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pc_versions_boundary_gist
  ON public.parliamentary_constituency_versions USING GIST(boundary) WHERE boundary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_district_versions_boundary_gist
  ON public.district_versions USING GIST(boundary) WHERE boundary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_state_versions_boundary_gist
  ON public.state_versions USING GIST(boundary) WHERE boundary IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.geography_boundary_load_ledger (
  load_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('STATE', 'AC', 'PC', 'DISTRICT')),
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  expected_entity_count INTEGER NOT NULL CHECK (expected_entity_count > 0),
  loaded_entity_count INTEGER NOT NULL CHECK (loaded_entity_count > 0),
  source_authority TEXT NOT NULL,
  verification_authority TEXT NOT NULL,
  validation_report JSONB NOT NULL,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expected_entity_count = loaded_entity_count)
);
CREATE INDEX IF NOT EXISTS idx_geography_boundary_loads_type_time
  ON public.geography_boundary_load_ledger(entity_type, loaded_at DESC);
ALTER TABLE public.geography_boundary_load_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY geography_boundary_load_ledger_service_role ON public.geography_boundary_load_ledger
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.fn_load_current_geography_boundaries(
  p_entity_type TEXT,
  p_dataset_version_id TEXT,
  p_source_sha256 TEXT,
  p_features JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_source_sha TEXT;
  v_source_authority TEXT;
  v_verification_authority TEXT;
  v_expected INTEGER := 0;
  v_input_count INTEGER := 0;
  v_load_id UUID := gen_random_uuid();
  v_overlap_count INTEGER := 0;
  v_containment_violations INTEGER := 0;
  v_coverage_gaps INTEGER := 0;
  v_report JSONB;
BEGIN
  IF p_entity_type NOT IN ('STATE', 'AC', 'PC', 'DISTRICT') THEN RAISE EXCEPTION 'INVALID_ENTITY_TYPE'; END IF;
  IF p_source_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'INVALID_SOURCE_CHECKSUM'; END IF;
  IF jsonb_typeof(p_features) <> 'array' OR jsonb_array_length(p_features) = 0 THEN RAISE EXCEPTION 'FEATURES_REQUIRED'; END IF;

  SELECT dv.checksum_sha256, src.authority_level::TEXT, ev.verification_authority
    INTO v_source_sha, v_source_authority, v_verification_authority
  FROM public.dataset_versions dv
  JOIN public.datasets ds ON ds.id = dv.dataset_id
  JOIN public.data_sources src ON src.id = ds.source_id
  JOIN public.evidence_records ev ON ev.id = dv.verification_evidence_id
    AND ev.dataset_version_id = dv.id AND ev.artifact_sha256 = dv.checksum_sha256
  WHERE dv.id = p_dataset_version_id
    AND dv.default_status::TEXT IN ('OFFICIAL', 'VERIFIED')
    AND src.authority_level::TEXT IN ('constitutional', 'statutory')
    AND dv.checksum_sha256 ~ '^[0-9a-f]{64}$'
    AND ev.verification_authority <> '' AND ev.verified_by <> '';
  IF NOT FOUND THEN RAISE EXCEPTION 'SOURCE_NOT_VERIFIED_AS_AUTHORITATIVE'; END IF;
  IF p_source_sha256 IS DISTINCT FROM v_source_sha THEN RAISE EXCEPTION 'SOURCE_CHECKSUM_MISMATCH'; END IF;

  DROP TABLE IF EXISTS pg_temp._geo_boundary_input;
  DROP TABLE IF EXISTS pg_temp._geo_boundary_resolved;
  CREATE TEMP TABLE _geo_boundary_input (
    canonical_code TEXT NOT NULL,
    source_feature_id TEXT NOT NULL,
    geometry_json JSONB NOT NULL
  ) ON COMMIT DROP;
  INSERT INTO _geo_boundary_input(canonical_code, source_feature_id, geometry_json)
  SELECT item->>'canonicalCode', item->>'sourceFeatureId', item->'geometry'
  FROM jsonb_array_elements(p_features) AS item;
  SELECT count(*)::INTEGER INTO v_input_count FROM _geo_boundary_input;
  IF EXISTS (SELECT 1 FROM _geo_boundary_input WHERE canonical_code = '' OR source_feature_id = '' OR geometry_json IS NULL) THEN
    RAISE EXCEPTION 'FEATURE_IDENTITY_OR_GEOMETRY_MISSING';
  END IF;
  IF (SELECT count(DISTINCT canonical_code) FROM _geo_boundary_input) <> v_input_count THEN RAISE EXCEPTION 'DUPLICATE_CANONICAL_CODE'; END IF;
  IF (SELECT count(DISTINCT source_feature_id) FROM _geo_boundary_input) <> v_input_count THEN RAISE EXCEPTION 'DUPLICATE_SOURCE_FEATURE_ID'; END IF;

  CREATE TEMP TABLE _geo_boundary_resolved (
    canonical_code TEXT NOT NULL,
    source_feature_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    version_id UUID NOT NULL,
    boundary GEOMETRY(MultiPolygon,4326) NOT NULL
  ) ON COMMIT DROP;

  IF p_entity_type = 'STATE' THEN
    SELECT count(*)::INTEGER INTO v_expected FROM public.state_versions WHERE is_current;
    INSERT INTO _geo_boundary_resolved
    SELECT i.canonical_code, i.source_feature_id, s.code, sv.name, s.code, sv.id,
      ST_Multi(ST_GeomFromGeoJSON(i.geometry_json::TEXT))::geometry(MultiPolygon,4326)
    FROM _geo_boundary_input i
    JOIN public.states s ON s.code = i.canonical_code
    JOIN public.state_versions sv ON sv.state_code = s.code AND sv.is_current;
  ELSIF p_entity_type = 'AC' THEN
    SELECT count(*)::INTEGER INTO v_expected FROM public.constituency_versions WHERE is_current;
    INSERT INTO _geo_boundary_resolved
    SELECT i.canonical_code, i.source_feature_id, c.id, cv.name, c.state_code, cv.id,
      ST_Multi(ST_GeomFromGeoJSON(i.geometry_json::TEXT))::geometry(MultiPolygon,4326)
    FROM _geo_boundary_input i
    JOIN public.constituency_versions cv ON cv.canonical_code = i.canonical_code AND cv.is_current
    JOIN public.constituencies c ON c.internal_id = cv.constituency_internal_id;
  ELSIF p_entity_type = 'PC' THEN
    SELECT count(*)::INTEGER INTO v_expected FROM public.parliamentary_constituency_versions WHERE is_current;
    INSERT INTO _geo_boundary_resolved
    SELECT i.canonical_code, i.source_feature_id, p.code, pv.name, p.state_code, pv.id,
      ST_Multi(ST_GeomFromGeoJSON(i.geometry_json::TEXT))::geometry(MultiPolygon,4326)
    FROM _geo_boundary_input i
    JOIN public.parliamentary_constituencies p ON p.code = i.canonical_code
    JOIN public.parliamentary_constituency_versions pv ON pv.pc_id = p.id AND pv.is_current;
  ELSE
    SELECT count(*)::INTEGER INTO v_expected FROM public.district_versions WHERE is_current;
    INSERT INTO _geo_boundary_resolved
    SELECT i.canonical_code, i.source_feature_id, d.code, dv.name, d.state_code, dv.id,
      ST_Multi(ST_GeomFromGeoJSON(i.geometry_json::TEXT))::geometry(MultiPolygon,4326)
    FROM _geo_boundary_input i
    JOIN public.districts d ON d.code = i.canonical_code
    JOIN public.district_versions dv ON dv.district_id = d.id AND dv.is_current;
  END IF;

  IF v_expected = 0 OR v_input_count <> v_expected
     OR (SELECT count(*) FROM _geo_boundary_resolved) <> v_expected
     OR (SELECT count(DISTINCT version_id) FROM _geo_boundary_resolved) <> v_expected THEN
    RAISE EXCEPTION 'BOUNDARY_FEATURE_SET_DOES_NOT_MATCH_CURRENT_CANONICAL_VERSIONS';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _geo_boundary_resolved
    WHERE ST_SRID(boundary) <> 4326 OR NOT ST_IsValid(boundary) OR ST_IsEmpty(boundary)
  ) THEN RAISE EXCEPTION 'INVALID_OR_SLIVER_GEOMETRY'; END IF;
  IF EXISTS (SELECT 1 FROM _geo_boundary_resolved WHERE ST_Area(boundary::geography) < 100) THEN
    RAISE EXCEPTION 'INVALID_OR_SLIVER_GEOMETRY';
  END IF;

  IF p_entity_type <> 'STATE' THEN
    SELECT count(*)::INTEGER INTO v_containment_violations
    FROM _geo_boundary_resolved g
    LEFT JOIN public.state_versions sv ON sv.state_code = g.state_code AND sv.is_current
    WHERE CASE WHEN sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) THEN true
      ELSE NOT ST_CoveredBy(g.boundary, sv.boundary) END;
    IF v_containment_violations > 0 THEN
      RAISE EXCEPTION 'STATE_PARENT_MISSING_INVALID_OR_CONTAINMENT_BREACH';
    END IF;
  END IF;

  SELECT count(*)::INTEGER INTO v_overlap_count
  FROM _geo_boundary_resolved a JOIN _geo_boundary_resolved b
    ON (p_entity_type = 'STATE' OR a.state_code = b.state_code) AND a.entity_id < b.entity_id
  WHERE ST_Intersects(a.boundary, b.boundary)
    AND ST_Area(ST_Intersection(a.boundary, b.boundary)::geography) > 1.0;
  IF v_overlap_count > 0 THEN RAISE EXCEPTION 'BOUNDARIES_OVERLAP'; END IF;

  IF p_entity_type <> 'STATE' THEN
    SELECT count(*)::INTEGER INTO v_coverage_gaps
    FROM public.state_versions sv
    WHERE sv.is_current AND CASE WHEN sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) THEN true
      ELSE ST_Area(ST_SymDifference(
        sv.boundary,
        COALESCE((SELECT ST_UnaryUnion(ST_Collect(g.boundary)) FROM _geo_boundary_resolved g WHERE g.state_code=sv.state_code),
          ST_GeomFromText('MULTIPOLYGON EMPTY',4326))
      )::geography) > 100.0 END;
  END IF;
  IF v_coverage_gaps > 0 THEN RAISE EXCEPTION 'BOUNDARIES_DO_NOT_COVER_PARENT_STATE'; END IF;

  IF p_entity_type = 'STATE' AND EXISTS (
    SELECT 1 FROM _geo_boundary_resolved r JOIN public.state_versions v ON v.id = r.version_id
    WHERE v.boundary IS NOT NULL AND (v.boundary_geometry_sha256 <> encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
      OR v.boundary_dataset_version_id <> p_dataset_version_id)
  ) THEN RAISE EXCEPTION 'VERSION_BOUND_GEOMETRY_IS_IMMUTABLE'; END IF;
  IF p_entity_type = 'AC' AND EXISTS (
    SELECT 1 FROM _geo_boundary_resolved r JOIN public.constituency_versions v ON v.id = r.version_id
    WHERE v.boundary IS NOT NULL AND (v.boundary_geometry_sha256 <> encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
      OR v.boundary_dataset_version_id <> p_dataset_version_id)
  ) THEN RAISE EXCEPTION 'VERSION_BOUND_GEOMETRY_IS_IMMUTABLE'; END IF;
  IF p_entity_type = 'PC' AND EXISTS (
    SELECT 1 FROM _geo_boundary_resolved r JOIN public.parliamentary_constituency_versions v ON v.id = r.version_id
    WHERE v.boundary IS NOT NULL AND (v.boundary_geometry_sha256 <> encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
      OR v.boundary_dataset_version_id <> p_dataset_version_id)
  ) THEN RAISE EXCEPTION 'VERSION_BOUND_GEOMETRY_IS_IMMUTABLE'; END IF;
  IF p_entity_type = 'DISTRICT' AND EXISTS (
    SELECT 1 FROM _geo_boundary_resolved r JOIN public.district_versions v ON v.id = r.version_id
    WHERE v.boundary IS NOT NULL AND (v.boundary_geometry_sha256 <> encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
      OR v.boundary_dataset_version_id <> p_dataset_version_id)
  ) THEN RAISE EXCEPTION 'VERSION_BOUND_GEOMETRY_IS_IMMUTABLE'; END IF;

  IF p_entity_type = 'STATE' THEN
    UPDATE public.state_versions v SET boundary = r.boundary,
      boundary_dataset_version_id = p_dataset_version_id, boundary_source_feature_id = r.source_feature_id,
      boundary_source_sha256 = v_source_sha, boundary_geometry_sha256 = encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
    FROM _geo_boundary_resolved r WHERE v.id = r.version_id AND v.boundary IS NULL;
  ELSIF p_entity_type = 'AC' THEN
    UPDATE public.constituency_versions v SET boundary = r.boundary,
      boundary_dataset_version_id = p_dataset_version_id, boundary_source_feature_id = r.source_feature_id,
      boundary_source_sha256 = v_source_sha, boundary_geometry_sha256 = encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
    FROM _geo_boundary_resolved r WHERE v.id = r.version_id AND v.boundary IS NULL;
  ELSIF p_entity_type = 'PC' THEN
    UPDATE public.parliamentary_constituency_versions v SET boundary = r.boundary,
      boundary_dataset_version_id = p_dataset_version_id, boundary_source_feature_id = r.source_feature_id,
      boundary_source_sha256 = v_source_sha, boundary_geometry_sha256 = encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
    FROM _geo_boundary_resolved r WHERE v.id = r.version_id AND v.boundary IS NULL;
  ELSE
    UPDATE public.district_versions v SET boundary = r.boundary,
      boundary_dataset_version_id = p_dataset_version_id, boundary_source_feature_id = r.source_feature_id,
      boundary_source_sha256 = v_source_sha, boundary_geometry_sha256 = encode(digest(ST_AsEWKB(r.boundary), 'sha256'), 'hex')
    FROM _geo_boundary_resolved r WHERE v.id = r.version_id AND v.boundary IS NULL;
  END IF;

  SELECT jsonb_build_object(
    'loadId', v_load_id, 'entityType', p_entity_type, 'datasetVersionId', p_dataset_version_id,
    'sourceSha256', v_source_sha, 'sourceAuthority', v_source_authority,
    'verificationAuthority', v_verification_authority, 'expectedEntityCount', v_expected,
    'loadedEntityCount', v_expected, 'overlapCount', v_overlap_count,
    'containmentViolations', v_containment_violations, 'stateCoverageGaps', v_coverage_gaps,
    'loadedAt', now()
  ) INTO v_report;
  INSERT INTO public.geography_boundary_load_ledger (
    load_id, entity_type, dataset_version_id, source_sha256,
    expected_entity_count, loaded_entity_count, source_authority,
    verification_authority, validation_report
  ) VALUES (
    v_load_id, p_entity_type, p_dataset_version_id, v_source_sha,
    v_expected, v_expected, v_source_authority, v_verification_authority, v_report
  );
  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_load_current_geography_boundaries(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_load_current_geography_boundaries(TEXT, TEXT, TEXT, JSONB) TO service_role;

-- The previous audit reports AC/base-row counts and intentionally hardcodes PC/district coverage
-- to zero. It is replaced once all four geometry-bearing version tables are installed below.
CREATE OR REPLACE FUNCTION public.fn_certify_current_geography_topology()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ac_total INTEGER; v_pc_total INTEGER; v_district_total INTEGER; v_state_total INTEGER;
  v_ac_covered INTEGER; v_pc_covered INTEGER; v_district_covered INTEGER; v_state_covered INTEGER;
  v_valid INTEGER; v_invalid INTEGER; v_slivers INTEGER; v_overlaps INTEGER; v_srid_compliant INTEGER;
  v_type_violations INTEGER; v_invalid_srids INTEGER;
  v_containment INTEGER; v_source_failures INTEGER; v_gaps INTEGER; v_state_overlaps INTEGER;
  v_checks_complete BOOLEAN; v_certified BOOLEAN; v_failures JSONB; v_reasons JSONB := '[]'::JSONB;
  v_audit_id UUID := gen_random_uuid(); v_report JSONB;
BEGIN
  DROP TABLE IF EXISTS pg_temp._topology_current;
  DROP TABLE IF EXISTS pg_temp._topology_gaps;
  CREATE TEMP TABLE _topology_current (
    entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, entity_name TEXT NOT NULL,
    state_code TEXT NOT NULL, version_id UUID NOT NULL, boundary GEOMETRY(MultiPolygon,4326),
    boundary_dataset_version_id TEXT, boundary_source_feature_id TEXT,
    boundary_source_sha256 TEXT, boundary_geometry_sha256 TEXT
  ) ON COMMIT DROP;
  INSERT INTO _topology_current
  SELECT 'AC', c.id, cv.name, c.state_code, cv.id, cv.boundary, cv.boundary_dataset_version_id,
    cv.boundary_source_feature_id, cv.boundary_source_sha256, cv.boundary_geometry_sha256
  FROM public.constituencies c JOIN public.constituency_versions cv
    ON cv.constituency_internal_id = c.internal_id AND cv.is_current;
  INSERT INTO _topology_current
  SELECT 'PC', p.code, pv.name, p.state_code, pv.id, pv.boundary, pv.boundary_dataset_version_id,
    pv.boundary_source_feature_id, pv.boundary_source_sha256, pv.boundary_geometry_sha256
  FROM public.parliamentary_constituencies p JOIN public.parliamentary_constituency_versions pv
    ON pv.pc_id = p.id AND pv.is_current;
  INSERT INTO _topology_current
  SELECT 'DISTRICT', d.code, dv.name, d.state_code, dv.id, dv.boundary, dv.boundary_dataset_version_id,
    dv.boundary_source_feature_id, dv.boundary_source_sha256, dv.boundary_geometry_sha256
  FROM public.districts d JOIN public.district_versions dv ON dv.district_id = d.id AND dv.is_current;

  SELECT count(*) FILTER (WHERE entity_type='AC'), count(*) FILTER (WHERE entity_type='PC'),
    count(*) FILTER (WHERE entity_type='DISTRICT') INTO v_ac_total, v_pc_total, v_district_total
  FROM _topology_current;
  SELECT count(*) FILTER (WHERE entity_type='AC' AND boundary IS NOT NULL AND ST_SRID(boundary)=4326 AND GeometryType(boundary)='MULTIPOLYGON'
      AND NOT ST_IsEmpty(boundary) AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)>=100 ELSE false END),
    count(*) FILTER (WHERE entity_type='PC' AND boundary IS NOT NULL AND ST_SRID(boundary)=4326 AND GeometryType(boundary)='MULTIPOLYGON'
      AND NOT ST_IsEmpty(boundary) AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)>=100 ELSE false END),
    count(*) FILTER (WHERE entity_type='DISTRICT' AND boundary IS NOT NULL AND ST_SRID(boundary)=4326 AND GeometryType(boundary)='MULTIPOLYGON'
      AND NOT ST_IsEmpty(boundary) AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)>=100 ELSE false END)
    INTO v_ac_covered, v_pc_covered, v_district_covered FROM _topology_current;

  SELECT count(*) FILTER (WHERE boundary IS NOT NULL AND ST_SRID(boundary)=4326 AND GeometryType(boundary)='MULTIPOLYGON'
      AND NOT ST_IsEmpty(boundary) AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)>=100 ELSE false END),
    count(*) FILTER (WHERE boundary IS NOT NULL AND NOT ST_IsValid(boundary)),
    count(*) FILTER (WHERE boundary IS NOT NULL AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)<100 ELSE false END),
    count(*) FILTER (WHERE boundary IS NOT NULL AND ST_SRID(boundary)=4326),
    count(*) FILTER (WHERE boundary IS NOT NULL AND GeometryType(boundary)<>'MULTIPOLYGON'),
    count(*) FILTER (WHERE boundary IS NOT NULL AND ST_SRID(boundary)<>4326)
  INTO v_valid, v_invalid, v_slivers, v_srid_compliant, v_type_violations, v_invalid_srids
  FROM _topology_current;

  SELECT count(*)::INTEGER INTO v_source_failures FROM (
    SELECT g.version_id
    FROM _topology_current g
    LEFT JOIN public.dataset_versions dv ON dv.id = g.boundary_dataset_version_id
    LEFT JOIN public.datasets ds ON ds.id = dv.dataset_id
    LEFT JOIN public.data_sources src ON src.id = ds.source_id
    LEFT JOIN public.evidence_records ev ON ev.id = dv.verification_evidence_id
      AND ev.dataset_version_id = dv.id AND ev.artifact_sha256 = dv.checksum_sha256
    WHERE g.boundary IS NOT NULL AND (
      g.boundary_source_feature_id IS NULL OR g.boundary_source_sha256 IS DISTINCT FROM dv.checksum_sha256
      OR g.boundary_geometry_sha256 IS DISTINCT FROM encode(digest(ST_AsEWKB(g.boundary), 'sha256'), 'hex')
      OR dv.default_status::TEXT NOT IN ('OFFICIAL','VERIFIED')
      OR src.authority_level::TEXT NOT IN ('constitutional','statutory')
      OR ev.id IS NULL OR ev.verification_authority = '' OR ev.verified_by = ''
    )
    UNION ALL
    SELECT sv.id
    FROM public.state_versions sv
    LEFT JOIN public.dataset_versions dv ON dv.id=sv.boundary_dataset_version_id
    LEFT JOIN public.datasets ds ON ds.id=dv.dataset_id
    LEFT JOIN public.data_sources src ON src.id=ds.source_id
    LEFT JOIN public.evidence_records ev ON ev.id=dv.verification_evidence_id
      AND ev.dataset_version_id=dv.id AND ev.artifact_sha256=dv.checksum_sha256
    WHERE sv.is_current AND sv.boundary IS NOT NULL AND (
      sv.boundary_source_feature_id IS NULL OR sv.boundary_source_sha256 IS DISTINCT FROM dv.checksum_sha256
      OR sv.boundary_geometry_sha256 IS DISTINCT FROM encode(digest(ST_AsEWKB(sv.boundary), 'sha256'), 'hex')
      OR dv.default_status::TEXT NOT IN ('OFFICIAL','VERIFIED')
      OR src.authority_level::TEXT NOT IN ('constitutional','statutory')
      OR ev.id IS NULL OR ev.verification_authority='' OR ev.verified_by=''
    )
  ) failures;

  SELECT count(*)::INTEGER INTO v_state_total FROM public.state_versions WHERE is_current;
  SELECT count(*)::INTEGER INTO v_state_covered FROM public.state_versions sv
  JOIN public.dataset_versions dv ON dv.id=sv.boundary_dataset_version_id
  JOIN public.datasets ds ON ds.id=dv.dataset_id
  JOIN public.data_sources src ON src.id=ds.source_id
  JOIN public.evidence_records ev ON ev.id=dv.verification_evidence_id
    AND ev.dataset_version_id=dv.id AND ev.artifact_sha256=dv.checksum_sha256
  WHERE sv.is_current AND sv.boundary IS NOT NULL AND ST_IsValid(sv.boundary) AND NOT ST_IsEmpty(sv.boundary)
    AND CASE WHEN ST_IsValid(sv.boundary) THEN ST_Area(sv.boundary::geography)>=100 ELSE false END
    AND ST_SRID(sv.boundary)=4326 AND GeometryType(sv.boundary)='MULTIPOLYGON'
    AND sv.boundary_source_feature_id IS NOT NULL AND dv.default_status::TEXT IN ('OFFICIAL','VERIFIED')
    AND src.authority_level::TEXT IN ('constitutional','statutory')
    AND sv.boundary_source_sha256=dv.checksum_sha256
    AND sv.boundary_geometry_sha256=encode(digest(ST_AsEWKB(sv.boundary),'sha256'),'hex')
    AND ev.verification_authority<>'' AND ev.verified_by<>'';

  SELECT count(*)::INTEGER INTO v_containment
  FROM _topology_current g LEFT JOIN public.state_versions sv
    ON sv.state_code = g.state_code AND sv.is_current
  WHERE g.boundary IS NOT NULL AND CASE
    WHEN NOT ST_IsValid(g.boundary) OR sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) THEN true
    ELSE NOT ST_CoveredBy(g.boundary, sv.boundary) END;

  SELECT count(*)::INTEGER INTO v_overlaps FROM (
    SELECT a.boundary AS a_geom,b.boundary AS b_geom
    FROM _topology_current a JOIN _topology_current b
      ON a.entity_type=b.entity_type AND a.state_code=b.state_code AND a.entity_id<b.entity_id
    WHERE a.boundary IS NOT NULL AND b.boundary IS NOT NULL
  ) pairs
  WHERE CASE WHEN ST_IsValid(a_geom) AND ST_IsValid(b_geom) THEN
    CASE WHEN ST_Intersects(a_geom,b_geom) THEN ST_Area(ST_Intersection(a_geom,b_geom)::geography)>1.0 ELSE false END
    ELSE false END;
  SELECT count(*)::INTEGER INTO v_state_overlaps
  FROM public.state_versions a JOIN public.state_versions b
    ON a.is_current AND b.is_current AND a.state_code<b.state_code
  WHERE a.boundary IS NOT NULL AND b.boundary IS NOT NULL AND CASE
    WHEN ST_IsValid(a.boundary) AND ST_IsValid(b.boundary) AND ST_Intersects(a.boundary,b.boundary)
      THEN ST_Area(ST_Intersection(a.boundary,b.boundary)::geography)>1.0 ELSE false END;
  v_overlaps := v_overlaps + v_state_overlaps;

  CREATE TEMP TABLE _topology_gaps (
    entity_type TEXT NOT NULL, state_code TEXT NOT NULL, state_name TEXT NOT NULL, gap_m2 DOUBLE PRECISION
  ) ON COMMIT DROP;
  INSERT INTO _topology_gaps
  SELECT scope.entity_type,sv.state_code,sv.name,
    ST_Area(ST_SymDifference(sv.boundary,COALESCE(coverage.geom,ST_GeomFromText('MULTIPOLYGON EMPTY',4326)))::geography)
  FROM public.state_versions sv
  CROSS JOIN (VALUES ('AC'),('PC'),('DISTRICT')) AS scope(entity_type)
  LEFT JOIN LATERAL (
    SELECT ST_UnaryUnion(ST_Collect(g.boundary)) AS geom
    FROM _topology_current g
    WHERE g.state_code=sv.state_code AND g.entity_type=scope.entity_type
      AND g.boundary IS NOT NULL AND ST_IsValid(g.boundary) AND NOT ST_IsEmpty(g.boundary)
  ) coverage ON true
  WHERE sv.is_current AND CASE WHEN sv.boundary IS NOT NULL AND ST_IsValid(sv.boundary)
    AND GeometryType(sv.boundary)='MULTIPOLYGON' AND ST_SRID(sv.boundary)=4326 THEN
    ST_Area(ST_SymDifference(sv.boundary,COALESCE(coverage.geom,ST_GeomFromText('MULTIPOLYGON EMPTY',4326)))::geography)>100.0
    ELSE false END;
  INSERT INTO _topology_gaps(entity_type,state_code,state_name,gap_m2)
  SELECT 'STATE',sv.state_code,sv.name,NULL FROM public.state_versions sv
  WHERE sv.is_current AND (sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) OR ST_IsEmpty(sv.boundary)
    OR GeometryType(sv.boundary)<>'MULTIPOLYGON' OR ST_SRID(sv.boundary)<>4326);
  SELECT count(*)::INTEGER INTO v_gaps FROM _topology_gaps;
  IF v_state_total=0 THEN v_gaps := v_gaps + 1; END IF;

  v_checks_complete := v_ac_total>0 AND v_pc_total>0 AND v_district_total>0
    AND v_ac_covered=v_ac_total AND v_pc_covered=v_pc_total AND v_district_covered=v_district_total
    AND v_state_total>0 AND v_state_covered=v_state_total
    AND v_valid=v_ac_total+v_pc_total+v_district_total AND v_invalid=0 AND v_slivers=0
    AND v_srid_compliant=v_ac_total+v_pc_total+v_district_total
    AND v_type_violations=0 AND v_invalid_srids=0
    AND v_overlaps=0 AND v_containment=0 AND v_source_failures=0 AND v_gaps=0;
  v_certified := v_checks_complete;

  IF v_ac_total=0 OR v_pc_total=0 OR v_district_total=0 THEN
    v_reasons := v_reasons || jsonb_build_array('One or more canonical entity classes have no current versions.'); END IF;
  IF v_ac_covered<v_ac_total OR v_pc_covered<v_pc_total OR v_district_covered<v_district_total THEN
    v_reasons := v_reasons || jsonb_build_array('One or more current AC, PC, or district versions have no boundary geometry.'); END IF;
  IF v_state_total=0 OR v_state_covered<v_state_total THEN
    v_reasons := v_reasons || jsonb_build_array('Current state-version boundary geometry or its authoritative provenance is incomplete.'); END IF;
  IF v_source_failures>0 THEN v_reasons := v_reasons || jsonb_build_array('One or more boundary source checksums or authority records failed validation.'); END IF;
  IF v_gaps>0 THEN v_reasons := v_reasons || jsonb_build_array('One or more entity classes do not cover their parent state polygon.'); END IF;
  IF v_invalid>0 OR v_slivers>0 THEN v_reasons := v_reasons || jsonb_build_array('One or more boundaries are invalid or smaller than the 100 m² threshold.'); END IF;
  IF v_type_violations>0 OR v_invalid_srids>0 THEN v_reasons := v_reasons || jsonb_build_array('One or more stored boundaries do not have the required MultiPolygon, 4326 type.'); END IF;
  IF v_overlaps>0 THEN v_reasons := v_reasons || jsonb_build_array('Positive-area overlaps exist within one or more canonical entity classes.'); END IF;
  IF v_containment>0 THEN v_reasons := v_reasons || jsonb_build_array('One or more entity boundaries are not contained in a valid current state polygon.'); END IF;

  SELECT COALESCE(jsonb_agg(issue), '[]'::JSONB) INTO v_failures FROM (
    SELECT jsonb_build_object('entityType', entity_type, 'entityId', entity_id, 'name', entity_name,
      'violationType','MISSING_GEOMETRY','details','Current canonical version has no version-bound boundary.') issue
    FROM _topology_current WHERE boundary IS NULL
    UNION ALL
    SELECT jsonb_build_object('entityType',entity_type,'entityId',entity_id,'name',entity_name,
      'violationType',CASE WHEN NOT ST_IsValid(boundary) THEN 'INVALID_GEOMETRY' ELSE 'SLIVER' END,
      'details','Version-bound boundary is invalid or below the 100 m² minimum.')
    FROM _topology_current WHERE boundary IS NOT NULL AND CASE WHEN ST_IsValid(boundary) THEN ST_Area(boundary::geography)<100 ELSE true END
    UNION ALL
    SELECT jsonb_build_object('entityType',entity_type,'entityId',entity_id,'name',entity_name,
      'violationType','INVALID_GEOMETRY','details','Stored boundary is not a MultiPolygon.')
    FROM _topology_current WHERE boundary IS NOT NULL AND GeometryType(boundary)<>'MULTIPOLYGON'
    UNION ALL
    SELECT jsonb_build_object('entityType',entity_type,'entityId',entity_id,'name',entity_name,
      'violationType','INVALID_SRID','details','Stored boundary SRID is not 4326.')
    FROM _topology_current WHERE boundary IS NOT NULL AND ST_SRID(boundary)<>4326
    UNION ALL
    SELECT jsonb_build_object('entityType',g.entity_type,'entityId',g.entity_id,'name',g.entity_name,
      'violationType','CONTAINMENT_BREACH','details','Boundary is not covered by a valid current parent-state polygon.')
    FROM _topology_current g LEFT JOIN public.state_versions sv ON sv.state_code=g.state_code AND sv.is_current
    WHERE g.boundary IS NOT NULL AND CASE
      WHEN NOT ST_IsValid(g.boundary) OR sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) THEN true
      ELSE NOT ST_CoveredBy(g.boundary,sv.boundary) END
    UNION ALL
    SELECT jsonb_build_object('entityType',a.entity_type,'entityId',a.entity_id,'name',a.entity_name,
      'violationType','OVERLAP','details','Positive-area overlap with '||b.entity_id||'.')
    FROM _topology_current a JOIN _topology_current b
      ON a.entity_type=b.entity_type AND a.state_code=b.state_code AND a.entity_id<b.entity_id
    WHERE a.boundary IS NOT NULL AND b.boundary IS NOT NULL AND CASE
      WHEN ST_IsValid(a.boundary) AND ST_IsValid(b.boundary) AND ST_Intersects(a.boundary,b.boundary)
        THEN ST_Area(ST_Intersection(a.boundary,b.boundary)::geography)>1.0 ELSE false END
    UNION ALL
    SELECT jsonb_build_object('entityType','STATE','entityId',a.state_code,'name',a.name,
      'violationType','OVERLAP','details','Positive-area overlap with state '||b.state_code||'.')
    FROM public.state_versions a JOIN public.state_versions b
      ON a.is_current AND b.is_current AND a.state_code<b.state_code
    WHERE a.boundary IS NOT NULL AND b.boundary IS NOT NULL AND CASE
      WHEN ST_IsValid(a.boundary) AND ST_IsValid(b.boundary) AND ST_Intersects(a.boundary,b.boundary)
        THEN ST_Area(ST_Intersection(a.boundary,b.boundary)::geography)>1.0 ELSE false END
    UNION ALL
    SELECT jsonb_build_object('entityType',entity_type,'entityId',entity_id,'name',entity_name,
      'violationType','SOURCE_PROVENANCE_MISSING','details','Source dataset is not verified as authoritative or geometry digest differs.')
    FROM _topology_current g LEFT JOIN public.dataset_versions dv ON dv.id=g.boundary_dataset_version_id
    LEFT JOIN public.datasets ds ON ds.id=dv.dataset_id LEFT JOIN public.data_sources src ON src.id=ds.source_id
    LEFT JOIN public.evidence_records ev ON ev.id=dv.verification_evidence_id AND ev.dataset_version_id=dv.id
      AND ev.artifact_sha256=dv.checksum_sha256
    WHERE g.boundary IS NOT NULL AND (g.boundary_source_feature_id IS NULL OR g.boundary_source_sha256 IS DISTINCT FROM dv.checksum_sha256
      OR g.boundary_geometry_sha256 IS DISTINCT FROM encode(digest(ST_AsEWKB(g.boundary),'sha256'),'hex')
      OR dv.default_status::TEXT NOT IN ('OFFICIAL','VERIFIED') OR src.authority_level::TEXT NOT IN ('constitutional','statutory')
      OR ev.id IS NULL OR ev.verification_authority='' OR ev.verified_by='')
    UNION ALL
    SELECT jsonb_build_object('entityType','STATE','entityId',sv.state_code,'name',sv.name,
      'violationType','MISSING_GEOMETRY','details','Current state version has no valid parent boundary geometry.')
    FROM public.state_versions sv WHERE sv.is_current
      AND (sv.boundary IS NULL OR NOT ST_IsValid(sv.boundary) OR ST_IsEmpty(sv.boundary)
        OR GeometryType(sv.boundary)<>'MULTIPOLYGON' OR ST_SRID(sv.boundary)<>4326
        OR CASE WHEN ST_IsValid(sv.boundary) THEN ST_Area(sv.boundary::geography)<100 ELSE true END)
    UNION ALL
    SELECT jsonb_build_object('entityType','STATE','entityId','CURRENT_STATE_VERSIONS','name','Current state geography',
      'violationType','COVERAGE_GAP','details','No current state versions exist, so parent-state coverage cannot be checked.')
    WHERE v_state_total=0
    UNION ALL
    SELECT jsonb_build_object('entityType','STATE','entityId',sv.state_code,'name',sv.name,
      'violationType','SOURCE_PROVENANCE_MISSING','details','State boundary source dataset, authority evidence, or geometry digest is invalid.')
    FROM public.state_versions sv
    LEFT JOIN public.dataset_versions dv ON dv.id=sv.boundary_dataset_version_id
    LEFT JOIN public.datasets ds ON ds.id=dv.dataset_id LEFT JOIN public.data_sources src ON src.id=ds.source_id
    LEFT JOIN public.evidence_records ev ON ev.id=dv.verification_evidence_id AND ev.dataset_version_id=dv.id
      AND ev.artifact_sha256=dv.checksum_sha256
    WHERE sv.is_current AND sv.boundary IS NOT NULL AND (
      sv.boundary_source_feature_id IS NULL OR sv.boundary_source_sha256 IS DISTINCT FROM dv.checksum_sha256
      OR sv.boundary_geometry_sha256 IS DISTINCT FROM encode(digest(ST_AsEWKB(sv.boundary),'sha256'),'hex')
      OR dv.default_status::TEXT NOT IN ('OFFICIAL','VERIFIED') OR src.authority_level::TEXT NOT IN ('constitutional','statutory')
      OR ev.id IS NULL OR ev.verification_authority='' OR ev.verified_by='')
    UNION ALL
    SELECT jsonb_build_object('entityType',g.entity_type,'entityId',g.state_code,'name',g.state_name,
      'violationType','COVERAGE_GAP','details',CASE WHEN g.gap_m2 IS NULL THEN 'Current state polygon is missing or invalid.'
        ELSE 'Canonical '||g.entity_type||' boundaries differ from the parent state by '||round(g.gap_m2::numeric,2)||' m².' END)
    FROM _topology_gaps g
  ) issues;

  v_report := jsonb_build_object(
    'auditId',v_audit_id,'timestamp',now(),'certified',v_certified,'failureLog',v_failures,
    'summary',jsonb_build_object(
      'totalAssemblyConstituencies',v_ac_total,'totalParliamentaryConstituencies',v_pc_total,'totalDistricts',v_district_total,
      'validGeometriesCount',v_valid,'invalidGeometriesCount',v_invalid,'sliverPolygonsCount',v_slivers,
      'crossBoundaryOverlapsCount',v_overlaps,'stateContainmentViolationsCount',v_containment,
      'srid4326CompliantCount',v_srid_compliant,
      'geometryTypeViolationsCount',v_type_violations,'invalidSridCount',v_invalid_srids,
      'assemblyBoundaryCoveragePercent',CASE WHEN v_ac_total=0 THEN 0 ELSE 100.0*v_ac_covered/v_ac_total END,
      'missingAssemblyBoundaries',v_ac_total-v_ac_covered,
      'pcBoundaryCoveragePercent',CASE WHEN v_pc_total=0 THEN 0 ELSE 100.0*v_pc_covered/v_pc_total END,
      'missingPcBoundaries',v_pc_total-v_pc_covered,
      'districtBoundaryCoveragePercent',CASE WHEN v_district_total=0 THEN 0 ELSE 100.0*v_district_covered/v_district_total END,
      'missingDistrictBoundaries',v_district_total-v_district_covered,
      'statePolygonsAvailable',v_state_total>0 AND v_state_covered=v_state_total,
      'checksComplete',v_checks_complete,'uncertifiedReasons',v_reasons,
      'sourceProvenanceViolationsCount',v_source_failures,'stateCoverageGapCount',v_gaps
    )
  );

  INSERT INTO public.spatial_topology_certification_ledger(
    id,total_ac_count,total_pc_count,invalid_geometries_count,sliver_polygons_count,
    cross_boundary_overlaps_count,containment_violations_count,is_certified_100_percent,audit_report
  ) VALUES (v_audit_id,v_ac_total,v_pc_total,v_invalid+v_type_violations+v_invalid_srids,
    v_slivers,v_overlaps,v_containment,v_certified,v_report);
  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_certify_current_geography_topology() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_certify_current_geography_topology() TO service_role;

COMMENT ON FUNCTION public.fn_load_current_geography_boundaries(TEXT,TEXT,TEXT,JSONB) IS
  'Atomically loads a complete entity-class boundary set only from an officially verified source dataset and validates identities, PostGIS topology, state containment, overlap, and partition coverage.';
