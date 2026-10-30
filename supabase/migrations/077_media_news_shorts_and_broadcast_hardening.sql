-- ============================================================================
-- Migration 077: Media, News Ingestion, Shorts Analytics & Broadcast Hardening
-- Governing Authority: DEC-179, DEC-180
-- Master Product Blueprint: Domain 5 (JOB 037 - JOB 045, JOB 051 - JOB 053)
-- ============================================================================

-- 1. Representative Official Civic Responses (JOB 037)
CREATE TABLE IF NOT EXISTS representative_civic_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  representative_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  response_text TEXT NOT NULL,
  action_plan TEXT,
  estimated_completion_date DATE,
  official_designation TEXT NOT NULL,
  is_official_statement BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_rep_responses_issue_id ON representative_civic_responses(issue_id);
CREATE INDEX IF NOT EXISTS idx_rep_responses_rep_id ON representative_civic_responses(representative_id);

-- 2. Political News Articles with Context & Verification (JOB 038, JOB 039, JOB 040)
CREATE TABLE IF NOT EXISTS political_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'governance',
  state_code VARCHAR(2),
  constituency_id TEXT REFERENCES constituencies(id) ON DELETE SET NULL,
  tagged_representative_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sentiment_score NUMERIC(3, 2) DEFAULT 0.00,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_fact_checked BOOLEAN NOT NULL DEFAULT false,
  fact_check_verdict TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_news_constituency_id ON political_news_articles(constituency_id);
CREATE INDEX IF NOT EXISTS idx_news_state_code ON political_news_articles(state_code);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON political_news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON political_news_articles(category);

-- 3. Political Shorts Analytics & Retention Telemetry (JOB 041, JOB 042, JOB 043)
CREATE TABLE IF NOT EXISTS political_shorts_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES political_shorts(id) ON DELETE CASCADE,
  user_id_hash TEXT NOT NULL,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  shared BOOLEAN NOT NULL DEFAULT false,
  constituency_id TEXT REFERENCES constituencies(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_shorts_analytics_short_id ON political_shorts_analytics(short_id);
CREATE INDEX IF NOT EXISTS idx_shorts_analytics_recorded_at ON political_shorts_analytics(recorded_at DESC);

-- 4. User Notification Subscriptions & Anti-Spam Controls (JOB 044)
CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, -- 'civic_alerts', 'breaking_news', 'live_townhalls', 'weekly_digest'
  push_token TEXT,
  token_platform TEXT CHECK (token_platform IN ('fcm', 'apns', 'web')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, constituency_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_notif_subs_constituency_topic ON user_notification_subscriptions(constituency_id, topic);

-- 5. Constituency Retention Digests & Civic Recaps (JOB 045)
CREATE TABLE IF NOT EXISTS constituency_retention_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_id TEXT NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  digest_type TEXT NOT NULL DEFAULT 'weekly',
  top_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  breaking_news JSONB NOT NULL DEFAULT '[]'::jsonb,
  representative_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  upcoming_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_retention_digests_ac_type ON constituency_retention_digests(constituency_id, digest_type);

-- 6. Live Streaming Enhancements (JOB 051, JOB 052, JOB 053)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'broadcast_sessions' AND column_name = 'hls_playback_url'
  ) THEN
    ALTER TABLE broadcast_sessions 
    ADD COLUMN hls_playback_url TEXT,
    ADD COLUMN vod_archive_url TEXT,
    ADD COLUMN peak_live_viewers INTEGER DEFAULT 0,
    ADD COLUMN total_views INTEGER DEFAULT 0;
  END IF;
END $$;

-- 7. Row Level Security Policies
ALTER TABLE representative_civic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_shorts_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_retention_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read representative responses" ON representative_civic_responses FOR SELECT USING (true);
CREATE POLICY "Public read political news" ON political_news_articles FOR SELECT USING (true);
CREATE POLICY "Public read retention digests" ON constituency_retention_digests FOR SELECT USING (true);
CREATE POLICY "Users view own subscriptions" ON user_notification_subscriptions FOR SELECT USING (auth.uid() = user_id);
