-- W022-G10: Atomic event fan-out, lease-fenced completion, and restricted worker execution.
-- Forward-only migration. Production and staging changes require separate CTO authorization.
BEGIN;

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'webhook_worker') THEN
    CREATE ROLE webhook_worker
      NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSE
    ALTER ROLE webhook_worker
      NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$role$;

-- Keep the worker out of the public/PostgREST API schema. It only sees two private wrappers.
CREATE SCHEMA IF NOT EXISTS panin_webhook_worker;
REVOKE ALL ON SCHEMA panin_webhook_worker FROM PUBLIC, anon, authenticated, service_role, webhook_worker;
GRANT USAGE ON SCHEMA panin_webhook_worker TO webhook_worker;

-- An existing role must not retain role-membership paths to administrative principals.
DO $memberships$
DECLARE
  membership RECORD;
BEGIN
  FOR membership IN
    SELECT granted.rolname AS granted_role
    FROM pg_catalog.pg_auth_members AS m
    JOIN pg_catalog.pg_roles AS member ON member.oid = m.member
    JOIN pg_catalog.pg_roles AS granted ON granted.oid = m.roleid
    WHERE member.rolname = 'webhook_worker'
  LOOP
    EXECUTE format('REVOKE %I FROM webhook_worker', membership.granted_role);
  END LOOP;
END
$memberships$;

DO $connect$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO webhook_worker', current_database());
END
$connect$;

-- The worker must operate exclusively through SECURITY DEFINER functions.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM webhook_worker;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM webhook_worker;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM webhook_worker;
REVOKE ALL PRIVILEGES ON TABLE public.webhook_events, public.webhook_deliveries FROM service_role;

-- Harden the pre-existing retention RPC against NULL/unbounded batch parameters.
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
    IF p_retention_days IS NULL OR p_retention_days < 7 OR p_retention_days > 3650 THEN
        RAISE EXCEPTION 'INVALID_RETENTION_PERIOD: Retention must be between 7 and 3650 days.'
            USING ERRCODE = '22023';
    END IF;
    IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 5000 THEN
        RAISE EXCEPTION 'INVALID_BATCH_SIZE: Retention batch size must be between 1 and 5000.'
            USING ERRCODE = '22023';
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

-- Recreate the claim function with a stable, explicit row contract and active-subscription gate.
DROP FUNCTION IF EXISTS public.fn_claim_webhook_batch(INTEGER, INTEGER);

CREATE FUNCTION public.fn_claim_webhook_batch(
  p_batch_size INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  delivery_id UUID,
  tenant_id UUID,
  subscription_id UUID,
  application_id UUID,
  event_id UUID,
  attempt_count INTEGER,
  lease_token UUID,
  leased_until TIMESTAMPTZ,
  delivery_created_at TIMESTAMPTZ,
  endpoint_url TEXT,
  secret_hint VARCHAR(8),
  secret_hash VARCHAR(64),
  secret_ciphertext BYTEA,
  secret_iv BYTEA,
  secret_tag BYTEA,
  secret_key_version INTEGER,
  previous_secret_ciphertext BYTEA,
  previous_secret_iv BYTEA,
  previous_secret_tag BYTEA,
  previous_secret_expires_at TIMESTAMPTZ,
  subscribed_events TEXT[],
  subscription_status TEXT,
  consecutive_failure_count INTEGER,
  subscription_created_at TIMESTAMPTZ,
  subscription_updated_at TIMESTAMPTZ,
  event_type TEXT,
  event_payload JSONB,
  payload_raw TEXT,
  payload_sha256 VARCHAR(64),
  event_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 50 THEN
    RAISE EXCEPTION 'INVALID_BATCH_SIZE: batch size must be between 1 and 50.'
      USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'INVALID_LEASE_DURATION: lease must be between 15 and 300 seconds.'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT d.id
    FROM public.webhook_deliveries AS d
    JOIN public.webhook_subscriptions AS s
      ON s.id = d.subscription_id
     AND s.tenant_id = d.tenant_id
    WHERE s.status = 'active'
      AND (
        d.status = 'queued'
        OR (d.status = 'retrying' AND d.next_retry_at IS NOT NULL AND d.next_retry_at <= v_now)
        OR (d.status = 'leased' AND d.leased_until IS NOT NULL AND d.leased_until <= v_now)
      )
    ORDER BY COALESCE(d.next_retry_at, d.created_at), d.created_at, d.id
    LIMIT p_batch_size
    FOR UPDATE OF d SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.webhook_deliveries AS d
       SET status = 'leased',
           lease_token = gen_random_uuid(),
           leased_until = v_now + make_interval(secs => p_lease_seconds),
           next_retry_at = NULL
      FROM claimable AS c
     WHERE d.id = c.id
    RETURNING d.id, d.tenant_id, d.subscription_id, d.event_id,
              d.attempt_count, d.lease_token, d.leased_until, d.created_at
  )
  SELECT
    c.id,
    c.tenant_id,
    c.subscription_id,
    s.application_id,
    c.event_id,
    c.attempt_count,
    c.lease_token,
    c.leased_until,
    c.created_at,
    s.endpoint_url,
    s.secret_hint,
    s.secret_hash,
    s.secret_ciphertext,
    s.secret_iv,
    s.secret_tag,
    s.secret_key_version,
    s.previous_secret_ciphertext,
    s.previous_secret_iv,
    s.previous_secret_tag,
    s.previous_secret_expires_at,
    s.subscribed_events,
    s.status,
    s.consecutive_failure_count,
    s.created_at,
    s.updated_at,
    e.event_type,
    e.payload,
    e.payload_raw,
    e.payload_sha256,
    e.created_at
  FROM claimed AS c
  JOIN public.webhook_subscriptions AS s
    ON s.id = c.subscription_id
   AND s.tenant_id = c.tenant_id
   AND s.status = 'active'
  JOIN public.webhook_events AS e
    ON e.id = c.event_id
   AND e.tenant_id = c.tenant_id;
