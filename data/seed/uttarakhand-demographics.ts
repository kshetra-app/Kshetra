/**
 * Uttarakhand — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface UKDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const UK_DEMOGRAPHICS: UKDemographics[] = [
  { acNo: 1, constituencyName: 'Almora' },
  { acNo: 2, constituencyName: 'B.H.E.L. Ranipur' },
  { acNo: 3, constituencyName: 'Badrinath' },
  { acNo: 4, constituencyName: 'Bageshwar' },
  { acNo: 5, constituencyName: 'Bajpur' },
  { acNo: 6, constituencyName: 'Bhagwanpur' },
  { acNo: 7, constituencyName: 'Bhimtal' },
  { acNo: 8, constituencyName: 'Chakrata' },
  { acNo: 9, constituencyName: 'Chaubattakhal' },
  { acNo: 10, constituencyName: 'Dehradun Cantonment' },
  { acNo: 11, constituencyName: 'Devprayag' },
  { acNo: 12, constituencyName: 'Dhanolti' },
  { acNo: 13, constituencyName: 'Dharampur' },
  { acNo: 14, constituencyName: 'Dharchula' },
  { acNo: 15, constituencyName: 'Didihat' },
  { acNo: 16, constituencyName: 'Doiwala' },
  { acNo: 17, constituencyName: 'Gadarpur' },
  { acNo: 18, constituencyName: 'Gangolihat' },
  { acNo: 19, constituencyName: 'Gangotri' },
  { acNo: 20, constituencyName: 'Ghanshali' },
  { acNo: 21, constituencyName: 'Haldwani' },
  { acNo: 22, constituencyName: 'Haridwar' },
  { acNo: 23, constituencyName: 'Haridwar Rural' },
  { acNo: 24, constituencyName: 'Jageshwar' },
  { acNo: 25, constituencyName: 'Jhabrera' },
  { acNo: 26, constituencyName: 'Jwalapur' },
  { acNo: 27, constituencyName: 'Kaladhungi' },
  { acNo: 28, constituencyName: 'Kapkote' },
  { acNo: 29, constituencyName: 'Karanprayag' },
  { acNo: 30, constituencyName: 'Kashipur' },
  { acNo: 31, constituencyName: 'Kedarnath' },
  { acNo: 32, constituencyName: 'Khanpur' },
  { acNo: 33, constituencyName: 'Kichha' },
  { acNo: 34, constituencyName: 'Kotdwar' },
  { acNo: 35, constituencyName: 'Laksar' },
  { acNo: 36, constituencyName: 'Lalkuan' },
  { acNo: 37, constituencyName: 'Lansdowne' },
  { acNo: 38, constituencyName: 'Lohaghat' },
  { acNo: 39, constituencyName: 'Manglore' },
  { acNo: 40, constituencyName: 'Mussoorie' },
  { acNo: 41, constituencyName: 'Nanakmatta' },
  { acNo: 42, constituencyName: 'Narendranagar' },
  { acNo: 43, constituencyName: 'Pauri' },
  { acNo: 44, constituencyName: 'Pirankaliyar' },
  { acNo: 45, constituencyName: 'Pithoragarh' },
  { acNo: 46, constituencyName: 'Pratapnagar' },
  { acNo: 47, constituencyName: 'Purola' },
  { acNo: 48, constituencyName: 'Raipur' },
  { acNo: 49, constituencyName: 'Ramnagar' },
  { acNo: 50, constituencyName: 'Ranikhet' },
  { acNo: 51, constituencyName: 'Rishikesh' },
  { acNo: 52, constituencyName: 'Roorkee' },
  { acNo: 53, constituencyName: 'Rudraprayag' },
  { acNo: 54, constituencyName: 'Rudrapur' },
  { acNo: 55, constituencyName: 'Sahaspur' },
  { acNo: 56, constituencyName: 'Salt' },
  { acNo: 57, constituencyName: 'Someshwar' },
  { acNo: 58, constituencyName: 'Srinagar' },
  { acNo: 59, constituencyName: 'Tehri' },
  { acNo: 60, constituencyName: 'Tharali' },
  { acNo: 61, constituencyName: 'Vikasnagar' },
  { acNo: 62, constituencyName: 'Yamkeshwar' },
  { acNo: 63, constituencyName: 'Yamunotri' },
  { acNo: 64, constituencyName: 'Badrinath : Bye Election On 10-07-2024' },
  { acNo: 65, constituencyName: 'Bageshwar' },
  { acNo: 66, constituencyName: 'Champawat : Bye Election On 31-05-2022' },
  { acNo: 67, constituencyName: 'Kedarnath : Bye Election On 20-11-2024' },
  { acNo: 68, constituencyName: 'Manglore : Bye Election On 10-07-2024' },
];

export function getUKConstituencyDemographics(acNo: number): UKDemographics | undefined {
  return UK_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
