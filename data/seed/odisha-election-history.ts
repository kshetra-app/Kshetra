/**
 * Odisha — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface ODElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const OD_ELECTION_HISTORY: ODElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'BJP': 69,
      'BJD': 49,
      'INC': 10,
      'IND': 3,
      'CPIM': 1,
    },
    totalSeats: 132,
    rulingParty: 'BJP',
  },
];

export function getODElectionByYear(year: number) {
  return OD_ELECTION_HISTORY.find(e => e.year === year);
}

export function getODPartyTrend(party: string) {
  return OD_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
