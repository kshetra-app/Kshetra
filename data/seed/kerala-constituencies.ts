/**
 * Kerala Assembly Constituencies — Full Data (140 seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, Kerala 2021 General Election results.
 *  Data scraped from Wikipedia (sourced from ECI) and cross-verified.
 *
 * ── PARTY TALLY ────────────────────────────────────────────────────────────
 *  CPIM: 62 | INC: 21 | CPI: 17 | IUML: 15 | IND: 6 | KCM: 5 | NCP: 2 | JDS: 2 | KC: 2 | CONS: 1 | LJD: 1 | RMPI: 1 | INL: 1 | NSC: 1 | KCJ: 1 | Total: 140
 */

export interface KLConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2021: string;
  winnerName2021: string;
  winnerVotes2021: number;
  runnerUp2021: string;
  margin2021: number;
  currentParty: string;
}

export const KL_CONSTITUENCIES: KLConstituencySeed[] = [
  // ── Kasaragod District ──
  { acNo: 1, name: 'Manjeshwaram', district: 'Kasaragod', type: 'GEN', winner2021: 'IUML', winnerName2021: 'A. K. M. Ashraf', winnerVotes2021: 65758, runnerUp2021: 'BJP', margin2021: 745, currentParty: 'IUML' },
  { acNo: 2, name: 'Kasargod', district: 'Kasaragod', type: 'GEN', winner2021: 'IUML', winnerName2021: 'N. A. Nellikkunnu', winnerVotes2021: 63296, runnerUp2021: 'BJP', margin2021: 12901, currentParty: 'IUML' },
  { acNo: 3, name: 'Udma', district: 'Kasaragod', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'C. H. Kunhambu', winnerVotes2021: 78664, runnerUp2021: 'INC', margin2021: 13322, currentParty: 'CPIM' },
  { acNo: 4, name: 'Kanhangad', district: 'Kasaragod', type: 'GEN', winner2021: 'CPI', winnerName2021: 'E. Chandrasekharan', winnerVotes2021: 84615, runnerUp2021: 'INC', margin2021: 27139, currentParty: 'CPI' },
  { acNo: 5, name: 'Thrikkaripur', district: 'Kasaragod', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. Rajagopal', winnerVotes2021: 86151, runnerUp2021: 'KC', margin2021: 26137, currentParty: 'CPIM' },
  // ── Kannur District ──
  { acNo: 6, name: 'Payyannur', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'T. I. Madusoodhanan', winnerVotes2021: 93695, runnerUp2021: 'INC', margin2021: 49780, currentParty: 'CPIM' },
  { acNo: 7, name: 'Kalliasseri', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. Vijin', winnerVotes2021: 88252, runnerUp2021: 'INC', margin2021: 44393, currentParty: 'CPIM' },
  { acNo: 8, name: 'Thaliparamba', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. V. Govindan', winnerVotes2021: 92870, runnerUp2021: 'INC', margin2021: 22689, currentParty: 'CPIM' },
  { acNo: 9, name: 'Irikkur', district: 'Kannur', type: 'GEN', winner2021: 'INC', winnerName2021: 'Sajeev Joseph', winnerVotes2021: 76764, runnerUp2021: 'KCM', margin2021: 10010, currentParty: 'INC' },
  { acNo: 10, name: 'Azhikode', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. V. Sumesh', winnerVotes2021: 65794, runnerUp2021: 'IUML', margin2021: 6141, currentParty: 'CPIM' },
  { acNo: 11, name: 'Kannur', district: 'Kannur', type: 'GEN', winner2021: 'CONS', winnerName2021: 'Kadannappalli Ramachandran', winnerVotes2021: 60313, runnerUp2021: 'INC', margin2021: 1745, currentParty: 'CONS' },
  { acNo: 12, name: 'Dharmadom', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Pinarayi Vijayan', winnerVotes2021: 95522, runnerUp2021: 'INC', margin2021: 50123, currentParty: 'CPIM' },
  { acNo: 13, name: 'Thalassery', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'A. N. Shamseer', winnerVotes2021: 81810, runnerUp2021: 'INC', margin2021: 36801, currentParty: 'CPIM' },
  { acNo: 14, name: 'Kuthuparamba', district: 'Kannur', type: 'GEN', winner2021: 'LJD', winnerName2021: 'K. P. Mohanan', winnerVotes2021: 70626, runnerUp2021: 'IUML', margin2021: 9541, currentParty: 'LJD' },
  { acNo: 15, name: 'Mattannur', district: 'Kannur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. K. Shailaja', winnerVotes2021: 96129, runnerUp2021: 'RSP', margin2021: 60963, currentParty: 'CPIM' },
  { acNo: 16, name: 'Peravoor', district: 'Kannur', type: 'GEN', winner2021: 'INC', winnerName2021: 'Sunny Joseph', winnerVotes2021: 66706, runnerUp2021: 'CPIM', margin2021: 3172, currentParty: 'INC' },
  // ── Wayanad District ──
  { acNo: 17, name: 'Mananthavady (ST)', district: 'Wayanad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'O. R. Kelu', winnerVotes2021: 74085, runnerUp2021: 'INC', margin2021: 9282, currentParty: 'CPIM' },
  { acNo: 18, name: 'Sulthanbathery (ST)', district: 'Wayanad', type: 'GEN', winner2021: 'INC', winnerName2021: 'I. C. Balakrishnan', winnerVotes2021: 83002, runnerUp2021: 'CPIM', margin2021: 11822, currentParty: 'INC' },
  { acNo: 19, name: 'Kalpetta', district: 'Wayanad', type: 'GEN', winner2021: 'INC', winnerName2021: 'T. Siddique', winnerVotes2021: 71859, runnerUp2021: 'LJD', margin2021: 5470, currentParty: 'INC' },
  // ── Kozhikode District ──
  { acNo: 20, name: 'Vatakara', district: 'Kozhikode', type: 'GEN', winner2021: 'RMPI', winnerName2021: 'K. K. Rema', winnerVotes2021: 65093, runnerUp2021: 'LJD', margin2021: 7491, currentParty: 'RMPI' },
  { acNo: 21, name: 'Kuttiady', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. P. Kunhahammed Kutty', winnerVotes2021: 80143, runnerUp2021: 'IUML', margin2021: 333, currentParty: 'CPIM' },
  { acNo: 22, name: 'Nadapuram', district: 'Kozhikode', type: 'GEN', winner2021: 'CPI', winnerName2021: 'E. K. Vijayan', winnerVotes2021: 80287, runnerUp2021: 'INC', margin2021: 3385, currentParty: 'CPI' },
  { acNo: 23, name: 'Koyilandy', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Kanathil Jameela', winnerVotes2021: 75628, runnerUp2021: 'INC', margin2021: 8472, currentParty: 'CPIM' },
  { acNo: 24, name: 'Perambra', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'T. P. Ramakrishnan', winnerVotes2021: 86023, runnerUp2021: 'IND', margin2021: 22592, currentParty: 'CPIM' },
  { acNo: 25, name: 'Balusseri (SC)', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. M. Sachin Dev', winnerVotes2021: 91839, runnerUp2021: 'INC', margin2021: 20372, currentParty: 'CPIM' },
  { acNo: 26, name: 'Elathur', district: 'Kozhikode', type: 'GEN', winner2021: 'NCP', winnerName2021: 'A. K. Saseendran', winnerVotes2021: 83639, runnerUp2021: 'IND', margin2021: 38502, currentParty: 'NCP' },
  { acNo: 27, name: 'Kozhikode North', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Thottathil Raveendran', winnerVotes2021: 59124, runnerUp2021: 'INC', margin2021: 12928, currentParty: 'CPIM' },
  { acNo: 28, name: 'KozhikodebSouth', district: 'Kozhikode', type: 'GEN', winner2021: 'INL', winnerName2021: 'Ahamed Devarkovil', winnerVotes2021: 52557, runnerUp2021: 'IUML', margin2021: 12459, currentParty: 'INL' },
  { acNo: 29, name: 'Beypore', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. A. Mohammed Riyas', winnerVotes2021: 82165, runnerUp2021: 'INC', margin2021: 28747, currentParty: 'CPIM' },
  { acNo: 30, name: 'Kunnamangalam', district: 'Kozhikode', type: 'GEN', winner2021: 'IND', winnerName2021: 'P. T. A. Rahim', winnerVotes2021: 85138, runnerUp2021: 'IND', margin2021: 10276, currentParty: 'IND' },
  { acNo: 31, name: 'Koduvally', district: 'Kozhikode', type: 'GEN', winner2021: 'IUML', winnerName2021: 'M. K. Muneer', winnerVotes2021: 72336, runnerUp2021: 'IND', margin2021: 6344, currentParty: 'IUML' },
  { acNo: 32, name: 'Thiruvambadi', district: 'Kozhikode', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Linto Joseph', winnerVotes2021: 67867, runnerUp2021: 'IUML', margin2021: 4643, currentParty: 'CPIM' },
  // ── Malappuram District ──
  { acNo: 33, name: 'Kondotty', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'T. V. Ibrahim', winnerVotes2021: 80597, runnerUp2021: 'IND', margin2021: 17713, currentParty: 'IUML' },
  { acNo: 34, name: 'Eranad', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'P. K. Basheer', winnerVotes2021: 78076, runnerUp2021: 'IND', margin2021: 22546, currentParty: 'IUML' },
  { acNo: 35, name: 'Nilambur', district: 'Malappuram', type: 'GEN', winner2021: 'IND', winnerName2021: 'P. V. Anvar', winnerVotes2021: 81227, runnerUp2021: 'INC', margin2021: 2700, currentParty: 'IND' },
  { acNo: 36, name: 'Wandoor (SC)', district: 'Malappuram', type: 'GEN', winner2021: 'INC', winnerName2021: 'A. P. Anil Kumar', winnerVotes2021: 87415, runnerUp2021: 'CPIM', margin2021: 15563, currentParty: 'INC' },
  { acNo: 37, name: 'Manjeri', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'U. A. Latheef', winnerVotes2021: 78836, runnerUp2021: 'CPI', margin2021: 14573, currentParty: 'IUML' },
  { acNo: 38, name: 'Perinthalmanna', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'Najeeb Kanthapuram', winnerVotes2021: 76530, runnerUp2021: 'IND', margin2021: 38, currentParty: 'IUML' },
  { acNo: 39, name: 'Mankada', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'Manjalamkuzhi Ali', winnerVotes2021: 83231, runnerUp2021: 'CPIM', margin2021: 6246, currentParty: 'IUML' },
  { acNo: 40, name: 'Malappuram', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'P. Ubaidulla', winnerVotes2021: 93166, runnerUp2021: 'CPIM', margin2021: 35208, currentParty: 'IUML' },
  { acNo: 41, name: 'Vengara', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'P. K. Kunhalikutty', winnerVotes2021: 70193, runnerUp2021: 'CPIM', margin2021: 30522, currentParty: 'IUML' },
  { acNo: 42, name: 'Vallikunnu', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'P. Abdul Hameed', winnerVotes2021: 71823, runnerUp2021: 'INL', margin2021: 14116, currentParty: 'IUML' },
  { acNo: 43, name: 'Tirurangadi', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'K. P. A. Majeed', winnerVotes2021: 73499, runnerUp2021: 'IND', margin2021: 9578, currentParty: 'IUML' },
  { acNo: 44, name: 'Tanur', district: 'Malappuram', type: 'GEN', winner2021: 'NSC', winnerName2021: 'V. Abdurahman', winnerVotes2021: 70704, runnerUp2021: 'IUML', margin2021: 985, currentParty: 'NSC' },
  { acNo: 45, name: 'Tirur', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'Kurukkoli Moideen', winnerVotes2021: 85314, runnerUp2021: 'CPIM', margin2021: 7214, currentParty: 'IUML' },
  { acNo: 46, name: 'Kottakkal', district: 'Malappuram', type: 'GEN', winner2021: 'IUML', winnerName2021: 'K. K. Abid Hussain Thangal', winnerVotes2021: 81700, runnerUp2021: 'NCP', margin2021: 16588, currentParty: 'IUML' },
  { acNo: 47, name: 'Thavanur', district: 'Malappuram', type: 'GEN', winner2021: 'IND', winnerName2021: 'K. T. Jaleel', winnerVotes2021: 70358, runnerUp2021: 'INC', margin2021: 2564, currentParty: 'IND' },
  { acNo: 48, name: 'Ponnani', district: 'Malappuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. Nandakumar', winnerVotes2021: 74668, runnerUp2021: 'INC', margin2021: 17043, currentParty: 'CPIM' },
  // ── Palakkad District ──
  { acNo: 49, name: 'Thrithala', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. B. Rajesh', winnerVotes2021: 69814, runnerUp2021: 'INC', margin2021: 3016, currentParty: 'CPIM' },
  { acNo: 50, name: 'Pattambi', district: 'Palakkad', type: 'GEN', winner2021: 'CPI', winnerName2021: 'Muhammed Muhsin', winnerVotes2021: 75311, runnerUp2021: 'INC', margin2021: 17974, currentParty: 'CPI' },
  { acNo: 51, name: 'Shornur', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. Mammikutty', winnerVotes2021: 74400, runnerUp2021: 'INC', margin2021: 36674, currentParty: 'CPIM' },
  { acNo: 52, name: 'Ottappalam', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. Premkumar', winnerVotes2021: 74859, runnerUp2021: 'INC', margin2021: 15152, currentParty: 'CPIM' },
  { acNo: 53, name: 'Kongad (SC)', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. Shanthakumari', winnerVotes2021: 67881, runnerUp2021: 'IUML', margin2021: 27219, currentParty: 'CPIM' },
  { acNo: 54, name: 'Mannarkkad', district: 'Palakkad', type: 'GEN', winner2021: 'IUML', winnerName2021: 'N. Shamsudheen', winnerVotes2021: 71657, runnerUp2021: 'CPI', margin2021: 5870, currentParty: 'IUML' },
  { acNo: 55, name: 'Malampuzha', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'A. Prabhakaran', winnerVotes2021: 75934, runnerUp2021: 'BJP', margin2021: 25734, currentParty: 'CPIM' },
  { acNo: 56, name: 'Palakkad', district: 'Palakkad', type: 'GEN', winner2021: 'INC', winnerName2021: 'Shafi Parambil', winnerVotes2021: 54079, runnerUp2021: 'BJP', margin2021: 3859, currentParty: 'INC' },
  { acNo: 57, name: 'Tarur (SC)', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. P. Sumod', winnerVotes2021: 67744, runnerUp2021: 'INC', margin2021: 24531, currentParty: 'CPIM' },
  { acNo: 58, name: 'Chittur', district: 'Palakkad', type: 'GEN', winner2021: 'JDS', winnerName2021: 'K. Krishnankutty', winnerVotes2021: 84672, runnerUp2021: 'INC', margin2021: 33878, currentParty: 'JDS' },
  { acNo: 59, name: 'Nenmara', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. Babu', winnerVotes2021: 80145, runnerUp2021: 'CMP(J)', margin2021: 28074, currentParty: 'CPIM' },
  { acNo: 60, name: 'Alathur', district: 'Palakkad', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. D. Prasenan', winnerVotes2021: 74653, runnerUp2021: 'INC', margin2021: 34118, currentParty: 'CPIM' },
  // ── Thrissur District ──
  { acNo: 61, name: 'Chelakkara (SC)', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. Radhakrishnan', winnerVotes2021: 83415, runnerUp2021: 'INC', margin2021: 39400, currentParty: 'CPIM' },
  { acNo: 62, name: 'Kunnamkulam', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'A. C. Moideen', winnerVotes2021: 75532, runnerUp2021: 'INC', margin2021: 26631, currentParty: 'CPIM' },
  { acNo: 63, name: 'Guruvayoor', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'N. K. Akbar', winnerVotes2021: 77072, runnerUp2021: 'IUML', margin2021: 18268, currentParty: 'CPIM' },
  { acNo: 64, name: 'Manalur', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Murali Perunelly', winnerVotes2021: 78337, runnerUp2021: 'INC', margin2021: 29876, currentParty: 'CPIM' },
  { acNo: 65, name: 'Wadakkanchery', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Xavier Chittilappilly', winnerVotes2021: 81026, runnerUp2021: 'INC', margin2021: 15168, currentParty: 'CPIM' },
  { acNo: 66, name: 'Ollur', district: 'Thrissur', type: 'GEN', winner2021: 'CPI', winnerName2021: 'K. Rajan', winnerVotes2021: 76657, runnerUp2021: 'INC', margin2021: 21506, currentParty: 'CPI' },
  { acNo: 67, name: 'Thrissur', district: 'Thrissur', type: 'GEN', winner2021: 'CPI', winnerName2021: 'P. Balachandran', winnerVotes2021: 44263, runnerUp2021: 'INC', margin2021: 946, currentParty: 'CPI' },
  { acNo: 68, name: 'Nattika (SC)', district: 'Thrissur', type: 'GEN', winner2021: 'CPI', winnerName2021: 'C. C. Mukundan', winnerVotes2021: 72930, runnerUp2021: 'INC', margin2021: 28431, currentParty: 'CPI' },
  { acNo: 69, name: 'Kaipamangalam', district: 'Thrissur', type: 'GEN', winner2021: 'CPI', winnerName2021: 'E. T. Taison', winnerVotes2021: 73161, runnerUp2021: 'INC', margin2021: 22698, currentParty: 'CPI' },
  { acNo: 70, name: 'Irinjalakuda', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'R. Bindu', winnerVotes2021: 62493, runnerUp2021: 'KC', margin2021: 5949, currentParty: 'CPIM' },
  { acNo: 71, name: 'Puthukkad', district: 'Thrissur', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. K. Ramachandran', winnerVotes2021: 73365, runnerUp2021: 'INC', margin2021: 27353, currentParty: 'CPIM' },
  { acNo: 72, name: 'Chalakudy', district: 'Thrissur', type: 'GEN', winner2021: 'INC', winnerName2021: 'T. J. Saneesh Kumar Joseph', winnerVotes2021: 61888, runnerUp2021: 'KCM', margin2021: 1057, currentParty: 'INC' },
  { acNo: 73, name: 'Kodungallur', district: 'Thrissur', type: 'GEN', winner2021: 'CPI', winnerName2021: 'V. R. Sunil Kumar', winnerVotes2021: 71457, runnerUp2021: 'INC', margin2021: 23893, currentParty: 'CPI' },
  // ── Ernakulam District ──
  { acNo: 74, name: 'Perumbavoor', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Eldhose Kunnappilly', winnerVotes2021: 53484, runnerUp2021: 'KCM', margin2021: 2899, currentParty: 'INC' },
  { acNo: 75, name: 'Angamaly', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Roji M. John', winnerVotes2021: 71562, runnerUp2021: 'JDS', margin2021: 15929, currentParty: 'INC' },
  { acNo: 76, name: 'Aluva', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Anwar Sadath', winnerVotes2021: 73703, runnerUp2021: 'CPIM', margin2021: 18886, currentParty: 'INC' },
  { acNo: 77, name: 'Kalamassery', district: 'Ernakulam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. Rajeev', winnerVotes2021: 77141, runnerUp2021: 'IUML', margin2021: 15336, currentParty: 'CPIM' },
  { acNo: 78, name: 'Paravur', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'V. D. Satheesan', winnerVotes2021: 82264, runnerUp2021: 'CPI', margin2021: 21301, currentParty: 'INC' },
  { acNo: 79, name: 'Vypin', district: 'Ernakulam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. N. Unnikrishnan', winnerVotes2021: 53858, runnerUp2021: 'INC', margin2021: 8201, currentParty: 'CPIM' },
  { acNo: 80, name: 'Kochi', district: 'Ernakulam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. J. Maxi', winnerVotes2021: 54632, runnerUp2021: 'INC', margin2021: 14079, currentParty: 'CPIM' },
  { acNo: 81, name: 'Thripunithura', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'K. Babu', winnerVotes2021: 65875, runnerUp2021: 'CPIM', margin2021: 992, currentParty: 'INC' },
  { acNo: 82, name: 'Ernakulam', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'T. J. Vinod', winnerVotes2021: 45390, runnerUp2021: 'IND', margin2021: 10970, currentParty: 'INC' },
  { acNo: 83, name: 'Thrikkakara', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'P. T. Thomas', winnerVotes2021: 59839, runnerUp2021: 'CPIM', margin2021: 14329, currentParty: 'INC' },
  { acNo: 84, name: 'Kunnathunad (SC)', district: 'Ernakulam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. V. Sreejin', winnerVotes2021: 52351, runnerUp2021: 'INC', margin2021: 2715, currentParty: 'CPIM' },
  { acNo: 85, name: 'Piravom', district: 'Ernakulam', type: 'GEN', winner2021: 'KCJ', winnerName2021: 'Anoop Jacob', winnerVotes2021: 85056, runnerUp2021: 'KCM', margin2021: 25364, currentParty: 'KCJ' },
  { acNo: 86, name: 'Muvattupuzha', district: 'Ernakulam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Mathew Kuzhalnadan', winnerVotes2021: 64425, runnerUp2021: 'CPI', margin2021: 6161, currentParty: 'INC' },
  { acNo: 87, name: 'Kothamangalam', district: 'Ernakulam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Antony John', winnerVotes2021: 64234, runnerUp2021: 'KC', margin2021: 6605, currentParty: 'CPIM' },
  // ── Idukki District ──
  { acNo: 88, name: 'Devikulam (SC)', district: 'Idukki', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'A. Raja', winnerVotes2021: 59049, runnerUp2021: 'INC', margin2021: 7848, currentParty: 'CPIM' },
  { acNo: 89, name: 'Udumbanchola', district: 'Idukki', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. M. Mani', winnerVotes2021: 77381, runnerUp2021: 'INC', margin2021: 38305, currentParty: 'CPIM' },
  { acNo: 90, name: 'Thodupuzha', district: 'Idukki', type: 'GEN', winner2021: 'KC', winnerName2021: 'P. J. Joseph', winnerVotes2021: 67495, runnerUp2021: 'KCM', margin2021: 20259, currentParty: 'KC' },
  { acNo: 91, name: 'Idukki', district: 'Idukki', type: 'GEN', winner2021: 'KCM', winnerName2021: 'Roshy Augustine', winnerVotes2021: 62368, runnerUp2021: 'KC', margin2021: 5573, currentParty: 'KCM' },
  { acNo: 92, name: 'Peerumede', district: 'Idukki', type: 'GEN', winner2021: 'CPI', winnerName2021: 'Vazhoor Soman', winnerVotes2021: 60141, runnerUp2021: 'INC', margin2021: 1835, currentParty: 'CPI' },
  // ── Kottayam District ──
  { acNo: 93, name: 'Pala', district: 'Kottayam', type: 'GEN', winner2021: 'IND', winnerName2021: 'Mani C. Kappan', winnerVotes2021: 69804, runnerUp2021: 'KCM', margin2021: 15386, currentParty: 'IND' },
  { acNo: 94, name: 'Kaduthuruthy', district: 'Kottayam', type: 'GEN', winner2021: 'KC', winnerName2021: 'Monce Joseph', winnerVotes2021: 59666, runnerUp2021: 'KCM', margin2021: 4256, currentParty: 'KC' },
  { acNo: 95, name: 'Vaikom (SC)', district: 'Kottayam', type: 'GEN', winner2021: 'CPI', winnerName2021: 'C. K. Asha', winnerVotes2021: 71388, runnerUp2021: 'INC', margin2021: 29122, currentParty: 'CPI' },
  { acNo: 96, name: 'Ettumanoor', district: 'Kottayam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'V. N. Vasavan', winnerVotes2021: 58289, runnerUp2021: 'KC', margin2021: 14303, currentParty: 'CPIM' },
  { acNo: 97, name: 'Kottayam', district: 'Kottayam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Thiruvanchoor Radhakrishnan', winnerVotes2021: 65401, runnerUp2021: 'CPIM', margin2021: 18743, currentParty: 'INC' },
  { acNo: 98, name: 'Puthuppally', district: 'Kottayam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Oommen Chandy', winnerVotes2021: 63372, runnerUp2021: 'CPIM', margin2021: 9044, currentParty: 'INC' },
  { acNo: 99, name: 'Changanassery', district: 'Kottayam', type: 'GEN', winner2021: 'KCM', winnerName2021: 'Job Michael', winnerVotes2021: 55425, runnerUp2021: 'KC', margin2021: 6059, currentParty: 'KCM' },
  { acNo: 100, name: 'Kanjirappally', district: 'Kottayam', type: 'GEN', winner2021: 'KCM', winnerName2021: 'N. Jayaraj', winnerVotes2021: 60299, runnerUp2021: 'INC', margin2021: 13703, currentParty: 'KCM' },
  { acNo: 101, name: 'Poonjar', district: 'Kottayam', type: 'GEN', winner2021: 'KCM', winnerName2021: 'Sebastian Kulathunkal', winnerVotes2021: 58668, runnerUp2021: 'INC', margin2021: 16817, currentParty: 'KCM' },
  // ── Alappuzha District ──
  { acNo: 102, name: 'Aroor', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Daleema Jojo', winnerVotes2021: 73626, runnerUp2021: 'INC', margin2021: 6802, currentParty: 'CPIM' },
  { acNo: 103, name: 'Cherthala', district: 'Alappuzha', type: 'GEN', winner2021: 'CPI', winnerName2021: 'P. Prasad', winnerVotes2021: 83702, runnerUp2021: 'INC', margin2021: 6148, currentParty: 'CPI' },
  { acNo: 104, name: 'Alappuzha', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'P. P. Chitharanjan', winnerVotes2021: 73412, runnerUp2021: 'INC', margin2021: 11644, currentParty: 'CPIM' },
  { acNo: 105, name: 'Ambalappuzha', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'H. Salam', winnerVotes2021: 61365, runnerUp2021: 'INC', margin2021: 11125, currentParty: 'CPIM' },
  { acNo: 106, name: 'Kuttanad', district: 'Alappuzha', type: 'GEN', winner2021: 'NCP', winnerName2021: 'Thomas K. Thomas', winnerVotes2021: 57379, runnerUp2021: 'KC', margin2021: 5516, currentParty: 'NCP' },
  { acNo: 107, name: 'Haripad', district: 'Alappuzha', type: 'GEN', winner2021: 'INC', winnerName2021: 'Ramesh Chennithala', winnerVotes2021: 72768, runnerUp2021: 'CPI', margin2021: 13666, currentParty: 'INC' },
  { acNo: 108, name: 'Kayamkulam', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'U. Prathibha', winnerVotes2021: 77348, runnerUp2021: 'INC', margin2021: 6298, currentParty: 'CPIM' },
  { acNo: 109, name: 'Mavelikkara (SC)', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. S. Arun Kumar', winnerVotes2021: 71743, runnerUp2021: 'INC', margin2021: 24717, currentParty: 'CPIM' },
  { acNo: 110, name: 'Chengannur', district: 'Alappuzha', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Saji Cheriyan', winnerVotes2021: 71293, runnerUp2021: 'INC', margin2021: 31984, currentParty: 'CPIM' },
  // ── Pathanamthitta District ──
  { acNo: 111, name: 'Thiruvalla', district: 'Pathanamthitta', type: 'GEN', winner2021: 'JDS', winnerName2021: 'Mathew T. Thomas', winnerVotes2021: 62178, runnerUp2021: 'KC', margin2021: 11421, currentParty: 'JDS' },
  { acNo: 112, name: 'Ranni', district: 'Pathanamthitta', type: 'GEN', winner2021: 'KCM', winnerName2021: 'Pramod Narayan', winnerVotes2021: 44774, runnerUp2021: 'INC', margin2021: 1123, currentParty: 'KCM' },
  { acNo: 113, name: 'Aranmula', district: 'Pathanamthitta', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Veena George', winnerVotes2021: 74950, runnerUp2021: 'INC', margin2021: 19003, currentParty: 'CPIM' },
  { acNo: 114, name: 'Konni', district: 'Pathanamthitta', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. U. Jenish Kumar', winnerVotes2021: 62318, runnerUp2021: 'INC', margin2021: 8508, currentParty: 'CPIM' },
  { acNo: 115, name: 'Adoor (SC)', district: 'Pathanamthitta', type: 'GEN', winner2021: 'CPI', winnerName2021: 'Chittayam Gopakumar', winnerVotes2021: 54026, runnerUp2021: 'INC', margin2021: 2962, currentParty: 'CPI' },
  // ── Kollam District ──
  { acNo: 116, name: 'Karunagapally', district: 'Kollam', type: 'GEN', winner2021: 'INC', winnerName2021: 'C. R. Mahesh', winnerVotes2021: 93932, runnerUp2021: 'CPI', margin2021: 29096, currentParty: 'INC' },
  { acNo: 117, name: 'Chavara', district: 'Kollam', type: 'GEN', winner2021: 'IND', winnerName2021: 'Sujith Vijayanpillai', winnerVotes2021: 63282, runnerUp2021: 'RSP', margin2021: 1096, currentParty: 'IND' },
  { acNo: 118, name: 'Kunnathur (SC)', district: 'Kollam', type: 'GEN', winner2021: 'IND', winnerName2021: 'Kovoor Kunjumon', winnerVotes2021: 69436, runnerUp2021: 'RSP', margin2021: 2790, currentParty: 'IND' },
  { acNo: 119, name: 'Kottarakkara', district: 'Kollam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. N. Balagopal', winnerVotes2021: 68770, runnerUp2021: 'INC', margin2021: 10814, currentParty: 'CPIM' },
  { acNo: 120, name: 'Pathanapuram', district: 'Kollam', type: 'GEN', winner2021: 'KC(B)', winnerName2021: 'K. B. Ganesh Kumar', winnerVotes2021: 67078, runnerUp2021: 'INC', margin2021: 14302, currentParty: 'KC(B)' },
  { acNo: 121, name: 'Punalur', district: 'Kollam', type: 'GEN', winner2021: 'CPI', winnerName2021: 'P. S. Supal', winnerVotes2021: 80428, runnerUp2021: 'IUML', margin2021: 37007, currentParty: 'CPI' },
  { acNo: 122, name: 'Chadayamangalam', district: 'Kollam', type: 'GEN', winner2021: 'CPI', winnerName2021: 'J. Chinchu Rani', winnerVotes2021: 67252, runnerUp2021: 'INC', margin2021: 13678, currentParty: 'CPI' },
  { acNo: 123, name: 'Kundara', district: 'Kollam', type: 'GEN', winner2021: 'INC', winnerName2021: 'P. C. Vishnunath', winnerVotes2021: 76341, runnerUp2021: 'CPIM', margin2021: 4454, currentParty: 'INC' },
  { acNo: 124, name: 'Kollam', district: 'Kollam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Mukesh', winnerVotes2021: 58524, runnerUp2021: 'INC', margin2021: 2072, currentParty: 'CPIM' },
  { acNo: 125, name: 'Eravipuram', district: 'Kollam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'M. Noushad', winnerVotes2021: 71573, runnerUp2021: 'RSP', margin2021: 28121, currentParty: 'CPIM' },
  { acNo: 126, name: 'Chathannoor', district: 'Kollam', type: 'GEN', winner2021: 'CPI', winnerName2021: 'G. S. Jayalal', winnerVotes2021: 59296, runnerUp2021: 'BJP', margin2021: 17206, currentParty: 'CPI' },
  // ── Thiruvananthapuram District ──
  { acNo: 127, name: 'Varkala', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'V. Joy', winnerVotes2021: 68816, runnerUp2021: 'INC', margin2021: 17821, currentParty: 'CPIM' },
  { acNo: 128, name: 'Attingal (SC)', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'O. S. Ambika', winnerVotes2021: 69898, runnerUp2021: 'BJP', margin2021: 31636, currentParty: 'CPIM' },
  { acNo: 129, name: 'Chirayinkeezhu (SC)', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPI', winnerName2021: 'V. Sasi', winnerVotes2021: 62634, runnerUp2021: 'INC', margin2021: 14017, currentParty: 'CPI' },
  { acNo: 130, name: 'Nedumangad', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPI', winnerName2021: 'G. R. Anil', winnerVotes2021: 72742, runnerUp2021: 'INC', margin2021: 23309, currentParty: 'CPI' },
  { acNo: 131, name: 'Vamanapuram', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'D. K. Murali', winnerVotes2021: 73137, runnerUp2021: 'INC', margin2021: 10242, currentParty: 'CPIM' },
  { acNo: 132, name: 'Kazhakoottam', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'Kadakampally Surendran', winnerVotes2021: 63690, runnerUp2021: 'BJP', margin2021: 23497, currentParty: 'CPIM' },
  { acNo: 133, name: 'Vattiyoorkavu', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'V. K. Prasanth', winnerVotes2021: 61111, runnerUp2021: 'BJP', margin2021: 21515, currentParty: 'CPIM' },
  { acNo: 134, name: 'Thiruvananthapuram', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'JKC', winnerName2021: 'Antony Raju', winnerVotes2021: 48748, runnerUp2021: 'INC', margin2021: 7089, currentParty: 'JKC' },
  { acNo: 135, name: 'Nemom', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'V. Sivankutty', winnerVotes2021: 55837, runnerUp2021: 'BJP', margin2021: 3949, currentParty: 'CPIM' },
  { acNo: 136, name: 'Aruvikkara', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'G. Stephen', winnerVotes2021: 66776, runnerUp2021: 'INC', margin2021: 5046, currentParty: 'CPIM' },
  { acNo: 137, name: 'Parassala', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'C. K. Hareendran', winnerVotes2021: 78548, runnerUp2021: 'INC', margin2021: 25828, currentParty: 'CPIM' },
  { acNo: 138, name: 'Kattakada', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'I. B. Sathish', winnerVotes2021: 66293, runnerUp2021: 'INC', margin2021: 23231, currentParty: 'CPIM' },
  { acNo: 139, name: 'Kovalam', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'INC', winnerName2021: 'M. Vinent', winnerVotes2021: 74868, runnerUp2021: 'JDS', margin2021: 11562, currentParty: 'INC' },
  { acNo: 140, name: 'Neyyattinkara', district: 'Thiruvananthapuram', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'K. Ansalan', winnerVotes2021: 65497, runnerUp2021: 'INC', margin2021: 14262, currentParty: 'CPIM' },
];

export function getKLConstituency(acNo: number): KLConstituencySeed | undefined {
  return KL_CONSTITUENCIES.find(c => c.acNo === acNo);
}
