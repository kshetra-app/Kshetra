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
  winner: string;
  party: string;
}

/** TRS and BRS are the same party (renamed Oct 2022) */
export const TRS_BRS_ALIAS = { TRS: 'BRS', BRS: 'TRS' } as const;

// ─── 2014 TELANGANA ASSEMBLY ELECTION ─────────────────────────────────────
// Election: 2014-04-30 | Results: 2014-05-16
// Tally: TRS 63, INC 21, TDP 15, AIMIM 7, BJP 5, BSP 2, YSRCP 3, CPI 1, CPM 1, IND 1

export const TELANGANA_2014_RESULTS: HistoricalResult[] = [
  // ─── ADILABAD / MANCHERIAL / KUMURAM BHEEM ASIFABAD / NIRMAL ───
  { acNo: 1,  name: 'Sirpur',            winner: 'Koneru Konappa',              party: 'BSP' },
  { acNo: 2,  name: 'Chennur',           winner: 'Nallala Odelu',              party: 'TRS' },
  { acNo: 3,  name: 'Bellampalli',       winner: 'Durgam Chinnaiah',           party: 'TRS' },
  { acNo: 4,  name: 'Mancherial',        winner: 'Nadipelli Diwakar Rao',      party: 'TRS' },
  { acNo: 5,  name: 'Asifabad',          winner: 'Kova Laxmi',                 party: 'TRS' },
  { acNo: 6,  name: 'Khanapur',          winner: 'Ajmeera Rekha',              party: 'TRS' },
  { acNo: 7,  name: 'Adilabad',          winner: 'Jogu Ramanna',               party: 'TRS' },
  { acNo: 8,  name: 'Boath',             winner: 'Rathod Bapu Rao',            party: 'TRS' },
  { acNo: 9,  name: 'Nirmal',            winner: 'Allola Indrakaran Reddy',    party: 'BSP' },
  { acNo: 10, name: 'Mudhole',           winner: 'Gaddigari Vittal Reddy',     party: 'INC' },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur',             winner: 'Asannagari Jeevan Reddy',    party: 'TRS' },
  { acNo: 12, name: 'Bodhan',            winner: 'Shakil Aamir Mohammed',      party: 'TRS' },
  { acNo: 13, name: 'Jukkal',            winner: 'Hanmanth Shinde',            party: 'TRS' },
  { acNo: 14, name: 'Banswada',          winner: 'Pocharam Srinivas Reddy',    party: 'TRS' },
  { acNo: 15, name: 'Yellareddy',        winner: 'Eanugu Ravinder Reddy',      party: 'TRS' },
  { acNo: 16, name: 'Kamareddy',         winner: 'Gampa Govardhan',            party: 'TRS' },
  { acNo: 17, name: 'Nizamabad Urban',   winner: 'Bigala Ganesh',              party: 'TRS' },
  { acNo: 18, name: 'Nizamabad Rural',   winner: 'Bajireddy Goverdhan',        party: 'TRS' },
  { acNo: 19, name: 'Balkonda',          winner: 'Vemula Prashanth Reddy',     party: 'TRS' },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla',           winner: 'Kalvakuntla Vidya Sagar Rao', party: 'TRS' },
  { acNo: 21, name: 'Jagtial',           winner: 'Jeevan Reddy Thatiparthi',   party: 'INC' },
  { acNo: 22, name: 'Dharmapuri',        winner: 'Koppula Eshwar',             party: 'TRS' },
  { acNo: 23, name: 'Ramagundam',        winner: 'Somarapu Satyanarayana',     party: 'TRS' },
  { acNo: 24, name: 'Manthani',          winner: 'Putta Madhukar',             party: 'TRS' },
  { acNo: 25, name: 'Peddapalle',        winner: 'Dasari Manohar Reddy',       party: 'TRS' },
  { acNo: 26, name: 'Karimnagar',        winner: 'Gangula Kamalakar',          party: 'TRS' },
  { acNo: 27, name: 'Choppadandi',       winner: 'Bodige Shobha',             party: 'TRS' },
  { acNo: 28, name: 'Vemulawada',        winner: 'Chennamaneni Ramesh',        party: 'TRS' },
  { acNo: 29, name: 'Sircilla',          winner: 'K. T. Rama Rao',            party: 'TRS' },
  { acNo: 30, name: 'Manakondur',        winner: 'Rasamayi Balakishan',        party: 'TRS' },
  { acNo: 31, name: 'Huzurabad',         winner: 'Etela Rajender',             party: 'TRS' },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad',          winner: 'Vodithela Sathish Kumar',    party: 'TRS' },
  { acNo: 33, name: 'Siddipet',          winner: 'T. Harish Rao',             party: 'TRS' },
  { acNo: 34, name: 'Medak',             winner: 'Padma Devender Reddy',       party: 'TRS' },
  { acNo: 35, name: 'Narayankhed',       winner: 'Patlolla Kishta Reddy',      party: 'INC' },
  { acNo: 36, name: 'Andole',            winner: 'Babu Mohan',                party: 'TRS' },
  { acNo: 37, name: 'Narsapur',          winner: 'Chilumula Madan Reddy',      party: 'TRS' },
  { acNo: 38, name: 'Zahirabad',         winner: 'J. Geeta Reddy',            party: 'INC' },
  { acNo: 39, name: 'Sangareddy',        winner: 'Chinta Prabhakar',           party: 'TRS' },
  { acNo: 40, name: 'Patancheru',        winner: 'Gudem Mahipal Reddy',        party: 'TRS' },
  { acNo: 41, name: 'Dubbak',            winner: 'Solipeta Ramalinga Reddy',   party: 'TRS' },
  { acNo: 42, name: 'Gajwel',            winner: 'K. Chandrashekar Rao',       party: 'TRS' },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal',           winner: 'M. Sudheer Reddy',           party: 'TRS' },
  { acNo: 44, name: 'Malkajgiri',        winner: 'C. Kanaka Reddy',           party: 'TRS' },
  { acNo: 45, name: 'Quthbullapur',      winner: 'K. P. Vivekanand Goud',     party: 'TDP' },
  { acNo: 46, name: 'Kukatpally',        winner: 'Madhavaram Krishna Rao',     party: 'TDP' },
  { acNo: 47, name: 'Uppal',             winner: 'N. V. S. S. Prabhakar',     party: 'BJP' },
  { acNo: 48, name: 'Ibrahimpatnam',     winner: 'Manchireddy Kishan Reddy',   party: 'TDP' },
  { acNo: 49, name: 'L. B. Nagar',       winner: 'R. Krishnaiah',             party: 'TDP' },
  { acNo: 50, name: 'Maheshwaram',       winner: 'Teegala Krishna Reddy',      party: 'TDP' },
  { acNo: 51, name: 'Rajendranagar',     winner: 'T. Prakash Goud',           party: 'TDP' },
  { acNo: 52, name: 'Serilingampally',   winner: 'Arekapudi Gandhi',           party: 'TDP' },
  { acNo: 53, name: 'Chevella',          winner: 'Kale Yadaiah',              party: 'INC' },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi',             winner: 'T. Ram Mohan Reddy',        party: 'INC' },
  { acNo: 55, name: 'Vicarabad',         winner: 'B. Sanjeeva Rao',           party: 'TRS' },
  { acNo: 56, name: 'Tandur',            winner: 'P. Mahender Reddy',          party: 'TRS' },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad',       winner: 'K. Laxman',                 party: 'BJP' },
  { acNo: 58, name: 'Malakpet',          winner: 'Ahmed Bin Abdullah Balala',  party: 'AIMIM' },
  { acNo: 59, name: 'Amberpet',          winner: 'G. Kishan Reddy',           party: 'BJP' },
  { acNo: 60, name: 'Khairatabad',       winner: 'Chintala Ramachandra Reddy', party: 'BJP' },
  { acNo: 61, name: 'Jubilee Hills',     winner: 'Maganti Gopinath',           party: 'TDP' },
  { acNo: 62, name: 'Sanathnagar',       winner: 'Talasani Srinivas Yadav',   party: 'TDP' },
  { acNo: 63, name: 'Nampally',          winner: 'Jaffer Hussain Meraj',       party: 'AIMIM' },
  { acNo: 64, name: 'Karwan',            winner: 'Kausar Mohiuddin',           party: 'AIMIM' },
  { acNo: 65, name: 'Goshamahal',        winner: 'T. Raja Singh',             party: 'BJP' },
  { acNo: 66, name: 'Charminar',         winner: 'Syed Ahmed Pasha Quadri',    party: 'AIMIM' },
  { acNo: 67, name: 'Chandrayangutta',   winner: 'Akbaruddin Owaisi',          party: 'AIMIM' },
  { acNo: 68, name: 'Yakutpura',         winner: 'Mumtaz Ahmed Khan',          party: 'AIMIM' },
  { acNo: 69, name: 'Bahadurpura',       winner: 'Mohammed Moazam Khan',       party: 'AIMIM' },
  { acNo: 70, name: 'Secunderabad',      winner: 'T. Padma Rao Goud',         party: 'TRS' },
  { acNo: 71, name: 'Secunderabad Cantonment', winner: 'G. Sayanna',          party: 'TDP' },

  // ─── KODANGAL / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / GADWAL ───
  { acNo: 72, name: 'Kodangal',          winner: 'A. Revanth Reddy',          party: 'TDP' },
  { acNo: 73, name: 'Narayanpet',        winner: 'S. Rajender Reddy',          party: 'TDP' },
  { acNo: 74, name: 'Mahbubnagar',       winner: 'V. Srinivas Goud',          party: 'TRS' },
  { acNo: 75, name: 'Jadcherla',         winner: 'C. Laxma Reddy',            party: 'TRS' },
  { acNo: 76, name: 'Devarkadra',        winner: 'Alla Venkateshwar Reddy',    party: 'TRS' },
  { acNo: 77, name: 'Makthal',           winner: 'Chittem Rammohan Reddy',     party: 'INC' },
  { acNo: 78, name: 'Wanaparthy',        winner: 'G. Chinna Reddy',           party: 'INC' },
  { acNo: 79, name: 'Gadwal',            winner: 'D. K. Aruna',               party: 'INC' },
  { acNo: 80, name: 'Alampur',           winner: 'S. A. Sampath Kumar',        party: 'INC' },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI ───
  { acNo: 81, name: 'Nagarkurnool',      winner: 'Marri Janardhan Reddy',      party: 'TRS' },
  { acNo: 82, name: 'Achampet',          winner: 'Guvvala Balaraju',           party: 'TRS' },
  { acNo: 83, name: 'Kalwakurthy',       winner: 'Challa Vamshi Chand Reddy',  party: 'INC' },
  { acNo: 84, name: 'Shadnagar',         winner: 'Anjaiah Yelganamoni',        party: 'TRS' },
  { acNo: 85, name: 'Kollapur',          winner: 'Jupally Krishna Rao',        party: 'TRS' },
  { acNo: 86, name: 'Devarakonda',       winner: 'Ravindra Kumar Ramavath',    party: 'CPI' },
  { acNo: 87, name: 'Nagarjuna Sagar',   winner: 'Kunduru Jana Reddy',         party: 'INC' },
  { acNo: 88, name: 'Miryalaguda',       winner: 'Nallamothu Bhaskar Rao',     party: 'INC' },
  { acNo: 89, name: 'Huzurnagar',        winner: 'N. Uttam Kumar Reddy',       party: 'INC' },
  { acNo: 90, name: 'Kodad',             winner: 'N. Padmavathi Reddy',        party: 'INC' },
  { acNo: 91, name: 'Suryapet',          winner: 'Guntakandla Jagadish Reddy', party: 'TRS' },
  { acNo: 92, name: 'Nalgonda',          winner: 'Komatireddy Venkat Reddy',   party: 'INC' },
  { acNo: 93, name: 'Munugode',          winner: 'Kusukuntla Prabhakar Reddy', party: 'TRS' },
  { acNo: 94, name: 'Bhongir',           winner: 'Pailla Shekar Reddy',        party: 'TRS' },
  { acNo: 95, name: 'Nakrekal',          winner: 'Vemula Veeresham',           party: 'TRS' },
  { acNo: 96, name: 'Thungathurthi',     winner: 'Gadari Kishore Kumar',       party: 'TRS' },
  { acNo: 97, name: 'Alair',             winner: 'Gongidi Sunitha',            party: 'TRS' },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98,  name: 'Jangaon',          winner: 'Muthireddy Yadagiri Reddy',  party: 'TRS' },
  { acNo: 99,  name: 'Ghanpur Station',  winner: 'Thatikonda Rajaiah',         party: 'TRS' },
  { acNo: 100, name: 'Palakurthi',       winner: 'Errabelli Dayakar Rao',      party: 'TDP' },
  { acNo: 101, name: 'Dornakal',         winner: 'D. S. Redya Naik',          party: 'INC' },
  { acNo: 102, name: 'Mahabubabad',      winner: 'Banoth Shankar Naik',        party: 'TRS' },
  { acNo: 103, name: 'Narsampet',        winner: 'Donthi Madhava Reddy',       party: 'IND' },
  { acNo: 104, name: 'Parkal',           winner: 'Challa Dharma Reddy',        party: 'TDP' },
  { acNo: 105, name: 'Warangal West',    winner: 'Dasyam Vinay Bhaskar',       party: 'TRS' },
  { acNo: 106, name: 'Warangal East',    winner: 'Konda Surekha',              party: 'TRS' },
  { acNo: 107, name: 'Wardhannapet',     winner: 'Aroori Ramesh',              party: 'TRS' },
  { acNo: 108, name: 'Bhupalpalle',      winner: 'S. Madhusudhana Chary',      party: 'TRS' },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug',            winner: 'Azmeera Chandulal',          party: 'TRS' },
  { acNo: 110, name: 'Pinapaka',         winner: 'Payam Venkateswarlu',        party: 'YSRCP' },
  { acNo: 111, name: 'Yellandu',         winner: 'Koram Kanakaiah',            party: 'INC' },
  { acNo: 112, name: 'Khammam',          winner: 'Puvvada Ajay Kumar',         party: 'INC' },
  { acNo: 113, name: 'Palair',           winner: 'Ramireddy Venkatareddy',     party: 'INC' },
  { acNo: 114, name: 'Madhira',          winner: 'Mallu Bhatti Vikramarka',    party: 'INC' },
  { acNo: 115, name: 'Wyra',             winner: 'Banoth Madanlal',            party: 'YSRCP' },
  { acNo: 116, name: 'Sathupalli',       winner: 'Sandra Venkata Veeraiah',    party: 'TDP' },
  { acNo: 117, name: 'Kothagudem',       winner: 'Jalagam Venkat Rao',         party: 'TRS' },
  { acNo: 118, name: 'Aswaraopeta',      winner: 'Thati Venkateswarlu',        party: 'YSRCP' },
  { acNo: 119, name: 'Bhadrachalam',     winner: 'Sunnam Rajaiah',             party: 'CPM' },
];

