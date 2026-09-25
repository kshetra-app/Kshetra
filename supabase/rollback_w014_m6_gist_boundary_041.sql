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
-- 7. Revert `fn_transition_mandal_current_version` to original Migration 041 definition.
-- 8. Preserve function ownership and strict ACL boundary.
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

-- -----------------------------------------------------------------------------
-- Step 5: Revert Transition Function fn_transition_mandal_current_version
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version(
  p_mandal_id TEXT,
  p_new_version_id UUID,
  p_effective_date DATE,
  p_operator TEXT,
  p_provenance_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_version_id UUID;
  v_new_mandal_id TEXT;
  v_new_valid_to DATE;
  v_dataset_status TEXT;
BEGIN
  -- 1. Narrow Provenance Existence Check: If provided, assert valid provenance record existence
  IF p_provenance_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.provenance_records pr WHERE pr.id = p_provenance_id
    ) THEN
      RAISE EXCEPTION 'PROVENANCE NOT FOUND [ERR-W014-005]: Specified provenance_id % does not exist in public.provenance_records',
        p_provenance_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- 2. Lock the anchor row to serialize concurrent transitions
  SELECT current_version_id INTO v_old_version_id
  FROM public.mandals
  WHERE id = p_mandal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MANDAL_NOT_FOUND: Mandal % does not exist', p_mandal_id
      USING ERRCODE = '23503';
  END IF;

  -- 3. Validate target new version exists, fetch properties and dataset status
  SELECT mv.mandal_id, mv.valid_to, dv.default_status
  INTO v_new_mandal_id, v_new_valid_to, v_dataset_status
  FROM public.mandal_versions mv
  JOIN public.dataset_versions dv ON mv.primary_dataset_version_id = dv.id
  WHERE mv.id = p_new_version_id
  FOR UPDATE OF mv;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_NOT_FOUND: mandal_version % does not exist', p_new_version_id
      USING ERRCODE = '23503';
  END IF;

  -- 4. Assert same-anchor ownership
  IF v_new_mandal_id <> p_mandal_id THEN
    RAISE EXCEPTION 'ANCHOR_MISMATCH [ERR-W014-004]: mandal_version % belongs to mandal %, not %',
      p_new_version_id, v_new_mandal_id, p_mandal_id
      USING ERRCODE = '23503';
  END IF;

  -- 5. Assert target version belongs to an OFFICIAL dataset (W012 Authority Boundary)
  IF v_dataset_status <> 'OFFICIAL' THEN
    RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: Cannot promote mandal_version % to current legal truth. Dataset status is "%", but W014 requires "OFFICIAL".',
      p_new_version_id, v_dataset_status
      USING ERRCODE = '23514';
  END IF;

  -- 6. Assert target version represents an open-ended interval
  IF v_new_valid_to IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_VALIDITY_INTERVAL: Target mandal_version % has valid_to = %. Active current version must be open-ended (valid_to IS NULL).',
      p_new_version_id, v_new_valid_to
      USING ERRCODE = '23514';
  END IF;

  -- 7. No-op short circuit
  IF v_old_version_id = p_new_version_id THEN
    RETURN jsonb_build_object(
      'status', 'NO_OP',
      'mandal_id', p_mandal_id,
      'current_version_id', p_new_version_id,
      'message', 'Version is already current'
    );
  END IF;

  -- 8. Retire currently active version (if present)
  IF v_old_version_id IS NOT NULL THEN
    UPDATE public.mandal_versions
    SET is_current = false,
        valid_to = p_effective_date,
        updated_at = now()
    WHERE id = v_old_version_id;
  END IF;

  -- 9. Activate new version
  UPDATE public.mandal_versions
  SET is_current = true,
      valid_from = COALESCE(p_effective_date, valid_from),
      valid_to = NULL,
      updated_at = now()
  WHERE id = p_new_version_id;

  -- 10. Point anchor to new version
  UPDATE public.mandals
  SET current_version_id = p_new_version_id,
      updated_at = now()
  WHERE id = p_mandal_id;

  -- 11. Return structured audit receipt
  RETURN jsonb_build_object(
    'status', 'TRANSITION_COMPLETE',
    'mandal_id', p_mandal_id,
    'previous_version_id', v_old_version_id,
    'current_version_id', p_new_version_id,
    'effective_date', p_effective_date,
    'session_user', SESSION_USER,
    'operator', p_operator,
    'provenance_id', p_provenance_id,
    'timestamp', now()
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Step 6: Exact Function Ownership & Least-Privilege ACL Boundary Preservation
-- -----------------------------------------------------------------------------
GRANT panin_boundary_definer TO CURRENT_USER;
GRANT CREATE ON SCHEMA public TO panin_boundary_definer;

ALTER FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) 
  OWNER TO panin_boundary_definer;

REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;

REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO panin_boundary_admin;

REVOKE panin_boundary_definer FROM CURRENT_USER;

COMMIT;
