ALTER TABLE public.state_budget_summaries
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS budget_basis text;

-- Telangana Government, Budget in Brief 2026–27, fiscal overview and Table 1.
-- Gross expenditure includes Ways and Means Advances. An estimate is not actual spending.
INSERT INTO public.state_budget_summaries (
  state_code, fiscal_year, total_budget_crores, total_revised_crores, total_spent_crores,
  overall_utilization, fiscal_deficit_crores, revenue_deficit_crores, debt_to_gdp_ratio,
  source_url, budget_basis
) VALUES
  ('TS', '2025-26', 304965.00, 281338.76, NULL, NULL, NULL, NULL, NULL,
   'https://www.telangana.gov.in/wp-content/uploads/2026/05/Budget-in-Brief.pdf', 'gross_expenditure_estimate'),
  ('TS', '2026-27', 324234.00, NULL, NULL, NULL, 58458.71, NULL, NULL,
   'https://www.telangana.gov.in/wp-content/uploads/2026/05/Budget-in-Brief.pdf', 'gross_expenditure_estimate')
ON CONFLICT (state_code, fiscal_year) DO NOTHING;