END;
$function$;

CREATE FUNCTION public.fn_enqueue_webhook_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB,
  p_payload_raw TEXT,
  p_payload_sha256 TEXT
)
RETURNS TABLE (event_id UUID, deduplicated BOOLEAN, enqueued_deliveries INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_event_id UUID;
  v_delivery_count INTEGER := 0;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TENANT: tenant id is required.' USING ERRCODE = '22023';
  END IF;
  IF p_event_type IS NULL OR p_event_type NOT IN (
    'election.results.published',
    'candidate.nomination.updated',
    'boundary.delimitation.updated',
    'test.ping'
  ) THEN
    RAISE EXCEPTION 'INVALID_EVENT_TYPE: event type is not allowlisted.' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR p_payload_raw IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: a JSON object and its persisted raw bytes are required.'
      USING ERRCODE = '22023';
  END IF;
  IF octet_length(p_payload_raw) > 262144 THEN
    RAISE EXCEPTION 'PAYLOAD_TOO_LARGE: event payload exceeds 256 KiB.' USING ERRCODE = '22023';
  END IF;
  IF p_payload_raw::jsonb IS DISTINCT FROM p_payload THEN
    RAISE EXCEPTION 'PAYLOAD_ENCODING_MISMATCH: raw payload and JSON value differ.'
      USING ERRCODE = '22023';
  END IF;
  IF p_payload_sha256 IS NULL OR p_payload_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD_HASH: expected lowercase SHA-256 hex.' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NOT NULL AND (length(p_idempotency_key) < 1 OR length(p_idempotency_key) > 255) THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: key length must be 1..255.' USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.webhook_events (
      tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
    ) VALUES (
      p_tenant_id, p_event_type, p_idempotency_key, p_payload, p_payload_raw, p_payload_sha256
    )
    ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
      SELECT e.id INTO v_event_id
      FROM public.webhook_events AS e
      WHERE e.tenant_id = p_tenant_id
        AND e.idempotency_key = p_idempotency_key;

      IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'IDEMPOTENCY_LOOKUP_FAILED: retry the enqueue operation.'
          USING ERRCODE = '40001';
      END IF;

      RETURN QUERY SELECT v_event_id, TRUE, 0;
      RETURN;
    END IF;
  ELSE
    INSERT INTO public.webhook_events (
      tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
    ) VALUES (
      p_tenant_id, p_event_type, NULL, p_payload, p_payload_raw, p_payload_sha256
    )
    RETURNING id INTO v_event_id;
  END IF;

  INSERT INTO public.webhook_deliveries (
    tenant_id, subscription_id, event_id, status, attempt_count
  )
  SELECT
    p_tenant_id, s.id, v_event_id, 'queued', 1
  FROM public.webhook_subscriptions AS s
  WHERE s.tenant_id = p_tenant_id
    AND s.status = 'active'
    AND (s.subscribed_events @> ARRAY[p_event_type]::TEXT[] OR '*' = ANY(s.subscribed_events));

  GET DIAGNOSTICS v_delivery_count = ROW_COUNT;
  RETURN QUERY SELECT v_event_id, FALSE, v_delivery_count;
END;
$function$;

CREATE FUNCTION public.fn_complete_webhook_delivery(
  p_delivery_id UUID,
  p_lease_token UUID,
  p_success BOOLEAN,
  p_http_status INTEGER DEFAULT NULL,
  p_execution_duration_ms INTEGER DEFAULT NULL,
  p_response_headers JSONB DEFAULT '{}'::jsonb,
  p_response_body_sample TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS TABLE (updated BOOLEAN, terminal_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_tenant_id UUID;
  v_subscription_id UUID;
  v_status TEXT;
  v_failure_count INTEGER;
  v_subscription_status TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_delivery_id IS NULL OR p_lease_token IS NULL OR p_success IS NULL THEN
    RAISE EXCEPTION 'INVALID_COMPLETION: delivery id, lease token, and success flag are required.'
      USING ERRCODE = '22023';
  END IF;
  IF p_response_headers IS NOT NULL AND jsonb_typeof(p_response_headers) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_RESPONSE_HEADERS: expected a JSON object.' USING ERRCODE = '22023';
  END IF;
  IF p_execution_duration_ms IS NOT NULL AND p_execution_duration_ms < 0 THEN
    RAISE EXCEPTION 'INVALID_EXECUTION_DURATION: duration cannot be negative.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.webhook_deliveries AS d
     SET status = CASE
           WHEN p_success THEN 'delivered'
           WHEN d.attempt_count >= 5 THEN 'dead_letter'
           ELSE 'retrying'
         END,
         attempt_count = CASE
           WHEN NOT p_success AND d.attempt_count < 5 THEN d.attempt_count + 1
           ELSE d.attempt_count
         END,
         next_retry_at = CASE
           WHEN p_success OR d.attempt_count >= 5 THEN NULL
           ELSE v_now + CASE d.attempt_count
             WHEN 1 THEN INTERVAL '30 seconds'
             WHEN 2 THEN INTERVAL '5 minutes'
             WHEN 3 THEN INTERVAL '30 minutes'
             ELSE INTERVAL '2 hours'
           END
         END,
         http_status = p_http_status,
         execution_duration_ms = p_execution_duration_ms,
         response_headers = COALESCE(p_response_headers, '{}'::jsonb),
         response_body_sample = CASE WHEN p_response_body_sample IS NULL THEN NULL ELSE left(p_response_body_sample, 1024) END,
         error_message = CASE WHEN p_error_message IS NULL THEN NULL ELSE left(p_error_message, 1024) END,
         completed_at = CASE WHEN p_success OR d.attempt_count >= 5 THEN v_now ELSE NULL END,
         lease_token = NULL,
         leased_until = NULL
   WHERE d.id = p_delivery_id
     AND d.lease_token = p_lease_token
     AND d.status = 'leased'
     AND d.leased_until > v_now
  RETURNING d.tenant_id, d.subscription_id, d.status
       INTO v_tenant_id, v_subscription_id, v_status;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.webhook_subscriptions AS s
     SET consecutive_failure_count = CASE WHEN p_success THEN 0 ELSE s.consecutive_failure_count + 1 END,
         status = CASE
           WHEN NOT p_success AND s.status = 'active' AND s.consecutive_failure_count + 1 >= 20 THEN 'failed'
           ELSE s.status
         END,
         updated_at = v_now
   WHERE s.id = v_subscription_id
     AND s.tenant_id = v_tenant_id
  RETURNING s.consecutive_failure_count, s.status
       INTO v_failure_count, v_subscription_status;

  IF NOT p_success AND v_subscription_status = 'failed' AND v_failure_count >= 20 THEN
    UPDATE public.webhook_deliveries AS d
       SET status = 'dead_letter',
           completed_at = v_now,
           next_retry_at = NULL,
           lease_token = NULL,
           leased_until = NULL,
           error_message = COALESCE(d.error_message, 'SUBSCRIPTION_CIRCUIT_BREAKER_OPEN')
     WHERE d.tenant_id = v_tenant_id
       AND d.subscription_id = v_subscription_id
       AND d.status IN ('queued', 'retrying');
    v_status := 'dead_letter';
  END IF;

  RETURN QUERY SELECT TRUE, v_status;
END;
$function$;

CREATE FUNCTION public.fn_recover_expired_webhook_leases()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.webhook_deliveries AS d
     SET status = 'queued',
         lease_token = NULL,
         leased_until = NULL,
         next_retry_at = NULL
   WHERE d.status = 'leased'
     AND d.leased_until <= clock_timestamp();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- Private-schema wrappers let the worker execute exactly two operations without USAGE on public.
CREATE FUNCTION panin_webhook_worker.claim_webhook_batch(
  p_batch_size INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  delivery_id UUID,
  tenant_id UUID,
  subscription_id UUID,
  application_id UUID,
  event_id UUID,
  attempt_count INTEGER,
  lease_token UUID,
  leased_until TIMESTAMPTZ,
  delivery_created_at TIMESTAMPTZ,
  endpoint_url TEXT,
  secret_hint VARCHAR(8),
  secret_hash VARCHAR(64),
  secret_ciphertext BYTEA,
  secret_iv BYTEA,
  secret_tag BYTEA,
  secret_key_version INTEGER,
  previous_secret_ciphertext BYTEA,
  previous_secret_iv BYTEA,
  previous_secret_tag BYTEA,
  previous_secret_expires_at TIMESTAMPTZ,
  subscribed_events TEXT[],
  subscription_status TEXT,
  consecutive_failure_count INTEGER,
  subscription_created_at TIMESTAMPTZ,
  subscription_updated_at TIMESTAMPTZ,
  event_type TEXT,
  event_payload JSONB,
  payload_raw TEXT,
  payload_sha256 VARCHAR(64),
  event_created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT * FROM public.fn_claim_webhook_batch(p_batch_size, p_lease_seconds)
$function$;

CREATE FUNCTION panin_webhook_worker.complete_webhook_delivery(
  p_delivery_id UUID,
  p_lease_token UUID,
  p_success BOOLEAN,
  p_http_status INTEGER DEFAULT NULL,
  p_execution_duration_ms INTEGER DEFAULT NULL,
  p_response_headers JSONB DEFAULT '{}'::jsonb,
  p_response_body_sample TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS TABLE (updated BOOLEAN, terminal_status TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT * FROM public.fn_complete_webhook_delivery(
    p_delivery_id, p_lease_token, p_success, p_http_status,
    p_execution_duration_ms, p_response_headers, p_response_body_sample, p_error_message
  )
$function$;

REVOKE ALL ON FUNCTION panin_webhook_worker.claim_webhook_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role, webhook_worker;
REVOKE ALL ON FUNCTION panin_webhook_worker.complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role, webhook_worker;
GRANT EXECUTE ON FUNCTION panin_webhook_worker.claim_webhook_batch(INTEGER, INTEGER) TO webhook_worker;
GRANT EXECUTE ON FUNCTION panin_webhook_worker.complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, TEXT, TEXT) TO webhook_worker;

-- Function EXECUTE is deliberately not inherited through PUBLIC.
REVOKE ALL ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role, webhook_worker;
REVOKE ALL ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated, webhook_worker;
REVOKE ALL ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role, webhook_worker;
REVOKE ALL ON FUNCTION public.fn_recover_expired_webhook_leases() FROM PUBLIC, anon, authenticated, webhook_worker;

GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_enqueue_webhook_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_complete_webhook_delivery(UUID, UUID, BOOLEAN, INTEGER, INTEGER, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_recover_expired_webhook_leases() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data(INTEGER, INTEGER) TO service_role;

COMMENT ON ROLE webhook_worker IS
  'PANIN W022 restricted worker principal; NOLOGIN by migration. Deployment must provision credentials out-of-band. No direct webhook table grants.';

COMMIT;
