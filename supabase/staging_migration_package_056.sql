-- ==============================================================================
-- staging_migration_package_056.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 056 Preflight & Staging Execution
-- Authority: Master Execution Framework Amendments v1.2-v1.6, CTO Directive W021-G2
-- Ratified Plan: PLAN-W021-MASTER-REV-1.0.md (Commit dcc9f22)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ─── 0. PRE-CHECK ASSERTIONS ──────────────────────────────────────────────────
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  -- Verify that none of the 4 target tables exist in the public schema prior to application
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger');

  RAISE NOTICE '[MIGRATION 056] PRE-CHECK: Existing target tables count = %', v_table_count;

  IF v_table_count > 0 THEN
    RAISE NOTICE '[MIGRATION 056] PRE-CHECK NOTICE: Some target tables already exist; idempotency checks will apply.';
  END IF;
END $$;

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

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 056] STEP 1: Created public.saas_tenants table and status index';
END $$;

-- ─── 2. DEVELOPER APPLICATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_saas_applications_env CHECK (environment IN ('live', 'test'))
);

CREATE INDEX IF NOT EXISTS idx_saas_applications_tenant ON public.saas_applications(tenant_id);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 056] STEP 2: Created public.saas_applications table and tenant index';
END $$;

-- ─── 3. SAAS API KEYS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.saas_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['geo:read', 'elections:read']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_api_keys_hash UNIQUE (key_hash),
  CONSTRAINT chk_saas_api_keys_status CHECK (status IN ('active', 'revoked', 'compromised'))
);

CREATE INDEX IF NOT EXISTS idx_saas_api_keys_lookup ON public.saas_api_keys(key_hash) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_saas_api_keys_tenant ON public.saas_api_keys(tenant_id);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 056] STEP 3: Created public.saas_api_keys table and active lookup index';
END $$;

-- ─── 4. HOURLY USAGE AGGREGATION LEDGER ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saas_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.saas_api_keys(id) ON DELETE SET NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_usage_bucket UNIQUE (tenant_id, api_key_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_saas_usage_ledger_tenant ON public.saas_usage_ledger(tenant_id, hour_bucket DESC);

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 056] STEP 4: Created public.saas_usage_ledger with ON DELETE SET NULL retention';
END $$;

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

DO $$
BEGIN
  RAISE NOTICE '[MIGRATION 056] STEP 5: Row Level Security enabled, forced, policies created, and privileges restricted';
  RAISE NOTICE '[MIGRATION 056] SUCCESS: Migration 056 staging package applied successfully within transaction.';
END $$;

COMMIT;
