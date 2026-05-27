/**
 * Kerala — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface KLElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const KL_ELECTION_HISTORY: KLElectionResult[] = [
  {
    year: 2021,
    partyResults: {
      'CPIM': 62,
      'INC': 21,
      'IUML': 15,
      'KEC': 4,
      'CPI': 2,
      'RSP': 1,
      'NCP': 1,
      'Others': 34,
    },
    totalSeats: 140,
    rulingParty: 'CPIM',
  },
];

export function getKLElectionByYear(year: number) {
  return KL_ELECTION_HISTORY.find(e => e.year === year);
}

export function getKLPartyTrend(party: string) {
  return KL_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
