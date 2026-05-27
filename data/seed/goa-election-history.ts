/**
 * Goa — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface GAElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const GA_ELECTION_HISTORY: GAElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'BJP': 16,
      'INC': 10,
      'AAP': 2,
      'IND': 2,
      'MG': 2,
      'GFP': 1,
      'RGP': 1,
    },
    totalSeats: 34,
    rulingParty: 'BJP',
  },
];

export function getGAElectionByYear(year: number) {
  return GA_ELECTION_HISTORY.find(e => e.year === year);
}

export function getGAPartyTrend(party: string) {
  return GA_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
