-- ==============================================================================
-- W009-B5-R3A: POST-MIGRATION VERIFICATION SQL SUITE
-- Target Database: panIN-staging (fkpigozcqnmcvofuksar)
-- Run in Supabase SQL Editor immediately following execution of staging_migration_package_035_037.sql
-- ==============================================================================

-- 1. Verify existence of all target tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY table_name;

-- Expected: 3 rows returned

-- 2. Verify RLS is enabled on target tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY tablename;

-- Expected: rowsecurity = true for all 3 tables

-- 3. Verify internal_payment_secrets privilege boundary
-- MUST RETURN 0 ROWS for public/anon/authenticated/service_role
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'internal_payment_secrets'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role');

-- Expected: 0 rows (strict privilege boundary enforced)

-- 4. Verify RPC functions exist with correct security definer properties
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('verify_and_credit_recharge', 'global_search', 'verify_and_activate_page_pro')
ORDER BY routine_name;

-- Expected:
-- global_search: DEFINER
-- verify_and_activate_page_pro: DEFINER
-- verify_and_credit_recharge: INVOKER

-- 5. Verify verify_and_activate_page_pro execution privileges
-- MUST be granted ONLY to service_role (0 rows for PUBLIC, anon, authenticated)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'verify_and_activate_page_pro';

-- Expected: ONLY service_role has EXECUTE

-- 6. Verify global_search execution privileges
-- MUST NOT be granted to PUBLIC
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'global_search'
  AND grantee = 'PUBLIC';

-- Expected: 0 rows
