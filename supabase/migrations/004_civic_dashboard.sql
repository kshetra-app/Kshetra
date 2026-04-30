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
