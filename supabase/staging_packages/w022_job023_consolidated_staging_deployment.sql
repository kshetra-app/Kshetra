-- ==============================================================================
-- KSHETRA / PANIN: CONSOLIDATED STAGING DEPLOYMENT PACKAGE (068, 070, 071)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Production: STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
-- Scope:
--   Part 1: Migration 068 - Normalized Candidate Affidavit Disclosures Schema (DEC-134)
--   Part 2: Migration 070 - SaaS Outbound Webhook & Event Dispatching Engine (W022)
--   Part 3: Migration 071 - Delimitation Watch Engine 8-Stage Lifecycle Schema (JOB 023)
-- Note: Migrations 067/069 are decoupled as they belong to W019 election_contests
--       linkage which is an external dependency (CRIT-D03-01 / BLOCKED_EXTERNAL).
-- ==============================================================================

-- ##############################################################################
-- BEGIN COMPONENT: 068_affidavit_disclosures.sql
-- ##############################################################################

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

BEGIN;

-- 0. PREFLIGHT RUNTIME PREREQUISITE ASSERTION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_saas_applications_tenant_app'
          AND conrelid = 'public.saas_applications'::regclass
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE_CONSTRAINT_MISSING: uq_saas_applications_tenant_app on public.saas_applications does not exist. Migration 057 must be applied prior to Migration 070.'
            USING ERRCODE = '55000';
    END IF;
END $$;

-- 1. WEBHOOK SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
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

CREATE INDEX IF NOT EXISTS idx_webhook_sub_app
    ON public.webhook_subscriptions(tenant_id, application_id, status);

