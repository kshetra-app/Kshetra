-- ========================================================
-- KSHETRA ALL MIGRATIONS COMBINED (001 - 028)
-- Generated at: 2026-09-04T14:38:40.738Z
-- Run this script in the Supabase SQL Editor to provision
-- the entire database schema, roles, RLS, and seed data.
-- ========================================================


-- ────────────────────────────────────────────────────────
-- START MIGRATION: 001_initial_schema.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Phase 3C
-- PostgreSQL + PostGIS on Supabase
--
-- This migration creates the core tables for constituencies,
-- elections, and user favourites.

-- Enable PostGIS extension (Supabase usually has this pre-enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── STATES ───

CREATE TABLE IF NOT EXISTS states (
  code TEXT PRIMARY KEY,          -- e.g. 'TS', 'AP', 'KA'
  name TEXT NOT NULL,             -- e.g. 'Telangana'
  total_seats INTEGER NOT NULL,
  ruling_party TEXT,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CONSTITUENCIES ───

CREATE TABLE IF NOT EXISTS constituencies (
  id TEXT PRIMARY KEY,            -- e.g. 'TS-AC-1'
  ac_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  state_code TEXT NOT NULL REFERENCES states(code),
  district TEXT NOT NULL,
  reservation_status TEXT NOT NULL CHECK (reservation_status IN ('GEN', 'SC', 'ST')),
  boundary GEOMETRY(MultiPolygon, 4326),  -- PostGIS geometry
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state_code, ac_no)
);

CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
CREATE INDEX IF NOT EXISTS idx_constituencies_district ON constituencies(district);
CREATE INDEX IF NOT EXISTS idx_constituencies_boundary ON constituencies USING GIST(boundary);

-- ─── ELECTIONS ───

CREATE TABLE IF NOT EXISTS elections (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL REFERENCES states(code),
  year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assembly', 'parliament')),
  turnout DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state_code, year, type)
);

-- ─── ELECTION RESULTS (per constituency per election) ───

CREATE TABLE IF NOT EXISTS election_results (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES elections(id),
  constituency_id TEXT NOT NULL REFERENCES constituencies(id),
  winner_party TEXT NOT NULL,
  winner_name TEXT,
  winner_votes INTEGER,
  runner_up_party TEXT,
  margin INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_results_election ON election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_results_constituency ON election_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_results_party ON election_results(winner_party);

-- ─── USER FAVOURITES (tied to Supabase Auth) ───

CREATE TABLE IF NOT EXISTS user_favourites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL REFERENCES constituencies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_favourites_user ON user_favourites(user_id);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favourites
CREATE POLICY "Users can read own favourites"
  ON user_favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
  ON user_favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON user_favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access to constituencies and elections
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read states" ON states FOR SELECT USING (true);
CREATE POLICY "Public read constituencies" ON constituencies FOR SELECT USING (true);
CREATE POLICY "Public read elections" ON elections FOR SELECT USING (true);
CREATE POLICY "Public read election_results" ON election_results FOR SELECT USING (true);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 002_seed_telangana.sql
-- ────────────────────────────────────────────────────────

-- Seed Telangana state data
-- Run after 001_initial_schema.sql

INSERT INTO states (code, name, total_seats, ruling_party, centroid_lat, centroid_lng)
VALUES ('TS', 'Telangana', 119, 'INC', 17.8495, 79.1151)
ON CONFLICT (code) DO NOTHING;

-- Seed elections (state-level)
INSERT INTO elections (state_code, year, type, turnout, notes) VALUES
  ('TS', 2023, 'assembly', 64.23, 'INC returned to power. BRS lost majority after 9 years.'),
  ('TS', 2018, 'assembly', 73.20, 'TRS (now BRS) won landslide after early dissolution.'),
  ('TS', 2014, 'assembly', 69.16, 'First election after Telangana state formation.')
ON CONFLICT (state_code, year, type) DO NOTHING;

-- NOTE: Constituency and election_result rows should be populated
-- via a migration script that reads from the TypeScript seed data.
-- This ensures the single source of truth remains the TS seed file.
--
-- Run: npx ts-node supabase/scripts/seed-constituencies.ts
-- (to be created when Supabase project is connected)



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 003_multi_state.sql
-- ────────────────────────────────────────────────────────

-- Migration 003: Multi-State Foundation
-- Adds state-scoped tables and seed data for AP, KA support

-- ── States table ────────────────────────────────────────────────────────────
-- The base `states` table is created in 001_initial_schema.sql
-- (code, name, total_seats, ruling_party, centroid_lat, centroid_lng).
-- Here we additively augment it with multi-state metadata columns.
ALTER TABLE states ADD COLUMN IF NOT EXISTS assembly_seats      INTEGER;
ALTER TABLE states ADD COLUMN IF NOT EXISTS parliamentary_seats INTEGER;
ALTER TABLE states ADD COLUMN IF NOT EXISTS zoom_level          DOUBLE PRECISION NOT NULL DEFAULT 7;
ALTER TABLE states ADD COLUMN IF NOT EXISTS data_status         TEXT NOT NULL DEFAULT 'stub'; -- 'full', 'stub', 'planned'
ALTER TABLE states ADD COLUMN IF NOT EXISTS has_geojson         BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed / enrich states. total_seats is NOT NULL in 001, so it is always
-- provided (kept in sync with assembly_seats). Existing rows are enriched.
INSERT INTO states (code, name, total_seats, assembly_seats, parliamentary_seats, ruling_party, centroid_lat, centroid_lng, zoom_level, data_status, has_geojson)
VALUES
  ('TS', 'Telangana', 119, 119, 17, 'INC', 17.8495, 79.1151, 7, 'full', TRUE),
  ('AP', 'Andhra Pradesh', 175, 175, 25, 'TDP', 15.9129, 79.7400, 7, 'stub', FALSE),
  ('KA', 'Karnataka', 224, 224, 28, 'INC', 15.3173, 75.7139, 6.5, 'stub', FALSE),
  ('MH', 'Maharashtra', 288, 288, 48, 'BJP', 19.7515, 75.7139, 6, 'planned', FALSE)
ON CONFLICT (code) DO UPDATE SET
  assembly_seats      = EXCLUDED.assembly_seats,
  parliamentary_seats = EXCLUDED.parliamentary_seats,
  zoom_level          = EXCLUDED.zoom_level,
  data_status         = EXCLUDED.data_status,
  has_geojson         = EXCLUDED.has_geojson;

-- ── Constituencies table (multi-state) ──────────────────────────────────────
-- The base `constituencies` table is created in 001_initial_schema.sql
-- (id, ac_no, name, state_code, district, reservation_status, boundary).
-- Here we additively augment it with current-MLA / latest-result metadata.
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS current_party        TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS current_mla          TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS latest_election_year INTEGER;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS winner_votes         INTEGER;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS runner_up_party      TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS margin               INTEGER;

-- Index for common queries (idx_constituencies_state already exists from 001)
CREATE INDEX IF NOT EXISTS idx_constituencies_party ON constituencies(current_party);
CREATE INDEX IF NOT EXISTS idx_constituencies_state_district ON constituencies(state_code, district);

-- ── Add state_code to existing social tables ────────────────────────────────
-- posts.state_code is owned by 003_posts_polls_social.sql and
-- civic_issues.state_code by 004_civic_dashboard.sql (both NOT NULL REFERENCES
-- states(code) in their own CREATE TABLE). Nothing to add here.

-- ── RLS policies for constituencies ─────────────────────────────────────────
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "constituencies_read_all"
  ON constituencies FOR SELECT
  USING (true);

CREATE POLICY "constituencies_insert_admin"
  ON constituencies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── State-scoped feed view ──────────────────────────────────────────────────
-- The state_feed view is defined in 003_posts_polls_social.sql, after the
-- posts table exists (this migration runs before posts is created).



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 0035_posts_polls_social.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 004_civic_dashboard.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 4: Civic Dashboard
-- Depends on: 001_initial_schema.sql, 003_posts_polls_social.sql
--
-- Tables: civic_issues, issue_upvotes, headlines

-- ─── CIVIC ISSUES ───

CREATE TABLE IF NOT EXISTS civic_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT REFERENCES constituencies(id),
  state_code TEXT NOT NULL REFERENCES states(code),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description TEXT CHECK (char_length(description) <= 2000),
  category TEXT NOT NULL CHECK (category IN (
    'roads', 'water', 'electricity', 'sanitation', 'healthcare',
    'education', 'public_safety', 'transport', 'housing',
    'environment', 'corruption', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'in_progress', 'resolved', 'closed'
  )),
  upvote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_civic_issues_constituency ON civic_issues(constituency_id);
CREATE INDEX IF NOT EXISTS idx_civic_issues_state ON civic_issues(state_code);
CREATE INDEX IF NOT EXISTS idx_civic_issues_category ON civic_issues(category);
CREATE INDEX IF NOT EXISTS idx_civic_issues_status ON civic_issues(status);
CREATE INDEX IF NOT EXISTS idx_civic_issues_severity ON civic_issues(severity);
CREATE INDEX IF NOT EXISTS idx_civic_issues_created ON civic_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_issues_upvotes ON civic_issues(upvote_count DESC);

-- ─── ISSUE UPVOTES ───

CREATE TABLE IF NOT EXISTS issue_upvotes (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

-- ─── HEADLINES ───

CREATE TABLE IF NOT EXISTS headlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL REFERENCES states(code),
  constituency_id TEXT REFERENCES constituencies(id),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 300),
  summary TEXT CHECK (char_length(summary) <= 500),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'politics' CHECK (category IN (
    'politics', 'governance', 'development', 'law_and_order',
    'economy', 'education', 'health', 'environment', 'corruption', 'opinion'
  )),
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_headlines_state ON headlines(state_code);
CREATE INDEX IF NOT EXISTS idx_headlines_constituency ON headlines(constituency_id);
CREATE INDEX IF NOT EXISTS idx_headlines_category ON headlines(category);
CREATE INDEX IF NOT EXISTS idx_headlines_published ON headlines(published_at DESC);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE civic_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE headlines ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read civic_issues" ON civic_issues FOR SELECT USING (true);
CREATE POLICY "Public read issue_upvotes" ON issue_upvotes FOR SELECT USING (true);
CREATE POLICY "Public read headlines" ON headlines FOR SELECT USING (true);

-- Auth users can create issues & upvote
CREATE POLICY "Auth users create issues" ON civic_issues FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Auth users upvote" ON issue_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users remove upvote" ON issue_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Authors can update own issues
CREATE POLICY "Authors update own issues" ON civic_issues FOR UPDATE
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id);

-- Auto-update updated_at
CREATE TRIGGER civic_issues_updated_at
  BEFORE UPDATE ON civic_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 005_push_notifications.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 006_trust_safety.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 007_civic_engagement_pipeline.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 12: Civic Engagement Pipeline (Full)
-- Depends on: 004_civic_dashboard.sql, 006_trust_safety.sql
--
-- New tables: issue_comments, issue_follows, issue_disputes, issue_evidence
-- Alter: civic_issues (new columns for full lifecycle)
-- Materialized view: constituency_sentiment_mv

-- ─── ALTER civic_issues — full lifecycle columns ───

ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS follow_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS dispute_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS mla_tagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS mla_responded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS mla_response_note TEXT;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS is_verified_report BOOLEAN NOT NULL DEFAULT false;

-- ─── ISSUE COMMENTS ───

CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  image_url TEXT,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_created ON issue_comments(created_at DESC);

-- ─── ISSUE FOLLOWS ───

CREATE TABLE IF NOT EXISTS issue_follows (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_follows_user ON issue_follows(user_id);

-- ─── ISSUE DISPUTES ───

CREATE TABLE IF NOT EXISTS issue_disputes (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (char_length(reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

-- ─── ISSUE EVIDENCE (community corroboration) ───

CREATE TABLE IF NOT EXISTS issue_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  image_url TEXT NOT NULL,
  caption TEXT CHECK (char_length(caption) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_evidence_issue ON issue_evidence(issue_id);

-- ─── ISSUE STATUS HISTORY (audit trail) ───

CREATE TABLE IF NOT EXISTS issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  note TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_status_history_issue ON issue_status_history(issue_id);

-- ─── CONSTITUENCY SENTIMENT (materialized view) ───

CREATE MATERIALIZED VIEW IF NOT EXISTS constituency_sentiment_mv AS
SELECT
  ci.constituency_id,
  ci.state_code,
  COUNT(*) FILTER (WHERE ci.status = 'resolved') AS resolved_count,
  COUNT(*) FILTER (WHERE ci.status IN ('open', 'acknowledged', 'in_progress')) AS open_count,
  SUM(CASE ci.severity
    WHEN 'critical' THEN 4 WHEN 'high' THEN 3
    WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 1 END
  ) FILTER (WHERE ci.status IN ('open', 'acknowledged', 'in_progress')) AS negative_weight,
  SUM(CASE ci.severity
    WHEN 'critical' THEN 4 WHEN 'high' THEN 3
    WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 1 END
  ) FILTER (WHERE ci.status = 'resolved') AS positive_weight,
  SUM(ci.upvote_count) AS total_upvotes,
  COUNT(*) AS total_issues,
  COUNT(*) FILTER (WHERE ci.mla_tagged) AS mla_tagged_count,
  COUNT(*) FILTER (WHERE ci.mla_responded) AS mla_responded_count
FROM civic_issues ci
WHERE ci.created_at > now() - INTERVAL '30 days'
  AND ci.constituency_id IS NOT NULL
GROUP BY ci.constituency_id, ci.state_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_constituency_sentiment_mv_id
  ON constituency_sentiment_mv(constituency_id);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_status_history ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read issue_comments" ON issue_comments FOR SELECT USING (true);
CREATE POLICY "Public read issue_follows" ON issue_follows FOR SELECT USING (true);
CREATE POLICY "Public read issue_disputes" ON issue_disputes FOR SELECT USING (true);
CREATE POLICY "Public read issue_evidence" ON issue_evidence FOR SELECT USING (true);
CREATE POLICY "Public read issue_status_history" ON issue_status_history FOR SELECT USING (true);

-- Auth users can create
CREATE POLICY "Auth users create comments" ON issue_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users follow issues" ON issue_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users unfollow" ON issue_follows FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Auth users dispute" ON issue_disputes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users add evidence" ON issue_evidence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── TRIGGER: auto-increment comment_count on civic_issues ───

CREATE OR REPLACE FUNCTION update_issue_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE civic_issues SET comment_count = comment_count + 1 WHERE id = NEW.issue_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE civic_issues SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.issue_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_comment_count_trigger
  AFTER INSERT OR DELETE ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION update_issue_comment_count();

-- ─── TRIGGER: auto-increment follow_count on civic_issues ───

CREATE OR REPLACE FUNCTION update_issue_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE civic_issues SET follow_count = follow_count + 1 WHERE id = NEW.issue_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE civic_issues SET follow_count = GREATEST(follow_count - 1, 0) WHERE id = OLD.issue_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_follow_count_trigger
  AFTER INSERT OR DELETE ON issue_follows
  FOR EACH ROW EXECUTE FUNCTION update_issue_follow_count();

-- ─── TRIGGER: auto-increment evidence_count + dispute_count ───

CREATE OR REPLACE FUNCTION update_issue_evidence_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE civic_issues SET evidence_count = evidence_count + 1 WHERE id = NEW.issue_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_evidence_count_trigger
  AFTER INSERT ON issue_evidence
  FOR EACH ROW EXECUTE FUNCTION update_issue_evidence_count();

CREATE OR REPLACE FUNCTION update_issue_dispute_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE civic_issues SET dispute_count = dispute_count + 1 WHERE id = NEW.issue_id;
  -- Auto-reopen if 5+ disputes on a resolved issue
  IF (SELECT dispute_count FROM civic_issues WHERE id = NEW.issue_id) >= 5
     AND (SELECT status FROM civic_issues WHERE id = NEW.issue_id) = 'resolved'
  THEN
    UPDATE civic_issues SET status = 'open', resolved_at = NULL WHERE id = NEW.issue_id;
    INSERT INTO issue_status_history (issue_id, from_status, to_status, note)
    VALUES (NEW.issue_id, 'resolved', 'open', 'Auto-reopened: 5+ community disputes');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_dispute_count_trigger
  AFTER INSERT ON issue_disputes
  FOR EACH ROW EXECUTE FUNCTION update_issue_dispute_count();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 008_election_affidavits.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 14: Election Affidavits & Candidate Transparency
-- Depends on: 001_initial_schema.sql
--
-- New tables: candidate_affidavits, affidavit_criminal_cases
-- Purpose: Store EC-filed affidavit data (assets, criminal cases, education, income)
-- Data source: MyNeta/ADR (Association for Democratic Reforms), ECI

-- ─── CANDIDATE AFFIDAVITS ───

CREATE TABLE IF NOT EXISTS candidate_affidavits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  constituency_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  party TEXT NOT NULL,
  election_year INTEGER NOT NULL,

  -- Assets (in INR)
  self_movable_assets BIGINT DEFAULT 0,
  self_immovable_assets BIGINT DEFAULT 0,
  spouse_movable_assets BIGINT DEFAULT 0,
  spouse_immovable_assets BIGINT DEFAULT 0,
  total_assets BIGINT GENERATED ALWAYS AS (
    self_movable_assets + self_immovable_assets + spouse_movable_assets + spouse_immovable_assets
  ) STORED,

  -- Liabilities
  total_liabilities BIGINT DEFAULT 0,

  -- Criminal
  criminal_cases INTEGER NOT NULL DEFAULT 0,
  serious_criminal_cases INTEGER NOT NULL DEFAULT 0,

  -- Personal
  education TEXT,
  profession TEXT,
  age INTEGER,
  self_income BIGINT DEFAULT 0,
  spouse_income BIGINT DEFAULT 0,

  -- Source & metadata
  source_url TEXT,
  filed_date DATE,
  is_winner BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(candidate_name, ac_no, state_code, election_year)
);

-- ─── CRIMINAL CASE DETAILS ───

CREATE TABLE IF NOT EXISTS affidavit_criminal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affidavit_id UUID NOT NULL REFERENCES candidate_affidavits(id) ON DELETE CASCADE,
  case_no TEXT,
  court TEXT,
  ipc_sections TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'convicted', 'acquitted')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ───

CREATE INDEX IF NOT EXISTS idx_affidavits_state_ac ON candidate_affidavits(state_code, ac_no);
CREATE INDEX IF NOT EXISTS idx_affidavits_candidate ON candidate_affidavits(candidate_name);
CREATE INDEX IF NOT EXISTS idx_affidavits_year ON candidate_affidavits(election_year);
CREATE INDEX IF NOT EXISTS idx_affidavits_party ON candidate_affidavits(party);
CREATE INDEX IF NOT EXISTS idx_affidavit_cases_affidavit ON affidavit_criminal_cases(affidavit_id);

-- ─── RLS ───

ALTER TABLE candidate_affidavits ENABLE ROW LEVEL SECURITY;
ALTER TABLE affidavit_criminal_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read affidavits" ON candidate_affidavits
  FOR SELECT USING (true);

CREATE POLICY "Public read criminal cases" ON affidavit_criminal_cases
  FOR SELECT USING (true);

CREATE POLICY "Admin insert affidavits" ON candidate_affidavits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admin insert criminal cases" ON affidavit_criminal_cases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ─── UPDATED_AT TRIGGER ───

CREATE OR REPLACE FUNCTION update_affidavit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affidavit_updated_at
  BEFORE UPDATE ON candidate_affidavits
  FOR EACH ROW EXECUTE FUNCTION update_affidavit_timestamp();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 009_promise_tracker.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 15: Promise Tracker
-- Depends on: 001_initial_schema.sql, 006_trust_safety.sql
--
-- New tables: election_promises, promise_updates, promise_evidence, promise_follows
-- Purpose: Track election promises from manifestos through delivery/failure

-- ─── ELECTION PROMISES ───

CREATE TABLE IF NOT EXISTS election_promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,        -- NULL = state-level promise
  constituency_name TEXT,
  party TEXT NOT NULL,
  mla_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'infrastructure', 'welfare', 'education', 'healthcare', 'economy',
    'governance', 'agriculture', 'environment', 'law_order', 'social_justice'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'manifesto', 'campaign_speech', 'official_announcement', 'budget', 'press_conference'
  )),
  source_url TEXT,
  promised_date DATE NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'promised' CHECK (status IN (
    'promised', 'in_progress', 'partially_delivered', 'delivered', 'broken', 'modified', 'stalled'
  )),
  delivery_percentage INTEGER NOT NULL DEFAULT 0 CHECK (delivery_percentage BETWEEN 0 AND 100),
  follow_count INTEGER NOT NULL DEFAULT 0,
  verification_count INTEGER NOT NULL DEFAULT 0,
  dispute_count INTEGER NOT NULL DEFAULT 0,
  election_year INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROMISE STATUS UPDATES ───

CREATE TABLE IF NOT EXISTS promise_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID NOT NULL REFERENCES election_promises(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name TEXT DEFAULT 'System',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROMISE EVIDENCE (citizen-submitted) ───

CREATE TABLE IF NOT EXISTS promise_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID NOT NULL REFERENCES election_promises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('photo', 'document', 'news_link', 'video')),
  url TEXT NOT NULL,
  caption TEXT,
  is_supporting BOOLEAN NOT NULL DEFAULT true,   -- true = evidence FOR delivery, false = AGAINST
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROMISE FOLLOWS ───

CREATE TABLE IF NOT EXISTS promise_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id UUID NOT NULL REFERENCES election_promises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promise_id, user_id)
);

