-- ==============================================================================
-- Production Prerequisites Part A: Governance, Commerce & Security Foundation
-- Migrations: 035-037 (Campaign Recharge, Foundation Repair, Page Pro Orders)
--             038 (Security Baseline & RLS Hardening)
--             039 (Data Governance Foundation: Datasets, Provenance, Evidence)
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migrations 035-037 Commerce & Core Foundation
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- W009-B5-R3A-R4: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (035 -> 037)
-- Remediation: Authoritative Migration 035 UTF-8 BOM (U+FEFF) Defect Eliminated
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Order: 035_campaign_recharge_orders.sql -> 036_foundation_and_grants_repair.sql -> 037_page_pro_orders.sql
-- Invariant: Migration bodies are 100% byte-for-byte exact matches of corrected sources.
-- Transaction: Atomic (all 3 migrations apply together or rollback).
-- Zero BOM Guarantee: Exactly 0 U+FEFF characters across the entire file.
-- ==============================================================================

-- ============================================================
-- Migration 035: Durable Campaign Recharge Orders & Atomic Verification
-- Authoritative persistence for wallet recharge lifecycle and idempotency
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_order_id TEXT NOT NULL UNIQUE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr >= 100),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  provider_payment_id TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recharge_orders_politician ON campaign_recharge_orders(politician_id);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_status ON campaign_recharge_orders(status);

-- Enforce partial uniqueness for provider_payment_id when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_orders_payment_id
  ON campaign_recharge_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE campaign_recharge_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicians read own recharge orders" ON campaign_recharge_orders
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Politicians create own recharge orders" ON campaign_recharge_orders
  FOR INSERT WITH CHECK (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

-- Atomic verification and wallet credit RPC
CREATE OR REPLACE FUNCTION verify_and_credit_recharge(
  p_provider_order_id TEXT,
  p_politician_id UUID,
  p_amount_inr NUMERIC,
  p_payment_reference TEXT,
  p_provider_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_new_balance NUMERIC;
  v_new_recharged NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Lock and retrieve the order row
  SELECT * INTO v_order
  FROM campaign_recharge_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'PAYMENT_ORDER_NOT_FOUND', 'message', 'Recharge order not found');
  END IF;

  -- 2. Verify order ownership
  IF v_order.politician_id <> p_politician_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'message', 'Cross-wallet recharge verification rejected');
  END IF;

  -- 3. Verify amount consistency
  IF v_order.amount_inr <> p_amount_inr THEN
    RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_MISMATCH', 'message', 'Amount mismatch with registered order');
  END IF;

  -- 4. Idempotency / Replay Check
  IF v_order.status = 'completed' THEN
    SELECT * INTO v_wallet FROM campaign_wallets WHERE politician_id = p_politician_id;
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'code', 'ALREADY_COMPLETED',
      'message', 'Payment already verified and credited previously. Idempotent replay acknowledged.',
      'wallet', jsonb_build_object(
        'politicianId', p_politician_id,
        'balanceINR', v_wallet.balance_inr,
        'totalRechargedINR', v_wallet.total_recharged_inr
      )
    );
  END IF;

  -- 5. Lock and update campaign wallet
  SELECT * INTO v_wallet
  FROM campaign_wallets
  WHERE politician_id = p_politician_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO campaign_wallets (politician_id, balance_inr, total_recharged_inr, total_spent_inr, currency, created_at, updated_at)
    VALUES (p_politician_id, p_amount_inr, p_amount_inr, 0.00, 'INR', v_now, v_now)
    RETURNING * INTO v_wallet;
    v_new_balance := p_amount_inr;
    v_new_recharged := p_amount_inr;
  ELSE
    v_new_balance := v_wallet.balance_inr + p_amount_inr;
    v_new_recharged := v_wallet.total_recharged_inr + p_amount_inr;
    UPDATE campaign_wallets
    SET balance_inr = v_new_balance,
        total_recharged_inr = v_new_recharged,
        updated_at = v_now
    WHERE id = v_wallet.id;
  END IF;

  -- 6. Insert durable wallet transaction record
  INSERT INTO wallet_transactions (
    wallet_id,
    politician_id,
    type,
    amount_inr,
    service_type,
    reference_id,
    description,
    balance_after_inr,
    created_at
  ) VALUES (
    v_wallet.id,
    p_politician_id,
    'credit',
    p_amount_inr,
    'recharge',
    p_payment_reference,
    'Recharge via Razorpay/UPI (₹' || p_amount_inr || ')',
    v_new_balance,
    v_now
  );

  -- 7. Mark recharge order as completed atomically
  UPDATE campaign_recharge_orders
  SET status = 'completed',
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
      payment_reference = p_payment_reference,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'wallet', jsonb_build_object(
      'politicianId', p_politician_id,
      'balanceINR', v_new_balance,
      'totalRechargedINR', v_new_recharged
    )
  );
