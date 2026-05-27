/**
 * Uttar Pradesh — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface UPElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const UP_ELECTION_HISTORY: UPElectionResult[] = [
  {
    year: 2022,
    partyResults: {
      'BJP': 255,
      'SP': 111,
      'RLD': 8,
      'INC': 2,
      'BSP': 1,
      'AIMIM': 1,
      'Others': 25,
    },
    totalSeats: 403,
    rulingParty: 'BJP',
  },
];

export function getUPElectionByYear(year: number) {
  return UP_ELECTION_HISTORY.find(e => e.year === year);
}

export function getUPPartyTrend(party: string) {
  return UP_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
