/**
 * Himachal Pradesh — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { HP_POLITICAL_LEDGER } from './himachal-pradesh-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const HP_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "HP-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Rajya Sabha Defection Standoff",
      "body": "In early 2024, 6 Congress MLAs cross-voted for the BJP candidate in the Rajya Sabha election, triggering a major constitutional crisis and their eventual disqualification.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2024 Himachal Pradesh political crisis)",
      "derived": false
    },
    {
      "id": "HP-T-002",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "World's Highest Polling Station",
      "body": "Tashigang, a small village in Lahaul and Spiti district of Himachal Pradesh, sits at an altitude of 15,256 feet, making it the highest polling station in the world.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Election Commission of India (ECI)",
      "derived": false
    },
    {
      "id": "HP-T-003",
      "emoji": "\ud83d\udd01",
      "headline": "The Alternating Custom",
      "body": "Since 1985, Himachal Pradesh has never re-elected an incumbent government, alternating consistently between the BJP and the Indian National Congress every 5 years.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Historical Results",
      "derived": false
    },
    {
      "id": "HP-T-004",
      "emoji": "\ud83d\udc51",
      "headline": "Virbhadra Singh: The King of Hills",
      "body": "Virbhadra Singh, affectionately called \"Raja Sahib\", served as the Chief Minister of Himachal Pradesh six times, dominating Congress politics for over 4 decades.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Virbhadra Singh)",
      "derived": false
    },
    {
      "id": "HP-T-005",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Dhumal-Thakur Dynasty",
      "body": "Former BJP CM Prem Kumar Dhumal's son Anurag Thakur became a prominent Union Cabinet Minister, showcasing the transition of political power across generations.",
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
      "id": "HP-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "The Governor vs CM Jurisdiction",
      "body": "Himachal Pradesh has seen repeated debates on state assembly regulations and the Governor's powers in approving bills, particularly during tight-margin assemblies.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Himachal Pradesh High Court reports",
      "derived": false
    },
    {
      "id": "HP-T-007",
      "emoji": "\u270a",
      "headline": "The Apple Lobby Influence",
      "body": "The powerful apple-growers' lobby in districts like Shimla and Kullu holds immense political sway, deciding the fate of at least 15 assembly constituencies.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Economic Times agricultural politics report",
      "derived": false
    },
    {
      "id": "HP-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "Tight Margin of 2022",
      "body": "In 2022, Congress won power with 40 seats against BJP's 25. However, the difference in total votes polled between Congress and BJP was less than 38,000 votes statewide (0.9%).",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2022",
      "derived": false
    },
    {
      "id": "HP-T-009",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Statehood Achieved in 1971",
      "body": "Himachal Pradesh became the 18th state of the Indian Union on January 25, 1971, under the leadership of Yashwant Singh Parmar, the state's first Chief Minister.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "State of Himachal Pradesh Act 1970",
      "derived": false
    },
    {
      "id": "HP-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "OPS: The Decisive 2022 Issue",
      "body": "The Old Pension Scheme (OPS) promise by the Congress was widely cited by analysts as the single most critical factor in driving government employees to vote BJP out in 2022.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu election analysis 2022",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = HP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'HP-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Himachal Pradesh, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = HP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'HP-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Himachal Pradesh has seen ${byElections.length} by-elections in recent terms.`,
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
export function getHPAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...HP_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getHPTriviaForConstituency(acNo: number): TriviaItem[] {
  return getHPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getHPTriviaForParty(party: string): TriviaItem[] {
  return getHPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getHPTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getHPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getHPTriviaForElection(year: number): TriviaItem[] {
  return getHPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getHPRandomTrivia(): TriviaItem {
  const all = getHPAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getHPRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getHPAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getHPTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getHPAllTrivia().filter((t) => t.category === category);
}
