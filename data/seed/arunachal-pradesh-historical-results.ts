/**
 * Arunachal Pradesh — Previous Election Results (2019)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2019.
 *         Full per-constituency winner + party, official AC numbering 1-60.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface ARHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const AR_2019_RESULTS: ARHistoricalResult[] = [
  { acNo: 1, name: 'Lumla', winner: 'Jambey Tashi', party: 'BJP', year: 2019, votes: 4567, margin: 1288, runnerUp: 'Jampa Thirnly Kunkhap' },
  { acNo: 2, name: 'Tawang', winner: 'Tsering Tashi', party: 'BJP', year: 2019, votes: 5547, margin: 3592, runnerUp: 'Thupten Tempa' },
  { acNo: 3, name: 'Mukto', winner: 'Pema Khandu', party: 'BJP', year: 2019, votes: 4304, margin: 2619, runnerUp: 'Thupten Kunphen' },
  { acNo: 4, name: 'Dirang', winner: 'Shri Phurpa Tsering', party: 'BJP', year: 2019, votes: 0, margin: 0, runnerUp: 'Nota' },
  { acNo: 5, name: 'Kalaktang', winner: 'Shri Dorjee Wangdi Kharma', party: 'JDU', year: 2019, votes: 5026, margin: 1772, runnerUp: 'Shri Tenzing Norbu Thongdok' },
  { acNo: 6, name: 'Thrizino-Buragaon', winner: 'Kumsi Sidisow', party: 'BJP', year: 2019, votes: 8772, margin: 7135, runnerUp: 'Kalo Dususow' },
  { acNo: 7, name: 'Bomdila', winner: 'Shri Dongru Siongju', party: 'JDU', year: 2019, votes: 2994, margin: 233, runnerUp: 'Shri Japu Deru' },
  { acNo: 8, name: 'Bameng', winner: 'Goruk Pordung', party: 'BJP', year: 2019, votes: 5043, margin: 393, runnerUp: 'Kumar Waii' },
  { acNo: 9, name: 'Chayang Tajo', winner: 'Hayeng Mangfi', party: 'JDU', year: 2019, votes: 5435, margin: 634, runnerUp: 'Laching Kacha Yangfo' },
  { acNo: 10, name: 'Seppa East', winner: 'Tapuk Taku', party: 'NPEP', year: 2019, votes: 4184, margin: 29, runnerUp: 'Ealing Tallang' },
  { acNo: 11, name: 'Seppa West', winner: 'Mama Natung', party: 'BJP', year: 2019, votes: 4059, margin: 1554, runnerUp: 'Tani Loffa' },
  { acNo: 12, name: 'Pakke Kessang', winner: 'Biyuram Wahge', party: 'BJP', year: 2019, votes: 4506, margin: 2222, runnerUp: 'Atum Welly' },
  { acNo: 13, name: 'Itanagar', winner: 'Techi Kaso', party: 'JDU', year: 2019, votes: 12162, margin: 302, runnerUp: 'Kipa Babu' },
  { acNo: 14, name: 'Doimukh', winner: 'Tana Hali Tara', party: 'BJP', year: 2019, votes: 8403, margin: 2385, runnerUp: 'Nabam Vivek' },
  { acNo: 15, name: 'Sagalee', winner: 'Nabam Tuki', party: 'INC', year: 2019, votes: 4886, margin: 1321, runnerUp: 'Tarh Hari' },
  { acNo: 16, name: 'Yachuli', winner: 'Taba Tedir', party: 'BJP', year: 2019, votes: 0, margin: 0, runnerUp: 'Nota' },
  { acNo: 17, name: 'Ziro Hapoli', winner: 'Tage Taki', party: 'BJP', year: 2019, votes: 9853, margin: 1774, runnerUp: 'Nani Ribia' },
  { acNo: 18, name: 'Palin', winner: 'Balo Raja', party: 'BJP', year: 2019, votes: 5727, margin: 730, runnerUp: 'Takam Pario' },
  { acNo: 19, name: 'Nyapin', winner: 'Bamang Felix', party: 'BJP', year: 2019, votes: 5517, margin: 154, runnerUp: 'Tai Nikio' },
  { acNo: 20, name: 'Tali', winner: 'Jikke Tako', party: 'JDU', year: 2019, votes: 5518, margin: 105, runnerUp: 'Thaji Gichak Kiogi' },
  { acNo: 21, name: 'Koloriang', winner: 'Lokam Tassar', party: 'BJP', year: 2019, votes: 5748, margin: 456, runnerUp: 'Pani Taram' },
  { acNo: 22, name: 'Nacho', winner: 'Nakap Nalo', party: 'BJP', year: 2019, votes: 5053, margin: 698, runnerUp: 'Tanga Byaling' },
  { acNo: 23, name: 'Taliha', winner: 'Nyato Rigia', party: 'BJP', year: 2019, votes: 5024, margin: 1203, runnerUp: 'Rudham Sindhu' },
  { acNo: 24, name: 'Daporijo', winner: 'Taniya Soki', party: 'BJP', year: 2019, votes: 6019, margin: 122, runnerUp: 'Dikto Yekar' },
  { acNo: 25, name: 'Raga', winner: 'Tarin Dakpe', party: 'NPEP', year: 2019, votes: 3385, margin: 166, runnerUp: 'Nido Pavitra' },
  { acNo: 26, name: 'Dumporijo', winner: 'Rode Bui', party: 'BJP', year: 2019, votes: 4635, margin: 978, runnerUp: 'Paknga Bage' },
  { acNo: 27, name: 'Liromoba', winner: 'Nyamar Karbak', party: 'BJP', year: 2019, votes: 5616, margin: 746, runnerUp: 'Jarpum Gamlin' },
  { acNo: 28, name: 'Likabali', winner: 'Kardo Nyigyor', party: 'PPA', year: 2019, votes: 3714, margin: 178, runnerUp: 'Tapak Lendo' },
  { acNo: 29, name: 'Basar', winner: 'Gokar Basar', party: 'NPEP', year: 2019, votes: 6626, margin: 240, runnerUp: 'Gojen Gadi' },
  { acNo: 30, name: 'Along West', winner: 'Tumke Bagra', party: 'BJP', year: 2019, votes: 6000, margin: 966, runnerUp: 'Topin Ete' },
  { acNo: 31, name: 'Along East', winner: 'Kento Jini', party: 'BJP', year: 2019, votes: 0, margin: 0, runnerUp: 'Nota' },
  { acNo: 32, name: 'Rumgong', winner: 'Talem Taboh', party: 'JDU', year: 2019, votes: 4949, margin: 85, runnerUp: 'Tamiyo Taga' },
  { acNo: 33, name: 'Mechuka', winner: 'Pasang Dorjee Sona', party: 'BJP', year: 2019, votes: 4261, margin: 68, runnerUp: 'Tori Ragyor' },
  { acNo: 34, name: 'Tuting Yingkiong', winner: 'Alo Libang', party: 'BJP', year: 2019, votes: 5800, margin: 1609, runnerUp: 'Gegong Apang' },
  { acNo: 35, name: 'Pangin', winner: 'Ojing Tasing', party: 'BJP', year: 2019, votes: 7647, margin: 4052, runnerUp: 'Tapang Taloh' },
  { acNo: 36, name: 'Nari-Koyu', winner: 'Kento Rina', party: 'BJP', year: 2019, votes: 2489, margin: 216, runnerUp: 'Tojir Kadu' },
  { acNo: 37, name: 'Pasighat West', winner: 'Ninong Ering', party: 'INC', year: 2019, votes: 5210, margin: 571, runnerUp: 'Er. Tatung Jamoh' },
  { acNo: 38, name: 'Pasighat East', winner: 'Kaling Moyong', party: 'BJP', year: 2019, votes: 8851, margin: 1242, runnerUp: 'Bosiram Siram' },
  { acNo: 39, name: 'Mebo', winner: 'Lombo Tayeng', party: 'INC', year: 2019, votes: 5238, margin: 372, runnerUp: 'Dr. Dangi Perme' },
  { acNo: 40, name: 'Mariyang-Geku', winner: 'Kanggong Taku', party: 'JDU', year: 2019, votes: 5366, margin: 1260, runnerUp: 'Anong Perme' },
  { acNo: 41, name: 'Anini', winner: 'Mopi Mihu', party: 'BJP', year: 2019, votes: 2416, margin: 1134, runnerUp: 'Singe Milli' },
  { acNo: 42, name: 'Dambuk', winner: 'Gum Tayeng', party: 'BJP', year: 2019, votes: 5584, margin: 873, runnerUp: 'Tony Pertin' },
  { acNo: 43, name: 'Roing', winner: 'Mutchu Mithi', party: 'NPEP', year: 2019, votes: 4950, margin: 400, runnerUp: 'Laeta Umbrey' },
  { acNo: 44, name: 'Tezu', winner: 'Karikho Kri', party: 'IND', year: 2019, votes: 7538, margin: 155, runnerUp: 'Dr. Mohesh Chai' },
  { acNo: 45, name: 'Hayuliang', winner: 'Dasanglu Pul', party: 'BJP', year: 2019, votes: 6149, margin: 1332, runnerUp: 'Lupalum Kri' },
  { acNo: 46, name: 'Chowkham', winner: 'Chowna Mein', party: 'BJP', year: 2019, votes: 8908, margin: 7291, runnerUp: 'Khunang Kri' },
  { acNo: 47, name: 'Namsai', winner: 'Chau Zingnu Namchoom', party: 'BJP', year: 2019, votes: 13392, margin: 10755, runnerUp: 'Shri Mualin Agan' },
  { acNo: 48, name: 'Lekang', winner: 'Jummum Ete Deori', party: 'BJP', year: 2019, votes: 8980, margin: 5493, runnerUp: 'Takam Sanjoy' },
  { acNo: 49, name: 'Bordumsa - Diyun', winner: 'Somlung Mossang', party: 'IND', year: 2019, votes: 6330, margin: 2379, runnerUp: 'Jawra Maio' },
  { acNo: 50, name: 'Miao', winner: 'Kamlung Mosang', party: 'BJP', year: 2019, votes: 9760, margin: 3856, runnerUp: 'Chatu Longri' },
  { acNo: 51, name: 'Nampong', winner: 'Laisam Simai', party: 'BJP', year: 2019, votes: 3761, margin: 1510, runnerUp: 'Tainan James Jugli' },
  { acNo: 52, name: 'Changlang South', winner: 'Phosum Khimhun', party: 'BJP', year: 2019, votes: 2848, margin: 583, runnerUp: 'Latlang Tangha' },
  { acNo: 53, name: 'Changlang North', winner: 'Tesam Pongte', party: 'BJP', year: 2019, votes: 5417, margin: 3015, runnerUp: 'Thinghaap Taiju' },
  { acNo: 54, name: 'Namsang', winner: 'Wangki Lowang', party: 'BJP', year: 2019, votes: 3202, margin: 1682, runnerUp: 'Ngonglin Boi' },
  { acNo: 55, name: 'Khonsa East', winner: 'Wanglam Sawin', party: 'BJP', year: 2019, votes: 5051, margin: 3381, runnerUp: 'Danhang Phuksa' },
  { acNo: 56, name: 'Khonsa West', winner: 'Tirong Aboh', party: 'NPEP', year: 2019, votes: 5366, margin: 1055, runnerUp: 'Phawang Lowang' },
  { acNo: 57, name: 'Borduria Bogapani', winner: 'Wanglin Lowangdong', party: 'INC', year: 2019, votes: 2499, margin: 97, runnerUp: 'Jowang Hosai' },
  { acNo: 58, name: 'Kanubari', winner: 'Gabriel Denwang Wangsu', party: 'BJP', year: 2019, votes: 6707, margin: 4236, runnerUp: 'Nokchai Boham' },
  { acNo: 59, name: 'Longding Pumao', winner: 'Tanpho Wangnaw', party: 'BJP', year: 2019, votes: 4463, margin: 695, runnerUp: 'Thangwang Wangham' },
  { acNo: 60, name: 'Pongchau Wakka', winner: 'Honchun Ngandam', party: 'BJP', year: 2019, votes: 6837, margin: 3738, runnerUp: 'Thangkai Khusumchai' },
];

export const ar2019Map = new Map(AR_2019_RESULTS.map((r) => [r.acNo, r]));

export function getAR2019Result(acNo: number): ARHistoricalResult | undefined {
  return ar2019Map.get(acNo);
}
