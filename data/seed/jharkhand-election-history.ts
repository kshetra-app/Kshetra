/**
 * Jharkhand — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface JHElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const JH_ELECTION_HISTORY: JHElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'JMM': 32,
      'BJP': 20,
      'INC': 13,
      'RJD': 3,
      'CPI(ML': 2,
      'LJPV': 1,
      'JD(U)': 1,
      'AP': 1,
    },
    totalSeats: 73,
    rulingParty: 'JMM',
  },
];

export function getJHElectionByYear(year: number) {
  return JH_ELECTION_HISTORY.find(e => e.year === year);
}

export function getJHPartyTrend(party: string) {
  return JH_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
