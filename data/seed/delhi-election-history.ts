/**
 * Delhi — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface DLElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const DL_ELECTION_HISTORY: DLElectionResult[] = [
  {
    year: 2025,
    partyResults: {
      'BJP': 48,
      'AAP': 22,
    },
    totalSeats: 70,
    rulingParty: 'BJP',
  },
  {
    year: 2020,
    partyResults: {
      'AAP': 62,
      'BJP': 8,
    },
    totalSeats: 70,
    rulingParty: 'AAP',
  },
  {
    year: 2015,
    partyResults: {
      'AAP': 67,
      'BJP': 3,
    },
    totalSeats: 70,
    rulingParty: 'AAP',
  },
];

export function getDLElectionByYear(year: number) {
  return DL_ELECTION_HISTORY.find(e => e.year === year);
}

export function getDLPartyTrend(party: string) {
  return DL_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
