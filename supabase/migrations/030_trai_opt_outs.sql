-- 030: TRAI Opt-Out Ledger for Voice OBD and SMS Outreach
-- Enforces statutory National Do Not Call (NDNC) & recipient Press 9 opt-outs

CREATE TABLE IF NOT EXISTS trai_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_hash TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_broadcast_id TEXT,
  channel TEXT NOT NULL DEFAULT 'voice_press_9' CHECK (channel IN ('voice_press_9', 'sms_stop', 'manual_admin', 'web_form')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trai_opt_outs_hash ON trai_opt_outs(phone_number_hash);
CREATE INDEX IF NOT EXISTS idx_trai_opt_outs_date ON trai_opt_outs(opted_out_at);

-- RLS: Service role can manage, authenticated users can check
ALTER TABLE trai_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY Anyone can check opt-outs ON trai_opt_outs
  FOR SELECT USING (true);

CREATE POLICY Service role can insert opt-outs ON trai_opt_outs
  FOR INSERT WITH CHECK (true);
