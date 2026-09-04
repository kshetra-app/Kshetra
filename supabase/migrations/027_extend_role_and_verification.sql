-- 027: Extend Role System, Verification Status, and Pages Table (Ticket 0.2)
-- Depends on: 006_trust_safety.sql (user_profiles)

-- 1. Extend user_profiles.role CHECK constraint to include 'aspirant' and 'party'
-- Safely drop old check constraint if it exists and add the extended one
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN (
      'citizen', 'journalist', 'activist', 'politician', 'official', 'moderator', 'admin', 'aspirant', 'party'
    ));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Add verification_status column to user_profiles
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_verification_status
  ON user_profiles(verification_status);

-- 3. Create pages table for political, journalistic, and party entities
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  handle TEXT UNIQUE NOT NULL CHECK (char_length(handle) BETWEEN 2 AND 50),
  role TEXT NOT NULL CHECK (role IN ('aspirant', 'politician', 'party', 'journalist')),
  category TEXT NOT NULL DEFAULT 'political',
  bio TEXT CHECK (char_length(bio) <= 500),
  avatar_url TEXT,
  banner_url TEXT,
  constituency_id TEXT REFERENCES constituencies(id),
  state_code TEXT REFERENCES states(code),
  is_pro BOOLEAN NOT NULL DEFAULT false,
  pro_subscription_id TEXT,
  pro_expires_at TIMESTAMPTZ,
  follower_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_owner ON pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_pages_role ON pages(role);
CREATE INDEX IF NOT EXISTS idx_pages_handle ON pages(handle);
CREATE INDEX IF NOT EXISTS idx_pages_constituency ON pages(constituency_id);
CREATE INDEX IF NOT EXISTS idx_pages_state ON pages(state_code);

-- 4. Row Level Security for pages
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view pages
CREATE POLICY pages_select_policy ON pages
  FOR SELECT USING (true);

-- Only users with allowed roles (aspirant, politician, party, journalist) can create pages
CREATE POLICY pages_insert_policy ON pages
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('aspirant', 'politician', 'party', 'journalist', 'admin')
    )
  );

-- Page owner can update their page
CREATE POLICY pages_update_policy ON pages
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- Page owner can delete their page
CREATE POLICY pages_delete_policy ON pages
  FOR DELETE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
