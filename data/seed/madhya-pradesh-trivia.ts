/**
 * Madhya Pradesh — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { MP_POLITICAL_LEDGER } from './madhya-pradesh-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const MP_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "MP-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Jyotiraditya Scindia's Rebel Swap",
      "body": "In March 2020, Jyotiraditya Scindia led a rebellion of 22 Congress MLAs, resigning from the assembly to topple Kamal Nath's government and install Shivraj Singh Chouhan as CM.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2020 Madhya Pradesh political crisis)",
      "derived": false
    },
    {
      "id": "MP-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Shivraj's 15-Year Chief Minister Record",
      "body": "Shivraj Singh Chouhan (\"Mamaji\") served as Chief Minister of Madhya Pradesh for over 15 years across four terms (2005-2018, 2020-2023), making him the longest-serving CM of the state.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Shivraj Singh Chouhan)",
      "derived": false
    },
    {
      "id": "MP-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Scindia Royal Dynasty",
      "body": "The royal family of Gwalior has wielded immense power in MP. Vijaya Raje Scindia was a BJP co-founder, her son Madhavrao Scindia was a Congress stalwart, and grandson Jyotiraditya continues the legacy.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Scindia family)",
      "derived": false
    },
    {
      "id": "MP-T-004",
      "emoji": "\ud83d\udcc9",
      "headline": "The 15-Year Deficit and Kamal Nath's Rise",
      "body": "In 2018, the Congress returned to power in MP after 15 years by winning 114 seats, forming a government led by Kamal Nath with the support of BSP, SP, and Independents.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2018, NDTV",
      "derived": false
    },
    {
      "id": "MP-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Vyapam Legal Battle",
      "body": "Madhya Pradesh was rocked by the massive Vyapam admission and recruitment scam, leading to extensive CBI investigations and Supreme Court intervention throughout the 2010s.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India Vyapam rulings, Wikipedia",
      "derived": false
    },
    {
      "id": "MP-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "The 2023 BJP Sweep",
      "body": "Defying anti-incumbency predictions, the BJP swept the 2023 assembly elections by winning 163 out of 230 seats, heavily powered by the \"Ladli Behna\" cash transfer scheme.",
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
      "id": "MP-T-007",
      "emoji": "\u26f0\ufe0f",
      "headline": "Chhindwara: The Kamal Nath Fortress",
      "body": "Chhindwara assembly constituency (AC 126) is the personal bastion of Kamal Nath, which his family has represented in Parliament and Assembly since 1980.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 126
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "MP-T-008",
      "emoji": "\u270a",
      "headline": "Uma Bharti's 2003 Landslide",
      "body": "Sadhvi Uma Bharti led the BJP to a historic 173-seat landslide in 2003, decimating Digvijaya Singh's 10-year Congress government on the plank of \"Bijli, Sadak, Paani.\"",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (2003 Madhya Pradesh Legislative Assembly election)",
      "derived": false
    },
    {
      "id": "MP-T-009",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Mohan Yadav: The New Era CM",
      "body": "In a surprise leadership transition following the 2023 victory, the BJP bypassed veteran Shivraj Singh Chouhan to appoint Mohan Yadav as the new Chief Minister.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2023-12-11)",
      "derived": false
    },
    {
      "id": "MP-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "Bundelkhand Electoral Weight",
      "body": "The drought-prone Bundelkhand region holds 26 seats and acts as a major political barometer, swinging decisively in favor of the BJP in both 2018 and 2023.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Political Analysis, Indian Express",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = MP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'MP-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Madhya Pradesh, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = MP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'MP-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Madhya Pradesh has seen ${byElections.length} by-elections in recent terms.`,
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
export function getMPAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...MP_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getMPTriviaForConstituency(acNo: number): TriviaItem[] {
  return getMPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getMPTriviaForParty(party: string): TriviaItem[] {
  return getMPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getMPTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getMPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getMPTriviaForElection(year: number): TriviaItem[] {
  return getMPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getMPRandomTrivia(): TriviaItem {
  const all = getMPAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getMPRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getMPAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getMPTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getMPAllTrivia().filter((t) => t.category === category);
}
