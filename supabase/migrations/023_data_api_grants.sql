-- Migration 023: Data API role grants
--
-- WHY: Row Level Security is enabled on every application table (migrations
-- 001–022) with explicit policies. However, RLS only governs *which rows* a
-- role may see/modify — it does NOT grant the underlying table privileges.
--
-- Supabase projects created under the legacy default auto-exposed new tables to
-- the Data API roles (anon / authenticated / service_role). Projects created
-- under the *new* default do NOT (see `auto_expose_new_tables` in config.toml).
-- Without these GRANTs, the mobile app receives "permission denied for table …"
-- even with correct keys and RLS policies.
--
-- This migration makes the schema self-contained and portable across both
-- defaults. Safety: every table has RLS enabled, so these broad GRANTs do not
-- widen row access — a role still only sees/changes rows permitted by policy
-- (e.g. anon sees 0 rows of user_favourites). service_role has BYPASSRLS and
-- needs full access for server-side operations.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Existing objects
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Future objects created by the migration owner inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
