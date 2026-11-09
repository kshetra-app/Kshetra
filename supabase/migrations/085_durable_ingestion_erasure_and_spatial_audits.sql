-- Durable, fail-closed data ingestion, account erasure and PostGIS audits.
-- Production completion is only recorded after the underlying work commits.

ALTER TABLE public.states
  ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

CREATE TABLE IF NOT EXISTS public.data_ingestion_pipeline_snapshots (
  job_id UUID PRIMARY KEY REFERENCES public.data_ingestion_pipeline_jobs(job_id) ON DELETE CASCADE,
  raw_snapshot TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_ingestion_pipeline_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.data_ingestion_pipeline_jobs(job_id) ON DELETE CASCADE,
  record_index INTEGER NOT NULL CHECK (record_index >= 0),
  record_key TEXT NOT NULL,
  record_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, record_index),
  UNIQUE (job_id, record_key)
);

ALTER TABLE public.data_ingestion_pipeline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_ingestion_pipeline_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_ingestion_snapshots_service_role ON public.data_ingestion_pipeline_snapshots
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY data_ingestion_records_service_role ON public.data_ingestion_pipeline_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.fn_commit_data_ingestion_job(
  p_job JSONB,
  p_snapshot TEXT,
  p_records JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_job_id UUID := (p_job->>'jobId')::UUID;
  v_status TEXT := p_job->>'status';
  v_records JSONB := COALESCE(p_records, '[]'::JSONB);
  v_record JSONB;
  v_index INTEGER := 0;
BEGIN
  IF v_status NOT IN ('COMPLETED', 'FAILED') THEN
    RAISE EXCEPTION 'INVALID_JOB_STATUS';
  END IF;
  IF octet_length(COALESCE(p_snapshot, '')) > 5242880 THEN
    RAISE EXCEPTION 'SNAPSHOT_TOO_LARGE';
  END IF;
  IF v_status = 'COMPLETED' AND jsonb_array_length(v_records) <> (p_job->>'recordsCommitted')::INTEGER THEN
    RAISE EXCEPTION 'RECORD_COUNT_MISMATCH';
  END IF;

  INSERT INTO public.data_ingestion_pipeline_jobs (
    job_id, dataset_name, source_uri, snapshot_sha256, current_stage,
    total_records, records_normalized, records_validated, records_reconciled,
    records_committed, version_tag, status, error_message, created_at, completed_at
  ) VALUES (
    v_job_id, p_job->>'datasetName', p_job->>'sourceUri', p_job->>'snapshotSha256',
    p_job->>'currentStage', (p_job->>'totalRecords')::INTEGER,
    (p_job->>'recordsNormalized')::INTEGER, (p_job->>'recordsValidated')::INTEGER,
    (p_job->>'recordsReconciled')::INTEGER,
    CASE WHEN v_status = 'COMPLETED' THEN jsonb_array_length(v_records) ELSE 0 END,
    p_job->>'versionTag', v_status, p_job->>'errorMessage',
    (p_job->>'createdAt')::TIMESTAMPTZ, NULLIF(p_job->>'completedAt', '')::TIMESTAMPTZ
  );
  INSERT INTO public.data_ingestion_pipeline_snapshots(job_id, raw_snapshot, byte_length)
  VALUES (v_job_id, p_snapshot, octet_length(p_snapshot));

  IF v_status = 'COMPLETED' THEN
    FOR v_record IN SELECT value FROM jsonb_array_elements(v_records)
    LOOP
      INSERT INTO public.data_ingestion_pipeline_records(job_id, record_index, record_key, record_data)
      VALUES (v_job_id, v_index, v_record->>'recordKey', v_record->'recordData');
      v_index := v_index + 1;
    END LOOP;
  END IF;
  RETURN p_job;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_commit_data_ingestion_job(JSONB, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_commit_data_ingestion_job(JSONB, TEXT, JSONB) TO service_role;

CREATE TABLE IF NOT EXISTS public.data_principal_erasure_ledger (
  request_id UUID PRIMARY KEY,
  subject_sha256 TEXT NOT NULL CHECK (subject_sha256 ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  reason TEXT,
  certificate_id UUID UNIQUE,
  failure_code TEXT,
  validation_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.data_principal_erasure_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_principal_erasure_service_role ON public.data_principal_erasure_ledger
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.fn_validate_user_erasure(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  dependency RECORD;
  has_residual BOOLEAN;
  checked_count INTEGER := 0;
  residual_tables JSONB := '[]'::JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('validated', false, 'reason', 'AUTH_ACCOUNT_REMAINS', 'checkedDependencies', 0, 'remainingTables', jsonb_build_array('auth.users'));
  END IF;

  FOR dependency IN
    SELECT child_ns.nspname AS schema_name, child.relname AS table_name, child_col.attname AS column_name
    FROM pg_constraint fk
    JOIN pg_class child ON child.oid = fk.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_attribute child_col ON child_col.attrelid = child.oid AND child_col.attnum = fk.conkey[1]
    WHERE fk.contype = 'f'
      AND fk.confrelid = 'auth.users'::regclass
      AND fk.confdeltype = 'c'
      AND cardinality(fk.conkey) = 1
    ORDER BY child_ns.nspname, child.relname, child_col.attname
  LOOP
    checked_count := checked_count + 1;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I = $1)',
      dependency.schema_name, dependency.table_name, dependency.column_name)
      INTO has_residual USING p_user_id;
    IF has_residual THEN
      residual_tables := residual_tables || jsonb_build_array(dependency.schema_name || '.' || dependency.table_name);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'validated', jsonb_array_length(residual_tables) = 0,
    'checkedDependencies', checked_count,
    'remainingTables', residual_tables
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fn_validate_user_erasure(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_validate_user_erasure(UUID) TO service_role;

CREATE TABLE IF NOT EXISTS public.data_principal_rights_requests (
  request_id UUID PRIMARY KEY,
  subject_sha256 TEXT NOT NULL CHECK (subject_sha256 ~ '^[0-9a-f]{64}$'),
  right_type TEXT NOT NULL CHECK (right_type IN ('access', 'correction')),
  status TEXT NOT NULL CHECK (status IN ('PROCESSING', 'RECEIVED', 'COMPLETED', 'FAILED')),
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.data_principal_rights_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_principal_rights_service_role ON public.data_principal_rights_requests
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.data_principal_grievance_tickets (
  ticket_id TEXT PRIMARY KEY,
  subject_sha256 TEXT NOT NULL CHECK (subject_sha256 ~ '^[0-9a-f]{64}$'),
  dpo_name TEXT NOT NULL,
  dpo_email TEXT NOT NULL,
  grievance_subject TEXT NOT NULL,
  grievance_description TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'escalated_to_dpbi')),
  sla_days INTEGER NOT NULL CHECK (sla_days > 0),
  created_at TIMESTAMPTZ NOT NULL,
  resolution_due_by TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_data_principal_grievance_subject
  ON public.data_principal_grievance_tickets(subject_sha256, created_at DESC);
ALTER TABLE public.data_principal_grievance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_principal_grievance_service_role ON public.data_principal_grievance_tickets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.delimitation_revision_boundaries (
  revision_id UUID NOT NULL REFERENCES public.delimitation_source_revisions(revision_id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
  constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
  previous_area_km2 NUMERIC NOT NULL,
  proposed_area_km2 NUMERIC NOT NULL,
  centroid_shift_meters NUMERIC NOT NULL,
  PRIMARY KEY (revision_id, constituency_id)
);
CREATE INDEX IF NOT EXISTS idx_delimitation_revision_boundaries_geom
  ON public.delimitation_revision_boundaries USING GIST(boundary);
ALTER TABLE public.delimitation_revision_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY delimitation_revision_boundaries_service_role ON public.delimitation_revision_boundaries
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.fn_commit_delimitation_revision(
  p_revision JSONB,
  p_boundaries JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_state TEXT := p_revision->>'stateCode';
  v_revision_id UUID := (p_revision->>'revisionId')::UUID;
  v_expected INTEGER;
  v_canonical_count INTEGER;
  v_missing_geometry INTEGER;
  v_union GEOMETRY;
  v_state_geom GEOMETRY;
  v_overlap_count INTEGER;
  v_symmetric_difference_m2 DOUBLE PRECISION;
  v_count INTEGER;
  v_canonical_versions TEXT[];
  v_report JSONB;
BEGIN
  IF jsonb_typeof(p_boundaries) <> 'array' OR jsonb_array_length(p_boundaries) = 0 THEN
    RAISE EXCEPTION 'BOUNDARIES_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.states WHERE code = v_state) THEN
    RAISE EXCEPTION 'UNKNOWN_STATE';
  END IF;

  SELECT count(*)::INTEGER,
         count(*) FILTER (WHERE cv.boundary IS NOT NULL)::INTEGER,
         count(*) FILTER (WHERE cv.boundary IS NULL)::INTEGER
    INTO v_canonical_count, v_expected, v_missing_geometry
  FROM public.constituencies c
  JOIN public.constituency_versions cv
    ON cv.constituency_internal_id = c.internal_id AND cv.is_current = true
  WHERE c.state_code = v_state;
  IF v_canonical_count = 0 THEN RAISE EXCEPTION 'CANONICAL_BOUNDARIES_NOT_FOUND'; END IF;
  IF v_missing_geometry > 0 THEN RAISE EXCEPTION 'CANONICAL_BOUNDARY_COVERAGE_INCOMPLETE'; END IF;
  SELECT boundary INTO v_state_geom FROM public.state_versions WHERE state_code = v_state AND is_current = true;
  IF v_state_geom IS NULL OR NOT ST_IsValid(v_state_geom) THEN RAISE EXCEPTION 'CANONICAL_STATE_BOUNDARY_NOT_FOUND_OR_INVALID'; END IF;
  SELECT array_agg(DISTINCT cv.version_code ORDER BY cv.version_code) INTO v_canonical_versions
  FROM public.constituencies c
  JOIN public.constituency_versions cv ON cv.constituency_internal_id = c.internal_id AND cv.is_current = true
  WHERE c.state_code = v_state;

  CREATE TEMP TABLE _delim_input ON COMMIT DROP AS
    SELECT item->>'constituencyId' AS supplied_id, item->'geojsonGeometry' AS geojson
    FROM jsonb_array_elements(p_boundaries) AS item;
  SELECT count(*)::INTEGER INTO v_count FROM _delim_input;
  IF v_count <> v_canonical_count THEN RAISE EXCEPTION 'BOUNDARY_SET_INCOMPLETE'; END IF;
  IF (SELECT count(DISTINCT supplied_id) FROM _delim_input) <> v_count THEN
    RAISE EXCEPTION 'DUPLICATE_CONSTITUENCY_ID';
  END IF;
  IF EXISTS (SELECT 1 FROM _delim_input WHERE supplied_id IS NULL OR geojson IS NULL OR jsonb_typeof(geojson) <> 'object') THEN
    RAISE EXCEPTION 'INVALID_BOUNDARY_INPUT';
  END IF;

  CREATE TEMP TABLE _delim_resolved ON COMMIT DROP AS
    SELECT i.supplied_id, c.id AS constituency_id, cv.id AS constituency_version_id, cv.name AS constituency_name,
           cv.boundary AS old_geom,
           ST_Multi(ST_GeomFromGeoJSON(i.geojson::TEXT))::geometry(MultiPolygon, 4326) AS new_geom
    FROM _delim_input i
    JOIN public.constituencies c
      ON i.supplied_id IN (c.id, c.canonical_code, c.eci_ac_code)
     AND c.state_code = v_state
    JOIN public.constituency_versions cv
      ON cv.constituency_internal_id = c.internal_id AND cv.is_current = true
     AND i.supplied_id IN (cv.canonical_code, c.id, c.canonical_code, c.eci_ac_code);

  SELECT count(*)::INTEGER INTO v_count FROM _delim_resolved;
  IF v_count <> v_canonical_count OR (SELECT count(DISTINCT constituency_id) FROM _delim_resolved) <> v_count THEN
    RAISE EXCEPTION 'UNKNOWN_OR_AMBIGUOUS_CONSTITUENCY_ID';
  END IF;
  IF EXISTS (SELECT 1 FROM _delim_resolved WHERE ST_SRID(new_geom) <> 4326 OR NOT ST_IsValid(new_geom) OR ST_Area(new_geom::geography) < 100.0) THEN
    RAISE EXCEPTION 'INVALID_OR_SLIVER_GEOMETRY';
  END IF;

  SELECT ST_UnaryUnion(ST_Collect(cv.boundary)) INTO v_union
  FROM public.constituencies c
  JOIN public.constituency_versions cv ON cv.constituency_internal_id = c.internal_id AND cv.is_current = true
  WHERE c.state_code = v_state;
  IF EXISTS (SELECT 1 FROM _delim_resolved WHERE NOT ST_CoveredBy(new_geom, v_state_geom)) THEN
    RAISE EXCEPTION 'STATE_CONTAINMENT_BREACH';
  END IF;
  SELECT count(*)::INTEGER INTO v_overlap_count
  FROM _delim_resolved a JOIN _delim_resolved b ON a.constituency_id < b.constituency_id
  WHERE ST_Intersects(a.new_geom, b.new_geom)
    AND ST_Area(ST_Intersection(a.new_geom, b.new_geom)::geography) > 1.0;
  IF v_overlap_count > 0 THEN RAISE EXCEPTION 'BOUNDARIES_OVERLAP'; END IF;
  SELECT ST_Area(ST_SymDifference(v_union, ST_UnaryUnion(ST_Collect(new_geom)))::geography)
    INTO v_symmetric_difference_m2 FROM _delim_resolved;
  IF v_symmetric_difference_m2 > 1.0 THEN RAISE EXCEPTION 'STATE_COVERAGE_CHANGED'; END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'constituencyId', constituency_id,
    'constituencyName', constituency_name,
    'previousAreaKm2', ST_Area(old_geom::geography) / 1000000.0,
    'newAreaKm2', ST_Area(new_geom::geography) / 1000000.0,
    'areaDeltaKm2', (ST_Area(new_geom::geography) - ST_Area(old_geom::geography)) / 1000000.0,
    'percentAreaChange', CASE WHEN ST_Area(old_geom::geography) = 0 THEN 0
      ELSE ((ST_Area(new_geom::geography) - ST_Area(old_geom::geography)) / ST_Area(old_geom::geography)) * 100 END,
    'centroidShiftMeters', ST_Distance(ST_Centroid(old_geom)::geography, ST_Centroid(new_geom)::geography),
    'voterReassignmentEstimate', NULL
  ) ORDER BY constituency_id) INTO v_report
  FROM _delim_resolved;

  INSERT INTO public.delimitation_source_revisions (
    revision_id, order_number, gazette_date, state_code, constituency_count,
    total_area_delta_km2, centroid_shift_meters_max, voter_shift_estimate,
    topology_valid, impact_summary, created_at
  )
  SELECT v_revision_id, p_revision->>'orderNumber', (p_revision->>'gazetteDate')::DATE, v_state,
         v_canonical_count,
         COALESCE(sum(abs(ST_Area(new_geom::geography) - ST_Area(old_geom::geography))) / 1000000.0, 0),
         COALESCE(max(ST_Distance(ST_Centroid(old_geom)::geography, ST_Centroid(new_geom)::geography)), 0),
         0, true, '{}'::JSONB, now()
  FROM _delim_resolved;
  INSERT INTO public.delimitation_revision_boundaries (
    revision_id, constituency_id, constituency_version_id, boundary, previous_area_km2, proposed_area_km2, centroid_shift_meters
  )
  SELECT v_revision_id, constituency_id, constituency_version_id, new_geom,
         ST_Area(old_geom::geography) / 1000000.0,
         ST_Area(new_geom::geography) / 1000000.0,
         ST_Distance(ST_Centroid(old_geom)::geography, ST_Centroid(new_geom)::geography)
  FROM _delim_resolved;

  SELECT jsonb_build_object(
    'revisionId', v_revision_id,
    'orderNumber', p_revision->>'orderNumber',
    'gazetteDate', p_revision->>'gazetteDate',
    'stateCode', v_state,
    'canonicalVersionCodes', to_jsonb(v_canonical_versions),
    'constituencyCount', v_canonical_count,
    'totalAreaDeltaKm2', COALESCE(sum(abs(ST_Area(new_geom::geography) - ST_Area(old_geom::geography))) / 1000000.0, 0),
    'centroidShiftMetersMax', COALESCE(max(ST_Distance(ST_Centroid(old_geom)::geography, ST_Centroid(new_geom)::geography)), 0),
    'voterShiftEstimate', NULL,
    'topologyValid', true,
    'topologyAudit', jsonb_build_object('isValid', true, 'selfIntersectionsCount', 0, 'overlapsCount', 0,
      'sliversCount', 0, 'isContainedInParentState', true, 'issues', jsonb_build_array()),
    'boundaryDeltas', v_report,
    'generatedAt', now()
  ) INTO v_report FROM _delim_resolved;

  UPDATE public.delimitation_source_revisions SET impact_summary = v_report WHERE revision_id = v_revision_id;
  RETURN v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_commit_delimitation_revision(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_commit_delimitation_revision(JSONB, JSONB) TO service_role;

-- Nationwide topology certification is installed with its version-bound model in migration 086.
CREATE OR REPLACE FUNCTION public.fn_inspect_spatial_scope(p_query JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_ids TEXT[];
  v_box DOUBLE PRECISION[];
  v_pass BOOLEAN := false;
BEGIN
  IF p_query->>'scopeType' = 'STATE' THEN
    SELECT count(*)::INTEGER, count(*) FILTER (WHERE cv.boundary IS NOT NULL AND ST_IsValid(cv.boundary)
      AND ST_SRID(cv.boundary)=4326 AND GeometryType(cv.boundary)='MULTIPOLYGON')::INTEGER
      INTO v_total, v_count
    FROM public.constituencies c JOIN public.constituency_versions cv
      ON cv.constituency_internal_id = c.internal_id AND cv.is_current = true
    WHERE c.state_code = p_query->>'stateCode';
    v_pass := v_total > 0 AND v_count = v_total;
  ELSIF p_query->>'scopeType' = 'BOUNDING_BOX' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_query->'boundingBox')::DOUBLE PRECISION) INTO v_box;
    IF array_length(v_box, 1) <> 4 OR v_box[1] >= v_box[3] OR v_box[2] >= v_box[4] THEN RAISE EXCEPTION 'INVALID_BOUNDING_BOX'; END IF;
    SELECT count(*)::INTEGER, count(*) FILTER (WHERE ST_IsValid(cv.boundary)
      AND ST_SRID(cv.boundary)=4326 AND GeometryType(cv.boundary)='MULTIPOLYGON')::INTEGER
      INTO v_count, v_total FROM public.constituencies c
    JOIN public.constituency_versions cv ON cv.constituency_internal_id=c.internal_id AND cv.is_current
    WHERE cv.boundary && ST_MakeEnvelope(v_box[1], v_box[2], v_box[3], v_box[4], 4326)
      AND ST_Intersects(cv.boundary, ST_MakeEnvelope(v_box[1], v_box[2], v_box[3], v_box[4], 4326));
    v_pass := v_count > 0 AND v_count = v_total;
  ELSIF p_query->>'scopeType' = 'CONSTITUENCY_PAIR' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_query->'constituencyIds')) INTO v_ids;
    IF array_length(v_ids, 1) <> 2 THEN RAISE EXCEPTION 'TWO_CONSTITUENCY_IDS_REQUIRED'; END IF;
    SELECT count(*)::INTEGER INTO v_count FROM public.constituencies c
    JOIN public.constituency_versions cv ON cv.constituency_internal_id=c.internal_id AND cv.is_current
    WHERE c.id = ANY(v_ids) AND cv.boundary IS NOT NULL;
    IF v_count = 2 THEN
      SELECT CASE WHEN ST_IsValid(av.boundary) AND ST_IsValid(bv.boundary) THEN
        CASE WHEN ST_Area(ST_Intersection(av.boundary, bv.boundary)::geography) <= 1.0 THEN 2 ELSE 0 END
        ELSE 0 END
      INTO v_count FROM public.constituencies a
      JOIN public.constituency_versions av ON av.constituency_internal_id=a.internal_id AND av.is_current
      JOIN public.constituencies b ON b.id=v_ids[2]
      JOIN public.constituency_versions bv ON bv.constituency_internal_id=b.internal_id AND bv.is_current
      WHERE a.id = v_ids[1];
    END IF;
    v_pass := v_count = 2;
  ELSE
    RAISE EXCEPTION 'INVALID_SPATIAL_SCOPE';
  END IF;
  RETURN jsonb_build_object('inspectedScope', p_query, 'pass', v_pass, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_inspect_spatial_scope(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_inspect_spatial_scope(JSONB) TO service_role;

COMMENT ON FUNCTION public.fn_commit_data_ingestion_job(JSONB, TEXT, JSONB) IS 'Atomically persists raw source snapshot and normalized staging rows before returning a completed ingestion job.';
COMMENT ON FUNCTION public.fn_commit_delimitation_revision(JSONB, JSONB) IS 'Validates proposed AC boundaries against the current canonical PostGIS boundaries and persists only a complete, non-overlapping state partition.';
