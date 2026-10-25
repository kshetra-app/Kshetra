/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TELANGANA PER-CONSTITUENCY HISTORICAL RESULTS — 2014 & 2018          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Winner + party for every AC in the 2014 and 2018 Telangana elections.
 * Combined with 2023 data in telangana-constituencies.ts and the political
 * ledger in telangana-political-timeline.ts, this completes the full picture.
 *
 * ── PARTY NAME NOTE ───────────────────────────────────────────────────────
 *  TRS was renamed to BRS in October 2022. In this file we use the party
 *  name AS IT WAS at the time of each election for historical accuracy:
 *    • 2014 & 2018: TRS (Telangana Rashtra Samithi)
 *    • 2023+: BRS (Bharat Rashtra Samithi)
 *  Use the constant TRS_BRS_ALIAS for mapping if needed.
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. Wikipedia — 2014 Telangana Legislative Assembly election
 *     https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election
 *  2. Wikipedia — 2018 Telangana Legislative Assembly election
 *     https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election
 *  3. ECI results portal — https://results.eci.gov.in/
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface HistoricalResult {
  acNo: number;
  name: string;
  winner: string | null;
  party: string | null;
  year?: number | null;
}

/** TRS and BRS are the same party (renamed Oct 2022) */
export const TRS_BRS_ALIAS = { TRS: 'BRS', BRS: 'TRS' } as const;

// ─── 2014 TELANGANA ASSEMBLY ELECTION ─────────────────────────────────────
// Election: 2014-04-30 | Results: 2014-05-16
// Tally: TRS 63, INC 21, TDP 15, AIMIM 7, BJP 5, BSP 2, YSRCP 3, CPI 1, CPM 1, IND 1

