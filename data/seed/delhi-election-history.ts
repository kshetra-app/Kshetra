/**
 * Delhi — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface DLElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const DL_ELECTION_HISTORY: DLElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'AAP': 117,
      'BJP': 93,
      'INC': 8,
      'IND': 3,
    },
    totalSeats: 221,
    rulingParty: 'AAP',
  },
];

export function getDLElectionByYear(year: number) {
  return DL_ELECTION_HISTORY.find(e => e.year === year);
}

export function getDLPartyTrend(party: string) {
  return DL_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
