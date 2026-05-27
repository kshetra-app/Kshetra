/**
 * Haryana — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface HRDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const HR_DEMOGRAPHICS: HRDemographics[] = [
  { acNo: 1, constituencyName: 'Adampur' },
  { acNo: 2, constituencyName: 'Ambala Cantt.' },
  { acNo: 3, constituencyName: 'Ambala City' },
  { acNo: 4, constituencyName: 'Assandh' },
  { acNo: 5, constituencyName: 'Ateli' },
  { acNo: 6, constituencyName: 'Badhra' },
  { acNo: 7, constituencyName: 'Badkhal' },
  { acNo: 8, constituencyName: 'Badli' },
  { acNo: 9, constituencyName: 'Bahadurgarh' },
  { acNo: 10, constituencyName: 'Ballabhgarh' },
  { acNo: 11, constituencyName: 'Baroda' },
  { acNo: 12, constituencyName: 'Barwala' },
  { acNo: 13, constituencyName: 'Bawal' },
  { acNo: 14, constituencyName: 'Bawani Khera' },
  { acNo: 15, constituencyName: 'Beri' },
  { acNo: 16, constituencyName: 'Bhiwani' },
  { acNo: 17, constituencyName: 'Dadri' },
  { acNo: 18, constituencyName: 'Ellenabad' },
  { acNo: 19, constituencyName: 'Faridabad' },
  { acNo: 20, constituencyName: 'Faridabad Nit' },
  { acNo: 21, constituencyName: 'Fatehabad' },
  { acNo: 22, constituencyName: 'Ferozepur Jhirka' },
  { acNo: 23, constituencyName: 'Ganaur' },
  { acNo: 24, constituencyName: 'Garhi Sampla-Kiloi' },
  { acNo: 25, constituencyName: 'Gohana' },
  { acNo: 26, constituencyName: 'Guhla' },
  { acNo: 27, constituencyName: 'Gurgaon' },
  { acNo: 28, constituencyName: 'Hansi' },
  { acNo: 29, constituencyName: 'Hathin' },
  { acNo: 30, constituencyName: 'Hisar' },
  { acNo: 31, constituencyName: 'Hodal' },
  { acNo: 32, constituencyName: 'Indri' },
  { acNo: 33, constituencyName: 'Jagadhri' },
  { acNo: 34, constituencyName: 'Jhajjar' },
  { acNo: 35, constituencyName: 'Jind' },
  { acNo: 36, constituencyName: 'Julana' },
  { acNo: 37, constituencyName: 'Kaithal' },
  { acNo: 38, constituencyName: 'Kalanaur' },
  { acNo: 39, constituencyName: 'Kalanwali' },
  { acNo: 40, constituencyName: 'Kalayat' },
  { acNo: 41, constituencyName: 'Karnal' },
  { acNo: 42, constituencyName: 'Kharkhauda' },
  { acNo: 43, constituencyName: 'Kosli' },
  { acNo: 44, constituencyName: 'Ladwa' },
  { acNo: 45, constituencyName: 'Loharu' },
  { acNo: 46, constituencyName: 'Mahendragarh' },
  { acNo: 47, constituencyName: 'Meham' },
  { acNo: 48, constituencyName: 'Mulana' },
  { acNo: 49, constituencyName: 'Nangal Chaudhry' },
  { acNo: 50, constituencyName: 'Naraingarh' },
  { acNo: 51, constituencyName: 'Narnaul' },
  { acNo: 52, constituencyName: 'Narnaund' },
  { acNo: 53, constituencyName: 'Narwana' },
  { acNo: 54, constituencyName: 'Nilokheri' },
  { acNo: 55, constituencyName: 'Nuh' },
  { acNo: 56, constituencyName: 'Palwal' },
  { acNo: 57, constituencyName: 'Panipat City' },
  { acNo: 58, constituencyName: 'Panipat Rural' },
  { acNo: 59, constituencyName: 'Pataudi' },
  { acNo: 60, constituencyName: 'Pehowa' },
  { acNo: 61, constituencyName: 'Prithla' },
  { acNo: 62, constituencyName: 'Punahana' },
  { acNo: 63, constituencyName: 'Pundri' },
  { acNo: 64, constituencyName: 'Radaur' },
  { acNo: 65, constituencyName: 'Rania' },
  { acNo: 66, constituencyName: 'Ratia' },
  { acNo: 67, constituencyName: 'Rewari' },
  { acNo: 68, constituencyName: 'Rohtak' },
  { acNo: 69, constituencyName: 'Sadhaura' },
  { acNo: 70, constituencyName: 'Safidon' },
  { acNo: 71, constituencyName: 'Samalkha' },
  { acNo: 72, constituencyName: 'Shahbad' },
  { acNo: 73, constituencyName: 'Sohna' },
  { acNo: 74, constituencyName: 'Sonipat' },
  { acNo: 75, constituencyName: 'Thanesar' },
  { acNo: 76, constituencyName: 'Tigaon' },
  { acNo: 77, constituencyName: 'Tohana' },
  { acNo: 78, constituencyName: 'Tosham' },
  { acNo: 79, constituencyName: 'Uchana Kalan' },
  { acNo: 80, constituencyName: 'Uklana' },
];

export function getHRConstituencyDemographics(acNo: number): HRDemographics | undefined {
  return HR_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
