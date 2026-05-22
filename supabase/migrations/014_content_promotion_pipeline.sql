-- KSHETRA Database Schema — Content Promotion Pipeline (CPP)
-- Depends on: 006_trust_safety.sql, 013_content_accountability.sql
--
-- Purpose: Prevent fraudulent, defamatory, litigious, and illegal content from
-- reaching state/national audiences. Content starts local (constituency-level),
-- goes through community review (vouch/flag/alert), and only gets promoted to
-- wider feeds after passing safety checks.
--
-- Design Principles:
--   1. Feed-level gating: Content accessible via direct constituency navigation,
--      but NOT shown in state/national feeds until promoted.
--   2. Constituency moderators: Trusted local users resolve flags quickly.
--   3. Community-driven: Vouches and flags from real users, weighted by reputation.
--   4. Risk-tiered: News/claims get full review; polls/discussions are exempt.
--
-- Tables: content_visibility, content_vouches, content_flags, content_alerts,
--         promotion_decisions, constituency_moderators

-- ─── CONTENT VISIBILITY & PROMOTION STATUS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS content_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference
  content_type TEXT NOT NULL CHECK (content_type IN (
    'post', 'news', 'opinion', 'short', 'civic_issue', 'promise_evidence', 'headline'
  )),
  content_id TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Where content belongs
  constituency_id TEXT,                    -- e.g. "TS-AC-1"
  state_code TEXT,

  -- Risk tier (determines review strictness)
  risk_tier TEXT NOT NULL DEFAULT 'medium' CHECK (risk_tier IN (
    'high',     -- News, claims about individuals → full review
    'medium',   -- Opinions, civic issues, shorts → vouch-to-promote
    'low'       -- Polls, questions, discussions → no gating
  )),

  -- Current visibility level
  visibility_level TEXT NOT NULL DEFAULT 'constituency' CHECK (visibility_level IN (
    'constituency',  -- Only local users see in feed
    'district',      -- Same-district constituencies
    'state',         -- All state users
    'national',      -- All platform users
    'restricted'     -- Hidden from all feeds (still accessible via direct link with warning)
  )),

  -- Review status
  review_status TEXT NOT NULL DEFAULT 'open' CHECK (review_status IN (
    'open',          -- In review window
    'cleared',       -- Passed review, eligible for promotion
    'promoted',      -- Actively promoted to wider feeds
    'held',          -- Flagged, awaiting moderator decision
    'restricted',    -- Moderator restricted visibility
    'appealed',      -- Creator appealed restriction
    'expired'        -- Review window closed without promotion
  )),

  -- Scores
  vouch_count INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER NOT NULL DEFAULT 0,
  alert_count INTEGER NOT NULL DEFAULT 0,
  promotion_score DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- Thresholds (based on author trust level at creation time)
  vouch_threshold INTEGER NOT NULL DEFAULT 5,    -- Vouches needed to promote
  flag_threshold INTEGER NOT NULL DEFAULT 3,     -- Flags to auto-hold
  review_hours INTEGER NOT NULL DEFAULT 6,       -- Hours before auto-decisions

  -- Timestamps
  review_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_expires_at TIMESTAMPTZ NOT NULL,        -- review_started_at + review_hours
  promoted_at TIMESTAMPTZ,
  restricted_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_content ON content_visibility(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_cv_author ON content_visibility(author_id);
CREATE INDEX IF NOT EXISTS idx_cv_constituency ON content_visibility(constituency_id);
CREATE INDEX IF NOT EXISTS idx_cv_state ON content_visibility(state_code);
CREATE INDEX IF NOT EXISTS idx_cv_visibility ON content_visibility(visibility_level);
CREATE INDEX IF NOT EXISTS idx_cv_review ON content_visibility(review_status);
CREATE INDEX IF NOT EXISTS idx_cv_score ON content_visibility(promotion_score DESC);
CREATE INDEX IF NOT EXISTS idx_cv_expires ON content_visibility(review_expires_at);

-- ─── CONTENT VOUCHES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_visibility_id UUID NOT NULL REFERENCES content_visibility(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vouch weight based on user reputation and role
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  user_reputation INTEGER NOT NULL DEFAULT 0,
  user_role TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (content_visibility_id, user_id)  -- One vouch per user per content
);

CREATE INDEX IF NOT EXISTS idx_vouches_content ON content_vouches(content_visibility_id);
CREATE INDEX IF NOT EXISTS idx_vouches_user ON content_vouches(user_id);

-- ─── CONTENT FLAGS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_visibility_id UUID NOT NULL REFERENCES content_visibility(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Flag reason
  reason TEXT NOT NULL CHECK (reason IN (
    'fake_news',             -- Fabricated or misleading information
    'defamatory',            -- Targets/harms an individual's reputation
    'communally_sensitive',  -- Could incite communal tension
    'legally_problematic',   -- Potential legal violation (contempt, sedition, etc.)
    'hate_speech',           -- Promotes hatred against a group
    'spam',                  -- Promotional or irrelevant
    'impersonation',         -- Pretending to be someone else
    'copyright',             -- Uses others' content without permission
    'explicit_content',      -- Inappropriate/adult content
    'incitement'             -- Calls for violence or illegal action
  )),
  description TEXT,          -- Optional explanation from flagger
  evidence_url TEXT,         -- Optional counter-evidence

  -- Flag weight based on user reputation
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  user_reputation INTEGER NOT NULL DEFAULT 0,

  -- Resolution
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT CHECK (resolution IN (
    'upheld',       -- Flag was valid, content restricted
    'dismissed',    -- Flag was invalid
    'partial'       -- Partially valid, content modified
  )),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (content_visibility_id, user_id)  -- One flag per user per content
);

CREATE INDEX IF NOT EXISTS idx_flags_content ON content_flags(content_visibility_id);
CREATE INDEX IF NOT EXISTS idx_flags_user ON content_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_flags_reason ON content_flags(reason);
CREATE INDEX IF NOT EXISTS idx_flags_unresolved ON content_flags(resolved) WHERE resolved = false;

-- ─── CONTENT ALERTS (urgent escalation) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_visibility_id UUID NOT NULL REFERENCES content_visibility(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('medium', 'high', 'critical')),
  reason TEXT NOT NULL,        -- Free-text explanation
  category TEXT CHECK (category IN (
    'imminent_violence',       -- Threat of violence
    'doxxing',                 -- Personal info exposed
    'child_safety',            -- Content involving minors
    'election_interference',   -- False voting info, booth manipulation
    'impersonation_official',  -- Impersonating government official
    'other'
  )),

  -- Resolution
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_content ON content_alerts(content_visibility_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON content_alerts(acknowledged) WHERE acknowledged = false;

-- ─── PROMOTION DECISIONS (audit trail) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_visibility_id UUID NOT NULL REFERENCES content_visibility(id) ON DELETE CASCADE,

  decision TEXT NOT NULL CHECK (decision IN (
    'auto_promoted',      -- System auto-promoted (met thresholds)
    'manually_promoted',  -- Moderator promoted
    'auto_restricted',    -- System restricted (too many flags)
    'manually_restricted',-- Moderator restricted
    'appealed',           -- Creator appealed
    'appeal_granted',     -- Appeal successful, content restored
    'appeal_denied',      -- Appeal denied
    'expired'             -- Review window closed, no promotion
  )),

  -- Who made the decision
  decided_by TEXT NOT NULL CHECK (decided_by IN ('system', 'constituency_moderator', 'platform_admin')),
  moderator_id UUID REFERENCES auth.users(id),

  -- Context
  from_level TEXT,         -- Previous visibility level
  to_level TEXT,           -- New visibility level
  reason TEXT,             -- Explanation for decision
  vouch_count_at_decision INTEGER,
  flag_count_at_decision INTEGER,
  score_at_decision DOUBLE PRECISION,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_content ON promotion_decisions(content_visibility_id);
CREATE INDEX IF NOT EXISTS idx_decisions_moderator ON promotion_decisions(moderator_id);

-- ─── CONSTITUENCY MODERATORS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS constituency_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL,
  state_code TEXT NOT NULL,

  -- Permissions
  can_resolve_flags BOOLEAN NOT NULL DEFAULT true,
  can_restrict_content BOOLEAN NOT NULL DEFAULT true,
  can_promote_content BOOLEAN NOT NULL DEFAULT true,
  can_issue_warnings BOOLEAN NOT NULL DEFAULT true,
  can_ban_users BOOLEAN NOT NULL DEFAULT false,  -- Only platform admins

  -- Activity
  flags_resolved INTEGER NOT NULL DEFAULT 0,
  content_promoted INTEGER NOT NULL DEFAULT 0,
  content_restricted INTEGER NOT NULL DEFAULT 0,
  warnings_issued INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  appointed_by UUID REFERENCES auth.users(id),
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_constmod_constituency ON constituency_moderators(constituency_id);
CREATE INDEX IF NOT EXISTS idx_constmod_user ON constituency_moderators(user_id);
CREATE INDEX IF NOT EXISTS idx_constmod_active ON constituency_moderators(is_active) WHERE is_active = true;

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE content_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_moderators ENABLE ROW LEVEL SECURITY;

-- Content visibility: public read (feed filtering done in app), author + mod insert/update
CREATE POLICY "Public read visibility" ON content_visibility FOR SELECT USING (true);
CREATE POLICY "Authors create visibility" ON content_visibility FOR INSERT
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors and mods update" ON content_visibility FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM constituency_moderators
      WHERE user_id = auth.uid()
      AND constituency_id = content_visibility.constituency_id
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Vouches: auth insert own, public read
CREATE POLICY "Auth vouch" ON content_vouches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read vouches" ON content_vouches FOR SELECT USING (true);

-- Flags: auth insert own, read by moderators
CREATE POLICY "Auth flag" ON content_flags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Moderators read flags" ON content_flags FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM constituency_moderators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Moderators resolve flags" ON content_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM constituency_moderators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Alerts: auth insert, moderators read
CREATE POLICY "Auth alert" ON content_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Moderators read alerts" ON content_alerts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM constituency_moderators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Decisions: public read (transparency), moderator insert
CREATE POLICY "Public read decisions" ON promotion_decisions FOR SELECT USING (true);
CREATE POLICY "Moderators make decisions" ON promotion_decisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM constituency_moderators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Moderators: public read, admin manage
CREATE POLICY "Public read moderators" ON constituency_moderators FOR SELECT USING (true);
CREATE POLICY "Admins manage moderators" ON constituency_moderators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── TRIGGERS ───────────────────────────────────────────────────────────────

-- Auto-update vouch_count on content_visibility when vouch is added
CREATE OR REPLACE FUNCTION update_vouch_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content_visibility
  SET vouch_count = vouch_count + 1,
      promotion_score = promotion_score + NEW.weight,
      updated_at = now()
  WHERE id = NEW.content_visibility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vouch_added
  AFTER INSERT ON content_vouches
  FOR EACH ROW EXECUTE FUNCTION update_vouch_count();

-- Auto-update flag_count and check threshold
CREATE OR REPLACE FUNCTION update_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content_visibility
  SET flag_count = flag_count + 1,
      promotion_score = promotion_score - (NEW.weight * 2),
      updated_at = now()
  WHERE id = NEW.content_visibility_id;

  -- Auto-hold if flags exceed threshold
  IF (SELECT flag_count FROM content_visibility WHERE id = NEW.content_visibility_id) >=
     (SELECT flag_threshold FROM content_visibility WHERE id = NEW.content_visibility_id) THEN
    UPDATE content_visibility
    SET review_status = 'held',
        updated_at = now()
    WHERE id = NEW.content_visibility_id
      AND review_status NOT IN ('restricted', 'promoted');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flag_added
  AFTER INSERT ON content_flags
  FOR EACH ROW EXECUTE FUNCTION update_flag_count();

-- Auto-hold on alert
CREATE OR REPLACE FUNCTION handle_alert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content_visibility
  SET alert_count = alert_count + 1,
      review_status = CASE
        WHEN review_status NOT IN ('restricted') THEN 'held'
        ELSE review_status
      END,
      updated_at = now()
  WHERE id = NEW.content_visibility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_raised
  AFTER INSERT ON content_alerts
  FOR EACH ROW EXECUTE FUNCTION handle_alert();

-- Updated_at trigger for content_visibility
CREATE TRIGGER cv_updated_at
  BEFORE UPDATE ON content_visibility
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VIEWS ──────────────────────────────────────────────────────────────────

-- Moderator queue: content that needs attention
CREATE OR REPLACE VIEW moderator_queue AS
SELECT
  cv.id,
  cv.content_type,
  cv.content_id,
  cv.author_id,
  cv.constituency_id,
  cv.state_code,
  cv.risk_tier,
  cv.review_status,
  cv.vouch_count,
  cv.flag_count,
  cv.alert_count,
  cv.promotion_score,
  cv.review_started_at,
  cv.review_expires_at,
  up.display_name AS author_name,
  up.role AS author_role,
  up.reputation_score AS author_reputation
FROM content_visibility cv
LEFT JOIN user_profiles up ON up.user_id = cv.author_id
WHERE cv.review_status IN ('held', 'appealed')
   OR (cv.alert_count > 0 AND cv.review_status != 'restricted')
ORDER BY
  cv.alert_count DESC,
  cv.flag_count DESC,
  cv.review_started_at ASC;

-- Content ready for auto-promotion
CREATE OR REPLACE VIEW promotable_content AS
SELECT
  cv.*,
  up.display_name AS author_name,
  up.role AS author_role
FROM content_visibility cv
LEFT JOIN user_profiles up ON up.user_id = cv.author_id
WHERE cv.review_status = 'open'
  AND cv.vouch_count >= cv.vouch_threshold
  AND cv.flag_count < 2
  AND cv.review_expires_at <= now()
ORDER BY cv.promotion_score DESC;

-- Constituency moderation stats
CREATE OR REPLACE VIEW constituency_moderation_stats AS
SELECT
  cm.constituency_id,
  cm.state_code,
  COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.is_active) AS active_moderators,
  SUM(cm.flags_resolved) AS total_flags_resolved,
  SUM(cm.content_promoted) AS total_content_promoted,
  SUM(cm.content_restricted) AS total_content_restricted,
  (SELECT COUNT(*) FROM content_visibility cv
   WHERE cv.constituency_id = cm.constituency_id
   AND cv.review_status = 'held') AS pending_queue
FROM constituency_moderators cm
GROUP BY cm.constituency_id, cm.state_code;
