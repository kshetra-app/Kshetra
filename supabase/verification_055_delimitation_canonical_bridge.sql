-- ==============================================================================
-- verification_055_delimitation_canonical_bridge.sql
--
-- Milestone: W020 — Delimitation Engine Foundation (Gate W020-G4 Verification)
-- Purpose: SQL-level verification of Migration 055 schema state
-- Target: panIN-staging (fkpigozcqnmcvofuksar) / Local PostgreSQL
-- ==============================================================================

DO $$
DECLARE
  v_col_count INTEGER;
  v_fk_count INTEGER;
  v_idx_count INTEGER;
  v_rls_prop BOOLEAN;
  v_rls_map BOOLEAN;
  v_bad_scenario_col INTEGER;
BEGIN
  RAISE NOTICE '=== EXECUTING VERIFICATION 055 CHECKS ===';

  -- 1. Check added columns on delimitation_proposals
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'delimitation_proposals'
    AND column_name IN ('delimitation_regime_id', 'provenance_id', 'metadata');

  IF v_col_count <> 3 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 3 new columns on delimitation_proposals, found %', v_col_count;
  END IF;
  RAISE NOTICE '[PASS] delimitation_proposals has all 3 required columns';

  -- 2. Check added columns on constituency_mapping
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'constituency_mapping'
    AND column_name IN ('constituency_version_id', 'predecessor_version_id', 'provenance_id');

  IF v_col_count <> 3 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 3 new columns on constituency_mapping, found %', v_col_count;
  END IF;
  RAISE NOTICE '[PASS] constituency_mapping has all 3 required columns';

  -- 3. Check foreign key constraints
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND (
      (table_name = 'delimitation_proposals' AND constraint_name LIKE '%delimitation_regime_id%')
      OR (table_name = 'delimitation_proposals' AND constraint_name LIKE '%provenance_id%')
      OR (table_name = 'constituency_mapping' AND constraint_name LIKE '%constituency_version_id%')
      OR (table_name = 'constituency_mapping' AND constraint_name LIKE '%predecessor_version_id%')
      OR (table_name = 'constituency_mapping' AND constraint_name LIKE '%provenance_id%')
    );

  IF v_fk_count < 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected at least 5 FK constraints for W020 bridge, found %', v_fk_count;
  END IF;
  RAISE NOTICE '[PASS] All 5 foreign key constraints verified';

  -- 4. Check indexes
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_delim_proposals_regime',
      'idx_delim_proposals_provenance',
      'idx_mapping_constituency_version',
      'idx_mapping_predecessor_version',
      'idx_mapping_provenance'
    );

  IF v_idx_count <> 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 5 indexes for W020 bridge, found %', v_idx_count;
  END IF;
  RAISE NOTICE '[PASS] All 5 indexes verified';

  -- 5. Check RLS is enabled on both tables
  SELECT rowsecurity INTO v_rls_prop
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'delimitation_proposals';

  SELECT rowsecurity INTO v_rls_map
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'constituency_mapping';

  IF NOT (v_rls_prop AND v_rls_map) THEN
    RAISE EXCEPTION 'CHECK FAILED: RLS not enabled on both tables (proposals: %, mapping: %)', v_rls_prop, v_rls_map;
  END IF;
  RAISE NOTICE '[PASS] RLS is active on both tables';

  -- 6. Strict check: ZERO persistent is_scenario columns
  SELECT count(*) INTO v_bad_scenario_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'is_scenario';

  IF v_bad_scenario_col > 0 THEN
    RAISE EXCEPTION 'CHECK FAILED: Persistent is_scenario column detected! Found %', v_bad_scenario_col;
  END IF;
  RAISE NOTICE '[PASS] Zero persistent is_scenario columns detected';

  RAISE NOTICE '=== ALL VERIFICATION 055 SQL CHECKS PASSED ===';
END $$;
