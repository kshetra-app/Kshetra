-- ==============================================================================
-- W014: MIGRATION REMEDIATION — PARTITIONED CANONICAL TIMELINE & GIST BOUNDARY
-- File: supabase/remediation_w014_m6_gist_boundary_041.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Status: PREPARED / UNEXECUTED — REQUIRES EXPLICIT CTO AUTHORIZATION
--
-- PURPOSE:
-- 1. Pre-migration assertion: Fail closed if overlapping closed historical intervals exist.
-- 2. Drop unconditional exclusion constraint `uq_mandal_versions_no_overlap`.
-- 3. Create partitioned historical exclusion constraint `uq_mandal_versions_historical_no_overlap`:
--      EXCLUDE USING gist (
--        mandal_id WITH =,
--        (daterange(valid_from, valid_to, '[)')) WITH &&
--      ) WHERE (valid_to IS NOT NULL);
-- 4. Harden `fn_transition_mandal_current_version`:
--      - Lock and read old version valid_from
--      - Enforce chronology guard: p_effective_date > v_old_valid_from (ERR-W014-007 / 22000)
--      - Enforce historical boundary non-overlap guard (ERR-W014-006 / 23P01)
--      - Preserve all authority, security definer, pinned search_path, ownership, and ACLs
-- 5. Harden `fn_guard_mandal_current_version`:
--      - Verify current [valid_from, infinity) does not overlap any closed historical interval (ERR-W014-006 / 23P01)
--      - Preserve OFFICIAL dataset authority check (ERR-W014-003 / 23514)
--      - Preserve same-mandal anchor check (ERR-W014-001 / 23514)
--
-- SECURITY / INVARIANT BOUNDS:
-- - STRICTLY ZERO table privilege broadening
-- - STRICTLY ZERO function EXECUTE privilege broadening
-- - STRICTLY ZERO RLS weakening (NO BYPASSRLS)
-- - Function ownership preserved to panin_boundary_definer
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
-- Step 3: Harden Trigger Function fn_guard_mandal_current_version
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

-- -----------------------------------------------------------------------------
-- Step 4: Harden Atomic Transition Function fn_transition_mandal_current_version
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
  v_old_valid_from DATE;
  v_new_mandal_id TEXT;
  v_new_valid_to DATE;
  v_dataset_status TEXT;
  v_max_hist_valid_to DATE;
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

  -- 3. If an active version exists, lock and read its valid_from
  IF v_old_version_id IS NOT NULL THEN
    SELECT mv.valid_from INTO v_old_valid_from
    FROM public.mandal_versions mv
    WHERE mv.id = v_old_version_id
    FOR UPDATE OF mv;
  END IF;

  -- 4. Validate target new version exists, fetch properties and dataset status
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

  -- 5. Assert same-anchor ownership
  IF v_new_mandal_id <> p_mandal_id THEN
    RAISE EXCEPTION 'ANCHOR_MISMATCH [ERR-W014-004]: mandal_version % belongs to mandal %, not %',
      p_new_version_id, v_new_mandal_id, p_mandal_id
      USING ERRCODE = '23503';
  END IF;

  -- 6. Assert target version belongs to an OFFICIAL dataset (W012 Authority Boundary)
  IF v_dataset_status <> 'OFFICIAL' THEN
    RAISE EXCEPTION 'AUTHORITY VIOLATION [ERR-W014-003]: Cannot promote mandal_version % to current legal truth. Dataset status is "%", but W014 requires "OFFICIAL".',
      p_new_version_id, v_dataset_status
      USING ERRCODE = '23514';
  END IF;

  -- 7. Assert target version represents an open-ended interval
  IF v_new_valid_to IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_VALIDITY_INTERVAL: Target mandal_version % has valid_to = %. Active current version must be open-ended (valid_to IS NULL).',
      p_new_version_id, v_new_valid_to
      USING ERRCODE = '23514';
  END IF;

  -- 8. No-op short circuit
  IF v_old_version_id = p_new_version_id THEN
    RETURN jsonb_build_object(
      'status', 'NO_OP',
      'mandal_id', p_mandal_id,
      'current_version_id', p_new_version_id,
      'message', 'Version is already current'
    );
  END IF;

  -- 9. Concurrency & Chronology Guard: assert p_effective_date > v_old_valid_from
  IF v_old_version_id IS NOT NULL AND v_old_valid_from IS NOT NULL THEN
    IF p_effective_date <= v_old_valid_from THEN
      RAISE EXCEPTION 'CHRONOLOGY VIOLATION [ERR-W014-007]: Transition effective date % must be strictly after current version valid_from %',
        p_effective_date, v_old_valid_from
        USING ERRCODE = '22000'; -- data_exception / range boundary error
    END IF;
  END IF;

  -- 10. Historical Boundary Non-Overlap Guard:
  -- Assert that [p_effective_date, infinity) does not overlap any closed historical interval
  IF EXISTS (
    SELECT 1
    FROM public.mandal_versions h
    WHERE h.mandal_id = p_mandal_id
      AND h.id <> p_new_version_id
      AND h.valid_to IS NOT NULL
      AND daterange(h.valid_from, h.valid_to, '[)') && daterange(p_effective_date, NULL, '[)')
  ) THEN
    SELECT MAX(h.valid_to) INTO v_max_hist_valid_to
    FROM public.mandal_versions h
    WHERE h.mandal_id = p_mandal_id
      AND h.id <> p_new_version_id
      AND h.valid_to IS NOT NULL
      AND daterange(h.valid_from, h.valid_to, '[)') && daterange(p_effective_date, NULL, '[)');

    RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: Effective date % falls within historical validity interval ending at %',
      p_effective_date, v_max_hist_valid_to
      USING ERRCODE = '23P01'; -- exclusion_violation
  END IF;

  -- 11. Retire currently active version (if present)
  IF v_old_version_id IS NOT NULL THEN
    UPDATE public.mandal_versions
    SET is_current = false,
        valid_to = p_effective_date,
        updated_at = now()
    WHERE id = v_old_version_id;
  END IF;

  -- 12. Activate new version
  UPDATE public.mandal_versions
  SET is_current = true,
      valid_from = COALESCE(p_effective_date, valid_from),
      valid_to = NULL,
      updated_at = now()
  WHERE id = p_new_version_id;

  -- 13. Point anchor to new version
  UPDATE public.mandals
  SET current_version_id = p_new_version_id,
      updated_at = now()
  WHERE id = p_mandal_id;

  -- 14. Return structured audit receipt
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
-- Step 5: Exact Function Ownership & Least-Privilege ACL Boundary Preservation
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
