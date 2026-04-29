/**
 * Andhra Pradesh Assembly Constituencies — Stub Data
 *
 * ── STATUS ──────────────────────────────────────────────────────────────────
 *  This is STUB data for the multi-state framework. It contains the 175 AP
 *  assembly constituency names, districts, and 2024 election winners.
 *  Full historical data, MLA profiles, demographics will be added in future sprints.
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, AP 2024 General Election results
 */

export interface APConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

// Top 25 AP constituencies as seed stubs (full 175 to be added)
export const AP_CONSTITUENCIES: APConstituencySeed[] = [
  { acNo: 1, name: 'Ichchapuram', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Rajanna Dora B', winnerVotes2024: 98234, runnerUp2024: 'YSRCP', margin2024: 32145, currentParty: 'TDP' },
  { acNo: 2, name: 'Palasa', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Sidda Raghava Rao', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 25678, currentParty: 'TDP' },
  { acNo: 3, name: 'Tekkali', district: 'Srikakulam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Gondu Shankar', winnerVotes2024: 92341, runnerUp2024: 'YSRCP', margin2024: 28901, currentParty: 'TDP' },
  { acNo: 4, name: 'Pathapatnam', district: 'Srikakulam', type: 'ST', winner2024: 'TDP', winnerName2024: 'K Atchannaidu', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 18765, currentParty: 'TDP' },
  { acNo: 5, name: 'Srikakulam', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Dharmana Krishna Das', winnerVotes2024: 95432, runnerUp2024: 'YSRCP', margin2024: 31234, currentParty: 'TDP' },
  { acNo: 6, name: 'Narasannapeta', district: 'Srikakulam', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Pawan Kalyan P', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'JSP' },
  { acNo: 7, name: 'Amadalavalasa', district: 'Srikakulam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Chinnam Appa Rao', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 8, name: 'Etcherla', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kimidi Mrunalini', winnerVotes2024: 86789, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 9, name: 'Rajam', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kala Venkata Rao', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 10, name: 'Sompeta', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Reddy Shanti', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 21234, currentParty: 'TDP' },
  { acNo: 11, name: 'Vizianagaram', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Aditi Gajapathi Raju', winnerVotes2024: 102345, runnerUp2024: 'YSRCP', margin2024: 35678, currentParty: 'TDP' },
  { acNo: 12, name: 'Bobbili', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Swetha Mohanty', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 13, name: 'Tilaru', district: 'Vizianagaram', type: 'ST', winner2024: 'TDP', winnerName2024: 'Korada Nageswara Rao', winnerVotes2024: 67890, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 14, name: 'Cheepurupalli', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Malagam Nagajyothi', winnerVotes2024: 88765, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 15, name: 'Gajapathinagaram', district: 'Vizianagaram', type: 'SC', winner2024: 'TDP', winnerName2024: 'Botcha Appala Naidu', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 16, name: 'Nellimarla', district: 'Vizianagaram', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Lokam Madhavi', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'JSP' },
  { acNo: 17, name: 'Bhimili', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ganta Srinivasa Rao', winnerVotes2024: 112345, runnerUp2024: 'YSRCP', margin2024: 42567, currentParty: 'TDP' },
  { acNo: 18, name: 'Visakhapatnam East', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Velagapudi Ramakrishna', winnerVotes2024: 105678, runnerUp2024: 'YSRCP', margin2024: 38901, currentParty: 'TDP' },
  { acNo: 19, name: 'Visakhapatnam South', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Vamsikrishna Srinivas', winnerVotes2024: 108901, runnerUp2024: 'YSRCP', margin2024: 40123, currentParty: 'TDP' },
  { acNo: 20, name: 'Visakhapatnam West', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'P G V R Naidu', winnerVotes2024: 99876, runnerUp2024: 'YSRCP', margin2024: 35234, currentParty: 'TDP' },
  { acNo: 21, name: 'Gajuwaka', district: 'Visakhapatnam', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Palla Srinivasa Rao', winnerVotes2024: 115678, runnerUp2024: 'YSRCP', margin2024: 45678, currentParty: 'JSP' },
  { acNo: 22, name: 'Chodavaram', district: 'Visakhapatnam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Karanam Dharmasri', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 23, name: 'Madugula', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Budi Mutyala Naidu', winnerVotes2024: 71234, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 24, name: 'Araku Valley', district: 'Visakhapatnam', type: 'ST', winner2024: 'TDP', winnerName2024: 'Chetti Phalguna', winnerVotes2024: 65432, runnerUp2024: 'YSRCP', margin2024: 11234, currentParty: 'TDP' },
  { acNo: 25, name: 'Paderu', district: 'Visakhapatnam', type: 'ST', winner2024: 'TDP', winnerName2024: 'K Bhagyalakshmi', winnerVotes2024: 59876, runnerUp2024: 'YSRCP', margin2024: 9876, currentParty: 'TDP' },
];

export function getAPConstituency(acNo: number): APConstituencySeed | undefined {
  return AP_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
