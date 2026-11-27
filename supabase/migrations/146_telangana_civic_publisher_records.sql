BEGIN;

-- The official bill and Gazette are paired by bill/act identity. No vote counts were published here.
WITH cited_bills (id, title, short_title, bill_no, act_no, bill_url, act_url) AS (VALUES
  ('d39cd646-f846-4f63-a7f2-ddda72c2c1b0'::uuid,
   'The Telangana (Regulation of Appointments to Public Services and Rationalisation of Staff Pattern and Pay Structure) (Amendment) Bill, 2026',
   'Public Services Appointments Amendment Bill', 6, 12,
   'https://law.telangana.gov.in/fileShow?fileName=/Uploads/LawDepartment/pdfNew/6%20of%202026%20-%20Eng.pdf',
   'https://law.telangana.gov.in/fileShow?fileName=/Uploads/LawDepartment/pdfNew/12%20of%202026.pdf'),
  ('357b45cf-3ef8-4213-91e9-86ca5247ae08',
   'The Telangana (Regulation of Appointments to Public Services and Rationalisation of Staff Pattern and Pay Structure) (Second Amendment) Bill, 2026',
   'Public Services Appointments Second Amendment Bill', 7, 13,
   'https://law.telangana.gov.in/fileShow?fileName=/Uploads/LawDepartment/pdfNew/7%20of%202026%20-%20Eng.pdf',
   'https://law.telangana.gov.in/fileShow?fileName=/Uploads/LawDepartment/pdfNew/13%20of%202026.pdf')
)
INSERT INTO public.bills (
  id, title, short_title, type, status, introduced_by, house_introduced, state_code,
  introduced_date, last_action_date, summary, full_text_url, votes_for, votes_against,
  votes_abstain, timeline, source_verified_on
)
SELECT b.id, b.title, b.short_title, 'ordinary', 'enacted', 'Government of Telangana', 'state_assembly', 'TS',
  DATE '2026-01-02', DATE '2026-02-07',
  format('Legislative Assembly Bill %s of 2026 amends Telangana’s public-service appointments and staffing law.', b.bill_no),
  b.act_url, NULL, NULL, NULL,
  jsonb_build_array(
    jsonb_build_object('date', '2026-01-02', 'action', format('Introduced as L.A. Bill %s of 2026', b.bill_no), 'sourceUrl', b.bill_url),
    jsonb_build_object('date', '2026-02-07', 'action', format('Governor’s assent: Telangana Act %s of 2026', b.act_no), 'sourceUrl', b.act_url)
  ),
  DATE '2026-11-27'
FROM cited_bills b
WHERE NOT EXISTS (
  SELECT 1 FROM public.bills existing
  WHERE existing.state_code = 'TS'
    AND (lower(existing.title) = lower(b.title) OR existing.full_text_url = b.act_url)
)
ON CONFLICT (id) DO NOTHING;

-- Some official announcements establish the opening date and omit the approval date.
ALTER TABLE public.development_projects ALTER COLUMN sanctioned_date DROP NOT NULL;

WITH cited_projects (id, name, category, phase, district_name, description, sanctioned_cost,
  approval_date, source) AS (VALUES
  ('d2809a2e-3e01-4ccf-a03f-6caec36d5f0b'::uuid, 'NH-167 Gudebellur–Mahabubnagar widening',
   'road', 'approved', 'Narayanpet and Mahabubnagar',
   'Cabinet approved 80.01 km of four-lane highway. The foundation stone was laid on 10 May 2026.',
   3175.08, DATE '2026-02-13',
   'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2227982&lang=2&reg=48'),
  ('366a153f-f6b1-43bb-8b89-4c3417087f7e', 'Moosarambagh high-level bridge', 'bridge', 'inaugurated',
   'Hyderabad', 'The 400-metre Musi bridge connecting Amberpet and Dilsukhnagar opened on 31 August 2026. Telangana’s announcement reports a construction cost of ₹52 crore.',
   NULL, NULL,
   'https://www.telangana.gov.in/news/press-releases/2026/08/honble-cm-sri-a-revanth-reddy-participated-in-the-inauguration-of-the-new-high-level-bridge-across-the-musi-river-at-moosarambagh-hyderabad/')
)
INSERT INTO public.development_projects (
  id, name, category, phase, state_code, district_name, description, sanctioned_cost_crores,
  sanctioned_date, expected_completion, expenditure_crores, delay_days, physical_progress,
  financial_progress, source, source_verified_on
)
SELECT p.id, p.name, p.category, p.phase, 'TS', p.district_name, p.description, p.sanctioned_cost,
  p.approval_date, NULL, NULL, NULL, NULL, NULL, p.source, DATE '2026-11-27'