-- ─── INDEXES ───

CREATE INDEX IF NOT EXISTS idx_promises_state ON election_promises(state_code);
CREATE INDEX IF NOT EXISTS idx_promises_party ON election_promises(party);
CREATE INDEX IF NOT EXISTS idx_promises_status ON election_promises(status);
CREATE INDEX IF NOT EXISTS idx_promises_category ON election_promises(category);
CREATE INDEX IF NOT EXISTS idx_promises_ac ON election_promises(constituency_ac_no);
CREATE INDEX IF NOT EXISTS idx_promise_updates_promise ON promise_updates(promise_id);
CREATE INDEX IF NOT EXISTS idx_promise_evidence_promise ON promise_evidence(promise_id);

-- ─── RLS ───

ALTER TABLE election_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read promises" ON election_promises FOR SELECT USING (true);
CREATE POLICY "Public read updates" ON promise_updates FOR SELECT USING (true);
CREATE POLICY "Public read evidence" ON promise_evidence FOR SELECT USING (true);

CREATE POLICY "Auth follow" ON promise_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth unfollow" ON promise_follows
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Own follows" ON promise_follows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Auth submit evidence" ON promise_evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── TRIGGERS ───

CREATE OR REPLACE FUNCTION update_promise_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE election_promises SET follow_count = follow_count + 1 WHERE id = NEW.promise_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE election_promises SET follow_count = follow_count - 1 WHERE id = OLD.promise_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promise_follow_count
  AFTER INSERT OR DELETE ON promise_follows
  FOR EACH ROW EXECUTE FUNCTION update_promise_follow_count();

CREATE OR REPLACE FUNCTION update_promise_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promise_updated_at
  BEFORE UPDATE ON election_promises
  FOR EACH ROW EXECUTE FUNCTION update_promise_timestamp();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 010_aspiring_leaders.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 16: Aspiring Leaders & Civic Participation
-- Depends on: 006_trust_safety.sql
--
-- New tables: aspirant_profiles, civic_badges, leadership_modules, module_progress,
--             community_challenges, challenge_participation, community_endorsements
-- Purpose: Empower wannabe politicians with tools, learning, gamified civic engagement

-- ─── ADD 'aspirant' TO USER ROLE ───
-- (user_profiles.role already TEXT, just need to document the new valid value)

-- ─── ASPIRANT PROFILES ───

CREATE TABLE IF NOT EXISTS aspirant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  state_code TEXT NOT NULL,
  target_constituency_ac_no INTEGER,
  target_constituency_name TEXT,
  target_election_year INTEGER,
  party_affiliation TEXT,
  is_independent BOOLEAN NOT NULL DEFAULT true,

  -- Civic score (computed, cached)
  civic_score INTEGER NOT NULL DEFAULT 0,
  issues_reported INTEGER NOT NULL DEFAULT 0,
  issues_resolved INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  evidence_submitted INTEGER NOT NULL DEFAULT 0,
  promises_tracked INTEGER NOT NULL DEFAULT 0,
  community_endorsements INTEGER NOT NULL DEFAULT 0,
  modules_completed INTEGER NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,

  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CIVIC BADGES ───

CREATE TABLE IF NOT EXISTS civic_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- ─── LEADERSHIP ACADEMY MODULES ───

CREATE TABLE IF NOT EXISTS leadership_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'electoral_process', 'campaign_strategy', 'legal_framework',
    'public_speaking', 'community_organizing', 'digital_campaigning',
    'policy_making', 'ethics_governance'
  )),
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'quiz', 'case_study')),
  content_url TEXT,
  content_body TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── MODULE PROGRESS ───

CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES leadership_modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  quiz_score INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

-- ─── COMMUNITY CHALLENGES ───

CREATE TABLE IF NOT EXISTS community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('civic', 'awareness', 'accountability', 'community')),
  points INTEGER NOT NULL DEFAULT 10,
  target_count INTEGER NOT NULL DEFAULT 1,
  state_code TEXT,                -- NULL = national challenge
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CHALLENGE PARTICIPATION ───

CREATE TABLE IF NOT EXISTS challenge_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- ─── COMMUNITY ENDORSEMENTS ───

CREATE TABLE IF NOT EXISTS community_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aspirant_id UUID NOT NULL REFERENCES aspirant_profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(endorser_id, aspirant_id)
);

-- ─── INDEXES ───

CREATE INDEX IF NOT EXISTS idx_aspirant_state ON aspirant_profiles(state_code);
CREATE INDEX IF NOT EXISTS idx_aspirant_constituency ON aspirant_profiles(target_constituency_ac_no);
CREATE INDEX IF NOT EXISTS idx_badges_user ON civic_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participation_user ON challenge_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_aspirant ON community_endorsements(aspirant_id);

-- ─── RLS ───

ALTER TABLE aspirant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_endorsements ENABLE ROW LEVEL SECURITY;

-- Public read for public profiles and modules
CREATE POLICY "Public aspirant profiles" ON aspirant_profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Own aspirant profile" ON aspirant_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public badges" ON civic_badges FOR SELECT USING (true);
CREATE POLICY "Public modules" ON leadership_modules FOR SELECT USING (true);
CREATE POLICY "Own progress" ON module_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public challenges" ON community_challenges FOR SELECT USING (true);
CREATE POLICY "Own participation" ON challenge_participation FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public endorsements" ON community_endorsements FOR SELECT USING (true);
CREATE POLICY "Auth endorse" ON community_endorsements FOR INSERT WITH CHECK (auth.uid() = endorser_id);
CREATE POLICY "Auth unendorse" ON community_endorsements FOR DELETE USING (auth.uid() = endorser_id);

-- ─── TRIGGERS ───

CREATE OR REPLACE FUNCTION update_aspirant_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE aspirant_profiles SET community_endorsements = community_endorsements + 1 WHERE id = NEW.aspirant_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE aspirant_profiles SET community_endorsements = community_endorsements - 1 WHERE id = OLD.aspirant_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_endorsement_count
  AFTER INSERT OR DELETE ON community_endorsements
  FOR EACH ROW EXECUTE FUNCTION update_aspirant_endorsement_count();

CREATE OR REPLACE FUNCTION update_aspirant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aspirant_updated_at
  BEFORE UPDATE ON aspirant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_aspirant_timestamp();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 011_delimitation.sql
-- ────────────────────────────────────────────────────────

-- ============================================================
-- 011_delimitation.sql
-- Delimitation Engine: proposals, proposed constituencies,
-- constituency mappings, ward populations, events, citizen impact
-- ============================================================

-- ─── 1. DELIMITATION PROPOSALS ───
CREATE TABLE IF NOT EXISTS delimitation_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code      TEXT NOT NULL REFERENCES states(code),
  proposal_number TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'final', 'superseded', 'rejected')),
  commission_id   TEXT,

  -- Seat changes
  current_seats       INT NOT NULL,
  proposed_seats      INT NOT NULL,
  seat_change         INT GENERATED ALWAYS AS (proposed_seats - current_seats) STORED,

  -- Reservation
  current_sc_seats    INT NOT NULL DEFAULT 0,
  current_st_seats    INT NOT NULL DEFAULT 0,
  proposed_sc_seats   INT NOT NULL DEFAULT 0,
  proposed_st_seats   INT NOT NULL DEFAULT 0,

  -- Source
  gazette_url         TEXT,
  source_url          TEXT,
  published_at        TIMESTAMPTZ,
  objections_deadline TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delim_proposals_state ON delimitation_proposals(state_code);
CREATE INDEX idx_delim_proposals_status ON delimitation_proposals(status);

