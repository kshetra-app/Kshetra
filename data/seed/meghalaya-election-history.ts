/**
 * Meghalaya — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface MLElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const ML_ELECTION_HISTORY: MLElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'NPP': 25,
      'UDP': 11,
      'AITC': 5,
      'VTPP': 4,
      'INC': 3,
      'IND': 2,
      'PDF': 2,
      'HSPDP': 2,
      'BJP': 1,
    },
    totalSeats: 55,
    rulingParty: 'NPP',
  },
];

export function getMLElectionByYear(year: number) {
  return ML_ELECTION_HISTORY.find(e => e.year === year);
}

export function getMLPartyTrend(party: string) {
  return ML_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
