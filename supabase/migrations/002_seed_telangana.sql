-- Seed Telangana state data
-- Run after 001_initial_schema.sql

INSERT INTO states (code, name, total_seats, ruling_party, centroid_lat, centroid_lng)
VALUES ('TS', 'Telangana', 119, 'INC', 17.8495, 79.1151)
ON CONFLICT (code) DO NOTHING;

-- Seed elections (state-level)
INSERT INTO elections (state_code, year, type, turnout, notes) VALUES
  ('TS', 2023, 'assembly', 64.23, 'INC returned to power. BRS lost majority after 9 years.'),
  ('TS', 2018, 'assembly', 73.20, 'TRS (now BRS) won landslide after early dissolution.'),
  ('TS', 2014, 'assembly', 69.16, 'First election after Telangana state formation.')
ON CONFLICT (state_code, year, type) DO NOTHING;

-- NOTE: Constituency and election_result rows should be populated
-- via a migration script that reads from the TypeScript seed data.
-- This ensures the single source of truth remains the TS seed file.
--
-- Run: npx ts-node supabase/scripts/seed-constituencies.ts
-- (to be created when Supabase project is connected)