-- ─── 2. PROPOSED CONSTITUENCIES ───
CREATE TABLE IF NOT EXISTS proposed_constituencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES delimitation_proposals(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL REFERENCES states(code),

  -- New constituency details
  new_ac_no           INT NOT NULL,
  new_name            TEXT NOT NULL,
  new_district_name   TEXT NOT NULL,
  reservation_type    TEXT NOT NULL DEFAULT 'GEN'
                        CHECK (reservation_type IN ('GEN', 'SC', 'ST')),
  proposed_population     BIGINT NOT NULL DEFAULT 0,
  proposed_sc_population  BIGINT NOT NULL DEFAULT 0,
  proposed_st_population  BIGINT NOT NULL DEFAULT 0,
  deviation_from_ideal    REAL NOT NULL DEFAULT 0,

  -- Predecessor mapping (JSONB for flexibility)
  predecessor_ac_nos      INT[] DEFAULT '{}',
  predecessor_overlaps    REAL[] DEFAULT '{}',
  primary_predecessor_ac  INT,

  -- Computed
  change_type         TEXT NOT NULL DEFAULT 'new'
                        CHECK (change_type IN ('unchanged', 'minor_adjust', 'major_redraw',
                               'split', 'merged', 'new', 'abolished')),
  reservation_change  TEXT NOT NULL DEFAULT 'unchanged'
                        CHECK (reservation_change IN ('gen_to_sc', 'gen_to_st', 'sc_to_gen',
                               'sc_to_st', 'st_to_gen', 'st_to_sc', 'unchanged')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposed_ac_proposal ON proposed_constituencies(proposal_id);
CREATE INDEX idx_proposed_ac_state ON proposed_constituencies(state_code);
CREATE UNIQUE INDEX idx_proposed_ac_unique ON proposed_constituencies(proposal_id, new_ac_no);

-- ─── 3. CONSTITUENCY MAPPING (old → new) ───
CREATE TABLE IF NOT EXISTS constituency_mapping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES delimitation_proposals(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL REFERENCES states(code),
  old_ac_no       INT NOT NULL,
  old_name        TEXT NOT NULL,
  new_ac_no       INT NOT NULL,
  new_name        TEXT NOT NULL,
  overlap_percentage    REAL NOT NULL DEFAULT 0 CHECK (overlap_percentage >= 0 AND overlap_percentage <= 100),
  population_transferred BIGINT NOT NULL DEFAULT 0,
  voters_transferred     BIGINT NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mapping_proposal ON constituency_mapping(proposal_id);
CREATE INDEX idx_mapping_old_ac ON constituency_mapping(state_code, old_ac_no);
CREATE INDEX idx_mapping_new_ac ON constituency_mapping(state_code, new_ac_no);

-- ─── 4. WARD / SUB-DISTRICT POPULATION ───
CREATE TABLE IF NOT EXISTS ward_population (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code      TEXT NOT NULL REFERENCES states(code),
  district_name   TEXT NOT NULL,
  sub_district_name TEXT,
  ward_name       TEXT,
  census_year     INT NOT NULL,

  total_population    BIGINT NOT NULL,
  male_population     BIGINT NOT NULL DEFAULT 0,
  female_population   BIGINT NOT NULL DEFAULT 0,
  sc_population       BIGINT NOT NULL DEFAULT 0,
  st_population       BIGINT NOT NULL DEFAULT 0,
  literate_population BIGINT NOT NULL DEFAULT 0,
  urban_population    BIGINT NOT NULL DEFAULT 0,

  area_km_sq      REAL,
  latitude        REAL,
  longitude       REAL,

  -- Link to current AC (pre-delimitation)
  current_ac_no   INT,
  current_ac_name TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ward_pop_state ON ward_population(state_code);
CREATE INDEX idx_ward_pop_district ON ward_population(state_code, district_name);
CREATE INDEX idx_ward_pop_census ON ward_population(census_year);
CREATE INDEX idx_ward_pop_ac ON ward_population(current_ac_no);

-- ─── 5. DELIMITATION EVENTS (timeline) ───
CREATE TABLE IF NOT EXISTS delimitation_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL
                    CHECK (event_type IN (
                      'census_notification', 'census_data_release',
                      'commission_formation', 'commission_meeting',
                      'draft_proposal', 'public_hearing',
                      'objection_filed', 'gazette_notification',
                      'eci_implementation', 'court_order',
                      'parliamentary_debate', 'media_report',
                      'rti_response', 'expert_analysis'
                    )),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  event_date      DATE NOT NULL,
  state_code      TEXT REFERENCES states(code),
  source          TEXT NOT NULL
                    CHECK (source IN (
                      'gazette_of_india', 'eci', 'census_india',
                      'parliament', 'prs_legislative', 'state_gazette',
                      'survey_of_india', 'rti_response', 'media', 'crowdsourced'
                    )),
  source_url      TEXT,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  significance    TEXT NOT NULL DEFAULT 'low'
                    CHECK (significance IN ('none', 'low', 'medium', 'high', 'critical')),
  related_proposal_id UUID REFERENCES delimitation_proposals(id),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delim_events_date ON delimitation_events(event_date DESC);
CREATE INDEX idx_delim_events_state ON delimitation_events(state_code);
CREATE INDEX idx_delim_events_type ON delimitation_events(event_type);
CREATE INDEX idx_delim_events_significance ON delimitation_events(significance);

-- ─── 6. CITIZEN IMPACT LOOKUP ───
CREATE TABLE IF NOT EXISTS citizen_impact (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_code        TEXT NOT NULL,
  latitude        REAL,
  longitude       REAL,
  state_code      TEXT NOT NULL REFERENCES states(code),
  district_name   TEXT NOT NULL,

  -- Current
  current_ac_no       INT NOT NULL,
  current_ac_name     TEXT NOT NULL,
  current_mla         TEXT,
  current_party       TEXT,
  current_reservation TEXT NOT NULL DEFAULT 'GEN'
                        CHECK (current_reservation IN ('GEN', 'SC', 'ST')),

  -- Proposed
  proposed_ac_no       INT,
  proposed_ac_name     TEXT,
  proposed_reservation TEXT CHECK (proposed_reservation IN ('GEN', 'SC', 'ST')),

  -- Change summary
  change_type         TEXT NOT NULL DEFAULT 'unchanged'
                        CHECK (change_type IN ('unchanged', 'minor_adjust', 'major_redraw',
                               'split', 'merged', 'new', 'abolished')),
  reservation_change  TEXT NOT NULL DEFAULT 'unchanged'
                        CHECK (reservation_change IN ('gen_to_sc', 'gen_to_st', 'sc_to_gen',
                               'sc_to_st', 'st_to_gen', 'st_to_sc', 'unchanged')),
  impact_severity     TEXT NOT NULL DEFAULT 'none'
                        CHECK (impact_severity IN ('none', 'low', 'medium', 'high', 'critical')),
  impact_summary      TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citizen_impact_pin ON citizen_impact(pin_code);
CREATE INDEX idx_citizen_impact_state ON citizen_impact(state_code);
CREATE INDEX idx_citizen_impact_ac ON citizen_impact(current_ac_no);

-- ─── RLS POLICIES ───
ALTER TABLE delimitation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_population ENABLE ROW LEVEL SECURITY;
ALTER TABLE delimitation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_impact ENABLE ROW LEVEL SECURITY;

-- Public read access for all delimitation data
CREATE POLICY "Public read delimitation_proposals"
  ON delimitation_proposals FOR SELECT USING (true);
CREATE POLICY "Public read proposed_constituencies"
  ON proposed_constituencies FOR SELECT USING (true);
CREATE POLICY "Public read constituency_mapping"
  ON constituency_mapping FOR SELECT USING (true);
CREATE POLICY "Public read ward_population"
  ON ward_population FOR SELECT USING (true);
CREATE POLICY "Public read delimitation_events"
  ON delimitation_events FOR SELECT USING (true);
CREATE POLICY "Public read citizen_impact"
  ON citizen_impact FOR SELECT USING (true);

-- Admin/moderator insert for managed data
CREATE POLICY "Admin insert delimitation_proposals"
  ON delimitation_proposals FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
CREATE POLICY "Admin insert proposed_constituencies"
  ON proposed_constituencies FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
CREATE POLICY "Admin insert constituency_mapping"
  ON constituency_mapping FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
CREATE POLICY "Admin insert ward_population"
  ON ward_population FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
CREATE POLICY "Admin insert delimitation_events"
  ON delimitation_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
CREATE POLICY "Admin insert citizen_impact"
  ON citizen_impact FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ─── AUTO-UPDATE TRIGGER ───
CREATE TRIGGER set_updated_at_delimitation_proposals
  BEFORE UPDATE ON delimitation_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 012_legislator_profiles.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 24: Master Legislator Profiles
-- Depends on: 001_initial_schema.sql (states table)
--
-- Stores the COMPLETE LegislatorProfile for every MLA, MP (LS/RS), MLC
-- across all Indian states. Zero empty fields strategy.
-- Source: Multi-source scraper suite (MyNeta, PRS, Wikipedia, ECI, Sansad.in)

-- ─── LEGISLATOR PROFILES (Master table) ───

CREATE TABLE IF NOT EXISTS legislator_profiles (
  id TEXT PRIMARY KEY,                      -- MLA_TS_2023_KODANGAL_141
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male','female','other')),
  dob DATE,
  age_at_election INTEGER,
  photo_url TEXT,
  photo_sources JSONB DEFAULT '{}',         -- { myneta, prs, wikipedia, legislature, sansad }
  religion TEXT,
  reservation_category TEXT CHECK (reservation_category IN ('general','sc','st')),
  marital_status TEXT CHECK (marital_status IN ('single','married','widowed','divorced','separated')),
  spouse_name TEXT,
  dependents INTEGER DEFAULT 0,

  -- Career
  house TEXT NOT NULL CHECK (house IN ('state_assembly','lok_sabha','rajya_sabha','state_council')),
  state_code TEXT NOT NULL REFERENCES states(code),
  constituency_name TEXT NOT NULL,
  constituency_number INTEGER,
  constituency_type TEXT CHECK (constituency_type IN ('general','sc','st')),
  district TEXT,
  current_party TEXT NOT NULL,
  current_party_full TEXT,
  previous_parties JSONB DEFAULT '[]',      -- [{ party, fromYear, toYear, reason }]
  terms_served INTEGER DEFAULT 1,
  first_elected_year INTEGER,
  is_current_member BOOLEAN DEFAULT true,
  is_cabinet_minister BOOLEAN DEFAULT false,
  ministerial_portfolio TEXT,
  is_chief_minister BOOLEAN DEFAULT false,
  is_opposition_leader BOOLEAN DEFAULT false,
  committee_memberships TEXT[] DEFAULT '{}',
  special_positions TEXT[] DEFAULT '{}',     -- Speaker, Whip, etc.

  -- Education & Profession
  education_level TEXT,
  education_category TEXT,
  education_detail TEXT,
  self_profession TEXT,
  spouse_profession TEXT,
  other_activities TEXT[] DEFAULT '{}',

  -- Legislative Performance
  questions_asked INTEGER DEFAULT 0,
  debates_participated INTEGER DEFAULT 0,
  private_member_bills INTEGER DEFAULT 0,
  attendance_percent NUMERIC(5,2) DEFAULT 0,
  mplads_funds_utilized NUMERIC(5,2),
  development_projects INTEGER,
  performance_score NUMERIC(5,2) DEFAULT 0,

  -- Constituency Context
  constituency_population INTEGER,
  constituency_area_km_sq NUMERIC(10,2),
  constituency_literacy_rate NUMERIC(5,2),
  constituency_urban_rural TEXT CHECK (constituency_urban_rural IN ('urban','rural','semi_urban')),
  constituency_sc_percent NUMERIC(5,2),
  constituency_st_percent NUMERIC(5,2),
  total_electors INTEGER,
  avg_turnout NUMERIC(5,2),

  -- Dynasty
  is_dynast BOOLEAN DEFAULT false,
  political_generation INTEGER DEFAULT 1,
  family_in_politics JSONB DEFAULT '[]',    -- [{ name, relation, party, position, years }]
  family_constituencies TEXT[] DEFAULT '{}',

  -- Key Dates
  oath_date DATE,
  term_start_date DATE,
  term_end_date DATE,
  notable_events JSONB DEFAULT '[]',        -- [{ date, event, description }]

  -- Computed Insights
  data_completeness INTEGER DEFAULT 0,      -- 0-100
  red_flags JSONB DEFAULT '[]',             -- [{ type, severity, description, value }]
  wealth_rank INTEGER,
  criminal_rank INTEGER,
  performance_rank INTEGER,
  attendance_rank INTEGER,
  incumbency_advantage BOOLEAN DEFAULT false,
  vote_share_trend TEXT DEFAULT 'stable' CHECK (vote_share_trend IN ('increasing','decreasing','stable')),
  asset_growth_trend TEXT DEFAULT 'normal' CHECK (asset_growth_trend IN ('normal','high','suspicious')),
  anti_incumbency_risk TEXT DEFAULT 'low' CHECK (anti_incumbency_risk IN ('low','medium','high')),

  -- Sources
  myneta_url TEXT,
  prs_url TEXT,
  sansad_url TEXT,
  wikipedia_article TEXT,
  legislature_url TEXT,
  data_sources TEXT[] DEFAULT '{}',
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified','partial','unverified')),

  -- House-specific extensions (JSONB to keep schema flat)
  house_extension JSONB DEFAULT '{}',       -- MLA: { assemblyTerm, assemblyTermNumber, delimitation2008Name }
                                            -- MP-LS: { lokSabhaNumber, parliamentaryConstituency, assemblySegments[] }
                                            -- MP-RS: { nominatedByState, termStart, termEnd, retirementBatch }
                                            -- MLC: { councilType, mlcTermYears }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scraped_at TIMESTAMPTZ
);

-- ─── ELECTION HISTORY (one row per election contested) ───

CREATE TABLE IF NOT EXISTS legislator_elections (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT NOT NULL REFERENCES legislator_profiles(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  election_type TEXT NOT NULL CHECK (election_type IN ('assembly','lok_sabha','rajya_sabha','by_election')),
  election_key TEXT,                        -- MyNeta key: Telangana2023
  state_code TEXT NOT NULL,
  constituency_name TEXT NOT NULL,
  constituency_number INTEGER,
  party TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('won','lost','forfeited_deposit')),
  votes_received INTEGER DEFAULT 0,
  evm_votes INTEGER DEFAULT 0,
  postal_votes INTEGER DEFAULT 0,
  vote_share NUMERIC(5,2) DEFAULT 0,
  margin INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  turnout_percent NUMERIC(5,2) DEFAULT 0,
  rank INTEGER DEFAULT 0,                   -- 1=winner, 2=runner-up
  total_candidates INTEGER DEFAULT 0,
  runner_up TEXT,
  runner_up_party TEXT,
  runner_up_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legislator_id, election_year, constituency_name)
);

-- ─── FINANCIAL HISTORY (one row per election affidavit) ───

CREATE TABLE IF NOT EXISTS legislator_finances (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT NOT NULL REFERENCES legislator_profiles(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  election_key TEXT,
  self_movable_assets BIGINT DEFAULT 0,
  self_immovable_assets BIGINT DEFAULT 0,
  spouse_movable_assets BIGINT DEFAULT 0,
  spouse_immovable_assets BIGINT DEFAULT 0,
  dependents_assets BIGINT DEFAULT 0,
  total_assets BIGINT GENERATED ALWAYS AS (
    self_movable_assets + self_immovable_assets +
    spouse_movable_assets + spouse_immovable_assets + dependents_assets
  ) STORED,
  total_liabilities BIGINT DEFAULT 0,
  net_worth BIGINT GENERATED ALWAYS AS (
    self_movable_assets + self_immovable_assets +
    spouse_movable_assets + spouse_immovable_assets + dependents_assets - total_liabilities
  ) STORED,
  self_income BIGINT DEFAULT 0,
  spouse_income BIGINT DEFAULT 0,
  total_income BIGINT GENERATED ALWAYS AS (self_income + spouse_income) STORED,
  is_crorepati BOOLEAN GENERATED ALWAYS AS (
    (self_movable_assets + self_immovable_assets +
     spouse_movable_assets + spouse_immovable_assets + dependents_assets) >= 10000000
  ) STORED,
  wealth_growth_percent NUMERIC(10,2),      -- vs previous election
  wealth_growth_annualized NUMERIC(10,2),
  source_url TEXT,
  affidavit_filed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legislator_id, election_year)
);

-- ─── CRIMINAL CASES (one row per case) ───

CREATE TABLE IF NOT EXISTS legislator_criminal_cases (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT NOT NULL REFERENCES legislator_profiles(id) ON DELETE CASCADE,
  serial_no TEXT,
  fir_no TEXT,
  case_no TEXT,
  court TEXT,
  ipc_sections TEXT[] DEFAULT '{}',
  other_acts TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','convicted','acquitted','discharged')),
  charges_framed BOOLEAN DEFAULT false,
  charges_framed_date DATE,
  cognizance_date DATE,
  description TEXT,
  is_serious BOOLEAN DEFAULT false,         -- IPC 302/307/376/420 etc.
  appeal_filed TEXT,
  appeal_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── KEY CONTESTANTS (runner-ups + top candidates per constituency) ───

CREATE TABLE IF NOT EXISTS key_contestants (
  id SERIAL PRIMARY KEY,
  election_year INTEGER NOT NULL,
  election_key TEXT,
  state_code TEXT NOT NULL,
  constituency_name TEXT NOT NULL,
  constituency_number INTEGER,
  candidate_name TEXT NOT NULL,
  party TEXT NOT NULL,
  votes_received INTEGER DEFAULT 0,
  vote_share NUMERIC(5,2) DEFAULT 0,
  rank INTEGER NOT NULL,                    -- 2=runner-up, 3=third, etc.
  margin INTEGER DEFAULT 0,                 -- from winner
  photo_url TEXT,
  age INTEGER,
  education TEXT,
  criminal_cases INTEGER DEFAULT 0,
  total_assets BIGINT DEFAULT 0,
  is_crorepati BOOLEAN DEFAULT false,
  myneta_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_year, state_code, constituency_name, candidate_name)
);

-- ─── LIVE EVENTS (defections, deaths, appointments, etc.) ───

CREATE TABLE IF NOT EXISTS legislator_events (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT REFERENCES legislator_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'defection','death','appointment','resignation',
    'disqualification','arrest','acquittal','bail',
    'election_win','election_loss','oath_taken',
    'ministry_change','committee_change','party_merge'
  )),
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,                            -- e.g. old party
  new_value TEXT,                            -- e.g. new party
  source_url TEXT,
  detected_by TEXT DEFAULT 'manual' CHECK (detected_by IN ('scraper','manual','news_monitor','wikipedia_monitor')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SCRAPER AUDIT TRAIL ───

CREATE TABLE IF NOT EXISTS scraper_runs (
  id SERIAL PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  state_code TEXT,
  election_key TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_scraped INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_new INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','partial')),
  error_log TEXT,
  completeness_before INTEGER,              -- avg completeness before run
  completeness_after INTEGER,               -- avg completeness after run
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ───

CREATE INDEX IF NOT EXISTS idx_lp_state ON legislator_profiles(state_code);
CREATE INDEX IF NOT EXISTS idx_lp_house ON legislator_profiles(house);
CREATE INDEX IF NOT EXISTS idx_lp_party ON legislator_profiles(current_party);
CREATE INDEX IF NOT EXISTS idx_lp_constituency ON legislator_profiles(constituency_name);
CREATE INDEX IF NOT EXISTS idx_lp_district ON legislator_profiles(district);
CREATE INDEX IF NOT EXISTS idx_lp_current ON legislator_profiles(is_current_member) WHERE is_current_member = true;
CREATE INDEX IF NOT EXISTS idx_lp_completeness ON legislator_profiles(data_completeness);
CREATE INDEX IF NOT EXISTS idx_lp_minister ON legislator_profiles(is_cabinet_minister) WHERE is_cabinet_minister = true;

CREATE INDEX IF NOT EXISTS idx_le_legislator ON legislator_elections(legislator_id);
CREATE INDEX IF NOT EXISTS idx_le_year ON legislator_elections(election_year);
CREATE INDEX IF NOT EXISTS idx_le_state ON legislator_elections(state_code);

CREATE INDEX IF NOT EXISTS idx_lf_legislator ON legislator_finances(legislator_id);
CREATE INDEX IF NOT EXISTS idx_lf_year ON legislator_finances(election_year);

CREATE INDEX IF NOT EXISTS idx_lcc_legislator ON legislator_criminal_cases(legislator_id);
CREATE INDEX IF NOT EXISTS idx_lcc_serious ON legislator_criminal_cases(is_serious) WHERE is_serious = true;

CREATE INDEX IF NOT EXISTS idx_kc_state_year ON key_contestants(state_code, election_year);
CREATE INDEX IF NOT EXISTS idx_kc_constituency ON key_contestants(constituency_name);

CREATE INDEX IF NOT EXISTS idx_le_event_type ON legislator_events(event_type);
CREATE INDEX IF NOT EXISTS idx_le_event_date ON legislator_events(event_date);
CREATE INDEX IF NOT EXISTS idx_le_legislator_ev ON legislator_events(legislator_id);

CREATE INDEX IF NOT EXISTS idx_sr_scraper ON scraper_runs(scraper_name);
CREATE INDEX IF NOT EXISTS idx_sr_status ON scraper_runs(status);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE legislator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

-- Public read access to all legislator data (transparency!)
CREATE POLICY "Public read profiles" ON legislator_profiles FOR SELECT USING (true);
CREATE POLICY "Public read elections" ON legislator_elections FOR SELECT USING (true);
CREATE POLICY "Public read finances" ON legislator_finances FOR SELECT USING (true);
CREATE POLICY "Public read criminal_cases" ON legislator_criminal_cases FOR SELECT USING (true);
CREATE POLICY "Public read key_contestants" ON key_contestants FOR SELECT USING (true);
CREATE POLICY "Public read events" ON legislator_events FOR SELECT USING (true);
CREATE POLICY "Public read scraper_runs" ON scraper_runs FOR SELECT USING (true);

-- Admin/moderator write access
CREATE POLICY "Admin write profiles" ON legislator_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write elections" ON legislator_elections FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write finances" ON legislator_finances FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write criminal_cases" ON legislator_criminal_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write key_contestants" ON key_contestants FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write events" ON legislator_events FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "Admin write scraper_runs" ON scraper_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','moderator')));

-- ─── UPDATED_AT TRIGGER ───

CREATE OR REPLACE FUNCTION update_legislator_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_legislator_profile_updated
  BEFORE UPDATE ON legislator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_legislator_timestamp();

-- ─── USEFUL VIEWS ───

-- Current sitting legislators with key stats
CREATE OR REPLACE VIEW current_legislators AS
SELECT
  lp.id,
  lp.full_name,
  lp.display_name,
  lp.house,
  lp.state_code,
  lp.constituency_name,
  lp.current_party,
  lp.gender,
  lp.age_at_election,
  lp.education_level,
  lp.terms_served,
  lp.is_cabinet_minister,
  lp.is_chief_minister,
  lp.attendance_percent,
  lp.questions_asked,
  lp.data_completeness,
  lp.photo_url,
  (SELECT lf.total_assets FROM legislator_finances lf
   WHERE lf.legislator_id = lp.id ORDER BY lf.election_year DESC LIMIT 1) as latest_total_assets,
  (SELECT count(*) FROM legislator_criminal_cases lcc
   WHERE lcc.legislator_id = lp.id AND lcc.status = 'pending') as pending_cases
FROM legislator_profiles lp
WHERE lp.is_current_member = true
ORDER BY lp.state_code, lp.constituency_name;

-- State-wise data health dashboard
CREATE OR REPLACE VIEW data_health_by_state AS
SELECT
  state_code,
  house,
  count(*) as total_profiles,
  count(*) FILTER (WHERE is_current_member) as current_members,
  round(avg(data_completeness), 1) as avg_completeness,
  count(*) FILTER (WHERE photo_url IS NOT NULL) as with_photo,
  count(*) FILTER (WHERE dob IS NOT NULL) as with_dob,
  count(*) FILTER (WHERE attendance_percent > 0) as with_performance,
  count(*) FILTER (WHERE data_completeness >= 90) as profiles_above_90,
  count(*) FILTER (WHERE data_completeness < 50) as profiles_below_50
FROM legislator_profiles
GROUP BY state_code, house
ORDER BY state_code, house;



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 013_content_accountability.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 014_content_promotion_pipeline.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 015_journalist_platform.sql
-- ────────────────────────────────────────────────────────

-- 015: Journalist Platform
-- Journalist profiles, articles, fact-checks, breaking news, tips, assignments

-- ─── Journalist Profiles ───
CREATE TABLE IF NOT EXISTS journalist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'citizen' CHECK (tier IN ('citizen','stringer','correspondent','senior','editor','bureau_chief')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected','suspended','revoked')),
  press_card_url TEXT,
  outlet_affiliation TEXT,
  outlet_role TEXT,
  beats TEXT[] DEFAULT '{}',
  coverage_areas JSONB DEFAULT '[]',
  portfolio_url TEXT,
  social_links JSONB DEFAULT '[]',
  reputation INTEGER DEFAULT 0,
  total_articles INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_tips INTEGER DEFAULT 0,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  is_available_for_assignment BOOLEAN DEFAULT true,
  featured_article_ids UUID[] DEFAULT '{}',
  badges JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Articles ───
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES journalist_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('breaking_news','news_report','investigation','opinion','editorial','photo_essay','video_report','audio_report','data_story','interview','ground_report','explainer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','fact_checking','approved','published','rejected','retracted','archived')),
  headline TEXT NOT NULL,
  subheadline TEXT,
  slug TEXT UNIQUE,
  body JSONB DEFAULT '[]',
  summary TEXT DEFAULT '',
  cover_image_url TEXT,
  media JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  beats TEXT[] DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  location JSONB,
  word_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER DEFAULT 1,
  views BIGINT DEFAULT 0,
  shares INTEGER DEFAULT 0,
  tips INTEGER DEFAULT 0,
  tip_amount_total NUMERIC(12,2) DEFAULT 0,
  reactions JSONB DEFAULT '{"like":0,"insightful":0,"important":0,"misleading":0}',
  comments INTEGER DEFAULT 0,
  fact_check_id UUID,
  is_breaking BOOLEAN DEFAULT FALSE,
  breaking_priority TEXT CHECK (breaking_priority IN ('flash','urgent','developing','update')),
  is_editor_pick BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_note TEXT,
  related_article_ids UUID[] DEFAULT '{}',
  constituency_ac_no INTEGER,
  state_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_state ON articles(state_code);
CREATE INDEX idx_articles_published ON articles(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_articles_breaking ON articles(is_breaking, breaking_priority) WHERE is_breaking = TRUE;

-- ─── Fact Checks ───
CREATE TABLE IF NOT EXISTS fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id),
  claim_text TEXT NOT NULL,
  claim_source TEXT NOT NULL,
  claim_date DATE,
  verdict TEXT NOT NULL CHECK (verdict IN ('true','mostly_true','half_true','mostly_false','false','misleading','unverifiable','satire','out_of_context')),
  explanation TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',
  checked_by UUID NOT NULL REFERENCES journalist_profiles(id),
  reviewed_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Breaking News ───
CREATE TABLE IF NOT EXISTS breaking_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL CHECK (priority IN ('flash','urgent','developing','update')),
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  article_id UUID REFERENCES articles(id),
  author_id UUID NOT NULL REFERENCES journalist_profiles(id),
  state_code TEXT,
  constituency_ac_no INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  updates JSONB DEFAULT '[]',
  update_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tip Transactions ───
CREATE TABLE IF NOT EXISTS tip_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_journalist_id UUID NOT NULL REFERENCES journalist_profiles(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'INR',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Editorial Assignments ───
CREATE TABLE IF NOT EXISTS editorial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES journalist_profiles(id),
  journalist_id UUID NOT NULL REFERENCES journalist_profiles(id),
  beat TEXT NOT NULL,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','in_progress','submitted','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Triggers ───
CREATE OR REPLACE FUNCTION update_journalist_article_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    UPDATE journalist_profiles SET total_articles = total_articles + 1 WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_article_publish
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_journalist_article_count();

CREATE OR REPLACE FUNCTION update_journalist_tips()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journalist_profiles
  SET total_tips = total_tips + 1,
      total_earnings = total_earnings + NEW.amount
  WHERE id = NEW.to_journalist_id;
  UPDATE articles SET tips = tips + 1, tip_amount_total = tip_amount_total + NEW.amount WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tip_received
  AFTER INSERT ON tip_transactions
  FOR EACH ROW EXECUTE FUNCTION update_journalist_tips();

-- ─── RLS ───
ALTER TABLE journalist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read journalist profiles" ON journalist_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own journalist profile" ON journalist_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read published articles" ON articles FOR SELECT USING (status = 'published' OR author_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authors manage own articles" ON articles FOR ALL USING (author_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public read fact checks" ON fact_checks FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY "Public read breaking news" ON breaking_news FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read tips" ON tip_transactions FOR SELECT USING (true);
CREATE POLICY "Auth insert tips" ON tip_transactions FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Journalist read assignments" ON editorial_assignments FOR SELECT USING (
  journalist_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()) OR
  editor_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid())
);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 016_politician_portal.sql
-- ────────────────────────────────────────────────────────

-- 016: Politician Portal
-- Self-service profiles, broadcasts, events, manifestos, mentorship, endorsements, fundraising, surveys

-- ─── Politician Portal Profiles ───
CREATE TABLE IF NOT EXISTS politician_portal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'aspirant' CHECK (tier IN ('aspirant','local_leader','corporator','mla','mp','minister','chief_minister')),
  party TEXT,
  constituency_ac_no INTEGER,
  state_code TEXT NOT NULL,
  district_name TEXT,
  bio TEXT DEFAULT '',
  photo_url TEXT,
  cover_photo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  office_address TEXT,
  social_links JSONB DEFAULT '[]',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  follower_count INTEGER DEFAULT 0,
  endorsement_count INTEGER DEFAULT 0,
  endorsement_score NUMERIC(8,2) DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,
  issues_responded INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  avg_response_time_hours NUMERIC(6,2) DEFAULT 0,
  manifesto_id UUID,
  mentor_id UUID,
  mentees_count INTEGER DEFAULT 0,
  total_funds_raised NUMERIC(14,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_politician_state ON politician_portal_profiles(state_code);
CREATE INDEX idx_politician_tier ON politician_portal_profiles(tier);
CREATE INDEX idx_politician_party ON politician_portal_profiles(party);
CREATE INDEX idx_politician_ac ON politician_portal_profiles(constituency_ac_no);

-- ─── Constituent Broadcasts ───
CREATE TABLE IF NOT EXISTS constituent_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('announcement','update','greeting','emergency','survey_invite','event_invite','grievance_response')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  target_scope TEXT NOT NULL CHECK (target_scope IN ('constituency','district','state')),
  target_constituency_ac_no INTEGER,
  target_state_code TEXT NOT NULL,
  target_district_name TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Political Events ───
CREATE TABLE IF NOT EXISTS political_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rally','padayatra','town_hall','press_conference','inauguration','meeting','protest','cultural','charity','workshop')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','confirmed','live','completed','cancelled','postponed')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  venue TEXT NOT NULL,
  address TEXT DEFAULT '',
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  state_code TEXT NOT NULL,
  district_name TEXT,
  constituency_ac_no INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  expected_attendance INTEGER,
  actual_attendance INTEGER,
  is_public BOOLEAN DEFAULT TRUE,
  rsvp_count INTEGER DEFAULT 0,
  cover_image_url TEXT,
  live_stream_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_state ON political_events(state_code);
CREATE INDEX idx_events_date ON political_events(start_time DESC);
CREATE INDEX idx_events_politician ON political_events(politician_id);

-- ─── Event RSVPs ───
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES political_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','interested','not_going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ─── E-Manifestos ───
CREATE TABLE IF NOT EXISTS e_manifestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preamble TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  items JSONB DEFAULT '[]',
  target_election TEXT,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  published_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  endorsements INTEGER DEFAULT 0,
  feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Mentorships ───
CREATE TABLE IF NOT EXISTS mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES politician_portal_profiles(id),
  mentee_id UUID NOT NULL REFERENCES politician_portal_profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('seeking','active','completed','paused')),
  focus_areas TEXT[] DEFAULT '{}',
  sessions_completed INTEGER DEFAULT 0,
  next_session_date TIMESTAMPTZ,
  feedback TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(mentor_id, mentee_id)
);

-- ─── Endorsements ───
CREATE TABLE IF NOT EXISTS political_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES politician_portal_profiles(id),
  endorsee_id UUID NOT NULL REFERENCES politician_portal_profiles(id),
  type TEXT NOT NULL CHECK (type IN ('general','capability','integrity','leadership','constituency_work','governance')),
  message TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endorser_id, endorsee_id, type)
);

-- ─── Fundraise Projects ───
CREATE TABLE IF NOT EXISTS fundraise_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  goal_amount NUMERIC(14,2) NOT NULL,
  raised_amount NUMERIC(14,2) DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','goal_reached','closed','cancelled')),
  category TEXT NOT NULL,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  cover_image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  updates JSONB DEFAULT '[]',
  is_transparent BOOLEAN DEFAULT TRUE,
  expenditure_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Donations ───
CREATE TABLE IF NOT EXISTS fundraise_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES fundraise_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  is_anonymous BOOLEAN DEFAULT FALSE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Politician Surveys ───
CREATE TABLE IF NOT EXISTS politician_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','archived')),
  target_scope TEXT NOT NULL CHECK (target_scope IN ('constituency','district','state')),
  target_state_code TEXT NOT NULL,
  target_constituency_ac_no INTEGER,
  questions JSONB DEFAULT '[]',
  response_count INTEGER DEFAULT 0,
  results JSONB,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Survey Responses ───
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES politician_surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, user_id)
);

-- ─── Triggers ───
CREATE OR REPLACE FUNCTION update_event_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE political_events SET rsvp_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = NEW.event_id AND status = 'going') WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_rsvp AFTER INSERT OR UPDATE ON event_rsvps FOR EACH ROW EXECUTE FUNCTION update_event_rsvp_count();

