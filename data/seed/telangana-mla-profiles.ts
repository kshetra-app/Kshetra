/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TELANGANA MLA PROFILES — All 119 MLAs (3rd Assembly, 2023–)          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. telangana-constituencies.ts — Verified winner names + parties (2023)
 *  2. telangana-historical-results.ts — 2014 + 2018 results for terms calc
 *  3. Wikipedia — MLA biographical details
 *  4. MyNeta / ADR — Age, education, assets, criminal cases (where available)
 *
 * ── NOTES ─────────────────────────────────────────────────────────────────
 *  - `terms` counts Telangana Assembly wins only (2014, 2018, 2023).
 *     Pre-2014 AP Assembly terms are NOT counted here.
 *  - `party` reflects CURRENT party (post-defection where applicable).
 *  - `criminalCases` / `totalAssets` / `age` / `education` marked undefined
 *    where MyNeta data has not yet been verified. DO NOT fabricate.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface MLAProfile {
  acNo: number;
  name: string;
  /** Current party (post-defection if applicable) */
  party: string;
  /** Elected party (if different from current) */
  electedParty?: string;
  age?: number;
  gender: 'M' | 'F';
  education?: string;
  profession?: string;
  /** Number of Telangana Assembly terms (2014, 2018, 2023) */
  terms: number;
  /** Criminal cases declared (self-declaration). Undefined = unverified. */
  criminalCases?: number;
  /** Total assets declared in INR. Undefined = unverified. */
  totalAssets?: number;
}

/**
 * All 119 MLA Profiles for the 3rd Telangana Assembly (2023–present).
 * Names and parties sourced from telangana-constituencies.ts (verified).
 * Terms cross-referenced with telangana-historical-results.ts.
 */
