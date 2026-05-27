/**
 * Sikkim — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface SKElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const SK_ELECTION_HISTORY: SKElectionResult[] = [
  {
    year: 2024,
    partyResults: {
      'SKM': 30,
      'SDF': 1,
    },
    totalSeats: 31,
    rulingParty: 'SKM',
  },
];

export function getSKElectionByYear(year: number) {
  return SK_ELECTION_HISTORY.find(e => e.year === year);
}

export function getSKPartyTrend(party: string) {
  return SK_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
