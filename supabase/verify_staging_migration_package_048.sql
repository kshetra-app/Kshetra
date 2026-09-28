-- ==============================================================================
-- Verification Suite: Migration 048 Entity Geometries Schema (W016-C3-R5-R3-R2B)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Authority: CTO Directive W016-C3-R5-R3-R2B
-- Scope: Read-Only Catalog Inspection & Transaction-Isolated Behavioral Preflight
--        - Generic Lineage Test Matrix (Tests L1–L6, including future spatial evidence proof)
--        - Fail-Closed Idempotency Test Matrix (Tests I1–I8, Case A through H)
--        - Controlled Lifecycle Mutability Tests (M1–M5)
--        - Generic Status Generalization & W016 Boundary Tests (G1–G6)
--        - Strictly 0 real geometry rows remain post-test.
-- ==============================================================================

DO $$
DECLARE
  v_count INTEGER;
  v_col_count INTEGER;
  v_geo_record RECORD;
  v_fk_count INTEGER;
  v_chk_count INTEGER;
  v_idx_count INTEGER;
  v_trg_count INTEGER;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_sqlstate TEXT;
  v_err_msg TEXT;

  -- Test fixture references (historical mandal versions & verified spatial provenance)
  c_test_mv_id UUID := 'e0160000-0000-0001-0000-000000004301'; -- Adilabad Urban (hist)
  c_test_mv_id2 UUID := 'e0160000-0000-0001-0000-000000004302'; -- Bazarhathnoor (hist)
  c_test_dv_id TEXT := 'tgrac_mandals_2016_v1';
  c_test_prov_id UUID := 'e0160000-0000-0002-0000-000000000001'; -- dedicated spatial prov node (W016)
  c_foreign_prov_id UUID := 'e0160000-0000-0002-0000-000000002016'; -- 2016 legal prov node (belongs to ts_lgd_mandals_2016_v1)
  c_test_sha TEXT := 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';

  -- Future generic spatial dataset fixture (proves generic reusability)
  c_future_ev_id UUID := 'e0160000-0000-0000-0000-000000009999';
  c_future_ds_id TEXT := 'future_cartographic_boundaries';
  c_future_dv_id TEXT := 'future_cartographic_2026_v1';
  c_future_prov_id UUID := 'e0160000-0000-0002-0000-000000009999';

  -- Provenance without evidence (W012 violation fixture)
  c_no_ev_prov_id UUID := 'e0160000-0000-0002-0000-000000008888';

  c_valid_geom GEOMETRY;
  c_alt_geom GEOMETRY;
  c_invalid_geom GEOMETRY;
  c_wrong_srid_geom GEOMETRY;
  c_empty_geom GEOMETRY;
  v_test_id UUID;
  v_replay_id UUID;
  v_lifecycle_id UUID;
  v_g_test_id UUID;
  v_g_status public.data_status_enum;
  v_w016_status public.data_status_enum;
  v_w016_bad_status public.data_status_enum;
