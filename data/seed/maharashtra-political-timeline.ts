/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MAHARASHTRA POLITICAL TIMELINE / LEDGER                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Double-entry bookkeeping for Maharashtra (2019+). Total = 288.
 *
 * KEY EVENTS:
 *  2019: BJP-SHS alliance wins. Shinde faction splits SHS (2022).
 *  2022: Ajit Pawar faction splits NCP.
 *  2024: Mahayuti (BJP+SHS+NCP) sweeps 230/288.
 */

import type {
  PoliticalLedgerEntry,
  PartyStrengthSnapshot,
} from './telangana-political-timeline';

export const MH_TOTAL_SEATS = 288;

// ─── 2019 ASSEMBLY (Nov 2019 – Nov 2024) ──────────────────────────────

const ASSEMBLY_2019_EVENTS: PoliticalLedgerEntry[] = [
  {
    id: 'MH-2019-GE-001',
    date: '2019-10-24',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 105,
    acNos: [],
    memberNames: [],
    explanation: '2019 MH General Election — BJP single-largest with 105 seats.',
    details: 'BJP-SHS alliance wins 161 seats. But post-election split over CM post.',
    sources: ['https://results.eci.gov.in/', 'https://en.wikipedia.org/wiki/2019_Maharashtra_Legislative_Assembly_election'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2019-GE-002',
    date: '2019-10-24',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'SHS',
    seats: 56,
    acNos: [],
    memberNames: [],
    explanation: '2019 MH General Election — Shiv Sena wins 56 seats.',
    details: 'SHS breaks from BJP over CM post. Forms MVA govt with NCP-INC.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2019-GE-003',
    date: '2019-10-24',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'NCP',
    seats: 54,
    acNos: [],
    memberNames: [],
    explanation: '2019 MH General Election — NCP wins 54 seats under Sharad Pawar.',
    details: 'NCP plays kingmaker. Joins MVA with SHS and INC.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2019-GE-004',
    date: '2019-10-24',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 44,
    acNos: [],
    memberNames: [],
    explanation: '2019 MH General Election — INC wins 44 seats.',
    details: 'INC joins MVA coalition as third partner.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2019-GE-005',
    date: '2019-10-24',
    eventType: 'GENERAL_ELECTION',
    assembly: 1,
    debitParty: 'VACANT',
    creditParty: 'IND',
    seats: 29,
    acNos: [],
    memberNames: [],
    explanation: '2019 MH General Election — 29 Independents and smaller parties.',
    details: 'Includes AIMIM, MNS, BSP, and others.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  // ── Shiv Sena split (June 2022) — Eknath Shinde leads faction ──
  {
    id: 'MH-2022-SPLIT-001',
    date: '2022-06-21',
    eventType: 'DEFECTION',
    assembly: 1,
    debitParty: 'SHS',
    creditParty: 'SHS',
    seats: 0,
    acNos: [],
    memberNames: ['Eknath Shinde'],
    explanation: 'Eknath Shinde leads 40 of 56 SHS MLAs in rebellion. MVA government falls.',
    details: 'Shinde faction claims to be real Shiv Sena. ECI later awards SHS name and symbol to Shinde faction. Uddhav faction becomes SHSUBT.',
    sources: ['https://www.thehindu.com/', 'https://www.ndtv.com/'],
    legalStatus: 'PETITION_FILED',
    verified: true,
  },
  // ── NCP split (July 2023) — Ajit Pawar leads faction ──
  {
    id: 'MH-2023-SPLIT-001',
    date: '2023-07-02',
    eventType: 'DEFECTION',
    assembly: 1,
    debitParty: 'NCP',
    creditParty: 'NCP',
    seats: 0,
    acNos: [],
    memberNames: ['Ajit Pawar'],
    explanation: 'Ajit Pawar leads NCP faction into Mahayuti alliance. NCP splits.',
    details: 'ECI awards NCP name and symbol to Ajit Pawar faction. Sharad Pawar faction becomes NCPSP.',
    sources: ['https://www.thehindu.com/', 'https://www.ndtv.com/'],
    legalStatus: 'PETITION_FILED',
    verified: true,
  }
]; 
// ─── 2024 ASSEMBLY (Nov 2024 – present) ──────────────────────────────

const ASSEMBLY_2024_EVENTS: PoliticalLedgerEntry[] = [
  {
    id: 'MH-2024-GE-001',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 132,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — BJP wins 132/149 contested seats. Landslide.',
    details: 'Devendra Fadnavis leads Mahayuti to massive victory. Becomes CM for 3rd time.',
    sources: ['https://results.eci.gov.in/', 'https://en.wikipedia.org/wiki/2024_Maharashtra_Legislative_Assembly_election'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-002',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'SHS',
    seats: 57,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — Shiv Sena (Shinde) wins 57 seats.',
    details: 'Shinde faction gains 1 seat over 2019 as part of Mahayuti.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-003',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'NCP',
    seats: 41,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — NCP (Ajit Pawar) wins 41 seats.',
    details: 'Ajit Pawar becomes Deputy CM for 6th time.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-004',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'SHSUBT',
    seats: 20,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — Shiv Sena (UBT) wins 20 seats.',
    details: 'Uddhav Thackeray faction performs poorly despite Lok Sabha success.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-005',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 16,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — INC decimated to 16 seats from 44.',
    details: 'Worst INC performance in Maharashtra. MVA alliance collapses.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-006',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'NCPSP',
    seats: 10,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — NCP (Sharad Pawar) wins 10 seats.',
    details: 'Sharad Pawar faction struggles despite his personal appeal.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  },
  {
    id: 'MH-2024-GE-007',
    date: '2024-11-23',
    eventType: 'GENERAL_ELECTION',
    assembly: 2,
    debitParty: 'VACANT',
    creditParty: 'IND',
    seats: 12,
    acNos: [],
    memberNames: [],
    explanation: '2024 MH General Election — 12 Independents and others elected.',
    details: 'Includes smaller parties and independents.',
    sources: ['https://results.eci.gov.in/'],
    legalStatus: 'NOT_APPLICABLE',
    verified: true,
  }
]; 
// ─── COMBINED TIMELINE ────────────────────────────────────────────────────

export const MH_POLITICAL_LEDGER: PoliticalLedgerEntry[] = [
  ...ASSEMBLY_2019_EVENTS,
  ...ASSEMBLY_2024_EVENTS
]; 
export const MH_OPENING_BALANCES: Record<1 | 2, Record<string, number>> = {
  1: { BJP: 105, SHS: 56, NCP: 54, INC: 44, IND: 29 },
  2: { BJP: 132, SHS: 57, NCP: 41, SHSUBT: 20, INC: 16, NCPSP: 10, IND: 12 },
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────

export function computeMHPartyStrength(
  upToDate?: string,
  assembly?: 1 | 2,
): PartyStrengthSnapshot {
  const parties: Record<string, number> = {};
  let vacant = MH_TOTAL_SEATS;
  let lastDate = '';
  let lastAssembly: 1 | 2 | 3 = 1;

  for (const entry of MH_POLITICAL_LEDGER) {
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
    totalSeats: MH_TOTAL_SEATS,
    vacant: Math.max(0, vacant),
    explanation: `MH party strength as of ${lastDate}`,
  };
}

export function auditMHLedger(): string[] {
  const errors: string[] = [];
  const parties: Record<string, number> = {};
  let vacant = MH_TOTAL_SEATS;

  for (const entry of MH_POLITICAL_LEDGER) {
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
  if (totalFilled + vacant !== MH_TOTAL_SEATS) {
    errors.push(`Total mismatch: filled=${totalFilled}, vacant=${vacant}, expected=${MH_TOTAL_SEATS}`);
  }

  return errors;
}

export function getMHConstituencyTimeline(acNo: number): PoliticalLedgerEntry[] {
  return MH_POLITICAL_LEDGER.filter((e) => e.acNos.includes(acNo));
}

export function getMHDefectionSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of MH_POLITICAL_LEDGER) {
    if (entry.eventType === 'DEFECTION') {
      const key = `${entry.debitParty}→${entry.creditParty}`;
      summary[key] = (summary[key] || 0) + entry.seats;
    }
  }
  return summary;
}
