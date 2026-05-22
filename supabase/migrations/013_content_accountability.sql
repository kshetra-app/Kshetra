-- KSHETRA Database Schema — Sprint 28: Content Creator Accountability (CCA)
-- Depends on: 006_trust_safety.sql (user_profiles, audit_log)
--
-- Purpose: Hold every content creator legally accountable. Passive consumers
-- are unaffected, but the moment a user performs ANY write action (post,
-- comment, vote, report issue, etc.), the platform captures a comprehensive
-- digital identity + forensic fingerprint. This protects the platform from
-- misuse, defamation, fake news, and legal liability.
--
-- Two-tier design:
--   Tier 1: creator_kyc_records  — One-time "Know Your Contributor" capture
--   Tier 2: action_fingerprints  — Per-action device/location/network stamp
--
-- Tables: creator_kyc_records, action_fingerprints, contributor_devices

-- ─── TIER 1: CREATOR KYC RECORDS (one-time identity capture) ───────────────

CREATE TABLE IF NOT EXISTS creator_kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal identity
  full_legal_name TEXT NOT NULL CHECK (char_length(full_legal_name) BETWEEN 2 AND 100),
  phone_number TEXT NOT NULL CHECK (char_length(phone_number) BETWEEN 10 AND 15),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  selfie_url TEXT,                          -- Supabase Storage reference to selfie photo
  selfie_hash TEXT,                         -- SHA-256 hash of selfie for tamper detection

  -- Device used during KYC
  device_brand TEXT,                        -- e.g., "Samsung", "Xiaomi", "Apple"
  device_model TEXT,                        -- e.g., "Galaxy S24", "iPhone 15 Pro"
  device_os TEXT,                           -- e.g., "Android", "iOS"
  device_os_version TEXT,                   -- e.g., "14", "17.4"
  device_unique_id TEXT,                    -- androidId or identifierForVendor
  device_name TEXT,                         -- User-set device name

  -- Network at KYC time
  ip_address INET,                          -- Public IP at time of verification
  network_type TEXT,                        -- wifi / cellular / ethernet
  carrier_name TEXT,                        -- e.g., "Jio", "Airtel", "Vi"

  -- Location at KYC time
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,       -- metres
  location_address TEXT,                    -- Reverse-geocoded address (optional)

  -- App info
  app_version TEXT,                         -- e.g., "0.1.0"
  app_build TEXT,                           -- e.g., "42"

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'verified', 'rejected', 'suspended', 'revoked'
  )),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  terms_version TEXT NOT NULL DEFAULT '1.0',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)   -- One KYC record per user
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON creator_kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON creator_kyc_records(status);
CREATE INDEX IF NOT EXISTS idx_kyc_phone ON creator_kyc_records(phone_number);
CREATE INDEX IF NOT EXISTS idx_kyc_device ON creator_kyc_records(device_unique_id);
CREATE INDEX IF NOT EXISTS idx_kyc_created ON creator_kyc_records(created_at DESC);

-- ─── CONTRIBUTOR DEVICES (track all devices a user has used) ────────────────

CREATE TABLE IF NOT EXISTS contributor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  device_brand TEXT,
  device_model TEXT,
  device_os TEXT,
  device_os_version TEXT,
  device_unique_id TEXT NOT NULL,           -- androidId / identifierForVendor
  device_name TEXT,
  device_memory_mb INTEGER,                 -- Total RAM in MB

  -- First and last seen
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_count INTEGER NOT NULL DEFAULT 0,  -- How many actions from this device
  is_trusted BOOLEAN NOT NULL DEFAULT true, -- Admin can flag suspicious devices

  UNIQUE (user_id, device_unique_id)
);

CREATE INDEX IF NOT EXISTS idx_contributor_devices_user ON contributor_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_contributor_devices_device ON contributor_devices(device_unique_id);

-- ─── TIER 2: ACTION FINGERPRINTS (per-action forensic stamp) ────────────────

CREATE TABLE IF NOT EXISTS action_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_id UUID REFERENCES creator_kyc_records(id),

  -- What action was performed
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_post', 'edit_post', 'delete_post',
    'create_comment', 'edit_comment',
    'vote_poll',
    'report_issue', 'update_issue',
    'add_evidence', 'tag_mla',
    'dispute_resolution',
    'submit_promise_evidence',
    'follow_issue', 'upvote_issue',
    'react_post',
    'share_content',
    'submit_report',         -- flag/report another user's content
    'create_challenge',
    'endorse_aspirant',
    'other'
  )),
  content_type TEXT,         -- 'post', 'comment', 'issue', 'evidence', 'poll_vote', etc.
  content_id TEXT,           -- ID of the created/modified content
  content_hash TEXT,         -- SHA-256 of the content body for tamper detection

  -- Device fingerprint at action time
  device_brand TEXT,
  device_model TEXT,
  device_os TEXT,
  device_os_version TEXT,
  device_unique_id TEXT,
  device_name TEXT,

  -- Network fingerprint at action time
  ip_address INET,
  local_ip TEXT,             -- Device local network IP
  network_type TEXT,         -- wifi / cellular / ethernet
  carrier_name TEXT,
  wifi_ssid TEXT,            -- If on WiFi (requires permission)

  -- Location at action time
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,

  -- Session / App context
  app_version TEXT,
  app_build TEXT,
  session_id TEXT,           -- Random UUID generated per app session
  screen_name TEXT,          -- Which screen the action was performed from

  -- Timestamps
  action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-friendly indexes (high-volume table)
