/**
 * Telangana state-level election history — aggregate results.
 * Per-constituency historical results will be added when verified data is sourced.
 *
 * Sources:
 * - Election Commission of India (eci.gov.in)
 * - Telangana State Election Commission
 *
 * NOTE: Only aggregate/state-level data is included here.
 * Per-constituency 2018/2014 results are NOT yet available in this seed.
 */

export interface ElectionHistoryEntry {
  year: number;
  type: 'assembly' | 'parliament';
  totalSeats: number;
  partyResults: PartyElectionResult[];
  turnout?: number;
  notes?: string;
}

export interface PartyElectionResult {
  party: string;
  seatsWon: number;
  seatContested: number;
  voteShare?: number;
}

/**
 * Telangana Assembly Election History — state-level aggregate
 *
 * 2023: INC swept to power with 64 seats, ending BRS rule.
 * 2018: TRS (now BRS) won a landslide with 88 seats after early dissolution.
 * 2014: First election after state formation. TRS won 63 seats.
 */
export const TELANGANA_ELECTION_HISTORY: ElectionHistoryEntry[] = [
  {
    year: 2023,
    type: 'assembly',
    totalSeats: 119,
    turnout: 64.23,
    notes: 'INC returned to power. BRS lost majority after 9 years.',
    partyResults: [
      { party: 'INC', seatsWon: 64, seatContested: 119, voteShare: 39.4 },
      { party: 'BRS', seatsWon: 39, seatContested: 119, voteShare: 37.4 },
      { party: 'BJP', seatsWon: 8, seatContested: 119, voteShare: 13.9 },
      { party: 'AIMIM', seatsWon: 7, seatContested: 9, voteShare: 2.7 },
      { party: 'IND', seatsWon: 1, seatContested: 0, voteShare: 4.4 },
    ],
  },
  {
    year: 2018,
    type: 'assembly',
    totalSeats: 119,
    turnout: 73.20,
    notes: 'TRS (now BRS) won landslide after early dissolution. Mahakutami alliance failed.',
    partyResults: [
      { party: 'BRS', seatsWon: 88, seatContested: 119, voteShare: 46.9 },
      { party: 'INC', seatsWon: 19, seatContested: 119, voteShare: 28.4 },
      { party: 'AIMIM', seatsWon: 7, seatContested: 8, voteShare: 2.7 },
      { party: 'TDP', seatsWon: 2, seatContested: 13, voteShare: 3.5 },
      { party: 'BJP', seatsWon: 1, seatContested: 118, voteShare: 7.0 },
      { party: 'IND', seatsWon: 2, seatContested: 0, voteShare: 7.1 },
    ],
  },
  {
    year: 2014,
    type: 'assembly',
    totalSeats: 119,
    turnout: 69.16,
    notes: 'First election after Telangana state formation. TRS won majority.',
    partyResults: [
      { party: 'BRS', seatsWon: 63, seatContested: 119, voteShare: 34.2 },
      { party: 'TDP', seatsWon: 15, seatContested: 103, voteShare: 14.8 },
      { party: 'INC', seatsWon: 21, seatContested: 119, voteShare: 25.2 },
      { party: 'AIMIM', seatsWon: 7, seatContested: 8, voteShare: 3.2 },
      { party: 'BJP', seatsWon: 5, seatContested: 94, voteShare: 7.1 },
      { party: 'IND', seatsWon: 8, seatContested: 0, voteShare: 10.5 },
    ],
  },
];
