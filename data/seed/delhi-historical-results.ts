/**
 * Delhi — Previous Election Results (2015)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2015.
 *         Full per-constituency winner + party, official AC numbering 1-70.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface DLHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const DL_2015_RESULTS: DLHistoricalResult[] = [
  { acNo: 1, name: 'Nerela', winner: 'Sharad Kumar', party: 'AAAP', year: 2015, votes: 96143, margin: 40292, runnerUp: 'Neel Daman Khatri' },
  { acNo: 2, name: 'Burari', winner: 'Sanjeev Jha', party: 'AAAP', year: 2015, votes: 124724, margin: 67950, runnerUp: 'Gopal Jha' },
  { acNo: 3, name: 'Timarpur', winner: 'Pankaj Pushkar', party: 'AAAP', year: 2015, votes: 64477, margin: 20647, runnerUp: 'Rajni Abbi' },
  { acNo: 4, name: 'Adarsh Nagar', winner: 'Pawan Kumar Sharma', party: 'AAAP', year: 2015, votes: 54026, margin: 20741, runnerUp: 'Ram Kishan Singhal' },
  { acNo: 5, name: 'Badli', winner: 'Ajesh Yadav', party: 'AAAP', year: 2015, votes: 72795, margin: 35376, runnerUp: 'Devender Yadav' },
  { acNo: 6, name: 'Rithala', winner: 'Mohinder Goyal', party: 'AAAP', year: 2015, votes: 93470, margin: 29251, runnerUp: 'Kulwant Rana' },
  { acNo: 7, name: 'Bawana', winner: 'Ved Parkash', party: 'AAAP', year: 2015, votes: 108928, margin: 50557, runnerUp: 'Gugan Singh' },
  { acNo: 8, name: 'Mundka', winner: 'Sukhvir Singh', party: 'AAAP', year: 2015, votes: 94206, margin: 40826, runnerUp: 'Azad Singh' },
  { acNo: 9, name: 'Kirari', winner: 'Rituraj Govind', party: 'AAAP', year: 2015, votes: 97727, margin: 45172, runnerUp: 'Anil Jha' },
  { acNo: 10, name: 'Sultanpur Majra', winner: 'Sandeep Kumar', party: 'AAAP', year: 2015, votes: 80269, margin: 64439, runnerUp: 'Parbhu Dayal' },
  { acNo: 11, name: 'Nangloi Jat', winner: 'Raghuvinder Shokeen', party: 'AAAP', year: 2015, votes: 83259, margin: 37024, runnerUp: 'Manoj Kumar Shokeen' },
  { acNo: 12, name: 'Mangol Puri', winner: 'Rakhi Birla', party: 'AAAP', year: 2015, votes: 60534, margin: 22699, runnerUp: 'Raj Kumar Chauhan' },
  { acNo: 13, name: 'Rohini', winner: 'Vijender Gupta', party: 'BJP', year: 2015, votes: 59866, margin: 5367, runnerUp: 'C.L. Gupta Advocate' },
  { acNo: 14, name: 'Shalimar Bagh', winner: 'Bandana Kumari', party: 'AAAP', year: 2015, votes: 62656, margin: 10978, runnerUp: 'Rekha Gupta' },
  { acNo: 15, name: 'Shakur Basti', winner: 'Satyendar Jain', party: 'AAAP', year: 2015, votes: 51530, margin: 3133, runnerUp: 'S C Vats' },
  { acNo: 16, name: 'Tri Nagar', winner: 'Jitender Singh Tomar', party: 'AAAP', year: 2015, votes: 63012, margin: 22311, runnerUp: 'Nand Kishore Garg' },
  { acNo: 17, name: 'Wazirpur', winner: 'Rajesh Gupta', party: 'AAAP', year: 2015, votes: 61208, margin: 22044, runnerUp: 'Dr. Mahander Nagpal' },
  { acNo: 18, name: 'Model Town', winner: 'Akhilesh Pati Tripathi', party: 'AAAP', year: 2015, votes: 54628, margin: 16706, runnerUp: 'Vivek Garg' },
  { acNo: 19, name: 'Sadar Bazar', winner: 'Som Dutt', party: 'AAAP', year: 2015, votes: 67507, margin: 34315, runnerUp: 'Parveen Kumar Jain' },
  { acNo: 20, name: 'Chandni Chowk', winner: 'Alka Lamba', party: 'AAAP', year: 2015, votes: 36756, margin: 18287, runnerUp: 'Suman Kumar Gupta' },
  { acNo: 21, name: 'Matia Mahal', winner: 'Asim Ahmed Khan', party: 'AAAP', year: 2015, votes: 47584, margin: 26096, runnerUp: 'Shoaib Iqbal' },
  { acNo: 22, name: 'Ballimaran', winner: 'Imran Hussain', party: 'AAAP', year: 2015, votes: 57118, margin: 33877, runnerUp: 'Shayam Lal Morwal' },
  { acNo: 23, name: 'Karol Bagh', winner: 'Vishesh Ravi', party: 'AAAP', year: 2015, votes: 67429, margin: 32880, runnerUp: 'Yogender Chandoliya' },
  { acNo: 24, name: 'Patel Nagar', winner: 'Hazari Lal Chauhan', party: 'AAAP', year: 2015, votes: 68868, margin: 34638, runnerUp: 'Krishna Tirath' },
  { acNo: 25, name: 'Moti Nagar', winner: 'Shiv Charan Goel', party: 'AAAP', year: 2015, votes: 60223, margin: 15221, runnerUp: 'Subhash Sachdeva' },
  { acNo: 26, name: 'Madipur', winner: 'Girish Soni', party: 'AAAP', year: 2015, votes: 66571, margin: 29387, runnerUp: 'Raj Kumar' },
  { acNo: 27, name: 'Rajouri Garden', winner: 'Jarnail Singh', party: 'AAAP', year: 2015, votes: 54916, margin: 10036, runnerUp: 'Manjinder Singh Sirsa' },
  { acNo: 28, name: 'Hari Nagar', winner: 'Jagdeep Singh', party: 'AAAP', year: 2015, votes: 65398, margin: 26444, runnerUp: 'Avtar Singh Hit' },
  { acNo: 29, name: 'Tilak Nagar', winner: 'Jarnail Singh', party: 'AAAP', year: 2015, votes: 57180, margin: 19890, runnerUp: 'Rajiv Babbar' },
  { acNo: 30, name: 'Janakpuri', winner: 'Rajesh Rishi', party: 'AAAP', year: 2015, votes: 71802, margin: 25580, runnerUp: 'Prof. Jagdish Mukhi' },
  { acNo: 31, name: 'Vikaspuri', winner: 'Mahinder Yadav', party: 'AAAP', year: 2015, votes: 132437, margin: 77665, runnerUp: 'Sanjay Singh' },
  { acNo: 32, name: 'Uttam Nagar', winner: 'Naresh Balyan', party: 'AAAP', year: 2015, votes: 85881, margin: 30419, runnerUp: 'Pawan Sharma' },
  { acNo: 33, name: 'Dwarka', winner: 'Adarsh Shastri', party: 'AAAP', year: 2015, votes: 79729, margin: 39366, runnerUp: 'Parduymn Rajput' },
  { acNo: 34, name: 'Matiala', winner: 'Gulab Singh', party: 'AAAP', year: 2015, votes: 127665, margin: 47004, runnerUp: 'Rajesh Gahlot' },
  { acNo: 35, name: 'Najafgarh', winner: 'Kailash Gahlot', party: 'AAAP', year: 2015, votes: 55598, margin: 1555, runnerUp: 'Bharat Singh' },
  { acNo: 36, name: 'Bijwasan', winner: 'Col Devinder Sehrawat', party: 'AAAP', year: 2015, votes: 65006, margin: 19536, runnerUp: 'Sat Prakash Rana' },
  { acNo: 37, name: 'Palam', winner: 'Bhavna Gaur', party: 'AAAP', year: 2015, votes: 82637, margin: 30849, runnerUp: 'Dharm Dev Solanki' },
  { acNo: 38, name: 'Delhi Cantt', winner: 'Surender Singh', party: 'AAAP', year: 2015, votes: 40133, margin: 11198, runnerUp: 'Karan Singh Tanwar' },
  { acNo: 39, name: 'Rajinder Nagar', winner: 'Vijender Garg Vijay', party: 'AAAP', year: 2015, votes: 61354, margin: 20051, runnerUp: 'R. P. Singh' },
  { acNo: 40, name: 'New Delhi', winner: 'Arvind Kejriwal', party: 'AAAP', year: 2015, votes: 57213, margin: 31583, runnerUp: 'Nupur Sharma' },
  { acNo: 41, name: 'Jangpura', winner: 'Praveen Kumar', party: 'AAAP', year: 2015, votes: 43927, margin: 20450, runnerUp: 'Maninder Singh Dhir' },
  { acNo: 42, name: 'Kasturba Nagar', winner: 'Madan Lal', party: 'AAAP', year: 2015, votes: 50766, margin: 15896, runnerUp: 'Ravinder Choudhry' },
  { acNo: 43, name: 'Malviya Nagar', winner: 'Somnath Bharti', party: 'AAAP', year: 2015, votes: 51196, margin: 15897, runnerUp: 'Dr. Nandani Sharma' },
  { acNo: 44, name: 'R K Puram', winner: 'Parmila Tokas', party: 'AAAP', year: 2015, votes: 54645, margin: 19068, runnerUp: 'Anil Kumar Sharma' },
  { acNo: 45, name: 'Mehrauli', winner: 'Naresh Yadav', party: 'AAAP', year: 2015, votes: 58125, margin: 16951, runnerUp: 'Sarita Chaudhary' },
  { acNo: 46, name: 'Chhatarpur', winner: 'Kartar Singh Tanwar', party: 'AAAP', year: 2015, votes: 67645, margin: 22240, runnerUp: 'Brahm Singh Tanwar' },
  { acNo: 47, name: 'Deoli', winner: 'Prakash', party: 'AAAP', year: 2015, votes: 96530, margin: 63937, runnerUp: 'Arvind Kumar' },
  { acNo: 48, name: 'Ambedkar Nagar', winner: 'Ajay Dutt', party: 'AAAP', year: 2015, votes: 66632, margin: 42460, runnerUp: 'Ashok Kumar' },
  { acNo: 49, name: 'Sangam Vihar', winner: 'Dinesh Mohaniya', party: 'AAAP', year: 2015, votes: 72131, margin: 43988, runnerUp: 'Shiv Charan Lal Gupta' },
  { acNo: 50, name: 'Greater Kailash', winner: 'Saurabh Bharadwaj', party: 'AAAP', year: 2015, votes: 57589, margin: 14583, runnerUp: 'Rakesh Kumar Gullaiya' },
  { acNo: 51, name: 'Kalkaji', winner: 'Avtar Singh Kalkaji', party: 'AAAP', year: 2015, votes: 55104, margin: 19769, runnerUp: 'Harmeet Singh Kalka' },
  { acNo: 52, name: 'Tughlakabad', winner: 'Sahi Ram', party: 'AAAP', year: 2015, votes: 64311, margin: 33701, runnerUp: 'Vikram Bidhuri' },
  { acNo: 53, name: 'Badarpur', winner: 'Narayan Dutt Sharma', party: 'AAAP', year: 2015, votes: 94242, margin: 47583, runnerUp: 'Ramvir Singh Bidhuri' },
  { acNo: 54, name: 'Okhla', winner: 'Amanatullah Khan', party: 'AAAP', year: 2015, votes: 104271, margin: 64532, runnerUp: 'Braham Singh' },
  { acNo: 55, name: 'Trilokpuri', winner: 'Raju Dhingan', party: 'AAAP', year: 2015, votes: 74907, margin: 29754, runnerUp: 'Kiran Vaidya' },
  { acNo: 56, name: 'Kondli', winner: 'Manoj Kumar', party: 'AAAP', year: 2015, votes: 63185, margin: 24759, runnerUp: 'Hukam Singh' },
  { acNo: 57, name: 'Patparganj', winner: 'Manish Sisodia', party: 'AAAP', year: 2015, votes: 75243, margin: 28791, runnerUp: 'Vinod Kumar Binny' },
  { acNo: 58, name: 'Laxmi Nagar', winner: 'Nitin Tyagi', party: 'AAAP', year: 2015, votes: 58229, margin: 4846, runnerUp: 'B. B. Tyagi' },
  { acNo: 59, name: 'Vishwas Nagar', winner: 'Om Prakash Sharma', party: 'BJP', year: 2015, votes: 58124, margin: 10158, runnerUp: 'Dr. Atul Gupta' },
  { acNo: 60, name: 'Krishna Nagar', winner: 'S K Bagga, Advocate', party: 'AAAP', year: 2015, votes: 65919, margin: 2277, runnerUp: 'Kiran Bedi' },
  { acNo: 61, name: 'Gandhi Nagar', winner: 'Anil Kumar Bajpai', party: 'AAAP', year: 2015, votes: 50946, margin: 7482, runnerUp: 'Jitender' },
  { acNo: 62, name: 'Shahdara', winner: 'Ram Niwas Goel', party: 'AAAP', year: 2015, votes: 58523, margin: 11731, runnerUp: 'Jitender Singh Shunty' },
  { acNo: 63, name: 'Seema Puri', winner: 'Rajendra Pal Gautam', party: 'AAAP', year: 2015, votes: 79777, margin: 48821, runnerUp: 'Karamvir' },
  { acNo: 64, name: 'Rohtas Nagar', winner: 'Sarita Singh', party: 'AAAP', year: 2015, votes: 62209, margin: 7874, runnerUp: 'Jitender Mahajan' },
  { acNo: 65, name: 'Seelampur', winner: 'Mohd. Ishraque', party: 'AAAP', year: 2015, votes: 57302, margin: 27887, runnerUp: 'Sanjay Jain' },
  { acNo: 66, name: 'Ghonda', winner: 'Shri Dutt Sharma', party: 'AAAP', year: 2015, votes: 60906, margin: 8093, runnerUp: 'Sahab Singh Chauhan' },
  { acNo: 67, name: 'Babarpur', winner: 'Gopal Rai', party: 'AAAP', year: 2015, votes: 76179, margin: 35271, runnerUp: 'Naresh Gaur' },
  { acNo: 68, name: 'Gokalpur', winner: 'Fateh Singh', party: 'AAAP', year: 2015, votes: 71240, margin: 31968, runnerUp: 'Ranjeet Singh' },
  { acNo: 69, name: 'Mustafabad', winner: 'Jagdish Pradhan', party: 'BJP', year: 2015, votes: 58388, margin: 6031, runnerUp: 'Hasan Ahmed' },
  { acNo: 70, name: 'Karawal Nagar', winner: 'Kapil Mishra', party: 'AAAP', year: 2015, votes: 101865, margin: 44431, runnerUp: 'Mohan Singh Bisht' },
];

export const dl2015Map = new Map(DL_2015_RESULTS.map((r) => [r.acNo, r]));

export function getDL2015Result(acNo: number): DLHistoricalResult | undefined {
  return dl2015Map.get(acNo);
}
