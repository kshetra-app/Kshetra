/**
 * Punjab — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface PBElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const PB_ELECTION_HISTORY: PBElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'AAP': 87,
      'INC': 19,
      'SAD': 2,
      'BSP': 1,
      'BJP': 1,
      'IND': 1,
    },
    totalSeats: 111,
    rulingParty: 'AAP',
  },
];

export function getPBElectionByYear(year: number) {
  return PB_ELECTION_HISTORY.find(e => e.year === year);
}

export function getPBPartyTrend(party: string) {
  return PB_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
