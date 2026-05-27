/**
 * Mizoram — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface MZElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const MZ_ELECTION_HISTORY: MZElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'ZPM': 23,
      'MNF': 10,
      'INC': 1,
      'BJP': 1,
    },
    totalSeats: 35,
    rulingParty: 'ZPM',
  },
];

export function getMZElectionByYear(year: number) {
  return MZ_ELECTION_HISTORY.find(e => e.year === year);
}

export function getMZPartyTrend(party: string) {
  return MZ_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
