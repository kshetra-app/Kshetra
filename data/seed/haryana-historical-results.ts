/**
 * Haryana — Previous Election Results (2019)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2019.
 *         Full per-constituency winner + party, official AC numbering 1-90.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface HRHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const HR_2019_RESULTS: HRHistoricalResult[] = [
  { acNo: 1, name: 'Kalka', winner: 'Pardeep Chaudhary', party: 'INC', year: 2019, votes: 57948, margin: 5931, runnerUp: 'Latika Sharma' },
  { acNo: 2, name: 'Panchkula', winner: 'Gian Chand Gupta', party: 'BJP', year: 2019, votes: 61537, margin: 5633, runnerUp: 'Chander Mohan' },
  { acNo: 3, name: 'Naraingarh', winner: 'Shalley', party: 'INC', year: 2019, votes: 53470, margin: 20600, runnerUp: 'Surender Singh' },
  { acNo: 4, name: 'Ambala Cantt.', winner: 'Anil Vij', party: 'BJP', year: 2019, votes: 64571, margin: 20165, runnerUp: 'Chitra Sarwara' },
  { acNo: 5, name: 'Ambala City', winner: 'Aseem Goel Naneola', party: 'BJP', year: 2019, votes: 64896, margin: 8952, runnerUp: 'Nirmal Singh Mohra' },
  { acNo: 6, name: 'Mulana', winner: 'Varun Chaudhary', party: 'INC', year: 2019, votes: 67051, margin: 1688, runnerUp: 'Rajbir Singh' },
  { acNo: 7, name: 'Sadhaura', winner: 'Renu Bala', party: 'INC', year: 2019, votes: 65806, margin: 17020, runnerUp: 'Balwant Singh' },
  { acNo: 8, name: 'Jagadhri', winner: 'Kanwar Pal', party: 'BJP', year: 2019, votes: 66376, margin: 16373, runnerUp: 'Akram Khan' },
  { acNo: 9, name: 'Yamunanagar', winner: 'Ghanshyam Dass', party: 'BJP', year: 2019, votes: 64848, margin: 1455, runnerUp: 'Dilbag Singh' },
  { acNo: 10, name: 'Radaur', winner: 'Bishan Lal', party: 'INC', year: 2019, votes: 54087, margin: 2541, runnerUp: 'Karan Dev' },
  { acNo: 11, name: 'Ladwa', winner: 'Mewa Singh', party: 'INC', year: 2019, votes: 57665, margin: 12637, runnerUp: 'Dr. Pawan Saini' },
  { acNo: 12, name: 'Shahbad', winner: 'Ram Karan', party: 'JNJP', year: 2019, votes: 69233, margin: 37127, runnerUp: 'Krishan Kumar' },
  { acNo: 13, name: 'Thanesar', winner: 'Subhash Sudha', party: 'BJP', year: 2019, votes: 55759, margin: 842, runnerUp: 'Ashok Kumar Arora' },
  { acNo: 14, name: 'Pehowa', winner: 'Sandeep Singh', party: 'BJP', year: 2019, votes: 42613, margin: 5314, runnerUp: 'Mandeep Singh Chattha' },
  { acNo: 15, name: 'Guhla', winner: 'Ishwar Singh', party: 'JNJP', year: 2019, votes: 36518, margin: 4574, runnerUp: 'Chaudhary Dilu Ram' },
  { acNo: 16, name: 'Kalayat', winner: 'Kamlesh Dhanda', party: 'BJP', year: 2019, votes: 53805, margin: 8974, runnerUp: 'Jai Parkash' },
  { acNo: 17, name: 'Kaithal', winner: 'Leela Ram', party: 'BJP', year: 2019, votes: 72664, margin: 1246, runnerUp: 'Randeep Singh Surjewala' },
  { acNo: 18, name: 'Pundri', winner: 'Randhir Singh Gollen', party: 'IND', year: 2019, votes: 41008, margin: 12824, runnerUp: 'Satbir Bhana' },
  { acNo: 19, name: 'Nilokheri', winner: 'Dharam Pal Gonder', party: 'IND', year: 2019, votes: 42979, margin: 2222, runnerUp: 'Bhagwan Dass' },
  { acNo: 20, name: 'Indri', winner: 'Ram Kumar', party: 'BJP', year: 2019, votes: 54221, margin: 7431, runnerUp: 'Rakesh Kamboj' },
  { acNo: 21, name: 'Karnal', winner: 'Manohar Lal', party: 'BJP', year: 2019, votes: 79906, margin: 45188, runnerUp: 'Tarlochan Singh' },
  { acNo: 22, name: 'Gharaunda', winner: 'Harvinder Kalyan', party: 'BJP', year: 2019, votes: 67209, margin: 17402, runnerUp: 'Anil Kumar' },
  { acNo: 23, name: 'Assandh', winner: 'Shamsher Singh Gogi', party: 'INC', year: 2019, votes: 32114, margin: 1703, runnerUp: 'Narender Singh' },
  { acNo: 24, name: 'Panipat Rural', winner: 'Mahipal Dhanda', party: 'BJP', year: 2019, votes: 67086, margin: 21961, runnerUp: 'Devender Kadian' },
  { acNo: 25, name: 'Panipat City', winner: 'Parmod Kumar Vij', party: 'BJP', year: 2019, votes: 76863, margin: 39545, runnerUp: 'Sanjay Aggarwal' },
  { acNo: 26, name: 'Israna', winner: 'Balbir Singh', party: 'INC', year: 2019, votes: 61376, margin: 20015, runnerUp: 'Krishan Lal Panwar' },
  { acNo: 27, name: 'Samalkha', winner: 'Dharam Singh Chhoker', party: 'INC', year: 2019, votes: 81898, margin: 14942, runnerUp: 'Shashi Kant Kaushik' },
  { acNo: 28, name: 'Ganaur', winner: 'Nirmal Rani', party: 'BJP', year: 2019, votes: 57830, margin: 10280, runnerUp: 'Kuldip Sharma' },
  { acNo: 29, name: 'Rai', winner: 'Mohan Lal Badoli', party: 'BJP', year: 2019, votes: 45377, margin: 2662, runnerUp: 'Jai Tirath' },
  { acNo: 30, name: 'Kharkhauda', winner: 'Jaiveer Singh', party: 'INC', year: 2019, votes: 38577, margin: 1544, runnerUp: 'Pawan Kumar' },
  { acNo: 31, name: 'Sonipat', winner: 'Surender Panwar', party: 'INC', year: 2019, votes: 79438, margin: 32878, runnerUp: 'Kavita Jain' },
  { acNo: 32, name: 'Gohana', winner: 'Jagbir Singh Malik', party: 'INC', year: 2019, votes: 39531, margin: 4152, runnerUp: 'Raj Kumar Saini' },
  { acNo: 33, name: 'Baroda', winner: 'Sri Krishan Hooda', party: 'INC', year: 2019, votes: 42566, margin: 4840, runnerUp: 'Yogeshwar Dutt' },
  { acNo: 34, name: 'Julana', winner: 'Amarjeet Dhanda', party: 'JNJP', year: 2019, votes: 61942, margin: 24193, runnerUp: 'Parminder Singh Dhull' },
  { acNo: 35, name: 'Safidon', winner: 'Subhash Gangoli', party: 'INC', year: 2019, votes: 57468, margin: 3658, runnerUp: 'Bachan Singh Arya' },
  { acNo: 36, name: 'Jind', winner: 'Dr. Krishan Lal Middha', party: 'BJP', year: 2019, votes: 58370, margin: 12508, runnerUp: 'Mahabir Gupta' },
  { acNo: 37, name: 'Uchana Kalan', winner: 'Dushyant Chautala', party: 'JNJP', year: 2019, votes: 92504, margin: 47452, runnerUp: 'Prem Lata' },
  { acNo: 38, name: 'Narwana', winner: 'Ram Niwas', party: 'JNJP', year: 2019, votes: 79578, margin: 30692, runnerUp: 'Santosh Rani' },
  { acNo: 39, name: 'Tohana', winner: 'Devender Singh Babli', party: 'JNJP', year: 2019, votes: 100752, margin: 52302, runnerUp: 'Subhash Barala' },
  { acNo: 40, name: 'Fatehabad', winner: 'Dura Ram', party: 'BJP', year: 2019, votes: 77369, margin: 3300, runnerUp: 'Dr. Virender Siwatch' },
  { acNo: 41, name: 'Ratia', winner: 'Lakshman Napa', party: 'BJP', year: 2019, votes: 55160, margin: 1216, runnerUp: 'Jarnail Singh' },
  { acNo: 42, name: 'Kalanwali', winner: 'Shishpal Singh', party: 'INC', year: 2019, votes: 53059, margin: 19243, runnerUp: 'Rajinder Singh Desujodha' },
  { acNo: 43, name: 'Dabwali', winner: 'Amit Sihag', party: 'INC', year: 2019, votes: 66885, margin: 15647, runnerUp: 'Aditya' },
  { acNo: 44, name: 'Rania', winner: 'Ranjit Singh', party: 'IND', year: 2019, votes: 53825, margin: 19431, runnerUp: 'Gobind Kanda' },
  { acNo: 45, name: 'Sirsa', winner: 'Gopal Kanda', party: 'HALP', year: 2019, votes: 44915, margin: 602, runnerUp: 'Gokul Setia' },
  { acNo: 46, name: 'Ellenabad', winner: 'Abhay Singh Chautala', party: 'INLD', year: 2019, votes: 57055, margin: 11922, runnerUp: 'Pawan Beniwal' },
  { acNo: 47, name: 'Adampur', winner: 'Kuldeep Bishnoi', party: 'INC', year: 2019, votes: 63693, margin: 29471, runnerUp: 'Sonali Phogat' },
  { acNo: 48, name: 'Uklana', winner: 'Anoop Dhanak', party: 'JNJP', year: 2019, votes: 65369, margin: 23693, runnerUp: 'Asha Khedar' },
  { acNo: 49, name: 'Narnaund', winner: 'Ram Kumar Gautam', party: 'JNJP', year: 2019, votes: 73435, margin: 12029, runnerUp: 'Captain Abhimanyu' },
  { acNo: 50, name: 'Hansi', winner: 'Vinod Bhayana', party: 'BJP', year: 2019, votes: 53191, margin: 22260, runnerUp: 'Rahul Makkar' },
  { acNo: 51, name: 'Barwala', winner: 'Jogi Ram Sihag', party: 'JNJP', year: 2019, votes: 45868, margin: 3908, runnerUp: 'Surender Punia' },
  { acNo: 52, name: 'Hisar', winner: 'Dr. Kamal Gupta', party: 'BJP', year: 2019, votes: 49675, margin: 15832, runnerUp: 'Ram Niwas Rara' },
  { acNo: 53, name: 'Nalwa', winner: 'Ranbir Gangwa', party: 'BJP', year: 2019, votes: 47523, margin: 9672, runnerUp: 'Randhir Panihar' },
  { acNo: 54, name: 'Loharu', winner: 'Jai Parkash Dalal', party: 'BJP', year: 2019, votes: 61365, margin: 17677, runnerUp: 'Somvir Singh' },
  { acNo: 55, name: 'Badhra', winner: 'Naina Singh', party: 'JNJP', year: 2019, votes: 52938, margin: 13704, runnerUp: 'Ranbir Singh Mahendra' },
  { acNo: 56, name: 'Dadri', winner: 'Sombir', party: 'IND', year: 2019, votes: 43849, margin: 14272, runnerUp: 'Satpal Sangwan' },
  { acNo: 57, name: 'Bhiwani', winner: 'Ghanshyam Saraf', party: 'BJP', year: 2019, votes: 61704, margin: 27884, runnerUp: 'Dr. Shiv Shanker Bhardwaj' },
  { acNo: 58, name: 'Tosham', winner: 'Kiran Choudhry', party: 'INC', year: 2019, votes: 72699, margin: 18059, runnerUp: 'Shashi Ranjan Parmar' },
  { acNo: 59, name: 'Bawani Khera', winner: 'Bishamber Singh', party: 'BJP', year: 2019, votes: 52387, margin: 10895, runnerUp: 'Ramkishan Fauji' },
  { acNo: 60, name: 'Meham', winner: 'Balraj Kundu', party: 'IND', year: 2019, votes: 49418, margin: 12047, runnerUp: 'Anand Singh Dangi' },
  { acNo: 61, name: 'Garhi Sampla-Kiloi', winner: 'Bhupinder Singh Hooda', party: 'INC', year: 2019, votes: 97755, margin: 58312, runnerUp: 'Satish Nandal' },
  { acNo: 62, name: 'Rohtak', winner: 'Bharat Bhushan Batra', party: 'INC', year: 2019, votes: 50437, margin: 2735, runnerUp: 'Manish Kumar Grover' },
  { acNo: 63, name: 'Kalanaur', winner: 'Shakuntla Khatak', party: 'INC', year: 2019, votes: 62151, margin: 10624, runnerUp: 'Ramavtar Balmiki' },
  { acNo: 64, name: 'Bahadurgarh', winner: 'Rajinder Singh Joon', party: 'INC', year: 2019, votes: 55825, margin: 15491, runnerUp: 'Naresh Kaushik' },
  { acNo: 65, name: 'Badli', winner: 'Kuldeep Vats', party: 'INC', year: 2019, votes: 45441, margin: 11245, runnerUp: 'Omprakash Dhankhar' },
  { acNo: 66, name: 'Jhajjar', winner: 'Geeta Bhukkal', party: 'INC', year: 2019, votes: 46480, margin: 14999, runnerUp: 'Rakesh Kumar' },
  { acNo: 67, name: 'Beri', winner: 'Dr. Raghuvir Singh Kadian', party: 'INC', year: 2019, votes: 46022, margin: 12952, runnerUp: 'Vikram Kadian' },
  { acNo: 68, name: 'Ateli', winner: 'Sitaram', party: 'BJP', year: 2019, votes: 55793, margin: 18406, runnerUp: 'Atar Lal' },
  { acNo: 69, name: 'Mahendragarh', winner: 'Rao Dan Singh', party: 'INC', year: 2019, votes: 46478, margin: 10220, runnerUp: 'Ram Bilas Sharma' },
  { acNo: 70, name: 'Narnaul', winner: 'Om Prakash Yadav', party: 'BJP', year: 2019, votes: 42732, margin: 14715, runnerUp: 'Kamlesh Saini' },
  { acNo: 71, name: 'Nangal Chaudhry', winner: 'Dr. Abhe Singh Yadav', party: 'BJP', year: 2019, votes: 55529, margin: 20615, runnerUp: 'Mula Ram' },
  { acNo: 72, name: 'Bawal', winner: 'Dr. Banwari Lal', party: 'BJP', year: 2019, votes: 69049, margin: 32245, runnerUp: 'Dr. M.L. Ranga' },
  { acNo: 73, name: 'Kosli', winner: 'Laxman Singh Yadav', party: 'BJP', year: 2019, votes: 78813, margin: 38624, runnerUp: 'Yaduvender Singh' },
  { acNo: 74, name: 'Rewari', winner: 'Chiranjeev Rao', party: 'INC', year: 2019, votes: 43870, margin: 1317, runnerUp: 'Sunil Kumar' },
  { acNo: 75, name: 'Pataudi', winner: 'Satya Parkash', party: 'BJP', year: 2019, votes: 60633, margin: 36579, runnerUp: 'Narender Singh Pahari' },
  { acNo: 76, name: 'Badshahpur', winner: 'Rakesh Daultabad', party: 'IND', year: 2019, votes: 106827, margin: 10186, runnerUp: 'Manish Yadav' },
  { acNo: 77, name: 'Gurgaon', winner: 'Sudhir Singla', party: 'BJP', year: 2019, votes: 81953, margin: 33315, runnerUp: 'Mohit Grover' },
  { acNo: 78, name: 'Sohna', winner: 'Sanjay Singh', party: 'BJP', year: 2019, votes: 59117, margin: 12453, runnerUp: 'Rohtas Singh' },
  { acNo: 79, name: 'Nuh', winner: 'Aftab Ahmed', party: 'INC', year: 2019, votes: 52311, margin: 4038, runnerUp: 'Zakir Hussain' },
  { acNo: 80, name: 'Ferozepur Jhirka', winner: 'Mamman Khan', party: 'INC', year: 2019, votes: 84546, margin: 37004, runnerUp: 'Naseem Ahmed' },
  { acNo: 81, name: 'Punahana', winner: 'Mohd Ilyas', party: 'INC', year: 2019, votes: 35092, margin: 816, runnerUp: 'Rahish Khan' },
  { acNo: 82, name: 'Hathin', winner: 'Praveen Dagar', party: 'BJP', year: 2019, votes: 46744, margin: 2887, runnerUp: 'Mohammad Israil' },
  { acNo: 83, name: 'Hodal', winner: 'Jagdish Nayar', party: 'BJP', year: 2019, votes: 55864, margin: 3387, runnerUp: 'Udai Bhan' },
  { acNo: 84, name: 'Palwal', winner: 'Deepak Mangla', party: 'BJP', year: 2019, votes: 89426, margin: 28296, runnerUp: 'Karan Singh' },
  { acNo: 85, name: 'Prithla', winner: 'Nayan Pal Rawat', party: 'IND', year: 2019, votes: 64625, margin: 16429, runnerUp: 'Raghubir Tewatia' },
  { acNo: 86, name: 'Faridabad Nit', winner: 'Neeraj Sharma', party: 'INC', year: 2019, votes: 61697, margin: 3242, runnerUp: 'Nagender Bhadana' },
  { acNo: 87, name: 'Badkhal', winner: 'Seema Trikha', party: 'BJP', year: 2019, votes: 58550, margin: 2545, runnerUp: 'Vijay Pratap Singh' },
  { acNo: 88, name: 'Ballabhgarh', winner: 'Mool Chand Sharma', party: 'BJP', year: 2019, votes: 66708, margin: 41713, runnerUp: 'Anand Kaushik' },
  { acNo: 89, name: 'Faridabad', winner: 'Narender Gupta', party: 'BJP', year: 2019, votes: 65887, margin: 21713, runnerUp: 'Lakhan Kumar Singla' },
  { acNo: 90, name: 'Tigaon', winner: 'Rajesh Nagar', party: 'BJP', year: 2019, votes: 97126, margin: 33841, runnerUp: 'Lalit Nagar S/O Sh. Bharat Singh' },
];

export const hr2019Map = new Map(HR_2019_RESULTS.map((r) => [r.acNo, r]));

export function getHR2019Result(acNo: number): HRHistoricalResult | undefined {
  return hr2019Map.get(acNo);
}
