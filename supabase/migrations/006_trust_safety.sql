-- KSHETRA Database Schema — Sprint 6: Trust & Safety
-- Depends on: 001_initial_schema.sql, 003_posts_polls_social.sql
--
-- Tables: user_profiles, user_verification, moderation_actions, audit_log, blocked_users

-- ─── USER PROFILES (public profile data) ───

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 50),
  bio TEXT CHECK (char_length(bio) <= 300),
  avatar_url TEXT,
  constituency_id TEXT REFERENCES constituencies(id),
  state_code TEXT REFERENCES states(code),
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN (
    'citizen', 'journalist', 'activist', 'politician', 'official', 'moderator', 'admin'
  )),
  reputation_score INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_until TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_constituency ON user_profiles(constituency_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score DESC);

-- ─── USER VERIFICATION ───

CREATE TABLE IF NOT EXISTS user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'identity', 'journalist', 'politician', 'government_official', 'organization'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'revoked'
  )),
  document_url TEXT,
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, verification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_verification_status ON user_verification(status);
CREATE INDEX IF NOT EXISTS idx_user_verification_user ON user_verification(user_id);

-- ─── MODERATION ACTIONS ───

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warn', 'mute', 'suspend', 'ban', 'unsuspend',
    'delete_content', 'hide_content', 'restore_content',
    'verify_user', 'revoke_verification',
    'escalate', 'dismiss'
  )),
  reason TEXT NOT NULL,
  duration_hours INTEGER,  -- for mute/suspend; NULL = permanent
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at DESC);

-- ─── AUDIT LOG (immutable, append-only) ───

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'user', 'post', 'comment', 'poll', 'issue', 'headline',
    'report', 'moderation', 'verification', 'system'
  )),
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ─── BLOCKED USERS (user-to-user blocks) ───

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Public read profiles (non-suspended)
CREATE POLICY "Public read user_profiles" ON user_profiles FOR SELECT
  USING (is_suspended = false);

-- Users manage own profile
CREATE POLICY "Users manage own profile" ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can see own verification
CREATE POLICY "Users read own verification" ON user_verification FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users submit verification" ON user_verification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Moderation: only moderators/admins can read (enforced at app level via role check)
-- Service role bypasses RLS for server-side moderation operations
CREATE POLICY "Moderators read moderation_actions" ON moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('moderator', 'admin')
    )
  );

-- Audit log: admin-only read
CREATE POLICY "Admins read audit_log" ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Blocked users: users manage own blocks
CREATE POLICY "Users manage own blocks" ON blocked_users FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- Auto-update updated_at
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_verification_updated_at
  BEFORE UPDATE ON user_verification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
