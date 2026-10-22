/**
 * Sikkim — Previous Election Results (2019)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2019.
 *         Full per-constituency winner + party, official AC numbering 1-32.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface SKHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const SK_2019_RESULTS: SKHistoricalResult[] = [
  { acNo: 1, name: 'Yoksam-Tashiding', winner: 'Sangay Lepcha', party: 'SKM', year: 2019, votes: 5686, margin: 79, runnerUp: 'Dichen Wangchuk Bhutia' },
  { acNo: 2, name: 'Yangthang', winner: 'Bhim Hang Limboo', party: 'SKM', year: 2019, votes: 5184, margin: 47, runnerUp: 'Dal Bdr. Subba' },
  { acNo: 3, name: 'Maneybung-Dentam', winner: 'Narendra Kumar Subba', party: 'SDF', year: 2019, votes: 7134, margin: 1504, runnerUp: 'Purna Hang Subba' },
  { acNo: 4, name: 'Gyalshing-Barnyak', winner: 'Lok Nath Sharma', party: 'SKM', year: 2019, votes: 5862, margin: 1814, runnerUp: 'Laxuman Sharma' },
  { acNo: 5, name: 'Rinchenpong', winner: 'Karma Sonam Lepcha', party: 'SDF', year: 2019, votes: 6582, margin: 1069, runnerUp: 'Phurba Tsh. Bhutia' },
  { acNo: 6, name: 'Daramdin', winner: 'Mingma Norbu Sherpa', party: 'SKM', year: 2019, votes: 6219, margin: 336, runnerUp: 'Pem Norbu Sherpa' },
  { acNo: 7, name: 'Soreong-Chakung', winner: 'Aditya Golay (Tamang)', party: 'SKM', year: 2019, votes: 6580, margin: 208, runnerUp: 'Sancha Raj Subba' },
  { acNo: 8, name: 'Salghari-Zoo', winner: 'Sunita Gajmer', party: 'SKM', year: 2019, votes: 4400, margin: 93, runnerUp: 'Dhan Kumari Kami' },
  { acNo: 9, name: 'Barfung', winner: 'Tashi Thendup Bhutia', party: 'SDF', year: 2019, votes: 5936, margin: 97, runnerUp: 'Lobzang Bhutia' },
  { acNo: 10, name: 'Poklok-Kamrang', winner: 'Pawan Chamling', party: 'SDF', year: 2019, votes: 7731, margin: 2899, runnerUp: 'Kharka Bahadur Rai' },
  { acNo: 11, name: 'Namchi-Singhithang', winner: 'Pawan Chamling', party: 'SDF', year: 2019, votes: 5054, margin: 377, runnerUp: 'Ganesh Rai' },
  { acNo: 12, name: 'Melli', winner: 'Farwanti Tamang', party: 'SDF', year: 2019, votes: 6354, margin: 865, runnerUp: 'Tilak Basnet' },
  { acNo: 13, name: 'Namthang-Rateypani', winner: 'Sanjeet Kharel', party: 'SKM', year: 2019, votes: 6848, margin: 1305, runnerUp: 'Birjan Tamang' },
  { acNo: 14, name: 'Temi-Namphing', winner: 'Bedu Singh Panth', party: 'SKM', year: 2019, votes: 6084, margin: 770, runnerUp: 'Garjaman Gurung' },
  { acNo: 15, name: 'Rangang-Yangang', winner: 'Raj Kumari Thapa', party: 'SDF', year: 2019, votes: 6146, margin: 1525, runnerUp: 'Raj Kumar Basnet' },
  { acNo: 16, name: 'Tumen-Lingi', winner: 'Ugen T. Gyatso Bhutia', party: 'SDF', year: 2019, votes: 6615, margin: 320, runnerUp: 'Samdup Tshering Bhutia' },
  { acNo: 17, name: 'Khamdong-Singtam', winner: 'Mani Kumar Sharma', party: 'SKM', year: 2019, votes: 5347, margin: 873, runnerUp: 'Garjaman Gurung' },
  { acNo: 18, name: 'West Penda', winner: 'L .B Das', party: 'SKM', year: 2019, votes: 5799, margin: 898, runnerUp: 'Gopal Baraily' },
  { acNo: 19, name: 'Rhenock', winner: 'Bishnu Kumar Sharma', party: 'SKM', year: 2019, votes: 8039, margin: 3086, runnerUp: 'Hemendra Adhikari' },
  { acNo: 20, name: 'Chujachen', winner: 'Krishna Bahadur Rai', party: 'SDF', year: 2019, votes: 7266, margin: 1327, runnerUp: 'Damber Kumar Pradhan' },
  { acNo: 21, name: 'Gnathang-Machong', winner: 'Dorjee Tshering Lepcha', party: 'SDF', year: 2019, votes: 6380, margin: 2920, runnerUp: 'Tshering Bhutia' },
  { acNo: 22, name: 'Namcheybung', winner: 'Em Prasad Sharma', party: 'SDF', year: 2019, votes: 6141, margin: 971, runnerUp: 'Denis Rai' },
  { acNo: 23, name: 'Shyari', winner: 'Kunga Nima Lepcha', party: 'SKM', year: 2019, votes: 6638, margin: 1356, runnerUp: 'Karma Wangdi Bhutia' },
  { acNo: 24, name: 'Martam-Rumtek', winner: 'Dorjee Tshering Lepcha', party: 'SDF', year: 2019, votes: 6244, margin: 73, runnerUp: 'Sonam Tshering Venchungpa' },
  { acNo: 25, name: 'Upper Tadong', winner: 'Gay Tshering Dhungel', party: 'SDF', year: 2019, votes: 3844, margin: 416, runnerUp: 'Anand Lama' },
  { acNo: 26, name: 'Arithang', winner: 'Arun Kumar Upreti', party: 'SKM', year: 2019, votes: 3150, margin: 474, runnerUp: 'Ashis Rai' },
  { acNo: 27, name: 'Gangtok', winner: 'Kunga Nima Lepcha', party: 'SKM', year: 2019, votes: 3838, margin: 888, runnerUp: 'Pintso Chopel' },
  { acNo: 28, name: 'Upper Burtuk', winner: 'Dilli Ram Thapa', party: 'SDF', year: 2019, votes: 6107, margin: 757, runnerUp: 'Nagendra Bikram Gurung' },
  { acNo: 29, name: 'Kabi Lungchuk', winner: 'Karma Loday Bhutia', party: 'SKM', year: 2019, votes: 5705, margin: 1437, runnerUp: 'Ugen Nedup Bhutia' },
  { acNo: 30, name: 'Djongu', winner: 'Pintso Namgyal Lepcha', party: 'SDF', year: 2019, votes: 5613, margin: 3001, runnerUp: 'Chungkipu Lepcha' },
  { acNo: 31, name: 'Lachen Mangan', winner: 'Samdup Lepcha', party: 'SKM', year: 2019, votes: 3615, margin: 584, runnerUp: 'Tshering Wangdi Lepcha' },
  { acNo: 32, name: 'Sangha', winner: 'Sonam Lama', party: 'SKM', year: 2019, votes: 1488, margin: 630, runnerUp: 'Tshering Lama' },
];

export const sk2019Map = new Map(SK_2019_RESULTS.map((r) => [r.acNo, r]));

export function getSK2019Result(acNo: number): SKHistoricalResult | undefined {
  return sk2019Map.get(acNo);
}
