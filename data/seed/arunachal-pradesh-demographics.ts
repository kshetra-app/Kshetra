/**
 * Arunachal Pradesh — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface ARDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const AR_DEMOGRAPHICS: ARDemographics[] = [
  { acNo: 1, constituencyName: 'Along East' },
  { acNo: 2, constituencyName: 'Along West' },
  { acNo: 3, constituencyName: 'Anini' },
  { acNo: 4, constituencyName: 'Bameng' },
  { acNo: 5, constituencyName: 'Basar' },
  { acNo: 6, constituencyName: 'Bomdila' },
  { acNo: 7, constituencyName: 'Bordumsa-Diyum' },
  { acNo: 8, constituencyName: 'Borduria-Bogapani' },
  { acNo: 9, constituencyName: 'Changlang South' },
  { acNo: 10, constituencyName: 'Chowkham' },
  { acNo: 11, constituencyName: 'Chyangtajo' },
  { acNo: 12, constituencyName: 'Dambuk' },
  { acNo: 13, constituencyName: 'Daporijo' },
  { acNo: 14, constituencyName: 'Dirang' },
  { acNo: 15, constituencyName: 'Doimukh' },
  { acNo: 16, constituencyName: 'Dumporijo' },
  { acNo: 17, constituencyName: 'Itanagar' },
  { acNo: 18, constituencyName: 'Kalaktang' },
  { acNo: 19, constituencyName: 'Kanubari' },
  { acNo: 20, constituencyName: 'Khonsa East' },
  { acNo: 21, constituencyName: 'Khonsa West' },
  { acNo: 22, constituencyName: 'Koloriang' },
  { acNo: 23, constituencyName: 'Lekang' },
  { acNo: 24, constituencyName: 'Likabali' },
  { acNo: 25, constituencyName: 'Longding-Pumao' },
  { acNo: 26, constituencyName: 'Lumla' },
  { acNo: 27, constituencyName: 'Mariyang-Geku' },
  { acNo: 28, constituencyName: 'Mebo' },
  { acNo: 29, constituencyName: 'Mechuka' },
  { acNo: 30, constituencyName: 'Miao' },
  { acNo: 31, constituencyName: 'Mukto' },
  { acNo: 32, constituencyName: 'Nacho' },
  { acNo: 33, constituencyName: 'Namsai' },
  { acNo: 34, constituencyName: 'Namsang' },
  { acNo: 35, constituencyName: 'Nari-Koyu' },
  { acNo: 36, constituencyName: 'Nyapin' },
  { acNo: 37, constituencyName: 'Pakke-Kasang' },
  { acNo: 38, constituencyName: 'Palin' },
  { acNo: 39, constituencyName: 'Pangin' },
  { acNo: 40, constituencyName: 'Pasighat East' },
  { acNo: 41, constituencyName: 'Pongchao-Wakka' },
  { acNo: 42, constituencyName: 'Raga' },
  { acNo: 43, constituencyName: 'Roing' },
  { acNo: 44, constituencyName: 'Rumgong' },
  { acNo: 45, constituencyName: 'Seppa East' },
  { acNo: 46, constituencyName: 'Seppa West' },
  { acNo: 47, constituencyName: 'Tali' },
  { acNo: 48, constituencyName: 'Taliha' },
  { acNo: 49, constituencyName: 'Tezu' },
  { acNo: 50, constituencyName: 'Thrizino-Buragaon' },
  { acNo: 51, constituencyName: 'Tuting-Yingkiong' },
  { acNo: 52, constituencyName: 'Yachuli' },
  { acNo: 53, constituencyName: 'Ziro-Hapoli' },
];

export function getARConstituencyDemographics(acNo: number): ARDemographics | undefined {
  return AR_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
