-- ==============================================================================
-- KSHETRA DATABASE MIGRATION 044
-- Migration: 044_mandal_temporal_boundary_remediation.sql
-- Name: mandal_temporal_boundary_remediation
-- Scope: Partitioned Canonical Timeline & GiST Boundary Remediation (W014-M6)
-- Target: panIN-staging / Production
-- Authoritative Reference: W014-M6 Acceptance / W014-GOV-01 Option B
-- Mandate: CTO Implementation Authorization (W014-GOV-01)
--
-- ARCHITECTURE (OPTION A — BEFORE ROW IMMEDIATE TRIGGER):
-- 1. Pre-migration assertion: Fail closed if overlapping closed historical intervals exist.
-- 2. Drop unconditional exclusion constraint `uq_mandal_versions_no_overlap`.
-- 3. Create partitioned historical exclusion constraint `uq_mandal_versions_historical_no_overlap`:
--      EXCLUDE USING gist (
--        mandal_id WITH =,
--        (daterange(valid_from, valid_to, '[)')) WITH &&
--      ) WHERE (valid_to IS NOT NULL);
-- 4. Create `fn_guard_mandal_version_temporal_bounds` and `trg_guard_mandal_version_temporal_bounds`:
--      - BEFORE ROW trigger covering INSERT and UPDATE of (mandal_id, valid_from, valid_to, is_current)
--      - Deterministic mandal_id immutability enforcement (ERR-W014-008 / 23514)
--      - Immediate per-mandal concurrency serialization: SELECT ... FROM mandals WHERE id = NEW.mandal_id FOR UPDATE
--      - Direction A: Closed historical NEW must not overlap active current version (ERR-W014-006 / 23P01)
--      - Direction B: Active current NEW must not overlap any closed historical version (ERR-W014-006 / 23P01)
--      - Candidate permissibility: is_current=false AND valid_to IS NULL stages cleanly
--      - SECURITY DEFINER, owner = panin_boundary_definer, pinned search_path = public, pg_temp
-- 5. Harden `fn_guard_mandal_current_version` on public.mandals (Layer 2 anchor trigger).
-- NOTE: `fn_transition_mandal_current_version` was already deployed, hardened, and verified
--       with full least-privilege ACLs in Migration 041 and is intentionally untouched.
--
-- SECURITY / INVARIANT BOUNDS:
-- - STRICTLY ZERO table privilege broadening
-- - STRICTLY ZERO function EXECUTE privilege broadening
-- - STRICTLY ZERO RLS weakening (NO BYPASSRLS)
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 1: Pre-Migration Fail-Closed Overlap Check
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_overlap_count INTEGER;
BEGIN
  SELECT count(*) INTO v_overlap_count
  FROM public.mandal_versions a
  JOIN public.mandal_versions b
    ON a.mandal_id = b.mandal_id
   AND a.id <> b.id
   AND a.valid_to IS NOT NULL
   AND b.valid_to IS NOT NULL
   AND daterange(a.valid_from, a.valid_to, '[)') && daterange(b.valid_from, b.valid_to, '[)');

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'PRE-MIGRATION INVARIANT VIOLATION: % overlapping closed historical mandal_version intervals detected in public.mandal_versions. Migration aborted.',
      v_overlap_count
      USING ERRCODE = '23P01';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Step 2: Replace Unconditional GiST with Historical Partial GiST Constraint
-- -----------------------------------------------------------------------------
ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_no_overlap;

ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_historical_no_overlap;

