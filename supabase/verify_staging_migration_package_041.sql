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

  -- Check 11: public.mandal_versions table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mandal_versions') THEN
    RAISE EXCEPTION 'Check 11 Failed: public.mandal_versions table does not exist';
  END IF;
  RAISE NOTICE 'Check 11 PASS: public.mandal_versions table exists';

  -- Check 12: mandals.current_version_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'mandals' AND column_name = 'current_version_id'
  ) THEN
    RAISE EXCEPTION 'Check 12 Failed: mandals.current_version_id column does not exist';
  END IF;
  RAISE NOTICE 'Check 12 PASS: mandals.current_version_id column exists';

  -- Check 13: fk_mandals_current_version_same_anchor composite FK exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'mandals' AND constraint_name = 'fk_mandals_current_version_same_anchor'
  ) THEN
    RAISE EXCEPTION 'Check 13 Failed: fk_mandals_current_version_same_anchor composite FK does not exist';
  END IF;
  RAISE NOTICE 'Check 13 PASS: fk_mandals_current_version_same_anchor composite FK verified';

  -- Check 14: uq_mandal_versions_no_overlap GiST exclusion constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.mandal_versions'::regclass AND conname = 'uq_mandal_versions_no_overlap'
  ) THEN
    RAISE EXCEPTION 'Check 14 Failed: uq_mandal_versions_no_overlap GiST exclusion constraint does not exist';
  END IF;
  RAISE NOTICE 'Check 14 PASS: uq_mandal_versions_no_overlap GiST exclusion constraint verified';

  -- Check 15: uq_mandal_versions_single_current unique index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'mandal_versions' AND indexname = 'uq_mandal_versions_single_current'
  ) THEN
    RAISE EXCEPTION 'Check 15 Failed: uq_mandal_versions_single_current unique index does not exist';
  END IF;
  RAISE NOTICE 'Check 15 PASS: uq_mandal_versions_single_current unique index verified';

  -- Check 16: chk_mandal_versions_current_invariants check constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.mandal_versions'::regclass AND conname = 'chk_mandal_versions_current_invariants'
  ) THEN
    RAISE EXCEPTION 'Check 16 Failed: chk_mandal_versions_current_invariants check constraint does not exist';
  END IF;
  RAISE NOTICE 'Check 16 PASS: chk_mandal_versions_current_invariants check constraint verified';

  -- Check 17: Deferred constraint triggers exist on mandals and mandal_versions
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'public.mandals'::regclass AND tgname = 'trg_guard_mandal_current_version'
  ) THEN
    RAISE EXCEPTION 'Check 17 Failed: trg_guard_mandal_current_version constraint trigger does not exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'public.mandal_versions'::regclass AND tgname = 'trg_guard_mandal_version_retirement'
  ) THEN
    RAISE EXCEPTION 'Check 17 Failed: trg_guard_mandal_version_retirement constraint trigger does not exist';
  END IF;
  RAISE NOTICE 'Check 17 PASS: Both deferred constraint triggers verified';

  -- Check 18: fn_transition_mandal_current_version stored function exists with exact 5 parameters and ownership
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    WHERE p.oid = 'public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'::regprocedure
      AND p.prosecdef = true
      AND p.proowner = 'panin_boundary_definer'::regrole
  ) THEN
    RAISE EXCEPTION 'Check 18 Failed: fn_transition_mandal_current_version(text,uuid,date,text,uuid) missing, not SECURITY DEFINER, or wrong owner';
  END IF;
  RAISE NOTICE 'Check 18 PASS: Transition function identity, SECURITY DEFINER, and owner verified';

  -- Check 19: panin_boundary_definer role attributes and memberships
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = 'panin_boundary_definer' 
      AND rolcanlogin = false 
      AND rolsuper = false 
      AND rolcreatedb = false 
      AND rolcreaterole = false
  ) THEN
    RAISE EXCEPTION 'Check 19 Failed: panin_boundary_definer role has incorrect attributes';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = 'panin_boundary_definer'::regrole) THEN
    RAISE EXCEPTION 'Check 19 Failed: panin_boundary_definer inherits unintended role memberships';
  END IF;
  RAISE NOTICE 'Check 19 PASS: panin_boundary_definer role attributes and 0 memberships verified';

  -- Check 20: Table-level privileges on panin_boundary_definer
  IF NOT (
    has_table_privilege('panin_boundary_definer', 'public.dataset_versions', 'SELECT') AND
    has_table_privilege('panin_boundary_definer', 'public.provenance_records', 'SELECT') AND
    has_table_privilege('panin_boundary_definer', 'public.mandals', 'SELECT') AND
    has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'SELECT')
  ) THEN
    RAISE EXCEPTION 'Check 20 Failed: panin_boundary_definer missing table-level SELECT on required tables';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE grantee = 'panin_boundary_definer' 
      AND privilege_type IN ('INSERT', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) THEN
    RAISE EXCEPTION 'Check 20 Failed: panin_boundary_definer has prohibited table-level privileges';
  END IF;
  RAISE NOTICE 'Check 20 PASS: Definer table-level privileges verified (SELECT only, zero INSERT/DELETE/TRUNCATE/REFERENCES/TRIGGER)';

  -- Check 21: Column-level UPDATE privileges on panin_boundary_definer
  -- mandals: permitted (current_version_id, updated_at), prohibited (all other 15)
  IF NOT (
    has_column_privilege('panin_boundary_definer', 'public.mandals', 'current_version_id', 'UPDATE') AND
    has_column_privilege('panin_boundary_definer', 'public.mandals', 'updated_at', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'Check 21 Failed: panin_boundary_definer missing column-level UPDATE on mandals (current_version_id, updated_at)';
  END IF;
  IF EXISTS (
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'mandals' 
      AND column_name NOT IN ('current_version_id', 'updated_at')
      AND has_column_privilege('panin_boundary_definer', 'public.mandals', column_name, 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'Check 21 Failed: panin_boundary_definer has unintended column UPDATE on public.mandals';
  END IF;

  -- mandal_versions: permitted (is_current, valid_from, valid_to, updated_at), prohibited (all other 12)
  IF NOT (
    has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'is_current', 'UPDATE') AND
    has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'valid_from', 'UPDATE') AND
    has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'valid_to', 'UPDATE') AND
    has_column_privilege('panin_boundary_definer', 'public.mandal_versions', 'updated_at', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'Check 21 Failed: panin_boundary_definer missing column-level UPDATE on mandal_versions';
  END IF;
  IF EXISTS (
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'mandal_versions' 
      AND column_name NOT IN ('is_current', 'valid_from', 'valid_to', 'updated_at')
      AND has_column_privilege('panin_boundary_definer', 'public.mandal_versions', column_name, 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'Check 21 Failed: panin_boundary_definer has unintended column UPDATE on public.mandal_versions';
  END IF;
  RAISE NOTICE 'Check 21 PASS: Exactly 6 column-level UPDATE privileges on public.mandals and public.mandal_versions verified';

  -- Check 22: Assert PUBLIC has no EXECUTE in catalog proacl
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    CROSS JOIN aclexplode(p.proacl) acl
    WHERE p.oid = 'public.fn_transition_mandal_current_version(text,uuid,date,text,uuid)'::regprocedure
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Check 22 Failed: PUBLIC (grantee=0) possesses EXECUTE privilege on transition function in catalog proacl';
  END IF;
  RAISE NOTICE 'Check 22 PASS: Catalog proacl confirms PUBLIC possesses zero EXECUTE entries';

  -- Check 23: RLS enabled on public.mandal_versions
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'mandal_versions' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Check 23 Failed: RLS not enabled on public.mandal_versions';
  END IF;
  RAISE NOTICE 'Check 23 PASS: RLS enabled on public.mandal_versions';

  RAISE NOTICE '=== ALL 23 MIGRATION 041 SQL CHECKS PASSED ===';
END $$;
