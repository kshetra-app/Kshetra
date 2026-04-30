-- KSHETRA Database Schema — Sprint 14: Election Affidavits & Candidate Transparency
-- Depends on: 001_initial_schema.sql
--
-- New tables: candidate_affidavits, affidavit_criminal_cases
-- Purpose: Store EC-filed affidavit data (assets, criminal cases, education, income)
-- Data source: MyNeta/ADR (Association for Democratic Reforms), ECI

-- ─── CANDIDATE AFFIDAVITS ───

CREATE TABLE IF NOT EXISTS candidate_affidavits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  constituency_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  party TEXT NOT NULL,
  election_year INTEGER NOT NULL,

  -- Assets (in INR)
  self_movable_assets BIGINT DEFAULT 0,
  self_immovable_assets BIGINT DEFAULT 0,
  spouse_movable_assets BIGINT DEFAULT 0,
  spouse_immovable_assets BIGINT DEFAULT 0,
  total_assets BIGINT GENERATED ALWAYS AS (
    self_movable_assets + self_immovable_assets + spouse_movable_assets + spouse_immovable_assets
  ) STORED,

  -- Liabilities
  total_liabilities BIGINT DEFAULT 0,

  -- Criminal
  criminal_cases INTEGER NOT NULL DEFAULT 0,
  serious_criminal_cases INTEGER NOT NULL DEFAULT 0,

  -- Personal
  education TEXT,
  profession TEXT,
  age INTEGER,
  self_income BIGINT DEFAULT 0,
  spouse_income BIGINT DEFAULT 0,

  -- Source & metadata
  source_url TEXT,
  filed_date DATE,
  is_winner BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(candidate_name, ac_no, state_code, election_year)
);

-- ─── CRIMINAL CASE DETAILS ───

CREATE TABLE IF NOT EXISTS affidavit_criminal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affidavit_id UUID NOT NULL REFERENCES candidate_affidavits(id) ON DELETE CASCADE,
  case_no TEXT,
  court TEXT,
  ipc_sections TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'convicted', 'acquitted')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ───

CREATE INDEX IF NOT EXISTS idx_affidavits_state_ac ON candidate_affidavits(state_code, ac_no);
CREATE INDEX IF NOT EXISTS idx_affidavits_candidate ON candidate_affidavits(candidate_name);
CREATE INDEX IF NOT EXISTS idx_affidavits_year ON candidate_affidavits(election_year);
CREATE INDEX IF NOT EXISTS idx_affidavits_party ON candidate_affidavits(party);
CREATE INDEX IF NOT EXISTS idx_affidavit_cases_affidavit ON affidavit_criminal_cases(affidavit_id);

-- ─── RLS ───

ALTER TABLE candidate_affidavits ENABLE ROW LEVEL SECURITY;
ALTER TABLE affidavit_criminal_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read affidavits" ON candidate_affidavits
  FOR SELECT USING (true);

CREATE POLICY "Public read criminal cases" ON affidavit_criminal_cases
  FOR SELECT USING (true);

CREATE POLICY "Admin insert affidavits" ON candidate_affidavits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admin insert criminal cases" ON affidavit_criminal_cases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ─── UPDATED_AT TRIGGER ───

CREATE OR REPLACE FUNCTION update_affidavit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affidavit_updated_at
  BEFORE UPDATE ON candidate_affidavits
  FOR EACH ROW EXECUTE FUNCTION update_affidavit_timestamp();
