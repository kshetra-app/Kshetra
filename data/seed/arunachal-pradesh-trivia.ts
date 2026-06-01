/**
 * Arunachal Pradesh — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { AR_POLITICAL_LEDGER } from './arunachal-pradesh-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const AR_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "AR-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Mass Defection Record-Breaker",
      "body": "In 2016, Chief Minister Pema Khandu led 43 out of 44 People's Party of Arunachal (PPA) MLAs to defect and merge with the BJP, creating a record of near-total ruling party migration.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu, Wikipedia (2016 Arunachal Pradesh political crisis)",
      "derived": false
    },
    {
      "id": "AR-T-002",
      "emoji": "\ud83d\udc51",
      "headline": "Pema Khandu's Uncontested Victory",
      "body": "In both 2014 and 2024 assembly elections, Chief Minister Pema Khandu won his Mukto assembly constituency uncontested, showcasing total local dominance.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 3
        }
      ],
      "source": "Election Commission of India (ECI)",
      "derived": false
    },
    {
      "id": "AR-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Highest Electoral Field in India",
      "body": "Malogan, a tiny village in Arunachal Pradesh, had a polling station set up specifically for a single voter, Sokela Tayang, in the 2019 and 2024 general elections.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Press Trust of India (PTI)",
      "derived": false
    },
    {
      "id": "AR-T-004",
      "emoji": "\u23f3",
      "headline": "The Short-Lived Chief Minister",
      "body": "Kalikho Pul served as the Chief Minister of Arunachal Pradesh for just 146 days in 2016 following a dramatic constitutional crisis and political defection.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, Wikipedia",
      "derived": false
    },
    {
      "id": "AR-T-005",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "Uncontested Seats Surge in 2024",
      "body": "In the 2024 Arunachal Pradesh Assembly election, the BJP won 10 out of 60 seats uncontested before a single vote was cast, including the Mukto and Sagalee seats.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express, ECI Results 2024",
      "derived": false
    },
    {
      "id": "AR-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "Anti-Defection Loophole Exploitation",
      "body": "Arunachal Pradesh is one of the few states where entire assemblies have seen ruling coalitions swap overnight without calling new elections, exploiting the 2/3 merger clause.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Constitution of India, Tenth Schedule",
      "derived": false
    },
    {
      "id": "AR-T-007",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Apang Dynasty of Arunachal",
      "body": "Gegong Apang was the Chief Minister of Arunachal Pradesh for over 22 years across multiple terms. His son Omak Apang also entered politics and served as a Union Minister.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Gegong Apang)",
      "derived": false
    },
    {
      "id": "AR-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "Rapid BJP Rise from Zero",
      "body": "Arunachal Pradesh saw the BJP go from 0 seats in the 2009 assembly elections to forming a full majority government by 2016 through mergers and subsequent victories.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "NDTV, ECI Historical Data",
      "derived": false
    },
    {
      "id": "AR-T-009",
      "emoji": "\ud83c\udf32",
      "headline": "The Borderland Shield",
      "body": "Arunachal Pradesh's assembly consists of 60 seats spread across remote mountainous terrains, where polling teams often trek for days through dense forests to deliver EVMs.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Election Commission of India (ECI) Diary",
      "derived": false
    },
    {
      "id": "AR-T-010",
      "emoji": "\ud83c\udfad",
      "headline": "NPP's Coalition Balance",
      "body": "The National People's Party (NPP) led by Conrad Sangma acts as a key coalition partner in Arunachal, winning 5 seats in 2024 to support the Khandu administration.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times, ECI Results 2024",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = AR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'AR-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Arunachal Pradesh, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = AR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'AR-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Arunachal Pradesh has seen ${byElections.length} by-elections in recent terms.`,
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
export function getARAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...AR_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getARTriviaForConstituency(acNo: number): TriviaItem[] {
  return getARAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getARTriviaForParty(party: string): TriviaItem[] {
  return getARAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getARTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getARAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getARTriviaForElection(year: number): TriviaItem[] {
  return getARAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getARRandomTrivia(): TriviaItem {
  const all = getARAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getARRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getARAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getARTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getARAllTrivia().filter((t) => t.category === category);
}
