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
