-- KSHETRA Database Schema — Sprint 3: Posts, Polls & Social Layer
-- Depends on: 001_initial_schema.sql (states, constituencies, auth.users)
--
-- Tables: posts, post_media, polls, poll_options, poll_votes,
--         comments, reactions, hashtags, post_hashtags, reports

-- ─── POSTS ───

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT REFERENCES constituencies(id),
  state_code TEXT NOT NULL REFERENCES states(code),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  type TEXT NOT NULL DEFAULT 'discussion' CHECK (type IN (
    'discussion', 'news', 'opinion', 'question', 'alert', 'poll'
  )),
  parent_id UUID REFERENCES posts(id) ON DELETE CASCADE,  -- threading
  reply_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_constituency ON posts(constituency_id);
CREATE INDEX IF NOT EXISTS idx_posts_state ON posts(state_code);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- ─── POST MEDIA (images/links attached to posts) ───

CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'link', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);

-- ─── POLLS ───

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  expires_at TIMESTAMPTZ,
  total_votes INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── POLL OPTIONS ───

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  vote_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

-- ─── POLL VOTES (one vote per user per poll) ───

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)  -- one vote per user per poll
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- ─── COMMENTS (on posts — single-level, not nested) ───

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  reaction_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- ─── REACTIONS (on posts or comments) ───

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like' CHECK (type IN (
    'like', 'insightful', 'disagree', 'celebrate'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Either post or comment, not both
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  -- One reaction per user per target
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- ─── HASHTAGS ───

CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE,  -- lowercase, no #, e.g. 'telangana'
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags(post_count DESC);

-- ─── POST HASHTAGS (many-to-many) ───

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- ─── REPORTS (content moderation) ───

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'misinformation', 'hate_speech',
    'violence', 'impersonation', 'other'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'action_taken', 'dismissed'
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Must target either a post or a comment
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public read for posts, polls, comments, hashtags (non-deleted)
CREATE POLICY "Public read posts" ON posts FOR SELECT
  USING (is_deleted = false);
CREATE POLICY "Public read post_media" ON post_media FOR SELECT USING (true);
CREATE POLICY "Public read polls" ON polls FOR SELECT USING (true);
CREATE POLICY "Public read poll_options" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Public read comments" ON comments FOR SELECT
  USING (is_deleted = false);
CREATE POLICY "Public read hashtags" ON hashtags FOR SELECT USING (true);
CREATE POLICY "Public read post_hashtags" ON post_hashtags FOR SELECT USING (true);
CREATE POLICY "Public read poll_votes" ON poll_votes FOR SELECT USING (true);

-- Auth users can create
CREATE POLICY "Auth users create posts" ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Auth users create post_media" ON post_media FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid()));
CREATE POLICY "Auth users create comments" ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Auth users create reactions" ON reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users create poll_votes" ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users create reports" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Auth users can update own content
CREATE POLICY "Authors update own posts" ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own comments" ON comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Auth users can delete own content
CREATE POLICY "Authors delete own posts" ON posts FOR DELETE
  USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own comments" ON comments FOR DELETE
  USING (auth.uid() = author_id);
CREATE POLICY "Users delete own reactions" ON reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Reports: users can see own reports only
CREATE POLICY "Users read own reports" ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ─── TRIGGER: auto-update updated_at ───

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── STATE-SCOPED FEED VIEW (moved here from 003_multi_state.sql) ───
-- Lives here because it depends on the posts table created above.
CREATE OR REPLACE VIEW state_feed AS
SELECT
  p.*,
  COALESCE(p.state_code, 'TS') AS feed_state
FROM posts p
WHERE p.is_deleted = false
ORDER BY p.created_at DESC;
