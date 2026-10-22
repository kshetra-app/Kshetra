/**
 * Nagaland — Previous Election Results (2018)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2018.
 *         Full per-constituency winner + party, official AC numbering 1-60.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface NLHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const NL_2018_RESULTS: NLHistoricalResult[] = [
  { acNo: 1, name: 'Dimapur-I', winner: 'H. Tovihoto Ayemi', party: 'BJP', year: 2018, votes: 11721, margin: 6600, runnerUp: 'Pukhavi Yepthomi' },
  { acNo: 2, name: 'Dimapur-Ii', winner: 'Moatoshi Longkumer', party: 'NPF', year: 2018, votes: 21942, margin: 6939, runnerUp: 'Supulebten' },
  { acNo: 3, name: 'Dimapur-Iii', winner: 'Azheto Zhimomi', party: 'NPF', year: 2018, votes: 13162, margin: 2138, runnerUp: 'Tokheho' },
  { acNo: 4, name: 'Ghaspani-I', winner: 'N. Jacob Zhimomi', party: 'BJP', year: 2018, votes: 23391, margin: 2595, runnerUp: 'Z. Kasheto Yeptho' },
  { acNo: 5, name: 'Ghaspani-Ii', winner: 'Zhaleo Rio', party: 'NDPP', year: 2018, votes: 10939, margin: 4916, runnerUp: 'Dr. Kevingulie Khro' },
  { acNo: 6, name: 'Tenning', winner: 'Namri Nchang', party: 'NDPP', year: 2018, votes: 7018, margin: 168, runnerUp: 'Namduadi Rangkau Zeliang' },
  { acNo: 7, name: 'Peren', winner: 'Taditui Rangkau Zeliang', party: 'NPF', year: 2018, votes: 14064, margin: 5432, runnerUp: 'Iherie Ndang' },
  { acNo: 8, name: 'Western Angami', winner: 'Keneizhakho Nakhro', party: 'NPF', year: 2018, votes: 6516, margin: 694, runnerUp: 'Er.Kevisekho Kruse' },
  { acNo: 9, name: 'Kohima Town', winner: 'Dr.Neikiesalie Nicky Kire', party: 'NDPP', year: 2018, votes: 12605, margin: 2372, runnerUp: 'Dr.Tseilhoutuo Rhutso' },
  { acNo: 10, name: 'Northern Angami-I', winner: 'Khriehu Liezietsu', party: 'NPF', year: 2018, votes: 7782, margin: 2516, runnerUp: 'Dr.Kekhrielhoulie Yhome' },
  { acNo: 11, name: 'Northern Angami-Ii', winner: 'Neiphiu Rio', party: 'NDPP', year: 2018, votes: 1, margin: 1, runnerUp: 'None of the Above' },
  { acNo: 12, name: 'Tseminyu', winner: 'R. Khing', party: 'NDPP', year: 2018, votes: 7925, margin: 863, runnerUp: 'Er. Levi Rengma' },
  { acNo: 13, name: 'Pughoboto', winner: 'Y. Vikheho Swu', party: 'NPF', year: 2018, votes: 6258, margin: 70, runnerUp: 'Dr. Sukhato A. Sema' },
  { acNo: 14, name: 'Southern Angami-I', winner: 'Vikho-O Yhoshü', party: 'NDPP', year: 2018, votes: 5821, margin: 2082, runnerUp: 'Medokul Sophie' },
  { acNo: 15, name: 'Southern Angami-Ii', winner: 'Zale Neikha', party: 'NDPP', year: 2018, votes: 7563, margin: 771, runnerUp: 'Er. Kropol Vitsu' },
  { acNo: 16, name: 'Pfutsero', winner: 'Neiba Kronu', party: 'NDPP', year: 2018, votes: 6228, margin: 1314, runnerUp: 'Thenucho' },
  { acNo: 17, name: 'Chizami', winner: 'Kezhienyi Khalo', party: 'NPF', year: 2018, votes: 6563, margin: 403, runnerUp: 'Kevechutso Doulo' },
  { acNo: 18, name: 'Chazouba', winner: 'Chotisuh Sazo', party: 'NPF', year: 2018, votes: 11432, margin: 942, runnerUp: 'Kudecho Khamo' },
  { acNo: 19, name: 'Phek', winner: 'Kuzholuzo Nienu', party: 'NPF', year: 2018, votes: 11127, margin: 4931, runnerUp: 'Kupota Khesoh' },
  { acNo: 20, name: 'Meluri', winner: 'Yitachu', party: 'NPF', year: 2018, votes: 7928, margin: 74, runnerUp: 'Z Nyusietho Nyuthe' },
  { acNo: 21, name: 'Tuli', winner: 'Amenba Yaden', party: 'NPF', year: 2018, votes: 3865, margin: 886, runnerUp: 'L. Temjen Jamir' },
  { acNo: 22, name: 'Arkakong', winner: 'Shri Imnatiba', party: 'NPEP', year: 2018, votes: 6307, margin: 793, runnerUp: 'Shri Nuklutoshi' },
  { acNo: 23, name: 'Impur', winner: 'Dr Imtiwapang Aier', party: 'NPF', year: 2018, votes: 4852, margin: 62, runnerUp: 'T N Mannen' },
  { acNo: 24, name: 'Angetyongpang', winner: 'Tongpang Ozukum', party: 'IND', year: 2018, votes: 4607, margin: 950, runnerUp: 'Alemtemshi Jamir' },
  { acNo: 25, name: 'Mongoya', winner: 'Ngangshi K Ao', party: 'NPF', year: 2018, votes: 6883, margin: 348, runnerUp: 'Alemtemshi Jamir' },
  { acNo: 26, name: 'Aonglenden', winner: 'Imtikumzuk', party: 'NDPP', year: 2018, votes: 5206, margin: 88, runnerUp: 'Toshipokba' },
  { acNo: 27, name: 'Mokokchung Town', winner: 'Metsubo Jamir', party: 'NDPP', year: 2018, votes: 2964, margin: 1004, runnerUp: 'C. Apok Jamir' },
  { acNo: 28, name: 'Koridang', winner: 'Imkong L Imchen', party: 'NPF', year: 2018, votes: 7525, margin: 128, runnerUp: 'T Chalukumba Ao' },
  { acNo: 29, name: 'Jangpetkong', winner: 'Longrineken', party: 'BJP', year: 2018, votes: 3615, margin: 276, runnerUp: 'E.T Sunup' },
  { acNo: 30, name: 'Alongtaki', winner: 'Temjen Imna Along', party: 'BJP', year: 2018, votes: 5981, margin: 86, runnerUp: 'Dr. Benjongliba Aier' },
  { acNo: 31, name: 'Akuluto', winner: 'Kazheto Kinimi', party: 'BJP', year: 2018, votes: 4844, margin: 735, runnerUp: 'K Khekaho Assumi' },
  { acNo: 32, name: 'Atoizu', winner: 'Picto', party: 'NPF', year: 2018, votes: 7643, margin: 838, runnerUp: 'K.L.Chishi' },
  { acNo: 33, name: 'Suruhoto', winner: 'H Khehovi', party: 'BJP', year: 2018, votes: 10860, margin: 8559, runnerUp: 'Dr. Kaito Jakhalu' },
  { acNo: 34, name: 'Aghunato', winner: 'Pukhayi', party: 'NDPP', year: 2018, votes: 6399, margin: 1421, runnerUp: 'Hukiye N Tissica' },
  { acNo: 35, name: 'Zunheboto', winner: 'K. Tokugha Sukhalu', party: 'NDPP', year: 2018, votes: 9430, margin: 2548, runnerUp: 'Hukavi Zhimomi' },
  { acNo: 36, name: 'Satakha', winner: 'G. Kaito Aye', party: 'JDU', year: 2018, votes: 6431, margin: 2543, runnerUp: 'Zheito Chophy' },
  { acNo: 37, name: 'Tyui', winner: 'Yanthungo Patton', party: 'BJP', year: 2018, votes: 11709, margin: 3092, runnerUp: 'Yankithung Yanthan' },
  { acNo: 38, name: 'Wokha', winner: 'Dr. Chumben Murry', party: 'NPF', year: 2018, votes: 14870, margin: 8555, runnerUp: 'Y. Mhonbemo Humtsoe' },
  { acNo: 39, name: 'Sanis', winner: 'Mhathung Yanthan', party: 'NDPP', year: 2018, votes: 10548, margin: 2992, runnerUp: 'Ramongo Lotha' },
  { acNo: 40, name: 'Bhandari', winner: 'Mmhonlumo Kikon', party: 'BJP', year: 2018, votes: 11205, margin: 312, runnerUp: 'Achumbemo Kikon' },
  { acNo: 41, name: 'Tizit', winner: 'P. Paiwang Konyak', party: 'BJP', year: 2018, votes: 6981, margin: 2386, runnerUp: 'Y. Wangto Konyak' },
  { acNo: 42, name: 'Wakching', winner: 'Shri. Y.M.Yollow Konyak', party: 'NPF', year: 2018, votes: 7808, margin: 1764, runnerUp: 'Shri. M.C.Konyak' },
  { acNo: 43, name: 'Tapi', winner: 'Noke', party: 'NDPP', year: 2018, votes: 4284, margin: 1237, runnerUp: 'N.Aphoa Konyak' },
  { acNo: 44, name: 'Phomching', winner: 'Pohwang Konyak', party: 'NDPP', year: 2018, votes: 6611, margin: 632, runnerUp: 'K. Konngam Konyak' },
  { acNo: 45, name: 'Tehok', winner: 'C.L John', party: 'NPF', year: 2018, votes: 7463, margin: 4556, runnerUp: 'Er C Kawang Konyak' },
  { acNo: 46, name: 'Mon Town', winner: 'N. Thongwang Konyak', party: 'NPF', year: 2018, votes: 5429, margin: 28, runnerUp: 'Y. Mankhao Konyak' },
  { acNo: 47, name: 'Aboi', winner: 'Eshak Konyak', party: 'NPF', year: 2018, votes: 6036, margin: 905, runnerUp: 'Awan Konyak' },
  { acNo: 48, name: 'Moka', winner: 'E. E. Pangteang', party: 'NPF', year: 2018, votes: 7684, margin: 148, runnerUp: 'K. Kiko Konyak' },
  { acNo: 49, name: 'Tamlu', winner: 'B. S. Nganlang Phom', party: 'NPF', year: 2018, votes: 6582, margin: 958, runnerUp: 'B. Phongshak Phom' },
  { acNo: 50, name: 'Longleng', winner: 'S Pangnyu Phom', party: 'BJP', year: 2018, votes: 9987, margin: 1006, runnerUp: 'Y. B Angam Phom' },
  { acNo: 51, name: 'Noksen', winner: 'C.M. Chang', party: 'NDPP', year: 2018, votes: 4436, margin: 576, runnerUp: 'W.Chingmak Chang' },
  { acNo: 52, name: 'Longkhim Chare', winner: 'Muthingnyuba Sangtam', party: 'NPF', year: 2018, votes: 9316, margin: 1848, runnerUp: 'A. Imtilemba Sangtam' },
  { acNo: 53, name: 'Tuensang Sadar-I', winner: 'Toyang Chang', party: 'NPF', year: 2018, votes: 10087, margin: 3259, runnerUp: 'T.Mongko Chang' },
  { acNo: 54, name: 'Tuensang Sadar-Ii', winner: 'Kejong Chang', party: 'NPF', year: 2018, votes: 6204, margin: 1799, runnerUp: 'H Zungkum Chang' },
  { acNo: 55, name: 'Tobu', winner: 'N. Bongkhao Konyak', party: 'NDPP', year: 2018, votes: 9732, margin: 1741, runnerUp: 'Naiba Konyak' },
  { acNo: 56, name: 'Noklak', winner: 'H. Haiying', party: 'BJP', year: 2018, votes: 5643, margin: 5, runnerUp: 'P. Longon' },
  { acNo: 57, name: 'Thonoknyu', winner: 'L.Khumo Khiamniungan', party: 'NPEP', year: 2018, votes: 8389, margin: 4044, runnerUp: 'S.Heno Khiamniungan' },
  { acNo: 58, name: 'Shamator Chessore', winner: 'Toshi Wungtung', party: 'NDPP', year: 2018, votes: 4311, margin: 307, runnerUp: 'R. Tohanba' },
  { acNo: 59, name: 'Seyochung Sitimi', winner: 'V. Kashiho Sangtam', party: 'BJP', year: 2018, votes: 9830, margin: 1162, runnerUp: 'C Kipili Sangtam' },
  { acNo: 60, name: 'Pungro Kiphire', winner: 'T. Torechu', party: 'NPF', year: 2018, votes: 8056, margin: 473, runnerUp: 'T.Yangseo Sangtam' },
];

export const nl2018Map = new Map(NL_2018_RESULTS.map((r) => [r.acNo, r]));

export function getNL2018Result(acNo: number): NLHistoricalResult | undefined {
  return nl2018Map.get(acNo);
}
