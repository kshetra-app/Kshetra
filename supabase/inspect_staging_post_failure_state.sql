-- ==============================================================================
-- W009-B5-R3A-R5: POST-FAILURE STAGING DATABASE READ-ONLY RECONCILIATION
-- Target Database: panIN-staging (fkpigozcqnmcvofuksar)
-- Semantics: STRICTLY READ-ONLY (ZERO MUTATIONS / ZERO DDL / ZERO DML)
-- Objective: Determine post-failure database state following failed execution.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Consolidated Diagnostic JSON (Single Row for Instant Operator Extraction)
-- ------------------------------------------------------------------------------
SELECT json_build_object(
  'observation_timestamp', NOW(),
  'migration_history_table_exists', EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
  ),
  'migration_history_rows_035_037', (
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
      ) THEN (
        SELECT COALESCE(json_agg(version), '[]'::json)
        FROM (
          SELECT version FROM supabase_migrations.schema_migrations 
          WHERE version LIKE '%035%' OR version LIKE '%036%' OR version LIKE '%037%'
        ) m
      )
      ELSE '[]'::json
    END
  ),
  'tables_present', (
    SELECT COALESCE(json_agg(table_name ORDER BY table_name), '[]'::json)
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
  ),
  'routines_present', (
    SELECT COALESCE(json_agg(routine_name ORDER BY routine_name), '[]'::json)
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('global_search', 'verify_and_activate_page_pro', 'verify_and_credit_recharge')
  ),
  'campaign_recharge_orders_rls', (
    SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_recharge_orders'
  ),
  'page_pro_orders_rls', (
    SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'page_pro_orders'
  ),
  'internal_payment_secrets_rls', (
    SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'internal_payment_secrets'
  ),
  'internal_payment_secrets_client_privileges', (
    SELECT COALESCE(json_agg(grantee || ':' || privilege_type), '[]'::json)
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
      AND table_name = 'internal_payment_secrets' 
      AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ),
  'global_search_security_type', (
    SELECT security_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'global_search'
  ),
  'global_search_public_execute', (
    SELECT COUNT(*) FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' AND routine_name = 'global_search' AND grantee = 'PUBLIC'
  ),
  'verify_and_activate_page_pro_security_type', (
    SELECT security_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'verify_and_activate_page_pro'
  ),
  'verify_and_activate_page_pro_parameters', (
    SELECT COALESCE(json_agg(parameter_name ORDER BY ordinal_position), '[]'::json)
    FROM information_schema.parameters 
    WHERE specific_schema = 'public' AND specific_name LIKE 'verify_and_activate_page_pro%'
  )
) AS diagnostic_summary;

-- ------------------------------------------------------------------------------
-- 2. Detailed Tabular Checks
-- ------------------------------------------------------------------------------

-- Check 2A: Target Tables Presence
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY table_name;

-- Check 2B: Row Level Security on Target Tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY tablename;

-- Check 2C: Target RPC Routines Presence & Volatility
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('global_search', 'verify_and_activate_page_pro', 'verify_and_credit_recharge')
ORDER BY routine_name;

-- Check 2D: Global Search Routine Grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'global_search'
ORDER BY grantee;

-- Check 2E: Page Pro Verification Routine Grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'verify_and_activate_page_pro'
ORDER BY grantee;

-- Check 2F: Internal Payment Secrets Privilege Grants
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'internal_payment_secrets'
ORDER BY grantee;
