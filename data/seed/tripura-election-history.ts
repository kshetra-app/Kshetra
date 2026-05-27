/**
 * Tripura — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface TRElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const TR_ELECTION_HISTORY: TRElectionResult[] = [
  {
    year: 2023,
    partyResults: {
      'BJP': 32,
      'TMP': 13,
      'CPIM': 9,
      'INC': 2,
      'IPFT': 1,
    },
    totalSeats: 57,
    rulingParty: 'BJP',
  },
];

export function getTRElectionByYear(year: number) {
  return TR_ELECTION_HISTORY.find(e => e.year === year);
}

export function getTRPartyTrend(party: string) {
  return TR_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
