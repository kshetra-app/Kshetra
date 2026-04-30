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
