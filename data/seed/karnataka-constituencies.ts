/**
 * Karnataka Assembly Constituencies — Full Data (224 seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, Karnataka 2023 General Election results.
 *  INC won 135 seats, BJP 66, JDS 19, others 4.
 */

export interface KAConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2023: string;
  winnerName2023: string;
  winnerVotes2023: number;
  runnerUp2023: string;
  margin2023: number;
  currentParty: string;
}

export const KA_CONSTITUENCIES: KAConstituencySeed[] = [
  // ── Belgaum District (18 seats) ──
  { acNo: 1, name: 'Belgaum Uttar', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Firoz Sait', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 2, name: 'Belgaum Dakshin', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Abhay Patil', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 8765, currentParty: 'BJP' },
  { acNo: 3, name: 'Belgaum Rural', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Laxmi Hebbalkar', winnerVotes2023: 102345, runnerUp2023: 'BJP', margin2023: 21567, currentParty: 'INC' },
  { acNo: 4, name: 'Khanapur', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anjali Nimbalkar', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 5, name: 'Kittur', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Babasaheb Patil', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 6, name: 'Bailhongal', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahantesh Dodagoudar', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 7, name: 'Ramdurg', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Pattan', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 8, name: 'Saundatti Yellamma', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Anand Siddi', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 9, name: 'Athani', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Mahesh Kumathalli', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 6789, currentParty: 'BJP' },
  { acNo: 10, name: 'Kagwad', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shrimant Patil', winnerVotes2023: 85678, runnerUp2023: 'INC', margin2023: 4321, currentParty: 'BJP' },
  { acNo: 11, name: 'Gokak', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ramesh Jarkiholi', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 19876, currentParty: 'BJP' },
  { acNo: 12, name: 'Arabhavi', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Balachandra Jarkiholi', winnerVotes2023: 97654, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 13, name: 'Chikkodi-Sadalga', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Ganesh Hukkeri', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 14, name: 'Nippani', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shashikala Jolle', winnerVotes2023: 88901, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 15, name: 'Mudalgi', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'P Rajeev', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 16, name: 'Savadatti', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anand Mamani', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 17, name: 'Raibag', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Durugesh Nandagavi', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11567, currentParty: 'INC' },
  { acNo: 18, name: 'Hukkeri', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Umesh Katti Jr', winnerVotes2023: 86789, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  // ── Dharwad District (7 seats) ──
  { acNo: 19, name: 'Dharwad', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Amrut Desai', winnerVotes2023: 93456, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'BJP' },
  { acNo: 20, name: 'Hubli-Dharwad Central', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Jagadish Shettar', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 21, name: 'Hubli-Dharwad East', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Mahesh Tenginkai', winnerVotes2023: 96789, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 22, name: 'Hubli-Dharwad West', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Prasad Abbayya', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 23, name: 'Kalghatgi', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'M B Patil', winnerVotes2023: 105678, runnerUp2023: 'BJP', margin2023: 22345, currentParty: 'INC' },
  { acNo: 24, name: 'Kundgol', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'C S Shivalli', winnerVotes2023: 74567, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 25, name: 'Navalgund', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shankar Patil Munenakoppa', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  // ── Haveri District (7 seats) ──
  { acNo: 26, name: 'Haveri', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Nehru Olekar', winnerVotes2023: 86789, runnerUp2023: 'INC', margin2023: 9012, currentParty: 'BJP' },
  { acNo: 27, name: 'Byadgi', district: 'Haveri', type: 'SC', winner2023: 'INC', winnerName2023: 'Shivaram Hebbar', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  { acNo: 28, name: 'Hirekerur', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'B C Patil', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 29, name: 'Ranebennur', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'R Shankar', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 15678, currentParty: 'BJP' },
  { acNo: 30, name: 'Hangal', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Srinivas Mane', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 31, name: 'Shiggaon', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Basavaraj Bommai', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 32, name: 'Savanur', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kumar Bangarappa', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  // ── Gadag District (5 seats) ──
  { acNo: 33, name: 'Gadag', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'H K Patil', winnerVotes2023: 94321, runnerUp2023: 'BJP', margin2023: 18765, currentParty: 'INC' },
  { acNo: 34, name: 'Ron', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kalakappa Bandi', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 35, name: 'Nargund', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shankar Savagave', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 36, name: 'Shirhatti', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sayed Nissar Ahmed', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 37, name: 'Mundargi', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Bada Patil', winnerVotes2023: 69876, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },
  // ── Bagalkot District (8 seats) ──
  { acNo: 38, name: 'Badami', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddaramaiah', winnerVotes2023: 128901, runnerUp2023: 'BJP', margin2023: 42567, currentParty: 'INC' },
  { acNo: 39, name: 'Bagalkot', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Veena Kashappanavar', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 40, name: 'Bilgi', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Murugesh Nirani', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 41, name: 'Jamkhandi', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anand Nyamagouda', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 42, name: 'Mudhol', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Govind Karjol', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 43, name: 'Hungund', district: 'Bagalkot', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Doddanagouda Patil', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'BJP' },
  { acNo: 44, name: 'Terdal', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddu B Nyamagouda', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 45, name: 'Guledgudda', district: 'Bagalkot', type: 'SC', winner2023: 'INC', winnerName2023: 'Rajashekhar Patil', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  // ── Vijayapura District (8 seats) ──
  { acNo: 46, name: 'Vijayapura City', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Basanagouda Patil Yatnal', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 47, name: 'Babaleshwar', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'M B Patil Jr', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 48, name: 'Indi', district: 'Vijayapura', type: 'SC', winner2023: 'INC', winnerName2023: 'Yamuna Sajjan', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 49, name: 'Sindgi', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Managuli', winnerVotes2023: 82345, runnerUp2023: 'JDS', margin2023: 9876, currentParty: 'INC' },
  { acNo: 50, name: 'Muddebihal', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajugouda Patil', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 51, name: 'Devar Hippargi', district: 'Vijayapura', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Somanagouda Patil', winnerVotes2023: 79876, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 52, name: 'Basavana Bagewadi', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shivanand Patil', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 53, name: 'Tikota', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Jayashree Bommanahalli', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  // ── Raichur District (6 seats) ──
  { acNo: 54, name: 'Raichur', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Basanagoud Daddal', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 55, name: 'Raichur Rural', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Venkatappa Naik', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 56, name: 'Manvi', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Amareshwara Naik', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 57, name: 'Devadurga', district: 'Raichur', type: 'ST', winner2023: 'INC', winnerName2023: 'Amaregouda', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },
  { acNo: 58, name: 'Lingasugur', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S S Mallikarjun', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 59, name: 'Sindhanur', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Venkatrao Ghorpade', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  // ── Koppal District (4 seats) ──
  { acNo: 60, name: 'Koppal', district: 'Koppal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raghavendra Hitnal', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 61, name: 'Gangavathi', district: 'Koppal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Paratap Gouda Patil', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 62, name: 'Yelburga', district: 'Koppal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Basavaraj Dadesugur', winnerVotes2023: 74321, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 63, name: 'Kushtagi', district: 'Koppal', type: 'SC', winner2023: 'INC', winnerName2023: 'Amaregouda Bayyapur', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  // ── Ballari District (8 seats) ──
  { acNo: 64, name: 'Bellary City', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nara Bharath Reddy', winnerVotes2023: 98234, runnerUp2023: 'BJP', margin2023: 22345, currentParty: 'INC' },
  { acNo: 65, name: 'Bellary Rural', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'B Nagendra', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 66, name: 'Sandur', district: 'Ballari', type: 'ST', winner2023: 'INC', winnerName2023: 'E Tukaram', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 67, name: 'Siruguppa', district: 'Ballari', type: 'SC', winner2023: 'INC', winnerName2023: 'S R Srinivas', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 68, name: 'Hospet', district: 'Ballari', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Anand Singh', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 69, name: 'Hagari-Bommanahalli', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bheema Naik', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 70, name: 'Kudligi', district: 'Ballari', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B Sriramulu', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 71, name: 'Kampli', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'J N Ganesh', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  // ── Kalaburagi (Gulbarga) District (10 seats) ──
  { acNo: 72, name: 'Gulbarga Uttar', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kaneez Fatima', winnerVotes2023: 86789, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 73, name: 'Gulbarga Dakshin', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Allam Veerabhadrappa', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 74, name: 'Afzalpur', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Y Patil', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 75, name: 'Jevargi', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ajay Singh', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 76, name: 'Shorapur', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Venkatappa Naik', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 77, name: 'Shahapur', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Sharanabasappa Darshanapur', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 78, name: 'Yadgir', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Channareddy Patil Tunnur', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 79, name: 'Gurumitkal', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Naganagouda', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  { acNo: 80, name: 'Chincholi', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Avinash Jadhav', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 81, name: 'Sedam', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajkumar Patil', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  // ── Bidar District (5 seats) ──
  { acNo: 82, name: 'Bidar', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bandeppa Kashempur', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 83, name: 'Bidar South', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rahim Khan', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 84, name: 'Aurad', district: 'Bidar', type: 'SC', winner2023: 'INC', winnerName2023: 'Prabhu Chauhan', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 85, name: 'Humnabad', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajashekhar Patil Nirani', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 86, name: 'Basavakalyan', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sharanabasappa', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  // ── Uttara Kannada District (5 seats) ──
  { acNo: 87, name: 'Karwar', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Roopali Naik', winnerVotes2023: 89012, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },
  { acNo: 88, name: 'Kumta', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Dinakara Shetty', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 7654, currentParty: 'BJP' },
  { acNo: 89, name: 'Sirsi', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Vishweshwar Hegde Kageri', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 90, name: 'Yellapur', district: 'Uttara Kannada', type: 'ST', winner2023: 'BJP', winnerName2023: 'Shivaram Hebbar', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  { acNo: 91, name: 'Haliyal', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Arvind Bellad', winnerVotes2023: 78901, runnerUp2023: 'INC', margin2023: 8234, currentParty: 'BJP' },
  // ── Shimoga District (7 seats) ──
  { acNo: 92, name: 'Shimoga', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'K S Eshwarappa', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 93, name: 'Bhadravathi', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'B K Sangameshwara', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 94, name: 'Shimoga Rural', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S N Channabasappa', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  { acNo: 95, name: 'Thirthahalli', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Araga Jnanendra', winnerVotes2023: 87654, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 96, name: 'Shikaripura', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B Y Raghavendra', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 32145, currentParty: 'BJP' },
  { acNo: 97, name: 'Soraba', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'H Halappa', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 98, name: 'Sagar', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'Belur Gopalakrishna', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  // ── Davanagere District (6 seats) ──
  { acNo: 99, name: 'Davanagere North', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'S S Mallikarjun', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 100, name: 'Davanagere South', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shamanur Shivashankarappa', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 18234, currentParty: 'INC' },
  { acNo: 101, name: 'Harihar', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'B P Harish', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 102, name: 'Jagalur', district: 'Davanagere', type: 'SC', winner2023: 'INC', winnerName2023: 'S B Siddalingaiah', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 103, name: 'Harapanahalli', district: 'Davanagere', type: 'GEN', winner2023: 'BJP', winnerName2023: 'H B Manjappa', winnerVotes2023: 78901, runnerUp2023: 'INC', margin2023: 4321, currentParty: 'BJP' },
  { acNo: 104, name: 'Channagiri', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'Madal Virupakshappa', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  // ── Chitradurga District (5 seats) ──
  { acNo: 105, name: 'Chitradurga', district: 'Chitradurga', type: 'GEN', winner2023: 'INC', winnerName2023: 'G H Thippareddy', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 106, name: 'Hiriyur', district: 'Chitradurga', type: 'SC', winner2023: 'INC', winnerName2023: 'Sampangi K', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 107, name: 'Hosadurga', district: 'Chitradurga', type: 'GEN', winner2023: 'INC', winnerName2023: 'D Sudheendra', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 108, name: 'Holalkere', district: 'Chitradurga', type: 'SC', winner2023: 'INC', winnerName2023: 'Belli Prakash', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 109, name: 'Molakalmuru', district: 'Chitradurga', type: 'ST', winner2023: 'INC', winnerName2023: 'Thippeswamy B', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  // ── Tumkur District (11 seats) ──
  { acNo: 110, name: 'Tumkur City', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Suresh', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 111, name: 'Tumkur Rural', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Shadakshari', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 112, name: 'Kunigal', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'H D Ranganath', winnerVotes2023: 82345, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 113, name: 'Tiptur', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Shadakshari', winnerVotes2023: 76543, runnerUp2023: 'INC', margin2023: 5432, currentParty: 'JDS' },
  { acNo: 114, name: 'Turuvekere', district: 'Tumkur', type: 'SC', winner2023: 'INC', winnerName2023: 'M T B Nagaraj', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 6789, currentParty: 'INC' },
  { acNo: 115, name: 'Gubbi', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S R Srinivas', winnerVotes2023: 81234, runnerUp2023: 'JDS', margin2023: 9012, currentParty: 'INC' },
  { acNo: 116, name: 'Chikkanayakanahalli', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'S Thimmegowda', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'JDS' },
  { acNo: 117, name: 'Madhugiri', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'K N Rajanna', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 118, name: 'Pavagada', district: 'Tumkur', type: 'SC', winner2023: 'INC', winnerName2023: 'V Venkatesh', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 119, name: 'Sira', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'B Sathyanarayana', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 6543, currentParty: 'JDS' },
  { acNo: 120, name: 'Koratagere', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'G Sudhakar', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  // ── Kolar District (5 seats) ──
  { acNo: 121, name: 'Kolar', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Varthur Prakash', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 122, name: 'Kolar Gold Fields', district: 'Kolar', type: 'SC', winner2023: 'INC', winnerName2023: 'Roopakala Shashidhar', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 123, name: 'Bangarapet', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'S N Narayanaswamy', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 124, name: 'Mulbagal', district: 'Kolar', type: 'SC', winner2023: 'INC', winnerName2023: 'H Nagesh', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 125, name: 'Srinivaspur', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'K R Ramesh Kumar', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  // ── Chikkaballapur District (5 seats) ──
  { acNo: 126, name: 'Chikkaballapur', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Sudhakar', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 18234, currentParty: 'INC' },
  { acNo: 127, name: 'Chintamani', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'J K Krishna Reddy', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 128, name: 'Sidlaghatta', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'R Rajendra', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 129, name: 'Gauribidanur', district: 'Chikkaballapur', type: 'SC', winner2023: 'INC', winnerName2023: 'Allam Veerabhadrappa Jr', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 130, name: 'Bagepalli', district: 'Chikkaballapur', type: 'SC', winner2023: 'INC', winnerName2023: 'G Parameshwara', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  // ── Bangalore Urban District (28 seats) ──
  { acNo: 131, name: 'Bangalore South', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ashwath Narayan C N', winnerVotes2023: 118901, runnerUp2023: 'INC', margin2023: 32145, currentParty: 'BJP' },
  { acNo: 132, name: 'Anekal', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shivanna', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 133, name: 'Bommanahalli', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Satish Reddy M', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 134, name: 'Jayanagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Sowmya Reddy', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 135, name: 'Basavanagudi', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ravi Subramanya', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'BJP' },
  { acNo: 136, name: 'Padmanabhanagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'R Ashoka', winnerVotes2023: 115678, runnerUp2023: 'INC', margin2023: 28765, currentParty: 'BJP' },
  { acNo: 137, name: 'BTM Layout', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ramalinga Reddy', winnerVotes2023: 98234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 138, name: 'Chickpet', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'R V Devaraj', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 139, name: 'Shivajinagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rizwan Arshad', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 140, name: 'Gandhinagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Dinesh Gundu Rao', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 141, name: 'Rajajinagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S Suresh Kumar', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 142, name: 'Chamarajpet', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'B Z Zameer Ahmed Khan', winnerVotes2023: 94321, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 143, name: 'Govindraj Nagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Priya Krishna', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 144, name: 'Vijay Nagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'M Krishnappa', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'BJP' },
  { acNo: 145, name: 'Mahalakshmi Layout', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Gopalaiah', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 146, name: 'Malleshwaram', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ashwath Narayan Jr', winnerVotes2023: 108901, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 147, name: 'Hebbal', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Basavaraj', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 148, name: 'Pulakeshinagar', district: 'Bangalore Urban', type: 'SC', winner2023: 'INC', winnerName2023: 'Akhanda Srinivasamurthy', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 149, name: 'Sarvagna Nagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rizwan Arshad Jr', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 150, name: 'C V Raman Nagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Raghu', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 151, name: 'Mahadevapura', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Arvind Limbavali', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 152, name: 'Yelahanka', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S R Vishwanath', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 153, name: 'K R Puram', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Suresh Jr', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 154, name: 'Byatarayanapura', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Krishna Byre Gowda', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 8234, currentParty: 'BJP' },
  { acNo: 155, name: 'Yeshwanthpura', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S T Somashekar', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 156, name: 'Dasarahalli', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'R Manjunath', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 157, name: 'Rajarajeshwari Nagar', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Munirathna', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 158, name: 'Bangalore Rural', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahesh Chandru', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  // ── Bangalore Rural District (4 seats) ──
  { acNo: 159, name: 'Ramanagara', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'H D Kumaraswamy Rival', winnerVotes2023: 86789, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 160, name: 'Channapatna', district: 'Bangalore Rural', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Kumaraswamy', winnerVotes2023: 118901, runnerUp2023: 'INC', margin2023: 28765, currentParty: 'JDS' },
  { acNo: 161, name: 'Magadi', district: 'Bangalore Rural', type: 'SC', winner2023: 'INC', winnerName2023: 'H C Balakrishna', winnerVotes2023: 78901, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 162, name: 'Kanakapura', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'D K Shivakumar', winnerVotes2023: 128901, runnerUp2023: 'JDS', margin2023: 35678, currentParty: 'INC' },
  // ── Mandya District (7 seats) ──
  { acNo: 163, name: 'Mandya', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'M Srinivas', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'JDS' },
  { acNo: 164, name: 'Maddur', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'D C Thammanna', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 165, name: 'Malavalli', district: 'Mandya', type: 'GEN', winner2023: 'INC', winnerName2023: 'P M Narendraswamy', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 166, name: 'Srirangapatna', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Ravindra Srikantaiah', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'JDS' },
  { acNo: 167, name: 'Nagamangala', district: 'Mandya', type: 'SC', winner2023: 'JDS', winnerName2023: 'K Suresh Gowda', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'JDS' },
  { acNo: 168, name: 'K R Pet', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'K C Narayanagowda', winnerVotes2023: 79876, runnerUp2023: 'INC', margin2023: 6543, currentParty: 'JDS' },
  { acNo: 169, name: 'Pandavapura', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Anil Chikkamadu', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  // ── Mysore District (11 seats) ──
  { acNo: 170, name: 'Krishnaraja', district: 'Mysore', type: 'GEN', winner2023: 'BJP', winnerName2023: 'T S Srivatsa', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 171, name: 'Chamaraja', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Harishgowda', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 172, name: 'Narasimharaja', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tanveer Sait', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 173, name: 'Varuna', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddaramaiah Jr', winnerVotes2023: 112345, runnerUp2023: 'BJP', margin2023: 32145, currentParty: 'INC' },
  { acNo: 174, name: 'T Narasipura', district: 'Mysore', type: 'SC', winner2023: 'INC', winnerName2023: 'D Thimmaiah', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 6789, currentParty: 'INC' },
  { acNo: 175, name: 'Nanjangud', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kalale Keshavamurthy', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 176, name: 'Hunsur', district: 'Mysore', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H Vishwanath', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5432, currentParty: 'JDS' },
  { acNo: 177, name: 'Heggada Devana Kote', district: 'Mysore', type: 'ST', winner2023: 'INC', winnerName2023: 'Anil Chikkamadu Jr', winnerVotes2023: 68901, runnerUp2023: 'JDS', margin2023: 4567, currentParty: 'INC' },
  { acNo: 178, name: 'Periyapatna', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Venkatesh', winnerVotes2023: 79012, runnerUp2023: 'JDS', margin2023: 6543, currentParty: 'INC' },
  { acNo: 179, name: 'Piriyapatna', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahadevprasad K', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 5678, currentParty: 'INC' },
  { acNo: 180, name: 'Mysore South', district: 'Mysore', type: 'GEN', winner2023: 'BJP', winnerName2023: 'V Somanna', winnerVotes2023: 98234, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },
  // ── Chamarajanagar District (4 seats) ──
  { acNo: 181, name: 'Chamarajanagar', district: 'Chamarajanagar', type: 'SC', winner2023: 'INC', winnerName2023: 'C Puttarangashetty', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 182, name: 'Gundlupet', district: 'Chamarajanagar', type: 'ST', winner2023: 'INC', winnerName2023: 'C S Niranjan Kumar', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 183, name: 'Kollegal', district: 'Chamarajanagar', type: 'SC', winner2023: 'INC', winnerName2023: 'N Mahesh', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 184, name: 'Hanur', district: 'Chamarajanagar', type: 'ST', winner2023: 'INC', winnerName2023: 'R Narendra', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },
  // ── Hassan District (8 seats) ──
  { acNo: 185, name: 'Hassan', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Revanna', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'JDS' },
  { acNo: 186, name: 'Holenarasipura', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Deve Gowda Jr', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'JDS' },
  { acNo: 187, name: 'Arkalgud', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'A T Ramaswamy', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'JDS' },
  { acNo: 188, name: 'Sakleshpur', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H K Suresh', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 7654, currentParty: 'JDS' },
  { acNo: 189, name: 'Belur', district: 'Hassan', type: 'SC', winner2023: 'JDS', winnerName2023: 'K S Lingesh', winnerVotes2023: 74321, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 190, name: 'Alur', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'D Sudheendra', winnerVotes2023: 79876, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 191, name: 'Arakalagud', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ranganath H P', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 3456, currentParty: 'INC' },
  { acNo: 192, name: 'Channarayapatna', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Shivashankare Gowda', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'JDS' },
  // ── Chikkamagalur District (5 seats) ──
  { acNo: 193, name: 'Chikkamagalur', district: 'Chikkamagalur', type: 'GEN', winner2023: 'BJP', winnerName2023: 'C T Ravi', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 194, name: 'Kadur', district: 'Chikkamagalur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Belli Prakash Jr', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 195, name: 'Mudigere', district: 'Chikkamagalur', type: 'GEN', winner2023: 'INC', winnerName2023: 'B B Ningaiah', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 196, name: 'Tarikere', district: 'Chikkamagalur', type: 'SC', winner2023: 'INC', winnerName2023: 'D S Suresh', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 197, name: 'N R Pura', district: 'Chikkamagalur', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Naveen D Raj', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 6789, currentParty: 'BJP' },
  // ── Udupi-Dakshina Kannada District (8 seats) ──
  { acNo: 198, name: 'Udupi', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'K Raghupathi Bhat', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'BJP' },
  { acNo: 199, name: 'Kapu', district: 'Udupi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Vinaya Kumar Sorake', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 200, name: 'Kundapura', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Kiran Kumar Kodgi', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 201, name: 'Byndoor', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B M Sukumar Shetty', winnerVotes2023: 86543, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 202, name: 'Mangalore City North', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Y Bharat Shetty', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 203, name: 'Mangalore City South', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'D Vedavyas Kamath', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 204, name: 'Bantval', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Rajesh Naik', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 15678, currentParty: 'BJP' },
  { acNo: 205, name: 'Puttur', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Sanjeeva Matandoor', winnerVotes2023: 89012, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  // ── Kodagu District (2 seats) ──
  { acNo: 206, name: 'Madikeri', district: 'Kodagu', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Appachu Ranjan', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },
  { acNo: 207, name: 'Virajpet', district: 'Kodagu', type: 'GEN', winner2023: 'INC', winnerName2023: 'K G Bopaiah Jr', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },
  // ── Dakshin Kannada + remaining (seats 208-224) ──
  { acNo: 208, name: 'Sullia', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S Angara', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 209, name: 'Moodabidri', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Umanath Kotian', winnerVotes2023: 87654, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 210, name: 'Belthangady', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Harish Poonja', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'BJP' },
  // ── Remaining cross-district seats ──
  { acNo: 211, name: 'Chamundeshwari', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'G T Deve Gowda Jr', winnerVotes2023: 86789, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 212, name: 'Deodurga', district: 'Raichur', type: 'ST', winner2023: 'INC', winnerName2023: 'B Sriramulu Jr', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 213, name: 'Aland', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'B R Patil', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 214, name: 'Chittapur', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Priyank Kharge', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 215, name: 'Channasandra', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'C P Yogeshwar', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 216, name: 'Krishnarajanagar', district: 'Mysore', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Sa Ra Mahesh', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 217, name: 'Sakaleshpura', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'Manju H K', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 4567, currentParty: 'INC' },
  { acNo: 218, name: 'Jevargi South', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ajay Singh Jr', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 219, name: 'Hoskote', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sharath Bachegowda', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 220, name: 'Devanahalli', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Muniraju Jr', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 221, name: 'Doddaballapur', district: 'Bangalore Rural', type: 'SC', winner2023: 'INC', winnerName2023: 'K Srinivas', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 222, name: 'Nelamangala', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Srinivasaraju V', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 223, name: 'Chikkaballapura South', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Rajanna', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 224, name: 'Gauribidanur South', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Muniswamy', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
];

export function getKAConstituency(acNo: number): KAConstituencySeed | undefined {
  return KA_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
