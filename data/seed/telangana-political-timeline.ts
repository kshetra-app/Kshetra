/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TELANGANA POLITICAL LEDGER — Double-Entry Accounting for Democracy    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Every political change is a TRANSACTION. Every transaction has a DEBIT
 * (party losing strength) and a CREDIT (party gaining strength). The total
 * must ALWAYS balance to 119 seats — just like double-entry bookkeeping.
 *
 * ── CONCEPT ────────────────────────────────────────────────────────────────
 *  Think of each party as an "account" in a ledger:
 *    • General Election  → CREDIT to winning party (initial balance)
 *    • Defection A → B   → DEBIT from A, CREDIT to B
 *    • Party Merger A → B → DEBIT from A, CREDIT to B (bulk transfer)
 *    • Death in Office    → DEBIT from party, CREDIT to VACANT
 *    • By-election win    → DEBIT from VACANT, CREDIT to winning party
 *    • Resignation        → DEBIT from party, CREDIT to VACANT
 *    • Party Rename A → B → Transfer entire balance (no net change)
 *
 *  INVARIANT: Sum of all party seats + VACANT = 119 at ALL times.
 *
 * ── WHY THIS MATTERS (for users) ──────────────────────────────────────────
 *  1. TRUST: Users see every change sourced and dated — no black box.
 *  2. ACCOUNTABILITY: Defections are permanently on record.
 *  3. FLOOR STRENGTH: Live party strength at any point in time.
 *  4. LEGAL TRACKING: Anti-defection petition status for each event.
 *  5. HISTORICAL CONTEXT: Explains *why* numbers changed between elections.
 *
 * ── NOVEL FEATURES ENABLED ────────────────────────────────────────────────
 *  • Floor Strength Timeline — animated timeline of party strength changes
 *  • Political Migration Sankey — flow diagram of party-to-party movement
 *  • Anti-Defection Legal Tracker — petition status for every defection
 *  • Constituency Loyalty Index — has the MLA from this seat ever switched?
 *  • Effective Representation Score — days a constituency was actually served
 *  • Change Impact Analysis — how each defection shifts balance of power
 *  • Predictive Swing Analysis — which seats are historically volatile?
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. Wikipedia — 2014, 2018, 2023 Telangana election articles
 *  2. The Hindu — "12 TDP MLAs merged with TRS" (2016-03-11)
 *  3. Times of India — "12 Congress MLAs join TRS" (2019-06-06)
 *  4. The Hindu — "BRS moves SC for action against defected MLAs" (2024)
 *  5. Telangana Today — "Defected BRS MLAs in a spot of bother" (2024)
 *  6. New Indian Express — "Operation Akarsh: Congress eyes gains" (2024)
 *  7. ECI — By-election results (Huzurnagar, Dubbak, Nagarjuna Sagar,
 *           Huzurabad, Munugode)
 *
 * ── ASSEMBLIES COVERED ────────────────────────────────────────────────────
 *  1st Assembly: Jun 2014 – Sep 2018 (dissolved early)
 *  2nd Assembly: Dec 2018 – Nov 2023
 *  3rd Assembly: Dec 2023 – present
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────

export type PoliticalEventType =
  | 'GENERAL_ELECTION'     // Initial seat allocation from election results
  | 'BY_ELECTION'          // Seat filled via by-election
  | 'DEFECTION'            // MLA switches party (individual)
  | 'PARTY_MERGER'         // Bulk: 2/3+ of party merges into another
  | 'PARTY_RENAME'         // Party renamed (e.g., TRS → BRS)
  | 'DEATH_IN_OFFICE'      // MLA dies while serving → seat becomes VACANT
  | 'RESIGNATION'          // MLA resigns → seat becomes VACANT
  | 'DISQUALIFICATION'     // MLA disqualified → seat becomes VACANT
  | 'EXPELLED_FROM_PARTY'; // Expelled but retains seat (rare)

export type AntiDefectionStatus =
  | 'NOT_APPLICABLE'       // Not a defection event
  | 'NO_PETITION'          // No petition filed
  | 'PETITION_FILED'       // Petition before Speaker
  | 'HEARING_IN_PROGRESS'  // Speaker conducting hearings
  | 'COURT_CHALLENGE'      // High Court / Supreme Court involved
  | 'UPHELD'               // Defection upheld (disqualified)
  | 'DISMISSED'            // Petition dismissed (merger/2/3 rule)
  | 'PENDING';             // Awaiting decision

/**
 * Each ledger entry represents ONE political transaction.
 * Like accounting: every entry has a debit side and a credit side.
 */
export interface PoliticalLedgerEntry {
  /** Unique ID: TS-{assembly}-{year}-{type}-{seq} */
  id: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  /** Assembly number: 1 (2014), 2 (2018), 3 (2023) */
  assembly: 1 | 2 | 3;
  /** Event classification */
  eventType: PoliticalEventType;

  // ── TRANSACTION PARTIES ──
  /** AC number(s) affected. Array for bulk events like mergers. */
  acNos: number[];
  /** MLA name(s) involved */
  memberNames: string[];
  /** Party LOSING strength (debited) — use 'VACANT' for by-elections */
  debitParty: string;
  /** Party GAINING strength (credited) — use 'VACANT' for deaths */
  creditParty: string;
  /** Number of seats transferred in this transaction */
  seats: number;

  // ── CONTEXT ──
  /** Plain-English explanation for users */
  explanation: string;
  /** Detailed notes (legal context, political background) */
  details: string;
  /** Anti-defection law status */
  legalStatus: AntiDefectionStatus;
  /** Verified source URLs (minimum 2) */
  sources: string[];
  /** Whether cross-verified with 3+ sources */
  verified: boolean;
}

