/**
 * Rajasthan — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface RJElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const RJ_ELECTION_HISTORY: RJElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'BJP': 109,
      'INC': 62,
      'IND': 8,
      'BAP': 4,
      'BSP': 2,
      'RLD': 1,
      'RJD': 1,
    },
    totalSeats: 187,
    rulingParty: 'BJP',
  },
];

export function getRJElectionByYear(year: number) {
  return RJ_ELECTION_HISTORY.find(e => e.year === year);
}

export function getRJPartyTrend(party: string) {
  return RJ_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
