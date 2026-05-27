/**
 * Nagaland — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface NLDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const NL_DEMOGRAPHICS: NLDemographics[] = [
  { acNo: 1, constituencyName: 'Aboi' },
  { acNo: 2, constituencyName: 'Aghunato' },
  { acNo: 3, constituencyName: 'Akuluto' },
  { acNo: 4, constituencyName: 'Alongtaki' },
  { acNo: 5, constituencyName: 'Angetyongpang' },
  { acNo: 6, constituencyName: 'Aonglenden' },
  { acNo: 7, constituencyName: 'Arkakong' },
  { acNo: 8, constituencyName: 'Atoizu' },
  { acNo: 9, constituencyName: 'Chazouba' },
  { acNo: 10, constituencyName: 'Chizami' },
  { acNo: 11, constituencyName: 'Dimapur-I' },
  { acNo: 12, constituencyName: 'Dimapur-Ii' },
  { acNo: 13, constituencyName: 'Dimapur-Iii' },
  { acNo: 14, constituencyName: 'Ghaspani-I' },
  { acNo: 15, constituencyName: 'Ghaspani-Ii' },
  { acNo: 16, constituencyName: 'Impur' },
  { acNo: 17, constituencyName: 'Kohima Town' },
  { acNo: 18, constituencyName: 'Koridang' },
  { acNo: 19, constituencyName: 'Longkhim Chare' },
  { acNo: 20, constituencyName: 'Longleng' },
  { acNo: 21, constituencyName: 'Meluri' },
  { acNo: 22, constituencyName: 'Moka' },
  { acNo: 23, constituencyName: 'Mokokchung Town' },
  { acNo: 24, constituencyName: 'Mongoya' },
  { acNo: 25, constituencyName: 'Noklak' },
  { acNo: 26, constituencyName: 'Noksen' },
  { acNo: 27, constituencyName: 'Northern Angami-I' },
  { acNo: 28, constituencyName: 'Northern Angami-Ii' },
  { acNo: 29, constituencyName: 'Peren' },
  { acNo: 30, constituencyName: 'Pfutsero' },
  { acNo: 31, constituencyName: 'Phek' },
  { acNo: 32, constituencyName: 'Pughoboto' },
  { acNo: 33, constituencyName: 'Pungro Kiphire' },
  { acNo: 34, constituencyName: 'Sanis' },
  { acNo: 35, constituencyName: 'Satakha' },
  { acNo: 36, constituencyName: 'Seyochung Sitimi' },
  { acNo: 37, constituencyName: 'Shamator Chessore' },
  { acNo: 38, constituencyName: 'Southern Angami-I' },
  { acNo: 39, constituencyName: 'Southern Angami-Ii' },
  { acNo: 40, constituencyName: 'Tamlu' },
  { acNo: 41, constituencyName: 'Tapi' },
  { acNo: 42, constituencyName: 'Tehok' },
  { acNo: 43, constituencyName: 'Tenning' },
  { acNo: 44, constituencyName: 'Thonoknyu' },
  { acNo: 45, constituencyName: 'Tizit' },
  { acNo: 46, constituencyName: 'Tobu' },
  { acNo: 47, constituencyName: 'Tseminyu' },
  { acNo: 48, constituencyName: 'Tuensang Sadar-Ii' },
  { acNo: 49, constituencyName: 'Tuli' },
  { acNo: 50, constituencyName: 'Tyui' },
  { acNo: 51, constituencyName: 'Wakching' },
  { acNo: 52, constituencyName: 'Western Angami' },
  { acNo: 53, constituencyName: 'Wokha' },
  { acNo: 54, constituencyName: 'Zunheboto' },
  { acNo: 55, constituencyName: 'Tapi' },
];

export function getNLConstituencyDemographics(acNo: number): NLDemographics | undefined {
  return NL_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
