/**
 * Uttar Pradesh — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { UP_POLITICAL_LEDGER } from './uttar-pradesh-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const UP_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "UP-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Yogi Adityanath's Consecutive Term Record",
      "body": "In 2022, Yogi Adityanath became the first Chief Minister of Uttar Pradesh in 37 years to complete a full 5-year term and be re-elected to a second consecutive term.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2022-03-10)",
      "derived": false
    },
    {
      "id": "UP-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Akhilesh Yadav: Youngest CM at 38",
      "body": "In 2012, Akhilesh Yadav (Samajwadi Party) made history by becoming the youngest Chief Minister of Uttar Pradesh at the age of just 38, representing the Karhal seat later in 2022.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Akhilesh Yadav)",
      "derived": false
    },
    {
      "id": "UP-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Yadav Dynasty of Saifai",
      "body": "Founded by Mulayam Singh Yadav, the Saifai family has sent a record number of members to the Parliament and Assembly, including Akhilesh Yadav, Dimple Yadav, and Shivpal Yadav.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Mulayam Singh Yadav family)",
      "derived": false
    },
    {
      "id": "UP-T-004",
      "emoji": "\u23f3",
      "headline": "Mayawati's 4-Term Dalit Mobilization",
      "body": "BSP chief Mayawati served as Chief Minister of UP four times, creating history in 2007 by forming the first full-majority government in 15 years on a unique Dalit-Brahmin social engineering formula.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Mayawati)",
      "derived": false
    },
    {
      "id": "UP-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Karhal: The SP Stronghold",
      "body": "Karhal assembly constituency (AC 110) in Mainpuri district is a historic stronghold of the Samajwadi Party, won by Akhilesh Yadav in 2022 with a margin of over 67,000 votes.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 110
        }
      ],
      "source": "ECI Results 2022",
      "derived": false
    },
    {
      "id": "UP-T-006",
      "emoji": "\u270a",
      "headline": "The Ram Janmabhoomi Movement",
      "body": "UP was the epicenter of the historic Ram Janmabhoomi movement in Ayodhya, which culminated in the dismissal of Kalyan Singh's BJP government in December 1992 following the Babri Masjid demolition.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court Ayodhya Verdict 2019, Wikipedia",
      "derived": false
    },
    {
      "id": "UP-T-007",
      "emoji": "\u2696\ufe0f",
      "headline": "The Noida Jinx Broken",
      "body": "For decades, a famous political superstition claimed that any UP Chief Minister who visited Noida would lose their next election. Yogi Adityanath broke the \"Noida Jinx\" by visiting Noida repeatedly and winning the 2022 sweep.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times (2022-03-11)",
      "derived": false
    },
    {
      "id": "UP-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "The 403-Seat Mega Assembly",
      "body": "Uttar Pradesh has the largest Legislative Assembly in India with 403 seats, making it the ultimate laboratory for caste coalitions and national power play.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Constitution of India, UP Legislative Assembly history",
      "derived": false
    },
    {
      "id": "UP-T-009",
      "emoji": "\ud83d\udcc8",
      "headline": "BJP's 2017 Landslide Sweep",
      "body": "In the 2017 assembly elections, the BJP and its allies won a historic landslide of 325 out of 403 seats, the biggest mandate in UP since 1980.",
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
      "id": "UP-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "The Western UP Sugar Belt Weight",
      "body": "The sugarcane-rich Western UP belt, dominated by Jat and farmer communities, holds over 100 seats and acts as the decisive swing zone in UP assembly contests.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "UP agricultural politics analysis",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = UP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'UP-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Uttar Pradesh, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = UP_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'UP-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Uttar Pradesh has seen ${byElections.length} by-elections in recent terms.`,
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
export function getUPAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...UP_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getUPTriviaForConstituency(acNo: number): TriviaItem[] {
  return getUPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getUPTriviaForParty(party: string): TriviaItem[] {
  return getUPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getUPTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getUPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getUPTriviaForElection(year: number): TriviaItem[] {
  return getUPAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getUPRandomTrivia(): TriviaItem {
  const all = getUPAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getUPRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getUPAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getUPTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getUPAllTrivia().filter((t) => t.category === category);
}
