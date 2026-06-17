/**
 * Nagaland — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { NL_POLITICAL_LEDGER } from './nagaland-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const NL_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "NL-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Opposition-Less Assembly Record",
      "body": "Nagaland created a unique political record in both 2015 and 2021 by forming an \"Opposition-less\" government, where all political parties represented in the assembly joined the ruling coalition.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2015 & 2021 Nagaland governments)",
      "derived": false
    },
    {
      "id": "NL-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Neiphiu Rio's 5-Term Record",
      "body": "Chief Minister Neiphiu Rio has won five terms as Chief Minister of Nagaland, making him the longest-serving Chief Minister in the state's history.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Neiphiu Rio)",
      "derived": false
    },
    {
      "id": "NL-T-003",
      "emoji": "\ud83d\udc69",
      "headline": "First Female MLAs Elected in 2023",
      "body": "In 2023, Hekani Jakhalu (Dimapur III) and Salhoutuonuo Kruse (Western Angami) made history by becoming the first-ever women elected to the 60-member Nagaland Legislative Assembly.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express (2023-03-02)",
      "derived": false
    },
    {
      "id": "NL-T-004",
      "emoji": "\u23f3",
      "headline": "The Naga Peace Talks Legacy",
      "body": "Every election in Nagaland is heavily influenced by the progress of the Naga Peace Talks between the Government of India and various Naga groups like the NSCN-IM.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Ministry of Home Affairs reports, Wikipedia",
      "derived": false
    },
    {
      "id": "NL-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The 16-Point Agreement 1960",
      "body": "Nagaland was created as the 16th state of India in 1963 following the historic 16-Point Agreement signed between the Naga People's Convention and the Government of India.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "16-Point Agreement documents, Wikipedia",
      "derived": false
    },
    {
      "id": "NL-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "NDPP-BJP Alliance Dominance",
      "body": "The Nationalist Democratic Progressive Party (NDPP) and BJP have maintained a highly stable pre-poll alliance since 2018, securing majorities in both 2018 and 2023.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, ECI Results",
      "derived": false
    },
    {
      "id": "NL-T-007",
      "emoji": "\ud83d\udc68",
      "headline": "T. R. Zeliang's Defection Drama",
      "body": "Former CM T. R. Zeliang led multiple internal revolts within the Naga People's Front (NPF) during the 2010s, leading to rapid leadership swaps in the chief minister's office.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times",
      "derived": false
    },
    {
      "id": "NL-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "NPF's Sudden Decline",
      "body": "The Naga People's Front (NPF), which dominated Nagaland politics for nearly 15 years, shrank to just 2 seats in 2023 as NDPP established total control.",
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
      "id": "NL-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Northern Angami II: Rio's Stronghold",
      "body": "Northern Angami II assembly constituency (AC 11) is the personal stronghold of Neiphiu Rio, who has won it in consecutive elections with massive majorities.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 1
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "NL-T-010",
      "emoji": "\u270a",
      "headline": "Eastern Nagaland Frontier Demand",
      "body": "The Eastern Nagaland Peoples' Organisation (ENPO) has been leading a major movement demanding a separate \"Frontier Nagaland\" state, leading to boycotts in several eastern seats.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express, ENPO declarations",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = NL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'NL-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Nagaland, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = NL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'NL-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Nagaland has seen ${byElections.length} by-elections in recent terms.`,
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
export function getNLAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...NL_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getNLTriviaForConstituency(acNo: number): TriviaItem[] {
  return getNLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getNLTriviaForParty(party: string): TriviaItem[] {
  return getNLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getNLTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getNLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getNLTriviaForElection(year: number): TriviaItem[] {
  return getNLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getNLRandomTrivia(): TriviaItem {
  const all = getNLAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getNLRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getNLAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getNLTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getNLAllTrivia().filter((t) => t.category === category);
}
