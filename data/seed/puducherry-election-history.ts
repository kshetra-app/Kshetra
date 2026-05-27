/**
 * Puducherry — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface PYElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const PY_ELECTION_HISTORY: PYElectionResult[] = [
  {
    year: 2026,
    partyResults: {
      'AITC': 12,
      'BJP': 4,
      'DMK': 3,
      'IND': 3,
      'LJK(': 1,
      'TVK': 1,
      'NMK': 1,
      'AIADMK': 1,
      'INC': 1,
    },
    totalSeats: 27,
    rulingParty: 'AITC',
  },
];

export function getPYElectionByYear(year: number) {
  return PY_ELECTION_HISTORY.find(e => e.year === year);
}

export function getPYPartyTrend(party: string) {
  return PY_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
