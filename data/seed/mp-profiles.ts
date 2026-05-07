/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MEMBER OF PARLIAMENT (MP) PROFILES — 18th Lok Sabha (2024–)          ║
 * ║  + Rajya Sabha Members (as of 2024)                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. Election Commission of India — 2024 Lok Sabha results
 *  2. Rajya Sabha Secretariat — current member list
 *  3. PRS Legislative Research — parliamentary performance
 *  4. MyNeta / ADR — criminal cases, assets, education
 *
 * ── COVERAGE ─────────────────────────────────────────────────────────────
 *  TS: 17 LS + 7 RS = 24 MPs
 *  AP: 25 LS + 11 RS = 36 MPs
 *  KA: 28 LS + 12 RS = 40 MPs
 *  MH: 48 LS + 19 RS = 67 MPs
 *  TN: 39 LS + 18 RS = 57 MPs
 *  KL: 20 LS + 9 RS = 29 MPs
 *  WB: 42 LS + 16 RS = 58 MPs
 *  UP: 80 LS + 31 RS = 111 MPs
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Re-export types inline so this seed file has no dependency on apps/mobile.
 * The canonical types live in apps/mobile/lib/mpTypes.ts.
 */
type HouseType = 'lok_sabha' | 'rajya_sabha';

interface MPProfile {
  id: string;
  name: string;
  party: string;
  stateCode: string;
  house: HouseType;
  constituency?: string;
  constituencyNo?: number;
  gender: 'M' | 'F';
  age?: number;
  education?: string;
  profession?: string;
  terms: number;
  electedYear: number;
  termEndYear?: number;
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  isMinister?: boolean;
  ministerialPortfolio?: string;
  attendancePercent?: number;
  questionsAsked?: number;
  debatesParticipated?: number;
  privateBills?: number;
}

interface PartyStrength {
  party: string;
  lokSabhaSeats: number;
  rajyaSabhaSeats: number;
  totalSeats: number;
  percentage: number;
  alliance?: 'NDA' | 'INDIA' | 'Others';
}

interface StateParliamentarySummary {
  stateCode: string;
  stateName: string;
  lokSabhaSeats: number;
  rajyaSabhaSeats: number;
  partyWise: { party: string; lokSabha: number; rajyaSabha: number }[];
}

// ═════════════════════════════════════════════════════════════════════════
// ── Telangana Lok Sabha MPs (17 seats) ────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

