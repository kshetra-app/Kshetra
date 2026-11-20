-- Each row tracks a specific 2023 pledge with a separately cited launch or policy change.
-- The September 23 party publication records the September 17 announcement.
WITH pledge_evidence(id, title, description, category, delivery_note) AS (
  VALUES
    (
      '31d94b2d-e36c-4d67-8ced-ddd559b516bb'::uuid,
      'Introduce free travel for women on eligible state buses',
      'The September 2023 Mahalakshmi announcement included free state bus travel for women. This record covers the transport pledge.',
      'welfare',
      'The Telangana Government recorded the launch on 9 December 2023. The free fare applies to eligible state bus services.'
    ),
    (
      'e2ee2d87-61c0-4f75-a0f6-ae8ac963506d'::uuid,
      'Raise Rajiv Aarogyasri health coverage to ₹10 lakh',
      'The September 2023 election announcement included increasing the Rajiv Aarogyasri health coverage limit to ₹10 lakh.',
      'healthcare',
      'The Telangana Government recorded the increase from ₹5 lakh to ₹10 lakh effective from 9 December 2023.'
    )
), saved AS (
  INSERT INTO public.election_promises (
    id, state_code, party, title, description, category, source, source_url,
    promised_date, status, delivery_percentage, election_year
  )
  SELECT p.id, 'TS', 'INC', p.title, p.description, p.category, 'campaign_speech',
    'https://inc.in/congress-sandesh/national/congress-vijayabheri-creates-ripples-of-hope-of-victory',
    DATE '2023-09-17', 'delivered', 100, 2023
  FROM pledge_evidence p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.election_promises existing
    WHERE existing.state_code = 'TS' AND existing.election_year = 2023
      AND existing.party = 'INC' AND existing.title = p.title
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO public.promise_updates (
  promise_id, from_status, to_status, note, updated_by_name, source_url, created_at
)
SELECT p.id, 'promised', 'delivered', p.delivery_note, 'Poligram evidence review',
  'https://www.telangana.gov.in/news/press-releases/2024/06/telangana-state-formation-day-celebrations/',
  TIMESTAMPTZ '2024-06-02 12:00:00+05:30'
FROM pledge_evidence p JOIN saved USING (id);
