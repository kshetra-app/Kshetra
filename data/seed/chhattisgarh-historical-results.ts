/**
 * Chhattisgarh — Previous Election Results (2018)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2018.
 *         Full per-constituency winner + party, official AC numbering 1-90.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface CGHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const CG_2018_RESULTS: CGHistoricalResult[] = [
  { acNo: 1, name: 'Bharatpur-Sonhat', winner: 'Gulab Kamro', party: 'INC', year: 2018, votes: 51732, margin: 16533, runnerUp: 'Champadevi Pawle' },
  { acNo: 2, name: 'Manendragarh', winner: 'Dr. Vinay Jaiswal', party: 'INC', year: 2018, votes: 35819, margin: 4074, runnerUp: 'Shyam Bihari Jaiswal' },
  { acNo: 3, name: 'Baikunthpur', winner: 'Ambica Singh Deo', party: 'INC', year: 2018, votes: 48885, margin: 5339, runnerUp: 'Bhaiyalal Rajwade' },
  { acNo: 4, name: 'Premnagar', winner: 'Khel Sai Singh', party: 'INC', year: 2018, votes: 66475, margin: 15340, runnerUp: 'Vijay Pratap Singh' },
  { acNo: 5, name: 'Bhatgaon', winner: 'Paras Nath Rajwade', party: 'INC', year: 2018, votes: 74623, margin: 15734, runnerUp: 'Rajni Ravishankar Tripathi' },
  { acNo: 6, name: 'Pratappur', winner: 'Dr. Premsai Singh Tekam', party: 'INC', year: 2018, votes: 90148, margin: 44105, runnerUp: 'Ramsewak Paikra' },
  { acNo: 7, name: 'Ramanujganj', winner: 'Brihaspat Singh', party: 'INC', year: 2018, votes: 64580, margin: 32916, runnerUp: 'Ramkishun Singh' },
  { acNo: 8, name: 'Samri', winner: 'Chintamani Mahraj', party: 'INC', year: 2018, votes: 80620, margin: 21923, runnerUp: 'Sidhnath Paikra' },
  { acNo: 9, name: 'Lundra', winner: 'Dr. Pritam Ram', party: 'INC', year: 2018, votes: 77773, margin: 22179, runnerUp: 'Vijaynath Singh' },
  { acNo: 10, name: 'Ambikapur', winner: 'T.S. Baba', party: 'INC', year: 2018, votes: 100439, margin: 39624, runnerUp: 'Anurag Singh Deo' },
  { acNo: 11, name: 'Sitapur', winner: 'Amarjeet Bhagat', party: 'INC', year: 2018, votes: 86670, margin: 36137, runnerUp: 'Professor Gopal Ram' },
  { acNo: 12, name: 'Jashpur', winner: 'Vinay Kumar Bhagat', party: 'INC', year: 2018, votes: 71963, margin: 8026, runnerUp: 'Govind Ram Bhagat' },
  { acNo: 13, name: 'Kunkuri', winner: 'U. D. Minj', party: 'INC', year: 2018, votes: 69896, margin: 4293, runnerUp: 'Bharat Sai' },
  { acNo: 14, name: 'Pathalgaon', winner: 'Rampukar Singh Thakur', party: 'INC', year: 2018, votes: 96599, margin: 36686, runnerUp: 'Shivshankar Painkara' },
  { acNo: 15, name: 'Lailunga', winner: 'Chakradhar Singh Sidar', party: 'INC', year: 2018, votes: 81770, margin: 24483, runnerUp: 'Satyanand Rathiya' },
  { acNo: 16, name: 'Raigarh', winner: 'Prakash Shakrajeet Naik', party: 'INC', year: 2018, votes: 69062, margin: 14580, runnerUp: 'Roshanlal' },
  { acNo: 17, name: 'Sarangarh', winner: 'Uttari Ganpat Jangde', party: 'INC', year: 2018, votes: 101834, margin: 52389, runnerUp: 'Kera Bai Manahar' },
  { acNo: 18, name: 'Kharsia', winner: 'Umesh Patel', party: 'INC', year: 2018, votes: 94201, margin: 16967, runnerUp: 'Op Choudhary' },
  { acNo: 19, name: 'Dharamjaigarh', winner: 'Laljeet Singh Rathia', party: 'INC', year: 2018, votes: 95173, margin: 40335, runnerUp: 'Leenav Birju Rathia' },
  { acNo: 20, name: 'Rampur', winner: 'Nanki Ram Kanwar', party: 'BJP', year: 2018, votes: 65048, margin: 18175, runnerUp: 'Phool Singh Rathiya' },
  { acNo: 21, name: 'Korba', winner: 'Jaisingh Agrawal(Jaisingh Bhaiya)', party: 'INC', year: 2018, votes: 70119, margin: 11806, runnerUp: 'Vikas Mahto' },
  { acNo: 22, name: 'Katghora', winner: 'Purushottam Kanwar', party: 'INC', year: 2018, votes: 59227, margin: 11511, runnerUp: 'Lakhanlal Dewangan' },
  { acNo: 23, name: 'Pali-Tanakhar', winner: 'Mohit Ram', party: 'INC', year: 2018, votes: 66971, margin: 9656, runnerUp: 'Hira Singh Markam' },
  { acNo: 24, name: 'Marwahi', winner: 'Ajit Jogi', party: 'JCCJ', year: 2018, votes: 74041, margin: 46462, runnerUp: 'Archana Porte' },
  { acNo: 25, name: 'Kota', winner: 'Renu Ajit Jogi', party: 'JCCJ', year: 2018, votes: 48800, margin: 3026, runnerUp: 'Kashi Ram Sahu' },
  { acNo: 26, name: 'Lormi', winner: 'Dharmjeet Singh', party: 'JCCJ', year: 2018, votes: 67742, margin: 25553, runnerUp: 'Tokhan Sahu' },
  { acNo: 27, name: 'Mungeli', winner: 'Punnulal Mohale', party: 'BJP', year: 2018, votes: 60469, margin: 8487, runnerUp: 'Rakesh Patre' },
  { acNo: 28, name: 'Takhatpur', winner: 'Rashmi Ashish Singh', party: 'INC', year: 2018, votes: 52616, margin: 2991, runnerUp: 'Santosh Kaushik (Guruji)' },
  { acNo: 29, name: 'Bilha', winner: 'Dharam Lal Kaushik', party: 'BJP', year: 2018, votes: 84431, margin: 26524, runnerUp: 'Rajendra Shukla' },
  { acNo: 30, name: 'Bilaspur', winner: 'Shailesh Pandey', party: 'INC', year: 2018, votes: 67896, margin: 11221, runnerUp: 'Amar Agrawal' },
  { acNo: 31, name: 'Beltara', winner: 'Rajnish Kumar Singh', party: 'BJP', year: 2018, votes: 49601, margin: 6259, runnerUp: 'Rajendra Sahu(Dabbu)' },
  { acNo: 32, name: 'Masturi', winner: 'Dr. Krishna Murti Bandhi', party: 'BJP', year: 2018, votes: 67950, margin: 14107, runnerUp: 'Jayendra Singh Patle' },
  { acNo: 33, name: 'Akaltara', winner: 'Saurabh Singh', party: 'BJP', year: 2018, votes: 60502, margin: 1854, runnerUp: 'Richa Jogi' },
  { acNo: 34, name: 'Janjgir-Champa', winner: 'Narayan Chandel', party: 'BJP', year: 2018, votes: 54040, margin: 4188, runnerUp: 'Motilal Dewangan' },
  { acNo: 35, name: 'Sakti', winner: 'Charan Das Mahant', party: 'INC', year: 2018, votes: 78058, margin: 30046, runnerUp: 'Medha Ram Sahu' },
  { acNo: 36, name: 'Chandrapur', winner: 'Ram Kumar Yadav', party: 'INC', year: 2018, votes: 51717, margin: 4418, runnerUp: 'Gitanjali Patel' },
  { acNo: 37, name: 'Jaijaipur', winner: 'Keshav Prasad Chandra', party: 'BSP', year: 2018, votes: 64774, margin: 21687, runnerUp: 'Kailash Sahu' },
  { acNo: 38, name: 'Pamgarh', winner: 'Indu Banjare', party: 'BSP', year: 2018, votes: 50129, margin: 3061, runnerUp: 'Gorelal Barman' },
  { acNo: 39, name: 'Saraipali', winner: 'Kismat Lal Nand', party: 'INC', year: 2018, votes: 100302, margin: 52288, runnerUp: 'Shyam Tandi' },
  { acNo: 40, name: 'Basna', winner: 'Devendra Bahadur Singh', party: 'INC', year: 2018, votes: 67535, margin: 17508, runnerUp: 'Sampat Agrawal' },
  { acNo: 41, name: 'Khallari', winner: 'Dwarikadhish Yadav', party: 'INC', year: 2018, votes: 96108, margin: 56978, runnerUp: 'Monika Dilip Sahu' },
  { acNo: 42, name: 'Mahasamund', winner: 'Vinod Sevan Lal Chandrakar', party: 'INC', year: 2018, votes: 49356, margin: 23066, runnerUp: 'Poonam Chandrakar' },
  { acNo: 43, name: 'Bilaigarh', winner: 'Chandradev Prasad Rai', party: 'INC', year: 2018, votes: 71936, margin: 9847, runnerUp: 'Shyam Kumar Tandan' },
  { acNo: 44, name: 'Kasdol', winner: 'Shakuntala Sahu', party: 'INC', year: 2018, votes: 121422, margin: 48418, runnerUp: 'Gaurishankar Agrawal' },
  { acNo: 45, name: 'Baloda Bazar', winner: 'Pramod Kumar Sharma', party: 'JCCJ', year: 2018, votes: 65251, margin: 2129, runnerUp: 'Janak Ram Verma' },
  { acNo: 46, name: 'Bhatapara', winner: 'Shivratan Sharma', party: 'BJP', year: 2018, votes: 63399, margin: 11909, runnerUp: 'Sunil Maheshwari' },
  { acNo: 47, name: 'Dharsiwa', winner: 'Anita Yogendra Sharma', party: 'INC', year: 2018, votes: 78989, margin: 19400, runnerUp: 'Devji Bhai Patel' },
  { acNo: 48, name: 'Raipur City Gramin', winner: 'Satyanarayan Sharma', party: 'INC', year: 2018, votes: 78468, margin: 10453, runnerUp: 'Nand Kumar Sahu (Nande Bhaiya)' },
  { acNo: 49, name: 'Raipur City West', winner: 'Vikas Upadhyay', party: 'INC', year: 2018, votes: 76359, margin: 12212, runnerUp: 'Rajesh Munat' },
  { acNo: 50, name: 'Raipur City North', winner: 'Kuldeep Juneja', party: 'INC', year: 2018, votes: 59843, margin: 16341, runnerUp: 'Shri Chand Sundrani' },
  { acNo: 51, name: 'Raipur City South', winner: 'Brijmohan Agrawal', party: 'BJP', year: 2018, votes: 77589, margin: 17496, runnerUp: 'Kanhaiya Agrawal' },
  { acNo: 52, name: 'Arang', winner: 'Dr. Shivkumar Dahariya', party: 'INC', year: 2018, votes: 69900, margin: 25077, runnerUp: 'Sanjay Dhidhi' },
  { acNo: 53, name: 'Abhanpur', winner: 'Dhanendra Sahu', party: 'INC', year: 2018, votes: 76761, margin: 23471, runnerUp: 'Chandrashekhar Sahu - Champu Bhaiyya' },
  { acNo: 54, name: 'Rajim', winner: 'Amitesh Shukla', party: 'INC', year: 2018, votes: 99041, margin: 58132, runnerUp: 'Santosh Upadhyay' },
  { acNo: 55, name: 'Bindranawagarh', winner: 'Damarudhar Pujari', party: 'BJP', year: 2018, votes: 79619, margin: 10430, runnerUp: 'Sanjay Netam' },
  { acNo: 56, name: 'Sihawa', winner: 'Dr. Lakshmi Dhruw', party: 'INC', year: 2018, votes: 88451, margin: 45436, runnerUp: 'Pinky Shivraj Shah' },
  { acNo: 57, name: 'Kurud', winner: 'Ajay Chandrakar', party: 'BJP', year: 2018, votes: 72922, margin: 12317, runnerUp: 'Neelam Chandrakar' },
  { acNo: 58, name: 'Dhamtari', winner: 'Ranjana Dipendra Sahu', party: 'BJP', year: 2018, votes: 63198, margin: 464, runnerUp: 'Gurumukh Singh Hora' },
  { acNo: 59, name: 'Sanjari Balod', winner: 'Sangeeta Sinha', party: 'INC', year: 2018, votes: 90428, margin: 27488, runnerUp: 'Pawan Sahu' },
  { acNo: 60, name: 'Dondi Lahara', winner: 'Anila Bhendia', party: 'INC', year: 2018, votes: 67448, margin: 33103, runnerUp: 'Lal Mahendra Singh Tekam' },
  { acNo: 61, name: 'Gunderdehi', winner: 'Kunwer Singh Nishad', party: 'INC', year: 2018, votes: 110369, margin: 55394, runnerUp: 'Deepak Tarachand Sahu' },
  { acNo: 62, name: 'Patan', winner: 'Bhupesh Baghel', party: 'INC', year: 2018, votes: 84352, margin: 27477, runnerUp: 'Motilal Sahu' },
  { acNo: 63, name: 'Durg Gramin', winner: 'Tamradhwaj Sahu', party: 'INC', year: 2018, votes: 76208, margin: 27112, runnerUp: 'Jageshwar Sahu' },
  { acNo: 64, name: 'Durg City', winner: 'Arun Vora', party: 'INC', year: 2018, votes: 64981, margin: 21081, runnerUp: 'Chandrika Chandrakar' },
  { acNo: 65, name: 'Bhilai Nagar', winner: 'Devendra Yadav', party: 'INC', year: 2018, votes: 51044, margin: 2849, runnerUp: 'Prem Prakash Pandey' },
  { acNo: 66, name: 'Vaishali Nagar', winner: 'Vidya Ratan Bhasin', party: 'BJP', year: 2018, votes: 72920, margin: 18080, runnerUp: 'Badruddin Qureshi' },
  { acNo: 67, name: 'Ahiwara', winner: 'Guru Rudra Kumar', party: 'INC', year: 2018, votes: 88735, margin: 31687, runnerUp: 'Rajmahant Sanwla Ram Dahre' },
  { acNo: 68, name: 'Saja', winner: 'Ravindra Chaube', party: 'INC', year: 2018, votes: 95658, margin: 31535, runnerUp: 'Labhchand Bafna' },
  { acNo: 69, name: 'Bemetara', winner: 'Ashish Kumar Chhabra', party: 'INC', year: 2018, votes: 74914, margin: 25131, runnerUp: 'Awadhesh Singh Chandel' },
  { acNo: 70, name: 'Navagarh', winner: 'Gurudayal Singh Banjare', party: 'INC', year: 2018, votes: 86779, margin: 33200, runnerUp: 'Dayaldas Baghel' },
  { acNo: 71, name: 'Pandariya', winner: 'Mamta Chandrakar', party: 'INC', year: 2018, votes: 100907, margin: 36487, runnerUp: 'Motiram Chandravanshi' },
  { acNo: 72, name: 'Kawardha', winner: 'Akbar Bhai', party: 'INC', year: 2018, votes: 136320, margin: 59284, runnerUp: 'Ashok Sahu' },
  { acNo: 73, name: 'Khairagarh', winner: 'Devwrat Singh', party: 'JCCJ', year: 2018, votes: 61516, margin: 870, runnerUp: 'Komal Janghel' },
  { acNo: 74, name: 'Dongargarh', winner: 'Bhuneshwar Shobharam Baghel', party: 'INC', year: 2018, votes: 86949, margin: 35418, runnerUp: 'Sarojani Banjare' },
  { acNo: 75, name: 'Rajnandgaon', winner: 'Dr. Raman Singh', party: 'BJP', year: 2018, votes: 80589, margin: 16933, runnerUp: 'Karuna Shukla' },
  { acNo: 76, name: 'Dongargaon', winner: 'Daleshwar Sahu', party: 'INC', year: 2018, votes: 84581, margin: 19083, runnerUp: 'Madhusudan Yadav' },
  { acNo: 77, name: 'Khujji', winner: 'Chhanni Chandu Sahu', party: 'INC', year: 2018, votes: 71733, margin: 27497, runnerUp: 'Hirendra Kumar Sahu' },
  { acNo: 78, name: 'Mohala-Manpur', winner: 'Indrashah Mandavi', party: 'INC', year: 2018, votes: 50576, margin: 21048, runnerUp: 'Kanchan Mala Bhuarya' },
  { acNo: 79, name: 'Antagarh', winner: 'Anoop Nag', party: 'INC', year: 2018, votes: 57061, margin: 13414, runnerUp: 'Vikram Usendi' },
  { acNo: 80, name: 'Bhanupratappur', winner: 'Manoj Singh Mandavi', party: 'INC', year: 2018, votes: 72520, margin: 26693, runnerUp: 'Deo Lal Dugga' },
  { acNo: 81, name: 'Kanker', winner: 'Shishupal Shori', party: 'INC', year: 2018, votes: 69053, margin: 19804, runnerUp: 'Hira Markam' },
  { acNo: 82, name: 'Keshkal', winner: 'Sant Ram Netam', party: 'INC', year: 2018, votes: 73470, margin: 16972, runnerUp: 'Harishankar Netam' },
  { acNo: 83, name: 'Kondagaon', winner: 'Mohan Markam', party: 'INC', year: 2018, votes: 61582, margin: 1796, runnerUp: 'Lata Usendi' },
  { acNo: 84, name: 'Narainpur', winner: 'Chandan Kashyap', party: 'INC', year: 2018, votes: 58652, margin: 2647, runnerUp: 'Kedar Kashyap' },
  { acNo: 85, name: 'Bastar', winner: 'Baghel Lakheshwar', party: 'INC', year: 2018, votes: 74378, margin: 33471, runnerUp: 'Dr. Subhau Kashyap' },
  { acNo: 86, name: 'Jagdalpur', winner: 'Rekhchand Jain', party: 'INC', year: 2018, votes: 76556, margin: 27440, runnerUp: 'Santosh Bafna' },
  { acNo: 87, name: 'Chitrakot', winner: 'Deepak Baij', party: 'INC', year: 2018, votes: 62616, margin: 17770, runnerUp: 'Lachhuram Kashyap' },
  { acNo: 88, name: 'Dantewara', winner: 'Bhima Mandavi', party: 'BJP', year: 2018, votes: 37990, margin: 2172, runnerUp: 'Devati Karma' },
  { acNo: 89, name: 'Bijapur', winner: 'Vikram Mandavi', party: 'INC', year: 2018, votes: 44011, margin: 21584, runnerUp: 'Mahesh Gagda' },
  { acNo: 90, name: 'Konta', winner: 'Kawasi Lakhma', party: 'INC', year: 2018, votes: 31933, margin: 6709, runnerUp: 'Dhaniram Barse' },
];

export const cg2018Map = new Map(CG_2018_RESULTS.map((r) => [r.acNo, r]));

export function getCG2018Result(acNo: number): CGHistoricalResult | undefined {
  return cg2018Map.get(acNo);
}
