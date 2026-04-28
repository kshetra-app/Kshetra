/**
 * Telangana Assembly Constituency seed data — 2023 election results
 *
 * ── DATA SOURCES (cross-verified, min 3 per field) ──────────────────────
 *  1. Wikipedia — "2023 Telangana Legislative Assembly election" (Results by constituency)
 *     https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election
 *  2. MyNeta / ADR — ECI affidavit data for all 119 winners
 *     https://www.myneta.info/Telangana2023/
 *  3. OneIndia — ECI-sourced party-wise MLA list + constituency results
 *     https://www.oneindia.com/telangana-mla-list/
 *  4. IndiaToday — Constituency-wise results (winner, runner-up, vote counts)
 *     https://www.indiatoday.in/elections/telangana
 *  5. News sources for defections:
 *     - Telangana Today, The Hindu, Deccan Chronicle, The New Indian Express
 *
 * ── PARTY TALLY (as elected, Dec 2023) ──────────────────────────────────
 *  INC: 64 | BRS: 39 | BJP: 8 | AIMIM: 7 | CPI: 1 | Total: 119
 *
 * ── POST-ELECTION DEFECTIONS (BRS → INC, 2024) ─────────────────────────
 *  AC 14  Banswada        — Pocharam Srinivas Reddy
 *  AC 21  Jagtial         — M. Sanjay Kumar
 *  AC 40  Patancheru      — Gudem Mahipal Reddy
 *  AC 51  Rajendranagar   — T. Prakash Goud
 *  AC 52  Serilingampally — Arekapudi Gandhi
 *  AC 53  Chevella        — Kale Yadaiah
 *  AC 60  Khairatabad     — Danam Nagender
 *  AC 79  Gadwal          — Bandla Krishna Mohan Reddy
 *  AC 99  Ghanpur Station — Kadiyam Srihari
 *  AC 119 Bhadrachalam    — Tellam Venkata Rao
 *
 * ── NOTES ───────────────────────────────────────────────────────────────
 *  - winnerVotes2023 / margin2023 set to 0 where ECI portal was inaccessible
 *    (ECI returns HTTP 403). Will backfill from gazette / TSEC when available.
 *  - GeoJSON boundaries sourced from datta07/INDIAN-SHAPEFILES (MIT license).
 */

export interface ConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  /** Party that won the seat in 2023 (as elected) */
  winner2023: string;
  /** Winner candidate name */
  winnerName2023: string;
  /** Winner vote count (0 = pending ECI verification) */
  winnerVotes2023: number;
  /** Runner-up party */
  runnerUp2023: string;
  /** Winning margin (0 = pending ECI verification) */
  margin2023: number;
  /** Current party if different from winner2023 due to post-election defection */
  currentParty?: string;
}

/**
 * All 119 Telangana Assembly Constituencies with 2023 election results.
 * Verified from Wikipedia + MyNeta + OneIndia + IndiaToday (see header).
 */
