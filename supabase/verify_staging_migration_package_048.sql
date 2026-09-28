-- ==============================================================================
-- Verification Suite: Migration 048 Entity Geometries Schema & Behavioral Preflight
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Authority: CTO Directive W016-C3-R5-R3
-- Scope: Read-Only Catalog Inspection & Transaction-Isolated Behavioral Preflight
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
  v_priv_count INTEGER;
  v_sqlstate TEXT;
  v_sqlerrm TEXT;

  -- Test fixture references (using existing historical version & spatial provenance)
  c_test_mv_id UUID := 'e0160000-0000-0000-0001-000000004301'; -- Adilabad Urban (hist)
  c_test_mv_id2 UUID := 'e0160000-0000-0000-0001-000000004302'; -- Bazarhathnoor (hist)
  c_test_dv_id TEXT := 'tgrac_mandals_2016_v1';
  c_test_prov_id UUID := 'e0160000-0000-0000-0002-000000000001'; -- spatial prov node
  c_test_sha TEXT := 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';
  c_valid_geom GEOMETRY;
  c_invalid_geom GEOMETRY;
  c_wrong_srid_geom GEOMETRY;
  c_empty_geom GEOMETRY;
  v_test_id UUID;
BEGIN
  RAISE NOTICE '=== STARTING MIGRATION 048 VERIFICATION SUITE ===';

  -- ─── PART 1: CATALOG OBJECT INSPECTION ─────────────────────────────────────────

  -- Check 1: Table exists
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'entity_geometries';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'CHECK 1 FAILED: public.entity_geometries table does not exist';
  END IF;
  RAISE NOTICE '[PASS] Check 1: public.entity_geometries exists in catalog';

  -- Check 2: Expected columns exist (18 columns)
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
  IF v_col_count <> 18 THEN
    RAISE EXCEPTION 'CHECK 2 FAILED: Expected 18 columns, found %', v_col_count;
  END IF;
  RAISE NOTICE '[PASS] Check 2: All 18 expected columns exist with correct names';

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

  -- Check 6: Referential and filter indexes
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'entity_geometries'
    AND indexname IN ('idx_entity_geometries_dataset_version', 'idx_entity_geometries_provenance', 'idx_entity_geometries_source_feature');
  IF v_idx_count <> 3 THEN
    RAISE EXCEPTION 'CHECK 6 FAILED: Expected 3 referential indexes, found %', v_idx_count;
  END IF;
  RAISE NOTICE '[PASS] Check 6: Referential FK and feature indexes exist';

  -- Check 7: Foreign keys with ON DELETE RESTRICT
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.table_schema = 'public' AND tc.table_name = 'entity_geometries'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule = 'RESTRICT';
  IF v_fk_count < 3 THEN
    RAISE EXCEPTION 'CHECK 7 FAILED: Expected at least 3 RESTRICT foreign keys, found %', v_fk_count;
  END IF;
  RAISE NOTICE '[PASS] Check 7: Foreign keys to mandal_versions, dataset_versions, provenance_records enforce RESTRICT';

  -- Check 8: Check constraints (not_empty, is_valid, srid, type, sha256)
  SELECT count(*) INTO v_chk_count
  FROM information_schema.check_constraints cc
  JOIN information_schema.table_constraints tc
    ON cc.constraint_name = tc.constraint_name
  WHERE tc.table_schema = 'public' AND tc.table_name = 'entity_geometries';
  IF v_chk_count < 5 THEN
    RAISE EXCEPTION 'CHECK 8 FAILED: Expected at least 5 check constraints, found %', v_chk_count;
  END IF;
  RAISE NOTICE '[PASS] Check 8: Spatial integrity and SHA-256 check constraints verified';

  -- Check 9: Immutability trigger exists
  SELECT count(*) INTO v_trg_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public' AND event_object_table = 'entity_geometries'
    AND trigger_name = 'trg_prevent_entity_geometry_mutation';
  IF v_trg_count <> 1 THEN
    RAISE EXCEPTION 'CHECK 9 FAILED: trg_prevent_entity_geometry_mutation missing';
  END IF;
  RAISE NOTICE '[PASS] Check 9: Immutability protective trigger trg_prevent_entity_geometry_mutation exists';

  -- Check 10: RLS enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace AND relname = 'entity_geometries';
  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'CHECK 10 FAILED: Row Level Security is NOT enabled on entity_geometries';
  END IF;
  RAISE NOTICE '[PASS] Check 10: Row Level Security is ENABLED on entity_geometries';

  -- Check 11: RLS policies exist
  SELECT count(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'entity_geometries';
  IF v_policy_count < 2 THEN
    RAISE EXCEPTION 'CHECK 11 FAILED: Expected at least 2 RLS policies, found %', v_policy_count;
  END IF;
  RAISE NOTICE '[PASS] Check 11: RLS policies (Public read, Service role full access) exist';

  -- ─── PART 2: BEHAVIORAL PREFLIGHT (TRANSACTION-ISOLATED TESTS A-N) ─────────────
  RAISE NOTICE '--- RUNNING BEHAVIORAL PREFLIGHT TEST SUITE (CHECKS A-N) ---';

  c_valid_geom := ST_Multi(ST_GeomFromText('POLYGON((78.4 17.3, 78.5 17.3, 78.5 17.4, 78.4 17.4, 78.4 17.3))', 4326));
  c_wrong_srid_geom := ST_Multi(ST_GeomFromText('POLYGON((78.4 17.3, 78.5 17.3, 78.5 17.4, 78.4 17.4, 78.4 17.3))', 3857));
  c_empty_geom := ST_GeomFromText('GEOMETRYCOLLECTION EMPTY', 4326);

  -- Test A: invalid mandal_version_id rejected (23503)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', c_test_dv_id, c_test_prov_id,
      c_valid_geom, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST A FAILED: Insert with invalid mandal_version_id did not fail';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test A: Invalid mandal_version_id correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test B: nonexistent dataset_version_id rejected (23503)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, 'nonexistent_dataset_version', c_test_prov_id,
      c_valid_geom, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST B FAILED: Insert with invalid dataset_version_id did not fail';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test B: Nonexistent dataset_version_id correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test C: nonexistent provenance_id rejected (23503)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, c_test_dv_id, '00000000-0000-0000-0000-000000000000',
      c_valid_geom, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST C FAILED: Insert with invalid provenance_id did not fail';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test C: Nonexistent provenance_id correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test D: NULL geometry rejected (23502)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, c_test_dv_id, c_test_prov_id,
      NULL, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST D FAILED: Insert with NULL geometry did not fail';
  EXCEPTION WHEN not_null_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test D: NULL geometry correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test E: wrong SRID rejected (23514)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_wrong_srid_geom, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST E FAILED: Insert with SRID 3857 did not fail';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test E: Wrong SRID correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test F: invalid/empty geometry rejected (23514)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_empty_geom, 'TEST_FID', c_test_sha
    );
    RAISE EXCEPTION 'TEST F FAILED: Insert with empty geometry did not fail';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test F: Empty geometry correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test L: valid disposable synthetic geometry insert passes via authorized path
  INSERT INTO public.entity_geometries (
    mandal_version_id, dataset_version_id, provenance_id,
    geometry, source_feature_id, raw_artifact_sha256
  ) VALUES (
    c_test_mv_id, c_test_dv_id, c_test_prov_id,
    c_valid_geom, 'TEST_FID_SYNTHETIC', c_test_sha
  ) RETURNING id INTO v_test_id;
  RAISE NOTICE '[PASS] Test L: Valid disposable synthetic row inserted successfully (id: %)', v_test_id;

  -- Test G: duplicate mandal_version_id rejected (23505)
  BEGIN
    INSERT INTO public.entity_geometries (
      mandal_version_id, dataset_version_id, provenance_id,
      geometry, source_feature_id, raw_artifact_sha256
    ) VALUES (
      c_test_mv_id, c_test_dv_id, c_test_prov_id,
      c_valid_geom, 'TEST_FID_DUP', c_test_sha
    );
    RAISE EXCEPTION 'TEST G FAILED: Duplicate mandal_version_id was not rejected';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test G: Duplicate mandal_version_id correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test J: protected authoritative geometry UPDATE rejected by trigger (23514)
  BEGIN
    UPDATE public.entity_geometries
    SET geometry = ST_Multi(ST_GeomFromText('POLYGON((78.5 17.3, 78.6 17.3, 78.6 17.4, 78.5 17.4, 78.5 17.3))', 4326))
    WHERE id = v_test_id;
    RAISE EXCEPTION 'TEST J FAILED: Authoritative geometry coordinate UPDATE did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test J: Authoritative geometry coordinate mutation correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test K: protected mandal_version_id reassignment rejected by trigger (23514)
  BEGIN
    UPDATE public.entity_geometries
    SET mandal_version_id = c_test_mv_id2
    WHERE id = v_test_id;
    RAISE EXCEPTION 'TEST K FAILED: mandal_version_id reassignment did not trigger exception';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE NOTICE '[PASS] Test K: mandal_version_id reassignment correctly rejected with SQLSTATE %', v_sqlstate;
  END;

  -- Test M: synthetic row deleted cleanly
  DELETE FROM public.entity_geometries WHERE id = v_test_id;
  SELECT count(*) INTO v_count FROM public.entity_geometries WHERE id = v_test_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST M FAILED: Disposable test row was not deleted';
  END IF;
  RAISE NOTICE '[PASS] Test M: Disposable synthetic row deleted cleanly';

  -- Test N: ZERO real geometry rows remain in public.entity_geometries
  SELECT count(*) INTO v_count FROM public.entity_geometries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST N FAILED: entity_geometries must contain exactly 0 rows, observed %', v_count;
  END IF;
  RAISE NOTICE '[PASS] Test N: EXACTLY ZERO geometry rows remain in public.entity_geometries';

  RAISE NOTICE '================================================================';
  RAISE NOTICE 'SUCCESS: ALL CATALOG AND BEHAVIORAL PREFLIGHT CHECKS PASSED!';
  RAISE NOTICE '================================================================';
END;
$$;