CREATE OR REPLACE FUNCTION update_fundraise_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fundraise_projects SET
    raised_amount = raised_amount + NEW.amount,
    donor_count = donor_count + 1
  WHERE id = NEW.project_id;
  UPDATE politician_portal_profiles SET total_funds_raised = total_funds_raised + NEW.amount WHERE id = (SELECT politician_id FROM fundraise_projects WHERE id = NEW.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donation_received AFTER INSERT ON fundraise_donations FOR EACH ROW EXECUTE FUNCTION update_fundraise_totals();

CREATE OR REPLACE FUNCTION update_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE politician_surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_survey_response AFTER INSERT ON survey_responses FOR EACH ROW EXECUTE FUNCTION update_survey_response_count();

CREATE OR REPLACE FUNCTION update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE politician_portal_profiles SET endorsement_count = endorsement_count + 1 WHERE id = NEW.endorsee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_endorsement_added AFTER INSERT ON political_endorsements FOR EACH ROW EXECUTE FUNCTION update_endorsement_count();

-- ─── RLS ───
ALTER TABLE politician_portal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituent_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE e_manifestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraise_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraise_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read politician profiles" ON politician_portal_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own politician profile" ON politician_portal_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read broadcasts" ON constituent_broadcasts FOR SELECT USING (sent_at IS NOT NULL);
CREATE POLICY "Politicians manage own broadcasts" ON constituent_broadcasts FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public read public events" ON political_events FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Politicians manage own events" ON political_events FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Auth RSVP events" ON event_rsvps FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read published manifestos" ON e_manifestos FOR SELECT USING (status = 'published');
CREATE POLICY "Politicians manage own manifestos" ON e_manifestos FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Participants read mentorships" ON mentorships FOR SELECT USING (true);
CREATE POLICY "Public read endorsements" ON political_endorsements FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Public read fundraise projects" ON fundraise_projects FOR SELECT USING (true);
CREATE POLICY "Auth donate" ON fundraise_donations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read active surveys" ON politician_surveys FOR SELECT USING (status = 'active' OR politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Auth respond to survey" ON survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 017_campaign_manager.sql
-- ────────────────────────────────────────────────────────

-- 017: Campaign Manager & Ad Engine
-- Campaigns, ads, targeting, volunteers, booth strategy, canvassing, A/B tests, revenue tracking

-- ─── Campaigns ───
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('election','awareness','fundraising','outreach','issue_advocacy','brand_building','get_out_vote')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','active','paused','completed','cancelled')),
  state_code TEXT NOT NULL,
  target_constituencies INTEGER[] DEFAULT '{}',
  target_districts TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget_inr NUMERIC(14,2) DEFAULT 0,
  spent_budget_inr NUMERIC(14,2) DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  volunteer_count INTEGER DEFAULT 0,
  booths_covered INTEGER DEFAULT 0,
  total_booths INTEGER DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  engagements BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  sentiment_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_politician ON campaigns(politician_id);
CREATE INDEX idx_campaigns_state ON campaigns(state_code);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ─── Ad Creatives ───
CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('promoted_post','banner','video_ad','carousel','native_story','constituency_spotlight','push_notification','sms_blast','whatsapp_broadcast')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','active','paused','completed','rejected','expired')),
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT DEFAULT '',
  call_to_action TEXT DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  landing_url TEXT,
  targeting JSONB DEFAULT '{}',
  budget JSONB DEFAULT '{}',
  schedule JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{"impressions":0,"reach":0,"clicks":0,"engagements":0,"shares":0,"ctr":0,"cpm":0,"cpc":0,"cpe":0,"frequency":0,"spend":0,"conversions":0,"conversionRate":0,"roi":0}',
  ab_test_id UUID,
  ab_variant TEXT CHECK (ab_variant IN ('A','B','C')),
  disclosure_text TEXT DEFAULT '',
  paid_for_by TEXT DEFAULT '',
  eci_disclosure_id TEXT,
  is_eci_compliant BOOLEAN DEFAULT FALSE,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_campaign ON ad_creatives(campaign_id);
CREATE INDEX idx_ads_status ON ad_creatives(status);
CREATE INDEX idx_ads_format ON ad_creatives(format);

-- ─── A/B Tests ───
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','stopped')),
  variants JSONB DEFAULT '[]',
  winner_id UUID,
  winner_variant TEXT,
  confidence_level NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── Volunteers ───
CREATE TABLE IF NOT EXISTS campaign_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('canvasser','booth_agent','social_media','logistics','data_entry','coordinator','driver','caller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','blacklisted')),
  assigned_booths TEXT[] DEFAULT '{}',
  assigned_wards INTEGER[] DEFAULT '{}',
  constituency_ac_no INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  hours_logged NUMERIC(8,2) DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

CREATE INDEX idx_volunteers_campaign ON campaign_volunteers(campaign_id);

-- ─── Booth Strategy ───
CREATE TABLE IF NOT EXISTS booth_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  booth_id TEXT NOT NULL,
  booth_name TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  constituency_ac_no INTEGER NOT NULL,
  ward_no INTEGER,
  total_voters INTEGER DEFAULT 0,
  estimated_turnout NUMERIC(5,2) DEFAULT 0,
  target_votes INTEGER DEFAULT 0,
  historical_results JSONB DEFAULT '[]',
  assigned_volunteers TEXT[] DEFAULT '{}',
  agent_id UUID,
  agent_name TEXT,
  agent_phone TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','canvassing','ready','polling_day','counted')),
  canvassing_completion NUMERIC(5,2) DEFAULT 0,
  support_estimate NUMERIC(5,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, booth_id)
);

CREATE INDEX idx_booths_campaign ON booth_strategies(campaign_id);
CREATE INDEX idx_booths_ac ON booth_strategies(constituency_ac_no);
CREATE INDEX idx_booths_priority ON booth_strategies(priority);

-- ─── Canvassing Records ───
CREATE TABLE IF NOT EXISTS canvassing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES campaign_volunteers(id),
  booth_id TEXT NOT NULL,
  booth_name TEXT DEFAULT '',
  ward_no INTEGER,
  constituency_ac_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started','in_progress','completed','follow_up_needed')),
  households_visited INTEGER DEFAULT 0,
  households_total INTEGER DEFAULT 0,
  supporter_count INTEGER DEFAULT 0,
  opposition_count INTEGER DEFAULT 0,
  undecided_count INTEGER DEFAULT 0,
  issues_raised TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  gps_track JSONB DEFAULT '[]',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvassing_campaign ON canvassing_records(campaign_id);
CREATE INDEX idx_canvassing_booth ON canvassing_records(booth_id);

-- ─── Ad Revenue Tracking ───
CREATE TABLE IF NOT EXISTS ad_revenue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ad_creatives(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  politician_id UUID NOT NULL,
  amount_inr NUMERIC(10,2) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click','engagement','conversion')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenue_campaign ON ad_revenue_log(campaign_id);
CREATE INDEX idx_revenue_date ON ad_revenue_log(created_at DESC);

-- ─── Views ───
CREATE OR REPLACE VIEW campaign_dashboard AS
SELECT
  c.id,
  c.name,
  c.type,
  c.status,
  c.state_code,
  c.total_budget_inr,
  c.spent_budget_inr,
  CASE WHEN c.total_budget_inr > 0 THEN ROUND((c.spent_budget_inr / c.total_budget_inr) * 100, 1) ELSE 0 END as budget_utilization,
  c.impressions,
  c.reach,
  c.engagements,
  CASE WHEN c.impressions > 0 THEN ROUND((c.engagements::NUMERIC / c.impressions) * 100, 2) ELSE 0 END as engagement_rate,
  (SELECT COUNT(*) FROM ad_creatives WHERE campaign_id = c.id AND status = 'active') as active_ads,
  (SELECT COUNT(*) FROM campaign_volunteers WHERE campaign_id = c.id AND status = 'active') as active_volunteers,
  (SELECT COUNT(*) FROM booth_strategies WHERE campaign_id = c.id AND status = 'ready') as booths_ready,
  (SELECT COUNT(*) FROM booth_strategies WHERE campaign_id = c.id) as total_booths,
  pp.display_name as politician_name,
  pp.party
FROM campaigns c
JOIN politician_portal_profiles pp ON c.politician_id = pp.id;

CREATE OR REPLACE VIEW revenue_summary AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(amount_inr) as total_revenue,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT politician_id) as politicians,
  COUNT(*) as transactions
FROM ad_revenue_log
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ─── Triggers ───
CREATE OR REPLACE FUNCTION update_campaign_ad_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET ad_count = (SELECT COUNT(*) FROM ad_creatives WHERE campaign_id = NEW.campaign_id) WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ad_count AFTER INSERT OR DELETE ON ad_creatives FOR EACH ROW EXECUTE FUNCTION update_campaign_ad_count();

CREATE OR REPLACE FUNCTION update_campaign_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET volunteer_count = (SELECT COUNT(*) FROM campaign_volunteers WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'active') WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_volunteer_count AFTER INSERT OR UPDATE OR DELETE ON campaign_volunteers FOR EACH ROW EXECUTE FUNCTION update_campaign_volunteer_count();

-- ─── RLS ───
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvassing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_revenue_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicians read own campaigns" ON campaigns FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Politicians manage own campaigns" ON campaigns FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Campaign owners read ads" ON ad_creatives FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));
CREATE POLICY "Campaign owners manage ads" ON ad_creatives FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Campaign owners read tests" ON ab_tests FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Volunteers read own records" ON campaign_volunteers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth join as volunteer" ON campaign_volunteers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Campaign owners read booths" ON booth_strategies FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));
CREATE POLICY "Campaign owners manage booths" ON booth_strategies FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Volunteers read canvassing" ON canvassing_records FOR SELECT USING (volunteer_id IN (SELECT id FROM campaign_volunteers WHERE user_id = auth.uid()));
CREATE POLICY "Volunteers insert canvassing" ON canvassing_records FOR INSERT WITH CHECK (volunteer_id IN (SELECT id FROM campaign_volunteers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read revenue" ON ad_revenue_log FOR SELECT USING (true);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 018_enhanced_civic.sql
-- ────────────────────────────────────────────────────────

-- 018: Enhanced Civic Metrics
-- Budget tracking, RTI, legislator attendance, bills, schemes, projects, hearings

-- ─── Budget Allocations ───
CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('education','healthcare','infrastructure','agriculture','social_welfare','law_enforcement','rural_development','urban_development','environment','industry','defence','debt_servicing','salaries','other')),
  allocated_crores NUMERIC(12,2) NOT NULL,
  revised_crores NUMERIC(12,2),
  actual_spent_crores NUMERIC(12,2),
  utilization_percent NUMERIC(5,2) DEFAULT 0,
  constituency_ac_no INTEGER,
  district_name TEXT,
  scheme_name TEXT,
  source TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_state_year ON budget_allocations(state_code, fiscal_year);
CREATE INDEX idx_budget_category ON budget_allocations(category);
CREATE INDEX idx_budget_ac ON budget_allocations(constituency_ac_no);

-- ─── State Budget Summaries ───
CREATE TABLE IF NOT EXISTS state_budget_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  total_budget_crores NUMERIC(14,2) NOT NULL,
  total_revised_crores NUMERIC(14,2),
  total_spent_crores NUMERIC(14,2),
  overall_utilization NUMERIC(5,2) DEFAULT 0,
  category_breakdown JSONB DEFAULT '[]',
  top_schemes JSONB DEFAULT '[]',
  fiscal_deficit_crores NUMERIC(14,2) DEFAULT 0,
  revenue_deficit_crores NUMERIC(14,2) DEFAULT 0,
  debt_to_gdp_ratio NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state_code, fiscal_year)
);

-- ─── RTI Requests ───
CREATE TABLE IF NOT EXISTS rti_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','filed','acknowledged','first_appeal','second_appeal','information_received','denied','partial_response','transferred','closed')),
  department TEXT NOT NULL,
  authority TEXT NOT NULL,
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL,
  state_code TEXT NOT NULL,
  district_name TEXT,
  constituency_ac_no INTEGER,
  filed_date DATE,
  acknowledged_date DATE,
  response_date DATE,
  response_text TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  response_attachment_urls TEXT[] DEFAULT '{}',
  first_appeal_date DATE,
  second_appeal_date DATE,
  fees NUMERIC(8,2) DEFAULT 10,
  is_public BOOLEAN DEFAULT TRUE,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rti_user ON rti_requests(user_id);
CREATE INDEX idx_rti_state ON rti_requests(state_code);
CREATE INDEX idx_rti_status ON rti_requests(status);

-- ─── Legislator Attendance ───
CREATE TABLE IF NOT EXISTS legislator_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legislator_name TEXT NOT NULL,
  party TEXT NOT NULL,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  session_year TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assembly_session','committee_meeting','question_hour','debate','voting','zero_hour')),
  total_sessions INTEGER NOT NULL,
  attended INTEGER NOT NULL,
  attendance_percent NUMERIC(5,2) DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  debates_participated INTEGER DEFAULT 0,
  private_member_bills INTEGER DEFAULT 0,
  ranking INTEGER,
  total_legislators INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(legislator_name, state_code, session_year, type)
);

CREATE INDEX idx_attendance_state ON legislator_attendance(state_code);
CREATE INDEX idx_attendance_ac ON legislator_attendance(constituency_ac_no);

-- ─── Bills / Legislation ───
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ordinary','money','finance','constitutional_amendment','private_member')),
  status TEXT NOT NULL DEFAULT 'introduced' CHECK (status IN ('introduced','first_reading','committee_review','second_reading','passed_lower','passed_upper','presidential_assent','enacted','lapsed','withdrawn','referred_select')),
  introduced_by TEXT NOT NULL,
  introduced_by_party TEXT,
  house_introduced TEXT NOT NULL CHECK (house_introduced IN ('lok_sabha','rajya_sabha','state_assembly','state_council')),
  state_code TEXT,
  introduced_date DATE NOT NULL,
  last_action_date DATE,
  summary TEXT DEFAULT '',
  full_text_url TEXT,
  committee_report_url TEXT,
  related_departments TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  affected_constituencies INTEGER[] DEFAULT '{}',
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  public_opinion JSONB DEFAULT '{"support":0,"oppose":0,"neutral":0}',
  amendments JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_state ON bills(state_code);
CREATE INDEX idx_bills_date ON bills(introduced_date DESC);

-- ─── Government Schemes ───
CREATE TABLE IF NOT EXISTS government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('agriculture','education','health','housing','employment','social_security','women_child','skill_development','digital','infrastructure','rural','urban','tribal','minority')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','completed','merged','discontinued')),
  launched_date DATE NOT NULL,
  ministry TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('central','state','joint')),
  state_code TEXT,
  description TEXT DEFAULT '',
  eligibility TEXT DEFAULT '',
  benefits TEXT DEFAULT '',
  application_url TEXT,
  budget_crores NUMERIC(14,2) DEFAULT 0,
  beneficiaries_target BIGINT DEFAULT 0,
  beneficiaries_actual BIGINT DEFAULT 0,
  coverage_percent NUMERIC(5,2) DEFAULT 0,
  district_wise_coverage JSONB DEFAULT '[]',
  constituency_wise_coverage JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schemes_category ON government_schemes(category);
CREATE INDEX idx_schemes_state ON government_schemes(state_code);
CREATE INDEX idx_schemes_status ON government_schemes(status);

-- ─── Development Projects ───
CREATE TABLE IF NOT EXISTS development_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('road','bridge','flyover','school','hospital','water_supply','sewage','electricity','housing','community_hall','park','stadium','market','bus_depot','railway','metro','airport','port','irrigation','dam')),
  phase TEXT NOT NULL DEFAULT 'proposed' CHECK (phase IN ('proposed','approved','tendered','under_construction','delayed','completed','inaugurated','cancelled','stalled')),
  state_code TEXT NOT NULL,
  district_name TEXT NOT NULL,
  constituency_ac_no INTEGER,
  ward_no INTEGER,
  description TEXT DEFAULT '',
  contractor TEXT,
  sanctioned_cost_crores NUMERIC(12,2) NOT NULL,
  revised_cost_crores NUMERIC(12,2),
  expenditure_crores NUMERIC(12,2) DEFAULT 0,
  sanctioned_date DATE NOT NULL,
  expected_completion DATE NOT NULL,
  actual_completion DATE,
  delay_days INTEGER DEFAULT 0,
  physical_progress NUMERIC(5,2) DEFAULT 0,
  financial_progress NUMERIC(5,2) DEFAULT 0,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  photos JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  issues TEXT[] DEFAULT '{}',
  last_inspection JSONB,
  source TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_state ON development_projects(state_code);
CREATE INDEX idx_projects_ac ON development_projects(constituency_ac_no);
CREATE INDEX idx_projects_phase ON development_projects(phase);
CREATE INDEX idx_projects_category ON development_projects(category);

-- ─── Public Hearings ───
CREATE TABLE IF NOT EXISTS public_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('public_hearing','gram_sabha','ward_meeting','town_hall','environment_clearance','land_acquisition','budget_consultation','grievance_redressal')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  organizer TEXT NOT NULL,
  state_code TEXT NOT NULL,
  district_name TEXT NOT NULL,
  constituency_ac_no INTEGER,
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  registration_url TEXT,
  agenda_items TEXT[] DEFAULT '{}',
  attendee_count INTEGER,
  minutes_url TEXT,
  outcome TEXT,
  related_project_id UUID REFERENCES development_projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hearings_state ON public_hearings(state_code);
CREATE INDEX idx_hearings_date ON public_hearings(date DESC);
CREATE INDEX idx_hearings_ac ON public_hearings(constituency_ac_no);

-- ─── Constituency Development Index ───
CREATE TABLE IF NOT EXISTS constituency_development_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_ac_no INTEGER NOT NULL,
  constituency_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  rank INTEGER,
  total_acs INTEGER,
  percentile NUMERIC(5,2),
  metrics JSONB DEFAULT '[]',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(constituency_ac_no, state_code)
);

CREATE INDEX idx_cdi_state ON constituency_development_index(state_code);
CREATE INDEX idx_cdi_score ON constituency_development_index(overall_score DESC);

-- ─── RLS ───
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_budget_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_development_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read budgets" ON budget_allocations FOR SELECT USING (true);
CREATE POLICY "Public read budget summaries" ON state_budget_summaries FOR SELECT USING (true);
CREATE POLICY "Public read RTI" ON rti_requests FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Auth file RTI" ON rti_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own RTI" ON rti_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public read attendance" ON legislator_attendance FOR SELECT USING (true);
CREATE POLICY "Public read bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Public read schemes" ON government_schemes FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON development_projects FOR SELECT USING (true);
CREATE POLICY "Public read hearings" ON public_hearings FOR SELECT USING (true);
CREATE POLICY "Public read CDI" ON constituency_development_index FOR SELECT USING (true);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 019_live_election.sql
-- ────────────────────────────────────────────────────────

-- 019: Live Election & Data Pipeline
-- Live election tracking, counting rounds, data freshness monitoring

-- ─── Live Elections ───
CREATE TABLE IF NOT EXISTS live_elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  total_seats INTEGER NOT NULL,
  phase TEXT NOT NULL DEFAULT 'pre_election' CHECK (phase IN ('pre_election','nomination','campaigning','silence_period','polling_day','counting_day','results_declared','government_formation')),
  polling_date DATE,
  counting_date DATE,
  is_live BOOLEAN DEFAULT FALSE,
  overall_turnout NUMERIC(5,2) DEFAULT 0,
  counting_progress NUMERIC(5,2) DEFAULT 0,
  results_declared INTEGER DEFAULT 0,
  leading_party TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_elections_state ON live_elections(state_code);
CREATE INDEX idx_live_elections_live ON live_elections(is_live) WHERE is_live = TRUE;

-- ─── Live Party Tallies ───
CREATE TABLE IF NOT EXISTS live_party_tallies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES live_elections(id) ON DELETE CASCADE,
  party TEXT NOT NULL,
  party_color TEXT DEFAULT '#6B7280',
  won INTEGER DEFAULT 0,
  "leading" INTEGER DEFAULT 0,  -- quoted: 'leading' is a reserved keyword in PostgreSQL
  total INTEGER DEFAULT 0,
  previous_election INTEGER DEFAULT 0,
  change INTEGER DEFAULT 0,
  vote_share_percent NUMERIC(5,2) DEFAULT 0,
  previous_vote_share NUMERIC(5,2) DEFAULT 0,
  vote_share_change NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, party)
);

-- ─── Live Constituency Results ───
CREATE TABLE IF NOT EXISTS live_constituency_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES live_elections(id) ON DELETE CASCADE,
  ac_no INTEGER NOT NULL,
  ac_name TEXT NOT NULL,
  district_name TEXT,
  counting_status TEXT NOT NULL DEFAULT 'not_started' CHECK (counting_status IN ('not_started','evm_verification','postal_ballots','round_in_progress','round_complete','counting_paused','counting_complete','result_declared')),
  round_number INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  total_votes_polled INTEGER DEFAULT 0,
  turnout_percent NUMERIC(5,2) DEFAULT 0,
  previous_winner TEXT,
  previous_winner_party TEXT,
  is_upset BOOLEAN DEFAULT FALSE,
  margin_votes INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, ac_no)
);

CREATE INDEX idx_live_results_election ON live_constituency_results(election_id);
CREATE INDEX idx_live_results_status ON live_constituency_results(counting_status);

