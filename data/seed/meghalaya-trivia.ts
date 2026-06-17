/**
 * Meghalaya — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { ML_POLITICAL_LEDGER } from './meghalaya-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const ML_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "ML-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "12 INC MLAs Merged into TMC",
      "body": "In a dramatic overnight move in November 2021, 12 out of 17 Congress MLAs, led by former CM Mukul Sangma, defected and joined the Trinamool Congress, making TMC the primary opposition party instantly.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2021-11-25)",
      "derived": false
    },
    {
      "id": "ML-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Conrad Sangma's NPP National Status",
      "body": "The National People's Party (NPP) founded by P. A. Sangma and led by Conrad Sangma is the only political party from Northeast India to achieve \"National Party\" status in India.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Election Commission of India Notification 2019",
      "derived": false
    },
    {
      "id": "ML-T-003",
      "emoji": "\ud83c\udf27\ufe0f",
      "headline": "Three Hills Electoral Division",
      "body": "Meghalaya's politics is divided among three major tribal hill councils: the Khasi Hills, Jaintia Hills, and Garo Hills, which hold distinct ethnic and voting blocks.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Meghalaya District Councils, Wikipedia",
      "derived": false
    },
    {
      "id": "ML-T-004",
      "emoji": "\u23f3",
      "headline": "P. A. Sangma's Legacy",
      "body": "P. A. Sangma was one of the most prominent leaders of the Northeast, serving as Chief Minister of Meghalaya, a Union Minister, and the Speaker of the Lok Sabha.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (P. A. Sangma)",
      "derived": false
    },
    {
      "id": "ML-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "Meghalaya's Tight 2018 Coalition",
      "body": "In 2018, Congress was the single largest party with 21 seats. However, NPP (19 seats) swiftly allied with UDP, PDF, HSPDP, and BJP to form the government under Conrad Sangma.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, ECI Results 2018",
      "derived": false
    },
    {
      "id": "ML-T-006",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Sangma Political Dynasty",
      "body": "Following P. A. Sangma's legacy, his son Conrad Sangma is Chief Minister, son James Sangma was a senior cabinet minister, and daughter Agatha Sangma served as an MP.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India",
      "derived": false
    },
    {
      "id": "ML-T-007",
      "emoji": "\u270a",
      "headline": "First Chief Minister Williamson Sangma",
      "body": "Captain Williamson A. Sangma was the founding leader of Meghalaya and served as its first Chief Minister in 1970, leading the hill state movement.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Williamson A. Sangma)",
      "derived": false
    },
    {
      "id": "ML-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "NPP's 2023 Defended Majority",
      "body": "In the 2023 assembly elections, the NPP consolidated its hold by winning 26 out of 59 seats, successfully defending power and forming the government once again.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2023",
      "derived": false
    },
    {
      "id": "ML-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "South Tura: Conrad Sangma's Seat",
      "body": "South Tura assembly constituency (AC 51) in the Garo Hills is Conrad Sangma's personal seat, won in a 2018 by-election and retained in 2023.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 11
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "ML-T-010",
      "emoji": "\u2696\ufe0f",
      "headline": "Matrilineal Political Paradox",
      "body": "Despite Meghalaya having a unique matrilineal society where lineage passes through mothers, women representation in the state assembly remains historically low (under 10%).",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Political Study on Matrilineal Meghalaya, Mainstream media",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = ML_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'ML-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Meghalaya, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = ML_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'ML-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Meghalaya has seen ${byElections.length} by-elections in recent terms.`,
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
export function getMLAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...ML_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getMLTriviaForConstituency(acNo: number): TriviaItem[] {
  return getMLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getMLTriviaForParty(party: string): TriviaItem[] {
  return getMLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getMLTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getMLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getMLTriviaForElection(year: number): TriviaItem[] {
  return getMLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getMLRandomTrivia(): TriviaItem {
  const all = getMLAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getMLRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getMLAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getMLTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getMLAllTrivia().filter((t) => t.category === category);
}
