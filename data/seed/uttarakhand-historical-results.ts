/**
 * Uttarakhand — Previous Election Results (2017)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2017.
 *         Full per-constituency winner + party, official AC numbering 1-70.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface UKHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const UK_2017_RESULTS: UKHistoricalResult[] = [
  { acNo: 1, name: 'Purola', winner: 'Rajkumar', party: 'INC', year: 2017, votes: 17798, margin: 1013, runnerUp: 'Malchand' },
  { acNo: 2, name: 'Yamunotri', winner: 'Kedar Singh', party: 'BJP', year: 2017, votes: 19800, margin: 5960, runnerUp: 'Sanjay Dobhal' },
  { acNo: 3, name: 'Gangotri', winner: 'Gopal Singh Rawat', party: 'BJP', year: 2017, votes: 25683, margin: 9610, runnerUp: 'Vijaypal Singh Sajwan' },
  { acNo: 4, name: 'Badrinath', winner: 'Mahendra Bhatt', party: 'BJP', year: 2017, votes: 29676, margin: 5634, runnerUp: 'Rajendra Singh Bhandari' },
  { acNo: 5, name: 'Tharali', winner: 'Magan Lal Shah', party: 'BJP', year: 2017, votes: 25810, margin: 4921, runnerUp: 'Dr. Jeet Ram' },
  { acNo: 6, name: 'Karnprayag', winner: 'Surendra Singh Negi', party: 'BJP', year: 2017, votes: 28159, margin: 7549, runnerUp: 'Dr. Ansuya Parsad Maikhuri' },
  { acNo: 7, name: 'Kedarnath', winner: 'Manoj Rawat', party: 'INC', year: 2017, votes: 13906, margin: 869, runnerUp: 'Kuldeep Singh Rawat' },
  { acNo: 8, name: 'Rudraprayag', winner: 'Bharat Singh', party: 'BJP', year: 2017, votes: 29333, margin: 14632, runnerUp: 'Laxmi Singh Rana' },
  { acNo: 9, name: 'Ghanshali', winner: 'Shakti Lal Shah', party: 'BJP', year: 2017, votes: 22103, margin: 11653, runnerUp: 'Dhanilal Shah' },
  { acNo: 10, name: 'Deoprayag', winner: 'Vinod Kandari', party: 'BJP', year: 2017, votes: 13824, margin: 3499, runnerUp: 'Diwakar Bhatt' },
  { acNo: 11, name: 'Narendranagar', winner: 'Subodh Uniyal', party: 'BJP', year: 2017, votes: 24104, margin: 4972, runnerUp: 'Om Gopal Rawat' },
  { acNo: 12, name: 'Pratapnagar', winner: 'Vijay Singh Panwar(Guddu Bhai)', party: 'BJP', year: 2017, votes: 15058, margin: 1939, runnerUp: 'Vikram Singh Negi' },
  { acNo: 13, name: 'Tehri', winner: 'Dhan Singh Negi', party: 'BJP', year: 2017, votes: 20896, margin: 6840, runnerUp: 'Dinesh Dhanai' },
  { acNo: 14, name: 'Dhanolti', winner: 'Pritam Singh Panwar', party: 'IND', year: 2017, votes: 17811, margin: 1615, runnerUp: 'Narayan Singh Rana' },
  { acNo: 15, name: 'Chakrata', winner: 'Pritam Singh', party: 'INC', year: 2017, votes: 34968, margin: 1543, runnerUp: 'Madhu Chauhan' },
  { acNo: 16, name: 'Vikasnagar', winner: 'Munna Singh Chauhan', party: 'BJP', year: 2017, votes: 38895, margin: 6418, runnerUp: 'Navprabhat' },
  { acNo: 17, name: 'Sahaspur', winner: 'Sahdev Singh Pundir', party: 'BJP', year: 2017, votes: 44055, margin: 18863, runnerUp: 'Kishore Upadhaya' },
  { acNo: 18, name: 'Dharampur', winner: 'Vinod Chamoli', party: 'BJP', year: 2017, votes: 53828, margin: 10953, runnerUp: 'Dinesh Agarwal' },
  { acNo: 19, name: 'Raipur', winner: 'Umesh Sharma Kau', party: 'BJP', year: 2017, votes: 59764, margin: 36771, runnerUp: 'Prabhu Lal' },
  { acNo: 20, name: 'Rajpur Road', winner: 'Khajan Dass', party: 'BJP', year: 2017, votes: 36601, margin: 8632, runnerUp: 'Raj Kumar' },
  { acNo: 21, name: 'Dehradun Cantt.', winner: 'Shri Harbans Kapoor', party: 'BJP', year: 2017, votes: 41142, margin: 16670, runnerUp: 'Shri Suryakant Dhasmana' },
  { acNo: 22, name: 'Mussoorie', winner: 'Ganesh Joshi', party: 'BJP', year: 2017, votes: 41322, margin: 12077, runnerUp: 'Godawari Thapli' },
  { acNo: 23, name: 'Doiwala', winner: 'Trivendra Singh Rawat', party: 'BJP', year: 2017, votes: 58502, margin: 24869, runnerUp: 'Hira Singh Bisht' },
  { acNo: 24, name: 'Rishikesh', winner: 'Premchand Aggarwal', party: 'BJP', year: 2017, votes: 45082, margin: 14801, runnerUp: 'Rajpal Singh Kharola' },
  { acNo: 25, name: 'Hardwar', winner: 'Madan Kaushik', party: 'BJP', year: 2017, votes: 61742, margin: 35927, runnerUp: 'Brahmswroop Brahmchari' },
  { acNo: 26, name: 'B.H.E.L. Ranipur', winner: 'Adesh Chauhan', party: 'BJP', year: 2017, votes: 56644, margin: 22240, runnerUp: 'Ambrish Kumar' },
  { acNo: 27, name: 'Jwalapur', winner: 'Suresh Rathor', party: 'BJP', year: 2017, votes: 29513, margin: 4788, runnerUp: 'S.P.Singh Engineer' },
  { acNo: 28, name: 'Bhagwanpur', winner: 'Mamta Rakesh', party: 'INC', year: 2017, votes: 44882, margin: 2513, runnerUp: 'Subodh Rakesh' },
  { acNo: 29, name: 'Jhabrera', winner: 'Desraj Karanwal', party: 'BJP', year: 2017, votes: 32146, margin: 2253, runnerUp: 'Rajpal Singh' },
  { acNo: 30, name: 'Pirankaliyar', winner: 'Furkan Ahmad', party: 'INC', year: 2017, votes: 29243, margin: 1349, runnerUp: 'Jaibhagwan' },
  { acNo: 31, name: 'Roorkee', winner: 'Pradeep Batra', party: 'BJP', year: 2017, votes: 40000, margin: 12542, runnerUp: 'Suresh Chand Jain' },
  { acNo: 32, name: 'Khanpur', winner: 'Kunwar Parnav Singh Champion', party: 'BJP', year: 2017, votes: 53192, margin: 13735, runnerUp: 'Mufti Riyasat Ali' },
  { acNo: 33, name: 'Manglore', winner: 'Qazi Mohd Nizamuddin', party: 'INC', year: 2017, votes: 31352, margin: 2668, runnerUp: 'Sarwat Kareem Ansari' },
  { acNo: 34, name: 'Laksar', winner: 'Sanjay Gupta', party: 'BJP', year: 2017, votes: 25248, margin: 1604, runnerUp: 'Haji Tasleem Ahmad' },
  { acNo: 35, name: 'Hardwar Rural', winner: 'Yatishwaranand', party: 'BJP', year: 2017, votes: 44964, margin: 12278, runnerUp: 'Harish Chandra Singh Rawat' },
  { acNo: 36, name: 'Yamkeshwar', winner: 'Ritu Khanduri Bhushan', party: 'BJP', year: 2017, votes: 19671, margin: 8982, runnerUp: 'Renu Bisht' },
  { acNo: 37, name: 'Pauri', winner: 'Mukesh Singh Koli', party: 'BJP', year: 2017, votes: 26469, margin: 7030, runnerUp: 'Naval Kishor' },
  { acNo: 38, name: 'Srinagar', winner: 'Dr. Dhan Singh Rawat', party: 'BJP', year: 2017, votes: 30816, margin: 8698, runnerUp: 'Ganesh Godiyal' },
  { acNo: 39, name: 'Chaubattakhal', winner: 'Satpal Maharaj', party: 'BJP', year: 2017, votes: 20921, margin: 7354, runnerUp: 'Rajpal Singh Bisht' },
  { acNo: 40, name: 'Lansdowne', winner: 'Daleep Singh Rawat', party: 'BJP', year: 2017, votes: 22246, margin: 6475, runnerUp: 'Lt. Gen(Retd) Tejpal Singh Rawat P.V.S.M V.S.M' },
  { acNo: 41, name: 'Kotdwar', winner: '(Dr) Harak Singh Rawat', party: 'BJP', year: 2017, votes: 39859, margin: 11318, runnerUp: 'Surendra Singh Negi' },
  { acNo: 42, name: 'Dharchula', winner: 'Harish Singh', party: 'INC', year: 2017, votes: 25597, margin: 3085, runnerUp: 'Virendra Singh Pal' },
  { acNo: 43, name: 'Didihat', winner: 'Vishan Singh', party: 'BJP', year: 2017, votes: 17392, margin: 2368, runnerUp: 'Kishan Bhandari' },
  { acNo: 44, name: 'Pithoragarh', winner: 'Prakash Pant', party: 'BJP', year: 2017, votes: 32941, margin: 2684, runnerUp: 'Mayukh Mahar' },
  { acNo: 45, name: 'Gangolihat', winner: 'Meena Gangola', party: 'BJP', year: 2017, votes: 20418, margin: 805, runnerUp: 'Narayan Ram Arya' },
  { acNo: 46, name: 'Kapkote', winner: 'Balwant Singh Bhouriyal', party: 'BJP', year: 2017, votes: 27213, margin: 5982, runnerUp: 'Lalit Farswan' },
  { acNo: 47, name: 'Bageshwar', winner: 'Chandan Ram Dass', party: 'BJP', year: 2017, votes: 33792, margin: 14567, runnerUp: 'Balkrishan' },
  { acNo: 48, name: 'Dwarahat', winner: 'Mahesh Singh Negi', party: 'BJP', year: 2017, votes: 20221, margin: 6593, runnerUp: 'Madan Singh Bisht' },
  { acNo: 49, name: 'Salt', winner: 'Surender Singh Jeena', party: 'BJP', year: 2017, votes: 21581, margin: 2904, runnerUp: 'Ganga Pancholi' },
  { acNo: 50, name: 'Ranikhet', winner: 'Karan Mahara', party: 'INC', year: 2017, votes: 19035, margin: 4981, runnerUp: 'Ajay Bhatt' },
  { acNo: 51, name: 'Someshwar', winner: 'Rekha Arya', party: 'BJP', year: 2017, votes: 21780, margin: 710, runnerUp: 'Rajendra Barakoti' },
  { acNo: 52, name: 'Almora', winner: 'Raghunath Singh Chauhan', party: 'BJP', year: 2017, votes: 26464, margin: 5379, runnerUp: 'Manoj Tewari' },
  { acNo: 53, name: 'Jageshwar', winner: 'Govind Singh Kunjwal', party: 'INC', year: 2017, votes: 24132, margin: 399, runnerUp: 'Subhash Pandey' },
  { acNo: 54, name: 'Lohaghat', winner: 'Puran Singh Fartyal', party: 'BJP', year: 2017, votes: 27685, margin: 834, runnerUp: 'Khushal Singh' },
  { acNo: 55, name: 'Champawat', winner: 'Kailash Chandra Gahtori', party: 'BJP', year: 2017, votes: 36601, margin: 17360, runnerUp: 'Hemesh Kharkwal' },
  { acNo: 56, name: 'Lalkuwa', winner: 'Naveen Chandra Dumka', party: 'BJP', year: 2017, votes: 44293, margin: 27108, runnerUp: 'Harish Chandra Durgapal' },
  { acNo: 57, name: 'Bhimtal', winner: 'Ram Singh Kaira', party: 'IND', year: 2017, votes: 18878, margin: 3446, runnerUp: 'Govind Singh Bisht' },
  { acNo: 58, name: 'Nainital', winner: 'Sanjeev Arya', party: 'BJP', year: 2017, votes: 30036, margin: 7247, runnerUp: 'Sarita Arya' },
  { acNo: 59, name: 'Haldwani', winner: 'Indira Hridayesh', party: 'INC', year: 2017, votes: 43786, margin: 6557, runnerUp: 'Jogendra Pal Singh Rautela' },
  { acNo: 60, name: 'Kaladhungi', winner: 'Bansidhar Bhagat', party: 'BJP', year: 2017, votes: 45704, margin: 20597, runnerUp: 'Prakash Joshi' },
  { acNo: 61, name: 'Ramnagar', winner: 'Diwan Singh Bisht', party: 'BJP', year: 2017, votes: 35839, margin: 8611, runnerUp: 'Ranjeet Rawat' },
  { acNo: 62, name: 'Jaspur', winner: 'Adesh Singh Chauhan', party: 'INC', year: 2017, votes: 42551, margin: 4204, runnerUp: 'Dr. Shailendra Mohan Singhal' },
  { acNo: 63, name: 'Kashipur', winner: 'Harbhajan Singh Cheema', party: 'BJP', year: 2017, votes: 50156, margin: 20114, runnerUp: 'Manoj Joshi' },
  { acNo: 64, name: 'Bajpur', winner: 'Yashpal Arya', party: 'BJP', year: 2017, votes: 54965, margin: 12636, runnerUp: 'Suneeta Tamta' },
  { acNo: 65, name: 'Gadarpur', winner: 'Arvind Pandey', party: 'BJP', year: 2017, votes: 41530, margin: 14106, runnerUp: 'Rajendra Pal Singh' },
  { acNo: 66, name: 'Rudrapur', winner: 'Rajkumar Thukral', party: 'BJP', year: 2017, votes: 68754, margin: 24771, runnerUp: 'Tilak Raj Behar' },
  { acNo: 67, name: 'Kichha', winner: 'Rajesh Shukla', party: 'BJP', year: 2017, votes: 40363, margin: 2127, runnerUp: 'Harish Rawat' },
  { acNo: 68, name: 'Sitarganj', winner: 'Saurabh Bahuguna', party: 'BJP', year: 2017, votes: 50597, margin: 28450, runnerUp: 'Malti Biswas' },
  { acNo: 69, name: 'Nanak Matta', winner: 'Dr. Prem Singh', party: 'BJP', year: 2017, votes: 42785, margin: 9531, runnerUp: 'Gopal Singh Rana' },
  { acNo: 70, name: 'Khatima', winner: 'Pushkar Singh Dhami', party: 'BJP', year: 2017, votes: 29539, margin: 2709, runnerUp: 'Bhuwan Chandra Kapri' },
];

export const uk2017Map = new Map(UK_2017_RESULTS.map((r) => [r.acNo, r]));

export function getUK2017Result(acNo: number): UKHistoricalResult | undefined {
  return uk2017Map.get(acNo);
}
