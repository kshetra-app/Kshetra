/**
 * Rajasthan — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { RJ_POLITICAL_LEDGER } from './rajasthan-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const RJ_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "RJ-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Sachin Pilot's 2020 Rebellion",
      "body": "In July 2020, Deputy CM Sachin Pilot led a rebellion of 19 Congress MLAs, camping in Gurgaon and bringing Ashok Gehlot's government to the brink of collapse before a truce was reached.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2020 Rajasthan political crisis)",
      "derived": false
    },
    {
      "id": "RJ-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "The \"Revolving Door\" Tradition",
      "body": "Since 1993, Rajasthan has never re-elected an incumbent government, consistently rotating power between the BJP and the Congress every single election cycle.",
      "category": "COINCIDENCE",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Historical Data, Wikipedia",
      "derived": false
    },
    {
      "id": "RJ-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "Vasundhara Raje's Royal Stature",
      "body": "Two-time Chief Minister Vasundhara Raje belongs to the royal Scindia family of Gwalior and married into the royal Dholpur family, blending royalty and democratic clout in Jhalrapatan.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Vasundhara Raje)",
      "derived": false
    },
    {
      "id": "RJ-T-004",
      "emoji": "\u23f3",
      "headline": "Ashok Gehlot's \"Jadugar\" Reputation",
      "body": "Three-time CM Ashok Gehlot is the son of a professional magician, earning him the nickname \"Jadugar\" (magician) for his cunning political maneuvers and survival instincts.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India profile",
      "derived": false
    },
    {
      "id": "RJ-T-005",
      "emoji": "\u2696\ufe0f",
      "headline": "The Assembly Whip Legal Battle",
      "body": "The 2020 Pilot rebellion led to high-stakes legal battles in the Rajasthan High Court regarding whether a party whip can be applied when the assembly is not in session.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Rajasthan High Court records, LiveLaw",
      "derived": false
    },
    {
      "id": "RJ-T-006",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "BJP's 2023 Comeback Sweep",
      "body": "In the 2023 assembly elections, the BJP successfully continued the alternation pattern by winning 115 out of 199 seats, unseating Ashok Gehlot's government.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2023",
      "derived": false
    },
    {
      "id": "RJ-T-007",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Jhalrapatan: Raje's Citadel",
      "body": "Jhalrapatan assembly constituency (AC 198) in Jhalawar district is Vasundhara Raje's personal bastion, which she has won in consecutive assembly elections since 2003.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 198
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "RJ-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "Bhajan Lal Sharma: The Dark Horse CM",
      "body": "Following their 2023 victory, the BJP appointed first-time MLA Bhajan Lal Sharma as Chief Minister, bypassing several senior leaders and showcasing a major generation shift.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express (2023-12-12)",
      "derived": false
    },
    {
      "id": "RJ-T-009",
      "emoji": "\u270a",
      "headline": "First Chief Minister Heera Lal Shastri",
      "body": "Pandit Heera Lal Shastri was the first Chief Minister of Rajasthan in 1949, who played a leading role in the integration of the princely states of Rajputana.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Heera Lal Shastri)",
      "derived": false
    },
    {
      "id": "RJ-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "The Gurjar-Meena Political Axis",
      "body": "Eastern Rajasthan's politics is dominated by the Gurjar-Meena rivalry, where voting blocks in districts like Dausa and Karauli determine the regional seat swing.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Rajasthan Caste Dynamics Study, Indian Express",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = RJ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'RJ-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Rajasthan, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = RJ_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'RJ-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Rajasthan has seen ${byElections.length} by-elections in recent terms.`,
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
export function getRJAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...RJ_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getRJTriviaForConstituency(acNo: number): TriviaItem[] {
  return getRJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getRJTriviaForParty(party: string): TriviaItem[] {
  return getRJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getRJTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getRJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getRJTriviaForElection(year: number): TriviaItem[] {
  return getRJAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getRJRandomTrivia(): TriviaItem {
  const all = getRJAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getRJRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getRJAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getRJTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getRJAllTrivia().filter((t) => t.category === category);
}
