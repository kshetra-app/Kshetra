-- Reuse reviewed canonical people in the Karnataka Assembly roster.
-- Pending constituency/person conflicts are intentionally outside this reviewed batch.
BEGIN;

LOCK TABLE public.canonical_persons IN SHARE MODE;
LOCK TABLE public.elected_tenures, public.tenure_vacancies, public.political_organizations IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE reviewed_ka_tenures (
  ac_no integer PRIMARY KEY, person_id uuid UNIQUE NOT NULL, existing_name text NOT NULL,
  election_party text, current_party text, term_start date NOT NULL, term_end date,
  tenure_status text NOT NULL, is_current boolean NOT NULL
) ON COMMIT DROP;
INSERT INTO reviewed_ka_tenures VALUES
  (1, '0215b22d-0001-0000-0000-000000002185', 'Shashikala Jolle', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (2, '0215b22d-0001-0000-0000-000000002090', 'Ganesh Hukkeri', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (3, '0215b22d-0001-0000-0000-000000002051', 'Laxman Sangappa Savadi', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (4, '0215b22d-0001-0000-0000-000000002137', 'Bharamgouda Alagouda Kage', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (5, '0215b22d-0001-0000-0000-000000002152', 'Mahendra Kallappa Tammannavar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (6, '0215b22d-0001-0000-0000-000000002197', 'Aihole Duryodhan Mahalingappa', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (7, '0215b22d-0001-0000-0000-000000002128', 'Umesh Katti Jr', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (8, '0215b22d-0001-0000-0000-000000002048', 'Balachandra Jarkiholi', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (9, '0215b22d-0001-0000-0000-000000002104', 'Ramesh Jarkiholi', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (10, '0215b22d-0001-0000-0000-000000002238', 'Satish Laxmanrao Jarkiholi', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (11, '0215b22d-0001-0000-0000-000000002066', 'Asif (Raju) Sait', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (12, '0215b22d-0001-0000-0000-000000002064', 'Abhay Patil', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (13, '0215b22d-0001-0000-0000-000000002065', 'Laxmi Hebbalkar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (15, '0215b22d-0001-0000-0000-000000002144', 'Babasaheb Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (16, '0215b22d-0001-0000-0000-000000002057', 'Koujalagi Mahantesh Shivanand', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (17, '0215b22d-0001-0000-0000-000000002202', 'Vishwas Vasant Vaidya', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (18, '0215b22d-0001-0000-0000-000000002195', 'Ashok Pattan', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (19, '0215b22d-0001-0000-0000-000000002176', 'Timmapur Ramappa Balappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (20, '0215b22d-0001-0000-0000-000000002224', 'Siddu Savadi', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (21, '0215b22d-0001-0000-0000-000000002133', 'Jagadeesh Shivayya Gudagunti', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (23, '0215b22d-0001-0000-0000-000000002053', 'B.B.Chimmanakatti', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (24, '0215b22d-0001-0000-0000-000000002055', 'Umesh Hullappa Meti', 'INC', 'INC', '2026-05-04', NULL, 'ACTIVE', TRUE),
  (25, '0215b22d-0001-0000-0000-000000002129', 'Kashappanavara Vijayanand Shivashankrappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (26, '0215b22d-0001-0000-0000-000000002175', 'Appaji Aliyas Channabasavaraj S/O Shankarao Nadagouda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (27, '0215b22d-0001-0000-0000-000000002099', 'Rajugouda Patil', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (28, '0215b22d-0001-0000-0000-000000002062', 'Shivanand Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (30, '0215b22d-0001-0000-0000-000000002075', 'Basanagouda Patil Yatnal', 'BJP', NULL, '2023-05-22', NULL, 'ACTIVE', TRUE),
  (31, '0215b22d-0001-0000-0000-000000002180', 'Katakadhond Vitthal Dondiba', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (32, '0215b22d-0001-0000-0000-000000002131', 'Yashavantaraygoud. Vittalagoud. Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (33, '0215b22d-0001-0000-0000-000000002215', 'Ashok Managuli', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (34, '0215b22d-0001-0000-0000-000000002045', 'M.Y.Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (35, '0215b22d-0001-0000-0000-000000002135', 'Ajay Singh', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (37, '0215b22d-0001-0000-0000-000000002204', 'Sharanabasappa Darshanapur', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (38, '0215b22d-0001-0000-0000-000000002234', 'Channareddy Patil Tunnur', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (39, '0215b22d-0001-0000-0000-000000002109', 'Sharana Gowda Kandakur', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (40, '0215b22d-0001-0000-0000-000000002093', 'Priyank Kharge', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (41, '0215b22d-0001-0000-0000-000000002203', 'Dr. Sharanprakash Rudrappa Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (42, '0215b22d-0001-0000-0000-000000002091', 'Avinash Jadhav', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (43, '0215b22d-0001-0000-0000-000000002106', 'Basawaraj Mattimudu', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (45, '0215b22d-0001-0000-0000-000000002107', 'Kaneez Fatima', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (46, '0215b22d-0001-0000-0000-000000002046', 'Bhojaraj', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (47, '0215b22d-0001-0000-0000-000000002061', 'Sharanu Salagar', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (49, '0215b22d-0001-0000-0000-000000002074', 'Dr. Shailendra Beldale', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (50, '0215b22d-0001-0000-0000-000000002073', 'Rahim Khan', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (51, '0215b22d-0001-0000-0000-000000002071', 'Eshwar Khandre', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (52, '0215b22d-0001-0000-0000-000000002052', 'Prabhu Chavan', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (53, '0215b22d-0001-0000-0000-000000002191', 'Basanagouda Daddal', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (55, '0215b22d-0001-0000-0000-000000002170', 'G Hampayya Nayak', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (56, '0215b22d-0001-0000-0000-000000002097', 'Karemma', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (57, '0215b22d-0001-0000-0000-000000002159', 'Manappa D Vajjal', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (59, '0215b22d-0001-0000-0000-000000002171', 'Basan Gouda Turvihal', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (60, '0215b22d-0001-0000-0000-000000002158', 'Doddanagouda Patil', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (61, '0215b22d-0001-0000-0000-000000002139', 'Tangadagi Shivaraj Sangappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (63, '0215b22d-0001-0000-0000-000000002236', 'Basavaraj Rayareddi', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (64, '0215b22d-0001-0000-0000-000000002148', 'Raghavendra Hitnal', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (65, '0215b22d-0001-0000-0000-000000002209', 'Dr.Chandru Lamani', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (66, '0215b22d-0001-0000-0000-000000002241', 'H K Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (67, '0215b22d-0001-0000-0000-000000002198', 'Gurupadagouda Sanganagouda Patil', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (68, '0215b22d-0001-0000-0000-000000004798', 'C C Patil', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (69, '0215b22d-0001-0000-0000-000000002183', 'Ningaraddi Hanamaraddi Konaraddi', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (72, '0215b22d-0001-0000-0000-000000002126', 'Prasad Abbayya', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (74, '0215b22d-0001-0000-0000-000000002127', 'Arvind Bellad', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (75, '0215b22d-0001-0000-0000-000000002138', 'Santosh S Lad', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (76, '0215b22d-0001-0000-0000-000000002112', 'Deshpande Raghunath', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (77, '0215b22d-0001-0000-0000-000000002143', 'Satish Krishna Sail', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (78, '0215b22d-0001-0000-0000-000000002154', 'Dinakar Keshav Shetty', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (79, '0215b22d-0001-0000-0000-000000002072', 'Mankal Vaidya', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (80, '0215b22d-0001-0000-0000-000000002218', 'Bhimanna T. Naik', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (81, '0215b22d-0001-0000-0000-000000002237', 'Shivaram Hebbar', 'BJP', NULL, '2023-05-22', NULL, 'ACTIVE', TRUE),
  (82, '0215b22d-0001-0000-0000-000000002113', 'Srinivas Mane', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (83, '0215b22d-0001-0000-0000-000000002206', 'Pathan Yasirahmedkhan', 'INC', 'INC', '2024-12-09', NULL, 'ACTIVE', TRUE),
  (84, '0215b22d-0001-0000-0000-000000002116', 'Rudrappa Manappa Lamani', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (85, '0215b22d-0001-0000-0000-000000002077', 'Basavaraj Neelappa Shivannanavar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (86, '0215b22d-0001-0000-0000-000000002119', 'Ujaneshwar Basavannappa Banakar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (87, '0215b22d-0001-0000-0000-000000002196', 'Prakash Koliwad', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (88, '0215b22d-0001-0000-0000-000000002110', 'Krishna Nayaka', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (89, '0215b22d-0001-0000-0000-000000002111', 'Nemarajanaik.K', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (90, '0215b22d-0001-0000-0000-000000002232', 'H.R.Gaviyappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (92, '0215b22d-0001-0000-0000-000000002217', 'B. M. Nagaraja', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (93, '0215b22d-0001-0000-0000-000000002067', 'B Nagendra', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (94, '0215b22d-0001-0000-0000-000000002242', 'Nara Bharath Reddy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (95, '0215b22d-0001-0000-0000-000000002201', 'E Annapoorna', 'INC', 'INC', '2024-12-09', NULL, 'ACTIVE', TRUE),
  (97, '0215b22d-0001-0000-0000-000000002174', 'N.Y.Gopalakrishna', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (98, '0215b22d-0001-0000-0000-000000004811', 'T Raghumurthy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (99, '0215b22d-0001-0000-0000-000000002092', 'K.C.Veerendra Puppy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (100, '0215b22d-0001-0000-0000-000000002120', 'D Sudakar', 'INC', 'INC', '2023-05-22', '2026-05-10', 'VACATED_DEATH', FALSE),
  (101, '0215b22d-0001-0000-0000-000000002123', 'B G Govindappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (103, '0215b22d-0001-0000-0000-000000002132', 'B.Devendrappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (105, '0215b22d-0001-0000-0000-000000002114', 'B P Harish', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (106, '0215b22d-0001-0000-0000-000000002095', 'S.S.Mallikarjun', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (108, '0215b22d-0001-0000-0000-000000002172', 'K. S. Basavanthappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (109, '0215b22d-0001-0000-0000-000000002083', 'Basavaraju V Shivaganga', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (110, '0215b22d-0001-0000-0000-000000002122', 'Shanthana Gowda.D.G.', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (111, '0215b22d-0001-0000-0000-000000002208', 'Sharada Puryanaik', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (112, '0215b22d-0001-0000-0000-000000004804', 'B K Sangameshwara', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (114, '0215b22d-0001-0000-0000-000000002226', 'Araga Jnanendra', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (115, '0215b22d-0001-0000-0000-000000002207', 'Vijayendra Yediyurappa', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (116, '0215b22d-0001-0000-0000-000000002219', 'Madhu Bangarappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (118, '0215b22d-0001-0000-0000-000000002058', 'Gururaj Shetty Gantihole', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (119, '0215b22d-0001-0000-0000-000000002155', 'Kiran Kumar Kodgi', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (121, '0215b22d-0001-0000-0000-000000002141', 'Gurme Suresh Shetty', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (122, '0215b22d-0001-0000-0000-000000002142', 'V Sunill Kumar', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (123, '0215b22d-0001-0000-0000-000000002220', 'T.D.Rajegowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (124, '0215b22d-0001-0000-0000-000000002177', 'Nayana Motamma', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (125, '0215b22d-0001-0000-0000-000000002086', 'H. D. Thammaiah', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (130, '0215b22d-0001-0000-0000-000000002229', 'M.T.Krishnappa', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (131, '0215b22d-0001-0000-0000-000000002157', 'H D Ranganath', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (133, '0215b22d-0001-0000-0000-000000002228', 'B.Suresh Gowda', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (134, '0215b22d-0001-0000-0000-000000002149', 'G Parameshwara', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (136, '0215b22d-0001-0000-0000-000000002216', 'T B Jayachandra', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (137, '0215b22d-0001-0000-0000-000000002187', 'H.V.Venkatesh', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (139, '0215b22d-0001-0000-0000-000000002103', 'K H Puttaswamy Gowda', NULL, NULL, '2023-05-22', NULL, 'ACTIVE', TRUE),
  (140, '0215b22d-0001-0000-0000-000000002056', 'S.N. Subbareddy (Chinnakayalapalli)', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (141, '0215b22d-0001-0000-0000-000000002088', 'Pradeep Eshwar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (142, '0215b22d-0001-0000-0000-000000002214', 'B N Ravikumar', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (144, '0215b22d-0001-0000-0000-000000002221', 'G.K. Venkatashivareddy', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (146, '0215b22d-0001-0000-0000-000000002146', 'Roopa Kala. M', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (148, '0215b22d-0001-0000-0000-000000002145', 'Kothur.G. Manjunatha', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (149, '0215b22d-0001-0000-0000-000000002166', 'K.Y.Nanjegowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (150, '0215b22d-0001-0000-0000-000000002235', 'S R Vishwanath', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (151, '0215b22d-0001-0000-0000-000000002136', 'B. A. Basavaraja', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (152, '0215b22d-0001-0000-0000-000000002078', 'Krishna Byregowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (153, '0215b22d-0001-0000-0000-000000002239', 'S T Somashekar', 'BJP', NULL, '2023-05-22', NULL, 'ACTIVE', TRUE),
  (154, '0215b22d-0001-0000-0000-000000002193', 'Munirathna', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (156, '0215b22d-0001-0000-0000-000000002163', 'K Gopalaiah', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (157, '0215b22d-0001-0000-0000-000000002165', 'Ashwath Narayan C N', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (158, '0215b22d-0001-0000-0000-000000002117', 'Suresha B S', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (159, '0215b22d-0001-0000-0000-000000002189', 'A C Srinivasa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (161, '0215b22d-0001-0000-0000-000000002079', 'S Raghu', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (162, '0215b22d-0001-0000-0000-000000002210', 'Rizwan Arshad', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (163, '0215b22d-0001-0000-0000-000000004914', 'N A Haris', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (164, '0215b22d-0001-0000-0000-000000002101', 'Dinesh Gundu Rao', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (165, '0215b22d-0001-0000-0000-000000002192', 'S Suresh Kumar', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (166, '0215b22d-0001-0000-0000-000000002105', 'Priyakrishna', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (168, '0215b22d-0001-0000-0000-000000002082', 'B Z Zameer Ahmed Khan', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (169, '0215b22d-0001-0000-0000-000000002087', 'Uday B. Garudachar', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (170, '0215b22d-0001-0000-0000-000000002063', 'Ravi Subramanya', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (171, '0215b22d-0001-0000-0000-000000002186', 'R Ashoka', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (172, '0215b22d-0001-0000-0000-000000002246', 'Ramalinga Reddy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (173, '0215b22d-0001-0000-0000-000000002134', 'C K Ramamurthy', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (175, '0215b22d-0001-0000-0000-000000002076', 'Sathish Reddy M', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (176, '0215b22d-0001-0000-0000-000000002059', 'M Krishnappa', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (178, '0215b22d-0001-0000-0000-000000002124', 'Sharath Bachegowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (179, '0215b22d-0001-0000-0000-000000002098', 'K.H.Muniyappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (180, '0215b22d-0001-0000-0000-000000002100', 'Dheeraj Muniraj', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (181, '0215b22d-0001-0000-0000-000000002184', 'Shreenivasaiah N', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (183, '0215b22d-0001-0000-0000-000000002194', 'H. A. Iqbal Hussain', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (184, '0215b22d-0001-0000-0000-000000002140', 'D K Shivakumar', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (185, '0215b22d-0001-0000-0000-000000002085', 'C P Yogeeshwara', 'INC', 'INC', '2024-12-09', NULL, 'ACTIVE', TRUE),
  (186, '0215b22d-0001-0000-0000-000000002164', 'P.M.Narendraswamy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (188, '0215b22d-0001-0000-0000-000000002173', 'Dharshan Puttannaiah', 'SKP', 'SKP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (190, '0215b22d-0001-0000-0000-000000002213', 'A.B. Ramesha Bandisiddegowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (191, '0215b22d-0001-0000-0000-000000002179', 'N. Chaluvarayaswamy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (193, '0215b22d-0001-0000-0000-000000004872', 'C N Balakrishna', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (194, '0215b22d-0001-0000-0000-000000002050', 'K M Shivalingegowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (197, '0215b22d-0001-0000-0000-000000002121', 'H D Revanna', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (200, '0215b22d-0001-0000-0000-000000002068', 'Harish Poonja', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (202, '0215b22d-0001-0000-0000-000000002168', 'Dr Y Bharath Shetty', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (203, '0215b22d-0001-0000-0000-000000002169', 'D.Vedavyasa Kamath', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (204, '0215b22d-0001-0000-0000-000000002167', 'U.T. Khader Fareed', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (205, '0215b22d-0001-0000-0000-000000002060', 'Rajesh Naik', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (207, '0215b22d-0001-0000-0000-000000002222', 'Bhagirathi Murulya', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (208, '0215b22d-0001-0000-0000-000000002161', 'Dr. Mantar Gowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (209, '0215b22d-0001-0000-0000-000000002233', 'A.S.Ponnanna', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (210, '0215b22d-0001-0000-0000-000000004866', 'K Venkatesh', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (211, '0215b22d-0001-0000-0000-000000002151', 'Ravishankar D', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (212, '0215b22d-0001-0000-0000-000000002130', 'G.D. Harish Gowda', 'JDS', 'JDS', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (214, '0215b22d-0001-0000-0000-000000002181', 'Darshan Dhruvanarayana', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (216, '0215b22d-0001-0000-0000-000000002150', 'T.S. Srivathsa', 'BJP', 'BJP', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (217, '0215b22d-0001-0000-0000-000000007157', 'K Harishgowda', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (218, '0215b22d-0001-0000-0000-000000002182', 'Tanveer Sait', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (219, '0215b22d-0001-0000-0000-000000002231', 'Siddaramaiah', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (220, '0215b22d-0001-0000-0000-000000002223', 'Dr. H C Mahadevappa', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (222, '0215b22d-0001-0000-0000-000000002147', 'A.R.Krishnamurthy', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE),
  (223, '0215b22d-0001-0000-0000-000000002081', 'C Puttarangashetty', 'INC', 'INC', '2023-05-22', NULL, 'ACTIVE', TRUE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.dataset_versions WHERE id = 'eci_karnataka_schedule_xiv_2026_11_27'
  ) OR (SELECT count(*) FROM public.constituencies
        WHERE state_code = 'KA' AND primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27') <> 224
  THEN
    RAISE EXCEPTION 'Verify official Karnataka constituency geography before importing the roster';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviewed_ka_tenures r
    LEFT JOIN public.canonical_persons p ON p.id = r.person_id
    WHERE p.id IS NULL OR p.canonical_name <> r.existing_name
      OR p.metadata->>'stateContext' IS DISTINCT FROM 'KA'
  ) THEN
    RAISE EXCEPTION 'Resolve existing Karnataka canonical identity differences before importing this roster';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviewed_ka_tenures r
    JOIN public.constituencies seat ON seat.state_code = 'KA' AND seat.ac_no = r.ac_no
    JOIN public.elected_tenures t ON t.jurisdiction_id = seat.id
      AND t.office_type = 'mla' AND t.jurisdiction_type = 'assembly_constituency'
    WHERE (t.is_current OR t.term_start = r.term_start)
      AND (t.person_id <> r.person_id OR t.term_start <> r.term_start
        OR t.is_current <> r.is_current OR t.term_end IS DISTINCT FROM r.term_end
        OR t.tenure_status <> r.tenure_status
        OR t.party_at_election IS DISTINCT FROM 'ORG-PARTY-' || r.election_party
        OR t.current_party IS DISTINCT FROM 'ORG-PARTY-' || r.current_party)
  ) THEN
    RAISE EXCEPTION 'A Karnataka tenure already exists with different evidence';
  END IF;
END $$;

INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, record_count, checksum_sha256, default_status, metadata
) VALUES (
  'karnataka_assembly_roster_2026_11_27', 'eci_candidate_disclosures_tenures',
  'karnataka-16th-assembly-2026-11-27', 175, 'fe3ebee3be4b9b5f42da8f9b7799b26b61c483001a6fd80ca78f19ebe83d38f8', 'OFFICIAL',
  jsonb_build_object('source_url', 'https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm',
                     'election_results_url', 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIiFIBAiYVz10R4aWNU%2B2CORL%2BGfbcyryzZ6XBj%2FxKuMkMCjmOUR5vh6qRPW2WUEEltgyj8Db4j5ZKSl4k1aVjQAUAOR5R050ifHKDBgEyatg',
                     'election_results_sha256', 'd7ec7fe1b570f5491133e19bd0fc2e971977944077bc485bd00f9202450caf40',
                     'assembly_term_source', 'https://www.eci.gov.in/term-of-the-houses/')
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evidence_records (
  id, dataset_version_id, artifact_name, artifact_sha256,
  verification_authority, verified_by, verification_notes
) VALUES (
  '474542d4-8762-40ab-9ac5-46363a489430', 'karnataka_assembly_roster_2026_11_27',
  'Sixteenth Karnataka Legislative Assembly roster', 'fe3ebee3be4b9b5f42da8f9b7799b26b61c483001a6fd80ca78f19ebe83d38f8',
  'Karnataka Legislative Assembly', 'poligram_data_reconciliation', 'https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm'
), (
  '0bb8d3f5-a024-4057-a138-02fb560eafcc', 'karnataka_assembly_roster_2026_11_27',
  'Karnataka 2023 Assembly election detailed results', 'd7ec7fe1b570f5491133e19bd0fc2e971977944077bc485bd00f9202450caf40',
  'Election Commission of India', 'poligram_data_reconciliation', 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIiFIBAiYVz10R4aWNU%2B2CORL%2BGfbcyryzZ6XBj%2FxKuMkMCjmOUR5vh6qRPW2WUEEltgyj8Db4j5ZKSl4k1aVjQAUAOR5R050ifHKDBgEyatg'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.provenance_records (
  id, dataset_version_id, source_record_id, status, transformation_type,
  operator, verification_evidence_id
) VALUES (
  'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4', 'karnataka_assembly_roster_2026_11_27',
  'Karnataka-Sixteenth-Assembly-Members', 'OFFICIAL', 'verified_roster_reconciliation',
  'poligram_data_reconciliation', '474542d4-8762-40ab-9ac5-46363a489430'
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.political_organizations
    WHERE (ec_party_code = 'SKP' OR lower(name) = 'sarvodaya karnataka paksha')
      AND id <> 'ORG-PARTY-SKP'
  ) THEN
    RAISE EXCEPTION 'Resolve the existing Sarvodaya Karnataka Paksha registry ID before importing';
  END IF;
END $$;

INSERT INTO public.political_organizations (
  id, org_type, name, short_name, ec_party_code, data_status, provenance_id
) VALUES (
  'ORG-PARTY-SKP', 'political_party', 'Sarvodaya Karnataka Paksha', 'SKP', 'SKP',
  'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT election_party AS code FROM reviewed_ka_tenures
      UNION SELECT current_party FROM reviewed_ka_tenures
    ) AS codes
    WHERE codes.code IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.political_organizations p
      WHERE p.id = 'ORG-PARTY-' || codes.code AND p.org_type = 'political_party'
    )
  ) THEN
    RAISE EXCEPTION 'Resolve missing canonical party IDs before importing the Karnataka roster';
  END IF;
END $$;

INSERT INTO public.elected_tenures (
  person_id, office_type, jurisdiction_type, jurisdiction_id, constituency_version_id,
  term_start, term_end, is_current, tenure_status, party_at_election, current_party,
  data_status, provenance_id
)
SELECT r.person_id, 'mla', 'assembly_constituency', seat.id, seat.current_version_id,
       r.term_start, r.term_end, r.is_current, r.tenure_status,
       'ORG-PARTY-' || r.election_party, 'ORG-PARTY-' || r.current_party, 'OFFICIAL',
       'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
FROM reviewed_ka_tenures r
JOIN public.constituencies seat ON seat.state_code = 'KA' AND seat.ac_no = r.ac_no
WHERE NOT EXISTS (
  SELECT 1 FROM public.elected_tenures t WHERE t.office_type = 'mla'
    AND t.jurisdiction_type = 'assembly_constituency' AND t.jurisdiction_id = seat.id
    AND t.term_start = r.term_start
);

INSERT INTO public.tenure_vacancies (
  tenure_id, person_id, vacancy_reason, effective_date, notifying_authority,
  notes, data_status, provenance_id
)
SELECT t.id, t.person_id, 'DEATH', r.term_end, 'Karnataka Legislative Assembly',
       'The Assembly roster records the death of the Hiriyur member on 10 May 2026.',
       'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
FROM reviewed_ka_tenures r
JOIN public.constituencies seat ON seat.state_code = 'KA' AND seat.ac_no = r.ac_no
JOIN public.elected_tenures t ON t.jurisdiction_id = seat.id AND t.person_id = r.person_id
  AND t.term_start = r.term_start AND t.office_type = 'mla'
  AND t.jurisdiction_type = 'assembly_constituency'
WHERE r.ac_no = 100 AND r.tenure_status = 'VACATED_DEATH'
  AND NOT EXISTS (SELECT 1 FROM public.tenure_vacancies v WHERE v.tenure_id = t.id);

DO $$
BEGIN
  IF (SELECT count(*) FROM reviewed_ka_tenures r
      JOIN public.constituencies seat ON seat.state_code = 'KA' AND seat.ac_no = r.ac_no
      JOIN public.elected_tenures t ON t.jurisdiction_id = seat.id AND t.person_id = r.person_id
        AND t.term_start = r.term_start AND t.office_type = 'mla'
        AND t.jurisdiction_type = 'assembly_constituency') <> 175
  THEN
    RAISE EXCEPTION 'Karnataka roster verification failed';
  END IF;
END $$;

COMMIT;
