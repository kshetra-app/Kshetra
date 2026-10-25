-- ==============================================================================
-- 071_w022_webhook_runtime_security_and_atomicity.sql
-- W022 correction: atomic outbox, executable queue worker, custom role, fenced completion.
-- Source migration presence does not authorize remote execution or deployment.
-- ==============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_enqueue_webhook_event(
    p_tenant_id UUID, p_event_type TEXT, p_idempotency_key TEXT,
    p_payload JSONB, p_payload_raw TEXT, p_payload_sha256 TEXT
)
RETURNS TABLE (event_id UUID, deduplicated BOOLEAN, enqueued_deliveries INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_event_id UUID; v_enqueued_count INTEGER := 0;
BEGIN
    IF p_tenant_id IS NULL OR p_event_type IS NULL OR p_payload IS NULL
       OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
       OR p_payload_raw IS NULL OR p_payload_sha256 IS NULL
       OR p_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'INVALID_WEBHOOK_EVENT: Required event fields are invalid.' USING ERRCODE = '22023';
    END IF;
    IF p_event_type NOT IN ('election.results.published', 'candidate.nomination.updated',
        'boundary.delimitation.updated', 'test.ping') THEN
        RAISE EXCEPTION 'UNSUPPORTED_WEBHOOK_EVENT_TYPE: Event type is not allowlisted.' USING ERRCODE = '22023';
    END IF;
    IF p_idempotency_key IS NOT NULL AND
       (pg_catalog.length(p_idempotency_key) < 1 OR pg_catalog.length(p_idempotency_key) > 256) THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: Key length must be between 1 and 256 characters.' USING ERRCODE = '22023';
    END IF;
    IF p_payload_raw::JSONB IS DISTINCT FROM p_payload THEN
        RAISE EXCEPTION 'WEBHOOK_PAYLOAD_PARITY_FAILURE: payload_raw does not represent payload.' USING ERRCODE = '22000';
    END IF;

    INSERT INTO public.webhook_events (tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256)
    VALUES (p_tenant_id, p_event_type, p_idempotency_key, p_payload, p_payload_raw, pg_catalog.lower(p_payload_sha256))
    ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
        SELECT e.id INTO v_event_id FROM public.webhook_events AS e
         WHERE e.tenant_id = p_tenant_id AND e.idempotency_key = p_idempotency_key;
        IF v_event_id IS NULL THEN
            RAISE EXCEPTION 'IDEMPOTENCY_RESOLUTION_FAILED: Existing event could not be resolved.' USING ERRCODE = '40001';
        END IF;
        RETURN QUERY SELECT v_event_id, TRUE, 0;
        RETURN;
    END IF;

    INSERT INTO public.webhook_deliveries (tenant_id, subscription_id, event_id, status, attempt_count)
    SELECT p_tenant_id, s.id, v_event_id, 'queued', 1
      FROM public.webhook_subscriptions AS s
     WHERE s.tenant_id = p_tenant_id AND s.status = 'active'
       AND ('*' = ANY(s.subscribed_events) OR p_event_type = ANY(s.subscribed_events))
    ON CONFLICT (subscription_id, event_id) DO NOTHING;
    GET DIAGNOSTICS v_enqueued_count = ROW_COUNT;
    RETURN QUERY SELECT v_event_id, FALSE, v_enqueued_count;
END;
$$;

-- PostgREST selects this role via a signed JWT. It cannot log in, inherit privileges,
-- bypass RLS, create objects, or read application tables directly.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'webhook_worker') THEN
        EXECUTE 'CREATE ROLE webhook_worker NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';
    END IF;
    EXECUTE 'ALTER ROLE webhook_worker WITH NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        RAISE EXCEPTION 'WEBHOOK_WORKER_ROLE_PROVISIONING_FAILED: Supabase authenticator role is missing.';
    END IF;
    EXECUTE 'GRANT webhook_worker TO authenticator';
END;
$$;

GRANT USAGE ON SCHEMA public TO webhook_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM webhook_worker;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM webhook_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM webhook_worker;

