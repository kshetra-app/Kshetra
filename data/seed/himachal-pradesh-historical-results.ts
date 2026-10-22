/**
 * Himachal Pradesh — Previous Election Results (2017)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2017.
 *         Full per-constituency winner + party, official AC numbering 1-68.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface HPHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const HP_2017_RESULTS: HPHistoricalResult[] = [
  { acNo: 1, name: 'Churah', winner: 'Hans Raj', party: 'BJP', year: 2017, votes: 28293, margin: 4944, runnerUp: 'Surender Bhardwaj' },
  { acNo: 2, name: 'Bharmour', winner: 'Jia Lal', party: 'BJP', year: 2017, votes: 25744, margin: 7349, runnerUp: 'Thakur Singh Bharmouri' },
  { acNo: 3, name: 'Chamba', winner: 'Pawan Nayyar', party: 'BJP', year: 2017, votes: 26763, margin: 1879, runnerUp: 'Neeraj Nayar' },
  { acNo: 4, name: 'Dalhousie', winner: 'Asha Kumari', party: 'INC', year: 2017, votes: 24224, margin: 556, runnerUp: 'D. S. Thakur' },
  { acNo: 5, name: 'Bhattiyat', winner: 'Bikram Singh Jaryal', party: 'BJP', year: 2017, votes: 29119, margin: 6885, runnerUp: 'Kuldeep Singh Pathania' },
  { acNo: 6, name: 'Nurpur', winner: 'Rakesh Pathania', party: 'BJP', year: 2017, votes: 34871, margin: 6642, runnerUp: 'Ajay Mahajan' },
  { acNo: 7, name: 'Indora', winner: 'Reeta Devi', party: 'BJP', year: 2017, votes: 29213, margin: 1095, runnerUp: 'Kamal Kishore' },
  { acNo: 8, name: 'Fatehpur', winner: 'Sujan Singh Pathania', party: 'INC', year: 2017, votes: 18962, margin: 1284, runnerUp: 'Kripal Singh Parmar' },
  { acNo: 9, name: 'Jawali', winner: 'Arjun Singh', party: 'BJP', year: 2017, votes: 36999, margin: 8213, runnerUp: 'Chander Kumar' },
  { acNo: 10, name: 'Dehra', winner: 'Hoshyar Singh', party: 'Ind', year: 2017, votes: 24206, margin: 3914, runnerUp: 'Ravinder Singh Ravi' },
  { acNo: 11, name: 'Jaswan-Pragpur', winner: 'Bikram Singh', party: 'BJP', year: 2017, votes: 23583, margin: 1862, runnerUp: 'Surinder Singh Mankotia' },
  { acNo: 12, name: 'Jawalamukhi', winner: 'Ramesh Chand Dhawala', party: 'BJP', year: 2017, votes: 27914, margin: 6464, runnerUp: 'Sanjay Rattan' },
  { acNo: 13, name: 'Jaisinghpur', winner: 'Ravinder Kumar', party: 'BJP', year: 2017, votes: 29357, margin: 10710, runnerUp: 'Yadvinder Goma' },
  { acNo: 14, name: 'Sullah', winner: 'Vipin Singh Parmar', party: 'BJP', year: 2017, votes: 38173, margin: 10291, runnerUp: 'Jagjiwan Paul' },
  { acNo: 15, name: 'Nagrota', winner: 'Arun Kumar', party: 'BJP', year: 2017, votes: 32039, margin: 1000, runnerUp: 'G S Bali' },
  { acNo: 16, name: 'Kangra', winner: 'Pawan Kumar Kajal', party: 'INC', year: 2017, votes: 25549, margin: 6208, runnerUp: 'Sanjay Chaudhary' },
  { acNo: 17, name: 'Shahpur', winner: 'Sarveen Choudhary', party: 'BJP', year: 2017, votes: 23104, margin: 6147, runnerUp: 'Major (Ret.) Vijai Singh Mankotia' },
  { acNo: 18, name: 'Dharamshala', winner: 'Kishan Kapoor', party: 'BJP', year: 2017, votes: 26050, margin: 2997, runnerUp: 'Sudhir Sharma' },
  { acNo: 19, name: 'Palampur', winner: 'Ashish Butail', party: 'INC', year: 2017, votes: 24252, margin: 4324, runnerUp: 'Indu Goswami' },
  { acNo: 20, name: 'Baijnath', winner: 'Mulkh Raj Premi', party: 'BJP', year: 2017, votes: 32102, margin: 12669, runnerUp: 'Kishori Lal' },
  { acNo: 21, name: 'Lahaul and Spiti', winner: 'Ram Lal Markanda', party: 'BJP', year: 2017, votes: 7756, margin: 1478, runnerUp: 'Ravi Thakur' },
  { acNo: 22, name: 'Manali', winner: 'Govind Singh Thakur', party: 'BJP', year: 2017, votes: 27173, margin: 3005, runnerUp: 'Hari Chand Sharma' },
  { acNo: 23, name: 'Kullu', winner: 'Sunder Singh Thakur', party: 'INC', year: 2017, votes: 31423, margin: 1538, runnerUp: 'Maheshwar Singh' },
  { acNo: 24, name: 'Banjar', winner: 'Surender Shourie', party: 'BJP', year: 2017, votes: 28007, margin: 3240, runnerUp: 'Aditya Vikram Singh' },
  { acNo: 25, name: 'Anni', winner: 'Kishori Lal', party: 'BJP', year: 2017, votes: 30559, margin: 5983, runnerUp: 'Paras Ram' },
  { acNo: 26, name: 'Karsog', winner: 'Hira Lal', party: 'BJP', year: 2017, votes: 22102, margin: 4830, runnerUp: 'Mansa Ram' },
  { acNo: 27, name: 'Sundernagar', winner: 'Rakesh Kumar Jamwal', party: 'BJP', year: 2017, votes: 32545, margin: 9263, runnerUp: 'Sohan Lal' },
  { acNo: 28, name: 'Nachan', winner: 'Vinod Kumar', party: 'BJP', year: 2017, votes: 38154, margin: 15896, runnerUp: 'Lal Singh Kaushal' },
  { acNo: 29, name: 'Seraj', winner: 'Jai Ram Thakur', party: 'BJP', year: 2017, votes: 35519, margin: 11254, runnerUp: 'Chet Ram' },
  { acNo: 30, name: 'Darang', winner: 'Jawahar Thakur', party: 'BJP', year: 2017, votes: 31392, margin: 6541, runnerUp: 'Kaul Singh' },
  { acNo: 31, name: 'Jogindernagar', winner: 'Prakash Rana', party: 'Ind', year: 2017, votes: 31214, margin: 6635, runnerUp: 'Gulab Singh Thakur' },
  { acNo: 32, name: 'Dharampur', winner: 'Mahender Singh', party: 'BJP', year: 2017, votes: 27931, margin: 11964, runnerUp: 'Chandershekhar' },
  { acNo: 33, name: 'Mandi', winner: 'Anil Sharma', party: 'BJP', year: 2017, votes: 31282, margin: 10257, runnerUp: 'Champa Thakur' },
  { acNo: 34, name: 'Balh', winner: 'Colonel Inder Singh Gandhi', party: 'BJP', year: 2017, votes: 34704, margin: 12811, runnerUp: 'Prakash Chaudhary' },
  { acNo: 35, name: 'Sarkaghat', winner: 'Colonel Inder Singh', party: 'BJP', year: 2017, votes: 30705, margin: 9302, runnerUp: 'Pawan Kumar' },
  { acNo: 36, name: 'Bhoranj', winner: 'Kamlesh Kumari', party: 'BJP', year: 2017, votes: 27961, margin: 6892, runnerUp: 'Suresh Kumar' },
  { acNo: 37, name: 'Sujanpur', winner: 'Rajinder Rana', party: 'INC', year: 2017, votes: 25288, margin: 1919, runnerUp: 'Prem Kumar Dhumal' },
  { acNo: 38, name: 'Hamirpur', winner: 'Narinder Thakur', party: 'BJP', year: 2017, votes: 25854, margin: 7231, runnerUp: 'Kuldeep Singh Pathania' },
  { acNo: 39, name: 'Barsar', winner: 'Inder Dutt Lakhanpal', party: 'INC', year: 2017, votes: 25679, margin: 439, runnerUp: 'Baldev Sharma' },
  { acNo: 40, name: 'Nadaun', winner: 'Sukhvinder Singh Sukhu', party: 'INC', year: 2017, votes: 30980, margin: 2349, runnerUp: 'Vijay Agnihotri' },
  { acNo: 41, name: 'Chintpurni', winner: 'Balvir Singh', party: 'BJP', year: 2017, votes: 32488, margin: 8579, runnerUp: 'Kuldip Kumar' },
  { acNo: 42, name: 'Gagret', winner: 'Rajesh Thakur', party: 'BJP', year: 2017, votes: 33977, margin: 9320, runnerUp: 'Rakesh Kalia' },
  { acNo: 43, name: 'Haroli', winner: 'Mukesh Agnihotri', party: 'INC', year: 2017, votes: 35095, margin: 7377, runnerUp: 'Ram Kumar' },
  { acNo: 44, name: 'Una', winner: 'Satpal Raizada', party: 'INC', year: 2017, votes: 31360, margin: 3196, runnerUp: 'Satpal Singh Satti' },
  { acNo: 45, name: 'Kutlehar', winner: 'Virender Kanwar', party: 'BJP', year: 2017, votes: 31101, margin: 5606, runnerUp: 'Vivek Sharma' },
  { acNo: 46, name: 'Jhanduta', winner: 'Jeet Ram Katwal', party: 'BJP', year: 2017, votes: 29030, margin: 4962, runnerUp: 'Beeru Ram Kishore' },
  { acNo: 47, name: 'Ghumarwin', winner: 'Rajinder Garg', party: 'BJP', year: 2017, votes: 34846, margin: 10435, runnerUp: 'Rajesh Dharmani' },
  { acNo: 48, name: 'Bilaspur', winner: 'Subhash Thakur', party: 'BJP', year: 2017, votes: 31547, margin: 6862, runnerUp: 'Bumber Thakur' },
  { acNo: 49, name: 'Sri Naina Deviji', winner: 'Ram Lal Thakur', party: 'INC', year: 2017, votes: 28119, margin: 1042, runnerUp: 'Randhir Sharma' },
  { acNo: 50, name: 'Arki', winner: 'Virbhadra Singh', party: 'INC', year: 2017, votes: 34499, margin: 6051, runnerUp: 'Rattan Singh Pal' },
  { acNo: 51, name: 'Nalagarh', winner: 'Lakhvinder Singh Rana', party: 'INC', year: 2017, votes: 25872, margin: 1242, runnerUp: 'Krishan Lal Thakur' },
  { acNo: 52, name: 'Doon', winner: 'Paramjeet Singh Pammi', party: 'BJP', year: 2017, votes: 29701, margin: 4319, runnerUp: 'Ram Kumar' },
  { acNo: 53, name: 'Solan', winner: 'Dhani Ram Shandil', party: 'INC', year: 2017, votes: 26200, margin: 671, runnerUp: 'Rajesh Kashyap' },
  { acNo: 54, name: 'Kasauli', winner: 'Rajiv Saizal', party: 'BJP', year: 2017, votes: 23656, margin: 442, runnerUp: 'Vinod Sultanpuri' },
  { acNo: 55, name: 'Pachhad', winner: 'Suresh Kumar Kashyap', party: 'BJP', year: 2017, votes: 30243, margin: 6427, runnerUp: 'Gangu Ram Musafir' },
  { acNo: 56, name: 'Nahan', winner: 'Dr. Rajeev Bindal', party: 'BJP', year: 2017, votes: 31563, margin: 3990, runnerUp: 'Ajay Solankey' },
  { acNo: 57, name: 'Sri Renukaji', winner: 'Vinay Kumar', party: 'INC', year: 2017, votes: 22028, margin: 5160, runnerUp: 'Balbir Singh' },
  { acNo: 58, name: 'Paonta Sahib', winner: 'Sukh Ram Chaudhary', party: 'BJP', year: 2017, votes: 36011, margin: 12619, runnerUp: 'Kirnesh Jung' },
  { acNo: 59, name: 'Shillai', winner: 'Harsh Wardhan Singh Chauhan', party: 'INC', year: 2017, votes: 29171, margin: 4125, runnerUp: 'Baldev Singh' },
  { acNo: 60, name: 'Chopal', winner: 'Balbir Singh Verma', party: 'BJP', year: 2017, votes: 29537, margin: 4587, runnerUp: 'Subhash Chand Manglate' },
  { acNo: 61, name: 'Theog', winner: 'Rakesh Singha', party: 'CPM', year: 2017, votes: 24791, margin: 1983, runnerUp: 'Rakesh Verma' },
  { acNo: 62, name: 'Kasumpati', winner: 'Anirudh Singh', party: 'INC', year: 2017, votes: 22061, margin: 9397, runnerUp: 'Vijay Jyoti' },
  { acNo: 63, name: 'Shimla', winner: 'Suresh Bhardwaj', party: 'BJP', year: 2017, votes: 14012, margin: 1903, runnerUp: 'Harish Janartha' },
  { acNo: 64, name: 'Shimla Rural', winner: 'Vikramaditya Singh', party: 'INC', year: 2017, votes: 28275, margin: 4880, runnerUp: 'Dr. Pramod Sharma' },
  { acNo: 65, name: 'Jubbal-Kotkhai', winner: 'Narinder Bragta', party: 'BJP', year: 2017, votes: 27466, margin: 1062, runnerUp: 'Rohit Thakur' },
  { acNo: 66, name: 'Rampur', winner: 'Nand Lal', party: 'INC', year: 2017, votes: 25730, margin: 4037, runnerUp: 'Prem Singh Daraik' },
  { acNo: 67, name: 'Rohru', winner: 'Mohan Lal Brakta', party: 'INC', year: 2017, votes: 29134, margin: 9408, runnerUp: 'Shashi Bala' },
  { acNo: 68, name: 'Kinnaur', winner: 'Jagat Singh Negi', party: 'INC', year: 2017, votes: 20029, margin: 120, runnerUp: 'Tejwant Singh Negi' },
];

export const hp2017Map = new Map(HP_2017_RESULTS.map((r) => [r.acNo, r]));

export function getHP2017Result(acNo: number): HPHistoricalResult | undefined {
  return hp2017Map.get(acNo);
}
