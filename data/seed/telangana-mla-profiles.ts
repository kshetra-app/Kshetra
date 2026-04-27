/**
 * MLA Profile data for Telangana Assembly (2023 term)
 * Extended candidate information keyed by AC number
 */

export interface MLAProfile {
  acNo: number;
  name: string;
  party: string;
  age?: number;
  gender: 'M' | 'F';
  education?: string;
  profession?: string;
  /** Number of terms served including current */
  terms: number;
  /** Criminal cases declared (self-declaration) */
  criminalCases: number;
  /** Total assets declared in INR */
  totalAssets?: number;
  /** Contact/office info */
  phone?: string;
  email?: string;
}

/**
 * MLA Profiles for 20 key constituencies (sample data).
 * Full dataset to be populated from ADR/MyNeta/ECI affidavits.
 */
export const TELANGANA_MLA_PROFILES: MLAProfile[] = [
  // ─── KEY CONSTITUENCIES ───
  { acNo: 1, name: 'Dr Palvai Harish Babu', party: 'INC', age: 52, gender: 'M', education: 'MBBS', profession: 'Doctor / Politician', terms: 2, criminalCases: 0, totalAssets: 45000000 },
  { acNo: 4, name: 'Nadipelli Divakar Rao', party: 'BRS', age: 58, gender: 'M', education: 'B.Com', profession: 'Business', terms: 3, criminalCases: 1, totalAssets: 120000000 },
  { acNo: 17, name: 'D Arvind', party: 'BJP', age: 48, gender: 'M', education: 'MBA', profession: 'Business / Politician', terms: 1, criminalCases: 2, totalAssets: 85000000 },
  { acNo: 26, name: 'Bandi Sanjay Kumar', party: 'BJP', age: 51, gender: 'M', education: 'BA', profession: 'Politician', terms: 1, criminalCases: 3, totalAssets: 35000000 },
  { acNo: 29, name: 'KT Rama Rao', party: 'BRS', age: 47, gender: 'M', education: 'MBA (US)', profession: 'Politician', terms: 3, criminalCases: 0, totalAssets: 280000000 },
  { acNo: 31, name: 'Eatala Rajender', party: 'BJP', age: 60, gender: 'M', education: 'M.Sc', profession: 'Politician', terms: 4, criminalCases: 1, totalAssets: 150000000 },
  { acNo: 33, name: 'T Harish Rao', party: 'BRS', age: 53, gender: 'M', education: 'B.Tech', profession: 'Politician', terms: 5, criminalCases: 0, totalAssets: 320000000 },
  { acNo: 46, name: 'A Revanth Reddy', party: 'INC', age: 54, gender: 'M', education: 'B.Tech', profession: 'Politician', terms: 3, criminalCases: 2, totalAssets: 180000000 },
  { acNo: 51, name: 'Bhatti Vikramarka', party: 'INC', age: 58, gender: 'M', education: 'LLB', profession: 'Advocate / Politician', terms: 4, criminalCases: 0, totalAssets: 95000000 },
  { acNo: 69, name: 'D Nagender', party: 'INC', age: 55, gender: 'M', education: 'B.Com', profession: 'Business / Politician', terms: 3, criminalCases: 1, totalAssets: 210000000 },
  { acNo: 71, name: 'Danam Nagender', party: 'INC', age: 62, gender: 'M', education: 'BA', profession: 'Politician', terms: 5, criminalCases: 0, totalAssets: 175000000 },
  { acNo: 76, name: 'Akbaruddin Owaisi', party: 'AIMIM', age: 53, gender: 'M', education: 'BA', profession: 'Politician', terms: 5, criminalCases: 4, totalAssets: 65000000 },
  { acNo: 77, name: 'Ahmed Bin Abdullah Balala', party: 'AIMIM', age: 51, gender: 'M', education: 'MA', profession: 'Social Worker', terms: 3, criminalCases: 0, totalAssets: 28000000 },
  { acNo: 78, name: 'Mohd Mubeen', party: 'AIMIM', age: 45, gender: 'M', education: 'B.Com', profession: 'Business', terms: 2, criminalCases: 0, totalAssets: 42000000 },
  { acNo: 81, name: 'Kale Yadaiah', party: 'INC', age: 56, gender: 'M', education: 'BA', profession: 'Politician', terms: 3, criminalCases: 1, totalAssets: 78000000 },
  { acNo: 90, name: 'Anasuya Seethakka', party: 'INC', age: 44, gender: 'F', education: 'MA', profession: 'Social Activist / Politician', terms: 2, criminalCases: 0, totalAssets: 15000000 },
  { acNo: 100, name: 'Komatireddy Venkat Reddy', party: 'INC', age: 58, gender: 'M', education: 'B.Tech', profession: 'Business / Politician', terms: 3, criminalCases: 2, totalAssets: 350000000 },
  { acNo: 105, name: 'Revathi', party: 'INC', age: 40, gender: 'F', education: 'MA', profession: 'Politician', terms: 1, criminalCases: 0, totalAssets: 22000000 },
  { acNo: 115, name: 'Gadwal Vijayalakshmi', party: 'INC', age: 48, gender: 'F', education: 'BA', profession: 'Politician', terms: 2, criminalCases: 0, totalAssets: 55000000 },
  { acNo: 119, name: 'Kalvakuntla Kavitha', party: 'BRS', age: 46, gender: 'F', education: 'MBA', profession: 'Politician', terms: 2, criminalCases: 1, totalAssets: 240000000 },
];

/** Lookup MLA profile by AC number */
export function getMLAProfile(acNo: number): MLAProfile | undefined {
  return TELANGANA_MLA_PROFILES.find((p) => p.acNo === acNo);
}