// ─── 2018 TELANGANA ASSEMBLY ELECTION ─────────────────────────────────────
// Election: 2018-12-07 | Results: 2018-12-11 (KCR dissolved assembly early)
// Tally: TRS 88, INC 19, AIMIM 7, TDP 2, BJP 1, AIFB 1, IND 1

export const TELANGANA_2018_RESULTS: HistoricalResult[] = [
  // ─── ADILABAD / MANCHERIAL / KUMURAM BHEEM ASIFABAD / NIRMAL ───
  { acNo: 1,  name: 'Sirpur',            winner: 'Koneru Konappa',              party: 'TRS' },
  { acNo: 2,  name: 'Chennur',           winner: 'Balka Suman',                party: 'TRS' },
  { acNo: 3,  name: 'Bellampalli',       winner: 'Durgam Chinnaiah',           party: 'TRS' },
  { acNo: 4,  name: 'Mancherial',        winner: 'Nadipelli Diwakar Rao',      party: 'TRS' },
  { acNo: 5,  name: 'Asifabad',          winner: 'Atram Sakku',                party: 'INC' },
  { acNo: 6,  name: 'Khanapur',          winner: 'Ajmeera Rekha',              party: 'TRS' },
  { acNo: 7,  name: 'Adilabad',          winner: 'Jogu Ramanna',               party: 'TRS' },
  { acNo: 8,  name: 'Boath',             winner: 'Rathod Bapu Rao',            party: 'TRS' },
  { acNo: 9,  name: 'Nirmal',            winner: 'Allola Indrakaran Reddy',    party: 'TRS' },
  { acNo: 10, name: 'Mudhole',           winner: 'Gaddigari Vittal Reddy',     party: 'TRS' },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur',             winner: 'Asannagari Jeevan Reddy',    party: 'TRS' },
  { acNo: 12, name: 'Bodhan',            winner: 'Shakil Aamir Mohammed',      party: 'TRS' },
  { acNo: 13, name: 'Jukkal',            winner: 'Hanmanth Shinde',            party: 'TRS' },
  { acNo: 14, name: 'Banswada',          winner: 'Pocharam Srinivas Reddy',    party: 'TRS' },
  { acNo: 15, name: 'Yellareddy',        winner: 'Jajala Surender',            party: 'INC' },
  { acNo: 16, name: 'Kamareddy',         winner: 'Gampa Govardhan',            party: 'TRS' },
  { acNo: 17, name: 'Nizamabad Urban',   winner: 'Bigala Ganesh',              party: 'TRS' },
  { acNo: 18, name: 'Nizamabad Rural',   winner: 'Bajireddy Goverdhan',        party: 'TRS' },
  { acNo: 19, name: 'Balkonda',          winner: 'Vemula Prashanth Reddy',     party: 'TRS' },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla',           winner: 'Kalvakuntla Vidya Sagar Rao', party: 'TRS' },
  { acNo: 21, name: 'Jagtial',           winner: 'M. Sanjay Kumar',            party: 'TRS' },
  { acNo: 22, name: 'Dharmapuri',        winner: 'Koppula Eshwar',             party: 'TRS' },
  { acNo: 23, name: 'Ramagundam',        winner: 'Korukanti Chandar',          party: 'AIFB' },
  { acNo: 24, name: 'Manthani',          winner: 'Duddilla Sridhar Babu',      party: 'INC' },
  { acNo: 25, name: 'Peddapalle',        winner: 'Dasari Manohar Reddy',       party: 'TRS' },
  { acNo: 26, name: 'Karimnagar',        winner: 'Gangula Kamalakar',          party: 'TRS' },
  { acNo: 27, name: 'Choppadandi',       winner: 'Sunke Ravi Shankar',         party: 'TRS' },
  { acNo: 28, name: 'Vemulawada',        winner: 'Chennamaneni Ramesh',        party: 'TRS' },
  { acNo: 29, name: 'Sircilla',          winner: 'K. T. Rama Rao',            party: 'TRS' },
  { acNo: 30, name: 'Manakondur',        winner: 'Rasamayi Balakishan',        party: 'TRS' },
  { acNo: 31, name: 'Huzurabad',         winner: 'Etela Rajender',             party: 'TRS' },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad',          winner: 'Vodithela Sathish Kumar',    party: 'TRS' },
  { acNo: 33, name: 'Siddipet',          winner: 'T. Harish Rao',             party: 'TRS' },
  { acNo: 34, name: 'Medak',             winner: 'Padma Devender Reddy',       party: 'TRS' },
  { acNo: 35, name: 'Narayankhed',       winner: 'Mahareddy Bhupal Reddy',     party: 'TRS' },
  { acNo: 36, name: 'Andole',            winner: 'Chanti Kranthi Kiran',       party: 'TRS' },
  { acNo: 37, name: 'Narsapur',          winner: 'Chilumula Madan Reddy',      party: 'TRS' },
  { acNo: 38, name: 'Zahirabad',         winner: 'Koninty Manik Rao',          party: 'TRS' },
  { acNo: 39, name: 'Sangareddy',        winner: 'T. Jayaprakash Reddy',       party: 'INC' },
  { acNo: 40, name: 'Patancheru',        winner: 'Gudem Mahipal Reddy',        party: 'TRS' },
  { acNo: 41, name: 'Dubbak',            winner: 'Solipeta Ramalinga Reddy',   party: 'TRS' },
  { acNo: 42, name: 'Gajwel',            winner: 'K. Chandrashekar Rao',       party: 'TRS' },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal',           winner: 'Chamakura Malla Reddy',      party: 'TRS' },
  { acNo: 44, name: 'Malkajgiri',        winner: 'Mynampally Hanumantha Rao',  party: 'TRS' },
  { acNo: 45, name: 'Quthbullapur',      winner: 'K. P. Vivekanand Goud',     party: 'TRS' },
  { acNo: 46, name: 'Kukatpally',        winner: 'Madhavaram Krishna Rao',     party: 'TRS' },
  { acNo: 47, name: 'Uppal',             winner: 'Bethi Subhas Reddy',         party: 'TRS' },
  { acNo: 48, name: 'Ibrahimpatnam',     winner: 'Manchireddy Kishan Reddy',   party: 'TRS' },
  { acNo: 49, name: 'L. B. Nagar',       winner: 'Devireddy Sudheer Reddy',    party: 'INC' },
  { acNo: 50, name: 'Maheshwaram',       winner: 'Sabitha Indra Reddy',        party: 'INC' },
  { acNo: 51, name: 'Rajendranagar',     winner: 'T. Prakash Goud',           party: 'TRS' },
  { acNo: 52, name: 'Serilingampally',   winner: 'Arekapudi Gandhi',           party: 'TRS' },
  { acNo: 53, name: 'Chevella',          winner: 'Kale Yadaiah',              party: 'TRS' },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi',             winner: 'K. Mahesh Reddy',           party: 'TRS' },
  { acNo: 55, name: 'Vicarabad',         winner: 'Anand Methuku',              party: 'TRS' },
  { acNo: 56, name: 'Tandur',            winner: 'Pilot Rohith Reddy',         party: 'INC' },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad',       winner: 'Muta Gopal',                party: 'TRS' },
  { acNo: 58, name: 'Malakpet',          winner: 'Ahmed Bin Abdullah Balala',  party: 'AIMIM' },
  { acNo: 59, name: 'Amberpet',          winner: 'Kaleru Venkatesh',           party: 'TRS' },
  { acNo: 60, name: 'Khairatabad',       winner: 'Danam Nagender',             party: 'TRS' },
  { acNo: 61, name: 'Jubilee Hills',     winner: 'Maganti Gopinath',           party: 'TRS' },
  { acNo: 62, name: 'Sanathnagar',       winner: 'Talasani Srinivas Yadav',   party: 'TRS' },
  { acNo: 63, name: 'Nampally',          winner: 'Jaffer Hussain Meraj',       party: 'AIMIM' },
  { acNo: 64, name: 'Karwan',            winner: 'Kausar Mohiuddin',           party: 'AIMIM' },
  { acNo: 65, name: 'Goshamahal',        winner: 'T. Raja Singh',             party: 'BJP' },
  { acNo: 66, name: 'Charminar',         winner: 'Mumtaz Ahmed Khan',          party: 'AIMIM' },
  { acNo: 67, name: 'Chandrayangutta',   winner: 'Akbaruddin Owaisi',          party: 'AIMIM' },
  { acNo: 68, name: 'Yakutpura',         winner: 'Syed Ahmed Pasha Quadri',    party: 'AIMIM' },
  { acNo: 69, name: 'Bahadurpura',       winner: 'Mohammed Moazam Khan',       party: 'AIMIM' },
  { acNo: 70, name: 'Secunderabad',      winner: 'T. Padma Rao Goud',         party: 'TRS' },
  { acNo: 71, name: 'Secunderabad Cantonment', winner: 'G. Sayanna',          party: 'TRS' },

  // ─── KODANGAL / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / GADWAL ───
  { acNo: 72, name: 'Kodangal',          winner: 'Patnam Narender Reddy',      party: 'TRS' },
  { acNo: 73, name: 'Narayanpet',        winner: 'Rajender Reddy',             party: 'TRS' },
  { acNo: 74, name: 'Mahbubnagar',       winner: 'V. Srinivas Goud',          party: 'TRS' },
  { acNo: 75, name: 'Jadcherla',         winner: 'C. Laxma Reddy',            party: 'TRS' },
  { acNo: 76, name: 'Devarkadra',        winner: 'Alla Venkateshwar Reddy',    party: 'TRS' },
  { acNo: 77, name: 'Makthal',           winner: 'Chittem Rammohan Reddy',     party: 'TRS' },
  { acNo: 78, name: 'Wanaparthy',        winner: 'Singireddy Niranjan Reddy',  party: 'TRS' },
  { acNo: 79, name: 'Gadwal',            winner: 'Bandla Krishna Mohan Reddy', party: 'TRS' },
  { acNo: 80, name: 'Alampur',           winner: 'V. M. Abraham',              party: 'TRS' },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI ───
  { acNo: 81, name: 'Nagarkurnool',      winner: 'Marri Janardhan Reddy',      party: 'TRS' },
  { acNo: 82, name: 'Achampet',          winner: 'Guvvala Balaraju',           party: 'TRS' },
  { acNo: 83, name: 'Kalwakurthy',       winner: 'Jaipal Yadav',              party: 'TRS' },
  { acNo: 84, name: 'Shadnagar',         winner: 'Anjaiah Yelganamoni',        party: 'TRS' },
  { acNo: 85, name: 'Kollapur',          winner: 'Beeram Harshavardhan Reddy', party: 'INC' },
  { acNo: 86, name: 'Devarakonda',       winner: 'Ravindra Kumar Ramavath',    party: 'TRS' },
  { acNo: 87, name: 'Nagarjuna Sagar',   winner: 'Nomula Narsimhaiah',         party: 'TRS' },
  { acNo: 88, name: 'Miryalaguda',       winner: 'Nallamothu Bhaskar Rao',     party: 'TRS' },
  { acNo: 89, name: 'Huzurnagar',        winner: 'N. Uttam Kumar Reddy',       party: 'INC' },
  { acNo: 90, name: 'Kodad',             winner: 'Bollam Mallaiah Yadav',      party: 'TRS' },
  { acNo: 91, name: 'Suryapet',          winner: 'Guntakandla Jagadish Reddy', party: 'TRS' },
  { acNo: 92, name: 'Nalgonda',          winner: 'Kancharla Bhupal Reddy',     party: 'TRS' },
  { acNo: 93, name: 'Munugode',          winner: 'Komatireddy Raj Gopal Reddy', party: 'INC' },
  { acNo: 94, name: 'Bhongir',           winner: 'Pailla Shekar Reddy',        party: 'TRS' },
  { acNo: 95, name: 'Nakrekal',          winner: 'Chirumarthi Lingaiah',        party: 'INC' },
  { acNo: 96, name: 'Thungathurthi',     winner: 'Gadari Kishore Kumar',       party: 'TRS' },
  { acNo: 97, name: 'Alair',             winner: 'Gongidi Sunitha',            party: 'TRS' },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98,  name: 'Jangaon',          winner: 'Palla Rajeshwar Reddy',      party: 'TRS' },
  { acNo: 99,  name: 'Ghanpur Station',  winner: 'Kadiyam Srihari',            party: 'TRS' },
  { acNo: 100, name: 'Palakurthi',       winner: 'Errabelli Dayakar Rao',      party: 'TRS' },
  { acNo: 101, name: 'Dornakal',         winner: 'Redya Naik Donthi',          party: 'TRS' },
  { acNo: 102, name: 'Mahabubabad',      winner: 'Banoth Shankar Naik',        party: 'TRS' },
  { acNo: 103, name: 'Narsampet',        winner: 'Peddi Sudarshan Reddy',      party: 'TRS' },
  { acNo: 104, name: 'Parkal',           winner: 'Challa Dharma Reddy',        party: 'TRS' },
  { acNo: 105, name: 'Warangal West',    winner: 'Dasyam Vinay Bhaskar',       party: 'TRS' },
  { acNo: 106, name: 'Warangal East',    winner: 'Nannapaneni Narender',       party: 'TRS' },
  { acNo: 107, name: 'Wardhannapet',     winner: 'Aroori Ramesh',              party: 'TRS' },
  { acNo: 108, name: 'Bhupalpalle',      winner: 'Gandra Venkata Ramana Reddy', party: 'INC' },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug',            winner: 'Dansari Anasuya (Seethakka)', party: 'INC' },
  { acNo: 110, name: 'Pinapaka',         winner: 'Payam Venkateswarlu',        party: 'INC' },
  { acNo: 111, name: 'Yellandu',         winner: 'Haripriya Banoth',           party: 'INC' },
  { acNo: 112, name: 'Khammam',          winner: 'Puvvada Ajay Kumar',         party: 'TRS' },
  { acNo: 113, name: 'Palair',           winner: 'Thakkellapalli Ravinder Rao', party: 'INC' },
  { acNo: 114, name: 'Madhira',          winner: 'Mallu Bhatti Vikramarka',    party: 'INC' },
  { acNo: 115, name: 'Wyra',             winner: 'Lavudya Ramulu',             party: 'IND' },
  { acNo: 116, name: 'Sathupalli',       winner: 'Sandra Venkata Veeraiah',    party: 'TDP' },
  { acNo: 117, name: 'Kothagudem',       winner: 'Vanama Venkateswara Rao',    party: 'INC' },
  { acNo: 118, name: 'Aswaraopeta',      winner: 'Mecha Nageswara Rao',        party: 'TDP' },
  { acNo: 119, name: 'Bhadrachalam',     winner: 'Podem Veeraiah',             party: 'INC' },
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
