-- ==============================================================================
-- 071_w022_webhook_integrity_remediation.sql
-- Forward-only W022 remediation. Production remains air-gapped; deployment
-- requires separate explicit authorization after local verification.
-- ==============================================================================

BEGIN;

-- Capability role only. Credential provisioning belongs to deployment/IaC.
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'webhook_worker') THEN
    CREATE ROLE webhook_worker NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$role$;
ALTER ROLE webhook_worker NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO webhook_worker;

-- Event persistence and fan-out share a single transaction.
CREATE OR REPLACE FUNCTION public.fn_enqueue_webhook_event(
  p_tenant_id UUID, p_event_type TEXT, p_idempotency_key TEXT,
  p_payload JSONB, p_payload_raw TEXT, p_payload_sha256 VARCHAR(64)
)
RETURNS TABLE(event_id UUID, deduplicated BOOLEAN, enqueued_deliveries INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_event_id UUID; v_rows INTEGER := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_event_type IS NULL OR p_event_type !~ '^[a-z0-9_.-]+
     OR p_payload IS NULL OR p_payload_raw IS NULL
     OR pg_catalog.octet_length(p_payload_raw) > 262144
     OR p_payload_sha256 IS NULL OR p_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_EVENT' USING ERRCODE = '22023';
  END IF;
  IF p_payload_raw::jsonb IS DISTINCT FROM p_payload THEN
    RAISE EXCEPTION 'WEBHOOK_PAYLOAD_PARITY_MISMATCH' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.webhook_events
    (tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256)
  VALUES (p_tenant_id, p_event_type, p_idempotency_key, p_payload, p_payload_raw, p_payload_sha256)
  ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL AND p_idempotency_key IS NOT NULL THEN
    SELECT e.id INTO v_event_id FROM public.webhook_events AS e
    WHERE e.tenant_id = p_tenant_id AND e.idempotency_key = p_idempotency_key;
    IF v_event_id IS NULL THEN
      RAISE EXCEPTION 'WEBHOOK_IDEMPOTENCY_RESOLUTION_FAILED' USING ERRCODE = '40001';
    END IF;
    event_id := v_event_id; deduplicated := TRUE; enqueued_deliveries := 0;
    RETURN NEXT; RETURN;
  ELSIF v_event_id IS NULL THEN
    RAISE EXCEPTION 'WEBHOOK_EVENT_INSERT_FAILED' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.webhook_deliveries
    (tenant_id, subscription_id, event_id, status, attempt_count)
  SELECT s.tenant_id, s.id, v_event_id, 'queued', 1
  FROM public.webhook_subscriptions AS s
  WHERE s.tenant_id = p_tenant_id AND s.status = 'active'
    AND ('*' = ANY(s.subscribed_events) OR p_event_type = ANY(s.subscribed_events))
  ON CONFLICT (subscription_id, event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  event_id := v_event_id; deduplicated := FALSE; enqueued_deliveries := v_rows;
  RETURN NEXT;
END;
$$;

-- The old flat PostgreSQL return shape did not match the nested TypeScript
-- adapter. Drop the old function before changing its RETURNS TABLE signature.
DROP FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER);
CREATE FUNCTION public.fn_claim_webhook_batch(
  p_batch_size INTEGER DEFAULT 10, p_lease_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
  delivery_id UUID, tenant_id UUID, subscription_id UUID, event_id UUID,
  attempt_count INTEGER, delivery_status TEXT, lease_token UUID, leased_until TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ, delivery_created_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  http_status INTEGER, execution_duration_ms INTEGER, error_message TEXT,
  request_headers JSONB, response_headers JSONB, response_body_sample TEXT,
  application_id UUID, endpoint_url TEXT, secret_ciphertext BYTEA, secret_iv BYTEA, secret_tag BYTEA,
  secret_key_version INTEGER, secret_hash VARCHAR(64), secret_hint VARCHAR(8), subscribed_events TEXT[],
  subscription_status TEXT, consecutive_failure_count INTEGER, subscription_created_at TIMESTAMPTZ,
  subscription_updated_at TIMESTAMPTZ, previous_secret_ciphertext BYTEA, previous_secret_iv BYTEA,
  previous_secret_tag BYTEA, previous_secret_expires_at TIMESTAMPTZ,
  event_type TEXT, idempotency_key TEXT, payload JSONB, payload_raw TEXT,
  payload_sha256 VARCHAR(64), event_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_now TIMESTAMPTZ := pg_catalog.now(); v_lease_until TIMESTAMPTZ;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100
     OR p_lease_seconds IS NULL OR p_lease_seconds < 5 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_CLAIM_BOUNDS' USING ERRCODE = '22023';
  END IF;
  v_lease_until := v_now + pg_catalog.make_interval(secs => p_lease_seconds);
  RETURN QUERY
  WITH claimable AS (
    SELECT d.id FROM public.webhook_deliveries AS d
    JOIN public.webhook_subscriptions AS eligible_sub
      ON eligible_sub.tenant_id = d.tenant_id AND eligible_sub.id = d.subscription_id
     AND eligible_sub.status = 'active'
    WHERE d.status = 'queued'
       OR (d.status = 'retrying' AND d.next_retry_at <= v_now)
       OR (d.status = 'leased' AND d.leased_until < v_now)
    ORDER BY d.created_at ASC, d.id ASC
    FOR UPDATE OF d SKIP LOCKED LIMIT p_batch_size
  ),
  claimed AS (
    UPDATE public.webhook_deliveries AS d
    SET status = 'leased', lease_token = pg_catalog.gen_random_uuid(),
        leased_at = v_now, leased_until = v_lease_until
    FROM claimable AS c WHERE d.id = c.id
    RETURNING d.id, d.tenant_id, d.subscription_id, d.event_id, d.attempt_count,
      d.status, d.lease_token, d.leased_until, d.next_retry_at, d.created_at,
      d.completed_at, d.http_status, d.execution_duration_ms, d.error_message,
      d.request_headers, d.response_headers, d.response_body_sample
  )
  SELECT c.id, c.tenant_id, c.subscription_id, c.event_id, c.attempt_count,
    c.status, c.lease_token, c.leased_until, c.next_retry_at, c.created_at,
    c.completed_at, c.http_status, c.execution_duration_ms, c.error_message,
    c.request_headers, c.response_headers, c.response_body_sample,
    s.application_id, s.endpoint_url, s.secret_ciphertext, s.secret_iv, s.secret_tag,
    s.secret_key_version, s.secret_hash, s.secret_hint, s.subscribed_events, s.status,
    s.consecutive_failure_count, s.created_at, s.updated_at,
    s.previous_secret_ciphertext, s.previous_secret_iv, s.previous_secret_tag,
    s.previous_secret_expires_at, e.event_type, e.idempotency_key, e.payload,
    e.payload_raw, e.payload_sha256, e.created_at
  FROM claimed AS c
  JOIN public.webhook_subscriptions AS s ON s.tenant_id = c.tenant_id AND s.id = c.subscription_id
  JOIN public.webhook_events AS e ON e.tenant_id = c.tenant_id AND e.id = c.event_id
  WHERE s.status = 'active';
END;
$$;

-- Delivery state transitions and circuit-breaker counters are a single transaction.
CREATE OR REPLACE FUNCTION public.fn_complete_webhook_delivery(
  p_delivery_id UUID, p_lease_token UUID, p_success BOOLEAN,
  p_http_status INTEGER, p_execution_duration_ms INTEGER,
  p_request_headers JSONB, p_response_headers JSONB,
  p_response_body_sample TEXT, p_error_message TEXT
)
RETURNS TABLE(updated BOOLEAN, terminal_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_delivery public.webhook_deliveries%ROWTYPE;
  v_new_status TEXT; v_new_attempt INTEGER; v_next_retry TIMESTAMPTZ; v_completed_at TIMESTAMPTZ;
BEGIN
  IF p_delivery_id IS NULL OR p_lease_token IS NULL OR p_success IS NULL
     OR p_execution_duration_ms IS NULL OR p_execution_duration_ms < 0
     OR (p_response_body_sample IS NOT NULL AND pg_catalog.octet_length(p_response_body_sample) > 1024) THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_COMPLETION' USING ERRCODE = '22023';
  END IF;
  SELECT d.* INTO v_delivery FROM public.webhook_deliveries AS d
  WHERE d.id = p_delivery_id AND d.lease_token = p_lease_token AND d.leased_until > pg_catalog.now() FOR UPDATE;
  IF NOT FOUND THEN
    updated := FALSE; terminal_status := NULL; RETURN NEXT; RETURN;
  END IF;

  v_new_attempt := v_delivery.attempt_count; v_next_retry := NULL; v_completed_at := NULL;
  IF p_success THEN
    v_new_status := 'delivered'; v_completed_at := pg_catalog.now();
  ELSIF v_delivery.attempt_count >= 5 THEN
    v_new_status := 'dead_letter'; v_completed_at := pg_catalog.now();
  ELSE
    v_new_status := 'retrying'; v_new_attempt := v_delivery.attempt_count + 1;
    v_next_retry := pg_catalog.now() + pg_catalog.make_interval(secs =>
      CASE v_delivery.attempt_count WHEN 1 THEN 30 WHEN 2 THEN 300 WHEN 3 THEN 1800 ELSE 7200 END);
  END IF;

  UPDATE public.webhook_deliveries AS d
  SET status = v_new_status, attempt_count = v_new_attempt, next_retry_at = v_next_retry,
      http_status = p_http_status, execution_duration_ms = p_execution_duration_ms,
      request_headers = COALESCE(p_request_headers, '{}'::jsonb),
      response_headers = COALESCE(p_response_headers, '{}'::jsonb),
      response_body_sample = p_response_body_sample, error_message = NULLIF(p_error_message, ''),
      completed_at = v_completed_at, lease_token = NULL, leased_at = NULL, leased_until = NULL
  WHERE d.id = p_delivery_id AND d.lease_token = p_lease_token;

  IF p_success THEN
    UPDATE public.webhook_subscriptions AS s
    SET consecutive_failure_count = 0, updated_at = pg_catalog.now()
    WHERE s.tenant_id = v_delivery.tenant_id AND s.id = v_delivery.subscription_id;
  ELSE
    UPDATE public.webhook_subscriptions AS s
    SET consecutive_failure_count = s.consecutive_failure_count + 1,
        status = CASE WHEN s.consecutive_failure_count + 1 >= 20 THEN 'failed' ELSE s.status END,
        updated_at = pg_catalog.now()
    WHERE s.tenant_id = v_delivery.tenant_id AND s.id = v_delivery.subscription_id;
  END IF;
  updated := TRUE; terminal_status := v_new_status; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recover_expired_webhook_leases()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.webhook_deliveries AS d
  SET status = 'queued', lease_token = NULL, leased_at = NULL, leased_until = NULL
  WHERE d.status = 'leased' AND d.leased_until < pg_catalog.now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_webhook_secret_material(
  p_tenant_id UUID, p_application_id UUID, p_subscription_id UUID
)
RETURNS TABLE(
  secret_ciphertext BYTEA, secret_iv BYTEA, secret_tag BYTEA,
  previous_secret_ciphertext BYTEA, previous_secret_iv BYTEA, previous_secret_tag BYTEA,
  previous_secret_expires_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT s.secret_ciphertext, s.secret_iv, s.secret_tag, s.previous_secret_ciphertext,
         s.previous_secret_iv, s.previous_secret_tag, s.previous_secret_expires_at
  FROM public.webhook_subscriptions AS s
  WHERE s.tenant_id = p_tenant_id AND s.application_id = p_application_id AND s.id = p_subscription_id
$$;

CREATE OR REPLACE FUNCTION public.fn_rotate_webhook_secret(
  p_tenant_id UUID, p_application_id UUID, p_subscription_id UUID,
  p_secret_ciphertext BYTEA, p_secret_iv BYTEA, p_secret_tag BYTEA,
  p_secret_key_version INTEGER, p_secret_hash VARCHAR(64), p_secret_hint VARCHAR(8),
  p_previous_secret_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_application_id IS NULL OR p_subscription_id IS NULL
     OR p_secret_ciphertext IS NULL OR p_secret_iv IS NULL OR p_secret_tag IS NULL
     OR p_secret_key_version IS NULL OR p_secret_key_version < 1
     OR p_secret_hash IS NULL OR p_secret_hash !~ '^[a-f0-9]{64}$'
     OR p_secret_hint IS NULL OR p_previous_secret_expires_at IS NULL
     OR p_previous_secret_expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_SECRET_ROTATION' USING ERRCODE = '22023';
  END IF;
  UPDATE public.webhook_subscriptions AS s
  SET previous_secret_ciphertext = s.secret_ciphertext, previous_secret_iv = s.secret_iv,
      previous_secret_tag = s.secret_tag, previous_secret_expires_at = p_previous_secret_expires_at,
      secret_ciphertext = p_secret_ciphertext, secret_iv = p_secret_iv, secret_tag = p_secret_tag,
      secret_key_version = p_secret_key_version, secret_hash = p_secret_hash,
      secret_hint = p_secret_hint, updated_at = pg_catalog.now()
  WHERE s.tenant_id = p_tenant_id AND s.application_id = p_application_id AND s.id = p_subscription_id;
  RETURN FOUND;
END;
$$;

-- Timezone-safe bounded purge. Trigger authorization remains the canonical purge function.
CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
  p_retention_days INTEGER DEFAULT 30, p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE(purged_deliveries_count INTEGER, purged_events_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_deliv_count INTEGER := 0; v_event_count INTEGER := 0; v_cutoff TIMESTAMPTZ;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 7 OR p_retention_days > 3650
     OR p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'INVALID_RETENTION_BOUNDS' USING ERRCODE = '22023';
  END IF;
  v_cutoff := pg_catalog.now() - pg_catalog.make_interval(days => p_retention_days);
  PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'true', true);

  WITH deleted_deliv AS (
    DELETE FROM public.webhook_deliveries AS d WHERE d.id IN (
      SELECT x.id FROM public.webhook_deliveries AS x
      WHERE x.status IN ('delivered', 'dead_letter') AND x.completed_at < v_cutoff
      ORDER BY x.completed_at ASC, x.id ASC LIMIT p_batch_size
    ) RETURNING d.id
  )
  SELECT pg_catalog.count(*)::INTEGER INTO v_deliv_count FROM deleted_deliv;

  WITH deleted_events AS (
    DELETE FROM public.webhook_events AS e WHERE e.id IN (
      SELECT x.id FROM public.webhook_events AS x
      WHERE x.created_at < v_cutoff
        AND NOT EXISTS (SELECT 1 FROM public.webhook_deliveries AS d
          WHERE d.tenant_id = x.tenant_id AND d.event_id = x.id)
      ORDER BY x.created_at ASC, x.id ASC LIMIT p_batch_size
    ) RETURNING e.id
  )
  SELECT pg_catalog.count(*)::INTEGER INTO v_event_count FROM deleted_events;

  PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'false', true);
  purged_deliveries_count := v_deliv_count; purged_events_count := v_event_count;
  RETURN NEXT;
END;
$$;

-- Direct reads/writes of event payloads and delivery state are RPC-only.
REVOKE ALL ON public.webhook_deliveries FROM service_role, webhook_worker;
REVOKE ALL ON public.webhook_events FROM service_role, webhook_worker;
REVOKE ALL ON public.webhook_subscriptions FROM service_role, webhook_worker;
GRANT SELECT (id, tenant_id, application_id, endpoint_url, secret_hash, secret_hint,
  subscribed_events, status, consecutive_failure_count, created_at, updated_at)
  ON public.webhook_subscriptions TO service_role;
GRANT INSERT (id, tenant_id, application_id, endpoint_url, secret_ciphertext, secret_iv,
  secret_tag, secret_key_version, secret_hash, secret_hint, subscribed_events, status)
  ON public.webhook_subscriptions TO service_role;
GRANT UPDATE (endpoint_url, subscribed_events, status, updated_at)
  ON public.webhook_subscriptions TO service_role;

REVOKE ALL ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_recover_expired_webhook_leases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_get_webhook_secret_material(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_rotate_webhook_secret(UUID, UUID, UUID, BYTEA, BYTEA, BYTEA, INTEGER, VARCHAR, VARCHAR, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_recover_expired_webhook_leases() TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_get_webhook_secret_material(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_rotate_webhook_secret(UUID, UUID, UUID, BYTEA, BYTEA, BYTEA, INTEGER, VARCHAR, VARCHAR, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO service_role, webhook_worker;

COMMIT;

     OR p_event_type NOT IN ('election.results.published', 'candidate.nomination.updated', 'boundary.delimitation.updated', 'test.ping')
     OR p_payload IS NULL OR p_payload_raw IS NULL
     OR pg_catalog.octet_length(p_payload_raw) > 262144
     OR p_payload_sha256 IS NULL OR p_payload_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_EVENT' USING ERRCODE = '22023';
  END IF;
  IF p_payload_raw::jsonb IS DISTINCT FROM p_payload THEN
    RAISE EXCEPTION 'WEBHOOK_PAYLOAD_PARITY_MISMATCH' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.webhook_events
    (tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256)
  VALUES (p_tenant_id, p_event_type, p_idempotency_key, p_payload, p_payload_raw, p_payload_sha256)
  ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL AND p_idempotency_key IS NOT NULL THEN
    SELECT e.id INTO v_event_id FROM public.webhook_events AS e
    WHERE e.tenant_id = p_tenant_id AND e.idempotency_key = p_idempotency_key;
    IF v_event_id IS NULL THEN
      RAISE EXCEPTION 'WEBHOOK_IDEMPOTENCY_RESOLUTION_FAILED' USING ERRCODE = '40001';
    END IF;
    event_id := v_event_id; deduplicated := TRUE; enqueued_deliveries := 0;
    RETURN NEXT; RETURN;
  ELSIF v_event_id IS NULL THEN
    RAISE EXCEPTION 'WEBHOOK_EVENT_INSERT_FAILED' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.webhook_deliveries
    (tenant_id, subscription_id, event_id, status, attempt_count)
  SELECT s.tenant_id, s.id, v_event_id, 'queued', 1
  FROM public.webhook_subscriptions AS s
  WHERE s.tenant_id = p_tenant_id AND s.status = 'active'
    AND ('*' = ANY(s.subscribed_events) OR p_event_type = ANY(s.subscribed_events))
  ON CONFLICT (subscription_id, event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  event_id := v_event_id; deduplicated := FALSE; enqueued_deliveries := v_rows;
  RETURN NEXT;
END;
$$;

-- The old flat PostgreSQL return shape did not match the nested TypeScript
-- adapter. Drop the old function before changing its RETURNS TABLE signature.
DROP FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER);
CREATE FUNCTION public.fn_claim_webhook_batch(
  p_batch_size INTEGER DEFAULT 10, p_lease_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
  delivery_id UUID, tenant_id UUID, subscription_id UUID, event_id UUID,
  attempt_count INTEGER, delivery_status TEXT, lease_token UUID, leased_until TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ, delivery_created_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  http_status INTEGER, execution_duration_ms INTEGER, error_message TEXT,
  request_headers JSONB, response_headers JSONB, response_body_sample TEXT,
  application_id UUID, endpoint_url TEXT, secret_ciphertext BYTEA, secret_iv BYTEA, secret_tag BYTEA,
  secret_key_version INTEGER, secret_hash VARCHAR(64), secret_hint VARCHAR(8), subscribed_events TEXT[],
  subscription_status TEXT, consecutive_failure_count INTEGER, subscription_created_at TIMESTAMPTZ,
  subscription_updated_at TIMESTAMPTZ, previous_secret_ciphertext BYTEA, previous_secret_iv BYTEA,
  previous_secret_tag BYTEA, previous_secret_expires_at TIMESTAMPTZ,
  event_type TEXT, idempotency_key TEXT, payload JSONB, payload_raw TEXT,
  payload_sha256 VARCHAR(64), event_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_now TIMESTAMPTZ := pg_catalog.now(); v_lease_until TIMESTAMPTZ;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100
     OR p_lease_seconds IS NULL OR p_lease_seconds < 5 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_CLAIM_BOUNDS' USING ERRCODE = '22023';
  END IF;
  v_lease_until := v_now + pg_catalog.make_interval(secs => p_lease_seconds);
  RETURN QUERY
  WITH claimable AS (
    SELECT d.id FROM public.webhook_deliveries AS d
    JOIN public.webhook_subscriptions AS eligible_sub
      ON eligible_sub.tenant_id = d.tenant_id AND eligible_sub.id = d.subscription_id
     AND eligible_sub.status = 'active'
    WHERE d.status = 'queued'
       OR (d.status = 'retrying' AND d.next_retry_at <= v_now)
       OR (d.status = 'leased' AND d.leased_until < v_now)
    ORDER BY d.created_at ASC, d.id ASC
    FOR UPDATE OF d SKIP LOCKED LIMIT p_batch_size
  ),
  claimed AS (
    UPDATE public.webhook_deliveries AS d
    SET status = 'leased', lease_token = pg_catalog.gen_random_uuid(),
        leased_at = v_now, leased_until = v_lease_until
    FROM claimable AS c WHERE d.id = c.id
    RETURNING d.id, d.tenant_id, d.subscription_id, d.event_id, d.attempt_count,
      d.status, d.lease_token, d.leased_until, d.next_retry_at, d.created_at,
      d.completed_at, d.http_status, d.execution_duration_ms, d.error_message,
      d.request_headers, d.response_headers, d.response_body_sample
  )
  SELECT c.id, c.tenant_id, c.subscription_id, c.event_id, c.attempt_count,
    c.status, c.lease_token, c.leased_until, c.next_retry_at, c.created_at,
    c.completed_at, c.http_status, c.execution_duration_ms, c.error_message,
    c.request_headers, c.response_headers, c.response_body_sample,
    s.application_id, s.endpoint_url, s.secret_ciphertext, s.secret_iv, s.secret_tag,
    s.secret_key_version, s.secret_hash, s.secret_hint, s.subscribed_events, s.status,
    s.consecutive_failure_count, s.created_at, s.updated_at,
    s.previous_secret_ciphertext, s.previous_secret_iv, s.previous_secret_tag,
    s.previous_secret_expires_at, e.event_type, e.idempotency_key, e.payload,
    e.payload_raw, e.payload_sha256, e.created_at
  FROM claimed AS c
  JOIN public.webhook_subscriptions AS s ON s.tenant_id = c.tenant_id AND s.id = c.subscription_id
  JOIN public.webhook_events AS e ON e.tenant_id = c.tenant_id AND e.id = c.event_id
  WHERE s.status = 'active';
END;
$$;

-- Delivery state transitions and circuit-breaker counters are a single transaction.
CREATE OR REPLACE FUNCTION public.fn_complete_webhook_delivery(
  p_delivery_id UUID, p_lease_token UUID, p_success BOOLEAN,
  p_http_status INTEGER, p_execution_duration_ms INTEGER,
  p_request_headers JSONB, p_response_headers JSONB,
  p_response_body_sample TEXT, p_error_message TEXT
)
RETURNS TABLE(updated BOOLEAN, terminal_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_delivery public.webhook_deliveries%ROWTYPE;
  v_new_status TEXT; v_new_attempt INTEGER; v_next_retry TIMESTAMPTZ; v_completed_at TIMESTAMPTZ;
BEGIN
  IF p_delivery_id IS NULL OR p_lease_token IS NULL OR p_success IS NULL
     OR p_execution_duration_ms IS NULL OR p_execution_duration_ms < 0
     OR (p_response_body_sample IS NOT NULL AND pg_catalog.octet_length(p_response_body_sample) > 1024) THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_COMPLETION' USING ERRCODE = '22023';
  END IF;
  SELECT d.* INTO v_delivery FROM public.webhook_deliveries AS d
  WHERE d.id = p_delivery_id AND d.lease_token = p_lease_token FOR UPDATE;
  IF NOT FOUND THEN
    updated := FALSE; terminal_status := NULL; RETURN NEXT; RETURN;
  END IF;

  v_new_attempt := v_delivery.attempt_count; v_next_retry := NULL; v_completed_at := NULL;
  IF p_success THEN
    v_new_status := 'delivered'; v_completed_at := pg_catalog.now();
  ELSIF v_delivery.attempt_count >= 5 THEN
    v_new_status := 'dead_letter'; v_completed_at := pg_catalog.now();
  ELSE
    v_new_status := 'retrying'; v_new_attempt := v_delivery.attempt_count + 1;
    v_next_retry := pg_catalog.now() + pg_catalog.make_interval(secs =>
      CASE v_delivery.attempt_count WHEN 1 THEN 30 WHEN 2 THEN 300 WHEN 3 THEN 1800 ELSE 7200 END);
  END IF;

  UPDATE public.webhook_deliveries AS d
  SET status = v_new_status, attempt_count = v_new_attempt, next_retry_at = v_next_retry,
      http_status = p_http_status, execution_duration_ms = p_execution_duration_ms,
      request_headers = COALESCE(p_request_headers, '{}'::jsonb),
      response_headers = COALESCE(p_response_headers, '{}'::jsonb),
      response_body_sample = p_response_body_sample, error_message = NULLIF(p_error_message, ''),
      completed_at = v_completed_at, lease_token = NULL, leased_at = NULL, leased_until = NULL
  WHERE d.id = p_delivery_id AND d.lease_token = p_lease_token;

  IF p_success THEN
    UPDATE public.webhook_subscriptions AS s
    SET consecutive_failure_count = 0, updated_at = pg_catalog.now()
    WHERE s.tenant_id = v_delivery.tenant_id AND s.id = v_delivery.subscription_id;
  ELSE
    UPDATE public.webhook_subscriptions AS s
    SET consecutive_failure_count = s.consecutive_failure_count + 1,
        status = CASE WHEN s.consecutive_failure_count + 1 >= 20 THEN 'failed' ELSE s.status END,
        updated_at = pg_catalog.now()
    WHERE s.tenant_id = v_delivery.tenant_id AND s.id = v_delivery.subscription_id;
  END IF;
  updated := TRUE; terminal_status := v_new_status; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recover_expired_webhook_leases()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.webhook_deliveries AS d
  SET status = 'queued', lease_token = NULL, leased_at = NULL, leased_until = NULL
  WHERE d.status = 'leased' AND d.leased_until < pg_catalog.now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_webhook_secret_material(
  p_tenant_id UUID, p_application_id UUID, p_subscription_id UUID
)
RETURNS TABLE(
  secret_ciphertext BYTEA, secret_iv BYTEA, secret_tag BYTEA,
  previous_secret_ciphertext BYTEA, previous_secret_iv BYTEA, previous_secret_tag BYTEA,
  previous_secret_expires_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
  SELECT s.secret_ciphertext, s.secret_iv, s.secret_tag, s.previous_secret_ciphertext,
         s.previous_secret_iv, s.previous_secret_tag, s.previous_secret_expires_at
  FROM public.webhook_subscriptions AS s
  WHERE s.tenant_id = p_tenant_id AND s.application_id = p_application_id AND s.id = p_subscription_id
$$;

CREATE OR REPLACE FUNCTION public.fn_rotate_webhook_secret(
  p_tenant_id UUID, p_application_id UUID, p_subscription_id UUID,
  p_secret_ciphertext BYTEA, p_secret_iv BYTEA, p_secret_tag BYTEA,
  p_secret_key_version INTEGER, p_secret_hash VARCHAR(64), p_secret_hint VARCHAR(8),
  p_previous_secret_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_application_id IS NULL OR p_subscription_id IS NULL
     OR p_secret_ciphertext IS NULL OR p_secret_iv IS NULL OR p_secret_tag IS NULL
     OR p_secret_key_version IS NULL OR p_secret_key_version < 1
     OR p_secret_hash IS NULL OR p_secret_hash !~ '^[a-f0-9]{64}$'
     OR p_secret_hint IS NULL OR p_previous_secret_expires_at IS NULL
     OR p_previous_secret_expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'INVALID_WEBHOOK_SECRET_ROTATION' USING ERRCODE = '22023';
  END IF;
  UPDATE public.webhook_subscriptions AS s
  SET previous_secret_ciphertext = s.secret_ciphertext, previous_secret_iv = s.secret_iv,
      previous_secret_tag = s.secret_tag, previous_secret_expires_at = p_previous_secret_expires_at,
      secret_ciphertext = p_secret_ciphertext, secret_iv = p_secret_iv, secret_tag = p_secret_tag,
      secret_key_version = p_secret_key_version, secret_hash = p_secret_hash,
      secret_hint = p_secret_hint, updated_at = pg_catalog.now()
  WHERE s.tenant_id = p_tenant_id AND s.application_id = p_application_id AND s.id = p_subscription_id;
  RETURN FOUND;
END;
$$;

-- Timezone-safe bounded purge. Trigger authorization remains the canonical purge function.
CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
  p_retention_days INTEGER DEFAULT 30, p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE(purged_deliveries_count INTEGER, purged_events_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_deliv_count INTEGER := 0; v_event_count INTEGER := 0; v_cutoff TIMESTAMPTZ;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 7 OR p_retention_days > 3650
     OR p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'INVALID_RETENTION_BOUNDS' USING ERRCODE = '22023';
  END IF;
  v_cutoff := pg_catalog.now() - pg_catalog.make_interval(days => p_retention_days);
  PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'true', true);

  WITH deleted_deliv AS (
    DELETE FROM public.webhook_deliveries AS d WHERE d.id IN (
      SELECT x.id FROM public.webhook_deliveries AS x
      WHERE x.status IN ('delivered', 'dead_letter') AND x.completed_at < v_cutoff
      ORDER BY x.completed_at ASC, x.id ASC LIMIT p_batch_size
    ) RETURNING d.id
  )
  SELECT pg_catalog.count(*)::INTEGER INTO v_deliv_count FROM deleted_deliv;

  WITH deleted_events AS (
    DELETE FROM public.webhook_events AS e WHERE e.id IN (
      SELECT x.id FROM public.webhook_events AS x
      WHERE x.created_at < v_cutoff
        AND NOT EXISTS (SELECT 1 FROM public.webhook_deliveries AS d
          WHERE d.tenant_id = x.tenant_id AND d.event_id = x.id)
      ORDER BY x.created_at ASC, x.id ASC LIMIT p_batch_size
    ) RETURNING e.id
  )
  SELECT pg_catalog.count(*)::INTEGER INTO v_event_count FROM deleted_events;

  PERFORM pg_catalog.set_config('app.retention_cleanup_authorized', 'false', true);
  purged_deliveries_count := v_deliv_count; purged_events_count := v_event_count;
  RETURN NEXT;
END;
$$;

-- Direct reads/writes of event payloads and delivery state are RPC-only.
REVOKE ALL ON public.webhook_deliveries FROM service_role, webhook_worker;
REVOKE ALL ON public.webhook_events FROM service_role, webhook_worker;
REVOKE ALL ON public.webhook_subscriptions FROM service_role, webhook_worker;
GRANT SELECT (id, tenant_id, application_id, endpoint_url, secret_hash, secret_hint,
  subscribed_events, status, consecutive_failure_count, created_at, updated_at)
  ON public.webhook_subscriptions TO service_role;
GRANT INSERT (id, tenant_id, application_id, endpoint_url, secret_ciphertext, secret_iv,
  secret_tag, secret_key_version, secret_hash, secret_hint, subscribed_events, status)
  ON public.webhook_subscriptions TO service_role;
GRANT UPDATE (endpoint_url, subscribed_events, status, updated_at)
  ON public.webhook_subscriptions TO service_role;

REVOKE ALL ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_recover_expired_webhook_leases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_get_webhook_secret_material(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_rotate_webhook_secret(UUID, UUID, UUID, BYTEA, BYTEA, BYTEA, INTEGER, VARCHAR, VARCHAR, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, VARCHAR) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, JSONB, TEXT, TEXT) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_recover_expired_webhook_leases() TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_get_webhook_secret_material(UUID, UUID, UUID) TO service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION public.fn_rotate_webhook_secret(UUID, UUID, UUID, BYTEA, BYTEA, BYTEA, INTEGER, VARCHAR, VARCHAR, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO service_role, webhook_worker;

COMMIT;
