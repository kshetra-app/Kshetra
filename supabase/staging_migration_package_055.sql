-- ==============================================================================
-- staging_migration_package_055.sql
--
-- Milestone: W020 — Delimitation Engine Foundation (Gate W020-G4)
-- Authority: CTO DIRECTIVE — W020-G4 MIGRATION 055 STAGING PREFLIGHT
-- Ratified Plan: PLAN-W020-MASTER-REV-1.3.md
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ─── 0. PRE-CHECK ASSERTIONS ──────────────────────────────────────────────────
DO $$
DECLARE
  v_prop_count INTEGER;
  v_map_count INTEGER;
BEGIN
  SELECT count(*) INTO v_prop_count FROM public.delimitation_proposals;
  SELECT count(*) INTO v_map_count FROM public.constituency_mapping;
  
  RAISE NOTICE '[MIGRATION 055] PRE-CHECK: delimitation_proposals row count = %', v_prop_count;
  RAISE NOTICE '[MIGRATION 055] PRE-CHECK: constituency_mapping row count = %', v_map_count;
  
  IF v_prop_count > 0 OR v_map_count > 0 THEN
    RAISE EXCEPTION '[MIGRATION 055] PRE-CHECK FAILED: Prototype tables must have 0 rows prior to Migration 055 application';
  END IF;
END $$;

-- ─── 1. DELIMITATION PROPOSALS CANONICAL BRIDGE ──────────────────────────────
ALTER TABLE public.delimitation_proposals
  ADD COLUMN IF NOT EXISTS delimitation_regime_id VARCHAR(50)
    REFERENCES public.delimitation_regimes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS provenance_id UUID
    REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_delim_proposals_regime
  ON public.delimitation_proposals(delimitation_regime_id);

CREATE INDEX IF NOT EXISTS idx_delim_proposals_provenance
  ON public.delimitation_proposals(provenance_id);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 055] STEP 1: Added delimitation_regime_id, provenance_id, metadata to public.delimitation_proposals';
END $$;

-- ─── 2. CONSTITUENCY MAPPING CANONICAL BRIDGE ────────────────────────────────
ALTER TABLE public.constituency_mapping
  ADD COLUMN IF NOT EXISTS constituency_version_id UUID
    REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS predecessor_version_id UUID
    REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS provenance_id UUID
    REFERENCES public.provenance_records(id) ON DELETE RESTRICT;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_mapping_constituency_version
  ON public.constituency_mapping(constituency_version_id);

CREATE INDEX IF NOT EXISTS idx_mapping_predecessor_version
  ON public.constituency_mapping(predecessor_version_id);

CREATE INDEX IF NOT EXISTS idx_mapping_provenance
  ON public.constituency_mapping(provenance_id);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 055] STEP 2: Added constituency_version_id, predecessor_version_id, provenance_id to public.constituency_mapping';
END $$;

-- ─── 3. RLS POLICY VERIFICATION & ENFORCEMENT ─────────────────────────────────
ALTER TABLE public.delimitation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_mapping ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delimitation_proposals' AND policyname = 'delim_proposals_read_policy'
  ) THEN
    CREATE POLICY delim_proposals_read_policy ON public.delimitation_proposals
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'constituency_mapping' AND policyname = 'constituency_mapping_read_policy'
  ) THEN
    CREATE POLICY constituency_mapping_read_policy ON public.constituency_mapping
      FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON public.delimitation_proposals TO anon, authenticated;
GRANT SELECT ON public.constituency_mapping TO anon, authenticated;

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 055] STEP 3: Created 5 FK indexes and enabled Row Level Security';
  RAISE NOTICE '[MIGRATION 055] SUCCESS: Migration 055 applied successfully within transaction.';
END $$;

COMMIT;