END;
$$;
-- ============================================================
-- Migration 036: Foundation and Grants Repair
-- Remediates DEF-013: Syntax error 0A000 in global_search RPC
-- ============================================================

-- In PostgreSQL, an ORDER BY clause cannot directly terminate a series of
-- UNION ALL subqueries without enclosing the unified set in an outer SELECT.
-- This migration replaces global_search with the properly parenthesized query.

CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  title TEXT,
  subtitle TEXT,
  relevance REAL
) AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    search_results.entity_type,
    search_results.entity_id,
    search_results.title,
    search_results.subtitle,
    search_results.relevance
  FROM (
    -- Constituencies
    SELECT
      'constituency'::TEXT AS entity_type,
      c.id AS entity_id,
      c.name AS title,
      (c.district || ' · AC#' || c.ac_no) AS subtitle,
      ts_rank(c.fts, tsq) AS relevance
    FROM constituencies c
    WHERE c.fts @@ tsq AND (p_state_code IS NULL OR c.state_code = p_state_code)

    UNION ALL

    -- Civic issues
    SELECT
      'issue'::TEXT AS entity_type,
      ci.id::TEXT AS entity_id,
      ci.title AS title,
      (ci.category || ' · ' || ci.status) AS subtitle,
      ts_rank(ci.fts, tsq) AS relevance
    FROM civic_issues ci
    WHERE ci.fts @@ tsq AND (p_state_code IS NULL OR ci.state_code = p_state_code)

    UNION ALL

    -- Headlines
    SELECT
      'headline'::TEXT AS entity_type,
      h.id::TEXT AS entity_id,
      h.title AS title,
      h.source_name AS subtitle,
      ts_rank(h.fts, tsq) AS relevance
    FROM headlines h
    WHERE h.fts @@ tsq AND (p_state_code IS NULL OR h.state_code = p_state_code)

    UNION ALL

    -- Legislator profiles
    SELECT
      'legislator'::TEXT AS entity_type,
      lp.id AS entity_id,
      lp.display_name AS title,
      (lp.current_party || ' · ' || lp.constituency_name) AS subtitle,
      CASE
        WHEN lp.display_name ILIKE '%' || p_query || '%' THEN 1.0
        WHEN lp.full_name ILIKE '%' || p_query || '%' THEN 0.9
        WHEN lp.constituency_name ILIKE '%' || p_query || '%' THEN 0.7
        ELSE 0.3
      END::REAL AS relevance
    FROM legislator_profiles lp
    WHERE (
      lp.display_name ILIKE '%' || p_query || '%'
      OR lp.full_name ILIKE '%' || p_query || '%'
      OR lp.constituency_name ILIKE '%' || p_query || '%'
      OR lp.current_party ILIKE '%' || p_query || '%'
    )
    AND (p_state_code IS NULL OR lp.state_code = p_state_code)
  ) search_results
  ORDER BY search_results.relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Explicitly enforce least-privilege execution boundary for SECURITY DEFINER RPC
REVOKE EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
-- ============================================================
-- Migration 037: Durable Pages Pro Payment Orders & Verification
-- Replaces in-memory order registry with durable PostgreSQL table
-- and provides atomic verify_and_activate_page_pro RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS page_pro_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_order_id TEXT NOT NULL UNIQUE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL DEFAULT 'pages_pro' CHECK (product = 'pages_pro'),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise IN (49900, 499900)),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed', 'cancelled')),
  provider_payment_id TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_page_pro_orders_provider_order ON page_pro_orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_page_pro_orders_page ON page_pro_orders(page_id);
CREATE INDEX IF NOT EXISTS idx_page_pro_orders_user ON page_pro_orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_pro_orders_payment_id
  ON page_pro_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE page_pro_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and page owners read own pro orders" ON page_pro_orders;
