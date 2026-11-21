-- Andhra Pradesh Finance Department, Budget in Brief 2026–27, table IX, XII and XIII.
-- Union Ministry of Finance, Budget at a Glance 2026–27, rows 9, 15 and 17.
-- Deficits are stored as magnitudes. An estimate or revision is separate from actual spending.
INSERT INTO public.state_budget_summaries (
  state_code, fiscal_year, total_budget_crores, total_revised_crores, total_spent_crores,
  overall_utilization, fiscal_deficit_crores, revenue_deficit_crores, debt_to_gdp_ratio,
  source_url, budget_basis
) VALUES
  ('AP', '2025-26', 322359.34, 300534.67, NULL, NULL, 79926.90, 33185.97, NULL,
   'https://apfinance.gov.in/...Bud%40et26-27/documents/Volume-VI.pdf#page=6', 'gross_expenditure_estimate'),
  ('AP', '2026-27', 332205.33, NULL, NULL, NULL, 75868.09, 22002.50, NULL,
   'https://apfinance.gov.in/...Bud%40et26-27/documents/Volume-VI.pdf#page=6', 'gross_expenditure_estimate'),
  ('IN', '2025-26', 5065345, 4964842, NULL, NULL, 1568936, 523846, NULL,
   'https://www.indiabudget.gov.in/doc/Budget_at_Glance/budget_at_a_glance.pdf', 'net_expenditure_estimate'),
  ('IN', '2026-27', 5347315, NULL, NULL, NULL, 1695768, 592344, NULL,
   'https://www.indiabudget.gov.in/doc/Budget_at_Glance/budget_at_a_glance.pdf', 'net_expenditure_estimate')
ON CONFLICT (state_code, fiscal_year) DO NOTHING;

-- The existing schemes endpoint includes central records in each state filter.
-- Store central schemes once, with no state code and no imputed coverage measures.
WITH cited_schemes (
  id, name, short_name, category, launched_date, ministry, level, state_code, description,
  eligibility, benefits, application_url, source_title, source_url
) AS (VALUES
  ('9cb1307d-4c1c-4c66-b800-a257814ad4a1'::uuid, 'Pradhan Mantri Kisan Samman Nidhi', 'PM-KISAN',
   'agriculture', DATE '2019-02-24', 'Ministry of Agriculture and Farmers Welfare', 'central', NULL,
   'Income support for eligible landholding farmer families.',
   'Farmer families with cultivable land recorded in their name, subject to scheme exclusions and verification.',
   '₹6,000 per year in three direct transfers of ₹2,000.',
   'https://pmkisan.gov.in/', 'Ministry of Agriculture and Farmers Welfare scheme summary',
   'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2042244&lang=2&reg=48'),
  ('7123a606-3232-4314-8dec-9aa81b793222', 'PM Vishwakarma', 'PM Vishwakarma',
   'skill_development', DATE '2023-09-17', 'Ministry of Micro, Small and Medium Enterprises', 'central', NULL,
   'Supports artisans and craftspeople working in 18 specified traditional trades.',
   'Eligible self-employed artisans aged 18 or older in a covered trade. One member per family may register, subject to scheme rules.',
   'Recognition, training, a toolkit incentive, access to concessional credit and marketing support.',
   'https://pmvishwakarma.gov.in/', 'Ministry of MSME scheme guidelines',
   'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1959098&lang=2&reg=48'),
  ('534fcf7e-678c-4511-ab93-8a39803e8829', 'PM Surya Ghar: Muft Bijli Yojana', 'PM Surya Ghar',
   'infrastructure', DATE '2024-02-13', 'Ministry of New and Renewable Energy', 'central', NULL,
   'Supports rooftop solar installations for eligible residential electricity consumers.',
   'Residential consumers can check rooftop and electricity connection eligibility on the national portal.',
   'Rooftop solar subsidy depends on system size. The published standard subsidy reaches ₹78,000 for a 3 kW or larger system.',
   'https://pmsuryaghar.gov.in/', 'Ministry of New and Renewable Energy Cabinet approval',
   'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2010133&lang=1&reg=37'),
  ('2b08be6b-04a8-427e-a5cd-b66a2d78a3c1', 'Gruha Jyothi', 'Gruha Jyothi',
   'social_security', DATE '2024-02-27', 'Telangana Energy Department', 'state', 'TS',
   'A Telangana electricity subsidy administered through the state distribution companies.',
   'Eligible households with a Food Security Card and a verified domestic electricity connection under the scheme guidelines.',
   'Eligible domestic consumption up to 200 units per month is covered under the scheme rules.',
   NULL, 'Telangana Electricity Regulatory Commission implementation order',
   'https://tgerc.telangana.gov.in/file_upload/uploads/Tariff%20Orders/Current%20Year%20Orders/2024/Order%20regarding%20Gruha%20Jyothi%20Scheme.pdf'),
  ('c1ead083-49d8-422c-8ced-c8d8d021ff50', 'Indiramma Indlu', 'Indiramma Indlu',
   'housing', DATE '2024-03-11', 'Telangana Transport, Roads & Buildings Department (Housing)', 'state', 'TS',
   'Telangana housing assistance for eligible households to build a home.',
   'The guidelines identify houseless poor families with a Food Security Card, subject to local verification and selection.',
   '₹5 lakh of construction assistance for a sanctioned house, paid in stages under scheme guidelines.',
   NULL, 'Telangana Housing Department guidelines (G.O.Ms.No.7)',
   'https://indirammaindlu.telangana.gov.in/showContent?filename=%2FUploads%2FGRUHALAKSHMI%2FPDFS%2F4_1751019778055.pdf&filepath=basepath'),
  ('84bfea19-bbb2-44a6-9932-944facaf0380', 'Stree Shakti', 'Stree Shakti',
   'women_child', DATE '2025-08-15', 'Andhra Pradesh State Road Transport Corporation', 'state', 'AP',
   'An Andhra Pradesh scheme for zero-fare travel on eligible APSRTC services.',
   'Girls, women and transgender citizens domiciled in Andhra Pradesh with valid proof of identity.',
   'Free travel on eligible City Ordinary, Pallevelugu, Ultra Pallevelugu, Metro Express and Express services under APSRTC rules.',
   NULL, 'APSRTC scheme eligibility and eligible services (G.O.Ms.No.27)',
   'https://apsrtc.ap.gov.in/coverage.php')
)
INSERT INTO public.government_schemes (
  id, name, short_name, category, launched_date, ministry, level, state_code, description,
  eligibility, benefits, application_url, budget_crores, beneficiaries_target, beneficiaries_actual,
  coverage_percent, documents
)
SELECT s.id, s.name, s.short_name, s.category, s.launched_date, s.ministry, s.level, s.state_code,
  s.description, s.eligibility, s.benefits, s.application_url, NULL, NULL, NULL, NULL,
  jsonb_build_array(jsonb_build_object('title', s.source_title, 'url', s.source_url))
