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

-- ─── 3. RLS POLICY VERIFICATION & ENFORCEMENT ─────────────────────────────────
ALTER TABLE public.delimitation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_mapping ENABLE ROW LEVEL SECURITY;

COMMIT;
