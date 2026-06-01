/**
 * Punjab — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { PB_POLITICAL_LEDGER } from './punjab-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const PB_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "PB-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "AAP's Historic 92-Seat Sweep",
      "body": "In 2022, the Aam Aadmi Party (AAP) achieved a massive sweep in Punjab by winning 92 out of 117 seats, defeating heavyweights like Charanjit Channi, Navjot Sidhu, and Parkash Badal.",
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
      "id": "PB-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Bhagwant Mann: Comedian to CM",
      "body": "Chief Minister Bhagwant Mann is a former highly popular professional comedian and satirist, who was elected as an MP twice before leading AAP's charge in Punjab.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Bhagwant Mann)",
      "derived": false
    },
    {
      "id": "PB-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Badal Dynasty",
      "body": "Parkash Singh Badal served as Chief Minister of Punjab five times, dominating Akali Dal politics for decades. His son Sukhbir Badal and daughter-in-law Harsimrat Kaur also held high offices.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Parkash Singh Badal)",
      "derived": false
    },
    {
      "id": "PB-T-004",
      "emoji": "\u23f3",
      "headline": "Captain Amarinder's Breakaway",
      "body": "In late 2021, following a bitter internal feud with Navjot Singh Sidhu, veteran Congress leader Captain Amarinder Singh resigned as Chief Minister and floated his own party, Punjab Lok Congress.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "NDTV (2021-11-02)",
      "derived": false
    },
    {
      "id": "PB-T-005",
      "emoji": "\ud83c\udf3e",
      "headline": "The Farm Laws Backlash",
      "body": "The massive farmers' protests of 2020-21 against three central farm laws led to the Akali Dal breaking its historic 24-year alliance with the BJP, fundamentally shifting the state's alliance math.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Samyukt Kisan Morcha records, Wikipedia",
      "derived": false
    },
    {
      "id": "PB-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "Lambi: The Battle of Titans",
      "body": "Lambi assembly constituency (AC 83) is the traditional seat of Parkash Singh Badal, which saw a \"battle of titans\" in 2017 when Captain Amarinder Singh contested directly against him.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 83
        }
      ],
      "source": "ECI Results 2017",
      "derived": false
    },
    {
      "id": "PB-T-007",
      "emoji": "\u270a",
      "headline": "First Dalit Chief Minister",
      "body": "In September 2021, Charanjit Singh Channi took oath as the first Dalit Chief Minister of Punjab, representing the Chamkaur Sahib constituency.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Charanjit Singh Channi)",
      "derived": false
    },
    {
      "id": "PB-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "SAD's Historical Decline",
      "body": "The Shiromani Akali Dal (SAD), one of India's oldest regional parties, was reduced to its lowest-ever tally of just 3 seats in the 2022 assembly elections.",
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
      "id": "PB-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Gidderbaha: The Manpreet Badal Seat",
      "body": "Gidderbaha (AC 84) was the launchpad of Manpreet Singh Badal, who won it four times for SAD before breaking away to form People's Party of Punjab and later joining Congress.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 84
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "PB-T-010",
      "emoji": "\u2696\ufe0f",
      "headline": "The President's Rule Record",
      "body": "Due to the turbulent decade of militancy in the 1980s, Punjab was placed under President's Rule for a continuous period of nearly 5 years from 1987 to 1992.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Constitution of India Article 356 records, Wikipedia",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = PB_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'PB-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Punjab, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = PB_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'PB-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Punjab has seen ${byElections.length} by-elections in recent terms.`,
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
export function getPBAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...PB_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getPBTriviaForConstituency(acNo: number): TriviaItem[] {
  return getPBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getPBTriviaForParty(party: string): TriviaItem[] {
  return getPBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getPBTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getPBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getPBTriviaForElection(year: number): TriviaItem[] {
  return getPBAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getPBRandomTrivia(): TriviaItem {
  const all = getPBAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getPBRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getPBAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getPBTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getPBAllTrivia().filter((t) => t.category === category);
}