FROM cited_schemes s
WHERE NOT EXISTS (
  SELECT 1 FROM public.government_schemes existing
  WHERE existing.state_code IS NOT DISTINCT FROM s.state_code
    AND (lower(existing.name) = lower(s.name) OR lower(existing.short_name) = lower(s.short_name))
)
ON CONFLICT (id) DO NOTHING;

WITH cited_bills (
  id, title, short_title, type, introduced_by, house_introduced, state_code, introduced_date,
  assent_date, summary, full_text_url, action
) AS (VALUES
  ('53ec00f9-a3f4-4811-a9e2-5c18446f61e1'::uuid, 'The Finance Bill, 2026', 'Finance Bill 2026',
   'finance', 'Nirmala Sitharaman', 'lok_sabha', 'IN', DATE '2026-02-01', DATE '2026-03-30',
   'Gives effect to the Central Government financial proposals for 2026–27.',
   'https://egazette.gov.in/WriteReadData/2026/271439.pdf', 'Presidential assent: Finance Act, 2026 (Act 4 of 2026)'),
  ('b8800f21-836e-49f8-8b2e-bed591e75463', 'The Immigration and Foreigners Bill, 2025', 'Immigration and Foreigners Bill',
   'ordinary', 'Amit Shah', 'lok_sabha', 'IN', DATE '2025-03-11', DATE '2025-04-04',
   'Consolidates rules on entry and exit, travel documents, visas and registration of foreigners.',
   'https://egazette.gov.in/WriteReadData/2025/262300.pdf', 'Presidential assent: Immigration and Foreigners Act, 2025 (Act 13 of 2025)'),
  ('ea06ffb5-4eb7-40fc-934e-5f5b90151d23', 'The Telangana Bhu Bharati (Record of Rights in Land) Bill, 2024', 'Telangana Bhu Bharati Bill',
   'ordinary', 'Ponguleti Srinivasa Reddy', 'state_assembly', 'TS', DATE '2024-12-18', DATE '2025-01-04',
   'Replaces the 2020 land records law and sets procedures for maintaining and updating the record of rights in Telangana.',
   'https://www.bhubharati.telangana.gov.in/BhubharatiDocuments', 'Published as Telangana Act 1 of 2025')
)
INSERT INTO public.bills (
  id, title, short_title, type, status, introduced_by, house_introduced, state_code,
  introduced_date, last_action_date, summary, full_text_url, votes_for, votes_against,
  votes_abstain, timeline
)
SELECT b.id, b.title, b.short_title, b.type, 'enacted', b.introduced_by, b.house_introduced,
  b.state_code, b.introduced_date, b.assent_date, b.summary, b.full_text_url, NULL, NULL, NULL,
  jsonb_build_array(
    jsonb_build_object('date', b.introduced_date, 'action', 'Introduced'),
    jsonb_build_object('date', b.assent_date, 'action', b.action)
  )
