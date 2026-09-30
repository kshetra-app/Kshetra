-- ==============================================================================
-- rollback_055_delimitation_canonical_bridge.sql
--
-- Milestone: W020 — Delimitation Engine Foundation (Gate W020-G4 Rollback)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Safety Rationale:
-- Reverts additive schema changes introduced in Migration 055.
-- Since delimitation_proposals and constituency_mapping contain 0 rows,
-- this rollback is completely safe, atomic, and leaves no residual schema artifacts.
-- ==============================================================================

BEGIN;

-- 1. Drop added indexes on constituency_mapping
DROP INDEX IF EXISTS public.idx_mapping_provenance;
DROP INDEX IF EXISTS public.idx_mapping_predecessor_version;
DROP INDEX IF EXISTS public.idx_mapping_constituency_version;

-- 2. Drop added columns on constituency_mapping
ALTER TABLE public.constituency_mapping
  DROP COLUMN IF EXISTS provenance_id,
  DROP COLUMN IF EXISTS predecessor_version_id,
  DROP COLUMN IF EXISTS constituency_version_id;

-- 3. Drop added indexes on delimitation_proposals
DROP INDEX IF EXISTS public.idx_delim_proposals_provenance;
DROP INDEX IF EXISTS public.idx_delim_proposals_regime;

-- 4. Drop added columns on delimitation_proposals
ALTER TABLE public.delimitation_proposals
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS provenance_id,
  DROP COLUMN IF EXISTS delimitation_regime_id;

COMMIT;
