-- ==============================================================================
-- setup_w021_g2_isolated_test.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Isolated Test Harness Setup
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── 1. SIMULATE ROLES IF NEEDED ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- ─── 2. POSTGIS 589 GEOMETRY BASELINE HARNESS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.constituency_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_id TEXT NOT NULL UNIQUE,
  geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
  source_digest TEXT NOT NULL DEFAULT 'f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed exactly 589 synthetic boundary rows
INSERT INTO public.constituency_boundaries (constituency_id, geom, source_digest)
SELECT
  'AC_' || lpad(i::text, 3, '0'),
  ST_Multi(ST_GeomFromText('POLYGON((78.0 17.0, 78.1 17.0, 78.1 17.1, 78.0 17.1, 78.0 17.0))', 4326)),
  'f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b'
FROM generate_series(1, 589) AS s(i)
ON CONFLICT (constituency_id) DO NOTHING;
