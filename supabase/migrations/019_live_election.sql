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
