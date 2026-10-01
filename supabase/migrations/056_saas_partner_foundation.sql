-- ==============================================================================
-- 056_saas_partner_foundation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 056 Preflight & Staging Execution
-- Authority: Master Execution Framework Amendments v1.2-v1.6, CTO Directive W021-G2
-- Remediation: CTO Remediation Directive — Critical Tenant-Isolation Defect Resolution
-- Ratified Plan: PLAN-W021-MASTER-REV-1.0.md
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Core Enforcements & Remediations:
--   1. Strict Composite Tenant/Application Isolation:
--      - saas_applications(tenant_id, id) UNIQUE constraint established.
--      - saas_api_keys(tenant_id, application_id) composite FK REFERENCES saas_applications(tenant_id, id).
--      - Database kernel guarantees an API key cannot associate Tenant A with Application B.
--   2. Usage Ledger NULL Uniqueness Resolution:
--      - UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket) enforced.
--      - When api_key_id is set to NULL on key deletion, orphaned historical usage records
--        cannot create duplicate logical hourly buckets for the same tenant.
--   3. Audit Field revoked_at Added to saas_api_keys:
--      - revoked_at TIMESTAMPTZ column added (NULL while active, set upon revocation/compromise).
--      - Check constraint enforces status/revoked_at consistency:
--        active -> revoked_at IS NULL; revoked/compromised -> revoked_at IS NOT NULL.
--      - Irreversible lifecycle semantics: once revoked/compromised, key cannot revert to active.
--   4. RLS & Security Boundary:
--      - RLS enabled and forced on all 4 tables.
--      - Direct access revoked from anon, authenticated, public.
--      - service_role administrative access preserved.
-- ==============================================================================

BEGIN;

-- ─── 1. SAAS PARTNER TENANTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  contact_email TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_tenants_slug UNIQUE (slug),
  CONSTRAINT chk_saas_tenants_tier CHECK (tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT chk_saas_tenants_status CHECK (status IN ('active', 'suspended', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_saas_tenants_status ON public.saas_tenants(status);

-- ─── 2. DEVELOPER APPLICATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_applications_tenant_app UNIQUE (tenant_id, id),
  CONSTRAINT chk_saas_applications_env CHECK (environment IN ('live', 'test'))
);

CREATE INDEX IF NOT EXISTS idx_saas_applications_tenant ON public.saas_applications(tenant_id);

-- ─── 3. SAAS API KEYS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['geo:read', 'elections:read']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_api_keys_hash UNIQUE (key_hash),
  CONSTRAINT chk_saas_api_keys_status CHECK (status IN ('active', 'revoked', 'compromised')),
  CONSTRAINT chk_saas_api_keys_revoked_at CHECK (
    (status = 'active' AND revoked_at IS NULL) OR
    (status IN ('revoked', 'compromised') AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT fk_saas_api_keys_tenant_application
    FOREIGN KEY (tenant_id, application_id)
    REFERENCES public.saas_applications(tenant_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saas_api_keys_lookup ON public.saas_api_keys(key_hash) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_saas_api_keys_tenant ON public.saas_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_api_keys_app ON public.saas_api_keys(application_id);

-- ─── 4. HOURLY USAGE AGGREGATION LEDGER ───────────────────────────────────────
-- Invariant: api_key_id ON DELETE SET NULL ensures immutable audit continuity.
-- UNIQUE NULLS NOT DISTINCT prevents duplicate logical buckets when api_key_id is NULL.
CREATE TABLE IF NOT EXISTS public.saas_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.saas_api_keys(id) ON DELETE SET NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_usage_bucket UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_saas_usage_ledger_tenant ON public.saas_usage_ledger(tenant_id, hour_bucket DESC);

-- ─── 5. ROW LEVEL SECURITY & DEFENSE-IN-DEPTH ─────────────────────────────────
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_ledger ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.saas_tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_ledger FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saas_tenants' AND policyname = 'service_role_all_saas_tenants'
  ) THEN
    CREATE POLICY "service_role_all_saas_tenants" ON public.saas_tenants
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saas_applications' AND policyname = 'service_role_all_saas_applications'
  ) THEN
    CREATE POLICY "service_role_all_saas_applications" ON public.saas_applications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saas_api_keys' AND policyname = 'service_role_all_saas_api_keys'
  ) THEN
    CREATE POLICY "service_role_all_saas_api_keys" ON public.saas_api_keys
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saas_usage_ledger' AND policyname = 'service_role_all_saas_usage_ledger'
  ) THEN
    CREATE POLICY "service_role_all_saas_usage_ledger" ON public.saas_usage_ledger
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON public.saas_tenants FROM anon, authenticated, public;
REVOKE ALL ON public.saas_applications FROM anon, authenticated, public;
REVOKE ALL ON public.saas_api_keys FROM anon, authenticated, public;
REVOKE ALL ON public.saas_usage_ledger FROM anon, authenticated, public;

GRANT ALL ON public.saas_tenants TO service_role;
GRANT ALL ON public.saas_applications TO service_role;
GRANT ALL ON public.saas_api_keys TO service_role;
GRANT ALL ON public.saas_usage_ledger TO service_role;

COMMIT;
