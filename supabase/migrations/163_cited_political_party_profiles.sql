-- These dated facts supplement the existing registry. They do not change a
-- party's recognition, historical aliases, or authority to operate a Page.
ALTER TABLE public.political_organizations
  ADD COLUMN profile_evidence jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(profile_evidence) = 'array');

UPDATE public.political_organizations AS party
SET name = CASE WHEN party.name = party.short_name THEN filing.name ELSE party.name END,
    profile_evidence = jsonb_build_array(jsonb_build_object(
      'kind', 'contributionReport', 'period', '2024–25',
      'sourceUrl', 'https://www.eci.gov.in/contribution-reports'
    )),
    updated_at = now()
FROM (VALUES
  ('AAP', 'Aam Aadmi Party'),
  ('ADAL', 'Apna Dal (Soneylal)'),
  ('AIADMK', 'All India Anna Dravida Munnetra Kazhagam'),
  ('AITC', 'All India Trinamool Congress'),
  ('AIUDF', 'All India United Democratic Front'),
  ('AJSU', 'AJSU Party'),
  ('BJD', 'Biju Janata Dal'),
  ('BJP', 'Bharatiya Janata Party'),
  ('BRS', 'Bharat Rashtra Samithi'),
  ('BSP', 'Bahujan Samaj Party'),
  ('CPI', 'Communist Party of India'),
  ('CPIM', 'Communist Party of India (Marxist)'),
  ('CPIML', 'Communist Party of India (Marxist-Leninist) Liberation'),
  ('DMK', 'Dravida Munnetra Kazhagam'),
  ('INC', 'Indian National Congress'),
  ('INLD', 'Indian National Lok Dal'),
  ('IUML', 'Indian Union Muslim League'),
  ('JDS', 'Janata Dal (Secular)'),
  ('JDU', 'Janata Dal (United)'),
  ('JMM', 'Jharkhand Mukti Morcha'),
  ('JSP', 'Janasena Party'),
  ('KCM', 'Kerala Congress (M)'),
  ('LJPRV', 'Lok Janshakti Party (Ram Vilas)'),
  ('MGP', 'Maharashtrawadi Gomantak'),
  ('MNS', 'Maharashtra Navnirman Sena'),
  ('NDPP', 'Nationalist Democratic Progressive Party'),
  ('NPF', 'Naga People''s Front'),
  ('NPP', 'National People''s Party'),
  ('NTK', 'Naam Tamilar Katchi'),
  ('RGP', 'Revolutionary Goans Party'),
  ('RLP', 'Rashtriya Loktantrik Party'),
  ('SAD', 'Shiromani Akali Dal'),
  ('SDF', 'Sikkim Democratic Front'),
  ('SKM', 'Sikkim Krantikari Morcha'),
  ('SP', 'Samajwadi Party'),
  ('TDP', 'Telugu Desam Party'),
  ('YSRCP', 'Yuvajana Sramika Rythu Congress Party')
) AS filing(code, name)
WHERE party.id = 'ORG-PARTY-' || filing.code
  AND party.org_type = 'political_party'
  AND party.provenance_id IS NOT NULL;

UPDATE public.political_organizations AS party
SET profile_evidence = jsonb_build_array(jsonb_build_object(
      'kind', 'founded', 'year', history.year, 'sourceUrl', history.url
    )) || party.profile_evidence,
    updated_at = now()
FROM (VALUES
  ('ORG-PARTY-BJP', 1980, 'https://library.bjp.org/jspui/bitstream/123456789/275/2/Evolution%20of%20BJP%20-%20Full.pdf'),
  ('ORG-PARTY-INC', 1885, 'https://inc.in/brief-history-of-congress')
) AS history(id, year, url)
WHERE party.id = history.id AND party.org_type = 'political_party';

UPDATE public.political_organizations AS party
SET profile_evidence = jsonb_build_array(jsonb_build_object(
      'kind', 'constitution', 'sourceUrl', constitution.url
    )) || party.profile_evidence,
    updated_at = now()
FROM (VALUES
  ('ORG-PARTY-AIMIM', 'https://www.eci.gov.in/constitution-of-political-party'),
  ('ORG-PARTY-BSP', 'https://www.eci.gov.in/constitution-of-political-party'),
  ('ORG-PARTY-CPI', 'https://www.eci.gov.in/constitution-of-political-party'),
  ('ORG-PARTY-CPIM', 'https://www.eci.gov.in/constitution-of-political-party'),
  ('ORG-PARTY-JDU', 'https://www.eci.gov.in/constitution-of-political-party'),
  ('ORG-PARTY-JSP', 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzcyjgeFPh4LtAbjL4Y7X74UknP9%2FrpLyQNDIpOEzqFEW4okBLF1OUuF9BdpI0ZiYbCSv%2B1yJkuMeCkTzY9fhBvw%3D%3D')
) AS constitution(id, url)
WHERE party.id = constitution.id AND party.org_type = 'political_party';

-- This report names the party in the election, including parties whose
-- abbreviations are shared by unrelated organizations in other elections.
UPDATE public.political_organizations AS party
SET profile_evidence = jsonb_build_array(jsonb_build_object(
      'kind', 'assemblyElection', 'year', 2023, 'state', 'TS',
      'sourceUrl', 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_Of_Political_Parties_Participated.pdf'
    )) || party.profile_evidence,
    updated_at = now()
WHERE party.id IN (
  'ORG-PARTY-BAHUJANA-RASHTRA-SAMITHI', 'ORG-PARTY-CPI-ML-RED-STAR',
  'ORG-PARTY-JATIYA-JANA-SENA', 'ORG-PARTY-BRS', 'ORG-PARTY-CPIM', 'ORG-PARTY-JSP'
);
