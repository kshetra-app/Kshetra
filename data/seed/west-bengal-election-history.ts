/**
 * West Bengal — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface WBElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const WB_ELECTION_HISTORY: WBElectionResult[] = [
  {
    year: 2021,
    partyResults: {
      'AITC': 213,
      'BJP': 77,
      'ISF': 1,
      'Others': 3,
    },
    totalSeats: 294,
    rulingParty: 'AITC',
  },
];

export function getWBElectionByYear(year: number) {
  return WB_ELECTION_HISTORY.find(e => e.year === year);
}

export function getWBPartyTrend(party: string) {
  return WB_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