export const TELANGANA_CONSTITUENCIES: ConstituencySeed[] = [
  // ─── KUMURAM BHEEM ASIFABAD / MANCHERIAL / ADILABAD / NIRMAL ───
  { acNo: 1, name: 'Sirpur', district: 'Kumuram Bheem Asifabad', type: 'ST', winner2023: 'BJP', winnerName2023: 'Palvai Harish Babu', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 2, name: 'Chennur', district: 'Mancherial', type: 'SC', winner2023: 'INC', winnerName2023: 'Gaddam Vivekanand', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 3, name: 'Bellampalli', district: 'Mancherial', type: 'SC', winner2023: 'INC', winnerName2023: 'Gaddam Vinod', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 4, name: 'Mancherial', district: 'Mancherial', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kokkirala Premsagar Rao', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 5, name: 'Asifabad', district: 'Kumuram Bheem Asifabad', type: 'ST', winner2023: 'BRS', winnerName2023: 'Kova Laxmi', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 6, name: 'Khanapur', district: 'Adilabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Vedma Bhojju', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 7, name: 'Adilabad', district: 'Adilabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Payal Shanker', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 8, name: 'Boath', district: 'Adilabad', type: 'ST', winner2023: 'BRS', winnerName2023: 'Anil Jadhav', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 9, name: 'Nirmal', district: 'Nirmal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Alleti Maheshwar Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 10, name: 'Mudhole', district: 'Nirmal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Rama Rao Pawar', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur', district: 'Nizamabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Paidi Rakesh Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 12, name: 'Bodhan', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'P. Sudarshan Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 13, name: 'Jukkal', district: 'Kamareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'Thota Laxmi Kantha Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 14, name: 'Banswada', district: 'Kamareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Pocharam Srinivas Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 15, name: 'Yellareddy', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'K. Madan Mohan Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 16, name: 'Kamareddy', district: 'Kamareddy', type: 'GEN', winner2023: 'BJP', winnerName2023: 'K. V. Ramana Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 17, name: 'Nizamabad Urban', district: 'Nizamabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Dhanpal Suryanarayana Gupta', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 18, name: 'Nizamabad Rural', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rekulapally Bhoopathi Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 19, name: 'Balkonda', district: 'Nizamabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Vemula Prashanth Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla', district: 'Jagtial', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kalvakuntla Sanjay', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 21, name: 'Jagtial', district: 'Jagtial', type: 'GEN', winner2023: 'BRS', winnerName2023: 'M. Sanjay Kumar', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 22, name: 'Dharmapuri', district: 'Jagtial', type: 'SC', winner2023: 'INC', winnerName2023: 'Adluri Laxman Kumar', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 23, name: 'Ramagundam', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Makkan Singh Raj Thakur', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 24, name: 'Manthani', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Duddilla Sridhar Babu', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 25, name: 'Peddapalle', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Chinthakunta Vijaya Ramana Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 26, name: 'Karimnagar', district: 'Karimnagar', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Gangula Kamalakar', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 27, name: 'Choppadandi', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Medipally Satyam', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 28, name: 'Vemulawada', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'INC', winnerName2023: 'Aadi Srinivas', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 29, name: 'Sircilla', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'BRS', winnerName2023: 'K. T. Rama Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 30, name: 'Manakondur', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Kavvampally Satyanarayana', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 31, name: 'Huzurabad', district: 'Karimnagar', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Padi Kaushik Reddy', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad', district: 'Siddipet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ponnam Prabhakar', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 33, name: 'Siddipet', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Thanneeru Harish Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 34, name: 'Medak', district: 'Medak', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mynampally Rohith', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 35, name: 'Narayankhed', district: 'Sangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Patlolla Sanjeeva Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 36, name: 'Andole', district: 'Sangareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'C. Damodar Raja Narasimha', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 37, name: 'Narsapur', district: 'Medak', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Vakiti Sunitha Laxma Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 38, name: 'Zahirabad', district: 'Sangareddy', type: 'SC', winner2023: 'BRS', winnerName2023: 'Koninty Manik Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 39, name: 'Sangareddy', district: 'Sangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Chinta Prabhakar', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 40, name: 'Patancheru', district: 'Sangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Gudem Mahipal Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 41, name: 'Dubbak', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kotha Prabhakar Reddy', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 42, name: 'Gajwel', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'K. Chandrashekar Rao', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Chamakura Malla Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 44, name: 'Malkajgiri', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Marri Rajasekhar Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 45, name: 'Quthbullapur', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'K. P. Vivekanand', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 46, name: 'Kukatpally', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Madhavaram Krishna Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 47, name: 'Uppal', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Bandari Lakshma Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 48, name: 'Ibrahimpatnam', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Malreddy Ranga Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 49, name: 'L. B. Nagar', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Devireddy Sudheer Reddy', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 50, name: 'Maheshwaram', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Sabitha Indra Reddy', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 51, name: 'Rajendranagar', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'T. Prakash Goud', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0, currentParty: 'INC' },
  { acNo: 52, name: 'Serilingampally', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Arekapudi Gandhi', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 53, name: 'Chevella', district: 'Rangareddy', type: 'SC', winner2023: 'BRS', winnerName2023: 'Kale Yadaiah', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tammannagari Ram Mohan Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 55, name: 'Vicarabad', district: 'Vikarabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Gaddam Prasad Kumar', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 56, name: 'Tandur', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'B. Manohar Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Muta Gopal', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 58, name: 'Malakpet', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Ahmed Bin Abdullah Balala', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 59, name: 'Amberpet', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kaleru Venkatesh', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 60, name: 'Khairatabad', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Danam Nagender', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 61, name: 'Jubilee Hills', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Maganti Gopinath', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 62, name: 'Sanathnagar', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Talasani Srinivas Yadav', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 63, name: 'Nampally', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mohammad Majid Hussain', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 64, name: 'Karwan', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Kausar Mohiuddin', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 65, name: 'Goshamahal', district: 'Hyderabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'T. Raja Singh', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 66, name: 'Charminar', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mir Zulfeqar Ali', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 67, name: 'Chandrayangutta', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Akbaruddin Owaisi', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 68, name: 'Yakutpura', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Jaffer Hussain', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 69, name: 'Bahadurpura', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mohammed Mubeen', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 70, name: 'Secunderabad', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'T. Padma Rao Goud', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 71, name: 'Secunderabad Cantonment', district: 'Hyderabad', type: 'SC', winner2023: 'BRS', winnerName2023: 'G. Lasya Nanditha', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },

  // ─── VIKARABAD (KODANGAL) / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / JOGULAMBA GADWAL ───
  { acNo: 72, name: 'Kodangal', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anumula Revanth Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 73, name: 'Narayanpet', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Chittem Parnika Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 74, name: 'Mahbubnagar', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Yennam Srinivas Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 75, name: 'Jadcherla', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Janampalli Anirudh Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 76, name: 'Devarkadra', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gavinolla Madhusudan Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 77, name: 'Makthal', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Vakiti Srihari', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 78, name: 'Wanaparthy', district: 'Wanaparthy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tudi Megha Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 79, name: 'Gadwal', district: 'Jogulamba Gadwal', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Bandla Krishna Mohan Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 80, name: 'Alampur', district: 'Jogulamba Gadwal', type: 'SC', winner2023: 'BRS', winnerName2023: 'Vijayudu', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI BHUVANAGIRI ───
  { acNo: 81, name: 'Nagarkurnool', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kuchkulla Rajesh Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 82, name: 'Achampet', district: 'Nagarkurnool', type: 'SC', winner2023: 'INC', winnerName2023: 'Chikkudu Vamshi Krishna', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 83, name: 'Kalwakurthy', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kasireddy Narayan Reddy', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 84, name: 'Shadnagar', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'K. Shankaraiah', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 85, name: 'Kollapur', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Jupally Krishna Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 86, name: 'Devarakonda', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nenavath Balu Naik', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 87, name: 'Nagarjuna Sagar', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kunduru Jayaveer Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 88, name: 'Miryalaguda', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bathula Laxma Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 89, name: 'Huzurnagar', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nalamada Uttam Kumar Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 90, name: 'Kodad', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nalamada Padmavathi Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 91, name: 'Suryapet', district: 'Suryapet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Guntakandla Jagadish Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 92, name: 'Nalgonda', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komatireddy Venkat Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 93, name: 'Munugode', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komatireddy Raj Gopal Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 94, name: 'Bhongir', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kumbam Anil Kumar Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 95, name: 'Nakrekal', district: 'Nalgonda', type: 'SC', winner2023: 'INC', winnerName2023: 'Vemula Veeresham', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 96, name: 'Thungathurthi', district: 'Suryapet', type: 'SC', winner2023: 'INC', winnerName2023: 'Mandula Samuel', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 97, name: 'Alair', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Beerla Ilaiah', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98, name: 'Jangaon', district: 'Jangaon', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Palla Rajeshwar Reddy', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 99, name: 'Ghanpur Station', district: 'Jangaon', type: 'SC', winner2023: 'BRS', winnerName2023: 'Kadiyam Srihari', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
  { acNo: 100, name: 'Palakurthi', district: 'Jangaon', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mamidala Yashaswini Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 101, name: 'Dornakal', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Jatoth Ram Chander Naik', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 102, name: 'Mahabubabad', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Murali Naik Bhukya', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 103, name: 'Narsampet', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Donthi Madhava Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 104, name: 'Parkal', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Revuri Prakash Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 105, name: 'Warangal West', district: 'Hanamkonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Naini Rajender Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 106, name: 'Warangal East', district: 'Hanamkonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Konda Surekha', winnerVotes2023: 0, runnerUp2023: 'BJP', margin2023: 0 },
  { acNo: 107, name: 'Wardhannapet', district: 'Hanamkonda', type: 'SC', winner2023: 'INC', winnerName2023: 'K. R. Nagaraj', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 108, name: 'Bhupalpalle', district: 'Jayashankar Bhupalpally', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gandra Satyanarayana Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug', district: 'Mulugu', type: 'ST', winner2023: 'INC', winnerName2023: 'Seethakka', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 110, name: 'Pinapaka', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Payam Venkateswarlu', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 111, name: 'Yellandu', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Koram Kanakaiah', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 112, name: 'Khammam', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tummala Nageswara Rao', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 113, name: 'Palair', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ponguleti Srinivasa Reddy', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 114, name: 'Madhira', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Mallu Bhatti Vikramarka', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 115, name: 'Wyra', district: 'Khammam', type: 'ST', winner2023: 'INC', winnerName2023: 'Ramdas Maloth', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 116, name: 'Sathupalli', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Matta Ragamayee', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 117, name: 'Kothagudem', district: 'Bhadradri Kothagudem', type: 'GEN', winner2023: 'CPI', winnerName2023: 'Kunamneni Sambasiva Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0 },
  { acNo: 118, name: 'Aswaraopeta', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Jare Adinarayana', winnerVotes2023: 0, runnerUp2023: 'BRS', margin2023: 0 },
  { acNo: 119, name: 'Bhadrachalam', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'BRS', winnerName2023: 'Tellam Venkata Rao', winnerVotes2023: 0, runnerUp2023: 'INC', margin2023: 0, currentParty: 'INC' },
];
