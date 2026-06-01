/**
 * Manipur — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { MN_POLITICAL_LEDGER } from './manipur-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const MN_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "MN-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "10-MLA INC Defection Block",
      "body": "In 2017, despite Congress winning 28 seats to BJP's 21, the BJP formed the government after 10 Congress MLAs defected to BJP over a span of months under N. Biren Singh.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2017 Manipur government formation)",
      "derived": false
    },
    {
      "id": "MN-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "N. Biren Singh: Footballer to CM",
      "body": "Chief Minister N. Biren Singh is a former professional footballer who played for the Border Security Force team and worked as a journalist before entering politics.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (N. Biren Singh)",
      "derived": false
    },
    {
      "id": "MN-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Valley vs Hills Divide",
      "body": "Manipur's electoral geography is deeply divided between the Meitei-dominated Imphal Valley (40 seats) and the surrounding Naga- and Kuki-dominated Hill districts (20 seats).",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Manipur Delimitation Records, Wikipedia",
      "derived": false
    },
    {
      "id": "MN-T-004",
      "emoji": "\u23f3",
      "headline": "Okram Ibobi Singh's 15-Year Reign",
      "body": "Congress stalwart Okram Ibobi Singh served as Chief Minister of Manipur for three full consecutive terms from 2002 to 2017, bringing rare stability to the state.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Okram Ibobi Singh)",
      "derived": false
    },
    {
      "id": "MN-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "Speaker's Disqualification Mandamus",
      "body": "In 2020, the Supreme Court passed a landmark order directing the Manipur Speaker to decide a defection petition within 4 weeks, reinforcing judicial timelines for the anti-defection law.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India (Keisham Meghachandra Singh v. Hon'ble Speaker)",
      "derived": false
    },
    {
      "id": "MN-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "BJP's First Clear Majority 2022",
      "body": "In the 2022 assembly elections, the BJP broke away from coalition dependence to win a clear majority of 32 out of 60 seats on its own in Manipur.",
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
      "id": "MN-T-007",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Political Families of Manipur",
      "body": "The family of former CM Okram Ibobi Singh remains active, with his son Okram Surjakumar winning the Khangabok seat in the 2017 and 2022 assembly elections.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times",
      "derived": false
    },
    {
      "id": "MN-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "Irom Sharmila's Electoral Bid",
      "body": "After a historic 16-year hunger strike against AFSPA, civil rights activist Irom Sharmila contested the 2017 assembly election against Ibobi Singh but received only 90 votes.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Irom Chanu Sharmila)",
      "derived": false
    },
    {
      "id": "MN-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Heingang: The CM's Domain",
      "body": "Heingang assembly constituency (AC 2) has been represented by N. Biren Singh since 2002, winning it across multiple party lines (Democratic Revolutionary Peoples Party, INC, and BJP).",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 2
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "MN-T-010",
      "emoji": "\u270a",
      "headline": "Ethnic Conflict Impact",
      "body": "Manipur's electoral geography and constituency boundaries became central points of discussion during the severe ethnic conflicts that erupted in 2023.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Mainstream Media reports 2023",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = MN_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'MN-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Manipur, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = MN_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'MN-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Manipur has seen ${byElections.length} by-elections in recent terms.`,
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
export function getMNAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...MN_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getMNTriviaForConstituency(acNo: number): TriviaItem[] {
  return getMNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getMNTriviaForParty(party: string): TriviaItem[] {
  return getMNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getMNTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getMNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getMNTriviaForElection(year: number): TriviaItem[] {
  return getMNAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getMNRandomTrivia(): TriviaItem {
  const all = getMNAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getMNRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getMNAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getMNTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getMNAllTrivia().filter((t) => t.category === category);
}