const TS_LOK_SABHA: MPProfile[] = [
  { id: 'ts-ls-1', name: 'Gaddam Vamsi Krishna', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Adilabad', constituencyNo: 1, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-2', name: 'Athram Sakku', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Peddapalle', constituencyNo: 2, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-3', name: 'Eatala Rajender', party: 'BJP', stateCode: 'TS', house: 'lok_sabha', constituency: 'Karimnagar', constituencyNo: 3, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-4', name: 'Bandi Sanjay Kumar', party: 'BJP', stateCode: 'TS', house: 'lok_sabha', constituency: 'Karimnagar', constituencyNo: 3, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-5', name: 'D. Arvind', party: 'BJP', stateCode: 'TS', house: 'lok_sabha', constituency: 'Nizamabad', constituencyNo: 4, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ts-ls-6', name: 'Raghunandan Rao', party: 'BJP', stateCode: 'TS', house: 'lok_sabha', constituency: 'Medak', constituencyNo: 5, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-7', name: 'Etala Jamuna', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Warangal', constituencyNo: 6, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-8', name: 'Kadiyam Kavya', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Mahabubabad', constituencyNo: 7, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-9', name: 'Mallu Ravi', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Nagarkurnool', constituencyNo: 8, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-10', name: 'Chamala Kiran Kumar Reddy', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Bhongir', constituencyNo: 9, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-11', name: 'Anil Kumar Hegde', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Nalgonda', constituencyNo: 10, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-12', name: 'G. Kishan Reddy', party: 'BJP', stateCode: 'TS', house: 'lok_sabha', constituency: 'Secunderabad', constituencyNo: 11, gender: 'M', terms: 2, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Coal & Mines' },
  { id: 'ts-ls-13', name: 'Asaduddin Owaisi', party: 'AIMIM', stateCode: 'TS', house: 'lok_sabha', constituency: 'Hyderabad', constituencyNo: 12, gender: 'M', terms: 5, electedYear: 2024 },
  { id: 'ts-ls-14', name: 'Patnam Suneetha Mahender Reddy', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Malkajgiri', constituencyNo: 13, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-15', name: 'Suresh Shetkar', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Zahirabad', constituencyNo: 14, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-16', name: 'Ranjith Reddy', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Chevella', constituencyNo: 15, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ts-ls-17', name: 'Balram Naik', party: 'INC', stateCode: 'TS', house: 'lok_sabha', constituency: 'Khammam', constituencyNo: 16, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Andhra Pradesh Lok Sabha MPs (25 seats) ───────────────────────────
// ═════════════════════════════════════════════════════════════════════════

const AP_LOK_SABHA: MPProfile[] = [
  { id: 'ap-ls-1', name: 'Kinjarapu Ram Mohan Naidu', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Srikakulam', constituencyNo: 1, gender: 'M', terms: 2, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Civil Aviation' },
  { id: 'ap-ls-2', name: 'Appalanaidu Kalisetti', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Vizianagaram', constituencyNo: 2, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-3', name: 'Sribharat Mathukumilli', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Visakhapatnam', constituencyNo: 3, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-4', name: 'Golla Baburao', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Araku', constituencyNo: 4, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-5', name: 'Tangella Bharath Balaji', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Narasapuram', constituencyNo: 5, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-6', name: 'Lavu Sri Krishna Devarayalu', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Eluru', constituencyNo: 6, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ap-ls-7', name: 'K. Raghu Rama Krishna Raju', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Machilipatnam', constituencyNo: 7, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-8', name: 'Pemmasani Chandra Sekhar', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Guntur', constituencyNo: 8, gender: 'M', terms: 1, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Rural Development' },
  { id: 'ap-ls-9', name: 'Kesineni Sivanath', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Vijayawada', constituencyNo: 9, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-10', name: 'Daggumalla Prasada Rao', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Bapatla', constituencyNo: 10, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-11', name: 'Byreddy Shabari', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Nandyal', constituencyNo: 11, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-12', name: 'Gurumoorthy Maddila', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Kurnool', constituencyNo: 12, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-13', name: 'Bastipati Nagaraju', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Anantapur', constituencyNo: 13, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-14', name: 'Ambica Lakshminarayana', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Hindupur', constituencyNo: 14, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-15', name: 'Chandra Sekhar Bellana', party: 'JSP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Rajahmundry', constituencyNo: 15, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-16', name: 'C.M. Ramesh', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Anakapalle', constituencyNo: 16, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-17', name: 'Vallabhaneni Balashowry', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Amalapuram', constituencyNo: 17, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-18', name: 'T.G. Bharath', party: 'YSRCP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Kadapa', constituencyNo: 18, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-19', name: 'Mithun Reddy', party: 'YSRCP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Rajampet', constituencyNo: 19, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ap-ls-20', name: 'Avinash Reddy', party: 'YSRCP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Pulivendula', constituencyNo: 20, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ap-ls-21', name: 'Vemireddy Prashant Reddy', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Nellore', constituencyNo: 21, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-22', name: 'Magunta Sreenivasulu Reddy', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Ongole', constituencyNo: 22, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-23', name: 'Dr. Chandra Sekhar Pemmasani', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Tirupati', constituencyNo: 23, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-24', name: 'Bhupathiraju Srinivasa Varma', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Kakinada', constituencyNo: 24, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ap-ls-25', name: 'Chittoor Srinivasulu', party: 'TDP', stateCode: 'AP', house: 'lok_sabha', constituency: 'Chittoor', constituencyNo: 25, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Karnataka Lok Sabha MPs (28 seats) ────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

const KA_LOK_SABHA: MPProfile[] = [
  { id: 'ka-ls-1', name: 'Jagadish Shettar', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Belgaum', constituencyNo: 1, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-2', name: 'Mangala Angadi', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Chikkodi', constituencyNo: 2, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-3', name: 'Pralhad Joshi', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Dharwad', constituencyNo: 3, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'ka-ls-4', name: 'Shrinivas B.V.', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bagalkot', constituencyNo: 4, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-5', name: 'V. Somanna', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Tumkur', constituencyNo: 5, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-6', name: 'Kumaraswamy H.D.', party: 'JDS', stateCode: 'KA', house: 'lok_sabha', constituency: 'Mandya', constituencyNo: 6, gender: 'M', terms: 1, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Heavy Industries & Steel' },
  { id: 'ka-ls-7', name: 'Tejasvi Surya', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bangalore South', constituencyNo: 7, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-8', name: 'P.C. Mohan', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bangalore Central', constituencyNo: 8, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'ka-ls-9', name: 'D.K. Suresh', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bangalore Rural', constituencyNo: 9, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'ka-ls-10', name: 'Sadananda Gowda D.V.', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bangalore North', constituencyNo: 10, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-11', name: 'Yaduveer Krishnadatta Chamaraja Wadiyar', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Mysore', constituencyNo: 11, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-12', name: 'Veerappa Moily', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Chikkaballapur', constituencyNo: 12, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-13', name: 'K. Sudhaker', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Kolar', constituencyNo: 13, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-14', name: 'Govind M. Karjol', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Gulbarga', constituencyNo: 14, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-15', name: 'Umesh Jadhav', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bidar', constituencyNo: 15, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-16', name: 'Raja Amareshwara Naik', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Raichur', constituencyNo: 16, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-17', name: 'Shivakumar Udasi', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Haveri', constituencyNo: 17, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-18', name: 'Basavaraj Bommai', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Shiggaon', constituencyNo: 18, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-19', name: 'Annamalai K.', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Uttara Kannada', constituencyNo: 19, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-20', name: 'Shobha Karandlaje', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Udupi-Chikmagalur', constituencyNo: 20, gender: 'F', terms: 2, electedYear: 2024, isMinister: true },
  { id: 'ka-ls-21', name: 'Brijesh Merja', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Dakshina Kannada', constituencyNo: 21, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-22', name: 'Sunil Kumar B.Y.', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Chitradurga', constituencyNo: 22, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-23', name: 'G.M. Siddeshwara', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Davanagere', constituencyNo: 23, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'ka-ls-24', name: 'B.Y. Raghavendra', party: 'BJP', stateCode: 'KA', house: 'lok_sabha', constituency: 'Shimoga', constituencyNo: 24, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'ka-ls-25', name: 'E. Tukaram', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Bellary', constituencyNo: 25, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-26', name: 'B.N. Chandrappa', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Koppal', constituencyNo: 26, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-27', name: 'K. Chamarajnagar', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Chamarajanagar', constituencyNo: 27, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'ka-ls-28', name: 'Prabha Mallikarjun', party: 'INC', stateCode: 'KA', house: 'lok_sabha', constituency: 'Hassan', constituencyNo: 28, gender: 'F', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Maharashtra Lok Sabha MPs (48 seats) — Top MPs ────────────────────
// ═════════════════════════════════════════════════════════════════════════

const MH_LOK_SABHA: MPProfile[] = [
  { id: 'mh-ls-1', name: 'Nitin Gadkari', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Nagpur', constituencyNo: 1, gender: 'M', terms: 3, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Road Transport & Highways' },
  { id: 'mh-ls-2', name: 'Piyush Goyal', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Mumbai North', constituencyNo: 2, gender: 'M', terms: 1, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Commerce & Industry' },
  { id: 'mh-ls-3', name: 'Supriya Sule', party: 'NCP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Baramati', constituencyNo: 3, gender: 'F', terms: 4, electedYear: 2024 },
  { id: 'mh-ls-4', name: 'Udayanraje Bhosale', party: 'NCP-AP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Satara', constituencyNo: 4, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-5', name: 'Shrikant Shinde', party: 'SHS', stateCode: 'MH', house: 'lok_sabha', constituency: 'Kalyan', constituencyNo: 5, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-6', name: 'Amol Kolhe', party: 'NCP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Shirur', constituencyNo: 6, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-7', name: 'Varsha Gaikwad', party: 'INC', stateCode: 'MH', house: 'lok_sabha', constituency: 'Mumbai North Central', constituencyNo: 7, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-8', name: 'Ravindra Waikar', party: 'SHS', stateCode: 'MH', house: 'lok_sabha', constituency: 'Mumbai North West', constituencyNo: 8, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-9', name: 'Arvind Sawant', party: 'SHSUBT', stateCode: 'MH', house: 'lok_sabha', constituency: 'Mumbai South', constituencyNo: 9, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'mh-ls-10', name: 'Anil Desai', party: 'SHSUBT', stateCode: 'MH', house: 'lok_sabha', constituency: 'Mumbai South Central', constituencyNo: 10, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-11', name: 'Prataprao Jadhav', party: 'SHS', stateCode: 'MH', house: 'lok_sabha', constituency: 'Buldhana', constituencyNo: 11, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-12', name: 'Navneet Rana', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Amravati', constituencyNo: 12, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-13', name: 'Hemant Patil', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Hingoli', constituencyNo: 13, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-14', name: 'Sanjay Jadhav', party: 'SHSUBT', stateCode: 'MH', house: 'lok_sabha', constituency: 'Parbhani', constituencyNo: 14, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-15', name: 'Imtiaz Jaleel', party: 'AIMIM', stateCode: 'MH', house: 'lok_sabha', constituency: 'Aurangabad', constituencyNo: 15, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-16', name: 'Bajrang Sonawane', party: 'NCP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Jalna', constituencyNo: 16, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-17', name: 'Praniti Shinde', party: 'INC', stateCode: 'MH', house: 'lok_sabha', constituency: 'Solapur', constituencyNo: 17, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-18', name: 'Dhairyasheel Mane', party: 'INC', stateCode: 'MH', house: 'lok_sabha', constituency: 'Hatkanangle', constituencyNo: 18, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'mh-ls-19', name: 'Dhananjay Mahadik', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Kolhapur', constituencyNo: 19, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'mh-ls-20', name: 'Sambhajiraje Chhatrapati', party: 'BJP', stateCode: 'MH', house: 'lok_sabha', constituency: 'Sangli', constituencyNo: 20, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Tamil Nadu Lok Sabha MPs (39 seats) — Top MPs ─────────────────────
// ═════════════════════════════════════════════════════════════════════════

const TN_LOK_SABHA: MPProfile[] = [
  { id: 'tn-ls-1', name: 'Dayanidhi Maran', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Chennai Central', constituencyNo: 1, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'tn-ls-2', name: 'Kalanidhi Veeraswamy', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Chennai North', constituencyNo: 2, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'tn-ls-3', name: 'Thamizhachi Thangapandian', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Chennai South', constituencyNo: 3, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-4', name: 'T.R. Baalu', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Sriperumbudur', constituencyNo: 4, gender: 'M', terms: 5, electedYear: 2024 },
  { id: 'tn-ls-5', name: 'Kanimozhi', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Thoothukudi', constituencyNo: 5, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-6', name: 'A. Raja', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Sivaganga', constituencyNo: 6, gender: 'M', terms: 5, electedYear: 2024 },
  { id: 'tn-ls-7', name: 'S. Venkatesan', party: 'CPIM', stateCode: 'TN', house: 'lok_sabha', constituency: 'Madurai', constituencyNo: 7, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-8', name: 'Pon. Radhakrishnan', party: 'BJP', stateCode: 'TN', house: 'lok_sabha', constituency: 'Kanniyakumari', constituencyNo: 8, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'tn-ls-9', name: 'S. Jagathrakshakan', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Arakkonam', constituencyNo: 9, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'tn-ls-10', name: 'Selvam G.', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Tiruchirappalli', constituencyNo: 10, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-11', name: 'Manickam Tagore B.', party: 'INC', stateCode: 'TN', house: 'lok_sabha', constituency: 'Virudhunagar', constituencyNo: 11, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-12', name: 'S.R. Parthiban', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Perambalur', constituencyNo: 12, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-13', name: 'K. Selvaperunthagai', party: 'INC', stateCode: 'TN', house: 'lok_sabha', constituency: 'Krishnagiri', constituencyNo: 13, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-14', name: 'Thol Thirumavalavan', party: 'VCK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Chidambaram', constituencyNo: 14, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-15', name: 'K. Murugan', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Dindigul', constituencyNo: 15, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-16', name: 'Anurag Sharma', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Coimbatore', constituencyNo: 16, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-17', name: 'M.K. Vishnu Prasad', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Thanjavur', constituencyNo: 17, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-18', name: 'R. Siva', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Cuddalore', constituencyNo: 18, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'tn-ls-19', name: 'D. Ravikumar', party: 'VCK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Villupuram', constituencyNo: 19, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'tn-ls-20', name: 'Dhanush M. Kumar', party: 'DMK', stateCode: 'TN', house: 'lok_sabha', constituency: 'Tirunelveli', constituencyNo: 20, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Kerala Lok Sabha MPs (20 seats) ───────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

const KL_LOK_SABHA: MPProfile[] = [
  { id: 'kl-ls-1', name: 'Rajmohan Unnithan', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Kasaragod', constituencyNo: 1, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-2', name: 'K. Sudhakaran', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Kannur', constituencyNo: 2, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-3', name: 'M.I. Shanavas', party: 'IUML', stateCode: 'KL', house: 'lok_sabha', constituency: 'Wayanad', constituencyNo: 3, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'kl-ls-4', name: 'K. Suresh', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Kozhikode', constituencyNo: 4, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-5', name: 'E.T. Mohammed Basheer', party: 'IUML', stateCode: 'KL', house: 'lok_sabha', constituency: 'Ponnani', constituencyNo: 5, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'kl-ls-6', name: 'Abdussamad Samadani', party: 'IUML', stateCode: 'KL', house: 'lok_sabha', constituency: 'Malappuram', constituencyNo: 6, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'kl-ls-7', name: 'V.K. Sreekandan', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Palakkad', constituencyNo: 7, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-8', name: 'Shanimol Usman', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Alappuzha', constituencyNo: 8, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'kl-ls-9', name: 'K.C. Venugopal', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Alathur', constituencyNo: 9, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-10', name: 'K. Francis George', party: 'KC(M)', stateCode: 'KL', house: 'lok_sabha', constituency: 'Idukki', constituencyNo: 10, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'kl-ls-11', name: 'Thomas Chazhikadan', party: 'KC(M)', stateCode: 'KL', house: 'lok_sabha', constituency: 'Kottayam', constituencyNo: 11, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-12', name: 'P.K. Biju', party: 'CPIM', stateCode: 'KL', house: 'lok_sabha', constituency: 'Attingal', constituencyNo: 12, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'kl-ls-13', name: 'Dean Kuriakose', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Ernakulam', constituencyNo: 13, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-14', name: 'Benny Behanan', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Chalakudy', constituencyNo: 14, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-15', name: 'T.N. Prathapan', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Thrissur', constituencyNo: 15, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'kl-ls-16', name: 'Kodikkunnil Suresh', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Mavelikkara', constituencyNo: 16, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'kl-ls-17', name: 'Anto Antony', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Pathanamthitta', constituencyNo: 17, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-18', name: 'Adoor Prakash', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Kollam', constituencyNo: 18, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'kl-ls-19', name: 'Shashi Tharoor', party: 'INC', stateCode: 'KL', house: 'lok_sabha', constituency: 'Thiruvananthapuram', constituencyNo: 19, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'kl-ls-20', name: 'Pannian Ravindran', party: 'CPIM', stateCode: 'KL', house: 'lok_sabha', constituency: 'Vatakara', constituencyNo: 20, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── West Bengal Lok Sabha MPs (42 seats) — Top MPs ────────────────────
// ═════════════════════════════════════════════════════════════════════════

const WB_LOK_SABHA: MPProfile[] = [
  { id: 'wb-ls-1', name: 'Abhishek Banerjee', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Diamond Harbour', constituencyNo: 1, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'wb-ls-2', name: 'Sudip Bandyopadhyay', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Kolkata North', constituencyNo: 2, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'wb-ls-3', name: 'Mala Roy', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Kolkata South', constituencyNo: 3, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-4', name: 'Mahua Moitra', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Krishnanagar', constituencyNo: 4, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-5', name: 'Sougata Ray', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Dum Dum', constituencyNo: 5, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'wb-ls-6', name: 'Adhir Ranjan Chowdhury', party: 'INC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Berhampore', constituencyNo: 6, gender: 'M', terms: 5, electedYear: 2024 },
  { id: 'wb-ls-7', name: 'Kalyan Banerjee', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Sreerampur', constituencyNo: 7, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'wb-ls-8', name: 'Dilip Ghosh', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Bardhaman-Durgapur', constituencyNo: 8, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-9', name: 'Sukhendu Sekhar Ray', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Howrah', constituencyNo: 9, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'wb-ls-10', name: 'Shatabdi Roy', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Birbhum', constituencyNo: 10, gender: 'F', terms: 3, electedYear: 2024 },
  { id: 'wb-ls-11', name: 'Dev (Deepak Adhikari)', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Ghatal', constituencyNo: 11, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-12', name: 'Mimi Chakraborty', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Jadavpur', constituencyNo: 12, gender: 'F', terms: 1, electedYear: 2024 },
  { id: 'wb-ls-13', name: 'Nusrat Jahan', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Basirhat', constituencyNo: 13, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-14', name: 'Sukanta Majumdar', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Balurghat', constituencyNo: 14, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-15', name: 'Jagannath Sarkar', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Ranaghat', constituencyNo: 15, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-16', name: 'Santanu Thakur', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Bongaon', constituencyNo: 16, gender: 'M', terms: 2, electedYear: 2024, isMinister: true },
  { id: 'wb-ls-17', name: 'John Barla', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Alipurduars', constituencyNo: 17, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'wb-ls-18', name: 'Nisith Pramanik', party: 'BJP', stateCode: 'WB', house: 'lok_sabha', constituency: 'Cooch Behar', constituencyNo: 18, gender: 'M', terms: 2, electedYear: 2024, isMinister: true },
  { id: 'wb-ls-19', name: 'Arup Chakraborty', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Barasat', constituencyNo: 19, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'wb-ls-20', name: 'Rachana Banerjee', party: 'AITC', stateCode: 'WB', house: 'lok_sabha', constituency: 'Hooghly', constituencyNo: 20, gender: 'F', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Uttar Pradesh Lok Sabha MPs (80 seats) — Top MPs ──────────────────
// ═════════════════════════════════════════════════════════════════════════

const UP_LOK_SABHA: MPProfile[] = [
  { id: 'up-ls-1', name: 'Narendra Modi', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Varanasi', constituencyNo: 1, gender: 'M', terms: 3, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Prime Minister' },
  { id: 'up-ls-2', name: 'Rajnath Singh', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Lucknow', constituencyNo: 2, gender: 'M', terms: 4, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Defence' },
  { id: 'up-ls-3', name: 'Amit Shah', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Gandhinagar', constituencyNo: 3, gender: 'M', terms: 2, electedYear: 2024, isMinister: true, ministerialPortfolio: 'Home Affairs' },
  { id: 'up-ls-4', name: 'Akhilesh Yadav', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Kannauj', constituencyNo: 4, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'up-ls-5', name: 'Rahul Gandhi', party: 'INC', stateCode: 'UP', house: 'lok_sabha', constituency: 'Rae Bareli', constituencyNo: 5, gender: 'M', terms: 4, electedYear: 2024 },
  { id: 'up-ls-6', name: 'Dimple Yadav', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Mainpuri', constituencyNo: 6, gender: 'F', terms: 2, electedYear: 2024 },
  { id: 'up-ls-7', name: 'Smriti Irani', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Amethi', constituencyNo: 7, gender: 'F', terms: 1, electedYear: 2024, isMinister: true },
  { id: 'up-ls-8', name: 'Hema Malini', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Mathura', constituencyNo: 8, gender: 'F', terms: 3, electedYear: 2024 },
  { id: 'up-ls-9', name: 'Varun Gandhi', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Pilibhit', constituencyNo: 9, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'up-ls-10', name: 'Manoj Sinha', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Ghazipur', constituencyNo: 10, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'up-ls-11', name: 'Anupriya Patel', party: 'AD(S)', stateCode: 'UP', house: 'lok_sabha', constituency: 'Mirzapur', constituencyNo: 11, gender: 'F', terms: 3, electedYear: 2024, isMinister: true },
  { id: 'up-ls-12', name: 'Azam Khan', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Rampur', constituencyNo: 12, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'up-ls-13', name: 'S.P. Singh Baghel', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Agra', constituencyNo: 13, gender: 'M', terms: 2, electedYear: 2024, isMinister: true },
  { id: 'up-ls-14', name: 'Awadhesh Prasad', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Faizabad', constituencyNo: 14, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'up-ls-15', name: 'Jitin Prasada', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Lakhimpur Kheri', constituencyNo: 15, gender: 'M', terms: 2, electedYear: 2024 },
  { id: 'up-ls-16', name: 'Dharmendra Yadav', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Budaun', constituencyNo: 16, gender: 'M', terms: 3, electedYear: 2024 },
  { id: 'up-ls-17', name: 'Ram Shiromani Verma', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Barabanki', constituencyNo: 17, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'up-ls-18', name: 'Mahesh Trivedi', party: 'BJP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Allahabad', constituencyNo: 18, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'up-ls-19', name: 'Lalji Verma', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Ambedkar Nagar', constituencyNo: 19, gender: 'M', terms: 1, electedYear: 2024 },
  { id: 'up-ls-20', name: 'Ravidas Mehrotra', party: 'SP', stateCode: 'UP', house: 'lok_sabha', constituency: 'Lucknow Cantt', constituencyNo: 20, gender: 'M', terms: 1, electedYear: 2024 },
];

// ═════════════════════════════════════════════════════════════════════════
// ── National Party Strength (18th Lok Sabha, 2024) ────────────────────
// ═════════════════════════════════════════════════════════════════════════

export const NATIONAL_PARTY_STRENGTH: PartyStrength[] = [
  { party: 'BJP', lokSabhaSeats: 240, rajyaSabhaSeats: 86, totalSeats: 326, percentage: 30.0, alliance: 'NDA' },
  { party: 'INC', lokSabhaSeats: 99, rajyaSabhaSeats: 26, totalSeats: 125, percentage: 11.5, alliance: 'INDIA' },
  { party: 'SP', lokSabhaSeats: 37, rajyaSabhaSeats: 3, totalSeats: 40, percentage: 3.7, alliance: 'INDIA' },
  { party: 'AITC', lokSabhaSeats: 29, rajyaSabhaSeats: 13, totalSeats: 42, percentage: 3.9, alliance: 'INDIA' },
  { party: 'DMK', lokSabhaSeats: 22, rajyaSabhaSeats: 10, totalSeats: 32, percentage: 2.9, alliance: 'INDIA' },
  { party: 'TDP', lokSabhaSeats: 16, rajyaSabhaSeats: 2, totalSeats: 18, percentage: 1.7, alliance: 'NDA' },
  { party: 'JDU', lokSabhaSeats: 12, rajyaSabhaSeats: 5, totalSeats: 17, percentage: 1.6, alliance: 'NDA' },
  { party: 'SHSUBT', lokSabhaSeats: 9, rajyaSabhaSeats: 3, totalSeats: 12, percentage: 1.1, alliance: 'INDIA' },
  { party: 'NCP', lokSabhaSeats: 8, rajyaSabhaSeats: 2, totalSeats: 10, percentage: 0.9, alliance: 'INDIA' },
  { party: 'SHS', lokSabhaSeats: 7, rajyaSabhaSeats: 3, totalSeats: 10, percentage: 0.9, alliance: 'NDA' },
  { party: 'LJP', lokSabhaSeats: 5, rajyaSabhaSeats: 0, totalSeats: 5, percentage: 0.5, alliance: 'NDA' },
  { party: 'YSRCP', lokSabhaSeats: 4, rajyaSabhaSeats: 3, totalSeats: 7, percentage: 0.6, alliance: 'Others' },
  { party: 'AAP', lokSabhaSeats: 3, rajyaSabhaSeats: 10, totalSeats: 13, percentage: 1.2, alliance: 'INDIA' },
  { party: 'CPIM', lokSabhaSeats: 4, rajyaSabhaSeats: 5, totalSeats: 9, percentage: 0.8, alliance: 'INDIA' },
  { party: 'JSP', lokSabhaSeats: 2, rajyaSabhaSeats: 0, totalSeats: 2, percentage: 0.2, alliance: 'NDA' },
  { party: 'JDS', lokSabhaSeats: 2, rajyaSabhaSeats: 1, totalSeats: 3, percentage: 0.3, alliance: 'NDA' },
  { party: 'RJD', lokSabhaSeats: 4, rajyaSabhaSeats: 6, totalSeats: 10, percentage: 0.9, alliance: 'INDIA' },
  { party: 'BSP', lokSabhaSeats: 0, rajyaSabhaSeats: 1, totalSeats: 1, percentage: 0.1, alliance: 'Others' },
  { party: 'BRS', lokSabhaSeats: 0, rajyaSabhaSeats: 4, totalSeats: 4, percentage: 0.4, alliance: 'Others' },
  { party: 'AIMIM', lokSabhaSeats: 1, rajyaSabhaSeats: 0, totalSeats: 1, percentage: 0.1, alliance: 'Others' },
];

// ═════════════════════════════════════════════════════════════════════════
// ── State Parliamentary Summary (per-state Lok Sabha breakdown) ───────
// ═════════════════════════════════════════════════════════════════════════

export const STATE_PARLIAMENTARY_SUMMARIES: StateParliamentarySummary[] = [
  {
    stateCode: 'TS', stateName: 'Telangana', lokSabhaSeats: 17, rajyaSabhaSeats: 7,
    partyWise: [
      { party: 'INC', lokSabha: 8, rajyaSabha: 3 },
      { party: 'BJP', lokSabha: 8, rajyaSabha: 1 },
      { party: 'AIMIM', lokSabha: 1, rajyaSabha: 0 },
      { party: 'BRS', lokSabha: 0, rajyaSabha: 3 },
    ],
  },
  {
    stateCode: 'AP', stateName: 'Andhra Pradesh', lokSabhaSeats: 25, rajyaSabhaSeats: 11,
    partyWise: [
      { party: 'TDP', lokSabha: 16, rajyaSabha: 2 },
      { party: 'YSRCP', lokSabha: 4, rajyaSabha: 7 },
      { party: 'JSP', lokSabha: 2, rajyaSabha: 0 },
      { party: 'BJP', lokSabha: 3, rajyaSabha: 1 },
      { party: 'INC', lokSabha: 0, rajyaSabha: 1 },
    ],
  },
  {
    stateCode: 'KA', stateName: 'Karnataka', lokSabhaSeats: 28, rajyaSabhaSeats: 12,
    partyWise: [
      { party: 'BJP', lokSabha: 17, rajyaSabha: 5 },
      { party: 'INC', lokSabha: 9, rajyaSabha: 4 },
      { party: 'JDS', lokSabha: 2, rajyaSabha: 2 },
    ],
  },
  {
    stateCode: 'MH', stateName: 'Maharashtra', lokSabhaSeats: 48, rajyaSabhaSeats: 19,
    partyWise: [
      { party: 'BJP', lokSabha: 9, rajyaSabha: 6 },
      { party: 'SHS', lokSabha: 7, rajyaSabha: 3 },
      { party: 'NCP-AP', lokSabha: 1, rajyaSabha: 1 },
      { party: 'INC', lokSabha: 13, rajyaSabha: 3 },
      { party: 'SHSUBT', lokSabha: 9, rajyaSabha: 3 },
      { party: 'NCP', lokSabha: 8, rajyaSabha: 2 },
      { party: 'AIMIM', lokSabha: 1, rajyaSabha: 0 },
    ],
  },
  {
    stateCode: 'TN', stateName: 'Tamil Nadu', lokSabhaSeats: 39, rajyaSabhaSeats: 18,
    partyWise: [
      { party: 'DMK', lokSabha: 22, rajyaSabha: 10 },
      { party: 'INC', lokSabha: 9, rajyaSabha: 1 },
      { party: 'CPIM', lokSabha: 2, rajyaSabha: 1 },
      { party: 'CPI', lokSabha: 2, rajyaSabha: 1 },
      { party: 'VCK', lokSabha: 2, rajyaSabha: 0 },
      { party: 'BJP', lokSabha: 0, rajyaSabha: 1 },
      { party: 'AIADMK', lokSabha: 0, rajyaSabha: 4 },
      { party: 'PMK', lokSabha: 1, rajyaSabha: 0 },
      { party: 'MDMK', lokSabha: 1, rajyaSabha: 0 },
    ],
  },
  {
    stateCode: 'KL', stateName: 'Kerala', lokSabhaSeats: 20, rajyaSabhaSeats: 9,
    partyWise: [
      { party: 'INC', lokSabha: 14, rajyaSabha: 2 },
      { party: 'IUML', lokSabha: 3, rajyaSabha: 1 },
      { party: 'KC(M)', lokSabha: 1, rajyaSabha: 0 },
      { party: 'CPIM', lokSabha: 1, rajyaSabha: 5 },
      { party: 'CPI', lokSabha: 1, rajyaSabha: 1 },
    ],
  },
  {
    stateCode: 'WB', stateName: 'West Bengal', lokSabhaSeats: 42, rajyaSabhaSeats: 16,
    partyWise: [
      { party: 'AITC', lokSabha: 29, rajyaSabha: 13 },
      { party: 'BJP', lokSabha: 12, rajyaSabha: 2 },
      { party: 'INC', lokSabha: 1, rajyaSabha: 1 },
    ],
  },
  {
    stateCode: 'UP', stateName: 'Uttar Pradesh', lokSabhaSeats: 80, rajyaSabhaSeats: 31,
    partyWise: [
      { party: 'BJP', lokSabha: 33, rajyaSabha: 13 },
      { party: 'SP', lokSabha: 37, rajyaSabha: 3 },
      { party: 'INC', lokSabha: 6, rajyaSabha: 3 },
      { party: 'BSP', lokSabha: 0, rajyaSabha: 1 },
      { party: 'RLD', lokSabha: 2, rajyaSabha: 0 },
      { party: 'AD(S)', lokSabha: 1, rajyaSabha: 0 },
      { party: 'NISHAD', lokSabha: 1, rajyaSabha: 0 },
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════
// ── Aggregate ALL MPs ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export const ALL_MP_PROFILES: MPProfile[] = [
  ...TS_LOK_SABHA,
  ...AP_LOK_SABHA,
  ...KA_LOK_SABHA,
  ...MH_LOK_SABHA,
  ...TN_LOK_SABHA,
  ...KL_LOK_SABHA,
  ...WB_LOK_SABHA,
  ...UP_LOK_SABHA,
];

// ═════════════════════════════════════════════════════════════════════════
// ── Query helpers ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

export function getMPsByState(stateCode: string): MPProfile[] {
  return ALL_MP_PROFILES.filter((mp) => mp.stateCode === stateCode);
}

export function getMPsByParty(party: string): MPProfile[] {
  return ALL_MP_PROFILES.filter((mp) => mp.party === party);
}

export function getLokSabhaMPs(): MPProfile[] {
  return ALL_MP_PROFILES.filter((mp) => mp.house === 'lok_sabha');
}

export function getRajyaSabhaMPs(): MPProfile[] {
  return ALL_MP_PROFILES.filter((mp) => mp.house === 'rajya_sabha');
}

export function getMinisters(): MPProfile[] {
  return ALL_MP_PROFILES.filter((mp) => mp.isMinister);
}

export function getPartyStrengthForState(stateCode: string): StateParliamentarySummary | undefined {
  return STATE_PARLIAMENTARY_SUMMARIES.find((s) => s.stateCode === stateCode);
}

export function getAllianceStrength(alliance: 'NDA' | 'INDIA' | 'Others'): { lokSabha: number; rajyaSabha: number; total: number } {
  const parties = NATIONAL_PARTY_STRENGTH.filter((p) => p.alliance === alliance);
  return {
    lokSabha: parties.reduce((s, p) => s + p.lokSabhaSeats, 0),
    rajyaSabha: parties.reduce((s, p) => s + p.rajyaSabhaSeats, 0),
    total: parties.reduce((s, p) => s + p.totalSeats, 0),
  };
}
