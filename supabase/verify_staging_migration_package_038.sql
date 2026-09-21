-- ==============================================================================
-- W010: POST-MIGRATION 038 VERIFICATION SQL SUITE
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Order of Verification:
--   1. trai_opt_outs RLS & privilege revocation (DEF-014)
--   2. check_phone_opt_out RPC boundary (DEF-014)
--   3. refresh_materialized_views revocation from public (DEF-015)
--   4. SECURITY DEFINER search_path enforcement (DEF-015)
--   5. lmx_departments public read policy & column protection (DEF-016)
--   6. Table owner safeguard policies on page_pro_orders & recharge (DEF-017)
--   7. FORCE ROW LEVEL SECURITY across all 21 tables (DEF-017)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: trai_opt_outs Privileges (DEF-014)
-- Untrusted roles (anon, authenticated, PUBLIC) MUST NOT have SELECT privilege
-- ------------------------------------------------------------------------------
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'trai_opt_outs'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY grantee, privilege_type;
-- EXPECTED: Exactly 0 rows.

-- ------------------------------------------------------------------------------
-- CHECK 2: check_phone_opt_out RPC Grants (DEF-014)
-- Must be executable ONLY by service_role
-- ------------------------------------------------------------------------------
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'check_phone_opt_out'
ORDER BY grantee;
-- EXPECTED: Executable by service_role / postgres ONLY. 0 rows for PUBLIC, anon, authenticated.

-- ------------------------------------------------------------------------------
-- CHECK 3: refresh_materialized_views Execution Boundary (DEF-015)
-- Must NOT be executable by anon, authenticated, or PUBLIC
-- ------------------------------------------------------------------------------
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'refresh_materialized_views'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY grantee;
-- EXPECTED: Exactly 0 rows.

-- ------------------------------------------------------------------------------
-- CHECK 4: SECURITY DEFINER Functions search_path Enforcement (DEF-015)
-- ------------------------------------------------------------------------------
SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) LIKE '%search_path%' AS has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'refresh_materialized_views', 'get_user_dashboard', 'global_search',
    'get_feed', 'get_issues', 'get_trending_hashtags', 'get_constituency_stats',
    'check_dm_blocklist_trigger', 'update_conversation_last_message',
    'verify_and_activate_page_pro'
  )
ORDER BY p.proname;
-- EXPECTED: All functions have prosecdef = true and has_search_path = true.

-- ------------------------------------------------------------------------------
-- CHECK 5: lmx_departments Column Privileges & Policies (DEF-016)
-- ------------------------------------------------------------------------------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'lmx_departments'
ORDER BY policyname;
-- EXPECTED: "Public read active verified departments" present.

SELECT column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'lmx_departments'
  AND column_name IN ('webhook_url', 'contact_phone', 'contact_email')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
-- EXPECTED: Exactly 0 rows (sensitive delivery columns hidden from untrusted callers).

-- ------------------------------------------------------------------------------
-- CHECK 6: Table Owner Safeguard Policies (DEF-017)
-- ------------------------------------------------------------------------------
SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('page_pro_orders', 'campaign_recharge_orders', 'user_profiles')
  AND policyname LIKE 'Table owner full access%'
ORDER BY tablename;
-- EXPECTED: 3 rows: owner policies for page_pro_orders, campaign_recharge_orders, user_profiles.

-- ------------------------------------------------------------------------------
-- CHECK 7: FORCE ROW LEVEL SECURITY Verification on all 21 Reconciled Tables (DEF-017)
-- ------------------------------------------------------------------------------
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'civic_issues', 'user_profiles', 'posts', 'election_promises', 'notification_log',
    'leadership_modules', 'community_challenges', 'aspirant_profiles', 'political_shorts',
    'live_events', 'lmx_departments', 'lmx_department_alerts', 'lmx_credibility',
    'lmx_affiliations', 'lmx_brand_kits', 'user_follows', 'conversations', 'messages',
    'trai_opt_outs', 'page_pro_orders', 'campaign_recharge_orders'
  )
ORDER BY c.relname;
-- EXPECTED: Exactly 21 rows, all with rls_enabled = true AND rls_forced = true.
