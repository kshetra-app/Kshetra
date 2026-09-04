-- 028: User and Page Follow Graph (Ticket 0.3)
-- Depends on: 001_initial_schema.sql (auth.users)

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followed_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created ON user_follows(created_at DESC);

-- Row Level Security
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see who is following whom (public social graph)
CREATE POLICY user_follows_select_policy ON user_follows
  FOR SELECT USING (true);

-- Authenticated user can only follow on behalf of themselves
CREATE POLICY user_follows_insert_policy ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Authenticated user can only unfollow their own follow records
CREATE POLICY user_follows_delete_policy ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);
