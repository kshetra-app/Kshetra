/**
 * Jammu Kashmir — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface JKDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const JK_DEMOGRAPHICS: JKDemographics[] = [
  { acNo: 1, constituencyName: 'Akhnoor' },
  { acNo: 2, constituencyName: 'Anantnag' },
  { acNo: 3, constituencyName: 'Anantnag West' },
  { acNo: 4, constituencyName: 'Bahu' },
  { acNo: 5, constituencyName: 'Bandipora' },
  { acNo: 6, constituencyName: 'Bani' },
  { acNo: 7, constituencyName: 'Banihal' },
  { acNo: 8, constituencyName: 'Baramulla' },
  { acNo: 9, constituencyName: 'Beerwah' },
  { acNo: 10, constituencyName: 'Bhadarwah' },
  { acNo: 11, constituencyName: 'Billawar' },
  { acNo: 12, constituencyName: 'Bishnah' },
  { acNo: 13, constituencyName: 'Budgam' },
  { acNo: 14, constituencyName: 'Budhal' },
  { acNo: 15, constituencyName: 'Central Shalteng' },
  { acNo: 16, constituencyName: 'Chadoora' },
  { acNo: 17, constituencyName: 'Charar-I-Sharief' },
  { acNo: 18, constituencyName: 'Chenani' },
  { acNo: 19, constituencyName: 'Chhamb' },
  { acNo: 20, constituencyName: 'D.H. Pora' },
  { acNo: 21, constituencyName: 'Devsar' },
  { acNo: 22, constituencyName: 'Doda' },
  { acNo: 23, constituencyName: 'Doda West' },
  { acNo: 24, constituencyName: 'Dooru' },
  { acNo: 25, constituencyName: 'Ganderbal' },
  { acNo: 26, constituencyName: 'Gulabgarh' },
  { acNo: 27, constituencyName: 'Gulmarg' },
  { acNo: 28, constituencyName: 'Gurez' },
  { acNo: 29, constituencyName: 'Habbakadal' },
  { acNo: 30, constituencyName: 'Handwara' },
  { acNo: 31, constituencyName: 'Hazratbal' },
  { acNo: 32, constituencyName: 'Hiranagar' },
  { acNo: 33, constituencyName: 'Jammu East' },
  { acNo: 34, constituencyName: 'Jammu North' },
  { acNo: 35, constituencyName: 'Jammu West' },
  { acNo: 36, constituencyName: 'Jasrota' },
  { acNo: 37, constituencyName: 'Kalakote - Sunderbani' },
  { acNo: 38, constituencyName: 'Kangan' },
  { acNo: 39, constituencyName: 'Karnah' },
  { acNo: 40, constituencyName: 'Kathua' },
  { acNo: 41, constituencyName: 'Khanyar' },
  { acNo: 42, constituencyName: 'Kishtwar' },
  { acNo: 43, constituencyName: 'Kokernag' },
  { acNo: 44, constituencyName: 'Kulgam' },
  { acNo: 45, constituencyName: 'Kupwara' },
  { acNo: 46, constituencyName: 'Lal Chowk' },
  { acNo: 47, constituencyName: 'Langate' },
  { acNo: 48, constituencyName: 'Lolab' },
  { acNo: 49, constituencyName: 'Mendhar' },
  { acNo: 50, constituencyName: 'Nagrota' },
  { acNo: 51, constituencyName: 'Nowshera' },
  { acNo: 52, constituencyName: 'Padder-Nagseni' },
  { acNo: 53, constituencyName: 'Pahalgam' },
  { acNo: 54, constituencyName: 'Pampore' },
  { acNo: 55, constituencyName: 'Pattan' },
  { acNo: 56, constituencyName: 'Poonch Haveli' },
  { acNo: 57, constituencyName: 'R.S. Pura - Jammu South' },
  { acNo: 58, constituencyName: 'Rafiabad' },
  { acNo: 59, constituencyName: 'Rajouri' },
  { acNo: 60, constituencyName: 'Rajpora' },
  { acNo: 61, constituencyName: 'Ramban' },
  { acNo: 62, constituencyName: 'Ramgarh' },
  { acNo: 63, constituencyName: 'Ramnagar' },
  { acNo: 64, constituencyName: 'Reasi' },
  { acNo: 65, constituencyName: 'Shangus-Anantnag East' },
  { acNo: 66, constituencyName: 'Shopian' },
  { acNo: 67, constituencyName: 'Shri Mata Vaishno Devi' },
  { acNo: 68, constituencyName: 'Sonawari' },
  { acNo: 69, constituencyName: 'Sopore' },
  { acNo: 70, constituencyName: 'Srigufwara- Bijbehara' },
  { acNo: 71, constituencyName: 'Suchetgarh' },
  { acNo: 72, constituencyName: 'Surankote' },
  { acNo: 73, constituencyName: 'Tral' },
  { acNo: 74, constituencyName: 'Trehgam' },
  { acNo: 75, constituencyName: 'Udhampur East' },
  { acNo: 76, constituencyName: 'Udhampur West' },
  { acNo: 77, constituencyName: 'Uri' },
  { acNo: 78, constituencyName: 'Vijaypur' },
  { acNo: 79, constituencyName: 'Wagoora - Kreeri' },
  { acNo: 80, constituencyName: 'Zadibal' },
  { acNo: 81, constituencyName: 'Budgam : Bye Election On 11-11-2025' },
  { acNo: 82, constituencyName: 'Nagrota : Bye Election On 11-11-2025' },
];

export function getJKConstituencyDemographics(acNo: number): JKDemographics | undefined {
  return JK_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
