-- ==============================================================================
-- staging_migration_package_057.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Forward Remediation Migration 057 Package
-- Authority: CTO REMEDIATION DIRECTIVE — FINAL MIGRATION PROVENANCE REMEDIATION
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ─── 0. PRE-CHECK ASSERTIONS ──────────────────────────────────────────────────
DO $$
DECLARE
  v_tbl_count INTEGER;
BEGIN
  SELECT count(*) INTO v_tbl_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger');

  IF v_tbl_count <> 4 THEN
    RAISE EXCEPTION '[MIGRATION 057] PRE-CHECK FAILED: Migration 056 prerequisite tables missing (found %)', v_tbl_count;
  END IF;

  RAISE NOTICE '[MIGRATION 057] PRE-CHECK: Verified all 4 prerequisite SaaS tables exist.';
END $$;

-- ─── 1. COMPOSITE TENANT / APPLICATION INTEGRITY ──────────────────────────────
ALTER TABLE public.saas_api_keys
  DROP CONSTRAINT IF EXISTS fk_saas_api_keys_tenant_application;

ALTER TABLE public.saas_api_keys
  DROP CONSTRAINT IF EXISTS saas_api_keys_application_id_fkey;

ALTER TABLE public.saas_applications
  DROP CONSTRAINT IF EXISTS uq_saas_applications_tenant_app;

ALTER TABLE public.saas_applications
  ADD CONSTRAINT uq_saas_applications_tenant_app UNIQUE (tenant_id, id);

ALTER TABLE public.saas_api_keys
  ADD CONSTRAINT fk_saas_api_keys_tenant_application
    FOREIGN KEY (tenant_id, application_id)
    REFERENCES public.saas_applications(tenant_id, id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_saas_api_keys_app
  ON public.saas_api_keys(application_id);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 057] STEP 1: Composite foreign key fk_saas_api_keys_tenant_application established.';
END $$;

-- ─── 2. USAGE LEDGER NULL UNIQUENESS ──────────────────────────────────────────
ALTER TABLE public.saas_usage_ledger
  DROP CONSTRAINT IF EXISTS uq_saas_usage_bucket;

ALTER TABLE public.saas_usage_ledger
  ADD CONSTRAINT uq_saas_usage_bucket
    UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 057] STEP 2: uq_saas_usage_bucket updated to UNIQUE NULLS NOT DISTINCT.';
END $$;

-- ─── 3. AUDIT FIELD revoked_at & LIFECYCLE CHECK CONSTRAINT ───────────────────
ALTER TABLE public.saas_api_keys
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.saas_api_keys
  DROP CONSTRAINT IF EXISTS chk_saas_api_keys_revoked_at;

ALTER TABLE public.saas_api_keys
  ADD CONSTRAINT chk_saas_api_keys_revoked_at CHECK (
    (status = 'active' AND revoked_at IS NULL) OR
    (status IN ('revoked', 'compromised') AND revoked_at IS NOT NULL)
  );

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 057] STEP 3: revoked_at column and chk_saas_api_keys_revoked_at check constraint established.';
  RAISE NOTICE '[MIGRATION 057] SUCCESS: Forward remediation migration 057 applied successfully within transaction.';
END $$;

COMMIT;