FROM cited_projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.development_projects existing
  WHERE existing.state_code = 'TS' AND lower(existing.name) = lower(p.name)
)
ON CONFLICT (id) DO NOTHING;

WITH cited_hearings (id, type, title, description, organizer, district_name, venue,
  hearing_date, hearing_time, source_url) AS (VALUES
  ('5bd43493-582e-476e-b4df-6dfc30d4aa24'::uuid, 'public_hearing', 'TGNPDCL retail electricity tariff hearing',
   'The commission rescheduled the hearing on the northern distribution company’s FY 2026–27 retail supply filings (O.P. 79/2025) from 5 March to 6 March.',
   'Telangana Electricity Regulatory Commission', 'Hanumakonda',
   'Meeting Hall, Integrated District Collectorate Complex, Hanumakonda',
   DATE '2026-03-06', '10:30 AM IST',
   'https://www.tgerc.telangana.gov.in/file_upload/uploads/Filings/ARR%20Filings/2026-27/TGDISCOMS/RST/Revised%20Public%20Notice.pdf'),
  ('dfecf5c1-806e-40cb-8643-505320d30263', 'public_hearing', 'TGSPDCL retail electricity tariff hearing',
   'The published notice scheduled a hearing on the southern distribution company’s FY 2026–27 retail supply filings (O.P. 80/2025).',
   'Telangana Electricity Regulatory Commission', 'Hyderabad', 'TGERC Court Hall, Hyderabad',
   DATE '2026-03-07', '10:30 AM IST', 'https://www.tgerc.telangana.gov.in/arrfilings.php'),
  ('a293540b-9bab-47f6-a476-d45fb607a06f', 'environment_clearance', 'Divyasai Boards environmental public hearing',
   'The district published a notice scheduling a hearing for the Divyasai Boards project in Mothighanpur.',
   'Telangana Pollution Control Board', 'Mahabubnagar', 'Mothighanpur village, Balanagar mandal',
   DATE '2026-03-07', '11:00 AM IST',
   'https://mahabubnagar.telangana.gov.in/telangana-pollution-control-board-common-environmental-public-hearing/'),
  ('fdf7327c-5df7-450c-931c-b8fa15c6ccd5', 'environment_clearance', 'Ammapur stone and metal quarry environmental hearing',
   'The district published a notice scheduling a common environmental hearing for two proposed quarries in Ammapur.',
   'Telangana Pollution Control Board', 'Mahabubnagar', 'Ammapur village, Chinna Chunthakunta mandal',
   DATE '2026-03-10', '11:00 AM IST',
   'https://mahabubnagar.telangana.gov.in/telangana-pollution-control-board-common-environmental-public-hearing-on-10-03-2026/')
)
INSERT INTO public.public_hearings (
  id, type, title, description, organizer, state_code, district_name, venue,
  date, time, is_open, source_url, source_verified_on
)
SELECT h.id, h.type, h.title, h.description, h.organizer, 'TS', h.district_name, h.venue,
  h.hearing_date, h.hearing_time, false, h.source_url, DATE '2026-11-27'
FROM cited_hearings h
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_hearings existing
  WHERE existing.state_code = 'TS' AND existing.date = h.hearing_date
    AND lower(existing.title) = lower(h.title)
)
ON CONFLICT (id) DO NOTHING;

-- The existing publisher registry stores the durable check state.
INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, retrieval_method, refresh_frequency)
VALUES
  ('telangana_law_department', 'Telangana bill index', 'Telangana Law Department', 'statutory',
   'https://law.telangana.gov.in/bills', 'html', 'daily'),
  ('telangana_state_portal', 'Telangana State Portal news', 'Government of Telangana', 'statutory',
   'https://www.telangana.gov.in/category/news/feed/', 'rss', 'daily'),
  ('telangana_electricity_regulatory_commission', 'TGERC public hearing notices', 'Telangana Electricity Regulatory Commission',
   'statutory', 'https://www.tgerc.telangana.gov.in/', 'html', 'daily')
ON CONFLICT (id) DO NOTHING;

COMMIT;
