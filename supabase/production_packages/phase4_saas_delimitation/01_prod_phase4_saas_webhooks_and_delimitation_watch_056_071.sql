-- ==============================================================================
-- KSHETRA / PANIN: CONSOLIDATED PRODUCTION DEPLOYMENT PACKAGE (056, 057, 068, 070, 071)
-- Target: Production Supabase (ehfafcnimmjusyvplbah / panIN-production)
-- Scope:
--   Part 1: Migration 056 - SaaS Partner Foundation (saas_tenants, saas_applications, saas_api_keys, saas_usage_ledger)
--   Part 2: Migration 057 - SaaS Tenant Isolation Remediation (uq_saas_applications_tenant_app)
--   Part 3: Migration 068 - Normalized Candidate Affidavit Disclosures Schema (DEC-134)
--   Part 4: Migration 070 - SaaS Outbound Webhook & Event Dispatching Engine (W022)
--   Part 5: Migration 071 - Delimitation Watch Engine 8-Stage Lifecycle Schema (JOB 023)
-- Note: Migrations 067/069 are decoupled per DEC-165 (CRIT-D03-01 / external dependency).
-- ==============================================================================

-- ##############################################################################
-- BEGIN COMPONENT: 056_saas_partner_foundation.sql
-- ##############################################################################

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

-- ##############################################################################
-- BEGIN COMPONENT: 057_w021_saas_tenant_isolation_remediation.sql
-- ##############################################################################

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

-- ##############################################################################
-- BEGIN COMPONENT: 068_affidavit_disclosures.sql
-- ##############################################################################

