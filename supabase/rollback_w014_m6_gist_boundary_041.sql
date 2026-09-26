-- ==============================================================================
-- W014: MIGRATION ROLLBACK — REVERT PARTITIONED GIST & BOUNDARY TRIGGER
-- File: supabase/rollback_w014_m6_gist_boundary_041.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Status: PREPARED / UNEXECUTED — REQUIRES EXPLICIT CTO AUTHORIZATION
--
-- PURPOSE:
-- 1. Pre-rollback assertion: Fail closed if multiple open-ended versions exist on any mandal,
--    as unconditional GiST exclusion would immediately fail to build.
-- 2. Drop `trg_guard_mandal_version_temporal_bounds` on public.mandal_versions.
-- 3. Drop `fn_guard_mandal_version_temporal_bounds()`.
-- 4. Drop partitioned historical constraint `uq_mandal_versions_historical_no_overlap`.
-- 5. Re-create original Migration 041 unconditional exclusion constraint `uq_mandal_versions_no_overlap`:
--      EXCLUDE USING gist (
--        mandal_id WITH =,
--        (daterange(valid_from, valid_to, '[)')) WITH &&
--      );
-- 6. Revert `fn_guard_mandal_current_version` to original Migration 041 definition.
-- NOTE: `fn_transition_mandal_current_version` was untouched by M6 and remains untouched by rollback.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 1: Pre-Rollback Fail-Closed Check
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_multiple_open_ended INTEGER;
BEGIN
  SELECT count(*) INTO v_multiple_open_ended
  FROM (
    SELECT mandal_id
    FROM public.mandal_versions
    WHERE valid_to IS NULL
    GROUP BY mandal_id
    HAVING count(*) > 1
  ) sub;

  IF v_multiple_open_ended > 0 THEN
    RAISE EXCEPTION 'PRE-ROLLBACK INVARIANT VIOLATION: % mandals have multiple open-ended versions (valid_to IS NULL). Unconditional GiST exclusion cannot be restored until excess open-ended versions are removed.',
      v_multiple_open_ended
      USING ERRCODE = '23P01';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Step 2: Drop Temporal Bounds Guard Trigger and Function (Option A Removals)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds ON public.mandal_versions;
DROP FUNCTION IF EXISTS public.fn_guard_mandal_version_temporal_bounds();

-- -----------------------------------------------------------------------------
-- Step 3: Revert Constraint to Unconditional GiST Exclusion
-- -----------------------------------------------------------------------------
ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_historical_no_overlap;

ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_no_overlap;

ALTER TABLE public.mandal_versions
  ADD CONSTRAINT uq_mandal_versions_no_overlap
  EXCLUDE USING gist (
    mandal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  );

COMMENT ON CONSTRAINT uq_mandal_versions_no_overlap ON public.mandal_versions IS
  'Temporal non-overlapping interval exclusion (Migration 041 Unconditional Baseline)';

-- -----------------------------------------------------------------------------
-- Step 4: Revert Trigger Function fn_guard_mandal_current_version
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_current_version()
RETURNS TRIGGER AS $$
DECLARE
  v_dataset_status TEXT;
BEGIN
  IF NEW.current_version_id IS NOT NULL THEN
    SELECT dv.default_status INTO v_dataset_status
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

    IF v_dataset_status <> 'OFFICIAL' THEN
      RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: mandals.current_version_id (%) references dataset version with status "%". Canonical pointer requires W012 "OFFICIAL" authority.',
        NEW.current_version_id, v_dataset_status
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