DROP FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER);
CREATE FUNCTION public.fn_claim_webhook_batch(
    p_batch_size INTEGER DEFAULT 10, p_lease_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
    delivery_id UUID, tenant_id UUID, application_id UUID, subscription_id UUID, event_id UUID,
    attempt_count INTEGER, lease_token UUID, leased_until TIMESTAMPTZ, delivery_created_at TIMESTAMPTZ,
    http_status INTEGER, execution_duration_ms INTEGER, error_message TEXT, next_retry_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ, endpoint_url TEXT, secret_ciphertext BYTEA, secret_iv BYTEA, secret_tag BYTEA,
    secret_key_version INTEGER, secret_hash VARCHAR(64), secret_hint VARCHAR(8), subscribed_events TEXT[],
    subscription_status TEXT, consecutive_failure_count INTEGER, subscription_created_at TIMESTAMPTZ,
    subscription_updated_at TIMESTAMPTZ, previous_secret_ciphertext BYTEA, previous_secret_iv BYTEA,
    previous_secret_tag BYTEA, previous_secret_expires_at TIMESTAMPTZ, event_type TEXT,
    idempotency_key TEXT, payload JSONB, payload_raw TEXT, payload_sha256 VARCHAR(64), event_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_now TIMESTAMPTZ := pg_catalog.clock_timestamp(); v_lease_until TIMESTAMPTZ;
BEGIN
    IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100 THEN
        RAISE EXCEPTION 'INVALID_BATCH_SIZE: Batch size must be between 1 and 100.' USING ERRCODE = '22023';
    END IF;
    IF p_lease_seconds IS NULL OR p_lease_seconds < 5 OR p_lease_seconds > 300 THEN
        RAISE EXCEPTION 'INVALID_LEASE_SECONDS: Lease duration must be between 5 and 300 seconds.' USING ERRCODE = '22023';
    END IF;
    v_lease_until := v_now + pg_catalog.make_interval(secs => p_lease_seconds);

    RETURN QUERY
    WITH claimable AS (
        SELECT d.id FROM public.webhook_deliveries AS d
        JOIN public.webhook_subscriptions AS s ON s.id = d.subscription_id AND s.tenant_id = d.tenant_id
        WHERE s.status = 'active'
          AND (d.status = 'queued' OR (d.status = 'retrying' AND d.next_retry_at <= v_now)
               OR (d.status = 'leased' AND d.leased_until < v_now))
        ORDER BY d.created_at ASC, d.id ASC LIMIT p_batch_size FOR UPDATE OF d SKIP LOCKED
    ), claimed AS (
        UPDATE public.webhook_deliveries AS d
           SET status = 'leased', lease_token = pg_catalog.gen_random_uuid(),
               leased_at = v_now, leased_until = v_lease_until
          FROM claimable AS c WHERE d.id = c.id
        RETURNING d.*
    )
    SELECT d.id, d.tenant_id, s.application_id, d.subscription_id, d.event_id, d.attempt_count,
           d.lease_token, d.leased_until, d.created_at, d.http_status, d.execution_duration_ms, d.error_message,
           d.next_retry_at, d.completed_at, s.endpoint_url, s.secret_ciphertext, s.secret_iv, s.secret_tag,
           s.secret_key_version, s.secret_hash, s.secret_hint, s.subscribed_events, s.status,
           s.consecutive_failure_count, s.created_at, s.updated_at,
           s.previous_secret_ciphertext, s.previous_secret_iv, s.previous_secret_tag, s.previous_secret_expires_at,
           e.event_type, e.idempotency_key, e.payload, e.payload_raw, e.payload_sha256, e.created_at
      FROM claimed AS d
      JOIN public.webhook_subscriptions AS s ON s.id = d.subscription_id AND s.tenant_id = d.tenant_id
      JOIN public.webhook_events AS e ON e.id = d.event_id AND e.tenant_id = d.tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_complete_webhook_delivery(
    p_delivery_id UUID, p_lease_token UUID, p_success BOOLEAN, p_http_status INTEGER,
    p_execution_duration_ms INTEGER, p_request_headers JSONB, p_response_headers JSONB,
    p_response_body_sample TEXT, p_error_message TEXT
)
RETURNS TABLE (updated BOOLEAN, terminal_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_delivery public.webhook_deliveries%ROWTYPE;
    v_status TEXT;
    v_next_retry TIMESTAMPTZ := NULL;
    v_completed_at TIMESTAMPTZ := NULL;
BEGIN
    IF p_delivery_id IS NULL OR p_lease_token IS NULL OR p_success IS NULL THEN
        RAISE EXCEPTION 'INVALID_WEBHOOK_COMPLETION: Delivery, lease token, and result are required.' USING ERRCODE = '22023';
    END IF;
    IF p_http_status IS NOT NULL AND (p_http_status < 100 OR p_http_status > 599) THEN
        RAISE EXCEPTION 'INVALID_WEBHOOK_HTTP_STATUS: HTTP status must be between 100 and 599.' USING ERRCODE = '22023';
    END IF;
    IF p_execution_duration_ms IS NULL OR p_execution_duration_ms < 0 THEN
        RAISE EXCEPTION 'INVALID_WEBHOOK_DURATION: Execution duration must be non-negative.' USING ERRCODE = '22023';
    END IF;
    IF p_response_body_sample IS NOT NULL AND pg_catalog.length(p_response_body_sample) > 1024 THEN
        RAISE EXCEPTION 'INVALID_RESPONSE_SAMPLE: Response sample exceeds 1024 characters.' USING ERRCODE = '22023';
    END IF;
    IF p_request_headers IS NOT NULL AND pg_catalog.jsonb_typeof(p_request_headers) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_REQUEST_HEADERS: Headers must be a JSON object.' USING ERRCODE = '22023';
    END IF;
    IF p_response_headers IS NOT NULL AND pg_catalog.jsonb_typeof(p_response_headers) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_RESPONSE_HEADERS: Headers must be a JSON object.' USING ERRCODE = '22023';
    END IF;

    SELECT d.* INTO v_delivery FROM public.webhook_deliveries AS d
     WHERE d.id = p_delivery_id AND d.lease_token = p_lease_token AND d.status = 'leased' FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT FALSE, NULL::TEXT; RETURN; END IF;

    IF p_success THEN
        v_status := 'delivered'; v_completed_at := pg_catalog.clock_timestamp();
    ELSIF v_delivery.attempt_count >= 5 THEN
        v_status := 'dead_letter'; v_completed_at := pg_catalog.clock_timestamp();
    ELSE
        v_status := 'retrying';
        v_next_retry := pg_catalog.clock_timestamp() + pg_catalog.make_interval(
            secs => CASE v_delivery.attempt_count WHEN 1 THEN 30 WHEN 2 THEN 300 WHEN 3 THEN 1800 ELSE 7200 END
        );
    END IF;

    UPDATE public.webhook_deliveries AS d
       SET status = v_status,
           attempt_count = CASE WHEN v_status = 'retrying' THEN v_delivery.attempt_count + 1 ELSE v_delivery.attempt_count END,
           next_retry_at = v_next_retry, http_status = p_http_status, execution_duration_ms = p_execution_duration_ms,
           request_headers = COALESCE(p_request_headers, '{}'::JSONB), response_headers = COALESCE(p_response_headers, '{}'::JSONB),
           response_body_sample = p_response_body_sample,
           error_message = CASE WHEN p_error_message IS NULL THEN NULL ELSE pg_catalog.left(p_error_message, 1024) END,
           completed_at = v_completed_at, lease_token = NULL, leased_at = NULL, leased_until = NULL
     WHERE d.id = v_delivery.id;

    IF p_success THEN
        UPDATE public.webhook_subscriptions AS s SET consecutive_failure_count = 0
         WHERE s.id = v_delivery.subscription_id AND s.tenant_id = v_delivery.tenant_id;
    ELSE
        UPDATE public.webhook_subscriptions AS s
           SET consecutive_failure_count = s.consecutive_failure_count + 1,
               status = CASE WHEN s.consecutive_failure_count + 1 >= 20 THEN 'failed' ELSE s.status END,
               updated_at = pg_catalog.clock_timestamp()
         WHERE s.id = v_delivery.subscription_id AND s.tenant_id = v_delivery.tenant_id;
    END IF;
    RETURN QUERY SELECT TRUE, v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recover_expired_webhook_leases(p_batch_size INTEGER DEFAULT 100)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_recovered INTEGER := 0;
BEGIN
    IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 1000 THEN
        RAISE EXCEPTION 'INVALID_RECOVERY_BATCH_SIZE: Batch size must be between 1 and 1000.' USING ERRCODE = '22023';
    END IF;
    WITH expired AS (
        SELECT d.id FROM public.webhook_deliveries AS d
         WHERE d.status = 'leased' AND d.leased_until < pg_catalog.clock_timestamp()
         ORDER BY d.leased_until ASC, d.id ASC LIMIT p_batch_size FOR UPDATE SKIP LOCKED
    ), recovered AS (
        UPDATE public.webhook_deliveries AS d
           SET status = CASE WHEN d.attempt_count >= 5 THEN 'dead_letter' ELSE 'queued' END,
               completed_at = CASE WHEN d.attempt_count >= 5 THEN pg_catalog.clock_timestamp() ELSE NULL END,
               next_retry_at = NULL,
               error_message = CASE
                   WHEN d.attempt_count >= 5 THEN COALESCE(d.error_message, 'LEASE_EXPIRED_AT_MAX_ATTEMPTS')
                   ELSE d.error_message
               END,
               lease_token = NULL, leased_at = NULL, leased_until = NULL
          FROM expired AS e WHERE d.id = e.id RETURNING d.id
    )
    SELECT pg_catalog.count(*)::INTEGER INTO v_recovered FROM recovered;
    RETURN v_recovered;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
    p_retention_days INTEGER DEFAULT 30, p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (purged_deliveries_count INTEGER, purged_events_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_deliv_count INTEGER := 0; v_event_count INTEGER := 0; v_cutoff TIMESTAMPTZ;
BEGIN
    IF p_retention_days IS NULL OR p_retention_days < 7 OR p_retention_days > 3650 THEN
        RAISE EXCEPTION 'INVALID_RETENTION_PERIOD: Retention must be between 7 and 3650 days.' USING ERRCODE = '22023';
    END IF;
    IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 5000 THEN
        RAISE EXCEPTION 'INVALID_BATCH_SIZE: Purge batch size must be between 1 and 5000.' USING ERRCODE = '22023';
    END IF;
    v_cutoff := pg_catalog.now() - pg_catalog.make_interval(days => p_retention_days);
    PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'true', true);

    WITH deleted_deliv AS (
        DELETE FROM public.webhook_deliveries WHERE id IN (
            SELECT d.id FROM public.webhook_deliveries AS d
             WHERE d.status IN ('delivered', 'dead_letter') AND d.completed_at < v_cutoff
             ORDER BY d.completed_at ASC, d.id ASC LIMIT p_batch_size
        ) RETURNING id
    ) SELECT pg_catalog.count(*)::INTEGER INTO v_deliv_count FROM deleted_deliv;

    WITH deleted_events AS (
        DELETE FROM public.webhook_events AS e WHERE e.id IN (
            SELECT evt.id FROM public.webhook_events AS evt
             WHERE evt.created_at < v_cutoff
               AND NOT EXISTS (SELECT 1 FROM public.webhook_deliveries AS d WHERE d.tenant_id = evt.tenant_id AND d.event_id = evt.id)
             ORDER BY evt.created_at ASC, evt.id ASC LIMIT p_batch_size
        ) RETURNING e.id
    ) SELECT pg_catalog.count(*)::INTEGER INTO v_event_count FROM deleted_events;

    PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'false', true);
    purged_deliveries_count := v_deliv_count;
    purged_events_count := v_event_count;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON public.webhook_events, public.webhook_deliveries FROM service_role;
REVOKE ALL ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_recover_expired_webhook_leases(INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_webhook_events_prevent_mutation() FROM PUBLIC, anon, authenticated, service_role, webhook_worker;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) TO webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_recover_expired_webhook_leases(INTEGER) TO webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO webhook_worker;

NOTIFY pgrst, 'reload schema';
COMMIT;
