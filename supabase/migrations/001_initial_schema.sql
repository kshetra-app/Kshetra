-- KSHETRA Database Schema — Phase 3C
-- PostgreSQL + PostGIS on Supabase
--
-- This migration creates the core tables for constituencies,
-- elections, and user favourites.

-- Enable PostGIS extension (Supabase usually has this pre-enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── STATES ───

CREATE TABLE IF NOT EXISTS states (
  code TEXT PRIMARY KEY,          -- e.g. 'TS', 'AP', 'KA'
  name TEXT NOT NULL,             -- e.g. 'Telangana'
  total_seats INTEGER NOT NULL,
  ruling_party TEXT,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CONSTITUENCIES ───

CREATE TABLE IF NOT EXISTS constituencies (
  id TEXT PRIMARY KEY,            -- e.g. 'TS-AC-1'
  ac_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  state_code TEXT NOT NULL REFERENCES states(code),
  district TEXT NOT NULL,
  reservation_status TEXT NOT NULL CHECK (reservation_status IN ('GEN', 'SC', 'ST')),
  boundary GEOMETRY(MultiPolygon, 4326),  -- PostGIS geometry
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state_code, ac_no)
);

CREATE INDEX IF NOT EXISTS idx_constituencies_state ON constituencies(state_code);
CREATE INDEX IF NOT EXISTS idx_constituencies_district ON constituencies(district);
CREATE INDEX IF NOT EXISTS idx_constituencies_boundary ON constituencies USING GIST(boundary);

-- ─── ELECTIONS ───

CREATE TABLE IF NOT EXISTS elections (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL REFERENCES states(code),
  year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assembly', 'parliament')),
  turnout DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (state_code, year, type)
);

-- ─── ELECTION RESULTS (per constituency per election) ───

CREATE TABLE IF NOT EXISTS election_results (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL REFERENCES elections(id),
  constituency_id TEXT NOT NULL REFERENCES constituencies(id),
  winner_party TEXT NOT NULL,
  winner_name TEXT,
  winner_votes INTEGER,
  runner_up_party TEXT,
  margin INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_results_election ON election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_results_constituency ON election_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_results_party ON election_results(winner_party);

-- ─── USER FAVOURITES (tied to Supabase Auth) ───

CREATE TABLE IF NOT EXISTS user_favourites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL REFERENCES constituencies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_favourites_user ON user_favourites(user_id);

-- ─── ROW LEVEL SECURITY ───

ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favourites
CREATE POLICY "Users can read own favourites"
  ON user_favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
  ON user_favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON user_favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access to constituencies and elections
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read states" ON states FOR SELECT USING (true);
CREATE POLICY "Public read constituencies" ON constituencies FOR SELECT USING (true);
CREATE POLICY "Public read elections" ON elections FOR SELECT USING (true);
CREATE POLICY "Public read election_results" ON election_results FOR SELECT USING (true);