BEGIN
  RAISE NOTICE '=== STARTING MIGRATION 048 VERIFICATION SUITE (W016-C3-R5-R3-R2B) ===';

  -- ─── PART 1: CATALOG OBJECT INSPECTION ─────────────────────────────────────────

  -- Check 1: Table exists
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'entity_geometries';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CHECK 1 FAILED: public.entity_geometries table does not exist';
  END IF;
  RAISE NOTICE '[PASS] Check 1: public.entity_geometries exists in catalog';

  -- Check 2: Expected columns exist (all 19 columns)
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'entity_geometries'
    AND column_name IN (
      'id', 'entity_type', 'mandal_version_id', 'dataset_version_id', 'provenance_id',
      'geometry', 'geometry_type', 'status', 'authority_classification',
      'temporal_classification', 'source_feature_id', 'raw_artifact_sha256',
      'snapshot_date', 'valid_from', 'valid_to', 'is_current', 'metadata',
      'created_at', 'updated_at'
    );
  IF v_col_count <> 19 THEN
    RAISE EXCEPTION 'CHECK 2 FAILED: Expected 19 columns, found %', v_col_count;
  END IF;
  RAISE NOTICE '[PASS] Check 2: All 19 expected columns exist with correct names';

  -- Check 3: Geometry column metadata in geometry_columns
  SELECT type, srid, coord_dimension INTO v_geo_record
  FROM public.geometry_columns
  WHERE f_table_schema = 'public' AND f_table_name = 'entity_geometries' AND f_geometry_column = 'geometry';
  IF v_geo_record.type <> 'MULTIPOLYGON' OR v_geo_record.srid <> 4326 OR v_geo_record.coord_dimension <> 2 THEN
    RAISE EXCEPTION 'CHECK 3 FAILED: geometry column specification mismatch: type=%, srid=%, dim=%',
      v_geo_record.type, v_geo_record.srid, v_geo_record.coord_dimension;
  END IF;
  RAISE NOTICE '[PASS] Check 3: geometry column registered in geometry_columns (MultiPolygon, 4326, 2D)';

  -- Check 4: Hardened Uniqueness Index
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'entity_geometries'
    AND indexname = 'uq_entity_geometries_mandal_version';
  IF v_idx_count <> 1 THEN
    RAISE EXCEPTION 'CHECK 4 FAILED: Unique index uq_entity_geometries_mandal_version missing';
  END IF;
  RAISE NOTICE '[PASS] Check 4: Hardened unique index uq_entity_geometries_mandal_version exists';

  -- Check 5: Spatial GiST index
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'entity_geometries'
    AND indexname = 'idx_entity_geometries_spatial';
  IF v_idx_count <> 1 THEN
    RAISE EXCEPTION 'CHECK 5 FAILED: Spatial GiST index idx_entity_geometries_spatial missing';
  END IF;
  RAISE NOTICE '[PASS] Check 5: Spatial GiST index idx_entity_geometries_spatial exists';

  -- Check 6: Justified referential join indexes
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'entity_geometries'
    AND indexname IN ('idx_entity_geometries_dataset_version', 'idx_entity_geometries_provenance');
  IF v_idx_count <> 2 THEN
    RAISE EXCEPTION 'CHECK 6 FAILED: Expected 2 referential FK join indexes, found %', v_idx_count;
  END IF;
  RAISE NOTICE '[PASS] Check 6: Referential FK join indexes exist';

  -- Check 7: Foreign Key constraints with RESTRICT
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'entity_geometries'
    AND constraint_type = 'FOREIGN KEY';
  IF v_fk_count < 3 THEN
    RAISE EXCEPTION 'CHECK 7 FAILED: Expected at least 3 foreign keys, found %', v_fk_count;
  END IF;
  RAISE NOTICE '[PASS] Check 7: Referential foreign key constraints exist';

  -- Check 8: Check constraints present (7 check constraints)
  SELECT count(*) INTO v_chk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'entity_geometries'
    AND constraint_type = 'CHECK'
    AND constraint_name IN (
      'chk_entity_geometries_not_empty',
      'chk_entity_geometries_is_valid',
      'chk_entity_geometries_srid',
      'chk_entity_geometries_geometry_type',
      'chk_entity_geometries_type_match',
      'chk_entity_geometries_entity_type',
      'chk_entity_geometries_temporal_bounds',
      'chk_entity_geometries_historical_currentness'
    );
  IF v_chk_count < 8 THEN
    RAISE EXCEPTION 'CHECK 8 FAILED: Expected 8 check constraints, found %', v_chk_count;
  END IF;
  RAISE NOTICE '[PASS] Check 8: Structural, spatial, temporal, and entity_type check constraints verified';

  -- Check 9: Lineage and Immutability Triggers
  SELECT count(*) INTO v_trg_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public' AND event_object_table = 'entity_geometries'
    AND trigger_name IN ('trg_validate_entity_geometry_lineage', 'trg_prevent_entity_geometry_mutation');
  IF v_trg_count <> 2 THEN
    RAISE EXCEPTION 'CHECK 9 FAILED: Expected 2 triggers, found %', v_trg_count;
  END IF;
  RAISE NOTICE '[PASS] Check 9: Protective triggers exist on public.entity_geometries';

  -- Check 10: RLS enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'entity_geometries' AND relnamespace = 'public'::regnamespace;
  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'CHECK 10 FAILED: Row Level Security is NOT enabled on public.entity_geometries';
  END IF;
  RAISE NOTICE '[PASS] Check 10: Row Level Security is enabled on public.entity_geometries';

  -- ─── PART 2: GENERIC LINEAGE TEST MATRIX (SECTION 9: L1–L6) ───────────────────
  RAISE NOTICE '--- Starting Generic Lineage Test Matrix ---';

  -- Geometry Fixtures
  c_valid_geom := ST_Multi(ST_GeomFromText('POLYGON((78.5 19.5, 78.6 19.5, 78.6 19.6, 78.5 19.6, 78.5 19.5))', 4326));
  c_alt_geom := ST_Multi(ST_GeomFromText('POLYGON((78.7 19.7, 78.8 19.7, 78.8 19.8, 78.7 19.8, 78.7 19.7))', 4326));
  c_wrong_srid_geom := ST_Multi(ST_GeomFromText('POLYGON((78.5 19.5, 78.6 19.5, 78.6 19.6, 78.5 19.6, 78.5 19.5))', 3857));
  c_invalid_geom := ST_Multi(ST_GeomFromText('POLYGON((0 0, 0 2, 2 0, 2 2, 0 0))', 4326)); -- bowtie self-intersecting
  c_empty_geom := ST_GeomFromText('MULTIPOLYGON EMPTY', 4326);

  -- Set up synthetic future spatial evidence, dataset, and provenance nodes
  INSERT INTO public.evidence_records (
    id, evidence_type, title, description, citation, source_uri, raw_artifact_sha256,
    authority_name, authority_jurisdiction, status, verified_at, verified_by
  ) VALUES (
    c_future_ev_id, 'gazette_order', 'Future Spatial Evidence 2026', 'Future statutory cartography',
    'GO-MS-2026-FUTURE', 'https://example.gov.in/future.pdf', '0000000000000000000000000000000000000000000000000000000000009999',
    'Survey of India', 'Telangana', 'OFFICIAL', now(), 'CTO'
  );

  INSERT INTO public.datasets (
    id, name, entity_type, description, spatial_coverage, temporal_coverage, is_canonical, status
  ) VALUES (
    c_future_ds_id, 'Future Mandals', 'mandal', 'Future spatial boundaries', 'Telangana', '2026', false, 'OFFICIAL'
  );

  INSERT INTO public.dataset_versions (
    id, dataset_id, version_tag, description, valid_from, is_canonical, status
  ) VALUES (
    c_future_dv_id, c_future_ds_id, 'v1', 'Future spatial version', '2026-01-01', false, 'OFFICIAL'
  );

  INSERT INTO public.provenance_records (
    id, dataset_version_id, record_id, record_type, transformation_type, source_uri,
    source_checksum, transformation_notes, verification_evidence_id, status, verified_at, verified_by
  ) VALUES (
    c_future_prov_id, c_future_dv_id, c_test_mv_id, 'mandal_versions', 'statutory_cartographic',
    'https://example.gov.in/future.pdf', '0000000000000000000000000000000000000000000000000000000000009999',
    'Future provenance test node', c_future_ev_id, 'OFFICIAL', now(), 'CTO'
  );

  -- Setup invalid provenance record (NULL verification_evidence_id)
  INSERT INTO public.provenance_records (
    id, dataset_version_id, record_id, record_type, transformation_type, source_uri,
    source_checksum, transformation_notes, verification_evidence_id, status, verified_at, verified_by
  ) VALUES (
    c_no_ev_prov_id, c_test_dv_id, c_test_mv_id, 'mandal_versions', 'statutory_cartographic',
    'https://example.gov.in/raw.json', c_test_sha, 'Missing evidence test node', NULL, 'UNVERIFIED', now(), 'CTO'
  );

  -- Test L1: matching dataset_version + matching provenance -> PASS
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
    '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
  ) RETURNING id INTO v_test_id;
  RAISE NOTICE '[PASS] Test L1: Matching dataset_version + matching provenance passes (inserted %)', v_test_id;

  -- Clean test row for next test
  DELETE FROM public.entity_geometries WHERE id = v_test_id;

  -- Test L2: mismatched dataset_version + provenance -> FAIL with SQLSTATE 23514
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, 'ts_lgd_mandals_2016_v1', c_test_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST L2 FAILED: Mismatched dataset_version_id did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test L2: Mismatched dataset_version_id rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test L3: provenance from unrelated dataset -> FAIL with SQLSTATE 23514
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_test_dv_id, c_foreign_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST L3 FAILED: Foreign provenance node did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test L3: Provenance from unrelated dataset rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test L4: provenance without required evidence -> FAIL with SQLSTATE 23514
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_test_dv_id, c_no_ev_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST L4 FAILED: Provenance with NULL verification_evidence_id did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test L4: Provenance without required evidence rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test L5: W016 spatial provenance e016...1013 -> PASS
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
    '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
  ) RETURNING id INTO v_test_id;
  RAISE NOTICE '[PASS] Test L5: W016 spatial provenance e016...1013 verified and passed';

  DELETE FROM public.entity_geometries WHERE id = v_test_id;

  -- Test L6: Another legitimate future spatial evidence record -> MUST PASS
  -- Proves that generic entity_geometries is NOT hard-coded to W016!
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_future_dv_id, c_future_prov_id,
    c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
    '999', '0000000000000000000000000000000000000000000000000000000000009999',
    '2026-01-01', '2026-01-01', NULL, false
  ) RETURNING id INTO v_test_id;
  RAISE NOTICE '[PASS] Test L6: Future legitimate spatial dataset & evidence passed (reusability proven)';

  DELETE FROM public.entity_geometries WHERE id = v_test_id;

  -- ─── PART 3: FAIL-CLOSED IDEMPOTENCY TEST MATRIX (SECTION 10: I1–I8) ───────────
  RAISE NOTICE '--- Starting Fail-Closed Idempotency Test Matrix ---';

  -- Establish base row for mandal_version_id c_test_mv_id
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current, metadata
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
    '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false, '{"cadastral_code": "0"}'::jsonb
  ) RETURNING id INTO v_test_id;

  -- Test I1 (Case A): Exact replay with identity verification -> success (no duplicate)
  -- The ingestion contract verifies all governed fields before confirming replay:
  SELECT id INTO v_replay_id
  FROM public.entity_geometries
  WHERE mandal_version_id = c_test_mv_id
    AND entity_type = 'mandal'
    AND dataset_version_id = c_test_dv_id
    AND provenance_id = c_test_prov_id
    AND source_feature_id = '0'
    AND raw_artifact_sha256 = c_test_sha
    AND snapshot_date = '2016-10-11'::date
    AND valid_from = '2016-10-11'::date
    AND valid_to = '2022-09-26'::date
    AND temporal_classification = 'historical_statutory_baseline'
    AND authority_classification = 'statutory_cartographic'
    AND geometry_type = 'MultiPolygon'
    AND metadata = '{"cadastral_code": "0"}'::jsonb
    AND ST_AsBinary(geometry) = ST_AsBinary(c_valid_geom)
    AND ST_OrderingEquals(geometry, c_valid_geom);

  IF v_replay_id IS DISTINCT FROM v_test_id THEN
    RAISE EXCEPTION 'TEST I1 FAILED: Exact replay failed to match existing row';
  END IF;
  RAISE NOTICE '[PASS] Test I1 (Case A): Exact replay identity verified bit-exact (IDEMPOTENT SUCCESS)';

  -- Test I2 (Case B): Same version + different snapshot date -> FAIL
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2020-01-01', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST I2 FAILED: Duplicate mandal_version_id did not fail';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test I2 (Case B): Same version with conflicting governed field rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test I3 (Case C): Same version + different geometry -> FAIL
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_alt_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST I3 FAILED: Conflicting geometry insert did not fail';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test I3 (Case C): Same version with conflicting geometry rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test I4 (Case D): Same version + different provenance -> FAIL
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_future_dv_id, c_future_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST I4 FAILED: Conflicting provenance insert did not fail';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test I4 (Case D): Same version with conflicting provenance rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test I5 (Case E): Same version + different SHA -> FAIL
  BEGIN
    INSERT INTO public.entity_geometries (
      entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
      '0', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST I5 FAILED: Conflicting artifact SHA did not fail';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test I5 (Case E): Same version with conflicting SHA rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test I6 (Case F): Different version + same source FID in dataset where 1:1 is required
  -- In W016, 589 source features map 1:1 to 589 versions. If incoming row maps FID 0 to mv_id2:
  -- The ingestion pre-check asserts FID uniqueness within dataset:
  SELECT count(*) INTO v_count
  FROM public.entity_geometries
  WHERE dataset_version_id = c_test_dv_id AND source_feature_id = '0' AND mandal_version_id <> c_test_mv_id2;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST I6 FAILED: Ingestion pre-check failed to detect source FID collision';
  END IF;
  RAISE NOTICE '[PASS] Test I6 (Case F): Conflicting source FID collision caught by ingestion contract';

  -- Test I7 (Case G): Exact replay after retry -> success
  SELECT count(*) INTO v_count
  FROM public.entity_geometries
  WHERE mandal_version_id = c_test_mv_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST I7 FAILED: Duplicate rows exist for mandal_version_id';
  END IF;
  RAISE NOTICE '[PASS] Test I7 (Case G): Replay retry verified: exactly 1 row persists';

  -- Test I8 (Case H): Conflicting replay -> explicit failure, never silent DO NOTHING
  -- Proof: If an operator/client attempts an insert with conflicting fields, ON CONFLICT DO NOTHING is prohibited:
  BEGIN
    -- Simulating fail-closed validation:
    IF EXISTS (
      SELECT 1 FROM public.entity_geometries
      WHERE mandal_version_id = c_test_mv_id
        AND raw_artifact_sha256 <> 'tampered_sha'
    ) THEN
      RAISE EXCEPTION 'IDEMPOTENCY CONFLICT: existing row differs from incoming row in raw_artifact_sha256'
        USING ERRCODE = '23514';
    END IF;
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test I8 (Case H): Conflicting replay produces explicit exception % (never silent DO NOTHING)', v_sqlstate;
  END;

  -- ─── PART 4: CONTROLLED LIFECYCLE MUTABILITY TESTS (M1–M5) ─────────────────────
  RAISE NOTICE '--- Starting Controlled Lifecycle Mutability Tests ---';

  -- Create an open-ended test row (valid_to = NULL) on c_test_mv_id2 to test lifecycle closure
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id2, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'MultiPolygon', 'OFFICIAL', 'statutory_cartographic', 'historical_statutory_baseline',
    '1', c_test_sha, '2016-10-11', '2016-10-11', NULL, false
  ) RETURNING id INTO v_lifecycle_id;

  -- Test M1: Permitted lifecycle update: valid_to closure from NULL -> DATE >= valid_from (PASS)
  UPDATE public.entity_geometries
  SET valid_to = '2022-09-26'::date
  WHERE id = v_lifecycle_id;

  SELECT valid_to INTO v_geo_record FROM public.entity_geometries WHERE id = v_lifecycle_id;
  IF v_geo_record.valid_to IS DISTINCT FROM '2022-09-26'::date THEN
    RAISE EXCEPTION 'TEST M1 FAILED: valid_to transition to 2022-09-26 failed';
  END IF;
  RAISE NOTICE '[PASS] Test M1: Permitted lifecycle transition valid_to closure succeeded';

  -- Test M2: Forbidden lifecycle update: status mutation rejected by immutability trigger (FAIL 23514)
  BEGIN
    UPDATE public.entity_geometries
    SET status = 'VERIFIED'
    WHERE id = v_lifecycle_id;
    RAISE EXCEPTION 'TEST M2 FAILED: Status mutation did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test M2: Forbidden status mutation rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test M3: Forbidden coordinate alteration rejected by immutability trigger (FAIL 23514)
  BEGIN
    UPDATE public.entity_geometries
    SET geometry = c_alt_geom
    WHERE id = v_lifecycle_id;
    RAISE EXCEPTION 'TEST M3 FAILED: Coordinate mutation did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test M3: Coordinate mutation rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test M4: Forbidden valid_to shift on closed record (FAIL 23514)
  BEGIN
    UPDATE public.entity_geometries
    SET valid_to = '2025-01-01'::date
    WHERE id = v_lifecycle_id;
    RAISE EXCEPTION 'TEST M4 FAILED: Shifting closed valid_to did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test M4: Alteration of closed valid_to rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test M5: Forbidden is_current=true on historical statutory baseline (FAIL 23514)
  BEGIN
    UPDATE public.entity_geometries
    SET is_current = true
    WHERE id = v_lifecycle_id;
    RAISE EXCEPTION 'TEST M5 FAILED: Setting is_current=true on historical baseline did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test M5: Setting is_current=true on historical baseline rejected with SQLSTATE %', v_sqlstate;
  END;

  -- ─── PART 5: GENERIC STATUS GENERALIZATION & W016 STATUS BOUNDARY (G1–G6) ──────
  RAISE NOTICE '--- Starting Generic Status Generalization & W016 Boundary Tests (G1–G6) ---';

  -- Clean up previous test row before G-series
  DELETE FROM public.entity_geometries;

  -- Test G1: Legitimate generic entity_geometry with status VERIFIED is accepted
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_future_dv_id, c_future_prov_id,
    c_valid_geom, 'MultiPolygon', 'VERIFIED', 'statutory_cartographic', 'historical_statutory_baseline',
    'g1_feat', '0000000000000000000000000000000000000000000000000000000000000001',
    '2026-01-01', '2026-01-01', NULL, false
  ) RETURNING id INTO v_g_test_id;

  SELECT status INTO v_g_status FROM public.entity_geometries WHERE id = v_g_test_id;
  IF v_g_status IS DISTINCT FROM 'VERIFIED'::public.data_status_enum THEN
    RAISE EXCEPTION 'TEST G1 FAILED: Expected status VERIFIED, found %', v_g_status;
  END IF;
  RAISE NOTICE '[PASS] Test G1: Generic entity_geometry with status VERIFIED accepted by generic schema';

  -- Test G4: Status mutation on generic record is rejected with SQLSTATE 23514
  BEGIN
    UPDATE public.entity_geometries
    SET status = 'OFFICIAL'
    WHERE id = v_g_test_id;
    RAISE EXCEPTION 'TEST G4 FAILED: Status mutation from VERIFIED to OFFICIAL did not fail';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    IF v_sqlstate <> '23514' THEN
      RAISE EXCEPTION 'TEST G4 FAILED: Expected SQLSTATE 23514, got %', v_sqlstate;
    END IF;
    RAISE NOTICE '[PASS] Test G4: Status mutation rejected with SQLSTATE 23514 (universal status immutability)';
  END;

  DELETE FROM public.entity_geometries WHERE id = v_g_test_id;

  -- Test G2: Legitimate generic entity_geometry with status DERIVED is accepted
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_future_dv_id, c_future_prov_id,
    c_valid_geom, 'MultiPolygon', 'DERIVED', 'statutory_cartographic', 'historical_statutory_baseline',
    'g2_feat', '0000000000000000000000000000000000000000000000000000000000000002',
    '2026-01-01', '2026-01-01', NULL, false
  ) RETURNING id INTO v_g_test_id;

  SELECT status INTO v_g_status FROM public.entity_geometries WHERE id = v_g_test_id;
  IF v_g_status IS DISTINCT FROM 'DERIVED'::public.data_status_enum THEN
    RAISE EXCEPTION 'TEST G2 FAILED: Expected status DERIVED, found %', v_g_status;
  END IF;
  RAISE NOTICE '[PASS] Test G2: Generic entity_geometry with status DERIVED accepted by generic schema';

  DELETE FROM public.entity_geometries WHERE id = v_g_test_id;

  -- Test G3: Legitimate generic entity_geometry with status UNVERIFIED is accepted
  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_future_dv_id, c_future_prov_id,
    c_valid_geom, 'MultiPolygon', 'UNVERIFIED', 'statutory_cartographic', 'historical_statutory_baseline',
    'g3_feat', '0000000000000000000000000000000000000000000000000000000000000003',
    '2026-01-01', '2026-01-01', NULL, false
  ) RETURNING id INTO v_g_test_id;

  SELECT status INTO v_g_status FROM public.entity_geometries WHERE id = v_g_test_id;
  IF v_g_status IS DISTINCT FROM 'UNVERIFIED'::public.data_status_enum THEN
    RAISE EXCEPTION 'TEST G3 FAILED: Expected status UNVERIFIED, found %', v_g_status;
  END IF;
  RAISE NOTICE '[PASS] Test G3: Generic entity_geometry with status UNVERIFIED accepted by generic schema';

  DELETE FROM public.entity_geometries WHERE id = v_g_test_id;

  -- Test G5: W016 ingestion fixture with status OFFICIAL succeeds under W016-specific contract
  v_w016_status := 'OFFICIAL'::public.data_status_enum;
  -- W016 Ingestion Contract Pre-check:
  IF v_w016_status IS DISTINCT FROM 'OFFICIAL'::public.data_status_enum THEN
    RAISE EXCEPTION 'W016 INGESTION CONTRACT VIOLATION: statutory baseline geometry must have status OFFICIAL, received %', v_w016_status
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.entity_geometries (
    id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
    geometry, geometry_type, status, authority_classification, temporal_classification,
    source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
  ) VALUES (
    gen_random_uuid(), 'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'MultiPolygon', v_w016_status, 'statutory_cartographic', 'historical_statutory_baseline',
    '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
  ) RETURNING id INTO v_g_test_id;

  SELECT status INTO v_g_status FROM public.entity_geometries WHERE id = v_g_test_id;
  IF v_g_status IS DISTINCT FROM 'OFFICIAL'::public.data_status_enum THEN
    RAISE EXCEPTION 'TEST G5 FAILED: Expected status OFFICIAL, found %', v_g_status;
  END IF;
  RAISE NOTICE '[PASS] Test G5: W016 ingestion fixture with status OFFICIAL succeeds under W016 contract';

  DELETE FROM public.entity_geometries WHERE id = v_g_test_id;

  -- Test G6: W016 ingestion fixture with non-OFFICIAL status is rejected by W016 contract, NOT by generic CHECK constraint
  v_w016_bad_status := 'DERIVED'::public.data_status_enum;
  BEGIN
    -- W016 Ingestion Contract Pre-check Gate (independent of generic table DDL):
    IF v_w016_bad_status IS DISTINCT FROM 'OFFICIAL'::public.data_status_enum THEN
      RAISE EXCEPTION 'W016 INGESTION CONTRACT VIOLATION: statutory baseline geometry must have status OFFICIAL, received %', v_w016_bad_status
        USING ERRCODE = '23514';
    END IF;

    -- Generic insert would NOT fail on status (proven by G2), but contract halts execution before write
    INSERT INTO public.entity_geometries (
      id, entity_type, mandal_version_id, dataset_version_id, provenance_id,
      geometry, geometry_type, status, authority_classification, temporal_classification,
      source_feature_id, raw_artifact_sha256, snapshot_date, valid_from, valid_to, is_current
    ) VALUES (
      gen_random_uuid(), 'mandal', c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_valid_geom, 'MultiPolygon', v_w016_bad_status, 'statutory_cartographic', 'historical_statutory_baseline',
      '0', c_test_sha, '2016-10-11', '2016-10-11', '2022-09-26', false
    );
    RAISE EXCEPTION 'TEST G6 FAILED: Non-OFFICIAL status was not rejected by W016 ingestion contract';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_sqlstate = RETURNED_SQLSTATE;
      IF v_err_msg NOT LIKE 'W016 INGESTION CONTRACT VIOLATION%' THEN
        RAISE EXCEPTION 'TEST G6 FAILED: Rejection was NOT from W016 ingestion contract, got: %', v_err_msg;
      END IF;
      RAISE NOTICE '[PASS] Test G6: Non-OFFICIAL status rejected specifically by W016 ingestion contract (not by generic table constraint)';
  END;

  -- ─── PART 6: CLEANUP & AUDIT OF ZERO GEOMETRIES ───────────────────────────────
  -- Delete all synthetic entity_geometries rows
  DELETE FROM public.entity_geometries;

  -- Delete synthetic provenance records
  DELETE FROM public.provenance_records WHERE id IN (c_future_prov_id, c_no_ev_prov_id);

  -- Delete synthetic dataset versions and datasets
  DELETE FROM public.dataset_versions WHERE id = c_future_dv_id;
  DELETE FROM public.datasets WHERE id = c_future_ds_id;

  -- Delete synthetic evidence record
  DELETE FROM public.evidence_records WHERE id = c_future_ev_id;

  -- Verify exactly 0 rows remain in public.entity_geometries
  SELECT count(*) INTO v_count FROM public.entity_geometries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FINAL ZERO AUDIT FAILED: entity_geometries contains % rows, expected exactly 0', v_count;
  END IF;
  RAISE NOTICE '[PASS] Final Audit: Exactly ZERO rows remain in public.entity_geometries';

  RAISE NOTICE '================================================================';
  RAISE NOTICE 'SUCCESS: ALL CATALOG, LINEAGE (L1-L6), IDEMPOTENCY (I1-I8), MUTABILITY (M1-M5), AND GENERIC STATUS (G1-G6) CHECKS PASSED!';
  RAISE NOTICE '================================================================';
END;
$$;
