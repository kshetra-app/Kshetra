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
