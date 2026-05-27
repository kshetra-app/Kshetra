/**
 * Arunachal Pradesh — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface ARElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const AR_ELECTION_HISTORY: ARElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'BJP': 42,
      'NCP': 3,
      'NPP': 3,
      'PPA': 2,
      'IND': 2,
      'INC': 1,
    },
    totalSeats: 53,
    rulingParty: 'BJP',
  },
];

export function getARElectionByYear(year: number) {
  return AR_ELECTION_HISTORY.find(e => e.year === year);
}

export function getARPartyTrend(party: string) {
  return AR_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
