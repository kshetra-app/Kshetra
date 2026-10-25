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

    -- Idempotency is enforced atomically by the unique index during INSERT.

    -- 3. Insert event with race-safe, application-scoped idempotency.
    -- A replay must never mutate historical fan-out or create deliveries for subscriptions
    -- that were added after the original event was published.
    IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
        INSERT INTO public.webhook_events (
            tenant_id, application_id, event_type, idempotency_key,
            payload, payload_raw, payload_sha256, created_at
        ) VALUES (
            p_tenant_id, p_application_id, p_event_type, p_idempotency_key,
            p_payload, p_payload_raw, p_payload_sha256, timezone('utc', now())
        )
        ON CONFLICT (tenant_id, application_id, idempotency_key)
            WHERE (idempotency_key IS NOT NULL)
        DO NOTHING
        RETURNING id INTO v_event_id;

        IF v_event_id IS NULL THEN
            -- Another concurrent publisher won the idempotency race. Return the
            -- original immutable event and report zero newly created deliveries.
            SELECT id INTO v_event_id
            FROM public.webhook_events
            WHERE tenant_id = p_tenant_id
              AND application_id = p_application_id
              AND idempotency_key = p_idempotency_key;

            IF v_event_id IS NULL THEN
                RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT_UNRESOLVED'
                    USING ERRCODE = '40001';
            END IF;

            event_id := v_event_id;
            is_duplicate := true;
            deliveries_created := 0;
            RETURN NEXT;
            RETURN;
        END IF;
    ELSE
        INSERT INTO public.webhook_events (
            tenant_id, application_id, event_type, idempotency_key,
            payload, payload_raw, payload_sha256, created_at
        ) VALUES (
            p_tenant_id, p_application_id, p_event_type, NULLIF(p_idempotency_key, ''),
            p_payload, p_payload_raw, p_payload_sha256, timezone('utc', now())
        )
        RETURNING id INTO v_event_id;
    END IF;

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
