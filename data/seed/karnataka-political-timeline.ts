/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  KARNATAKA POLITICAL TIMELINE / LEDGER                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Double-entry political bookkeeping for Karnataka (2018+).
 * Total ALWAYS = 224 seats.
 *
 * ── KEY POLITICAL EVENTS ────────────────────────────────────────────────
 *  2018: Hung assembly. JDS-INC coalition.
 *  2019: "Operation Kamala" — 17 MLAs defect. Coalition falls.
 *  2019-2023: BJP rules under Yediyurappa, then Bommai.
 *  2023: INC landslide — 135/224. Siddaramaiah CM.
 *  2026: INC leadership transition — Siddaramaiah resigns (28 May 2026);
 *        D. K. Shivakumar sworn in as CM (3 Jun 2026). No seat change.
 */

import type {
  PoliticalLedgerEntry,
  PartyStrengthSnapshot,
} from './telangana-political-timeline';

export const KA_TOTAL_SEATS = 224;

// ─── 2018 ASSEMBLY (May 2018 – May 2023) ────────────────────────────────

const ASSEMBLY_2018_EVENTS: PoliticalLedgerEntry[] = [
  {
    id: 'KA-2018-GE-001',
    date: '2018-05-15',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 104,
    acNos: [],
    memberNames: [],
    explanation: '2018 KA General Election — BJP wins 104 seats, single-largest but short of majority.',
    details: 'Hung assembly. BJP falls 8 short of the 112 majority mark.',
    sources: ['https://results.eci.gov.in/', 'https://en.wikipedia.org/wiki/2018_Karnataka_Legislative_Assembly_election'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2018-GE-002',
    date: '2018-05-15',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 80,
    acNos: [],
    memberNames: [],
    explanation: '2018 KA General Election — INC wins 80 seats.',
    details: 'INC loses power but forms coalition with JDS to deny BJP.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2018-GE-003',
    date: '2018-05-15',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'JDS',
    seats: 37,
    acNos: [],
    memberNames: [],
    explanation: '2018 KA General Election — JDS wins 37 seats. Kumaraswamy becomes CM.',
    details: 'JDS-INC coalition forms government. H.D. Kumaraswamy sworn in as CM.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2018-GE-004',
    date: '2018-05-15',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'IND',
    seats: 3,
    acNos: [],
    memberNames: [],
    explanation: '2018 KA General Election — 3 Independents elected.',
    details: 'Independents initially support coalition.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  // ── Operation Kamala (July 2019) — mass defection collapses coalition ──
  {
    id: 'KA-2019-DEF-001',
    date: '2019-07-06',
    eventType: 'DEFECTION',
    assembly: 1,
    debitParty: 'INC',
    creditParty: 'VACANT',
    seats: 13,
    acNos: [181, 205, 184, 188, 210, 194, 173, 114, 87, 162, 29, 10, 73],
    memberNames: [
      'S T Somashekar', 'Munirathna', 'Satish Reddy', 'Ramalinga Reddy',
      'Byrathi Basavaraj', 'R Roshan Baig', 'K Sudhakar', 'D C Thammanna',
      'Dr Umesh Jadhav', 'S R Srinivas', 'B C Patil', 'Shrimant Patil', 'Pratap Gouda Patil'
    ],
    explanation: '13 INC MLAs resign as part of Operation Kamala. Coalition destabilized.',
    details: 'Mass resignations orchestrated by BJP. MLAs resign to bring down JDS-INC coalition.',
    sources: ['https://www.thehindu.com/', 'https://www.ndtv.com/'],
    legalStatus: 'PETITION_FILED',
    verified: true,
  },
  {
    id: 'KA-2019-DEF-002',
    date: '2019-07-06',
    eventType: 'DEFECTION',
    assembly: 1,
    debitParty: 'JDS',
    creditParty: 'VACANT',
    seats: 3,
    acNos: [124, 120, 126],
    memberNames: ['G T Devegowda', 'H C Balakrishna', 'A H Vishwanath'],
    explanation: '3 JDS MLAs resign. Coalition loses majority.',
    details: 'JDS rebels join the mass resignation. Combined with INC defectors, coalition falls.',
    sources: ['https://www.thehindu.com/', 'https://www.ndtv.com/'],
    legalStatus: 'PETITION_FILED',
    verified: true,
  },
  {
    id: 'KA-2019-DEF-003',
    date: '2019-07-06',
    eventType: 'DEFECTION',
    assembly: 1,
    debitParty: 'IND',
    creditParty: 'VACANT',
    seats: 1,
    acNos: [176],
    memberNames: ['H Nagesh'],
    explanation: 'Independent MLA H Nagesh resigns, further weakening coalition.',
    details: 'Nagesh was supporting the JDS-INC coalition.',
    sources: ['https://www.thehindu.com/'],
    legalStatus: 'PETITION_FILED',
    verified: true,
  },
  // ── Yediyurappa becomes CM after trust vote (July 2019) ──
  // Note: No seat change — these are resignations creating vacancies
  // ── By-elections (December 2019) — defectors win on BJP ticket ──
  {
    id: 'KA-2019-BY-001',
    date: '2019-12-09',
    eventType: 'BY_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 12,
    acNos: [181, 205, 184, 188, 210, 194, 87, 162, 29, 10, 73, 176],
    memberNames: [
      'S T Somashekar', 'Munirathna', 'Satish Reddy', 'Ramalinga Reddy',
      'Byrathi Basavaraj', 'R Roshan Baig', 'Dr Umesh Jadhav', 'S R Srinivas',
      'B C Patil', 'Shrimant Patil', 'Pratap Gouda Patil', 'H Nagesh'
    ],
    explanation: 'BJP wins 12 of 15 by-elections. Defectors return as BJP MLAs.',
    details: 'Rebel MLAs contest on BJP ticket and win. BJP crosses majority mark.',
    sources: ['https://results.eci.gov.in/', 'https://www.thehindu.com/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2019-BY-002',
    date: '2019-12-09',
    eventType: 'BY_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 2,
    acNos: [173, 114],
    memberNames: ['K Sudhakar', 'D C Thammanna'],
    explanation: 'INC retains 2 of the 15 by-election seats.',
    details: 'INC manages to hold 2 seats despite BJP wave.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2019-BY-003',
    date: '2019-12-09',
    eventType: 'BY_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'JDS',
    seats: 1,
    acNos: [124],
    memberNames: ['G T Devegowda'],
    explanation: 'JDS retains 1 by-election seat.',
    details: 'JDS holds Chamundeshwari.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  // ── Remaining 2 vacancies stayed with original party affiliations via by-election
  {
    id: 'KA-2020-BY-001',
    date: '2020-11-03',
    eventType: 'BY_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 1,
    acNos: [120],
    memberNames: ['D Suresh'],
    explanation: 'INC wins Magadi by-election.',
    details: 'Filling remaining vacancy from Operation Kamala resignations.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  // ── CM changes (no seat changes) ──
  // 2021: Yediyurappa replaced by Basavaraj Bommai as CM (BJP)
];

// ─── 2023 ASSEMBLY (May 2023 – present) ─────────────────────────────────

const ASSEMBLY_2023_EVENTS: PoliticalLedgerEntry[] = [
  {
    id: 'KA-2023-GE-001',
    date: '2023-05-13',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 135,
    acNos: [],
    memberNames: [],
    explanation: '2023 KA General Election — INC wins 135/224 seats. Siddaramaiah returns as CM.',
    details: 'Biggest INC tally in Karnataka since 1989. Guarantee schemes drive landslide.',
    sources: ['https://results.eci.gov.in/', 'https://en.wikipedia.org/wiki/2023_Karnataka_Legislative_Assembly_election'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2023-GE-002',
    date: '2023-05-13',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 66,
    acNos: [],
    memberNames: [],
    explanation: '2023 KA General Election — BJP reduced to 66 seats from 104+by-elections.',
    details: 'Anti-incumbency + 40% commission allegations hurt BJP.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2023-GE-003',
    date: '2023-05-13',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'JDS',
    seats: 19,
    acNos: [],
    memberNames: [],
    explanation: '2023 KA General Election — JDS wins 19 seats. Deve Gowda family weakened.',
    details: 'JDS almost halved from 37 (2018). Old Mysuru hold shrinks.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'KA-2023-GE-004',
    date: '2023-05-13',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'IND',
    seats: 4,
    acNos: [],
    memberNames: [],
    explanation: '2023 KA General Election — 4 Independents elected.',
    details: 'Independents win in a few local-contest seats.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  }
  // ── CM change (no seat change) ──
  // 2026-05-28: Siddaramaiah resigns as CM after 3 years (INC high-command
  //             leadership-rotation understanding).
  // 2026-06-03: D. K. Shivakumar sworn in as CM; G. Parameshwara Deputy CM.
  //             INC retains its 2023 seat strength — no ledger transaction.
  //   Sources: The Hindu / New Indian Express (3 Jun 2026).
];

// ─── COMBINED TIMELINE ────────────────────────────────────────────────────

export const KA_POLITICAL_LEDGER: PoliticalLedgerEntry[] = [
  ...ASSEMBLY_2018_EVENTS,
  ...ASSEMBLY_2023_EVENTS
];

export const KA_OPENING_BALANCES: Record<1 | 2, Record<string, number>> = {
  1: { BJP: 104, INC: 80, JDS: 37, IND: 3 },
  2: { INC: 135, BJP: 66, JDS: 19, IND: 4 },
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────

export function computeKAPartyStrength(
  upToDate?: string,
  assembly?: 1 | 2,
): PartyStrengthSnapshot {
  const parties: Record<string, number> = {};
  let vacant = KA_TOTAL_SEATS;
  let lastDate = '';
  let lastAssembly: 1 | 2 | 3 = 1;

  for (const entry of KA_POLITICAL_LEDGER) {
    if (upToDate && entry.date > upToDate) break;
    if (assembly && entry.assembly !== assembly) continue;

    if (entry.debitParty === 'VACANT') {
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
      vacant -= entry.seats;
    } else if (entry.creditParty === 'VACANT') {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      vacant += entry.seats;
    } else {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
    }

    lastDate = entry.date;
    lastAssembly = entry.assembly;
  }

  return {
    date: lastDate,
    assembly: lastAssembly,
    afterEvent: '',
    parties,
    totalSeats: KA_TOTAL_SEATS,
    vacant: Math.max(0, vacant),
    explanation: `KA party strength as of ${lastDate}`,
  };
}

export function auditKALedger(): string[] {
  const errors: string[] = [];
  const parties: Record<string, number> = {};
  let vacant = KA_TOTAL_SEATS;

  for (const entry of KA_POLITICAL_LEDGER) {
    if (entry.debitParty === 'VACANT') {
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
      vacant -= entry.seats;
    } else if (entry.creditParty === 'VACANT') {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      vacant += entry.seats;
    } else {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
    }

    for (const [party, count] of Object.entries(parties)) {
      if (count < 0) {
        errors.push(`${entry.id}: ${party} went negative (${count})`);
      }
    }
  }

  const totalFilled = Object.values(parties).reduce((a, b) => a + b, 0);
  if (totalFilled + vacant !== KA_TOTAL_SEATS) {
    errors.push(`Total mismatch: filled=${totalFilled}, vacant=${vacant}, expected=${KA_TOTAL_SEATS}`);
  }

  return errors;
}

export function getKAConstituencyTimeline(acNo: number): PoliticalLedgerEntry[] {
  return KA_POLITICAL_LEDGER.filter((e) => e.acNos.includes(acNo));
}

export function getKADefectionSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of KA_POLITICAL_LEDGER) {
    if (entry.eventType === 'DEFECTION') {
      const key = `${entry.debitParty}→${entry.creditParty}`;
      summary[key] = (summary[key] || 0) + entry.seats;
    }
  }
  return summary;
}
