/**
 * Bihar — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { BR_POLITICAL_LEDGER } from './bihar-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const BR_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "BR-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Nitish Kumar's 9-Oath Record",
      "body": "JD(U) Chief Nitish Kumar has taken the oath as Chief Minister of Bihar a record 9 times since 2000, repeatedly switching alliances between RJD-Congress and the BJP.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "MLA",
          "name": "Narendra Narayan Yadav"
        },
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express (2024-01-28)",
      "derived": false
    },
    {
      "id": "BR-T-002",
      "emoji": "\ud83d\udc51",
      "headline": "Tejashwi Yadav: Youngest Deputy CM",
      "body": "In 2015, Tejashwi Yadav became the youngest Deputy Chief Minister of Bihar at the age of just 26, representing the Raghopur constituency.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times, Wikipedia",
      "derived": false
    },
    {
      "id": "BR-T-003",
      "emoji": "\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d\udc68",
      "headline": "The Husband-Wife CM Dynasty",
      "body": "Lalu Prasad Yadav and Rabri Devi together governed Bihar from 1990 to 2005. Rabri Devi became Bihar's first female CM in 1997 when Lalu Prasad resigned due to the Fodder Scam.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Rabri Devi)",
      "derived": false
    },
    {
      "id": "BR-T-004",
      "emoji": "\u23f3",
      "headline": "Longest Serving Chief Minister",
      "body": "Nitish Kumar surpassed Bihar's first CM, Sri Krishna Sinha, in 2023 as the longest-serving Chief Minister of Bihar, clocking over 17 years in office.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India",
      "derived": false
    },
    {
      "id": "BR-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Mokama: The Strongman's Domain",
      "body": "Mokama constituency (AC 140) has been dominated for decades by strongman politician Anant Kumar Singh, who won the seat in 2005, 2010, 2015, and 2020 across multiple party banners.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 140
        }
      ],
      "source": "ECI Bihar Assembly Election Results",
      "derived": false
    },
    {
      "id": "BR-T-006",
      "emoji": "\u270a",
      "headline": "The JP Movement of 1974",
      "body": "Bihar was the epicenter of the historic JP Movement led by Jayaprakash Narayan in 1974, which mobilized students and ultimately led to the fall of the Indira Gandhi government.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Bihar Movement)",
      "derived": false
    },
    {
      "id": "BR-T-007",
      "emoji": "\ud83d\udcca",
      "headline": "The Historic Caste Survey of 2023",
      "body": "Bihar became the first state in India to conduct and publish a comprehensive Caste Survey in 2023, revealing that Extremely Backward Classes (EBCs) and OBCs make up over 63% of the population.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Bihar Gazette, Caste Survey Report 2023",
      "derived": false
    },
    {
      "id": "BR-T-008",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "First Non-Congress Government",
      "body": "In 1967, Mahamaya Prasad Sinha formed the first non-Congress coalition government in Bihar under the banner of Jan Kranti Dal, ending the absolute monopoly of the INC.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Bihar Legislative Assembly History",
      "derived": false
    },
    {
      "id": "BR-T-009",
      "emoji": "\ud83d\udcc8",
      "headline": "2020 Election Cliffhanger",
      "body": "The 2020 Bihar Assembly election was a photo finish: the NDA alliance won 125 seats, just 3 seats above the majority mark of 122, defeating the RJD-led Mahagathbandhan.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2020",
      "derived": false
    },
    {
      "id": "BR-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "Jitan Ram Manjhi's Brief Stint",
      "body": "Jitan Ram Manjhi served as Chief Minister for 278 days in 2014-15 after Nitish Kumar resigned taking moral responsibility for JD(U)'s poor Lok Sabha showing.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia, Hindustan Times",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = BR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'BR-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Bihar, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = BR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'BR-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Bihar has seen ${byElections.length} by-elections in recent terms.`,
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
export function getBRAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...BR_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getBRTriviaForConstituency(acNo: number): TriviaItem[] {
  return getBRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getBRTriviaForParty(party: string): TriviaItem[] {
  return getBRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getBRTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getBRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getBRTriviaForElection(year: number): TriviaItem[] {
  return getBRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getBRRandomTrivia(): TriviaItem {
  const all = getBRAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getBRRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getBRAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getBRTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getBRAllTrivia().filter((t) => t.category === category);
}
