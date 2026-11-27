-- Correct Karnataka's constituency numbering and segment links using the ECI
-- Delimitation Order 2008, Schedule XIV, Tables A and B. Keep stable seat IDs,
-- parliamentary UUIDs, and the existing mapping and localization tables.
-- Assembly names in Kannada come from the Karnataka Legislative Assembly roster.
BEGIN;

CREATE TEMP TABLE reviewed_ka_pcs (
  pc_no integer PRIMARY KEY, name text NOT NULL, reservation text NOT NULL
) ON COMMIT DROP;
INSERT INTO reviewed_ka_pcs VALUES
  (1, 'Chikkodi', 'general'),
  (2, 'Belgaum', 'general'),
  (3, 'Bagalkot', 'general'),
  (4, 'Bijapur', 'sc'),
  (5, 'Gulbarga', 'sc'),
  (6, 'Raichur', 'st'),
  (7, 'Bidar', 'general'),
  (8, 'Koppal', 'general'),
  (9, 'Bellary', 'st'),
  (10, 'Haveri', 'general'),
  (11, 'Dharwad', 'general'),
  (12, 'Uttara Kannada', 'general'),
  (13, 'Davanagere', 'general'),
  (14, 'Shimoga', 'general'),
  (15, 'Udupi Chikmagalur', 'general'),
  (16, 'Hassan', 'general'),
  (17, 'Dakshina Kannada', 'general'),
  (18, 'Chitradurga', 'sc'),
  (19, 'Tumkur', 'general'),
  (20, 'Mandya', 'general'),
  (21, 'Mysore', 'general'),
  (22, 'Chamarajanagar', 'sc'),
  (23, 'Bangalore Rural', 'general'),
  (24, 'Bangalore North', 'general'),
  (25, 'Bangalore Central', 'general'),
  (26, 'Bangalore South', 'general'),
  (27, 'Chikkballapur', 'general'),
  (28, 'Kolar', 'sc');

