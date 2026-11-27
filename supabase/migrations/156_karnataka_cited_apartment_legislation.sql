BEGIN;

-- LA Bill 14 of 2026. The Assembly records passage in both houses.
-- The Karnataka Gazette records assent and publication. Section 1(2) sets
-- commencement by separate notification.
INSERT INTO public.bills (
  id, title, short_title, type, status, introduced_by, house_introduced, state_code,
  introduced_date, last_action_date, summary, full_text_url, votes_for, votes_against,
  votes_abstain, timeline, source_verified_on
)
SELECT
  '98cd34bc-adc7-4ef0-a79f-48e31034f76b'::uuid,
  'Karnataka Apartment (Ownership and Management) Bill, 2026',
  'Karnataka Apartment Ownership Bill', 'ordinary', 'enacted', 'Government of Karnataka',
  'state_assembly', 'KA', DATE '2026-08-19', DATE '2026-10-15',
  'Establishes a framework for apartment ownership and the governance of common areas. The Governor gave assent on 9 October 2026. The Act provides for commencement on a date appointed separately by Gazette notification.',
  'https://egazette.servantsofknowledge.in/details/in.gazette.karnataka_eo.2026-10-15.12618/pdf/',
  NULL, NULL, NULL,
  jsonb_build_array(
    jsonb_build_object('date', '2026-08-19', 'action', 'Introduced as Legislative Assembly Bill No. 14 of 2026',
      'source_url', 'https://kla.kar.nic.in/assembly/bills/bill16100_14.pdf'),
    jsonb_build_object('date', '2026-08-21', 'action', 'Passed the Karnataka Legislative Assembly',
      'source_url', 'https://kla.kar.nic.in/assembly/bills/bills16100.htm'),
    jsonb_build_object('date', '2026-08-24', 'action', 'Passed the Karnataka Legislative Council',
      'source_url', 'https://kla.kar.nic.in/assembly/bills/bills16100.htm'),
    jsonb_build_object('date', '2026-10-09', 'action', 'Governor gave assent'),
    jsonb_build_object('date', '2026-10-15', 'action', 'Published as Karnataka Act No. 45 of 2026')
  ),
  DATE '2026-11-27'
WHERE NOT EXISTS (
  SELECT 1 FROM public.bills
  WHERE state_code = 'KA' AND (
    (title ILIKE '%apartment%ownership%management%' AND introduced_date = DATE '2026-08-19')
    OR full_text_url = 'https://egazette.servantsofknowledge.in/details/in.gazette.karnataka_eo.2026-10-15.12618/pdf/'
  )
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