CREATE INDEX IF NOT EXISTS idx_action_fp_user ON action_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_action_fp_action ON action_fingerprints(action_type);
CREATE INDEX IF NOT EXISTS idx_action_fp_content ON action_fingerprints(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_action_fp_device ON action_fingerprints(device_unique_id);
CREATE INDEX IF NOT EXISTS idx_action_fp_ip ON action_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_action_fp_time ON action_fingerprints(action_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_fp_kyc ON action_fingerprints(kyc_id);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE creator_kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_fingerprints ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own KYC
CREATE POLICY "Users read own KYC" ON creator_kyc_records FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users submit KYC" ON creator_kyc_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own KYC" ON creator_kyc_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin/moderator can read all KYC records (for investigations)
CREATE POLICY "Admins read all KYC" ON creator_kyc_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Users can see own devices
CREATE POLICY "Users read own devices" ON contributor_devices FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users register devices" ON contributor_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own devices" ON contributor_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can read all devices
CREATE POLICY "Admins read all devices" ON contributor_devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Action fingerprints: users insert their own, only admins can read all
CREATE POLICY "Users log own actions" ON action_fingerprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own fingerprints" ON action_fingerprints FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all fingerprints" ON action_fingerprints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ─── TRIGGERS ───────────────────────────────────────────────────────────────

-- Auto-update updated_at on KYC
CREATE TRIGGER creator_kyc_updated_at
  BEFORE UPDATE ON creator_kyc_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment device action count
CREATE OR REPLACE FUNCTION increment_device_action_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contributor_devices
  SET action_count = action_count + 1,
      last_seen_at = now()
  WHERE user_id = NEW.user_id
    AND device_unique_id = NEW.device_unique_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_fp_increment_device
  AFTER INSERT ON action_fingerprints
  FOR EACH ROW EXECUTE FUNCTION increment_device_action_count();

-- ─── VIEWS ──────────────────────────────────────────────────────────────────

-- Contributor accountability summary (for admin dashboard)
CREATE OR REPLACE VIEW contributor_accountability_summary AS
SELECT
  k.user_id,
  k.full_legal_name,
  k.phone_number,
  k.phone_verified,
  k.selfie_url IS NOT NULL AS has_selfie,
  k.status AS kyc_status,
  k.created_at AS kyc_date,
  up.display_name,
  up.role,
  up.reputation_score,
  up.is_suspended,
  (SELECT COUNT(*) FROM action_fingerprints af WHERE af.user_id = k.user_id) AS total_actions,
  (SELECT COUNT(*) FROM contributor_devices cd WHERE cd.user_id = k.user_id) AS device_count,
  (SELECT MAX(action_at) FROM action_fingerprints af WHERE af.user_id = k.user_id) AS last_action_at
FROM creator_kyc_records k
LEFT JOIN user_profiles up ON up.user_id = k.user_id;

-- Suspicious activity detector: users posting from many different devices
CREATE OR REPLACE VIEW suspicious_multi_device_users AS
SELECT
  cd.user_id,
  up.display_name,
  COUNT(DISTINCT cd.device_unique_id) AS unique_devices,
  SUM(cd.action_count) AS total_actions,
  array_agg(DISTINCT cd.device_brand || ' ' || cd.device_model) AS devices_used
FROM contributor_devices cd
LEFT JOIN user_profiles up ON up.user_id = cd.user_id
GROUP BY cd.user_id, up.display_name
HAVING COUNT(DISTINCT cd.device_unique_id) >= 3
ORDER BY COUNT(DISTINCT cd.device_unique_id) DESC;

-- Suspicious activity detector: rapid IP changes
CREATE OR REPLACE VIEW suspicious_ip_changes AS
SELECT
  af.user_id,
  up.display_name,
  COUNT(DISTINCT af.ip_address) AS unique_ips,
  COUNT(*) AS action_count,
  MIN(af.action_at) AS first_action,
  MAX(af.action_at) AS last_action
FROM action_fingerprints af
LEFT JOIN user_profiles up ON up.user_id = af.user_id
WHERE af.action_at > now() - INTERVAL '24 hours'
GROUP BY af.user_id, up.display_name
HAVING COUNT(DISTINCT af.ip_address) >= 5
ORDER BY COUNT(DISTINCT af.ip_address) DESC;
