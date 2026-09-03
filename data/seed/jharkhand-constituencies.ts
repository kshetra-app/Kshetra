/**
 * Jharkhand Assembly Constituencies — 81 seats (2024)
 *
 * Source: Election Commission of India (ECI) / IndiaVotes
 * General Election to Assembly Constituencies November 2024
 */

export interface JHConstituencySeed {
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

export const JH_CONSTITUENCIES: JHConstituencySeed[] = [
  { acNo: 1, name: 'Rajmahal', localName: 'राजमहल', district: 'Sahebganj', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Md. Tajuddin', winnerVotes2024: 140176, runnerUp2024: 'BJP - Anant Kumar Ojha', margin2024: 43432, currentParty: 'JMM' },
  { acNo: 2, name: 'Borio', localName: 'बोरियो', district: 'Sahebganj', type: 'ST', winner2024: 'JMM', winnerName2024: 'Dhananjay Soren', winnerVotes2024: 97317, runnerUp2024: 'BJP - Lobin Hembram', margin2024: 19273, currentParty: 'JMM' },
  { acNo: 3, name: 'Barhait', localName: 'बरहैट', district: 'Sahebganj', type: 'ST', winner2024: 'JMM', winnerName2024: 'Hemant Soren', winnerVotes2024: 95612, runnerUp2024: 'BJP - Gamliyel Hembrom', margin2024: 39791, currentParty: 'JMM' },
  { acNo: 4, name: 'Litipara', localName: 'लिटीपाड़ा', district: 'Pakaur', type: 'ST', winner2024: 'JMM', winnerName2024: 'Hemlal Murmu', winnerVotes2024: 88469, runnerUp2024: 'BJP - Babudhan Murmu', margin2024: 26749, currentParty: 'JMM' },
  { acNo: 5, name: 'Pakur', localName: 'पाकुड़', district: 'Pakaur', type: 'GEN', winner2024: 'INC', winnerName2024: 'Nisat Alam', winnerVotes2024: 155827, runnerUp2024: 'AJSU - Azhar Islam', margin2024: 86029, currentParty: 'INC' },
  { acNo: 6, name: 'Maheshpur', localName: 'महेशपुर', district: 'Pakaur', type: 'ST', winner2024: 'JMM', winnerName2024: 'Stephen Marandi', winnerVotes2024: 114924, runnerUp2024: 'BJP - Navneet Anthony Hembrom', margin2024: 61175, currentParty: 'JMM' },
  { acNo: 7, name: 'Shikaripara', localName: 'शिकारीपाड़ा', district: 'Dumka', type: 'ST', winner2024: 'JMM', winnerName2024: 'Alok Kumar Soren', winnerVotes2024: 102199, runnerUp2024: 'BJP - Paritosh Soren', margin2024: 41174, currentParty: 'JMM' },
  { acNo: 8, name: 'Nala', localName: 'नाला', district: 'Jamtara', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Rabindra Nath Mahato', winnerVotes2024: 92702, runnerUp2024: 'BJP - Madhav Chandra Mahato', margin2024: 10483, currentParty: 'JMM' },
  { acNo: 9, name: 'Jamtara', localName: 'जामताड़ा', district: 'Jamtara', type: 'GEN', winner2024: 'INC', winnerName2024: 'Irfan Ansari', winnerVotes2024: 133266, runnerUp2024: 'BJP - Sita Murmu', margin2024: 43676, currentParty: 'INC' },
  { acNo: 10, name: 'Dumka', localName: 'दुमका', district: 'Dumka', type: 'ST', winner2024: 'JMM', winnerName2024: 'Basant Soren', winnerVotes2024: 95685, runnerUp2024: 'BJP - Sunil Soren', margin2024: 14588, currentParty: 'JMM' },
  { acNo: 11, name: 'Jama', localName: 'जामा', district: 'Dumka', type: 'ST', winner2024: 'JMM', winnerName2024: 'Lois Marandi', winnerVotes2024: 76424, runnerUp2024: 'BJP - Suresh Murmu', margin2024: 5738, currentParty: 'JMM' },
  { acNo: 12, name: 'Jarmundi', localName: 'जरमुंडी', district: 'Dumka', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Devendra Kunwar', winnerVotes2024: 94892, runnerUp2024: 'INC - Badal', margin2024: 17546, currentParty: 'BJP' },
  { acNo: 13, name: 'Madhupur', localName: 'मधुपुर', district: 'Deoghar', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Hafizul Hassan', winnerVotes2024: 143953, runnerUp2024: 'BJP - Ganga Narayan Singh', margin2024: 20027, currentParty: 'JMM' },
  { acNo: 14, name: 'Sarath', localName: 'सारठ', district: 'Deoghar', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Uday Shankar Singh', winnerVotes2024: 135219, runnerUp2024: 'BJP - Randhir Kumar Singh', margin2024: 37429, currentParty: 'JMM' },
  { acNo: 15, name: 'Deoghar', localName: 'देवघर', district: 'Deoghar', type: 'SC', winner2024: 'RJD', winnerName2024: 'Suresh Paswan', winnerVotes2024: 156079, runnerUp2024: 'BJP - Narayan Das', margin2024: 39721, currentParty: 'RJD' },
  { acNo: 16, name: 'Poreyahat', localName: 'पोड़ैयाहाट', district: 'Godda', type: 'GEN', winner2024: 'INC', winnerName2024: 'Pradeep Yadav', winnerVotes2024: 117842, runnerUp2024: 'BJP - Devendranath Singh', margin2024: 34130, currentParty: 'INC' },
  { acNo: 17, name: 'Godda', localName: 'गोड्डा', district: 'Godda', type: 'GEN', winner2024: 'RJD', winnerName2024: 'Sanjay Prasad Yadav', winnerVotes2024: 109487, runnerUp2024: 'BJP - Amit Kumar Mandal', margin2024: 21471, currentParty: 'RJD' },
  { acNo: 18, name: 'Mahagama', localName: 'महागामा', district: 'Godda', type: 'GEN', winner2024: 'INC', winnerName2024: 'Deepika Pandey Singh', winnerVotes2024: 114069, runnerUp2024: 'BJP - Ashok Kumar', margin2024: 18645, currentParty: 'INC' },
  { acNo: 19, name: 'Kodarma', localName: 'कोडरमा', district: 'Kodarma', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Dr. Neera Yadav', winnerVotes2024: 86734, runnerUp2024: 'RJD - Subhash Prasad Yadav', margin2024: 5815, currentParty: 'BJP' },
  { acNo: 20, name: 'Barkatha', localName: 'बरकठा', district: 'Hazaribagh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Amit Kumar Yadav', winnerVotes2024: 82221, runnerUp2024: 'JMM - Janki Prasad Yadav', margin2024: 3660, currentParty: 'BJP' },
  { acNo: 21, name: 'Barhi', localName: 'बरही', district: 'Hazaribagh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Manoj Kumar Yadav', winnerVotes2024: 113274, runnerUp2024: 'INC - Arun Sahu', margin2024: 49291, currentParty: 'BJP' },
  { acNo: 22, name: 'Barkagaon', localName: 'बड़कागांव', district: 'Ramgarh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Roshan Lal Choudhary', winnerVotes2024: 124468, runnerUp2024: 'INC - Amba Prasad', margin2024: 31393, currentParty: 'BJP' },
  { acNo: 23, name: 'Ramgarh', localName: 'रामगढ़', district: 'Ramgarh', type: 'GEN', winner2024: 'INC', winnerName2024: 'Mamta Devi', winnerVotes2024: 89818, runnerUp2024: 'AJSU - Sunita Choudhary', margin2024: 6790, currentParty: 'INC' },
  { acNo: 24, name: 'Mandu', localName: 'मांडू', district: 'Hazaribagh', type: 'GEN', winner2024: 'AJSU', winnerName2024: 'Nirmal Mahto', winnerVotes2024: 90871, runnerUp2024: 'INC - Jai Prakash Bhai Patel', margin2024: 231, currentParty: 'AJSU' },
  { acNo: 25, name: 'Hazaribagh', localName: 'हजारीबाग', district: 'Hazaribagh', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Pradip Prasad', winnerVotes2024: 139458, runnerUp2024: 'INC - Munna Singh', margin2024: 43477, currentParty: 'BJP' },
  { acNo: 26, name: 'Simaria', localName: 'सिमरिया', district: 'Chatra', type: 'SC', winner2024: 'BJP', winnerName2024: 'Kumar Ujjwal', winnerVotes2024: 111906, runnerUp2024: 'JMM - Manoj Kumar Chandra', margin2024: 4001, currentParty: 'BJP' },
  { acNo: 27, name: 'Chatra', localName: 'चतरा', district: 'Chatra', type: 'SC', winner2024: 'LJPRV', winnerName2024: 'Janardhan Paswan', winnerVotes2024: 109019, runnerUp2024: 'RJD - Rashmi Prakash', margin2024: 18401, currentParty: 'LJPRV' },
  { acNo: 28, name: 'Dhanwar', localName: 'धनवार', district: 'Giridih', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Babu Lal Marandi', winnerVotes2024: 106296, runnerUp2024: 'JMM - Nizam Uddin Ansari', margin2024: 35438, currentParty: 'BJP' },
  { acNo: 29, name: 'Bagodar', localName: 'बगोदर', district: 'Giridih', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Nagendra Mahto', winnerVotes2024: 127501, runnerUp2024: 'CPIML - Vinod Kumar Singh', margin2024: 32617, currentParty: 'BJP' },
  { acNo: 30, name: 'Jamua', localName: 'जमुआ', district: 'Giridih', type: 'SC', winner2024: 'BJP', winnerName2024: 'Manju Kumari', winnerVotes2024: 117532, runnerUp2024: 'JMM - Kedar Hazra', margin2024: 32631, currentParty: 'BJP' },
  { acNo: 31, name: 'Gandey', localName: 'गांडेय', district: 'Giridih', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Kalpana Murmu Soren', winnerVotes2024: 119372, runnerUp2024: 'BJP - Muniya Devi', margin2024: 17142, currentParty: 'JMM' },
  { acNo: 32, name: 'Giridih', localName: 'गिरिडीह', district: 'Giridih', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Sudivya Kumar', winnerVotes2024: 94042, runnerUp2024: 'BJP - Nirbhay Kumar Shahabadi', margin2024: 3838, currentParty: 'JMM' },
  { acNo: 33, name: 'Dumri', localName: 'डुमरी', district: 'Giridih', type: 'GEN', winner2024: 'JLKM', winnerName2024: 'Jairam Kumar Mahato', winnerVotes2024: 94496, runnerUp2024: 'JMM - Bebi Devi', margin2024: 10945, currentParty: 'JLKM' },
  { acNo: 34, name: 'Gomia', localName: 'गोमिया', district: 'Bokaro', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Yogendra Prasad', winnerVotes2024: 95170, runnerUp2024: 'JLKM - Puja Kumari', margin2024: 36093, currentParty: 'JMM' },
  { acNo: 35, name: 'Bermo', localName: 'बेरमो', district: 'Bokaro', type: 'GEN', winner2024: 'INC', winnerName2024: 'Kumar Jaimangal (Anup Singh)', winnerVotes2024: 90246, runnerUp2024: 'JLKM - Jairam Kumar Mahato', margin2024: 29375, currentParty: 'INC' },
  { acNo: 36, name: 'Bokaro', localName: 'बोकारो', district: 'Bokaro', type: 'GEN', winner2024: 'INC', winnerName2024: 'Shwettaa Singh', winnerVotes2024: 133438, runnerUp2024: 'BJP - Biranchi Narayan', margin2024: 7207, currentParty: 'INC' },
  { acNo: 37, name: 'Chandankiyari', localName: 'चंदनकियारी', district: 'Bokaro', type: 'SC', winner2024: 'JMM', winnerName2024: 'Uma Kant Rajak', winnerVotes2024: 90027, runnerUp2024: 'JLKM - Arjun Rajwar', margin2024: 33733, currentParty: 'JMM' },
  { acNo: 38, name: 'Sindri', localName: 'सिंदरी', district: 'Dhanbad', type: 'GEN', winner2024: 'CPIML', winnerName2024: 'Chandradeo Mahato', winnerVotes2024: 105136, runnerUp2024: 'BJP - Tara Devi', margin2024: 3448, currentParty: 'CPIML' },
  { acNo: 39, name: 'Nirsa', localName: 'निरसा', district: 'Dhanbad', type: 'GEN', winner2024: 'CPIML', winnerName2024: 'Arup Chatterjee', winnerVotes2024: 104855, runnerUp2024: 'BJP - Aparna Sengupta', margin2024: 1808, currentParty: 'CPIML' },
  { acNo: 40, name: 'Dhanbad', localName: 'धनबाद', district: 'Dhanbad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Raj Sinha', winnerVotes2024: 136336, runnerUp2024: 'INC - Ajay Kumar Dubey', margin2024: 48741, currentParty: 'BJP' },
  { acNo: 41, name: 'Jharia', localName: 'झरिया', district: 'Dhanbad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Ragini Singh', winnerVotes2024: 87892, runnerUp2024: 'INC - Purnima Niraj Singh', margin2024: 14511, currentParty: 'BJP' },
  { acNo: 42, name: 'Tundi', localName: 'टुंडी', district: 'Dhanbad', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Mathura Prasad Mahato', winnerVotes2024: 95527, runnerUp2024: 'BJP - Vikash Kumar Mahato', margin2024: 25603, currentParty: 'JMM' },
  { acNo: 43, name: 'Baghmara', localName: 'बाघमारा', district: 'Dhanbad', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Shatrughan Mahto', winnerVotes2024: 87529, runnerUp2024: 'INC - Jaleshwar Mahato', margin2024: 18682, currentParty: 'BJP' },
  { acNo: 44, name: 'Baharagora', localName: 'बहरागोड़ा', district: 'East Singhbhum', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Samir Kumar Mohanty', winnerVotes2024: 96870, runnerUp2024: 'BJP - Dineshananda Goswami', margin2024: 18125, currentParty: 'JMM' },
  { acNo: 45, name: 'Ghatsila', localName: 'घाटशिला', district: 'East Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Ram Das Soren', winnerVotes2024: 98356, runnerUp2024: 'BJP - Babu Lal Soren', margin2024: 22446, currentParty: 'JMM' },
  { acNo: 46, name: 'Potka', localName: 'पोटका', district: 'East Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Sanjib Sardar', winnerVotes2024: 120322, runnerUp2024: 'BJP - Meera Munda', margin2024: 27902, currentParty: 'JMM' },
  { acNo: 47, name: 'Jugsalai', localName: 'जुगसलाई', district: 'East Singhbhum', type: 'SC', winner2024: 'JMM', winnerName2024: 'Mangal Kalindi', winnerVotes2024: 121290, runnerUp2024: 'AJSU - Ram Chandra Sahis', margin2024: 43445, currentParty: 'JMM' },
  { acNo: 48, name: 'Jamshedpur East', localName: 'जमशेदपुर पूर्वी', district: 'East Singhbhum', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Purnima Sahu', winnerVotes2024: 107191, runnerUp2024: 'INC - Ajoy Kumar', margin2024: 42871, currentParty: 'BJP' },
  { acNo: 49, name: 'Jamshedpur West', localName: 'जमशेदपुर पश्चिमी', district: 'East Singhbhum', type: 'GEN', winner2024: 'JDU', winnerName2024: 'Saryu Roy', winnerVotes2024: 103631, runnerUp2024: 'INC - Banna Gupta', margin2024: 7863, currentParty: 'JDU' },
  { acNo: 50, name: 'Ichagarh', localName: 'ईचागढ़', district: 'Saraikela Kharsawan', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Sabita Mahato', winnerVotes2024: 77552, runnerUp2024: 'AJSU - Hare Lal Mahato', margin2024: 26523, currentParty: 'JMM' },
  { acNo: 51, name: 'Seraikella', localName: 'सरायकेला', district: 'Saraikela Kharsawan', type: 'ST', winner2024: 'BJP', winnerName2024: 'Champai Soren', winnerVotes2024: 119379, runnerUp2024: 'JMM - Ganesh Mahali', margin2024: 20447, currentParty: 'BJP' },
  { acNo: 52, name: 'Chaibasa', localName: 'चाईबासा', district: 'West Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Deepak Birua', winnerVotes2024: 107367, runnerUp2024: 'BJP - Geeta Balmuchu', margin2024: 64835, currentParty: 'JMM' },
  { acNo: 53, name: 'Majhgaon', localName: 'मझगांव', district: 'West Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Niral Purty', winnerVotes2024: 94163, runnerUp2024: 'BJP - Barkuwar Gagrai', margin2024: 59603, currentParty: 'JMM' },
  { acNo: 54, name: 'Jaganathpur', localName: 'जगन्नाथपुर', district: 'West Singhbhum', type: 'ST', winner2024: 'INC', winnerName2024: 'Sona Ram Sinku', winnerVotes2024: 57065, runnerUp2024: 'BJP - Geeta Kora', margin2024: 7383, currentParty: 'INC' },
  { acNo: 55, name: 'Manoharpur', localName: 'मनोहरपुर', district: 'West Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Jagat Majhi', winnerVotes2024: 73034, runnerUp2024: 'AJSU - Dinesh Chandra Boipai', margin2024: 31956, currentParty: 'JMM' },
  { acNo: 56, name: 'Chakradharpur', localName: 'चक्रधरपुर', district: 'West Singhbhum', type: 'ST', winner2024: 'JMM', winnerName2024: 'Sukhram Oraon', winnerVotes2024: 58639, runnerUp2024: 'BJP - Shashibhushan Samad', margin2024: 9310, currentParty: 'JMM' },
  { acNo: 57, name: 'Kharsawan', localName: 'खरसावां', district: 'Saraikela Kharsawan', type: 'ST', winner2024: 'JMM', winnerName2024: 'Dashrath Gagrai', winnerVotes2024: 85772, runnerUp2024: 'BJP - Sonaram Bodra', margin2024: 32615, currentParty: 'JMM' },
  { acNo: 58, name: 'Tamar', localName: 'तमाड़', district: 'Ranchi', type: 'ST', winner2024: 'JMM', winnerName2024: 'Vikas Kumar Munda', winnerVotes2024: 65655, runnerUp2024: 'JDU - Gopal Krishna Patar', margin2024: 24246, currentParty: 'JMM' },
  { acNo: 59, name: 'Torpa', localName: 'तोरपा', district: 'Khunti', type: 'ST', winner2024: 'JMM', winnerName2024: 'Sudeep Gudhiya', winnerVotes2024: 80887, runnerUp2024: 'BJP - Koche Munda', margin2024: 40647, currentParty: 'JMM' },
  { acNo: 60, name: 'Khunti', localName: 'खूंटी', district: 'Khunti', type: 'ST', winner2024: 'JMM', winnerName2024: 'Ram Surya Munda', winnerVotes2024: 91721, runnerUp2024: 'BJP - Nilkanth Singh Munda', margin2024: 42053, currentParty: 'JMM' },
  { acNo: 61, name: 'Silli', localName: 'सिल्ली', district: 'Ranchi', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Amit Kumar', winnerVotes2024: 73169, runnerUp2024: 'AJSU - Sudesh Kumar Mahto', margin2024: 23867, currentParty: 'JMM' },
  { acNo: 62, name: 'Khijri', localName: 'खिजरी', district: 'Ranchi', type: 'ST', winner2024: 'INC', winnerName2024: 'Rajesh Kachhap', winnerVotes2024: 124049, runnerUp2024: 'BJP - Ram Kumar Pahan', margin2024: 29065, currentParty: 'INC' },
  { acNo: 63, name: 'Ranchi', localName: 'रांची', district: 'Ranchi', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Chandreshwar Prasad Singh', winnerVotes2024: 107290, runnerUp2024: 'JMM - Mahua Maji', margin2024: 21949, currentParty: 'BJP' },
  { acNo: 64, name: 'Hatia', localName: 'हटिया', district: 'Ranchi', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Navin Jaiswal', winnerVotes2024: 152949, runnerUp2024: 'INC - Ajay Nath Shahdeo', margin2024: 14623, currentParty: 'BJP' },
  { acNo: 65, name: 'Kanke', localName: 'कांके', district: 'Ranchi', type: 'SC', winner2024: 'INC', winnerName2024: 'Suresh Kumar Baitha', winnerVotes2024: 133499, runnerUp2024: 'BJP - Dr. Jitu Charan Ram', margin2024: 968, currentParty: 'INC' },
  { acNo: 66, name: 'Mandar', localName: 'मांडर', district: 'Ranchi', type: 'ST', winner2024: 'INC', winnerName2024: 'Shilpi Neha Tirkey', winnerVotes2024: 135936, runnerUp2024: 'BJP - Sunny Toppo', margin2024: 22803, currentParty: 'INC' },
  { acNo: 67, name: 'Sisai', localName: 'सिसई', district: 'Gumla', type: 'ST', winner2024: 'JMM', winnerName2024: 'Jiga Susaran Horo', winnerVotes2024: 106058, runnerUp2024: 'BJP - Arun Kumar Oraon', margin2024: 38989, currentParty: 'JMM' },
  { acNo: 68, name: 'Gumla', localName: 'गुमला', district: 'Gumla', type: 'ST', winner2024: 'JMM', winnerName2024: 'Bhushan Tirkey', winnerVotes2024: 84974, runnerUp2024: 'BJP - Sudarshan Bhagat', margin2024: 26301, currentParty: 'JMM' },
  { acNo: 69, name: 'Bishunpur', localName: 'विशुनपुर', district: 'Gumla', type: 'ST', winner2024: 'JMM', winnerName2024: 'Chamra Linda', winnerVotes2024: 100336, runnerUp2024: 'BJP - Samir Oraon', margin2024: 32756, currentParty: 'JMM' },
  { acNo: 70, name: 'Simdega', localName: 'सिमडेगा', district: 'Simdega', type: 'ST', winner2024: 'INC', winnerName2024: 'Bhushan Bara', winnerVotes2024: 75392, runnerUp2024: 'BJP - Shradhanand Besra', margin2024: 9228, currentParty: 'INC' },
  { acNo: 71, name: 'Kolebira', localName: 'कोलेबिरा', district: 'Simdega', type: 'ST', winner2024: 'INC', winnerName2024: 'Naman Bixal Kongari', winnerVotes2024: 75376, runnerUp2024: 'BJP - Sujan Jojo', margin2024: 37031, currentParty: 'INC' },
  { acNo: 72, name: 'Lohardaga', localName: 'लोहरदगा', district: 'Lohardaga', type: 'ST', winner2024: 'INC', winnerName2024: 'Rameshwar Oraon', winnerVotes2024: 113507, runnerUp2024: 'AJSU - Neru Shanti Bhagat', margin2024: 34670, currentParty: 'INC' },
  { acNo: 73, name: 'Manika', localName: 'मनिका', district: 'Latehar', type: 'ST', winner2024: 'INC', winnerName2024: 'Ramchandra Singh', winnerVotes2024: 74946, runnerUp2024: 'BJP - Harikrishna Singh', margin2024: 16854, currentParty: 'INC' },
  { acNo: 74, name: 'Latehar', localName: 'लातेहार', district: 'Latehar', type: 'SC', winner2024: 'BJP', winnerName2024: 'Prakash Ram', winnerVotes2024: 98062, runnerUp2024: 'JMM - Baidyanath Ram', margin2024: 434, currentParty: 'BJP' },
  { acNo: 75, name: 'Panki', localName: 'पांकी', district: 'Palamau', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Kushwaha Shashi Bhushan Mehta', winnerVotes2024: 75991, runnerUp2024: 'IND - Devendra Kumar Singh', margin2024: 9796, currentParty: 'BJP' },
  { acNo: 76, name: 'Daltonganj', localName: 'डाल्टनगंज', district: 'Palamau', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Alok Kumar Chaurasiya', winnerVotes2024: 102175, runnerUp2024: 'INC - Krishna Nand Tripathi', margin2024: 890, currentParty: 'BJP' },
  { acNo: 77, name: 'Bishrampur', localName: 'विश्रामपुर', district: 'Palamau', type: 'GEN', winner2024: 'RJD', winnerName2024: 'Naresh Prasad Singh', winnerVotes2024: 74338, runnerUp2024: 'BJP - Ramchandra Chandravanshi', margin2024: 14587, currentParty: 'RJD' },
  { acNo: 78, name: 'Chhatarpur', localName: 'छतरपुर', district: 'Palamau', type: 'SC', winner2024: 'INC', winnerName2024: 'Radha Krishana Kishore', winnerVotes2024: 71857, runnerUp2024: 'BJP - Pushpa Devi', margin2024: 736, currentParty: 'INC' },
  { acNo: 79, name: 'Hussainabad', localName: 'हुसैनाबाद', district: 'Palamau', type: 'GEN', winner2024: 'RJD', winnerName2024: 'Sanjay Kumar Singh Yadav', winnerVotes2024: 81476, runnerUp2024: 'BJP - Kamlesh Kumar Singh', margin2024: 34364, currentParty: 'RJD' },
  { acNo: 80, name: 'Garhwa', localName: 'गढ़वा', district: 'Garhwa', type: 'GEN', winner2024: 'BJP', winnerName2024: 'Satyendra Nath Tiwari', winnerVotes2024: 133109, runnerUp2024: 'JMM - Mithilesh Kumar Thakur', margin2024: 16753, currentParty: 'BJP' },
  { acNo: 81, name: 'Bhawanathpur', localName: 'भवनाथपुर', district: 'Garhwa', type: 'GEN', winner2024: 'JMM', winnerName2024: 'Anant Pratap Deo', winnerVotes2024: 146265, runnerUp2024: 'BJP - Bhanu Pratap Shahi', margin2024: 21462, currentParty: 'JMM' },
];

export function getJHConstituency(acNo: number): JHConstituencySeed | undefined {
  return JH_CONSTITUENCIES.find(c => c.acNo === acNo);
}
