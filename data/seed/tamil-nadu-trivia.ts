/**
 * Tamil Nadu — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { TN_POLITICAL_LEDGER } from './tamil-nadu-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const TN_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "TN-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "OPS vs EPS: The AIADMK Post-Jaya Split",
      "body": "Following J. Jayalalithaa's death in 2016, a fierce power struggle split the AIADMK between O. Panneerselvam (OPS) and Edappadi K. Palaniswami (EPS), leading to dramatic resort politics at Koovathur.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2017 AIADMK power struggle)",
      "derived": false
    },
    {
      "id": "TN-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "DMK-AIADMK Alternation Custom (1984-2016)",
      "body": "For over 30 years, Tamil Nadu never re-elected an incumbent government, alternating strictly between DMK and AIADMK until J. Jayalalithaa broke the jinx in 2016.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Historical Data, Wikipedia",
      "derived": false
    },
    {
      "id": "TN-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Karunanidhi Dynasty",
      "body": "M. Karunanidhi served as CM five times and led the DMK for 50 years. His son M. K. Stalin became CM in 2021, and grandson Udhayanidhi Stalin became a Cabinet Minister.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Karunanidhi family)",
      "derived": false
    },
    {
      "id": "TN-T-004",
      "emoji": "\u23f3",
      "headline": "MGR: The Cinema-to-CM Pioneer",
      "body": "M. G. Ramachandran (MGR) was a legendary Tamil actor who founded the AIADMK in 1972 and served as Chief Minister for three consecutive terms until his death in 1987.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (M. G. Ramachandran)",
      "derived": false
    },
    {
      "id": "TN-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Jayalalithaa DA Conviction",
      "body": "J. Jayalalithaa became the first sitting Chief Minister in India to be disqualified under the Representation of the People Act in 2014 following her conviction in a Disproportionate Assets case.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India Jayalalithaa DA Case judgment 2017",
      "derived": false
    },
    {
      "id": "TN-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "The Historic 2021 DMK Return",
      "body": "In 2021, the DMK-led Secular Progressive Alliance won a comfortable majority of 159 out of 234 seats, returning the DMK to power after 10 years of AIADMK rule.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2021",
      "derived": false
    },
    {
      "id": "TN-T-007",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Kolathur: Stalin's Stronghold",
      "body": "Kolathur assembly constituency in Chennai (AC 13) is the personal seat of Chief Minister M. K. Stalin, which he won in three consecutive elections (2011, 2016, 2021).",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 13
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "TN-T-008",
      "emoji": "\u270a",
      "headline": "The Anti-Hindi Agitation of 1965",
      "body": "The massive anti-Hindi agitations in 1965 led by the DMK mobilized students and ended Congress rule in Tamil Nadu permanently in 1967, ushering in the Dravidian era.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Anti-Hindi agitations of Tamil Nadu)",
      "derived": false
    },
    {
      "id": "TN-T-009",
      "emoji": "\ud83d\udcca",
      "headline": "AIADMK's 2016 Jinx Breaker",
      "body": "In 2016, J. Jayalalithaa won 134 out of 234 seats, becoming the first Chief Minister of Tamil Nadu since MGR in 1984 to be re-elected for a consecutive term.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2016",
      "derived": false
    },
    {
      "id": "TN-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "The Cauvery Delta Political Weight",
      "body": "The fertile Cauvery Delta region, comprising districts like Thanjavur and Tiruvarur, holds 30+ assembly seats and acts as the agrarian political heartland of the state.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Tamil Nadu agricultural politics analysis",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = TN_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'TN-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Tamil Nadu, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = TN_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'TN-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Tamil Nadu has seen ${byElections.length} by-elections in recent terms.`,
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
export function getTNAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...TN_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getTNTriviaForConstituency(acNo: number): TriviaItem[] {
  return getTNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getTNTriviaForParty(party: string): TriviaItem[] {
  return getTNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getTNTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getTNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getTNTriviaForElection(year: number): TriviaItem[] {
  return getTNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getTNRandomTrivia(): TriviaItem {
  const all = getTNAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getTNRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getTNAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getTNTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getTNAllTrivia().filter((t) => t.category === category);
}
