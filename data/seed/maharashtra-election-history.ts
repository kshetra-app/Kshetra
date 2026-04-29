/**
 * Maharashtra State-Level Election History (Aggregate)
 *
 * ── ELECTIONS COVERED ────────────────────────────────────────────────────
 *  2009 — INC-NCP alliance retains power (82+62)
 *  2014 — BJP wins solo (122), Fadnavis becomes CM
 *  2019 — BJP (105) + split → Shiv Sena-NCP-INC MVA govt
 *  2024 — Mahayuti (BJP+SHS+NCP) sweeps (230/288)
 */

import type { ElectionHistoryEntry } from './telangana-election-history';

export const MH_ELECTION_HISTORY: ElectionHistoryEntry[] = [
  {
    year: 2009,
    type: 'assembly',
    totalSeats: 288,
    turnout: 59.67,
    notes: 'INC-NCP Democratic Front retains power. Ashok Chavan becomes CM.',
    partyResults: [
      { party: 'INC', seatsWon: 82, seatContested: 288, voteShare: 20.63 },
      { party: 'NCP', seatsWon: 62, seatContested: 270, voteShare: 16.59 },
      { party: 'BJP', seatsWon: 46, seatContested: 260, voteShare: 14.00 },
      { party: 'SHS', seatsWon: 44, seatContested: 260, voteShare: 16.12 },
      { party: 'MNS', seatsWon: 13, seatContested: 221, voteShare: 5.71 },
      { party: 'IND', seatsWon: 41, seatContested: 0, voteShare: 27.0 },
    ],
  },
  {
    year: 2014,
    type: 'assembly',
    totalSeats: 288,
    turnout: 63.38,
    notes: 'BJP wins solo with 122 seats. Devendra Fadnavis becomes youngest CM of MH at 44.',
    partyResults: [
      { party: 'BJP', seatsWon: 122, seatContested: 260, voteShare: 27.81 },
      { party: 'SHS', seatsWon: 63, seatContested: 282, voteShare: 19.35 },
      { party: 'NCP', seatsWon: 41, seatContested: 272, voteShare: 15.76 },
      { party: 'INC', seatsWon: 42, seatContested: 287, voteShare: 18.03 },
      { party: 'IND', seatsWon: 20, seatContested: 0, voteShare: 19.05 },
    ],
  },
  {
    year: 2019,
    type: 'assembly',
    totalSeats: 288,
    turnout: 61.39,
    notes: 'BJP single-largest (105). Shiv Sena splits from BJP. MVA (SHS-NCP-INC) forms government under Uddhav Thackeray.',
    partyResults: [
      { party: 'BJP', seatsWon: 105, seatContested: 164, voteShare: 25.75 },
      { party: 'SHS', seatsWon: 56, seatContested: 124, voteShare: 16.42 },
      { party: 'NCP', seatsWon: 54, seatContested: 121, voteShare: 16.71 },
      { party: 'INC', seatsWon: 44, seatContested: 147, voteShare: 15.87 },
      { party: 'IND', seatsWon: 29, seatContested: 0, voteShare: 25.25 },
    ],
  },
  {
    year: 2024,
    type: 'assembly',
    totalSeats: 288,
    turnout: 66.05,
    notes: 'Mahayuti (BJP+SHS+NCP) landslide — 230/288 seats. MVA decimated. Fadnavis returns as CM.',
    partyResults: [
      { party: 'BJP', seatsWon: 132, seatContested: 149, voteShare: 26.77 },
      { party: 'SHS', seatsWon: 57, seatContested: 81, voteShare: 12.54 },
      { party: 'NCP', seatsWon: 41, seatContested: 59, voteShare: 8.32 },
      { party: 'INC', seatsWon: 16, seatContested: 101, voteShare: 11.82 },
      { party: 'SHSUBT', seatsWon: 20, seatContested: 95, voteShare: 10.12 },
      { party: 'NCPSP', seatsWon: 10, seatContested: 86, voteShare: 7.40 },
      { party: 'IND', seatsWon: 12, seatContested: 0, voteShare: 23.03 },
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────

export function getMHElectionByYear(year: number): ElectionHistoryEntry | undefined {
  return MH_ELECTION_HISTORY.find((e) => e.year === year);
}

export function getMHPartyTrend(party: string): { year: number; seats: number; voteShare: number }[] {
  return MH_ELECTION_HISTORY.map((e) => {
    const result = e.partyResults.find((r) => r.party === party);
    return {
      year: e.year,
      seats: result?.seatsWon ?? 0,
      voteShare: result?.voteShare ?? 0,
    };
  });
}
