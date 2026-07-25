-- 024: Kshetra Live Media Exchange (LMX)
-- One-ingest → many-outputs live exchange.
-- The Live Event Object (live_events) is the SOURCE OF TRUTH — video is one field.
-- Every downstream system (Live tab, partner distribution, department alerts, audit)
-- reads from this record rather than re-deriving state.
--
-- AI enrichment (live_event_ai) is OPTIONAL: rows are only written when an AI model
-- is configured. The entire flow (go-live, moderation buffer, routing, department
-- alerts, Live tab ranking) works with neutral defaults when AI is absent.
--
-- Tier B (political/electoral routing) is intentionally NOT modelled here — the
-- deny-by-default policy-gate pattern (visibility + department registry) is reused
-- when it is resumed. See product doc Section 15.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Contributor affiliations + brand kits (multi-brand overlay, doc Section 11)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  lower_third_template TEXT,
  color_primary TEXT DEFAULT '#4F8EF7',
  color_secondary TEXT DEFAULT '#0A0A1A',
  intro_bumper_url TEXT,
  outro_bumper_url TEXT,
  watermark_url TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_brand_kits_org ON lmx_brand_kits(organization_id);

CREATE TABLE IF NOT EXISTS lmx_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  brand_kit_id UUID REFERENCES lmx_brand_kits(id) ON DELETE SET NULL,
  contract_start DATE,
  contract_end DATE,
  exclusivity_flag BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_affiliations_contributor ON lmx_affiliations(contributor_id);
CREATE INDEX idx_lmx_affiliations_active ON lmx_affiliations(status) WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Government department subscriptions (doc Section 12)
--    Reporter-initiated alerting, NOT AI auto-routing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_type TEXT NOT NULL CHECK (department_type IN (
    'police','fire','hospital','disaster_management','anti_corruption',
    'traffic_police','municipal','collectorate','electricity_board',
    'water_board','women_child_helpline','forest'
  )),
  office_name TEXT NOT NULL,
  -- Jurisdiction is registered per the ACTUAL area this office covers.
  -- Different department types use different boundary shapes (police station vs
  -- hospital catchment vs revenue mandal), so we keep a type + free geo fields.
  jurisdiction_type TEXT NOT NULL DEFAULT 'administrative' CHECK (jurisdiction_type IN (
    'police_station','hospital_catchment','administrative','municipal_ward','custom'
  )),
  state_code TEXT NOT NULL,
  district_name TEXT,
  mandal_name TEXT,
  jurisdiction_geojson JSONB,        -- boundary polygon when available
  catchment_radius_km NUMERIC(6,2),  -- for nearest-facility resolution (hospitals)
  center_lat NUMERIC(9,6),
  center_lng NUMERIC(9,6),
  -- Delivery
  delivery_method TEXT NOT NULL DEFAULT 'dashboard' CHECK (delivery_method IN ('webhook','dashboard','sms','push')),
  webhook_url TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  -- Subscription state — a lapsed/unverified subscription receives NO alerts.
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active','inactive','pending','suspended')),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_departments_type ON lmx_departments(department_type);
CREATE INDEX idx_lmx_departments_state ON lmx_departments(state_code);
CREATE INDEX idx_lmx_departments_active ON lmx_departments(subscription_status) WHERE subscription_status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Reporter credibility (doc Section 14) — dynamic, behavioural layer that sits
--    ON TOP of the static accreditation tier (from KYC / journalist profile).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_credibility (
  reporter_id TEXT PRIMARY KEY,
  score NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (score >= 0 AND score <= 100),
  total_streams INTEGER DEFAULT 0,
  genuine_alerts INTEGER DEFAULT 0,
  false_alerts INTEGER DEFAULT 0,
  unverified_alerts INTEGER DEFAULT 0,
  media_pickups INTEGER DEFAULT 0,
  community_upvotes INTEGER DEFAULT 0,
  community_downvotes INTEGER DEFAULT 0,
  -- Privileges derived from score
  department_alerts_restricted BOOLEAN DEFAULT FALSE,
  requires_moderator_cosign BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. THE LIVE EVENT OBJECT (doc Section 3) — source of truth
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id TEXT NOT NULL UNIQUE,           -- public stream identifier
  reporter_id TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  accreditation_tier TEXT NOT NULL DEFAULT 'citizen' CHECK (accreditation_tier IN ('citizen','stringer','accredited','senior','editor','organization')),
  credibility_score NUMERIC(5,2) DEFAULT 50.00,   -- snapshot at go-live

  -- Location (captured via GPS at go-live)
  gps_lat NUMERIC(9,6),
  gps_lng NUMERIC(9,6),
  state_code TEXT,
  district_name TEXT,
  mandal_name TEXT,
  constituency_ac_no INTEGER,
  locality TEXT,

  -- Classification
  issue_category TEXT NOT NULL DEFAULT 'general' CHECK (issue_category IN (
    'emergency','traffic','weather','civic','breaking_news','general'
  )),
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',

  -- Media
  media_ingest_url TEXT,                    -- where the app publishes (RTMP/WebRTC/SRT)
  media_playback_hls TEXT,                  -- HLS playback URL
  media_playback_webrtc TEXT,               -- WebRTC low-latency URL
  thumbnail_url TEXT,
  multi_camera_angles JSONB DEFAULT '[]',

  -- Brand context (doc Section 11) — locked in at go-live
  affiliation_id UUID REFERENCES lmx_affiliations(id) ON DELETE SET NULL,
  active_brand_kit_id UUID REFERENCES lmx_brand_kits(id) ON DELETE SET NULL,
  exclusivity_flag BOOLEAN DEFAULT FALSE,

  -- Two ORTHOGONAL reporter choices (doc Section 3, 9.1, 12.2)
  visibility_mode TEXT NOT NULL DEFAULT 'public' CHECK (visibility_mode IN ('public','exclusive_partner','confidential_direct')),
  alert_departments TEXT[] DEFAULT '{}',    -- department types the reporter chose to alert

  -- Moderation buffer state
  buffer_state TEXT NOT NULL DEFAULT 'buffering' CHECK (buffer_state IN ('buffering','cleared','held','cut','bypassed')),
  buffer_seconds INTEGER DEFAULT 20,
  human_decision TEXT CHECK (human_decision IN ('allow','mute','cut','escalate')),
  human_decision_at TIMESTAMPTZ,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('preparing','live','ended','archived','removed')),
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  priority_score NUMERIC(5,2) DEFAULT 0,    -- 0-100 ranking signal (doc Section 14)

  -- Audit (doc Section 13 Layer 4)
  content_hash TEXT,
  raw_recording_url TEXT,
  branded_recording_url TEXT,
  retention_expiry TIMESTAMPTZ,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_events_status ON live_events(status);