CREATE TEMP TABLE reviewed_ka_acs (
  ac_no integer PRIMARY KEY, name text NOT NULL, kannada_name text NOT NULL,
  reservation text NOT NULL, district_in_order text NOT NULL,
  pc_no integer NOT NULL REFERENCES reviewed_ka_pcs(pc_no)
) ON COMMIT DROP;
INSERT INTO reviewed_ka_acs VALUES
  (1, 'Nippani', 'ನಿಪ್ಪಾಣಿ', 'GEN', 'Belgaum', 1),
  (2, 'Chikkodi-Sadalga', 'ಚಿಕ್ಕೋಡಿ-ಸದಲಗ', 'GEN', 'Belgaum', 1),
  (3, 'Athani', 'ಅಥಣಿ', 'GEN', 'Belgaum', 1),
  (4, 'Kagawad', 'ಕಾಗವಾಡ', 'GEN', 'Belgaum', 1),
  (5, 'Kudachi', 'ಕುಡಚಿ', 'SC', 'Belgaum', 1),
  (6, 'Raibag', 'ರಾಯಬಾಗ', 'SC', 'Belgaum', 1),
  (7, 'Hukkeri', 'ಹುಕ್ಕೇರಿ', 'GEN', 'Belgaum', 1),
  (8, 'Arabhavi', 'ಅರಬಾವಿ', 'GEN', 'Belgaum', 2),
  (9, 'Gokak', 'ಗೋಕಾಕ', 'GEN', 'Belgaum', 2),
  (10, 'Yemkanmardi', 'ಯಮಕನಮರಡಿ', 'ST', 'Belgaum', 1),
  (11, 'Belgaum Uttar', 'ಬೆಳಗಾವಿ ಉತ್ತರ', 'GEN', 'Belgaum', 2),
  (12, 'Belgaum Dakshin', 'ಬೆಳಗಾವಿ ದಕ್ಷಿಣ', 'GEN', 'Belgaum', 2),
  (13, 'Belgaum Rural', 'ಬೆಳಗಾವಿ ಗ್ರಾಮಾಂತರ', 'GEN', 'Belgaum', 2),
  (14, 'Khanapur', 'ಖಾನಾಪುರ', 'GEN', 'Belgaum', 12),
  (15, 'Kittur', 'ಕಿತ್ತೂರು', 'GEN', 'Belgaum', 12),
  (16, 'Bailhongal', 'ಬೈಲಹೊಂಗಲ', 'GEN', 'Belgaum', 2),
  (17, 'Saundatti Yellamma', 'ಸವದತ್ತಿ ಯಲ್ಲಮ್ಮ', 'GEN', 'Belgaum', 2),
  (18, 'Ramadurg', 'ರಾಮದುರ್ಗ', 'GEN', 'Belgaum', 2),
  (19, 'Mudhol', 'ಮುಧೋಳ', 'SC', 'Bagalkot', 3),
  (20, 'Terdal', 'ತೇರದಾಳ', 'GEN', 'Bagalkot', 3),
  (21, 'Jamakhandi', 'ಜಮಖಂಡಿ', 'GEN', 'Bagalkot', 3),
  (22, 'Bilgi', 'ಬೀಳಗಿ', 'GEN', 'Bagalkot', 3),
  (23, 'Badami', 'ಬಾದಾಮಿ', 'GEN', 'Bagalkot', 3),
  (24, 'Bagalkot', 'ಬಾಗಲಕೋಟೆ', 'GEN', 'Bagalkot', 3),
  (25, 'Hungund', 'ಹುನಗುಂದ', 'GEN', 'Bagalkot', 3),
  (26, 'Muddebihal', 'ಮುದ್ದೇಬಿಹಾಳ', 'GEN', 'Bijapur', 4),
  (27, 'Devara Hippargi', 'ದೇವರಹಿಪ್ಪರಗಿ', 'GEN', 'Bijapur', 4),
  (28, 'Basavana Bagevadi', 'ಬಸವನ ಬಾಗೇವಾಡಿ', 'GEN', 'Bijapur', 4),
  (29, 'Babaleshwar', 'ಬಬಲೇಶ್ವರ', 'GEN', 'Bijapur', 4),
  (30, 'Bijapur City', 'ಬಿಜಾಪುರ ನಗರ', 'GEN', 'Bijapur', 4),
  (31, 'Nagthan', 'ನಾಗಠಾಣ', 'SC', 'Bijapur', 4),
  (32, 'Indi', 'ಇಂಡಿ', 'GEN', 'Bijapur', 4),
  (33, 'Sindgi', 'ಸಿಂಧಗಿ', 'GEN', 'Bijapur', 4),
  (34, 'Afzalpur', 'ಅಫ್ಜಲ್‌ಪುರ', 'GEN', 'Gulbarga', 5),
  (35, 'Jewargi', 'ಜೇವರ್ಗಿ', 'GEN', 'Gulbarga', 5),
  (36, 'Shorapur', 'ಶೋರಾಪುರ', 'ST', 'Gulbarga', 6),
  (37, 'Shahapur', 'ಶಹಾಪುರ್‌', 'GEN', 'Gulbarga', 6),
  (38, 'Yadagir', 'ಯಾದಗಿರಿ', 'GEN', 'Gulbarga', 6),
  (39, 'Gurmitkal', 'ಗುರ್‌ಮಿಠ್‌ಕಲ್‌', 'GEN', 'Gulbarga', 5),
  (40, 'Chittapur', 'ಚಿತ್ತಾಪುರ', 'SC', 'Gulbarga', 5),
  (41, 'Sedam', 'ಸೇಡಂ', 'GEN', 'Gulbarga', 5),
  (42, 'Chincholi', 'ಚಿಂಚೋಳಿ', 'SC', 'Gulbarga', 7),
  (43, 'Gulbarga Rural', 'ಗುಲ್ಬರ್ಗಾ ಗ್ರಾಮಾಂತರ', 'SC', 'Gulbarga', 5),
  (44, 'Gulbarga Dakshin', 'ಗುಲ್ಬರ್ಗಾ ದಕ್ಷಿಣ', 'GEN', 'Gulbarga', 5),
  (45, 'Gulbarga Uttar', 'ಗುಲ್ಬರ್ಗಾ ಉತ್ತರ', 'GEN', 'Gulbarga', 5),
  (46, 'Aland', 'ಆಳಂದ', 'GEN', 'Gulbarga', 7),
  (47, 'Basavakalyan', 'ಬಸವಕಲ್ಯಾಣ', 'GEN', 'Bidar', 7),
  (48, 'Humnabad', 'ಹುಮ್ನಾಬಾದ್‌', 'GEN', 'Bidar', 7),
  (49, 'Bidar South', 'ಬೀದರ್‌ ದಕ್ಷಿಣ', 'GEN', 'Bidar', 7),
  (50, 'Bidar', 'ಬೀದರ್‌', 'GEN', 'Bidar', 7),
  (51, 'Bhalki', 'ಭಾಲ್ಕಿ', 'GEN', 'Bidar', 7),
  (52, 'Aurad', 'ಔರದ್', 'SC', 'Bidar', 7),
  (53, 'Raichur Rural', 'ರಾಯಚೂರು ಗ್ರಾಮಾಂತರ', 'ST', 'Raichur', 6),
  (54, 'Raichur', 'ರಾಯಚೂರು', 'GEN', 'Raichur', 6),
  (55, 'Manvi', 'ಮಾನ್ವಿ', 'ST', 'Raichur', 6),
  (56, 'Devadurga', 'ದೇವದುರ್ಗ', 'ST', 'Raichur', 6),
  (57, 'Lingasagur', 'ಲಿಂಗಸಗೂರು', 'SC', 'Raichur', 6),
  (58, 'Sindhanoor', 'ಸಿಂಧನೂರು', 'GEN', 'Raichur', 8),
  (59, 'Maski', 'ಮಸ್ಕಿ', 'ST', 'Raichur', 8),
  (60, 'Kushtagi', 'ಕುಷ್ಟಗಿ', 'GEN', 'Koppal', 8),
  (61, 'Kanakagiri', 'ಕನಕಗಿರಿ', 'SC', 'Koppal', 8),
  (62, 'Gangavathi', 'ಗಂಗಾವತಿ', 'GEN', 'Koppal', 8),
  (63, 'Yelburga', 'ಯಲಬುರ್ಗ', 'GEN', 'Koppal', 8),
  (64, 'Koppal', 'ಕೊಪ್ಪಳ', 'GEN', 'Koppal', 8),
  (65, 'Shirahatti', 'ಶಿರಹಟ್ಟಿ', 'SC', 'Gadag', 10),
  (66, 'Gadag', 'ಗದಗ', 'GEN', 'Gadag', 10),
  (67, 'Ron', 'ರೋಣ', 'GEN', 'Gadag', 10),
  (68, 'Naragund', 'ನರಗುಂದ', 'GEN', 'Gadag', 3),
  (69, 'Navalgund', 'ನವಲಗುಂದ', 'GEN', 'Dharwad', 11),
  (70, 'Kundagol', 'ಕುಂದಗೋಳ', 'GEN', 'Dharwad', 11),
  (71, 'Dharwad', 'ಧಾರವಾಡ', 'GEN', 'Dharwad', 11),
  (72, 'Hubli-Dharwad-East', 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ-ಪೂರ್ವ', 'SC', 'Dharwad', 11),
  (73, 'Hubli-Dharwad-Central', 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ-ಕೇಂದ್ರ', 'GEN', 'Dharwad', 11),
  (74, 'Hubli-Dharwad-West', 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ-ಪಶ್ಚಿಮ', 'GEN', 'Dharwad', 11),
  (75, 'Kalghatagi', 'ಕಲಘಟಗಿ', 'GEN', 'Dharwad', 11),
  (76, 'Haliyal', 'ಹಳಿಯಾಳ', 'GEN', 'Uttara Kannada', 12),
  (77, 'Karwar', 'ಕಾರವಾರ', 'GEN', 'Uttara Kannada', 12),
  (78, 'Kumta', 'ಕುಮಟ', 'GEN', 'Uttara Kannada', 12),
  (79, 'Bhatkal', 'ಭಟ್ಕಳ', 'GEN', 'Uttara Kannada', 12),
  (80, 'Sirsi', 'ಶಿರಸಿ', 'GEN', 'Uttara Kannada', 12),
  (81, 'Yellapur', 'ಯಲ್ಲಾಪುರ', 'GEN', 'Uttara Kannada', 12),
  (82, 'Hanagal', 'ಹಾನಗಲ್', 'GEN', 'Haveri', 10),
  (83, 'Shiggaon', 'ಶಿಗ್ಗಾಂವ್', 'GEN', 'Haveri', 11),
  (84, 'Haveri', 'ಹಾವೇರಿ', 'SC', 'Haveri', 10),
  (85, 'Byadagi', 'ಬ್ಯಾಡಗಿ', 'GEN', 'Haveri', 10),
  (86, 'Hirekerur', 'ಹೀರೇಕೆರೂರು', 'GEN', 'Haveri', 10),
  (87, 'Ranebennur', 'ರಾಣೇಬೆನ್ನೂರು', 'GEN', 'Haveri', 10),
  (88, 'Hadagali', 'ಹಡಗಲಿ', 'SC', 'Bellary', 9),
  (89, 'Hagaribommanahalli', 'ಹಗರಿಬೊಮ್ಮನಹಳ್ಳಿ', 'SC', 'Bellary', 9),
  (90, 'Vijayanagara', 'ವಿಜಯನಗರ', 'GEN', 'Bellary', 9),
  (91, 'Kampli', 'ಕಂಪ್ಲಿ', 'ST', 'Bellary', 9),
  (92, 'Siruguppa', 'ಸಿರಗುಪ್ಪ', 'ST', 'Bellary', 8),
  (93, 'Bellary', 'ಬಳ್ಳಾರಿ', 'ST', 'Bellary', 9),
  (94, 'Bellary City', 'ಬಳ್ಳಾರಿ ನಗರ', 'GEN', 'Bellary', 9),
  (95, 'Sandur', 'ಸಂಡೂರು', 'ST', 'Bellary', 9),
  (96, 'Kudligi', 'ಕೂಡ್ಲಿಗಿ', 'ST', 'Bellary', 9),
  (97, 'Molakalmuru', 'ಮೊಳಕಾಲ್ಮೂರು', 'ST', 'Chitradurga', 18),
  (98, 'Challakere', 'ಚಳ್ಳಕೆರೆ', 'ST', 'Chitradurga', 18),
  (99, 'Chitradurga', 'ಚಿತ್ರದುರ್ಗ', 'GEN', 'Chitradurga', 18),
  (100, 'Hiriyur', 'ಹಿರಿಯೂರು', 'GEN', 'Chitradurga', 18),
  (101, 'Hosadurga', 'ಹೊಸದುರ್ಗ', 'GEN', 'Chitradurga', 18),
  (102, 'Holalkere', 'ಹೊಳಲ್ಕೆರೆ', 'SC', 'Chitradurga', 18),
  (103, 'Jagalur', 'ಜಗಳೂರು', 'ST', 'Davanagere', 13),
  (104, 'Harapanahalli', 'ಹರಪನಹಳ್ಳಿ', 'GEN', 'Davanagere', 13),
  (105, 'Harihar', 'ಹರಿಹರ', 'GEN', 'Davanagere', 13),
  (106, 'Davanagere North', 'ದಾವಣಗೆರೆ ಉತ್ತರ', 'GEN', 'Davanagere', 13),
  (107, 'Davanagere South', 'ದಾವಣಗೆರೆ ದಕ್ಷಿಣ', 'GEN', 'Davanagere', 13),
  (108, 'Mayakonda', 'ಮಾಯಕೊಂಡ', 'SC', 'Davanagere', 13),
  (109, 'Channagiri', 'ಚನ್ನಗಿರಿ', 'GEN', 'Davanagere', 13),
  (110, 'Honnali', 'ಹೊನ್ನಾಳಿ', 'GEN', 'Davanagere', 13),
  (111, 'Shimoga Rural', 'ಶಿವಮೊಗ್ಗ ಗ್ರಾಮಾಂತರ', 'SC', 'Shimoga', 14),
  (112, 'Bhadravathi', 'ಭದ್ರಾವತಿ', 'GEN', 'Shimoga', 14),
  (113, 'Shimoga', 'ಶಿವಮೊಗ್ಗ', 'GEN', 'Shimoga', 14),
  (114, 'Thirthahalli', 'ತೀರ್ಥಹಳ್ಳಿ', 'GEN', 'Shimoga', 14),
  (115, 'Shikaripura', 'ಶಿಕಾರಿಪುರ', 'GEN', 'Shimoga', 14),
  (116, 'Soraba', 'ಸೊರಬ', 'GEN', 'Shimoga', 14),
  (117, 'Sagara', 'ಸಾಗರ', 'GEN', 'Shimoga', 14),
  (118, 'Baindur', 'ಬೈಂದೂರು', 'GEN', 'Udupi', 14),
  (119, 'Coonadapur/Kundapura', 'ಕುಂದಾಪುರ', 'GEN', 'Udupi', 15),
  (120, 'Udupi', 'ಉಡುಪಿ', 'GEN', 'Udupi', 15),
  (121, 'Kaup', 'ಕಾಪು', 'GEN', 'Udupi', 15),
  (122, 'Karkala', 'ಕಾರ್ಕಳ', 'GEN', 'Udupi', 15),
  (123, 'Sringeri', 'ಶೃಂಗೇರಿ', 'GEN', 'Chickmagalur', 15),
  (124, 'Mudigere', 'ಮೂಡಿಗೆರೆ', 'SC', 'Chickmagalur', 15),
  (125, 'Chikmagalur', 'ಚಿಕ್ಕಮಗಳೂರು', 'GEN', 'Chickmagalur', 15),
  (126, 'Tarikere', 'ತರೀಕೆರೆ', 'GEN', 'Chickmagalur', 15),
  (127, 'Kadur', 'ಕಡೂರು', 'GEN', 'Chickmagalur', 16),
  (128, 'Chikkanayakanahalli', 'ಚಿಕ್ಕನಾಯಕನಹಳ್ಳಿ', 'GEN', 'Tumkur', 19),
  (129, 'Tiptur', 'ತಿಪಟೂರು', 'GEN', 'Tumkur', 19),
  (130, 'Turuvekere', 'ತುರುವೇಕೆರೆ', 'GEN', 'Tumkur', 19),
  (131, 'Kunigal', 'ಕುಣಿಗಲ್‌', 'GEN', 'Tumkur', 23),
  (132, 'Tumkur City', 'ತುಮಕೂರು ನಗರ', 'GEN', 'Tumkur', 19),
  (133, 'Tumkur Rural', 'ತುಮಕೂರು ಗ್ರಾಮಾಂತರ', 'GEN', 'Tumkur', 19),
  (134, 'Koratagere', 'ಕೊರಟಗೆರೆ', 'SC', 'Tumkur', 19),
  (135, 'Gubbi', 'ಗುಬ್ಬಿ', 'GEN', 'Tumkur', 19),
  (136, 'Sira', 'ಸಿರಾ', 'GEN', 'Tumkur', 18),
  (137, 'Pavagada', 'ಪಾವಗಡ', 'SC', 'Tumkur', 18),
  (138, 'Madhugiri', 'ಮಧುಗಿರಿ', 'GEN', 'Tumkur', 19),
  (139, 'Gowribidanur', 'ಗೌರೀಬಿದನೂರು', 'GEN', 'Kolar', 27),
  (140, 'Bagepalli', 'ಬಾಗೇಪಲ್ಲಿ', 'GEN', 'Kolar', 27),
  (141, 'Chikkaballapur', 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ', 'GEN', 'Kolar', 27),
  (142, 'Sidlaghatta', 'ಶಿಡ್ಲಘಟ್ಟ', 'GEN', 'Kolar', 28),
  (143, 'Chintamani', 'ಚಿಂತಾಮಣಿ', 'GEN', 'Kolar', 28),
  (144, 'Srinivasapur', 'ಶ್ರೀನಿವಾಸಪುರ', 'GEN', 'Kolar', 28),
  (145, 'Mulbagal', 'ಮುಳಬಾಗಲು', 'SC', 'Kolar', 28),
  (146, 'Kolar Gold Field', 'ಕೋಲಾರ ಗೋಲ್ಡ್ ಫೀಲ್ಡ್', 'SC', 'Kolar', 28),
  (147, 'Bangarpet', 'ಬಂಗಾರಪೇಟೆ', 'SC', 'Kolar', 28),
  (148, 'Kolar', 'ಕೋಲಾರ', 'GEN', 'Kolar', 28),
  (149, 'Malur', 'ಮಾಲೂರು', 'GEN', 'Kolar', 28),
  (150, 'Yelahanka', 'ಯಲಹಂಕ', 'GEN', 'Bangalore', 27),
  (151, 'K.R. Pura', 'ಕೆ.ಆರ್‌. ಪುರ', 'GEN', 'Bangalore', 24),
  (152, 'Byatarayanapura', 'ಬ್ಯಾಟರಾಯನಪುರ', 'GEN', 'Bangalore', 24),
  (153, 'Yeshvanthapura', 'ಯಶವಂತಪುರ', 'GEN', 'Bangalore', 24),
  (154, 'Rajarajeshwarinagar', 'ರಾಜರಾಜೇಶ್ವರಿನಗರ', 'GEN', 'Bangalore', 23),
  (155, 'Dasarahalli', 'ದಾಸರಹಳ್ಳಿ', 'GEN', 'Bangalore', 24),
  (156, 'Mahalakshmi Layout', 'ಮಹಾಲಕ್ಷ್ಮಿ ಲೇಔಟ್', 'GEN', 'Bangalore', 24),
  (157, 'Malleshwaram', 'ಮಲ್ಲೇಶ್ವರಂ', 'GEN', 'Bangalore', 24),
  (158, 'Hebbal', 'ಹೆಬ್ಬಾಳ', 'GEN', 'Bangalore', 24),
  (159, 'Pulakeshinagar', 'ಪುಲಕೇಶಿನಗರ', 'SC', 'Bangalore', 24),
  (160, 'Sarvagnanagar', 'ಸರ್ವಜ್ಞನಗರ', 'GEN', 'Bangalore', 25),
  (161, 'C.V Raman Nagar', 'ಸಿ.ವಿ.ರಾಮನ್‌ ನಗರ', 'SC', 'Bangalore', 25),
  (162, 'Shivajinagar', 'ಶಿವಾಜಿನಗರ', 'GEN', 'Bangalore', 25),
  (163, 'Shantinagar', 'ಶಾಂತಿನಗರ', 'GEN', 'Bangalore', 25),
  (164, 'Gandhinagar', 'ಗಾಂಧೀನಗರ', 'GEN', 'Bangalore', 25),
  (165, 'Rajajinagar', 'ರಾಜಾಜಿನಗರ', 'GEN', 'Bangalore', 25),
  (166, 'Govindraj Nagar', 'ಗೋವಿಂದರಾಜ ನಗರ', 'GEN', 'Bangalore', 26),
  (167, 'Vijayanagar', 'ವಿಜಯನಗರ್‌', 'GEN', 'Bangalore', 26),
  (168, 'Chamarajpet', 'ಚಾಮರಾಜಪೇಟೆ', 'GEN', 'Bangalore', 25),
  (169, 'Chickpet', 'ಚಿಕ್ಕಪೇಟೆ', 'GEN', 'Bangalore', 26),
  (170, 'Basavanagudi', 'ಬಸವನಗುಡಿ', 'GEN', 'Bangalore', 26),
  (171, 'Padmanaba Nagar', 'ಪದ್ಮನಾಭ ನಗರ', 'GEN', 'Bangalore', 26),
  (172, 'B.T.M Layout', 'ಬಿ.ಟಿ.ಎಂ. ಬಡಾವಣೆ', 'GEN', 'Bangalore', 26),
  (173, 'Jayanagar', 'ಜಯನಗರ', 'GEN', 'Bangalore', 26),
  (174, 'Mahadevapura', 'ಮಹದೇವಪುರ', 'SC', 'Bangalore', 25),
  (175, 'Bommanahalli', 'ಬೊಮ್ಮನಹಳ್ಳಿ', 'GEN', 'Bangalore', 26),
  (176, 'Bangalore South', 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ', 'GEN', 'Bangalore', 23),
  (177, 'Anekal', 'ಆನೇಕಲ್', 'SC', 'Bangalore', 23),
  (178, 'Hosakote', 'ಹೊಸಕೋಟೆ', 'GEN', 'Bangalore Rural', 27),
  (179, 'Devanahalli', 'ದೇವನಹಳ್ಳಿ', 'SC', 'Bangalore Rural', 27),
  (180, 'Doddaballapur', 'ದೊಡ್ಡಬಳ್ಳಾಪುರ', 'GEN', 'Bangalore Rural', 27),
  (181, 'Nelamangala', 'ನೆಲಮಂಗಲ', 'SC', 'Bangalore Rural', 27),
  (182, 'Magadi', 'ಮಾಗಡಿ', 'GEN', 'Bangalore Rural', 23),
  (183, 'Ramanagaram', 'ರಾಮನಗರ', 'GEN', 'Bangalore Rural', 23),
  (184, 'Kanakapura', 'ಕನಕಪುರ', 'GEN', 'Bangalore Rural', 23),
  (185, 'Channapatna', 'ಚನ್ನಪಟ್ಟಣ', 'GEN', 'Bangalore Rural', 23),
  (186, 'Malavalli', 'ಮಳವಳ್ಳಿ', 'SC', 'Mandya', 20),
  (187, 'Maddur', 'ಮದ್ದೂರು', 'GEN', 'Mandya', 20),
  (188, 'Melukote', 'ಮೇಲುಕೋಟೆ', 'GEN', 'Mandya', 20),
  (189, 'Mandya', 'ಮಂಡ್ಯ', 'GEN', 'Mandya', 20),
  (190, 'Shrirangapattana', 'ಶ್ರೀರಂಗಪಟ್ಟಣ', 'GEN', 'Mandya', 20),
  (191, 'Nagamangala', 'ನಾಗಮಂಗಲ', 'GEN', 'Mandya', 20),
  (192, 'Krishnarajapet', 'ಕೃಷ್ಣರಾಜಪೇಟೆ', 'GEN', 'Mandya', 20),
  (193, 'Sravanabelagola', 'ಶ್ರವಣಬೆಳಗೊಳ', 'GEN', 'Hassan', 16),
  (194, 'Arasikere', 'ಅರಸೀಕೆರೆ', 'GEN', 'Hassan', 16),
  (195, 'Belur', 'ಬೇಲೂರು', 'GEN', 'Hassan', 16),
  (196, 'Hassan', 'ಹಾಸನ', 'GEN', 'Hassan', 16),
  (197, 'Holenarasipura', 'ಹೊಳೆನರಸೀಪುರ', 'GEN', 'Hassan', 16),
  (198, 'Arakalgud', 'ಅರಕಲಗೂಡು', 'GEN', 'Hassan', 16),
  (199, 'Sakaleshpur', 'ಸಕಲೇಶಪುರ', 'SC', 'Hassan', 16),
  (200, 'Belthangady', 'ಬೆಳ್ತಂಗಡಿ', 'GEN', 'Dakshina Kannada', 17),
  (201, 'Moodabidri', 'ಮೂಡಬಿದ್ರಿ', 'GEN', 'Dakshina Kannada', 17),
  (202, 'Mangalore City North', 'ಮಂಗಳೂರು ನಗರ ಉತ್ತರ', 'GEN', 'Dakshina Kannada', 17),
  (203, 'Mangalore City South', 'ಮಂಗಳೂರು ನಗರ ದಕ್ಷಿಣ', 'GEN', 'Dakshina Kannada', 17),
  (204, 'Mangalore', 'ಮಂಗಳೂರು', 'GEN', 'Dakshina Kannada', 17),
  (205, 'Bantwal', 'ಬಂಟ್ವಾಳ', 'GEN', 'Dakshina Kannada', 17),
  (206, 'Puttur', 'ಪುತ್ತೂರು', 'GEN', 'Dakshina Kannada', 17),
  (207, 'Sullia', 'ಸುಳ್ಯ', 'SC', 'Dakshina Kannada', 17),
  (208, 'Madikeri', 'ಮಡಿಕೇರಿ', 'GEN', 'Kodagu', 21),
  (209, 'Virajpet', 'ವಿರಾಜಪೇಟೆ', 'GEN', 'Kodagu', 21),
  (210, 'Periyapatna', 'ಪಿರಿಯಾಪಟ್ಟಣ', 'GEN', 'Mysore', 21),
  (211, 'Krishnarajanagara', 'ಕೃಷ್ಣರಾಜನಗರ', 'GEN', 'Mysore', 20),
  (212, 'Hunsur', 'ಹುಣಸೂರು', 'GEN', 'Mysore', 21),
  (213, 'Heggadadevankote', 'ಹೆಗ್ಗಡದೇವನಕೋಟೆ', 'ST', 'Mysore', 22),
  (214, 'Nanjangud', 'ನಂಜನಗೂಡು', 'SC', 'Mysore', 22),
  (215, 'Chamundeshwari', 'ಚಾಮುಂಡೇಶ್ವರಿ', 'GEN', 'Mysore', 21),
  (216, 'Krishnaraja', 'ಕೃಷ್ಣರಾಜ', 'GEN', 'Mysore', 21),
  (217, 'Chamaraja', 'ಚಾಮರಾಜ', 'GEN', 'Mysore', 21),
  (218, 'Narasimharaja', 'ನರಸಿಂಹರಾಜ', 'GEN', 'Mysore', 21),
  (219, 'Varuna', 'ವರುಣ', 'GEN', 'Mysore', 22),
  (220, 'T. Narasipura', 'ಟಿ.ನರಸೀಪುರ', 'SC', 'Mysore', 22),
  (221, 'Hanur', 'ಹನೂರು', 'GEN', 'Chamarajanagar', 22),
  (222, 'Kollegal', 'ಕೊಳ್ಳೇಗಾಲ', 'SC', 'Chamarajanagar', 22),
  (223, 'Chamarajanagar', 'ಚಾಮರಾಜನಗರ', 'GEN', 'Chamarajanagar', 22),
  (224, 'Gundlupet', 'ಗುಂಡ್ಲುಪೇಟೆ', 'GEN', 'Chamarajanagar', 22);

LOCK TABLE public.constituencies, public.constituency_versions,
  public.parliamentary_constituencies, public.parliamentary_constituency_versions,
  public.constituency_parliamentary_mappings IN SHARE ROW EXCLUSIVE MODE;

-- Join parliamentary records by name. The old PC sequence used alphabetical order,
-- so the current numeric code cannot identify the right parliamentary record.
CREATE TEMP TABLE resolved_ka_pcs ON COMMIT DROP AS
SELECT source.*, p.id, p.current_version_id
FROM reviewed_ka_pcs source
JOIN public.parliamentary_constituencies p
  ON p.state_code = 'KA' AND p.is_current
  AND regexp_replace(lower(p.name), '[^a-z0-9]', '', 'g') =
      regexp_replace(lower(source.name), '[^a-z0-9]', '', 'g')
JOIN public.parliamentary_constituency_versions version
  ON version.id = p.current_version_id AND version.pc_id = p.id AND version.is_current
  AND version.delimitation_regime_id = 'eci_delimitation_2008';

CREATE TEMP TABLE resolved_ka_acs ON COMMIT DROP AS
SELECT source.*, ac.id, ac.current_version_id
FROM reviewed_ka_acs source
JOIN public.constituencies ac
  ON ac.id = 'KA-AC-' || source.ac_no AND ac.state_code = 'KA'
  AND ac.ac_no = source.ac_no AND ac.is_current
JOIN public.constituency_versions version
  ON version.id = ac.current_version_id AND version.constituency_internal_id = ac.internal_id
  AND version.is_current AND version.delimitation_regime_id = 'eci_delimitation_2008'
JOIN public.constituency_parliamentary_mappings mapping
  ON mapping.assembly_constituency_version_id = version.id AND mapping.is_current
  AND mapping.delimitation_regime_id = 'eci_delimitation_2008';

DO $$
BEGIN
  IF (SELECT count(*) FROM resolved_ka_pcs) <> 28
    OR (SELECT count(DISTINCT id) FROM resolved_ka_pcs) <> 28
    OR (SELECT count(*) FROM resolved_ka_acs) <> 224
    OR (SELECT count(DISTINCT id) FROM resolved_ka_acs) <> 224
    OR EXISTS (SELECT pc_no FROM reviewed_ka_acs GROUP BY pc_no HAVING count(*) <> 8)
    OR (SELECT count(*) FROM reviewed_ka_acs WHERE reservation = 'SC') <> 36
    OR (SELECT count(*) FROM reviewed_ka_acs WHERE reservation = 'ST') <> 15
  THEN
    RAISE EXCEPTION 'Karnataka geography did not reconcile to the official Schedule XIV';
  END IF;

  -- An older environment can contain content linked under the erroneous labels.
  -- Check those links before changing what the existing constituency IDs describe.
  IF NOT EXISTS (SELECT 1 FROM public.dataset_versions
                 WHERE id = 'eci_karnataka_schedule_xiv_2026_11_27')
    AND (
      EXISTS (SELECT 1 FROM public.posts WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.user_profiles WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.user_favourites WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.civic_issues WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.pages WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.election_results WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.candidacies WHERE constituency_id LIKE 'KA-AC-%')
      OR EXISTS (SELECT 1 FROM public.elected_tenures WHERE jurisdiction_id LIKE 'KA-AC-%')
    )
  THEN
    RAISE EXCEPTION 'Review existing Karnataka records against the corrected seat keys before applying';
  END IF;
END $$;

INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, record_count, checksum_sha256, default_status, metadata
) VALUES (
  'eci_karnataka_schedule_xiv_2026_11_27', 'eci_delimitation_order_2008',
  'karnataka-schedule-xiv-2026-11-27', 252, '9e1ac49aa952febc8e4f57ed23abd28218a21887f355f8dad1502ab5c0d65e69', 'OFFICIAL',
  jsonb_build_object('source_url', 'https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf', 'schedule', 'XIV', 'tables', 'A and B')
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evidence_records (
  id, dataset_version_id, artifact_name, artifact_sha256,
  verification_authority, verified_by, verification_notes
) VALUES (
  '6b5b5d36-7a3c-4bcf-8104-81717ec61c44',
  'eci_karnataka_schedule_xiv_2026_11_27',
  'Delimitation Order 2008: Schedule XIV, Karnataka',
  '9e1ac49aa952febc8e4f57ed23abd28218a21887f355f8dad1502ab5c0d65e69', 'Election Commission of India',
  'poligram_data_reconciliation', '224 unique Assembly segments linked to 28 Lok Sabha seats in Table B.'
), (
  'ccbd876a-7cb6-4967-93bd-4d3575881a17',
  'eci_karnataka_schedule_xiv_2026_11_27',
  'Karnataka Legislative Assembly bilingual seat names',
  'fe3ebee3be4b9b5f42da8f9b7799b26b61c483001a6fd80ca78f19ebe83d38f8', 'Karnataka Legislative Assembly',
  'poligram_data_reconciliation', 'https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.provenance_records (
  id, dataset_version_id, source_record_id, status, transformation_type,
  operator, verification_evidence_id
) VALUES (
  'c4da2aac-502a-45a3-8cdb-4a9066531b80',
  'eci_karnataka_schedule_xiv_2026_11_27',
  'karnataka-assembly-bilingual-constituencies', 'OFFICIAL', 'verified_roster_reconciliation',
  'poligram_data_reconciliation', 'ccbd876a-7cb6-4967-93bd-4d3575881a17'
) ON CONFLICT (id) DO NOTHING;

-- Move the existing code and number out of the target range during the permutation.
-- The UUID of each named parliamentary seat and its existing version both survive.
UPDATE public.parliamentary_constituencies p
SET pc_number = p.pc_number + 1000, code = 'KA-RECONCILE-' || p.pc_number
FROM resolved_ka_pcs source
WHERE p.id = source.id AND p.pc_number <> source.pc_no;

UPDATE public.parliamentary_constituency_versions version
SET version_code = 'KA-RECONCILE-' || version.id
FROM resolved_ka_pcs source
WHERE version.id = source.current_version_id AND version.pc_number <> source.pc_no;

UPDATE public.parliamentary_constituencies p
SET pc_number = source.pc_no, code = 'KA-PC-' || lpad(source.pc_no::text, 2, '0'),
    reservation = source.reservation, updated_at = now(),
    primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27'
FROM resolved_ka_pcs source
WHERE p.id = source.id;

UPDATE public.parliamentary_constituency_versions version
SET pc_number = source.pc_no, version_code = 'KA-PC-' || lpad(source.pc_no::text, 2, '0') || '-2008',
    reservation = source.reservation, updated_at = now(),
    primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27'
FROM resolved_ka_pcs source
WHERE version.id = source.current_version_id;

UPDATE public.constituencies ac
SET name = source.name, reservation_status = source.reservation,
    district = source.district_in_order, updated_at = now(),
    primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27'
FROM resolved_ka_acs source
WHERE ac.id = source.id;

UPDATE public.constituency_versions version
SET name = source.name,
    reservation = CASE source.reservation WHEN 'GEN' THEN 'general' ELSE lower(source.reservation) END,
    updated_at = now(), primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27'
FROM resolved_ka_acs source
WHERE version.id = source.current_version_id;

UPDATE public.constituency_parliamentary_mappings m
SET parliamentary_constituency_version_id = pc.current_version_id, data_status = 'VERIFIED',
    updated_at = now(), source_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27',
    evidence_record_id = '6b5b5d36-7a3c-4bcf-8104-81717ec61c44',
    notes = 'ECI Delimitation Order 2008, Schedule XIV, Table B'
FROM resolved_ka_acs source JOIN resolved_ka_pcs pc ON pc.pc_no = source.pc_no
WHERE m.assembly_constituency_version_id = source.current_version_id AND m.is_current;

INSERT INTO public.entity_multilingual_representations (
  entity_type, entity_id, language_code, script_code, field_key, representation_value,
  representation_type, translation_status, source_evidence, provenance_id
)
SELECT 'constituency', id, 'kn', 'Knda', 'name', kannada_name,
  'OFFICIAL', 'SOURCE_NATIVE', 'https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm',
  'c4da2aac-502a-45a3-8cdb-4a9066531b80'
FROM resolved_ka_acs
ON CONFLICT (entity_type, entity_id, language_code, field_key, representation_type) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM resolved_ka_acs source
    JOIN public.constituencies ac ON ac.id = source.id
    LEFT JOIN public.constituency_parliamentary_mappings m
      ON m.assembly_constituency_version_id = ac.current_version_id AND m.is_current
    LEFT JOIN public.parliamentary_constituency_versions pc ON pc.id = m.parliamentary_constituency_version_id
    LEFT JOIN public.entity_multilingual_representations l ON l.entity_type = 'constituency'
      AND l.entity_id = ac.id AND l.language_code = 'kn' AND l.field_key = 'name'
      AND l.representation_type = 'OFFICIAL'
    WHERE ac.name IS DISTINCT FROM source.name
      OR pc.pc_number IS DISTINCT FROM source.pc_no
      OR m.data_status IS DISTINCT FROM 'VERIFIED'
      OR l.representation_value IS DISTINCT FROM source.kannada_name
  ) THEN
    RAISE EXCEPTION 'Karnataka geography did not persist as reviewed';
  END IF;
END $$;

COMMIT;
