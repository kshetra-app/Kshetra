/**
 * Puducherry — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { PY_POLITICAL_LEDGER } from './puducherry-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const PY_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "PY-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "The 2021 Floor Test Collapse",
      "body": "Just before the 2021 assembly elections, the Congress-led coalition government under V. Narayanasamy collapsed after a series of MLA defections and resignations reduced them to a minority.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India, Wikipedia (2021 Puducherry Legislative Assembly election)",
      "derived": false
    },
    {
      "id": "PY-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "N. Rangasamy's 4 CM Terms",
      "body": "All India N.R. Congress (AINRC) chief N. Rangasamy has served as Chief Minister of Puducherry across four terms, known for his simple lifestyle and populism.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (N. Rangasamy)",
      "derived": false
    },
    {
      "id": "PY-T-003",
      "emoji": "\ud83c\udfdd\ufe0f",
      "headline": "The Four Enclave Territory",
      "body": "Puducherry's 30 assembly seats are spread across four geographically disconnected enclaves: Puducherry and Karaikal (Tamil Nadu border), Mahe (Kerala border), and Yanam (Andhra Pradesh border).",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Puducherry Government Gazette, Wikipedia",
      "derived": false
    },
    {
      "id": "PY-T-004",
      "emoji": "\u23f3",
      "headline": "The Kiran Bedi Standoff",
      "body": "Puducherry was the site of a prolonged, high-profile power struggle between Lt. Governor Kiran Bedi and CM V. Narayanasamy regarding executive powers, leading to street protests.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (Kiran Bedi Puducherry tenure)",
      "derived": false
    },
    {
      "id": "PY-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Nominated MLAs Wielding Votes",
      "body": "In a major legal precedent, the Supreme Court ruled that 3 MLAs nominated to the Puducherry assembly by the central government have the right to vote in budget and confidence motions.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India (K. Lakshminarayanan v. Union of India)",
      "derived": false
    },
    {
      "id": "PY-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "First AINRC-BJP Coalition 2021",
      "body": "In 2021, N. Rangasamy's AINRC formed a pre-poll alliance with the BJP, sweeping the elections and forming the first-ever NDA coalition government in the Union Territory.",
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
      "id": "PY-T-007",
      "emoji": "\ud83c\udfad",
      "headline": "The DMK-AIADMK Tug in PY",
      "body": "Puducherry's electoral politics is heavily influenced by the major Dravidian parties of neighboring Tamil Nadu, with DMK and AIADMK acting as key coalition weights.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Puducherry political history analysis",
      "derived": false
    },
    {
      "id": "PY-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "Yanam: The Multi-State Enclave Seat",
      "body": "Yanam assembly constituency (AC 30) is located inside East Godavari district of Andhra Pradesh, where Telugu is the primary language spoken by the electorate.",
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
      "id": "PY-T-009",
      "emoji": "\u270a",
      "headline": "The French Treaty of Cession 1956",
      "body": "Puducherry's unique legislative history began with the Treaty of Cession signed between India and France in 1956, transferring de facto control of the French establishments.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Treaty of Cession 1956, Wikipedia",
      "derived": false
    },
    {
      "id": "PY-T-010",
      "emoji": "\ud83d\udc69",
      "headline": "First Female Minister in 4 Decades",
      "body": "In 2021, Chandira Priyanga became the first woman minister in Puducherry in 41 years, taking charge of transport and art & culture in the Rangasamy cabinet.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2021-06-27)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = PY_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'PY-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Puducherry, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = PY_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'PY-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Puducherry has seen ${byElections.length} by-elections in recent terms.`,
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
export function getPYAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...PY_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getPYTriviaForConstituency(acNo: number): TriviaItem[] {
  return getPYAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getPYTriviaForParty(party: string): TriviaItem[] {
  return getPYAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getPYTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getPYAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getPYTriviaForElection(year: number): TriviaItem[] {
  return getPYAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getPYRandomTrivia(): TriviaItem {
  const all = getPYAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getPYRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getPYAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getPYTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getPYAllTrivia().filter((t) => t.category === category);
}
