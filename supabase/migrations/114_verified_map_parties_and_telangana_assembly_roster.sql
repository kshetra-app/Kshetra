BEGIN;

-- Governing party of the chief minister, verified against the current official
-- government/assembly records. Update only the previously recorded labels.
-- BR: https://betastate.bihar.gov.in/iprdwebsite/DyPageView?PageTitleID=9805
--     https://vidhansabha.bihar.gov.in/Knowyourmla.html
-- DL: https://delhi.gov.in/cmo
-- KL: https://prd.kerala.gov.in/en/council-of-ministers
-- NL: https://ipr.nagaland.gov.in/state-election-commission-recognizes-the-merger-of-the-ndpp-with-the-npf
-- PY: https://www.py.gov.in/chief-minister
-- TN: https://lokbhavan.tn.gov.in/gallery/thiru-c-joseph-vijay-was-sworn-in-as-chief-minister-of-tamil-nadu-thiru-rajendra-vishwanath-arlekar-honble-governor-of-tn-administered-the-oath-of-office-to-thiru-c-joseph-vijay-10-05-2026/
-- WB: https://wb.gov.in/government-meet-the-chief-minister.aspx
UPDATE public.states AS state
SET ruling_party = parties.verified_party
FROM (VALUES
    ('BR', 'JDU', 'BJP'),
    ('DL', 'AAP', 'BJP'),
    ('KL', 'CPIM', 'INC'),
    ('NL', 'NDPP', 'NPF'),
    ('PY', 'NDA', 'AINRC'),
    ('TN', 'DMK', 'TVK'),
    ('WB', 'AITC', 'BJP')
) AS parties(code, previous_party, verified_party)
WHERE state.code = parties.code AND state.ruling_party = parties.previous_party;

-- These union territories have no legislative assembly or chief minister.
UPDATE public.states
SET ruling_party = NULL
WHERE (code, ruling_party) IN (
  ('AN', 'BJP'), ('CH', 'INC'), ('DN', 'BJP'), ('LA', 'IND'), ('LD', 'INC')
);

-- Match the published roster to existing canonical people and actual seats.
-- The two by-election seats are excluded until their tenure can be linked to
-- a canonical person with the corresponding by-election evidence.
-- Roster: https://www.telangana.gov.in/legislature/members-of-legislative-assembly/
-- Election: https://www.eci.gov.in/telangana-legislative-election-2023-statistical-report
-- Assembly term start: https://www.eci.gov.in/term-of-the-houses/
LOCK TABLE public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, record_count, checksum_sha256, default_status, metadata
)
SELECT
  'telangana_assembly_roster_2026_11_20',
  id,
  '2026-11-20',
  119,
  '93f607f81e9801abfc089b2dc626ea6aee0a969a9b7372838ade537883f48b05',
  'OFFICIAL',
  jsonb_build_object('source_url', 'https://www.telangana.gov.in/legislature/members-of-legislative-assembly/')
FROM public.datasets
WHERE id = 'telangana_2023_mla_profiles'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evidence_records (
  id, dataset_version_id, artifact_name, artifact_sha256, verification_authority,
  verified_by, verification_notes
)
SELECT
  'f4c67502-c0bb-4d05-97df-2a918053a2dc',
  id,
  'Telangana State Portal - Members of Legislative Assembly',
  checksum_sha256,
  'Government of Telangana',
  'poligram_data_reconciliation',
  'Matched to Telangana assembly constituency number, official 2023 Detailed Results, and existing canonical person identities. Snapshot retrieved 2026-11-20.'
FROM public.dataset_versions
WHERE id = 'telangana_assembly_roster_2026_11_20'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.provenance_records (
  id, dataset_version_id, source_record_id, status, transformation_type,
  operator, verification_evidence_id
)
SELECT
  'db2f879e-d615-4e0b-b959-d5aaf973f8b8',
  dataset_version_id,
  'Telangana-Legislative-Assembly-2026-11-20',
  'OFFICIAL',
  'verified_roster_reconciliation',
  'poligram_data_reconciliation',
  id
