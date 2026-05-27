/**
 * Manipur — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface MNElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const MN_ELECTION_HISTORY: MNElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'BJP': 28,
      'JD(U)': 6,
      'NPP': 6,
      'NPF': 5,
      'INC': 4,
      'IND': 3,
      'KPA': 2,
    },
    totalSeats: 54,
    rulingParty: 'BJP',
  },
];

export function getMNElectionByYear(year: number) {
  return MN_ELECTION_HISTORY.find(e => e.year === year);
}

export function getMNPartyTrend(party: string) {
  return MN_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