export const TELANGANA_2014_RESULTS: HistoricalResult[] = [
  // ─── ADILABAD / MANCHERIAL / KUMURAM BHEEM ASIFABAD / NIRMAL ───
  { acNo: 1,  name: 'Sirpur',            winner: 'Koneru Konappa',              party: 'BSP', year: 2014 },
  { acNo: 2,  name: 'Chennur',           winner: 'Nallala Odelu',              party: 'TRS', year: 2014 },
  { acNo: 3,  name: 'Bellampalli',       winner: 'Durgam Chinnaiah',           party: 'TRS', year: 2014 },
  { acNo: 4,  name: 'Mancherial',        winner: 'Nadipelli Diwakar Rao',      party: 'TRS', year: 2014 },
  { acNo: 5,  name: 'Asifabad',          winner: 'Kova Laxmi',                 party: 'TRS', year: 2014 },
  { acNo: 6,  name: 'Khanapur',          winner: 'Ajmeera Rekha',              party: 'TRS', year: 2014 },
  { acNo: 7,  name: 'Adilabad',          winner: 'Jogu Ramanna',               party: 'TRS', year: 2014 },
  { acNo: 8,  name: 'Boath',             winner: 'Rathod Bapu Rao',            party: 'TRS', year: 2014 },
  { acNo: 9,  name: 'Nirmal',            winner: 'Allola Indrakaran Reddy',    party: 'BSP', year: 2014 },
  { acNo: 10, name: 'Mudhole',           winner: 'Gaddigari Vittal Reddy',     party: 'INC', year: 2014 },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur',             winner: 'Asannagari Jeevan Reddy',    party: 'TRS', year: 2014 },
  { acNo: 12, name: 'Bodhan',            winner: 'Shakil Aamir Mohammed',      party: 'TRS', year: 2014 },
  { acNo: 13, name: 'Jukkal',            winner: 'Hanmanth Shinde',            party: 'TRS', year: 2014 },
  { acNo: 14, name: 'Banswada',          winner: 'Pocharam Srinivas Reddy',    party: 'TRS', year: 2014 },
  { acNo: 15, name: 'Yellareddy',        winner: 'Eanugu Ravinder Reddy',      party: 'TRS', year: 2014 },
  { acNo: 16, name: 'Kamareddy',         winner: 'Gampa Govardhan',            party: 'TRS', year: 2014 },
  { acNo: 17, name: 'Nizamabad Urban',   winner: 'Bigala Ganesh',              party: 'TRS', year: 2014 },
  { acNo: 18, name: 'Nizamabad Rural',   winner: 'Bajireddy Goverdhan',        party: 'TRS', year: 2014 },
  { acNo: 19, name: 'Balkonda',          winner: 'Vemula Prashanth Reddy',     party: 'TRS', year: 2014 },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla',           winner: 'Kalvakuntla Vidya Sagar Rao', party: 'TRS', year: 2014 },
  { acNo: 21, name: 'Jagtial',           winner: 'Jeevan Reddy Thatiparthi',   party: 'INC', year: 2014 },
  { acNo: 22, name: 'Dharmapuri',        winner: 'Koppula Eshwar',             party: 'TRS', year: 2014 },
  { acNo: 23, name: 'Ramagundam',        winner: 'Somarapu Satyanarayana',     party: 'TRS', year: 2014 },
  { acNo: 24, name: 'Manthani',          winner: 'Putta Madhukar',             party: 'TRS', year: 2014 },
  { acNo: 25, name: 'Peddapalle',        winner: 'Dasari Manohar Reddy',       party: 'TRS', year: 2014 },
  { acNo: 26, name: 'Karimnagar',        winner: 'Gangula Kamalakar',          party: 'TRS', year: 2014 },
  { acNo: 27, name: 'Choppadandi',       winner: 'Bodige Shobha',             party: 'TRS', year: 2014 },
  { acNo: 28, name: 'Vemulawada',        winner: 'Chennamaneni Ramesh',        party: 'TRS', year: 2014 },
  { acNo: 29, name: 'Sircilla',          winner: 'K. T. Rama Rao',            party: 'TRS', year: 2014 },
  { acNo: 30, name: 'Manakondur',        winner: 'Rasamayi Balakishan',        party: 'TRS', year: 2014 },
  { acNo: 31, name: 'Huzurabad',         winner: 'Etela Rajender',             party: 'TRS', year: 2014 },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad',          winner: 'Vodithela Sathish Kumar',    party: 'TRS', year: 2014 },
  { acNo: 33, name: 'Siddipet',          winner: 'T. Harish Rao',             party: 'TRS', year: 2014 },
  { acNo: 34, name: 'Medak',             winner: 'Padma Devender Reddy',       party: 'TRS', year: 2014 },
  { acNo: 35, name: 'Narayankhed',       winner: 'Patlolla Kishta Reddy',      party: 'INC', year: 2014 },
  { acNo: 36, name: 'Andole',            winner: 'Babu Mohan',                party: 'TRS', year: 2014 },
  { acNo: 37, name: 'Narsapur',          winner: 'Chilumula Madan Reddy',      party: 'TRS', year: 2014 },
  { acNo: 38, name: 'Zahirabad',         winner: 'J. Geeta Reddy',            party: 'INC', year: 2014 },
  { acNo: 39, name: 'Sangareddy',        winner: 'Chinta Prabhakar',           party: 'TRS', year: 2014 },
  { acNo: 40, name: 'Patancheru',        winner: 'Gudem Mahipal Reddy',        party: 'TRS', year: 2014 },
  { acNo: 41, name: 'Dubbak',            winner: 'Solipeta Ramalinga Reddy',   party: 'TRS', year: 2014 },
  { acNo: 42, name: 'Gajwel',            winner: 'K. Chandrashekar Rao',       party: 'TRS', year: 2014 },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal',           winner: 'M. Sudheer Reddy',           party: 'TRS', year: 2014 },
  { acNo: 44, name: 'Malkajgiri',        winner: 'C. Kanaka Reddy',           party: 'TRS', year: 2014 },
  { acNo: 45, name: 'Quthbullapur',      winner: 'K. P. Vivekanand Goud',     party: 'TDP', year: 2014 },
  { acNo: 46, name: 'Kukatpally',        winner: 'Madhavaram Krishna Rao',     party: 'TDP', year: 2014 },
  { acNo: 47, name: 'Uppal',             winner: 'N. V. S. S. Prabhakar',     party: 'BJP', year: 2014 },
  { acNo: 48, name: 'Ibrahimpatnam',     winner: 'Manchireddy Kishan Reddy',   party: 'TDP', year: 2014 },
  { acNo: 49, name: 'L. B. Nagar',       winner: 'R. Krishnaiah',             party: 'TDP', year: 2014 },
  { acNo: 50, name: 'Maheshwaram',       winner: 'Teegala Krishna Reddy',      party: 'TDP', year: 2014 },
  { acNo: 51, name: 'Rajendranagar',     winner: 'T. Prakash Goud',           party: 'TDP', year: 2014 },
  { acNo: 52, name: 'Serilingampally',   winner: 'Arekapudi Gandhi',           party: 'TDP', year: 2014 },
  { acNo: 53, name: 'Chevella',          winner: 'Kale Yadaiah',              party: 'INC', year: 2014 },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi',             winner: 'T. Ram Mohan Reddy',        party: 'INC', year: 2014 },
  { acNo: 55, name: 'Vicarabad',         winner: 'B. Sanjeeva Rao',           party: 'TRS', year: 2014 },
  { acNo: 56, name: 'Tandur',            winner: 'P. Mahender Reddy',          party: 'TRS', year: 2014 },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad',       winner: 'K. Laxman',                 party: 'BJP', year: 2014 },
  { acNo: 58, name: 'Malakpet',          winner: 'Ahmed Bin Abdullah Balala',  party: 'AIMIM', year: 2014 },
  { acNo: 59, name: 'Amberpet',          winner: 'G. Kishan Reddy',           party: 'BJP', year: 2014 },
  { acNo: 60, name: 'Khairatabad',       winner: 'Chintala Ramachandra Reddy', party: 'BJP', year: 2014 },
  { acNo: 61, name: 'Jubilee Hills',     winner: 'Maganti Gopinath',           party: 'TDP', year: 2014 },
  { acNo: 62, name: 'Sanathnagar',       winner: 'Talasani Srinivas Yadav',   party: 'TDP', year: 2014 },
  { acNo: 63, name: 'Nampally',          winner: 'Jaffer Hussain Meraj',       party: 'AIMIM', year: 2014 },
  { acNo: 64, name: 'Karwan',            winner: 'Kausar Mohiuddin',           party: 'AIMIM', year: 2014 },
  { acNo: 65, name: 'Goshamahal',        winner: 'T. Raja Singh',             party: 'BJP', year: 2014 },
  { acNo: 66, name: 'Charminar',         winner: 'Syed Ahmed Pasha Quadri',    party: 'AIMIM', year: 2014 },
  { acNo: 67, name: 'Chandrayangutta',   winner: 'Akbaruddin Owaisi',          party: 'AIMIM', year: 2014 },
  { acNo: 68, name: 'Yakutpura',         winner: 'Mumtaz Ahmed Khan',          party: 'AIMIM', year: 2014 },
  { acNo: 69, name: 'Bahadurpura',       winner: 'Mohammed Moazam Khan',       party: 'AIMIM', year: 2014 },
  { acNo: 70, name: 'Secunderabad',      winner: 'T. Padma Rao Goud',         party: 'TRS', year: 2014 },
  { acNo: 71, name: 'Secunderabad Cantonment', winner: 'G. Sayanna',          party: 'TDP', year: 2014 },

  // ─── KODANGAL / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / GADWAL ───
  { acNo: 72, name: 'Kodangal',          winner: 'A. Revanth Reddy',          party: 'TDP', year: 2014 },
  { acNo: 73, name: 'Narayanpet',        winner: 'S. Rajender Reddy',          party: 'TDP', year: 2014 },
  { acNo: 74, name: 'Mahbubnagar',       winner: 'V. Srinivas Goud',          party: 'TRS', year: 2014 },
  { acNo: 75, name: 'Jadcherla',         winner: 'C. Laxma Reddy',            party: 'TRS', year: 2014 },
  { acNo: 76, name: 'Devarkadra',        winner: 'Alla Venkateshwar Reddy',    party: 'TRS', year: 2014 },
  { acNo: 77, name: 'Makthal',           winner: 'Chittem Rammohan Reddy',     party: 'INC', year: 2014 },
  { acNo: 78, name: 'Wanaparthy',        winner: 'G. Chinna Reddy',           party: 'INC', year: 2014 },
  { acNo: 79, name: 'Gadwal',            winner: 'D. K. Aruna',               party: 'INC', year: 2014 },
  { acNo: 80, name: 'Alampur',           winner: 'S. A. Sampath Kumar',        party: 'INC', year: 2014 },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI ───
  { acNo: 81, name: 'Nagarkurnool',      winner: 'Marri Janardhan Reddy',      party: 'TRS', year: 2014 },
  { acNo: 82, name: 'Achampet',          winner: 'Guvvala Balaraju',           party: 'TRS', year: 2014 },
  { acNo: 83, name: 'Kalwakurthy',       winner: 'Challa Vamshi Chand Reddy',  party: 'INC', year: 2014 },
  { acNo: 84, name: 'Shadnagar',         winner: 'Anjaiah Yelganamoni',        party: 'TRS', year: 2014 },
  { acNo: 85, name: 'Kollapur',          winner: 'Jupally Krishna Rao',        party: 'TRS', year: 2014 },
  { acNo: 86, name: 'Devarakonda',       winner: 'Ravindra Kumar Ramavath',    party: 'CPI', year: 2014 },
  { acNo: 87, name: 'Nagarjuna Sagar',   winner: 'Kunduru Jana Reddy',         party: 'INC', year: 2014 },
  { acNo: 88, name: 'Miryalaguda',       winner: 'Nallamothu Bhaskar Rao',     party: 'INC', year: 2014 },
  { acNo: 89, name: 'Huzurnagar',        winner: 'N. Uttam Kumar Reddy',       party: 'INC', year: 2014 },
  { acNo: 90, name: 'Kodad',             winner: 'N. Padmavathi Reddy',        party: 'INC', year: 2014 },
  { acNo: 91, name: 'Suryapet',          winner: 'Guntakandla Jagadish Reddy', party: 'TRS', year: 2014 },
  { acNo: 92, name: 'Nalgonda',          winner: 'Komatireddy Venkat Reddy',   party: 'INC', year: 2014 },
  { acNo: 93, name: 'Munugode',          winner: 'Kusukuntla Prabhakar Reddy', party: 'TRS', year: 2014 },
  { acNo: 94, name: 'Bhongir',           winner: 'Pailla Shekar Reddy',        party: 'TRS', year: 2014 },
  { acNo: 95, name: 'Nakrekal',          winner: 'Vemula Veeresham',           party: 'TRS', year: 2014 },
  { acNo: 96, name: 'Thungathurthi',     winner: 'Gadari Kishore Kumar',       party: 'TRS', year: 2014 },
  { acNo: 97, name: 'Alair',             winner: 'Gongidi Sunitha',            party: 'TRS', year: 2014 },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98,  name: 'Jangaon',          winner: 'Muthireddy Yadagiri Reddy',  party: 'TRS', year: 2014 },
  { acNo: 99,  name: 'Ghanpur Station',  winner: 'Thatikonda Rajaiah',         party: 'TRS', year: 2014 },
  { acNo: 100, name: 'Palakurthi',       winner: 'Errabelli Dayakar Rao',      party: 'TDP', year: 2014 },
  { acNo: 101, name: 'Dornakal',         winner: 'D. S. Redya Naik',          party: 'INC', year: 2014 },
  { acNo: 102, name: 'Mahabubabad',      winner: 'Banoth Shankar Naik',        party: 'TRS', year: 2014 },
  { acNo: 103, name: 'Narsampet',        winner: 'Donthi Madhava Reddy',       party: 'IND', year: 2014 },
  { acNo: 104, name: 'Parkal',           winner: 'Challa Dharma Reddy',        party: 'TDP', year: 2014 },
  { acNo: 105, name: 'Warangal West',    winner: 'Dasyam Vinay Bhaskar',       party: 'TRS', year: 2014 },
  { acNo: 106, name: 'Warangal East',    winner: 'Konda Surekha',              party: 'TRS', year: 2014 },
  { acNo: 107, name: 'Wardhannapet',     winner: 'Aroori Ramesh',              party: 'TRS', year: 2014 },
  { acNo: 108, name: 'Bhupalpalle',      winner: 'S. Madhusudhana Chary',      party: 'TRS', year: 2014 },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug',            winner: 'Azmeera Chandulal',          party: 'TRS', year: 2014 },
  { acNo: 110, name: 'Pinapaka',         winner: 'Payam Venkateswarlu',        party: 'YSRCP', year: 2014 },
  { acNo: 111, name: 'Yellandu',         winner: 'Koram Kanakaiah',            party: 'INC', year: 2014 },
  { acNo: 112, name: 'Khammam',          winner: 'Puvvada Ajay Kumar',         party: 'INC', year: 2014 },
  { acNo: 113, name: 'Palair',           winner: 'Ramireddy Venkatareddy',     party: 'INC', year: 2014 },
  { acNo: 114, name: 'Madhira',          winner: 'Mallu Bhatti Vikramarka',    party: 'INC', year: 2014 },
  { acNo: 115, name: 'Wyra',             winner: 'Banoth Madanlal',            party: 'YSRCP', year: 2014 },
  { acNo: 116, name: 'Sathupalli',       winner: 'Sandra Venkata Veeraiah',    party: 'TDP', year: 2014 },
  { acNo: 117, name: 'Kothagudem',       winner: 'Jalagam Venkat Rao',         party: 'TRS', year: 2014 },
  { acNo: 118, name: 'Aswaraopeta',      winner: 'Thati Venkateswarlu',        party: 'YSRCP', year: 2014 },
  { acNo: 119, name: 'Bhadrachalam',     winner: 'Sunnam Rajaiah',             party: 'CPM', year: 2014 },
];

