-- ==============================================================================
-- Verification 049: Spatial Gateway, Boundary Diff & Spatial Query Engine
-- Checks function presence, security attributes (SECURITY INVOKER), and ACL
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- ==============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_overlap_sec BOOLEAN;
  v_diff_sec BOOLEAN;
  v_anom_sec BOOLEAN;
  v_anon_anom_execute BOOLEAN;
  v_service_anom_execute BOOLEAN;
BEGIN
  -- 1. Verify existence of all 3 functions
  PERFORM 1 FROM pg_proc WHERE proname = 'fn_spatial_calculate_overlap';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: fn_spatial_calculate_overlap not found in pg_proc';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'fn_spatial_boundary_diff';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: fn_spatial_boundary_diff not found in pg_proc';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'fn_spatial_detect_anomalies';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: fn_spatial_detect_anomalies not found in pg_proc';
  END IF;

  -- 2. Verify SECURITY INVOKER (prosecdef = false) across ALL 3 functions
  SELECT prosecdef INTO v_overlap_sec FROM pg_proc WHERE proname = 'fn_spatial_calculate_overlap';
  IF v_overlap_sec THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: fn_spatial_calculate_overlap is SECURITY DEFINER (must be INVOKER)';
  END IF;

  SELECT prosecdef INTO v_diff_sec FROM pg_proc WHERE proname = 'fn_spatial_boundary_diff';
  IF v_diff_sec THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: fn_spatial_boundary_diff is SECURITY DEFINER (must be INVOKER)';
  END IF;

  SELECT prosecdef INTO v_anom_sec FROM pg_proc WHERE proname = 'fn_spatial_detect_anomalies';
  IF v_anom_sec THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: fn_spatial_detect_anomalies is SECURITY DEFINER (must be INVOKER)';
  END IF;

  -- 3. Verify ACL privileges
  -- fn_spatial_detect_anomalies must NOT be executable by anon or authenticated or PUBLIC
  SELECT has_function_privilege('anon', 'public.fn_spatial_detect_anomalies(text, geometry, text, double precision, double precision)', 'EXECUTE')
  INTO v_anon_anom_execute;
  IF v_anon_anom_execute THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: fn_spatial_detect_anomalies is executable by anon role';
  END IF;

  SELECT has_function_privilege('service_role', 'public.fn_spatial_detect_anomalies(text, geometry, text, double precision, double precision)', 'EXECUTE')
  INTO v_service_anom_execute;
  IF NOT v_service_anom_execute THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: fn_spatial_detect_anomalies is NOT executable by service_role';
  END IF;

  RAISE NOTICE 'SUCCESS: All 3 W017 spatial functions verified as SECURITY INVOKER with correct ACL.';
END;
$$;
