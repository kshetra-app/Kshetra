-- ==============================================================================
-- 058_w021_saas_atomic_quota_enforcement.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G3 — Atomic Monthly Quota Enforcement & Security Definer Boundary
-- Authority: CTO FINAL SECURITY REMEDIATION — W021-G3
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Objectives:
--   1. Provide an atomic database function for quota decision + durable usage increment:
--      public.fn_check_and_increment_saas_quota(...)
--   2. Tenant-level serialization boundary via row lock on public.saas_tenants (FOR UPDATE).
--   3. Invariant: For every tenant T, monthly_usage(T) <= monthly_quota(T) at all
--      observable committed states, even under arbitrary concurrent requests.
--   4. Monthly quota ceiling derived internally from persisted tenant tier:
--      free -> 10,000; pro -> 500,000; enterprise -> 10,000,000.
--      Zero reliance on caller-supplied quota ceiling.
--   5. Defense-in-depth parameter validation:
--      If p_api_key_id is provided, assert that saas_api_keys.tenant_id = p_tenant_id.
--      Cross-tenant key mismatch fails closed with error 'KEY_TENANT_MISMATCH'.
--   6. Strict SECURITY DEFINER execution boundary:
--      EXECUTE revoked from PUBLIC, anon, authenticated.
--      EXECUTE granted exclusively to service_role.
--      Fixed search_path = public, pg_temp with schema-qualified identifiers.
-- ==============================================================================

BEGIN;

-- Drop prior 5-parameter signature if present to avoid overload confusion
DROP FUNCTION IF EXISTS public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER);

CREATE OR REPLACE FUNCTION public.fn_check_and_increment_saas_quota(
  p_tenant_id UUID,
  p_api_key_id UUID,
  p_hour_bucket TIMESTAMPTZ,
  p_month_start TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_tier TEXT;
  v_monthly_ceiling INTEGER;
  v_current_monthly_usage BIGINT;
  v_new_monthly_usage BIGINT;
BEGIN
  -- 1. Tenant-level serialization boundary via exclusive row lock on saas_tenants
  SELECT id, tier INTO v_tenant_id, v_tenant_tier
  FROM public.saas_tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'TENANT_NOT_FOUND',
      'current_monthly_usage', 0
    );
  END IF;

  -- 2. Validate p_api_key_id ownership if provided (defense-in-depth against key/tenant mismatch)
  IF p_api_key_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.saas_api_keys
      WHERE id = p_api_key_id AND tenant_id = p_tenant_id
    ) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'KEY_TENANT_MISMATCH',
        'current_monthly_usage', 0
      );
    END IF;
  END IF;

  -- 3. Derive authoritative monthly ceiling internally from persisted tenant tier
  v_monthly_ceiling := CASE v_tenant_tier
    WHEN 'free' THEN 10000
    WHEN 'pro' THEN 500000
    WHEN 'enterprise' THEN 10000000
    ELSE 10000
  END;

  -- 4. Aggregate current monthly usage for the tenant across all hour_buckets in current UTC month
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_monthly_usage
  FROM public.saas_usage_ledger
  WHERE tenant_id = p_tenant_id
    AND hour_bucket >= p_month_start;

  -- 5. Invariant check: IF U + 1 > C -> REJECT without increment
  IF (v_current_monthly_usage + 1) > v_monthly_ceiling THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'MONTHLY_CEILING_EXCEEDED',
      'current_monthly_usage', v_current_monthly_usage,
      'monthly_ceiling', v_monthly_ceiling,
      'monthly_remaining', 0
    );
  END IF;

  -- 6. Within quota: Upsert durable increment into saas_usage_ledger
  INSERT INTO public.saas_usage_ledger (
    tenant_id,
    api_key_id,
    hour_bucket,
    request_count,
    error_count
  )
  VALUES (
    p_tenant_id,
    p_api_key_id,
    p_hour_bucket,
    1,
    0
  )
  ON CONFLICT (tenant_id, api_key_id, hour_bucket)
  DO UPDATE SET
    request_count = public.saas_usage_ledger.request_count + 1;

  v_new_monthly_usage := v_current_monthly_usage + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_monthly_usage', v_new_monthly_usage,
    'monthly_ceiling', v_monthly_ceiling,
    'monthly_remaining', GREATEST(0, v_monthly_ceiling - v_new_monthly_usage)
  );
END;
$$;

-- Restrict execution to service_role (defense-in-depth privilege boundary)
REVOKE ALL ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMIT;
