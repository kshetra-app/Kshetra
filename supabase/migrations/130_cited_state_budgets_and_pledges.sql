-- Published budget estimates in crore. Surpluses do not go into the deficit field.
INSERT INTO public.state_budget_summaries (
  state_code, fiscal_year, total_budget_crores, total_revised_crores, total_spent_crores,
  overall_utilization, fiscal_deficit_crores, revenue_deficit_crores, debt_to_gdp_ratio,
  source_url, budget_basis
) VALUES
  ('DL', '2025-26', 100000, NULL, NULL, NULL, NULL, NULL, NULL,
   'https://delhiplanning.delhi.gov.in/sites/default/files/Planning/highlights_of_gnctd_budget_2026-27_english.pdf', 'published_budget_estimate'),
  ('DL', '2026-27', 103700, NULL, NULL, NULL, 16266.29, NULL, NULL,
   'https://delhiplanning.delhi.gov.in/sites/default/files/Planning/highlights_of_gnctd_budget_2026-27_english.pdf', 'published_budget_estimate'),
  ('KA', '2025-26', 409549, NULL, NULL, NULL, NULL, NULL, NULL,
   'https://varthe.karnataka.gov.in/newsdetails/69cb6e1b64391620c8052e7a', 'published_budget_estimate'),
  ('KA', '2026-27', 448004, NULL, NULL, NULL, 97449, 22957, 24.94,
   'https://varthe.karnataka.gov.in/newsdetails/69cb6e1b64391620c8052e7a', 'published_budget_estimate'),
  ('RJ', '2026-27', 610956, NULL, NULL, NULL, 79492.52, 24313.93, NULL,
   'https://finance.rajasthan.gov.in/docs/budget/statebudget/2026-2027/pressnoteng2026-27.pdf', 'published_budget_estimate'),
  ('UP', '2026-27', 912696.35, NULL, NULL, NULL, 118480.59, NULL, NULL,
   'https://budget.up.nic.in/budgetbhashan/budgetbhashan_2026_2027.pdf', 'gross_expenditure_estimate')
ON CONFLICT (state_code, fiscal_year) DO NOTHING;

-- Delivery refers to the documented introduction of the specific benefit. The evidence
-- is a dated government announcement or operator record distinct from the campaign source.
WITH cited_pledges (
  id, state_code, party, title, description, source, promise_url,
  promised_date, election_year, delivery_note, delivery_url, evidence_date
) AS (VALUES
  ('2c2cacd1-b5d1-43ff-8860-3db4191dd549'::uuid, 'TS', 'INC',
   'Introduce the Gruha Jyothi household electricity benefit',
   'The September 2023 election announcement included up to 200 units of free household electricity per month under Gruha Jyoti.',
   'campaign_speech', 'https://inc.in/congress-sandesh/national/congress-vijayabheri-creates-ripples-of-hope-of-victory',
   DATE '2023-09-17', 2023,
   'The Telangana Government announced the scheme launch on 27 February 2024. Households must meet the published eligibility and consumption rules.',
   'https://www.telangana.gov.in/gallery/2024/02/cm-launched-two-more-guarantees/', DATE '2024-02-27'),
  ('71455625-d596-4107-b718-34db24e5fe3f', 'TS', 'INC',
   'Introduce the ₹500 LPG cylinder benefit',
   'The September 2023 Mahalakshmi announcement included a ₹500 LPG cylinder benefit. This record covers the LPG pledge.',
   'campaign_speech', 'https://inc.in/congress-sandesh/national/congress-vijayabheri-creates-ripples-of-hope-of-victory',
   DATE '2023-09-17', 2023,
   'The Telangana Government announced the launch of the ₹500 cooking-gas cylinder benefit on 27 February 2024 for eligible households.',
   'https://www.telangana.gov.in/gallery/2024/02/cm-launched-two-more-guarantees/', DATE '2024-02-27'),
  ('bee03227-3bc6-4122-935c-f3bf21a52c23', 'AP', 'TDP',
   'Introduce free state bus travel for women',
   'The TDP–Jana Sena 2024 manifesto included free bus travel for women among its Super Six pledges.',
   'manifesto', 'https://images.hindustantimes.com/telugu/img/2024/04/30/original/TDP_Manifesto1_1714490825585.pdf',
   DATE '2024-04-30', 2024,
   'APSRTC records the Stree Shakti launch on 15 August 2025. Zero-fare travel applies to eligible residents and designated bus services.',
   'https://apsrtc.ap.gov.in/coverage.php', DATE '2025-08-15')
), saved AS (
  INSERT INTO public.election_promises (
    id, state_code, party, title, description, category, source, source_url,
    promised_date, status, delivery_percentage, election_year
  )
  SELECT p.id, p.state_code, p.party, p.title, p.description, 'welfare', p.source, p.promise_url,
    p.promised_date, 'delivered', 100, p.election_year
  FROM cited_pledges p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.election_promises existing
    WHERE existing.state_code = p.state_code AND existing.election_year = p.election_year
      AND existing.party = p.party AND lower(existing.title) = lower(p.title)
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO public.promise_updates (
  promise_id, from_status, to_status, note, updated_by_name, source_url, created_at
)
SELECT p.id, 'promised', 'delivered', p.delivery_note, 'Poligram evidence review', p.delivery_url,
  p.evidence_date::timestamp AT TIME ZONE 'Asia/Kolkata'
FROM cited_pledges p JOIN saved USING (id);
