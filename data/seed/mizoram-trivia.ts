/**
 * Mizoram — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { MZ_POLITICAL_LEDGER } from './mizoram-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const MZ_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "MZ-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "ZPM Landslide Breaks 4-Decade Duopoly",
      "body": "In 2023, the Zoram People's Movement (ZPM) won a historic landslide by bagging 27 out of 40 seats, ending a 40-year duopoly between the Congress and Mizo National Front (MNF).",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2023-12-04)",
      "derived": false
    },
    {
      "id": "MZ-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Lalduhoma: IPS to Chief Minister",
      "body": "Chief Minister Lalduhoma is a former IPS officer who was in charge of Indira Gandhi's security. He holds the record of being the first MP disqualified under the anti-defection law in 1988.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Lalduhoma)",
      "derived": false
    },
    {
      "id": "MZ-T-003",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Smallest Legislative Margins",
      "body": "With an assembly of just 40 seats and low population density, Mizoram constituencies are small, with several seats decided by margins of under 100 votes.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Mizoram Election Data",
      "derived": false
    },
    {
      "id": "MZ-T-004",
      "emoji": "\u23f3",
      "headline": "Lalthanhawla's 5-Term Record",
      "body": "Congress veteran Lal Thanhawla served as Chief Minister of Mizoram five times between 1984 and 2018, representing the Serchhip constituency.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Lal Thanhawla)",
      "derived": false
    },
    {
      "id": "MZ-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Historic Mizo Accord 1986",
      "body": "The signing of the Mizo Peace Accord in 1986 ended decades of insurgency. MNF leader Laldenga became Chief Minister, and Mizoram became a full Indian state in 1987.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Mizo Peace Accord documents, Wikipedia",
      "derived": false
    },
    {
      "id": "MZ-T-006",
      "emoji": "\u270a",
      "headline": "CYMA: The Non-Political Watchdog",
      "body": "The Central Young Mizo Association (CYMA) is a massive non-political body that acts as a moral watchdog, heavily influencing electoral ethics and voter behavior in Mizoram.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "CYMA constitution, Mainstream media studies",
      "derived": false
    },
    {
      "id": "MZ-T-007",
      "emoji": "\ud83d\udcca",
      "headline": "MNF's Insurgency-to-Power Path",
      "body": "The Mizo National Front (MNF) transitioned from a banned insurgent group in the 1960s to a recognized regional political party that ruled the state for multiple terms under Zoramthanga.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Mizo National Front)",
      "derived": false
    },
    {
      "id": "MZ-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "The ZPM Non-Party Model",
      "body": "The Zoram People's Movement (ZPM) originally started as an alliance of several minor parties and civic groups, before officially registering as a unified political party.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Scroll.in political analysis",
      "derived": false
    },
    {
      "id": "MZ-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Serchhip: The Giant-Killer Seat",
      "body": "Serchhip assembly constituency (AC 26) is a famous seat where Lalduhoma defeated incumbent Chief Minister Lal Thanhawla in the 2018 assembly elections.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 26
        }
      ],
      "source": "ECI Results 2018",
      "derived": false
    },
    {
      "id": "MZ-T-010",
      "emoji": "\ud83d\udc69",
      "headline": "First Woman Minister in 3 Decades",
      "body": "In 2023, ZPM's Lalrinpuii became only the third woman to become a minister in Mizoram's history, and the first in over three decades, taking charge of health and family welfare.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2023-12-08)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = MZ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'MZ-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Mizoram, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = MZ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'MZ-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Mizoram has seen ${byElections.length} by-elections in recent terms.`,
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
export function getMZAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...MZ_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getMZTriviaForConstituency(acNo: number): TriviaItem[] {
  return getMZAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getMZTriviaForParty(party: string): TriviaItem[] {
  return getMZAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getMZTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getMZAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getMZTriviaForElection(year: number): TriviaItem[] {
  return getMZAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getMZRandomTrivia(): TriviaItem {
  const all = getMZAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getMZRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getMZAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getMZTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getMZAllTrivia().filter((t) => t.category === category);
}
