BEGIN;

-- KERC public notice dated 25 September 2026 establishes the scheduled events.
-- The notice alone does not establish attendance, minutes, or an outcome.
WITH notices (id, city, district, districts_covered, hearing_date, venue) AS (VALUES
  ('a85992e4-ea04-55ac-b1e9-cc6894b308d1'::uuid, 'Belagavi', 'Belagavi',
    'Belagavi and Vijayapura', DATE '2026-10-07', 'New Zilla Panchayat Hall, Court Compound, Belagavi'),
  ('c384cd89-21da-5913-a315-b35b35a53905', 'Sirsi', 'Uttara Kannada',
    'Sirsi and Karwar', DATE '2026-10-08', 'HESCOM O&M Circle Office, KPTCL premises, Sirsi'),
  ('648acb32-a4c5-5c82-8f89-b3d9c4175677', 'Hubballi', 'Dharwad',
    'Hubballi, Dharwad, Gadag, Bagalkote and Haveri', DATE '2026-10-09', 'HESCOM corporate office, Vidyut Bhavan, Gopanakoppa, Hubballi'),
  ('3dbf258d-77fc-5e66-96d5-caeb475b061c', 'Bidar', 'Bidar',
    'Bidar', DATE '2026-10-14', 'GESCOM O&M Circle Office, KEB Road, Bidar'),
  ('64d602e1-4ffa-52d6-a817-c80324103b98', 'Kalaburagi', 'Kalaburagi',
    'Kalaburagi and Yadgiri', DATE '2026-10-15', 'KEB Engineers’ Association, next to the GESCOM corporate office, Kalaburagi'),
  ('eea8169c-3e96-5b53-bcc2-683af572a71b', 'Ballari', 'Ballari',
    'Ballari, Koppala, Vijayanagar and Raichur', DATE '2026-10-22', 'RYM Engineering College auditorium, Cantonment, Ballari')
)
INSERT INTO public.public_hearings (
  id, type, title, description, organizer, state_code, district_name, venue,
  date, time, is_open, source_url, source_verified_on
)
SELECT n.id, 'public_hearing', 'Draft Electricity Supply Regulations hearing in ' || n.city,
  'The commission scheduled this consultation on the 2026 draft Electricity Supply Regulations for stakeholders in ' || n.districts_covered || '.',
  'Karnataka Electricity Regulatory Commission', 'KA', n.district, n.venue,
  n.hearing_date, '11:00 AM IST', false, 'https://kerc.karnataka.gov.in/uploads/69541790574131.pdf', DATE '2026-11-27'
FROM notices n
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_hearings h
  WHERE h.state_code = 'KA' AND h.date = n.hearing_date AND h.district_name = n.district
    AND (h.source_url = 'https://kerc.karnataka.gov.in/uploads/69541790574131.pdf'
      OR h.title ILIKE '%electricity supply regulations%')
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