export const TELANGANA_MLA_PROFILES: MLAProfile[] = [
  // ─── AC 1–10: ADILABAD / MANCHERIAL / KUMURAM BHEEM / NIRMAL ───
  { acNo: 1,  name: 'Palvai Harish Babu',            party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 2,  name: 'Gaddam Vivekanand',              party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 3,  name: 'Gaddam Vinod',                   party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 4,  name: 'Kokkirala Premsagar Rao',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 5,  name: 'Kova Laxmi',                     party: 'BRS',  gender: 'F', terms: 2 },
  { acNo: 6,  name: 'Vedma Bhojju',                   party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 7,  name: 'Payal Shanker',                  party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 8,  name: 'Anil Jadhav',                    party: 'BRS',  gender: 'M', terms: 1 },
  { acNo: 9,  name: 'Alleti Maheshwar Reddy',         party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 10, name: 'Rama Rao Pawar',                 party: 'BJP',  gender: 'M', terms: 1 },

  // ─── AC 11–19: NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Paidi Rakesh Reddy',             party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 12, name: 'P. Sudarshan Reddy',             party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 13, name: 'Thota Laxmi Kantha Rao',         party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 14, name: 'Pocharam Srinivas Reddy',        party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 3 },
  { acNo: 15, name: 'K. Madan Mohan Rao',             party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 16, name: 'K. V. Ramana Reddy',             party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 17, name: 'Dhanpal Suryanarayana Gupta',    party: 'BJP',  gender: 'M', terms: 1 },
  { acNo: 18, name: 'Rekulapally Bhoopathi Reddy',    party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 19, name: 'Vemula Prashanth Reddy',         party: 'BRS',  gender: 'M', terms: 3 },

  // ─── AC 20–31: JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Kalvakuntla Sanjay',             party: 'BRS',  gender: 'M', terms: 1 },
  { acNo: 21, name: 'M. Sanjay Kumar',                party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 2 },
  { acNo: 22, name: 'Adluri Laxman Kumar',            party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 23, name: 'Makkan Singh Raj Thakur',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 24, name: 'Duddilla Sridhar Babu',          party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 25, name: 'Chinthakunta Vijaya Ramana Rao', party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 26, name: 'Gangula Kamalakar',              party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 27, name: 'Medipally Satyam',               party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 28, name: 'Aadi Srinivas',                  party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 29, name: 'K. T. Rama Rao',                 party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 30, name: 'Kavvampally Satyanarayana',      party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 31, name: 'Padi Kaushik Reddy',             party: 'BRS',  gender: 'M', terms: 1 },

  // ─── AC 32–42: SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Ponnam Prabhakar',               party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 33, name: 'Thanneeru Harish Rao',           party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 34, name: 'Mynampally Rohith',              party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 35, name: 'Patlolla Sanjeeva Reddy',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 36, name: 'C. Damodar Raja Narasimha',      party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 37, name: 'Vakiti Sunitha Laxma Reddy',     party: 'BRS',  gender: 'F', terms: 1 },
  { acNo: 38, name: 'Koninty Manik Rao',              party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 39, name: 'Chinta Prabhakar',               party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 40, name: 'Gudem Mahipal Reddy',            party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 3 },
  { acNo: 41, name: 'Kotha Prabhakar Reddy',          party: 'BRS',  gender: 'M', terms: 1 },
  { acNo: 42, name: 'K. Chandrashekar Rao',           party: 'BRS',  gender: 'M', terms: 3 },

  // ─── AC 43–53: MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Chamakura Malla Reddy',          party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 44, name: 'Marri Rajasekhar Reddy',         party: 'BRS',  gender: 'M', terms: 1 },
  { acNo: 45, name: 'K. P. Vivekanand',               party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 46, name: 'Madhavaram Krishna Rao',         party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 47, name: 'Bandari Lakshma Reddy',          party: 'BRS',  gender: 'M', terms: 1 },
  { acNo: 48, name: 'Malreddy Ranga Reddy',           party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 49, name: 'Devireddy Sudheer Reddy',        party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 50, name: 'Sabitha Indra Reddy',            party: 'BRS',  gender: 'F', terms: 2 },
  { acNo: 51, name: 'T. Prakash Goud',                party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 3 },
  { acNo: 52, name: 'Arekapudi Gandhi',               party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 3 },
  { acNo: 53, name: 'Kale Yadaiah',                   party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 3 },

  // ─── AC 54–56: VIKARABAD ───
  { acNo: 54, name: 'Tammannagari Ram Mohan Reddy',   party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 55, name: 'Gaddam Prasad Kumar',            party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 56, name: 'B. Manohar Reddy',               party: 'INC',  gender: 'M', terms: 1 },

  // ─── AC 57–71: HYDERABAD ───
  { acNo: 57, name: 'Muta Gopal',                     party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 58, name: 'Ahmed Bin Abdullah Balala',       party: 'AIMIM', gender: 'M', terms: 3 },
  { acNo: 59, name: 'Kaleru Venkatesh',               party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 60, name: 'Danam Nagender',                 party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 2 },
  { acNo: 61, name: 'Maganti Gopinath',               party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 62, name: 'Talasani Srinivas Yadav',        party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 63, name: 'Mohammad Majid Hussain',         party: 'AIMIM', gender: 'M', terms: 1 },
  { acNo: 64, name: 'Kausar Mohiuddin',               party: 'AIMIM', gender: 'M', terms: 3 },
  { acNo: 65, name: 'T. Raja Singh',                  party: 'BJP',  gender: 'M', terms: 2 },
  { acNo: 66, name: 'Mir Zulfeqar Ali',               party: 'AIMIM', gender: 'M', terms: 1 },
  { acNo: 67, name: 'Akbaruddin Owaisi',              party: 'AIMIM', gender: 'M', terms: 3 },
  { acNo: 68, name: 'Jaffer Hussain',                 party: 'AIMIM', gender: 'M', terms: 1 },
  { acNo: 69, name: 'Mohammed Mubeen',                party: 'AIMIM', gender: 'M', terms: 1 },
  { acNo: 70, name: 'T. Padma Rao Goud',              party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 71, name: 'G. Lasya Nanditha',              party: 'BRS',  gender: 'F', terms: 1 },

  // ─── AC 72–80: KODANGAL / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / GADWAL ───
  { acNo: 72, name: 'Anumula Revanth Reddy',          party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 73, name: 'Chittem Parnika Reddy',          party: 'INC',  gender: 'F', terms: 1 },
  { acNo: 74, name: 'Yennam Srinivas Reddy',          party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 75, name: 'Janampalli Anirudh Reddy',       party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 76, name: 'Gavinolla Madhusudan Reddy',     party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 77, name: 'Vakiti Srihari',                 party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 78, name: 'Tudi Megha Reddy',               party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 79, name: 'Bandla Krishna Mohan Reddy',     party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 2 },
  { acNo: 80, name: 'Vijayudu',                       party: 'BRS',  gender: 'M', terms: 1 },

  // ─── AC 81–97: NAGARKURNOOL / NALGONDA / SURYAPET / YADADRI ───
  { acNo: 81, name: 'Kuchkulla Rajesh Reddy',         party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 82, name: 'Chikkudu Vamshi Krishna',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 83, name: 'Kasireddy Narayan Reddy',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 84, name: 'K. Shankaraiah',                 party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 85, name: 'Jupally Krishna Rao',            party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 86, name: 'Nenavath Balu Naik',             party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 87, name: 'Kunduru Jayaveer Reddy',         party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 88, name: 'Bathula Laxma Reddy',            party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 89, name: 'Nalamada Uttam Kumar Reddy',     party: 'INC',  gender: 'M', terms: 3 },
  { acNo: 90, name: 'Nalamada Padmavathi Reddy',      party: 'INC',  gender: 'F', terms: 2 },
  { acNo: 91, name: 'Guntakandla Jagadish Reddy',     party: 'BRS',  gender: 'M', terms: 3 },
  { acNo: 92, name: 'Komatireddy Venkat Reddy',       party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 93, name: 'Komatireddy Raj Gopal Reddy',    party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 94, name: 'Kumbam Anil Kumar Reddy',        party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 95, name: 'Vemula Veeresham',               party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 96, name: 'Mandula Samuel',                 party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 97, name: 'Beerla Ilaiah',                  party: 'INC',  gender: 'M', terms: 1 },

  // ─── AC 98–108: JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98,  name: 'Palla Rajeshwar Reddy',         party: 'BRS',  gender: 'M', terms: 2 },
  { acNo: 99,  name: 'Kadiyam Srihari',               party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 2 },
  { acNo: 100, name: 'Mamidala Yashaswini Reddy',     party: 'INC',  gender: 'F', terms: 1 },
  { acNo: 101, name: 'Jatoth Ram Chander Naik',       party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 102, name: 'Murali Naik Bhukya',            party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 103, name: 'Donthi Madhava Reddy',          party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 104, name: 'Revuri Prakash Reddy',          party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 105, name: 'Naini Rajender Reddy',          party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 106, name: 'Konda Surekha',                 party: 'INC',  gender: 'F', terms: 2 },
  { acNo: 107, name: 'K. R. Nagaraj',                 party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 108, name: 'Gandra Satyanarayana Rao',      party: 'INC',  gender: 'M', terms: 1 },

  // ─── AC 109–119: MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Seethakka',                     party: 'INC',  gender: 'F', terms: 2 },
  { acNo: 110, name: 'Payam Venkateswarlu',           party: 'INC',  gender: 'M', terms: 3 },
  { acNo: 111, name: 'Koram Kanakaiah',               party: 'INC',  gender: 'M', terms: 2 },
  { acNo: 112, name: 'Tummala Nageswara Rao',         party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 113, name: 'Ponguleti Srinivasa Reddy',     party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 114, name: 'Mallu Bhatti Vikramarka',       party: 'INC',  gender: 'M', terms: 3 },
  { acNo: 115, name: 'Ramdas Maloth',                 party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 116, name: 'Matta Ragamayee',               party: 'INC',  gender: 'F', terms: 1 },
  { acNo: 117, name: 'Kunamneni Sambasiva Rao',       party: 'CPI',  gender: 'M', terms: 1 },
  { acNo: 118, name: 'Jare Adinarayana',              party: 'INC',  gender: 'M', terms: 1 },
  { acNo: 119, name: 'Tellam Venkata Rao',            party: 'INC',  electedParty: 'BRS', gender: 'M', terms: 1 },
];

/** Quick lookup map for O(1) access */
const profileMap = new Map<number, MLAProfile>(
  TELANGANA_MLA_PROFILES.map((p) => [p.acNo, p]),
);

/** Lookup MLA profile by AC number */
export function getMLAProfile(acNo: number): MLAProfile | undefined {
  return profileMap.get(acNo);
}

/** Get all MLAs belonging to a party */
export function getMLAsByParty(party: string): MLAProfile[] {
  return TELANGANA_MLA_PROFILES.filter((p) => p.party === party);
}

/** Get all MLAs who defected (electedParty !== party) */
export function getDefectedMLAs(): MLAProfile[] {
  return TELANGANA_MLA_PROFILES.filter((p) => p.electedParty && p.electedParty !== p.party);
}

/** Get all female MLAs */
export function getFemaleMLAs(): MLAProfile[] {
  return TELANGANA_MLA_PROFILES.filter((p) => p.gender === 'F');
}

/** Get veteran MLAs (3+ terms in Telangana) */
export function getVeteranMLAs(): MLAProfile[] {
  return TELANGANA_MLA_PROFILES.filter((p) => p.terms >= 3);
}
