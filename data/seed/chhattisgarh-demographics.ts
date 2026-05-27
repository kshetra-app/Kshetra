/**
 * Chhattisgarh — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface CGDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const CG_DEMOGRAPHICS: CGDemographics[] = [
  { acNo: 1, constituencyName: 'Abhanpur' },
  { acNo: 2, constituencyName: 'Ahiwara' },
  { acNo: 3, constituencyName: 'Akaltara' },
  { acNo: 4, constituencyName: 'Ambikapur' },
  { acNo: 5, constituencyName: 'Antagarh' },
  { acNo: 6, constituencyName: 'Arang' },
  { acNo: 7, constituencyName: 'Baikunthpur' },
  { acNo: 8, constituencyName: 'Baloda Bazar' },
  { acNo: 9, constituencyName: 'Bastar' },
  { acNo: 10, constituencyName: 'Beltara' },
  { acNo: 11, constituencyName: 'Bemetara' },
  { acNo: 12, constituencyName: 'Bhanupratappur' },
  { acNo: 13, constituencyName: 'Bharatpur-Sonhat' },
  { acNo: 14, constituencyName: 'Bhatapara' },
  { acNo: 15, constituencyName: 'Bhatgaon' },
  { acNo: 16, constituencyName: 'Bhilai Nagar' },
  { acNo: 17, constituencyName: 'Bilaigarh' },
  { acNo: 18, constituencyName: 'Bilaspur' },
  { acNo: 19, constituencyName: 'Bilha' },
  { acNo: 20, constituencyName: 'Bindranawagarh' },
  { acNo: 21, constituencyName: 'Chandrapur' },
  { acNo: 22, constituencyName: 'Chitrakot' },
  { acNo: 23, constituencyName: 'Dantewada' },
  { acNo: 24, constituencyName: 'Dhamtari' },
  { acNo: 25, constituencyName: 'Dharsiwa' },
  { acNo: 26, constituencyName: 'Dondi Lohara' },
  { acNo: 27, constituencyName: 'Dongargaon' },
  { acNo: 28, constituencyName: 'Dongargarh' },
  { acNo: 29, constituencyName: 'Durg City' },
  { acNo: 30, constituencyName: 'Durg-Rural' },
  { acNo: 31, constituencyName: 'Gunderdehi' },
  { acNo: 32, constituencyName: 'Jagdalpur' },
  { acNo: 33, constituencyName: 'Janjgir-Champa' },
  { acNo: 34, constituencyName: 'Jashpur' },
  { acNo: 35, constituencyName: 'Kanker' },
  { acNo: 36, constituencyName: 'Kasdol' },
  { acNo: 37, constituencyName: 'Katghora' },
  { acNo: 38, constituencyName: 'Kawardha' },
  { acNo: 39, constituencyName: 'Keshkal' },
  { acNo: 40, constituencyName: 'Khairagarh' },
  { acNo: 41, constituencyName: 'Kharsia' },
  { acNo: 42, constituencyName: 'Khujji' },
  { acNo: 43, constituencyName: 'Kondagaon' },
  { acNo: 44, constituencyName: 'Konta' },
  { acNo: 45, constituencyName: 'Korba' },
  { acNo: 46, constituencyName: 'Kota' },
  { acNo: 47, constituencyName: 'Kunkuri' },
  { acNo: 48, constituencyName: 'Kurud' },
  { acNo: 49, constituencyName: 'Lormi' },
  { acNo: 50, constituencyName: 'Lundra' },
  { acNo: 51, constituencyName: 'Mahasamund' },
  { acNo: 52, constituencyName: 'Manendragarh' },
  { acNo: 53, constituencyName: 'Marwahi' },
  { acNo: 54, constituencyName: 'Masturi' },
  { acNo: 55, constituencyName: 'Mohla-Manpur' },
  { acNo: 56, constituencyName: 'Mungeli' },
  { acNo: 57, constituencyName: 'Nawagarh' },
  { acNo: 58, constituencyName: 'Pali-Tanakhar' },
  { acNo: 59, constituencyName: 'Pamgarh' },
  { acNo: 60, constituencyName: 'Pandariya' },
  { acNo: 61, constituencyName: 'Patan' },
  { acNo: 62, constituencyName: 'Pathalgaon' },
  { acNo: 63, constituencyName: 'Pratappur' },
  { acNo: 64, constituencyName: 'Premnagar' },
  { acNo: 65, constituencyName: 'Raipur City North' },
  { acNo: 66, constituencyName: 'Raipur City South' },
  { acNo: 67, constituencyName: 'Raipur City West' },
  { acNo: 68, constituencyName: 'Raipur Rural' },
  { acNo: 69, constituencyName: 'Rajim' },
  { acNo: 70, constituencyName: 'Rajnandgaon' },
  { acNo: 71, constituencyName: 'Ramanujganj' },
  { acNo: 72, constituencyName: 'Rampur' },
  { acNo: 73, constituencyName: 'Sakti' },
  { acNo: 74, constituencyName: 'Samri' },
  { acNo: 75, constituencyName: 'Sanjari Balod' },
  { acNo: 76, constituencyName: 'Saraipali' },
  { acNo: 77, constituencyName: 'Sarangarh' },
  { acNo: 78, constituencyName: 'Sihawa' },
  { acNo: 79, constituencyName: 'Sitapur' },
  { acNo: 80, constituencyName: 'Takhatpur' },
  { acNo: 81, constituencyName: 'Raipur City South : Bye Election On 13-11-2024' },
];

export function getCGConstituencyDemographics(acNo: number): CGDemographics | undefined {
  return CG_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
