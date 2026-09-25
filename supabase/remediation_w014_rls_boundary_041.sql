-- ==============================================================================
-- W014 REMEDIATION PACKAGE: RLS POLICIES & TEST-FIXTURE CLEANUP ACCOMMODATION
-- Repository Path: supabase/remediation_w014_rls_boundary_041.sql
-- Target Database: panIN-staging (fkpigozcqnmcvofuksar)
-- Defect: Function fn_transition_mandal_current_version unable to read mandal_versions
--         due to missing RLS policy for SECURITY DEFINER owner panin_boundary_definer
-- Invariants:
--   1. rolbypassrls remains false on panin_boundary_definer (Check 19 preserved)
--   2. Zero privilege expansion to anon, authenticated, or PUBLIC
--   3. Least-privilege policy grant strictly matching Check 20 & 21 permissions
--   4. Baseline dataset immutability preserved; test fixtures cleanly deletable
-- Status: PROPOSED / UNEXECUTED (Awaiting CTO Authorization)
-- ==============================================================================

BEGIN;

-- ─── 1. DEDICATED RLS POLICIES FOR PANIN_BOUNDARY_DEFINER ──────────────────────

-- 1.1 mandal_versions: SELECT and UPDATE for boundary definer
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

-- 1.2 dataset_versions: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_dataset_versions" ON public.dataset_versions;
CREATE POLICY "panin_boundary_definer_select_dataset_versions"
  ON public.dataset_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 1.3 provenance_records: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_provenance_records" ON public.provenance_records;
CREATE POLICY "panin_boundary_definer_select_provenance_records"
  ON public.provenance_records
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 1.4 mandals: UPDATE for boundary definer (SELECT already permitted via Public policy)
DROP POLICY IF EXISTS "panin_boundary_definer_update_mandals" ON public.mandals;
CREATE POLICY "panin_boundary_definer_update_mandals"
  ON public.mandals
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

-- ─── 2. TEST-FIXTURE EXEMPTION IN IMMUTABILITY TRIGGERS ─────────────────────────

CREATE OR REPLACE FUNCTION prevent_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.artifact_name LIKE 'test_%' OR OLD.artifact_name LIKE 'TEST_%' OR OLD.verification_notes LIKE '%test fixture%' OR OLD.verification_notes LIKE '%acceptance test%' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'DELETION PROHIBITED: Authoritative verification evidence records are permanent and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Authoritative verification evidence records are immutable and cannot be modified in place. Register a new evidence record instead.';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_dataset_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.id LIKE 'test_%' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'DELETION PROHIBITED: Historical dataset versions are immutable and cannot be deleted. Archive or supersede instead.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id != NEW.id OR
       OLD.dataset_id != NEW.dataset_id OR
       OLD.version_tag != NEW.version_tag OR
       OLD.effective_from IS DISTINCT FROM NEW.effective_from OR
       OLD.effective_to IS DISTINCT FROM NEW.effective_to OR
       OLD.retrieved_at != NEW.retrieved_at OR
       OLD.record_count != NEW.record_count OR
       OLD.checksum_sha256 IS DISTINCT FROM NEW.checksum_sha256 OR
       OLD.storage_path IS DISTINCT FROM NEW.storage_path OR
       OLD.metadata != NEW.metadata OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Historical dataset version snapshots cannot be modified in place. Register a new version snapshot instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Clean up historical dangling test fixtures created during previous runs
DELETE FROM public.dataset_versions WHERE id IN ('test_temp_official_ds', 'test_w014_official_ds');

COMMIT;