CREATE INDEX idx_live_events_live ON live_events(status) WHERE status = 'live';
CREATE INDEX idx_live_events_state ON live_events(state_code);
CREATE INDEX idx_live_events_reporter ON live_events(reporter_id);
CREATE INDEX idx_live_events_category ON live_events(issue_category);
CREATE INDEX idx_live_events_visibility ON live_events(visibility_mode);
CREATE INDEX idx_live_events_priority ON live_events(priority_score DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AI enrichment (doc Section 3 `ai` block, Section 14) — OPTIONAL 1:1 record.
--    Only populated when an AI model is configured; absence never blocks the flow.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS live_event_ai (
  live_event_id UUID PRIMARY KEY REFERENCES live_events(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN DEFAULT FALSE,         -- FALSE when no AI model subscribed
  transcript TEXT,
  translation TEXT,
  summary TEXT,
  auto_headline TEXT,
  detected_objects JSONB DEFAULT '[]',
  crowd_estimate INTEGER,
  sentiment TEXT,
  emergency_score NUMERIC(5,2),             -- enrichment ONLY — never a routing trigger
  authenticity_score NUMERIC(5,2),
  deepfake_flag BOOLEAN DEFAULT FALSE,
  violence_flag BOOLEAN DEFAULT FALSE,
  weapon_flag BOOLEAN DEFAULT FALSE,
  model_provider TEXT,                      -- 'openai' | 'gemini' | null
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Department alerts (doc Section 12.4, 12.6) — dispatched per selected dept
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_department_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
  department_id UUID REFERENCES lmx_departments(id) ON DELETE SET NULL,
  department_type TEXT NOT NULL,
  reporter_id TEXT NOT NULL,                -- no anonymous alerts (doc Section 12.6)
  feed_access_url TEXT,
  gps_lat NUMERIC(9,6),
  gps_lng NUMERIC(9,6),
  ai_summary TEXT,                          -- AI context if available, else null
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'dispatched' CHECK (delivery_status IN ('queued','dispatched','delivered','failed')),
  -- Acknowledgment feeds directly into reporter credibility (doc Section 12.6)
  acknowledgment TEXT CHECK (acknowledgment IN ('genuine','false','unable_to_verify')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_alerts_event ON lmx_department_alerts(live_event_id);
CREATE INDEX idx_lmx_alerts_department ON lmx_department_alerts(department_id);
CREATE INDEX idx_lmx_alerts_reporter ON lmx_department_alerts(reporter_id);
CREATE INDEX idx_lmx_alerts_ack ON lmx_department_alerts(acknowledgment);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Distribution destinations (doc Section 7, 7a) — output branches per event
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_distribution_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id UUID REFERENCES live_events(id) ON DELETE CASCADE,
  organization_id TEXT,
  protocol TEXT NOT NULL CHECK (protocol IN ('hls','dash','webrtc','srt','rtmp','mpegts','ndi','embed')),
  destination_url TEXT,
  stream_key TEXT,                          -- e.g. partner's YouTube/RTMP key (doc 7a.1)
  srt_passphrase TEXT,
  branded BOOLEAN DEFAULT TRUE,             -- branded vs clean master feed
  brand_kit_id UUID REFERENCES lmx_brand_kits(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  health TEXT DEFAULT 'unknown' CHECK (health IN ('healthy','degraded','down','unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_dist_event ON lmx_distribution_destinations(live_event_id);
CREATE INDEX idx_lmx_dist_org ON lmx_distribution_destinations(organization_id);

-- Org-level relay config (persists across events) — doc Section 7a.1 & 11 portal
CREATE TABLE IF NOT EXISTS lmx_org_relays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  label TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'rtmp' CHECK (protocol IN ('rtmp','srt','ndi')),
  destination_url TEXT,
  stream_key TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_org_relays_org ON lmx_org_relays(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Moderation events (doc Section 13) — immutable audit trail
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lmx_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
  layer TEXT NOT NULL CHECK (layer IN ('ai_screen','human_buffer','audit','grievance')),
  flag_type TEXT,                           -- 'violence','weapon','deepfake','hate_speech','misinformation'
  raised_by TEXT NOT NULL DEFAULT 'system', -- 'system' (AI) | moderator id
  action TEXT CHECK (action IN ('flag','allow','mute','cut','escalate','takedown')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lmx_moderation_event ON lmx_moderation_events(live_event_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Views
-- ─────────────────────────────────────────────────────────────────────────────

-- Public Live tab feed: public streams that have cleared moderation.
CREATE OR REPLACE VIEW lmx_live_tab_feed AS
SELECT e.*, a.summary AS ai_summary, a.auto_headline, a.emergency_score, a.ai_enabled
FROM live_events e
LEFT JOIN live_event_ai a ON a.live_event_id = e.id
WHERE e.visibility_mode = 'public'
  AND e.status IN ('live','ended')
  AND e.buffer_state IN ('cleared','bypassed')
ORDER BY (e.status = 'live') DESC, e.priority_score DESC, e.started_at DESC;

-- Department alert inbox with acknowledgment status.
CREATE OR REPLACE VIEW lmx_department_inbox AS
SELECT al.*, e.stream_id, e.reporter_name, e.accreditation_tier, e.credibility_score,
       e.issue_category, e.state_code, e.district_name, e.media_playback_hls
FROM lmx_department_alerts al
JOIN live_events e ON e.id = al.live_event_id
ORDER BY al.dispatched_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lmx_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_credibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_event_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_department_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_distribution_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_org_relays ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmx_moderation_events ENABLE ROW LEVEL SECURITY;

-- Public read only for public, cleared streams; everything else via service role.
CREATE POLICY "Public read public live events" ON live_events
  FOR SELECT USING (visibility_mode = 'public' AND buffer_state IN ('cleared','bypassed'));
CREATE POLICY "Public read live event ai" ON live_event_ai FOR SELECT USING (true);
CREATE POLICY "Public read credibility" ON lmx_credibility FOR SELECT USING (true);
CREATE POLICY "Public read brand kits" ON lmx_brand_kits FOR SELECT USING (is_approved = true);

-- Reporters can insert/update their own live events (auth.uid() as reporter_id).
CREATE POLICY "Reporters manage own events" ON live_events
  FOR ALL USING (auth.uid()::text = reporter_id) WITH CHECK (auth.uid()::text = reporter_id);
CREATE POLICY "Reporters manage own affiliations" ON lmx_affiliations
  FOR ALL USING (auth.uid()::text = contributor_id) WITH CHECK (auth.uid()::text = contributor_id);

-- Confidential/exclusive streams, department registry, alerts, distribution,
-- moderation: service-role only (no public policy => denied by default).
