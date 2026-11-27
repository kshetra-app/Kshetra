BEGIN;

-- Budget in Brief, Overview table, July 2024. Use the table's gross
-- expenditure estimate and leave actuals absent without an audited figure.
INSERT INTO public.state_budget_summaries (
  state_code, fiscal_year, total_budget_crores, total_revised_crores, total_spent_crores,
  overall_utilization, fiscal_deficit_crores, revenue_deficit_crores, debt_to_gdp_ratio,
  source_url, budget_basis, source_verified_on
) VALUES (
  'TS', '2024-25', 291059.00, NULL, NULL, NULL, NULL, NULL, NULL,
  'https://www.telangana.gov.in/wp-content/uploads/2024/07/Budget-in-Brief.pdf',
  'gross_expenditure_estimate', DATE '2026-11-27'
)
ON CONFLICT (state_code, fiscal_year) DO NOTHING;

-- Reuse the schemes table. These entries describe operating benefits, while
-- election promises retain their own original dates and status evidence.
WITH cited_schemes (id, name, short_name, category, launched_date, ministry, description,
  eligibility, benefits, source_title, source_url) AS (
  VALUES (
    '7c1421c6-e59b-408d-9f10-cedcd7b4eb71'::uuid, 'Mahalakshmi Free Bus Travel', 'Mahalakshmi Bus Travel',
    'women_child', DATE '2023-12-09', 'Telangana State Road Transport Corporation',
    'Zero-fare travel on eligible Telangana State Road Transport Corporation services.',
    'Eligible women, girls and transgender residents of Telangana can travel with accepted proof of residence.',
    'Free travel at the point of boarding on covered services, subject to the operator’s rules.',
    'Mahabubnagar district Maha Lakshmi scheme and eligibility',
    'https://mahabubnagar.telangana.gov.in/scheme/maha-lakshmi-scheme/'
  ), (
    'ccf6b5cb-8e04-46f5-9e93-9cacf310f552', 'Rajiv Aarogyasri (Cheyutha)', 'Rajiv Aarogyasri',
    'health', DATE '2023-12-09', 'Aarogyasri Health Care Trust',
    'Health coverage for eligible families through the Rajiv Aarogyasri programme.',
    'Eligible economically disadvantaged families can confirm coverage with the Trust or an empanelled hospital.',
    'Up to ₹10 lakh of cover for eligible treatments at empanelled hospitals under programme rules.',
    'Telangana Government Cheyutha programme announcement',
    'https://www.telangana.gov.in/government-initiative/2023/12/cheyutha-scheme/'
  )
)
INSERT INTO public.government_schemes (
  id, name, short_name, category, launched_date, ministry, level, state_code, description,
  eligibility, benefits, budget_crores, beneficiaries_target, beneficiaries_actual,
  coverage_percent, documents, source_verified_on
)
SELECT s.id, s.name, s.short_name, s.category, s.launched_date, s.ministry, 'state', 'TS',
  s.description, s.eligibility, s.benefits, NULL, NULL, NULL, NULL,
  jsonb_build_array(jsonb_build_object('title', s.source_title, 'url', s.source_url)),
  DATE '2026-11-27'
FROM cited_schemes s
WHERE NOT EXISTS (
  SELECT 1 FROM public.government_schemes existing
  WHERE existing.state_code = 'TS'
    AND (lower(existing.name) = lower(s.name) OR lower(existing.short_name) = lower(s.short_name))
)
ON CONFLICT (id) DO NOTHING;

-- Add verified instructions to the existing scheme. The district page
-- describes how to apply and therefore belongs in the cited documents.
UPDATE public.government_schemes
SET documents = COALESCE(documents, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'title', 'Gruha Jyothi application instructions',
      'url', 'https://mulugu.telangana.gov.in/scheme/gruha-jyothi/'
    )),
    source_verified_on = DATE '2026-11-27',
    updated_at = now()
WHERE id = '2b08be6b-04a8-427e-a5cd-b66a2d78a3c1'
  AND state_code = 'TS'
  AND NOT COALESCE(documents, '[]'::jsonb) @>
    '[{"url":"https://mulugu.telangana.gov.in/scheme/gruha-jyothi/"}]'::jsonb;

COMMIT;
