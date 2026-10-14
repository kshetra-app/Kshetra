/**
 * Bihar — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface BRElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const BR_ELECTION_HISTORY: BRElectionResult[] = [
  {
    year: 2025,
    partyResults: {
      'BJP': 89,
      'JDU': 85,
      'RJD': 25,
      'LJPRV': 19,
      'INC': 6,
      'HAMS': 5,
      'AIMIM': 5,
      'RLM': 4,
      'CPIML': 2,
      'CPIM': 1,
      'BSP': 1,
      'IIP': 1,
    },
    totalSeats: 243,
    rulingParty: 'NDA',
  },
  {
    year: 2020,
    partyResults: {
      'RJD': 75,
      'BJP': 74,
      'JDU': 43,
      'INC': 19,
      'HAM': 4,
      'VIP': 4,
      'CPI': 2,
      'CPIM': 2,
      'Others': 20,
    },
    totalSeats: 243,
    rulingParty: 'NDA',
  },
];

export function getBRElectionByYear(year: number) {
  return BR_ELECTION_HISTORY.find(e => e.year === year);
}

export function getBRPartyTrend(party: string) {
  return BR_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