-- 2. IMMUTABLE WEBHOOK EVENTS LOG
CREATE TABLE IF NOT EXISTS public.webhook_events (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_tenant_app_idempotency
    ON public.webhook_events (tenant_id, application_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_app_created
    ON public.webhook_events(tenant_id, application_id, created_at DESC);

-- Trigger: Immutability enforcement
CREATE OR REPLACE FUNCTION public.fn_webhook_events_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'CANNOT_MUTATE_WEBHOOK_EVENTS: webhook_events is an immutable append-only audit log. UPDATE operations are strictly prohibited.'
            USING ERRCODE = '55000';
    ELSIF TG_OP = 'DELETE' THEN
        IF current_setting('app.retention_cleanup_authorized', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'UNAUTHORIZED_WEBHOOK_EVENT_DELETION: Direct deletion from webhook_events is prohibited. Deletions must occur exclusively via fn_purge_expired_webhook_data().'
                USING ERRCODE = '55000';
        END IF;
        IF current_setting('app.retention_cleanup_context', true) IS DISTINCT FROM 'fn_purge_expired_webhook_data' THEN
            RAISE EXCEPTION 'INVALID_WEBHOOK_EVENT_CLEANUP_CONTEXT: Deletions must occur exclusively via fn_purge_expired_webhook_data().'
                USING ERRCODE = '55000';
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_webhook_events_immutable ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_immutable
    BEFORE UPDATE OR DELETE ON public.webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_webhook_events_prevent_mutation();

-- 3. WEBHOOK DELIVERIES QUEUE & STATE MACHINE
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    event_id UUID NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued',
    lease_token UUID,
    leased_at TIMESTAMPTZ,
    leased_until TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_attempt_at TIMESTAMPTZ,
    last_http_status INTEGER,
    last_error_code TEXT,
    last_error_message TEXT,
    response_latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_webhook_delivery_status CHECK (status IN ('queued', 'leased', 'delivering', 'success', 'retrying', 'failed')),
    CONSTRAINT fk_webhook_deliv_sub FOREIGN KEY (tenant_id, subscription_id)
        REFERENCES public.webhook_subscriptions(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_webhook_deliv_event FOREIGN KEY (tenant_id, event_id)
        REFERENCES public.webhook_events(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_webhook_deliv_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uq_webhook_deliv_sub_event UNIQUE (tenant_id, subscription_id, event_id),
    CONSTRAINT ck_webhook_deliv_attempt_nonneg CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_queue
    ON public.webhook_deliveries(status, next_retry_at, leased_until)
    WHERE status IN ('queued', 'retrying', 'leased');

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_sub_created
    ON public.webhook_deliveries(tenant_id, subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_event
    ON public.webhook_deliveries(tenant_id, event_id);

-- 4. ATOMIC EVENT PUBLICATION & FANOUT PROCEDURE
CREATE OR REPLACE FUNCTION public.fn_publish_webhook_event(
    p_tenant_id UUID,
    p_application_id UUID,
    p_event_type TEXT,
    p_idempotency_key TEXT,
    p_payload JSONB,
    p_payload_raw TEXT,
    p_payload_sha256 VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_event_id UUID;
    v_created_at TIMESTAMPTZ;
    v_inserted_event BOOLEAN := FALSE;
    v_delivery_count INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.saas_applications
        WHERE id = p_application_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'AUTHORIZATION_DENIED: Application % does not belong to tenant %', p_application_id, p_tenant_id
            USING ERRCODE = '42501';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, created_at INTO v_event_id, v_created_at
        FROM public.webhook_events
        WHERE tenant_id = p_tenant_id
          AND application_id = p_application_id
          AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            SELECT COUNT(*) INTO v_delivery_count
            FROM public.webhook_deliveries
            WHERE tenant_id = p_tenant_id AND event_id = v_event_id;

            RETURN json_build_object(
                'event_id', v_event_id,
                'created_at', v_created_at,
                'is_idempotent_replay', TRUE,
                'deliveries_queued', v_delivery_count
            )::jsonb;
        END IF;
    END IF;

    INSERT INTO public.webhook_events (
        tenant_id,
        application_id,
        event_type,
        idempotency_key,
        payload,
        payload_raw,
        payload_sha256
    ) VALUES (
        p_tenant_id,
        p_application_id,
        p_event_type,
        p_idempotency_key,
        p_payload,
        p_payload_raw,
        p_payload_sha256
    )
    RETURNING id, created_at INTO v_event_id, v_created_at;

    WITH matched_subscriptions AS (
        SELECT s.id AS subscription_id
        FROM public.webhook_subscriptions s
        WHERE s.tenant_id = p_tenant_id
          AND s.application_id = p_application_id
          AND s.status = 'active'
          AND (
              '*' = ANY(s.subscribed_events)
              OR p_event_type = ANY(s.subscribed_events)
          )
    ),
    inserted_deliveries AS (
        INSERT INTO public.webhook_deliveries (
            tenant_id,
            subscription_id,
            event_id,
            status,
            attempt_count,
            next_retry_at
        )
        SELECT
            p_tenant_id,
            m.subscription_id,
            v_event_id,
            'queued',
            0,
            v_created_at
        FROM matched_subscriptions m
        ON CONFLICT (tenant_id, subscription_id, event_id) DO NOTHING
        RETURNING id
    )
    SELECT COUNT(*) INTO v_delivery_count FROM inserted_deliveries;

    RETURN json_build_object(
        'event_id', v_event_id,
        'created_at', v_created_at,
        'is_idempotent_replay', FALSE,
        'deliveries_queued', v_delivery_count
    )::jsonb;
END;
$$;

-- 5. CASCADE-SAFE EXPIRATION PURGE PROCEDURE
CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
    p_event_retention_days INTEGER DEFAULT 30,
    p_delivery_retention_days INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_event_cutoff TIMESTAMPTZ;
    v_delivery_cutoff TIMESTAMPTZ;
    v_deleted_deliveries_terminal INTEGER := 0;
    v_deleted_events INTEGER := 0;
    v_deleted_deliveries_cascade INTEGER := 0;
BEGIN
    IF p_event_retention_days < 7 OR p_delivery_retention_days < 7 THEN
        RAISE EXCEPTION 'ILLEGAL_RETENTION_PERIOD: Retention policies under 7 days are prohibited for audit integrity.'
            USING ERRCODE = '22023';
    END IF;

    v_event_cutoff := timezone('utc', now()) - (p_event_retention_days || ' days')::INTERVAL;
    v_delivery_cutoff := timezone('utc', now()) - (p_delivery_retention_days || ' days')::INTERVAL;

    WITH del_term AS (
        DELETE FROM public.webhook_deliveries
        WHERE status IN ('success', 'failed')
          AND created_at < v_delivery_cutoff
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_deliveries_terminal FROM del_term;

    PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
    PERFORM set_config('app.retention_cleanup_context', 'fn_purge_expired_webhook_data', true);

    WITH expired_events AS (
        SELECT id FROM public.webhook_events
        WHERE created_at < v_event_cutoff
    ),
    del_casc_deliv AS (
        DELETE FROM public.webhook_deliveries
        WHERE event_id IN (SELECT id FROM expired_events)
        RETURNING id
    ),
    del_events AS (
        DELETE FROM public.webhook_events
        WHERE id IN (SELECT id FROM expired_events)
        RETURNING id
    )
    SELECT
        (SELECT COUNT(*) FROM del_casc_deliv),
        (SELECT COUNT(*) FROM del_events)
    INTO v_deleted_deliveries_cascade, v_deleted_events;

    RETURN json_build_object(
        'deleted_terminal_deliveries', v_deleted_deliveries_terminal,
        'deleted_cascade_deliveries', v_deleted_deliveries_cascade,
        'deleted_events', v_deleted_events,
        'event_cutoff', v_event_cutoff,
        'delivery_cutoff', v_delivery_cutoff
    )::jsonb;
END;
$$;

-- 6. ATOMIC SKIP LOCKED LEASE CLAIM PROCEDURE
CREATE OR REPLACE FUNCTION public.fn_claim_webhook_batch(
    p_batch_size INTEGER DEFAULT 100,
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

-- 7. SECURITY & ROLE PRIVILEGE BOUNDARIES
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

REVOKE UPDATE, DELETE ON public.webhook_events FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_subscriptions TO service_role;
GRANT SELECT, INSERT ON public.webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_publish_webhook_event(UUID, UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO service_role;

DO $$ BEGIN
  CREATE POLICY "webhook_sub_tenant_isolation" ON public.webhook_subscriptions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "webhook_events_tenant_isolation" ON public.webhook_events
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "webhook_deliv_tenant_isolation" ON public.webhook_deliveries
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

COMMIT;

-- ##############################################################################
-- BEGIN COMPONENT: 071_delimitation_watch_engine.sql
-- ##############################################################################

BEGIN;

-- 1. ENUM & DOMAIN EXTENSIONS
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

-- 2. STAGE 1: SOURCE REGISTRY
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
  geographic_scope TEXT NOT NULL,
  subject_scope TEXT NOT NULL,
  authority_classification source_authority_enum NOT NULL DEFAULT 'statutory',
  retrieval_method TEXT NOT NULL DEFAULT 'http_get' CHECK (retrieval_method IN ('http_get', 'file_fixture', 'mock_api')),
  polling_schedule TEXT,
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

-- 3. STAGE 2: IMMUTABLE CAPTURE SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.delimitation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  http_status INTEGER NOT NULL,
  etag_header TEXT,
  last_modified_header TEXT,
  content_sha256 VARCHAR(64) NOT NULL,
  raw_bytes_size INTEGER NOT NULL CHECK (raw_bytes_size >= 0),
  raw_content_storage_path TEXT,
  raw_payload_preview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_snap_source_sha ON public.delimitation_snapshots(source_id, content_sha256);
CREATE INDEX IF NOT EXISTS idx_delim_snap_captured ON public.delimitation_snapshots(captured_at DESC);

-- 4. STAGE 3: NORMALIZED CANDIDATES
CREATE TABLE IF NOT EXISTS public.delimitation_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  normalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processor_version VARCHAR(50) NOT NULL,
  geographic_scope TEXT NOT NULL,
  legal_status VARCHAR(50) NOT NULL CHECK (legal_status IN (
    'PROPOSED',
    'DRAFT_ORDER',
    'ENACTED',
    'GAZETTED',
    'SUPERSEDED',
    'REVOKED',
    'CHALLENGED_JUDICIAL',
    'SYNTHETIC_MODEL'
  )),
  effective_date DATE,
  gazette_notification_number TEXT,
  content_sha256 VARCHAR(64) NOT NULL,
  features_count INTEGER NOT NULL DEFAULT 0,
  attributes_hash VARCHAR(64) NOT NULL,
  geometries_hash VARCHAR(64),
  normalized_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delim_candidates_snapshot_proc UNIQUE (snapshot_id, processor_version)
);

-- 5. STAGE 4: VALIDATION RUNS & INVARIANTS
CREATE TABLE IF NOT EXISTS public.delimitation_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validator_version VARCHAR(50) NOT NULL,
  validation_status VARCHAR(30) NOT NULL CHECK (validation_status IN (
    'PASSED',
    'FAILED',
    'REQUIRES_HUMAN_REVIEW',
    'BLOCKED_PROVENANCE'
  )),
  passed_invariants BOOLEAN NOT NULL DEFAULT false,
  provenance_verified BOOLEAN NOT NULL DEFAULT false,
  authority_classification source_authority_enum NOT NULL,
  data_status data_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  is_scenario BOOLEAN NOT NULL DEFAULT true,
  topology_valid BOOLEAN,
  hierarchy_valid BOOLEAN,
  unrecognized_geography_ids TEXT[] DEFAULT '{}',
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. STAGE 5: DETERMINISTIC COMPARISONS
CREATE TABLE IF NOT EXISTS public.delimitation_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  reference_version_id UUID,
  compared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comparator_version VARCHAR(50) NOT NULL,
  comparison_status VARCHAR(30) NOT NULL CHECK (comparison_status IN (
    'IDENTICAL',
    'IMMATERIAL_METADATA_DIFF',
    'MATERIAL_BOUNDARY_CHANGE',
    'MATERIAL_ALLOCATION_CHANGE',
    'MATERIAL_REORGANIZATION',
    'UNMATCHED_REFERENCE'
  )),
  is_material_change BOOLEAN NOT NULL DEFAULT false,
  added_units_count INTEGER NOT NULL DEFAULT 0,
  removed_units_count INTEGER NOT NULL DEFAULT 0,
  modified_units_count INTEGER NOT NULL DEFAULT 0,
  unmodified_units_count INTEGER NOT NULL DEFAULT 0,
  boundary_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  reservation_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  allocation_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. STAGE 6: ACCEPTED CANONICAL DELIMITATION VERSIONS
CREATE TABLE IF NOT EXISTS public.delimitation_accepted_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  previous_version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  content_sha256 VARCHAR(64) NOT NULL,
  legal_status VARCHAR(50) NOT NULL,
  effective_date DATE,
  gazette_notification_number TEXT,
  authority_classification source_authority_enum NOT NULL,
  data_status data_status_enum NOT NULL,
  is_scenario BOOLEAN NOT NULL DEFAULT false,
  lifecycle_state VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_state IN ('ACTIVE', 'SUPERSEDED', 'WITHDRAWN', 'STAGED')),
  superseded_by UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  adjudicated_by TEXT NOT NULL,
  adjudication_notes TEXT,
  version_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delim_versions_source_hash UNIQUE (source_id, content_sha256)
);

CREATE INDEX IF NOT EXISTS idx_delim_ver_source_state ON public.delimitation_accepted_versions(source_id, lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_delim_ver_previous ON public.delimitation_accepted_versions(previous_version_id);

-- 8. STAGE 7: NOTIFICATION OUTBOX & AUDIT LOG
CREATE TABLE IF NOT EXISTS public.delimitation_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  comparison_id UUID NOT NULL REFERENCES public.delimitation_comparisons(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  geographic_scope TEXT NOT NULL,
  affected_geography_ids TEXT[] NOT NULL DEFAULT '{}',
  deduplication_key TEXT NOT NULL UNIQUE,
  notification_payload JSONB NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (delivery_status IN ('QUEUED', 'DISPATCHED', 'FAILED', 'SUPPRESSED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. STAGE 8: CANONICAL PUBLICATION RECORDS
CREATE TABLE IF NOT EXISTS public.delimitation_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accepted_version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  target_consumer VARCHAR(50) NOT NULL,
  published_pointer_id TEXT NOT NULL,
  publication_status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (publication_status IN ('PUBLISHED', 'ROLLED_BACK', 'FAILED')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  publication_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delim_pub_target UNIQUE (accepted_version_id, target_consumer)
);

-- 10. RUN REGISTRY & OPERATIONAL METRICS
CREATE TABLE IF NOT EXISTS public.delimitation_watch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (run_type IN ('SCHEDULED', 'MANUAL_TRIGGER', 'REPLAY')),
  source_id VARCHAR(100) REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  correlation_id VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  outcome VARCHAR(30) NOT NULL DEFAULT 'RUNNING' CHECK (outcome IN ('RUNNING', 'SUCCESS', 'NO_CHANGE', 'VALIDATION_FAILED', 'ERROR')),
  stages_completed TEXT[] NOT NULL DEFAULT '{}',
  snapshot_id UUID REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  candidate_id UUID REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  error_message TEXT,
  run_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_runs_outcome ON public.delimitation_watch_runs(outcome);
CREATE INDEX IF NOT EXISTS idx_delim_runs_created ON public.delimitation_watch_runs(created_at DESC);

-- 11. SECURITY, RLS POLICIES & ACCESS CONTROLS
ALTER TABLE public.delimitation_watch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_accepted_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_watch_runs ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_sources FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_snapshots FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_candidates FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_validations FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_comparisons FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_accepted_versions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_notification_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_publications FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_runs FROM PUBLIC, anon, authenticated;

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
