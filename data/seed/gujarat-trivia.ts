/**
 * Gujarat — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { GJ_POLITICAL_LEDGER } from './gujarat-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const GJ_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "GJ-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Hardik Patel's High-Profile Shift",
      "body": "Patidar reservation agitation leader Hardik Patel switched from the Congress to the BJP in 2022, subsequently winning the Viramgam assembly constituency in the BJP landslide.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "NDTV (2022-06-02)",
      "derived": false
    },
    {
      "id": "GJ-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Modi's 4-Term CM Stint",
      "body": "Narendra Modi served as the Chief Minister of Gujarat for four consecutive terms from 2001 to 2014, representing Rajkot II and later Maninagar constituencies, before becoming Prime Minister.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Narendra Modi)",
      "derived": false
    },
    {
      "id": "GJ-T-003",
      "emoji": "\ud83d\udcc9",
      "headline": "BJP's Unbroken 30-Year Rule",
      "body": "The BJP has held power in Gujarat uninterrupted since 1995, surviving multiple waves and anti-incumbency cycles, making it the party's ultimate ideological bastion.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI election data, Wikipedia",
      "derived": false
    },
    {
      "id": "GJ-T-004",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "156/182: The 2022 Landslide",
      "body": "In 2022, the BJP won a record-breaking 156 out of 182 seats, the highest ever in Gujarat's history, breaking Madhavsinh Solanki's 1985 Congress record of 149 seats.",
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
      "id": "GJ-T-005",
      "emoji": "\u270a",
      "headline": "The KHAM Formula of 1980s",
      "body": "Madhavsinh Solanki devised the famous \"KHAM\" coalition (Kshatriya, Harijan, Adivasi, Muslim) in the 1980s, which gave Congress historically unmatched assembly majorities.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (KHAM)",
      "derived": false
    },
    {
      "id": "GJ-T-006",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "The Chimanbhai Patel Legacy",
      "body": "Chimanbhai Patel served as CM in the 1970s and 1990s. His Navnirman movement in 1974 became India's first student agitation to successfully dissolve an elected assembly.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Navnirman Andolan)",
      "derived": false
    },
    {
      "id": "GJ-T-007",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Maninagar: The CM's Seat",
      "body": "Maninagar assembly constituency in Ahmedabad (AC 51) was Narendra Modi's personal constituency during his CM tenure, winning it in 2002, 2007, and 2012.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 51
        }
      ],
      "source": "ECI Results",
      "derived": false
    },
    {
      "id": "GJ-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "Congress's Near-Upset of 2017",
      "body": "In 2017, backed by Patidar, Dalit, and OBC youth mobilizations, the Congress reduced the BJP to 99 seats\u2014its lowest tally in Gujarat since 1995.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2017",
      "derived": false
    },
    {
      "id": "GJ-T-009",
      "emoji": "\u2696\ufe0f",
      "headline": "Statehood and Mahagujarat Movement",
      "body": "Gujarat was created on May 1, 1960, following the Mahagujarat Movement led by Indulal Yagnik, which demanded bifurcation of the bilingual Bombay State.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Bombay Reorganisation Act 1960",
      "derived": false
    },
    {
      "id": "GJ-T-010",
      "emoji": "\ud83d\udc69",
      "headline": "Anandiben Patel: First Woman CM",
      "body": "In 2014, Anandiben Patel took oath as the first female Chief Minister of Gujarat after Narendra Modi resigned to assume the office of Prime Minister.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Anandiben Patel)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = GJ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'GJ-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Gujarat, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = GJ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'GJ-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Gujarat has seen ${byElections.length} by-elections in recent terms.`,
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
export function getGJAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...GJ_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getGJTriviaForConstituency(acNo: number): TriviaItem[] {
  return getGJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getGJTriviaForParty(party: string): TriviaItem[] {
  return getGJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getGJTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getGJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getGJTriviaForElection(year: number): TriviaItem[] {
  return getGJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getGJRandomTrivia(): TriviaItem {
  const all = getGJAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getGJRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getGJAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getGJTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getGJAllTrivia().filter((t) => t.category === category);
}
