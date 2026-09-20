-- ==============================================================================
-- W009-B5-R3A-R3: POST-MIGRATION VERIFICATION SQL SUITE
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Order of Verification:
--   1. campaign_recharge_orders (Migration 035)
--   2. page_pro_orders (Migration 037)
--   3. internal_payment_secrets (Migration 037)
--   4. Required Row Level Security (RLS)
--   5. Required Indexes & Table Constraints
--   6. verify_and_activate_page_pro RPC
--   7. global_search RPC
--   8. global_search PUBLIC execution revoked
--   9. page-pro RPC execution restricted as designed
--  10. internal_payment_secrets client-role isolation
--  11. Absence of unexpected migration 038 objects
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Target Tables Existence (035 & 037)
-- ------------------------------------------------------------------------------
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY table_name;
-- EXPECTED: Exactly 3 rows: campaign_recharge_orders, internal_payment_secrets, page_pro_orders

-- ------------------------------------------------------------------------------
-- CHECK 2: Required Row Level Security (RLS) Enabled on Target Tables
-- ------------------------------------------------------------------------------
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY tablename;
-- EXPECTED: Exactly 3 rows with rowsecurity = true

-- ------------------------------------------------------------------------------
-- CHECK 3: Required RLS Policies on Target Tables
-- ------------------------------------------------------------------------------
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders')
ORDER BY tablename, policyname;
-- EXPECTED:
-- campaign_recharge_orders:
--   - "Politicians create own recharge orders" (INSERT)
--   - "Politicians read own recharge orders" (SELECT)
-- page_pro_orders:
--   - "Users and page owners read own pro orders" (SELECT)

-- ------------------------------------------------------------------------------
-- CHECK 4: Required Indexes on Target Tables
-- ------------------------------------------------------------------------------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders')
ORDER BY tablename, indexname;
-- EXPECTED:
-- campaign_recharge_orders:
--   - campaign_recharge_orders_pkey
--   - campaign_recharge_orders_provider_order_id_key
--   - idx_recharge_orders_payment_id
--   - idx_recharge_orders_politician
--   - idx_recharge_orders_status
-- page_pro_orders:
--   - idx_page_pro_orders_page
--   - idx_page_pro_orders_payment_id
--   - idx_page_pro_orders_provider_order
--   - idx_page_pro_orders_user
--   - page_pro_orders_pkey
--   - page_pro_orders_provider_order_id_key

-- ------------------------------------------------------------------------------
-- CHECK 5: Required Table Constraints
-- ------------------------------------------------------------------------------
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY table_name, constraint_name;
-- EXPECTED:
-- campaign_recharge_orders: PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK
-- page_pro_orders: PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK
-- internal_payment_secrets: PRIMARY KEY

-- ------------------------------------------------------------------------------
-- CHECK 6: internal_payment_secrets Client-Role Privilege Boundary Isolation
-- ------------------------------------------------------------------------------
-- MUST RETURN 0 ROWS for PUBLIC, anon, authenticated, service_role
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'internal_payment_secrets'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role');
-- EXPECTED: 0 rows (strictly isolated from client-accessible roles)

-- ------------------------------------------------------------------------------
-- CHECK 7: RPC Functions Existence and Security Types
-- ------------------------------------------------------------------------------
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('verify_and_credit_recharge', 'global_search', 'verify_and_activate_page_pro')
ORDER BY routine_name;
-- EXPECTED:
-- global_search: DEFINER
-- verify_and_activate_page_pro: DEFINER
-- verify_and_credit_recharge: INVOKER

-- ------------------------------------------------------------------------------
-- CHECK 8: verify_and_activate_page_pro Execution Boundary
-- ------------------------------------------------------------------------------
-- MUST NOT be executable by PUBLIC, anon, or authenticated callers
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'verify_and_activate_page_pro'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
-- EXPECTED: 0 rows

-- MUST be executable ONLY by service_role (and superuser/postgres owner)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'verify_and_activate_page_pro'
  AND grantee = 'service_role';
-- EXPECTED: 1 row with privilege_type = 'EXECUTE'

-- ------------------------------------------------------------------------------
-- CHECK 9: global_search Execution Boundary
-- ------------------------------------------------------------------------------
-- MUST NOT be executable by PUBLIC
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'global_search'
  AND grantee = 'PUBLIC';
-- EXPECTED: 0 rows (revoked from PUBLIC)

-- MUST be executable by anon, authenticated, and service_role
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'global_search'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee;
-- EXPECTED: 3 rows with privilege_type = 'EXECUTE'

-- ------------------------------------------------------------------------------
-- CHECK 10: verify_and_activate_page_pro Parameter Signature Verification
-- ------------------------------------------------------------------------------
-- Assert that caller-controlled p_key_secret DOES NOT exist in parameter list
SELECT parameter_name, data_type, ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'verify_and_activate_page_pro%'
ORDER BY ordinal_position;
-- EXPECTED: Parameters: p_provider_order_id, p_page_id, p_user_id, p_provider_payment_id, p_signature, p_billing_cycle, p_is_admin
-- MUST NOT contain 'p_key_secret'

-- ------------------------------------------------------------------------------
-- CHECK 11: Absence of Unexpected Migration 038 Objects
-- ------------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%038%';
-- EXPECTED: 0 rows

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name ILIKE '%038%';
-- EXPECTED: 0 rows
