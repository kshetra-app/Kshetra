-- =============================================================================
-- Verification Script: Migration 051 Election Data Normalization
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER;
  v_secdef BOOLEAN;
BEGIN
  -- 1. Check Tables
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name IN ('election_events', 'election_contests', 'ballot_choices');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Table check failed: Expected 3 tables, found %', v_count;
  END IF;

  -- 2. Check View
  SELECT COUNT(*) INTO v_count FROM information_schema.views
  WHERE table_schema = 'public' AND table_name = 'vw_legacy_election_results';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'View check failed: vw_legacy_election_results not found';
  END IF;

  -- 3. Check Candidacies columns
  SELECT COUNT(*) INTO v_count FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'candidacies'
    AND column_name IN ('contest_id', 'evm_votes', 'postal_votes');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'Candidacies columns check failed: Expected 3 new columns, found %', v_count;
  END IF;

  -- 4. Check Functions and 100% SECURITY INVOKER
  SELECT COUNT(*) INTO v_count FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname IN ('fn_validate_contest_totals', 'fn_refresh_contest_metrics')
    AND p.prosecdef = false;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Function SECURITY INVOKER check failed: Expected 2 functions with prosecdef=false, found %', v_count;
  END IF;

  -- 5. Check RLS is enabled
  SELECT COUNT(*) INTO v_count FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname IN ('election_events', 'election_contests', 'ballot_choices')
    AND c.relrowsecurity = true;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'RLS check failed: Expected 3 tables with relrowsecurity=true, found %', v_count;
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 051 Verification Passed 100%%';
END $$;
