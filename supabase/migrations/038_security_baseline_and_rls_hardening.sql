-- ==============================================================================
-- Migration 038: Security Baseline & Row Level Security Hardening (W010)
-- Target: Staging & Production Supabase
-- Defects Remediated: DEF-014, DEF-015, DEF-016, DEF-017
-- ==============================================================================

BEGIN;

-- ─── 1. DEF-014: REMEDIATE TRAI OPT-OUT PRIVACY EXPOSURE ──────────────────────
-- Drop overly permissive public read and insert policies
DROP POLICY IF EXISTS "Anyone can check opt-outs" ON trai_opt_outs;
DROP POLICY IF EXISTS "Service role can insert opt-outs" ON trai_opt_outs;

-- Revoke all table-level access from PUBLIC, anon, authenticated
REVOKE ALL ON trai_opt_outs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trai_opt_outs TO service_role;

-- Restrict direct PostgREST access strictly to service_role
DROP POLICY IF EXISTS "Service role full access on trai_opt_outs" ON trai_opt_outs;
CREATE POLICY "Service role full access on trai_opt_outs" ON trai_opt_outs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cryptographic lookup RPC (accessible ONLY to service_role; anon/authenticated revoked)
CREATE OR REPLACE FUNCTION check_phone_opt_out(p_phone_number_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_phone_number_hash IS NULL OR length(p_phone_number_hash) < 32 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM trai_opt_outs
    WHERE phone_number_hash = p_phone_number_hash
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION check_phone_opt_out(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_phone_opt_out(TEXT) TO service_role;

-- ─── 2. DEF-015: ADMINISTRATIVE FUNCTION HARDENING & SEARCH_PATH ──────────────
-- Revoke administrative refresh from PUBLIC, anon, authenticated
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;
ALTER FUNCTION public.refresh_materialized_views() SET search_path = public, pg_temp;

-- Attach safe search_path to domain SECURITY DEFINER functions without breaking grants
ALTER FUNCTION public.get_feed(TEXT, TEXT, TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_issues(TEXT, TEXT, TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.global_search(TEXT, TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_trending_hashtags(TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_constituency_stats(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_dm_blocklist_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public, pg_temp;

-- Hardened get_user_dashboard with caller authorization check
CREATE OR REPLACE FUNCTION public.get_user_dashboard(p_user_id UUID)
RETURNS TABLE (
  posts_count INTEGER,
  issues_reported INTEGER,
  issues_upvoted INTEGER,
  promises_followed INTEGER,
  modules_completed INTEGER,
  reputation_score INTEGER
) AS $$
BEGIN
  -- Restrict metrics inspection to own user account or service_role
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Access denied: cannot inspect another user dashboard';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM posts WHERE author_id = p_user_id AND is_deleted = false),
    (SELECT COUNT(*)::INTEGER FROM civic_issues WHERE reporter_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM issue_upvotes WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM promise_follows WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM module_progress WHERE user_id = p_user_id AND is_completed = true),
    (SELECT COALESCE(up.reputation_score, 0) FROM user_profiles up WHERE up.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- ─── 3. DEF-016: LMX DEPARTMENTS READ POLICY & COLUMN PROTECTION ──────────────
-- Revoke all permissions on lmx_departments from untrusted roles
REVOKE ALL ON lmx_departments FROM PUBLIC, anon, authenticated;

-- Grant SELECT ONLY on non-sensitive metadata columns (excluding webhook_url, contact_phone, contact_email)
GRANT SELECT (id, department_type, office_name, jurisdiction_type, state_code, district_name, mandal_name, jurisdiction_geojson, catchment_radius_km, center_lat, center_lng, subscription_status, verified, created_at, updated_at) ON lmx_departments TO anon, authenticated;
GRANT ALL ON lmx_departments TO service_role;

-- Public read policy for active verified departments
DROP POLICY IF EXISTS "Public read active verified departments" ON lmx_departments;
CREATE POLICY "Public read active verified departments" ON lmx_departments
  FOR SELECT TO anon, authenticated
  USING (subscription_status = 'active' AND verified = true);

DROP POLICY IF EXISTS "Service role manage departments" ON lmx_departments;
CREATE POLICY "Service role manage departments" ON lmx_departments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 4. DEF-017: TABLE OWNER SAFEGUARDS & FORCE ROW LEVEL SECURITY ────────────
-- Owner safeguard policies to prevent FORCE RLS from blocking SECURITY DEFINER / service routines
DROP POLICY IF EXISTS "Table owner full access on page_pro_orders" ON page_pro_orders;
CREATE POLICY "Table owner full access on page_pro_orders" ON page_pro_orders
  FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Table owner full access on campaign_recharge_orders" ON campaign_recharge_orders;
CREATE POLICY "Table owner full access on campaign_recharge_orders" ON campaign_recharge_orders
  FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Table owner full access on user_profiles" ON user_profiles;
CREATE POLICY "Table owner full access on user_profiles" ON user_profiles
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Apply FORCE ROW LEVEL SECURITY across all 21 reconciled tables
ALTER TABLE civic_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
ALTER TABLE election_promises FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_log FORCE ROW LEVEL SECURITY;
ALTER TABLE leadership_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE community_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE aspirant_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE political_shorts FORCE ROW LEVEL SECURITY;
ALTER TABLE live_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_departments FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_department_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_credibility FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_affiliations FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_brand_kits FORCE ROW LEVEL SECURITY;
ALTER TABLE user_follows FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE trai_opt_outs FORCE ROW LEVEL SECURITY;
ALTER TABLE page_pro_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_recharge_orders FORCE ROW LEVEL SECURITY;

COMMIT;
