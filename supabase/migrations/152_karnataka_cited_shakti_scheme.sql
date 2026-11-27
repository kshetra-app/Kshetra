BEGIN;

-- District Bengaluru Urban publishes the commencement date, travel eligibility,
-- covered services, and the documents passengers can use.
INSERT INTO public.government_schemes (
  id, name, short_name, category, launched_date, ministry, level, state_code,
  description, eligibility, benefits, budget_crores, beneficiaries_target,
  beneficiaries_actual, coverage_percent, documents, source_verified_on
)
SELECT
  'e2ab7839-92f9-4763-990c-fa2f0e41ccfc'::uuid,
  'Shakti Free Bus Travel', 'Shakti', 'women_child', DATE '2023-06-11',
  'Karnataka Transport Department', 'state', 'KA',
  'Zero-fare travel on covered services run by Karnataka''s state transport corporations.',
  'Women, eligible girls aged six or older, and gender minorities domiciled in Karnataka. Carry accepted photo identification.',
  'Free travel within Karnataka on covered city, ordinary, and express services. Premium services and most inter-state travel are excluded.',
  NULL, NULL, NULL, NULL,
  jsonb_build_array(jsonb_build_object(
    'title', 'Government of Karnataka Shakti eligibility and accepted identification',
    'url', 'https://bengaluruurban.nic.in/en/scheme/shakti-scheme/'
  )),
  DATE '2026-11-27'
WHERE NOT EXISTS (
  SELECT 1 FROM public.government_schemes
  WHERE state_code = 'KA' AND (name ~* '^(sha[ck]thi|sha[ck]ti)(\y|$)'
    OR short_name ~* '^(sha[ck]thi|sha[ck]ti)(\y|$)'
    OR documents @> '[{"url":"https://bengaluruurban.nic.in/en/scheme/shakti-scheme/"}]')
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
