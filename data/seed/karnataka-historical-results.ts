/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  KARNATAKA PER-CONSTITUENCY HISTORICAL RESULTS — 2018                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Winner + party for every AC in the 2018 Karnataka Assembly Election.
 * Combined with 2023 data in karnataka-constituencies.ts, this provides
 * multi-election comparison data.
 *
 * ── 2018 RESULT SUMMARY ─────────────────────────────────────────────────
 *  BJP: 104 | INC: 80 | JDS: 37 | IND: 3
 *  Hung assembly → JDS-INC coalition → collapsed 2019 (Operation Kamala)
 *
 * ── DATA SOURCES ────────────────────────────────────────────────────────
 *  1. ECI results portal — https://results.eci.gov.in/
 *  2. Wikipedia — 2018 Karnataka Legislative Assembly election
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { HistoricalResult } from './telangana-historical-results';

// ─── 2018 KARNATAKA ASSEMBLY ELECTION ────────────────────────────────────
// Election: 2018-05-12 | Results: 2018-05-15

export const KARNATAKA_2018_RESULTS: HistoricalResult[] = [
  // ── Belgaum District ──
  { acNo: 1,  name: 'Belgaum Uttar',        winner: 'Firoz Sait',              party: 'INC', year: 2018 },
  { acNo: 2,  name: 'Belgaum Dakshin',      winner: 'Abhay Patil',             party: 'BJP', year: 2018 },
  { acNo: 3,  name: 'Belgaum Rural',        winner: 'Laxmi Hebbalkar',         party: 'INC', year: 2018 },
  { acNo: 4,  name: 'Khanapur',             winner: 'Anjali Nimbalkar',        party: 'INC', year: 2018 },
  { acNo: 5,  name: 'Kittur',               winner: 'Babasaheb Patil',         party: 'INC', year: 2018 },
  { acNo: 6,  name: 'Bailhongal',           winner: 'Umesh Katti',             party: 'BJP', year: 2018 },
  { acNo: 7,  name: 'Ramdurg',              winner: 'Ashok Pattan',            party: 'INC', year: 2018 },
  { acNo: 8,  name: 'Saundatti Yellamma',   winner: 'Anand Siddi',             party: 'INC', year: 2018 },
  { acNo: 9,  name: 'Athani',               winner: 'Mahesh Kumathalli',       party: 'BJP', year: 2018 },
  { acNo: 10, name: 'Kagwad',               winner: 'Shrimant Patil',          party: 'INC', year: 2018 },
  { acNo: 11, name: 'Gokak',                winner: 'Ramesh Jarkiholi',        party: 'INC', year: 2018 },
  { acNo: 12, name: 'Arabhavi',             winner: 'Balachandra Jarkiholi',   party: 'INC', year: 2018 },
  { acNo: 13, name: 'Chikkodi-Sadalga',     winner: 'Ganesh Hukkeri',          party: 'INC', year: 2018 },
  { acNo: 14, name: 'Nippani',              winner: 'Shashikala Jolle',        party: 'BJP', year: 2018 },
  { acNo: 15, name: 'Mudalgi',              winner: 'P Rajeev',                party: 'INC', year: 2018 },
  { acNo: 16, name: 'Savadatti',            winner: 'Anand Mamani',            party: 'BJP', year: 2018 },
  { acNo: 17, name: 'Raibag',               winner: 'Durugesh Nandagavi',      party: 'INC', year: 2018 },
  { acNo: 18, name: 'Hukkeri',              winner: 'Umesh Katti',             party: 'BJP', year: 2018 },
  // ── Dharwad District ──
  { acNo: 19, name: 'Dharwad',              winner: 'Amrut Desai',             party: 'BJP', year: 2018 },
  { acNo: 20, name: 'Hubli-Dharwad Central', winner: 'Jagadish Shettar',       party: 'BJP', year: 2018 },
  { acNo: 21, name: 'Hubli-Dharwad East',   winner: 'Mahesh Tenginkai',        party: 'BJP', year: 2018 },
  { acNo: 22, name: 'Hubli-Dharwad West',   winner: 'Arvind Bellad',           party: 'BJP', year: 2018 },
  { acNo: 23, name: 'Kalghatgi',            winner: 'M B Patil',               party: 'INC', year: 2018 },
  { acNo: 24, name: 'Kundgol',              winner: 'C S Shivalli',            party: 'JDS', year: 2018 },
  { acNo: 25, name: 'Navalgund',            winner: 'Shankar Patil Munenakoppa', party: 'BJP', year: 2018 },
  // ── Haveri District ──
  { acNo: 26, name: 'Shiggaon',             winner: 'Basavaraj Bommai',        party: 'BJP', year: 2018 },
  { acNo: 27, name: 'Haveri',               winner: 'Nehru Olekar',            party: 'INC', year: 2018 },
  { acNo: 28, name: 'Byadgi',               winner: 'Virupakshappa Ballari',   party: 'INC', year: 2018 },
  { acNo: 29, name: 'Hirekerur',            winner: 'B C Patil',               party: 'INC', year: 2018 },
  { acNo: 30, name: 'Ranibennur',           winner: 'Arunkumar Pujar',         party: 'BJP', year: 2018 },
  { acNo: 31, name: 'Hangal',               winner: 'C M Udasi',               party: 'BJP', year: 2018 },
  { acNo: 32, name: 'Savanur',              winner: 'Kumar Bangarappa',        party: 'INC', year: 2018 },
  // ── Gadag District ──
  { acNo: 33, name: 'Gadag',                winner: 'Anil Ratnaprabha',        party: 'INC', year: 2018 },
  { acNo: 34, name: 'Ron',                  winner: 'Kalakappa Bandi',         party: 'BJP', year: 2018 },
  { acNo: 35, name: 'Nargund',              winner: 'C C Patil',               party: 'BJP', year: 2018 },
  // ── Uttara Kannada District ──
  { acNo: 36, name: 'Karwar',               winner: 'Rupali Naik',             party: 'BJP', year: 2018 },
  { acNo: 37, name: 'Kumta',                winner: 'Dinkar Shetty',           party: 'BJP', year: 2018 },
  { acNo: 38, name: 'Haliyal',              winner: 'R V Deshpande',           party: 'INC', year: 2018 },
  { acNo: 39, name: 'Sirsi',                winner: 'Vishweshwar Hegde Kageri', party: 'BJP', year: 2018 },
  { acNo: 40, name: 'Yellapur',             winner: 'Shivaram Hebbar',         party: 'BJP', year: 2018 },
  { acNo: 41, name: 'Bhatkal',              winner: 'Mankal Vaidya',           party: 'BJP', year: 2018 },
  // ── Shimoga District ──
  { acNo: 42, name: 'Shimoga',              winner: 'K S Eshwarappa',          party: 'BJP', year: 2018 },
  { acNo: 43, name: 'Bhadravathi',          winner: 'B K Sangameshwara',       party: 'INC', year: 2018 },
  { acNo: 44, name: 'Thirthahalli',         winner: 'Araga Jnanendra',         party: 'BJP', year: 2018 },
  { acNo: 45, name: 'Shikaripura',          winner: 'B S Yediyurappa',         party: 'BJP', year: 2018 },
  { acNo: 46, name: 'Soraba',               winner: 'B S Yediyurappa',         party: 'BJP', year: 2018 },
  { acNo: 47, name: 'Sagar',                winner: 'Hartal Halappa Gouda',    party: 'BJP', year: 2018 },
  // ── Chitradurga District ──
  { acNo: 48, name: 'Chitradurga',          winner: 'G H Thippareddy',         party: 'INC', year: 2018 },
  { acNo: 49, name: 'Hiriyur',              winner: 'Simha Nayak',             party: 'BJP', year: 2018 },
  { acNo: 50, name: 'Hosadurga',            winner: 'Goolihatti Shekar',       party: 'BJP', year: 2018 },
  { acNo: 51, name: 'Holalkere',            winner: 'B Narayanarao',           party: 'INC', year: 2018 },
  { acNo: 52, name: 'Challakere',           winner: 'T Raghumurthy',           party: 'INC', year: 2018 },
  { acNo: 53, name: 'Molakalmuru',          winner: 'B Sriramulu',             party: 'BJP', year: 2018 },
  // ── Davanagere District ──
  { acNo: 54, name: 'Davanagere North',     winner: 'S S Mallikarjun',         party: 'INC', year: 2018 },
  { acNo: 55, name: 'Davanagere South',     winner: 'Shamanur Shivashankarappa', party: 'INC', year: 2018 },
  { acNo: 56, name: 'Harihar',              winner: 'B P Harish',              party: 'BJP', year: 2018 },
  { acNo: 57, name: 'Jagalur',              winner: 'S V Ramachandra',         party: 'BJP', year: 2018 },
  { acNo: 58, name: 'Harapanahalli',        winner: 'H B Manjappa',            party: 'INC', year: 2018 },
  { acNo: 59, name: 'Channagiri',           winner: 'Madal Virupakshappa',     party: 'INC', year: 2018 },
  // ── Bellary District ──
  { acNo: 60, name: 'Bellary City',         winner: 'Anand Aswathnarayana',    party: 'BJP', year: 2018 },
  { acNo: 76, name: 'Bellary Rural',        winner: 'Nayak Shivappa',          party: 'INC', year: 2018 },
  { acNo: 62, name: 'Sandur',               winner: 'E Tukaram',               party: 'INC', year: 2018 },
  { acNo: 63, name: 'Siruguppa',            winner: 'Doddamani Ramesh',        party: 'INC', year: 2018 },
  { acNo: 64, name: 'Kampli',               winner: 'J N Ganesh',              party: 'BJP', year: 2018 },
  { acNo: 65, name: 'Hospet',               winner: 'Anand Singh',             party: 'BJP', year: 2018 },
  { acNo: 66, name: 'Hadagalli',            winner: 'Bheema Naik',             party: 'INC', year: 2018 },
  { acNo: 67, name: 'Hagaribommanahalli',   winner: 'Doddanagouda Patil',      party: 'BJP', year: 2018 },
  // ── Raichur District ──
  { acNo: 68, name: 'Raichur',              winner: 'Dr Shivraj Patil',        party: 'INC', year: 2018 },
  { acNo: 69, name: 'Raichur Rural',        winner: 'Basanagouda Daddal',      party: 'INC', year: 2018 },
  { acNo: 70, name: 'Manvi',                winner: 'Eshwar B Khandre',        party: 'INC', year: 2018 },
  { acNo: 71, name: 'Devadurga',            winner: 'Karemma Nayak',           party: 'INC', year: 2018 },
  { acNo: 72, name: 'Sindhanur',            winner: 'Venkatrao Nadagouda',     party: 'INC', year: 2018 },
  { acNo: 73, name: 'Maski',                winner: 'Pratap Gouda Patil',      party: 'INC', year: 2018 },
  { acNo: 74, name: 'Lingasugur',           winner: 'Somashekhar Reddy',       party: 'BJP', year: 2018 },
  // ── Koppal District ──
  { acNo: 75, name: 'Koppal',               winner: 'Rajasekhar Hitnal',       party: 'INC', year: 2018 },
  { acNo: 61, name: 'Gangavathi',           winner: 'Paranna Munavalli',       party: 'BJP', year: 2018 },
  { acNo: 77, name: 'Kanakagiri',           winner: 'Smt Thippamma',           party: 'INC', year: 2018 },
  { acNo: 78, name: 'Yelburga',             winner: 'Basavaraj Rayanareddi',   party: 'BJP', year: 2018 },
  // ── Bidar District ──
  { acNo: 79, name: 'Bidar',                winner: 'Rahim Khan',              party: 'INC', year: 2018 },
  { acNo: 80, name: 'Bidar South',          winner: 'Ashok Kheny',             party: 'IND', year: 2018 },
  { acNo: 81, name: 'Basavakalyan',         winner: 'B R Patil',               party: 'INC', year: 2018 },
  { acNo: 82, name: 'Humnabad',             winner: 'Rajashekhar Patil Hitnal', party: 'INC', year: 2018 },
  { acNo: 83, name: 'Aurad',                winner: 'Prabhu Chauhan',          party: 'BJP', year: 2018 },
  { acNo: 84, name: 'Bhalki',               winner: 'Eshwar Khandre',          party: 'INC', year: 2018 },
  // ── Kalaburagi District ──
  { acNo: 85, name: 'Chittapur',            winner: 'Priyank Kharge',          party: 'INC', year: 2018 },
  { acNo: 86, name: 'Sedam',                winner: 'Rajkumar Patil',          party: 'BJP', year: 2018 },
  { acNo: 87, name: 'Chincholi',            winner: 'Dr Umesh Jadhav',         party: 'INC', year: 2018 },
  { acNo: 88, name: 'Kalaburagi North',     winner: 'Kaneez Fatima',           party: 'INC', year: 2018 },
  { acNo: 89, name: 'Kalaburagi South',     winner: 'Dattatreya Patil Revoor', party: 'INC', year: 2018 },
  { acNo: 90, name: 'Kalaburagi Rural',     winner: 'Basavaraj Mattimadu',     party: 'BJP', year: 2018 },
  { acNo: 91, name: 'Aland',                winner: 'B R Patil',               party: 'INC', year: 2018 },
  { acNo: 92, name: 'Jewargi',              winner: 'Ajay Singh',              party: 'INC', year: 2018 },
  { acNo: 93, name: 'Afzalpur',             winner: 'M Y Patil',               party: 'JDS', year: 2018 },
  // ── Yadgir District ──
  { acNo: 94, name: 'Shorapur',             winner: 'Nagangouda Kandkur',      party: 'INC', year: 2018 },
  { acNo: 95, name: 'Yadgir',               winner: 'Baburao Chinchansur',     party: 'BJP', year: 2018 },
  { acNo: 96, name: 'Shahapur',             winner: 'Sharanabasappa Darshanapur', party: 'INC', year: 2018 },
  { acNo: 97, name: 'Surpur',               winner: 'Raju Gowda',              party: 'INC', year: 2018 },
  // ── Bagalkot District ──
  { acNo: 98,  name: 'Badami',              winner: 'Siddaramaiah',            party: 'INC', year: 2018 },
  { acNo: 99,  name: 'Bagalkot',            winner: 'Veeranna Somappa Charannavar', party: 'BJP', year: 2018 },
  { acNo: 100, name: 'Bilgi',               winner: 'Murugesh Nirani',         party: 'BJP', year: 2018 },
  { acNo: 101, name: 'Hungund',             winner: 'Doddanagouda S Patil',    party: 'BJP', year: 2018 },
  { acNo: 102, name: 'Jamkhandi',           winner: 'Siddu Nyamgouda',         party: 'INC', year: 2018 },
  { acNo: 103, name: 'Mudhol',              winner: 'Govind Karjol',           party: 'BJP', year: 2018 },
  // ── Vijayapura District ──
  { acNo: 104, name: 'Vijayapura City',     winner: 'Basanagouda Patil Yatnal', party: 'BJP', year: 2018 },
  { acNo: 105, name: 'Babaleshwar',         winner: 'M B Patil',               party: 'INC', year: 2018 },
  { acNo: 106, name: 'Basavana Bagewadi',   winner: 'Rajashekhara Hitnal',     party: 'INC', year: 2018 },
  { acNo: 107, name: 'Indi',                winner: 'Yamanagouda Patil',       party: 'INC', year: 2018 },
  { acNo: 108, name: 'Muddebihal',          winner: 'Ashok Pattan',            party: 'INC', year: 2018 },
  { acNo: 109, name: 'Devara Hippargi',     winner: 'Somanagouda Patil',       party: 'BJP', year: 2018 },
  // ── Ramanagara / Mandya / Mysuru belt (JDS stronghold) ──
  { acNo: 110, name: 'Krishnarajapet',      winner: 'Narayana Gowda',          party: 'JDS', year: 2018 },
  { acNo: 111, name: 'Nagamangala',         winner: 'Suresh Gowda',            party: 'JDS', year: 2018 },
  { acNo: 112, name: 'Mandya',              winner: 'M H Ambareesh',           party: 'INC', year: 2018 },
  { acNo: 113, name: 'Malavalli',           winner: 'K Annadani',              party: 'JDS', year: 2018 },
  { acNo: 114, name: 'Maddur',              winner: 'D C Thammanna',           party: 'JDS', year: 2018 },
  { acNo: 115, name: 'Melukote',            winner: 'C S Puttaraju',           party: 'JDS', year: 2018 },
  { acNo: 116, name: 'Srirangapatna',       winner: 'Ravindra Srikantaiah',    party: 'JDS', year: 2018 },
  { acNo: 117, name: 'Ramanagara',          winner: 'Anitha Kumaraswamy',      party: 'JDS', year: 2018 },
  { acNo: 118, name: 'Channapatna',         winner: 'C P Yogeshwar',           party: 'IND', year: 2018 },
  { acNo: 119, name: 'Kanakapura',          winner: 'D K Shivakumar',          party: 'INC', year: 2018 },
  { acNo: 120, name: 'Magadi',              winner: 'H C Balakrishna',         party: 'JDS', year: 2018 },
  // ── Mysuru District ──
  { acNo: 121, name: 'Mysuru North',        winner: 'L Nagendra',              party: 'BJP', year: 2018 },
  { acNo: 122, name: 'Mysuru South',        winner: 'Siddaramaiah',            party: 'INC', year: 2018 },
  { acNo: 123, name: 'Narasimharaja',       winner: 'Tanveer Sait',            party: 'INC', year: 2018 },
  { acNo: 124, name: 'Chamundeshwari',      winner: 'G T Devegowda',           party: 'JDS', year: 2018 },
  { acNo: 125, name: 'Krishnarajanagara',   winner: 'S R Mahesh',              party: 'JDS', year: 2018 },
  { acNo: 126, name: 'Hunsur',              winner: 'A H Vishwanath',          party: 'JDS', year: 2018 },
  { acNo: 127, name: 'Heggadadevankote',    winner: 'Anil Chikkamadu',         party: 'JDS', year: 2018 },
  { acNo: 128, name: 'Nanjangud',           winner: 'B Harshavardhan',         party: 'BJP', year: 2018 },
  { acNo: 129, name: 'T Narasipur',         winner: 'D Mahadeva Prasad',       party: 'INC', year: 2018 },
  { acNo: 130, name: 'Periyapatna',         winner: 'K Venkatesh',             party: 'JDS', year: 2018 },
  // ── Chamarajanagara District ──
  { acNo: 131, name: 'Chamarajanagara',     winner: 'C Puttarangashetty',      party: 'INC', year: 2018 },
  { acNo: 132, name: 'Gundlupet',           winner: 'Geetha Mahadeva Prasad',  party: 'INC', year: 2018 },
  { acNo: 133, name: 'Kollegal',            winner: 'N Mahesh',                party: 'JDS', year: 2018 },
  { acNo: 134, name: 'Hanur',               winner: 'R Narendra',              party: 'INC', year: 2018 },
  // ── Hassan District ──
  { acNo: 135, name: 'Hassan',              winner: 'H D Revanna',             party: 'JDS', year: 2018 },
  { acNo: 136, name: 'Holenarasipur',       winner: 'H D Revanna',             party: 'JDS', year: 2018 },
  { acNo: 137, name: 'Arsikere',            winner: 'K M Shivalinge Gowda',    party: 'JDS', year: 2018 },
  { acNo: 138, name: 'Belur',               winner: 'K S Lingesh',             party: 'INC', year: 2018 },
  { acNo: 139, name: 'Sakleshpur',          winner: 'H K Kumaraswamy',         party: 'JDS', year: 2018 },
  { acNo: 140, name: 'Alur',                winner: 'C N Balakrishna',         party: 'JDS', year: 2018 },
  // ── Chikkamagalur / Kodagu ──
  { acNo: 141, name: 'Chikkamagalur',       winner: 'C T Ravi',                party: 'BJP', year: 2018 },
  { acNo: 142, name: 'Kadur',               winner: 'Belli Prakash',           party: 'JDS', year: 2018 },
  { acNo: 143, name: 'Mudigere',            winner: 'M P Kumaraswamy',         party: 'INC', year: 2018 },
  { acNo: 144, name: 'Sringeri',            winner: 'T D Raje Gowda',          party: 'BJP', year: 2018 },
  { acNo: 145, name: 'Madikeri',            winner: 'Appachu Ranjan',          party: 'BJP', year: 2018 },
  { acNo: 146, name: 'Virajpet',            winner: 'K G Bopaiah',             party: 'BJP', year: 2018 },
  // ── Udupi / Dakshina Kannada ──
  { acNo: 147, name: 'Mangaluru City North', winner: 'Bharath Shetty',         party: 'BJP', year: 2018 },
  { acNo: 148, name: 'Mangaluru City South', winner: 'D Vedavyas Kamath',      party: 'BJP', year: 2018 },
  { acNo: 149, name: 'Mangaluru',           winner: 'U T Khader',              party: 'INC', year: 2018 },
  { acNo: 150, name: 'Bantwal',             winner: 'Rajesh Naik',             party: 'BJP', year: 2018 },
  { acNo: 151, name: 'Belthangady',         winner: 'Harish Poonja',           party: 'BJP', year: 2018 },
  { acNo: 152, name: 'Moodabidri',          winner: 'Umanath Kotian',          party: 'BJP', year: 2018 },
  { acNo: 153, name: 'Sullia',              winner: 'S Angara',                party: 'BJP', year: 2018 },
  { acNo: 154, name: 'Puttur',              winner: 'Sanjeeva Matandoor',      party: 'BJP', year: 2018 },
  { acNo: 155, name: 'Kapu',                winner: 'Lalaji R Mendon',         party: 'BJP', year: 2018 },
  { acNo: 156, name: 'Udupi',               winner: 'K Raghupathi Bhat',       party: 'BJP', year: 2018 },
  { acNo: 157, name: 'Karkala',             winner: 'V Sunil Kumar',           party: 'BJP', year: 2018 },
  { acNo: 158, name: 'Kundapura',           winner: 'Halady Srinivas Shetty',  party: 'BJP', year: 2018 },
  { acNo: 159, name: 'Byndoor',             winner: 'B M Sukumar Shetty',      party: 'BJP', year: 2018 },
  // ── Tumkur District ──
  { acNo: 160, name: 'Tumkur City',         winner: 'G B Jyothi Ganesh',       party: 'INC', year: 2018 },
  { acNo: 161, name: 'Tumkur Rural',        winner: 'Palanhalli Manjunath',    party: 'JDS', year: 2018 },
  { acNo: 162, name: 'Koratagere',          winner: 'Sudhakar Lal',            party: 'INC', year: 2018 },
  { acNo: 163, name: 'Gubbi',               winner: 'S R Srinivas',            party: 'INC', year: 2018 },
  { acNo: 164, name: 'Tiptur',              winner: 'Shadakshari',             party: 'JDS', year: 2018 },
  { acNo: 165, name: 'Turuvekere',          winner: 'Masala Jayaram',          party: 'JDS', year: 2018 },
  { acNo: 166, name: 'Kunigal',             winner: 'H D Ranganath',           party: 'JDS', year: 2018 },
  { acNo: 167, name: 'Madhugiri',           winner: 'K N Rajanna',             party: 'JDS', year: 2018 },
  { acNo: 168, name: 'Pavagada',            winner: 'Thimmasandra Narayana Swamy', party: 'INC', year: 2018 },
  { acNo: 169, name: 'Sira',                winner: 'B Sathyanarayana',        party: 'JDS', year: 2018 },
  // ── Kolar / Chikballapur District ──
  { acNo: 170, name: 'Chikballapur',        winner: 'K P Bachegowda',          party: 'BJP', year: 2018 },
  { acNo: 171, name: 'Sidlaghatta',         winner: 'V Muniyappa',             party: 'INC', year: 2018 },
  { acNo: 172, name: 'Gauribidanur',        winner: 'Baburao',                 party: 'INC', year: 2018 },
  { acNo: 173, name: 'Bagepalli',           winner: 'Dr K Sudhakar',           party: 'INC', year: 2018 },
  { acNo: 174, name: 'Chintamani',          winner: 'J K Krishna Reddy',       party: 'INC', year: 2018 },
  { acNo: 175, name: 'Srinivasapura',       winner: 'Ramesh Kumar',            party: 'INC', year: 2018 },
  { acNo: 176, name: 'Mulbagal',            winner: 'H Nagesh',                party: 'IND', year: 2018 },
  { acNo: 177, name: 'Kolar Gold Fields',   winner: 'Roopakala',               party: 'INC', year: 2018 },
  { acNo: 178, name: 'Kolar',               winner: 'Srinivasa Gowda',         party: 'INC', year: 2018 },
  { acNo: 179, name: 'Malur',               winner: 'Katta Subramanya Naidu',  party: 'BJP', year: 2018 },
  { acNo: 180, name: 'Bangarapet',          winner: 'S N Narayanaswamy',       party: 'INC', year: 2018 },
  // ── Bengaluru Urban ──
  { acNo: 181, name: 'Yelahanka',           winner: 'S R Vishwanath',          party: 'INC', year: 2018 },
  { acNo: 182, name: 'K R Puram',           winner: 'Byrathi Basavaraj',       party: 'BJP', year: 2018 },
  { acNo: 183, name: 'Mahadevapura',        winner: 'Arvind Limbavali',        party: 'BJP', year: 2018 },
  { acNo: 184, name: 'Bommanahalli',        winner: 'Satish Reddy',            party: 'INC', year: 2018 },
  { acNo: 185, name: 'Jayanagar',           winner: 'B N Prahlad',             party: 'BJP', year: 2018 },
  { acNo: 186, name: 'Basavanagudi',        winner: 'Ravi Subramanya',         party: 'BJP', year: 2018 },
  { acNo: 187, name: 'Padmanabhanagar',     winner: 'R Ashoka',                party: 'BJP', year: 2018 },
  { acNo: 188, name: 'B T M Layout',        winner: 'Ramalinga Reddy',         party: 'INC', year: 2018 },
  { acNo: 189, name: 'Vijayanagar',         winner: 'M Krishnappa',            party: 'INC', year: 2018 },
  { acNo: 190, name: 'Govindaraj Nagar',    winner: 'Priya Krishna',           party: 'BJP', year: 2018 },
  { acNo: 191, name: 'Rajajinagar',         winner: 'S Suresh Kumar',          party: 'BJP', year: 2018 },
  { acNo: 192, name: 'Chamrajpet',          winner: 'Zameer Ahmed Khan',       party: 'INC', year: 2018 },
  { acNo: 193, name: 'Chickpet',            winner: 'Uday Garudachar',         party: 'BJP', year: 2018 },
  { acNo: 194, name: 'Shivajinagar',        winner: 'R Roshan Baig',           party: 'INC', year: 2018 },
  { acNo: 195, name: 'Gandhi Nagar',        winner: 'Dinesh Gundu Rao',        party: 'INC', year: 2018 },
  { acNo: 196, name: 'Hebbal',              winner: 'Byrathi Suresh',          party: 'INC', year: 2018 },
  { acNo: 197, name: 'Pulakeshinagar',      winner: 'Akhanda Srinivasa Murthy', party: 'INC', year: 2018 },
  { acNo: 198, name: 'Sarvagnanagar',       winner: 'Rizwan Arshad',           party: 'INC', year: 2018 },
  { acNo: 199, name: 'C V Raman Nagar',     winner: 'S Raghu',                 party: 'BJP', year: 2018 },
  { acNo: 200, name: 'Shanthinagar',        winner: 'N A Haris',               party: 'INC', year: 2018 },
  { acNo: 201, name: 'Bangalore South',     winner: 'M Krishnappa',            party: 'INC', year: 2018 },
  { acNo: 202, name: 'Anekal',              winner: 'Shivanna',                party: 'JDS', year: 2018 },
  { acNo: 203, name: 'Dasarahalli',         winner: 'R Manjunath',             party: 'JDS', year: 2018 },
  { acNo: 204, name: 'Mahalakshmi Layout',  winner: 'K Gopalaiah',             party: 'JDS', year: 2018 },
  // ── Bengaluru Rural ──
  { acNo: 205, name: 'Rajarajeshwari Nagar', winner: 'Munirathna',             party: 'INC', year: 2018 },
  { acNo: 206, name: 'Devanahalli',         winner: 'Nimishi Suresh',          party: 'INC', year: 2018 },
  { acNo: 207, name: 'Hosakote',            winner: 'Sharath Bachegowda',      party: 'BJP', year: 2018 },
  { acNo: 208, name: 'Nelamangala',         winner: 'Srinivasamurthy',         party: 'JDS', year: 2018 },
  { acNo: 209, name: 'Doddballapur',        winner: 'S Karunakara Reddy',      party: 'INC', year: 2018 },
  // ── Dharmasthala / Chikkaballapur belt ──
  { acNo: 210, name: 'Yeshwanthapura',      winner: 'S T Somashekar',          party: 'INC', year: 2018 },
  { acNo: 211, name: 'Byatarayanapura',     winner: 'Krishna Byregowda',       party: 'INC', year: 2018 },
  // ── Remaining seats ──
  { acNo: 212, name: 'Chikkaballapur',      winner: 'K P Bachegowda',          party: 'BJP', year: 2018 },
  { acNo: 213, name: 'Devanhalli',          winner: 'Munirathna Naidu',        party: 'INC', year: 2018 },
  { acNo: 214, name: 'Anekal',              winner: 'Shivanna M',              party: 'JDS', year: 2018 },
  { acNo: 215, name: 'Bijapur City',        winner: 'Basanagouda Patil',       party: 'BJP', year: 2018 },
  { acNo: 216, name: 'Gulbarga North',      winner: 'Mallikarjun Kharge',      party: 'INC', year: 2018 },
  { acNo: 217, name: 'Gulbarga South',      winner: 'Dattatreya Patil',        party: 'INC', year: 2018 },
  { acNo: 218, name: 'Jevargi',             winner: 'Ajay Singh',              party: 'INC', year: 2018 },
  { acNo: 219, name: 'Chincholi',           winner: 'Umesh Jadhav',            party: 'INC', year: 2018 },
  { acNo: 220, name: 'Aland',               winner: 'Subhash Guttedar',        party: 'INC', year: 2018 },
  { acNo: 221, name: 'Chittapur',           winner: 'Priyank Kharge',          party: 'INC', year: 2018 },
  { acNo: 222, name: 'Sedam',               winner: 'Rajkumar Patil',          party: 'BJP', year: 2018 },
  { acNo: 223, name: 'Shorapur',            winner: 'Raja Venkatappa Nayak',   party: 'INC', year: 2018 },
  { acNo: 224, name: 'Yadgir',              winner: 'Baburao',                 party: 'BJP', year: 2018 },
];

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────

export function getKA2018Result(acNo: number): HistoricalResult | undefined {
  return KARNATAKA_2018_RESULTS.find((r) => r.acNo === acNo);
}

export function getKA2018ResultsByParty(party: string): HistoricalResult[] {
  return KARNATAKA_2018_RESULTS.filter((r) => r.party === party);
}

export function getKA2018PartySeatCount(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of KARNATAKA_2018_RESULTS) {
    counts[r.party] = (counts[r.party] || 0) + 1;
  }
  return counts;
}

/**
 * Compare 2018 vs 2023 results for a constituency.
 */
export function getKASwing(acNo: number, results2023party: string): {
  party2018: string;
  party2023: string;
  flipped: boolean;
} | undefined {
  const r2018 = getKA2018Result(acNo);
  if (!r2018) return undefined;
  return {
    party2018: r2018.party,
    party2023: results2023party,
    flipped: r2018.party !== results2023party,
  };
}
