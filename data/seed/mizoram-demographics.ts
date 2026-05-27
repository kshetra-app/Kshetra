/**
 * Mizoram — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface MZDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const MZ_DEMOGRAPHICS: MZDemographics[] = [
  { acNo: 1, constituencyName: 'Aizawl East-I' },
  { acNo: 2, constituencyName: 'Aizawl East-Ii' },
  { acNo: 3, constituencyName: 'Aizawl North-I' },
  { acNo: 4, constituencyName: 'Aizawl North-Ii' },
  { acNo: 5, constituencyName: 'Aizawl North-Iii' },
  { acNo: 6, constituencyName: 'Aizawl South-I' },
  { acNo: 7, constituencyName: 'Aizawl South-Ii' },
  { acNo: 8, constituencyName: 'Aizawl South-Iii' },
  { acNo: 9, constituencyName: 'Aizawl West-Ii' },
  { acNo: 10, constituencyName: 'Aizawl West-Iii' },
  { acNo: 11, constituencyName: 'Chalfilh' },
  { acNo: 12, constituencyName: 'Champhai North' },
  { acNo: 13, constituencyName: 'Champhai South' },
  { acNo: 14, constituencyName: 'Dampa' },
  { acNo: 15, constituencyName: 'East Tuipui' },
  { acNo: 16, constituencyName: 'Hachhek' },
  { acNo: 17, constituencyName: 'Kolasib' },
  { acNo: 18, constituencyName: 'Lawngtlai East' },
  { acNo: 19, constituencyName: 'Lawngtlai West' },
  { acNo: 20, constituencyName: 'Lunglei East' },
  { acNo: 21, constituencyName: 'Lunglei North' },
  { acNo: 22, constituencyName: 'Lunglei South' },
  { acNo: 23, constituencyName: 'Lunglei West' },
  { acNo: 24, constituencyName: 'Mamit' },
  { acNo: 25, constituencyName: 'Saiha' },
  { acNo: 26, constituencyName: 'Serchhip' },
  { acNo: 27, constituencyName: 'Serlui' },
  { acNo: 28, constituencyName: 'South Tuipui' },
  { acNo: 29, constituencyName: 'Tawi' },
  { acNo: 30, constituencyName: 'Thorang' },
  { acNo: 31, constituencyName: 'Tuichang' },
  { acNo: 32, constituencyName: 'Tuichawng' },
  { acNo: 33, constituencyName: 'Tuirial' },
  { acNo: 34, constituencyName: 'Tuivawl' },
  { acNo: 35, constituencyName: 'West Tuipui' },
];

export function getMZConstituencyDemographics(acNo: number): MZDemographics | undefined {
  return MZ_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
