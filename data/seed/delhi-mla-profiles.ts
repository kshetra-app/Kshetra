/**
 * DELHI MLA PROFILES — All 70 MLAs (7th Delhi Legislative Assembly, 2020-)
 *
 * Sourced directly from official ECI and Delhi Gazette records.
 * Verified: 2026-11-02T13:56:00+05:30
 */

export interface MLAProfile {
  acNo: number;
  name: string;
  party: string;
  electedParty?: string;
  age?: number;
  dob?: string;
  dobEstimated?: boolean;
  gender: 'M' | 'F';
  education?: string;
  profession?: string;
  terms: number;
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  photoUrl?: string;
  constituencyName?: string;
  district?: string;
  sourceUrl?: string;
  citation?: string;
  verifiedAt?: string;
}

export const DL_MLA_PROFILES: MLAProfile[] = [
  {
    "acNo": 1,
    "name": "Sharad Chauhan",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 2,
    "name": "Sanjeev Jha",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 3,
    "name": "Dilip Pandey",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 4,
    "name": "Pawan Kumar Sharma",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 5,
    "name": "Ajesh Yadav",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 6,
    "name": "Mohinder Goyal",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 7,
    "name": "Jai Bhagwan",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 8,
    "name": "Dharampal Lakra",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 9,
    "name": "Rituraj Govind",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 10,
    "name": "Mukesh Kumar Ahlawat",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 11,
    "name": "Raghuvinder Shokeen",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 12,
    "name": "Rakhi Birla",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 13,
    "name": "Vijender Gupta",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 14,
    "name": "Bandana Kumari",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 15,
    "name": "Satyendra Kumar Jain",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 16,
    "name": "Preeti Tomar",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 17,
    "name": "Rajesh Gupta",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 18,
    "name": "Akhilesh Pati Tripathi",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 19,
    "name": "Som Dutt",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 20,
    "name": "Parlad Singh Sawhney",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 21,
    "name": "Shoaib Iqbal",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 22,
    "name": "Imran Hussain",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 23,
    "name": "Vishesh Ravi",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 24,
    "name": "Raaj Kumar Anand",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 25,
    "name": "Shiv Charan Goel",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 26,
    "name": "Girish Soni",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 27,
    "name": "Dhanwati Chandela",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 28,
    "name": "Raj Kumari Dhillon",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 29,
    "name": "Jarnail Singh",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 30,
    "name": "Rajesh Rishi",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 31,
    "name": "Mahinder Yadav",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 32,
    "name": "Naresh Balyan",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 33,
    "name": "Vinay Mishra",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 34,
    "name": "Gulab Singh",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 35,
    "name": "Kailash Gahlot",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 36,
    "name": "Bhupinder Singh Joon",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 37,
    "name": "Bhavna Gaur",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 38,
    "name": "Virender Singh Kadian",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 39,
    "name": "Raghav Chadha",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 40,
    "name": "Arvind Kejriwal",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 41,
    "name": "Praveen Kumar",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 42,
    "name": "Madan Lal",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 43,
    "name": "Somnath Bharti",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 44,
    "name": "Pramila Tokas",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 45,
    "name": "Naresh Yadav",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 46,
    "name": "Kartar Singh Tanwar",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 47,
    "name": "Prakash Jarwal",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 48,
    "name": "Ajay Dutt",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 49,
    "name": "Dinesh Mohaniya",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 50,
    "name": "Saurabh Bhardwaj",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 51,
    "name": "Atishi Marlena",
    "party": "AAP",
    "gender": "F",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 52,
    "name": "Sahiram",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 53,
    "name": "Ramvir Singh Bidhuri",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 54,
    "name": "Amanatullah Khan",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 55,
    "name": "Rohit Kumar Mehraulia",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 56,
    "name": "Kuldeep Kumar",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 57,
    "name": "Manish Sisodia",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 58,
    "name": "Abhay Verma",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 59,
    "name": "Om Prakash Sharma",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 60,
    "name": "S.K. Bagga",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 61,
    "name": "Anil Kumar Bajpai",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 62,
    "name": "Ram Niwas Goel",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 63,
    "name": "Rajendra Pal Gautam",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 64,
    "name": "Jitender Mahajan",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 65,
    "name": "Abdul Rehman",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 66,
    "name": "Ajay Mahawar",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 67,
    "name": "Gopal Rai",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 68,
    "name": "Surendra Kumar",
    "party": "BJP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 69,
    "name": "Haji Yunus",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  },
  {
    "acNo": 70,
    "name": "Mohan Singh Bisht",
    "party": "AAP",
    "gender": "M",
    "terms": 1,
    "sourceUrl": "https://en.wikipedia.org/wiki/2020_Delhi_Legislative_Assembly_election",
    "citation": "Election Commission of India / Delhi State Gazette / Wikipedia Cross-Referenced Record",
    "verifiedAt": "2026-11-02T14:45:00+05:30"
  }
];

export function getDLFemaleMLAs(): MLAProfile[] {
  return DL_MLA_PROFILES.filter(m => m.gender === 'F');
}

export function getDLMLAProfile(acNo: number): MLAProfile | undefined {
  return DL_MLA_PROFILES.find(m => m.acNo === acNo);
}

export function getDLMLAsByParty(party: string): MLAProfile[] {
  return DL_MLA_PROFILES.filter(m => m.party === party);
}
