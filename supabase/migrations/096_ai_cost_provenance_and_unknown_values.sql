-- Remove costs that were previously calculated from embedded nominal rates.
-- Keep token usage and budget limits, but require an operator-sourced rate card
-- before production monetary cost can be reported or spend controls can proceed.

BEGIN;

ALTER TABLE public.ai_cost_ledger
  ALTER COLUMN cost_usd DROP NOT NULL,
  ALTER COLUMN cost_usd DROP DEFAULT,
  ALTER COLUMN cost_inr DROP NOT NULL,
  ALTER COLUMN cost_inr DROP DEFAULT;

ALTER TABLE public.ai_cost_ledger
  ADD COLUMN IF NOT EXISTS cost_basis TEXT,
  ADD COLUMN IF NOT EXISTS cost_rate_card_version TEXT,
  ADD COLUMN IF NOT EXISTS cost_rate_card_source TEXT,
  ADD COLUMN IF NOT EXISTS usage_basis TEXT;

ALTER TABLE public.ai_news_summary_cache
  ALTER COLUMN estimated_cost_usd DROP NOT NULL,
  ALTER COLUMN estimated_cost_usd DROP DEFAULT;

ALTER TABLE public.ai_news_summary_cache
  ADD COLUMN IF NOT EXISTS cost_basis TEXT,
  ADD COLUMN IF NOT EXISTS cost_rate_card_version TEXT,
  ADD COLUMN IF NOT EXISTS cost_rate_card_source TEXT,
  ADD COLUMN IF NOT EXISTS usage_basis TEXT;

ALTER TABLE public.ai_tenant_budgets
  ALTER COLUMN current_day_spend_usd DROP NOT NULL,
  ALTER COLUMN current_day_spend_usd DROP DEFAULT;

-- Historical rows have no stored rate-card version/source. Their monetary
-- values cannot be treated as verified, so clear those amounts while retaining
-- token counts, request records, and the configured daily limits.
UPDATE public.ai_cost_ledger
SET cost_usd = NULL,
    cost_inr = NULL,
    cost_basis = 'legacy_unverified',
    cost_rate_card_version = NULL,
    cost_rate_card_source = NULL,
    usage_basis = 'legacy_unverified'
WHERE cost_rate_card_version IS NULL;

UPDATE public.ai_news_summary_cache
SET estimated_cost_usd = NULL,
    cost_basis = 'legacy_unverified',
    cost_rate_card_version = NULL,
    cost_rate_card_source = NULL,
    usage_basis = 'legacy_unverified'
WHERE cost_rate_card_version IS NULL;

-- Day-to-date spend cannot be reconstructed from those unprovenanced costs.
-- The application keeps spend checks closed until the next budget reset.
UPDATE public.ai_tenant_budgets
SET current_day_spend_usd = NULL;

-- Keep durable budget increments and their audit-ledger row in one database
-- transaction so a ledger failure cannot leave an untraceable budget charge.
CREATE OR REPLACE FUNCTION public.record_ai_usage_and_ledger(
  p_tenant_id TEXT,
  p_tokens INTEGER,
  p_spend_usd NUMERIC,
  p_user_id VARCHAR(64),
  p_operation_type VARCHAR(64),
  p_provider VARCHAR(64),
  p_model VARCHAR(64),
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_usage_basis TEXT,
  p_cost_usd NUMERIC,
  p_cost_inr NUMERIC,
  p_cost_basis TEXT,
  p_cost_rate_card_version TEXT,
  p_cost_rate_card_source TEXT,
  p_latency_ms INTEGER,
  p_cache_hit BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_tenant_id TEXT;
BEGIN
  IF p_tenant_id IS NULL OR length(trim(p_tenant_id)) = 0
     OR p_tokens IS NULL OR p_tokens < 0
     OR p_prompt_tokens IS NULL OR p_prompt_tokens < 0
     OR p_completion_tokens IS NULL OR p_completion_tokens < 0
     OR p_tokens <> p_prompt_tokens + p_completion_tokens
     OR p_latency_ms IS NULL OR p_latency_ms < 0
     OR p_operation_type IS NULL OR p_provider IS NULL OR p_model IS NULL
     OR p_usage_basis IS NULL OR p_cost_basis IS NULL THEN
    RAISE EXCEPTION 'Invalid AI usage ledger input';
  END IF;
  IF p_spend_usd IS NOT NULL AND p_spend_usd < 0 THEN
    RAISE EXCEPTION 'AI spend cannot be negative';
  END IF;

  UPDATE public.ai_tenant_budgets AS budget
  SET current_day_tokens = budget.current_day_tokens + p_tokens,
      current_day_spend_usd = CASE
        WHEN budget.current_day_spend_usd IS NULL OR p_spend_usd IS NULL THEN NULL
        ELSE budget.current_day_spend_usd + p_spend_usd
      END,
      circuit_breaker_tripped = budget.circuit_breaker_tripped
        OR p_spend_usd IS NULL
        OR budget.current_day_tokens + p_tokens >= budget.daily_token_budget
        OR (budget.current_day_spend_usd IS NOT NULL
            AND p_spend_usd IS NOT NULL
            AND budget.current_day_spend_usd + p_spend_usd >= budget.daily_spend_limit_usd),
      updated_at = now()
  WHERE budget.tenant_id = p_tenant_id
  RETURNING budget.tenant_id INTO updated_tenant_id;

  IF updated_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_cost_ledger (
    tenant_id, user_id, operation_type, provider, model,
    prompt_tokens, completion_tokens, total_tokens, usage_basis,
    cost_usd, cost_inr, cost_basis, cost_rate_card_version, cost_rate_card_source,
    latency_ms, cache_hit, created_at
  ) VALUES (
    p_tenant_id, p_user_id, p_operation_type, p_provider, p_model,
    p_prompt_tokens, p_completion_tokens, p_tokens, p_usage_basis,
    p_cost_usd, p_cost_inr, p_cost_basis, p_cost_rate_card_version, p_cost_rate_card_source,
    p_latency_ms, COALESCE(p_cache_hit, FALSE), now()
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_usage_and_ledger(
  TEXT, INTEGER, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, TEXT,
  NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_usage_and_ledger(
  TEXT, INTEGER, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, TEXT,
  NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN
) TO service_role;

COMMIT;
