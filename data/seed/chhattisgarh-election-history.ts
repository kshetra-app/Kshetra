/**
 * Chhattisgarh — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface CGElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const CG_ELECTION_HISTORY: CGElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'BJP': 50,
      'INC': 30,
      'GGP': 1,
    },
    totalSeats: 81,
    rulingParty: 'BJP',
  },
];

export function getCGElectionByYear(year: number) {
  return CG_ELECTION_HISTORY.find(e => e.year === year);
}

export function getCGPartyTrend(party: string) {
  return CG_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
