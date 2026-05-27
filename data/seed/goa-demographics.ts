/**
 * Goa — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface GADemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const GA_DEMOGRAPHICS: GADemographics[] = [
  { acNo: 1, constituencyName: 'Aldona' },
  { acNo: 2, constituencyName: 'Benaulim' },
  { acNo: 3, constituencyName: 'Bicholim' },
  { acNo: 4, constituencyName: 'Calangute' },
  { acNo: 5, constituencyName: 'Canacona' },
  { acNo: 6, constituencyName: 'Cortalim' },
  { acNo: 7, constituencyName: 'Cumbarjua' },
  { acNo: 8, constituencyName: 'Cuncolim' },
  { acNo: 9, constituencyName: 'Dabolim' },
  { acNo: 10, constituencyName: 'Fatorda' },
  { acNo: 11, constituencyName: 'Maem' },
  { acNo: 12, constituencyName: 'Mandrem' },
  { acNo: 13, constituencyName: 'Mapusa' },
  { acNo: 14, constituencyName: 'Marcaim' },
  { acNo: 15, constituencyName: 'Margao' },
  { acNo: 16, constituencyName: 'Mormugao' },
  { acNo: 17, constituencyName: 'Nuvem' },
  { acNo: 18, constituencyName: 'Panaji' },
  { acNo: 19, constituencyName: 'Pernem' },
  { acNo: 20, constituencyName: 'Ponda' },
  { acNo: 21, constituencyName: 'Poriem' },
  { acNo: 22, constituencyName: 'Porvorim' },
  { acNo: 23, constituencyName: 'Priol' },
  { acNo: 24, constituencyName: 'Quepem' },
  { acNo: 25, constituencyName: 'Sanguem' },
  { acNo: 26, constituencyName: 'Sanquelim' },
  { acNo: 27, constituencyName: 'Sanvordem' },
  { acNo: 28, constituencyName: 'Siolim' },
  { acNo: 29, constituencyName: 'Siroda' },
  { acNo: 30, constituencyName: 'St. Andre' },
  { acNo: 31, constituencyName: 'St. Cruz' },
  { acNo: 32, constituencyName: 'Taleigao' },
  { acNo: 33, constituencyName: 'Valpoi' },
  { acNo: 34, constituencyName: 'Velim' },
];

export function getGAConstituencyDemographics(acNo: number): GADemographics | undefined {
  return GA_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
