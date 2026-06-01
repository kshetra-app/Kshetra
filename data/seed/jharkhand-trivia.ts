/**
 * Jharkhand — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { JH_POLITICAL_LEDGER } from './jharkhand-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const JH_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "JH-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Sitting CM Arrest Drama",
      "body": "In January 2024, sitting Chief Minister Hemant Soren resigned minutes before being arrested by the Enforcement Directorate, installing Champai Soren as CM, before returning to office in July.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2024-01-31)",
      "derived": false
    },
    {
      "id": "JH-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Frequent Political Instability",
      "body": "Jharkhand is known for high political volatility. In its first 20 years of statehood, the state saw 6 different Chief Ministers and 3 spells of President's Rule.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (List of Chief Ministers of Jharkhand)",
      "derived": false
    },
    {
      "id": "JH-T-003",
      "emoji": "\u26f0\ufe0f",
      "headline": "Soren Family Tribal Hegemony",
      "body": "Shibu Soren (\"Guruji\"), the pioneer of the Jharkhand statehood movement, and his son Hemant Soren have led the Jharkhand Mukti Morcha (JMM) to dominate tribal seats for decades.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Shibu Soren)",
      "derived": false
    },
    {
      "id": "JH-T-004",
      "emoji": "\ud83c\udf3e",
      "headline": "The Madhu Koda Record",
      "body": "In 2006, independent MLA Madhu Koda became the Chief Minister of Jharkhand by gaining the support of a coalition of parties, a rare feat for an independent in Indian history.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Madhu Koda)",
      "derived": false
    },
    {
      "id": "JH-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Statehood in 2000",
      "body": "Jharkhand was carved out of the southern districts of Bihar on November 15, 2000, under the Bihar Reorganisation Act, with Babulal Marandi as its first CM.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Bihar Reorganisation Act 2000, Wikipedia",
      "derived": false
    },
    {
      "id": "JH-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "The Office of Profit Disqualification",
      "body": "Jharkhand Governor Ramesh Bais sent a major political shockwave in 2022 by keeping the Election Commission's opinion on CM Hemant Soren's disqualification in a \"sealed cover\" for months.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India records 2022",
      "derived": false
    },
    {
      "id": "JH-T-007",
      "emoji": "\u270a",
      "headline": "First Non-Tribal CM Raghubar Das",
      "body": "Raghubar Das (BJP) became the first non-tribal Chief Minister of Jharkhand in 2014, and the first Chief Minister in the state's history to complete a full 5-year term.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Raghubar Das)",
      "derived": false
    },
    {
      "id": "JH-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "JMM Landslide of 2019",
      "body": "The JMM-Congress-RJD alliance swept the 2019 assembly elections, winning 47 out of 81 seats and unseating the incumbent BJP government led by Raghubar Das.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2019",
      "derived": false
    },
    {
      "id": "JH-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Barhait: The Soren Citadel",
      "body": "Barhait assembly constituency (AC 3) is a ST-reserved seat and Hemant Soren's personal bastion, which he won in both the 2014 and 2019 assembly elections.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 3
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "JH-T-010",
      "emoji": "\ud83d\udd6f\ufe0f",
      "headline": "Babulal Marandi's Homecoming",
      "body": "In 2020, Jharkhand's first CM Babulal Marandi merged his breakaway party, Jharkhand Vikas Morcha (Prajatantrik), back into the BJP after 14 years.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2020-02-17)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = JH_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'JH-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Jharkhand, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = JH_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'JH-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Jharkhand has seen ${byElections.length} by-elections in recent terms.`,
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
export function getJHAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...JH_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getJHTriviaForConstituency(acNo: number): TriviaItem[] {
  return getJHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getJHTriviaForParty(party: string): TriviaItem[] {
  return getJHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getJHTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getJHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getJHTriviaForElection(year: number): TriviaItem[] {
  return getJHAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getJHRandomTrivia(): TriviaItem {
  const all = getJHAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getJHRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getJHAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getJHTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getJHAllTrivia().filter((t) => t.category === category);
}
