-- KSHETRA Database Schema — Sprint 5: Push Notifications
-- Depends on: 001_initial_schema.sql
--
-- Tables: push_tokens, notification_log, notification_preferences

-- ─── PUSH TOKENS ───

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- ─── NOTIFICATION LOG ───

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'post_reply', 'comment_reply', 'reaction', 'poll_closed',
    'issue_status_change', 'issue_upvote_milestone',
    'new_headline', 'constituency_alert', 'system'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  -- Reference to the source entity
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  source_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  source_issue_id UUID REFERENCES civic_issues(id) ON DELETE SET NULL,
  -- Delivery tracking
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_unread ON notification_log(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- ─── NOTIFICATION PREFERENCES (per-user, per-trigger type) ───

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'post_reply', 'comment_reply', 'reaction', 'poll_closed',
    'issue_status_change', 'issue_upvote_milestone',
    'new_headline', 'constituency_alert', 'system'
  )),
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, trigger_type)
);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage own tokens
CREATE POLICY "Users manage own push_tokens" ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users read own notifications
CREATE POLICY "Users read own notification_log" ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- Users update own notifications (mark read)
CREATE POLICY "Users update own notification_log" ON notification_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users manage own preferences
CREATE POLICY "Users manage own notification_preferences" ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications (for triggers)
-- Note: Service role bypasses RLS, so no explicit policy needed for server-side inserts.

-- Auto-update updated_at on push_tokens
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