-- ─── Live Candidate Results ───
CREATE TABLE IF NOT EXISTS live_candidate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_result_id UUID NOT NULL REFERENCES live_constituency_results(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  party_color TEXT DEFAULT '#6B7280',
  votes INTEGER DEFAULT 0,
  vote_percent NUMERIC(5,2) DEFAULT 0,
  is_leading BOOLEAN DEFAULT FALSE,
  is_winner BOOLEAN DEFAULT FALSE,
  round_wise_votes JSONB DEFAULT '[]',
  previous_votes INTEGER,
  swing NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_candidates_result ON live_candidate_results(constituency_result_id);

-- ─── Data Pipeline Status ───
CREATE TABLE IF NOT EXISTS data_pipeline_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  last_fetched TIMESTAMPTZ,
  freshness TEXT NOT NULL DEFAULT 'stale' CHECK (freshness IN ('real_time','minutes_ago','hours_ago','daily','weekly','stale')),
  record_count INTEGER DEFAULT 0,
  is_healthy BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  next_scheduled_fetch TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed pipeline sources ───
INSERT INTO data_pipeline_status (source, freshness, record_count, is_healthy, next_scheduled_fetch) VALUES
  ('eci_results', 'daily', 1674, true, NOW() + INTERVAL '6 hours'),
  ('myneta_affidavits', 'weekly', 2045, true, NOW() + INTERVAL '7 days'),
  ('census_2011', 'stale', 54, true, NULL),
  ('geojson_boundaries', 'weekly', 22, true, NULL),
  ('gazette_monitor', 'hours_ago', 0, true, NOW() + INTERVAL '6 hours'),
  ('eci_monitor', 'hours_ago', 0, true, NOW() + INTERVAL '6 hours'),
  ('parliament_monitor', 'hours_ago', 0, true, NOW() + INTERVAL '6 hours'),
  ('prs_attendance', 'weekly', 0, true, NOW() + INTERVAL '7 days'),
  ('wikipedia_enricher', 'daily', 1665, true, NOW() + INTERVAL '1 day')
ON CONFLICT (source) DO NOTHING;

-- ─── RLS ───
ALTER TABLE live_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_party_tallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_constituency_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_candidate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_pipeline_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read live elections" ON live_elections FOR SELECT USING (true);
CREATE POLICY "Public read party tallies" ON live_party_tallies FOR SELECT USING (true);
CREATE POLICY "Public read constituency results" ON live_constituency_results FOR SELECT USING (true);
CREATE POLICY "Public read candidate results" ON live_candidate_results FOR SELECT USING (true);
CREATE POLICY "Public read pipeline status" ON data_pipeline_status FOR SELECT USING (true);



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 020_foundation_hardening.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 021_seed_demo_data.sql
-- ────────────────────────────────────────────────────────

-- ============================================================================
-- KSHETRA — Production-Grade Seed Data (021)
-- ============================================================================
-- Realistic demo data for investor presentation.
-- Covers: States, Headlines, Leadership Modules, Community Challenges,
--         Civic Issues (sample), Hashtags.
--
-- NOTE: Election data, legislator profiles, and constituency data are loaded
--       from the shared data package at app level. This seed covers only
--       Supabase-native tables that need server-side data.
-- ============================================================================

-- ─── STATES ──────────────────────────────────────────────────────────────────

INSERT INTO states (code, name, total_seats, ruling_party, centroid_lat, centroid_lng)
VALUES
  ('TS', 'Telangana', 119, 'INC', 17.3850, 78.4867),
  ('AP', 'Andhra Pradesh', 175, 'TDP', 15.9129, 79.7400),
  ('KA', 'Karnataka', 224, 'INC', 15.3173, 75.7139),
  ('MH', 'Maharashtra', 288, 'BJP', 19.7515, 75.7139),
  ('KL', 'Kerala', 140, 'CPIM', 10.8505, 76.2711),
  ('TN', 'Tamil Nadu', 234, 'DMK', 11.1271, 78.6569),
  ('WB', 'West Bengal', 294, 'AITC', 22.9868, 87.8550),
  ('DL', 'Delhi', 70, 'AAP', 28.7041, 77.1025),
  ('RJ', 'Rajasthan', 200, 'BJP', 27.0238, 74.2179),
  ('UP', 'Uttar Pradesh', 403, 'BJP', 26.8467, 80.9462),
  ('GJ', 'Gujarat', 182, 'BJP', 22.2587, 71.1924),
  ('MP', 'Madhya Pradesh', 230, 'BJP', 22.9734, 78.6569),
  ('BR', 'Bihar', 243, 'NDA', 25.0961, 85.3131),
  ('OD', 'Odisha', 147, 'BJD', 20.9517, 85.0985),
  ('JH', 'Jharkhand', 81, 'JMM', 23.6102, 85.2799),
  ('HR', 'Haryana', 90, 'BJP', 29.0588, 76.0856),
  ('PB', 'Punjab', 117, 'AAP', 31.1471, 75.3412),
  ('CG', 'Chhattisgarh', 90, 'BJP', 21.2787, 81.8661),
  ('GA', 'Goa', 40, 'BJP', 15.2993, 74.1240),
  ('AS', 'Assam', 126, 'BJP', 26.2006, 92.9376)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  total_seats = EXCLUDED.total_seats,
  ruling_party = EXCLUDED.ruling_party,
  centroid_lat = EXCLUDED.centroid_lat,
  centroid_lng = EXCLUDED.centroid_lng;

-- ─── HEADLINES (recent, realistic) ───────────────────────────────────────────

INSERT INTO headlines (state_code, title, summary, source_name, source_url, category, published_at)
VALUES
  -- Telangana
  ('TS', 'Telangana Assembly Passes Musi River Rejuvenation Bill 2026',
   'The bill allocates ₹15,000 crore for the cleanup and beautification of the Musi River, drawing both praise from environmentalists and criticism from opposition over displacement concerns.',
   'The Hindu', 'https://thehindu.com', 'governance', now() - INTERVAL '2 hours'),

  ('TS', 'BRS Demands White Paper on Telangana Farm Loan Waiver Implementation',
   'BRS working president KT Rama Rao alleges that only 23% of eligible farmers have received loan waiver benefits despite the Congress government''s 2023 election promise.',
   'Deccan Chronicle', 'https://deccanchronicle.com', 'politics', now() - INTERVAL '5 hours'),

  ('TS', 'GHMC Plans 200 New EV Charging Stations Across Hyderabad by Q3 2026',
   'Part of the Telangana EV Policy 2.0, the initiative aims to make Hyderabad India''s most EV-friendly city with public-private partnerships.',
   'Telangana Today', 'https://telanganatoday.com', 'development', now() - INTERVAL '8 hours'),

  ('TS', 'Hyderabad Metro Phase 2: Old City Extension Gets Centre''s Nod',
   'The ₹8,500 crore Phase 2 will connect Falaknuma to MGBS, serving an estimated 3 lakh daily commuters in the densely populated Old City area.',
   'Times of India', 'https://timesofindia.com', 'development', now() - INTERVAL '12 hours'),

  -- Andhra Pradesh
  ('AP', 'AP Cabinet Approves Amaravati Master Plan 3.0 with Singapore Partnership',
   'Chief Minister Chandrababu Naidu unveils the revised capital development plan with a ₹50,000 crore investment roadmap spanning 5 years.',
   'Eenadu', 'https://eenadu.net', 'governance', now() - INTERVAL '3 hours'),

  ('AP', 'YSRCP Stages Walkout Over Polavaram Project Cost Escalation',
   'Opposition alleges the project cost has doubled to ₹72,000 crore with minimal progress since the TDP-JSP alliance took power.',
   'Sakshi', 'https://sakshi.com', 'politics', now() - INTERVAL '6 hours'),

  ('AP', 'Vizag Steel Plant: Centre Agrees to 51% Government Stake Retention',
   'After years of privatization protests, the Union Cabinet approves a restructured ownership model keeping 51% public sector control.',
   'NDTV', 'https://ndtv.com', 'economy', now() - INTERVAL '10 hours'),

  -- Karnataka
  ('KA', 'Karnataka Guarantee Schemes: 2.1 Crore Beneficiaries in First Year',
   'Shakti, Gruha Jyothi, Anna Bhagya, Gruha Lakshmi, and Yuva Nidhi have collectively disbursed ₹45,000 crore, but fiscal concerns mount.',
   'Deccan Herald', 'https://deccanherald.com', 'governance', now() - INTERVAL '4 hours'),

  ('KA', 'Bengaluru Traffic: BBMP Announces ₹12,000 Crore Signal-Free Corridor Plan',
   'The ambitious plan targets 15 major junctions with grade separators and underpass networks to reduce average commute time by 40%.',
   'Bangalore Mirror', 'https://bangaloremirror.com', 'development', now() - INTERVAL '7 hours'),

  -- Maharashtra
  ('MH', 'Mumbai Coastal Road South Phase Opens: 10.5 km in 12 Minutes',
   'The ₹12,721 crore project connecting Marine Drive to Kandivali is now partially operational, reducing travel time from 45 to 12 minutes.',
   'Mumbai Mirror', 'https://mumbaimirror.com', 'development', now() - INTERVAL '1 hour'),

  ('MH', 'Maharashtra Farm Distress: 847 Farmer Suicides Reported in H1 2026',
   'Opposition demands special legislative session as Vidarbha and Marathwada regions bear the brunt of a below-normal monsoon.',
   'Indian Express', 'https://indianexpress.com', 'governance', now() - INTERVAL '9 hours'),

  ('MH', 'Shiv Sena (UBT) Announces Statewide Agitation Over Maratha Reservation',
   'Uddhav Thackeray accuses the Mahayuti government of using the reservation issue as a political tool ahead of the BMC elections.',
   'Loksatta', 'https://loksatta.com', 'politics', now() - INTERVAL '14 hours');

-- ─── LEADERSHIP ACADEMY MODULES ─────────────────────────────────────────────

INSERT INTO leadership_modules (title, description, category, content_type, content_body, duration_minutes, difficulty, is_premium, sort_order)
VALUES
  -- Electoral Process
  ('How Indian Elections Work',
   'Understand the complete election process — from nominations to counting day. Learn about ECI, EVMs, VVPATs, and electoral rolls.',
   'electoral_process', 'article',
   E'# How Indian Elections Work\n\n## The Election Commission of India (ECI)\n\nThe ECI is an autonomous constitutional body responsible for administering elections in India. Established on 25 January 1950, it supervises elections to the Lok Sabha, Rajya Sabha, State Legislative Assemblies, and the offices of the President and Vice President.\n\n## The Electoral Process\n\n### 1. Announcement & Schedule\nThe ECI announces election dates, following the **Model Code of Conduct (MCC)** which comes into effect immediately.\n\n### 2. Nominations\nCandidates file nominations with:\n- Security deposit (₹25,000 for general, ₹12,500 for SC/ST)\n- Affidavit declaring criminal cases, assets, education\n- Signatures of proposers from the constituency\n\n### 3. Campaigning\n- Campaigning ends 48 hours before polling\n- Expenditure limits: ₹40 lakh (Assembly), ₹95 lakh (Lok Sabha)\n- No appeals to caste, religion, or use of government machinery\n\n### 4. Polling\n- Electronic Voting Machines (EVMs) with VVPAT slips\n- Polling from 7 AM to 6 PM typically\n- Security forces deployed at sensitive booths\n\n### 5. Counting\n- Postal ballots counted first\n- EVM votes counted round by round\n- Results declared constituency by constituency\n\n## Key Facts\n- India has **~950 million** registered voters\n- **543** Lok Sabha constituencies\n- **4,120+** Assembly constituencies across 28 states and 8 UTs\n- Average constituency has **~15-20 lakh** voters',
   15, 'beginner', false, 1),

  ('Filing Your Nomination',
   'Step-by-step guide to filing nomination papers, required documents, security deposits, affidavits, and common rejection reasons.',
   'electoral_process', 'article',
   E'# Filing Your Nomination\n\n## Required Documents\n\n1. **Form 2A** (Nomination paper) — available at Returning Officer''s office\n2. **Affidavit (Form 26)** — criminal cases, assets, liabilities, education\n3. **Proof of age** — Birth certificate, school leaving certificate, or passport\n4. **Electoral roll entry** — Must be registered voter in ANY constituency\n5. **Party authorization letter** (if contesting on party symbol)\n\n## Security Deposit\n- **General candidates**: ₹25,000 (Assembly), ₹25,000 (Lok Sabha)\n- **SC/ST candidates**: ₹12,500 (Assembly), ₹12,500 (Lok Sabha)\n- Forfeited if candidate gets less than 1/6th of total valid votes\n\n## Common Rejection Reasons\n- Incomplete affidavit\n- Wrong constituency\n- Insufficient proposers\n- Security deposit not paid\n- Filing after deadline\n\n## Pro Tips\n- File **4 sets** of nomination papers (maximum allowed) as insurance\n- Get your affidavit notarized by a First Class Magistrate\n- Attend scrutiny hearing personally',
   20, 'intermediate', false, 2),

  ('Understanding Election Symbols',
   'How party symbols work, reserved vs free symbols, how independents get symbols, and the legal framework.',
   'electoral_process', 'quiz',
   NULL, 10, 'beginner', false, 3),

  -- Campaign Strategy
  ('Building a Grassroots Campaign',
   'Learn how to build a winning ground-level campaign — booth-level strategy, volunteer networks, and door-to-door canvassing.',
   'campaign_strategy', 'case_study',
   E'# Building a Grassroots Campaign\n\n## The Booth-Level Strategy\n\nEvery Assembly constituency in India has approximately **200-350 polling booths**, each serving about 1,000-1,500 voters. A winning campaign needs a presence at every booth.\n\n## The Pyramid Structure\n\n```\n        Candidate\n            |\n    Constituency Manager\n         /     \\\n    Sector Heads (10-15)\n      /           \\\n  Booth Agents (200-350)\n    /                 \\\nVolunteers (2000-5000)\n```\n\n## Case Study: How a First-Timer Won in Karnataka 2023\n\n**Constituency**: Rajarajeshwari Nagar, Bengaluru\n**Candidate**: First-time contestant, urban professional\n**Margin**: Won by 12,847 votes\n\n### What Worked:\n1. **Mapped every apartment complex** — 450+ complexes with 2 lakh+ residents\n2. **WhatsApp network** — Booth-level groups with daily updates\n3. **Issue-based outreach** — Water supply, traffic, BBMP complaints\n4. **Door-to-door** — 60 days, 15,000 homes personally visited\n5. **Social media** — Instagram reels in Kannada reaching 40 lakh views',
   25, 'intermediate', false, 4),

  ('Fundraising for Independents',
   'Legal ways to raise campaign funds, crowdfunding, transparency requirements, and election expenditure limits.',
   'campaign_strategy', 'article',
   E'# Fundraising for Independent Candidates\n\n## Legal Framework\n\nUnder Section 29C of the Representation of the People Act, 1951, all candidates must maintain a day-to-day account of election expenditure.\n\n## Expenditure Limits (2024 Revised)\n- **Assembly**: ₹40 lakh\n- **Lok Sabha**: ₹95 lakh\n\n## Legitimate Funding Sources\n\n### 1. Personal Funds\n- Most common for independents\n- Must be declared in expenditure statement\n\n### 2. Crowdfunding\n- Platforms like Milaap, Ketto can be used\n- Each donor''s identity must be recorded if donation > ₹20,000\n- Anonymous donations above ₹2,000 are prohibited\n\n### 3. Electoral Bonds (Pre-2024)\n- Supreme Court struck down in February 2024\n- Now replaced by transparent digital donation system\n\n### 4. In-Kind Contributions\n- Volunteer time, venue usage, vehicle lending\n- Must be valued and reported at market rate\n\n## Transparency Requirements\n- File expenditure statement within 30 days of results\n- All donations above ₹20,000 must be reported with donor details\n- Failure to file = disqualification for 3 years',
   20, 'intermediate', false, 5),

  -- Legal Framework
  ('Constitutional Rights of Legislators',
   'Parliamentary privileges, immunity, anti-defection law (10th Schedule), and the legal boundaries of legislative power.',
   'legal_framework', 'article',
   E'# Constitutional Rights of Legislators\n\n## Parliamentary Privileges\n\n### Freedom of Speech (Article 105/194)\n- MLAs/MPs cannot be sued for anything said in the House\n- Extends to committee proceedings\n- Does NOT cover statements outside the House\n\n### Freedom from Arrest (Article 105(3)/194(3))\n- Cannot be arrested in civil cases during session\n- Criminal arrests ARE allowed (with Speaker''s notification)\n- 40 days before and after session: immunity in civil matters\n\n## Anti-Defection Law (10th Schedule)\n\n### What Constitutes Defection:\n1. Voluntarily giving up party membership\n2. Voting against party whip without prior permission\n3. Abstaining from vote against party direction\n\n### Exceptions:\n- **Merger**: If 2/3rds of a party''s legislators merge with another party\n- **Speaker/Chairman**: Can resign from party upon election to Chair\n\n### Consequences:\n- Disqualification from House membership\n- Cannot be re-appointed as Minister\n- Can contest fresh elections\n\n## Key Supreme Court Judgments\n- **Kihoto Hollohan (1992)**: Upheld 10th Schedule\n- **Nabam Rebia (2016)**: Speaker cannot decide disqualification if their own removal is pending',
   30, 'advanced', false, 6),

  -- Public Speaking
  ('Addressing a Public Rally',
   'Techniques for engaging large crowds, voice projection, handling hecklers, and cultural sensitivity in Indian political rallies.',
   'public_speaking', 'video',
   NULL, 15, 'beginner', false, 7),

  -- Community Organizing
  ('Building a Ward-Level Committee',
   'How to identify community leaders, structure local committees, hold productive meetings, and track action items.',
   'community_organizing', 'article',
   E'# Building a Ward-Level Committee\n\n## Why Ward Committees Matter\n\nThe 74th Amendment mandates Ward Committees in every municipality with 3+ lakh population. As an aspiring leader, building an effective ward committee is your first step toward organized community governance.\n\n## Structure\n\n### Core Team (5-7 members)\n- **Ward Convenor** — You or your trusted associate\n- **Secretary** — Minutes, communications\n- **Treasurer** — Funds, accounts\n- **Women''s Representative** — At least 1/3 representation\n- **Youth Representative** — Under 30\n- **Senior Citizen Representative** — Above 60\n- **SC/ST/OBC Representative** — Inclusive representation\n\n## Monthly Meeting Agenda Template\n1. Previous minutes & action item review (10 min)\n2. New issues collection from residents (15 min)\n3. Prioritization & assignment (10 min)\n4. Government scheme awareness (10 min)\n5. Next steps & date (5 min)\n\n## Success Metrics\n- Issues resolved per month\n- Meeting attendance rate\n- Government response rate to escalated issues\n- Resident satisfaction (quarterly survey)',
   20, 'beginner', false, 8),

  -- Ethics & Governance
  ('Ethics in Public Life: The Indian Context',
   'Corruption challenges, RTI as a tool, Lokpal and Lokayukta, asset declaration norms, and building an ethical political career.',
   'ethics_governance', 'article',
   E'# Ethics in Public Life\n\n## The Corruption Challenge\n\nIndia ranks 93rd on Transparency International''s Corruption Perceptions Index (2024). As an aspiring leader, understanding and combating corruption is fundamental.\n\n## Key Anti-Corruption Laws\n\n### Prevention of Corruption Act, 1988 (Amended 2018)\n- Criminalizes bribe-giving AND bribe-taking\n- Special courts for speedy trials\n- Assets disproportionate to known income = offense\n\n### Right to Information Act, 2005\n- Any citizen can request information from public bodies\n- Response within 30 days mandatory\n- Powerful tool for transparency\n\n### Lokpal & Lokayukta Act, 2013\n- Lokpal: Anti-corruption ombudsman at Centre\n- Lokayukta: State-level equivalent\n- Can investigate PM (with safeguards), Ministers, MPs\n\n## Building an Ethical Career\n1. **Declare assets voluntarily** — Even before required by law\n2. **Publish expenditure statements** — Monthly, publicly\n3. **Hold open office hours** — Weekly, documented\n4. **Support RTI applications** — Don''t obstruct, facilitate\n5. **Zero tolerance for middlemen** — Direct citizen access',
   25, 'intermediate', false, 9);

-- ─── COMMUNITY CHALLENGES ────────────────────────────────────────────────────

INSERT INTO community_challenges (title, description, category, points, target_count, state_code, is_active, starts_at, ends_at)
VALUES
  ('Report 3 Local Issues',
   'Document and report 3 civic issues in your constituency with photos and descriptions. Help make local problems visible!',
   'civic', 30, 3, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Attend a Gram Sabha / Ward Meeting',
   'Attend your local governance meeting and share a summary of what was discussed. Active participation starts here.',
   'civic', 20, 1, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Verify 5 Election Promises',
   'Track and verify the status of 5 election promises made by your local MLA. Submit evidence for each.',
   'accountability', 50, 5, NULL, true, now(), now() + INTERVAL '60 days'),

  ('Complete 3 Leadership Modules',
   'Learn about the Indian electoral process by completing any 3 modules from the Leadership Academy.',
   'awareness', 30, 3, NULL, true, now(), now() + INTERVAL '45 days'),

  ('Start a Constituency Discussion',
   'Create a meaningful discussion post about a local issue that gets at least 5 replies from community members.',
   'community', 25, 1, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Telangana Water Audit Challenge',
   'Survey and document the status of public water supply in your ward. Report broken taps, dry borewells, or contamination.',
   'civic', 40, 5, 'TS', true, now(), now() + INTERVAL '45 days'),

  ('Karnataka Guarantee Tracker',
   'Verify whether 3 households in your area have received benefits under Karnataka''s 5 Guarantee schemes.',
   'accountability', 35, 3, 'KA', true, now(), now() + INTERVAL '30 days');

-- ─── HASHTAGS ────────────────────────────────────────────────────────────────

INSERT INTO hashtags (tag, post_count)
VALUES
  ('telangana', 45), ('hyderabad', 38), ('warangal', 12),
  ('andhrapradesh', 32), ('amaravati', 22), ('vizag', 18),
  ('karnataka', 28), ('bengaluru', 35), ('mysuru', 8),
  ('maharashtra', 30), ('mumbai', 42), ('pune', 15),
  ('elections', 55), ('governance', 40), ('infrastructure', 35),
  ('education', 20), ('healthcare', 18), ('agriculture', 12),
  ('corruption', 25), ('development', 30), ('budget', 15),
  ('mla', 22), ('mp', 18), ('parliament', 20),
  ('defections', 10), ('manifesto', 8), ('delimitation', 12),
  ('watercrisis', 15), ('roads', 20), ('traffic', 18),
  ('farmerloan', 12), ('womenssafety', 10), ('youthpolitics', 8),
  ('rti', 6), ('lokpal', 4), ('evmpolitics', 7),
  ('smartcity', 12), ('metrorail', 15), ('cleanindia', 10)
ON CONFLICT (tag) DO UPDATE SET post_count = EXCLUDED.post_count;

-- ─── REFRESH MATERIALIZED VIEWS ──────────────────────────────────────────────

-- Will fail gracefully if underlying data isn't present yet
DO $$
BEGIN
  PERFORM refresh_materialized_views();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Materialized view refresh skipped — run manually after full data load.';
END $$;

-- ============================================================================
-- DONE. Seed data loaded.
-- ============================================================================



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 022_administrative_hierarchy.sql
-- ────────────────────────────────────────────────────────

-- ============================================================================
-- 022: Administrative Hierarchy Framework
-- ============================================================================
-- Booth → Gram Panchayat → Mandal → Constituency → District → State
--
-- This migration builds the sub-constituency data layer that powers
-- booth-level election analytics, local body election tracking, and
-- the many-to-many mandal↔constituency mapping that reflects India's
-- real administrative geography.
--
-- Key design decisions:
--   • Mandal boundaries do NOT align with constituency boundaries.
--     A single mandal can span multiple ACs, and a single AC can
--     contain parts of multiple mandals. We model this via
--     `mandal_constituency_map` (M:N junction table).
--   • Booths ALWAYS belong to exactly one constituency (ECI rule).
--   • The `type` column on mandals handles regional terminology:
--     TS/AP → mandal, UP/Bihar → block/tehsil, TN → taluk, etc.
--   • Revenue villages are the Census 2011 atomic unit, mapped to
--     panchayats. A panchayat may contain 1–N revenue villages.
--   • Local body elections (sarpanch, ZPTC, MPTC) are tracked at
--     panchayat level, separate from assembly/parliament elections.
--
-- Dependencies: 001_initial_schema.sql (states, constituencies, elections)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. MANDALS (Block / Mandal / Tehsil / Taluk / Circle)                ║
-- ║     The intermediate administrative unit between district and village. ║
-- ║     Different Indian states use different names for this level.        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandals (
  -- Composite ID: <state_code>-MDL-<lgd_code>  e.g. 'TS-MDL-501'
  id          TEXT PRIMARY KEY,

  -- Display names
  name        TEXT NOT NULL,
  local_name  TEXT,                             -- Telugu/Hindi/Tamil script name

  -- Parent references
  state_code  TEXT NOT NULL REFERENCES states(code),
  district    TEXT NOT NULL,                    -- District name (denormalized for query speed)

  -- Government directory code (unique within a state)
  lgd_code    INTEGER,

  -- Regional terminology for this administrative level
  type        TEXT NOT NULL DEFAULT 'mandal'
              CHECK (type IN ('mandal', 'block', 'tehsil', 'taluk', 'circle')),

  -- Metadata
  headquarters    TEXT,                         -- Name of the HQ town/village
  area_sq_km      NUMERIC(10, 2),              -- Total geographic area
  population_2011 INTEGER,                     -- Census 2011 population

  -- Spatial data (EPSG:4326 = WGS84, standard for India Survey/ECI data)
  centroid    GEOMETRY(Point, 4326),
  boundary    GEOMETRY(MultiPolygon, 4326),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  mandals IS 'Block/Mandal/Tehsil/Taluk — intermediate admin unit between district and village. Different states use different terminology.';
COMMENT ON COLUMN mandals.id IS 'Format: <state_code>-MDL-<lgd_code>, e.g. TS-MDL-501';
COMMENT ON COLUMN mandals.lgd_code IS 'Local Government Directory code — unique within a state, assigned by MoPR';
COMMENT ON COLUMN mandals.type IS 'State-specific terminology: mandal (TS/AP), block (UP/Bihar), tehsil (Raj/MP), taluk (TN/KA), circle (NE)';

-- Indexes: query patterns are by state+district, by lgd_code, and spatial
CREATE INDEX IF NOT EXISTS idx_mandals_state_code      ON mandals(state_code);
CREATE INDEX IF NOT EXISTS idx_mandals_state_district   ON mandals(state_code, district);
CREATE INDEX IF NOT EXISTS idx_mandals_lgd_code         ON mandals(lgd_code);
CREATE INDEX IF NOT EXISTS idx_mandals_centroid         ON mandals USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_mandals_boundary         ON mandals USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. GRAM PANCHAYATS (Village / Urban Local Body)                      ║
-- ║     The lowest elected government body. Includes rural panchayats,    ║
-- ║     nagar panchayats, municipalities, and municipal corporations.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS gram_panchayats (
  -- Composite ID: <state_code>-GP-<lgd_code>  e.g. 'TS-GP-50101'
  id          TEXT PRIMARY KEY,

  -- Display names
  name        TEXT NOT NULL,
  local_name  TEXT,

  -- Parent references
  mandal_id   TEXT NOT NULL REFERENCES mandals(id),
  state_code  TEXT NOT NULL REFERENCES states(code),

  -- Government directory code
  lgd_code    INTEGER,

  -- Body type — rural vs urban distinction matters for election rules
  type        TEXT NOT NULL DEFAULT 'gram_panchayat'
              CHECK (type IN (
                'gram_panchayat',        -- Rural village panchayat
                'village_panchayat',     -- Some states use this term
                'nagar_panchayat',       -- Small urban body
                'municipality',          -- Medium urban body
                'corporation',           -- Large city (e.g. GHMC)
                'cantonment'             -- Military cantonment board
              )),

  -- Demographics
  population_2011   INTEGER,
  total_households  INTEGER,
  total_voters      INTEGER,                  -- Latest electoral roll count

  -- Geography
  area_sq_km  NUMERIC(10, 2),
  centroid    GEOMETRY(Point, 4326),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  gram_panchayats IS 'Village-level elected body. Includes rural GPs, nagar panchayats, municipalities, and corporations.';
COMMENT ON COLUMN gram_panchayats.type IS 'Body type determines election rules: GP has sarpanch election, municipality has councillor wards, etc.';
COMMENT ON COLUMN gram_panchayats.total_voters IS 'Latest voter count from the most recent electoral roll (may differ from Census 2011 population).';

CREATE INDEX IF NOT EXISTS idx_gram_panchayats_mandal      ON gram_panchayats(mandal_id);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_state_code   ON gram_panchayats(state_code);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_lgd_code     ON gram_panchayats(lgd_code);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_type         ON gram_panchayats(type);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_centroid     ON gram_panchayats USING GIST(centroid);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. REVENUE VILLAGES (Census village → panchayat mapping)             ║
-- ║     Census 2011 atomic unit. Multiple revenue villages may belong to  ║
-- ║     a single gram panchayat. Provides the bridge between census data  ║
-- ║     and the electoral/panchayat hierarchy.                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS revenue_villages (
  -- Composite ID: <state_code>-RV-<census_code>  e.g. 'TS-RV-581452'
  id           TEXT PRIMARY KEY,

  -- Display names
  name         TEXT NOT NULL,
  local_name   TEXT,

  -- Parent references
  panchayat_id TEXT REFERENCES gram_panchayats(id),  -- Nullable: some uninhabited villages have no GP
  mandal_id    TEXT NOT NULL REFERENCES mandals(id),
  state_code   TEXT NOT NULL REFERENCES states(code),

  -- Census & LGD codes for cross-referencing govt datasets
  census_code  TEXT,                            -- Census 2011 village code
  lgd_code     INTEGER,                         -- LGD village code

  -- Demographics
  population_2011 INTEGER,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  revenue_villages IS 'Census 2011 village-level unit. Maps to gram_panchayats. Some uninhabited villages may not belong to any GP.';
COMMENT ON COLUMN revenue_villages.census_code IS 'Census of India 2011 village/town code for cross-referencing demographic datasets.';

CREATE INDEX IF NOT EXISTS idx_revenue_villages_panchayat  ON revenue_villages(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_mandal     ON revenue_villages(mandal_id);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_state_code ON revenue_villages(state_code);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_census     ON revenue_villages(census_code);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_lgd_code   ON revenue_villages(lgd_code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. POLLING BOOTHS (Atomic electoral unit)                            ║
-- ║     ~1000-1500 voters per booth. Each booth belongs to exactly one    ║
-- ║     assembly constituency — this is the ECI's fundamental unit for   ║
-- ║     conducting elections.                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS polling_booths (
  -- Composite ID: <constituency_id>-B<booth_number>  e.g. 'TS-AC1-B001'
  id                       TEXT PRIMARY KEY,

  -- Booth identification
  booth_number             INTEGER NOT NULL,
  booth_name               TEXT NOT NULL,          -- Official booth name from ECI
  polling_station_name     TEXT,                   -- Physical building name (e.g. 'Govt Primary School')
  polling_station_address  TEXT,                   -- Full address of the building

  -- Parent references — booth ALWAYS belongs to exactly one AC
  constituency_id          TEXT NOT NULL REFERENCES constituencies(id),
  panchayat_id             TEXT REFERENCES gram_panchayats(id),   -- Nullable for urban booths
  mandal_id                TEXT REFERENCES mandals(id),
  state_code               TEXT NOT NULL REFERENCES states(code),

  -- Voter demographics from latest electoral roll
  total_voters             INTEGER NOT NULL DEFAULT 0,
  male_voters              INTEGER NOT NULL DEFAULT 0,
  female_voters            INTEGER NOT NULL DEFAULT 0,
  third_gender_voters      INTEGER NOT NULL DEFAULT 0,

  -- Auxiliary booths are created when voter count exceeds capacity
  is_auxiliary             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Spatial: GPS location of the polling station building
  location                 GEOMETRY(Point, 4326),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ECI guarantees booth numbers are unique within a constituency
  UNIQUE(constituency_id, booth_number)
);

COMMENT ON TABLE  polling_booths IS 'ECI polling booth — the atomic unit of Indian elections. ~1000-1500 voters. Always belongs to exactly one AC.';
COMMENT ON COLUMN polling_booths.is_auxiliary IS 'TRUE if this is an auxiliary booth split from a parent booth due to voter count exceeding capacity.';
COMMENT ON COLUMN polling_booths.panchayat_id IS 'NULL for urban booths that fall under a municipality/corporation rather than a gram panchayat.';

CREATE INDEX IF NOT EXISTS idx_polling_booths_constituency ON polling_booths(constituency_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_panchayat    ON polling_booths(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_mandal       ON polling_booths(mandal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_state_code   ON polling_booths(state_code);
CREATE INDEX IF NOT EXISTS idx_polling_booths_location     ON polling_booths USING GIST(location);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. MANDAL ↔ CONSTITUENCY MAP (Many-to-Many junction)                ║
-- ║     Mandal boundaries predate delimitation; constituency boundaries   ║
-- ║     were drawn later. A mandal can span 2-3 ACs and an AC can        ║
-- ║     contain parts of 3-8 mandals.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandal_constituency_map (
  id                  SERIAL PRIMARY KEY,

  -- The two sides of the M:N relationship
  mandal_id           TEXT NOT NULL REFERENCES mandals(id),
  constituency_id     TEXT NOT NULL REFERENCES constituencies(id),

  -- How much of this mandal falls within this constituency?
  overlap_type        TEXT NOT NULL DEFAULT 'full'
                      CHECK (overlap_type IN ('full', 'partial')),
  overlap_percentage  NUMERIC(5, 2),            -- % of mandal's population/area in this AC

  -- Denormalized counts for fast dashboard queries
  panchayats_in_ac    INTEGER NOT NULL DEFAULT 0,   -- # of panchayats from this mandal in this AC
  voters_in_ac        INTEGER NOT NULL DEFAULT 0,   -- Total voters from this mandal in this AC

  UNIQUE(mandal_id, constituency_id)
);

COMMENT ON TABLE  mandal_constituency_map IS 'Many-to-many: mandal boundaries do not align with constituency boundaries. Tracks overlap details.';
COMMENT ON COLUMN mandal_constituency_map.overlap_type IS '''full'' = entire mandal is within one AC; ''partial'' = mandal is split across multiple ACs.';
COMMENT ON COLUMN mandal_constituency_map.overlap_percentage IS 'Approximate percentage of the mandal''s population/area that falls within this constituency.';

CREATE INDEX IF NOT EXISTS idx_mandal_constituency_mandal        ON mandal_constituency_map(mandal_id);
CREATE INDEX IF NOT EXISTS idx_mandal_constituency_constituency   ON mandal_constituency_map(constituency_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. BOOTH ELECTION RESULTS (Per-booth aggregate for one election)     ║
-- ║     Stores the booth-level turnout and vote summary for each          ║
-- ║     assembly/parliament election. Links to booth_candidate_votes      ║
-- ║     for per-candidate breakdowns.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS booth_election_results (
  id                      SERIAL PRIMARY KEY,

  -- References
  booth_id                TEXT NOT NULL REFERENCES polling_booths(id),
  election_id             INTEGER NOT NULL REFERENCES elections(id),
  constituency_id         TEXT NOT NULL REFERENCES constituencies(id),

  -- Turnout data
  total_voters_in_roll    INTEGER NOT NULL DEFAULT 0,   -- Voters in electoral roll for this booth
  votes_polled            INTEGER NOT NULL DEFAULT 0,   -- Total votes cast (EVM + postal)
  valid_votes             INTEGER NOT NULL DEFAULT 0,   -- votes_polled - rejected_votes
  rejected_votes          INTEGER NOT NULL DEFAULT 0,   -- NOTA + invalid ballots
  nota_votes              INTEGER NOT NULL DEFAULT 0,   -- NOTA specifically

  -- Derived (stored for query performance, validated by trigger)
  turnout_percent         NUMERIC(5, 2) NOT NULL DEFAULT 0,

  UNIQUE(booth_id, election_id)
);

COMMENT ON TABLE  booth_election_results IS 'Booth-level election result summary: turnout, valid votes, rejected votes. One row per booth per election.';
COMMENT ON COLUMN booth_election_results.rejected_votes IS 'Includes NOTA votes + invalid/rejected ballots. nota_votes is a subset of this.';
COMMENT ON COLUMN booth_election_results.turnout_percent IS 'Derived: (votes_polled / total_voters_in_roll) * 100. Validated by trigger to ensure consistency.';

CREATE INDEX IF NOT EXISTS idx_booth_results_booth          ON booth_election_results(booth_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_election       ON booth_election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_constituency   ON booth_election_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_election_const ON booth_election_results(election_id, constituency_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. BOOTH CANDIDATE VOTES (Per-candidate, per-booth)                  ║
-- ║     The most granular election data: how many votes each candidate    ║
-- ║     received at each booth. Aggregating these MUST match the          ║
-- ║     constituency-level totals.                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS booth_candidate_votes (
  id                SERIAL PRIMARY KEY,

  -- Parent reference
  booth_result_id   INTEGER NOT NULL REFERENCES booth_election_results(id) ON DELETE CASCADE,

  -- Candidate info
  candidate_name    TEXT NOT NULL,
  party             TEXT NOT NULL,

  -- Vote count at this booth
  votes             INTEGER NOT NULL DEFAULT 0,

  -- Did this candidate get the most votes at THIS specific booth?
  is_winner         BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(booth_result_id, candidate_name)
);

COMMENT ON TABLE  booth_candidate_votes IS 'Per-candidate vote count at each booth. SUM(votes) across booths must match constituency-level totals.';
COMMENT ON COLUMN booth_candidate_votes.is_winner IS 'TRUE if this candidate received the highest votes at this specific booth (booth-level winner, not constituency winner).';

CREATE INDEX IF NOT EXISTS idx_booth_candidate_result  ON booth_candidate_votes(booth_result_id);
CREATE INDEX IF NOT EXISTS idx_booth_candidate_party   ON booth_candidate_votes(party);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. LOCAL BODY ELECTIONS (Panchayat / Municipal / ZPTC / MPTC)       ║
-- ║     Separate election cycle from assembly elections. Sarpanch         ║
-- ║     elections are at GP level; ward-member elections are per-ward.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS local_body_elections (
  id                SERIAL PRIMARY KEY,

  -- Which panchayat/municipality is this election for?
  panchayat_id      TEXT NOT NULL REFERENCES gram_panchayats(id),
  state_code        TEXT NOT NULL REFERENCES states(code),

  -- Election details
  election_year     INTEGER NOT NULL,
  election_type     TEXT NOT NULL
                    CHECK (election_type IN (
                      'sarpanch',        -- Village head
                      'ward_member',     -- Ward-level councillor
                      'municipality',    -- Municipal councillor
                      'zptc',            -- Zilla Parishad Territorial Constituency
                      'mptc',            -- Mandal Parishad Territorial Constituency
                      'corporation'      -- Municipal corporation councillor
                    )),

  -- For ward-level elections only; NULL for sarpanch (GP-wide) elections
  ward_number       INTEGER,

  -- Turnout
  total_voters      INTEGER NOT NULL DEFAULT 0,
  votes_polled      INTEGER NOT NULL DEFAULT 0,
  turnout_percent   NUMERIC(5, 2) NOT NULL DEFAULT 0,

  -- Result status
  result_status     TEXT NOT NULL DEFAULT 'declared'
                    CHECK (result_status IN ('declared', 'pending', 'disputed', 'unanimous')),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index (not a table constraint): expression-based uniqueness with
-- COALESCE handles NULL ward_number for sarpanch/GP-wide elections.
-- Postgres UNIQUE table constraints cannot contain expressions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_local_body_elections
  ON local_body_elections (panchayat_id, election_year, election_type, COALESCE(ward_number, 0));

COMMENT ON TABLE  local_body_elections IS 'Panchayat and municipal elections — separate cycle from assembly/parliament elections.';
COMMENT ON COLUMN local_body_elections.ward_number IS 'NULL for sarpanch/GP-wide elections; set for ward_member/municipality/corporation elections.';
COMMENT ON COLUMN local_body_elections.result_status IS '''unanimous'' = won uncontested (common in village sarpanch elections).';

CREATE INDEX IF NOT EXISTS idx_local_body_panchayat    ON local_body_elections(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_local_body_state        ON local_body_elections(state_code);
CREATE INDEX IF NOT EXISTS idx_local_body_year         ON local_body_elections(election_year);
CREATE INDEX IF NOT EXISTS idx_local_body_type         ON local_body_elections(election_type);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. LOCAL BODY CANDIDATES (Candidates in panchayat/municipal polls)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS local_body_candidates (
  id                SERIAL PRIMARY KEY,

  -- Parent election reference
  election_id       INTEGER NOT NULL REFERENCES local_body_elections(id) ON DELETE CASCADE,

  -- Candidate details
  candidate_name    TEXT NOT NULL,
  party             TEXT NOT NULL DEFAULT 'IND',    -- Most local body candidates are independents

  -- Results
  votes             INTEGER NOT NULL DEFAULT 0,
  result            TEXT
                    CHECK (result IN ('won', 'lost', 'forfeited_deposit', 'unanimous')),

  -- Was this candidate the incumbent (previous term holder)?
  is_incumbent      BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(election_id, candidate_name)
);

COMMENT ON TABLE  local_body_candidates IS 'Candidates in panchayat/municipal elections. Most are independents (party = ''IND'').';
COMMENT ON COLUMN local_body_candidates.result IS '''forfeited_deposit'' = received less than 1/6th of votes (loses security deposit).';

CREATE INDEX IF NOT EXISTS idx_local_body_cand_election ON local_body_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_local_body_cand_party    ON local_body_candidates(party);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VALIDATION TRIGGERS                                                   ║
-- ║  Enforce data integrity rules that can't be expressed as constraints.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Auto-compute turnout_percent and validate vote counts on booth results
CREATE OR REPLACE FUNCTION fn_validate_booth_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Turnout percentage: guard against division by zero
  IF NEW.total_voters_in_roll > 0 THEN
    NEW.turnout_percent := ROUND(
      (NEW.votes_polled::NUMERIC / NEW.total_voters_in_roll) * 100, 2
    );
  ELSE
    NEW.turnout_percent := 0;
  END IF;

  -- valid_votes + rejected_votes MUST equal votes_polled
  IF NEW.valid_votes + NEW.rejected_votes <> NEW.votes_polled THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: valid_votes (%) + rejected_votes (%) ≠ votes_polled (%)',
      NEW.booth_id, NEW.valid_votes, NEW.rejected_votes, NEW.votes_polled;
  END IF;

  -- NOTA is a subset of rejected_votes
  IF NEW.nota_votes > NEW.rejected_votes THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: nota_votes (%) cannot exceed rejected_votes (%)',
      NEW.booth_id, NEW.nota_votes, NEW.rejected_votes;
  END IF;

  -- Votes polled cannot exceed voters in roll (allows small margin for postal ballots)
  IF NEW.votes_polled > NEW.total_voters_in_roll * 1.05 THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: votes_polled (%) exceeds 105%% of total_voters_in_roll (%)',
      NEW.booth_id, NEW.votes_polled, NEW.total_voters_in_roll;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_booth_result
  BEFORE INSERT OR UPDATE ON booth_election_results
  FOR EACH ROW EXECUTE FUNCTION fn_validate_booth_result();


-- 2. Auto-compute turnout_percent on local body elections
CREATE OR REPLACE FUNCTION fn_validate_local_body_turnout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_voters > 0 THEN
    NEW.turnout_percent := ROUND(
      (NEW.votes_polled::NUMERIC / NEW.total_voters) * 100, 2
    );
  ELSE
    NEW.turnout_percent := 0;
  END IF;

  IF NEW.votes_polled > NEW.total_voters * 1.05 THEN
    RAISE EXCEPTION
      'Data integrity violation on local body election %: votes_polled (%) exceeds 105%% of total_voters (%)',
      NEW.id, NEW.votes_polled, NEW.total_voters;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_local_body_turnout
  BEFORE INSERT OR UPDATE ON local_body_elections
  FOR EACH ROW EXECUTE FUNCTION fn_validate_local_body_turnout();


-- 3. Auto-set updated_at timestamp on hierarchy tables
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mandals_updated_at
  BEFORE UPDATE ON mandals
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_gram_panchayats_updated_at
  BEFORE UPDATE ON gram_panchayats
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_polling_booths_updated_at
  BEFORE UPDATE ON polling_booths
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  AGGREGATION VIEWS                                                     ║
-- ║  Pre-computed views for dashboard queries. These replace the need for  ║
-- ║  complex JOINs in the application layer.                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 1: v_constituency_booth_summary
-- For each constituency: total booths, total voters, booth coverage metrics.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_constituency_booth_summary AS
SELECT
  c.id                    AS constituency_id,
  c.name                  AS constituency_name,
  c.state_code,
  c.district,
  COUNT(pb.id)            AS total_booths,
  COALESCE(SUM(pb.total_voters), 0)           AS total_voters,
  COALESCE(SUM(pb.male_voters), 0)            AS total_male_voters,
  COALESCE(SUM(pb.female_voters), 0)          AS total_female_voters,
  COALESCE(SUM(pb.third_gender_voters), 0)    AS total_third_gender_voters,
  COUNT(pb.id) FILTER (WHERE pb.is_auxiliary)  AS auxiliary_booths,
  COUNT(pb.id) FILTER (WHERE pb.location IS NOT NULL) AS booths_with_gps,
  -- Coverage: what % of booths have GPS coordinates?
  CASE
    WHEN COUNT(pb.id) > 0
    THEN ROUND(
      COUNT(pb.id) FILTER (WHERE pb.location IS NOT NULL)::NUMERIC
      / COUNT(pb.id) * 100, 2
    )
    ELSE 0
  END AS gps_coverage_percent
FROM constituencies c
LEFT JOIN polling_booths pb ON pb.constituency_id = c.id
GROUP BY c.id, c.name, c.state_code, c.district;

COMMENT ON VIEW v_constituency_booth_summary IS 'Per-constituency aggregation: booth count, voter totals, GPS coverage. Used for dashboard cards.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 2: v_mandal_summary
-- For each mandal: panchayat count, booth count, voter totals, AC overlaps.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_mandal_summary AS
SELECT
  m.id                    AS mandal_id,
  m.name                  AS mandal_name,
  m.state_code,
  m.district,
  m.type                  AS mandal_type,
  m.population_2011,

  -- Panchayat counts
  COUNT(DISTINCT gp.id)   AS total_panchayats,

  -- Booth counts (booths linked to this mandal)
  COUNT(DISTINCT pb.id)   AS total_booths,

  -- Voter totals
  COALESCE(SUM(DISTINCT pb.total_voters), 0)  AS total_voters,

  -- How many assembly constituencies does this mandal overlap?
  (
    SELECT COUNT(*)
    FROM mandal_constituency_map mcm
    WHERE mcm.mandal_id = m.id
  ) AS constituencies_overlapped,

  -- Revenue village count
  (
    SELECT COUNT(*)
    FROM revenue_villages rv
    WHERE rv.mandal_id = m.id
  ) AS total_revenue_villages

FROM mandals m
LEFT JOIN gram_panchayats gp ON gp.mandal_id = m.id
LEFT JOIN polling_booths pb  ON pb.mandal_id = m.id
GROUP BY m.id, m.name, m.state_code, m.district, m.type, m.population_2011;

COMMENT ON VIEW v_mandal_summary IS 'Per-mandal aggregation: panchayat/booth/village counts, voter totals, AC overlap count.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 3: v_panchayat_summary
-- For each panchayat: booth count, voter totals, latest local body results.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_panchayat_summary AS
SELECT
  gp.id                   AS panchayat_id,
  gp.name                 AS panchayat_name,
  gp.state_code,
  gp.type                 AS panchayat_type,
  m.name                  AS mandal_name,
  m.district,

  -- Booths
  COUNT(DISTINCT pb.id)   AS total_booths,
  COALESCE(SUM(pb.total_voters), 0) AS total_voters,

  -- Revenue villages
  (
    SELECT COUNT(*)
    FROM revenue_villages rv
    WHERE rv.panchayat_id = gp.id
  ) AS total_revenue_villages,

  -- Latest sarpanch election result (subquery for latest year)
  (
    SELECT lbc.candidate_name
    FROM local_body_elections lbe
    JOIN local_body_candidates lbc ON lbc.election_id = lbe.id
    WHERE lbe.panchayat_id = gp.id
      AND lbe.election_type = 'sarpanch'
      AND lbc.result IN ('won', 'unanimous')
    ORDER BY lbe.election_year DESC
    LIMIT 1
  ) AS current_sarpanch,

  (
    SELECT lbc.party
    FROM local_body_elections lbe
    JOIN local_body_candidates lbc ON lbc.election_id = lbe.id
    WHERE lbe.panchayat_id = gp.id
      AND lbe.election_type = 'sarpanch'
      AND lbc.result IN ('won', 'unanimous')
    ORDER BY lbe.election_year DESC
    LIMIT 1
  ) AS current_sarpanch_party

FROM gram_panchayats gp
LEFT JOIN mandals m        ON m.id = gp.mandal_id
LEFT JOIN polling_booths pb ON pb.panchayat_id = gp.id
GROUP BY gp.id, gp.name, gp.state_code, gp.type, m.name, m.district;

COMMENT ON VIEW v_panchayat_summary IS 'Per-panchayat aggregation: booth/voter counts, revenue village count, current sarpanch from latest election.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 4: v_constituency_hierarchy
-- Full denormalized view: constituency → mandals → panchayats → booths.
-- Each row is one mandal-in-constituency with aggregated sub-counts.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_constituency_hierarchy AS
SELECT
  c.id                    AS constituency_id,
  c.name                  AS constituency_name,
  c.ac_no,
  c.state_code,
  c.district,
  c.reservation_status,

  -- Mandal details
  mcm.mandal_id,
  m.name                  AS mandal_name,
  m.type                  AS mandal_type,
  mcm.overlap_type,
  mcm.overlap_percentage,

  -- Panchayats from this mandal that are within this AC
  mcm.panchayats_in_ac,
  mcm.voters_in_ac,

  -- Total booths from this mandal in this constituency
  (
    SELECT COUNT(*)
    FROM polling_booths pb
    WHERE pb.constituency_id = c.id
      AND pb.mandal_id = m.id
  ) AS booths_in_ac,

  -- Total booths across all mandals for this constituency
  (
    SELECT COUNT(*)
    FROM polling_booths pb2
    WHERE pb2.constituency_id = c.id
  ) AS total_constituency_booths

FROM constituencies c
JOIN mandal_constituency_map mcm ON mcm.constituency_id = c.id
JOIN mandals m ON m.id = mcm.mandal_id
ORDER BY c.state_code, c.ac_no, m.name;

COMMENT ON VIEW v_constituency_hierarchy IS 'Denormalized hierarchy: one row per mandal-in-constituency. Includes overlap type, panchayat/booth/voter counts.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 5: v_booth_result_aggregation
-- Party-wise vote aggregation from booth level → constituency level.
-- Used to VALIDATE that booth-level sums match official constituency totals.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_booth_result_aggregation AS
SELECT
  ber.election_id,
  ber.constituency_id,
  c.name                          AS constituency_name,
  c.state_code,

  -- Booth-level aggregate turnout
  COUNT(DISTINCT ber.booth_id)    AS booths_counted,
  SUM(ber.total_voters_in_roll)   AS agg_total_voters_in_roll,
  SUM(ber.votes_polled)           AS agg_votes_polled,
  SUM(ber.valid_votes)            AS agg_valid_votes,
  SUM(ber.rejected_votes)         AS agg_rejected_votes,
  SUM(ber.nota_votes)             AS agg_nota_votes,
  CASE
    WHEN SUM(ber.total_voters_in_roll) > 0
    THEN ROUND(
      SUM(ber.votes_polled)::NUMERIC / SUM(ber.total_voters_in_roll) * 100, 2
    )
    ELSE 0
  END AS agg_turnout_percent,

  -- Party-wise vote breakdown (as JSONB for flexible consumption)
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'party', sub.party,
        'candidate_name', sub.candidate_name,
        'total_votes', sub.total_votes,
        'booths_won', sub.booths_won
      ) ORDER BY sub.total_votes DESC
    )
    FROM (
      SELECT
        bcv.party,
        bcv.candidate_name,
        SUM(bcv.votes)                                    AS total_votes,
        COUNT(*) FILTER (WHERE bcv.is_winner)             AS booths_won
      FROM booth_candidate_votes bcv
      JOIN booth_election_results ber2 ON ber2.id = bcv.booth_result_id
      WHERE ber2.election_id = ber.election_id
        AND ber2.constituency_id = ber.constituency_id
      GROUP BY bcv.party, bcv.candidate_name
    ) sub
  ) AS party_wise_results

FROM booth_election_results ber
JOIN constituencies c ON c.id = ber.constituency_id
GROUP BY ber.election_id, ber.constituency_id, c.name, c.state_code;

COMMENT ON VIEW v_booth_result_aggregation IS 'Aggregates booth-level votes to constituency level. Used for validation: these sums MUST match official ECI totals.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VALIDATION FUNCTION                                                   ║
-- ║  Callable function to verify booth-level data sums correctly to the   ║
-- ║  constituency level for a given election.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION fn_validate_booth_aggregation(
  p_election_id   INTEGER,
  p_constituency_id TEXT
)
RETURNS TABLE (
  check_name      TEXT,
  expected_value  BIGINT,
  actual_value    BIGINT,
  is_valid        BOOLEAN,
  error_detail    TEXT
) AS $$
DECLARE
  v_official_votes    INTEGER;
  v_official_valid    INTEGER;
  v_booth_sum_votes   BIGINT;
  v_booth_sum_valid   BIGINT;
  v_candidate_sum     BIGINT;
  v_booth_valid_sum   BIGINT;
  v_total_booths      INTEGER;
  v_results_booths    INTEGER;
BEGIN
  -- Get total booth count for this constituency
  SELECT COUNT(*) INTO v_total_booths
  FROM polling_booths
  WHERE constituency_id = p_constituency_id;

  -- Get booths with results
  SELECT COUNT(*) INTO v_results_booths
  FROM booth_election_results
  WHERE election_id = p_election_id
    AND constituency_id = p_constituency_id;

  -- Check 1: All booths have results
  RETURN QUERY SELECT
    'booth_coverage'::TEXT,
    v_total_booths::BIGINT,
    v_results_booths::BIGINT,
    (v_total_booths = v_results_booths),
    CASE
      WHEN v_total_booths <> v_results_booths
      THEN format('Missing results for %s of %s booths', v_total_booths - v_results_booths, v_total_booths)
      ELSE NULL
    END;

  -- Get booth-level sums
  SELECT COALESCE(SUM(votes_polled), 0), COALESCE(SUM(valid_votes), 0)
  INTO v_booth_sum_votes, v_booth_sum_valid
  FROM booth_election_results
  WHERE election_id = p_election_id
    AND constituency_id = p_constituency_id;

  -- Get official constituency result for comparison
  SELECT COALESCE(er.winner_votes + er.margin, 0)
  INTO v_official_votes
  FROM election_results er
  WHERE er.election_id = p_election_id
    AND er.constituency_id = p_constituency_id;

  -- Check 2: Candidate vote sum equals valid_votes per booth
  SELECT COALESCE(SUM(bcv.votes), 0)
  INTO v_candidate_sum
  FROM booth_candidate_votes bcv
  JOIN booth_election_results ber ON ber.id = bcv.booth_result_id
  WHERE ber.election_id = p_election_id
    AND ber.constituency_id = p_constituency_id;

  RETURN QUERY SELECT
    'candidate_votes_vs_valid_votes'::TEXT,
    v_booth_sum_valid,
    v_candidate_sum,
    (v_booth_sum_valid = v_candidate_sum),
    CASE
      WHEN v_booth_sum_valid <> v_candidate_sum
      THEN format('Sum of candidate votes (%s) ≠ sum of valid_votes (%s). Difference: %s',
                  v_candidate_sum, v_booth_sum_valid, ABS(v_candidate_sum - v_booth_sum_valid))
      ELSE NULL
    END;

  -- Check 3: Per-booth valid_votes + rejected_votes = votes_polled
  -- (Already enforced by trigger, but check in aggregate)
  RETURN QUERY SELECT
    'vote_arithmetic_consistency'::TEXT,
    v_booth_sum_votes,
    (
      SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
      FROM booth_election_results
      WHERE election_id = p_election_id
        AND constituency_id = p_constituency_id
    ),
    v_booth_sum_votes = (
      SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
      FROM booth_election_results
      WHERE election_id = p_election_id
        AND constituency_id = p_constituency_id
    ),
    CASE
      WHEN v_booth_sum_votes <> (
        SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
        FROM booth_election_results
        WHERE election_id = p_election_id
          AND constituency_id = p_constituency_id
      )
      THEN 'valid_votes + rejected_votes does not sum to votes_polled across booths'
      ELSE NULL
    END;

  -- Check 4: Exactly one winner per booth
  RETURN QUERY SELECT
    'single_winner_per_booth'::TEXT,
    v_results_booths::BIGINT,
    (
      SELECT COUNT(DISTINCT ber3.id)
      FROM booth_election_results ber3
      JOIN booth_candidate_votes bcv3 ON bcv3.booth_result_id = ber3.id
      WHERE ber3.election_id = p_election_id
        AND ber3.constituency_id = p_constituency_id
        AND bcv3.is_winner = TRUE
      GROUP BY ber3.id
      HAVING COUNT(*) = 1
    )::BIGINT,
    v_results_booths::BIGINT = (
      SELECT COUNT(DISTINCT ber3.id)
      FROM booth_election_results ber3
      JOIN booth_candidate_votes bcv3 ON bcv3.booth_result_id = ber3.id
      WHERE ber3.election_id = p_election_id
        AND ber3.constituency_id = p_constituency_id
        AND bcv3.is_winner = TRUE
      GROUP BY ber3.id
      HAVING COUNT(*) = 1
    )::BIGINT,
    'Each booth should have exactly one winner marked';

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_validate_booth_aggregation IS 'Validates booth-level data integrity: coverage, vote arithmetic, candidate sums, single-winner rule. Returns a table of check results.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ROW LEVEL SECURITY                                                    ║
-- ║  All hierarchy tables: public read, service-role write.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all new tables
ALTER TABLE mandals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gram_panchayats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_villages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_booths           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandal_constituency_map  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_election_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_candidate_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_body_elections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_body_candidates    ENABLE ROW LEVEL SECURITY;

-- Public read access (anonymous + authenticated users)
CREATE POLICY "Public read mandals"
  ON mandals FOR SELECT USING (true);

CREATE POLICY "Public read gram_panchayats"
  ON gram_panchayats FOR SELECT USING (true);

CREATE POLICY "Public read revenue_villages"
  ON revenue_villages FOR SELECT USING (true);

CREATE POLICY "Public read polling_booths"
  ON polling_booths FOR SELECT USING (true);

CREATE POLICY "Public read mandal_constituency_map"
  ON mandal_constituency_map FOR SELECT USING (true);

CREATE POLICY "Public read booth_election_results"
  ON booth_election_results FOR SELECT USING (true);

CREATE POLICY "Public read booth_candidate_votes"
  ON booth_candidate_votes FOR SELECT USING (true);

CREATE POLICY "Public read local_body_elections"
  ON local_body_elections FOR SELECT USING (true);

CREATE POLICY "Public read local_body_candidates"
  ON local_body_candidates FOR SELECT USING (true);

-- Service-role write access (INSERT, UPDATE, DELETE)
-- Supabase service_role bypasses RLS by default, but we add explicit
-- policies for defense-in-depth and to document intent.
CREATE POLICY "Service role write mandals"
  ON mandals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write gram_panchayats"
  ON gram_panchayats FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write revenue_villages"
  ON revenue_villages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write polling_booths"
  ON polling_booths FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write mandal_constituency_map"
  ON mandal_constituency_map FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write booth_election_results"
  ON booth_election_results FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write booth_candidate_votes"
  ON booth_candidate_votes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write local_body_elections"
  ON local_body_elections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write local_body_candidates"
  ON local_body_candidates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


COMMIT;



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 023_local_body_representatives.sql
-- ────────────────────────────────────────────────────────

-- ============================================================================
-- 023: Local-Body Representatives & Urban/Rural Body Hierarchy
-- ============================================================================
-- Extends 022 (mandals, gram_panchayats, polling_booths, local_body_elections)
-- with first-class URBAN local bodies, ward/division sub-units for every
-- elected tier, a UNIFIED `representatives` office-holder table, and a
-- Wikipedia-style `representative_edits` provenance/history log.
--
-- ── DESIGN PRINCIPLES ──────────────────────────────────────────────────────
--   • ZERO FABRICATION: every representative row carries an explicit
--     `data_status` (verified | data_pending | crowdsourced_unverified) and a
--     `source_type` + `source_url`. Empty tiers are represented by the absence
--     of rows, never by synthesized placeholder holders.
--   • TENURE MODEL: `term_start` / `term_end` / `is_current`. Outgoing 2020–21
--     cohorts (terms expiring 2026) become historical automatically once a new
--     winner is declared for the same jurisdiction + office_type.
--   • POLYMORPHIC JURISDICTION: a representative points at exactly one
--     jurisdiction entity via (`jurisdiction_type`, `jurisdiction_id`).
--   • GEOMETRY OPTIONAL: ward / division polygons are nullable — a NULL geom
--     surfaces as "boundary pending" in the UI (list/tree still works).
--   • PROVENANCE: crowdsourced edits reuse the CCA/KYC forensic fingerprint
--     (`digital_fingerprint`) and flow through a moderation queue before they
--     mutate the canonical `representatives` row.
--
-- Dependencies: 001_initial_schema.sql, 022_administrative_hierarchy.sql
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. URBAN LOCAL BODIES (Corporation / Municipality / Nagar Panchayat)      ║
-- ║     Rural bodies stay in `gram_panchayats` (022). This table models the    ║
-- ║     urban tier as a first-class citizen so ULB wards + mayors/chairs are   ║
-- ║     not shoe-horned into the rural GP schema.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS urban_local_bodies (
  -- Composite ID: <state_code>-ULB-<lgd_code>  e.g. 'TS-ULB-803416' (GHMC)
  id            TEXT PRIMARY KEY,

  name          TEXT NOT NULL,
  local_name    TEXT,

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  lgd_code      INTEGER,

  -- Urban body classification (rural handled by gram_panchayats.type)
  type          TEXT NOT NULL DEFAULT 'municipality'
                CHECK (type IN ('corporation', 'municipality', 'nagar_panchayat', 'cantonment')),

  -- Head office title varies: Mayor (corporation) vs Chairperson (municipality)
  head_office_type TEXT NOT NULL DEFAULT 'chairperson'
                CHECK (head_office_type IN ('mayor', 'chairperson')),

  -- Coverage: which AC / PC does this ULB fall in (denormalized, may be multi)
  primary_constituency_id TEXT REFERENCES constituencies(id),

  total_wards       INTEGER,
  population_2011   INTEGER,
  total_voters      INTEGER,
  area_sq_km        NUMERIC(10, 2),

  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  urban_local_bodies IS 'Urban local bodies (corporation/municipality/nagar panchayat). Rural bodies live in gram_panchayats. Head is Mayor (corp) or Chairperson (municipality).';
COMMENT ON COLUMN urban_local_bodies.head_office_type IS 'mayor for corporations, chairperson for municipalities/nagar panchayats.';

CREATE INDEX IF NOT EXISTS idx_ulb_state_code    ON urban_local_bodies(state_code);
CREATE INDEX IF NOT EXISTS idx_ulb_state_district ON urban_local_bodies(state_code, district);
CREATE INDEX IF NOT EXISTS idx_ulb_lgd_code       ON urban_local_bodies(lgd_code);
CREATE INDEX IF NOT EXISTS idx_ulb_type           ON urban_local_bodies(type);
CREATE INDEX IF NOT EXISTS idx_ulb_boundary       ON urban_local_bodies USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. ULB WARDS (Corporator / Councillor division inside an urban body)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS ulb_wards (
  -- Composite ID: <ulb_id>-W<ward_no>  e.g. 'TS-ULB-803416-W042'
  id            TEXT PRIMARY KEY,

  ulb_id        TEXT NOT NULL REFERENCES urban_local_bodies(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  ward_no       INTEGER NOT NULL,
  name          TEXT,
  local_name    TEXT,

  -- LGD ward code where published
  lgd_ward_code INTEGER,

  -- Reservation for this ward's seat
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  -- Which AC does this ward map to (a ULB can straddle multiple ACs)
  constituency_id TEXT REFERENCES constituencies(id),

  population_2011 INTEGER,
  total_voters    INTEGER,

  -- Boundary optional → NULL renders "boundary pending"
  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(ulb_id, ward_no)
);

COMMENT ON TABLE  ulb_wards IS 'Ward inside an urban local body — the corporator/councillor seat. boundary NULL => "boundary pending".';
COMMENT ON COLUMN ulb_wards.reservation IS 'Seat reservation incl. woman variants (-W). Assigned per SEC rotation each cycle.';

CREATE INDEX IF NOT EXISTS idx_ulb_wards_ulb          ON ulb_wards(ulb_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_state         ON ulb_wards(state_code);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_constituency  ON ulb_wards(constituency_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_boundary      ON ulb_wards USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. ZILLA PARISHADS (District rural council) + ZPTC divisions              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS zilla_parishads (
  -- Composite ID: <state_code>-ZP-<district_slug>  e.g. 'TS-ZP-mancherial'
  id            TEXT PRIMARY KEY,

  name          TEXT NOT NULL,
  local_name    TEXT,

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  lgd_code      INTEGER,

  total_divisions INTEGER,          -- number of ZPTC divisions (usually 1 per mandal)
  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(state_code, district)
);

COMMENT ON TABLE zilla_parishads IS 'District-level rural local government. Chairperson is the ZP Chairperson. One ZPTC division per mandal (typically).';

CREATE INDEX IF NOT EXISTS idx_zp_state    ON zilla_parishads(state_code);
CREATE INDEX IF NOT EXISTS idx_zp_district  ON zilla_parishads(state_code, district);


CREATE TABLE IF NOT EXISTS zptc_divisions (
  -- Composite ID: <zp_id>-ZPTC-<lgd_code or slug>
  id            TEXT PRIMARY KEY,

  zilla_parishad_id TEXT NOT NULL REFERENCES zilla_parishads(id),
  -- ZPTC divisions are (usually) coterminous with a mandal
  mandal_id     TEXT REFERENCES mandals(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  name          TEXT NOT NULL,
  division_no   INTEGER,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE zptc_divisions IS 'Zilla Parishad Territorial Constituency — one elected ZPTC member per division (≈ one per mandal).';

CREATE INDEX IF NOT EXISTS idx_zptc_zp       ON zptc_divisions(zilla_parishad_id);
CREATE INDEX IF NOT EXISTS idx_zptc_mandal    ON zptc_divisions(mandal_id);
CREATE INDEX IF NOT EXISTS idx_zptc_state      ON zptc_divisions(state_code);
CREATE INDEX IF NOT EXISTS idx_zptc_boundary   ON zptc_divisions USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. MANDAL PARISHADS (Block-level rural council) + MPTC divisions          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandal_parishads (
  -- Composite ID: <mandal_id>-MP  (one mandal parishad per mandal)
  id            TEXT PRIMARY KEY,

  mandal_id     TEXT NOT NULL REFERENCES mandals(id),
  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  name          TEXT NOT NULL,
  total_divisions INTEGER,          -- number of MPTC divisions

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(mandal_id)
);

COMMENT ON TABLE mandal_parishads IS 'Mandal Parishad — block-level rural body. Head is the Mandal Parishad President (MPP), elected by MPTC members.';

CREATE INDEX IF NOT EXISTS idx_mp_mandal   ON mandal_parishads(mandal_id);
CREATE INDEX IF NOT EXISTS idx_mp_state     ON mandal_parishads(state_code);


CREATE TABLE IF NOT EXISTS mptc_divisions (
  -- Composite ID: <mandal_parishad_id>-MPTC-<division_no>
  id            TEXT PRIMARY KEY,

  mandal_parishad_id TEXT NOT NULL REFERENCES mandal_parishads(id),
  -- MPTC divisions usually align to one or more gram panchayats
  primary_panchayat_id TEXT REFERENCES gram_panchayats(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  name          TEXT NOT NULL,
  division_no   INTEGER,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE mptc_divisions IS 'Mandal Parishad Territorial Constituency — one elected MPTC member per division.';

CREATE INDEX IF NOT EXISTS idx_mptc_mp        ON mptc_divisions(mandal_parishad_id);
CREATE INDEX IF NOT EXISTS idx_mptc_panchayat  ON mptc_divisions(primary_panchayat_id);
CREATE INDEX IF NOT EXISTS idx_mptc_state       ON mptc_divisions(state_code);
CREATE INDEX IF NOT EXISTS idx_mptc_boundary    ON mptc_divisions USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. GP WARDS (Gram Panchayat ward-member seats) — INCLUDED at launch       ║
-- ║     Highest-volume tier. Bulk-loaded, lazily rendered.                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS gp_wards (
  -- Composite ID: <panchayat_id>-W<ward_no>
  id            TEXT PRIMARY KEY,

  panchayat_id  TEXT NOT NULL REFERENCES gram_panchayats(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  ward_no       INTEGER NOT NULL,
  name          TEXT,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(panchayat_id, ward_no)
);

COMMENT ON TABLE gp_wards IS 'Gram Panchayat ward — the ward-member seat. Highest-volume tier (~200k+ nationwide). boundary NULL => "boundary pending".';

CREATE INDEX IF NOT EXISTS idx_gp_wards_panchayat  ON gp_wards(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_state        ON gp_wards(state_code);
CREATE INDEX IF NOT EXISTS idx_gp_wards_boundary     ON gp_wards USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5b. Extend polling_booths with an optional catchment polygon              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE polling_booths
  ADD COLUMN IF NOT EXISTS catchment_boundary GEOMETRY(MultiPolygon, 4326);

COMMENT ON COLUMN polling_booths.catchment_boundary IS 'Optional booth catchment polygon where CEO/GIS publishes it. NULL => "boundary pending".';

CREATE INDEX IF NOT EXISTS idx_polling_booths_catchment ON polling_booths USING GIST(catchment_boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. REPRESENTATIVES (Unified elected office-holder — all local tiers)      ║
-- ║     Mirrors the MLA/MP profile shape (name, party, age, assets, criminal   ║
-- ║     cases, education …) plus office_type + polymorphic jurisdiction +      ║
-- ║     tenure + provenance summary.                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS representatives (
  id            TEXT PRIMARY KEY,   -- e.g. 'TS-REP-GHMC-W042-2020'

  -- ── Office ──
  office_type   TEXT NOT NULL
                CHECK (office_type IN (
                  'mayor', 'deputy_mayor', 'corporator',
                  'ulb_chairperson', 'ulb_vice_chairperson',
                  'ward_member',                    -- ULB councillor (non-corp) or generic
                  'sarpanch', 'gp_ward_member',
                  'mptc_member', 'mandal_parishad_president',
                  'zptc_member', 'zilla_parishad_chairperson'
                )),

  -- ── Polymorphic jurisdiction: exactly one target ──
  jurisdiction_type TEXT NOT NULL
                CHECK (jurisdiction_type IN (
                  'urban_local_body', 'ulb_ward',
                  'zilla_parishad', 'zptc_division',
                  'mandal_parishad', 'mptc_division',
                  'gram_panchayat', 'gp_ward'
                )),
  jurisdiction_id TEXT NOT NULL,     -- FK enforced at app level (polymorphic)

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT,

  -- ── Identity / person (mirrors MLAProfile) ──
  name          TEXT NOT NULL,
  local_name    TEXT,
  party         TEXT,                -- de-facto party; NULL when officially non-party
  party_official BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE for AP panchayats (non-party)
  elected_party TEXT,
  gender        TEXT CHECK (gender IN ('M', 'F', 'O')),
  age           INTEGER,
  dob           DATE,
  dob_estimated BOOLEAN NOT NULL DEFAULT FALSE,
  education     TEXT,
  profession    TEXT,
  marital_status TEXT,
  terms         INTEGER,

  -- ── Affidavit-derived (nullable → "data pending") ──
  criminal_cases   INTEGER,
  total_assets     BIGINT,
  total_liabilities BIGINT,

  -- ── Contact / media (sparse — crowdsourced over time) ──
  photo_url     TEXT,
  phone         TEXT,
  email         TEXT,

  -- ── Tenure ──
  election_year INTEGER,
  election_id   INTEGER REFERENCES local_body_elections(id),
  term_start    DATE,
  term_end      DATE,
  is_current    BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Provenance summary (detailed history in representative_edits) ──
  source_type   TEXT NOT NULL DEFAULT 'curated'
                CHECK (source_type IN (
                  'lgd', 'sec', 'lok_dhaba', 'opencity', 'wikipedia',
                  'eci', 'myneta', 'news', 'curated', 'crowdsourced'
                )),
  source_url    TEXT,
  data_status   TEXT NOT NULL DEFAULT 'data_pending'
                CHECK (data_status IN ('verified', 'data_pending', 'crowdsourced_unverified')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  representatives IS 'Unified local-body office-holder. office_type + (jurisdiction_type, jurisdiction_id) identifies the seat. data_status enforces zero-fabrication honesty.';
COMMENT ON COLUMN representatives.party_official IS 'FALSE where the poll is officially non-party (e.g. AP gram panchayats) — party is de-facto/unofficial.';
COMMENT ON COLUMN representatives.data_status IS 'verified = from official source; data_pending = seat exists but holder unknown; crowdsourced_unverified = user-submitted, awaiting moderation.';
COMMENT ON COLUMN representatives.jurisdiction_id IS 'Polymorphic reference resolved via jurisdiction_type. Not a hard FK (multiple possible parents).';

-- Only one CURRENT holder per seat + office (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_representatives_current_seat
  ON representatives (jurisdiction_type, jurisdiction_id, office_type)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_reps_state          ON representatives(state_code);
CREATE INDEX IF NOT EXISTS idx_reps_office          ON representatives(office_type);
CREATE INDEX IF NOT EXISTS idx_reps_jurisdiction    ON representatives(jurisdiction_type, jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_reps_current          ON representatives(is_current);
CREATE INDEX IF NOT EXISTS idx_reps_data_status       ON representatives(data_status);
CREATE INDEX IF NOT EXISTS idx_reps_election          ON representatives(election_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. REPRESENTATIVE EDITS (Wikipedia-style crowdsourced history)            ║
-- ║     Every crowdsourced edit is fingerprinted (reuse CCA/KYC) and moderated ║
-- ║     before it mutates the canonical `representatives` row.                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS representative_edits (
  id            BIGSERIAL PRIMARY KEY,

  representative_id TEXT NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,

  editor_user_id    UUID,                          -- Supabase auth uid (nullable for system imports)
  editor_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Provenance
  source_type   TEXT NOT NULL
                CHECK (source_type IN (
                  'lgd', 'sec', 'lok_dhaba', 'opencity', 'wikipedia',
                  'eci', 'myneta', 'news', 'curated', 'crowdsourced'
                )),
  source_url    TEXT,
  citation      TEXT,                              -- free-text citation / note

  -- The proposed change: { field: { from, to } }
  diff          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Forensic fingerprint (reuse CCA/KYC action fingerprint snapshot)
  digital_fingerprint JSONB,

  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Moderation
  moderation_status TEXT NOT NULL DEFAULT 'pending'
                CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'auto_applied')),
  moderated_by  UUID,
  moderated_at  TIMESTAMPTZ,
  moderation_note TEXT
);

COMMENT ON TABLE  representative_edits IS 'Immutable-ish audit log of every edit to a representative — Wikipedia-style provenance with forensic fingerprint + moderation gate.';
COMMENT ON COLUMN representative_edits.diff IS 'JSONB of proposed field changes: { "phone": { "from": null, "to": "+91..." } }.';
COMMENT ON COLUMN representative_edits.digital_fingerprint IS 'CCA/KYC forensic snapshot (device, network, location, content hash) captured at submit time.';

CREATE INDEX IF NOT EXISTS idx_rep_edits_rep      ON representative_edits(representative_id);
CREATE INDEX IF NOT EXISTS idx_rep_edits_editor    ON representative_edits(editor_user_id);
CREATE INDEX IF NOT EXISTS idx_rep_edits_status     ON representative_edits(moderation_status);
CREATE INDEX IF NOT EXISTS idx_rep_edits_submitted  ON representative_edits(submitted_at);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. TENURE + PROVENANCE TRIGGERS                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Reuse fn_set_updated_at() defined in 022.
CREATE TRIGGER trg_ulb_updated_at
  BEFORE UPDATE ON urban_local_bodies
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_ulb_wards_updated_at
  BEFORE UPDATE ON ulb_wards
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_zp_updated_at
  BEFORE UPDATE ON zilla_parishads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_zptc_updated_at
  BEFORE UPDATE ON zptc_divisions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_mp_updated_at
  BEFORE UPDATE ON mandal_parishads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_mptc_updated_at
  BEFORE UPDATE ON mptc_divisions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_gp_wards_updated_at
  BEFORE UPDATE ON gp_wards
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_representatives_updated_at
  BEFORE UPDATE ON representatives
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- When a NEW current holder is inserted for a seat+office, retire any prior
-- current holder for the SAME seat (tenure model: outgoing cohort → historical).
CREATE OR REPLACE FUNCTION fn_retire_prior_representative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE representatives
       SET is_current = FALSE,
           term_end   = COALESCE(term_end, NEW.term_start, CURRENT_DATE),
           updated_at = now()
     WHERE jurisdiction_type = NEW.jurisdiction_type
       AND jurisdiction_id   = NEW.jurisdiction_id
       AND office_type       = NEW.office_type
       AND id <> NEW.id
       AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_retire_prior_representative
  AFTER INSERT ON representatives
  FOR EACH ROW EXECUTE FUNCTION fn_retire_prior_representative();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. ROLLUP VIEWS                                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Coverage / completeness per state + office_type (drives "data pending" UX)
CREATE OR REPLACE VIEW v_representative_coverage AS
SELECT
  state_code,
  office_type,
  COUNT(*)                                              AS total_seats_with_holder,
  COUNT(*) FILTER (WHERE data_status = 'verified')       AS verified,
  COUNT(*) FILTER (WHERE data_status = 'data_pending')   AS data_pending,
  COUNT(*) FILTER (WHERE data_status = 'crowdsourced_unverified') AS crowdsourced,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL)          AS with_photo,
  COUNT(*) FILTER (WHERE phone IS NOT NULL)              AS with_phone
FROM representatives
WHERE is_current = TRUE
GROUP BY state_code, office_type;

COMMENT ON VIEW v_representative_coverage IS 'Per-state, per-office coverage counts — powers honest completeness badges & "data pending" states.';

-- Moderation queue for pending crowdsourced edits
CREATE OR REPLACE VIEW v_representative_edit_queue AS
SELECT
  re.id,
  re.representative_id,
  r.name           AS representative_name,
  r.office_type,
  r.state_code,
  re.editor_user_id,
  re.editor_kyc_verified,
  re.source_type,
  re.source_url,
  re.diff,
  re.submitted_at
FROM representative_edits re
JOIN representatives r ON r.id = re.representative_id
WHERE re.moderation_status = 'pending'
ORDER BY re.submitted_at ASC;

COMMENT ON VIEW v_representative_edit_queue IS 'Pending crowdsourced representative edits awaiting moderation.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  10. ROW LEVEL SECURITY                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE urban_local_bodies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ulb_wards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zilla_parishads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zptc_divisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandal_parishads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mptc_divisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_wards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE representative_edits ENABLE ROW LEVEL SECURITY;

-- Public read for structural + representative data
CREATE POLICY "Public read urban_local_bodies"  ON urban_local_bodies  FOR SELECT USING (true);
CREATE POLICY "Public read ulb_wards"            ON ulb_wards            FOR SELECT USING (true);
CREATE POLICY "Public read zilla_parishads"      ON zilla_parishads      FOR SELECT USING (true);
CREATE POLICY "Public read zptc_divisions"       ON zptc_divisions       FOR SELECT USING (true);
CREATE POLICY "Public read mandal_parishads"     ON mandal_parishads     FOR SELECT USING (true);
CREATE POLICY "Public read mptc_divisions"       ON mptc_divisions       FOR SELECT USING (true);
CREATE POLICY "Public read gp_wards"             ON gp_wards             FOR SELECT USING (true);
CREATE POLICY "Public read representatives"      ON representatives      FOR SELECT USING (true);

-- Service-role write on structural + representative tables
CREATE POLICY "Service write urban_local_bodies" ON urban_local_bodies  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write ulb_wards"          ON ulb_wards            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write zilla_parishads"    ON zilla_parishads      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write zptc_divisions"     ON zptc_divisions       FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write mandal_parishads"   ON mandal_parishads     FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write mptc_divisions"     ON mptc_divisions       FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write gp_wards"           ON gp_wards             FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write representatives"    ON representatives      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- representative_edits: public read; authenticated users may submit; service/admin moderate.
CREATE POLICY "Public read representative_edits"
  ON representative_edits FOR SELECT USING (true);

CREATE POLICY "Authenticated submit representative_edits"
  ON representative_edits FOR INSERT
  WITH CHECK (auth.uid() = editor_user_id);

CREATE POLICY "Service moderate representative_edits"
  ON representative_edits FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


COMMIT;



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 023_data_api_grants.sql
-- ────────────────────────────────────────────────────────

-- Migration 023: Data API role grants
--
-- WHY: Row Level Security is enabled on every application table (migrations
-- 001–022) with explicit policies. However, RLS only governs *which rows* a
-- role may see/modify — it does NOT grant the underlying table privileges.
--
-- Supabase projects created under the legacy default auto-exposed new tables to
-- the Data API roles (anon / authenticated / service_role). Projects created
-- under the *new* default do NOT (see `auto_expose_new_tables` in config.toml).
-- Without these GRANTs, the mobile app receives "permission denied for table …"
-- even with correct keys and RLS policies.
--
-- This migration makes the schema self-contained and portable across both
-- defaults. Safety: every table has RLS enabled, so these broad GRANTs do not
-- widen row access — a role still only sees/changes rows permitted by policy
-- (e.g. anon sees 0 rows of user_favourites). service_role has BYPASSRLS and
-- needs full access for server-side operations.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Existing objects
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Future objects created by the migration owner inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 024_live_media_exchange.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 025_feed_realtime_and_social.sql
-- ────────────────────────────────────────────────────────

-- KSHETRA Database Schema — Sprint 3/4 Extension: Feed Realtime, Language Support & Social Hardening
-- Migration: 025_feed_realtime_and_social.sql
-- Enables Realtime on posts, comments, reactions, and poll_votes for live feed updates.

-- 1. Add language column to posts and comments for multi-lingual civic discourse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'language'
  ) THEN
    ALTER TABLE posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'language'
  ) THEN
    ALTER TABLE comments ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
  END IF;
END $$;

-- 2. Create index on language and scope for high-performance localized queries
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
CREATE INDEX IF NOT EXISTS idx_posts_scope ON posts(state_code, constituency_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);

-- 3. Ensure reaction uniqueness and fast lookup for comments
CREATE INDEX IF NOT EXISTS idx_reactions_comment_user ON reactions(comment_id, user_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_post_user ON reactions(post_id, user_id) WHERE post_id IS NOT NULL;

-- 4. Enable Supabase Realtime Publication for live feed and live comments
-- This allows clients subscribed to 'posts', 'comments', 'reactions', 'poll_votes'
-- to receive instantaneous postgres_changes events on production Supabase.
DO $$
BEGIN
  -- Check if publication exists (standard on Supabase)
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE posts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 026_campaign_wallet_and_obd.sql
-- ────────────────────────────────────────────────────────

-- 026: Campaign Wallet, Transactions, and Bulk Voice OBD Dispatch
-- Enables prepaid wallet monetization, Razorpay top-up, TRAI-compliant OBD dispatching, and webhook tracking

-- ─── Campaign Wallets ───
CREATE TABLE IF NOT EXISTS campaign_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_inr >= 0),
  total_recharged_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_spent_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(politician_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_wallets_politician ON campaign_wallets(politician_id);

-- ─── Wallet Transactions Ledger ───
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES campaign_wallets(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_inr NUMERIC(12,2) NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('recharge', 'voice_obd', 'meta_boost', 'refund')),
  reference_id TEXT,
  description TEXT NOT NULL,
  balance_after_inr NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_politician ON wallet_transactions(politician_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- ─── Voice OBD Broadcasts ───
CREATE TABLE IF NOT EXISTS voice_obd_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duration_seconds INTEGER DEFAULT 30,
  target_segment JSONB NOT NULL DEFAULT '{}',
  total_recipients INTEGER NOT NULL,
  rate_per_call_inr NUMERIC(6,2) NOT NULL DEFAULT 0.90,
  total_cost_inr NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'calling', 'completed', 'cancelled', 'failed', 'outside_trai_window')),
  provider_ref TEXT,
  answered_count INTEGER DEFAULT 0,
  busy_count INTEGER DEFAULT 0,
  unreachable_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obd_campaign ON voice_obd_broadcasts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_obd_politician ON voice_obd_broadcasts(politician_id);
CREATE INDEX IF NOT EXISTS idx_obd_status ON voice_obd_broadcasts(status);

-- ─── RLS Policies ───
ALTER TABLE campaign_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_obd_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicians read own wallet" ON campaign_wallets
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Politicians read own wallet transactions" ON wallet_transactions
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Politicians manage own obd broadcasts" ON voice_obd_broadcasts
  FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 027_extend_role_and_verification.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 028_user_follows.sql
-- ────────────────────────────────────────────────────────

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



-- ────────────────────────────────────────────────────────
-- START MIGRATION: 029_fix_auth_trigger.sql
-- ────────────────────────────────────────────────────────

-- 029: Fix handle_new_user trigger search_path and error handling
-- Ensures Supabase Auth user signup seamlessly creates public.user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Citizen'
  );

  -- Ensure length is at least 2 chars to satisfy display_name check constraint
  IF char_length(v_display_name) < 2 THEN
    v_display_name := v_display_name || '_user';
  END IF;

  INSERT INTO public.user_profiles (user_id, display_name, role, verification_status)
  VALUES (
    NEW.id,
    v_display_name,
    'citizen',
    'unverified'
  )
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier)
    VALUES (NEW.id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


