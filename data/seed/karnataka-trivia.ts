/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  KARNATAKA POLITICAL TRIVIA                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * "Did You Know?" facts for Karnataka — curated + derived from ledger data.
 */

import type { TriviaItem, TriviaCategory } from './telangana-trivia';
import { KA_POLITICAL_LEDGER } from './karnataka-political-timeline';

const CURATED_TRIVIA: TriviaItem[] = [
  {
    id: 'KA-T-001',
    emoji: '🎭',
    headline: 'Operation Kamala — The Biggest Defection Drama',
    body: '17 JDS-INC MLAs resigned in July 2019 to topple the coalition government. 12 of them won by-elections on BJP tickets just months later.',
    category: 'DEFECTION',
    contexts: [{ type: 'GLOBAL' }],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'KA-T-002',
    emoji: '🏆',
    headline: 'Siddaramaiah — The Guarantee Man',
    body: 'Siddaramaiah won Badami (AC 38) in 2023 with a margin of 42,567 votes. His 5 guarantee schemes are credited with INC\'s 135-seat landslide.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 38 },
      { type: 'MLA', name: 'Siddaramaiah' },
      { type: 'ELECTION', year: 2023 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'KA-T-003',
    emoji: '👨‍👦',
    headline: 'Deve Gowda Dynasty — Three Generations in Politics',
    body: 'H.D. Deve Gowda (former PM), his son H.D. Kumaraswamy (former CM), and grandson Prajwal Revanna have all held elected office — a rare three-generation political dynasty.',
    category: 'DYNASTY',
    contexts: [
      { type: 'PARTY', party: 'JDS' },
    ],
    source: 'https://en.wikipedia.org/wiki/H._D._Deve_Gowda',
    derived: false,
  },
  {
    id: 'KA-T-004',
    emoji: '📉',
    headline: 'BJP: From 104 to 66',
    body: 'BJP lost 38 seats between 2018 and 2023. "40% commission" corruption charges and leadership instability (3 CMs in one term) were key factors.',
    category: 'ELECTION',
    contexts: [
      { type: 'PARTY', party: 'BJP' },
      { type: 'ELECTION', year: 2023 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'KA-T-005',
    emoji: '🏛️',
    headline: 'Three CMs in One Term',
    body: 'Karnataka had 3 BJP Chief Ministers in the 2018-2023 term: Yediyurappa (2019-2021), Basavaraj Bommai (2021-2023), and briefly Sadananda Gowda considerations.',
    category: 'RECORD',
    contexts: [
      { type: 'PARTY', party: 'BJP' },
    ],
    source: 'https://en.wikipedia.org/wiki/List_of_chief_ministers_of_Karnataka',
    derived: false,
  },
  {
    id: 'KA-T-006',
    emoji: '🎬',
    headline: 'Jarkiholi Brothers — On Opposite Sides',
    body: 'The Jarkiholi brothers of Belgaum are in different parties: Ramesh in BJP (Gokak) and Balachandra in INC (Arabhavi). Political rivalry within the family!',
    category: 'DYNASTY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 11 },
      { type: 'CONSTITUENCY', acNo: 12 },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'KA-T-007',
    emoji: '🗳️',
    headline: 'Coastal Karnataka — BJP\'s Fortress',
    body: 'Dakshina Kannada and Udupi districts consistently vote for BJP. In 2023, BJP won all 8 coastal seats despite losing the state.',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'PARTY', party: 'BJP' },
      { type: 'ELECTION', year: 2023 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'KA-T-008',
    emoji: '🌾',
    headline: 'Old Mysuru — JDS Heartland Shrinking',
    body: 'JDS\'s stronghold in Old Mysuru region (Mandya, Hassan, Mysuru) shrank from 30+ seats in 2018 to under 15 in 2023 as INC made inroads.',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'PARTY', party: 'JDS' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'KA-T-009',
    emoji: '💰',
    headline: '5 Guarantee Schemes Won The Election',
    body: 'INC promised 5 guarantees: Gruha Lakshmi (₹2000/month to women), Shakti (free bus travel for women), Anna Bhagya (10kg free rice), Yuva Nidhi (₹3000/month for graduates), and free 200 units of power.',
    category: 'ELECTION',
    contexts: [
      { type: 'PARTY', party: 'INC' },
      { type: 'ELECTION', year: 2023 },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'KA-T-010',
    emoji: '⚖️',
    headline: 'Anti-Defection Toothless in Karnataka Too',
    body: 'Despite 17 MLAs resigning in 2019 to topple the government, the Speaker disqualified them — but the Supreme Court allowed them to contest by-elections immediately.',
    category: 'LEGAL',
    contexts: [{ type: 'GLOBAL' }],
    source: 'https://www.livelaw.in/',
    derived: false,
  },
  {
    id: 'KA-T-011',
    emoji: '🏙️',
    headline: 'Bengaluru — 28 Seats, Evenly Split',
    body: 'Bengaluru has 28 assembly seats. In 2023, INC won 15 and BJP won 13 — a sharp swing from 2018 when BJP dominated the city.',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'ELECTION', year: 2023 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'KA-T-012',
    emoji: '🔁',
    headline: 'Karnataka\'s Alternating Trend',
    body: 'Since 1999, Karnataka has never re-elected the ruling party: INC (1999) → BJP (2008) → INC (2013) → JDS-INC/BJP (2018) → INC (2023).',
    category: 'COINCIDENCE',
    contexts: [{ type: 'GLOBAL' }],
    source: 'https://en.wikipedia.org/wiki/Karnataka_Legislative_Assembly',
    derived: false,
  },
];

// ─── DERIVED TRIVIA ──────────────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];
  const defections = KA_POLITICAL_LEDGER.filter((e) => e.eventType === 'DEFECTION');

  if (defections.length > 0) {
    const totalDefectors = defections.reduce((sum, e) => sum + e.seats, 0);
    derived.push({
      id: 'KA-T-DRV-001',
      emoji: '🔀',
      headline: `${totalDefectors} MLAs Defected in Operation Kamala`,
      body: `In 2019, ${totalDefectors} JDS-INC-IND MLAs resigned to topple the coalition government. Most re-won on BJP tickets in subsequent by-elections.`,
      category: 'DEFECTION' as TriviaCategory,
      contexts: [{ type: 'GLOBAL' }],
      source: 'Derived from KA political ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── API ──────────────────────────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;

export function getKAAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

export function getKATriviaForConstituency(acNo: number): TriviaItem[] {
  return getKAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo),
  );
}

export function getKATriviaForParty(party: string): TriviaItem[] {
  return getKAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party),
  );
}

export function getKATriviaForElection(year: number): TriviaItem[] {
  return getKAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year),
  );
}

export function getKARandomTrivia(): TriviaItem {
  const all = getKAAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getKATriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getKAAllTrivia().filter((t) => t.category === category);
}
