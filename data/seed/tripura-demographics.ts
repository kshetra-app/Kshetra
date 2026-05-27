/**
 * Tripura — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface TRDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const TR_DEMOGRAPHICS: TRDemographics[] = [
  { acNo: 1, constituencyName: 'Agartala' },
  { acNo: 2, constituencyName: 'Amarpur' },
  { acNo: 3, constituencyName: 'Ambassa' },
  { acNo: 4, constituencyName: 'Ampinagar' },
  { acNo: 5, constituencyName: 'Asharambari' },
  { acNo: 6, constituencyName: 'Badharghat' },
  { acNo: 7, constituencyName: 'Bagbassa' },
  { acNo: 8, constituencyName: 'Bagma' },
  { acNo: 9, constituencyName: 'Banamalipur' },
  { acNo: 10, constituencyName: 'Barjala' },
  { acNo: 11, constituencyName: 'Belonia' },
  { acNo: 12, constituencyName: 'Bishalgarh' },
  { acNo: 13, constituencyName: 'Boxanagar' },
  { acNo: 14, constituencyName: 'Chandipur' },
  { acNo: 15, constituencyName: 'Charilam' },
  { acNo: 16, constituencyName: 'Chawmanu' },
  { acNo: 17, constituencyName: 'Dharmanagar' },
  { acNo: 18, constituencyName: 'Fatikroy' },
  { acNo: 19, constituencyName: 'Golaghati' },
  { acNo: 20, constituencyName: 'Hrishyamukh' },
  { acNo: 21, constituencyName: 'Jolaibari' },
  { acNo: 22, constituencyName: 'Jubarajnagar' },
  { acNo: 23, constituencyName: 'Kadamtala-Kurti' },
  { acNo: 24, constituencyName: 'Kakraban-Shalgara' },
  { acNo: 25, constituencyName: 'Kalyanpur-Pramodnagar' },
  { acNo: 26, constituencyName: 'Kamalasagar' },
  { acNo: 27, constituencyName: 'Kamalpur' },
  { acNo: 28, constituencyName: 'Kanchanpur' },
  { acNo: 29, constituencyName: 'Karamchara' },
  { acNo: 30, constituencyName: 'Karbook' },
  { acNo: 31, constituencyName: 'Khayerpur' },
  { acNo: 32, constituencyName: 'Krishnapur' },
  { acNo: 33, constituencyName: 'Majlishpur' },
  { acNo: 34, constituencyName: 'Mandai Bazar' },
  { acNo: 35, constituencyName: 'Manu' },
  { acNo: 36, constituencyName: 'Matarbari' },
  { acNo: 37, constituencyName: 'Mohanpur' },
  { acNo: 38, constituencyName: 'Nalchar' },
  { acNo: 39, constituencyName: 'Pabiachara' },
  { acNo: 40, constituencyName: 'Pecharthal' },
  { acNo: 41, constituencyName: 'Pratapgarh' },
  { acNo: 42, constituencyName: 'Radhakishorpur' },
  { acNo: 43, constituencyName: 'Raima Valley' },
  { acNo: 44, constituencyName: 'Rajnagar' },
  { acNo: 45, constituencyName: 'Ramchandraghat' },
  { acNo: 46, constituencyName: 'Ramnagar' },
  { acNo: 47, constituencyName: 'Sabroom' },
  { acNo: 48, constituencyName: 'Simna' },
  { acNo: 49, constituencyName: 'Sonamura' },
  { acNo: 50, constituencyName: 'Surma' },
  { acNo: 51, constituencyName: 'Suryamaninagar' },
  { acNo: 52, constituencyName: 'Takarjala' },
  { acNo: 53, constituencyName: 'Teliamura' },
  { acNo: 54, constituencyName: 'Town Bardowali' },
  { acNo: 55, constituencyName: 'Boxanagar : Bye Election On 05-09-2023' },
  { acNo: 56, constituencyName: 'Dhanpur : Bye Election On 05-09-2023' },
  { acNo: 57, constituencyName: 'Ramnagar : Bye Election On 19-04-2024' },
];

export function getTRConstituencyDemographics(acNo: number): TRDemographics | undefined {
  return TR_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