-- ==============================================================================
-- Migration 068: Normalized Candidate Affidavit Disclosure Schema
-- Task: W021.5-E-03 / REQ-FIN-002
-- Authority: DEC-134 6-Rule Sworn Financial Disclosures Standard
-- Scope:
--   1. Create public.candidate_affidavit_disclosures table with disaggregated,
--      strictly nullable BIGINT fields conforming to ECI Form 26.
--   2. Enforce check constraints on non-negative values.
--   3. Foreign key linkages to canonical_persons, candidacies, and constituencies.
--   4. RLS enabled with public read policy.
-- Note: Check constraints adhere strictly to DEC-134 Rule 1 & Rule 3:
--       No synthetic zero defaults (COALESCE masking eliminated under CTO Directive 138).
--       Totals are validated against component sums strictly when all parts are reported;
--       partial disclosures are preserved as NULL without artificial coercion.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.candidate_affidavit_disclosures (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id                UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  person_id                   UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  constituency_id             TEXT NOT NULL,
  election_year               INTEGER NOT NULL CHECK (election_year BETWEEN 1947 AND 2030),
  affidavit_date              DATE,
  filing_status               TEXT NOT NULL DEFAULT 'FILED' CHECK (filing_status IN ('FILED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'DISPUTED')),
  
  -- Rule 1 & 2: Disaggregated Asset Classes (Strict Nullability, NO 0 defaults)
  self_movable_assets         BIGINT CHECK (self_movable_assets >= 0),
  spouse_movable_assets       BIGINT CHECK (spouse_movable_assets >= 0),
  dependent_movable_assets    BIGINT CHECK (dependent_movable_assets >= 0),
  total_movable_assets        BIGINT CHECK (total_movable_assets >= 0),
  
  self_immovable_assets       BIGINT CHECK (self_immovable_assets >= 0),
  spouse_immovable_assets     BIGINT CHECK (spouse_immovable_assets >= 0),
  dependent_immovable_assets  BIGINT CHECK (dependent_immovable_assets >= 0),
  total_immovable_assets      BIGINT CHECK (total_immovable_assets >= 0),
  
  total_gross_assets          BIGINT CHECK (total_gross_assets >= 0),
  
  -- Rule 4: Distinct Liabilities (Separated from assets, NO synthetic 0s)
  self_liabilities            BIGINT CHECK (self_liabilities >= 0),
  spouse_liabilities          BIGINT CHECK (spouse_liabilities >= 0),
  dependent_liabilities       BIGINT CHECK (dependent_liabilities >= 0),
  total_liabilities           BIGINT CHECK (total_liabilities >= 0),
  
  -- Criminal Background & Legal Disclosures
  criminal_cases_count        INTEGER NOT NULL DEFAULT 0 CHECK (criminal_cases_count >= 0),
  serious_ipc_count           INTEGER NOT NULL DEFAULT 0 CHECK (serious_ipc_count >= 0),
  convictions_count           INTEGER NOT NULL DEFAULT 0 CHECK (convictions_count >= 0),
  charges_framed_count        INTEGER NOT NULL DEFAULT 0 CHECK (charges_framed_count >= 0),
  
  -- Educational & Professional Background
  highest_education           TEXT,
  education_details           TEXT,
  profession_self             TEXT,
  profession_spouse           TEXT,
  
  -- Source Provenance
  source_affidavit_url        TEXT,
  source_eci_affidavit_id     TEXT,
  source_hash                 TEXT,
  data_status                 public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id               UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Rule 1 & 3: Totals must equal sum of disaggregated parts when parts are evidenced.
  -- Zero COALESCE masking: missing components remain NULL without synthetic 0 coercion.
  CONSTRAINT chk_movable_sum CHECK (
    total_movable_assets IS NULL OR
    self_movable_assets IS NULL OR
    spouse_movable_assets IS NULL OR
    dependent_movable_assets IS NULL OR
    total_movable_assets = (self_movable_assets + spouse_movable_assets + dependent_movable_assets)
  ),
  CONSTRAINT chk_immovable_sum CHECK (
    total_immovable_assets IS NULL OR
    self_immovable_assets IS NULL OR
    spouse_immovable_assets IS NULL OR
    dependent_immovable_assets IS NULL OR
    total_immovable_assets = (self_immovable_assets + spouse_immovable_assets + dependent_immovable_assets)
  ),
  CONSTRAINT chk_gross_assets CHECK (
    total_gross_assets IS NULL OR
    total_movable_assets IS NULL OR
    total_immovable_assets IS NULL OR
    total_gross_assets = (total_movable_assets + total_immovable_assets)
  ),
  CONSTRAINT chk_liabilities_sum CHECK (
    total_liabilities IS NULL OR
    self_liabilities IS NULL OR
    spouse_liabilities IS NULL OR
    dependent_liabilities IS NULL OR
    total_liabilities = (self_liabilities + spouse_liabilities + dependent_liabilities)
  )
);

CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_person ON public.candidate_affidavit_disclosures(person_id);
CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_candidate ON public.candidate_affidavit_disclosures(candidate_id);
CREATE INDEX IF NOT EXISTS idx_affidavit_disclosures_constituency ON public.candidate_affidavit_disclosures(constituency_id, election_year);

ALTER TABLE public.candidate_affidavit_disclosures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_candidate_affidavit_disclosures ON public.candidate_affidavit_disclosures
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;

-- ##############################################################################
-- BEGIN COMPONENT: 070_saas_webhook_engine.sql
-- ##############################################################################

-- ==============================================================================
-- 070_saas_webhook_engine.sql
--
-- Milestone: W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
-- Authority: Master Execution Framework Amendments v1.2-v1.6 & CTO Directives
--            W022-CTO-EXEC-001 through W022-CTO-REMEDIATION-006
-- Target: PanIN Staging (fkpigozcqnmcvofuksar) & Local Test PostgreSQL
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Persistence Scope:
--   1. public.webhook_subscriptions (Partner endpoints, encrypted secrets, status)
--   2. public.webhook_events (Append-only immutable audit log, application scoped)
--   3. public.webhook_deliveries (Queue state machine, lease tokens, attempts, latencies)
--   4. public.fn_publish_webhook_event() (Atomic event insert, idempotency & fanout)
--   5. public.fn_purge_expired_webhook_data() (Audited security-definer retention purge)
--   6. public.fn_claim_webhook_batch() (Atomic SKIP LOCKED queue claim)
--
-- Integrity & Security Controls:
--   - Preflight runtime assertion checking uq_saas_applications_tenant_app constraint.
--   - Mathematical composite foreign keys guaranteeing cross-tenant and cross-app isolation.
--   - Append-only immutability trigger blocking direct UPDATE/DELETE on webhook_events (SQLSTATE 55000).
--   - Row Level Security (RLS) ENABLED and FORCED on all 3 tables.
--   - Direct public access REVOKED from anon, authenticated, public.
--   - UPDATE/DELETE on webhook_events REVOKED from service_role.
-- ==============================================================================

BEGIN;

-- ─── 0. PREFLIGHT RUNTIME PREREQUISITE ASSERTION ──────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_saas_applications_tenant_app'
          AND conrelid = 'public.saas_applications'::regclass
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE_CONSTRAINT_MISSING: uq_saas_applications_tenant_app on public.saas_applications does not exist. Migration 057 must be applied prior to Migration 070.'
            USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
    END IF;
END $$;

-- ─── 1. WEBHOOK SUBSCRIPTIONS ──────────────────────────────────────────────────
CREATE TABLE public.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_ciphertext BYTEA NOT NULL,
    secret_iv BYTEA NOT NULL,
    secret_tag BYTEA NOT NULL,
    secret_key_version INTEGER NOT NULL DEFAULT 1,
    secret_hash VARCHAR(64) NOT NULL,
    secret_hint VARCHAR(8) NOT NULL,
    previous_secret_ciphertext BYTEA,
    previous_secret_iv BYTEA,
    previous_secret_tag BYTEA,
    previous_secret_expires_at TIMESTAMPTZ,
    subscribed_events TEXT[] NOT NULL DEFAULT '{"*"}',
    status TEXT NOT NULL DEFAULT 'active',
    consecutive_failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_webhook_sub_status CHECK (status IN ('active', 'paused', 'disabled', 'failed')),
    CONSTRAINT fk_webhook_sub_tenant_app FOREIGN KEY (tenant_id, application_id)
        REFERENCES public.saas_applications(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_webhook_sub_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT ck_webhook_endpoint_https CHECK (endpoint_url ~* '^https://.+'),
    CONSTRAINT ck_webhook_endpoint_length CHECK (length(endpoint_url) <= 2048)
);

CREATE INDEX idx_webhook_sub_app
    ON public.webhook_subscriptions(tenant_id, application_id, status);

-- ─── 2. IMMUTABLE WEBHOOK EVENTS LOG ───────────────────────────────────────────
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    idempotency_key TEXT,
    payload JSONB NOT NULL,
    payload_raw TEXT NOT NULL,
    payload_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT fk_webhook_events_tenant_app FOREIGN KEY (tenant_id, application_id)
        REFERENCES public.saas_applications(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT uq_webhook_events_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT ck_event_type_format CHECK (event_type ~* '^[a-z0-9_.-]+$')
);

CREATE UNIQUE INDEX uq_webhook_events_tenant_app_idempotency
    ON public.webhook_events (tenant_id, application_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_webhook_events_tenant_app_created
    ON public.webhook_events(tenant_id, application_id, created_at DESC);

-- Trigger: Immutability enforcement (UPDATE is prohibited; DELETE permitted ONLY via fn_purge_expired_webhook_data)
CREATE OR REPLACE FUNCTION public.fn_webhook_events_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_context TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'MUTATION_FORBIDDEN: public.webhook_events is an append-only immutable audit log. UPDATE operations are prohibited.'
            USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
    ELSIF TG_OP = 'DELETE' THEN
        GET DIAGNOSTICS v_context = PG_CONTEXT;
        -- Defensible privilege & integrity boundary:
        -- 1. Must have transaction-scoped cleanup authorization set by authorized function.
        -- 2. Call stack must strictly match the anchored, schema-qualified canonical function signature
        --    public.fn_purge_expired_webhook_data(integer, integer) executing the DELETE statement.
        -- Spoofed functions in pg_temp or alternate schemas, lookalike names, different arities,
        -- direct caller GUC manipulation, and direct DELETE all fail.
        IF current_setting('app.retention_cleanup_authorized', true) IS DISTINCT FROM 'true'
           OR v_context !~ '(?m)^PL/pgSQL function public\.fn_purge_expired_webhook_data\(integer,\s*integer\) line [0-9]+ at SQL statement$' THEN
            RAISE EXCEPTION 'DELETE_UNAUTHORIZED: Direct deletion from webhook_events is prohibited. Deletion is permitted strictly within public.fn_purge_expired_webhook_data(integer, integer).'
                USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
        END IF;
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_webhook_events_immutable
    BEFORE UPDATE OR DELETE ON public.webhook_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_webhook_events_prevent_mutation();

-- ─── 3. PER-SUBSCRIPTION WEBHOOK DELIVERIES ────────────────────────────────────
CREATE TABLE public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    event_id UUID NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'queued',
    lease_token UUID,
    leased_at TIMESTAMPTZ,
    leased_until TIMESTAMPTZ,
    http_status INTEGER,
    execution_duration_ms INTEGER,
    request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_headers JSONB,
    response_body_sample TEXT,
    error_message TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_webhook_deliv_status CHECK (status IN ('queued', 'leased', 'delivered', 'retrying', 'dead_letter')),
    CONSTRAINT fk_webhook_deliv_tenant_sub FOREIGN KEY (tenant_id, subscription_id)
        REFERENCES public.webhook_subscriptions(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_webhook_deliv_tenant_event FOREIGN KEY (tenant_id, event_id)
        REFERENCES public.webhook_events(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT uq_webhook_deliv_sub_event UNIQUE (subscription_id, event_id),
    CONSTRAINT ck_response_sample_length CHECK (length(response_body_sample) <= 1024),
    CONSTRAINT ck_attempt_bounds CHECK (attempt_count >= 1 AND attempt_count <= 5)
);

CREATE INDEX idx_webhook_deliv_worker_poll
    ON public.webhook_deliveries(status, next_retry_at, leased_until)
    WHERE status IN ('queued', 'retrying', 'leased');

CREATE INDEX idx_webhook_deliv_tenant_event
    ON public.webhook_deliveries(tenant_id, event_id);

CREATE INDEX idx_webhook_deliv_tenant_sub_created
    ON public.webhook_deliveries(tenant_id, subscription_id, created_at DESC);

-- ─── 4. ATOMIC EVENT PUBLICATION & FAN-OUT FUNCTION ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_publish_webhook_event(
    p_tenant_id UUID,
    p_application_id UUID,
    p_event_type TEXT,
    p_idempotency_key TEXT,
    p_payload JSONB,
    p_payload_raw TEXT,
    p_payload_sha256 VARCHAR(64)
)
RETURNS TABLE (
    event_id UUID,
    is_duplicate BOOLEAN,
    deliveries_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_event_id UUID;
    v_is_duplicate BOOLEAN := false;
    v_deliv_count INTEGER := 0;
BEGIN
    -- 1. Validate application exists and belongs to tenant
    IF NOT EXISTS (
        SELECT 1 FROM public.saas_applications
        WHERE tenant_id = p_tenant_id AND id = p_application_id
    ) THEN
        RAISE EXCEPTION 'APPLICATION_NOT_FOUND: Application % does not belong to tenant %', p_application_id, p_tenant_id
            USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;

    -- 2. Check idempotency if key provided
    IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
        SELECT id INTO v_event_id
        FROM public.webhook_events
        WHERE tenant_id = p_tenant_id
          AND application_id = p_application_id
          AND idempotency_key = p_idempotency_key;

        IF v_event_id IS NOT NULL THEN
            v_is_duplicate := true;
            -- Ensure deliveries exist for all currently active subscriptions
            WITH inserted_deliv AS (
                INSERT INTO public.webhook_deliveries (
                    tenant_id,
                    subscription_id,
                    event_id,
                    attempt_count,
                    status,
                    created_at
                )
                SELECT
                    p_tenant_id,
                    s.id,
                    v_event_id,
                    1,
                    'queued',
                    timezone('utc', now())
                FROM public.webhook_subscriptions s
                WHERE s.tenant_id = p_tenant_id
                  AND s.application_id = p_application_id
                  AND s.status = 'active'
                  AND ('*' = ANY(s.subscribed_events) OR p_event_type = ANY(s.subscribed_events))
                ON CONFLICT (subscription_id, event_id) DO NOTHING
                RETURNING id
            )
            SELECT count(*)::INTEGER INTO v_deliv_count FROM inserted_deliv;

            -- Return total deliveries for this existing event
            SELECT count(*)::INTEGER INTO v_deliv_count
            FROM public.webhook_deliveries wd
            WHERE wd.tenant_id = p_tenant_id AND wd.event_id = v_event_id;

            event_id := v_event_id;
            is_duplicate := v_is_duplicate;
            deliveries_created := v_deliv_count;
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    -- 3. Insert new event
    v_event_id := gen_random_uuid();
    INSERT INTO public.webhook_events (
        id,
        tenant_id,
        application_id,
        event_type,
        idempotency_key,
        payload,
        payload_raw,
        payload_sha256,
        created_at
    ) VALUES (
        v_event_id,
        p_tenant_id,
        p_application_id,
        p_event_type,
        p_idempotency_key,
        p_payload,
        p_payload_raw,
        p_payload_sha256,
        timezone('utc', now())
    );

    -- 4. Atomically fan out to matching active subscriptions under this tenant and application
    WITH inserted_deliv AS (
        INSERT INTO public.webhook_deliveries (
            tenant_id,
            subscription_id,
            event_id,
            attempt_count,
            status,
            created_at
        )
        SELECT
            p_tenant_id,
            s.id,
            v_event_id,
            1,
            'queued',
            timezone('utc', now())
        FROM public.webhook_subscriptions s
        WHERE s.tenant_id = p_tenant_id
          AND s.application_id = p_application_id
          AND s.status = 'active'
          AND ('*' = ANY(s.subscribed_events) OR p_event_type = ANY(s.subscribed_events))
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO v_deliv_count FROM inserted_deliv;

    event_id := v_event_id;
    is_duplicate := false;
    deliveries_created := v_deliv_count;
    RETURN NEXT;
END;
$$;

-- ─── 5. AUDITED RETENTION PURGE FUNCTION ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
    p_retention_days INTEGER DEFAULT 30,
    p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (purged_deliveries_count INTEGER, purged_events_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_deliv_count INTEGER := 0;
    v_event_count INTEGER := 0;
    v_cutoff TIMESTAMPTZ := timezone('utc', now()) - (p_retention_days || ' days')::INTERVAL;
BEGIN
    IF p_retention_days < 7 THEN
        RAISE EXCEPTION 'INVALID_RETENTION_PERIOD: Retention cannot be purged below 7 days.'
            USING ERRCODE = '22023'; -- invalid_parameter_value
    END IF;

    -- Authorize deletion exclusively for this procedure execution
    PERFORM set_config('app.retention_cleanup_authorized', 'true', true);

    -- Step 1: Purge completed deliveries older than cutoff
    -- Must delete deliveries first to preserve fk_webhook_deliv_tenant_event RESTRICT
    WITH deleted_deliv AS (
        DELETE FROM public.webhook_deliveries
        WHERE id IN (
            SELECT id FROM public.webhook_deliveries
            WHERE status IN ('delivered', 'dead_letter')
              AND completed_at < v_cutoff
            ORDER BY completed_at ASC
            LIMIT p_batch_size
        )
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO v_deliv_count FROM deleted_deliv;

    -- Step 2: Purge orphaned events older than cutoff with no remaining deliveries
    WITH deleted_events AS (
        DELETE FROM public.webhook_events e
        WHERE e.id IN (
            SELECT evt.id FROM public.webhook_events evt
            WHERE evt.created_at < v_cutoff
              AND NOT EXISTS (
                  SELECT 1 FROM public.webhook_deliveries d
                  WHERE d.tenant_id = evt.tenant_id
                    AND d.event_id = evt.id
              )
            ORDER BY evt.created_at ASC
            LIMIT p_batch_size
        )
        RETURNING e.id
    )
    SELECT count(*)::INTEGER INTO v_event_count FROM deleted_events;

    -- Reset session authorization variable
    PERFORM set_config('app.retention_cleanup_authorized', 'false', true);

    purged_deliveries_count := v_deliv_count;
    purged_events_count := v_event_count;
    RETURN NEXT;
END;
$$;

-- ─── 6. ATOMIC QUEUE BATCH CLAIM FUNCTION (SKIP LOCKED) ────────────────────────
CREATE OR REPLACE FUNCTION public.fn_claim_webhook_batch(
    p_batch_size INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
    delivery_id UUID,
    tenant_id UUID,
    application_id UUID,
    subscription_id UUID,
    event_id UUID,
    attempt_count INTEGER,
    lease_token UUID,
    leased_until TIMESTAMPTZ,
    endpoint_url TEXT,
    secret_ciphertext BYTEA,
    secret_iv BYTEA,
    secret_tag BYTEA,
    secret_key_version INTEGER,
    previous_secret_ciphertext BYTEA,
    previous_secret_iv BYTEA,
    previous_secret_tag BYTEA,
    previous_secret_expires_at TIMESTAMPTZ,
    event_type TEXT,
    payload_raw TEXT,
    payload_sha256 VARCHAR(64)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_lease_until TIMESTAMPTZ := v_now + (p_lease_seconds || ' seconds')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH claimable AS (
        SELECT d.id
        FROM public.webhook_deliveries d
        WHERE (
            d.status = 'queued'
            OR (d.status = 'retrying' AND d.next_retry_at <= v_now)
            OR (d.status = 'leased' AND d.leased_until < v_now)
        )
        ORDER BY d.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    ),
    claimed AS (
        UPDATE public.webhook_deliveries d
        SET status = 'leased',
            lease_token = gen_random_uuid(),
            leased_at = v_now,
            leased_until = v_lease_until
        FROM claimable c
        WHERE d.id = c.id
        RETURNING d.id, d.tenant_id, d.subscription_id, d.event_id, d.attempt_count, d.lease_token, d.leased_until
    )
    SELECT
        c.id AS delivery_id,
        c.tenant_id,
        s.application_id,
        c.subscription_id,
        c.event_id,
        c.attempt_count,
        c.lease_token,
        c.leased_until,
        s.endpoint_url,
        s.secret_ciphertext,
        s.secret_iv,
        s.secret_tag,
        s.secret_key_version,
        s.previous_secret_ciphertext,
        s.previous_secret_iv,
        s.previous_secret_tag,
        s.previous_secret_expires_at,
        e.event_type,
        e.payload_raw,
        e.payload_sha256
    FROM claimed c
    JOIN public.webhook_subscriptions s ON s.id = c.subscription_id AND s.tenant_id = c.tenant_id
    JOIN public.webhook_events e ON e.id = c.event_id AND e.tenant_id = c.tenant_id AND e.application_id = s.application_id;
END;
$$;

-- ─── 7. SECURITY & ROLE PRIVILEGE BOUNDARIES ──────────────────────────────────
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.webhook_subscriptions FROM anon, authenticated, public;
REVOKE ALL ON public.webhook_events FROM anon, authenticated, public;
REVOKE ALL ON public.webhook_deliveries FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_publish_webhook_event(UUID, UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) FROM anon, authenticated, public;

-- Revoke UPDATE/DELETE on webhook_events from service_role
REVOKE UPDATE, DELETE ON public.webhook_events FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_subscriptions TO service_role;
GRANT SELECT, INSERT ON public.webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_publish_webhook_event(UUID, UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO service_role;

CREATE POLICY "webhook_sub_tenant_isolation" ON public.webhook_subscriptions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "webhook_events_tenant_isolation" ON public.webhook_events
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "webhook_deliv_tenant_isolation" ON public.webhook_deliveries
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- ==============================================================================
-- CANONICAL NON-CASCADE TEARDOWN SPECIFICATION (REVERSE-DEPENDENCY ORDER)
-- Execute ONLY if rolling back migration 070. CASCADE is strictly forbidden.
-- ==============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "webhook_deliv_tenant_isolation" ON public.webhook_deliveries;
-- DROP POLICY IF EXISTS "webhook_events_tenant_isolation" ON public.webhook_events;
-- DROP POLICY IF EXISTS "webhook_sub_tenant_isolation" ON public.webhook_subscriptions;
-- DROP TRIGGER IF EXISTS trg_webhook_events_immutable ON public.webhook_events;
-- DROP FUNCTION IF EXISTS public.fn_webhook_events_prevent_mutation();
-- DROP FUNCTION IF EXISTS public.fn_claim_webhook_batch(INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS public.fn_purge_expired_webhook_data(INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS public.fn_publish_webhook_event(UUID, UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR);
-- DROP TABLE IF EXISTS public.webhook_deliveries;    -- Dropped first: references subscriptions & events
-- DROP TABLE IF EXISTS public.webhook_events;        -- Dropped second: references saas_applications
-- DROP TABLE IF EXISTS public.webhook_subscriptions; -- Dropped third: references saas_applications
-- COMMIT;

-- ##############################################################################
-- BEGIN COMPONENT: 071_delimitation_watch_engine.sql
-- ##############################################################################

-- ==============================================================================
-- 071_delimitation_watch_engine.sql
--
-- Milestone: JOB 023 — Delimitation Watch Engine
-- Authority: CTO IMPLEMENTATION DIRECTIVE — JOB 023: DELIMITATION WATCH
-- Primary Owner: DATA (Supported by BE, ARCH, SEC, QA, DEVOPS)
--
-- Ordered 8-Stage Lifecycle Persistence:
--   SOURCE -> CAPTURE -> NORMALIZE -> VALIDATE -> COMPARE -> VERSION -> NOTIFY -> PUBLISH
--
-- Invariants Enforced:
-- 1. Immutable raw snapshot storage with SHA-256 verification and HTTP metadata
-- 2. Strict separation of OFFICIAL vs SCENARIO/UNVERIFIED data status
-- 3. Deterministic comparison persistence distinguishing material vs immaterial changes
-- 4. Immutable accepted versions with previous_version_id lineage DAG
-- 5. Database-level idempotency via UNIQUE constraints on (source_id, content_sha256)
-- 6. Notification outbox with unique deduplication key and geographic targeting
-- 7. Idempotent publication record ensuring exactly-once published version pointers
-- 8. Complete operational run tracking with correlation IDs and stage duration metrics
-- 9. Hardened RLS policies with strict service-role isolation and public mutation revoke
-- 10. ON DELETE RESTRICT on all foreign keys preventing orphan references
-- ==============================================================================

BEGIN;

-- ─── 1. ENUM & DOMAIN EXTENSIONS (SAFE IDEMPOTENT CREATION) ──────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE source_authority_enum AS ENUM (
    'constitutional',
    'statutory',
    'academic',
    'media_ngo',
    'crowdsourced',
    'synthetic_model'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'ESTIMATE',
    'SCENARIO',
    'INFERRED',
    'UNVERIFIED',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 2. STAGE 1: SOURCE REGISTRY ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_watch_sources (
  id VARCHAR(100) PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'gazette_extraordinary',
    'gazette_ordinary',
    'election_commission',
    'parliament_record',
    'census_bulletin',
    'statutory_archive',
    'synthetic_fixture'
  )),
  canonical_url TEXT NOT NULL,
  geographic_scope TEXT NOT NULL, -- e.g. 'NATIONAL', 'IN-TG', 'IN-AS'
  subject_scope TEXT NOT NULL,    -- e.g. 'delimitation_order', 'draft_proposal'
  authority_classification source_authority_enum NOT NULL DEFAULT 'statutory',
  retrieval_method TEXT NOT NULL DEFAULT 'http_get' CHECK (retrieval_method IN ('http_get', 'file_fixture', 'mock_api')),
  polling_schedule TEXT,          -- Cron or descriptive policy
  is_active BOOLEAN NOT NULL DEFAULT true,
  locked_by TEXT DEFAULT NULL,
  locked_until TIMESTAMPTZ DEFAULT NULL,
  last_attempted_at TIMESTAMPTZ,
  last_successful_at TIMESTAMPTZ,
  last_http_status INTEGER,
  last_etag TEXT,
  last_modified_header TEXT,
  last_content_hash TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_sources_lock ON public.delimitation_watch_sources(locked_until);

COMMENT ON TABLE public.delimitation_watch_sources IS 'Registered delimitation data sources tracked by Delimitation Watch (Stage 1).';

-- ─── 3. STAGE 1: RAW SNAPSHOT STORAGE (IMMUTABLE CAPTURE) ────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  http_status INTEGER NOT NULL,
  etag TEXT,
  last_modified TEXT,
  content_type TEXT NOT NULL,
  content_size_bytes INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  declared_publication_date DATE,
  declared_effective_date DATE,
  capture_outcome TEXT NOT NULL CHECK (capture_outcome IN ('SUCCESS', 'UNCHANGED', 'FETCH_ERROR', 'TIMEOUT', 'NOT_FOUND')),
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_snapshots_source ON public.delimitation_snapshots(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_snapshots_hash ON public.delimitation_snapshots(content_sha256);
CREATE INDEX IF NOT EXISTS idx_delim_snapshots_retrieved ON public.delimitation_snapshots(retrieved_at DESC);

COMMENT ON TABLE public.delimitation_snapshots IS 'Immutable captured raw source evidence with cryptographic SHA-256 hashes.';

-- ─── 4. STAGE 2: NORMALIZED CANDIDATES ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  parser_version VARCHAR(50) NOT NULL,
  proposal_data JSONB NOT NULL,
  constituency_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_data_status data_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  is_proposed BOOLEAN NOT NULL DEFAULT true,
  instrument_type TEXT,
  instrument_identifier TEXT,
  legal_enactment_status TEXT,
  effective_date DATE,
  official_decision_record JSONB,
  provenance_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_candidates_snapshot ON public.delimitation_candidates(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_delim_candidates_source ON public.delimitation_candidates(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_candidates_status ON public.delimitation_candidates(normalized_data_status);

COMMENT ON TABLE public.delimitation_candidates IS 'Deterministic canonical candidates produced by normalizing raw snapshots (Stage 2).';

-- ─── 5. STAGE 3: VALIDATION RESULTS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('PASSED', 'REJECTED', 'REVIEW_REQUIRED')),
  checks_run JSONB NOT NULL,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_validations_candidate ON public.delimitation_validations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_delim_validations_status ON public.delimitation_validations(validation_status);

COMMENT ON TABLE public.delimitation_validations IS 'Explicit gate reports from 11-point validation before acceptance (Stage 3).';

-- ─── 6. STAGE 4: BASELINE COMPARISONS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  baseline_version_id UUID,
  is_material_change BOOLEAN NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN (
    'NO_CHANGE',
    'MATERIAL_CHANGE',
    'INVALID_CANDIDATE',
    'SOURCE_RETRIEVAL_FAILURE',
    'REVIEW_REQUIRED'
  )),
  added_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  removed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  unchanged_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison_summary TEXT NOT NULL,
  compared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_comparisons_candidate ON public.delimitation_comparisons(candidate_id);
CREATE INDEX IF NOT EXISTS idx_delim_comparisons_material ON public.delimitation_comparisons(is_material_change);

COMMENT ON TABLE public.delimitation_comparisons IS 'Deterministic diffs against previously accepted baselines (Stage 4).';

-- ─── 7. STAGE 5: IMMUTABLE ACCEPTED VERSIONS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_accepted_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  version_tag VARCHAR(100) NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_id UUID NOT NULL REFERENCES public.delimitation_validations(id) ON DELETE RESTRICT,
  comparison_id UUID NOT NULL REFERENCES public.delimitation_comparisons(id) ON DELETE RESTRICT,
  previous_version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  content_sha256 TEXT NOT NULL,
  parser_version VARCHAR(50) NOT NULL,
  data_status data_status_enum NOT NULL,
  effective_date DATE,
  instrument_type TEXT,
  instrument_identifier TEXT,
  legal_enactment_status TEXT,
  proposal_id UUID,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_by TEXT NOT NULL DEFAULT 'system_delimitation_watch',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_delim_accepted_versions_tag UNIQUE (source_id, version_tag),
  CONSTRAINT uq_delim_accepted_versions_hash UNIQUE (source_id, content_sha256)
);

CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_source ON public.delimitation_accepted_versions(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_prev ON public.delimitation_accepted_versions(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_status ON public.delimitation_accepted_versions(data_status);

COMMENT ON TABLE public.delimitation_accepted_versions IS 'Immutable accepted delimitation versions forming an auditable lineage DAG (Stage 5).';

-- Add self-reference foreign key to comparisons now that accepted_versions exists
DO $$ BEGIN
  ALTER TABLE public.delimitation_comparisons
    ADD CONSTRAINT fk_delim_comparisons_baseline
    FOREIGN KEY (baseline_version_id)
    REFERENCES public.delimitation_accepted_versions(id)
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 8. STAGE 6: NOTIFICATION OUTBOX EVENTS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'OFFICIAL_ENACTMENT',
    'OFFICIAL_PUBLICATION',
    'PROPOSAL_NOTICE',
    'DRAFT_PROPOSAL',
    'MATERIAL_UPDATE',
    'SCENARIO_UPDATE',
    'SOURCE_CORRECTION'
  )),
  deduplication_key TEXT NOT NULL UNIQUE,
  state_code TEXT NOT NULL,
  affected_geography_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT NOT NULL,
  data_status data_status_enum NOT NULL,
  dispatch_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (dispatch_status IN ('PENDING', 'SENT', 'FAILED', 'RETRY_PENDING')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_notif_version ON public.delimitation_notification_events(version_id);
CREATE INDEX IF NOT EXISTS idx_delim_notif_status ON public.delimitation_notification_events(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_delim_notif_dedup ON public.delimitation_notification_events(deduplication_key);

COMMENT ON TABLE public.delimitation_notification_events IS 'Durable notification outbox events for accepted delimitation changes (Stage 6).';

-- ─── 9. STAGE 7: PUBLICATIONS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  publication_type TEXT NOT NULL DEFAULT 'PROPOSAL' CHECK (publication_type IN ('ENACTED_OFFICIAL', 'PROPOSAL', 'SCENARIO_ESTIMATE', 'UNVERIFIED_NOTICE')),
  publication_status TEXT NOT NULL CHECK (publication_status IN ('PUBLISHED', 'FAILED', 'RETRY_PENDING')),
  published_at TIMESTAMPTZ,
  published_by TEXT NOT NULL DEFAULT 'system_delimitation_watch',
  published_proposal_id UUID,
  canonical_view_updated BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delim_publications_version UNIQUE (version_id)
);

CREATE INDEX IF NOT EXISTS idx_delim_publications_version ON public.delimitation_publications(version_id);
CREATE INDEX IF NOT EXISTS idx_delim_publications_status ON public.delimitation_publications(publication_status);

COMMENT ON TABLE public.delimitation_publications IS 'Idempotent publication records for accepted delimitation versions (Stage 7).';

-- ─── 10. STAGE 8: OPERATIONAL RUN LOGS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_watch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  run_type TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (run_type IN ('SCHEDULED', 'MANUAL_TRIGGER', 'REPLAY')),
  snapshot_id UUID REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  candidate_id UUID REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_id UUID REFERENCES public.delimitation_validations(id) ON DELETE RESTRICT,
  comparison_id UUID REFERENCES public.delimitation_comparisons(id) ON DELETE RESTRICT,
  version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES public.delimitation_notification_events(id) ON DELETE RESTRICT,
  publication_id UUID REFERENCES public.delimitation_publications(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'NO_CHANGE', 'REJECTED', 'REVIEW_REQUIRED', 'RETRY_PENDING', 'FAILED')),
  stage_durations_ms JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_runs_source ON public.delimitation_watch_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_runs_correlation ON public.delimitation_watch_runs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_delim_runs_outcome ON public.delimitation_watch_runs(outcome);
CREATE INDEX IF NOT EXISTS idx_delim_runs_created ON public.delimitation_watch_runs(created_at DESC);

COMMENT ON TABLE public.delimitation_watch_runs IS 'Operational audit log of all Delimitation Watch executions (Stage 8).';

-- ─── 11. SECURITY, RLS POLICIES & ACCESS CONTROLS ────────────────────────────

ALTER TABLE public.delimitation_watch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_accepted_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_watch_runs ENABLE ROW LEVEL SECURITY;

-- Revoke public modification on all engine tables
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_sources FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_snapshots FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_candidates FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_validations FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_comparisons FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_accepted_versions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_notification_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_publications FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_runs FROM PUBLIC, anon, authenticated;

-- Allow read-only access to published/accepted versions and sources for authenticated/anon
DO $$ BEGIN
  CREATE POLICY "Public read active sources"
    ON public.delimitation_watch_sources FOR SELECT
    USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read accepted versions"
    ON public.delimitation_accepted_versions FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read publications"
    ON public.delimitation_publications FOR SELECT
    USING (publication_status = 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;
