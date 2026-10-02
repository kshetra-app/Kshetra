-- ==============================================================================
-- 058_w021_saas_atomic_quota_enforcement.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G3 — Atomic Monthly Quota Enforcement
-- Authority: CTO FINAL REMEDIATION DIRECTIVE — W021-G3
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY PROHIBITED & AIR-GAPPED (ehfafcnimmjusyvplbah)
--
-- Objectives:
--   1. Provide an atomic database function for quota decision + durable usage increment:
--      public.fn_check_and_increment_saas_quota(...)
--   2. Tenant-level serialization boundary via row lock on public.saas_tenants (FOR UPDATE).
--   3. Invariant: For every tenant T, monthly_usage(T) <= monthly_quota(T) at all
--      observable committed states, even under arbitrary concurrent requests.
--   4. If U + 1 > C: reject with allowed=false, reason='MONTHLY_CEILING_EXCEEDED', NO increment.
--      Else: increment public.saas_usage_ledger atomically by 1 and return allowed=true.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_check_and_increment_saas_quota(
  p_tenant_id UUID,
  p_api_key_id UUID,
  p_hour_bucket TIMESTAMPTZ,
  p_month_start TIMESTAMPTZ,
  p_monthly_ceiling INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_monthly_usage BIGINT;
  v_new_monthly_usage BIGINT;
BEGIN
  -- 1. Tenant-level serialization boundary via exclusive row lock on saas_tenants
  SELECT id INTO v_tenant_id
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

  -- 2. Aggregate current monthly usage for the tenant across all hour_buckets in current UTC month
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_monthly_usage
  FROM public.saas_usage_ledger
  WHERE tenant_id = p_tenant_id
    AND hour_bucket >= p_month_start;

  -- 3. Invariant check: IF U + 1 > C -> REJECT without increment
  IF (v_current_monthly_usage + 1) > p_monthly_ceiling THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'MONTHLY_CEILING_EXCEEDED',
      'current_monthly_usage', v_current_monthly_usage,
      'monthly_ceiling', p_monthly_ceiling,
      'monthly_remaining', 0
    );
  END IF;

  -- 4. Within quota: Upsert durable increment into saas_usage_ledger
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
    'monthly_ceiling', p_monthly_ceiling,
    'monthly_remaining', GREATEST(0, p_monthly_ceiling - v_new_monthly_usage)
  );
END;
$$;

-- Restrict execution to service_role (defense-in-depth)
REVOKE ALL ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO service_role;

COMMIT;
