/**
 * Madhya Pradesh — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface MPElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const MP_ELECTION_HISTORY: MPElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'BJP': 150,
      'INC': 57,
      'BAP': 1,
    },
    totalSeats: 208,
    rulingParty: 'BJP',
  },
];

export function getMPElectionByYear(year: number) {
  return MP_ELECTION_HISTORY.find(e => e.year === year);
}

export function getMPPartyTrend(party: string) {
  return MP_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