ALTER TABLE public.mandal_versions
  ADD CONSTRAINT uq_mandal_versions_historical_no_overlap
  EXCLUDE USING gist (
    mandal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
  WHERE (valid_to IS NOT NULL);

COMMENT ON CONSTRAINT uq_mandal_versions_historical_no_overlap ON public.mandal_versions IS
  'W014 Partitioned Historical Exclusion: Guarantees mutually disjoint validity intervals across all closed historical mandal versions (valid_to IS NOT NULL). Open-ended current/candidate versions are excluded from this index.';

-- -----------------------------------------------------------------------------
-- Step 3: Create Immediate Temporal Bounds Guard Trigger Function (Option A)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_version_temporal_bounds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_curr_valid_from DATE;
  v_overlapping_hist_id UUID;
  v_overlapping_hist_range DATERANGE;
BEGIN
  -- 0. Deterministic Mandal Immutability Invariant:
  -- mandal_versions.mandal_id is permanently bound to its anchor at insertion.
  -- Cross-mandal version reassignment is prohibited for all roles (including service_role).
  IF TG_OP = 'UPDATE' AND NEW.mandal_id IS DISTINCT FROM OLD.mandal_id THEN
    RAISE EXCEPTION 'IMMUTABILITY VIOLATION [ERR-W014-008]: mandal_versions.mandal_id cannot be modified after insertion (attempted mutation from % to %)',
      OLD.mandal_id, NEW.mandal_id
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  -- 1. Deterministic Per-Mandal Concurrency Serialization:
  -- Lock parent mandal anchor row to serialize concurrent writes on the same mandal.
  -- This is the identical anchor row locked by fn_transition_mandal_current_version().
  PERFORM 1
  FROM public.mandals
  WHERE id = NEW.mandal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MANDAL_NOT_FOUND [ERR-W014-001]: Referenced mandal % does not exist in public.mandals', NEW.mandal_id
      USING ERRCODE = '23503'; -- foreign_key_violation
  END IF;

  -- 2. Direction A: Closed historical interval inserted or modified (valid_to IS NOT NULL)
  -- Must NOT overlap the open-ended current version [current.valid_from, infinity)
  IF NEW.valid_to IS NOT NULL THEN
    SELECT mv.valid_from INTO v_curr_valid_from
    FROM public.mandal_versions mv
    WHERE mv.mandal_id = NEW.mandal_id
      AND mv.is_current = true
      AND mv.id <> NEW.id;

    IF FOUND AND v_curr_valid_from IS NOT NULL THEN
      IF daterange(NEW.valid_from, NEW.valid_to, '[)') && daterange(v_curr_valid_from, NULL, '[)') THEN
        RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: Closed historical interval [%, %) on mandal % overlaps active current version starting at %',
          NEW.valid_from, NEW.valid_to, NEW.mandal_id, v_curr_valid_from
          USING ERRCODE = '23P01'; -- exclusion_violation
      END IF;
    END IF;
  END IF;

  -- 3. Direction B: Current active version inserted or modified (is_current = true)
  -- Its open-ended interval [valid_from, infinity) must NOT overlap any closed historical interval
  IF NEW.is_current = true THEN
    SELECT h.id, daterange(h.valid_from, h.valid_to, '[)')
    INTO v_overlapping_hist_id, v_overlapping_hist_range
    FROM public.mandal_versions h
    WHERE h.mandal_id = NEW.mandal_id
      AND h.id <> NEW.id
      AND h.valid_to IS NOT NULL
      AND daterange(h.valid_from, h.valid_to, '[)') && daterange(NEW.valid_from, NULL, '[)')
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: Active current version starting at % on mandal % overlaps closed historical interval % (version %)',
        NEW.valid_from, NEW.mandal_id, v_overlapping_hist_range, v_overlapping_hist_id
        USING ERRCODE = '23P01'; -- exclusion_violation
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Step 4: Register BEFORE ROW Trigger on public.mandal_versions
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds ON public.mandal_versions;
CREATE TRIGGER trg_guard_mandal_version_temporal_bounds
  BEFORE INSERT OR UPDATE OF mandal_id, valid_from, valid_to, is_current ON public.mandal_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_mandal_version_temporal_bounds();

-- -----------------------------------------------------------------------------
-- Step 5: Ownership and ACL Boundary for fn_guard_mandal_version_temporal_bounds
-- -----------------------------------------------------------------------------
GRANT panin_boundary_definer TO CURRENT_USER;
GRANT CREATE ON SCHEMA public TO panin_boundary_definer;

ALTER FUNCTION public.fn_guard_mandal_version_temporal_bounds() 
  OWNER TO panin_boundary_definer;

REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;

REVOKE ALL ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() FROM anon;
REVOKE ALL ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() TO panin_boundary_admin;

REVOKE panin_boundary_definer FROM CURRENT_USER;

-- -----------------------------------------------------------------------------
-- Step 6: Harden Anchor Trigger Function fn_guard_mandal_current_version
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_current_version()
RETURNS TRIGGER AS $$
DECLARE
  v_dataset_status TEXT;
  v_valid_from DATE;
BEGIN
  IF NEW.current_version_id IS NOT NULL THEN
    -- Verify version exists, belongs to same anchor, and is active
    SELECT dv.default_status, mv.valid_from
    INTO v_dataset_status, v_valid_from
    FROM public.mandal_versions mv
    JOIN public.dataset_versions dv ON mv.primary_dataset_version_id = dv.id
    WHERE mv.id = NEW.current_version_id
      AND mv.mandal_id = NEW.id
      AND mv.is_current = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INTEGRITY VIOLATION [ERR-W014-001]: mandals.current_version_id (%) must reference an active version (is_current = true) belonging to mandal %',
        NEW.current_version_id, NEW.id
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    -- Verify version belongs to an OFFICIAL dataset
    IF v_dataset_status <> 'OFFICIAL' THEN
      RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: mandals.current_version_id (%) references dataset version with status "%". Canonical pointer requires W012 "OFFICIAL" authority.',
        NEW.current_version_id, v_dataset_status
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    -- Verify current [valid_from, infinity) does not overlap any closed historical interval
    IF EXISTS (
      SELECT 1
      FROM public.mandal_versions h
      WHERE h.mandal_id = NEW.id
        AND h.id <> NEW.current_version_id
        AND h.valid_to IS NOT NULL
        AND daterange(h.valid_from, h.valid_to, '[)') && daterange(v_valid_from, NULL, '[)')
    ) THEN
      RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: mandals.current_version_id (%) active interval [%, infinity) overlaps a closed historical interval in public.mandal_versions.',
        NEW.current_version_id, v_valid_from
        USING ERRCODE = '23P01'; -- exclusion_violation
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
