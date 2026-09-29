-- ==============================================================================
-- Verification Script: 050_political_entity_model.sql
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- ==============================================================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_func_count INTEGER;
  v_secdef_count INTEGER;
  v_rls_count INTEGER;
BEGIN
  -- 1. Verify all 6 tables exist
  SELECT count(*) INTO v_table_count
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'canonical_persons',
       'political_organizations',
       'person_roles',
       'candidacies',
       'elected_tenures',
       'person_identity_linkages'
     );

  IF v_table_count != 6 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected 6 political entity tables, found %', v_table_count;
  END IF;

  -- 2. Verify all 6 tables have RLS enabled
  SELECT count(*) INTO v_rls_count
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN (
       'canonical_persons',
       'political_organizations',
       'person_roles',
       'candidacies',
       'elected_tenures',
       'person_identity_linkages'
     )
     AND rowsecurity = true;

  IF v_rls_count != 6 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected 6 tables with RLS enabled, found %', v_rls_count;
  END IF;

  -- 3. Verify functions exist
  SELECT count(*) INTO v_func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND p.proname IN ('fn_resolve_canonical_person', 'fn_link_person_identity');

  IF v_func_count != 2 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected 2 stored functions, found %', v_func_count;
  END IF;

  -- 4. Verify 100% SECURITY INVOKER (prosecdef = false)
  SELECT count(*) INTO v_secdef_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND p.proname IN ('fn_resolve_canonical_person', 'fn_link_person_identity')
     AND p.prosecdef = true;

  IF v_secdef_count != 0 THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Found % functions with SECURITY DEFINER; expected 100%% SECURITY INVOKER', v_secdef_count;
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 050 political entity model verified cleanly.';
END $$;
