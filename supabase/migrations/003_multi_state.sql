-- Migration 003: Multi-State Foundation
-- Adds state-scoped tables and seed data for AP, KA support

-- ── States table ────────────────────────────────────────────────────────────
-- The base `states` table is created in 001_initial_schema.sql
-- (code, name, total_seats, ruling_party, centroid_lat, centroid_lng).
-- Here we additively augment it with multi-state metadata columns.
ALTER TABLE states ADD COLUMN IF NOT EXISTS assembly_seats      INTEGER;
ALTER TABLE states ADD COLUMN IF NOT EXISTS parliamentary_seats INTEGER;
ALTER TABLE states ADD COLUMN IF NOT EXISTS zoom_level          DOUBLE PRECISION NOT NULL DEFAULT 7;
ALTER TABLE states ADD COLUMN IF NOT EXISTS data_status         TEXT NOT NULL DEFAULT 'stub'; -- 'full', 'stub', 'planned'
ALTER TABLE states ADD COLUMN IF NOT EXISTS has_geojson         BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed / enrich states. total_seats is NOT NULL in 001, so it is always
-- provided (kept in sync with assembly_seats). Existing rows are enriched.
INSERT INTO states (code, name, total_seats, assembly_seats, parliamentary_seats, ruling_party, centroid_lat, centroid_lng, zoom_level, data_status, has_geojson)
VALUES
  ('TS', 'Telangana', 119, 119, 17, 'INC', 17.8495, 79.1151, 7, 'full', TRUE),
  ('AP', 'Andhra Pradesh', 175, 175, 25, 'TDP', 15.9129, 79.7400, 7, 'stub', FALSE),
  ('KA', 'Karnataka', 224, 224, 28, 'INC', 15.3173, 75.7139, 6.5, 'stub', FALSE),
  ('MH', 'Maharashtra', 288, 288, 48, 'BJP', 19.7515, 75.7139, 6, 'planned', FALSE)
ON CONFLICT (code) DO UPDATE SET
  assembly_seats      = EXCLUDED.assembly_seats,
  parliamentary_seats = EXCLUDED.parliamentary_seats,
  zoom_level          = EXCLUDED.zoom_level,
  data_status         = EXCLUDED.data_status,
  has_geojson         = EXCLUDED.has_geojson;

-- ── Constituencies table (multi-state) ──────────────────────────────────────
-- The base `constituencies` table is created in 001_initial_schema.sql
-- (id, ac_no, name, state_code, district, reservation_status, boundary).
-- Here we additively augment it with current-MLA / latest-result metadata.
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS current_party        TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS current_mla          TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS latest_election_year INTEGER;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS winner_votes         INTEGER;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS runner_up_party      TEXT;
ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS margin               INTEGER;

-- Index for common queries (idx_constituencies_state already exists from 001)
CREATE INDEX IF NOT EXISTS idx_constituencies_party ON constituencies(current_party);
CREATE INDEX IF NOT EXISTS idx_constituencies_state_district ON constituencies(state_code, district);

-- ── Add state_code to existing social tables ────────────────────────────────
-- posts.state_code is owned by 003_posts_polls_social.sql and
-- civic_issues.state_code by 004_civic_dashboard.sql (both NOT NULL REFERENCES
-- states(code) in their own CREATE TABLE). Nothing to add here.

-- ── RLS policies for constituencies ─────────────────────────────────────────
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "constituencies_read_all"
  ON constituencies FOR SELECT
  USING (true);

CREATE POLICY "constituencies_insert_admin"
  ON constituencies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── State-scoped feed view ──────────────────────────────────────────────────
-- The state_feed view is defined in 003_posts_polls_social.sql, after the
-- posts table exists (this migration runs before posts is created).
