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
