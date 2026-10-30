-- Migration 080: Domain 7 — Developer Platform, Public Web Discovery, SEO & Embeds, Universal Analytics & Product Dashboard
-- Authority: Master Product Blueprint (Jobs 062–066), DEC-188, DEC-189
-- Governing Standards: Representation of the People Act 1951 (Section 127A), Digital Personal Data Protection Act 2023 (DPDP), OpenAPI 3.1

-- 1. DEVELOPER ORGANIZATIONS (JOB 062)
CREATE TABLE IF NOT EXISTS public.developer_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  billing_email TEXT NOT NULL,
  billing_status TEXT NOT NULL DEFAULT 'active' CHECK (billing_status IN ('active', 'past_due', 'canceled')),
  website_url TEXT,
  logo_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DEVELOPER ORGANIZATION MEMBERS (JOB 062 RBAC)
CREATE TABLE IF NOT EXISTS public.developer_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.developer_organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'billing', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_developer_org_member UNIQUE (organization_id, user_id)
);

-- 3. DEVELOPER API KEYS (JOB 062)
CREATE TABLE IF NOT EXISTS public.developer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.developer_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:geography']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'compromised')),
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  monthly_quota INT NOT NULL DEFAULT 10000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DEVELOPER API USAGE LEDGER (JOB 062)
CREATE TABLE IF NOT EXISTS public.developer_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.developer_organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.developer_api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  ip_hash TEXT,
  hour_bucket TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. UNIVERSAL ANALYTICS EVENTS (JOB 065 - Canonical 10-Field Event Schema)
CREATE TABLE IF NOT EXISTS public.universal_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id TEXT,
  anonymous_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  screen TEXT NOT NULL,
  geography JSONB NOT NULL DEFAULT '{}'::JSONB,
  entity JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  app_version TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_dev_orgs_slug ON public.developer_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_dev_keys_hash ON public.developer_api_keys(key_hash) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dev_keys_org ON public.developer_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_dev_usage_org_bucket ON public.developer_usage_ledger(organization_id, hour_bucket);
CREATE INDEX IF NOT EXISTS idx_dev_usage_key ON public.developer_usage_ledger(api_key_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_name_ts ON public.universal_analytics_events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.universal_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.universal_analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_geo_ac ON public.universal_analytics_events USING gin (geography);
CREATE INDEX IF NOT EXISTS idx_analytics_entity ON public.universal_analytics_events USING gin (entity);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.developer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'developer_organizations' AND policyname = 'service_role_all_developer_organizations') THEN
    CREATE POLICY "service_role_all_developer_organizations" ON public.developer_organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'developer_organization_members' AND policyname = 'service_role_all_developer_organization_members') THEN
    CREATE POLICY "service_role_all_developer_organization_members" ON public.developer_organization_members FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'developer_api_keys' AND policyname = 'service_role_all_developer_api_keys') THEN
    CREATE POLICY "service_role_all_developer_api_keys" ON public.developer_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'developer_usage_ledger' AND policyname = 'service_role_all_developer_usage_ledger') THEN
    CREATE POLICY "service_role_all_developer_usage_ledger" ON public.developer_usage_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'universal_analytics_events' AND policyname = 'service_role_all_universal_analytics_events') THEN
    CREATE POLICY "service_role_all_universal_analytics_events" ON public.universal_analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
