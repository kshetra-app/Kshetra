/**
 * Jharkhand — Previous Election Results (2019)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2019.
 *         Full per-constituency winner + party, official AC numbering 1-81.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface JHHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const JH_2019_RESULTS: JHHistoricalResult[] = [
  { acNo: 1, name: 'Rajmahal', winner: 'Anant Kumar Ojha', party: 'BJP', year: 2019, votes: 88904, margin: 12372, runnerUp: 'Md. Tajuddin' },
  { acNo: 2, name: 'Borio', winner: 'Lobin Hembrom', party: 'JMM', year: 2019, votes: 77365, margin: 17924, runnerUp: 'Surya Narayan Hansada' },
  { acNo: 3, name: 'Barhait', winner: 'Hemant Soren', party: 'JMM', year: 2019, votes: 73725, margin: 25740, runnerUp: 'Simon Malto' },
  { acNo: 4, name: 'Litipara', winner: 'Dinesh William Marandi', party: 'JMM', year: 2019, votes: 66675, margin: 13903, runnerUp: 'Daniel Kisku' },
  { acNo: 5, name: 'Pakhur', winner: 'Alamgir Alam', party: 'INC', year: 2019, votes: 128218, margin: 65108, runnerUp: 'Veni Prasad Gupta' },
  { acNo: 6, name: 'Maheshpur', winner: 'Stephen Marandi', party: 'JMM', year: 2019, votes: 89197, margin: 34106, runnerUp: 'Mistry Soren' },
  { acNo: 7, name: 'Shikaripara', winner: 'Nalin Soren', party: 'JMM', year: 2019, votes: 79400, margin: 29471, runnerUp: 'Paritosh Soren' },
  { acNo: 8, name: 'Nala', winner: 'Rabindra Nath Mahato', party: 'JMM', year: 2019, votes: 61356, margin: 3520, runnerUp: 'Satyanand Jha' },
  { acNo: 9, name: 'Jamtara', winner: 'Irfan Ansari', party: 'INC', year: 2019, votes: 112829, margin: 38741, runnerUp: 'Birendra Mandal' },
  { acNo: 10, name: 'Dumka', winner: 'Hemant Soren', party: 'JMM', year: 2019, votes: 81007, margin: 13188, runnerUp: 'Lois Marandi' },
  { acNo: 11, name: 'Jama', winner: 'Sita Murmu', party: 'JMM', year: 2019, votes: 60925, margin: 2426, runnerUp: 'Suresh Murmu' },
  { acNo: 12, name: 'Jarmundi', winner: 'Badal', party: 'INC', year: 2019, votes: 52507, margin: 3099, runnerUp: 'Devendra Kunwar' },
  { acNo: 13, name: 'Madhupur', winner: 'Haji Hussain Ansari', party: 'JMM', year: 2019, votes: 88115, margin: 23069, runnerUp: 'Raj Paliwar' },
  { acNo: 14, name: 'Sarath', winner: 'Randhir Kumar Singh', party: 'BJP', year: 2019, votes: 90895, margin: 28720, runnerUp: 'Uday Shankar Singh' },
  { acNo: 15, name: 'Deoghar', winner: 'Narayan Das', party: 'BJP', year: 2019, votes: 95491, margin: 2624, runnerUp: 'Suresh Paswan' },
  { acNo: 16, name: 'Poreyahat', winner: 'Pradeep Yadav', party: 'JVM', year: 2019, votes: 77358, margin: 13597, runnerUp: 'Gajadhar Singh' },
  { acNo: 17, name: 'Godda', winner: 'Amit Kumar Mandal', party: 'BJP', year: 2019, votes: 87578, margin: 4512, runnerUp: 'Sanjay Prasad Yadav' },
  { acNo: 18, name: 'Mahagama', winner: 'Deepika Pandey Singh', party: 'INC', year: 2019, votes: 89224, margin: 12499, runnerUp: 'Ashok Kumar' },
  { acNo: 19, name: 'Kodarma', winner: 'Dr. Neera Yadav', party: 'BJP', year: 2019, votes: 63675, margin: 1797, runnerUp: 'Amitabh Kumar' },
  { acNo: 20, name: 'Barkatha', winner: 'Amit Kumar Yadav S/O-Chitranjan Yadav', party: 'IND', year: 2019, votes: 72572, margin: 24812, runnerUp: 'Janki Prasad Yadav' },
  { acNo: 21, name: 'Barhi', winner: 'Umashankar Akela', party: 'INC', year: 2019, votes: 84358, margin: 11371, runnerUp: 'Manoj Kumar Yadav' },
  { acNo: 22, name: 'Barkagaon', winner: 'Amba Prasad', party: 'INC', year: 2019, votes: 98862, margin: 31514, runnerUp: 'Roshan Lal Choudhary' },
  { acNo: 23, name: 'Ramgarh', winner: 'Mamta Devi', party: 'INC', year: 2019, votes: 99944, margin: 28718, runnerUp: 'Sunita Choudhary' },
  { acNo: 24, name: 'Mandhu', winner: 'Jai Prakash Bhai Patel', party: 'BJP', year: 2019, votes: 49855, margin: 2062, runnerUp: 'Nirmal Mahto' },
  { acNo: 25, name: 'Hazaribagh', winner: 'Manish Jaiswal', party: 'BJP', year: 2019, votes: 106208, margin: 51812, runnerUp: 'Dr. Ramchandra Prasad' },
  { acNo: 26, name: 'Simaria', winner: 'Kishun Kumar Das', party: 'BJP', year: 2019, votes: 61438, margin: 10996, runnerUp: 'Manoj Kumar Chandra' },
  { acNo: 27, name: 'Chatra', winner: 'Satyanand Bhokta', party: 'RJD', year: 2019, votes: 101710, margin: 24055, runnerUp: 'Janardan Paswan' },
  { acNo: 28, name: 'Dhanwar', winner: 'Babulal Marandi', party: 'JVM', year: 2019, votes: 52352, margin: 17550, runnerUp: 'Lakshman Prasad Singh' },
  { acNo: 29, name: 'Bagodar', winner: 'Vinod Kumar Singh', party: 'CPIMLL', year: 2019, votes: 98201, margin: 14545, runnerUp: 'Nagendra Mahto' },
  { acNo: 30, name: 'Jamua', winner: 'Kedar Hazra', party: 'BJP', year: 2019, votes: 58468, margin: 18175, runnerUp: 'Manju Kumari' },
  { acNo: 31, name: 'Gandey', winner: 'Dr Sarfraz Ahmad', party: 'JMM', year: 2019, votes: 65023, margin: 8855, runnerUp: 'Jai Prakash Verma' },
  { acNo: 32, name: 'Giridih', winner: 'Sudivya Kumar', party: 'JMM', year: 2019, votes: 80871, margin: 15884, runnerUp: 'Nirbhay Kumar Shahabadi' },
  { acNo: 33, name: 'Dumri', winner: 'Jagarnath Mahto', party: 'JMM', year: 2019, votes: 71128, margin: 34288, runnerUp: 'Yashoda Devi' },
  { acNo: 34, name: 'Gomiya', winner: 'Lambodar Mahto', party: 'AJSUP', year: 2019, votes: 71859, margin: 10937, runnerUp: 'Babita Devi' },
  { acNo: 35, name: 'Bermo', winner: 'Rajendra Pd. Singh', party: 'INC', year: 2019, votes: 88945, margin: 25172, runnerUp: 'Yogeshwar Mahto' },
  { acNo: 36, name: 'Bokaro', winner: 'Biranchi Narayan', party: 'BJP', year: 2019, votes: 112333, margin: 13313, runnerUp: 'Shweta Singh' },
  { acNo: 37, name: 'Chandankyari', winner: 'Amar Kumar Bauri', party: 'BJP', year: 2019, votes: 67739, margin: 9211, runnerUp: 'Uma Kant Rajak' },
  { acNo: 38, name: 'Sindri', winner: 'Indrajit Mahato', party: 'BJP', year: 2019, votes: 80967, margin: 8253, runnerUp: 'Anand Mahato' },
  { acNo: 39, name: 'Nirsa', winner: 'Aparna Sengupta', party: 'BJP', year: 2019, votes: 89082, margin: 25458, runnerUp: 'Arup Chatterjee' },
  { acNo: 40, name: 'Dhanbad', winner: 'Raj Sinha', party: 'BJP', year: 2019, votes: 120773, margin: 30629, runnerUp: 'Mannan Mallick' },
  { acNo: 41, name: 'Jharia', winner: 'Purnima Niraj Singh', party: 'INC', year: 2019, votes: 79786, margin: 12054, runnerUp: 'Ragini Singh' },
  { acNo: 42, name: 'Tundi', winner: 'Mathura Prasad Mahato', party: 'JMM', year: 2019, votes: 72552, margin: 25659, runnerUp: 'Vikram Pandey' },
  { acNo: 43, name: 'Baghmara', winner: 'Dulu Mahato', party: 'BJP', year: 2019, votes: 78291, margin: 824, runnerUp: 'Jaleshwar Mahato' },
  { acNo: 44, name: 'Baharagora', winner: 'Samir Kr. Mohanty', party: 'JMM', year: 2019, votes: 106017, margin: 60565, runnerUp: 'Kunal Shadangi' },
  { acNo: 45, name: 'Ghatshila', winner: 'Ramdas Soren', party: 'JMM', year: 2019, votes: 63531, margin: 6724, runnerUp: 'Lakhan Chandra Mardi' },
  { acNo: 46, name: 'Potka', winner: 'Sanjib Sardar', party: 'JMM', year: 2019, votes: 110753, margin: 43110, runnerUp: 'Menka Sardar' },
  { acNo: 47, name: 'Jugashlai', winner: 'Mangal Kalindi', party: 'JMM', year: 2019, votes: 88581, margin: 21934, runnerUp: 'Muchiram Bauri' },
  { acNo: 48, name: 'Jamshedpur East', winner: 'Saryu Roy', party: 'IND', year: 2019, votes: 73945, margin: 15833, runnerUp: 'Raghubar Das' },
  { acNo: 49, name: 'Jamshedpur West', winner: 'Banna Gupta', party: 'INC', year: 2019, votes: 96778, margin: 22583, runnerUp: 'Devendra Nath Singh' },
  { acNo: 50, name: 'Ichagarh', winner: 'Sabita Mahato', party: 'JMM', year: 2019, votes: 57546, margin: 18710, runnerUp: 'Hare Lal Mahato' },
  { acNo: 51, name: 'Saraikella', winner: 'Champai Soren', party: 'JMM', year: 2019, votes: 111554, margin: 15667, runnerUp: 'Ganesh Mahali' },
  { acNo: 52, name: 'Chaibasa', winner: 'Deepak Birua', party: 'JMM', year: 2019, votes: 69485, margin: 26159, runnerUp: 'J. B. Tubid' },
  { acNo: 53, name: 'Majhganon', winner: 'Niral Purty', party: 'JMM', year: 2019, votes: 67750, margin: 47192, runnerUp: 'Bhupendra Pingua' },
  { acNo: 54, name: 'Jaganathpur', winner: 'Sona Ram Sinku', party: 'INC', year: 2019, votes: 32499, margin: 11606, runnerUp: 'Mangal Singh Bobonga' },
  { acNo: 55, name: 'Manoharpur', winner: 'Joba Majhi', party: 'JMM', year: 2019, votes: 50945, margin: 16019, runnerUp: 'Gurucharan Nayak' },
  { acNo: 56, name: 'Chakradharpur', winner: 'Sukhram Oraon', party: 'JMM', year: 2019, votes: 43832, margin: 12234, runnerUp: 'Laxman Giluwa' },
  { acNo: 57, name: 'Kharasawan', winner: 'Dashrath Gagrai', party: 'JMM', year: 2019, votes: 73341, margin: 22795, runnerUp: 'Jawahar Lal Banra' },
  { acNo: 58, name: 'Tamar', winner: 'Vikas Kumar Munda', party: 'JMM', year: 2019, votes: 55491, margin: 30971, runnerUp: 'Ram Durlav Singh Munda' },
  { acNo: 59, name: 'Torpa', winner: 'Koche Munda', party: 'BJP', year: 2019, votes: 43482, margin: 9630, runnerUp: 'Sudeep Guria' },
  { acNo: 60, name: 'Khunti', winner: 'Nilkanth Singh Munda', party: 'BJP', year: 2019, votes: 59198, margin: 26327, runnerUp: 'Sushil Pahan' },
  { acNo: 61, name: 'Silli', winner: 'Sudesh Kumar Mahto', party: 'AJSUP', year: 2019, votes: 83700, margin: 20195, runnerUp: 'Seema Devi' },
  { acNo: 62, name: 'Khijri', winner: 'Rajesh Kachhap', party: 'INC', year: 2019, votes: 83829, margin: 5469, runnerUp: 'Ram Kumar Pahan' },
  { acNo: 63, name: 'Ranchi', winner: 'Chandreshwar Prasad Singh', party: 'BJP', year: 2019, votes: 79646, margin: 5904, runnerUp: 'Mahua Maji' },
  { acNo: 64, name: 'Hatia', winner: 'Navin Jaiswal', party: 'BJP', year: 2019, votes: 115431, margin: 16264, runnerUp: 'Ajay Nath Shahdeo' },
  { acNo: 65, name: 'Kanke', winner: 'Sammari Lal', party: 'BJP', year: 2019, votes: 111975, margin: 22540, runnerUp: 'Suresh Kumar Baitha' },
  { acNo: 66, name: 'Mandar', winner: 'Bandhu Tirkey', party: 'JVM', year: 2019, votes: 92491, margin: 23127, runnerUp: 'Deo Kumar Dhan' },
  { acNo: 67, name: 'Sisai', winner: 'Jiga Susaran Horo', party: 'JMM', year: 2019, votes: 93720, margin: 38418, runnerUp: 'Dinesh Oraon' },
  { acNo: 68, name: 'Gumla', winner: 'Bhushan Tirkey', party: 'JMM', year: 2019, votes: 67416, margin: 7667, runnerUp: 'Mishir Kujur' },
  { acNo: 69, name: 'Bishunpur', winner: 'Chamra Linda', party: 'JMM', year: 2019, votes: 80864, margin: 17382, runnerUp: 'Ashok Oraon' },
  { acNo: 70, name: 'Simdega', winner: 'Bhushan Bara', party: 'INC', year: 2019, votes: 60651, margin: 285, runnerUp: 'Shradhanand Besra' },
  { acNo: 71, name: 'Kolebira', winner: 'Naman Bixal Kongari', party: 'INC', year: 2019, votes: 48574, margin: 12338, runnerUp: 'Sujan Jojo' },
  { acNo: 72, name: 'Lohardaga', winner: 'Rameshwar Oraon', party: 'INC', year: 2019, votes: 74380, margin: 30150, runnerUp: 'Sukhdeo Bhagat' },
  { acNo: 73, name: 'Manika', winner: 'Ramchandra Singh', party: 'INC', year: 2019, votes: 74000, margin: 16240, runnerUp: 'Raghupal Singh' },
  { acNo: 74, name: 'Latehar', winner: 'Baidyanath Ram', party: 'JMM', year: 2019, votes: 76507, margin: 16328, runnerUp: 'Prakash Ram' },
  { acNo: 75, name: 'Panki', winner: 'Kushwaha Shashi Bhushan Mehta', party: 'BJP', year: 2019, votes: 93184, margin: 37190, runnerUp: 'Devendra Kumar Singh' },
  { acNo: 76, name: 'Daltonganj', winner: 'Alok Kumar Chaurasiya', party: 'BJP', year: 2019, votes: 103698, margin: 21517, runnerUp: 'Krishna Nand Tripathi' },
  { acNo: 77, name: 'Bishrampur', winner: 'Ramchandra Chandravanshi', party: 'BJP', year: 2019, votes: 40635, margin: 8513, runnerUp: 'Rajesh Mehta' },
  { acNo: 78, name: 'Chattarpur', winner: 'Pushpa Devi', party: 'BJP', year: 2019, votes: 64127, margin: 26792, runnerUp: 'Vijay Kumar' },
  { acNo: 79, name: 'Hussainabad', winner: 'Kamlesh Kumar Singh', party: 'NCP', year: 2019, votes: 41293, margin: 9849, runnerUp: 'Sanjay Kumar Singh Yadav' },
  { acNo: 80, name: 'Garhwa', winner: 'Mithilesh Kumar Thakur', party: 'JMM', year: 2019, votes: 106681, margin: 23522, runnerUp: 'Satyendra Nath Tiwari' },
  { acNo: 81, name: 'Bhawanathpur', winner: 'Bhanu Pratap Shahi', party: 'BJP', year: 2019, votes: 96818, margin: 39904, runnerUp: 'Sogra Bibi' },
];

export const jh2019Map = new Map(JH_2019_RESULTS.map((r) => [r.acNo, r]));

export function getJH2019Result(acNo: number): JHHistoricalResult | undefined {
  return jh2019Map.get(acNo);
}