CREATE POLICY "Users and page owners read own pro orders" ON page_pro_orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Internal server secrets table accessible ONLY to db owner / superuser and SECURITY DEFINER functions.
-- Client-accessible roles (PUBLIC, anon, authenticated, service_role) have ALL privileges revoked.
CREATE TABLE IF NOT EXISTS internal_payment_secrets (
  provider TEXT PRIMARY KEY,
  key_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE internal_payment_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE internal_payment_secrets FROM PUBLIC, anon, authenticated, service_role;

-- Drop older overloads if present
DROP FUNCTION IF EXISTS verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Atomic verification and entitlement activation RPC with authoritative server-held secret
CREATE OR REPLACE FUNCTION verify_and_activate_page_pro(
  p_provider_order_id TEXT,
  p_page_id UUID,
  p_user_id UUID,
  p_provider_payment_id TEXT,
  p_signature TEXT,
  p_billing_cycle TEXT DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_expiry TIMESTAMPTZ;
  v_secret TEXT;
  v_expected_signature TEXT;
BEGIN
  -- 0. Authoritative Cryptographic Payment Verification Invariant at Transaction Boundary
  -- Retrieve secret exclusively from trusted database store / server configuration
  SELECT key_secret INTO v_secret
  FROM internal_payment_secrets
  WHERE provider = 'razorpay';

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := NULLIF(current_setting('app.settings.razorpay_key_secret', true), '');
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'KEY_SECRET_MISSING',
      'message', 'Cryptographic verification key secret is missing or unconfigured'
    );
  END IF;

  IF p_signature IS NULL OR trim(p_signature) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_SIGNATURE',
      'message', 'Cryptographic payment signature is required'
    );
  END IF;

  IF p_provider_order_id IS NULL OR trim(p_provider_order_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_ORDER_ID',
      'message', 'Provider order ID is required'
    );
  END IF;

  IF p_provider_payment_id IS NULL OR trim(p_provider_payment_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_PAYMENT_ID',
      'message', 'Provider payment ID is required'
    );
  END IF;

  -- Independently compute HMAC-SHA256(order_id|payment_id, secret) using pgcrypto
  v_expected_signature := encode(hmac((p_provider_order_id || '|' || p_provider_payment_id)::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_signature)) <> lower(v_expected_signature) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_SIGNATURE',
      'message', 'Cryptographic payment signature verification failed at transaction boundary'
    );
  END IF;

  -- 1. Lock and retrieve the order row
  SELECT * INTO v_order
  FROM page_pro_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Page Pro order not found'
    );
  END IF;

  -- 2. Verify page association
  IF v_order.page_id <> p_page_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAGE_ORDER_MISMATCH',
      'message', 'Payment order was not created for this page'
    );
  END IF;

  -- 3. Verify user association (unless admin)
  IF v_order.user_id <> p_user_id AND NOT p_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_PRINCIPAL_MISMATCH',
      'message', 'Payment order was created by a different user'
    );
  END IF;

  -- 4. Verify billing cycle consistency
  IF p_billing_cycle IS NOT NULL AND v_order.billing_cycle <> p_billing_cycle THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BILLING_CYCLE_MISMATCH',
      'message', 'Billing cycle does not match the created order'
    );
  END IF;

  -- 5. Idempotency / replay check
  IF v_order.status = 'completed' THEN
    IF v_order.provider_payment_id = p_provider_payment_id THEN
      SELECT pro_expires_at INTO v_expiry FROM pages WHERE id = v_order.page_id;
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'code', 'ENTITLEMENT_ALREADY_ACTIVE',
        'message', 'Payment already verified and Pro entitlement activated previously. Idempotent replay acknowledged.',
        'pageId', v_order.page_id,
        'expiresAt', v_expiry
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ORDER_ALREADY_CONSUMED',
        'message', 'Payment order has already been verified with a different payment'
      );
    END IF;
  END IF;

  -- 6. Calculate expiry
  IF v_order.billing_cycle = 'annual' THEN
    v_expiry := v_now + INTERVAL '365 days';
  ELSE
    v_expiry := v_now + INTERVAL '30 days';
  END IF;

  -- 7. Atomically mark order as completed
  UPDATE page_pro_orders
  SET status = 'completed',
      provider_payment_id = p_provider_payment_id,
      signature_verified = true,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  -- 8. Atomically update pages table
  UPDATE pages
  SET is_pro = true,
      pro_subscription_id = p_provider_payment_id,
      pro_expires_at = v_expiry,
      updated_at = v_now
  WHERE id = v_order.page_id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'code', 'ENTITLEMENT_ACTIVATED',
    'message', 'Page Pro subscription successfully activated',
    'pageId', v_order.page_id,
    'expiresAt', v_expiry
  );
