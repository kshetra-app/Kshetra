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
