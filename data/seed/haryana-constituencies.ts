/**
 * Haryana Assembly Constituencies — 90 seats (2024)
 *
 * Source: Election Commission of India (ECI) / IndiaVotes
 * General Election to Assembly Constituencies October 2024
 */

export interface HRConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

export const HR_CONSTITUENCIES: HRConstituencySeed[] = [
  { acNo: 1, name: 'Kalka', localName: 'कालका', district: 'Panchkula', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Shakti Rani Sharma', winnerVotes2024: 60612, runnerUp2024: 'INC - Pardeep Chaudhary', margin2024: 10883, currentParty: 'BJP' },
  { acNo: 2, name: 'Panchkula', localName: 'पंचकूला', district: 'Panchkula', type: 'GEN', winner2024: 'INC', winnerName2024: 'Chander Mohan', winnerVotes2024: 67397, runnerUp2024: 'BJP - Gian Chand Gupta', margin2024: 1997, currentParty: 'INC' },
  { acNo: 3, name: 'Naraingarh', localName: 'नारायणगढ़', district: 'Ambala', type: 'GEN', winner2024: 'INC', winnerName2024: 'Shalley Chaudhary', winnerVotes2024: 62180, runnerUp2024: 'BJP - Dr. Pawan Saini', margin2024: 15094, currentParty: 'INC' },
  { acNo: 4, name: 'Ambala Cantt', localName: 'अंबाला छावनी', district: 'Ambala', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Anil Vij', winnerVotes2024: 59858, runnerUp2024: 'IND - Chitra Sarwara', margin2024: 7277, currentParty: 'BJP' },
  { acNo: 5, name: 'Ambala City', localName: 'अंबाला शहर', district: 'Ambala', type: 'GEN', winner2024: 'INC', winnerName2024: 'Nirmal Singh Mohra', winnerVotes2024: 84475, runnerUp2024: 'BJP - Aseem Goel Naneola', margin2024: 11131, currentParty: 'INC' },
  { acNo: 6, name: 'Mulana', localName: 'मुलाना', district: 'Ambala', type: 'SC', winner2024: 'INC', winnerName2024: 'Pooja', winnerVotes2024: 79089, runnerUp2024: 'BJP - Santosh Chauhan Sarwan', margin2024: 12865, currentParty: 'INC' },
  { acNo: 7, name: 'Sadhaura', localName: 'सढौरा', district: 'Yamunanagar', type: 'SC', winner2024: 'INC', winnerName2024: 'Renu Bala', winnerVotes2024: 57534, runnerUp2024: 'BJP - Balwant Singh', margin2024: 1699, currentParty: 'INC' },
  { acNo: 8, name: 'Jagadhri', localName: 'जगाधरी', district: 'Yamunanagar', type: 'GEN', winner2024: 'INC', winnerName2024: 'Akram Khan', winnerVotes2024: 67403, runnerUp2024: 'BJP - Kanwar Pal', margin2024: 6868, currentParty: 'INC' },
  { acNo: 9, name: 'Yamunanagar', localName: 'यमुनानगर', district: 'Yamunanagar', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ghanshyam Dass', winnerVotes2024: 73185, runnerUp2024: 'INC - Raman Tyagi', margin2024: 22437, currentParty: 'BJP' },
  { acNo: 10, name: 'Radaur', localName: 'रादौर', district: 'Yamunanagar', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Shyam Singh Rana', winnerVotes2024: 73348, runnerUp2024: 'INC - Dr. Bishan Lal Saini', margin2024: 13132, currentParty: 'BJP' },
  { acNo: 11, name: 'Ladwa', localName: 'लाडवा', district: 'Kurukshetra', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Nayab Singh', winnerVotes2024: 70177, runnerUp2024: 'INC - Mewa Singh', margin2024: 16054, currentParty: 'BJP' },
  { acNo: 12, name: 'Shahbad', localName: 'शाहबाद', district: 'Kurukshetra', type: 'SC', winner2024: 'INC', winnerName2024: 'Ram Karan', winnerVotes2024: 61050, runnerUp2024: 'BJP - Subhash Chand', margin2024: 6441, currentParty: 'INC' },
  { acNo: 13, name: 'Thanesar', localName: 'थानेसर', district: 'Kurukshetra', type: 'GEN', winner2024: 'INC', winnerName2024: 'Ashok Kumar Arora', winnerVotes2024: 70076, runnerUp2024: 'BJP - Subhash Sudha', margin2024: 3243, currentParty: 'INC' },
  { acNo: 14, name: 'Pehowa', localName: 'पेहोवा', district: 'Kurukshetra', type: 'GEN', winner2024: 'INC', winnerName2024: 'Mandeep Chatha', winnerVotes2024: 64548, runnerUp2024: 'BJP - Jai Bhagwan Sharma (Dd)', margin2024: 6553, currentParty: 'INC' },
  { acNo: 15, name: 'Guhla', localName: 'गुहला', district: 'Kaithal', type: 'SC', winner2024: 'INC', winnerName2024: 'Devender Hans', winnerVotes2024: 64611, runnerUp2024: 'BJP - Kulwant Ram Bazigar', margin2024: 22880, currentParty: 'INC' },
  { acNo: 16, name: 'Kalayat', localName: 'कलायत', district: 'Kaithal', type: 'GEN', winner2024: 'INC', winnerName2024: 'Vikas Saharan', winnerVotes2024: 48142, runnerUp2024: 'BJP - Kamlesh Dhanda', margin2024: 13419, currentParty: 'INC' },
  { acNo: 17, name: 'Kaithal', localName: 'कैथल', district: 'Kaithal', type: 'GEN', winner2024: 'INC', winnerName2024: 'Aditya Surjewala', winnerVotes2024: 83744, runnerUp2024: 'BJP - Leela Ram', margin2024: 8124, currentParty: 'INC' },
  { acNo: 18, name: 'Pundri', localName: 'पुंडरी', district: 'Kaithal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Satpal Jamba', winnerVotes2024: 42805, runnerUp2024: 'IND - Satbir Bhana', margin2024: 2197, currentParty: 'BJP' },
  { acNo: 19, name: 'Nilokheri', localName: 'नीलोखेड़ी', district: 'Karnal', type: 'SC', winner2024: 'BJP', winnerName2024: 'Bhagwan Dass', winnerVotes2024: 77902, runnerUp2024: 'INC - Dharam Pal', margin2024: 18845, currentParty: 'BJP' },
  { acNo: 20, name: 'Indri', localName: 'इंद्री', district: 'Karnal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ram Kumar Kashyap', winnerVotes2024: 80465, runnerUp2024: 'INC - Rakesh Kamboj', margin2024: 15149, currentParty: 'BJP' },
  { acNo: 21, name: 'Karnal', localName: 'करनाल', district: 'Karnal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Jagmohan Anand', winnerVotes2024: 90006, runnerUp2024: 'INC - Sumita Virk', margin2024: 33652, currentParty: 'BJP' },
  { acNo: 22, name: 'Gharaunda', localName: 'घरौंडा', district: 'Karnal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Harvinder Kalyan', winnerVotes2024: 87236, runnerUp2024: 'INC - Varinder Singh Rathore', margin2024: 4531, currentParty: 'BJP' },
  { acNo: 23, name: 'Assandh', localName: 'असंध', district: 'Karnal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Yoginder Singh Rana', winnerVotes2024: 54761, runnerUp2024: 'INC - Shamsher Singh Gogi', margin2024: 2306, currentParty: 'BJP' },
  { acNo: 24, name: 'Panipat Rural', localName: 'पानीपत ग्रामीण', district: 'Panipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Mahipal Dhanda', winnerVotes2024: 101079, runnerUp2024: 'INC - Sachin Kundu', margin2024: 50212, currentParty: 'BJP' },
  { acNo: 25, name: 'Panipat City', localName: 'पानीपत शहर', district: 'Panipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Parmod Kumar Vij', winnerVotes2024: 81750, runnerUp2024: 'INC - Varinder Kumar Shah', margin2024: 35672, currentParty: 'BJP' },
  { acNo: 26, name: 'Israna', localName: 'इसराना', district: 'Panipat', type: 'SC', winner2024: 'BJP', winnerName2024: 'Krishan Lal Panwar', winnerVotes2024: 67538, runnerUp2024: 'INC - Balbir Singh Balmiki', margin2024: 13895, currentParty: 'BJP' },
  { acNo: 27, name: 'Samalkha', localName: 'समालखा', district: 'Panipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Manmohan Bhadana', winnerVotes2024: 81293, runnerUp2024: 'INC - Dharam Singh Chhoker', margin2024: 19315, currentParty: 'BJP' },
  { acNo: 28, name: 'Ganaur', localName: 'गन्नौर', district: 'Sonipat', type: 'GEN', winner2024: 'IND', winnerName2024: 'Devender Kadyan', winnerVotes2024: 77248, runnerUp2024: 'INC - Kuldip Sharma', margin2024: 35209, currentParty: 'IND' },
  { acNo: 29, name: 'Rai', localName: 'राई', district: 'Sonipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Krishna Gahlawat', winnerVotes2024: 64614, runnerUp2024: 'INC - Jai Bhagwan Antil', margin2024: 4673, currentParty: 'BJP' },
  { acNo: 30, name: 'Kharkhauda', localName: 'खरखौदा', district: 'Sonipat', type: 'SC', winner2024: 'BJP', winnerName2024: 'Pawan Kharkhoda', winnerVotes2024: 58084, runnerUp2024: 'INC - Jaiveer Singh', margin2024: 5635, currentParty: 'BJP' },
  { acNo: 31, name: 'Sonipat', localName: 'सोनीपत', district: 'Sonipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Nikhil Madaan', winnerVotes2024: 84827, runnerUp2024: 'INC - Surender Panwar', margin2024: 29627, currentParty: 'BJP' },
  { acNo: 32, name: 'Gohana', localName: 'गोहाना', district: 'Sonipat', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Arvind Kumar Sharma', winnerVotes2024: 57055, runnerUp2024: 'INC - Jagbir Singh Malik', margin2024: 10429, currentParty: 'BJP' },
  { acNo: 33, name: 'Baroda', localName: 'बड़ौदा', district: 'Sonipat', type: 'GEN', winner2024: 'INC', winnerName2024: 'Induraj Singh Narwal', winnerVotes2024: 54462, runnerUp2024: 'IND - Kapoor Singh Narwal', margin2024: 5642, currentParty: 'INC' },
  { acNo: 34, name: 'Julana', localName: 'जुलाना', district: 'Jind', type: 'GEN', winner2024: 'INC', winnerName2024: 'Vinesh', winnerVotes2024: 65080, runnerUp2024: 'BJP - Yogesh Kumar', margin2024: 6015, currentParty: 'INC' },
  { acNo: 35, name: 'Safidon', localName: 'सफीदों', district: 'Jind', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ram Kumar Gautam', winnerVotes2024: 58983, runnerUp2024: 'INC - Subhash Gangoli', margin2024: 4037, currentParty: 'BJP' },
  { acNo: 36, name: 'Jind', localName: 'जींद', district: 'Jind', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Dr Krishan Lal Middha', winnerVotes2024: 68920, runnerUp2024: 'INC - Mahavir Gupta', margin2024: 15860, currentParty: 'BJP' },
  { acNo: 37, name: 'Uchana Kalan', localName: 'उचाना कलां', district: 'Jind', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Devender Chatar Bhuj Attri', winnerVotes2024: 48968, runnerUp2024: 'INC - Brijendra Singh', margin2024: 32, currentParty: 'BJP' },
  { acNo: 38, name: 'Narwana', localName: 'नरवाना', district: 'Jind', type: 'SC', winner2024: 'BJP', winnerName2024: 'Krishan Kumar', winnerVotes2024: 59474, runnerUp2024: 'INC - Satbir Dablain', margin2024: 11499, currentParty: 'BJP' },
  { acNo: 39, name: 'Tohana', localName: 'टोहाना', district: 'Fatehabad', type: 'GEN', winner2024: 'INC', winnerName2024: 'Paramvir Singh', winnerVotes2024: 88522, runnerUp2024: 'BJP - Devender Singh Babli', margin2024: 10836, currentParty: 'INC' },
  { acNo: 40, name: 'Fatehabad', localName: 'फतेहाबाद', district: 'Fatehabad', type: 'GEN', winner2024: 'INC', winnerName2024: 'Balwan Singh Doulatpuria', winnerVotes2024: 86172, runnerUp2024: 'BJP - Dura Ram', margin2024: 2252, currentParty: 'INC' },
  { acNo: 41, name: 'Ratia', localName: 'रतिया', district: 'Fatehabad', type: 'SC', winner2024: 'INC', winnerName2024: 'Jarnail Singh', winnerVotes2024: 86426, runnerUp2024: 'BJP - Sunita Duggal', margin2024: 21442, currentParty: 'INC' },
  { acNo: 42, name: 'Kalanwali', localName: 'कालांवाली', district: 'Sirsa', type: 'SC', winner2024: 'INC', winnerName2024: 'Shishpal Keharwala', winnerVotes2024: 66728, runnerUp2024: 'BJP - Rajinder Singh Desujodha', margin2024: 22959, currentParty: 'INC' },
  { acNo: 43, name: 'Dabwali', localName: 'डबवाली', district: 'Sirsa', type: 'GEN', winner2024: 'INLD', winnerName2024: 'Aditya Devilal', winnerVotes2024: 56074, runnerUp2024: 'INC - Amit Sihag', margin2024: 610, currentParty: 'INLD' },
  { acNo: 44, name: 'Rania', localName: 'रानियां', district: 'Sirsa', type: 'GEN', winner2024: 'INLD', winnerName2024: 'Arjun Chautala', winnerVotes2024: 43914, runnerUp2024: 'INC - Sarv Mitter', margin2024: 4191, currentParty: 'INLD' },
  { acNo: 45, name: 'Sirsa', localName: 'सिरसा', district: 'Sirsa', type: 'GEN', winner2024: 'INC', winnerName2024: 'Gokul Setia', winnerVotes2024: 79020, runnerUp2024: 'HLP - Gopal Kanda', margin2024: 7234, currentParty: 'INC' },
  { acNo: 46, name: 'Ellenabad', localName: 'ऐलनाबाद', district: 'Sirsa', type: 'GEN', winner2024: 'INC', winnerName2024: 'Bharat Singh Beniwal', winnerVotes2024: 77865, runnerUp2024: 'INLD - Abhay Singh Chautala', margin2024: 15000, currentParty: 'INC' },
  { acNo: 47, name: 'Adampur', localName: 'आदमपुर', district: 'Hisar', type: 'GEN', winner2024: 'INC', winnerName2024: 'Chander Parkash S/O Arjun Lal', winnerVotes2024: 65371, runnerUp2024: 'BJP - Bhavya Bishnoi', margin2024: 1268, currentParty: 'INC' },
  { acNo: 48, name: 'Uklana', localName: 'उकलाना', district: 'Hisar', type: 'SC', winner2024: 'INC', winnerName2024: 'Naresh Selwal', winnerVotes2024: 78448, runnerUp2024: 'BJP - Anoop Dhanak', margin2024: 28092, currentParty: 'INC' },
  { acNo: 49, name: 'Narnaund', localName: 'नारनौंद', district: 'Hisar', type: 'GEN', winner2024: 'INC', winnerName2024: 'Jassi Petwar', winnerVotes2024: 84801, runnerUp2024: 'BJP - Capt. Abhimanyu', margin2024: 12578, currentParty: 'INC' },
  { acNo: 50, name: 'Hansi', localName: 'हांसी', district: 'Hisar', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Vinod Bhayana', winnerVotes2024: 78686, runnerUp2024: 'INC - Rahul Makkar', margin2024: 21460, currentParty: 'BJP' },
  { acNo: 51, name: 'Barwala', localName: 'बरवाला', district: 'Hisar', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ranbir Gangwa', winnerVotes2024: 66843, runnerUp2024: 'INC - Ramniwas Ghorela', margin2024: 26942, currentParty: 'BJP' },
  { acNo: 52, name: 'Hisar', localName: 'हिसार', district: 'Hisar', type: 'GEN', winner2024: 'IND', winnerName2024: 'Savitri Jindal', winnerVotes2024: 49231, runnerUp2024: 'INC - Ram Niwas Rara', margin2024: 18941, currentParty: 'IND' },
  { acNo: 53, name: 'Nalwa', localName: 'नलवा', district: 'Hisar', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Randhir Panihar', winnerVotes2024: 66330, runnerUp2024: 'INC - Anil Maan', margin2024: 12144, currentParty: 'BJP' },
  { acNo: 54, name: 'Loharu', localName: 'लोहारू', district: 'Bhiwani', type: 'GEN', winner2024: 'INC', winnerName2024: 'Rajbir Fartia', winnerVotes2024: 81336, runnerUp2024: 'BJP - Jai Parkash Dalal', margin2024: 792, currentParty: 'INC' },
  { acNo: 55, name: 'Badhra', localName: 'बाढड़ा', district: 'Bhiwani', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Umed Singh', winnerVotes2024: 59315, runnerUp2024: 'INC - Somvir Singh', margin2024: 7585, currentParty: 'BJP' },
  { acNo: 56, name: 'Dadri', localName: 'दादरी', district: 'Bhiwani', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Sunil Satpal Sangwan', winnerVotes2024: 65568, runnerUp2024: 'INC - Manisha Sangwan', margin2024: 1957, currentParty: 'BJP' },
  { acNo: 57, name: 'Bhiwani', localName: 'भिवानी', district: 'Bhiwani', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ghanshyam Saraf', winnerVotes2024: 67087, runnerUp2024: 'CPIM - Om Prakash', margin2024: 32714, currentParty: 'BJP' },
  { acNo: 58, name: 'Tosham', localName: 'तोशाम', district: 'Bhiwani', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Shruti Choudhry', winnerVotes2024: 76414, runnerUp2024: 'INC - Anirudh Chaudhary', margin2024: 14257, currentParty: 'BJP' },
  { acNo: 59, name: 'Bawani Khera', localName: 'बवानी खेड़ा', district: 'Bhiwani', type: 'SC', winner2024: 'BJP', winnerName2024: 'Kapoor Singh', winnerVotes2024: 80077, runnerUp2024: 'INC - Pradeep Narwal', margin2024: 21779, currentParty: 'BJP' },
  { acNo: 60, name: 'Meham', localName: 'महम', district: 'Rohtak', type: 'GEN', winner2024: 'INC', winnerName2024: 'Balram Dangi', winnerVotes2024: 56865, runnerUp2024: 'Haryana Jan Sevak Party - Balraj Kundu', margin2024: 18060, currentParty: 'INC' },
  { acNo: 61, name: 'Garhi Sampla - Kiloi', localName: 'गढ़ी सांपला-किलोई', district: 'Rohtak', type: 'GEN', winner2024: 'INC', winnerName2024: 'Bhupinder Singh Hooda', winnerVotes2024: 108539, runnerUp2024: 'BJP - Manju', margin2024: 71465, currentParty: 'INC' },
  { acNo: 62, name: 'Rohtak', localName: 'रोहतक', district: 'Rohtak', type: 'GEN', winner2024: 'INC', winnerName2024: 'Bharat Bhushan Batra', winnerVotes2024: 59419, runnerUp2024: 'BJP - Manish Kumar Grover', margin2024: 1341, currentParty: 'INC' },
  { acNo: 63, name: 'Kalanaur', localName: 'कलानौर', district: 'Rohtak', type: 'SC', winner2024: 'INC', winnerName2024: 'Shakuntla Khatak', winnerVotes2024: 69348, runnerUp2024: 'BJP - Renu Dabla', margin2024: 12232, currentParty: 'INC' },
  { acNo: 64, name: 'Bahadurgarh', localName: 'बहादुरगढ़', district: 'Jhajjar', type: 'GEN', winner2024: 'IND', winnerName2024: 'Rajesh Joon', winnerVotes2024: 73191, runnerUp2024: 'BJP - Dinesh Kaushik', margin2024: 41999, currentParty: 'IND' },
  { acNo: 65, name: 'Badli', localName: 'बादली', district: 'Jhajjar', type: 'GEN', winner2024: 'INC', winnerName2024: 'Kuldeep Vats', winnerVotes2024: 68160, runnerUp2024: 'BJP - Omprakash Dhankar', margin2024: 16820, currentParty: 'INC' },
  { acNo: 66, name: 'Jhajjar', localName: 'झज्जर', district: 'Jhajjar', type: 'SC', winner2024: 'INC', winnerName2024: 'Geeta Bhukkal', winnerVotes2024: 66345, runnerUp2024: 'BJP - Kaptan Birdhana', margin2024: 13555, currentParty: 'INC' },
  { acNo: 67, name: 'Beri', localName: 'बेरी', district: 'Jhajjar', type: 'GEN', winner2024: 'INC', winnerName2024: 'Raghuvir Singh Kadian', winnerVotes2024: 60630, runnerUp2024: 'BJP - Sanjay Kumar', margin2024: 35470, currentParty: 'INC' },
  { acNo: 68, name: 'Ateli', localName: 'अटेली', district: 'Mahendragarh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Arti Singh Rao', winnerVotes2024: 57737, runnerUp2024: 'BSP - Attar Lal', margin2024: 3085, currentParty: 'BJP' },
  { acNo: 69, name: 'Mahendragarh', localName: 'महेंद्रगढ़', district: 'Mahendragarh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Kanwar Singh', winnerVotes2024: 63036, runnerUp2024: 'INC - Rao Dan Singh', margin2024: 2648, currentParty: 'BJP' },
  { acNo: 70, name: 'Narnaul', localName: 'नारनौल', district: 'Mahendragarh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Om Prakash Yadav', winnerVotes2024: 57635, runnerUp2024: 'INC - Rao Narender Singh', margin2024: 17171, currentParty: 'BJP' },
  { acNo: 71, name: 'Nangal Chaudhry', localName: 'नांगल चौधरी', district: 'Mahendragarh', type: 'GEN', winner2024: 'INC', winnerName2024: 'Manju Choudhary', winnerVotes2024: 61989, runnerUp2024: 'BJP - Dr. Abhe Singh Yadav', margin2024: 6930, currentParty: 'INC' },
  { acNo: 72, name: 'Bawal', localName: 'बावल', district: 'Rewari', type: 'SC', winner2024: 'BJP', winnerName2024: 'Dr. Krishan Kumar', winnerVotes2024: 86858, runnerUp2024: 'INC - Dr. M.L. Ranga', margin2024: 20011, currentParty: 'BJP' },
  { acNo: 73, name: 'Kosli', localName: 'कोसली', district: 'Rewari', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Anil Yadav', winnerVotes2024: 92185, runnerUp2024: 'INC - Jagdish Yadav', margin2024: 17209, currentParty: 'BJP' },
  { acNo: 74, name: 'Rewari', localName: 'रेवाड़ी', district: 'Rewari', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Laxman Singh Yadav', winnerVotes2024: 83747, runnerUp2024: 'INC - Chiranjeev Rao', margin2024: 28769, currentParty: 'BJP' },
  { acNo: 75, name: 'Pataudi', localName: 'पटौदी', district: 'Gurgaon', type: 'SC', winner2024: 'BJP', winnerName2024: 'Bimla Chaudhary', winnerVotes2024: 98519, runnerUp2024: 'INC - Pearl Choudhary', margin2024: 46530, currentParty: 'BJP' },
  { acNo: 76, name: 'Badshahpur', localName: 'बादशाहपुर', district: 'Gurgaon', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Rao Narbir Singh', winnerVotes2024: 145503, runnerUp2024: 'INC - Vardhan Yadav', margin2024: 60705, currentParty: 'BJP' },
  { acNo: 77, name: 'Gurgaon', localName: 'गुड़गांव', district: 'Gurgaon', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Mukesh Sharma', winnerVotes2024: 122615, runnerUp2024: 'IND - Naveen Goyal', margin2024: 68045, currentParty: 'BJP' },
  { acNo: 78, name: 'Sohna', localName: 'सोहना', district: 'Gurgaon', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Tejpal Tanwar', winnerVotes2024: 61243, runnerUp2024: 'INC - Rohtas Singh', margin2024: 11877, currentParty: 'BJP' },
  { acNo: 79, name: 'Nuh', localName: 'नूंह', district: 'Mewat', type: 'GEN', winner2024: 'INC', winnerName2024: 'Aftab Ahmed', winnerVotes2024: 91833, runnerUp2024: 'INLD - Tahir Hussain', margin2024: 46963, currentParty: 'INC' },
  { acNo: 80, name: 'Ferozepur Jhirka', localName: 'फिरोजपुर झिरका', district: 'Mewat', type: 'GEN', winner2024: 'INC', winnerName2024: 'Mamman Khan', winnerVotes2024: 130497, runnerUp2024: 'BJP - Naseem Ahmed', margin2024: 98441, currentParty: 'INC' },
  { acNo: 81, name: 'Punahana', localName: 'पुनहाना', district: 'Mewat', type: 'GEN', winner2024: 'INC', winnerName2024: 'Mohammad Ilyas', winnerVotes2024: 85300, runnerUp2024: 'IND - Rahish Khan', margin2024: 31916, currentParty: 'INC' },
  { acNo: 82, name: 'Hathin', localName: 'हथीन', district: 'Palwal', type: 'GEN', winner2024: 'INC', winnerName2024: 'Mohd Israil', winnerVotes2024: 79907, runnerUp2024: 'BJP - Manoj Kumar', margin2024: 32396, currentParty: 'INC' },
  { acNo: 83, name: 'Hodal', localName: 'होडल', district: 'Palwal', type: 'SC', winner2024: 'BJP', winnerName2024: 'Harinder Singh', winnerVotes2024: 68865, runnerUp2024: 'INC - Udai Bhan', margin2024: 2595, currentParty: 'BJP' },
  { acNo: 84, name: 'Palwal', localName: 'पलवल', district: 'Palwal', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Gaurav Gautam', winnerVotes2024: 109118, runnerUp2024: 'INC - Karan Singh Dalal', margin2024: 33605, currentParty: 'BJP' },
  { acNo: 85, name: 'Prithla', localName: 'पृथला', district: 'Faridabad', type: 'GEN', winner2024: 'INC', winnerName2024: 'Raghubir Tewatia', winnerVotes2024: 70262, runnerUp2024: 'BJP - Tek Chand Sharma', margin2024: 20541, currentParty: 'INC' },
  { acNo: 86, name: 'Faridabad NIT', localName: 'फरीदाबाद एनआईटी', district: 'Faridabad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Satish Kumar Phagna', winnerVotes2024: 91992, runnerUp2024: 'INC - Neeraj Sharma', margin2024: 33217, currentParty: 'BJP' },
  { acNo: 87, name: 'Badkhal', localName: 'बड़खल', district: 'Faridabad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Dhanesh Adlakha', winnerVotes2024: 79476, runnerUp2024: 'INC - Vijay Pratap Singh', margin2024: 6181, currentParty: 'BJP' },
  { acNo: 88, name: 'Ballabgarh', localName: 'बल्लभगढ़', district: 'Faridabad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Mool Chand Sharma', winnerVotes2024: 61806, runnerUp2024: 'IND - Sharda Rathore', margin2024: 17730, currentParty: 'BJP' },
  { acNo: 89, name: 'Faridabad', localName: 'फरीदाबाद', district: 'Faridabad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Vipul Goel', winnerVotes2024: 93651, runnerUp2024: 'INC - Lakhan Kumar Singla', margin2024: 48388, currentParty: 'BJP' },
  { acNo: 90, name: 'Tigaon', localName: 'तिगांव', district: 'Faridabad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Rajesh Nagar', winnerVotes2024: 94229, runnerUp2024: 'IND - Lalit Nagar S/O Late Bharat Singh Nagar', margin2024: 37401, currentParty: 'BJP' },
];

export function getHRConstituency(acNo: number): HRConstituencySeed | undefined {
  return HR_CONSTITUENCIES.find(c => c.acNo === acNo);
}
