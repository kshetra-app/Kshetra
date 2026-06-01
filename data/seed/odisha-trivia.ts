/**
 * Odisha — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { OD_POLITICAL_LEDGER } from './odisha-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const OD_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "OD-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Naveen Patnaik's 24-Year Era Ends",
      "body": "In June 2024, Naveen Patnaik's historic 24-year rule came to an end as the BJP won a full majority of 78 out of 147 seats in the Odisha assembly elections, defeating the BJD.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2024-06-05)",
      "derived": false
    },
    {
      "id": "OD-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Patnaik's Near-Record CM Tenure",
      "body": "Naveen Patnaik served as Chief Minister of Odisha for 24 years and 99 days (2000-2024), making him the second longest-serving Chief Minister in Indian history after Pawan Kumar Chamling.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Naveen Patnaik)",
      "derived": false
    },
    {
      "id": "OD-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "The Biju Patnaik Legacy",
      "body": "The Biju Janata Dal (BJD) was founded in 1997 and named after legendary leader Biju Patnaik, an aviator and freedom fighter who served as Odisha's Chief Minister twice.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Biju Patnaik)",
      "derived": false
    },
    {
      "id": "OD-T-004",
      "emoji": "\u23f3",
      "headline": "Mohan Majhi: The First BJP CM",
      "body": "Following their 2024 landslide victory, tribal leader Mohan Charan Majhi was appointed as Odisha's first-ever BJP Chief Minister, representing Keonjhar constituency.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2024-06-11)",
      "derived": false
    },
    {
      "id": "OD-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "BJD's Zero-Defection Record",
      "body": "Under Naveen Patnaik, the Biju Janata Dal maintained an extremely disciplined party structure with virtually zero major floor-defections during its 24 years in power.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Odisha Legislative Assembly Secretariat records",
      "derived": false
    },
    {
      "id": "OD-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "2019 Double Mandate Sweep",
      "body": "In 2019, Odisha voted simultaneously for Lok Sabha and Assembly. While BJP made massive inroads in the LS seats, BJD comfortably swept the Assembly with 112 out of 146 seats.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2019",
      "derived": false
    },
    {
      "id": "OD-T-007",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Hinjili: The Patnaik Fortress",
      "body": "Hinjili assembly constituency (AC 131) in Ganjam district was Naveen Patnaik's personal seat since 2000, winning it in five consecutive assembly elections.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 131
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "OD-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "VK Pandian's Swift Succession Debate",
      "body": "IAS officer turned politician V. K. Pandian, Naveen Patnaik's close confidant, became the central figure of the 2024 election campaign, driving debates on the \"Odia Asmita\" (pride).",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times, Indian Express",
      "derived": false
    },
    {
      "id": "OD-T-009",
      "emoji": "\u270a",
      "headline": "First Chief Minister Harekrushna Mahatab",
      "body": "Dr. Harekrushna Mahatab, known as \"Utkal Keshari\", was the first Chief Minister of Odisha post-independence, leading the merger of princely states into Odisha.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Harekrushna Mahatab)",
      "derived": false
    },
    {
      "id": "OD-T-010",
      "emoji": "\u26f0\ufe0f",
      "headline": "Coastal vs Western Divide",
      "body": "Odisha's electoral map shows a sharp division: the coastal belt has been the traditional stronghold of the BJD, while the western districts bordering Chhattisgarh are BJP bastions.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Odisha election analysis, ECI maps",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = OD_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'OD-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Odisha, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = OD_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'OD-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Odisha has seen ${byElections.length} by-elections in recent terms.`,
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
export function getODAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...OD_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getODTriviaForConstituency(acNo: number): TriviaItem[] {
  return getODAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getODTriviaForParty(party: string): TriviaItem[] {
  return getODAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getODTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getODAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getODTriviaForElection(year: number): TriviaItem[] {
  return getODAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getODRandomTrivia(): TriviaItem {
  const all = getODAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getODRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getODAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getODTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getODAllTrivia().filter((t) => t.category === category);
}
