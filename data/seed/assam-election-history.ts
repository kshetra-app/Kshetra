/**
 * Assam — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface ASElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const AS_ELECTION_HISTORY: ASElectionResult[] = [
  {
    year: 2026,
    partyResults: {
      'BJP': 73,
      'INC': 16,
      'AGP': 10,
      'BPF': 9,
      'AITC': 2,
      'RD': 2,
    },
    totalSeats: 112,
    rulingParty: 'BJP',
  },
];

export function getASElectionByYear(year: number) {
  return AS_ELECTION_HISTORY.find(e => e.year === year);
}

export function getASPartyTrend(party: string) {
  return AS_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
