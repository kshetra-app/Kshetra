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
  runnerUpName2022?: string;
  margin2022: number;
  currentParty: string;
}

export const HP_CONSTITUENCIES: HPConstituencySeed[] = [
  { acNo: 1, name: 'Churah', localName: 'चुराह', district: 'Chamba', type: 'SC', winner2022: 'BJP', winnerName2022: 'Hans Raj', winnerVotes2022: 32095, runnerUp2022: 'INC', runnerUpName2022: 'Yashwant Singh', margin2022: 2642, currentParty: 'BJP' },
  { acNo: 2, name: 'Bharmour', localName: 'भरमौर', district: 'Chamba', type: 'ST', winner2022: 'BJP', winnerName2022: 'Dr. Janak Raj', winnerVotes2022: 30336, runnerUp2022: 'INC', runnerUpName2022: 'Thakur Singh Bharmouri', margin2022: 5172, currentParty: 'BJP' },
  { acNo: 3, name: 'Chamba', localName: 'चम्बा', district: 'Chamba', type: 'GEN', winner2022: 'INC', winnerName2022: 'Neeraj Nayar', winnerVotes2022: 32783, runnerUp2022: 'BJP', runnerUpName2022: 'Neelam Nayyar', margin2022: 7782, currentParty: 'INC' },
  { acNo: 4, name: 'Dalhousie', localName: 'डलहौजी', district: 'Chamba', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dhavinder Singh', winnerVotes2022: 33488, runnerUp2022: 'INC', runnerUpName2022: 'Asha Kumari', margin2022: 9918, currentParty: 'BJP' },
  { acNo: 5, name: 'Bhattiyat', localName: 'भटियात', district: 'Chamba', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kuldeep Singh Pathania', winnerVotes2022: 25989, runnerUp2022: 'BJP', runnerUpName2022: 'Bikram Singh', margin2022: 1567, currentParty: 'INC' },
  { acNo: 6, name: 'Nurpur', localName: 'नूरपुर', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ranbir Singh', winnerVotes2022: 44132, runnerUp2022: 'INC', runnerUpName2022: 'Ajay Mahajan', margin2022: 18752, currentParty: 'BJP' },
  { acNo: 7, name: 'Indora', localName: 'इन्दौरा', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Malender Rajan', winnerVotes2022: 30797, runnerUp2022: 'BJP', runnerUpName2022: 'Reeta Devi', margin2022: 2250, currentParty: 'INC' },
  { acNo: 8, name: 'Fatehpur', localName: 'फतेहपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Bhawani Singh Pathania', winnerVotes2022: 33238, runnerUp2022: 'BJP', runnerUpName2022: 'Rakesh Pathania', margin2022: 7354, currentParty: 'INC' },
  { acNo: 9, name: 'Jawali', localName: 'जवाली', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chander Kumar', winnerVotes2022: 38243, runnerUp2022: 'BJP', runnerUpName2022: 'Sanjay Guleria', margin2022: 3031, currentParty: 'INC' },
  { acNo: 10, name: 'Dehra', localName: 'देहरा', district: 'Kangra', type: 'GEN', winner2022: 'IND', winnerName2022: 'Hoshyar Singh', winnerVotes2022: 22997, runnerUp2022: 'INC', runnerUpName2022: 'Dr. Rajesh Sharma', margin2022: 3877, currentParty: 'IND' },
  { acNo: 11, name: 'Jaswan-Pragpur', localName: 'जसवां-परागपुर', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bikram Singh', winnerVotes2022: 22658, runnerUp2022: 'INC', runnerUpName2022: 'Surinder Singh Mankotia', margin2022: 1789, currentParty: 'BJP' },
  { acNo: 12, name: 'Jawalamukhi', localName: 'ज्वालामुखी', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sanjay Rattan', winnerVotes2022: 27827, runnerUp2022: 'BJP', runnerUpName2022: 'Ravinder Singh', margin2022: 6404, currentParty: 'INC' },
  { acNo: 13, name: 'Jaisinghpur', localName: 'जयसिंहपुर', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Yadvinder Goma', winnerVotes2022: 28058, runnerUp2022: 'BJP', runnerUpName2022: 'Ravinder Kumar Dhiman', margin2022: 2696, currentParty: 'INC' },
  { acNo: 14, name: 'Sullah', localName: 'सुलह', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vipin Singh Parmar', winnerVotes2022: 36670, runnerUp2022: 'IND', runnerUpName2022: 'Jagjiwan Paul', margin2022: 7112, currentParty: 'BJP' },
  { acNo: 15, name: 'Nagrota', localName: 'नगरोटा', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'R.S. Bali', winnerVotes2022: 42079, runnerUp2022: 'BJP', runnerUpName2022: 'Arun Kumar', margin2022: 15892, currentParty: 'INC' },
  { acNo: 16, name: 'Kangra', localName: 'कांगड़ा', district: 'Kangra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pawan Kumar Kajal', winnerVotes2022: 35239, runnerUp2022: 'INC', runnerUpName2022: 'Surinder Kumar', margin2022: 19834, currentParty: 'BJP' },
  { acNo: 17, name: 'Shahpur', localName: 'शाहपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kewal Singh', winnerVotes2022: 36603, runnerUp2022: 'BJP', runnerUpName2022: 'Sarveen', margin2022: 12243, currentParty: 'INC' },
  { acNo: 18, name: 'Dharamshala', localName: 'धर्मशाला', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sudhir Sharma', winnerVotes2022: 27323, runnerUp2022: 'BJP', runnerUpName2022: 'Rakesh Kumar', margin2022: 3285, currentParty: 'INC' },
  { acNo: 19, name: 'Palampur', localName: 'पालमपुर', district: 'Kangra', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ashish Butail', winnerVotes2022: 30874, runnerUp2022: 'BJP', runnerUpName2022: 'Trilok Kapoor', margin2022: 5328, currentParty: 'INC' },
  { acNo: 20, name: 'Baijnath', localName: 'बैजनाथ', district: 'Kangra', type: 'SC', winner2022: 'INC', winnerName2022: 'Kishori Lal', winnerVotes2022: 29338, runnerUp2022: 'BJP', runnerUpName2022: 'Mulkh Raj', margin2022: 3446, currentParty: 'INC' },
  { acNo: 21, name: 'Lahaul and Spiti', localName: 'लाहौल और स्पीति', district: 'Lahaul and Spiti', type: 'ST', winner2022: 'INC', winnerName2022: 'Ravi Thakur', winnerVotes2022: 9948, runnerUp2022: 'BJP', runnerUpName2022: 'Dr.Ram Lal Markanda', margin2022: 1616, currentParty: 'INC' },
  { acNo: 22, name: 'Manali', localName: 'मनाली', district: 'Kullu', type: 'GEN', winner2022: 'INC', winnerName2022: 'Bhuvneshwar Gaur', winnerVotes2022: 29892, runnerUp2022: 'BJP', runnerUpName2022: 'Govind Singh Thakur', margin2022: 2957, currentParty: 'INC' },
  { acNo: 23, name: 'Kullu', localName: 'कुल्लू', district: 'Kullu', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sunder Singh Thakur', winnerVotes2022: 30286, runnerUp2022: 'BJP', runnerUpName2022: 'Narotam Singh', margin2022: 4103, currentParty: 'INC' },
  { acNo: 24, name: 'Banjar', localName: 'बंजार', district: 'Kullu', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surender Shourie', winnerVotes2022: 25038, runnerUp2022: 'INC', runnerUpName2022: 'Khimi Ram', margin2022: 4334, currentParty: 'BJP' },
  { acNo: 25, name: 'Anni', localName: 'आनी', district: 'Kullu', type: 'SC', winner2022: 'BJP', winnerName2022: 'Lokender Kumar', winnerVotes2022: 24133, runnerUp2022: 'IND', runnerUpName2022: 'Paras Ram', margin2022: 6778, currentParty: 'BJP' },
  { acNo: 26, name: 'Karsog', localName: 'करसोग', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Deep Raj', winnerVotes2022: 34512, runnerUp2022: 'INC', runnerUpName2022: 'Mahesh Raj', margin2022: 10534, currentParty: 'BJP' },
  { acNo: 27, name: 'Sundernagar', localName: 'सुन्दरनगर', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rakesh Kumar', winnerVotes2022: 29432, runnerUp2022: 'INC', runnerUpName2022: 'Sohan Lal', margin2022: 8125, currentParty: 'BJP' },
  { acNo: 28, name: 'Nachan', localName: 'नाचन', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vinod Kumar', winnerVotes2022: 33200, runnerUp2022: 'INC', runnerUpName2022: 'Naresh Kumar', margin2022: 8956, currentParty: 'BJP' },
  { acNo: 29, name: 'Seraj', localName: 'सराज', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jai Ram Thakur', winnerVotes2022: 53562, runnerUp2022: 'INC', runnerUpName2022: 'Chet Ram', margin2022: 38183, currentParty: 'BJP' },
  { acNo: 30, name: 'Darang', localName: 'दरंग', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Puran Chand', winnerVotes2022: 36572, runnerUp2022: 'INC', runnerUpName2022: 'Kaul Singh', margin2022: 618, currentParty: 'BJP' },
  { acNo: 31, name: 'Jogindernagar', localName: 'जोगिन्दरनगर', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prakash Prem Kumar', winnerVotes2022: 33782, runnerUp2022: 'INC', runnerUpName2022: 'Thakur Surender Pal', margin2022: 4339, currentParty: 'BJP' },
  { acNo: 32, name: 'Dharampur', localName: 'धरमपुर', district: 'Mandi', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chander Shekhar', winnerVotes2022: 31063, runnerUp2022: 'BJP', runnerUpName2022: 'Rajat Thakur', margin2022: 3026, currentParty: 'INC' },
  { acNo: 33, name: 'Mandi', localName: 'मण्डी', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Sharma', winnerVotes2022: 31303, runnerUp2022: 'INC', runnerUpName2022: 'Champa Thakur', margin2022: 10006, currentParty: 'BJP' },
  { acNo: 34, name: 'Balh', localName: 'बल्ह', district: 'Mandi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Inder Singh', winnerVotes2022: 31792, runnerUp2022: 'INC', runnerUpName2022: 'Prakash Chaudhary', margin2022: 1307, currentParty: 'BJP' },
  { acNo: 35, name: 'Sarkaghat', localName: 'सरकाघाट', district: 'Mandi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dalip Thakur', winnerVotes2022: 27346, runnerUp2022: 'INC', runnerUpName2022: 'Pawan Kumar', margin2022: 1807, currentParty: 'BJP' },
  { acNo: 36, name: 'Bhoranj', localName: 'भोरंज', district: 'Hamirpur', type: 'SC', winner2022: 'INC', winnerName2022: 'Suresh Kumar', winnerVotes2022: 24779, runnerUp2022: 'BJP', runnerUpName2022: 'Dr. Anil Dhiman', margin2022: 60, currentParty: 'INC' },
  { acNo: 37, name: 'Sujanpur', localName: 'सुजानपुर', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajinder Singh', winnerVotes2022: 27679, runnerUp2022: 'BJP', runnerUpName2022: 'Ranjit Singh Rana', margin2022: 399, currentParty: 'INC' },
  { acNo: 38, name: 'Hamirpur', localName: 'हमीरपुर', district: 'Hamirpur', type: 'GEN', winner2022: 'IND', winnerName2022: 'Ashish Sharma', winnerVotes2022: 25916, runnerUp2022: 'INC', runnerUpName2022: 'Pushpinder Verma', margin2022: 12899, currentParty: 'IND' },
  { acNo: 39, name: 'Barsar', localName: 'बड़सर', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Inder Dutt Lakhanpal', winnerVotes2022: 30293, runnerUp2022: 'BJP', runnerUpName2022: 'Maya Sharma', margin2022: 13792, currentParty: 'INC' },
  { acNo: 40, name: 'Nadaun', localName: 'नादौन', district: 'Hamirpur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sukhvinder Singh', winnerVotes2022: 36142, runnerUp2022: 'BJP', runnerUpName2022: 'Vijay Kumar', margin2022: 3363, currentParty: 'INC' },
  { acNo: 41, name: 'Chintpurni', localName: 'चिन्तपूर्णी', district: 'Una', type: 'SC', winner2022: 'INC', winnerName2022: 'Sudarshan Singh Babloo', winnerVotes2022: 32712, runnerUp2022: 'BJP', runnerUpName2022: 'Balbir Singh', margin2022: 4858, currentParty: 'INC' },
  { acNo: 42, name: 'Gagret', localName: 'गगरेट', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Chaitanya Sharma', winnerVotes2022: 40767, runnerUp2022: 'BJP', runnerUpName2022: 'Rajesh Thakur', margin2022: 15685, currentParty: 'INC' },
  { acNo: 43, name: 'Haroli', localName: 'हरोली', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Mukesh Agnihotri', winnerVotes2022: 38652, runnerUp2022: 'BJP', runnerUpName2022: 'Ram Kumar', margin2022: 9148, currentParty: 'INC' },
  { acNo: 44, name: 'Una', localName: 'ऊना', district: 'Una', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Satpal Singh Satti', winnerVotes2022: 33974, runnerUp2022: 'INC', runnerUpName2022: 'Satpal Singh Raizada', margin2022: 1736, currentParty: 'BJP' },
  { acNo: 45, name: 'Kutlehar', localName: 'कुटलैहड़', district: 'Una', type: 'GEN', winner2022: 'INC', winnerName2022: 'Davinder Kumar', winnerVotes2022: 36636, runnerUp2022: 'BJP', runnerUpName2022: 'Virender Kanwar', margin2022: 7579, currentParty: 'INC' },
  { acNo: 46, name: 'Jhanduta', localName: 'झंडूता', district: 'Bilaspur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Jeet Ram Katwal', winnerVotes2022: 28268, runnerUp2022: 'INC', runnerUpName2022: 'Vivek Kumar', margin2022: 5799, currentParty: 'BJP' },
  { acNo: 47, name: 'Ghumarwin', localName: 'घुमारवीं', district: 'Bilaspur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajesh Dharmani', winnerVotes2022: 35378, runnerUp2022: 'BJP', runnerUpName2022: 'Rajinder Garg', margin2022: 5611, currentParty: 'INC' },
  { acNo: 48, name: 'Bilaspur', localName: 'बिलासपुर', district: 'Bilaspur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Trilok Jamwal', winnerVotes2022: 30988, runnerUp2022: 'INC', runnerUpName2022: 'Bumber Thakur', margin2022: 276, currentParty: 'BJP' },
  { acNo: 49, name: 'Sri Naina Deviji', localName: 'श्री नैना देवीजी', district: 'Bilaspur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Randhir Sharma', winnerVotes2022: 29403, runnerUp2022: 'INC', runnerUpName2022: 'Ram Lal Thakur', margin2022: 171, currentParty: 'BJP' },
  { acNo: 50, name: 'Arki', localName: 'अर्की', district: 'Solan', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sanjay', winnerVotes2022: 30897, runnerUp2022: 'IND', runnerUpName2022: 'Rajender', margin2022: 4822, currentParty: 'INC' },
  { acNo: 51, name: 'Nalagarh', localName: 'नालागढ़', district: 'Solan', type: 'GEN', winner2022: 'IND', winnerName2022: 'K. L. Thakur', winnerVotes2022: 33427, runnerUp2022: 'INC', runnerUpName2022: 'Hardeep Singh Bawa', margin2022: 13264, currentParty: 'IND' },
  { acNo: 52, name: 'Doon', localName: 'दून', district: 'Solan', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ram Kumar', winnerVotes2022: 32038, runnerUp2022: 'BJP', runnerUpName2022: 'Paramjeet Singh Pammi', margin2022: 6811, currentParty: 'INC' },
  { acNo: 53, name: 'Solan', localName: 'सोलन', district: 'Solan', type: 'SC', winner2022: 'INC', winnerName2022: 'Dhani Ram Shandil', winnerVotes2022: 30089, runnerUp2022: 'BJP', runnerUpName2022: 'Rajesh Kashyap', margin2022: 3858, currentParty: 'INC' },
  { acNo: 54, name: 'Kasauli', localName: 'कसौली', district: 'Solan', type: 'SC', winner2022: 'INC', winnerName2022: 'Vinod Sultanpuri', winnerVotes2022: 28200, runnerUp2022: 'BJP', runnerUpName2022: 'Rajiv Saizal', margin2022: 6768, currentParty: 'INC' },
  { acNo: 55, name: 'Pachhad', localName: 'पच्छाद', district: 'Sirmaur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Reena', winnerVotes2022: 21215, runnerUp2022: 'INC', runnerUpName2022: 'Dayal Pyari', margin2022: 3857, currentParty: 'BJP' },
  { acNo: 56, name: 'Nahan', localName: 'नाहन', district: 'Sirmaur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Ajay Solanki', winnerVotes2022: 35291, runnerUp2022: 'BJP', runnerUpName2022: 'Dr. Rajeev Bindal', margin2022: 1639, currentParty: 'INC' },
  { acNo: 57, name: 'Sri Renukaji', localName: 'श्री रेणुकाजी', district: 'Sirmaur', type: 'SC', winner2022: 'INC', winnerName2022: 'Vinay Kumar', winnerVotes2022: 28642, runnerUp2022: 'BJP', runnerUpName2022: 'Narain Singh', margin2022: 860, currentParty: 'INC' },
  { acNo: 58, name: 'Paonta Sahib', localName: 'पांवटा साहिब', district: 'Sirmaur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sukh Ram', winnerVotes2022: 31008, runnerUp2022: 'INC', runnerUpName2022: 'Kirnesh Jung', margin2022: 8596, currentParty: 'BJP' },
  { acNo: 59, name: 'Shillai', localName: 'शिलाई', district: 'Sirmaur', type: 'GEN', winner2022: 'INC', winnerName2022: 'Harshwardhan Chauhan', winnerVotes2022: 32093, runnerUp2022: 'BJP', runnerUpName2022: 'Baldev Singh', margin2022: 382, currentParty: 'INC' },
  { acNo: 60, name: 'Chopal', localName: 'चौपाल', district: 'Shimla', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sh. Balbir Singh Verma', winnerVotes2022: 25873, runnerUp2022: 'INC', runnerUpName2022: 'Sh. Rajneesh Kimta', margin2022: 5033, currentParty: 'BJP' },
  { acNo: 61, name: 'Theog', localName: 'ठियोग', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kuldeep Singh Rathore', winnerVotes2022: 19447, runnerUp2022: 'BJP', runnerUpName2022: 'Ajay Shyam', margin2022: 5269, currentParty: 'INC' },
  { acNo: 62, name: 'Kasumpti', localName: 'कसुम्पटी', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Anirudh Singh', winnerVotes2022: 25759, runnerUp2022: 'BJP', runnerUpName2022: 'Suresh Bhardwaj', margin2022: 8655, currentParty: 'INC' },
  { acNo: 63, name: 'Shimla', localName: 'शिमला', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Harish Janartha', winnerVotes2022: 15803, runnerUp2022: 'BJP', runnerUpName2022: 'Sanjay Sood', margin2022: 3037, currentParty: 'INC' },
  { acNo: 64, name: 'Shimla Rural', localName: 'शिमला ग्रामीण', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Vikramaditya Singh', winnerVotes2022: 35269, runnerUp2022: 'BJP', runnerUpName2022: 'Ravi Kumar Mehta', margin2022: 13860, currentParty: 'INC' },
  { acNo: 65, name: 'Jubbal-Kotkhai', localName: 'जुब्बल-कोटखाई', district: 'Shimla', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rohit Thakur', winnerVotes2022: 31393, runnerUp2022: 'BJP', runnerUpName2022: 'Chetan Singh Bragta', margin2022: 5069, currentParty: 'INC' },
  { acNo: 66, name: 'Rampur', localName: 'रामपुर', district: 'Shimla', type: 'SC', winner2022: 'INC', winnerName2022: 'Nand Lal', winnerVotes2022: 28397, runnerUp2022: 'BJP', runnerUpName2022: 'Kaul Singh', margin2022: 567, currentParty: 'INC' },
  { acNo: 67, name: 'Rohru', localName: 'रोहड़ू', district: 'Shimla', type: 'SC', winner2022: 'INC', winnerName2022: 'Mohan Lal Brakta', winnerVotes2022: 34327, runnerUp2022: 'BJP', runnerUpName2022: 'Shashi Bala', margin2022: 19339, currentParty: 'INC' },
  { acNo: 68, name: 'Kinnaur', localName: 'किन्नौर', district: 'Kinnaur', type: 'ST', winner2022: 'INC', winnerName2022: 'Jagat Singh Negi', winnerVotes2022: 20696, runnerUp2022: 'BJP', runnerUpName2022: 'Surat Negi', margin2022: 6964, currentParty: 'INC' },
];

export function getHPConstituency(acNo: number): HPConstituencySeed | undefined {
  return HP_CONSTITUENCIES.find(c => c.acNo === acNo);
}
