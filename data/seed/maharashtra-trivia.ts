/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MAHARASHTRA POLITICAL TRIVIA                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import type { TriviaItem, TriviaCategory } from './telangana-trivia';
import { MH_POLITICAL_LEDGER } from './maharashtra-political-timeline';

const CURATED_TRIVIA: TriviaItem[] = [
  {
    id: 'MH-T-001',
    emoji: '🔱',
    headline: 'The Great Shiv Sena Split',
    body: 'In June 2022, Eknath Shinde led 40 of 56 Shiv Sena MLAs in a rebellion against Uddhav Thackeray. The ECI later awarded the Shiv Sena name and symbol to the Shinde faction.',
    category: 'DEFECTION',
    contexts: [{ type: 'PARTY', party: 'SHS' }],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'MH-T-002',
    emoji: '👨‍👦',
    headline: 'Pawar vs Pawar — Uncle vs Nephew',
    body: 'Ajit Pawar split the NCP in July 2023, taking 40+ MLAs to join BJP-led Mahayuti. His uncle Sharad Pawar (83) continued fighting, founding NCP(SP).',
    category: 'DYNASTY',
    contexts: [
      { type: 'PARTY', party: 'NCP' },
      { type: 'MLA', name: 'Ajit Pawar' },
    ],
    source: 'https://www.ndtv.com/',
    derived: false,
  },
  {
    id: 'MH-T-003',
    emoji: '🏆',
    headline: 'Fadnavis — The Comeback Man',
    body: 'Devendra Fadnavis won Nagpur South West (AC 170) in 2024 with a massive margin. He became CM for the 3rd time, after being sidelined as Deputy CM for 2 years.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 170 },
      { type: 'MLA', name: 'Devendra Fadnavis' },
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-004',
    emoji: '📉',
    headline: 'INC: From 44 to 16',
    body: 'Congress was decimated in Maharashtra — from 44 seats in 2019 to just 16 in 2024. Their worst-ever performance in the state.',
    category: 'ELECTION',
    contexts: [
      { type: 'PARTY', party: 'INC' },
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-005',
    emoji: '🎬',
    headline: 'Aaditya Thackeray — The Worli Prince',
    body: 'Aaditya Thackeray (Uddhav\'s son) retained Worli (AC 102) even as his father\'s faction was decimated statewide. He is seen as the future of Shiv Sena (UBT).',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 102 },
      { type: 'MLA', name: 'Aaditya Thackeray' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-006',
    emoji: '🗳️',
    headline: 'Mahayuti Tsunami — 230/288',
    body: 'The BJP-SHS-NCP (Mahayuti) alliance won 230 of 288 seats in 2024 — the most lopsided result in Maharashtra\'s history. Opposition MVA won just 46 seats.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2024 },
      { type: 'PARTY', party: 'BJP' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-007',
    emoji: '⚖️',
    headline: 'Two Parties, Same Name',
    body: 'Maharashtra is the only state where BOTH major coalition partners (Shiv Sena, NCP) split into two, each claiming the original name. Courts and ECI had to adjudicate.',
    category: 'LEGAL',
    contexts: [{ type: 'GLOBAL' }],
    source: 'https://www.livelaw.in/',
    derived: false,
  },
  {
    id: 'MH-T-008',
    emoji: '🏙️',
    headline: 'Mumbai — 36 Seats, BJP Dominates',
    body: 'Mumbai\'s 36 assembly seats were largely swept by Mahayuti in 2024. BJP alone won 16, SHS (Shinde) won 8, while Uddhav\'s SHSUBT held on to 6.',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-009',
    emoji: '🌾',
    headline: 'Baramati — Pawar Family\'s Last Stand',
    body: 'Ajit Pawar has held Baramati (AC 121) for 7 consecutive terms since 1991. In 2024, he won again despite the family feud with uncle Sharad Pawar.',
    category: 'DYNASTY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 121 },
      { type: 'MLA', name: 'Ajit Pawar' },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-010',
    emoji: '🔁',
    headline: 'Lok Sabha to Vidhansabha Swing',
    body: 'In the June 2024 Lok Sabha elections, MVA won 30/48 seats in Maharashtra. Just 5 months later, Mahayuti flipped the script with 230/288 in the Assembly elections.',
    category: 'COINCIDENCE',
    contexts: [
      { type: 'ELECTION', year: 2024 },
    ],
    source: 'https://results.eci.gov.in/',
    derived: false,
  },
  {
    id: 'MH-T-011',
    emoji: '💰',
    headline: 'Ladki Bahin — The Game Changer?',
    body: 'The Mahayuti government\'s "Mukhyamantri Majhi Ladki Bahin" scheme (₹1500/month to women) is widely credited for the 2024 landslide — similar to Karnataka\'s guarantee schemes.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2024 },
      { type: 'PARTY', party: 'BJP' },
    ],
    source: 'https://www.thehindu.com/',
    derived: false,
  },
  {
    id: 'MH-T-012',
    emoji: '🏛️',
    headline: 'Rahul Narwekar — Youngest Speaker',
    body: 'Rahul Narwekar (Colaba, AC 107) became Maharashtra\'s youngest Assembly Speaker at 44. He adjudicated the Shiv Sena disqualification cases.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 107 },
      { type: 'MLA', name: 'Rahul Narwekar' },
    ],
    source: 'https://en.wikipedia.org/wiki/Rahul_Narwekar',
    derived: false,
  },
];

// ─── DERIVED ──────────────────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];
  const splits = MH_POLITICAL_LEDGER.filter((e) => e.eventType === 'DEFECTION');

  if (splits.length > 0) {
    derived.push({
      id: 'MH-T-DRV-001',
      emoji: '🔀',
      headline: 'Two Major Party Splits in One Term',
      body: 'Maharashtra saw both Shiv Sena (2022) and NCP (2023) split during the 2019-2024 assembly term — unprecedented in Indian politics.',
      category: 'DEFECTION' as TriviaCategory,
      contexts: [{ type: 'GLOBAL' }],
      source: 'Derived from MH political ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── API ──────────────────────────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;

export function getMHAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

export function getMHTriviaForConstituency(acNo: number): TriviaItem[] {
  return getMHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo),
  );
}

export function getMHTriviaForParty(party: string): TriviaItem[] {
  return getMHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party),
  );
}

export function getMHTriviaForElection(year: number): TriviaItem[] {
  return getMHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year),
  );
}

export function getMHRandomTrivia(): TriviaItem {
  const all = getMHAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getMHTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getMHAllTrivia().filter((t) => t.category === category);
}
