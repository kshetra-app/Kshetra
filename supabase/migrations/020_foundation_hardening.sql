-- ============================================================================
-- KSHETRA — Foundation Hardening Migration (020)
-- ============================================================================
-- Purpose: Consolidate missing pieces, add RPCs, materialized views,
--          full-text search, counter triggers, storage policies, and
--          missing tables to make the entire Supabase backend production-ready.
--
-- Safe to run on top of existing 001–019 migrations (fully idempotent).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. MISSING TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- ── User Subscriptions (monetization) ──

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'institutional')),
  stripe_customer_id TEXT,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  exports_this_month INTEGER NOT NULL DEFAULT 0,
  export_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- ── User Sessions (analytics / investor metrics) ──

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  screens_viewed TEXT[] DEFAULT '{}',
  actions_count INTEGER NOT NULL DEFAULT 0,
  state_code TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started ON user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_state ON user_sessions(state_code);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth users insert sessions" ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ── Issue Follows (may not exist if 007 wasn't fully applied) ──

CREATE TABLE IF NOT EXISTS issue_follows (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

-- ── Promise Follows ──

CREATE TABLE IF NOT EXISTS promise_follows (
  promise_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (promise_id, user_id)
);

ALTER TABLE promise_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read promise_follows" ON promise_follows FOR SELECT USING (true);
CREATE POLICY "Auth users follow promises" ON promise_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users unfollow promises" ON promise_follows FOR DELETE USING (auth.uid() = user_id);

-- ── Favorites (unified, may overlap with user_favourites) ──

CREATE TABLE IF NOT EXISTS favorites (
  constituency_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (constituency_id, user_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ── Short Videos (political shorts) ──

CREATE TABLE IF NOT EXISTS political_shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  channel_name TEXT NOT NULL,
  channel_verified BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL,
  state_name TEXT,
  constituency_id TEXT,
  district_name TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  approval_count INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER NOT NULL DEFAULT 0,
  hashtags TEXT[] DEFAULT '{}',
  gradient_colors TEXT[] DEFAULT '{}',
  state_accent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shorts_state ON political_shorts(state_code);
CREATE INDEX IF NOT EXISTS idx_shorts_constituency ON political_shorts(constituency_id);
CREATE INDEX IF NOT EXISTS idx_shorts_status ON political_shorts(status);
CREATE INDEX IF NOT EXISTS idx_shorts_created ON political_shorts(created_at DESC);

ALTER TABLE political_shorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved shorts" ON political_shorts FOR SELECT USING (status IN ('approved', 'pending'));
CREATE POLICY "Auth users upload shorts" ON political_shorts FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Authors update own shorts" ON political_shorts FOR UPDATE USING (auth.uid() = uploaded_by);

-- ── Short Approvals & Flags ──

CREATE TABLE IF NOT EXISTS short_approvals (
  short_id UUID NOT NULL REFERENCES political_shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (short_id, user_id)
);

CREATE TABLE IF NOT EXISTS short_flags (
  short_id UUID NOT NULL REFERENCES political_shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (short_id, user_id)
);

ALTER TABLE short_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read short_approvals" ON short_approvals FOR SELECT USING (true);
CREATE POLICY "Auth approve shorts" ON short_approvals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read short_flags" ON short_flags FOR SELECT USING (true);
CREATE POLICY "Auth flag shorts" ON short_flags FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Short Comments ──

CREATE TABLE IF NOT EXISTS short_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES political_shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_comments_short ON short_comments(short_id);
ALTER TABLE short_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read short_comments" ON short_comments FOR SELECT USING (true);
CREATE POLICY "Auth post short_comments" ON short_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FULL-TEXT SEARCH INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Constituency search (name + district + winner)
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(district, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_constituencies_fts ON constituencies USING GIN(fts);

-- Post search
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_posts_fts ON posts USING GIN(fts);

-- Civic issues search
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_civic_issues_fts ON civic_issues USING GIN(fts);

-- Headlines search
ALTER TABLE headlines ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_headlines_fts ON headlines USING GIN(fts);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COUNTER TRIGGERS (auto-update denormalized counts)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Post reaction counter ──

CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reaction_count ON reactions;
CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- ── Post reply counter ──

CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reply_count ON posts;
CREATE TRIGGER trg_reply_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- ── Issue upvote counter ──

CREATE OR REPLACE FUNCTION update_issue_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE civic_issues SET upvote_count = upvote_count + 1 WHERE id = NEW.issue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE civic_issues SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_upvote_count ON issue_upvotes;
CREATE TRIGGER trg_issue_upvote_count
  AFTER INSERT OR DELETE ON issue_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_issue_upvote_count();

-- ── Issue comment counter ──

CREATE OR REPLACE FUNCTION update_issue_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE civic_issues SET comment_count = comment_count + 1 WHERE id = NEW.issue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE civic_issues SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_comment_count ON issue_comments;
CREATE TRIGGER trg_issue_comment_count
  AFTER INSERT OR DELETE ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION update_issue_comment_count();

-- ── Issue follow counter ──

CREATE OR REPLACE FUNCTION update_issue_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE civic_issues SET follow_count = follow_count + 1 WHERE id = NEW.issue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE civic_issues SET follow_count = GREATEST(follow_count - 1, 0) WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_follow_count ON issue_follows;
CREATE TRIGGER trg_issue_follow_count
  AFTER INSERT OR DELETE ON issue_follows
  FOR EACH ROW EXECUTE FUNCTION update_issue_follow_count();

-- ── Poll vote counter ──

CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    UPDATE polls SET total_votes = total_votes + 1 WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.option_id;
    UPDATE polls SET total_votes = GREATEST(total_votes - 1, 0) WHERE id = OLD.poll_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_vote_counts ON poll_votes;
CREATE TRIGGER trg_poll_vote_counts
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_counts();

-- ── Short approval/flag counter ──

CREATE OR REPLACE FUNCTION update_short_approval_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE political_shorts SET approval_count = approval_count + 1 WHERE id = NEW.short_id;
    -- Auto-approve after 3 approvals
    UPDATE political_shorts SET status = 'approved'
      WHERE id = NEW.short_id AND approval_count >= 3 AND status = 'pending';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE political_shorts SET approval_count = GREATEST(approval_count - 1, 0) WHERE id = OLD.short_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_short_approval_count ON short_approvals;
CREATE TRIGGER trg_short_approval_count
  AFTER INSERT OR DELETE ON short_approvals
  FOR EACH ROW EXECUTE FUNCTION update_short_approval_count();

CREATE OR REPLACE FUNCTION update_short_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE political_shorts SET flag_count = flag_count + 1 WHERE id = NEW.short_id;
    -- Auto-remove after 5 flags
    UPDATE political_shorts SET status = 'removed'
      WHERE id = NEW.short_id AND flag_count >= 5;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE political_shorts SET flag_count = GREATEST(flag_count - 1, 0) WHERE id = OLD.short_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_short_flag_count ON short_flags;
CREATE TRIGGER trg_short_flag_count
  AFTER INSERT OR DELETE ON short_flags
  FOR EACH ROW EXECUTE FUNCTION update_short_flag_count();

-- ── User profile post counter ──

CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE user_profiles SET post_count = GREATEST(post_count - 1, 0) WHERE user_id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_post_count ON posts;
CREATE TRIGGER trg_user_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_post_count();

-- ── Hashtag post counter ──

CREATE OR REPLACE FUNCTION update_hashtag_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hashtag_post_count ON post_hashtags;
CREATE TRIGGER trg_hashtag_post_count
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_post_count();

-- ── Auto-update updated_at for new tables ──

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER political_shorts_updated_at
  BEFORE UPDATE ON political_shorts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC FUNCTIONS (complex queries callable from client)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Get feed with author profiles (paginated) ──

CREATE OR REPLACE FUNCTION get_feed(
  p_state_code TEXT,
  p_constituency_id TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_cursor TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_role TEXT,
  author_is_verified BOOLEAN,
  constituency_id TEXT,
  state_code TEXT,
  content TEXT,
  type TEXT,
  parent_id UUID,
  reply_count INTEGER,
  reaction_count INTEGER,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Poll data (NULL if not a poll)
  poll_id UUID,
  poll_question TEXT,
  poll_total_votes INTEGER,
  poll_is_closed BOOLEAN,
  poll_options JSONB,
  -- Media
  media JSONB,
  -- Hashtags
  hashtags TEXT[],
  -- Current user's reaction (NULL if none)
  user_reaction TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.author_id,
    COALESCE(up.display_name, 'Anonymous') AS author_display_name,
    up.avatar_url AS author_avatar_url,
    COALESCE(up.role, 'citizen') AS author_role,
    EXISTS(SELECT 1 FROM user_verification uv WHERE uv.user_id = p.author_id AND uv.status = 'approved') AS author_is_verified,
    p.constituency_id,
    p.state_code,
    p.content,
    p.type,
    p.parent_id,
    p.reply_count,
    p.reaction_count,
    p.is_pinned,
    p.created_at,
    p.updated_at,
    pl.id AS poll_id,
    pl.question AS poll_question,
    pl.total_votes AS poll_total_votes,
    pl.is_closed AS poll_is_closed,
    (SELECT jsonb_agg(jsonb_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count, 'sort_order', po.sort_order) ORDER BY po.sort_order)
     FROM poll_options po WHERE po.poll_id = pl.id) AS poll_options,
    (SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'media_type', pm.media_type, 'url', pm.url, 'alt_text', pm.alt_text) ORDER BY pm.sort_order)
     FROM post_media pm WHERE pm.post_id = p.id) AS media,
    (SELECT array_agg(h.tag) FROM post_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id WHERE ph.post_id = p.id) AS hashtags,
    r.type AS user_reaction
  FROM posts p
  LEFT JOIN user_profiles up ON up.user_id = p.author_id
  LEFT JOIN polls pl ON pl.post_id = p.id
  LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = auth.uid()
  WHERE p.is_deleted = false
    AND p.state_code = p_state_code
    AND (p_constituency_id IS NULL OR p.constituency_id = p_constituency_id)
    AND (p_type IS NULL OR p.type = p_type)
    AND p.parent_id IS NULL  -- top-level only
    AND p.created_at < p_cursor
  ORDER BY p.is_pinned DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Get issues for a constituency (paginated) ──

CREATE OR REPLACE FUNCTION get_issues(
  p_state_code TEXT,
  p_constituency_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_cursor TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  reporter_id UUID,
  reporter_name TEXT,
  constituency_id TEXT,
  state_code TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  severity TEXT,
  status TEXT,
  upvote_count INTEGER,
  comment_count INTEGER,
  follow_count INTEGER,
  evidence_count INTEGER,
  dispute_count INTEGER,
  mla_tagged BOOLEAN,
  mla_responded BOOLEAN,
  media_urls TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_upvoted BOOLEAN,
  user_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.reporter_id,
    COALESCE(ci.reporter_name, up.display_name, 'Anonymous') AS reporter_name,
    ci.constituency_id,
    ci.state_code,
    ci.title,
    ci.description,
    ci.category,
    ci.severity,
    ci.status,
    ci.upvote_count,
    ci.comment_count,
    ci.follow_count,
    ci.evidence_count,
    ci.dispute_count,
    ci.mla_tagged,
    ci.mla_responded,
    ci.media_urls,
    ci.created_at,
    ci.updated_at,
    EXISTS(SELECT 1 FROM issue_upvotes iu WHERE iu.issue_id = ci.id AND iu.user_id = auth.uid()) AS user_upvoted,
    EXISTS(SELECT 1 FROM issue_follows if2 WHERE if2.issue_id = ci.id AND if2.user_id = auth.uid()) AS user_following
  FROM civic_issues ci
  LEFT JOIN user_profiles up ON up.user_id = ci.reporter_id
  WHERE ci.state_code = p_state_code
    AND (p_constituency_id IS NULL OR ci.constituency_id = p_constituency_id)
    AND (p_status IS NULL OR ci.status = p_status)
    AND (p_category IS NULL OR ci.category = p_category)
    AND ci.created_at < p_cursor
  ORDER BY ci.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Global search across all entities ──

CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  title TEXT,
  subtitle TEXT,
  relevance REAL
) AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := plainto_tsquery('english', p_query);

  RETURN QUERY
  -- Constituencies
  SELECT 'constituency'::TEXT, c.id, c.name, c.district || ' · AC#' || c.ac_no,
    ts_rank(c.fts, tsq)
  FROM constituencies c
  WHERE c.fts @@ tsq AND (p_state_code IS NULL OR c.state_code = p_state_code)

  UNION ALL

  -- Civic issues
  SELECT 'issue'::TEXT, ci.id::TEXT, ci.title, ci.category || ' · ' || ci.status,
    ts_rank(ci.fts, tsq)
  FROM civic_issues ci
  WHERE ci.fts @@ tsq AND (p_state_code IS NULL OR ci.state_code = p_state_code)

  UNION ALL

  -- Headlines
  SELECT 'headline'::TEXT, h.id::TEXT, h.title, h.source_name,
    ts_rank(h.fts, tsq)
  FROM headlines h
  WHERE h.fts @@ tsq AND (p_state_code IS NULL OR h.state_code = p_state_code)

  UNION ALL

  -- Legislator profiles
  SELECT 'legislator'::TEXT, lp.id, lp.display_name,
    lp.current_party || ' · ' || lp.constituency_name,
    CASE WHEN lp.display_name ILIKE '%' || p_query || '%' THEN 1.0
         WHEN lp.full_name ILIKE '%' || p_query || '%' THEN 0.9
         WHEN lp.constituency_name ILIKE '%' || p_query || '%' THEN 0.7
         ELSE 0.3 END::REAL
  FROM legislator_profiles lp
  WHERE (lp.display_name ILIKE '%' || p_query || '%'
    OR lp.full_name ILIKE '%' || p_query || '%'
    OR lp.constituency_name ILIKE '%' || p_query || '%'
    OR lp.current_party ILIKE '%' || p_query || '%')
    AND (p_state_code IS NULL OR lp.state_code = p_state_code)

  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Get trending hashtags ──

CREATE OR REPLACE FUNCTION get_trending_hashtags(
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  tag TEXT,
  post_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT h.tag, COUNT(ph.post_id) AS post_count
  FROM hashtags h
  JOIN post_hashtags ph ON ph.hashtag_id = h.id
  JOIN posts p ON p.id = ph.post_id
  WHERE p.is_deleted = false
    AND p.created_at > now() - INTERVAL '7 days'
    AND (p_state_code IS NULL OR p.state_code = p_state_code)
  GROUP BY h.tag
  ORDER BY post_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Get user dashboard metrics ──

CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id UUID)
RETURNS TABLE (
  posts_count INTEGER,
  issues_reported INTEGER,
  issues_resolved INTEGER,
  upvotes_received BIGINT,
  comments_given BIGINT,
  reputation_score INTEGER,
  civic_score INTEGER,
  favorites_count BIGINT,
  tier TEXT,
  display_name TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(up.post_count, 0) AS posts_count,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id) AS issues_reported,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id AND ci.status = 'resolved') AS issues_resolved,
    (SELECT COUNT(*) FROM issue_upvotes iu JOIN civic_issues ci ON ci.id = iu.issue_id WHERE ci.reporter_id = p_user_id) AS upvotes_received,
    (SELECT COUNT(*) FROM issue_comments ic WHERE ic.user_id = p_user_id) AS comments_given,
    COALESCE(up.reputation_score, 0) AS reputation_score,
    COALESCE(ap.civic_score, 0) AS civic_score,
    (SELECT COUNT(*) FROM favorites f WHERE f.user_id = p_user_id) AS favorites_count,
    COALESCE(us.tier, 'free') AS tier,
    COALESCE(up.display_name, 'Anonymous') AS display_name,
    COALESCE(up.role, 'citizen') AS role
  FROM user_profiles up
  LEFT JOIN aspirant_profiles ap ON ap.user_id = p_user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p_user_id
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Constituency analytics ──

CREATE OR REPLACE FUNCTION get_constituency_stats(p_constituency_id TEXT)
RETURNS TABLE (
  total_issues BIGINT,
  open_issues BIGINT,
  resolved_issues BIGINT,
  avg_resolution_days NUMERIC,
  total_posts BIGINT,
  active_followers BIGINT,
  top_categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_issues,
    COUNT(*) FILTER (WHERE ci.status = 'open') AS open_issues,
    COUNT(*) FILTER (WHERE ci.status = 'resolved') AS resolved_issues,
    AVG(EXTRACT(EPOCH FROM (ci.resolved_at - ci.created_at)) / 86400)
      FILTER (WHERE ci.resolved_at IS NOT NULL)::NUMERIC AS avg_resolution_days,
    (SELECT COUNT(*) FROM posts p WHERE p.constituency_id = p_constituency_id AND p.is_deleted = false) AS total_posts,
    (SELECT COUNT(DISTINCT f.user_id) FROM favorites f WHERE f.constituency_id = p_constituency_id) AS active_followers,
    (SELECT jsonb_agg(jsonb_build_object('category', sub.category, 'count', sub.cnt))
     FROM (
       SELECT ci2.category, COUNT(*) AS cnt
       FROM civic_issues ci2
       WHERE ci2.constituency_id = p_constituency_id
       GROUP BY ci2.category
       ORDER BY cnt DESC LIMIT 5
     ) sub) AS top_categories
  FROM civic_issues ci
  WHERE ci.constituency_id = p_constituency_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Auto-create user profile on auth signup ──

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'citizen'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MATERIALIZED VIEWS (for analytics dashboards)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── State-level election summary ──

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_state_election_summary AS
SELECT
  er.election_id,
  e.state_code,
  e.year,
  e.type AS election_type,
  er.winner_party AS party,
  COUNT(*) AS seats_won,
  SUM(er.winner_votes) AS total_votes,
  AVG(er.margin) AS avg_margin,
  MIN(er.margin) AS min_margin,
  MAX(er.margin) AS max_margin
FROM election_results er
JOIN elections e ON e.id = er.election_id
GROUP BY er.election_id, e.state_code, e.year, e.type, er.winner_party
ORDER BY e.state_code, e.year DESC, seats_won DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_state_election_summary
  ON mv_state_election_summary(election_id, party);

-- ── Platform metrics (for investor dashboard) ──

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_metrics AS
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - INTERVAL '7 days') AS users_last_7d,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - INTERVAL '30 days') AS users_last_30d,
  (SELECT COUNT(*) FROM posts WHERE is_deleted = false) AS total_posts,
  (SELECT COUNT(*) FROM posts WHERE created_at > now() - INTERVAL '7 days' AND is_deleted = false) AS posts_last_7d,
  (SELECT COUNT(*) FROM civic_issues) AS total_issues,
  (SELECT COUNT(*) FROM civic_issues WHERE status = 'resolved') AS resolved_issues,
  (SELECT COUNT(*) FROM reactions) AS total_reactions,
  (SELECT COUNT(*) FROM poll_votes) AS total_poll_votes,
  (SELECT COUNT(*) FROM political_shorts) AS total_shorts,
  (SELECT COUNT(DISTINCT state_code) FROM constituencies) AS states_covered,
  (SELECT COUNT(*) FROM constituencies) AS constituencies_covered,
  (SELECT COUNT(*) FROM legislator_profiles) AS legislator_profiles_count,
  now() AS refreshed_at;

-- ── Refresh function (call via pg_cron or manually) ──

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_state_election_summary;
  REFRESH MATERIALIZED VIEW mv_platform_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS (run via Supabase dashboard or API)
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Storage bucket creation must be done via Supabase Dashboard or
-- storage API. The SQL below documents the intended structure.
--
-- Buckets:
--   avatars        — User profile photos (public read, auth write own)
--   kyc-selfies    — KYC verification selfies (private, auth write own, admin read)
--   issue-media    — Civic issue photos/videos (public read, auth write)
--   short-videos   — Political short thumbnails (public read, auth write)
--   evidence       — Promise evidence uploads (public read, auth write)
--   manifesto-docs — Party manifesto PDFs (public read, admin write)

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow anon and authenticated to call RPCs
GRANT EXECUTE ON FUNCTION get_feed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_issues TO anon, authenticated;
GRANT EXECUTE ON FUNCTION global_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trending_hashtags TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_constituency_stats TO anon, authenticated;

-- Allow reading materialized views
GRANT SELECT ON mv_state_election_summary TO anon, authenticated;
GRANT SELECT ON mv_platform_metrics TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE. Run `SELECT refresh_materialized_views();` after seeding data.
-- ─────────────────────────────────────────────────────────────────────────────
