ALTER TABLE public.state_budget_summaries ADD COLUMN IF NOT EXISTS source_verified_on date;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS source_verified_on date;
ALTER TABLE public.government_schemes ADD COLUMN IF NOT EXISTS source_verified_on date;
ALTER TABLE public.development_projects ADD COLUMN IF NOT EXISTS source_verified_on date;
ALTER TABLE public.public_hearings ADD COLUMN IF NOT EXISTS source_verified_on date;
ALTER TABLE public.election_promises ADD COLUMN IF NOT EXISTS source_verified_on date;

-- Backfill the recorded days of the source reviews that supplied migrations 123, 124, 129 and 130.
-- This is the date of the review, independent of the publisher's date and the row's write time.
WITH reviewed(state_code, fiscal_year, source_url, verified_on) AS (VALUES
  ('TS', '2025-26', 'https://www.telangana.gov.in/wp-content/uploads/2026/05/Budget-in-Brief.pdf', DATE '2026-11-20'),
  ('TS', '2026-27', 'https://www.telangana.gov.in/wp-content/uploads/2026/05/Budget-in-Brief.pdf', DATE '2026-11-20'),
  ('AP', '2025-26', 'https://apfinance.gov.in/...Bud%40et26-27/documents/Volume-VI.pdf#page=6', DATE '2026-11-21'),
  ('AP', '2026-27', 'https://apfinance.gov.in/...Bud%40et26-27/documents/Volume-VI.pdf#page=6', DATE '2026-11-21'),
  ('IN', '2025-26', 'https://www.indiabudget.gov.in/doc/Budget_at_Glance/budget_at_a_glance.pdf', DATE '2026-11-21'),
  ('IN', '2026-27', 'https://www.indiabudget.gov.in/doc/Budget_at_Glance/budget_at_a_glance.pdf', DATE '2026-11-21'),
  ('DL', '2025-26', 'https://delhiplanning.delhi.gov.in/sites/default/files/Planning/highlights_of_gnctd_budget_2026-27_english.pdf', DATE '2026-11-21'),
  ('DL', '2026-27', 'https://delhiplanning.delhi.gov.in/sites/default/files/Planning/highlights_of_gnctd_budget_2026-27_english.pdf', DATE '2026-11-21'),
  ('KA', '2025-26', 'https://varthe.karnataka.gov.in/newsdetails/69cb6e1b64391620c8052e7a', DATE '2026-11-21'),
  ('KA', '2026-27', 'https://varthe.karnataka.gov.in/newsdetails/69cb6e1b64391620c8052e7a', DATE '2026-11-21'),
  ('RJ', '2026-27', 'https://finance.rajasthan.gov.in/docs/budget/statebudget/2026-2027/pressnoteng2026-27.pdf', DATE '2026-11-21'),
  ('UP', '2026-27', 'https://budget.up.nic.in/budgetbhashan/budgetbhashan_2026_2027.pdf', DATE '2026-11-21')
)
UPDATE public.state_budget_summaries AS budget
SET source_verified_on = reviewed.verified_on
FROM reviewed
WHERE budget.state_code = reviewed.state_code
  AND budget.fiscal_year = reviewed.fiscal_year
  AND budget.source_url = reviewed.source_url
  AND budget.source_verified_on IS NULL;

UPDATE public.bills SET source_verified_on = DATE '2026-11-21'
WHERE source_verified_on IS NULL AND full_text_url IS NOT NULL AND id IN (
  '53ec00f9-a3f4-4811-a9e2-5c18446f61e1', 'b8800f21-836e-49f8-8b2e-bed591e75463', 'ea06ffb5-4eb7-40fc-934e-5f5b90151d23'
);

UPDATE public.government_schemes SET source_verified_on = DATE '2026-11-21'
WHERE source_verified_on IS NULL AND jsonb_array_length(documents) > 0 AND id IN (
  '9cb1307d-4c1c-4c66-b800-a257814ad4a1', '7123a606-3232-4314-8dec-9aa81b793222', '534fcf7e-678c-4511-ab93-8a39803e8829',
  '2b08be6b-04a8-427e-a5cd-b66a2d78a3c1', 'c1ead083-49d8-422c-8ced-c8d8d021ff50', '84bfea19-bbb2-44a6-9932-944facaf0380'
);

UPDATE public.development_projects SET source_verified_on = DATE '2026-11-21'
WHERE source_verified_on IS NULL AND source <> '' AND id IN (
  '553398b0-c994-4cd5-9c96-dc20b687ed68', '56deb5d8-6873-4d89-b37e-cf1b40db6092'
);

UPDATE public.public_hearings SET source_verified_on = DATE '2026-11-21'
WHERE source_verified_on IS NULL AND source_url IS NOT NULL AND id IN (
  'd9368f4d-516e-4ed5-926e-ce52a216b7f6', '4fb9fc04-fe29-4c5e-8aac-c0309382adbb'
);

WITH reviewed(id, verified_on) AS (VALUES
  ('31d94b2d-e36c-4d67-8ced-ddd559b516bb'::uuid, DATE '2026-11-20'),
  ('e2ee2d87-61c0-4f75-a0f6-ae8ac963506d', DATE '2026-11-20'),
  ('2c2cacd1-b5d1-43ff-8860-3db4191dd549', DATE '2026-11-21'),
  ('71455625-d596-4107-b718-34db24e5fe3f', DATE '2026-11-21'),
  ('bee03227-3bc6-4122-935c-f3bf21a52c23', DATE '2026-11-21')
)
UPDATE public.election_promises AS promise
SET source_verified_on = reviewed.verified_on
FROM reviewed
WHERE promise.id = reviewed.id AND promise.source_url IS NOT NULL AND promise.source_verified_on IS NULL;
