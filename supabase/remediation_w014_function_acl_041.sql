-- ============================================================================
-- W014 REMEDIATION PACKAGE: TRANSITION FUNCTION ACL RECONCILIATION
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Defect: Check 22 failure (DEF-W014-041-ACL-ORDERING)
-- Root Cause: Premature REVOKE panin_boundary_definer FROM CURRENT_USER prior to REVOKE/GRANT ON FUNCTION
-- Invariant: PUBLIC=NO EXECUTE, anon=NO EXECUTE, authenticated=NO EXECUTE,
--            service_role=EXECUTE, panin_boundary_admin=EXECUTE
-- ============================================================================

BEGIN;

-- 1. Temporarily grant panin_boundary_definer to CURRENT_USER to establish object-owner grant authority
GRANT panin_boundary_definer TO CURRENT_USER;

-- 2. Explicit Declarative ACL Configuration
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO panin_boundary_admin;

-- 3. Revoke temporary role membership strictly after ACL configuration
REVOKE panin_boundary_definer FROM CURRENT_USER;

COMMIT;
