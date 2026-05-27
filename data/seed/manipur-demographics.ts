/**
 * Manipur — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface MNDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const MN_DEMOGRAPHICS: MNDemographics[] = [
  { acNo: 1, constituencyName: 'Andro' },
  { acNo: 2, constituencyName: 'Bishenpur' },
  { acNo: 3, constituencyName: 'Chandel' },
  { acNo: 4, constituencyName: 'Chingai' },
  { acNo: 5, constituencyName: 'Churachandpur' },
  { acNo: 6, constituencyName: 'Heingang' },
  { acNo: 7, constituencyName: 'Heirok' },
  { acNo: 8, constituencyName: 'Henglep' },
  { acNo: 9, constituencyName: 'Jiribam' },
  { acNo: 10, constituencyName: 'Kakching' },
  { acNo: 11, constituencyName: 'Kangpokpi' },
  { acNo: 12, constituencyName: 'Karong' },
  { acNo: 13, constituencyName: 'Keirao' },
  { acNo: 14, constituencyName: 'Keisamthong' },
  { acNo: 15, constituencyName: 'Khangabok' },
  { acNo: 16, constituencyName: 'Khetrigao' },
  { acNo: 17, constituencyName: 'Khurai' },
  { acNo: 18, constituencyName: 'Konthoujam' },
  { acNo: 19, constituencyName: 'Kumbi' },
  { acNo: 20, constituencyName: 'Lamlai' },
  { acNo: 21, constituencyName: 'Lamsang' },
  { acNo: 22, constituencyName: 'Langthabal' },
  { acNo: 23, constituencyName: 'Lilong' },
  { acNo: 24, constituencyName: 'Mao' },
  { acNo: 25, constituencyName: 'Moirang' },
  { acNo: 26, constituencyName: 'Nambol' },
  { acNo: 27, constituencyName: 'Naoria Pakhanglakpa' },
  { acNo: 28, constituencyName: 'Nungba' },
  { acNo: 29, constituencyName: 'Oinam' },
  { acNo: 30, constituencyName: 'Patsoi' },
  { acNo: 31, constituencyName: 'Phungyar' },
  { acNo: 32, constituencyName: 'Sagolband' },
  { acNo: 33, constituencyName: 'Saikul' },
  { acNo: 34, constituencyName: 'Saitu' },
  { acNo: 35, constituencyName: 'Sekmai' },
  { acNo: 36, constituencyName: 'Singhat' },
  { acNo: 37, constituencyName: 'Singjamei' },
  { acNo: 38, constituencyName: 'Sugnoo' },
  { acNo: 39, constituencyName: 'Tadubi' },
  { acNo: 40, constituencyName: 'Tamei' },
  { acNo: 41, constituencyName: 'Tengnoupal' },
  { acNo: 42, constituencyName: 'Thanga' },
  { acNo: 43, constituencyName: 'Thangmeiband' },
  { acNo: 44, constituencyName: 'Thanlon' },
  { acNo: 45, constituencyName: 'Thongju' },
  { acNo: 46, constituencyName: 'Thoubal' },
  { acNo: 47, constituencyName: 'Tipaimukh' },
  { acNo: 48, constituencyName: 'Ukhrul' },
  { acNo: 49, constituencyName: 'Wabgai' },
  { acNo: 50, constituencyName: 'Wangjing Tentha' },
  { acNo: 51, constituencyName: 'Wangkhei' },
  { acNo: 52, constituencyName: 'Wangkhem' },
  { acNo: 53, constituencyName: 'Wangoi' },
  { acNo: 54, constituencyName: 'Yaiskul' },
];

export function getMNConstituencyDemographics(acNo: number): MNDemographics | undefined {
  return MN_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