END;
$$;

-- Revoke execution from public/anon/authenticated; restrict to service role
REVOKE ALL ON FUNCTION verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 038 Security Baseline & RLS Hardening
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- W010: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (038)
-- Security Baseline & Row Level Security Hardening
-- Remediated Defects: DEF-014, DEF-015, DEF-016, DEF-017
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Authoritative Source: supabase/migrations/038_security_baseline_and_rls_hardening.sql
-- Invariant: 100% byte-for-byte exact match of canonical Migration 038.
-- Transaction: Atomic (all objects apply together or rollback).
-- Zero BOM Guarantee: Exactly 0 U+FEFF characters across the entire file.
-- ==============================================================================

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
ALTER FUNCTION public.get_feed(TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_issues(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.global_search(TEXT, TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_trending_hashtags(TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_constituency_stats(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_dm_blocklist_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public, pg_temp;

-- Hardened get_user_dashboard with caller authorization check (preserving authentic 11-column return table)
CREATE OR REPLACE FUNCTION public.get_user_dashboard(p_user_id UUID)
RETURNS TABLE (
  posts_count INTEGER,
  issues_reported INTEGER,
  issues_resolved INTEGER,
  upvotes_received BIGINT,
  comments_given BIGINT,
  reputation_score INTEGER,
  civic_score INTEGER,
  favorites_count BIGINT,
  tier TEXT,
  display_name TEXT,
  role TEXT
) AS $$
BEGIN
  -- Restrict metrics inspection to own user account or service_role
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Access denied: cannot inspect another user dashboard';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(up.post_count, 0) AS posts_count,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id) AS issues_reported,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id AND ci.status = 'resolved') AS issues_resolved,
    (SELECT COUNT(*) FROM issue_upvotes iu JOIN civic_issues ci ON ci.id = iu.issue_id WHERE ci.reporter_id = p_user_id) AS upvotes_received,
    (SELECT COUNT(*) FROM issue_comments ic WHERE ic.user_id = p_user_id) AS comments_given,
    COALESCE(up.reputation_score, 0) AS reputation_score,
    COALESCE(ap.civic_score, 0) AS civic_score,
    (SELECT COUNT(*) FROM favorites f WHERE f.user_id = p_user_id) AS favorites_count,
    COALESCE(us.tier, 'free') AS tier,
    COALESCE(up.display_name, 'Anonymous') AS display_name,
    COALESCE(up.role, 'citizen') AS role
  FROM user_profiles up
  LEFT JOIN aspirant_profiles ap ON ap.user_id = p_user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p_user_id
  WHERE up.user_id = p_user_id;
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

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 039 Data Governance & Provenance Architecture
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- W012: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (039)
-- Data Governance Foundation & Provenance Architecture
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Authoritative Source: supabase/migrations/039_data_governance_foundation.sql
-- Invariant: 100% semantic match of canonical Migration 039.
-- Transaction: Atomic (all objects apply together or rollback).
-- Zero BOM Guarantee: Exactly 0 U+FEFF characters across the entire file.
-- ==============================================================================

-- ─── 1. ENUM DEFINITIONS ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE source_authority_enum AS ENUM (
    'constitutional',
    'statutory',
    'academic',
    'media_ngo',
    'crowdsourced',
    'synthetic_model'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'ESTIMATE',
    'SCENARIO',
    'INFERRED',
    'UNVERIFIED',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 2. DATA SOURCES REGISTRY ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  authority_level source_authority_enum NOT NULL,
  canonical_url TEXT,
  license TEXT,
  retrieval_method TEXT,
  refresh_frequency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_sources IS 'Canonical registry of primary data publishers and institutional authority levels.';
COMMENT ON COLUMN data_sources.authority_level IS 'Institutional authority of the source (decoupled from individual record data status).';

-- ─── 3. DATASETS CATALOG ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'geography',
    'election',
    'political_profiles',
    'civic_governance',
    'news',
    'demographics',
    'election_projection',
    'other'
  )),
  description TEXT,
  source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE datasets IS 'Governed dataset entities across all civic and electoral domains.';

-- ─── 4. DATASET VERSIONS (IMMUTABLE SNAPSHOTS) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS dataset_versions (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  version_tag TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  storage_path TEXT,
  default_status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  verification_evidence_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, version_tag)
);

COMMENT ON TABLE dataset_versions IS 'Immutable snapshots of datasets with checksums and temporal validity.';
COMMENT ON COLUMN dataset_versions.default_status IS 'Default factual status for records in this version; strictly defaults to UNKNOWN.';

-- ─── 5. EVIDENCE RECORDS (AUTHORITATIVE VERIFICATION EVIDENCE) ─────────────────

CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  artifact_name TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  verification_authority TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE evidence_records IS 'Cryptographically auditable evidence records required for status elevation to OFFICIAL.';

-- Add reciprocal foreign key on dataset_versions now that evidence_records exists
DO $$ BEGIN
  ALTER TABLE dataset_versions
    ADD CONSTRAINT fk_dataset_versions_evidence
    FOREIGN KEY (verification_evidence_id)
    REFERENCES evidence_records(id)
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 6. PROVENANCE RECORDS (APPEND-ONLY LINEAGE DAG) ───────────────────────────

CREATE TABLE IF NOT EXISTS provenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  source_record_id TEXT,
  parent_provenance_id UUID REFERENCES provenance_records(id) ON DELETE RESTRICT,
  status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  transform_version TEXT,
  operator TEXT NOT NULL DEFAULT 'system',
  verified_by TEXT,
  verification_evidence_id UUID REFERENCES evidence_records(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE provenance_records IS 'Append-only provenance lineage nodes forming a DAG of source and transformation history.';
COMMENT ON COLUMN provenance_records.parent_provenance_id IS 'Self-referencing foreign key linking sequential transformation steps.';
COMMENT ON COLUMN provenance_records.verification_evidence_id IS 'Reference to authoritative evidence record required for OFFICIAL status elevation.';

-- ─── 7. RECORD PROVENANCE LINKAGES (M:N DOMAIN LINKAGE) ────────────────────────

CREATE TABLE IF NOT EXISTS record_provenance_linkages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_table TEXT NOT NULL,
  domain_record_id TEXT NOT NULL,
  provenance_id UUID NOT NULL REFERENCES provenance_records(id) ON DELETE RESTRICT,
  is_canonical BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_table, domain_record_id, provenance_id)
);

COMMENT ON TABLE record_provenance_linkages IS 'M:N association connecting governed domain records to one or more provenance lineage nodes.';

-- ─── 8. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_data_sources_authority ON data_sources(authority_level);
CREATE INDEX IF NOT EXISTS idx_datasets_source ON datasets(source_id);
CREATE INDEX IF NOT EXISTS idx_datasets_domain ON datasets(domain);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset ON dataset_versions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_status ON dataset_versions(default_status);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_evidence ON dataset_versions(verification_evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_version ON evidence_records(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_version ON provenance_records(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_parent ON provenance_records(parent_provenance_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_status ON provenance_records(status);
CREATE INDEX IF NOT EXISTS idx_provenance_records_evidence ON provenance_records(verification_evidence_id);
CREATE INDEX IF NOT EXISTS idx_record_provenance_lookup ON record_provenance_linkages(domain_table, domain_record_id, is_canonical);
CREATE INDEX IF NOT EXISTS idx_record_provenance_prov ON record_provenance_linkages(provenance_id);

-- ─── 9. SECURITY & INVARIANT FUNCTIONS AND TRIGGERS ────────────────────────────

-- Trigger Function: Enforce evidence_records immutability (No updates, no deletions)
CREATE OR REPLACE FUNCTION prevent_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Authoritative verification evidence records are permanent and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Authoritative verification evidence records are immutable and cannot be modified in place. Register a new evidence record instead.';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON evidence_records;
CREATE TRIGGER trg_prevent_evidence_mutation
  BEFORE UPDATE OR DELETE ON evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evidence_mutation();

-- Trigger Function: Enforce dataset_versions snapshot immutability
CREATE OR REPLACE FUNCTION prevent_dataset_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Historical dataset versions are immutable and cannot be deleted. Archive or supersede instead.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id != NEW.id OR
       OLD.dataset_id != NEW.dataset_id OR
       OLD.version_tag != NEW.version_tag OR
       OLD.effective_from IS DISTINCT FROM NEW.effective_from OR
       OLD.effective_to IS DISTINCT FROM NEW.effective_to OR
       OLD.retrieved_at != NEW.retrieved_at OR
       OLD.record_count != NEW.record_count OR
       OLD.checksum_sha256 IS DISTINCT FROM NEW.checksum_sha256 OR
       OLD.storage_path IS DISTINCT FROM NEW.storage_path OR
       OLD.metadata != NEW.metadata OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Historical dataset version snapshots cannot be modified in place. Register a new version snapshot instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dataset_version_mutation ON dataset_versions;
CREATE TRIGGER trg_prevent_dataset_version_mutation
  BEFORE UPDATE OR DELETE ON dataset_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_dataset_version_mutation();

-- Trigger Function: Enforce dataset_versions status transition invariants & mandatory evidence
CREATE OR REPLACE FUNCTION check_version_status_transition_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Invariant 1: SCENARIO -> OFFICIAL is PERMANENTLY PROHIBITED
  IF OLD.default_status = 'SCENARIO' AND NEW.default_status = 'OFFICIAL' THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: SCENARIO dataset versions cannot be elevated to OFFICIAL status. Projections/scenarios must remain permanently distinct from verified official records.';
  END IF;

  -- Invariant 2: Transition to OFFICIAL requires authorized role AND authoritative evidence record
  IF NEW.default_status = 'OFFICIAL' AND (OLD.default_status IS DISTINCT FROM 'OFFICIAL') THEN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND coalesce(auth.role(), '') != 'service_role' THEN
      RAISE EXCEPTION 'AUTHORIZATION DENIED: Elevating dataset version to OFFICIAL status requires authorized administrative role (current_user: %, auth.role: %)', current_user, coalesce(auth.role(), 'none');
    END IF;

    IF NEW.verification_evidence_id IS NULL THEN
      RAISE EXCEPTION 'EVIDENCE REQUIRED: Elevating dataset version to OFFICIAL requires an authoritative verification_evidence_id link.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM evidence_records WHERE id = NEW.verification_evidence_id) THEN
      RAISE EXCEPTION 'EVIDENCE NOT FOUND: verification_evidence_id % does not match any valid evidence record in evidence_records.', NEW.verification_evidence_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_version_status_transition ON dataset_versions;
CREATE TRIGGER trg_check_version_status_transition
  BEFORE UPDATE ON dataset_versions
  FOR EACH ROW
  EXECUTE FUNCTION check_version_status_transition_invariant();

-- Trigger Function: Enforce append-only immutability of historical provenance lineage fields
CREATE OR REPLACE FUNCTION prevent_provenance_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Provenance lineage records are append-only and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Immutable historical fields (Classification A)
    IF OLD.id != NEW.id OR
       OLD.dataset_version_id != NEW.dataset_version_id OR
       OLD.source_record_id IS DISTINCT FROM NEW.source_record_id OR
       OLD.parent_provenance_id IS DISTINCT FROM NEW.parent_provenance_id OR
       OLD.transformation_type != NEW.transformation_type OR
       OLD.transform_version IS DISTINCT FROM NEW.transform_version OR
       OLD.operator != NEW.operator OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Historical provenance lineage fields cannot be modified in place. Append a new provenance record instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_provenance_mutation ON provenance_records;
CREATE TRIGGER trg_prevent_provenance_mutation
  BEFORE UPDATE OR DELETE ON provenance_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_provenance_mutation();

-- Trigger Function: Enforce status transition security and permanently block SCENARIO -> OFFICIAL on provenance
CREATE OR REPLACE FUNCTION check_status_transition_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Invariant 1: SCENARIO -> OFFICIAL is PERMANENTLY PROHIBITED
  IF OLD.status = 'SCENARIO' AND NEW.status = 'OFFICIAL' THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: SCENARIO records cannot be elevated to OFFICIAL status. Projections/scenarios must remain permanently distinct from verified official records.';
  END IF;

  -- Invariant 2: Transition to OFFICIAL from non-official requires authoritative evidence and authorized service_role
  IF NEW.status = 'OFFICIAL' AND (OLD.status IS DISTINCT FROM 'OFFICIAL') THEN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND coalesce(auth.role(), '') != 'service_role' THEN
      RAISE EXCEPTION 'AUTHORIZATION DENIED: Elevating record to OFFICIAL status requires authorized administrative role (current_user: %, auth.role: %)', current_user, coalesce(auth.role(), 'none');
    END IF;

    IF NEW.verification_evidence_id IS NULL THEN
      RAISE EXCEPTION 'EVIDENCE REQUIRED: Elevating status to OFFICIAL requires an authoritative verification_evidence_id link.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM evidence_records WHERE id = NEW.verification_evidence_id) THEN
      RAISE EXCEPTION 'EVIDENCE NOT FOUND: verification_evidence_id % does not match any valid evidence record in evidence_records.', NEW.verification_evidence_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_provenance_status_transition ON provenance_records;
CREATE TRIGGER trg_check_provenance_status_transition
  BEFORE UPDATE ON provenance_records
  FOR EACH ROW
  EXECUTE FUNCTION check_status_transition_invariant();

-- ─── 10. ROW LEVEL SECURITY (RLS) & PUBLIC VISIBILITY GOVERNANCE ────────────────

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_provenance_linkages ENABLE ROW LEVEL SECURITY;

ALTER TABLE data_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE dataset_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_records FORCE ROW LEVEL SECURITY;
ALTER TABLE provenance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE record_provenance_linkages FORCE ROW LEVEL SECURITY;

-- 10.1 Column-Level Privilege Classification:
-- Untrusted roles (anon, authenticated, PUBLIC) receive SELECT on public transparency columns ONLY.
-- Internal administrative columns (operator, verified_by, verification_notes, storage_path, metadata)
-- are strictly restricted to service_role and administrative roles.

REVOKE ALL ON data_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active, created_at, updated_at) ON data_sources TO anon, authenticated;
GRANT ALL ON data_sources TO service_role;

REVOKE ALL ON datasets FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, domain, description, source_id, license, created_at, updated_at) ON datasets TO anon, authenticated;
GRANT ALL ON datasets TO service_role;

REVOKE ALL ON dataset_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_id, version_tag, effective_from, effective_to, retrieved_at, record_count, checksum_sha256, default_status, verification_evidence_id, created_at) ON dataset_versions TO anon, authenticated;
GRANT ALL ON dataset_versions TO service_role;

REVOKE ALL ON evidence_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_version_id, artifact_name, artifact_sha256, verification_authority, verified_at, created_at) ON evidence_records TO anon, authenticated;
GRANT ALL ON evidence_records TO service_role;

REVOKE ALL ON provenance_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_version_id, source_record_id, parent_provenance_id, status, transformation_type, transform_version, verification_evidence_id, created_at) ON provenance_records TO anon, authenticated;
GRANT ALL ON provenance_records TO service_role;

REVOKE ALL ON record_provenance_linkages FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, domain_table, domain_record_id, provenance_id, is_canonical, created_at) ON record_provenance_linkages TO anon, authenticated;
GRANT ALL ON record_provenance_linkages TO service_role;

