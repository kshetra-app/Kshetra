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
