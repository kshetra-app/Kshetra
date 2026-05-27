/**
 * Jharkhand — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface JHDemographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const JH_DEMOGRAPHICS: JHDemographics[] = [
  { acNo: 1, constituencyName: 'Baghmara' },
  { acNo: 2, constituencyName: 'Bagodar' },
  { acNo: 3, constituencyName: 'Baharagora' },
  { acNo: 4, constituencyName: 'Barhait' },
  { acNo: 5, constituencyName: 'Barhi' },
  { acNo: 6, constituencyName: 'Barkagaon' },
  { acNo: 7, constituencyName: 'Barkatha' },
  { acNo: 8, constituencyName: 'Bhawanathpur' },
  { acNo: 9, constituencyName: 'Bishunpur' },
  { acNo: 10, constituencyName: 'Bokaro' },
  { acNo: 11, constituencyName: 'Borio' },
  { acNo: 12, constituencyName: 'Chaibasa' },
  { acNo: 13, constituencyName: 'Chakradharpur' },
  { acNo: 14, constituencyName: 'Chandankiyari' },
  { acNo: 15, constituencyName: 'Chatra' },
  { acNo: 16, constituencyName: 'Chhatarpur' },
  { acNo: 17, constituencyName: 'Deoghar' },
  { acNo: 18, constituencyName: 'Dhanbad' },
  { acNo: 19, constituencyName: 'Dhanwar' },
  { acNo: 20, constituencyName: 'Dumka' },
  { acNo: 21, constituencyName: 'Dumri' },
  { acNo: 22, constituencyName: 'Gandey' },
  { acNo: 23, constituencyName: 'Garhwa' },
  { acNo: 24, constituencyName: 'Ghatsila' },
  { acNo: 25, constituencyName: 'Godda' },
  { acNo: 26, constituencyName: 'Gomia' },
  { acNo: 27, constituencyName: 'Gumla' },
  { acNo: 28, constituencyName: 'Hatia' },
  { acNo: 29, constituencyName: 'Hazaribagh' },
  { acNo: 30, constituencyName: 'Hussainabad' },
  { acNo: 31, constituencyName: 'Ichagarh' },
  { acNo: 32, constituencyName: 'Jaganathpur' },
  { acNo: 33, constituencyName: 'Jamshedpur East' },
  { acNo: 34, constituencyName: 'Jamshedpur West' },
  { acNo: 35, constituencyName: 'Jamtara' },
  { acNo: 36, constituencyName: 'Jamua' },
  { acNo: 37, constituencyName: 'Jarmundi' },
  { acNo: 38, constituencyName: 'Jharia' },
  { acNo: 39, constituencyName: 'Jugsalai' },
  { acNo: 40, constituencyName: 'Kanke' },
  { acNo: 41, constituencyName: 'Khijri' },
  { acNo: 42, constituencyName: 'Khunti' },
  { acNo: 43, constituencyName: 'Kodarma' },
  { acNo: 44, constituencyName: 'Kolebira' },
  { acNo: 45, constituencyName: 'Latehar' },
  { acNo: 46, constituencyName: 'Litipara' },
  { acNo: 47, constituencyName: 'Lohardaga' },
  { acNo: 48, constituencyName: 'Madhupur' },
  { acNo: 49, constituencyName: 'Maheshpur' },
  { acNo: 50, constituencyName: 'Majhgaon' },
  { acNo: 51, constituencyName: 'Mandar' },
  { acNo: 52, constituencyName: 'Mandu' },
  { acNo: 53, constituencyName: 'Manika' },
  { acNo: 54, constituencyName: 'Manoharpur' },
  { acNo: 55, constituencyName: 'Nala' },
  { acNo: 56, constituencyName: 'Nirsa' },
  { acNo: 57, constituencyName: 'Panki' },
  { acNo: 58, constituencyName: 'Poreyahat' },
  { acNo: 59, constituencyName: 'Potka' },
  { acNo: 60, constituencyName: 'Rajmahal' },
  { acNo: 61, constituencyName: 'Ramgarh' },
  { acNo: 62, constituencyName: 'Ranchi' },
  { acNo: 63, constituencyName: 'Sarath' },
  { acNo: 64, constituencyName: 'Seraikella' },
  { acNo: 65, constituencyName: 'Silli' },
  { acNo: 66, constituencyName: 'Simaria' },
  { acNo: 67, constituencyName: 'Simdega' },
  { acNo: 68, constituencyName: 'Sindri' },
  { acNo: 69, constituencyName: 'Sisai' },
  { acNo: 70, constituencyName: 'Tamar' },
  { acNo: 71, constituencyName: 'Torpa' },
  { acNo: 72, constituencyName: 'Tundi' },
  { acNo: 73, constituencyName: 'Ghatsila' },
];

export function getJHConstituencyDemographics(acNo: number): JHDemographics | undefined {
  return JH_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
