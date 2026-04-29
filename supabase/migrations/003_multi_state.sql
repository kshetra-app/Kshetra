-- Migration 003: Multi-State Foundation
-- Adds state-scoped tables and seed data for AP, KA support

-- ── States table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS states (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  assembly_seats     INTEGER NOT NULL,
  parliamentary_seats INTEGER NOT NULL,
  ruling_party       TEXT NOT NULL,
  centroid_lat       DOUBLE PRECISION NOT NULL,
  centroid_lng       DOUBLE PRECISION NOT NULL,
  zoom_level         DOUBLE PRECISION NOT NULL DEFAULT 7,
  data_status        TEXT NOT NULL DEFAULT 'stub', -- 'full', 'stub', 'planned'
  has_geojson        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed states
INSERT INTO states (code, name, assembly_seats, parliamentary_seats, ruling_party, centroid_lat, centroid_lng, zoom_level, data_status, has_geojson)
VALUES
  ('TS', 'Telangana', 119, 17, 'INC', 17.8495, 79.1151, 7, 'full', TRUE),
  ('AP', 'Andhra Pradesh', 175, 25, 'TDP', 15.9129, 79.7400, 7, 'stub', FALSE),
  ('KA', 'Karnataka', 224, 28, 'INC', 15.3173, 75.7139, 6.5, 'stub', FALSE),
  ('MH', 'Maharashtra', 288, 48, 'BJP', 19.7515, 75.7139, 6, 'planned', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ── Constituencies table (multi-state) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS constituencies (
  id              TEXT PRIMARY KEY, -- e.g. 'TS-AC-1'
  state_code      TEXT NOT NULL REFERENCES states(code),
  ac_no           INTEGER NOT NULL,
  name            TEXT NOT NULL,
  district        TEXT NOT NULL,
  reservation     TEXT NOT NULL DEFAULT 'GEN', -- GEN, SC, ST
  current_party   TEXT NOT NULL,
  current_mla     TEXT NOT NULL,
  latest_election_year INTEGER,
  winner_votes    INTEGER,
  runner_up_party TEXT,
  margin          INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state_code, ac_no)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
CREATE INDEX IF NOT EXISTS idx_constituencies_party ON constituencies(current_party);
CREATE INDEX IF NOT EXISTS idx_constituencies_district ON constituencies(state_code, district);

-- ── Add state_code to existing social tables ────────────────────────────────
-- Posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT 'TS';
-- Civic issues
ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT 'TS';

-- ── RLS policies for constituencies ─────────────────────────────────────────
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "constituencies_read_all"
  ON constituencies FOR SELECT
  USING (true);

CREATE POLICY "constituencies_insert_admin"
  ON constituencies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── State-scoped feed view ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW state_feed AS
SELECT
  p.*,
  COALESCE(p.state_code, 'TS') AS feed_state
FROM posts p
WHERE p.status = 'active'
ORDER BY p.created_at DESC;