-- 10.2 Row Level Security Policies:
-- Public read policies for transparency
DROP POLICY IF EXISTS "Public read data_sources" ON data_sources;
CREATE POLICY "Public read data_sources" ON data_sources FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public read datasets" ON datasets;
CREATE POLICY "Public read datasets" ON datasets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read dataset_versions" ON dataset_versions;
CREATE POLICY "Public read dataset_versions" ON dataset_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read evidence_records" ON evidence_records;
CREATE POLICY "Public read evidence_records" ON evidence_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read provenance_records" ON provenance_records;
CREATE POLICY "Public read provenance_records" ON provenance_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read record_provenance_linkages" ON record_provenance_linkages;
CREATE POLICY "Public read record_provenance_linkages" ON record_provenance_linkages FOR SELECT TO anon, authenticated USING (true);

-- Service role full access policies
DROP POLICY IF EXISTS "Service role full access on data_sources" ON data_sources;
CREATE POLICY "Service role full access on data_sources" ON data_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on datasets" ON datasets;
CREATE POLICY "Service role full access on datasets" ON datasets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on dataset_versions" ON dataset_versions;
CREATE POLICY "Service role full access on dataset_versions" ON dataset_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on evidence_records" ON evidence_records;
CREATE POLICY "Service role full access on evidence_records" ON evidence_records FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on provenance_records" ON provenance_records;
CREATE POLICY "Service role full access on provenance_records" ON provenance_records FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on record_provenance_linkages" ON record_provenance_linkages;
CREATE POLICY "Service role full access on record_provenance_linkages" ON record_provenance_linkages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 11. CONTROLLED SOURCE SEEDS ───────────────────────────────────────────────

