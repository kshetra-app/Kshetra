/**
 * Andhra Pradesh state-level election history — aggregate results.
 *
 * Sources:
 * - Election Commission of India (eci.gov.in)
 * - AP State Election Commission
 * - Wikipedia — AP Legislative Assembly elections
 *
 * NOTE: AP was bifurcated in 2014. Only post-bifurcation elections included.
 * Pre-2014 united AP results are not included.
 */

import type { ElectionHistoryEntry } from './telangana-election-history';

/**
 * Andhra Pradesh Assembly Election History — state-level aggregate
 *
 * 2024: TDP swept back to power in alliance with JSP + BJP. YSRCP decimated.
 * 2019: YSRCP won landslide under Jagan Mohan Reddy, ending TDP rule.
 * 2014: First election after bifurcation. TDP+BJP alliance won.
 */
export const AP_ELECTION_HISTORY: ElectionHistoryEntry[] = [
  {
    year: 2024,
    type: 'assembly',
    totalSeats: 175,
    turnout: 81.86,
    notes: 'TDP alliance swept back. YSRCP reduced to 11 seats from 151. Chandrababu Naidu became CM for 4th time.',
    partyResults: [
      { party: 'TDP', seatsWon: 135, seatContested: 144, voteShare: 45.6 },
      { party: 'JSP', seatsWon: 21, seatContested: 21, voteShare: 8.9 },
      { party: 'BJP', seatsWon: 8, seatContested: 10, voteShare: 3.6 },
      { party: 'YSRCP', seatsWon: 11, seatContested: 175, voteShare: 39.4 },
      { party: 'INC', seatsWon: 0, seatContested: 150, voteShare: 1.2 },
      { party: 'IND', seatsWon: 0, seatContested: 0, voteShare: 1.3 },
    ],
  },
  {
    year: 2019,
    type: 'assembly',
    totalSeats: 175,
    turnout: 79.74,
    notes: 'YSRCP landslide under Jagan Mohan Reddy. TDP reduced to 23 seats. Anti-incumbency wave against Chandrababu.',
    partyResults: [
      { party: 'YSRCP', seatsWon: 151, seatContested: 175, voteShare: 49.9 },
      { party: 'TDP', seatsWon: 23, seatContested: 175, voteShare: 39.2 },
      { party: 'JSP', seatsWon: 1, seatContested: 137, voteShare: 5.6 },
      { party: 'BJP', seatsWon: 0, seatContested: 31, voteShare: 0.8 },
      { party: 'INC', seatsWon: 0, seatContested: 175, voteShare: 2.0 },
      { party: 'IND', seatsWon: 0, seatContested: 0, voteShare: 2.5 },
    ],
  },
  {
    year: 2014,
    type: 'assembly',
    totalSeats: 175,
    turnout: 74.47,
    notes: 'First election after AP bifurcation. TDP-BJP alliance won. N. Chandrababu Naidu became CM.',
    partyResults: [
      { party: 'TDP', seatsWon: 102, seatContested: 163, voteShare: 44.6 },
      { party: 'YSRCP', seatsWon: 67, seatContested: 175, voteShare: 44.6 },
      { party: 'BJP', seatsWon: 4, seatContested: 12, voteShare: 1.9 },
      { party: 'INC', seatsWon: 0, seatContested: 157, voteShare: 2.8 },
      { party: 'JSP', seatsWon: 0, seatContested: 28, voteShare: 1.0 },
      { party: 'IND', seatsWon: 2, seatContested: 0, voteShare: 5.1 },
    ],
  },
];
