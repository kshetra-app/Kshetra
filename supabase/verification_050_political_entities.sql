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
  v_epic_hash_col_count INTEGER;
  v_parent_org_col_count INTEGER;
  v_rel_type_col_count INTEGER;
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

  -- 3. Verify functions exist (4 total: 2 identity + 2 immutability guards)
  SELECT count(*) INTO v_func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'fn_resolve_canonical_person',
       'fn_link_person_identity',
       'fn_prevent_candidacy_mutation',
       'fn_prevent_tenure_history_mutation'
     );

  IF v_func_count != 4 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected 4 stored functions, found %', v_func_count;
  END IF;

  -- 4. Verify 100% SECURITY INVOKER (prosecdef = false)
  SELECT count(*) INTO v_secdef_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'fn_resolve_canonical_person',
       'fn_link_person_identity',
       'fn_prevent_candidacy_mutation',
       'fn_prevent_tenure_history_mutation'
     )
     AND p.prosecdef = true;

  IF v_secdef_count != 0 THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Found % functions with SECURITY DEFINER; expected 100%% SECURITY INVOKER', v_secdef_count;
  END IF;

  -- 5. Verify epic_hash column does NOT exist on canonical_persons
  SELECT count(*) INTO v_epic_hash_col_count
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'canonical_persons'
     AND column_name = 'epic_hash';

  IF v_epic_hash_col_count != 0 THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: epic_hash column found on canonical_persons. Must be absent.';
  END IF;

  -- 6. Verify parent_org_id on political_organizations
  SELECT count(*) INTO v_parent_org_col_count
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'political_organizations'
     AND column_name = 'parent_org_id';

  IF v_parent_org_col_count != 1 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected parent_org_id column on political_organizations.';
  END IF;

  -- 7. Verify relationship_type on person_roles
  SELECT count(*) INTO v_rel_type_col_count
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'person_roles'
     AND column_name = 'relationship_type';

  IF v_rel_type_col_count != 1 THEN
    RAISE EXCEPTION 'VERIFICATION_FAILED: Expected relationship_type column on person_roles.';
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 050 political entity model verified cleanly.';
END $$;