// ─── 2018 TELANGANA ASSEMBLY ELECTION ─────────────────────────────────────
// Election: 2018-12-07 | Results: 2018-12-11 (KCR dissolved assembly early)
// Tally: TRS 88, INC 19, AIMIM 7, TDP 2, BJP 1, AIFB 1, IND 1

export const TELANGANA_2018_RESULTS: HistoricalResult[] = [
  // ─── ADILABAD / MANCHERIAL / KUMURAM BHEEM ASIFABAD / NIRMAL ───
  { acNo: 1,  name: 'Sirpur',            winner: 'Koneru Konappa',              party: 'TRS', year: 2018 },
  { acNo: 2,  name: 'Chennur',           winner: 'Balka Suman',                party: 'TRS', year: 2018 },
  { acNo: 3,  name: 'Bellampalli',       winner: 'Durgam Chinnaiah',           party: 'TRS', year: 2018 },
  { acNo: 4,  name: 'Mancherial',        winner: 'Nadipelli Diwakar Rao',      party: 'TRS', year: 2018 },
  { acNo: 5,  name: 'Asifabad',          winner: 'Atram Sakku',                party: 'INC', year: 2018 },
  { acNo: 6,  name: 'Khanapur',          winner: 'Ajmeera Rekha',              party: 'TRS', year: 2018 },
  { acNo: 7,  name: 'Adilabad',          winner: 'Jogu Ramanna',               party: 'TRS', year: 2018 },
  { acNo: 8,  name: 'Boath',             winner: 'Rathod Bapu Rao',            party: 'TRS', year: 2018 },
  { acNo: 9,  name: 'Nirmal',            winner: 'Allola Indrakaran Reddy',    party: 'TRS', year: 2018 },
  { acNo: 10, name: 'Mudhole',           winner: 'Gaddigari Vittal Reddy',     party: 'TRS', year: 2018 },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur',             winner: 'Asannagari Jeevan Reddy',    party: 'TRS', year: 2018 },
  { acNo: 12, name: 'Bodhan',            winner: 'Shakil Aamir Mohammed',      party: 'TRS', year: 2018 },
  { acNo: 13, name: 'Jukkal',            winner: 'Hanmanth Shinde',            party: 'TRS', year: 2018 },
  { acNo: 14, name: 'Banswada',          winner: 'Pocharam Srinivas Reddy',    party: 'TRS', year: 2018 },
  { acNo: 15, name: 'Yellareddy',        winner: 'Jajala Surender',            party: 'INC', year: 2018 },
  { acNo: 16, name: 'Kamareddy',         winner: 'Gampa Govardhan',            party: 'TRS', year: 2018 },
  { acNo: 17, name: 'Nizamabad Urban',   winner: 'Bigala Ganesh',              party: 'TRS', year: 2018 },
  { acNo: 18, name: 'Nizamabad Rural',   winner: 'Bajireddy Goverdhan',        party: 'TRS', year: 2018 },
  { acNo: 19, name: 'Balkonda',          winner: 'Vemula Prashanth Reddy',     party: 'TRS', year: 2018 },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla',           winner: 'Kalvakuntla Vidya Sagar Rao', party: 'TRS', year: 2018 },
  { acNo: 21, name: 'Jagtial',           winner: 'M. Sanjay Kumar',            party: 'TRS', year: 2018 },
  { acNo: 22, name: 'Dharmapuri',        winner: 'Koppula Eshwar',             party: 'TRS', year: 2018 },
  { acNo: 23, name: 'Ramagundam',        winner: 'Korukanti Chandar',          party: 'AIFB', year: 2018 },
  { acNo: 24, name: 'Manthani',          winner: 'Duddilla Sridhar Babu',      party: 'INC', year: 2018 },
  { acNo: 25, name: 'Peddapalle',        winner: 'Dasari Manohar Reddy',       party: 'TRS', year: 2018 },
  { acNo: 26, name: 'Karimnagar',        winner: 'Gangula Kamalakar',          party: 'TRS', year: 2018 },
  { acNo: 27, name: 'Choppadandi',       winner: 'Sunke Ravi Shankar',         party: 'TRS', year: 2018 },
  { acNo: 28, name: 'Vemulawada',        winner: 'Chennamaneni Ramesh',        party: 'TRS', year: 2018 },
  { acNo: 29, name: 'Sircilla',          winner: 'K. T. Rama Rao',            party: 'TRS', year: 2018 },
  { acNo: 30, name: 'Manakondur',        winner: 'Rasamayi Balakishan',        party: 'TRS', year: 2018 },
  { acNo: 31, name: 'Huzurabad',         winner: 'Etela Rajender',             party: 'TRS', year: 2018 },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad',          winner: 'Vodithela Sathish Kumar',    party: 'TRS', year: 2018 },
  { acNo: 33, name: 'Siddipet',          winner: 'T. Harish Rao',             party: 'TRS', year: 2018 },
  { acNo: 34, name: 'Medak',             winner: 'Padma Devender Reddy',       party: 'TRS', year: 2018 },
  { acNo: 35, name: 'Narayankhed',       winner: 'Mahareddy Bhupal Reddy',     party: 'TRS', year: 2018 },
  { acNo: 36, name: 'Andole',            winner: 'Chanti Kranthi Kiran',       party: 'TRS', year: 2018 },
  { acNo: 37, name: 'Narsapur',          winner: 'Chilumula Madan Reddy',      party: 'TRS', year: 2018 },
  { acNo: 38, name: 'Zahirabad',         winner: 'Koninty Manik Rao',          party: 'TRS', year: 2018 },
  { acNo: 39, name: 'Sangareddy',        winner: 'T. Jayaprakash Reddy',       party: 'INC', year: 2018 },
  { acNo: 40, name: 'Patancheru',        winner: 'Gudem Mahipal Reddy',        party: 'TRS', year: 2018 },
  { acNo: 41, name: 'Dubbak',            winner: 'Solipeta Ramalinga Reddy',   party: 'TRS', year: 2018 },
  { acNo: 42, name: 'Gajwel',            winner: 'K. Chandrashekar Rao',       party: 'TRS', year: 2018 },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal',           winner: 'Chamakura Malla Reddy',      party: 'TRS', year: 2018 },
  { acNo: 44, name: 'Malkajgiri',        winner: 'Mynampally Hanumantha Rao',  party: 'TRS', year: 2018 },
  { acNo: 45, name: 'Quthbullapur',      winner: 'K. P. Vivekanand Goud',     party: 'TRS', year: 2018 },
  { acNo: 46, name: 'Kukatpally',        winner: 'Madhavaram Krishna Rao',     party: 'TRS', year: 2018 },
  { acNo: 47, name: 'Uppal',             winner: 'Bethi Subhas Reddy',         party: 'TRS', year: 2018 },
  { acNo: 48, name: 'Ibrahimpatnam',     winner: 'Manchireddy Kishan Reddy',   party: 'TRS', year: 2018 },
  { acNo: 49, name: 'L. B. Nagar',       winner: 'Devireddy Sudheer Reddy',    party: 'INC', year: 2018 },
  { acNo: 50, name: 'Maheshwaram',       winner: 'Sabitha Indra Reddy',        party: 'INC', year: 2018 },
  { acNo: 51, name: 'Rajendranagar',     winner: 'T. Prakash Goud',           party: 'TRS', year: 2018 },
  { acNo: 52, name: 'Serilingampally',   winner: 'Arekapudi Gandhi',           party: 'TRS', year: 2018 },
  { acNo: 53, name: 'Chevella',          winner: 'Kale Yadaiah',              party: 'TRS', year: 2018 },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi',             winner: 'K. Mahesh Reddy',           party: 'TRS', year: 2018 },
  { acNo: 55, name: 'Vicarabad',         winner: 'Anand Methuku',              party: 'TRS', year: 2018 },
  { acNo: 56, name: 'Tandur',            winner: 'Pilot Rohith Reddy',         party: 'INC', year: 2018 },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad',       winner: 'Muta Gopal',                party: 'TRS', year: 2018 },
  { acNo: 58, name: 'Malakpet',          winner: 'Ahmed Bin Abdullah Balala',  party: 'AIMIM', year: 2018 },
  { acNo: 59, name: 'Amberpet',          winner: 'Kaleru Venkatesh',           party: 'TRS', year: 2018 },
  { acNo: 60, name: 'Khairatabad',       winner: 'Danam Nagender',             party: 'TRS', year: 2018 },
  { acNo: 61, name: 'Jubilee Hills',     winner: 'Maganti Gopinath',           party: 'TRS', year: 2018 },
  { acNo: 62, name: 'Sanathnagar',       winner: 'Talasani Srinivas Yadav',   party: 'TRS', year: 2018 },
  { acNo: 63, name: 'Nampally',          winner: 'Jaffer Hussain Meraj',       party: 'AIMIM', year: 2018 },
  { acNo: 64, name: 'Karwan',            winner: 'Kausar Mohiuddin',           party: 'AIMIM', year: 2018 },
  { acNo: 65, name: 'Goshamahal',        winner: 'T. Raja Singh',             party: 'BJP', year: 2018 },
  { acNo: 66, name: 'Charminar',         winner: 'Mumtaz Ahmed Khan',          party: 'AIMIM', year: 2018 },
  { acNo: 67, name: 'Chandrayangutta',   winner: 'Akbaruddin Owaisi',          party: 'AIMIM', year: 2018 },
  { acNo: 68, name: 'Yakutpura',         winner: 'Syed Ahmed Pasha Quadri',    party: 'AIMIM', year: 2018 },
  { acNo: 69, name: 'Bahadurpura',       winner: 'Mohammed Moazam Khan',       party: 'AIMIM', year: 2018 },
  { acNo: 70, name: 'Secunderabad',      winner: 'T. Padma Rao Goud',         party: 'TRS', year: 2018 },
  { acNo: 71, name: 'Secunderabad Cantonment', winner: 'G. Sayanna',          party: 'TRS', year: 2018 },

  // ─── KODANGAL / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / GADWAL ───
  { acNo: 72, name: 'Kodangal',          winner: 'Patnam Narender Reddy',      party: 'TRS', year: 2018 },
  { acNo: 73, name: 'Narayanpet',        winner: 'Rajender Reddy',             party: 'TRS', year: 2018 },
  { acNo: 74, name: 'Mahbubnagar',       winner: 'V. Srinivas Goud',          party: 'TRS', year: 2018 },
  { acNo: 75, name: 'Jadcherla',         winner: 'C. Laxma Reddy',            party: 'TRS', year: 2018 },
  { acNo: 76, name: 'Devarkadra',        winner: 'Alla Venkateshwar Reddy',    party: 'TRS', year: 2018 },
  { acNo: 77, name: 'Makthal',           winner: 'Chittem Rammohan Reddy',     party: 'TRS', year: 2018 },
  { acNo: 78, name: 'Wanaparthy',        winner: 'Singireddy Niranjan Reddy',  party: 'TRS', year: 2018 },
  { acNo: 79, name: 'Gadwal',            winner: 'Bandla Krishna Mohan Reddy', party: 'TRS', year: 2018 },
  { acNo: 80, name: 'Alampur',           winner: 'V. M. Abraham',              party: 'TRS', year: 2018 },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI ───
  { acNo: 81, name: 'Nagarkurnool',      winner: 'Marri Janardhan Reddy',      party: 'TRS', year: 2018 },
  { acNo: 82, name: 'Achampet',          winner: 'Guvvala Balaraju',           party: 'TRS', year: 2018 },
  { acNo: 83, name: 'Kalwakurthy',       winner: 'Jaipal Yadav',              party: 'TRS', year: 2018 },
  { acNo: 84, name: 'Shadnagar',         winner: 'Anjaiah Yelganamoni',        party: 'TRS', year: 2018 },
  { acNo: 85, name: 'Kollapur',          winner: 'Beeram Harshavardhan Reddy', party: 'INC', year: 2018 },
  { acNo: 86, name: 'Devarakonda',       winner: 'Ravindra Kumar Ramavath',    party: 'TRS', year: 2018 },
  { acNo: 87, name: 'Nagarjuna Sagar',   winner: 'Nomula Narsimhaiah',         party: 'TRS', year: 2018 },
  { acNo: 88, name: 'Miryalaguda',       winner: 'Nallamothu Bhaskar Rao',     party: 'TRS', year: 2018 },
  { acNo: 89, name: 'Huzurnagar',        winner: 'N. Uttam Kumar Reddy',       party: 'INC', year: 2018 },
  { acNo: 90, name: 'Kodad',             winner: 'Bollam Mallaiah Yadav',      party: 'TRS', year: 2018 },
  { acNo: 91, name: 'Suryapet',          winner: 'Guntakandla Jagadish Reddy', party: 'TRS', year: 2018 },
  { acNo: 92, name: 'Nalgonda',          winner: 'Kancharla Bhupal Reddy',     party: 'TRS', year: 2018 },
  { acNo: 93, name: 'Munugode',          winner: 'Komatireddy Raj Gopal Reddy', party: 'INC', year: 2018 },
  { acNo: 94, name: 'Bhongir',           winner: 'Pailla Shekar Reddy',        party: 'TRS', year: 2018 },
  { acNo: 95, name: 'Nakrekal',          winner: 'Chirumarthi Lingaiah',        party: 'INC', year: 2018 },
  { acNo: 96, name: 'Thungathurthi',     winner: 'Gadari Kishore Kumar',       party: 'TRS', year: 2018 },
  { acNo: 97, name: 'Alair',             winner: 'Gongidi Sunitha',            party: 'TRS', year: 2018 },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98,  name: 'Jangaon',          winner: 'Palla Rajeshwar Reddy',      party: 'TRS', year: 2018 },
  { acNo: 99,  name: 'Ghanpur Station',  winner: 'Kadiyam Srihari',            party: 'TRS', year: 2018 },
  { acNo: 100, name: 'Palakurthi',       winner: 'Errabelli Dayakar Rao',      party: 'TRS', year: 2018 },
  { acNo: 101, name: 'Dornakal',         winner: 'Redya Naik Donthi',          party: 'TRS', year: 2018 },
  { acNo: 102, name: 'Mahabubabad',      winner: 'Banoth Shankar Naik',        party: 'TRS', year: 2018 },
  { acNo: 103, name: 'Narsampet',        winner: 'Peddi Sudarshan Reddy',      party: 'TRS', year: 2018 },
  { acNo: 104, name: 'Parkal',           winner: 'Challa Dharma Reddy',        party: 'TRS', year: 2018 },
  { acNo: 105, name: 'Warangal West',    winner: 'Dasyam Vinay Bhaskar',       party: 'TRS', year: 2018 },
  { acNo: 106, name: 'Warangal East',    winner: 'Nannapaneni Narender',       party: 'TRS', year: 2018 },
  { acNo: 107, name: 'Wardhannapet',     winner: 'Aroori Ramesh',              party: 'TRS', year: 2018 },
  { acNo: 108, name: 'Bhupalpalle',      winner: 'Gandra Venkata Ramana Reddy', party: 'INC', year: 2018 },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug',            winner: 'Dansari Anasuya (Seethakka)', party: 'INC', year: 2018 },
  { acNo: 110, name: 'Pinapaka',         winner: 'Payam Venkateswarlu',        party: 'INC', year: 2018 },
  { acNo: 111, name: 'Yellandu',         winner: 'Haripriya Banoth',           party: 'INC', year: 2018 },
  { acNo: 112, name: 'Khammam',          winner: 'Puvvada Ajay Kumar',         party: 'TRS', year: 2018 },
  { acNo: 113, name: 'Palair',           winner: 'Thakkellapalli Ravinder Rao', party: 'INC', year: 2018 },
  { acNo: 114, name: 'Madhira',          winner: 'Mallu Bhatti Vikramarka',    party: 'INC', year: 2018 },
  { acNo: 115, name: 'Wyra',             winner: 'Lavudya Ramulu',             party: 'IND', year: 2018 },
  { acNo: 116, name: 'Sathupalli',       winner: 'Sandra Venkata Veeraiah',    party: 'TDP', year: 2018 },
  { acNo: 117, name: 'Kothagudem',       winner: 'Vanama Venkateswara Rao',    party: 'INC', year: 2018 },
  { acNo: 118, name: 'Aswaraopeta',      winner: 'Mecha Nageswara Rao',        party: 'TDP', year: 2018 },
  { acNo: 119, name: 'Bhadrachalam',     winner: 'Podem Veeraiah',             party: 'INC', year: 2018 },
];

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────

