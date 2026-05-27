/**
 * Himachal Pradesh — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface HPDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const HP_DEMOGRAPHICS: HPDemographics[] = [
  { acNo: 1, constituencyName: 'Anni' },
  { acNo: 2, constituencyName: 'Arki' },
  { acNo: 3, constituencyName: 'Baijnath' },
  { acNo: 4, constituencyName: 'Balh' },
  { acNo: 5, constituencyName: 'Banjar' },
  { acNo: 6, constituencyName: 'Barsar' },
  { acNo: 7, constituencyName: 'Bharmour' },
  { acNo: 8, constituencyName: 'Bhattiyat' },
  { acNo: 9, constituencyName: 'Bilaspur' },
  { acNo: 10, constituencyName: 'Chamba' },
  { acNo: 11, constituencyName: 'Chintpurni' },
  { acNo: 12, constituencyName: 'Chopal' },
  { acNo: 13, constituencyName: 'Churah' },
  { acNo: 14, constituencyName: 'Dalhousie' },
  { acNo: 15, constituencyName: 'Darang' },
  { acNo: 16, constituencyName: 'Dehra' },
  { acNo: 17, constituencyName: 'Dharamshala' },
  { acNo: 18, constituencyName: 'Doon' },
  { acNo: 19, constituencyName: 'Fatehpur' },
  { acNo: 20, constituencyName: 'Gagret' },
  { acNo: 21, constituencyName: 'Ghumarwin' },
  { acNo: 22, constituencyName: 'Hamirpur' },
  { acNo: 23, constituencyName: 'Haroli' },
  { acNo: 24, constituencyName: 'Indora' },
  { acNo: 25, constituencyName: 'Jaswan-Pragpur' },
  { acNo: 26, constituencyName: 'Jawalamukhi' },
  { acNo: 27, constituencyName: 'Jawali' },
  { acNo: 28, constituencyName: 'Jhanduta' },
  { acNo: 29, constituencyName: 'Jogindernagar' },
  { acNo: 30, constituencyName: 'Jubbal-Kotkhai' },
  { acNo: 31, constituencyName: 'Kangra' },
  { acNo: 32, constituencyName: 'Karsog' },
  { acNo: 33, constituencyName: 'Kasumpti' },
  { acNo: 34, constituencyName: 'Kinnaur' },
  { acNo: 35, constituencyName: 'Kullu' },
  { acNo: 36, constituencyName: 'Kutlehar' },
  { acNo: 37, constituencyName: 'Lahaul And Spiti' },
  { acNo: 38, constituencyName: 'Manali' },
  { acNo: 39, constituencyName: 'Mandi' },
  { acNo: 40, constituencyName: 'Nachan' },
  { acNo: 41, constituencyName: 'Nagrota' },
  { acNo: 42, constituencyName: 'Nahan' },
  { acNo: 43, constituencyName: 'Nalagarh' },
  { acNo: 44, constituencyName: 'Nurpur' },
  { acNo: 45, constituencyName: 'Pachhad' },
  { acNo: 46, constituencyName: 'Palampur' },
  { acNo: 47, constituencyName: 'Paonta Sahib' },
  { acNo: 48, constituencyName: 'Rampur' },
  { acNo: 49, constituencyName: 'Sarkaghat' },
  { acNo: 50, constituencyName: 'Seraj' },
  { acNo: 51, constituencyName: 'Shahpur' },
  { acNo: 52, constituencyName: 'Shillai' },
  { acNo: 53, constituencyName: 'Shimla' },
  { acNo: 54, constituencyName: 'Shimla Rural' },
  { acNo: 55, constituencyName: 'Solan' },
  { acNo: 56, constituencyName: 'Sri Naina Deviji' },
  { acNo: 57, constituencyName: 'Sujanpur' },
  { acNo: 58, constituencyName: 'Sullah' },
  { acNo: 59, constituencyName: 'Sundernagar' },
  { acNo: 60, constituencyName: 'Theog' },
  { acNo: 61, constituencyName: 'Una' },
  { acNo: 62, constituencyName: 'Barsar : Bye Election On 01-06-2024' },
  { acNo: 63, constituencyName: 'Dehra : Bye Election On 10-07-2024' },
  { acNo: 64, constituencyName: 'Dharamshala : Bye Election On 01-06-2024' },
  { acNo: 65, constituencyName: 'Gagret : Bye Election On 01-06-2024' },
  { acNo: 66, constituencyName: 'Hamirpur : Bye Election On 10-07-2024' },
  { acNo: 67, constituencyName: 'Kutlehar : Bye Election On 01-06-2024' },
  { acNo: 68, constituencyName: 'Lahaul & Spiti' },
  { acNo: 69, constituencyName: 'Nalagarh : Bye Election On 10-07-2024' },
  { acNo: 70, constituencyName: 'Sujanpur : Bye Election On 01-06-2024' },
];

export function getHPConstituencyDemographics(acNo: number): HPDemographics | undefined {
  return HP_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
