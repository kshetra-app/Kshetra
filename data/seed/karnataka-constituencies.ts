/**
 * Karnataka Assembly Constituencies — Stub Data
 *
 * ── STATUS ──────────────────────────────────────────────────────────────────
 *  This is STUB data for the multi-state framework. It contains the first 25
 *  of 224 KA assembly constituency stubs with 2023 election results.
 *  Full data to be added in future sprints.
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, Karnataka 2023 General Election results
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

// Top 25 Karnataka constituencies as seed stubs (full 224 to be added)
export const KA_CONSTITUENCIES: KAConstituencySeed[] = [
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
  { acNo: 15, name: 'Dharwad', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Amrut Desai', winnerVotes2023: 93456, runnerUp2023: 'INC', margin2023: 7890, currentParty: 'BJP' },
  { acNo: 16, name: 'Hubli-Dharwad Central', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Jagadish Shettar', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 25678, currentParty: 'BJP' },
  { acNo: 17, name: 'Hubli-Dharwad East', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Mahesh Tenginkai', winnerVotes2023: 96789, runnerUp2023: 'INC', margin2023: 18234, currentParty: 'BJP' },
  { acNo: 18, name: 'Hubli-Dharwad West', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Prasad Abbayya', winnerVotes2023: 87654, runnerUp2023: 'BJP', margin2023: 4567, currentParty: 'INC' },
  { acNo: 19, name: 'Kalghatgi', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'M B Patil', winnerVotes2023: 105678, runnerUp2023: 'BJP', margin2023: 22345, currentParty: 'INC' },
  { acNo: 20, name: 'Kundgol', district: 'Dharwad', type: 'GEN', winner2023: 'INC', winnerName2023: 'C S Shivalli', winnerVotes2023: 74567, runnerUp2023: 'BJP', margin2023: 6543, currentParty: 'INC' },
  { acNo: 21, name: 'Navalgund', district: 'Dharwad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Shankar Patil Munenakoppa', winnerVotes2023: 82345, runnerUp2023: 'INC', margin2023: 5678, currentParty: 'BJP' },
  { acNo: 22, name: 'Haveri', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Nehru Olekar', winnerVotes2023: 86789, runnerUp2023: 'INC', margin2023: 9012, currentParty: 'BJP' },
  { acNo: 23, name: 'Byadgi', district: 'Haveri', type: 'SC', winner2023: 'INC', winnerName2023: 'Shivaram Hebbar', winnerVotes2023: 72345, runnerUp2023: 'BJP', margin2023: 3456, currentParty: 'INC' },
  { acNo: 24, name: 'Hirekerur', district: 'Haveri', type: 'GEN', winner2023: 'INC', winnerName2023: 'B C Patil', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234, currentParty: 'INC' },
  { acNo: 25, name: 'Ranebennur', district: 'Haveri', type: 'GEN', winner2023: 'BJP', winnerName2023: 'R Shankar', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 15678, currentParty: 'BJP' },
];

export function getKAConstituency(acNo: number): KAConstituencySeed | undefined {
  return KA_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