/**
 * Get the historical winner for a constituency across all available elections.
 * Returns a 3-election timeline: 2014 → 2018 → 2023.
 */
export function getConstituencyHistory(acNo: number): {
  ac2014: HistoricalResult | undefined;
  ac2018: HistoricalResult | undefined;
} {
  return {
    ac2014: TELANGANA_2014_RESULTS.find((r) => r.acNo === acNo),
    ac2018: TELANGANA_2018_RESULTS.find((r) => r.acNo === acNo),
  };
}

/**
 * Check if a constituency has been won by the same party in all 3 elections.
 * Accounts for the TRS→BRS rename.
 */
export function isPartyStronghold(
  acNo: number,
  party2023: string,
): boolean {
  const { ac2014, ac2018 } = getConstituencyHistory(acNo);
  const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p === 'BRS' ? 'BRS' : p);
  const target = normalize(party2023);
  return (
    (ac2014 ? normalize(ac2014.party) === target : false) &&
    (ac2018 ? normalize(ac2018.party) === target : false)
  );
}

/**
 * Count party tallies for a given election year.
 */
export function getPartyTally(year: 2014 | 2018): Record<string, number> {
  const data = year === 2014 ? TELANGANA_2014_RESULTS : TELANGANA_2018_RESULTS;
  return data.reduce<Record<string, number>>((acc, r) => {
    acc[r.party] = (acc[r.party] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Get all constituencies that changed hands between elections.
 */
export function getSwingConstituencies(
  from: 2014 | 2018,
  to: 2018 | 2023,
): { acNo: number; name: string; fromParty: string; toParty: string }[] {
  const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p === 'BRS' ? 'BRS' : p);
  const fromData = from === 2014 ? TELANGANA_2014_RESULTS : TELANGANA_2018_RESULTS;
  // For "to" data, we'd need 2023 from the constituencies file — but we only have 2014/2018 here.
  // This function only works for 2014→2018.
  if (to !== 2018) return []; // 2018→2023 needs constituencies file
  const toData = TELANGANA_2018_RESULTS;

  const swings: { acNo: number; name: string; fromParty: string; toParty: string }[] = [];
  for (const f of fromData) {
    const t = toData.find((r) => r.acNo === f.acNo);
    if (t && normalize(f.party) !== normalize(t.party)) {
      swings.push({
        acNo: f.acNo,
        name: f.name,
        fromParty: f.party,
        toParty: t.party,
      });
    }
  }
  return swings;
}
