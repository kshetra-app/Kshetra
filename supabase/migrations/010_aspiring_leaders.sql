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
