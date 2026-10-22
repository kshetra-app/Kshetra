/**
 * Manipur — Previous Election Results (2017)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2017.
 *         Full per-constituency winner + party, official AC numbering 1-60.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface MNHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const MN_2017_RESULTS: MNHistoricalResult[] = [
  { acNo: 1, name: 'Khundrakpam', winner: 'Thokchom Lokeshwar Singh', party: 'INC', year: 2017, votes: 12849, margin: 3059, runnerUp: 'Thangjam Mohendro Singh' },
  { acNo: 2, name: 'Heingang', winner: 'Nongthombam Biren Singh', party: 'BJP', year: 2017, votes: 10439, margin: 1206, runnerUp: 'Pangeijam Saratchandra Singh' },
  { acNo: 3, name: 'Khurai', winner: 'Leishangthem Susindro Meitei', party: 'BJP', year: 2017, votes: 15005, margin: 1944, runnerUp: 'Dr. Ngairangbam Bijoy Singh' },
  { acNo: 4, name: 'Kshetrigao', winner: 'Nahakpam Indrajit Singh', party: 'BJP', year: 2017, votes: 10411, margin: 380, runnerUp: 'Md. Amin Shah' },
  { acNo: 5, name: 'Thongju', winner: 'Thongam Biswajit Singh', party: 'BJP', year: 2017, votes: 16809, margin: 7301, runnerUp: 'Thokchom Ajit Singh' },
  { acNo: 6, name: 'Keirao', winner: 'Lourembam Rameshwor Meetei', party: 'BJP', year: 2017, votes: 5959, margin: 538, runnerUp: 'Md. Nasiruddin Khan' },
  { acNo: 7, name: 'Andro', winner: 'Thounaojam Shyamkumar', party: 'INC', year: 2017, votes: 18761, margin: 7986, runnerUp: 'Dr. Nimaichand Luwang' },
  { acNo: 8, name: 'Lamlai', winner: 'Ksh. Biren Singh', party: 'INC', year: 2017, votes: 12339, margin: 852, runnerUp: 'Khongbantabam Ibomcha' },
  { acNo: 9, name: 'Thangmeiband', winner: 'Khumukcham Joykisan Singh', party: 'INC', year: 2017, votes: 11596, margin: 157, runnerUp: 'Jyotin Waikhom' },
  { acNo: 10, name: 'Uripok', winner: 'Yumnam Joykumar Singh', party: 'NPEP', year: 2017, votes: 6469, margin: 345, runnerUp: 'Laishram Nandakumar Singh' },
  { acNo: 11, name: 'Sagolband', winner: 'Rajkumar Imo Singh', party: 'INC', year: 2017, votes: 9211, margin: 19, runnerUp: 'Dr. Khwairakpam Loken Singh' },
  { acNo: 12, name: 'Keishamthong', winner: 'Langpoklakpam Jayantakumar Singh', party: 'NPEP', year: 2017, votes: 10000, margin: 3261, runnerUp: 'Laisom Ibomcha Singh' },
  { acNo: 13, name: 'Singjamei', winner: 'Yumnam Khemchand Singh', party: 'BJP', year: 2017, votes: 9459, margin: 1834, runnerUp: 'Irengbam Hemochandra Singh' },
  { acNo: 14, name: 'Yaiskul', winner: 'Thokchom Satyabrata Singh', party: 'BJP', year: 2017, votes: 8014, margin: 570, runnerUp: 'Elangbam Chand Singh' },
  { acNo: 15, name: 'Wangkhei', winner: 'Okram Henry Singh', party: 'INC', year: 2017, votes: 16753, margin: 4336, runnerUp: 'Yumkham Erabot Singh' },
  { acNo: 16, name: 'Sekmai', winner: 'Heikham Dingo Singh', party: 'BJP', year: 2017, votes: 13163, margin: 2532, runnerUp: 'Khwairakpam Devendro Singh' },
  { acNo: 17, name: 'Lamsang', winner: 'Sorokhaibam Rajen Singh', party: 'BJP', year: 2017, votes: 12593, margin: 1280, runnerUp: 'Wangkheimayum Brajabidhu Singh' },
  { acNo: 18, name: 'Konthoujam', winner: 'Dr. Sapam Ranjan Singh', party: 'BJP', year: 2017, votes: 14313, margin: 2772, runnerUp: 'Konthoujam Sharat Singh' },
  { acNo: 19, name: 'Patsoi', winner: 'Km. Ak. Mirabai Devi', party: 'INC', year: 2017, votes: 13405, margin: 114, runnerUp: 'Sapam Kunjakeswor (Keba) Singh' },
  { acNo: 20, name: 'Langthabal', winner: 'Karam Shyam', party: 'LJP', year: 2017, votes: 9625, margin: 2331, runnerUp: 'O. Joy Singh' },
  { acNo: 21, name: 'Naoriya Pakhanglakpa', winner: 'Soibam Subhaschandra Singh', party: 'BJP', year: 2017, votes: 8609, margin: 1615, runnerUp: 'R.K. Anand' },
  { acNo: 22, name: 'Wangoi', winner: 'Oinam Lukhoi Singh', party: 'INC', year: 2017, votes: 7443, margin: 36, runnerUp: 'Khuraijam Loken Singh' },
  { acNo: 23, name: 'Mayang Imphal', winner: 'Kongkham Robindro Singh', party: 'BJP', year: 2017, votes: 15221, margin: 3094, runnerUp: 'Dr. Khumujam Ratankumar Singh' },
  { acNo: 24, name: 'Nambol', winner: 'Nameirakpam Loken Singh', party: 'INC', year: 2017, votes: 14736, margin: 280, runnerUp: 'Thounaojam Chaoba' },
  { acNo: 25, name: 'Oinam', winner: 'Laishram Radhakishore Singh', party: 'BJP', year: 2017, votes: 12029, margin: 843, runnerUp: 'Dr. Irengbam Ibohalbi Singh' },
  { acNo: 26, name: 'Bishnupur', winner: 'Konthoujam Govindas', party: 'INC', year: 2017, votes: 14150, margin: 5278, runnerUp: 'Konthoujam Krishna Kumar Singh' },
  { acNo: 27, name: 'Moirang', winner: 'Pukhrem Sharatchandra Singh', party: 'BJP', year: 2017, votes: 11708, margin: 375, runnerUp: 'Mairembam Prithviraj Singh' },
  { acNo: 28, name: 'Thanga', winner: 'Tongbram Robindro Singh', party: 'AITC', year: 2017, votes: 6462, margin: 1005, runnerUp: 'Moirangthem Asnikumar Singh' },
  { acNo: 29, name: 'Kumbi', winner: 'Sanasam Bira Singh', party: 'INC', year: 2017, votes: 11881, margin: 1311, runnerUp: 'Ningthoujam Mangi' },
  { acNo: 30, name: 'Lilong', winner: 'Muhammad Abdul Nasir', party: 'INC', year: 2017, votes: 10765, margin: 1268, runnerUp: 'Y. Antas Khan' },
  { acNo: 31, name: 'Thoubal', winner: 'Okram Ibobi Singh', party: 'INC', year: 2017, votes: 18649, margin: 10470, runnerUp: 'Leitanthem Basanta Singh' },
  { acNo: 32, name: 'Wangkhem', winner: 'Keisham Meghachandra Singh', party: 'INC', year: 2017, votes: 11293, margin: 2880, runnerUp: 'Yumnam Nabachandra Singh' },
  { acNo: 33, name: 'Heirok', winner: 'Thokchom Radheshyam Singh', party: 'BJP', year: 2017, votes: 13389, margin: 1647, runnerUp: 'Moirangthem Okendro' },
  { acNo: 34, name: 'Wangjing Tentha', winner: 'Paonam Brojen Singh', party: 'INC', year: 2017, votes: 12830, margin: 1863, runnerUp: 'Moirangthem Hemanta' },
  { acNo: 35, name: 'Khangabok', winner: 'Surjakumar Okram', party: 'INC', year: 2017, votes: 20781, margin: 9452, runnerUp: 'Thokchom Jadumani Singh' },
  { acNo: 36, name: 'Wabgai', winner: 'Md. Fajur Rahim', party: 'INC', year: 2017, votes: 12474, margin: 4761, runnerUp: 'Dr. Usham Deben Singh' },
  { acNo: 37, name: 'Kakching', winner: 'Yengkhom Surchandra Singh', party: 'INC', year: 2017, votes: 11133, margin: 630, runnerUp: 'M. Rameshwar Singh (Ramay)' },
  { acNo: 38, name: 'Hiyanglam', winner: 'Dr. Radheshyam Yumnam', party: 'BJP', year: 2017, votes: 13394, margin: 1725, runnerUp: 'Elangbam Dwijamani Singh' },
  { acNo: 39, name: 'Sugnu', winner: 'Kangujam Ranjit Singh', party: 'INC', year: 2017, votes: 13331, margin: 3133, runnerUp: 'Yumnam Jiban Singh' },
  { acNo: 40, name: 'Jiribam', winner: 'Ashab Uddin', party: 'IND', year: 2017, votes: 8189, margin: 1650, runnerUp: 'Thoudam Debendra Singh' },
  { acNo: 41, name: 'Chandel', winner: 'Letpao Haokip', party: 'NPEP', year: 2017, votes: 14216, margin: 2125, runnerUp: 'Ts Warngam' },
  { acNo: 42, name: 'Tengnoupal', winner: 'D. Korungthang', party: 'INC', year: 2017, votes: 16940, margin: 4656, runnerUp: 'Yangkholet Haokip' },
  { acNo: 43, name: 'Phungyar', winner: 'K. Leishiyo', party: 'NPF', year: 2017, votes: 11900, margin: 4778, runnerUp: 'Somi Awungshi' },
  { acNo: 44, name: 'Ukhrul', winner: 'Alfred Kanngam Arthur', party: 'INC', year: 2017, votes: 11510, margin: 296, runnerUp: 'Somatai Shaiza' },
  { acNo: 45, name: 'Chingai', winner: 'Khashim Vashum', party: 'NPF', year: 2017, votes: 16582, margin: 7650, runnerUp: 'Sword Vashum' },
  { acNo: 46, name: 'Saikul', winner: 'Yamthong Haokip', party: 'INC', year: 2017, votes: 8677, margin: 3261, runnerUp: 'Chungkhokai Doungel' },
  { acNo: 47, name: 'Karong', winner: 'D.D. Thaisii', party: 'INC', year: 2017, votes: 14038, margin: 4293, runnerUp: 'R. Yuh Jonathan Tao' },
  { acNo: 48, name: 'Mao', winner: 'Losii Dikho', party: 'NPF', year: 2017, votes: 25933, margin: 15414, runnerUp: 'Woba Joram' },
  { acNo: 49, name: 'Tadubi', winner: 'N. Kayisii', party: 'NPEP', year: 2017, votes: 17115, margin: 1299, runnerUp: 'M. Francis Ngajokpa' },
  { acNo: 50, name: 'Kangpokpi', winner: 'Nemcha Kipgen', party: 'BJP', year: 2017, votes: 13485, margin: 2297, runnerUp: 'Kharga Tamang' },
  { acNo: 51, name: 'Saitu', winner: 'Ngamthang Haokip', party: 'INC', year: 2017, votes: 19467, margin: 3817, runnerUp: 'Haokholet Kipgen' },
  { acNo: 52, name: 'Tamei', winner: 'Awangbow Newmai', party: 'NPF', year: 2017, votes: 15933, margin: 747, runnerUp: 'Z. Kikhonbou Newmai' },
  { acNo: 53, name: 'Tamenglong', winner: 'Samuel Jendai Kamei', party: 'BJP', year: 2017, votes: 13023, margin: 2004, runnerUp: 'Janghemlung Panmei' },
  { acNo: 54, name: 'Nungba', winner: 'Gaikhangam', party: 'INC', year: 2017, votes: 10255, margin: 5147, runnerUp: 'Adim Pamei' },
  { acNo: 55, name: 'Tipaimukh', winner: 'Dr. Chaltonlien Amo', party: 'INC', year: 2017, votes: 4997, margin: 626, runnerUp: 'Dr. Lallukhum Fimate' },
  { acNo: 56, name: 'Thanlon', winner: 'Vungzagin Valte', party: 'BJP', year: 2017, votes: 9752, margin: 7169, runnerUp: 'Chinkholal Thangsing' },
  { acNo: 57, name: 'Henglep', winner: 'T. Thangzalam Haokip', party: 'BJP', year: 2017, votes: 8438, margin: 268, runnerUp: 'T. Manga Vaiphei' },
  { acNo: 58, name: 'Churachandpur', winner: 'V. Hangkhanlian', party: 'BJP', year: 2017, votes: 10246, margin: 614, runnerUp: 'Phungzathang Tonsing' },
  { acNo: 59, name: 'Saikot', winner: 'T. N. Haokip', party: 'INC', year: 2017, votes: 16354, margin: 5101, runnerUp: 'Paokholal Haokip' },
  { acNo: 60, name: 'Singhat', winner: 'Ginsuanhau', party: 'INC', year: 2017, votes: 8131, margin: 1162, runnerUp: 'Chinlunthang' },
];

export const mn2017Map = new Map(MN_2017_RESULTS.map((r) => [r.acNo, r]));

export function getMN2017Result(acNo: number): MNHistoricalResult | undefined {
  return mn2017Map.get(acNo);
}
