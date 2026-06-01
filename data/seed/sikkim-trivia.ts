/**
 * Sikkim — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { SK_POLITICAL_LEDGER } from './sikkim-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const SK_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "SK-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "The 2019 SDF Mass Defection",
      "body": "Following their 2019 election defeat, 10 out of 15 Sikkim Democratic Front (SDF) MLAs defected en masse to join the BJP, leaving former CM Chamling virtually isolated.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2019 Sikkim SDF defections)",
      "derived": false
    },
    {
      "id": "SK-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Chamling: India's Longest Serving CM",
      "body": "SDF founder Pawan Kumar Chamling served as Chief Minister of Sikkim for 24 years and 165 days consecutively (1994-2019), the longest tenure in Indian history.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Guinness World Records, Wikipedia (Pawan Kumar Chamling)",
      "derived": false
    },
    {
      "id": "SK-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "The Sangha Seat: No Territory",
      "body": "Sikkim has a unique assembly constituency called the Sangha seat, which has no geographical boundaries. Only registered Buddhist monks and nuns across Sikkim can vote for it.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Sikkim Legislative Assembly records, ECI",
      "derived": false
    },
    {
      "id": "SK-T-004",
      "emoji": "\u23f3",
      "headline": "SKM's 2024 Near-Total Sweep",
      "body": "In the 2024 assembly elections, Prem Singh Tamang's Sikkim Krantikari Morcha (SKM) won a historic landslide by securing 31 out of 32 assembly seats.",
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
      "id": "SK-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Chogyal Monarchy Merger 1975",
      "body": "Sikkim officially merged with the Indian Union in 1975 after a historic referendum where 97.5% of the population voted to abolish the Chogyal monarchy and join India.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "36th Constitutional Amendment 1975, Wikipedia",
      "derived": false
    },
    {
      "id": "SK-T-006",
      "emoji": "\u270a",
      "headline": "First Chief Minister Kazi Lhendup Dorjee",
      "body": "Kazi Lhendup Dorjee was the founding father of democratic Sikkim and served as its first Chief Minister from 1974 to 1979, driving the Indian integration process.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Kazi Lhendup Dorjee)",
      "derived": false
    },
    {
      "id": "SK-T-007",
      "emoji": "\ud83d\udcca",
      "headline": "Prem Singh Tamang's Disqualification Dispute",
      "body": "In 2019, SKM leader Prem Singh Tamang became CM despite being legally disqualified from contesting due to a past corruption conviction, later receiving an ECI waiver.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Election Commission of India order 2019, LiveLaw",
      "derived": false
    },
    {
      "id": "SK-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "SKM's Rise from Rebellion",
      "body": "Sikkim Krantikari Morcha (SKM) was formed in 2013 by Prem Singh Tamang after breaking away from Pawan Chamling's SDF, culminating in their historic 2019 victory.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Sikkim Krantikari Morcha)",
      "derived": false
    },
    {
      "id": "SK-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Namchi-Singhithang: The Chamling Seat",
      "body": "Namchi-Singhithang assembly constituency (AC 11) was the personal fortress of Pawan Kumar Chamling, which he represented continuously for several terms.",
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
      "id": "SK-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "100% Organic State Policy",
      "body": "Sikkim is the first state in India to officially become 100% organic, a policy pioneered by the Chamling administration and continued by the SKM government.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "UN Future Policy Gold Award 2018, Wikipedia",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = SK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'SK-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Sikkim, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = SK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'SK-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Sikkim has seen ${byElections.length} by-elections in recent terms.`,
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
export function getSKAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...SK_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getSKTriviaForConstituency(acNo: number): TriviaItem[] {
  return getSKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getSKTriviaForParty(party: string): TriviaItem[] {
  return getSKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getSKTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getSKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getSKTriviaForElection(year: number): TriviaItem[] {
  return getSKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getSKRandomTrivia(): TriviaItem {
  const all = getSKAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getSKRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getSKAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getSKTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getSKAllTrivia().filter((t) => t.category === category);
}
