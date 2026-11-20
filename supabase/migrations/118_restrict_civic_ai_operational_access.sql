BEGIN;

ALTER TABLE public.ai_cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_news_summary_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tenant_budgets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_cost_ledger, public.ai_news_summary_cache, public.ai_tenant_budgets
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ai_cost_ledger, public.ai_news_summary_cache, public.ai_tenant_budgets
  TO service_role;

UPDATE public.ai_tenant_budgets AS budget
SET current_day_spend_usd = 0
WHERE budget.tenant_id = 'default_tenant' AND budget.current_day_tokens = 0
  AND NOT EXISTS (SELECT 1 FROM public.ai_cost_ledger WHERE tenant_id = budget.tenant_id);

COMMIT;
