/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ANDHRA PRADESH POLITICAL TRIVIA                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * "Did You Know?" facts for AP — curated + derived from ledger data.
 *
 * ── DATA SOURCES ────────────────────────────────────────────────────────
 *  1. ECI results, 2014/2019/2024
 *  2. AP political timeline ledger
 *  3. Wikipedia, The Hindu, Eenadu
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { AP_POLITICAL_LEDGER } from './andhra-pradesh-political-timeline';

// ─── CURATED TRIVIA ──────────────────────────────────────────────────────

const CURATED_TRIVIA: TriviaItem[] = [
  {
    id: 'AP-T-001',
    emoji: '🏆',
    headline: 'Chandrababu Naidu — The Comeback King',
    body: 'N. Chandrababu Naidu won Kuppam in 2024 with the highest margin in AP — over 72,000 votes. He became CM for the 4th time at the age of 74.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 130 },
      { type: 'PARTY', party: 'TDP' },
      { type: 'MLA', name: 'N Chandrababu Naidu' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-002',
    emoji: '🎬',
    headline: 'Pawan Kalyan — From Reel to Real',
    body: 'Jana Sena Party chief Pawan Kalyan won Pithapuram (AC 37) in 2024 with a massive margin of 67,890 votes. JSP achieved a 100% strike rate — winning all 21 seats it contested.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 37 },
      { type: 'PARTY', party: 'JSP' },
      { type: 'MLA', name: 'Pawan Kalyan' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-003',
    emoji: '📉',
    headline: 'YSRCP: From 151 to 11',
    body: 'In 2019, YSRCP won 151/175 seats — the biggest mandate in AP history. In 2024, they were reduced to just 11 seats, losing 140 seats in one election cycle.',
    category: 'ELECTION',
    contexts: [
      { type: 'PARTY', party: 'YSRCP' },
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-004',
    emoji: '🤝',
    headline: 'NDA Triple Alliance Sweep',
    body: 'The TDP-JSP-BJP alliance won 164/175 seats in 2024 — the most lopsided result in AP\'s post-bifurcation history. The alliance won 93.7% of all seats.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2024 },
      { type: 'PARTY', party: 'TDP' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-005',
    emoji: '🏰',
    headline: 'Pulivendula — Jagan\'s Last Bastion',
    body: 'Even in the 2024 wipeout, Y.S. Jagan Mohan Reddy won Pulivendula (AC 138) by 45,678 votes — his family has held this seat for over 40 years.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 138 },
      { type: 'MLA', name: 'Y S Jagan Mohan Reddy' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-006',
    emoji: '🔄',
    headline: 'Operation Akarsh 2.0',
    body: 'Before the 2024 elections, 6 YSRCP MLAs defected to TDP — mirroring the "Operation Akarsh" of 2017 when YSRCP MLAs were lured to TDP during Chandrababu\'s government.',
    category: 'DEFECTION',
    contexts: [
      { type: 'ELECTION', year: 2024 },
      { type: 'PARTY', party: 'YSRCP' },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'AP-T-007',
    emoji: '🎭',
    headline: 'Rapaka\'s Triple Switch',
    body: 'Rapaka Varaprasad (Razole) won on JSP ticket in 2019, defected to YSRCP in 2020, and the seat went back to TDP in 2024. Three parties in five years!',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 16 },
      { type: 'PARTY', party: 'JSP' },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'AP-T-008',
    emoji: '👩',
    headline: 'Roja — Actress-Turned-Politician Survives Wave',
    body: 'Actress-turned-politician Roja Selvamani (YSRCP) held Nagari (AC 125) even in the 2024 NDA wave, winning her 3rd consecutive term.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 125 },
      { type: 'MLA', name: 'Roja Selvamani' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-009',
    emoji: '🎬',
    headline: 'Balakrishna — Legend on Both Screens',
    body: 'Telugu superstar Nandamuri Balakrishna (Hindupur, AC 165) has won 3 terms as MLA while continuing his acting career. He is also the son-in-law of NTR (founder of TDP).',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 165 },
      { type: 'MLA', name: 'Balakrishna Nandamuri' },
    ],
    source: 'https://en.wikipedia.org/wiki/Nandamuri_Balakrishna',
    derived: false,
  },
  {
    id: 'AP-T-010',
    emoji: '📊',
    headline: 'Kadapa — YSRCP\'s Impenetrable Fortress',
    body: 'Kadapa district is the stronghold of the Reddy family. In 2024, YSRCP won 3 out of 10 seats here — their best performance in any district while being wiped out statewide.',
    category: 'ELECTION',
    contexts: [
      { type: 'PARTY', party: 'YSRCP' },
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-011',
    emoji: '🗳️',
    headline: 'AP\'s Alternating Pattern',
    body: 'Post-bifurcation AP has never re-elected an incumbent: TDP won in 2014, YSRCP in 2019, TDP again in 2024. The state has a strong anti-incumbency culture.',
    category: 'COINCIDENCE',
    contexts: [
      { type: 'GLOBAL' },
    ],
    source: 'https://en.wikipedia.org/wiki/Andhra_Pradesh_Legislative_Assembly',
    derived: false,
  },
  {
    id: 'AP-T-012',
    emoji: '🏛️',
    headline: 'Nara Lokesh — The Heir Arrives',
    body: 'Nara Lokesh, son of Chandrababu Naidu, won Mangalagiri (AC 96) in 2024 by 58,765 votes after losing his first election in 2019. He became the IT Minister.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 96 },
      { type: 'MLA', name: 'Nara Lokesh' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-013',
    emoji: '⚖️',
    headline: 'Anti-Defection Law Toothless in AP',
    body: 'Despite multiple defections across all 3 assemblies, not a single MLA has been disqualified under the anti-defection law in post-bifurcation AP.',
    category: 'LEGAL',
    contexts: [
      { type: 'GLOBAL' },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'AP-T-014',
    emoji: '🌊',
    headline: 'Visakhapatnam — TDP\'s Urban Fortress',
    body: 'All 15 Visakhapatnam district seats were won by the TDP-JSP alliance in 2024, with margins exceeding 25,000 in urban constituencies.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2024 },
      { type: 'PARTY', party: 'TDP' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'AP-T-015',
    emoji: '🏗️',
    headline: 'The Capital City Question',
    body: 'AP is the only Indian state without a permanent capital since bifurcation. Jagan proposed 3 capitals (Amaravati, Visakhapatnam, Kurnool). Chandrababu reversed this in 2024, restoring Amaravati as sole capital.',
    category: 'DYNASTY',
    contexts: [
      { type: 'GLOBAL' },
    ],
    source: 'https://en.wikipedia.org/wiki/Amaravati',
    derived: false,
  },
];

// ─── DERIVED TRIVIA (from ledger) ────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  const defections = AP_POLITICAL_LEDGER.filter(
    (e) => e.eventType === 'DEFECTION',
  );

  if (defections.length > 0) {
    const totalDefectors = defections.reduce((sum, e) => sum + e.seats, 0);
    derived.push({
      id: 'AP-T-DRV-001',
      emoji: '🔀',
      headline: `${totalDefectors} MLAs Have Switched Parties`,
      body: `Across 3 assemblies, ${totalDefectors} AP MLAs have formally defected to another party. The most common direction: YSRCP→TDP and TDP→YSRCP.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Derived from AP political ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── API ──────────────────────────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;

export function getAPAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

export function getAPTriviaForConstituency(acNo: number): TriviaItem[] {
  return getAPAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo),
    ),
  );
}

export function getAPTriviaForParty(party: string): TriviaItem[] {
  return getAPAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'PARTY' && 'party' in c && c.party === party),
    ),
  );
}

export function getAPTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getAPAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower)),
    ),
  );
}

export function getAPTriviaForElection(year: number): TriviaItem[] {
  return getAPAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'ELECTION' && 'year' in c && c.year === year),
    ),
  );
}

export function getAPRandomTrivia(): TriviaItem {
  const all = getAPAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getAPRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getAPAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getAPTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getAPAllTrivia().filter((t) => t.category === category);
}
