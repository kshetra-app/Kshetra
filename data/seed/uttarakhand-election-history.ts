/**
 * Uttarakhand — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface UKElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const UK_ELECTION_HISTORY: UKElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'BJP': 46,
      'INC': 18,
      'IND': 2,
      'BSP': 2,
    },
    totalSeats: 68,
    rulingParty: 'BJP',
  },
];

export function getUKElectionByYear(year: number) {
  return UK_ELECTION_HISTORY.find(e => e.year === year);
}

export function getUKPartyTrend(party: string) {
  return UK_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
