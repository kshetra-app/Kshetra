/**
 * Tamil Nadu — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface TNElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const TN_ELECTION_HISTORY: TNElectionResult[] = [
  {
    year: 2026,
    partyResults: {
      'TVK': 99,
      'DMK': 52,
      'AIADMK': 41,
      'PMK': 4,
      'INC': 4,
      'IUML': 2,
      'CPIM': 2,
      'BJP': 1,
      'Others': 29,
    },
    totalSeats: 234,
    rulingParty: 'TVK',
  },
  {
    year: 2021,
    partyResults: {
      'DMK': 133,
      'AIADMK': 66,
      'INC': 18,
      'PMK': 5,
      'BJP': 4,
      'CPIM': 2,
      'CPI': 2,
      'VCK': 4,
    },
    totalSeats: 234,
    rulingParty: 'DMK',
  },
];

export function getTNElectionByYear(year: number) {
  return TN_ELECTION_HISTORY.find(e => e.year === year);
}

export function getTNPartyTrend(party: string) {
  return TN_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
