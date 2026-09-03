/**
 * Himachal Pradesh Assembly Constituencies — 68 seats (2022)
 *
 * Source: Election Commission of India (ECI)
 * General Election to Legislative Assembly of Himachal Pradesh 2022
 */

export interface HPConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2022: string;
  winnerName2022: string;
  winnerVotes2022: number;
  runnerUp2022: string;
  margin2022: number;
  currentParty: string;
}

export const HP_CONSTITUENCIES: HPConstituencySeed[] = [
  { acNo: 1, name: 'Churah', localName: 'चुराह', district: 'Chamba', type: 'SC', winner2022: 'BJP', winnerName2022: 'Hans Raj', winnerVotes2022: 0, runnerUp2022: 'Yashwant Singh - 51.49', margin2022: 0, currentParty: 'BJP' },
  { acNo: 2, name: 'Bharmour', localName: 'भरमौर', district: 'Chamba', type: 'ST', winner2022: 'BJP', winnerName2022: 'Janak Raj', winnerVotes2022: 0, runnerUp2022: 'Thakur Singh Bharmouri - 53.68', margin2022: 0, currentParty: 'BJP' },
  { acNo: 3, name: 'Chamba', localName: 'चम्बा', district: 'Chamba', type: 'GEN', winner2022: 'INC', winnerName2022: 'Neeraj Nayar', winnerVotes2022: 0, runnerUp2022: 'Neelam Nayyar - 53.28', margin2022: 0, currentParty: 'INC' },
  { acNo: 4, name: 'Dalhousie', localName: 'डलहौजी', district: 'Chamba', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dhavinder Singh Thakur', winnerVotes2022: 0, runnerUp2022: 'Asha Kumari - 57.49', margin2022: 0, currentParty: 'BJP' },
  { acNo: 5, name: 'Bhattiyat', localName: 'भटियात', district: 'Chamba', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kuldeep Singh Pathania', winnerVotes2022: 0, runnerUp2022: 'Bikram Singh - 43.73', margin2022: 0, currentParty: 'INC' },
  { acNo: 6, name: 'Nurpur', localName: 'नूरपुर', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ranbir Singh', winnerVotes2022: 0, runnerUp2022: 'Ajay Mahajan - 62.45', margin2022: 0, currentParty: 'BJP' },
  { acNo: 7, name: 'Indora', localName: 'इन्दौरा', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Malender Rajan', winnerVotes2022: 0, runnerUp2022: 'Reeta Devi - 45.55', margin2022: 0, currentParty: 'INC' },
  { acNo: 8, name: 'Fatehpur', localName: 'फतेहपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Bhawani Singh Pathania', winnerVotes2022: 0, runnerUp2022: 'Rakesh Pathania - 51.83', margin2022: 0, currentParty: 'INC' },
  { acNo: 9, name: 'Jawali', localName: 'जवाली', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chander Kumar', winnerVotes2022: 0, runnerUp2022: 'Sanjay Guleria - 51.22', margin2022: 0, currentParty: 'INC' },
  { acNo: 10, name: 'Dehra', localName: 'देहरा', district: 'Kangra', type: 'GEN', winner2022: 'IND', winnerName2022: 'Hoshyar Singh', winnerVotes2022: 0, runnerUp2022: 'Rajesh Sharma - 37.96', margin2022: 0, currentParty: 'IND' },
  { acNo: 11, name: 'Jaswan-Pragpur', localName: 'जसवां-परागपुर', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bikram Singh', winnerVotes2022: 0, runnerUp2022: 'Surinder Singh Mankotia - 38.27', margin2022: 0, currentParty: 'BJP' },
  { acNo: 12, name: 'Jawalamukhi', localName: 'ज्वालामुखी', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sanjay Rattan', winnerVotes2022: 0, runnerUp2022: 'Ravinder Singh - 46.48', margin2022: 0, currentParty: 'INC' },
  { acNo: 13, name: 'Jaisinghpur', localName: 'जयसिंहपुर', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Yadvinder Goma', winnerVotes2022: 0, runnerUp2022: 'Ravinder Kumar Dhiman - 50.43', margin2022: 0, currentParty: 'INC' },
  { acNo: 14, name: 'Sullah', localName: 'सुलह', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vipin Singh Parmar', winnerVotes2022: 0, runnerUp2022: 'Jagjiwan Paul - 48.35', margin2022: 0, currentParty: 'BJP' },
  { acNo: 15, name: 'Nagrota', localName: 'नगरोटा', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'R.S. Bali', winnerVotes2022: 0, runnerUp2022: 'Arun Kumar - 59.88', margin2022: 0, currentParty: 'INC' },
  { acNo: 16, name: 'Kangra', localName: 'कांगड़ा', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pawan Kumar Kajal', winnerVotes2022: 0, runnerUp2022: 'Surinder Kumar - 55.64', margin2022: 0, currentParty: 'BJP' },
  { acNo: 17, name: 'Shahpur', localName: 'शाहपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kewal Singh Pathania', winnerVotes2022: 0, runnerUp2022: 'Sarveen Choudhary - 55.39', margin2022: 0, currentParty: 'INC' },
  { acNo: 18, name: 'Dharamshala', localName: 'धर्मशाला', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sudhir Sharma', winnerVotes2022: 0, runnerUp2022: 'Rakesh Kumar - 45.53', margin2022: 0, currentParty: 'INC' },
  { acNo: 19, name: 'Palampur', localName: 'पालमपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ashish Butail', winnerVotes2022: 0, runnerUp2022: 'Trilok Kapoor - 53.72', margin2022: 0, currentParty: 'INC' },
  { acNo: 20, name: 'Baijnath', localName: 'बैजनाथ', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Kishori Lal', winnerVotes2022: 0, runnerUp2022: 'Mulkh Raj - 50.32', margin2022: 0, currentParty: 'INC' },
  { acNo: 21, name: 'Lahaul and Spiti', localName: 'लाहौल और स्पीति', district: 'Lahaul and Spiti', type: 'ST', winner2022: 'INC', winnerName2022: 'Ravi Thakur', winnerVotes2022: 0, runnerUp2022: 'Ram Lal Markanda - 52.91', margin2022: 0, currentParty: 'INC' },
  { acNo: 22, name: 'Manali', localName: 'मनाली', district: 'Kullu', type: 'GEN', winner2022: 'INC', winnerName2022: 'Bhuvneshwar Gaur', winnerVotes2022: 0, runnerUp2022: 'Govind Singh Thakur - 49.46', margin2022: 0, currentParty: 'INC' },
  { acNo: 23, name: 'Kullu', localName: 'कुल्लू', district: 'Kullu', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sunder Singh Thakur', winnerVotes2022: 0, runnerUp2022: 'Narottam Singh - 42.56', margin2022: 0, currentParty: 'INC' },
  { acNo: 24, name: 'Banjar', localName: 'बंजार', district: 'Kullu', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surender Shourie', winnerVotes2022: 0, runnerUp2022: 'Khimi Ram - 40.44', margin2022: 0, currentParty: 'BJP' },
  { acNo: 25, name: 'Anni', localName: 'आनी', district: 'Kullu', type: 'SC', winner2022: 'BJP', winnerName2022: 'Lokender Kumar', winnerVotes2022: 0, runnerUp2022: 'Paras Ram - 35.77', margin2022: 0, currentParty: 'BJP' },
  { acNo: 26, name: 'Karsog', localName: 'करसोग', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Deepraj Kapoor', winnerVotes2022: 0, runnerUp2022: 'Mahesh Raj - 57.36', margin2022: 0, currentParty: 'BJP' },
  { acNo: 27, name: 'Sundernagar', localName: 'सुन्दरनगर', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rakesh Jamwal', winnerVotes2022: 0, runnerUp2022: 'Sohan Lal - 44.16', margin2022: 0, currentParty: 'BJP' },
  { acNo: 28, name: 'Nachan', localName: 'नाचन', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vinod Kumar', winnerVotes2022: 0, runnerUp2022: 'Naresh Kumar - 46.40', margin2022: 0, currentParty: 'BJP' },
  { acNo: 29, name: 'Seraj', localName: 'सराज', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jai Ram Thakur', winnerVotes2022: 0, runnerUp2022: 'Chet Ram - 75.70', margin2022: 0, currentParty: 'BJP' },
  { acNo: 30, name: 'Darang', localName: 'दरंग', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Puran Chand Thakur', winnerVotes2022: 0, runnerUp2022: 'Kaul Singh Thakur - 49.76', margin2022: 0, currentParty: 'BJP' },
  { acNo: 31, name: 'Jogindernagar', localName: 'जोगिन्दरनगर', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prakash Rana', winnerVotes2022: 0, runnerUp2022: 'Surender Paul Thakur - 47.87', margin2022: 0, currentParty: 'BJP' },
  { acNo: 32, name: 'Dharampur', localName: 'धरमपुर', district: 'Mandi', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chander Shekhar Thakur', winnerVotes2022: 0, runnerUp2022: 'Rajat Thakur - 51.90', margin2022: 0, currentParty: 'INC' },
  { acNo: 33, name: 'Mandi', localName: 'मण्डी', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Sharma', winnerVotes2022: 0, runnerUp2022: 'Champa Thakur - 53.37', margin2022: 0, currentParty: 'BJP' },
  { acNo: 34, name: 'Balh', localName: 'बल्ह', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Inder Singh  Gandhi', winnerVotes2022: 0, runnerUp2022: 'Prakash Chaudhary - 49.12', margin2022: 0, currentParty: 'BJP' },
  { acNo: 35, name: 'Sarkaghat', localName: 'सरकाघाट', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dalip Thakur', winnerVotes2022: 0, runnerUp2022: 'Pawan Kumar - 42.89', margin2022: 0, currentParty: 'BJP' },
  { acNo: 36, name: 'Bhoranj', localName: 'भोरंज', district: 'Hamirpur', type: 'SC', winner2022: 'INC', winnerName2022: 'Suresh Kumar', winnerVotes2022: 0, runnerUp2022: 'Dr. Anil Dhaman - 43.16', margin2022: 0, currentParty: 'INC' },
  { acNo: 37, name: 'Sujanpur', localName: 'सुजानपुर', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajinder Rana', winnerVotes2022: 0, runnerUp2022: 'Ranjit Singh Rana - 49.79', margin2022: 0, currentParty: 'INC' },
  { acNo: 38, name: 'Hamirpur', localName: 'हमीरपुर', district: 'Hamirpur', type: 'GEN', winner2022: 'IND', winnerName2022: 'Ashish Sharma', winnerVotes2022: 0, runnerUp2022: 'Pushpinder Vwema - 47.09', margin2022: 0, currentParty: 'IND' },
  { acNo: 39, name: 'Barsar', localName: 'बड़सर', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Inderdutt Lakhanpal', winnerVotes2022: 0, runnerUp2022: 'Maya Sharma - 48.16', margin2022: 0, currentParty: 'INC' },
  { acNo: 40, name: 'Nadaun', localName: 'नादौन', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sukhvinder Singh Sukhu', winnerVotes2022: 0, runnerUp2022: 'Vijay Kumar - 50.88', margin2022: 0, currentParty: 'INC' },
  { acNo: 41, name: 'Chintpurni', localName: 'चिन्तपूर्णी', district: 'Una', type: 'SC', winner2022: 'INC', winnerName2022: 'Sudarshan Singh Babloo', winnerVotes2022: 0, runnerUp2022: 'Balbir Singh - 52.7', margin2022: 0, currentParty: 'INC' },
  { acNo: 42, name: 'Gagret', localName: 'गगरेट', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chaitanya Sharma', winnerVotes2022: 0, runnerUp2022: 'Rajesh Thakur - 61.15', margin2022: 0, currentParty: 'INC' },
  { acNo: 43, name: 'Haroli', localName: 'हरोली', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Mukesh Agnihotri', winnerVotes2022: 0, runnerUp2022: 'Ram Kumar - 55.33', margin2022: 0, currentParty: 'INC' },
  { acNo: 44, name: 'Una', localName: 'ऊना', district: 'Una', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Satpal Singh Satti', winnerVotes2022: 0, runnerUp2022: 'Satpal Raizada - 50.05', margin2022: 0, currentParty: 'BJP' },
  { acNo: 45, name: 'Kutlehar', localName: 'कुटलैहड़', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Davinder Kumar Bhutto', winnerVotes2022: 0, runnerUp2022: 'Virender Kanwar - 54.84', margin2022: 0, currentParty: 'INC' },
  { acNo: 46, name: 'Jhanduta', localName: 'झंडूता', district: 'Bilaspur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Jeet Ram Katwal', winnerVotes2022: 0, runnerUp2022: 'Vivek Kumar - 46.72', margin2022: 0, currentParty: 'BJP' },
  { acNo: 47, name: 'Ghumarwin', localName: 'घुमारवीं', district: 'Bilaspur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajesh Dharmani', winnerVotes2022: 0, runnerUp2022: 'Rajinder Garg - 51.96', margin2022: 0, currentParty: 'INC' },
  { acNo: 48, name: 'Bilaspur', localName: 'बिलासपुर', district: 'Bilaspur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Trilok Jamwal', winnerVotes2022: 0, runnerUp2022: 'Bumber Thakur - 47.76', margin2022: 0, currentParty: 'BJP' },
  { acNo: 49, name: 'Sri Naina Deviji', localName: 'श्री नैना देवीजी', district: 'Bilaspur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Randhir Sharma', winnerVotes2022: 0, runnerUp2022: 'Ram Lal Thakur - 47.23', margin2022: 0, currentParty: 'BJP' },
  { acNo: 50, name: 'Arki', localName: 'अर्की', district: 'Solan', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sanjay Awasthy', winnerVotes2022: 0, runnerUp2022: 'Rajender - 42.02', margin2022: 0, currentParty: 'INC' },
  { acNo: 51, name: 'Nalagarh', localName: 'नालागढ़', district: 'Solan', type: 'GEN', winner2022: 'IND', winnerName2022: 'K. L. Thakur', winnerVotes2022: 0, runnerUp2022: 'Hardeep Singh Bhawa - 44.51', margin2022: 0, currentParty: 'IND' },
  { acNo: 52, name: 'Doon', localName: 'दून', district: 'Solan', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ram Kumar', winnerVotes2022: 0, runnerUp2022: 'Paramjeet Singh Pammi - 51.89', margin2022: 0, currentParty: 'INC' },
  { acNo: 53, name: 'Solan', localName: 'सोलन', district: 'Solan', type: 'SC', winner2022: 'INC', winnerName2022: 'Dhani Ram Shandil', winnerVotes2022: 0, runnerUp2022: 'Rajesh Kashyap - 51.54', margin2022: 0, currentParty: 'INC' },
  { acNo: 54, name: 'Kasauli', localName: 'कसौली', district: 'Solan', type: 'SC', winner2022: 'INC', winnerName2022: 'Vinod Kumar Sultanpuri', winnerVotes2022: 0, runnerUp2022: 'Rajiv Saizal - 52.1', margin2022: 0, currentParty: 'INC' },
  { acNo: 55, name: 'Pachhad', localName: 'पच्छाद', district: 'Sirmaur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Reena Kashyap', winnerVotes2022: 0, runnerUp2022: 'Dayal Pyari - 34.52', margin2022: 0, currentParty: 'BJP' },
  { acNo: 56, name: 'Nahan', localName: 'नाहन', district: 'Sirmaur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ajay Solanki', winnerVotes2022: 0, runnerUp2022: 'Rajeev Bindal - 50.08', margin2022: 0, currentParty: 'INC' },
  { acNo: 57, name: 'Sri Renukaji', localName: 'श्री रेणुकाजी', district: 'Sirmaur', type: 'SC', winner2022: 'INC', winnerName2022: 'Vinay Kumar', winnerVotes2022: 0, runnerUp2022: 'Narain Singh - 47.99', margin2022: 0, currentParty: 'INC' },
  { acNo: 58, name: 'Paonta Sahib', localName: 'पांवटा साहिब', district: 'Sirmaur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sukh Ram Chaudhary', winnerVotes2022: 0, runnerUp2022: 'Kirnesh Jung - 46.93', margin2022: 0, currentParty: 'BJP' },
  { acNo: 59, name: 'Shillai', localName: 'शिलाई', district: 'Sirmaur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Harshwardhan Chauhan', winnerVotes2022: 0, runnerUp2022: 'Baldev Singh Tomar - 49.17', margin2022: 0, currentParty: 'INC' },
  { acNo: 60, name: 'Chopal', localName: 'चौपाल', district: 'Shimla', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Balbir Singh Verma', winnerVotes2022: 0, runnerUp2022: 'Rajneesh Kimta - 41.58', margin2022: 0, currentParty: 'BJP' },
  { acNo: 61, name: 'Theog', localName: 'ठियोग', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kuldeep Singh Rathore', winnerVotes2022: 0, runnerUp2022: 'Ajay Shyam - 29.47', margin2022: 0, currentParty: 'INC' },
  { acNo: 62, name: 'Kasumpti', localName: 'कसुम्पटी', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Anirudh Singh', winnerVotes2022: 0, runnerUp2022: 'Suresh Bhardwaj - 55.43', margin2022: 0, currentParty: 'INC' },
  { acNo: 63, name: 'Shimla', localName: 'शिमला', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Harish Janartha', winnerVotes2022: 0, runnerUp2022: 'Jatin Puri - 51.35', margin2022: 0, currentParty: 'INC' },
  { acNo: 64, name: 'Shimla Rural', localName: 'शिमला ग्रामीण', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Vikramaditya Singh', winnerVotes2022: 0, runnerUp2022: 'Ravi Kumar Mehta - 60.19', margin2022: 0, currentParty: 'INC' },
  { acNo: 65, name: 'Jubbal-Kotkhai', localName: 'जुब्बल-कोटखाई', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rohit Thakur', winnerVotes2022: 0, runnerUp2022: 'Chetan Singh Bragta - 52.65', margin2022: 0, currentParty: 'INC' },
  { acNo: 66, name: 'Rampur', localName: 'रामपुर', district: 'Shimla', type: 'SC', winner2022: 'INC', winnerName2022: 'Nand Lal', winnerVotes2022: 0, runnerUp2022: 'Kaul Singh - 49.07', margin2022: 0, currentParty: 'INC' },
  { acNo: 67, name: 'Rohru', localName: 'रोहड़ू', district: 'Shimla', type: 'SC', winner2022: 'INC', winnerName2022: 'Mohan Lal Brakta', winnerVotes2022: 0, runnerUp2022: 'Shashi Bala - 61.90', margin2022: 0, currentParty: 'INC' },
  { acNo: 68, name: 'Kinnaur', localName: 'किन्नौर', district: 'Kinnaur', type: 'ST', winner2022: 'INC', winnerName2022: 'Jagat Singh Negi', winnerVotes2022: 0, runnerUp2022: 'Surat Negi - 46.95', margin2022: 0, currentParty: 'INC' },
];

export function getHPConstituency(acNo: number): HPConstituencySeed | undefined {
  return HP_CONSTITUENCIES.find(c => c.acNo === acNo);
}
