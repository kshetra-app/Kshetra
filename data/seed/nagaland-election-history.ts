/**
 * Nagaland — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface NLElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const NL_ELECTION_HISTORY: NLElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'NDPP': 25,
      'BJP': 10,
      'NPP': 5,
      'NCP': 5,
      'IND': 4,
      'RPI(': 2,
      'LJPV': 2,
      'NPF': 1,
      'JD(U)': 1,
    },
    totalSeats: 55,
    rulingParty: 'NDPP',
  },
];

export function getNLElectionByYear(year: number) {
  return NL_ELECTION_HISTORY.find(e => e.year === year);
}

export function getNLPartyTrend(party: string) {
  return NL_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
