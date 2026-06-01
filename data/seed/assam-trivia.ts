/**
 * Assam — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { AS_POLITICAL_LEDGER } from './assam-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const AS_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "AS-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Himanta Biswa Sarma's Strategic Switch",
      "body": "Himanta Biswa Sarma defected from the Indian National Congress (INC) to the BJP in 2015, fundamentally reshaping northeast politics and leading the BJP to power in 2016.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "MLA",
          "name": "Himanta Biswa Sarma"
        },
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia, The Hindu (2015-08-23)",
      "derived": false
    },
    {
      "id": "AS-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Gogoi's Three-Term Streak",
      "body": "Tarun Gogoi served as the Chief Minister of Assam for three consecutive terms from 2001 to 2016, making him the longest-serving Chief Minister of the state.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Tarun Gogoi)",
      "derived": false
    },
    {
      "id": "AS-T-003",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "The Historic Assam Accord Election",
      "body": "Following the 1985 Assam Accord, the Asom Gana Parishad (AGP) was formed and swept the elections, making 32-year-old Prafulla Kumar Mahanta India's youngest Chief Minister.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Assam Accord documents, Wikipedia",
      "derived": false
    },
    {
      "id": "AS-T-004",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Gogoi Political Dynasty",
      "body": "Tarun Gogoi's son Gaurav Gogoi was elected as a Member of Parliament, successfully continuing the political legacy of one of Assam's most influential families.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India",
      "derived": false
    },
    {
      "id": "AS-T-005",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Majuli: World's Largest River Island Seat",
      "body": "Majuli, the world's largest river island, is a dedicated assembly constituency in Assam (AC 99) and was won by former Chief Minister Sarbananda Sonowal in 2016.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 99
        }
      ],
      "source": "Guinness World Records, ECI Results",
      "derived": false
    },
    {
      "id": "AS-T-006",
      "emoji": "\ud83d\udcca",
      "headline": "NRC and the Citizenship Debate",
      "body": "Assam is the only state in India that has undergone an update of the National Register of Citizens (NRC), making immigration and citizenship the central pillar of its state politics.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India NRC rulings, Wikipedia",
      "derived": false
    },
    {
      "id": "AS-T-007",
      "emoji": "\u270a",
      "headline": "Bodoland Territorial Council Impact",
      "body": "The Bodoland People's Front (BPF) and United People's Party Liberal (UPPL) wield decisive power in the Bodo-dominated constituencies of lower Assam, impacting state coalition math.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "BTC Accord, ECI Results",
      "derived": false
    },
    {
      "id": "AS-T-008",
      "emoji": "\ud83d\udd6f\ufe0f",
      "headline": "First Chief Minister of Assam",
      "body": "Gopinath Bordoloi was the first Chief Minister of undivided Assam and a key freedom fighter, who was posthumously awarded the Bharat Ratna in 1999.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Gopinath Bordoloi)",
      "derived": false
    },
    {
      "id": "AS-T-009",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Delimitation in 2023",
      "body": "Assam underwent a comprehensive delimitation of assembly and parliamentary seats in 2023 by the ECI, keeping the total seats at 126 while shifting boundary maps.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Election Commission of India Notification 2023",
      "derived": false
    },
    {
      "id": "AS-T-010",
      "emoji": "\ud83d\udcc8",
      "headline": "BJP's 2021 Re-election Landmark",
      "body": "In 2021, the BJP-led NDA alliance broke the non-Congress anti-incumbency jinx in Assam, successfully defending their majority and retaining power with 75 seats.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2021",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = AS_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'AS-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Assam, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = AS_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'AS-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Assam has seen ${byElections.length} by-elections in recent terms.`,
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
export function getASAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...AS_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getASTriviaForConstituency(acNo: number): TriviaItem[] {
  return getASAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getASTriviaForParty(party: string): TriviaItem[] {
  return getASAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getASTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getASAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getASTriviaForElection(year: number): TriviaItem[] {
  return getASAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getASRandomTrivia(): TriviaItem {
  const all = getASAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getASRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getASAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getASTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getASAllTrivia().filter((t) => t.category === category);
}
