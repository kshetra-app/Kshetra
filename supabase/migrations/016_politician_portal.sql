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
