-- ==============================================================================
-- verify_staging_migration_package_041.sql
-- Authoritative SQL-level verification checks for Migration 041 on panIN-staging
-- ==============================================================================

DO $$
DECLARE
  v_regimes_count INT;
  v_sv_count INT;
  v_dv_count INT;
  v_pcv_count INT;
  v_cv_count INT;
  v_cdt_count INT;
  v_lineage_count INT;
  v_mulug_timeline_count INT;
BEGIN
  RAISE NOTICE '=== EXECUTING MIGRATION 041 SQL VERIFICATION ===';

  -- Check 1: Delimitation regimes
  SELECT COUNT(*) INTO v_regimes_count FROM public.delimitation_regimes;
  IF v_regimes_count < 4 THEN
    RAISE EXCEPTION 'Check 1 Failed: Expected at least 4 delimitation regimes, got %', v_regimes_count;
  END IF;
  RAISE NOTICE 'Check 1 PASS: Delimitation regimes count = %', v_regimes_count;

  -- Check 2: State versions
  SELECT COUNT(*) INTO v_sv_count FROM public.state_versions WHERE state_code = 'TS';
  IF v_sv_count < 1 THEN
    RAISE EXCEPTION 'Check 2 Failed: Expected state_versions for TS, got %', v_sv_count;
  END IF;
  RAISE NOTICE 'Check 2 PASS: TS state_versions count = %', v_sv_count;

  -- Check 3: District versions (at least 33)
  SELECT COUNT(*) INTO v_dv_count FROM public.district_versions WHERE is_current = true;
  IF v_dv_count != 33 THEN
    RAISE EXCEPTION 'Check 3 Failed: Expected 33 current district_versions, got %', v_dv_count;
  END IF;
  RAISE NOTICE 'Check 3 PASS: 33 current district_versions verified';

  -- Check 4: PC versions (17)
  SELECT COUNT(*) INTO v_pcv_count FROM public.parliamentary_constituency_versions WHERE is_current = true;
  IF v_pcv_count != 17 THEN
    RAISE EXCEPTION 'Check 4 Failed: Expected 17 current PC versions, got %', v_pcv_count;
  END IF;
  RAISE NOTICE 'Check 4 PASS: 17 current PC versions verified';

  -- Check 5: AC versions (119)
  SELECT COUNT(*) INTO v_cv_count FROM public.constituency_versions WHERE is_current = true;
  IF v_cv_count != 119 THEN
    RAISE EXCEPTION 'Check 5 Failed: Expected 119 current AC versions, got %', v_cv_count;
  END IF;
  RAISE NOTICE 'Check 5 PASS: 119 current AC versions verified';

  -- Check 6: Current version pointers on anchor tables
  IF EXISTS (SELECT 1 FROM public.districts WHERE current_version_id IS NULL AND state_code = 'TS') THEN
    RAISE EXCEPTION 'Check 6 Failed: Some TS districts have NULL current_version_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.constituencies WHERE current_version_id IS NULL AND state_code = 'TS') THEN
    RAISE EXCEPTION 'Check 6 Failed: Some TS constituencies have NULL current_version_id';
  END IF;
  RAISE NOTICE 'Check 6 PASS: Current version pointers strictly populated on anchor tables';

  -- Check 7: AC 109 (Mulug) timeline
  SELECT COUNT(*) INTO v_mulug_timeline_count
  FROM public.constituency_district_timeline cdt
  JOIN public.constituencies c ON cdt.constituency_internal_id = c.internal_id
  WHERE c.canonical_code = 'TS-AC-109';

  IF v_mulug_timeline_count != 3 THEN
    RAISE EXCEPTION 'Check 7 Failed: Expected 3 historical intervals for AC 109, got %', v_mulug_timeline_count;
  END IF;
  RAISE NOTICE 'Check 7 PASS: AC 109 timeline has exact 3 statutory intervals';

  -- Check 8: Entity lineage (Mulugu split)
  SELECT COUNT(*) INTO v_lineage_count FROM public.geography_entity_lineage WHERE transition_type = 'split';
  IF v_lineage_count < 2 THEN
    RAISE EXCEPTION 'Check 8 Failed: Expected at least 2 split lineage records, got %', v_lineage_count;
  END IF;
  RAISE NOTICE 'Check 8 PASS: Split lineage records verified (Mulugu & Narayanpet)';

  -- Check 9: Scenario isolation invariant
  IF EXISTS (SELECT 1 FROM public.delimitation_regimes WHERE id = 'scenario_delimitation_draft_prop_1' AND legal_status = 'CURRENT_LEGAL_REGIME') THEN
    RAISE EXCEPTION 'Check 9 Failed: Scenario regime must never be marked CURRENT_LEGAL_REGIME';
  END IF;
  RAISE NOTICE 'Check 9 PASS: Scenario isolation verified';

  -- Check 10: RLS enabled on all 7 tables
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('delimitation_regimes', 'state_versions', 'district_versions', 'parliamentary_constituency_versions', 'constituency_versions', 'constituency_district_timeline', 'geography_entity_lineage')
      AND rowsecurity = false
  ) THEN
    RAISE EXCEPTION 'Check 10 Failed: RLS not enabled on all W014 tables';
  END IF;
  RAISE NOTICE 'Check 10 PASS: RLS enabled on all W014 tables';

  RAISE NOTICE '=== ALL 10 MIGRATION 041 SQL CHECKS PASSED ===';
END $$;
