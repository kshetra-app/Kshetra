-- 026: Campaign Wallet, Transactions, and Bulk Voice OBD Dispatch
-- Enables prepaid wallet monetization, Razorpay top-up, TRAI-compliant OBD dispatching, and webhook tracking

-- ─── Campaign Wallets ───
CREATE TABLE IF NOT EXISTS campaign_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_inr >= 0),
  total_recharged_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_spent_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(politician_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_wallets_politician ON campaign_wallets(politician_id);

-- ─── Wallet Transactions Ledger ───
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES campaign_wallets(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_inr NUMERIC(12,2) NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('recharge', 'voice_obd', 'meta_boost', 'refund')),
  reference_id TEXT,
  description TEXT NOT NULL,
  balance_after_inr NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_politician ON wallet_transactions(politician_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- ─── Voice OBD Broadcasts ───
CREATE TABLE IF NOT EXISTS voice_obd_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duration_seconds INTEGER DEFAULT 30,
  target_segment JSONB NOT NULL DEFAULT '{}',
  total_recipients INTEGER NOT NULL,
  rate_per_call_inr NUMERIC(6,2) NOT NULL DEFAULT 0.90,
  total_cost_inr NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'calling', 'completed', 'cancelled', 'failed', 'outside_trai_window')),
  provider_ref TEXT,
  answered_count INTEGER DEFAULT 0,
  busy_count INTEGER DEFAULT 0,
  unreachable_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obd_campaign ON voice_obd_broadcasts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_obd_politician ON voice_obd_broadcasts(politician_id);
CREATE INDEX IF NOT EXISTS idx_obd_status ON voice_obd_broadcasts(status);

-- ─── RLS Policies ───
ALTER TABLE campaign_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_obd_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicians read own wallet" ON campaign_wallets
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Politicians read own wallet transactions" ON wallet_transactions
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Politicians manage own obd broadcasts" ON voice_obd_broadcasts
  FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));
