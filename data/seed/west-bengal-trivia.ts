/**
 * West Bengal — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { WB_POLITICAL_LEDGER } from './west-bengal-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const WB_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "WB-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Mamata Defeating 34-Year CPM Rule",
      "body": "In 2011, Mamata Banerjee led the Trinamool Congress (TMC) to a historic victory, defeating the CPI(M)-led Left Front government and ending its 34-year-long reign, the longest-running democratically elected Communist government in the world.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, Wikipedia (2011 West Bengal Legislative Assembly election)",
      "derived": false
    },
    {
      "id": "WB-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Nandigram Seat Drama 2021",
      "body": "The Nandigram constituency (AC 210) was the centerpiece of the 2021 election. Sitting CM Mamata Banerjee contested directly against her former lieutenant Suvendu Adhikari (BJP), losing the seat by a razor-thin margin of 1,956 votes.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 210
        }
      ],
      "source": "ECI Results 2021, The Hindu",
      "derived": false
    },
    {
      "id": "WB-T-003",
      "emoji": "\ud83d\udc69",
      "headline": "Mamata Banerjee: Bengal's First Woman CM",
      "body": "Mamata Banerjee (\"Didi\") is West Bengal's first female Chief Minister, serving continuously since 2011. She founded the Trinamool Congress in 1998 after splitting from the Congress.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Mamata Banerjee)",
      "derived": false
    },
    {
      "id": "WB-T-004",
      "emoji": "\u23f3",
      "headline": "Jyoti Basu's 23-Year Record",
      "body": "CPI(M) stalwart Jyoti Basu served as the Chief Minister of West Bengal consecutively from 1977 to 2000, holding the record of the longest-serving Chief Minister in India for several decades.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Jyoti Basu)",
      "derived": false
    },
    {
      "id": "WB-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Singur and Nandigram Land Protests",
      "body": "The historic land acquisition protests in Singur and Nandigram in 2006-2008 against the Left government's industrial policies acted as the primary catalyst for TMC's historic rise to power.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Singur/Nandigram agitation records, Wikipedia",
      "derived": false
    },
    {
      "id": "WB-T-006",
      "emoji": "\ud83d\udcca",
      "headline": "TMC's 215-Seat Landslide in 2021",
      "body": "Despite a high-decibel campaign by the BJP, the TMC swept the 2021 assembly elections, winning 215 out of 292 seats and successfully securing a third term with a massive majority.",
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
      "id": "WB-T-007",
      "emoji": "\u270a",
      "headline": "First Chief Minister Prafulla Chandra Ghosh",
      "body": "Dr. Prafulla Chandra Ghosh was the first Chief Minister of West Bengal in 1947, who was a close associate of Mahatma Gandhi and a member of the historic Congress Working Committee.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Prafulla Chandra Ghosh)",
      "derived": false
    },
    {
      "id": "WB-T-008",
      "emoji": "\u2696\ufe0f",
      "headline": "The Post-Poll Violence Legal Probe",
      "body": "The 2021 West Bengal post-poll clashes led to high-profile legal battles, resulting in a landmark Calcutta High Court order directing a CBI probe into allegations of human rights violations.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Calcutta High Court Verdict 2021, LiveLaw",
      "derived": false
    },
    {
      "id": "WB-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Bhabanipur: The CM's Anchor",
      "body": "Bhabanipur assembly constituency in Kolkata (AC 159) is Mamata Banerjee's primary bastion, which she represented in 2011 and 2016, and won back in a 2021 by-election with a margin of over 58,000 votes.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 159
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "WB-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "The North-South Bengal Divide",
      "body": "West Bengal's political map shows a distinct division: South Bengal, including Kolkata and delta districts, has been the stronghold of the TMC, while the BJP has established significant hold in North Bengal and tribal Junglemahal.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "West Bengal electoral analysis, ECI maps",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = WB_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'WB-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In West Bengal, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = WB_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'WB-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `West Bengal has seen ${byElections.length} by-elections in recent terms.`,
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
export function getWBAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...WB_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getWBTriviaForConstituency(acNo: number): TriviaItem[] {
  return getWBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getWBTriviaForParty(party: string): TriviaItem[] {
  return getWBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getWBTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getWBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getWBTriviaForElection(year: number): TriviaItem[] {
  return getWBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getWBRandomTrivia(): TriviaItem {
  const all = getWBAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getWBRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getWBAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getWBTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getWBAllTrivia().filter((t) => t.category === category);
}