INSERT INTO data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  (
    'eci',
    'Election Commission of India',
    'Election Commission of India',
    'constitutional',
    'https://results.eci.gov.in',
    'Government Open Data',
    'automated_polling',
    'event_driven',
    true
  ),
  (
    'prs_india',
    'PRS Legislative Research',
    'PRS Legislative Research',
    'academic',
    'https://prsindia.org',
    'Research / Public Reference',
    'curated_scraper',
    'monthly',
    true
  ),
  (
    'myneta',
    'National Election Watch / ADR MyNeta',
    'Association for Democratic Reforms',
    'media_ngo',
    'https://www.myneta.info',
    'Public Domain / Fair Use Reporting',
    'html_scraper',
    'election_cycle',
    true
  ),
  (
    'datta07_shapefiles',
    'Indian Shapefiles Repository (datta07)',
    'Open Source GIS Community / datta07',
    'crowdsourced',
    'https://github.com/datta07/INDIAN-SHAPEFILES',
    'MIT',
    'git_lfs_clone',
    'manual_update',
    true
  ),
  (
    'synthetic_projection_model',
    'PANIN Electoral Simulation & Projection Engine',
    'PANIN Research & Modeling',
    'synthetic_model',
    'internal://models/delimitation_projection',
    'Proprietary Research Test Harness',
    'compute_pipeline',
    'on_demand',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url,
  license = EXCLUDED.license,
  retrieval_method = EXCLUDED.retrieval_method,
  refresh_frequency = EXCLUDED.refresh_frequency,
  updated_at = now();

-- ─── 12. BOUNDED REPRESENTATIVE ACCEPTANCE DATASETS ────────────────────────────

-- 1. Geography: Assembly Boundaries
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'geo_assembly_boundaries',
  'Telangana Assembly Constituencies GeoJSON',
  'geography',
  'Pre-delimitation 2008 assembly constituency boundaries sourced from community shapefiles.',
  'datta07_shapefiles',
  'MIT'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'geo_assembly_boundaries_v2008',
  'geo_assembly_boundaries',
  '2008_delimitation',
  '2008-01-01',
  NULL,
  119,
  'UNVERIFIED',
  '{"note": "Pre-delimitation 2008 boundary snapshot; source authority crowdsourced; data status unverified."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'geo_assembly_boundaries_v2008',
  'STATES/TELANGANA/TELANGANA_ASSEMBLY.geojson',
  'UNVERIFIED',
  'raw_shapefile_import',
  'v1.0.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Political: Telangana 2023 MLA Profiles
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'telangana_2023_mla_profiles',
  'Telangana 2023 Assembly Legislator Profiles',
  'political_profiles',
  'Elected MLA demographic, financial, and criminal affidavit profiles.',
  'myneta',
  'Public Domain / Fair Use Reporting'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'telangana_2023_mla_v1',
  'telangana_2023_mla_profiles',
  '2023_assembly',
  '2023-12-03',
  NULL,
  119,
  'UNVERIFIED',
  '{"election_year": 2023, "state": "Telangana"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'telangana_2023_mla_v1',
  'Telangana2023.json',
  'UNVERIFIED',
  'web_scrape_profile_build',
  'v1.2.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Civic: Bills & Schemes
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'civic_bills_schemes',
  'Civic Bills and Welfare Schemes Catalog',
  'civic_governance',
  'Government schemes and legislative bills catalog for civic monitoring.',
  'prs_india',
  'Research / Public Reference'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'civic_schemes_v1',
  'civic_bills_schemes',
  'v1.0',
  NULL,
  NULL,
  10,
  'UNKNOWN',
  '{"status": "baseline_catalog", "evidence": "NOT_ESTABLISHED"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'civic_schemes_v1',
  'migration_018_seed',
  'UNKNOWN',
  'mock_seed_insert',
  'v1.0.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Projection / Simulation: Tamil Nadu 2026 Simulation
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'tamil_nadu_2026_projection',
  'Tamil Nadu 2026 Assembly Election Simulation & Projection',
  'election_projection',
  'Synthetic electoral projection fixture for future 2026 election boundary simulation.',
  'myneta',
  'Research Simulation'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'tn_2026_proj_v1',
  'tamil_nadu_2026_projection',
  '2026_simulation_v1',
  NULL,
  NULL,
  208,
  'SCENARIO',
  '{"projection_model": "synthetic_simulation", "target_year": 2026, "invariant_test_fixture": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'tn_2026_proj_v1',
  'TamilNadu2026.json',
  'SCENARIO',
  'synthetic_projection_simulation',
  'v1.0.0-sim',
  'simulation_engine'
)
ON CONFLICT (id) DO NOTHING;


-- Defensive patch: Ensure public.provenance_records has all 039 columns even if pre-created by 050
ALTER TABLE public.provenance_records
  ADD COLUMN IF NOT EXISTS dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_record_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  ADD COLUMN IF NOT EXISTS transform_version TEXT,
  ADD COLUMN IF NOT EXISTS operator TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;


COMMIT;
