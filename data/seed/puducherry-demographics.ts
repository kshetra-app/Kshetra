/**
 * Puducherry — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface PYDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const PY_DEMOGRAPHICS: PYDemographics[] = [
  { acNo: 1, constituencyName: 'Ariankuppam' },
  { acNo: 2, constituencyName: 'Bahour' },
  { acNo: 3, constituencyName: 'Embalam' },
  { acNo: 4, constituencyName: 'Indira Nagar' },
  { acNo: 5, constituencyName: 'Kadirgamam' },
  { acNo: 6, constituencyName: 'Kalapet' },
  { acNo: 7, constituencyName: 'Kamaraj Nagar' },
  { acNo: 8, constituencyName: 'Karaikal North' },
  { acNo: 9, constituencyName: 'Lawspet' },
  { acNo: 10, constituencyName: 'Mahe' },
  { acNo: 11, constituencyName: 'Manavely' },
  { acNo: 12, constituencyName: 'Mangalam' },
  { acNo: 13, constituencyName: 'Mannadipet' },
  { acNo: 14, constituencyName: 'Mudaliarpet' },
  { acNo: 15, constituencyName: 'Muthialpet' },
  { acNo: 16, constituencyName: 'Nedungadu' },
  { acNo: 17, constituencyName: 'Neravy-T.R.Pattinam' },
  { acNo: 18, constituencyName: 'Nettapakkam' },
  { acNo: 19, constituencyName: 'Orleampeth' },
  { acNo: 20, constituencyName: 'Oupalam' },
  { acNo: 21, constituencyName: 'Oussudu' },
  { acNo: 22, constituencyName: 'Ozhukarai' },
  { acNo: 23, constituencyName: 'Raj Bhavan' },
  { acNo: 24, constituencyName: 'Thattanchavady' },
  { acNo: 25, constituencyName: 'Thirunallar' },
  { acNo: 26, constituencyName: 'Villianur' },
  { acNo: 27, constituencyName: 'Yanam' },
];

export function getPYConstituencyDemographics(acNo: number): PYDemographics | undefined {
  return PY_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
