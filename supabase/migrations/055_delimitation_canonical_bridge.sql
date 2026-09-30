-- ==============================================================================
-- 055_delimitation_canonical_bridge.sql
--
-- Milestone: W020 — Delimitation Engine Foundation (Gate W020-G4)
-- Authority: CTO DIRECTIVE — W020-G4 MIGRATION 055 STAGING PREFLIGHT
-- Ratified Plan: PLAN-W020-MASTER-REV-1.3.md
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Purpose:
-- Establishes canonical relationships between legacy delimitation prototype tables
-- and authoritative governance tables:
--   1. public.delimitation_proposals -> public.delimitation_regimes(id)
--   2. public.delimitation_proposals -> public.provenance_records(id)
--   3. public.delimitation_proposals.metadata JSONB NOT NULL DEFAULT '{}'::jsonb
--   4. public.constituency_mapping -> public.constituency_versions(id) [target version]
--   5. public.constituency_mapping -> public.constituency_versions(id) [predecessor version]
--   6. public.constituency_mapping -> public.provenance_records(id)
--
-- Invariants Enforced:
-- - ZERO persistent 'is_scenario' boolean (legal_status in delimitation_regimes is single source of truth)
-- - ZERO destructive drops/renames of legacy prototype tables (backward compatibility preserved)
-- - ZERO mutations to the frozen 589 geometry baseline
-- - ZERO modifications to election normalization or political entity models
-- - ON DELETE RESTRICT on all foreign keys to prevent orphan references
-- - RLS enabled on all modified tables
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
