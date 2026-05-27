/**
 * Jammu Kashmir — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface JKElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const JK_ELECTION_HISTORY: JKElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'JKNC': 42,
      'BJP': 29,
      'INC': 6,
      'PDP': 3,
      'AAP': 1,
      'Others': 9,
    },
    totalSeats: 90,
    rulingParty: 'JKNC',
  },
];

export function getJKElectionByYear(year: number) {
  return JK_ELECTION_HISTORY.find(e => e.year === year);
}

export function getJKPartyTrend(party: string) {
  return JK_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
