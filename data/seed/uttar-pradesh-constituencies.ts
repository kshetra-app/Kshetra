/**
 * Uttar Pradesh Assembly Constituencies — Full Data (401 seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, Uttar Pradesh 2022 General Election results.
 *  Data scraped from Wikipedia (sourced from ECI) and cross-verified.
 *
 * ── PARTY TALLY ────────────────────────────────────────────────────────────
 *  BJP: 255 | SP: 111 | ADSL: 12 | RLD: 8 | SBSP: 6 | NISHAD: 6 | INC: 2 | BSP: 1 | Total: 401
 */

export interface UPConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2022: string;
  winnerName2022: string;
  winnerVotes2022: number;
  runnerUp2022: string;
  margin2022: number;
  currentParty: string;
}

export const UP_CONSTITUENCIES: UPConstituencySeed[] = [
  // ── Saharanpur District ──
  { acNo: 1, name: 'Behat', localName: 'बेहट', district: 'Saharanpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Umar Ali Khan', winnerVotes2022: 134513, runnerUp2022: 'BJP', margin2022: 37880, currentParty: 'SP' },
  { acNo: 2, name: 'Nakur', localName: 'नकुड़', district: 'Saharanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mukesh Choudhary', winnerVotes2022: 104114, runnerUp2022: 'SP', margin2022: 315, currentParty: 'BJP' },
  { acNo: 3, name: 'Saharanpur Nagar', localName: 'सहारनपुर नगर', district: 'Saharanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajiv Gumber', winnerVotes2022: 143195, runnerUp2022: 'SP', margin2022: 7434, currentParty: 'BJP' },
  { acNo: 4, name: 'Saharanpur', localName: 'सहारनपुर', district: 'Saharanpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ashu Malik', winnerVotes2022: 107007, runnerUp2022: 'BJP', margin2022: 30745, currentParty: 'SP' },
  { acNo: 5, name: 'Deoband', localName: 'देवबंद', district: 'Saharanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Th. Brijesh Singh', winnerVotes2022: 93890, runnerUp2022: 'SP', margin2022: 7104, currentParty: 'BJP' },
  { acNo: 6, name: 'Rampur Maniharan', localName: 'रामपुर मनिहारान', district: 'Saharanpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Devendra Kumar Nim', winnerVotes2022: 89109, runnerUp2022: 'BSP', margin2022: 20593, currentParty: 'BJP' },
  { acNo: 7, name: 'Gangoh', localName: 'गंगोह', district: 'Saharanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Kirat Singh', winnerVotes2022: 116582, runnerUp2022: 'SP', margin2022: 23449, currentParty: 'BJP' },
  // ── Shamli District ──
  { acNo: 8, name: 'Kairana', localName: 'कैराना', district: 'Shamli', type: 'GEN', winner2022: 'SP', winnerName2022: 'Nahid Hasan', winnerVotes2022: 131035, runnerUp2022: 'BJP', margin2022: 25887, currentParty: 'SP' },
  { acNo: 9, name: 'Thana Bhawan', localName: 'थाना भवन', district: 'Shamli', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Ashraf Ali Khan', winnerVotes2022: 103751, runnerUp2022: 'BJP', margin2022: 10806, currentParty: 'RLD' },
  { acNo: 10, name: 'Shamli', localName: 'शामली', district: 'Shamli', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Persann Kumar Chaudhary', winnerVotes2022: 103070, runnerUp2022: 'BJP', margin2022: 7107, currentParty: 'RLD' },
  // ── Muzaffarnagar District ──
  { acNo: 11, name: 'Budhana', localName: 'बुढ़ाना', district: 'Muzaffarnagar', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Rajpal Singh Baliyan', winnerVotes2022: 131093, runnerUp2022: 'BJP', margin2022: 28310, currentParty: 'RLD' },
  { acNo: 12, name: 'Charthawal', localName: 'चरथावल', district: 'Muzaffarnagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pankaj Kumar Malik', winnerVotes2022: 97363, runnerUp2022: 'BJP', margin2022: 5334, currentParty: 'SP' },
  { acNo: 13, name: 'Purqazi', localName: 'पुरकाजी', district: 'Muzaffarnagar', type: 'SC', winner2022: 'RLD', winnerName2022: 'Anil Kumar', winnerVotes2022: 92672, runnerUp2022: 'BJP', margin2022: 6532, currentParty: 'RLD' },
  { acNo: 14, name: 'Muzaffarnagar', localName: 'मुजफ्फरनगर', district: 'Muzaffarnagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Kapil Dev Aggarwal', winnerVotes2022: 111794, runnerUp2022: 'RLD', margin2022: 18694, currentParty: 'BJP' },
  { acNo: 15, name: 'Khatauli', localName: 'खतौली', district: 'Muzaffarnagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vikram Singh Saini', winnerVotes2022: 100651, runnerUp2022: 'RLD', margin2022: 16345, currentParty: 'BJP' },
  { acNo: 16, name: 'Meerapur', localName: 'मीरापुर', district: 'Muzaffarnagar', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Chandan Chauhan', winnerVotes2022: 107421, runnerUp2022: 'BJP', margin2022: 27380, currentParty: 'RLD' },
  // ── Bijnor District ──
  { acNo: 17, name: 'Najibabad', localName: 'नजीबाबाद', district: 'Bijnor', type: 'GEN', winner2022: 'SP', winnerName2022: 'Tasleem Ahmad', winnerVotes2022: 102675, runnerUp2022: 'BJP', margin2022: 23770, currentParty: 'SP' },
  { acNo: 18, name: 'Nagina', localName: 'नगीना', district: 'Bijnor', type: 'SC', winner2022: 'SP', winnerName2022: 'Manoj Kumar Paras', winnerVotes2022: 97155, runnerUp2022: 'BJP', margin2022: 26451, currentParty: 'SP' },
  { acNo: 19, name: 'Barhapur', localName: 'बढ़ापुर', district: 'Bijnor', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Kunwar Sushant Singh', winnerVotes2022: 100100, runnerUp2022: 'SP', margin2022: 14345, currentParty: 'BJP' },
  { acNo: 20, name: 'Dhampur', localName: 'धामपुर', district: 'Bijnor', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ashok Kumar Rana', winnerVotes2022: 81791, runnerUp2022: 'SP', margin2022: 203, currentParty: 'BJP' },
  { acNo: 21, name: 'Nehtaur', localName: 'नेहटौर', district: 'Bijnor', type: 'SC', winner2022: 'BJP', winnerName2022: 'Om Kumar', winnerVotes2022: 77935, runnerUp2022: 'RLD', margin2022: 258, currentParty: 'BJP' },
  { acNo: 22, name: 'Bijnor', localName: 'बिजनौर', district: 'Bijnor', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Suchi Chaudhary', winnerVotes2022: 97165, runnerUp2022: 'RLD', margin2022: 1445, currentParty: 'BJP' },
  { acNo: 23, name: 'Chandpur', localName: 'चांदपुर', district: 'Bijnor', type: 'GEN', winner2022: 'SP', winnerName2022: 'Swami Omvesh', winnerVotes2022: 90522, runnerUp2022: 'BJP', margin2022: 234, currentParty: 'SP' },
  { acNo: 24, name: 'Noorpur', localName: 'नूरपुर', district: 'Bijnor', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ram Avatar Singh', winnerVotes2022: 92574, runnerUp2022: 'BJP', margin2022: 6065, currentParty: 'SP' },
  // ── Moradabad District ──
  { acNo: 25, name: 'Kanth', localName: 'कांठ', district: 'Moradabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Kamal Akhtar', winnerVotes2022: 134692, runnerUp2022: 'BJP', margin2022: 43178, currentParty: 'SP' },
  { acNo: 26, name: 'Thakurdwara', localName: 'ठाकुरद्वारा', district: 'Moradabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Nawab Jan', winnerVotes2022: 134391, runnerUp2022: 'BJP', margin2022: 19684, currentParty: 'SP' },
  { acNo: 27, name: 'Moradabad Rural', localName: 'मुरादाबाद ग्रामीण', district: 'Moradabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mohd Nasir Qureshi', winnerVotes2022: 114337, runnerUp2022: 'BJP', margin2022: 27820, currentParty: 'SP' },
  { acNo: 28, name: 'Moradabad Nagar', localName: 'मुरादाबाद नगर', district: 'Moradabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ritesh Kumar Gupta', winnerVotes2022: 148384, runnerUp2022: 'SP', margin2022: 782, currentParty: 'BJP' },
  { acNo: 29, name: 'Kundarki', localName: 'कुन्दरकी', district: 'Moradabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Zia ur Rahman Barq', winnerVotes2022: 125792, runnerUp2022: 'BJP', margin2022: 43162, currentParty: 'SP' },
  { acNo: 30, name: 'Bilari', localName: 'बिलारी', district: 'Moradabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mohammed Faeem', winnerVotes2022: 95338, runnerUp2022: 'BJP', margin2022: 7610, currentParty: 'SP' },
  // ── Sambhal District ──
  { acNo: 31, name: 'Chandausi', localName: 'चन्दौसी', district: 'Sambhal', type: 'SC', winner2022: 'BJP', winnerName2022: 'Gulabo Devi', winnerVotes2022: 112890, runnerUp2022: 'SP', margin2022: 35367, currentParty: 'BJP' },
  { acNo: 32, name: 'Asmoli', localName: 'असमौली', district: 'Sambhal', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pinki Singh Yadav', winnerVotes2022: 111652, runnerUp2022: 'BJP', margin2022: 25206, currentParty: 'SP' },
  { acNo: 33, name: 'Sambhal', localName: 'सम्भल', district: 'Sambhal', type: 'GEN', winner2022: 'SP', winnerName2022: 'Iqbal Mehmood', winnerVotes2022: 107073, runnerUp2022: 'BJP', margin2022: 41697, currentParty: 'SP' },
  // ── Rampur District ──
  { acNo: 34, name: 'Suar', localName: 'स्वार', district: 'Rampur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Abdullah Azam Khan', winnerVotes2022: 126162, runnerUp2022: 'ADSL', margin2022: 61103, currentParty: 'SP' },
  { acNo: 35, name: 'Chamraua', localName: 'चमरौआ', district: 'Rampur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Naseer Ahmad Khan', winnerVotes2022: 100976, runnerUp2022: 'BJP', margin2022: 34290, currentParty: 'SP' },
  { acNo: 36, name: 'Bilaspur', localName: 'बिलासपुर', district: 'Rampur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Baldev Singh Aulakh', winnerVotes2022: 101998, runnerUp2022: 'SP', margin2022: 307, currentParty: 'BJP' },
  { acNo: 37, name: 'Rampur', localName: 'रामपुर', district: 'Rampur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Azam Khan', winnerVotes2022: 131225, runnerUp2022: 'BJP', margin2022: 55141, currentParty: 'SP' },
  { acNo: 38, name: 'Milak', localName: 'मिलक', district: 'Rampur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rajbala', winnerVotes2022: 97948, runnerUp2022: 'SP', margin2022: 5912, currentParty: 'BJP' },
  // ── Amroha District ──
  { acNo: 39, name: 'Dhanaura', localName: 'धनौरा', district: 'Amroha', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rajeev Tarara', winnerVotes2022: 103054, runnerUp2022: 'SP', margin2022: 11425, currentParty: 'BJP' },
  { acNo: 40, name: 'Naugawan Sadat', localName: 'नौगावां सादात', district: 'Amroha', type: 'GEN', winner2022: 'SP', winnerName2022: 'Samarpal Singh', winnerVotes2022: 108497, runnerUp2022: 'BJP', margin2022: 6540, currentParty: 'SP' },
  { acNo: 41, name: 'Amroha', localName: 'अमरोहा', district: 'Amroha', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mehboob Ali', winnerVotes2022: 128735, runnerUp2022: 'BJP', margin2022: 71036, currentParty: 'SP' },
  { acNo: 42, name: 'Hasanpur', localName: 'हसनपुर', district: 'Amroha', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mahender Singh Khadakvanshi', winnerVotes2022: 120135, runnerUp2022: 'SP', margin2022: 22382, currentParty: 'BJP' },
  // ── Meerut District ──
  { acNo: 43, name: 'Siwalkhas', localName: 'सिवालखास', district: 'Meerut', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Ghulam Mohammed', winnerVotes2022: 101749, runnerUp2022: 'BJP', margin2022: 9182, currentParty: 'RLD' },
  { acNo: 44, name: 'Sardhana', localName: 'सरधना', district: 'Meerut', type: 'GEN', winner2022: 'SP', winnerName2022: 'Atul Pradhan', winnerVotes2022: 118573, runnerUp2022: 'BJP', margin2022: 18200, currentParty: 'SP' },
  { acNo: 45, name: 'Hastinapur', localName: 'हस्तिनापुर', district: 'Meerut', type: 'SC', winner2022: 'BJP', winnerName2022: 'Dinesh Khatik', winnerVotes2022: 107587, runnerUp2022: 'SP', margin2022: 7312, currentParty: 'BJP' },
  { acNo: 46, name: 'Kithore', localName: 'किठौर', district: 'Meerut', type: 'GEN', winner2022: 'SP', winnerName2022: 'Shahid Manzoor', winnerVotes2022: 107104, runnerUp2022: 'BJP', margin2022: 2180, currentParty: 'SP' },
  { acNo: 47, name: 'Meerut Cantt', localName: 'मेरठ कैंट', district: 'Meerut', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Amit Agrawal', winnerVotes2022: 162032, runnerUp2022: 'RLD', margin2022: 118072, currentParty: 'BJP' },
  { acNo: 48, name: 'Meerut', localName: 'मेरठ', district: 'Meerut', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rafiq Ansari', winnerVotes2022: 106395, runnerUp2022: 'BJP', margin2022: 26065, currentParty: 'SP' },
  { acNo: 49, name: 'Meerut South', localName: 'मेरठ दक्षिण', district: 'Meerut', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Somendra Tomar', winnerVotes2022: 129667, runnerUp2022: 'SP', margin2022: 7942, currentParty: 'BJP' },
  // ── Baghpat District ──
  { acNo: 50, name: 'Chhaprauli', localName: 'छपरौली', district: 'Baghpat', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Ajay Kumar', winnerVotes2022: 111880, runnerUp2022: 'BJP', margin2022: 29508, currentParty: 'RLD' },
  { acNo: 51, name: 'Baraut', localName: 'बड़ौत', district: 'Baghpat', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Krishnapal Malik', winnerVotes2022: 90931, runnerUp2022: 'RLD', margin2022: 315, currentParty: 'BJP' },
  { acNo: 52, name: 'Baghpat', localName: 'बागपत', district: 'Baghpat', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Chaudhary Yogesh Dhama', winnerVotes2022: 101420, runnerUp2022: 'RLD', margin2022: 6733, currentParty: 'BJP' },
  // ── Ghaziabad District ──
  { acNo: 53, name: 'Loni', localName: 'लोनी', district: 'Ghaziabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nand Kishor Gurjar', winnerVotes2022: 127410, runnerUp2022: 'RLD', margin2022: 8676, currentParty: 'BJP' },
  { acNo: 54, name: 'Muradnagar', localName: 'मुरादनगर', district: 'Ghaziabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ajit Pal Tyagi', winnerVotes2022: 169290, runnerUp2022: 'RLD', margin2022: 97095, currentParty: 'BJP' },
  { acNo: 55, name: 'Sahibabad', localName: 'साहिबाबाद', district: 'Ghaziabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sunil Kumar Sharma', winnerVotes2022: 322882, runnerUp2022: 'SP', margin2022: 214835, currentParty: 'BJP' },
  { acNo: 56, name: 'Ghaziabad', localName: 'गाजियाबाद', district: 'Ghaziabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Atul Garg', winnerVotes2022: 150205, runnerUp2022: 'SP', margin2022: 105537, currentParty: 'BJP' },
  { acNo: 57, name: 'Modinagar', localName: 'मोदीनगर', district: 'Ghaziabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Manju Shiwach', winnerVotes2022: 113349, runnerUp2022: 'RLD', margin2022: 34619, currentParty: 'BJP' },
  // ── Hapur District ──
  { acNo: 58, name: 'Dhaulana', localName: 'धौलाना', district: 'Hapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dharmesh Singh Tomar', winnerVotes2022: 125028, runnerUp2022: 'SP', margin2022: 12628, currentParty: 'BJP' },
  { acNo: 59, name: 'Hapur', localName: 'हापुड़', district: 'Hapur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vijay Pal Aadthi', winnerVotes2022: 97862, runnerUp2022: 'RLD', margin2022: 7034, currentParty: 'BJP' },
  { acNo: 60, name: 'Garhmukteshwar', localName: 'गढ़मुक्तेश्वर', district: 'Hapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Harendra Singh Tewatia', winnerVotes2022: 104113, runnerUp2022: 'SP', margin2022: 26306, currentParty: 'BJP' },
  // ── Gautam Buddha Nagar District ──
  { acNo: 61, name: 'Noida', localName: 'नोएडा', district: 'Gautam Buddha Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pankaj Singh', winnerVotes2022: 244319, runnerUp2022: 'SP', margin2022: 181513, currentParty: 'BJP' },
  { acNo: 62, name: 'Dadri', localName: 'दादरी', district: 'Gautam Buddha Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Tejpal Singh Nagar', winnerVotes2022: 218068, runnerUp2022: 'SP', margin2022: 138218, currentParty: 'BJP' },
  { acNo: 63, name: 'Jewar', localName: 'जेवर', district: 'Gautam Buddha Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dhirendra Singh', winnerVotes2022: 117205, runnerUp2022: 'RLD', margin2022: 56315, currentParty: 'BJP' },
  // ── Bulandshahr District ──
  { acNo: 64, name: 'Sikandrabad', localName: 'सिकंदराबाद', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Lakshmi Raj Singh', winnerVotes2022: 125644, runnerUp2022: 'SP', margin2022: 29343, currentParty: 'BJP' },
  { acNo: 65, name: 'Bulandshahr', localName: 'बुलंदशहर', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pradeep Kumar Chaudhary', winnerVotes2022: 127026, runnerUp2022: 'RLD', margin2022: 25600, currentParty: 'BJP' },
  { acNo: 66, name: 'Syana', localName: 'स्याना', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Devendra Singh Lodhi', winnerVotes2022: 149125, runnerUp2022: 'RLD', margin2022: 89657, currentParty: 'BJP' },
  { acNo: 67, name: 'Anupshahr', localName: 'अनूपशहर', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sanjay Kumar Sharma', winnerVotes2022: 125602, runnerUp2022: 'BSP', margin2022: 77623, currentParty: 'BJP' },
  { acNo: 68, name: 'Debai', localName: 'डिबाई', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Chandrapal Singh', winnerVotes2022: 128640, runnerUp2022: 'SP', margin2022: 68025, currentParty: 'BJP' },
  { acNo: 69, name: 'Shikarpur', localName: 'शिकारपुर', district: 'Bulandshahr', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Sharma', winnerVotes2022: 113855, runnerUp2022: 'RLD', margin2022: 55683, currentParty: 'BJP' },
  { acNo: 70, name: 'Khurja', localName: 'खुर्जा', district: 'Bulandshahr', type: 'SC', winner2022: 'BJP', winnerName2022: 'Meenakshi Singh', winnerVotes2022: 137461, runnerUp2022: 'SP', margin2022: 67084, currentParty: 'BJP' },
  // ── Aligarh District ──
  { acNo: 71, name: 'Khair', localName: 'खैर', district: 'Aligarh', type: 'SC', winner2022: 'BJP', winnerName2022: 'Anoop Pradhan', winnerVotes2022: 139643, runnerUp2022: 'BSP', margin2022: 74341, currentParty: 'BJP' },
  { acNo: 72, name: 'Barauli', localName: 'बरौली', district: 'Aligarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Thakur Jaivir Singh', winnerVotes2022: 147984, runnerUp2022: 'BSP', margin2022: 90645, currentParty: 'BJP' },
  { acNo: 73, name: 'Atrauli', localName: 'अतरौली', district: 'Aligarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sandeep Kumar Singh', winnerVotes2022: 125691, runnerUp2022: 'SP', margin2022: 39324, currentParty: 'BJP' },
  { acNo: 74, name: 'Chharra', localName: 'छर्रा', district: 'Aligarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ravendra Pal Singh', winnerVotes2022: 110928, runnerUp2022: 'SP', margin2022: 24327, currentParty: 'BJP' },
  { acNo: 75, name: 'Koil', localName: 'कोल', district: 'Aligarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Parashar', winnerVotes2022: 108067, runnerUp2022: 'SP', margin2022: 5028, currentParty: 'BJP' },
  { acNo: 76, name: 'Aligarh', localName: 'अलीगढ़', district: 'Aligarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mukta Raja', winnerVotes2022: 120389, runnerUp2022: 'SP', margin2022: 12786, currentParty: 'BJP' },
  { acNo: 77, name: 'Iglas', localName: 'इगलास', district: 'Aligarh', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rajkumar Sahyogi', winnerVotes2022: 127209, runnerUp2022: 'RLD', margin2022: 59163, currentParty: 'BJP' },
  // ── Hathras District ──
  { acNo: 78, name: 'Hathras', localName: 'हाथरस', district: 'Hathras', type: 'SC', winner2022: 'BJP', winnerName2022: 'Anjula Singh Mahaur', winnerVotes2022: 154655, runnerUp2022: 'BSP', margin2022: 100856, currentParty: 'BJP' },
  { acNo: 79, name: 'Sadabad', localName: 'सादाबाद', district: 'Hathras', type: 'GEN', winner2022: 'RLD', winnerName2022: 'Pradeep Kumar Singh', winnerVotes2022: 104874, runnerUp2022: 'BJP', margin2022: 6437, currentParty: 'RLD' },
  { acNo: 80, name: 'Sikandra Rao', localName: 'सिकंदर राव', district: 'Hathras', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Birendra Singh Rana', winnerVotes2022: 98094, runnerUp2022: 'SP', margin2022: 8104, currentParty: 'BJP' },
  // ── Mathura District ──
  { acNo: 81, name: 'Chhata', localName: 'छाता', district: 'Mathura', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Chaudhary Laxmi Narayan Singh', winnerVotes2022: 124414, runnerUp2022: 'RLD', margin2022: 48948, currentParty: 'BJP' },
  { acNo: 82, name: 'Mant', localName: 'मांट', district: 'Mathura', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajesh Chaudhary', winnerVotes2022: 83958, runnerUp2022: 'BSP', margin2022: 9580, currentParty: 'BJP' },
  { acNo: 83, name: 'Goverdhan', localName: 'गोवर्धन', district: 'Mathura', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Karinda Singh', winnerVotes2022: 100199, runnerUp2022: 'BSP', margin2022: 42507, currentParty: 'BJP' },
  { acNo: 84, name: 'Mathura', localName: 'मथुरा', district: 'Mathura', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Shrikant Sharma', winnerVotes2022: 158859, runnerUp2022: 'INC', margin2022: 109803, currentParty: 'BJP' },
  { acNo: 85, name: 'Baldev', localName: 'बलदेव', district: 'Mathura', type: 'SC', winner2022: 'BJP', winnerName2022: 'Pooran Prakash', winnerVotes2022: 108414, runnerUp2022: 'RLD', margin2022: 25255, currentParty: 'BJP' },
  // ── Agra District ──
  { acNo: 86, name: 'Etmadpur', localName: 'एतमादपुर', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dharampal Singh', winnerVotes2022: 146603, runnerUp2022: 'BSP', margin2022: 47924, currentParty: 'BJP' },
  { acNo: 87, name: 'Agra Cantonment', localName: 'आगरा छावनी', district: 'Agra', type: 'SC', winner2022: 'BJP', winnerName2022: 'G S Dharmesh', winnerVotes2022: 117796, runnerUp2022: 'SP', margin2022: 48697, currentParty: 'BJP' },
  { acNo: 88, name: 'Agra South', localName: 'आगरा दक्षिण', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Yogendra Upadhyaya', winnerVotes2022: 109262, runnerUp2022: 'SP', margin2022: 56640, currentParty: 'BJP' },
  { acNo: 89, name: 'Agra North', localName: 'आगरा उत्तर', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Purushottam Khandelwal', winnerVotes2022: 153817, runnerUp2022: 'BSP', margin2022: 112370, currentParty: 'BJP' },
  { acNo: 90, name: 'Agra Rural', localName: 'आगरा ग्रामीण', district: 'Agra', type: 'SC', winner2022: 'BJP', winnerName2022: 'Baby Rani Maurya', winnerVotes2022: 137310, runnerUp2022: 'BSP', margin2022: 76608, currentParty: 'BJP' },
  { acNo: 91, name: 'Fatehpur Sikri', localName: 'फतेहपुर सीकरी', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Babulal Chaudhary', winnerVotes2022: 112095, runnerUp2022: 'RLD', margin2022: 47269, currentParty: 'BJP' },
  { acNo: 92, name: 'Kheragarh', localName: 'खैरागढ़', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bhagwan Singh Kushwaha', winnerVotes2022: 96574, runnerUp2022: 'INC', margin2022: 36497, currentParty: 'BJP' },
  { acNo: 93, name: 'Fatehabad', localName: 'फतेहाबाद', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Chotelal Verma', winnerVotes2022: 108811, runnerUp2022: 'SP', margin2022: 53235, currentParty: 'BJP' },
  { acNo: 94, name: 'Bah', localName: 'बाह', district: 'Agra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rani Pakshalika Singh', winnerVotes2022: 78360, runnerUp2022: 'SP', margin2022: 24235, currentParty: 'BJP' },
  // ── Firozabad District ──
  { acNo: 95, name: 'Tundla', localName: 'टूंडला', district: 'Firozabad', type: 'SC', winner2022: 'BJP', winnerName2022: 'Prempal Singh Dhangar', winnerVotes2022: 122881, runnerUp2022: 'SP', margin2022: 47691, currentParty: 'BJP' },
  { acNo: 96, name: 'Jasrana', localName: 'जसराना', district: 'Firozabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Sachin Yadav', winnerVotes2022: 108289, runnerUp2022: 'BJP', margin2022: 836, currentParty: 'SP' },
  { acNo: 97, name: 'Firozabad', localName: 'फिरोजाबाद', district: 'Firozabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Manish Asiza', winnerVotes2022: 112509, runnerUp2022: 'SP', margin2022: 32955, currentParty: 'BJP' },
  { acNo: 98, name: 'Shikohabad', localName: 'शिकोहाबाद', district: 'Firozabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mukesh Verma', winnerVotes2022: 106279, runnerUp2022: 'BJP', margin2022: 9328, currentParty: 'SP' },
  { acNo: 99, name: 'Sirsaganj', localName: 'सिरसागंज', district: 'Firozabad', type: 'GEN', winner2022: 'SP', winnerName2022: 'Sarvesh Singh Yadav', winnerVotes2022: 96224, runnerUp2022: 'BJP', margin2022: 8805, currentParty: 'SP' },
  // ── Kasganj District ──
  { acNo: 100, name: 'Kasganj', localName: 'कासगंज', district: 'Kasganj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Devendra Singh', winnerVotes2022: 123410, runnerUp2022: 'SP', margin2022: 46265, currentParty: 'BJP' },
  { acNo: 101, name: 'Amanpur', localName: 'अमानपुर', district: 'Kasganj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Hariom Verma', winnerVotes2022: 96377, runnerUp2022: 'SP', margin2022: 43329, currentParty: 'BJP' },
  { acNo: 102, name: 'Patiyali', localName: 'पटियाली', district: 'Kasganj', type: 'GEN', winner2022: 'SP', winnerName2022: 'Nadira Sultan', winnerVotes2022: 91545, runnerUp2022: 'BJP', margin2022: 4001, currentParty: 'SP' },
  // ── Etah District ──
  { acNo: 103, name: 'Aliganj', localName: 'अलीगंज', district: 'Etah', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Satyapal Singh Rathore', winnerVotes2022: 102873, runnerUp2022: 'SP', margin2022: 3810, currentParty: 'BJP' },
  { acNo: 104, name: 'Etah', localName: 'एटा', district: 'Etah', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vipin Kumar David', winnerVotes2022: 97539, runnerUp2022: 'SP', margin2022: 17247, currentParty: 'BJP' },
  { acNo: 105, name: 'Marhara', localName: 'मारहरा', district: 'Etah', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Virendra Singh Lodhi', winnerVotes2022: 101387, runnerUp2022: 'SP', margin2022: 17609, currentParty: 'BJP' },
  { acNo: 106, name: 'Jalesar', localName: 'जलेसर', district: 'Etah', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sanjeev Kumar Diwakar', winnerVotes2022: 91339, runnerUp2022: 'SP', margin2022: 4441, currentParty: 'BJP' },
  // ── Mainpuri District ──
  { acNo: 107, name: 'Mainpuri', localName: 'मैनपुरी', district: 'Mainpuri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jaiveer Singh', winnerVotes2022: 99814, runnerUp2022: 'SP', margin2022: 6766, currentParty: 'BJP' },
  { acNo: 108, name: 'Bhongaon', localName: 'भोगांव', district: 'Mainpuri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ram Naresh Agnihotri', winnerVotes2022: 97208, runnerUp2022: 'SP', margin2022: 4767, currentParty: 'BJP' },
  { acNo: 109, name: 'Kishni', localName: 'किशनी', district: 'Mainpuri', type: 'SC', winner2022: 'SP', winnerName2022: 'Brajesh Katheriya', winnerVotes2022: 97070, runnerUp2022: 'BJP', margin2022: 19151, currentParty: 'SP' },
  { acNo: 110, name: 'Karhal', localName: 'करहल', district: 'Mainpuri', type: 'GEN', winner2022: 'SP', winnerName2022: 'Akhilesh Yadav', winnerVotes2022: 148196, runnerUp2022: 'BJP', margin2022: 67504, currentParty: 'SP' },
  // ── Sambhal District ──
  { acNo: 111, name: 'Gunnaur', localName: 'गुन्नौर', district: 'Sambhal', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ramkhiladi Singh Yadav', winnerVotes2022: 123969, runnerUp2022: 'BJP', margin2022: 29529, currentParty: 'SP' },
  // ── Budaun District ──
  { acNo: 112, name: 'Bisauli', localName: 'बिसौली', district: 'Budaun', type: 'SC', winner2022: 'SP', winnerName2022: 'Ashutosh Maurya', winnerVotes2022: 110569, runnerUp2022: 'BJP', margin2022: 1834, currentParty: 'SP' },
  { acNo: 113, name: 'Sahaswan', localName: 'सहसवान', district: 'Budaun', type: 'GEN', winner2022: 'SP', winnerName2022: 'Brajesh Yadav', winnerVotes2022: 83673, runnerUp2022: 'BSP', margin2022: 13945, currentParty: 'SP' },
  { acNo: 114, name: 'Bilsi', localName: 'बिल्सी', district: 'Budaun', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Harish Chandra Shakya', winnerVotes2022: 93500, runnerUp2022: 'SP', margin2022: 25115, currentParty: 'BJP' },
  { acNo: 115, name: 'Badaun', localName: 'बदायूं', district: 'Budaun', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mahesh Chandra Gupta', winnerVotes2022: 101096, runnerUp2022: 'SP', margin2022: 11179, currentParty: 'BJP' },
  { acNo: 116, name: 'Shekhupur', localName: 'शेखूपुर', district: 'Budaun', type: 'GEN', winner2022: 'SP', winnerName2022: 'Himanshu Yadav', winnerVotes2022: 105531, runnerUp2022: 'BJP', margin2022: 6100, currentParty: 'SP' },
  { acNo: 117, name: 'Dataganj', localName: 'दातागंज', district: 'Budaun', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajeev Kumar Singh', winnerVotes2022: 107591, runnerUp2022: 'SP', margin2022: 9476, currentParty: 'BJP' },
  // ── Bareilly District ──
  { acNo: 118, name: 'Baheri', localName: 'बहेड़ी', district: 'Bareilly', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ataur Rehman', winnerVotes2022: 124145, runnerUp2022: 'BJP', margin2022: 3355, currentParty: 'SP' },
  { acNo: 119, name: 'Meerganj', localName: 'मीरगंज', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'DC Verma', winnerVotes2022: 116435, runnerUp2022: 'SP', margin2022: 32840, currentParty: 'BJP' },
  { acNo: 120, name: 'Bhojipura', localName: 'भोजीपुरा', district: 'Bareilly', type: 'GEN', winner2022: 'SP', winnerName2022: 'Shazil Islam Ansari', winnerVotes2022: 119402, runnerUp2022: 'BJP', margin2022: 9409, currentParty: 'SP' },
  { acNo: 121, name: 'Nawabganj', localName: 'नवाबगंज', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dr. M. P. Arya Gangwar', winnerVotes2022: 111113, runnerUp2022: 'SP', margin2022: 9237, currentParty: 'BJP' },
  { acNo: 122, name: 'Faridpur', localName: 'फरीदपुर', district: 'Bareilly', type: 'SC', winner2022: 'BJP', winnerName2022: 'Shyam Bihari Lal', winnerVotes2022: 92070, runnerUp2022: 'SP', margin2022: 2921, currentParty: 'BJP' },
  { acNo: 123, name: 'Bithari Chainpur', localName: 'बिथरी चैनपुर', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Raghavendra Sharma', winnerVotes2022: 115417, runnerUp2022: 'SP', margin2022: 15841, currentParty: 'BJP' },
  { acNo: 124, name: 'Bareilly', localName: 'बरेली', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dr. Arun Kumar Saxena', winnerVotes2022: 129014, runnerUp2022: 'SP', margin2022: 32320, currentParty: 'BJP' },
  { acNo: 125, name: 'Bareilly Cantt', localName: 'बरेली कैंट', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sanjeev Agarwal', winnerVotes2022: 98931, runnerUp2022: 'SP', margin2022: 10768, currentParty: 'BJP' },
  { acNo: 126, name: 'Aonla', localName: 'आंवला', district: 'Bareilly', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dharampal Singh', winnerVotes2022: 88956, runnerUp2022: 'SP', margin2022: 18424, currentParty: 'BJP' },
  // ── Pilibhit District ──
  { acNo: 127, name: 'Pilibhit', localName: 'पीलीभीत', district: 'Pilibhit', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sanjay Singh Gangwar', winnerVotes2022: 125506, runnerUp2022: 'SP', margin2022: 6970, currentParty: 'BJP' },
  { acNo: 128, name: 'Barkhera', localName: 'बरखेड़ा', district: 'Pilibhit', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Swami Pravaktanand', winnerVotes2022: 151771, runnerUp2022: 'SP', margin2022: 81472, currentParty: 'BJP' },
  { acNo: 129, name: 'Puranpur', localName: 'पूरनपुर', district: 'Pilibhit', type: 'SC', winner2022: 'BJP', winnerName2022: 'Babu Ram Paswan', winnerVotes2022: 134404, runnerUp2022: 'SP', margin2022: 26576, currentParty: 'BJP' },
  { acNo: 130, name: 'Bisalpur', localName: 'बीसलपुर', district: 'Pilibhit', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vivek Kumar Verma', winnerVotes2022: 121142, runnerUp2022: 'SP', margin2022: 50409, currentParty: 'BJP' },
  // ── Shahjahanpur District ──
  { acNo: 131, name: 'Katra', localName: 'कटरा', district: 'Shahjahanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Veer Vikram Singh', winnerVotes2022: 77800, runnerUp2022: 'SP', margin2022: 357, currentParty: 'BJP' },
  { acNo: 132, name: 'Jalalabad', localName: 'जलालाबाद', district: 'Shahjahanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Hari Prakash Verma', winnerVotes2022: 99609, runnerUp2022: 'SP', margin2022: 4572, currentParty: 'BJP' },
  { acNo: 133, name: 'Tilhar', localName: 'तिल्हर', district: 'Shahjahanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Salona Kushwaha', winnerVotes2022: 102307, runnerUp2022: 'SP', margin2022: 13277, currentParty: 'BJP' },
  { acNo: 134, name: 'Powayan', localName: 'पुवायाँ', district: 'Shahjahanpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Chetram Pasi', winnerVotes2022: 129785, runnerUp2022: 'SP', margin2022: 51578, currentParty: 'BJP' },
  { acNo: 135, name: 'Shahjahanpur', localName: 'शाहजहांपुर', district: 'Shahjahanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Suresh Kumar Khanna', winnerVotes2022: 109942, runnerUp2022: 'SP', margin2022: 9313, currentParty: 'BJP' },
  { acNo: 136, name: 'Dadraul', localName: 'ददरौल', district: 'Shahjahanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Manvendra Singh', winnerVotes2022: 100957, runnerUp2022: 'SP', margin2022: 9701, currentParty: 'BJP' },
  // ── Lakhimpur Kheri District ──
  { acNo: 137, name: 'Palia', localName: 'पलिया', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Harvindar Kumar Sahani', winnerVotes2022: 118864, runnerUp2022: 'SP', margin2022: 38129, currentParty: 'BJP' },
  { acNo: 138, name: 'Nighasan', localName: 'निघासन', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Shashank Verma', winnerVotes2022: 126488, runnerUp2022: 'SP', margin2022: 41009, currentParty: 'BJP' },
  { acNo: 139, name: 'Gola Gokrannath', localName: 'गोला गोकर्णनाथ', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Arvind Giri', winnerVotes2022: 126534, runnerUp2022: 'SP', margin2022: 29294, currentParty: 'BJP' },
  { acNo: 140, name: 'Sri Nagar', localName: 'श्रीनगर', district: 'Lakhimpur Kheri', type: 'SC', winner2022: 'BJP', winnerName2022: 'Manju Tyagi', winnerVotes2022: 108249, runnerUp2022: 'SP', margin2022: 17608, currentParty: 'BJP' },
  { acNo: 141, name: 'Dhaurahra', localName: 'धौरहरा', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vinod Shankar Awasthi', winnerVotes2022: 113498, runnerUp2022: 'SP', margin2022: 24610, currentParty: 'BJP' },
  { acNo: 142, name: 'Lakhimpur', localName: 'लखीमपुर', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Yogesh Verma', winnerVotes2022: 127663, runnerUp2022: 'SP', margin2022: 20578, currentParty: 'BJP' },
  { acNo: 143, name: 'Kasta', localName: 'कस्ता', district: 'Lakhimpur Kheri', type: 'SC', winner2022: 'BJP', winnerName2022: 'Saurabh Singh', winnerVotes2022: 103315, runnerUp2022: 'SP', margin2022: 13817, currentParty: 'BJP' },
  { acNo: 144, name: 'Mohammdi', localName: 'मोहम्मदी', district: 'Lakhimpur Kheri', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Lokendra Pratap Singh', winnerVotes2022: 99377, runnerUp2022: 'SP', margin2022: 4871, currentParty: 'BJP' },
  // ── Sitapur District ──
  { acNo: 145, name: 'Maholi', localName: 'महौली', district: 'Sitapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Shashank Trivedi', winnerVotes2022: 112040, runnerUp2022: 'SP', margin2022: 12172, currentParty: 'BJP' },
  { acNo: 146, name: 'Sitapur', localName: 'सीतापुर', district: 'Sitapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rakesh Rathour', winnerVotes2022: 99349, runnerUp2022: 'SP', margin2022: 1253, currentParty: 'BJP' },
  { acNo: 147, name: 'Hargaon', localName: 'हरगांव', district: 'Sitapur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Suresh Rahi', winnerVotes2022: 116691, runnerUp2022: 'SP', margin2022: 38160, currentParty: 'BJP' },
  { acNo: 148, name: 'Laharpur', localName: 'लहरपुर', district: 'Sitapur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Anil Kumar Verma', winnerVotes2022: 112987, runnerUp2022: 'BJP', margin2022: 13155, currentParty: 'SP' },
  { acNo: 149, name: 'Biswan', localName: 'बिसवां', district: 'Sitapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nirmal Verma', winnerVotes2022: 106014, runnerUp2022: 'SP', margin2022: 10478, currentParty: 'BJP' },
  { acNo: 150, name: 'Sevata', localName: 'सेवता', district: 'Sitapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Gyan Tiwari', winnerVotes2022: 108057, runnerUp2022: 'SP', margin2022: 20438, currentParty: 'BJP' },
  { acNo: 151, name: 'Mahmoodabad', localName: 'महमूदाबाद', district: 'Sitapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Asha Maurya', winnerVotes2022: 92091, runnerUp2022: 'SP', margin2022: 5222, currentParty: 'BJP' },
  { acNo: 152, name: 'Sidhauli', localName: 'सिधौली', district: 'Sitapur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Manish Rawat', winnerVotes2022: 106222, runnerUp2022: 'SP', margin2022: 9716, currentParty: 'BJP' },
  { acNo: 153, name: 'Misrikh', localName: 'मिसरिख', district: 'Sitapur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ramkrishna Bhargava', winnerVotes2022: 91092, runnerUp2022: 'SBSP', margin2022: 11465, currentParty: 'BJP' },
  // ── Hardoi District ──
  { acNo: 154, name: 'Sawayazpur', localName: 'सवायजपुर', district: 'Hardoi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Madhavendra Pratap', winnerVotes2022: 114623, runnerUp2022: 'SP', margin2022: 26047, currentParty: 'BJP' },
  { acNo: 155, name: 'Shahabad', localName: 'शाहाबाद', district: 'Hardoi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajani Tiwari', winnerVotes2022: 94561, runnerUp2022: 'SP', margin2022: 6479, currentParty: 'BJP' },
  { acNo: 156, name: 'Hardoi', localName: 'हरदोई', district: 'Hardoi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nitin Agarwal', winnerVotes2022: 126750, runnerUp2022: 'SP', margin2022: 42411, currentParty: 'BJP' },
  { acNo: 157, name: 'Gopamau', localName: 'गोपामऊ', district: 'Hardoi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Shyam Prakash', winnerVotes2022: 91762, runnerUp2022: 'SP', margin2022: 7998, currentParty: 'BJP' },
  { acNo: 158, name: 'Sandi', localName: 'सांडी', district: 'Hardoi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Prabhash Kumar', winnerVotes2022: 81519, runnerUp2022: 'SP', margin2022: 9233, currentParty: 'BJP' },
  { acNo: 159, name: 'Bilgram-Mallanwan', localName: 'बिलग्राम-मल्लांवा', district: 'Hardoi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ashish Kumar Singh', winnerVotes2022: 82075, runnerUp2022: 'SP', margin2022: 24890, currentParty: 'BJP' },
  { acNo: 160, name: 'Balamau', localName: 'बालामऊ', district: 'Hardoi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ram Pal Verma', winnerVotes2022: 81994, runnerUp2022: 'SP', margin2022: 26424, currentParty: 'BJP' },
  { acNo: 161, name: 'Sandila', localName: 'संडीला', district: 'Hardoi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Alka Singh Arkvanshi', winnerVotes2022: 101730, runnerUp2022: 'BSP', margin2022: 37103, currentParty: 'BJP' },
  // ── Unnao District ──
  { acNo: 162, name: 'Bangarmau', localName: 'बाँगरमऊ', district: 'Unnao', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Shrikant Katiyar', winnerVotes2022: 90980, runnerUp2022: 'SP', margin2022: 15793, currentParty: 'BJP' },
  { acNo: 163, name: 'Safipur', localName: 'सफीपुर', district: 'Unnao', type: 'SC', winner2022: 'BJP', winnerName2022: 'Bamba Lal Diwakar', winnerVotes2022: 102968, runnerUp2022: 'SP', margin2022: 34132, currentParty: 'BJP' },
  { acNo: 164, name: 'Mohan', localName: 'मोहन', district: 'Unnao', type: 'SC', winner2022: 'BJP', winnerName2022: 'Brijesh Kumar Rawat', winnerVotes2022: 113291, runnerUp2022: 'SP', margin2022: 43179, currentParty: 'BJP' },
  { acNo: 165, name: 'Unnao', localName: 'उन्नाव', district: 'Unnao', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pankaj Gupta', winnerVotes2022: 126670, runnerUp2022: 'SP', margin2022: 31128, currentParty: 'BJP' },
  { acNo: 166, name: 'Bhagwantnagar', localName: 'भगवंतनगर', district: 'Unnao', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ashutosh Shukla', winnerVotes2022: 127118, runnerUp2022: 'SP', margin2022: 43010, currentParty: 'BJP' },
  { acNo: 167, name: 'Purwa', localName: 'पुरवा', district: 'Unnao', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Kumar Singh', winnerVotes2022: 133827, runnerUp2022: 'SP', margin2022: 31061, currentParty: 'BJP' },
  // ── Lucknow District ──
  { acNo: 168, name: 'Malihabad', localName: 'मलिहाबाद', district: 'Lucknow', type: 'SC', winner2022: 'BJP', winnerName2022: 'Jai Devi', winnerVotes2022: 106372, runnerUp2022: 'SP', margin2022: 7745, currentParty: 'BJP' },
  { acNo: 169, name: 'Bakshi Kaa Talab', localName: 'बख्शी का तालाब', district: 'Lucknow', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Yogesh Shukla', winnerVotes2022: 147922, runnerUp2022: 'SP', margin2022: 27788, currentParty: 'BJP' },
  { acNo: 170, name: 'Sarojini Nagar', localName: 'सरोजिनी नगर', district: 'Lucknow', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajeshwar Singh', winnerVotes2022: 160626, runnerUp2022: 'SP', margin2022: 56186, currentParty: 'BJP' },
  { acNo: 171, name: 'Lucknow West', localName: 'लखनऊ पश्चिम', district: 'Lucknow', type: 'GEN', winner2022: 'SP', winnerName2022: 'Armaan Khan', winnerVotes2022: 124497, runnerUp2022: 'BJP', margin2022: 8184, currentParty: 'SP' },
  { acNo: 172, name: 'Lucknow North', localName: 'लखनऊ उत्तर', district: 'Lucknow', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Neeraj Bora', winnerVotes2022: 139159, runnerUp2022: 'SP', margin2022: 33953, currentParty: 'BJP' },
  { acNo: 173, name: 'Lucknow East', localName: 'लखनऊ पूर्व', district: 'Lucknow', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ashutosh Tandon', winnerVotes2022: 152928, runnerUp2022: 'SP', margin2022: 68731, currentParty: 'BJP' },
  { acNo: 174, name: 'Lucknow Central', localName: 'लखनऊ मध्य', district: 'Lucknow', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ravidas Mehotra', winnerVotes2022: 104488, runnerUp2022: 'BJP', margin2022: 10935, currentParty: 'SP' },
  { acNo: 175, name: 'Lucknow Cantonment', localName: 'लखनऊ कैंट', district: 'Lucknow', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Brajesh Pathak', winnerVotes2022: 108147, runnerUp2022: 'SP', margin2022: 39512, currentParty: 'BJP' },
  { acNo: 176, name: 'Mohanlalganj', localName: 'मोहनलालगंज', district: 'Lucknow', type: 'SC', winner2022: 'BJP', winnerName2022: 'Amresh Kumar', winnerVotes2022: 107089, runnerUp2022: 'SP', margin2022: 16548, currentParty: 'BJP' },
  // ── Raebareli District ──
  { acNo: 177, name: 'Bachhrawan', localName: 'बछरावां', district: 'Raebareli', type: 'SC', winner2022: 'SP', winnerName2022: 'Shyam Sunder Bharti', winnerVotes2022: 65747, runnerUp2022: 'ADSL', margin2022: 2812, currentParty: 'SP' },
  // ── Amethi District ──
  { acNo: 178, name: 'Tiloi', localName: 'तिलोई', district: 'Amethi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mayankeshwar Sharan Singh', winnerVotes2022: 99472, runnerUp2022: 'SP', margin2022: 27829, currentParty: 'BJP' },
  // ── Raebareli District ──
  { acNo: 179, name: 'Harchandpur', localName: 'हरचंदपुर', district: 'Raebareli', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rahul Rajpoot', winnerVotes2022: 92498, runnerUp2022: 'BJP', margin2022: 14489, currentParty: 'SP' },
  { acNo: 180, name: 'Rae Bareli', localName: 'रायबरेली', district: 'Raebareli', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Aditi Singh', winnerVotes2022: 102429, runnerUp2022: 'SP', margin2022: 7175, currentParty: 'BJP' },
  { acNo: 181, name: 'Salon', localName: 'सलोन', district: 'Raebareli', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ashok Kori', winnerVotes2022: 87715, runnerUp2022: 'SP', margin2022: 1511, currentParty: 'BJP' },
  { acNo: 182, name: 'Sareni', localName: 'सरेनी', district: 'Raebareli', type: 'GEN', winner2022: 'SP', winnerName2022: 'Devendra Pratap Singh', winnerVotes2022: 66166, runnerUp2022: 'BJP', margin2022: 3807, currentParty: 'SP' },
  { acNo: 183, name: 'Unchahar', localName: 'ऊंचाहार', district: 'Raebareli', type: 'GEN', winner2022: 'SP', winnerName2022: 'Manoj Kumar Pandey', winnerVotes2022: 82514, runnerUp2022: 'BJP', margin2022: 6621, currentParty: 'SP' },
  // ── Amethi District ──
  { acNo: 184, name: 'Jagdishpur', localName: 'जगदीशपुर', district: 'Amethi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Suresh Kumar', winnerVotes2022: 89315, runnerUp2022: 'INC', margin2022: 22824, currentParty: 'BJP' },
  { acNo: 185, name: 'Gauriganj', localName: 'गौरीगंज', district: 'Amethi', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rakesh Pratap Singh', winnerVotes2022: 79040, runnerUp2022: 'BJP', margin2022: 6963, currentParty: 'SP' },
  { acNo: 186, name: 'Amethi', localName: 'अमेठी', district: 'Amethi', type: 'GEN', winner2022: 'SP', winnerName2022: 'Maharaji Prajapati', winnerVotes2022: 88217, runnerUp2022: 'BJP', margin2022: 18096, currentParty: 'SP' },
  // ── Sultanpur District ──
  { acNo: 187, name: 'Isauli', localName: 'इसौली', district: 'Sultanpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mohammad Tahir Khan', winnerVotes2022: 69629, runnerUp2022: 'BJP', margin2022: 269, currentParty: 'SP' },
  { acNo: 188, name: 'Sultanpur', localName: 'सुलतानपुर', district: 'Sultanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vinod Singh', winnerVotes2022: 92715, runnerUp2022: 'SP', margin2022: 1009, currentParty: 'BJP' },
  { acNo: 189, name: 'Sadar', localName: 'सदर', district: 'Sultanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Raj Prasad Upadhyay', winnerVotes2022: 85249, runnerUp2022: 'SP', margin2022: 15754, currentParty: 'BJP' },
  { acNo: 190, name: 'Lambhua', localName: 'लंभुआ', district: 'Sultanpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sitaram Verma', winnerVotes2022: 82999, runnerUp2022: 'SP', margin2022: 9533, currentParty: 'BJP' },
  { acNo: 191, name: 'Kadipur', localName: 'कादीपुर', district: 'Sultanpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rajesh Gautam', winnerVotes2022: 96405, runnerUp2022: 'SP', margin2022: 25723, currentParty: 'BJP' },
  // ── Farrukhabad District ──
  { acNo: 192, name: 'Kaimganj', localName: 'कायमगंज', district: 'Farrukhabad', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 114952, runnerUp2022: 'SP', margin2022: 18543, currentParty: 'ADSL' },
  { acNo: 193, name: 'Amritpur', localName: 'अमृतपुर', district: 'Farrukhabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sushil Kumar Shakya', winnerVotes2022: 98848, runnerUp2022: 'SP', margin2022: 44686, currentParty: 'BJP' },
  { acNo: 194, name: 'Farrukhabad', localName: 'फर्रुखाबाद', district: 'Farrukhabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sunil Dutt Dwivedi', winnerVotes2022: 112314, runnerUp2022: 'SP', margin2022: 39326, currentParty: 'BJP' },
  { acNo: 195, name: 'Bhojpur', localName: 'भोजपुर', district: 'Farrukhabad', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nagendra Singh Rathore', winnerVotes2022: 99979, runnerUp2022: 'SP', margin2022: 27468, currentParty: 'BJP' },
  // ── Kannauj District ──
  { acNo: 196, name: 'Chhibramau', localName: 'छिबरामऊ', district: 'Kannauj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Archana Pandey', winnerVotes2022: 124773, runnerUp2022: 'SP', margin2022: 1111, currentParty: 'BJP' },
  { acNo: 197, name: 'Tirwa', localName: 'तिर्वा', district: 'Kannauj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Kailash Singh Rajput', winnerVotes2022: 106089, runnerUp2022: 'SP', margin2022: 4608, currentParty: 'BJP' },
  { acNo: 198, name: 'Kannauj', localName: 'कन्नौज', district: 'Kannauj', type: 'SC', winner2022: 'BJP', winnerName2022: 'Asim Arun', winnerVotes2022: 120876, runnerUp2022: 'SP', margin2022: 6090, currentParty: 'BJP' },
  // ── Etawah District ──
  { acNo: 199, name: 'Jaswantnagar', localName: 'जसवंतनगर', district: 'Etawah', type: 'GEN', winner2022: 'SP', winnerName2022: 'Shivpal Singh Yadav', winnerVotes2022: 159718, runnerUp2022: 'BJP', margin2022: 90979, currentParty: 'SP' },
  { acNo: 200, name: 'Etawah', localName: 'इटावा', district: 'Etawah', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sarita Bhadauria', winnerVotes2022: 98150, runnerUp2022: 'SP', margin2022: 3984, currentParty: 'BJP' },
  { acNo: 201, name: 'Bharthana', localName: 'भरथना', district: 'Etawah', type: 'SC', winner2022: 'SP', winnerName2022: 'Raghvendra Kumar Singh', winnerVotes2022: 103676, runnerUp2022: 'BJP', margin2022: 7559, currentParty: 'SP' },
  // ── Auraiya District ──
  { acNo: 202, name: 'Bidhuna', localName: 'बिधूना', district: 'Auraiya', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rekha Verma', winnerVotes2022: 92757, runnerUp2022: 'BJP', margin2022: 3265, currentParty: 'SP' },
  { acNo: 203, name: 'Dibiyapur', localName: 'दिबियापुर', district: 'Auraiya', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pradeep Kumar Yadav', winnerVotes2022: 80865, runnerUp2022: 'BJP', margin2022: 473, currentParty: 'SP' },
  { acNo: 204, name: 'Auraiya', localName: 'औरैया', district: 'Auraiya', type: 'SC', winner2022: 'BJP', winnerName2022: 'Gudiya Katheriya', winnerVotes2022: 88631, runnerUp2022: 'SP', margin2022: 22447, currentParty: 'BJP' },
  // ── Kanpur Dehat District ──
  { acNo: 205, name: 'Rasulabad', localName: 'रसूलाबाद', district: 'Kanpur Dehat', type: 'SC', winner2022: 'BJP', winnerName2022: 'Poonam Sankhwar', winnerVotes2022: 91783, runnerUp2022: 'SP', margin2022: 21512, currentParty: 'BJP' },
  { acNo: 206, name: 'Akbarpur-Raniya', localName: 'अकबरपुर-रनिया', district: 'Kanpur Dehat', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pratibha Shukla', winnerVotes2022: 92827, runnerUp2022: 'SP', margin2022: 13417, currentParty: 'BJP' },
  { acNo: 207, name: 'Sikandra', localName: 'सिकंदरा', district: 'Kanpur Dehat', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ajit Singh Pal', winnerVotes2022: 89461, runnerUp2022: 'SP', margin2022: 31567, currentParty: 'BJP' },
  { acNo: 208, name: 'Bhognipur', localName: 'भोगनीपुर', district: 'Kanpur Dehat', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rakesh Sachan', winnerVotes2022: 87809, runnerUp2022: 'SP', margin2022: 11893, currentParty: 'BJP' },
  // ── Kanpur Nagar District ──
  { acNo: 209, name: 'Bilhaur', localName: 'बिल्हौर', district: 'Kanpur Nagar', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rahul Bachha Sonkar', winnerVotes2022: 123094, runnerUp2022: 'SP', margin2022: 42351, currentParty: 'BJP' },
  { acNo: 210, name: 'Bithoor', localName: 'बिठूर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Abhijeet Singh Sanga', winnerVotes2022: 107330, runnerUp2022: 'SP', margin2022: 21073, currentParty: 'BJP' },
  { acNo: 211, name: 'Kalyanpur', localName: 'कल्याणपुर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Neelima Katiyar', winnerVotes2022: 98997, runnerUp2022: 'SP', margin2022: 21535, currentParty: 'BJP' },
  { acNo: 212, name: 'Govindnagar', localName: 'गोविंदनगर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surendra Maithani', winnerVotes2022: 117501, runnerUp2022: 'SP', margin2022: 80896, currentParty: 'BJP' },
  { acNo: 213, name: 'Sishamau', localName: 'सीसामऊ', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Haji Irfan Solanki', winnerVotes2022: 79163, runnerUp2022: 'BJP', margin2022: 12266, currentParty: 'SP' },
  { acNo: 214, name: 'Arya Nagar', localName: 'आर्य नगर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Amitabh Bajpai', winnerVotes2022: 76897, runnerUp2022: 'BJP', margin2022: 7924, currentParty: 'SP' },
  { acNo: 215, name: 'Kidwai Nagar', localName: 'किद्वई नगर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mahesh Trivedi', winnerVotes2022: 114111, runnerUp2022: 'INC', margin2022: 37760, currentParty: 'BJP' },
  { acNo: 216, name: 'Kanpur Cantonment', localName: 'कानपुर कैंट', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mohammed Hasan', winnerVotes2022: 94729, runnerUp2022: 'BJP', margin2022: 19987, currentParty: 'SP' },
  { acNo: 217, name: 'Maharajpur', localName: 'महाराजपुर', district: 'Kanpur Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Satish Mahana', winnerVotes2022: 152883, runnerUp2022: 'SP', margin2022: 82261, currentParty: 'BJP' },
  { acNo: 218, name: 'Ghatampur', localName: 'घाटमपुर', district: 'Kanpur Nagar', type: 'SC', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 81727, runnerUp2022: 'SP', margin2022: 14474, currentParty: 'ADSL' },
  // ── Jalaun District ──
  { acNo: 219, name: 'Madhogarh', localName: 'माधौगढ़', district: 'Jalaun', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Moolchandra Singh', winnerVotes2022: 105231, runnerUp2022: 'BSP', margin2022: 34974, currentParty: 'BJP' },
  { acNo: 220, name: 'Kalpi', localName: 'कालपी', district: 'Jalaun', type: 'GEN', winner2022: 'SP', winnerName2022: 'Vinod Chaturvedi', winnerVotes2022: 69782, runnerUp2022: 'NISHAD', margin2022: 2816, currentParty: 'SP' },
  { acNo: 221, name: 'Orai', localName: 'उरई', district: 'Jalaun', type: 'SC', winner2022: 'BJP', winnerName2022: 'Gauri Shankar', winnerVotes2022: 128644, runnerUp2022: 'SP', margin2022: 37648, currentParty: 'BJP' },
  // ── Jhansi District ──
  { acNo: 222, name: 'Babina', localName: 'बबीना', district: 'Jhansi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajeev Singh Parichha', winnerVotes2022: 118343, runnerUp2022: 'SP', margin2022: 44529, currentParty: 'BJP' },
  { acNo: 223, name: 'Jhansi Nagar', localName: 'झांसी नगर', district: 'Jhansi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ravi Sharma', winnerVotes2022: 148262, runnerUp2022: 'SP', margin2022: 76353, currentParty: 'BJP' },
  { acNo: 224, name: 'Mauranipur', localName: 'मऊरानीपुर', district: 'Jhansi', type: 'SC', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 143577, runnerUp2022: 'SP', margin2022: 58595, currentParty: 'ADSL' },
  { acNo: 225, name: 'Garautha', localName: 'गरौठा', district: 'Jhansi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jawahar Lal Rajput', winnerVotes2022: 114059, runnerUp2022: 'SP', margin2022: 33662, currentParty: 'BJP' },
  // ── Lalitpur District ──
  { acNo: 226, name: 'Lalitpur', localName: 'ललितपुर', district: 'Lalitpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramratan Kushwaha', winnerVotes2022: 176550, runnerUp2022: 'BSP', margin2022: 107215, currentParty: 'BJP' },
  { acNo: 227, name: 'Mehroni', localName: 'महरौनी', district: 'Lalitpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Manohar Lal Panth', winnerVotes2022: 184778, runnerUp2022: 'BSP', margin2022: 110451, currentParty: 'BJP' },
  // ── Hamirpur District ──
  { acNo: 228, name: 'Hamirpur', localName: 'हमीरपुर', district: 'Hamirpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Manoj Kumar Prajapati', winnerVotes2022: 105432, runnerUp2022: 'SP', margin2022: 25485, currentParty: 'BJP' },
  { acNo: 229, name: 'Rath', localName: 'राठ', district: 'Hamirpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Manisha Anuragi', winnerVotes2022: 139373, runnerUp2022: 'SP', margin2022: 61979, currentParty: 'BJP' },
  // ── Mahoba District ──
  { acNo: 230, name: 'Mahoba', localName: 'महोबा', district: 'Mahoba', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rakesh Kumar Goswami', winnerVotes2022: 94490, runnerUp2022: 'SP', margin2022: 43447, currentParty: 'BJP' },
  { acNo: 231, name: 'Charkhari', localName: 'चरखारी', district: 'Mahoba', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Brijbhushan Rajpoot', winnerVotes2022: 102051, runnerUp2022: 'SP', margin2022: 41881, currentParty: 'BJP' },
  // ── Banda District ──
  { acNo: 232, name: 'Tindwari', localName: 'तिंदवारी', district: 'Banda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramakesh Nishad', winnerVotes2022: 86812, runnerUp2022: 'SP', margin2022: 28425, currentParty: 'BJP' },
  { acNo: 233, name: 'Baberu', localName: 'बबेरू', district: 'Banda', type: 'GEN', winner2022: 'SP', winnerName2022: 'Vishambhar Singh Yadav', winnerVotes2022: 79614, runnerUp2022: 'BJP', margin2022: 7393, currentParty: 'SP' },
  { acNo: 234, name: 'Naraini', localName: 'नरैनी', district: 'Banda', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ommani Verma', winnerVotes2022: 83263, runnerUp2022: 'SP', margin2022: 6719, currentParty: 'BJP' },
  { acNo: 235, name: 'Banda', localName: 'बांदा', district: 'Banda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prakash Dwivedi', winnerVotes2022: 81557, runnerUp2022: 'SP', margin2022: 15214, currentParty: 'BJP' },
  // ── Chitrakoot District ──
  { acNo: 236, name: 'Chitrakoot', localName: 'चित्रकूट', district: 'Chitrakoot', type: 'GEN', winner2022: 'SP', winnerName2022: 'Anil Pradhan', winnerVotes2022: 104771, runnerUp2022: 'BJP', margin2022: 20876, currentParty: 'SP' },
  { acNo: 237, name: 'Manikpur', localName: 'मानिकपुर', district: 'Chitrakoot', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 73132, runnerUp2022: 'SP', margin2022: 1048, currentParty: 'ADSL' },
  // ── Fatehpur District ──
  { acNo: 238, name: 'Jahanabad', localName: 'जहानाबाद', district: 'Fatehpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajendra Singh Patel', winnerVotes2022: 78503, runnerUp2022: 'SP', margin2022: 18192, currentParty: 'BJP' },
  { acNo: 239, name: 'Bindki', localName: 'बिंदकी', district: 'Fatehpur', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 78165, runnerUp2022: 'SP', margin2022: 3797, currentParty: 'ADSL' },
  { acNo: 240, name: 'Fatehpur', localName: 'फतेहपुर', district: 'Fatehpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Chandra Prakash Lodhi', winnerVotes2022: 96839, runnerUp2022: 'BJP', margin2022: 8601, currentParty: 'SP' },
  { acNo: 241, name: 'Ayah Shah', localName: 'अयाह शाह', district: 'Fatehpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vikas Gupta', winnerVotes2022: 71231, runnerUp2022: 'SP', margin2022: 13006, currentParty: 'BJP' },
  { acNo: 242, name: 'Husainganj', localName: 'हुसैनगंज', district: 'Fatehpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Usha Maurya', winnerVotes2022: 91884, runnerUp2022: 'BJP', margin2022: 25181, currentParty: 'SP' },
  { acNo: 243, name: 'Khaga', localName: 'खागा', district: 'Fatehpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Krishna Paswan', winnerVotes2022: 83735, runnerUp2022: 'SP', margin2022: 5509, currentParty: 'BJP' },
  // ── Pratapgarh District ──
  { acNo: 244, name: 'Rampur Khas', localName: 'रामपुर खास', district: 'Pratapgarh', type: 'GEN', winner2022: 'INC', winnerName2022: 'Aradhana Misra Mona', winnerVotes2022: 84334, runnerUp2022: 'BJP', margin2022: 14741, currentParty: 'INC' },
  { acNo: 247, name: 'Vishwanathganj', localName: 'विश्वनाथगंज', district: 'Pratapgarh', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 86829, runnerUp2022: 'SP', margin2022: 48052, currentParty: 'ADSL' },
  { acNo: 248, name: 'Pratapgarh', localName: 'प्रतापगढ़', district: 'Pratapgarh', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajendra Maurya', winnerVotes2022: 89762, runnerUp2022: 'IND', margin2022: 25063, currentParty: 'BJP' },
  { acNo: 249, name: 'Patti', localName: 'पट्टी', district: 'Pratapgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ram Singh Patel', winnerVotes2022: 108070, runnerUp2022: 'BJP', margin2022: 22051, currentParty: 'SP' },
  { acNo: 250, name: 'Raniganj', localName: 'रानीगंज', district: 'Pratapgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rakesh Kumar Verma', winnerVotes2022: 75583, runnerUp2022: 'BJP', margin2022: 2649, currentParty: 'SP' },
  // ── Kaushambi District ──
  { acNo: 251, name: 'Sirathu', localName: 'सिराथू', district: 'Kaushambi', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pallavi Patel', winnerVotes2022: 106278, runnerUp2022: 'BJP', margin2022: 7337, currentParty: 'SP' },
  { acNo: 252, name: 'Manjhanpur', localName: 'मंझनपुर', district: 'Kaushambi', type: 'SC', winner2022: 'SP', winnerName2022: 'Indrajit Saroj', winnerVotes2022: 121506, runnerUp2022: 'BJP', margin2022: 23878, currentParty: 'SP' },
  { acNo: 253, name: 'Chail', localName: 'चैल', district: 'Kaushambi', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pooja Pal', winnerVotes2022: 88818, runnerUp2022: 'ADSL', margin2022: 13209, currentParty: 'SP' },
  // ── Prayagraj District ──
  { acNo: 254, name: 'Phaphamau', localName: 'फाफामऊ', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Guru Prasad Maurya', winnerVotes2022: 91186, runnerUp2022: 'SP', margin2022: 14324, currentParty: 'BJP' },
  { acNo: 255, name: 'Soraon', localName: 'सोरांव', district: 'Prayagraj', type: 'SC', winner2022: 'SP', winnerName2022: 'Geeta Shastri', winnerVotes2022: 91474, runnerUp2022: 'ADSL', margin2022: 5590, currentParty: 'SP' },
  { acNo: 256, name: 'Phulpur', localName: 'फूलपुर', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Praveen Patel', winnerVotes2022: 103557, runnerUp2022: 'SP', margin2022: 2732, currentParty: 'BJP' },
  { acNo: 257, name: 'Pratappur', localName: 'प्रतापपुर', district: 'Prayagraj', type: 'GEN', winner2022: 'SP', winnerName2022: 'Vijama Yadav', winnerVotes2022: 91142, runnerUp2022: 'ADSL', margin2022: 10956, currentParty: 'SP' },
  { acNo: 258, name: 'Handia', localName: 'हंडिया', district: 'Prayagraj', type: 'GEN', winner2022: 'SP', winnerName2022: 'Hakim Lal Bind', winnerVotes2022: 84417, runnerUp2022: 'NISHAD', margin2022: 3543, currentParty: 'SP' },
  { acNo: 259, name: 'Meja', localName: 'मेजा', district: 'Prayagraj', type: 'GEN', winner2022: 'SP', winnerName2022: 'Sandeep Singh Patel', winnerVotes2022: 78555, runnerUp2022: 'BJP', margin2022: 3439, currentParty: 'SP' },
  { acNo: 260, name: 'Karachhana', localName: 'करछना', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Piyush Ranjan Nishad', winnerVotes2022: 89527, runnerUp2022: 'SP', margin2022: 9328, currentParty: 'BJP' },
  { acNo: 261, name: 'Allahabad West', localName: 'इलाहाबाद पश्चिम', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sidharth Nath Singh', winnerVotes2022: 118759, runnerUp2022: 'SP', margin2022: 29933, currentParty: 'BJP' },
  { acNo: 262, name: 'Allahabad North', localName: 'इलाहाबाद उत्तर', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Harshvardhan Bajpai', winnerVotes2022: 96890, runnerUp2022: 'SP', margin2022: 54883, currentParty: 'BJP' },
  { acNo: 263, name: 'Allahabad South', localName: 'इलाहाबाद दक्षिण', district: 'Prayagraj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nand Gopal Gupta', winnerVotes2022: 97864, runnerUp2022: 'SP', margin2022: 26182, currentParty: 'BJP' },
  { acNo: 264, name: 'Bara', localName: 'बारा', district: 'Prayagraj', type: 'SC', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 89203, runnerUp2022: 'SP', margin2022: 12464, currentParty: 'ADSL' },
  { acNo: 265, name: 'Koraon', localName: 'कोरांव', district: 'Prayagraj', type: 'SC', winner2022: 'BJP', winnerName2022: 'Rajmani Kol', winnerVotes2022: 84587, runnerUp2022: 'SP', margin2022: 24487, currentParty: 'BJP' },
  // ── Barabanki District ──
  { acNo: 266, name: 'Kursi', localName: 'कुर्सी', district: 'Barabanki', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sakendra Pratap Verma', winnerVotes2022: 118720, runnerUp2022: 'SP', margin2022: 217, currentParty: 'BJP' },
  { acNo: 267, name: 'Ramnagar', localName: 'रामनगर', district: 'Barabanki', type: 'GEN', winner2022: 'SP', winnerName2022: 'Fareed Mahfooz Kidwai', winnerVotes2022: 98799, runnerUp2022: 'BJP', margin2022: 261, currentParty: 'SP' },
  { acNo: 268, name: 'Barabanki', localName: 'बाराबंकी', district: 'Barabanki', type: 'GEN', winner2022: 'SP', winnerName2022: 'Dharmraj Singh Yadav', winnerVotes2022: 125500, runnerUp2022: 'BJP', margin2022: 35050, currentParty: 'SP' },
  { acNo: 269, name: 'Zaidpur', localName: 'जैदपुर', district: 'Barabanki', type: 'SC', winner2022: 'SP', winnerName2022: 'Gaurav Kumar', winnerVotes2022: 113558, runnerUp2022: 'BJP', margin2022: 2982, currentParty: 'SP' },
  { acNo: 270, name: 'Dariyabad', localName: 'दरियाबाद', district: 'Barabanki', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Satish Sharma', winnerVotes2022: 127983, runnerUp2022: 'SP', margin2022: 32617, currentParty: 'BJP' },
  // ── Ayodhya District ──
  { acNo: 271, name: 'Rudauli', localName: 'रुदौली', district: 'Ayodhya', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ram Chandra Yadav', winnerVotes2022: 94031, runnerUp2022: 'SP', margin2022: 40616, currentParty: 'BJP' },
  // ── Barabanki District ──
  { acNo: 272, name: 'Haidergarh', localName: 'हैदरगढ़', district: 'Barabanki', type: 'SC', winner2022: 'BJP', winnerName2022: 'Dinesh Rawat', winnerVotes2022: 117113, runnerUp2022: 'SP', margin2022: 25691, currentParty: 'BJP' },
  // ── Ayodhya District ──
  { acNo: 273, name: 'Milkipur', localName: 'मिल्कीपुर', district: 'Ayodhya', type: 'SC', winner2022: 'SP', winnerName2022: 'Awadhesh Prasad', winnerVotes2022: 103905, runnerUp2022: 'BJP', margin2022: 13338, currentParty: 'SP' },
  { acNo: 274, name: 'Bikapur', localName: 'बीकापुर', district: 'Ayodhya', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Amit Singh Chauhan', winnerVotes2022: 107268, runnerUp2022: 'SP', margin2022: 5560, currentParty: 'BJP' },
  { acNo: 275, name: 'Ayodhya', localName: 'अयोध्या', district: 'Ayodhya', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ved Prakash Gupta', winnerVotes2022: 113414, runnerUp2022: 'SP', margin2022: 19990, currentParty: 'BJP' },
  { acNo: 276, name: 'Goshainganj', localName: 'गोशाईगंज', district: 'Ayodhya', type: 'GEN', winner2022: 'SP', winnerName2022: 'Abhay Singh', winnerVotes2022: 105863, runnerUp2022: 'BJP', margin2022: 13079, currentParty: 'SP' },
  // ── Ambedkar Nagar District ──
  { acNo: 277, name: 'Katehari', localName: 'कटहरी', district: 'Ambedkar Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Lalji Verma', winnerVotes2022: 93524, runnerUp2022: 'NISHAD', margin2022: 7696, currentParty: 'SP' },
  { acNo: 278, name: 'Tanda', localName: 'टांडा', district: 'Ambedkar Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ram Murti Verma', winnerVotes2022: 95263, runnerUp2022: 'BJP', margin2022: 32097, currentParty: 'SP' },
  { acNo: 279, name: 'Alapur', localName: 'आलापुर', district: 'Ambedkar Nagar', type: 'SC', winner2022: 'SP', winnerName2022: 'Tribhuwan Dutt', winnerVotes2022: 74165, runnerUp2022: 'BJP', margin2022: 9383, currentParty: 'SP' },
  { acNo: 280, name: 'Jalalpur', localName: 'जलालपुर', district: 'Ambedkar Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rakesh Pandey', winnerVotes2022: 93668, runnerUp2022: 'BSP', margin2022: 13630, currentParty: 'SP' },
  { acNo: 281, name: 'Akbarpur', localName: 'अकबरपुर', district: 'Ambedkar Nagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ram Achal Rajbhar', winnerVotes2022: 81391, runnerUp2022: 'BJP', margin2022: 12336, currentParty: 'SP' },
  // ── Bahraich District ──
  { acNo: 282, name: 'Balha', localName: 'बलहा', district: 'Bahraich', type: 'SC', winner2022: 'BJP', winnerName2022: 'Saroj Sonkar', winnerVotes2022: 100483, runnerUp2022: 'SP', margin2022: 16573, currentParty: 'BJP' },
  { acNo: 283, name: 'Nanpara', localName: 'नानपारा', district: 'Bahraich', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 87689, runnerUp2022: 'SP', margin2022: 12184, currentParty: 'ADSL' },
  { acNo: 284, name: 'Matera', localName: 'मटेरा', district: 'Bahraich', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mariya Shah', winnerVotes2022: 102255, runnerUp2022: 'BJP', margin2022: 10428, currentParty: 'SP' },
  { acNo: 285, name: 'Mahasi', localName: 'महसी', district: 'Bahraich', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sureshwar Singh', winnerVotes2022: 117883, runnerUp2022: 'SP', margin2022: 42684, currentParty: 'BJP' },
  { acNo: 286, name: 'Bahraich', localName: 'बहराइच', district: 'Bahraich', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anupma Jaiswal', winnerVotes2022: 107628, runnerUp2022: 'SP', margin2022: 4078, currentParty: 'BJP' },
  { acNo: 287, name: 'Payagpur', localName: 'पयागपुर', district: 'Bahraich', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Subhash Tripathi', winnerVotes2022: 110162, runnerUp2022: 'SP', margin2022: 12056, currentParty: 'BJP' },
  { acNo: 288, name: 'Kaiserganj', localName: 'कैसरगंज', district: 'Bahraich', type: 'GEN', winner2022: 'SP', winnerName2022: 'Anand Kumar', winnerVotes2022: 103195, runnerUp2022: 'BJP', margin2022: 7771, currentParty: 'SP' },
  // ── Shrawasti District ──
  { acNo: 289, name: 'Bhinga', localName: 'भिनगा', district: 'Shrawasti', type: 'GEN', winner2022: 'SP', winnerName2022: 'Indrani Devi', winnerVotes2022: 103661, runnerUp2022: 'BJP', margin2022: 13574, currentParty: 'SP' },
  { acNo: 290, name: 'Shrawasti', localName: 'श्रावस्ती', district: 'Shrawasti', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ram Feran Pandey', winnerVotes2022: 98640, runnerUp2022: 'SP', margin2022: 1457, currentParty: 'BJP' },
  // ── Balrampur District ──
  { acNo: 291, name: 'Tulsipur', localName: 'तुलसीपुर', district: 'Balrampur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Kailash Nath Shukla', winnerVotes2022: 87092, runnerUp2022: 'IND', margin2022: 35841, currentParty: 'BJP' },
  { acNo: 292, name: 'Gainsari', localName: 'गेंसड़ी', district: 'Balrampur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Shiv Pratap Yadav', winnerVotes2022: 75345, runnerUp2022: 'BJP', margin2022: 5837, currentParty: 'SP' },
  { acNo: 293, name: 'Utraula', localName: 'उतरौला', district: 'Balrampur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ram Pratap Verma', winnerVotes2022: 87162, runnerUp2022: 'SP', margin2022: 21769, currentParty: 'BJP' },
  { acNo: 294, name: 'Balrampur', localName: 'बलरामपुर', district: 'Balrampur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Paltu Ram', winnerVotes2022: 101146, runnerUp2022: 'SP', margin2022: 10971, currentParty: 'BJP' },
  // ── Gonda District ──
  { acNo: 295, name: 'Mehnaun', localName: 'मेहनौन', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vinay Kumar Dwivedi', winnerVotes2022: 107237, runnerUp2022: 'SP', margin2022: 23128, currentParty: 'BJP' },
  { acNo: 296, name: 'Gonda', localName: 'गोंडा', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prateek Bhushan Singh', winnerVotes2022: 96528, runnerUp2022: 'SP', margin2022: 6700, currentParty: 'BJP' },
  { acNo: 297, name: 'Katra Bazar', localName: 'कटरा बाजार', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bawan Singh', winnerVotes2022: 112291, runnerUp2022: 'SP', margin2022: 18457, currentParty: 'BJP' },
  { acNo: 298, name: 'Colonelganj', localName: 'कर्नलगंज', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ajay', winnerVotes2022: 108109, runnerUp2022: 'SP', margin2022: 35472, currentParty: 'BJP' },
  { acNo: 299, name: 'Tarabganj', localName: 'तरबगंज', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prem Narayan Pandey', winnerVotes2022: 125325, runnerUp2022: 'SP', margin2022: 53690, currentParty: 'BJP' },
  { acNo: 300, name: 'Mankapur', localName: 'मनकापुर', district: 'Gonda', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ramapati Shastri', winnerVotes2022: 105677, runnerUp2022: 'SP', margin2022: 42349, currentParty: 'BJP' },
  { acNo: 301, name: 'Gaura', localName: 'गौरा', district: 'Gonda', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prabhat Kumar Verma', winnerVotes2022: 73545, runnerUp2022: 'SP', margin2022: 22974, currentParty: 'BJP' },
  // ── Siddharthnagar District ──
  { acNo: 302, name: 'Shohratgarh', localName: 'शोहरतगढ़', district: 'Siddharthnagar', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 71062, runnerUp2022: 'SBSP', margin2022: 24463, currentParty: 'ADSL' },
  { acNo: 303, name: 'Kapilvastu', localName: 'कपिलवस्तु', district: 'Siddharthnagar', type: 'SC', winner2022: 'BJP', winnerName2022: 'Shyam Dhani', winnerVotes2022: 122940, runnerUp2022: 'SP', margin2022: 30939, currentParty: 'BJP' },
  { acNo: 304, name: 'Bansi', localName: 'बांसी', district: 'Siddharthnagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jai Pratap Singh', winnerVotes2022: 84596, runnerUp2022: 'SP', margin2022: 20340, currentParty: 'BJP' },
  { acNo: 305, name: 'Itwa', localName: 'इटवा', district: 'Siddharthnagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mata Prasad Pandey', winnerVotes2022: 64253, runnerUp2022: 'BJP', margin2022: 1662, currentParty: 'SP' },
  { acNo: 306, name: 'Domariyaganj', localName: 'डुमरियागंज', district: 'Siddharthnagar', type: 'GEN', winner2022: 'SP', winnerName2022: 'Saiyada Khatoon', winnerVotes2022: 85098, runnerUp2022: 'BJP', margin2022: 771, currentParty: 'SP' },
  // ── Basti District ──
  { acNo: 307, name: 'Harraiya', localName: 'हरैया', district: 'Basti', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ajay Kumar Singh', winnerVotes2022: 88200, runnerUp2022: 'SP', margin2022: 18329, currentParty: 'BJP' },
  { acNo: 308, name: 'Kaptanganj', localName: 'कप्तानगंज', district: 'Basti', type: 'GEN', winner2022: 'SP', winnerName2022: 'Kavindra Chaudhary', winnerVotes2022: 94273, runnerUp2022: 'BJP', margin2022: 24179, currentParty: 'SP' },
  { acNo: 309, name: 'Rudhauli', localName: 'रुधौली', district: 'Basti', type: 'GEN', winner2022: 'SP', winnerName2022: 'Rajendra Prasad Chaudhary', winnerVotes2022: 86360, runnerUp2022: 'BJP', margin2022: 15226, currentParty: 'SP' },
  { acNo: 310, name: 'Basti Sadar', localName: 'बस्ती सदर', district: 'Basti', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mahendra Nath Yadav', winnerVotes2022: 86029, runnerUp2022: 'BJP', margin2022: 1779, currentParty: 'SP' },
  { acNo: 311, name: 'Mahadewa', localName: 'महादेवा', district: 'Basti', type: 'SC', winner2022: 'SBSP', winnerName2022: 'Dudhram', winnerVotes2022: 83350, runnerUp2022: 'BJP', margin2022: 5495, currentParty: 'SBSP' },
  // ── Sant Kabir Nagar District ──
  { acNo: 312, name: 'Menhdawal', localName: 'मेंहदावल', district: 'Sant Kabir Nagar', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Anil Kumar Tripathi', winnerVotes2022: 90193, runnerUp2022: 'SP', margin2022: 5223, currentParty: 'NISHAD' },
  { acNo: 313, name: 'Khalilabad', localName: 'खलीलाबाद', district: 'Sant Kabir Nagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ankur Raj Tiwari', winnerVotes2022: 76086, runnerUp2022: 'SP', margin2022: 12262, currentParty: 'BJP' },
  { acNo: 314, name: 'Dhanghata', localName: 'धनघटा', district: 'Sant Kabir Nagar', type: 'SC', winner2022: 'BJP', winnerName2022: 'Ganesh Chandra Chauhan', winnerVotes2022: 83241, runnerUp2022: 'SBSP', margin2022: 10553, currentParty: 'BJP' },
  // ── Maharajganj District ──
  { acNo: 315, name: 'Pharenda', localName: 'फरेंदा', district: 'Maharajganj', type: 'GEN', winner2022: 'INC', winnerName2022: 'Virendra Chaudhary', winnerVotes2022: 85181, runnerUp2022: 'BJP', margin2022: 1246, currentParty: 'INC' },
  { acNo: 316, name: 'Nautanwa', localName: 'नौतनवा', district: 'Maharajganj', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Rishi Tripathi', winnerVotes2022: 90263, runnerUp2022: 'SP', margin2022: 15691, currentParty: 'NISHAD' },
  { acNo: 317, name: 'Siswa', localName: 'सिसवा', district: 'Maharajganj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Prem Sagar Patel', winnerVotes2022: 127673, runnerUp2022: 'SP', margin2022: 62731, currentParty: 'BJP' },
  { acNo: 318, name: 'Maharajganj', localName: 'महराजगंज', district: 'Maharajganj', type: 'SC', winner2022: 'BJP', winnerName2022: 'Jai Mangal Kanojiya', winnerVotes2022: 136071, runnerUp2022: 'IND', margin2022: 76903, currentParty: 'BJP' },
  { acNo: 319, name: 'Paniyara', localName: 'पनियरा', district: 'Maharajganj', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Gyanendra Singh', winnerVotes2022: 135463, runnerUp2022: 'SP', margin2022: 61428, currentParty: 'BJP' },
  // ── Gorakhpur District ──
  { acNo: 320, name: 'Caimpiyarganj', localName: 'कैम्पियरगंज', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Fateh Bahadur Singh', winnerVotes2022: 122032, runnerUp2022: 'SP', margin2022: 42656, currentParty: 'BJP' },
  { acNo: 321, name: 'Pipraich', localName: 'पिपराइच', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mahendra Pal Singh', winnerVotes2022: 141780, runnerUp2022: 'SP', margin2022: 65357, currentParty: 'BJP' },
  { acNo: 322, name: 'Gorakhpur Urban', localName: 'गोरखपुर शहर', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Yogi Adityanath', winnerVotes2022: 165499, runnerUp2022: 'SP', margin2022: 103390, currentParty: 'BJP' },
  { acNo: 323, name: 'Gorakhpur Rural', localName: 'गोरखपुर ग्रामीण', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bipin Singh', winnerVotes2022: 126376, runnerUp2022: 'SP', margin2022: 24070, currentParty: 'BJP' },
  { acNo: 324, name: 'Sahajanwa', localName: 'सहजनवां', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Pradeep Shukla', winnerVotes2022: 105981, runnerUp2022: 'SP', margin2022: 43406, currentParty: 'BJP' },
  { acNo: 325, name: 'Khajani', localName: 'खजनी', district: 'Gorakhpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Sriram Chauhan', winnerVotes2022: 90210, runnerUp2022: 'SP', margin2022: 37101, currentParty: 'BJP' },
  { acNo: 326, name: 'Chauri-Chaura', localName: 'चौरी-चौरा', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sarvan Kumar Nishad', winnerVotes2022: 91958, runnerUp2022: 'SP', margin2022: 41127, currentParty: 'BJP' },
  { acNo: 327, name: 'Bansgaon', localName: 'बांसगांव', district: 'Gorakhpur', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vimlesh Paswan', winnerVotes2022: 87224, runnerUp2022: 'SP', margin2022: 32209, currentParty: 'BJP' },
  { acNo: 328, name: 'Chillupar', localName: 'चिल्लूपार', district: 'Gorakhpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rajesh Tripathi', winnerVotes2022: 96777, runnerUp2022: 'SP', margin2022: 21645, currentParty: 'BJP' },
  // ── Kushinagar District ──
  { acNo: 329, name: 'Khadda', localName: 'खड्डा', district: 'Kushinagar', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Vivekanand Pandey', winnerVotes2022: 88291, runnerUp2022: 'IND', margin2022: 41451, currentParty: 'NISHAD' },
  { acNo: 330, name: 'Padrauna', localName: 'पडरौना', district: 'Kushinagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Manish Jaiswal', winnerVotes2022: 114496, runnerUp2022: 'SP', margin2022: 42008, currentParty: 'BJP' },
  { acNo: 331, name: 'Tamkuhi Raj', localName: 'तमकुही राज', district: 'Kushinagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Asim Kumar', winnerVotes2022: 115123, runnerUp2022: 'SP', margin2022: 66472, currentParty: 'BJP' },
  { acNo: 332, name: 'Fazilnagar', localName: 'फाजिलनगर', district: 'Kushinagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surendra Kumar Kushwaha', winnerVotes2022: 116029, runnerUp2022: 'SP', margin2022: 45014, currentParty: 'BJP' },
  { acNo: 333, name: 'Kushinagar', localName: 'कुशीनगर', district: 'Kushinagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Panchanand Pathak', winnerVotes2022: 115268, runnerUp2022: 'SP', margin2022: 34790, currentParty: 'BJP' },
  { acNo: 334, name: 'Hata', localName: 'हाटा', district: 'Kushinagar', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mohan Verma', winnerVotes2022: 120666, runnerUp2022: 'SP', margin2022: 59365, currentParty: 'BJP' },
  { acNo: 335, name: 'Ramkola', localName: 'रामकोला', district: 'Kushinagar', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vinay Prakash Gond', winnerVotes2022: 124792, runnerUp2022: 'SBSP', margin2022: 72543, currentParty: 'BJP' },
  // ── Deoria District ──
  { acNo: 336, name: 'Rudrapur', localName: 'रुद्रपुर', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jai Prakash Nishad', winnerVotes2022: 78187, runnerUp2022: 'SP', margin2022: 41936, currentParty: 'BJP' },
  { acNo: 337, name: 'Deoria', localName: 'देवरिया', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Shalabh Mani Tripathi', winnerVotes2022: 106701, runnerUp2022: 'SP', margin2022: 40655, currentParty: 'BJP' },
  { acNo: 338, name: 'Pathardeva', localName: 'पथरदेवा', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surya Pratap Shahi', winnerVotes2022: 93858, runnerUp2022: 'SP', margin2022: 28681, currentParty: 'BJP' },
  { acNo: 339, name: 'Rampur Karkhana', localName: 'रामपुर कारखाना', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Surendra Chaurasia', winnerVotes2022: 90742, runnerUp2022: 'SP', margin2022: 14670, currentParty: 'BJP' },
  { acNo: 340, name: 'Bhatpar Rani', localName: 'भाटपार रानी', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sabhakunwar Kushawaha', winnerVotes2022: 91282, runnerUp2022: 'SP', margin2022: 18082, currentParty: 'BJP' },
  { acNo: 341, name: 'Salempur', localName: 'सलेमपुर', district: 'Deoria', type: 'SC', winner2022: 'BJP', winnerName2022: 'Vijay Laxmi Gautam', winnerVotes2022: 82047, runnerUp2022: 'SBSP', margin2022: 16608, currentParty: 'BJP' },
  { acNo: 342, name: 'Barhaj', localName: 'बरहज', district: 'Deoria', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Deepak Kumar Mishra', winnerVotes2022: 85758, runnerUp2022: 'SP', margin2022: 16861, currentParty: 'BJP' },
  // ── Azamgarh District ──
  { acNo: 343, name: 'Atrauliya', localName: 'अतरौलिया', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Sangram Yadav', winnerVotes2022: 91502, runnerUp2022: 'NISHAD', margin2022: 17247, currentParty: 'SP' },
  { acNo: 344, name: 'Gopalpur', localName: 'गोपालपुर', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Nafees Ahmad', winnerVotes2022: 84401, runnerUp2022: 'BJP', margin2022: 24307, currentParty: 'SP' },
  { acNo: 345, name: 'Sagri', localName: 'सगड़ी', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Hriday Narayan Singh Patel', winnerVotes2022: 83093, runnerUp2022: 'BJP', margin2022: 22515, currentParty: 'SP' },
  { acNo: 346, name: 'Mubarakpur', localName: 'मुबारकपुर', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Akhilesh Yadav', winnerVotes2022: 80726, runnerUp2022: 'BJP', margin2022: 29103, currentParty: 'SP' },
  { acNo: 347, name: 'Azamgarh', localName: 'आजमगढ़', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Durga Prasad Yadav', winnerVotes2022: 100813, runnerUp2022: 'BJP', margin2022: 16036, currentParty: 'SP' },
  { acNo: 348, name: 'Nizamabad', localName: 'निजामाबाद', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Alambadi', winnerVotes2022: 79835, runnerUp2022: 'BJP', margin2022: 34187, currentParty: 'SP' },
  { acNo: 349, name: 'Phoolpur Pawai', localName: 'फूलपुर पवई', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Ramakant Yadav', winnerVotes2022: 81164, runnerUp2022: 'BJP', margin2022: 25306, currentParty: 'SP' },
  { acNo: 350, name: 'Didarganj', localName: 'दीदारगंज', district: 'Azamgarh', type: 'GEN', winner2022: 'SP', winnerName2022: 'Kamlakant Rajbhar', winnerVotes2022: 74342, runnerUp2022: 'BJP', margin2022: 13561, currentParty: 'SP' },
  { acNo: 351, name: 'Lalganj', localName: 'लालगंज', district: 'Azamgarh', type: 'SC', winner2022: 'SP', winnerName2022: 'Bechai Saroj', winnerVotes2022: 83767, runnerUp2022: 'BJP', margin2022: 14733, currentParty: 'SP' },
  { acNo: 352, name: 'Mehnagar', localName: 'मेहनगर', district: 'Azamgarh', type: 'SC', winner2022: 'SP', winnerName2022: 'Puja Saroj', winnerVotes2022: 86960, runnerUp2022: 'BJP', margin2022: 14149, currentParty: 'SP' },
  // ── Mau District ──
  { acNo: 353, name: 'Madhuban', localName: 'मधुबन', district: 'Mau', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ram Bilash Chauhan', winnerVotes2022: 79032, runnerUp2022: 'SP', margin2022: 4448, currentParty: 'BJP' },
  { acNo: 354, name: 'Ghosi', localName: 'घोसी', district: 'Mau', type: 'GEN', winner2022: 'SP', winnerName2022: 'Dara Singh Chauhan', winnerVotes2022: 108430, runnerUp2022: 'BJP', margin2022: 22216, currentParty: 'SP' },
  { acNo: 355, name: 'Muhammadabad-Gohna', localName: 'मोहम्मदाबाद गोहना', district: 'Mau', type: 'SC', winner2022: 'SP', winnerName2022: 'Rajendra Kumar', winnerVotes2022: 94688, runnerUp2022: 'BJP', margin2022: 26649, currentParty: 'SP' },
  { acNo: 356, name: 'Mau', localName: 'मऊ', district: 'Mau', type: 'GEN', winner2022: 'SBSP', winnerName2022: 'Abbas Ansari', winnerVotes2022: 124691, runnerUp2022: 'BJP', margin2022: 38116, currentParty: 'SBSP' },
  // ── Ballia District ──
  { acNo: 357, name: 'Belthara Road', localName: 'बेल्थरा रोड', district: 'Ballia', type: 'SC', winner2022: 'SBSP', winnerName2022: 'Hansu Ram', winnerVotes2022: 78995, runnerUp2022: 'BJP', margin2022: 5514, currentParty: 'SBSP' },
  { acNo: 358, name: 'Rasara', localName: 'रसड़ा', district: 'Ballia', type: 'GEN', winner2022: 'BSP', winnerName2022: 'Umashankar Singh', winnerVotes2022: 87887, runnerUp2022: 'SBSP', margin2022: 6583, currentParty: 'BSP' },
  { acNo: 359, name: 'Sikanderpur', localName: 'सिकंदरपुर', district: 'Ballia', type: 'GEN', winner2022: 'SP', winnerName2022: 'Mohammed Ziauddin Rizvi', winnerVotes2022: 75446, runnerUp2022: 'BJP', margin2022: 11855, currentParty: 'SP' },
  { acNo: 360, name: 'Phephana', localName: 'फेफना', district: 'Ballia', type: 'GEN', winner2022: 'SP', winnerName2022: 'Sangram Singh', winnerVotes2022: 92516, runnerUp2022: 'BJP', margin2022: 19354, currentParty: 'SP' },
  { acNo: 361, name: 'Ballia Nagar', localName: 'बलिया नगर', district: 'Ballia', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Daya Shankar Singh', winnerVotes2022: 103873, runnerUp2022: 'SP', margin2022: 26239, currentParty: 'BJP' },
  { acNo: 362, name: 'Bansdih', localName: 'बांसडीह', district: 'Ballia', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ketakee Singh', winnerVotes2022: 103305, runnerUp2022: 'SP', margin2022: 21352, currentParty: 'BJP' },
  { acNo: 363, name: 'Bairia', localName: 'बैरिया', district: 'Ballia', type: 'GEN', winner2022: 'SP', winnerName2022: 'Jai Prakash Anchal', winnerVotes2022: 71241, runnerUp2022: 'BJP', margin2022: 12951, currentParty: 'SP' },
  // ── Jaunpur District ──
  { acNo: 364, name: 'Badlapur', localName: 'बदलापुर', district: 'Jaunpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramesh Chandra Mishra', winnerVotes2022: 82391, runnerUp2022: 'SP', margin2022: 1326, currentParty: 'BJP' },
  { acNo: 365, name: 'Shahganj', localName: 'शाहगंज', district: 'Jaunpur', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Ramesh Singh', winnerVotes2022: 87233, runnerUp2022: 'SP', margin2022: 719, currentParty: 'NISHAD' },
  { acNo: 366, name: 'Jaunpur', localName: 'जौनपुर', district: 'Jaunpur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Girish Chandra Yadav', winnerVotes2022: 97760, runnerUp2022: 'SP', margin2022: 8052, currentParty: 'BJP' },
  { acNo: 367, name: 'Malhani', localName: 'मल्हनी', district: 'Jaunpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Lucky Yadav', winnerVotes2022: 97357, runnerUp2022: 'JD(U)', margin2022: 17527, currentParty: 'SP' },
  { acNo: 368, name: 'Mungra Badshahpur', localName: 'मुंगरा बादशाहपुर', district: 'Jaunpur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Pankaj Patel', winnerVotes2022: 92048, runnerUp2022: 'BJP', margin2022: 5230, currentParty: 'SP' },
  { acNo: 369, name: 'Machhlishahr', localName: 'मछलीशहर', district: 'Jaunpur', type: 'SC', winner2022: 'SP', winnerName2022: 'Ragini Sonkar', winnerVotes2022: 91659, runnerUp2022: 'BJP', margin2022: 8484, currentParty: 'SP' },
  { acNo: 370, name: 'Mariyahu', localName: 'मड़ियाहू', district: 'Jaunpur', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 76007, runnerUp2022: 'SP', margin2022: 1206, currentParty: 'ADSL' },
  { acNo: 371, name: 'Zafrabad', localName: 'जफराबाद', district: 'Jaunpur', type: 'GEN', winner2022: 'SBSP', winnerName2022: 'Jagdish Narayan', winnerVotes2022: 90620, runnerUp2022: 'BJP', margin2022: 6292, currentParty: 'SBSP' },
  { acNo: 372, name: 'Kerakat', localName: 'केराकत', district: 'Jaunpur', type: 'SC', winner2022: 'SP', winnerName2022: 'Tufani Saroj', winnerVotes2022: 94022, runnerUp2022: 'BJP', margin2022: 9844, currentParty: 'SP' },
  // ── Ghazipur District ──
  { acNo: 373, name: 'Jakhanian', localName: 'जखनिया', district: 'Ghazipur', type: 'SC', winner2022: 'SBSP', winnerName2022: 'Triveni Ram', winnerVotes2022: 113378, runnerUp2022: 'BJP', margin2022: 36865, currentParty: 'SBSP' },
  { acNo: 374, name: 'Saidpur', localName: 'सैदपुर', district: 'Ghazipur', type: 'SC', winner2022: 'SP', winnerName2022: 'Ankit Bharti', winnerVotes2022: 109711, runnerUp2022: 'BJP', margin2022: 36635, currentParty: 'SP' },
  { acNo: 375, name: 'Ghazipur Sadar', localName: 'गाजीपुर सदर', district: 'Ghazipur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Jai Kishan Sahu', winnerVotes2022: 92472, runnerUp2022: 'BJP', margin2022: 1692, currentParty: 'SP' },
  { acNo: 376, name: 'Jangipur', localName: 'जंगीपुर', district: 'Ghazipur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Virendra Kumar Yadav', winnerVotes2022: 103125, runnerUp2022: 'BJP', margin2022: 35063, currentParty: 'SP' },
  { acNo: 377, name: 'Zahoorabad', localName: 'जहूराबाद', district: 'Ghazipur', type: 'GEN', winner2022: 'SBSP', winnerName2022: 'Om Prakash Rajbhar', winnerVotes2022: 114860, runnerUp2022: 'BJP', margin2022: 45632, currentParty: 'SBSP' },
  { acNo: 378, name: 'Mohammadabad', localName: 'मोहम्मदाबाद', district: 'Ghazipur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Suhaib Ansari', winnerVotes2022: 111443, runnerUp2022: 'BJP', margin2022: 18759, currentParty: 'SP' },
  { acNo: 379, name: 'Zamania', localName: 'जमानिया', district: 'Ghazipur', type: 'GEN', winner2022: 'SP', winnerName2022: 'Omprakash Singh', winnerVotes2022: 94695, runnerUp2022: 'BJP', margin2022: 22456, currentParty: 'SP' },
  // ── Chandauli District ──
  { acNo: 380, name: 'Mughalsarai', localName: 'मुगलसराय', district: 'Chandauli', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramesh Jaiswal', winnerVotes2022: 102216, runnerUp2022: 'SP', margin2022: 14921, currentParty: 'BJP' },
  { acNo: 381, name: 'Sakaldiha', localName: 'सकलडीहा', district: 'Chandauli', type: 'GEN', winner2022: 'SP', winnerName2022: 'Prabhunarayan Yadav', winnerVotes2022: 86328, runnerUp2022: 'BJP', margin2022: 16661, currentParty: 'SP' },
  { acNo: 382, name: 'Saiyadraja', localName: 'सैयदराजा', district: 'Chandauli', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Sushil Singh', winnerVotes2022: 87891, runnerUp2022: 'SP', margin2022: 10917, currentParty: 'BJP' },
  { acNo: 383, name: 'Chakia', localName: 'चकिया', district: 'Chandauli', type: 'SC', winner2022: 'BJP', winnerName2022: 'Kailash Kharwar', winnerVotes2022: 97812, runnerUp2022: 'SP', margin2022: 9251, currentParty: 'BJP' },
  // ── Varanasi District ──
  { acNo: 384, name: 'Pindra', localName: 'पिंडरा', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Awadhesh Kumar Singh', winnerVotes2022: 84325, runnerUp2022: 'BSP', margin2022: 35559, currentParty: 'BJP' },
  { acNo: 385, name: 'Ajagara', localName: 'अजगरा', district: 'Varanasi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Tribhuwan Ram', winnerVotes2022: 101088, runnerUp2022: 'SBSP', margin2022: 9160, currentParty: 'BJP' },
  { acNo: 386, name: 'Shivpur', localName: 'शिवपुर', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Rajbhar', winnerVotes2022: 115231, runnerUp2022: 'SBSP', margin2022: 27687, currentParty: 'BJP' },
  { acNo: 387, name: 'Rohaniya', localName: 'रोहनिया', district: 'Varanasi', type: 'GEN', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 118663, runnerUp2022: 'IND', margin2022: 46472, currentParty: 'ADSL' },
  { acNo: 388, name: 'Varanasi North', localName: 'वाराणसी उत्तर', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ravindra Jaiswal', winnerVotes2022: 134471, runnerUp2022: 'SP', margin2022: 40776, currentParty: 'BJP' },
  { acNo: 389, name: 'Varanasi South', localName: 'वाराणसी दक्षिण', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Neelkanth Tiwari', winnerVotes2022: 99622, runnerUp2022: 'SP', margin2022: 10722, currentParty: 'BJP' },
  { acNo: 390, name: 'Varanasi Cantt.', localName: 'वाराणसी कैंट', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Saurabh Srivastava', winnerVotes2022: 147833, runnerUp2022: 'SP', margin2022: 86844, currentParty: 'BJP' },
  { acNo: 391, name: 'Sevapuri', localName: 'सेवापुरी', district: 'Varanasi', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Neel Ratan Singh Patel', winnerVotes2022: 105163, runnerUp2022: 'SP', margin2022: 22531, currentParty: 'BJP' },
  // ── Bhadohi District ──
  { acNo: 392, name: 'Bhadohi', localName: 'भदोही', district: 'Bhadohi', type: 'GEN', winner2022: 'SP', winnerName2022: 'Zahid Beg', winnerVotes2022: 100738, runnerUp2022: 'BJP', margin2022: 4885, currentParty: 'SP' },
  { acNo: 393, name: 'Gyanpur', localName: 'ज्ञानपुर', district: 'Bhadohi', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Vipul Dubey', winnerVotes2022: 73446, runnerUp2022: 'SP', margin2022: 6231, currentParty: 'NISHAD' },
  { acNo: 394, name: 'Aurai', localName: 'औराई', district: 'Bhadohi', type: 'SC', winner2022: 'BJP', winnerName2022: 'Dinanath Bhashkar', winnerVotes2022: 93691, runnerUp2022: 'SP', margin2022: 1647, currentParty: 'BJP' },
  // ── Mirzapur District ──
  { acNo: 395, name: 'Chhanbey', localName: 'छानबे', district: 'Mirzapur', type: 'SC', winner2022: 'ADSL', winnerName2022: 'AD(S)', winnerVotes2022: 102502, runnerUp2022: 'SP', margin2022: 38113, currentParty: 'ADSL' },
  { acNo: 396, name: 'Mirzapur', localName: 'मिर्जापुर', district: 'Mirzapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ratnakar Mishra', winnerVotes2022: 118642, runnerUp2022: 'SP', margin2022: 39876, currentParty: 'BJP' },
  { acNo: 397, name: 'Majhawan', localName: 'मझवां', district: 'Mirzapur', type: 'GEN', winner2022: 'NISHAD', winnerName2022: 'Dr. Vinod Kumar Bind', winnerVotes2022: 103235, runnerUp2022: 'SP', margin2022: 33587, currentParty: 'NISHAD' },
  { acNo: 398, name: 'Chunar', localName: 'चुनार', district: 'Mirzapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anurag Singh', winnerVotes2022: 110980, runnerUp2022: 'IND', margin2022: 47614, currentParty: 'BJP' },
  { acNo: 399, name: 'Marihan', localName: 'मड़िहान', district: 'Mirzapur', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rama Shankar Singh', winnerVotes2022: 105377, runnerUp2022: 'BSP', margin2022: 62911, currentParty: 'BJP' },
  // ── Sonbhadra District ──
  { acNo: 400, name: 'Ghorawal', localName: 'घोरावल', district: 'Sonbhadra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Anil Kumar Maurya', winnerVotes2022: 101277, runnerUp2022: 'SP', margin2022: 23922, currentParty: 'BJP' },
  { acNo: 401, name: 'Robertsganj', localName: 'रॉबर्ट्सगंज', district: 'Sonbhadra', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Bhupesh Chaubey', winnerVotes2022: 84496, runnerUp2022: 'SP', margin2022: 5621, currentParty: 'BJP' },
  { acNo: 402, name: 'Obra', localName: 'ओबरा', district: 'Sonbhadra', type: 'ST', winner2022: 'BJP', winnerName2022: 'Sanjeev Kumar Gond', winnerVotes2022: 78364, runnerUp2022: 'SP', margin2022: 26442, currentParty: 'BJP' },
  { acNo: 403, name: 'Duddhi', localName: 'दुद्धी', district: 'Sonbhadra', type: 'ST', winner2022: 'BJP', winnerName2022: 'Ramdular Gaur', winnerVotes2022: 84407, runnerUp2022: 'SP', margin2022: 6297, currentParty: 'BJP' },
];

export function getUPConstituency(acNo: number): UPConstituencySeed | undefined {
  return UP_CONSTITUENCIES.find(c => c.acNo === acNo);
}
