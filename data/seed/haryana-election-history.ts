/**
 * Haryana — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface HRElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const HR_ELECTION_HISTORY: HRElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'BJP': 41,
      'INC': 35,
      'IND': 3,
      'INLD': 1,
    },
    totalSeats: 80,
    rulingParty: 'BJP',
  },
];

export function getHRElectionByYear(year: number) {
  return HR_ELECTION_HISTORY.find(e => e.year === year);
}

export function getHRPartyTrend(party: string) {
  return HR_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
