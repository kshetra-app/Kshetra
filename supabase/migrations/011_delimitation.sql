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
