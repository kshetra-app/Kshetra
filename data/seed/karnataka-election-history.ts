/**
 * Karnataka State-Level Election History (Aggregate)
 *
 * ── DATA SOURCES ─────────────────────────────────────────────────────────
 *  1. Election Commission of India — state results archive
 *  2. Wikipedia — Karnataka Legislative Assembly elections
 *
 * ── ELECTIONS COVERED ────────────────────────────────────────────────────
 *  2008 — BJP forms first-ever government in South India (110 seats)
 *  2013 — INC returns to power under Siddaramaiah (122 seats)
 *  2018 — Hung assembly → BJP (104) + JDS-INC coalition drama
 *  2023 — INC landslide, Siddaramaiah returns (135 seats)
 */

import type { ElectionHistoryEntry, PartyElectionResult } from './telangana-election-history';

export const KA_ELECTION_HISTORY: ElectionHistoryEntry[] = [
  // ── 2008 Assembly Election ──
  {
    year: 2008,
    type: 'assembly',
    totalSeats: 224,
    turnout: 65.1,
    notes: 'BJP forms first-ever government in a South Indian state. Yediyurappa becomes CM.',
    partyResults: [
      { party: 'BJP', seatsWon: 110, seatContested: 224, voteShare: 33.86 },
      { party: 'INC', seatsWon: 80, seatContested: 224, voteShare: 34.78 },
      { party: 'JDS', seatsWon: 28, seatContested: 218, voteShare: 19.01 },
      { party: 'IND', seatsWon: 6, seatContested: 0, voteShare: 12.35 },
    ],
  },
  // ── 2013 Assembly Election ──
  {
    year: 2013,
    type: 'assembly',
    totalSeats: 224,
    turnout: 71.45,
    notes: 'INC returns to power. Siddaramaiah becomes CM. BJP splinters into KJP + BSR.',
    partyResults: [
      { party: 'INC', seatsWon: 122, seatContested: 224, voteShare: 36.59 },
      { party: 'BJP', seatsWon: 40, seatContested: 224, voteShare: 19.89 },
      { party: 'JDS', seatsWon: 40, seatContested: 210, voteShare: 20.19 },
      { party: 'KJP', seatsWon: 6, seatContested: 200, voteShare: 9.79 },
      { party: 'BSR', seatsWon: 4, seatContested: 70, voteShare: 2.69 },
      { party: 'IND', seatsWon: 12, seatContested: 0, voteShare: 10.85 },
    ],
  },
  // ── 2018 Assembly Election ──
  {
    year: 2018,
    type: 'assembly',
    totalSeats: 224,
    turnout: 72.36,
    notes: 'Hung assembly. JDS-INC coalition under Kumaraswamy. Collapses in 2019 (Operation Kamala).',
    partyResults: [
      { party: 'BJP', seatsWon: 104, seatContested: 224, voteShare: 36.35 },
      { party: 'INC', seatsWon: 80, seatContested: 224, voteShare: 38.14 },
      { party: 'JDS', seatsWon: 37, seatContested: 202, voteShare: 18.35 },
      { party: 'IND', seatsWon: 3, seatContested: 0, voteShare: 7.16 },
    ],
  },
  // ── 2023 Assembly Election ──
  {
    year: 2023,
    type: 'assembly',
    totalSeats: 224,
    turnout: 73.19,
    notes: 'INC landslide — 135 seats. Siddaramaiah returns as CM. 5 guarantee schemes credited.',
    partyResults: [
      { party: 'INC', seatsWon: 135, seatContested: 224, voteShare: 42.88 },
      { party: 'BJP', seatsWon: 66, seatContested: 224, voteShare: 36.00 },
      { party: 'JDS', seatsWon: 19, seatContested: 207, voteShare: 13.29 },
      { party: 'IND', seatsWon: 4, seatContested: 0, voteShare: 7.83 },
    ],
  },
];

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────

export function getKAElectionByYear(year: number): ElectionHistoryEntry | undefined {
  return KA_ELECTION_HISTORY.find((e) => e.year === year);
}

export function getKAPartyTrend(party: string): { year: number; seats: number; voteShare: number }[] {
  return KA_ELECTION_HISTORY.map((e) => {
    const result = e.partyResults.find((r) => r.party === party);
    return {
      year: e.year,
      seats: result?.seatsWon ?? 0,
      voteShare: result?.voteShare ?? 0,
    };
  });
}

export function getKATurnoutTrend(): { year: number; turnout: number }[] {
  return KA_ELECTION_HISTORY.map((e) => ({
    year: e.year,
    turnout: e.turnout ?? 0,
  }));
}
