-- Bind SaaS tier activation to a durable, server-created provider order.
-- The API verifies the captured payment with Razorpay before calling the activation RPC.

BEGIN;

CREATE TABLE IF NOT EXISTS public.saas_billing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_key_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  previous_tier TEXT NOT NULL CHECK (previous_tier IN ('free', 'pro', 'enterprise')),
  target_tier TEXT NOT NULL CHECK (target_tier IN ('pro', 'enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL CHECK (currency = upper(currency) AND currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'superseded', 'failed', 'refunded')),
  provider_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT chk_saas_billing_paid_payment CHECK (
    (status = 'paid' AND provider_payment_id IS NOT NULL AND paid_at IS NOT NULL)
    OR (status <> 'paid' AND paid_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_billing_provider_payment
  ON public.saas_billing_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_billing_one_open_order_per_tenant
  ON public.saas_billing_orders(tenant_id)
  WHERE status = 'created';
CREATE INDEX IF NOT EXISTS idx_saas_billing_orders_tenant_created
  ON public.saas_billing_orders(tenant_id, created_at DESC);

ALTER TABLE public.saas_billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_billing_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_saas_billing_orders ON public.saas_billing_orders;
CREATE POLICY service_role_all_saas_billing_orders ON public.saas_billing_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.saas_billing_orders FROM anon, authenticated, public;
GRANT ALL ON public.saas_billing_orders TO service_role;

CREATE OR REPLACE FUNCTION public.create_saas_billing_order(
  p_provider_order_id TEXT,
  p_provider_key_id TEXT,
  p_tenant_id UUID,
  p_target_tier TEXT,
  p_billing_cycle TEXT,
  p_amount_paise BIGINT,
  p_currency TEXT DEFAULT 'INR'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant public.saas_tenants%ROWTYPE;
  v_currency TEXT := upper(coalesce(p_currency, 'INR'));
BEGIN
  SELECT * INTO v_tenant
  FROM public.saas_tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'TENANT_NOT_FOUND');
  END IF;

  IF v_tenant.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'code', 'TENANT_NOT_ACTIVE');
  END IF;

  IF p_target_tier IS NULL
     OR p_target_tier NOT IN ('pro', 'enterprise')
     OR p_billing_cycle IS NULL
     OR p_billing_cycle NOT IN ('monthly', 'annual')
     OR p_amount_paise IS NULL
     OR p_amount_paise <= 0
     OR v_currency !~ '^[A-Z]{3}$'
     OR p_provider_order_id IS NULL
     OR p_provider_key_id IS NULL
     OR p_provider_key_id = ''
     OR length(p_provider_order_id) > 128 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_BILLING_ORDER');
  END IF;

  IF v_tenant.tier = p_target_tier THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_SUBSCRIBED');
  END IF;

  -- One outstanding checkout prevents overlapping plan purchases. The API reuses
  -- an exact matching pending order; conflicting requests fail without replacing it.
  PERFORM 1
  FROM public.saas_billing_orders
  WHERE tenant_id = p_tenant_id AND status = 'created'
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'PENDING_CHECKOUT_EXISTS');
  END IF;

  INSERT INTO public.saas_billing_orders (
    provider_order_id,
    provider_key_id,
    tenant_id,
    previous_tier,
    target_tier,
    billing_cycle,
    amount_paise,
    currency
  ) VALUES (
    p_provider_order_id,
    p_provider_key_id,
    p_tenant_id,
    v_tenant.tier,
    p_target_tier,
    p_billing_cycle,
    p_amount_paise,
    v_currency
  );

  RETURN jsonb_build_object('success', true, 'providerOrderId', p_provider_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_and_activate_saas_billing_order(
  p_provider_order_id TEXT,
  p_tenant_id UUID,
  p_provider_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.saas_billing_orders%ROWTYPE;
  v_tenant public.saas_tenants%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_period_end TIMESTAMPTZ;
  v_billing JSONB;
  v_history JSONB;
  v_metadata JSONB;
BEGIN
  SELECT * INTO v_order
  FROM public.saas_billing_orders
  WHERE provider_order_id = p_provider_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  IF v_order.tenant_id <> p_tenant_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_TENANT_MISMATCH');
  END IF;

  -- Use the same tenant-before-order lock order as checkout creation to avoid deadlocks.
  SELECT * INTO v_tenant
  FROM public.saas_tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'TENANT_NOT_FOUND');
  END IF;

  SELECT * INTO v_order
  FROM public.saas_billing_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF v_order.status = 'paid' THEN
    IF v_order.provider_payment_id = p_provider_payment_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'tenantId', v_tenant.id,
        'tenantSlug', v_tenant.slug,
        'previousTier', v_order.previous_tier,
        'currentTier', v_tenant.tier,
        'subscriptionStatus', 'active',
        'activatedAt', v_order.paid_at
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_ALREADY_CONSUMED');
  END IF;

  IF v_order.status <> 'created' THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_PAYABLE');
  END IF;

  IF v_tenant.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'code', 'TENANT_NOT_ACTIVE');
  END IF;

  IF v_tenant.tier <> v_order.previous_tier THEN
    RETURN jsonb_build_object('success', false, 'code', 'TENANT_TIER_CHANGED');
  END IF;

  IF p_provider_payment_id IS NULL OR length(p_provider_payment_id) > 128 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_PAYMENT_ID');
  END IF;

  v_period_end := CASE v_order.billing_cycle
    WHEN 'annual' THEN v_now + interval '1 year'
    ELSE v_now + interval '1 month'
  END;
  v_metadata := coalesce(v_tenant.metadata, '{}'::jsonb);
  v_billing := coalesce(v_metadata->'billing', '{}'::jsonb);
  v_history := CASE
    WHEN jsonb_typeof(v_billing->'paymentHistory') = 'array' THEN v_billing->'paymentHistory'
    ELSE '[]'::jsonb
  END;
  v_history := v_history || jsonb_build_array(jsonb_build_object(
    'orderId', v_order.provider_order_id,
    'paymentId', p_provider_payment_id,
    'targetTier', v_order.target_tier,
    'billingCycle', v_order.billing_cycle,
    'amountPaise', v_order.amount_paise,
    'currency', v_order.currency,
    'verifiedAt', v_now
  ));

  v_billing := v_billing || jsonb_build_object(
    'status', 'active',
    'currentTier', v_order.target_tier,
    'billingCycle', v_order.billing_cycle,
    'currentPeriodStart', v_now,
    'currentPeriodEnd', v_period_end,
    'lastPaymentId', p_provider_payment_id,
    'lastOrderId', v_order.provider_order_id,
    'paymentHistory', v_history
  );
  v_metadata := v_metadata || jsonb_build_object('billing', v_billing);

  UPDATE public.saas_tenants
  SET tier = v_order.target_tier,
      metadata = v_metadata,
      updated_at = v_now
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  UPDATE public.saas_billing_orders
  SET status = 'paid',
      provider_payment_id = p_provider_payment_id,
      paid_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenantId', v_tenant.id,
    'tenantSlug', v_tenant.slug,
    'previousTier', v_order.previous_tier,
    'currentTier', v_order.target_tier,
    'subscriptionStatus', 'active',
    'activatedAt', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_saas_billing_order(TEXT, TEXT, UUID, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_and_activate_saas_billing_order(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_saas_billing_order(TEXT, TEXT, UUID, TEXT, TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_activate_saas_billing_order(TEXT, UUID, TEXT) TO service_role;

COMMIT;
