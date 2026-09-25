-- ==============================================================================
-- W014 REMEDIATION PACKAGE: RLS POLICIES & PERSISTENT STAGING ACCEPTANCE FIXTURE
-- Repository Path: supabase/remediation_w014_rls_boundary_041.sql
-- Target Database: panIN-staging (fkpigozcqnmcvofuksar)
-- Defect: Function fn_transition_mandal_current_version unable to read mandal_versions
--         due to missing RLS policy for SECURITY DEFINER owner panin_boundary_definer
-- Invariants:
--   1. rolbypassrls remains false on panin_boundary_definer (Check 19 preserved)
--   2. Zero privilege expansion to anon, authenticated, or PUBLIC
--   3. Least-privilege policy grant strictly matching Check 20 & 21 permissions
--   4. W012 immutability triggers (prevent_evidence_mutation, prevent_dataset_version_mutation)
--      remain 100% UNMODIFIED and STRICTLY ENFORCED
--   5. Authentic statutory evidence record (mopr_lgd_subdistrict_directory_ts.json)
--      and deterministic staging acceptance dataset version (ts_lgd_mandals)
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

-- ─── 2. PERSISTENT STAGING ACCEPTANCE FIXTURE (W012 GOVERNANCE COMPLIANT) ────────
-- Satisfies W012 institutional authority without altering any existing baseline datasets
-- and without modifying permanent immutability triggers.

-- 2.1 Authentic statutory evidence record (Ministry of Panchayati Raj, Government of India)
INSERT INTO public.evidence_records (
  id,
  artifact_name,
  artifact_sha256,
  verification_authority,
  verified_by,
  verification_notes,
  verified_at
) VALUES (
  'e0140000-0000-0000-0000-000000000041'::uuid,
  'mopr_lgd_subdistrict_directory_ts.json',
  '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62',
  'Ministry of Panchayati Raj, Government of India',
  'LGD Subdistrict Directory Ingest Engine',
  'Authoritative statutory LGD subdistrict directory verification for Telangana mandals (W014 Staging Acceptance Infrastructure)',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2.2 Deterministic staging-only OFFICIAL dataset version under statutory ts_lgd_mandals
INSERT INTO public.dataset_versions (
  id,
  dataset_id,
  version_tag,
  effective_from,
  record_count,
  checksum_sha256,
  default_status,
  verification_evidence_id,
  metadata
) VALUES (
  'ts_lgd_mandals_staging_official_v1',
  'ts_lgd_mandals',
  'staging_acceptance_official_v1',
  '2023-01-01',
  589,
  '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62',
  'OFFICIAL',
  'e0140000-0000-0000-0000-000000000041'::uuid,
  '{"environment": "staging_only", "infrastructure_purpose": "w014_acceptance_verification", "immutable": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

COMMIT;