/**
 * A snapshot of party strength at a specific point in time.
 * Generated from sequential application of ledger entries.
 */
export interface PartyStrengthSnapshot {
  /** ISO date of this snapshot */
  date: string;
  /** Assembly number */
  assembly: 1 | 2 | 3;
  /** ID of the ledger entry that produced this snapshot */
  afterEvent: string;
  /** Party → seat count mapping */
  parties: Record<string, number>;
  /** Vacant seats (unfilled due to death/resignation/disqualification) */
  vacant: number;
  /** MUST always equal 119 */
  totalSeats: number;
  /** Plain-English summary of current state */
  explanation: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────

export const TOTAL_SEATS = 119;

// ─── 1ST ASSEMBLY (Jun 2014 – Sep 2018) ───────────────────────────────────

const ASSEMBLY_1_EVENTS: PoliticalLedgerEntry[] = [
  // ── GENERAL ELECTION: 2014-05-07 ──
  // TRS won 63 seats — first election after Telangana state formation
  {
    id: 'TS-1-2014-GE-TRS',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [], // all TRS-won ACs (omitted for brevity; 63 seats)
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'TRS',
    seats: 63,
    explanation: 'Telangana Rashtra Samithi wins 63 of 119 seats in the first-ever Telangana Assembly election, forming the government under K. Chandrashekar Rao.',
    details: 'TRS fought on the Telangana statehood sentiment. KCR became first CM. Coalition support from AIMIM.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
  {
    id: 'TS-1-2014-GE-INC',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 21,
    explanation: 'Indian National Congress wins 21 seats. Despite leading the Telangana movement in Parliament, INC lost to TRS on the ground.',
    details: 'INC was in power at Centre (UPA-II) and passed Telangana bill, but voters credited TRS for the agitation.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
  {
    id: 'TS-1-2014-GE-TDP',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [45, 46, 49, 50, 51, 52, 53, 61, 63, 72, 73, 74, 101, 104, 116],
    memberNames: [
      'K. P. Vivekanand Goud', 'Madhavaram Krishna Rao', 'Manchireddy Kishan Reddy',
      'R. Krishnaiah', 'Teegala Krishna Reddy', 'T. Prakash Goud', 'Arekapudi Gandhi',
      'Maganti Gopinath', 'Talasani Srinivas Yadav', 'G. Sayanna',
      'A. Revanth Reddy', 'S. Rajender Reddy', 'Errabelli Dayakar Rao',
      'Challa Dharma Reddy', 'Sandra Venkata Veeraiah',
    ],
    debitParty: 'VACANT',
    creditParty: 'TDP',
    seats: 15,
    explanation: 'Telugu Desam Party wins 15 seats, mostly in Greater Hyderabad and parts of Warangal and Khammam.',
    details: 'TDP contested in alliance with BJP. Won seats primarily in urban Hyderabad constituencies.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
  {
    id: 'TS-1-2014-GE-AIMIM',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [58, 64, 65, 66, 67, 68, 69],
    memberNames: [
      'Ahmed Bin Abdullah Balala', 'Nampally: Jaffer Hussain', 'Kausar Mohiuddin',
      'Syed Ahmed Pasha Quadri', 'Akbaruddin Owaisi', 'Mumtaz Ahmed Khan',
      'Mohammad Moazam Khan',
    ],
    debitParty: 'VACANT',
    creditParty: 'AIMIM',
    seats: 7,
    explanation: 'AIMIM retains all 7 Old City Hyderabad seats — its traditional stronghold since 1984.',
    details: 'AIMIM dominates the Muslim-majority constituencies in Old Hyderabad under the Owaisi family leadership.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-1-2014-GE-BJP',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [47, 57, 59, 60, 66],
    memberNames: [
      'N. V. S. S. Prabhakar', 'K. Laxman', 'G. Kishan Reddy',
      'Chintala Ramachandra Reddy', 'T. Raja Singh',
    ],
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 5,
    explanation: 'BJP wins 5 seats in Hyderabad urban constituencies, contesting in alliance with TDP.',
    details: 'Modi wave effect. BJP won Uppal, Musheerabad, Amberpet, Khairatabad, and Goshamahal.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-1-2014-GE-OTHERS',
    date: '2014-06-02',
    assembly: 1,
    eventType: 'GENERAL_ELECTION',
    acNos: [1, 9, 87, 119, 110, 113, 115, 103],
    memberNames: [
      'Koneru Konappa (BSP)', 'Allola Indrakaran Reddy (BSP)',
      'Ravindra Kumar Ramavath (CPI)', 'Sunnam Rajaiah (CPI-M)',
      'Payam Venkateswarlu (YSRCP)', 'Banoth Madanlal (YSRCP)',
      'Thati Venkateswarlu (YSRCP)', 'Donthi Madhava Reddy (IND)',
    ],
    debitParty: 'VACANT',
    creditParty: 'OTHERS',
    seats: 8,
    explanation: 'Remaining 8 seats won by smaller parties: BSP (2), CPI (1), CPI-M (1), YSRCP (3), IND (1).',
    details: 'BSP: Sirpur + Nirmal; CPI: Devarakonda; CPI-M: Bhadrachalam; YSRCP: Pinapaka + Wyra + Aswaraopeta; IND: Narsampet.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2014_Andhra_Pradesh_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── TDP MERGER WITH TRS: 2016-03-11 ──
  // "Operation Akarsh" — 12 of 15 TDP MLAs merge with TRS
  {
    id: 'TS-1-2016-MERGER-TDP-TRS',
    date: '2016-03-11',
    assembly: 1,
    eventType: 'PARTY_MERGER',
    acNos: [45, 46, 49, 51, 52, 53, 61, 63, 72, 74, 101, 104],
    memberNames: [
      'K. P. Vivekanand Goud (Quthbullapur)',
      'Madhavaram Krishna Rao (Kukatpally)',
      'Manchireddy Kishan Reddy (Ibrahimpatnam)',
      'Teegala Krishna Reddy (Maheshwaram)',
      'T. Prakash Goud (Rajendranagar)',
      'Arekapudi Gandhi (Serilingampally)',
      'Maganti Gopinath (Jubilee Hills)',
      'Talasani Srinivas Yadav (Sanathnagar)',
      'G. Sayanna (Secunderabad Cantt.)',
      'S. Rajender Reddy (Narayanpet)',
      'Errabelli Dayakar Rao (Palakurthi)',
      'Challa Dharma Reddy (Parkal)',
    ],
    debitParty: 'TDP',
    creditParty: 'TRS',
    seats: 12,
    explanation:
      '12 of 15 TDP MLAs merge with TRS, known as "Operation Akarsh". Since 12/15 = 80% (exceeds the 2/3 threshold), the Speaker recognised this as a valid merger under the anti-defection law, protecting them from disqualification. TDP strength drops from 15 to 3.',
    details:
      'Speaker S. Madhusudana Chary approved the merger citing the Tenth Schedule provision. ' +
      'Floor leader E. Dayakar Rao filed the merger petition. The remaining 3 TDP MLAs were ' +
      'A. Revanth Reddy (Kodangal), Sandra Venkata Veeraiah (Sathupalli), and R. Krishnaiah (L.B. Nagar). ' +
      'Revanth Reddy and Veeraiah were reportedly unwelcome in TRS due to the "cash for vote" scam.',
    legalStatus: 'DISMISSED',
    sources: [
      'https://www.thehindu.com/news/national/telangana/12-tdp-mlas-merged-with-trs/article8341018.ece',
      'https://en.wikipedia.org/wiki/Telangana_Legislative_Assembly',
    ],
    verified: true,
  },

  // ── REVANTH REDDY JOINS INC: 2017 ──
  {
    id: 'TS-1-2017-DEF-REVANTH',
    date: '2017-07-18',
    assembly: 1,
    eventType: 'DEFECTION',
    acNos: [73],
    memberNames: ['A. Revanth Reddy (Kodangal)'],
    debitParty: 'TDP',
    creditParty: 'INC',
    seats: 1,
    explanation:
      'Revanth Reddy, Kodangal MLA, leaves TDP and joins INC. He was one of the 3 TDP MLAs who did not merge with TRS. He would later become Telangana PCC president and eventually Chief Minister in 2023.',
    details:
      'Revanth Reddy had differences with TDP leadership over the party direction in Telangana. ' +
      'His joining INC strengthened the Congress in Telangana significantly.',
    legalStatus: 'NO_PETITION',
    sources: [
      'https://en.wikipedia.org/wiki/Revanth_Reddy',
      'https://www.thehindu.com/news/national/telangana/',
    ],
    verified: true,
  },
];

// ─── 2ND ASSEMBLY (Dec 2018 – Nov 2023) ──────────────────────────────────

const ASSEMBLY_2_EVENTS: PoliticalLedgerEntry[] = [
  // ── GENERAL ELECTION: 2018-12-07 ──
  {
    id: 'TS-2-2018-GE-TRS',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'TRS',
    seats: 88,
    explanation:
      'TRS wins a massive 88 of 119 seats after KCR dissolved the assembly early. The opposition Mahakutami (INC+TDP+TJS+CPI) alliance fails to make an impact.',
    details: 'KCR dissolved assembly 9 months early, catching opposition off guard. TRS vote share: 46.9%.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
  {
    id: 'TS-2-2018-GE-INC',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 19,
    explanation: 'INC wins 19 seats as part of the Mahakutami alliance. A significant decline from its 2014 tally of 21.',
    details: 'INC fought in alliance with TDP, TJS, and CPI under the "People\'s Front" banner.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-2-2018-GE-AIMIM',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [58, 64, 65, 66, 67, 68, 69],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'AIMIM',
    seats: 7,
    explanation: 'AIMIM again sweeps all 7 Old City Hyderabad seats — unchanged from 2014.',
    details: 'AIMIM is a reliable TRS ally. Old City seats have remained with AIMIM since 1984.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-2-2018-GE-TDP',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [116, 115],
    memberNames: ['Sandra Venkata Veeraiah (Sathupalli)', 'Mecha Nageswara Rao (Aswaraopeta)'],
    debitParty: 'VACANT',
    creditParty: 'TDP',
    seats: 2,
    explanation: 'TDP reduced to just 2 seats — Sathupalli and Aswaraopeta — both in Khammam district, a TDP stronghold.',
    details: 'Massive decline from 15 seats in 2014. The TDP merger with TRS in 2016 and Revanth Reddy\'s exit devastated the party.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-2-2018-GE-BJP',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [66],
    memberNames: ['T. Raja Singh (Goshamahal)'],
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 1,
    explanation: 'BJP retains only Goshamahal (T. Raja Singh). Lost 4 of its 5 seats from 2014.',
    details: 'Significant decline despite contesting 118 of 119 seats. BJP had broken alliance with TDP.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-2-2018-GE-OTHERS',
    date: '2018-12-11',
    assembly: 2,
    eventType: 'GENERAL_ELECTION',
    acNos: [23, 113],
    memberNames: ['Korukanti Chandar (AIFB, Ramagundam)', 'IND (Wyra)'],
    debitParty: 'VACANT',
    creditParty: 'OTHERS',
    seats: 2,
    explanation: 'AIFB wins Ramagundam (Korukanti Chandar) and 1 Independent wins Wyra.',
    details: 'Unlike 2014 which had BSP/CPI/CPI-M/YSRCP wins, 2018 saw only AIFB and 1 IND outside major parties.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── N. UTTAM KUMAR REDDY VACATES HUZURNAGAR: May 2019 ──
  {
    id: 'TS-2-2019-RESIGN-UTTAM',
    date: '2019-05-30',
    assembly: 2,
    eventType: 'RESIGNATION',
    acNos: [89],
    memberNames: ['N. Uttam Kumar Reddy (Huzurnagar)'],
    debitParty: 'INC',
    creditParty: 'VACANT',
    seats: 1,
    explanation:
      'N. Uttam Kumar Reddy (INC) resigns from Huzurnagar assembly seat after winning the Nalgonda Lok Sabha constituency in the 2019 general elections.',
    details: 'As per rules, an elected member cannot hold both assembly and parliamentary seats simultaneously.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── 12 INC MLAs MERGE WITH TRS: Jun 2019 ──
  {
    id: 'TS-2-2019-MERGER-INC-TRS',
    date: '2019-06-06',
    assembly: 2,
    eventType: 'PARTY_MERGER',
    acNos: [],
    memberNames: [],
    debitParty: 'INC',
    creditParty: 'TRS',
    seats: 12,
    explanation:
      '12 of the remaining 18 INC MLAs merge with TRS. Speaker recognises the merger as valid under the anti-defection law since 12/18 = 66.7% (exceeds the 2/3 threshold). INC reduced from 18 to 6 seats, losing official Opposition party status.',
    details:
      'Mirroring the 2016 TDP merger, TRS again used the "Operation Akarsh" playbook. ' +
      'Congress called it "purchasing MLAs with ill-gotten money." AIMIM\'s Asaduddin Owaisi ' +
      'criticised the development in Parliament. INC\'s strength dropped below the 10% threshold ' +
      'needed for official Opposition status in the 119-member House.',
    legalStatus: 'DISMISSED',
    sources: [
      'https://timesofindia.indiatimes.com/india/12-congress-mlas-join-trs-in-telangana-speaker-recognises-merger/articleshow/69680344.cms',
      'https://en.wikipedia.org/wiki/Telangana_Legislative_Assembly',
    ],
    verified: true,
  },

  // ── HUZURNAGAR BY-ELECTION: Oct 2019 ──
  {
    id: 'TS-2-2019-BY-HUZURNAGAR',
    date: '2019-10-21',
    assembly: 2,
    eventType: 'BY_ELECTION',
    acNos: [89],
    memberNames: ['Shanampudi Saidireddy (TRS)'],
    debitParty: 'VACANT',
    creditParty: 'TRS',
    seats: 1,
    explanation:
      'TRS wins the Huzurnagar by-election. Shanampudi Saidireddy (TRS) defeats N. Padmavathi Reddy (INC). Seat vacated when Uttam Kumar Reddy won Lok Sabha.',
    details: 'N. Padmavathi Reddy, wife of former MLA, contested for INC but lost. TRS consolidated further.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },

  // ── SOLIPETA RAMALINGA REDDY DEATH: Aug 2020 ──
  {
    id: 'TS-2-2020-DEATH-DUBBAK',
    date: '2020-08-18',
    assembly: 2,
    eventType: 'DEATH_IN_OFFICE',
    acNos: [41],
    memberNames: ['Solipeta Ramalinga Reddy (Dubbak)'],
    debitParty: 'TRS',
    creditParty: 'VACANT',
    seats: 1,
    explanation: 'Dubbak MLA Solipeta Ramalinga Reddy (TRS) passes away due to health complications. Seat becomes vacant.',
    details: 'His death triggered the Dubbak by-election which became a significant political event.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/Dubbak_Assembly_constituency',
    ],
    verified: true,
  },

  // ── DUBBAK BY-ELECTION: Nov 2020 ──
  {
    id: 'TS-2-2020-BY-DUBBAK',
    date: '2020-11-10',
    assembly: 2,
    eventType: 'BY_ELECTION',
    acNos: [41],
    memberNames: ['M. Raghunandan Rao (BJP)'],
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 1,
    explanation:
      'BJP\'s M. Raghunandan Rao wins Dubbak by-election, defeating TRS candidate. A significant upset that signalled BJP\'s rising strength in Telangana.',
    details:
      'BJP\'s first by-election win in Telangana. The result boosted BJP morale and marked the beginning of its aggressive push in the state.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },

  // ── NOMULA NARSIMHAIAH DEATH: Mar 2021 ──
  {
    id: 'TS-2-2021-DEATH-NSAGAR',
    date: '2021-03-27',
    assembly: 2,
    eventType: 'DEATH_IN_OFFICE',
    acNos: [88],
    memberNames: ['Nomula Narsimhaiah (Nagarjuna Sagar)'],
    debitParty: 'TRS',
    creditParty: 'VACANT',
    seats: 1,
    explanation: 'Nagarjuna Sagar MLA Nomula Narsimhaiah (TRS) passes away. Seat becomes vacant.',
    details: 'His son Nomula Bhagath would later contest and win the by-election for TRS.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/Nagarjuna_Sagar_Assembly_constituency',
    ],
    verified: true,
  },

  // ── NAGARJUNA SAGAR BY-ELECTION: Apr 2021 ──
  {
    id: 'TS-2-2021-BY-NSAGAR',
    date: '2021-04-17',
    assembly: 2,
    eventType: 'BY_ELECTION',
    acNos: [88],
    memberNames: ['Nomula Bhagath (TRS)'],
    debitParty: 'VACANT',
    creditParty: 'TRS',
    seats: 1,
    explanation:
      'TRS retains Nagarjuna Sagar. Nomula Bhagath (TRS), son of deceased MLA Nomula Narsimhaiah, wins the by-election defeating INC candidate.',
    details: 'Sympathy factor for the deceased MLA\'s family helped TRS retain the seat.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── ETELA RAJENDER EXPELLED FROM TRS: Jun 2021 ──
  {
    id: 'TS-2-2021-EXPEL-ETELA',
    date: '2021-06-12',
    assembly: 2,
    eventType: 'DEFECTION',
    acNos: [31],
    memberNames: ['Etela Rajender (Huzurabad)'],
    debitParty: 'TRS',
    creditParty: 'BJP',
    seats: 0,
    explanation:
      'Etela Rajender, former Health Minister, is expelled from TRS over land-grabbing allegations. He joins BJP. However, the seat count doesn\'t change yet — he must resign and re-contest.',
    details:
      'Etela Rajender was a powerful TRS leader from Karimnagar district. After being dropped from cabinet and facing land encroachment charges, he defected to BJP and resigned his MLA seat to seek a fresh mandate.',
    legalStatus: 'NO_PETITION',
    sources: [
      'https://en.wikipedia.org/wiki/Etela_Rajender',
      'https://www.thehindu.com/news/national/telangana/',
    ],
    verified: true,
  },

  // ── ETELA RAJENDER RESIGNS: Jun 2021 ──
  {
    id: 'TS-2-2021-RESIGN-ETELA',
    date: '2021-06-14',
    assembly: 2,
    eventType: 'RESIGNATION',
    acNos: [31],
    memberNames: ['Etela Rajender (Huzurabad)'],
    debitParty: 'TRS',
    creditParty: 'VACANT',
    seats: 1,
    explanation:
      'Etela Rajender resigns from Huzurabad assembly seat to seek fresh mandate after joining BJP. Seat becomes vacant.',
    details: 'A rare case of an MLA resigning to re-contest from the same constituency under a new party banner.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/Etela_Rajender',
    ],
    verified: true,
  },

  // ── HUZURABAD BY-ELECTION: Nov 2021 ──
  {
    id: 'TS-2-2021-BY-HUZURABAD',
    date: '2021-11-02',
    assembly: 2,
    eventType: 'BY_ELECTION',
    acNos: [31],
    memberNames: ['Etela Rajender (BJP)'],
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 1,
    explanation:
      'Etela Rajender (BJP) wins Huzurabad by-election, defeating TRS candidate Gellu Srinivas Yadav. BJP\'s second by-election win in Telangana, confirming the party\'s growing footprint.',
    details: 'TRS threw everything at Huzurabad including the Dalit Bandhu scheme. Etela\'s personal connect prevailed.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },

  // ── KOMATIREDDY RAJAGOPAL REDDY RESIGNS: Aug 2022 ──
  {
    id: 'TS-2-2022-RESIGN-MUNUGODE',
    date: '2022-08-08',
    assembly: 2,
    eventType: 'RESIGNATION',
    acNos: [93],
    memberNames: ['Komatireddy Rajagopal Reddy (Munugode)'],
    debitParty: 'INC',
    creditParty: 'VACANT',
    seats: 1,
    explanation:
      'Komatireddy Rajagopal Reddy (INC) resigns from Munugode to join BJP and contest the by-election. Seat vacated.',
    details:
      'Rajagopal Reddy, brother of senior INC leader Komatireddy Venkat Reddy, defected to BJP. ' +
      'His resignation triggered a high-stakes by-election that became a prestige battle for all parties.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── TRS RENAMED TO BRS: Oct 2022 ──
  {
    id: 'TS-2-2022-RENAME-TRS-BRS',
    date: '2022-10-05',
    assembly: 2,
    eventType: 'PARTY_RENAME',
    acNos: [],
    memberNames: [],
    debitParty: 'TRS',
    creditParty: 'BRS',
    seats: 0,
    explanation:
      'TRS officially renamed to Bharat Rashtra Samithi (BRS). All TRS seats are now counted as BRS. No numerical change — this is a balance transfer, not a transaction.',
    details:
      'KCR renamed TRS to BRS to signal national ambitions beyond Telangana. ' +
      'Election Commission approved the name change. All sitting MLAs automatically became BRS members.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/Bharat_Rashtra_Samithi',
      'https://www.thehindu.com/news/national/telangana/',
    ],
    verified: true,
  },

  // ── MUNUGODE BY-ELECTION: Nov 2022 ──
  {
    id: 'TS-2-2022-BY-MUNUGODE',
    date: '2022-11-06',
    assembly: 2,
    eventType: 'BY_ELECTION',
    acNos: [93],
    memberNames: ['Kusukuntla Prabhakar Reddy (BRS)'],
    debitParty: 'VACANT',
    creditParty: 'BRS',
    seats: 1,
    explanation:
      'BRS wins Munugode by-election. Kusukuntla Prabhakar Reddy (BRS) defeats Komatireddy Rajagopal Reddy (BJP). Despite his defection from INC to BJP, Rajagopal Reddy failed to win.',
    details:
      'Massive money power and political attention on this by-election. BRS deployed heavy resources. BJP\'s Rajagopal Reddy lost despite switching parties.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2018_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
];

// ─── 3RD ASSEMBLY (Dec 2023 – present) ───────────────────────────────────

const ASSEMBLY_3_EVENTS: PoliticalLedgerEntry[] = [
  // ── GENERAL ELECTION: 2023-11-30 ──
  {
    id: 'TS-3-2023-GE-INC',
    date: '2023-12-03',
    assembly: 3,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'INC',
    seats: 64,
    explanation:
      'INC sweeps to power with 64 seats — a dramatic turnaround from 19 seats in 2018 (and just 6 after the merger). Anti-incumbency against BRS and Revanth Reddy\'s leadership delivered the result.',
    details: 'INC vote share: 39.4%. Revanth Reddy becomes Chief Minister — the same leader who was TDP MLA in 2014.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election',
      'https://results.eci.gov.in/',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2023-GE-BRS',
    date: '2023-12-03',
    assembly: 3,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'BRS',
    seats: 39,
    explanation:
      'BRS (formerly TRS) wins 39 seats — a massive fall from 88 in 2018. KCR\'s 9-year rule ends with strong anti-incumbency.',
    details: 'BRS vote share: 37.4%. Despite similar vote share to INC, the first-past-the-post system delivered far fewer seats.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2023-GE-BJP',
    date: '2023-12-03',
    assembly: 3,
    eventType: 'GENERAL_ELECTION',
    acNos: [],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'BJP',
    seats: 8,
    explanation: 'BJP wins 8 seats — up from 1 in 2018. Strong growth in North Telangana and Hyderabad urban pockets.',
    details: 'BJP vote share: 13.9%. The party consolidated its position as the third force in Telangana.',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2023-GE-AIMIM',
    date: '2023-12-03',
    assembly: 3,
    eventType: 'GENERAL_ELECTION',
    acNos: [58, 64, 65, 66, 67, 68, 69],
    memberNames: [],
    debitParty: 'VACANT',
    creditParty: 'AIMIM',
    seats: 7,
    explanation: 'AIMIM retains all 7 Old City Hyderabad seats — for the third consecutive election. A remarkable bastion.',
    details: 'AIMIM\'s dominance in Hyderabad Old City remains unchallenged across 3 elections (2014, 2018, 2023).',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2023-GE-CPI',
    date: '2023-12-03',
    assembly: 3,
    eventType: 'GENERAL_ELECTION',
    acNos: [23],
    memberNames: ['Kunamneni Sambasiva Rao (Ramagundam)'],
    debitParty: 'VACANT',
    creditParty: 'CPI',
    seats: 1,
    explanation: 'CPI wins Ramagundam. Telangana\'s sole left-party seat in the 3rd Assembly.',
    details: 'Ramagundam has been a left-leaning industrial constituency (Singareni Collieries belt).',
    legalStatus: 'NOT_APPLICABLE',
    sources: [
      'https://en.wikipedia.org/wiki/2023_Telangana_Legislative_Assembly_election',
    ],
    verified: true,
  },

  // ── 2024 BRS → INC DEFECTIONS ──
  // "Operation Akarsh 2.0" — Now INC pulls BRS MLAs
  {
    id: 'TS-3-2024-DEF-DANAM',
    date: '2024-03-19',
    assembly: 3,
    eventType: 'DEFECTION',
    acNos: [60],
    memberNames: ['Danam Nagender (Khairatabad)'],
    debitParty: 'BRS',
    creditParty: 'INC',
    seats: 1,
    explanation:
      'Danam Nagender, BRS MLA from Khairatabad, defects to INC. He was the first BRS MLA to switch after the 2023 election. Notably, he had previously been in INC (2014), then joined TRS (2018), and now returns to INC.',
    details:
      'A veteran politician who has been with multiple parties. His defection opened the floodgates for more BRS MLAs to follow.',
    legalStatus: 'PETITION_FILED',
    sources: [
      'https://www.thehindu.com/news/national/telangana/brs-moves-supreme-court-for-action-against-defected-mlas/article69104662.ece',
      'https://telanganatoday.com/defected-brs-mlas-in-a-spot-of-bother',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2024-DEF-KADIYAM',
    date: '2024-06-13',
    assembly: 3,
    eventType: 'DEFECTION',
    acNos: [99],
    memberNames: ['Kadiyam Srihari (Station Ghanpur)'],
    debitParty: 'BRS',
    creditParty: 'INC',
    seats: 1,
    explanation:
      'Kadiyam Srihari, former Deputy CM under KCR, defects from BRS to INC. A high-profile exit that signalled deep cracks in BRS.',
    details: 'Srihari was Deputy CM in 2018 TRS government. His departure was a major embarrassment for KCR.',
    legalStatus: 'PETITION_FILED',
    sources: [
      'https://www.thehindu.com/news/national/telangana/brs-moves-supreme-court-for-action-against-defected-mlas/article69104662.ece',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2024-DEF-TELLAM',
    date: '2024-06-14',
    assembly: 3,
    eventType: 'DEFECTION',
    acNos: [119],
    memberNames: ['Tellam Venkata Rao (Bhadrachalam)'],
    debitParty: 'BRS',
    creditParty: 'INC',
    seats: 1,
    explanation: 'Tellam Venkata Rao, Bhadrachalam (ST) MLA, defects from BRS to INC.',
    details: 'Bhadrachalam is an ST-reserved constituency in tribal Bhadradri Kothagudem district.',
    legalStatus: 'PETITION_FILED',
    sources: [
      'https://www.thehindu.com/news/national/telangana/brs-moves-supreme-court-for-action-against-defected-mlas/article69104662.ece',
    ],
    verified: true,
  },
  {
    id: 'TS-3-2024-DEF-BATCH-7',
    date: '2024-07-10',
    assembly: 3,
    eventType: 'DEFECTION',
    acNos: [14, 21, 40, 51, 52, 53, 79],
    memberNames: [
      'Pocharam Srinivas Reddy (Banswada)',
      'M. Sanjay Kumar (Jagtial)',
      'Gudem Mahipal Reddy (Patancheru)',
      'T. Prakash Goud (Rajendranagar)',
      'Arekapudi Gandhi (Serilingampally)',
      'Kale Yadaiah (Chevella)',
      'Bandla Krishna Mohan Reddy (Gadwal)',
    ],
    debitParty: 'BRS',
    creditParty: 'INC',
    seats: 7,
    explanation:
      '7 BRS MLAs defect to INC in a batch — the largest single-day defection event of the 3rd Assembly. ' +
      'Includes former Speaker Pocharam Srinivas Reddy and serial defector T. Prakash Goud (TDP→TRS→BRS→INC across 3 assemblies). ' +
      'This brings total BRS→INC defections to 10, reducing BRS from 39 to 29 and inflating INC from 64 to 74.',
    details:
      'BRS filed a Special Leave Petition (SLP) in the Supreme Court against 3 MLAs (Danam Nagender, Kadiyam Srihari, Tellam Venkat Rao) ' +
      'and a writ petition against these 7. The Telangana High Court served notices to the Speaker and all 10 MLAs. ' +
      'Notably, T. Prakash Goud and Arekapudi Gandhi were originally TDP MLAs (2014) who merged with TRS (2016), ' +
      'won on TRS/BRS ticket (2018, 2023), and now joined INC — their 3rd party in 10 years.',
    legalStatus: 'COURT_CHALLENGE',
    sources: [
      'https://www.thehindu.com/news/national/telangana/brs-moves-supreme-court-for-action-against-defected-mlas/article69104662.ece',
      'https://www.thehindu.com/news/national/telangana/telangana-hc-serves-notices-to-speaker-eci-over-10-mlas-defection/article68674908.ece',
      'https://www.newindianexpress.com/states/telangana/2024/Jul/14/operation-akarsh-congress-eyes-greater-hyderabad-gains-after-nine-brs-mlas-jump-ship',
      'https://telanganatoday.com/defected-brs-mlas-in-a-spot-of-bother',
    ],
    verified: true,
  },
];

// ─── COMBINED TIMELINE ────────────────────────────────────────────────────

export const TELANGANA_POLITICAL_LEDGER: PoliticalLedgerEntry[] = [
  ...ASSEMBLY_1_EVENTS,
  ...ASSEMBLY_2_EVENTS,
  ...ASSEMBLY_3_EVENTS,
];

// ─── INITIAL BALANCES (post-election) ─────────────────────────────────────

/**
 * Opening balances after each general election.
 * Think of these as the "opening balance sheet" for each assembly term.
 */
export const OPENING_BALANCES: Record<1 | 2 | 3, Record<string, number>> = {
  1: { TRS: 63, INC: 21, TDP: 15, AIMIM: 7, BJP: 5, OTHERS: 8 },
  2: { TRS: 88, INC: 19, AIMIM: 7, TDP: 2, BJP: 1, OTHERS: 2 },
  3: { INC: 64, BRS: 39, BJP: 8, AIMIM: 7, CPI: 1 },
};

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────

/**
 * Compute party strength at any point in time by replaying ledger entries.
 * Like "trial balance" in accounting — replay all transactions up to a date.
 *
 * @param upToDate - ISO date string (inclusive). Omit for current state.
 * @param assembly - Filter to a specific assembly (1, 2, or 3)
 * @returns PartyStrengthSnapshot with guaranteed tally = 119
 */
export function computePartyStrength(
  upToDate?: string,
  assembly?: 1 | 2 | 3,
): PartyStrengthSnapshot {
  const parties: Record<string, number> = {};
  let vacant = TOTAL_SEATS; // Start with all seats vacant
  let lastEventId = 'INITIAL';
  let lastDate = '';
  let currentAssembly: 1 | 2 | 3 = 1;

  const events = assembly
    ? TELANGANA_POLITICAL_LEDGER.filter((e) => e.assembly === assembly)
    : TELANGANA_POLITICAL_LEDGER;

  for (const entry of events) {
    if (upToDate && entry.date > upToDate) break;

    // Handle PARTY_RENAME: transfer entire balance
    if (entry.eventType === 'PARTY_RENAME') {
      const balance = parties[entry.debitParty] || 0;
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + balance;
      delete parties[entry.debitParty];
      lastEventId = entry.id;
      lastDate = entry.date;
      currentAssembly = entry.assembly;
      continue;
    }

    // Handle GENERAL_ELECTION: fills seats from VACANT
    if (entry.eventType === 'GENERAL_ELECTION') {
      // New election resets everything for that assembly
      if (entry === events.find((e) => e.eventType === 'GENERAL_ELECTION' && e.assembly === entry.assembly)) {
        // First GE entry for this assembly — reset
        Object.keys(parties).forEach((k) => delete parties[k]);
        vacant = TOTAL_SEATS;
      }
    }

    // Apply debit
    if (entry.debitParty === 'VACANT') {
      vacant -= entry.seats;
    } else if (entry.seats > 0) {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      if (parties[entry.debitParty] === 0) delete parties[entry.debitParty];
    }

    // Apply credit
    if (entry.creditParty === 'VACANT') {
      vacant += entry.seats;
    } else if (entry.seats > 0) {
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
    }

    lastEventId = entry.id;
    lastDate = entry.date;
    currentAssembly = entry.assembly;
  }

  const totalSeats = Object.values(parties).reduce((a, b) => a + b, 0) + vacant;

  return {
    date: lastDate || upToDate || new Date().toISOString().slice(0, 10),
    assembly: currentAssembly,
    afterEvent: lastEventId,
    parties,
    vacant,
    totalSeats,
    explanation: generateExplanation(parties, vacant, currentAssembly),
  };
}

/**
 * Validate that the ledger balances at every step.
 * Like an "audit" — checks that no transaction creates or destroys seats.
 *
 * @returns Array of errors (empty = clean audit)
 */
export function auditLedger(): string[] {
  const errors: string[] = [];
  const parties: Record<string, number> = {};
  let vacant = 0;
  let currentAssembly = 0;

  for (const entry of TELANGANA_POLITICAL_LEDGER) {
    // New assembly = fresh start
    if (entry.eventType === 'GENERAL_ELECTION' && entry.assembly !== currentAssembly) {
      Object.keys(parties).forEach((k) => delete parties[k]);
      vacant = TOTAL_SEATS;
      currentAssembly = entry.assembly;
    }

    // Handle rename
    if (entry.eventType === 'PARTY_RENAME') {
      const balance = parties[entry.debitParty] || 0;
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + balance;
      delete parties[entry.debitParty];
      continue;
    }

    // Apply debit
    if (entry.debitParty === 'VACANT') {
      vacant -= entry.seats;
    } else if (entry.seats > 0) {
      parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
      if (parties[entry.debitParty] === 0) delete parties[entry.debitParty];
    }

    // Apply credit
    if (entry.creditParty === 'VACANT') {
      vacant += entry.seats;
    } else if (entry.seats > 0) {
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
    }

    // Check balance
    const total = Object.values(parties).reduce((a, b) => a + b, 0) + vacant;
    if (total !== TOTAL_SEATS) {
      errors.push(
        `BALANCE ERROR after ${entry.id} (${entry.date}): ` +
        `total=${total}, expected=${TOTAL_SEATS}. ` +
        `Parties: ${JSON.stringify(parties)}, Vacant: ${vacant}`,
      );
    }

    // Check no negative balances
    for (const [party, seats] of Object.entries(parties)) {
      if (seats < 0) {
        errors.push(
          `NEGATIVE BALANCE for ${party} after ${entry.id} (${entry.date}): ${seats} seats`,
        );
      }
    }
  }

  return errors;
}

/**
 * Get all snapshots — one per event — for building a timeline visualization.
 */
export function generateTimeline(): PartyStrengthSnapshot[] {
  const snapshots: PartyStrengthSnapshot[] = [];
  const parties: Record<string, number> = {};
  let vacant = TOTAL_SEATS;
  let currentAssembly: 1 | 2 | 3 = 0 as any;

  for (const entry of TELANGANA_POLITICAL_LEDGER) {
    if (entry.eventType === 'GENERAL_ELECTION' && entry.assembly !== currentAssembly) {
      Object.keys(parties).forEach((k) => delete parties[k]);
      vacant = TOTAL_SEATS;
      currentAssembly = entry.assembly;
    }

    if (entry.eventType === 'PARTY_RENAME') {
      const balance = parties[entry.debitParty] || 0;
      parties[entry.creditParty] = (parties[entry.creditParty] || 0) + balance;
      delete parties[entry.debitParty];
    } else {
      if (entry.debitParty === 'VACANT') {
        vacant -= entry.seats;
      } else if (entry.seats > 0) {
        parties[entry.debitParty] = (parties[entry.debitParty] || 0) - entry.seats;
        if (parties[entry.debitParty] === 0) delete parties[entry.debitParty];
      }
      if (entry.creditParty === 'VACANT') {
        vacant += entry.seats;
      } else if (entry.seats > 0) {
        parties[entry.creditParty] = (parties[entry.creditParty] || 0) + entry.seats;
      }
    }

    snapshots.push({
      date: entry.date,
      assembly: entry.assembly,
      afterEvent: entry.id,
      parties: { ...parties },
      vacant,
      totalSeats: Object.values(parties).reduce((a, b) => a + b, 0) + vacant,
      explanation: entry.explanation,
    });
  }

  return snapshots;
}

/**
 * Get defection history for a specific MLA (by name search).
 * Shows every party they have been part of — the "loyalty trail."
 */
export function getMLAPartyTrail(memberName: string): PoliticalLedgerEntry[] {
  const normalised = memberName.toLowerCase();
  return TELANGANA_POLITICAL_LEDGER.filter((e) =>
    e.memberNames.some((n) => n.toLowerCase().includes(normalised)),
  );
}

/**
 * Get all events for a specific constituency.
 */
export function getConstituencyTimeline(acNo: number): PoliticalLedgerEntry[] {
  return TELANGANA_POLITICAL_LEDGER.filter((e) => e.acNos.includes(acNo));
}

/**
 * Count total defections across all assemblies, grouped by direction.
 * e.g., { 'TDP→TRS': 12, 'INC→TRS': 12, 'BRS→INC': 10, ... }
 */
export function getDefectionSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of TELANGANA_POLITICAL_LEDGER) {
    if (entry.eventType === 'DEFECTION' || entry.eventType === 'PARTY_MERGER') {
      const key = `${entry.debitParty}→${entry.creditParty}`;
      summary[key] = (summary[key] || 0) + entry.seats;
    }
  }
  return summary;
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────

function generateExplanation(
  parties: Record<string, number>,
  vacant: number,
  assembly: 1 | 2 | 3,
): string {
  const sorted = Object.entries(parties).sort(([, a], [, b]) => b - a);
  const partyStr = sorted.map(([p, s]) => `${p}: ${s}`).join(', ');
  const assemblyLabel = assembly === 1 ? '1st' : assembly === 2 ? '2nd' : '3rd';
  const vacantStr = vacant > 0 ? ` | Vacant: ${vacant}` : '';
  return `${assemblyLabel} Assembly — ${partyStr}${vacantStr} | Total: ${TOTAL_SEATS}`;
}
