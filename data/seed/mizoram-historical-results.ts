/**
 * Mizoram — Previous Election Results (2018)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2018.
 *         Full per-constituency winner + party, official AC numbering 1-40.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface MZHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const MZ_2018_RESULTS: MZHistoricalResult[] = [
  { acNo: 1, name: 'Hachhek', winner: 'Lalrindika Ralte', party: 'INC', year: 2018, votes: 6202, margin: 366, runnerUp: 'Lalrinenga Sailo' },
  { acNo: 2, name: 'Dampa', winner: 'Lalrintluanga Sailo', party: 'MNF', year: 2018, votes: 5840, margin: 1657, runnerUp: 'Lalrobiaka' },
  { acNo: 3, name: 'Mamit', winner: 'H. Lalzirliana', party: 'MNF', year: 2018, votes: 6874, margin: 407, runnerUp: 'John Rotluangliana' },
  { acNo: 4, name: 'Tuirial', winner: 'Andrew H. Thangliana', party: 'IND', year: 2018, votes: 4387, margin: 204, runnerUp: 'Sailothanga Sailo' },
  { acNo: 5, name: 'Kolasib', winner: 'K. Lalrinliana', party: 'MNF', year: 2018, votes: 5940, margin: 279, runnerUp: 'Lalfamkima' },
  { acNo: 6, name: 'Serlui', winner: 'Lalrinsanga Ralte', party: 'MNF', year: 2018, votes: 6128, margin: 927, runnerUp: 'Lalhmachhuana' },
  { acNo: 7, name: 'Tuivawl', winner: 'Lalchhandama Ralte', party: 'MNF', year: 2018, votes: 5207, margin: 3, runnerUp: 'R. L. Pianmawia' },
  { acNo: 8, name: 'Chalfilh', winner: 'Lalrinliana Sailo', party: 'MNF', year: 2018, votes: 5541, margin: 1007, runnerUp: 'F. Rualhleia' },
  { acNo: 9, name: 'Tawi', winner: 'R.Lalzirliana', party: 'MNF', year: 2018, votes: 4940, margin: 184, runnerUp: 'R. Lalthatluanga' },
  { acNo: 10, name: 'Aizawl North - I', winner: 'Vanlalhlana', party: 'IND', year: 2018, votes: 7094, margin: 1165, runnerUp: 'Lalringliana' },
  { acNo: 11, name: 'Aizawl North - Ii', winner: 'Vanlalthlana', party: 'IND', year: 2018, votes: 7775, margin: 1801, runnerUp: 'Laltlanzova Khiangte' },
  { acNo: 12, name: 'Aizawl North-Iii', winner: 'C Lalmuanpuia', party: 'MNF', year: 2018, votes: 5166, margin: 434, runnerUp: 'Lal Thanzara' },
  { acNo: 13, name: 'Aizawl East - I', winner: 'Zoramthanga', party: 'MNF', year: 2018, votes: 8358, margin: 2504, runnerUp: 'K Sapdanga' },
  { acNo: 14, name: 'Aizawl East Ii', winner: 'Robert Romawia Royte', party: 'MNF', year: 2018, votes: 5869, margin: 1492, runnerUp: 'B Lalchhanzova' },
  { acNo: 15, name: 'Aizawl West I', winner: 'Lalduhoma', party: 'IND', year: 2018, votes: 7889, margin: 1060, runnerUp: 'K. Sangthuama' },
  { acNo: 16, name: 'Aizawl West Ii', winner: 'Lalruatkima', party: 'MNF', year: 2018, votes: 7626, margin: 2720, runnerUp: 'Dr. Lalmalsawma Nghaka' },
  { acNo: 17, name: 'Aizawl West Iii', winner: 'V.L. Zaithanzama', party: 'IND', year: 2018, votes: 6934, margin: 1026, runnerUp: 'Vanlalzawma' },
  { acNo: 18, name: 'Aizawl South I', winner: 'C. Lalsawivunga', party: 'IND', year: 2018, votes: 6808, margin: 1049, runnerUp: 'K. Liantlinga' },
  { acNo: 19, name: 'Aizawl South Ii', winner: 'Lalchhuanthanga', party: 'IND', year: 2018, votes: 7294, margin: 179, runnerUp: 'Denghmingthanga' },
  { acNo: 20, name: 'Aizawl South-Iii', winner: 'F. Lalnunmawia', party: 'MNF', year: 2018, votes: 7558, margin: 2088, runnerUp: 'K.S Thanga' },
  { acNo: 21, name: 'Lengteng', winner: 'L.Thangmawia', party: 'MNF', year: 2018, votes: 6430, margin: 1772, runnerUp: 'H.Rohluna' },
  { acNo: 22, name: 'Tuichang', winner: 'Tawnluia', party: 'MNF', year: 2018, votes: 5146, margin: 739, runnerUp: 'W. Chhuanawma' },
  { acNo: 23, name: 'Champhai North', winner: 'Dr Zr.Thiamsanga', party: 'MNF', year: 2018, votes: 6057, margin: 1093, runnerUp: 'T.T. Zothansanga' },
  { acNo: 24, name: 'Champhai South', winner: 'T.J Lalnuntluanga', party: 'MNF', year: 2018, votes: 5212, margin: 1049, runnerUp: 'Lal Thanhawla' },
  { acNo: 25, name: 'East Tuipui', winner: 'Ramthanmawia', party: 'MNF', year: 2018, votes: 4384, margin: 587, runnerUp: 'C.Laltanpuia' },
  { acNo: 26, name: 'Serchhip', winner: 'Lalduhoma', party: 'IND', year: 2018, votes: 5481, margin: 410, runnerUp: 'Lal Thanhawla' },
  { acNo: 27, name: 'Tuikum', winner: 'Er. Lalrinawma', party: 'MNF', year: 2018, votes: 5439, margin: 1397, runnerUp: 'Sangzela Tlau' },
  { acNo: 28, name: 'Hrangturzo', winner: 'Lalchamliana', party: 'MNF', year: 2018, votes: 4572, margin: 757, runnerUp: 'Vanlalawmpuii Chawngthu' },
  { acNo: 29, name: 'South Tuipui', winner: 'Dr R Lalthangliana', party: 'MNF', year: 2018, votes: 6126, margin: 1469, runnerUp: 'John Siamkunga' },
  { acNo: 30, name: 'Lunglei North', winner: 'Vanlaltanpuia', party: 'MNF', year: 2018, votes: 5022, margin: 395, runnerUp: 'V Malsawmtluanga' },
  { acNo: 31, name: 'Lunglei East', winner: 'Lawmawma Tochhawng', party: 'MNF', year: 2018, votes: 4063, margin: 72, runnerUp: 'Lalrinpuii' },
  { acNo: 32, name: 'Lunglei West', winner: 'C.Lalrinsanga', party: 'MNF', year: 2018, votes: 4093, margin: 77, runnerUp: 'Chalrosanga Ralte' },
  { acNo: 33, name: 'Lunglei South', winner: 'K Pachhunga', party: 'MNF', year: 2018, votes: 6245, margin: 2441, runnerUp: 'R Lalnunthara' },
  { acNo: 34, name: 'Thorang', winner: 'Zodintluanga Ralte', party: 'INC', year: 2018, votes: 4499, margin: 1240, runnerUp: 'R.Rohmingliana' },
  { acNo: 35, name: 'West Tuipui', winner: 'Nihar Kanti Chakma', party: 'INC', year: 2018, votes: 5943, margin: 2385, runnerUp: 'Kina Ranjan Chakma' },
  { acNo: 36, name: 'Tuichawng', winner: 'Buddha Dhan Chakma', party: 'BJP', year: 2018, votes: 11419, margin: 1594, runnerUp: 'Rasik Mohan Chakma' },
  { acNo: 37, name: 'Lawngtlai West', winner: 'C. Ngunlianchunga', party: 'INC', year: 2018, votes: 10678, margin: 795, runnerUp: 'C. Ramhluna' },
  { acNo: 38, name: 'Lawngtlai East', winner: 'H. Biakzaua', party: 'MNF', year: 2018, votes: 8656, margin: 944, runnerUp: 'H. Zothangliana' },
  { acNo: 39, name: 'Saiha', winner: 'Dr. K. Beichhua', party: 'MNF', year: 2018, votes: 8109, margin: 2468, runnerUp: 'S. Hiato' },
  { acNo: 40, name: 'Palak', winner: 'K.T. Rokhaw', party: 'INC', year: 2018, votes: 5492, margin: 844, runnerUp: 'M. Chakhu' },
];

export const mz2018Map = new Map(MZ_2018_RESULTS.map((r) => [r.acNo, r]));

export function getMZ2018Result(acNo: number): MZHistoricalResult | undefined {
  return mz2018Map.get(acNo);
}
