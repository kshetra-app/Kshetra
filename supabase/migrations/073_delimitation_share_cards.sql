-- ==============================================================================
-- Migration 073: Delimitation Share Cards & Public Web Links (JOB 022)
-- Target: Staging Supabase / Local PostgreSQL / Production
-- Authoritative Architecture: docs/DELIMITATION_FRAMEWORK.md & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
-- Mandate: JOB 022 — Delimitation Share Cards & Verified Public Web Previews
-- Scope:
--   1. Create delimitation_share_snapshots table for immutable public share cards
--   2. Enforce strict DPDP Act 2023 privacy check constraints (zero voter PII)
--   3. Configure Row Level Security (RLS) with public read access
--   4. Seed representative pilot share snapshots for Telangana ACs
-- ==============================================================================

BEGIN;

-- ─── 1. DELIMITATION SHARE SNAPSHOTS TABLE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_share_snapshots (
  share_id VARCHAR(32) PRIMARY KEY,
  pin_code VARCHAR(6) NOT NULL,
  state_code VARCHAR(10) NOT NULL,
  constituency_name TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  impact_type VARCHAR(50) NOT NULL DEFAULT 'NO_CHANGE',
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  og_image_url TEXT,
  canonical_share_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- DPDP Act 2023 & Zero-PII Compliance Invariants
  CONSTRAINT chk_share_pin_format CHECK (pin_code ~ '^[1-9][0-9]{5}$'),
  CONSTRAINT chk_share_state_code CHECK (length(state_code) >= 2 AND length(state_code) <= 10),
  CONSTRAINT chk_share_ac_no CHECK (ac_no >= 1 AND ac_no <= 1000),
  CONSTRAINT chk_share_no_pii CHECK (
    headline !~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' AND
    summary !~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' AND
    headline !~* '(\+91|0)?[6-9][0-9]{9}' AND
    summary !~* '(\+91|0)?[6-9][0-9]{9}'
  )
);

CREATE INDEX IF NOT EXISTS idx_delim_share_pin ON public.delimitation_share_snapshots(pin_code);
CREATE INDEX IF NOT EXISTS idx_delim_share_created ON public.delimitation_share_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delim_share_ac ON public.delimitation_share_snapshots(state_code, ac_no);

COMMENT ON TABLE public.delimitation_share_snapshots IS
  'Immutable public share card snapshots for citizen delimitation impact, viewable via SSR Open Graph web preview.';

-- ─── 2. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────

ALTER TABLE public.delimitation_share_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read share snapshots"
    ON public.delimitation_share_snapshots
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public insert share snapshots"
    ON public.delimitation_share_snapshots
    FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 3. SEED REPRESENTATIVE PILOT SHARE SNAPSHOTS ─────────────────────────────

INSERT INTO public.delimitation_share_snapshots (
  share_id,
  pin_code,
  state_code,
  constituency_name,
  ac_no,
  impact_type,
  headline,
  summary,
  og_image_url,
  canonical_share_url,
  created_at
)
VALUES
  (
    'share_ts_004_504208',
    '504208',
    'TS',
    'Mancherial',
    4,
    'NO_CHANGE',
    'Mancherial AC 4: Personal Delimitation Assessment',
    'Boundaries remain statutory under Delimitation Order 2008. Rebalancing frozen until post-2026 census data publication.',
    'https://poligram.in/og/delimitation/TS-4.png',
    'https://poligram.in/share/delimitation/share_ts_004_504208',
    now()
  ),
  (
    'share_ts_072_509338',
    '509338',
    'TS',
    'Kodangal',
    72,
    'NO_CHANGE',
    'Kodangal AC 72: Personal Delimitation Assessment',
    'Rural Assembly Constituency Kodangal boundaries are preserved under current constitutional regime. No immediate territory shift.',
    'https://poligram.in/og/delimitation/TS-72.png',
    'https://poligram.in/share/delimitation/share_ts_072_509338',
    now()
  ),
  (
    'share_ts_066_500002',
    '500002',
    'TS',
    'Charminar',
    66,
    'HIGH_DENSITY_STABILITY',
    'Charminar AC 66: Personal Delimitation Assessment',
    'Urban core density monitored under Article 170 equal-population balancing models. Verified sitting MLA representation active.',
    'https://poligram.in/og/delimitation/TS-66.png',
    'https://poligram.in/share/delimitation/share_ts_066_500002',
    now()
  )
ON CONFLICT (share_id) DO UPDATE SET
  headline = EXCLUDED.headline,
  summary = EXCLUDED.summary,
  canonical_share_url = EXCLUDED.canonical_share_url;

COMMIT;
