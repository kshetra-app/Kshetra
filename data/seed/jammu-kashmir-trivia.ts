/**
 * Jammu & Kashmir — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { JK_POLITICAL_LEDGER } from './jammu-kashmir-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const JK_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "JK-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "The 2018 Governor's Dissolution",
      "body": "In November 2018, Jammu and Kashmir Governor Satya Pal Malik dissolved the state assembly dramatically, claiming a \"fax machine glitch\" prevented him from receiving coalition claims.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "NDTV, Wikipedia (2018 Jammu and Kashmir political crisis)",
      "derived": false
    },
    {
      "id": "JK-T-002",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Historic 2024 Election Post-370",
      "body": "The 2024 assembly elections were the first-ever held in Jammu and Kashmir in a decade, and the first since the abrogation of Article 370 and reconstitution as a Union Territory.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Press Release 2024, Jammu and Kashmir Reorganisation Act 2019",
      "derived": false
    },
    {
      "id": "JK-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Abdullah Dynasty",
      "body": "Three generations of the Abdullah family have served as Chief Ministers of Jammu & Kashmir: Sheikh Abdullah, his son Farooq Abdullah, and grandson Omar Abdullah.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Abdullah family)",
      "derived": false
    },
    {
      "id": "JK-T-004",
      "emoji": "\ud83e\udd1d",
      "headline": "Unlikely PDP-BJP Coalition",
      "body": "In 2015, ideological opposites PDP (Mehbooba Mufti) and BJP formed an historic coalition government under Mufti Mohammad Sayeed, which lasted until BJP withdrew support in 2018.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, Wikipedia",
      "derived": false
    },
    {
      "id": "JK-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "Abrogation of Article 370",
      "body": "On August 5, 2019, the President of India issued a constitutional order rendering Article 370 inoperative and splitting J&K into two Union Territories: J&K and Ladakh.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India Article 370 Judgment 2023",
      "derived": false
    },
    {
      "id": "JK-T-006",
      "emoji": "\u23f3",
      "headline": "Omar Abdullah's Record at 38",
      "body": "Omar Abdullah became the youngest Chief Minister of Jammu and Kashmir in 2009 at the age of 38, leading a National Conference-Congress coalition.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Omar Abdullah)",
      "derived": false
    },
    {
      "id": "JK-T-007",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Ganderbal: The Family Seat",
      "body": "Ganderbal constituency (AC 18) is the traditional stronghold of the Abdullah family, won by Sheikh Abdullah in 1977, Farooq Abdullah in 1983, 1987, 1996, and Omar Abdullah in 2008.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 18
        }
      ],
      "source": "ECI J&K Results, Wikipedia",
      "derived": false
    },
    {
      "id": "JK-T-008",
      "emoji": "\ud83d\udc69\u200d\ud83d\udcbc",
      "headline": "Mehbooba Mufti: First Female CM",
      "body": "Mehbooba Mufti took the oath as Jammu and Kashmir's first female Chief Minister in April 2016, following the death of her father Mufti Mohammad Sayeed.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Mehbooba Mufti)",
      "derived": false
    },
    {
      "id": "JK-T-009",
      "emoji": "\ud83d\udcca",
      "headline": "The 2024 JKNC-INC Alliance Triumph",
      "body": "In the 2024 elections, the JKNC-Congress alliance won a clear majority with 48 out of 90 seats, paving the way for Omar Abdullah to return as Chief Minister.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2024",
      "derived": false
    },
    {
      "id": "JK-T-010",
      "emoji": "\u270a",
      "headline": "The Sher-e-Kashmir Legacy",
      "body": "Sheikh Abdullah, known as \"Sher-e-Kashmir\" (Lion of Kashmir), was the founder of the National Conference and played a major role in J&K's accession to India in 1947.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Sheikh Abdullah)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = JK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'JK-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Jammu & Kashmir, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = JK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'JK-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Jammu & Kashmir has seen ${byElections.length} by-elections in recent terms.`,
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
export function getJKAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...JK_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getJKTriviaForConstituency(acNo: number): TriviaItem[] {
  return getJKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getJKTriviaForParty(party: string): TriviaItem[] {
  return getJKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getJKTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getJKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getJKTriviaForElection(year: number): TriviaItem[] {
  return getJKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getJKRandomTrivia(): TriviaItem {
  const all = getJKAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getJKRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getJKAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getJKTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getJKAllTrivia().filter((t) => t.category === category);
}
