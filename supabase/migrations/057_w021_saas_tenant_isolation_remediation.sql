-- ==============================================================================
-- 057_w021_saas_tenant_isolation_remediation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Forward Remediation Migration
-- Authority: CTO REMEDIATION DIRECTIVE — FINAL MIGRATION PROVENANCE REMEDIATION
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Objectives (Forward Delta Over Historical Migration 056):
--   1. Establish Composite Tenant/Application Isolation:
--      - Add UNIQUE constraint on public.saas_applications(tenant_id, id).
--      - Drop legacy single-column FK on public.saas_api_keys(application_id).
--      - Add composite FK on public.saas_api_keys(tenant_id, application_id)
--        REFERENCES public.saas_applications(tenant_id, id) ON DELETE CASCADE.
--      - Creates idx_saas_api_keys_app on application_id.
--   2. Enforce Usage Ledger NULL Uniqueness:
--      - Drop legacy uq_saas_usage_bucket UNIQUE (tenant_id, api_key_id, hour_bucket).
--      - Add uq_saas_usage_bucket UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket).
--   3. Add Audit Column revoked_at & Enforce Audit Consistency:
--      - Add revoked_at TIMESTAMPTZ to public.saas_api_keys.
--      - Add check constraint chk_saas_api_keys_revoked_at enforcing that
--        status = 'active' requires revoked_at IS NULL, and
--        status IN ('revoked', 'compromised') requires revoked_at IS NOT NULL.
-- ==============================================================================

BEGIN;

-- ─── 1. COMPOSITE TENANT / APPLICATION INTEGRITY ──────────────────────────────
-- Step 1A: Enforce unique constraint on (tenant_id, id) in saas_applications
ALTER TABLE public.saas_applications
  ADD CONSTRAINT uq_saas_applications_tenant_app UNIQUE (tenant_id, id);

-- Step 1B: Drop single-column foreign key on application_id if present
ALTER TABLE public.saas_api_keys
  DROP CONSTRAINT IF EXISTS saas_api_keys_application_id_fkey;

-- Step 1C: Add composite foreign key from saas_api_keys to saas_applications
ALTER TABLE public.saas_api_keys
  ADD CONSTRAINT fk_saas_api_keys_tenant_application
    FOREIGN KEY (tenant_id, application_id)
    REFERENCES public.saas_applications(tenant_id, id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_saas_api_keys_app
  ON public.saas_api_keys(application_id);

-- ─── 2. USAGE LEDGER NULL UNIQUENESS ──────────────────────────────────────────
-- Drop legacy unique constraint that permitted duplicate NULL api_key_id buckets
ALTER TABLE public.saas_usage_ledger
  DROP CONSTRAINT IF EXISTS uq_saas_usage_bucket;

-- Add PostgreSQL 15+ standard constraint treating NULL as not distinct
ALTER TABLE public.saas_usage_ledger
  ADD CONSTRAINT uq_saas_usage_bucket
    UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket);

-- ─── 3. AUDIT FIELD revoked_at & LIFECYCLE CHECK CONSTRAINT ───────────────────
-- Add revoked_at audit column
ALTER TABLE public.saas_api_keys
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Enforce strict status <-> revoked_at consistency
ALTER TABLE public.saas_api_keys
  ADD CONSTRAINT chk_saas_api_keys_revoked_at CHECK (
    (status = 'active' AND revoked_at IS NULL) OR
    (status IN ('revoked', 'compromised') AND revoked_at IS NOT NULL)
  );

COMMIT;
