/**
 * Himachal Pradesh — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface HPElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const HP_ELECTION_HISTORY: HPElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'INC': 39,
      'BJP': 28,
      'IND': 3,
    },
    totalSeats: 70,
    rulingParty: 'INC',
  },
];

export function getHPElectionByYear(year: number) {
  return HP_ELECTION_HISTORY.find(e => e.year === year);
}

export function getHPPartyTrend(party: string) {
  return HP_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
