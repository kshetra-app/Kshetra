-- ==============================================================================
-- W014 REMEDIATION PACKAGE: DEDICATED RLS POLICIES FOR PANIN_BOUNDARY_DEFINER
-- Repository Path: supabase/remediation_w014_rls_boundary_041.sql
-- Target Database: panIN-staging (fkpigozcqnmcvofuksar)
-- Defect: Function fn_transition_mandal_current_version unable to read mandal_versions
--         due to missing RLS policy for SECURITY DEFINER owner panin_boundary_definer
-- Invariants:
--   1. rolbypassrls remains false on panin_boundary_definer (Check 19 preserved)
--   2. Zero privilege expansion to anon, authenticated, or PUBLIC
--   3. Least-privilege policy grant strictly matching Check 20 & 21 permissions
-- Status: PROPOSED / UNEXECUTED (Awaiting CTO Authorization)
-- ==============================================================================

BEGIN;

-- 1. public.mandal_versions: SELECT and UPDATE for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_mandal_versions" ON public.mandal_versions;
CREATE POLICY "panin_boundary_definer_select_mandal_versions"
  ON public.mandal_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

DROP POLICY IF EXISTS "panin_boundary_definer_update_mandal_versions" ON public.mandal_versions;
CREATE POLICY "panin_boundary_definer_update_mandal_versions"
  ON public.mandal_versions
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

-- 2. public.dataset_versions: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_dataset_versions" ON public.dataset_versions;
CREATE POLICY "panin_boundary_definer_select_dataset_versions"
  ON public.dataset_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 3. public.provenance_records: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_provenance_records" ON public.provenance_records;
CREATE POLICY "panin_boundary_definer_select_provenance_records"
  ON public.provenance_records
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 4. public.mandals: UPDATE for boundary definer (SELECT already permitted via Public policy)
DROP POLICY IF EXISTS "panin_boundary_definer_update_mandals" ON public.mandals;
CREATE POLICY "panin_boundary_definer_update_mandals"
  ON public.mandals
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

COMMIT;
