/**
 * Jammu & Kashmir — Previous Election Results (2014)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2014.
 *         Full per-constituency winner + party, official statutory AC numbering 1-87
 *         under the Constitution of Jammu and Kashmir (pre-2019 delimitation).
 *         Delimitation to 90 assembly seats occurred in 2022 for the 2024 election.
 *         Corrected under CTO Directive 138 / CRIT-F02-02 (eliminated fake post-2022 AC 88-90).
 */

export interface JKHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const JK_2014_RESULTS: JKHistoricalResult[] = [
  { acNo: 1, name: 'Karnah', winner: 'Raja Manzoor Ahmad', party: 'JKPDP', year: 2014, votes: 12371 },
  { acNo: 2, name: 'Kupwara', winner: 'Bashir Ahmad Dar', party: 'JKPC', year: 2014, votes: 24754 },
  { acNo: 3, name: 'Lolab', winner: 'Abdul Haq Khan', party: 'JKPDP', year: 2014, votes: 29408 },
  { acNo: 4, name: 'Handwara', winner: 'Sajjad Gani Lone', party: 'JKPC', year: 2014, votes: 29355 },
  { acNo: 5, name: 'Langate', winner: 'Sheikh Abdul Rashid', party: 'IND', year: 2014, votes: 18172 },
  { acNo: 6, name: 'Uri', winner: 'Md. Shafi', party: 'JKNC', year: 2014, votes: 24359 },
  { acNo: 7, name: 'Rafiabad', winner: 'Yawar Ahmad Mir', party: 'JKPDP', year: 2014, votes: 17918 },
  { acNo: 8, name: 'Sopore', winner: 'Abdul Rashid Dar', party: 'INC', year: 2014, votes: 8429 },
  { acNo: 9, name: 'Gurez', winner: 'Nazir Ahmad Khan', party: 'JKNC', year: 2014, votes: 6664 },
  { acNo: 10, name: 'Bandipora', winner: 'Usman Abdul Majid', party: 'INC', year: 2014, votes: 25084 },
  { acNo: 11, name: 'Sonawari', winner: 'Md. Akbar Lone', party: 'JKNC', year: 2014, votes: 32567 },
  { acNo: 12, name: 'Sangrama', winner: 'Basharat Ah. Bukhari', party: 'JKPDP', year: 2014, votes: 12146 },
  { acNo: 13, name: 'Baramulla', winner: 'Javid Hassan Baig', party: 'JKPDP', year: 2014, votes: 14418 },
  { acNo: 14, name: 'Gulmarg', winner: 'Mohd. Abass Wani', party: 'JKPDP', year: 2014, votes: 22957 },
  { acNo: 15, name: 'Pattan', winner: 'Imran Reza Ansari', party: 'JKPDP', year: 2014, votes: 21218 },
  { acNo: 16, name: 'Kangan', winner: 'Altaf Ahmad', party: 'JKNC', year: 2014, votes: 25812 },
  { acNo: 17, name: 'Ganderbal', winner: 'Ishfaq Ahmad Sk.', party: 'JKNC', year: 2014, votes: 19478 },
  { acNo: 18, name: 'Hazratbal', winner: 'Asiya Naqash', party: 'JKPDP', year: 2014, votes: 13234 },
  { acNo: 19, name: 'Zadibal', winner: 'Abid Hussain Ansari', party: 'JKPDP', year: 2014, votes: 7852 },
  { acNo: 20, name: 'Eidgah', winner: 'Mubarak Gul', party: 'JKNC', year: 2014, votes: 6766 },
  { acNo: 21, name: 'Khanyar', winner: 'Ali Md. Sagar', party: 'JKNC', year: 2014, votes: 6505 },
  { acNo: 22, name: 'Habba Kadal', winner: 'Shamim Firdous', party: 'JKNC', year: 2014, votes: 4955 },
  { acNo: 23, name: 'Amira Kadal', winner: 'Altaf Bukhari', party: 'JKPDP', year: 2014, votes: 11726 },
  { acNo: 24, name: 'Sonawar', winner: 'Md. Ashraf Mir', party: 'JKPDP', year: 2014, votes: 14283 },
  { acNo: 25, name: 'Batmaloo', winner: 'Noor Mohd Sheikh', party: 'JKPDP', year: 2014, votes: 12542 },
  { acNo: 26, name: 'Chadoora', winner: 'Javaid Mustafa Mir', party: 'JKPDP', year: 2014, votes: 25770 },
  { acNo: 27, name: 'Budgam', winner: 'Aga Syed Ruhullah', party: 'JKNC', year: 2014, votes: 30090 },
  { acNo: 28, name: 'Beerwah', winner: 'Omar Abdullah', party: 'JKNC', year: 2014, votes: 23717 },
  { acNo: 29, name: 'Khan Sahib', winner: 'Hakeem Yasin', party: 'JKPDP', year: 2014, votes: 26649 },
  { acNo: 30, name: 'Chrar-I-Sharief', winner: 'Ghulam Nabi Lone', party: 'JKPDP', year: 2014, votes: 32849 },
  { acNo: 31, name: 'Tral', winner: 'Mushtaq Ahmad Shah', party: 'JKPDP', year: 2014, votes: 12415 },
  { acNo: 32, name: 'Pampore', winner: 'Zahoor Ahmad Mir', party: 'JKPDP', year: 2014, votes: 16239 },
  { acNo: 33, name: 'Pulwama', winner: 'Mohd. Khalil Band', party: 'JKPDP', year: 2014, votes: 11631 },
  { acNo: 34, name: 'Rajpora', winner: 'Haseeb Drabu', party: 'JKPDP', year: 2014, votes: 18103 },
  { acNo: 35, name: 'Wachi', winner: 'Aijaz Ahmad Mir', party: 'JKPDP', year: 2014, votes: 15610 },
  { acNo: 36, name: 'Shopian', winner: 'Md. Yousuf Bhat', party: 'JKPDP', year: 2014, votes: 14262 },
  { acNo: 37, name: 'Noorabad', winner: 'Ab. Majid Padder', party: 'JKPDP', year: 2014, votes: 28698 },
  { acNo: 38, name: 'Kulgam', winner: 'Md. Yousuf Tarigami', party: 'CPI(M)', year: 2014, votes: 20574 },
  { acNo: 39, name: 'Hom Shali Bugh', winner: 'Ab. Majeed', party: 'JKNC', year: 2014, votes: 11406 },
  { acNo: 40, name: 'Anantnag', winner: 'Mufti Md. Sayeed', party: 'JKPDP', year: 2014, votes: 16983 },
  { acNo: 41, name: 'Devsar', winner: 'Md. Amin Bhat', party: 'INC', year: 2014, votes: 20162 },
  { acNo: 42, name: 'Dooru', winner: 'Farooq Ahmad Andrabi', party: 'JKPDP', year: 2014, votes: 18150 },
  { acNo: 43, name: 'Kokernag', winner: 'Ab. Rahim Rather', party: 'JKPDP', year: 2014, votes: 24284 },
  { acNo: 44, name: 'Shangus', winner: 'Gulzar Ahmad Wani', party: 'INC', year: 2014, votes: 21085 },
  { acNo: 45, name: 'Bijbehara', winner: 'Abdul Rehman Veeri', party: 'JKPDP', year: 2014, votes: 23581 },
  { acNo: 46, name: 'Pahalgam', winner: 'Altaf Ahmad Wani', party: 'JKNC', year: 2014, votes: 25232 },
  { acNo: 47, name: 'Nubra', winner: 'Deldan Namgail', party: 'INC', year: 2014, votes: 3936 },
  { acNo: 48, name: 'Leh', winner: 'Nawang Rigzin Jora', party: 'INC', year: 2014, votes: 27585 },
  { acNo: 49, name: 'Kargil', winner: 'Asgar Ali Karbalai', party: 'INC', year: 2014, votes: 22911 },
  { acNo: 50, name: 'Zanskar', winner: 'Syed Md. Baqir Rizvi', party: 'IND', year: 2014, votes: 6763 },
  { acNo: 51, name: 'Kishtwar', winner: 'Sunil Kumar Sharma', party: 'BJP', year: 2014, votes: 28054 },
  { acNo: 52, name: 'Inderwal', winner: 'Ghulam Md. Saroori', party: 'INC', year: 2014, votes: 29754 },
  { acNo: 53, name: 'Doda', winner: 'Shakti Raj Parihar', party: 'BJP', year: 2014, votes: 24572 },
  { acNo: 54, name: 'Bhaderwah', winner: 'Daleep Singh Parihar', party: 'BJP', year: 2014, votes: 25953 },
  { acNo: 55, name: 'Ramban (SC)', winner: 'Neelam Kumar Langeh', party: 'BJP', year: 2014, votes: 25349 },
  { acNo: 56, name: 'Banihal', winner: 'Vikar Rasool Wani', party: 'INC', year: 2014, votes: 17671 },
  { acNo: 57, name: 'Gulab Garh', winner: 'Mumtaz Ahmed', party: 'INC', year: 2014, votes: 17964 },
  { acNo: 58, name: 'Reasi', winner: 'Ajay Nanda', party: 'BJP', year: 2014, votes: 22017 },
  { acNo: 59, name: 'Gool Arnas', winner: 'Ajaz Ahmad Khan', party: 'INC', year: 2014, votes: 22966 },
  { acNo: 60, name: 'Udhampur', winner: 'Pawan Kumar Gupta', party: 'IND', year: 2014, votes: 36226 },
  { acNo: 61, name: 'Chenani (SC)', winner: 'Dina Nath Bhagat', party: 'BJP', year: 2014, votes: 33047 },
  { acNo: 62, name: 'Ram Nagar', winner: 'Ranbir Singh Pathania', party: 'BJP', year: 2014, votes: 45891 },
  { acNo: 63, name: 'Bani', winner: 'Jewan Lal', party: 'BJP', year: 2014, votes: 12841 },
  { acNo: 64, name: 'Basohli', winner: 'Lal Singh', party: 'BJP', year: 2014, votes: 29808 },
  { acNo: 65, name: 'Kathua', winner: 'Rajiv Jasrotia', party: 'BJP', year: 2014, votes: 35670 },
  { acNo: 66, name: 'Billawar', winner: 'Nirmal Kumar Singh', party: 'BJP', year: 2014, votes: 43447 },
  { acNo: 67, name: 'Hira Nagar (SC)', winner: 'Kuldeep Raj', party: 'BJP', year: 2014, votes: 55399 },
  { acNo: 68, name: 'Samba (SC)', winner: 'Devinder Kumar Manyal', party: 'BJP', year: 2014, votes: 34075 },
  { acNo: 69, name: 'Vijay Pur', winner: 'Chander Prakash', party: 'BJP', year: 2014, votes: 38607 },
  { acNo: 70, name: 'Nagrota', winner: 'Devender Singh Rana', party: 'JKNC', year: 2014, votes: 23678 },
  { acNo: 71, name: 'Gandhi Nagar', winner: 'Kavinder Gupta', party: 'BJP', year: 2014, votes: 56679 },
  { acNo: 72, name: 'Jammu East', winner: 'Rajesh Gupta', party: 'BJP', year: 2014, votes: 21776 },
  { acNo: 73, name: 'Jammu West', winner: 'Sat Paul Sharma', party: 'BJP', year: 2014, votes: 69626 },
  { acNo: 74, name: 'Bishnah', winner: 'Kamal Verma', party: 'JKNC', year: 2014, votes: 29380 },
  { acNo: 75, name: 'Ranbir Singh Pura (SC)', winner: 'Gagan Bhagat', party: 'BJP', year: 2014, votes: 25696 },
  { acNo: 76, name: 'Suchet Garh', winner: 'Sham Lal Choudhary', party: 'BJP', year: 2014, votes: 19971 },
  { acNo: 77, name: 'Marh', winner: 'Sukh Nandan Kumar', party: 'BJP', year: 2014, votes: 25396 },
  { acNo: 78, name: 'Raipur Domana (SC)', winner: 'Bali Bhagat', party: 'BJP', year: 2014, votes: 49134 },
  { acNo: 79, name: 'Akhnoor', winner: 'Rajeev Sharma', party: 'BJP', year: 2014, votes: 41901 },
  { acNo: 80, name: 'Chhamb (SC)', winner: 'Kirshan Lal', party: 'BJP', year: 2014, votes: 36033 },
  { acNo: 81, name: 'Nowshera', winner: 'Ravinder Raina', party: 'BJP', year: 2014, votes: 37374 },
  { acNo: 82, name: 'Darhal', winner: 'Ch. Zulfkar Ali', party: 'JKPDP', year: 2014, votes: 24381 },
  { acNo: 83, name: 'Rajouri', winner: 'Qamar Hussain', party: 'JKPDP', year: 2014, votes: 26954 },
  { acNo: 84, name: 'Kala Kote', winner: 'Abdul Ghani Kohli', party: 'BJP', year: 2014, votes: 25225 },
  { acNo: 85, name: 'Surankote', winner: 'Ch. Mohd Akram', party: 'INC', year: 2014, votes: 30584 },
  { acNo: 86, name: 'Mendhar', winner: 'Javed Ahmed Rana', party: 'JKNC', year: 2014, votes: 31186 },
  { acNo: 87, name: 'Poonch Haveli', winner: 'Shah Mohd. Tantray', party: 'JKPDP', year: 2014, votes: 19488 },
];

export const jk2014Map = new Map(JK_2014_RESULTS.map((r) => [r.acNo, r]));

export function getJK2014Result(acNo: number): JKHistoricalResult | undefined {
  return jk2014Map.get(acNo);
}
