/**
 * Tripura — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { TR_POLITICAL_LEDGER } from './tripura-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const TR_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "TR-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "25-Year Communist Era Ends",
      "body": "In 2018, the BJP made historic inroads in Northeast India by defeating the CPI(M)'s 25-year-old unbroken rule in Tripura, winning 36 out of 60 seats with IPFT.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2018-03-03)",
      "derived": false
    },
    {
      "id": "TR-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Manik Sarkar's Clean Record",
      "body": "CPI(M) leader Manik Sarkar served as Chief Minister for 20 consecutive years (1998-2018), famously known as India's \"poorest Chief Minister\" who donated his entire salary to his party.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Manik Sarkar)",
      "derived": false
    },
    {
      "id": "TR-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Tipra Motha's Tribal Surge",
      "body": "In 2023, the newly formed Tipra Motha party, led by royal scion Pradyot Debbarma, swept 13 out of 20 tribal-reserved seats on the demand for \"Greater Tipraland.\"",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express (2023-03-02)",
      "derived": false
    },
    {
      "id": "TR-T-004",
      "emoji": "\u23f3",
      "headline": "Biplab Deb to Manik Saha Swap",
      "body": "In May 2022, just months before the assembly elections, the BJP replaced Chief Minister Biplab Kumar Deb with Manik Saha to beat local anti-incumbency.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2022-05-14)",
      "derived": false
    },
    {
      "id": "TR-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Royal Family Cession 1949",
      "body": "Tripura was an independent princely state before merging with the Indian Union in October 1949, following the Cession Merger Agreement signed by Queen Regent Kanchan Prabha Devi.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Tripura Merger Agreement 1949, Wikipedia",
      "derived": false
    },
    {
      "id": "TR-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "BJP's 2023 Defended Tally",
      "body": "In the 2023 elections, the BJP successfully defended power by winning 32 seats on its own, with Manik Saha returning as the Chief Minister.",
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
      "id": "TR-T-007",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "The Debbarma Royal Dynasty",
      "body": "The royal Debbarma family of Tripura continues to hold immense sway in the state's tribal politics, bridging the historic monarchy with modern democratic movements.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Tripura Royal Family)",
      "derived": false
    },
    {
      "id": "TR-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "Congress to BJP Mass MLA Migration 2016-17",
      "body": "Tripura saw a complete migration of the opposition block when 6 Trinamool Congress MLAs (originally defected from Congress) joined the BJP en masse in 2017, building the BJP's foundation.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times (2017-08-07)",
      "derived": false
    },
    {
      "id": "TR-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Town Bordowali: The Saha Stronghold",
      "body": "Town Bordowali (AC 8) in Agartala is Chief Minister Manik Saha's personal seat, won in a 2022 by-election and successfully retained in the 2023 general election.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 30
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "TR-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "The Tribal Autonomous District Council",
      "body": "The Tripura Tribal Areas Autonomous District Council (TTAADC) governs two-thirds of the state's area, making its local council elections a major state political battle.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Constitution of India, Sixth Schedule",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = TR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'TR-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Tripura, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = TR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'TR-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Tripura has seen ${byElections.length} by-elections in recent terms.`,
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
export function getTRAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...TR_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getTRTriviaForConstituency(acNo: number): TriviaItem[] {
  return getTRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getTRTriviaForParty(party: string): TriviaItem[] {
  return getTRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getTRTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getTRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getTRTriviaForElection(year: number): TriviaItem[] {
  return getTRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getTRRandomTrivia(): TriviaItem {
  const all = getTRAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getTRRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getTRAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getTRTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getTRAllTrivia().filter((t) => t.category === category);
}
