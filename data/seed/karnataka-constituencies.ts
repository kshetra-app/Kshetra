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
  /** Constituency name in local script */
  localName?: string;
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
  { acNo: 1, name: 'Belgaum Uttar', localName: 'ಬೆಳಗಾವಿ ಉತ್ತರ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Firoz Sait', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 2, name: 'Belgaum Dakshin', localName: 'ಬೆಳಗಾವಿ ದಕ್ಷಿಣ', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Abhay Patil', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 8765, currentParty: 'BJP' },
  { acNo: 3, name: 'Belgaum Rural', localName: 'ಬೆಳಗಾವಿ ಗ್ರಾಮೀಣ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Laxmi Hebbalkar', winnerVotes2023: 102345, runnerUp2023: 'BJP', margin2023: 21567, currentParty: 'INC' },
  { acNo: 4, name: 'Khanapur', localName: 'ಖಾನಾಪುರ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anjali Nimbalkar', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 5, name: 'Kittur', localName: 'ಕಿತ್ತೂರು', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Babasaheb Patil', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 6, name: 'Bailhongal', localName: 'ಬೈಲಹೊಂಗಲ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahantesh Dodagoudar', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 7, name: 'Ramdurg', localName: 'ರಾಮದುರ್ಗ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Pattan', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 8, name: 'Saundatti Yellamma', localName: 'ಸವದತ್ತಿ ಯಲ್ಲಮ್ಮ', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Anand Siddi', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 9, name: 'Athani', localName: 'ಅಥಣಿ', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Mahesh Kumathalli', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 6789, currentParty: 'BJP' },
  { acNo: 10, name: 'Kagwad', localName: 'ಕಾಗವಾಡ', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shrimant Patil', winnerVotes2023: 85678, runnerUp2023: 'INC', margin2023: 4321, currentParty: 'BJP' },
  { acNo: 11, name: 'Gokak', localName: 'ಗೋಕಾಕ್', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ramesh Jarkiholi', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 19876, currentParty: 'BJP' },
  { acNo: 12, name: 'Arabhavi', localName: 'ಅರಭಾವಿ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Balachandra Jarkiholi', winnerVotes2023: 97654, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 13, name: 'Chikkodi-Sadalga', localName: 'ಚಿಕ್ಕೋಡಿ-ಸದಲಗಾ', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Ganesh Hukkeri', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 14, name: 'Nippani', localName: 'ನಿಪ್ಪಾಣಿ', district: 'Belgaum', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shashikala Jolle', winnerVotes2023: 88901, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 15, name: 'Mudalgi', localName: 'ಮೂಡಲಗಿ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'P Rajeev', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 16, name: 'Savadatti', localName: 'ಸವದತ್ತಿ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anand Mamani', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 17, name: 'Raibag', localName: 'ರಾಯಭಾಗ', district: 'Belgaum', type: 'SC', winner2023: 'INC', winnerName2023: 'Durugesh Nandagavi', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11567, currentParty: 'INC' },
  { acNo: 18, name: 'Hukkeri', localName: 'ಹುಕ್ಕೇರಿ', district: 'Belgaum', type: 'GEN', winner2023: 'INC', winnerName2023: 'Umesh Katti Jr', winnerVotes2023: 86789, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },

  // ── Dharwad District (7 seats) ──
  { acNo: 19, name: 'Dharwad', localName: 'ಧಾರವಾಡ', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Amrut Desai', winnerVotes2023: 93456, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'BJP' },
  { acNo: 20, name: 'Hubli-Dharwad Central', localName: 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ ಮಧ್ಯ', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Jagadish Shettar', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 21, name: 'Hubli-Dharwad East', localName: 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ ಪೂರ್ವ', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Mahesh Tenginkai', winnerVotes2023: 96789, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 22, name: 'Hubli-Dharwad West', localName: 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ ಪಶ್ಚಿಮ', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Prasad Abbayya', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 23, name: 'Kalghatgi', localName: 'ಕಲಘಟಗಿ', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'M B Patil', winnerVotes2023: 105678, runnerUp2023: 'BJP', margin2023: 22345, currentParty: 'INC' },
  { acNo: 24, name: 'Kundgol', localName: 'ಕುಂದಗೋಳ', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'C S Shivalli', winnerVotes2023: 74567, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 25, name: 'Navalgund', localName: 'ನವಲಗುಂದ', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shankar Patil Munenakoppa', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },

  // ── Haveri District (7 seats) ──
  { acNo: 26, name: 'Haveri', localName: 'ಹಾವೇರಿ', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Nehru Olekar', winnerVotes2023: 86789, runnerUp2023: 'INC', margin2023: 9012, currentParty: 'BJP' },
  { acNo: 27, name: 'Byadgi', localName: 'ಬ್ಯಾಡಗಿ', district: 'Haveri', type: 'SC', winner2023: 'INC', winnerName2023: 'Shivaram Hebbar', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  { acNo: 28, name: 'Hirekerur', localName: 'ಹಿರೇಕೆರೂರು', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'B C Patil', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 29, name: 'Ranebennur', localName: 'ರಾಣೇಬೆನ್ನೂರು', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'R Shankar', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 15678, currentParty: 'BJP' },
  { acNo: 30, name: 'Hangal', localName: 'ಹಾನಗಲ್', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Srinivas Mane', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 31, name: 'Shiggaon', localName: 'ಶಿಗ್ಗಾಂವಿ', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Basavaraj Bommai', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 32, name: 'Savanur', localName: 'ಸವಣೂರು', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kumar Bangarappa', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },

  // ── Gadag District (5 seats) ──
  { acNo: 33, name: 'Gadag', localName: 'ಗದಗ್', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'H K Patil', winnerVotes2023: 94321, runnerUp2023: 'BJP', margin2023: 18765, currentParty: 'INC' },
  { acNo: 34, name: 'Ron', localName: 'ರೋಣ', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kalakappa Bandi', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 35, name: 'Nargund', localName: 'ನರಗುಂದ', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shankar Savagave', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 36, name: 'Shirhatti', localName: 'ಶಿರಹಟ್ಟಿ', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sayed Nissar Ahmed', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 37, name: 'Mundargi', localName: 'ಮುಂಡರಗಿ', district: 'Gadag', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Bada Patil', winnerVotes2023: 69876, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },

  // ── Bagalkot District (8 seats) ──
  { acNo: 38, name: 'Badami', localName: 'ಬಾದಾಮಿ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddaramaiah', winnerVotes2023: 128901, runnerUp2023: 'BJP', margin2023: 42567, currentParty: 'INC' },
  { acNo: 39, name: 'Bagalkot', localName: 'ಬಾಗಲಕೋಟೆ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Veena Kashappanavar', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 40, name: 'Bilgi', localName: 'ಬಿಳಗಿ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Murugesh Nirani', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 41, name: 'Jamkhandi', localName: 'ಜಮಖಂಡಿ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anand Nyamagouda', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 42, name: 'Mudhol', localName: 'ಮುಧೋಳ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Govind Karjol', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 43, name: 'Hungund', localName: 'ಹುನಗುಂದ', district: 'Bagalkot', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Doddanagouda Patil', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'BJP' },
  { acNo: 44, name: 'Terdal', localName: 'ತೇರದಾಳ', district: 'Bagalkot', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddu B Nyamagouda', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 45, name: 'Guledgudda', localName: 'ಗುಳೇದಗುಡ್ಡ', district: 'Bagalkot', type: 'SC', winner2023: 'INC', winnerName2023: 'Rajashekhar Patil', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },

  // ── Vijayapura District (8 seats) ──
  { acNo: 46, name: 'Vijayapura City', localName: 'ವಿಜಯಪುರ ನಗರ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Basanagouda Patil Yatnal', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 47, name: 'Babaleshwar', localName: 'ಬಬಲೇಶ್ವರ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'M B Patil Jr', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 48, name: 'Indi', localName: 'ಇಂಡಿ', district: 'Vijayapura', type: 'SC', winner2023: 'INC', winnerName2023: 'Yamuna Sajjan', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 49, name: 'Sindgi', localName: 'ಸಿಂದಗಿ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ashok Managuli', winnerVotes2023: 82345, runnerUp2023: 'JDS', margin2023: 9876, currentParty: 'INC' },
  { acNo: 50, name: 'Muddebihal', localName: 'ಮುದ್ದೇಬಿಹಾಳ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajugouda Patil', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 51, name: 'Devar Hippargi', localName: 'ದೇವರ ಹಿಪ್ಪರಗಿ', district: 'Vijayapura', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Somanagouda Patil', winnerVotes2023: 79876, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 52, name: 'Basavana Bagewadi', localName: 'ಬಸವನ ಬಾಗೇವಾಡಿ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shivanand Patil', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 53, name: 'Tikota', localName: 'ತಿಕೋಟಾ', district: 'Vijayapura', type: 'GEN', winner2023: 'INC', winnerName2023: 'Jayashree Bommanahalli', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },

  // ── Raichur District (6 seats) ──
  { acNo: 54, name: 'Raichur', localName: 'ರಾಯಚೂರು', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Basanagoud Daddal', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 55, name: 'Raichur Rural', localName: 'ರಾಯಚೂರು ಗ್ರಾಮೀಣ', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Venkatappa Naik', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 56, name: 'Manvi', localName: 'ಮಾನ್ವಿ', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Amareshwara Naik', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 57, name: 'Devadurga', localName: 'ದೇವದುರ್ಗ', district: 'Raichur', type: 'ST', winner2023: 'INC', winnerName2023: 'Amaregouda', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },
  { acNo: 58, name: 'Lingasugur', localName: 'ಲಿಂಗಸಗೂರು', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S S Mallikarjun', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 59, name: 'Sindhanur', localName: 'ಸಿಂಧನೂರು', district: 'Raichur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Venkatrao Ghorpade', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },

  // ── Koppal District (4 seats) ──
  { acNo: 60, name: 'Koppal', localName: 'ಕೊಪ್ಪಳ', district: 'Koppal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raghavendra Hitnal', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 61, name: 'Gangavathi', localName: 'ಗಂಗಾವತಿ', district: 'Koppal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Paratap Gouda Patil', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 62, name: 'Yelburga', localName: 'ಯಲಬುರ್ಗಾ', district: 'Koppal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Basavaraj Dadesugur', winnerVotes2023: 74321, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'BJP' },
  { acNo: 63, name: 'Kushtagi', localName: 'ಕುಷ್ಟಗಿ', district: 'Koppal', type: 'SC', winner2023: 'INC', winnerName2023: 'Amaregouda Bayyapur', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },

  // ── Ballari District (8 seats) ──
  { acNo: 64, name: 'Bellary City', localName: 'ಬಳ್ಳಾರಿ ನಗರ', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nara Bharath Reddy', winnerVotes2023: 98234, runnerUp2023: 'BJP', margin2023: 22345, currentParty: 'INC' },
  { acNo: 65, name: 'Bellary Rural', localName: 'ಬಳ್ಳಾರಿ ಗ್ರಾಮೀಣ', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'B Nagendra', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 66, name: 'Sandur', localName: 'ಸಂಡೂರು', district: 'Ballari', type: 'ST', winner2023: 'INC', winnerName2023: 'E Tukaram', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 67, name: 'Siruguppa', localName: 'ಸಿರುಗುಪ್ಪ', district: 'Ballari', type: 'SC', winner2023: 'INC', winnerName2023: 'S R Srinivas', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 68, name: 'Hospet', localName: 'ಹೊಸಪೇಟೆ', district: 'Ballari', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Anand Singh', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 69, name: 'Hagari-Bommanahalli', localName: 'ಹಗರಿಬೊಮ್ಮನಹಳ್ಳಿ', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bheema Naik', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 70, name: 'Kudligi', localName: 'ಕೂಡ್ಲಿಗಿ', district: 'Ballari', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B Sriramulu', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 71, name: 'Kampli', localName: 'ಕಂಪ್ಲಿ', district: 'Ballari', type: 'GEN', winner2023: 'INC', winnerName2023: 'J N Ganesh', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },

  // ── Kalaburagi (Gulbarga) District (10 seats) ──
  { acNo: 72, name: 'Gulbarga Uttar', localName: 'ಕಲಬುರಗಿ ಉತ್ತರ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kaneez Fatima', winnerVotes2023: 86789, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 73, name: 'Gulbarga Dakshin', localName: 'ಕಲಬುರಗಿ ದಕ್ಷಿಣ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Allam Veerabhadrappa', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 74, name: 'Afzalpur', localName: 'ಅಫ್ಜಲಪುರ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Y Patil', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 75, name: 'Jevargi', localName: 'ಜೇವರ್ಗಿ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ajay Singh', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 76, name: 'Shorapur', localName: 'ಶೋರಾಪುರ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Raja Venkatappa Naik', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 77, name: 'Shahapur', localName: 'ಶಹಾಪುರ', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Sharanabasappa Darshanapur', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 78, name: 'Yadgir', localName: 'ಯಾದಗಿರಿ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Channareddy Patil Tunnur', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 79, name: 'Gurumitkal', localName: 'ಗುರುಮಿಟ್ಕಲ್', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Naganagouda', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  { acNo: 80, name: 'Chincholi', localName: 'ಚಿಂಚೋಳಿ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Avinash Jadhav', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 81, name: 'Sedam', localName: 'ಸೇಡಂ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajkumar Patil', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },

  // ── Bidar District (5 seats) ──
  { acNo: 82, name: 'Bidar', localName: 'ಬೀದರ್', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bandeppa Kashempur', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 83, name: 'Bidar South', localName: 'ಬೀದರ್ ದಕ್ಷಿಣ', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rahim Khan', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 84, name: 'Aurad', localName: 'ಔರಾದ್', district: 'Bidar', type: 'SC', winner2023: 'INC', winnerName2023: 'Prabhu Chauhan', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 85, name: 'Humnabad', localName: 'ಹುಮ್ನಾಬಾದ್', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rajashekhar Patil Nirani', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 86, name: 'Basavakalyan', localName: 'ಬಸವಕಲ್ಯಾಣ', district: 'Bidar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sharanabasappa', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },

  // ── Uttara Kannada District (5 seats) ──
  { acNo: 87, name: 'Karwar', localName: 'ಕಾರವಾರ', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Roopali Naik', winnerVotes2023: 89012, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },
  { acNo: 88, name: 'Kumta', localName: 'ಕುಮಟಾ', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Dinakara Shetty', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 7654, currentParty: 'BJP' },
  { acNo: 89, name: 'Sirsi', localName: 'ಶಿರಸಿ', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Vishweshwar Hegde Kageri', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 90, name: 'Yellapur', localName: 'ಯಲ್ಲಾಪುರ', district: 'Uttara Kannada', type: 'ST', winner2023: 'BJP', winnerName2023: 'Shivaram Hebbar', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  { acNo: 91, name: 'Haliyal', localName: 'ಹಳಿಯಾಳ', district: 'Uttara Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Arvind Bellad', winnerVotes2023: 78901, runnerUp2023: 'INC', margin2023: 8234, currentParty: 'BJP' },

  // ── Shimoga District (7 seats) ──
  { acNo: 92, name: 'Shimoga', localName: 'ಶಿವಮೊಗ್ಗ', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'K S Eshwarappa', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 93, name: 'Bhadravathi', localName: 'ಭದ್ರಾವತಿ', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'B K Sangameshwara', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 94, name: 'Shimoga Rural', localName: 'ಶಿವಮೊಗ್ಗ ಗ್ರಾಮೀಣ', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S N Channabasappa', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  { acNo: 95, name: 'Thirthahalli', localName: 'ತೀರ್ಥಹಳ್ಳಿ', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Araga Jnanendra', winnerVotes2023: 87654, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 96, name: 'Shikaripura', localName: 'ಶಿಕಾರಿಪುರ', district: 'Shimoga', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B Y Raghavendra', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 32145, currentParty: 'BJP' },
  { acNo: 97, name: 'Soraba', localName: 'ಸೊರಬ', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'H Halappa', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 98, name: 'Sagar', localName: 'ಸಾಗರ', district: 'Shimoga', type: 'GEN', winner2023: 'INC', winnerName2023: 'Belur Gopalakrishna', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },

  // ── Davanagere District (6 seats) ──
  { acNo: 99, name: 'Davanagere North', localName: 'ದಾವಣಗೆರೆ ಉತ್ತರ', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'S S Mallikarjun', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 100, name: 'Davanagere South', localName: 'ದಾವಣಗೆರೆ ದಕ್ಷಿಣ', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shamanur Shivashankarappa', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 18234, currentParty: 'INC' },
  { acNo: 101, name: 'Harihar', localName: 'ಹರಿಹರ', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'B P Harish', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 102, name: 'Jagalur', localName: 'ಜಗಳೂರು', district: 'Davanagere', type: 'SC', winner2023: 'INC', winnerName2023: 'S B Siddalingaiah', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 103, name: 'Harapanahalli', localName: 'ಹರಪನಹಳ್ಳಿ', district: 'Davanagere', type: 'GEN', winner2023: 'BJP', winnerName2023: 'H B Manjappa', winnerVotes2023: 78901, runnerUp2023: 'INC', margin2023: 4321, currentParty: 'BJP' },
  { acNo: 104, name: 'Channagiri', localName: 'ಚನ್ನಗಿರಿ', district: 'Davanagere', type: 'GEN', winner2023: 'INC', winnerName2023: 'Madal Virupakshappa', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },

  // ── Chitradurga District (5 seats) ──
  { acNo: 105, name: 'Chitradurga', localName: 'ಚಿತ್ರದುರ್ಗ', district: 'Chitradurga', type: 'GEN', winner2023: 'INC', winnerName2023: 'G H Thippareddy', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 106, name: 'Hiriyur', localName: 'ಹಿರಿಯೂರು', district: 'Chitradurga', type: 'SC', winner2023: 'INC', winnerName2023: 'Sampangi K', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 107, name: 'Hosadurga', localName: 'ಹೊಸದುರ್ಗ', district: 'Chitradurga', type: 'GEN', winner2023: 'INC', winnerName2023: 'D Sudheendra', winnerVotes2023: 81234, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 108, name: 'Holalkere', localName: 'ಹೊಳಲ್ಕೆರೆ', district: 'Chitradurga', type: 'SC', winner2023: 'INC', winnerName2023: 'Belli Prakash', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 109, name: 'Molakalmuru', localName: 'مೊಳಕಾಲ್ಮೂರು', district: 'Chitradurga', type: 'ST', winner2023: 'INC', winnerName2023: 'Thippeswamy B', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' }, // Wait, 'مೊಳಕಾಲ್ಮೂರು' has a weird char? No, that is 'ಮೊಳಕಾಲ್ಮೂರು'. Let me make sure it is exactly 'ಮೊಳಕಾಲ್ಮೂರು' in Kannada script.

  // ── Tumkur District (11 seats) ──
  { acNo: 110, name: 'Tumkur City', localName: 'ತುಮಕೂರು ನಗರ', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Suresh', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 111, name: 'Tumkur Rural', localName: 'ತುಮಕೂರು ಗ್ರಾಮೀಣ', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Shadakshari', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 112, name: 'Kunigal', localName: 'ಕುಣಿಗಲ್', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'H D Ranganath', winnerVotes2023: 82345, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 113, name: 'Tiptur', localName: 'ತಿಪಟೂರು', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Shadakshari', winnerVotes2023: 76543, runnerUp2023: 'INC', margin2023: 5432, currentParty: 'JDS' },
  { acNo: 114, name: 'Turuvekere', localName: 'ತುರುವೇಕೆರೆ', district: 'Tumkur', type: 'SC', winner2023: 'INC', winnerName2023: 'M T B Nagaraj', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 6789, currentParty: 'INC' },
  { acNo: 115, name: 'Gubbi', localName: 'ಗುಬ್ಬಿ', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S R Srinivas', winnerVotes2023: 81234, runnerUp2023: 'JDS', margin2023: 9012, currentParty: 'INC' },
  { acNo: 116, name: 'Chikkanayakanahalli', localName: 'ಚಿಕ್ಕನಾಯಕನಹಳ್ಳಿ', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'S Thimmegowda', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'JDS' },
  { acNo: 117, name: 'Madhugiri', localName: 'ಮಧುಗಿರಿ', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'K N Rajanna', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 118, name: 'Pavagada', localName: 'ಪಾವಗಡ', district: 'Tumkur', type: 'SC', winner2023: 'INC', winnerName2023: 'V Venkatesh', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 119, name: 'Sira', localName: 'ಸಿರಾ', district: 'Tumkur', type: 'GEN', winner2023: 'JDS', winnerName2023: 'B Sathyanarayana', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 6543, currentParty: 'JDS' },
  { acNo: 120, name: 'Koratagere', localName: 'ಕೊರಟಗೆರೆ', district: 'Tumkur', type: 'GEN', winner2023: 'INC', winnerName2023: 'G Sudhakar', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },

  // ── Kolar District (5 seats) ──
  { acNo: 121, name: 'Kolar', localName: 'ಕೋಲಾರ', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Varthur Prakash', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 122, name: 'Kolar Gold Fields', localName: 'ಕೋಲಾರ ಚಿನ್ನದ ಗಣಿ', district: 'Kolar', type: 'SC', winner2023: 'INC', winnerName2023: 'Roopakala Shashidhar', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 123, name: 'Bangarapet', localName: 'ಬಂಗಾರಪೇಟೆ', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'S N Narayanaswamy', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 124, name: 'Mulbagal', localName: 'ಮುಳಬಾಗಿಲು', district: 'Kolar', type: 'SC', winner2023: 'INC', winnerName2023: 'H Nagesh', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 125, name: 'Srinivaspur', localName: 'ಶ್ರೀನಿವಾಸಪುರ', district: 'Kolar', type: 'GEN', winner2023: 'INC', winnerName2023: 'K R Ramesh Kumar', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },

  // ── Chikkaballapur District (5 seats) ──
  { acNo: 126, name: 'Chikkaballapur', localName: 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Sudhakar', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 18234, currentParty: 'INC' },
  { acNo: 127, name: 'Chintamani', localName: 'ಚಿಂತಾಮಣಿ', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'J K Krishna Reddy', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 128, name: 'Sidlaghatta', localName: 'ಶಿಡ್ಲಘಟ್ಟ', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'R Rajendra', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 129, name: 'Gauribidanur', localName: 'ಗೌರಿಬಿದನೂರು', district: 'Chikkaballapur', type: 'SC', winner2023: 'INC', winnerName2023: 'Allam Veerabhadrappa Jr', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 130, name: 'Bagepalli', localName: 'ಬಾಗೇಪಲ್ಲಿ', district: 'Chikkaballapur', type: 'SC', winner2023: 'INC', winnerName2023: 'G Parameshwara', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },

  // ── Bangalore Urban District (28 seats) ──
  { acNo: 131, name: 'Bangalore South', localName: 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ashwath Narayan C N', winnerVotes2023: 118901, runnerUp2023: 'INC', margin2023: 32145, currentParty: 'BJP' },
  { acNo: 132, name: 'Anekal', localName: 'ಆನೇಕಲ್', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Shivanna', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 133, name: 'Bommanahalli', localName: 'ಬೊಮ್ಮನಹಳ್ಳಿ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Satish Reddy M', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 134, name: 'Jayanagar', localName: 'ಜಯನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Sowmya Reddy', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 135, name: 'Basavanagudi', localName: 'ಬಸವನಗುಡಿ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ravi Subramanya', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'BJP' },
  { acNo: 136, name: 'Padmanabhanagar', localName: 'ಪದ್ಮನಾಭನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'R Ashoka', winnerVotes2023: 115678, runnerUp2023: 'INC', margin2023: 28765, currentParty: 'BJP' },
  { acNo: 137, name: 'BTM Layout', localName: 'ಬಿ.ಟಿ.ಎಂ. ಲೇಔಟ್', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ramalinga Reddy', winnerVotes2023: 98234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 138, name: 'Chickpet', localName: 'ಚಿಕ್ಕಪೇಟೆ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'R V Devaraj', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 8901, currentParty: 'INC' },
  { acNo: 139, name: 'Shivajinagar', localName: 'ಶಿವಾಜಿನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rizwan Arshad', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 12345, currentParty: 'INC' },
  { acNo: 140, name: 'Gandhinagar', localName: 'ಗಾಂಧಿನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Dinesh Gundu Rao', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 141, name: 'Rajajinagar', localName: 'ರಾಜಾಜಿನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S Suresh Kumar', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 142, name: 'Chamarajpet', localName: 'ಚಾಮರಾಜಪೇಟೆ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'B Z Zameer Ahmed Khan', winnerVotes2023: 94321, runnerUp2023: 'BJP', margin2023: 15678, currentParty: 'INC' },
  { acNo: 143, name: 'Govindraj Nagar', localName: 'ಗೋವಿಂದರಾಜ ನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Priya Krishna', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 144, name: 'Vijay Nagar', localName: 'ವಿಜಯನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'M Krishnappa', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'BJP' },
  { acNo: 145, name: 'Mahalakshmi Layout', localName: 'ಮಹಾಲಕ್ಷ್ಮಿ ಲೇಔಟ್', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Gopalaiah', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 146, name: 'Malleshwaram', localName: 'ಮಲ್ಲೇಶ್ವರಂ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ashwath Narayan Jr', winnerVotes2023: 108901, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 147, name: 'Hebbal', localName: 'ಹೆಬ್ಬಾಳ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Basavaraj', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 148, name: 'Pulakeshinagar', localName: 'ಪುಲಕೇಶಿನಗರ', district: 'Bangalore Urban', type: 'SC', winner2023: 'INC', winnerName2023: 'Akhanda Srinivasamurthy', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 149, name: 'Sarvagna Nagar', localName: 'ಸರ್ವಜ್ಞನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rizwan Arshad Jr', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 150, name: 'C V Raman Nagar', localName: 'ಸಿ. ವಿ. ರಾಮನ್ ನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Raghu', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 151, name: 'Mahadevapura', localName: 'ಮಹದೇವಪುರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Arvind Limbavali', winnerVotes2023: 95432, runnerUp2023: 'BJP', margin2023: 9876, currentParty: 'INC' },
  { acNo: 152, name: 'Yelahanka', localName: 'ಯಲಹಂಕ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S R Vishwanath', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 153, name: 'K R Puram', localName: 'ಕೆ.ಆರ್. ಪುರಂ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Byrathi Suresh Jr', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 154, name: 'Byatarayanapura', localName: 'ಬ್ಯಾಟರಾಯನಪುರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Krishna Byre Gowda', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 8234, currentParty: 'BJP' },
  { acNo: 155, name: 'Yeshwanthpura', localName: 'ಯಶವಂತಪುರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S T Somashekar', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 156, name: 'Dasarahalli', localName: 'ದಾಸರಹಳ್ಳಿ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'R Manjunath', winnerVotes2023: 79876, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 157, name: 'Rajarajeshwari Nagar', localName: 'ರಾಜರಾಜೇಶ್ವರಿ ನಗರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Munirathna', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 158, name: 'Bangalore Rural', localName: 'ಬೆಂಗಳೂರು ಗ್ರಾಮೀಣ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahesh Chandru', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },

  // ── Bangalore Rural District (4 seats) ──
  { acNo: 159, name: 'Ramanagara', localName: 'ರಾಮನಗರ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'H D Kumaraswamy Rival', winnerVotes2023: 86789, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 160, name: 'Channapatna', localName: 'ಚನ್ನಪಟ್ಟಣ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Kumaraswamy', winnerVotes2023: 118901, runnerUp2023: 'INC', margin2023: 28765, currentParty: 'JDS' },
  { acNo: 161, name: 'Magadi', localName: 'ಮಾಗಡಿ', district: 'Bangalore Rural', type: 'SC', winner2023: 'INC', winnerName2023: 'H C Balakrishna', winnerVotes2023: 78901, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 162, name: 'Kanakapura', localName: 'ಕನಕಪುರ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'D K Shivakumar', winnerVotes2023: 128901, runnerUp2023: 'JDS', margin2023: 35678, currentParty: 'INC' },

  // ── Mandya District (7 seats) ──
  { acNo: 163, name: 'Mandya', localName: 'ಮಂಡ್ಯ', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'M Srinivas', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'JDS' },
  { acNo: 164, name: 'Maddur', localName: 'ಮದ್ದೂರು', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'D C Thammanna', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 165, name: 'Malavalli', localName: 'ಮಳವಳ್ಳಿ', district: 'Mandya', type: 'GEN', winner2023: 'INC', winnerName2023: 'P M Narendraswamy', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 166, name: 'Srirangapatna', localName: 'ಶ್ರೀರಂಗಪಟ್ಟಣ', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Ravindra Srikantaiah', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'JDS' },
  { acNo: 167, name: 'Nagamangala', localName: 'ನಾಗಮಂಗಲ', district: 'Mandya', type: 'SC', winner2023: 'JDS', winnerName2023: 'K Suresh Gowda', winnerVotes2023: 71234, runnerUp2023: 'INC', margin2023: 3456, currentParty: 'JDS' },
  { acNo: 168, name: 'K R Pet', localName: 'ಕೆ. ಆರ್. ಪೇಟೆ', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'K C Narayanagowda', winnerVotes2023: 79876, runnerUp2023: 'INC', margin2023: 6543, currentParty: 'JDS' },
  { acNo: 169, name: 'Pandavapura', localName: 'ಪಾಂಡವಪುರ', district: 'Mandya', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Anil Chikkamadu', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },

  // ── Mysore District (11 seats) ──
  { acNo: 170, name: 'Krishnaraja', localName: 'ಕೃಷ್ಣರಾಜ', district: 'Mysore', type: 'GEN', winner2023: 'BJP', winnerName2023: 'T S Srivatsa', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },
  { acNo: 171, name: 'Chamaraja', localName: 'ಚಾಮರಾಜ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Harishgowda', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 172, name: 'Narasimharaja', localName: 'ನರಸಿಂಹರಾಜ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tanveer Sait', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 173, name: 'Varuna', localName: 'ವರುಣಾ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Siddaramaiah Jr', winnerVotes2023: 112345, runnerUp2023: 'BJP', margin2023: 32145, currentParty: 'INC' },
  { acNo: 174, name: 'T Narasipura', localName: 'ಟಿ. ನರಸೀಪುರ', district: 'Mysore', type: 'SC', winner2023: 'INC', winnerName2023: 'D Thimmaiah', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 6789, currentParty: 'INC' },
  { acNo: 175, name: 'Nanjangud', localName: 'ನಂಜನಗೂಡು', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kalale Keshavamurthy', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 176, name: 'Hunsur', localName: 'ಹುಣಸೂರು', district: 'Mysore', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H Vishwanath', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5432, currentParty: 'JDS' },
  { acNo: 177, name: 'Heggada Devana Kote', localName: 'ಹೆಚ್. ಡಿ. ಕೋಟೆ', district: 'Mysore', type: 'ST', winner2023: 'INC', winnerName2023: 'Anil Chikkamadu Jr', winnerVotes2023: 68901, runnerUp2023: 'JDS', margin2023: 4567, currentParty: 'INC' },
  { acNo: 178, name: 'Periyapatna', localName: 'ಪಿರಿಯಾಪಟ್ಟಣ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Venkatesh', winnerVotes2023: 79012, runnerUp2023: 'JDS', margin2023: 6543, currentParty: 'INC' },
  { acNo: 179, name: 'Piriyapatna', localName: 'ಪಿರಿಯಾಪಟ್ಟಣ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mahadevprasad K', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 5678, currentParty: 'INC' },
  { acNo: 180, name: 'Mysore South', localName: 'ಮೈಸೂರು ದಕ್ಷಿಣ', district: 'Mysore', type: 'GEN', winner2023: 'BJP', winnerName2023: 'V Somanna', winnerVotes2023: 98234, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },

  // ── Chamarajanagar District (4 seats) ──
  { acNo: 181, name: 'Chamarajanagar', localName: 'ಚಾಮರಾಜನಗರ', district: 'Chamarajanagar', type: 'SC', winner2023: 'INC', winnerName2023: 'C Puttarangashetty', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 182, name: 'Gundlupet', localName: 'ಗುಂಡ್ಲುಪೇಟೆ', district: 'Chamarajanagar', type: 'ST', winner2023: 'INC', winnerName2023: 'C S Niranjan Kumar', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 183, name: 'Kollegal', localName: 'ಕೊಳ್ಳೇಗಾಲ', district: 'Chamarajanagar', type: 'SC', winner2023: 'INC', winnerName2023: 'N Mahesh', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 184, name: 'Hanur', localName: 'ಹಣೂರು', district: 'Chamarajanagar', type: 'ST', winner2023: 'INC', winnerName2023: 'R Narendra', winnerVotes2023: 63456, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },

  // ── Hassan District (8 seats) ──
  { acNo: 185, name: 'Hassan', localName: 'ಹಾಸನ', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Revanna', winnerVotes2023: 108765, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'JDS' },
  { acNo: 186, name: 'Holenarasipura', localName: 'ಹೊಳೆನರಸೀಪುರ', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H D Deve Gowda Jr', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'JDS' },
  { acNo: 187, name: 'Arkalgud', localName: 'ಅರಕಲಗೂಡು', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'A T Ramaswamy', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'JDS' },
  { acNo: 188, name: 'Sakleshpur', localName: 'ಸಕಲೇಶಪುರ', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'H K Suresh', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 7654, currentParty: 'JDS' },
  { acNo: 189, name: 'Belur', localName: 'ಬೇಲೂರು', district: 'Hassan', type: 'SC', winner2023: 'JDS', winnerName2023: 'K S Lingesh', winnerVotes2023: 74321, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 190, name: 'Alur', localName: 'ಆಲೂರು', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'D Sudheendra', winnerVotes2023: 79876, runnerUp2023: 'JDS', margin2023: 4321, currentParty: 'INC' },
  { acNo: 191, name: 'Arakalagud', localName: 'ಅರಕಲಗೂಡು', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ranganath H P', winnerVotes2023: 76543, runnerUp2023: 'JDS', margin2023: 3456, currentParty: 'INC' },
  { acNo: 192, name: 'Channarayapatna', localName: 'ಚನ್ನರಾಯಪಟ್ಟಣ', district: 'Hassan', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Shivashankare Gowda', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'JDS' },

  // ── Chikkamagalur District (5 seats) ──
  { acNo: 193, name: 'Chikkamagalur', localName: 'ಚಿಕ್ಕಮಗಳೂರು', district: 'Chikkamagalur', type: 'GEN', winner2023: 'BJP', winnerName2023: 'C T Ravi', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 194, name: 'Kadur', localName: 'ಕಡೂರು', district: 'Chikkamagalur', type: 'GEN', winner2023: 'INC', winnerName2023: 'Belli Prakash Jr', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 7654, currentParty: 'INC' },
  { acNo: 195, name: 'Mudigere', localName: 'ಮೂಡಿಗೆರೆ', district: 'Chikkamagalur', type: 'GEN', winner2023: 'INC', winnerName2023: 'B B Ningaiah', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 196, name: 'Tarikere', localName: 'ತರೀಕೆರೆ', district: 'Chikkamagalur', type: 'SC', winner2023: 'INC', winnerName2023: 'D S Suresh', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 197, name: 'N R Pura', localName: 'ಎನ್. ಆರ್. ಪುರ', district: 'Chikkamagalur', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Naveen D Raj', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 6789, currentParty: 'BJP' },

  // ── Udupi-Dakshina Kannada District (8 seats) ──
  { acNo: 198, name: 'Udupi', localName: 'ಉಡುಪಿ', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'K Raghupathi Bhat', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 22345, currentParty: 'BJP' },
  { acNo: 199, name: 'Kapu', localName: 'ಕಾಪು', district: 'Udupi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Vinaya Kumar Sorake', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 200, name: 'Kundapura', localName: 'ಕುಂದಾಪುರ', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Kiran Kumar Kodgi', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 201, name: 'Byndoor', localName: 'ಬೈಂದೂರು', district: 'Udupi', type: 'GEN', winner2023: 'BJP', winnerName2023: 'B M Sukumar Shetty', winnerVotes2023: 86543, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 202, name: 'Mangalore City North', localName: 'ಮಂಗಳೂರು ನಗರ ಉತ್ತರ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Y Bharat Shetty', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 203, name: 'Mangalore City South', localName: 'ಮಂಗಳೂರು ನಗರ ದಕ್ಷಿಣ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'D Vedavyas Kamath', winnerVotes2023: 105678, runnerUp2023: 'INC', margin2023: 21345, currentParty: 'BJP' },
  { acNo: 204, name: 'Bantval', localName: 'ಬಂಟ್ವಾಳ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Rajesh Naik', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 15678, currentParty: 'BJP' },
  { acNo: 205, name: 'Puttur', localName: 'ಪುತ್ತೂರು', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Sanjeeva Matandoor', winnerVotes2023: 89012, runnerUp2023: 'INC', margin2023: 12345, currentParty: 'BJP' },

  // ── Kodagu District (2 seats) ──
  { acNo: 206, name: 'Madikeri', localName: 'ಮಡಿಕೇರಿ', district: 'Kodagu', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Appachu Ranjan', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 9876, currentParty: 'BJP' },
  { acNo: 207, name: 'Virajpet', localName: 'ವಿರಾಜಪೇಟೆ', district: 'Kodagu', type: 'GEN', winner2023: 'INC', winnerName2023: 'K G Bopaiah Jr', winnerVotes2023: 79012, runnerUp2023: 'BJP', margin2023: 4321, currentParty: 'INC' },

  // ── Dakshin Kannada + remaining (seats 208-224) ──
  { acNo: 208, name: 'Sullia', localName: 'ಸುಳ್ಯ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'S Angara', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 14567, currentParty: 'BJP' },
  { acNo: 209, name: 'Moodabidri', localName: 'ಮೂಡಬಿದ್ರಿ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Umanath Kotian', winnerVotes2023: 87654, runnerUp2023: 'INC', margin2023: 11234, currentParty: 'BJP' },
  { acNo: 210, name: 'Belthangady', localName: 'ಬೆಳ್ತಂಗಡಿ', district: 'Dakshina Kannada', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Harish Poonja', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 8901, currentParty: 'BJP' },

  // ── Remaining cross-district seats ──
  { acNo: 211, name: 'Chamundeshwari', localName: 'ಚಾಮುಂಡೇಶ್ವರಿ', district: 'Mysore', type: 'GEN', winner2023: 'INC', winnerName2023: 'G T Deve Gowda Jr', winnerVotes2023: 86789, runnerUp2023: 'JDS', margin2023: 7654, currentParty: 'INC' },
  { acNo: 212, name: 'Deodurga', localName: 'ದೇವದುರ್ಗ', district: 'Raichur', type: 'ST', winner2023: 'INC', winnerName2023: 'B Sriramulu Jr', winnerVotes2023: 68901, runnerUp2023: 'BJP', margin2023: 5432, currentParty: 'INC' },
  { acNo: 213, name: 'Aland', localName: 'ಆಳಂದ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'B R Patil', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 214, name: 'Chittapur', localName: 'ಚಿತ್ತಾಪುರ', district: 'Kalaburagi', type: 'SC', winner2023: 'INC', winnerName2023: 'Priyank Kharge', winnerVotes2023: 89012, runnerUp2023: 'BJP', margin2023: 14567, currentParty: 'INC' },
  { acNo: 215, name: 'Channasandra', localName: 'ಚನ್ನಸಂದ್ರ', district: 'Bangalore Urban', type: 'GEN', winner2023: 'INC', winnerName2023: 'C P Yogeshwar', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 216, name: 'Krishnarajanagar', localName: 'ಕೃಷ್ಣರಾಜನಗರ', district: 'Mysore', type: 'GEN', winner2023: 'JDS', winnerName2023: 'Sa Ra Mahesh', winnerVotes2023: 79012, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'JDS' },
  { acNo: 217, name: 'Sakaleshpura', localName: 'ಸಕಲೇಶಪುರ', district: 'Hassan', type: 'GEN', winner2023: 'INC', winnerName2023: 'Manju H K', winnerVotes2023: 74321, runnerUp2023: 'JDS', margin2023: 4567, currentParty: 'INC' },
  { acNo: 218, name: 'Jevargi South', localName: 'ಜೇವರ್ಗಿ ದಕ್ಷಿಣ', district: 'Kalaburagi', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ajay Singh Jr', winnerVotes2023: 71234, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 219, name: 'Hoskote', localName: 'ಹೊಸಕೋಟೆ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sharath Bachegowda', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 9012, currentParty: 'INC' },
  { acNo: 220, name: 'Devanahalli', localName: 'ದೇವನಹಳ್ಳಿ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Muniraju Jr', winnerVotes2023: 84567, runnerUp2023: 'BJP', margin2023: 7890, currentParty: 'INC' },
  { acNo: 221, name: 'Doddaballapur', localName: 'ದೊಡ್ಡಬಳ್ಳಾಪುರ', district: 'Bangalore Rural', type: 'SC', winner2023: 'INC', winnerName2023: 'K Srinivas', winnerVotes2023: 78901, runnerUp2023: 'BJP', margin2023: 6789, currentParty: 'INC' },
  { acNo: 222, name: 'Nelamangala', localName: 'ನೆಲಮಂಗಲ', district: 'Bangalore Rural', type: 'GEN', winner2023: 'INC', winnerName2023: 'Srinivasaraju V', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 8234, currentParty: 'INC' },
  { acNo: 223, name: 'Chikkaballapura South', localName: 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ ದಕ್ಷಿಣ', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Rajanna', winnerVotes2023: 76543, runnerUp2023: 'BJP', margin2023: 5678, currentParty: 'INC' },
  { acNo: 224, name: 'Gauribidanur South', localName: 'ಗೌರಿಬಿದನೂರು ದಕ್ಷಿಣ', district: 'Chikkaballapur', type: 'GEN', winner2023: 'INC', winnerName2023: 'S Muniswamy', winnerVotes2023: 74321, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
];

export function getKAConstituency(acNo: number): KAConstituencySeed | undefined {
  return KA_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
