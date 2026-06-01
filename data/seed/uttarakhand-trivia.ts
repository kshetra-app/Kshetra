/**
 * Uttarakhand — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { UK_POLITICAL_LEDGER } from './uttarakhand-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const UK_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "UK-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "The 2016 President's Rule Crisis",
      "body": "In 2016, Uttarakhand saw a major political crisis when 9 Congress MLAs defected to the BJP, leading to a brief spell of President's Rule until Harish Rawat proved his majority in a Supreme Court-monitored vote.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, Wikipedia (2016 Uttarakhand political crisis)",
      "derived": false
    },
    {
      "id": "UK-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Dhami surviving anti-incumbency",
      "body": "In 2022, Pushkar Singh Saini Dhami led the BJP to break Uttarakhand's \"revolving door\" jinx by winning a second consecutive term, though Dhami personally lost his Khatima seat and had to win a by-election from Champawat.",
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
      "id": "UK-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "11 Chief Ministers in 22 Years",
      "body": "Uttarakhand is notorious for political leadership instability, having seen 11 Chief Ministers in just 22 years of statehood, with BJP's Trivendra Rawat and Tirath Rawat swapped in quick succession in 2021.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (List of Chief Ministers of Uttarakhand)",
      "derived": false
    },
    {
      "id": "UK-T-004",
      "emoji": "\u23f3",
      "headline": "Statehood Achieved in 2000",
      "body": "Uttarakhand was created as the 27th state of India on November 9, 2000, carved out of the hilly districts of Uttar Pradesh under the Uttar Pradesh Reorganisation Act.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Uttar Pradesh Reorganisation Act 2000, Wikipedia",
      "derived": false
    },
    {
      "id": "UK-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Uniform Civil Code Landmark",
      "body": "In early 2024, Uttarakhand became the first state in post-independence India to pass a Uniform Civil Code (UCC) Bill, regulating marriage, divorce, and live-in relationships across communities.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Uttarakhand UCC Bill Gazette 2024, Wikipedia",
      "derived": false
    },
    {
      "id": "UK-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "BJP's 2017 Landslide of 57/70",
      "body": "In 2017, riding on a massive Modi wave, the BJP won a record-shattering 57 out of 70 seats in the Uttarakhand Legislative Assembly, reducing Congress to just 11.",
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
      "id": "UK-T-007",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "The Bahuguna Political Legacy",
      "body": "Vijay Bahuguna served as Congress Chief Minister from 2012 to 2014. Following the 2016 crisis, he joined the BJP, continuing the prominent family legacy of former UP CM Hemvati Nandan Bahuguna.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Vijay Bahuguna)",
      "derived": false
    },
    {
      "id": "UK-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "The Garhwal vs Kumaon Balance",
      "body": "Uttarakhand's politics is carefully balanced between the two primary geographical regions: Garhwal and Kumaon, with Chief Ministers and party chiefs typically selected from alternating regions.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Uttarakhand regional politics study, Mainstream media",
      "derived": false
    },
    {
      "id": "UK-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Lalkuan: The Giant-Killer Seat",
      "body": "Lalkuan assembly constituency (AC 56) in Nainital district became the center of attention in 2022 when BJP's Mohan Chandra Bisht defeated veteran Congress former CM Harish Rawat.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 56
        }
      ],
      "source": "ECI Results 2022",
      "derived": false
    },
    {
      "id": "UK-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "First Chief Minister Nityanand Swami",
      "body": "Nityanand Swami served as the first Chief Minister of the newly formed state of Uttaranchal (later renamed Uttarakhand) in 2000, representing the BJP.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Nityanand Swami)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = UK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'UK-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Uttarakhand, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = UK_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'UK-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Uttarakhand has seen ${byElections.length} by-elections in recent terms.`,
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
export function getUKAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...UK_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getUKTriviaForConstituency(acNo: number): TriviaItem[] {
  return getUKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getUKTriviaForParty(party: string): TriviaItem[] {
  return getUKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getUKTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getUKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getUKTriviaForElection(year: number): TriviaItem[] {
  return getUKAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getUKRandomTrivia(): TriviaItem {
  const all = getUKAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getUKRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getUKAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getUKTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getUKAllTrivia().filter((t) => t.category === category);
}
