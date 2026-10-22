/**
 * Tripura — Previous Election Results (2018)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2018.
 *         Full per-constituency winner + party, official AC numbering 1-60.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface TRHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const TR_2018_RESULTS: TRHistoricalResult[] = [
  { acNo: 1, name: 'Simna', winner: 'Brishaketu Debbarma', party: 'IPFT', year: 2018, votes: 15977, margin: 1963, runnerUp: 'Pranab Debbarma' },
  { acNo: 2, name: 'Mohanpur', winner: 'Ratan Lal Nath', party: 'BJP', year: 2018, votes: 22516, margin: 5176, runnerUp: 'Subhas Chandra Debnath' },
  { acNo: 3, name: 'Bamutia', winner: 'Krishnadhan Das', party: 'BJP', year: 2018, votes: 20014, margin: 972, runnerUp: 'Haricharan Sarkar' },
  { acNo: 4, name: 'Barjala', winner: 'Dilip Kumar Das', party: 'BJP', year: 2018, votes: 22052, margin: 6227, runnerUp: 'Jhumu Sarkar' },
  { acNo: 5, name: 'Khayerpur', winner: 'Ratan Chakraborty', party: 'BJP', year: 2018, votes: 25496, margin: 7039, runnerUp: 'Pabitra Kar' },
  { acNo: 6, name: 'Agartala', winner: 'Sudip Roy Barman', party: 'BJP', year: 2018, votes: 25234, margin: 7382, runnerUp: 'Krishna Majumder' },
  { acNo: 7, name: 'Ramnagar', winner: 'Surajit Datta', party: 'BJP', year: 2018, votes: 21092, margin: 4855, runnerUp: 'Ratan Das' },
  { acNo: 8, name: 'Town Bordowali', winner: 'Asish Kumar Saha', party: 'BJP', year: 2018, votes: 24293, margin: 11178, runnerUp: 'Biswanath Saha' },
  { acNo: 9, name: 'Banamalipur', winner: 'Biplab Kumar Deb', party: 'BJP', year: 2018, votes: 21755, margin: 9549, runnerUp: 'Amal Chakraborty' },
  { acNo: 10, name: 'Majlishpur', winner: 'Sushanta Chowdhury', party: 'BJP', year: 2018, votes: 23249, margin: 3890, runnerUp: 'Manik Dey' },
  { acNo: 11, name: 'Mandaibazar', winner: 'Dhirendra Debbarma', party: 'IPFT', year: 2018, votes: 21381, margin: 5864, runnerUp: 'Monoranjan Debbarma' },
  { acNo: 12, name: 'Takarjala', winner: 'Narendra Chandra Debbarma', party: 'IPFT', year: 2018, votes: 22056, margin: 12652, runnerUp: 'Ramendra Debbarma' },
  { acNo: 13, name: 'Pratapgarh', winner: 'Rebati Mohan Das', party: 'BJP', year: 2018, votes: 25834, margin: 3148, runnerUp: 'Ramu Das' },
  { acNo: 14, name: 'Badharghat', winner: 'Dilip Sarkar', party: 'BJP', year: 2018, votes: 28561, margin: 5448, runnerUp: 'Jharna Das(Baidya)' },
  { acNo: 15, name: 'Kamalasagar', winner: 'Narayan Chandra Chowdhuri', party: 'CPIM', year: 2018, votes: 18847, margin: 1879, runnerUp: 'Arun Bhowmik' },
  { acNo: 16, name: 'Bishalgarh', winner: 'Bhanulal Saha', party: 'CPIM', year: 2018, votes: 21254, margin: 766, runnerUp: 'Nitai Chaudhuri' },
  { acNo: 17, name: 'Golaghati', winner: 'Birendra Kishore Debbarma', party: 'BJP', year: 2018, votes: 19228, margin: 3498, runnerUp: 'Keshab Debbarma' },
  { acNo: 18, name: 'Suryamaninagar', winner: 'Ram Prasad Paul', party: 'BJP', year: 2018, votes: 24874, margin: 4567, runnerUp: 'Rajkumar Choudhury' },
  { acNo: 19, name: 'Charilam', winner: 'Jishnu Dev Varma', party: 'BJP', year: 2018, votes: 26580, margin: 25550, runnerUp: 'Palash Debbarma' },
  { acNo: 20, name: 'Boxanagar', winner: 'Sahid Choudhuri', party: 'CPIM', year: 2018, votes: 19862, margin: 8015, runnerUp: 'Baharul Islam Majumder' },
  { acNo: 21, name: 'Nalchar', winner: 'Subhash Chandra Das', party: 'BJP', year: 2018, votes: 19261, margin: 451, runnerUp: 'Tapan Chandra Das' },
  { acNo: 22, name: 'Sonamura', winner: 'Shyamal Chakraborty', party: 'CPIM', year: 2018, votes: 19275, margin: 3432, runnerUp: 'Subal Bhowmik' },
  { acNo: 23, name: 'Dhanpur', winner: 'Manik Sarkar', party: 'CPIM', year: 2018, votes: 22176, margin: 5441, runnerUp: 'Pratima Bhoumik' },
  { acNo: 24, name: 'Ramchandraghat', winner: 'Prasanta Debbarma', party: 'IPFT', year: 2018, votes: 19439, margin: 4235, runnerUp: 'Padma Kumar Deb Barma' },
  { acNo: 25, name: 'Khowai', winner: 'Nirmal Biswas', party: 'CPIM', year: 2018, votes: 20629, margin: 2736, runnerUp: 'Amit Rakshit' },
  { acNo: 26, name: 'Asharambari', winner: 'Mevar Kr Jamatia', party: 'IPFT', year: 2018, votes: 19188, margin: 6987, runnerUp: 'Aghore Deb Barma' },
  { acNo: 27, name: 'Kalyanpur-Pramodenagar', winner: 'Pinaki Das Chowdhury', party: 'BJP', year: 2018, votes: 20293, margin: 3141, runnerUp: 'Manindra Chandra Das' },
  { acNo: 28, name: 'Teliamura', winner: 'Kalyani Roy', party: 'BJP', year: 2018, votes: 22077, margin: 7179, runnerUp: 'Gouri Das' },
  { acNo: 29, name: 'Krishnapur', winner: 'Atul Debbarma', party: 'BJP', year: 2018, votes: 16730, margin: 1995, runnerUp: 'Khagendra Jamatia' },
  { acNo: 30, name: 'Bagma', winner: 'Ram Pada Jamatia', party: 'BJP', year: 2018, votes: 24074, margin: 2833, runnerUp: 'Naresh Chandra Jamatia' },
  { acNo: 31, name: 'Radhakishorepur', winner: 'Pranajit Singha Roy', party: 'BJP', year: 2018, votes: 22414, margin: 4846, runnerUp: 'Srikanta Datta' },
  { acNo: 32, name: 'Matarbari', winner: 'Biplab Kumar Ghosh', party: 'BJP', year: 2018, votes: 23069, margin: 1569, runnerUp: 'Madhab Chandra Saha' },
  { acNo: 33, name: 'Kakraban-Salgarah', winner: 'Ratan Kumar Bhowmik', party: 'CPIM', year: 2018, votes: 24835, margin: 3767, runnerUp: 'Jitendra Majumder' },
  { acNo: 34, name: 'Rajnagar', winner: 'Sudhan Das', party: 'CPIM', year: 2018, votes: 22004, margin: 5713, runnerUp: 'Bibhishan Chandra Das' },
  { acNo: 35, name: 'Belonia', winner: 'Arun Chandra Bhaumik', party: 'BJP', year: 2018, votes: 19307, margin: 753, runnerUp: 'Basudev Majumder' },
  { acNo: 36, name: 'Santirbazar', winner: 'Pramod Reang', party: 'BJP', year: 2018, votes: 21701, margin: 2349, runnerUp: 'Manindra Reang' },
  { acNo: 37, name: 'Hrishyamukh', winner: 'Badal Choudhury', party: 'CPIM', year: 2018, votes: 22673, margin: 6330, runnerUp: 'Ashesh Baidya' },
  { acNo: 38, name: 'Jolaibari', winner: 'Jashabir Tripura', party: 'CPIM', year: 2018, votes: 21160, margin: 1568, runnerUp: 'Ankya Mog Choudhuri' },
  { acNo: 39, name: 'Manu', winner: 'Pravat Chowdhury', party: 'CPIM', year: 2018, votes: 19432, margin: 193, runnerUp: 'Dhananjoy Tripura' },
  { acNo: 40, name: 'Sabroom', winner: 'Sankar Roy', party: 'BJP', year: 2018, votes: 21059, margin: 2182, runnerUp: 'Rita Kar Majumder' },
  { acNo: 41, name: 'Ampinagar', winner: 'Sindhu Chandra Jamatia', party: 'IPFT', year: 2018, votes: 18202, margin: 4947, runnerUp: 'Daniel Jamatia' },
  { acNo: 42, name: 'Amarpur', winner: 'Ranjit Das', party: 'BJP', year: 2018, votes: 18970, margin: 1016, runnerUp: 'Parimal Debnath' },
  { acNo: 43, name: 'Karbook', winner: 'Burba Mohan Tripura', party: 'BJP', year: 2018, votes: 15622, margin: 797, runnerUp: 'Priyamani Debbarma' },
  { acNo: 44, name: 'Raima Valley', winner: 'Dhananjoy Tripura', party: 'IPFT', year: 2018, votes: 18673, margin: 1922, runnerUp: 'Lalit Mohan Tripura' },
  { acNo: 45, name: 'Kamalpur', winner: 'Manoj Kanti Deb', party: 'BJP', year: 2018, votes: 20165, margin: 2959, runnerUp: 'Bijoy Laxmi Singha' },
  { acNo: 46, name: 'Surma', winner: 'Ashis Das', party: 'BJP', year: 2018, votes: 20767, margin: 2710, runnerUp: 'Anjan Das' },
  { acNo: 47, name: 'Ambassa', winner: 'Parimal Debbarma', party: 'BJP', year: 2018, votes: 20842, margin: 3585, runnerUp: 'Bharat Reang' },
  { acNo: 48, name: 'Karamchhara', winner: 'Diba Chandra Hrangkhawl', party: 'BJP', year: 2018, votes: 19397, margin: 7336, runnerUp: 'Umakanta Tripura' },
  { acNo: 49, name: 'Chhawmanu', winner: 'Sambhu Lal Chakma', party: 'BJP', year: 2018, votes: 18290, margin: 3755, runnerUp: 'Nirajoy Tripura' },
  { acNo: 50, name: 'Pabiachhara', winner: 'Bhagaban Das', party: 'BJP', year: 2018, votes: 22815, margin: 5827, runnerUp: 'Samiran Malakar' },
  { acNo: 51, name: 'Fatikroy', winner: 'Sudhangshu Das', party: 'BJP', year: 2018, votes: 19512, margin: 2829, runnerUp: 'Tunubala Malakar' },
  { acNo: 52, name: 'Chandipur', winner: 'Tapan Chakraborti', party: 'CPIM', year: 2018, votes: 18545, margin: 402, runnerUp: 'Kaberi Singha' },
  { acNo: 53, name: 'Kailasahar', winner: 'Moboshar Ali', party: 'CPIM', year: 2018, votes: 18093, margin: 4834, runnerUp: 'Nitish De' },
  { acNo: 54, name: 'Kadamtala - Kurti', winner: 'Islam Uddin', party: 'CPIM', year: 2018, votes: 20721, margin: 6882, runnerUp: 'Tinku Roy' },
  { acNo: 55, name: 'Bagbassa', winner: 'Bijita Nath', party: 'CPIM', year: 2018, votes: 18001, margin: 270, runnerUp: 'Pradip Kumar Nath' },
  { acNo: 56, name: 'Dharmanagar', winner: 'Biswabandhu Sen', party: 'BJP', year: 2018, votes: 21357, margin: 7287, runnerUp: 'Abhijit De' },
  { acNo: 57, name: 'Jubarajnagar', winner: 'Ramendra Chandra Debnath', party: 'CPIM', year: 2018, votes: 18147, margin: 649, runnerUp: 'Jadab Lal Debnath' },
  { acNo: 58, name: 'Panisagar', winner: 'Binay Bhushan Das', party: 'BJP', year: 2018, votes: 15892, margin: 561, runnerUp: 'Ajit Kumar Das' },
  { acNo: 59, name: 'Pencharthal', winner: 'Santana Chakma', party: 'BJP', year: 2018, votes: 17743, margin: 1373, runnerUp: 'Anil Chakma' },
  { acNo: 60, name: 'Kanchanpur', winner: 'Prem Kumar Reang', party: 'IPFT', year: 2018, votes: 19448, margin: 4131, runnerUp: 'Rajendra Reang' },
];

export const tr2018Map = new Map(TR_2018_RESULTS.map((r) => [r.acNo, r]));

export function getTR2018Result(acNo: number): TRHistoricalResult | undefined {
  return tr2018Map.get(acNo);
}
