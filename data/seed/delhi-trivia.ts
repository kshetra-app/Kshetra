/**
 * Delhi — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { DL_POLITICAL_LEDGER } from './delhi-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const DL_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "DL-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Kejriwal's 49-Day Resignation",
      "body": "In 2014, Arvind Kejriwal resigned as Chief Minister after just 49 days in office when his proposed Jan Lokpal Bill was blocked in the Assembly by Congress and BJP.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "NDTV, Wikipedia (2013 Delhi Legislative Assembly election)",
      "derived": false
    },
    {
      "id": "DL-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "AAP's 67/70 Landslide Sweep",
      "body": "In 2015, the Aam Aadmi Party (AAP) achieved a historic landslide by winning 67 out of 70 seats in Delhi, leaving the BJP with just 3 seats and Congress with zero.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2015",
      "derived": false
    },
    {
      "id": "DL-T-003",
      "emoji": "\ud83d\udc69",
      "headline": "Sheila Dikshit's 15-Year Record",
      "body": "Sheila Dikshit (INC) served as Chief Minister of Delhi for 15 consecutive years from 1998 to 2013, overseeing major infrastructure upgrades like the Metro and flyovers.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Sheila Dikshit)",
      "derived": false
    },
    {
      "id": "DL-T-004",
      "emoji": "\u2696\ufe0f",
      "headline": "The Delhi LG vs CM Standoff",
      "body": "Delhi's unique status as a Union Territory has led to landmark Supreme Court battles regarding the division of powers between the elected Chief Minister and the Lieutenant Governor.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court of India (Government of NCT of Delhi v. Union of India)",
      "derived": false
    },
    {
      "id": "DL-T-005",
      "emoji": "\ud83c\udfad",
      "headline": "Madan Lal Khurana: The \"Delhi Ka Sher\"",
      "body": "Madan Lal Khurana led the BJP to victory in 1993, becoming the first CM after the Legislative Assembly was restored under the 69th Constitutional Amendment.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Delhi Assembly Archives, Wikipedia",
      "derived": false
    },
    {
      "id": "DL-T-006",
      "emoji": "\ud83d\udcca",
      "headline": "AAP's Second Sweep in 2020",
      "body": "In the 2020 assembly elections, AAP proved its dominance was not a fluke by winning 62 out of 70 seats, banking on its health, education, and free electricity schemes.",
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
      "id": "DL-T-007",
      "emoji": "\ud83c\udfd9\ufe0f",
      "headline": "New Delhi: The VVIP Constituency",
      "body": "The New Delhi constituency (AC 40) is one of the most high-profile seats in India, represented by Sheila Dikshit and later won by Arvind Kejriwal in three successive terms.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 40
        }
      ],
      "source": "ECI Results",
      "derived": false
    },
    {
      "id": "DL-T-008",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "Congress Zero Streak",
      "body": "In both the 2015 and 2020 Delhi Assembly elections, the Indian National Congress failed to win a single seat, an unprecedented decline for a party that ruled for 15 years.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2015 & 2020",
      "derived": false
    },
    {
      "id": "DL-T-009",
      "emoji": "\u270a",
      "headline": "The India Against Corruption Birth",
      "body": "The Aam Aadmi Party arose directly from the massive 2011 anti-corruption movement led by Anna Hazare and Arvind Kejriwal at Ramlila Maidan.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (2011 Indian anti-corruption movement)",
      "derived": false
    },
    {
      "id": "DL-T-010",
      "emoji": "\ud83d\udc69\u200d\ud83d\udcbc",
      "headline": "Delhi's First Woman CM",
      "body": "BJP leader Sushma Swaraj served as the first female Chief Minister of Delhi in 1998 for a brief period of 52 days, before Sheila Dikshit took office.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Sushma Swaraj)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = DL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'DL-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Delhi, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = DL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'DL-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Delhi has seen ${byElections.length} by-elections in recent terms.`,
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
export function getDLAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...DL_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getDLTriviaForConstituency(acNo: number): TriviaItem[] {
  return getDLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getDLTriviaForParty(party: string): TriviaItem[] {
  return getDLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getDLTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getDLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getDLTriviaForElection(year: number): TriviaItem[] {
  return getDLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getDLRandomTrivia(): TriviaItem {
  const all = getDLAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getDLRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getDLAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getDLTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getDLAllTrivia().filter((t) => t.category === category);
}
