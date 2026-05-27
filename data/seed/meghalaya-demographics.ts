/**
 * Meghalaya — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface MLDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const ML_DEMOGRAPHICS: MLDemographics[] = [
  { acNo: 1, constituencyName: 'Amlarem' },
  { acNo: 2, constituencyName: 'Ampati' },
  { acNo: 3, constituencyName: 'Baghmara' },
  { acNo: 4, constituencyName: 'Bajengdoba' },
  { acNo: 5, constituencyName: 'Chokpot' },
  { acNo: 6, constituencyName: 'Dadenggre' },
  { acNo: 7, constituencyName: 'Dalu' },
  { acNo: 8, constituencyName: 'East Shillong' },
  { acNo: 9, constituencyName: 'Jirang' },
  { acNo: 10, constituencyName: 'Jowai' },
  { acNo: 11, constituencyName: 'Kharkutta' },
  { acNo: 12, constituencyName: 'Khliehriat' },
  { acNo: 13, constituencyName: 'Mahendraganj' },
  { acNo: 14, constituencyName: 'Mairang' },
  { acNo: 15, constituencyName: 'Mawhati' },
  { acNo: 16, constituencyName: 'Mawkynrew' },
  { acNo: 17, constituencyName: 'Mawlai' },
  { acNo: 18, constituencyName: 'Mawphlang' },
  { acNo: 19, constituencyName: 'Mawryngkneng' },
  { acNo: 20, constituencyName: 'Mawshynrut' },
  { acNo: 21, constituencyName: 'Mawsynram' },
  { acNo: 22, constituencyName: 'Mawthadraishan' },
  { acNo: 23, constituencyName: 'Mendipathar' },
  { acNo: 24, constituencyName: 'Mowkaiaw' },
  { acNo: 25, constituencyName: 'Nartiang' },
  { acNo: 26, constituencyName: 'Nongkrem' },
  { acNo: 27, constituencyName: 'Nongpoh' },
  { acNo: 28, constituencyName: 'Nongstoin' },
  { acNo: 29, constituencyName: 'Nongthymmai' },
  { acNo: 30, constituencyName: 'North Shillong' },
  { acNo: 31, constituencyName: 'North Tura' },
  { acNo: 32, constituencyName: 'Phulbari' },
  { acNo: 33, constituencyName: 'Pynursla' },
  { acNo: 34, constituencyName: 'Rajabala' },
  { acNo: 35, constituencyName: 'Raksamgre' },
  { acNo: 36, constituencyName: 'Raliang' },
  { acNo: 37, constituencyName: 'Rambrai Jyrngam' },
  { acNo: 38, constituencyName: 'Rangsakona' },
  { acNo: 39, constituencyName: 'Ranikor' },
  { acNo: 40, constituencyName: 'Resubelpara' },
  { acNo: 41, constituencyName: 'Rongjeng' },
  { acNo: 42, constituencyName: 'Salmanpara' },
  { acNo: 43, constituencyName: 'Selsella' },
  { acNo: 44, constituencyName: 'Shella' },
  { acNo: 45, constituencyName: 'Sohra' },
  { acNo: 46, constituencyName: 'Songsak' },
  { acNo: 47, constituencyName: 'South Shillong' },
  { acNo: 48, constituencyName: 'South Tura' },
  { acNo: 49, constituencyName: 'Tikrikilla' },
  { acNo: 50, constituencyName: 'Umroi' },
  { acNo: 51, constituencyName: 'Umsning' },
  { acNo: 52, constituencyName: 'West Shillong' },
  { acNo: 53, constituencyName: 'William Nagar' },
  { acNo: 54, constituencyName: 'Gambegre' },
  { acNo: 55, constituencyName: 'Sohiong' },
];

export function getMLConstituencyDemographics(acNo: number): MLDemographics | undefined {
  return ML_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