FROM cited_bills b
WHERE NOT EXISTS (
  SELECT 1 FROM public.bills existing
  WHERE existing.state_code = b.state_code AND lower(existing.title) = lower(b.title)
)
ON CONFLICT (id) DO NOTHING;

-- Public approvals can report an approximate amount or a fiscal-year target. Preserve missing
-- project-level cost and exact-date values as NULL, as the existing client already supports.
ALTER TABLE public.development_projects
  ALTER COLUMN sanctioned_cost_crores DROP NOT NULL,
  ALTER COLUMN expected_completion DROP NOT NULL;

WITH cited_projects (id, name, state_code, district_name, description, cost_crores, approval_date, source) AS (VALUES
  ('553398b0-c994-4cd5-9c96-dc20b687ed68'::uuid, 'Ghatkesar–Kazipet rail multitracking', 'TS',
   'Medchal–Malkajgiri to Hanumakonda',
   '110 km of rail multitracking approved on 9 September 2026. The Cabinet release gives FY 2029–30 as the target for the five-project package.',
   NULL::numeric, DATE '2026-09-09', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2308262&lang=2&reg=48'),
  ('56deb5d8-6873-4d89-b37e-cf1b40db6092', 'Nidadavolu–Duvvada railway third and fourth lines', 'AP',
   'East Godavari, Konaseema, Kakinada, Anakapalli and Visakhapatnam',
   'The Cabinet approved the 198 km corridor with an estimated completion cost of ₹9,889 crore and a planned duration of five years.',
   9889, DATE '2026-04-18', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2253250&lang=1&reg=3')
)
INSERT INTO public.development_projects (
  id, name, category, phase, state_code, district_name, description, sanctioned_cost_crores,
  sanctioned_date, expected_completion, expenditure_crores, delay_days, physical_progress,
  financial_progress, source
)
SELECT p.id, p.name, 'railway', 'approved', p.state_code, p.district_name, p.description,
  p.cost_crores, p.approval_date, NULL, NULL, NULL, NULL, NULL, p.source
FROM cited_projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.development_projects existing
  WHERE existing.state_code = p.state_code AND lower(existing.name) = lower(p.name)
)
ON CONFLICT (id) DO NOTHING;

-- A notice is provenance, separate from any actual registration or published minutes.
ALTER TABLE public.public_hearings ADD COLUMN IF NOT EXISTS source_url text;

WITH cited_hearings (id, title, description, hearing_date, agenda, source_url) AS (VALUES
  ('d9368f4d-516e-4ed5-926e-ce52a216b7f6'::uuid, 'Yacharam waste-to-energy power procurement hearing',
   'TGERC hearing on the proposed procurement of power from the 14 MW Yacharam plant and its model power purchase agreement (O.P. 35/2026). The published comment deadline is 23 November 2026 at 5:00 PM IST.',
   DATE '2026-12-11', ARRAY['Power procurement', 'Model power purchase agreement'],
   'https://www.tgerc.telangana.gov.in/'),
  ('4fb9fc04-fe29-4c5e-8aac-c0309382adbb', 'TGGENCO additional capital expenditure hearing',
   'TGERC hearing on five TGGENCO petitions for additional capital expenditure at hydropower and thermal stations (O.P. 43–47/2026). The published comment deadline is 3 December 2026 at 5:00 PM IST.',
   DATE '2026-12-15', ARRAY['Srisailam Left Bank', 'Kakatiya Thermal Power Project', 'Bhadradri Thermal Power Station', 'Nagarjuna Sagar', 'Lower Jurala'],
   'https://www.tgerc.telangana.gov.in/file_upload/uploads/Filings/Other%20Filings/2025-26/AddCapEx%20Works%20at%20Hydro%20and%20Thermal%20Stations/Public%20Notice.pdf')
)
INSERT INTO public.public_hearings (
  id, type, title, description, organizer, state_code, district_name, venue, date, time,
  is_open, agenda_items, source_url
)
SELECT h.id, 'public_hearing', h.title, h.description, 'Telangana Electricity Regulatory Commission',
  'TS', 'Hyderabad', 'TGERC Court Hall, Vidyut Niyantran Bhavan, Kalyan Nagar, G.T.S. Colony',
  h.hearing_date, '11:30 AM IST', true, h.agenda, h.source_url
FROM cited_hearings h
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_hearings existing
  WHERE existing.state_code = 'TS' AND existing.date = h.hearing_date
    AND lower(existing.title) = lower(h.title)
)
ON CONFLICT (id) DO NOTHING;
