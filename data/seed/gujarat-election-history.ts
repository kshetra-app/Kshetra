/**
 * Gujarat — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface GJElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const GJ_ELECTION_HISTORY: GJElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'BJP': 145,
      'INC': 15,
      'AAP': 5,
      'IND': 3,
      'SP': 1,
    },
    totalSeats: 169,
    rulingParty: 'BJP',
  },
];

export function getGJElectionByYear(year: number) {
  return GJ_ELECTION_HISTORY.find(e => e.year === year);
}

export function getGJPartyTrend(party: string) {
  return GJ_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
