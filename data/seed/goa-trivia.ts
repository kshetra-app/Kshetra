/**
 * Goa — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { GA_POLITICAL_LEDGER } from './goa-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const GA_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "GA-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Double 2/3 Merger Loophole Swaps",
      "body": "Goa saw massive defections where 10 out of 15 Congress MLAs joined the BJP in 2019, followed by another 8 out of 11 Congress MLAs doing the same in 2022, both using the 2/3 merger loophole.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2019 & 2022 Goa defections)",
      "derived": false
    },
    {
      "id": "GA-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Manohar Parrikar's Legacy",
      "body": "Manohar Parrikar was the first IIT graduate to become a Chief Minister in India. He served as Goa's Chief Minister across four terms and also served as India's Defence Minister.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Manohar Parrikar)",
      "derived": false
    },
    {
      "id": "GA-T-003",
      "emoji": "\ud83c\udfdd\ufe0f",
      "headline": "India's Smallest Assembly State",
      "body": "Goa is India's smallest state by area and has just 40 assembly seats, meaning a shift of even 2 or 3 MLAs can instantly topple or form governments.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Constitution of India, Goa Statehood Act 1987",
      "derived": false
    },
    {
      "id": "GA-T-004",
      "emoji": "\u23f3",
      "headline": "Pratapsingh Rane's 50-Year Stint",
      "body": "Congress veteran Pratapsingh Rane represented the Poriem constituency continuously for 50 years and served as Chief Minister for nearly 16 years across terms.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2022)",
      "derived": false
    },
    {
      "id": "GA-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Speaker's Disqualification Battle",
      "body": "Goa has been a primary legal laboratory for anti-defection disputes, with the Supreme Court repeatedly passing orders regarding the Speaker's timeline for deciding petitions.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "LiveLaw (Goa Assembly Speaker cases)",
      "derived": false
    },
    {
      "id": "GA-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "2017 Coalition Surprise",
      "body": "In the 2017 assembly election, Congress won 17 seats and BJP won 13. However, BJP moved swiftly to ally with regional parties GFP and MGP to form the government under Parrikar.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times, ECI Results 2017",
      "derived": false
    },
    {
      "id": "GA-T-007",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "The Rane Dynasty of Goa",
      "body": "While Pratapsingh Rane was a Congress stalwart, his son Vishwajit Rane joined the BJP and became a senior cabinet minister, showcasing bipartisan family dominance in Valpoi.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express",
      "derived": false
    },
    {
      "id": "GA-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "BJP's First Majority in 2012",
      "body": "Under Manohar Parrikar's leadership, the BJP won a historic absolute majority of 21 seats on its own in 2012, tapping into public discontent over mining scandals.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2012",
      "derived": false
    },
    {
      "id": "GA-T-009",
      "emoji": "\ud83c\udfad",
      "headline": "The Bandodkar Legacy",
      "body": "Dayanand Bandodkar was Goa's first Chief Minister post-liberation, leading the Maharashtrawadi Gomantak Party (MGP) from 1963 until his death in 1973.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Dayanand Bandodkar)",
      "derived": false
    },
    {
      "id": "GA-T-010",
      "emoji": "\ud83d\udd6f\ufe0f",
      "headline": "Sushalagad and Regional Identity",
      "body": "In 1967, Goa held a historic opinion poll to decide whether to merge with Maharashtra. The people voted to remain a Union Territory, preserving their unique identity.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (1967 Goa, Daman and Diu status referendum)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = GA_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'GA-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Goa, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = GA_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'GA-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Goa has seen ${byElections.length} by-elections in recent terms.`,
      category: 'ELECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── Combined Trivia (Cached) ────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;
export function getGAAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...GA_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getGATriviaForConstituency(acNo: number): TriviaItem[] {
  return getGAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getGATriviaForParty(party: string): TriviaItem[] {
  return getGAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getGATriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getGAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getGATriviaForElection(year: number): TriviaItem[] {
  return getGAAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getGARandomTrivia(): TriviaItem {
  const all = getGAAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getGARandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getGAAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getGATriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getGAAllTrivia().filter((t) => t.category === category);
}