FROM public.evidence_records
WHERE id = 'f4c67502-c0bb-4d05-97df-2a918053a2dc'
ON CONFLICT (id) DO NOTHING;

WITH reviewed(ac_no, canonical_name, election_party, current_party) AS (
  VALUES
    (1, 'Palvai Harish Babu', 'BJP', 'BJP'),
    (2, 'Gaddam Vivekanand', 'INC', 'INC'),
    (3, 'Gaddam Vinod', 'INC', 'INC'),
    (4, 'Kokkirala Premsagar Rao', 'INC', 'INC'),
    (5, 'Kova Laxmi', 'BRS', 'BRS'),
    (6, 'Vedma Bhojju', 'INC', 'INC'),
    (7, 'Payal Shanker', 'BJP', 'BJP'),
    (8, 'Anil Jadhav', 'BRS', 'BRS'),
    (9, 'Alleti Maheshwar Reddy', 'BJP', 'BJP'),
    (10, 'Rama Rao Pawar', 'BJP', 'BJP'),
    (11, 'Paidi Rakesh Reddy', 'BJP', 'BJP'),
    (12, 'P. Sudarshan Reddy', 'INC', 'INC'),
    (13, 'Thota Laxmi Kantha Rao', 'INC', 'INC'),
    (14, 'Pocharam Srinivas Reddy', 'BRS', 'BRS'),
    (15, 'K. Madan Mohan Rao', 'INC', 'INC'),
    (16, 'K. V. Ramana Reddy', 'BJP', 'BJP'),
    (17, 'Dhanpal Suryanarayana Gupta', 'BJP', 'BJP'),
    (18, 'Rekulapally Bhoopathi Reddy', 'INC', 'INC'),
    (19, 'Vemula Prashanth Reddy', 'BRS', 'BRS'),
    (20, 'Kalvakuntla Sanjay', 'BRS', 'BRS'),
    (21, 'M. Sanjay Kumar', 'BRS', 'BRS'),
    (22, 'Adluri Laxman Kumar', 'INC', 'INC'),
    (23, 'Makkan Singh Raj Thakur', 'INC', 'INC'),
    (24, 'Duddilla Sridhar Babu', 'INC', 'INC'),
    (25, 'Chinthakunta Vijaya Ramana Rao', 'INC', 'INC'),
    (26, 'Gangula Kamalakar', 'BRS', 'BRS'),
    (27, 'Medipally Satyam', 'INC', 'INC'),
    (28, 'Aadi Srinivas', 'INC', 'INC'),
    (29, 'K. T. Rama Rao', 'BRS', 'BRS'),
    (30, 'Kavvampally Satyanarayana', 'INC', 'INC'),
    (31, 'Padi Kaushik Reddy', 'BRS', 'BRS'),
    (32, 'Ponnam Prabhakar', 'INC', 'INC'),
    (33, 'Thanneeru Harish Rao', 'BRS', 'BRS'),
    (34, 'Mynampally Rohith', 'INC', 'INC'),
    (35, 'Patlolla Sanjeeva Reddy', 'INC', 'INC'),
    (36, 'C. Damodar Raja Narasimha', 'INC', 'INC'),
    (37, 'Vakiti Sunitha Laxma Reddy', 'BRS', 'BRS'),
    (38, 'Koninty Manik Rao', 'BRS', 'BRS'),
    (39, 'Chinta Prabhakar', 'BRS', 'BRS'),
    (40, 'Gudem Mahipal Reddy', 'BRS', 'BRS'),
    (41, 'Kotha Prabhakar Reddy', 'BRS', 'BRS'),
    (42, 'K. Chandrashekar Rao', 'BRS', 'BRS'),
    (43, 'Chamakura Malla Reddy', 'BRS', 'BRS'),
    (44, 'Marri Rajasekhar Reddy', 'BRS', 'BRS'),
    (45, 'K. P. Vivekanand', 'BRS', 'BRS'),
    (46, 'Madhavaram Krishna Rao', 'BRS', 'BRS'),
    (47, 'Bandari Lakshma Reddy', 'BRS', 'BRS'),
    (48, 'Malreddy Ranga Reddy', 'INC', 'INC'),
    (49, 'Devireddy Sudheer Reddy', 'BRS', 'BRS'),
    (50, 'Sabitha Indra Reddy', 'BRS', 'BRS'),
    (51, 'T. Prakash Goud', 'BRS', 'BRS'),
    (52, 'Arekapudi Gandhi', 'BRS', 'BRS'),
    (53, 'Kale Yadaiah', 'BRS', 'BRS'),
    (54, 'Tammannagari Ram Mohan Reddy', 'INC', 'INC'),
    (55, 'Gaddam Prasad Kumar', 'INC', 'INC'),
    (56, 'B. Manohar Reddy', 'INC', 'INC'),
    (57, 'Muta Gopal', 'BRS', 'BRS'),
    (58, 'Ahmed Bin Abdullah Balala', 'AIMIM', 'AIMIM'),
    (59, 'Kaleru Venkatesh', 'BRS', 'BRS'),
    (60, 'Danam Nagender', 'BRS', 'BRS'),
    (62, 'Talasani Srinivas Yadav', 'BRS', 'BRS'),
    (63, 'Mohammad Majid Hussain', 'AIMIM', 'AIMIM'),
    (64, 'Kausar Mohiuddin', 'AIMIM', 'AIMIM'),
    (65, 'T. Raja Singh', 'BJP', 'BJP'),
    (66, 'Mir Zulfeqar Ali', 'AIMIM', 'AIMIM'),
    (67, 'Akbaruddin Owaisi', 'AIMIM', 'AIMIM'),
    (68, 'Jaffer Hussain', 'AIMIM', 'AIMIM'),
    (69, 'Mohammed Mubeen', 'AIMIM', 'AIMIM'),
    (70, 'T. Padma Rao Goud', 'BRS', 'BRS'),
    (72, 'Anumula Revanth Reddy', 'INC', 'INC'),
    (73, 'Chittem Parnika Reddy', 'INC', 'INC'),
    (74, 'Yennam Srinivas Reddy', 'INC', 'INC'),
    (75, 'Janampalli Anirudh Reddy', 'INC', 'INC'),
    (76, 'Gavinolla Madhusudan Reddy', 'INC', 'INC'),
    (77, 'Vakiti Srihari', 'INC', 'INC'),
    (78, 'Tudi Megha Reddy', 'INC', 'INC'),
    (79, 'Bandla Krishna Mohan Reddy', 'BRS', 'BRS'),
    (80, 'Vijayudu', 'BRS', 'BRS'),
    (81, 'Kuchkulla Rajesh Reddy', 'INC', 'INC'),
    (82, 'Chikkudu Vamshi Krishna', 'INC', 'INC'),
    (83, 'Kasireddy Narayan Reddy', 'INC', 'INC'),
    (84, 'K. Shankaraiah', 'INC', 'INC'),
    (85, 'Jupally Krishna Rao', 'INC', 'INC'),
    (86, 'Nenavath Balu Naik', 'INC', 'INC'),
    (87, 'Kunduru Jayaveer Reddy', 'INC', 'INC'),
    (88, 'Bathula Laxma Reddy', 'INC', 'INC'),
    (89, 'Nalamada Uttam Kumar Reddy', 'INC', 'INC'),
    (90, 'Nalamada Padmavathi Reddy', 'INC', 'INC'),
    (91, 'Guntakandla Jagadish Reddy', 'BRS', 'BRS'),
    (92, 'Komatireddy Venkat Reddy', 'INC', 'INC'),
    (93, 'Komatireddy Raj Gopal Reddy', 'INC', 'INC'),
    (94, 'Kumbam Anil Kumar Reddy', 'INC', 'INC'),
    (95, 'Vemula Veeresham', 'INC', 'INC'),
    (96, 'Mandula Samuel', 'INC', 'INC'),
    (97, 'Beerla Ilaiah', 'INC', 'INC'),
    (98, 'Palla Rajeshwar Reddy', 'BRS', 'BRS'),
    (99, 'Kadiyam Srihari', 'BRS', 'BRS'),
    (100, 'Mamidala Yashaswini Reddy', 'INC', 'INC'),
    (101, 'Jatoth Ram Chander Naik', 'INC', 'INC'),
    (102, 'Murali Naik Bhukya', 'INC', 'INC'),
    (103, 'Donthi Madhava Reddy', 'INC', 'INC'),
    (104, 'Revuri Prakash Reddy', 'INC', 'INC'),
    (105, 'Naini Rajender Reddy', 'INC', 'INC'),
    (106, 'Konda Surekha', 'INC', 'INC'),
    (107, 'K. R. Nagaraj', 'INC', 'INC'),
    (108, 'Gandra Satyanarayana Rao', 'INC', 'INC'),
    (109, 'Seethakka', 'INC', 'INC'),
    (110, 'Payam Venkateswarlu', 'INC', 'INC'),
    (111, 'Koram Kanakaiah', 'INC', 'INC'),
    (112, 'Tummala Nageswara Rao', 'INC', 'INC'),
    (113, 'Ponguleti Srinivasa Reddy', 'INC', 'INC'),
    (114, 'Mallu Bhatti Vikramarka', 'INC', 'INC'),
    (115, 'Ramdas Maloth', 'INC', 'INC'),
    (116, 'Matta Ragamayee', 'INC', 'INC'),
    (117, 'Kunamneni Sambasiva Rao', 'CPI', 'CPI'),
    (118, 'Jare Adinarayana', 'INC', 'INC'),
    (119, 'Tellam Venkata Rao', 'BRS', 'BRS')
),
resolved AS (
  SELECT r.ac_no, seat.id AS jurisdiction_id, person.id AS person_id,
         elected_party.id AS party_at_election, roster_party.id AS current_party,
         count(*) OVER (PARTITION BY r.ac_no) AS identity_matches
  FROM reviewed r
  JOIN public.constituencies seat ON seat.state_code = 'TS' AND seat.ac_no = r.ac_no
  JOIN public.canonical_persons person ON person.canonical_name = r.canonical_name
  JOIN public.political_organizations elected_party ON elected_party.id = 'ORG-PARTY-' || r.election_party
  JOIN public.political_organizations roster_party ON roster_party.id = 'ORG-PARTY-' || r.current_party
  WHERE EXISTS (
    SELECT 1 FROM public.candidacies c
    WHERE c.person_id = person.id
      AND c.constituency_id IN ('AC-' || r.ac_no, seat.id)
      AND c.election_year = 2023
      AND c.election_type = 'assembly'
      AND c.result = 'won'
  )
)
INSERT INTO public.elected_tenures (
  person_id, office_type, jurisdiction_type, jurisdiction_id, term_start,
  party_at_election, current_party, is_current, tenure_status, data_status, provenance_id
)
SELECT
  resolved.person_id, 'mla', 'assembly_constituency', resolved.jurisdiction_id,
  DATE '2023-12-09', resolved.party_at_election, resolved.current_party,
  TRUE, 'ACTIVE', 'OFFICIAL', provenance.id
FROM resolved
CROSS JOIN public.provenance_records provenance
WHERE provenance.id = 'db2f879e-d615-4e0b-b959-d5aaf973f8b8'
  AND resolved.identity_matches = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.elected_tenures existing
    WHERE existing.jurisdiction_type = 'assembly_constituency'
      AND existing.office_type = 'mla'
      AND existing.jurisdiction_id = resolved.jurisdiction_id
      AND (existing.is_current OR existing.term_start = DATE '2023-12-09')
  );

COMMIT;
