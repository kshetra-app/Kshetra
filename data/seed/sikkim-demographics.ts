/**
 * Sikkim — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface SKDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const SK_DEMOGRAPHICS: SKDemographics[] = [
  { acNo: 1, constituencyName: 'Arithang' },
  { acNo: 2, constituencyName: 'Barfung' },
  { acNo: 3, constituencyName: 'Chujachen' },
  { acNo: 4, constituencyName: 'Daramdin' },
  { acNo: 5, constituencyName: 'Djongu' },
  { acNo: 6, constituencyName: 'Gangtok' },
  { acNo: 7, constituencyName: 'Gnathang-Machong' },
  { acNo: 8, constituencyName: 'Gyalshing-Barnyak' },
  { acNo: 9, constituencyName: 'Khamdong-Singtam' },
  { acNo: 10, constituencyName: 'Lachen Mangan' },
  { acNo: 11, constituencyName: 'Maneybong-Dentam' },
  { acNo: 12, constituencyName: 'Martam-Rumtek' },
  { acNo: 13, constituencyName: 'Melli' },
  { acNo: 14, constituencyName: 'Namcheybung' },
  { acNo: 15, constituencyName: 'Namchi-Singhithang' },
  { acNo: 16, constituencyName: 'Namthang-Rateypani' },
  { acNo: 17, constituencyName: 'Rangang-Yangang' },
  { acNo: 18, constituencyName: 'Rhenock' },
  { acNo: 19, constituencyName: 'Rinchenpong' },
  { acNo: 20, constituencyName: 'Salghari-Zoom' },
  { acNo: 21, constituencyName: 'Sangha' },
  { acNo: 22, constituencyName: 'Shyari' },
  { acNo: 23, constituencyName: 'Soreng-Chakung' },
  { acNo: 24, constituencyName: 'Temi-Namphing' },
  { acNo: 25, constituencyName: 'Upper Burtuk' },
  { acNo: 26, constituencyName: 'Upper Tadong' },
  { acNo: 27, constituencyName: 'West Pendam' },
  { acNo: 28, constituencyName: 'Yangthang' },
  { acNo: 29, constituencyName: 'Yuksom Tashiding' },
  { acNo: 30, constituencyName: 'Namchi-Singhithang : Bye Election On 13-11-2024' },
  { acNo: 31, constituencyName: 'Soreng-Chakung : Bye Election On 13-11-2024' },
];

export function getSKConstituencyDemographics(acNo: number): SKDemographics | undefined {
  return SK_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
